/**
 * Pipeline Base Module - Base module for pipeline components with enhanced debug capabilities
 * 流水线基础模块 - 具有增强调试功能的流水线组件基础模块
 */

import { BaseModule, ModuleInfo, DebugConfig as BaseDebugConfig } from 'rcc-basemodule';
// Simple mock implementation for ErrorHandlingCenter
class SimpleErrorHandlingCenter {
  constructor(config: any) {
    // Mock implementation
  }

  handleError(error: any): void {
    // Mock implementation
    console.error('Error handled:', error);
  }

  async destroy(): Promise<void> {
    // Mock implementation
  }
}

// Use mock if import fails
let ErrorHandlingCenter: any;
try {
  ErrorHandlingCenter = require('rcc-errorhandling').ErrorHandlingCenter;
} catch {
  ErrorHandlingCenter = SimpleErrorHandlingCenter;
}

/**
 * Base IO Tracking Configuration
 * 基础IO跟踪配置
 */
interface BaseIOTrackingConfig {
  enabled?: boolean;
  baseDirectory?: string;
  maxFiles?: number;
  maxSize?: number;
  autoRecord?: boolean;
  saveIndividualFiles?: boolean;
  saveSessionFiles?: boolean;
}

/**
 * Debug Center Interface
 * 调试中心接口
 */
interface DebugCenter {
  recordOperation(
    trackingId: string,
    moduleId: string,
    operationId: string,
    inputData?: unknown,
    outputData?: unknown,
    operationType?: string,
    success?: boolean,
    error?: string,
    stage?: string
  ): void;
  getPipelineEntries(config: { pipelineId: string; limit: number }): ModuleIOEntry[];
  getIOFiles?(): string[];
}

/**
 * Module I/O Entry Interface
 * 模块I/O条目接口
 */
interface ModuleIOEntry {
  timestamp: number;
  operationId: string;
  moduleId: string;
  inputData?: unknown;
  outputData?: unknown;
  operationType: string;
  success: boolean;
  error?: string;
  stage?: string;
  duration?: number;
}

/**
 * Error Info Interface
 * 错误信息接口
 */
interface ErrorInfo {
  error: Error;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  context?: Record<string, unknown>;
}

/**
 * Enhanced IO Tracking Configuration with strict typing
 * 增强的IO跟踪配置，具有严格类型
 */
export interface IOTrackingConfig extends BaseIOTrackingConfig {
  enabled?: boolean;
  baseDirectory?: string;
  maxFiles?: number;
  maxSize?: number;
  autoRecord?: boolean;
  saveIndividualFiles?: boolean;
  saveSessionFiles?: boolean;
  ioDirectory?: string;
  includeTimestamp?: boolean;
  includeDuration?: boolean;
  maxEntriesPerFile?: number;
}

/**
 * Enhanced Debug Configuration with strict typing
 * 增强的调试配置，具有严格类型
 */
export interface DebugConfig extends BaseDebugConfig {
  ioTracking?: IOTrackingConfig;
  baseDirectory?: string;
}

/**
 * Provider information structure
 * 提供者信息结构
 */
export interface ProviderInfo {
  name: string;
  endpoint?: string;
  supportedModels: string[];
  defaultModel?: string;
  type: 'provider' | 'scheduler' | 'tracker' | 'pipeline';
}

/**
 * Pipeline operation context for error handling
 * 用于错误处理的流水线操作上下文
 */
export interface PipelineOperationContext {
  operation?: string;
  stage?: string;
  requestId?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Pipeline stage data structure
 * 流水线阶段数据结构
 */
export interface PipelineStageData {
  stageName: string;
  stageData?: unknown;
  status: 'started' | 'completed' | 'failed';
  timestamp: number;
}

/**
 * Pipeline operation result for tracking
 * 用于跟踪的流水线操作结果
 */
export interface PipelineOperationResult<T> {
  success: boolean;
  result?: T;
  error?: string;
  duration: number;
  operationType: string;
}

/**
 * Pipeline-specific module configuration
 * 流水线特定模块配置
 */
export interface PipelineModuleConfig {
  // Base module configuration
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'provider' | 'scheduler' | 'tracker' | 'pipeline';

