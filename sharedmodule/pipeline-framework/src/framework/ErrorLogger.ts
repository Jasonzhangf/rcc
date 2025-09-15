/**
 * Error Logger - Error Request Isolation System
 * 错误日志记录器 - 错误请求隔离系统
 */

import {
  DebugConfig,
  ErrorLog,
  RequestContext,
  LogEntry,
  OperationType
} from '../types/debug-types';
import { FileManager } from './FileManager';
import { IErrorLogEntry, ILogEntryFactory } from '../interfaces/ILogEntries';

/**
 * Error Log Entry Implementation
 * 错误日志条目实现
 */
class ErrorLogEntryImpl implements IErrorLogEntry {
  private data: ErrorLog;

  constructor(data: ErrorLog) {
    this.data = { ...data };
  }

  getRequestId(): string {
    return this.data.requestId;
  }

  getPipelineId(): string {
    return this.data.pipelineId;
  }

  getTimestamp(): number {
    return this.data.timestamp;
  }

  getProvider(): string {
    return this.data.provider;
  }

  getOperation(): string {
    return this.data.operation;
  }

  getError(): ErrorLog['error'] {
    return { ...this.data.error };
  }

  getRequest(): ErrorLog['request'] {
    return { ...this.data.request };
  }

  getFailedStage(): string | undefined {
    return this.data.failedStage;
  }

  getStages(): ErrorLog['stages'] {
    return [...this.data.stages];
  }

  getDebugInfo(): Record<string, any> | undefined {
    return this.data.debugInfo ? { ...this.data.debugInfo } : undefined;
  }

  setError(error: ErrorLog['error']): void {
    this.data.error = { ...error };
  }

  setRequest(request: ErrorLog['request']): void {
    this.data.request = { ...request };
  }

  setFailedStage(stage: string): void {
    this.data.failedStage = stage;
  }

  setDebugInfo(debugInfo: Record<string, any>): void {
    this.data.debugInfo = { ...debugInfo };
  }

  addStage(stage: ErrorLog['stages'][0]): void {
    this.data.stages.push({ ...stage });
  }

  toObject(): ErrorLog {
    return { ...this.data };
  }

  toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  clone(): IErrorLogEntry {
    return new ErrorLogEntryImpl(this.toObject());
  }
}

/**
 * Error Logger Implementation
 * 错误日志记录器实现
 */
export class ErrorLogger {
  private config: DebugConfig;
  private fileManager: FileManager;
  private logEntryFactory: ILogEntryFactory;

  constructor(config: DebugConfig, fileManager: FileManager, logEntryFactory: ILogEntryFactory) {
    this.config = config;
    this.fileManager = fileManager;
    this.logEntryFactory = logEntryFactory;
  }

