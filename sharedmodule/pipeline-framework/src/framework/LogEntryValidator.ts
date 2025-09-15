/**
 * Log Entry Validator - Validate Log Entry Objects
 * 日志条目验证器 - 验证日志条目对象
 */

import {
  RequestResponseLog,
  ErrorLog,
  SystemLog,
  PerformanceMetrics,
  LogEntry
} from '../types/debug-types';
import { ILogEntryValidator } from '../interfaces/ILogEntries';

/**
 * Log Entry Validator Implementation
 * 日志条目验证器实现
 */
export class LogEntryValidator implements ILogEntryValidator {
  /**
   * Validate request-response log entry
   * 验证请求-响应日志条目
   */
  validateRequestResponseLog(entry: RequestResponseLog): boolean {
    const errors = this.getValidationErrors(entry);
    return errors.length === 0;
  }

  /**
   * Validate error log entry
   * 验证错误日志条目
   */
  validateErrorLog(entry: ErrorLog): boolean {
    const errors = this.getValidationErrors(entry);
    return errors.length === 0;
  }

  /**
   * Validate system log entry
   * 验证系统日志条目
   */
  validateSystemLog(entry: SystemLog): boolean {
    const errors = this.getValidationErrors(entry);
    return errors.length === 0;
  }

  /**
   * Validate performance metrics
   * 验证性能指标
   */
  validatePerformanceMetrics(metrics: PerformanceMetrics): boolean {
    const errors = this.getValidationErrors(metrics);
    return errors.length === 0;
  }

  /**
   * Validate log entry
   * 验证日志条目
   */
  validateLogEntry(entry: LogEntry): boolean {
    const errors = this.getValidationErrors(entry);
    return errors.length === 0;
  }

  /**
   * Get validation errors
   * 获取验证错误
   */
  getValidationErrors(entry: LogEntry): string[] {
    const errors: string[] = [];

    if (!entry || typeof entry !== 'object') {
      errors.push('Entry must be an object');
      return errors;
    }

    // Common validations for all log entries
    if (this.hasProperty(entry, 'timestamp')) {
      const timestamp = (entry as any).timestamp;
      if (!this.isValidTimestamp(timestamp)) {
        errors.push('Invalid timestamp: must be a valid number');
      }
    }

    // Type-specific validations
    if (this.isRequestResponseLog(entry)) {
      errors.push(...this.validateRequestResponseLogEntry(entry as RequestResponseLog));
    } else if (this.isErrorLog(entry)) {
      errors.push(...this.validateErrorLogEntry(entry as ErrorLog));
    } else if (this.isSystemLog(entry)) {
      errors.push(...this.validateSystemLogEntry(entry as SystemLog));
    } else if (this.isPerformanceMetrics(entry)) {
      errors.push(...this.validatePerformanceMetricsEntry(entry as PerformanceMetrics));
    } else {
      errors.push('Unknown log entry type');
    }

    return errors;
  }

  /**
   * Validate request-response log entry details
   * 验证请求-响应日志条目详情
   */
  private validateRequestResponseLogEntry(entry: RequestResponseLog): string[] {
    const errors: string[] = [];

    // Required fields
    if (!this.isValidNonEmptyString(entry.requestId)) {
      errors.push('Request ID is required and must be a non-empty string');
    }

    if (!this.isValidNonEmptyString(entry.pipelineId)) {
      errors.push('Pipeline ID is required and must be a non-empty string');
    }

    if (!this.isValidNonEmptyString(entry.provider)) {
      errors.push('Provider is required and must be a non-empty string');
    }

    if (!this.isValidNonEmptyString(entry.operation)) {
      errors.push('Operation is required and must be a non-empty string');
    }

    // Request validation
    if (!entry.request || typeof entry.request !== 'object') {
      errors.push('Request must be an object');
    } else {
      if (entry.request.body && typeof entry.request.body !== 'object') {
        errors.push('Request body must be an object');
      }
    }

    // Response validation
    if (!entry.response || typeof entry.response !== 'object') {
      errors.push('Response must be an object');
    } else {
      if (typeof entry.response.status !== 'number' || entry.response.status < 100 || entry.response.status > 599) {
        errors.push('Response status must be a valid HTTP status code (100-599)');
      }
      if (entry.response.body && typeof entry.response.body !== 'object') {
        errors.push('Response body must be an object');
      }
    }

    // Duration validation
    if (typeof entry.duration !== 'number' || entry.duration < 0) {
      errors.push('Duration must be a non-negative number');
    }

    // Success validation
    if (typeof entry.success !== 'boolean') {
      errors.push('Success must be a boolean');
    }

    // Stages validation
    if (!Array.isArray(entry.stages)) {
      errors.push('Stages must be an array');
    } else {
      entry.stages.forEach((stage, index) => {
        const stageErrors = this.validatePipelineStage(stage, `stages[${index}]`);
        errors.push(...stageErrors);
      });
    }

    return errors;
  }

