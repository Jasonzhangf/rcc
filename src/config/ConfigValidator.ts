/**
 * Configuration Validation Tool - Advanced validation and suggestions
 * 配置验证工具 - 高级验证和建议
 */

import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import {
  UnifiedConfig,
  ConfigValidationResult,
  ConfigError,
  ConfigWarning,
  ConfigSuggestion,
  ProviderConfig,
  VirtualModelConfig,
  PipelineConfig,
  RCCConfig,
} from '../types/config.js';
import { unifiedConfigSchema } from '../types/config.js';

/**
 * 配置依赖关系定义
 */
interface ConfigDependency {
  path: string;
  requires: string[];
  validates?: (config: any) => boolean | string;
  conflicts?: string[];
}

/**
 * 配置建议规则
 */
interface ConfigSuggestionRule {
  condition: (config: any) => boolean;
  message: string;
  path: string;
  reason?: string;
  autoFix?: (config: any) => any;
}

/**
 * 配置验证器
 */
export class ConfigValidator {
  private dependencies: ConfigDependency[] = [];
  private suggestionRules: ConfigSuggestionRule[] = [];

  constructor() {
    this.initializeDependencies();
    this.initializeSuggestionRules();
  }

  /**
   * 初始化配置依赖关系
   */
  private initializeDependencies(): void {
    this.dependencies = [
      {
        path: 'rcc.providers',
        requires: ['rcc.virtualModels'],
        validates: (config) => {
          const providers = config.rcc?.providers || {};
          const virtualModels = config.rcc?.virtualModels || {};

          for (const [vmId, vmConfig] of Object.entries(
            virtualModels as Record<string, VirtualModelConfig>
          )) {
            for (const target of vmConfig.targets || []) {
              if (!providers[target.providerId]) {
                return `Virtual model "${vmId}" references unknown provider "${target.providerId}"`;
              }
            }
          }
          return true;
        },
      },
      {
        path: 'rcc.virtualModels.*.targets',
        requires: [],
        validates: (target: VirtualModelTarget, parentPath: string) => {
          if (!target.providerId) {
            return `Target in virtual model missing required providerId`;
          }
          if (!target.modelId) {
            return `Target in virtual model missing required modelId`;
          }
          return true;
        },
      },
      {
        path: 'rcc.pipeline',
        requires: ['rcc.providers'],
        conflicts: ['modules.loader.validation.enabled'],
        validates: (config) => {
          const pipeline = config.rcc?.pipeline;
          if (pipeline?.enabled && !config.rcc?.providers) {
            return 'Pipeline requires at least one provider to be configured';
          }
          return true;
        },
      },
      {
        path: 'rcc.debugging',
        requires: ['global.paths.debug'],
        validates: (config) => {
          const debugging = config.rcc?.debugging;
          const debugPath = config.global?.paths?.debug;

          if (debugging?.enabled && !debugging?.outputDirectory && !debugPath) {
            return 'Debugging enabled but no output directory specified';
          }
          return true;
        },
      },
      {
        path: 'modules.errorHandling.recovery',
        requires: ['modules.errorHandling.enabled'],
        validates: (config) => {
          const errorHandling = config.modules?.errorHandling;
          if (errorHandling?.recovery?.enabled && !errorHandling?.enabled) {
            return 'Error handling recovery requires error handling to be enabled';
          }
          return true;
        },
      },
    ];
  }

