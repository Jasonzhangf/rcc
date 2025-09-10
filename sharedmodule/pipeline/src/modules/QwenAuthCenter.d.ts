/**
 * Qwen Authentication Center
 * Manages Qwen OAuth 2.0 Device Flow authentication and integrates with error handling system
 */
import { BaseModule } from 'rcc-basemodule';
import { Message, MessageResponse } from 'rcc-basemodule';
import { PipelineError } from '../ErrorTypes';
import { ErrorHandlerCenter } from '../ErrorHandlerCenter';
/**
 * Qwen-specific error codes
 */
export declare enum QwenAuthErrorCode {
    DEVICE_CODE_EXPIRED = 6101,
    AUTHORIZATION_PENDING = 6102,
    SLOW_DOWN = 6103,
    ACCESS_DENIED = 6104,
    INVALID_CLIENT = 6105,
    INVALID_SCOPE = 6106,
    AUTH_SERVER_ERROR = 6107,
    TEMPORARILY_UNAVAILABLE = 6108,
    INVALID_REQUEST = 6109,
    UNSUPPORTED_RESPONSE_TYPE = 6110,
    INVALID_GRANT = 6111,
    UNAUTHORIZED_CLIENT = 6112,
    INVALID_DEVICE_CODE = 6113,
    AUTHORIZATION_FAILED = 6114,
    TOKEN_REFRESH_FAILED = 6115,
    TOKEN_STORAGE_FAILED = 6116,
    CONFIGURATION_INVALID = 6117
}
/**
 * Qwen authentication configuration
 */
export interface QwenAuthConfig {
    /** OAuth client ID */
    clientId: string;
    /** OAuth scope */
    scope: string;
    /** Device authorization endpoint */
    deviceAuthEndpoint: string;
    /** Token endpoint */
    tokenEndpoint: string;
    /** Access token file path */
    accessTokenFile: string;
    /** Refresh token file path */
    refreshTokenFile: string;
    /** Token refresh threshold (in milliseconds) */
    refreshThreshold: number;
    /** Device code polling interval (in milliseconds) */
    pollingInterval: number;
    /** Maximum polling attempts */
    maxPollingAttempts: number;
    /** Enable PKCE (Proof Key for Code Exchange) */
    enablePKCE: boolean;
    /** Maintenance mode callback function name */
    maintenanceCallback?: string;
    /** Workspace ID */
    workspaceId?: string;
    /** App ID */
    appId?: string;
}
/**
 * OAuth device authorization response
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
 * OAuth token response
 */
export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    created_at: number;
}
/**
 * Stored token data
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
 * Authentication state
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
 * Authentication status
 */
export interface AuthStatus {
    state: AuthState;
    isAuthorized: boolean;
    isExpired: boolean;
    expiresAt?: number;
    timeUntilExpiry?: number;
    lastError?: PipelineError;
    maintenanceMode: boolean;
    deviceCode?: string;
    userCode?: string;
    verificationUri?: string;
}
/**
 * Qwen Authentication Center
 */
export declare class QwenAuthCenter extends BaseModule {
    private config;
    private errorHandlerCenter;
    private authState;
    private storedToken;
    private deviceCodeInfo;
    private maintenanceMode;
    private pollingTimer;
    private refreshTimer;
    private codeVerifier;
    private authStats;
    constructor(config: QwenAuthConfig, errorHandlerCenter: ErrorHandlerCenter);
    /**
     * Initialize the authentication center
     */
    initialize(): Promise<void>;
    /**
     * Get current authentication status
     */
    getAuthStatus(): AuthStatus;
    /**
     * Get current access token
     */
    getAccessToken(): Promise<string>;
    /**
     * Start device authorization flow
     */
    startDeviceAuthorization(): Promise<DeviceAuthorizationResponse>;
    /**
     * Refresh access token
     */
    refreshToken(): Promise<void>;
    /**
     * Invalidate current token and force re-authorization
     */
    invalidateToken(): Promise<void>;
    /**
     * Handle token refresh instruction from scheduler
     */
    handleTokenRefreshInstruction(): Promise<void>;
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
     * Set up token refresh timer
     */
    private setupTokenRefreshTimer;
    /**
     * Enter maintenance mode
     */
    private enterMaintenanceMode;
    /**
     * Exit maintenance mode
     */
    private exitMaintenanceMode;
    /**
     * Clear all timers
     */
    private clearTimers;
    /**
     * Ensure auth directory exists
     */
    private ensureAuthDirectory;
    /**
     * Validate configuration
     */
    private validateConfig;
    /**
     * Register error handlers with error handling center
     */
    private registerErrorHandlers;
    /**
     * Handle token expired error
     */
    private handleTokenExpiredError;
    /**
     * Handle authentication failed error
     */
    private handleAuthenticationFailedError;
    /**
     * Register message handlers
     */
    private registerMessageHandlers;
    /**
     * Generate PKCE code verifier
     */
    private generateCodeVerifier;
    /**
     * Generate PKCE code challenge
     */
    private generateCodeChallenge;
    /**
     * Create authentication error
     */
    private createAuthError;
    /**
     * Handle incoming messages
     */
    handleMessage(message: Message): Promise<MessageResponse | void>;
    /**
     * Get authentication statistics
     */
    getAuthStats(): {
        totalAuthAttempts: number;
        successfulAuths: number;
        failedAuths: number;
        tokenRefreshes: number;
        maintenanceSwitches: number;
    };
    /**
     * Destroy the authentication center
     */
    destroy(): Promise<void>;
}
