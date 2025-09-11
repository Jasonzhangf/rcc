/**
 * Comprehensive Integration Tests
 * Testing module interactions and end-to-end workflows
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Test implementations for integration testing
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

  private shouldBlacklist(error: TestError, _context: TestErrorContext): boolean {
    const errorCount = this.errorStats.get(error.code) || 0;
    return errorCount >= 3; // Lower threshold for testing
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
}

class TestErrorRecoveryManager {
  private recoveryActions: Map<string, Function> = new Map();
  private actionHistory: any[] = [];

  constructor() {
    this.initializeRecoveryActions();
  }

  private initializeRecoveryActions(): void {
    this.recoveryActions.set('retry', async (_context: any, delay?: number) => {
      const action = {
        type: 'retry',
        timestamp: Date.now(),
        delay,
      };
      this.actionHistory.push(action);

      if (delay) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      return { success: true, message: 'Retry action completed' };
    });

    this.recoveryActions.set('failover', async (_context: any, nextPipelineId?: string) => {
      const action = {
        type: 'failover',
        timestamp: Date.now(),
        nextPipelineId,
      };
      this.actionHistory.push(action);

      return {
        success: true,
        message: `Failover to ${nextPipelineId || 'backup'} completed`,
      };
    });

    this.recoveryActions.set('maintenance', async (_context: any) => {
      const action = {
        type: 'maintenance',
        timestamp: Date.now(),
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

class MockModule {
  private id: string;
  private _name: string;
  private config: any;
  private isActive: boolean = false;

  constructor(id: string, name: string, config: any = {}) {
    this.id = id;
    this._name = name;
    this.config = config;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this._name;
  }

  async configure(config: any): Promise<void> {
    this.config = { ...this.config, ...config };
    this.isActive = true;
  }

  isConfigured(): boolean {
    return this.isActive;
  }

  async process(request: any): Promise<any> {
    if (!this.isActive) {
      throw new Error(`Module ${this.id} is not active`);
    }
    return {
      ...request,
      processedBy: this.id,
      timestamp: Date.now(),
    };
  }

  async processResponse(response: any): Promise<any> {
    return {
      ...response,
      responseProcessedBy: this.id,
      responseTimestamp: Date.now(),
    };
  }

  getHealth(): any {
    return {
      moduleId: this.id,
      status: this.isActive ? 'healthy' : 'inactive',
      config: this.config,
    };
  }
}

class SimplePipeline {
  private id: string;
  private modules: Map<string, MockModule> = new Map();
  private isActive: boolean = false;

  constructor(id: string, _name: string) {
    this.id = id;
  }

  addModule(module: MockModule): void {
    this.modules.set(module.getId(), module);
  }

  async activate(): Promise<void> {
    for (const module of this.modules.values()) {
      if (!module.isConfigured()) {
        throw new Error(`Module ${module.getId()} is not configured`);
      }
    }
    this.isActive = true;
  }

  async deactivate(): Promise<void> {
    this.isActive = false;
  }

  async process(request: any): Promise<any> {
    if (!this.isActive) {
      throw new Error('Pipeline is not active');
    }

    let result = { ...request, pipelineId: this.id, timestamp: Date.now() };

    // Process through modules in order
    for (const module of this.modules.values()) {
      try {
        result = await module.process(result);
      } catch (error) {
        throw new Error(
          `Pipeline processing failed at module ${module.getId()}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  }

  async processResponse(response: any): Promise<any> {
    if (!this.isActive) {
      throw new Error('Pipeline is not active');
    }

    let result = response;

    // Process through modules in reverse order
    const modules = Array.from(this.modules.values()).reverse();
    for (const module of modules) {
      try {
        result = await module.processResponse(result);
      } catch (error) {
        throw new Error(
          `Pipeline response processing failed at module ${module.getId()}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  }

  getModule(moduleId: string): MockModule | undefined {
    return this.modules.get(moduleId);
  }

  getModules(): MockModule[] {
    return Array.from(this.modules.values());
  }

  getHealth(): any {
    const moduleHealth = Array.from(this.modules.values()).map((module) => {
      try {
        return module.getHealth();
      } catch (error) {
        return {
          moduleId: module.getId(),
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    return {
      pipelineId: this.id,
      status: this.isActive ? 'active' : 'inactive',
      modules: moduleHealth,
      lastCheck: Date.now(),
    };
  }
}

// Integration test implementations
class IntegrationTestModule extends MockModule {
  private errorHandler: TestErrorHandler;
  private errorRecoveryManager: TestErrorRecoveryManager;
  private failureRate: number = 0;
  private callCount: number = 0;

  constructor(
    id: string,
    name: string,
    errorHandler: TestErrorHandler,
    recoveryManager: TestErrorRecoveryManager,
    failureRate = 0
  ) {
    super(id, name);
    this.errorHandler = errorHandler;
    this.errorRecoveryManager = recoveryManager;
    this.failureRate = failureRate;
  }

  async process(request: any): Promise<any> {
    this.callCount++;

    // Simulate failures based on failure rate
    if (this.failureRate > 0 && this.callCount % Math.floor(1 / this.failureRate) === 0) {
      const error = new TestError(
        'INTEGRATION_ERROR',
        `Module ${this.getId()} failed`,
        'integration',
        'high'
      );
      const context = new TestErrorContext(
        request.executionId || 'unknown',
        request.pipelineId || 'unknown',
        this.getId(),
        0
      );

      const strategy = await this.errorHandler.handleError(error, context);

      if (strategy.action === 'retry') {
        // Execute recovery action and simulate retry success
        await this.errorRecoveryManager.executeRecovery('retry', context, strategy.retryDelay);
        const result = await super.process(request);
        return {
          ...result,
          retried: true,
          callCount: this.callCount,
        };
      } else {
        throw error;
      }
    }

    const result = await super.process(request);
    return {
      ...result,
      callCount: this.callCount,
    };
  }

  getCallCount(): number {
    return this.callCount;
  }

  resetCallCount(): void {
    this.callCount = 0;
  }
}

class AuthModule extends MockModule {
  private authenticatedUsers: Set<string> = new Set();

  constructor(id: string, name: string) {
    super(id, name);
  }

  async process(request: any): Promise<any> {
    // Simulate authentication check
    const userId = request.userId || 'anonymous';

    if (userId === 'anonymous') {
      throw new Error('Authentication required');
    }

    if (!this.authenticatedUsers.has(userId)) {
      throw new Error(`User ${userId} not authenticated`);
    }

    return {
      ...request,
      authenticated: true,
      userId,
      authTimestamp: Date.now(),
    };
  }

  async processResponse(response: any): Promise<any> {
    const result = await super.processResponse(response);
    return {
      ...result,
      authResponseProcessed: true,
      authResponseTimestamp: Date.now(),
    };
  }

  authenticateUser(userId: string): void {
    this.authenticatedUsers.add(userId);
  }

  deauthenticateUser(userId: string): void {
    this.authenticatedUsers.delete(userId);
  }

  getAuthenticatedUsers(): string[] {
    return Array.from(this.authenticatedUsers);
  }
}

class ProcessingModule extends MockModule {
  private processingTime: number = 0;

  constructor(id: string, name: string, processingTime = 10) {
    super(id, name);
    this.processingTime = processingTime;
  }

  async process(request: any): Promise<any> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, this.processingTime));

    const result = await super.process(request);
    return {
      ...result,
      processedData: `Processed by ${this.getId()}`,
      processingTime: this.processingTime,
      processingTimestamp: Date.now(),
    };
  }

  async processResponse(response: any): Promise<any> {
    const result = await super.processResponse(response);
    return {
      ...result,
      responseProcessed: true,
      responseProcessingTime: this.processingTime,
      responseTimestamp: Date.now(),
    };
  }
}

describe('Integration Tests', () => {
  let errorHandler: TestErrorHandler;
  let recoveryManager: TestErrorRecoveryManager;
  let pipeline: SimplePipeline;

  beforeEach(() => {
    errorHandler = new TestErrorHandler();
    recoveryManager = new TestErrorRecoveryManager();
    pipeline = new SimplePipeline('integration-pipeline', 'Integration Test Pipeline');
  });

  afterEach(() => {
    errorHandler.clearErrors();
    errorHandler.clearErrorStats();
    recoveryManager.clearHistory();
  });

  describe('Pipeline-Error Handling Integration', () => {
    it('should handle errors gracefully within pipeline processing', async () => {
      const authModule = new AuthModule('auth-module', 'Authentication Module');
      const processingModule = new ProcessingModule('processing-module', 'Processing Module');

      pipeline.addModule(authModule);
      pipeline.addModule(processingModule);

      await authModule.configure({});
      await processingModule.configure({});
      await pipeline.activate();

      // Test successful processing
      authModule.authenticateUser('test-user');
      const request = {
        data: 'test-data',
        userId: 'test-user',
      };

      const result = await pipeline.process(request);

      expect(result.authenticated).toBe(true);
      expect(result.processedData).toBe('Processed by processing-module');
      expect(result.processedBy).toBe('processing-module');
    });

    it('should handle authentication failures in pipeline', async () => {
      const authModule = new AuthModule('auth-module', 'Authentication Module');
      const processingModule = new ProcessingModule('processing-module', 'Processing Module');

      pipeline.addModule(authModule);
      pipeline.addModule(processingModule);

      await authModule.configure({});
      await processingModule.configure({});
      await pipeline.activate();

      // Test authentication failure
      const request = {
        data: 'test-data',
        userId: 'unauthenticated-user',
      };

      await expect(pipeline.process(request)).rejects.toThrow(
        'User unauthenticated-user not authenticated'
      );
    });

    it('should integrate error recovery with pipeline processing', async () => {
      const errorModule = new IntegrationTestModule(
        'error-module',
        'Error Prone Module',
        errorHandler,
        recoveryManager,
        0.5 // 50% failure rate
      );
      const processingModule = new ProcessingModule('processing-module', 'Processing Module');

      pipeline.addModule(errorModule);
      pipeline.addModule(processingModule);

      await errorModule.configure({});
      await processingModule.configure({});
      await pipeline.activate();

      const request = {
        data: 'test-data',
        executionId: 'exec-123',
        pipelineId: 'integration-pipeline',
      };

      // Process multiple requests to test error handling
      const results = [];
      for (let i = 0; i < 10; i++) {
        try {
          const result = await pipeline.process({ ...request, iteration: i });
          results.push(result);
        } catch (error) {
          results.push({ error: error instanceof Error ? error.message : String(error) });
        }
      }

      // Should have some successful results and some errors
      expect(results.length).toBe(10);
      const successCount = results.filter((r) => !('error' in r)).length;
      const errorCount = results.filter((r) => 'error' in r).length;

      expect(successCount).toBeGreaterThan(0);
      expect(errorCount).toBeGreaterThan(0);
    });
  });

  describe('Multi-Module Workflow Integration', () => {
    it('should process complex workflows through multiple modules', async () => {
      const authModule = new AuthModule('auth', 'Auth');
      const validationModule = new MockModule('validation', 'Validation');
      const processingModule = new ProcessingModule('processing', 'Processing');
      const responseModule = new MockModule('response', 'Response');

      pipeline.addModule(authModule);
      pipeline.addModule(validationModule);
      pipeline.addModule(processingModule);
      pipeline.addModule(responseModule);

      // Configure all modules
      await authModule.configure({});
      await validationModule.configure({});
      await processingModule.configure({});
      await responseModule.configure({});
      await pipeline.activate();

      // Authenticate user
      authModule.authenticateUser('integration-user');

      const request = {
        data: 'integration-test-data',
        userId: 'integration-user',
        metadata: { source: 'integration-test' },
      };

      const result = await pipeline.process(request);

      // Verify pipeline processed through all modules
      expect(result.authenticated).toBe(true);
      expect(result.processedBy).toBe('response');
      expect(result.pipelineId).toBe('integration-pipeline');
      expect(result.data).toBe('integration-test-data');
      expect(result.metadata.source).toBe('integration-test');

      // Test response processing
      const response = {
        result: 'test-result',
        status: 'success',
        timestamp: Date.now(),
      };

      const processedResponse = await pipeline.processResponse(response);

      expect(processedResponse.responseProcessedBy).toBe('auth');
      expect(processedResponse.result).toBe('test-result');
    });

    it('should handle concurrent processing in pipeline', async () => {
      const authModule = new AuthModule('auth', 'Auth');
      const processingModule = new ProcessingModule('processing', 'Processing', 5); // 5ms processing time

      pipeline.addModule(authModule);
      pipeline.addModule(processingModule);

      await authModule.configure({});
      await processingModule.configure({});
      await pipeline.activate();

      // Authenticate multiple users
      authModule.authenticateUser('user-1');
      authModule.authenticateUser('user-2');
      authModule.authenticateUser('user-3');

      const requests = [
        { data: 'data-1', userId: 'user-1' },
        { data: 'data-2', userId: 'user-2' },
        { data: 'data-3', userId: 'user-3' },
      ];

      const startTime = Date.now();
      const results = await Promise.all(requests.map((req) => pipeline.process(req)));
      const endTime = Date.now();

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.authenticated).toBe(true);
        expect(result.data).toBe(`data-${index + 1}`);
        expect(result.userId).toBe(`user-${index + 1}`);
      });

      // Should complete faster than sequential processing
      expect(endTime - startTime).toBeLessThan(20); // Much less than 3 * 5ms
    });
  });

  describe('Error Recovery Integration', () => {
    it('should coordinate error handling across modules', async () => {
      const module1 = new IntegrationTestModule(
        'module-1',
        'Module 1',
        errorHandler,
        recoveryManager,
        0.5
      );
      const module2 = new IntegrationTestModule(
        'module-2',
        'Module 2',
        errorHandler,
        recoveryManager,
        0.5
      );

      pipeline.addModule(module1);
      pipeline.addModule(module2);

      await module1.configure({});
      await module2.configure({});
      await pipeline.activate();

      const request = {
        data: 'error-test-data',
        executionId: 'error-exec-123',
        pipelineId: 'error-pipeline',
      };

      // Process multiple requests to generate errors
      for (let i = 0; i < 10; i++) {
        try {
          await pipeline.process({ ...request, iteration: i });
        } catch (error) {
          // Expected to have some errors
        }
      }

      // Check error statistics
      const errorStats = errorHandler.getErrorStats();
      expect(Object.keys(errorStats).length).toBeGreaterThan(0);

      // Check recovery history
      const recoveryHistory = recoveryManager.getActionHistory();
      expect(recoveryHistory.length).toBeGreaterThan(0);

      // Verify specific error types were handled
      expect(errorStats['INTEGRATION_ERROR']).toBeGreaterThan(0);
    });

    it('should handle pipeline blacklisting due to repeated errors', async () => {
      const failingModule = new IntegrationTestModule(
        'failing-module',
        'Failing Module',
        errorHandler,
        recoveryManager,
        1.0 // Always fail
      );

      pipeline.addModule(failingModule);
      await failingModule.configure({});
      await pipeline.activate();

      const request = {
        data: 'blacklist-test',
        executionId: 'blacklist-exec',
        pipelineId: 'blacklist-pipeline',
        retryCount: 4,
      };

      // Generate enough errors to trigger blacklisting
      for (let i = 0; i < 10; i++) {
        try {
          await pipeline.process(request);
        } catch (error) {
          // Expected to fail
        }
      }

      // Check if pipeline gets blacklisted
      expect(errorHandler.isPipelineBlacklisted('blacklist-pipeline')).toBe(true);
      expect(errorHandler.getBlacklistedPipelines()).toContain('blacklist-pipeline');
    });
  });

  describe('Performance and Load Integration', () => {
    it('should handle high load with error handling', async () => {
      const authModule = new AuthModule('auth', 'Auth');
      const processingModule = new ProcessingModule('processing', 'Processing', 2);

      pipeline.addModule(authModule);
      pipeline.addModule(processingModule);

      await authModule.configure({});
      await processingModule.configure({});
      await pipeline.activate();

      // Authenticate user
      authModule.authenticateUser('load-test-user');

      const startTime = Date.now();

      // Process 100 requests concurrently
      const requests = Array.from({ length: 100 }, (_, i) => ({
        data: `load-test-data-${i}`,
        userId: 'load-test-user',
        index: i,
      }));

      const results = await Promise.all(requests.map((req) => pipeline.process(req)));

      const endTime = Date.now();

      expect(results).toHaveLength(100);
      results.forEach((result, index) => {
        expect(result.authenticated).toBe(true);
        expect(result.data).toBe(`load-test-data-${index}`);
        expect(result.index).toBe(index);
      });

      // Performance check: should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should maintain state consistency across multiple operations', async () => {
      const authModule = new AuthModule('auth', 'Auth');
      const stateModule = new MockModule('state', 'State');

      pipeline.addModule(authModule);
      pipeline.addModule(stateModule);

      await authModule.configure({});
      await stateModule.configure({});
      await pipeline.activate();

      // Test user management
      authModule.authenticateUser('state-user-1');
      authModule.authenticateUser('state-user-2');

      expect(authModule.getAuthenticatedUsers()).toHaveLength(2);
      expect(authModule.getAuthenticatedUsers()).toContain('state-user-1');
      expect(authModule.getAuthenticatedUsers()).toContain('state-user-2');

      // Process requests with both users
      const result1 = await pipeline.process({
        data: 'state-data-1',
        userId: 'state-user-1',
      });

      const result2 = await pipeline.process({
        data: 'state-data-2',
        userId: 'state-user-2',
      });

      expect(result1.authenticated).toBe(true);
      expect(result2.authenticated).toBe(true);
      expect(result1.userId).toBe('state-user-1');
      expect(result2.userId).toBe('state-user-2');

      // Remove one user and verify
      authModule.deauthenticateUser('state-user-2');
      expect(authModule.getAuthenticatedUsers()).toHaveLength(1);
      expect(authModule.getAuthenticatedUsers()).not.toContain('state-user-2');

      // Verify deauthenticated user can no longer process
      await expect(
        pipeline.process({
          data: 'state-data-3',
          userId: 'state-user-2',
        })
      ).rejects.toThrow('User state-user-2 not authenticated');
    });
  });

  describe('End-to-End Workflow Integration', () => {
    it('should handle complete request-response lifecycle', async () => {
      const authModule = new AuthModule('auth', 'Auth');
      const processingModule = new ProcessingModule('processing', 'Processing', 1);
      const validationModule = new MockModule('validation', 'Validation');

      pipeline.addModule(authModule);
      pipeline.addModule(validationModule);
      pipeline.addModule(processingModule);

      await authModule.configure({});
      await validationModule.configure({});
      await processingModule.configure({});
      await pipeline.activate();

      // Setup
      authModule.authenticateUser('e2e-user');

      // Request processing
      const request = {
        data: 'e2e-test-data',
        userId: 'e2e-user',
        metadata: { workflow: 'e2e-test' },
      };

      const processedRequest = await pipeline.process(request);

      // Verify request processing
      expect(processedRequest.authenticated).toBe(true);
      expect(processedRequest.processedBy).toBe('processing');
      expect(processedRequest.pipelineId).toBe('integration-pipeline');
      expect(processedRequest.metadata.workflow).toBe('e2e-test');

      // Response processing
      const response = {
        result: 'e2e-test-result',
        status: 'success',
        data: processedRequest,
      };

      const processedResponse = await pipeline.processResponse(response);

      // Verify response processing
      expect(processedResponse.responseProcessedBy).toBe('auth');
      expect(processedResponse.result).toBe('e2e-test-result');
      expect(processedResponse.data.authenticated).toBe(true);
    });

    it('should handle complex error scenarios with recovery', async () => {
      const authModule = new AuthModule('auth', 'Auth');
      const errorModule = new IntegrationTestModule(
        'error-module',
        'Error Module',
        errorHandler,
        recoveryManager,
        0.6
      );
      const recoveryModule = new MockModule('recovery', 'Recovery');

      pipeline.addModule(authModule);
      pipeline.addModule(errorModule);
      pipeline.addModule(recoveryModule);

      await authModule.configure({});
      await errorModule.configure({});
      await recoveryModule.configure({});
      await pipeline.activate();

      authModule.authenticateUser('recovery-user');

      const request = {
        data: 'recovery-test-data',
        userId: 'recovery-user',
        executionId: 'recovery-exec',
        pipelineId: 'recovery-pipeline',
      };

      let successCount = 0;
      let errorCount = 0;

      // Process multiple requests
      for (let i = 0; i < 15; i++) {
        try {
          await pipeline.process({ ...request, iteration: i });
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      // Should have both successes and errors
      expect(successCount).toBeGreaterThan(0);
      expect(errorCount).toBeGreaterThan(0);

      // Verify error handling was coordinated
      const errorStats = errorHandler.getErrorStats();
      const recoveryHistory = recoveryManager.getActionHistory();

      expect(Object.keys(errorStats).length).toBeGreaterThan(0);
      expect(recoveryHistory.length).toBeGreaterThan(0);

      // Verify pipeline remained functional
      expect(pipeline.getHealth().status).toBe('active');
    });
  });
});
