/**
 * OAuth2 Constants
 */

/**
 * Default OAuth2 configuration values
 */
export const DEFAULT_OAUTH2_CONFIG = {
  /** Default PKCE enablement */
  enablePKCE: true,
  /** Default token storage directory */
  defaultTokenStoragePath: './tokens/',
  /** Default device code expiration buffer (5 minutes) */
  deviceCodeExpirationBuffer: 300000,
  /** Default token expiration buffer (5 minutes) */
  tokenExpirationBuffer: 300000,
  /** Default polling interval hint for external components */
  defaultPollingInterval: 5000,
  /** Default maximum polling attempts hint for external components */
  defaultMaxPollingAttempts: 60
};

/**
 * OAuth2 error messages
 */
export const OAUTH2_ERROR_MESSAGES = {
  [7001]: 'Device code has expired',
  [7002]: 'Authorization pending',
  [7003]: 'Slow down polling',
  [7004]: 'Access denied by user',
  [7005]: 'Invalid client credentials',
  [7006]: 'Invalid scope requested',
  [7007]: 'Authentication server error',
  [7008]: 'Service temporarily unavailable',
  [7009]: 'Invalid request parameters',
  [7010]: 'Unsupported response type',
  [7011]: 'Invalid grant type',
  [7012]: 'Unauthorized client',
  [7013]: 'Invalid device code',
  [7014]: 'Authorization failed',
  [7015]: 'Token refresh failed',
  [7016]: 'Token storage failed',
  [7017]: 'Invalid configuration',
  [7018]: 'Invalid code verifier',
  [7019]: 'Invalid code challenge'
};

/**
 * OAuth2 error categories
 */
export const OAUTH2_ERROR_CATEGORIES = {
  CONFIGURATION: [7005, 7006, 7009, 7010, 7011, 7012, 7017, 7018, 7019],
  AUTHORIZATION: [7001, 7002, 7003, 7004, 7013, 7014],
  SERVER: [7007, 7008],
  TOKEN: [7015, 7016],
  STORAGE: [7016]
};

/**
 * OAuth2 HTTP status codes
 */
export const OAUTH2_HTTP_STATUS = {
  [7001]: 400, // DEVICE_CODE_EXPIRED
  [7002]: 400, // AUTHORIZATION_PENDING
  [7003]: 400, // SLOW_DOWN
  [7004]: 403, // ACCESS_DENIED
  [7005]: 401, // INVALID_CLIENT
  [7006]: 400, // INVALID_SCOPE
  [7007]: 500, // AUTH_SERVER_ERROR
  [7008]: 503, // TEMPORARILY_UNAVAILABLE
  [7009]: 400, // INVALID_REQUEST
  [7010]: 400, // UNSUPPORTED_RESPONSE_TYPE
  [7011]: 400, // INVALID_GRANT
  [7012]: 401, // UNAUTHORIZED_CLIENT
  [7013]: 400, // INVALID_DEVICE_CODE
  [7014]: 401, // AUTHORIZATION_FAILED
  [7015]: 401, // TOKEN_REFRESH_FAILED
  [7016]: 500, // TOKEN_STORAGE_FAILED
  [7017]: 500, // CONFIGURATION_INVALID
  [7018]: 400, // INVALID_CODE_VERIFIER
  [7019]: 400  // INVALID_CODE_CHALLENGE
};

/**
 * File naming patterns
 */
export const TOKEN_FILE_PATTERNS = {
  /** Token file extension */
  extension: '.json',
  /** Token file prefix */
  prefix: 'oauth2-token-',
  /** Refresh token file suffix */
  refreshTokenSuffix: '-refresh'
};

/**
 * Supported content types
 */
export const CONTENT_TYPES = {
  FORM_URL_ENCODED: 'application/x-www-form-urlencoded',
  JSON: 'application/json'
};

/**
 * Grant types
 */
export const GRANT_TYPES = {
  DEVICE_CODE: 'urn:ietf:params:oauth:grant-type:device_code',
  REFRESH_TOKEN: 'refresh_token'
};

/**
 * PKCE challenge methods
 */
export const PKCE_CHALLENGE_METHODS = {
  S256: 'S256',
  PLAIN: 'plain'
} as const;