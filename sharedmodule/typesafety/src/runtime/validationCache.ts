/**
 * 验证缓存和性能优化系统
 * 提供智能缓存、批处理验证、和性能监控功能
 */

import { z, ZodSchema } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * 缓存配置
 */
export interface CacheConfig {
  /**
   * 最大缓存条目数
   */
  maxSize: number;

  /**
   * 缓存超时时间（毫秒）
   */
  ttl: number;

  /**
   * 清理间隔（毫秒）
   */
  cleanupInterval?: number;

  /**
   * 缓存策略: 'LRU' | 'LFU' | 'FIFO'
   */
  evictionPolicy?: 'LRU' | 'LFU' | 'FIFO';

  /**
   * 是否启用压缩
   */
  enableCompression?: boolean;

  /**
   * 是否持久化到磁盘
   */
  persistToDisk?: boolean;

  /**
   * 磁盘持久化路径
   */
  persistencePath?: string;
}

/**
 * 缓存条目
 */
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  hits: number;
  misses: number;
  size: number;
  tags?: string[];
}

/**
 * 缓存统计
 */
export interface CacheStatistics {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  averageAccessTime: number;
  oldestEntry: number;
  newestEntry: number;
  tags: Map<string, number>;
}

/**
 * 批处理配置
 */
export interface BatchConfig {
  /**
   * 最大批处理大小
   */
  maxSize: number;

  /**
   * 批处理超时时间（毫秒）
   */
  timeout: number;

  /**
   * 并发级别
   */
  concurrency: number;

  /**
   * 是否启用去重
   */
  enableDeduplication?: boolean;

  /**
   * 是否启用水印限流
   */
  enableWatermark?: boolean;

  /**
   * 水印阈值（0-1）
   */
  watermarkThreshold?: number;
}

/**
 * 批处理请求
 */
interface BatchRequest<T = any> {
  id: string;
  key: string;
  schema: ZodSchema;
  value: T;
  resolve: (result: BatchResult<T>) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority?: number;
}

/**
 * 批处理结果
 */
interface BatchResult<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: Error;
  validationTime: number;
  cached: boolean;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  memoryDelta: number;
  cacheHit: boolean;
  validationCount: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * 验证缓存管理器
 */
export class ValidationCache {
  private cache: Map<string, CacheEntry> = new Map();
  private stats: Map<string, number> = new Map();
  private tags: Map<string, Set<string>> = new Map();
  private metrics: PerformanceMetrics[] = [];
  private batchQueue: Map<string, BatchRequest[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private config: CacheConfig = {
      maxSize: 10000,
      ttl: 300000, // 5 minutes
      evictionPolicy: 'LRU',
      cleanupInterval: 60000, // 1 minute
      enableCompression: false
    }
  ) {
    this.setupPeriodicCleanup();
  }

  /**
   * 创建缓存键
   */
  createCacheKey(value: unknown, schema: ZodSchema, tags?: string[]): string {
    try {
      const valueStr = this.serializeValue(value);
      const schemaStr = JSON.stringify(schema._def || {});
      const baseKey = this.hash(`${valueStr}:${schemaStr}`);

      // 如果有标签，也包含在键中（用于快速查找）
      if (tags && tags.length > 0) {
        const tagStr = tags.sort().join(':');
        return `v:${baseKey}:t:${this.hash(tagStr)}`;
      }

      return `v:${baseKey}`;
    } catch (error) {
      // 如果序列化失败，创建基于类型的键
      const typeKey = this.getValueDigest(value);
      return `fallback:${typeKey}:${Date.now()}`;
    }
  }

  /**
   * 获取缓存条目
   */
  get<T>(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.incrementStat('misses');
      return undefined;
    }

