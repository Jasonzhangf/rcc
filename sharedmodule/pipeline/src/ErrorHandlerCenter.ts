/**
 * Error handler center for pipeline scheduling system
 */

import { BaseModule } from 'rcc-basemodule';
import { ModuleInfo } from 'rcc-basemodule';
import { Message, MessageResponse } from 'rcc-basemodule';
import { 
  PipelineError, 
  PipelineErrorCode, 
  PipelineExecutionContext, 
  PipelineExecutionResult,
  PipelineExecutionStatus,
  ErrorHandlingAction,
  ErrorHandlingStrategy,
  PipelineBlacklistEntry,
  PipelineErrorCategory,
  DEFAULT_ERROR_HANDLING_STRATEGIES
} from './ErrorTypes';
import { PipelineConfigManager } from './PipelineConfig';
import { v4 as uuidv4 } from 'uuid';

/**
 * Error handler center interface
 */
export interface IErrorHandlerCenter {
  handleError(error: PipelineError, context: PipelineExecutionContext): Promise<ErrorHandlingAction>;
  handleExecutionResult(result: PipelineExecutionResult, context: PipelineExecutionContext): Promise<void>;
  registerCustomHandler(errorCode: PipelineErrorCode, handler: (error: PipelineError, context: PipelineExecutionContext) => Promise<ErrorHandlingAction>): void;
  unregisterCustomHandler(errorCode: PipelineErrorCode): void;
  getBlacklistedPipelines(): PipelineBlacklistEntry[];
  isPipelineBlacklisted(pipelineId: string): boolean;
  blacklistPipeline(pipelineId: string, instanceId: string, error: PipelineError, duration: number, isPermanent: boolean = false): void;
  unblacklistPipeline(pipelineId: string): void;
  getErrorStats(): ErrorStats;
  clearErrorStats(): void;
}

/**
 * Error statistics
 */
export interface ErrorStats {
  totalErrors: number;
  errorsByCode: Map<PipelineErrorCode, number>;
  errorsByCategory: Map<PipelineErrorCategory, number>;
  errorsByPipeline: Map<string, number>;
  handledErrors: number;
  unhandledErrors: number;
  retryCount: number;
  failoverCount: number;
  blacklistCount: number;
  maintenanceCount: number;
}

/**
 * Error handler center implementation
 */
export class ErrorHandlerCenter extends BaseModule implements IErrorHandlerCenter {
  private configManager: PipelineConfigManager;
  private customHandlers: Map<PipelineErrorCode, Function> = new Map();
  private blacklistedPipelines: Map<string, PipelineBlacklistEntry> = new Map();
  private errorStats: ErrorStats;
  private blacklistCleanupInterval: NodeJS.Timeout | null = null;

  constructor(configManager: PipelineConfigManager) {
    const moduleInfo: ModuleInfo = {
      id: 'error-handler-center',
      name: 'ErrorHandlerCenter',
      version: '1.0.0',
      description: 'Centralized error handling for pipeline scheduling system',
      type: 'error-handler',
      dependencies: [],
      config: {}
    };

    super(moduleInfo);
    
    this.configManager = configManager;
    this.errorStats = this.createInitialErrorStats();
    
    this.log('Error handler center created', {}, 'constructor');
  }

  /**
   * Initialize the error handler center
   */
  public override async initialize(): Promise<void> {
    await super.initialize();
    
    // Start blacklist cleanup
    this.startBlacklistCleanup();
    
    // Register default message handlers
    this.registerMessageHandlers();
    
    this.logInfo('Error handler center initialized', {}, 'initialize');
  }

