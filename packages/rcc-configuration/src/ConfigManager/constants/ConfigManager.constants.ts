/**
 * ConfigManager Constants
 * 
 * All constants and default configurations for the Configuration Manager.
 * Follows anti-hardcoding policy by centralizing all configuration values.
 */

export const CONFIG_MANAGER_CONSTANTS = {
  // Module identification
  MODULE_NAME: 'ConfigManager',
  MODULE_VERSION: '1.0.0',
  
  // Default configuration values
  DEFAULT_CONFIG: {
    VERSION: '1.0.0',
    AUTO_SAVE: true,
    BACKUP_ON_CHANGE: true,
    MAX_BACKUPS: 10,
    VALIDATE_ON_LOAD: true,
    CREATE_MISSING: true,
  },
  
  // File system defaults
  FILE_SYSTEM: {
    DEFAULT_CONFIG_FILENAME: 'config.json',
    DEFAULT_CONFIG_DIR: '.rcc',
    BACKUP_DIR: 'backups',
    TEMP_DIR: 'tmp',
    BACKUP_FILENAME_PREFIX: 'config-backup-',
    BACKUP_FILENAME_SUFFIX: '.json',
    ENCODING: 'utf8' as const,
    PERMISSIONS: 0o600,
  },
  
  // Validation rules
  VALIDATION: {
    MIN_VERSION_LENGTH: 3,
    MAX_BACKUP_LABEL_LENGTH: 100,
    REQUIRED_FIELDS: ['version', 'providers'],
    MAX_CONFIG_SIZE_MB: 50,
    MAX_PROVIDERS: 1000,
    MAX_ROUTES: 10000,
  },
  
  // Default configuration template
  DEFAULT_CONFIG_TEMPLATE: {
    version: '1.0.0',
    last_updated: '',
    providers: [],
    routes: [],
    virtual_categories: [],
    global_config: {
      load_balancing: 'round_robin' as const,
      rate_limiting: {
        enabled: false,
        requests_per_minute: 100,
      },
      monitoring: {
        enabled: true,
        health_check_interval: 60000,
        alert_thresholds: {
          error_rate: 0.05,
          response_time_ms: 10000,
          availability: 0.95,
        },
      },
    },
    model_blacklist: [],
    provider_pool: [],
    metadata: {
      created_by: 'rcc-configuration',
      created_at: '',
    },
  },
  
  // Error messages
  ERRORS: {
    CONFIG_NOT_FOUND: 'Configuration file not found',
    CONFIG_INVALID: 'Configuration file is invalid',
    CONFIG_CORRUPT: 'Configuration file is corrupted',
    BACKUP_NOT_FOUND: 'Backup not found',
    BACKUP_CORRUPT: 'Backup file is corrupted',
    VALIDATION_FAILED: 'Configuration validation failed',
    SAVE_FAILED: 'Failed to save configuration',
    LOAD_FAILED: 'Failed to load configuration',
    PERMISSION_DENIED: 'Permission denied accessing configuration file',
    DISK_SPACE: 'Insufficient disk space',
    FILE_LOCKED: 'Configuration file is locked by another process',
  },
  
  // Success messages
  SUCCESS: {
    CONFIG_LOADED: 'Configuration loaded successfully',
    CONFIG_SAVED: 'Configuration saved successfully',
    BACKUP_CREATED: 'Backup created successfully',
    BACKUP_RESTORED: 'Backup restored successfully',
    CONFIG_VALIDATED: 'Configuration validated successfully',
    CONFIG_REPAIRED: 'Configuration repaired successfully',
  },
  
  // Performance thresholds
  PERFORMANCE: {
    LOAD_TIMEOUT_MS: 30000,
    SAVE_TIMEOUT_MS: 30000,
    BACKUP_TIMEOUT_MS: 60000,
    MAX_CONCURRENT_OPERATIONS: 5,
    DEBOUNCE_SAVE_MS: 1000,
  },
  
  // Backup settings
  BACKUP: {
    MAX_BACKUPS_DEFAULT: 10,
    AUTO_BACKUP_INTERVAL_MS: 3600000, // 1 hour
    CLEANUP_OLD_BACKUPS: true,
    COMPRESS_BACKUPS: false,
    BACKUP_RETENTION_DAYS: 30,
  },
  
  // Event types for configuration changes
  EVENTS: {
    CONFIG_LOADED: 'config:loaded',
    CONFIG_SAVED: 'config:saved',
    CONFIG_CHANGED: 'config:changed',
    CONFIG_VALIDATED: 'config:validated',
    CONFIG_REPAIRED: 'config:repaired',
    BACKUP_CREATED: 'backup:created',
    BACKUP_RESTORED: 'backup:restored',
    ERROR: 'config:error',
  },
  
  // Repair strategies for common issues
  REPAIR_STRATEGIES: {
    MISSING_VERSION: 'Add default version',
    MISSING_PROVIDERS: 'Initialize empty providers array',
    INVALID_TIMESTAMP: 'Set current timestamp',
    CORRUPTED_ARRAY: 'Reset to empty array',
    INVALID_GLOBAL_CONFIG: 'Use default global configuration',
  },
} as const;

// Type exports for constants
export type ConfigEventType = typeof CONFIG_MANAGER_CONSTANTS.EVENTS[keyof typeof CONFIG_MANAGER_CONSTANTS.EVENTS];
export type RepairStrategy = typeof CONFIG_MANAGER_CONSTANTS.REPAIR_STRATEGIES[keyof typeof CONFIG_MANAGER_CONSTANTS.REPAIR_STRATEGIES];