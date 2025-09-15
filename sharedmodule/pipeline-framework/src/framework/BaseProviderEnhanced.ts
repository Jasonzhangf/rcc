/**
 * Enhanced Base Provider Class with Debug Logging Support
 * 增强的BaseProvider类，支持调试日志
 */

import { BaseModule } from 'rcc-basemodule';
import { ErrorHandlingCenter } from 'rcc-errorhandling';
import {
  OpenAIChatRequest,
  OpenAIChatResponse
} from './OpenAIInterface';
import { DebugConfig, RequestContext, OperationType } from '../types/debug-types';
import { DebugLogManager } from './DebugLogManager';
import { LogEntryFactory } from './LogEntryFactory';
import { LogEntryValidator } from './LogEntryValidator';
import { PipelineStageNames } from '../types/debug-types';

// Provider capabilities interface
export interface ProviderCapabilities {
  streaming: boolean;
  tools: boolean;
  vision: boolean;
  jsonMode: boolean;
}

// Enhanced provider configuration interface with debug support
export interface ProviderConfigEnhanced {
  name: string;
  endpoint?: string;
  supportedModels?: string[];
  defaultModel?: string;
  metadata?: Record<string, any>;
  debug?: DebugConfig;
}

// Provider info interface
export interface ProviderInfo {
  name: string;
  endpoint?: string;
  supportedModels: string[];
  defaultModel?: string;
  capabilities: ProviderCapabilities;
}

// Health check result interface
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  provider: string;
  error?: string;
  timestamp: string;
}

// Compatibility interface for request/response mapping
export interface CompatibilityModule {
  mapRequest: (request: OpenAIChatRequest) => any;
  mapResponse: (response: any) => any;
}

/**
 * Enhanced Base Provider with Debug Logging Support
 * 增强的BaseProvider，支持调试日志
 */
export abstract class BaseProviderEnhanced {
  protected endpoint?: string;
  protected supportedModels: string[];
  protected defaultModel?: string;
  protected errorHandler: ErrorHandlingCenter;
  protected config: any;
  protected debugLogManager?: DebugLogManager;
  protected debugConfig?: DebugConfig;

  constructor(config: ProviderConfigEnhanced) {
    this.config = {
      id: `provider-${config.name}`,
      name: `${config.name} Provider`,
      version: '1.0.0',
      type: 'provider',
      ...config
    };

    this.endpoint = config.endpoint;
    this.supportedModels = config.supportedModels || [];
    this.defaultModel = config.defaultModel;
    this.debugConfig = config.debug;

    // 错误处理
    this.errorHandler = new ErrorHandlingCenter({
      id: `provider-${config.name}`,
      name: `${config.name} Provider Error Handler`
    });

    // 初始化调试日志管理器
    this.initializeDebugLogging();
  }

  /**
   * Initialize debug logging
   * 初始化调试日志
   */
  private initializeDebugLogging(): void {
    if (this.debugConfig?.enabled) {
      const logEntryFactory = new LogEntryFactory();
      const logEntryValidator = new LogEntryValidator();

      this.debugLogManager = new DebugLogManager(
        this.debugConfig,
        {
          autoCleanup: true,
          enableConsoleOutput: process.env.NODE_ENV === 'development'
        },
        logEntryFactory,
        logEntryValidator
      );

      // Log provider startup
      this.debugLogManager.logProviderStartup(this.config.name.replace(' Provider', ''), {
        version: this.config.version,
        endpoint: this.endpoint,
        supportedModels: this.supportedModels,
        capabilities: this.getCapabilities()
      });
    }
  }

  /**
   * Start request tracking
   * 开始请求跟踪
   */
  private startRequestTracking(
    operation: OperationType,
    request?: any
  ): RequestContext | undefined {
    if (!this.debugLogManager) return undefined;

    return this.debugLogManager.startRequest(
      this.getInfo().name.replace(' Provider', ''),
      operation,
      {
        model: request?.model,
        timestamp: Date.now()
      }
    );
  }

