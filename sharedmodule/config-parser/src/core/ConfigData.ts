/**
 * 简化的配置数据结构
 * 
 * 用于配置模块的核心数据结构，只包含必要的配置信息
 */

/**
 * 供应商配置
 */
export interface ProviderConfig {
  /** 供应商ID */
  id: string;
  /** 供应商名称 */
  name: string;
  /** 供应商类型 */
  type: string;
  /** API端点 */
  endpoint?: string;
  /** 可用模型 */
  models: Record<string, ModelConfig>;
  /** 认证信息 */
  auth: {
    type: string;
    keys: string[];
  };
}

/**
 * 模型配置
 */
export interface ModelConfig {
  /** 模型ID */
  id: string;
  /** 模型名称 */
  name: string;
  /** 上下文长度 */
  contextLength?: number;
  /** 是否支持函数调用 */
  supportsFunctions?: boolean;
}

/**
 * 动态路由目标配置
 */
export interface DynamicRoutingTarget {
  /** 目标供应商ID */
  providerId: string;
  /** 目标模型ID */
  modelId: string;
  /** 密钥索引 */
  keyIndex: number;
}

/**
 * 动态路由配置
 */
export interface DynamicRoutingConfig {
  /** 路由ID */
  id: string;
  /** 路由名称 */
  name: string;
  /** 目标配置列表 */
  targets: DynamicRoutingTarget[];
  /** 是否启用 */
  enabled: boolean;
  /** 优先级 */
  priority: number;
  /** 权重 */
  weight?: number;
}

/**
 * 配置数据结构
 */
export interface ConfigData {
  /** 配置版本 */
  version: string;
  /** 供应商配置 */
  providers: Record<string, ProviderConfig>;
  /** 动态路由配置 */
  dynamicRouting: Record<string, DynamicRoutingConfig>;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * Configuration source definition
 */
export interface ConfigSource {
  /**
   * Source type
   */
  type: 'file' | 'environment' | 'remote' | 'database' | 'memory';
  
  /**
   * Source path or identifier
   */
  path?: string;
  
  /**
   * Source URL for remote sources
   */
  url?: string;
  
  /**
   * Configuration format
   */
  format?: 'json' | 'yaml' | 'yml' | 'toml' | 'ini' | 'env';
  
  /**
   * Source-specific options
   */
  options?: Record<string, any>;
  
  /**
   * Headers for remote sources
   */
  headers?: Record<string, string>;
  
  /**
   * Authentication information
   */
  auth?: ConfigSourceAuth;
  
  /**
   * Whether this source should be watched for changes
   */
  watch?: boolean;
  
  /**
   * Priority for merge operations (higher = takes precedence)
   */
  priority?: number;
}

/**
 * Authentication for configuration sources
 */
export interface ConfigSourceAuth {
  /**
   * Authentication type
   */
  type: 'bearer' | 'basic' | 'api-key' | 'oauth2';
  
  /**
   * Authentication token
   */
  token?: string;
  
  /**
   * Username for basic auth
   */
  username?: string;
  
  /**
   * Password for basic auth
   */
  password?: string;
  
  /**
   * API key value
   */
  apiKey?: string;
  
  /**
   * API key header name
   */
  apiKeyHeader?: string;
}

/**
 * Configuration schema
 */
export interface ConfigSchema {
  /**
   * Schema version
   */
  version: string;
  
  /**
   * Schema type (json-schema, ajv, etc.)
   */
  type: string;
  
  /**
   * The actual schema definition
   */
  definition: Record<string, any>;
  
  /**
   * Validation rules
   */
  rules?: ValidationRule[];
  
  /**
   * Constraint rules
   */
  constraints?: ConstraintRule[];
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  /**
   * Rule name/identifier
   */
  name: string;
  
  /**
   * Rule type
   */
  type: 'format' | 'range' | 'pattern' | 'custom' | 'dependency';
  
