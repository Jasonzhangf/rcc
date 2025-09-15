/**
 * Simplified ErrorHandlerCenter implementation for build purposes
 * This provides minimal functionality to get the build working
 */
import { BaseModule } from 'rcc-basemodule';
import { PipelineError, PipelineErrorCode, PipelineExecutionContext, PipelineExecutionResult, ErrorHandlingAction, PipelineBlacklistEntry, ErrorHandlerFunction } from './ErrorTypes';
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
export declare class ErrorHandlerCenter extends BaseModule implements IErrorHandlerCenter {
    private configManager;
    private customHandlers;
    private blacklistedPipelines;
    private errorStats;
    private blacklistCleanupInterval;
    constructor(configManager: PipelineConfigManager);
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
    getErrorStats(): any;
    clearErrorStats(): void;
    private getErrorHandlingStrategy;
    private applyDefaultStrategy;
    private updateErrorStats;
    private createInitialErrorStats;
    getHttpStatusCode(errorCode: PipelineErrorCode): number;
    blacklistPipelineWithInstance(pipelineId: string, instanceId: string, error: PipelineError, duration: number, isPermanent?: boolean): void;
}
//# sourceMappingURL=ErrorHandlerCenterSimple.d.ts.map