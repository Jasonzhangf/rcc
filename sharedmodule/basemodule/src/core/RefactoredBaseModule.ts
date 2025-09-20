import { ModuleInfo } from '../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../interfaces/Connection';
import { ValidationRule, ValidationResult } from '../interfaces/Validation';
import { Message, MessageResponse } from '../interfaces/Message';
import { DebugLevel, DebugLogEntry, DebugConfig } from './DebugLogger';

// Import the new core components
import { BaseModuleCore } from './BaseModuleCore';
import { ConnectionManager } from './ConnectionManager';
import { DebugLogger } from './DebugLogger';
import { MessageHandler } from './MessageHandler';
import { ValidationManager } from './ValidationManager';
import { PipelineSessionManager } from './PipelineSessionManager';
import { ConfigurationManager } from './ConfigurationManager';

/**
 * Refactored BaseModule - Composition-based approach with separated concerns
 *
 * This version breaks down the monolithic BaseModule into focused components:
 * - BaseModuleCore: Core lifecycle and basic functionality
 * - ConnectionManager: Manages connections and data transfer
 * - DebugLogger: Handles all logging and debug operations
 * - MessageHandler: Manages messaging operations
 * - ValidationManager: Handles validation rules and input validation
 * - PipelineSessionManager: Manages pipeline session tracking
 * - ConfigurationManager: Manages configuration
 */
export abstract class RefactoredBaseModule {
  // Core components
  private core: BaseModuleCore;
  private connectionManager: ConnectionManager;
  private debugLogger: DebugLogger;
  private messageHandler: MessageHandler;
  private validationManager: ValidationManager;
  private pipelineSessionManager: PipelineSessionManager;
  private configurationManager: ConfigurationManager;

  /**
   * Creates an instance of RefactoredBaseModule
   * @param info - Module information
   */
  constructor(info: ModuleInfo) {
    // Initialize core components
    this.core = new BaseModuleCore(info);
    this.connectionManager = new ConnectionManager(info.id);
    this.debugLogger = new DebugLogger(info.id, info.name, info.version);
    // Create wrapper callbacks to handle string level -> DebugLevel conversion
    const debugCallback = (level: string, message: string, data?: any, method?: string) => {
      this.debugLogger.debug(level as any, message, data, method);
    };

    this.messageHandler = new MessageHandler(info.id, debugCallback);
    this.validationManager = new ValidationManager(info.id, debugCallback);
    this.pipelineSessionManager = new PipelineSessionManager(info.id, debugCallback);
    this.configurationManager = new ConfigurationManager(info.id, debugCallback);
  }

  /**
   * Static factory method to create an instance of the module
   */
  static createInstance<T extends RefactoredBaseModule>(this: new (info: ModuleInfo) => T, info: ModuleInfo): T {
    return new this(info);
  }

  // ========================================
  // Core Module Methods
  // ========================================

  /**
   * Configures the module with initialization data
   */
  public configure(config: Record<string, any>): void {
    this.core.configure(config);
    this.configurationManager.setConfiguration(config);
  }

  /**
   * Initializes the module
   */
  public async initialize(): Promise<void> {
    await this.core.initialize();
    this.debugLogger.logInfo('Module initialized', { configured: this.configurationManager.hasConfigurationKey('configured') }, 'initialize');
  }

  /**
   * Gets the module information
   */
  public getInfo(): ModuleInfo {
    return this.core.getInfo();
  }

  /**
   * Gets the module configuration
   */
  public getConfig(): Record<string, any> {
    return this.configurationManager.getConfiguration();
  }

  /**
   * Cleans up resources and connections
   */
  public async destroy(): Promise<void> {
    this.debugLogger.logInfo('Module destroyed', {}, 'destroy');

    // Clean up all components
    this.connectionManager.cleanup();
    this.debugLogger.cleanup();
    this.pipelineSessionManager.cleanup();

    await this.core.destroy();
  }

  // ========================================
  // Connection Management Methods
  // ========================================

  /**
   * Adds an input connection
   */
  public addInputConnection(connection: ConnectionInfo): void {
    this.connectionManager.addInputConnection(connection);
  }

  /**
   * Adds an output connection
   */
  public addOutputConnection(connection: ConnectionInfo): void {
    this.connectionManager.addOutputConnection(connection);
  }

  /**
   * Removes an input connection
   */
  public removeInputConnection(connectionId: string): void {
    this.connectionManager.removeInputConnection(connectionId);
  }