  // Pipeline-specific settings
  providerName?: string;
  endpoint?: string;
  supportedModels?: string[];
  defaultModel?: string;
  maxConcurrentRequests?: number;
  requestTimeout?: number;

  // Debug configuration
  enableTwoPhaseDebug?: boolean;
  debugBaseDirectory?: string;
  enableIOTracking?: boolean;
  ioTrackingConfig?: IOTrackingConfig;
}

/**
 * Pipeline Base Module with enhanced debug capabilities and strict type safety
 * 具有增强调试功能和严格类型安全的流水线基础模块
 */
export class PipelineBaseModule extends BaseModule {
  protected config: any;
  protected pipelineConfig: PipelineModuleConfig;
  protected errorHandler: any;
  protected debugCenter: any | null = null;
  protected twoPhaseDebugSystem: any | null;

  constructor(config: PipelineModuleConfig) {
    // Create module info for BaseModule
    const moduleInfo: ModuleInfo = {
      id: config.id,
      name: config.name,
      version: config.version,
      description: config.description,
      type: config.type
    };

    super(moduleInfo);

    this.pipelineConfig = { ...config };

    // Initialize two-phase debug system
    this.twoPhaseDebugSystem = null;

    // Initialize error handler with proper configuration
    this.errorHandler = new (ErrorHandlingCenter as any)({
      id: `${config.id}-error-handler`,
      name: `${config.name} Error Handler`,
      version: '1.0.0',
      type: 'error-handler',
      description: `Error handler for ${config.name}`
    });

    // Initialize debug center if two-phase debug is enabled
    if (config.enableTwoPhaseDebug) {
      this.initializeDebugCenter(config);
    }

    this.logInfo('Pipeline base module initialized', { config: this.getSafeConfig() }, 'constructor');

    // Store debug center reference if available
    this.debugCenter = this.getDebugCenter();
  }

  /**
   * Initialize debug center with proper configuration
   * 使用适当的配置初始化调试中心
   */
  private initializeDebugCenter(config: PipelineModuleConfig): void {
    const debugConfig: DebugConfig = {
      enabled: true,
      level: 'debug',
      recordStack: true,
      maxLogEntries: 1000,
      consoleOutput: true,
      trackDataFlow: true,
      enableFileLogging: true,
      maxFileSize: 10485760, // 10MB
      maxLogFiles: 5,
      baseDirectory: config.debugBaseDirectory || '~/.rcc/debug-logs',
      ioTracking: config.ioTrackingConfig || {
        enabled: config.enableIOTracking || false,
        autoRecord: false,
        saveIndividualFiles: true,
        saveSessionFiles: false,
        ioDirectory: `${config.debugBaseDirectory || '~/.rcc/debug-logs'}/io`,
        includeTimestamp: true,
        includeDuration: true,
        maxEntriesPerFile: 100
      }
    };

    this.setDebugConfig(debugConfig);

    if (config.enableIOTracking) {
      this.enableTwoPhaseDebug(
        true,
        config.debugBaseDirectory || '~/.rcc/debug-logs',
        config.ioTrackingConfig
      );
    }
  }

  /**
   * Enable two-phase debug system
   * 启用两阶段调试系统
   */
  protected enableTwoPhaseDebug(
    enabled: boolean,
    baseDirectory?: string,
    ioTrackingConfig?: IOTrackingConfig
  ): void {
    if (!enabled) {
      this.logInfo('Two-phase debug system disabled', {}, 'enableTwoPhaseDebug');
      return;
    }

    // Initialize debug center
    if (!this.debugCenter) {
      this.initializeDebugCenter({
        ...this.pipelineConfig,
        enableTwoPhaseDebug: true,
        debugBaseDirectory: baseDirectory,
        enableIOTracking: ioTrackingConfig?.enabled ?? false,
        ioTrackingConfig
      });
    }

    this.logInfo('Two-phase debug system enabled', {
      enabled,
      baseDirectory,
      ioTrackingConfig: ioTrackingConfig ?? 'default'
    }, 'enableTwoPhaseDebug');
  }

