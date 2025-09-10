/**
 * Complete Qwen Provider Module
 * Implements full authentication, token management, and API request functionality
 */
import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
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
export declare enum AuthState {
    UNINITIALIZED = "uninitialized",
    INITIALIZING = "initializing",
    PENDING_AUTHORIZATION = "pending_authorization",
    AUTHORIZED = "authorized",
    REFRESHING = "refreshing",
    MAINTENANCE = "maintenance",
    ERROR = "error"
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
    level: string;
    module: string;
    function: string;
    message: string;
    data?: any;
    requestId?: string;
}
/**
 * Complete Qwen Provider Module
 */
export declare class QwenProviderModule extends BasePipelineModule {
    protected config: QwenProviderConfig;
    private httpClient;
    private authState;
    private storedToken;
    private deviceCodeInfo;
    private codeVerifier;
    private maintenanceMode;
    private isRefreshing;
    private refreshTimer;
    private pollingTimer;
    private debugLogs;
    private debugLogFile;
    constructor(info: ModuleInfo);
    /**
     * Initialize the Qwen provider
     */
    initialize(): Promise<void>;
    /**
     * Get current authentication status
     */
    getAuthStatus(): {
        state: AuthState;
        isAuthorized: boolean;
        isExpired: boolean;
        expiresAt?: number;
        maintenanceMode: boolean;
        deviceCode?: string;
        userCode?: string;
        verificationUri?: string;
    };
    /**
     * Start device authorization flow
     */
    startDeviceAuthorization(): Promise<DeviceAuthorizationResponse>;
    /**
     * Get current access token
     */
    getAccessToken(): Promise<string>;
    /**
     * Process a request to Qwen API
     */
    processRequest(request: any): Promise<any>;
    /**
     * Refresh access token
     */
    refreshToken(): Promise<void>;
    /**
     * Invalidate current token
     */
    invalidateToken(): Promise<void>;
    /**
     * Get debug logs
     */
    getDebugLogs(requestId?: string): DebugLogEntry[];
    /**
     * Clear debug logs
     */
    clearDebugLogs(): void;
    /**
     * Get provider metrics
     */
    getMetrics(): {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        averageResponseTime: number;
        authState: AuthState;
        tokenRefreshCount: number;
        maintenanceModeCount: number;
    };
    /**
     * Request device authorization
     */
    private requestDeviceAuthorization;
    /**
     * Start polling for token
     */
    private startPollingForToken;
    /**
     * Stop polling for token
     */
    private stopPolling;
    /**
     * Request token with refresh token
     */
    private requestTokenWithRefreshToken;
    /**
     * Store token to files
     */
    private storeToken;
    /**
     * Load stored token from files
     */
    private loadStoredToken;
    /**
     * Check if token is expired
     */
    private isTokenExpired;
    /**
     * Setup token refresh timer
     */
    private setupTokenRefreshTimer;
    /**
     * Clear all timers
     */
    private clearTimers;
    /**
     * Enter maintenance mode
     */
    private enterMaintenanceMode;
    /**
     * Exit maintenance mode
     */
    private exitMaintenanceMode;
    /**
     * Ensure token store directory exists
     */
    private ensureTokenStoreDir;
    /**
     * Setup HTTP interceptors
     */
    private setupHttpInterceptors;
    /**
     * Make API request
     */
    private makeApiRequest;
    /**
     * Setup debug logging
     */
    private setupDebugLogging;
    /**
     * Generate PKCE code verifier
     */
    private generateCodeVerifier;
    /**
     * Generate PKCE code challenge
     */
    private generateCodeChallenge;
    /**
     * Generate request ID
     */
    private generateRequestId;
    /**
     * Enhanced logging with debug support
     */
    private logDebug;
    /**
     * Handle incoming messages
     */
    handleMessage(message: any): Promise<any>;
    /**
     * Destroy the provider
     */
    destroy(): Promise<void>;
}