  /**
   * Validate error log entry details
   * 验证错误日志条目详情
   */
  private validateErrorLogEntry(entry: ErrorLog): string[] {
    const errors: string[] = [];

    // Required fields
    if (!this.isValidNonEmptyString(entry.requestId)) {
      errors.push('Request ID is required and must be a non-empty string');
    }

    if (!this.isValidNonEmptyString(entry.pipelineId)) {
      errors.push('Pipeline ID is required and must be a non-empty string');
    }

    if (!this.isValidNonEmptyString(entry.provider)) {
      errors.push('Provider is required and must be a non-empty string');
    }

    if (!this.isValidNonEmptyString(entry.operation)) {
      errors.push('Operation is required and must be a non-empty string');
    }

    // Error validation
    if (!entry.error || typeof entry.error !== 'object') {
      errors.push('Error must be an object');
    } else {
      if (!this.isValidNonEmptyString(entry.error.message)) {
        errors.push('Error message is required and must be a non-empty string');
      }
      if (!this.isValidNonEmptyString(entry.error.type)) {
        errors.push('Error type is required and must be a non-empty string');
      }
      if (entry.error.stack && typeof entry.error.stack !== 'string') {
        errors.push('Error stack must be a string');
      }
    }

    // Request validation
    if (!entry.request || typeof entry.request !== 'object') {
      errors.push('Request must be an object');
    }

    // Failed stage validation
    if (entry.failedStage && !this.isValidNonEmptyString(entry.failedStage)) {
      errors.push('Failed stage must be a non-empty string if provided');
    }

    // Stages validation
    if (!Array.isArray(entry.stages)) {
      errors.push('Stages must be an array');
    } else {
      entry.stages.forEach((stage, index) => {
        const stageErrors = this.validatePipelineStage(stage, `stages[${index}]`);
        errors.push(...stageErrors);
      });
    }

    // Debug info validation
    if (entry.debugInfo && typeof entry.debugInfo !== 'object') {
      errors.push('Debug info must be an object if provided');
    }

    return errors;
  }

  /**
   * Validate system log entry details
   * 验证系统日志条目详情
   */
  private validateSystemLogEntry(entry: SystemLog): string[] {
    const errors: string[] = [];

    // Required fields
    if (!entry.level || !['debug', 'info', 'warn', 'error'].includes(entry.level)) {
      errors.push('Level is required and must be one of: debug, info, warn, error');
    }

    if (!this.isValidNonEmptyString(entry.message)) {
      errors.push('Message is required and must be a non-empty string');
    }

    // Optional fields validation
    if (entry.requestId && !this.isValidNonEmptyString(entry.requestId)) {
      errors.push('Request ID must be a non-empty string if provided');
    }

    if (entry.provider && !this.isValidNonEmptyString(entry.provider)) {
      errors.push('Provider must be a non-empty string if provided');
    }

    if (entry.operation && !this.isValidNonEmptyString(entry.operation)) {
      errors.push('Operation must be a non-empty string if provided');
    }

    if (entry.metadata && typeof entry.metadata !== 'object') {
      errors.push('Metadata must be an object if provided');
    }

    return errors;
  }

