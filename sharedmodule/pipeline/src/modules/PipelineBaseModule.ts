/**
 * Pipeline Base Module - Base module for pipeline components with enhanced debug capabilities
 * 流水线基础模块 - 具有增强调试功能的流水线组件基础模块
 */

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { DebugCenter, PipelinePosition } from 'rcc-debugcenter';
import { ErrorHandlingCenter } from 'rcc-errorhandling';

/**
 * IO Tracking Configuration
 * IO跟踪配置
 */
interface IOTrackingConfig {
  enabled?: boolean;
  baseDirectory?: string;
  maxFiles?: number;
  maxSize?: number;
  autoRecord?: boolean;
  saveIndividualFiles?: boolean;
  saveSessionFiles?: boolean;
  ioDirectory?: string;
  includeTimestamp?: boolean;
  includeDuration?: boolean;
  maxEntriesPerFile?: number;
}

/**
 * Debug Configuration
 * 调试配置
 */
interface DebugConfig {
  enabled?: boolean;
  level?: 'debug' | 'trace' | 'info' | 'warn' | 'error';
  recordStack?: boolean;
  maxLogEntries?: number;
  consoleOutput?: boolean;
  trackDataFlow?: boolean;
  enableFileLogging?: boolean;
  maxFileSize?: number;
  maxLogFiles?: number;
  baseDirectory?: string;
  ioTracking?: IOTrackingConfig;
}

/**
 * Pipeline-specific module configuration
 * 流水线特定模块配置
 */
export interface PipelineModuleConfig {
  // Base module configuration
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'provider' | 'scheduler' | 'tracker' | 'pipeline';

  // Pipeline-specific settings
  providerName?: string;
  endpoint?: string;
  supportedModels?: string[];
  defaultModel?: string;
  maxConcurrentRequests?: number;
  requestTimeout?: number;

  // Debug configuration
  enableTwoPhaseDebug?: boolean;
  debugBaseDirectory?: string;
  enableIOTracking?: boolean;
  ioTrackingConfig?: IOTrackingConfig;
}

/**
 * Pipeline Base Module with enhanced debug capabilities
 * 具有增强调试功能的流水线基础模块
 */
export class PipelineBaseModule extends BaseModule {
  protected pipelineConfig: PipelineModuleConfig;
  protected errorHandler: ErrorHandlingCenter;
  protected debugCenter: DebugCenter | null = null;

  constructor(config: PipelineModuleConfig) {
    // Create module info for BaseModule
    const moduleInfo: ModuleInfo = {
      id: config.id,
      name: config.name,
      version: config.version,
      description: config.description,
      type: config.type
    };

    super(moduleInfo);

    this.pipelineConfig = config;

    // Initialize error handler
    this.errorHandler = new ErrorHandlingCenter({
      id: `${config.id}-error-handler`,
      name: `${config.name} Error Handler`,
      version: '1.0.0',
      type: 'error-handler',
      description: `Error handler for ${config.name}`
    });

    // Enable two-phase debug if configured
    if (config.enableTwoPhaseDebug) {
      const debugConfig: DebugConfig = {
        enabled: true,
        level: 'debug',
        recordStack: true,
        maxLogEntries: 1000,
        consoleOutput: true,
        trackDataFlow: true,
        enableFileLogging: true,
        maxFileSize: 10485760, // 10MB
        maxLogFiles: 5,
        baseDirectory: config.debugBaseDirectory || '~/.rcc/debug-logs',
        ioTracking: config.ioTrackingConfig || {
          enabled: config.enableIOTracking || false,
          autoRecord: false,
          saveIndividualFiles: true,
          saveSessionFiles: false,
          ioDirectory: `${config.debugBaseDirectory || '~/.rcc/debug-logs'}/io`,
          includeTimestamp: true,
          includeDuration: true,
          maxEntriesPerFile: 100
        }
      };

      this.setDebugConfig(debugConfig);

      if (config.enableIOTracking) {
        this.enableTwoPhaseDebug(
          true,
          config.debugBaseDirectory || '~/.rcc/debug-logs',
          config.ioTrackingConfig
        );
      }
    }

    this.logInfo('Pipeline base module initialized', { config }, 'constructor');

    // Store debug center reference if available
    this.debugCenter = this.getDebugCenter();
  }

  /**
   * Enable two-phase debug system
   * 启用两阶段调试系统
   */
  protected enableTwoPhaseDebug(
    enabled: boolean,
    baseDirectory?: string,
    ioTrackingConfig?: IOTrackingConfig
  ): void {
    // Method implementation would go here
    this.logInfo('Two-phase debug system enabled', { enabled, baseDirectory, ioTrackingConfig }, 'enableTwoPhaseDebug');
  }

  /**
   * Get debug center instance
   * 获取调试中心实例
   */
  protected getDebugCenter(): DebugCenter | null {
    return this.debugCenter;
  }

  /**
   * Get pipeline configuration
   * 获取流水线配置
   */
  public getPipelineConfig(): PipelineModuleConfig {
    return { ...this.pipelineConfig };
  }

