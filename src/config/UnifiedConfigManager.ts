/**
 * Unified Configuration Manager - Core Implementation
 * 统一配置管理器 - 核心实现
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  UnifiedConfig,
  ConfigProvider,
  ConfigChangeEvent,
  ConfigValidationResult,
  ConfigSource,
  ConfigError,
  CONFIG_FILE_NAMES,
  CONFIG_SEARCH_PATHS,
  unifiedConfigSchema,
  UnifiedConfigType,
} from '../types/config.js';

/**
 * 文件配置提供程序
 */
export class FileConfigProvider implements ConfigProvider {
  private filePath: string;
  private watchMode: boolean;
  private fileWatcher?: fs.FileHandle;

  constructor(filePath: string, watchMode = false) {
    this.filePath = filePath;
    this.watchMode = watchMode;
  }

  async load(): Promise<UnifiedConfig> {
    try {
      const configData = await fs.readFile(this.filePath, 'utf8');
      const parsedConfig = JSON.parse(configData);

      // 验证配置结构
      const result = unifiedConfigSchema.safeParse(parsedConfig);
      if (!result.success) {
        throw new Error(`Invalid config file ${this.filePath}: ${result.error.message}`);
      }

      return result.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load config from ${this.filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  async validate(): Promise<ConfigValidationResult> {
    try {
      const config = await this.load();

      return {
        valid: true,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [
          {
            path: this.filePath,
            message: errorMessage,
            code: 'CONFIG_LOAD_ERROR',
          },
        ],
        warnings: [],
      };
    }
  }

  watch(callback: (event: ConfigChangeEvent) => void): () => void {
    if (!this.watchMode) {
      return () => {}; // No-op if watch mode is disabled
    }

    // Implement file watching logic
    // This is a simplified implementation
    const watchInterval = setInterval(async () => {
      try {
        const stats = await fs.stat(this.filePath);
        const timestamp = stats.mtimeMs;

        // Check if file has been modified
        // This is a basic implementation - in production, use a proper file watcher
      } catch (error) {
        // File might not exist or be accessible
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(watchInterval);
    };
  }

  getSource(): ConfigSource {
    return {
      type: 'file',
      location: this.filePath,
      timestamp: Date.now(),
      priority: 1,
    };
  }
}

/**
 * 环境变量配置提供程序
 */
export class EnvironmentConfigProvider implements ConfigProvider {
  private prefix: string;
  private mappings: Record<string, string>;

  constructor(prefix = 'RCC_', mappings: Record<string, string> = {}) {
    this.prefix = prefix;
    this.mappings = mappings;
  }

  async load(): Promise<UnifiedConfig> {
    const envConfig: any = {
      rcc: {},
      modules: {},
      pipeline: {},
      global: {
        environment: (process.env.NODE_ENV as any) || 'development',
        paths: {},
        performance: {},
        security: {},
        network: {},
        storage: {},
      },
    };

    // Process environment variables
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.prefix) && value) {
        const configKey = key.slice(this.prefix.length).toLowerCase();
        this.setNestedValue(envConfig, configKey, this.parseValue(value));
      }
    }

    // Apply custom mappings
    for (const [envKey, configPath] of Object.entries(this.mappings)) {
      const value = process.env[envKey];
      if (value) {
        this.setNestedValue(envConfig, configPath, this.parseValue(value));
      }
    }

    return unifiedConfigSchema.parse(envConfig);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('_');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  private parseValue(value: string): any {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, try to parse as number/boolean
      if (value === 'true') return true;
      if (value === 'false') return false;

      const num = Number(value);
      if (!isNaN(num)) return num;

      // Return as string if no other format matches
      return value;
    }
  }

  async validate(): Promise<ConfigValidationResult> {
    try {
      await this.load();
      return {
        valid: true,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [
          {
            path: 'environment',
            message: errorMessage,
            code: 'ENV_CONFIG_ERROR',
          },
        ],
        warnings: [],
      };
    }
  }

  getSource(): ConfigSource {
    return {
      type: 'environment',
      location: 'process.env',
      timestamp: Date.now(),
      priority: 2, // Higher priority than file config
    };
  }
}

/**
 * 统一配置管理器
 */
export class UnifiedConfigManager extends EventEmitter {
  private providers: ConfigProvider[] = [];
  private cachedConfig?: UnifiedConfig;
  private validationErrors: ConfigError[] = [];
  private configFilePath: string;
  private watchMode: boolean;
  private watchDisposers: Array<() => void> = [];

  constructor(configFilePath?: string, watchMode = false) {
    super();
    this.configFilePath = configFilePath || this.findDefaultConfigFile();
    this.watchMode = watchMode;
    this.initializeProviders();
  }

  /**
   * 初始化配置提供程序
   */
  private initializeProviders(): void {
    // Add file config provider
    if (this.configFilePath) {
      this.providers.push(new FileConfigProvider(this.configFilePath, this.watchMode));
    }

    // Add environment config provider
    this.providers.push(
      new EnvironmentConfigProvider('RCC_', {
        PORT: 'rcc_port',
        NODE_ENV: 'global_environment',
        RCC_CONFIG_PATH: 'global_paths_config',
      })
    );
  }

  /**
   * 查找默认配置文件
   */
  private findDefaultConfigFile(): string {
    const possiblePaths = [
      path.join(process.cwd(), CONFIG_FILE_NAMES.DEFAULT),
      path.join(process.cwd(), CONFIG_FILE_NAMES.DEVELOPMENT),
      path.join(process.cwd(), CONFIG_FILE_NAMES.PRODUCTION),
      path.join(process.cwd(), CONFIG_FILE_NAMES.LOCAL),
    ];

    // Add user config if available
    if ((process.env as any).HOME) {
      possiblePaths.push(path.join((process.env as any).HOME, CONFIG_FILE_NAMES.USER));
    }

    // Add system-wide configs
    possiblePaths.push(
      path.join('/etc/rcc', CONFIG_FILE_NAMES.DEFAULT),
      path.join('/usr/local/etc/rcc', CONFIG_FILE_NAMES.DEFAULT)
    );

    // Return first existing config file
    for (const configPath of possiblePaths) {
      if (require('fs').existsSync(configPath)) {
        return configPath;
      }
    }

    // Return default path if none found
    return path.join(process.cwd(), CONFIG_FILE_NAMES.DEFAULT);
  }

  /**
   * 加载配置
   */
  async loadConfig(): Promise<UnifiedConfig> {
    const configs: UnifiedConfig[] = [];
    const errors: ConfigError[] = [];

    // Load from all providers
    for (const provider of this.providers) {
      try {
        const config = await provider.load();
        configs.push(config);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          path: provider.getSource().location,
          message: errorMessage,
          code: 'PROVIDER_LOAD_ERROR',
        });
      }
    }

    if (configs.length === 0) {
      throw new Error(
        `Failed to load configuration from all providers. Errors: ${errors.map((e) => e.message).join('; ')}`
      );
    }

    // Merge configurations (later configs override earlier ones)
    this.cachedConfig = this.mergeConfigs(configs);
    this.validationErrors = errors;

    // Validate merged config
    const result = await this.validateConfig();
    if (!result.valid && errors.length > 0) {
      throw new Error(
        `Configuration validation failed: ${result.errors.map((e) => e.message).join('; ')}`
      );
    }

    // Start watching if enabled
    if (this.watchMode) {
      this.startWatching();
    }

    this.emit('configLoaded', this.cachedConfig);
    return this.cachedConfig;
  }

