import {
  ErrorRecordingConfig,
  ErrorRecord,
  ErrorRecordData,
  ErrorFilters,
  ErrorStatistics,
  ErrorTrendPoint
} from '../interfaces/Recording';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

/**
 * Error recording component that manages error tracking and recovery
 */
export class ErrorRecorder {
  private config: ErrorRecordingConfig;
  private errorRecords: Map<string, ErrorRecord> = new Map();
  private errorIndex: Map<string, string[]> = new Map(); // date -> errorIds
  private recoveryTracking: Map<string, { attempts: number; lastAttempt: number }> = new Map();

  constructor(config: ErrorRecordingConfig) {
    this.config = this.validateConfig(config);
  }

  // ========================================
  // Error Recording
  // ========================================

  /**
   * Record an error
   */
  async recordError(errorData: ErrorRecordData): Promise<string> {
    const errorId = uuidv4();
    const timestamp = Date.now();

    const record: ErrorRecord = {
      errorId,
      cycleId: errorData.cycleId,
      module: errorData.context?.module || 'unknown',
      category: errorData.category || 'system',
      level: errorData.level || 'error',
      timestamp,
      message: typeof errorData.error === 'string' ? errorData.error : errorData.error.message,
      stack: typeof errorData.error === 'object' ? errorData.error.stack : undefined,
      context: errorData.context,
      operation: errorData.operation,
      recoverable: errorData.recoverable ?? true,
      resolved: false,
      filePath: this.resolveErrorFilePath(errorId, timestamp)
    };

    // Validate against configuration filters
    if (!this.shouldRecordError(record)) {
      return errorId;
    }

    this.errorRecords.set(errorId, record);

    // Update index
    this.updateErrorIndex(errorId, timestamp);

    // Write to file
    await this.writeErrorRecord(record);

    // Track recovery if enabled
    if (this.config.autoRecoveryTracking && record.recoverable) {
      this.trackRecovery(errorId);
    }

    // Check cleanup policies
    await this.applyCleanupPolicies();

    return errorId;
  }

  /**
   * Get error record by ID
   */
  getError(errorId: string): ErrorRecord | undefined {
    return this.errorRecords.get(errorId);
  }

  /**
   * Get errors with filters
   */
  getErrors(filters?: ErrorFilters): ErrorRecord[] {
    let errors = Array.from(this.errorRecords.values());

    if (filters) {
      errors = errors.filter(error => this.matchesFilters(error, filters));
    }

    return errors.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: string): ErrorRecord[] {
    return this.getErrors({ category: [category as any] });
  }

  /**
   * Get errors by level
   */
  getErrorsByLevel(level: string): ErrorRecord[] {
    return this.getErrors({ level: [level as any] });
  }

  /**
   * Get errors by module
   */
  getErrorsByModule(module: string): ErrorRecord[] {
    return this.getErrors({ module });
  }

  // ========================================
  // Error Resolution
  // ========================================

  /**
   * Mark error as resolved
   */
  async resolveError(errorId: string, resolution: string): Promise<boolean> {
    const record = this.errorRecords.get(errorId);
    if (!record) {
      return false;
    }

    record.resolved = true;
    record.resolution = resolution;

    // Update file
    await this.writeErrorRecord(record);

    // Remove from recovery tracking
    this.recoveryTracking.delete(errorId);

    return true;
  }

  /**
   * Mark error as unresolved
   */
  async unresolveError(errorId: string): Promise<boolean> {
    const record = this.errorRecords.get(errorId);
    if (!record) {
      return false;
    }

    record.resolved = false;
    record.resolution = undefined;

    // Update file
    await this.writeErrorRecord(record);

    // Add back to recovery tracking if recoverable
    if (record.recoverable) {
      this.trackRecovery(errorId);
    }

    return true;
  }

  /**
   * Get unresolved errors
   */
  getUnresolvedErrors(): ErrorRecord[] {
    return this.getErrors({ resolved: false });
  }

  /**
   * Get resolved errors
   */
  getResolvedErrors(): ErrorRecord[] {
    return this.getErrors({ resolved: true });
  }

  // ========================================
  // Recovery Tracking
  // ========================================

  /**
   * Track recovery attempt
   */
  trackRecoveryAttempt(errorId: string, success: boolean): void {
    const tracking = this.recoveryTracking.get(errorId);
    if (!tracking) {
      return;
    }

    tracking.attempts++;
    tracking.lastAttempt = Date.now();

    if (success) {
      // Auto-resolve on successful recovery
      this.resolveError(errorId, `Auto-resolved after ${tracking.attempts} recovery attempts`);
    }
  }

