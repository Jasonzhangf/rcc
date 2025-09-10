import { ModuleInfo } from './interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from './interfaces/Connection';
import { ValidationRule, ValidationResult } from './interfaces/Validation';
import { Message, MessageResponse, MessageHandler } from './interfaces/Message';
import { MessageCenter } from './MessageCenter';
/**
 * Debug log levels
 */
export type DebugLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
/**
 * Debug log entry
 */
export interface DebugLogEntry {
    /**
     * Timestamp of the log entry
     */
    timestamp: number;
    /**
     * Log level
     */
    level: DebugLevel;
    /**
     * Log message
     */
    message: string;
    /**
     * Additional data associated with the log
     */
    data?: any;
    /**
     * Call stack information
     */
    stack?: string;
    /**
     * Module ID that generated the log
     */
    moduleId: string;
    /**
     * Method name where the log was generated
     */
    method?: string | undefined;
}
/**
 * Debug configuration
 */
export interface DebugConfig {
    /**
     * Whether debug logging is enabled
     */
    enabled: boolean;
    /**
     * Minimum log level to output
     */
    level: DebugLevel;
    /**
     * Whether to record call stacks
     */
    recordStack: boolean;
    /**
     * Maximum number of log entries to keep in memory
     */
    maxLogEntries: number;
    /**
     * Whether to output to console
     */
    consoleOutput: boolean;
    /**
     * Whether to track data flow
     */
    trackDataFlow: boolean;
}
/**
 * Abstract base class for all modules
 * Provides foundational functionality for module management, connections, validation, debug, and messaging
 */
export declare abstract class BaseModule implements MessageHandler {
    /**
     * Module information
     */
    protected info: ModuleInfo;
    /**
     * Input connections
     */
    protected inputConnections: Map<string, ConnectionInfo>;
    /**
     * Output connections
     */
    protected outputConnections: Map<string, ConnectionInfo>;
    /**
     * Validation rules for input data
     */
    protected validationRules: ValidationRule[];
    /**
     * Whether the module is initialized
     */
    protected initialized: boolean;
    /**
     * Configuration data for the module
     */
    protected config: Record<string, any>;
    /**
     * Whether the module is configured
     */
    protected configured: boolean;
    /**
     * Message center instance
     */
    protected messageCenter: MessageCenter;
    /**
     * Debug configuration
     */
    protected debugConfig: DebugConfig;
    /**
     * Debug log entries
     */
    protected debugLogs: DebugLogEntry[];
    /**
     * Pending message requests
     */
    protected pendingRequests: Map<string, {
        resolve: (response: MessageResponse) => void;
        reject: (error: any) => void;
    }>;
    /**
     * Creates an instance of BaseModule
     * @param info - Module information
     */
    constructor(info: ModuleInfo);
    /**
     * Static factory method to create an instance of the module
     * This ensures static compilation with dynamic instantiation
     * @param info - Module information
     * @returns Instance of the module
     */
    static createInstance<T extends BaseModule>(this: new (info: ModuleInfo) => T, info: ModuleInfo): T;
    /**
     * Sets the debug configuration
     * @param config - Debug configuration
     */
    setDebugConfig(config: Partial<DebugConfig>): void;
    /**
     * Gets the current debug configuration
     * @returns Debug configuration
     */
    getDebugConfig(): DebugConfig;
    /**
     * Logs a debug message
     * @param level - Log level
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    protected debug(level: DebugLevel, message: string, data?: any, method?: string): void;
    /**
     * Logs a trace message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    protected trace(message: string, data?: any, method?: string): void;
    /**
     * Logs a debug message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    protected log(message: string, data?: any, method?: string): void;
    /**
     * Logs an info message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    protected logInfo(message: string, data?: any, method?: string): void;
    /**
     * Logs a warning message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    protected warn(message: string, data?: any, method?: string): void;
    /**
     * Logs an error message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    protected error(message: string, data?: any, method?: string): void;
    /**
     * Gets debug logs
     * @param level - Optional filter by log level
     * @param limit - Optional limit on number of entries returned
     * @returns Array of debug log entries
     */
    getDebugLogs(level?: DebugLevel, limit?: number): DebugLogEntry[];
    /**
     * Clears debug logs
     */
    clearDebugLogs(): void;
    /**
     * Configures the module with initialization data
     * This method should be called before initialize()
     * @param config - Configuration data for the module
     */
    configure(config: Record<string, any>): void;
    /**
     * Gets the module information
     * @returns Module information
     */
    getInfo(): ModuleInfo;
    /**
     * Gets the module configuration
     * @returns Module configuration
     */
    getConfig(): Record<string, any>;
    /**
     * Initializes the module
     * This method should be overridden by subclasses
     */
    initialize(): Promise<void>;
    /**
     * Adds an input connection
     * @param connection - Connection information
     */
    addInputConnection(connection: ConnectionInfo): void;
    /**
     * Adds an output connection
     * @param connection - Connection information
     */
    addOutputConnection(connection: ConnectionInfo): void;
    /**
     * Removes an input connection
     * @param connectionId - Connection ID
     */
    removeInputConnection(connectionId: string): void;
    /**
     * Removes an output connection
     * @param connectionId - Connection ID
     */
    removeOutputConnection(connectionId: string): void;
    /**
     * Gets all input connections
     * @returns Array of input connections
     */
    getInputConnections(): ConnectionInfo[];
    /**
     * Gets all output connections
     * @returns Array of output connections
     */
    getOutputConnections(): ConnectionInfo[];
    /**
     * Validates input data against validation rules
     * @param data - Data to validate
     * @returns Validation result
     */
    protected validateInput(data: any): ValidationResult;
    /**
     * Performs handshake with another module
     * @param targetModule - Target module to handshake with
     * @returns Whether handshake was successful
     */
    handshake(targetModule: BaseModule): Promise<boolean>;
    /**
     * Transfers data to connected modules
     * @param data - Data to transfer
     * @param targetConnectionId - Optional target connection ID
     */
    protected transferData(data: any, targetConnectionId?: string): Promise<void>;
    /**
     * Receives data from connected modules
     * This method should be overridden by subclasses
     * @param dataTransfer - Data transfer information
     */
    receiveData(dataTransfer: DataTransfer): Promise<void>;
    /**
     * Cleans up resources and connections
     */
    destroy(): Promise<void>;
    /**
     * Send a one-way message (fire and forget)
     * @param type - Message type
     * @param payload - Message payload
     * @param target - Target module ID (optional for broadcasts)
     * @param metadata - Additional metadata
     * @param ttl - Time to live in milliseconds
     * @param priority - Message priority (0-9)
     */
    protected sendMessage(type: string, payload: any, target?: string, metadata?: Record<string, any>, ttl?: number, priority?: number): void;
    /**
     * Send a message and wait for response (blocking)
     * @param type - Message type
     * @param payload - Message payload
     * @param target - Target module ID
     * @param timeout - Timeout in milliseconds
     * @param metadata - Additional metadata
     * @param ttl - Time to live in milliseconds
     * @param priority - Message priority (0-9)
     * @returns Promise that resolves to the response
     */
    protected sendRequest(type: string, payload: any, target: string, timeout?: number, metadata?: Record<string, any>, ttl?: number, priority?: number): Promise<MessageResponse>;
    /**
     * Send a message with callback for response (non-blocking)
     * @param type - Message type
     * @param payload - Message payload
     * @param target - Target module ID
     * @param callback - Callback function for response
     * @param timeout - Timeout in milliseconds
     * @param metadata - Additional metadata
     * @param ttl - Time to live in milliseconds
     * @param priority - Message priority (0-9)
     */
    protected sendRequestAsync(type: string, payload: any, target: string, callback: (response: MessageResponse) => void, timeout?: number, metadata?: Record<string, any>, ttl?: number, priority?: number): void;
    /**
     * Broadcast a message to all modules
     * @param type - Message type
     * @param payload - Message payload
     * @param metadata - Additional metadata
     * @param ttl - Time to live in milliseconds
     * @param priority - Message priority (0-9)
     */
    protected broadcastMessage(type: string, payload: any, metadata?: Record<string, any>, ttl?: number, priority?: number): void;
    /**
     * Handle incoming messages
     * This method should be overridden by subclasses
     * @param message - The incoming message
     * @returns Promise that resolves to a response or void
     */
    handleMessage(message: Message): Promise<MessageResponse | void>;
    /**
     * Handle module lifecycle events
     * @param moduleId - The module ID that was registered
     */
    onModuleRegistered(moduleId: string): void;
    /**
     * Handle module lifecycle events
     * @param moduleId - The module ID that was unregistered
     */
    onModuleUnregistered(moduleId: string): void;
}
