import {
  CycleRecordingConfig,
  CycleRecord,
  CycleHandle,
  CycleInfo,
  FieldTruncationConfig
} from '../interfaces/Recording';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

/**
 * Circular recording component that manages request-response cycle recording
 */
export class CycleRecorder {
  private config: CycleRecordingConfig;
  private activeCycles: Map<string, CycleInfo> = new Map();
  private cycleRecords: Map<string, CycleRecord[]> = new Map();
  private truncationConfig: FieldTruncationConfig | null = null;

  constructor(config: CycleRecordingConfig, truncationConfig?: FieldTruncationConfig) {
    this.config = this.validateConfig(config);
    this.truncationConfig = truncationConfig || null;
  }

  // ========================================
  // Cycle Management
  // ========================================

  /**
   * Start a new recording cycle
   */
  async startCycle(operation: string, module: string, options: {
    requestId?: string;
    basePath?: string;
    customConfig?: Partial<CycleRecordingConfig>;
  } = {}): Promise<CycleHandle> {
    const cycleId = uuidv4();
    const startTime = Date.now();
    const basePath = options.basePath || this.resolveCycleBasePath(cycleId, options);

    const handle: CycleHandle = {
      cycleId,
      operation,
      startTime,
      module,
      basePath,
      format: options.customConfig?.format || this.config.format || 'json'
    };

    const cycleInfo: CycleInfo = {
      cycleId,
      operation,
      module,
      startTime,
      status: 'active',
      recordCount: 0,
      basePath,
      format: handle.format
    };

    this.activeCycles.set(cycleId, cycleInfo);
    this.cycleRecords.set(cycleId, []);

    // Create start record
    await this.recordCycleEvent(handle, {
      index: 0,
      type: 'start',
      module,
      operation,
      timestamp: startTime,
      cycleId,
      traceId: options.requestId,
      requestId: options.requestId
    });

    // Ensure directory exists
    await this.ensureDirectoryExists(basePath);

    return handle;
  }

  /**
   * Record a cycle event
   */
  async recordCycleEvent(handle: CycleHandle, event: Omit<CycleRecord, 'data' | 'result'> & {
    data?: any;
    result?: any;
  }): Promise<boolean> {
    if (!this.activeCycles.has(handle.cycleId)) {
      return false;
    }

    try {
      // Apply field truncation if enabled
      let processedEvent = { ...event };
      if (this.truncationConfig?.enabled) {
        processedEvent = this.truncateFields(processedEvent);
      }

      const record: CycleRecord = {
        ...processedEvent,
        data: processedEvent.data,
        result: processedEvent.result
      };

      // Add to memory cache
      const records = this.cycleRecords.get(handle.cycleId) || [];
      records.push(record);
      this.cycleRecords.set(handle.cycleId, records);

      // Update cycle info
      const cycleInfo = this.activeCycles.get(handle.cycleId)!;
      cycleInfo.recordCount++;

      // Write to file based on configuration
      await this.writeCycleRecord(handle, record);

      return true;
    } catch (error) {
      console.error(`[CycleRecorder] Failed to record cycle event:`, error);
      return false;
    }
  }

  /**
   * End a recording cycle
   */
  async endCycle(handle: CycleHandle, result?: any, error?: string): Promise<boolean> {
    if (!this.activeCycles.has(handle.cycleId)) {
      return false;
    }

    try {
      const cycleInfo = this.activeCycles.get(handle.cycleId)!;
      cycleInfo.endTime = Date.now();
      cycleInfo.status = error ? 'error' : 'completed';

      // Create end record
      await this.recordCycleEvent(handle, {
        index: -1,
        type: 'end',
        module: handle.module,
        operation: handle.operation,
        result,
        error,
        timestamp: Date.now(),
        cycleId: handle.cycleId
      });

      // Generate summary if enabled
      if (this.config.includeIndex) {
        await this.generateCycleSummary(handle);
      }

      // Clean up if auto-close is enabled
      if (this.config.autoCloseOnComplete) {
        await this.closeCycle(handle.cycleId);
      }

      return true;
    } catch (error) {
      console.error(`[CycleRecorder] Failed to end cycle:`, error);
      return false;
    }
  }

