/**
 * Pipeline Execution Context - Enhanced request-response tracing system
 * 流水线执行上下文 - 增强的请求响应跟踪系统
 */

import { BaseModuleRecordingConfig } from 'rcc-basemodule';

/**
 * Pipeline execution context interface with comprehensive request-response tracing
 * 流水线执行上下文接口，包含完整的请求响应跟踪功能
 */
export interface PipelineExecutionContext {
  sessionId: string;
  requestId: string;
  routingId: string;
  providerId: string;
  startTime: number;
  routingDecision?: any;
  performanceMetrics?: any;
  ioRecords: any[];
  metadata: {
    [key: string]: any;
  };
  parentContext?: PipelineExecutionContext;
  debugConfig?: any;

  // Additional properties needed by DebuggablePipelineModule
  executionId: string;
  traceId: string;
  stage: string;
  parent?: PipelineExecutionContext;
  timing: {
    startTime: number;
    endTime?: number;
    duration?: number;
    stageTimings: Map<string, {
      startTime: number;
      endTime?: number;
      duration?: number;
      status: 'pending' | 'running' | 'completed' | 'failed';
    }>;
    status: 'pending' | 'running' | 'completed' | 'failed';
  };
  error?: {
    errorId: string;
    message: string;
    stack?: string;
    category: string;
    severity: string;
    recoverable: boolean;
    timestamp: number;
  };
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
  stageTimings: Map<string, StageTiming>;
  status: 'pending' | 'running' | 'completed' | 'failed';
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
  timestamp: number;
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
  /** Base directory for file operations */
  baseDirectory?: string;
  /** Recording configuration */
  recordingConfig?: BaseModuleRecordingConfig;
  /** Initial request data */
  request?: any;
  /** Parent context for hierarchical tracking */
  parent?: PipelineExecutionContext;
  /** Debug configuration */
  debugConfig?: any;
  executionId?: string;
  traceId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  inheritFrom?: PipelineExecutionContext;
  requestId?: string;
  routingId?: string;
  providerId?: string;
  startTime?: number;
  stage?: string;
  timing?: any;
  ioRecords?: any[];
  parentContext?: PipelineExecutionContext;
  routingDecision?: any;
  performanceMetrics?: any;
  error?: any;
}

/**
 * 执行上下文工厂类
 */
export class ExecutionContextFactory {
  private static instance: ExecutionContextFactory;
  private activeContexts: Map<string, PipelineExecutionContext> = new Map();

  private constructor() {}

  public static getInstance(): ExecutionContextFactory {
    if (!ExecutionContextFactory.instance) {
      ExecutionContextFactory.instance = new ExecutionContextFactory();
    }
    return ExecutionContextFactory.instance;
  }

  /**
   * 创建执行上下文
   */
  public createContext(
    moduleInfo: ModuleInfo,
    stage: PipelineStage,
    request?: any,
    options?: ExecutionContextOptions
  ): PipelineExecutionContext {
    const executionId = options?.executionId || this.generateExecutionId();
    const traceId = options?.traceId || this.generateTraceId();
    const sessionId = options?.sessionId || this.generateSessionId();
    const requestId = this.generateRequestId();

    const context: PipelineExecutionContext = {
      executionId,
      traceId,
      sessionId,
      requestId,
      routingId: moduleInfo.moduleId,
      providerId: moduleInfo.providerName || 'unknown',
      startTime: Date.now(),
      stage,
      timing: {
        startTime: Date.now(),
        endTime: undefined,
        duration: undefined,
        stageTimings: new Map(),
        status: 'pending'
      },
      metadata: options?.metadata || {},
      ioRecords: [],
      parentContext: options?.inheritFrom || options?.parent,
      debugConfig: options?.debugConfig,
      routingDecision: undefined,
      performanceMetrics: undefined
    };

    // 如果有父上下文，继承相关属性
    if (options?.inheritFrom || options?.parent) {
      context.parent = options.inheritFrom || options.parent;
      context.parentContext = options.inheritFrom || options.parent;
    }

    // 记录阶段开始时间
    context.timing.stageTimings.set(stage, {
      startTime: Date.now(),
      status: 'running'
    });

    // 缓存活跃上下文
    this.activeContexts.set(executionId, context);

    return context;
  }

  /**
   * 完成执行上下文
   */
  public completeContext(context: PipelineExecutionContext, result?: any, error?: ExecutionError): void {
    const timing = context.timing;
    timing.endTime = Date.now();
    timing.duration = timing.endTime - timing.startTime;
    timing.status = error ? 'failed' : 'completed';

    // 完成当前阶段
    const currentStage = context.timing.stageTimings.get(context.stage);
    if (currentStage) {
      currentStage.endTime = Date.now();
      currentStage.duration = currentStage.endTime - currentStage.startTime;
      currentStage.status = error ? 'failed' : 'completed';
    }

    // 如果有错误，记录到上下文
    if (error) {
      context.error = error;
    }

    // 从活跃上下文中移除
    this.activeContexts.delete(context.executionId);
  }

  /**
   * 更新上下文阶段
   */
  public updateContextStage(context: PipelineExecutionContext, newStage: PipelineStage): void {
    // 完成当前阶段
    const currentStage = context.timing.stageTimings.get(context.stage);
    if (currentStage) {
      currentStage.endTime = Date.now();
      currentStage.duration = currentStage.endTime - currentStage.startTime;
      currentStage.status = 'completed';
    }

    // 更新上下文阶段
    context.stage = newStage;

    // 开始新阶段
    context.timing.stageTimings.set(newStage, {
      startTime: Date.now(),
      status: 'running'
    });
  }

  /**
   * 获取活跃上下文
   */
  public getActiveContext(executionId: string): PipelineExecutionContext | undefined {
    return this.activeContexts.get(executionId);
  }

  /**
   * 获取所有活跃上下文
   */
  public getAllActiveContexts(): PipelineExecutionContext[] {
    return Array.from(this.activeContexts.values());
  }

  /**
   * 清理过期上下文
   */
  public cleanupExpiredContexts(maxAge: number = 300000): void {
    const now = Date.now();
    for (const [executionId, context] of this.activeContexts.entries()) {
      if (now - context.startTime > maxAge) {
        this.completeContext(context);
      }
    }
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}