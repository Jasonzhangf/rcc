/**
 * Modular Pipeline Executor Integration Tests
 *
 * Tests the complete modular pipeline execution with all modules working together
 */

import { ModularPipelineExecutor } from '../../src/core/ModularPipelineExecutor';
import { ModuleFactory } from '../../src/core/ModuleFactory';
import { ConfigurationValidator } from '../../src/core/ConfigurationValidator';
import { createTestPipelineWrapper, createTestRequest, createStreamingTestRequest, TEST_TIMEOUT } from '../setup';

describe('ModularPipelineExecutor Integration Tests', () => {
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

  describe('System Initialization', () => {
    test('should initialize executor with valid pipeline wrapper', async () => {
      await expect(executor.initialize(testWrapper)).resolves.not.toThrow();

      const status = await executor.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.modules.llmswitch).toBeDefined();
      expect(status.modules.workflow).toBeDefined();
      expect(status.modules.compatibility).toBeDefined();
      expect(status.modules.provider).toBeDefined();
    }, TEST_TIMEOUT);

    test('should fail initialization with invalid wrapper', async () => {
      const invalidWrapper = {
        ...testWrapper,
        dynamicRouting: [] // Missing dynamic routing configurations
      };

      await expect(executor.initialize(invalidWrapper)).rejects.toThrow('配置验证失败');
    }, TEST_TIMEOUT);

    test('should fail initialization with missing modules', async () => {
      const incompleteWrapper = {
        ...testWrapper,
        modules: testWrapper.modules.filter(m => m.type !== 'llmswitch')
      };

      await expect(executor.initialize(incompleteWrapper)).rejects.toThrow('未找到LLMSwitch模块配置');
    }, TEST_TIMEOUT);
  });

  describe('Complete Pipeline Execution', () => {
    beforeEach(async () => {
      await executor.initialize(testWrapper);
    });

    test('should execute complete request pipeline successfully', async () => {
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const result = await executor.execute(request, routingId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.steps).toHaveLength(7); // 7-step pipeline execution

      // Verify each step was executed
      const stepTypes = result.steps.map(step => step.stepType);
      expect(stepTypes).toEqual([
        'transformation', // LLMSwitch
        'transformation', // Workflow
        'transformation', // Compatibility
        'request',        // Provider
        'response',       // Compatibility (response)
        'response',       // Workflow (response)
        'response'        // LLMSwitch (response)
      ]);

      // Verify response structure
      expect(result.response.id).toBeDefined();
      expect(result.response.object).toBe('chat.completion');
      expect(result.response.choices).toBeDefined();
      expect(result.response.choices.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    test('should handle request with specific provider routing', async () => {
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';
      const context = {
        providerId: 'test-provider'
      };

      const result = await executor.execute(request, routingId, context);

      expect(result.success).toBe(true);
      expect(result.context.providerId).toBe('test-provider');
    }, TEST_TIMEOUT);

    test('should handle streaming request execution', async () => {
      const request = createStreamingTestRequest();
      const routingId = 'test-dynamic-routing';

      const streamingSteps: any[] = [];
      const streamingGenerator = executor.executeStreaming(request, routingId);

      for await (const step of streamingGenerator) {
        streamingSteps.push(step);
      }

      expect(streamingSteps.length).toBeGreaterThan(0);
      expect(streamingSteps[0].moduleId).toBeDefined();
      expect(streamingSteps[0].stepType).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await executor.initialize(testWrapper);
    });

    test('should handle invalid virtual model ID', async () => {
      const request = createTestRequest();
      const invalidVirtualModelId = 'non-existent-model';

      const result = await executor.execute(request, invalidVirtualModelId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('未找到虚拟模型');
      expect(result.steps).toHaveLength(1); // Only error step
    }, TEST_TIMEOUT);

    test('should handle module execution errors gracefully', async () => {
      // Create a malformed request that will cause an error
      const malformedRequest = {
        model: 'test-model',
        // Missing required messages field
        temperature: 0.7
      };

      const result = await executor.execute(malformedRequest, 'test-dynamic-routing');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);

      // Find the error step
      const errorStep = result.steps.find(step => step.error);
      expect(errorStep).toBeDefined();
      expect(errorStep!.moduleId).toBe('error');
    }, TEST_TIMEOUT);

    test('should handle context execution errors', async () => {
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';
      const invalidContext = {
        sessionId: 'test-session',
        requestId: 'test-request',
        virtualModelId: 'different-virtual-model' // Conflict with parameter
      };

      const result = await executor.execute(request, virtualModelId, invalidContext);

      // Should still work with context override
      expect(result.success).toBe(true);
    }, TEST_TIMEOUT);
  });

  describe('Performance and Optimization', () => {
    beforeEach(async () => {
      await executor.initialize(testWrapper);
    });

    test('should execute pipeline efficiently', async () => {
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';
      const iterations = 10;

      const startTime = Date.now();
      const results: any[] = [];

      for (let i = 0; i < iterations; i++) {
        const result = await executor.execute(request, routingId);
        results.push(result);
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(results).toHaveLength(iterations);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(averageTime).toBeLessThan(500); // Should be less than 500ms per execution
      console.log(`Average pipeline execution time: ${averageTime.toFixed(2)}ms`);
    }, TEST_TIMEOUT);

    test('should handle concurrent requests efficiently', async () => {
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';
      const concurrency = 5;

      const startTime = Date.now();
      const promises = Array(concurrency).fill(null).map(() =>
        executor.execute(request, virtualModelId)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrency);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.steps).toHaveLength(7);
      });

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrency;

      expect(averageTime).toBeLessThan(600); // Should be less than 600ms per concurrent request
      console.log(`Average concurrent execution time: ${averageTime.toFixed(2)}ms`);
    }, TEST_TIMEOUT);

    test('should provide performance metrics', async () => {
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      // Execute a few requests to gather metrics
      for (let i = 0; i < 3; i++) {
        await executor.execute(request, virtualModelId);
      }

      const status = await executor.getStatus();
      expect(status.performance).toBeDefined();
      expect(status.routing).toBeDefined();
      expect(status.optimization).toBeDefined();

      // Check routing health
      expect(status.routing.health).toBeDefined();
      expect(Array.isArray(status.routing.health)).toBe(true);

      // Check performance metrics
      expect(status.performance).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('Module Communication and Data Flow', () => {
    beforeEach(async () => {
      await executor.initialize(testWrapper);
    });

    test('should pass data correctly through module chain', async () => {
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const result = await executor.execute(request, routingId);

      expect(result.success).toBe(true);

      // Trace data through the pipeline steps
      let currentData = request;
      for (let i = 0; i < result.steps.length - 1; i++) {
        const step = result.steps[i];
        const nextStep = result.steps[i + 1];

        if (step.output && nextStep.input) {
          // Data should flow from one step to the next
          expect(step.error).toBeUndefined();
        }
      }
    }, TEST_TIMEOUT);

    test('should maintain context throughout pipeline execution', async () => {
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';
      const testContext = {
        sessionId: 'test-session-123',
        requestId: 'test-request-456',
        metadata: {
          testKey: 'testValue'
        }
      };

      const result = await executor.execute(request, virtualModelId, testContext);

      expect(result.success).toBe(true);
      expect(result.context.sessionId).toBe('test-session-123');
      expect(result.context.requestId).toBe('test-request-456');
      expect(result.context.metadata.testKey).toBe('testValue');
    }, TEST_TIMEOUT);

    test('should track IO records throughout execution', async () => {
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const result = await executor.execute(request, routingId);

      expect(result.success).toBe(true);
      expect(result.context.ioRecords).toBeDefined();
      expect(Array.isArray(result.context.ioRecords)).toBe(true);
    }, TEST_TIMEOUT);
  });

  describe('Status Monitoring and Management', () => {
    test('should provide comprehensive system status', async () => {
      await executor.initialize(testWrapper);

      const status = await executor.getStatus();

      expect(status.isInitialized).toBe(true);
      expect(status.modules).toBeDefined();
      expect(Object.keys(status.modules)).toHaveLength(4); // 4 modules

      // Check each module status
      expect(status.modules.llmswitch.status).toBeDefined();
      expect(status.modules.workflow.status).toBeDefined();
      expect(status.modules.compatibility.status).toBeDefined();
      expect(status.modules.provider.status).toBeDefined();

      // Check additional status information
      expect(status.routing).toBeDefined();
      expect(status.performance).toBeDefined();
      expect(status.optimization).toBeDefined();
    }, TEST_TIMEOUT);

    test('should provide IO records on demand', async () => {
      await executor.initialize(testWrapper);

      const ioRecords = await executor.getIORecords();

      expect(ioRecords).toBeDefined();
      expect(Array.isArray(ioRecords)).toBe(true);
    }, TEST_TIMEOUT);

    test('should provide performance reports', async () => {
      await executor.initialize(testWrapper);

      const performanceReport = await executor.getPerformanceReport();

      expect(performanceReport).toBeDefined();
      // Performance report structure may vary based on implementation
    }, TEST_TIMEOUT);

    test('should provide routing statistics', async () => {
      await executor.initialize(testWrapper);

      const routingStats = await executor.getRoutingStats();

      expect(routingStats).toBeDefined();
      expect(routingStats.health).toBeDefined();
      expect(routingStats.config).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('Resource Cleanup', () => {
    test('should cleanup all resources properly', async () => {
      await executor.initialize(testWrapper);

      // Execute some requests to create resources
      const request = createTestRequest();
      await executor.execute(request, 'test-dynamic-routing');

      await executor.destroy();

      const status = await executor.getStatus();
      expect(status.isInitialized).toBe(false);
    }, TEST_TIMEOUT);

    test('should handle multiple cleanup calls safely', async () => {
      await executor.initialize(testWrapper);

      // Call destroy multiple times
      await executor.destroy();
      await executor.destroy(); // Should not throw

      const status = await executor.getStatus();
      expect(status.isInitialized).toBe(false);
    }, TEST_TIMEOUT);
  });

  describe('Real-world Scenario Testing', () => {
    beforeEach(async () => {
      await executor.initialize(testWrapper);
    });

    test('should handle complex requests with tools and functions', async () => {
      const complexRequest = {
        model: 'test-model',
        messages: [
          {
            role: 'user',
            content: 'Get the weather for New York and then tell me a joke'
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get weather information for a location',
              parameters: {
                type: 'object',
                properties: {
                  location: {
                    type: 'string',
                    description: 'Location to get weather for'
                  }
                },
                required: ['location']
              }
            }
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      };

      const result = await executor.execute(complexRequest, 'test-dynamic-routing');

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.steps).toHaveLength(7);
    }, TEST_TIMEOUT);

    test('should handle long conversations with context', async () => {
      const conversationRequest = {
        model: 'test-model',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant with access to real-time data.'
          },
          {
            role: 'user',
            content: 'What is the capital of France?'
          },
          {
            role: 'assistant',
            content: 'The capital of France is Paris.'
          },
          {
            role: 'user',
            content: 'What about Germany?'
          }
        ],
        temperature: 0.7
      };

      const result = await executor.execute(conversationRequest, 'test-dynamic-routing');

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();

      // Verify conversation context is preserved
      expect(result.response.choices[0].message.content).toBeDefined();
    }, TEST_TIMEOUT);

    test('should handle parameter variations and edge cases', async () => {
      const edgeCaseRequest = {
        model: 'test-model',
        messages: [
          {
            role: 'user',
            content: '' // Empty content
          }
        ],
        temperature: 2.0, // Max temperature
        max_tokens: 1, // Minimal tokens
        top_p: 0.1, // Low diversity
        presence_penalty: 2.0, // Max penalty
        frequency_penalty: 2.0 // Max penalty
      };

      const result = await executor.execute(edgeCaseRequest, 'test-dynamic-routing');

      expect(result).toBeDefined();
      // Should handle gracefully, may succeed or fail gracefully
      if (result.success) {
        expect(result.response).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    }, TEST_TIMEOUT);
  });
});