  /**
   * Handle a pipeline error
   */
  public async handleError(error: PipelineError, context: PipelineExecutionContext): Promise<ErrorHandlingAction> {
    this.error('Handling pipeline error', {
      error,
      context: {
        executionId: context.executionId,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId,
        retryCount: context.retryCount
      }
    }, 'handleError');

    // Update error statistics
    this.updateErrorStats(error);

    // Get error handling strategy
    const strategy = this.getErrorHandlingStrategy(error.code);
    
    // Check for custom handler first
    const customHandler = this.customHandlers.get(error.code);
    if (customHandler) {
      try {
        const customAction = await customHandler(error, context);
        this.logInfo('Custom error handler executed', {
          errorCode: error.code,
          action: customAction
        }, 'handleError');
        return customAction;
      } catch (handlerError) {
        this.error('Custom error handler failed', {
          errorCode: error.code,
          handlerError
        }, 'handleError');
        // Fall back to default strategy
      }
    }

    // Apply default strategy
    const action = await this.applyDefaultStrategy(error, context, strategy);
    
    this.logInfo('Error handling completed', {
      errorCode: error.code,
      action,
      strategy
    }, 'handleError');

    return action;
  }

  /**
   * Handle execution result (for tracking successful executions)
   */
  public async handleExecutionResult(result: PipelineExecutionResult, context: PipelineExecutionContext): Promise<void> {
    if (result.status === PipelineExecutionStatus.COMPLETED) {
      // Successful execution - clear any blacklist entries for this pipeline
      this.unblacklistPipeline(result.pipelineId);
      
      this.logInfo('Successful execution processed', {
        executionId: result.executionId,
        pipelineId: result.pipelineId,
        instanceId: result.instanceId,
        duration: result.duration
      }, 'handleExecutionResult');
    } else if (result.status === PipelineExecutionStatus.FAILED && result.error) {
      // Failed execution - handle the error
      await this.handleError(result.error, context);
    }
  }

  /**
   * Register custom error handler
   */
  public registerCustomHandler(errorCode: PipelineErrorCode, handler: (error: PipelineError, context: PipelineExecutionContext) => Promise<ErrorHandlingAction>): void {
    this.customHandlers.set(errorCode, handler);
    this.logInfo('Custom error handler registered', { errorCode }, 'registerCustomHandler');
  }

  /**
   * Unregister custom error handler
   */
  public unregisterCustomHandler(errorCode: PipelineErrorCode): void {
    this.customHandlers.delete(errorCode);
    this.logInfo('Custom error handler unregistered', { errorCode }, 'unregisterCustomHandler');
  }

  /**
   * Get blacklisted pipelines
   */
  public getBlacklistedPipelines(): PipelineBlacklistEntry[] {
    return Array.from(this.blacklistedPipelines.values());
  }

  /**
   * Check if pipeline is blacklisted
   */
  public isPipelineBlacklisted(pipelineId: string): boolean {
    const entry = this.blacklistedPipelines.get(pipelineId);
    if (!entry) {
      return false;
    }

    // Check if blacklist entry has expired
    if (!entry.isPermanent && entry.expiryTime <= Date.now()) {
      this.blacklistedPipelines.delete(pipelineId);
      return false;
    }

    return true;
  }

  /**
   * Blacklist a pipeline
   */
  public blacklistPipeline(pipelineId: string, instanceId: string, error: PipelineError, duration: number, isPermanent: boolean = false): void {
    const entry: PipelineBlacklistEntry = {
      pipelineId,
      instanceId,
      reason: error,
      blacklistTime: Date.now(),
      expiryTime: isPermanent ? Number.MAX_SAFE_INTEGER : Date.now() + duration,
      isPermanent
    };

    this.blacklistedPipelines.set(pipelineId, entry);
    this.errorStats.blacklistCount++;

    this.warn('Pipeline blacklisted', {
      pipelineId,
      instanceId,
      error,
      duration,
      isPermanent,
      expiryTime: entry.expiryTime
    }, 'blacklistPipeline');

    // Notify other modules about the blacklist
    this.sendMessage('pipeline_blacklisted', {
      pipelineId,
      instanceId,
      error,
      duration,
      isPermanent
    });
  }

  /**
   * Remove pipeline from blacklist
   */
  public unblacklistPipeline(pipelineId: string): void {
    if (this.blacklistedPipelines.has(pipelineId)) {
      this.blacklistedPipelines.delete(pipelineId);
      this.logInfo('Pipeline removed from blacklist', { pipelineId }, 'unblacklistPipeline');

      // Notify other modules about the unblacklist
      this.sendMessage('pipeline_unblacklisted', { pipelineId });
    }
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): ErrorStats {
    return { ...this.errorStats };
  }