  /**
   * 初始化配置建议规则
   */
  private initializeSuggestionRules(): void {
    this.suggestionRules = [
      {
        condition: (config) => !config.rcc?.debugging?.enabled,
        message: 'Consider enabling debugging for better monitoring',
        path: 'rcc.debugging.enabled',
        reason: 'Debugging helps with troubleshooting and monitoring',
        autoFix: (config) => {
          config.rcc = config.rcc || {};
          config.rcc.debugging = config.rcc.debugging || {};
          config.rcc.debugging.enabled = true;
          config.rcc.debugging.outputDirectory =
            config.rcc.debugging.outputDirectory || '~/.rcc/debug-logs';
          config.rcc.debugging.level = config.rcc.debugging.level || 'info';
          return config;
        },
      },
      {
        condition: (config) => !config.rcc?.monitoring?.enabled,
        message: 'Consider enabling monitoring for system health tracking',
        path: 'rcc.monitoring.enabled',
        reason: 'Monitoring helps track system performance and health',
        autoFix: (config) => {
          config.rcc = config.rcc || {};
          config.rcc.monitoring = config.rcc.monitoring || {};
          config.rcc.monitoring.enabled = true;
          config.rcc.monitoring.detailedMetrics = true;
          config.rcc.monitoring.requestTracing = true;
          config.rcc.monitoring.performanceMonitoring = true;
          return config;
        },
      },
      {
        condition: (config) => {
          const providers = Object.keys(config.rcc?.providers || {});
          return providers.length === 0;
        },
        message: 'No providers configured. The system will not function without providers',
        path: 'rcc.providers',
        reason: 'Providers are required for the system to process requests',
        autoFix: null, // No auto-fix as this requires actual provider configuration
      },
      {
        condition: (config) => {
          const virtualModels = config.rcc?.virtualModels || {};
          const vms = Object.values(virtualModels);
          return vms.some((vm: VirtualModelConfig) => !vm.fallback?.enabled);
        },
        message:
          'Some virtual models do not have fallback enabled. Consider enabling fallback for better reliability',
        path: 'rcc.virtualModels.*.fallback.enabled',
        reason: 'Fallback prevents service interruption when providers fail',
      },
      {
        condition: (config) =>
          config.global?.environment === 'production' && !config.global?.security?.enabled,
        message: 'Security should be enabled in production environment',
        path: 'global.security.enabled',
        reason: 'Production environments require security measures',
        autoFix: (config) => {
          config.global = config.global || {};
          config.global.security = config.global.security || {};
          config.global.security.enabled = true;
          config.global.security.encryption = { enabled: true, keyRotation: true };
          config.global.security.authentication = { enabled: true, requireAuth: true };
          config.global.security.authorization = { enabled: true };
          return config;
        },
      },
      {
        condition: (config) => {
          const modules = config.modules?.loader;
          return modules?.caching === undefined || modules?.validation?.enabled === false;
        },
        message: 'Module validation is not fully enabled. Consider enabling all validation options',
        path: 'modules.loader.validation.enabled',
        reason: 'Full validation helps catch configuration and runtime errors early',
        autoFix: (config) => {
          config.modules = config.modules || {};
          config.modules.loader = config.modules.loader || {};
          config.modules.loader.validation = {
            enabled: true,
            strict: true,
          };
          config.modules.loader.caching = config.modules.loader.caching ?? true;
          return config;
        },
      },
    ];
  }

