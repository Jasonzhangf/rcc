/**
 * Compatibility Module Unit Tests
 *
 * Tests the Compatibility module implementation for field mapping functionality
 */

import { CompatibilityModule } from '../../src/modules/CompatibilityModule';
import { PipelineExecutionContext } from '../../src/interfaces/ModularInterfaces';
import { createTestPipelineWrapper, createTestRequest, TEST_TIMEOUT } from '../setup';

describe('CompatibilityModule', () => {
  let compatibility: CompatibilityModule;
  let testContext: PipelineExecutionContext;

  beforeEach(() => {
    const config = createTestPipelineWrapper().modules.find(m => m.type === 'compatibility')!;
    compatibility = new CompatibilityModule(config);

    testContext = {
      sessionId: 'test-session',
      requestId: 'test-request',
      routingId: 'test-dynamic-routing',
      providerId: 'test-provider',
      startTime: Date.now(),
      ioRecords: [],
      metadata: {}
    };
  });

  afterEach(async () => {
    if (compatibility) {
      await compatibility.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid config', async () => {
      await expect(compatibility.initialize()).resolves.not.toThrow();

      const status = await compatibility.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.isRunning).toBe(true);
    });

    test('should have correct module properties', () => {
      expect(compatibility.moduleId).toBe('test-compatibility');
      expect(compatibility.moduleName).toBe('Test Compatibility');
      expect(compatibility.moduleVersion).toBe('1.0.0');
    });
  });

  describe('Request Field Mapping', () => {
    beforeEach(async () => {
      await compatibility.initialize();
    });

    test('should map OpenAI request fields to provider format', async () => {
      const openaiRequest = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Hello, how are you?'
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      };

      const mappedRequest = await compatibility.mapRequest(openaiRequest, 'test-provider', testContext);

      expect(mappedRequest).toBeDefined();
      expect(mappedRequest.model_name).toBe('gpt-3.5-turbo'); // model -> model_name
      expect(mappedRequest.inputs).toBeDefined(); // messages -> inputs
      expect(mappedRequest.inputs).toHaveLength(1);
      expect(mappedRequest.inputs[0].content).toBe('Hello, how are you?');
      expect(mappedRequest.temperature).toBe(0.7);
      expect(mappedRequest.max_tokens).toBeUndefined(); // Should be mapped to provider-specific format
    }, TEST_TIMEOUT);

    test('should handle complex request with multiple messages', async () => {
      const complexRequest = {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'What is the weather like?'
          },
          {
            role: 'assistant',
            content: 'I cannot check the weather as I do not have access to real-time data.'
          },
          {
            role: 'user',
            content: 'Then tell me a joke.'
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      };

      const mappedRequest = await compatibility.mapRequest(complexRequest, 'test-provider', testContext);

      expect(mappedRequest).toBeDefined();
      expect(mappedRequest.model_name).toBe('gpt-4');
      expect(mappedRequest.inputs).toBeDefined();
      expect(mappedRequest.inputs).toHaveLength(4);
      expect(mappedRequest.temperature).toBe(0.8);
      expect(mappedRequest.max_tokens).toBeUndefined(); // Mapped away
    }, TEST_TIMEOUT);

    test('should handle request with tool calls', async () => {
      const requestWithTools = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Get the weather for New York'
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get weather information',
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
        ]
      };

      const mappedRequest = await compatibility.mapRequest(requestWithTools, 'test-provider', testContext);

      expect(mappedRequest).toBeDefined();
      expect(mappedRequest.model_name).toBe('gpt-3.5-turbo');
      expect(mappedRequest.inputs).toBeDefined();
      expect(mappedRequest.tools).toBeDefined(); // Tools should be preserved or mapped
    }, TEST_TIMEOUT);

    test('should handle invalid request format', async () => {
      const invalidRequest = null;

      await expect(
        compatibility.mapRequest(invalidRequest as any, 'test-provider', testContext)
      ).rejects.toThrow('Invalid request format');
    }, TEST_TIMEOUT);
  });

  describe('Response Field Mapping', () => {
    beforeEach(async () => {
      await compatibility.initialize();
    });

    test('should map provider response fields to OpenAI format', async () => {
      const providerResponse = {
        id: 'resp_123',
        model: 'test-model',
        outputs: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'I am doing well, thank you!'
            }
          }
        ],
        token_usage: {
          input: 15,
          output: 12,
          total: 27
        }
      };

      const mappedResponse = await compatibility.mapResponse(providerResponse, 'test-provider', testContext);

      expect(mappedResponse).toBeDefined();
      expect(mappedResponse.id).toBe('resp_123');
      expect(mappedResponse.object).toBe('chat.completion');
      expect(mappedResponse.choices).toBeDefined();
      expect(mappedResponse.choices).toHaveLength(1);
      expect(mappedResponse.choices[0].message.content).toBe('I am doing well, thank you!');
      expect(mappedResponse.usage).toBeDefined();
      expect(mappedResponse.usage.prompt_tokens).toBe(15);
      expect(mappedResponse.usage.completion_tokens).toBe(12);
      expect(mappedResponse.usage.total_tokens).toBe(27);
    }, TEST_TIMEOUT);

    test('should handle response with multiple choices', async () => {
      const multiChoiceResponse = {
        id: 'resp_123',
        model: 'test-model',
        outputs: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'First response'
            }
          },
          {
            index: 1,
            message: {
              role: 'assistant',
              content: 'Alternative response'
            }
          }
        ],
        token_usage: {
          input: 20,
          output: 25,
          total: 45
        }
      };

      const mappedResponse = await compatibility.mapResponse(multiChoiceResponse, 'test-provider', testContext);

      expect(mappedResponse).toBeDefined();
      expect(mappedResponse.choices).toHaveLength(2);
      expect(mappedResponse.choices[0].message.content).toBe('First response');
      expect(mappedResponse.choices[1].message.content).toBe('Alternative response');
    }, TEST_TIMEOUT);

    test('should handle response with tool calls', async () => {
      const responseWithTools = {
        id: 'resp_123',
        model: 'test-model',
        outputs: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Let me check the weather',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location": "New York"}'
                  }
                }
              ]
            }
          }
        ],
        token_usage: {
          input: 25,
          output: 18,
          total: 43
        }
      };

      const mappedResponse = await compatibility.mapResponse(responseWithTools, 'test-provider', testContext);

      expect(mappedResponse).toBeDefined();
      expect(mappedResponse.choices[0].message.tool_calls).toBeDefined();
      expect(mappedResponse.choices[0].message.tool_calls).toHaveLength(1);
      expect(mappedResponse.choices[0].message.tool_calls[0].function.name).toBe('get_weather');
    }, TEST_TIMEOUT);

    test('should handle invalid response format', async () => {
      const invalidResponse = null;

      await expect(
        compatibility.mapResponse(invalidResponse as any, 'test-provider', testContext)
      ).rejects.toThrow('Invalid response format');
    }, TEST_TIMEOUT);
  });

  describe('Field Mappings Configuration', () => {
    beforeEach(async () => {
      await compatibility.initialize();
    });

    test('should return field mappings for known provider', () => {
      const mappings = compatibility.getFieldMappings('test-provider');

      expect(mappings).toBeDefined();
      expect(mappings.length).toBeGreaterThan(0);

      const messageMapping = mappings.find(m => m.sourceField === 'messages');
      expect(messageMapping).toBeDefined();
      expect(messageMapping!.targetField).toBe('inputs');
      expect(messageMapping!.type).toBe('direct');

      const modelMapping = mappings.find(m => m.sourceField === 'model');
      expect(modelMapping).toBeDefined();
      expect(modelMapping!.targetField).toBe('model_name');
    });

    test('should return empty array for unknown provider', () => {
      const mappings = compatibility.getFieldMappings('unknown-provider');

      expect(mappings).toBeDefined();
      expect(mappings).toHaveLength(0);
    });
  });

  describe('Compatibility Configuration', () => {
    beforeEach(async () => {
      await compatibility.initialize();
    });

    test('should return compatibility config for known provider', () => {
      const config = compatibility.getCompatibilityConfig('test-provider');

      expect(config).toBeDefined();
      expect(config.supportsStreaming).toBe(true);
      expect(config.supportedModels).toContain('test-model');
      expect(config.specialHandling).toBeDefined();
    });

    test('should return default config for unknown provider', () => {
      const config = compatibility.getCompatibilityConfig('unknown-provider');

      expect(config).toBeDefined();
      expect(config.supportsStreaming).toBe(false);
      expect(config.supportedModels).toHaveLength(0);
      expect(config.specialHandling).toEqual({});
    });
  });

  describe('Passthrough Mode', () => {
    beforeEach(async () => {
      await compatibility.initialize();
    });

    test('should pass through requests for fully compatible providers', async () => {
      const request = createTestRequest();
      const passthroughRequest = await compatibility.mapRequest(request, 'openai-compatible', testContext);

      expect(passthroughRequest).toEqual(request); // Should be unchanged
    }, TEST_TIMEOUT);

    test('should pass through responses for fully compatible providers', async () => {
      const response = {
        id: 'resp_123',
        object: 'chat.completion',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Passthrough response'
            }
          }
        ]
      };

      const passthroughResponse = await compatibility.mapResponse(response, 'openai-compatible', testContext);

      expect(passthroughResponse).toEqual(response); // Should be unchanged
    }, TEST_TIMEOUT);
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await compatibility.initialize();
    });

    test('should handle mapping errors gracefully', async () => {
      const malformedRequest = {
        model: 'test-model',
        messages: 'invalid' // Should be an array
      };

      await expect(
        compatibility.mapRequest(malformedRequest as any, 'test-provider', testContext)
      ).rejects.toThrow();
    }, TEST_TIMEOUT);

    test('should handle missing required fields', async () => {
      const incompleteRequest = {
        // Missing model field
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ]
      };

      const mapped = await compatibility.mapRequest(incompleteRequest as any, 'test-provider', testContext);
      expect(mapped).toBeDefined(); // Should still work with defaults
    }, TEST_TIMEOUT);
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await compatibility.initialize();
    });

    test('should perform field mapping efficiently', async () => {
      const request = createTestRequest();
      const iterations = 100;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await compatibility.mapRequest(request, 'test-provider', testContext);
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(5); // Should be less than 5ms per mapping
      console.log(`Average request mapping time: ${averageTime.toFixed(2)}ms`);
    }, TEST_TIMEOUT);

    test('should perform response mapping efficiently', async () => {
      const response = {
        id: 'resp_123',
        model: 'test-model',
        outputs: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Performance test response'
            }
          }
        ],
        token_usage: {
          input: 10,
          output: 8,
          total: 18
        }
      };

      const iterations = 100;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await compatibility.mapResponse(response, 'test-provider', testContext);
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(5); // Should be less than 5ms per mapping
      console.log(`Average response mapping time: ${averageTime.toFixed(2)}ms`);
    }, TEST_TIMEOUT);
  });

  describe('Status and Cleanup', () => {
    test('should provide correct status information', async () => {
      await compatibility.initialize();

      const status = await compatibility.getStatus();

      expect(status.isInitialized).toBe(true);
      expect(status.isRunning).toBe(true);
      expect(status.statistics.requestsProcessed).toBe(0);
      expect(status.statistics.averageResponseTime).toBe(0);
      expect(status.statistics.errorRate).toBe(0);
    });

    test('should cleanup resources properly', async () => {
      await compatibility.initialize();

      await compatibility.destroy();

      const status = await compatibility.getStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.isRunning).toBe(false);
    });
  });
});