/**
 * Configuration Migration Tool - Migrate from old to new format
 * 配置迁移工具 - 从旧格式迁移到新格式
 */

import { promises as fs } from 'fs';
import path from 'path';
import {
  UnifiedConfig,
  ConfigValidationResult,
  ConfigError,
  ConfigSuggestion,
} from '../types/config.js';

/**
 * 配置迁移选项
 */
export interface MigrationOptions {
  backup?: boolean;
  dryRun?: boolean;
  strictMode?: boolean;
  migrateProviders?: boolean;
  migrateVirtualModels?: boolean;
  migratePipeline?: boolean;
  autoFixErrors?: boolean;
  generateReport?: boolean;
}

/**
 * 迁移结果
 */
export interface MigrationResult {
  success: boolean;
  originalPath: string;
  newPath: string;
  backupPath?: string;
  validation: ConfigValidationResult;
  changes: ConfigChange[];
  warnings: string[];
  report?: MigrationReport;
}

/**
 * 配置变更记录
 */
export interface ConfigChange {
  type: 'added' | 'removed' | 'modified' | 'moved' | 'renamed';
  path: string;
  oldValue?: any;
  newValue?: any;
  reason: string;
}

/**
 * 迁移报告
 */
export interface MigrationReport {
  timestamp: number;
  sourceVersion: string;
  targetVersion: string;
  totalChanges: number;
  breakingChanges: number;
  compatibleChanges: number;
  requiredActions: string[];
  recommendations: string[];
  rollbackInstructions: string[];
}

/**
 * 旧配置格式类型定义
 */
interface OldConfigFormat {
  port?: number;
  server?: {
    port?: number;
    host?: string;
    cors?: boolean;
    [key: string]: any;
  };
  providers?: Record<string, any>;
  virtualModels?: Record<string, any>;
  pipeline?: any;
  debug?:
    | boolean
    | {
        enabled?: boolean;
        path?: string;
        [key: string]: any;
      };
  modules?: any;
}

/**
 * 配置迁移器
 */
export class ConfigMigrator {
  private options: MigrationOptions;
  private changes: ConfigChange[] = [];
  private warnings: string[] = [];

  constructor(options: MigrationOptions = {}) {
    this.options = {
      backup: true,
      dryRun: false,
      strictMode: false,
      migrateProviders: true,
      migrateVirtualModels: true,
      migratePipeline: true,
      autoFixErrors: true,
      generateReport: true,
      ...options,
    };
  }

  /**
   * 迁移配置文件
   */
  async migrateConfigFile(oldConfigPath: string, newConfigPath?: string): Promise<MigrationResult> {
    try {
      this.reset();

      const oldConfigContent = await fs.readFile(oldConfigPath, 'utf8');
      const oldConfig = JSON.parse(oldConfigContent);

      return await this.migrateConfig(oldConfig, oldConfigPath, newConfigPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read configuration file ${oldConfigPath}: ${errorMessage}`);
    }
  }

  /**
   * 迁移配置对象
   */
  async migrateConfig(
    oldConfig: any,
    sourcePath = 'unknown',
    targetPath?: string
  ): Promise<MigrationResult> {
    try {
      this.reset();

      const newConfig = this.transformConfig(oldConfig);
      const newConfigPath = targetPath || this.generateNewPath(sourcePath);

      // Create backup if requested
      let backupPath: string | undefined;
      if (this.options.backup && !this.options.dryRun) {
        backupPath = await this.createBackup(sourcePath);
      }

      // Write new config if not dry run
      if (!this.options.dryRun) {
        await this.writeConfig(newConfig, newConfigPath);
      }

      // Validate new config
      const { ConfigValidator } = await import('./ConfigValidator.js');
      const validator = new ConfigValidator();
      const validation = await validator.validateConfig(newConfig);

      // Auto-fix if requested
      if (this.options.autoFixErrors && validation.errors.length > 0) {
        const autoFixResult = await validator.autoFix(newConfig);
        if (autoFixResult.fixed && !this.options.dryRun) {
          await this.writeConfig(autoFixResult.config, newConfigPath);
          // Re-validate after auto-fix
          const newValidation = await validator.validateConfig(autoFixResult.config);
          validation.errors = newValidation.errors;
          validation.warnings = newValidation.warnings;
        }
      }

      // Generate report if requested
      const report = this.options.generateReport
        ? this.generateReport(sourcePath, newConfigPath)
        : undefined;

      return {
        success: validation.valid,
        originalPath: sourcePath,
        newPath: newConfigPath,
        backupPath,
        validation,
        changes: this.changes,
        warnings: this.warnings,
        report,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Configuration migration failed: ${errorMessage}`);
    }
  }

