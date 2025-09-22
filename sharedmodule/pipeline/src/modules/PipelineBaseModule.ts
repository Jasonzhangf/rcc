/**
 * Unified Pipeline Base Module - Merged functionality from PipelineBaseModule and DebuggablePipelineModule
 * 统一流水线基础模块 - 合并了PipelineBaseModule和DebuggablePipelineModule的功能
 */

import { BaseModule, ModuleInfo, DebugConfig as BaseDebugConfig, BaseModuleRecordingConfig } from 'rcc-basemodule';
import { default as ErrorHandlingCenter } from 'rcc-errorhandling';

// Try to import DebugCenter, fall back to simple implementation if not available
let DebugCenterType: any;
class SimpleDebugCenter {
  constructor(config: any) {}
  recordOperation(...args: any[]): void {}
  recordPipelineStart(...args: any[]): void {}
  recordPipelineEnd(...args: any[]): void {}
  getPipelineEntries(...args: any[]): any[] { return []; }
  subscribe(...args: any[]): void {}
  updateConfig(...args: any[]): void {}
  async destroy(): Promise<void> {}
}

try {
  DebugCenterType = require('rcc-debugcenter').DebugCenter;
} catch {
  DebugCenterType = SimpleDebugCenter;
}

import {
  PipelineExecutionContext,
  ExecutionContextFactory,
  ExecutionContextOptions,
  ExecutionError,
  PipelineStage,
  ErrorCategory,
  ErrorSeverity
} from '../interfaces/ModularInterfaces';
import { IPipelineTracker, PipelineTracker } from '../framework/PipelineTracker';

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

  // Enhanced debug configuration
  enableTracing?: boolean;
  tracerConfig?: Partial<any>;
  recordingConfig?: Partial<BaseModuleRecordingConfig>;
  enablePerformanceMetrics?: boolean;
  enableEnhancedErrorHandling?: boolean;
  errorRecoveryAttempts?: number;
}

/**
 * Execution operation options
 * 执行操作选项
 */
export interface ExecutionOptions {
  /** Custom execution ID */
  executionId?: string;

  /** Custom trace ID */
  traceId?: string;

  /** Custom session ID */
  sessionId?: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Enable retry on failure */
  enableRetry?: boolean;

  /** Maximum retry attempts */
  maxRetries?: number;

  /** Retry delay in milliseconds */
  retryDelay?: number;

  /** Additional metadata */
  metadata?: Record<string, any>;

  /** Parent execution context */
  parentContext?: PipelineExecutionContext;

  /** Stage-specific configuration */
  stageConfig?: Record<string, any>;
}

/**
 * Execution result with comprehensive information
 * 执行结果，包含完整信息
 */
export interface ExecutionResult<T = any> {
  /** Execution ID */
  executionId: string;

  /** Request ID */
  requestId: string;

  /** Trace ID */
  traceId: string;

  /** Execution status */
  status: 'success' | 'failed' | 'timeout' | 'cancelled';

  /** Execution result data */
  data?: T;

  /** Error information if failed */
  error?: ExecutionError;

  /** Execution timing */
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };

  /** Execution context */
  context: PipelineExecutionContext;

  /** Performance metrics */
  metrics?: ExecutionMetrics;

  /** Trace summary */
  traceSummary?: TraceSummary;
}

/**
 * Execution metrics for performance analysis
 * 执行指标，用于性能分析
 */
export interface ExecutionMetrics {
  /** Memory usage */
  memoryUsage?: {
    start: number;
    end: number;
    peak: number;
  };

  /** CPU usage */
  cpuUsage?: {
    start: number;
    end: number;
    average: number;
  };

  /** Network requests */
  networkRequests?: number;

  /** Database queries */
  databaseQueries?: number;

  /** External service calls */
  externalServiceCalls?: number;
}

/**
 * Trace summary for analysis
 * 跟踪摘要，用于分析
 */
export interface TraceSummary {
  totalStages: number;
  completedStages: number;
  failedStages: number;
  stageTransitions: Array<{
    from: string;
    to: string;
    duration: number;
  }>;
  errors: ExecutionError[];
}

