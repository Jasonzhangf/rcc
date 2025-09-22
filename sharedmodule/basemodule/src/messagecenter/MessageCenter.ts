import { Message, MessageResponse, MessageCenterStats } from '../interfaces/Message';
import { v4 as uuidv4 } from 'uuid';
import { ModuleRegistry } from './ModuleRegistry';
import { RequestManager } from './RequestManager';
import { MessageProcessor } from './MessageProcessor';
import { StatisticsTracker } from './StatisticsTracker';
import { TopicSubscriptionManager } from './TopicSubscriptionManager';

/**
 * Refactored Message center for module communication
 * Uses composition pattern to separate concerns
 */
export class MessageCenter {
  private static instance: MessageCenter;
  private moduleRegistry: ModuleRegistry;
  private requestManager: RequestManager;
  private messageProcessor: MessageProcessor;
  private statisticsTracker: StatisticsTracker;
  private topicSubscriptionManager: TopicSubscriptionManager;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.moduleRegistry = new ModuleRegistry();
    this.requestManager = new RequestManager();
    this.messageProcessor = new MessageProcessor();
    this.statisticsTracker = new StatisticsTracker();
    this.topicSubscriptionManager = new TopicSubscriptionManager(this.moduleRegistry);

    this.setupEventHandlers();
  }

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
   * Set up event handlers for module lifecycle events
   */
  private setupEventHandlers(): void {
    this.moduleRegistry.onModuleRegister((moduleId: string) => {
      this.statisticsTracker.setRegisteredModules(this.moduleRegistry.getCount());

      // Notify other modules about new registration
      this.broadcastMessage({
        id: uuidv4(),
        type: 'module_registered',
        source: 'MessageCenter',
        payload: { moduleId },
        timestamp: Date.now(),
      });
    });

    this.moduleRegistry.onModuleUnregister((moduleId: string) => {
      this.statisticsTracker.setRegisteredModules(this.moduleRegistry.getCount());

      // Clean up any pending requests for this module
      this.requestManager.cancelAll(new Error(`Module ${moduleId} was unregistered`));

      // Clean up topic subscriptions
      this.topicSubscriptionManager.cleanupOrphanedSubscriptions();

      // Notify other modules about unregistration
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
   * Register a module with the message center
   * @param moduleId - Module ID
   * @param moduleInstance - Module instance
   */
  public registerModule(moduleId: string, moduleInstance: any): void {
    this.moduleRegistry.register(moduleId, moduleInstance);
  }

  /**
   * Unregister a module from the message center
   * @param moduleId - Module ID
   */
  public unregisterModule(moduleId: string): void {
    this.moduleRegistry.unregister(moduleId);
  }

  /**
   * Send a one-way message
   * @param message - Message to send
   */
  public sendMessage(message: Message): void {
    if (!this.messageProcessor.validateMessage(message)) {
      console.error('Invalid message structure:', message);
      this.statisticsTracker.incrementMessagesFailed();
      return;
    }

    this.statisticsTracker.incrementTotalMessages();

    setImmediate(() => {
      this.processMessage(message).catch((error) => {
        console.error(`Error processing message ${message.id}:`, error);
        this.statisticsTracker.incrementMessagesFailed();
      });
    });
  }

  /**
   * Broadcast a message to all modules
   * @param message - Message to broadcast
   */
  public broadcastMessage(message: Message): void {
    if (!this.messageProcessor.validateMessage(message)) {
      console.error('Invalid broadcast message structure:', message);
      this.statisticsTracker.incrementMessagesFailed();
      return;
    }

    this.statisticsTracker.incrementTotalMessages();

    setImmediate(() => {
      this.messageProcessor
        .broadcastMessage(
          message,
          this.moduleRegistry.getAll(),
          async (msg: Message, moduleId: string, moduleInstance: any) => {
            try {
              await this.messageProcessor.deliverMessage(msg, moduleInstance);
              this.statisticsTracker.incrementMessagesDelivered();
            } catch (error) {
              console.error(`Error delivering broadcast message to ${moduleId}:`, error);
              this.statisticsTracker.incrementMessagesFailed();
            }
          }
        )
        .catch((error) => {
          console.error('Error broadcasting message:', error);
          this.statisticsTracker.incrementMessagesFailed();
        });
    });
  }

  /**
   * Send a request and wait for response
   * @param message - Request message
   * @param timeout - Timeout in milliseconds
   * @returns Promise that resolves to the response
   */
  public sendRequest(message: Message, timeout: number = 30000): Promise<MessageResponse> {
    if (!this.messageProcessor.validateMessage(message)) {
      console.error('Invalid request message structure:', message);
      return Promise.reject(new Error('Invalid message structure'));
    }

    if (!message.correlationId) {
      message.correlationId = uuidv4();
    }

    this.statisticsTracker.incrementTotalMessages();
    this.statisticsTracker.incrementTotalRequests();
    this.statisticsTracker.incrementActiveRequests();

    return this.requestManager.createRequest(message.correlationId, timeout).finally(() => {
      this.statisticsTracker.decrementActiveRequests();
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
    if (!this.messageProcessor.validateMessage(message)) {
      console.error('Invalid async request message structure:', message);
      callback({
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: 'Invalid message structure',
        timestamp: Date.now(),
      });
      return;
    }

    if (!message.correlationId) {
      message.correlationId = uuidv4();
    }

    this.statisticsTracker.incrementTotalMessages();
    this.statisticsTracker.incrementTotalRequests();
    this.statisticsTracker.incrementActiveRequests();

    this.requestManager.createRequestAsync(
      message.correlationId,
      (response: MessageResponse) => {
        this.statisticsTracker.decrementActiveRequests();
        callback(response);
      },
      timeout
    );
  }

  /**
   * Process an incoming message
   * @param message - Message to process
   */
  private async processMessage(message: Message): Promise<void> {
    try {
      const targetModule = message.target ? this.moduleRegistry.get(message.target) : undefined;

      await this.messageProcessor.processMessage(
        message,
        targetModule,
        async (broadcastMsg: Message) => {
          await this.broadcastMessage(broadcastMsg);
        }
      );

      this.statisticsTracker.incrementMessagesDelivered();

      // Handle response for requests
      if (message.correlationId && this.requestManager.hasPendingRequest(message.correlationId)) {
        const responseTime = this.requestManager.getResponseTime(message.correlationId);
        if (responseTime) {
          this.statisticsTracker.recordResponseTime(responseTime);
        }
      }
    } catch (error) {
      this.statisticsTracker.incrementMessagesFailed();

      // If this was a request, send error response
      if (message.correlationId && this.requestManager.hasPendingRequest(message.correlationId)) {
        this.requestManager.rejectRequest(message.correlationId, error);
      } else {
        console.error(`Error processing message ${message.id}:`, error);
      }
    }
  }

  /**
   * Get message center statistics
   * @returns Statistics object
   */
  public getStats(): MessageCenterStats {
    return this.statisticsTracker.getStats();
  }

  /**
   * Get detailed performance metrics
   * @returns Detailed performance metrics
   */
  public getPerformanceMetrics() {
    return this.statisticsTracker.getPerformanceMetrics();
  }

  /**
   * Reset message center statistics
   */
  public resetStats(): void {
    this.statisticsTracker.reset();
  }

  /**
   * Subscribe a module to a specific topic
   * @param moduleId - Module ID to subscribe
   * @param topic - Topic to subscribe to
   * @param options - Subscription options
   */
  public subscribeToTopic(
    moduleId: string,
    topic: string,
    options: { wildcard?: boolean } = {}
  ): void {
    this.topicSubscriptionManager.subscribeToTopic(moduleId, topic, options);
  }

  /**
   * Unsubscribe a module from a specific topic
   * @param moduleId - Module ID to unsubscribe
   * @param topic - Topic to unsubscribe from
   * @param options - Unsubscription options
   */
  public unsubscribeFromTopic(
    moduleId: string,
    topic: string,
    options: { wildcard?: boolean } = {}
  ): void {
    this.topicSubscriptionManager.unsubscribeFromTopic(moduleId, topic, options);
  }

  /**
   * Get all subscribers for a topic
   * @param topic - Topic to get subscribers for
   * @returns Array of module IDs subscribed to the topic
   */
  public getTopicSubscribers(topic: string): string[] {
    return this.topicSubscriptionManager.getTopicSubscribers(topic);
  }

  /**
   * Check if a module is subscribed to a topic
   * @param moduleId - Module ID to check
   * @param topic - Topic to check
   * @returns True if module is subscribed
   */
  public isSubscribed(moduleId: string, topic: string): boolean {
    return this.topicSubscriptionManager.isSubscribed(moduleId, topic);
  }

  /**
   * Get all topics a module is subscribed to
   * @param moduleId - Module ID to get topics for
   * @returns Array of topics the module is subscribed to
   */
  public getModuleSubscriptions(moduleId: string): string[] {
    return this.topicSubscriptionManager.getModuleSubscriptions(moduleId);
  }

  /**
   * Get all active topics
   * @returns Array of active topic names
   */
  public getAllTopics(): string[] {
    return this.topicSubscriptionManager.getAllTopics();
  }

  /**
   * Get subscription statistics
   * @returns Subscription statistics
   */
  public getSubscriptionStats() {
    return this.topicSubscriptionManager.getSubscriptionStats();
  }

  /**
   * Publish a message to a specific topic
   * @param topic - Topic to publish to
   * @param message - Message to publish (without target field)
   * @returns Array of module IDs that received the message
   */
  public publishToTopic(topic: string, message: Omit<Message, 'target'>): string[] {
    const fullMessage: Message = {
      ...message,
      topic
    };

    if (!this.messageProcessor.validateMessage(fullMessage)) {
      console.error('Invalid topic message structure:', fullMessage);
      this.statisticsTracker.incrementMessagesFailed();
      return [];
    }

    this.statisticsTracker.incrementTotalMessages();

    const subscribers = this.topicSubscriptionManager.getTopicSubscribers(topic);

    setImmediate(() => {
      this.deliverToTopicSubscribers(fullMessage, subscribers).catch((error) => {
        console.error(`Error delivering topic message to ${topic}:`, error);
        this.statisticsTracker.incrementMessagesFailed();
      });
    });

    return subscribers;
  }

  /**
   * Deliver message to topic subscribers
   * @param message - Message to deliver
   * @param subscribers - Array of subscriber module IDs
   */
  private async deliverToTopicSubscribers(message: Message, subscribers: string[]): Promise<void> {
    const deliveryPromises: Promise<void>[] = [];

    for (const moduleId of subscribers) {
      if (moduleId !== message.source) {
        // Don't send back to sender
        const moduleInstance = this.moduleRegistry.get(moduleId);
        if (moduleInstance) {
          const deliveryPromise = this.messageProcessor.deliverMessage(message, moduleInstance)
            .then(() => {
              this.statisticsTracker.incrementMessagesDelivered();
            })
            .catch((error) => {
              console.error(`Error delivering topic message to ${moduleId}:`, error);
              this.statisticsTracker.incrementMessagesFailed();
            });
          deliveryPromises.push(deliveryPromise);
        }
      }
    }

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Get the number of registered modules
   * @returns Number of registered modules
   */
  public getModuleCount(): number {
    return this.moduleRegistry.getCount();
  }

  /**
   * Check if a module is registered
   * @param moduleId - Module ID
   * @returns True if module is registered
   */
  public isModuleRegistered(moduleId: string): boolean {
    return this.moduleRegistry.has(moduleId);
  }

  /**
   * Get all registered module IDs
   * @returns Array of module IDs
   */
  public getModuleIds(): string[] {
    return this.moduleRegistry.getModuleIds();
  }

  /**
   * Get the number of pending requests
   * @returns Number of pending requests
   */
  public getPendingRequestCount(): number {
    return this.requestManager.getPendingCount();
  }

  /**
   * Get system uptime in human-readable format
   * @returns Uptime string
   */
  public getUptime(): string {
    return this.statisticsTracker.getUptimeString();
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.requestManager.cancelAll();
    this.moduleRegistry.clear();
    this.topicSubscriptionManager.clear();
    this.statisticsTracker.reset();
  }
}