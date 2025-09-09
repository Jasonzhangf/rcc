import { ErrorInterfaceGateway } from '../src/components/ErrorInterfaceGateway';
import { ErrorQueueManager } from '../src/components/ErrorQueueManager';
import { ResponseRouterEngine } from '../src/components/ResponseRouterEngine';
import { 
  ErrorContext, 
  ErrorResponse, 
  ModuleRegistration,
  ResponseHandler,
  ErrorSource,
  ErrorType,
  ErrorSeverity,
  ErrorImpact,
  ErrorRecoverability
} from '../types/ErrorHandlingCenter.types';

// Mock the dependent components
jest.mock('../src/components/ErrorQueueManager');
jest.mock('../src/components/ResponseRouterEngine');

const MockErrorQueueManager = ErrorQueueManager as jest.MockedClass<typeof ErrorQueueManager>;
const MockResponseRouterEngine = ResponseRouterEngine as jest.MockedClass<typeof ResponseRouterEngine>;

describe('ErrorInterfaceGateway', () => {
  let errorInterfaceGateway: ErrorInterfaceGateway;
  let mockQueueManager: jest.Mocked<ErrorQueueManager>;
  let mockRouterEngine: jest.Mocked<ResponseRouterEngine>;
  let mockErrorHandler: jest.Mocked<ResponseHandler>;
  let mockErrorContext: ErrorContext;

  beforeEach(() => {
    mockQueueManager = new MockErrorQueueManager() as jest.Mocked<ErrorQueueManager>;
    mockRouterEngine = new MockResponseRouterEngine(
      {} as ResponseHandler
    ) as jest.Mocked<ResponseRouterEngine>;
    
    mockErrorHandler = {
      execute: jest.fn()
    } as any as jest.Mocked<ResponseHandler>;

    errorInterfaceGateway = new ErrorInterfaceGateway(mockQueueManager, mockRouterEngine);

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

    // Setup default mock behavior
    mockRouterEngine.route.mockResolvedValue(mockErrorHandler);
    mockRouterEngine.shutdown = jest.fn().mockResolvedValue(undefined);
    mockQueueManager.shutdown = jest.fn().mockResolvedValue(undefined);
    mockErrorHandler.execute.mockResolvedValue({
      responseId: 'test-response',
      errorId: 'test-error-1',
      result: {
        status: 'success' as any,
        message: 'Error handled successfully',
        details: '',
        code: 'SUCCESS'
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
    });
  });

  afterEach(async () => {
    if (errorInterfaceGateway) {
      await errorInterfaceGateway.shutdown();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      mockQueueManager.initialize.mockResolvedValue();
      mockRouterEngine.initialize.mockResolvedValue();
      
      await errorInterfaceGateway.initialize();
      
      expect(mockQueueManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockRouterEngine.initialize).toHaveBeenCalledTimes(1);
    });

    test('should handle initialization errors', async () => {
      mockQueueManager.initialize.mockRejectedValue(new Error('Queue init failed'));
      
      await expect(errorInterfaceGateway.initialize())
        .rejects.toThrow('Queue init failed');
    });

    test('should not initialize twice', async () => {
      mockQueueManager.initialize.mockResolvedValue();
      mockRouterEngine.initialize.mockResolvedValue();
      
      await errorInterfaceGateway.initialize();
      await errorInterfaceGateway.initialize();
      
      expect(mockQueueManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockRouterEngine.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockQueueManager.initialize.mockResolvedValue();
      mockRouterEngine.initialize.mockResolvedValue();
      await errorInterfaceGateway.initialize();
    });

    describe('handleError (Blocking Mode)', () => {
      test('should handle error successfully in blocking mode', async () => {
        const response = await errorInterfaceGateway.handleError(mockErrorContext);
        
        expect(mockQueueManager.enqueue).toHaveBeenCalledWith(mockErrorContext);
        expect(mockRouterEngine.route).toHaveBeenCalledWith(mockErrorContext);
        expect(mockErrorHandler.execute).toHaveBeenCalledWith(mockErrorContext);
        
        expect(response).toBeDefined();
        expect(response.errorId).toBe('test-error-1');
        expect(response.processingTime).toBeDefined();
      });

      test('should handle routing errors gracefully', async () => {
        mockRouterEngine.route.mockRejectedValue(new Error('Routing failed'));
        
        const response = await errorInterfaceGateway.handleError(mockErrorContext);
        
        expect(response.result.status).toBe('failure' as any);
        expect(response.result.code).toBe('PROCESSING_FAILED');
      });

      test('should handle execution errors gracefully', async () => {
        mockErrorHandler.execute.mockRejectedValue(new Error('Execution failed'));
        
        const response = await errorInterfaceGateway.handleError(mockErrorContext);
        
        expect(response.result.status).toBe('failure' as any);
        expect(response.result.code).toBe('PROCESSING_FAILED');
      });

      test('should throw error when not initialized', async () => {
        const uninitializedGateway = new ErrorInterfaceGateway(mockQueueManager, mockRouterEngine);
        
        await expect(uninitializedGateway.handleError(mockErrorContext))
          .rejects.toThrow('Error Interface Gateway is not initialized');
      });
    });

    describe('handleErrorAsync (Non-blocking Mode)', () => {
      test('should handle error asynchronously', async () => {
        const callback = jest.fn();
        mockErrorContext.callback = callback;
        
        errorInterfaceGateway.handleErrorAsync(mockErrorContext);
        
        expect(mockQueueManager.enqueue).toHaveBeenCalledWith(mockErrorContext);
        
        // Wait for async processing to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(mockRouterEngine.route).toHaveBeenCalled();
        expect(callback).toHaveBeenCalled();
      });

      test('should handle async processing errors gracefully', async () => {
        const callback = jest.fn();
        mockErrorContext.callback = callback;
        
        mockRouterEngine.route.mockRejectedValue(new Error('Async processing failed'));
        
        errorInterfaceGateway.handleErrorAsync(mockErrorContext);
        
        // Wait for async processing to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(callback).toHaveBeenCalled();
        const callbackResponse = callback.mock.calls[0][0];
        expect(callbackResponse.result.code).toBe('PROCESSING_FAILED');
      });

      test('should work without callback', async () => {
        delete mockErrorContext.callback;
        
        errorInterfaceGateway.handleErrorAsync(mockErrorContext);
        
        expect(mockQueueManager.enqueue).toHaveBeenCalledWith(mockErrorContext);
        
        // Wait for async processing to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(mockRouterEngine.route).toHaveBeenCalled();
      });
    });

    describe('handleBatchErrors', () => {
      test('should handle multiple errors in batch', async () => {
        const errors = [
          { ...mockErrorContext, errorId: 'test-error-1' },
          { ...mockErrorContext, errorId: 'test-error-2' }
        ];
        
        // Mock the execute method to return responses with correct error IDs
        mockErrorHandler.execute.mockImplementation(async (error: any) => ({
          responseId: `test-response-${error.errorId}`,
          errorId: error.errorId,
          result: {
            status: 'success' as any,
            message: 'Error handled successfully',
            details: '',
            code: 'SUCCESS'
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
        }));
        
        const responses = await errorInterfaceGateway.handleBatchErrors(errors);
        
        expect(mockQueueManager.enqueue).toHaveBeenCalledTimes(2);
        expect(mockRouterEngine.route).toHaveBeenCalledTimes(2);
        expect(mockErrorHandler.execute).toHaveBeenCalledTimes(2);
        
        expect(responses).toHaveLength(2);
        expect(responses[0].errorId).toBe('test-error-1');
        expect(responses[1].errorId).toBe('test-error-2');
      });

      test('should handle empty batch', async () => {
        const responses = await errorInterfaceGateway.handleBatchErrors([]);
        
        expect(responses).toHaveLength(0);
        expect(mockQueueManager.enqueue).not.toHaveBeenCalled();
      });

      test('should handle partial batch failures', async () => {
        const errors = [
          { ...mockErrorContext, errorId: 'test-error-1' },
          { ...mockErrorContext, errorId: 'test-error-2' }
        ];
        
        // Make the second error fail
        mockErrorHandler.execute.mockImplementationOnce(async () => ({
          responseId: 'test-response-1',
          errorId: 'test-error-1',
          result: {
            status: 'success' as any,
            message: 'Success',
            details: '',
            code: 'SUCCESS'
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
        } as ErrorResponse));
        
        mockErrorHandler.execute.mockImplementationOnce(async () => {
          throw new Error('Second error failed');
        });

        const responses = await errorInterfaceGateway.handleBatchErrors(errors);
        
        expect(responses).toHaveLength(2);
        expect(responses[0].result.code).toBe('SUCCESS');
        expect(responses[1].result.code).toBe('PROCESSING_FAILED');
      });

      test('should handle batch routing errors', async () => {
        const errors = [
          { ...mockErrorContext, errorId: 'test-error-1' },
          { ...mockErrorContext, errorId: 'test-error-2' }
        ];
        
        mockRouterEngine.route.mockRejectedValue(new Error('Batch routing failed'));
        
        const responses = await errorInterfaceGateway.handleBatchErrors(errors);
        
        expect(responses).toHaveLength(2);
        expect(responses[0].result.code).toBe('PROCESSING_FAILED');
        expect(responses[1].result.code).toBe('PROCESSING_FAILED');
      });
    });
  });

  describe('Module Registration', () => {
    beforeEach(async () => {
      mockQueueManager.initialize.mockResolvedValue();
      mockRouterEngine.initialize.mockResolvedValue();
      await errorInterfaceGateway.initialize();
    });

    test('should register module successfully', () => {
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0'
      } as ModuleRegistration;

      errorInterfaceGateway.registerModule(moduleRegistration);
      
      expect(mockRouterEngine.registerModule).toHaveBeenCalledWith(moduleRegistration);
    });

    test('should handle registration errors', () => {
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0'
      } as ModuleRegistration;

      mockRouterEngine.registerModule.mockImplementation(() => {
        throw new Error('Registration failed');
      });

      expect(() => errorInterfaceGateway.registerModule(moduleRegistration))
        .toThrow('Registration failed');
    });

    test('should unregister module successfully', () => {
      errorInterfaceGateway.unregisterModule('test-module');
      
      expect(mockRouterEngine.unregisterModule).toHaveBeenCalledWith('test-module');
    });

    test('should handle unregistration errors', () => {
      mockRouterEngine.unregisterModule.mockImplementation(() => {
        throw new Error('Unregistration failed');
      });

      expect(() => errorInterfaceGateway.unregisterModule('test-module'))
        .toThrow('Unregistration failed');
    });
  });

  describe('Status and Configuration', () => {
    beforeEach(async () => {
      mockQueueManager.initialize.mockResolvedValue();
      mockRouterEngine.initialize.mockResolvedValue();
      await errorInterfaceGateway.initialize();
    });

    test('should return correct status', () => {
      mockQueueManager.getQueueStatus.mockReturnValue({
        size: 5,
        Processing: false,
        flushed: false
      } as any);
      
      mockRouterEngine.getStatus.mockReturnValue({
        isInitialized: true,
        routingRulesCount: 3,
        moduleHandlersCount: 2,
        hasDefaultHandler: true
      });

      const status = errorInterfaceGateway.getStatus();
      
      expect(status.isInitialized).toBe(true);
      expect(status.enableMetrics).toBe(true);
      expect(status.queueStatus).toBeDefined();
      expect(status.routerStatus).toBeDefined();
    });

    test('should enable and disable metrics', () => {
      errorInterfaceGateway.setMetricsEnabled(false);
      
      const status = errorInterfaceGateway.getStatus();
      expect(status.enableMetrics).toBe(false);
      
      errorInterfaceGateway.setMetricsEnabled(true);
      const updatedStatus = errorInterfaceGateway.getStatus();
      expect(updatedStatus.enableMetrics).toBe(true);
    });
  });

  describe('Shutdown', () => {
    test('should shutdown successfully', async () => {
      // Setup mocks to return resolved promises
      const shutdownSpy1 = jest.fn().mockResolvedValue(undefined);
      const shutdownSpy2 = jest.fn().mockResolvedValue(undefined);
      mockRouterEngine.shutdown = shutdownSpy1;
      mockQueueManager.shutdown = shutdownSpy2;
      
      await errorInterfaceGateway.shutdown();
      
      expect(shutdownSpy1).toHaveBeenCalledTimes(1);
      expect(shutdownSpy2).toHaveBeenCalledTimes(1);
    });

    test('should handle shutdown errors gracefully', async () => {
      mockRouterEngine.shutdown = jest.fn().mockRejectedValue(new Error('Router shutdown failed'));
      
      await expect(errorInterfaceGateway.shutdown())
        .rejects.toThrow('Router shutdown failed');
    });

    test('should shutdown when not initialized', async () => {
      const uninitializedGateway = new ErrorInterfaceGateway(mockQueueManager, mockRouterEngine);
      
      await expect(uninitializedGateway.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      mockQueueManager.initialize.mockResolvedValue();
      mockRouterEngine.initialize.mockResolvedValue();
      await errorInterfaceGateway.initialize();
    });

    test('should handle invalid callback in async mode', async () => {
      mockErrorContext.callback = 'invalid-callback' as any;
      
      errorInterfaceGateway.handleErrorAsync(mockErrorContext);
      
      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockQueueManager.enqueue).toHaveBeenCalled();
    });

    test('should handle error context without required fields', async () => {
      const invalidErrorContext = {
        errorId: 'test-error-1',
        error: new Error('Test error'),
        source: {
          moduleId: 'test-module',
          moduleName: 'TestModule',
          version: '1.0.0',
          fileName: 'test-module.ts',
          lineNumber: 42
        }
      } as any; // Missing classification

      // The gateway should handle missing fields gracefully and still return a response
      const response = await errorInterfaceGateway.handleError(invalidErrorContext);
      
      expect(response).toBeDefined();
      expect(response.errorId).toBe('test-error-1');
      expect(response.result.status).toBe('success');
    });

    test('should handle performance measurements', async () => {
      const start = Date.now();
      await errorInterfaceGateway.handleError(mockErrorContext);
      const end = Date.now();
      
      const response = await errorInterfaceGateway.handleError(mockErrorContext);
      expect(response.processingTime).toBeLessThan(end - start + 1000); // Reasonable upper bound
    });

    test('should handle concurrent error processing', async () => {
      const errors = Array(10).fill(null).map((_, i) => ({
        ...mockErrorContext,
        errorId: `test-error-${i}`
      }));

      const promises = errors.map(error => errorInterfaceGateway.handleError(error));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(10);
      expect(mockQueueManager.enqueue).toHaveBeenCalledTimes(10);
      expect(mockRouterEngine.route).toHaveBeenCalledTimes(10);
    });
  });
});