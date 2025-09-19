/**
 * Pipeline Execution Context - Enhanced request-response tracing system
 * 流水线执行上下文 - 增强的请求响应跟踪系统
 */

import { BaseModuleRecordingConfig } from 'rcc-basemodule';

/**
 * Pipeline execution context interface with comprehensive request-response tracing
 * 流水线执行上下文接口，提供完整的请求响应跟踪
 */
export interface PipelineExecutionContext {
  /** Unique execution identifier */
  executionId: string;

  /** Request identifier for cross-module tracking */
  requestId: string;

  /** Trace identifier for distributed tracking */
  traceId: string;

  /** Session identifier for session tracking */
  sessionId?: string;

  /** Pipeline stage tracking */
  stage: PipelineStage;

  /** Current module information */
  module: ModuleInfo;

  /** Execution timing information */
  timing: ExecutionTiming;

  /** Request data with truncation support */
  request?: any;

  /** Response data with truncation support */
  response?: any;

  /** Error information if execution failed */
  error?: ExecutionError;

  /** Metadata for additional context */
  metadata?: Record<string, any>;

  /** Configuration snapshot */
  config?: ConfigSnapshot;

  /** Child contexts for nested executions */
  children?: PipelineExecutionContext[];

  /** Parent context for hierarchical tracking */
  parent?: PipelineExecutionContext;
}

/**
 * Pipeline stage enumeration
 * 流水线阶段枚举
 */
export enum PipelineStage {
  REQUEST_INIT = 'request_init',
  AUTHENTICATION = 'authentication',
  SCHEDULING = 'scheduling',
  PIPELINE_SELECTION = 'pipeline_selection',
  PROVIDER_EXECUTION = 'provider_execution',
  RESPONSE_PROCESSING = 'response_processing',
  COMPLETION = 'completion',
  ERROR_HANDLING = 'error_handling'
}

/**
 * Module information for pipeline tracking
 * 模块信息，用于流水线跟踪
 */
export interface ModuleInfo {
  moduleId: string;
  moduleName: string;
  moduleType: string;
  providerName?: string;
  endpoint?: string;
}

/**
 * Execution timing information
 * 执行时间信息
 */
export interface ExecutionTiming {
  startTime: number;
  endTime?: number;
  duration?: number;
  stageTimings: Map<PipelineStage, StageTiming>;
}

/**
 * Stage-specific timing information
 * 阶段特定的时间信息
 */
export interface StageTiming {
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * Execution error information
 * 执行错误信息
 */
export interface ExecutionError {
  errorId: string;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  context?: Record<string, any>;
}

/**
 * Error category enumeration
 * 错误类别枚举
 */
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  PROCESSING = 'processing',
  PROVIDER = 'provider',
  SYSTEM = 'system',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit'
}

/**
 * Error severity enumeration
 * 错误严重性枚举
 */
export enum ErrorSeverity {
  FATAL = 'fatal',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Configuration snapshot for consistency tracking
 * 配置快照，用于一致性跟踪
 */
export interface ConfigSnapshot {
  recordingConfig: BaseModuleRecordingConfig;
  baseDirectory: string;
  port?: number;
  environment: string;
  timestamp: number;
}

/**
 * Execution context creation options
 * 执行上下文创建选项
 */
export interface ExecutionContextOptions {
  /** Create new trace or inherit existing */
  createNewTrace?: boolean;

  /** Inherit from parent context */
  inheritFrom?: PipelineExecutionContext;

  /** Custom execution ID */
  executionId?: string;

  /** Custom trace ID */
  traceId?: string;

  /** Custom session ID */
  sessionId?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;

  /** Configuration overrides */
  config?: Partial<BaseModuleRecordingConfig>;
}

/**
 * Execution context manager interface
 * 执行上下文管理器接口
 */
export interface IExecutionContextManager {
  /** Create new execution context */
  createContext(
    moduleInfo: ModuleInfo,
    stage: PipelineStage,
    request?: any,
    options?: ExecutionContextOptions
  ): PipelineExecutionContext;

  /** Update context stage */
  updateStage(
    context: PipelineExecutionContext,
    newStage: PipelineStage,
    data?: any
  ): void;

  /** Complete context execution */
  completeContext(
    context: PipelineExecutionContext,
    response?: any,
    error?: ExecutionError
  ): void;

  /** Get context by execution ID */
  getContext(executionId: string): PipelineExecutionContext | undefined;

  /** Get context by request ID */
  getContextByRequestId(requestId: string): PipelineExecutionContext | undefined;

