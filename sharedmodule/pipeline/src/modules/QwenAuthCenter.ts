/**
 * Qwen Authentication Center
 * Manages Qwen OAuth 2.0 Device Flow authentication and integrates with error handling system
 */

import { BaseModule } from 'rcc-basemodule';
import { ModuleInfo, Message, MessageResponse } from 'rcc-basemodule';
import { 
  PipelineError, 
  PipelineErrorCode, 
  PipelineErrorCategory,
  PipelineExecutionContext,
  ErrorHandlingAction,
  ErrorHandlerFunction
} from '../ErrorTypes';
import { ErrorHandlerCenter } from '../ErrorHandlerCenter';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { createHash, randomBytes } from 'crypto';

/**
 * Qwen-specific error codes
 */
export enum QwenAuthErrorCode {
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
export class QwenAuthCenter extends BaseModule {
  private config: QwenAuthConfig;
  private errorHandlerCenter: ErrorHandlerCenter;
  private authState: AuthState = AuthState.UNINITIALIZED;
  private storedToken: StoredToken | null = null;
  private deviceCodeInfo: DeviceAuthorizationResponse | null = null;
  private maintenanceMode: boolean = false;
  private pollingTimer: NodeJS.Timeout | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private codeVerifier: string | null = null;
  private authStats: {
    totalAuthAttempts: number;
    successfulAuths: number;
    failedAuths: number;
    tokenRefreshes: number;
    maintenanceSwitches: number;
  };

  constructor(config: QwenAuthConfig, errorHandlerCenter: ErrorHandlerCenter) {
    const moduleInfo: ModuleInfo = {
      id: 'qwen-auth-center',
      name: 'QwenAuthCenter',
      version: '1.0.0',
      description: 'Qwen OAuth 2.0 Device Flow authentication center',
      type: 'authentication',
      dependencies: ['error-handler-center'],
      config: config
    };

    super(moduleInfo);
    
    this.config = config;
    this.errorHandlerCenter = errorHandlerCenter;
    this.authStats = {
      totalAuthAttempts: 0,
      successfulAuths: 0,
      failedAuths: 0,
      tokenRefreshes: 0,
      maintenanceSwitches: 0
    };

    this.logInfo('Qwen authentication center created', { config }, 'constructor');
  }

  /**
   * Initialize the authentication center
   */
  public override async initialize(): Promise<void> {
    try {
      await super.initialize();
      
      this.logInfo('Initializing Qwen authentication center', { config: this.config }, 'initialize');
      
      // Validate configuration
      this.validateConfig();
      
      // Create auth directory if it doesn't exist
      await this.ensureAuthDirectory();
      
      // Register error handlers with error handling center
      this.registerErrorHandlers();
      
      // Register message handlers
      this.registerMessageHandlers();
      
      // Load existing token if available
      await this.loadStoredToken();
      
      // Set up token refresh timer if token exists
      if (this.storedToken && !this.isTokenExpired()) {
        this.setupTokenRefreshTimer();
        this.authState = AuthState.AUTHORIZED;
      } else {
        this.authState = AuthState.UNINITIALIZED;
      }
      
      this.logInfo('Qwen authentication center initialized successfully', { 
        state: this.authState,
        hasToken: !!this.storedToken 
      }, 'initialize');
    } catch (error) {
      this.logError('Failed to initialize Qwen authentication center', error, 'initialize');
      this.authState = AuthState.ERROR;
      throw error;
    }
  }

  /**
   * Get current authentication status
   */
  public getAuthStatus(): AuthStatus {
    const now = Date.now();
    const isExpired = this.storedToken ? this.storedToken.expiresAt <= now : true;
    
    return {
      state: this.authState,
      isAuthorized: this.authState === AuthState.AUTHORIZED && !isExpired,
      isExpired,
      expiresAt: this.storedToken?.expiresAt,
      timeUntilExpiry: this.storedToken ? Math.max(0, this.storedToken.expiresAt - now) : undefined,
      lastError: undefined, // UnderConstruction: error tracking feature
      maintenanceMode: this.maintenanceMode,
      deviceCode: this.deviceCodeInfo?.device_code,
      userCode: this.deviceCodeInfo?.user_code,
      verificationUri: this.deviceCodeInfo?.verification_uri
    };
  }

