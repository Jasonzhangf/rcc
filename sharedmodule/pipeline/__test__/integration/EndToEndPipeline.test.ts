/**
 * End-to-End Pipeline Integration Tests
 *
 * Tests the complete pipeline system from wrapper generation to final response
 */

import { ModuleFactory } from '../../src/core/ModuleFactory';
import { ConfigurationValidator } from '../../src/core/ConfigurationValidator';
import { ModularPipelineExecutor } from '../../src/core/ModularPipelineExecutor';
import { createTestPipelineWrapper, createTestRequest, createStreamingTestRequest, TEST_TIMEOUT } from '../setup';

describe('End-to-End Pipeline Integration Tests', () => {
  let moduleFactory: ModuleFactory;
  let validator: ConfigurationValidator;
  let executor: ModularPipelineExecutor;

  beforeEach(() => {
    moduleFactory = new ModuleFactory();
    validator = new ConfigurationValidator();
    executor = new ModularPipelineExecutor(moduleFactory, validator);
  });

  afterEach(async () => {
    if (executor) {
      await executor.destroy();
    }
  });

  describe('Complete System Integration', () => {
    test('should initialize complete pipeline system successfully', async () => {
      const testWrapper = createTestPipelineWrapper();

      await expect(executor.initialize(testWrapper)).resolves.not.toThrow();

      const status = await executor.getStatus();
      expect(status.isInitialized).toBe(true);

      // Verify all modules are initialized
      expect(status.modules.llmswitch.status).toBeDefined();
      expect(status.modules.workflow.status).toBeDefined();
      expect(status.modules.compatibility.status).toBeDefined();
      expect(status.modules.provider.status).toBeDefined();
    }, TEST_TIMEOUT);

    test('should process complete request lifecycle', async () => {
      const testWrapper = createTestPipelineWrapper();
      await executor.initialize(testWrapper);

      const request = createTestRequest();
      const virtualModelId = 'test-virtual-model';

      const result = await executor.execute(request, virtualModelId);

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.steps).toHaveLength(7);

      // Verify response structure matches OpenAI format
      expect(result.response.id).toBeDefined();
      expect(result.response.object).toBe('chat.completion');
      expect(result.response.choices).toBeDefined();
      expect(result.response.choices.length).toBeGreaterThan(0);
      expect(result.response.choices[0].message).toBeDefined();
      expect(result.response.choices[0].message.role).toBe('assistant');
      expect(result.response.choices[0].message.content).toBeDefined();
    }, TEST_TIMEOUT);

    test('should handle streaming request lifecycle', async () => {
      const testWrapper = createTestPipelineWrapper();
      await executor.initialize(testWrapper);

      const request = createStreamingTestRequest();
      const virtualModelId = 'test-virtual-model';

      const streamingSteps: any[] = [];
      const streamingGenerator = executor.executeStreaming(request, virtualModelId);

      for await (const step of streamingGenerator) {
        streamingSteps.push(step);
      }

      expect(streamingSteps.length).toBeGreaterThan(0);
      expect(streamingSteps[0].moduleId).toBeDefined();
      expect(streamingSteps[0].stepType).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('Virtual Model Routing', () => {
    test('should route requests to correct virtual model', async () => {
      const testWrapper = {
        ...createTestPipelineWrapper(),
        virtualModels: [
          {
            id: 'model-a',
            name: 'Model A',
            description: 'Test model A',
            targets: [
              {
                providerId: 'test-provider',
                weight: 1,
                fallback: false
              }
            ],
            capabilities: ['chat'],
            tags: ['test']
          },
          {
            id: 'model-b',
            name: 'Model B',
            description: 'Test model B',
            targets: [
              {
                providerId: 'test-provider',
                weight: 1,
                fallback: false
              }
            ],
            capabilities: ['chat', 'streaming'],
            tags: ['test']
          }
        ]
      };

      await executor.initialize(testWrapper);

      const request = createTestRequest();

      // Test routing to model A
      const resultA = await executor.execute(request, 'model-a');
      expect(resultA.success).toBe(true);
      expect(resultA.context.virtualModelId).toBe('model-a');

      // Test routing to model B
      const resultB = await executor.execute(request, 'model-b');
      expect(resultB.success).toBe(true);
      expect(resultB.context.virtualModelId).toBe('model-b');
    }, TEST_TIMEOUT);

    test('should handle invalid virtual model routing', async () => {
      const testWrapper = createTestPipelineWrapper();
      await executor.initialize(testWrapper);

      const request = createTestRequest();

      const result = await executor.execute(request, 'non-existent-model');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('未找到虚拟模型');
    }, TEST_TIMEOUT);
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from module initialization failures', async () => {
      const testWrapper = {
        ...createTestPipelineWrapper(),
        modules: [
          ...createTestPipelineWrapper().modules,
          {
            id: 'broken-module',
            name: 'Broken Module',
            type: 'invalid-type',
            version: '1.0.0',
            config: {},
            enabled: true
          }
        ]
      };

      // Should fail initialization due to invalid module type
      await expect(executor.initialize(testWrapper)).rejects.toThrow();
    }, TEST_TIMEOUT);

    test('should handle partial pipeline failures gracefully', async () => {
      const testWrapper = createTestPipelineWrapper();
      await executor.initialize(testWrapper);

      // Create a request that might cause issues
      const problematicRequest = {
        model: 'test-model',
        messages: [
          {
            role: 'user',
            content: 'Test request with potential issues'
          }
        ],
        // Add parameters that might cause conversion issues
        invalid_param: 'this_should_be_ignored'
      };

      const result = await executor.execute(problematicRequest, 'test-virtual-model');

      // Should either succeed gracefully or fail with clear error
      expect(result).toBeDefined();
      if (result.success) {
        expect(result.response).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
        expect(result.steps.length).toBeGreaterThan(0);
      }
    }, TEST_TIMEOUT);
  });

  describe('Performance Under Load', () => {
    test('should handle high request volume efficiently', async () => {
      const testWrapper = createTestPipelineWrapper();
      await executor.initialize(testWrapper);

      const request = createTestRequest();
      const virtualModelId = 'test-virtual-model';
      const requestCount = 20;

      const startTime = Date.now();
      const results: any[] = [];

      // Execute requests in sequence
      for (let i = 0; i < requestCount; i++) {
        const result = await executor.execute(request, virtualModelId);
        results.push(result);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / requestCount;

      expect(results).toHaveLength(requestCount);
      expect(results.every(r => r.success)).toBe(true);
      expect(averageTime).toBeLessThan(1000); // Should be less than 1 second per request

      console.log(`Sequential processing: ${requestCount} requests in ${totalTime}ms (avg: ${averageTime.toFixed(2)}ms)`);
    }, TEST_TIMEOUT * 3);

    test('should handle concurrent request processing', async () => {
      const testWrapper = createTestPipelineWrapper();
      await executor.initialize(testWrapper);

      const request = createTestRequest();
      const virtualModelId = 'test-virtual-model';
      const concurrency = 10;

      const startTime = Date.now();

      // Execute requests concurrently
      const promises = Array(concurrency).fill(null).map(() =>
        executor.execute(request, virtualModelId)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrency;

      expect(results).toHaveLength(concurrency);
      expect(results.every(r => r.success)).toBe(true);
      expect(averageTime).toBeLessThan(1200); // Should be less than 1.2 seconds per concurrent request

      console.log(`Concurrent processing: ${concurrency} requests in ${totalTime}ms (avg: ${averageTime.toFixed(2)}ms)`);
    }, TEST_TIMEOUT * 3);
  });

  describe('Data Integrity and Consistency', () => {
    test('should maintain data consistency across pipeline stages', async () => {
      const testWrapper = createTestPipelineWrapper();
      await executor.initialize(testWrapper);

      const originalRequest = createTestRequest();
      const virtualModelId = 'test-virtual-model';

      const result = await executor.execute(originalRequest, virtualModelId);

      expect(result.success).toBe(true);

      // Verify that the original request data is preserved in context
      expect(result.context.metadata).toBeDefined();

      // Verify that response data is properly structured
      expect(result.response.id).toBeDefined();
      expect(result.response.model).toBe(originalRequest.model);
      expect(result.response.choices[0].message.content).toBeDefined();
    }, TEST_TIMEOUT);

    test('should handle complex nested data structures', async () => {
      const testWrapper = createTestPipelineWrapper();
      await executor.initialize(testWrapper);

      const complexRequest = {
        model: 'test-model',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant with access to various tools.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please help me with the following:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: 'https://example.com/image.jpg'
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_image',
              description: 'Analyze image content',
              parameters: {
                type: 'object',
                properties: {
                  image_url: {
                    type: 'string',
                    description: 'URL of the image to analyze'
                  }
                },
                required: ['image_url']
              }
            }
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      };

      const result = await executor.execute(complexRequest, 'test-virtual-model');

      expect(result).toBeDefined();
      if (result.success) {
        expect(result.response).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    }, TEST_TIMEOUT);
  });

  describe('System Resource Management', () => {
    test('should manage memory efficiently with multiple requests', async () => {
      const testWrapper = createTestPipelineWrapper();
      await executor.initialize(testWrapper);

      const request = createTestRequest();
      const virtualModelId = 'test-virtual-model';
      const iterations = 50;

      // Execute multiple requests to test memory management
      for (let i = 0; i < iterations; i++) {
        const result = await executor.execute(request, virtualModelId);
        expect(result.success).toBe(true);
      }

      // Check system status after multiple requests
      const status = await executor.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.modules.llmswitch.status).toBe('running');
    }, TEST_TIMEOUT * 2);

    test('should cleanup resources properly after failures', async () => {
      const testWrapper = createTestPipelineWrapper();
      await executor.initialize(testWrapper);

      // Execute a request that will fail
      const invalidRequest = {
        model: 'test-model',
        // Missing required messages
        invalid_field: 'test'
      };

      const result = await executor.execute(invalidRequest, 'test-virtual-model');
      expect(result.success).toBe(false);

      // System should still be operational after failure
      const status = await executor.getStatus();
      expect(status.isInitialized).toBe(true);

      // Should be able to execute subsequent requests
      const validRequest = createTestRequest();
      const secondResult = await executor.execute(validRequest, 'test-virtual-model');
      expect(secondResult.success).toBe(true);
    }, TEST_TIMEOUT);
  });

  describe('Configuration Flexibility', () => {
    test('should work with different module configurations', async () => {
      const customWrapper = {
        ...createTestPipelineWrapper(),
        modules: createTestPipelineWrapper().modules.map(module => ({
          ...module,
          config: {
            ...module.config,
            custom_param: 'custom_value'
          }
        }))
      };

      await expect(executor.initialize(customWrapper)).resolves.not.toThrow();

      const request = createTestRequest();
      const result = await executor.execute(request, 'test-virtual-model');

      expect(result.success).toBe(true);
    }, TEST_TIMEOUT);

    test('should handle missing optional configuration parameters', async () => {
      const minimalWrapper = {
        virtualModels: [
          {
            id: 'minimal-model',
            name: 'Minimal Model',
            targets: [
              {
                providerId: 'test-provider',
                weight: 1
              }
            ],
            capabilities: ['chat']
          }
        ],
        modules: createTestPipelineWrapper().modules.map(module => ({
          id: module.id,
          name: module.name,
          type: module.type,
          version: module.version,
          config: {}, // Minimal config
          enabled: true
        })),
        routing: {
          strategy: 'round-robin',
          fallbackStrategy: 'random'
        },
        metadata: {
          version: '1.0.0'
        }
      };

      await expect(executor.initialize(minimalWrapper)).resolves.not.toThrow();

      const request = createTestRequest();
      const result = await executor.execute(request, 'minimal-model');

      expect(result).toBeDefined();
    }, TEST_TIMEOUT);
  });
});