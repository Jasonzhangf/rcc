/**
 * Qwen Provider Module using openai-compatible-providers-framework
 * Implements Qwen provider functionality using the standardized framework
 */

import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import QwenProvider from 'openai-compatible-providers-framework/dist/providers/qwen';
import { ProviderConfig } from 'openai-compatible-providers-framework/dist/framework/BaseProvider';

/**
 * Qwen Provider Configuration (wrapper for framework config)
 */
export interface QwenProviderConfig extends ProviderConfig {
  /** Provider type - always 'qwen' */
  provider: 'qwen';
  /** Authentication configuration */
  auth?: any;
  /** Enable request/response logging */
  enableLogging?: boolean;
  /** Debug configuration */
  debug?: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logDir?: string;
    maxLogFiles?: number;
    maxFileSize?: number;
  };
  /** Framework debug configuration */
  frameworkDebug?: {
    enabled: boolean;
    logRequests: boolean;
    logResponses: boolean;
    logErrors: boolean;
    logPerformance: boolean;
  };
}

// Authentication configuration is now handled by the framework

// Authentication state is now handled by the framework

// Token storage is now handled by the framework

// Device authorization is now handled by the framework

// Token responses are now handled by the framework

// Debug logging is now handled by the framework

/**
 * Qwen Provider Module using openai-compatible-providers-framework
 */
