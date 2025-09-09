/**
 * Interface for messages exchanged between modules
 */
export interface Message {
  /**
   * Unique message ID
   */
  id: string;
  
  /**
   * Message type identifier
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
   * Creation timestamp
   */
  timestamp: number;
  
  /**
   * Correlation ID for request/response matching
   */
  correlationId?: string;
  
  /**
   * Time to live in milliseconds
   */
  ttl?: number;
  
  /**
   * Message priority (0-9, where 9 is highest)
   */
  priority?: number;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Interface for message responses
 */
export interface MessageResponse {
  /**
   * ID of the original message
   */
  messageId: string;
  
  /**
   * Correlation ID for matching
   */
  correlationId: string;
  
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Response data (if successful)
   */
  data?: any;
  
  /**
   * Error message (if failed)
   */
  error?: string;
  
  /**
   * Response timestamp
   */
  timestamp: number;
}

/**
 * Interface for message handlers in modules
 */
export interface MessageHandler {
  /**
   * Handle incoming messages
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

/**
 * Message center statistics
 */
export interface MessageCenterStats {
  /**
   * Total messages sent
   */
  totalMessagesSent: number;
  
  /**
   * Total messages received
   */
  totalMessagesReceived: number;
  
  /**
   * Total messages processed
   */
  totalMessagesProcessed: number;
  
  /**
   * Total errors
   */
  totalErrors: number;
  
  /**
   * Active modules
   */
  activeModules: number;
  
  /**
   * Pending messages
   */
  pendingMessages: number;
}