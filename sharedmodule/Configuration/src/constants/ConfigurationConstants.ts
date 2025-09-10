/**
 * Configuration Module Constants
 * 
 * This file contains all constants used by the Configuration module.
 * Following RCC anti-hardcoding policy, all configuration values
 * are centralized here.
 */

/**
 * Configuration System Constants
 */
export const CONFIGURATION_SYSTEM_CONSTANTS = {
  // Module Information
  MODULE_TYPE: 'configuration-system',
  MODULE_VERSION: '1.0.0',
  MODULE_NAME: 'ConfigurationSystem',
  MODULE_DESCRIPTION: 'Central configuration management system',

  // Default Configuration
  DEFAULT_CONFIG_FILE: 'config.json',
  DEFAULT_CONFIG_DIRECTORY: './config',
  DEFAULT_BACKUP_DIRECTORY: './config/backups',
  DEFAULT_SCHEMA_FILE: 'config-schema.json',

  // Validation Constants
  MAX_CONFIG_SIZE_MB: 10,
  MAX_NESTING_DEPTH: 10,
  MAX_ARRAY_LENGTH: 1000,
  MAX_STRING_LENGTH: 10000,

  // Timeouts and Intervals
  DEFAULT_TIMEOUT_MS: 30000,
  CONFIG_WATCH_DEBOUNCE_MS: 1000,
  BACKUP_INTERVAL_MS: 3600000, // 1 hour
  VALIDATION_TIMEOUT_MS: 5000,

  // Encryption Constants
  DEFAULT_ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  KEY_DERIVATION_ITERATIONS: 100000,
  IV_LENGTH: 16,
  TAG_LENGTH: 16,

  // Message Types
  MESSAGE_TYPES: {
    CONFIG_LOADED: 'config:loaded',
    CONFIG_SAVED: 'config:saved',
    CONFIG_VALIDATED: 'config:validated',
    CONFIG_CHANGED: 'config:changed',
    CONFIG_ERROR: 'config:error',
    VALIDATION_FAILED: 'config:validation-failed',
    BACKUP_CREATED: 'config:backup-created',
    ENCRYPTION_ENABLED: 'config:encryption-enabled'
  },

  // Error Codes
  ERROR_CODES: {
    INVALID_CONFIG_FORMAT: 'CFG_E001',
    VALIDATION_FAILED: 'CFG_E002',
    FILE_NOT_FOUND: 'CFG_E003',
    PERMISSION_DENIED: 'CFG_E004',
    ENCRYPTION_FAILED: 'CFG_E005',
    DECRYPTION_FAILED: 'CFG_E006',
    BACKUP_FAILED: 'CFG_E007',
    SCHEMA_INVALID: 'CFG_E008',
    SIZE_LIMIT_EXCEEDED: 'CFG_E009',
    TIMEOUT_EXCEEDED: 'CFG_E010',
    INITIALIZATION_FAILED: 'CFG_E011',
    CONFIG_NOT_LOADED: 'CFG_E012',
    CONFIG_UPDATE_FAILED: 'CFG_E013',
    WATCH_SETUP_FAILED: 'CFG_E014',
    UNSUPPORTED_FORMAT: 'CFG_E015',
    EXPORT_FAILED: 'CFG_E016',
    IMPORT_FAILED: 'CFG_E017',
    DESTRUCTION_FAILED: 'CFG_E018'
  }
} as const;

/**
 * Config Loader Module Constants
 */
export const CONFIG_LOADER_CONSTANTS = {
  // Module Information
  MODULE_TYPE: 'config-loader',
  MODULE_NAME: 'ConfigLoaderModule',
  MODULE_DESCRIPTION: 'Loads configuration from various sources',

  // Supported Formats
  SUPPORTED_FORMATS: ['json', 'yaml', 'yml', 'toml', 'ini', 'env'] as const,

  // Source Types
  SOURCE_TYPES: {
    FILE: 'file',
    ENVIRONMENT: 'environment',
    REMOTE: 'remote',
    DATABASE: 'database',
    MEMORY: 'memory'
  },

  // Default Settings
  DEFAULT_ENCODING: 'utf8',
  DEFAULT_ENV_PREFIX: 'APP_',
  DEFAULT_MERGE_STRATEGY: 'deep',

  // HTTP Client Settings
  HTTP_TIMEOUT_MS: 15000,
  HTTP_RETRY_COUNT: 3,
  HTTP_RETRY_DELAY_MS: 1000,

  // Cache Settings
  CACHE_TTL_MS: 300000, // 5 minutes
  MAX_CACHE_SIZE: 50,

  // File Watching
  WATCH_DEBOUNCE_MS: 500,
  WATCH_PERSISTENCE_MS: 1000
} as const;

/**
 * Config UI Module Constants
 */
export const CONFIG_UI_CONSTANTS = {
  // Module Information
  MODULE_TYPE: 'config-ui',
  MODULE_NAME: 'ConfigUIModule',
  MODULE_DESCRIPTION: 'Provides user interface for configuration management',

  // UI Components
  COMPONENT_TYPES: {
    EDITOR: 'editor',
    VIEWER: 'viewer',
    WIZARD: 'wizard',
    VALIDATOR: 'validator',
    DIFF: 'diff'
  },

  // Editor Settings
  EDITOR_THEMES: ['light', 'dark', 'auto'] as const,
  EDITOR_LANGUAGES: ['json', 'yaml', 'toml'] as const,
  DEFAULT_EDITOR_THEME: 'auto',
  DEFAULT_EDITOR_LANGUAGE: 'json',

  // UI Layout
  DEFAULT_SIDEBAR_WIDTH: 300,
  DEFAULT_PANEL_HEIGHT: 400,
  MIN_EDITOR_WIDTH: 400,
  MIN_EDITOR_HEIGHT: 200,

  // Auto-save Settings
  AUTO_SAVE_DELAY_MS: 2000,
  AUTO_BACKUP_INTERVAL_MS: 60000, // 1 minute

  // UI Messages
  UI_MESSAGES: {
    LOADING: 'Loading configuration...',
    SAVING: 'Saving configuration...',
    VALIDATING: 'Validating configuration...',
    SAVED: 'Configuration saved successfully',
    VALIDATION_ERROR: 'Configuration validation failed',
    LOAD_ERROR: 'Failed to load configuration',
    SAVE_ERROR: 'Failed to save configuration'
  }
} as const;