  /**
   * Log error with context
   * 记录带上下文的错误
   */
  async logError(
    context: RequestContext,
    error: Error | string,
    request?: any,
    failedStage?: string,
    debugInfo?: Record<string, any>
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const errorLog: ErrorLog = {
        requestId: context.requestId,
        pipelineId: context.pipelineId,
        timestamp: Date.now(),
        provider: context.provider,
        operation: context.operation,
        error: this.normalizeError(error),
        request: {
          headers: this.extractHeaders(request),
          body: this.sanitizeRequestData(request),
          metadata: context.metadata
        },
        failedStage,
        stages: context.stages,
        debugInfo: this.sanitizeDebugInfo(debugInfo)
      };

      await this.fileManager.writeToErrorLog(errorLog);

      // Also log to system log for immediate visibility
      await this.logToSystemLog(errorLog);

    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Log multiple errors from batch operation
   * 记录批量操作中的多个错误
   */
  async logBatchErrors(
    errors: Array<{
      context: RequestContext;
      error: Error | string;
      request?: any;
      failedStage?: string;
      debugInfo?: Record<string, any>;
    }>
  ): Promise<void> {
    if (!this.config.enabled) return;

    const logPromises = errors.map(({ context, error, request, failedStage, debugInfo }) =>
      this.logError(context, error, request, failedStage, debugInfo)
    );

    await Promise.allSettled(logPromises);
  }

  /**
   * Log error with performance metrics
   * 记录带性能指标的错误
   */
  async logErrorWithMetrics(
    context: RequestContext,
    error: Error | string,
    metrics: {
      duration: number;
      memoryUsage?: NodeJS.MemoryUsage;
      cpuUsage?: NodeJS.CpuUsage;
      networkLatency?: number;
    },
    request?: any,
    failedStage?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    const debugInfo = {
      performance: {
        duration: metrics.duration,
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage,
        networkLatency: metrics.networkLatency
      },
      timestamp: Date.now()
    };

    await this.logError(context, error, request, failedStage, debugInfo);
  }

  /**
   * Log authentication errors
   * 记录认证错误
   */
  async logAuthError(
    context: RequestContext,
    error: Error | string,
    authDetails: {
      authMethod: string;
      endpoint?: string;
      statusCode?: number;
      authHeaders?: Record<string, string>;
    },
    request?: any
  ): Promise<void> {
    if (!this.config.enabled) return;

    const debugInfo = {
      authentication: {
        ...authDetails,
        timestamp: Date.now()
      }
    };

    await this.logError(context, error, request, 'authentication', debugInfo);
  }

  /**
   * Log network errors
   * 记录网络错误
   */
  async logNetworkError(
    context: RequestContext,
    error: Error | string,
    networkDetails: {
      url?: string;
      method?: string;
      statusCode?: number;
      timeout?: number;
      retries?: number;
    },
    request?: any
  ): Promise<void> {
    if (!this.config.enabled) return;

    const debugInfo = {
      network: {
        ...networkDetails,
        timestamp: Date.now()
      }
    };

    await this.logError(context, error, request, 'network', debugInfo);
  }

  /**
   * Log validation errors
   * 记录验证错误
   */
  async logValidationError(
    context: RequestContext,
    error: Error | string,
    validationDetails: {
      field?: string;
      value?: any;
      validationRule?: string;
      schema?: string;
    },
    request?: any
  ): Promise<void> {
    if (!this.config.enabled) return;

    const debugInfo = {
      validation: {
        ...validationDetails,
        timestamp: Date.now()
      }
    };

    await this.logError(context, error, request, 'validation', debugInfo);
  }

  /**
   * Log timeout errors
   * 记录超时错误
   */
  async logTimeoutError(
    context: RequestContext,
    error: Error | string,
    timeoutDetails: {
      timeout: number;
      operation: string;
      stage: string;
    },
    request?: any
  ): Promise<void> {
    if (!this.config.enabled) return;

    const debugInfo = {
      timeout: {
        ...timeoutDetails,
        timestamp: Date.now()
      }
    };

    await this.logError(context, error, request, timeoutDetails.stage, debugInfo);
  }

  /**
   * Log critical errors with alert
   * 记录关键错误并发送警报
   */
  async logCriticalError(
    context: RequestContext,
    error: Error | string,
    criticalDetails: {
      severity: 'critical' | 'high' | 'medium' | 'low';
      impact: string;
      actionRequired?: string;
      affectedSystems?: string[];
    },
    request?: any,
    failedStage?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    const debugInfo = {
      critical: {
        ...criticalDetails,
        timestamp: Date.now()
      }
    };

    await this.logError(context, error, request, failedStage, debugInfo);

    // Additional alert handling could be added here
    // For example: send to monitoring system, email, etc.
  }

  /**
   * Log error recovery attempts
   * 记录错误恢复尝试
   */
  async logRecoveryAttempt(
    context: RequestContext,
    originalError: Error | string,
    recoveryDetails: {
      attempt: number;
      strategy: string;
      success: boolean;
      newError?: Error | string;
    }
  ): Promise<void> {
    if (!this.config.enabled) return;

    const debugInfo = {
      recovery: {
        ...recoveryDetails,
        timestamp: Date.now()
      }
    };

    const error = recoveryDetails.success
      ? originalError
      : recoveryDetails.newError || originalError;

    await this.logError(context, error, undefined, 'recovery', debugInfo);
  }

  /**
   * Log circuit breaker events
   * 记录断路器事件
   */
  async logCircuitBreakerEvent(
    provider: string,
    operation: OperationType,
    event: 'open' | 'close' | 'half-open',
    details: {
      failureCount: number;
      failureThreshold: number;
      lastFailureTime?: number;
      resetTimeout?: number;
    }
  ): Promise<void> {
    if (!this.config.enabled) return;

    const context: RequestContext = {
      requestId: `circuit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pipelineId: `circuit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      endTime: Date.now(),
      provider,
      operation,
      stages: [],
      metadata: {
        circuitBreaker: true,
        event
      }
    };

    const debugInfo = {
      circuitBreaker: {
        ...details,
        event,
        timestamp: Date.now()
      }
    };

    const error = new Error(`Circuit breaker ${event} event`);
    await this.logError(context, error, undefined, 'circuit_breaker', debugInfo);
  }

  /**
   * Log rate limiting errors
   * 记录速率限制错误
   */
  async logRateLimitError(
    context: RequestContext,
    error: Error | string,
    rateLimitDetails: {
      limit: number;
      remaining: number;
      resetTime: number;
      retryAfter?: number;
    },
    request?: any
  ): Promise<void> {
    if (!this.config.enabled) return;

    const debugInfo = {
      rateLimit: {
        ...rateLimitDetails,
        timestamp: Date.now()
      }
    };

    await this.logError(context, error, request, 'rate_limit', debugInfo);
  }

  /**
   * Log error to system log
   * 记录错误到系统日志
   */
  private async logToSystemLog(errorLog: ErrorLog): Promise<void> {
    const systemLog = {
      level: 'error' as const,
      message: `Error in ${errorLog.provider}.${errorLog.operation}: ${errorLog.error.message}`,
      timestamp: errorLog.timestamp,
      requestId: errorLog.requestId,
      provider: errorLog.provider,
      operation: errorLog.operation,
      metadata: {
        errorType: errorLog.error.type,
        failedStage: errorLog.failedStage,
        stages: errorLog.stages.length
      }
    };

    await this.fileManager.writeToSystemLog(systemLog);
  }

  /**
   * Normalize error to standard format
   * 将错误标准化为统一格式
   */
  private normalizeError(error: Error | string): ErrorLog['error'] {
    if (typeof error === 'string') {
      return {
        message: error,
        type: 'Error'
      };
    }

    return {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      type: error.constructor.name
    };
  }

  /**
   * Extract headers from request
   * 从请求中提取头部信息
   */
  private extractHeaders(request?: any): Record<string, string> | undefined {
    if (!request || !request.headers) return undefined;

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
      headers[key] = String(value);
    }

    return headers;
  }

