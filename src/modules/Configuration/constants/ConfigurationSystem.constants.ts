/**
 * Configuration System Constants
 * All hardcoded values for the Configuration System
 */

export const CONFIGURATION_SYSTEM_CONSTANTS = {
  // System Information
  SYSTEM_NAME: 'RCC Configuration System',
  SYSTEM_VERSION: '1.0.0',
  SYSTEM_DESCRIPTION: 'BaseModule-based configuration management system',
  
  // Module IDs
  MODULE_IDS: {
    CONFIG_LOADER: 'config-loader-001',
    CONFIG_VALIDATOR: 'config-validator-001',
    CONFIG_PERSISTENCE: 'config-persistence-001',
    CONFIG_UI: 'config-ui-001',
    STATUS_LINE: 'status-line-001',
    CONFIG_DEBUGGER: 'config-debugger-001'
  } as const,
  
  // Module Types
  MODULE_TYPES: {
    CONFIG_LOADER: 'config-loader',
    CONFIG_VALIDATOR: 'config-validator', 
    CONFIG_PERSISTENCE: 'config-persistence',
    CONFIG_UI: 'config-ui',
    STATUS_LINE: 'status-line',
    CONFIG_DEBUGGER: 'config-debugger'
  } as const,
  
  // Default Configuration
  DEFAULT_CONFIG_PATH: './config.json5',
  DEFAULT_BACKUP_COUNT: 3,
  DEFAULT_WATCH_DEBOUNCE_MS: 100,
  
  // Validation Constants
  VALIDATION_TIMEOUT_MS: 5000,
  MAX_VALIDATION_ERRORS: 100,
  VALIDATION_CACHE_TTL_MS: 30000,
  
  // Performance Limits
  MAX_CONFIG_SIZE_MB: 10,
  MAX_ENVIRONMENT_VARIABLES: 1000,
  MAX_NESTED_DEPTH: 20,
  
  // Connection IDs
  CONNECTION_IDS: {
    LOADER_TO_VALIDATOR: 'loader-to-validator',
    VALIDATOR_TO_PERSISTENCE: 'validator-to-persistence',
    VALIDATOR_TO_STATUS_LINE: 'validator-to-status-line',
    UI_TO_VALIDATOR: 'ui-to-validator',
    UI_BROADCAST: 'ui-broadcast'
  } as const,
  
  // Error Codes
  ERROR_CODES: {
    CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
    PARSE_ERROR: 'PARSE_ERROR',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    SAVE_FAILED: 'SAVE_FAILED',
    MODULE_INITIALIZATION_FAILED: 'MODULE_INITIALIZATION_FAILED',
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    HANDSHAKE_FAILED: 'HANDSHAKE_FAILED'
  } as const,
  
  // Event Types
  EVENT_TYPES: {
    CONFIG_LOADED: 'config-loaded',
    CONFIG_VALIDATED: 'config-validated',
    CONFIG_SAVED: 'config-saved',
    CONFIG_UPDATED: 'config-updated',
    MODULE_CONNECTED: 'module-connected',
    MODULE_DISCONNECTED: 'module-disconnected',
    VALIDATION_COMPLETED: 'validation-completed',
    BACKUP_CREATED: 'backup-created'
  } as const,
  
  // Metadata Keys
  METADATA_KEYS: {
    FILE_PATH: 'filePath',
    LOAD_TIME: 'loadTime',
    VALIDATION_LEVEL: 'validationLevel',
    ENVIRONMENT_VARIABLES: 'environmentVariables',
    BACKUP_ID: 'backupId',
    SESSION_ID: 'sessionId'
  } as const
} as const;

// Type definitions for constants
export type ModuleId = typeof CONFIGURATION_SYSTEM_CONSTANTS.MODULE_IDS[keyof typeof CONFIGURATION_SYSTEM_CONSTANTS.MODULE_IDS];
export type ModuleType = typeof CONFIGURATION_SYSTEM_CONSTANTS.MODULE_TYPES[keyof typeof CONFIGURATION_SYSTEM_CONSTANTS.MODULE_TYPES];
export type ConnectionId = typeof CONFIGURATION_SYSTEM_CONSTANTS.CONNECTION_IDS[keyof typeof CONFIGURATION_SYSTEM_CONSTANTS.CONNECTION_IDS];
export type ErrorCode = typeof CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES[keyof typeof CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES];
export type EventType = typeof CONFIGURATION_SYSTEM_CONSTANTS.EVENT_TYPES[keyof typeof CONFIGURATION_SYSTEM_CONSTANTS.EVENT_TYPES];