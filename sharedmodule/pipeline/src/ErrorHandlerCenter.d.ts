/**
 * Error handler center for pipeline scheduling system
 */
import { BaseModule } from 'rcc-basemodule';
import { Message, MessageResponse } from 'rcc-basemodule';
import { PipelineError, PipelineErrorCode, PipelineExecutionContext, PipelineExecutionResult, ErrorHandlingAction, PipelineBlacklistEntry, PipelineErrorCategory } from './ErrorTypes';
import { PipelineConfigManager } from './PipelineConfig';
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
    blacklistPipeline(pipelineId: string, instanceId: string, error: PipelineError, duration: number, isPermanent?: boolean): void;
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
export declare class ErrorHandlerCenter extends BaseModule implements IErrorHandlerCenter {
    private configManager;
    private customHandlers;
    private blacklistedPipelines;
    private errorStats;
    private blacklistCleanupInterval;
    constructor(configManager: PipelineConfigManager);
    /**
     * Initialize the error handler center
     */
    initialize(): Promise<void>;
    /**
     * Handle a pipeline error
     */
    handleError(error: PipelineError, context: PipelineExecutionContext): Promise<ErrorHandlingAction>;
    /**
     * Handle execution result (for tracking successful executions)
     */
    handleExecutionResult(result: PipelineExecutionResult, context: PipelineExecutionContext): Promise<void>;
    /**
     * Register custom error handler
     */
    registerCustomHandler(errorCode: PipelineErrorCode, handler: (error: PipelineError, context: PipelineExecutionContext) => Promise<ErrorHandlingAction>): void;
    /**
     * Unregister custom error handler
     */
    unregisterCustomHandler(errorCode: PipelineErrorCode): void;
    /**
     * Get blacklisted pipelines
     */
    getBlacklistedPipelines(): PipelineBlacklistEntry[];
    /**
     * Check if pipeline is blacklisted
     */
    isPipelineBlacklisted(pipelineId: string): boolean;
    /**
     * Blacklist a pipeline
     */
    blacklistPipeline(pipelineId: string, instanceId: string, error: PipelineError, duration: number, isPermanent?: boolean): void;
    /**
     * Remove pipeline from blacklist
     */
    unblacklistPipeline(pipelineId: string): void;
    /**
     * Get error statistics
     */
    getErrorStats(): ErrorStats;
    /**
     * Clear error statistics
     */
    clearErrorStats(): void;
    /**
     * Get error handling strategy for error code
     */
    private getErrorHandlingStrategy;
    /**
     * Apply default error handling strategy
     */
    private applyDefaultStrategy;
    /**
     * Update error statistics
     */
    private updateErrorStats;
    /**
     * Start blacklist cleanup
     */
    private startBlacklistCleanup;
    /**
     * Cleanup expired blacklist entries
     */
    private cleanupExpiredBlacklistEntries;
    /**
     * Register message handlers
     */
    private registerMessageHandlers;
    /**
     * Handle incoming messages
     */
    handleMessage(message: Message): Promise<MessageResponse | void>;
    /**
     * Create initial error statistics
     */
    private createInitialErrorStats;
    /**
     * Destroy the error handler center
     */
    destroy(): Promise<void>;
    /**
     * Get HTTP status code for error
     */
    getHttpStatusCode(errorCode: PipelineErrorCode): number;
    /**
     * Create error response for API
     */
    createErrorResponse(error: PipelineError, context?: PipelineExecutionContext): Record<string, any>;
}