/**
 * Pipeline metrics interface
 * 流水线指标接口
 */
export interface PipelineMetrics {
  debugEnabled: boolean;
  ioTrackingEnabled: boolean;
  debugConfig: Record<string, unknown>;
  pipelineEntries?: any[];
  ioFiles?: string[];
  executionStats?: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  };
}

/**
 * Unified Pipeline Base Module with enhanced debug capabilities and strict type safety
 * 统一流水线基础模块，具有增强调试功能和严格类型安全
 */
export abstract class UnifiedPipelineBaseModule extends BaseModule {
  protected config: any;
  protected pipelineConfig: PipelineModuleConfig;
  protected errorHandler: any;
  protected debugCenter: any | null = null;
  protected tracker: IPipelineTracker;
  protected contextFactory: ExecutionContextFactory;
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

    // Initialize execution context factory
    this.contextFactory = ExecutionContextFactory.getInstance();

    // Initialize tracker
    this.tracker = new PipelineTracker();

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

    // Initialize debug center if tracing is enabled
    if (config.enableTracing || config.enableTwoPhaseDebug) {
      this.initializeDebugCenter(config);
    }

    // Configure tracker with debug center
    if (config.enableTracing !== false) {
      this.tracker.setDebugCenter(this.debugCenter);
    }

    this.logInfo('Unified pipeline base module initialized', { config: this.getSafeConfig() }, 'constructor');
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

    // Initialize debug center for tracing
    this.debugCenter = new (DebugCenterType as any)({
      enabled: config.enableTracing !== false,
      baseDirectory: config.recordingConfig?.basePath || config.debugBaseDirectory || '~/.rcc/debug-logs',
      maxLogEntries: 1000,
      recordStack: true
    });

