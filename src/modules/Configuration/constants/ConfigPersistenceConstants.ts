/**
 * Config Persistence Module Constants
 * All hardcoded values for the Configuration Persistence Module
 * Following RCC governance anti-hardcoding policy
 */

import { 
  PersistenceOperationType, 
  ConfigurationFormat, 
  ExportFormat, 
  LockType,
  RetentionStrategy,
  HealthStatus,
  IssueSeverity 
} from '../interfaces/IConfigPersistenceModule';

export const CONFIG_PERSISTENCE_CONSTANTS = {
  // Module Information
  MODULE_NAME: 'Configuration Persistence Module',
  MODULE_VERSION: '1.0.0',
  MODULE_DESCRIPTION: 'BaseModule-based configuration persistence with atomic operations, backup management, and rollback capabilities',
  MODULE_TYPE: 'config-persistence',
  
  // File and Path Configuration
  FILE_SYSTEM: {
    DEFAULT_CONFIG_FILENAME: 'config.json',
    PROVIDER_CONFIG_FILENAME: 'provider.json',
    DEFAULT_CONFIG_DIR: './config',
    BACKUP_DIR: './config/backups',
    TEMP_DIR: './config/temp',
    LOCK_DIR: './config/locks',
    METADATA_DIR: './config/metadata',
    ARCHIVE_DIR: './config/archive',
    DEFAULT_ENCODING: 'utf8',
    FILE_EXTENSION_JSON: '.json',
    FILE_EXTENSION_YAML: '.yaml',
    FILE_EXTENSION_TOML: '.toml',
    FILE_EXTENSION_INI: '.ini',
    FILE_EXTENSION_XML: '.xml',
    FILE_EXTENSION_PROPERTIES: '.properties',
    BACKUP_EXTENSION: '.backup',
    TEMP_EXTENSION: '.tmp',
    LOCK_EXTENSION: '.lock',
    METADATA_EXTENSION: '.meta',
    COMPRESSED_EXTENSION: '.gz'
  } as const,
  
  // Atomic Operation Settings
  ATOMIC_OPERATIONS: {
    TEMP_FILE_PREFIX: 'temp_',
    TEMP_FILE_SUFFIX: '_atomic',
    MAX_ATOMIC_RETRIES: 3,
    ATOMIC_RETRY_DELAY_MS: 100,
    ATOMIC_TIMEOUT_MS: 30000,
    VERIFY_AFTER_WRITE: true,
    FSYNC_ENABLED: true,
    CHMOD_AFTER_WRITE: true,
    DEFAULT_FILE_PERMISSIONS: 0o644,
    DEFAULT_DIR_PERMISSIONS: 0o755,
    BACKUP_BEFORE_ATOMIC: true
  } as const,
  
  // Backup Management
  BACKUP_SETTINGS: {
    DEFAULT_RETENTION_COUNT: 3,
    MAX_RETENTION_COUNT: 50,
    MIN_RETENTION_COUNT: 1,
    AUTO_BACKUP_ENABLED: true,
    COMPRESSION_ENABLED: true,
    COMPRESSION_LEVEL: 6,
    INCLUDE_METADATA: true,
    TIMESTAMP_FORMAT: 'YYYY-MM-DD_HH-mm-ss',
    BACKUP_FILENAME_PATTERN: '{filename}_{timestamp}{extension}',
    MAX_BACKUP_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
    MIN_BACKUP_INTERVAL_MS: 60000, // 1 minute
    CLEANUP_INTERVAL_MS: 3600000, // 1 hour
    VERIFY_BACKUP_INTEGRITY: true,
    PARALLEL_BACKUP_LIMIT: 3
  } as const,
  
  // File Locking Configuration
  FILE_LOCKING: {
    DEFAULT_LOCK_TIMEOUT_MS: 30000,
    MAX_LOCK_TIMEOUT_MS: 300000, // 5 minutes
    LOCK_RETRY_INTERVAL_MS: 500,
    MAX_LOCK_RETRIES: 10,
    LOCK_CLEANUP_INTERVAL_MS: 60000, // 1 minute
    STALE_LOCK_THRESHOLD_MS: 600000, // 10 minutes
    FORCE_BREAK_LOCK_THRESHOLD_MS: 1800000, // 30 minutes
    LOCK_FILE_CONTENT_TEMPLATE: JSON.stringify({
      lockId: '{lockId}',
      filePath: '{filePath}',
      lockedAt: '{timestamp}',
      lockedBy: '{process}',
      expiresAt: '{expiry}'
    }, null, 2),
    PROCESS_ID: 'rcc-config-persistence'
  } as const,
  
  // Performance and Limits
  PERFORMANCE_LIMITS: {
    MAX_FILE_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
    MAX_BACKUP_FILES: 1000,
    MAX_CONFIG_FILES: 500,
    MAX_CONCURRENT_OPERATIONS: 10,
    MAX_MEMORY_USAGE_BYTES: 512 * 1024 * 1024, // 512MB
    MAX_OPERATION_TIME_MS: 120000, // 2 minutes
    SLOW_OPERATION_THRESHOLD_MS: 5000,
    WARNING_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    WARNING_BACKUP_COUNT: 20,
    CRITICAL_DISK_SPACE_THRESHOLD: 0.95, // 95%
    WARNING_DISK_SPACE_THRESHOLD: 0.85, // 85%
    MAX_DIFF_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
    MAX_IMPORT_SIZE_BYTES: 200 * 1024 * 1024 // 200MB
  } as const,
  
  // Checksum and Integrity
  INTEGRITY_CHECKING: {
    CHECKSUM_ALGORITHM: 'sha256',
    VERIFY_ON_LOAD: true,
    VERIFY_ON_SAVE: true,
    VERIFY_BACKUPS: true,
    STORE_CHECKSUM_SEPARATELY: true,
    CHECKSUM_FILE_EXTENSION: '.sha256',
    INTEGRITY_CHECK_INTERVAL_MS: 3600000, // 1 hour
    CORRUPTION_BACKUP_ENABLED: true,
    AUTO_REPAIR_ENABLED: false,
    INTEGRITY_LOG_ENABLED: true
  } as const,
  
  // Version Management
  VERSION_CONTROL: {
    ENABLE_VERSION_HISTORY: true,
    MAX_VERSION_HISTORY: 10,
    VERSION_COMPARISON_ENABLED: true,
    SNAPSHOT_ON_MAJOR_CHANGES: true,
    VERSION_METADATA_ENABLED: true,
    CHANGE_DETECTION_ENABLED: true,
    DIFF_ALGORITHM: 'myers',
    SEMANTIC_VERSIONING: false,
    AUTO_VERSION_INCREMENT: true,
    VERSION_TAG_PREFIX: 'v',
    ROLLBACK_SAFETY_CHECK: true
  } as const,
  
  // Import/Export Settings
  IMPORT_EXPORT: {
    SUPPORTED_FORMATS: [
      ConfigurationFormat.JSON,
      ConfigurationFormat.YAML,
      ConfigurationFormat.TOML,
      ConfigurationFormat.INI,
      ConfigurationFormat.XML
    ],
    EXPORT_FORMATS: [
      ExportFormat.JSON,
      ExportFormat.YAML,
      ExportFormat.TOML,
      ExportFormat.ZIP,
      ExportFormat.TAR_GZ
    ],
    INCLUDE_METADATA_DEFAULT: true,
    VALIDATE_ON_IMPORT: true,
    BACKUP_BEFORE_IMPORT: true,
    TRANSFORM_ON_IMPORT: true,
    COMPRESSION_FOR_EXPORT: true,
    EXPORT_TIMESTAMP_FORMAT: 'YYYY-MM-DD_HH-mm-ss',
    MAX_EXPORT_SIZE_BYTES: 500 * 1024 * 1024, // 500MB
    EXPORT_FILENAME_PATTERN: '{name}_export_{timestamp}.{format}'
  } as const,
  
  // Error Handling and Recovery
  ERROR_HANDLING: {
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
    EXPONENTIAL_BACKOFF: true,
    BACKOFF_MULTIPLIER: 2,
    MAX_BACKOFF_DELAY_MS: 10000,
    AUTO_RECOVERY_ENABLED: true,
    GRACEFUL_DEGRADATION: true,
    ERROR_LOG_ENABLED: true,
    DETAILED_ERROR_REPORTING: true,
    OPERATION_TIMEOUT_MS: 60000
  } as const,
  
  // Health Monitoring
  HEALTH_MONITORING: {
    ENABLE_HEALTH_CHECKS: true,
    HEALTH_CHECK_INTERVAL_MS: 300000, // 5 minutes
    STORAGE_HEALTH_THRESHOLD: 0.8,
    PERFORMANCE_HEALTH_THRESHOLD: 2000, // 2 seconds
    ERROR_RATE_THRESHOLD: 0.05, // 5%
    AUTO_CLEANUP_ENABLED: true,
    HEALTH_REPORT_RETENTION_HOURS: 24,
    CRITICAL_ALERT_ENABLED: true,
    HEALTH_METRICS_ENABLED: true
  } as const,
  
  // Operation Types
  OPERATION_TYPES: {
    SAVE: PersistenceOperationType.SAVE,
    LOAD: PersistenceOperationType.LOAD,
    DELETE: PersistenceOperationType.DELETE,
    BACKUP: PersistenceOperationType.BACKUP,
    RESTORE: PersistenceOperationType.RESTORE,
    ROLLBACK: PersistenceOperationType.ROLLBACK,
    EXPORT: PersistenceOperationType.EXPORT,
    IMPORT: PersistenceOperationType.IMPORT,
    CLEANUP: PersistenceOperationType.CLEANUP,
    VERIFY: PersistenceOperationType.VERIFY,
    LOCK: PersistenceOperationType.LOCK,
    UNLOCK: PersistenceOperationType.UNLOCK
  } as const,
  
  // Configuration Formats
  CONFIG_FORMATS: {
    JSON: ConfigurationFormat.JSON,
    YAML: ConfigurationFormat.YAML,
    TOML: ConfigurationFormat.TOML,
    INI: ConfigurationFormat.INI,
    XML: ConfigurationFormat.XML,
    PROPERTIES: ConfigurationFormat.PROPERTIES
  } as const,
  
  // Lock Types
  LOCK_TYPES: {
    EXCLUSIVE: LockType.EXCLUSIVE,
    SHARED: LockType.SHARED,
    READ_ONLY: LockType.READ_ONLY
  } as const,
  
  // Retention Strategies
  RETENTION_STRATEGIES: {
    FIFO: RetentionStrategy.FIFO,
    LIFO: RetentionStrategy.LIFO,
    PRIORITY_BASED: RetentionStrategy.PRIORITY_BASED,
    SIZE_BASED: RetentionStrategy.SIZE_BASED,
    AGE_BASED: RetentionStrategy.AGE_BASED
  } as const,
  
  // Cache Settings
  CACHE_SETTINGS: {
    ENABLE_CACHING: true,
    CONFIG_CACHE_TTL_MS: 300000, // 5 minutes
    METADATA_CACHE_TTL_MS: 600000, // 10 minutes
    BACKUP_LIST_CACHE_TTL_MS: 60000, // 1 minute
    VERSION_HISTORY_CACHE_TTL_MS: 900000, // 15 minutes
    MAX_CACHED_CONFIGS: 50,
    MAX_CACHED_METADATA: 100,
    CACHE_CLEANUP_INTERVAL_MS: 300000, // 5 minutes
    CACHE_COMPRESSION: true
  } as const,
  
  // Connection Types
  CONNECTION_TYPES: {
    CONFIG_DATA_INPUT: 'config-data-input',
    PERSISTENCE_RESULT_OUTPUT: 'persistence-result-output',
    BACKUP_NOTIFICATION_OUTPUT: 'backup-notification-output',
    ERROR_OUTPUT: 'error-output',
    VALIDATION_INPUT: 'validation-input',
    METADATA_OUTPUT: 'metadata-output',
    HEALTH_STATUS_OUTPUT: 'health-status-output'
  } as const,
  
  // Data Transfer Types
  DATA_TRANSFER_TYPES: {
    SAVE_REQUEST: 'save-request',
    LOAD_REQUEST: 'load-request',
    BACKUP_REQUEST: 'backup-request',
    RESTORE_REQUEST: 'restore-request',
    ROLLBACK_REQUEST: 'rollback-request',
    EXPORT_REQUEST: 'export-request',
    IMPORT_REQUEST: 'import-request',
    PERSISTENCE_RESULT: 'persistence-result',
    CONFIGURATION_DATA: 'configuration-data',
    BACKUP_NOTIFICATION: 'backup-notification',
    HEALTH_REPORT: 'health-report',
    ERROR_REPORT: 'error-report',
    PERFORMANCE_METRICS: 'performance-metrics'
  } as const,
  
  // Error Messages
  ERROR_MESSAGES: {
    // General persistence errors
    PERSISTENCE_FAILED: 'Configuration persistence operation failed',
    INVALID_FILE_PATH: 'Invalid file path provided',
    FILE_NOT_FOUND: 'Configuration file not found',
    FILE_ACCESS_DENIED: 'Access denied to configuration file',
    INVALID_CONFIGURATION_DATA: 'Invalid configuration data provided',
    OPERATION_TIMEOUT: 'Persistence operation timed out',
    
    // Atomic operation errors
    ATOMIC_WRITE_FAILED: 'Atomic write operation failed',
    TEMP_FILE_CREATION_FAILED: 'Failed to create temporary file',
    ATOMIC_MOVE_FAILED: 'Failed to move temporary file to target location',
    INTEGRITY_VERIFICATION_FAILED: 'Integrity verification failed after write',
    
    // Backup errors
    BACKUP_CREATION_FAILED: 'Failed to create configuration backup',
    BACKUP_NOT_FOUND: 'Backup file not found',
    BACKUP_RESTORATION_FAILED: 'Failed to restore from backup',
    BACKUP_CLEANUP_FAILED: 'Failed to cleanup old backups',
    INVALID_BACKUP_FORMAT: 'Invalid backup file format',
    
    // File locking errors
    LOCK_ACQUISITION_FAILED: 'Failed to acquire file lock',
    LOCK_TIMEOUT: 'File lock acquisition timed out',
    LOCK_RELEASE_FAILED: 'Failed to release file lock',
    FILE_LOCKED_BY_OTHER: 'File is locked by another process',
    STALE_LOCK_DETECTED: 'Stale lock file detected',
    
    // Import/Export errors
    EXPORT_FAILED: 'Configuration export failed',
    IMPORT_FAILED: 'Configuration import failed',
    INVALID_EXPORT_FORMAT: 'Invalid export format specified',
    INVALID_IMPORT_FORMAT: 'Invalid import format specified',
    IMPORT_VALIDATION_FAILED: 'Import data validation failed',
    
    // Version control errors
    ROLLBACK_FAILED: 'Configuration rollback failed',
    VERSION_NOT_FOUND: 'Configuration version not found',
    VERSION_COMPARISON_FAILED: 'Failed to compare configuration versions',
    INVALID_VERSION_ID: 'Invalid version ID provided',
    
    // Health and integrity errors
    INTEGRITY_CHECK_FAILED: 'Configuration integrity check failed',
    CHECKSUM_MISMATCH: 'Configuration checksum mismatch',
    FILE_CORRUPTION_DETECTED: 'Configuration file corruption detected',
    STORAGE_HEALTH_CRITICAL: 'Storage health is in critical state',
    
    // Type-specific error messages
    TYPE_MISMATCH: (expected: string, actual: string) => `Expected ${expected}, got ${actual}`,
    FILE_SIZE_EXCEEDED: (size: number, limit: number) => `File size ${size} exceeds limit ${limit}`,
    BACKUP_RETENTION_EXCEEDED: (count: number, limit: number) => `Backup count ${count} exceeds retention limit ${limit}`,
    DISK_SPACE_LOW: (available: number, required: number) => `Insufficient disk space: ${available} available, ${required} required`,
    OPERATION_DURATION_EXCEEDED: (duration: number, limit: number) => `Operation duration ${duration}ms exceeded limit ${limit}ms`,
    LOCK_HELD_TOO_LONG: (duration: number, limit: number) => `Lock held for ${duration}ms exceeds limit ${limit}ms`
  } as const,
  
  // Success Messages
  SUCCESS_MESSAGES: {
    SAVE_SUCCESS: 'Configuration saved successfully',
    LOAD_SUCCESS: 'Configuration loaded successfully',
    BACKUP_CREATED: 'Configuration backup created successfully',
    BACKUP_RESTORED: 'Configuration restored from backup successfully',
    ROLLBACK_SUCCESS: 'Configuration rollback completed successfully',
    EXPORT_SUCCESS: 'Configuration exported successfully',
    IMPORT_SUCCESS: 'Configuration imported successfully',
    CLEANUP_SUCCESS: 'Backup cleanup completed successfully',
    LOCK_ACQUIRED: 'File lock acquired successfully',
    LOCK_RELEASED: 'File lock released successfully',
    INTEGRITY_VERIFIED: 'Configuration integrity verified successfully',
    HEALTH_CHECK_PASSED: 'Storage health check passed'
  } as const,
  
  // Validation Rules
  VALIDATION_RULES: {
    FILE_PATH: {
      REQUIRED: true,
      TYPE: 'string',
      MIN_LENGTH: 1,
      MAX_LENGTH: 4096,
      PATTERN: /^[a-zA-Z0-9\-_./\\:]+$/
    },
    CONFIG_DATA: {
      REQUIRED: true,
      TYPE: 'object',
      NOT_NULL: true
    },
    BACKUP_NAME: {
      REQUIRED: false,
      TYPE: 'string',
      MIN_LENGTH: 1,
      MAX_LENGTH: 255,
      PATTERN: /^[a-zA-Z0-9\-_]+$/
    },
    VERSION_ID: {
      REQUIRED: true,
      TYPE: 'string',
      MIN_LENGTH: 1,
      MAX_LENGTH: 64,
      PATTERN: /^[a-zA-Z0-9\-_]+$/
    },
    TIMEOUT: {
      REQUIRED: false,
      TYPE: 'number',
      MIN_VALUE: 1000,
      MAX_VALUE: 300000
    },
    RETENTION_COUNT: {
      REQUIRED: false,
      TYPE: 'number',
      MIN_VALUE: 1,
      MAX_VALUE: 50
    }
  } as const,
  
  // Monitoring and Metrics
  MONITORING: {
    OPERATION_METRICS_ENABLED: true,
    PERFORMANCE_TRACKING_ENABLED: true,
    ERROR_RATE_TRACKING: true,
    STORAGE_USAGE_TRACKING: true,
    HEALTH_METRICS_COLLECTION: true,
    METRICS_RETENTION_HOURS: 168, // 7 days
    METRICS_AGGREGATION_INTERVAL_MS: 60000, // 1 minute
    ALERT_THRESHOLDS: {
      ERROR_RATE: 0.1, // 10%
      RESPONSE_TIME_MS: 5000,
      STORAGE_USAGE: 0.9, // 90%
      MEMORY_USAGE: 0.8, // 80%
      BACKUP_FAILURE_RATE: 0.05 // 5%
    }
  } as const,
  
  // Regular Expression Patterns
  REGEX_PATTERNS: {
    CONFIG_FILENAME: /^[a-zA-Z0-9\-_]+\.(json|yaml|yml|toml|ini|xml|properties)$/,
    BACKUP_FILENAME: /^[a-zA-Z0-9\-_]+_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.(json|yaml|yml|toml|ini|xml|properties|backup)$/,
    VERSION_ID: /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9\-]+)?$/,
    TIMESTAMP: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    CHECKSUM: /^[a-f0-9]{64}$/,
    FILE_PATH: /^(?:[a-zA-Z]:[\\\/]|\/)?(?:[^<>:"\/\\|?*\x00-\x1f]+[\\\/])*[^<>:"\/\\|?*\x00-\x1f]*$/,
    LOCK_ID: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
  } as const,
  
  // Default Configuration Templates
  DEFAULT_TEMPLATES: {
    BASIC_CONFIG: {
      version: '1.0.0',
      metadata: {
        createdAt: Date.now(),
        description: 'Basic configuration template'
      },
      data: {}
    },
    BACKUP_POLICY: {
      retentionCount: 3,
      compressionEnabled: true,
      verificationEnabled: true,
      strategy: RetentionStrategy.FIFO
    },
    HEALTH_CHECK_CONFIG: {
      enabledChecks: ['integrity', 'storage', 'performance'],
      thresholds: {
        storageUsage: 0.85,
        responseTime: 2000,
        errorRate: 0.05
      }
    }
  } as const,
  
  // File System Permissions
  PERMISSIONS: {
    CONFIG_FILE: 0o644,
    CONFIG_DIR: 0o755,
    BACKUP_FILE: 0o600,
    BACKUP_DIR: 0o750,
    TEMP_FILE: 0o600,
    TEMP_DIR: 0o700,
    LOCK_FILE: 0o644,
    LOCK_DIR: 0o755,
    METADATA_FILE: 0o644,
    METADATA_DIR: 0o755
  } as const
} as const;

// Type definitions for constants
export type PersistenceOperationType = typeof CONFIG_PERSISTENCE_CONSTANTS.OPERATION_TYPES[keyof typeof CONFIG_PERSISTENCE_CONSTANTS.OPERATION_TYPES];
export type ConfigurationFormat = typeof CONFIG_PERSISTENCE_CONSTANTS.CONFIG_FORMATS[keyof typeof CONFIG_PERSISTENCE_CONSTANTS.CONFIG_FORMATS];
export type ConnectionType = typeof CONFIG_PERSISTENCE_CONSTANTS.CONNECTION_TYPES[keyof typeof CONFIG_PERSISTENCE_CONSTANTS.CONNECTION_TYPES];
export type DataTransferType = typeof CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES[keyof typeof CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES];
export type LockType = typeof CONFIG_PERSISTENCE_CONSTANTS.LOCK_TYPES[keyof typeof CONFIG_PERSISTENCE_CONSTANTS.LOCK_TYPES];
export type RetentionStrategy = typeof CONFIG_PERSISTENCE_CONSTANTS.RETENTION_STRATEGIES[keyof typeof CONFIG_PERSISTENCE_CONSTANTS.RETENTION_STRATEGIES];