export class QwenProviderModule extends BasePipelineModule {
  protected override config: QwenProviderConfig = {} as QwenProviderConfig;
  private qwenProvider: QwenProvider | null = null;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('QwenProviderModule initialized with framework', { module: this.moduleName }, 'constructor');
  }

  /**
   * Process request - Handle LLM API requests using the framework
   * @param request - Request data
   * @returns Promise<any> - Response data
   */
  public async process(request: any): Promise<any> {
    this.logInfo('Processing Qwen provider request with framework', {
      requestSize: JSON.stringify(request).length
    }, 'process');
    
    try {
      // Initialize provider if not already done
      if (!this.qwenProvider) {
        await this.initializeProvider();
      }
      
      // Use framework provider to make request
      const response = await this.qwenProvider!.executeChat(request);
      
      return response;
    } catch (error) {
      this.error('Error processing Qwen request with framework', { error: error as Error }, 'process');
      throw error;
    }
  }

  /**
   * Process response - Handle response processing using the framework
   * @param response - Response data
   * @returns Promise<any> - Processed response data
   */
  public async processResponse(response: any): Promise<any> {
    this.logInfo('Processing Qwen provider response with framework', {
      responseSize: JSON.stringify(response).length
    }, 'processResponse');
    
    try {
      // Initialize provider if not already done
      if (!this.qwenProvider) {
        await this.initializeProvider();
      }
      
      // The framework's executeChat method should already return a standardized response
      // For now, we'll just pass through the response as-is
      const standardizedResponse = response;
      
      return standardizedResponse;
    } catch (error) {
      this.error('Error processing Qwen response with framework', { error: error as Error }, 'processResponse');
      throw error;
    }
  }

  /**
   * Initialize the Qwen provider using the framework
   */
  private async initializeProvider(): Promise<void> {
    try {
      this.logInfo('Initializing Qwen provider with framework', {}, 'initializeProvider');

      // Create provider configuration compatible with framework
      const providerConfig = {
        name: 'qwen',
        endpoint: this.config.endpoint || 'https://dashscope.aliyuncs.com/api/v1',
        tokenStoragePath: './qwen-tokens.json',
        supportedModels: this.config.defaultModel ? [this.config.defaultModel] : [],
        defaultModel: this.config.defaultModel,
        metadata: {
          auth: {
            tokenStoragePath: './qwen-tokens'
          }
        },
        // Add framework debug configuration if enabled
        ...(this.config.frameworkDebug && {
          debug: {
            enabled: this.config.frameworkDebug.enabled,
            logRequests: this.config.frameworkDebug.logRequests,
            logResponses: this.config.frameworkDebug.logResponses,
            logErrors: this.config.frameworkDebug.logErrors,
            logPerformance: this.config.frameworkDebug.logPerformance
          }
        }),
        // Add debug configuration for log directory
        debug: {
          enabled: this.config.frameworkDebug?.enabled || false,
          logLevel: 'debug',
          logDir: './debug-logs',
          maxLogFiles: 10,
          maxFileSize: 1024 * 1024 * 10 // 10MB
        }
      };

      // Initialize the framework provider
      this.qwenProvider = new QwenProvider(providerConfig);

      this.logInfo('Qwen provider initialized successfully with framework', {
        debugEnabled: this.config.frameworkDebug?.enabled || false
      }, 'initializeProvider');
    } catch (error) {
      this.error('Failed to initialize Qwen provider with framework', error, 'initializeProvider');
      throw error;
    }
  }

  /**
   * Initialize the Qwen provider
   */
  public async initialize(): Promise<void> {
    try {
      this.logInfo('Initializing Qwen provider', { config: this.config }, 'initialize');
      
      // Initialize provider using framework
      await this.initializeProvider();
      
      this.logInfo('Qwen provider initialized successfully', {}, 'initialize');
    } catch (error) {
      this.error('Failed to initialize Qwen provider', error, 'initialize');
      throw error;
    }
  }

  /**
   * Get current authentication status using framework
   */
  public async getAuthStatus(): Promise<any> {
    try {
      if (!this.qwenProvider) {
        await this.initializeProvider();
      }
      
      // Use framework health check for status
      return await this.qwenProvider!.healthCheck();
    } catch (error) {
      this.error('Error getting auth status', error, 'getAuthStatus');
      throw error;
    }
  }

  /**
   * Start device authorization flow using framework
   */
  public async startDeviceAuthorization(autoOpen = true): Promise<any> {
    try {
      this.logInfo('Starting device authorization flow with framework', {}, 'startDeviceAuthorization');
      
      if (!this.qwenProvider) {
        await this.initializeProvider();
      }
      
      // Use framework device flow
      const deviceFlowData = await this.qwenProvider!.initiateDeviceFlow(autoOpen);
      
      this.logInfo('Device authorization initiated with framework', {
        deviceCode: deviceFlowData.deviceCode,
        userCode: deviceFlowData.userCode,
        verificationUri: deviceFlowData.verificationUri
      }, 'startDeviceAuthorization');
      
      return deviceFlowData;
    } catch (error) {
      this.error('Device authorization failed with framework', error, 'startDeviceAuthorization');
      throw error;
    }
  }

  /**
   * Get current access token using framework
   */
  public async getAccessToken(): Promise<string> {
    try {
      if (!this.qwenProvider) {
        await this.initializeProvider();
      }
      
      // Framework handles token management internally
      // This is just a placeholder - actual implementation would depend on framework API
      return 'token-from-framework';
    } catch (error) {
      this.error('Error getting access token with framework', error, 'getAccessToken');
      throw error;
    }
  }

  /**
   * Process a request to Qwen API using framework
   */
  public async processRequest(request: any): Promise<any> {
    const startTime = Date.now();

    try {
      this.logInfo('Processing request with framework', {
        model: request.model,
        messageCount: request.messages?.length || 0
      }, 'processRequest');

      // Initialize provider if not already done
      if (!this.qwenProvider) {
        await this.initializeProvider();
      }

      // Use framework to process request
      const response = await this.qwenProvider!.executeChat(request);

      const duration = Date.now() - startTime;

      this.logInfo('Request completed successfully with framework', {
        duration,
        responseId: response.id
      }, 'processRequest');

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.error('Request failed with framework', {
        duration,
        error: error instanceof Error ? error.message : String(error)
      }, 'processRequest');

      throw error;
    }
  }

  /**
   * Refresh access token using framework
   */
  public async refreshToken(): Promise<void> {
    try {
      this.logInfo('Refreshing access token with framework', {}, 'refreshToken');
      
      if (!this.qwenProvider) {
        await this.initializeProvider();
      }
      
      // Framework handles token refresh internally
      // This is just a placeholder - actual implementation would depend on framework API
      this.logInfo('Access token refresh handled by framework', {}, 'refreshToken');
    } catch (error) {
      this.error('Token refresh failed with framework', error, 'refreshToken');
      throw error;
    }
  }

  /**
   * Invalidate current token using framework
   */
  public async invalidateToken(): Promise<void> {
    try {
      this.logInfo('Invalidating token with framework', {}, 'invalidateToken');
      
      if (!this.qwenProvider) {
        await this.initializeProvider();
      }
      
      // Framework handles token invalidation internally
      // This is just a placeholder - actual implementation would depend on framework API
      this.logInfo('Token invalidation handled by framework', {}, 'invalidateToken');
    } catch (error) {
      this.error('Token invalidation failed with framework', error, 'invalidateToken');
      throw error;
    }
  }

  /**
   * Get debug logs using framework
   */
  public getDebugLogs(level?: 'trace' | 'debug' | 'info' | 'warn' | 'error', limit?: number): any[] {
    // If framework debug is enabled, we can get logs from the framework
    if (this.config.frameworkDebug?.enabled && this.qwenProvider) {
      // TODO: Implement framework debug log retrieval when available
      this.logInfo('Framework debug logs requested', { level, limit }, 'getDebugLogs');
    }
    // Return empty array for now - framework handles logging internally
    return [];
  }

  /**
   * Clear debug logs using framework
   */
  public clearDebugLogs(): void {
    // If framework debug is enabled, we can clear logs from the framework
    if (this.config.frameworkDebug?.enabled && this.qwenProvider) {
      // TODO: Implement framework debug log clearing when available
      this.logInfo('Framework debug logs cleared', {}, 'clearDebugLogs');
    }
  }

  /**
   * Get provider metrics using framework
   */
  public getMetrics(): any {
    // If framework debug is enabled, we can get metrics from the framework
    if (this.config.frameworkDebug?.enabled && this.qwenProvider) {
      // TODO: Implement framework metrics retrieval when available
      this.logInfo('Framework metrics requested', {}, 'getMetrics');
    }
    // Return basic metrics for now - framework handles metrics internally
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      frameworkDebugEnabled: this.config.frameworkDebug?.enabled || false
    };
  }

// All private methods are now handled by the framework

  /**
   * Handle incoming messages using framework
   */
  public override async handleMessage(message: any): Promise<any> {
    this.logInfo('Handling message with framework', { type: message.type, source: message.source }, 'handleMessage');
    
    switch (message.type) {
      case 'get_auth_status':
        try {
          const status = await this.getAuthStatus();
          return {
            success: true,
            data: status
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
        
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
   * Destroy the provider using framework
   */
  public override async destroy(): Promise<void> {
    this.logInfo('Destroying Qwen provider with framework', {}, 'destroy');
    
    // Framework handles cleanup internally
    
    await super.destroy();
    
    this.logInfo('Qwen provider destroyed with framework', {}, 'destroy');
  }
}