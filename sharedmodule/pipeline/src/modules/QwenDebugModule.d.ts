/**
 * Qwen Debug Module
 * Records pipeline input/output and provides comprehensive logging functionality
 */
import { ModuleInfo, Message, MessageResponse } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import { OpenAIChatRequest, OpenAIChatResponse } from './QwenCompatibilityModule';
/**
 * Debug Configuration
 */
export interface QwenDebugConfig {
    /** Enable debug logging */
    enabled: boolean;
    /** Log file directory */
    logDirectory: string;
    /** Maximum log file size (bytes) */
    maxLogSize: number;
    /** Maximum number of log files to keep */
    maxLogFiles: number;
    /** Log level */
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    /** Enable request/response logging */
    logRequests: boolean;
    /** Enable response logging */
    logResponses: boolean;
    /** Enable error logging */
    logErrors: boolean;
    /** Enable performance metrics */
    logPerformance: boolean;
    /** Enable tool call logging */
    logToolCalls: boolean;
    /** Enable authentication logging */
    logAuth: boolean;
    /** Enable pipeline state logging */
    logPipelineState: boolean;
    /** Enable sensitive data filtering */
    filterSensitiveData: boolean;
    /** Sensitive data patterns to filter */
    sensitivePatterns?: string[];
}
/**
 * Debug Log Entry
 */
export interface DebugLogEntry {
    /** Unique entry ID */
    id: string;
    /** Timestamp */
    timestamp: number;
    /** Log level */
    level: 'debug' | 'info' | 'warn' | 'error';
    /** Module that generated the log */
    module: string;
    /** Log category */
    category: string;
    /** Log message */
    message: string;
    /** Additional data */
    data?: any;
    /** Error information */
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    /** Request/response information */
    requestResponse?: {
        type: 'request' | 'response';
        direction: 'inbound' | 'outbound';
        requestId: string;
        model: string;
        content?: any;
        tools?: any;
        toolCalls?: any;
    };
    /** Performance metrics */
    performance?: {
        duration: number;
        startTime: number;
        endTime: number;
        memoryUsage?: {
            used: number;
            total: number;
            percentage: number;
        };
    };
    /** Authentication information */
    auth?: {
        state: string;
        tokenStatus?: string;
        authMethod?: string;
    };
    /** Pipeline state information */
    pipeline?: {
        stage: string;
        status: string;
        pipelineId: string;
        executionId: string;
    };
}
/**
 * Debug Statistics
 */
export interface DebugStats {
    /** Total log entries */
    totalEntries: number;
    /** Entries by level */
    entriesByLevel: Record<string, number>;
    /** Entries by category */
    entriesByCategory: Record<string, number>;
    /** Entries by module */
    entriesByModule: Record<string, number>;
    /** Total requests logged */
    totalRequests: number;
    /** Total responses logged */
    totalResponses: number;
    /** Total errors logged */
    totalErrors: number;
    /** Average response time */
    averageResponseTime: number;
    /** Memory usage */
    memoryUsage: {
        current: number;
        peak: number;
        average: number;
    };
}
/**
 * Qwen Debug Module
 */
export declare class QwenDebugModule extends BasePipelineModule {
    protected config: QwenDebugConfig;
    /** Log entries storage */
    private logEntries;
    /** Performance metrics */
    private performanceMetrics;
    /** Active requests tracking */
    private activeRequests;
    /** Log file handles */
    private logFileHandles;
    /** Current log file size */
    private currentLogSize;
    /** Statistics */
    private stats;
    constructor(info: ModuleInfo);
    /**
     * Initialize the debug module
     */
    initialize(): Promise<void>;
    /**
     * Validate configuration
     */
    private validateConfig;
    /**
     * Setup log directory
     */
    private setupLogDirectory;
    /**
     * Initialize statistics
     */
    private initializeStats;
    /**
     * Setup log rotation
     */
    private setupLogRotation;
    /**
     * Check if log rotation is needed
     */
    private checkLogRotation;
    /**
     * Rotate log files
     */
    private rotateLogs;
    /**
     * Log a pipeline request
     */
    logRequest(requestId: string, request: OpenAIChatRequest, module: string): void;
    /**
     * Log a pipeline response
     */
    logResponse(requestId: string, response: OpenAIChatResponse, module: string): void;
    /**
     * Log an error
     */
    logError(message: string, error: any, module: string, category?: string): void;
    /**
     * Log authentication state
     */
    logAuthState(authState: string, details: any, module: string): void;
    /**
     * Log pipeline state
     */
    logPipelineState(stage: string, status: string, pipelineId: string, executionId: string, details?: any): void;
    /**
     * Log tool calls
     */
    logToolCalls(toolCalls: any[], requestId: string, direction: 'request' | 'response', module: string): void;
    /**
     * Add a log entry
     */
    private addLogEntry;
    /**
     * Write log entry to file
     */
    private writeLogToFile;
    /**
     * Filter sensitive data
     */
    private filterSensitiveData;
    /**
     * Get memory usage
     */
    private getMemoryUsage;
    /**
     * Update performance metrics
     */
    private updatePerformanceMetrics;
    /**
     * Generate unique ID
     */
    private generateId;
    /**
     * Get debug logs
     */
    getDebugLogs(filters?: {
        level?: string;
        category?: string;
        module?: string;
        startTime?: number;
        endTime?: number;
        limit?: number;
    }): DebugLogEntry[];
    /**
     * Get debug statistics
     */
    getDebugStats(): DebugStats;
    /**
     * Get active requests
     */
    getActiveRequests(): Array<{
        requestId: string;
        startTime: number;
        duration: number;
        data: any;
    }>;
    /**
     * Clear debug logs
     */
    clearDebugLogs(): void;
    /**
     * Export debug logs
     */
    exportDebugLogs(format?: 'json' | 'csv'): string;
    /**
     * Handle messages
     */
    handleMessage(message: Message): Promise<MessageResponse>;
    /**
     * Get health status
     */
    getHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        details: {
            enabled: boolean;
            logDirectory: string;
            logCount: number;
            memoryUsage: number;
            diskUsage?: number;
        };
    }>;
    /**
     * Cleanup resources
     */
    destroy(): Promise<void>;
}
