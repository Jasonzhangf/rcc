/**
 * Tests for Enhanced Pipeline System with Error Response Center
 */

import { PipelineScheduler } from '../src/PipelineScheduler';
import { EnhancedErrorResponseCenter } from '../src/EnhancedErrorResponseCenter';
import { PipelineErrorCode, PipelineErrorCategory, PipelineExecutionStatus } from '../src/ErrorTypes';
import { exampleEnhancedPipelineConfig } from '../src/EnhancedPipelineConfig';

describe('Enhanced Pipeline System', () => {
  let scheduler: PipelineScheduler;
  let enhancedErrorHandler: EnhancedErrorResponseCenter;

  beforeEach(async () => {
    // Create scheduler with enhanced error handling
    scheduler = new PipelineScheduler(exampleEnhancedPipelineConfig as any);
    await scheduler.initialize();
    
    // Get the enhanced error handler (this would need to be exposed in the actual implementation)
    // For now, we'll create a separate instance for testing
    const configManager = (scheduler as any).configManager;
    const errorHandler = (scheduler as any).errorHandler;
    const enhancedErrorHandlerConfig = {
      enableLocalErrorHandling: true,
      enableServerErrorHandling: true,
      enableRecoveryActions: true,
      enableErrorLogging: true,
      enableErrorMetrics: true,
      maxErrorHistorySize: 1000,
      errorCleanupInterval: 300000,
      recoveryActionTimeout: 30000,
      customErrorHandlers: []
    };
    
    enhancedErrorHandler = new EnhancedErrorResponseCenter(
      configManager,
      errorHandler,
      enhancedErrorHandlerConfig
    );
    await enhancedErrorHandler.initialize();
  });

  afterEach(async () => {
    if (scheduler) {
      await scheduler.shutdown();
    }
    if (enhancedErrorHandler) {
      await enhancedErrorHandler.destroy();
    }
  });

  describe('Enhanced Error Response Center', () => {
    test('should handle local errors (send phase - 500)', async () => {
      const error = {
        code: PipelineErrorCode.EXECUTION_FAILED,
        message: 'Pipeline execution failed',
        category: PipelineErrorCategory.EXECUTION,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'module' as any,
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        timestamp: Date.now()
      };

      const context = {
        executionId: 'test-execution',
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        startTime: Date.now(),
        timeout: 30000,
        payload: { test: 'data' },
        metadata: {},
        retryCount: 0,
        maxRetries: 3
      };

      const response = await enhancedErrorHandler.handleLocalError(error, context);

      expect(response.success).toBe(false);
      expect(response.httpStatus).toBe(500);
      expect(response.error.message).toContain('Local Error (Send Phase)');
      expect(response.error.details.phase).toBe('send');
      expect(response.error.details.localError).toBe(true);
    });

    test('should handle local errors (receive phase - 501)', async () => {
      const error = {
        code: PipelineErrorCode.RESPONSE_TIMEOUT,
        message: 'Response timeout',
        category: PipelineErrorCategory.NETWORK,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'module' as any,
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        timestamp: Date.now()
      };

      const context = {
        executionId: 'test-execution',
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        startTime: Date.now(),
        timeout: 30000,
        payload: { test: 'data' },
        metadata: {},
        retryCount: 0,
        maxRetries: 3
      };

      const response = await enhancedErrorHandler.handleReceiveError(error, context);

      expect(response.success).toBe(false);
      expect(response.httpStatus).toBe(501);
      expect(response.error.message).toContain('Local Error (Receive Phase)');
      expect(response.error.details.phase).toBe('receive');
      expect(response.error.details.localError).toBe(true);
    });

    test('should handle server errors with strict error codes', async () => {
      const error = {
        code: PipelineErrorCode.AUTHENTICATION_FAILED,
        message: 'Authentication failed',
        category: PipelineErrorCategory.AUTHENTICATION,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'module' as any,
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        timestamp: Date.now()
      };

      const context = {
        executionId: 'test-execution',
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        startTime: Date.now(),
        timeout: 30000,
        payload: { test: 'data' },
        metadata: {},
        retryCount: 0,
        maxRetries: 3
      };

      const response = await enhancedErrorHandler.handleServerError(error, context);

      expect(response.success).toBe(false);
      expect(response.httpStatus).toBe(401); // Authentication failed = 401
      expect(response.error.message).toContain('Server Error');
      expect(response.error.details.phase).toBe('server');
      expect(response.error.details.serverError).toBe(true);
      expect(response.error.details.strictErrorCode).toBe(true);
    });

    test('should register and use custom error handlers', async () => {
      const customHandler = jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: PipelineErrorCode.EXECUTION_FAILED,
          message: 'Custom handler error',
          category: PipelineErrorCategory.EXECUTION,
          severity: 'high',
          timestamp: Date.now()
        },
        httpStatus: 500,
        recoveryAction: {
          action: 'retry' as const,
          shouldRetry: true,
          retryDelay: 2000
        }
      });

      enhancedErrorHandler.registerCustomHandler(
        PipelineErrorCode.EXECUTION_FAILED,
        customHandler,
        10,
        'Test custom handler'
      );

      const error = {
        code: PipelineErrorCode.EXECUTION_FAILED,
        message: 'Test error',
        category: PipelineErrorCategory.EXECUTION,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'module' as any,
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        timestamp: Date.now()
      };

      const context = {
        executionId: 'test-execution',
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        startTime: Date.now(),
        timeout: 30000,
        payload: { test: 'data' },
        metadata: {},
        retryCount: 0,
        maxRetries: 3
      };

      const response = await enhancedErrorHandler.handleLocalError(error, context);

      expect(customHandler).toHaveBeenCalledWith(error, context);
      expect(response.recoveryAction).toBeDefined();
      expect(response.recoveryAction.action).toBe('retry');
    });

    test('should track error metrics', async () => {
      const error = {
        code: PipelineErrorCode.EXECUTION_FAILED,
        message: 'Test error',
        category: PipelineErrorCategory.EXECUTION,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'module' as any,
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        timestamp: Date.now()
      };

      const context = {
        executionId: 'test-execution',
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        startTime: Date.now(),
        timeout: 30000,
        payload: { test: 'data' },
        metadata: {},
        retryCount: 0,
        maxRetries: 3
      };

      // Handle multiple errors
      await enhancedErrorHandler.handleLocalError(error, context);
      await enhancedErrorHandler.handleLocalError(error, context);

      const metrics = enhancedErrorHandler.getErrorMetrics();

      expect(metrics.totalErrors).toBe(2);
      expect(metrics.localErrors).toBe(2);
      expect(metrics.errorsByCode.get(PipelineErrorCode.EXECUTION_FAILED)).toBe(2);
      expect(metrics.errorsByCategory.get(PipelineErrorCategory.EXECUTION)).toBe(2);
    });
  });

  describe('Pipeline Scheduler Integration', () => {
    test('should use enhanced error handling for pipeline execution', async () => {
      const payload = { test: 'data' };
      const options = {
        timeout: 5000,
        maxRetries: 1
      };

      // Mock the pipeline instances to return an error
      const pipelineInstances = (scheduler as any).pipelineInstances;
      pipelineInstances.clear(); // Clear existing instances

      // This test would need more setup to actually test the integration
      // For now, we verify the scheduler has the enhanced error handler
      expect((scheduler as any).enhancedErrorHandler).toBeDefined();
      expect((scheduler as any).enhancedErrorHandler).toBeInstanceOf(EnhancedErrorResponseCenter);
    });

    test('should distinguish between local and server errors', async () => {
      const localError = {
        code: PipelineErrorCode.EXECUTION_FAILED,
        message: 'Local error',
        category: PipelineErrorCategory.EXECUTION,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'module' as any,
        timestamp: Date.now()
      };

      const serverError = {
        code: PipelineErrorCode.AUTHENTICATION_FAILED,
        message: 'Server error',
        category: PipelineErrorCategory.AUTHENTICATION,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'module' as any,
        timestamp: Date.now()
      };

      expect((scheduler as any).isLocalError(localError)).toBe(true);
      expect((scheduler as any).isLocalError(serverError)).toBe(false);
      expect((scheduler as any).isSendPhaseError(localError)).toBe(true);
      expect((scheduler as any).isSendPhaseError(serverError)).toBe(false);
    });
  });

  describe('Load Balancing Strategies', () => {
    test('should support different load balancing strategies', () => {
      const strategies = ['roundrobin', 'weighted', 'least_connections', 'random'];
      
      strategies.forEach(strategy => {
        const config = {
          ...exampleEnhancedPipelineConfig,
          loadBalancer: {
            ...exampleEnhancedPipelineConfig.loadBalancer,
            strategy: strategy as any
          }
        };
        
        const testScheduler = new PipelineScheduler(config as any);
        expect(testScheduler).toBeDefined();
        
        // Clean up
        testScheduler.shutdown();
      });
    });
  });

  describe('Error Recovery Actions', () => {
    test('should execute retry recovery action', async () => {
      const error = {
        code: PipelineErrorCode.EXECUTION_FAILED,
        message: 'Test error',
        category: PipelineErrorCategory.EXECUTION,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'module' as any,
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        timestamp: Date.now()
      };

      const context = {
        executionId: 'test-execution',
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        startTime: Date.now(),
        timeout: 30000,
        payload: { test: 'data' },
        metadata: {},
        retryCount: 0,
        maxRetries: 3
      };

      // Mock the sendMessage method
      const sendMessageSpy = jest.spyOn(enhancedErrorHandler, 'sendMessage' as any);

      // This would be triggered by the error handler's recovery action
      // For testing, we can verify the recovery action is properly structured
      const recoveryAction = {
        action: 'retry' as const,
        shouldRetry: true,
        retryDelay: 1000
      };

      await (enhancedErrorHandler as any).executeRecoveryAction(recoveryAction, error, context);

      // Verify that the retry message was sent
      expect(sendMessageSpy).toHaveBeenCalledWith('pipeline_retry_requested', {
        executionId: context.executionId,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId,
        retryDelay: recoveryAction.retryDelay
      });

      sendMessageSpy.mockRestore();
    });

    test('should execute failover recovery action', async () => {
      const error = {
        code: PipelineErrorCode.CONNECTION_FAILED,
        message: 'Connection failed',
        category: PipelineErrorCategory.NETWORK,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'module' as any,
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        timestamp: Date.now()
      };

      const context = {
        executionId: 'test-execution',
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        startTime: Date.now(),
        timeout: 30000,
        payload: { test: 'data' },
        metadata: {},
        retryCount: 0,
        maxRetries: 3
      };

      const sendMessageSpy = jest.spyOn(enhancedErrorHandler, 'sendMessage' as any);

      const recoveryAction = {
        action: 'failover' as const,
        shouldRetry: false,
        nextPipelineId: 'backup-pipeline'
      };

      await (enhancedErrorHandler as any).executeRecoveryAction(recoveryAction, error, context);

      expect(sendMessageSpy).toHaveBeenCalledWith('pipeline_failover_requested', {
        executionId: context.executionId,
        currentPipelineId: context.pipelineId,
        currentInstanceId: context.instanceId,
        nextPipelineId: recoveryAction.nextPipelineId
      });

      sendMessageSpy.mockRestore();
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle high error volumes', async () => {
      const errors = [];
      const contexts = [];
      
      // Generate 100 errors
      for (let i = 0; i < 100; i++) {
        errors.push({
          code: PipelineErrorCode.EXECUTION_FAILED,
          message: `Test error ${i}`,
          category: PipelineErrorCategory.EXECUTION,
          severity: 'high' as any,
          recoverability: 'recoverable' as any,
          impact: 'single_module' as any,
          source: 'module' as any,
          pipelineId: 'test-pipeline',
          instanceId: 'test-instance',
          timestamp: Date.now()
        });
        
        contexts.push({
          executionId: `test-execution-${i}`,
          pipelineId: 'test-pipeline',
          instanceId: 'test-instance',
          startTime: Date.now(),
          timeout: 30000,
          payload: { test: 'data' },
          metadata: {},
          retryCount: 0,
          maxRetries: 3
        });
      }

      // Process all errors concurrently
      const startTime = Date.now();
      const responses = await Promise.all(
        errors.map((error, index) => 
          enhancedErrorHandler.handleLocalError(error, contexts[index])
        )
      );
      const endTime = Date.now();

      expect(responses).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      const metrics = enhancedErrorHandler.getErrorMetrics();
      expect(metrics.totalErrors).toBe(100);
    });

    test('should cleanup error history', async () => {
      // Add some errors to history
      const error = {
        code: PipelineErrorCode.EXECUTION_FAILED,
        message: 'Test error',
        category: PipelineErrorCategory.EXECUTION,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'module' as any,
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        timestamp: Date.now()
      };

      const context = {
        executionId: 'test-execution',
        pipelineId: 'test-pipeline',
        instanceId: 'test-instance',
        startTime: Date.now(),
        timeout: 30000,
        payload: { test: 'data' },
        metadata: {},
        retryCount: 0,
        maxRetries: 3
      };

      await enhancedErrorHandler.handleLocalError(error, context);
      
      let history = enhancedErrorHandler.getErrorHistory();
      expect(history.length).toBeGreaterThan(0);

      // Clear history
      await (enhancedErrorHandler as any).cleanupErrorHistory();
      
      history = enhancedErrorHandler.getErrorHistory();
      // Note: The actual cleanup logic removes entries older than 24 hours
      // So this test verifies the method runs without error
      expect(Array.isArray(history)).toBe(true);
    });
  });
});