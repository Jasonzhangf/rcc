import { MessageCenter } from '../src/MessageCenter';
import { Message } from '../src/interfaces/Message';

// Mock module class for testing
class TestModule {
  private id: string;
  private receivedMessages: Message[] = [];
  private isRegistered: boolean = false;

  constructor(id: string) {
    this.id = id;
  }

  getId(): string {
    return this.id;
  }

  async handleMessage(message: Message): Promise<void> {
    this.receivedMessages.push(message);
  }

  getReceivedMessages(): Message[] {
    return this.receivedMessages;
  }

  clearMessages(): void {
    this.receivedMessages = [];
  }

  setRegistered(registered: boolean): void {
    this.isRegistered = registered;
  }

  isModuleRegistered(): boolean {
    return this.isRegistered;
  }
}

describe('TopicSubscription', () => {
  let messageCenter: MessageCenter;
  let module1: TestModule;
  let module2: TestModule;
  let module3: TestModule;

  beforeEach(() => {
    messageCenter = new MessageCenter();
    module1 = new TestModule('module1');
    module2 = new TestModule('module2');
    module3 = new TestModule('module3');

    // Register modules
    messageCenter.registerModule('module1', module1);
    messageCenter.registerModule('module2', module2);
    messageCenter.registerModule('module3', module3);
  });

  afterEach(() => {
    messageCenter.destroy();
  });

  describe('Topic Subscription', () => {
    test('should allow modules to subscribe to topics', () => {
      messageCenter.subscribeToTopic('module1', 'user-events');

      expect(messageCenter.isSubscribed('module1', 'user-events')).toBe(true);
      expect(messageCenter.isSubscribed('module2', 'user-events')).toBe(false);
    });

    test('should allow modules to unsubscribe from topics', () => {
      messageCenter.subscribeToTopic('module1', 'user-events');
      messageCenter.unsubscribeFromTopic('module1', 'user-events');

      expect(messageCenter.isSubscribed('module1', 'user-events')).toBe(false);
    });

    test('should get topic subscribers correctly', () => {
      messageCenter.subscribeToTopic('module1', 'user-events');
      messageCenter.subscribeToTopic('module2', 'user-events');

      const subscribers = messageCenter.getTopicSubscribers('user-events');
      expect(subscribers).toContain('module1');
      expect(subscribers).toContain('module2');
      expect(subscribers).not.toContain('module3');
    });

    test('should get module subscriptions correctly', () => {
      messageCenter.subscribeToTopic('module1', 'user-events');
      messageCenter.subscribeToTopic('module1', 'system-events');

      const subscriptions = messageCenter.getModuleSubscriptions('module1');
      expect(subscriptions).toContain('user-events');
      expect(subscriptions).toContain('system-events');
    });

    test('should support wildcard subscriptions', () => {
      messageCenter.subscribeToTopic('module1', '*', { wildcard: true });

      expect(messageCenter.isSubscribed('module1', 'any-topic')).toBe(true);
      expect(messageCenter.isSubscribed('module1', 'user-events')).toBe(true);
    });

    test('should get all active topics', () => {
      messageCenter.subscribeToTopic('module1', 'user-events');
      messageCenter.subscribeToTopic('module2', 'system-events');

      const topics = messageCenter.getAllTopics();
      expect(topics).toContain('user-events');
      expect(topics).toContain('system-events');
    });

    test('should provide subscription statistics', () => {
      messageCenter.subscribeToTopic('module1', 'user-events');
      messageCenter.subscribeToTopic('module2', 'user-events');
      messageCenter.subscribeToTopic('module1', 'system-events');
      messageCenter.subscribeToTopic('module3', '*', { wildcard: true });

      const stats = messageCenter.getSubscriptionStats();
      expect(stats.totalTopics).toBe(2);
      expect(stats.totalSubscriptions).toBe(3);
      expect(stats.wildcardSubscriptions).toBe(1);
      expect(stats.topics).toContain('user-events');
      expect(stats.topics).toContain('system-events');
    });
  });

  describe('Topic-based Message Publishing', () => {
    test('should deliver topic messages to subscribers', async () => {
      messageCenter.subscribeToTopic('module1', 'user-events');
      messageCenter.subscribeToTopic('module2', 'user-events');

      const message = {
        id: 'test-message-1',
        type: 'user-created',
        source: 'test-source',
        payload: { userId: '123', action: 'create' },
        timestamp: Date.now()
      };

      const subscribers = messageCenter.publishToTopic('user-events', message);

      expect(subscribers).toContain('module1');
      expect(subscribers).toContain('module2');
      expect(subscribers).not.toContain('module3');

      // Wait for async delivery
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(module1.getReceivedMessages().length).toBe(1);
      expect(module2.getReceivedMessages().length).toBe(1);
      expect(module3.getReceivedMessages().length).toBe(0);
    });

    test('should not deliver topic messages to sender', async () => {
      messageCenter.subscribeToTopic('module1', 'user-events');
      messageCenter.subscribeToTopic('module2', 'user-events');

      const message = {
        id: 'test-message-1',
        type: 'user-created',
        source: 'module1',
        payload: { userId: '123', action: 'create' },
        timestamp: Date.now()
      };

      messageCenter.publishToTopic('user-events', message);

      // Wait for async delivery
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(module1.getReceivedMessages().length).toBe(0); // Should not receive own message
      expect(module2.getReceivedMessages().length).toBe(1);
    });

    test('should handle wildcard subscriptions', async () => {
      messageCenter.subscribeToTopic('module1', '*', { wildcard: true });

      const message = {
        id: 'test-message-1',
        type: 'system-event',
        source: 'test-source',
        payload: { event: 'system-started' },
        timestamp: Date.now()
      };

      messageCenter.publishToTopic('system-events', message);

      // Wait for async delivery
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(module1.getReceivedMessages().length).toBe(1);
      expect(module1.getReceivedMessages()[0].topic).toBe('system-events');
    });

    test('should return empty array for non-existent topic', () => {
      const subscribers = messageCenter.getTopicSubscribers('non-existent-topic');
      expect(subscribers).toEqual([]);
    });

    test('should validate topic message structure', () => {
      const invalidMessage = {
        id: 'test-id',
        type: 'test',
        source: 'test',
        payload: {},
        timestamp: Date.now()
      };

      const subscribers = messageCenter.publishToTopic('test-topic', invalidMessage);
      expect(subscribers.length).toBeGreaterThan(0);
    });
  });

  describe('Module Lifecycle', () => {
    test('should clean up subscriptions when module is unregistered', () => {
      messageCenter.subscribeToTopic('module1', 'user-events');
      messageCenter.subscribeToTopic('module1', 'system-events');

      messageCenter.unregisterModule('module1');

      expect(messageCenter.isSubscribed('module1', 'user-events')).toBe(false);
      expect(messageCenter.isSubscribed('module1', 'system-events')).toBe(false);
    });

    test('should throw error when subscribing unregistered module', () => {
      expect(() => {
        messageCenter.subscribeToTopic('non-existent-module', 'test-topic');
      }).toThrow('Module non-existent-module is not registered');
    });
  });

  describe('Error Handling', () => {
    test('should handle message delivery errors gracefully', async () => {
      class FailingModule extends TestModule {
        async handleMessage(message: Message): Promise<void> {
          throw new Error('Delivery failed');
        }
      }

      const failingModule = new FailingModule('failing-module');
      messageCenter.registerModule('failing-module', failingModule);
      messageCenter.subscribeToTopic('failing-module', 'test-topic');

      const message = {
        id: 'test-message-1',
        type: 'test',
        source: 'test-source',
        payload: {},
        timestamp: Date.now()
      };

      // Should not throw, just handle gracefully
      expect(() => {
        messageCenter.publishToTopic('test-topic', message);
      }).not.toThrow();

      // Wait for async delivery
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  });
});