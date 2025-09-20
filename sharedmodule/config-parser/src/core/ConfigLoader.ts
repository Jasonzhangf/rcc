/**
 * 配置加载器 - 核心功能模块
 * 
 * 负责从各种来源加载配置数据
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigData } from './ConfigData';
import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import os from 'os';

/**
 * 配置来源类型
 */
export type ConfigSource = 
  | { type: 'file'; path: string }
  | { type: 'url'; url: string }
  | { type: 'env'; prefix?: string }
  | { type: 'memory'; data: any };

/**
 * 加载选项
 */
export interface LoadOptions {
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存过期时间（毫秒） */
  cacheExpiry?: number;
  /** 是否监听文件变化 */
  watchChanges?: boolean;
  /** 备份选项 */
  backup?: {
    enabled: boolean;
    maxBackups: number;
    backupDir: string;
  };
}

/**
 * 配置加载器类
 */
export class ConfigLoader extends BaseModule {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private watchers = new Map<string, any>();

  constructor(info: ModuleInfo = {
    id: 'config-loader',
    type: 'config-loader',
    name: 'Config Loader Module',
    version: '0.1.0',
    description: 'RCC Configuration Loader Module'
  }) {
    super(info);
  }

  /**
   * 初始化加载器
   */
  public async initialize(): Promise<void> {
    await super.initialize();

    this.logInfo('ConfigLoader initialized successfully');
  }


  /**
   * 从文件加载配置
   */
  public async loadFromFile(filePath: string, options?: LoadOptions): Promise<ConfigData> {
    try {
      const cacheKey = `file:${filePath}`;

      // 检查缓存
      if (options?.enableCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        const now = Date.now();
        const expiry = options.cacheExpiry || 300000; // 5分钟默认

        if (now - cached.timestamp < expiry) {
          this.logInfo(`Loading configuration from cache: ${filePath}`);
          return cached.data;
        }
      }

      // 检查文件是否存在
      await fs.access(filePath);
      
      // 读取文件内容
      const content = await fs.readFile(filePath, 'utf-8');

      this.logInfo('File content read successfully', {
        filePath,
        fileSize: content.length
      });
      
      // 解析配置
      let data: any;
      const ext = path.extname(filePath).toLowerCase();
      
      switch (ext) {
        case '.json':
          data = JSON.parse(content);
          break;
        case '.yaml':
        case '.yml':
          // 需要 yaml 库支持
          throw new Error('YAML support requires additional dependency');
        default:
          // 默认尝试 JSON
          data = JSON.parse(content);
      }

      // 缓存结果
      if (options?.enableCache) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }

      this.logInfo(`Configuration loaded from file: ${filePath}`);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.warn(`Failed to load configuration from ${filePath}`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * 保存配置到文件
   */
  public async saveConfig(config: ConfigData, filePath: string, options?: { backup?: boolean }): Promise<void> {
    try {
      // 创建备份
      if (options?.backup) {
        await this.createBackup(filePath);
      }

      // 确保目录存在
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // 写入配置
      const content = JSON.stringify(config, null, 2);
      await fs.writeFile(filePath, content, 'utf-8');

      // 清除缓存
      const cacheKey = `file:${filePath}`;
      this.cache.delete(cacheKey);

      this.logInfo(`Configuration saved to: ${filePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.warn(`Failed to save configuration to ${filePath}`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * 创建配置备份
   */
  private async createBackup(filePath: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${filePath}.backup.${timestamp}`;
      
      // 检查原文件是否存在
      try {
        await fs.access(filePath);
        await fs.copyFile(filePath, backupPath);
        this.logInfo(`Backup created: ${backupPath}`);
        return backupPath;
      } catch {
        // 原文件不存在，无需备份
        return '';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.warn(`Failed to create backup for ${filePath}`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * 销毁加载器
   */
  public async destroy(): Promise<void> {
    // 关闭所有文件监听器
    for (const [path, watcher] of this.watchers) {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
        this.logInfo(`File watcher closed for: ${path}`);
      }
    }
    this.watchers.clear();

    // 清除缓存
    this.cache.clear();

    this.logInfo('ConfigLoader destroyed successfully');
    await super.destroy();
  }
}