  /**
   * Update pipeline configuration
   * 更新流水线配置
   */
  public updatePipelineConfig(newConfig: Partial<PipelineModuleConfig>): void {
    const oldConfig = { ...this.pipelineConfig };
    this.pipelineConfig = { ...this.pipelineConfig, ...newConfig };

    this.logInfo('Pipeline configuration updated', {
      oldConfig,
      newConfig: this.pipelineConfig
    }, 'updatePipelineConfig');
  }

  /**
   * Get provider information
   * 获取提供者信息
   */
  public getProviderInfo() {
    return {
      name: this.pipelineConfig.providerName || this.pipelineConfig.name,
      endpoint: this.pipelineConfig.endpoint,
      supportedModels: this.pipelineConfig.supportedModels || [],
      defaultModel: this.pipelineConfig.defaultModel,
      type: this.pipelineConfig.type
    };
  }

  /**
   * Track pipeline operation with I/O tracking
   * 跟踪流水线操作并记录I/O
   */
  public async trackPipelineOperation<T>(
    operationId: string,
    operation: () => Promise<T>,
    inputData?: any,
    operationType: string = 'pipeline-operation'
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Start I/O tracking if enabled
      if (this.pipelineConfig.enableIOTracking && this.debugCenter) {
        this.debugCenter.recordOperation(
          `${this.info.id}-${operationId}`,
          this.info.id,
          operationId,
          inputData,
          undefined,
          operationType,
          true,
          undefined,
          'middle'
        );
      }

      // Execute the operation
      const result = await operation();

      // End I/O tracking if enabled
      if (this.pipelineConfig.enableIOTracking && this.debugCenter) {
        this.debugCenter.recordOperation(
          `${this.info.id}-${operationId}`,
          this.info.id,
          operationId,
          undefined,
          result,
          operationType,
          true,
          undefined,
          'middle'
        );
      }

      this.logInfo('Pipeline operation completed successfully', {
        operationId,
        operationType,
        duration: Date.now() - startTime,
        inputData: inputData ? { type: typeof inputData } : undefined,
        outputData: result ? { type: typeof result } : undefined
      }, 'trackPipelineOperation');

      return result;

    } catch (error) {
      // End I/O tracking with error if enabled
      if (this.pipelineConfig.enableIOTracking && this.debugCenter) {
        this.debugCenter.recordOperation(
          `${this.info.id}-${operationId}`,
          this.info.id,
          operationId,
          undefined,
          undefined,
          operationType,
          false,
          error instanceof Error ? error.message : String(error),
          'middle'
        );
      }

      this.debug('error', 'Pipeline operation failed', {
        operationId,
        operationType,
        duration: Date.now() - startTime,
        inputData: inputData ? { type: typeof inputData } : undefined,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error)
      }, 'trackPipelineOperation');

      throw error;
    }
  }

  /**
   * Record pipeline stage
   * 记录流水线阶段
   */
  public recordPipelineStage(
    stageName: string,
    stageData: any,
    status: 'started' | 'completed' | 'failed' = 'started'
  ): void {
    const timestamp = Date.now();

    this.logInfo(`Pipeline stage ${status}`, {
      stageName,
      stageData: stageData ? { type: typeof stageData } : undefined,
      status,
      timestamp
    }, 'recordPipelineStage');
  }

  /**
   * Handle pipeline errors with enhanced error handling
   * 处理流水线错误并提供增强的错误处理
   */
  public handlePipelineError(
    error: Error,
    context: {
      operation?: string;
      stage?: string;
      requestId?: string;
      additionalData?: Record<string, any>;
    }
  ): void {
    const errorContext = {
      ...context,
      moduleId: this.info.id,
      moduleName: this.info.name,
      timestamp: Date.now(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    };

    // Log the error
    this.debug('error', 'Pipeline error occurred', errorContext, 'handlePipelineError');

    // Handle error with error handling center
    this.errorHandler.handleError({
      error: error,
      source: this.info.id,
      severity: 'high',
      timestamp: Date.now()
    });
  }

  /**
   * Get pipeline metrics
   * 获取流水线指标
   */
  public getPipelineMetrics() {
    if (this.debugCenter) {
      return {
        debugEnabled: true,
        ioTrackingEnabled: this.pipelineConfig.enableIOTracking || false,
        debugConfig: this.getDebugConfig(),
        pipelineEntries: this.debugCenter.getPipelineEntries ? this.debugCenter.getPipelineEntries({
          pipelineId: this.info.id,
          limit: 100
        }) : [],
        stats: this.debugCenter.getStats ? this.debugCenter.getStats() : null
      };
    }

    return {
      debugEnabled: false,
      ioTrackingEnabled: false,
      debugConfig: this.getDebugConfig()
    };
  }

  /**
   * Override destroy method to ensure proper cleanup
   * 重写destroy方法以确保正确的清理
   */
  public override async destroy(): Promise<void> {
    try {
      this.logInfo('Destroying pipeline base module', { moduleId: this.info.id }, 'destroy');

      // Perform any additional cleanup specific to pipeline modules
      if (this.errorHandler) {
        // ErrorHandlingCenter cleanup if available
        if (typeof this.errorHandler.destroy === 'function') {
          await this.errorHandler.destroy();
        }
      }

      // Call parent destroy method
      await super.destroy();

    } catch (error) {
      this.debug('error', 'Failed to destroy pipeline base module', {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
        moduleId: this.info.id
      }, 'destroy');

      throw error;
    }
  }
}