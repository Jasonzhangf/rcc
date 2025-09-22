/**
 * Performance Tests for RCC Pipeline Modules
 *
 * Dedicated performance testing for individual modules and the complete pipeline system
 */

import { LLMSwitchModule } from '../../src/modules/LLMSwitchModule';
import { WorkflowModule } from '../../src/modules/WorkflowModule';
import { CompatibilityModule } from '../../src/modules/CompatibilityModule';
import { ProviderModule } from '../../src/modules/ProviderModule';
import { ModularPipelineExecutor } from '../../src/core/ModularPipelineExecutor';
import { ModuleFactory } from '../../src/core/ModuleFactory';
import { ConfigurationValidator } from '../../src/core/ConfigurationValidator';
import { ProtocolType } from '../../src/interfaces/ModularInterfaces';
import { createTestPipelineWrapper, createTestRequest, createStreamingTestRequest, TEST_TIMEOUT } from '../setup';

describe('Performance Tests - Individual Modules', () => {
  let llmswitch: LLMSwitchModule;
  let workflow: WorkflowModule;
  let compatibility: CompatibilityModule;
  let provider: ProviderModule;

  beforeEach(() => {
    const testWrapper = createTestPipelineWrapper();

    llmswitch = new LLMSwitchModule(testWrapper.modules.find(m => m.type === 'llmswitch')!);
    workflow = new WorkflowModule(testWrapper.modules.find(m => m.type === 'workflow')!);
    compatibility = new CompatibilityModule(testWrapper.modules.find(m => m.type === 'compatibility')!);
    provider = new ProviderModule(testWrapper.modules.find(m => m.type === 'provider')!);
  });

  afterEach(async () => {
    await Promise.all([
      llmswitch.destroy(),
      workflow.destroy(),
      compatibility.destroy(),
      provider.destroy()
    ]);
  });

  describe('LLMSwitchModule Performance', () => {
    beforeEach(async () => {
      await llmswitch.initialize();
    });

    test('should handle rapid protocol conversions', async () => {
      const iterations = 1000;
      const request = createTestRequest();
      const context = {
        sessionId: 'perf-test',
        requestId: 'perf-req',
        routingId: 'test-dynamic-routing',
        providerId: 'test-provider',
        startTime: Date.now(),
        ioRecords: [],
        metadata: {}
      };

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await llmswitch.convertRequest(request, ProtocolType.OPENAI, ProtocolType.ANTHROPIC, context);
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(1); // Should be less than 1ms per conversion
      console.log(`LLMSwitch average conversion time: ${averageTime.toFixed(3)}ms`);
    }, TEST_TIMEOUT);

    test('should maintain performance with complex requests', async () => {
      const complexRequest = {
        model: 'gpt-4',
        messages: Array(50).fill(null).map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i + 1}: ${'x'.repeat(100)}`
        })),
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        stop: ['\n\nHuman:', '\n\nAssistant:']
      };

      const iterations = 100;
      const context = {
        sessionId: 'perf-test',
        requestId: 'perf-req',
        routingId: 'test-dynamic-routing',
        providerId: 'test-provider',
        startTime: Date.now(),
        ioRecords: [],
        metadata: {}
      };

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await llmswitch.convertRequest(complexRequest, ProtocolType.OPENAI, ProtocolType.ANTHROPIC, context);
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(5); // Should be less than 5ms for complex requests
      console.log(`LLMSwitch complex request average time: ${averageTime.toFixed(3)}ms`);
    }, TEST_TIMEOUT);
  });

  describe('WorkflowModule Performance', () => {
    beforeEach(async () => {
      await workflow.initialize();
    });

    test('should handle rapid streaming conversions', async () => {
      const iterations = 1000;
      const streamingRequest = createStreamingTestRequest();
      const context = {
        sessionId: 'perf-test',
        requestId: 'perf-req',
        routingId: 'test-dynamic-routing',
        providerId: 'test-provider',
        startTime: Date.now(),
        ioRecords: [],
        metadata: {}
      };

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await workflow.convertStreamingToNonStreaming(streamingRequest, context);
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(0.5); // Should be less than 0.5ms per conversion
      console.log(`Workflow streaming conversion average time: ${averageTime.toFixed(3)}ms`);
    }, TEST_TIMEOUT);

    test('should maintain performance with long conversations', async () => {
      const longConversationRequest = {
        model: 'gpt-4',
        messages: Array(100).fill(null).map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Turn ${i + 1}: ${'x'.repeat(50)}`
        })),
        stream: true
      };

      const iterations = 50;
      const context = {
        sessionId: 'perf-test',
        requestId: 'perf-req',
        routingId: 'test-dynamic-routing',
        providerId: 'test-provider',
        startTime: Date.now(),
        ioRecords: [],
        metadata: {}
      };

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await workflow.convertStreamingToNonStreaming(longConversationRequest, context);
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(2); // Should be less than 2ms for long conversations
      console.log(`Workflow long conversation average time: ${averageTime.toFixed(3)}ms`);
    }, TEST_TIMEOUT);
  });

  describe('CompatibilityModule Performance', () => {
    beforeEach(async () => {
      await compatibility.initialize();
    });

    test('should handle rapid field mappings', async () => {
      const iterations = 1000;
      const request = createTestRequest();
      const context = {
        sessionId: 'perf-test',
        requestId: 'perf-req',
        routingId: 'test-dynamic-routing',
        providerId: 'test-provider',
        startTime: Date.now(),
        ioRecords: [],
        metadata: {}
      };

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await compatibility.mapRequest(request, 'test-provider', context);
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(0.5); // Should be less than 0.5ms per mapping
      console.log(`Compatibility field mapping average time: ${averageTime.toFixed(3)}ms`);
    }, TEST_TIMEOUT);

    test('should maintain performance with custom mappings', async () => {
      const iterations = 500;
      const request = {
        ...createTestRequest(),
        custom_field1: 'value1',
        custom_field2: { nested: 'value2' },
        custom_field3: [1, 2, 3]
      };

      const context = {
        sessionId: 'perf-test',
        requestId: 'perf-req',
        routingId: 'test-dynamic-routing',
        providerId: 'test-provider',
        startTime: Date.now(),
        ioRecords: [],
        metadata: {}
      };

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await compatibility.mapRequest(request, 'test-provider', context);
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(1); // Should be less than 1ms for custom mappings
      console.log(`Compatibility custom mapping average time: ${averageTime.toFixed(3)}ms`);
    }, TEST_TIMEOUT);
  });
});

