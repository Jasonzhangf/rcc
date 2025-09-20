/**
 * LLMSwitch Module Unit Tests
 *
 * Tests the LLMSwitch module implementation for protocol conversion functionality
 */

import { LLMSwitchModule } from '../../src/modules/LLMSwitchModule';
import { ProtocolType, PipelineExecutionContext } from '../../src/interfaces/ModularInterfaces';
import { createTestPipelineWrapper, createTestRequest, TEST_TIMEOUT } from '../setup';

describe('LLMSwitchModule', () => {
  let llmswitch: LLMSwitchModule;
  let testContext: PipelineExecutionContext;

  beforeEach(() => {
    const config = createTestPipelineWrapper().modules.find(m => m.type === 'llmswitch')!;
    llmswitch = new LLMSwitchModule(config);

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
    if (llmswitch) {
      await llmswitch.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid config', async () => {
      await expect(llmswitch.initialize()).resolves.not.toThrow();

      const status = await llmswitch.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.isRunning).toBe(true);
    });

    test('should have correct module properties', () => {
      expect(llmswitch.moduleId).toBe('test-llmswitch');
      expect(llmswitch.moduleName).toBe('Test LLMSwitch');
      expect(llmswitch.moduleVersion).toBe('1.0.0');
    });
  });

  describe('Protocol Conversion - Anthropic to OpenAI', () => {
    beforeEach(async () => {
      await llmswitch.initialize();
    });

    test('should convert Anthropic request to OpenAI format', async () => {
      const anthropicRequest = {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Hello, how are you?'
              }
            ]
          }
        ]
      };

      const converted = await llmswitch.convertRequest(
        anthropicRequest,
        ProtocolType.ANTHROPIC,
        ProtocolType.OPENAI,
        testContext
      );

      expect(converted).toBeDefined();
      expect(converted.model).toBe('claude-3-sonnet-20240229');
      expect(converted.messages).toHaveLength(1);
      expect(converted.messages[0].role).toBe('user');
      expect(converted.messages[0].content).toBe('Hello, how are you?');
      expect(converted.max_tokens).toBe(1000);
    }, TEST_TIMEOUT);

    test('should convert OpenAI response to Anthropic format', async () => {
      const openaiResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'claude-3-sonnet-20240229',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'I am doing well, thank you for asking!'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 12,
          total_tokens: 27
        }
      };

      const converted = await llmswitch.convertResponse(
        openaiResponse,
        ProtocolType.OPENAI,
        ProtocolType.ANTHROPIC,
        testContext
      );

      expect(converted).toBeDefined();
      expect(converted.id).toBe('chatcmpl-123');
      expect(converted.type).toBe('message');
      expect(converted.role).toBe('assistant');
      expect(converted.content).toHaveLength(1);
      expect(converted.content[0].type).toBe('text');
      expect(converted.content[0].text).toBe('I am doing well, thank you for asking!');
    }, TEST_TIMEOUT);

    test('should handle tool calls in OpenAI to Anthropic conversion', async () => {
      const openaiResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'claude-3-sonnet-20240229',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Let me check the weather for you.',
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
        ],
        usage: {
          prompt_tokens: 25,
          completion_tokens: 18,
          total_tokens: 43
        }
      };

      const converted = await llmswitch.convertResponse(
        openaiResponse,
        ProtocolType.OPENAI,
        ProtocolType.ANTHROPIC,
        testContext
      );

      expect(converted).toBeDefined();
      expect(converted.content).toHaveLength(2);
      expect(converted.content[0].type).toBe('text');
      expect(converted.content[0].text).toBe('Let me check the weather for you.');
      expect(converted.content[1].type).toBe('tool_use');
      expect(converted.content[1].name).toBe('get_weather');
      expect(converted.content[1].input).toEqual({ location: 'New York' });
    }, TEST_TIMEOUT);
  });

  describe('Protocol Conversion - OpenAI to Anthropic', () => {
    beforeEach(async () => {
      await llmswitch.initialize();
    });

    test('should convert OpenAI request to Anthropic format', async () => {
      const openaiRequest = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'Hello, how are you?'
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      };

      const converted = await llmswitch.convertRequest(
        openaiRequest,
        ProtocolType.OPENAI,
        ProtocolType.ANTHROPIC,
        testContext
      );

      expect(converted).toBeDefined();
      expect(converted.model).toBe('gpt-3.5-turbo');
      expect(converted.max_tokens).toBe(1000);
      expect(converted.messages).toHaveLength(2);
      expect(converted.messages[0].role).toBe('user');
      expect(converted.messages[0].content[0].type).toBe('text');
      expect(converted.messages[0].content[0].text).toBe('You are a helpful assistant.\n\nHello, how are you?');
    }, TEST_TIMEOUT);

    test('should convert Anthropic response to OpenAI format', async () => {
      const anthropicResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'I am doing well, thank you!'
          }
        ],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 15,
          output_tokens: 12
        }
      };

      const converted = await llmswitch.convertResponse(
        anthropicResponse,
        ProtocolType.ANTHROPIC,
        ProtocolType.OPENAI,
        testContext
      );

      expect(converted).toBeDefined();
      expect(converted.id).toBe('msg_123');
      expect(converted.object).toBe('chat.completion');
      expect(converted.choices).toHaveLength(1);
      expect(converted.choices[0].message.role).toBe('assistant');
      expect(converted.choices[0].message.content).toBe('I am doing well, thank you!');
      expect(converted.choices[0].finish_reason).toBe('stop');
    }, TEST_TIMEOUT);
  });

  describe('Protocol Support', () => {
    beforeEach(async () => {
      await llmswitch.initialize();
    });

    test('should return supported protocol conversions', () => {
      const conversions = llmswitch.getSupportedConversions();

      expect(conversions).toHaveLength(4); // 2 protocols × 2 directions

      const anthropicToOpenAI = conversions.find(c =>
        c.fromProtocol === ProtocolType.ANTHROPIC && c.toProtocol === ProtocolType.OPENAI
      );
      expect(anthropicToOpenAI).toBeDefined();
      expect(anthropicToOpenAI!.supported).toBe(true);

      const openAIToAnthropic = conversions.find(c =>
        c.fromProtocol === ProtocolType.OPENAI && c.toProtocol === ProtocolType.ANTHROPIC
      );
      expect(openAIToAnthropic).toBeDefined();
      expect(openAIToAnthropic!.supported).toBe(true);
    });

    test('should check conversion support correctly', () => {
      expect(llmswitch.supportsConversion(ProtocolType.ANTHROPIC, ProtocolType.OPENAI)).toBe(true);
      expect(llmswitch.supportsConversion(ProtocolType.OPENAI, ProtocolType.ANTHROPIC)).toBe(true);
      expect(llmswitch.supportsConversion(ProtocolType.ANTHROPIC, ProtocolType.QWEN)).toBe(false);
      expect(llmswitch.supportsConversion(ProtocolType.QWEN, ProtocolType.OPENAI)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await llmswitch.initialize();
    });

    test('should handle invalid request format', async () => {
      const invalidRequest = null;

      await expect(
        llmswitch.convertRequest(
          invalidRequest as any,
          ProtocolType.OPENAI,
          ProtocolType.ANTHROPIC,
          testContext
        )
      ).rejects.toThrow('Invalid request format');
    }, TEST_TIMEOUT);

    test('should handle unsupported protocol conversion', async () => {
      const request = createTestRequest();

      await expect(
        llmswitch.convertRequest(
          request,
          ProtocolType.OPENAI,
          ProtocolType.QWEN,
          testContext
        )
      ).rejects.toThrow('Unsupported protocol conversion');
    }, TEST_TIMEOUT);

    test('should handle invalid response format', async () => {
      const invalidResponse = null;

      await expect(
        llmswitch.convertResponse(
          invalidResponse as any,
          ProtocolType.OPENAI,
          ProtocolType.ANTHROPIC,
          testContext
        )
      ).rejects.toThrow('Invalid response format');
    }, TEST_TIMEOUT);
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await llmswitch.initialize();
    });

    test('should perform protocol conversion efficiently', async () => {
      const request = createTestRequest();
      const iterations = 100;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await llmswitch.convertRequest(
          request,
          ProtocolType.OPENAI,
          ProtocolType.ANTHROPIC,
          testContext
        );
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(10); // Should be less than 10ms per conversion
      console.log(`Average conversion time: ${averageTime.toFixed(2)}ms`);
    }, TEST_TIMEOUT);
  });

  describe('Status and Cleanup', () => {
    test('should provide correct status information', async () => {
      await llmswitch.initialize();

      const status = await llmswitch.getStatus();

      expect(status.isInitialized).toBe(true);
      expect(status.isRunning).toBe(true);
      expect(status.statistics.requestsProcessed).toBe(0);
      expect(status.statistics.averageResponseTime).toBe(0);
      expect(status.statistics.errorRate).toBe(0);
    });

    test('should cleanup resources properly', async () => {
      await llmswitch.initialize();

      await llmswitch.destroy();

      const status = await llmswitch.getStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.isRunning).toBe(false);
    });
  });
});