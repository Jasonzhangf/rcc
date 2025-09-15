import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * LMStudio Provider Configuration
 */
export interface LMStudioProviderConfig {
  /** Provider type */
  provider: 'lmstudio';
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
  /** LMStudio specific configuration */
  lmstudioConfig?: LMStudioConfig;
}

/**
 * LMStudio Configuration
 */
export interface LMStudioConfig {
  /** Workspace ID */
  workspaceId?: string;
  /** API version */
  apiVersion?: string;
  /** Region */
  region?: string;
  /** Enable parameter encryption */
  enableEncryption?: boolean;
  /** Custom parameters */
  customParams?: Record<string, any>;
  /** SDK configuration */
  sdkConfig?: {
    /** SDK version */
    version: string;
    /** SDK initialization options */
    initOptions: Record<string, any>;
    /** SDK authentication */
    auth: {
      apiKey?: string;
      token?: string;
      customAuth?: (request: any) => Promise<AuthResult>;
    };
  };
}

/**
 * Authentication Configuration
 */
export interface AuthConfig {
  /** Authentication type */
  type: 'api_key' | 'custom' | 'sdk';
  /** API key (for api_key type) */
  apiKey?: string;
  /** Token (for sdk type) */
  token?: string;
  /** Custom auth function (for custom type) */
  customAuth?: (request: any) => Promise<AuthResult>;
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
 * LMStudio SDK Interface
 */
export interface LMStudioSDK {
  /** SDK initialization */
  initialize(config: any): Promise<void>;
  /** Send chat completion request */
  chatCompletion(request: any): Promise<any>;
  /** Send streaming chat completion request */
  streamingChatCompletion(request: any): Promise<any>;
  /** Get available models */
  getModels(): Promise<any[]>;
  /** Get model info */
  getModelInfo(modelId: string): Promise<any>;
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
  stop?: string[];
  stream?: boolean;
  n?: number;
  user?: string;
  tools?: any[];
  tool_choice?: any;
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
      tool_calls?: any[];
    };
    finish_reason: 'stop' | 'length' | 'tool_calls';
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LMStudioProviderModule extends BasePipelineModule {
  protected override config: LMStudioProviderConfig = {} as LMStudioProviderConfig;
  protected httpClient: AxiosInstance;
  private tokenCache: Map<string, AuthResult> = new Map();
  private sdkInstance: LMStudioSDK | null = null;
  private sdkLoaded = false;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('LMStudioProviderModule initialized', { module: this.moduleName }, 'constructor');
    
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
   * Configure the LMStudio Provider module
   * @param config - Configuration object
   */
  override async configure(config: LMStudioProviderConfig): Promise<void> {
    this.logInfo('Configuring LMStudioProviderModule', config, 'configure');
    
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

    // Initialize LMStudio SDK if configured
    if (this.config.lmstudioConfig?.sdkConfig) {
      await this.initializeSDK();
    }
    
    await super.configure(this.config);
    this.logInfo('LMStudioProviderModule configured successfully', this.config, 'configure');
  }

  /**
   * Initialize LMStudio SDK
   */
  private async initializeSDK(): Promise<void> {
    if (!this.config.lmstudioConfig?.sdkConfig) {
      return;
    }

    const sdkConfig = this.config.lmstudioConfig.sdkConfig;
    this.logInfo('Initializing LMStudio SDK', sdkConfig, 'initializeSDK');

    try {
      // Try to load LMStudio SDK
      // This is a placeholder implementation since we don't have the actual SDK
      // In a real implementation, you would import and initialize the actual SDK
      
      // For now, we'll simulate SDK loading
      this.sdkLoaded = await this.loadLMStudioSDK(sdkConfig);
      
      if (this.sdkLoaded) {
        this.logInfo('LMStudio SDK initialized successfully', {}, 'initializeSDK');
      } else {
        this.warn('LMStudio SDK not available, falling back to HTTP API', {}, 'initializeSDK');
      }
    } catch (error) {
      this.warn('Failed to initialize LMStudio SDK, falling back to HTTP API', { error }, 'initializeSDK');
    }
  }

  /**
   * Load LMStudio SDK (placeholder implementation)
   * @param sdkConfig - SDK configuration
   * @returns Promise<boolean> - Whether SDK was loaded successfully
   */
  private async loadLMStudioSDK(sdkConfig: any): Promise<boolean> {
    try {
      // This is a placeholder implementation
      // In a real implementation, you would:
      // 1. Import the LMStudio SDK
      // 2. Initialize it with the provided configuration
      // 3. Set up authentication
      
      // For demonstration purposes, we'll simulate SDK loading
      this.sdkInstance = {
        initialize: async (config: any) => {
          // Simulate SDK initialization
          return Promise.resolve();
        },
        chatCompletion: async (request: any) => {
          // Simulate SDK chat completion
          return this.simulateSDKChatCompletion(request);
        },
        streamingChatCompletion: async (request: any) => {
          // Simulate SDK streaming chat completion
          return this.simulateSDKStreamingChatCompletion(request);
        },
        getModels: async () => {
          // Simulate getting models
          return [];
        },
        getModelInfo: async (modelId: string) => {
          // Simulate getting model info
          return {};
        }
      };

      // Initialize the SDK
      await this.sdkInstance.initialize(sdkConfig.initOptions);
      
      return true;
    } catch (error) {
      this.logError('Failed to load LMStudio SDK', error, 'loadLMStudioSDK');
      return false;
    }
  }

  /**
   * Process request - Send request to LMStudio provider
   * @param request - Input request
   * @returns Promise<any> - Provider response
   */
  override async process(request: any): Promise<any> {
    this.logInfo('Processing LMStudio Provider request', {
      provider: this.config?.provider,
      endpoint: this.config?.endpoint,
      useSDK: this.sdkLoaded,
      requestSize: JSON.stringify(request).length
    }, 'process');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(request, 'lmstudio-provider-input', 'previous-module');
      
      // Validate configuration
      if (!this.config) {
        throw new Error('LMStudioProviderModule not configured');
      }
      
      // Use SDK if available, otherwise use HTTP API
      let response: any;
      if (this.sdkLoaded && this.sdkInstance) {
        response = await this.processWithSDK(request);
      } else {
        response = await this.processWithHTTP(request);
      }
      
      // Process response
      const processedResponse = await this.processResponse(response);
      
      // Log output data at output port
      this.logOutputPort(processedResponse, 'lmstudio-provider-output', 'next-module');
      
      this.debug('debug', `LMStudio Provider request completed in ${Date.now() - startTime}ms`, processedResponse, 'process');
      
      return processedResponse;
      
    } catch (error: any) {
      this.error(error, {
        provider: this.config?.provider,
        operation: 'process',
        useSDK: this.sdkLoaded
      }, 'process');
      
      throw new Error(`LMStudio Provider error: ${error.message}`);
    }
  }

