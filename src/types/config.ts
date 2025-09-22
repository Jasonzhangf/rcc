/**
 * Unified Configuration Management System for RCC
 * 统一的RCC配置管理系统
 */

import { z } from 'zod';

// ===== 基础类型定义 =====

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigError[];
  warnings: ConfigWarning[];
  suggestions?: ConfigSuggestion[];
}

export interface ConfigError {
  path: string;
  message: string;
  code?: string;
}

export interface ConfigWarning {
  path: string;
  message: string;
  suggestion?: string;
}

export interface ConfigSuggestion {
  path: string;
  suggestion: string;
  reason?: string;
}

/**
 * 配置源信息
 */
export interface ConfigSource {
  type: 'file' | 'environment' | 'database' | 'api' | 'memory';
  location: string;
  timestamp: number;
  priority: number;
}

/**
 * 配置变更事件
 */
export interface ConfigChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  source: ConfigSource;
  timestamp: number;
}

/**
 * 统一配置接口
 */
export interface UnifiedConfig {
  rcc: RCCConfig;
  modules: ModuleConfig;
  pipeline: PipelineConfig;
  global: GlobalConfig;
}

/**
 * 配置提供程序
 */
export interface ConfigProvider {
  load(): Promise<UnifiedConfig>;
  validate(): Promise<ConfigValidationResult>;
  watch?(callback: (event: ConfigChangeEvent) => void): () => void;
  getSource(): ConfigSource;
}

// ===== RCC配置类型 =====

/**
 * RCC系统配置
 */
export interface RCCConfig {
  port?: number;
  server?: {
    port?: number;
    host?: string;
    protocol?: 'http' | 'https';
    cors?: {
      enabled?: boolean;
      origins?: string[];
      credentials?: boolean;
      methods?: string[];
      headers?: string[];
    };
    compression?: boolean;
    timeout?: number;
    bodyLimit?: string | number;
    rateLimiting?: {
      enabled?: boolean;
      windowMs?: number;
      maxRequests?: number;
      skipSuccessfulRequests?: boolean;
      skipFailedRequests?: boolean;
    };
  };
  providers: Record<string, ProviderConfig>;
  dynamicRouting: Record<string, DynamicRoutingConfig>;
  pipeline: PipelineConfig;
  debugging?: {
    enabled?: boolean;
    outputDirectory?: string;
    includeTimestamp?: boolean;
    maxEntriesPerFile?: number;
    level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    trackDataFlow?: boolean;
    enableFileLogging?: boolean;
  };
  monitoring?: {
    enabled?: boolean;
    detailedMetrics?: boolean;
    requestTracing?: boolean;
    performanceMonitoring?: boolean;
  };
  security?: SecurityConfig;
}

/**
 * 提供程序认证配置
 */
export interface ProviderAuth {
  type: 'none' | 'apikey' | 'oauth' | 'bearer' | 'basic' | 'custom';
  keys?: string[];
  endpoints?: {
    token?: string;
    refresh?: string;
    revoke?: string;
  };
  credentials?: {
    clientId?: string;
    clientSecret?: string;
    username?: string;
    password?: string;
  };
  scopes?: string[];
  tokenExpiry?: number;
  refreshExpiry?: number;
}

/**
 * 模型配置
 */
export interface ModelConfig {
  id: string;
  name: string;
  type?: 'chat' | 'completion' | 'embedding' | 'moderation';
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  capabilities?: Array<'chat' | 'completion' | 'function-calling' | 'vision' | 'audio'>;
  pricing?: {
    input: number;
    output: number;
    unit?: 'token' | 'character' | 'request';
  };
}

/**
 * 提供程序配置
 */