describe('Performance Tests - Pipeline System', () => {
  let executor: ModularPipelineExecutor;
  let moduleFactory: ModuleFactory;
  let validator: ConfigurationValidator;
  let testWrapper: any;

  beforeEach(() => {
    moduleFactory = new ModuleFactory();
    validator = new ConfigurationValidator();
    testWrapper = createTestPipelineWrapper();
    executor = new ModularPipelineExecutor(moduleFactory, validator);
  });

  afterEach(async () => {
    if (executor) {
      await executor.destroy();
    }
  });

  describe('Pipeline Execution Performance', () => {
    beforeEach(async () => {
      await executor.initialize(testWrapper);
    });

    test('should handle high request throughput', async () => {
      const requestCount = 100;
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const startTime = Date.now();
      const results: any[] = [];

      // Execute requests sequentially
      for (let i = 0; i < requestCount; i++) {
        const result = await executor.execute(request, routingId);
        results.push(result);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / requestCount;
      const throughput = requestCount / (totalTime / 1000); // requests per second

      expect(results).toHaveLength(requestCount);
      expect(results.every(r => r.success)).toBe(true);
      expect(averageTime).toBeLessThan(100); // Should be less than 100ms per request
      expect(throughput).toBeGreaterThan(10); // Should handle more than 10 requests per second

      console.log(`Sequential processing: ${requestCount} requests in ${totalTime}ms`);
      console.log(`Average time: ${averageTime.toFixed(2)}ms per request`);
      console.log(`Throughput: ${throughput.toFixed(2)} requests/second`);
    }, TEST_TIMEOUT * 3);

    test('should handle concurrent request processing', async () => {
      const concurrency = 20;
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const startTime = Date.now();

      // Execute requests concurrently
      const promises = Array(concurrency).fill(null).map(() =>
        executor.execute(request, routingId)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrency;
      const throughput = concurrency / (totalTime / 1000);

      expect(results).toHaveLength(concurrency);
      expect(results.every(r => r.success)).toBe(true);
      expect(averageTime).toBeLessThan(150); // Should be less than 150ms per concurrent request
      expect(throughput).toBeGreaterThan(13); // Should handle more than 13 requests per second

      console.log(`Concurrent processing: ${concurrency} requests in ${totalTime}ms`);
      console.log(`Average time: ${averageTime.toFixed(2)}ms per request`);
      console.log(`Throughput: ${throughput.toFixed(2)} requests/second`);
    }, TEST_TIMEOUT * 3);

    test('should maintain performance under sustained load', async () => {
      const duration = 30000; // 30 seconds
      const requestRate = 5; // requests per second
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const startTime = Date.now();
      const results: any[] = [];
      let requestCount = 0;

      // Generate requests at specified rate
      const requestInterval = setInterval(() => {
        if (Date.now() - startTime < duration) {
          requestCount++;
          executor.execute(request, routingId).then(result => {
            results.push(result);
          });
        }
      }, 1000 / requestRate);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, duration));
      clearInterval(requestInterval);

      // Wait for remaining requests to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      const endTime = Date.now();
      const actualDuration = endTime - startTime;
      const actualRequestRate = results.length / (actualDuration / 1000);
      const successRate = results.filter(r => r.success).length / results.length;

      expect(results.length).toBeGreaterThan(requestCount * 0.9); // At least 90% of requests completed
      expect(successRate).toBeGreaterThan(0.95); // At least 95% success rate
      expect(actualRequestRate).toBeGreaterThan(requestRate * 0.8); // At least 80% of target rate

      console.log(`Sustained load test: ${results.length} requests in ${actualDuration}ms`);
      console.log(`Target rate: ${requestRate} requests/second, Actual: ${actualRequestRate.toFixed(2)} requests/second`);
      console.log(`Success rate: ${(successRate * 100).toFixed(1)}%`);
    }, TEST_TIMEOUT * 10);

    test('should handle memory efficiency with many requests', async () => {
      const requestCount = 1000;
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      // Get initial memory usage
      const initialMemory = process.memoryUsage();

      const startTime = Date.now();

      // Execute many requests
      for (let i = 0; i < requestCount; i++) {
        await executor.execute(request, routingId);
      }

      const endTime = Date.now();
      const finalMemory = process.memoryUsage();

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryPerRequest = memoryIncrease / requestCount;

      expect(memoryPerRequest).toBeLessThan(1024); // Should be less than 1KB per request

      console.log(`Memory efficiency test: ${requestCount} requests`);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory per request: ${memoryPerRequest.toFixed(2)} bytes`);
      console.log(`Total time: ${endTime - startTime}ms`);
    }, TEST_TIMEOUT * 5);
  });

  describe('Streaming Performance', () => {
    beforeEach(async () => {
      await executor.initialize(testWrapper);
    });

    test('should handle streaming requests efficiently', async () => {
      const concurrency = 10;
      const request = createStreamingTestRequest();
      const routingId = 'test-dynamic-routing';

      const startTime = Date.now();

      // Execute streaming requests concurrently
      const promises = Array(concurrency).fill(null).map(async () => {
        const streamingGenerator = executor.executeStreaming(request, routingId);
        const chunks: any[] = [];

        for await (const chunk of streamingGenerator) {
          chunks.push(chunk);
        }

        return chunks;
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrency;
      const totalChunks = results.reduce((sum, chunks) => sum + chunks.length, 0);

      expect(results).toHaveLength(concurrency);
      expect(results.every(chunks => chunks.length > 0)).toBe(true);
      expect(averageTime).toBeLessThan(200); // Should be less than 200ms per streaming request

      console.log(`Streaming performance: ${concurrency} concurrent requests`);
      console.log(`Average time: ${averageTime.toFixed(2)}ms per request`);
      console.log(`Total chunks processed: ${totalChunks}`);
    }, TEST_TIMEOUT * 3);

    test('should handle large streaming responses', async () => {
      const request = {
        ...createStreamingTestRequest(),
        max_tokens: 5000 // Large response
      };

      const startTime = Date.now();
      const streamingGenerator = executor.executeStreaming(request, 'test-virtual-model');
      const chunks: any[] = [];

      for await (const chunk of streamingGenerator) {
        chunks.push(chunk);
      }

      const endTime = Date.now();

      expect(chunks.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in less than 5 seconds

      console.log(`Large streaming response: ${chunks.length} chunks in ${endTime - startTime}ms`);
    }, TEST_TIMEOUT * 2);
  });
});

describe('Performance Tests - Stress Testing', () => {
  let executor: ModularPipelineExecutor;
  let moduleFactory: ModuleFactory;
  let validator: ConfigurationValidator;
  let testWrapper: any;

  beforeEach(async () => {
    moduleFactory = new ModuleFactory();
    validator = new ConfigurationValidator();
    testWrapper = createTestPipelineWrapper();
    executor = new ModularPipelineExecutor(moduleFactory, validator);
    await executor.initialize(testWrapper);
  });

  afterEach(async () => {
    if (executor) {
      await executor.destroy();
    }
  });

  test('should handle burst traffic patterns', async () => {
    const burstCount = 5;
    const requestsPerBurst = 20;
    const delayBetweenBursts = 1000;
    const request = createTestRequest();
    const routingId = 'test-dynamic-routing';

    const allResults: any[] = [];
    const burstTimings: number[] = [];

    for (let burst = 0; burst < burstCount; burst++) {
      const burstStart = Date.now();

      // Execute burst of requests
      const promises = Array(requestsPerBurst).fill(null).map(() =>
        executor.execute(request, routingId)
      );

      const results = await Promise.all(promises);
      allResults.push(...results);

      const burstEnd = Date.now();
      burstTimings.push(burstEnd - burstStart);

      if (burst < burstCount - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBursts));
      }
    }

    const totalRequests = allResults.length;
    const successRate = allResults.filter(r => r.success).length / totalRequests;
    const averageBurstTime = burstTimings.reduce((a, b) => a + b, 0) / burstTimings.length;

    expect(totalRequests).toBe(burstCount * requestsPerBurst);
    expect(successRate).toBeGreaterThan(0.9); // At least 90% success rate
    expect(averageBurstTime).toBeLessThan(3000); // Should handle each burst in less than 3 seconds

    console.log(`Burst traffic test: ${totalRequests} requests in ${burstCount} bursts`);
    console.log(`Average burst time: ${averageBurstTime.toFixed(2)}ms`);
    console.log(`Success rate: ${(successRate * 100).toFixed(1)}%`);
  }, TEST_TIMEOUT * 5);

  test('should recover from system overload', async () => {
    const overloadCount = 100;
    const request = createTestRequest();
    const routingId = 'test-dynamic-routing';

    // Create system overload
    const overloadPromises = Array(overloadCount).fill(null).map(() =>
      executor.execute(request, routingId)
    );

    // Wait for all to complete (some may fail)
    const overloadResults = await Promise.allSettled(overloadPromises);

    // Wait for recovery
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test recovery with normal load
    const recoveryRequests = 10;
    const recoveryResults: any[] = [];

    for (let i = 0; i < recoveryRequests; i++) {
      const result = await executor.execute(request, routingId);
      recoveryResults.push(result);
    }

    const overloadSuccessRate = overloadResults.filter(r => r.status === 'fulfilled').length / overloadResults.length;
    const recoverySuccessRate = recoveryResults.filter(r => r.success).length / recoveryResults.length;

    expect(overloadSuccessRate).toBeGreaterThan(0.5); // At least 50% success during overload
    expect(recoverySuccessRate).toBeGreaterThan(0.9); // At least 90% success after recovery

    console.log(`System overload test: ${overloadCount} concurrent requests`);
    console.log(`Overload success rate: ${(overloadSuccessRate * 100).toFixed(1)}%`);
    console.log(`Recovery success rate: ${(recoverySuccessRate * 100).toFixed(1)}%`);
  }, TEST_TIMEOUT * 5);

  test('should handle resource constraints gracefully', async () => {
    const constrainedRequest = {
      ...createTestRequest(),
      messages: Array(1000).fill(null).map((_, i) => ({
        role: 'user',
        content: `Large message ${i + 1}: ${'x'.repeat(1000)}`
      }))
    };

    const iterations = 50;
    const routingId = 'test-dynamic-routing';
    const results: any[] = [];

    for (let i = 0; i < iterations; i++) {
      try {
        const result = await executor.execute(constrainedRequest, routingId);
        results.push(result);
      } catch (error) {
        // Some requests may fail due to resource constraints
        results.push({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    const successRate = results.filter(r => r.success).length / results.length;

    expect(successRate).toBeGreaterThan(0.7); // At least 70% success rate with large requests

    console.log(`Resource constraint test: ${iterations} large requests`);
    console.log(`Success rate: ${(successRate * 100).toFixed(1)}%`);
  }, TEST_TIMEOUT * 5);
});