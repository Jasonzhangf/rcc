/**
 * OAuth2 Module Implementation
 * Simplified OAuth2 implementation with error handling integration
 */

import { BaseModule } from 'rcc-basemodule';
import { ModuleInfo, Message, MessageResponse } from 'rcc-basemodule';
import { ErrorHandlerCenter } from 'sharedmodule/pipeline';
import { 
  PipelineError, 
  PipelineErrorCode, 
  PipelineExecutionContext,
  ErrorHandlingAction
} from 'sharedmodule/pipeline';

import {
  OAuth2ModuleConfig,
  DeviceAuthorizationResponse,
  TokenData,
  TokenStatus,
  OAuth2ErrorCode,
  AuthState,
  PKCEPair,
  OAuth2Stats,
  OAuth2ErrorContext
} from './OAuth2Types';

import {
  DEFAULT_OAUTH2_CONFIG,
  OAUTH2_ERROR_MESSAGES,
  OAUTH2_ERROR_CATEGORIES,
  OAUTH2_HTTP_STATUS,
  CONTENT_TYPES,
  GRANT_TYPES,
  PKCE_CHALLENGE_METHODS
} from './OAuth2Constants';

import { TokenStorage } from './TokenStorage';
import axios from 'axios';
import { createHash, randomBytes } from 'crypto';

/**
 * OAuth2 Module - Simplified implementation
 */
export class OAuth2Module extends BaseModule {
  private config: OAuth2ModuleConfig;
  private errorHandlerCenter: ErrorHandlerCenter;
  private tokenStorage: TokenStorage;
  private currentToken: TokenData | null = null;
  private authState: AuthState = AuthState.UNINITIALIZED;
  private stats: OAuth2Stats;

  constructor(config: OAuth2ModuleConfig, errorHandlerCenter: ErrorHandlerCenter) {
    const moduleInfo: ModuleInfo = {
      id: 'oauth2-module',
      name: 'OAuth2Module',
      version: '1.0.0',
      description: 'Simplified OAuth2 authentication module',
      type: 'authentication',
      dependencies: ['error-handler-center'],
      config: config
    };

    super(moduleInfo);

    this.config = {
      ...config,
      enablePKCE: config.enablePKCE ?? DEFAULT_OAUTH2_CONFIG.enablePKCE
    };

    this.errorHandlerCenter = errorHandlerCenter;
    this.tokenStorage = new TokenStorage(config.tokenStoragePath);
    this.stats = {
      totalAuthAttempts: 0,
      successfulAuths: 0,
      failedAuths: 0,
      tokenRefreshes: 0
    };

    this.logInfo('OAuth2 module created', { config: this.config }, 'constructor');
  }

  /**
   * Initialize the OAuth2 module
   */
  public override async initialize(): Promise<void> {
    try {
      await super.initialize();

      this.logInfo('Initializing OAuth2 module', { config: this.config }, 'initialize');

      // Validate configuration
      this.validateConfig();

      // Register error handlers
      this.registerErrorHandlers();

      // Register message handlers
      this.registerMessageHandlers();

      // Try to load existing token
      await this.loadExistingToken();

      this.logInfo('OAuth2 module initialized successfully', { 
        state: this.authState,
        hasToken: !!this.currentToken 
      }, 'initialize');
    } catch (error) {
      this.logError('Failed to initialize OAuth2 module', error, 'initialize');
      this.authState = AuthState.ERROR;
      throw error;
    }
  }

  /**
   * Initiate device authorization flow
   */
  public async initiateDeviceAuthorization(): Promise<DeviceAuthorizationResponse> {
    try {
      this.authState = AuthState.INITIALIZING;
      this.stats.totalAuthAttempts++;

      this.logInfo('Starting device authorization flow', {}, 'initiateDeviceAuthorization');

      let pkcePair: PKCEPair | undefined;

      // Generate PKCE codes if enabled
      if (this.config.enablePKCE) {
        pkcePair = await this.generatePKCEPair();
        this.logDebug('PKCE codes generated', { 
          hasCodeVerifier: !!pkcePair 
        }, 'initiateDeviceAuthorization');
      }

      // Request device authorization
      const response = await this.requestDeviceAuthorization(pkcePair?.codeChallenge);
      
      this.authState = AuthState.PENDING_AUTHORIZATION;

      this.logInfo('Device authorization initiated', {
        deviceCode: response.device_code,
        userCode: response.user_code,
        verificationUri: response.verification_uri
      }, 'initiateDeviceAuthorization');

      return response;
    } catch (error) {
      this.authState = AuthState.ERROR;
      this.stats.failedAuths++;

      // Handle error through error handling center
      await this.handleError(error, { 
        operation: 'device_auth', 
        retryCount: 0 
      });

      throw error;
    }
  }

