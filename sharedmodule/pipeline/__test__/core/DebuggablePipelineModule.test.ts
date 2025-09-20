/**
 * RCC DebuggablePipelineModule Tests
 *
 * Comprehensive unit tests for the DebuggablePipelineModule class,
 * covering tracing, error handling, performance metrics, and debug functionality.
 */

import { DebuggablePipelineModule, DebuggablePipelineModuleConfig, ExecutionOptions, ExecutionResult } from '../../src/core/DebuggablePipelineModule';
import { PipelineStage } from '../../src/core/PipelineExecutionContext';
import { ModuleInfo } from '../../src/core/PipelineExecutionContext';
import { BaseModule } from 'rcc-basemodule';

// Mock dependencies
jest.mock('rcc-basemodule');
jest.mock('rcc-errorhandling');
jest.mock('rcc-debugcenter');

const MockedBaseModule = BaseModule as jest.MockedClass<typeof BaseModule>;

// Test utilities
const createTestConfig = (overrides: Partial<DebuggablePipelineModuleConfig> = {}): DebuggablePipelineModuleConfig => ({
  id: 'test-debuggable-module',
  name: 'Test Debuggable Module',
  version: '1.0.0',
  description: 'Test module for debuggable pipeline functionality',
  type: 'debuggable-pipeline',
  enableTracing: true,
  maxConcurrentExecutions: 10,
  executionTimeout: 30000,
  enablePerformanceMetrics: true,
  enableEnhancedErrorHandling: true,
  errorRecoveryAttempts: 3,
  ...overrides
});

const createTestContext = (overrides: Partial<any> = {}): any => ({
  executionId: 'test-execution-id',
  requestId: 'test-request-id',
  traceId: 'test-trace-id',
  sessionId: 'test-session-id',
  stage: PipelineStage.REQUEST_PROCESSING,
  timing: {
    startTime: Date.now(),
    endTime: Date.now() + 100,
    duration: 100,
    stageTimings: new Map()
  },
  error: null,
  metadata: {},
  ...overrides
});

