import { MessageCenter } from './dist/index.esm.js';

// Mock module class for testing
class TestModule {
  constructor(id) {
    this.id = id;
    this.receivedMessages = [];
  }

  async handleMessage(message) {
    this.receivedMessages.push(message);
  }

  getReceivedMessages() {
    return this.receivedMessages;
  }

  clearMessages() {
    this.receivedMessages = [];
  }
}

async function verifyTopicSubscription() {
  console.log('Verifying Topic Subscription functionality in basemodule...\n');

  try {
    // Create MessageCenter instance
    const messageCenter = new MessageCenter();

    // Create test modules
    const module1 = new TestModule('module1');
    const module2 = new TestModule('module2');

    // Register modules
    messageCenter.registerModule('module1', module1);
    messageCenter.registerModule('module2', module2);

    console.log('✓ Modules registered successfully');

    // Test basic topic subscription
    messageCenter.subscribeToTopic('module1', 'test-topic');
    const isSubscribed = messageCenter.isSubscribed('module1', 'test-topic');

    console.log(`✓ Topic subscription works: ${isSubscribed}`);

    // Test topic publishing
    const testMessage = {
      id: 'test-msg-1',
      type: 'test-event',
      source: 'test-source',
      payload: { data: 'test' },
      timestamp: Date.now()
    };

    const deliveredTo = messageCenter.publishToTopic('test-topic', testMessage);
    console.log(`✓ Topic publishing works: delivered to ${deliveredTo.join(', ')}`);

    // Wait for async delivery
    await new Promise(resolve => setTimeout(resolve, 50));

    const messages = module1.getReceivedMessages();
    const topicMessages = messages.filter(msg => msg.topic === 'test-topic');

    console.log(`✓ Message delivery works: ${topicMessages.length} topic messages received`);

    // Test subscription stats
    const stats = messageCenter.getSubscriptionStats();
    console.log(`✓ Subscription stats: ${stats.totalTopics} topics, ${stats.totalSubscriptions} subscriptions`);

    // Cleanup
    messageCenter.destroy();

    console.log('\n🎉 All topic subscription functionality verified successfully!');
    return true;

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    return false;
  }
}

// Run verification
verifyTopicSubscription()
  .then(success => {
    if (success) {
      console.log('\n✅ basemodule topic subscription functionality is working correctly');
      process.exit(0);
    } else {
      console.log('\n❌ basemodule topic subscription functionality has issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Verification failed with error:', error);
    process.exit(1);
  });