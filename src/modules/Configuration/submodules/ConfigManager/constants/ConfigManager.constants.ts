/**
 * Configuration Manager Constants
 */

export const CONFIG_MANAGER_CONSTANTS = {
  // File paths
  CONFIG_FILE_PATH: '/Users/fanzhang/.rcc/config.json',
  CONFIG_DIR_PATH: '/Users/fanzhang/.rcc',
  BACKUP_PREFIX: 'config.json.backup.',
  MANUAL_BACKUP_PREFIX: 'config.json.manual-backup.',
  
  // Configuration defaults
  DEFAULT_VERSION: '2.0.0',
  
  // Validation rules
  VALIDATION: {
    REQUIRED_FIELDS: ['version', 'providers', 'global_config'],
    MIN_PROVIDER_FIELDS: ['id', 'name', 'protocol', 'api_base_url'],
    SUPPORTED_PROTOCOLS: ['openai', 'anthropic', 'gemini'],
    SUPPORTED_AUTH_TYPES: ['api_key', 'oauth'],
  },
  
  // File operations
  FILE_ENCODING: 'utf8' as BufferEncoding,
  BACKUP_TIMESTAMP_FORMAT: 'YYYY-MM-DD_HH-mm-ss',
  
  // Error messages
  ERRORS: {
    CONFIG_NOT_FOUND: 'Configuration file not found',
    INVALID_CONFIG_FORMAT: 'Invalid configuration format',
    BACKUP_FAILED: 'Failed to create backup',
    RESTORE_FAILED: 'Failed to restore from backup',
    VALIDATION_FAILED: 'Configuration validation failed',
    FILE_READ_ERROR: 'Failed to read configuration file',
    FILE_WRITE_ERROR: 'Failed to write configuration file',
  },
  
  // Success messages
  SUCCESS: {
    CONFIG_LOADED: 'Configuration loaded successfully',
    CONFIG_SAVED: 'Configuration saved successfully',
    BACKUP_CREATED: 'Backup created successfully',
    CONFIG_RESTORED: 'Configuration restored successfully',
    VALIDATION_PASSED: 'Configuration validation passed',
  },
  
  // Logging
  LOG_PREFIX: '🗂️ [ConfigManager]',
};