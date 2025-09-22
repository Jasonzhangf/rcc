/**
 * Debuggable Pipeline Module - Enhanced pipeline module with integrated tracing
 * 可调试流水线模块 - 带有集成跟踪的增强流水线模块
 */

import { BaseModule, BaseModuleRecordingConfig } from 'rcc-basemodule';
import { default as ErrorHandlingCenter } from 'rcc-errorhandling';

class SimpleDebugCenter {
  constructor(config: any) {
    // Mock implementation
  }

  recordOperation(...args: any[]): void {
    // Mock implementation
  }

  recordPipelineStart(...args: any[]): void {
    // Mock implementation
  }

  recordPipelineEnd(...args: any[]): void {
    // Mock implementation
  }

  getPipelineEntries(...args: any[]): any[] {
    return [];
  }

  subscribe(...args: any[]): void {
    // Mock implementation
  }

  updateConfig(...args: any[]): void {
    // Mock implementation
  }

  async destroy(): Promise<void> {
    // Mock implementation
  }
}

// Use real ErrorHandlingCenter
const ErrorHandlingCenterType = ErrorHandlingCenter;
let DebugCenterType: any;
try {
  DebugCenterType = require('rcc-debugcenter').DebugCenter;
} catch {
  DebugCenterType = SimpleDebugCenter;
}
import {
  PipelineExecutionContext,
  ExecutionContextFactory,
  ExecutionContextOptions,
  ModuleInfo,
  ExecutionError,
  PipelineStage,
  ErrorCategory,
  ErrorSeverity
} from '../interfaces/ModularInterfaces';
import { PipelineTracker } from '../framework/PipelineTracker';

/**
 * Debuggable pipeline module configuration
 * 可调试流水线模块配置
 */
export interface DebuggablePipelineModuleConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'provider' | 'scheduler' | 'tracker' | 'pipeline' | 'debuggable-pipeline';

  // Enhanced debug configuration
  enableTracing?: boolean;
  tracerConfig?: Partial<any>;

  // Recording configuration
  recordingConfig?: Partial<BaseModuleRecordingConfig>;

  // Performance settings
  maxConcurrentExecutions?: number;
  executionTimeout?: number;
  enablePerformanceMetrics?: boolean;

  // Error handling
  enableEnhancedErrorHandling?: boolean;
  errorRecoveryAttempts?: number;

  // Provider-specific settings
  providerName?: string;
  endpoint?: string;
  supportedModels?: string[];
  defaultModel?: string;

  // Scheduling settings
  maxConcurrentRequests?: number;
  requestTimeout?: number;
  loadBalancingStrategy?: 'round-robin' | 'random' | 'weighted' | 'least-connections';

  // OAuth settings
  oauth?: {
    clientId: string;
    clientSecret: string;
    scopes: string[];
  };
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
 * Enhanced error information
 * 增强的错误信息
 */
interface EnhancedError extends ExecutionError {
  executionId: string;
  context: PipelineExecutionContext;
  recoveryAttempts: number;
}

/**
 * Debuggable Pipeline Module - Main class with integrated tracing and monitoring
 * 可调试流水线模块 - 主类，集成了跟踪和监控
 */
export class DebuggablePipelineModule extends BaseModule {
  protected config: DebuggablePipelineModuleConfig;
  protected tracker: PipelineTracker;
  protected errorHandler: any;
  protected contextFactory: ExecutionContextFactory;
  protected debugCenter: any;

  constructor(config: DebuggablePipelineModuleConfig) {
    const moduleInfo = {
      id: config.id,
      name: config.name,
      version: config.version,
      description: config.description,
      type: config.type
    };

    super(moduleInfo);

    this.config = config;

    // Initialize execution context factory
    this.contextFactory = ExecutionContextFactory.getInstance();

    // Initialize error handler
    this.errorHandler = new (ErrorHandlingCenterType as any)({
      id: `${config.id}-error-handler`,
      name: `${config.name} Error Handler`,
      version: '1.0.0',
      type: 'error-handler',
      description: `Error handler for ${config.name}`
    });

    // Initialize tracker
    this.tracker = new PipelineTracker();

    // Initialize debug center
    this.debugCenter = new (DebugCenterType as any)({
      enabled: config.enableTracing !== false,
      baseDirectory: config.recordingConfig?.basePath || '~/.rcc/debug-logs',
      maxLogEntries: 1000,
      recordStack: true
    });

    // Configure tracker with debug center
    if (config.enableTracing !== false) {
      this.tracker.setDebugCenter(this.debugCenter);
    }
  }

  public async initialize(): Promise<void> {
    await super.initialize();

    // Initialize tracker
    await this.tracker.initialize();

    // Set up trace event listeners
    this.setupTraceListeners();

    // Enable recording if configured
    if (this.config.recordingConfig?.enabled) {
      this.setRecordingConfig(this.config.recordingConfig);
      // IO tracking is enabled through recording config
    }

    this.logInfo('Debuggable pipeline module initialized', { config: this.config });
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
   * Log debug message
   * 记录调试信息
   */
  protected logDebug(message: string, data?: any): void {
    // Use BaseModule's log method instead of DebugCenter's private log method
    this.logInfo(message, data, 'logDebug');
  }

  /**
   * Log warning message
   * 记录警告信息
   */
  protected logWarn(message: string, data?: any): void {
    // Use BaseModule's warn method
    this.warn(message, data, 'logWarn');
  }

  /**
   * Log error message
   * 记录错误信息
   */
  protected logError(message: string, data?: any): void {
    // Use BaseModule's error method
    this.error(message, data, 'logError');
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
    const moduleInfo: ModuleInfo = {
      moduleId: this.info.id,
      moduleName: this.info.name,
      moduleType: this.info.type,
      providerName: this.config.providerName,
      endpoint: this.config.endpoint
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
      const metrics = this.config.enablePerformanceMetrics
        ? await this.collectPerformanceMetrics()
        : undefined;

      // Execute operation with timeout and retry logic
      const result = await this.executeWithTimeoutAndRetry(
        () => operation(context),
        options?.timeout || this.config.executionTimeout || 30000,
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
    if (this.config.enableEnhancedErrorHandling) {
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
  public getTracker(): PipelineTracker {
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
   * Update module configuration
   * 更新模块配置
   */
  public updateConfig(newConfig: Partial<DebuggablePipelineModuleConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Update tracer configuration if changed
    if (newConfig.tracerConfig || newConfig.enableTracing !== undefined) {
      this.tracker.updateConfig({
        ...this.tracker.getConfig(),
        ...newConfig.tracerConfig,
        enabled: newConfig.enableTracing ?? this.tracker.getConfig().enabled
      });
    }

    this.logInfo('Module configuration updated', {
      oldConfig: oldConfig,
      newConfig: this.config
    });
  }

  /**
   * Handle messages (required by BaseModule abstract class)
   */
  public async handleMessage(message: any): Promise<any> {
    switch (message.type) {
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
        this.updateConfig(message.payload);
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

  public async destroy(): Promise<void> {
    this.logInfo('Destroying debuggable pipeline module');

    try {
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

      // Call parent destroy
      await super.destroy();

    } catch (error) {
      this.logError('Failed to destroy debuggable pipeline module', { error });
      throw error;
    }
  }
}