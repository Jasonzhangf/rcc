/**
 * RCC PipelineExecutionOptimizer Tests
 *
 * Comprehensive unit tests for the PipelineExecutionOptimizer class,
 * covering optimization features like caching, concurrency control, retry strategies, and batching.
 */

import { PipelineExecutionOptimizer } from '../../src/core/PipelineExecutionOptimizer';
import { RoutingOptimizer } from '../../src/core/RoutingOptimizer';
import { IOTracker } from '../../src/core/IOTracker';
import { PipelineExecutionResult, PipelineExecutionContext } from '../../src/interfaces/ModularInterfaces';

// Mock dependencies
jest.mock('../../src/core/RoutingOptimizer');
jest.mock('../../src/core/IOTracker');

const MockedRoutingOptimizer = RoutingOptimizer as jest.MockedClass<typeof RoutingOptimizer>;
const MockedIOTracker = IOTracker as jest.MockedClass<typeof IOTracker>;

describe('PipelineExecutionOptimizer', () => {
  let optimizer: PipelineExecutionOptimizer;
  let mockRoutingOptimizer: RoutingOptimizer;
  let mockIOTracker: IOTracker;
  let mockExecuteFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockRoutingOptimizer = new MockedRoutingOptimizer();
    mockIOTracker = new MockedIOTracker();
    mockExecuteFn = jest.fn();

    // Setup mock methods
    mockRoutingOptimizer.getRoutingDecision = jest.fn().mockResolvedValue({
      providerId: 'test-provider',
      strategy: 'test-strategy'
    });

    mockRoutingOptimizer.recordRequestResult = jest.fn();

    mockIOTracker.startSession = jest.fn().mockReturnValue('test-session-id');
    mockIOTracker.endSession = jest.fn();
    mockIOTracker.recordIO = jest.fn();
    mockIOTracker.trackStepExecution = jest.fn().mockImplementation(async (_, __, ___, ___, operation) => {
      return await operation();
    });

    // Mock successful execution result
    const successfulResult: PipelineExecutionResult = {
      success: true,
      response: { content: 'test response' },
      executionTime: 100,
      steps: [],
      context: {} as PipelineExecutionContext
    };

    mockExecuteFn.mockResolvedValue(successfulResult);

    // Create optimizer instance
    optimizer = new PipelineExecutionOptimizer(
      mockRoutingOptimizer,
      mockIOTracker,
      {
        enableConcurrency: true,
        maxConcurrency: 5,
        enableRetry: true,
        maxRetries: 3,
        enableCaching: true,
        enableBatching: false
      }
    );
  });

  afterEach(() => {
    optimizer.destroy();
  });

  describe('Constructor and Configuration', () => {
    test('should create optimizer with default configuration', () => {
      const defaultOptimizer = new PipelineExecutionOptimizer(
        mockRoutingOptimizer,
        mockIOTracker
      );

      expect(defaultOptimizer).toBeInstanceOf(PipelineExecutionOptimizer);
      defaultOptimizer.destroy();
    });

    test('should create optimizer with custom configuration', () => {
      expect(optimizer).toBeInstanceOf(PipelineExecutionOptimizer);
      expect(optimizer).toBeDefined();
    });

    test('should initialize default retry strategies', () => {
      const optimizerInstance = optimizer as any;
      expect(optimizerInstance.retryStrategies.has('network')).toBe(true);
      expect(optimizerInstance.retryStrategies.has('server')).toBe(true);
      expect(optimizerInstance.retryStrategies.has('rate-limit')).toBe(true);
    });

    test('should setup batching if enabled', () => {
      jest.useFakeTimers();

      const batchingOptimizer = new PipelineExecutionOptimizer(
        mockRoutingOptimizer,
        mockIOTracker,
        {
          enableBatching: true,
          batchSize: 3,
          batchTimeout: 100
        }
      );

      // Should have setup a timer for batch processing
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        100
      );

      batchingOptimizer.destroy();
      jest.useRealTimers();
    });
  });

  describe('Optimized Execution', () => {
    test('should execute optimized request successfully', async () => {
      const request = { message: 'Hello' };
      const virtualModelId = 'test-model';
      const context = { sessionId: 'test-session', requestId: 'test-request' };

      const result = await optimizer.executeOptimized(
        request,
        virtualModelId,
        mockExecuteFn,
        context
      );

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();

      // Verify integration with dependencies
      expect(mockRoutingOptimizer.getRoutingDecision).toHaveBeenCalled();
      expect(mockIOTracker.startSession).toHaveBeenCalled();
      expect(mockIOTracker.endSession).toHaveBeenCalled();
      expect(mockRoutingOptimizer.recordRequestResult).toHaveBeenCalled();
    });

    test('should use cached result when available', async () => {
      const request = { message: 'Cached request' };
      const virtualModelId = 'test-model';
      const cachedResult: PipelineExecutionResult = {
        success: true,
        response: { content: 'cached response' },
        executionTime: 50,
        steps: [],
        context: {} as PipelineExecutionContext
      };

      // Manually add to cache
      (optimizer as any).addToCache(request, virtualModelId, cachedResult);

      const result = await optimizer.executeOptimized(
        request,
        virtualModelId,
        mockExecuteFn
      );

      expect(result).toBe(cachedResult);
      expect(mockExecuteFn).not.toHaveBeenCalled(); // Should not execute if cached
    });

    test('should handle execution errors gracefully', async () => {
      const request = { message: 'Error request' };
      const virtualModelId = 'test-model';
      const error = new Error('Execution failed');
      mockExecuteFn.mockRejectedValue(error);

      await expect(
        optimizer.executeOptimized(request, virtualModelId, mockExecuteFn)
      ).rejects.toThrow('Execution failed');

      // Verify error was recorded
      expect(mockIOTracker.recordIO).toHaveBeenCalledWith(
        expect.objectContaining({
          moduleId: 'optimizer',
          step: 'execution_error',
          data: { error: 'Execution failed' },
          type: 'error'
        })
      );
    });

    test('should handle caching disabled', async () => {
      const noCacheOptimizer = new PipelineExecutionOptimizer(
        mockRoutingOptimizer,
        mockIOTracker,
        {
          enableCaching: false
        }
      );

      const request = { message: 'Test request' };
      const virtualModelId = 'test-model';

      const result = await noCacheOptimizer.executeOptimized(
        request,
        virtualModelId,
        mockExecuteFn
      );

      expect(result.success).toBe(true);
      expect(mockExecuteFn).toHaveBeenCalled(); // Should execute even if cache might have result

      noCacheOptimizer.destroy();
    });
  });

  describe('Retry Mechanism', () => {
    test('should retry on recoverable errors', async () => {
      const request = { message: 'Retry request' };
      const virtualModelId = 'test-model';

      // Fail first attempt, succeed on second
      mockExecuteFn
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce({
          success: true,
          response: { content: 'retry success' },
          executionTime: 150,
          steps: [],
          context: {} as PipelineExecutionContext
        });

      const result = await optimizer.executeOptimized(
        request,
        virtualModelId,
        mockExecuteFn
      );

      expect(result.success).toBe(true);
      expect(mockExecuteFn).toHaveBeenCalledTimes(2);
    });

    test('should exhaust retry attempts on persistent failure', async () => {
      const request = { message: 'Persistent failure' };
      const virtualModelId = 'test-model';
      const error = new Error('Persistent error');

      mockExecuteFn.mockRejectedValue(error);

      await expect(
        optimizer.executeOptimized(request, virtualModelId, mockExecuteFn)
      ).rejects.toThrow('Persistent error');

      expect(mockExecuteFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    test('should not retry when retry is disabled', async () => {
      const noRetryOptimizer = new PipelineExecutionOptimizer(
        mockRoutingOptimizer,
        mockIOTracker,
        {
          enableRetry: false
        }
      );

      const request = { message: 'No retry request' };
      const virtualModelId = 'test-model';
      const error = new Error('Should not retry');

      mockExecuteFn.mockRejectedValue(error);

      await expect(
        noRetryOptimizer.executeOptimized(request, virtualModelId, mockExecuteFn)
      ).rejects.toThrow('Should not retry');

      expect(mockExecuteFn).toHaveBeenCalledTimes(1); // Only initial attempt

      noRetryOptimizer.destroy();
    });

    test('should use strategy-specific retry delays', async () => {
      const request = { message: 'Strategy retry' };
      const virtualModelId = 'test-model';

      // Network error with specific delay strategy
      const networkError = Object.assign(new Error('Network error'), { code: 'ECONNRESET' });
      mockExecuteFn.mockRejectedValueOnce(networkError);

      const startTime = Date.now();
      await optimizer.executeOptimized(request, virtualModelId, mockExecuteFn);
      const endTime = Date.now();

      // Should have waited for network strategy delay (1000ms)
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });

    test('should update routing decision on retry', async () => {
      const request = { message: 'Routing update' };
      const virtualModelId = 'test-model';

      // Fail first attempt
      mockExecuteFn.mockRejectedValueOnce(new Error('ECONNRESET'));

      // Return different provider on retry
      mockRoutingOptimizer.getRoutingDecision
        .mockResolvedValueOnce({ providerId: 'provider-1' })
        .mockResolvedValueOnce({ providerId: 'provider-2' });

      const context = { sessionId: 'test-session' };

      await optimizer.executeOptimized(
        request,
        virtualModelId,
        mockExecuteFn,
        context
      );

      // Should have called routing decision twice
      expect(mockRoutingOptimizer.getRoutingDecision).toHaveBeenCalledTimes(2);

      // Context should have been updated with new provider
      expect(context?.providerId).toBe('provider-2');
    });

    test('should handle routing decision update failure gracefully', async () => {
      const request = { message: 'Routing failure' };
      const virtualModelId = 'test-model';

      mockExecuteFn.mockRejectedValueOnce(new Error('ECONNRESET'));

      // Fail routing decision on retry
      mockRoutingOptimizer.getRoutingDecision
        .mockResolvedValueOnce({ providerId: 'provider-1' })
        .mockRejectedValueOnce(new Error('Routing failed'));

      // Should still complete execution without throwing routing error
      await expect(
        optimizer.executeOptimized(request, virtualModelId, mockExecuteFn)
      ).resolves.toBeDefined();
    });
  });

  describe('Concurrency Control', () => {
    test('should respect concurrency limits', async () => {
      const limitedOptimizer = new PipelineExecutionOptimizer(
        mockRoutingOptimizer,
        mockIOTracker,
        {
          enableConcurrency: true,
          maxConcurrency: 2
        }
      );

      const request = { message: 'Concurrency test' };
      const virtualModelId = 'test-model';

      // Mock slow execution
      let executionCount = 0;
      mockExecuteFn.mockImplementation(async () => {
        executionCount++;
        if (executionCount > 2) {
          // Should not execute more than 2 concurrently
          throw new Error('Concurrency limit exceeded');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          success: true,
          response: { content: 'slow response' },
          executionTime: 100,
          steps: [],
          context: {} as PipelineExecutionContext
        };
      });

      // Start multiple concurrent requests
      const promises = Array(5).fill(null).map(() =>
        limitedOptimizer.executeOptimized(request, virtualModelId, mockExecuteFn)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);

      limitedOptimizer.destroy();
    });

    test('should queue requests when concurrency limit reached', async () => {
      const optimizerInstance = optimizer as any;
      const originalSemaphore = { ...optimizerInstance.concurrencySemaphore };

      // Manually set semaphore to simulate max concurrency
      optimizerInstance.concurrencySemaphore.value = 5;
      optimizerInstance.config.maxConcurrency = 5;

      const request = { message: 'Queue test' };
      const virtualModelId = 'test-model';

      let resolveQueue: ((value: any) => void) | null = null;
      const queuePromise = new Promise(resolve => {
        resolveQueue = resolve;
      });

      // Mock execution that waits for queue
      mockExecuteFn.mockImplementation(async () => {
        // Simulate queuing
        if (optimizerInstance.concurrencySemaphore.waiting.length > 0) {
          resolveQueue?.(true);
        }
        return {
          success: true,
          response: { content: 'queued response' },
          executionTime: 50,
          steps: [],
          context: {} as PipelineExecutionContext
        };
      });

      // Start request that should be queued
      const executionPromise = optimizer.executeOptimized(
        request,
        virtualModelId,
        mockExecuteFn
      );

      // Wait for queue to be established
      await queuePromise!;

      expect(optimizerInstance.concurrencySemaphore.waiting.length).toBeGreaterThan(0);

      // Restore original semaphore
      optimizerInstance.concurrencySemaphore = originalSemaphore;

      await executionPromise;
    });

    test('should handle concurrency disabled', async () => {
      const noConcurrencyOptimizer = new PipelineExecutionOptimizer(
        mockRoutingOptimizer,
        mockIOTracker,
        {
          enableConcurrency: false
        }
      );

      const request = { message: 'No concurrency test' };
      const virtualModelId = 'test-model';

      const result = await noConcurrencyOptimizer.executeOptimized(
        request,
        virtualModelId,
        mockExecuteFn
      );

      expect(result.success).toBe(true);

      noConcurrencyOptimizer.destroy();
    });
  });

  describe('Caching', () => {
    test('should cache successful execution results', async () => {
      const request = { message: 'Cache me' };
      const virtualModelId = 'test-model';

      const result = await optimizer.executeOptimized(
        request,
        virtualModelId,
        mockExecuteFn
      );

      expect(result.success).toBe(true);

      // Verify cache contains the result
      const cachedResult = (optimizer as any).getFromCache(request, virtualModelId);
      expect(cachedResult).toBe(result);
    });

    test('should not cache failed execution results', async () => {
      const request = { message: 'Failed execution' };
      const virtualModelId = 'test-model';
      const error = new Error('Execution failed');

      mockExecuteFn.mockRejectedValue(error);

      await expect(
        optimizer.executeOptimized(request, virtualModelId, mockExecuteFn)
      ).rejects.toThrow('Execution failed');

      // Verify cache does not contain failed result
      const cachedResult = (optimizer as any).getFromCache(request, virtualModelId);
      expect(cachedResult).toBeNull();
    });

    test('should respect cache TTL', async () => {
      const shortTtlOptimizer = new PipelineExecutionOptimizer(
        mockRoutingOptimizer,
        mockIOTracker,
        {
          enableCaching: true,
          cacheTTL: 100 // Very short TTL for testing
        }
      );

      const request = { message: 'Short TTL' };
      const virtualModelId = 'test-model';

      const result = await shortTtlOptimizer.executeOptimized(
        request,
        virtualModelId,
        mockExecuteFn
      );

      expect(result.success).toBe(true);

      // Verify cache contains result initially
      let cachedResult = (shortTtlOptimizer as any).getFromCache(request, virtualModelId);
      expect(cachedResult).toBe(result);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify cache no longer contains result
      cachedResult = (shortTtlOptimizer as any).getFromCache(request, virtualModelId);
      expect(cachedResult).toBeNull();

      shortTtlOptimizer.destroy();
    });

    test('should generate correct cache keys', () => {
      const optimizerInstance = optimizer as any;

      const request1 = { message: 'Test 1' };
      const request2 = { message: 'Test 2' };
      const virtualModelId = 'test-model';

      const key1 = optimizerInstance.generateCacheKey(request1, virtualModelId);
      const key2 = optimizerInstance.generateCacheKey(request2, virtualModelId);

      expect(key1).not.toBe(key2);
      expect(key1).toContain(virtualModelId);
      expect(key2).toContain(virtualModelId);
    });

    test('should cleanup expired cache items', () => {
      const optimizerInstance = optimizer as any;

      // Add expired items to cache
      const expiredItem = {
        key: 'expired',
        value: { success: true },
        timestamp: Date.now() - 1000, // 1 second ago
        ttl: 500, // 0.5 seconds TTL
        hitCount: 0
      };

      const validItem = {
        key: 'valid',
        value: { success: true },
        timestamp: Date.now(),
        ttl: 10000,
        hitCount: 0
      };

      optimizerInstance.cache.set('expired', expiredItem);
      optimizerInstance.cache.set('valid', validItem);

      // Trigger cleanup
      optimizerInstance.cleanupCache();

      expect(optimizerInstance.cache.has('expired')).toBe(false);
      expect(optimizerInstance.cache.has('valid')).toBe(true);
    });
  });

  describe('Batching', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should add requests to batch queue when batching enabled', async () => {
      const batchingOptimizer = new PipelineExecutionOptimizer(
        mockRoutingOptimizer,
        mockIOTracker,
        {
          enableBatching: true,
          batchSize: 2,
          batchTimeout: 100
        }
      );

      const request = { message: 'Batch me' };
      const virtualModelId = 'test-model';

      const promise = batchingOptimizer.addToBatch(request, virtualModelId);

      // Verify request was added to queue
      expect((batchingOptimizer as any).batchQueue).toHaveLength(1);

      // Advance timer to trigger batch processing
      jest.advanceTimersByTime(150);

      batchingOptimizer.destroy();
    });

    test('should process batch when size limit reached', async () => {
      const batchingOptimizer = new PipelineExecutionOptimizer(
        mockRoutingOptimizer,
        mockIOTracker,
        {
          enableBatching: true,
          batchSize: 2,
          batchTimeout: 1000
        }
      );

      const request = { message: 'Batch request' };
      const virtualModelId = 'test-model';

      // Add requests to reach batch size limit
      await batchingOptimizer.addToBatch(request, virtualModelId);
      await batchingOptimizer.addToBatch(request, virtualModelId);

      // Batch should be processed immediately when size limit reached
      expect((batchingOptimizer as any).batchQueue).toHaveLength(0);

      batchingOptimizer.destroy();
    });

    test('should handle batch processing errors gracefully', async () => {
      const batchingOptimizer = new PipelineExecutionOptimizer(
        mockRoutingOptimizer,
        mockIOTracker,
        {
          enableBatching: true,
          batchSize: 1,
          batchTimeout: 100
        }
      );

      // Mock processBatch to throw error
      const originalProcessBatch = (batchingOptimizer as any).processBatch;
      (batchingOptimizer as any).processBatch = jest.fn().mockRejectedValue(new Error('Batch failed'));

      const request = { message: 'Failed batch' };
      const virtualModelId = 'test-model';

      const promise = batchingOptimizer.addToBatch(request, virtualModelId);

      // Advance timer to trigger batch processing
      jest.advanceTimersByTime(150);

      // Should handle error gracefully
      await expect(promise).resolves.toBeDefined();

      // Restore original method
      (batchingOptimizer as any).processBatch = originalProcessBatch;
      batchingOptimizer.destroy();
    });
  });

  describe('Retry Strategies', () => {
    test('should retry on network errors', () => {
      const optimizerInstance = optimizer as any;
      const networkStrategy = optimizerInstance.retryStrategies.get('network');

      expect(networkStrategy).toBeDefined();
      expect(networkStrategy?.maxRetries).toBe(3);
      expect(networkStrategy?.delays).toEqual([1000, 2000, 4000]);

      const networkError = { code: 'ECONNRESET' };
      const shouldRetry = networkStrategy?.conditions.some(condition => condition(networkError));

      expect(shouldRetry).toBe(true);
    });

    test('should retry on server errors', () => {
      const optimizerInstance = optimizer as any;
      const serverStrategy = optimizerInstance.retryStrategies.get('server');

      expect(serverStrategy).toBeDefined();
      expect(serverStrategy?.maxRetries).toBe(2);

      const serverError = { status: 500 };
      const shouldRetry = serverStrategy?.conditions.some(condition => condition(serverError));

      expect(shouldRetry).toBe(true);
    });

    test('should retry on rate limit errors', () => {
      const optimizerInstance = optimizer as any;
      const rateLimitStrategy = optimizerInstance.retryStrategies.get('rate-limit');

      expect(rateLimitStrategy).toBeDefined();
      expect(rateLimitStrategy?.maxRetries).toBe(3);

      const rateLimitError = { status: 429 };
      const shouldRetry = rateLimitStrategy?.conditions.some(condition => condition(rateLimitError));

      expect(shouldRetry).toBe(true);
    });

    test('should use default retry behavior for unknown errors', () => {
      const shouldRetry = (optimizer as any).shouldRetry({ code: 'UNKNOWN_ERROR' });
      expect(shouldRetry).toBe(false);
    });

    test('should use exponential backoff for unknown retryable errors', () => {
      const optimizerInstance = optimizer as any;
      const unknownError = { code: 'ECONNRESET' }; // This should match default conditions
      const delay = optimizerInstance.getRetryDelay(2, unknownError);

      expect(delay).toBe(optimizerInstance.config.retryDelay * Math.pow(2, 2)); // 4x base delay
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide optimization statistics', () => {
      const stats = optimizer.getOptimizationStats();

      expect(stats).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(stats.concurrency).toBeDefined();
      expect(stats.batching).toBeDefined();
      expect(stats.retry).toBeDefined();

      expect(stats.cache.size).toBeGreaterThanOrEqual(0);
      expect(stats.concurrency.active).toBeGreaterThanOrEqual(0);
      expect(stats.concurrency.max).toBeGreaterThan(0);
    });

    test('should calculate cache hit rate correctly', () => {
      const optimizerInstance = optimizer as any;

      // Add items with different hit counts
      optimizerInstance.cache.set('item1', {
        key: 'item1',
        value: { success: true },
        timestamp: Date.now(),
        ttl: 10000,
        hitCount: 5
      });

      optimizerInstance.cache.set('item2', {
        key: 'item2',
        value: { success: true },
        timestamp: Date.now(),
        ttl: 10000,
        hitCount: 3
      });

      optimizerInstance.cache.set('item3', {
        key: 'item3',
        value: { success: true },
        timestamp: Date.now(),
        ttl: 10000,
        hitCount: 0
      });

      const hitRate = optimizerInstance.calculateCacheHitRate();
      const expectedHitRate = (5 + 3) / (5 + 1 + 3 + 1 + 0 + 1); // hits / (hits + misses)

      expect(hitRate).toBeCloseTo(expectedHitRate, 2);
    });

    test('should handle empty cache in hit rate calculation', () => {
      const optimizerInstance = optimizer as any;
      optimizerInstance.cache.clear();

      const hitRate = optimizerInstance.calculateCacheHitRate();
      expect(hitRate).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    test('should generate unique request IDs', () => {
      const optimizerInstance = optimizer as any;
      const id1 = optimizerInstance.generateRequestId();
      const id2 = optimizerInstance.generateRequestId();

      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should generate unique session IDs', () => {
      const optimizerInstance = optimizer as any;
      const id1 = optimizerInstance.generateSessionId();
      const id2 = optimizerInstance.generateSessionId();

      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should generate unique batch IDs', () => {
      const optimizerInstance = optimizer as any;
      const id1 = optimizerInstance.generateBatchId();
      const id2 = optimizerInstance.generateBatchId();

      expect(id1).toMatch(/^batch_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^batch_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should return virtual model object', () => {
      const optimizerInstance = optimizer as any;
      const virtualModel = optimizerInstance.getVirtualModel('test-model');

      expect(virtualModel).toBeDefined();
      expect(virtualModel.id).toBe('test-model');
      expect(virtualModel.name).toBe('test-model');
      expect(virtualModel.targets).toHaveLength(1);
    });

    test('should sleep for specified duration', async () => {
      const optimizerInstance = optimizer as any;
      const startTime = Date.now();

      await optimizerInstance.sleep(100);

      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(95); // Allow some variance
    });
  });

  describe('Destruction and Cleanup', () => {
    test('should destroy optimizer and cleanup resources', () => {
      // Add some items to various data structures
      (optimizer as any).batchQueue.push({
        id: 'test-batch',
        requests: [],
        timestamp: Date.now(),
        timeout: setTimeout(() => {}, 1000)
      });

      (optimizer as any).cache.set('test-key', {
        key: 'test-key',
        value: { success: true },
        timestamp: Date.now(),
        ttl: 10000,
        hitCount: 0
      });

      (optimizer as any).activeRequests.set('test-request', Promise.resolve());

      expect(() => {
        optimizer.destroy();
      }).not.toThrow();

      // Verify cleanup
      expect((optimizer as any).batchQueue).toHaveLength(0);
      expect((optimizer as any).cache.size).toBe(0);
      expect((optimizer as any).activeRequests.size).toBe(0);
    });

    test('should handle multiple destroy calls', () => {
      optimizer.destroy();
      expect(() => {
        optimizer.destroy();
      }).not.toThrow();
    });

    test('should clear waiting queue on destroy', () => {
      const optimizerInstance = optimizer as any;

      // Add items to waiting queue
      optimizerInstance.concurrencySemaphore.waiting.push(jest.fn());
      optimizerInstance.concurrencySemaphore.waiting.push(jest.fn());

      optimizer.destroy();

      expect(optimizerInstance.concurrencySemaphore.waiting).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing context in executeOptimized', async () => {
      const request = { message: 'No context' };
      const virtualModelId = 'test-model';

      const result = await optimizer.executeOptimized(
        request,
        virtualModelId,
        mockExecuteFn
        // No context provided
      );

      expect(result.success).toBe(true);
      expect(result.context.sessionId).toBeDefined();
      expect(result.context.requestId).toBeDefined();
    });

    test('should handle routing decision failure', async () => {
      mockRoutingOptimizer.getRoutingDecision.mockRejectedValue(new Error('Routing failed'));

      const request = { message: 'Routing failure' };
      const virtualModelId = 'test-model';

      await expect(
        optimizer.executeOptimized(request, virtualModelId, mockExecuteFn)
      ).rejects.toThrow('Routing failed');
    });

    test('should handle IO tracking errors gracefully', async () => {
      mockIOTracker.startSession.mockImplementation(() => {
        throw new Error('IO tracking failed');
      });

      const request = { message: 'IO error' };
      const virtualModelId = 'test-model';

      // Should still execute despite IO tracking failure
      await expect(
        optimizer.executeOptimized(request, virtualModelId, mockExecuteFn)
      ).resolves.toBeDefined();
    });

    test('should handle empty cache key generation', () => {
      const optimizerInstance = optimizer as any;
      const key = optimizerInstance.generateCacheKey({}, 'test-model');

      expect(key).toBe('test-model_{}');
    });
  });
});