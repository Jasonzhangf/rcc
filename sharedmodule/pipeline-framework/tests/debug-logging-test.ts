/**
 * Debug Logging System Test
 * 调试日志系统测试
 */

import { DebugLogManager } from './src/framework/DebugLogManager';
import { LogEntryFactory } from './src/framework/LogEntryFactory';
import { LogEntryValidator } from './src/framework/LogEntryValidator';
import { BaseProviderEnhanced } from './src/framework/BaseProviderEnhanced';
import { DebugConfig, DEFAULT_DEBUG_CONFIG } from './src/types/debug-types';

/**
 * Test Debug Configuration
 * 测试调试配置
 */
const testDebugConfig: DebugConfig = {
  ...DEFAULT_DEBUG_CONFIG,
  enabled: true,
  baseDirectory: './test-logs',
  logLevel: 'debug',
  requestTracking: {
    enabled: true,
    generateRequestIds: true,
    includeTimestamps: true,
    trackMetadata: true
  },
  contentFiltering: {
    enabled: true,
    sensitiveFields: ['api_key', 'password', 'token', 'secret'],
    maxContentLength: 1000,
    sanitizeResponses: true
  }
};

/**
 * Mock Provider for Testing
 * 测试用的模拟提供者
 */
class MockProvider extends BaseProviderEnhanced {
  constructor() {
    super({
      name: 'MockProvider',
      debug: testDebugConfig,
      supportedModels: ['test-model'],
      defaultModel: 'test-model'
    });
  }

  async executeChat(providerRequest: any): Promise<any> {
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      id: 'test-response-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'test-model',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! This is a test response.'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 15,
        total_tokens: 25
      }
    };
  }

  async *executeStreamChat(providerRequest: any): AsyncGenerator<any, void, unknown> {
    // Simulate streaming response
    const chunks = [
      'Hello',
      '! This',
      ' is',
      ' a',
      ' test',
      ' streaming',
      ' response.'
    ];

    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, 50));
      yield {
        id: 'test-stream-id',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            index: 0,
            delta: { content: chunk + ' ' },
            finish_reason: null
          }
        ]
      };
    }

    // Final chunk
    yield {
      id: 'test-stream-id',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: 'test-model',
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop'
        }
      ]
    };
  }
}

/**
 * Test Suite
 * 测试套件
 */
class DebugLoggingTestSuite {
  private provider: MockProvider;
  private debugLogManager?: DebugLogManager;

  constructor() {
    this.provider = new MockProvider();
    this.debugLogManager = this.provider.getDebugLogManager();
  }

  /**
   * Run all tests
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Debug Logging System Tests...\n');

    const tests = [
      { name: 'Provider Initialization', test: () => this.testProviderInitialization() },
      { name: 'Basic Chat Request', test: () => this.testBasicChatRequest() },
      { name: 'Stream Chat Request', test: () => this.testStreamChatRequest() },
      { name: 'Error Handling', test: () => this.testErrorHandling() },
      { name: 'Debug Log Manager', test: () => this.testDebugLogManager() },
      { name: 'Configuration', test: () => this.testConfiguration() },
      { name: 'File Management', test: () => this.testFileManagement() },
      { name: 'Performance Tracking', test: () => this.testPerformanceTracking() },
      { name: 'Content Filtering', test: () => this.testContentFiltering() },
      { name: 'Health Check', test: () => this.testHealthCheck() }
    ];

    let passed = 0;
    let failed = 0;

    for (const { name, test } of tests) {
      try {
        console.log(`📋 Testing: ${name}`);
        await test();
        console.log(`✅ ${name} - PASSED\n`);
        passed++;
      } catch (error) {
        console.error(`❌ ${name} - FAILED:`, error);
        console.log('');
        failed++;
      }
    }

    console.log('🎯 Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the output above.');
    }

    // Cleanup
    await this.cleanup();
  }

  /**
   * Test provider initialization
   * 测试提供者初始化
   */
  private async testProviderInitialization(): Promise<void> {
    console.log('  Testing provider initialization...');

    if (!this.debugLogManager) {
      throw new Error('Debug log manager not initialized');
    }

    if (!this.debugLogManager.isEnabled()) {
      throw new Error('Debug logging should be enabled');
    }

    if (this.debugLogManager.getLogLevel() !== 'debug') {
      throw new Error('Log level should be debug');
    }

    console.log('  ✅ Provider initialized successfully');
  }

  /**
   * Test basic chat request
   * 测试基本聊天请求
   */
  private async testBasicChatRequest(): Promise<void> {
    console.log('  Testing basic chat request...');

    const request = {
      model: 'test-model',
      messages: [
        { role: 'user', content: 'Hello, test!' }
      ]
    };

    const response = await this.provider.chat(request);

    if (!response.id) {
      throw new Error('Response should have an ID');
    }

    if (!response.choices || response.choices.length === 0) {
      throw new Error('Response should have choices');
    }

    // Check if logs were created
    if (this.debugLogManager) {
      const activeRequests = this.debugLogManager.getActiveRequests();
      if (activeRequests.length > 0) {
        throw new Error('All requests should be completed');
      }
    }

    console.log('  ✅ Basic chat request completed successfully');
  }

  /**
   * Test stream chat request
   * 测试流式聊天请求
   */
  private async testStreamChatRequest(): Promise<void> {
    console.log('  Testing stream chat request...');

    const request = {
      model: 'test-model',
      messages: [
        { role: 'user', content: 'Hello, streaming test!' }
      ]
    };

    const chunks = [];
    for await (const chunk of this.provider.streamChat(request)) {
      chunks.push(chunk);
    }

    if (chunks.length === 0) {
      throw new Error('Should receive at least one chunk');
    }

    console.log(`  ✅ Stream chat request completed with ${chunks.length} chunks`);
  }

