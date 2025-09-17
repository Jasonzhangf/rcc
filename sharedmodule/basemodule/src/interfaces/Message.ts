/**
 * Interface for messages between modules
 */
export interface Message {
  /**
   * Unique identifier for the message
   */
  id: string;

  /**
   * Message type
   */
  type: string;

  /**
   * Source module ID
   */
  source: string;

  /**
   * Target module ID (optional for broadcasts)
   */
  target?: string;

  /**
   * Message payload
   */
  payload: any;

  /**
   * Timestamp of the message
   */
  timestamp: number;

  /**
   * Correlation ID for request/response pairs
   */
  correlationId?: string;

  /**
   * Message metadata
   */
  metadata?: Record<string, any>;

  /**
   * Time to live in milliseconds
   */
  ttl?: number;

  /**
   * Message priority (0-9)
   */
  priority?: number;
}

/**
 * Interface for message responses
 */
export interface MessageResponse {
  /**
   * Message ID that this response is for
   */
  messageId: string;

  /**
   * Correlation ID for request/response tracking
   */
  correlationId: string;

  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Response data
   */
  data?: any;

  /**
   * Error message if operation failed
   */
  error?: string;

  /**
   * Timestamp of the response
   */
  timestamp: number;
}

/**
 * Interface for message handlers
 */
export interface MessageHandler {
  /**
   * Handle incoming messages
   * @param message - The incoming message
   * @returns Promise that resolves to a response or void
   */
  handleMessage(message: Message): Promise<MessageResponse | void>;
}

/**
 * Statistics for the MessageCenter
 */
export interface MessageCenterStats {
  /**
   * Total messages processed
   */
  totalMessages: number;

  /**
   * Number of active requests waiting for responses
   */
  activeRequests: number;

  /**
   * Number of registered modules
   */
  registeredModules: number;

  /**
   * Messages delivered successfully
   */
  messagesDelivered: number;

  /**
   * Messages that failed to deliver
   */
  messagesFailed: number;

  /**
   * Average response time in milliseconds
   */
  averageResponseTime: number;

  /**
   * System uptime in milliseconds
   */
  uptime: number;
}
