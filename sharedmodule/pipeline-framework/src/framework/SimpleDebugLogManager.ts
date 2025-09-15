/**
 * Simple Debug Logging Implementation
 * 简单调试日志实现
 */

import { DebugConfig } from '../types/debug-types';

/**
 * Simple debug log manager for testing
 * 用于测试的简单调试日志管理器
 */
export class SimpleDebugLogManager {
  private config: DebugConfig;
  private logs: any[] = [];

  constructor(config: DebugConfig) {
    this.config = config;
  }

  startRequest(provider: string, operation: string, metadata?: any) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      requestId,
      pipelineId: `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider,
      operation,
      metadata,
      getRequestId: () => requestId,
      getPipelineId: () => requestId,
      getProvider: () => provider,
      getOperation: () => operation,
      getMetadata: () => metadata,
      getStartTime: () => Date.now(),
      getDuration: () => 0
    };
  }

  trackStage(requestId: string, stage: string): void {
    console.log(`[${requestId}] Starting stage: ${stage}`);
  }

  completeStage(requestId: string, stage: string, data?: any): void {
    console.log(`[${requestId}] Completed stage: ${stage}`);
  }

  async logSuccess(context: any, request: any, response: any): Promise<void> {
    const log = {
      type: 'success',
      requestId: context.getRequestId(),
      provider: context.getProvider(),
      operation: context.getOperation(),
      timestamp: Date.now(),
      request: this.sanitizeData(request),
      response: this.sanitizeData(response),
      duration: context.getDuration?.() || 0
    };

    this.logs.push(log);
    console.log(`[${context.getRequestId()}] Request completed successfully`);

    if (this.config.enabled) {
      await this.writeToDisk(log);
    }
  }

  async logError(context: any, error: any, request?: any, failedStage?: string, debugInfo?: any): Promise<void> {
    const log = {
      type: 'error',
      requestId: context.getRequestId(),
      provider: context.getProvider(),
      operation: context.getOperation(),
      timestamp: Date.now(),
      error: typeof error === 'string' ? error : error.message,
      request: this.sanitizeData(request),
      failedStage,
      debugInfo
    };

    this.logs.push(log);
    console.error(`[${context.getRequestId()}] Request failed:`, log.error);

    if (this.config.enabled) {
      await this.writeToDisk(log);
    }
  }

  async info(message: string, context?: any): Promise<void> {
    console.log(`[INFO] ${message}`, context);
  }

  async debug(message: string, context?: any): Promise<void> {
    if (this.config.logLevel === 'debug') {
      console.log(`[DEBUG] ${message}`, context);
    }
  }

  async warn(message: string, context?: any): Promise<void> {
    console.warn(`[WARN] ${message}`, context);
  }

  async error(message: string, context?: any): Promise<void> {
    console.error(`[ERROR] ${message}`, context);
  }

  getActiveRequests(): any[] {
    return [];
  }

  async getDebugStatistics() {
    return {
      systemHealth: { status: 'healthy' },
      errorStats: { totalErrors: 0 },
      systemLogStats: { totalLogs: this.logs.length },
      activeRequests: [],
      fileStats: { totalFiles: 0 }
    };
  }

  setLogLevel(level: string): void {
    this.config.logLevel = level as any;
  }

  getLogLevel(): string {
    return this.config.logLevel;
  }

  addSensitiveField(field: string): void {
    if (!this.config.contentFiltering.sensitiveFields.includes(field)) {
      this.config.contentFiltering.sensitiveFields.push(field);
    }
  }

  getSensitiveFields(): string[] {
    return [...this.config.contentFiltering.sensitiveFields];
  }

  async searchLogs(query: any): Promise<any[]> {
    return this.logs.filter(log => {
      if (query.level && log.type !== query.level) return false;
      if (query.provider && log.provider !== query.provider) return false;
      if (query.timeRange) {
        const time = log.timestamp;
        if (time < query.timeRange.start || time > query.timeRange.end) return false;
      }
      return true;
    });
  }

  async cleanup(): Promise<void> {
    this.logs = [];
  }

  async destroy(): Promise<void> {
    await this.cleanup();
  }

  private sanitizeData(data: any): any {
    if (!this.config.contentFiltering.enabled || !data) {
      return data;
    }

    const sanitized = JSON.parse(JSON.stringify(data));

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

  private async writeToDisk(log: any): Promise<void> {
    try {
      const fs = require('fs/promises');
      const path = require('path');

      // Ensure base directory exists
      await fs.mkdir(this.config.baseDirectory, { recursive: true });

      // Create specific log directories
      const logDir = path.join(this.config.baseDirectory, this.config.paths.system);
      await fs.mkdir(logDir, { recursive: true });

      const logFile = path.join(logDir, `debug-${Date.now()}-${Math.random().toString(36).substr(2, 6)}.json`);

      await fs.writeFile(logFile, JSON.stringify(log, null, 2));
      console.log(`📝 Log written to: ${logFile}`);
    } catch (error) {
      console.error('Failed to write log to disk:', error);
    }
  }
}