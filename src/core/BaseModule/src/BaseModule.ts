import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';
import { ValidationRule, ValidationResult } from '../../../interfaces/Validation';
import { MessageCenter } from '../../MessageCenter';
import { Message, MessageResponse, MessageHandler } from '../../../interfaces/Message';
import { IDebugModule } from '../../../modules/debug/interfaces/IDebugModule';
import { v4 as uuidv4 } from 'uuid';

/**
 * Abstract base class for all modules
 * Provides foundational functionality for module management, connections, and validation
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
   * Sent data records (for testing purposes)
   */
  protected sentData: any[] = [];
  
  /**
   * Received data records (for testing purposes)
   */
  protected receivedData: any[] = [];
  
  /**
   * Debug module for logging and debugging
   */
  protected debugModule: IDebugModule | null = null;
  
  /**
   * Message center instance
   */
  protected messageCenter: MessageCenter;
  
  /**
   * Creates an instance of BaseModule
   * @param info - Module information
   */
  constructor(info: ModuleInfo) {
    this.info = info;
    this.messageCenter = MessageCenter.getInstance();
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
  }
  
  /**
   * Sets the debug module for logging and debugging
   * @param debugModule - Debug module instance
   */
  public setDebugModule(debugModule: IDebugModule): void {
    this.debugModule = debugModule;
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
    
    // Base initialization logic
    this.initialized = true;
    
    // Register with message center
    this.messageCenter.registerModule(this.info.id, this);
    
    // Log initialization if debug module is set
    if (this.debugModule) {
      this.debugModule.log(`Module ${this.info.id} initialized`, 1, this.info);
    }
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
    
    // Log connection if debug module is set
    if (this.debugModule) {
      this.debugModule.log(`Added input connection ${connection.id} to module ${this.info.id}`, 1, this.info);
      this.debugModule.addModuleConnection(this.info.id, 'input');
    }
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
    
    // Log connection if debug module is set
    if (this.debugModule) {
      this.debugModule.log(`Added output connection ${connection.id} to module ${this.info.id}`, 1, this.info);
      this.debugModule.addModuleConnection(this.info.id, 'output');
    }
  }
  
  /**
   * Removes an input connection
   * @param connectionId - Connection ID
   */
  public removeInputConnection(connectionId: string): void {
    this.inputConnections.delete(connectionId);
    
    // Log removal if debug module is set
    if (this.debugModule) {
      this.debugModule.log(`Removed input connection ${connectionId} from module ${this.info.id}`, 1, this.info);
    }
  }
  
  /**
   * Removes an output connection
   * @param connectionId - Connection ID
   */
  public removeOutputConnection(connectionId: string): void {
    this.outputConnections.delete(connectionId);
    
    // Log removal if debug module is set
    if (this.debugModule) {
      this.debugModule.log(`Removed output connection ${connectionId} from module ${this.info.id}`, 1, this.info);
    }
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
    
    // Log handshake if debug module is set
    if (this.debugModule) {
      this.debugModule.log(
        `Handshake performed between ${this.info.id} and ${targetModule.getInfo().id}`, 
        1, 
        this.info
      );
    }
    
    return result;
  }
  
  /**
   * Transfers data to connected modules
   * @param data - Data to transfer
   * @param targetConnectionId - Optional target connection ID
   */
  protected async transferData(data: any, targetConnectionId?: string): Promise<void> {
    // Record the data being sent (for testing purposes)
    this.sentData.push({
      data: { ...data },
      timestamp: Date.now()
    });
    
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
      // Log data transfer if debug module is set
      if (this.debugModule) {
        this.debugModule.recordDataFlow(
          this.info.id,
          transfer.targetConnectionId,
          transfer.data
        );
      }
      
      // In a real implementation, you would send the data to the target module
      // For now, we'll just log the transfer
      console.log(`Transferring data from module ${this.info.id} to connection ${transfer.targetConnectionId}:`, data);
    }
  }
  
  /**
   * Receives data from connected modules
   * This method should be overridden by subclasses
   * @param dataTransfer - Data transfer information
   */
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    // Record the received data (for testing purposes)
    this.receivedData.push({
      data: { ...dataTransfer.data },
      timestamp: dataTransfer.timestamp,
      source: dataTransfer.sourceConnectionId
    });
    
    // Log data reception if debug module is set
    if (this.debugModule) {
      this.debugModule.recordDataFlow(
        dataTransfer.sourceConnectionId,
        this.info.id,
        dataTransfer.data
      );
    }
    
    // Base receive data implementation
    // This should be overridden by subclasses for specific receive logic
    console.log(`Module ${this.info.id} received data:`, dataTransfer.data);
  }
  
  /**
   * Gets the sent data records (for testing purposes)
   * @returns Array of sent data records
   */
  public getSentData(): any[] {
    return [...this.sentData];
  }
  
  /**
   * Gets the received data records (for testing purposes)
   * @returns Array of received data records
   */
  public getReceivedData(): any[] {
    return [...this.receivedData];
  }
  
  /**
   * Handle module lifecycle events
   * @param moduleId - The module ID that was registered
   */
  public onModuleRegistered(moduleId: string): void {
    // Base implementation - can be overridden by subclasses
    if (this.debugModule) {
      this.debugModule.log(`Module ${moduleId} registered`, 1, this.info);
    }
  }
  
  /**
   * Handle module lifecycle events
   * @param moduleId - The module ID that was unregistered
   */
  public onModuleUnregistered(moduleId: string): void {
    // Base implementation - can be overridden by subclasses
    if (this.debugModule) {
      this.debugModule.log(`Module ${moduleId} unregistered`, 1, this.info);
    }
  }
  
  /**
   * Handle incoming messages
   * This method should be overridden by subclasses
   * @param message - The incoming message
   * @returns Promise that resolves to a response or void
   */
  public async handleMessage(message: Message): Promise<MessageResponse | void> {
    // Base implementation - can be overridden by subclasses
    if (this.debugModule) {
      this.debugModule.log(`Module ${this.info.id} received message: ${message.type}`, 1, this.info);
    }
    
    // For request/response messages, we need to return a response
    if (message.correlationId) {
      return {
        messageId: message.id,
        correlationId: message.correlationId,
        success: true,
        data: { message: 'Message received' },
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Send a one-way message (fire and forget)
   * @param type - Message type
   * @param payload - Message payload
   * @param target - Target module ID (optional for broadcasts)
   */
  protected sendMessage(type: string, payload: any, target?: string): void {
    const message: Message = {
      id: uuidv4(),
      type,
      source: this.info.id,
      target,
      payload,
      timestamp: Date.now()
    };
    
    this.messageCenter.sendMessage(message);
  }
  
  /**
   * Send a request and wait for response (blocking)
   * @param type - Message type
   * @param payload - Message payload
   * @param target - Target module ID
   * @param timeout - Timeout in milliseconds (optional)
   * @returns Promise that resolves to the response
   */
  protected async sendRequest(
    type: string, 
    payload: any, 
    target: string, 
    timeout?: number
  ): Promise<MessageResponse> {
    const message: Message = {
      id: uuidv4(),
      type,
      source: this.info.id,
      target,
      payload,
      timestamp: Date.now()
    };
    
    return this.messageCenter.sendRequest(message, timeout);
  }
  
  /**
   * Send a request with callback for response (non-blocking)
   * @param type - Message type
   * @param payload - Message payload
   * @param target - Target module ID
   * @param callback - Callback function for response
   * @param timeout - Timeout in milliseconds (optional)
   */
  protected sendRequestAsync(
    type: string, 
    payload: any, 
    target: string, 
    callback: (response: MessageResponse) => void, 
    timeout?: number
  ): void {
    const message: Message = {
      id: uuidv4(),
      type,
      source: this.info.id,
      target,
      payload,
      timestamp: Date.now()
    };
    
    this.messageCenter.sendRequestAsync(message, callback, timeout);
  }
  
  /**
   * Broadcast a message to all modules
   * @param type - Message type
   * @param payload - Message payload
   */
  protected broadcastMessage(type: string, payload: any): void {
    const message: Message = {
      id: uuidv4(),
      type,
      source: this.info.id,
      payload,
      timestamp: Date.now()
    };
    
    this.messageCenter.broadcastMessage(message);
  }
  
  /**
   * Cleans up resources and connections
   */
  public async destroy(): Promise<void> {
    // Unregister from message center
    this.messageCenter.unregisterModule(this.info.id);
    
    // Log destruction if debug module is set
    if (this.debugModule) {
      this.debugModule.log(`Module ${this.info.id} destroyed`, 1, this.info);
    }
    
    // Clean up connections
    this.inputConnections.clear();
    this.outputConnections.clear();
    this.initialized = false;
    this.configured = false;
    this.config = {};
    this.sentData = [];
    this.receivedData = [];
    this.debugModule = null;
  }
}