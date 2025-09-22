/**
 * Load Testing for RCC Pipeline System
 *
 * Comprehensive load testing to validate system behavior under various stress conditions
 */

import { ModularPipelineExecutor } from '../../src/core/ModularPipelineExecutor';
import { ModuleFactory } from '../../src/core/ModuleFactory';
import { ConfigurationValidator } from '../../src/core/ConfigurationValidator';
import { createTestPipelineWrapper, createTestRequest, createStreamingTestRequest, TEST_TIMEOUT } from '../setup';

describe('Load Testing - Stress Conditions', () => {
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

  describe('High Concurrency Load Testing', () => {
    test('should handle extreme concurrency (500+ concurrent requests)', async () => {
      const concurrency = 500;
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const startTime = Date.now();

      // Execute extremely high concurrency
      const promises = Array(concurrency).fill(null).map((_, i) =>
        executor.execute(request, routingId).catch(error => ({
          success: false,
          error: error.message,
          requestId: i
        }))
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const successfulRequests = results.filter(r => r.success).length;
      const failedRequests = results.filter(r => !r.success).length;
      const successRate = successfulRequests / results.length;
      const totalTime = endTime - startTime;
      const throughput = results.length / (totalTime / 1000);

      // Load testing expectations (more lenient than normal tests)
      expect(successRate).toBeGreaterThan(0.7); // At least 70% success under extreme load
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(throughput).toBeGreaterThan(10); // At least 10 requests per second

      console.log(`Extreme Concurrency Test (${concurrency} concurrent):`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`  Successful: ${successfulRequests}, Failed: ${failedRequests}`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Throughput: ${throughput.toFixed(2)} requests/second`);
    }, TEST_TIMEOUT * 10);

    test('should handle gradual load increase (ramp-up testing)', async () => {
      const maxConcurrency = 200;
      const rampUpTime = 30000; // 30 seconds to reach max concurrency
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const startTime = Date.now();
      const results: any[] = [];
      const activePromises: Promise<any>[] = [];

      // Gradually increase load
      const rampUpInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const currentConcurrency = Math.floor((elapsed / rampUpTime) * maxConcurrency);

        // Add new requests to reach target concurrency
        while (activePromises.length < currentConcurrency && activePromises.length < maxConcurrency) {
          const promise = executor.execute(request, routingId)
            .then(result => ({ ...result, success: true }))
            .catch(error => ({ success: false, error: error.message }))
            .finally(() => {
              // Remove from active promises
              const index = activePromises.indexOf(promise);
              if (index > -1) {
                activePromises.splice(index, 1);
              }
            });

          activePromises.push(promise);
          results.push(promise);
        }
      }, 100);

      // Wait for ramp-up period
      await new Promise(resolve => setTimeout(resolve, rampUpTime));
      clearInterval(rampUpInterval);

      // Wait for all remaining requests to complete
      await Promise.all(activePromises);
      const endTime = Date.now();

      const finalResults = await Promise.all(results);
      const successfulRequests = finalResults.filter(r => r.success).length;
      const successRate = successfulRequests / finalResults.length;

      expect(successRate).toBeGreaterThan(0.8); // At least 80% success during ramp-up

      console.log(`Ramp-up Load Test (max ${maxConcurrency} concurrency):`);
      console.log(`  Total requests: ${finalResults.length}`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`  Total time: ${endTime - startTime}ms`);
    }, TEST_TIMEOUT * 15);
  });

  describe('Sustained Load Testing', () => {
    test('should handle sustained high load for extended periods', async () => {
      const duration = 300000; // 5 minutes
      const targetRPS = 50; // 50 requests per second
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const startTime = Date.now();
      const results: any[] = [];
      let requestCount = 0;

      // Generate sustained load
      const loadGenerator = setInterval(() => {
        if (Date.now() - startTime < duration) {
          requestCount++;
          executor.execute(request, routingId)
            .then(result => results.push({ ...result, timestamp: Date.now() }))
            .catch(error => results.push({
              success: false,
              error: error.message,
              timestamp: Date.now()
            }));
        }
      }, 1000 / targetRPS);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, duration));
      clearInterval(loadGenerator);

      // Wait for remaining requests
      await new Promise(resolve => setTimeout(resolve, 30000));

      const actualDuration = Date.now() - startTime;
      const successfulRequests = results.filter(r => r.success).length;
      const successRate = successfulRequests / results.length;
      const actualRPS = results.length / (actualDuration / 1000);

      // Sustained load expectations
      expect(successRate).toBeGreaterThan(0.9); // At least 90% success rate
      expect(actualRPS).toBeGreaterThan(targetRPS * 0.8); // At least 80% of target RPS

      // Analyze performance over time
      const minuteIntervals = 5;
      const intervalDuration = actualDuration / minuteIntervals;
      const intervalStats: any[] = [];

      for (let i = 0; i < minuteIntervals; i++) {
        const intervalStart = startTime + (i * intervalDuration);
        const intervalEnd = intervalStart + intervalDuration;
        const intervalResults = results.filter(r =>
          r.timestamp >= intervalStart && r.timestamp < intervalEnd
        );

        if (intervalResults.length > 0) {
          const intervalSuccessRate = intervalResults.filter(r => r.success).length / intervalResults.length;
          intervalStats.push({
            interval: i + 1,
            successRate: intervalSuccessRate,
            requestCount: intervalResults.length
          });
        }
      }

      // Check for performance consistency
      const successRates = intervalStats.map(s => s.successRate);
      const minSuccessRate = Math.min(...successRates);

      expect(minSuccessRate).toBeGreaterThan(0.8); // No interval should drop below 80%

      console.log(`Sustained Load Test (${(duration / 1000 / 60).toFixed(0)} minutes, target ${targetRPS} RPS):`);
      console.log(`  Total requests: ${results.length}`);
      console.log(`  Actual RPS: ${actualRPS.toFixed(2)}`);
      console.log(`  Overall success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`  Minimum interval success rate: ${(minSuccessRate * 100).toFixed(1)}%`);

      intervalStats.forEach(stat => {
        console.log(`    Minute ${stat.interval}: ${(stat.successRate * 100).toFixed(1)}% success (${stat.requestCount} requests)`);
      });
    }, TEST_TIMEOUT * 60);

    test('should handle memory pressure under sustained load', async () => {
      const duration = 120000; // 2 minutes
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const initialMemory = process.memoryUsage();
      const memorySnapshots: any[] = [];

      // Generate sustained load
      const loadGenerator = setInterval(() => {
        if (Date.now() - initialMemory.heapUsed < duration) {
          executor.execute(request, routingId);
        }
      }, 50); // High frequency request generation

      // Take memory snapshots
      const snapshotInterval = setInterval(() => {
        const memory = process.memoryUsage();
        memorySnapshots.push({
          timestamp: Date.now(),
          heapUsed: memory.heapUsed,
          heapTotal: memory.heapTotal,
          external: memory.external
        });
      }, 5000);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, duration));
      clearInterval(loadGenerator);
      clearInterval(snapshotInterval);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const maxMemory = Math.max(...memorySnapshots.map(s => s.heapUsed));

      // Memory pressure expectations
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      expect(maxMemory - initialMemory.heapUsed).toBeLessThan(200 * 1024 * 1024); // Peak less than 200MB above initial

      console.log(`Memory Pressure Test (${(duration / 1000 / 60).toFixed(0)} minutes):`);
      console.log(`  Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Peak memory: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
    }, TEST_TIMEOUT * 30);
  });

  describe('Spike Load Testing', () => {
    test('should handle sudden traffic spikes', async () => {
      const normalLoad = 10; // Normal concurrent requests
      const spikeLoad = 100; // Spike concurrent requests
      const spikeDuration = 10000; // 10 seconds spike
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const results: any[] = [];
      let activePromises: Promise<any>[] = [];

      const startTime = Date.now();

      // Phase 1: Normal load
      console.log('Phase 1: Normal load...');
      for (let i = 0; i < normalLoad; i++) {
        const promise = executor.execute(request, routingId)
          .then(result => ({ ...result, phase: 'normal', success: true }))
          .catch(error => ({ success: false, error: error.message, phase: 'normal' }))
          .finally(() => {
            const index = activePromises.indexOf(promise);
            if (index > -1) activePromises.splice(index, 1);
          });

        activePromises.push(promise);
        results.push(promise);
      }

      // Wait for normal load to stabilize
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Phase 2: Spike load
      console.log('Phase 2: Spike load...');
      for (let i = 0; i < spikeLoad - normalLoad; i++) {
        const promise = executor.execute(request, routingId)
          .then(result => ({ ...result, phase: 'spike', success: true }))
          .catch(error => ({ success: false, error: error.message, phase: 'spike' }))
          .finally(() => {
            const index = activePromises.indexOf(promise);
            if (index > -1) activePromises.splice(index, 1);
          });

        activePromises.push(promise);
        results.push(promise);
      }

      // Wait for spike duration
      await new Promise(resolve => setTimeout(resolve, spikeDuration));

      // Phase 3: Return to normal
      console.log('Phase 3: Return to normal...');
      // Let spike requests complete naturally

      // Wait for all requests to complete
      await Promise.all(activePromises);
      const endTime = Date.now();

      const finalResults = await Promise.all(results);
      const normalResults = finalResults.filter(r => r.phase === 'normal');
      const spikeResults = finalResults.filter(r => r.phase === 'spike');
      const normalSuccessRate = normalResults.filter(r => r.success).length / normalResults.length;
      const spikeSuccessRate = spikeResults.filter(r => r.success).length / spikeResults.length;

      expect(normalSuccessRate).toBeGreaterThan(0.95); // Normal load should maintain high success rate
      expect(spikeSuccessRate).toBeGreaterThan(0.7); // Spike load should maintain reasonable success rate

      console.log(`Spike Load Test:`);
      console.log(`  Normal phase (${normalLoad} concurrent): ${(normalSuccessRate * 100).toFixed(1)}% success rate`);
      console.log(`  Spike phase (${spikeLoad} concurrent): ${(spikeSuccessRate * 100).toFixed(1)}% success rate`);
      console.log(`  Total time: ${endTime - startTime}ms`);
    }, TEST_TIMEOUT * 20);

    test('should handle multiple consecutive spikes', async () => {
      const spikeCount = 5;
      const spikeIntensity = 50;
      const spikeDuration = 5000;
      const restDuration = 3000;
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      const allResults: any[] = [];

      for (let spike = 0; spike < spikeCount; spike++) {
        console.log(`Spike ${spike + 1}/${spikeCount}...`);

        // Generate spike
        const spikePromises = Array(spikeIntensity).fill(null).map(() =>
          executor.execute(request, routingId)
            .then(result => ({ ...result, spike: spike + 1, success: true }))
            .catch(error => ({ success: false, error: error.message, spike: spike + 1 }))
        );

        const spikeResults = await Promise.all(spikePromises);
        allResults.push(...spikeResults);

        // Rest between spikes
        await new Promise(resolve => setTimeout(resolve, restDuration));
      }

      // Analyze spike performance
      const spikeStats: any[] = [];
      for (let i = 1; i <= spikeCount; i++) {
        const spikeResults = allResults.filter(r => r.spike === i);
        const successRate = spikeResults.filter(r => r.success).length / spikeResults.length;
        spikeStats.push({ spike: i, successRate, requestCount: spikeResults.length });
      }

      const overallSuccessRate = allResults.filter(r => r.success).length / allResults.length;

      expect(overallSuccessRate).toBeGreaterThan(0.8); // Overall success rate > 80%

      // Check that performance doesn't degrade significantly across spikes
      const firstSpikeRate = spikeStats[0].successRate;
      const lastSpikeRate = spikeStats[spikeStats.length - 1].successRate;
      const degradation = (firstSpikeRate - lastSpikeRate) / firstSpikeRate;

      expect(degradation).toBeLessThan(0.3); // Less than 30% degradation

      console.log(`Multiple Spike Test (${spikeCount} spikes of ${spikeIntensity} requests):`);
      console.log(`  Overall success rate: ${(overallSuccessRate * 100).toFixed(1)}%`);
      console.log(`  Performance degradation: ${(degradation * 100).toFixed(1)}%`);

      spikeStats.forEach(stat => {
        console.log(`    Spike ${stat.spike}: ${(stat.successRate * 100).toFixed(1)}% success`);
      });
    }, TEST_TIMEOUT * 15);
  });

  describe('Failure Recovery Testing', () => {
    test('should recover from system overload conditions', async () => {
      const overloadDuration = 10000;
      const recoveryDuration = 10000;
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      // Create system overload
      console.log('Creating system overload...');
      const overloadPromises = Array(200).fill(null).map(() =>
        executor.execute(request, routingId)
      );

      // Wait for some to complete during overload
      await new Promise(resolve => setTimeout(resolve, overloadDuration));

      const overloadResults = await Promise.allSettled(overloadPromises);
      const overloadSuccessRate = overloadResults.filter(r => r.status === 'fulfilled').length / overloadResults.length;

      console.log(`Overload phase success rate: ${(overloadSuccessRate * 100).toFixed(1)}%`);

      // Recovery phase
      console.log('Testing recovery...');
      await new Promise(resolve => setTimeout(resolve, recoveryDuration));

      // Test normal operation after recovery
      const recoveryRequests = 20;
      const recoveryResults: any[] = [];

      for (let i = 0; i < recoveryRequests; i++) {
        const result = await executor.execute(request, routingId);
        recoveryResults.push(result);
      }

      const recoverySuccessRate = recoveryResults.filter(r => r.success).length / recoveryResults.length;

      expect(overloadSuccessRate).toBeGreaterThan(0.3); // Some should succeed even during overload
      expect(recoverySuccessRate).toBeGreaterThan(0.9); // Should recover to near-normal success rate

      console.log(`Recovery Test:`);
      console.log(`  Overload success rate: ${(overloadSuccessRate * 100).toFixed(1)}%`);
      console.log(`  Recovery success rate: ${(recoverySuccessRate * 100).toFixed(1)}%`);
    }, TEST_TIMEOUT * 10);

    test('should handle partial system failures gracefully', async () => {
      const request = createTestRequest();
      const routingId = 'test-dynamic-routing';

      // Test with some requests designed to potentially fail
      const mixedRequests = [
        ...Array(10).fill(null).map(() => createTestRequest()),
        ...Array(5).fill(null).map(() => ({
          model: 'test-model',
          // Missing messages - should fail gracefully
          temperature: 0.7
        })),
        ...Array(10).fill(null).map(() => createTestRequest())
      ];

      const startTime = Date.now();
      const results: any[] = [];

      for (const testRequest of mixedRequests) {
        try {
          const result = await executor.execute(testRequest, virtualModelId);
          results.push({ ...result, requestType: 'valid' });
        } catch (error) {
          results.push({ success: false, error: error.message, requestType: 'invalid' });
        }
      }

      const endTime = Date.now();

      const validRequests = results.filter(r => r.requestType === 'valid');
      const invalidRequests = results.filter(r => r.requestType === 'invalid');
      const validSuccessRate = validRequests.filter(r => r.success).length / validRequests.length;

      expect(validSuccessRate).toBeGreaterThan(0.9); // Valid requests should mostly succeed
      expect(invalidRequests.length).toBe(5); // Should have caught the invalid requests
      expect(endTime - startTime).toBeLessThan(10000); // Should handle failures quickly

      console.log(`Partial Failure Test:`);
      console.log(`  Valid request success rate: ${(validSuccessRate * 100).toFixed(1)}%`);
      console.log(`  Invalid requests handled: ${invalidRequests.length}`);
      console.log(`  Total time: ${endTime - startTime}ms`);
    }, TEST_TIMEOUT * 5);
  });
});