  /**
   * Validate performance metrics entry details
   * 验证性能指标条目详情
   */
  private validatePerformanceMetricsEntry(entry: PerformanceMetrics): string[] {
    const errors: string[] = [];

    // Required fields
    if (!this.isValidNonEmptyString(entry.requestId)) {
      errors.push('Request ID is required and must be a non-empty string');
    }

    if (!this.isValidNonEmptyString(entry.pipelineId)) {
      errors.push('Pipeline ID is required and must be a non-empty string');
    }

    if (!this.isValidNonEmptyString(entry.provider)) {
      errors.push('Provider is required and must be a non-empty string');
    }

    if (!this.isValidNonEmptyString(entry.operation)) {
      errors.push('Operation is required and must be a non-empty string');
    }

    // Duration validation
    if (typeof entry.totalDuration !== 'number' || entry.totalDuration < 0) {
      errors.push('Total duration must be a non-negative number');
    }

    // Optional durations validation
    if (entry.validationDuration !== undefined && (typeof entry.validationDuration !== 'number' || entry.validationDuration < 0)) {
      errors.push('Validation duration must be a non-negative number if provided');
    }

    if (entry.mappingDuration !== undefined && (typeof entry.mappingDuration !== 'number' || entry.mappingDuration < 0)) {
      errors.push('Mapping duration must be a non-negative number if provided');
    }

    if (entry.executionDuration !== undefined && (typeof entry.executionDuration !== 'number' || entry.executionDuration < 0)) {
      errors.push('Execution duration must be a non-negative number if provided');
    }

    if (entry.responseDuration !== undefined && (typeof entry.responseDuration !== 'number' || entry.responseDuration < 0)) {
      errors.push('Response duration must be a non-negative number if provided');
    }

    // Success validation
    if (typeof entry.success !== 'boolean') {
      errors.push('Success must be a boolean');
    }

    // Error validation
    if (entry.error && !this.isValidNonEmptyString(entry.error)) {
      errors.push('Error must be a non-empty string if provided');
    }

    // Memory usage validation
    if (entry.memoryUsage) {
      const memoryErrors = this.validateMemoryUsage(entry.memoryUsage);
      errors.push(...memoryErrors);
    }

    // Stage performance validation
    if (!entry.stagePerformance || typeof entry.stagePerformance !== 'object') {
      errors.push('Stage performance must be an object');
    } else {
      Object.entries(entry.stagePerformance).forEach(([stageName, performance]) => {
        const stageErrors = this.validateStagePerformance(performance, `stagePerformance.${stageName}`);
        errors.push(...stageErrors);
      });
    }

    return errors;
  }

  /**
   * Validate pipeline stage
   * 验证流水线阶段
   */
  private validatePipelineStage(stage: any, path: string): string[] {
    const errors: string[] = [];

    if (!stage || typeof stage !== 'object') {
      errors.push(`${path} must be an object`);
      return errors;
    }

    if (!this.isValidNonEmptyString(stage.stage)) {
      errors.push(`${path}.stage is required and must be a non-empty string`);
    }

    if (typeof stage.startTime !== 'number' || stage.startTime < 0) {
      errors.push(`${path}.startTime must be a non-negative number`);
    }

    if (stage.endTime !== undefined && (typeof stage.endTime !== 'number' || stage.endTime < 0)) {
      errors.push(`${path}.endTime must be a non-negative number if provided`);
    }

    if (stage.duration !== undefined && (typeof stage.duration !== 'number' || stage.duration < 0)) {
      errors.push(`${path}.duration must be a non-negative number if provided`);
    }

    if (!stage.status || !['pending', 'running', 'completed', 'failed'].includes(stage.status)) {
      errors.push(`${path}.status is required and must be one of: pending, running, completed, failed`);
    }

    if (stage.error && !this.isValidNonEmptyString(stage.error)) {
      errors.push(`${path}.error must be a non-empty string if provided`);
    }

    return errors;
  }

  /**
   * Validate memory usage
   * 验证内存使用情况
   */
  private validateMemoryUsage(memoryUsage: any): string[] {
    const errors: string[] = [];

    if (!memoryUsage || typeof memoryUsage !== 'object') {
      errors.push('Memory usage must be an object');
      return errors;
    }

    const requiredFields = ['rss', 'heapTotal', 'heapUsed', 'external'];
    for (const field of requiredFields) {
      if (typeof memoryUsage[field] !== 'number' || memoryUsage[field] < 0) {
        errors.push(`Memory usage.${field} must be a non-negative number`);
      }
    }

    return errors;
  }

