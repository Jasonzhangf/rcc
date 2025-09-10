import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import { AxiosInstance } from 'axios';
/**
 * Provider Module Configuration
 */
export interface ProviderConfig {
    /** Provider type */
    provider: string;
    /** API endpoint */
    endpoint: string;
    /** Authentication configuration */
    auth: AuthConfig;
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
    /** Qwen specific configuration */
    qwenConfig?: QwenConfig;
}
/**
 * Qwen Provider Configuration
 */
export interface QwenConfig {
    /** Workspace ID */
    workspaceId?: string;
    /** App ID */
    appId?: string;
    /** API version */
    apiVersion?: string;
    /** Region */
    region?: string;
    /** Enable parameter encryption */
    enableEncryption?: boolean;
    /** Custom parameters */
    customParams?: Record<string, any>;
}
/**
 * Authentication Configuration
 */
export interface AuthConfig {
    /** Authentication type */
    type: 'api_key' | 'oauth2' | 'jwt' | 'custom' | 'qwen';
    /** API key (for api_key type) */
    apiKey?: string;
    /** Token (for jwt/oauth2 type) */
    token?: string;
    /** Custom auth function (for custom type) */
    customAuth?: (request: any) => Promise<AuthResult>;
    /** OAuth2 configuration */
    oauth2?: OAuth2Config;
    /** Qwen authentication configuration */
    qwenAuth?: QwenAuthConfig;
}
/**
 * Qwen Authentication Configuration
 */
export interface QwenAuthConfig {
    /** Access token */
    accessToken?: string;
    /** Refresh token */
    refreshToken?: string;
    /** Token store path */
    tokenStorePath?: string;
    /** Auto refresh token */
    autoRefresh?: boolean;
    /** Device flow configuration */
    deviceFlow?: {
        enabled: boolean;
        clientId: string;
        scope: string;
        pkce: boolean;
    };
    /** Token expiration timestamp */
    expiresAt?: number;
}
/**
 * OAuth2 Configuration
 */
export interface OAuth2Config {
    /** Client ID */
    clientId: string;
    /** Client secret */
    clientSecret?: string;
    /** Token endpoint */
    tokenEndpoint: string;
    /** Refresh token */
    refreshToken?: string;
    /** Scope */
    scope?: string;
    /** PKCE configuration */
    pkce?: {
        enabled: boolean;
        codeVerifier?: string;
        codeChallenge?: string;
    };
}
/**
 * Authentication Result
 */
export interface AuthResult {
    /** Authentication token */
    token: string;
    /** Token type */
    tokenType: string;
    /** Expiration time */
    expiresAt?: number;
    /** Refresh token */
    refreshToken?: string;
}
/**
 * HTTP Request Options
 */
export interface HttpRequestOptions {
    /** HTTP method */
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    /** Request URL */
    url: string;
    /** Request headers */
    headers?: Record<string, string>;
    /** Request data */
    data?: any;
    /** Query parameters */
    params?: Record<string, any>;
    /** Request timeout */
    timeout?: number;
}
/**
 * Qwen Device Authorization Response
 */
export interface QwenDeviceAuthorizationResponse {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    expires_in: number;
    interval: number;
}
/**
 * Qwen Token Response
 */
export interface QwenTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    created_at: number;
}
export declare class ProviderModule extends BasePipelineModule {
    protected config: ProviderConfig;
    protected httpClient: AxiosInstance;
    private tokenCache;
    private tokenStoreFile?;
    constructor(info: ModuleInfo);
    /**
     * Configure the Provider module
     * @param config - Configuration object
     */
    configure(config: ProviderConfig): Promise<void>;
    /**
     * Process request - Send request to provider
     * @param request - Input request
     * @returns Promise<any> - Provider response
     */
    process(request: any): Promise<any>;
    /**
     * Process response - Handle response processing
     * @param response - Input response data
     * @returns Promise<any> - Processed response data
     */
    processResponse(response: any): Promise<any>;
    /**
     * Initialize Qwen specific configuration
     */
    private initializeQwenConfig;
    /**
     * Get authentication token
     * @returns Promise<string> - Authentication token
     */
    private getAuthToken;
    /**
     * Authenticate with API key
     * @returns Promise<AuthResult> - Authentication result
     */
    private authenticateWithApiKey;
    /**
     * Authenticate with OAuth2
     * @returns Promise<AuthResult> - Authentication result
     */
    private authenticateWithOAuth2;
    /**
     * Refresh OAuth2 token
     * @param oauth2Config - OAuth2 configuration
     * @returns Promise<AuthResult> - Authentication result
     */
    private refreshOAuth2Token;
    /**
     * Perform OAuth2 device flow
     * @param oauth2Config - OAuth2 configuration
     * @returns Promise<AuthResult> - Authentication result
     */
    private performOAuth2DeviceFlow;
    /**
     * Poll for device token
     * @param oauth2Config - OAuth2 configuration
     * @param deviceAuth - Device authorization response
     * @returns Promise<AuthResult> - Authentication result
     */
    private pollForDeviceToken;
    /**
     * Authenticate with JWT
     * @returns Promise<AuthResult> - Authentication result
     */
    private authenticateWithJWT;
    /**
     * Authenticate with Qwen
     * @returns Promise<AuthResult> - Authentication result
     */
    private authenticateWithQwen;
    /**
     * Check if Qwen token is valid
     * @param qwenAuth - Qwen auth configuration
     * @returns boolean - Whether token is valid
     */
    private isQwenTokenValid;
    /**
     * Refresh Qwen token
     * @param qwenAuth - Qwen auth configuration
     * @returns Promise<AuthResult> - Authentication result
     */
    private refreshQwenToken;
    /**
     * Authenticate with Qwen device flow
     * @param deviceFlow - Device flow configuration
     * @returns Promise<AuthResult> - Authentication result
     */
    private authenticateWithQwenDeviceFlow;
    /**
     * Generate PKCE codes
     * @returns { verifier: string; challenge: string } - PKCE codes
     */
    private generatePKCECodes;
    /**
     * Authenticate with custom function
     * @returns Promise<AuthResult> - Authentication result
     */
    private authenticateWithCustom;
    /**
     * Check if token is valid
     * @param authResult - Authentication result
     * @returns boolean - Whether token is valid
     */
    private isTokenValid;
    /**
     * Build HTTP request
     * @param request - Original request data
     * @param authToken - Authentication token
     * @returns Promise<HttpRequestOptions> - HTTP request options
     */
    private buildHttpRequest;
    /**
     * Process Qwen specific request
     * @param request - Original request
     * @returns Promise<any> - Processed request
     */
    private processQwenRequest;
    /**
     * Process Qwen specific response
     * @param response - Original response
     * @returns Promise<any> - Processed response
     */
    private processQwenResponse;
    /**
     * Extract response data
     * @param response - Raw response data
     * @returns any - Extracted response data
     */
    private extractResponseData;
    /**
     * Send request with retry logic
     * @param httpRequest - HTTP request options
     * @returns Promise<AxiosResponse> - HTTP response
     */
    private sendRequestWithRetry;
    /**
     * Load tokens from file
     */
    private loadTokensFromFile;
    /**
     * Save tokens to file
     */
    private saveTokensToFile;
    /**
     * Set up HTTP interceptors for logging
     */
    private setupInterceptors;
    /**
     * Delay execution
     * @param ms - Milliseconds to delay
     * @returns Promise<void>
     */
    private delay;
}
