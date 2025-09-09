/**
 * Config Import/Export Manager Constants
 * 
 * All constants and default configurations for the Config Import/Export Manager.
 * Follows anti-hardcoding policy by centralizing all configuration values.
 */

import type { IExportOptions, IImportOptions, ITransformationRule } from '../interfaces/IConfigImportExportManager';

export const CONFIG_IMPORT_EXPORT_CONSTANTS = {
  // Module identification
  MODULE_NAME: 'ConfigImportExportManager',
  MODULE_VERSION: '1.0.0',
  
  // Default configuration
  DEFAULT_CONFIG: {
    BACKUP_DIRECTORY: './.rcc/backups',
    MAX_BACKUPS: 50,
    ENABLE_AUTO_BACKUP: true,
    AUTO_BACKUP_INTERVAL_MS: 86400000, // 24 hours
    ENABLE_COMPRESSION: true,
    COMPRESSION_LEVEL: 6, // gzip compression level
    ENABLE_VERSIONING: true,
    MAX_IMPORT_SIZE_MB: 100,
    ENABLE_ROLLBACK: true,
    ROLLBACK_RETENTION_DAYS: 7,
    DEFAULT_EXPORT_FORMAT: 'json',
    DEFAULT_MERGE_STRATEGY: 'merge',
    DEFAULT_CONFLICT_RESOLUTION: 'keep_existing',
  },
  
  // Supported formats
  SUPPORTED_FORMATS: {
    JSON: 'json',
    YAML: 'yaml', 
    TOML: 'toml',
  } as const,
  
  // Compression formats
  COMPRESSION_FORMATS: {
    GZIP: 'gzip',
    BROTLI: 'brotli',
  } as const,
  
  // Export/Import strategies
  MERGE_STRATEGIES: {
    OVERWRITE: 'overwrite',
    MERGE: 'merge',
    SKIP_EXISTING: 'skip_existing',
    INTERACTIVE: 'interactive',
  } as const,
  
  CONFLICT_RESOLUTION: {
    KEEP_EXISTING: 'keep_existing',
    USE_IMPORTED: 'use_imported',
    MERGE_FIELDS: 'merge_fields',
    PROMPT: 'prompt',
  } as const,
  
  // Default export options
  DEFAULT_EXPORT_OPTIONS: {
    include_providers: true,
    include_models: true,
    include_routes: true,
    include_blacklist: true,
    include_pool: true,
    include_virtual_categories: true,
    include_global_config: true,
    include_metrics: false,
    format: 'json',
    pretty_print: true,
    include_metadata: true,
    include_timestamps: true,
    include_version_info: true,
    mask_api_keys: true,
    exclude_sensitive_data: false,
    include_health_data: false,
    compress: false,
  } as IExportOptions,
  
  // Default import options
  DEFAULT_IMPORT_OPTIONS: {
    merge_strategy: 'merge',
    conflict_resolution: 'keep_existing',
    import_providers: true,
    import_models: true,
    import_routes: true,
    import_blacklist: true,
    import_pool: true,
    import_virtual_categories: true,
    import_global_config: true,
    import_metrics: false,
    validate_before_import: true,
    skip_validation_errors: false,
    auto_fix_issues: true,
    create_backup: true,
    apply_transformations: true,
    dry_run: false,
  } as IImportOptions,
  
  // Backup types
  BACKUP_TYPES: {
    MANUAL: 'manual',
    AUTOMATIC: 'automatic',
    PRE_IMPORT: 'pre_import',
  } as const,
  
  // Validation error types
  VALIDATION_ERROR_TYPES: {
    SCHEMA_VIOLATION: 'schema_violation',
    TYPE_MISMATCH: 'type_mismatch',
    REQUIRED_FIELD_MISSING: 'required_field_missing',
    INVALID_VALUE: 'invalid_value',
    DUPLICATE_ID: 'duplicate_id',
    INVALID_REFERENCE: 'invalid_reference',
    CIRCULAR_DEPENDENCY: 'circular_dependency',
  } as const,
  
  // Compatibility issue types
  COMPATIBILITY_ISSUE_TYPES: {
    VERSION_MISMATCH: 'version_mismatch',
    SCHEMA_CHANGE: 'schema_change',
    DEPRECATED_FIELD: 'deprecated_field',
    MISSING_FIELD: 'missing_field',
    TYPE_MISMATCH: 'type_mismatch',
  } as const,
  
  // Transformation types
  TRANSFORMATION_TYPES: {
    RENAME: 'rename',
    CONVERT_TYPE: 'convert_type',
    MERGE_FIELDS: 'merge_fields',
    SPLIT_FIELD: 'split_field',
    DEFAULT_VALUE: 'default_value',
    CUSTOM: 'custom',
  } as const,
  
  // Severity levels
  SEVERITY_LEVELS: {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
  } as const,
  
  // Impact levels
  IMPACT_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
  } as const,
  
  // File extensions
  FILE_EXTENSIONS: {
    JSON: '.json',
    YAML: '.yaml',
    YML: '.yml',
    TOML: '.toml',
    GZIP: '.gz',
    BROTLI: '.br',
  } as const,
  
  // Default transformation rules for version migrations
  DEFAULT_TRANSFORMATION_RULES: [
    {
      id: 'v1_to_v2_provider_auth_type',
      name: 'Provider Auth Type Migration',
      description: 'Migrate auth_type field from v1 to v2 format',
      source_version: '1.0.0',
      target_version: '2.0.0',
      field_path: 'providers.*.auth_type',
      transformation_type: 'convert_type',
      parameters: {
        value_mapping: {
          'api_key': 'api_key',
          'token': 'bearer_token',
          'oauth': 'oauth2'
        }
      },
      priority: 1,
    },
    {
      id: 'v1_to_v2_model_capabilities',
      name: 'Model Capabilities Structure',
      description: 'Convert model capabilities from array to object',
      source_version: '1.0.0',
      target_version: '2.0.0',
      field_path: 'providers.*.models.*.capabilities',
      transformation_type: 'custom',
      parameters: {
        custom_function: 'arrayToCapabilitiesObject'
      },
      priority: 2,
    }
  ] as Omit<ITransformationRule, 'id'>[],
  
  // Error messages
  ERRORS: {
    INVALID_FORMAT: 'Invalid configuration format',
    UNSUPPORTED_FORMAT: 'Unsupported file format',
    FILE_NOT_FOUND: 'Configuration file not found',
    FILE_TOO_LARGE: 'Configuration file exceeds maximum size limit',
    INVALID_JSON: 'Invalid JSON format',
    INVALID_YAML: 'Invalid YAML format',
    INVALID_TOML: 'Invalid TOML format',
    VALIDATION_FAILED: 'Configuration validation failed',
    BACKUP_FAILED: 'Failed to create backup',
    RESTORE_FAILED: 'Failed to restore configuration',
    IMPORT_FAILED: 'Configuration import failed',
    EXPORT_FAILED: 'Configuration export failed',
    INCOMPATIBLE_VERSION: 'Incompatible configuration version',
    TRANSFORMATION_FAILED: 'Configuration transformation failed',
    ROLLBACK_NOT_AVAILABLE: 'Rollback not available',
    TEMPLATE_NOT_FOUND: 'Configuration template not found',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for operation',
    NETWORK_ERROR: 'Network error during remote import',
    CORRUPTION_DETECTED: 'Configuration corruption detected',
  } as const,
  
  // Validation rules
  VALIDATION_RULES: {
    MAX_FILE_SIZE_MB: 100,
    MAX_PROVIDERS: 100,
    MAX_MODELS_PER_PROVIDER: 1000,
    MAX_ROUTES: 500,
    MAX_BLACKLIST_ENTRIES: 10000,
    MAX_POOL_ENTRIES: 1000,
    MAX_VIRTUAL_CATEGORIES: 50,
    MAX_BACKUP_COUNT: 100,
    MAX_TEMPLATE_COUNT: 50,
    MIN_BACKUP_INTERVAL_MS: 300000, // 5 minutes
    MAX_ROLLBACK_RETENTION_DAYS: 30,
  } as const,
  
  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    MAX_EXPORT_TIME_MS: 30000, // 30 seconds
    MAX_IMPORT_TIME_MS: 60000, // 1 minute
    MAX_VALIDATION_TIME_MS: 10000, // 10 seconds
    MAX_TRANSFORMATION_TIME_MS: 5000, // 5 seconds
    MAX_BACKUP_TIME_MS: 15000, // 15 seconds
    LARGE_CONFIG_THRESHOLD_MB: 10,
    WARNING_SIZE_THRESHOLD_MB: 50,
  } as const,
  
  // Template categories
  TEMPLATE_CATEGORIES: {
    BASIC: 'basic',
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TESTING: 'testing',
    CUSTOM: 'custom',
  } as const,
  
  // Built-in templates
  BUILT_IN_TEMPLATES: {
    EMPTY_CONFIG: {
      name: 'Empty Configuration',
      description: 'Minimal empty configuration template',
      category: 'basic',
    },
    SINGLE_PROVIDER: {
      name: 'Single Provider Setup',
      description: 'Template for single provider configuration',
      category: 'basic',
    },
    MULTI_PROVIDER: {
      name: 'Multi-Provider Setup', 
      description: 'Template for multiple provider configuration',
      category: 'development',
    },
    PRODUCTION_READY: {
      name: 'Production Ready',
      description: 'Production-ready configuration with monitoring',
      category: 'production',
    },
  } as const,
  
  // Checksum algorithms
  CHECKSUM_ALGORITHMS: {
    MD5: 'md5',
    SHA1: 'sha1',
    SHA256: 'sha256',
  } as const,
  
  // Default checksum algorithm
  DEFAULT_CHECKSUM_ALGORITHM: 'sha256' as const,
  
} as const;