  /**
   * 重置状态
   */
  private reset(): void {
    this.changes = [];
    this.warnings = [];
  }

  /**
   * 转换旧配置到新配置
   */
  private transformConfig(oldConfig: OldConfigFormat): UnifiedConfig {
    const newConfig: UnifiedConfig = {
      rcc: {
        port: oldConfig.port,
        providers: {},
        virtualModels: {},
        pipeline: { enabled: false },
      },
      modules: {
        global: {},
        discovery: {},
        loader: {},
        errorHandling: {},
      },
      pipeline: { enabled: false },
      global: {
        environment: this.detectEnvironment(oldConfig),
        paths: {},
        performance: {},
        security: {},
        network: {},
        storage: {},
      },
    };

    // Migrate server configuration
    if (oldConfig.server) {
      newConfig.rcc.server = {
        port: oldConfig.server.port,
        host: oldConfig.server.host || '0.0.0.0',
        protocol: 'http',
        cors: {
          enabled: oldConfig.server.cors === true,
          origins: ['*'],
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          headers: ['Content-Type', 'Authorization'],
        },
        compression: true,
        timeout: 30000,
        bodyLimit: '50mb',
        rateLimiting: {
          enabled: true,
          windowMs: 900000,
          maxRequests: 1000,
        },
      };

      if (oldConfig.server.cors && typeof oldConfig.server.cors === 'object') {
        Object.assign(newConfig.rcc.server.cors, oldConfig.server.cors);
      }
    }

    // Migrate providers
    if (this.options.migrateProviders && oldConfig.providers) {
      newConfig.rcc.providers = this.migrateProviders(oldConfig.providers);
    }

    // Migrate virtual models
    if (this.options.migrateVirtualModels && oldConfig.virtualModels) {
      newConfig.rcc.virtualModels = this.migrateVirtualModels(oldConfig.virtualModels);
    }

    // Migrate pipeline
    if (this.options.migratePipeline && oldConfig.pipeline) {
      newConfig.rcc.pipeline = this.migratePipeline(oldConfig.pipeline);
      newConfig.pipeline.enabled = oldConfig.pipeline.enabled || false;
    }

    // Migrate debug configuration
    if (oldConfig.debug !== undefined) {
      newConfig.rcc.debugging = this.migrateDebugConfig(oldConfig.debug);
    }

    // Migrate modules configuration
    if (oldConfig.modules) {
      newConfig.modules = this.migrateModulesConfig(oldConfig.modules);
    }

    // Set up global configuration
    this.setupGlobalConfig(newConfig, oldConfig);

    return newConfig;
  }

  /**
   * 检测环境
   */
  private detectEnvironment(oldConfig: OldConfigFormat): 'development' | 'staging' | 'production' {
    // First check NODE_ENV
    if (process.env.NODE_ENV) {
      const env = process.env.NODE_ENV.toLowerCase();
      if (['development', 'staging', 'production'].includes(env)) {
        return env as 'development' | 'staging' | 'production';
      }
    }

    // Check for production indicators
    if (oldConfig.server?.host && oldConfig.server.host.includes('prod')) {
      return 'production';
    }

    if (oldConfig.server?.port === 80 || oldConfig.server?.port === 443) {
      return 'production';
    }

    // Check debug settings
    if (
      oldConfig.debug === true ||
      (typeof oldConfig.debug === 'object' && oldConfig.debug?.enabled)
    ) {
      return 'development';
    }

    return 'development'; // Default
  }

  /**
   * 迁移提供程序配置
   */
  private migrateProviders(oldProviders: Record<string, any>): Record<string, any> {
    const newProviders: Record<string, any> = {};

    for (const [providerId, oldProvider] of Object.entries(oldProviders)) {
      const newProvider = {
        id: providerId,
        name: oldProvider.name || `Provider ${providerId}`,
        type: oldProvider.type || 'custom',
        enabled: oldProvider.enabled !== false,
        endpoint: oldProvider.endpoint || oldProvider.url || '',
        models: oldProvider.models || {},
        auth: oldProvider.auth || this.inferAuthConfig(oldProvider),
        timeout: oldProvider.timeout || 30000,
      };

      // Add retry configuration
      if (oldProvider.maxRetries || oldProvider.retryConfig) {
        newProvider.retryConfig = {
          maxRetries: oldProvider.maxRetries || 3,
          backoffMultiplier: 2,
          baseDelay: 1000,
          maxDelay: 10000,
        };
      }

      newProviders[providerId] = newProvider;
    }

    return newProviders;
  }

