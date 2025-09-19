import {
  BaseModuleRecordingConfig,
  GlobalRecordingConfig,
  RequestContext,
  CycleHandle,
  ErrorRecord,
  TruncationReport,
  ConfigUpdateResult,
  ConfigSyncResult,
  ConsistencyValidationResult,
  BaseModuleOptions,
  ModuleRecordingConfig
} from '../interfaces/Recording';
import { v4 as uuidv4 } from 'uuid';
import { DebugLevel } from '../interfaces/Debug';

/**
 * Core recording manager that coordinates all recording components
 */
export class RecordingManager {
  private config: BaseModuleRecordingConfig;
  private globalConfig: GlobalRecordingConfig | null = null;
  private activeRequests: Map<string, RequestContext> = new Map();
  private activeCycles: Map<string, CycleHandle> = new Map();
  private errorRecords: Map<string, ErrorRecord> = new Map();
  private configChangeCallbacks: Set<(config: BaseModuleRecordingConfig) => Promise<void> | void> = new Set();
  private truncationStats: Map<string, number> = new Map();

  constructor(config: BaseModuleRecordingConfig = {}) {
    this.config = this.validateConfig(config);
    this.initializeGlobalConfig();
  }

  // ========================================
  // Configuration Management
  // ========================================

  /**
   * Update recording configuration
   */
  async updateConfig(newConfig: Partial<BaseModuleRecordingConfig>, force = false): Promise<ConfigUpdateResult> {
    try {
      const oldConfig = { ...this.config };

      // Validate configuration before applying
      const validationError = this.validateConfiguration({ ...this.config, ...newConfig });
      if (validationError && !force) {
        return {
          success: false,
          errors: [validationError],
          requiresForce: true
        };
      }

      this.config = this.validateConfig({ ...this.config, ...newConfig });

      // Validate consistency
      const consistencyResult = this.validateConfigurationConsistency();
      if (!consistencyResult.valid && !force) {
        return {
          success: false,
          errors: consistencyResult.errors,
          requiresForce: true
        };
      }

      // Update global config if needed
      if (newConfig.globalConfig) {
        this.globalConfig = {
          ...this.globalConfig!,
          ...newConfig.globalConfig
        };
      }

      // Notify all callbacks
      await this.notifyConfigChange(this.config);

      return {
        success: true,
        configVersion: this.globalConfig?.configVersion
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Synchronize configuration across modules
   */
  async syncConfiguration(moduleConfigs: Record<string, BaseModuleRecordingConfig>): Promise<ConfigSyncResult> {
    const moduleResults: Record<string, boolean> = {};

    for (const [moduleId, config] of Object.entries(moduleConfigs)) {
      try {
        const result = await this.updateConfig(config, true);
        moduleResults[moduleId] = result.success;
      } catch (error) {
        moduleResults[moduleId] = false;
      }
    }

    return {
      success: Object.values(moduleResults).every(success => success),
      moduleResults
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): BaseModuleRecordingConfig {
    return { ...this.config };
  }

  /**
   * Get global configuration
   */
  getGlobalConfig(): GlobalRecordingConfig | null {
    return this.globalConfig ? { ...this.globalConfig } : null;
  }

  // ========================================
  // Request Context Management
  // ========================================

  /**
   * Create new request context
   */
  createRequestContext(options: {
    customConfig?: Partial<BaseModuleRecordingConfig>;
    inheritContext?: string;
    createNewContext?: boolean;
  } = {}): RequestContext {
    const requestId = options.inheritContext || uuidv4();
    const sessionId = this.globalConfig?.sessionId || uuidv4();
    const traceId = uuidv4();
    const chainId = options.inheritContext ? this.getRequestContext(options.inheritContext)?.chainId || uuidv4() : uuidv4();

    let context: RequestContext;

    if (options.inheritContext && this.activeRequests.has(options.inheritContext)) {
      // Inherit from existing context
      const existing = this.activeRequests.get(options.inheritContext)!;
      context = {
        ...existing,
        currentModule: this.extractModuleName(options.customConfig?.module) || 'unknown',
        moduleStack: [...existing.moduleStack, this.extractModuleName(options.customConfig?.module) || 'unknown']
      };
    } else {
      // Create new context
      const basePath = this.resolveBasePath(options.customConfig);
      context = {
        requestId,
        sessionId,
        traceId,
        chainId,
        startModule: this.extractModuleName(options.customConfig?.module) || 'unknown',
        startTime: Date.now(),
        basePath,
        currentPath: basePath,
        pathHistory: [],
        configSnapshot: this.createConfigSnapshot(options.customConfig),
        sharedData: new Map(),
        status: 'active',
        currentModule: this.extractModuleName(options.customConfig?.module) || 'unknown',
        moduleStack: [this.extractModuleName(options.customConfig?.module) || 'unknown']
      };
    }

    this.activeRequests.set(requestId, context);
    return context;
  }

  /**
   * Get request context
   */
  getRequestContext(requestId: string): RequestContext | undefined {
    return this.activeRequests.get(requestId);
  }

  /**
   * Update request context
   */
  updateRequestContext(requestId: string, updates: Partial<RequestContext>): boolean {
    const context = this.activeRequests.get(requestId);
    if (!context) return false;

    // Store original path for history tracking
    const originalPath = context.currentPath;

    // Apply updates
    Object.assign(context, updates);

    // Update path history if path changed
    if (updates.currentPath && updates.currentPath !== originalPath) {
      context.pathHistory.push({
        moduleId: updates.currentModule || context.currentModule,
        path: updates.currentPath,
        timestamp: Date.now()
      });
    }

    return true;
  }

  /**
   * Complete request context
   */
  completeRequestContext(requestId: string, status: 'completed' | 'error' = 'completed'): boolean {
    const context = this.activeRequests.get(requestId);
    if (!context) return false;

    context.status = status;
    context.moduleStack = context.moduleStack.filter(module => module !== context.currentModule);

    // Generate trace report
    const report = this.generateTraceReport(context);
    this.saveTraceReport(report);

    this.activeRequests.delete(requestId);
    return true;
  }

  // ========================================
  // Cycle Recording Management
  // ========================================

  /**
   * Start cycle recording
   */
  startCycleRecording(requestId: string, operation: string, module: string): CycleHandle | null {
    if (!this.config.cycle?.enabled) return null;

    const context = this.getRequestContext(requestId);
    if (!context) return null;

    const cycleId = uuidv4();
    const basePath = this.resolveCyclePath(context, cycleId);
    const format = this.config.cycle.format || 'json';

    const handle: CycleHandle = {
      cycleId,
      operation,
      startTime: Date.now(),
      module,
      basePath,
      format
    };

    this.activeCycles.set(cycleId, handle);

    // Create initial cycle record
    this.recordCycleEvent(handle, {
      index: 0,
      type: 'start',
      module,
      operation,
      timestamp: Date.now(),
      cycleId,
      traceId: context.traceId,
      requestId
    });

    return handle;
  }

  /**
   * Record cycle event
   */
  recordCycleEvent(handle: CycleHandle, event: {
    index: number;
    type: 'start' | 'middle' | 'end';
    module: string;
    operation?: string;
    phase?: string;
    data?: any;
    result?: any;
    error?: string;
    timestamp: number;
    cycleId: string;
    traceId?: string;
    requestId?: string;
  }): boolean {
    if (!this.config.cycle?.enabled) return false;

    try {
      // Apply field truncation if enabled
      let eventData = { ...event };
      if (this.config.truncation?.enabled) {
        eventData = this.truncateFields(eventData, 'cycle');
      }

      // Save to file based on format
      const filePath = this.resolveCycleFilePath(handle, event.type);
      this.writeCycleRecord(filePath, eventData, handle.format);

      return true;
    } catch (error) {
      this.logError('Failed to record cycle event', error);
      return false;
    }
  }

  /**
   * End cycle recording
   */
  endCycleRecording(handle: CycleHandle, result?: any, error?: string): boolean {
    if (!this.activeCycles.has(handle.cycleId)) return false;

    try {
      const context = handle.requestId ? this.getRequestContext(handle.requestId) : undefined;
      this.recordCycleEvent(handle, {
        index: -1,
        type: 'end',
        module: handle.module,
        operation: handle.operation,
        result,
        error,
        timestamp: Date.now(),
        cycleId: handle.cycleId,
        traceId: context?.traceId,
        requestId: handle.requestId
      });

      // Generate summary
      this.generateCycleSummary(handle);

      this.activeCycles.delete(handle.cycleId);
      return true;
    } catch (error) {
      this.logError('Failed to end cycle recording', error);
      return false;
    }
  }

  // ========================================
  // Error Recording Management
  // ========================================

  /**
   * Record error
   */
  recordError(errorData: {
    error: Error | string;
    level?: 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal';
    category?: 'network' | 'validation' | 'processing' | 'system' | 'security' | 'business';
    operation?: string;
    context?: Record<string, any>;
    recoverable?: boolean;
    cycleId?: string;
  }): string {
    if (!this.config.error?.enabled) return '';

    const errorId = uuidv4();
    const context = this.findRequestContext(errorData.cycleId);

    const record: ErrorRecord = {
      errorId,
      cycleId: errorData.cycleId,
      module: errorData.context?.module || 'unknown',
      category: errorData.category || 'system',
      level: errorData.level || 'error',
      timestamp: Date.now(),
      message: typeof errorData.error === 'string' ? errorData.error : errorData.error.message,
      stack: typeof errorData.error === 'object' ? errorData.error.stack : undefined,
      context: errorData.context,
      operation: errorData.operation,
      recoverable: errorData.recoverable ?? true,
      resolved: false,
      filePath: this.resolveErrorPath(errorId)
    };

    this.errorRecords.set(errorId, record);
    this.writeErrorRecord(record);

    return errorId;
  }

  /**
   * Get error records
   */
  getErrorRecords(filters?: {
    level?: ('trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal')[];
    category?: ('network' | 'validation' | 'processing' | 'system' | 'security' | 'business')[];
    module?: string;
    resolved?: boolean;
    timeRange?: { start: number; end: number };
    operation?: string;
  }): ErrorRecord[] {
    let records = Array.from(this.errorRecords.values());

    if (filters) {
      records = records.filter(record => {
        if (filters.level && !filters.level.includes(record.level)) return false;
        if (filters.category && !filters.category.includes(record.category)) return false;
        if (filters.module && record.module !== filters.module) return false;
        if (filters.resolved !== undefined && record.resolved !== filters.resolved) return false;
        if (filters.timeRange) {
          if (record.timestamp < filters.timeRange.start || record.timestamp > filters.timeRange.end) return false;
        }
        if (filters.operation && record.operation !== filters.operation) return false;
        return true;
      });
    }

    return records.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Resolve error
   */
  resolveError(errorId: string, resolution: string): boolean {
    const record = this.errorRecords.get(errorId);
    if (!record) return false;

    record.resolved = true;
    record.resolution = resolution;
    this.writeErrorRecord(record);

    return true;
  }

  // ========================================
  // Field Truncation Management
  // ========================================

  /**
   * Truncate fields in data object
   */
  truncateFields(data: any, context: string): any {
    if (!this.config.truncation?.enabled) return data;

    const truncationConfig = this.config.truncation;
    const stats = {
      totalProcessed: 0,
      totalTruncated: 0,
      totalReplaced: 0,
      totalHidden: 0,
      fieldStats: new Map<string, { processed: number; truncated: number; replaced: number; hidden: number }>()
    };

    const result = this.truncateFieldsRecursive(data, '', truncationConfig, stats, context);

    // Update truncation statistics
    this.updateTruncationStats(stats);

    return result;
  }

  /**
   * Get truncation statistics
   */
  getTruncationStats(): TruncationReport {
    const totalProcessed = this.truncationStats.get('totalProcessed') || 0;
    const totalTruncated = this.truncationStats.get('totalTruncated') || 0;
    const totalReplaced = this.truncationStats.get('totalReplaced') || 0;
    const totalHidden = this.truncationStats.get('totalHidden') || 0;

    return {
      totalProcessed,
      totalTruncated,
      totalReplaced,
      totalHidden,
      savingsPercentage: totalProcessed > 0 ? ((totalTruncated + totalReplaced + totalHidden) / totalProcessed) * 100 : 0,
      fieldDetails: [] // TODO: Implement field details tracking
    };
  }

  // ========================================
  // Helper Methods
  // ========================================

  private validateConfig(config: BaseModuleRecordingConfig): BaseModuleRecordingConfig {
    const defaultBasePath = './recording-logs';

    // Basic validation
    const validatedConfig: BaseModuleRecordingConfig = {
      enabled: config.enabled ?? false,
      basePath: config.basePath || defaultBasePath,
      port: config.port,
      cycle: {
        enabled: config.cycle?.enabled ?? false,
        mode: config.cycle?.mode || 'single',
        basePath: config.cycle?.basePath || config.basePath || defaultBasePath,
        cycleDirTemplate: config.cycle?.cycleDirTemplate || 'cycles/${cycleId}',
        mainFileTemplate: config.cycle?.mainFileTemplate || 'main.${format}',
        summaryFileTemplate: config.cycle?.summaryFileTemplate || 'summary.json',
        format: config.cycle?.format || 'json',
        includeIndex: config.cycle?.includeIndex ?? true,
        includeTimestamp: config.cycle?.includeTimestamp ?? true,
        autoCreateDirectory: config.cycle?.autoCreateDirectory ?? true,
        autoCloseOnComplete: config.cycle?.autoCloseOnComplete ?? true,
        maxCyclesRetained: config.cycle?.maxCyclesRetained || 100
      },
      error: {
        enabled: config.error?.enabled ?? false,
        levels: config.error?.levels || ['error', 'fatal'],
        categories: config.error?.categories || ['system', 'processing'],
        basePath: config.error?.basePath || config.basePath || defaultBasePath,
        indexFileTemplate: config.error?.indexFileTemplate || 'errors/index.jsonl',
        detailFileTemplate: config.error?.detailFileTemplate || 'errors/${errorId}.json',
        summaryFileTemplate: config.error?.summaryFileTemplate || 'errors/summary.json',
        dailyDirTemplate: config.error?.dailyDirTemplate || 'errors/${date}',
        indexFormat: config.error?.indexFormat || 'jsonl',
        detailFormat: config.error?.detailFormat || 'json',
        autoRecoveryTracking: config.error?.autoRecoveryTracking ?? true,
        maxErrorsRetained: config.error?.maxErrorsRetained || 1000,
        enableStatistics: config.error?.enableStatistics ?? true
      },
      truncation: config.truncation,
      file: {
        autoCleanup: config.file?.autoCleanup ?? true,
        maxFileAge: config.file?.maxFileAge || 7 * 24 * 60 * 60 * 1000, // 7 days
        maxFileSize: config.file?.maxFileSize || 10 * 1024 * 1024, // 10MB
        atomicWrites: config.file?.atomicWrites ?? true,
        backupOnWrite: config.file?.backupOnWrite ?? true,
        compressionEnabled: config.file?.compressionEnabled ?? false
      }
    };

    // Validate configuration dependencies
    if (validatedConfig.cycle?.enabled && !validatedConfig.cycle?.basePath) {
      throw new Error('Cycle recording requires basePath to be specified');
    }

    return validatedConfig;
  }

  private initializeGlobalConfig(): void {
    this.globalConfig = {
      sessionId: uuidv4(),
      environment: process.env.NODE_ENV as any || 'development',
      version: '1.0.0',
      baseConfig: this.config,
      moduleOverrides: new Map(),
      configVersion: '1.0.0',
      lastUpdated: Date.now(),
      consistency: {
        enforced: true,
        validationInterval: 60000, // 1 minute
        allowedDeviations: []
      }
    };
  }

  private createConfigSnapshot(customConfig?: Partial<BaseModuleRecordingConfig>) {
    return {
      enabled: customConfig?.enabled ?? this.config.enabled ?? false,
      basePath: customConfig?.basePath ?? this.config.basePath ?? '',
      port: customConfig?.port ?? this.config.port,
      cycleConfig: customConfig?.cycle ?? (this.config.cycle || {}),
      errorConfig: customConfig?.error ?? (this.config.error || {}),
      truncationConfig: customConfig?.truncation ?? (this.config.truncation || {}),
      timestamp: Date.now()
    };
  }

  private resolveBasePath(customConfig?: Partial<BaseModuleRecordingConfig>): string {
    const basePath = customConfig?.basePath || this.config.basePath || './recording-logs';
    return this.resolvePathTemplate(basePath, {});
  }

  private resolveCyclePath(context: RequestContext, cycleId: string): string {
    const template = this.config.cycle?.cycleDirTemplate || 'cycles/${cycleId}';
    const variables = {
      cycleId,
      requestId: context.requestId,
      sessionId: context.sessionId,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0]
    };

    return this.resolvePathTemplate(template, variables);
  }

  private resolveCycleFilePath(handle: CycleHandle, type: 'start' | 'middle' | 'end'): string {
    const template = this.config.cycle?.mainFileTemplate || 'main.${format}';
    const variables = {
      cycleId: handle.cycleId,
      format: handle.format,
      type,
      timestamp: Date.now()
    };

    return this.resolvePathTemplate(template, variables);
  }

  private resolveErrorPath(errorId: string): string {
    const template = this.config.error?.detailFileTemplate || 'errors/${errorId}.json';
    const variables = {
      errorId,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0]
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

  private validateConfiguration(config: BaseModuleRecordingConfig): string | null {
    // Check for specific validation failures
    if (config.cycle?.enabled === true && !config.cycle?.basePath) {
      return 'Cycle recording enabled but basePath is required';
    }
    return null;
  }

  private validateConfigurationConsistency(): ConsistencyValidationResult {
    // TODO: Implement consistency validation
    return {
      valid: true,
      errors: [],
      warnings: [],
      details: {}
    };
  }

  private async notifyConfigChange(config: BaseModuleRecordingConfig): Promise<void> {
    const promises = Array.from(this.configChangeCallbacks).map(callback => {
      try {
        return callback(config);
      } catch (error) {
        this.logError('Config change callback error', error);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  private findRequestContext(cycleId?: string): RequestContext | undefined {
    if (!cycleId) return undefined;

    for (const context of Array.from(this.activeRequests.values())) {
      if (context.sharedData.has(`cycle_${cycleId}`)) {
        return context;
      }
    }

    return undefined;
  }

  private generateTraceReport(context: RequestContext) {
    // TODO: Implement trace report generation
    return {
      traceId: context.traceId,
      requestId: context.requestId,
      sessionId: context.sessionId,
      chainId: context.chainId,
      duration: Date.now() - context.startTime,
      startModule: context.startModule,
      moduleStack: context.moduleStack,
      pathHistory: context.pathHistory,
      status: context.status,
      summary: 'Trace report generated',
      performance: {
        totalDuration: Date.now() - context.startTime,
        moduleTimings: {},
        pathChanges: context.pathHistory.length
      },
      errors: []
    };
  }

  private saveTraceReport(report: any): void {
    // TODO: Implement trace report saving
  }

  private writeCycleRecord(filePath: string, data: any, format: string): void {
    // TODO: Implement cycle record writing
  }

  private generateCycleSummary(handle: CycleHandle): void {
    // TODO: Implement cycle summary generation
  }

  private writeErrorRecord(record: ErrorRecord): void {
    // TODO: Implement error record writing
  }

  private truncateFieldsRecursive(
    data: any,
    path: string,
    config: any,
    stats: any,
    context: string
  ): any {
    if (!this.config.truncation?.enabled) {
      return data;
    }

    stats.totalProcessed++;

    // Handle primitive types
    if (typeof data !== 'object' || data === null) {
      if (typeof data === 'string' && data.length > this.config.truncation.defaultMaxLength!) {
        stats.totalTruncated++;
        return data.substring(0, this.config.truncation.defaultMaxLength!) + '...';
      }
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      if (!this.config.truncation.truncateArrays) {
        return data;
      }

      const newArray = [];
      const limit = Math.min(data.length, this.config.truncation.arrayTruncateLimit!);

      for (let i = 0; i < limit; i++) {
        newArray.push(this.truncateFieldsRecursive(data[i], `${path}.${i}`, config, stats, context));
      }

      if (data.length > limit) {
        newArray.push(`[Array truncated from ${data.length} to ${limit} elements]`);
        stats.totalTruncated++;
      }

      return newArray;
    }

    // Handle objects
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      const fieldPath = path ? `${path}.${key}` : key;
      result[key] = this.truncateFieldsRecursive(value, fieldPath, config, stats, context);
    }

    return result;
  }

  private updateTruncationStats(stats: any): void {
    this.truncationStats.set('totalProcessed', (this.truncationStats.get('totalProcessed') || 0) + stats.totalProcessed);
    this.truncationStats.set('totalTruncated', (this.truncationStats.get('totalTruncated') || 0) + stats.totalTruncated);
    this.truncationStats.set('totalReplaced', (this.truncationStats.get('totalReplaced') || 0) + stats.totalReplaced);
    this.truncationStats.set('totalHidden', (this.truncationStats.get('totalHidden') || 0) + stats.totalHidden);
  }

  private extractModuleName(module: string | ModuleRecordingConfig | undefined): string | undefined {
    if (!module) return undefined;
    if (typeof module === 'string') return module;
    return module.enabled ? 'module-config' : 'unknown';
  }

  private logError(message: string, error: any): void {
    console.error(`[RecordingManager] ${message}:`, error);
  }
}