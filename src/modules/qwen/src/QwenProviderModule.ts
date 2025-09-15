/**
 * Complete Qwen Provider Module
 * Implements full authentication, token management, and API request functionality
 */

import { ModuleInfo } from 'rcc-basemodule';
import { BaseModule } from 'rcc-basemodule';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import {
  QwenProviderConfig,
  QwenAuthConfig,
  AuthState,
  StoredToken,
  DeviceAuthorizationResponse,
  TokenResponse,
  DebugLogEntry,
  ProviderMetrics,
  AuthStatus,
  OpenAIChatRequest,
  OpenAIChatResponse
} from '../types/QwenProviderTypes';

/**
 * Complete Qwen Provider Module
 */
export class QwenProviderModule extends BaseModule {
  protected override config: QwenProviderConfig = {} as QwenProviderConfig;
  private httpClient: AxiosInstance;
  private authState: AuthState = AuthState.UNINITIALIZED;
  private storedToken: StoredToken | null = null;
  private deviceCodeInfo: DeviceAuthorizationResponse | null = null;
  private codeVerifier: string | null = null;
  private maintenanceMode = false;
  private isRefreshing = false;
  private refreshTimer: NodeJS.Timeout | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  protected debugLogs: DebugLogEntry[] = [];
  private debugLogFile: string | null = null;
  private metrics: ProviderMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    authState: AuthState.UNINITIALIZED,
    tokenRefreshCount: 0,
    maintenanceModeCount: 0
  };

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('QwenProviderModule initialized', { module: this.moduleName }, 'constructor');
    
    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Setup debug logging
    this.setupDebugLogging();
  }

  /**
   * Configure the module
   */
  public override async configure(config: QwenProviderConfig): Promise<void> {
    this.logInfo('Configuring QwenProviderModule', config, 'configure');
    this.config = config;
    
    // Update HTTP client configuration
    this.httpClient = axios.create({
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });
    
    await super.configure(config);
    this.logInfo('QwenProviderModule configured successfully', config, 'configure');
  }

  /**
   * Initialize the Qwen provider
   */
  public async initialize(): Promise<void> {
    try {
      this.logDebug('Initializing Qwen provider', { config: this.config }, 'initialize');
      
      // Ensure token store directory exists
      await this.ensureTokenStoreDir();
      
      // Load existing token if available
      await this.loadStoredToken();
      
      // Setup HTTP interceptors
      this.setupHttpInterceptors();
      
      // Setup token refresh timer if needed
      if (this.storedToken && !this.isTokenExpired()) {
        this.setupTokenRefreshTimer();
        this.authState = AuthState.AUTHORIZED;
      } else {
        this.authState = AuthState.UNINITIALIZED;
      }
      
      this.logDebug('Qwen provider initialized successfully', { 
        state: this.authState,
        hasToken: !!this.storedToken 
      }, 'initialize');
    } catch (error) {
      this.error('Failed to initialize Qwen provider', error, 'initialize');
      this.authState = AuthState.ERROR;
      throw error;
    }
  }

  /**
   * Process request - Handle LLM API requests
   * @param request - Request data
   * @returns Promise<any> - Response data
   */
  public override async process(request: any): Promise<any> {
    this.logInfo('Processing Qwen provider request', {
      requestSize: JSON.stringify(request).length
    }, 'process');
    
    try {
      // Update metrics
      this.metrics.totalRequests++;
      const startTime = Date.now();
      
      // Validate authentication state
      if (this.authState !== AuthState.AUTHORIZED) {
        throw new Error('Qwen provider not authorized');
      }
      
      // Make API request to Qwen
      const response = await this.makeQwenRequest(request);
      
      // Update metrics
      this.metrics.successfulRequests++;
      const duration = Date.now() - startTime;
      this.updateAverageResponseTime(duration);
      
      return response;
    } catch (error) {
      this.metrics.failedRequests++;
      this.error('Error processing Qwen request', { error: error as Error }, 'process');
      throw error;
    }
  }

  /**
   * Process OpenAI-compatible chat request
   */
  public async processChatRequest(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    try {
      this.logDebug('Processing chat request', {
        requestId,
        model: request.model,
        messageCount: request.messages?.length || 0
      }, 'processChatRequest');
      
      // Check authentication
      if (this.authState !== AuthState.AUTHORIZED || this.isTokenExpired()) {
        throw new Error('Not authenticated or token expired');
      }
      
      // Prepare API request for Qwen
      const apiRequest = {
        model: request.model || this.config.model,
        input: {
          messages: request.messages
        },
        parameters: {
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          top_p: request.top_p,
          frequency_penalty: request.frequency_penalty,
          presence_penalty: request.presence_penalty,
          stop: request.stop
        },
        stream: request.stream || false
      };
      
      // Make API request
      const response = await this.makeApiRequest(apiRequest, requestId);
      
      // Convert Qwen response to OpenAI format
      const openaiResponse = this.convertToOpenAIResponse(response, request.model);
      
      const duration = Date.now() - startTime;
      this.updateAverageResponseTime(duration);
      
      this.logDebug('Chat request completed successfully', {
        requestId,
        duration,
        responseId: response.request_id
      }, 'processChatRequest');
      
      return openaiResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.error('Chat request failed', {
        requestId,
        duration,
        error: error instanceof Error ? error.message : String(error)
      }, 'processChatRequest');
      
      throw error;
    }
  }

  /**
   * Get current authentication status
   */
  public getAuthStatus(): AuthStatus {
    const isExpired = this.storedToken ? this.isTokenExpired() : true;
    
    return {
      state: this.authState,
      isAuthorized: this.authState === AuthState.AUTHORIZED && !isExpired,
      isExpired,
      expiresAt: this.storedToken?.expiresAt,
      maintenanceMode: this.maintenanceMode,
      deviceCode: this.deviceCodeInfo?.device_code,
      userCode: this.deviceCodeInfo?.user_code,
      verificationUri: this.deviceCodeInfo?.verification_uri
    };
  }

  /**
   * Start device authorization flow
   */
  public async startDeviceAuthorization(): Promise<DeviceAuthorizationResponse> {
    try {
      this.authState = AuthState.INITIALIZING;
      
      this.logDebug('Starting device authorization flow', {}, 'startDeviceAuthorization');
      
      if (!this.config.auth.deviceFlow?.enabled) {
        throw new Error('Device flow is not enabled in configuration');
      }

      const deviceFlow = this.config.auth.deviceFlow;
      
      // Generate PKCE codes if enabled
      if (deviceFlow.pkce) {
        this.codeVerifier = this.generateCodeVerifier();
      }
      
      // Request device authorization
      const deviceAuth = await this.requestDeviceAuthorization(
        deviceFlow.authEndpoint,
        deviceFlow.clientId,
        deviceFlow.scope
      );
      
      this.deviceCodeInfo = deviceAuth;
      this.authState = AuthState.PENDING_AUTHORIZATION;
      
      this.logDebug('Device authorization initiated', {
        deviceCode: deviceAuth.device_code,
        userCode: deviceAuth.user_code,
        verificationUri: deviceAuth.verification_uri
      }, 'startDeviceAuthorization');
      
      // Start polling for token
      this.startPollingForToken();
      
      return deviceAuth;
    } catch (error) {
      this.authState = AuthState.ERROR;
      this.error('Device authorization failed', error, 'startDeviceAuthorization');
      throw error;
    }
  }

  /**
   * Get current access token
   */
  public async getAccessToken(): Promise<string> {
    if (!this.storedToken || this.isTokenExpired()) {
      throw new Error('No valid access token available');
    }
    
    return this.storedToken.accessToken;
  }

  /**
   * Refresh access token
   */
  public async refreshToken(): Promise<void> {
    try {
      if (!this.storedToken?.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      this.authState = AuthState.REFRESHING;
      this.enterMaintenanceMode();
      
      this.logDebug('Refreshing access token', {}, 'refreshToken');
      
      const deviceFlow = this.config.auth.deviceFlow;
      if (!deviceFlow) {
        throw new Error('Device flow configuration not found');
      }
      
      // Request new token using refresh token
      const newToken = await this.requestTokenWithRefreshToken(
        deviceFlow.tokenEndpoint,
        deviceFlow.clientId,
        this.storedToken.refreshToken
      );
      
      // Store new token
      await this.storeToken(newToken);
      
      this.authState = AuthState.AUTHORIZED;
      this.metrics.tokenRefreshCount++;
      
      // Set up new refresh timer
      this.setupTokenRefreshTimer();
      
      this.exitMaintenanceMode();
      
      this.logDebug('Access token refreshed successfully', {
        expiresAt: newToken.expires_in ? Date.now() + (newToken.expires_in * 1000) : null
      }, 'refreshToken');
    } catch (error) {
      this.authState = AuthState.ERROR;
      this.error('Token refresh failed', error, 'refreshToken');
      throw error;
    }
  }

  /**
   * Invalidate current token
   */
  public async invalidateToken(): Promise<void> {
    this.logDebug('Invalidating token', {}, 'invalidateToken');
    
    // Clear stored token
    this.storedToken = null;
    
    // Delete token files
    try {
      if (fs.existsSync(this.config.auth.accessTokenFile)) {
        fs.unlinkSync(this.config.auth.accessTokenFile);
      }
      if (fs.existsSync(this.config.auth.refreshTokenFile)) {
        fs.unlinkSync(this.config.auth.refreshTokenFile);
      }
    } catch (error) {
      this.warn('Failed to delete token files', error, 'invalidateToken');
    }
    
    // Clear timers
    this.clearTimers();
    
    // Reset state
    this.authState = AuthState.UNINITIALIZED;
    this.deviceCodeInfo = null;
    this.codeVerifier = null;
    
    this.logDebug('Token invalidated successfully', {}, 'invalidateToken');
  }

  /**
   * Get debug logs
   */
  public getDebugLogs(level?: 'trace' | 'debug' | 'info' | 'warn' | 'error', limit?: number): DebugLogEntry[] {
    let filteredLogs = [...this.debugLogs];
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (limit && limit > 0) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }

  /**
   * Clear debug logs
   */
  public clearDebugLogs(): void {
    this.debugLogs = [];
    this.logDebug('Debug logs cleared', {}, 'clearDebugLogs');
  }

  /**
   * Get provider metrics
   */
  public getMetrics(): ProviderMetrics {
    return {
      ...this.metrics,
      authState: this.authState
    };
  }

  /**
   * Make request to Qwen API
   */
  private async makeQwenRequest(request: any): Promise<any> {
    // Convert to Qwen format and make request
    const qwenRequest = this.convertToQwenRequest(request);
    return this.makeApiRequest(qwenRequest, this.generateRequestId());
  }

  /**
   * Convert OpenAI request to Qwen format
   */
  private convertToQwenRequest(request: any): any {
    return {
      model: request.model || this.config.model,
      input: {
        messages: request.messages
      },
      parameters: {
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        stop: request.stop
      },
      stream: request.stream || false
    };
  }

  /**
   * Convert Qwen response to OpenAI format
   */
  private convertToOpenAIResponse(qwenResponse: any, model: string): OpenAIChatResponse {
    return {
      id: qwenResponse.request_id || `qwen-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model || this.config.model || 'qwen-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: qwenResponse.output?.text || qwenResponse.output?.choices?.[0]?.message?.content || 'No response'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: qwenResponse.usage?.input_tokens || 0,
        completion_tokens: qwenResponse.usage?.output_tokens || 0,
        total_tokens: qwenResponse.usage?.total_tokens || 0
      }
    };
  }

  /**
   * Request device authorization
   */
  private async requestDeviceAuthorization(
    authEndpoint: string,
    clientId: string,
    scope: string
  ): Promise<DeviceAuthorizationResponse> {
    const requestData: any = {
      client_id: clientId,
      scope: scope
    };
    
    if (this.config.auth.deviceFlow?.pkce && this.codeVerifier) {
      const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
      requestData.code_challenge = codeChallenge;
      requestData.code_challenge_method = 'S256';
    }
    
    const response = await this.httpClient.post(authEndpoint, requestData);
    return response.data;
  }

  /**
   * Start polling for token
   */
  private startPollingForToken(): void {
    if (!this.deviceCodeInfo || !this.config.auth.deviceFlow) {
      return;
    }
    
    const deviceFlow = this.config.auth.deviceFlow;
    const maxAttempts = deviceFlow.maxPollingAttempts || 60;
    let attempts = 0;
    
    const poll = async () => {
      try {
        if (attempts >= maxAttempts) {
          this.stopPolling();
          this.authState = AuthState.ERROR;
          throw new Error('Maximum polling attempts exceeded');
        }
        
        attempts++;
        
        const requestData: any = {
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          client_id: deviceFlow.clientId,
          device_code: this.deviceCodeInfo!.device_code
        };
        
        if (this.config.auth.deviceFlow?.pkce && this.codeVerifier) {
          requestData.code_verifier = this.codeVerifier;
        }
        
        const response = await this.httpClient.post(deviceFlow.tokenEndpoint, requestData);
        const tokenData = response.data;
        
        // Convert to stored token format
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
        this.setupTokenRefreshTimer();
        
        this.logDebug('Token received successfully', {
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope
        }, 'startPollingForToken');
        
      } catch (error: any) {
        if (axios.isAxiosError(error) && error.response) {
          const errorCode = error.response.data.error;
          
          switch (errorCode) {
            case 'authorization_pending':
              // Continue polling
              this.pollingTimer = setTimeout(poll, deviceFlow.pollingInterval || 5000);
              return;
              
            case 'slow_down':
              // Slow down polling
              this.pollingTimer = setTimeout(poll, (deviceFlow.pollingInterval || 5000) * 2);
              return;
              
            case 'expired_token':
            case 'invalid_device_code':
              this.stopPolling();
              this.authState = AuthState.ERROR;
              throw new Error('Device code expired or invalid');
              
            case 'access_denied':
              this.stopPolling();
              this.authState = AuthState.ERROR;
              throw new Error('User denied authorization');
              
            default:
              this.stopPolling();
              this.authState = AuthState.ERROR;
              throw new Error(`Authentication server error: ${errorCode}`);
          }
        } else {
          this.stopPolling();
          this.authState = AuthState.ERROR;
          throw error;
        }
      }
    };
    
    // Start polling
    this.pollingTimer = setTimeout(poll, deviceFlow.pollingInterval || 5000);
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
  private async requestTokenWithRefreshToken(
    tokenEndpoint: string,
    clientId: string,
    refreshToken: string
  ): Promise<StoredToken> {
    const response = await this.httpClient.post(tokenEndpoint, {
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });
    
    const tokenData = response.data;
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
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
      fs.writeFileSync(this.config.auth.accessTokenFile, JSON.stringify({
        access_token: token.accessToken,
        token_type: token.tokenType,
        expires_in: Math.floor((token.expiresAt - Date.now()) / 1000),
        scope: token.scope,
        created_at: Math.floor(token.createdAt / 1000)
      }), 'utf-8');
      
      // Store refresh token
      fs.writeFileSync(this.config.auth.refreshTokenFile, JSON.stringify({
        refresh_token: token.refreshToken,
        created_at: Math.floor(token.createdAt / 1000)
      }), 'utf-8');
      
      this.storedToken = token;
      
      this.logDebug('Token stored successfully', {}, 'storeToken');
    } catch (error) {
      throw new Error(`Failed to store token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load stored token from files
   */
  private async loadStoredToken(): Promise<void> {
    try {
      if (!fs.existsSync(this.config.auth.accessTokenFile) || !fs.existsSync(this.config.auth.refreshTokenFile)) {
        return;
      }
      
      // Load access token
      const accessTokenData = JSON.parse(fs.readFileSync(this.config.auth.accessTokenFile, 'utf-8'));
      const refreshTokenData = JSON.parse(fs.readFileSync(this.config.auth.refreshTokenFile, 'utf-8'));
      
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
      this.warn('Failed to load stored token', error, 'loadStoredToken');
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
    const threshold = this.config.auth.refreshThreshold || 300000; // 5 minutes default
    
    return this.storedToken.expiresAt <= (now + threshold);
  }

  /**
   * Setup token refresh timer
   */
  private setupTokenRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    if (!this.storedToken) {
      return;
    }
    
    const now = Date.now();
    const threshold = this.config.auth.refreshThreshold || 300000;
    const refreshTime = this.storedToken.expiresAt - threshold;
    const delay = Math.max(0, refreshTime - now);
    
    this.refreshTimer = setTimeout(async () => {
      try {
        this.logDebug('Token refresh timer triggered', {}, 'setupTokenRefreshTimer');
        await this.refreshToken();
      } catch (error) {
        this.error('Automatic token refresh failed', error, 'setupTokenRefreshTimer');
      }
    }, delay);
    
    this.logDebug('Token refresh timer set', {
      refreshTime: new Date(refreshTime).toISOString(),
      delay: delay
    }, 'setupTokenRefreshTimer');
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
   * Enter maintenance mode
   */
  private enterMaintenanceMode(): void {
    this.maintenanceMode = true;
    this.metrics.maintenanceModeCount++;
    
    this.logDebug('Entering maintenance mode', {}, 'enterMaintenanceMode');
    
    // Notify maintenance callback if provided
    if (this.config.auth.onMaintenanceMode) {
      this.config.auth.onMaintenanceMode(true);
    }
  }

  /**
   * Exit maintenance mode
   */
  private exitMaintenanceMode(): void {
    this.maintenanceMode = false;
    
    this.logDebug('Exiting maintenance mode', {}, 'exitMaintenanceMode');
    
    // Notify maintenance callback if provided
    if (this.config.auth.onMaintenanceMode) {
      this.config.auth.onMaintenanceMode(false);
    }
  }

  /**
   * Ensure token store directory exists
   */
  private async ensureTokenStoreDir(): Promise<void> {
    const tokenDir = path.dirname(this.config.auth.accessTokenFile);
    
    if (!fs.existsSync(tokenDir)) {
      fs.mkdirSync(tokenDir, { recursive: true });
    }
  }

  /**
   * Setup HTTP interceptors
   */
  private setupHttpInterceptors(): void {
    // Request interceptor for authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        if (this.storedToken && !this.isTokenExpired()) {
          config.headers.Authorization = `Bearer ${this.storedToken.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Token expired, try to refresh
          if (this.config.auth.autoRefresh && !this.isRefreshing) {
            try {
              await this.refreshToken();
              // Retry the original request
              if (error.config) {
                return this.httpClient.request(error.config);
              }
              throw error;
            } catch (refreshError) {
              // Refresh failed, throw original error
              return Promise.reject(error);
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make API request
   */
  private async makeApiRequest(apiRequest: any, _requestId: string): Promise<any> {
    const response = await this.httpClient.post(
      this.config.endpoint,
      apiRequest
    );
    
    return response.data;
  }

  /**
   * Setup debug logging
   */
  private setupDebugLogging(): void {
    if (this.config.debug?.enabled) {
      const logDir = this.config.debug.logDir || './logs';
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      this.debugLogFile = path.join(logDir, `qwen-provider-${Date.now()}.log`);
    }
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
   * Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(newTime: number): void {
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = newTime;
    } else {
      this.metrics.averageResponseTime = (this.metrics.averageResponseTime + newTime) / 2;
    }
  }

  /**
   * Enhanced logging with debug support
   */
  private logDebug(message: string, data: any, functionName: string): void {
    // Add to debug logs
    this.debugLogs.push({
      timestamp: Date.now(),
      level: 'debug',
      message,
      data,
      moduleId: this.info.id,
      method: functionName
    });
    
    // Keep only last 1000 logs
    if (this.debugLogs.length > 1000) {
      this.debugLogs = this.debugLogs.slice(-1000);
    }
    
    // Write to file if enabled
    if (this.debugLogFile) {
      const logEntry = `[${new Date().toISOString()}] DEBUG: ${message} ${JSON.stringify(data)}\n`;
      fs.appendFileSync(this.debugLogFile, logEntry);
    }
    
    // Call parent log method
    this.logInfo(message, data, functionName);
  }

  /**
   * Handle incoming messages
   */
  public override async handleMessage(message: any): Promise<any> {
    this.logDebug('Handling message', { type: message.type, source: message.source }, 'handleMessage');
    
    switch (message.type) {
      case 'get_auth_status':
        return {
          success: true,
          data: this.getAuthStatus()
        };
        
      case 'get_access_token':
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
        
      case 'refresh_token':
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
        
      case 'invalidate_token':
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
        
      case 'start_device_auth':
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
        
      case 'get_debug_logs':
        return {
          success: true,
          data: this.getDebugLogs(message.payload?.level, message.payload?.limit)
        };
        
      case 'clear_debug_logs':
        this.clearDebugLogs();
        return {
          success: true,
          data: { message: 'Debug logs cleared' }
        };
        
      case 'get_metrics':
        return {
          success: true,
          data: this.getMetrics()
        };
        
      default:
        return super.handleMessage(message);
    }
  }

  /**
   * Destroy the provider
   */
  public override async destroy(): Promise<void> {
    this.logDebug('Destroying Qwen provider', {}, 'destroy');
    
    // Clear timers
    this.clearTimers();
    
    // Clear sensitive data
    this.storedToken = null;
    this.deviceCodeInfo = null;
    this.codeVerifier = null;
    
    // Clear debug logs
    this.debugLogs = [];
    
    await super.destroy();
    
    this.logDebug('Qwen provider destroyed', {}, 'destroy');
  }
}