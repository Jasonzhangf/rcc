/**
 * Error Types for Pipeline Module
 * 流水线模块的错误类型
 */

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
  RATE_LIMIT = 'rate_limit',
  FATAL = 'fatal'
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
 * Trace event types
 * 跟踪事件类型
 */
export enum TraceEventType {
  ERROR_OCCURRED = 'error_occurred',
  CONTEXT_COMPLETED = 'context_completed',
  CONTEXT_STARTED = 'context_started',
  STAGE_CHANGED = 'stage_changed',
  REQUEST_RECEIVED = 'request_received',
  RESPONSE_SENT = 'response_sent'
}

/**
 * Enhanced error information
 * 增强的错误信息
 */
export interface EnhancedErrorInfo {
  errorId: string;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  context?: Record<string, any>;
  timestamp: number;
  executionId?: string;
  traceId?: string;
  stage?: string;
}

/**
 * Trace event interface
 * 跟踪事件接口
 */
export interface TraceEvent {
  eventType: TraceEventType;
  timestamp: number;
  executionId?: string;
  requestId?: string;
  traceId?: string;
  stage?: string;
  data?: any;
  error?: EnhancedErrorInfo;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Error handler interface
 * 错误处理接口
 */
export interface IErrorHandler {
  handleError(error: Error, context?: Record<string, any>): void;
  getErrorHistory(): EnhancedErrorInfo[];
  clearErrorHistory(): void;
}

/**
 * Performance metrics interface
 * 性能指标接口
 */
export interface IPerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage?: {
    start: number;
    end: number;
    peak: number;
  };
  cpuUsage?: {
    start: number;
    end: number;
    average: number;
  };
  networkRequests?: number;
  databaseQueries?: number;
  externalServiceCalls?: number;
}