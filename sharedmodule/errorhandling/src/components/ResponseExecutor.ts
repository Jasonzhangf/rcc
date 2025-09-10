import { 
  ErrorContext, 
  ErrorResponse, 
  ResponseHandler,
  Action,
  ActionType,
  HandlingStatus,
  ActionStatus
} from '../../../SharedTypes';
import { PolicyEngine } from './PolicyEngine';

/**
 * Response Executor - Executes actual error response logic
 * Handles synchronous, asynchronous, and batch execution modes
 */
export class ResponseExecutor {
  private policyEngine: PolicyEngine;
  private executionMetrics: Map<string, ExecutionMetrics> = new Map();
  private isInitialized: boolean = false;
  private enableMetrics: boolean = true;
  private maxConcurrentExecutions: number = 10;
  private currentExecutions: number = 0;
  
  /**
   * Constructs the Response Executor
   * @param policyEngine - Policy engine instance
   */
  constructor(policyEngine: PolicyEngine) {
    this.policyEngine = policyEngine;
  }

  /**
   * Initialize the response executor
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.policyEngine.initialize();
      
      this.isInitialized = true;
      console.log('Response Executor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Response Executor:', error);
      throw error;
    }
  }

  /**
   * Execute error response synchronously
   * @param error - Error context to handle
   * @param handler - Response handler
   * @returns Promise<ErrorResponse> - Error response
   */
  public async executeSync(
    error: ErrorContext, 
    handler: ResponseHandler
  ): Promise<ErrorResponse> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const executionId = this.generateExecutionId(error.errorId);
    