  /**
   * 推断认证配置
   */
  private inferAuthConfig(oldProvider: any): any {
    if (oldProvider.apiKey || oldProvider.apikey) {
      return {
        type: 'apikey',
        keys: [oldProvider.apiKey || oldProvider.apikey],
      };
    }

    if (oldProvider.bearerToken) {
      return {
        type: 'bearer',
        keys: [oldProvider.bearerToken],
      };
    }

    if (oldProvider.oauth || oldProvider.oauth2) {
      return {
        type: 'oauth',
        ...oldProvider.oauth,
        ...oldProvider.oauth2,
      };
    }

    return { type: 'none' };
  }

  /**
   * 迁移虚拟模型配置
   */
  private migrateVirtualModels(oldVirtualModels: Record<string, any>): Record<string, any> {
    const newVirtualModels: Record<string, any> = {};

    for (const [vmId, oldVm] of Object.entries(oldVirtualModels)) {
      const newVm = {
        id: vmId,
        name: oldVm.name || vmId,
        enabled: oldVm.enabled !== false,
        provider: oldVm.provider || oldVm.providerId,
        endpoint: oldVm.endpoint,
        model: oldVm.model || oldVm.modelId,
        capabilities: oldVm.capabilities || ['chat'],
        maxTokens: oldVm.maxTokens || 4096,
        temperature: oldVm.temperature || 0.7,
        topP: oldVm.topP || 1.0,
        routingRules: oldVm.routingRules || [],
        targets: this.migrateTargets(oldVm.targets || oldVm.providers || []),
        fallback: {
          enabled: oldVm.fallbackEnabled || oldVm.enableFallback || false,
          retryAfter: oldVm.fallbackRetryAfter || 5000,
          maxRetries: oldVm.fallbackMaxRetries || 3,
        },
        loadBalancing: {
          strategy: oldVm.loadBalancingStrategy || 'round-robin',
          weights: oldVm.weights || {},
        },
      };

      newVirtualModels[vmId] = newVm;
    }

    return newVirtualModels;
  }

  /**
   * 迁移目标配置
   */
  private migrateTargets(oldTargets: any[]): any[] {
    return oldTargets.map((target) => {
      if (typeof target === 'string') {
        return {
          providerId: target,
          modelId: 'default',
          enabled: true,
        };
      }

      return {
        providerId: target.providerId || target.provider,
        modelId: target.modelId || target.model || 'default',
        keyIndex: target.keyIndex || 0,
        weight: target.weight || 1,
        priority: target.priority || 1,
        enabled: target.enabled !== false,
      };
    });
  }

  /**
   * 迁移流水线配置
   */
  private migratePipeline(oldPipeline: any): any {
    return {
      enabled: oldPipeline.enabled !== false,
      modules: oldPipeline.modules || [],
      transformers: oldPipeline.transformers || [],
      filters: oldPipeline.filters || [],
      routing: {
        strategy: oldPipeline.routingStrategy || oldPipeline.strategy || 'round-robin',
        rules: oldPipeline.routingRules || oldPipeline.rules || [],
      },
    };
  }

  /**
   * 迁移调试配置
   */
  private migrateDebugConfig(oldDebug: any): any {
    if (typeof oldDebug === 'boolean') {
      return {
        enabled: oldDebug,
        outputDirectory: '~/.rcc/debug-logs',
        includeTimestamp: true,
        maxEntriesPerFile: 1000,
        level: 'info',
        trackDataFlow: true,
        enableFileLogging: true,
      };
    }

    return {
      enabled: oldDebug.enabled !== false,
      outputDirectory: oldDebug.path || oldDebug.outputDirectory || '~/.rcc/debug-logs',
      includeTimestamp: oldDebug.includeTimestamp !== false,
      maxEntriesPerFile: oldDebug.maxEntriesPerFile || 1000,
      level: oldDebug.level || 'info',
      trackDataFlow: oldDebug.trackDataFlow !== false,
      enableFileLogging: oldDebug.enableFileLogging !== false,
    };
  }