/**
 * Config Persistence Module Constants
 */
export const CONFIG_PERSISTENCE_CONSTANTS = {
  // Module Information
  MODULE_TYPE: 'config-persistence',
  MODULE_NAME: 'ConfigPersistenceModule',
  MODULE_DESCRIPTION: 'Manages configuration data persistence',

  // Storage Types
  STORAGE_TYPES: {
    FILE_SYSTEM: 'filesystem',
    DATABASE: 'database',
    MEMORY: 'memory',
    CLOUD: 'cloud',
    ENCRYPTED: 'encrypted'
  },

  // File Operations
  FILE_PERMISSIONS: 0o600, // Read/write for owner only
  BACKUP_SUFFIX: '.backup',
  TEMP_SUFFIX: '.tmp',
  LOCK_SUFFIX: '.lock',

  // Backup Settings
  MAX_BACKUP_COUNT: 10,
  BACKUP_COMPRESSION: true,
  BACKUP_NAMING_PATTERN: 'YYYY-MM-DD_HH-mm-ss',

  // Database Settings
  CONNECTION_POOL_SIZE: 5,
  QUERY_TIMEOUT_MS: 10000,
  TRANSACTION_TIMEOUT_MS: 30000,

  // Cloud Storage
  CLOUD_TIMEOUT_MS: 30000,
  CLOUD_RETRY_COUNT: 3,
  CLOUD_CHUNK_SIZE: 1024 * 1024, // 1MB

  // Locking
  LOCK_TIMEOUT_MS: 5000,
  LOCK_RETRY_INTERVAL_MS: 100,
  LOCK_MAX_RETRIES: 50
} as const;

/**
 * Config Validator Module Constants
 */
export const CONFIG_VALIDATOR_CONSTANTS = {
  // Module Information
  MODULE_TYPE: 'config-validator',
  MODULE_NAME: 'ConfigValidatorModule',
  MODULE_DESCRIPTION: 'Validates configuration data integrity',

  // Validation Types
  VALIDATION_TYPES: {
    SCHEMA: 'schema',
    BUSINESS_RULES: 'business-rules',
    DEPENDENCIES: 'dependencies',
    SECURITY: 'security',
    PERFORMANCE: 'performance'
  },

  // Schema Formats
  SCHEMA_FORMATS: ['json-schema', 'ajv', 'joi', 'yup'] as const,
  DEFAULT_SCHEMA_FORMAT: 'json-schema',

  // Validation Levels
  VALIDATION_LEVELS: {
    STRICT: 'strict',
    NORMAL: 'normal',
    LOOSE: 'loose'
  },

  // Security Validation
  SECURITY_PATTERNS: {
    SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    XSS_PATTERN: /<script[^>]*>.*?<\/script>/gi,
    PATH_TRAVERSAL: /\.\.[\\/]/,
    COMMAND_INJECTION: /[;&|`$(){}[\]]/
  },

  // Performance Limits
  MAX_VALIDATION_TIME_MS: 5000,
  MAX_RECURSIVE_DEPTH: 20,
  MAX_PROPERTY_COUNT: 10000,

  // Default Rules
  DEFAULT_RULES: {
    REQUIRED_FIELDS: ['name', 'version'],
    FORBIDDEN_FIELDS: ['__proto__', 'constructor', 'prototype'],
    MAX_OBJECT_DEPTH: 10,
    MAX_ARRAY_SIZE: 1000
  }
} as const;

/**
 * Common Configuration Constants
 */
export const COMMON_CONSTANTS = {
  // Logging Levels
  LOG_LEVELS: {
    TRACE: 'trace',
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
  },

  // Event Types
  EVENT_TYPES: {
    MODULE_INITIALIZED: 'module:initialized',
    MODULE_CONFIGURED: 'module:configured',
    MODULE_DESTROYED: 'module:destroyed',
    CONNECTION_ESTABLISHED: 'connection:established',
    CONNECTION_CLOSED: 'connection:closed',
    DATA_RECEIVED: 'data:received',
    DATA_SENT: 'data:sent',
    ERROR_OCCURRED: 'error:occurred'
  },

  // Status Codes
  STATUS_CODES: {
    SUCCESS: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    SERVICE_UNAVAILABLE: 503
  },

  // Default Values
  DEFAULT_TIMEOUT: 30000,
  DEFAULT_RETRY_COUNT: 3,
  DEFAULT_BATCH_SIZE: 100,
  DEFAULT_BUFFER_SIZE: 8192
} as const;

/**
 * Type definitions for constants
 */
export type ConfigurationSystemConstants = typeof CONFIGURATION_SYSTEM_CONSTANTS;
export type ConfigLoaderConstants = typeof CONFIG_LOADER_CONSTANTS;
export type ConfigUIConstants = typeof CONFIG_UI_CONSTANTS;
export type ConfigPersistenceConstants = typeof CONFIG_PERSISTENCE_CONSTANTS;
export type ConfigValidatorConstants = typeof CONFIG_VALIDATOR_CONSTANTS;
export type CommonConstants = typeof COMMON_CONSTANTS;