  /**
   * Validate stage performance
   * 验证阶段性能
   */
  private validateStagePerformance(performance: any, path: string): string[] {
    const errors: string[] = [];

    if (!performance || typeof performance !== 'object') {
      errors.push(`${path} must be an object`);
      return errors;
    }

    if (typeof performance.duration !== 'number' || performance.duration < 0) {
      errors.push(`${path}.duration must be a non-negative number`);
    }

    if (typeof performance.success !== 'boolean') {
      errors.push(`${path}.success must be a boolean`);
    }

    if (performance.error && !this.isValidNonEmptyString(performance.error)) {
      errors.push(`${path}.error must be a non-empty string if provided`);
    }

    return errors;
  }

  /**
   * Type guards
   */
  private isRequestResponseLog(entry: LogEntry): entry is RequestResponseLog {
    return this.hasProperty(entry, 'request') && this.hasProperty(entry, 'response') && this.hasProperty(entry, 'success');
  }

  private isErrorLog(entry: LogEntry): entry is ErrorLog {
    return this.hasProperty(entry, 'error') && this.hasProperty(entry, 'failedStage');
  }

  private isSystemLog(entry: LogEntry): entry is SystemLog {
    return this.hasProperty(entry, 'level') && this.hasProperty(entry, 'message');
  }

  private isPerformanceMetrics(entry: LogEntry): entry is PerformanceMetrics {
    return this.hasProperty(entry, 'totalDuration') && this.hasProperty(entry, 'stagePerformance');
  }

  /**
   * Utility methods
   */
  private hasProperty(obj: any, prop: string): boolean {
    return obj && typeof obj === 'object' && prop in obj;
  }

  private isValidNonEmptyString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isValidTimestamp(value: any): boolean {
    return typeof value === 'number' && value > 0 && value <= Date.now() + 86400000; // Allow timestamps 1 day in future
  }

  /**
   * Validate configuration
   * 验证配置
   */
  validateConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object');
      return errors;
    }

    if (typeof config.enabled !== 'boolean') {
      errors.push('Configuration.enabled must be a boolean');
    }

    if (!this.isValidNonEmptyString(config.baseDirectory)) {
      errors.push('Configuration.baseDirectory is required and must be a non-empty string');
    }

    if (!config.paths || typeof config.paths !== 'object') {
      errors.push('Configuration.paths is required and must be an object');
    } else {
      const requiredPaths = ['requests', 'responses', 'errors', 'pipeline', 'system'];
      for (const path of requiredPaths) {
        if (!this.isValidNonEmptyString(config.paths[path])) {
          errors.push(`Configuration.paths.${path} is required and must be a non-empty string`);
        }
      }
    }

    if (!config.logLevel || !['debug', 'info', 'warn', 'error', 'silent'].includes(config.logLevel)) {
      errors.push('Configuration.logLevel is required and must be one of: debug, info, warn, error, silent');
    }

    return errors;
  }

  /**
   * Sanitize and validate log entry
   * 清理和验证日志条目
   */
  sanitizeAndValidate(entry: LogEntry): { isValid: boolean; sanitizedEntry: LogEntry; errors: string[] } {
    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(entry));
    const errors = this.getValidationErrors(sanitized);

    // Basic sanitization
    if (this.hasProperty(sanitized, 'timestamp') && !this.isValidTimestamp(sanitized.timestamp)) {
      sanitized.timestamp = Date.now();
    }

    // Truncate long strings
    const truncateStrings = (obj: any) => {
      if (typeof obj === 'string' && obj.length > 10000) {
        return obj.substring(0, 10000) + '... [TRUNCATED]';
      } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          obj[key] = truncateStrings(obj[key]);
        }
      }
      return obj;
    };

    const truncatedEntry = truncateStrings(sanitized);

    return {
      isValid: errors.length === 0,
      sanitizedEntry: truncatedEntry,
      errors
    };
  }
}