  /**
   * Request token using device code
   */
  public async requestToken(deviceCode: string, codeVerifier?: string): Promise<TokenData> {
    try {
      this.logInfo('Requesting token with device code', { deviceCode }, 'requestToken');

      const params: Record<string, string> = {
        client_id: this.config.clientId,
        device_code: deviceCode,
        grant_type: GRANT_TYPES.DEVICE_CODE
      };

      if (codeVerifier) {
        params.code_verifier = codeVerifier;
      }

      const response = await axios.post(this.config.tokenEndpoint, params, {
        headers: {
          'Content-Type': CONTENT_TYPES.FORM_URL_ENCODED
        }
      });

      const tokenData = this.processTokenResponse(response.data);

      // Store token
      this.currentToken = tokenData;
      this.authState = AuthState.AUTHORIZED;
      this.stats.successfulAuths++;

      this.logInfo('Token received successfully', {
        expiresIn: tokenData.expiresAt - Date.now(),
        scope: tokenData.scope
      }, 'requestToken');

      return tokenData;
    } catch (error: any) {
      this.stats.failedAuths++;

      // Handle OAuth2 specific errors
      if (axios.isAxiosError(error) && error.response) {
        const oauth2Error = this.handleOAuth2Error(error.response.data.error);
        await this.handleError(oauth2Error, { 
          operation: 'token_request',
          deviceCode,
          retryCount: 0
        });
        throw oauth2Error;
      }

      // Handle other errors
      await this.handleError(error, { 
        operation: 'token_request',
        deviceCode,
        retryCount: 0
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  public async refreshToken(refreshToken: string): Promise<TokenData> {
    try {
      this.logInfo('Refreshing access token', {}, 'refreshToken');

      const params = {
        client_id: this.config.clientId,
        refresh_token: refreshToken,
        grant_type: GRANT_TYPES.REFRESH_TOKEN
      };

      const response = await axios.post(this.config.tokenEndpoint, params, {
        headers: {
          'Content-Type': CONTENT_TYPES.FORM_URL_ENCODED
        }
      });

      const tokenData = this.processTokenResponse(response.data);

      // Update current token
      this.currentToken = tokenData;
      this.stats.tokenRefreshes++;

      this.logInfo('Token refreshed successfully', {
        expiresIn: tokenData.expiresAt - Date.now(),
        scope: tokenData.scope
      }, 'refreshToken');

      return tokenData;
    } catch (error: any) {
      this.stats.failedAuths++;

      // Handle OAuth2 specific errors
      if (axios.isAxiosError(error) && error.response) {
        const oauth2Error = this.handleOAuth2Error(error.response.data.error);
        await this.handleError(oauth2Error, { 
          operation: 'token_refresh',
          retryCount: 0
        });
        throw oauth2Error;
      }

      // Handle other errors
      await this.handleError(error, { 
        operation: 'token_refresh',
        retryCount: 0
      });
      throw error;
    }
  }

  /**
   * Get current token status
   */
  public getTokenStatus(): TokenStatus {
    const now = Date.now();
    const isExpired = this.currentToken ? this.currentToken.expiresAt <= now : true;

    return {
      hasToken: !!this.currentToken,
      isExpired,
      expiresAt: this.currentToken?.expiresAt,
      timeUntilExpiry: this.currentToken ? Math.max(0, this.currentToken.expiresAt - now) : undefined,
      tokenType: this.currentToken?.tokenType,
      scope: this.currentToken?.scope
    };
  }

  /**
   * Get current token
   */
  public getCurrentToken(): TokenData | null {
    return this.currentToken;
  }

  /**
   * Invalidate current token
   */
  public invalidateToken(): void {
    this.logInfo('Invalidating current token', {}, 'invalidateToken');
    
    this.currentToken = null;
    this.authState = AuthState.UNINITIALIZED;
  }

  /**
   * Save token for email
   */
  public async saveTokenForEmail(email: string, tokenData: TokenData): Promise<void> {
    try {
      await this.tokenStorage.saveToken(email, tokenData);
      this.logInfo('Token saved for email', { email }, 'saveTokenForEmail');
    } catch (error) {
      await this.handleError(error, { 
        operation: 'token_storage',
        email,
        retryCount: 0
      });
      throw error;
    }
  }

  /**
   * Load token for email
   */
  public async loadTokenForEmail(email: string): Promise<TokenData | null> {
    try {
      const tokenData = await this.tokenStorage.loadToken(email);
      if (tokenData) {
        this.currentToken = tokenData;
        this.authState = AuthState.AUTHORIZED;
        this.logInfo('Token loaded for email', { email }, 'loadTokenForEmail');
      }
      return tokenData;
    } catch (error) {
      await this.handleError(error, { 
        operation: 'token_storage',
        email,
        retryCount: 0
      });
      throw error;
    }
  }

  /**
   * Get OAuth2 statistics
   */
  public getStats(): OAuth2Stats {
    return { ...this.stats };
  }

  /**
   * Request device authorization
   */
  private async requestDeviceAuthorization(codeChallenge?: string): Promise<DeviceAuthorizationResponse> {
    const params: Record<string, string> = {
      client_id: this.config.clientId,
      scope: this.config.scope
    };

    if (codeChallenge) {
      params.code_challenge = codeChallenge;
      params.code_challenge_method = PKCE_CHALLENGE_METHODS.S256;
    }

    const response = await axios.post(this.config.deviceAuthEndpoint, params, {
      headers: {
        'Content-Type': CONTENT_TYPES.FORM_URL_ENCODED
      }
    });

    return response.data;
  }

  /**
   * Process token response
   */
  private processTokenResponse(responseData: any): TokenData {
    return {
      accessToken: responseData.access_token,
      refreshToken: responseData.refresh_token,
      tokenType: responseData.token_type,
      expiresAt: Date.now() + (responseData.expires_in * 1000),
      scope: responseData.scope
    };
  }

  /**
   * Generate PKCE code pair
   */
  private async generatePKCEPair(): Promise<PKCEPair> {
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Handle OAuth2 specific error
   */
  private handleOAuth2Error(errorCode: string): Error {
    let oauth2ErrorCode: OAuth2ErrorCode;

    switch (errorCode) {
      case 'expired_token':
      case 'invalid_device_code':
        oauth2ErrorCode = OAuth2ErrorCode.DEVICE_CODE_EXPIRED;
        break;
      case 'authorization_pending':
        oauth2ErrorCode = OAuth2ErrorCode.AUTHORIZATION_PENDING;
        break;
      case 'slow_down':
        oauth2ErrorCode = OAuth2ErrorCode.SLOW_DOWN;
        break;
      case 'access_denied':
        oauth2ErrorCode = OAuth2ErrorCode.ACCESS_DENIED;
        break;
      case 'invalid_client':
        oauth2ErrorCode = OAuth2ErrorCode.INVALID_CLIENT;
        break;
      case 'invalid_scope':
        oauth2ErrorCode = OAuth2ErrorCode.INVALID_SCOPE;
        break;
      default:
        oauth2ErrorCode = OAuth2ErrorCode.AUTH_SERVER_ERROR;
        break;
    }

    return new Error(OAUTH2_ERROR_MESSAGES[oauth2ErrorCode]);
  }

  /**
   * Handle error through error handling center
   */
  private async handleError(error: Error, context: OAuth2ErrorContext): Promise<void> {
    this.logError('OAuth2 error occurred', { error, context }, 'handleError');

    // Create pipeline error
    const pipelineError: PipelineError = {
      code: PipelineErrorCode.OAUTH2_ERROR,
      message: error.message,
      category: 'authentication',
      severity: 'high',
      recoverability: 'recoverable',
      impact: 'single_module',
      source: this.moduleInfo.id,
      pipelineId: this.moduleInfo.id,
      instanceId: this.moduleInfo.id,
      timestamp: Date.now(),
      details: {
        oauth2Context: context,
        originalError: error instanceof Error ? error.stack : String(error)
      }
    };

    // Send to error handling center
    await this.errorHandlerCenter.handleError(pipelineError, {
      executionId: '',
      pipelineId: this.moduleInfo.id,
      instanceId: this.moduleInfo.id,
      retryCount: context.retryCount
    });
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.clientId) {
      throw new Error('Client ID is required');
    }

    if (!this.config.scope) {
      throw new Error('Scope is required');
    }

    if (!this.config.deviceAuthEndpoint) {
      throw new Error('Device authorization endpoint is required');
    }

    if (!this.config.tokenEndpoint) {
      throw new Error('Token endpoint is required');
    }

    if (!this.config.tokenStoragePath) {
      throw new Error('Token storage path is required');
    }
  }

  /**
   * Register error handlers
   */
  private registerErrorHandlers(): void {
    // Register OAuth2 specific error handlers
    this.errorHandlerCenter.registerCustomHandler(
      PipelineErrorCode.TOKEN_EXPIRED,
      this.handleTokenExpired.bind(this)
    );

    this.errorHandlerCenter.registerCustomHandler(
      PipelineErrorCode.AUTHENTICATION_FAILED,
      this.handleAuthenticationFailed.bind(this)
    );

    this.logInfo('OAuth2 error handlers registered', {}, 'registerErrorHandlers');
  }

  /**
   * Handle token expired error
   */
  private async handleTokenExpired(
    error: PipelineError, 
    context: PipelineExecutionContext
  ): Promise<ErrorHandlingAction> {
    this.logInfo('Handling token expired error', { error, context }, 'handleTokenExpired');

    // Try to refresh token if we have a refresh token
    if (this.currentToken?.refreshToken) {
      try {
        await this.refreshToken(this.currentToken.refreshToken);
        return {
          action: 'retry',
          shouldRetry: true,
          message: 'Token refreshed successfully'
        };
      } catch (refreshError) {
        this.logError('Token refresh failed', refreshError, 'handleTokenExpired');
        return {
          action: 'maintenance',
          shouldRetry: false,
          message: 'Token expired and refresh failed'
        };
      }
    }

    return {
      action: 'maintenance',
      shouldRetry: false,
      message: 'Token expired and no refresh token available'
    };
  }

  /**
   * Handle authentication failed error
   */
  private async handleAuthenticationFailed(
    error: PipelineError, 
    context: PipelineExecutionContext
  ): Promise<ErrorHandlingAction> {
    this.logInfo('Handling authentication failed error', { error, context }, 'handleAuthenticationFailed');

    return {
      action: 'maintenance',
      shouldRetry: false,
      message: 'Authentication failed - requires user interaction'
    };
  }

  /**
   * Register message handlers
   */
  private registerMessageHandlers(): void {
    this.registerMessageHandler('get_token_status', async (message: Message) => {
      return {
        success: true,
        data: this.getTokenStatus()
      };
    });

    this.registerMessageHandler('get_current_token', async (message: Message) => {
      return {
        success: true,
        data: this.getCurrentToken()
      };
    });

    this.registerMessageHandler('invalidate_token', async (message: Message) => {
      this.invalidateToken();
      return {
        success: true,
        data: { message: 'Token invalidated' }
      };
    });

    this.registerMessageHandler('get_oauth2_stats', async (message: Message) => {
      return {
        success: true,
        data: this.getStats()
      };
    });

    this.registerMessageHandler('initiate_device_auth', async (message: Message) => {
      try {
        const deviceAuth = await this.initiateDeviceAuthorization();
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
  }

  /**
   * Load existing token
   */
  private async loadExistingToken(): Promise<void> {
    // This is a placeholder - in a real implementation, you might want to
    // load a default token or check for a specific user's token
    // For now, we'll leave the module in UNINITIALIZED state
  }

  /**
   * Destroy the OAuth2 module
   */
  public override async destroy(): Promise<void> {
    this.logInfo('Destroying OAuth2 module', {}, 'destroy');

    // Clear sensitive data
    this.currentToken = null;
    this.authState = AuthState.UNINITIALIZED;

    // Unregister error handlers
    this.errorHandlerCenter.unregisterCustomHandler(PipelineErrorCode.TOKEN_EXPIRED);
    this.errorHandlerCenter.unregisterCustomHandler(PipelineErrorCode.AUTHENTICATION_FAILED);

    await super.destroy();
    
    this.logInfo('OAuth2 module destroyed', {}, 'destroy');
  }
}