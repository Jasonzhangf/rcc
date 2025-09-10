import { ErrorContext, ErrorResponse, ResponseHandler } from '../../../SharedTypes';
import { PolicyEngine } from './PolicyEngine';
/**
 * Response Executor - Executes actual error response logic
 * Handles synchronous, asynchronous, and batch execution modes
 */
export declare class ResponseExecutor {
    private policyEngine;
    private executionMetrics;
    private isInitialized;
    private enableMetrics;
    private maxConcurrentExecutions;
    private currentExecutions;
    /**
     * Constructs the Response Executor
     * @param policyEngine - Policy engine instance
     */
    constructor(policyEngine: PolicyEngine);
    /**
     * Initialize the response executor
     */
    initialize(): Promise<void>;
    /**
     * Execute error response synchronously
     * @param error - Error context to handle
     * @param handler - Response handler
     * @returns Promise<ErrorResponse> - Error response
     */
    executeSync(error: ErrorContext, handler: ResponseHandler): Promise<ErrorResponse>;
    /**
     * Execute error response asynchronously
     * @param error - Error context to handle
     * @param handler - Response handler
     * @returns Promise<ErrorResponse> - Error response (for tracking purposes)
     */
    executeAsync(error: ErrorContext, handler: ResponseHandler): Promise<ErrorResponse>;
    /**
     * Execute batch error responses
     * @param errors - Array of error contexts
     * @param handlers - Response handlers (one per error or default for all)
     * @returns Promise<ErrorResponse[]> - Array of error responses
     */
    executeBatch(errors: ErrorContext[], handlers: (ResponseHandler | ResponseHandler[])): Promise<ErrorResponse[]>;
    /**
     * Execute single error with error handling
     * @param error - Error context
     * @param handler - Response handler
     * @param executionId - Execution ID for metrics
     * @returns Promise<ErrorResponse> - Error response
     */
    private executeWithErrorHandling;
    /**
     * Create base error response
     * @param error - Error context
     * @param handler - Response handler
     * @param executionId - Execution ID
     * @returns Promise<ErrorResponse> - Base error response
     */
    private createBaseResponse;
    /**
     * Execute response actions
     * @param response - Response with actions to execute
     * @param error - Error context
     * @returns Promise<ErrorResponse> - Response with executed actions
     */
    private executeActions;
    /**
     * Execute a single action
     * @param action - Action to execute
     * @param error - Error context
     * @returns Promise<Action> - Executed action
     */
    private executeAction;
    /**
     * Execute retry action
     * @param action - Retry action
     * @param error - Error context
     * @returns Executed action
     */
    private executeRetryAction;
    /**
     * Execute fallback action
     * @param action - Fallback action
     * @param error - Error context
     * @returns Executed action
     */
    private executeFallbackAction;
    /**
     * Execute log action
     * @param action - Log action
     * @param error - Error context
     * @returns Executed action
     */
    private executeLogAction;
    /**
     * Execute notify action
     * @param action - Notify action
     * @param error - Error context
     * @returns Executed action
     */
    private executeNotifyAction;
    /**
     * Execute isolate action
     * @param action - Isolate action
     * @param error - Error context
     * @returns Executed action
     */
    private executeIsolateAction;
    /**
     * Execute restart action
     * @param action - Restart action
     * @param error - Error context
     * @returns Executed action
     */
    private executeRestartAction;
    /**
     * Execute custom action
     * @param action - Custom action
     * @param error - Error context
     * @returns Executed action
     */
    private executeCustomAction;
    /**
     * Process error asynchronously in background
     * @param error - Error context
     * @param baseResponse - Base response (already created)
     * @param handler - Response handler
     * @param executionId - Execution ID
     */
    private processAsync;
    /**
     * Create fallback response on execution failure
     * @param errorId - Original error ID
     * @param error - Processing error
     * @returns Fallback error response
     */
    private createFallbackResponse;
    /**
     * Acquire execution slot (concurrency control)
     */
    private acquireExecutionSlot;
    /**
     * Release execution slot
     */
    private releaseExecutionSlot;
    /**
     * Record execution metrics
     * @param executionId - Execution ID
     * @param mode - Execution mode
     * @param duration - Execution duration
     * @param success - Whether execution was successful
     */
    private recordExecutionMetrics;
    /**
     * Update execution metrics (for async completion)
     * @param executionId - Execution ID
     * @param duration - Execution duration
     * @param success - Whether execution was successful
     */
    private updateExecutionMetrics;
    /**
     * Generate execution ID
     * @param errorId - Error ID
     * @returns Generated execution ID
     */
    private generateExecutionId;
    /**
     * Get execution metrics
     * @returns Map of execution metrics
     */
    getExecutionMetrics(): Map<string, ExecutionMetrics>;
    /**
     * Clear execution metrics
     */
    clearExecutionMetrics(): void;
    /**
     * Get executor status
     * @returns Executor status information
     */
    getStatus(): any;
    /**
     * Enable or disable metrics collection
     * @param enabled - Whether to enable metrics
     */
    setMetricsEnabled(enabled: boolean): void;
    /**
     * Set maximum concurrent executions
     * @param max - Maximum concurrent executions
     */
    setMaxConcurrentExecutions(max: number): void;
    /**
     * Shutdown the response executor
     */
    shutdown(): Promise<void>;
    private ensureInitialized;
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
export {};