  /**
   * Process request using LMStudio SDK
   * @param request - Input request
   * @returns Promise<any> - SDK response
   */
  private async processWithSDK(request: any): Promise<any> {
    this.logInfo('Processing request with LMStudio SDK', {
      model: request.model,
      streaming: request.stream
    }, 'processWithSDK');

    try {
      // Convert OpenAI request to LMStudio SDK format
      const sdkRequest = this.convertToSDKRequest(request);
      
      // Send request via SDK
      let sdkResponse: any;
      if (request.stream) {
        sdkResponse = await this.sdkInstance!.streamingChatCompletion(sdkRequest);
      } else {
        sdkResponse = await this.sdkInstance!.chatCompletion(sdkRequest);
      }
      
      // Convert SDK response to OpenAI format
      const openAIResponse = this.convertSDKResponseToOpenAI(sdkResponse);
      
      this.logInfo('SDK request completed successfully', {
        model: request.model,
        responseId: openAIResponse.id
      }, 'processWithSDK');
      
      return openAIResponse;
      
    } catch (error: any) {
      this.error('SDK request failed', { error }, 'processWithSDK');
      throw error;
    }
  }

  /**
   * Process request using HTTP API
   * @param request - Input request
   * @returns Promise<any> - HTTP response
   */
  private async processWithHTTP(request: any): Promise<any> {
    this.logInfo('Processing request with HTTP API', {
      endpoint: this.config?.endpoint,
      model: request.model
    }, 'processWithHTTP');

    // Get authentication token
    const authToken = await this.getAuthToken();
    
    // Build HTTP request
    const httpRequest = await this.buildHttpRequest(request, authToken);
    
    // Send request with retry logic
    const response = await this.sendRequestWithRetry(httpRequest);
    
    return response.data;
  }