  /**
   * Get cycle information
   */
  getCycleInfo(cycleId: string): CycleInfo | undefined {
    return this.activeCycles.get(cycleId);
  }

  /**
   * Get all active cycles
   */
  getActiveCycles(): CycleInfo[] {
    return Array.from(this.activeCycles.values());
  }

  /**
   * Get cycle records
   */
  getCycleRecords(cycleId: string): CycleRecord[] {
    return this.cycleRecords.get(cycleId) || [];
  }

  /**
   * Close and clean up a cycle
   */
  async closeCycle(cycleId: string): Promise<boolean> {
    if (!this.activeCycles.has(cycleId)) {
      return false;
    }

    try {
      // Apply cleanup policies
      await this.applyCleanupPolicies(cycleId);

      this.activeCycles.delete(cycleId);
      this.cycleRecords.delete(cycleId);

      return true;
    } catch (error) {
      console.error(`[CycleRecorder] Failed to close cycle:`, error);
      return false;
    }
  }

  /**
   * Close all active cycles
   */
  async closeAllCycles(): Promise<void> {
    const cycleIds = Array.from(this.activeCycles.keys());

    for (const cycleId of cycleIds) {
      await this.closeCycle(cycleId);
    }
  }

  // ========================================
  // Statistics and Reporting
  // ========================================