  /**
   * Get current access token
   */
  public async getAccessToken(): Promise<string> {
    if (!this.storedToken || this.isTokenExpired()) {
      throw this.createAuthError(
        QwenAuthErrorCode.TOKEN_REFRESH_FAILED,
        'No valid access token available'
      );
    }
    
    return this.storedToken.accessToken;
  }

  /**
   * Start device authorization flow
   */
  public async startDeviceAuthorization(): Promise<DeviceAuthorizationResponse> {
    try {
      this.authState = AuthState.INITIALIZING;
      this.authStats.totalAuthAttempts++;
      
      this.logInfo('Starting device authorization flow', {}, 'startDeviceAuthorization');
      
      // Generate PKCE code verifier and challenge if enabled
      if (this.config.enablePKCE) {
        this.codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
        
        this.logDebug('PKCE codes generated', { 
          hasCodeVerifier: !!this.codeVerifier,
          codeChallenge: codeChallenge.substring(0, 10) + '...' 
        }, 'startDeviceAuthorization');
      }
      
      // Request device authorization
      const deviceAuthResponse = await this.requestDeviceAuthorization();
      this.deviceCodeInfo = deviceAuthResponse;
      
      this.authState = AuthState.PENDING_AUTHORIZATION;
      
      this.logInfo('Device authorization initiated', {
        deviceCode: deviceAuthResponse.device_code,
        userCode: deviceAuthResponse.user_code,
        verificationUri: deviceAuthResponse.verification_uri
      }, 'startDeviceAuthorization');
      
      // Start polling for token
      this.startPollingForToken();
      
      return deviceAuthResponse;
    } catch (error) {
      this.authState = AuthState.ERROR;
      this.authStats.failedAuths++;
      
      this.logError('Device authorization failed', error, 'startDeviceAuthorization');
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  public async refreshToken(): Promise<void> {
    try {
      if (!this.storedToken?.refreshToken) {
        throw this.createAuthError(
          QwenAuthErrorCode.TOKEN_REFRESH_FAILED,
          'No refresh token available'
        );
      }
      
      this.authState = AuthState.REFRESHING;
      this.enterMaintenanceMode();
      
      this.logInfo('Refreshing access token', {}, 'refreshToken');
      
      // Request new token using refresh token
      const newToken = await this.requestTokenWithRefreshToken(this.storedToken.refreshToken);
      
      // Store new token
      await this.storeToken(newToken);
      
      this.authState = AuthState.AUTHORIZED;
      this.authStats.tokenRefreshes++;
      
      // Set up new refresh timer
      this.setupTokenRefreshTimer();
      
      this.exitMaintenanceMode();
      
      this.logInfo('Access token refreshed successfully', {
        expiresAt: newToken.expiresAt,
        expiresIn: newToken.expiresIn
      }, 'refreshToken');
    } catch (error) {
      this.authState = AuthState.ERROR;
      this.authStats.failedAuths++;
      
      this.logError('Token refresh failed', error, 'refreshToken');
      throw error;
    }
  }

  /**
   * Invalidate current token and force re-authorization
   */
  public async invalidateToken(): Promise<void> {
    this.logInfo('Invalidating token and forcing re-authorization', {}, 'invalidateToken');
    
    // Clear stored token
    this.storedToken = null;
    
    // Delete token files
    try {
      if (fs.existsSync(this.config.accessTokenFile)) {
        fs.unlinkSync(this.config.accessTokenFile);
      }
      if (fs.existsSync(this.config.refreshTokenFile)) {
        fs.unlinkSync(this.config.refreshTokenFile);
      }
    } catch (error) {
      this.logWarn('Failed to delete token files', error, 'invalidateToken');
    }
    
    // Clear timers
    this.clearTimers();
    
    // Reset state
    this.authState = AuthState.UNINITIALIZED;
    this.deviceCodeInfo = null;
    
    this.logInfo('Token invalidated successfully', {}, 'invalidateToken');
  }

  /**
   * Handle token refresh instruction from scheduler
   */
  public async handleTokenRefreshInstruction(): Promise<void> {
    this.logInfo('Received token refresh instruction from scheduler', {}, 'handleTokenRefreshInstruction');
    
    try {
      await this.refreshToken();
      
      // Notify scheduler that refresh is complete
      this.sendMessage('token_refresh_complete', {
        success: true,
        pipelineId: this.moduleInfo.id,
        timestamp: Date.now()
      });
    } catch (error) {
      // Notify scheduler that refresh failed
      this.sendMessage('token_refresh_failed', {
        success: false,
        pipelineId: this.moduleInfo.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * Request device authorization
   */
  private async requestDeviceAuthorization(): Promise<DeviceAuthorizationResponse> {
    const params: Record<string, string> = {
      client_id: this.config.clientId,
      scope: this.config.scope
    };
    
    if (this.config.enablePKCE && this.codeVerifier) {
      params.code_challenge = await this.generateCodeChallenge(this.codeVerifier);
      params.code_challenge_method = 'S256';
    }
    
    const response = await axios.post(this.config.deviceAuthEndpoint, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return response.data;
  }

  /**
   * Start polling for token
   */
  private startPollingForToken(): void {
    let attempts = 0;
    
    const poll = async () => {
      try {
        if (attempts >= this.config.maxPollingAttempts) {
          this.stopPolling();
          this.authState = AuthState.ERROR;
          throw this.createAuthError(
            QwenAuthErrorCode.DEVICE_CODE_EXPIRED,
            'Maximum polling attempts exceeded'
          );
        }
        
        attempts++;
        
        const params: Record<string, string> = {
          client_id: this.config.clientId,
          device_code: this.deviceCodeInfo!.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        };
        
        if (this.config.enablePKCE && this.codeVerifier) {
          params.code_verifier = this.codeVerifier;
        }
        
        const response = await axios.post(this.config.tokenEndpoint, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        // Token received successfully
        const tokenData = response.data;
        const storedToken: StoredToken = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type,
          expiresAt: Date.now() + (tokenData.expires_in * 1000),
          scope: tokenData.scope,
          createdAt: Date.now()
        };
        
        await this.storeToken(storedToken);
        this.stopPolling();
        
        this.authState = AuthState.AUTHORIZED;
        this.authStats.successfulAuths++;
        
        this.setupTokenRefreshTimer();
        
        this.logInfo('Token received successfully', {
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope
        }, 'startPollingForToken');
        
      } catch (error: any) {
        if (axios.isAxiosError(error) && error.response) {
          const errorCode = error.response.data.error;
          
          switch (errorCode) {
            case 'authorization_pending':
              // Continue polling
              this.pollingTimer = setTimeout(poll, this.config.pollingInterval);
              return;
              
            case 'slow_down':
              // Slow down polling
              this.pollingTimer = setTimeout(poll, this.config.pollingInterval * 2);
              return;
              
            case 'expired_token':
            case 'invalid_device_code':
              this.stopPolling();
              this.authState = AuthState.ERROR;
              throw this.createAuthError(
                QwenAuthErrorCode.DEVICE_CODE_EXPIRED,
                'Device code expired or invalid'
              );
              
            case 'access_denied':
              this.stopPolling();
              this.authState = AuthState.ERROR;
              throw this.createAuthError(
                QwenAuthErrorCode.ACCESS_DENIED,
                'User denied authorization'
              );
              
            default:
              this.stopPolling();
              this.authState = AuthState.ERROR;
              throw this.createAuthError(
                QwenAuthErrorCode.AUTH_SERVER_ERROR,
                `Authentication server error: ${errorCode}`
              );
          }
        } else {
          this.stopPolling();
          this.authState = AuthState.ERROR;
          throw error;
        }
      }
    };
    
    // Start polling
    this.pollingTimer = setTimeout(poll, this.config.pollingInterval);
  }

  /**
   * Stop polling for token
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Request token with refresh token
   */
  private async requestTokenWithRefreshToken(refreshToken: string): Promise<StoredToken> {
    const params = {
      client_id: this.config.clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    };
    
    const response = await axios.post(this.config.tokenEndpoint, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const tokenData = response.data;
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken, // Use new refresh token if provided
      tokenType: tokenData.token_type,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      scope: tokenData.scope,
      createdAt: Date.now()
    };
  }

  /**
   * Store token to files
   */
  private async storeToken(token: StoredToken): Promise<void> {
    try {
      // Store access token
      fs.writeFileSync(this.config.accessTokenFile, JSON.stringify({
        access_token: token.accessToken,
        token_type: token.tokenType,
        expires_in: Math.floor((token.expiresAt - Date.now()) / 1000),
        scope: token.scope,
        created_at: Math.floor(token.createdAt / 1000)
      }), 'utf-8');
      
      // Store refresh token
      fs.writeFileSync(this.config.refreshTokenFile, JSON.stringify({
        refresh_token: token.refreshToken,
        created_at: Math.floor(token.createdAt / 1000)
      }), 'utf-8');
      
      this.storedToken = token;
      
      this.logDebug('Token stored successfully', {}, 'storeToken');
    } catch (error) {
      throw this.createAuthError(
        QwenAuthErrorCode.TOKEN_STORAGE_FAILED,
        `Failed to store token: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load stored token from files
   */
  private async loadStoredToken(): Promise<void> {
    try {
      if (!fs.existsSync(this.config.accessTokenFile) || !fs.existsSync(this.config.refreshTokenFile)) {
        return;
      }
      
      // Load access token
      const accessTokenData = JSON.parse(fs.readFileSync(this.config.accessTokenFile, 'utf-8'));
      const refreshTokenData = JSON.parse(fs.readFileSync(this.config.refreshTokenFile, 'utf-8'));
      
      this.storedToken = {
        accessToken: accessTokenData.access_token,
        refreshToken: refreshTokenData.refresh_token,
        tokenType: accessTokenData.token_type,
        expiresAt: (accessTokenData.created_at * 1000) + (accessTokenData.expires_in * 1000),
        scope: accessTokenData.scope,
        createdAt: accessTokenData.created_at * 1000
      };
      
      this.logDebug('Token loaded successfully', {
        expiresAt: this.storedToken.expiresAt,
        isExpired: this.isTokenExpired()
      }, 'loadStoredToken');
    } catch (error) {
      this.logWarn('Failed to load stored token', error, 'loadStoredToken');
      this.storedToken = null;
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.storedToken) {
      return true;
    }
    
    const now = Date.now();
    const expiryThreshold = this.config.refreshThreshold;
    
    return this.storedToken.expiresAt <= (now + expiryThreshold);
  }

  /**
   * Set up token refresh timer
   */
  private setupTokenRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    if (!this.storedToken) {
      return;
    }
    
    const now = Date.now();
    const refreshTime = this.storedToken.expiresAt - this.config.refreshThreshold;
    const delay = Math.max(0, refreshTime - now);
    
    this.refreshTimer = setTimeout(async () => {
      try {
        this.logInfo('Token refresh timer triggered', {}, 'setupTokenRefreshTimer');
        await this.refreshToken();
      } catch (error) {
        this.logError('Automatic token refresh failed', error, 'setupTokenRefreshTimer');
      }
    }, delay);
    
    this.logDebug('Token refresh timer set', {
      refreshTime: new Date(refreshTime).toISOString(),
      delay: delay
    }, 'setupTokenRefreshTimer');
  }

  /**
   * Enter maintenance mode
   */
  private enterMaintenanceMode(): void {
    this.maintenanceMode = true;
    this.authStats.maintenanceSwitches++;
    
    this.logInfo('Entering maintenance mode', {}, 'enterMaintenanceMode');
    
    // Notify error handling center
    this.errorHandlerCenter.sendMessage('pipeline_maintenance', {
      pipelineId: this.moduleInfo.id,
      instanceId: this.moduleInfo.id,
      error: this.createAuthError(
        QwenAuthErrorCode.TOKEN_REFRESH_FAILED,
        'Token refresh in progress'
      )
    });
    
    // Execute maintenance callback if provided
    if (this.config.maintenanceCallback) {
      this.sendMessage(this.config.maintenanceCallback, {
        action: 'enter_maintenance',
        pipelineId: this.moduleInfo.id,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Exit maintenance mode
   */
  private exitMaintenanceMode(): void {
    this.maintenanceMode = false;
    
    this.logInfo('Exiting maintenance mode', {}, 'exitMaintenanceMode');
    
    // Notify error handling center
    this.sendMessage('pipeline_maintenance_complete', {
      pipelineId: this.moduleInfo.id,
      instanceId: this.moduleInfo.id,
      timestamp: Date.now()
    });
    
    // Execute maintenance callback if provided
    if (this.config.maintenanceCallback) {
      this.sendMessage(this.config.maintenanceCallback, {
        action: 'exit_maintenance',
        pipelineId: this.moduleInfo.id,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.stopPolling();
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Ensure auth directory exists
   */
  private async ensureAuthDirectory(): Promise<void> {
    const authDir = path.dirname(this.config.accessTokenFile);
    
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.clientId) {
      throw this.createAuthError(
        QwenAuthErrorCode.CONFIGURATION_INVALID,
        'Client ID is required'
      );
    }
    
    if (!this.config.scope) {
      throw this.createAuthError(
        QwenAuthErrorCode.CONFIGURATION_INVALID,
        'Scope is required'
      );
    }
    
    if (!this.config.deviceAuthEndpoint) {
      throw this.createAuthError(
        QwenAuthErrorCode.CONFIGURATION_INVALID,
        'Device authorization endpoint is required'
      );
    }
    
    if (!this.config.tokenEndpoint) {
      throw this.createAuthError(
        QwenAuthErrorCode.CONFIGURATION_INVALID,
        'Token endpoint is required'
      );
    }
    
    if (!this.config.accessTokenFile) {
      throw this.createAuthError(
        QwenAuthErrorCode.CONFIGURATION_INVALID,
        'Access token file path is required'
      );
    }
    
    if (!this.config.refreshTokenFile) {
      throw this.createAuthError(
        QwenAuthErrorCode.CONFIGURATION_INVALID,
        'Refresh token file path is required'
      );
    }
  }

  /**
   * Register error handlers with error handling center
   */
  private registerErrorHandlers(): void {
    // Register custom error handler for Qwen authentication errors
    this.errorHandlerCenter.registerCustomHandler(
      PipelineErrorCode.TOKEN_EXPIRED,
      this.handleTokenExpiredError.bind(this)
    );
    
    this.errorHandlerCenter.registerCustomHandler(
      PipelineErrorCode.AUTHENTICATION_FAILED,
      this.handleAuthenticationFailedError.bind(this)
    );
    
    this.logInfo('Qwen authentication error handlers registered', {}, 'registerErrorHandlers');
  }

  /**
   * Handle token expired error
   */
  private async handleTokenExpiredError(
    error: PipelineError, 
    context: PipelineExecutionContext
  ): Promise<ErrorHandlingAction> {
    this.logInfo('Handling token expired error', { error, context }, 'handleTokenExpiredError');
    
    // Send token refresh instruction to scheduler
    this.sendMessage('token_refresh_required', {
      pipelineId: context.pipelineId,
      instanceId: context.instanceId,
      error,
      timestamp: Date.now()
    });
    
    return {
      action: 'maintenance',
      shouldRetry: false,
      message: 'Token expired, refresh required'
    };
  }

  /**
   * Handle authentication failed error
   */
  private async handleAuthenticationFailedError(
    error: PipelineError, 
    context: PipelineExecutionContext
  ): Promise<ErrorHandlingAction> {
    this.logInfo('Handling authentication failed error', { error, context }, 'handleAuthenticationFailedError');
    
    // Try to refresh token
    try {
      await this.refreshToken();
      
      return {
        action: 'retry',
        shouldRetry: true,
        retryDelay: 1000,
        message: 'Token refreshed successfully'
      };
    } catch (refreshError) {
      // If refresh fails, enter maintenance mode
      this.enterMaintenanceMode();
      
      return {
        action: 'maintenance',
        shouldRetry: false,
        message: 'Authentication failed and token refresh unsuccessful'
      };
    }
  }

  /**
   * Register message handlers
   */
  private registerMessageHandlers(): void {
    this.registerMessageHandler('get_auth_status', async (message: Message) => {
      return {
        success: true,
        data: this.getAuthStatus()
      };
    });
    
    this.registerMessageHandler('get_access_token', async (message: Message) => {
      try {
        const token = await this.getAccessToken();
        return {
          success: true,
          data: { token }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    this.registerMessageHandler('refresh_token', async (message: Message) => {
      try {
        await this.refreshToken();
        return {
          success: true,
          data: { message: 'Token refreshed successfully' }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    this.registerMessageHandler('invalidate_token', async (message: Message) => {
      try {
        await this.invalidateToken();
        return {
          success: true,
          data: { message: 'Token invalidated successfully' }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    this.registerMessageHandler('start_device_auth', async (message: Message) => {
      try {
        const deviceAuth = await this.startDeviceAuthorization();
        return {
          success: true,
          data: deviceAuth
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    this.registerMessageHandler('get_auth_stats', async (message: Message) => {
      return {
        success: true,
        data: this.authStats
      };
    });
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const hash = createHash('sha256').update(codeVerifier).digest();
    return hash.toString('base64url');
  }

  /**
   * Create authentication error
   */
  private createAuthError(code: QwenAuthErrorCode, message: string): PipelineError {
    // Map QwenAuthErrorCode to PipelineErrorCode
    const errorCodeMap: Record<QwenAuthErrorCode, PipelineErrorCode> = {
      [QwenAuthErrorCode.DEVICE_CODE_EXPIRED]: PipelineErrorCode.QWEN_DEVICE_CODE_EXPIRED,
      [QwenAuthErrorCode.AUTHORIZATION_PENDING]: PipelineErrorCode.QWEN_AUTHORIZATION_PENDING,
      [QwenAuthErrorCode.SLOW_DOWN]: PipelineErrorCode.QWEN_SLOW_DOWN,
      [QwenAuthErrorCode.ACCESS_DENIED]: PipelineErrorCode.QWEN_ACCESS_DENIED,
      [QwenAuthErrorCode.INVALID_CLIENT]: PipelineErrorCode.QWEN_INVALID_CLIENT,
      [QwenAuthErrorCode.INVALID_SCOPE]: PipelineErrorCode.QWEN_INVALID_SCOPE,
      [QwenAuthErrorCode.AUTH_SERVER_ERROR]: PipelineErrorCode.QWEN_AUTH_SERVER_ERROR,
      [QwenAuthErrorCode.TEMPORARILY_UNAVAILABLE]: PipelineErrorCode.QWEN_TEMPORARILY_UNAVAILABLE,
      [QwenAuthErrorCode.INVALID_REQUEST]: PipelineErrorCode.QWEN_INVALID_REQUEST,
      [QwenAuthErrorCode.UNSUPPORTED_RESPONSE_TYPE]: PipelineErrorCode.QWEN_UNSUPPORTED_RESPONSE_TYPE,
      [QwenAuthErrorCode.INVALID_GRANT]: PipelineErrorCode.QWEN_INVALID_GRANT,
      [QwenAuthErrorCode.UNAUTHORIZED_CLIENT]: PipelineErrorCode.QWEN_UNAUTHORIZED_CLIENT,
      [QwenAuthErrorCode.INVALID_DEVICE_CODE]: PipelineErrorCode.QWEN_INVALID_DEVICE_CODE,
      [QwenAuthErrorCode.AUTHORIZATION_FAILED]: PipelineErrorCode.QWEN_AUTHORIZATION_FAILED,
      [QwenAuthErrorCode.TOKEN_REFRESH_FAILED]: PipelineErrorCode.QWEN_TOKEN_REFRESH_FAILED,
      [QwenAuthErrorCode.TOKEN_STORAGE_FAILED]: PipelineErrorCode.QWEN_TOKEN_STORAGE_FAILED,
      [QwenAuthErrorCode.CONFIGURATION_INVALID]: PipelineErrorCode.QWEN_CONFIGURATION_INVALID
    };
    
    return {
      code: errorCodeMap[code],
      message,
      category: PipelineErrorCategory.AUTHENTICATION,
      severity: 'high',
      recoverability: 'recoverable',
      impact: 'single_module',
      source: 'qwen-auth-center',
      pipelineId: this.moduleInfo.id,
      instanceId: this.moduleInfo.id,
      timestamp: Date.now()
    };
  }

  /**
   * Handle incoming messages
   */
  public override async handleMessage(message: Message): Promise<MessageResponse | void> {
    this.log('Handling message', { type: message.type, source: message.source }, 'handleMessage');
    
    // Handle token refresh instruction from scheduler
    if (message.type === 'token_refresh_instruction') {
      try {
        await this.handleTokenRefreshInstruction();
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { message: 'Token refresh instruction handled' },
          timestamp: Date.now()
        };
      } catch (error) {
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        };
      }
    }
    
    return super.handleMessage(message);
  }

  /**
   * Get authentication statistics
   */
  public getAuthStats() {
    return { ...this.authStats };
  }

  /**
   * Destroy the authentication center
   */
  public override async destroy(): Promise<void> {
    this.logInfo('Destroying Qwen authentication center', {}, 'destroy');
    
    // Clear timers
    this.clearTimers();
    
    // Unregister error handlers
    this.errorHandlerCenter.unregisterCustomHandler(PipelineErrorCode.TOKEN_EXPIRED);
    this.errorHandlerCenter.unregisterCustomHandler(PipelineErrorCode.AUTHENTICATION_FAILED);
    
    // Clear sensitive data
    this.storedToken = null;
    this.deviceCodeInfo = null;
    this.codeVerifier = null;
    
    await super.destroy();
    
    this.logInfo('Qwen authentication center destroyed', {}, 'destroy');
  }
}