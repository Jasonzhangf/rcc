/**
 * Standard OpenAI-Compatible Provider Module (Framework-based)
 * Provides a generic OpenAI-compatible interface for various AI providers using the framework
 */

import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import { ProviderConfig, CompatibilityModule } from 'openai-compatible-providers-framework';
import { OpenAIChatRequest } from 'openai-compatible-providers-framework/dist/framework/OpenAIInterface';
// We'll import specific providers as needed

/**
 * OpenAI Provider Configuration (compatible with framework)
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
 * Framework-based OpenAI-Compatible Provider Module
 */
export class OpenAIProviderModule extends BasePipelineModule {
  protected override config: Partial<OpenAIProviderConfig> = {} as Partial<OpenAIProviderConfig>;
  private frameworkProvider: any | null = null; // Will be initialized with specific provider
  private metrics: ProviderMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0
  };

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('OpenAIProviderModule initialized with framework', { module: this.moduleName }, 'constructor');
  }

  /**
   * Configure the provider using framework
   */
  public override async configure(config: OpenAIProviderConfig): Promise<void> {
    this.logInfo('Configuring OpenAIProviderModule with framework', config, 'configure');
    this.config = config;
    
    // Initialize framework provider
    await this.initializeFrameworkProvider();
    
    await super.configure(config);
    this.logInfo('OpenAIProviderModule configured successfully with framework', config, 'configure');
  }

  /**
   * Initialize framework provider
   */
  private async initializeFrameworkProvider(): Promise<void> {
    try {
      this.logInfo('Initializing framework provider', {}, 'initializeFrameworkProvider');
      
      const providerConfig: ProviderConfig = {
        name: this.config.provider,
        endpoint: this.config.endpoint,
        supportedModels: this.config.model ? [this.config.model] : [],
        defaultModel: this.config.model
      };
      
      // For now, we'll store the config and defer provider initialization until we know which specific provider to use
      this.frameworkProvider = { config: providerConfig };
      
      this.logInfo('Framework provider initialized successfully', { provider: this.config.provider }, 'initializeFrameworkProvider');
    } catch (error) {
      this.error('Failed to initialize framework provider', error as Error, 'initializeFrameworkProvider');
      throw error;
    }
  }

  /**
   * Process request through the provider using framework
   */
  public override async process(request: any): Promise<any> {
    this.logInfo('Processing OpenAI provider request with framework', {
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
      
      // Validate configuration
      if (!this.config) {
        throw new Error('OpenAIProviderModule not configured');
      }
      
      if (!this.frameworkProvider) {
        await this.initializeFrameworkProvider();
      }
      
      // Process the request using framework
      // For testing purposes, we'll return a mock response since we don't have a concrete provider implementation yet
      const response = {
        id: 'mock-response-id',
        object: 'chat.completion',
        created: Date.now(),
        model: request.model || this.config.model || 'default-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a mock response from the framework-based OpenAI provider module.'
            },
            finish_reason: 'stop'
          }
        ]
      };
      
      // Log output data at output port
      this.logOutputPort(response, 'openai-output', 'next-module');
      
      // Update metrics
      this.metrics.successfulRequests++;
      this.metrics.lastResponseTime = Date.now();
      const duration = Date.now() - startTime;
      this.updateAverageResponseTime(duration);
      
      this.debug('debug', 'OpenAI provider request processing complete with framework', {
        processingTime: duration,
        // model: response.model, // This might not be available in the response
        // responseId: response.id // This might not be available in the response
      }, 'process');
      
      return response;
    } catch (error) {
      this.metrics.failedRequests++;
      this.error('Error processing OpenAI request with framework', { 
        error: error as Error,
        providerType: this.config.provider 
      }, 'process');
      throw error;
    }
  }

  /**
   * Process response (passthrough for compatibility) using framework
   */
  public override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing OpenAI provider response with framework', {
      providerType: this.config.provider,
      responseSize: JSON.stringify(response).length
    }, 'processResponse');
    
    try {
      // Log input data at input port
      this.logInputPort(response, 'openai-response-input', 'next-module');
      
      // Validate configuration
      if (!this.config) {
        throw new Error('OpenAIProviderModule not configured');
      }
      
      if (!this.frameworkProvider) {
        await this.initializeFrameworkProvider();
      }
      
      // For now, return response as-is (framework handles mapping internally)
      const result = response;
      
      // Log output data at output port
      this.logOutputPort(result, 'openai-response-output', 'external');
      
      return result;
    } catch (error) {
      this.error('Error processing OpenAI response with framework', { 
        error: error as Error,
        providerType: this.config.provider 
      }, 'processResponse');
      throw error;
    }
  }

  /**
   * Make a chat completion request to the OpenAI-compatible API using framework
   */
  public async chatCompletion(request: any): Promise<any> {
    this.logDebug('Making chat completion request with framework', {
      model: request.model,
      messageCount: request.messages?.length,
      temperature: request.temperature,
      maxTokens: request.max_tokens
    }, 'chatCompletion');
    
    try {
      if (!this.frameworkProvider) {
        await this.initializeFrameworkProvider();
      }
      
      // For testing purposes, we'll return a mock response since we don't have a concrete provider implementation yet
      const response = {
        id: 'mock-response-id',
        object: 'chat.completion',
        created: Date.now(),
        model: request.model || this.config.model || 'default-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a mock response from the framework-based OpenAI provider module.'
            },
            finish_reason: 'stop'
          }
        ]
      };
      return response;
    } catch (error) {
      this.error('Chat completion request failed with framework', { 
        error: error as Error,
        request 
      }, 'chatCompletion');
      throw error;
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
   * Health check - verify provider is accessible using framework
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    try {
      if (!this.frameworkProvider) {
        await this.initializeFrameworkProvider();
      }
      
      const startTime = Date.now();
      
      // For testing purposes, we'll return a mock health check result
      const healthResult = {
        status: 'healthy' as const,
        provider: this.config.provider,
        timestamp: new Date().toISOString()
      };
      
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: healthResult.status === 'healthy',
        responseTime,
        error: healthResult.error
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
    this.logDebug('Destroying OpenAI provider with framework', {}, 'destroy');
    
    // Reset metrics
    this.resetMetrics();
    
    // Clean up framework provider if needed
    this.frameworkProvider = null;
    
    await super.destroy();
    
    this.logDebug('OpenAI provider destroyed with framework', {}, 'destroy');
  }
}