  /**
   * Clear error statistics
   */
  public clearErrorStats(): void {
    this.errorStats = this.createInitialErrorStats();
    this.logInfo('Error statistics cleared', {}, 'clearErrorStats');
  }

  /**
   * Get error handling strategy for error code
   */
  private getErrorHandlingStrategy(errorCode: PipelineErrorCode): ErrorHandlingStrategy {
    return this.configManager.getErrorHandlingStrategy(errorCode) || {
      errorCode,
      action: 'ignore',
      retryCount: 0,
      shouldDestroyPipeline: false
    };
  }

  /**
   * Apply default error handling strategy
   */
  private async applyDefaultStrategy(error: PipelineError, context: PipelineExecutionContext, strategy: ErrorHandlingStrategy): Promise<ErrorHandlingAction> {
    const action: ErrorHandlingAction = {
      action: strategy.action,
      shouldRetry: false,
      destroyPipeline: strategy.shouldDestroyPipeline || false
    };

    switch (strategy.action) {
      case 'retry':
        if (context.retryCount < (strategy.retryCount || 0)) {
          action.shouldRetry = true;
          action.retryDelay = strategy.retryDelay || 1000;
          this.errorStats.retryCount++;
        } else {
          // Max retries exceeded, fall back to failover
          action.action = 'failover';
          action.shouldRetry = false;
          this.errorStats.failoverCount++;
        }
        break;

      case 'failover':
        action.shouldRetry = false;
        this.errorStats.failoverCount++;
        break;

      case 'blacklist_temporary':
        this.blacklistPipeline(
          context.pipelineId,
          context.instanceId,
          error,
          strategy.blacklistDuration || 60000,
          false
        );
        action.shouldRetry = false;
        break;

      case 'blacklist_permanent':
        this.blacklistPipeline(
          context.pipelineId,
          context.instanceId,
          error,
          0,
          true
        );
        action.shouldRetry = false;
        break;

      case 'maintenance':
        this.sendMessage('pipeline_maintenance', {
          pipelineId: context.pipelineId,
          instanceId: context.instanceId,
          error
        });
        action.shouldRetry = false;
        this.errorStats.maintenanceCount++;
        break;

      case 'ignore':
        action.shouldRetry = false;
        break;
    }

    // Update handled errors count
    this.errorStats.handledErrors++;

    return action;
  }

  /**
   * Update error statistics
   */
  private updateErrorStats(error: PipelineError): void {
    this.errorStats.totalErrors++;
    
    // Update by error code
    const codeCount = this.errorStats.errorsByCode.get(error.code) || 0;
    this.errorStats.errorsByCode.set(error.code, codeCount + 1);
    
    // Update by category
    const categoryCount = this.errorStats.errorsByCategory.get(error.category) || 0;
    this.errorStats.errorsByCategory.set(error.category, categoryCount + 1);
    
    // Update by pipeline
    if (error.pipelineId) {
      const pipelineCount = this.errorStats.errorsByPipeline.get(error.pipelineId) || 0;
      this.errorStats.errorsByPipeline.set(error.pipelineId, pipelineCount + 1);
    }

    this.log('Error statistics updated', {
      totalErrors: this.errorStats.totalErrors,
      error: {
        code: error.code,
        category: error.category,
        pipelineId: error.pipelineId
      }
    }, 'updateErrorStats');
  }

  /**
   * Start blacklist cleanup
   */
  private startBlacklistCleanup(): void {
    const config = this.configManager.getConfig();
    const cleanupInterval = config.scheduler.blacklistConfig.cleanupInterval;
    
    this.blacklistCleanupInterval = setInterval(() => {
      this.cleanupExpiredBlacklistEntries();
    }, cleanupInterval);

    this.logInfo('Blacklist cleanup started', { interval: cleanupInterval }, 'startBlacklistCleanup');
  }

