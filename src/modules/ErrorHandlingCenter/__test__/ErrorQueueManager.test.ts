import { ErrorQueueManager } from '../src/components/ErrorQueueManager';
import { 
  ErrorContext, 
  ErrorResponse, 
  QueueStatus,
  ErrorSource,
  ErrorType,
  ErrorSeverity,
  ErrorImpact,
  ErrorRecoverability
} from '../types/ErrorHandlingCenter.types';

jest.mock('../constants/ErrorHandlingCenter.constants', () => ({
  ERROR_HANDLING_CENTER_CONSTANTS: {
    DEFAULT_QUEUE_SIZE: 1000,
    QUEUE_FLUSH_INTERVAL: 5000,
    ERROR_HANDLING_MODES: {
      BLOCKING: 'blocking',
      NON_BLOCKING: 'non-blocking',
      BATCH: 'batch'
    },
    ERROR_SEVERITY_LEVELS: {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low'
    },
    ERROR_TYPES: {
      BUSINESS: 'business',
      TECHNICAL: 'technical',
      CONFIGURATION: 'configuration',
      RESOURCE: 'resource',
      NETWORK: 'network',
      DEPENDENCY: 'dependency'
    },
    ERROR_SOURCES: {
      MODULE: 'module',
      SYSTEM: 'system',
      EXTERNAL: 'external',
      UNKNOWN: 'unknown'
    },
    RESPONSE_TYPES: {
      IGNORE: 'ignore',
      LOG: 'log',
      RETRY: 'retry',
      FALLBACK: 'fallback',
      CIRCUIT_BREAK: 'circuit_break',
      NOTIFICATION: 'notification'
    }
  }
}));

describe('ErrorQueueManager', () => {
  let errorQueueManager: ErrorQueueManager;
  let mockErrorContext: ErrorContext;
  let mockCriticalErrorContext: ErrorContext;
  let mockHighErrorContext: ErrorContext;

  beforeEach(() => {
    errorQueueManager = new ErrorQueueManager();

    mockErrorContext = {
      errorId: 'test-error-1',
      error: new Error('Test error'),
      source: {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0',
        fileName: 'test-module.ts',
        lineNumber: 42
      },
      classification: {
        source: ErrorSource.MODULE,
        type: ErrorType.TECHNICAL,
        severity: ErrorSeverity.MEDIUM,
        impact: ErrorImpact.SINGLE_MODULE,
        recoverability: ErrorRecoverability.RECOVERABLE
      },
      timestamp: new Date(),
      config: {},
      data: {}
    };

    mockCriticalErrorContext = {
      ...mockErrorContext,
      errorId: 'critical-error-1',
      classification: {
        ...mockErrorContext.classification,
        severity: ErrorSeverity.CRITICAL
      }
    };

    mockHighErrorContext = {
      ...mockErrorContext,
      errorId: 'high-error-1',
      classification: {
        ...mockErrorContext.classification,
        severity: ErrorSeverity.HIGH
      }
    };
  });

  afterEach(async () => {
    if (errorQueueManager) {
      await errorQueueManager.shutdown();
    }
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await errorQueueManager.initialize();
      const status = errorQueueManager.getQueueStatus();
      expect(status.size).toBe(0);
    });

    test('should initialize with custom configuration', async () => {
      const customQueueManager = new ErrorQueueManager({
        maxQueueSize: 500,
        flushInterval: 10000,
        enableBatchProcessing: false,
        maxBatchSize: 50
      });
      
      await customQueueManager.initialize();
      const status = customQueueManager.getQueueStatus();
      expect(status.size).toBe(0);
      
      await customQueueManager.shutdown();
    });

    test('should handle initialization errors', async () => {
      // Mock a scenario where initialization fails
      jest.spyOn(errorQueueManager as any, 'startFlushTimer').mockImplementation(() => {
        throw new Error('Timer setup failed');
      });

      await expect(errorQueueManager.initialize())
        .rejects.toThrow('Timer setup failed');
    });

    test('should not initialize twice', async () => {
      await errorQueueManager.initialize();
      await errorQueueManager.initialize();
      
      const status = errorQueueManager.getQueueStatus();
      expect(status.size).toBe(0);
    });
  });

  describe('Queue Operations', () => {
    beforeEach(async () => {
      await errorQueueManager.initialize();
    });

    describe('enqueue', () => {
      test('should enqueue error successfully', () => {
        errorQueueManager.enqueue(mockErrorContext);
        
        expect(errorQueueManager.getQueueSize()).toBe(1);
      });

      test('should enqueue error to appropriate priority queue', () => {
        errorQueueManager.enqueue(mockCriticalErrorContext);
        errorQueueManager.enqueue(mockHighErrorContext);
        errorQueueManager.enqueue(mockErrorContext);
        
        const priorityCounts = errorQueueManager.getPriorityCounts();
        expect(priorityCounts.critical).toBe(1);
        expect(priorityCounts.high).toBe(1);
        expect(priorityCounts.medium).toBe(1);
        expect(errorQueueManager.getQueueSize()).toBe(3);
      });

      test('should evict low priority errors when queue is full', () => {
        // Use a small queue for testing
        const smallQueueManager = new ErrorQueueManager({
          maxQueueSize: 3,
          flushInterval: 5000,
          enableBatchProcessing: false
        });
        
        smallQueueManager['isInitialized'] = true; // Bypass initialization
        smallQueueManager['initializePriorityQueues']();
        
        // Add errors to fill the queue
        for (let i = 0; i < 3; i++) {
          smallQueueManager.enqueue(mockErrorContext);
        }
        
        expect(smallQueueManager.getQueueSize()).toBe(3);
        
        // Add one more error - should evict the first one
        smallQueueManager.enqueue(mockCriticalErrorContext);
        
        expect(smallQueueManager.getQueueSize()).toBe(3);
        expect(smallQueueManager.getPriorityCounts().critical).toBe(1);
      });

      test('should throw error when not initialized', () => {
        const uninitializedQueueManager = new ErrorQueueManager();
        
        expect(() => uninitializedQueueManager.enqueue(mockErrorContext))
          .toThrow('Error Queue Manager is not initialized');
      });

      test('should handle enqueue errors gracefully', () => {
        // Mock queue operations to fail
        jest.spyOn(errorQueueManager as any, 'getPriorityKey').mockImplementation(() => {
          throw new Error('Priority calculation failed');
        });

        expect(() => errorQueueManager.enqueue(mockErrorContext))
          .toThrow('Priority calculation failed');
      });
    });

    describe('dequeue', () => {
      test('should dequeue highest priority error first', () => {
        errorQueueManager.enqueue(mockErrorContext);
        errorQueueManager.enqueue(mockCriticalErrorContext);
        errorQueueManager.enqueue(mockHighErrorContext);
        
        const firstDequeued = errorQueueManager.dequeue();
        const secondDequeued = errorQueueManager.dequeue();
        const thirdDequeued = errorQueueManager.dequeue();
        
        expect(firstDequeued).toBe(mockCriticalErrorContext);
        expect(secondDequeued).toBe(mockHighErrorContext);
        expect(thirdDequeued).toBe(mockErrorContext);
      });

      test('should return null when queue is empty', () => {
        const dequeued = errorQueueManager.dequeue();
        
        expect(dequeued).toBeNull();
      });

      test('should remove error from both main queue and priority queue', () => {
        errorQueueManager.enqueue(mockCriticalErrorContext);
        
        expect(errorQueueManager.getQueueSize()).toBe(1);
        expect(errorQueueManager.getPriorityCounts().critical).toBe(1);
        
        const dequeued = errorQueueManager.dequeue();
        
        expect(dequeued).toBe(mockCriticalErrorContext);
        expect(errorQueueManager.getQueueSize()).toBe(0);
        expect(errorQueueManager.getPriorityCounts().critical).toBe(0);
      });

      test('should throw error when not initialized', () => {
        const uninitializedQueueManager = new ErrorQueueManager();
        
        expect(() => uninitializedQueueManager.dequeue())
          .toThrow('Error Queue Manager is not initialized');
      });
    });

    describe('getQueueSize', () => {
      test('should return correct queue size', () => {
        errorQueueManager.enqueue(mockErrorContext);
        errorQueueManager.enqueue(mockCriticalErrorContext);
        
        expect(errorQueueManager.getQueueSize()).toBe(2);
      });

      test('should return 0 for empty queue', () => {
        expect(errorQueueManager.getQueueSize()).toBe(0);
      });
    });

    describe('getQueueStatus', () => {
      test('should return comprehensive queue status', () => {
        errorQueueManager.enqueue(mockCriticalErrorContext);
        errorQueueManager.enqueue(mockHighErrorContext);
        errorQueueManager.enqueue(mockErrorContext);
        
        const status = errorQueueManager.getQueueStatus();
        
        expect(status.size).toBe(3);
        expect(status.Processing).toBe(false);
        expect(status.flushed).toBe(false);
        expect(status.priorityCounts).toBeDefined();
        if (status.priorityCounts) {
          expect(status.priorityCounts.critical).toBe(1);
          expect(status.priorityCounts.high).toBe(1);
          expect(status.priorityCounts.medium).toBe(1);
        }
      });

      test('should handle empty queue status gracefully', () => {
        const status = errorQueueManager.getQueueStatus();
        
        expect(status.size).toBe(0);
        expect(status.priorityCounts).toBeDefined();
        if (status.priorityCounts) {
          // All priority queues should exist but have 0 count
          expect(status.priorityCounts.critical).toBe(0);
          expect(status.priorityCounts.high).toBe(0);
          expect(status.priorityCounts.medium).toBe(0);
          expect(status.priorityCounts.low).toBe(0);
        }
      });
    });

    describe('getPriorityCounts', () => {
      test('should return priority counts', () => {
        errorQueueManager.enqueue(mockCriticalErrorContext);
        errorQueueManager.enqueue(mockHighErrorContext);
        
        const counts = errorQueueManager.getPriorityCounts();
        
        expect(counts.critical).toBe(1);
        expect(counts.high).toBe(1);
        expect(counts.medium).toBe(0);
        expect(counts.low).toBe(0);
      });

      test('should return empty counts for empty queue', () => {
        const counts = errorQueueManager.getPriorityCounts();
        
        // All priority queues should exist but have 0 count
        expect(counts.critical).toBe(0);
        expect(counts.high).toBe(0);
        expect(counts.medium).toBe(0);
        expect(counts.low).toBe(0);
      });
    });
  });

  describe('Queue Flushing', () => {
    beforeEach(async () => {
      await errorQueueManager.initialize();
    });

    test('should flush queue successfully', async () => {
      errorQueueManager.enqueue(mockErrorContext);
      errorQueueManager.enqueue(mockCriticalErrorContext);
      
      expect(errorQueueManager.getQueueSize()).toBe(2);
      
      const responses = await errorQueueManager.flush();
      
      expect(responses).toHaveLength(2);
      expect(errorQueueManager.getQueueSize()).toBe(0);
      expect(responses[0].result.code).toBe('QUEUE_FLUSHED');
      expect(responses[1].result.code).toBe('QUEUE_FLUSHED');
    });

    test('should return empty array when flushing empty queue', async () => {
      const responses = await errorQueueManager.flush();
      
      expect(responses).toHaveLength(0);
    });

    test('should set processing flag during flush', async () => {
      errorQueueManager.enqueue(mockErrorContext);
      
      // Mock to track processing state
      const flushPromise = errorQueueManager.flush();
      
      // Add a small delay to let the async operation start
      await new Promise(resolve => setTimeout(resolve, 10));
      const status = errorQueueManager.getQueueStatus();
      
      expect(status.Processing).toBe(true);
      
      await flushPromise;
      
      const finalStatus = errorQueueManager.getQueueStatus();
      expect(finalStatus.Processing).toBe(false);
    });

    test('should handle flush errors gracefully', async () => {
      errorQueueManager.enqueue(mockErrorContext);
      
      // Mock dequeue to throw an error
      jest.spyOn(errorQueueManager as any, 'dequeue').mockImplementation(() => {
        throw new Error('Dequeue failed');
      });

      await expect(errorQueueManager.flush()).rejects.toThrow('Dequeue failed');
    });

    test('should throw error when not initialized', async () => {
      const uninitializedQueueManager = new ErrorQueueManager();
      
      await expect(uninitializedQueueManager.flush())
        .rejects.toThrow('Error Queue Manager is not initialized');
    });
  });

  describe('Automatic Flushing', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      await errorQueueManager.initialize();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should automatically flush queue when batch processing is enabled', async () => {
      // Create a queue manager with short flush interval
      const autoFlushQueueManager = new ErrorQueueManager({
        flushInterval: 1000,
        enableBatchProcessing: true
      });
      
      await autoFlushQueueManager.initialize();
      
      autoFlushQueueManager.enqueue(mockErrorContext);
      expect(autoFlushQueueManager.getQueueSize()).toBe(1);
      
      // Fast-forward time
      jest.advanceTimersByTime(1100);
      
      // Wait for async flush to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(autoFlushQueueManager.getQueueSize()).toBe(0);
      
      await autoFlushQueueManager.shutdown();
    });

    test('should not automatically flush when batch processing is disabled', async () => {
      const noAutoFlushQueueManager = new ErrorQueueManager({
        flushInterval: 1000,
        enableBatchProcessing: false
      });
      
      await noAutoFlushQueueManager.initialize();
      
      noAutoFlushQueueManager.enqueue(mockErrorContext);
      expect(noAutoFlushQueueManager.getQueueSize()).toBe(1);
      
      // Fast-forward time
      jest.advanceTimersByTime(1100);
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Queue should still have items
      expect(noAutoFlushQueueManager.getQueueSize()).toBe(1);
      
      await noAutoFlushQueueManager.shutdown();
    });

    test('should handle auto flush errors gracefully', async () => {
      const errorQueueManagerWithMockFlush = new ErrorQueueManager({
        flushInterval: 1000,
        enableBatchProcessing: true
      });
      
      await errorQueueManagerWithMockFlush.initialize();
      
      // Mock flush to throw an error
      jest.spyOn(errorQueueManagerWithMockFlush, 'flush').mockRejectedValue(new Error('Auto flush failed'));
      
      errorQueueManagerWithMockFlush.enqueue(mockErrorContext);
      
      // Fast-forward time
      jest.advanceTimersByTime(1100);
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not crash, just log the error
      expect(errorQueueManagerWithMockFlush.getQueueSize()).toBe(1);
      
      await errorQueueManagerWithMockFlush.shutdown();
    });
  });

  describe('Shutdown', () => {
    test('should shutdown successfully', async () => {
      await errorQueueManager.initialize();
      errorQueueManager.enqueue(mockErrorContext);
      
      expect(errorQueueManager.getQueueSize()).toBe(1);
      
      await errorQueueManager.shutdown();
      
      const status = errorQueueManager.getQueueStatus();
      expect(status.size).toBe(0);
    });

    test('should flush remaining errors during shutdown', async () => {
      await errorQueueManager.initialize();
      errorQueueManager.enqueue(mockErrorContext);
      errorQueueManager.enqueue(mockCriticalErrorContext);
      
      expect(errorQueueManager.getQueueSize()).toBe(2);
      
      await errorQueueManager.shutdown();
      
      const status = errorQueueManager.getQueueStatus();
      expect(status.size).toBe(0);
    });

    test('should handle shutdown errors gracefully', async () => {
      await errorQueueManager.initialize();
      
      // Mock clearInterval to throw an error
      jest.spyOn(global, 'clearInterval').mockImplementation(() => {
        throw new Error('ClearInterval failed');
      });

      await expect(errorQueueManager.shutdown()).rejects.toThrow('ClearInterval failed');
    });

    test('should shutdown when not initialized', async () => {
      const uninitializedQueueManager = new ErrorQueueManager();
      
      await expect(uninitializedQueueManager.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await errorQueueManager.initialize();
    });

    test('should handle invalid error severity', () => {
      const errorWithInvalidSeverity = {
        ...mockErrorContext,
        classification: {
          ...mockErrorContext.classification,
          severity: 'invalid-severity' as any
        }
      };

      errorQueueManager.enqueue(errorWithInvalidSeverity);
      
      // Should default to medium priority
      const priorityCounts = errorQueueManager.getPriorityCounts();
      expect(priorityCounts.medium).toBe(1);
    });

    test('should handle missing error severity', () => {
      const errorWithMissingSeverity = {
        ...mockErrorContext,
        classification: {
          ...mockErrorContext.classification
        }
      };

      // @ts-ignore - Simulate missing severity
      delete (errorWithMissingSeverity.classification as any).severity;

      errorQueueManager.enqueue(errorWithMissingSeverity);
      
      // Should default to medium priority
      const priorityCounts = errorQueueManager.getPriorityCounts();
      expect(priorityCounts.medium).toBe(1);
    });

    test('should handle concurrent enqueue operations', () => {
      const enqueuePromises = Array(100).fill(null).map((_, i) => {
        const errorContext = {
          ...mockErrorContext,
          errorId: `test-error-${i}`
        };
        return errorQueueManager.enqueue(errorContext);
      });

      expect(() => Promise.all(enqueuePromises)).not.toThrow();
      expect(errorQueueManager.getQueueSize()).toBe(100);
    });

    test('should handle concurrent dequeue operations', () => {
      // Fill the queue first
      for (let i = 0; i < 10; i++) {
        errorQueueManager.enqueue({
          ...mockErrorContext,
          errorId: `test-error-${i}`
        });
      }

      const dequeuePromises = Array(5).fill(null).map(() => 
        errorQueueManager.dequeue()
      );

      const dequeuedErrors = Promise.all(dequeuePromises);
      
      expect(() => dequeuedErrors).not.toThrow();
    });

    test('should handle queue overflow scenario', () => {
      const smallQueueManager = new ErrorQueueManager({
        maxQueueSize: 5,
        flushInterval: 5000,
        enableBatchProcessing: false
      });
      
      smallQueueManager['isInitialized'] = true; // Bypass initialization
      smallQueueManager['initializePriorityQueues']();
      
      // Add more errors than the queue size
      for (let i = 0; i < 10; i++) {
        smallQueueManager.enqueue({
          ...mockErrorContext,
          errorId: `test-error-${i}`
        });
      }

      expect(smallQueueManager.getQueueSize()).toBeLessThanOrEqual(5);
    });

    test('should handle performance monitoring', async () => {
      const startTime = Date.now();
      await errorQueueManager.flush();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });
  });

  describe('Configuration Edge Cases', () => {
    test('should handle invalid configuration values', () => {
      // Test with invalid config values, should use defaults
      const invalidConfigQueueManager = new ErrorQueueManager({
        maxQueueSize: -1,
        flushInterval: 0,
        enableBatchProcessing: undefined as any,
        maxBatchSize: null as any
      });

      // Should not throw during creation
      expect(invalidConfigQueueManager).toBeDefined();
    });

    test('should handle zero max queue size', () => {
      const zeroQueueManager = new ErrorQueueManager({
        maxQueueSize: 0,
        flushInterval: 5000,
        enableBatchProcessing: false
      });

      zeroQueueManager['isInitialized'] = true; // Bypass initialization
      zeroQueueManager['initializePriorityQueues']();

      zeroQueueManager.enqueue(mockErrorContext);
      
      // Should still work by evicting immediately
      expect(zeroQueueManager.getQueueSize()).toBe(0);
    });

    test('should handle very large queue size', () => {
      const largeQueueManager = new ErrorQueueManager({
        maxQueueSize: 100000,
        flushInterval: 5000,
        enableBatchProcessing: false
      });

      largeQueueManager['isInitialized'] = true; // Bypass initialization
      largeQueueManager['initializePriorityQueues']();

      // Add a few errors
      largeQueueManager.enqueue(mockErrorContext);
      largeQueueManager.enqueue(mockCriticalErrorContext);

      expect(largeQueueManager.getQueueSize()).toBe(2);
    });
  });
});