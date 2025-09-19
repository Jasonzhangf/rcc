/**
 * Pipeline Base Module Debug Test
 * 流水线基础模块调试测试
 *
 * This test demonstrates the pipeline's ability to track execution through multiple modules
 * and generate comprehensive debug information using the PipelineBaseModule.
 */

import pkg from 'rcc-pipeline';
const { PipelineBaseModule } = pkg;
import * as fs from 'fs';
import * as path from 'path';

// Test configuration with debug capabilities
const TEST_CONFIG = {
  id: 'test-base-module',
  name: 'Test Base Module',
  version: '1.0.0',
  description: 'Test module for pipeline base debugging',
  type: 'provider',
  endpoint: 'http://test-provider.local',
  supportedModels: ['test-model-1', 'test-model-2'],
  defaultModel: 'test-model-1',
  enableTwoPhaseDebug: true,
  enableIOTracking: true,
  debugBaseDirectory: '/Users/fanzhang/.rcc/debug-logs',
  maxConcurrentRequests: 5,
  requestTimeout: 30000
};

/**
 * Test provider module that extends PipelineBaseModule
 */
class TestProviderModule extends PipelineBaseModule {
  constructor(config: any) {
    super(config);
  }

  async processRequest(request: any): Promise<any> {
    return await this.trackPipelineOperation(
      `process-request-${Date.now()}`,
      async () => {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

        // Simulate different processing stages
        this.recordPipelineStage('validation', { request }, 'completed');
        this.recordPipelineStage('transformation', { transforming: true }, 'started');

        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 50));

        this.recordPipelineStage('transformation', { transforming: false }, 'completed');
        this.recordPipelineStage('response-generation', { generating: true }, 'started');

        // Generate response
        const response = {
          id: `response-${Date.now()}`,
          object: 'chat.completion',
          created: Date.now(),
          model: request.model || 'test-model-1',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: `Processed request: ${request.messages?.[0]?.content || 'no content'}`
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        };

        this.recordPipelineStage('response-generation', { generating: false }, 'completed');

        return response;
      },
      request,
      'chat'
    );
  }

  async processStreamRequest(request: any): Promise<AsyncGenerator<any, void, unknown>> {
    const self = this;

    // Track the overall streaming operation
    await this.trackPipelineOperation(
      `stream-setup-${Date.now()}`,
      async () => {
        // Record streaming start
        self.recordPipelineStage('stream-setup', { streaming: true }, 'completed');
      },
      request,
      'streamChat'
    );

    // Return the actual streaming generator
    return (async function* () {
      // Record streaming start
      self.recordPipelineStage('stream-start', { streaming: true }, 'started');

      // Simulate streaming response
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));

        const chunk = {
          id: `stream-chunk-${i}`,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: request.model || 'test-model-1',
          choices: [{
            index: 0,
            delta: {
              role: 'assistant',
              content: `Streaming chunk ${i}: ${request.messages?.[0]?.content || 'no content'}`
            },
            finish_reason: null
          }]
        };

        yield chunk;
      }

      // Record streaming completion
      self.recordPipelineStage('stream-complete', { streaming: false }, 'completed');
    })();
  }
}

/**
 * Main test runner
 */
