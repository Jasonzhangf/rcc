/**
 * OAuth2 Types and Interfaces
 * Simplified OAuth2 implementation with error handling integration
 */

/**
 * OAuth2 module configuration
 */
export interface OAuth2ModuleConfig {
  /** OAuth client ID */
  clientId: string;
  /** OAuth scope */
  scope: string;
  /** Device authorization endpoint */
  deviceAuthEndpoint: string;
  /** Token endpoint */
  tokenEndpoint: string;
  /** Token storage directory path */
  tokenStoragePath: string;
  /** Enable PKCE (Proof Key for Code Exchange) */
  enablePKCE?: boolean;
}

/**
 * Device authorization response
 */
export interface DeviceAuthorizationResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

/**
 * Token data structure
 */
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
  scope: string;
}

/**
 * Token status
 */
export interface TokenStatus {
  hasToken: boolean;
  isExpired: boolean;
  expiresAt?: number;
  timeUntilExpiry?: number;
  tokenType?: string;
  scope?: string;
}

/**
 * OAuth2 error codes
 */
export enum OAuth2ErrorCode {
  DEVICE_CODE_EXPIRED = 7001,
  AUTHORIZATION_PENDING = 7002,
  SLOW_DOWN = 7003,
  ACCESS_DENIED = 7004,
  INVALID_CLIENT = 7005,
  INVALID_SCOPE = 7006,
  AUTH_SERVER_ERROR = 7007,
  TEMPORARILY_UNAVAILABLE = 7008,
  INVALID_REQUEST = 7009,
  UNSUPPORTED_RESPONSE_TYPE = 7010,
  INVALID_GRANT = 7011,
  UNAUTHORIZED_CLIENT = 7012,
  INVALID_DEVICE_CODE = 7013,
  AUTHORIZATION_FAILED = 7014,
  TOKEN_REFRESH_FAILED = 7015,
  TOKEN_STORAGE_FAILED = 7016,
  CONFIGURATION_INVALID = 7017,
  INVALID_CODE_VERIFIER = 7018,
  INVALID_CODE_CHALLENGE = 7019
}

/**
 * OAuth2 authentication state
 */
export enum AuthState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  PENDING_AUTHORIZATION = 'pending_authorization',
  AUTHORIZED = 'authorized',
  ERROR = 'error'
}

/**
 * Stored token information
 */
export interface StoredTokenInfo {
  tokenData: TokenData;
  storedAt: number;
  email?: string;
}

/**
 * PKCE code pair
 */
export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

/**
 * OAuth2 module statistics
 */
export interface OAuth2Stats {
  totalAuthAttempts: number;
  successfulAuths: number;
  failedAuths: number;
  tokenRefreshes: number;
  lastError?: OAuth2ErrorCode;
  lastErrorTime?: number;
}

/**
 * Error handling context for OAuth2 operations
 */
export interface OAuth2ErrorContext {
  operation: 'device_auth' | 'token_request' | 'token_refresh' | 'token_storage';
  deviceCode?: string;
  email?: string;
  retryCount: number;
}