  /**
   * Get recovery tracking info
   */
  getRecoveryTracking(errorId: string): { attempts: number; lastAttempt: number } | undefined {
    return this.recoveryTracking.get(errorId);
  }

  /**
   * Get all errors needing recovery
   */
  getErrorsNeedingRecovery(): ErrorRecord[] {
    return this.getUnresolvedErrors().filter(error => error.recoverable);
  }

  // ========================================
  // Statistics and Analysis
  // ========================================

  /**
   * Get error statistics
   */
  getErrorStatistics(timeRange?: { start: number; end: number }): ErrorStatistics {
    let errors = Array.from(this.errorRecords.values());

    if (timeRange) {
      errors = errors.filter(error =>
        error.timestamp >= timeRange.start && error.timestamp <= timeRange.end
      );
    }

    const totalErrors = errors.length;
    const errorsByLevel = this.groupBy(errors, 'level');
    const errorsByCategory = this.groupBy(errors, 'category');
    const errorsByModule = this.groupBy(errors, 'module');
    const resolvedCount = errors.filter(error => error.resolved).length;
    const unresolvedCount = totalErrors - resolvedCount;
    const recoveryRate = totalErrors > 0 ? resolvedCount / totalErrors : 0;

    return {
      totalErrors,
      errorsByLevel,
      errorsByCategory,
      errorsByModule,
      resolvedCount,
      unresolvedCount,
      recoveryRate
    };
  }

  /**
   * Get error trend data
   */
  getErrorTrend(timeRange: { start: number; end: number }, intervalMs: number = 3600000): ErrorTrendPoint[] {
    const points: ErrorTrendPoint[] = [];
    const errors = Array.from(this.errorRecords.values()).filter(error =>
      error.timestamp >= timeRange.start && error.timestamp <= timeRange.end
    );

    for (let time = timeRange.start; time <= timeRange.end; time += intervalMs) {
      const intervalEnd = time + intervalMs;
      const intervalErrors = errors.filter(error =>
        error.timestamp >= time && error.timestamp < intervalEnd
      );

      const errorCount = intervalErrors.length;
      const resolvedCount = intervalErrors.filter(error => error.resolved).length;
      const errorRate = intervalErrors.length > 0 ? resolvedCount / intervalErrors.length : 0;

      points.push({
        timestamp: time,
        errorCount,
        resolvedCount,
        errorRate
      });
    }

    return points;
  }

