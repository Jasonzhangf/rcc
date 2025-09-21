/**
 * RCC Pipeline Execution Optimizer
 *
 * 流水线执行优化器，提供并发处理、错误恢复、请求批处理等功能
 */

import {
  PipelineExecutionContext,
  PipelineExecutionStep,
  PipelineExecutionResult,
  VirtualModel
} from '../interfaces/ModularInterfaces';
import { RoutingOptimizer } from './RoutingOptimizer';
import { IOTracker } from './IOTracker';

/**
 * 优化配置
 */
interface OptimizationConfig {
  enableConcurrency: boolean;
  maxConcurrency: number;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  enableCaching: boolean;
  cacheTTL: number;
  enableBatching: boolean;
  batchSize: number;
  batchTimeout: number;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
}

/**
 * 批处理请求
 */
interface BatchRequest {
  id: string;
  requests: Array<{
    request: any;
    virtualModelId: string;
    context?: Partial<PipelineExecutionContext>;
  }>;
  timestamp: number;
  timeout?: NodeJS.Timeout;
}

/**
 * 缓存项
 */
interface CacheItem {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
  hitCount: number;
}

/**
 * 重试策略
 */
interface RetryStrategy {
  maxRetries: number;
  delays: number[];
  conditions: Array<(error: any) => boolean>;
}

/**
 * 流水线执行优化器类
 */
export class PipelineExecutionOptimizer {
  private routingOptimizer: RoutingOptimizer;
  private ioTracker: IOTracker;
  private config: OptimizationConfig;
  private batchQueue: BatchRequest[] = [];
  private cache: Map<string, CacheItem> = new Map();
  private retryStrategies: Map<string, RetryStrategy> = new Map();
  private activeRequests: Map<string, Promise<PipelineExecutionResult>> = new Map();
  private concurrencySemaphore: { value: number; waiting: Array<() => void> } = {
    value: 0,
    waiting: []
  };

  constructor(
    routingOptimizer: RoutingOptimizer,
    ioTracker: IOTracker,
    config?: Partial<OptimizationConfig>
  ) {
    this.routingOptimizer = routingOptimizer;
    this.ioTracker = ioTracker;

    this.config = {
      enableConcurrency: true,
      maxConcurrency: 10,
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableCaching: true,
      cacheTTL: 300000, // 5分钟
      enableBatching: false,
      batchSize: 5,
      batchTimeout: 100,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      ...config
    };

    this.initializeDefaultRetryStrategies();
    this.initializeBatching();
  }

  /**
   * 初始化默认重试策略
   */
  private initializeDefaultRetryStrategies(): void {
    // 网络错误重试策略
    this.retryStrategies.set('network', {
      maxRetries: 3,
      delays: [1000, 2000, 4000],
      conditions: [
        (error) => error.code === 'ECONNRESET',
        (error) => error.code === 'ETIMEDOUT',
        (error) => error.code === 'ENOTFOUND'
      ]
    });

    // 服务器错误重试策略
    this.retryStrategies.set('server', {
      maxRetries: 2,
      delays: [2000, 4000],
      conditions: [
        (error) => error.status >= 500 && error.status < 600,
        (error) => error.message.includes('timeout')
      ]
    });

    // 速率限制重试策略
    this.retryStrategies.set('rate-limit', {
      maxRetries: 3,
      delays: [5000, 10000, 20000],
      conditions: [
        (error) => error.status === 429,
        (error) => error.message.includes('rate limit')
      ]
    });
  }

  /**
   * 初始化批处理
   */
  private initializeBatching(): void {
    if (this.config.enableBatching) {
      setInterval(() => {
        this.processBatchQueue();
      }, this.config.batchTimeout);
    }
  }