  /**
   * Track pipeline stage
   * 跟踪流水线阶段
   */
  private trackPipelineStage(
    context: RequestContext | undefined,
    stage: string
  ): void {
    if (!this.debugLogManager || !context) return;
    this.debugLogManager.trackStage(context.requestId, stage);
  }

  /**
   * Complete pipeline stage
   * 完成流水线阶段
   */
  private completePipelineStage(
    context: RequestContext | undefined,
    stage: string,
    data?: any
  ): void {
    if (!this.debugLogManager || !context) return;
    this.debugLogManager.completeStage(context.requestId, stage, data);
  }

  /**
   * Fail pipeline stage
   * 失败流水线阶段
   */
  private failPipelineStage(
    context: RequestContext | undefined,
    stage: string,
    error: string
  ): void {
    if (!this.debugLogManager || !context) return;
    this.debugLogManager.failStage(context.requestId, stage, error);
  }

  /**
   * Log successful request
   * 记录成功请求
   */
  private async logSuccess(
    context: RequestContext | undefined,
    request: any,
    response: any
  ): Promise<void> {
    if (!this.debugLogManager || !context) return;
    await this.debugLogManager.logSuccess(context, request, response);
  }

  /**
   * Log error
   * 记录错误
   */
  private async logError(
    context: RequestContext | undefined,
    error: Error | string,
    request?: any,
    failedStage?: string,
    debugInfo?: Record<string, any>
  ): Promise<void> {
    if (!this.debugLogManager || !context) return;
    await this.debugLogManager.logError(context, error, request, failedStage, debugInfo);
  }

  /**
   * Execute with error handling and logging
   * 带错误处理和日志记录的执行
   */
  private async executeWithLogging<T>(
    context: RequestContext | undefined,
    operation: string,
    stage: string,
    fn: () => Promise<T>,
    request?: any
  ): Promise<T> {
    try {
      this.trackPipelineStage(context, stage);
      const result = await fn();
      this.completePipelineStage(context, stage, { success: true });
      return result;
    } catch (error: any) {
      this.failPipelineStage(context, stage, error.message);
      await this.logError(context, error, request, stage);
      throw error;
    }
  }

  // 标准 OpenAI 聊天接口 - 主要入口
  async chat(openaiRequest: any, compatibility?: CompatibilityModule): Promise<any> {
    let requestContext: RequestContext | undefined;

    try {
      // Start request tracking
      requestContext = this.startRequestTracking('chat', openaiRequest);

      // Log start of request
      this.debugLogManager?.info(`Processing chat request`, {
        requestId: requestContext?.requestId,
        provider: this.getInfo().name,
        model: openaiRequest.model
      });

      // 验证请求
      await this.executeWithLogging(
        requestContext,
        'chat',
        PipelineStageNames.VALIDATION,
        async () => {
          const request = new OpenAIChatRequest(openaiRequest);
          request.validate();
          return request;
        },
        openaiRequest
      );

      // 如果有 compatibility，进行请求映射
      const providerRequest = await this.executeWithLogging(
        requestContext,
        'chat',
        PipelineStageNames.COMPATIBILITY_MAPPING,
        async () => {
          const request = new OpenAIChatRequest(openaiRequest);
          return compatibility ? compatibility.mapRequest(request) : request;
        },
        openaiRequest
      );

      // 调用具体的 Provider 实现
      const providerResponse = await this.executeWithLogging(
        requestContext,
        'chat',
        PipelineStageNames.PROVIDER_EXECUTION,
        () => this.executeChat(providerRequest),
        providerRequest
      );

      // 如果有 compatibility，进行响应映射
      const finalResponse = await this.executeWithLogging(
        requestContext,
        'chat',
        PipelineStageNames.RESPONSE_MAPPING,
        async () => {
          return compatibility ? compatibility.mapResponse(providerResponse) : this.standardizeResponse(providerResponse);
        },
        providerResponse
      );

      // 转换为标准 OpenAI 响应格式
      const response = await this.executeWithLogging(
        requestContext,
        'chat',
        PipelineStageNames.RESPONSE_STANDARDIZATION,
        async () => {
          return new OpenAIChatResponse(finalResponse);
        },
        finalResponse
      );

      // Log successful completion
      await this.logSuccess(requestContext, openaiRequest, response.toStandardFormat());

      this.debugLogManager?.info(`Chat request completed successfully`, {
        requestId: requestContext?.requestId,
        provider: this.getInfo().name,
        duration: requestContext?.getDuration()
      });

      return response.toStandardFormat();

    } catch (error: any) {
      this.debugLogManager?.error(`Chat request failed: ${error.message}`, {
        requestId: requestContext?.requestId,
        provider: this.getInfo().name,
        error: error.message
      });

      await this.logError(
        requestContext,
        error,
        openaiRequest,
        PipelineStageNames.PROVIDER_EXECUTION,
        { stack: error.stack }
      );

      this.errorHandler.handleError({
        error: error,
        source: `BaseProviderEnhanced.chat.${this.getInfo().name}`,
        severity: 'high',
        timestamp: Date.now()
      });
      throw error;
    }
  }