    // 检查过期
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.remove(key);
      this.incrementStat('expired');
      return undefined;
    }

    // 更新访问统计
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    entry.hits++;

    this.incrementStat('hits');
    return entry as CacheEntry<T>;
  }

  /**
   * 设置缓存条目
   */
  set<T>(key: string, value: T, tags?: string[], metadata?: Record<string, any>): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      hits: 0,
      misses: 0,
      size: this.estimateSize(value),
      tags
    };

    // 保存到缓存
    this.cache.set(key, entry);

    // 处理标签索引
    if (tags && tags.length > 0) {
      tags.forEach(tag => {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }
        this.tags.get(tag)!.add(key);
      });
    }

    this.incrementStat('sets');
  }

  /**
   * 删除缓存条目
   */
  remove(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // 清理标签索引
    if (entry.tags) {
      entry.tags.forEach(tag => {
        const tagSet = this.tags.get(tag);
        if (tagSet) {
          tagSet.delete(key);
          if (tagSet.size === 0) {
            this.tags.delete(tag);
          }
        }
      });
    }

    this.cache.delete(key);
    this.incrementStat('removals');
    return true;
  }

  /**
   * 按标签删除缓存条目
   */
  invalidateByTag(tag: string): number {
    const keys = this.tags.get(tag);
    if (!keys) return 0;

    let removedCount = 0;
    keys.forEach(key => {
      if (this.remove(key)) {
        removedCount++;
      }
    });

    this.incrementStat('invalidations');
    return removedCount;
  }

  /**
   * 获取缓存统计
   */
  getStatistics(): CacheStatistics {
    let totalAccessTime = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;
    let hits = 0;
    let misses = 0;

    const tagCounts = new Map<string, number>();

    for (const entry of this.cache.values()) {
      totalAccessTime += entry.accessCount;
      oldestEntry = Math.min(oldestEntry, entry.timestamp);
      newestEntry = Math.max(newestEntry, entry.timestamp);
      hits += entry.hits;
      misses += entry.misses;

      if (entry.tags) {
        entry.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    }

    const totalRequests = hits + misses;
    const hitRate = totalRequests > 0 ? hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? misses / totalRequests : 0;
    const averageAccessTime = this.cache.size > 0 ? totalAccessTime / this.cache.size : 0;

    // 更新统计信息
    const statsHits = this.stats.get('hits') || 0;
    const statsMisses = this.stats.get('misses') || 0;
    const statsRequests = statsHits + statsMisses;
    const overallHitRate = statsRequests > 0 ? statsHits / statsRequests : 0;

    return {
      totalEntries: this.cache.size,
      totalSize: this.getTotalSize(),
      hitRate: overallHitRate,
      missRate: 1 - overallHitRate,
      evictionCount: this.stats.get('evictions') || 0,
      averageAccessTime,
      oldestEntry,
      newestEntry,
      tags: tagCounts
    };
  }

  /**
   * 执行批处理验证
   */
  async validateBatch<T>(
    items: Array<{ key: string; value: T; schema: ZodSchema }>,
    config: BatchConfig
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const batchId = uuidv4();

    // 先去缓存中查看
    const cacheHits = new Map<string, boolean>();
    const cacheMisses: Array<{ key: string; value: T; schema: ZodSchema }> = [];

    items.forEach(item => {
      const cacheKey = this.createCacheKey(item.value, item.schema);
      const cached = this.get(item.key);

      if (cached) {
        cacheHits.set(item.key, true);
        results.set(item.key, true);
      } else {
        cacheMisses.push(item);
      }
    });

    // 如果所有都在缓存中，直接返回
    if (cacheMisses.length === 0) {
      this.recordMetrics('batch', cacheHits.size, Date.now(), true);
      return results;
    }

    // 执行批处理验证
    this.recordMetrics('batch', cacheHits.size, Date.now(), false);

    // 按配置分批次处理
    const batches = this.createBatches(cacheMisses, config.maxSize);

    const batchPromises = batches.map(async (batch, batchIndex) => {
      const batchResults = await this.processBatch(batch, config, batchId, batchIndex);

      // 更新结果
      batchResults.forEach(result => {
        results.set(result.id, result.success);

        // 缓存成功的结果
        if (result.success) {
          const originalItem = batch.find(item => item.key === result.id);
          if (originalItem) {
            this.set(result.id, originalItem.value);
          }
        }
      });

      return batchResults;
    });

    await Promise.all(batchPromises);
    return results;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        if (this.remove(key)) {
          removedCount++;
        }
      }
    }

    this.incrementStat('cleanup_runs');
    return removedCount;
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats.clear();
    this.tags.clear();
    this.batchQueue.clear();
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
    this.metrics = [];
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(limit?: number): PerformanceMetrics[] {
    const metrics = this.metrics.slice(-(limit || this.metrics.length));
    return metrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ===== 私有辅助方法 =====

  private serializeValue(value: unknown): string {
    try {
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return `n:${value}`;
      if (typeof value === 'boolean') return `b:${value}`;
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (value instanceof Date) return `d:${value.getTime()}`;
      if (Array.isArray(value)) return `a:${JSON.stringify(value)}`;
      if (typeof value === 'object') return `o:${JSON.stringify(value, this.getCircularReplacer())}`;
      return `unknown:${String(value)}`;
    } catch (error) {
      return `error:${String(error)}`;
    }
  }

  private getCircularReplacer() {
    const seen = new WeakSet();
    return (key: string, value: any): any => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    };
  }

  private getValueDigest(value: unknown): string {
    const type = typeof value;
    const hash = this.hash(`${type}:${String(value)}`);
    return `${type}:${hash.substring(0, 8)}`;
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 100; // 默认值
    }
  }

  private evictLRU(): void {
    let oldestEntry: CacheEntry | undefined;
    let oldestKey: string | undefined;

    for (const [key, entry] of this.cache.entries()) {
      if (!oldestEntry || entry.lastAccessed < oldestEntry.lastAccessed) {
        oldestEntry = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.remove(oldestKey);
      this.incrementStat('evictions');
    }
  }

  private incrementStat(key: string, increment: number = 1): void {
    this.stats.set(key, (this.stats.get(key) || 0) + increment);
  }

  private getTotalSize(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  private createBatches<T>(items: T[], maxSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += maxSize) {
      batches.push(items.slice(i, i + maxSize));
    }
    return batches;
  }

  private async processBatch<T>(
    batch: Array<{ key: string; value: T; schema: ZodSchema }>,
    config: BatchConfig,
    batchId: string,
    batchIndex: number
  ): Promise<BatchResult<T>[]> {
    const results: BatchResult<T>[] = [];
    const startTime = Date.now();

    // 并发处理（在配置的并发限制内）
    const concurrencyLimit = Math.min(config.concurrency, batch.length);

    for (let i = 0; i < batch.length; i += concurrencyLimit) {
      const chunk = batch.slice(i, i + concurrencyLimit);
      const chunkResults = await Promise.allSettled(
        chunk.map(async (item) => {
          const validationStart = Date.now();

          try {
            const result = item.schema.safeParse(item.value);
            const validationTime = Date.now() - validationStart;

            return {
              id: item.key,
              success: result.success,
              data: result.success ? result.data : undefined,
              error: result.success ? undefined : new Error(result.error.message),
              validationTime,
              cached: false
            };
          } catch (error) {
            return {
              id: item.key,
              success: false,
              error: error instanceof Error ? error : new Error(String(error)),
              validationTime: Date.now() - validationStart,
              cached: false
            };
          }
        })
      );

      // 处理结果
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const item = chunk[index];
          results.push({
            id: item.key,
            success: false,
            error: result.reason,
            validationTime: Date.now() - startTime,
            cached: false
          });
        }
      });
    }

    // 记录性能指标
    this.recordMetrics('batch_processing', batch.length, Date.now() - startTime, false);

    return results;
  }

  private recordMetrics(operation: string, itemCount: number, duration: number, cacheHit: boolean): void {
    const memoryDelta = process.memoryUsage().heapUsed;

    this.metrics.push({
      operation,
      duration,
      memoryDelta,
      cacheHit,
      validationCount: itemCount,
      timestamp: Date.now()
    });

    // 防止内存泄漏：限制指标历史记录数量
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000);
    }
  }

  private setupPeriodicCleanup(): void {
    if (this.config.cleanupInterval) {
      setInterval(() => {
        this.cleanup();
      }, this.config.cleanupInterval);
    }
  }

  /**
   * 创建带验证缓存的验证器包装器
   */
  static createCachedValidator<T>(cache: ValidationCache, schema: ZodSchema<T>) {
    return {
      validate: async (value: unknown): Promise<{ success: boolean; data?: T; error?: Error }> => {
        const cacheKey = cache.createCacheKey(value, schema);
        const cached = cache.get<{ success: boolean; data?: T; error?: string }>(cacheKey);

        if (cached) {
          if (cached.value.success) {
            return { success: true, data: cached.value.data };
          } else {
            return { success: false, error: cached.value.error ? new Error(cached.value.error) : undefined };
          }
        }

        // 执行验证
        const result = schema.safeParse(value);

        // 缓存结果
        cache.set(cacheKey, {
          success: result.success,
          data: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error?.message
        });

        if (result.success) {
          return { success: true, data: result.data };
        } else {
          return { success: false, error: new Error(result.error.message) };
        }
      }
    };
  }
}