  /** Get active contexts */
  getActiveContexts(): PipelineExecutionContext[];

  /** Get contexts by trace ID */
  getContextsByTraceId(traceId: string): PipelineExecutionContext[];

  /** Clear completed contexts */
  clearCompletedContexts(): void;

  /** Get execution statistics */
  getStatistics(): ExecutionStatistics;
}

/**
 * Execution statistics
 * 执行统计
 */
export interface ExecutionStatistics {
  totalExecutions: number;
  activeExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  stageStatistics: Map<PipelineStage, StageStatistics>;
  errorStatistics: Map<ErrorCategory, number>;
}

/**
 * Stage-specific statistics
 * 阶段特定统计
 */
export interface StageStatistics {
  total: number;
  completed: number;
  failed: number;
  averageDuration: number;
}

/**
 * Execution context factory
 * 执行上下文工厂
 */
export class ExecutionContextFactory {
  private static instance: ExecutionContextFactory;

  private constructor() {}

  static getInstance(): ExecutionContextFactory {
    if (!this.instance) {
      this.instance = new ExecutionContextFactory();
    }
    return this.instance;
  }

  /**
   * Create execution context
   * 创建执行上下文
   */
  createContext(
    moduleInfo: ModuleInfo,
    stage: PipelineStage,
    request?: any,
    options?: ExecutionContextOptions
  ): PipelineExecutionContext {
    const now = Date.now();
    const executionId = options?.executionId || this.generateExecutionId();
    const traceId = options?.traceId || (options?.inheritFrom?.traceId || this.generateTraceId());
    const sessionId = options?.sessionId || options?.inheritFrom?.sessionId;

    const context: PipelineExecutionContext = {
      executionId,
      requestId: this.generateRequestId(),
      traceId,
      sessionId,
      stage,
      module: moduleInfo,
      timing: {
        startTime: now,
        stageTimings: new Map([[stage, {
          startTime: now,
          status: 'running'
        }]])
      },
      request: this.sanitizeRequest(request),
      metadata: options?.metadata || {},
      config: this.createConfigSnapshot(options?.config),
      children: [],
      parent: options?.inheritFrom
    };

    if (options?.inheritFrom) {
      options.inheritFrom.children?.push(context);
    }

    return context;
  }

  /**
   * Update context stage
   * 更新上下文阶段
   */
  updateStage(
    context: PipelineExecutionContext,
    newStage: PipelineStage,
    data?: any
  ): void {
    const now = Date.now();

    // Complete current stage
    const currentStageTiming = context.timing.stageTimings.get(context.stage);
    if (currentStageTiming && !currentStageTiming.endTime) {
      currentStageTiming.endTime = now;
      currentStageTiming.duration = now - currentStageTiming.startTime;
      currentStageTiming.status = 'completed';
    }

    // Update to new stage
    context.stage = newStage;
    context.timing.stageTimings.set(newStage, {
      startTime: now,
      status: 'running'
    });

    // Update metadata if provided
    if (data) {
      context.metadata = { ...context.metadata, ...data };
    }
  }

  /**
   * Complete context execution
   * 完成上下文执行
   */
  completeContext(
    context: PipelineExecutionContext,
    response?: any,
    error?: ExecutionError
  ): void {
    const now = Date.now();
    context.timing.endTime = now;
    context.timing.duration = now - context.timing.startTime;

    // Complete current stage
    const currentStageTiming = context.timing.stageTimings.get(context.stage);
    if (currentStageTiming && !currentStageTiming.endTime) {
      currentStageTiming.endTime = now;
      currentStageTiming.duration = now - currentStageTiming.startTime;
      currentStageTiming.status = error ? 'failed' : 'completed';
    }

    // Set response or error
    if (response) {
      context.response = this.sanitizeResponse(response);
    }
    if (error) {
      context.error = error;
    }
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeRequest(request: any): any {
    if (!request) return request;

    // Remove sensitive data
    const sanitized = { ...request };
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'auth'];

    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeResponse(response: any): any {
    if (!response) return response;

    // Remove sensitive data
    const sanitized = { ...response };
    const sensitiveKeys = ['token', 'apiKey', 'secret', 'privateKey'];

    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private createConfigSnapshot(config?: Partial<BaseModuleRecordingConfig>): ConfigSnapshot {
    return {
      recordingConfig: config as BaseModuleRecordingConfig || { enabled: false },
      baseDirectory: config?.basePath || '~/.rcc/debug',
      port: config?.port,
      environment: process.env.NODE_ENV || 'development',
      timestamp: Date.now()
    };
  }
}