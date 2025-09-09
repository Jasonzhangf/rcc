import { ErrorInterfaceGateway } from '../src/components/ErrorInterfaceGateway';
import { ErrorClassifier } from '../src/components/ErrorClassifier';
import { ErrorQueueManager } from '../src/components/ErrorQueueManager';
import { ModuleRegistryManager } from '../src/components/ModuleRegistryManager';
import { PolicyEngine } from '../src/components/PolicyEngine';
import { ResponseExecutor } from '../src/components/ResponseExecutor';
import { ResponseRouterEngine } from '../src/components/ResponseRouterEngine';
import { ResponseTemplateManager } from '../src/components/ResponseTemplateManager';
import { 
  ErrorContext, 
  ErrorResponse, 
  ModuleRegistration, 
  ResponseHandler,
  ErrorType,
  ErrorSeverity,
  HandlingStatus,
  ActionType,
  ActionStatus
} from '../types/ErrorHandlingCenter.types';

describe('Error Handling Center Performance Tests', () => {
  let errorInterfaceGateway: ErrorInterfaceGateway;
  let errorClassifier: ErrorClassifier;
  let errorQueueManager: ErrorQueueManager;
  let moduleRegistryManager: ModuleRegistryManager;
  let policyEngine: PolicyEngine;
  let responseExecutor: ResponseExecutor;
  let responseRouterEngine: ResponseRouterEngine;
  let responseTemplateManager: ResponseTemplateManager;
  
  let mockModuleHandler: jest.Mocked<ResponseHandler>;
  let mockErrorContext: ErrorContext;

  beforeAll(async () => {
    // Increase test timeout for performance tests
    jest.setTimeout(60000);

    // Initialize all components
    errorClassifier = new ErrorClassifier();
    errorQueueManager = new ErrorQueueManager();
    moduleRegistryManager = new ModuleRegistryManager();
    policyEngine = new PolicyEngine();
    responseTemplateManager = new ResponseTemplateManager();
    
    // Create default handler
    mockModuleHandler = {
      execute: jest.fn()
    } as jest.Mocked<ResponseHandler>;
    
    responseRouterEngine = new ResponseRouterEngine(mockModuleHandler);
    responseExecutor = new ResponseExecutor(policyEngine);
    errorInterfaceGateway = new ErrorInterfaceGateway(errorQueueManager, responseRouterEngine);

    // Initialize all components
    await errorClassifier.initialize();
    await errorQueueManager.initialize();
    await moduleRegistryManager.initialize();
    await policyEngine.initialize();
    await responseTemplateManager.initialize();
    await responseRouterEngine.initialize();
    await responseExecutor.initialize();
    await errorInterfaceGateway.initialize();

    // Setup mock error context
    mockErrorContext = {
      errorId: 'performance-test-error',
      error: new Error('Performance test error message'),
      source: {
        moduleId: 'performance-test-module',
        moduleName: 'PerformanceTestModule',
        version: '1.0.0',
        fileName: 'performance-test-module.ts',
        lineNumber: 42
      },
      classification: {
        source: 'module' as any,
        type: 'technical' as any,
        severity: 'medium' as any,
        impact: 'single_module' as any,
        recoverability: 'recoverable' as any
      },
      timestamp: new Date(),
      config: {},
      data: {}
    };

    // Setup mock handler responses
    mockModuleHandler.execute.mockImplementation(async (errorContext: ErrorContext) => {
      return {
        responseId: `perf-handler-response-${errorContext.errorId}`,
        errorId: errorContext.errorId,
        result: {
          status: 'success' as any,
          message: 'Handler processed error successfully',
          details: `Processed error with ID: ${errorContext.errorId}`,
          code: 'HANDLER_SUCCESS'
        },
        timestamp: new Date(),
        processingTime: Math.floor(Math.random() * 10),
        data: {
          moduleName: errorContext.source.moduleName,
          moduleId: errorContext.source.moduleId,
          response: { message: 'Handler response' },
          config: errorContext.config,
          metadata: { processed: true }
        },
        actions: [],
        annotations: []
      } as ErrorResponse;
    });
  });

  afterAll(async () => {
    // Shutdown all components
    await errorInterfaceGateway.shutdown();
    await responseExecutor.shutdown();
    await responseRouterEngine.shutdown();
    await responseTemplateManager.shutdown();
    await policyEngine.shutdown();
    await moduleRegistryManager.shutdown();
    await errorQueueManager.shutdown();
    await errorClassifier.shutdown();
  });

  describe('Individual Component Performance', () => {
    test('ErrorClassifier should classify errors quickly', async () => {
      const iterations = 10000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const errorContext = {
          ...mockErrorContext,
          errorId: `classify-perf-${i}`,
          error: new Error(`Performance classification error ${i}`)
        };
        
        await errorClassifier.classify(errorContext.error, errorContext.source);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      
      console.log(`ErrorClassifier: ${iterations} classifications in ${totalTime.toFixed(2)}ms, avg ${avgTime.toFixed(4)}ms per classification`);
      
      // Should average less than 1ms per classification
      expect(avgTime).toBeLessThan(1);
    });

    test('ErrorQueueManager should handle queue operations efficiently', async () => {
      const queueManager = new ErrorQueueManager();
      await queueManager.initialize();
      
      const iterations = 50000;
      const startTime = performance.now();
      
      // Enqueue operations
      for (let i = 0; i < iterations; i++) {
        const errorContext = {
          ...mockErrorContext,
          errorId: `queue-perf-${i}`
        };
        queueManager.enqueue(errorContext);
      }
      
      // Dequeue operations
      for (let i = 0; i < iterations; i++) {
        queueManager.dequeue();
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / (iterations * 2); // 2 operations per iteration
      
      console.log(`ErrorQueueManager: ${iterations * 2} operations in ${totalTime.toFixed(2)}ms, avg ${avgTime.toFixed(4)}ms per operation`);
      
      await queueManager.shutdown();
      
      // Should average less than 0.1ms per operation
      expect(avgTime).toBeLessThan(0.1);
    });

    test('ModuleRegistryManager should handle module operations efficiently', async () => {
      const iterations = 10000;
      const startTime = performance.now();
      
      // Register modules
      for (let i = 0; i < iterations; i++) {
        const moduleRegistration: ModuleRegistration = {
          moduleId: `perf-module-${i}`,
          moduleName: `PerfModule${i}`,
          version: '1.0.0'
        } as ModuleRegistration;
        
        moduleRegistryManager.registerModule(moduleRegistration);
      }
      
      // Retrieve modules
      for (let i = 0; i < iterations; i++) {
        moduleRegistryManager.getModule(`perf-module-${i}`);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / (iterations * 2);
      
      console.log(`ModuleRegistryManager: ${iterations * 2} operations in ${totalTime.toFixed(2)}ms, avg ${avgTime.toFixed(4)}ms per operation`);
      
      // Should average less than 0.05ms per operation
      expect(avgTime).toBeLessThan(0.05);
    });

    test('PolicyEngine should execute policies efficiently', async () => {
      const iterations = 5000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const errorContext = {
          ...mockErrorContext,
          errorId: `policy-perf-${i}`
        };
        
        const response: ErrorResponse = {
          responseId: `policy-response-${i}`,
          errorId: `policy-perf-${i}`,
          result: {
            status: 'success' as any,
            message: 'Policy test response',
            details: '',
            code: 'POLICY_TEST'
          },
          timestamp: new Date(),
          processingTime: 0,
          data: {
            moduleName: 'PerformanceTestModule',
            moduleId: 'performance-test-module',
            response: {},
            config: {},
            metadata: {}
          },
          actions: [],
          annotations: []
        };
        
        await policyEngine.executePolicies(errorContext, response);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      
      console.log(`PolicyEngine: ${iterations} policy executions in ${totalTime.toFixed(2)}ms, avg ${avgTime.toFixed(4)}ms per execution`);
      
      // Should average less than 2ms per execution
      expect(avgTime).toBeLessThan(2);
    });

    test('ResponseTemplateManager should generate responses efficiently', async () => {
      const iterations = 10000;
      const template = await responseTemplateManager.getTemplateById('default');
      
      if (template) {
        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
          const errorContext = {
            ...mockErrorContext,
            errorId: `template-perf-${i}`
          };
          
          await responseTemplateManager.generateResponse(template, errorContext);
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;
        
        console.log(`ResponseTemplateManager: ${iterations} response generations in ${totalTime.toFixed(2)}ms, avg ${avgTime.toFixed(4)}ms per generation`);
        
        // Should average less than 0.5ms per generation
        expect(avgTime).toBeLessThan(0.5);
      }
    });
  });

  describe('Component Integration Performance', () => {
    test('InterfaceGateway should handle concurrent requests efficiently', async () => {
      // Register multiple modules for testing
      const moduleCount = 100;
      for (let i = 0; i < moduleCount; i++) {
        const moduleRegistration: ModuleRegistration = {
          moduleId: `concurrent-module-${i}`,
          moduleName: `ConcurrentModule${i}`,
          version: '1.0.0',
          responseHandler: mockModuleHandler
        } as ModuleRegistration;
        
        errorInterfaceGateway.registerModule(moduleRegistration);
      }
      
      const concurrentRequests = 1000;
      const startTime = performance.now();
      
      // Create concurrent processing promises
      const promises = Array(concurrentRequests).fill(null).map((_, i) => {
        const errorContext = {
          ...mockErrorContext,
          errorId: `concurrent-perf-${i}`,
          source: {
            ...mockErrorContext.source,
            moduleId: `concurrent-module-${i % moduleCount}`
          }
        };
        
        return errorInterfaceGateway.handleError(errorContext);
      });
      
      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / concurrentRequests;
      
      console.log(`InterfaceGateway: ${concurrentRequests} concurrent requests in ${totalTime.toFixed(2)}ms, avg ${avgTime.toFixed(4)}ms per request`);
      
      // Verify all requests completed
      expect(responses).toHaveLength(concurrentRequests);
      expect(responses.every(r => r.result.status === 'success')).toBe(true);
      
      // Should average less than 10ms per request
      expect(avgTime).toBeLessThan(10);
    });

    test('ResponseExecutor should handle batch operations efficiently', async () => {
      const batchSize = 1000;
      
      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'batch-perf-module',
        moduleName: 'BatchPerfModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;
      
      responseRouterEngine.registerModule(moduleRegistration);
      
      const batchErrors = Array(batchSize).fill(null).map((_, i) => ({
        ...mockErrorContext,
        errorId: `batch-perf-${i}`,
        error: new Error(`Batch performance error ${i}`)
      }));
      
      const startTime = performance.now();
      const responses = await responseExecutor.executeBatch(batchErrors, mockModuleHandler);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / batchSize;
      
      console.log(`ResponseExecutor: ${batchSize} batch operations in ${totalTime.toFixed(2)}ms, avg ${avgTime.toFixed(4)}ms per operation`);
      
      // Verify all operations completed
      expect(responses).toHaveLength(batchSize);
      
      // Should average less than 2ms per operation
      expect(avgTime).toBeLessThan(2);
    });

    test('RouterEngine should route errors quickly with many rules', async () => {
      // Add many routing rules
      const ruleCount = 1000;
      for (let i = 0; i < ruleCount; i++) {
        const rule = {
          ruleId: `perf-rule-${i}`,
          name: `PerformanceRule${i}`,
          priority: Math.floor(Math.random() * 100),
          condition: {
            moduleIds: [`perf-module-${i}`]
          },
          handler: mockModuleHandler,
          enabled: i % 2 === 0 // Enable every other rule
        };
        
        responseRouterEngine.registerRoute(rule);
      }
      
      const routingTests = 10000;
      const startTime = performance.now();
      
      for (let i = 0; i < routingTests; i++) {
        const errorContext = {
          ...mockErrorContext,
          errorId: `routing-perf-${i}`,
          source: {
            ...mockErrorContext.source,
            moduleId: `perf-module-${i % ruleCount}`
          }
        };
        
        await responseRouterEngine.route(errorContext);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / routingTests;
      
      console.log(`RouterEngine: ${routingTests} routing operations with ${ruleCount} rules in ${totalTime.toFixed(2)}ms, avg ${avgTime.toFixed(4)}ms per routing`);
      
      // Should average less than 0.2ms per routing
      expect(avgTime).toBeLessThan(0.2);
    });
  });

  describe('Memory Performance', () => {
    test('Components should maintain stable memory usage under load', async () => {
      // Measure initial memory
      const initialMemory = process.memoryUsage();
      
      // Perform intensive operations
      const iterations = 50000;
      
      for (let i = 0; i < iterations; i++) {
        // Classify error
        const errorContext = {
          ...mockErrorContext,
          errorId: `memory-test-${i}`,
          error: new Error(`Memory test error ${i}`)
        };
        
        await errorClassifier.classify(errorContext.error, errorContext.source);
        
        // Queue operations
        errorQueueManager.enqueue(errorContext);
        if (i % 1000 === 0) {
          errorQueueManager.dequeue();
        }
        
        // Module operations
        if (i % 5000 === 0) {
          const moduleRegistration: ModuleRegistration = {
            moduleId: `memory-module-${i}`,
            moduleName: `MemoryModule${i}`,
            version: '1.0.0'
          } as ModuleRegistration;
          
          moduleRegistryManager.registerModule(moduleRegistration);
          moduleRegistryManager.getModule(`memory-module-${i}`);
        }
      }
      
      // Measure final memory
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Memory usage: ${initialMemory.heapUsed} -> ${finalMemory.heapUsed}, increase: ${memoryIncrease} bytes`);
      
      // Memory should not increase excessively (less than 50MB for 50k operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('Template caching should reduce memory allocation', async () => {
      const template = await responseTemplateManager.getTemplateById('default');
      if (template) {
        // Measure memory before caching
        const beforeCacheMemory = process.memoryUsage();
        
        // Generate many responses (should be cached)
        const cachedGenerations = 10000;
        const responses = [];
        
        for (let i = 0; i < cachedGenerations; i++) {
          const errorContext = {
            ...mockErrorContext,
            errorId: `cache-test-${i}`
          };
          
          const response = await responseTemplateManager.generateResponse(template, errorContext);
          responses.push(response);
        }
        
        // Measure memory after caching
        const afterCacheMemory = process.memoryUsage();
        const memoryIncrease = afterCacheMemory.heapUsed - beforeCacheMemory.heapUsed;
        
        console.log(`Template caching: ${cachedGenerations} generations, memory increase: ${memoryIncrease} bytes`);
        
        // Verify caching worked (responses should be mostly identical for same template)
        expect(responses.length).toBe(cachedGenerations);
        
        // Memory increase should be reasonable (less than 10MB for 10k cached responses)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });

  describe('Scalability Performance', () => {
    test('System should scale with increasing module count', async () => {
      // Test with increasing numbers of modules
      const moduleCounts = [100, 500, 1000, 2000];
      const results: { modules: number; timePerRequest: number; memoryUsage: number }[] = [];
      
      for (const moduleCount of moduleCounts) {
        // Register modules
        for (let i = 0; i < moduleCount; i++) {
          const moduleRegistration: ModuleRegistration = {
            moduleId: `scale-module-${i}`,
            moduleName: `ScaleModule${i}`,
            version: '1.0.0',
            responseHandler: mockModuleHandler
          } as ModuleRegistration;
          
          errorInterfaceGateway.registerModule(moduleRegistration);
        }
        
        // Test performance
        const testRequests = 1000;
        const startTime = performance.now();
        
        const promises = Array(testRequests).fill(null).map((_, i) => {
          const errorContext = {
            ...mockErrorContext,
            errorId: `scale-test-${i}`,
            source: {
              ...mockErrorContext.source,
              moduleId: `scale-module-${i % moduleCount}`
            }
          };
          
          return errorInterfaceGateway.handleError(errorContext);
        });
        
        await Promise.all(promises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / testRequests;
        
        const memoryUsage = process.memoryUsage().heapUsed;
        
        results.push({
          modules: moduleCount,
          timePerRequest: avgTime,
          memoryUsage
        });
        
        console.log(`Scale test: ${moduleCount} modules, ${avgTime.toFixed(4)}ms per request, ${memoryUsage} bytes memory`);
      }
      
      // Verify performance scales reasonably
      // Time per request should not increase exponentially
      for (let i = 1; i < results.length; i++) {
        const previous = results[i - 1];
        const current = results[i];
        
        // Time increase should be reasonable (less than 5x for 20x more modules)
        const timeRatio = current.timePerRequest / previous.timePerRequest;
        const moduleRatio = current.modules / previous.modules;
        
        expect(timeRatio).toBeLessThan(moduleRatio * 2); // Allow some overhead
      }
    });

    test('Queue should handle large backlogs efficiently', async () => {
      const largeQueueManager = new ErrorQueueManager({
        maxQueueSize: 100000,
        flushInterval: 5000,
        enableBatchProcessing: false
      });
      
      await largeQueueManager.initialize();
      
      const backlogSize = 50000;
      const startTime = performance.now();
      
      // Fill queue with backlog
      for (let i = 0; i < backlogSize; i++) {
        const errorContext = {
          ...mockErrorContext,
          errorId: `backlog-${i}`
        };
        largeQueueManager.enqueue(errorContext);
      }
      
      const fillTime = performance.now();
      const fillDuration = fillTime - startTime;
      
      // Process backlog
      const responses = await largeQueueManager.flush();
      const processTime = performance.now();
      const processDuration = processTime - fillTime;
      
      const avgFillTime = fillDuration / backlogSize;
      const avgProcessTime = processDuration / backlogSize;
      
      console.log(`Large queue test: ${backlogSize} items, fill: ${fillDuration.toFixed(2)}ms (${avgFillTime.toFixed(6)}ms/item), process: ${processDuration.toFixed(2)}ms (${avgProcessTime.toFixed(6)}ms/item)`);
      
      expect(responses).toHaveLength(backlogSize);
      expect(avgFillTime).toBeLessThan(0.01); // Less than 10 microseconds per enqueue
      expect(avgProcessTime).toBeLessThan(0.1); // Less than 100 microseconds per dequeue
      
      await largeQueueManager.shutdown();
    });
  });

  describe('Throughput Performance', () => {
    test('System should maintain high throughput under sustained load', async () => {
      // Register modules for testing
      const moduleCount = 50;
      for (let i = 0; i < moduleCount; i++) {
        const handler = {
          execute: jest.fn().mockImplementation(async (errorContext: ErrorContext) => {
            // Simulate realistic processing time
            await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
            
            return {
              responseId: `throughput-response-${errorContext.errorId}`,
              errorId: errorContext.errorId,
              result: {
                status: 'success' as any,
                message: 'Throughput test response',
                details: '',
                code: 'THROUGHPUT_SUCCESS'
              },
              timestamp: new Date(),
              processingTime: Math.floor(Math.random() * 5),
              data: {
                moduleName: `ThroughputModule${i}`,
                moduleId: `throughput-module-${i}`,
                response: { message: 'Throughput response' },
                config: {},
                metadata: {}
              },
              actions: [],
              annotations: []
            } as ErrorResponse;
          })
        } as jest.Mocked<ResponseHandler>;

        const moduleRegistration: ModuleRegistration = {
          moduleId: `throughput-module-${i}`,
          moduleName: `ThroughputModule${i}`,
          version: '1.0.0',
          responseHandler: handler
        } as ModuleRegistration;
        
        errorInterfaceGateway.registerModule(moduleRegistration);
      }
      
      // Run sustained load test
      const duration = 30000; // 30 seconds
      const startTime = Date.now();
      let requestCount = 0;
      const errors: Error[] = [];
      
      // Send requests continuously for duration
      const requestInterval = setInterval(() => {
        const errorContext = {
          ...mockErrorContext,
          errorId: `throughput-${requestCount}`,
          source: {
            ...mockErrorContext.source,
            moduleId: `throughput-module-${requestCount % moduleCount}`
          }
        };
        
        errorInterfaceGateway.handleError(errorContext)
          .then(() => {
            requestCount++;
          })
          .catch(error => {
            errors.push(error);
          });
      }, 1); // ~1000 requests per second
      
      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, duration));
      clearInterval(requestInterval);
      
      // Allow remaining requests to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const endTime = Date.now();
      const testDuration = endTime - startTime;
      const requestsPerSecond = (requestCount / testDuration) * 1000;
      
      console.log(`Throughput test: ${requestCount} requests in ${testDuration}ms, ${requestsPerSecond.toFixed(2)} req/sec`);
      if (errors.length > 0) {
        console.log(`Errors: ${errors.length}`);
      }
      
      // Should handle at least 500 requests per second
      expect(requestsPerSecond).toBeGreaterThan(500);
      
      // Should have minimal errors
      expect(errors.length).toBeLessThan(requestCount * 0.01); // Less than 1% error rate
    });

    test('Batch processing should provide higher throughput than individual requests', async () => {
      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'batch-throughput-module',
        moduleName: 'BatchThroughputModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;
      
      responseRouterEngine.registerModule(moduleRegistration);
      
      const batchSize = 100;
      const batchCount = 100;
      
      // Test individual requests
      const individualStartTime = performance.now();
      const individualPromises = [];
      
      for (let i = 0; i < batchSize * batchCount; i++) {
        const errorContext = {
          ...mockErrorContext,
          errorId: `individual-${i}`
        };
        
        individualPromises.push(responseExecutor.executeSync(errorContext, mockModuleHandler));
      }
      
      await Promise.all(individualPromises);
      const individualEndTime = performance.now();
      const individualTime = individualEndTime - individualStartTime;
      
      // Test batch requests
      const batchStartTime = performance.now();
      const batchPromises = [];
      
      for (let i = 0; i < batchCount; i++) {
        const batchErrors = Array(batchSize).fill(null).map((_, j) => ({
          ...mockErrorContext,
          errorId: `batch-${i}-${j}`
        }));
        
        batchPromises.push(responseExecutor.executeBatch(batchErrors, mockModuleHandler));
      }
      
      await Promise.all(batchPromises);
      const batchEndTime = performance.now();
      const batchTime = batchEndTime - batchStartTime;
      
      const individualPerRequest = individualTime / (batchSize * batchCount);
      const batchPerRequest = batchTime / (batchSize * batchCount);
      const performanceRatio = individualPerRequest / batchPerRequest;
      
      console.log(`Batch throughput test: Individual ${individualTime.toFixed(2)}ms, Batch ${batchTime.toFixed(2)}ms, Ratio ${performanceRatio.toFixed(2)}x`);
      
      // Batch processing should be significantly faster per request
      expect(performanceRatio).toBeGreaterThan(1.2); // At least 20% improvement
    });
  });

  describe('Resource Utilization Performance', () => {
    test('CPU usage should remain reasonable under load', async () => {
      // This is a basic test - in a real environment, you'd use more sophisticated monitoring
      
      // Register modules
      const moduleCount = 20;
      for (let i = 0; i < moduleCount; i++) {
        const moduleRegistration: ModuleRegistration = {
          moduleId: `cpu-module-${i}`,
          moduleName: `CpuModule${i}`,
          version: '1.0.0',
          responseHandler: mockModuleHandler
        } as ModuleRegistration;
        
        errorInterfaceGateway.registerModule(moduleRegistration);
      }
      
      // Monitor CPU during intensive operation
      const beforeCpuTime = process.cpuUsage();
      
      // Perform CPU-intensive operations
      const operations = 10000;
      const promises = [];
      
      for (let i = 0; i < operations; i++) {
        const errorContext = {
          ...mockErrorContext,
          errorId: `cpu-test-${i}`,
          source: {
            ...mockErrorContext.source,
            moduleId: `cpu-module-${i % moduleCount}`
          }
        };
        
        promises.push(errorInterfaceGateway.handleError(errorContext));
      }
      
      await Promise.all(promises);
      
      const afterCpuTime = process.cpuUsage();
      const cpuTimeUsed = afterCpuTime.user - beforeCpuTime.user;
      
      console.log(`CPU usage test: ${operations} operations used ${cpuTimeUsed} microseconds of CPU time`);
      
      // CPU usage should be reasonable (less than 10 seconds for 10k operations)
      expect(cpuTimeUsed).toBeLessThan(10 * 1000 * 1000);
    });

    test('Garbage collection should not cause significant pauses', async () => {
      // This test measures the impact of object creation/destruction
      
      const gcTestIterations = 20000;
      
      // Warm up
      for (let i = 0; i < 1000; i++) {
        const errorContext = {
          ...mockErrorContext,
          errorId: `gc-warmup-${i}`
        };
        await errorInterfaceGateway.handleError(errorContext);
      }
      
      // Force garbage collection if available (Node.js flag --expose-gc needed)
      if (global.gc) {
        global.gc();
      }
      
      const startTime = performance.now();
      
      // Perform operations that create many objects
      for (let i = 0; i < gcTestIterations; i++) {
        const errorContext = {
          ...mockErrorContext,
          errorId: `gc-test-${i}`,
          data: {
            // Large nested object to stress GC
            nested: Array(100).fill(null).map((_, j) => ({
              id: j,
              data: `test-data-${j}`,
              subItems: Array(10).fill(null).map((_, k) => ({
                subId: k,
                value: `sub-value-${k}`
              }))
            }))
          }
        };
        
        await errorInterfaceGateway.handleError(errorContext);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / gcTestIterations;
      
      console.log(`GC stress test: ${gcTestIterations} iterations in ${totalTime.toFixed(2)}ms, avg ${avgTime.toFixed(4)}ms per iteration`);
      
      // Should maintain reasonable performance even with GC pressure
      expect(avgTime).toBeLessThan(5); // Less than 5ms average
    });
  });

  describe('Realistic Workload Performance', () => {
    test('System should handle realistic production workload', async () => {
      // Simulate a realistic production scenario
      
      // Register various types of modules
      const modules = [
        { id: 'api-module', type: 'API' },
        { id: 'database-module', type: 'Database' },
        { id: 'cache-module', type: 'Cache' },
        { id: 'auth-module', type: 'Authentication' },
        { id: 'notification-module', type: 'Notification' },
        { id: 'payment-module', type: 'Payment' },
        { id: 'file-module', type: 'File' },
        { id: 'search-module', type: 'Search' }
      ];
      
      // Create handlers with different characteristics
      const handlers: Record<string, jest.Mocked<ResponseHandler>> = {};
      
      modules.forEach(module => {
        handlers[module.id] = {
          execute: jest.fn().mockImplementation(async (errorContext: ErrorContext) => {
            // Different processing times based on module type
            let processingDelay = 5;
            switch (module.type) {
              case 'Database': processingDelay = 20; break;
              case 'Payment': processingDelay = 50; break;
              case 'Search': processingDelay = 15; break;
              default: processingDelay = 5 + Math.random() * 10;
            }
            
            await new Promise(resolve => setTimeout(resolve, processingDelay));
            
            return {
              responseId: `realistic-${module.id}-${errorContext.errorId}`,
              errorId: errorContext.errorId,
              result: {
                status: 'success' as any,
                message: `${module.type} module processed error`,
                details: `Processed by ${module.type} module`,
                code: `${module.type.toUpperCase()}_SUCCESS`
              },
              timestamp: new Date(),
              processingTime: Math.floor(processingDelay + Math.random() * 5),
              data: {
                moduleName: `${module.type}Module`,
                moduleId: module.id,
                response: { message: `${module.type} response` },
                config: errorContext.config,
                metadata: { moduleType: module.type }
              },
              actions: [],
              annotations: []
            } as ErrorResponse;
          })
        } as jest.Mocked<ResponseHandler>;
        
        const moduleRegistration: ModuleRegistration = {
          moduleId: module.id,
          moduleName: `${module.type}Module`,
          version: '1.0.0',
          responseHandler: handlers[module.id]
        } as ModuleRegistration;
        
        errorInterfaceGateway.registerModule(moduleRegistration);
      });
      
      // Create realistic error distribution
      const errorTypes = [
        { type: 'API', frequency: 0.3 },
        { type: 'Database', frequency: 0.15 },
        { type: 'Cache', frequency: 0.1 },
        { type: 'Authentication', frequency: 0.05 },
        { type: 'Notification', frequency: 0.1 },
        { type: 'Payment', frequency: 0.05 },
        { type: 'File', frequency: 0.15 },
        { type: 'Search', frequency: 0.1 }
      ];
      
      // Run realistic workload for 10 seconds
      const workloadDuration = 10000;
      const startTime = Date.now();
      let totalRequests = 0;
      const moduleRequestCounts: Record<string, number> = {};
      const errors: Error[] = [];
      
      // Simulate realistic request pattern
      const requestInterval = setInterval(() => {
        // Determine which module should handle this request
        const random = Math.random();
        let cumulative = 0;
        let selectedModule = modules[0].id;
        
        for (const errorType of errorTypes) {
          cumulative += errorType.frequency;
          if (random <= cumulative) {
            selectedModule = modules.find(m => m.type === errorType.type)?.id || modules[0].id;
            break;
          }
        }
        
        const errorContext = {
          ...mockErrorContext,
          errorId: `realistic-${totalRequests}`,
          error: new Error(`Realistic ${selectedModule} error`),
          source: {
            ...mockErrorContext.source,
            moduleId: selectedModule
          }
        };
        
        errorInterfaceGateway.handleError(errorContext)
          .then(() => {
            totalRequests++;
            moduleRequestCounts[selectedModule] = (moduleRequestCounts[selectedModule] || 0) + 1;
          })
          .catch(error => {
            errors.push(error);
          });
      }, 2); // ~500 requests per second
      
      // Wait for workload duration
      await new Promise(resolve => setTimeout(resolve, workloadDuration));
      clearInterval(requestInterval);
      
      // Allow remaining requests to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const endTime = Date.now();
      const testDuration = endTime - startTime;
      const requestsPerSecond = (totalRequests / testDuration) * 1000;
      
      console.log(`Realistic workload test: ${totalRequests} requests in ${testDuration}ms, ${requestsPerSecond.toFixed(2)} req/sec`);
      console.log('Module distribution:', moduleRequestCounts);
      if (errors.length > 0) {
        console.log(`Errors: ${errors.length}`);
      }
      
      // Should handle realistic production load
      expect(requestsPerSecond).toBeGreaterThan(200); // At least 200 req/sec
      expect(totalRequests).toBeGreaterThan(1000); // At least 1000 total requests
      expect(errors.length).toBeLessThan(totalRequests * 0.005); // Very low error rate
      
      // All modules should have received requests
      modules.forEach(module => {
        expect(moduleRequestCounts[module.id]).toBeGreaterThan(0);
      });
    });
  });
});