  /**
   * 验证配置文件
   */
  async validateConfigFile(filePath: string): Promise<ConfigValidationResult> {
    try {
      const configData = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(configData);
      return await this.validateConfig(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [
          {
            path: filePath,
            message: errorMessage,
            code: 'FILE_READ_ERROR',
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * 验证配置对象
   */
  async validateConfig(config: any): Promise<ConfigValidationResult> {
    const errors: ConfigError[] = [];
    const warnings: ConfigWarning[] = [];
    const suggestions: ConfigSuggestion[] = [];

    try {
      // Basic schema validation with Zod
      const schemaResult = unifiedConfigSchema.safeParse(config);

      if (!schemaResult.success) {
        schemaResult.error.errors.forEach((error) => {
          const configError: ConfigError = {
            path: error.path.join('.'),
            message: error.message,
            code: error.code,
          };

          if (this.isCriticalError(error)) {
            errors.push(configError);
          } else {
            warnings.push({
              path: configError.path,
              message: configError.message,
              suggestion: this.getSuggestionForError(error),
            });
          }
        });
      }

      // Dependency validation
      const dependencyErrors = await this.validateDependencies(config);
      errors.push(...dependencyErrors);

      // Suggestion analysis
      const configSuggestions = await this.generateSuggestions(config);
      suggestions.push(...configSuggestions);

      // Security validation
      const securityErrors = await this.validateSecurity(config);
      errors.push(...securityErrors);

      // Performance validation
      const performanceWarnings = await this.validatePerformance(config);
      warnings.push(...performanceWarnings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        path: 'config',
        message: errorMessage,
        code: 'VALIDATION_ERROR',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * 检查是否为关键错误
   */
  private isCriticalError(error: z.ZodIssue): boolean {
    // These are always critical
    if (error.code === 'invalid_type' || error.code === 'too_small' || error.code === 'too_big') {
      return true;
    }

    // Context-dependent criticality
    const criticalPaths = ['rcc.providers', 'rcc.virtualModels.*.targets', 'global.environment'];

    const errorPath = error.path.join('.');
    return criticalPaths.some(
      (criticalPath) =>
        errorPath.includes(criticalPath) ||
        new RegExp(criticalPath.replace('*', '.*')).test(errorPath)
    );
  }

  /**
   * 获取错误建议
   */
  private getSuggestionForError(error: z.ZodIssue): string | undefined {
    if (error.code === 'invalid_type') {
      return `Expected ${error.expected}, but got ${error.received}`;
    }
    if (error.code === 'too_small') {
      return `Value should be at least ${error.minimum}`;
    }
    if (error.code === 'too_big') {
      return `Value should be at most ${error.maximum}`;
    }
    return undefined;
  }

  /**
   * 验证配置依赖关系
   */
  private async validateDependencies(config: any): Promise<ConfigError[]> {
    const errors: ConfigError[] = [];

    for (const dependency of this.dependencies) {
      const targetValue = this.getNestedValue(config, dependency.path);

      if (targetValue) {
        // Check required dependencies
        for (const required of dependency.requires || []) {
          const requiredValue = this.getNestedValue(config, required);
          if (!requiredValue) {
            errors.push({
              path: dependency.path,
              message: `Requires ${required} to be configured`,
              code: 'DEPENDENCY_MISSING',
            });
          }
        }

        // Check conflicts
        for (const conflict of dependency.conflicts || []) {
          const conflictValue = this.getNestedValue(config, conflict);
          if (conflictValue) {
            errors.push({
              path: dependency.path,
              message: `Conflicts with ${conflict}`,
              code: 'DEPENDENCY_CONFLICT',
            });
          }
        }

        // Run custom validation
        if (dependency.validates) {
          try {
            const result = dependency.validates(config, dependency.path);
            if (result !== true) {
              errors.push({
                path: dependency.path,
                message: typeof result === 'string' ? result : 'Validation failed',
                code: 'CUSTOM_VALIDATION_FAILED',
              });
            }
          } catch (error) {
            errors.push({
              path: dependency.path,
              message: error instanceof Error ? error.message : 'Validation error',
              code: 'VALIDATION_ERROR',
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * 生成配置建议
   */
  private async generateSuggestions(config: any): Promise<ConfigSuggestion[]> {
    const suggestions: ConfigSuggestion[] = [];

    for (const rule of this.suggestionRules) {
      try {
        if (rule.condition(config)) {
          suggestions.push({
            path: rule.path,
            suggestion: rule.message,
            reason: rule.reason,
          });
        }
      } catch (error) {
        // Ignore errors in suggestion rules
      }
    }

    return suggestions;
  }

  /**
   * 验证安全配置
   */
  private async validateSecurity(config: any): Promise<ConfigError[]> {
    const errors: ConfigError[] = [];

    // Check HTTPS in production
    if (config.global?.environment === 'production') {
      if (
        config.rcc?.server?.protocol === 'http' &&
        !config.rcc?.server?.host?.includes('localhost')
      ) {
        errors.push({
          path: 'rcc.server.protocol',
          message: 'HTTPS should be used in production environment',
          code: 'SECURITY_ISSUE',
        });
      }
    }

    // Check for hardcoded secrets
    for (const [providerId, provider] of Object.entries(config.rcc?.providers || {})) {
      const providerConfig = provider as ProviderConfig;
      if (providerConfig.auth?.keys) {
        for (let i = 0; i < providerConfig.auth.keys.length; i++) {
          const key = providerConfig.auth.keys[i];
          if (this.looksLikeSecret(key)) {
            errors.push({
              path: `rcc.providers.${providerId}.auth.keys[${i}]`,
              message: 'Potential hardcoded secret detected. Use environment variables instead',
              code: 'HARDCODED_SECRET',
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * 验证性能配置
   */
  private async validatePerformance(config: any): Promise<ConfigWarning[]> {
    const warnings: ConfigWarning[] = [];

    // Check for potential performance issues
    if (config.modules?.loader?.maxRetries > 5) {
      warnings.push({
        path: 'modules.loader.maxRetries',
        message: 'High retry count may impact performance',
        suggestion: 'Consider reducing maxRetries to 3 or less',
      });
    }

    if (config.rcc?.server?.timeout > 300000) {
      // 5 minutes
      warnings.push({
        path: 'rcc.server.timeout',
        message: 'Very high timeout may cause resource exhaustion',
        suggestion: 'Consider reducing timeout to 60 seconds or less',
      });
    }

    if (!config.modules?.loader?.caching) {
      warnings.push({
        path: 'modules.loader.caching',
        message: 'Module caching is disabled',
        suggestion: 'Enable caching to improve performance',
      });
    }

    return warnings;
  }

  /**
   * 检查是否为密文
   */
  private looksLikeSecret(value: string): boolean {
    if (!value || typeof value !== 'string') return false;

    // Common secret patterns
    const secretPatterns = [
      /^[a-zA-Z0-9]{32,}$/, // API keys, tokens
      /^sk-[a-zA-Z0-9]{48}$/, // OpenAI API key
      /^[A-Za-z0-9_-]{20,}$/, // Generic token
      /password|secret|key|token|private/i, // Keywords
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, // Strong password
    ];

    return secretPatterns.some((pattern) => pattern.test(value));
  }

  /**
   * 获取嵌套配置值
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (key === '*') {
        // Handle wildcard paths by returning array of values
        if (Array.isArray(current) || typeof current === 'object') {
          return Object.values(current);
        }
        return [];
      }

      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * 自动修复配置
   */
  async autoFix(
    config: any
  ): Promise<{ fixed: boolean; config: any; suggestions: ConfigSuggestion[] }> {
    const suggestions = await this.generateSuggestions(config);
    let fixed = false;
    let resultConfig = { ...config };

    for (const rule of this.suggestionRules) {
      if (rule.autoFix && rule.condition(resultConfig)) {
        try {
          resultConfig = rule.autoFix(resultConfig);
          fixed = true;
        } catch (error) {
          // Ignore auto-fix errors
        }
      }
    }

    return {
      fixed,
      config: resultConfig,
      suggestions: suggestions.filter((s) => !this.getNestedValue(resultConfig, s.path)),
    };
  }

  /**
   * 创建配置模板
   */
  createConfigTemplate(
    options: {
      environment?: 'development' | 'staging' | 'production';
      includeProviders?: boolean;
      includeVirtualModels?: boolean;
      includePipeline?: boolean;
    } = {}
  ): UnifiedConfig {
    const {
      environment = 'development',
      includeProviders = true,
      includeVirtualModels = false,
      includePipeline = false,
    } = options;

    const template: UnifiedConfig = {
      rcc: {
        port: 5506,
        server: {
          port: 5506,
          host: '0.0.0.0',
          protocol: 'http',
          cors: {
            enabled: true,
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
            windowMs: 900000, // 15 minutes
            maxRequests: 1000,
          },
        },
        providers: includeProviders
          ? {
              example: {
                id: 'example',
                name: 'Example Provider',
                type: 'openai',
                enabled: true,
                endpoint: 'https://api.openai.com/v1',
                auth: {
                  type: 'apikey',
                  keys: ['${OPENAI_API_KEY}'],
                },
                models: {
                  'gpt-3.5-turbo': {
                    id: 'gpt-3.5-turbo',
                    name: 'GPT-3.5 Turbo',
                    type: 'chat',
                    maxTokens: 4096,
                    temperature: 0.7,
                    capabilities: ['chat', 'completion'],
                  },
                },
              },
            }
          : {},
        virtualModels: {},
        pipeline: includePipeline
          ? {
              enabled: true,
              modules: [],
              transformers: [],
              filters: [],
              routing: {
                strategy: 'round-robin',
                rules: [],
              },
            }
          : { enabled: false },
        debugging: {
          enabled: environment !== 'production',
          outputDirectory: '~/.rcc/debug-logs',
          includeTimestamp: true,
          maxEntriesPerFile: 1000,
          level: environment === 'development' ? 'debug' : 'info',
          trackDataFlow: true,
          enableFileLogging: true,
        },
        monitoring: {
          enabled: true,
          detailedMetrics: true,
          requestTracing: true,
          performanceMonitoring: true,
        },
      },
      modules: {
        global: {
          basePath: './sharedmodule',
          autoLoad: true,
          preload: [],
          cache: {
            enabled: true,
            maxSize: 1000,
            ttl: 3600000, // 1 hour
            cleanupInterval: 60000, // 1 minute
          },
          validation: {
            enabled: true,
            strict: environment === 'production',
            schemaValidation: true,
          },
        },
        discovery: {
          scanPaths: ['./sharedmodule'],
          filePatterns: ['**/*.js', '**/*.ts'],
          excludePatterns: ['**/*.test.js', '**/*.test.ts'],
          recursive: true,
          symlinks: false,
        },
        loader: {
          caching: true,
          maxRetries: 3,
          retryDelay: 1000,
          validation: {
            enabled: true,
            strict: false,
          },
          fallback: {
            enabled: true,
            defaultModule: null,
          },
        },
        errorHandling: {
          enabled: true,
          globalHandler: true,
          logErrors: true,
          reportErrors: false,
          recovery: {
            enabled: true,
            maxAttempts: 3,
            backoffStrategy: 'exponential',
          },
        },
      },
      pipeline: {
        enabled: environment !== 'development',
        modules: [],
        transformers: [],
        filters: [],
        routing: {
          strategy: 'round-robin',
          rules: [],
        },
      },
      global: {
        environment,
        paths: {
          config: './rcc-config.json',
          logs: './logs',
          cache: './cache',
          temp: './temp',
          modules: './sharedmodule',
          data: './data',
          debug: './debug-logs',
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
            compressionEnabled: environment === 'production',
            minificationEnabled: environment === 'production',
          },
        },
        security: {
          enabled: environment === 'production',
          encryption: {
            enabled: environment === 'production',
            algorithm: 'aes-256-gcm',
            keyRotation: true,
          },
          authentication: {
            enabled: false,
            providers: [],
            requireAuth: environment === 'production',
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
      },
    };

    return template;
  }
}
