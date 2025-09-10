/**
 * Simple tests for Enhanced Pipeline System
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EnhancedErrorResponseCenter } from '../src/EnhancedErrorResponseCenter';
import { PipelineErrorCode, PipelineErrorCategory } from '../src/ErrorTypes';

// Mock dependencies
const mockConfigManager = {
  getConfig: () => ({
    scheduler: {
      blacklistConfig: {
        cleanupInterval: 60000
      }
    },
    getErrorHandlingStrategy: () => ({
      errorCode: PipelineErrorCode.EXECUTION_FAILED,
      action: 'retry',
      retryCount: 3,
      shouldDestroyPipeline: false
    })
  })
};

const mockErrorHandler = {
  initialize: jest.fn(),
  handleError: jest.fn(),
  handleExecutionResult: jest.fn(),
  getBlacklistedPipelines: jest.fn(() => []),
  isPipelineBlacklisted: jest.fn(() => false),
  blacklistPipeline: jest.fn(),
  unblacklistPipeline: jest.fn(),
  getErrorStats: jest.fn(),
  clearErrorStats: jest.fn(),
  getHttpStatusCode: jest.fn((errorCode: any) => {
    const statusMap: Record<number, number> = {
      6001: 401, // AUTHENTICATION_FAILED
      6002: 403, // AUTHORIZATION_FAILED
      6003: 502, // CONNECTION_FAILED
      6004: 504, // TIMEOUT
      6005: 429, // RATE_LIMITED
      6006: 500, // SERVER_ERROR
      6007: 503  // SERVICE_UNAVAILABLE
    };
    return statusMap[errorCode] || 500;
  }),
  destroy: jest.fn()
};

describe('Enhanced Pipeline System - Basic Tests', () => {
  let enhancedErrorHandler: EnhancedErrorResponseCenter;

  beforeEach(async () => {
    const config = {
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
      mockConfigManager as any,
      mockErrorHandler as any,
      config
    );
    await enhancedErrorHandler.initialize();
  });

  afterEach(async () => {
    if (enhancedErrorHandler) {
      await enhancedErrorHandler.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Enhanced Error Response Center', () => {
    it('should initialize successfully', () => {
      expect(enhancedErrorHandler).toBeDefined();
    });

    it('should handle local errors (send phase)', async () => {
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
    });

    it('should handle local errors (receive phase)', async () => {
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
    });

    it('should handle server errors', async () => {
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
      expect(response.httpStatus).toBe(401);
      expect(response.error.message).toContain('Server Error');
    });

    it('should register custom error handlers', () => {
      const customHandler = jest.fn();
      
      enhancedErrorHandler.registerCustomHandler(
        PipelineErrorCode.EXECUTION_FAILED,
        customHandler,
        10,
        'Test handler'
      );

      expect(() => {
        enhancedErrorHandler.registerCustomHandler(
          PipelineErrorCode.EXECUTION_FAILED,
          customHandler,
          5,
          'Lower priority handler'
        );
      }).not.toThrow();
    });

    it('should track error metrics', async () => {
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
      await enhancedErrorHandler.handleLocalError(error, context);

      const metrics = enhancedErrorHandler.getErrorMetrics();

      expect(metrics.totalErrors).toBe(2);
      expect(metrics.localErrors).toBe(2);
    });

    it('should handle messages', async () => {
      const message = {
        id: 'test-message',
        type: 'ping',
        source: 'test',
        payload: {},
        correlationId: 'test-correlation',
        timestamp: Date.now()
      };

      const response = await enhancedErrorHandler.handleMessage(message);

      expect(response).toBeDefined();
      if (response && typeof response === 'object' && 'success' in response) {
        expect(response.success).toBe(true);
      }
    });
  });

  describe('Error Recovery Actions', () => {
    it('should handle retry recovery action', async () => {
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

      const sendMessageSpy = jest.spyOn(enhancedErrorHandler as any, 'sendMessage');

      const recoveryAction = {
        action: 'retry' as const,
        shouldRetry: true,
        retryDelay: 1000
      };

      await (enhancedErrorHandler as any).executeRecoveryAction(recoveryAction, error, context);

      expect(sendMessageSpy).toHaveBeenCalledWith('pipeline_retry_requested', {
        executionId: context.executionId,
        pipelineId: context.pipelineId,
        instanceId: context.instanceId,
        retryDelay: recoveryAction.retryDelay
      });

      sendMessageSpy.mockRestore();
    });

    it('should handle failover recovery action', async () => {
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

      const sendMessageSpy = jest.spyOn(enhancedErrorHandler as any, 'sendMessage');

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
    it('should handle multiple errors efficiently', async () => {
      const errors: any[] = [];
      const contexts: any[] = [];
      
      for (let i = 0; i < 10; i++) {
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

      const startTime = Date.now();
      const responses = await Promise.all(
        errors.map((error, index) => 
          enhancedErrorHandler.handleLocalError(error, contexts[index])
        )
      );
      const endTime = Date.now();

      expect(responses).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

      const metrics = enhancedErrorHandler.getErrorMetrics();
      expect(metrics.totalErrors).toBe(10);
    });
  });
});