    if (config.enableIOTracking) {
      this.enableTwoPhaseDebug(
        true,
        config.debugBaseDirectory || '~/.rcc/debug-logs',
        config.ioTrackingConfig
      );
    }
  }

  /**
   * Override initialize to set up enhanced features
   */
  public async initialize(): Promise<void> {
    await super.initialize();

    // Initialize tracker
    await this.tracker.initialize();

    // Set up trace event listeners
    this.setupTraceListeners();

    // Enable recording if configured
    if (this.pipelineConfig.recordingConfig?.enabled) {
      this.setRecordingConfig(this.pipelineConfig.recordingConfig);
    }

    this.logInfo('Unified pipeline base module initialized with enhanced features', { config: this.pipelineConfig });
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
   * Set recording configuration
   * 设置录制配置
   */
  public setRecordingConfig(config: Partial<BaseModuleRecordingConfig>): void {
    // Use DebugCenter's updateConfig method instead of non-existent setRecordingConfig
    if (this.debugCenter && typeof this.debugCenter.updateConfig === 'function') {
      this.debugCenter.updateConfig({
        enabled: config.enabled !== false,
        level: 'debug',
        recordStack: true,
        maxLogEntries: 1000,
        consoleOutput: true,
        trackDataFlow: true,
        enableFileLogging: config.enabled || false,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxLogFiles: 5,
        baseDirectory: config.basePath || '~/.rcc/debug-logs',
        pipelineIO: {
          enabled: config.enabled || false,
          autoRecordPipelineStart: true,
          autoRecordPipelineEnd: true,
          pipelineSessionFileName: 'pipeline-session.jsonl',
          pipelineDirectory: (config.basePath || '~/.rcc/debug-logs') + '/pipeline-logs',
          recordAllOperations: true,
          includeModuleContext: true,
          includeTimestamp: true,
          includeDuration: true,
          maxPipelineOperationsPerFile: 2000
        },
        eventBus: {
          enabled: true,
          maxSubscribers: 100,
          eventQueueSize: 10000
        }
      });
    }
    this.logInfo('Recording config set', { config }, 'setRecordingConfig');
  }

  /**
   * Get debug center instance
   * 获取调试中心实例
   */
  protected getDebugCenter(): any | null {
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
        newConfig.debugBaseDirectory !== undefined ||
        newConfig.enableTracing !== undefined) {
      this.initializeDebugCenter(this.pipelineConfig);
      this.debugCenter = this.getDebugCenter();
    }

    // Update tracker configuration if tracing config changed
    if (newConfig.tracerConfig || newConfig.enableTracing !== undefined) {
      this.tracker.updateConfig({
        ...this.tracker.getConfig(),
        ...newConfig.tracerConfig,
        enabled: newConfig.enableTracing ?? this.tracker.getConfig().enabled
      });
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
   * Execute operation with full tracing and error handling
   * 执行操作并带有完整的跟踪和错误处理
   */
  public async executeWithTracing<T>(
    operation: (context: PipelineExecutionContext) => Promise<T>,
    stage: PipelineStage,
    request?: any,
    options?: ExecutionOptions
  ): Promise<ExecutionResult<T>> {
    const startTime = Date.now();
    const moduleInfo = {
      moduleId: this.info.id,
      moduleName: this.info.name,
      moduleType: this.info.type,
      providerName: this.pipelineConfig.providerName,
      endpoint: this.pipelineConfig.endpoint
    };

    // Create execution context
    const contextOptions: ExecutionContextOptions = {
      executionId: options?.executionId,
      traceId: options?.traceId,
      sessionId: options?.sessionId,
      metadata: options?.metadata,
      inheritFrom: options?.parentContext
    };

    // Convert string literal stage to proper PipelineStage enum
    const properStage = this.convertToPipelineStage(stage);
    const rawContext = this.tracker.createContext(moduleInfo, properStage, request, contextOptions);

    // Convert to proper PipelineExecutionContext
    const context = this.convertToPipelineExecutionContext(rawContext, properStage, contextOptions);

    this.logDebug('Starting execution with tracing', {
      executionId: context.executionId,
      requestId: context.requestId,
      traceId: context.traceId,
      stage: context.stage
    });

    try {
      // Record request if provided
      if (request) {
        await this.tracker.recordRequest(context, request, properStage);
      }

      // Record memory and CPU usage if metrics enabled
      const metrics = this.pipelineConfig.enablePerformanceMetrics
        ? await this.collectPerformanceMetrics()
        : undefined;

      // Execute operation with timeout and retry logic
      const result = await this.executeWithTimeoutAndRetry(
        () => operation(context),
        options?.timeout || this.pipelineConfig.requestTimeout || 30000,
        options?.enableRetry,
        options?.maxRetries,
        options?.retryDelay
      );

      // Record successful response
      await this.tracker.recordResponse(context, result, properStage);

      // Complete context
      this.tracker.completeContext(context, result);

      const endTime = Date.now();
      const duration = endTime - startTime;

      const executionResult: ExecutionResult<T> = {
        executionId: context.executionId,
        requestId: context.requestId,
        traceId: context.traceId,
        status: 'success',
        data: result,
        timing: {
          startTime,
          endTime,
          duration
        },
        context,
        metrics,
        traceSummary: this.generateTraceSummary(context)
      };

      this.logDebug('Execution completed successfully', {
        executionId: context.executionId,
        duration,
        dataType: typeof result
      });

      return executionResult;

    } catch (error) {
      return await this.handleExecutionError(
        error as Error,
        context,
        startTime,
        stage,
        options
      );
    }
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
   * Execute with timeout and retry logic
   * 执行带超时和重试逻辑
   */
  private async executeWithTimeoutAndRetry<T>(
    operation: () => Promise<T>,
    timeout: number,
    enableRetry: boolean = false,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    const executeWithTimeout = async (): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);

        operation()
          .then(resolve)
          .catch(reject)
          .finally(() => clearTimeout(timer));
      });
    };

    let lastError: Error;

    for (let attempt = 0; attempt <= (enableRetry ? maxRetries : 0); attempt++) {
      try {
        return await executeWithTimeout();
      } catch (error) {
        lastError = error as Error;

        if (attempt === (enableRetry ? maxRetries : 0)) {
          throw lastError;
        }

        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        this.logWarn(`Operation failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          maxRetries,
          error: lastError.message
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Handle execution errors with comprehensive error handling
   * 处理执行错误并提供全面的错误处理
   */
  private async handleExecutionError<T>(
    error: Error,
    context: PipelineExecutionContext,
    startTime: number,
    stage: PipelineStage,
    options?: ExecutionOptions
  ): Promise<ExecutionResult<T>> {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Determine error category
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, options?.maxRetries);

    // Record error
    const executionError = await this.recordError(
      error,
      category,
      severity,
      this.isErrorRecoverable(error)
    );

    // Handle with error center if enabled
    if (this.pipelineConfig.enableEnhancedErrorHandling) {
      this.errorHandler.handleError({
        error,
        source: this.info.id,
        severity: severity,
        timestamp: Date.now(),
        context: {
          executionId: context.executionId,
          requestId: context.requestId,
          traceId: context.traceId,
          stage: context.stage
        }
      });
    }

    // Complete context with error
    this.tracker.completeContext(context, undefined, executionError);

    const executionResult: ExecutionResult<T> = {
      executionId: context.executionId,
      requestId: context.requestId,
      traceId: context.traceId,
      status: this.getErrorStatus(error),
      error: executionError,
      timing: {
        startTime,
        endTime,
        duration
      },
      context,
      traceSummary: this.generateTraceSummary(context)
    };

    this.logError('Execution failed', {
      executionId: context.executionId,
      error: error.message,
      category,
      severity,
      duration
    });

    return executionResult;
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
   * Log info message - public method for child classes
   * 记录信息消息 - 子类可用的公共方法
   */
  protected logInfo(message: string, context?: Record<string, unknown>, operation?: string): void {
    this.debug('info', message, context ?? {}, operation ?? 'info');
  }

  /**
   * Log warning message - public method for child classes
   * 记录警告消息 - 子类可用的公共方法
   */
  protected logWarn(message: string, context?: Record<string, unknown>, operation?: string): void {
    this.debug('warn', message, context ?? {}, operation ?? 'warn');
  }

  /**
   * Log error message - public method for child classes
   * 记录错误消息 - 子类可用的公共方法
   */
  public logError(message: string, context?: Record<string, unknown>, operation?: string): void {
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

    this.logInfo(`Pipeline stage ${status}`, logData as unknown as Record<string, unknown>, 'recordPipelineStage');
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
    const errorInfo = {
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
   * Collect performance metrics
   * 收集性能指标
   */
  private async collectPerformanceMetrics(): Promise<ExecutionMetrics> {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        memoryUsage: {
          start: memUsage.heapUsed,
          end: memUsage.heapUsed,
          peak: memUsage.heapUsed
        },
        cpuUsage: {
          start: cpuUsage.user,
          end: cpuUsage.user,
          average: cpuUsage.user
        }
      };
    } catch (error) {
      this.logWarn('Failed to collect performance metrics', { error: error });
      return {};
    }
  }

  /**
   * Generate trace summary for analysis
   * 生成跟踪摘要用于分析
   */
  private generateTraceSummary(context: PipelineExecutionContext): TraceSummary {
    const stageTransitions: Array<{ from: string; to: string; duration: number }> = [];

    if (context.parent) {
      const parentStage = context.parent.stage;
      const currentStage = context.stage;
      const transitionTime = context.timing.startTime - context.parent.timing.startTime;

      stageTransitions.push({
        from: parentStage,
        to: currentStage,
        duration: transitionTime
      });
    }

    return {
      totalStages: context.timing.stageTimings.size,
      completedStages: Array.from(context.timing.stageTimings.values()).filter(t => t.status === 'completed').length,
      failedStages: Array.from(context.timing.stageTimings.values()).filter(t => t.status === 'failed').length,
      stageTransitions,
      errors: context.error ? [{
        errorId: context.error.errorId,
        message: context.error.message,
        stack: context.error.stack,
        category: context.error.category as ErrorCategory,
        severity: context.error.severity as ErrorSeverity,
        recoverable: context.error.recoverable,
        timestamp: context.error.timestamp,
        context: (context.error as any).context || {}
      }] : []
    };
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCategory.TIMEOUT;
    }
    if (message.includes('network') || message.includes('connection') || message.includes('econnrefused')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorCategory.RATE_LIMIT;
    }
    if (message.includes('provider') || stack.includes('provider')) {
      return ErrorCategory.PROVIDER;
    }
    if (message.includes('system') || message.includes('memory') || message.includes('internal')) {
      return ErrorCategory.SYSTEM;
    }

    return ErrorCategory.PROCESSING;
  }

  private determineSeverity(error: Error, maxRetries?: number): ErrorSeverity {
    // If it's a system-level error or we've exhausted retries, it's fatal
    if (error.message.includes('system') || error.message.includes('memory') || maxRetries === 0) {
      return ErrorSeverity.FATAL;
    }

    // Network and auth errors are errors
    const category = this.categorizeError(error);
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.AUTHENTICATION) {
      return ErrorSeverity.ERROR;
    }

    // Validation errors are warnings
    if (category === ErrorCategory.VALIDATION) {
      return ErrorSeverity.WARNING;
    }

    return ErrorSeverity.ERROR;
  }

  private isErrorRecoverable(error: Error): boolean {
    const category = this.categorizeError(error);
    return category !== ErrorCategory.SYSTEM && category !== ErrorCategory.PROCESSING;
  }

  /**
   * Record error with tracker
   * 使用跟踪器记录错误
   */
  private async recordError(
    error: Error,
    category: ErrorCategory,
    severity: ErrorSeverity,
    recoverable: boolean
  ): Promise<any> {
    return {
      errorId: this.generateErrorId(),
      message: error.message,
      stack: error.stack,
      category,
      severity,
      recoverable,
      timestamp: Date.now()
    };
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert stage to proper PipelineStage enum
   */
  private convertToPipelineStage(stage: PipelineStage | string): PipelineStage {
    // Handle string inputs
    if (typeof stage === 'string') {
      switch (stage) {
        case 'initialization':
          return PipelineStage.REQUEST_INIT;
        case 'request_processing':
          return PipelineStage.REQUEST_INIT;
        case 'provider_selection':
          return PipelineStage.PIPELINE_SELECTION;
        case 'provider_call':
          return PipelineStage.PROVIDER_EXECUTION;
        case 'response_processing':
          return PipelineStage.RESPONSE_PROCESSING;
        case 'error_handling':
          return PipelineStage.ERROR_HANDLING;
        case 'completion':
          return PipelineStage.COMPLETION;
        default:
          return PipelineStage.REQUEST_INIT;
      }
    }

    // If it's already a PipelineStage enum, return it as-is
    return stage;
  }

  /**
   * Convert raw context to proper PipelineExecutionContext
   */
  private convertToPipelineExecutionContext(rawContext: any, stage: PipelineStage, options?: ExecutionContextOptions): PipelineExecutionContext {
    const executionId = options?.executionId || rawContext.executionId;
    const traceId = options?.traceId || rawContext.traceId;
    const sessionId = options?.sessionId || this.generateSessionId();
    const requestId = rawContext.requestId;

    const context: PipelineExecutionContext = {
      executionId,
      traceId,
      sessionId,
      requestId,
      routingId: rawContext.module?.moduleId || 'unknown',
      providerId: rawContext.module?.providerName || 'unknown',
      startTime: rawContext.timing?.startTime || Date.now(),
      stage,
      timing: {
        startTime: rawContext.timing?.startTime || Date.now(),
        endTime: undefined,
        duration: undefined,
        stageTimings: new Map([[stage, {
          startTime: Date.now(),
          status: 'running'
        }]]),
        status: 'pending'
      },
      metadata: options?.metadata || rawContext.metadata || {},
      ioRecords: [],
      parentContext: options?.inheritFrom || options?.parent,
      debugConfig: options?.debugConfig,
      routingDecision: undefined,
      performanceMetrics: undefined
    };

    return context;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getErrorStatus(error: Error): 'failed' | 'timeout' | 'cancelled' {
    if (error.message.includes('timed out') || error.message.includes('timeout')) {
      return 'timeout';
    }
    if (error.message.includes('cancelled') || error.message.includes('abort')) {
      return 'cancelled';
    }
    return 'failed';
  }

  private setupTraceListeners(): void {
    // Set up debug center event listeners if available
    if (this.debugCenter && typeof this.debugCenter.subscribe === 'function') {
      this.debugCenter.subscribe('error', (event: any) => {
        this.handleTraceError(event);
      });

      this.debugCenter.subscribe('complete', (event: any) => {
        this.handleTraceCompletion(event);
      });
    }

    // Set up tracker event listeners if available
    if (this.tracker && typeof this.tracker.subscribe === 'function') {
      this.tracker.subscribe('stageChanged', (event: any) => {
        this.handleStageChange(event);
      });
    }
  }

  private handleTraceError(event: any): void {
    if (event.error) {
      this.logError('Trace error event', {
        executionId: event.executionId,
        error: event.error.message || event.error,
        category: event.category,
        severity: event.severity
      });
    }
  }

  private handleTraceCompletion(event: any): void {
    this.logDebug('Trace completion event', {
      executionId: event.executionId,
      requestId: event.requestId,
      duration: event.duration || event.timestamp
    });
  }

  private handleStageChange(event: any): void {
    this.logDebug('Stage change event', {
      executionId: event.executionId,
      fromStage: event.fromStage,
      toStage: event.toStage,
      duration: event.duration
    });
  }

  /**
   * Get tracer instance
   * 获取跟踪器实例
   */
  public getTracker(): IPipelineTracker {
    return this.tracker;
  }

  /**
   * Get execution statistics
   * 获取执行统计
   */
  public getExecutionStatistics() {
    return this.tracker.getStatistics();
  }

  /**
   * Get active execution contexts
   * 获取活动执行上下文
   */
  public getActiveExecutionContexts(): PipelineExecutionContext[] {
    return this.tracker.getActiveContexts();
  }

  /**
   * Get trace chains
   * 获取跟踪链
   */
  public getTraceChains() {
    return this.tracker.getActiveTraceChains();
  }

  /**
   * Get pipeline metrics with proper typing
   * 获取流水线指标，具有适当的类型
   */
  public getPipelineMetrics(): PipelineMetrics {
    const debugConfig = this.getDebugConfig();
    const stats = this.getExecutionStatistics();
    const baseMetrics = {
      debugEnabled: debugConfig?.enabled ?? false,
      ioTrackingEnabled: this.pipelineConfig.enableIOTracking ?? false,
      debugConfig: (debugConfig as unknown as Record<string, unknown>) ?? {},
      executionStats: stats ? {
        totalExecutions: stats.total || 0,
        successfulExecutions: stats.successful || 0,
        failedExecutions: stats.failed || 0,
        averageExecutionTime: stats.averageTime || 0
      } : undefined
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
      this.logInfo('Destroying unified pipeline base module', { moduleId: this.info.id }, 'destroy');

      // Destroy tracker
      if (this.tracker) {
        await this.tracker.destroy();
      }

      // Destroy debug center
      if (this.debugCenter && typeof this.debugCenter.destroy === 'function') {
        await this.debugCenter.destroy();
      }

      // Destroy error handler
      if (this.errorHandler && typeof this.errorHandler.destroy === 'function') {
        await this.errorHandler.destroy();
      }

      // Call parent destroy method
      await super.destroy();

    } catch (error) {
      const errorContext = {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
        moduleId: this.info.id
      };

      this.logError('Failed to destroy unified pipeline base module', errorContext, 'destroy');
      throw error;
    }
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  public abstract process(request: any): Promise<any>;
  public abstract processResponse?(response: any): Promise<any>;

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

      case 'getStats':
        return {
          success: true,
          data: this.getExecutionStatistics()
        };

      case 'getActiveContexts':
        return {
          success: true,
          data: this.getActiveExecutionContexts()
        };

      case 'getTraceChains':
        return {
          success: true,
          data: this.getTraceChains()
        };

      case 'updateConfig':
        this.updatePipelineConfig(message.payload);
        return {
          success: true,
          message: 'Configuration updated'
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

// Export the old class names as aliases for backward compatibility
export { UnifiedPipelineBaseModule as PipelineBaseModule };
export { UnifiedPipelineBaseModule as DebuggablePipelineModule };
