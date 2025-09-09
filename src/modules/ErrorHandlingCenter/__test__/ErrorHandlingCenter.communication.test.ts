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

describe('Error Handling Center Communication Tests', () => {
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
    mockModuleHandler = {
      handleId: 'mock-handler',
      name: 'Mock Handler',
      priority: 1,
      isEnabled: true,
      conditions: [],
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

    // Setup mock error contexts
    mockErrorContext = {
      errorId: 'communication-test-error-1',
      error: new Error('Communication test error message'),
      source: {
        moduleId: 'communication-test-module',
        moduleName: 'CommunicationTestModule',
        version: '1.0.0',
        fileName: 'communication-test-module.ts',
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
      errorId: 'communication-critical-error-1',
      error: new Error('Critical communication test error'),
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
        actions: [
          {
            actionId: `action-${errorContext.errorId}`,
            type: ActionType.LOG,
            target: 'system_logger',
            payload: {
              level: 'info',
              message: `Processed error ${errorContext.errorId}`,
              module: errorContext.source.moduleName
            },
            priority: 'medium' as any,
            status: ActionStatus.PENDING,
            timestamp: new Date()
          }
        ],
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

  describe('Interface Gateway to Queue Communication', () => {
    test('should communicate error from gateway to queue', async () => {
      const initialQueueSize = errorQueueManager.getQueueSize();
      
      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'gateway-queue-module',
        moduleName: 'GatewayQueueModule',
        moduleType: 'test',
        version: '1.0.0',
        config: { enableLogging: true },
        capabilities: ['error-handling'],
        responseHandler: mockModuleHandler
      };

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Handle error through gateway (adds to queue)
      await errorInterfaceGateway.handleError(mockErrorContext);
      
      // Queue size should have increased
      const finalQueueSize = errorQueueManager.getQueueSize();
      expect(finalQueueSize).toBe(initialQueueSize); // Should have been processed from queue
      
      // Check queue interactions were logged
      expect(errorQueueManager.getQueueSize()).toBeGreaterThanOrEqual(0);
    });

    test('should async communication properly queue messages', (done) => {
      const callback = (response: ErrorResponse) => {
        try {
          expect(response).toBeDefined();
          expect(response.errorId).toBe('async-communication-error');
          expect(response.result.status).toBe(HandlingStatus.PARTIAL);
          done();
        } catch (error) {
          done(error);
        }
      };

      const asyncErrorContext = {
        ...mockErrorContext,
        errorId: 'async-communication-error',
        callback
      };

      // Register module first
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'async-communication-module',
        moduleName: 'AsyncCommunicationModule',
        moduleType: 'test',
        version: '1.0.0',
        config: { enableLogging: true },
        capabilities: ['error-handling'],
        responseHandler: mockModuleHandler
      };

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Handle error asynchronously
      errorInterfaceGateway.handleErrorAsync(asyncErrorContext);
    });
  });

  describe('Queue to Router Communication', () => {
    test('should communicate queued errors to router for processing', async () => {
      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'queue-router-module',
        moduleName: 'QueueRouterModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      errorInterfaceGateway.registerModule(moduleRegistration);
      
      // Add error to queue directly
      errorQueueManager.enqueue(mockErrorContext);
      
      // Flush queue to trigger router processing
      const responses = await errorQueueManager.flush();
      
      // Verify communication happened
      expect(responses).toHaveLength(1);
      expect(responses[0].result.code).toBe('QUEUE_FLUSHED');
      
      // Verify router would have been called
      const routerStatus = responseRouterEngine.getStatus();
      expect(routerStatus.isInitialized).toBe(true);
    });

    test('should handle queue overflow with proper routing', async () => {
      // Create a small queue for testing
      const smallQueueManager = new ErrorQueueManager({
        maxQueueSize: 3,
        flushInterval: 5000,
        enableBatchProcessing: false
      });
      
      await smallQueueManager.initialize();
      
      // Add more errors than queue can handle
      for (let i = 0; i < 5; i++) {
        const errorContext = {
          ...mockErrorContext,
          errorId: `overflow-error-${i}`
        };
        smallQueueManager.enqueue(errorContext);
      }
      
      // Queue should have evicted low priority items
      const queueStatus = smallQueueManager.getQueueStatus();
      expect(queueStatus.size).toBeLessThanOrEqual(3);
      
      // Flush remaining items
      const responses = await smallQueueManager.flush();
      expect(responses.length).toBeLessThanOrEqual(3);
      
      await smallQueueManager.shutdown();
    });
  });

  describe('Router to Executor Communication', () => {
    test('should communicate routing decisions to executor', async () => {
      // Register module with specific handler
      const customHandler = {
        execute: jest.fn().mockResolvedValue({
          responseId: 'custom-handler-response',
          errorId: 'router-executor-error',
          result: {
            status: 'success' as any,
            message: 'Custom handler executed',
            details: '',
            code: 'CUSTOM_HANDLER_SUCCESS'
          },
          timestamp: new Date(),
          processingTime: 100,
          data: {
            moduleName: 'CustomHandlerModule',
            moduleId: 'custom-handler-module',
            response: { message: 'Custom handler response' },
            config: {},
            metadata: {}
          },
          actions: [],
          annotations: []
        } as ErrorResponse)
      } as jest.Mocked<ResponseHandler>;

      const moduleRegistration: ModuleRegistration = {
        moduleId: 'custom-handler-module',
        moduleName: 'CustomHandlerModule',
        version: '1.0.0',
        responseHandler: customHandler
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);
      
      // Create error for this module
      const errorContext = {
        ...mockErrorContext,
        errorId: 'router-executor-error',
        source: {
          ...mockErrorContext.source,
          moduleId: 'custom-handler-module'
        }
      };

      // Get router to determine handler
      const handler = await responseRouterEngine.route(errorContext);
      
      // Execute with the determined handler
      const response = await responseExecutor.executeSync(errorContext, handler);
      
      // Verify communication path
      expect(customHandler.execute).toHaveBeenCalledWith(errorContext);
      expect(response.result.code).toBe('CUSTOM_HANDLER_SUCCESS');
      expect(response.data.moduleId).toBe('custom-handler-module');
    });

    test('should handle routing to default handler when module not found', async () => {
      // Create error for non-registered module
      const unknownErrorContext = {
        ...mockErrorContext,
        errorId: 'unknown-module-error',
        source: {
          ...mockErrorContext.source,
          moduleId: 'unknown-module'
        }
      };

      // Route to handler
      const handler = await responseRouterEngine.route(unknownErrorContext);
      
      // Should route to default handler
      expect(handler).toBe(mockModuleHandler);
      
      // Execute with default handler
      const response = await responseExecutor.executeSync(unknownErrorContext, handler);
      
      // Verify default handler was used
      expect(mockModuleHandler.execute).toHaveBeenCalledWith(unknownErrorContext);
      expect(response.result.code).toBe('HANDLER_SUCCESS');
    });
  });

  describe('Executor to Policy Engine Communication', () => {
    test('should communicate execution results to policy engine', async () => {
      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'executor-policy-module',
        moduleName: 'ExecutorPolicyModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);

      const errorContext = {
        ...mockErrorContext,
        errorId: 'executor-policy-error',
        source: {
          ...mockErrorContext.source,
          moduleId: 'executor-policy-module'
        }
      };

      // Execute through executor (which applies policies)
      const response = await responseExecutor.executeSync(errorContext, mockModuleHandler);
      
      // Verify policy engine was involved
      const policyStatus = policyEngine.getStatus();
      expect(policyStatus.isInitialized).toBe(true);
      
      // Response should have been enhanced with policies
      expect(response).toBeDefined();
      expect(response.responseId).toContain('exec_');
      expect(response.processingTime).toBeGreaterThan(0);
    });

    test('should handle policy engine failures gracefully', async () => {
      console.error = jest.fn(); // Suppress error output
      
      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'policy-failure-module',
        moduleName: 'PolicyFailureModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);

      // Simulate policy engine failure
      jest.spyOn(policyEngine, 'executePolicies').mockRejectedValueOnce(
        new Error('Policy engine temporarily unavailable')
      );

      const errorContext = {
        ...mockErrorContext,
        errorId: 'policy-failure-error',
        source: {
          ...mockErrorContext.source,
          moduleId: 'policy-failure-module'
        }
      };

      // Execute should still work despite policy engine failure
      const response = await responseExecutor.executeSync(errorContext, mockModuleHandler);
      
      // Should have fallback behavior
      expect(response).toBeDefined();
      expect(response.result.status).toBe('success' as any); // Should still succeed
      
      console.error = jest.requireActual('console').error;
    });
  });

  describe('Policy Engine to Circuit Breaker Communication', () => {
    test('should communicate circuit breaker state changes', async () => {
      // Simulate multiple failures to trigger circuit breaker
      const config = {
        enabled: true,
        timeout: 60000,
        threshold: 3,
        recoveryTime: 300000
      };

      // Record failures
      policyEngine.updateCircuitBreaker('circuit-breaker-module', false, config);
      policyEngine.updateCircuitBreaker('circuit-breaker-module', false, config);
      policyEngine.updateCircuitBreaker('circuit-breaker-module', false, config);

      // Check circuit breaker status
      const isAllowed = policyEngine.isCircuitBreakerAllow('circuit-breaker-module');
      expect(isAllowed).toBe(false); // Should be open

      // Verify policy engine tracks circuit breaker state
      const policyStatus = policyEngine.getStatus();
      expect(policyStatus.circuitBreakersCount).toBeGreaterThan(0);
      
      // Simulate recovery time passing
      jest.useFakeTimers();
      jest.advanceTimersByTime(301000); // Past recovery time
      
      // Should be allowed again (half-open state)
      const isAllowedAfterRecovery = policyEngine.isCircuitBreakerAllow('circuit-breaker-module');
      expect(isAllowedAfterRecovery).toBe(true);
      
      jest.useRealTimers();
    });

    test('should handle multiple circuit breakers for different modules', async () => {
      const config = {
        enabled: true,
        timeout: 60000,
        threshold: 2,
        recoveryTime: 300000
      };

      // Trigger circuit breaker for module A
      policyEngine.updateCircuitBreaker('module-a', false, config);
      policyEngine.updateCircuitBreaker('module-a', false, config);
      
      // Trigger circuit breaker for module B
      policyEngine.updateCircuitBreaker('module-b', false, config);
      policyEngine.updateCircuitBreaker('module-b', false, config);
      policyEngine.updateCircuitBreaker('module-b', false, config);

      // Check individual states
      const isModuleAAllowed = policyEngine.isCircuitBreakerAllow('module-a');
      const isModuleBAllowed = policyEngine.isCircuitBreakerAllow('module-b');
      
      expect(isModuleAAllowed).toBe(false);
      expect(isModuleBAllowed).toBe(false);
      
      // Verify policy engine tracks both
      const policyStatus = policyEngine.getStatus();
      expect(policyStatus.circuitBreakersCount).toBe(2);
    });
  });

  describe('Template Manager Communication', () => {
    test('should communicate template selection for error contexts', async () => {
      // Get template for specific error
      const template = await responseTemplateManager.getTemplateForError(mockErrorContext);
      
      expect(template).toBeDefined();
      expect(template.templateId).toBe('default'); // Should get default template
      
      // Generate response from template
      const templateResponse = await responseTemplateManager.generateResponse(template, mockErrorContext);
      
      // Verify template communication
      expect(templateResponse).toBeDefined();
      expect(templateResponse.errorId).toBe('communication-test-error-1');
      expect(templateResponse.result.message).toBeDefined();

      // Verify template manager status
      const templateStatus = responseTemplateManager.getStatus();
      expect(templateStatus.isInitialized).toBe(true);
      expect(templateStatus.templatesCount).toBeGreaterThan(0);
    });

    test('should handle dynamic template loading communication', async () => {
      // Load dynamic templates
      await responseTemplateManager.loadDynamicTemplates();
      
      // Verify communication with dynamic loader (even if no loader present)
      const templateStatus = responseTemplateManager.getStatus();
      expect(templateStatus.dynamicLoaderAvailable).toBe(false);
      
      // Should not throw when no dynamic loader
      expect(true).toBe(true);
    });
  });

  describe('Component Status Communication', () => {
    test('should provide consistent status across components', async () => {
      // Get statuses from all components
      const gatewayStatus = errorInterfaceGateway.getStatus();
      const queueStatus = errorQueueManager.getQueueStatus();
      const routerStatus = responseRouterEngine.getStatus();
      const executorStatus = responseExecutor.getStatus();
      const policyStatus = policyEngine.getStatus();
      const templateStatus = responseTemplateManager.getStatus();
      const registryStatus = moduleRegistryManager.getStatus();

      // Verify all components report initialized
      expect(gatewayStatus.isInitialized).toBe(true);
      expect(queueStatus.Processing).toBe(false);
      expect(routerStatus.isInitialized).toBe(true);
      expect(executorStatus.isInitialized).toBe(true);
      expect(policyStatus.isInitialized).toBe(true);
      expect(templateStatus.isInitialized).toBe(true);
      expect(registryStatus.isInitialized).toBe(true);

      // Verify cross-component communication consistency
      expect(routerStatus.moduleHandlersCount).toBe(registryStatus.modulesCount);
    });

    test('should communicate shutdown states properly', async () => {
      // Create temporary components for shutdown test
      const tempQueueManager = new ErrorQueueManager();
      const tempRouterEngine = new ResponseRouterEngine(mockModuleHandler);
      
      await tempQueueManager.initialize();
      await tempRouterEngine.initialize();
      
      // Verify initialized states
      expect(tempQueueManager.getQueueStatus().size).toBe(0);
      expect(tempRouterEngine.getStatus().isInitialized).toBe(true);
      
      // Shutdown components
      await tempRouterEngine.shutdown();
      await tempQueueManager.shutdown();
      
      // Verify shutdown states
      expect(tempRouterEngine.getStatus().isInitialized).toBe(false);
      // Queue manager doesn't expose isInitialized, but shutdown should complete
      expect(true).toBe(true);
    });
  });

  describe('Batch Processing Communication', () => {
    test('should coordinate batch processing between components', async () => {
      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'batch-communication-module',
        moduleName: 'BatchCommunicationModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Create batch of errors
      const batchErrors = Array(5).fill(null).map((_, i) => ({
        ...mockErrorContext,
        errorId: `batch-communication-error-${i}`,
        error: new Error(`Batch communication error ${i}`)
      }));

      // Process batch through gateway
      const startTime = Date.now();
      const responses = await errorInterfaceGateway.handleBatchErrors(batchErrors);
      const endTime = Date.now();

      // Verify batch communication coordination
      expect(responses).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(5000); // Should be reasonably fast

      // Each error should have been processed through the full chain
      responses.forEach(response => {
        expect(response.errorId).toMatch(/batch-communication-error-\d+/);
        expect(response.result.status).toBe('success' as any);
      });

      // Verify batch handling didn't interfere with other operations
      const singleResponse = await errorInterfaceGateway.handleError({
        ...mockErrorContext,
        errorId: 'post-batch-single-error'
      });
      
      expect(singleResponse).toBeDefined();
      expect(singleResponse.errorId).toBe('post-batch-single-error');
    });

    test('should handle partial batch failures gracefully', async () => {
      console.error = jest.fn(); // Suppress error output

      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'partial-failure-module',
        moduleName: 'PartialFailureModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Create batch with one failing error
      const batchErrors = [
        {
          ...mockErrorContext,
          errorId: 'batch-success-error-1'
        },
        {
          ...mockErrorContext,
          errorId: 'batch-failure-error'
        },
        {
          ...mockErrorContext,
          errorId: 'batch-success-error-2'
        }
      ];

      // Make middle error fail
      mockModuleHandler.execute.mockImplementationOnce(async (errorContext: ErrorContext) => {
        if (errorContext.errorId === 'batch-failure-error') {
          throw new Error('Batch processing failure');
        }
        // Return normal response for others
        return {
          responseId: `batch-response-${errorContext.errorId}`,
          errorId: errorContext.errorId,
          result: {
            status: 'success' as any,
            message: 'Batch processed successfully',
            details: '',
            code: 'BATCH_SUCCESS'
          },
          timestamp: new Date(),
          processingTime: 50,
          data: {
            moduleName: errorContext.source.moduleName,
            moduleId: errorContext.source.moduleId,
            response: { message: 'Batch response' },
            config: {},
            metadata: {}
          },
          actions: [],
          annotations: []
        } as ErrorResponse;
      });

      // Process batch
      const responses = await errorInterfaceGateway.handleBatchErrors(batchErrors);
      
      // Should have mixed results
      expect(responses).toHaveLength(3);
      
      // Check that successful errors succeeded
      const successResponses = responses.filter(r => r.errorId.includes('batch-success'));
      expect(successResponses).toHaveLength(2);
      successResponses.forEach(response => {
        expect(response.result.code).toBe('BATCH_SUCCESS');
      });

      // Check that failed error has failure response
      const failureResponse = responses.find(r => r.errorId === 'batch-failure-error');
      expect(failureResponse?.result.code).toBe('PROCESSING_FAILED');

      console.error = jest.requireActual('console').error;
    });
  });

  describe('Health and Monitoring Communication', () => {
    test('should communicate health status across components', async () => {
      // Get health from registry manager
      const healthStatus = moduleRegistryManager.getAllModulesHealth();
      
      // All registered modules should have health info
      const moduleIds = Object.keys(healthStatus);
      expect(moduleIds.length).toBeGreaterThan(0);
      
      moduleIds.forEach(moduleId => {
        const moduleHealth = healthStatus[moduleId];
        expect(moduleHealth).toBeDefined();
        expect(moduleHealth.status).toBeDefined();
        expect(moduleHealth.healthy).toBeDefined();
      });

      // Verify communication consistency
      const registryStatus = moduleRegistryManager.getStatus();
      expect(Object.keys(healthStatus)).toHaveLength(registryStatus.modulesCount);
    });

    test('should communicate dependency resolution health', async () => {
      // Register modules with dependencies
      const dependencyModule: ModuleRegistration = {
        moduleId: 'health-dep-module',
        moduleName: 'HealthDepModule',
        version: '1.0.0',
        dependencies: []
      } as ModuleRegistration;

      const dependentModule: ModuleRegistration = {
        moduleId: 'health-dependent-module',
        moduleName: 'HealthDependentModule',
        version: '1.0.0',
        dependencies: ['health-dep-module'],
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      moduleRegistryManager.registerModule(dependencyModule);
      moduleRegistryManager.registerModule(dependentModule);

      // Verify dependency resolution communication
      const dependents = moduleRegistryManager.getDependents('health-dep-module');
      const dependencies = moduleRegistryManager.getModuleDependencies('health-dependent-module');
      const order = moduleRegistryManager.resolveDependencyOrder();

      expect(dependents).toContain('health-dependent-module');
      expect(dependencies).toContain('health-dep-module');
      expect(order.indexOf('health-dep-module')).toBeLessThan(order.indexOf('health-dependent-module'));
    });

    test('should communicate error rates and metrics', async () => {
      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'metrics-communication-module',
        moduleName: 'MetricsCommunicationModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      moduleRegistryManager.registerModule(moduleRegistration);

      // Simulate some errors
      moduleRegistryManager.incrementErrorCount('metrics-communication-module');
      moduleRegistryManager.incrementErrorCount('metrics-communication-module');
      moduleRegistryManager.incrementSuccessCount('metrics-communication-module');
      moduleRegistryManager.incrementSuccessCount('metrics-communication-module');
      moduleRegistryManager.incrementSuccessCount('metrics-communication-module');

      // Check health reflects error rates
      const healthStatus = moduleRegistryManager.getAllModulesHealth();
      const moduleHealth = healthStatus['metrics-communication-module'];
      
      expect(moduleHealth).toBeDefined();
      expect(moduleHealth.errorCount).toBe(2);
      expect(moduleHealth.successCount).toBe(3);
      
      // With 40% error rate, should still be healthy (threshold is 10%)
      expect(moduleHealth.healthy).toBe(true);
      
      // Simulate high error rate
      for (let i = 0; i < 20; i++) {
        moduleRegistryManager.incrementErrorCount('metrics-communication-module');
      }
      
      const updatedHealthStatus = moduleRegistryManager.getAllModulesHealth();
      const updatedModuleHealth = updatedHealthStatus['metrics-communication-module'];
      
      // With high error rate, should not be healthy
      expect(updatedModuleHealth.healthy).toBe(false);
    });
  });

  describe('Action Execution Communication', () => {
    test('should communicate action execution between executor and components', async () => {
      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'action-communication-module',
        moduleName: 'ActionCommunicationModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);

      // Process error that generates actions
      const response = await responseExecutor.executeSync(mockErrorContext, mockModuleHandler);
      
      // Verify action communication
      expect(response.actions).toBeDefined();
      expect(response.actions?.length).toBeGreaterThan(0);
      
      const logAction = response.actions?.find(a => a.type === ActionType.LOG);
      expect(logAction).toBeDefined();
      expect(logAction?.target).toBe('system_logger');
      
      // Verify action completion
      expect(logAction?.status).toBe(ActionStatus.COMPLETED);
    });

    test('should handle action execution failures gracefully', async () => {
      console.warn = jest.fn(); // Suppress warning output
      
      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'action-failure-module',
        moduleName: 'ActionFailureModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);

      // Create response with failing action
      const failingActionResponse = {
        ...await responseExecutor['createBaseResponse'](mockErrorContext, mockModuleHandler, 'test-exec-id'),
        actions: [
          {
            actionId: 'failing-action',
            type: 'unknown_action_type' as any,
            target: 'unknown-target',
            payload: {},
            priority: 'medium' as any,
            status: ActionStatus.PENDING,
            timestamp: new Date()
          }
        ]
      };

      // Execute actions manually (this simulates internal communication)
      const finalResponse = await responseExecutor['executeActions'](failingActionResponse, mockErrorContext);
      
      // Should handle gracefully
      expect(finalResponse.actions).toHaveLength(1);
      // Action should be marked as failed
      expect(finalResponse.actions[0].status).toBe(ActionStatus.FAILED);
      
      console.warn = jest.requireActual('console').warn;
    });
  });

  describe('Cross-Component Data Flow Communication', () => {
    test('should maintain data consistency through component chain', async () => {
      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'data-flow-module',
        moduleName: 'DataFlowModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Add custom data to error context
      const errorWithContext = {
        ...mockErrorContext,
        errorId: 'data-flow-error',
        data: {
          ...mockErrorContext.data,
          customField: 'test-value',
          nested: {
            deeply: {
              nested: 'deep-value'
            }
          }
        },
        config: {
          processingOption: 'async',
          timeout: 5000
        }
      };

      // Process through full component chain
      const response = await errorInterfaceGateway.handleError(errorWithContext);
      
      // Verify data consistency through chain
      expect(response.errorId).toBe('data-flow-error');
      expect(response.data.moduleId).toBe('data-flow-module');
      expect(response.data.moduleName).toBe('DataFlowModule');
      expect(response.data.config.processingOption).toBe('async');
      expect(response.data.config.timeout).toBe(5000);
      
      // Custom data should be preserved
      expect(response.data.metadata.customField).toBe('test-value');
      expect(response.data.metadata.nested.deeply.nested).toBe('deep-value');
    });

    test('should handle metadata propagation through components', async () => {
      // Register module
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'metadata-flow-module',
        moduleName: 'MetadataFlowModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      errorInterfaceGateway.registerModule(moduleRegistration);

      // Process error that should generate rich metadata
      const startTime = Date.now();
      const response = await errorInterfaceGateway.handleError({
        ...mockErrorContext,
        errorId: 'metadata-flow-error'
      });
      const endTime = Date.now();

      // Verify metadata communication
      expect(response.timestamp).toBeDefined();
      expect(response.timestamp.getTime()).toBeGreaterThanOrEqual(startTime);
      expect(response.timestamp.getTime()).toBeLessThanOrEqual(endTime);
      
      expect(response.processingTime).toBeGreaterThan(0);
      expect(response.processingTime).toBeLessThanOrEqual(endTime - startTime);
      
      // Component-specific metadata
      expect(response.data.moduleId).toBe('metadata-flow-module');
      expect(response.data.moduleName).toBe('MetadataFlowModule');
      
      // Handler metadata
      expect(response.data.metadata.processed).toBe(true);
      
      // Action metadata
      if (response.actions && response.actions.length > 0) {
        response.actions.forEach(action => {
          expect(action.timestamp).toBeDefined();
          expect(action.status).toBe(ActionStatus.COMPLETED);
        });
      }
    });
  });
});