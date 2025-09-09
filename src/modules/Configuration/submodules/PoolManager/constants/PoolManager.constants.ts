/**
 * PoolManager Constants
 * All configuration values for PoolManager module
 */

export const POOL_MANAGER_CONSTANTS = {
  // Module Information
  MODULE_NAME: 'PoolManager',
  MODULE_VERSION: '1.0.0',
  MODULE_DESCRIPTION: 'Manages provider pool operations with deduplication logic',

  // Default Values
  DEFAULT_POOL_STATUS: 'active',
  DEFAULT_STATUS_ACTIVE: 'active',
  DEFAULT_STATUS_INACTIVE: 'inactive',

  // API Routes
  API_ROUTES: {
    POOL: 'pool',
    PROVIDERS: 'providers',
    STATS: 'stats',
    HEALTH: 'health'
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
    MODEL_NOT_IN_POOL: 'Model not found in pool',
    INVALID_REQUEST_DATA: 'Invalid request data',
    POOL_OPERATION_FAILED: 'Pool operation failed',
    METHOD_NOT_ALLOWED: 'Method not allowed',
    BAD_REQUEST: 'Bad request',
    INITIALIZATION_FAILED: 'PoolManager initialization failed',
    CONFIG_MANAGER_NOT_PROVIDED: 'ConfigManager not provided during initialization',
    POOL_SIZE_LIMIT_EXCEEDED: 'Pool size limit exceeded',
    DUPLICATE_POOL_ENTRY: 'Model already exists in pool',
    INVALID_POOL_ENTRY: 'Invalid pool entry structure'
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    MODEL_ADDED_TO_POOL: 'Model added to provider pool',
    MODEL_REMOVED_FROM_POOL: 'Model removed from pool',
    POOL_RETRIEVED: 'Pool retrieved successfully',
    GROUPED_POOL_RETRIEVED: 'Grouped pool retrieved successfully',
    POOL_STATS_RETRIEVED: 'Pool statistics retrieved successfully',
    POOL_HEALTH_RETRIEVED: 'Pool health status retrieved successfully'
  },

  // Validation Rules
  VALIDATION: {
    MIN_MODEL_ID_LENGTH: 1,
    MIN_PROVIDER_ID_LENGTH: 1,
    MAX_POOL_ENTRY_SIZE: 50000, // bytes
    REQUIRED_FIELDS: {
      POOL_ENTRY: ['id', 'providerId', 'modelId', 'modelName'],
      ADD_TO_POOL: ['modelId']
    }
  },

  // Deduplication Settings
  DEDUPLICATION: {
    ENABLED: true,
    LOG_DEDUPLICATION_ACTIONS: true,
    AUTO_UPDATE_MODEL_STATUS: true,
    PRESERVE_ORIGINAL_MODEL_DATA: true,
    REMOVE_FROM_BLACKLIST_ON_ADD: true
  },

  // Performance Settings
  PERFORMANCE: {
    MAX_POOL_SIZE: 50000,
    MAX_MODELS_PER_PROVIDER: 1000,
    BULK_OPERATION_BATCH_SIZE: 100,
    CACHE_TTL_MS: 300000, // 5 minutes
    MAX_CONCURRENT_OPERATIONS: 10
  },

  // Logging Settings
  LOGGING: {
    LOG_LEVEL: 'info',
    LOG_POOL_OPERATIONS: true,
    LOG_DEDUPLICATION_EVENTS: true,
    LOG_API_CALLS: true,
    LOG_CONFIG_UPDATES: true,
    LOG_PERFORMANCE_METRICS: true
  },

  // Configuration Keys
  CONFIG_KEYS: {
    PROVIDER_POOL: 'provider_pool',
    MODEL_BLACKLIST: 'model_blacklist',
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
    API_BASE_URL: 'api_base_url',
    PROTOCOL: 'protocol',
    AUTH_TYPE: 'auth_type',
    API_KEY: 'api_key',
    MODEL: 'model',
    ADDED_AT: 'added_at',
    STATUS: 'status',
    UPDATED_AT: 'updated_at'
  },

  // Pool Entry Status Values
  POOL_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    ERROR: 'error'
  },

  // Model Status Values (for original models)
  MODEL_STATUS: {
    ACTIVE: 'active',
    BLACKLISTED: 'blacklisted',
    INACTIVE: 'inactive',
    PENDING: 'pending'
  },

  // Pool Health Thresholds
  HEALTH_THRESHOLDS: {
    MIN_POOL_SIZE: 1,
    MAX_POOL_SIZE_WARNING: 40000,
    MAX_MODELS_PER_PROVIDER_WARNING: 800,
    STALE_ENTRY_DAYS: 30,
    MIN_ACTIVE_PROVIDERS: 1
  },

  // Pool Statistics
  STATISTICS: {
    DEFAULT_METRICS_HISTORY_DAYS: 30,
    PERFORMANCE_SAMPLE_SIZE: 1000,
    CACHE_STATS_INTERVAL_MS: 60000 // 1 minute
  },

  // Pool Operations
  OPERATIONS: {
    ADD_TO_POOL: 'add_to_pool',
    REMOVE_FROM_POOL: 'remove_from_pool',
    UPDATE_POOL_ENTRY: 'update_pool_entry',
    CLEAR_POOL: 'clear_pool',
    VALIDATE_POOL: 'validate_pool'
  }
} as const;

export type PoolManagerConstants = typeof POOL_MANAGER_CONSTANTS;