// Type exports for constants
export type SupportedFormat = typeof CONFIG_IMPORT_EXPORT_CONSTANTS.SUPPORTED_FORMATS[keyof typeof CONFIG_IMPORT_EXPORT_CONSTANTS.SUPPORTED_FORMATS];
export type CompressionFormat = typeof CONFIG_IMPORT_EXPORT_CONSTANTS.COMPRESSION_FORMATS[keyof typeof CONFIG_IMPORT_EXPORT_CONSTANTS.COMPRESSION_FORMATS];
export type MergeStrategy = typeof CONFIG_IMPORT_EXPORT_CONSTANTS.MERGE_STRATEGIES[keyof typeof CONFIG_IMPORT_EXPORT_CONSTANTS.MERGE_STRATEGIES];
export type ConflictResolution = typeof CONFIG_IMPORT_EXPORT_CONSTANTS.CONFLICT_RESOLUTION[keyof typeof CONFIG_IMPORT_EXPORT_CONSTANTS.CONFLICT_RESOLUTION];
export type BackupType = typeof CONFIG_IMPORT_EXPORT_CONSTANTS.BACKUP_TYPES[keyof typeof CONFIG_IMPORT_EXPORT_CONSTANTS.BACKUP_TYPES];
export type ValidationErrorType = typeof CONFIG_IMPORT_EXPORT_CONSTANTS.VALIDATION_ERROR_TYPES[keyof typeof CONFIG_IMPORT_EXPORT_CONSTANTS.VALIDATION_ERROR_TYPES];
export type CompatibilityIssueType = typeof CONFIG_IMPORT_EXPORT_CONSTANTS.COMPATIBILITY_ISSUE_TYPES[keyof typeof CONFIG_IMPORT_EXPORT_CONSTANTS.COMPATIBILITY_ISSUE_TYPES];
export type TransformationType = typeof CONFIG_IMPORT_EXPORT_CONSTANTS.TRANSFORMATION_TYPES[keyof typeof CONFIG_IMPORT_EXPORT_CONSTANTS.TRANSFORMATION_TYPES];
export type SeverityLevel = typeof CONFIG_IMPORT_EXPORT_CONSTANTS.SEVERITY_LEVELS[keyof typeof CONFIG_IMPORT_EXPORT_CONSTANTS.SEVERITY_LEVELS];
export type ImpactLevel = typeof CONFIG_IMPORT_EXPORT_CONSTANTS.IMPACT_LEVELS[keyof typeof CONFIG_IMPORT_EXPORT_CONSTANTS.IMPACT_LEVELS];
export type TemplateCategory = typeof CONFIG_IMPORT_EXPORT_CONSTANTS.TEMPLATE_CATEGORIES[keyof typeof CONFIG_IMPORT_EXPORT_CONSTANTS.TEMPLATE_CATEGORIES];
export type ChecksumAlgorithm = typeof CONFIG_IMPORT_EXPORT_CONSTANTS.CHECKSUM_ALGORITHMS[keyof typeof CONFIG_IMPORT_EXPORT_CONSTANTS.CHECKSUM_ALGORITHMS];