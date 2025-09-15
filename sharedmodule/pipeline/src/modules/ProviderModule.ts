import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import QwenProvider from 'openai-compatible-providers-framework/dist/providers/qwen';
import BaseProvider from 'openai-compatible-providers-framework/dist/framework/BaseProvider';

/**
 * Provider Module Configuration (wrapper for framework config)
 */
export interface ProviderModuleConfig {
  /** Provider type */
  provider: string;
  /** API endpoint */
  endpoint: string;
  /** Authentication configuration */
  auth?: any;
  /** Model configuration */
  model?: string;
  /** Enable request/response logging */
  enableLogging?: boolean;
  /** Provider-specific configuration */
  providerConfig?: any;
}

// Qwen configuration is now handled by the framework

// Authentication configuration is now handled by the framework

// Qwen authentication configuration is now handled by the framework

// OAuth2 configuration is now handled by the framework

// Authentication result is now handled by the framework

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
  protected override config: ProviderModuleConfig = {} as ProviderModuleConfig;
  private frameworkProvider: BaseProvider | null = null;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('ProviderModule initialized with framework', { module: this.moduleName }, 'constructor');
  }

  /**
   * Configure the Provider module using framework
   * @param config - Configuration object
   */
  override async configure(config: ProviderModuleConfig): Promise<void> {
    this.logInfo('Configuring ProviderModule with framework', config, 'configure');
    
    this.config = config;
    
    // Initialize framework provider
    await this.initializeFrameworkProvider();
    
    await super.configure(this.config);
    this.logInfo('ProviderModule configured successfully with framework', this.config, 'configure');
  }

  /**
   * Process request - Send request to provider using framework
   * @param request - Input request
   * @returns Promise<any> - Provider response
   */
  override async process(request: any): Promise<any> {
    this.logInfo('Processing Provider request with framework', {
      provider: this.config?.provider,
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
      
      // Initialize provider if not already done
      if (!this.frameworkProvider) {
        await this.initializeFrameworkProvider();
      }
      
      // Use framework provider to process request
      const response = await this.frameworkProvider!.chat(request);
      
      // Log output data at output port
      this.logOutputPort(response, 'provider-output', 'external');
      
      this.debug('debug', `Provider request completed in ${Date.now() - startTime}ms with framework`, response, 'process');
      
      return response;
      
    } catch (error: any) {
      this.error(error, {
        provider: this.config?.provider,
        operation: 'process'
      }, 'process');
      
      // Re-throw with proper error code
      throw new Error(`Provider error with framework: ${error.message}`);
    }
  }

  /**
   * Process response - Handle response processing using framework
   * @param response - Input response data
   * @returns Promise<any> - Processed response data
   */
  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing Provider response with framework', {
      provider: this.config?.provider,
      responseSize: JSON.stringify(response).length
    }, 'processResponse');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(response, 'provider-response-input', 'external');
      
      // Initialize provider if not already done
      if (!this.frameworkProvider) {
        await this.initializeFrameworkProvider();
      }
      
      // The framework's chat method should already return a standardized response
      // For now, we'll just pass through the response as-is
      const standardizedResponse = response;
      
      // Log output data at output port
      this.logOutputPort(standardizedResponse, 'provider-response-output', 'next-module');
      
      this.debug('debug', `Provider response processing completed in ${Date.now() - startTime}ms with framework`, standardizedResponse, 'processResponse');
      
      return standardizedResponse;
      
    } catch (error: any) {
      this.error(error, {
        provider: this.config?.provider,
        operation: 'processResponse'
      }, 'processResponse');
      
      throw new Error(`Provider response error with framework: ${error.message}`);
    }
  }

  /**
   * Initialize framework provider
   */
  private async initializeFrameworkProvider(): Promise<void> {
    try {
      this.logInfo('Initializing framework provider', {}, 'initializeFrameworkProvider');
      
      // Create provider configuration compatible with framework
      const providerConfig = {
        name: this.config.provider,
        endpoint: this.config.endpoint,
        tokenStoragePath: './provider-tokens.json',
        supportedModels: this.config.model ? [this.config.model] : [],
        defaultModel: this.config.model,
        ...this.config.providerConfig
      };
      
      // Initialize the framework provider based on provider type
      switch (this.config.provider) {
        case 'qwen':
          this.frameworkProvider = new QwenProvider(providerConfig);
          break;
        // Add other providers as needed
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
      
      this.logInfo('Framework provider initialized successfully', { provider: this.config.provider }, 'initializeFrameworkProvider');
    } catch (error) {
      this.error('Failed to initialize framework provider', error, 'initializeFrameworkProvider');
      throw error;
    }
  }

  // All private methods are now handled by the framework
}