  /**
   * Get debug center instance
   * 获取调试中心实例
   */
  protected getDebugCenter(): DebugCenter | null {
    return this.debugCenter;
  }

  /**
   * Get pipeline configuration (safe copy)
   * 获取流水线配置（安全副本）
   */
  public getPipelineConfig(): PipelineModuleConfig {
    return { ...this.pipelineConfig };
  }

  /**
   * Update pipeline configuration
   * 更新流水线配置
   */
  public updatePipelineConfig(newConfig: Partial<PipelineModuleConfig>): void {
    const oldConfig = this.getSafeConfig(); // Get safe copy of current config

    // Validate and merge configuration
    this.pipelineConfig = { ...this.pipelineConfig, ...newConfig };

    // Reinitialize debug center if debug configuration changed
    if (newConfig.enableTwoPhaseDebug !== undefined ||
        newConfig.enableIOTracking !== undefined ||
        newConfig.debugBaseDirectory !== undefined) {
      this.initializeDebugCenter(this.pipelineConfig);
      this.debugCenter = this.getDebugCenter();
    }

    this.logInfo('Pipeline configuration updated', {
      oldConfig,
      newConfig: this.getSafeConfig()
    }, 'updatePipelineConfig');
  }

  /**
   * Get safe configuration for logging (without sensitive data)
   * 获取用于日志记录的安全配置（不包含敏感数据）
   */
  private getSafeConfig(): Partial<PipelineModuleConfig> {
    const { providerName, endpoint, supportedModels, defaultModel, type } = this.pipelineConfig;
    return {
      providerName,
      endpoint,
      supportedModels,
      defaultModel,
      type
    };
  }

  /**
   * Get provider information
   * 获取提供者信息
   */
  public getProviderInfo(): ProviderInfo {
    return {
      name: this.pipelineConfig.providerName || this.pipelineConfig.name,
      endpoint: this.pipelineConfig.endpoint,
      supportedModels: this.pipelineConfig.supportedModels || [],
      defaultModel: this.pipelineConfig.defaultModel,
      type: this.pipelineConfig.type
    };
  }

  /**
   * Track pipeline operation with I/O tracking and strict typing
   * 跟踪流水线操作并记录I/O，具有严格类型
   */
  public async trackPipelineOperation<T, I = unknown>(
    operationId: string,
    operation: () => Promise<T>,
    inputData?: I,
    operationType: string = 'pipeline-operation'
  ): Promise<T> {
    const startTime = Date.now();
    const trackingId = `${this.info.id}-${operationId}`;

    try {
      // Start I/O tracking if enabled
      if (this.pipelineConfig.enableIOTracking && this.debugCenter) {
        this.debugCenter.recordOperation(
          trackingId,
          this.info.id,
          operationId,
          inputData,
          undefined,
          operationType,
          true,
          undefined,
          'middle'
        );
      }

      this.logDebug('Starting pipeline operation', { operationId, operationType }, 'trackPipelineOperation');

      // Execute the operation
      const result = await operation();

      const duration = Date.now() - startTime;

      // End I/O tracking if enabled
      if (this.pipelineConfig.enableIOTracking && this.debugCenter) {
        this.debugCenter.recordOperation(
          trackingId,
          this.info.id,
          operationId,
          undefined,
          result,
          operationType,
          true,
          undefined,
          'middle'
        );
      }

      this.logInfo('Pipeline operation completed successfully', {
        operationId,
        operationType,
        duration,
        inputDataType: inputData ? this.getDataType(inputData) : 'none'
      }, 'trackPipelineOperation');

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // End I/O tracking with error if enabled
      if (this.pipelineConfig.enableIOTracking && this.debugCenter) {
        this.debugCenter.recordOperation(
          trackingId,
          this.info.id,
          operationId,
          undefined,
          undefined,
          operationType,
          false,
          error instanceof Error ? error.message : String(error),
          'middle'
        );
      }

      const errorInfo = this.createErrorInfo(error, operationId, operationType, duration, inputData);
      this.logError('Pipeline operation failed', errorInfo, 'trackPipelineOperation');

      throw error;
    }
  }

