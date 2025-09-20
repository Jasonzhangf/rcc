import { z } from 'zod';
import {
  packageJsonSchema,
  filePathSchema,
  urlSchema,
  securityConfigSchema
} from './core.js';

/**
 * 授权配置模式
 */
export const authConfigSchema = z.object({
  type: z.enum(['none', 'apikey', 'oauth', 'bearer', 'basic', 'custom']),
  keys: z.array(z.string()).optional(),
  endpoints: z.object({
    token: z.string().optional(),
    refresh: z.string().optional(),
    revoke: z.string().optional()
  }).optional(),
  credentials: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional()
  }).optional(),
  scopes: z.array(z.string()).optional(),
  tokenExpiry: z.number().positive().optional(),
  refreshExpiry: z.number().positive().optional()
}).passthrough();

/**
 * 模型配置模式
 */
export const modelConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['chat', 'completion', 'embedding', 'moderation']).optional(),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().positive().optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stopSequences: z.array(z.string()).optional(),
  capabilities: z.array(z.enum(['chat', 'completion', 'function-calling', 'vision', 'audio'])).optional(),
  pricing: z.object({
    input: z.number().positive(),
    output: z.number().positive(),
    unit: z.enum(['token', 'character', 'request']).optional()
  }).optional()
}).passthrough();

/**
 * 提供程序配置模式
 */
export const providerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['openai', 'anthropic', 'google', 'azure', 'cohere', 'huggingface', 'local', 'custom']),
  enabled: z.boolean(),
  endpoint: urlSchema,
  models: z.record(modelConfigSchema).optional(),
  auth: authConfigSchema.optional(),
  timeout: z.number().positive().optional(),
  retryConfig: z.object({
    maxRetries: z.number().int().min(0).max(10).optional(),
    backoffMultiplier: z.number().positive().optional(),
    baseDelay: z.number().positive().optional(),
    maxDelay: z.number().positive().optional()
  }).optional(),
  rateLimiting: z.object({
    enabled: z.boolean().optional(),
    requestsPerSecond: z.number().positive().optional(),
    requestsPerMinute: z.number().positive().optional(),
    requestsPerHour: z.number().positive().optional()
  }).optional(),
  healthCheck: z.object({
    enabled: z.boolean().optional(),
    interval: z.number().positive().optional(),
    timeout: z.number().positive().optional(),
    endpoint: z.string().optional()
  }).optional()
}).passthrough();

/**
 * 虚拟模型目标配置模式
 */
export const virtualModelTargetSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  keyIndex: z.number().int().min(0).optional(),
  weight: z.number().positive().optional(),
  priority: z.number().int().min(1).optional(),
  enabled: z.boolean().optional(),
  conditions: z.object({
    timeRange: z.object({
      start: z.string().optional(), // HH:MM format
      end: z.string().optional(),   // HH:MM format
      timezone: z.string().optional()
    }).optional(),
    maxRequests: z.number().positive().optional(),
    costLimit: z.number().positive().optional()
  }).optional()
}).passthrough();

/**
 * 虚拟模型配置模式
 */
export const virtualModelConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  provider: z.string().optional(),
  endpoint: z.string().url().optional(),
  model: z.string(),
  capabilities: z.array(z.enum(['chat', 'completion', 'function-calling', 'vision', 'audio'])).optional(),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  routingRules: z.array(z.string()).optional(),
  targets: z.array(virtualModelTargetSchema).min(1, 'At least one target is required'),
  fallback: z.object({
    enabled: z.boolean().optional(),
    retryAfter: z.number().positive().optional(),
    maxRetries: z.number().int().min(0).optional()
  }).optional(),
  loadBalancing: z.object({
    strategy: z.enum(['round-robin', 'least-connections', 'weighted', 'priority']).optional(),
    weights: z.record(z.number().positive()).optional()
  }).optional()
}).passthrough();

/**
 * 流水线配置模式
 */
export const pipelineConfigSchema = z.object({
  enabled: z.boolean().optional(),
  modules: z.array(z.object({
    id: z.string(),
    type: z.string(),
    config: z.record(z.any()).optional(),
    enabled: z.boolean().optional()
  })).optional(),
  transformers: z.array(z.object({
    id: z.string(),
    type: z.enum(['input', 'output', 'both']),
    config: z.record(z.any()).optional(),
    priority: z.number().int().optional()
  })).optional(),
  filters: z.array(z.object({
    id: z.string(),
    type: z.enum(['request', 'response', 'both']),
    config: z.record(z.any()).optional(),
    conditions: z.array(z.string()).optional()
  })).optional(),
  routing: z.object({
    strategy: z.enum(['round-robin', 'least-connections', 'weighted', 'custom']).optional(),
    rules: z.array(z.object({
      condition: z.string(),
      action: z.enum(['allow', 'deny', 'rewrite', 'redirect']),
      target: z.string().optional()
    })).optional()
  }).optional()
}).passthrough();

/**
 * 调试配置模式
 */
