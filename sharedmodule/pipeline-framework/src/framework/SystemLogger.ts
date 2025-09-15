/**
 * System Logger - Normal Logging System
 * 系统日志记录器 - 正常日志系统
 */

import {
  DebugConfig,
  SystemLog,
  LogEntry,
  LogLevels
} from '../types/debug-types';
import { FileManager } from './FileManager';
import { ISystemLogEntry, ILogEntryFactory } from '../interfaces/ILogEntries';

/**
 * System Log Entry Implementation
 * 系统日志条目实现
 */
class SystemLogEntryImpl implements ISystemLogEntry {
  private data: SystemLog;

  constructor(data: SystemLog) {
    this.data = { ...data };
  }

  getLevel(): SystemLog['level'] {
    return this.data.level;
  }

  getMessage(): string {
    return this.data.message;
  }

  getTimestamp(): number {
    return this.data.timestamp;
  }

  getRequestId(): string | undefined {
    return this.data.requestId;
  }

  getProvider(): string | undefined {
    return this.data.provider;
  }

  getOperation(): string | undefined {
    return this.data.operation;
  }

  getMetadata(): Record<string, any> | undefined {
    return this.data.metadata ? { ...this.data.metadata } : undefined;
  }

  setLevel(level: SystemLog['level']): void {
    this.data.level = level;
  }

  setMessage(message: string): void {
    this.data.message = message;
  }

  setRequestId(requestId: string): void {
    this.data.requestId = requestId;
  }

  setProvider(provider: string): void {
    this.data.provider = provider;
  }

  setOperation(operation: string): void {
    this.data.operation = operation;
  }

  setMetadata(metadata: Record<string, any>): void {
    this.data.metadata = { ...metadata };
  }

  toObject(): SystemLog {
    return { ...this.data };
  }

  toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  clone(): ISystemLogEntry {
    return new SystemLogEntryImpl(this.toObject());
  }
}

/**
 * System Logger Implementation
 * 系统日志记录器实现
 */
export class SystemLogger {
  private config: DebugConfig;
  private fileManager: FileManager;
  private logEntryFactory: ILogEntryFactory;
  private consoleOutputEnabled: boolean = false;

  constructor(
    config: DebugConfig,
    fileManager: FileManager,
    logEntryFactory: ILogEntryFactory,
    consoleOutputEnabled: boolean = false
  ) {
    this.config = config;
    this.fileManager = fileManager;
    this.logEntryFactory = logEntryFactory;
    this.consoleOutputEnabled = consoleOutputEnabled;
  }

