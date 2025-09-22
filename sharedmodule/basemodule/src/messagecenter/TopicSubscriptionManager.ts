import { Message } from '../interfaces/Message';
import { ModuleRegistry } from './ModuleRegistry';

/**
 * Manages topic-based subscriptions for modules
 */
export class TopicSubscriptionManager {
  private topicSubscriptions: Map<string, Set<string>> = new Map();
  private moduleRegistry: ModuleRegistry;
  private wildcardSubscriptions: Set<string> = new Set(); // Modules subscribed to all topics

  constructor(moduleRegistry: ModuleRegistry) {
    this.moduleRegistry = moduleRegistry;
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
    // Validate module exists
    if (!this.moduleRegistry.has(moduleId)) {
      throw new Error(`Module ${moduleId} is not registered`);
    }

    if (options.wildcard) {
      // Wildcard subscription - receive all topic messages
      this.wildcardSubscriptions.add(moduleId);
      return;
    }

    // Normal topic subscription
    if (!this.topicSubscriptions.has(topic)) {
      this.topicSubscriptions.set(topic, new Set());
    }
    this.topicSubscriptions.get(topic)!.add(moduleId);
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
    if (options.wildcard) {
      this.wildcardSubscriptions.delete(moduleId);
      return;
    }

    const subscribers = this.topicSubscriptions.get(topic);
    if (subscribers) {
      subscribers.delete(moduleId);

      // Clean up empty topic subscriptions
      if (subscribers.size === 0) {
        this.topicSubscriptions.delete(topic);
      }
    }
  }

  /**
   * Get all subscribers for a topic
   * @param topic - Topic to get subscribers for
   * @returns Array of module IDs subscribed to the topic
   */
  public getTopicSubscribers(topic: string): string[] {
    const subscribers: string[] = [];

    // Get specific topic subscribers
    const topicSubscribers = this.topicSubscriptions.get(topic);
    if (topicSubscribers) {
      subscribers.push(...topicSubscribers);
    }

    // Add wildcard subscribers
    subscribers.push(...this.wildcardSubscriptions);

    // Filter out modules that are no longer registered
    return subscribers.filter(moduleId => this.moduleRegistry.has(moduleId));
  }

  /**
   * Check if a module is subscribed to a topic
   * @param moduleId - Module ID to check
   * @param topic - Topic to check
   * @returns True if module is subscribed
   */
  public isSubscribed(moduleId: string, topic: string): boolean {
    // Check wildcard subscription
    if (this.wildcardSubscriptions.has(moduleId)) {
      return true;
    }

    // Check specific topic subscription
    const subscribers = this.topicSubscriptions.get(topic);
    return subscribers ? subscribers.has(moduleId) : false;
  }

  /**
   * Get all topics a module is subscribed to
   * @param moduleId - Module ID to get topics for
   * @returns Array of topics the module is subscribed to
   */
  public getModuleSubscriptions(moduleId: string): string[] {
    const topics: string[] = [];

    // Check if module has wildcard subscription
    if (this.wildcardSubscriptions.has(moduleId)) {
      topics.push('*'); // Special marker for wildcard
    }

    // Get specific topic subscriptions
    for (const [topic, subscribers] of this.topicSubscriptions.entries()) {
      if (subscribers.has(moduleId)) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Get all active topics
   * @returns Array of active topic names
   */
  public getAllTopics(): string[] {
    return Array.from(this.topicSubscriptions.keys());
  }

  /**
   * Get subscription statistics
   * @returns Subscription statistics
   */
  public getSubscriptionStats() {
    return {
      totalTopics: this.topicSubscriptions.size,
      totalSubscriptions: Array.from(this.topicSubscriptions.values())
        .reduce((sum, subscribers) => sum + subscribers.size, 0),
      wildcardSubscriptions: this.wildcardSubscriptions.size,
      topics: this.getAllTopics()
    };
  }

  /**
   * Clean up subscriptions for unregistered modules
   */
  public cleanupOrphanedSubscriptions(): void {
    const registeredModules = this.moduleRegistry.getModuleIds();

    // Clean up topic subscriptions
    for (const [topic, subscribers] of this.topicSubscriptions.entries()) {
      for (const moduleId of subscribers) {
        if (!registeredModules.includes(moduleId)) {
          subscribers.delete(moduleId);
        }
      }

      // Remove empty topics
      if (subscribers.size === 0) {
        this.topicSubscriptions.delete(topic);
      }
    }

    // Clean up wildcard subscriptions
    for (const moduleId of this.wildcardSubscriptions) {
      if (!registeredModules.includes(moduleId)) {
        this.wildcardSubscriptions.delete(moduleId);
      }
    }
  }

  /**
   * Clear all subscriptions
   */
  public clear(): void {
    this.topicSubscriptions.clear();
    this.wildcardSubscriptions.clear();
  }
}