  /**
   * 迁移模块配置
   */
  private migrateModulesConfig(oldModules: any): any {
    return {
      global: {
        basePath: oldModules.basePath || './sharedmodule',
        autoLoad: oldModules.autoLoad !== false,
        preload: oldModules.preload || [],
      },
      discovery: {
        scanPaths: oldModules.scanPaths || ['./sharedmodule'],
        filePatterns: oldModules.filePatterns || ['**/*.js', '**/*.ts'],
        excludePatterns: oldModules.excludePatterns || ['**/*.test.js', '**/*.test.ts'],
        recursive: oldModules.recursive !== false,
        symlinks: oldModules.symlinks === true,
      },
      loader: {
        caching: oldModules.caching !== false,
        maxRetries: oldModules.maxRetries || 3,
        retryDelay: oldModules.retryDelay || 1000,
        validation: {
          enabled: oldModules.validationEnabled !== false,
          strict: oldModules.strictValidation === true,
        },
        fallback: {
          enabled: oldModules.enableFallback !== false,
          defaultModule: oldModules.defaultModule,
        },
      },
      errorHandling: {
        enabled: oldModules.errorHandlingEnabled !== false,
        globalHandler: oldModules.globalErrorHandler !== false,
        logErrors: oldModules.logErrors !== false,
        reportErrors: oldModules.reportErrors === true,
        recovery: {
          enabled: oldModules.enableErrorRecovery === true,
          maxAttempts: oldModules.errorRecoveryAttempts || 3,
          backoffStrategy: oldModules.errorRecoveryStrategy || 'exponential',
        },
      },
    };
  }

  /**
   * 设置全局配置
   */
  private setupGlobalConfig(newConfig: UnifiedConfig, oldConfig: OldConfigFormat): void {
    newConfig.global = {
      environment: this.detectEnvironment(oldConfig),
      paths: {
        config: './rcc-config.json',
        logs: './logs',
        cache: './cache',
        temp: './temp',
        modules: newConfig.modules?.global?.basePath || './sharedmodule',
        data: './data',
        debug: newConfig.rcc?.debugging?.outputDirectory || '~/.rcc/debug-logs',
      },
      performance: {
        enabled: true,
        metrics: {
          enabled: true,
          collectors: ['memory', 'cpu'],
          exportInterval: 60000,
        },
        optimization: {
          cacheEnabled: true,
          compressionEnabled: newConfig.global?.environment === 'production',
          minificationEnabled: newConfig.global?.environment === 'production',
        },
      },
      security: {
        enabled: newConfig.global?.environment === 'production',
        encryption: {
          enabled: newConfig.global?.environment === 'production',
          algorithm: 'aes-256-gcm',
          keyRotation: true,
        },
        authentication: {
          enabled: false,
          providers: [],
          requireAuth: newConfig.global?.environment === 'production',
        },
        authorization: {
          enabled: false,
          roles: [],
          permissions: [],
        },
      },
      network: {
        timeout: 30000,
        retries: 3,
        userAgent: 'RCC-Agent/1.0',
        proxy: {
          enabled: false,
        },
      },
      storage: {
        provider: 'filesystem',
        connection: {},
        options: {},
      },
    };
  }

  /**
   * 生成新配置路径
   */
  private generateNewPath(oldPath: string): string {
    const parsed = path.parse(oldPath);
    const newName = `${parsed.name}.migrated${parsed.ext}`;
    return path.join(parsed.dir, newName);
  }

  /**
   * 创建配置文件备份
   */
  private async createBackup(originalPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const parsed = path.parse(originalPath);
    const backupPath = path.join(parsed.dir, `${parsed.name}.backup.${timestamp}${parsed.ext}`);

    await fs.copyFile(originalPath, backupPath);
    this.addChange(
      'added',
      'backup',
      undefined,
      backupPath,
      'Created backup of original configuration'
    );

    return backupPath;
  }

