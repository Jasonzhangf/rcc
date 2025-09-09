/**
 * BlacklistManager Constants
 * All configuration values for BlacklistManager module
 */

export const BLACKLIST_MANAGER_CONSTANTS = {
  // Module Information
  MODULE_NAME: 'BlacklistManager',
  MODULE_VERSION: '1.0.0',
  MODULE_DESCRIPTION: 'Manages model blacklist operations with deduplication logic',

  // Default Values
  DEFAULT_BLACKLIST_REASON: 'Manual blacklist',
  DEFAULT_STATUS_BLACKLISTED: 'blacklisted',
  DEFAULT_STATUS_ACTIVE: 'active',

  // API Routes
  API_ROUTES: {
    BLACKLIST: 'blacklist',
    PROVIDERS: 'providers'
  },

  // HTTP Methods
  HTTP_METHODS: {
    GET: 'GET',
    POST: 'POST',
    DELETE: 'DELETE',
    PUT: 'PUT'
  },

  // Response Codes
  STATUS_CODES: {
    SUCCESS: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    INTERNAL_SERVER_ERROR: 500
  },

  // Error Messages
  ERROR_MESSAGES: {
    PROVIDER_NOT_FOUND: 'Provider not found',
    MODEL_NOT_FOUND: 'Model not found in provider',
    MODEL_NOT_IN_BLACKLIST: 'Model not found in blacklist',
    INVALID_REQUEST_DATA: 'Invalid request data',
    BLACKLIST_OPERATION_FAILED: 'Blacklist operation failed',
    METHOD_NOT_ALLOWED: 'Method not allowed',
    BAD_REQUEST: 'Bad request',
    INITIALIZATION_FAILED: 'BlacklistManager initialization failed',
    CONFIG_MANAGER_NOT_PROVIDED: 'ConfigManager not provided during initialization'
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    MODEL_BLACKLISTED: 'Model has been blacklisted',
    MODEL_REMOVED_FROM_BLACKLIST: 'Model removed from blacklist',
    BLACKLIST_RETRIEVED: 'Blacklist retrieved successfully',
    GROUPED_BLACKLIST_RETRIEVED: 'Grouped blacklist retrieved successfully'
  },

  // Validation Rules
  VALIDATION: {
    MIN_MODEL_ID_LENGTH: 1,
    MIN_PROVIDER_ID_LENGTH: 1,
    MAX_REASON_LENGTH: 500,
    REQUIRED_FIELDS: {
      BLACKLIST_MODEL: ['modelId'],
      PROVIDER_ID: ['providerId']
    }
  },

  // Deduplication Settings
  DEDUPLICATION: {
    ENABLED: true,
    LOG_DEDUPLICATION_ACTIONS: true,
    AUTO_UPDATE_MODEL_STATUS: true,
    PRESERVE_ORIGINAL_MODEL_DATA: true
  },

  // Performance Settings
  PERFORMANCE: {
    MAX_BLACKLIST_SIZE: 10000,
    BULK_OPERATION_BATCH_SIZE: 100,
    CACHE_TTL_MS: 300000, // 5 minutes
    MAX_CONCURRENT_OPERATIONS: 10
  },

  // Logging Settings
  LOGGING: {
    LOG_LEVEL: 'info',
    LOG_BLACKLIST_OPERATIONS: true,
    LOG_DEDUPLICATION_EVENTS: true,
    LOG_API_CALLS: true,
    LOG_CONFIG_UPDATES: true
  },

  // Configuration Keys
  CONFIG_KEYS: {
    MODEL_BLACKLIST: 'model_blacklist',
    PROVIDER_POOL: 'provider_pool',
    PROVIDERS: 'providers',
    LAST_UPDATED: 'last_updated'
  },

  // Field Names
  FIELDS: {
    ID: 'id',
    PROVIDER_ID: 'providerId',
    PROVIDER_NAME: 'providerName',
    MODEL_ID: 'modelId',
    MODEL_NAME: 'modelName',
    REASON: 'reason',
    BLACKLISTED_AT: 'blacklisted_at',
    ORIGINAL_MODEL: 'original_model',
    BLACKLISTED: 'blacklisted',
    BLACKLIST_REASON: 'blacklist_reason',
    STATUS: 'status',
    UPDATED_AT: 'updated_at'
  },

  // Model Status Values
  MODEL_STATUS: {
    ACTIVE: 'active',
    BLACKLISTED: 'blacklisted',
    INACTIVE: 'inactive',
    PENDING: 'pending'
  }
} as const;

export type BlacklistManagerConstants = typeof BLACKLIST_MANAGER_CONSTANTS;