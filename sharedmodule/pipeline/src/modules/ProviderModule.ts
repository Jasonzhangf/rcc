import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import crypto from 'crypto';

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

export class ProviderModule extends BasePipelineModule {
  protected config: ProviderConfig = {} as ProviderConfig;
  protected httpClient: AxiosInstance;
  private tokenCache: Map<string, AuthResult> = new Map();
  private tokenStoreFile?: string;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('ProviderModule initialized', { module: this.moduleName }, 'constructor');
    
    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RCC-Pipeline/1.0.0'
      }
    });

    // Set up interceptors for logging
    this.setupInterceptors();
  }

  /**
   * Configure the Provider module
   * @param config - Configuration object
   */
  async configure(config: ProviderConfig): Promise<void> {
    this.logInfo('Configuring ProviderModule', config, 'configure');
    
    this.config = {
      ...config,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      enableLogging: config.enableLogging !== false
    };
    
    // Update HTTP client timeout
    this.httpClient.defaults.timeout = this.config.timeout;
    
    // Set custom headers
    if (this.config.headers) {
      Object.assign(this.httpClient.defaults.headers.common, this.config.headers);
    }

    // Initialize Qwen specific configuration
    if (this.config.qwenConfig) {
      await this.initializeQwenConfig();
    }
    
    await super.configure(this.config);
    this.logInfo('ProviderModule configured successfully', this.config, 'configure');
  }

  /**
   * Process request - Send request to provider
   * @param request - Input request
   * @returns Promise<any> - Provider response
   */
  async process(request: any): Promise<any> {
    this.logInfo('Processing Provider request', {
      provider: this.config?.provider,
      endpoint: this.config?.endpoint,
      requestSize: JSON.stringify(request).length
    }, 'process');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(request, 'provider-input', 'previous-module');
      
      // Validate configuration
      if (!this.config) {
        throw new Error('ProviderModule not configured');
      }
      
      // Get authentication token
      const authToken = await this.getAuthToken();
      
      // Build HTTP request
      const httpRequest = await this.buildHttpRequest(request, authToken);
      
      // Send request with retry logic
      const response = await this.sendRequestWithRetry(httpRequest);
      
      // Process response
      const processedResponse = await this.processResponse(response);
      
      // Log output data at output port
      this.logOutputPort(processedResponse, 'provider-output', 'external');
      
      this.debug('debug', `Provider request completed in ${Date.now() - startTime}ms`, processedResponse, 'process');
      
      return processedResponse;
      
    } catch (error: any) {
      this.error(error, {
        provider: this.config?.provider,
        operation: 'process'
      }, 'process');
      
      // Re-throw with proper error code
      throw new Error(`Provider error: ${error.message}`);
    }
  }

  /**
   * Process response - Handle response processing
   * @param response - Input response data
   * @returns Promise<any> - Processed response data
   */
  async processResponse(response: any): Promise<any> {
    this.logInfo('Processing Provider response', {
      provider: this.config?.provider,
      responseStatus: response.status,
      responseSize: JSON.stringify(response.data).length
    }, 'processResponse');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(response, 'provider-response-input', 'external');
      
      // Validate response
      if (!response || !response.data) {
        throw new Error('Invalid response from provider');
      }
      
      // Extract and process response data
      const processedResponse = this.extractResponseData(response.data);
      
      // Apply Qwen specific response processing if configured
      const finalResponse = this.config?.qwenConfig ? 
        await this.processQwenResponse(processedResponse) : 
        processedResponse;
      
      // Log output data at output port
      this.logOutputPort(finalResponse, 'provider-response-output', 'next-module');
      
      this.debug('debug', `Provider response processing completed in ${Date.now() - startTime}ms`, finalResponse, 'processResponse');
      
      return finalResponse;
      
    } catch (error: any) {
      this.error(error, {
        provider: this.config?.provider,
        operation: 'processResponse'
      }, 'processResponse');
      
      throw new Error(`Provider response error: ${error.message}`);
    }
  }

  /**
   * Initialize Qwen specific configuration
   */
  private async initializeQwenConfig(): Promise<void> {
    if (!this.config || !this.config.qwenConfig) {
      return;
    }
    
    this.logInfo('Initializing Qwen configuration', this.config.qwenConfig, 'initializeQwenConfig');
    
    // Set up token store if specified
    if (this.config.qwenConfig.customParams?.tokenStorePath) {
      this.tokenStoreFile = this.config.qwenConfig.customParams.tokenStorePath;
      await this.loadTokensFromFile();
    }
    
    // Initialize Qwen specific HTTP client configuration
    if (this.config.qwenConfig.apiVersion) {
      this.httpClient.defaults.headers.common['X-DashScope-Api-Version'] = this.config.qwenConfig.apiVersion;
    }
    
    if (this.config.qwenConfig.workspaceId) {
      this.httpClient.defaults.headers.common['X-DashScope-Workspace'] = this.config.qwenConfig.workspaceId;
    }
    
    if (this.config.qwenConfig.appId) {
      this.httpClient.defaults.headers.common['X-DashScope-App'] = this.config.qwenConfig.appId;
    }
  }

  /**
   * Get authentication token
   * @returns Promise<string> - Authentication token
   */
  private async getAuthToken(): Promise<string> {
    if (!this.config) {
      throw new Error('ProviderModule not configured');
    }
    
    const authKey = `${this.config.provider}:${this.config.auth.type}`;
    
    // Check cache first
    const cachedToken = this.tokenCache.get(authKey);
    if (cachedToken && this.isTokenValid(cachedToken)) {
      this.logInfo('Using cached authentication token', { provider: this.config.provider }, 'getAuthToken');
      return cachedToken.token;
    }
    
    // Get new token based on authentication type
    let authResult: AuthResult;
    
    switch (this.config.auth.type) {
      case 'api_key':
        authResult = await this.authenticateWithApiKey();
        break;
      case 'oauth2':
        authResult = await this.authenticateWithOAuth2();
        break;
      case 'jwt':
        authResult = await this.authenticateWithJWT();
        break;
      case 'qwen':
        authResult = await this.authenticateWithQwen();
        break;
      case 'custom':
        authResult = await this.authenticateWithCustom();
        break;
      default:
        throw new Error(`Unsupported authentication type: ${this.config.auth.type}`);
    }
    
    // Cache the token
    this.tokenCache.set(authKey, authResult);
    
    // Save token to file if specified
    if (this.tokenStoreFile) {
      await this.saveTokensToFile();
    }
    
    this.logInfo('Authentication token obtained successfully', {
      provider: this.config.provider,
      authType: this.config.auth.type,
      tokenType: authResult.tokenType,
      expiresAt: authResult.expiresAt
    }, 'getAuthToken');
    
    return authResult.token;
  }

  /**
   * Authenticate with API key
   * @returns Promise<AuthResult> - Authentication result
   */
  private async authenticateWithApiKey(): Promise<AuthResult> {
    if (!this.config?.auth.apiKey) {
      throw new Error('API key is required for api_key authentication');
    }
    
    return {
      token: this.config.auth.apiKey,
      tokenType: 'Bearer'
    };
  }

  /**
   * Authenticate with OAuth2
   * @returns Promise<AuthResult> - Authentication result
   */
  private async authenticateWithOAuth2(): Promise<AuthResult> {
    if (!this.config?.auth.oauth2) {
      throw new Error('OAuth2 configuration is required for oauth2 authentication');
    }
    
    const oauth2Config = this.config.auth.oauth2;
    
    // Try to refresh token if available
    if (oauth2Config.refreshToken) {
      try {
        return await this.refreshOAuth2Token(oauth2Config);
      } catch (error) {
        this.warn('Token refresh failed, falling back to new authentication', { error }, 'authenticateWithOAuth2');
      }
    }
    
    return await this.performOAuth2DeviceFlow(oauth2Config);
  }

  /**
   * Refresh OAuth2 token
   * @param oauth2Config - OAuth2 configuration
   * @returns Promise<AuthResult> - Authentication result
   */
  private async refreshOAuth2Token(oauth2Config: OAuth2Config): Promise<AuthResult> {
    const params = {
      grant_type: 'refresh_token',
      refresh_token: oauth2Config.refreshToken,
      client_id: oauth2Config.clientId,
      ...(oauth2Config.clientSecret && { client_secret: oauth2Config.clientSecret }),
      ...(oauth2Config.scope && { scope: oauth2Config.scope })
    };
    
    const response = await this.httpClient.post(oauth2Config.tokenEndpoint, params);
    const tokenData = response.data;
    
    return {
      token: tokenData.access_token,
      tokenType: tokenData.token_type || 'Bearer',
      expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
      refreshToken: tokenData.refresh_token
    };
  }

  /**
   * Perform OAuth2 device flow
   * @param oauth2Config - OAuth2 configuration
   * @returns Promise<AuthResult> - Authentication result
   */
  private async performOAuth2DeviceFlow(oauth2Config: OAuth2Config): Promise<AuthResult> {
    const deviceAuthEndpoint = oauth2Config.tokenEndpoint.replace('/token', '/device/code');
    
    // Start device authorization
    const deviceAuthResponse = await this.httpClient.post<QwenDeviceAuthorizationResponse>(deviceAuthEndpoint, {
      client_id: oauth2Config.clientId,
      scope: oauth2Config.scope || 'openid offline_access',
      ...(oauth2Config.pkce?.enabled && {
        code_challenge: oauth2Config.pkce.codeChallenge,
        code_challenge_method: 'S256'
      })
    });
    
    const deviceAuth = deviceAuthResponse.data;
    
    this.logInfo('Device authorization started', {
      userCode: deviceAuth.user_code,
      verificationUri: deviceAuth.verification_uri,
      expiresIn: deviceAuth.expires_in
    }, 'performOAuth2DeviceFlow');
    
    // Poll for token
    const token = await this.pollForDeviceToken(oauth2Config, deviceAuth);
    
    return token;
  }

  /**
   * Poll for device token
   * @param oauth2Config - OAuth2 configuration
   * @param deviceAuth - Device authorization response
   * @returns Promise<AuthResult> - Authentication result
   */
  private async pollForDeviceToken(oauth2Config: OAuth2Config, deviceAuth: QwenDeviceAuthorizationResponse): Promise<AuthResult> {
    const startTime = Date.now();
    const maxDuration = deviceAuth.expires_in * 1000;
    
    while (Date.now() - startTime < maxDuration) {
      try {
        await this.delay(deviceAuth.interval * 1000);
        
        const tokenResponse = await this.httpClient.post<QwenTokenResponse>(oauth2Config.tokenEndpoint, {
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceAuth.device_code,
          client_id: oauth2Config.clientId,
          ...(oauth2Config.pkce?.enabled && {
            code_verifier: oauth2Config.pkce.codeVerifier
          })
        });
        
        const tokenData = tokenResponse.data;
        
        return {
          token: tokenData.access_token,
          tokenType: tokenData.token_type || 'Bearer',
          expiresAt: Date.now() + (tokenData.expires_in * 1000),
          refreshToken: tokenData.refresh_token
        };
        
      } catch (error: any) {
        if (error.response?.data?.error === 'authorization_pending') {
          this.logInfo('Authorization pending, continuing to poll', {}, 'pollForDeviceToken');
          continue;
        } else if (error.response?.data?.error === 'slow_down') {
          this.logInfo('Slow down requested, increasing interval', {}, 'pollForDeviceToken');
          // Increase interval and continue
          continue;
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('Device authorization timed out');
  }

  /**
   * Authenticate with JWT
   * @returns Promise<AuthResult> - Authentication result
   */
  private async authenticateWithJWT(): Promise<AuthResult> {
    if (!this.config?.auth.token) {
      throw new Error('JWT token is required for jwt authentication');
    }
    
    return {
      token: this.config.auth.token,
      tokenType: 'Bearer'
    };
  }

  /**
   * Authenticate with Qwen
   * @returns Promise<AuthResult> - Authentication result
   */
  private async authenticateWithQwen(): Promise<AuthResult> {
    if (!this.config?.auth.qwenAuth) {
      throw new Error('Qwen auth configuration is required for qwen authentication');
    }
    
    const qwenAuth = this.config.auth.qwenAuth;
    
    // Try to refresh token if available and enabled
    if (qwenAuth.autoRefresh && qwenAuth.refreshToken) {
      try {
        return await this.refreshQwenToken(qwenAuth);
      } catch (error) {
        this.warn('Qwen token refresh failed', { error }, 'authenticateWithQwen');
      }
    }
    
    // Use device flow if enabled
    if (qwenAuth.deviceFlow?.enabled) {
      return await this.authenticateWithQwenDeviceFlow(qwenAuth.deviceFlow);
    }
    
    // Use existing token if available and valid
    if (qwenAuth.accessToken && this.isQwenTokenValid(qwenAuth)) {
      return {
        token: qwenAuth.accessToken,
        tokenType: 'Bearer',
        expiresAt: qwenAuth.expiresAt,
        refreshToken: qwenAuth.refreshToken
      };
    }
    
    throw new Error('No valid Qwen authentication token available');
  }

  /**
   * Check if Qwen token is valid
   * @param qwenAuth - Qwen auth configuration
   * @returns boolean - Whether token is valid
   */
  private isQwenTokenValid(qwenAuth: QwenAuthConfig): boolean {
    if (!qwenAuth.accessToken) {
      return false;
    }
    
    if (qwenAuth.expiresAt) {
      // Consider token expired 5 minutes before actual expiration
      return Date.now() < (qwenAuth.expiresAt - 5 * 60 * 1000);
    }
    
    return true;
  }

  /**
   * Refresh Qwen token
   * @param qwenAuth - Qwen auth configuration
   * @returns Promise<AuthResult> - Authentication result
   */
  private async refreshQwenToken(qwenAuth: QwenAuthConfig): Promise<AuthResult> {
    // Implement Qwen-specific token refresh logic
    this.logInfo('Refreshing Qwen token', {}, 'refreshQwenToken');
    
    // This would typically call Qwen's refresh endpoint
    // For now, we'll implement a placeholder
    
    const refreshEndpoint = 'https://dashscope.aliyuncs.com/api/v1/oauth/token';
    const response = await this.httpClient.post(refreshEndpoint, {
      grant_type: 'refresh_token',
      refresh_token: qwenAuth.refreshToken,
      client_id: qwenAuth.deviceFlow?.clientId
    });
    
    const tokenData = response.data;
    
    return {
      token: tokenData.access_token,
      tokenType: tokenData.token_type || 'Bearer',
      expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
      refreshToken: tokenData.refresh_token || qwenAuth.refreshToken
    };
  }

  /**
   * Authenticate with Qwen device flow
   * @param deviceFlow - Device flow configuration
   * @returns Promise<AuthResult> - Authentication result
   */
  private async authenticateWithQwenDeviceFlow(deviceFlow: { enabled: boolean; clientId: string; scope: string; pkce: boolean }): Promise<AuthResult> {
    const deviceAuthEndpoint = 'https://dashscope.aliyuncs.com/api/v1/oauth/device/code';
    
    // Generate PKCE codes if enabled
    let pkceCodes: { verifier: string; challenge: string } | null = null;
    if (deviceFlow.pkce) {
      pkceCodes = this.generatePKCECodes();
    }
    
    const deviceAuthResponse = await this.httpClient.post<QwenDeviceAuthorizationResponse>(deviceAuthEndpoint, {
      client_id: deviceFlow.clientId,
      scope: deviceFlow.scope,
      ...pkceCodes && {
        code_challenge: pkceCodes.challenge,
        code_challenge_method: 'S256'
      }
    });
    
    const deviceAuth = deviceAuthResponse.data;
    
    this.logInfo('Qwen device authorization started', {
      userCode: deviceAuth.user_code,
      verificationUri: deviceAuth.verification_uri
    }, 'authenticateWithQwenDeviceFlow');
    
    // Poll for token
    const token = await this.pollForDeviceToken({
      tokenEndpoint: 'https://dashscope.aliyuncs.com/api/v1/oauth/token',
      clientId: deviceFlow.clientId,
      scope: deviceFlow.scope,
      pkce: pkceCodes ? {
        enabled: true,
        codeVerifier: pkceCodes.verifier
      } : undefined
    }, deviceAuth);
    
    return token;
  }

  /**
   * Generate PKCE codes
   * @returns { verifier: string; challenge: string } - PKCE codes
   */
  private generatePKCECodes(): { verifier: string; challenge: string } {
    const auth = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(auth).digest('base64url');
    return { verifier: auth, challenge };
  }

  /**
   * Authenticate with custom function
   * @returns Promise<AuthResult> - Authentication result
   */
  private async authenticateWithCustom(): Promise<AuthResult> {
    if (!this.config?.auth.customAuth) {
      throw new Error('Custom auth function is required for custom authentication');
    }
    
    return await this.config.auth.customAuth(this.config);
  }

  /**
   * Check if token is valid
   * @param authResult - Authentication result
   * @returns boolean - Whether token is valid
   */
  private isTokenValid(authResult: AuthResult): boolean {
    if (!authResult.expiresAt) {
      return true;
    }
    
    // Consider token expired 5 minutes before actual expiration
    return Date.now() < (authResult.expiresAt - 5 * 60 * 1000);
  }

  /**
   * Build HTTP request
   * @param request - Original request data
   * @param authToken - Authentication token
   * @returns Promise<HttpRequestOptions> - HTTP request options
   */
  private async buildHttpRequest(request: any, authToken: string): Promise<HttpRequestOptions> {
    const httpRequest: HttpRequestOptions = {
      method: 'POST',
      url: this.config!.endpoint,
      headers: {
        'Authorization': `${authToken}`,
        'Content-Type': 'application/json'
      },
      data: request
    };
    
    // Apply Qwen specific request processing if configured
    if (this.config?.qwenConfig) {
      const qwenRequest = await this.processQwenRequest(request);
      httpRequest.data = qwenRequest;
      
      // Add Qwen specific headers
      if (this.config.qwenConfig.apiVersion) {
        httpRequest.headers!['X-DashScope-Api-Version'] = this.config.qwenConfig.apiVersion;
      }
      
      if (this.config.qwenConfig.workspaceId) {
        httpRequest.headers!['X-DashScope-Workspace'] = this.config.qwenConfig.workspaceId;
      }
      
      if (this.config.qwenConfig.appId) {
        httpRequest.headers!['X-DashScope-App'] = this.config.qwenConfig.appId;
      }
    }
    
    // Add custom headers if specified
    if (this.config?.headers) {
      Object.assign(httpRequest.headers!, this.config.headers);
    }
    
    this.debug('debug', 'HTTP request built', {
      method: httpRequest.method,
      url: httpRequest.url,
      headers: Object.keys(httpRequest.headers!).length,
      dataSize: JSON.stringify(httpRequest.data).length
    }, 'buildHttpRequest');
    
    return httpRequest;
  }

  /**
   * Process Qwen specific request
   * @param request - Original request
   * @returns Promise<any> - Processed request
   */
  private async processQwenRequest(request: any): Promise<any> {
    if (!this.config?.qwenConfig) {
      return request;
    }
    
    const qwenRequest: any = {
      model: this.config.qwenConfig.customParams?.model || request.model || 'qwen-turbo',
      input: {
        messages: request.messages || []
      },
      parameters: {
        temperature: request.temperature || 0.7,
        max_tokens: request.max_tokens || 1500,
        top_p: request.top_p || 1.0,
        ...request.parameters
      }
    };
    
    // Add streaming if specified
    if (request.stream) {
      qwenRequest.parameters.incremental_output = true;
    }
    
    this.debug('debug', 'Qwen request processed', qwenRequest, 'processQwenRequest');
    
    return qwenRequest;
  }

  /**
   * Process Qwen specific response
   * @param response - Original response
   * @returns Promise<any> - Processed response
   */
  private async processQwenResponse(response: any): Promise<any> {
    if (!this.config?.qwenConfig) {
      return response;
    }
    
    // Convert Qwen response to OpenAI-compatible format
    const processedResponse: any = {
      id: response.request_id,
      object: 'chat.completion',
      created: Date.now(),
      model: response.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response.output?.text || ''
          },
          finish_reason: response.output?.finish_reason || 'stop'
        }
      ],
      usage: response.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
    
    this.debug('debug', 'Qwen response processed', processedResponse, 'processQwenResponse');
    
    return processedResponse;
  }

  /**
   * Extract response data
   * @param response - Raw response data
   * @returns any - Extracted response data
   */
  private extractResponseData(response: any): any {
    // Handle different response formats
    if (response.data) {
      return response.data;
    }
    
    if (response.output) {
      return response;
    }
    
    return response;
  }

  /**
   * Send request with retry logic
   * @param httpRequest - HTTP request options
   * @returns Promise<AxiosResponse> - HTTP response
   */
  private async sendRequestWithRetry(httpRequest: HttpRequestOptions): Promise<AxiosResponse> {
    const maxRetries = this.config?.maxRetries || 3;
    const retryDelay = this.config?.retryDelay || 1000;
    
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.httpClient.request(httpRequest as AxiosRequestConfig);
        
        if (this.config?.enableLogging) {
          this.logInfo('HTTP request successful', {
            attempt,
            status: response.status,
            responseSize: JSON.stringify(response.data).length
          }, 'sendRequestWithRetry');
        }
        
        return response;
        
      } catch (error: any) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        this.warn(`HTTP request failed, retrying (${attempt}/${maxRetries})`, {
          error: error.message,
          attempt,
          nextAttempt: attempt + 1,
          retryDelay
        }, 'sendRequestWithRetry');
        
        await this.delay(retryDelay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Load tokens from file
   */
  private async loadTokensFromFile(): Promise<void> {
    if (!this.tokenStoreFile) {
      return;
    }
    
    try {
      const fs = await import('fs');
      const data = fs.readFileSync(this.tokenStoreFile, 'utf8');
      const tokens = JSON.parse(data);
      
      for (const [key, authResult] of Object.entries(tokens)) {
        this.tokenCache.set(key, authResult as AuthResult);
      }
      
      this.logInfo('Tokens loaded from file', {
        file: this.tokenStoreFile,
        tokenCount: Object.keys(tokens).length
      }, 'loadTokensFromFile');
      
    } catch (error) {
      this.warn('Failed to load tokens from file', { file: this.tokenStoreFile, error }, 'loadTokensFromFile');
    }
  }

  /**
   * Save tokens to file
   */
  private async saveTokensToFile(): Promise<void> {
    if (!this.tokenStoreFile) {
      return;
    }
    
    try {
      const fs = await import('fs');
      const tokens: Record<string, AuthResult> = {};
      
      this.tokenCache.forEach((authResult, key) => {
        tokens[key] = authResult;
      });
      
      fs.writeFileSync(this.tokenStoreFile, JSON.stringify(tokens, null, 2));
      
      this.logInfo('Tokens saved to file', {
        file: this.tokenStoreFile,
        tokenCount: this.tokenCache.size
      }, 'saveTokensToFile');
      
    } catch (error) {
      this.warn('Failed to save tokens to file', { file: this.tokenStoreFile, error }, 'saveTokensToFile');
    }
  }

  /**
   * Set up HTTP interceptors for logging
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use((config) => {
      if (this.config?.enableLogging) {
        this.debug('debug', 'HTTP request sent', {
          method: config.method,
          url: config.url,
          headers: Object.keys(config.headers || {}).length,
          dataSize: config.data ? JSON.stringify(config.data).length : 0
        }, 'setupInterceptors');
      }
      return config;
    }, (error) => {
      this.error(error, { operation: 'HTTP request' }, 'setupInterceptors');
      return Promise.reject(error);
    });
    
    // Response interceptor
    this.httpClient.interceptors.response.use((response) => {
      if (this.config?.enableLogging) {
        this.debug('debug', 'HTTP response received', {
          status: response.status,
          statusText: response.statusText,
          responseSize: JSON.stringify(response.data).length
        }, 'setupInterceptors');
      }
      return response;
    }, (error) => {
      this.error(error, { operation: 'HTTP response' }, 'setupInterceptors');
      return Promise.reject(error);
    });
  }

  /**
   * Delay execution
   * @param ms - Milliseconds to delay
   * @returns Promise<void>
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}