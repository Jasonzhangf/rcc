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
import { UnderConstruction } from 'rcc-underconstruction';

// Create UnderConstruction instance for unimplemented features
const underConstruction = new UnderConstruction();

// Import specialized components
import { RequestContextManager } from './RequestContextManager';
import { GlobalConfigManager } from './GlobalConfigManager';
import { ConfigValidator } from './ConfigValidator';
import { PathResolver } from './PathResolver';
import { CycleRecorder } from './CycleRecorder';
import { ErrorRecorder } from './ErrorRecorder';
import { FieldTruncator } from './FieldTruncator';

/**
 * Core recording manager that coordinates all recording components
 *
 * This class acts as a facade that coordinates specialized recording components:
 * - RequestContextManager: Manages request lifecycle and context
 * - GlobalConfigManager: Handles global configuration and versioning
 * - ConfigValidator: Validates configuration consistency
 * - PathResolver: Resolves file paths and templates
 * - CycleRecorder: Handles circular recording operations
 * - ErrorRecorder: Manages error recording and tracking
 * - FieldTruncator: Handles field truncation and data processing
 */
export class RecordingManager {
  private config: BaseModuleRecordingConfig;
  private globalConfig: GlobalRecordingConfig | null = null;
  private configChangeCallbacks: Set<(config: BaseModuleRecordingConfig) => Promise<void> | void> = new Set();

  // Specialized components
  private requestContextManager: RequestContextManager;
  private globalConfigManager: GlobalConfigManager;
  private configValidator: ConfigValidator;
  private pathResolver: PathResolver;
  private cycleRecorder: CycleRecorder;
  private errorRecorder: ErrorRecorder;
  private fieldTruncator: FieldTruncator;

