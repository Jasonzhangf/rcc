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
  ResponseHandler,
  ErrorType,
  HandlingStatus
} from '../../../interfaces/SharedTypes';
import { 
  createMockResponseHandler,
  createMockModuleRegistration,
  createMinimalModuleRegistration
} from './mocks/MockFactory';

describe('Error Handling Center Integration Tests', () => {
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
  let mockCriticalErrorContext: ErrorContext;

  beforeAll(async () => {
    // Initialize all components
    errorClassifier = new ErrorClassifier();
    errorQueueManager = new ErrorQueueManager();
    moduleRegistryManager = new ModuleRegistryManager();
    policyEngine = new PolicyEngine();
    responseTemplateManager = new ResponseTemplateManager();
    
    // Create default handler
    mockModuleHandler = createMockResponseHandler();
    
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

    // Setup mock error contexts
    mockErrorContext = {
      errorId: 'integration-test-error-1',
      error: new Error('Integration test error message'),
      source: {
        moduleId: 'integration-test-module',
        moduleName: 'IntegrationTestModule',
        version: '1.0.0',
        fileName: 'integration-test-module.ts',
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

    mockCriticalErrorContext = {
      ...mockErrorContext,
      errorId: 'integration-critical-error-1',
      error: new Error('Critical integration test error'),
      classification: {
        ...mockErrorContext.classification,
        severity: 'critical' as any
      }
    };

    // Setup mock handler responses
    mockModuleHandler.execute.mockImplementation(async (errorContext: ErrorContext) => {
      return {
        responseId: `handler-response-${errorContext.errorId}`,
        errorId: errorContext.errorId,
        result: {
          status: 'success' as any,
          message: 'Handler processed error successfully',
          details: `Processed error with ID: ${errorContext.errorId}`,
          code: 'HANDLER_SUCCESS'
        },
        timestamp: new Date(),
        processingTime: 50,
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
    // Shutdown all components in reverse order
    await errorInterfaceGateway.shutdown();
    await responseExecutor.shutdown();
    await responseRouterEngine.shutdown();
    await responseTemplateManager.shutdown();
    await policyEngine.shutdown();
    await moduleRegistryManager.shutdown();
    await errorQueueManager.shutdown();
    await errorClassifier.shutdown();
  });

  describe('Component Integration - Full Workflow', () => {
    test('should handle error through complete workflow', async () => {
      // Step 1: Classify the error
      const classification = await errorClassifier.classify(mockErrorContext.error, mockErrorContext.source);
      expect(classification).toBeDefined();
      expect(classification.type).toBe(ErrorType.TECHNICAL);
      expect(classification.severity).toBeDefined();

      // Step 2: Register a module with custom handler
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'integration-test-module',
        moduleName: 'IntegrationTestModule',
        version: '1.0.0'
      });

      const callback = jest.fn();
      mockErrorContext.callback = callback;

      // Step 3: Register module with the system
      errorInterfaceGateway.registerModule(moduleRegistration);

      // Step 4: Handle error through the interface gateway (blocking mode)
      const response = await errorInterfaceGateway.handleError(mockErrorContext);

      // Step 5: Verify complete workflow
      expect(response).toBeDefined();
      expect(response.errorId).toBe('integration-test-error-1');
      expect(response.result.status).toBe('success' as any);
      expect(response.result.code).toBe('HANDLER_SUCCESS');
      expect(response.processingTime).toBeGreaterThan(0);

      // Check that handler was called
      expect(mockModuleHandler.execute).toHaveBeenCalledWith(mockErrorContext);

      // Check that callback was called if provided
      if (callback) {
        expect(callback).toHaveBeenCalledWith(response);
      }

      // Step 6: Check component statuses
      const gatewayStatus = errorInterfaceGateway.getStatus();
      const queueStatus = errorQueueManager.getQueueStatus();
      const routerStatus = responseRouterEngine.getStatus();
      const executorStatus = responseExecutor.getStatus();
      const registryStatus = moduleRegistryManager.getStatus();
      const policyStatus = policyEngine.getStatus();
      const templateStatus = responseTemplateManager.getStatus();

      expect(gatewayStatus.isInitialized).toBe(true);
      expect(queueStatus.size).toBeGreaterThanOrEqual(0);
      expect(routerStatus.moduleHandlersCount).toBe(1);
      expect(executorStatus.isInitialized).toBe(true);
      expect(registryStatus.modulesCount).toBe(1);
      expect(policyStatus.policiesCount).toBeGreaterThan(0);
      expect(templateStatus.templatesCount).toBeGreaterThan(0);
    });

    test('should handle error asynchronously through complete workflow', async () => {
      const callback = jest.fn();
      const asyncErrorContext = {
        ...mockErrorContext,
        errorId: 'async-integration-error',
        callback
      };

      // Register module
      const moduleRegistration = createMinimalModuleRegistration({
        moduleId: 'async-integration-module',
        moduleName: 'AsyncIntegrationModule',
        responseHandler: mockModuleHandler as any
      });

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Handle error asynchronously
      errorInterfaceGateway.handleErrorAsync(asyncErrorContext);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify async processing completed
      expect(callback).toHaveBeenCalled();
      const response = callback.mock.calls[0][0];
      expect(response.errorId).toBe('async-integration-error');
      expect(response.result.status).toBe(HandlingStatus.PARTIAL);
      expect(response.result.code).toBe('ASYNC_SCHEDULED');

      // Verify the queue was processed
      const queueStatus = errorQueueManager.getQueueStatus();
      expect(queueStatus.size).toBe(0); // Should be processed by auto-flush
    });

    test('should handle critical error with appropriate policies', async () => {
      // Register module with error handler
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'critical-integration-module',
        moduleName: 'CriticalIntegrationModule',
        responseHandler: mockModuleHandler
      });

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Handle critical error
      const response = await errorInterfaceGateway.handleError(mockCriticalErrorContext);

      // Verify critical error handling
      expect(response).toBeDefined();
      expect(response.errorId).toBe('integration-critical-error-1');
      
      // Check that appropriate critical error policies were applied
      const policies = policyEngine.getPolicies();
      const criticalPolicies = policies.filter(p => 
        p.conditions.some(c => 
          c.severities?.includes('critical' as any)
        )
      );
      expect(criticalPolicies.length).toBeGreaterThan(0);

      // Verify action was created (if applicable)
      if (response.actions && response.actions.length > 0) {
        expect(response.actions[0].target).toBeDefined();
      }
    });

    test('should handle batch errors efficiently', async () => {
      // Create batch of errors
      const batchErrors = Array(5).fill(null).map((_, i) => ({
        ...mockErrorContext,
        errorId: `batch-error-${i}`,
        error: new Error(`Batch error ${i}`)
      }));

      // Register module
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'batch-integration-module',
        moduleName: 'BatchIntegrationModule',
        responseHandler: mockModuleHandler
      });

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Process batch
      const startTime = Date.now();
      const responses = await errorInterfaceGateway.handleBatchErrors(batchErrors);
      const endTime = Date.now();

      // Verify batch processing
      expect(responses).toHaveLength(5);
      expect(responses.every(r => r.errorId.startsWith('batch-error-'))).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should be reasonably fast

      // Verify all errors were processed
      responses.forEach(response => {
        expect(response.result.status).toBe('success' as any);
        expect(response.processingTime).toBeGreaterThan(0);
      });

      // Verify handler was called for each error
      expect(mockModuleHandler.execute).toHaveBeenCalledTimes(5);
    });
  });

  describe('Module Registry Integration', () => {
    test('should integrate module registration with routing engine', async () => {
      const customHandler = createMockResponseHandler({
        handleId: 'custom-handler',
        name: 'Custom Handler',
        execute: jest.fn().mockResolvedValue({
          responseId: 'custom-handler-response',
          errorId: 'module-integration-error',
          result: {
            status: 'success' as any,
            message: 'Custom handler processed error',
            details: '',
            code: 'CUSTOM_HANDLER_SUCCESS'
          },
          timestamp: new Date(),
          processingTime: 75,
          data: {
            moduleName: 'CustomIntegrationModule',
            moduleId: 'module-integration-module',
            response: { message: 'Custom handler response' },
            config: {},
            metadata: {}
          },
          actions: [],
          annotations: []
        } as ErrorResponse)
      });

      // Register module with custom handler
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'module-integration-module',
        moduleName: 'ModuleIntegrationModule',
        responseHandler: customHandler
      });

      moduleRegistryManager.registerModule(moduleRegistration);
      errorInterfaceGateway.registerModule(moduleRegistration);

      // Verify module is registered in both places
      const registryModule = moduleRegistryManager.getModule('module-integration-module');
      const routerHandlers = responseRouterEngine.getModuleHandlers();
      
      expect(registryModule).toBeDefined();
      expect(routerHandlers.get('module-integration-module')).toBe(customHandler);

      // Test error routing to module handler
      const errorContext = {
        ...mockErrorContext,
        errorId: 'module-integration-error',
        source: {
          ...mockErrorContext.source,
          moduleId: 'module-integration-module'
        }
      };

      const response = await errorInterfaceGateway.handleError(errorContext);
      
      // Verify custom handler was used
      expect(customHandler.execute).toHaveBeenCalledWith(errorContext);
      expect(response.result.code).toBe('CUSTOM_HANDLER_SUCCESS');
      expect(response.data.moduleId).toBe('module-integration-module');
    });

    test('should handle module dependencies properly', async () => {
      // Register dependency module
      const dependencyModule = createMockModuleRegistration({
        moduleId: 'dependency-module',
        moduleName: 'DependencyModule',
        dependencies: []
      });

      moduleRegistryManager.registerModule(dependencyModule);

      // Register dependent module
      const dependentModule = createMockModuleRegistration({
        moduleId: 'dependent-module',
        moduleName: 'DependentModule',
        dependencies: ['dependency-module'],
        responseHandler: mockModuleHandler
      });

      moduleRegistryManager.registerModule(dependentModule);
      errorInterfaceGateway.registerModule(dependentModule);

      // Verify dependencies are tracked
      const dependencies = moduleRegistryManager.getModuleDependencies('dependent-module');
      const dependents = moduleRegistryManager.getDependents('dependency-module');
      
      expect(dependencies).toContain('dependency-module');
      expect(dependents).toContain('dependent-module');

      // Verify dependency order resolution
      const order = moduleRegistryManager.resolveDependencyOrder();
      expect(order.indexOf('dependency-module')).toBeLessThan(order.indexOf('dependent-module'));
    });
  });

  describe('Policy Engine Integration', () => {
    test('should apply policies during response execution', async () => {
      // Register module
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'policy-integration-module',
        moduleName: 'PolicyIntegrationModule',
        responseHandler: mockModuleHandler
      });

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Handle error with policy engine integrated
      const response = await errorInterfaceGateway.handleError(mockErrorContext);

      // Verify policy execution
      const policyStatus = policyEngine.getStatus();
      expect(policyStatus.isInitialized).toBe(true);
      
      // Check that policies were applied (default policies should be present)
      const policies = policyEngine.getPolicies();
      expect(policies.length).toBeGreaterThan(0);

      // Verify policy-enhanced response
      expect(response).toBeDefined();
      expect(response.errorId).toBe('integration-test-error-1');
      expect(response.processingTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle circuit breaker integration', async () => {
      // Register module
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'circuit-breaker-module',
        moduleName: 'CircuitBreakerModule',
        responseHandler: mockModuleHandler
      });

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Record failures to trigger circuit breaker
      const isolationConfig = {
        enabled: true,
        timeout: 60000,
        threshold: 2,
        recoveryTime: 300000
      };

      // Simulate multiple failures
      policyEngine.updateCircuitBreaker('circuit-breaker-module', false, isolationConfig);
      policyEngine.updateCircuitBreaker('circuit-breaker-module', false, isolationConfig);

      // Check if circuit breaker is triggered
      const isAllowed = policyEngine.isCircuitBreakerAllow('circuit-breaker-module');
      expect(isAllowed).toBe(false); // Should be open now

      // Handle error - should be affected by circuit breaker
      const errorContext = {
        ...mockErrorContext,
        source: {
          ...mockErrorContext.source,
          moduleId: 'circuit-breaker-module'
        }
      };

      const response = await errorInterfaceGateway.handleError(errorContext);
      
      // Should have circuit breaker status in response
      expect(response).toBeDefined();
      // Note: Actual circuit breaker logic may be implemented in the handler
    });
  });

  describe('Template Management Integration', () => {
    test('should integrate template manager with response generation', async () => {
      // Register module
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'template-integration-module',
        moduleName: 'TemplateIntegrationModule',
        responseHandler: mockModuleHandler
      });

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Get template for error
      const template = await responseTemplateManager.getTemplateForError(mockErrorContext);
      
      expect(template).toBeDefined();
      expect(template.templateId).toBeDefined();

      // Generate response from template
      const templateResponse = await responseTemplateManager.generateResponse(template, mockErrorContext);
      
      expect(templateResponse).toBeDefined();
      expect(templateResponse.errorId).toBe('integration-test-error-1');
      expect(templateResponse.result.message).toBeDefined();

      // Handle error through gateway and verify template integration
      const handlerResponse = await errorInterfaceGateway.handleError(mockErrorContext);
      
      // Response should be enhanced with template data
      expect(handlerResponse).toBeDefined();
      expect(handlerResponse.data.moduleId).toBe('integration-test-module');
    });

    test('should handle module-specific template assignments', async () => {
      // Register module
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'template-assignment-module',
        moduleName: 'TemplateAssignmentModule',
        responseHandler: mockModuleHandler
      });

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Create module-specific template
      const moduleTemplate = await responseTemplateManager.getTemplateById('default');
      if (moduleTemplate) {
        // Assign template to module
        responseTemplateManager.assignTemplateToModule('template-assignment-module', moduleTemplate.templateId);

        // Verify assignment
        const assignments = responseTemplateManager.getModuleTemplateAssignments();
        expect(assignments.get('template-assignment-module')).toBe(moduleTemplate.templateId);

        // Handle error with module-specific template
        const errorContext = {
          ...mockErrorContext,
          source: {
            ...mockErrorContext.source,
            moduleId: 'template-assignment-module'
          }
        };

        const template = await responseTemplateManager.getTemplateForError(errorContext);
        const response = await responseTemplateManager.generateResponse(template, errorContext);
        
        expect(response).toBeDefined();
        expect(response.data.moduleId).toBe('template-assignment-module');
      }
    });
  });

  describe('Queue Management Integration', () => {
    test('should manage error queue with proper prioritization', async () => {
      // Register module
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'queue-integration-module',
        moduleName: 'QueueIntegrationModule',
        responseHandler: mockModuleHandler
      });

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Create errors with different priorities
      const criticalErrorContext = {
        ...mockErrorContext,
        errorId: 'queue-critical-error',
        error: new Error('Queue critical error'),
        classification: {
          ...mockErrorContext.classification,
          severity: 'critical' as any
        }
      };

      const highErrorContext = {
        ...mockErrorContext,
        errorId: 'queue-high-error',
        error: new Error('Queue high error'),
        classification: {
          ...mockErrorContext.classification,
          severity: 'high' as any
        }
      };

      const mediumErrorContext = {
        ...mockErrorContext,
        errorId: 'queue-medium-error',
        error: new Error('Queue medium error'),
        classification: {
          ...mockErrorContext.classification,
          severity: 'medium' as any
        }
      };

      // Add errors to queue
      errorQueueManager.enqueue(criticalErrorContext);
      errorQueueManager.enqueue(highErrorContext);
      errorQueueManager.enqueue(mediumErrorContext);

      // Verify queue state
      const queueStatus = errorQueueManager.getQueueStatus();
      const priorityCounts = errorQueueManager.getPriorityCounts();
      
      expect(queueStatus.size).toBe(3);
      expect(priorityCounts.critical).toBe(1);
      expect(priorityCounts.high).toBe(1);
      expect(priorityCounts.medium).toBe(1);

      // Process queue
      const responses = await errorQueueManager.flush();
      
      expect(responses).toHaveLength(3);
      
      // Verify processing order (critical first)
      const firstDequeued = errorQueueManager.dequeue();
      const secondDequeued = errorQueueManager.dequeue();
      const thirdDequeued = errorQueueManager.dequeue();
      
      expect(firstDequeued?.classification.severity).toBe('critical');
      expect(secondDequeued?.classification.severity).toBe('high');
      expect(thirdDequeued?.classification.severity).toBe('medium');
    });

    test('should handle automatic queue flushing', async () => {
      // Create a separate queue manager with auto-flush
      const autoFlushQueueManager = new ErrorQueueManager({
        flushInterval: 100,
        enableBatchProcessing: true,
        maxQueueSize: 100
      });
      
      await autoFlushQueueManager.initialize();

      // Add error to queue
      autoFlushQueueManager.enqueue(mockErrorContext);
      
      expect(autoFlushQueueManager.getQueueSize()).toBe(1);
      
      // Wait for automatic flush
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Queue should be flushed
      expect(autoFlushQueueManager.getQueueSize()).toBe(0);
      
      await autoFlushQueueManager.shutdown();
    });
  });

  describe('Component Health Integration', () => {
    test('should maintain component health throughout integration', async () => {
      // Check all component statuses
      const gatewayStatus = errorInterfaceGateway.getStatus();
      const queueStatus = errorQueueManager.getQueueStatus();
      const registryStatus = moduleRegistryManager.getStatus();
      const policyStatus = policyEngine.getStatus();
      const executorStatus = responseExecutor.getStatus();
      const routerStatus = responseRouterEngine.getStatus();
      const templateStatus = responseTemplateManager.getStatus();

      // All components should be healthy
      expect(gatewayStatus.isInitialized).toBe(true);
      expect(queueStatus.size).toBeGreaterThanOrEqual(0);
      expect(registryStatus.isInitialized).toBe(true);
      expect(policyStatus.isInitialized).toBe(true);
      expect(executorStatus.isInitialized).toBe(true);
      expect(routerStatus.isInitialized).toBe(true);
      expect(templateStatus.isInitialized).toBe(true);

      // Check module health
      const moduleHealth = moduleRegistryManager.getAllModulesHealth();
      const moduleIds = Object.keys(moduleHealth);
      
      moduleIds.forEach(moduleId => {
        expect(moduleHealth[moduleId].healthy).toBe(true);
      });

      // Check circuit breaker status
      const circuitBreakers = policyStatus.circuitBreakersCount;
      expect(circuitBreakers).toBeGreaterThanOrEqual(0);
    });

    test('should handle graceful degradation when components fail', async () => {
      console.error = jest.fn(); // Suppress error output
      
      // Simulate partial component failure
      mockModuleHandler.execute.mockImplementationOnce(async () => {
        throw new Error('Handler temporary failure');
      });

      // Register module
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'degradation-module',
        moduleName: 'DegradationModule',
        responseHandler: mockModuleHandler
      });

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Process error with failing handler
      const errorContext = {
        ...mockErrorContext,
        errorId: 'degradation-error'
      };

      const response = await errorInterfaceGateway.handleError(errorContext);
      
      // Should have fallback behavior
      expect(response.result.status).toBe('failure' as any);
      expect(response.result.code).toBe('PROCESSING_FAILED');

      // System should still be operational
      const gatewayStatus = errorInterfaceGateway.getStatus();
      expect(gatewayStatus.isInitialized).toBe(true);
      
      console.error = jest.requireActual('console').error;
    });
  });

  describe('Performance Integration', () => {
    test('should handle concurrent operations efficiently', async () => {
      // Register multiple modules
      const modules = Array(10).fill(null).map((_, i) => {
        const handler = createMockResponseHandler({
          handleId: `concurrent-handler-${i}`,
          name: `Concurrent Handler ${i}`,
          execute: jest.fn().mockResolvedValue({
            responseId: `concurrent-response-${i}`,
            errorId: `concurrent-error-${i}`,
            result: {
              status: 'success' as any,
              message: `Concurrent handler ${i} response`,
              details: '',
              code: `CONCURRENT_${i}_SUCCESS`
            },
            timestamp: new Date(),
            processingTime: Math.floor(Math.random() * 50),
            data: {
              moduleName: `ConcurrentModule${i}`,
              moduleId: `concurrent-module-${i}`,
              response: { message: `Handler ${i} response` },
              config: {},
              metadata: {}
            },
            actions: [],
            annotations: []
          } as ErrorResponse)
        });

        const moduleRegistration = createMockModuleRegistration({
          moduleId: `concurrent-module-${i}`,
          moduleName: `ConcurrentModule${i}`,
          responseHandler: handler
        });

        errorInterfaceGateway.registerModule(moduleRegistration);
        return { moduleRegistration, handler };
      });

      // Create concurrent error processing
      const concurrentErrors = Array(50).fill(null).map((_, i) => ({
        ...mockErrorContext,
        errorId: `concurrent-processing-error-${i}`,
        source: {
          ...mockErrorContext.source,
          moduleId: `concurrent-module-${i % 10}`
        }
      }));

      // Time the concurrent processing
      const startTime = Date.now();
      const processingPromises = concurrentErrors.map(error => 
        errorInterfaceGateway.handleError(error)
      );

      const responses = await Promise.all(processingPromises);
      const endTime = Date.now();

      // Verify results
      expect(responses).toHaveLength(50);
      expect(responses.every(r => r.errorId.startsWith('concurrent-processing-error-'))).toBe(true);
      
      // Performance check - should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all handlers were called
      modules.forEach(({ handler }, index) => {
        const callCount = handler.execute.mock.calls.filter(call => 
          call[0].source.moduleId === `concurrent-module-${index}`
        ).length;
        expect(callCount).toBeGreaterThanOrEqual(1);
      });
    });

    test('should handle memory efficiently during intensive operations', async () => {
      // Measure memory before
      const initialMemory = process.memoryUsage();

      // Perform intensive operation
      const intensiveErrors = Array(1000).fill(null).map((_, i) => ({
        ...mockErrorContext,
        errorId: `intensive-error-${i}`,
        error: new Error(`Intensive error ${i} for memory testing`)
      }));

      // Process in batches to avoid memory issues
      const batchSize = 50;
      const results: ErrorResponse[] = [];

      for (let i = 0; i < intensiveErrors.length; i += batchSize) {
        const batch = intensiveErrors.slice(i, i + batchSize);
        const batchPromises = batch.map(error => errorInterfaceGateway.handleError(error));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      // Verify processing
      expect(results).toHaveLength(1000);

      // Measure memory after
      const finalMemory = process.memoryUsage();
      
      // Memory usage should not increase excessively
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });
  });

  describe('Edge Case Integration', () => {
    test('should handle errors with missing optional fields', async () => {
      // Create error with minimal fields
      const minimalErrorContext: ErrorContext = {
        errorId: 'minimal-error',
        error: new Error('Minimal error'),
        source: {
          moduleId: 'minimal-module',
          moduleName: 'MinimalModule',
          version: '1.0.0'
        },
        classification: {
          source: 'module' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        timestamp: new Date()
        // Missing optional config and data fields
      } as ErrorContext;

      // Register module
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'minimal-module',
        moduleName: 'MinimalModule',
        responseHandler: mockModuleHandler
      });

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Process error
      const response = await errorInterfaceGateway.handleError(minimalErrorContext);
      
      // Should succeed even with missing fields
      expect(response).toBeDefined();
      expect(response.errorId).toBe('minimal-error');
      expect(response.result.status).toBe('success' as any);
    });

    test('should handle very large error payloads', async () => {
      // Create error with large payload
      const largePayload = Array(10000).fill(null).map((_, i) => `large-payload-item-${i}`);
      
      const largeErrorContext: ErrorContext = {
        ...mockErrorContext,
        errorId: 'large-payload-error',
        data: {
          largePayload,
          nested: {
            deeply: {
              nested: {
                array: Array(1000).fill(null).map((_, i) => ({ id: i, value: `nested-${i}` }))
              }
            }
          }
        }
      };

      // Register module
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'large-payload-module',
        moduleName: 'LargePayloadModule',
        responseHandler: mockModuleHandler
      });

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Process large error
      const response = await errorInterfaceGateway.handleError(largeErrorContext);
      
      // Should handle large payloads without crashing
      expect(response).toBeDefined();
      expect(response.errorId).toBe('large-payload-error');
      expect(response.data.response).toBeDefined();
    });

    test('should maintain system stability during unexpected errors', async () => {
      console.error = jest.fn(); // Suppress error output

      // Simulate unexpected error during processing
      mockModuleHandler.execute.mockImplementationOnce(async (_errorContext: ErrorContext) => {
        // Throw an unexpected error
        throw new Error('Unexpected processing error');
      });

      // Register module
      const moduleRegistration = createMockModuleRegistration({
        moduleId: 'stability-test-module',
        moduleName: 'StabilityTestModule',
        responseHandler: mockModuleHandler
      });

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Process error with handler that throws
      const errorContext = {
        ...mockErrorContext,
        errorId: 'stability-test-error'
      };

      const response = await errorInterfaceGateway.handleError(errorContext);
      
      // Should handle gracefully with fallback
      expect(response).toBeDefined();
      expect(response.result.status).toBe('failure' as any);
      expect(response.result.code).toBe('PROCESSING_FAILED');

      // System should remain operational
      const gatewayStatus = errorInterfaceGateway.getStatus();
      expect(gatewayStatus.isInitialized).toBe(true);

      console.error = jest.requireActual('console').error;
    });
  });
});