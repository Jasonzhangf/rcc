/**
 * Benchmark Tests for RCC Pipeline System
 *
 * Comprehensive benchmarking to establish performance baselines and validate system capabilities
 */

import { ModularPipelineExecutor } from '../../src/core/ModularPipelineExecutor';
import { ModuleFactory } from '../../src/core/ModuleFactory';
import { ConfigurationValidator } from '../../src/core/ConfigurationValidator';
import { createTestPipelineWrapper, createTestRequest, createStreamingTestRequest, TEST_TIMEOUT } from '../setup';

describe('Benchmark Tests - System Baselines', () => {
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

  describe('Response Time Benchmarks', () => {
    test('should meet baseline response time targets', async () => {
      const sampleSize = 100;
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';
      const responseTimes: number[] = [];

      // Collect response times
      for (let i = 0; i < sampleSize; i++) {
        const startTime = Date.now();
        await executor.execute(request, routingId);
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      // Calculate statistics
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const sortedTimes = [...responseTimes].sort((a, b) => a - b);
      const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
      const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
      const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

      // Performance benchmarks
      expect(averageTime).toBeLessThan(50); // Average < 50ms
      expect(p50).toBeLessThan(30); // 50th percentile < 30ms
      expect(p90).toBeLessThan(100); // 90th percentile < 100ms
      expect(p95).toBeLessThan(150); // 95th percentile < 150ms
      expect(p99).toBeLessThan(300); // 99th percentile < 300ms

      console.log('Response Time Benchmarks:');
      console.log(`  Average: ${averageTime.toFixed(2)}ms`);
      console.log(`  P50: ${p50.toFixed(2)}ms`);
      console.log(`  P90: ${p90.toFixed(2)}ms`);
      console.log(`  P95: ${p95.toFixed(2)}ms`);
      console.log(`  P99: ${p99.toFixed(2)}ms`);
    }, TEST_TIMEOUT * 2);

    test('should meet streaming response time benchmarks', async () => {
      const sampleSize = 50;
      const request = createStreamingTestRequest();
      const routingId = 'test-dynamic-routing';
      const responseTimes: number[] = [];

      for (let i = 0; i < sampleSize; i++) {
        const startTime = Date.now();
        const streamingGenerator = executor.executeStreaming(request, virtualModelId);
        const chunks: any[] = [];

        for await (const chunk of streamingGenerator) {
          chunks.push(chunk);
        }

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const sortedTimes = [...responseTimes].sort((a, b) => a - b);
      const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];

      expect(averageTime).toBeLessThan(100); // Average streaming time < 100ms
      expect(p90).toBeLessThan(200); // 90th percentile < 200ms

      console.log(`Streaming Response Time Benchmark: ${averageTime.toFixed(2)}ms average, ${p90.toFixed(2)}ms P90`);
    }, TEST_TIMEOUT * 3);
  });

  describe('Throughput Benchmarks', () => {
    test('should meet throughput targets for sequential processing', async () => {
      const requestCount = 200;
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const startTime = Date.now();

      // Sequential processing
      for (let i = 0; i < requestCount; i++) {
        await executor.execute(request, routingId);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const throughput = requestCount / (totalTime / 1000); // requests per second

      expect(throughput).toBeGreaterThan(20); // Should handle > 20 requests/second
      expect(totalTime).toBeLessThan(10000); // Should complete in < 10 seconds

      console.log(`Sequential Throughput: ${throughput.toFixed(2)} requests/second`);
    }, TEST_TIMEOUT * 5);

    test('should meet throughput targets for concurrent processing', async () => {
      const concurrency = 50;
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const startTime = Date.now();

      // Concurrent processing
      const promises = Array(concurrency).fill(null).map(() =>
        executor.execute(request, routingId)
      );

      await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const throughput = concurrency / (totalTime / 1000);

      expect(throughput).toBeGreaterThan(25); // Should handle > 25 requests/second
      expect(totalTime).toBeLessThan(2000); // Should complete in < 2 seconds

      console.log(`Concurrent Throughput: ${throughput.toFixed(2)} requests/second`);
    }, TEST_TIMEOUT * 3);

    test('should maintain throughput under sustained load', async () => {
      const duration = 60000; // 1 minute
      const targetRate = 30; // requests per second
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const startTime = Date.now();
      const completedRequests: any[] = [];
      let requestCount = 0;

      // Generate requests at target rate
      const requestInterval = setInterval(() => {
        if (Date.now() - startTime < duration) {
          requestCount++;
          executor.execute(request, routingId).then(result => {
            completedRequests.push({ ...result, completedAt: Date.now() });
          });
        }
      }, 1000 / targetRate);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, duration));
      clearInterval(requestInterval);

      // Wait for remaining requests to complete
      await new Promise(resolve => setTimeout(resolve, 10000));

      const actualDuration = Date.now() - startTime;
      const actualRate = completedRequests.length / (actualDuration / 1000);
      const successRate = completedRequests.filter(r => r.success).length / completedRequests.length;

      expect(actualRate).toBeGreaterThan(targetRate * 0.8); // At least 80% of target rate
      expect(successRate).toBeGreaterThan(0.95); // At least 95% success rate

      console.log(`Sustained Throughput: ${actualRate.toFixed(2)} requests/second (target: ${targetRate})`);
      console.log(`Success Rate: ${(successRate * 100).toFixed(1)}%`);
    }, TEST_TIMEOUT * 20);
  });

  describe('Resource Usage Benchmarks', () => {
    test('should meet memory efficiency targets', async () => {
      const requestCount = 1000;
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const initialMemory = process.memoryUsage();

      // Execute many requests
      for (let i = 0; i < requestCount; i++) {
        await executor.execute(request, routingId);
      }

      const finalMemory = process.memoryUsage();

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryPerRequest = memoryIncrease / requestCount;
      const memoryEfficiency = requestCount / (memoryIncrease / 1024 / 1024); // requests per MB

      expect(memoryPerRequest).toBeLessThan(1024); // Less than 1KB per request
      expect(memoryEfficiency).toBeGreaterThan(1000); // More than 1000 requests per MB

      console.log('Memory Efficiency Benchmarks:');
      console.log(`  Total memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Memory per request: ${memoryPerRequest.toFixed(2)} bytes`);
      console.log(`  Requests per MB: ${memoryEfficiency.toFixed(0)}`);
    }, TEST_TIMEOUT * 5);

    test('should handle garbage collection efficiently', async () => {
      const iterations = 5;
      const requestsPerIteration = 200;
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      for (let iteration = 0; iteration < iterations; iteration++) {
        const memoryBefore = process.memoryUsage().heapUsed;

        // Execute batch of requests
        for (let i = 0; i < requestsPerIteration; i++) {
          await executor.execute(request, routingId);
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const memoryAfter = process.memoryUsage().heapUsed;
        const memoryGrowth = memoryAfter - memoryBefore;

        // Memory growth should be reasonable
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB per iteration

        console.log(`Iteration ${iteration + 1}: Memory growth ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      }
    }, TEST_TIMEOUT * 10);
  });

  describe('Scalability Benchmarks', () => {
    test('should scale linearly with request complexity', async () => {
      const baseRequest = createTestRequest();
      const complexities = [1, 5, 10, 20, 50]; // Multipliers for message count
      const responseTimes: number[] = [];

      for (const complexity of complexities) {
        const complexRequest = {
          ...baseRequest,
          messages: Array(complexity).fill(null).map((_, i) => ({
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i + 1}: ${'x'.repeat(100)}`
          }))
        };

        const startTime = Date.now();
        await executor.execute(complexRequest, 'test-virtual-model');
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      // Check for linear scaling (time should increase proportionally with complexity)
      const baseTime = responseTimes[0];
      for (let i = 1; i < complexities.length; i++) {
        const expectedTime = baseTime * complexities[i];
        const actualTime = responseTimes[i];
        const efficiency = expectedTime / actualTime;

        // Should be reasonably efficient (not worse than 50% of linear)
        expect(efficiency).toBeGreaterThan(0.5);
      }

      console.log('Scalability Results:');
      complexities.forEach((complexity, i) => {
        console.log(`  Complexity ${complexity}x: ${responseTimes[i].toFixed(2)}ms`);
      });
    }, TEST_TIMEOUT * 5);

    test('should handle large numbers of dynamic routing configurations efficiently', async () => {
      // Create wrapper with many dynamic routing configurations
      const manyRoutingWrapper = {
        ...testWrapper,
        dynamicRouting: Array(100).fill(null).map((_, i) => ({
          id: `routing-${i}`,
          name: `Test Routing ${i}`,
          description: `Test routing ${i}`,
          targets: [
            {
              providerId: 'test-provider',
              weight: 1,
              fallback: false
            }
          ],
          capabilities: ['chat'],
          tags: ['test']
        }))
      };

      const complexExecutor = new ModularPipelineExecutor(moduleFactory, validator);
      await complexExecutor.initialize(manyRoutingWrapper);

      const request = createTestRequest();
      const startTime = Date.now();

      // Test routing to different configurations
      for (let i = 0; i < 50; i++) {
        const routingId = `routing-${i % 100}`;
        await complexExecutor.execute(request, routingId);
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / 50;

      expect(averageTime).toBeLessThan(100); // Should handle routing efficiently

      console.log(`Large dynamic routing count: ${averageTime.toFixed(2)}ms average per request`);

      await complexExecutor.destroy();
    }, TEST_TIMEOUT * 5);
  });

  describe('Reliability Benchmarks', () => {
    test('should maintain performance over extended periods', async () => {
      const duration = 300000; // 5 minutes
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const startTime = Date.now();
      const results: any[] = [];
      let requestCount = 0;

      // Continuous request generation
      const requestGenerator = setInterval(() => {
        if (Date.now() - startTime < duration) {
          requestCount++;
          executor.execute(request, routingId).then(result => {
            results.push({ ...result, timestamp: Date.now() });
          });
        }
      }, 100); // Request every 100ms

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, duration));
      clearInterval(requestGenerator);

      // Wait for remaining requests
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Analyze performance over time
      const windowSize = 60000; // 1 minute windows
      const windows = Math.ceil(duration / windowSize);
      const windowStats: any[] = [];

      for (let i = 0; i < windows; i++) {
        const windowStart = startTime + (i * windowSize);
        const windowEnd = windowStart + windowSize;
        const windowResults = results.filter(r =>
          r.timestamp >= windowStart && r.timestamp < windowEnd
        );

        if (windowResults.length > 0) {
          const windowSuccessRate = windowResults.filter(r => r.success).length / windowResults.length;
          const windowResponseTimes = windowResults.map(r => r.executionTime || 0);
          const avgResponseTime = windowResponseTimes.reduce((a, b) => a + b, 0) / windowResponseTimes.length;

          windowStats.push({
            window: i + 1,
            successRate: windowSuccessRate,
            avgResponseTime: avgResponseTime,
            requestCount: windowResults.length
          });
        }
      }

      // Check for performance consistency
      const successRates = windowStats.map(w => w.successRate);
      const avgSuccessRate = successRates.reduce((a, b) => a + b, 0) / successRates.length;
      const successRateStdDev = Math.sqrt(
        successRates.reduce((sum, rate) => sum + Math.pow(rate - avgSuccessRate, 2), 0) / successRates.length
      );

      expect(avgSuccessRate).toBeGreaterThan(0.95); // Average success rate > 95%
      expect(successRateStdDev).toBeLessThan(0.1); // Success rate standard deviation < 10%

      console.log('Extended Period Performance:');
      console.log(`  Average success rate: ${(avgSuccessRate * 100).toFixed(1)}%`);
      console.log(`  Success rate std dev: ${(successRateStdDev * 100).toFixed(1)}%`);
      console.log(`  Total requests processed: ${results.length}`);
    }, TEST_TIMEOUT * 60);
  });
});