  /**
   * Rule parameters
   */
  params?: Record<string, any>;
  
  /**
   * Error message if validation fails
   */
  message: string;
  
  /**
   * Whether this rule is required or optional
   */
  required?: boolean;
}

/**
 * Constraint rule for business logic validation
 */
export interface ConstraintRule {
  /**
   * Constraint name
   */
  name: string;
  
  /**
   * Fields this constraint applies to
   */
  fields: string[];
  
  /**
   * Constraint expression or function
   */
  constraint: string | ((config: ConfigData) => boolean);
  
  /**
   * Error message if constraint is violated
   */
  message: string;
  
  /**
   * Constraint severity
   */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  /**
   * Whether validation passed
   */
  isValid: boolean;
  
  /**
   * Validation errors
   */
  errors: ValidationError[];
  
  /**
   * Validation warnings
   */
  warnings: ValidationWarning[];
  
  /**
   * Validation metadata
   */
  metadata: ValidationMetadata;
}

/**
 * Validation error details
 */
export interface ValidationError {
  /**
   * Error code
   */
  code: string;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Field path where error occurred
   */
  path: string;
  
  /**
   * Expected value or format
   */
  expected?: any;
  
  /**
   * Actual value that caused the error
   */
  actual?: any;
  
  /**
   * Validation rule that failed
   */
  rule?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  /**
   * Warning code
   */
  code: string;
  
  /**
   * Warning message
   */
  message: string;
  
  /**
   * Field path where warning occurred
   */
  path: string;
  
  /**
   * Suggested value or action
   */
  suggestion?: any;
}

/**
 * Validation metadata
 */
export interface ValidationMetadata {
  /**
   * Validation timestamp
   */
  timestamp: string;
  
  /**
   * Validation duration in milliseconds
   */
  duration: number;
  
  /**
   * Schema version used for validation
   */
  schemaVersion?: string;
  
  /**
   * Validator version
   */
  validatorVersion?: string;
  
  /**
   * Additional validation statistics
   */
  statistics?: Record<string, any>;
}

/**
 * Configuration persistence options
 */
export interface ConfigPersistenceOptions {
  /**
   * Storage type
   */
  type: 'file' | 'database' | 'memory' | 'cloud';
  
  /**
   * Target path or identifier
   */
  path?: string;
  
  /**
   * File format for file storage
   */
  format?: 'json' | 'yaml' | 'toml';
  
  /**
   * Whether to validate before saving
   */
  validate?: boolean;
  
  /**
   * Whether to create backups
   */
  backup?: boolean;
  
  /**
   * Backup options
   */
  backupOptions?: BackupOptions;
  
  /**
   * Encryption settings
   */
  encryption?: EncryptionOptions;
  
  /**
   * Versioning options
   */
  versioning?: VersioningOptions;
  
  /**
   * Compression settings
   */
  compression?: CompressionOptions;
}

/**
 * Backup configuration options
 */
export interface BackupOptions {
  /**
   * Whether backups are enabled
   */
  enabled: boolean;
  
  /**
   * Maximum number of backups to keep
   */
  maxCount?: number;
  
  /**
   * Backup directory
   */
  directory?: string;
  
  /**
   * Backup naming pattern
   */
  namingPattern?: string;
  
  /**
   * Whether to compress backups
   */
  compress?: boolean;
  
  /**
   * Automatic cleanup of old backups
   */
  autoCleanup?: boolean;
}

/**
 * Encryption configuration options
 */
export interface EncryptionOptions {
  /**
   * Whether encryption is enabled
   */
  enabled: boolean;
  
  /**
   * Encryption algorithm
   */
  algorithm?: string;
  
  /**
   * Encryption key
   */
  key?: string;
  
  /**
   * Key derivation function options
   */
  keyDerivation?: KeyDerivationOptions;
  