export const debugConfigSchema = z.object({
  enabled: z.boolean().optional(),
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
  output: z.enum(['console', 'file', 'both']).optional(),
  format: z.enum(['text', 'json']).optional(),
  filters: z.array(z.string()).optional(),
  destinations: z.array(z.object({
    type: z.enum(['console', 'file', 'remote', 'elasticsearch']),
    config: z.record(z.any()).optional(),
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional()
  })).optional(),
  performance: z.object({
    enabled: z.boolean().optional(),
    trackMemory: z.boolean().optional(),
    trackCPU: z.boolean().optional(),
    samplingInterval: z.number().positive().optional()
  }).optional()
}).passthrough();

/**
 * RCC 主要配置模式 - 结合所有配置
 */
export const rccConfigSchema = z.object({
  // 基本配置
  version: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),

  // 服务器配置
  server: z.object({
    port: z.number().int().min(1024).max(65535).optional(),
    host: z.string().optional(),
    protocol: z.enum(['http', 'https']).optional(),
    cors: z.object({
      enabled: z.boolean().optional(),
      origins: z.array(z.string()).optional(),
      credentials: z.boolean().optional(),
      methods: z.array(z.string()).optional(),
      headers: z.array(z.string()).optional()
    }).optional(),
    compression: z.boolean().optional(),
    timeout: z.number().positive().optional(),
    bodyLimit: z.union([z.number(), z.string()]).optional(),
    rateLimiting: z.object({
      enabled: z.boolean().optional(),
      windowMs: z.number().positive().optional(),
      maxRequests: z.number().positive().optional(),
      skipSuccessfulRequests: z.boolean().optional(),
      skipFailedRequests: z.boolean().optional()
    }).optional()
  }).passthrough().optional(),

  // 提供程序配置
  providers: z.record(providerConfigSchema).optional(),

  // 虚拟模型配置
  virtualModels: z.record(virtualModelConfigSchema).optional(),

  // 流水线配置
  pipeline: pipelineConfigSchema.optional(),

  // 安全配置
  security: securityConfigSchema.optional(),

  // 调试配置
  debug: debugConfigSchema.optional(),

  // 性能配置
  performance: z.object({
    enabled: z.boolean().optional(),
    metrics: z.object({
      enabled: z.boolean().optional(),
      collectors: z.array(z.enum(['memory', 'cpu', 'io', 'network'])).optional(),
      exportInterval: z.number().positive().optional()
    }).optional(),
    optimization: z.object({
      cacheEnabled: z.boolean().optional(),
      compressionEnabled: z.boolean().optional(),
      minificationEnabled: z.boolean().optional()
    }).optional()
  }).passthrough().optional(),

  // 监控配置
  monitoring: z.object({
    enabled: z.boolean().optional(),
    endpoints: z.array(z.object({
      name: z.string(),
      url: z.string().url(),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
      interval: z.number().positive().optional(),
      timeout: z.number().positive().optional(),
      conditions: z.array(z.string()).optional()
    })).optional(),
    alerts: z.array(z.object({
      name: z.string(),
      condition: z.string(),
      severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
      channels: z.array(z.enum(['email', 'slack', 'webhook', 'sms'])).optional()
    })).optional()
  }).passthrough().optional(),

  // 文件路径配置
  paths: z.object({
    config: z.string().optional(),
    logs: z.string().optional(),
    cache: z.string().optional(),
    temp: z.string().optional(),
    modules: z.string().optional()
  }).optional(),

  // 插件系统配置
  plugins: z.object({
    enabled: z.boolean().optional(),
    directory: z.string().optional(),
    autoLoad: z.boolean().optional(),
    whitelist: z.array(z.string()).optional(),
    blacklist: z.array(z.string()).optional()
  }).optional()
}).passthrough();

// ===== 配置映射模式 =====

/**
 * 环境变量映射模式
 */
export const envMappingSchema = z.object({
  configPath: z.string(),
  envKey: z.string(),
  configKey: z.string(),
  required: z.boolean().optional(),
  default: z.string().optional(),
  transform: z.enum(['string', 'number', 'boolean', 'json']).optional(),
  validation: z.string().optional() // 可选的正则表达式验证
}).passthrough();

/**
 * 配置验证结果模式
 */
export const configValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({
    path: z.string(),
    message: z.string(),
    code: z.string().optional()
  })),
  warnings: z.array(z.object({
    path: z.string(),
    message: z.string(),
    suggestion: z.string().optional()
  })),
  suggestions: z.array(z.object({
    path: z.string(),
    suggestion: z.string(),
    reason: z.string().optional()
  })).optional()
}).passthrough();

// ===== 类型导出 =====
export type AuthConfig = z.infer<typeof authConfigSchema>;
export type ModelConfig = z.infer<typeof modelConfigSchema>;
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type VirtualModelTarget = z.infer<typeof virtualModelTargetSchema>;
export type VirtualModelConfig = z.infer<typeof virtualModelConfigSchema>;
export type PipelineConfig = z.infer<typeof pipelineConfigSchema>;
export type DebugConfig = z.infer<typeof debugConfigSchema>;
export type RCCConfig = z.infer<typeof rccConfigSchema>;
export type EnvMapping = z.infer<typeof envMappingSchema>;
export type ConfigValidationResult = z.infer<typeof configValidationResultSchema>;