  /**
   * Get error summary
   */
  getErrorSummary(): {
    totalErrors: number;
    unresolvedErrors: number;
    criticalErrors: number;
    recentErrors: ErrorRecord[];
    topErrorCategories: Array<{ category: string; count: number }>;
  } {
    const totalErrors = this.errorRecords.size;
    const unresolvedErrors = this.getUnresolvedErrors().length;
    const criticalErrors = this.getErrorsByLevel('fatal').length;
    const recentErrors = this.getErrors().slice(0, 10);

    const categoryCounts = this.groupBy(Array.from(this.errorRecords.values()), 'category');
    const topErrorCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors,
      unresolvedErrors,
      criticalErrors,
      recentErrors,
      topErrorCategories
    };
  }

  // ========================================
  // File Management
  // ========================================

  /**
   * Write error record to file
   */
  private async writeErrorRecord(record: ErrorRecord): Promise<void> {
    try {
      if (!record.filePath) {
        console.error(`[ErrorRecorder] Error record has no file path:`, record);
        return;
      }
      await fs.mkdir(dirname(record.filePath), { recursive: true });
      await fs.writeFile(record.filePath, JSON.stringify(record, null, 2));
    } catch (error) {
      console.error(`[ErrorRecorder] Failed to write error record:`, error);
    }
  }

  /**
   * Write error index to file
   */
  private async writeErrorIndex(): Promise<void> {
    if (!this.config.enableStatistics) {
      return;
    }

    try {
      const indexPath = this.resolveIndexPath();
      const indexData = Array.from(this.errorIndex.entries()).map(([date, errorIds]) => ({
        date,
        errorIds,
        count: errorIds.length
      }));

      await fs.mkdir(dirname(indexPath), { recursive: true });
      await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
    } catch (error) {
      console.error(`[ErrorRecorder] Failed to write error index:`, error);
    }
  }

  /**
   * Load error records from files
   */
  async loadErrorRecords(): Promise<void> {
    // TODO: Implement loading from persisted files
    // This would scan the error directory and load existing error records
  }

  /**
   * Cleanup old error records
   */
  private async applyCleanupPolicies(): Promise<void> {
    if (this.config.maxErrorsRetained === undefined) {
      return;
    }

    const errors = Array.from(this.errorRecords.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    if (errors.length > this.config.maxErrorsRetained) {
      const toRemove = errors.slice(this.config.maxErrorsRetained);

      for (const error of toRemove) {
        this.errorRecords.delete(error.errorId);
        this.recoveryTracking.delete(error.errorId);

        // Remove from file system
        try {
          if (error.filePath) {
            await fs.unlink(error.filePath);
          }
        } catch (err) {
          // File might not exist or permission error
          console.warn(`[ErrorRecorder] Failed to delete error file:`, err);
        }
      }
    }
  }

  // ========================================
  // Configuration Management
  // ========================================

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ErrorRecordingConfig>): void {
    this.config = this.validateConfig({ ...this.config, ...newConfig });
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorRecordingConfig {
    return { ...this.config };
  }

  // ========================================
  // Helper Methods
  // ========================================

  private validateConfig(config: ErrorRecordingConfig): ErrorRecordingConfig {
    return {
      enabled: config.enabled ?? false,
      levels: config.levels || ['error', 'fatal'],
      categories: config.categories || ['system', 'processing'],
      basePath: config.basePath || './error-logs',
      indexFileTemplate: config.indexFileTemplate || 'errors/index.jsonl',
      detailFileTemplate: config.detailFileTemplate || 'errors/${errorId}.json',
      summaryFileTemplate: config.summaryFileTemplate || 'errors/summary.json',
      dailyDirTemplate: config.dailyDirTemplate || 'errors/${date}',
      indexFormat: config.indexFormat || 'jsonl',
      detailFormat: config.detailFormat || 'json',
      autoRecoveryTracking: config.autoRecoveryTracking ?? true,
      maxErrorsRetained: config.maxErrorsRetained || 1000,
      enableStatistics: config.enableStatistics ?? true
    };
  }

  private shouldRecordError(record: ErrorRecord): boolean {
    // Check level filter
    if (this.config.levels && !this.config.levels.includes(record.level)) {
      return false;
    }

    // Check category filter
    if (this.config.categories && !this.config.categories.includes(record.category)) {
      return false;
    }

    return true;
  }

  private matchesFilters(error: ErrorRecord, filters: ErrorFilters): boolean {
    if (filters.level && !filters.level.includes(error.level)) {
      return false;
    }

    if (filters.category && !filters.category.includes(error.category)) {
      return false;
    }

    if (filters.module && error.module !== filters.module) {
      return false;
    }

    if (filters.resolved !== undefined && error.resolved !== filters.resolved) {
      return false;
    }

    if (filters.timeRange) {
      if (error.timestamp < filters.timeRange.start || error.timestamp > filters.timeRange.end) {
        return false;
      }
    }

    if (filters.operation && error.operation !== filters.operation) {
      return false;
    }

    return true;
  }

  private resolveErrorFilePath(errorId: string, timestamp: number): string {
    const template = this.config.detailFileTemplate || '';
    const variables = {
      errorId,
      timestamp,
      date: new Date(timestamp).toISOString().split('T')[0],
      time: new Date(timestamp).toISOString().split('T')[1].split('.')[0]
    };

    return this.resolvePathTemplate(template, variables);
  }

  private resolveIndexPath(): string {
    const template = this.config.indexFileTemplate || '';
    const variables = {
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString().split('T')[1].split('.')[0]
    };

    return this.resolvePathTemplate(template, variables);
  }

  private resolvePathTemplate(template: string, variables: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
    }

    return result;
  }

  private updateErrorIndex(errorId: string, timestamp: number): void {
    const date = new Date(timestamp).toISOString().split('T')[0];

    if (!this.errorIndex.has(date)) {
      this.errorIndex.set(date, []);
    }

    this.errorIndex.get(date)!.push(errorId);

    // Write updated index
    this.writeErrorIndex();
  }

  private trackRecovery(errorId: string): void {
    this.recoveryTracking.set(errorId, {
      attempts: 0,
      lastAttempt: Date.now()
    });
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      groups[groupKey] = (groups[groupKey] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }
}