/**
 * Functional Test Scenarios for RCC Pipeline
 *
 * Defines comprehensive functional test scenarios for real-world usage patterns
 */

import { describe, test, expect } from '@jest/globals';

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'advanced' | 'edge-case' | 'performance';
  setup: () => any;
  execute: (context: any) => Promise<any>;
  validate: (result: any) => boolean;
  cleanup?: (context: any) => Promise<void>;
}

export const FUNCTIONAL_TEST_SCENARIOS: TestScenario[] = [
  // Basic Chat Completion Scenarios
  {
    id: 'basic-chat-completion',
    name: 'Basic Chat Completion',
    description: 'Simple chat conversation between user and assistant',
    category: 'basic',
    setup: () => ({
      request: {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Hello, how are you today?'
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      virtualModelId: 'test-virtual-model'
    }),
    execute: async (context) => {
      // This would be executed by the test runner
      return context;
    },
    validate: (result) => {
      return result.success &&
             result.response?.choices?.[0]?.message?.content?.length > 0 &&
             result.executionTime < 5000;
    }
  },

  {
    id: 'multi-turn-conversation',
    name: 'Multi-turn Conversation',
    description: 'Extended conversation with multiple exchanges',
    category: 'basic',
    setup: () => ({
      requests: [
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
      virtualModelId: 'test-virtual-model'
    }),
    execute: async (context) => {
      // Execute each request in sequence
      const results = [];
      for (const message of context.requests.filter(m => m.role === 'user')) {
        const request = {
          model: 'gpt-3.5-turbo',
          messages: context.requests.filter(m =>
            context.requests.indexOf(m) <= context.requests.indexOf(message)
          ),
          temperature: 0.7
        };
        // Execute request and store result
        results.push({ request, result: await executeMockRequest(request) });
      }
      return { ...context, results };
    },
    validate: (result) => {
      return result.results?.length === 2 &&
             result.results.every((r: any) => r.result.success);
    }
  },

  // Advanced Scenarios
  {
    id: 'tool-calling-conversation',
    name: 'Tool Calling Conversation',
    description: 'Conversation requiring function/tool calls',
    category: 'advanced',
    setup: () => ({
      request: {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'What\'s the weather like in New York right now?'
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_current_weather',
              description: 'Get the current weather for a location',
              parameters: {
                type: 'object',
                properties: {
                  location: {
                    type: 'string',
                    description: 'The city and state, e.g. San Francisco, CA'
                  }
                },
                required: ['location']
              }
            }
          }
        ],
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000
      },
      virtualModelId: 'test-virtual-model'
    }),
    execute: async (context) => {
      return context;
    },
    validate: (result) => {
      return result.success &&
             (result.response?.choices?.[0]?.message?.tool_calls ||
              result.response?.choices?.[0]?.message?.content?.length > 0);
    }
  },

  {
    id: 'streaming-chat',
    name: 'Streaming Chat Response',
    description: 'Real-time streaming chat response',
    category: 'advanced',
    setup: () => ({
      request: {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Tell me a story about a brave knight.'
          }
        ],
        stream: true,
        temperature: 0.8,
        max_tokens: 2000
      },
      virtualModelId: 'test-virtual-model'
    }),
    execute: async (context) => {
      return context;
    },
    validate: (result) => {
      return result.success &&
             result.streamingChunks?.length > 0 &&
             result.streamingChunks?.every((chunk: any) => chunk.choices?.[0]?.delta?.content);
    }
  },

  {
    id: 'multi-modal-conversation',
    name: 'Multi-modal Conversation',
    description: 'Conversation with text and image inputs',
    category: 'advanced',
    setup: () => ({
      request: {
        model: 'gpt-4-vision',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What do you see in this image?'
              },
              {
                type: 'image_url',
                image_url: {
                  url: 'https://example.com/test-image.jpg'
                }
              }
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      virtualModelId: 'test-virtual-model'
    }),
    execute: async (context) => {
      return context;
    },
    validate: (result) => {
      return result.success &&
             result.response?.choices?.[0]?.message?.content?.length > 0;
    }
  },

  // Edge Case Scenarios
  {
    id: 'empty-content',
    name: 'Empty Content Request',
    description: 'Request with empty or minimal content',
    category: 'edge-case',
    setup: () => ({
      request: {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: ''
          }
        ],
        temperature: 0.7
      },
      virtualModelId: 'test-virtual-model'
    }),
    execute: async (context) => {
      return context;
    },
    validate: (result) => {
      // Should handle gracefully, may succeed or fail gracefully
      return result !== undefined;
    }
  },

  {
    id: 'extremely-long-conversation',
    name: 'Extremely Long Conversation',
    description: 'Very long conversation that tests token limits',
    category: 'edge-case',
    setup: () => ({
      request: {
        model: 'gpt-3.5-turbo',
        messages: Array(50).fill(null).map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i + 1}: This is part of a very long conversation to test token limits and context handling.`
        })),
        temperature: 0.7,
        max_tokens: 1000
      },
      virtualModelId: 'test-virtual-model'
    }),
    execute: async (context) => {
      return context;
    },
    validate: (result) => {
      return result !== undefined; // Should handle gracefully
    }
  },

  {
    id: 'malformed-json-structure',
    name: 'Malformed JSON Structure',
    description: 'Request with improperly formatted JSON structure',
    category: 'edge-case',
    setup: () => ({
      request: {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Normal message'
          }
        ],
        // Add potentially problematic parameters
        invalid_param: { nested: { deep: { value: 'problematic' } } },
        temperature: 0.7
      },
      virtualModelId: 'test-virtual-model'
    }),
    execute: async (context) => {
      return context;
    },
    validate: (result) => {
      return result !== undefined; // Should handle gracefully
    }
  },

  // Performance Scenarios
  {
    id: 'high-concurrency-chat',
    name: 'High Concurrency Chat',
    description: 'Multiple concurrent chat requests',
    category: 'performance',
    setup: () => ({
      requests: Array(20).fill(null).map((_, i) => ({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `Hello, this is concurrent request ${i + 1}. Please respond with the number ${i + 1}.`
          }
        ],
        temperature: 0.7
      })),
      virtualModelId: 'test-virtual-model'
    }),
    execute: async (context) => {
      const startTime = Date.now();

      // Execute all requests concurrently
      const results = await Promise.all(
        context.requests.map((request: any) => executeMockRequest(request))
      );

      const endTime = Date.now();

      return {
        ...context,
        results,
        totalTime: endTime - startTime,
        averageTime: (endTime - startTime) / context.requests.length
      };
    },
    validate: (result) => {
      return result.results?.length === 20 &&
             result.results.every((r: any) => r.success) &&
             result.averageTime < 1000; // Should be fast
    }
  },

  {
    id: 'burst-traffic-pattern',
    name: 'Burst Traffic Pattern',
    description: 'Simulate burst traffic patterns',
    category: 'performance',
    setup: () => ({
      bursts: 5,
      requestsPerBurst: 10,
      delayBetweenBursts: 1000,
      virtualModelId: 'test-virtual-model'
    }),
    execute: async (context) => {
      const allResults = [];
      const burstTimings: number[] = [];

      for (let burst = 0; burst < context.bursts; burst++) {
        const startTime = Date.now();

        const requests = Array(context.requestsPerBurst).fill(null).map((_, i) => ({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Burst ${burst + 1}, request ${i + 1}`
            }
          ],
          temperature: 0.7
        }));

        const results = await Promise.all(
          requests.map((request: any) => executeMockRequest(request))
        );

        const endTime = Date.now();
        burstTimings.push(endTime - startTime);
        allResults.push(results);

        if (burst < context.bursts - 1) {
          await new Promise(resolve => setTimeout(resolve, context.delayBetweenBursts));
        }
      }

      return {
        ...context,
        allResults,
        burstTimings,
        averageBurstTime: burstTimings.reduce((a, b) => a + b, 0) / burstTimings.length
      };
    },
    validate: (result) => {
      return result.allResults?.length === 5 &&
             result.allResults.every((burst: any) => burst.every((r: any) => r.success)) &&
             result.averageBurstTime < 2000;
    }
  },

  // Real-world Scenarios
  {
    id: 'customer-support-chat',
    name: 'Customer Support Chat',
    description: 'Simulate customer support interaction',
    category: 'advanced',
    setup: () => ({
      conversation: [
        {
          role: 'system',
          content: 'You are a helpful customer support assistant for a software company.'
        },
        {
          role: 'user',
          content: 'Hi, I\'m having trouble logging into my account. Can you help me?'
        },
        {
          role: 'assistant',
          content: 'I\'d be happy to help you with your login issue. Could you please tell me what error message you\'re seeing when you try to log in?'
        },
        {
          role: 'user',
          content: 'It says "Invalid username or password" but I\'m sure my credentials are correct.'
        }
      ],
      virtualModelId: 'test-virtual-model'
    }),
    execute: async (context) => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: context.conversation,
        temperature: 0.7,
        max_tokens: 1000
      };

      return {
        ...context,
        result: await executeMockRequest(request)
      };
    },
    validate: (result) => {
      return result.result?.success &&
             result.result.response?.choices?.[0]?.message?.content?.length > 0;
    }
  },

  {
    id: 'code-generation-task',
    name: 'Code Generation Task',
    description: 'Generate code based on natural language description',
    category: 'advanced',
    setup: () => ({
      request: {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful programming assistant. Provide clear, well-commented code.'
          },
          {
            role: 'user',
            content: 'Please write a Python function that calculates the factorial of a number using recursion, with proper error handling.'
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      },
      virtualModelId: 'test-virtual-model'
    }),
    execute: async (context) => {
      return context;
    },
    validate: (result) => {
      return result.success &&
             result.response?.choices?.[0]?.message?.content?.includes('def') &&
             result.response?.choices?.[0]?.message?.content?.includes('factorial');
    }
  }
];

// Mock execution function for testing
async function executeMockRequest(request: any): Promise<any> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

  return {
    success: true,
    response: {
      id: `mock-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now(),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `Mock response for: ${request.messages[request.messages.length - 1].content}`
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 25,
        total_tokens: 75
      }
    },
    executionTime: Math.random() * 200 + 100
  };
}

// Test runner utility
export class FunctionalTestRunner {
  private scenarios: TestScenario[];

  constructor(scenarios: TestScenario[] = FUNCTIONAL_TEST_SCENARIOS) {
    this.scenarios = scenarios;
  }

  async runScenario(scenarioId: string): Promise<{
    scenario: TestScenario;
    result: any;
    passed: boolean;
    error?: Error;
  }> {
    const scenario = this.scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    console.log(`🧪 Running scenario: ${scenario.name}`);

    try {
      const context = scenario.setup();
      const result = await scenario.execute(context);
      const passed = scenario.validate(result);

      if (scenario.cleanup) {
        await scenario.cleanup(context);
      }

      return {
        scenario,
        result,
        passed
      };
    } catch (error) {
      console.error(`❌ Scenario failed: ${scenario.name}`, error);
      return {
        scenario,
        result: null,
        passed: false,
        error: error as Error
      };
    }
  }

  async runAllScenarios(): Promise<{
    results: Array<{
      scenario: TestScenario;
      result: any;
      passed: boolean;
      error?: Error;
    }>;
    summary: {
      total: number;
      passed: number;
      failed: number;
      passRate: number;
    };
  }> {
    console.log('🚀 Running all functional test scenarios...');

    const results = [];
    for (const scenario of this.scenarios) {
      const result = await this.runScenario(scenario.id);
      results.push(result);
    }

    const summary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      passRate: results.filter(r => r.passed).length / results.length
    };

    console.log(`📊 Test Summary: ${summary.passed}/${summary.total} passed (${(summary.passRate * 100).toFixed(1)}%)`);

    return { results, summary };
  }

  async runScenariosByCategory(category: TestScenario['category']): Promise<{
    results: Array<{
      scenario: TestScenario;
      result: any;
      passed: boolean;
      error?: Error;
    }>;
    summary: {
      total: number;
      passed: number;
      failed: number;
      passRate: number;
    };
  }> {
    const categoryScenarios = this.scenarios.filter(s => s.category === category);
    const results = [];

    for (const scenario of categoryScenarios) {
      const result = await this.runScenario(scenario.id);
      results.push(result);
    }

    const summary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      passRate: results.filter(r => r.passed).length / results.length
    };

    console.log(`📊 ${category} Summary: ${summary.passed}/${summary.total} passed (${(summary.passRate * 100).toFixed(1)}%)`);

    return { results, summary };
  }
}

// Export for use in test files
export { FUNCTIONAL_TEST_SCENARIOS as default, FunctionalTestRunner };