  /**
   * Sanitize request data
   * 清理请求数据
   */
  private sanitizeRequestData(request?: any): any {
    if (!request) return undefined;

    if (!this.config.contentFiltering.enabled) {
      return request;
    }

    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(request));

    // Recursively sanitize sensitive fields
    const sanitizeObject = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        if (this.config.contentFiltering.sensitiveFields.includes(key.toLowerCase())) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);

    // Truncate if too long
    const contentStr = JSON.stringify(sanitized);
    if (contentStr.length > this.config.contentFiltering.maxContentLength) {
      return {
        _truncated: true,
        _originalLength: contentStr.length,
        _truncatedLength: this.config.contentFiltering.maxContentLength,
        data: contentStr.substring(0, this.config.contentFiltering.maxContentLength)
      };
    }

    return sanitized;
  }

  /**
   * Sanitize debug info
   * 清理调试信息
   */
  private sanitizeDebugInfo(debugInfo?: Record<string, any>): Record<string, any> | undefined {
    if (!debugInfo) return undefined;

    // Remove any sensitive information from debug info
    const sanitized = JSON.parse(JSON.stringify(debugInfo));

    // Remove sensitive fields
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
    const removeSensitiveKeys = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          removeSensitiveKeys(obj[key]);
        }
      }
    };

    removeSensitiveKeys(sanitized);
    return sanitized;
  }

  /**
   * Get error statistics
   * 获取错误统计
   */
  async getErrorStatistics(timeRange?: {
    start: number;
    end: number;
  }): Promise<{
    totalErrors: number;
    errorTypes: { [type: string]: number };
    providers: { [provider: string]: number };
    operations: { [operation: string]: number };
    failedStages: { [stage: string]: number };
  }> {
    const errorFiles = await this.fileManager.getLogFiles(this.config.paths.errors);
    const allErrors: ErrorLog[] = [];

    for (const file of errorFiles) {
      const errors = await this.fileManager.readLogFile(file);
      allErrors.push(...errors as ErrorLog[]);
    }

    // Filter by time range if specified
    const filteredErrors = timeRange
      ? allErrors.filter(error => error.timestamp >= timeRange.start && error.timestamp <= timeRange.end)
      : allErrors;

    const statistics = {
      totalErrors: filteredErrors.length,
      errorTypes: {} as { [type: string]: number },
      providers: {} as { [provider: string]: number },
      operations: {} as { [operation: string]: number },
      failedStages: {} as { [stage: string]: number }
    };

    filteredErrors.forEach(error => {
      // Count error types
      statistics.errorTypes[error.error.type] = (statistics.errorTypes[error.error.type] || 0) + 1;

      // Count providers
      statistics.providers[error.provider] = (statistics.providers[error.provider] || 0) + 1;

      // Count operations
      statistics.operations[error.operation] = (statistics.operations[error.operation] || 0) + 1;

      // Count failed stages
      if (error.failedStage) {
        statistics.failedStages[error.failedStage] = (statistics.failedStages[error.failedStage] || 0) + 1;
      }
    });

    return statistics;
  }
}