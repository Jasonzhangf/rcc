import { Message, MessageResponse, MessageCenterStats } from './interfaces/Message';
/**
 * Message center for module communication
 */
export declare class MessageCenter {
    private static instance;
    private modules;
    private pendingRequests;
    private stats;
    private responseTimes;
    private startTime;
    /**
     * Private constructor for singleton pattern
     */
    private constructor();
    /**
     * Get the singleton instance of MessageCenter
     * @returns MessageCenter instance
     */
    static getInstance(): MessageCenter;
    /**
     * Register a module with the message center
     * @param moduleId - Module ID
     * @param moduleInstance - Module instance
     */
    registerModule(moduleId: string, moduleInstance: any): void;
    /**
     * Unregister a module from the message center
     * @param moduleId - Module ID
     */
    unregisterModule(moduleId: string): void;
    /**
     * Send a one-way message
     * @param message - Message to send
     */
    sendMessage(message: Message): void;
    /**
     * Broadcast a message to all modules
     * @param message - Message to broadcast
     */
    broadcastMessage(message: Message): void;
    /**
     * Send a request and wait for response
     * @param message - Request message
     * @param timeout - Timeout in milliseconds
     * @returns Promise that resolves to the response
     */
    sendRequest(message: Message, timeout?: number): Promise<MessageResponse>;
    /**
     * Send a request with callback (non-blocking)
     * @param message - Request message
     * @param callback - Callback function for response
     * @param timeout - Timeout in milliseconds
     */
    sendRequestAsync(message: Message, callback: (response: MessageResponse) => void, timeout?: number): void;
    /**
     * Process an incoming message
     * @param message - Message to process
     */
    private processMessage;
    /**
     * Deliver a message to a specific module
     * @param message - Message to deliver
     * @param moduleInstance - Target module instance
     */
    private deliverMessage;
    /**
     * Get message center statistics
     * @returns Statistics object
     */
    getStats(): MessageCenterStats;
    /**
     * Reset message center statistics
     */
    resetStats(): void;
}
