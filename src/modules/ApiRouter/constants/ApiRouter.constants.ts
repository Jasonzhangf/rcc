/**
 * API Router Constants
 */

export const API_ROUTER_CONSTANTS = {
  // Route prefixes
  ROUTES: {
    PROVIDERS: 'providers',
    CONFIG: 'config',
    BLACKLIST: 'blacklist',
    POOL: 'pool',
    MODELS: 'models',
  },
  
  // HTTP methods
  HTTP_METHODS: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH',
  },
  
  // Status codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    INTERNAL_SERVER_ERROR: 500,
  },
  
  // API path parsing
  API_PREFIX: '/api/',
  PATH_SEPARATOR: '/',
  
  // Request validation
  VALIDATION: {
    MAX_BODY_SIZE: 10 * 1024 * 1024, // 10MB
    REQUIRED_FIELDS: ['url', 'method'],
    SUPPORTED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
  
  // Response formatting
  RESPONSE_FORMAT: {
    DEFAULT_SUCCESS_MESSAGE: 'Request processed successfully',
    DEFAULT_ERROR_MESSAGE: 'Request processing failed',
    TIMESTAMP_PRECISION: 'milliseconds',
  },
  
  // Error messages
  ERRORS: {
    INVALID_REQUEST: 'Invalid API request format',
    ROUTE_NOT_FOUND: 'API route not found',
    METHOD_NOT_ALLOWED: 'HTTP method not allowed',
    HANDLER_NOT_REGISTERED: 'No handler registered for route',
    BODY_TOO_LARGE: 'Request body too large',
    MALFORMED_URL: 'Malformed API URL',
    HANDLER_ERROR: 'Handler processing error',
  },
  
  // Success messages
  SUCCESS: {
    ROUTE_REGISTERED: 'Route handler registered successfully',
    REQUEST_ROUTED: 'Request routed successfully',
    RESPONSE_CREATED: 'API response created successfully',
  },
  
  // Logging
  LOG_PREFIX: '🛣️ [ApiRouter]',
  
  // Default values
  DEFAULTS: {
    STATUS_CODE: 200,
    CONTENT_TYPE: 'application/json',
    ERROR_STATUS_CODE: 500,
  },
};