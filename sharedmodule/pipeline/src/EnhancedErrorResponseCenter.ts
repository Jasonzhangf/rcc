/**
 * Enhanced Error Response Center for pipeline scheduling system
 * Provides comprehensive error handling, recovery, and response management
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
import { ErrorHandlerCenter } from './ErrorHandlerCenter';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced error response interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: PipelineErrorCode;
    message: string;
    category: PipelineErrorCategory;
    severity: string;
    pipelineId?: string;
    instanceId?: string;
    timestamp: number;
    details?: Record<string, any>;
  };
  context?: {
    executionId: string;
    pipelineId: string;
    instanceId: string;
    retryCount: number;
  };
  httpStatus: number;
  recoveryAction?: ErrorHandlingAction;
}

/**
 * Error handler registration interface
 */
export interface ErrorHandlerRegistration {
  errorCode: PipelineErrorCode;
  handler: EnhancedErrorHandlerFunction;
  priority: number;
  description: string;
  isActive: boolean;
  registeredAt: number;
}

/**
 * Enhanced error handler function signature
 */
export type EnhancedErrorHandlerFunction = (error: PipelineError, context: PipelineExecutionContext) => Promise<ErrorResponse>;

/**
 * Error response center configuration
 */
export interface ErrorResponseCenterConfig {
  enableLocalErrorHandling: boolean;
  enableServerErrorHandling: boolean;
  enableRecoveryActions: boolean;
  enableErrorLogging: boolean;
  enableErrorMetrics: boolean;
  maxErrorHistorySize: number;
  errorCleanupInterval: number;
  recoveryActionTimeout: number;
  customErrorHandlers: ErrorHandlerRegistration[];
}

/**
 * Error metrics interface
 */
export interface ErrorMetrics {
  totalErrors: number;
  errorsByCode: Map<PipelineErrorCode, number>;
  errorsByCategory: Map<PipelineErrorCategory, number>;
  errorsByPipeline: Map<string, number>;
  localErrors: number;
  serverErrors: number;
  recoveryActions: Map<string, number>;
  averageProcessingTime: number;
  lastErrorTime: number;
}

/**
 * Enhanced Error Response Center implementation
 */
export class EnhancedErrorResponseCenter extends BaseModule {
  private configManager: PipelineConfigManager;
  private errorHandler: ErrorHandlerCenter;
  public override config: ErrorResponseCenterConfig;
  private customHandlers: Map<PipelineErrorCode, ErrorHandlerRegistration[]> = new Map();
  private errorHistory: PipelineError[] = [];
  private errorMetrics: ErrorMetrics;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private recoveryActionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(configManager: PipelineConfigManager, errorHandler: ErrorHandlerCenter, config: ErrorResponseCenterConfig) {
    const moduleInfo: ModuleInfo = {
      id: 'enhanced-error-response-center',
      name: 'EnhancedErrorResponseCenter',
      version: '2.0.0',
      description: 'Enhanced error response center with comprehensive error handling and recovery',
      type: 'error-response-center'
    };

    super(moduleInfo);
    
    this.configManager = configManager;
    this.errorHandler = errorHandler;
    this.config = config;
    this.errorMetrics = this.createInitialErrorMetrics();
    
    // Register custom handlers from config
    this.registerCustomHandlersFromConfig();
    
    this.log('Enhanced error response center created', { 
      enableLocalErrorHandling: config.enableLocalErrorHandling,
      enableServerErrorHandling: config.enableServerErrorHandling,
      customHandlersCount: config.customErrorHandlers.length
    }, 'constructor');
  }

  /**
   * Initialize the enhanced error response center
   */
  public override async initialize(): Promise<void> {
    await super.initialize();
    
    // Start error cleanup
    this.startErrorCleanup();
    
    // Register default message handlers
    this.registerMessageHandlers();
    
    this.logInfo('Enhanced error response center initialized', {}, 'initialize');
  }

