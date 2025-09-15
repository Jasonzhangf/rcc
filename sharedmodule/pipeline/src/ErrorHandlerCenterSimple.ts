/**
 * Simplified ErrorHandlerCenter implementation for build purposes
 * This provides minimal functionality to get the build working
 */

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { 
  PipelineError, 
  PipelineErrorCode, 
  PipelineErrorCategory, 
  PipelineExecutionContext, 
  PipelineExecutionResult,
  ErrorHandlingAction,
  PipelineBlacklistEntry,
  ErrorHandlerFunction
} from './ErrorTypes';
import { PipelineConfigManager } from './PipelineConfig';

export interface IErrorHandlerCenter {
  initialize(): Promise<void>;
  handleError(error: PipelineError, context: PipelineExecutionContext): Promise<ErrorHandlingAction>;
  handleExecutionResult(result: PipelineExecutionResult, context: PipelineExecutionContext): Promise<void>;
  registerCustomHandler(errorCode: PipelineErrorCode, handler: ErrorHandlerFunction): void;
  unregisterCustomHandler(errorCode: PipelineErrorCode): void;
  blacklistPipeline(pipelineId: string, reason?: string, duration?: number): void;
  unblacklistPipeline(pipelineId: string): void;
  isPipelineBlacklisted(pipelineId: string): boolean;
  getBlacklistedPipelines(): PipelineBlacklistEntry[];
  getPipelineErrorStats(pipelineId?: string): any;
  createErrorResponse(error: PipelineError, context?: PipelineExecutionContext): Record<string, any>;
  destroy(): Promise<void>;
}

export class ErrorHandlerCenter extends BaseModule implements IErrorHandlerCenter {
  private configManager: PipelineConfigManager;
  private customHandlers: Map<PipelineErrorCode, ErrorHandlerFunction> = new Map();
  private blacklistedPipelines: Map<string, PipelineBlacklistEntry> = new Map();
  private errorStats: any = { totalErrors: 0, errorsByCode: {}, errorsByPipeline: {} };
  private blacklistCleanupInterval: NodeJS.Timeout | null = null;

  constructor(configManager: PipelineConfigManager) {
    const moduleInfo: ModuleInfo = {
      id: 'error-handler-center',
      name: 'ErrorHandlerCenter',
      version: '1.0.0',
      description: 'Centralized error handling for pipeline scheduling system',
      type: 'error-handler'
    };
    super(moduleInfo);
    this.configManager = configManager;
  }

  async initialize(): Promise<void> {
    console.log('Initializing ErrorHandlerCenter');
  }

  async handleError(error: PipelineError, context: PipelineExecutionContext): Promise<ErrorHandlingAction> {
    console.error(`Handling error: ${error.message}`);
    
    // Update error stats
    const pipelineId = context.pipelineId;
    if (!this.errorStats.errorsByPipeline[pipelineId]) {
      this.errorStats.errorsByPipeline[pipelineId] = 0;
    }
    this.errorStats.errorsByPipeline[pipelineId]++;
    this.errorStats.totalErrors++;

    // Check for custom handler
    if (this.customHandlers.has(error.code)) {
      const handler = this.customHandlers.get(error.code)!;
      return handler(error, context);
    }

    // Default handling based on error type
    switch (error.category) {
      case PipelineErrorCategory.NETWORK:
        return { action: 'retry', shouldRetry: true, retryDelay: 1000 };
      case PipelineErrorCategory.RATE_LIMITING:
        return { action: 'retry', shouldRetry: true, retryDelay: 5000 };
      case PipelineErrorCategory.AUTHENTICATION:
        return { action: 'blacklist_temporary', shouldRetry: false, destroyPipeline: true };
      default:
        return { action: 'failover', shouldRetry: true };
    }
  }

  async handleExecutionResult(result: PipelineExecutionResult, context: PipelineExecutionContext): Promise<void> {
    if (result.error) {
      await this.handleError(result.error, context);
    }
  }

  registerCustomHandler(errorCode: PipelineErrorCode, handler: ErrorHandlerFunction): void {
    this.customHandlers.set(errorCode, handler);
  }

  unregisterCustomHandler(errorCode: PipelineErrorCode): void {
    this.customHandlers.delete(errorCode);
  }

  blacklistPipeline(pipelineId: string, reason?: string, duration?: number): void {
    const entry: PipelineBlacklistEntry = {
      pipelineId,
      instanceId: 'unknown',
      reason: reason ? { code: PipelineErrorCode.PIPELINE_IN_INVALID_STATE, message: reason, category: PipelineErrorCategory.SYSTEM, severity: 'medium', recoverability: 'recoverable', impact: 'single_module', source: 'system', timestamp: Date.now() } as PipelineError : 
                { code: PipelineErrorCode.PIPELINE_IN_INVALID_STATE, message: 'Unknown reason', category: PipelineErrorCategory.SYSTEM, severity: 'medium', recoverability: 'recoverable', impact: 'single_module', source: 'system', timestamp: Date.now() } as PipelineError,
      blacklistTime: Date.now(),
      expiryTime: duration ? Date.now() + duration : Date.now() + 300000,
      isPermanent: false
    };
    this.blacklistedPipelines.set(pipelineId, entry);
    console.warn(`Pipeline ${pipelineId} blacklisted: ${reason}`);
  }

