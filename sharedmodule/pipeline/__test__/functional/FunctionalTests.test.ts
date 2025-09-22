/**
 * Functional Tests for RCC Pipeline
 *
 * Executes the functional test scenarios defined in FunctionalTestScenarios
 */

import { ModularPipelineExecutor } from '../../src/core/ModularPipelineExecutor';
import { ModuleFactory } from '../../src/core/ModuleFactory';
import { ConfigurationValidator } from '../../src/core/ConfigurationValidator';
import { FunctionalTestRunner, FUNCTIONAL_TEST_SCENARIOS } from '../scenarios/FunctionalTestScenarios';
import { createTestPipelineWrapper, TEST_TIMEOUT } from '../setup';

describe('Functional Tests - Basic Scenarios', () => {
  let testRunner: FunctionalTestRunner;
  let executor: ModularPipelineExecutor;
  let moduleFactory: ModuleFactory;
  let validator: ConfigurationValidator;
  let testWrapper: any;

  beforeAll(async () => {
    // Initialize the pipeline system
    moduleFactory = new ModuleFactory();
    validator = new ConfigurationValidator();
    testWrapper = createTestPipelineWrapper();
    executor = new ModularPipelineExecutor(moduleFactory, validator);

    await executor.initialize(testWrapper);

    // Create test runner with real execution function
    testRunner = new FunctionalTestRunner(
      FUNCTIONAL_TEST_SCENARIOS.map(scenario => ({
        ...scenario,
        execute: async (context) => {
          if (context.request) {
            // Execute single request
            const result = await executor.execute(context.request, context.routingId);
            return { ...context, result };
          } else if (context.requests) {
            // Execute multiple requests
            const results = [];
            for (const message of context.requests.filter((m: any) => m.role === 'user')) {
              const request = {
                model: 'gpt-3.5-turbo',
                messages: context.requests.filter((m: any, i: number) =>
                  context.requests.indexOf(m) <= context.requests.indexOf(message)
                ),
                temperature: 0.7
              };
              const result = await executor.execute(request, context.routingId);
              results.push({ request, result });
            }
            return { ...context, results };
          }
          return context;
        }
      }))
    );
  });

  afterAll(async () => {
    if (executor) {
      await executor.destroy();
    }
  });

  describe('Basic Chat Completion', () => {
    test('should handle basic chat completion', async () => {
      const result = await testRunner.runScenario('basic-chat-completion');

      expect(result.passed).toBe(true);
      if (result.result.result) {
        expect(result.result.result.success).toBe(true);
        expect(result.result.result.response).toBeDefined();
        expect(result.result.result.executionTime).toBeGreaterThan(0);
      }
    }, TEST_TIMEOUT);

    test('should handle multi-turn conversations', async () => {
      const result = await testRunner.runScenario('multi-turn-conversation');

      expect(result.passed).toBe(true);
      expect(result.result.results).toBeDefined();
      expect(result.result.results.length).toBe(2);
    }, TEST_TIMEOUT * 2);
  });

  describe('Advanced Functionality', () => {
    test('should handle tool calling conversations', async () => {
      const result = await testRunner.runScenario('tool-calling-conversation');

      expect(result.passed).toBe(true);
      if (result.result.result) {
        expect(result.result.result.success).toBe(true);
      }
    }, TEST_TIMEOUT);

    test('should handle streaming responses', async () => {
      const result = await testRunner.runScenario('streaming-chat');

      expect(result.passed).toBe(true);
      if (result.result.result) {
        expect(result.result.result.success).toBe(true);
      }
    }, TEST_TIMEOUT);

    test('should handle multi-modal conversations', async () => {
      const result = await testRunner.runScenario('multi-modal-conversation');

      expect(result.passed).toBe(true);
      if (result.result.result) {
        expect(result.result.result.success).toBe(true);
      }
    }, TEST_TIMEOUT);
  });

  describe('Edge Cases', () => {
    test('should handle empty content requests', async () => {
      const result = await testRunner.runScenario('empty-content');

      expect(result.passed).toBe(true);
      expect(result.result).toBeDefined();
    }, TEST_TIMEOUT);

    test('should handle extremely long conversations', async () => {
      const result = await testRunner.runScenario('extremely-long-conversation');

      expect(result.passed).toBe(true);
      expect(result.result).toBeDefined();
    }, TEST_TIMEOUT * 2);

    test('should handle malformed JSON structures', async () => {
      const result = await testRunner.runScenario('malformed-json-structure');

      expect(result.passed).toBe(true);
      expect(result.result).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('Real-world Scenarios', () => {
    test('should handle customer support chat', async () => {
      const result = await testRunner.runScenario('customer-support-chat');

      expect(result.passed).toBe(true);
      if (result.result.result) {
        expect(result.result.result.success).toBe(true);
        expect(result.result.result.response.choices[0].message.content).toContain('help');
      }
    }, TEST_TIMEOUT);

    test('should handle code generation tasks', async () => {
      const result = await testRunner.runScenario('code-generation-task');

      expect(result.passed).toBe(true);
      if (result.result.result) {
        expect(result.result.result.success).toBe(true);
        const content = result.result.result.response.choices[0].message.content;
        expect(content).toMatch(/def|function|code/i);
      }
    }, TEST_TIMEOUT);
  });
});

describe('Functional Tests - Performance Scenarios', () => {
  let testRunner: FunctionalTestRunner;
  let executor: ModularPipelineExecutor;
  let moduleFactory: ModuleFactory;
  let validator: ConfigurationValidator;
  let testWrapper: any;

  beforeAll(async () => {
    moduleFactory = new ModuleFactory();
    validator = new ConfigurationValidator();
    testWrapper = createTestPipelineWrapper();
    executor = new ModularPipelineExecutor(moduleFactory, validator);

    await executor.initialize(testWrapper);

    // Create test runner with real execution function
    testRunner = new FunctionalTestRunner(
      FUNCTIONAL_TEST_SCENARIOS.map(scenario => ({
        ...scenario,
        execute: async (context) => {
          if (context.requests) {
            const startTime = Date.now();

            // Execute all requests concurrently
            const results = await Promise.all(
              context.requests.map((request: any) => executor.execute(request, context.routingId))
            );

            const endTime = Date.now();

            return {
              ...context,
              results,
              totalTime: endTime - startTime,
              averageTime: (endTime - startTime) / context.requests.length
            };
          } else if (context.bursts) {
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
                requests.map((request: any) => executor.execute(request, context.routingId))
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
          }
          return context;
        }
      }))
    );
  });

  afterAll(async () => {
    if (executor) {
      await executor.destroy();
    }
  });

  test('should handle high concurrency requests', async () => {
    const result = await testRunner.runScenario('high-concurrency-chat');

    expect(result.passed).toBe(true);
    expect(result.result.results).toHaveLength(20);
    expect(result.result.results.every((r: any) => r.success)).toBe(true);
    expect(result.result.averageTime).toBeLessThan(1000);

    console.log(`High concurrency average time: ${result.result.averageTime.toFixed(2)}ms`);
  }, TEST_TIMEOUT * 5);

  test('should handle burst traffic patterns', async () => {
    const result = await testRunner.runScenario('burst-traffic-pattern');

    expect(result.passed).toBe(true);
    expect(result.result.allResults).toHaveLength(5);
    expect(result.result.allResults.every((burst: any) => burst.every((r: any) => r.success))).toBe(true);
    expect(result.result.averageBurstTime).toBeLessThan(2000);

    console.log(`Burst traffic average time: ${result.result.averageBurstTime.toFixed(2)}ms`);
  }, TEST_TIMEOUT * 5);
});

describe('Functional Tests - Comprehensive Suite', () => {
  let testRunner: FunctionalTestRunner;
  let executor: ModularPipelineExecutor;
  let moduleFactory: ModuleFactory;
  let validator: ConfigurationValidator;
  let testWrapper: any;

  beforeAll(async () => {
    moduleFactory = new ModuleFactory();
    validator = new ConfigurationValidator();
    testWrapper = createTestPipelineWrapper();
    executor = new ModularPipelineExecutor(moduleFactory, validator);

    await executor.initialize(testWrapper);

    // Create test runner with real execution function
    testRunner = new FunctionalTestRunner(
      FUNCTIONAL_TEST_SCENARIOS.map(scenario => ({
        ...scenario,
        execute: async (context) => {
          if (context.request) {
            const result = await executor.execute(context.request, context.routingId);
            return { ...context, result };
          } else if (context.requests) {
            const results = [];
            for (const message of context.requests.filter((m: any) => m.role === 'user')) {
              const request = {
                model: 'gpt-3.5-turbo',
                messages: context.requests.filter((m: any, i: number) =>
                  context.requests.indexOf(m) <= context.requests.indexOf(message)
                ),
                temperature: 0.7
              };
              const result = await executor.execute(request, context.routingId);
              results.push({ request, result });
            }
            return { ...context, results };
          } else if (context.conversation) {
            const request = {
              model: 'gpt-3.5-turbo',
              messages: context.conversation,
              temperature: 0.7,
              max_tokens: 1000
            };

            const result = await executor.execute(request, context.routingId);
            return { ...context, result };
          }
          return context;
        }
      }))
    );
  });

  afterAll(async () => {
    if (executor) {
      await executor.destroy();
    }
  });

  test('should run all scenarios with acceptable success rate', async () => {
    const { results, summary } = await testRunner.runAllScenarios();

    console.log(`📊 Full Test Summary:`);
    console.log(`  Total: ${summary.total}`);
    console.log(`  Passed: ${summary.passed}`);
    console.log(`  Failed: ${summary.failed}`);
    console.log(`  Pass Rate: ${(summary.passRate * 100).toFixed(1)}%`);

    // Accept 90% pass rate for functional tests
    expect(summary.passRate).toBeGreaterThan(0.9);

    // Log any failures for debugging
    if (summary.failed > 0) {
      console.log('\n❌ Failed Scenarios:');
      results.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.scenario.name}: ${result.error?.message || 'Validation failed'}`);
      });
    }
  }, TEST_TIMEOUT * 10);

  test('should run basic scenarios with 100% success rate', async () => {
    const { summary } = await testRunner.runScenariosByCategory('basic');

    expect(summary.passRate).toBe(1.0); // 100% for basic scenarios
    console.log(`Basic scenarios pass rate: ${(summary.passRate * 100).toFixed(1)}%`);
  }, TEST_TIMEOUT * 3);

  test('should run advanced scenarios with acceptable success rate', async () => {
    const { summary } = await testRunner.runScenariosByCategory('advanced');

    expect(summary.passRate).toBeGreaterThan(0.8); // 80% for advanced scenarios
    console.log(`Advanced scenarios pass rate: ${(summary.passRate * 100).toFixed(1)}%`);
  }, TEST_TIMEOUT * 5);

  test('should run edge cases with acceptable success rate', async () => {
    const { summary } = await testRunner.runScenariosByCategory('edge-case');

    expect(summary.passRate).toBeGreaterThan(0.7); // 70% for edge cases (may fail gracefully)
    console.log(`Edge cases pass rate: ${(summary.passRate * 100).toFixed(1)}%`);
  }, TEST_TIMEOUT * 3);
});