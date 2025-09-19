/**
 * Comprehensive Pipeline Debug Test
 * 全面的流水线调试测试
 *
 * This test demonstrates the pipeline's ability to track execution through multiple modules
 * and generate comprehensive debug information.
 */

import { DebuggablePipelineModule, DebuggablePipelineModuleConfig, ExecutionResult } from '../sharedmodule/pipeline/src/core/DebuggablePipelineModule';
import { PipelineTracker } from '../sharedmodule/pipeline/src/framework/PipelineTracker';
import { Pipeline, PipelineConfig, PipelineTarget } from '../sharedmodule/pipeline/src/framework/Pipeline';
import { BaseProvider } from '../sharedmodule/pipeline/src/framework/BaseProvider';
import { PipelineBaseModule } from '../sharedmodule/pipeline/src/modules/PipelineBaseModule';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Mock provider for testing
 * 测试用的模拟提供者
 */
class MockProvider extends BaseProvider {
  private responses: Record<string, any> = {
    'test-request-1': {
      id: 'response-1',
      object: 'chat.completion',
      created: Date.now(),
      model: 'mock-model-1',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'Response from Provider 1'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      }
    },
    'test-request-2': {
      id: 'response-2',
      object: 'chat.completion',
      created: Date.now(),
      model: 'mock-model-2',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'Response from Provider 2'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 15,
        completion_tokens: 25,
        total_tokens: 40
      }
    },
    'test-request-3': {
      id: 'response-3',
      object: 'chat.completion',
      created: Date.now(),
      model: 'mock-model-3',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'Response from Provider 3'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 22,
        total_tokens: 34
      }
    }
  };

  constructor(config: any) {
    super({
      name: config.name,
      endpoint: config.endpoint || 'http://mock-provider.local',
      supportedModels: config.supportedModels || ['mock-model-1'],
      defaultModel: config.defaultModel || 'mock-model-1',
      enableTwoPhaseDebug: true,
      enableIOTracking: true,
      debugBaseDirectory: config.debugBaseDirectory || '~/.rcc/debug-logs'
    });
  }

  async executeChat(providerRequest: any): Promise<any> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

    // Return mock response or error for specific requests
    if (providerRequest.id === 'error-request') {
      throw new Error('Simulated provider error');
    }

    const response = this.responses[providerRequest.id] || {
      id: `response-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now(),
      model: providerRequest.model || 'mock-model',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: `Default response for ${providerRequest.id}`
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 5,
        completion_tokens: 10,
        total_tokens: 15
      }
    };

    return response;
  }

  async *executeStreamChat(providerRequest: any): AsyncGenerator<any, void, unknown> {
    // Simulate streaming response
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      yield {
        id: `stream-chunk-${i}`,
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: providerRequest.model || 'mock-model',
        choices: [{
          index: 0,
          delta: {
            role: 'assistant',
            content: `Streaming data ${i} for ${providerRequest.id}`
          },
          finish_reason: null
        }]
      };
    }
  }
}

/**
 * Mock transformer module for processing pipeline data
 * 流水线数据处理的模拟转换模块
 */
class MockTransformerModule extends DebuggablePipelineModule {
  constructor(config: DebuggablePipelineModuleConfig) {
    super({
      ...config,
      type: 'pipeline'
    });
  }

  async transformData(data: any): Promise<any> {
    return await this.executeWithTracing(
      async (context) => {
        // Simulate data transformation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));

        const transformed = {
          ...data,
          transformed: true,
          timestamp: Date.now(),
          moduleId: this.info.id
        };

        return transformed;
      },
      'data-transformation',
      data,
      { metadata: { transformationType: 'mock-transform' } }
    );
  }

  async validateData(data: any): Promise<boolean> {
    return await this.executeWithTracing(
      async (context) => {
        // Simulate data validation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 15));
        return data !== null && data !== undefined;
      },
      'data-validation',
      data,
      { metadata: { validationType: 'mock-validation' } }
    );
  }
}

/**
 * Mock router module for routing pipeline requests
 * 流水线请求路由的模拟路由模块
 */
class MockRouterModule extends DebuggablePipelineModule {
  private routes: Map<string, string> = new Map();

  constructor(config: DebuggablePipelineModuleConfig) {
    super({
      ...config,
      type: 'pipeline'
    });

    // Initialize some mock routes
    this.routes.set('route-1', 'provider-1');
    this.routes.set('route-2', 'provider-2');
    this.routes.set('route-3', 'provider-3');
  }

  async routeRequest(request: any): Promise<string> {
    return await this.executeWithTracing(
      async (context) => {
        // Simulate routing logic
        await new Promise(resolve => setTimeout(resolve, Math.random() * 40 + 20));

        const routeKey = request.routeKey || 'default';
        const target = this.routes.get(routeKey) || 'default-provider';

        return target;
      },
      'request-routing',
      request,
      { metadata: { routingAlgorithm: 'mock-routing' } }
    );
  }

  async loadBalance(targets: string[]): Promise<string> {
    return await this.executeWithTracing(
      async (context) => {
        // Simulate load balancing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 15));

        const index = Math.floor(Math.random() * targets.length);
        return targets[index];
      },
      'load-balancing',
      { targets },
      { metadata: { loadBalancingStrategy: 'random' } }
    );
  }
}

/**
 * Main test runner
 * 主测试运行器
 */
async function runComprehensivePipelineTest(): Promise<void> {
  console.log('🚀 Starting Comprehensive Pipeline Debug Test');
  console.log('==============================================');

  // Configure debug directory
  const debugBaseDirectory = '/Users/fanzhang/.rcc/debug-logs';

  // Ensure debug directory exists
  try {
    fs.mkdirSync(debugBaseDirectory, { recursive: true });
    console.log(`📁 Debug directory ensured: ${debugBaseDirectory}`);
  } catch (error) {
    console.warn(`⚠️  Warning: Could not create debug directory: ${error.message}`);
  }

  // Create tracker
  const tracker = new PipelineTracker();

  // Create providers
  const providers: BaseProvider[] = [];
  for (let i = 1; i <= 3; i++) {
    const provider = new MockProvider({
      id: `provider-${i}`,
      name: `Mock Provider ${i}`,
      endpoint: `http://mock-provider-${i}.local`,
      supportedModels: [`mock-model-${i}`],
      defaultModel: `mock-model-${i}`,
      debugBaseDirectory
    });
    providers.push(provider);
  }

  // Create pipeline targets
  const targets: PipelineTarget[] = providers.map((provider, index) => ({
    id: `target-${index + 1}`,
    provider,
    weight: index + 1,
    enabled: true,
    healthStatus: 'healthy',
    lastHealthCheck: Date.now(),
    requestCount: 0,
    errorCount: 0,
    metadata: { providerIndex: index }
  }));

  // Create pipeline config
  const pipelineConfig: PipelineConfig = {
    id: 'test-pipeline-1',
    name: 'Test Pipeline',
    virtualModelId: 'test-virtual-model',
    description: 'Comprehensive test pipeline for debugging',
    targets,
    loadBalancingStrategy: 'round-robin',
    healthCheckInterval: 30000,
    maxRetries: 3,
    timeout: 5000,
    metadata: { testPipeline: true }
  };

  // Create pipeline
  const pipeline = new Pipeline(pipelineConfig, tracker);

  // Create transformer module
  const transformerModule = new MockTransformerModule({
    id: 'data-transformer',
    name: 'Data Transformer Module',
    version: '1.0.0',
    description: 'Transforms data in the pipeline',
    type: 'pipeline',
    enableTracing: true,
    enablePerformanceMetrics: true,
    enableEnhancedErrorHandling: true,
    recordingConfig: {
      enabled: true
    },
    tracerConfig: {
      samplingRate: 1.0
    },
    debugBaseDirectory
  });

  // Create router module
  const routerModule = new MockRouterModule({
    id: 'request-router',
    name: 'Request Router Module',
    version: '1.0.0',
    description: 'Routes requests in the pipeline',
    type: 'pipeline',
    enableTracing: true,
    enablePerformanceMetrics: true,
    enableEnhancedErrorHandling: true,
    recordingConfig: {
      enabled: true
    },
    tracerConfig: {
      samplingRate: 1.0
    },
    debugBaseDirectory
  });

  try {
    // Initialize modules
    await transformerModule.initialize();
    await routerModule.initialize();

    console.log('✅ Modules initialized successfully');

    // Test 1: Normal pipeline execution
    console.log('\n📝 Test 1: Normal Pipeline Execution');
    console.log('-------------------------------------');

    const testRequest1 = {
      model: 'mock-model-1',
      messages: [
        {
          role: 'user',
          content: 'Hello from test request 1'
        }
      ],
      id: 'test-request-1',
      data: { value: 42, text: 'test' }
    };

    const requestContext1 = tracker.createRequestContext(
      'mock-provider-1',
      'chat',
      { testId: 'normal-execution', requestId: 'test-1' }
    );

    const result1 = await pipeline.execute(
      testRequest1,
      'chat',
      { requestContext: requestContext1 }
    );

    console.log(`✅ Pipeline execution 1 result: ${result1.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`⏱️  Duration: ${result1.duration}ms`);
    console.log(`🎯 Target: ${result1.targetId}`);

    if (result1.response) {
      console.log(`📄 Response: ${JSON.stringify(result1.response)}`);
    }

    // Test 2: Data transformation in pipeline
    console.log('\n📝 Test 2: Data Transformation');
    console.log('-------------------------------');

    const rawData = { id: 'raw-data-1', content: 'This is raw data' };
    const validationResult = await transformerModule.validateData(rawData);
    console.log(`✅ Data validation result: ${validationResult}`);

    const transformationResult = await transformerModule.transformData(rawData);
    console.log(`✅ Data transformation completed`);
    console.log(`📄 Transformed data: ${JSON.stringify(transformationResult.data)}`);

    // Test 3: Request routing
    console.log('\n📝 Test 3: Request Routing');
    console.log('--------------------------');

    const routeRequest = { id: 'route-request-1', routeKey: 'route-2', data: 'routing test' };
    const routeResult = await routerModule.routeRequest(routeRequest);
    console.log(`✅ Route result: ${routeResult}`);

    const targetsForLoadBalancing = ['target-1', 'target-2', 'target-3'];
    const loadBalanceResult = await routerModule.loadBalance(targetsForLoadBalancing);
    console.log(`✅ Load balance result: ${loadBalanceResult}`);

    // Test 4: Pipeline with streaming
    console.log('\n📝 Test 4: Streaming Pipeline Execution');
    console.log('---------------------------------------');

    const streamRequest = {
      model: 'mock-model-2',
      messages: [
        {
          role: 'user',
          content: 'Hello from streaming request'
        }
      ],
      stream: true,
      id: 'stream-request-1',
      data: { stream: true, value: 123 }
    };

    const requestContext2 = tracker.createRequestContext(
      'mock-provider-2',
      'streamChat',
      { testId: 'streaming-execution', requestId: 'test-2' }
    );

    let streamChunkCount = 0;
    for await (const chunk of pipeline.executeStreaming(
      streamRequest,
      'streamChat',
      { requestContext: requestContext2 }
    )) {
      streamChunkCount++;
      console.log(`📥 Stream chunk ${streamChunkCount}: ${JSON.stringify(chunk)}`);
    }

    console.log(`✅ Streaming completed with ${streamChunkCount} chunks`);

    // Test 5: Error handling
    console.log('\n📝 Test 5: Error Handling');
    console.log('-------------------------');

    const errorRequest = {
      model: 'mock-model-3',
      messages: [
        {
          role: 'user',
          content: 'This request should cause an error'
        }
      ],
      id: 'error-request',
      data: { shouldFail: true }
    };

    const requestContext3 = tracker.createRequestContext(
      'mock-provider-3',
      'chat',
      { testId: 'error-handling', requestId: 'test-3' }
    );

    const errorResult = await pipeline.execute(
      errorRequest,
      'chat',
      { requestContext: requestContext3 }
    );

    console.log(`✅ Error handling test: ${errorResult.success ? 'UNEXPECTED SUCCESS' : 'EXPECTED FAILURE'}`);
    if (errorResult.error) {
      console.log(`❌ Error message: ${errorResult.error}`);
    }

    // Test 6: Complete request context
    console.log('\n📝 Test 6: Completing Request Contexts');
    console.log('--------------------------------------');

    const completedContext1 = tracker.completeRequest(requestContext1.getRequestId());
    const completedContext2 = tracker.completeRequest(requestContext2.getRequestId());
    const completedContext3 = tracker.completeRequest(requestContext3.getRequestId());

    console.log(`✅ Request context 1 completed: ${completedContext1 ? 'YES' : 'NO'}`);
    console.log(`✅ Request context 2 completed: ${completedContext2 ? 'YES' : 'NO'}`);
    console.log(`✅ Request context 3 completed: ${completedContext3 ? 'YES' : 'NO'}`);

    // Display execution statistics
    console.log('\n📊 Execution Statistics');
    console.log('----------------------');

    const pipelineMetrics = pipeline.getMetrics();
    console.log(`📈 Pipeline Metrics:`);
    console.log(`   Total Requests: ${pipelineMetrics.totalRequests}`);
    console.log(`   Successful Requests: ${pipelineMetrics.successfulRequests}`);
    console.log(`   Failed Requests: ${pipelineMetrics.failedRequests}`);
    console.log(`   Error Rate: ${(pipelineMetrics.errorRate * 100).toFixed(2)}%`);
    console.log(`   Average Response Time: ${pipelineMetrics.averageResponseTime.toFixed(2)}ms`);

    const trackerStats = tracker.getRequestStatistics();
    console.log(`\n🔍 Tracker Statistics:`);
    console.log(`   Active Requests: ${trackerStats.activeRequests}`);
    console.log(`   Total Stages: ${trackerStats.totalStages}`);
    console.log(`   Completed Stages: ${trackerStats.completedStages}`);
    console.log(`   Failed Stages: ${trackerStats.failedStages}`);
    console.log(`   Running Stages: ${trackerStats.runningStages}`);

    const transformerStats = transformerModule.getExecutionStatistics();
    console.log(`\n⚙️  Transformer Module Statistics:`);
    console.log(`   ${JSON.stringify(transformerStats, null, 2)}`);

    const routerStats = routerModule.getExecutionStatistics();
    console.log(`\n🧭 Router Module Statistics:`);
    console.log(`   ${JSON.stringify(routerStats, null, 2)}`);

    // Display debug information
    console.log('\n🔍 Debug Information');
    console.log('-------------------');

    const activeContexts = tracker.getActiveExecutionContexts();
    console.log(`📋 Active Execution Contexts: ${activeContexts.length}`);

    const traceChains = tracker.getTraceChains();
    console.log(`🔗 Trace Chains: ${Object.keys(traceChains).length}`);

    // Check debug logs directory
    console.log('\n📁 Debug Logs Directory Check');
    console.log('----------------------------');

    try {
      const debugDirExists = fs.existsSync(debugBaseDirectory);
      console.log(`📂 Debug directory exists: ${debugDirExists}`);

      if (debugDirExists) {
        const files = fs.readdirSync(debugBaseDirectory);
        console.log(`📄 Files in debug directory (${files.length} total):`);

        // Show only the first 10 files to avoid overwhelming output
        const displayFiles = files.slice(0, 10);
        displayFiles.forEach(file => {
          const filePath = path.join(debugBaseDirectory, file);
          const stats = fs.statSync(filePath);
          console.log(`   ${file} (${stats.size} bytes, ${new Date(stats.mtime).toISOString()})`);
        });

        if (files.length > 10) {
          console.log(`   ... and ${files.length - 10} more files`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Warning: Could not read debug directory: ${error.message}`);
    }

    console.log('\n✅ Comprehensive Pipeline Debug Test Completed Successfully');
    console.log('=========================================================');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up resources...');

    // Destroy pipeline
    pipeline.destroy();

    // Destroy modules
    await transformerModule.destroy();
    await routerModule.destroy();
    await tracker.destroy();

    console.log('✅ Cleanup completed');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runComprehensivePipelineTest().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { runComprehensivePipelineTest };