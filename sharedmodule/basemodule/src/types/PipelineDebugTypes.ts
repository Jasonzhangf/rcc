/**
 * Pipeline Execution Context Types
 * 流水线执行上下文类型定义
 */

/**
 * Pipeline execution context interface
 * 流水线执行上下文接口
 */
export interface PipelineExecutionContext {
  /**
   * Unique identifier for the execution context
   */
  id: string;

  /**
   * Pipeline identifier
   */
  pipelineId: string;

  /**
   * Pipeline name
   */
  pipelineName: string;

  /**
   * Current execution stage
   */
  stage: string;

  /**
   * Current execution phase
   */
  phase: 'initialization' | 'execution' | 'cleanup' | 'completed' | 'failed';

  /**
   * Start timestamp
   */
  startTime: number;

  /**
   * End timestamp (when completed)
   */
  endTime?: number;

  /**
   * Total execution duration
   */
  duration?: number;

  /**
   * Execution status
   */
  status: 'running' | 'completed' | 'failed' | 'cancelled';

  /**
   * Input data for the pipeline
   */
  inputData: any;

  /**
   * Output data from the pipeline
   */
  outputData?: any;

  /**
   * Error information if failed
   */
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };

  /**
   * Module-specific contexts
   */
  moduleContexts: Map<string, ModuleExecutionContext>;

  /**
   * Execution metadata
   */
  metadata: {
    traceId: string;
    parentId?: string;
    requestId?: string;
    userId?: string;
    tags?: string[];
  };

  /**
   * Performance metrics
   */
  metrics: {
    totalOperations: number;
    completedOperations: number;
    failedOperations: number;
    averageOperationTime: number;
    memoryUsage: {
      start: number;
      peak: number;
      end: number;
    };
  };

  /**
   * Configuration settings
   */
  config: {
    debugEnabled: boolean;
    ioTrackingEnabled: boolean;
    maxEntriesPerFile: number;
    saveIndividualFiles: boolean;
    saveSessionFiles: boolean;
  };
}

/**
 * Module execution context interface
 * 模块执行上下文接口
 */
export interface ModuleExecutionContext {
  /**
   * Module identifier
   */
  moduleId: string;

  /**
   * Module name
   */
  moduleName: string;

  /**
   * Module type
   */
  moduleType: string;

  /**
   * Start timestamp
   */
  startTime: number;

  /**
   * End timestamp (when completed)
   */
  endTime?: number;

  /**
   * Execution duration
   */
  duration?: number;

  /**
   * Execution status
   */
  status: 'pending' | 'running' | 'completed' | 'failed';

  /**
   * Input data for the module
   */
  inputData: any;

  /**
   * Output data from the module
   */
  outputData?: any;

  /**
   * Error information if failed
   */
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };

  /**
   * Operation-specific data
   */
  operations: ModuleOperationContext[];

  /**
   * Module-specific metadata
   */
  metadata: {
    operationId?: string;
    method?: string;
    retryCount?: number;
    timeout?: number;
  };
}

/**
 * Module operation context interface
 * 模块操作上下文接口
 */
export interface ModuleOperationContext {
  /**
   * Operation identifier
   */
  operationId: string;

  /**
   * Operation type
   */
  operationType: string;

  /**
   * Method name
   */
  method?: string;

  /**
   * Start timestamp
   */
  startTime: number;

  /**
   * End timestamp (when completed)
   */
  endTime?: number;

  /**
   * Operation duration
   */
  duration?: number;

  /**
   * Operation status
   */
  status: 'pending' | 'running' | 'completed' | 'failed';

  /**
   * Input data for the operation
   */
  inputData: any;

  /**
   * Output data from the operation
   */
  outputData?: any;

  /**
   * Error information if failed
   */
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };

  /**
   * Operation metadata
   */
  metadata: {
    retryCount?: number;
    timeout?: number;
    cacheKey?: string;
    tags?: string[];
  };
}

/**
 * Pipeline tracer interface
 * 流水线追踪器接口
 */
export interface PipelineTracer {
  /**
   * Start a new pipeline execution
   */
  startPipeline(
    pipelineId: string,
    pipelineName: string,
    inputData: any,
    config?: Partial<PipelineExecutionContext['config']>
  ): PipelineExecutionContext;

  /**
   * End a pipeline execution
   */
  endPipeline(
    contextId: string,
    outputData?: any,
    error?: Error
  ): void;

  /**
   * Start module execution
   */
  startModule(
    contextId: string,
    moduleId: string,
    moduleName: string,
    moduleType: string,
    inputData: any,
    metadata?: ModuleExecutionContext['metadata']
  ): void;