  // 标准 OpenAI 流式聊天接口
  async *streamChat(openaiRequest: any, compatibility?: CompatibilityModule): AsyncGenerator<any, void, unknown> {
    let requestContext: RequestContext | undefined;

    try {
      // Start request tracking
      requestContext = this.startRequestTracking('streamChat', openaiRequest);

      this.debugLogManager?.info(`Processing stream chat request`, {
        requestId: requestContext?.requestId,
        provider: this.getInfo().name,
        model: openaiRequest.model
      });

      // 验证请求
      await this.executeWithLogging(
        requestContext,
        'streamChat',
        PipelineStageNames.VALIDATION,
        async () => {
          const request = new OpenAIChatRequest(openaiRequest);
          request.validate();
          return request;
        },
        openaiRequest
      );

      // 如果有 compatibility，进行请求映射
      const providerRequest = await this.executeWithLogging(
        requestContext,
        'streamChat',
        PipelineStageNames.COMPATIBILITY_MAPPING,
        async () => {
          const request = new OpenAIChatRequest(openaiRequest);
          return compatibility ? compatibility.mapRequest(request) : request;
        },
        openaiRequest
      );

      // 调用具体的流式实现
      const stream = this.executeStreamChat(providerRequest);

      this.trackPipelineStage(requestContext, 'stream_processing');

      let chunkCount = 0;
      for await (const chunk of stream) {
        const processedChunk = await this.executeWithLogging(
          requestContext,
          'streamChat',
          'chunk_processing',
          async () => {
            return compatibility ? compatibility.mapResponse(chunk) : this.standardizeResponse(chunk);
          },
          chunk
        );

        const response = new OpenAIChatResponse(processedChunk);
        chunkCount++;
        yield response.toStandardFormat();
      }

      this.completePipelineStage(requestContext, 'stream_processing', { chunkCount });

      // Log successful completion
      await this.logSuccess(requestContext, openaiRequest, {
        success: true,
        chunkCount,
        streaming: true
      });

      this.debugLogManager?.info(`Stream chat request completed`, {
        requestId: requestContext?.requestId,
        provider: this.getInfo().name,
        duration: requestContext?.getDuration(),
        chunkCount
      });

    } catch (error: any) {
      this.debugLogManager?.error(`Stream chat request failed: ${error.message}`, {
        requestId: requestContext?.requestId,
        provider: this.getInfo().name,
        error: error.message
      });

      await this.logError(
        requestContext,
        error,
        openaiRequest,
        'stream_processing',
        { stack: error.stack }
      );

      this.errorHandler.handleError({
        error: error,
        source: `BaseProviderEnhanced.streamChat.${this.getInfo().name}`,
        severity: 'high',
        timestamp: Date.now()
      });
      throw error;
    }
  }

  // 抽象方法 - 由具体 Provider 实现
  abstract executeChat(providerRequest: any): Promise<any>;
  abstract executeStreamChat(providerRequest: any): AsyncGenerator<any, void, unknown>;

