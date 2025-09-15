/**
 * Standard OpenAI-Compatible Provider Module
 * Provides a generic OpenAI-compatible interface for various AI providers
 */

import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../modules/BasePipelineModule';
import axios, { AxiosInstance } from 'axios';

/**
 * OpenAI Provider Configuration
 */
export interface OpenAIProviderConfig {
  /** Provider type - always 'openai' */
  provider: 'openai';
  /** OpenAI API endpoint */
  endpoint: string;
  /** Authentication configuration */
  auth: {
    /** Authentication type */
    type: 'api_key' | 'bearer';
    /** API key or bearer token */
    token: string;
    /** Custom headers */
    headers?: Record<string, string>;
  };
  /** Default model */
  model?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retries */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Custom parameters */
  parameters?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
  /** Enable request/response logging */
  enableLogging?: boolean;
  /** Debug configuration */
  debug?: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logRequests?: boolean;
    logResponses?: boolean;
  };
}

/**
 * OpenAI Chat Request
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
 * OpenAI Chat Response
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

/**
 * Provider Metrics
 */
export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: number;
  lastResponseTime?: number;
}

/**
 * Standard OpenAI-Compatible Provider Module
 */
export class OpenAIProviderModule extends BasePipelineModule {
  protected override config: OpenAIProviderConfig = {} as OpenAIProviderConfig;
  private httpClient: AxiosInstance;
  private metrics: ProviderMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0
  };

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('OpenAIProviderModule initialized', { module: this.moduleName }, 'constructor');
    
    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Configure the provider
   */
  public override async configure(config: OpenAIProviderConfig): Promise<void> {
    this.logInfo('Configuring OpenAIProviderModule', config, 'configure');
    this.config = config;
    
    // Update HTTP client configuration
    this.httpClient = axios.create({
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(config.auth),
        ...config.auth.headers,
        ...config.headers
      }
    });
    
    await super.configure(config);
    this.logInfo('OpenAIProviderModule configured successfully', config, 'configure');
  }

  /**
   * Process request through the provider
   */
  public override async process(request: any): Promise<any> {
    this.logInfo('Processing OpenAI provider request', {
      providerType: this.config.provider,
      endpoint: this.config.endpoint,
      model: request.model,
      requestSize: JSON.stringify(request).length
    }, 'process');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(request, 'openai-input', 'previous-module');
      
      // Update metrics
      this.metrics.totalRequests++;
      this.metrics.lastRequestTime = startTime;
      
      // Process the request
      const response = await this.makeOpenAIRequest(request);
      
      // Log output data at output port
      this.logOutputPort(response, 'openai-output', 'next-module');
      
      // Update metrics
      this.metrics.successfulRequests++;
      this.metrics.lastResponseTime = Date.now();
      const duration = Date.now() - startTime;
      this.updateAverageResponseTime(duration);
      
      this.debug('debug', 'OpenAI provider request processing complete', {
        processingTime: duration,
        model: response.model,
        responseId: response.id
      }, 'process');
      
      return response;
    } catch (error) {
      this.metrics.failedRequests++;
      this.error('Error processing OpenAI request', { 
        error: error as Error,
        providerType: this.config.provider 
      }, 'process');
      throw error;
    }
  }

  /**
   * Process response (passthrough for compatibility)
   */
  public override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing OpenAI provider response', {
      providerType: this.config.provider,
      responseSize: JSON.stringify(response).length
    }, 'processResponse');
    
    try {
      // Log input data at input port
      this.logInputPort(response, 'openai-response-input', 'next-module');
      
      // For now, return response as-is
      const result = response;
      
      // Log output data at output port
      this.logOutputPort(result, 'openai-response-output', 'external');
      
      return result;
    } catch (error) {
      this.error('Error processing OpenAI response', { 
        error: error as Error,
        providerType: this.config.provider 
      }, 'processResponse');
      throw error;
    }
  }

  /**
   * Make a chat completion request to the OpenAI-compatible API
   */
  public async chatCompletion(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    this.logDebug('Making chat completion request', {
      model: request.model,
      messageCount: request.messages.length,
      temperature: request.temperature,
      maxTokens: request.max_tokens
    }, 'chatCompletion');
    
    try {
      const response = await this.makeOpenAIRequest(request);
      return response as OpenAIChatResponse;
    } catch (error) {
      this.error('Chat completion request failed', { 
        error: error as Error,
        request 
      }, 'chatCompletion');
      throw error;
    }
  }

  /**
   * Make the actual API request
   */
  private async makeOpenAIRequest(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    const apiRequest = {
      ...request,
      model: request.model || this.config.model || 'gpt-3.5-turbo',
      // Merge with default parameters
      ...this.config.parameters
    };

    if (this.config.debug?.enabled && this.config.debug.logRequests) {
      this.logDebug('API Request', {
        url: `${this.config.endpoint}/chat/completions`,
        method: 'POST',
        data: apiRequest
      }, 'makeOpenAIRequest');
    }

    const response = await this.httpClient.post(
      `${this.config.endpoint}/chat/completions`,
      apiRequest
    );

    if (this.config.debug?.enabled && this.config.debug.logResponses) {
      this.logDebug('API Response', {
        status: response.status,
        data: response.data
      }, 'makeOpenAIRequest');
    }

    return response.data;
  }

  /**
   * Get authentication header based on auth type
   */
  private getAuthHeader(auth: OpenAIProviderConfig['auth']): Record<string, string> {
    switch (auth.type) {
      case 'api_key':
        return {
          'Authorization': `Bearer ${auth.token}`
        };
      case 'bearer':
        return {
          'Authorization': `Bearer ${auth.token}`
        };
      default:
        return {};
    }
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
   * Get provider metrics
   */
  public getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Health check - verify provider is accessible
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      // Make a simple request to check API health
      await this.httpClient.get(`${this.config.endpoint}/models`);
      
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        responseTime
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle incoming messages
   */
  public override async handleMessage(message: any): Promise<any> {
    this.logDebug('Handling message', { type: message.type, source: message.source }, 'handleMessage');
    
    switch (message.type) {
      case 'get_metrics':
        return {
          success: true,
          data: this.getMetrics()
        };
        
      case 'reset_metrics':
        this.resetMetrics();
        return {
          success: true,
          data: { message: 'Metrics reset successfully' }
        };
        
      case 'health_check':
        const health = await this.healthCheck();
        return {
          success: health.healthy,
          data: health
        };
        
      case 'chat_completion':
        try {
          const response = await this.chatCompletion(message.payload);
          return {
            success: true,
            data: response
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
        
      default:
        return super.handleMessage(message);
    }
  }

  /**
   * Destroy the provider
   */
  public override async destroy(): Promise<void> {
    this.logDebug('Destroying OpenAI provider', {}, 'destroy');
    
    // Reset metrics
    this.resetMetrics();
    
    await super.destroy();
    
    this.logDebug('OpenAI provider destroyed', {}, 'destroy');
  }
}