  /**
   * 写入配置文件
   */
  private async writeConfig(config: UnifiedConfig, filePath: string): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write config with formatting
    const configContent = JSON.stringify(config, null, 2);
    await fs.writeFile(filePath, configContent, 'utf8');
  }

  /**
   * 生成迁移报告
   */
  private generateReport(sourcePath: string, targetPath: string): MigrationReport {
    const breakingChanges = this.changes.filter(
      (c) => c.type === 'removed' || (c.type === 'modified' && this.isBreakingChange(c))
    ).length;

    const compatibleChanges = this.changes.length - breakingChanges;

    return {
      timestamp: Date.now(),
      sourceVersion: '1.0',
      targetVersion: '2.0',
      totalChanges: this.changes.length,
      breakingChanges,
      compatibleChanges,
      requiredActions: this.generateRequiredActions(),
      recommendations: this.generateRecommendations(),
      rollbackInstructions: this.generateRollbackInstructions(sourcePath, targetPath),
    };
  }

  /**
   * 检查是否为破坏性变更
   */
  private isBreakingChange(change: ConfigChange): boolean {
    const breakingPaths = ['providers', 'virtualModels', 'pipeline.enabled', 'server', 'auth'];

    return breakingPaths.some((path) => change.path.includes(path));
  }

  /**
   * 生成必需的操作
   */
  private generateRequiredActions(): string[] {
    const actions: string[] = [];

    if (this.warnings.includes('security')) {
      actions.push('Review and update security settings for the new configuration format');
    }

    if (this.changes.some((c) => c.path.includes('providers'))) {
      actions.push('Verify that all provider configurations are correctly migrated');
    }

    if (this.changes.some((c) => c.path.includes('pipeline'))) {
      actions.push('Test pipeline functionality after migration');
    }

    actions.push('Update any custom scripts or tools that depend on the old configuration format');
    actions.push('Run system tests to ensure everything works with the new configuration');

    return actions;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    recommendations.push('Review the generated configuration and adjust settings as needed');
    recommendations.push('Consider enabling additional security features for production use');
    recommendations.push('Set up proper monitoring and alerting based on the new configuration');
    recommendations.push('Document any custom changes made during migration');

    return recommendations;
  }

  /**
   * 生成回滚说明
   */
  private generateRollbackInstructions(sourcePath: string, targetPath: string): string[] {
    const instructions: string[] = [];

    instructions.push(`To rollback to the original configuration:`);
    instructions.push(`1. Remove the new configuration file: rm ${targetPath}`);
    if (this.options.backup) {
      const backupFile = path.basename(sourcePath).replace('.json', '.backup.*.json');
      instructions.push(
        `2. Restore from backup: cp ${path.dirname(sourcePath)}/${backupFile} ${sourcePath}`
      );
    }
    instructions.push(`3. Restart the system to use the original configuration`);

    return instructions;
  }

  /**
   * 添加变更记录
   */
  private addChange(
    type: ConfigChange['type'],
    path: string,
    oldValue?: any,
    newValue?: any,
    reason: string = ''
  ): void {
    this.changes.push({
      type,
      path,
      oldValue,
      newValue,
      reason,
    });
  }

  /**
   * 批量迁移配置文件
   */
  async batchMigrate(
    sourceDirectory: string,
    pattern = '*config*.json'
  ): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];

    try {
      const files = await fs.readdir(sourceDirectory);
      const configFiles = files.filter(
        (file) =>
          file.includes('config') &&
          file.endsWith('.json') &&
          !file.includes('.migrated') &&
          !file.includes('.backup')
      );

      for (const file of configFiles) {
        const filePath = path.join(sourceDirectory, file);
        try {
          const result = await this.migrateConfigFile(filePath);
          results.push(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.push({
            success: false,
            originalPath: filePath,
            newPath: '',
            validation: {
              valid: false,
              errors: [
                {
                  path: filePath,
                  message: errorMessage,
                  code: 'MIGRATION_FAILED',
                },
              ],
              warnings: [],
            },
            changes: [],
            warnings: [],
            report: undefined,
          });
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to scan directory ${sourceDirectory}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return results;
  }
}

/**
 * 迁移工具函数
 */
export class MigrationUtils {
  /**
   * 检查配置文件是否需要迁移
   */
  static async needsMigration(configPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(content);

      // Check for old format indicators
      const oldFormatKeys = ['port', 'cors', 'apiKey'];
      const newFormatKeys = ['rcc', 'modules', 'global'];

      const hasOldKeys = oldFormatKeys.some((key) => key in config);
      const hasNewKeys = newFormatKeys.some(
        (key) => key in config && typeof config[key] === 'object'
      );

      return hasOldKeys && !hasNewKeys;
    } catch (error) {
      return false; // Assume migration needed if can't parse
    }
  }

  /**
   * 获取配置文件格式信息
   */
  static async getConfigFormat(configPath: string): Promise<{
    format: 'old' | 'new' | 'unknown';
    version?: string;
    needsMigration: boolean;
  }> {
    try {
      const content = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(content);

      if (config.rcc && typeof config.rcc === 'object') {
        return {
          format: 'new',
          version: config.version || '2.0',
          needsMigration: false,
        };
      }

      if (config.providers || config.port || config.server) {
        return {
          format: 'old',
          version: '1.0',
          needsMigration: true,
        };
      }

      return {
        format: 'unknown',
        needsMigration: true,
      };
    } catch (error) {
      return {
        format: 'unknown',
        needsMigration: true,
      };
    }
  }
}