  /**
   * Get data type for logging
   * 获取数据类型用于日志记录
   */
  private getDataType(data: unknown): string {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    if (typeof data === 'object') return 'object';
    return typeof data;
  }

  /**
   * Create error information for logging
   * 创建用于日志记录的错误信息
   */
  private createErrorInfo(
    error: unknown,
    operationId: string,
    operationType: string,
    duration: number,
    inputData?: unknown
  ): Record<string, unknown> {
    const errorInfo: Record<string, unknown> = {
      operationId,
      operationType,
      duration,
      inputDataType: inputData ? this.getDataType(inputData) : 'none'
    };

    if (error instanceof Error) {
      errorInfo.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      } as Record<string, unknown>;
    } else {
      errorInfo.error = String(error);
    }

    return errorInfo;
  }

  /**
   * Log debug message with proper typing
   * 记录调试消息，具有适当的类型
   */
  private logDebug(message: string, context?: Record<string, unknown>, operation?: string): void {
    this.debug('debug', message, context ?? {}, operation ?? 'debug');
  }

  /**
   * Log error message with proper typing
   * 记录错误消息，具有适当的类型
   */
  private logError(message: string, context?: Record<string, unknown>, operation?: string): void {
    this.debug('error', message, context ?? {}, operation ?? 'error');
  }

  /**
   * Record pipeline stage
   * 记录流水线阶段
   */
  public recordPipelineStage(
    stageName: string,
    stageData?: unknown,
    status: 'started' | 'completed' | 'failed' = 'started'
  ): void {
    const timestamp = Date.now();

    const logData: PipelineStageData = {
      stageName,
      status,
      timestamp
    };

    if (stageData !== undefined) {
      logData.stageData = {
        type: this.getDataType(stageData),
        hasData: true
      };
    }

    this.logInfo(`Pipeline stage ${status}`, logData, 'recordPipelineStage');
  }

