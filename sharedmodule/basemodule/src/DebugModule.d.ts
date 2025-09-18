/**
 * Debug Module - Integrated debug system for BaseModule
 *
 * This module provides comprehensive debug functionality including:
 * - Two-phase logging (system start and port-specific)
 * - Configurable log directories
 * - Runtime directory updates
 * - File and console output
 * - Log rotation and cleanup
 */
/**
 * Debug log levels
 */
export type DebugLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
/**
 * Debug log entry
 */
export interface DebugLogEntry {
    timestamp: number;
    level: DebugLevel;
    message: string;
    moduleId?: string;
    method?: string;
    data?: any;
    stack?: string;
    phase?: 'systemstart' | 'port';
    port?: number;
    directory?: string;
}
/**
 * Module I/O tracking entry
 */
export interface ModuleIOEntry {
    timestamp: number;
    moduleId: string;
    operationId: string;
    input?: any;
    output?: any;
    duration?: number;
    success: boolean;
    error?: string;
    method?: string;
}
/**
 * Pipeline I/O entry for recording pipeline operations
 */
export interface PipelineIOEntry {
    timestamp: number;
    pipelineId: string;
    pipelineName?: string;
    moduleId: string;
    operationId: string;
    operationType: 'pipeline_start' | 'pipeline_end' | 'module_operation' | 'data_transfer';
    input?: any;
    output?: any;
    duration?: number;
    success: boolean;
    error?: string;
    method?: string;
    context?: {
        phase?: string;
        stage?: number;
        previousOperation?: string;
        nextOperation?: string;
    };
}
/**
 * I/O tracking configuration
 */
export interface IOTrackingConfig {
    enabled: boolean;
    autoRecord: boolean;
    saveIndividualFiles: boolean;
    saveSessionFiles: boolean;
    sessionFileName?: string;
    ioDirectory: string;
    includeTimestamp: boolean;
    includeDuration: boolean;
    maxEntriesPerFile: number;
}
/**
 * Pipeline I/O recording configuration
 */
export interface PipelineIOConfig {
    enabled: boolean;
    autoRecordPipelineStart: boolean;
    autoRecordPipelineEnd: boolean;
    pipelineSessionFileName: string;
    pipelineDirectory: string;
    recordAllOperations: boolean;
    includeModuleContext: boolean;
    includeTimestamp: boolean;
    includeDuration: boolean;
    maxPipelineOperationsPerFile: number;
}
/**
 * Debug configuration
 */
export interface DebugConfig {
    enabled: boolean;
    level: DebugLevel;
    recordStack: boolean;
    maxLogEntries: number;
    consoleOutput: boolean;
    trackDataFlow: boolean;
    enableFileLogging: boolean;
    maxFileSize: number;
    maxLogFiles: number;
    ioTracking?: IOTrackingConfig;
    pipelineIO?: PipelineIOConfig;
    baseDirectory?: string;
}
/**
 * Two-phase debug configuration
 */
export interface TwoPhaseDebugConfig {
    phase: 'systemstart' | 'port';
    baseDirectory: string;
    systemStartDirectory: string;
    portDirectory?: string;
    port?: number;
    enableFileLogging: boolean;
    enableConsoleLogging: boolean;
    maxFileSize: number;
    maxLogFiles: number;
    enabled: boolean;
    level: DebugLevel;
    recordStack: boolean;
    maxLogEntries: number;
    consoleOutput: boolean;
    trackDataFlow: boolean;
    ioTracking: IOTrackingConfig;
    pipelineIO: PipelineIOConfig;
}
/**
 * Integrated debug system with two-phase logging
 */
