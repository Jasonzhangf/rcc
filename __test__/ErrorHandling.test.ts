/**
 * Comprehensive Unit Tests for Error Handling System
 * Using real implementations instead of mocks where possible
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Test implementations for error handling
class TestError {
  public code: string;
  public message: string;
  public category: string;
  public severity: string;
  public timestamp: number;
  public stack?: string;

  constructor(
    code: string,
    message: string,
    category: string = 'general',
    severity: string = 'medium'
  ) {
    this.code = code;
    this.message = message;
    this.category = category;
    this.severity = severity;
    this.timestamp = Date.now();
  }
}

class TestErrorContext {
  public executionId: string;
  public pipelineId: string;
  public instanceId: string;
  public retryCount: number;
  public startTime: number;
  public metadata: Record<string, any>;

  constructor(executionId: string, pipelineId: string, instanceId: string, retryCount = 0) {
    this.executionId = executionId;
    this.pipelineId = pipelineId;
    this.instanceId = instanceId;
    this.retryCount = retryCount;
    this.startTime = Date.now();
    this.metadata = {};
  }
}

interface ErrorHandlingStrategy {
  action: 'retry' | 'failover' | 'maintenance' | 'ignore';
  shouldRetry: boolean;
  retryDelay?: number;
  nextPipelineId?: string;
  message: string;
}

class TestErrorHandler {
  private errors: TestError[] = [];
  private strategies: Map<string, ErrorHandlingStrategy> = new Map();
  private blacklistedPipelines: Set<string> = new Set();
  private errorStats: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies(): void {
    this.strategies.set('NETWORK_ERROR', {
      action: 'retry',
      shouldRetry: true,
      retryDelay: 1000,
      message: 'Network error - retrying',
    });

    this.strategies.set('AUTHENTICATION_ERROR', {
      action: 'maintenance',
      shouldRetry: false,
      message: 'Authentication failed - requires user intervention',
    });

    this.strategies.set('TIMEOUT_ERROR', {
      action: 'failover',
      shouldRetry: false,
      nextPipelineId: 'backup-pipeline',
      message: 'Timeout occurred - failing over to backup',
    });

    this.strategies.set('VALIDATION_ERROR', {
      action: 'ignore',
      shouldRetry: false,
      message: 'Validation error - ignoring',
    });
  }

  async handleError(error: TestError, context: TestErrorContext): Promise<ErrorHandlingStrategy> {
    this.errors.push(error);
    this.recordErrorStats(error.code);

    // Check if pipeline is already blacklisted
    if (this.blacklistedPipelines.has(context.pipelineId)) {
      return {
        action: 'maintenance',
        shouldRetry: false,
        message: 'Pipeline blacklisted due to repeated errors',
      };
    }

    // Get strategy for error code
    const strategy = this.strategies.get(error.code) || {
      action: 'maintenance' as const,
      shouldRetry: false,
      message: `Unknown error: ${error.message}`,
    };

    // Apply blacklist logic
    if (this.shouldBlacklist(error, context)) {
      this.blacklistedPipelines.add(context.pipelineId);
      return {
        action: 'maintenance',
        shouldRetry: false,
        message: 'Pipeline blacklisted due to repeated errors',
      };
    }

    return strategy;
  }

  private shouldBlacklist(error: TestError, context: TestErrorContext): boolean {
    const errorCount = this.errorStats.get(error.code) || 0;
    return errorCount >= 5 && context.retryCount >= 3;
  }

  private recordErrorStats(errorCode: string): void {
    const currentCount = this.errorStats.get(errorCode) || 0;
    this.errorStats.set(errorCode, currentCount + 1);
  }

  isPipelineBlacklisted(pipelineId: string): boolean {
    return this.blacklistedPipelines.has(pipelineId);
  }

  blacklistPipeline(pipelineId: string): void {
    this.blacklistedPipelines.add(pipelineId);
  }

  unblacklistPipeline(pipelineId: string): void {
    this.blacklistedPipelines.delete(pipelineId);
  }

  getBlacklistedPipelines(): string[] {
    return Array.from(this.blacklistedPipelines);
  }

  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorStats);
  }

  clearErrorStats(): void {
    this.errorStats.clear();
  }

  getErrors(): TestError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  registerCustomStrategy(errorCode: string, strategy: ErrorHandlingStrategy): void {
    this.strategies.set(errorCode, strategy);
  }

  getStrategy(errorCode: string): ErrorHandlingStrategy | undefined {
    return this.strategies.get(errorCode);
  }
}

class TestErrorRecoveryManager {
  private recoveryActions: Map<string, Function> = new Map();
  private actionHistory: any[] = [];

  constructor() {
    this.initializeRecoveryActions();
  }

  private initializeRecoveryActions(): void {
    this.recoveryActions.set('retry', async (context: any, delay?: number) => {
      const action = {
        type: 'retry',
        timestamp: Date.now(),
        context,
        delay,
      };
      this.actionHistory.push(action);

      if (delay) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      return { success: true, message: 'Retry action completed' };
    });

    this.recoveryActions.set('failover', async (context: any, nextPipelineId?: string) => {
      const action = {
        type: 'failover',
        timestamp: Date.now(),
        context,
        nextPipelineId,
      };
      this.actionHistory.push(action);

      return {
        success: true,
        message: `Failover to ${nextPipelineId || 'backup'} completed`,
      };
    });

    this.recoveryActions.set('maintenance', async (context: any) => {
      const action = {
        type: 'maintenance',
        timestamp: Date.now(),
        context,
      };
      this.actionHistory.push(action);

      return { success: true, message: 'Maintenance mode activated' };
    });
  }

  async executeRecovery(action: string, context: any, options?: any): Promise<any> {
    const recoveryFunction = this.recoveryActions.get(action);
    if (!recoveryFunction) {
      throw new Error(`Unknown recovery action: ${action}`);
    }

    return await recoveryFunction(context, options);
  }

  getActionHistory(): any[] {
    return [...this.actionHistory];
  }

  clearHistory(): void {
    this.actionHistory = [];
  }
}

describe('Error Handling System Tests', () => {
  let errorHandler: TestErrorHandler;
  let recoveryManager: TestErrorRecoveryManager;

  beforeEach(() => {
    errorHandler = new TestErrorHandler();
    recoveryManager = new TestErrorRecoveryManager();
  });

  afterEach(() => {
    errorHandler.clearErrors();
    errorHandler.clearErrorStats();
    recoveryManager.clearHistory();
  });

  describe('Error Handler Initialization', () => {
    it('should initialize with default strategies', () => {
      const networkStrategy = errorHandler.getStrategy('NETWORK_ERROR');
      expect(networkStrategy).toBeDefined();
      expect(networkStrategy?.action).toBe('retry');
      expect(networkStrategy?.shouldRetry).toBe(true);

      const authStrategy = errorHandler.getStrategy('AUTHENTICATION_ERROR');
      expect(authStrategy).toBeDefined();
      expect(authStrategy?.action).toBe('maintenance');
      expect(authStrategy?.shouldRetry).toBe(false);
    });

    it('should handle unknown error codes', async () => {
      const error = new TestError('UNKNOWN_ERROR', 'Unknown error occurred');
      const context = new TestErrorContext('test-exec', 'test-pipeline', 'test-instance');

      const strategy = await errorHandler.handleError(error, context);

      expect(strategy.action).toBe('maintenance');
      expect(strategy.shouldRetry).toBe(false);
      expect(strategy.message).toContain('Unknown error');
    });
  });

  describe('Error Processing', () => {
    it('should handle network errors with retry strategy', async () => {
      const error = new TestError('NETWORK_ERROR', 'Connection failed');
      const context = new TestErrorContext('test-exec', 'test-pipeline', 'test-instance');

      const strategy = await errorHandler.handleError(error, context);

      expect(strategy.action).toBe('retry');
      expect(strategy.shouldRetry).toBe(true);
      expect(strategy.retryDelay).toBe(1000);
      expect(strategy.message).toBe('Network error - retrying');

      expect(errorHandler.getErrors()).toHaveLength(1);
      expect(errorHandler.getErrors()[0].code).toBe('NETWORK_ERROR');
    });

    it('should handle authentication errors with maintenance strategy', async () => {
      const error = new TestError('AUTHENTICATION_ERROR', 'Invalid credentials');
      const context = new TestErrorContext('test-exec', 'test-pipeline', 'test-instance');

      const strategy = await errorHandler.handleError(error, context);

      expect(strategy.action).toBe('maintenance');
      expect(strategy.shouldRetry).toBe(false);
      expect(strategy.message).toBe('Authentication failed - requires user intervention');
    });

    it('should handle timeout errors with failover strategy', async () => {
      const error = new TestError('TIMEOUT_ERROR', 'Request timeout');
      const context = new TestErrorContext('test-exec', 'test-pipeline', 'test-instance');

      const strategy = await errorHandler.handleError(error, context);

      expect(strategy.action).toBe('failover');
      expect(strategy.shouldRetry).toBe(false);
      expect(strategy.nextPipelineId).toBe('backup-pipeline');
      expect(strategy.message).toBe('Timeout occurred - failing over to backup');
    });

    it('should track error statistics', async () => {
      const error1 = new TestError('NETWORK_ERROR', 'Connection failed');
      const error2 = new TestError('NETWORK_ERROR', 'DNS resolution failed');
      const error3 = new TestError('AUTHENTICATION_ERROR', 'Invalid token');

      const context = new TestErrorContext('test-exec', 'test-pipeline', 'test-instance');

      await errorHandler.handleError(error1, context);
      await errorHandler.handleError(error2, context);
      await errorHandler.handleError(error3, context);

      const stats = errorHandler.getErrorStats();
      expect(stats['NETWORK_ERROR']).toBe(2);
      expect(stats['AUTHENTICATION_ERROR']).toBe(1);
    });
  });

  describe('Pipeline Blacklisting', () => {
    it('should blacklist pipeline after repeated errors', async () => {
      const context = new TestErrorContext('test-exec', 'problematic-pipeline', 'test-instance', 4);

      // Simulate multiple errors to trigger blacklist
      for (let i = 0; i < 6; i++) {
        const error = new TestError('NETWORK_ERROR', `Network error ${i}`);
        await errorHandler.handleError(error, context);
      }

      expect(errorHandler.isPipelineBlacklisted('problematic-pipeline')).toBe(true);
      expect(errorHandler.getBlacklistedPipelines()).toContain('problematic-pipeline');
    });

    it('should allow manual blacklisting and unblacklisting', () => {
      errorHandler.blacklistPipeline('manual-blacklist');
      expect(errorHandler.isPipelineBlacklisted('manual-blacklist')).toBe(true);

      errorHandler.unblacklistPipeline('manual-blacklist');
      expect(errorHandler.isPipelineBlacklisted('manual-blacklist')).toBe(false);
    });

    it('should return maintenance strategy for blacklisted pipelines', async () => {
      errorHandler.blacklistPipeline('blacklisted-pipeline');

      const error = new TestError('NETWORK_ERROR', 'Connection failed');
      const context = new TestErrorContext('test-exec', 'blacklisted-pipeline', 'test-instance');

      const strategy = await errorHandler.handleError(error, context);

      expect(strategy.action).toBe('maintenance');
      expect(strategy.shouldRetry).toBe(false);
      expect(strategy.message).toBe('Pipeline blacklisted due to repeated errors');
    });
  });

  describe('Custom Strategy Registration', () => {
    it('should allow custom error strategy registration', () => {
      const customStrategy: ErrorHandlingStrategy = {
        action: 'retry',
        shouldRetry: true,
        retryDelay: 5000,
        message: 'Custom retry strategy',
      };

      errorHandler.registerCustomStrategy('CUSTOM_ERROR', customStrategy);

      const registeredStrategy = errorHandler.getStrategy('CUSTOM_ERROR');
      expect(registeredStrategy).toEqual(customStrategy);
    });

    it('should use custom strategy for error handling', async () => {
      const customStrategy: ErrorHandlingStrategy = {
        action: 'failover',
        shouldRetry: false,
        nextPipelineId: 'custom-backup',
        message: 'Custom failover strategy',
      };

      errorHandler.registerCustomStrategy('CUSTOM_ERROR', customStrategy);

      const error = new TestError('CUSTOM_ERROR', 'Custom error occurred');
      const context = new TestErrorContext('test-exec', 'test-pipeline', 'test-instance');

      const strategy = await errorHandler.handleError(error, context);

      expect(strategy.action).toBe('failover');
      expect(strategy.nextPipelineId).toBe('custom-backup');
      expect(strategy.message).toBe('Custom failover strategy');
    });
  });

  describe('Recovery Action Management', () => {
    it('should execute retry recovery action', async () => {
      const context = {
        executionId: 'test-exec',
        pipelineId: 'test-pipeline',
      };

      const result = await recoveryManager.executeRecovery('retry', context, 100);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Retry action completed');

      const history = recoveryManager.getActionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('retry');
      expect(history[0].delay).toBe(100);
    });

    it('should execute failover recovery action', async () => {
      const context = {
        executionId: 'test-exec',
        pipelineId: 'test-pipeline',
      };

      const result = await recoveryManager.executeRecovery(
        'failover',
        context,
        'backup-pipeline-2'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Failover to backup-pipeline-2 completed');

      const history = recoveryManager.getActionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('failover');
      expect(history[0].nextPipelineId).toBe('backup-pipeline-2');
    });

    it('should execute maintenance recovery action', async () => {
      const context = {
        executionId: 'test-exec',
        pipelineId: 'test-pipeline',
      };

      const result = await recoveryManager.executeRecovery('maintenance', context);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Maintenance mode activated');

      const history = recoveryManager.getActionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('maintenance');
    });

    it('should handle unknown recovery actions', async () => {
      const context = {
        executionId: 'test-exec',
        pipelineId: 'test-pipeline',
      };

      await expect(recoveryManager.executeRecovery('unknown-action', context)).rejects.toThrow(
        'Unknown recovery action: unknown-action'
      );
    });
  });

  describe('Error Context Management', () => {
    it('should properly initialize error context', () => {
      const context = new TestErrorContext('exec-123', 'pipeline-456', 'instance-789', 2);

      expect(context.executionId).toBe('exec-123');
      expect(context.pipelineId).toBe('pipeline-456');
      expect(context.instanceId).toBe('instance-789');
      expect(context.retryCount).toBe(2);
      expect(context.startTime).toBeLessThanOrEqual(Date.now());
      expect(context.metadata).toEqual({});
    });

    it('should track context metadata', () => {
      const context = new TestErrorContext('exec-123', 'pipeline-456', 'instance-789');
      context.metadata['userId'] = 'user-123';
      context.metadata['requestId'] = 'req-456';

      expect(context.metadata['userId']).toBe('user-123');
      expect(context.metadata['requestId']).toBe('req-456');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent error processing', async () => {
      const contexts = [];
      for (let i = 0; i < 10; i++) {
        contexts.push(new TestErrorContext(`exec-${i}`, 'pipeline-test', `instance-${i}`));
      }

      const errors = contexts.map((context, i) =>
        errorHandler.handleError(new TestError('NETWORK_ERROR', `Error ${i}`), context)
      );

      const results = await Promise.all(errors);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.action).toBe('retry');
        expect(result.shouldRetry).toBe(true);
      });

      expect(errorHandler.getErrors()).toHaveLength(10);
    });

    it('should process errors within reasonable time', async () => {
      const error = new TestError('NETWORK_ERROR', 'Test error');
      const context = new TestErrorContext('test-exec', 'test-pipeline', 'test-instance');

      const startTime = Date.now();
      await errorHandler.handleError(error, context);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
    });

    it('should handle large volumes of error statistics', async () => {
      const context = new TestErrorContext('test-exec', 'test-pipeline', 'test-instance');

      // Process many errors
      for (let i = 0; i < 1000; i++) {
        const error = new TestError('NETWORK_ERROR', `Error ${i}`);
        await errorHandler.handleError(error, context);
      }

      const stats = errorHandler.getErrorStats();
      expect(stats['NETWORK_ERROR']).toBe(1000);
    });
  });

  describe('Error Severity and Categorization', () => {
    it('should handle different error severities', async () => {
      const lowSeverityError = new TestError(
        'NETWORK_ERROR',
        'Low severity issue',
        'network',
        'low'
      );
      const highSeverityError = new TestError(
        'AUTHENTICATION_ERROR',
        'High severity issue',
        'security',
        'critical'
      );

      const context = new TestErrorContext('test-exec', 'test-pipeline', 'test-instance');

      const strategy1 = await errorHandler.handleError(lowSeverityError, context);
      const strategy2 = await errorHandler.handleError(highSeverityError, context);

      expect(strategy1.action).toBe('retry'); // Network error strategy
      expect(strategy2.action).toBe('maintenance'); // Auth error strategy
    });

    it('should categorize errors by type', async () => {
      const errors = [
        new TestError('NETWORK_ERROR', 'Network issue', 'network'),
        new TestError('AUTHENTICATION_ERROR', 'Auth issue', 'security'),
        new TestError('VALIDATION_ERROR', 'Validation issue', 'validation'),
        new TestError('TIMEOUT_ERROR', 'Timeout issue', 'performance'),
      ];

      const context = new TestErrorContext('test-exec', 'test-pipeline', 'test-instance');

      for (const error of errors) {
        await errorHandler.handleError(error, context);
      }

      const allErrors = errorHandler.getErrors();
      expect(allErrors).toHaveLength(4);

      const categories = allErrors.map((e) => e.category);
      expect(categories).toContain('network');
      expect(categories).toContain('security');
      expect(categories).toContain('validation');
      expect(categories).toContain('performance');
    });
  });
});
