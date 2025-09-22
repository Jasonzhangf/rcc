import { BaseModule, ModuleInfo } from 'rcc-basemodule';

/**
 * Simple ErrorHandling Center for RCC
 * Basic error handling functionality
 */

/**
 * Simple error context
 */
interface ErrorContext {
    error: Error | string;
    source: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: number;
    moduleId?: string;
    context?: Record<string, any>;
}
/**
 * Simple error response
 */
interface ErrorResponse {
    success: boolean;
    message: string;
    actionTaken?: string;
    timestamp: number;
    errorId?: string;
}
/**
 * Simple ErrorHandling Center extending BaseModule
 */
declare class ErrorHandlingCenter extends BaseModule {
    private _isInitialized;
    private errorCount;
    private startTime;
    constructor(moduleInfo?: ModuleInfo);
    /**
     * Initialize the error handling center
     */
    initialize(): Promise<void>;
    /**
     * Handle an error
     */
    handleError(error: ErrorContext): Promise<ErrorResponse>;
    /**
     * Handle error asynchronously (fire and forget)
     */
    handleErrorAsync(error: ErrorContext): void;
    /**
     * Handle batch errors
     */
    handleBatchErrors(errors: ErrorContext[]): Promise<ErrorResponse[]>;
    /**
     * Get health status
     */
    getHealth(): {
        isInitialized: boolean;
        errorCount: number;
        uptime: number;
        lastError: string;
    };
    /**
     * Get error statistics
     */
    getStats(): {
        totalErrors: number;
        uptime: number;
        isInitialized: boolean;
        moduleId: string;
        moduleName: string;
    };
    /**
     * Reset error count
     */
    resetErrorCount(): void;
    /**
     * Destroy the error handling center
     */
    destroy(): Promise<void>;
    /**
     * Override BaseModule methods
     */
    isInitialized(): boolean;
    isRunning(): boolean;
}
declare const ErrorHandlingCenterVersion = "1.0.0";

export { ErrorHandlingCenter, ErrorHandlingCenterVersion, ErrorHandlingCenter as default };
export type { ErrorContext, ErrorResponse };