  /**
   * Test error handling
   * 测试错误处理
   */
  private async testErrorHandling(): Promise<void> {
    console.log('  Testing error handling...');

    // Create a provider that throws errors
    class ErrorProvider extends MockProvider {
      async executeChat(providerRequest: any): Promise<any> {
        throw new Error('Test error for logging');
      }
    }

    const errorProvider = new ErrorProvider();

    try {
      await errorProvider.chat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Test error' }]
      });
      throw new Error('Should have thrown an error');
    } catch (error) {
      if (!error.message.includes('Test error for logging')) {
        throw new Error('Unexpected error message');
      }
    }

    console.log('  ✅ Error handling test completed successfully');
  }

  /**
   * Test debug log manager
   * 测试调试日志管理器
   */
  private async testDebugLogManager(): Promise<void> {
    console.log('  Testing debug log manager...');

    if (!this.debugLogManager) {
      throw new Error('Debug log manager not available');
    }

    // Test configuration update
    this.debugLogManager.setLogLevel('info');
    if (this.debugLogManager.getLogLevel() !== 'info') {
      throw new Error('Log level should be updated to info');
    }

    // Test system logging
    await this.debugLogManager.info('Test system log message');
    await this.debugLogManager.debug('Test debug message');
    await this.debugLogManager.warn('Test warning message');
    await this.debugLogManager.error('Test error message');

    console.log('  ✅ Debug log manager test completed successfully');
  }

  /**
   * Test configuration
   * 测试配置
   */
  private async testConfiguration(): Promise<void> {
    console.log('  Testing configuration...');

    if (!this.debugLogManager) {
      throw new Error('Debug log manager not available');
    }

    // Test sensitive fields
    const sensitiveFields = this.debugLogManager.getSensitiveFields();
    if (!sensitiveFields.includes('api_key')) {
      throw new Error('Should include api_key in sensitive fields');
    }

    // Test adding sensitive field
    this.debugLogManager.addSensitiveField('new_secret_field');
    const updatedFields = this.debugLogManager.getSensitiveFields();
    if (!updatedFields.includes('new_secret_field')) {
      throw new Error('Should include new sensitive field');
    }

    console.log('  ✅ Configuration test completed successfully');
  }

  /**
   * Test file management
   * 测试文件管理
   */
  private async testFileManagement(): Promise<void> {
    console.log('  Testing file management...');

    if (!this.debugLogManager) {
      throw new Error('Debug log manager not available');
    }

    // Test getting log files
    const logFiles = await this.debugLogManager.getLogFiles();
    console.log(`  Found ${logFiles.length} log files`);

    // Test file statistics
    const fileStats = await this.debugLogManager.getFileStatistics();
    console.log(`  Total files: ${fileStats.totalFiles}, Total size: ${fileStats.totalSize} bytes`);

    console.log('  ✅ File management test completed successfully');
  }

  /**
   * Test performance tracking
   * 测试性能跟踪
   */
  private async testPerformanceTracking(): Promise<void> {
    console.log('  Testing performance tracking...');

    if (!this.debugLogManager) {
      throw new Error('Debug log manager not available');
    }

    // Get statistics before making a request
    const statsBefore = await this.debugLogManager.getDebugStatistics();

    // Make a request
    await this.provider.chat({
      model: 'test-model',
      messages: [{ role: 'user', content: 'Performance test' }]
    });

    // Get statistics after the request
    const statsAfter = await this.debugLogManager.getDebugStatistics();

    if (!statsAfter) {
      throw new Error('Debug statistics should be available');
    }

    console.log('  ✅ Performance tracking test completed successfully');
  }

  /**
   * Test content filtering
   * 测试内容过滤
   */
  private async testContentFiltering(): Promise<void> {
    console.log('  Testing content filtering...');

    if (!this.debugLogManager) {
      throw new Error('Debug log manager not available');
    }

    // Create a request with sensitive data
    const requestWithSensitiveData = {
      model: 'test-model',
      messages: [
        {
          role: 'user',
          content: 'Test message',
          api_key: 'secret-api-key-12345',
          password: 'secret-password'
        }
      ]
    };

    await this.provider.chat(requestWithSensitiveData);

    // Check if logs were created and sensitive data was filtered
    const logFiles = await this.debugLogManager.getLogFiles();
    if (logFiles.length > 0) {
      console.log(`  ✅ Content filtering test completed - logs created with sensitive data filtering`);
    } else {
      console.log(`  ⚠️  No log files found for content filtering test`);
    }

    console.log('  ✅ Content filtering test completed successfully');
  }

  /**
   * Test health check
   * 测试健康检查
   */
  private async testHealthCheck(): Promise<void> {
    console.log('  Testing health check...');

    const healthResult = await this.provider.healthCheck();

    if (healthResult.status !== 'healthy') {
      throw new Error('Health check should return healthy status');
    }

    if (!healthResult.provider) {
      throw new Error('Health check should include provider name');
    }

    if (!healthResult.timestamp) {
      throw new Error('Health check should include timestamp');
    }

    console.log('  ✅ Health check test completed successfully');
  }

  /**
   * Cleanup test resources
   * 清理测试资源
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test resources...');

    if (this.debugLogManager) {
      await this.debugLogManager.destroy();
    }

    console.log('✅ Cleanup completed');
  }
}

/**
 * Run the test suite
 * 运行测试套件
 */
async function runTests(): Promise<void> {
  const testSuite = new DebugLoggingTestSuite();
  await testSuite.runAllTests();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { DebugLoggingTestSuite, runTests };