  unblacklistPipeline(pipelineId: string): void {
    this.blacklistedPipelines.delete(pipelineId);
    console.log(`Pipeline ${pipelineId} removed from blacklist`);
  }

  isPipelineBlacklisted(pipelineId: string): boolean {
    const entry = this.blacklistedPipelines.get(pipelineId);
    if (!entry) return false;
    
    if (entry.expiryTime && entry.expiryTime < Date.now()) {
      this.blacklistedPipelines.delete(pipelineId);
      return false;
    }
    
    return true;
  }

  getBlacklistedPipelines(): PipelineBlacklistEntry[] {
    return Array.from(this.blacklistedPipelines.values());
  }

  getPipelineErrorStats(pipelineId?: string): any {
    if (pipelineId) {
      return this.errorStats.errorsByPipeline[pipelineId] || { totalErrors: 0, errorsByCode: {} };
    }
    
    // Return aggregated stats for all pipelines
    const totalStats = { totalErrors: this.errorStats.totalErrors, errorsByCode: this.errorStats.errorsByCode };
    return totalStats;
  }

  createErrorResponse(error: PipelineError, context?: PipelineExecutionContext): Record<string, any> {
    return {
      error: {
        code: error.code,
        message: error.message,
        category: error.category,
        timestamp: error.timestamp,
        pipelineId: error.pipelineId,
        instanceId: error.instanceId
      },
      context: context ? {
        executionId: context.executionId,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId,
        startTime: context.startTime,
        retryCount: context.retryCount
      } : undefined,
      httpStatus: 500
    };
  }

  async destroy(): Promise<void> {
    console.log('Destroying ErrorHandlerCenter');
    if (this.blacklistCleanupInterval) {
      clearInterval(this.blacklistCleanupInterval);
      this.blacklistCleanupInterval = null;
    }
    this.customHandlers.clear();
    this.blacklistedPipelines.clear();
    this.errorStats = { totalErrors: 0, errorsByCode: {}, errorsByPipeline: {} };
  }

  // Additional methods needed for compatibility
  getErrorStats(): any {
    return { ...this.errorStats };
  }

  clearErrorStats(): void {
    this.errorStats = { totalErrors: 0, errorsByCode: {}, errorsByPipeline: {} };
    console.log('Error statistics cleared');
  }

  private getErrorHandlingStrategy(errorCode: PipelineErrorCode): any {
    return {
      errorCode,
      action: 'retry',
      maxRetries: 3,
      retryDelay: 1000
    };
  }

  private async applyDefaultStrategy(error: PipelineError, context: PipelineExecutionContext, strategy: any): Promise<ErrorHandlingAction> {
    const action: ErrorHandlingAction = {
      action: strategy.action,
      shouldRetry: strategy.action === 'retry',
      retryDelay: strategy.retryDelay || 1000,
      message: `Applied default strategy for ${error.code}`
    };
    
    console.log('Applied default strategy', { error, strategy, action });
    return action;
  }

  private updateErrorStats(error: PipelineError): void {
    this.errorStats.totalErrors++;
    
    if (!this.errorStats.errorsByCode[error.code]) {
      this.errorStats.errorsByCode[error.code] = 0;
    }
    this.errorStats.errorsByCode[error.code]++;

    if (error.pipelineId) {
      if (!this.errorStats.errorsByPipeline[error.pipelineId]) {
        this.errorStats.errorsByPipeline[error.pipelineId] = 0;
      }
      this.errorStats.errorsByPipeline[error.pipelineId]++;
    }
    
    console.debug('Error statistics updated', { 
      totalErrors: this.errorStats.totalErrors,
      errorCode: error.code,
      pipelineId: error.pipelineId
    });
  }

  private createInitialErrorStats(): any {
    return {
      totalErrors: 0,
      errorsByCode: {},
      errorsByPipeline: {},
      lastUpdated: Date.now()
    };
  }

  public getHttpStatusCode(errorCode: PipelineErrorCode): number {
    return 500; // Simplified - always return 500
  }

  blacklistPipelineWithInstance(pipelineId: string, instanceId: string, error: PipelineError, duration: number, isPermanent: boolean = false): void {
    const entry: PipelineBlacklistEntry = {
      pipelineId,
      instanceId,
      reason: error,
      blacklistTime: Date.now(),
      expiryTime: isPermanent ? undefined : Date.now() + duration,
      isPermanent
    };
    this.blacklistedPipelines.set(pipelineId, entry);
    console.warn(`Pipeline ${pipelineId} (instance: ${instanceId}) blacklisted: ${error.message}`);
  }
}