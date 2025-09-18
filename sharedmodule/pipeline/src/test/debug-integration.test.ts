/**
 * Debug Integration Test - Test new debug functionality
 * 调试集成测试 - 测试新的调试功能
 */

import { PipelineBaseModule, PipelineModuleConfig } from '../modules/PipelineBaseModule';

/**
 * Test PipelineBaseModule with debug features
 * 测试带有调试功能的PipelineBaseModule
 */
describe('PipelineBaseModule Debug Integration', () => {
  let module: PipelineBaseModule;

  beforeEach(() => {
    const config: PipelineModuleConfig = {
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0',
      type: 'provider',
      description: 'Test module for debug integration',
      enableTwoPhaseDebug: true,
      debugBaseDirectory: './test-logs',
      enableIOTracking: true
    };

    module = new PipelineBaseModule(config);
  });

  afterEach(async () => {
    if (module) {
      await module.destroy();
    }
  });

  test('should initialize with debug capabilities', () => {
    expect(module).toBeDefined();
    const config = module.getPipelineConfig();
    expect(config.enableTwoPhaseDebug).toBe(true);
    expect(config.enableIOTracking).toBe(true);
  });

  test('should track pipeline operations', async () => {
    const result = await module.trackPipelineOperation(
      'test-operation',
      async () => {
        return { success: true, data: 'test-data' };
      },
      { input: 'test-input' },
      'test-operation'
    );

    expect(result).toEqual({ success: true, data: 'test-data' });
  });

  test('should handle errors in pipeline operations', async () => {
    await expect(
      module.trackPipelineOperation(
        'test-error-operation',
        async () => {
          throw new Error('Test error');
        },
        { input: 'test-input' },
        'test-error-operation'
      )
    ).rejects.toThrow('Test error');
  });

  test('should record pipeline stages', () => {
    expect(() => {
      module.recordPipelineStage('test-stage', { data: 'test' }, 'completed');
    }).not.toThrow();
  });

  test('should provide pipeline metrics', () => {
    const metrics = module.getPipelineMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.debugEnabled).toBe(true);
  });

  test('should get provider info', () => {
    const providerInfo = module.getProviderInfo();
    expect(providerInfo).toBeDefined();
    expect(providerInfo.name).toBe('Test Module');
    expect(providerInfo.type).toBe('provider');
  });

  test('should handle pipeline errors', () => {
    expect(() => {
      module.handlePipelineError(
        new Error('Test error'),
        {
          operation: 'test-operation',
          stage: 'test-stage'
        }
      );
    }).not.toThrow();
  });
});

/**
 * Test configuration examples
 * 测试配置示例
 */
describe('Pipeline Configuration Examples', () => {
  test('should create provider configuration with debug options', () => {
    const providerConfig = {
      name: 'test-provider',
      endpoint: 'https://api.test.com/v1',
      supportedModels: ['test-model'],
      defaultModel: 'test-model',
      enableTwoPhaseDebug: true,
      debugBaseDirectory: '~/.rcc/debug-logs',
      enableIOTracking: true,
      maxConcurrentRequests: 5,
      requestTimeout: 30000
    };

    expect(providerConfig.enableTwoPhaseDebug).toBe(true);
    expect(providerConfig.enableIOTracking).toBe(true);
    expect(providerConfig.maxConcurrentRequests).toBe(5);
  });

  test('should create scheduler configuration with debug options', () => {
    const schedulerConfig = {
      maxConcurrentRequests: 3,
      requestTimeout: 30000,
      healthCheckInterval: 60000,
      retryStrategy: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      },
      loadBalancingStrategy: 'round-robin' as const,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 30000,
      enableTwoPhaseDebug: true,
      debugBaseDirectory: '~/.rcc/debug-logs',
      enableIOTracking: true,
      logSchedulingDecisions: true,
      trackPipelineMetrics: true
    };

    expect(schedulerConfig.enableTwoPhaseDebug).toBe(true);
    expect(schedulerConfig.enableIOTracking).toBe(true);
    expect(schedulerConfig.logSchedulingDecisions).toBe(true);
  });
});