  /**
   * 合并多个配置
   */
  private mergeConfigs(configs: UnifiedConfig[]): UnifiedConfig {
    if (configs.length === 0) {
      throw new Error('No configurations to merge');
    }

    let merged = configs[0];

    // Merge remaining configs
    for (let i = 1; i < configs.length; i++) {
      merged = this.deepMerge(merged, configs[i]);
    }

    return merged;
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    if (Array.isArray(source)) {
      return source; // Arrays are replaced, not merged
    }

    if (typeof source === 'object' && source !== null && !Array.isArray(source)) {
      const result = { ...target };
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          if (key in result && typeof result[key] === 'object' && typeof source[key] === 'object') {
            result[key] = this.deepMerge(result[key], source[key]);
          } else {
            result[key] = source[key];
          }
        }
      }
      return result;
    }

    return source;
  }

  /**
   * 验证配置
   */
  async validateConfig(): Promise<ConfigValidationResult> {
    if (!this.cachedConfig) {
      return {
        valid: false,
        errors: [
          {
            path: 'config',
            message: 'No configuration loaded',
            code: 'NO_CONFIG',
          },
        ],
        warnings: [],
      };
    }

    try {
      // Validate using Zod schema
      const result = unifiedConfigSchema.safeParse(this.cachedConfig);

      if (!result.success) {
        const errors: ConfigError[] = [];
        const warnings: ConfigError[] = [];

        result.error.errors.forEach((error) => {
          const configError: ConfigError = {
            path: error.path.join('.'),
            message: error.message,
            code: error.code,
          };

          if (error.code === 'invalid_type' || error.code === 'unrecognized_keys') {
            errors.push(configError);
          } else {
            warnings.push(configError);
          }
        });

        return {
          valid: errors.length === 0,
          errors,
          warnings: warnings.map((w) => ({ path: w.path, message: w.message })),
        };
      }

      return {
        valid: true,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [
          {
            path: 'config',
            message: errorMessage,
            code: 'VALIDATION_ERROR',
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): UnifiedConfig {
    if (!this.cachedConfig) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.cachedConfig;
  }

  /**
   * 获取配置的特定部分
   */
  getConfigSection<K extends keyof UnifiedConfig>(section: K): UnifiedConfig[K] {
    const config = this.getConfig();
    return config[section];
  }

  /**
   * 获取配置值
   */
  getConfigValue(path: string): any {
    const config = this.getConfig();
    return this.getNestedValue(config, path);
  }

  /**
   * 更新配置值
   */
  updateConfigValue(path: string, value: any): void {
    if (!this.cachedConfig) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    const oldValue = this.getNestedValue(this.cachedConfig, path);
    this.setNestedValue(this.cachedConfig, path, value);

    this.emit('configChanged', {
      key: path,
      oldValue,
      newValue: value,
      source: {
        type: 'memory',
        location: 'runtime-update',
        timestamp: Date.now(),
        priority: 3,
      },
      timestamp: Date.now(),
    } as ConfigChangeEvent);
  }

  /**
   * 获取嵌套配置值
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * 设置嵌套配置值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 启动配置监听
   */
  private startWatching(): void {
    for (const provider of this.providers) {
      if (provider.watch) {
        const disposer = provider.watch((event) => {
          this.emit('configChanged', event);
          // Reload config on change
          this.loadConfig().catch((error) => {
            this.emit('configError', error);
          });
        });
        this.watchDisposers.push(disposer);
      }
    }
  }

  /**
   * 停止配置监听
   */
  stopWatching(): void {
    for (const disposer of this.watchDisposers) {
      disposer();
    }
    this.watchDisposers = [];
  }

  /**
   * 销毁配置管理器
   */
  destroy(): void {
    this.stopWatching();
    this.cachedConfig = undefined;
    this.removeAllListeners();
  }
}

/**
 * 配置管理器工厂
 */
export class ConfigManagerFactory {
  private static instances: Map<string, UnifiedConfigManager> = new Map();

  static create(
    configPath?: string,
    watchMode = false,
    instanceId = 'default'
  ): UnifiedConfigManager {
    let instance = this.instances.get(instanceId);

    if (!instance) {
      instance = new UnifiedConfigManager(configPath, watchMode);
      this.instances.set(instanceId, instance);
    }

    return instance;
  }

  static get(instanceId = 'default'): UnifiedConfigManager | undefined {
    return this.instances.get(instanceId);
  }

  static destroy(instanceId = 'default'): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.destroy();
      this.instances.delete(instanceId);
    }
  }

  static destroyAll(): void {
    for (const instance of this.instances.values()) {
      instance.destroy();
    }
    this.instances.clear();
  }
}
