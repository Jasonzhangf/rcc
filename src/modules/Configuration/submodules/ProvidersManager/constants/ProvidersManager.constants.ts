/**
 * ProvidersManager Constants
 * All configuration values and constants for the ProvidersManager module
 * Prevents hardcoding per anti-hardcoding policy
 */

export const PROVIDERS_MANAGER_CONSTANTS = {
  // Module Information
  MODULE_NAME: 'ProvidersManager',
  MODULE_VERSION: '1.0.0',
  MODULE_DESCRIPTION: 'Handles provider CRUD operations, testing, and management',
  LOG_PREFIX: '🏭 [ProvidersManager]',

  // File and Directory Paths
  CONFIG_FILE_PATH: '~/.rcc-multi-key-ui/config.json',
  BACKUP_DIR: '~/.rcc-multi-key-ui/backups',
  LOGS_DIR: '~/.rcc-multi-key-ui/logs',

  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    TIMEOUT: 408,
  },

  // API Testing Configuration
  API_TEST: {
    TIMEOUT_MS: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
    USER_AGENT: 'RCC-Multi-Key-Manager/1.0',
    OPENAI_TEST_ENDPOINT: '/models',
    ANTHROPIC_TEST_ENDPOINT: '/messages',
    GEMINI_TEST_ENDPOINT: '/models',
    ANTHROPIC_API_VERSION: '2023-06-01',
    TEST_MODEL_CLAUDE: 'claude-3-haiku-20240307',
    TEST_MAX_TOKENS: 10,
    TEST_MESSAGE: 'test',
  },

  // Supported Protocols and Authentication Types
  VALIDATION: {
    SUPPORTED_PROTOCOLS: ['openai', 'anthropic', 'gemini'],
    SUPPORTED_AUTH_TYPES: ['api_key', 'oauth', 'bearer'],
    REQUIRED_FIELDS: ['name', 'protocol', 'api_base_url', 'api_key'],
    MIN_NAME_LENGTH: 1,
    MAX_NAME_LENGTH: 100,
    MIN_API_KEY_LENGTH: 10,
    MAX_API_KEYS_PER_PROVIDER: 50,
    URL_PATTERN: /^https?:\/\/.+$/,
  },

  // API Endpoints to Remove for Base URL Processing
  BASE_URL_ENDPOINTS_TO_REMOVE: [
    '/chat/completions',
    '/completions',
    '/models',
    '/messages',
    '/v1/chat/completions',
    '/v1/completions',
    '/v1/models',
  ],

  // Provider Pool Configuration
  PROVIDER_POOL: {
    DEFAULT_PRIORITY: 100,
    MIN_PRIORITY: 1,
    MAX_PRIORITY: 1000,
  },

  // Model Blacklist Configuration
  BLACKLIST: {
    DEFAULT_REASON: 'User requested',
    MAX_REASON_LENGTH: 500,
  },

  // Token Detection Configuration
  TOKEN_DETECTION: {
    DEFAULT_TEST_PROMPT: 'Hello, this is a test message to detect maximum tokens.',
    INCREMENTAL_STEPS: [100, 500, 1000, 2000, 4000, 8000, 16000, 32000],
    MAX_DETECTION_ATTEMPTS: 5,
  },

  // Logging and Messages
  MESSAGES: {
    PROVIDER_ADDED: 'Provider added successfully',
    PROVIDER_UPDATED: 'Provider updated successfully',
    PROVIDER_DELETED: 'Provider deleted successfully',
    PROVIDER_TESTED: 'Provider tested successfully',
    MODELS_FETCHED: 'Models fetched successfully',
    MODEL_VERIFIED: 'Model verified successfully',
    MODEL_BLACKLISTED: 'Model blacklisted successfully',
    ADDED_TO_POOL: 'Added to provider pool successfully',
    CONNECTION_SUCCESSFUL: 'Connection successful',
    AUTHENTICATION_FAILED: 'Authentication failed - Invalid API key',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    ENDPOINT_NOT_FOUND: 'API endpoint not found',
    REQUEST_TIMEOUT: 'Request timeout',
    CONNECTION_FAILED: 'Connection failed',
  },

  // Error Messages
  ERRORS: {
    PROVIDER_NOT_FOUND: 'Provider not found',
    PROVIDER_NAME_EXISTS: 'Provider name already exists',
    PROVIDER_NAME_REQUIRED: 'Provider name is required and must be a non-empty string',
    PROTOCOL_REQUIRED: 'Protocol is required and must be one of: openai, anthropic, gemini',
    API_BASE_URL_REQUIRED: 'API base URL is required and must be a valid URL string',
    API_KEY_REQUIRED: 'API key is required and must be a non-empty string or array',
    INVALID_AUTH_TYPE: 'Invalid authentication type',
    INVALID_JSON: 'Invalid JSON data provided',
    VALIDATION_FAILED: 'Data validation failed',
    CONFIG_MANAGER_NOT_INITIALIZED: 'ConfigManager not initialized',
    TEST_FAILED: 'Provider test failed',
    MODELS_FETCH_FAILED: 'Failed to fetch models',
    MODEL_VERIFICATION_FAILED: 'Model verification failed',
    TOKEN_DETECTION_FAILED: 'Token detection failed',
    BLACKLIST_FAILED: 'Model blacklisting failed',
    POOL_ADDITION_FAILED: 'Failed to add to provider pool',
    UNSUPPORTED_PROTOCOL: 'Unsupported protocol',
    NETWORK_ERROR: 'Network error occurred',
    TIMEOUT_ERROR: 'Request timeout',
    RATE_LIMIT_ERROR: 'Rate limit exceeded',
    AUTHENTICATION_ERROR: 'Authentication failed',
  },

  // Success Messages
  SUCCESS: {
    PROVIDER_ADDED: 'Provider added successfully',
    PROVIDER_UPDATED: 'Provider updated successfully',
    PROVIDER_DELETED: 'Provider deleted successfully',
    PROVIDER_TESTED: 'Provider test completed',
    MODELS_FETCHED: 'Models fetched successfully',
    MODEL_VERIFIED: 'Model verification completed',
    MODEL_BLACKLISTED: 'Model blacklisted successfully',
    ADDED_TO_POOL: 'Added to provider pool successfully',
    CONFIG_UPDATED: 'Configuration updated successfully',
    INITIALIZATION_COMPLETE: 'ProvidersManager initialized successfully',
  },

  // HTTP Headers
  HEADERS: {
    CONTENT_TYPE: 'application/json',
    AUTHORIZATION: 'Authorization',
    BEARER_PREFIX: 'Bearer ',
    X_API_KEY: 'x-api-key',
    ANTHROPIC_VERSION: 'anthropic-version',
    USER_AGENT_HEADER: 'User-Agent',
  },

  // Provider ID Generation
  ID_GENERATION: {
    PREFIX: 'provider-',
    TIMESTAMP_BASED: true,
    RANDOM_SUFFIX_LENGTH: 6,
  },

  // Configuration Keys
  CONFIG_KEYS: {
    PROVIDERS: 'providers',
    VERSION: 'version',
    LAST_UPDATED: 'last_updated',
    ROUTES: 'routes',
    GLOBAL_CONFIG: 'global_config',
    MODEL_BLACKLIST: 'model_blacklist',
    PROVIDER_POOL: 'provider_pool',
  },

  // Batch Operations
  BATCH: {
    MAX_CONCURRENT_TESTS: 5,
    MAX_CONCURRENT_MODEL_FETCHES: 3,
    BATCH_SIZE: 10,
  },
} as const;

// Type definitions for better type safety
export type ProviderProtocol = typeof PROVIDERS_MANAGER_CONSTANTS.VALIDATION.SUPPORTED_PROTOCOLS[number];
export type AuthType = typeof PROVIDERS_MANAGER_CONSTANTS.VALIDATION.SUPPORTED_AUTH_TYPES[number];
export type HttpStatus = typeof PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS[keyof typeof PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS];