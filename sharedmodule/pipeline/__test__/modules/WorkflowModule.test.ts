/**
 * Workflow Module Unit Tests
 *
 * Tests the Workflow module implementation for streaming/non-streaming conversion functionality
 */

import { WorkflowModule } from '../../src/modules/WorkflowModule';
import { PipelineExecutionContext } from '../../src/interfaces/ModularInterfaces';
import { createTestPipelineWrapper, createTestRequest, createStreamingTestRequest, TEST_TIMEOUT } from '../setup';

describe('WorkflowModule', () => {
  let workflow: WorkflowModule;
  let testContext: PipelineExecutionContext;

  beforeEach(() => {
    const config = createTestPipelineWrapper().modules.find(m => m.type === 'workflow')!;
    workflow = new WorkflowModule(config);

    testContext = {
      sessionId: 'test-session',
      requestId: 'test-request',
      virtualModelId: 'test-virtual-model',
      providerId: 'test-provider',
      startTime: Date.now(),
      ioRecords: [],
      metadata: {}
    };
  });

  afterEach(async () => {
    if (workflow) {
      await workflow.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid config', async () => {
      await expect(workflow.initialize()).resolves.not.toThrow();

      const status = await workflow.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.isRunning).toBe(true);
    });

    test('should have correct module properties', () => {
      expect(workflow.moduleId).toBe('test-workflow');
      expect(workflow.moduleName).toBe('Test Workflow');
      expect(workflow.moduleVersion).toBe('1.0.0');
    });

    test('should initialize with streaming configuration', async () => {
      await workflow.initialize();

      const streamingConfig = workflow.getStreamingConfig('test-provider');
      expect(streamingConfig).toBeDefined();
      expect(streamingConfig!.chunkSize).toBe(1000);
      expect(streamingConfig!.maxRetries).toBe(3);
      expect(streamingConfig!.timeout).toBe(30000);
    });
  });

  describe('Streaming Detection', () => {
    beforeEach(async () => {
      await workflow.initialize();
    });

    test('should detect streaming request correctly', async () => {
      const streamingRequest = createStreamingTestRequest();
      const context = await workflow.convertStreamingToNonStreaming(streamingRequest, testContext);

      expect(context.isStreaming).toBe(true);
      expect(context.originalRequest).toEqual(streamingRequest);
      expect(context.streamingConfig).toBeDefined();
    }, TEST_TIMEOUT);

    test('should detect non-streaming request correctly', async () => {
      const nonStreamingRequest = createTestRequest();
      const context = await workflow.convertNonStreamingToStreaming(nonStreamingRequest, testContext);

      expect(context.isStreaming).toBe(false);
      expect(context.originalRequest).toEqual(nonStreamingRequest);
    }, TEST_TIMEOUT);

    test('should check streaming support for providers', async () => {
      expect(await workflow.supportsStreaming('test-provider')).toBe(true);
      expect(await workflow.supportsStreaming('unsupported-provider')).toBe(false);
    }, TEST_TIMEOUT);
  });

  describe('Streaming to Non-Streaming Conversion', () => {
    beforeEach(async () => {
      await workflow.initialize();
    });

    test('should convert streaming request to non-streaming format', async () => {
      const streamingRequest = {
        model: 'test-model',
        messages: [
          {
            role: 'user',
            content: 'This is a streaming request'
          }
        ],
        stream: true,
        temperature: 0.7
      };

      const converted = await workflow.convertStreamingToNonStreaming(streamingRequest, testContext);

      expect(converted).toBeDefined();
      expect(converted.model).toBe('test-model');
      expect(converted.messages).toHaveLength(1);
      expect(converted.messages[0].content).toBe('This is a streaming request');
      expect(converted.temperature).toBe(0.7);
      // Should not contain stream: true
      expect(converted.stream).toBeUndefined();
    }, TEST_TIMEOUT);

    test('should handle streaming request with tool calls', async () => {
      const streamingRequest = {
        model: 'test-model',
        messages: [
          {
            role: 'user',
            content: 'Call the weather function'
          }
        ],
        stream: true,
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

      const converted = await workflow.convertStreamingToNonStreaming(streamingRequest, testContext);

      expect(converted).toBeDefined();
      expect(converted.tools).toBeDefined();
      expect(converted.tools).toHaveLength(1);
      expect(converted.tools[0].function.name).toBe('get_weather');
      expect(converted.stream).toBeUndefined();
    }, TEST_TIMEOUT);

    test('should handle invalid streaming request', async () => {
      const invalidRequest = null;

      await expect(
        workflow.convertStreamingToNonStreaming(invalidRequest as any, testContext)
      ).rejects.toThrow('Invalid streaming request');
    }, TEST_TIMEOUT);
  });

  describe('Non-Streaming to Streaming Conversion', () => {
    beforeEach(async () => {
      await workflow.initialize();
    });

    test('should convert non-streaming response to streaming format', async () => {
      const nonStreamingResponse = {
        id: 'resp_123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a non-streaming response'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18
        }
      };

      const streamingChunks: any[] = [];
      const streamingGenerator = workflow.convertNonStreamingToStreaming(nonStreamingResponse, testContext);

      for await (const chunk of streamingGenerator) {
        streamingChunks.push(chunk);
      }

      expect(streamingChunks.length).toBeGreaterThan(0);
      expect(streamingChunks[0].object).toBe('chat.completion.chunk');
      expect(streamingChunks[0].choices[0].delta.content).toBeDefined();

      // Last chunk should have finish_reason
      const lastChunk = streamingChunks[streamingChunks.length - 1];
      expect(lastChunk.choices[0].finish_reason).toBe('stop');
    }, TEST_TIMEOUT);

    test('should handle streaming conversion for tool calls', async () => {
      const nonStreamingResponse = {
        id: 'resp_123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'test-model',
        choices: [
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
            },
            finish_reason: 'tool_calls'
          }
        ]
      };

      const streamingChunks: any[] = [];
      const streamingGenerator = workflow.convertNonStreamingToStreaming(nonStreamingResponse, testContext);

      for await (const chunk of streamingGenerator) {
        streamingChunks.push(chunk);
      }

      expect(streamingChunks.length).toBeGreaterThan(0);

      // Find tool call chunk
      const toolCallChunk = streamingChunks.find(chunk =>
        chunk.choices[0].delta.tool_calls
      );
      expect(toolCallChunk).toBeDefined();
      expect(toolCallChunk.choices[0].delta.tool_calls[0].function.name).toBe('get_weather');
    }, TEST_TIMEOUT);

    test('should handle invalid non-streaming response', async () => {
      const invalidResponse = null;

      await expect(
        workflow.convertNonStreamingToStreaming(invalidResponse as any, testContext).next()
      ).rejects.toThrow('Invalid non-streaming response');
    }, TEST_TIMEOUT);
  });

  describe('Streaming Context Management', () => {
    beforeEach(async () => {
      await workflow.initialize();
    });

    test('should create and manage streaming context properly', async () => {
      const streamingRequest = createStreamingTestRequest();
      const context = await workflow.convertStreamingToNonStreaming(streamingRequest, testContext);

      expect(context).toBeDefined();
      expect(context.isStreaming).toBe(true);
      expect(context.originalRequest).toEqual(streamingRequest);
      expect(context.streamingConfig).toBeDefined();
      expect(context.streamingConfig!.chunkSize).toBe(1000);
      expect(context.streamingConfig!.maxRetries).toBe(3);
      expect(context.streamingConfig!.timeout).toBe(30000);
    }, TEST_TIMEOUT);

    test('should handle context creation for non-streaming requests', async () => {
      const nonStreamingRequest = createTestRequest();
      const context = await workflow.convertNonStreamingToStreaming(nonStreamingRequest, testContext);

      expect(context).toBeDefined();
      expect(context.isStreaming).toBe(false);
      expect(context.originalRequest).toEqual(nonStreamingRequest);
    }, TEST_TIMEOUT);
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await workflow.initialize();
    });

    test('should handle conversion errors gracefully', async () => {
      const malformedRequest = {
        model: 'test-model',
        // Missing required messages field
        stream: true
      };

      await expect(
        workflow.convertStreamingToNonStreaming(malformedRequest, testContext)
      ).rejects.toThrow();
    }, TEST_TIMEOUT);

    test('should handle streaming generator errors', async () => {
      const malformedResponse = {
        id: 'resp_123',
        // Missing required object field
        choices: []
      };

      const streamingGenerator = workflow.convertNonStreamingToStreaming(malformedResponse as any, testContext);

      await expect(streamingGenerator.next()).rejects.toThrow();
    }, TEST_TIMEOUT);
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await workflow.initialize();
    });

    test('should perform streaming conversion efficiently', async () => {
      const streamingRequest = createStreamingTestRequest();
      const iterations = 100;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await workflow.convertStreamingToNonStreaming(streamingRequest, testContext);
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(5); // Should be less than 5ms per conversion
      console.log(`Average streaming conversion time: ${averageTime.toFixed(2)}ms`);
    }, TEST_TIMEOUT);

    test('should handle streaming performance under load', async () => {
      const nonStreamingResponse = {
        id: 'resp_123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a performance test response'
            },
            finish_reason: 'stop'
          }
        ]
      };

      const iterations = 50;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const streamingGenerator = workflow.convertNonStreamingToStreaming(nonStreamingResponse, testContext);
        for await (const chunk of streamingGenerator) {
          // Consume all chunks
        }
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(20); // Should be less than 20ms per conversion
      console.log(`Average non-streaming to streaming conversion time: ${averageTime.toFixed(2)}ms`);
    }, TEST_TIMEOUT);
  });

  describe('Status and Cleanup', () => {
    test('should provide correct status information', async () => {
      await workflow.initialize();

      const status = await workflow.getStatus();

      expect(status.isInitialized).toBe(true);
      expect(status.isRunning).toBe(true);
      expect(status.statistics.requestsProcessed).toBe(0);
      expect(status.statistics.averageResponseTime).toBe(0);
      expect(status.statistics.errorRate).toBe(0);
    });

    test('should cleanup resources properly', async () => {
      await workflow.initialize();

      await workflow.destroy();

      const status = await workflow.getStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.isRunning).toBe(false);
    });
  });
});