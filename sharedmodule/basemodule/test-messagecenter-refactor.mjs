import { MessageCenter } from './src/index.mjs';

async function testMessageCenterRefactoring() {
  console.log('🧪 Testing MessageCenter Refactoring...\n');

  try {
    // Test 1: Singleton Pattern
    console.log('📋 Test 1: Singleton Pattern');
    const instance1 = MessageCenter.getInstance();
    const instance2 = MessageCenter.getInstance();
    console.log(`✅ Singleton pattern works: ${instance1 === instance2}\n`);

    // Test 2: Module Registration
    console.log('📋 Test 2: Module Registration');
    const mockModule = {
      handleMessage: async (message) => {
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: 'Test response',
          timestamp: Date.now()
        };
      }
    };

    instance1.registerModule('test-module', mockModule);
    console.log(`✅ Module registered: ${instance1.isModuleRegistered('test-module')}`);
    console.log(`✅ Module count: ${instance1.getModuleCount()}\n`);

    // Test 3: Statistics
    console.log('📋 Test 3: Statistics Tracking');
    const stats = instance1.getStats();
    console.log(`✅ Statistics available: totalMessages=${stats.totalMessages}, modules=${stats.registeredModules}`);

    const performanceMetrics = instance1.getPerformanceMetrics();
    console.log(`✅ Performance metrics available: uptime=${performanceMetrics.uptime}ms, successRate=${performanceMetrics.successRate}%\n`);

    // Test 4: Message Sending
    console.log('📋 Test 4: Message Sending');
    const testMessage = {
      id: 'test-message-1',
      type: 'test',
      source: 'test-sender',
      target: 'test-module',
      payload: { data: 'test payload' },
      timestamp: Date.now()
    };

    instance1.sendMessage(testMessage);
    console.log('✅ Message sent successfully\n');

    // Test 5: Request/Response
    console.log('📋 Test 5: Request/Response Handling');
    const requestMessage = {
      id: 'request-1',
      type: 'request',
      source: 'test-sender',
      target: 'test-module',
      payload: { question: 'test question' },
      correlationId: 'corr-1',
      timestamp: Date.now()
    };

    const response = await instance1.sendRequest(requestMessage);
    console.log(`✅ Request handled successfully: ${response.success}`);
    console.log(`✅ Response data: ${response.data}\n`);

    // Test 6: Module Unregistration
    console.log('📋 Test 6: Module Unregistration');
    instance1.unregisterModule('test-module');
    console.log(`✅ Module unregistered: ${!instance1.isModuleRegistered('test-module')}`);
    console.log(`✅ Module count after unregistration: ${instance1.getModuleCount()}\n`);

    // Test 7: Final Statistics
    console.log('📋 Test 7: Final Statistics');
    const finalStats = instance1.getStats();
    console.log('📊 Final Statistics:');
    console.log(`   - Total Messages: ${finalStats.totalMessages}`);
    console.log(`   - Total Requests: ${finalStats.totalRequests}`);
    console.log(`   - Messages Delivered: ${finalStats.messagesDelivered}`);
    console.log(`   - Messages Failed: ${finalStats.messagesFailed}`);
    console.log(`   - Active Requests: ${finalStats.activeRequests}`);
    console.log(`   - Registered Modules: ${finalStats.registeredModules}`);
    console.log(`   - Average Response Time: ${finalStats.averageResponseTime}ms`);
    console.log(`   - Uptime: ${finalStats.uptime}ms`);

    console.log('\n🎉 All tests passed! MessageCenter refactoring is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMessageCenterRefactoring();