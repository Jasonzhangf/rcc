import { ModuleInfo } from './interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from './interfaces/Connection';
import { ValidationRule, ValidationResult } from './interfaces/Validation';
import { Message, MessageResponse, MessageHandler } from './interfaces/Message';
import { MessageCenter } from './MessageCenter';
import { DebugModule, IOTrackingConfig, DebugConfig as DebugModuleConfig } from './DebugModule';
import { v4 as uuidv4 } from 'uuid';

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
export interface DebugConfig extends Omit<DebugModuleConfig, 'ioTracking' | 'pipelineIO' | 'baseDirectory'> {
  ioTracking?: IOTrackingConfig;
  baseDirectory?: string;
}

/**
 * Abstract base class for all modules
 * Provides foundational functionality for module management, connections, validation, debug, and messaging
 */
export abstract class BaseModule implements MessageHandler {
  /**
   * Module information
   */
  protected info: ModuleInfo;
  
  /**
   * Input connections
   */
  protected inputConnections: Map<string, ConnectionInfo> = new Map();
  
  /**
   * Output connections
   */
  protected outputConnections: Map<string, ConnectionInfo> = new Map();
  
  /**
   * Validation rules for input data
   */
  protected validationRules: ValidationRule[] = [];
  
  /**
   * Whether the module is initialized
   */
  protected initialized: boolean = false;
  
  /**
   * Configuration data for the module
   */
  protected config: Record<string, any> = {};
  
  /**
   * Whether the module is configured
   */
  protected configured: boolean = false;
  
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
  protected debugLogs: DebugLogEntry[] = [];
  
  /**
   * Two-phase debug system
   */
  protected twoPhaseDebugSystem: DebugModule | null;
  
  /**
   * Whether to use two-phase debug system
   */
  protected useTwoPhaseDebug: boolean = false;
  
  /**
   * Pending message requests
   */
  protected pendingRequests: Map<string, {
    resolve: (response: MessageResponse) => void;
    reject: (error: any) => void;
  }> = new Map();
  
  /**
   * Creates an instance of BaseModule
   * @param info - Module information
   */
  constructor(info: ModuleInfo) {
    this.info = info;
    this.messageCenter = MessageCenter.getInstance();
    
    // Initialize debug configuration with defaults
    this.debugConfig = {
      enabled: true,
      level: 'debug',
      recordStack: true,
      maxLogEntries: 1000,
      consoleOutput: true,
      trackDataFlow: true,
      enableFileLogging: false,
      maxFileSize: 10485760, // 10MB
      maxLogFiles: 5
    };
    
    // Initialize two-phase debug system
    this.twoPhaseDebugSystem = null;
  }
  
  /**
   * Static factory method to create an instance of the module
   * This ensures static compilation with dynamic instantiation
   * @param info - Module information
   * @returns Instance of the module
   */
  static createInstance<T extends BaseModule>(this: new (info: ModuleInfo) => T, info: ModuleInfo): T {
    return new this(info);
  }
  
  /**
   * Sets the debug configuration
   * @param config - Debug configuration
   */
  public setDebugConfig(config: Partial<DebugConfig>): void {
    this.debugConfig = { ...this.debugConfig, ...config };

    // If I/O tracking configuration is updated and two-phase debug is enabled, update DebugModule
    if (config.ioTracking && this.useTwoPhaseDebug && this.twoPhaseDebugSystem) {
      this.twoPhaseDebugSystem.updateIOTrackingConfig(config.ioTracking);
    }
  }
  
  /**
   * Gets the current debug configuration
   * @returns Debug configuration
   */
  public getDebugConfig(): DebugConfig {
    const config = { ...this.debugConfig };
    config.enabled = this.useTwoPhaseDebug;

    // Include ioTracking configuration if two-phase debug is enabled
    if (this.useTwoPhaseDebug && this.twoPhaseDebugSystem) {
      config.ioTracking = this.twoPhaseDebugSystem.getIOTrackingConfig();
      config.baseDirectory = this.twoPhaseDebugSystem.getLogDirectory();
    }

    return config;
  }
  
  /**
   * Enable two-phase debug system
   * @param enabled - Whether to enable two-phase debug
   * @param baseDirectory - Base directory for debug logs
   * @param ioConfig - Optional I/O tracking configuration
   */
  public enableTwoPhaseDebug(enabled: boolean, baseDirectory: string = './debug-logs', ioConfig?: IOTrackingConfig): void {
    this.useTwoPhaseDebug = enabled;
    if (enabled) {
      this.twoPhaseDebugSystem = new DebugModule(baseDirectory);
      // Apply custom I/O tracking configuration if provided
      if (ioConfig) {
        this.twoPhaseDebugSystem.updateIOTrackingConfig(ioConfig);
      }
      // Enable basic debug logging when two-phase debug is enabled
      this.debugConfig.enabled = true;
      this.logInfo('Two-phase debug system enabled', { baseDirectory }, 'enableTwoPhaseDebug');
    } else {
      // Disable debug system
      if (this.twoPhaseDebugSystem) {
        this.twoPhaseDebugSystem.setIOTrackingEnabled(false);
        this.twoPhaseDebugSystem = null;
      }
      // Also disable basic debug logging
      this.debugConfig.enabled = false;
      this.logInfo('Two-phase debug system disabled', {}, 'enableTwoPhaseDebug');
    }
  }
  
  /**
   * Switch debug system to port mode
   * @param port - Port number
   */
  public switchDebugToPortMode(port: number): void {
    if (this.useTwoPhaseDebug && this.twoPhaseDebugSystem) {
      this.twoPhaseDebugSystem.switchToPortMode(port);
      this.logInfo('Debug system switched to port mode', { port }, 'switchDebugToPortMode');
    }
  }
  
  /**
   * Get two-phase debug system
   * @returns Two-phase debug system instance
   */
  public getTwoPhaseDebugSystem(): DebugModule | null {
    return this.twoPhaseDebugSystem;
  }
  
  /**
   * Logs a debug message
   * @param level - Log level
   * @param message - Log message
   * @param data - Additional data to log
   * @param method - Method name where the log was generated
   */
  protected debug(level: DebugLevel, message: string, data?: any, method?: string): void {
    // Use two-phase debug system if enabled
    if (this.useTwoPhaseDebug && this.twoPhaseDebugSystem) {
      this.twoPhaseDebugSystem.log(level, message, data, method);
      return;
    }
    
    // Check if debug is enabled and level is appropriate
    if (!this.debugConfig.enabled) return;
    
    const levelOrder: DebugLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levelOrder.indexOf(this.debugConfig.level);
    const messageLevelIndex = levelOrder.indexOf(level);
    
    if (messageLevelIndex < currentLevelIndex) return;
    
    // Create log entry
    const logEntry: DebugLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      moduleId: this.info.id,
      method
    };
    
    // Add data if provided
    if (data !== undefined) {
      logEntry.data = data;
    }
    
    // Record stack trace if enabled
    if (this.debugConfig.recordStack && level === 'error') {
      try {
        throw new Error('Stack trace');
      } catch (e: unknown) {
        if (e instanceof Error) {
          logEntry.stack = e.stack || undefined;
        }
      }
    }
    
    // Add to logs
    this.debugLogs.push(logEntry);
    
    // Trim logs if necessary
    if (this.debugLogs.length > this.debugConfig.maxLogEntries) {
      this.debugLogs = this.debugLogs.slice(-this.debugConfig.maxLogEntries);
    }
    
    // Output to console if enabled
    if (this.debugConfig.consoleOutput) {
      const timestamp = new Date(logEntry.timestamp).toISOString();
      const prefix = `[${timestamp}] [${this.info.id}] [${level.toUpperCase()}]${method ? ` [${method}]` : ''}`;
      
      switch (level) {
        case 'trace':
        case 'debug':
        case 'info':
          console.log(`${prefix} ${message}`, data || '');
          break;
        case 'warn':
          console.warn(`${prefix} ${message}`, data || '');
          break;
        case 'error':
          console.error(`${prefix} ${message}`, data || '');
          break;
      }
    }
  }
  
  /**
   * Logs a trace message
   * @param message - Log message
   * @param data - Additional data to log
   * @param method - Method name where the log was generated
   */
  protected trace(message: string, data?: any, method?: string): void {
    this.debug('trace', message, data, method);
  }
  
  /**
   * Logs a debug message
   * @param message - Log message
   * @param data - Additional data to log
   * @param method - Method name where the log was generated
   */
  protected log(message: string, data?: any, method?: string): void {
    this.debug('debug', message, data, method);
  }
  
  /**
   * Logs an info message
   * @param message - Log message
   * @param data - Additional data to log
   * @param method - Method name where the log was generated
   */
  protected logInfo(message: string, data?: any, method?: string): void {
    this.debug('info', message, data, method);
  }
  
  /**
   * Logs a warning message
   * @param message - Log message
   * @param data - Additional data to log
   * @param method - Method name where the log was generated
   */
  protected warn(message: string, data?: any, method?: string): void {
    this.debug('warn', message, data, method);
  }
  
  /**
   * Logs an error message
   * @param message - Log message
   * @param data - Additional data to log
   * @param method - Method name where the log was generated
   */
  protected error(message: string, data?: any, method?: string): void {
    this.debug('error', message, data, method);
  }
  
  /**
   * Gets debug logs
   * @param level - Optional filter by log level
   * @param limit - Optional limit on number of entries returned
   * @returns Array of debug log entries
   */
  public getDebugLogs(level?: DebugLevel, limit?: number): DebugLogEntry[] {
    let logs = [...this.debugLogs];
    
    // Filter by level if specified
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    // Limit results if specified
    if (limit && limit > 0) {
      logs = logs.slice(-limit);
    }
    
    return logs;
  }
  
  /**
   * Clears debug logs
   */
  public clearDebugLogs(): void {
    this.debugLogs = [];
  }
  
  /**
   * Configures the module with initialization data
   * This method should be called before initialize()
   * @param config - Configuration data for the module
   */
  public configure(config: Record<string, any>): void {
    if (this.initialized) {
      throw new Error('Cannot configure module after initialization');
    }
    
    this.config = { ...config };
    this.configured = true;
    
    // Log configuration
    this.debug('debug', 'Module configured', config, 'configure');
  }
  
  /**
   * Gets the module information
   * @returns Module information
   */
  public getInfo(): ModuleInfo {
    return { ...this.info };
  }
  
  /**
   * Gets the module configuration
   * @returns Module configuration
   */
  public getConfig(): Record<string, any> {
    return { ...this.config };
  }
  
  /**
   * Initializes the module
   * This method should be overridden by subclasses
   */
  public async initialize(): Promise<void> {
    if (!this.configured) {
      console.warn(`Module ${this.info.id} is being initialized without configuration`);
    }
    
    // Register with message center
    this.messageCenter.registerModule(this.info.id, this);
    
    // Base initialization logic
    this.initialized = true;
    
    // Log initialization
    this.logInfo('Module initialized', { configured: this.configured }, 'initialize');
  }
  
  /**
   * Adds an input connection
   * @param connection - Connection information
   */
  public addInputConnection(connection: ConnectionInfo): void {
    if (connection.type !== 'input') {
      throw new Error('Invalid connection type for input');
    }
    this.inputConnections.set(connection.id, connection);
  }
  
  /**
   * Adds an output connection
   * @param connection - Connection information
   */
  public addOutputConnection(connection: ConnectionInfo): void {
    if (connection.type !== 'output') {
      throw new Error('Invalid connection type for output');
    }
    this.outputConnections.set(connection.id, connection);
  }
  
  /**
   * Removes an input connection
   * @param connectionId - Connection ID
   */
  public removeInputConnection(connectionId: string): void {
    this.inputConnections.delete(connectionId);
  }
  
  /**
   * Removes an output connection
   * @param connectionId - Connection ID
   */
  public removeOutputConnection(connectionId: string): void {
    this.outputConnections.delete(connectionId);
  }
  
  /**
   * Gets all input connections
   * @returns Array of input connections
   */
  public getInputConnections(): ConnectionInfo[] {
    return Array.from(this.inputConnections.values());
  }
  
  /**
   * Gets all output connections
   * @returns Array of output connections
   */
  public getOutputConnections(): ConnectionInfo[] {
    return Array.from(this.outputConnections.values());
  }
  
  /**
   * Validates input data against validation rules
   * @param data - Data to validate
   * @returns Validation result
   */
  protected validateInput(data: any): ValidationResult {
    const errors: string[] = [];
    
    for (const rule of this.validationRules) {
      const value = data[rule.field];
      
      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null) {
            errors.push(rule.message);
          }
          break;
        case 'string':
          if (typeof value !== 'string') {
            errors.push(rule.message);
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            errors.push(rule.message);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(rule.message);
          }
          break;
        case 'object':
          if (typeof value !== 'object' || value === null) {
            errors.push(rule.message);
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push(rule.message);
          }
          break;
        case 'custom':
          if (rule.validator && !rule.validator(value)) {
            errors.push(rule.message);
          }
          break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data
    };
  }
  
  /**
   * Performs handshake with another module
   * @param targetModule - Target module to handshake with
   * @returns Whether handshake was successful
   */
  public async handshake(targetModule: BaseModule): Promise<boolean> {
    // Base handshake implementation
    // This should be overridden by subclasses for specific handshake logic
    const result = true;
    
    // Log handshake
    this.debug('debug', 'Handshake performed', { targetModule: targetModule.getInfo().id }, 'handshake');
    
    return result;
  }
  
  /**
   * Transfers data to connected modules
   * @param data - Data to transfer
   * @param targetConnectionId - Optional target connection ID
   */
  protected async transferData(data: any, targetConnectionId?: string): Promise<void> {
    // Get target connections
    let targetConnections: ConnectionInfo[];
    
    if (targetConnectionId) {
      // If a specific connection ID is provided, use it
      const connection = this.outputConnections.get(targetConnectionId);
      if (!connection) {
        throw new Error(`Output connection with ID '${targetConnectionId}' not found`);
      }
      targetConnections = [connection];
    } else {
      // Otherwise, use all output connections
      targetConnections = Array.from(this.outputConnections.values());
    }
    
    // Create data transfer objects for each target connection
    const transfers: DataTransfer[] = targetConnections.map(connection => ({
      id: `${this.info.id}-${connection.id}-${Date.now()}`,
      sourceConnectionId: connection.id,
      targetConnectionId: connection.targetModuleId,
      data,
      timestamp: Date.now(),
      metadata: connection.metadata
    }));
    
    // Send data to each target module
    for (const transfer of transfers) {
      // In a real implementation, you would send the data to the target module
      // For now, we'll just log the transfer
      console.log(`Transferring data from module ${this.info.id} to connection ${transfer.targetConnectionId}:`, data);
      
      // Log data transfer if tracking is enabled
      if (this.debugConfig.trackDataFlow) {
        this.debug('debug', 'Data transferred', transfer, 'transferData');
      }
    }
  }
  
  /**
   * Receives data from connected modules
   * This method should be overridden by subclasses
   * @param dataTransfer - Data transfer information
   */
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    // Base receive data implementation
    // This should be overridden by subclasses for specific receive logic
    console.log(`Module ${this.info.id} received data:`, dataTransfer.data);
    
    // Log data reception if tracking is enabled
    if (this.debugConfig.trackDataFlow) {
      this.debug('debug', 'Data received', dataTransfer, 'receiveData');
    }
  }
  
  /**
   * Cleans up resources and connections
   */
  public async destroy(): Promise<void> {
    // Log destruction before clearing logs
    this.logInfo('Module destroyed', {}, 'destroy');

    // Clean up connections
    this.inputConnections.clear();
    this.outputConnections.clear();
    this.initialized = false;
    this.configured = false;
    this.config = {};

    // Unregister from message center
    this.messageCenter.unregisterModule(this.info.id);

    // Clear debug logs
    this.clearDebugLogs();

    // Clear pending requests
    this.pendingRequests.clear();
  }
  
  /**
   * Send a one-way message (fire and forget)
   * @param type - Message type
   * @param payload - Message payload
   * @param target - Target module ID (optional for broadcasts)
   * @param metadata - Additional metadata
   * @param ttl - Time to live in milliseconds
   * @param priority - Message priority (0-9)
   */
  protected sendMessage(
    type: string,
    payload: any,
    target?: string,
    metadata?: Record<string, any>,
    ttl?: number,
    priority?: number
  ): void {
    const message: Message = {
      id: uuidv4(),
      type,
      source: this.info.id,
      target,
      payload,
      timestamp: Date.now(),
      metadata,
      ttl,
      priority
    };
    
    try {
      if (target) {
        this.messageCenter.sendMessage(message);
        this.debug('debug', 'Message sent', { type, target }, 'sendMessage');
      } else {
        this.messageCenter.broadcastMessage(message);
        this.debug('debug', 'Message broadcast', { type }, 'sendMessage');
      }
    } catch (error) {
      this.debug('error', 'Failed to send message', { error: (error as Error).message }, 'sendMessage');
      throw error;
    }
  }
  
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
  protected async sendRequest(
    type: string,
    payload: any,
    target: string,
    timeout: number = 30000,
    metadata?: Record<string, any>,
    ttl?: number,
    priority?: number
  ): Promise<MessageResponse> {
    const message: Message = {
      id: uuidv4(),
      type,
      source: this.info.id,
      target,
      payload,
      timestamp: Date.now(),
      correlationId: uuidv4(),
      metadata,
      ttl,
      priority
    };
    
    try {
      this.debug('debug', 'Sending request', { type, target }, 'sendRequest');
      const response = await this.messageCenter.sendRequest(message, timeout);
      this.debug('debug', 'Received response', { type, target, success: response.success }, 'sendRequest');
      return response;
    } catch (error) {
      this.debug('error', 'Request failed', { type, target, error: (error as Error).message }, 'sendRequest');
      throw error;
    }
  }
  
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
  protected sendRequestAsync(
    type: string,
    payload: any,
    target: string,
    callback: (response: MessageResponse) => void,
    timeout: number = 30000,
    metadata?: Record<string, any>,
    ttl?: number,
    priority?: number
  ): void {
    const message: Message = {
      id: uuidv4(),
      type,
      source: this.info.id,
      target,
      payload,
      timestamp: Date.now(),
      correlationId: uuidv4(),
      metadata,
      ttl,
      priority
    };
    
    try {
      this.debug('debug', 'Sending async request', { type, target }, 'sendRequestAsync');
      this.messageCenter.sendRequestAsync(message, (response: MessageResponse) => {
        this.debug('debug', 'Received async response', { type, target, success: response.success }, 'sendRequestAsync');
        callback(response);
      }, timeout);
    } catch (error) {
      this.debug('error', 'Async request failed', { type, target, error: (error as Error).message }, 'sendRequestAsync');
      throw error;
    }
  }
  
  /**
   * Broadcast a message to all modules
   * @param type - Message type
   * @param payload - Message payload
   * @param metadata - Additional metadata
   * @param ttl - Time to live in milliseconds
   * @param priority - Message priority (0-9)
   */
  protected broadcastMessage(
    type: string,
    payload: any,
    metadata?: Record<string, any>,
    ttl?: number,
    priority?: number
  ): void {
    this.sendMessage(type, payload, undefined, metadata, ttl, priority);
  }
  
  /**
   * Handle incoming messages
   * This method should be overridden by subclasses
   * @param message - The incoming message
   * @returns Promise that resolves to a response or void
   */
  public async handleMessage(message: Message): Promise<MessageResponse | void> {
    this.debug('debug', 'Handling message', { type: message.type, source: message.source }, 'handleMessage');
    
    // Base message handling implementation
    // This should be overridden by subclasses for specific message handling logic
    switch (message.type) {
      case 'ping':
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { pong: true, moduleId: this.info.id },
          timestamp: Date.now()
        };
      default:
        this.debug('warn', 'Unhandled message type', { type: message.type }, 'handleMessage');
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: false,
          error: `Unhandled message type: ${message.type}`,
          timestamp: Date.now()
        };
    }
  }
  
  /**
   * Handle module lifecycle events
   * @param moduleId - The module ID that was registered
   */
  public onModuleRegistered(moduleId: string): void {
    this.logInfo('Module registered', { moduleId }, 'onModuleRegistered');
  }
  
  /**
   * Handle module lifecycle events
   * @param moduleId - The module ID that was unregistered
   */
  public onModuleUnregistered(moduleId: string): void {
    this.logInfo('Module unregistered', { moduleId }, 'onModuleUnregistered');
  }

  // ========================================
  // I/O Tracking Methods
  // ========================================

  /**
   * Record an I/O operation
   * @param operationId - Unique identifier for the operation
   * @param input - Input data
   * @param output - Output data
   * @param method - Method name that performed the operation
   */
  public recordIOOperation(operationId: string, input: any, output: any, method?: string): void {
    if (this.useTwoPhaseDebug && this.twoPhaseDebugSystem) {
      const ioConfig = this.twoPhaseDebugSystem.getIOTrackingConfig();
      if (ioConfig.enabled) {
        this.twoPhaseDebugSystem.recordOperation(
          this.info.id,
          operationId,
          input,
          output,
          method
        );
      }
    }
  }

  /**
   * Start tracking an I/O operation
   * @param operationId - Unique identifier for the operation
   * @param input - Input data
   * @param method - Method name that performed the operation
   */
  public startIOTracking(operationId: string, input: any, method?: string): void {
    if (this.useTwoPhaseDebug && this.twoPhaseDebugSystem) {
      const ioConfig = this.twoPhaseDebugSystem.getIOTrackingConfig();
      if (ioConfig.enabled) {
        this.twoPhaseDebugSystem.startOperation(this.info.id, operationId, input, method);
      }
    }
  }

  /**
   * End tracking an I/O operation
   * @param operationId - Unique identifier for the operation
   * @param output - Output data
   * @param success - Whether the operation was successful
   * @param error - Error message if operation failed
   */
  public endIOTracking(operationId: string, output: any, success: boolean = true, error?: string): void {
    if (this.useTwoPhaseDebug && this.twoPhaseDebugSystem) {
      const ioConfig = this.twoPhaseDebugSystem.getIOTrackingConfig();
      if (ioConfig.enabled) {
        this.twoPhaseDebugSystem.endOperation(this.info.id, operationId, output, success, error);
      }
    }
  }
}