  /**
   * Handle local error (send phase - 500 error)
   */
  public async handleLocalError(error: PipelineError, context: PipelineExecutionContext): Promise<ErrorResponse> {
    const startTime = Date.now();
    
    this.error('Handling local error (send phase)', {
      error,
      context: {
        executionId: context.executionId,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId,
        retryCount: context.retryCount
      }
    }, 'handleLocalError');

    // Update error metrics
    this.updateErrorMetrics(error, 'local');

    // Create base error response
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: `Local Error (Send Phase): ${error.message}`,
        category: error.category,
        severity: error.severity,
        pipelineId: error.pipelineId,
        instanceId: error.instanceId,
        timestamp: Date.now(),
        details: {
          ...error.details,
          phase: 'send',
          localError: true,
          originalError: error.message
        }
      },
      context: {
        executionId: context.executionId,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId,
        retryCount: context.retryCount
      },
      httpStatus: 500
    };

    // Get error handling action
    const recoveryAction = await this.getRecoveryAction(error, context);
    if (recoveryAction) {
        errorResponse.recoveryAction = recoveryAction;
      }

    // Execute recovery action if enabled
    if (this.config.enableRecoveryActions && recoveryAction) {
      await this.executeRecoveryAction(recoveryAction, error, context);
    }

    // Log error if enabled
    if (this.config.enableErrorLogging) {
      this.logErrorDetails(error, context, errorResponse);
    }

    // Update processing time metrics
    const processingTime = Date.now() - startTime;
    this.updateProcessingTimeMetrics(processingTime);

    return errorResponse;
  }

  /**
   * Handle local error (receive phase - 501 error)
   */
  public async handleReceiveError(error: PipelineError, context: PipelineExecutionContext): Promise<ErrorResponse> {
    const startTime = Date.now();
    
    this.error('Handling local error (receive phase)', {
      error,
      context: {
        executionId: context.executionId,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId,
        retryCount: context.retryCount
      }
    }, 'handleReceiveError');

    // Update error metrics
    this.updateErrorMetrics(error, 'local');

    // Create base error response
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: `Local Error (Receive Phase): ${error.message}`,
        category: error.category,
        severity: error.severity,
        pipelineId: error.pipelineId,
        instanceId: error.instanceId,
        timestamp: Date.now(),
        details: {
          ...error.details,
          phase: 'receive',
          localError: true,
          originalError: error.message
        }
      },
      context: {
        executionId: context.executionId,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId,
        retryCount: context.retryCount
      },
      httpStatus: 501
    };

    // Get error handling action
    const recoveryAction = await this.getRecoveryAction(error, context);
    if (recoveryAction) {
        errorResponse.recoveryAction = recoveryAction;
      }

    // Execute recovery action if enabled
    if (this.config.enableRecoveryActions && recoveryAction) {
      await this.executeRecoveryAction(recoveryAction, error, context);
    }

    // Log error if enabled
    if (this.config.enableErrorLogging) {
      this.logErrorDetails(error, context, errorResponse);
    }

    // Update processing time metrics
    const processingTime = Date.now() - startTime;
    this.updateProcessingTimeMetrics(processingTime);

    return errorResponse;
  }

  /**
   * Handle server error with strict error code handling
   */
  public async handleServerError(error: PipelineError, context: PipelineExecutionContext): Promise<ErrorResponse> {
    const startTime = Date.now();
    
    this.error('Handling server error', {
      error,
      context: {
        executionId: context.executionId,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId,
        retryCount: context.retryCount
      }
    }, 'handleServerError');

    // Update error metrics
    this.updateErrorMetrics(error, 'server');

    // Get HTTP status code for server error
    const httpStatus = this.errorHandler.getHttpStatusCode(error.code);

    // Create base error response
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: `Server Error: ${error.message}`,
        category: error.category,
        severity: error.severity,
        pipelineId: error.pipelineId,
        instanceId: error.instanceId,
        timestamp: Date.now(),
        details: {
          ...error.details,
          phase: 'server',
          serverError: true,
          originalError: error.message,
          strictErrorCode: true
        }
      },
      context: {
        executionId: context.executionId,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId,
        retryCount: context.retryCount
      },
      httpStatus
    };

    // Get error handling action
    const recoveryAction = await this.getRecoveryAction(error, context);
    if (recoveryAction) {
        errorResponse.recoveryAction = recoveryAction;
      }

    // Execute recovery action if enabled
    if (this.config.enableRecoveryActions && recoveryAction) {
      await this.executeRecoveryAction(recoveryAction, error, context);
    }

    // Log error if enabled
    if (this.config.enableErrorLogging) {
      this.logErrorDetails(error, context, errorResponse);
    }

    // Update processing time metrics
    const processingTime = Date.now() - startTime;
    this.updateProcessingTimeMetrics(processingTime);

    return errorResponse;
  }

  /**
   * Register custom error handler
   */
  public registerCustomHandler(
    errorCode: PipelineErrorCode, 
    handler: EnhancedErrorHandlerFunction, 
    priority: number = 0,
    description: string = 'Custom handler'
  ): void {
    const registration: ErrorHandlerRegistration = {
      errorCode,
      handler,
      priority,
      description,
      isActive: true,
      registeredAt: Date.now()
    };

    if (!this.customHandlers.has(errorCode)) {
      this.customHandlers.set(errorCode, []);
    }

    const handlers = this.customHandlers.get(errorCode)!;
    handlers.push(registration);
    
    // Sort by priority (higher priority first)
    handlers.sort((a, b) => b.priority - a.priority);

    this.logInfo('Custom error handler registered', {
      errorCode,
      priority,
      description,
      totalHandlers: handlers.length
    }, 'registerCustomHandler');
  }

  /**
   * Unregister custom error handler
   */
  public unregisterCustomHandler(errorCode: PipelineErrorCode, handler: EnhancedErrorHandlerFunction): void {
    const handlers = this.customHandlers.get(errorCode);
    if (handlers) {
      const index = handlers.findIndex(reg => reg.handler === handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.logInfo('Custom error handler unregistered', { errorCode }, 'unregisterCustomHandler');
      }
    }
  }

  /**
   * Get recovery action for error
   */
  private async getRecoveryAction(error: PipelineError, context: PipelineExecutionContext): Promise<ErrorHandlingAction | null> {
    try {
      // Check custom handlers first
      const customHandlers = this.customHandlers.get(error.code);
      if (customHandlers && customHandlers.length > 0) {
        for (const registration of customHandlers) {
          if (registration.isActive) {
            try {
              const errorResponse = await registration.handler(error, context);
              if (errorResponse.recoveryAction) {
                return errorResponse.recoveryAction;
              }
            } catch (handlerError) {
              this.error('Custom error handler failed', {
                errorCode: error.code,
                handlerError: handlerError instanceof Error ? handlerError.message : String(handlerError)
              }, 'getRecoveryAction');
            }
          }
        }
      }

      // Fall back to default error handler
      return await this.errorHandler.handleError(error, context);
    } catch (error) {
      this.error('Failed to get recovery action', {
        originalError: error,
        fallbackAction: 'ignore'
      }, 'getRecoveryAction');
      return null;
    }
  }

  /**
   * Execute recovery action
   */
  private async executeRecoveryAction(action: ErrorHandlingAction, error: PipelineError, context: PipelineExecutionContext): Promise<void> {
    const actionId = uuidv4();
    
    try {
      this.logInfo('Executing recovery action', {
        actionId,
        action: action.action,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId
      }, 'executeRecoveryAction');

      // Update recovery action metrics
      this.updateRecoveryActionMetrics(action.action);

      // Set timeout for recovery action
      const timeoutPromise = new Promise<void>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Recovery action timeout: ${action.action}`));
        }, this.config.recoveryActionTimeout);
        this.recoveryActionTimeouts.set(actionId, timeoutId);
      });

      // Execute action based on type
      await Promise.race([
        this.executeRecoveryActionInternal(action, error, context),
        timeoutPromise
      ]);

      // Clear timeout
      const timeoutId = this.recoveryActionTimeouts.get(actionId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.recoveryActionTimeouts.delete(actionId);
      }

      this.logInfo('Recovery action completed successfully', {
        actionId,
        action: action.action
      }, 'executeRecoveryAction');

    } catch (error) {
      // Clear timeout on error
      const timeoutId = this.recoveryActionTimeouts.get(actionId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.recoveryActionTimeouts.delete(actionId);
      }

      this.error('Recovery action failed', {
        actionId,
        action: action.action,
        error: error instanceof Error ? error.message : String(error)
      }, 'executeRecoveryAction');
    }
  }

  /**
   * Execute recovery action internal implementation
   */
  private async executeRecoveryActionInternal(action: ErrorHandlingAction, error: PipelineError, context: PipelineExecutionContext): Promise<void> {
    switch (action.action) {
      case 'retry':
        // Retry logic is handled by the scheduler
        this.sendMessage('pipeline_retry_requested', {
          executionId: context.executionId,
          pipelineId: context.pipelineId,
          instanceId: context.instanceId,
          retryDelay: action.retryDelay
        });
        break;

      case 'failover':
        // Switch to next available pipeline
        this.sendMessage('pipeline_failover_requested', {
          executionId: context.executionId,
          currentPipelineId: context.pipelineId,
          currentInstanceId: context.instanceId,
          nextPipelineId: action.nextPipelineId
        });
        break;

      case 'blacklist_temporary':
        // Temporarily blacklist pipeline
        this.errorHandler.blacklistPipeline(
          context.pipelineId,
          context.instanceId,
          error,
          action.retryDelay || 60000,
          false
        );
        break;

      case 'blacklist_permanent':
        // Permanently blacklist pipeline
        this.errorHandler.blacklistPipeline(
          context.pipelineId,
          context.instanceId,
          error,
          0,
          true
        );
        break;

      case 'maintenance':
        // Enter maintenance mode
        this.sendMessage('pipeline_maintenance_requested', {
          pipelineId: context.pipelineId,
          instanceId: context.instanceId,
          error,
          reason: 'authentication_error'
        });
        break;

      case 'ignore':
        // No action needed
        break;

      default:
        this.warn('Unknown recovery action', { action: action.action }, 'executeRecoveryActionInternal');
    }
  }

  /**
   * Update error metrics
   */
  private updateErrorMetrics(error: PipelineError, errorType: 'local' | 'server'): void {
    if (!this.config.enableErrorMetrics) return;

    this.errorMetrics.totalErrors++;
    this.errorMetrics.lastErrorTime = Date.now();

    // Update by error code
    const codeCount = this.errorMetrics.errorsByCode.get(error.code) || 0;
    this.errorMetrics.errorsByCode.set(error.code, codeCount + 1);

    // Update by category
    const categoryCount = this.errorMetrics.errorsByCategory.get(error.category) || 0;
    this.errorMetrics.errorsByCategory.set(error.category, categoryCount + 1);

    // Update by pipeline
    if (error.pipelineId) {
      const pipelineCount = this.errorMetrics.errorsByPipeline.get(error.pipelineId) || 0;
      this.errorMetrics.errorsByPipeline.set(error.pipelineId, pipelineCount + 1);
    }

    // Update by error type
    if (errorType === 'local') {
      this.errorMetrics.localErrors++;
    } else {
      this.errorMetrics.serverErrors++;
    }

    // Add to error history
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.config.maxErrorHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * Update recovery action metrics
   */
  private updateRecoveryActionMetrics(action: string): void {
    if (!this.config.enableErrorMetrics) return;

    const actionCount = this.errorMetrics.recoveryActions.get(action) || 0;
    this.errorMetrics.recoveryActions.set(action, actionCount + 1);
  }

  /**
   * Update processing time metrics
   */
  private updateProcessingTimeMetrics(processingTime: number): void {
    if (!this.config.enableErrorMetrics) return;

    // Update average processing time using exponential smoothing
    const alpha = 0.1;
    this.errorMetrics.averageProcessingTime = 
      (alpha * processingTime) + ((1 - alpha) * this.errorMetrics.averageProcessingTime);
  }

  /**
   * Log error details
   */
  private logErrorDetails(error: PipelineError, context: PipelineExecutionContext, response: ErrorResponse): void {
    this.log('Error details logged', {
      error: {
        code: error.code,
        message: error.message,
        category: error.category,
        severity: error.severity
      },
      context: {
        executionId: context.executionId,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId,
        retryCount: context.retryCount
      },
      response: {
        httpStatus: response.httpStatus,
        recoveryAction: response.recoveryAction?.action
      }
    }, 'logErrorDetails');
  }

  /**
   * Register custom handlers from config
   */
  private registerCustomHandlersFromConfig(): void {
    for (const registration of this.config.customErrorHandlers) {
      this.registerCustomHandler(
        registration.errorCode,
        registration.handler,
        registration.priority,
        registration.description
      );
    }
  }

  /**
   * Start error cleanup
   */
  private startErrorCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupErrorHistory();
    }, this.config.errorCleanupInterval);

    this.logInfo('Error cleanup started', { 
      interval: this.config.errorCleanupInterval 
    }, 'startErrorCleanup');
  }

  /**
   * Cleanup error history
   */
  private cleanupErrorHistory(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    const initialSize = this.errorHistory.length;

    this.errorHistory = this.errorHistory.filter(error => error.timestamp > cutoffTime);

    if (this.errorHistory.length < initialSize) {
      this.logInfo('Error history cleaned up', {
        removedCount: initialSize - this.errorHistory.length,
        remainingCount: this.errorHistory.length
      }, 'cleanupErrorHistory');
    }
  }

  /**
   * Register message handlers
   */
  private registerMessageHandlers(): void {
    // Message handlers are handled through the handleMessage method
    // This method is kept for compatibility but doesn't register handlers directly
    this.logInfo('Message handlers registration completed', {}, 'registerMessageHandlers');
  }

  /**
   * Handle incoming messages
   */
  public override async handleMessage(message: Message): Promise<MessageResponse | void> {
    this.log('Handling message', { type: message.type, source: message.source }, 'handleMessage');

    switch (message.type) {
      case 'ping':
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { 
            pong: true, 
            moduleId: this.info.id,
            timestamp: Date.now(),
            metrics: this.getErrorMetrics()
          },
          timestamp: Date.now()
        };

      case 'register_custom_handler':
        const { errorCode, handler, priority, description } = message.payload;
        this.registerCustomHandler(errorCode, handler, priority, description);
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { message: 'Custom handler registered' },
          timestamp: Date.now()
        };

      case 'unregister_custom_handler':
        const { errorCode: unregisterErrorCode, handler: unregisterHandler } = message.payload;
        this.unregisterCustomHandler(unregisterErrorCode, unregisterHandler);
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { message: 'Custom handler unregistered' },
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
   * Get error metrics
   */
  public getErrorMetrics(): ErrorMetrics {
    return { ...this.errorMetrics };
  }

  /**
   * Get error history
   */
  public getErrorHistory(): PipelineError[] {
    return [...this.errorHistory];
  }

  /**
   * Create initial error metrics
   */
  private createInitialErrorMetrics(): ErrorMetrics {
    return {
      totalErrors: 0,
      errorsByCode: new Map(),
      errorsByCategory: new Map(),
      errorsByPipeline: new Map(),
      localErrors: 0,
      serverErrors: 0,
      recoveryActions: new Map(),
      averageProcessingTime: 0,
      lastErrorTime: 0
    };
  }

  /**
   * Destroy the enhanced error response center
   */
  public override async destroy(): Promise<void> {
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clear recovery action timeouts
    for (const timeoutId of this.recoveryActionTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.recoveryActionTimeouts.clear();

    // Clear custom handlers
    this.customHandlers.clear();

    // Clear error history
    this.errorHistory = [];

    await super.destroy();
    
    this.logInfo('Enhanced error response center destroyed', {}, 'destroy');
  }
}