  /**
   * Cleanup expired blacklist entries
   */
  private cleanupExpiredBlacklistEntries(): void {
    const now = Date.now();
    const expiredEntries: string[] = [];

    for (const [pipelineId, entry] of this.blacklistedPipelines.entries()) {
      if (!entry.isPermanent && entry.expiryTime <= now) {
        expiredEntries.push(pipelineId);
      }
    }

    for (const pipelineId of expiredEntries) {
      this.blacklistedPipelines.delete(pipelineId);
      this.logInfo('Blacklist entry expired', { pipelineId }, 'cleanupExpiredBlacklistEntries');
    }

    if (expiredEntries.length > 0) {
      this.logInfo('Cleaned up expired blacklist entries', { 
        count: expiredEntries.length 
      }, 'cleanupExpiredBlacklistEntries');
    }
  }

  /**
   * Register message handlers
   */
  private registerMessageHandlers(): void {
    // Handle pipeline health status updates
    this.registerMessageHandler('pipeline_health_update', async (message: Message) => {
      this.log('Received pipeline health update', message.payload, 'handleMessage');
      return { success: true };
    });

    // Handle error handling strategy updates
    this.registerMessageHandler('error_strategy_update', async (message: Message) => {
      this.log('Received error strategy update', message.payload, 'handleMessage');
      return { success: true };
    });

    // Handle custom error handler registration
    this.registerMessageHandler('register_custom_handler', async (message: Message) => {
      this.log('Received custom handler registration', message.payload, 'handleMessage');
      return { success: true };
    });
  }

  /**
   * Handle incoming messages
   */
  public override async handleMessage(message: Message): Promise<MessageResponse | void> {
    this.log('Handling message', { type: message.type, source: message.source }, 'handleMessage');

    switch (message.type) {
      case 'get_error_stats':
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: this.getErrorStats(),
          timestamp: Date.now()
        };

      case 'get_blacklisted_pipelines':
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: this.getBlacklistedPipelines(),
          timestamp: Date.now()
        };

