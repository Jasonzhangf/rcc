import { ResponseExecutor } from '../src/components/ResponseExecutor';
import { PolicyEngine } from '../src/components/PolicyEngine';
import { 
  ErrorContext, 
  ErrorResponse, 
  ResponseHandler,
  Action,
  ActionType,
  HandlingStatus,
  ActionStatus,
  ErrorType,
  ErrorSeverity,
  ErrorSource,
  ErrorImpact,
  ErrorRecoverability
} from '../types/ErrorHandlingCenter.types';

// Mock PolicyEngine
jest.mock('../src/components/PolicyEngine');
const MockPolicyEngine = PolicyEngine as jest.MockedClass<typeof PolicyEngine>;

describe('ResponseExecutor', () => {
  let responseExecutor: ResponseExecutor;
  let mockPolicyEngine: jest.Mocked<PolicyEngine>;
  let mockResponseHandler: jest.Mocked<ResponseHandler>;
  let mockErrorHandler: jest.Mocked<ResponseHandler>;
  let mockErrorContext: ErrorContext;

  beforeEach(() => {
    mockPolicyEngine = new MockPolicyEngine() as jest.Mocked<PolicyEngine>;
    
    mockResponseHandler = {
      execute: jest.fn()
    } as jest.Mocked<ResponseHandler>;

    mockErrorHandler = {
      execute: jest.fn()
    } as jest.Mocked<ResponseHandler>;

    responseExecutor = new ResponseExecutor(mockPolicyEngine);

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

    // Setup default mock behavior
    mockPolicyEngine.initialize.mockResolvedValue();
    mockPolicyEngine.executePolicies.mockResolvedValue({
      responseId: 'policy-response',
      errorId: 'test-error-1',
      result: {
        status: 'success' as any,
        message: 'Policy executed',
        details: '',
        code: 'POLICY_SUCCESS'
      },
      timestamp: new Date(),
      processingTime: 50,
      data: {
        moduleName: 'TestModule',
        moduleId: 'test-module',
        response: {},
        config: {},
        metadata: {}
      },
      actions: [],
      annotations: []
    } as ErrorResponse);

    mockResponseHandler.execute.mockResolvedValue({
      responseId: 'handler-response',
      errorId: 'test-error-1',
      result: {
        status: 'success' as any,
        message: 'Handler executed',
        details: '',
        code: 'HANDLER_SUCCESS'
      },
      timestamp: new Date(),
      processingTime: 100,
      data: {
        moduleName: 'TestModule',
        moduleId: 'test-module',
        response: {},
        config: {},
        metadata: {}
      },
      actions: [],
      annotations: []
    } as ErrorResponse);

    mockErrorHandler.execute.mockResolvedValue({
      responseId: 'error-response',
      errorId: 'test-error-1',
      result: {
        status: 'failure' as any,
        message: 'Handler error',
        details: '',
        code: 'HANDLER_ERROR'
      },
      timestamp: new Date(),
      processingTime: 150,
      data: {
        moduleName: 'TestModule',
        moduleId: 'test-module',
        response: {},
        config: {},
        metadata: {}
      },
      actions: [],
      annotations: []
    } as ErrorResponse);
  });

  afterEach(async () => {
    if (responseExecutor) {
      await responseExecutor.shutdown();
    }
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await responseExecutor.initialize();
      const status = responseExecutor.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    test('should initialize policy engine', async () => {
      await responseExecutor.initialize();
      expect(mockPolicyEngine.initialize).toHaveBeenCalledTimes(1);
    });

    test('should not initialize twice', async () => {
      await responseExecutor.initialize();
      await responseExecutor.initialize();
      
      expect(mockPolicyEngine.initialize).toHaveBeenCalledTimes(1);
    });

    test('should handle initialization errors', async () => {
      mockPolicyEngine.initialize.mockRejectedValue(new Error('Policy engine init failed'));
      
      await expect(responseExecutor.initialize())
        .rejects.toThrow('Policy engine init failed');
    });
  });

  describe('Synchronous Execution', () => {
    beforeEach(async () => {
      await responseExecutor.initialize();
    });

    test('should execute response synchronously', async () => {
      const response = await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      expect(mockResponseHandler.execute).toHaveBeenCalledWith(mockErrorContext);
      expect(mockPolicyEngine.executePolicies).toHaveBeenCalled();
      expect(response).toBeDefined();
      expect(response.responseId).toContain('exec_');
    });

    test('should handle handler errors gracefully', async () => {
      mockResponseHandler.execute.mockRejectedValue(new Error('Handler failed'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const response = await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      expect(response.result.status).toBe(HandlingStatus.FAILURE);
      expect(response.result.code).toBe('HANDLER_FAILURE');
      
      jest.restoreAllMocks();
    });

    test('should handle policy engine errors gracefully', async () => {
      mockPolicyEngine.executePolicies.mockRejectedValue(new Error('Policy engine failed'));
      
      const response = await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      expect(response).toBeDefined();
      expect(response.result.status).toBe(HandlingStatus.FAILURE);
    });

    test('should track execution metrics', async () => {
      const response = await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      expect(response.processingTime).toBeGreaterThan(0);
      
      const metrics = responseExecutor.getExecutionMetrics();
      expect(metrics.size).toBe(1);
    });

    test('should manage concurrency slots', async () => {
      const initialStatus = responseExecutor.getStatus();
      expect(initialStatus.currentExecutions).toBe(0);
      
      await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      const finalStatus = responseExecutor.getStatus();
      expect(finalStatus.currentExecutions).toBe(0); // Should be released
    });

    test('should throw error when not initialized', async () => {
      const uninitializedExecutor = new ResponseExecutor(mockPolicyEngine);
      
      await expect(uninitializedExecutor.executeSync(mockErrorContext, mockResponseHandler))
        .rejects.toThrow('Response Executor is not initialized');
    });

    test('should handle concurrent execution within limits', async () => {
      const maxConcurrent = responseExecutor['maxConcurrentExecutions'];
      const promises = [];
      
      // Start concurrent executions
      for (let i = 0; i < maxConcurrent; i++) {
        const errorContext = { ...mockErrorContext, errorId: `concurrent-error-${i}` };
        promises.push(responseExecutor.executeSync(errorContext, mockResponseHandler));
      }
      
      // All should execute successfully
      const results = await Promise.all(promises);
      expect(results).toHaveLength(maxConcurrent);
    });
  });

  describe('Asynchronous Execution', () => {
    beforeEach(async () => {
      await responseExecutor.initialize();
    });

    test('should execute response asynchronously', async () => {
      const callback = jest.fn();
      mockErrorContext.callback = callback;
      
      const response = await responseExecutor.executeAsync(mockErrorContext, mockResponseHandler);
      
      expect(response.result.status).toBe(HandlingStatus.PARTIAL);
      expect(response.result.code).toBe('ASYNC_SCHEDULED');
      
      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(callback).toHaveBeenCalled();
    });

    test('should handle async callback with fallback response on error', async () => {
      const callback = jest.fn();
      mockErrorContext.callback = callback;
      
      mockPolicyEngine.executePolicies.mockRejectedValue(new Error('Async processing failed'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await responseExecutor.executeAsync(mockErrorContext, mockResponseHandler);
      
      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(callback).toHaveBeenCalled();
      const callbackResponse = callback.mock.calls[0][0];
      expect(callbackResponse.result.code).toBe('EXECUTION_FAILED');
      
      jest.restoreAllMocks();
    });

    test('should work without callback', async () => {
      delete mockErrorContext.callback;
      
      const response = await responseExecutor.executeAsync(mockErrorContext, mockResponseHandler);
      
      expect(response.result.status).toBe(HandlingStatus.PARTIAL);
      
      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not throw
      expect(true).toBe(true);
    });

    test('should throw error when not initialized', async () => {
      const uninitializedExecutor = new ResponseExecutor(mockPolicyEngine);
      
      await expect(uninitializedExecutor.executeAsync(mockErrorContext, mockResponseHandler))
        .rejects.toThrow('Response Executor is not initialized');
    });
  });

  describe('Batch Execution', () => {
    beforeEach(async () => {
      await responseExecutor.initialize();
    });

    test('should execute batch responses successfully', async () => {
      const errors = [
        { ...mockErrorContext, errorId: 'batch-error-1' },
        { ...mockErrorContext, errorId: 'batch-error-2' }
      ];
      const handlers = [mockResponseHandler, mockResponseHandler];
      
      const responses = await responseExecutor.executeBatch(errors, handlers);
      
      expect(responses).toHaveLength(2);
      expect(mockResponseHandler.execute).toHaveBeenCalledTimes(2);
      expect(responses[0].errorId).toBe('batch-error-1');
      expect(responses[1].errorId).toBe('batch-error-2');
    });

    test('should execute batch with default handler', async () => {
      const errors = [
        { ...mockErrorContext, errorId: 'batch-error-1' },
        { ...mockErrorContext, errorId: 'batch-error-2' }
      ];
      
      const responses = await responseExecutor.executeBatch(errors, mockResponseHandler);
      
      expect(responses).toHaveLength(2);
      expect(mockResponseHandler.execute).toHaveBeenCalledTimes(2);
    });

    test('should handle empty batch', async () => {
      const responses = await responseExecutor.executeBatch([], []);
      
      expect(responses).toHaveLength(0);
    });

    test('should handle handler array length mismatch', async () => {
      const errors = [
        { ...mockErrorContext, errorId: 'batch-error-1' },
        { ...mockErrorContext, errorId: 'batch-error-2' }
      ];
      const handlers = [mockResponseHandler]; // Missing one handler
      
      await expect(responseExecutor.executeBatch(errors, handlers))
        .rejects.toThrow('Number of handlers must match number of errors');
    });

    test('should handle partial batch failures', async () => {
      const errors = [
        { ...mockErrorContext, errorId: 'batch-error-1' },
        { ...mockErrorContext, errorId: 'batch-error-2' }
      ];
      const handlers = [mockResponseHandler, mockErrorHandler];
      
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const responses = await responseExecutor.executeBatch(errors, handlers);
      
      expect(responses).toHaveLength(2);
      expect(responses[0].result.code).toBe('HANDLER_SUCCESS');
      expect(responses[1].result.code).toBe('EXECUTION_FAILED');
      
      jest.restoreAllMocks();
    });

    test('should handle batch processing errors', async () => {
      const errors = [
        { ...mockErrorContext, errorId: 'batch-error-1' }
      ];
      
      mockResponseHandler.execute.mockRejectedValue(new Error('Batch processing failed'));
      
      const responses = await responseExecutor.executeBatch(errors, mockResponseHandler);
      
      expect(responses).toHaveLength(1);
      expect(responses[0].result.code).toBe('EXECUTION_FAILED');
    });

    test('should process in appropriate batch sizes', async () => {
      const errors = Array(20).fill(null).map((_, i) => ({
        ...mockErrorContext,
        errorId: `batch-error-${i}`
      }));
      
      const responses = await responseExecutor.executeBatch(errors, mockResponseHandler);
      
      expect(responses).toHaveLength(20);
      expect(mockResponseHandler.execute).toHaveBeenCalledTimes(20);
    });

    test('should throw error when not initialized', async () => {
      const uninitializedExecutor = new ResponseExecutor(mockPolicyEngine);
      
      await expect(uninitializedExecutor.executeBatch([mockErrorContext], [mockResponseHandler]))
        .rejects.toThrow('Response Executor is not initialized');
    });
  });

  describe('Action Execution', () => {
    beforeEach(async () => {
      await responseExecutor.initialize();
    });

    test('should execute retry action successfully', async () => {
      const responseWithRetryAction = {
        ...mockErrorResponse,
        actions: [
          {
            actionId: 'retry-action',
            type: ActionType.RETRY,
            target: 'test-module',
            payload: {
              retryAttempt: 1,
              maxRetries: 3,
              delay: 1000
            },
            priority: 'medium' as any,
            status: 'pending' as any,
            timestamp: new Date()
          }
        ]
      } as ErrorResponse;

      const response = await responseExecutor['executeActions'](responseWithRetryAction, mockErrorContext);
      
      expect(response.actions).toHaveLength(1);
      expect(response.actions[0].status).toBe(ActionStatus.COMPLETED);
    });

    test('should execute fallback action successfully', async () => {
      const responseWithFallbackAction = {
        ...mockErrorResponse,
        actions: [
          {
            actionId: 'fallback-action',
            type: ActionType.FALLBACK,
            target: 'test-module',
            payload: {
              fallbackResponse: { message: 'Fallback response' },
              timeout: 5000
            },
            priority: 'high' as any,
            status: 'pending' as any,
            timestamp: new Date()
          }
        ]
      } as ErrorResponse;

      const response = await responseExecutor['executeActions'](responseWithFallbackAction, mockErrorContext);
      
      expect(response.actions).toHaveLength(1);
      expect(response.actions[0].status).toBe(ActionStatus.COMPLETED);
    });

    test('should execute log action successfully', async () => {
      const responseWithLogAction = {
        ...mockErrorResponse,
        actions: [
          {
            actionId: 'log-action',
            type: ActionType.LOG,
            target: 'system_logger',
            payload: {
              level: 'error',
              message: 'Test error',
              module: 'TestModule'
            },
            priority: 'medium' as any,
            status: 'pending' as any,
            timestamp: new Date()
          }
        ]
      } as ErrorResponse;

      const response = await responseExecutor['executeActions'](responseWithLogAction, mockErrorContext);
      
      expect(response.actions).toHaveLength(1);
      expect(response.actions[0].status).toBe(ActionStatus.COMPLETED);
    });

    test('should execute notify action successfully', async () => {
      const responseWithNotifyAction = {
        ...mockErrorResponse,
        actions: [
          {
            actionId: 'notify-action',
            type: ActionType.NOTIFY,
            target: 'admin_email',
            payload: {
              channel: 'email',
              config: { recipients: ['admin@example.com'] },
              template: 'error-notification',
              error: {
                id: 'test-error-1',
                message: 'Test error',
                severity: 'critical' as any,
                module: 'TestModule'
              }
            },
            priority: 'medium' as any,
            status: 'pending' as any,
            timestamp: new Date()
          }
        ]
      } as ErrorResponse;

      const response = await responseExecutor['executeActions'](responseWithNotifyAction, mockErrorContext);
      
      expect(response.actions).toHaveLength(1);
      expect(response.actions[0].status).toBe(ActionStatus.COMPLETED);
    });

    test('should execute isolate action successfully', async () => {
      const responseWithIsolateAction = {
        ...mockErrorResponse,
        actions: [
          {
            actionId: 'isolate-action',
            type: ActionType.ISOLATE,
            target: 'test-module',
            payload: {
              isolationTimeout: 60000,
              recoveryTime: 300000
            },
            priority: 'critical' as any,
            status: 'pending' as any,
            timestamp: new Date()
          }
        ]
      } as ErrorResponse;

      const response = await responseExecutor['executeActions'](responseWithIsolateAction, mockErrorContext);
      
      expect(response.actions).toHaveLength(1);
      expect(response.actions[0].status).toBe(ActionStatus.COMPLETED);
      expect(mockPolicyEngine.updateCircuitBreaker).toHaveBeenCalled();
    });

    test('should execute restart action successfully', async () => {
      const responseWithRestartAction = {
        ...mockErrorResponse,
        actions: [
          {
            actionId: 'restart-action',
            type: ActionType.RESTART,
            target: 'test-module',
            payload: {
              cleanStart: true,
              preserveState: false
            },
            priority: 'high' as any,
            status: 'pending' as any,
            timestamp: new Date()
          }
        ]
      } as ErrorResponse;

      const response = await responseExecutor['executeActions'](responseWithRestartAction, mockErrorContext);
      
      expect(response.actions).toHaveLength(1);
      expect(response.actions[0].status).toBe(ActionStatus.COMPLETED);
    });

    test('should execute custom action successfully', async () => {
      const responseWithCustomAction = {
        ...mockErrorResponse,
        actions: [
          {
            actionId: 'custom-action',
            type: ActionType.CUSTOM,
            target: 'custom_action',
            payload: {
              policyId: 'custom-policy',
              customConfig: { param1: 'value1' },
              errorContext: mockErrorContext
            },
            priority: 'low' as any,
            status: 'pending' as any,
            timestamp: new Date()
          }
        ]
      } as ErrorResponse;

      const response = await responseExecutor['executeActions'](responseWithCustomAction, mockErrorContext);
      
      expect(response.actions).toHaveLength(1);
      expect(response.actions[0].status).toBe(ActionStatus.COMPLETED);
    });

    test('should handle unknown action type', async () => {
      const responseWithUnknownAction = {
        ...mockErrorResponse,
        actions: [
          {
            actionId: 'unknown-action',
            type: 'unknown_type' as any,
            target: 'test-target',
            payload: {},
            priority: 'medium' as any,
            status: 'pending' as any,
            timestamp: new Date()
          }
        ]
      } as ErrorResponse;

      await expect(responseExecutor['executeActions'](responseWithUnknownAction, mockErrorContext))
        .rejects.toThrow('Unknown action type: unknown_type');
    });

    test('should handle action execution errors gracefully', async () => {
      const responseWithAction = {
        ...mockErrorResponse,
        actions: [
          {
            actionId: 'failing-action',
            type: ActionType.RETRY,
            target: 'test-module',
            payload: {},
            priority: 'medium' as any,
            status: 'pending' as any,
            timestamp: new Date()
          }
        ]
      } as ErrorResponse;

      // Mock action execution to throw error
      jest.spyOn(responseExecutor as any, 'executeRetryAction').mockImplementation(() => {
        throw new Error('Action execution failed');
      });

      const response = await responseExecutor['executeActions'](responseWithAction, mockErrorContext);
      
      expect(response.actions).toHaveLength(1);
      expect(response.actions[0].status).toBe(ActionStatus.FAILED);
    });

    test('should execute multiple actions', async () => {
      const actionCount = 5;
      const actions = Array(actionCount).fill(null).map((_, i) => ({
        actionId: `action-${i}`,
        type: ActionType.LOG,
        target: 'system_logger',
        payload: { message: `Log message ${i}` },
        priority: 'medium' as any,
        status: 'pending' as any,
        timestamp: new Date()
      }));

      const response = await responseExecutor['executeActions'](
        { ...mockErrorResponse, actions },
        mockErrorContext
      );
      
      expect(response.actions).toHaveLength(actionCount);
      response.actions.forEach(action => {
        expect(action.status).toBe(ActionStatus.COMPLETED);
      });
    });
  });

  describe('Response Creation', () => {
    beforeEach(async () => {
      await responseExecutor.initialize();
    });

    test('should create base response successfully', async () => {
      const response = await responseExecutor['createBaseResponse'](mockErrorContext, mockResponseHandler, 'test-execution-id');
      
      expect(response.responseId).toBe('test-execution-id');
      expect(response.errorId).toBe('test-error-1');
      expect(mockResponseHandler.execute).toHaveBeenCalledWith(mockErrorContext);
    });

    test('should handle base response creation errors', async () => {
      mockResponseHandler.execute.mockRejectedValue(new Error('Handler failed'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const response = await responseExecutor['createBaseResponse'](mockErrorContext, mockResponseHandler, 'test-execution-id');
      
      expect(response.result.status).toBe(HandlingStatus.FAILURE);
      expect(response.result.code).toBe('HANDLER_FAILURE');
      
      jest.restoreAllMocks();
    });

    test('should create fallback response', async () => {
      const error = new Error('Processing failed');
      const fallbackResponse = responseExecutor['createFallbackResponse']('test-error-id', error);
      
      expect(fallbackResponse.responseId).toContain('fallback_test-error-id');
      expect(fallbackResponse.result.status).toBe(HandlingStatus.FAILURE);
      expect(fallbackResponse.result.code).toBe('EXECUTION_FAILED');
      expect(fallbackResponse.data.metadata.isFallback).toBe(true);
      expect(fallbackResponse.data.metadata.originalError).toBe('Processing failed');
    });
  });

  describe('Concurrency Management', () => {
    beforeEach(async () => {
      await responseExecutor.initialize();
    });

    test('should respect maximum concurrent executions', async () => {
      responseExecutor.setMaxConcurrentExecutions(2);
      
      const promises = [];
      const errorContexts = Array(5).fill(null).map((_, i) => ({
        ...mockErrorContext,
        errorId: `concurrent-error-${i}`
      }));

      // Start more executions than allowed
      for (let i = 0; i < 5; i++) {
        promises.push(responseExecutor.executeSync(errorContexts[i], mockResponseHandler));
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(5);
      // Should take longer due to concurrency limits
      expect(endTime - startTime).toBeGreaterThan(100);
    });

    test('should release execution slots properly', async () => {
      responseExecutor.setMaxConcurrentExecutions(1);
      
      // Execute sequentially
      await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      const status = responseExecutor.getStatus();
      expect(status.currentExecutions).toBe(0);
    });

    test('should handle slot acquisition errors gracefully', async () => {
      responseExecutor.setMaxConcurrentExecutions(0); // No slots
      
      const executePromise = responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      // Should eventually acquire a slot
      await expect(executePromise).resolves.toBeDefined();
    });
  });

  describe('Metrics Management', () => {
    beforeEach(async () => {
      await responseExecutor.initialize();
    });

    test('should record execution metrics', async () => {
      await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      const metrics = responseExecutor.getExecutionMetrics();
      expect(metrics.size).toBe(1);
      
      const metric = Array.from(metrics.values())[0];
      expect(metric.mode).toBe('sync');
      expect(metric.duration).toBeGreaterThan(0);
      expect(metric.success).toBe(true);
    });

    test('should record failed execution metrics', async () => {
      mockResponseHandler.execute.mockRejectedValue(new Error('Handler failed'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      const metrics = responseExecutor.getExecutionMetrics();
      const metric = Array.from(metrics.values())[0];
      expect(metric.success).toBe(false);
      
      jest.restoreAllMocks();
    });

    test('should update async execution metrics', async () => {
      const callback = jest.fn();
      mockErrorContext.callback = callback;
      
      await responseExecutor.executeAsync(mockErrorContext, mockResponseHandler);
      
      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = responseExecutor.getExecutionMetrics();
      expect(metrics.size).toBeGreaterThan(0);
    });

    test('should clear execution metrics', async () => {
      await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      expect(responseExecutor.getExecutionMetrics().size).toBeGreaterThan(0);
      
      responseExecutor.clearExecutionMetrics();
      
      expect(responseExecutor.getExecutionMetrics().size).toBe(0);
    });
  });

  describe('Status and Configuration', () => {
    beforeEach(async () => {
      await responseExecutor.initialize();
    });

    test('should return correct status', () => {
      const status = responseExecutor.getStatus();
      
      expect(status.isInitialized).toBe(true);
      expect(status.enableMetrics).toBe(true);
      expect(status.maxConcurrentExecutions).toBeGreaterThan(0);
      expect(status.currentExecutions).toBeGreaterThanOrEqual(0);
      expect(status.executionMetricsCount).toBeGreaterThanOrEqual(0);
    });

    test('should enable and disable metrics', () => {
      responseExecutor.setMetricsEnabled(false);
      
      let status = responseExecutor.getStatus();
      expect(status.enableMetrics).toBe(false);
      
      responseExecutor.setMetricsEnabled(true);
      status = responseExecutor.getStatus();
      expect(status.enableMetrics).toBe(true);
    });

    test('should set maximum concurrent executions', () => {
      responseExecutor.setMaxConcurrentExecutions(5);
      
      const status = responseExecutor.getStatus();
      expect(status.maxConcurrentExecutions).toBe(5);
      
      responseExecutor.setMaxConcurrentExecutions(1);
      const updatedStatus = responseExecutor.getStatus();
      expect(updatedStatus.maxConcurrentExecutions).toBe(1);
    });

    test('should validate max concurrent executions', () => {
      responseExecutor.setMaxConcurrentExecutions(0);
      
      // Should default to minimum of 1
      const status = responseExecutor.getStatus();
      expect(status.maxConcurrentExecutions).toBe(1);
    });
  });

  describe('Shutdown', () => {
    test('should shutdown successfully', async () => {
      await responseExecutor.initialize();
      await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      expect(responseExecutor.getExecutionMetrics().size).toBeGreaterThan(0);
      
      await responseExecutor.shutdown();
      
      const status = responseExecutor.getStatus();
      expect(status.isInitialized).toBe(false);
      expect(mockPolicyEngine.shutdown).toHaveBeenCalled();
    });

    test('should clear execution metrics on shutdown', async () => {
      await responseExecutor.initialize();
      await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      expect(responseExecutor.getExecutionMetrics().size).toBeGreaterThan(0);
      
      await responseExecutor.shutdown();
      
      // Create new executor to check metrics are cleared
      const newExecutor = new ResponseExecutor(mockPolicyEngine);
      await newExecutor.initialize();
      expect(newExecutor.getExecutionMetrics().size).toBe(0);
      await newExecutor.shutdown();
    });

    test('should handle shutdown errors gracefully', async () => {
      await responseExecutor.initialize();
      
      mockPolicyEngine.shutdown.mockRejectedValue(new Error('Shutdown failed'));
      
      await expect(responseExecutor.shutdown())
        .rejects.toThrow('Shutdown failed');
    });

    test('should shutdown when not initialized', async () => {
      const uninitializedExecutor = new ResponseExecutor(mockPolicyEngine);
      
      await expect(uninitializedExecutor.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await responseExecutor.initialize();
    });

    test('should handle error context without timestamp', async () => {
      const errorContextWithoutTimestamp = {
        ...mockErrorContext,
        timestamp: undefined as any
      };

      const response = await responseExecutor.executeSync(errorContextWithoutTimestamp, mockResponseHandler);
      
      expect(response).toBeDefined();
    });

    test('should handle response with missing fields', async () => {
      mockResponseHandler.execute.mockResolvedValue({
        // Minimal response
        responseId: 'minimal-response',
        errorId: 'test-error-1',
        result: {
          status: 'success' as any,
          message: 'Success',
          code: 'SUCCESS'
        },
        timestamp: new Date(),
        data: {
          moduleName: 'TestModule',
          moduleId: 'test-module',
          response: {},
          config: {},
          metadata: {}
        },
        actions: [],
        annotations: []
      } as any);

      const response = await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      expect(response).toBeDefined();
    });

    test('should handle very large response payloads', async () => {
      const largePayload = Array(10000).fill(null).map((_, i) => `payload-item-${i}`);
      
      mockResponseHandler.execute.mockResolvedValue({
        responseId: 'large-response',
        errorId: 'test-error-1',
        result: {
          status: 'success' as any,
          message: 'Success',
          code: 'SUCCESS'
        },
        timestamp: new Date(),
        data: {
          moduleName: 'TestModule',
          moduleId: 'test-module',
          response: { largePayload },
          config: {},
          metadata: {}
        },
        actions: [],
        annotations: []
      } as ErrorResponse);

      const response = await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      expect(response).toBeDefined();
      expect(response.data.response.largePayload).toHaveLength(10000);
    });

    test('should handle concurrent batch execution with large batches', async () => {
      const largeErrorSet = Array(100).fill(null).map((_, i) => ({
        ...mockErrorContext,
        errorId: `large-batch-error-${i}`
      }));

      const startTime = Date.now();
      const responses = await responseExecutor.executeBatch(largeErrorSet, mockResponseHandler);
      const endTime = Date.now();
      
      expect(responses).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete in reasonable time
    });

    test('should handle execution ID generation consistency', async () => {
      const response1 = await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      const response2 = await responseExecutor.executeSync(mockErrorContext, mockResponseHandler);
      
      expect(response1.responseId).toContain('exec_test-error-1');
      expect(response2.responseId).toContain('exec_test-error-1');
      expect(response1.responseId).not.toBe(response2.responseId);
    });

    test('should handle async execution with delayed completion', async () => {
      const callback = jest.fn();
      mockErrorContext.callback = callback;
      
      // Make policy engine slow
      mockPolicyEngine.executePolicies.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return mockErrorResponse;
      });

      await responseExecutor.executeAsync(mockErrorContext, mockResponseHandler);
      
      // Should return immediately
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 100));
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(150); // Should be fast
      
      // Wait for async completion
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(callback).toHaveBeenCalled();
    });
  });
});