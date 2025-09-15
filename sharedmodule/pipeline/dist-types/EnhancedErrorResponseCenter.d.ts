/**
 * Enhanced Error Response Center for pipeline scheduling system
 * Provides comprehensive error handling, recovery, and response management
 */
import { BaseModule } from 'rcc-basemodule';
import { Message, MessageResponse } from 'rcc-basemodule';
import { PipelineError, PipelineErrorCode, PipelineExecutionContext, ErrorHandlingAction, PipelineErrorCategory } from './ErrorTypes';
import { PipelineConfigManager } from './PipelineConfig';
import { ErrorHandlerCenter } from './ErrorHandlerCenter';
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
export declare class EnhancedErrorResponseCenter extends BaseModule {
    private configManager;
    private errorHandler;
    config: ErrorResponseCenterConfig;
    private customHandlers;
    private errorHistory;
    private errorMetrics;
    private cleanupInterval;
    private recoveryActionTimeouts;
    constructor(configManager: PipelineConfigManager, errorHandler: ErrorHandlerCenter, config: ErrorResponseCenterConfig);
    /**
     * Initialize the enhanced error response center
     */
    initialize(): Promise<void>;
    /**
     * Handle local error (send phase - 500 error)
     */
    handleLocalError(error: PipelineError, context: PipelineExecutionContext): Promise<ErrorResponse>;
    /**
     * Handle local error (receive phase - 501 error)
     */
    handleReceiveError(error: PipelineError, context: PipelineExecutionContext): Promise<ErrorResponse>;
    /**
     * Handle server error with strict error code handling
     */
    handleServerError(error: PipelineError, context: PipelineExecutionContext): Promise<ErrorResponse>;
    /**
     * Register custom error handler
     */
    registerCustomHandler(errorCode: PipelineErrorCode, handler: EnhancedErrorHandlerFunction, priority?: number, description?: string): void;
    /**
     * Unregister custom error handler
     */
    unregisterCustomHandler(errorCode: PipelineErrorCode, handler: EnhancedErrorHandlerFunction): void;
    /**
     * Get recovery action for error
     */
    private getRecoveryAction;
    /**
     * Execute recovery action
     */
    private executeRecoveryAction;
    /**
     * Execute recovery action internal implementation
     */
    private executeRecoveryActionInternal;
    /**
     * Update error metrics
     */
    private updateErrorMetrics;
    /**
     * Update recovery action metrics
     */
    private updateRecoveryActionMetrics;
    /**
     * Update processing time metrics
     */
    private updateProcessingTimeMetrics;
    /**
     * Log error details
     */
    private logErrorDetails;
    /**
     * Register custom handlers from config
     */
    private registerCustomHandlersFromConfig;
    /**
     * Start error cleanup
     */
    private startErrorCleanup;
    /**
     * Cleanup error history
     */
    private cleanupErrorHistory;
    /**
     * Register message handlers
     */
    private registerMessageHandlers;
    /**
     * Handle incoming messages
     */
    handleMessage(message: Message): Promise<MessageResponse | void>;
    /**
     * Get error metrics
     */
    getErrorMetrics(): ErrorMetrics;
    /**
     * Get error history
     */
    getErrorHistory(): PipelineError[];
    /**
     * Create initial error metrics
     */
    private createInitialErrorMetrics;
    /**
     * Destroy the enhanced error response center
     */
    destroy(): Promise<void>;
}
//# sourceMappingURL=EnhancedErrorResponseCenter.d.ts.map