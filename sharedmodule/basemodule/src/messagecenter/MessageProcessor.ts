import { Message, MessageResponse } from '../interfaces/Message';

/**
 * Handles message processing, routing, and delivery
 */
export class MessageProcessor {
  /**
   * Process an incoming message with TTL validation
   * @param message - Message to process
   * @param targetModule - Target module instance (for targeted messages)
   * @param broadcastHandler - Handler for broadcast messages
   * @returns Promise that resolves when message is processed
   */
  public async processMessage(
    message: Message,
    targetModule: any | undefined,
    broadcastHandler: (message: Message) => Promise<void>
  ): Promise<void> {
    // Check for TTL expiration
    if (message.ttl && Date.now() - message.timestamp > message.ttl) {
      throw new Error('Message TTL expired');
    }

    if (message.target) {
      // Targeted message
      if (!targetModule) {
        throw new Error(`Target module ${message.target} not found`);
      }

      await this.deliverMessage(message, targetModule);
    } else {
      // Broadcast message
      await broadcastHandler(message);
    }
  }

  /**
   * Deliver a message to a specific module
   * @param message - Message to deliver
   * @param moduleInstance - Target module instance
   * @returns Promise that resolves to response or void
   */
  public async deliverMessage(message: Message, moduleInstance: any): Promise<MessageResponse | void> {
    if (typeof moduleInstance.handleMessage !== 'function') {
      throw new Error(`Module does not implement handleMessage method`);
    }

    try {
      const response = await moduleInstance.handleMessage(message);
      return response;
    } catch (error) {
      throw new Error(`Failed to deliver message to module: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Broadcast a message to multiple modules
   * @param message - Message to broadcast
   * @param modules - Map of module IDs to instances
   * @param deliveryHandler - Handler for individual message delivery
   * @returns Promise that resolves when all modules have been processed
   */
  public async broadcastMessage(
    message: Message,
    modules: Map<string, any>,
    deliveryHandler: (message: Message, moduleId: string, moduleInstance: any) => Promise<void>
  ): Promise<void> {
    const deliveryPromises: Promise<void>[] = [];

    for (const [moduleId, moduleInstance] of modules.entries()) {
      if (moduleId !== message.source) {
        // Don't send back to sender
        const deliveryPromise = deliveryHandler(message, moduleId, moduleInstance);
        deliveryPromises.push(deliveryPromise);
      }
    }

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Validate message structure
   * @param message - Message to validate
   * @returns True if message is valid
   */
  public validateMessage(message: Partial<Message>): boolean {
    const requiredFields = ['id', 'type', 'source', 'payload', 'timestamp'];

    for (const field of requiredFields) {
      if (!(field in message)) {
        return false;
      }
    }

    // Validate data types
    if (typeof message.id !== 'string' || message.id.trim() === '') {
      return false;
    }

    if (typeof message.type !== 'string' || message.type.trim() === '') {
      return false;
    }

    if (typeof message.source !== 'string' || message.source.trim() === '') {
      return false;
    }

    if (typeof message.timestamp !== 'number' || message.timestamp <= 0) {
      return false;
    }

    // Validate optional fields
    if (message.target && (typeof message.target !== 'string' || message.target.trim() === '')) {
      return false;
    }

    // Validate topic field
    if (message.topic && (typeof message.topic !== 'string' || message.topic.trim() === '')) {
      return false;
    }

    if (message.correlationId && (typeof message.correlationId !== 'string' || message.correlationId.trim() === '')) {
      return false;
    }

    if (message.ttl && (typeof message.ttl !== 'number' || message.ttl <= 0)) {
      return false;
    }

    if (message.priority && (typeof message.priority !== 'number' || message.priority < 0 || message.priority > 9)) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize message for delivery
   * @param message - Message to sanitize
   * @returns Sanitized message
   */
  public sanitizeMessage(message: Partial<Message>): Partial<Message> {
    const sanitized: Partial<Message> = {
      id: message.id || '',
      type: message.type || '',
      source: message.source || '',
      payload: message.payload,
      timestamp: message.timestamp || Date.now(),
    };

    // Add optional fields if they exist and are valid
    if (message.target && typeof message.target === 'string' && message.target.trim() !== '') {
      sanitized.target = message.target;
    }

    // Add topic field
    if (message.topic && typeof message.topic === 'string' && message.topic.trim() !== '') {
      sanitized.topic = message.topic;
    }

    if (message.correlationId && typeof message.correlationId === 'string' && message.correlationId.trim() !== '') {
      sanitized.correlationId = message.correlationId;
    }

    if (message.metadata && typeof message.metadata === 'object' && message.metadata !== null) {
      sanitized.metadata = { ...message.metadata };
    }

    if (message.ttl && typeof message.ttl === 'number' && message.ttl > 0) {
      sanitized.ttl = message.ttl;
    }

    if (message.priority !== undefined && typeof message.priority === 'number' && message.priority >= 0 && message.priority <= 9) {
      sanitized.priority = message.priority;
    }

    return sanitized;
  }

  /**
   * Create a response message
   * @param originalMessage - Original message
   * @param success - Whether operation was successful
   * @param data - Response data
   * @param error - Error message
   * @returns Response message
   */
  public createResponse(
    originalMessage: Message,
    success: boolean,
    data?: any,
    error?: string
  ): MessageResponse {
    return {
      messageId: originalMessage.id,
      correlationId: originalMessage.correlationId || '',
      success,
      data,
      error,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if message requires a response
   * @param message - Message to check
   * @returns True if message requires a response
   */
  public requiresResponse(message: Message): boolean {
    return !!message.correlationId;
  }

  /**
   * Get message priority level
   * @param message - Message to check
   * @returns Priority level (0-9, default 5)
   */
  public getMessagePriority(message: Message): number {
    return message.priority !== undefined ? Math.max(0, Math.min(9, message.priority)) : 5;
  }

  /**
   * Check if message has expired
   * @param message - Message to check
   * @returns True if message has expired
   */
  public isMessageExpired(message: Message): boolean {
    if (!message.ttl) {
      return false;
    }
    return Date.now() - message.timestamp > message.ttl;
  }

  /**
   * Get remaining TTL for message
   * @param message - Message to check
   * @returns Remaining TTL in milliseconds, or -1 if expired
   */
  public getRemainingTTL(message: Message): number {
    if (!message.ttl) {
      return -1;
    }

    const elapsed = Date.now() - message.timestamp;
    return message.ttl - elapsed;
  }
}