  /**
   * Get cycle statistics
   */
  getCycleStatistics(cycleId: string): {
    totalRecords: number;
    duration: number;
    averageRecordInterval: number;
    recordTypes: Record<string, number>;
    errorCount: number;
  } | null {
    const records = this.cycleRecords.get(cycleId);
    const info = this.activeCycles.get(cycleId);

    if (!records || !info) {
      return null;
    }

    const totalRecords = records.length;
    const duration = info.endTime ? info.endTime - info.startTime : Date.now() - info.startTime;
    const averageRecordInterval = totalRecords > 1 ? duration / (totalRecords - 1) : 0;

    const recordTypes = records.reduce((acc, record) => {
      acc[record.type] = (acc[record.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorCount = records.filter(record => record.error).length;

    return {
      totalRecords,
      duration,
      averageRecordInterval,
      recordTypes,
      errorCount
    };
  }

  /**
   * Get all cycle statistics
   */
  getAllCycleStatistics(): Record<string, {
    totalRecords: number;
    duration: number;
    averageRecordInterval: number;
    recordTypes: Record<string, number>;
    errorCount: number;
  }> {
    const result: Record<string, any> = {};

    for (const cycleId of this.activeCycles.keys()) {
      const stats = this.getCycleStatistics(cycleId);
      if (stats) {
        result[cycleId] = stats;
      }
    }

    return result;
  }

  // ========================================
  // Configuration Management
  // ========================================

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CycleRecordingConfig>): void {
    this.config = this.validateConfig({ ...this.config, ...newConfig });
  }

  /**
   * Update truncation configuration
   */
  updateTruncationConfig(truncationConfig: FieldTruncationConfig | null): void {
    this.truncationConfig = truncationConfig;
  }

  /**
   * Get current configuration
   */
  getConfig(): CycleRecordingConfig {
    return { ...this.config };
  }

  // ========================================
  // Helper Methods
  // ========================================

  private validateConfig(config: CycleRecordingConfig): CycleRecordingConfig {
    return {
      enabled: config.enabled ?? false,
      mode: config.mode || 'single',
      basePath: config.basePath || './cycle-logs',
      cycleDirTemplate: config.cycleDirTemplate || 'cycles/${cycleId}',
      mainFileTemplate: config.mainFileTemplate || 'main.${format}',
      summaryFileTemplate: config.summaryFileTemplate || 'summary.json',
      format: config.format || 'json',
      includeIndex: config.includeIndex ?? true,
      includeTimestamp: config.includeTimestamp ?? true,
      autoCreateDirectory: config.autoCreateDirectory ?? true,
      autoCloseOnComplete: config.autoCloseOnComplete ?? true,
      maxCyclesRetained: config.maxCyclesRetained || 100
    };
  }

  private resolveCycleBasePath(cycleId: string, options: {
    requestId?: string;
    customConfig?: Partial<CycleRecordingConfig>;
  } = {}): string {
    const template = options.customConfig?.cycleDirTemplate || this.config.cycleDirTemplate || '';
    const variables = {
      cycleId,
      requestId: options.requestId || '',
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

  private async ensureDirectoryExists(path: string): Promise<void> {
    if (this.config.autoCreateDirectory) {
      try {
        await fs.mkdir(dirname(path), { recursive: true });
      } catch (error) {
        // Directory already exists or permission error
        console.warn(`[CycleRecorder] Failed to create directory ${dirname(path)}:`, error);
      }
    }
  }

  private async writeCycleRecord(handle: CycleHandle, record: CycleRecord): Promise<void> {
    const filePath = this.resolveRecordFilePath(handle, record);
    const content = this.formatRecordContent(record, handle.format);

    try {
      if (handle.format === 'jsonl') {
        await fs.appendFile(filePath, content + '\n');
      } else {
        await fs.appendFile(filePath, content + ',\n');
      }
    } catch (error) {
      console.error(`[CycleRecorder] Failed to write record to ${filePath}:`, error);
      throw error;
    }
  }

  private resolveRecordFilePath(handle: CycleHandle, record: CycleRecord): string {
    const template = this.config.mainFileTemplate || '';
    const variables = {
      cycleId: handle.cycleId,
      format: handle.format,
      type: record.type,
      index: record.index,
      timestamp: record.timestamp,
      date: new Date(record.timestamp).toISOString().split('T')[0]
    };

    const fileName = this.resolvePathTemplate(template, variables);
    return join(handle.basePath, fileName);
  }

  private formatRecordContent(record: CycleRecord, format: string): string {
    const content = {
      index: record.index,
      type: record.type,
      module: record.module,
      operation: record.operation,
      phase: record.phase,
      data: record.data,
      result: record.result,
      error: record.error,
      timestamp: this.config.includeTimestamp ? record.timestamp : undefined,
      cycleId: record.cycleId,
      traceId: record.traceId,
      requestId: record.requestId
    };

    // Remove undefined values
    Object.keys(content).forEach(key => {
      if (content[key as keyof typeof content] === undefined) {
        delete content[key as keyof typeof content];
      }
    });

    return JSON.stringify(content);
  }

  private async generateCycleSummary(handle: CycleHandle): Promise<void> {
    const records = this.cycleRecords.get(handle.cycleId) || [];
    const stats = this.getCycleStatistics(handle.cycleId);

    if (!stats) return;

    const summary = {
      cycleId: handle.cycleId,
      operation: handle.operation,
      module: handle.module,
      startTime: handle.startTime,
      endTime: Date.now(),
      duration: stats.duration,
      status: this.activeCycles.get(handle.cycleId)?.status || 'completed',
      totalRecords: stats.totalRecords,
      averageRecordInterval: stats.averageRecordInterval,
      recordTypes: stats.recordTypes,
      errorCount: stats.errorCount,
      config: this.config
    };

    const summaryPath = join(handle.basePath, this.config.summaryFileTemplate || '');
    const resolvedPath = this.resolvePathTemplate(summaryPath, {
      cycleId: handle.cycleId,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0]
    });

    try {
      await fs.writeFile(resolvedPath, JSON.stringify(summary, null, 2));
    } catch (error) {
      console.error(`[CycleRecorder] Failed to write cycle summary:`, error);
    }
  }

  private async applyCleanupPolicies(cycleId: string): Promise<void> {
    // TODO: Implement cleanup policies based on maxCyclesRetained
    // This would involve cleaning up old cycle directories
  }

  private truncateFields(data: any): any {
    if (!this.truncationConfig || !this.truncationConfig.enabled) {
      return data;
    }

    // TODO: Implement field truncation logic
    // This would recursively traverse the data object and apply truncation rules
    return data;
  }
}