  /**
   * Handle pipeline errors with enhanced error handling
   * 处理流水线错误并提供增强的错误处理
   */
  public handlePipelineError(
    error: Error,
    context: PipelineOperationContext
  ): void {
    const errorContext = {
      ...context,
      moduleId: this.info.id,
      moduleName: this.info.name,
      timestamp: Date.now(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    };

    // Log the error
    this.logError('Pipeline error occurred', errorContext, 'handlePipelineError');

    // Create error info for error handling center
    const errorInfo: ErrorInfo = {
      error: error,
      source: this.info.id,
      severity: 'high',
      timestamp: Date.now(),
      context: errorContext
    };

    // Handle error with error handling center
    this.errorHandler.handleError(errorInfo);
  }

  /**
   * Format error response with detailed information
   * 格式化错误响应并提供详细信息
   */
  public formatErrorResponse(
    error: Error,
    context?: PipelineOperationContext
  ): Record<string, unknown> {
    const errorResponse = {
      error: {
        type: error.name,
        message: error.message,
        code: this.getErrorCode(error),
        details: this.getErrorDetails(error)
      },
      context: {
        moduleId: this.info.id,
        moduleName: this.info.name,
        operation: context?.operation,
        stage: context?.stage,
        requestId: context?.requestId,
        timestamp: Date.now(),
        additionalData: context?.additionalData
      },
      system: {
        status: 'error' as const,
        provider: this.info.name,
        type: this.info.type
      }
    };

    return errorResponse;
  }

  /**
   * Get error code based on error type
   * 根据错误类型获取错误代码
   */
  private getErrorCode(error: Error): string {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('401')) return 'AUTHENTICATION_ERROR';
    if (errorMessage.includes('403')) return 'AUTHORIZATION_ERROR';
    if (errorMessage.includes('404')) return 'NOT_FOUND';
    if (errorMessage.includes('429')) return 'RATE_LIMIT_ERROR';
    if (errorMessage.includes('500')) return 'SERVER_ERROR';
    if (errorMessage.includes('timeout')) return 'TIMEOUT_ERROR';
    if (errorMessage.includes('network')) return 'NETWORK_ERROR';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Get detailed error information
   * 获取详细的错误信息
   */
  private getErrorDetails(error: Error): Record<string, unknown> {
    const details: Record<string, unknown> = {
      stack: error.stack,
      timestamp: Date.now()
    };

    // Add HTTP response details if available (typed as any for external libraries)
    const errorWithResponse = error as unknown as Record<string, unknown>;

    if (errorWithResponse.response && typeof errorWithResponse.response === 'object') {
      const response = errorWithResponse.response as Record<string, unknown>;
      details.response = {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      };
    }

    // Add request details if available
    if (errorWithResponse.request && typeof errorWithResponse.request === 'object') {
      const request = errorWithResponse.request as Record<string, unknown>;
      details.request = {
        method: request.method,
        url: request.url,
        headers: request.headers
      };
    }

    return details;
  }

  /**
   * Get pipeline metrics with proper typing
   * 获取流水线指标，具有适当的类型
   */
  public getPipelineMetrics(): PipelineMetrics {
    const debugConfig = this.getDebugConfig();
    const baseMetrics = {
      debugEnabled: debugConfig?.enabled ?? false,
      ioTrackingEnabled: this.pipelineConfig.enableIOTracking ?? false,
      debugConfig: (debugConfig as unknown as Record<string, unknown>) ?? {}
    };

    if (this.debugCenter && this.debugCenter.getPipelineEntries) {
      return {
        ...baseMetrics,
        pipelineEntries: this.debugCenter.getPipelineEntries({
          pipelineId: this.info.id,
          limit: 100
        }) ?? [],
        ioFiles: this.debugCenter.getIOFiles ? this.debugCenter.getIOFiles() : []
      };
    }

    return baseMetrics;
  }

  /**
   * Override destroy method to ensure proper cleanup
   * 重写destroy方法以确保正确的清理
   */
  public async destroy(): Promise<void> {
    try {
      this.logInfo('Destroying pipeline base module', { moduleId: this.info.id }, 'destroy');

      // Perform cleanup specific to pipeline modules
      if (this.errorHandler) {
        await this.cleanupErrorHandler();
      }

      // Call parent destroy method
      await super.destroy();

    } catch (error) {
      const errorContext = {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
        moduleId: this.info.id
      };

      this.logError('Failed to destroy pipeline base module', errorContext, 'destroy');
      throw error;
    }
  }

  /**
   * Clean up error handler resources
   * 清理错误处理器资源
   */
  private async cleanupErrorHandler(): Promise<void> {
    try {
      if (typeof this.errorHandler.destroy === 'function') {
        await this.errorHandler.destroy();
      }
    } catch (error) {
      this.logError('Error during error handler cleanup', {
        error: error instanceof Error ? { message: error.message } : String(error)
      }, 'cleanupErrorHandler');
      // Don't throw - continue with cleanup
    }
  }

  /**
   * Handle messages (required by BaseModule abstract class)
   */
  public async handleMessage(message: any): Promise<any> {
    switch (message.type) {
      case 'getPipelineConfig':
        return {
          success: true,
          data: this.getPipelineConfig()
        };

      case 'getProviderInfo':
        return {
          success: true,
          data: this.getProviderInfo()
        };

      case 'getPipelineMetrics':
        return {
          success: true,
          data: this.getPipelineMetrics()
        };

      case 'updatePipelineConfig':
        this.updatePipelineConfig(message.payload);
        return {
          success: true,
          message: 'Pipeline configuration updated'
        };

      default:
        // Handle unknown message types
        this.warn(`Unknown message type: ${message.type}`, { message }, 'handleMessage');
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: false,
          error: `Unknown message type: ${message.type}`,
          timestamp: Date.now()
        };
    }
  }
}

/**
 * Pipeline metrics interface
 * 流水线指标接口
 */
export interface PipelineMetrics {
  debugEnabled: boolean;
  ioTrackingEnabled: boolean;
  debugConfig: Record<string, unknown>;
  pipelineEntries?: ModuleIOEntry[];
  ioFiles?: string[];
}