import { Message, MessageResponse, MessageCenterStats } from './interfaces/Message';
import { v4 as uuidv4 } from 'uuid';

/**
 * Message center for module communication
 */
export class MessageCenter {
  private static instance: MessageCenter;
  private modules: Map<string, any> = new Map(); // Map of module IDs to module instances
  private pendingRequests: Map<
    string,
    {
      resolve: (response: MessageResponse) => void;
      reject: (error: any) => void;
      timeoutId: NodeJS.Timeout;
    }
  > = new Map();

  // Statistics tracking
  private stats = {
    totalMessages: 0,
    totalRequests: 0,
    activeRequests: 0,
    registeredModules: 0,
    messagesDelivered: 0,
    messagesFailed: 0,
    averageResponseTime: 0,
    uptime: Date.now(),
  };

  private responseTimes: number[] = [];
  private startTime = Date.now();

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of MessageCenter
   * @returns MessageCenter instance
   */
  public static getInstance(): MessageCenter {
    if (!MessageCenter.instance) {
      MessageCenter.instance = new MessageCenter();
    }
    return MessageCenter.instance;
  }

  /**
   * Register a module with the message center
   * @param moduleId - Module ID
   * @param moduleInstance - Module instance
   */
  public registerModule(moduleId: string, moduleInstance: any): void {
    this.modules.set(moduleId, moduleInstance);
    this.stats.registeredModules = this.modules.size;

    // Notify other modules about new registration
    setImmediate(() => {
      this.broadcastMessage({
        id: uuidv4(),
        type: 'module_registered',
        source: 'MessageCenter',
        payload: { moduleId },
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Unregister a module from the message center
   * @param moduleId - Module ID
   */
  public unregisterModule(moduleId: string): void {
    this.modules.delete(moduleId);
    this.stats.registeredModules = this.modules.size;

    // Clean up any pending requests for this module
    for (const [correlationId, request] of this.pendingRequests.entries()) {
      // In a real implementation, you might want to check if this request was to/from the unregistered module
      // For simplicity, we're just cleaning up all pending requests when any module is unregistered
      clearTimeout(request.timeoutId);
      this.pendingRequests.delete(correlationId);
    }

    // Notify other modules about unregistration
    setImmediate(() => {
      this.broadcastMessage({
        id: uuidv4(),
        type: 'module_unregistered',
        source: 'MessageCenter',
        payload: { moduleId },
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Send a one-way message
   * @param message - Message to send
   */
  public sendMessage(message: Message): void {
    this.stats.totalMessages++;

    setImmediate(() => {
      this.processMessage(message).catch((error) => {
        console.error(`Error processing message ${message.id}:`, error);
        this.stats.messagesFailed++;
      });
    });
  }

  /**
   * Broadcast a message to all modules
   * @param message - Message to broadcast
   */
  public broadcastMessage(message: Message): void {
    this.stats.totalMessages++;

    setImmediate(() => {
      // Send to all registered modules
      for (const [moduleId, moduleInstance] of this.modules.entries()) {
        if (moduleId !== message.source) {
          // Don't send back to sender
          this.deliverMessage(message, moduleInstance).catch((error) => {
            console.error(`Error delivering broadcast message to ${moduleId}:`, error);
            this.stats.messagesFailed++;
          });
        }
      }
    });
  }

  /**
   * Send a request and wait for response
   * @param message - Request message
   * @param timeout - Timeout in milliseconds
   * @returns Promise that resolves to the response
   */
  public sendRequest(message: Message, timeout: number = 30000): Promise<MessageResponse> {
    this.stats.totalRequests++;
    this.stats.activeRequests++;

    return new Promise((resolve, reject) => {
      if (!message.correlationId) {
        message.correlationId = uuidv4();
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(message.correlationId!);
        this.stats.activeRequests--;
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      // Store pending request
      this.pendingRequests.set(message.correlationId, { resolve, reject, timeoutId });

      // Send the message
      this.sendMessage(message);
    });
  }

  /**
   * Send a request with callback (non-blocking)
   * @param message - Request message
   * @param callback - Callback function for response
   * @param timeout - Timeout in milliseconds
   */
  public sendRequestAsync(
    message: Message,
    callback: (response: MessageResponse) => void,
    timeout: number = 30000
  ): void {
    this.stats.totalRequests++;
    this.stats.activeRequests++;

    if (!message.correlationId) {
      message.correlationId = uuidv4();
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      this.pendingRequests.delete(message.correlationId!);
      this.stats.activeRequests--;
      callback({
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: `Request timeout after ${timeout}ms`,
        timestamp: Date.now(),
      });
    }, timeout);

    // Store pending request
    this.pendingRequests.set(message.correlationId, {
      resolve: (response: MessageResponse) => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(message.correlationId!);
        this.stats.activeRequests--;
        callback(response);
      },
      reject: (error: any) => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(message.correlationId!);
        this.stats.activeRequests--;
        callback({
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: false,
          error: error.message || 'Unknown error',
          timestamp: Date.now(),
        });
      },
      timeoutId,
    });

    // Send the message
    this.sendMessage(message);
  }

  /**
   * Process an incoming message
   * @param message - Message to process
   */
  private async processMessage(message: Message): Promise<void> {
    try {
      // Check for TTL expiration
      if (message.ttl && Date.now() - message.timestamp > message.ttl) {
        throw new Error('Message TTL expired');
      }

      if (message.target) {
        // Targeted message
        const targetModule = this.modules.get(message.target);
        if (!targetModule) {
          throw new Error(`Target module ${message.target} not found`);
        }

        await this.deliverMessage(message, targetModule);
      } else {
        // Broadcast message
        this.broadcastMessage(message);
      }
    } catch (error) {
      this.stats.messagesFailed++;

      // If this was a request, send error response
      if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
        const request = this.pendingRequests.get(message.correlationId)!;
        clearTimeout(request.timeoutId);
        request.reject(error);
        this.pendingRequests.delete(message.correlationId);
        this.stats.activeRequests--;
      } else {
        console.error(`Error processing message ${message.id}:`, error);
      }
    }
  }

  /**
   * Deliver a message to a specific module
   * @param message - Message to deliver
   * @param moduleInstance - Target module instance
   */
  private async deliverMessage(message: Message, moduleInstance: any): Promise<void> {
    const startTime = Date.now();

    if (typeof moduleInstance.handleMessage === 'function') {
      const response = await moduleInstance.handleMessage(message);
      this.stats.messagesDelivered++;

      // If this was a request with a correlation ID, send response back
      if (message.correlationId && response && this.pendingRequests.has(message.correlationId)) {
        const request = this.pendingRequests.get(message.correlationId)!;
        const responseTime = Date.now() - startTime;

        this.responseTimes.push(responseTime);
        if (this.responseTimes.length > 1000) {
          this.responseTimes = this.responseTimes.slice(-100); // Keep only last 100
        }

        clearTimeout(request.timeoutId);
        request.resolve(response);
        this.pendingRequests.delete(message.correlationId);
        this.stats.activeRequests--;
      }
    }
  }

  /**
   * Get message center statistics
   * @returns Statistics object
   */
  public getStats(): MessageCenterStats {
    const avgResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0;

    return {
      ...this.stats,
      averageResponseTime: Math.round(avgResponseTime),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Reset message center statistics
   */
  public resetStats(): void {
    this.stats = {
      totalMessages: 0,
      totalRequests: 0,
      activeRequests: 0,
      registeredModules: this.modules.size,
      messagesDelivered: 0,
      messagesFailed: 0,
      averageResponseTime: 0,
      uptime: Date.now(),
    };
    this.responseTimes = [];
    this.startTime = Date.now();
  }
}