  /**
   * Removes an output connection
   */
  public removeOutputConnection(connectionId: string): void {
    this.connectionManager.removeOutputConnection(connectionId);
  }

  /**
   * Gets all input connections
   */
  public getInputConnections(): ConnectionInfo[] {
    return this.connectionManager.getInputConnections();
  }

  /**
   * Gets all output connections
   */
  public getOutputConnections(): ConnectionInfo[] {
    return this.connectionManager.getOutputConnections();
  }

  /**
   * Transfers data to connected modules
   */
  protected async transferData(data: any, targetConnectionId?: string): Promise<void> {
    // Log data transfer if tracking is enabled
    if (this.debugLogger.getDebugConfig().trackDataFlow) {
      this.debugLogger.debug('debug', 'Data transferred', { data, targetConnectionId }, 'transferData');
    }

    await this.connectionManager.transferData(data, targetConnectionId);
  }

  /**
   * Receives data from connected modules
   */
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    // Log data reception if tracking is enabled
    if (this.debugLogger.getDebugConfig().trackDataFlow) {
      this.debugLogger.debug('debug', 'Data received', dataTransfer, 'receiveData');
    }

    await this.connectionManager.receiveData(dataTransfer);
  }

  /**
   * Performs handshake with another module
   */
  public async handshake(targetModule: RefactoredBaseModule): Promise<boolean> {
    const result = await this.connectionManager.handshake(targetModule.getInfo().id);
    this.debugLogger.debug('debug', 'Handshake performed', { targetModule: targetModule.getInfo().id }, 'handshake');
    return result;
  }

  // ========================================
  // Debug/Logging Methods
  // ========================================

  /**
   * Sets the debug configuration
   */
  public setDebugConfig(config: Partial<DebugConfig>): void {
    this.debugLogger.setDebugConfig(config);
    this.configurationManager.setDebugConfig(config);
  }

  /**
   * Sets the pipeline position for this module
   */
  public setPipelinePosition(position: 'start' | 'middle' | 'end'): void {
    this.debugLogger.setPipelinePosition(position);
    this.pipelineSessionManager.setPipelinePosition(position);
  }

  /**
   * Sets the current session ID for pipeline operations
   */
  public setCurrentSession(sessionId: string): void {
    this.debugLogger.setCurrentSession(sessionId);
    this.pipelineSessionManager.setCurrentSession(sessionId);
  }

  /**
   * Gets the current debug configuration
   */
  public getDebugConfig(): DebugConfig {
    return this.debugLogger.getDebugConfig();
  }

  /**
   * Logs a trace message
   */
  protected trace(message: string, data?: any, method?: string): void {
    this.debugLogger.trace(message, data, method);
  }

  /**
   * Logs a debug message
   */
  protected log(message: string, data?: any, method?: string): void {
    this.debugLogger.log(message, data, method);
  }

  /**
   * Logs an info message
   */
  protected logInfo(message: string, data?: any, method?: string): void {
    this.debugLogger.logInfo(message, data, method);
  }

  /**
   * Logs a warning message
   */
  protected warn(message: string, data?: any, method?: string): void {
    this.debugLogger.warn(message, data, method);
  }

  /**
   * Logs an error message
   */
  protected error(message: string, data?: any, method?: string): void {
    this.debugLogger.error(message, data, method);
  }

  /**
   * Gets debug logs
   */
  public getDebugLogs(level?: DebugLevel, limit?: number): DebugLogEntry[] {
    return this.debugLogger.getDebugLogs(level, limit);
  }

  /**
   * Clears debug logs
   */
  public clearDebugLogs(): void {
    this.debugLogger.clearDebugLogs();
  }

  /**
   * Start a pipeline session
   */
  public startPipelineSession(sessionId: string, pipelineConfig: any): void {
    this.debugLogger.startPipelineSession(sessionId, pipelineConfig);
  }

  /**
   * End a pipeline session
   */
  public endPipelineSession(sessionId: string, success: boolean = true): void {
    this.debugLogger.endPipelineSession(sessionId, success);
  }

  // ========================================
  // Message Handling Methods
  // ========================================

  /**
   * Send a one-way message (fire and forget)
   */
  protected sendMessage(
    type: string,
    payload: any,
    target?: string,
    metadata?: Record<string, any>,
    ttl?: number,
    priority?: number
  ): void {
    this.messageHandler.sendMessage(type, payload, target, metadata, ttl, priority);
  }

  /**
   * Send a message and wait for response (blocking)
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
    return this.messageHandler.sendRequest(type, payload, target, timeout, metadata, ttl, priority);
  }

  /**
   * Send a message with callback for response (non-blocking)
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
    this.messageHandler.sendRequestAsync(type, payload, target, callback, timeout, metadata, ttl, priority);
  }

  /**
   * Broadcast a message to all modules
   */
  protected broadcastMessage(
    type: string,
    payload: any,
    metadata?: Record<string, any>,
    ttl?: number,
    priority?: number
  ): void {
    this.messageHandler.broadcastMessage(type, payload, metadata, ttl, priority);
  }

  /**
   * Handle incoming messages
   */
  public async handleMessage(message: Message): Promise<MessageResponse | void> {
    return this.messageHandler.handleMessage(message);
  }

  // ========================================
  // Validation Methods
  // ========================================

  /**
   * Adds a validation rule
   */
  protected addValidationRule(rule: ValidationRule): void {
    this.validationManager.addValidationRule(rule);
  }

  /**
   * Removes a validation rule
   */
  protected removeValidationRule(fieldName: string): void {
    this.validationManager.removeValidationRule(fieldName);
  }

  /**
   * Gets all validation rules
   */
  protected getValidationRules(): ValidationRule[] {
    return this.validationManager.getValidationRules();
  }

  /**
   * Clears all validation rules
   */
  protected clearValidationRules(): void {
    this.validationManager.clearValidationRules();
  }

  /**
   * Validates input data against validation rules
   */
  protected validateInput(data: any): ValidationResult {
    return this.validationManager.validateInput(data);
  }

  /**
   * Validates a specific field
   */
  protected validateField(fieldName: string, value: any): ValidationResult {
    return this.validationManager.validateField(fieldName, value);
  }

  // ========================================
  // Pipeline Session Methods
  // ========================================

  /**
   * Gets the pipeline position for this module
   */
  public getPipelinePosition(): 'start' | 'middle' | 'end' | undefined {
    return this.pipelineSessionManager.getPipelinePosition();
  }

  /**
   * Gets the current session ID
   */
  public getCurrentSession(): string | undefined {
    return this.pipelineSessionManager.getCurrentSession();
  }

  /**
   * Checks if module has an active session
   */
  public hasActiveSession(): boolean {
    return this.pipelineSessionManager.hasActiveSession();
  }

  // ========================================
  // I/O Tracking Methods
  // ========================================

  /**
   * Record an I/O operation start
   */
  public startIOTracking(operationId: string, input: any, method?: string): void {
    this.debugLogger.startIOTracking(operationId, input, method);
  }

  /**
   * Record an I/O operation end
   */
  public endIOTracking(operationId: string, output: any, success: boolean = true, error?: string): void {
    this.debugLogger.endIOTracking(operationId, output, success, error);
  }

  // ========================================
  // Configuration Methods
  // ========================================

  /**
   * Gets a specific configuration value
   */
  protected getConfigurationValue(key: string, defaultValue?: any): any {
    return this.configurationManager.getConfigurationValue(key, defaultValue);
  }

  /**
   * Sets a specific configuration value
   */
  protected setConfigurationValue(key: string, value: any): void {
    this.configurationManager.setConfigurationValue(key, value);
  }

  /**
   * Merges configuration with existing configuration
   */
  protected mergeConfiguration(config: Record<string, any>): void {
    this.configurationManager.mergeConfiguration(config);
  }

  /**
   * Checks if a configuration key exists
   */
  protected hasConfigurationKey(key: string): boolean {
    return this.configurationManager.hasConfigurationKey(key);
  }

  /**
   * Gets all configuration keys
   */
  protected getConfigurationKeys(): string[] {
    return this.configurationManager.getConfigurationKeys();
  }

  // ========================================
  // Lifecycle Event Methods
  // ========================================

  /**
   * Handle module lifecycle events
   */
  public onModuleRegistered(moduleId: string): void {
    this.core.onModuleRegistered(moduleId);
    this.debugLogger.logInfo('Module registered', { moduleId }, 'onModuleRegistered');
  }

  /**
   * Handle module lifecycle events
   */
  public onModuleUnregistered(moduleId: string): void {
    this.core.onModuleUnregistered(moduleId);
    this.debugLogger.logInfo('Module unregistered', { moduleId }, 'onModuleUnregistered');
  }
}