async function runPipelineBaseModuleTest(): Promise<void> {
  console.log('🚀 Starting Pipeline Base Module Debug Test');
  console.log('============================================');

  // Ensure debug directory exists
  const debugBaseDirectory = '/Users/fanzhang/.rcc/debug-logs';
  try {
    fs.mkdirSync(debugBaseDirectory, { recursive: true });
    console.log(`📁 Debug directory ensured: ${debugBaseDirectory}`);
  } catch (error) {
    console.warn(`⚠️  Warning: Could not create debug directory: ${error.message}`);
  }

  // Create test provider module
  const module = new TestProviderModule(TEST_CONFIG);

  try {
    console.log('✅ Module created successfully');

    // Test 1: Normal request processing with debug tracking
    console.log('\n📝 Test 1: Normal Request Processing');
    console.log('-------------------------------------');

    const testRequest = {
      model: 'test-model-1',
      messages: [
        {
          role: 'user',
          content: 'Hello from test request 1'
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    };

    const result = await module.processRequest(testRequest);

    console.log(`✅ Request processing result: SUCCESS`);
    console.log(`📄 Response: ${JSON.stringify(result).substring(0, 100)}...`);

    // Test 2: Streaming request processing
    console.log('\n📝 Test 2: Streaming Request Processing');
    console.log('---------------------------------------');

    const streamRequest = {
      model: 'test-model-2',
      messages: [
        {
          role: 'user',
          content: 'Hello from streaming request'
        }
      ],
      stream: true
    };

    const stream = await module.processStreamRequest(streamRequest);
    let chunkCount = 0;

    for await (const chunk of stream) {
      chunkCount++;
      console.log(`📥 Stream chunk ${chunkCount}: ${JSON.stringify(chunk).substring(0, 80)}...`);
    }

    console.log(`✅ Streaming completed with ${chunkCount} chunks`);

    // Test 3: Error handling with debug tracking
    console.log('\n📝 Test 3: Error Handling');
    console.log('-------------------------');

    try {
      const errorResult = await module.trackPipelineOperation(
        'error-test-operation',
        async () => {
          module.recordPipelineStage('error-test', { testing: true }, 'started');
          throw new Error('Simulated processing error for testing debug tracking');
        },
        { test: 'error-handling' },
        'chat'
      );
    } catch (error) {
      console.log(`✅ Error handling test: EXPECTED FAILURE`);
      console.log(`❌ Error message: ${error.message}`);

      // Record the error in pipeline tracking
      module.handlePipelineError(error, {
        operation: 'error-test',
        stage: 'error-test'
      });
    }

    // Test 4: Multiple operations to generate debug records
    console.log('\n📝 Test 4: Multiple Operations');
    console.log('------------------------------');

    const operations = 5;
    const promises: Promise<any>[] = [];

    for (let i = 0; i < operations; i++) {
      const promise = module.processRequest({
        model: 'test-model-1',
        messages: [
          {
            role: 'user',
            content: `Test message ${i + 1}`
          }
        ]
      });
      promises.push(promise);
    }

    const results = await Promise.all(promises);
    console.log(`✅ Completed ${results.length} operations`);

    // Display debug information
    console.log('\n📊 Debug Information');
    console.log('--------------------');

    const metrics = module.getPipelineMetrics();
    console.log(`📈 Debug enabled: ${metrics.debugEnabled}`);
    console.log(`💾 I/O tracking enabled: ${metrics.ioTrackingEnabled}`);

    // Check debug logs directory
    console.log('\n📁 Debug Logs Directory Check');
    console.log('----------------------------');

    try {
      const debugDirExists = fs.existsSync(debugBaseDirectory);
      console.log(`📂 Debug directory exists: ${debugDirExists}`);

      if (debugDirExists) {
        const files = fs.readdirSync(debugBaseDirectory);
        console.log(`📄 Files in debug directory (${files.length} total):`);

        // Show only the first 5 files to avoid overwhelming output
        const displayFiles = files.slice(0, 5);
        displayFiles.forEach(file => {
          const filePath = path.join(debugBaseDirectory, file);
          const stats = fs.statSync(filePath);
          console.log(`   ${file} (${stats.size} bytes, ${new Date(stats.mtime).toISOString()})`);
        });

        if (files.length > 5) {
          console.log(`   ... and ${files.length - 5} more files`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Warning: Could not read debug directory: ${error.message}`);
    }

    console.log('\n✅ Pipeline Base Module Debug Test Completed Successfully');
    console.log('========================================================');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up resources...');
    await module.destroy();
    console.log('✅ Cleanup completed');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runPipelineBaseModuleTest().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { runPipelineBaseModuleTest };