  /**
   * 优化执行请求
   */
  async executeOptimized(
    request: any,
    virtualModelId: string,
    executeFn: (request: any, virtualModelId: string, context?: Partial<PipelineExecutionContext>) => Promise<PipelineExecutionResult>,
    context?: Partial<PipelineExecutionContext>
  ): Promise<PipelineExecutionResult> {
    const requestId = context?.requestId || this.generateRequestId();
    const sessionId = context?.sessionId || this.generateSessionId();

    try {
      // 检查缓存
      if (this.config.enableCaching) {
        const cachedResult = this.getFromCache(request, virtualModelId);
        if (cachedResult) {
          return cachedResult;
        }
      }

      // 获取路由决策
      const virtualModel = this.getVirtualModel(virtualModelId);
      const routingDecision = await this.routingOptimizer.getRoutingDecision(virtualModel, context);

      // 创建优化上下文
      const optimizedContext: Partial<PipelineExecutionContext> = {
        ...context,
        sessionId,
        requestId,
        ioRecords: [],
        routingDecision
      };

      // 开始跟踪
      this.ioTracker.startSession(sessionId, requestId);

      // 并发控制
      if (this.config.enableConcurrency) {
        await this.acquireConcurrencySlot();
      }

      // 执行请求（带重试）
      const result = await this.executeWithRetry(
        request,
        virtualModelId,
        executeFn,
        optimizedContext,
        routingDecision
      );

      // 记录路由结果
      this.routingOptimizer.recordRequestResult(
        routingDecision.providerId,
        result.success,
        result.executionTime
      );

      // 缓存结果
      if (this.config.enableCaching && result.success) {
        this.addToCache(request, virtualModelId, result);
      }

      // 结束跟踪
      this.ioTracker.endSession(sessionId);

      return result;
    } catch (error) {
      // 记录错误
      this.ioTracker.recordIO({
        sessionId,
        requestId,
        moduleId: 'optimizer',
        step: 'execution_error',
        data: { error: error instanceof Error ? error.message : String(error) },
        size: 0,
        processingTime: 0,
        type: 'error'
      });

      throw error;
    } finally {
      // 释放并发槽位
      if (this.config.enableConcurrency) {
        this.releaseConcurrencySlot();
      }
    }
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry(
    request: any,
    virtualModelId: string,
    executeFn: (request: any, virtualModelId: string, context?: Partial<PipelineExecutionContext>) => Promise<PipelineExecutionResult>,
    context: Partial<PipelineExecutionContext>,
    routingDecision: any
  ): Promise<PipelineExecutionResult> {
    let lastError: any = null;
    const maxRetries = this.config.enableRetry ? this.config.maxRetries : 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        const result = await this.ioTracker.trackStepExecution(
          context.sessionId!,
          context.requestId!,
          'optimizer',
          `execution_attempt_${attempt}`,
          async () => executeFn(request, virtualModelId, context)
        );

        // 如果成功，返回结果
        if (result.success) {
          return result;
        }

        // 如果失败且有重试机会，抛出错误进行重试
        lastError = result.error;
        throw lastError;

      } catch (error) {
        lastError = error;

        // 检查是否需要重试
        if (attempt < maxRetries && this.shouldRetry(error)) {
          const delay = this.getRetryDelay(attempt, error);
          await this.sleep(delay);

          // 更新路由决策（可能切换提供商）
          try {
            const virtualModel = this.getVirtualModel(virtualModelId);
            const newRoutingDecision = await this.routingOptimizer.getRoutingDecision(virtualModel, context);
            if (newRoutingDecision.providerId !== routingDecision.providerId) {
              context.providerId = newRoutingDecision.providerId;
              routingDecision = newRoutingDecision;
            }
          } catch (routingError) {
            // 路由决策失败，继续使用原决策
            console.warn('Failed to update routing decision:', routingError);
          }

          continue;
        }

        // 重试次数用完，抛出最后一个错误
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any): boolean {
    if (!this.config.enableRetry) {
      return false;
    }

    // 检查所有重试策略
    for (const [name, strategy] of this.retryStrategies) {
      for (const condition of strategy.conditions) {
        if (condition(error)) {
          return true;
        }
      }
    }

    // 默认重试网络错误
    return error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.message.includes('timeout');
  }

  /**
   * 获取重试延迟
   */
  private getRetryDelay(attempt: number, error: any): number {
    // 根据错误类型选择策略
    for (const [name, strategy] of this.retryStrategies) {
      for (const condition of strategy.conditions) {
        if (condition(error)) {
          return strategy.delays[Math.min(attempt, strategy.delays.length - 1)];
        }
      }
    }

    // 默认指数退避
    return this.config.retryDelay * Math.pow(2, attempt);
  }

  /**
   * 添加到批处理队列
   */
  addToBatch(
    request: any,
    virtualModelId: string,
    context?: Partial<PipelineExecutionContext>
  ): Promise<PipelineExecutionResult> {
    return new Promise((resolve, reject) => {
      const batchId = this.generateBatchId();
      const batchRequest: BatchRequest = {
        id: batchId,
        requests: [{ request, virtualModelId, context }],
        timestamp: Date.now()
      };

      // 设置批处理超时
      batchRequest.timeout = setTimeout(() => {
        this.processBatch(batchId);
      }, this.config.batchTimeout);

      this.batchQueue.push(batchRequest);

      // 为这个请求创建一个占位符Promise
      this.activeRequests.set(batchId, new Promise((batchResolve, batchReject) => {
        // 这个Promise将在批处理完成时被解析
      }));
    });
  }

  /**
   * 处理批处理队列
   */
  private async processBatchQueue(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return;
    }

    // 合并可以批处理的请求
    const batches: BatchRequest[] = [];
    let currentBatch: BatchRequest | null = null;

    for (const batchRequest of this.batchQueue) {
      if (!currentBatch || currentBatch.requests.length >= this.config.batchSize) {
        currentBatch = {
          id: this.generateBatchId(),
          requests: [],
          timestamp: Date.now()
        };
        batches.push(currentBatch);
      }

      currentBatch.requests.push(...batchRequest.requests);

      // 清除原有超时
      if (batchRequest.timeout) {
        clearTimeout(batchRequest.timeout);
      }
    }

    this.batchQueue = [];

    // 处理每个批处理
    for (const batch of batches) {
      this.processBatch(batch.id);
    }
  }