  /**
   * End module execution
   */
  endModule(
    contextId: string,
    moduleId: string,
    outputData?: any,
    error?: Error
  ): void;

  /**
   * Track module operation
   */
  trackOperation(
    contextId: string,
    moduleId: string,
    operationId: string,
    operationType: string,
    method?: string,
    inputData?: any,
    metadata?: ModuleOperationContext['metadata']
  ): void;

  /**
   * Complete operation
   */
  completeOperation(
    contextId: string,
    moduleId: string,
    operationId: string,
    outputData?: any,
    error?: Error
  ): void;

  /**
   * Get execution context
   */
  getContext(contextId: string): PipelineExecutionContext | null;

  /**
   * Get all active contexts
   */
  getActiveContexts(): PipelineExecutionContext[];

  /**
   * Get completed contexts
   */
  getCompletedContexts(): PipelineExecutionContext[];

  /**
   * Get context by trace ID
   */
  getContextByTraceId(traceId: string): PipelineExecutionContext | null;

  /**
   * Cancel execution
   */
  cancelExecution(contextId: string, reason?: string): void;

  /**
   * Export context data
   */
  exportContext(contextId: string, format?: 'json' | 'csv'): string;

  /**
   * Clear completed contexts
   */
  clearCompletedContexts(maxAge?: number): void;
}

/**
 * Debuggable pipeline module interface
 * 可调试流水线模块接口
 */
export interface DebuggablePipelineModule {
  /**
   * Get pipeline tracer
   */
  getTracer(): PipelineTracer;

  /**
   * Enable enhanced debugging
   */
  enableEnhancedDebugging(config: DebugConfig): void;

  /**
   * Get execution context
   */
  getCurrentContext(): PipelineExecutionContext | null;

  /**
   * Track I/O operation with context
   */
  trackIOWithContext(
    operationId: string,
    inputData: any,
    outputData?: any,
    method?: string,
    metadata?: Record<string, any>
  ): void;

  /**
   * Get module metrics
   */
  getEnhancedMetrics(): ModuleMetrics;
}

/**
 * Enhanced debug configuration
 * 增强调试配置
 */
export interface DebugConfig {
  /**
   * Whether debugging is enabled
   */
  enabled: boolean;

  /**
   * Debug level
   */
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';

  /**
   * Base directory for debug logs
   */
  baseDirectory: string;

  /**
   * I/O tracking configuration
   */
  ioTracking: {
    enabled: boolean;
    autoRecord: boolean;
    saveIndividualFiles: boolean;
    saveSessionFiles: boolean;
    maxEntriesPerFile: number;
    fieldTruncation: {
      enabled: boolean;
      maxLength: number;
      fields: string[];
    };
  };

  /**
   * Pipeline tracing configuration
   */
  pipelineTracing: {
    enabled: boolean;
    maxContexts: number;
    contextRetention: number; // in milliseconds
    enablePerformanceTracking: boolean;
    enableMemoryTracking: boolean;
  };

  /**
   * Performance monitoring
   */
  performance: {
    enabled: boolean;
    samplingRate: number; // 0.0 to 1.0
    slowOperationThreshold: number; // in milliseconds
    enableProfiling: boolean;
  };

  /**
   * Output configuration
   */
  output: {
    console: boolean;
    file: boolean;
    remote: boolean;
    maxFileSize: number;
    maxFiles: number;
  };
}

/**
 * Module metrics interface
 * 模块指标接口
 */
export interface ModuleMetrics {
  /**
   * Basic module information
   */
  module: {
    id: string;
    name: string;
    type: string;
    version: string;
  };

  /**
   * Performance metrics
   */
  performance: {
    totalOperations: number;
    completedOperations: number;
    failedOperations: number;
    averageOperationTime: number;
    totalExecutionTime: number;
    lastOperationTime: number;
  };

  /**
   * Memory usage
   */
  memory: {
    currentUsage: number;
    peakUsage: number;
    averageUsage: number;
  };

  /**
   * Error metrics
   */
  errors: {
    totalErrors: number;
    errorRate: number; // errors per operation
    lastError?: {
      message: string;
      timestamp: number;
      operation: string;
    };
  };

  /**
   * I/O metrics
   */
  io: {
    totalIOOperations: number;
    averageIOTime: number;
    lastIOOperation?: {
      operationId: string;
      timestamp: number;
      dataSize: number;
    };
  };

  /**
   * Debug system metrics
   */
  debug: {
    enabled: boolean;
    ioTrackingEnabled: boolean;
    pipelineTracingEnabled: boolean;
    activeContexts: number;
    totalContexts: number;
  };
}