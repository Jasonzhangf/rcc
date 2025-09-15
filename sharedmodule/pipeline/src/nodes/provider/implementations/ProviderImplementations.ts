import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../../modules/BasePipelineModule';
import { ProviderConfig } from '../../../modules/ProviderModule';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProviderModule extends BasePipelineModule {
  protected override config: ProviderConfig = {} as ProviderConfig;
  protected httpClient: AxiosInstance;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('OpenAIProviderModule initialized', { module: this.moduleName }, 'constructor');
    
    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RCC-Pipeline/1.0.0'
      }
    });
  }

  override async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    // Configure HTTP client
    this.httpClient.defaults.timeout = config.timeout || 30000;
    
    // Set up authentication
    if (config.auth.apiKey) {
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${config.auth.apiKey}`;
    }
    
    // Set custom headers
    if (config.headers) {
      Object.assign(this.httpClient.defaults.headers.common, config.headers);
    }
    
    await super.configure(config);
    this.logInfo('OpenAIProviderModule configured', config, 'configure');
  }

  override async process(request: any): Promise<any> {
    this.logInfo('Processing OpenAI request', {
      model: this.config.model,
      endpoint: this.config.endpoint
    }, 'process');
    
    try {
      // Build OpenAI API request
      const openaiRequest = {
        model: this.config.model || 'gpt-3.5-turbo',
        messages: request.messages || [],
        temperature: request.temperature || 0.7,
        max_tokens: request.max_tokens || undefined,
        top_p: request.top_p || undefined,
        frequency_penalty: request.frequency_penalty || undefined,
        presence_penalty: request.presence_penalty || undefined,
        stream: request.stream || false,
        tools: request.tools || undefined,
        tool_choice: request.tool_choice || undefined
      };
      
      // Send request to OpenAI API
      const response = await this.httpClient.post(
        this.config.endpoint + '/chat/completions',
        openaiRequest
      );
      
      // Process response
      return this.processOpenAIResponse(response.data);
      
    } catch (error: any) {
      this.error('OpenAI API request failed', error, 'process');
      throw new Error(`OpenAI provider error: ${error.message}`);
    }
  }

  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing OpenAI response', response, 'processResponse');
    
    // OpenAI responses are typically already in the correct format
    // Just add some metadata and return
    return {
      ...response,
      processedBy: 'OpenAIProviderModule',
      processedAt: Date.now()
    };
  }

  private processOpenAIResponse(data: any): any {
    // Standard OpenAI response processing
    return {
      id: data.id,
      object: data.object,
      created: data.created,
      model: data.model,
      choices: data.choices || [],
      usage: data.usage || {},
      system_fingerprint: data.system_fingerprint
    };
  }
}

/**
 * Gemini Provider Implementation
 */
export class GeminiProviderModule extends BasePipelineModule {
  protected override config: ProviderConfig = {} as ProviderConfig;
  protected httpClient: AxiosInstance;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('GeminiProviderModule initialized', { module: this.moduleName }, 'constructor');
    
    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RCC-Pipeline/1.0.0'
      }
    });
  }

  override async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    // Configure HTTP client
    this.httpClient.defaults.timeout = config.timeout || 30000;
    
    // Set up authentication
    if (config.auth.apiKey) {
      this.httpClient.defaults.headers.common['x-goog-api-key'] = config.auth.apiKey;
    }
    
    // Set custom headers
    if (config.headers) {
      Object.assign(this.httpClient.defaults.headers.common, config.headers);
    }
    
    await super.configure(config);
    this.logInfo('GeminiProviderModule configured', config, 'configure');
  }

  override async process(request: any): Promise<any> {
    this.logInfo('Processing Gemini request', {
      model: this.config.model,
      endpoint: this.config.endpoint
    }, 'process');
    
    try {
      // Build Gemini API request
      const geminiRequest = {
        contents: request.contents || [],
        generationConfig: {
          temperature: request.temperature || 0.7,
          topP: request.top_p || undefined,
          topK: request.top_k || undefined,
          maxOutputTokens: request.max_tokens || undefined
        },
        safetySettings: request.safetySettings || [],
        tools: request.tools || undefined
      };
      
      // Send request to Gemini API
      const response = await this.httpClient.post(
        `${this.config.endpoint}/models/${this.config.model}:generateContent`,
        geminiRequest
      );
      
      // Process response
      return this.processGeminiResponse(response.data);
      
    } catch (error: any) {
      this.error('Gemini API request failed', error, 'process');
      throw new Error(`Gemini provider error: ${error.message}`);
    }
  }

  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing Gemini response', response, 'processResponse');
    
    // Gemini responses are typically already in the correct format
    // Just add some metadata and return
    return {
      ...response,
      processedBy: 'GeminiProviderModule',
      processedAt: Date.now()
    };
  }

  private processGeminiResponse(data: any): any {
    // Standard Gemini response processing
    return {
      candidates: data.candidates || [],
      promptFeedback: data.promptFeedback || null,
      usageMetadata: data.usageMetadata || {}
    };
  }
}

/**
 * Qwen Provider Implementation
 */
export class QwenProviderModule extends BasePipelineModule {
  protected override config: ProviderConfig = {} as ProviderConfig;
  protected httpClient: AxiosInstance;
  private tokenCache: Map<string, any> = new Map();

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('QwenProviderModule initialized', { module: this.moduleName }, 'constructor');
    
    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RCC-Pipeline/1.0.0'
      }
    });
  }

  override async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    // Configure HTTP client
    this.httpClient.defaults.timeout = config.timeout || 30000;
    
    // Set up Qwen-specific headers
    if (config.qwenConfig?.apiVersion) {
      this.httpClient.defaults.headers.common['X-DashScope-Api-Version'] = config.qwenConfig.apiVersion;
    }
    
    if (config.qwenConfig?.workspaceId) {
      this.httpClient.defaults.headers.common['X-DashScope-Workspace'] = config.qwenConfig.workspaceId;
    }
    
    if (config.qwenConfig?.appId) {
      this.httpClient.defaults.headers.common['X-DashScope-App'] = config.qwenConfig.appId;
    }
    
    // Set custom headers
    if (config.headers) {
      Object.assign(this.httpClient.defaults.headers.common, config.headers);
    }
    
    await super.configure(config);
    this.logInfo('QwenProviderModule configured', config, 'configure');
  }

  override async process(request: any): Promise<any> {
    this.logInfo('Processing Qwen request', {
      model: this.config.model,
      endpoint: this.config.endpoint
    }, 'process');
    
    try {
      // Get authentication token
      const authToken = await this.getAuthToken();
      
      // Set authentication header
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      
      // Build Qwen API request
      const qwenRequest = {
        model: this.config.model || 'qwen-turbo',
        input: {
          messages: request.messages || []
        },
        parameters: {
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || undefined,
          top_p: request.top_p || undefined
        }
      };
      
      // Send request to Qwen API
      const response = await this.httpClient.post(
        this.config.endpoint + '/services/aigc/text-generation/generation',
        qwenRequest
      );
      
      // Process response
      return this.processQwenResponse(response.data);
      
    } catch (error: any) {
      this.error('Qwen API request failed', error, 'process');
      throw new Error(`Qwen provider error: ${error.message}`);
    }
  }

  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing Qwen response', response, 'processResponse');
    
    // Qwen responses might need specific processing
    return {
      ...response,
      processedBy: 'QwenProviderModule',
      processedAt: Date.now()
    };
  }

  private async getAuthToken(): Promise<string> {
    // Check cache first
    const cacheKey = `${this.config.provider}:qwen`;
    const cached = this.tokenCache.get(cacheKey);
    
    if (cached && this.isTokenValid(cached)) {
      return cached.token;
    }
    
    // For Qwen, we typically use API key auth or OAuth2
    if (this.config.auth.apiKey) {
      return this.config.auth.apiKey;
    }
    
    if (this.config.auth.type === 'qwen' && this.config.auth.qwenAuth?.accessToken) {
      return this.config.auth.qwenAuth.accessToken;
    }
    
    throw new Error('No valid authentication method found for Qwen provider');
  }

  private isTokenValid(tokenData: any): boolean {
    return tokenData.expires_at ? Date.now() < tokenData.expires_at : true;
  }

  private processQwenResponse(data: any): any {
    // Standard Qwen response processing
    return {
      request_id: data.request_id,
      output: data.output || {},
      usage: data.usage || {}
    };
  }
}

/**
 * Default Provider Implementation
 * A flexible implementation that can handle various HTTP-based providers
 */
export class DefaultProviderModule extends BasePipelineModule {
  protected override config: ProviderConfig = {} as ProviderConfig;
  protected httpClient: AxiosInstance;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('DefaultProviderModule initialized', { module: this.moduleName }, 'constructor');
    
    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RCC-Pipeline/1.0.0'
      }
    });
  }

  override async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    // Configure HTTP client
    this.httpClient.defaults.timeout = config.timeout || 30000;
    
    // Set up authentication based on type
    switch (config.auth.type) {
      case 'api_key':
        if (config.auth.apiKey) {
          this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${config.auth.apiKey}`;
        }
        break;
      
      case 'custom':
        // Custom auth would be handled in the request processing
        break;
    }
    
    // Set custom headers
    if (config.headers) {
      Object.assign(this.httpClient.defaults.headers.common, config.headers);
    }
    
    await super.configure(config);
    this.logInfo('DefaultProviderModule configured', config, 'configure');
  }

  override async process(request: any): Promise<any> {
    this.logInfo('Processing request with default provider', {
      provider: this.config.provider,
      endpoint: this.config.endpoint
    }, 'process');
    
    try {
      // Apply custom authentication if configured
      if (this.config.auth.type === 'custom' && this.config.auth.customAuth) {
        const authResult = await this.config.auth.customAuth(request);
        this.httpClient.defaults.headers.common['Authorization'] = `${authResult.tokenType} ${authResult.token}`;
      }
      
      // Send request to provider
      const response = await this.httpClient.post(
        this.config.endpoint,
        request
      );
      
      // Process response
      return this.processDefaultResponse(response.data);
      
    } catch (error: any) {
      this.error('Default provider request failed', error, 'process');
      throw new Error(`Provider error: ${error.message}`);
    }
  }

  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing response with default provider', response, 'processResponse');
    
    // Default response processing
    return {
      ...response,
      processedBy: 'DefaultProviderModule',
      processedAt: Date.now(),
      provider: this.config.provider
    };
  }

  private processDefaultResponse(data: any): any {
    // Generic response processing
    return {
      data,
      timestamp: Date.now(),
      provider: this.config.provider
    };
  }
}