  /**
   * Log system messages
   * 记录系统消息
   */
  async log(
    level: SystemLog['level'],
    message: string,
    context?: {
      requestId?: string;
      provider?: string;
      operation?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    if (!this.config.enabled || this.config.logLevel === LogLevels.SILENT) return;

    // Check log level
    if (!this.shouldLog(level)) return;

    try {
      const logEntry: SystemLog = {
        level,
        message: this.truncateMessage(message),
        timestamp: Date.now(),
        ...context
      };

      await this.fileManager.writeToSystemLog(logEntry);

      // Also log to console if enabled
      if (this.consoleOutputEnabled) {
        this.logToConsole(logEntry);
      }

    } catch (error) {
      console.error('Failed to log system message:', error);
    }
  }

  /**
   * Log debug message
   * 记录调试消息
   */
  async debug(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.log('debug', message, context);
  }

  /**
   * Log info message
   * 记录信息消息
   */
  async info(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.log('info', message, context);
  }

  /**
   * Log warning message
   * 记录警告消息
   */
  async warn(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.log('warn', message, context);
  }

  /**
   * Log error message
   * 记录错误消息
   */
  async error(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.log('error', message, context);
  }

  /**
   * Log provider startup
   * 记录提供者启动
   */
  async logProviderStartup(
    provider: string,
    details: {
      version?: string;
      endpoint?: string;
      supportedModels?: string[];
      capabilities?: Record<string, boolean>;
    }
  ): Promise<void> {
    await this.info(`Provider ${provider} started`, {
      provider,
      operation: 'startup',
      metadata: details
    });
  }

  /**
   * Log provider shutdown
   * 记录提供者关闭
   */
  async logProviderShutdown(
    provider: string,
    details: {
      reason?: string;
      uptime?: number;
      totalRequests?: number;
    }
  ): Promise<void> {
    await this.info(`Provider ${provider} shutdown`, {
      provider,
      operation: 'shutdown',
      metadata: details
    });
  }

  /**
   * Log configuration changes
   * 记录配置更改
   */
  async logConfigurationChange(
    component: string,
    changes: Record<string, any>,
    userId?: string
  ): Promise<void> {
    await this.info(`Configuration changed for ${component}`, {
      operation: 'config_change',
      metadata: {
        component,
        changes,
        userId,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Log performance metrics
   * 记录性能指标
   */
  async logPerformanceMetrics(
    metrics: {
      operation: string;
      duration: number;
      success: boolean;
      memoryUsage?: NodeJS.MemoryUsage;
      throughput?: number;
    }
  ): Promise<void> {
    await this.debug(`Performance metrics for ${metrics.operation}`, {
      operation: 'performance',
      metadata: {
        ...metrics,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Log health check results
   * 记录健康检查结果
   */
  async logHealthCheck(
    provider: string,
    status: 'healthy' | 'unhealthy',
    details?: {
      responseTime?: number;
      error?: string;
      checks?: Record<string, boolean>;
    }
  ): Promise<void> {
    const level = status === 'healthy' ? 'debug' : 'warn';
    await this.log(level, `Health check for ${provider}: ${status}`, {
      provider,
      operation: 'health_check',
      metadata: details
    });
  }

  /**
   * Log rate limiting events
   * 记录速率限制事件
   */
  async logRateLimitEvent(
    provider: string,
    event: 'limit_reached' | 'reset' | 'window_sliding',
    details: {
      current: number;
      limit: number;
      windowSize: number;
      resetTime?: number;
    }
  ): Promise<void> {
    await this.warn(`Rate limit ${event} for ${provider}`, {
      provider,
      operation: 'rate_limit',
      metadata: details
    });
  }

  /**
   * Log cache events
   * 记录缓存事件
   */
  async logCacheEvent(
    operation: string,
    event: 'hit' | 'miss' | 'set' | 'evict' | 'clear',
    details: {
      key?: string;
      size?: number;
      ttl?: number;
      reason?: string;
    }
  ): Promise<void> {
    await this.debug(`Cache ${event} for ${operation}`, {
      operation: 'cache',
      metadata: {
        event,
        ...details,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Log batch operation results
   * 记录批量操作结果
   */
  async logBatchOperation(
    operation: string,
    results: {
      total: number;
      successful: number;
      failed: number;
      duration: number;
      errors?: Array<{ message: string; count: number }>;
    }
  ): Promise<void> {
    const successRate = (results.successful / results.total * 100).toFixed(2);
    await this.info(`Batch operation ${operation} completed`, {
      operation: 'batch',
      metadata: {
        ...results,
        successRate: parseFloat(successRate),
        timestamp: Date.now()
      }
    });
  }

  /**
   * Log security events
   * 记录安全事件
   */
  async logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      resource?: string;
      action?: string;
    }
  ): Promise<void> {
    const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    await this.log(level, `Security event: ${event}`, {
      operation: 'security',
      metadata: {
        event,
        severity,
        ...details,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Log maintenance events
   * 记录维护事件
   */
  async logMaintenanceEvent(
    event: string,
    details: {
      type: 'backup' | 'cleanup' | 'update' | 'restart';
      status: 'started' | 'completed' | 'failed';
      duration?: number;
      affected?: string[];
    }
  ): Promise<void> {
    const level = details.status === 'failed' ? 'error' : 'info';
    await this.log(level, `Maintenance event: ${event}`, {
      operation: 'maintenance',
      metadata: {
        event,
        ...details,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Log custom event
   * 记录自定义事件
   */
  async logCustomEvent(
    category: string,
    event: string,
    details: Record<string, any>,
    level: SystemLog['level'] = 'info'
  ): Promise<void> {
    await this.log(level, `${category}: ${event}`, {
      operation: 'custom',
      metadata: {
        category,
        event,
        ...details,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Log to console
   * 记录到控制台
   */
  private logToConsole(logEntry: SystemLog): void {
    const timestamp = new Date(logEntry.timestamp).toISOString();
    const level = logEntry.level.toUpperCase();
    const context = [
      logEntry.provider && `[${logEntry.provider}]`,
      logEntry.operation && `[${logEntry.operation}]`,
      logEntry.requestId && `[${logEntry.requestId}]`
    ].filter(Boolean).join(' ');

    const message = context ? `${context} ${logEntry.message}` : logEntry.message;

    switch (logEntry.level) {
      case 'debug':
        console.debug(`[${timestamp}] [DEBUG] ${message}`);
        break;
      case 'info':
        console.info(`[${timestamp}] [INFO] ${message}`);
        break;
      case 'warn':
        console.warn(`[${timestamp}] [WARN] ${message}`);
        break;
      case 'error':
        console.error(`[${timestamp}] [ERROR] ${message}`);
        break;
    }

    // Log metadata if present
    if (logEntry.metadata && Object.keys(logEntry.metadata).length > 0) {
      console.log('Metadata:', logEntry.metadata);
    }
  }

  /**
   * Check if should log based on configured level
   * 根据配置的级别检查是否应该记录
   */
  private shouldLog(level: SystemLog['level']): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };
    return levels[level] >= levels[this.config.logLevel];
  }

  /**
   * Truncate message if too long
   * 如果消息过长则截断
   */
  private truncateMessage(message: string): string {
    const maxLength = 1000; // Max message length
    if (message.length <= maxLength) {
      return message;
    }

    return message.substring(0, maxLength) + '... [TRUNCATED]';
  }

  /**
   * Get log statistics
   * 获取日志统计
   */
  async getLogStatistics(timeRange?: {
    start: number;
    end: number;
  }): Promise<{
    totalLogs: number;
    logLevels: { [level in SystemLog['level']]?: number };
    providers: { [provider: string]: number };
    operations: { [operation: string]: number };
    timeRange?: { start: number; end: number };
  }> {
    const logFiles = await this.fileManager.getLogFiles(this.config.paths.system);
    const allLogs: SystemLog[] = [];

    for (const file of logFiles) {
      const logs = await this.fileManager.readLogFile(file);
      allLogs.push(...logs as SystemLog[]);
    }

    // Filter by time range if specified
    const filteredLogs = timeRange
      ? allLogs.filter(log => log.timestamp >= timeRange.start && log.timestamp <= timeRange.end)
      : allLogs;

    const statistics = {
      totalLogs: filteredLogs.length,
      logLevels: {} as { [level in SystemLog['level']]: number },
      providers: {} as { [provider: string]: number },
      operations: {} as { [operation: string]: number },
      timeRange
    };

    filteredLogs.forEach(log => {
      // Count log levels
      statistics.logLevels[log.level] = (statistics.logLevels[log.level] || 0) + 1;

      // Count providers
      if (log.provider) {
        statistics.providers[log.provider] = (statistics.providers[log.provider] || 0) + 1;
      }

      // Count operations
      if (log.operation) {
        statistics.operations[log.operation] = (statistics.operations[log.operation] || 0) + 1;
      }
    });

    return statistics;
  }

  /**
   * Search logs
   * 搜索日志
   */
  async searchLogs(
    query: {
      level?: SystemLog['level'];
      provider?: string;
      operation?: string;
      requestId?: string;
      messagePattern?: string;
      timeRange?: { start: number; end: number };
    }
  ): Promise<SystemLog[]> {
    const logFiles = await this.fileManager.getLogFiles(this.config.paths.system);
    const allLogs: SystemLog[] = [];

    for (const file of logFiles) {
      const logs = await this.fileManager.readLogFile(file);
      allLogs.push(...logs as SystemLog[]);
    }

    return allLogs.filter(log => {
      // Filter by level
      if (query.level && log.level !== query.level) return false;

      // Filter by provider
      if (query.provider && log.provider !== query.provider) return false;

      // Filter by operation
      if (query.operation && log.operation !== query.operation) return false;

      // Filter by request ID
      if (query.requestId && log.requestId !== query.requestId) return false;

      // Filter by time range
      if (query.timeRange) {
        if (log.timestamp < query.timeRange.start || log.timestamp > query.timeRange.end) {
          return false;
        }
      }

      // Filter by message pattern
      if (query.messagePattern && !log.message.includes(query.messagePattern)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Enable/disable console output
   * 启用/禁用控制台输出
   */
  setConsoleOutput(enabled: boolean): void {
    this.consoleOutputEnabled = enabled;
  }

  /**
   * Check if console output is enabled
   * 检查控制台输出是否启用
   */
  isConsoleOutputEnabled(): boolean {
    return this.consoleOutputEnabled;
  }
}