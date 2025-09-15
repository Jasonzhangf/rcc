/**
 * Qwen Provider Module Configuration Types
 */

/**
 * Qwen Provider Configuration
 */
export interface QwenProviderConfig {
  /** Provider type - always 'qwen' */
  provider: 'qwen';
  /** Qwen API endpoint */
  endpoint: string;
  /** Authentication configuration */
  auth: QwenAuthConfig;
  /** Model configuration */
  model?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retries */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Enable request/response logging */
  enableLogging?: boolean;
  /** Debug configuration */
  debug?: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logDir?: string;
    maxLogFiles?: number;
    maxFileSize?: number;
  };
}

/**
 * Qwen Authentication Configuration
 */
export interface QwenAuthConfig {
  /** Authentication type */
  type: 'qwen' | 'oauth2' | 'api_key';
  /** Access token file path */
  accessTokenFile: string;
  /** Refresh token file path */
  refreshTokenFile: string;
  /** Token store directory */
  tokenStoreDir?: string;
  /** Auto refresh token */
  autoRefresh?: boolean;
  /** Token refresh threshold (milliseconds) */
  refreshThreshold?: number;
  /** Device flow configuration */
  deviceFlow?: {
    enabled: boolean;
    clientId: string;
    scope: string;
    pkce: boolean;
    authEndpoint: string;
    tokenEndpoint: string;
    pollingInterval?: number;
    maxPollingAttempts?: number;
  };
  /** Maintenance mode callback */
  onMaintenanceMode?: (enabled: boolean) => void;
}

/**
 * Authentication State
 */
export enum AuthState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  PENDING_AUTHORIZATION = 'pending_authorization',
  AUTHORIZED = 'authorized',
  REFRESHING = 'refreshing',
  MAINTENANCE = 'maintenance',
  ERROR = 'error'
}

/**
 * Stored Token Data
 */
export interface StoredToken {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
  scope: string;
  createdAt: number;
  expires_in?: number;
}

/**
 * Device Authorization Response
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
 * Token Response
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  created_at?: number;
}

/**
 * Debug Log Entry
 */
export interface DebugLogEntry {
  timestamp: number;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  moduleId: string;
  method?: string;
}

/**
 * Provider Metrics
 */
export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  authState: AuthState;
  tokenRefreshCount: number;
  maintenanceModeCount: number;
}

/**
 * Authentication Status
 */
export interface AuthStatus {
  state: AuthState;
  isAuthorized: boolean;
  isExpired: boolean;
  expiresAt?: number;
  maintenanceMode: boolean;
  deviceCode?: string;
  userCode?: string;
  verificationUri?: string;
}

/**
 * OpenAI-compatible Chat Request
 */
export interface OpenAIChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
}

/**
 * OpenAI-compatible Chat Response
 */
export interface OpenAIChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: 'stop' | 'length' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}