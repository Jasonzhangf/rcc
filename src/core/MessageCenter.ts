import { Message, MessageResponse, MessageHandler, MessageCenterStats } from '../interfaces/Message';
const { v4: uuidv4 } = require('uuid');

/**
 * Message center for handling all inter-module communication
 * Provides support for both blocking and non-blocking message responses
 */
export class MessageCenter {
  /**
   * Map of registered modules and their handlers
   */
  private modules: Map<string, MessageHandler> = new Map();
  
  /**
   * Pending requests waiting for responses
   */
  private pendingRequests: Map<string, {
    resolve: (response: MessageResponse) => void;
    reject: (error: any) => void;
    timeoutId: NodeJS.Timeout;
  }> = new Map();
  
  /**
   * Message center statistics
   */
  private stats: MessageCenterStats = {
    totalMessagesSent: 0,
    totalMessagesReceived: 0,
    totalMessagesProcessed: 0,
    totalErrors: 0,
    activeModules: 0,
    pendingMessages: 0
  };
  
  /**
   * Default timeout for requests in milliseconds
   */
  private defaultTimeout: number = 30000; // 30 seconds
  
  /**
   * Singleton instance
   */
  private static instance: MessageCenter;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}
  
  /**
   * Gets the singleton instance
   * @returns MessageCenter instance
   */
  public static getInstance(): MessageCenter {
    if (!MessageCenter.instance) {
      MessageCenter.instance = new MessageCenter();
    }
    return MessageCenter.instance;
  }
  
  /**
   * Register a module to receive messages
   * @param moduleId - Module ID
   * @param handler - Message handler
   */
  public registerModule(moduleId: string, handler: MessageHandler): void {
    this.modules.set(moduleId, handler);
    
    // Update stats
    this.stats.activeModules = this.modules.size;
    
    // Notify other modules about the new registration
    this.notifyModuleRegistration(moduleId);
    
    console.log(`Module ${moduleId} registered with MessageCenter`);
  }
  
  /**
   * Unregister a module
   * @param moduleId - Module ID
   */
  public unregisterModule(moduleId: string): void {
    if (this.modules.has(moduleId)) {
      this.modules.delete(moduleId);
      
      // Update stats
      this.stats.activeModules = this.modules.size;
      
      // Notify other modules about the unregistration
      this.notifyModuleUnregistration(moduleId);
      
      console.log(`Module ${moduleId} unregistered from MessageCenter`);
    }
  }
  
  /**
   * Send a one-way message (fire and forget)
   * @param message - Message to send
   */
  public sendMessage(message: Message): void {
    // Validate message
    if (!message.id) {
      throw new Error('Message must have an ID');
    }
    
    if (!message.source) {
      throw new Error('Message must have a source');
    }
    
    if (!message.type) {
      throw new Error('Message must have a type');
    }
    
    // Update stats
    this.stats.totalMessagesSent++;
    
    // Process message asynchronously
    setImmediate(() => {
      this.processMessage(message).catch(error => {
        console.error(`Error processing message ${message.id}:`, error);
        this.stats.totalErrors++;
      });
    });
  }
  
  /**
   * Send a message and wait for response (blocking)
   * @param message - Message to send
   * @param timeout - Timeout in milliseconds (optional)
   * @returns Promise that resolves to the response
   */
  public async sendRequest(message: Message, timeout: number = this.defaultTimeout): Promise<MessageResponse> {
    // Validate message
    if (!message.id) {
      throw new Error('Message must have an ID');
    }
    
    if (!message.source) {
      throw new Error('Message must have a source');
    }
    
    if (!message.target) {
      throw new Error('Request message must have a target');
    }
    
    if (!message.type) {
      throw new Error('Message must have a type');
    }
    
    // Generate correlation ID if not provided
    if (!message.correlationId) {
      message.correlationId = uuidv4();
    }
    
    // Update stats
    this.stats.totalMessagesSent++;
    this.stats.pendingMessages++;
    
    // Create promise for the response
    return new Promise<MessageResponse>((resolve, reject) => {
      // Set timeout for the request
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(message.correlationId!);
        this.stats.pendingMessages--;
        reject(new Error(`Request timeout for message ${message.id}`));
      }, timeout);
      
      // Store the pending request
      this.pendingRequests.set(message.correlationId!, {
        resolve,
        reject,
        timeoutId
      });
      
      // Process message
      this.processMessage(message).catch(error => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(message.correlationId!);
        this.stats.pendingMessages--;
        this.stats.totalErrors++;
        reject(error);
      });
    });
  }
  
  /**
   * Send a message with callback for response (non-blocking)
   * @param message - Message to send
   * @param callback - Callback function for response
   * @param timeout - Timeout in milliseconds (optional)
   */
  public sendRequestAsync(
    message: Message, 
    callback: (response: MessageResponse) => void, 
    timeout: number = this.defaultTimeout
  ): void {
    // Validate message
    if (!message.id) {
      throw new Error('Message must have an ID');
    }
    
    if (!message.source) {
      throw new Error('Message must have a source');
    }
    
    if (!message.target) {
      throw new Error('Request message must have a target');
    }
    
    if (!message.type) {
      throw new Error('Message must have a type');
    }
    
    // Generate correlation ID if not provided
    if (!message.correlationId) {
      message.correlationId = uuidv4();
    }
    
    // Update stats
    this.stats.totalMessagesSent++;
    this.stats.pendingMessages++;
    
    // Set timeout for the request
    const timeoutId = setTimeout(() => {
      this.pendingRequests.delete(message.correlationId!);
      this.stats.pendingMessages--;
      callback({
        messageId: message.id,
        correlationId: message.correlationId!,
        success: false,
        error: `Request timeout for message ${message.id}`,
        timestamp: Date.now()
      });
    }, timeout);
    
    // Store the pending request
    this.pendingRequests.set(message.correlationId!, {
      resolve: (response: MessageResponse) => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(message.correlationId!);
        this.stats.pendingMessages--;
        callback(response);
      },
      reject: (error: any) => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(message.correlationId!);
        this.stats.pendingMessages--;
        callback({
          messageId: message.id,
          correlationId: message.correlationId!,
          success: false,
          error: error.message || 'Unknown error',
          timestamp: Date.now()
        });
      },
      timeoutId
    });
    
    // Process message
    this.processMessage(message).catch(error => {
      clearTimeout(timeoutId);
      this.pendingRequests.delete(message.correlationId!);
      this.stats.pendingMessages--;
      this.stats.totalErrors++;
      callback({
        messageId: message.id,
        correlationId: message.correlationId!,
        success: false,
        error: error.message || 'Unknown error',
        timestamp: Date.now()
      });
    });
  }
  
  /**
   * Broadcast a message to all modules
   * @param message - Message to broadcast
   */
  public broadcastMessage(message: Message): void {
    // Validate message
    if (!message.id) {
      throw new Error('Message must have an ID');
    }
    
    if (!message.source) {
      throw new Error('Message must have a source');
    }
    
    if (!message.type) {
      throw new Error('Message must have a type');
    }
    
    // Update stats
    this.stats.totalMessagesSent++;
    
    // Send to all modules except the source
    const moduleEntries = Array.from(this.modules.entries());
    for (const [moduleId, handler] of moduleEntries) {
      if (moduleId !== message.source) {
        const broadcastMessage: Message = {
          ...message,
          target: moduleId
        };
        
        // Process message asynchronously
        setImmediate(() => {
          this.deliverMessage(broadcastMessage, handler).catch(error => {
            console.error(`Error delivering broadcast message to module ${moduleId}:`, error);
            this.stats.totalErrors++;
          });
        });
      }
    }
  }
  
  /**
   * Get message center statistics
   * @returns Message center statistics
   */
  public getStats(): MessageCenterStats {
    return { ...this.stats };
  }
  
  /**
   * Process a message by delivering it to the appropriate handler
   * @param message - Message to process
   */
  private async processMessage(message: Message): Promise<void> {
    this.stats.totalMessagesReceived++;
    
    try {
      // Check if message has expired
      if (message.ttl && Date.now() - message.timestamp > message.ttl) {
        throw new Error(`Message ${message.id} has expired`);
      }
      
      // Handle broadcast messages
      if (!message.target) {
        this.broadcastMessage(message);
        return;
      }
      
      // Find target module
      const targetHandler = this.modules.get(message.target);
      if (!targetHandler) {
        throw new Error(`Target module ${message.target} not found`);
      }
      
      // Deliver message to target module
      await this.deliverMessage(message, targetHandler);
      
      this.stats.totalMessagesProcessed++;
    } catch (error) {
      this.stats.totalErrors++;
      console.error(`Error processing message ${message.id}:`, error);
      
      // If this was a request, send error response
      if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
        const pendingRequest = this.pendingRequests.get(message.correlationId)!;
        clearTimeout(pendingRequest.timeoutId);
        this.pendingRequests.delete(message.correlationId);
        this.stats.pendingMessages--;
        
        pendingRequest.reject(error);
      }
      
      throw error;
    }
  }
  
  /**
   * Deliver a message to a specific handler
   * @param message - Message to deliver
   * @param handler - Message handler
   */
  private async deliverMessage(message: Message, handler: MessageHandler): Promise<void> {
    try {
      const response = await handler.handleMessage(message);
      
      // If this was a request with a correlation ID, send response
      if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
        const pendingRequest = this.pendingRequests.get(message.correlationId)!;
        clearTimeout(pendingRequest.timeoutId);
        this.pendingRequests.delete(message.correlationId);
        this.stats.pendingMessages--;
        
        // Create response if handler didn't provide one
        const messageResponse: MessageResponse = response && typeof response === 'object' && 'success' in response
          ? response as MessageResponse
          : {
              messageId: message.id,
              correlationId: message.correlationId!,
              success: true,
              data: response,
              timestamp: Date.now()
            };
        
        pendingRequest.resolve(messageResponse);
      }
    } catch (error) {
      // If this was a request with a correlation ID, send error response
      if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
        const pendingRequest = this.pendingRequests.get(message.correlationId)!;
        clearTimeout(pendingRequest.timeoutId);
        this.pendingRequests.delete(message.correlationId);
        this.stats.pendingMessages--;
        
        pendingRequest.reject(error);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Notify all modules about a new module registration
   * @param moduleId - Registered module ID
   */
  private notifyModuleRegistration(moduleId: string): void {
    const notification: Message = {
      id: uuidv4(),
      type: 'module_registered',
      source: 'message_center',
      payload: { moduleId },
      timestamp: Date.now()
    };
    
    const moduleEntries1 = Array.from(this.modules.entries());
    for (const [targetModuleId, handler] of moduleEntries1) {
      if (targetModuleId !== moduleId) {
        const moduleNotification: Message = {
          ...notification,
          target: targetModuleId
        };
        
        // Process notification asynchronously
        setImmediate(() => {
          this.deliverMessage(moduleNotification, handler).catch(error => {
            console.error(`Error delivering registration notification to module ${targetModuleId}:`, error);
          });
        });
      }
    }
  }
  
  /**
   * Notify all modules about a module unregistration
   * @param moduleId - Unregistered module ID
   */
  private notifyModuleUnregistration(moduleId: string): void {
    const notification: Message = {
      id: uuidv4(),
      type: 'module_unregistered',
      source: 'message_center',
      payload: { moduleId },
      timestamp: Date.now()
    };
    
    const moduleEntries2 = Array.from(this.modules.entries());
    for (const [targetModuleId, handler] of moduleEntries2) {
      if (targetModuleId !== moduleId) {
        const moduleNotification: Message = {
          ...notification,
          target: targetModuleId
        };
        
        // Process notification asynchronously
        setImmediate(() => {
          this.deliverMessage(moduleNotification, handler).catch(error => {
            console.error(`Error delivering unregistration notification to module ${targetModuleId}:`, error);
          });
        });
      }
    }
  }
}