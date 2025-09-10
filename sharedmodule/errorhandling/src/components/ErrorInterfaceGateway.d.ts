import { IErrorHandlingCenter, ErrorContext, ErrorResponse, ModuleRegistration } from '../../../SharedTypes';
import { ErrorQueueManager } from './ErrorQueueManager';
import { ResponseRouterEngine } from './ResponseRouterEngine';
/**
 * Error Interface Gateway - Main entry point for all external error requests
 * Acts as the primary interface for the Error Handling Center
 */
export declare class ErrorInterfaceGateway implements IErrorHandlingCenter {
    private queueManager;
    private routerEngine;
    private isInitialized;
    private enableMetrics;
    /**
     * Constructs the Error Interface Gateway
     * @param queueManager - Error queue manager instance
     * @param routerEngine - Response router engine instance
     */
    constructor(queueManager: ErrorQueueManager, routerEngine: ResponseRouterEngine);
    /**
     * Initialize the Error Interface Gateway
     */
    initialize(): Promise<void>;
    /**
     * Handle error in blocking mode
     * @param error - Error context to handle
     * @returns Promise<ErrorResponse> - Error response
     */
    handleError(error: ErrorContext): Promise<ErrorResponse>;
    /**
     * Handle error in non-blocking mode
     * @param error - Error context to handle
     */
    handleErrorAsync(error: ErrorContext): void;
    /**
     * Handle multiple errors in batch
     * @param errors - Array of error contexts to handle
     * @returns Promise<ErrorResponse[]> - Array of error responses
     */
    handleBatchErrors(errors: ErrorContext[]): Promise<ErrorResponse[]>;
    /**
     * Register a module with the error handling center
     * @param module - Module registration information
     */
    registerModule(module: ModuleRegistration): void;
    /**
     * Unregister a module from the error handling center
     * @param moduleId - Module ID to unregister
     */
    unregisterModule(moduleId: string): void;
    /**
     * Shutdown the error handling center
     */
    shutdown(): Promise<void>;
    /**
     * Get gateway status
     * @returns Gateway status information
     */
    getStatus(): any;
    /**
     * Enable or disable metrics collection
     * @param enabled - Whether to enable metrics
     */
    setMetricsEnabled(enabled: boolean): void;
    /**
     * Ensure gateway is initialized
     * @throws Error if not initialized
     */
    private ensureInitialized;
    /**
     * Process error asynchronously in background
     * @param error - Error context to process
     */
    private processAsync;
    /**
     * Process all errors in the queue
     */
    private processQueue;
    /**
     * Create fallback response for error processing failures
     * @param errorId - Original error ID
     * @param error - Processing error
     * @returns Fallback error response
     */
    private createFallbackResponse;
}
