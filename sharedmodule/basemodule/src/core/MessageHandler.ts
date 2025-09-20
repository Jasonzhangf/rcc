import { Message, MessageResponse, MessageHandler as MessageHandlerInterface } from '../interfaces/Message';
import { MessageCenter } from '../MessageCenter';
import { v4 as uuidv4 } from 'uuid';

/**
 * Handles all messaging operations for modules
 */
export class MessageHandler implements MessageHandlerInterface {
  private messageCenter: MessageCenter;
  private moduleId: string;
  private debugCallback?: (level: string, message: string, data?: any, method?: string) => void;

  constructor(moduleId: string, debugCallback?: (level: string, message: string, data?: any, method?: string) => void) {
    this.moduleId = moduleId;
    this.messageCenter = MessageCenter.getInstance();
    this.debugCallback = debugCallback;
  }

  /**
   * Send a one-way message (fire and forget)
   */
  public sendMessage(
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
      source: this.moduleId,
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
   */
  public async sendRequest(
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
      source: this.moduleId,
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
   */
  public sendRequestAsync(
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
      source: this.moduleId,
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
   */
  public broadcastMessage(
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
          data: { pong: true, moduleId: this.moduleId },
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
   * Internal debug logging
   */
  private debug(level: string, message: string, data?: any, method?: string): void {
    if (this.debugCallback) {
      this.debugCallback(level, message, data, method);
    }
  }
}