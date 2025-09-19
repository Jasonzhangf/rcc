/**
 * Simple Pipeline Debug Test
 * 简单流水线调试测试
 *
 * This test demonstrates the pipeline's ability to track execution through multiple modules
 * and generate comprehensive debug information.
 */

import { DebuggablePipelineModule, DebuggablePipelineModuleConfig } from '../sharedmodule/pipeline/src/core/DebuggablePipelineModule';
import { PipelineStage, ErrorCategory, ErrorSeverity } from '../sharedmodule/pipeline/src/core/PipelineExecutionContext';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const TEST_CONFIG: DebuggablePipelineModuleConfig = {
  id: 'test-pipeline-module',
  name: 'Test Pipeline Module',
  version: '1.0.0',
  description: 'Test module for pipeline debugging',
  type: 'debuggable-pipeline',
  enableTracing: true,
  maxConcurrentExecutions: 100,
  executionTimeout: 10000,
  enablePerformanceMetrics: true,
  enableEnhancedErrorHandling: true,
  errorRecoveryAttempts: 3,
  tracerConfig: {
    maxActiveTraces: 50,
    traceRetentionTime: 60000, // 1 minute
    enableChainTracking: true,
    enableMetrics: true,
    samplingRate: 1.0, // Sample all for testing
    enableRealTimeMonitoring: true
  },
  recordingConfig: {
    enabled: true,
    basePath: '/Users/fanzhang/.rcc/debug-logs',
    port: 5506
  }
};

// Utility functions
function waitForMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createTestRequest() {
  return {
    messages: [
      { role: 'user', content: 'Hello, test message' }
    ],
    model: 'test-model',
    temperature: 0.7,
    maxTokens: 100
  };
}