export interface ProviderConfig {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'azure' | 'cohere' | 'huggingface' | 'local' | 'custom';
  enabled: boolean;
  endpoint: string;
  models?: Record<string, ModelConfig>;
  auth?: ProviderAuth;
  timeout?: number;
  retryConfig?: {
    maxRetries?: number;
    backoffMultiplier?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
  rateLimiting?: {
    enabled?: boolean;
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    requestsPerHour?: number;
  };
  healthCheck?: {
    enabled?: boolean;
    interval?: number;
    timeout?: number;
    endpoint?: string;
  };
}

/**
 * 动态路由目标配置
 */
export interface DynamicRoutingTarget {
  providerId: string;
  modelId: string;
  keyIndex?: number;
  weight?: number;
  priority?: number;
  enabled?: boolean;
  conditions?: {
    timeRange?: {
      start?: string; // HH:MM format
      end?: string; // HH:MM format
      timezone?: string;
    };
    maxRequests?: number;
    costLimit?: number;
  };
}

/**
 * 动态路由配置
 */
export interface DynamicRoutingConfig {
  id: string;
  name: string;
  enabled: boolean;
  targets: DynamicRoutingTarget[];
  capabilities?: string[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  provider?: string;
  endpoint?: string;
  model?: string;
  routingRules?: any[];
  fallback?: {
    enabled?: boolean;
    retryAfter?: number;
    maxRetries?: number;
  };
  loadBalancing?: {
    strategy?: 'round-robin' | 'least-connections' | 'weighted' | 'priority';
    weights?: Record<string, number>;
  };
}

/**
 * 流水线配置
 */
export interface PipelineConfig {
  enabled?: boolean;
  modules?: Array<{
    id: string;
    type: string;
    config?: Record<string, any>;
    enabled?: boolean;
  }>;
  transformers?: Array<{
    id: string;
    type: 'input' | 'output' | 'both';
    config?: Record<string, any>;
    priority?: number;
  }>;
  filters?: Array<{
    id: string;
    type: 'request' | 'response' | 'both';
    config?: Record<string, any>;
    conditions?: string[];
  }>;
  routing?: {
    strategy?: 'round-robin' | 'least-connections' | 'weighted' | 'custom';
    rules?: Array<{
      condition: string;
      action: 'allow' | 'deny' | 'rewrite' | 'redirect';
      target?: string;
    }>;
  };
}

// ===== 模块配置类型 =====

/**
 * 模块配置
 */
export interface ModuleConfig {
  global: GlobalModuleConfig;
  discovery: ModuleDiscoveryConfig;
  loader: ModuleLoaderConfig;
  errorHandling: ErrorHandlingConfig;
  [key: string]: any; // Allow additional module-specific configs
}

/**
 * 全局模块配置
 */
export interface GlobalModuleConfig {
  basePath?: string;
  autoLoad?: boolean;
  preload?: string[];
  cache?: {
    enabled?: boolean;
    maxSize?: number;
    ttl?: number;
    cleanupInterval?: number;
  };
  validation?: {
    enabled?: boolean;
    strict?: boolean;
    schemaValidation?: boolean;
  };
}

/**
 * 模块发现配置
 */
export interface ModuleDiscoveryConfig {
  scanPaths?: string[];
  filePatterns?: string[];
  excludePatterns?: string[];
  recursive?: boolean;
  symlinks?: boolean;
}

/**
 * 模块加载器配置
 */
export interface ModuleLoaderConfig {
  caching?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  validation?: {
    enabled?: boolean;
    strict?: boolean;
  };
  fallback?: {
    enabled?: boolean;
    defaultModule?: string;
  };
}

/**
 * 错误处理配置
 */
export interface ErrorHandlingConfig {
  enabled?: boolean;
  globalHandler?: boolean;
  logErrors?: boolean;
  reportErrors?: boolean;
  recovery?: {
    enabled?: boolean;
    maxAttempts?: number;
    backoffStrategy?: 'exponential' | 'linear' | 'fixed';
  };
}

// ===== 全局配置类型 =====

/**
 * 全局配置
 */
export interface GlobalConfig {
  environment: 'development' | 'staging' | 'production';
  paths: PathConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  plugins?: PluginConfig;
  network?: NetworkConfig;
  storage?: StorageConfig;
}

/**
 * 路径配置
 */
export interface PathConfig {
  config?: string;
  logs?: string;
  cache?: string;
  temp?: string;
  modules?: string;
  data?: string;
  debug?: string;
}

/**
 * 性能配置
 */
export interface PerformanceConfig {
  enabled?: boolean;
  metrics?: {
    enabled?: boolean;
    collectors?: Array<'memory' | 'cpu' | 'io' | 'network'>;
    exportInterval?: number;
  };
  optimization?: {
    cacheEnabled?: boolean;
    compressionEnabled?: boolean;
    minificationEnabled?: boolean;
  };
}

/**
 * 安全配置
 */
export interface SecurityConfig {
  enabled?: boolean;
  encryption?: {
    enabled?: boolean;
    algorithm?: string;
    keyRotation?: boolean;
  };
  authentication?: {
    enabled?: boolean;
    providers?: string[];
    requireAuth?: boolean;
  };
  authorization?: {
    enabled?: boolean;
    roles?: string[];
    permissions?: string[];
  };
}

/**
 * 插件配置
 */
export interface PluginConfig {
  enabled?: boolean;
  directory?: string;
  autoLoad?: boolean;
  whitelist?: string[];
  blacklist?: string[];
}

/**
 * 网络配置
 */
export interface NetworkConfig {
  timeout?: number;
  retries?: number;
  userAgent?: string;
  proxy?: {
    enabled?: boolean;
    host?: string;
    port?: number;
    auth?: {
      username?: string;
      password?: string;
    };
  };
}

/**
 * 存储配置
 */
export interface StorageConfig {
  provider?: 'filesystem' | 'database' | 'redis' | 's3';
  connection?: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
  };
  options?: Record<string, any>;
}

// ===== Zod Schema定义 =====

export const unifiedConfigSchema = z.object({
  rcc: z.object({
    port: z.number().int().min(1024).max(65535).optional(),
    server: z
      .object({
        port: z.number().int().min(1024).max(65535).optional(),
        host: z.string().optional(),
        protocol: z.enum(['http', 'https']).optional(),
        cors: z
          .object({
            enabled: z.boolean().optional(),
            origins: z.array(z.string()).optional(),
            credentials: z.boolean().optional(),
            methods: z.array(z.string()).optional(),
            headers: z.array(z.string()).optional(),
          })
          .optional(),
        compression: z.boolean().optional(),
        timeout: z.number().positive().optional(),
        bodyLimit: z.union([z.number(), z.string()]).optional(),
        rateLimiting: z
          .object({
            enabled: z.boolean().optional(),
            windowMs: z.number().positive().optional(),
            maxRequests: z.number().positive().optional(),
            skipSuccessfulRequests: z.boolean().optional(),
            skipFailedRequests: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
    providers: z.record(z.string(), z.any()),
    dynamicRouting: z.record(z.string(), z.any()),
    pipeline: z
      .object({
        enabled: z.boolean().optional(),
        modules: z.array(z.any()).optional(),
        transformers: z.array(z.any()).optional(),
        filters: z.array(z.any()).optional(),
        routing: z
          .object({
            strategy: z.enum(['round-robin', 'least-connections', 'weighted', 'custom']).optional(),
            rules: z.array(z.any()).optional(),
          })
          .optional(),
      })
      .optional(),
    debugging: z
      .object({
        enabled: z.boolean().optional(),
        outputDirectory: z.string().optional(),
        includeTimestamp: z.boolean().optional(),
        maxEntriesPerFile: z.number().positive().optional(),
        level: z.enum(['trace', 'debug', 'info', 'warn', 'error']).optional(),
        trackDataFlow: z.boolean().optional(),
        enableFileLogging: z.boolean().optional(),
      })
      .optional(),
    monitoring: z
      .object({
        enabled: z.boolean().optional(),
        detailedMetrics: z.boolean().optional(),
        requestTracing: z.boolean().optional(),
        performanceMonitoring: z.boolean().optional(),
      })
      .optional(),
    security: z
      .object({
        enabled: z.boolean().optional(),
        encryption: z
          .object({
            enabled: z.boolean().optional(),
            algorithm: z.string().optional(),
            keyRotation: z.boolean().optional(),
          })
          .optional(),
        authentication: z
          .object({
            enabled: z.boolean().optional(),
            providers: z.array(z.string()).optional(),
            requireAuth: z.boolean().optional(),
          })
          .optional(),
        authorization: z
          .object({
            enabled: z.boolean().optional(),
            roles: z.array(z.string()).optional(),
            permissions: z.array(z.string()).optional(),
          })
          .optional(),
      })
      .optional(),
  }),
  modules: z.object({
    global: z
      .object({
        basePath: z.string().optional(),
        autoLoad: z.boolean().optional(),
        preload: z.array(z.string()).optional(),
        cache: z
          .object({
            enabled: z.boolean().optional(),
            maxSize: z.number().positive().optional(),
            ttl: z.number().positive().optional(),
            cleanupInterval: z.number().positive().optional(),
          })
          .optional(),
        validation: z
          .object({
            enabled: z.boolean().optional(),
            strict: z.boolean().optional(),
            schemaValidation: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
    discovery: z
      .object({
        scanPaths: z.array(z.string()).optional(),
        filePatterns: z.array(z.string()).optional(),
        excludePatterns: z.array(z.string()).optional(),
        recursive: z.boolean().optional(),
        symlinks: z.boolean().optional(),
      })
      .optional(),
    loader: z
      .object({
        caching: z.boolean().optional(),
        maxRetries: z.number().int().min(0).optional(),
        retryDelay: z.number().positive().optional(),
        validation: z
          .object({
            enabled: z.boolean().optional(),
            strict: z.boolean().optional(),
          })
          .optional(),
        fallback: z
          .object({
            enabled: z.boolean().optional(),
            defaultModule: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    errorHandling: z
      .object({
        enabled: z.boolean().optional(),
        globalHandler: z.boolean().optional(),
        logErrors: z.boolean().optional(),
        reportErrors: z.boolean().optional(),
        recovery: z
          .object({
            enabled: z.boolean().optional(),
            maxAttempts: z.number().int().min(1).optional(),
            backoffStrategy: z.enum(['exponential', 'linear', 'fixed']).optional(),
          })
          .optional(),
      })
      .optional(),
  }),
  pipeline: z.object({
    enabled: z.boolean().optional(),
    modules: z
      .array(
        z.object({
          id: z.string(),
          type: z.string(),
          config: z.record(z.string(), z.any()).optional(),
          enabled: z.boolean().optional(),
        })
      )
      .optional(),
    transformers: z
      .array(
        z.object({
          id: z.string(),
          type: z.enum(['input', 'output', 'both']),
          config: z.record(z.string(), z.any()).optional(),
          priority: z.number().int().optional(),
        })
      )
      .optional(),
    filters: z
      .array(
        z.object({
          id: z.string(),
          type: z.enum(['request', 'response', 'both']),
          config: z.record(z.string(), z.any()).optional(),
          conditions: z.array(z.string()).optional(),
        })
      )
      .optional(),
    routing: z
      .object({
        strategy: z.enum(['round-robin', 'least-connections', 'weighted', 'custom']).optional(),
        rules: z
          .array(
            z.object({
              condition: z.string(),
              action: z.enum(['allow', 'deny', 'rewrite', 'redirect']),
              target: z.string().optional(),
            })
          )
          .optional(),
      })
      .optional(),
  }),
  global: z.object({
    environment: z.enum(['development', 'staging', 'production']),
    paths: z
      .object({
        config: z.string().optional(),
        logs: z.string().optional(),
        cache: z.string().optional(),
        temp: z.string().optional(),
        modules: z.string().optional(),
        data: z.string().optional(),
        debug: z.string().optional(),
      })
      .optional(),
    performance: z
      .object({
        enabled: z.boolean().optional(),
        metrics: z
          .object({
            enabled: z.boolean().optional(),
            collectors: z.array(z.enum(['memory', 'cpu', 'io', 'network'])).optional(),
            exportInterval: z.number().positive().optional(),
          })
          .optional(),
        optimization: z
          .object({
            cacheEnabled: z.boolean().optional(),
            compressionEnabled: z.boolean().optional(),
            minificationEnabled: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
    security: z
      .object({
        enabled: z.boolean().optional(),
        encryption: z
          .object({
            enabled: z.boolean().optional(),
            algorithm: z.string().optional(),
            keyRotation: z.boolean().optional(),
          })
          .optional(),
        authentication: z
          .object({
            enabled: z.boolean().optional(),
            providers: z.array(z.string()).optional(),
            requireAuth: z.boolean().optional(),
          })
          .optional(),
        authorization: z
          .object({
            enabled: z.boolean().optional(),
            roles: z.array(z.string()).optional(),
            permissions: z.array(z.string()).optional(),
          })
          .optional(),
      })
      .optional(),
    plugins: z
      .object({
        enabled: z.boolean().optional(),
        directory: z.string().optional(),
        autoLoad: z.boolean().optional(),
        whitelist: z.array(z.string()).optional(),
        blacklist: z.array(z.string()).optional(),
      })
      .optional(),
    network: z
      .object({
        timeout: z.number().positive().optional(),
        retries: z.number().int().min(0).optional(),
        userAgent: z.string().optional(),
        proxy: z
          .object({
            enabled: z.boolean().optional(),
            host: z.string().optional(),
            port: z.number().int().min(1).max(65535).optional(),
            auth: z
              .object({
                username: z.string().optional(),
                password: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .optional(),
    storage: z
      .object({
        provider: z.enum(['filesystem', 'database', 'redis', 's3']).optional(),
        connection: z
          .object({
            host: z.string().optional(),
            port: z.number().int().optional(),
            database: z.string().optional(),
            username: z.string().optional(),
            password: z.string().optional(),
          })
          .optional(),
        options: z.record(z.string(), z.any()).optional(),
      })
      .optional(),
  }),
});

type ConfigErrors = z.inferFlattenedErrors<typeof unifiedConfigSchema>;

// ===== 配置文件名常量 =====

export const CONFIG_FILE_NAMES = {
  DEFAULT: 'rcc-config.json',
  DEVELOPMENT: 'rcc-config.dev.json',
  STAGING: 'rcc-config.staging.json',
  PRODUCTION: 'rcc-config.prod.json',
  LOCAL: 'rcc-config.local.json',
  USER: '.rcc-config.json',
  DOCKER: 'rcc-config.docker.json',
} as const;

export const CONFIG_SEARCH_PATHS = [
  process.cwd(),
  '/etc/rcc',
  '/usr/local/etc/rcc',
  process.env['HOME'] || '',
  process.env['USERPROFILE'] || '',
];

// 类型导出
export type { ConfigErrors };
export type UnifiedConfigType = z.infer<typeof unifiedConfigSchema>;