  /**
   * Process response - Handle response processing
   * @param response - Input response data
   * @returns Promise<any> - Processed response data
   */
  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing LMStudio Provider response', {
      provider: this.config?.provider,
      responseSize: JSON.stringify(response).length
    }, 'processResponse');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(response, 'lmstudio-provider-response-input', 'external');
      
      // Validate response
      if (!response) {
        throw new Error('Invalid response from LMStudio provider');
      }
      
      // Convert LMStudio response to OpenAI format if needed
      const openAIResponse = this.convertLMStudioResponseToOpenAI(response);
      
      // Log output data at output port
      this.logOutputPort(openAIResponse, 'lmstudio-provider-response-output', 'next-module');
      
      this.debug('debug', `LMStudio Provider response processing completed in ${Date.now() - startTime}ms`, openAIResponse, 'processResponse');
      
      return openAIResponse;
      
    } catch (error: any) {
      this.error(error, {
        provider: this.config?.provider,
        operation: 'processResponse'
      }, 'processResponse');
      
      throw new Error(`LMStudio Provider response error: ${error.message}`);
    }
  }

  /**
   * Get authentication token
   * @returns Promise<string> - Authentication token
   */
  private async getAuthToken(): Promise<string> {
    if (!this.config) {
      throw new Error('LMStudioProviderModule not configured');
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
      case 'sdk':
        authResult = await this.authenticateWithSDK();
        break;
      case 'custom':
        authResult = await this.authenticateWithCustom();
        break;
      default:
        throw new Error(`Unsupported authentication type: ${this.config.auth.type}`);
    }
    
    // Cache the token
    this.tokenCache.set(authKey, authResult);
    
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
   * Authenticate with SDK
   * @returns Promise<AuthResult> - Authentication result
   */
  private async authenticateWithSDK(): Promise<AuthResult> {
    if (!this.config?.auth.token) {
      throw new Error('Token is required for sdk authentication');
    }
    
    return {
      token: this.config.auth.token,
      tokenType: 'Bearer'
    };
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
   * Convert OpenAI request to LMStudio SDK format
   * @param openAIRequest - OpenAI request
   * @returns any - LMStudio SDK request
   */
  private convertToSDKRequest(openAIRequest: OpenAIChatRequest): any {
    // Convert OpenAI format to LMStudio SDK format
    const sdkRequest = {
      model: openAIRequest.model,
      messages: openAIRequest.messages,
      parameters: {
        temperature: openAIRequest.temperature,
        max_tokens: openAIRequest.max_tokens,
        top_p: openAIRequest.top_p,
        frequency_penalty: openAIRequest.frequency_penalty,
        presence_penalty: openAIRequest.presence_penalty,
        stop: openAIRequest.stop,
        stream: openAIRequest.stream
      }
    };
    
    // Remove undefined parameters
    Object.keys(sdkRequest.parameters).forEach(key => {
      if (sdkRequest.parameters[key] === undefined) {
        delete sdkRequest.parameters[key];
      }
    });
    
    return sdkRequest;
  }

  /**
   * Convert SDK response to OpenAI format
   * @param sdkResponse - SDK response
   * @returns OpenAIChatResponse - OpenAI-compatible response
   */
  private convertSDKResponseToOpenAI(sdkResponse: any): OpenAIChatResponse {
    // Convert LMStudio SDK response to OpenAI format
    return {
      id: sdkResponse.id || `lmstudio-${Date.now()}`,
      object: 'chat.completion',
      created: sdkResponse.created || Date.now(),
      model: sdkResponse.model || 'unknown',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: sdkResponse.content || '',
          tool_calls: sdkResponse.tool_calls
        },
        finish_reason: sdkResponse.finish_reason || 'stop'
      }],
      usage: sdkResponse.usage
    };
  }

  /**
   * Convert LMStudio HTTP response to OpenAI format
   * @param lmStudioResponse - LMStudio HTTP response
   * @returns OpenAIChatResponse - OpenAI-compatible response
   */
  private convertLMStudioResponseToOpenAI(lmStudioResponse: any): OpenAIChatResponse {
    // LMStudio is OpenAI-compatible, so minimal conversion needed
    return {
      id: lmStudioResponse.id || `lmstudio-${Date.now()}`,
      object: lmStudioResponse.object || 'chat.completion',
      created: lmStudioResponse.created || Date.now(),
      model: lmStudioResponse.model || 'unknown',
      choices: lmStudioResponse.choices || [{
        index: 0,
        message: {
          role: 'assistant',
          content: '',
          tool_calls: []
        },
        finish_reason: 'stop'
      }],
      usage: lmStudioResponse.usage
    };
  }

  /**
   * Simulate SDK chat completion (placeholder)
   * @param request - SDK request
   * @returns Promise<any> - Simulated SDK response
   */
  private async simulateSDKChatCompletion(request: any): Promise<any> {
    // This is a placeholder simulation
    // In a real implementation, the actual SDK would handle this
    
    return {
      id: `lmstudio-${Date.now()}`,
      created: Date.now(),
      model: request.model,
      content: 'LMStudio SDK response (simulated)',
      finish_reason: 'stop',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      }
    };
  }

  /**
   * Simulate SDK streaming chat completion (placeholder)
   * @param request - SDK request
   * @returns Promise<any> - Simulated SDK streaming response
   */
  private async simulateSDKStreamingChatCompletion(request: any): Promise<any> {
    // This is a placeholder simulation
    // In a real implementation, the actual SDK would handle streaming
    
    return {
      id: `lmstudio-${Date.now()}`,
      created: Date.now(),
      model: request.model,
      stream: true,
      choices: [{
        index: 0,
        delta: { content: 'LMStudio SDK streaming response (simulated)' }
      }]
    };
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

  /**
   * Get available models
   * @returns Promise<string[]> - List of available models
   */
  async getAvailableModels(): Promise<string[]> {
    if (this.sdkLoaded && this.sdkInstance) {
      try {
        const models = await this.sdkInstance.getModels();
        return models.map((model: any) => model.id || model.name);
      } catch (error) {
        this.warn('Failed to get models from SDK', { error }, 'getAvailableModels');
      }
    }
    
    // Fallback to HTTP API
    try {
      const authToken = await this.getAuthToken();
      const response = await this.httpClient.get(`${this.config!.endpoint}/models`, {
        headers: { 'Authorization': authToken }
      });
      return response.data.data.map((model: any) => model.id);
    } catch (error) {
      this.warn('Failed to get models from HTTP API', { error }, 'getAvailableModels');
      return [];
    }
  }

  /**
   * Get model information
   * @param modelId - Model ID
   * @returns Promise<any> - Model information
   */
  async getModelInfo(modelId: string): Promise<any> {
    if (this.sdkLoaded && this.sdkInstance) {
      try {
        return await this.sdkInstance.getModelInfo(modelId);
      } catch (error) {
        this.warn('Failed to get model info from SDK', { error }, 'getModelInfo');
      }
    }
    
    // Fallback to HTTP API
    try {
      const authToken = await this.getAuthToken();
      const response = await this.httpClient.get(`${this.config!.endpoint}/models/${modelId}`, {
        headers: { 'Authorization': authToken }
      });
      return response.data;
    } catch (error) {
      this.warn('Failed to get model info from HTTP API', { error }, 'getModelInfo');
      return null;
    }
  }
}