function createTestResponse() {
  return {
    choices: [
      {
        message: { role: 'assistant', content: 'Test response' },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30
    }
  };
}

/**
 * Main test runner
 */
async function runSimplePipelineTest(): Promise<void> {
  console.log('🚀 Starting Simple Pipeline Debug Test');
  console.log('======================================');

  // Ensure debug directory exists
  const debugBaseDirectory = '/Users/fanzhang/.rcc/debug-logs';
  try {
    fs.mkdirSync(debugBaseDirectory, { recursive: true });
    console.log(`📁 Debug directory ensured: ${debugBaseDirectory}`);
  } catch (error) {
    console.warn(`⚠️  Warning: Could not create debug directory: ${error.message}`);
  }

  // Create pipeline module
  const module = new DebuggablePipelineModule(TEST_CONFIG);

  try {
    console.log('✅ Module created successfully');

    // Test 1: Normal execution with tracing
    console.log('\n📝 Test 1: Normal Execution with Tracing');
    console.log('----------------------------------------');

    const testRequest = createTestRequest();
    const testResponse = createTestResponse();

    const result = await module.executeWithTracing(
      async (context) => {
        // Simulate processing delay
        await waitForMs(100);

        // Simulate different stages of processing
        console.log(`🔄 Processing in stage: ${context.stage}`);

        return testResponse;
      },
      PipelineStage.PROVIDER_EXECUTION,
      testRequest
    );

    console.log(`✅ Execution result: ${result.status === 'success' ? 'SUCCESS' : 'FAILED'}`);
    console.log(`⏱️  Duration: ${result.timing.duration}ms`);
    console.log(`🎯 Execution ID: ${result.executionId}`);
    console.log(`🔗 Trace ID: ${result.traceId}`);
    console.log(`📝 Request ID: ${result.requestId}`);

    if (result.data) {
      console.log(`📄 Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
    }

    // Test 2: Multi-stage execution
    console.log('\n📝 Test 2: Multi-stage Execution');
    console.log('--------------------------------');

    const multiStageResult = await module.executeWithTracing(
      async (context) => {
        // Simulate request initialization stage
        await waitForMs(20);
        console.log(`🔄 Stage 1 - Request Init: ${context.stage}`);

        // Simulate authentication stage
        await waitForMs(30);
        console.log(`🔄 Stage 2 - Authentication`);

        // Simulate provider execution stage
        await waitForMs(50);
        console.log(`🔄 Stage 3 - Provider Execution`);

        return { message: 'Multi-stage processing completed', stages: 3 };
      },
      PipelineStage.REQUEST_INIT,
      { operation: 'multi-stage-test' }
    );

    console.log(`✅ Multi-stage result: ${multiStageResult.status === 'success' ? 'SUCCESS' : 'FAILED'}`);
    console.log(`⏱️  Duration: ${multiStageResult.timing.duration}ms`);

    // Test 3: Error handling
    console.log('\n📝 Test 3: Error Handling');
    console.log('-------------------------');

    const errorResult = await module.executeWithTracing(
      async (context) => {
        await waitForMs(50);
        throw new Error('Simulated processing error for testing');
      },
      PipelineStage.PROVIDER_EXECUTION,
      { operation: 'error-test' }
    );

    console.log(`✅ Error handling result: ${errorResult.status}`);
    if (errorResult.error) {
      console.log(`❌ Error message: ${errorResult.error.message}`);
      console.log(`🏷️  Error category: ${errorResult.error.category}`);
      console.log(`⚖️  Error severity: ${errorResult.error.severity}`);
      console.log(`🔄 Recoverable: ${errorResult.error.recoverable}`);
    }

    // Test 4: Nested execution contexts
    console.log('\n📝 Test 4: Nested Execution Contexts');
    console.log('------------------------------------');

    const nestedResult = await module.executeWithTracing(
      async (outerContext) => {
        console.log(`🔄 Outer context stage: ${outerContext.stage}`);

        // Create nested context
        const innerResult = await module.executeWithTracing(
          async (innerContext) => {
            console.log(`🔄 Inner context stage: ${innerContext.stage}`);
            await waitForMs(30);
            return { nested: true, value: 'inner-result' };
          },
          PipelineStage.PROVIDER_EXECUTION,
          { nested: true },
          { parentContext: outerContext }
        );

        return {
          outer: 'outer-result',
          inner: innerResult.data
        };
      },
      PipelineStage.REQUEST_INIT,
      { operation: 'nested-test' }
    );

    console.log(`✅ Nested execution result: ${nestedResult.status === 'success' ? 'SUCCESS' : 'FAILED'}`);
    if (nestedResult.data) {
      console.log(`📄 Nested data: ${JSON.stringify(nestedResult.data)}`);
    }

    // Test 5: Concurrent executions
    console.log('\n📝 Test 5: Concurrent Executions');
    console.log('--------------------------------');

    const concurrentCount = 5;
    const promises: Promise<any>[] = [];

    for (let i = 0; i < concurrentCount; i++) {
      const promise = module.executeWithTracing(
        async (context) => {
          await waitForMs(Math.random() * 100 + 50);
          return { id: i, result: `concurrent-result-${i}` };
        },
        PipelineStage.PROVIDER_EXECUTION,
        { operation: `concurrent-${i}` }
      );
      promises.push(promise);
    }

    const concurrentResults = await Promise.all(promises);
    console.log(`✅ Concurrent executions completed: ${concurrentResults.length}`);
    const successCount = concurrentResults.filter(r => r.status === 'success').length;
    console.log(`✅ Success rate: ${successCount}/${concurrentCount}`);

    // Display execution statistics
    console.log('\n📊 Execution Statistics');
    console.log('----------------------');

    const stats = module.getExecutionStatistics();
    console.log(`📈 Total Executions: ${stats.totalExecutions}`);
    console.log(`🏃 Active Executions: ${stats.activeExecutions}`);
    console.log(`✅ Completed Executions: ${stats.completedExecutions}`);
    console.log(`❌ Failed Executions: ${stats.failedExecutions}`);
    console.log(`⏱️  Average Duration: ${stats.averageDuration.toFixed(2)}ms`);

    // Display debug information
    console.log('\n🔍 Debug Information');
    console.log('-------------------');

    const activeContexts = module.getActiveExecutionContexts();
    console.log(`📋 Active Execution Contexts: ${activeContexts.length}`);

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

    console.log('\n✅ Simple Pipeline Debug Test Completed Successfully');
    console.log('===================================================');

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
  runSimplePipelineTest().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { runSimplePipelineTest };