  /**
   * 处理单个批处理
   */
  private async processBatch(batchId: string): Promise<void> {
    const batch = this.batchQueue.find(b => b.id === batchId);
    if (!batch) {
      return;
    }

    // 从队列中移除
    this.batchQueue = this.batchQueue.filter(b => b.id !== batchId);

    try {
      // 批处理执行逻辑
      const results = await Promise.all(
        batch.requests.map(async ({ request, virtualModelId, context }) => {
          // 这里应该调用实际的执行函数
          // 暂时返回模拟结果
          return {
            success: true,
            response: { batchResult: true },
            executionTime: 100,
            steps: [],
            context: context || {}
          };
        })
      );

      // 解析所有请求的Promise
      const requestPromise = this.activeRequests.get(batchId);
      if (requestPromise) {
        // 这里应该解析所有相关的Promise
        this.activeRequests.delete(batchId);
      }

    } catch (error) {
      // 批处理失败，拒绝所有请求
      const requestPromise = this.activeRequests.get(batchId);
      if (requestPromise) {
        this.activeRequests.delete(batchId);
      }
    }
  }

  /**
   * 并发控制 - 获取槽位
   */
  private async acquireConcurrencySlot(): Promise<void> {
    if (!this.config.enableConcurrency) {
      return;
    }

    return new Promise((resolve) => {
      if (this.concurrencySemaphore.value < this.config.maxConcurrency) {
        this.concurrencySemaphore.value++;
        resolve();
      } else {
        this.concurrencySemaphore.waiting.push(resolve);
      }
    });
  }

  /**
   * 并发控制 - 释放槽位
   */
  private releaseConcurrencySlot(): void {
    if (!this.config.enableConcurrency) {
      return;
    }

    this.concurrencySemaphore.value--;

    if (this.concurrencySemaphore.waiting.length > 0) {
      const nextResolve = this.concurrencySemaphore.waiting.shift();
      if (nextResolve) {
        this.concurrencySemaphore.value++;
        nextResolve();
      }
    }
  }

  /**
   * 缓存操作
   */
  private getFromCache(request: any, virtualModelId: string): PipelineExecutionResult | null {
    const key = this.generateCacheKey(request, virtualModelId);
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 增加命中计数
    item.hitCount++;

    return item.value;
  }

  private addToCache(request: any, virtualModelId: string, result: PipelineExecutionResult): void {
    const key = this.generateCacheKey(request, virtualModelId);
    const item: CacheItem = {
      key,
      value: result,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL,
      hitCount: 0
    };

    this.cache.set(key, item);

    // 定期清理过期缓存
    this.cleanupCache();
  }

  private generateCacheKey(request: any, virtualModelId: string): string {
    return `${virtualModelId}_${JSON.stringify(request)}`;
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 辅助方法
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getVirtualModel(virtualModelId: string): VirtualModel {
    // 这里应该从实际配置中获取虚拟模型
    // 暂时返回模拟对象
    return {
      id: virtualModelId,
      name: virtualModelId,
      targets: [{ providerId: 'default' }],
      capabilities: []
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取优化统计
   */
  getOptimizationStats(): any {
    return {
      cache: {
        size: this.cache.size,
        hitRate: this.calculateCacheHitRate()
      },
      concurrency: {
        active: this.concurrencySemaphore.value,
        max: this.config.maxConcurrency,
        waiting: this.concurrencySemaphore.waiting.length
      },
      batching: {
        queueSize: this.batchQueue.length,
        batchSize: this.config.batchSize
      },
      retry: {
        enabled: this.config.enableRetry,
        maxRetries: this.config.maxRetries
      }
    };
  }

  private calculateCacheHitRate(): number {
    let totalHits = 0;
    let totalRequests = 0;

    for (const item of this.cache.values()) {
      totalHits += item.hitCount;
      totalRequests += item.hitCount + 1;
    }

    return totalRequests > 0 ? totalHits / totalRequests : 0;
  }

  /**
   * 销毁优化器
   */
  destroy(): void {
    // 清理批处理队列
    this.batchQueue.forEach(batch => {
      if (batch.timeout) {
        clearTimeout(batch.timeout);
      }
    });
    this.batchQueue = [];

    // 清理缓存
    this.cache.clear();

    // 清理并发控制
    this.concurrencySemaphore.waiting.forEach(resolve => resolve());
    this.concurrencySemaphore.waiting = [];

    // 清理活动请求
    this.activeRequests.clear();
  }
}