export declare class DebugModule {
    private config;
    private logs;
    private ioTrackingConfig;
    private ioEntries;
    private pipelineIOConfig;
    private pipelineEntries;
    private activeOperations;
    constructor(baseDirectory?: string);
    /**
     * Initialize debug directories
     */
    private initializeDirectories;
    /**
     * Get current log directory
     */
    private getCurrentLogDirectory;
    /**
     * Get current log file path
     */
    private getCurrentLogFilePath;
    /**
     * Switch to port-specific logging
     * @param port - Port number
     */
    switchToPortMode(port: number): void;
    /**
     * Update debug configuration
     * @param updates - Configuration updates
     */
    updateConfig(updates: Partial<TwoPhaseDebugConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): TwoPhaseDebugConfig;
    /**
     * Update base directory
     * @param newDirectory - New base directory
     */
    updateBaseDirectory(newDirectory: string): void;
    /**
     * Get current log directory
     */
    getCurrentDirectory(): string;
    /**
     * Log a message
     * @param level - Log level
     * @param message - Log message
     * @param data - Additional data
     * @param method - Method name
     */
    log(level: DebugLevel, message: string, data?: any, method?: string): void;
    /**
     * Write log entry to file
     * @param logEntry - Log entry to write
     */
    private writeToFile;
    /**
     * Rotate log file
     * @param currentFilePath - Current log file path
     */
    private rotateLogFile;
    /**
     * Get log entries from memory
     * @param level - Optional filter by log level
     * @param limit - Optional limit on number of entries
     */
    getLogs(level?: DebugLevel, limit?: number): DebugLogEntry[];
    /**
     * Clear in-memory logs and I/O entries
     */
    clearLogs(): void;
    /**
     * Get log files in current directory
     */
    getLogFiles(): string[];
    /**
     * Read log file content
     * @param filePath - Log file path
     * @param limit - Optional limit on number of entries
     */
    readLogFile(filePath: string, limit?: number): DebugLogEntry[];
    /**
     * Clean up old log files
     * @param daysToKeep - Number of days to keep logs
     */
    cleanupOldLogs(daysToKeep?: number): void;
    /**
     * Convenience methods
     */
    trace(message: string, data?: any, method?: string): void;
    debug(message: string, data?: any, method?: string): void;
    info(message: string, data?: any, method?: string): void;
    warn(message: string, data?: any, method?: string): void;
    error(message: string, data?: any, method?: string): void;
    /**
     * Legacy method for compatibility with original DebugSystem
     */
    updateLogDirectory(newDirectory: string): void;
    /**
     * Legacy method for compatibility with original DebugSystem
     */
    setConfig(config: Partial<DebugConfig>): void;
    /**
     * Legacy method for compatibility with original DebugSystem
     */
    getLogDirectory(): string;
    /**
     * Update I/O tracking configuration
     * @param config - New I/O tracking configuration
     */
    updateIOTrackingConfig(config: Partial<IOTrackingConfig>): void;
    /**
     * Get current I/O tracking configuration
     */
    getIOTrackingConfig(): IOTrackingConfig;
    /**
     * Start tracking a module operation
     * @param moduleId - Module ID
     * @param operationId - Operation ID
     * @param input - Input data
     * @param method - Method name
     */
    startOperation(moduleId: string, operationId: string, input: any, method?: string): void;
    /**
     * End tracking a module operation and record I/O
     * @param moduleId - Module ID
     * @param operationId - Operation ID
     * @param output - Output data
     * @param success - Whether operation was successful
     * @param error - Error message if failed
     */
    endOperation(moduleId: string, operationId: string, output: any, success?: boolean, error?: string): void;
    /**
     * Record a complete operation (start and end in one call)
     * @param moduleId - Module ID
     * @param operationId - Operation ID
     * @param input - Input data
     * @param output - Output data
     * @param method - Method name
     * @param success - Whether operation was successful
     * @param error - Error message if failed
     */
    recordOperation(moduleId: string, operationId: string, input: any, output: any, method?: string, success?: boolean, error?: string): void;
    /**
     * Save operation to individual file
     * @param ioEntry - I/O entry to save
     */
    private saveOperationToIndividualFile;
    /**
     * Save operation to session file
     * @param ioEntry - I/O entry to save
     */
    private saveOperationToSessionFile;
    /**
     * Get I/O entries
     * @param moduleId - Optional filter by module ID
     * @param limit - Optional limit on number of entries
     */
    getIOEntries(moduleId?: string, limit?: number): ModuleIOEntry[];
    /**
     * Clear I/O entries
     */
    clearIOEntries(): void;
    /**
     * Get I/O log files
     */
    getIOFiles(): string[];
    /**
     * Read I/O file content
     * @param filePath - I/O file path
     * @param limit - Optional limit on number of entries
     */
    readIOFile(filePath: string, limit?: number): ModuleIOEntry[];
    /**
     * Enable or disable I/O tracking
     * @param enabled - Whether to enable I/O tracking
     */
    setIOTrackingEnabled(enabled: boolean): void;
    /**
     * Enable or disable auto recording of I/O data
     * @param autoRecord - Whether to auto record I/O data
     */
    setAutoRecord(autoRecord: boolean): void;
    /**
     * Enable or disable individual file saving
     * @param enabled - Whether to save individual files
     */
    setIndividualFileSaving(enabled: boolean): void;
    /**
     * Enable or disable session file saving
     * @param enabled - Whether to save session files
     */
    setSessionFileSaving(enabled: boolean): void;
    /**
     * Set session file name
     * @param fileName - Session file name
     */
    setSessionFileName(fileName: string): void;
    /**
     * Get individual I/O files
     * @param moduleId - Optional module ID to filter by
     */
    getIndividualIOFiles(moduleId?: string): string[];
    /**
     * Get session I/O files
     * @param moduleId - Optional module ID to filter by
     */
    getSessionIOFiles(moduleId?: string): string[];
    /**
     * Read individual I/O file
     * @param filePath - Path to the individual I/O file
     */
    readIndividualIOFile(filePath: string): ModuleIOEntry | null;
    /**
     * Read session I/O file
     * @param filePath - Path to the session I/O file
     * @param limit - Optional limit on number of entries
     */
    readSessionIOFile(filePath: string, limit?: number): ModuleIOEntry[];
    /**
     * Update pipeline I/O configuration
     * @param config - New pipeline I/O configuration
     */
    updatePipelineIOConfig(config: Partial<PipelineIOConfig>): void;
    /**
     * Get current pipeline I/O configuration
     */
    getPipelineIOConfig(): PipelineIOConfig;
    /**
     * Record pipeline start
     * @param pipelineId - Pipeline ID
     * @param pipelineName - Pipeline name
     * @param input - Input data
     * @param context - Optional context information
     */
    recordPipelineStart(pipelineId: string, pipelineName: string, input: any, context?: Record<string, any>): void;
    /**
     * Record pipeline end
     * @param pipelineId - Pipeline ID
     * @param pipelineName - Pipeline name
     * @param output - Output data
     * @param success - Whether pipeline was successful
     * @param error - Error message if failed
     * @param context - Optional context information
     */
    recordPipelineEnd(pipelineId: string, pipelineName: string, output: any, success?: boolean, error?: string, context?: Record<string, any>): void;
    /**
     * Record pipeline module operation
     * @param pipelineId - Pipeline ID
     * @param pipelineName - Pipeline name
     * @param moduleId - Module ID
     * @param operationId - Operation ID
     * @param input - Input data
     * @param output - Output data
     * @param method - Method name
     * @param success - Whether operation was successful
     * @param error - Error message if failed
     * @param context - Optional context information
     */
    recordPipelineOperation(pipelineId: string, pipelineName: string, moduleId: string, operationId: string, input: any, output: any, method?: string, success?: boolean, error?: string, context?: Record<string, any>): void;
    /**
     * Record pipeline data transfer
     * @param pipelineId - Pipeline ID
     * @param pipelineName - Pipeline name
     * @param fromModule - Source module ID
     * @param toModule - Target module ID
     * @param data - Transferred data
     * @param context - Optional context information
     */
    recordPipelineTransfer(pipelineId: string, pipelineName: string, fromModule: string, toModule: string, data: any, context?: Record<string, any>): void;
    /**
     * Add pipeline entry to storage and save to file
     * @param entry - Pipeline entry to add
     */
    private addPipelineEntry;
    /**
     * Save pipeline entry to file
     * @param entry - Pipeline entry to save
     */
    private savePipelineEntryToFile;
    /**
     * Get pipeline entries
     * @param pipelineId - Optional filter by pipeline ID
     * @param operationType - Optional filter by operation type
     * @param limit - Optional limit on number of entries
     */
    getPipelineEntries(pipelineId?: string, operationType?: string, limit?: number): PipelineIOEntry[];
    /**
     * Clear pipeline entries
     */
    clearPipelineEntries(): void;
    /**
     * Get pipeline I/O files
     */
    getPipelineFiles(): string[];
    /**
     * Read pipeline I/O file
     * @param filePath - Pipeline file path
     * @param limit - Optional limit on number of entries
     */
    readPipelineFile(filePath: string, limit?: number): PipelineIOEntry[];
    /**
     * Enable or disable pipeline I/O tracking
     * @param enabled - Whether to enable pipeline I/O tracking
     */
    setPipelineIOEnabled(enabled: boolean): void;
    /**
     * Enable or disable auto recording of pipeline start/end
     * @param autoRecord - Whether to auto record pipeline start/end
     */
    setAutoRecordPipeline(autoRecord: boolean): void;
    /**
     * Enable or disable recording all pipeline operations
     * @param recordAll - Whether to record all pipeline operations
     */
    setRecordAllOperations(recordAll: boolean): void;
    /**
     * Set pipeline session file name
     * @param fileName - Pipeline session file name
     */
    setPipelineSessionFileName(fileName: string): void;
    /**
     * Create a pipeline-specific session file
     * @param pipelineId - Pipeline ID
     * @param pipelineName - Pipeline name
     * @returns Session file path
     */
    createPipelineSessionFile(pipelineId: string, pipelineName: string): string;
    /**
     * Export pipeline data to a structured format
     * @param pipelineId - Pipeline ID to export
     * @param format - Export format ('json' | 'csv')
     * @returns Exported data as string
     */
    exportPipelineData(pipelineId: string, format?: 'json' | 'csv'): string;
}