  constructor(config: BaseModuleRecordingConfig = {}) {
    this.config = this.validateConfig(config);

    // Initialize specialized components
    this.globalConfigManager = new GlobalConfigManager(this.config);
    this.globalConfig = this.globalConfigManager.getGlobalConfig();

    this.configValidator = new ConfigValidator(this.config);
    this.pathResolver = new PathResolver();

    this.requestContextManager = new RequestContextManager();
    this.cycleRecorder = new CycleRecorder(this.config.cycle || {}, this.config.truncation);
    this.errorRecorder = new ErrorRecorder(this.config.error || {});
    this.fieldTruncator = new FieldTruncator(this.config.truncation || {});
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
      const validationError = this.configValidator.validateConfiguration({ ...this.config, ...newConfig });
      if (validationError && !force) {
        return {
          success: false,
          errors: [validationError],
          requiresForce: true
        };
      }

      this.config = this.configValidator.validateConfig({ ...this.config, ...newConfig });

      // Validate consistency
      const consistencyResult = this.configValidator.validateConfigurationConsistency();
      if (!consistencyResult.valid && !force) {
        return {
          success: false,
          errors: consistencyResult.errors,
          requiresForce: true
        };
      }

      // Update global config
      await this.globalConfigManager.updateGlobalConfig(this.config as any);
      this.globalConfig = this.globalConfigManager.getGlobalConfig();

      // Update specialized components with new config
      this.updateComponentConfigs();

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

  /**
   * Update component configurations
   */
  private updateComponentConfigs(): void {
    // Note: PathResolver doesn't have updateConfig method
    // Note: RequestContextManager doesn't have updateConfig method
    this.cycleRecorder.updateConfig(this.config.cycle || {});
    this.errorRecorder.updateConfig(this.config.error || {});
    this.fieldTruncator.updateConfig(this.config.truncation || {});
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
    return this.requestContextManager.createContext({
      ...options,
      customConfig: options.customConfig
    });
  }

  /**
   * Get request context
   */
  getRequestContext(requestId: string): RequestContext | undefined {
    return this.requestContextManager.getContext(requestId);
  }

  /**
   * Update request context
   */
  updateRequestContext(requestId: string, updates: Partial<RequestContext>): boolean {
    return this.requestContextManager.updateContext(requestId, updates);
  }

  /**
   * Complete request context
   */
  completeRequestContext(requestId: string, status: 'completed' | 'error' = 'completed'): boolean {
    const context = this.requestContextManager.getContext(requestId);
    if (!context) return false;

    const result = this.requestContextManager.completeContext(requestId, status);

    // Generate trace report if context was found and completed
    if (result && context) {
      const report = this.generateTraceReport(context);
      this.saveTraceReport(report);
    }

    return result;
  }

  // ========================================
  // Cycle Recording Management
  // ========================================

  /**
   * Start cycle recording
   */
  async startCycleRecording(requestId: string, operation: string, module: string): Promise<CycleHandle | null> {
    if (!this.config.cycle?.enabled) return null;

    const context = this.getRequestContext(requestId);
    if (!context) return null;

    return this.cycleRecorder.startCycle(operation, module, {
      requestId,
      basePath: this.pathResolver.resolveCyclePath(this.config.cycle || {}, {
        cycleId: '', // Will be set by cycle recorder
        requestId: context.requestId,
        sessionId: context.sessionId,
        timestamp: Date.now()
      }),
      customConfig: this.config.cycle
    });
  }

  /**
   * Record cycle event
   */
  async recordCycleEvent(handle: CycleHandle, event: {
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
  }): Promise<boolean> {
    if (!this.config.cycle?.enabled) return false;

    try {
      // Apply field truncation if enabled
      let eventData = { ...event };
      if (this.config.truncation?.enabled) {
        eventData = this.fieldTruncator.truncateFields(eventData, 'cycle');
      }

      return this.cycleRecorder.recordCycleEvent(handle, eventData);
    } catch (error) {
      this.logError('Failed to record cycle event', error);
      return false;
    }
  }

  /**
   * End cycle recording
   */
  async endCycleRecording(handle: CycleHandle, result?: any, error?: string): Promise<boolean> {
    if (!this.config.cycle?.enabled) return false;

    try {
      const context = handle.requestId ? this.getRequestContext(handle.requestId) : undefined;
      const event = {
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
      };

      // Apply field truncation if enabled
      let eventData = { ...event };
      if (this.config.truncation?.enabled) {
        eventData = this.fieldTruncator.truncateFields(eventData, 'cycle');
      }

      const success = await this.cycleRecorder.endCycle(handle, eventData);

      if (success) {
        // Generate summary
        this.generateCycleSummary(handle);
      }

      return success;
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
  async recordError(errorData: {
    error: Error | string;
    level?: 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal';
    category?: 'network' | 'validation' | 'processing' | 'system' | 'security' | 'business';
    operation?: string;
    context?: Record<string, any>;
    recoverable?: boolean;
    cycleId?: string;
  }): Promise<string> {
    if (!this.config.error?.enabled) return '';

    return await this.errorRecorder.recordError(errorData);
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
    return this.errorRecorder.getErrors(filters);
  }

  /**
   * Resolve error
   */
  async resolveError(errorId: string, resolution: string): Promise<boolean> {
    return await this.errorRecorder.resolveError(errorId, resolution);
  }

  // ========================================
  // Field Truncation Management
  // ========================================

  /**
   * Truncate fields in data object
   */
  truncateFields(data: any, context: string): any {
    if (!this.config.truncation?.enabled) return data;
    return this.fieldTruncator.truncateFields(data, context);
  }

  /**
   * Get truncation statistics
   */
  getTruncationStats(): TruncationReport {
    return this.fieldTruncator.getReport();
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Validate configuration (delegated to ConfigValidator)
   */
  private validateConfig(config: BaseModuleRecordingConfig): BaseModuleRecordingConfig {
    return this.configValidator.validateConfig(config);
  }

  /**
   * Notify configuration changes to all registered callbacks
   */
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

  /**
   * Generate trace report for completed request context
   */
  private generateTraceReport(context: RequestContext) {
    // Feature: Trace report generation
    underConstruction.callUnderConstructionFeature('trace-report-generation', {
      caller: 'RecordingManager.generateTraceReport',
      parameters: {
        context,
        reportFormat: 'comprehensive',
        includePerformance: true
      },
      purpose: 'Generate comprehensive trace reports with performance metrics'
    });
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

  /**
   * Save trace report to persistent storage
   */
  private saveTraceReport(report: any): void {
    // Feature: Trace report saving
    underConstruction.callUnderConstructionFeature('trace-report-saving', {
      caller: 'RecordingManager.saveTraceReport',
      parameters: {
        report,
        saveStrategy: 'timestamped-directory',
        compression: true
      },
      purpose: 'Save trace reports to persistent storage with compression'
    });
  }

  /**
   * Generate cycle summary for completed cycle
   */
  private generateCycleSummary(handle: CycleHandle): void {
    // Feature: Cycle summary generation
    underConstruction.callUnderConstructionFeature('cycle-summary-generation', {
      caller: 'RecordingManager.generateCycleSummary',
      parameters: {
        handle,
        summaryType: 'statistical-overview',
        includeTiming: true
      },
      purpose: 'Generate statistical summaries for completed cycles'
    });
  }

  /**
   * Log error with context
   */
  private logError(message: string, error: any): void {
    console.error(`[RecordingManager] ${message}:`, error);
  }
}