      case 'clear_error_stats':
        this.clearErrorStats();
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { message: 'Error statistics cleared' },
          timestamp: Date.now()
        };

      case 'manual_blacklist':
        const { pipelineId, instanceId, error, duration, isPermanent } = message.payload;
        this.blacklistPipeline(pipelineId, instanceId, error, duration, isPermanent);
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { message: 'Pipeline blacklisted manually' },
          timestamp: Date.now()
        };

      case 'manual_unblacklist':
        this.unblacklistPipeline(message.payload.pipelineId);
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { message: 'Pipeline unblacklisted manually' },
          timestamp: Date.now()
        };

      default:
        this.warn('Unhandled message type', { type: message.type }, 'handleMessage');
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: false,
          error: `Unhandled message type: ${message.type}`,
          timestamp: Date.now()
        };
    }
  }

  /**
   * Create initial error statistics
   */
  private createInitialErrorStats(): ErrorStats {
    return {
      totalErrors: 0,
      errorsByCode: new Map(),
      errorsByCategory: new Map(),
      errorsByPipeline: new Map(),
      handledErrors: 0,
      unhandledErrors: 0,
      retryCount: 0,
      failoverCount: 0,
      blacklistCount: 0,
      maintenanceCount: 0
    };
  }

  /**
   * Destroy the error handler center
   */
  public override async destroy(): Promise<void> {
    // Stop blacklist cleanup
    if (this.blacklistCleanupInterval) {
      clearInterval(this.blacklistCleanupInterval);
      this.blacklistCleanupInterval = null;
    }

    // Clear blacklist
    this.blacklistedPipelines.clear();

    // Clear custom handlers
    this.customHandlers.clear();

    // Clear error stats
    this.clearErrorStats();

    await super.destroy();
    
    this.logInfo('Error handler center destroyed', {}, 'destroy');
  }

  /**
   * Get HTTP status code for error
   */
  public getHttpStatusCode(errorCode: PipelineErrorCode): number {
    const statusMap: Record<PipelineErrorCode, number> = {
      [PipelineErrorCode.INVALID_CONFIG]: 400,
      [PipelineErrorCode.MISSING_CONFIG]: 400,
      [PipelineErrorCode.CONFIG_VALIDATION_FAILED]: 400,
      [PipelineErrorCode.PIPELINE_CONFIG_NOT_FOUND]: 404,
      [PipelineErrorCode.LOAD_BALANCER_CONFIG_INVALID]: 500,
      [PipelineErrorCode.ERROR_HANDLER_CONFIG_INVALID]: 500,
      [PipelineErrorCode.PIPELINE_CREATION_FAILED]: 500,
      [PipelineErrorCode.PIPELINE_INITIALIZATION_FAILED]: 500,
      [PipelineErrorCode.PIPELINE_DESTRUCTION_FAILED]: 500,
      [PipelineErrorCode.PIPELINE_NOT_FOUND]: 404,
      [PipelineErrorCode.PIPELINE_ALREADY_EXISTS]: 409,
      [PipelineErrorCode.PIPELINE_IN_INVALID_STATE]: 500,
      [PipelineErrorCode.NO_AVAILABLE_PIPELINES]: 503,
      [PipelineErrorCode.SCHEDULING_FAILED]: 500,
      [PipelineErrorCode.LOAD_BALANCING_FAILED]: 500,
      [PipelineErrorCode.ROUND_ROBIN_FAILED]: 500,
      [PipelineErrorCode.PIPELINE_SELECTION_FAILED]: 500,
      [PipelineErrorCode.EXECUTION_FAILED]: 500,
      [PipelineErrorCode.EXECUTION_TIMEOUT]: 504,
      [PipelineErrorCode.EXECUTION_CANCELLED]: 499,
      [PipelineErrorCode.EXECUTION_ABORTED]: 500,
      [PipelineErrorCode.PIPELINE_EXECUTION_ERROR]: 500,
      [PipelineErrorCode.CONNECTION_FAILED]: 502,
      [PipelineErrorCode.REQUEST_TIMEOUT]: 504,
      [PipelineErrorCode.RESPONSE_TIMEOUT]: 504,
      [PipelineErrorCode.NETWORK_UNREACHABLE]: 503,
      [PipelineErrorCode.PROTOCOL_ERROR]: 502,
      [PipelineErrorCode.AUTHENTICATION_FAILED]: 401,
      [PipelineErrorCode.AUTHORIZATION_FAILED]: 403,
      [PipelineErrorCode.TOKEN_EXPIRED]: 401,
      [PipelineErrorCode.INVALID_CREDENTIALS]: 401,
      [PipelineErrorCode.ACCESS_DENIED]: 403,
      [PipelineErrorCode.RATE_LIMIT_EXCEEDED]: 429,
      [PipelineErrorCode.TOO_MANY_REQUESTS]: 429,
      [PipelineErrorCode.QUOTA_EXCEEDED]: 429,
      [PipelineErrorCode.THROTTLED]: 429,
      [PipelineErrorCode.INSUFFICIENT_MEMORY]: 507,
      [PipelineErrorCode.INSUFFICIENT_DISK_SPACE]: 507,
      [PipelineErrorCode.CPU_OVERLOAD]: 503,
      [PipelineErrorCode.RESOURCE_EXHAUSTED]: 507,
      [PipelineErrorCode.INVALID_DATA_FORMAT]: 400,
      [PipelineErrorCode.DATA_VALIDATION_FAILED]: 400,
      [PipelineErrorCode.DATA_TOO_LARGE]: 413,
      [PipelineErrorCode.DATA_CORRUPTED]: 422,
      [PipelineErrorCode.INTERNAL_ERROR]: 500,
      [PipelineErrorCode.SYSTEM_OVERLOAD]: 503,
      [PipelineErrorCode.SERVICE_UNAVAILABLE]: 503,
      [PipelineErrorCode.MAINTENANCE_MODE]: 503
    };

    return statusMap[errorCode] || 500;
  }

  /**
   * Create error response for API
   */
  public createErrorResponse(error: PipelineError, context?: PipelineExecutionContext): Record<string, any> {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        category: error.category,
        severity: error.severity,
        pipelineId: error.pipelineId,
        instanceId: error.instanceId,
        timestamp: error.timestamp,
        details: error.details
      },
      context: context ? {
        executionId: context.executionId,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId,
        retryCount: context.retryCount
      } : undefined,
      httpStatus: this.getHttpStatusCode(error.code)
    };
  }
}