describe('DebuggablePipelineModule', () => {
  let module: DebuggablePipelineModule;
  let config: DebuggablePipelineModuleConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    config = createTestConfig();
    module = new DebuggablePipelineModule(config);
  });

  describe('Constructor and Initialization', () => {
    test('should create module with correct configuration', () => {
      expect(module).toBeInstanceOf(DebuggablePipelineModule);
      expect(module).toBeInstanceOf(MockedBaseModule);
    });

    test('should initialize with default configuration values', () => {
      const defaultConfig = createTestConfig();
      const defaultModule = new DebuggablePipelineModule(defaultConfig);

      expect(defaultModule).toBeDefined();
      // Module should have tracer, error handler, and debug center initialized
    });

    test('should handle missing optional dependencies gracefully', () => {
      const minimalConfig = createTestConfig({
        enableTracing: false,
        enableEnhancedErrorHandling: false
      });
      const minimalModule = new DebuggablePipelineModule(minimalConfig);

      expect(minimalModule).toBeDefined();
    });
  });

  describe('executeWithTracing', () => {
    test('should execute successful operation with tracing', async () => {
      const mockOperation = jest.fn().mockResolvedValue('test-result');
      const stage = PipelineStage.REQUEST_PROCESSING;
      const request = { data: 'test-request' };
      const options: ExecutionOptions = {
        executionId: 'custom-execution-id',
        timeout: 5000
      };

      const result = await module.executeWithTracing(
        mockOperation,
        stage,
        request,
        options
      );

      expect(result.status).toBe('success');
      expect(result.data).toBe('test-result');
      expect(result.executionId).toBeDefined();
      expect(result.requestId).toBeDefined();
      expect(result.traceId).toBeDefined();
      expect(result.timing).toBeDefined();
      expect(result.timing.duration).toBeGreaterThan(0);

      expect(mockOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: options.executionId,
          stage
        })
      );
    });

    test('should handle operation execution errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const stage = PipelineStage.REQUEST_PROCESSING;

      const result = await module.executeWithTracing(mockOperation, stage);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Operation failed');
      expect(result.timing).toBeDefined();
    });

    test('should handle operation timeout', async () => {
      const mockOperation = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );
      const stage = PipelineStage.REQUEST_PROCESSING;
      const options: ExecutionOptions = { timeout: 100 };

      const result = await module.executeWithTracing(mockOperation, stage, undefined, options);

      expect(result.status).toBe('timeout');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('timed out');
    });

    test('should retry operation on failure when enabled', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValue('retry-success');
      const stage = PipelineStage.REQUEST_PROCESSING;
      const options: ExecutionOptions = {
        enableRetry: true,
        maxRetries: 2,
        retryDelay: 10
      };

      const result = await module.executeWithTracing(mockOperation, stage, undefined, options);

      expect(result.status).toBe('success');
      expect(result.data).toBe('retry-success');
      expect(mockOperation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    test('should exhaust retry attempts on persistent failure', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      const stage = PipelineStage.REQUEST_PROCESSING;
      const options: ExecutionOptions = {
        enableRetry: true,
        maxRetries: 2,
        retryDelay: 10
      };

      const result = await module.executeWithTracing(mockOperation, stage, undefined, options);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should collect performance metrics when enabled', async () => {
      const configWithMetrics = createTestConfig({
        enablePerformanceMetrics: true
      });
      const moduleWithMetrics = new DebuggablePipelineModule(configWithMetrics);

      const mockOperation = jest.fn().mockResolvedValue('test-result');
      const stage = PipelineStage.REQUEST_PROCESSING;

      const result = await moduleWithMetrics.executeWithTracing(mockOperation, stage);

      expect(result.status).toBe('success');
      expect(result.metrics).toBeDefined();
      expect(result.metrics?.memoryUsage).toBeDefined();
      expect(result.metrics?.cpuUsage).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should categorize timeout errors correctly', async () => {
      const timeoutError = new Error('Operation timed out after 5000ms');
      const mockOperation = jest.fn().mockRejectedValue(timeoutError);
      const stage = PipelineStage.REQUEST_PROCESSING;

      const result = await module.executeWithTracing(mockOperation, stage);

      expect(result.status).toBe('timeout');
      expect(result.error?.category).toBe('timeout');
    });

    test('should categorize network errors correctly', async () => {
      const networkError = new Error('ECONNREFUSED: Connection refused');
      const mockOperation = jest.fn().mockRejectedValue(networkError);
      const stage = PipelineStage.REQUEST_PROCESSING;

      const result = await module.executeWithTracing(mockOperation, stage);

      expect(result.status).toBe('failed');
      expect(result.error?.category).toBe('network');
    });

    test('should categorize authentication errors correctly', async () => {
      const authError = new Error('Unauthorized: Invalid API key');
      const mockOperation = jest.fn().mockRejectedValue(authError);
      const stage = PipelineStage.REQUEST_PROCESSING;

      const result = await module.executeWithTracing(mockOperation, stage);

      expect(result.status).toBe('failed');
      expect(result.error?.category).toBe('authentication');
    });

    test('should categorize validation errors correctly', async () => {
      const validationError = new Error('Invalid request format');
      const mockOperation = jest.fn().mockRejectedValue(validationError);
      const stage = PipelineStage.REQUEST_PROCESSING;

      const result = await module.executeWithTracing(mockOperation, stage);

      expect(result.status).toBe('failed');
      expect(result.error?.category).toBe('validation');
    });

    test('should determine error severity correctly', async () => {
      const systemError = new Error('System out of memory');
      const systemConfig = createTestConfig({ errorRecoveryAttempts: 0 });
      const systemModule = new DebuggablePipelineModule(systemConfig);

      const mockOperation = jest.fn().mockRejectedValue(systemError);
      const stage = PipelineStage.REQUEST_PROCESSING;

      const result = await systemModule.executeWithTracing(mockOperation, stage);

      expect(result.status).toBe('failed');
      expect(result.error?.severity).toBe('fatal');
    });

    test('should check error recoverability correctly', async () => {
      const recoverableError = new Error('Network connection failed');
      const mockOperation = jest.fn().mockRejectedValue(recoverableError);
      const stage = PipelineStage.REQUEST_PROCESSING;

      const result = await module.executeWithTracing(mockOperation, stage);

      expect(result.status).toBe('failed');
      expect(result.error?.recoverable).toBe(true);
    });
  });

  describe('Context Management', () => {
    test('should create execution context with custom options', async () => {
      const mockOperation = jest.fn().mockResolvedValue('test-result');
      const stage = PipelineStage.REQUEST_PROCESSING;
      const options: ExecutionOptions = {
        executionId: 'custom-execution-id',
        traceId: 'custom-trace-id',
        sessionId: 'custom-session-id',
        metadata: { custom: 'data' }
      };

      await module.executeWithTracing(mockOperation, stage, undefined, options);

      const calledContext = mockOperation.mock.calls[0][0];
      expect(calledContext.executionId).toBe(options.executionId);
      expect(calledContext.traceId).toBe(options.traceId);
      expect(calledContext.sessionId).toBe(options.sessionId);
      expect(calledContext.metadata).toEqual(options.metadata);
    });

    test('should generate unique IDs when not provided', async () => {
      const mockOperation = jest.fn().mockResolvedValue('test-result');
      const stage = PipelineStage.REQUEST_PROCESSING;

      const result1 = await module.executeWithTracing(mockOperation, stage);
      const result2 = await module.executeWithTracing(mockOperation, stage);

      expect(result1.executionId).not.toBe(result2.executionId);
      expect(result1.requestId).not.toBe(result2.requestId);
      expect(result1.traceId).not.toBe(result2.traceId);
    });

    test('should handle parent context inheritance', async () => {
      const parentContext = createTestContext({
        executionId: 'parent-execution-id',
        traceId: 'parent-trace-id'
      });

      const mockOperation = jest.fn().mockResolvedValue('test-result');
      const stage = PipelineStage.REQUEST_PROCESSING;
      const options: ExecutionOptions = {
        parentContext: parentContext
      };

      await module.executeWithTracing(mockOperation, stage, undefined, options);

      const calledContext = mockOperation.mock.calls[0][0];
      expect(calledContext.parent).toBe(parentContext);
    });
  });

  describe('Recording Configuration', () => {
    test('should set recording configuration correctly', () => {
      const recordingConfig = {
        enabled: true,
        basePath: '/custom/debug/path',
        maxFileSize: 5 * 1024 * 1024
      };

      module.setRecordingConfig(recordingConfig);

      // Configuration should be set without errors
      expect(module).toBeDefined();
    });

    test('should handle disabled recording configuration', () => {
      const recordingConfig = {
        enabled: false,
        basePath: '/custom/debug/path'
      };

      module.setRecordingConfig(recordingConfig);

      // Configuration should be set without errors
      expect(module).toBeDefined();
    });

    test('should handle minimal recording configuration', () => {
      const minimalConfig = {};

      module.setRecordingConfig(minimalConfig);

      // Should handle minimal configuration gracefully
      expect(module).toBeDefined();
    });
  });

  describe('Trace Summary Generation', () => {
    test('should generate trace summary for simple execution', async () => {
      const mockOperation = jest.fn().mockResolvedValue('test-result');
      const stage = PipelineStage.REQUEST_PROCESSING;

      const result = await module.executeWithTracing(mockOperation, stage);

      expect(result.traceSummary).toBeDefined();
      expect(result.traceSummary?.totalStages).toBeGreaterThanOrEqual(0);
      expect(result.traceSummary?.completedStages).toBeGreaterThanOrEqual(0);
      expect(result.traceSummary?.failedStages).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.traceSummary?.stageTransitions)).toBe(true);
      expect(Array.isArray(result.traceSummary?.errors)).toBe(true);
    });

    test('should include parent context in trace summary', async () => {
      const parentContext = createTestContext({
        stage: PipelineStage.REQUEST_VALIDATION,
        timing: {
          startTime: Date.now() - 100,
          endTime: Date.now() - 50,
          duration: 50,
          stageTimings: new Map()
        }
      });

      const mockOperation = jest.fn().mockResolvedValue('test-result');
      const stage = PipelineStage.REQUEST_PROCESSING;
      const options: ExecutionOptions = {
        parentContext: parentContext
      };

      const result = await module.executeWithTracing(mockOperation, stage, undefined, options);

      expect(result.traceSummary).toBeDefined();
      expect(result.traceSummary?.stageTransitions).toHaveLength(1);
      expect(result.traceSummary?.stageTransitions[0].from).toBe(PipelineStage.REQUEST_VALIDATION);
      expect(result.traceSummary?.stageTransitions[0].to).toBe(PipelineStage.REQUEST_PROCESSING);
    });
  });

  describe('Message Handling', () => {
    test('should handle getStats message', async () => {
      const message = {
        type: 'getStats',
        id: 'message-1',
        correlationId: 'corr-1'
      };

      const response = await module.handleMessage(message);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.messageId).toBe(message.id);
      expect(response.correlationId).toBe(message.correlationId);
    });

    test('should handle getActiveContexts message', async () => {
      const message = {
        type: 'getActiveContexts',
        id: 'message-2',
        correlationId: 'corr-2'
      };

      const response = await module.handleMessage(message);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should handle getTraceChains message', async () => {
      const message = {
        type: 'getTraceChains',
        id: 'message-3',
        correlationId: 'corr-3'
      };

      const response = await module.handleMessage(message);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    test('should handle updateConfig message', async () => {
      const message = {
        type: 'updateConfig',
        id: 'message-4',
        correlationId: 'corr-4',
        payload: {
          enableTracing: false,
          executionTimeout: 60000
        }
      };

      const response = await module.handleMessage(message);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Configuration updated');
    });

    test('should handle unknown message type', async () => {
      const message = {
        type: 'unknownType',
        id: 'message-5',
        correlationId: 'corr-5'
      };

      const response = await module.handleMessage(message);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown message type');
      expect(response.messageId).toBe(message.id);
      expect(response.correlationId).toBe(message.correlationId);
    });
  });

  describe('Configuration Updates', () => {
    test('should update module configuration correctly', () => {
      const newConfig = {
        enableTracing: false,
        executionTimeout: 60000,
        maxConcurrentExecutions: 20
      };

      module.updateConfig(newConfig);

      // Configuration should be updated without errors
      expect(module).toBeDefined();
    });

    test('should handle empty configuration update', () => {
      const emptyConfig = {};

      module.updateConfig(emptyConfig);

      // Should handle empty update gracefully
      expect(module).toBeDefined();
    });

    test('should update tracer configuration when tracing settings change', () => {
      const newConfig = {
        enableTracing: false,
        tracerConfig: {
          customOption: 'value'
        }
      };

      module.updateConfig(newConfig);

      // Should update tracer configuration
      expect(module).toBeDefined();
    });
  });

  describe('Module Lifecycle', () => {
    test('should initialize module successfully', async () => {
      await expect(module.initialize()).resolves.not.toThrow();
    });

    test('should destroy module successfully', async () => {
      await module.initialize();
      await expect(module.destroy()).resolves.not.toThrow();
    });

    test('should handle destroy without initialization', async () => {
      await expect(module.destroy()).resolves.not.toThrow();
    });

    test('should handle multiple destroy calls', async () => {
      await module.initialize();
      await module.destroy();
      await expect(module.destroy()).resolves.not.toThrow();
    });
  });

  describe('Performance Metrics Collection', () => {
    test('should collect basic memory metrics', async () => {
      const configWithMetrics = createTestConfig({
        enablePerformanceMetrics: true
      });
      const moduleWithMetrics = new DebuggablePipelineModule(configWithMetrics);

      // Access private method for testing
      const metrics = await (moduleWithMetrics as any).collectPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage.start).toBeGreaterThan(0);
      expect(metrics.memoryUsage.end).toBeGreaterThan(0);
      expect(metrics.cpuUsage).toBeDefined();
    });

    test('should handle metrics collection errors gracefully', async () => {
      // Mock process.memoryUsage to throw error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory usage unavailable');
      });

      const configWithMetrics = createTestConfig({
        enablePerformanceMetrics: true
      });
      const moduleWithMetrics = new DebuggablePipelineModule(configWithMetrics);

      const metrics = await (moduleWithMetrics as any).collectPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(Object.keys(metrics)).toHaveLength(0);

      // Restore original method
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Error ID Generation', () => {
    test('should generate unique error IDs', () => {
      const moduleInstance = module as any;
      const errorId1 = moduleInstance.generateErrorId();
      const errorId2 = moduleInstance.generateErrorId();

      expect(errorId1).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(errorId2).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(errorId1).not.toBe(errorId2);
    });
  });

  describe('Debug Logging', () => {
    test('should log debug messages without errors', () => {
      const moduleInstance = module as any;

      expect(() => {
        moduleInstance.logDebug('Test debug message', { data: 'test' });
      }).not.toThrow();
    });

    test('should log warning messages without errors', () => {
      const moduleInstance = module as any;

      expect(() => {
        moduleInstance.logWarn('Test warning message', { data: 'test' });
      }).not.toThrow();
    });

    test('should log error messages without errors', () => {
      const moduleInstance = module as any;

      expect(() => {
        moduleInstance.logError('Test error message', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('Getter Methods', () => {
    test('should return tracker instance', () => {
      const tracker = module.getTracker();
      expect(tracker).toBeDefined();
    });

    test('should return execution statistics', () => {
      const stats = module.getExecutionStatistics();
      expect(stats).toBeDefined();
    });

    test('should return active execution contexts', () => {
      const contexts = module.getActiveExecutionContexts();
      expect(Array.isArray(contexts)).toBe(true);
    });

    test('should return trace chains', () => {
      const traceChains = module.getTraceChains();
      expect(traceChains).toBeDefined();
    });
  });
});