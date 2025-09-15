/**
 * Debug Log Manager - Main Orchestration Class
 * 调试日志管理器 - 主要编排类
 */

import {
  DebugConfig,
  RequestContext,
  OperationType,
  SystemLog,
  PerformanceMetrics,
  DebugLogManagerOptions
} from '../types/debug-types';
import { PipelineTracker } from './PipelineTracker';
import { FileManager } from './FileManager';
import { ErrorLogger } from './ErrorLogger';
import { SystemLogger } from './SystemLogger';
import { ILogEntryFactory, ILogEntryValidator } from '../interfaces/ILogEntries';

/**
 * Debug Log Manager Implementation
 * 调试日志管理器实现
 */
export class DebugLogManager {
  private config: DebugConfig;
  private options: DebugLogManagerOptions;
  private pipelineTracker: PipelineTracker;
  private fileManager: FileManager;
  private errorLogger: ErrorLogger;
  private systemLogger: SystemLogger;
  private logEntryFactory: ILogEntryFactory;
  private logEntryValidator: ILogEntryValidator;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    config: DebugConfig,
    options: Omit<DebugLogManagerOptions, 'config'> = {},
    logEntryFactory: ILogEntryFactory,
    logEntryValidator: ILogEntryValidator
  ) {
    this.config = config;
    this.options = {
      config: config,
      autoCleanup: false,
      cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
      enableConsoleOutput: false,
      ...options
    };

    // Initialize components
    this.fileManager = new FileManager(config);
    this.pipelineTracker = new PipelineTracker(config);
    this.errorLogger = new ErrorLogger(config, this.fileManager, logEntryFactory);
    this.systemLogger = new SystemLogger(
      config,
      this.fileManager,
      logEntryFactory,
      this.options.enableConsoleOutput
    );

    this.logEntryFactory = logEntryFactory;
    this.logEntryValidator = logEntryValidator;

    // Start auto cleanup if enabled
    if (this.options.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Start request tracking
   * 开始请求跟踪
   */
  startRequest(
    provider: string,
    operation: OperationType,
    metadata?: Record<string, any>
  ): RequestContext {
    const context = this.pipelineTracker.createRequestContext(provider, operation, metadata);
    this.systemLogger.info(`Starting ${operation} request`, {
      requestId: context.requestId,
      provider,
      operation,
      metadata
    });
    return context;
  }

  /**
   * Track pipeline stage
   * 跟踪流水线阶段
   */
  trackStage(requestId: string, stage: string): void {
    this.pipelineTracker.addStage(requestId, stage);
    this.systemLogger.debug(`Starting stage: ${stage}`, { requestId });
  }

  /**
   * Complete pipeline stage
   * 完成流水线阶段
   */
  completeStage(requestId: string, stage: string, data?: any): void {
    this.pipelineTracker.completeStage(requestId, stage, data);
    this.systemLogger.debug(`Completed stage: ${stage}`, { requestId });
  }

  /**
   * Fail pipeline stage
   * 失败流水线阶段
   */
  failStage(requestId: string, stage: string, error: string): void {
    this.pipelineTracker.failStage(requestId, stage, error);
    this.systemLogger.warn(`Stage failed: ${stage}`, { requestId, error });
  }

  /**
   * Log successful request-response
   * 记录成功的请求-响应
   */
  async logSuccess(
    context: RequestContext,
    request: any,
    response: any
  ): Promise<void> {
    const completedContext = this.pipelineTracker.completeRequest(context.getRequestId());
    if (!completedContext) return;

    // Log request-response pair
    const logEntry = {
      requestId: context.getRequestId(),
      pipelineId: context.getPipelineId(),
      timestamp: context.getStartTime(),
      provider: context.getProvider(),
      operation: context.getOperation(),
      request: {
        body: this.sanitizeData(request),
        metadata: context.getMetadata()
      },
      response: {
        status: 200,
        body: this.sanitizeData(response),
        metadata: { success: true }
      },
      duration: (completedContext.getEndTime() || Date.now()) - context.getStartTime(),
      success: true,
      stages: completedContext.getStages()
    };

    await this.fileManager.writeToRequestLog(logEntry);
    await this.fileManager.writeToResponseLog(logEntry);
    await this.fileManager.writeToPipelineLog(logEntry);

    this.systemLogger.info(`Request completed successfully`, {
      requestId: context.getRequestId(),
      provider: context.getProvider(),
      operation: context.getOperation(),
      duration: logEntry.duration
    });

    // Log performance metrics if enabled
    if (this.config.performanceTracking.enabled) {
      await this.logPerformanceMetrics(context, logEntry);
    }
  }

  /**
   * Log error
   * 记录错误
   */
  async logError(
    context: RequestContext,
    error: Error | string,
    request?: any,
    failedStage?: string,
    debugInfo?: Record<string, any>
  ): Promise<void> {
    const completedContext = this.pipelineTracker.completeRequest(context.getRequestId());
    const finalContext = completedContext || context;

    await this.errorLogger.logError(finalContext, error, request, failedStage, debugInfo);

    this.systemLogger.error(`Request failed`, {
      requestId: finalContext.getRequestId(),
      provider: finalContext.getProvider(),
      operation: finalContext.getOperation(),
      error: typeof error === 'string' ? error : error.message
    });
  }

  /**
   * Log performance metrics
   * 记录性能指标
   */
  private async logPerformanceMetrics(
    context: RequestContext,
    logEntry: any
  ): Promise<void> {
    const metrics: PerformanceMetrics = {
      requestId: context.requestId,
      pipelineId: context.pipelineId,
      provider: context.provider,
      operation: context.operation,
      totalDuration: logEntry.duration,
      success: true,
      stagePerformance: {}
    };

    // Calculate stage performance
    logEntry.stages.forEach((stage: any) => {
      if (stage.duration) {
        metrics.stagePerformance[stage.stage] = {
          duration: stage.duration,
          success: stage.status === 'completed',
          error: stage.error
        };
      }
    });

    // Add memory usage if tracking enabled
    if (this.config.performanceTracking.trackMemoryUsage) {
      const memoryUsage = process.memoryUsage();
      metrics.memoryUsage = {
        start: memoryUsage.heapUsed,
        end: memoryUsage.heapUsed,
        peak: memoryUsage.heapTotal
      };
    }

    await this.fileManager.writePerformanceMetrics(metrics);
  }

  /**
   * Log system message
   * 记录系统消息
   */
  async logSystemMessage(
    level: SystemLog['level'],
    message: string,
    context?: SystemLog['metadata']
  ): Promise<void> {
    await this.systemLogger.log(level, message, context);
  }

  /**
   * Convenience methods
   * 便捷方法
   */
  async debug(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.systemLogger.debug(message, context);
  }

  async info(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.systemLogger.info(message, context);
  }

  async warn(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.systemLogger.warn(message, context);
  }

  async error(message: string, context?: SystemLog['metadata']): Promise<void> {
    await this.systemLogger.error(message, context);
  }

  /**
   * Get active request contexts
   * 获取活动请求上下文
   */
  getActiveRequests(): RequestContext[] {
    return this.pipelineTracker.getActiveRequests();
  }

  /**
   * Get request statistics
   * 获取请求统计
   */
  getRequestStatistics() {
    return this.pipelineTracker.getRequestStatistics();
  }

  /**
   * Get request context by ID
   * 根据ID获取请求上下文
   */
  getRequestContext(requestId: string): RequestContext | undefined {
    return this.pipelineTracker.getRequestContext(requestId);
  }

  /**
   * Update configuration
   * 更新配置
   */
  updateConfig(newConfig: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update file manager config
    this.fileManager = new FileManager(this.config);

    // Update other loggers
    this.errorLogger = new ErrorLogger(this.config, this.fileManager, this.logEntryFactory);
    this.systemLogger = new SystemLogger(
      this.config,
      this.fileManager,
      this.logEntryFactory,
      this.options.enableConsoleOutput
    );
  }

  /**
   * Get configuration
   * 获取配置
   */
  getConfig(): DebugConfig {
    return { ...this.config };
  }

  /**
   * Enable/disable debug logging
   * 启用/禁用调试日志
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if debug logging is enabled
   * 检查调试日志是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Set log level
   * 设置日志级别
   */
  setLogLevel(level: DebugConfig['logLevel']): void {
    this.config.logLevel = level;
  }

  /**
   * Get log level
   * 获取日志级别
   */
  getLogLevel(): DebugConfig['logLevel'] {
    return this.config.logLevel;
  }

  /**
   * Enable/disable console output
   * 启用/禁用控制台输出
   */
  setConsoleOutput(enabled: boolean): void {
    this.options.enableConsoleOutput = enabled;
    this.systemLogger.setConsoleOutput(enabled);
  }

  /**
   * Check if console output is enabled
   * 检查控制台输出是否启用
   */
  isConsoleOutputEnabled(): boolean {
    return this.options.enableConsoleOutput;
  }

  /**
   * Set base directory
   * 设置基础目录
   */
  setBaseDirectory(directory: string): void {
    this.config.baseDirectory = directory;
    this.fileManager = new FileManager(this.config);
  }

  /**
   * Get base directory
   * 获取基础目录
   */
  getBaseDirectory(): string {
    return this.config.baseDirectory;
  }

  /**
   * Add sensitive field to filter
   * 添加敏感字段进行过滤
   */
  addSensitiveField(field: string): void {
    if (!this.config.contentFiltering.sensitiveFields.includes(field)) {
      this.config.contentFiltering.sensitiveFields.push(field);
    }
  }

  /**
   * Remove sensitive field from filter
   * 从过滤中移除敏感字段
   */
  removeSensitiveField(field: string): void {
    this.config.contentFiltering.sensitiveFields =
      this.config.contentFiltering.sensitiveFields.filter(f => f !== field);
  }

  /**
   * Get sensitive fields
   * 获取敏感字段列表
   */
  getSensitiveFields(): string[] {
    return [...this.config.contentFiltering.sensitiveFields];
  }

  /**
   * Get error statistics
   * 获取错误统计
   */
  async getErrorStatistics(timeRange?: { start: number; end: number }) {
    return await this.errorLogger.getErrorStatistics(timeRange);
  }

  /**
   * Get system log statistics
   * 获取系统日志统计
   */
  async getSystemLogStatistics(timeRange?: { start: number; end: number }) {
    return await this.systemLogger.getLogStatistics(timeRange);
  }

  /**
   * Search logs
   * 搜索日志
   */
  async searchLogs(query: {
    level?: SystemLog['level'];
    provider?: string;
    operation?: string;
    requestId?: string;
    messagePattern?: string;
    timeRange?: { start: number; end: number };
  }) {
    return await this.systemLogger.searchLogs(query);
  }

  /**
   * Get file statistics
   * 获取文件统计
   */
  async getFileStatistics(subdirectory?: string) {
    return await this.fileManager.getFileStatistics(subdirectory);
  }

  /**
   * Get log files
   * 获取日志文件
   */
  async getLogFiles(subdirectory?: string) {
    return await this.fileManager.getLogFiles(subdirectory);
  }

  /**
   * Read log file
   * 读取日志文件
   */
  async readLogFile(filePath: string) {
    return await this.fileManager.readLogFile(filePath);
  }

  /**
   * Delete log file
   * 删除日志文件
   */
  async deleteLogFile(filePath: string) {
    return await this.fileManager.deleteLogFile(filePath);
  }

  /**
   * Start auto cleanup
   * 开始自动清理
   */
  private startAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        console.error('Auto cleanup failed:', error);
      }
    }, this.options.cleanupInterval);
  }

  /**
   * Stop auto cleanup
   * 停止自动清理
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Clean up old logs
   * 清理旧日志
   */
  async cleanup(): Promise<void> {
    await this.fileManager.cleanup();
  }

  /**
   * Archive old logs
   * 归档旧日志
   */
  async archiveOldLogs(): Promise<void> {
    await this.fileManager.archiveOldLogs();
  }

  /**
   * Get debug statistics
   * 获取调试统计
   */
  async getDebugStatistics(): Promise<{
    systemHealth: any;
    errorStats: any;
    systemLogStats: any;
    activeRequests: RequestContext[];
    fileStats: any;
  }> {
    const [systemHealth, errorStats, systemLogStats, activeRequests, fileStats] = await Promise.all([
      this.getSystemHealth(),
      this.getErrorStatistics(),
      this.getSystemLogStatistics(),
      this.getActiveRequests(),
      this.getFileStatistics()
    ]);

    return {
      systemHealth,
      errorStats,
      systemLogStats,
      activeRequests,
      fileStats
    };
  }

  /**
   * Get system health
   * 获取系统健康状态
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    details: {
      activeRequests: number;
      fileCount: number;
      totalFileSize: number;
      lastCleanup?: Date;
      errorRate: number;
    };
  }> {
    try {
      const activeRequests = this.getActiveRequests().length;
      const fileStats = await this.getFileStatistics();
      const errorStats = await this.getErrorStatistics();
      const errorRate = errorStats.totalErrors > 0
        ? errorStats.totalErrors / (errorStats.totalErrors + activeRequests)
        : 0;

      let status: 'healthy' | 'warning' | 'error' = 'healthy';

      if (errorRate > 0.1) { // More than 10% error rate
        status = 'error';
      } else if (errorRate > 0.05 || activeRequests > 1000) { // More than 5% error rate or too many active requests
        status = 'warning';
      }

      return {
        status,
        details: {
          activeRequests,
          fileCount: fileStats.totalFiles,
          totalFileSize: fileStats.totalSize,
          lastCleanup: fileStats.newestFile,
          errorRate
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          activeRequests: -1,
          fileCount: -1,
          totalFileSize: -1,
          errorRate: 1
        }
      };
    }
  }

  /**
   * Export logs
   * 导出日志
   */
  async exportLogs(options: {
    format?: 'json' | 'csv';
    timeRange?: { start: number; end: number };
    providers?: string[];
    operations?: string[];
    logLevels?: SystemLog['level'][];
  }): Promise<{
    data: any[];
    format: string;
    timestamp: number;
    size: number;
  }> {
    // Implementation for log export functionality
    // This would aggregate logs based on the provided options
    // and return them in the requested format

    const logs = await this.searchLogs({
      timeRange: options.timeRange,
      level: options.logLevels?.[0]
    });

    // Filter by providers and operations if specified
    const filteredLogs = logs.filter(log => {
      if (options.providers && !options.providers.includes(log.provider || '')) {
        return false;
      }
      if (options.operations && !options.operations.includes(log.operation || '')) {
        return false;
      }
      return true;
    });

    return {
      data: filteredLogs,
      format: options.format || 'json',
      timestamp: Date.now(),
      size: JSON.stringify(filteredLogs).length
    };
  }

  /**
   * Sanitize data
   * 清理数据
   */
  private sanitizeData(data: any): any {
    if (!this.config.contentFiltering.enabled) {
      return data;
    }

    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(data));

    // Recursively sanitize sensitive fields
    const sanitizeObject = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        if (this.config.contentFiltering.sensitiveFields.some(field =>
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Cleanup resources
   * 清理资源
   */
  async destroy(): Promise<void> {
    this.stopAutoCleanup();
    await this.fileManager.cleanup();
    await this.fileManager.closeAllStreams();
    this.pipelineTracker.clearAllRequests();
  }
}