    try {
      await this.acquireExecutionSlot();
      
      if (this.enableMetrics) {
        console.log(`Executing sync response for error ${error.errorId}`);
      }

      // Create base response
      const baseResponse = await this.createBaseResponse(error, handler, executionId);
      
      // Apply policies
      const policyEnhancedResponse = await this.policyEngine.executePolicies(error, baseResponse);
      
      // Execute actions
      const finalResponse = await this.executeActions(policyEnhancedResponse, error);
      
      // Record metrics
      this.recordExecutionMetrics(executionId, 'sync', Date.now() - startTime, true);
      
      return finalResponse;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error(`Error in sync execution:`, errorObj);
      
      // Record failure metrics
      this.recordExecutionMetrics(executionId, 'sync', Date.now() - startTime, false);
      
      // Create fallback response
      return this.createFallbackResponse('unknown', errorObj);
    } finally {
      this.releaseExecutionSlot();
    }
  }

  /**
   * Execute error response asynchronously
   * @param error - Error context to handle
   * @param handler - Response handler
   * @returns Promise<ErrorResponse> - Error response (for tracking purposes)
   */
  public async executeAsync(
    error: ErrorContext, 
    handler: ResponseHandler
  ): Promise<ErrorResponse> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const executionId = this.generateExecutionId(error.errorId);
    
    try {
      if (this.enableMetrics) {
        console.log(`Executing async response for error ${error.errorId}`);
      }

      // Create base response immediately
      const baseResponse = await this.createBaseResponse(error, handler, executionId);
      
      // Schedule async processing
      this.processAsync(error, baseResponse, handler, executionId);
      
      // Record async start metrics
      this.recordExecutionMetrics(executionId, 'async', 0, false); // Will be updated when completed
      
      // Return immediate response
      return {
        ...baseResponse,
        result: {
          status: HandlingStatus.PARTIAL,
          message: 'Error processing scheduled for async execution',
          details: 'Response will be processed in background',
          code: 'ASYNC_SCHEDULED'
        },
        actions: []
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error(`Error scheduling async execution:`, errorObj);
      
      // Record failure metrics
      this.recordExecutionMetrics(executionId, 'async', Date.now() - startTime, false);
      
      return this.createFallbackResponse('unknown', errorObj);
    }
  }

  /**
   * Execute batch error responses
   * @param errors - Array of error contexts
   * @param handlers - Response handlers (one per error or default for all)
   * @returns Promise<ErrorResponse[]> - Array of error responses
   */
  public async executeBatch(
    errors: ErrorContext[], 
    handlers: (ResponseHandler | ResponseHandler[])
  ): Promise<ErrorResponse[]> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const responses: ErrorResponse[] = [];
    
    try {
      if (this.enableMetrics) {
        console.log(`Executing batch response for ${errors.length} errors`);
      }

      // Validate handlers
      const handlerArray = Array.isArray(handlers) ? handlers : 
        errors.map(() => handlers as ResponseHandler);
      
      if (handlerArray.length !== errors.length) {
        throw new Error('Number of handlers must match number of errors');
      }

      // Process errors in batches to limit concurrency
      const batchSize = Math.min(this.maxConcurrentExecutions, 5);
      
      for (let i = 0; i < errors.length; i += batchSize) {
        const batch = errors.slice(i, i + batchSize);
        const batchHandlers = handlerArray.slice(i, i + batchSize);
        
        const batchPromises = batch.map((error, index) =>
          this.executeWithErrorHandling(error, batchHandlers[index], `batch_${i}_${index}`)
        );
        
        const batchResponses = await Promise.all(batchPromises);
        responses.push(...batchResponses);
      }

      const totalTime = Date.now() - startTime;
      console.log(`Batch execution completed for ${responses.length} errors in ${totalTime}ms`);
      
      return responses;
    } catch (error) {
      console.error('Error in batch execution:', error);
      
      // Create fallback responses for all errors
      return errors.map(err => this.createFallbackResponse(err.errorId, error as Error));
    }
  }

  /**
   * Execute single error with error handling
   * @param error - Error context
   * @param handler - Response handler
   * @param executionId - Execution ID for metrics
   * @returns Promise<ErrorResponse> - Error response
   */
  private async executeWithErrorHandling(
    error: ErrorContext, 
    handler: ResponseHandler,
    executionId: string
  ): Promise<ErrorResponse> {
    try {
      return await this.executeSync(error, handler);
    } catch (processingError) {
      const errorObj = processingError instanceof Error ? processingError : new Error(String(processingError));
      console.error(`Error in execution ${executionId}:`, errorObj);
      return this.createFallbackResponse(error.errorId, errorObj);
    }
  }

  /**
   * Create base error response
   * @param error - Error context
   * @param handler - Response handler
   * @param executionId - Execution ID
   * @returns Promise<ErrorResponse> - Base error response
   */
  private async createBaseResponse(
    error: ErrorContext, 
    handler: ResponseHandler,
    executionId: string
  ): Promise<ErrorResponse> {
    try {
      // Get response from handler - handler returns ErrorResponse directly
      const handlerResponse: ErrorResponse = await handler.execute(error);
      
      return {
        ...handlerResponse,
        responseId: executionId,
        processingTime: handlerResponse.processingTime || 0
      };
    } catch (handlerError) {
      const errorObj = handlerError instanceof Error ? handlerError : new Error(String(handlerError));
      console.error(`Error getting base response for ${error.errorId}:`, errorObj);
      
      // Create minimal base response on handler failure
      return {
        responseId: executionId,
        errorId: error.errorId,
        result: {
          status: HandlingStatus.FAILURE,
          message: 'Failed to get module response',
          details: `Handler error: ${errorObj.message}`,
          code: 'HANDLER_FAILURE'
        },
        timestamp: new Date(),
        processingTime: 0,
        data: {
          moduleName: error.source.moduleName,
          moduleId: error.source.moduleId,
          response: { error: 'Handler failed' },
          config: error.config,
          metadata: { handlerFailed: true }
        },
        actions: [],
        annotations: []
      };
    }
  }

  /**
   * Execute response actions
   * @param response - Response with actions to execute
   * @param error - Error context
   * @returns Promise<ErrorResponse> - Response with executed actions
   */
  private async executeActions(
    response: ErrorResponse, 
    error: ErrorContext
  ): Promise<ErrorResponse> {
    const executedActions: Action[] = [];
    
    for (const action of response.actions) {
      try {
        const executedAction = await this.executeAction(action, error);
        executedActions.push(executedAction);
      } catch (actionError) {
        console.error(`Error executing action ${action.actionId}:`, actionError);
        
        // Mark action as failed but continue with others
        executedActions.push({
          ...action,
          status: ActionStatus.FAILED
        });
      }
    }
    
    return {
      ...response,
      actions: executedActions
    };
  }

  /**
   * Execute a single action
   * @param action - Action to execute
   * @param error - Error context
   * @returns Promise<Action> - Executed action
   */
  private async executeAction(action: Action, error: ErrorContext): Promise<Action> {
    if (this.enableMetrics) {
      console.log(`Executing action ${action.actionId} (${action.type})`);
    }

    const startTime = Date.now();
    
    try {
      switch (action.type) {
        case ActionType.RETRY:
          return await this.executeRetryAction(action, error);
        case ActionType.FALLBACK:
          return await this.executeFallbackAction(action, error);
        case ActionType.LOG:
          return await this.executeLogAction(action, error);
        case ActionType.NOTIFY:
          return await this.executeNotifyAction(action, error);
        case ActionType.ISOLATE:
          return await this.executeIsolateAction(action, error);
        case ActionType.RESTART:
          return await this.executeRestartAction(action, error);
        case ActionType.CUSTOM:
          return await this.executeCustomAction(action, error);
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } finally {
      if (this.enableMetrics) {
        const executionTime = Date.now() - startTime;
        console.log(`Action ${action.actionId} executed in ${executionTime}ms`);
      }
    }
  }

  /**
   * Execute retry action
   * @param action - Retry action
   * @param error - Error context
   * @returns Executed action
   */
  private async executeRetryAction(action: Action, error: ErrorContext): Promise<Action> {
    // Schedule retry (in a real implementation, this would use a retry scheduler)
    console.log(`Scheduling retry for error ${error.errorId}:`, action.payload);
    
    return {
      ...action,
      status: ActionStatus.COMPLETED
    };
  }

  /**
   * Execute fallback action
   * @param action - Fallback action
   * @param error - Error context
   * @returns Executed action
   */
  private async executeFallbackAction(action: Action, error: ErrorContext): Promise<Action> {
    console.log(`Executing fallback for error ${error.errorId}:`, action.payload);
    
    return {
      ...action,
      status: ActionStatus.COMPLETED
    };
  }

  /**
   * Execute log action
   * @param action - Log action
   * @param error - Error context
   * @returns Executed action
   */
  private async executeLogAction(action: Action, error: ErrorContext): Promise<Action> {
    console.log(`Logging error ${error.errorId}:`, {
      error: error.error.message,
      severity: error.classification.severity,
      module: error.source.moduleName,
      payload: action.payload
    });
    
    return {
      ...action,
      status: ActionStatus.COMPLETED
    };
  }

  /**
   * Execute notify action
   * @param action - Notify action
   * @param error - Error context
   * @returns Executed action
   */
  private async executeNotifyAction(action: Action, error: ErrorContext): Promise<Action> {
    console.log(`Sending notification for error ${error.errorId}:`, action.payload);
    
    // In a real implementation, this would send actual notifications
    // via email, Slack, webhook, etc.
    
    return {
      ...action,
      status: ActionStatus.COMPLETED
    };
  }

  /**
   * Execute isolate action
   * @param action - Isolate action
   * @param error - Error context
   * @returns Executed action
   */
  private async executeIsolateAction(action: Action, error: ErrorContext): Promise<Action> {
    console.log(`Isolating module ${error.source.moduleId}:`, action.payload);
    
    // Update policy engine circuit breaker
    this.policyEngine.updateCircuitBreaker(error.source.moduleId, false, action.payload);
    
    return {
      ...action,
      status: ActionStatus.COMPLETED
    };
  }

  /**
   * Execute restart action
   * @param action - Restart action
   * @param error - Error context
   * @returns Executed action
   */
  private async executeRestartAction(action: Action, error: ErrorContext): Promise<Action> {
    console.log(`Restarting module ${error.source.moduleId}:`, action.payload);
    
    // In a real implementation, this would restart the module
    // or trigger module recovery procedures
    
    return {
      ...action,
      status: ActionStatus.COMPLETED
    };
  }

  /**
   * Execute custom action
   * @param action - Custom action
   * @param error - Error context
   * @returns Executed action
   */
  private async executeCustomAction(action: Action, _error: ErrorContext): Promise<Action> {
    console.log(`Executing custom action ${action.actionId}:`, action.payload);
    
    // In a real implementation, this would execute custom logic
    // based on the action configuration
    
    return {
      ...action,
      status: ActionStatus.COMPLETED
    };
  }

  /**
   * Process error asynchronously in background
   * @param error - Error context
   * @param baseResponse - Base response (already created)
   * @param handler - Response handler
   * @param executionId - Execution ID
   */
  private async processAsync(
    error: ErrorContext,
    baseResponse: ErrorResponse,
    _handler: ResponseHandler,
    executionId: string
  ): Promise<void> {
    try {
      // Apply policies
      const policyEnhancedResponse = await this.policyEngine.executePolicies(error, baseResponse);
      
      // Execute actions
      const finalResponse = await this.executeActions(policyEnhancedResponse, error);
      
      // Update metrics
      this.updateExecutionMetrics(executionId, Date.now() - baseResponse.timestamp.getTime(), true);
      
      // Call callback if provided
      if (error.callback) {
        error.callback(finalResponse);
      }
      
      if (this.enableMetrics) {
        console.log(`Async execution completed for error ${error.errorId}`);
      }
    } catch (asyncError) {
      console.error(`Error in async processing for ${error.errorId}:`, asyncError);
      
      // Update failure metrics
      this.updateExecutionMetrics(executionId, Date.now() - baseResponse.timestamp.getTime(), false);
      
      // Call callback with fallback response
      if (error.callback) {
        const fallbackResponse = this.createFallbackResponse(error.errorId, asyncError as Error);
        error.callback(fallbackResponse);
      }
    }
  }

  /**
   * Create fallback response on execution failure
   * @param errorId - Original error ID
   * @param error - Processing error
   * @returns Fallback error response
   */
  private createFallbackResponse(errorId: string, error: Error): ErrorResponse {
    return {
      responseId: `fallback_${errorId}_${Date.now()}`,
      errorId,
      result: {
        status: HandlingStatus.FAILURE,
        message: 'Error execution failed - fallback response provided',
        details: `Execution error: ${error.message}`,
        code: 'EXECUTION_FAILED'
      },
      timestamp: new Date(),
      processingTime: 0,
      data: {
        moduleName: 'FallbackExecutor',
        moduleId: 'fallback_executor',
        response: { message: 'Fallback response due to execution failure' },
        config: {},
        metadata: { 
          isFallback: true,
          originalError: error.message,
          originalStack: error.stack
        }
      },
      actions: [],
      annotations: []
    };
  }

  /**
   * Acquire execution slot (concurrency control)
   */
  private async acquireExecutionSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.currentExecutions < this.maxConcurrentExecutions) {
          this.currentExecutions++;
          resolve();
        } else {
          setTimeout(checkSlot, 10); // Check again in 10ms
        }
      };
      checkSlot();
    });
  }

  /**
   * Release execution slot
   */
  private releaseExecutionSlot(): void {
    if (this.currentExecutions > 0) {
      this.currentExecutions--;
    }
  }

  /**
   * Record execution metrics
   * @param executionId - Execution ID
   * @param mode - Execution mode
   * @param duration - Execution duration
   * @param success - Whether execution was successful
   */
  private recordExecutionMetrics(
    executionId: string, 
    mode: 'sync' | 'async' | 'batch', 
    duration: number, 
    success: boolean
  ): void {
    const metrics: ExecutionMetrics = {
      executionId,
      mode,
      duration,
      success,
      timestamp: Date.now()
    };
    
    this.executionMetrics.set(executionId, metrics);
    
    if (this.enableMetrics) {
      console.log(`Execution metrics recorded: ${JSON.stringify(metrics)}`);
    }
  }

  /**
   * Update execution metrics (for async completion)
   * @param executionId - Execution ID
   * @param duration - Execution duration
   * @param success - Whether execution was successful
   */
  private updateExecutionMetrics(
    executionId: string, 
    duration: number, 
    success: boolean
  ): void {
    const metrics = this.executionMetrics.get(executionId);
    if (metrics) {
      metrics.duration = duration;
      metrics.success = success;
      metrics.timestamp = Date.now();
      
      if (this.enableMetrics) {
        console.log(`Execution metrics updated: ${JSON.stringify(metrics)}`);
      }
    }
  }

  /**
   * Generate execution ID
   * @param errorId - Error ID
   * @returns Generated execution ID
   */
  private generateExecutionId(errorId: string): string {
    return `exec_${errorId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get execution metrics
   * @returns Map of execution metrics
   */
  public getExecutionMetrics(): Map<string, ExecutionMetrics> {
    return new Map(this.executionMetrics);
  }

  /**
   * Clear execution metrics
   */
  public clearExecutionMetrics(): void {
    this.executionMetrics.clear();
  }

  /**
   * Get executor status
   * @returns Executor status information
   */
  public getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      enableMetrics: this.enableMetrics,
      maxConcurrentExecutions: this.maxConcurrentExecutions,
      currentExecutions: this.currentExecutions,
      executionMetricsCount: this.executionMetrics.size,
      policyEngineStatus: this.policyEngine.getStatus()
    };
  }

  /**
   * Enable or disable metrics collection
   * @param enabled - Whether to enable metrics
   */
  public setMetricsEnabled(enabled: boolean): void {
    this.enableMetrics = enabled;
  }

  /**
   * Set maximum concurrent executions
   * @param max - Maximum concurrent executions
   */
  public setMaxConcurrentExecutions(max: number): void {
    this.maxConcurrentExecutions = Math.max(1, max);
  }

  /**
   * Shutdown the response executor
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Shutting down Response Executor...');
      
      // Shutdown policy engine
      await this.policyEngine.shutdown();
      
      // Clear execution metrics
      this.clearExecutionMetrics();
      
      this.isInitialized = false;
      console.log('Response Executor shutdown completed');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }


  
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Response Executor is not initialized. Call initialize() first.');
    }
  }
}

/**
 * Execution metrics tracking
 */
interface ExecutionMetrics {
  executionId: string;
  mode: 'sync' | 'async' | 'batch';
  duration: number;
  success: boolean;
  timestamp: number;
}