  // 标准化响应 - 将 Provider 响应转换为标准格式
  protected standardizeResponse(providerResponse: any): any {
    // 默认实现，假设 Provider 已经返回标准格式
    // 具体 Provider 可以重写此方法
    return {
      id: providerResponse.id || `req_${Date.now()}`,
      object: 'chat.completion',
      created: providerResponse.created || Date.now(),
      model: providerResponse.model || this.defaultModel,
      choices: providerResponse.choices || [],
      usage: providerResponse.usage
    };
  }

  // 基本方法实现
  protected getInfo(): any {
    return this.config;
  }

  protected getConfig(): any {
    return this.config;
  }

  // 获取 Provider 信息
  getProviderInfo(): ProviderInfo {
    const info = this.getInfo();
    return {
      name: info.name.replace(' Provider', ''),
      endpoint: this.endpoint,
      supportedModels: this.supportedModels,
      defaultModel: this.defaultModel,
      capabilities: this.getCapabilities()
    };
  }

  // 获取能力 - 子类可重写
  protected getCapabilities(): ProviderCapabilities {
    return {
      streaming: false,
      tools: false,
      vision: false,
      jsonMode: false
    };
  }

  // 健康检查
  async healthCheck(): Promise<HealthCheckResult> {
    let requestContext: RequestContext | undefined;

    try {
      requestContext = this.startRequestTracking('healthCheck');

      this.debugLogManager?.info('Performing health check', {
        requestId: requestContext?.requestId,
        provider: this.getInfo().name
      });

      const result = await this.executeWithLogging(
        requestContext,
        'healthCheck',
        'health_check_execution',
        async () => {
          // 默认健康检查实现
          return {
            status: 'healthy' as const,
            provider: this.getInfo().name,
            timestamp: new Date().toISOString()
          };
        }
      );

      this.debugLogManager?.logHealthCheck(
        this.getInfo().name.replace(' Provider', ''),
        result.status,
        { responseTime: requestContext?.getDuration() }
      );

      return result;

    } catch (error: any) {
      this.debugLogManager?.error('Health check failed', {
        requestId: requestContext?.requestId,
        provider: this.getInfo().name,
        error: error.message
      });

      const result = {
        status: 'unhealthy' as const,
        provider: this.getInfo().name,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      this.debugLogManager?.logHealthCheck(
        this.getInfo().name.replace(' Provider', ''),
        result.status,
        { error: error.message }
      );

      this.errorHandler.handleError({
        error: error,
        source: `BaseProviderEnhanced.healthCheck.${this.getInfo().name}`,
        severity: 'medium',
        timestamp: Date.now()
      });
      return result;
    }
  }

  /**
   * Get debug log manager
   * 获取调试日志管理器
   */
  getDebugLogManager(): DebugLogManager | undefined {
    return this.debugLogManager;
  }

  /**
   * Update debug configuration
   * 更新调试配置
   */
  updateDebugConfig(newConfig: Partial<DebugConfig>): void {
    if (this.debugLogManager) {
      this.debugLogManager.updateConfig(newConfig);
      this.debugConfig = this.debugLogManager.getConfig();
    }
  }

  /**
   * Enable/disable debug logging
   * 启用/禁用调试日志
   */
  setDebugLogging(enabled: boolean): void {
    if (this.debugLogManager) {
      this.debugLogManager.setEnabled(enabled);
      this.debugConfig = this.debugLogManager.getConfig();
    } else if (enabled && this.debugConfig) {
      this.debugConfig.enabled = enabled;
      this.initializeDebugLogging();
    }
  }

  /**
   * Get debug statistics
   * 获取调试统计
   */
  async getDebugStatistics() {
    if (!this.debugLogManager) return null;

    return {
      systemHealth: await this.debugLogManager.getSystemHealth(),
      errorStats: await this.debugLogManager.getErrorStatistics(),
      systemLogStats: await this.debugLogManager.getSystemLogStatistics(),
      fileStats: await this.debugLogManager.getFileStatistics(),
      activeRequests: this.debugLogManager.getActiveRequests()
    };
  }

  /**
   * Cleanup resources
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.debugLogManager) {
      await this.debugLogManager.destroy();
    }
  }
}

export default BaseProviderEnhanced;