  /**
   * Fields to encrypt (if not encrypting entire config)
   */
  fields?: string[];
}

/**
 * Key derivation options for encryption
 */
export interface KeyDerivationOptions {
  /**
   * Salt for key derivation
   */
  salt?: string;
  
  /**
   * Number of iterations
   */
  iterations?: number;
  
  /**
   * Key length
   */
  keyLength?: number;
}

/**
 * Versioning configuration options
 */
export interface VersioningOptions {
  /**
   * Whether versioning is enabled
   */
  enabled: boolean;
  
  /**
   * Maximum number of versions to keep
   */
  maxVersions?: number;
  
  /**
   * Version storage directory
   */
  directory?: string;
  
  /**
   * Automatic cleanup of old versions
   */
  autoCleanup?: boolean;
}

/**
 * Compression configuration options
 */
export interface CompressionOptions {
  /**
   * Whether compression is enabled
   */
  enabled: boolean;
  
  /**
   * Compression algorithm
   */
  algorithm?: 'gzip' | 'deflate' | 'brotli';
  
  /**
   * Compression level (1-9)
   */
  level?: number;
}

/**
 * Configuration change event data
 */
export interface ConfigChangeEvent {
  /**
   * Type of change
   */
  type: 'created' | 'updated' | 'deleted' | 'renamed';

  /**
   * Configuration path that changed
   */
  path: string;

  /**
   * Old value (for updates and deletes)
   */
  oldValue?: any;

  /**
   * New value (for creates and updates)
   */
  newValue?: any;

  /**
   * Timestamp of the change
   */
  timestamp: string;

  /**
   * Source of the change
   */
  source?: string;

  /**
   * Additional change metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Server Module Wrapper - HTTP server configuration only
 *
 * Transforms ConfigData into ServerModule-compatible format
 * Contains only HTTP server configuration, no dynamic routing information
 */
export interface ServerWrapper {
  /** Server port */
  port: number;
  /** Server host */
  host: string;
  /** CORS configuration */
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  /** Compression enabled */
  compression: boolean;
  /** Helmet security enabled */
  helmet: boolean;
  /** Rate limiting configuration */
  rateLimit: {
    windowMs: number;
    max: number;
  };
  /** Request timeout */
  timeout: number;
  /** Body size limit */
  bodyLimit: string;
  /** Pipeline integration configuration */
  pipeline?: {
    enabled: boolean;
    unifiedErrorHandling: boolean;
    unifiedMonitoring: boolean;
    errorMapping: Record<string, string>;
  };
}

/**
 * Module Configuration for Pipeline Wrapper
 */
export interface ModuleConfig {
  /** Module ID */
  id: string;
  /** Module type */
  type: string;
  /** Module-specific configuration */
  config?: Record<string, any>;
  /** Whether module is enabled */
  enabled?: boolean;
  /** Module priority */
  priority?: number;
}

/**
 * Routing Configuration for Pipeline Wrapper
 */
export interface RoutingConfig {
  /** Routing strategy */
  strategy: 'round-robin' | 'least-connections' | 'weighted' | 'custom';
  /** Routing rules */
  rules?: Array<{
    condition: string;
    action: 'allow' | 'deny' | 'rewrite' | 'redirect';
    target?: string;
  }>;
  /** Fallback strategy */
  fallbackStrategy: 'first-available' | 'round-robin' | 'weighted';
}

/**
 * Pipeline Module Wrapper - Dynamic routing and execution configuration
 *
 * Transforms ConfigData into PipelineAssembler-compatible format
 * Contains dynamic routing tables and module configurations
 */
export interface PipelineWrapper {
  /** Dynamic routing configurations */
  dynamicRouting: DynamicRoutingConfig[];
  /** Module configurations */
  modules: ModuleConfig[];
  /** Routing configuration */
  routing: RoutingConfig;
  /** Pipeline metadata */
  metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
    providerCount: number;
    routingConfigCount: number;
  };
}