/**
 * Config Loader Module Constants
 * All hardcoded values for the Configuration Loader Module
 */

export const CONFIG_LOADER_CONSTANTS = {
  // Module Information
  MODULE_NAME: 'Configuration Loader Module',
  MODULE_VERSION: '1.0.0',
  MODULE_DESCRIPTION: 'BaseModule-based configuration file loading and parsing with JSON5 support',
  MODULE_TYPE: 'config-loader',
  
  // File System Operations
  FILE_ENCODING: 'utf8' as BufferEncoding,
  DEFAULT_WATCH_DEBOUNCE_MS: 100,
  DEFAULT_FILE_READ_TIMEOUT_MS: 5000,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  
  // JSON5 Parser Settings
  JSON5_PARSE_OPTIONS: {
    reviver: null,
    allowTrailingComma: true,
    allowSingleQuotedStrings: true,
    allowIdentifierNames: true,
    allowNumericKeysAsIdentifiers: true
  },
  
  // Environment Variable Interpolation
  ENV_VAR_PATTERNS: {
    DOLLAR_BRACE: /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g,
    DOLLAR_DIRECT: /\$([A-Za-z_][A-Za-z0-9_]*)/g
  },
  ENV_VAR_MAX_RECURSION_DEPTH: 10,
  ENV_VAR_DEFAULT_VALUE_SEPARATOR: ':-',
  
  // File Watching
  WATCH_OPTIONS: {
    persistent: true,
    recursive: false,
    encoding: 'utf8' as BufferEncoding
  },
  WATCH_EVENT_TYPES: {
    CREATED: 'created',
    MODIFIED: 'modified',
    DELETED: 'deleted',
    RENAMED: 'renamed'
  } as const,
  
  // Configuration Merging
  MERGE_STRATEGIES: {
    REPLACE: 'replace',
    MERGE_DEEP: 'merge-deep',
    MERGE_SHALLOW: 'merge-shallow',
    CUSTOM: 'custom'
  } as const,
  DEFAULT_MERGE_STRATEGY: 'merge-deep',
  MAX_MERGE_DEPTH: 20,
  
  // Validation Rules
  VALIDATION_RULES: {
    FILE_PATH: {
      FIELD: 'filePath',
      TYPE: 'string',
      MESSAGE: 'File path is required and must be a string'
    },
    CONFIG_DATA: {
      FIELD: 'configData',
      TYPE: 'object',
      MESSAGE: 'Configuration data must be an object'
    },
    MERGE_OPTIONS: {
      FIELD: 'mergeOptions',
      TYPE: 'object',
      MESSAGE: 'Merge options must be an object'
    }
  } as const,
  
  // Performance Limits
  MAX_CONCURRENT_OPERATIONS: 5,
  OPERATION_TIMEOUT_MS: 30000,
  CACHE_TTL_MS: 300000, // 5 minutes
  MAX_CACHED_CONFIGS: 50,
  
  // Error Messages
  ERROR_MESSAGES: {
    FILE_NOT_FOUND: 'Configuration file not found',
    FILE_TOO_LARGE: 'Configuration file exceeds maximum size limit',
    PARSE_ERROR: 'Failed to parse configuration file',
    INVALID_JSON5: 'Invalid JSON5 syntax in configuration file',
    ENV_VAR_NOT_FOUND: 'Environment variable not found',
    ENV_VAR_CIRCULAR_REFERENCE: 'Circular reference detected in environment variable interpolation',
    WATCH_FAILED: 'Failed to set up file watching',
    MERGE_FAILED: 'Failed to merge configuration objects',
    VALIDATION_FAILED: 'Configuration validation failed',
    TIMEOUT_EXCEEDED: 'Operation timeout exceeded',
    MAX_OPERATIONS_EXCEEDED: 'Maximum concurrent operations exceeded'
  } as const,
  
  // Success Messages
  SUCCESS_MESSAGES: {
    FILE_LOADED: 'Configuration file loaded successfully',
    CONFIG_MERGED: 'Configurations merged successfully',
    WATCH_STARTED: 'File watching started successfully',
    WATCH_STOPPED: 'File watching stopped successfully',
    ENV_VARS_INTERPOLATED: 'Environment variables interpolated successfully'
  } as const,
  
  // Metadata Keys
  METADATA_KEYS: {
    FILE_PATH: 'filePath',
    FILE_SIZE: 'fileSize',
    LOAD_TIME: 'loadTime',
    PARSE_TIME: 'parseTime',
    ENVIRONMENT_VARIABLES: 'environmentVariables',
    SYNTAX_FEATURES: 'syntaxFeatures',
    ENCODING: 'encoding',
    WATCH_STATUS: 'watchStatus',
    MERGE_STRATEGY: 'mergeStrategy'
  } as const,
  
  // Connection Types
  CONNECTION_TYPES: {
    CONFIG_OUTPUT: 'config-output',
    STATUS_OUTPUT: 'status-output',
    ERROR_OUTPUT: 'error-output',
    WATCH_OUTPUT: 'watch-output'
  } as const,
  
  // Data Transfer Types
  DATA_TRANSFER_TYPES: {
    CONFIG_DATA: 'config-data',
    FILE_CHANGE_EVENT: 'file-change-event',
    ERROR_EVENT: 'error-event',
    STATUS_UPDATE: 'status-update'
  } as const,
  
  // Regular Expressions for Validation
  REGEX_PATTERNS: {
    VALID_FILE_PATH: /^[^<>:"|?*\x00-\x1f]+$/,
    ENV_VAR_NAME: /^[A-Za-z_][A-Za-z0-9_]*$/,
    JSON5_COMMENT: /\/\*[\s\S]*?\*\/|\/\/.*$/gm
  } as const,
  
  // Default Values
  DEFAULT_VALUES: {
    LOAD_OPTIONS: {
      watchForChanges: false,
      environmentOverrides: {},
      validationLevel: 'basic' as const,
      encoding: 'utf8' as BufferEncoding,
      timeout: 5000
    },
    INTERPOLATION_OPTIONS: {
      throwOnMissing: false,
      defaultValues: {},
      allowedVariables: undefined,
      sanitizeValues: false
    },
    MERGE_OPTIONS: {
      strategy: 'merge-deep' as const,
      arrayHandling: 'replace' as const,
      conflictResolution: 'last-wins' as const
    }
  } as const
} as const;

// Type definitions for constants
export type WatchEventType = typeof CONFIG_LOADER_CONSTANTS.WATCH_EVENT_TYPES[keyof typeof CONFIG_LOADER_CONSTANTS.WATCH_EVENT_TYPES];
export type MergeStrategy = typeof CONFIG_LOADER_CONSTANTS.MERGE_STRATEGIES[keyof typeof CONFIG_LOADER_CONSTANTS.MERGE_STRATEGIES];
export type ConnectionType = typeof CONFIG_LOADER_CONSTANTS.CONNECTION_TYPES[keyof typeof CONFIG_LOADER_CONSTANTS.CONNECTION_TYPES];
export type DataTransferType = typeof CONFIG_LOADER_CONSTANTS.DATA_TRANSFER_TYPES[keyof typeof CONFIG_LOADER_CONSTANTS.DATA_TRANSFER_TYPES];