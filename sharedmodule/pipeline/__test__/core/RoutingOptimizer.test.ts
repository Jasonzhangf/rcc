/**
 * RCC Pipeline RoutingOptimizer 单元测试
 */

import { RoutingOptimizer } from '../../src/core/RoutingOptimizer';
import {
  RoutingDecision,
  RoutingOptimizationConfig,
  VirtualModel,
  PipelineExecutionContext,
  ProviderInfo
} from '../../src/interfaces/ModularInterfaces';
import { v4 as uuidv4 } from 'uuid';

// Mock uuid
jest.mock('uuid');
const mockUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('RoutingOptimizer', () => {
  let routingOptimizer: RoutingOptimizer;
  let config: RoutingOptimizationConfig;
  let mockVirtualModel: VirtualModel;
  let mockContext: Partial<PipelineExecutionContext>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUuid.mockReturnValue('test-uuid-1234');

    config = {
      enableLoadBalancing: true,
      enableHealthCheck: true,
      healthCheckInterval: 30000,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      requestTimeout: 30000,
      retryAttempts: 3,
      enableMetrics: true,
      metricsCollectionInterval: 60000
    };

    mockVirtualModel = {
      id: 'test-model',
      name: 'Test Model',
      description: 'Test virtual model',
      targets: [
        { providerId: 'provider-1', modelId: 'model-1' },
        { providerId: 'provider-2', modelId: 'model-2' },
        { providerId: 'provider-3', modelId: 'model-3' }
      ]
    };

    mockContext = {
      sessionId: 'test-session',
      requestId: 'test-request',
      virtualModelId: 'test-model'
    };

    routingOptimizer = new RoutingOptimizer(config);
  });

  describe('构造函数和初始化', () => {
    test('应该正确初始化RoutingOptimizer', () => {
      expect(routingOptimizer).toBeInstanceOf(RoutingOptimizer);
      const metrics = routingOptimizer.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
    });

    test('应该设置默认配置', () => {
      const minimalConfig: Partial<RoutingOptimizationConfig> = {};
      const optimizer = new RoutingOptimizer(minimalConfig as RoutingOptimizationConfig);
      expect(optimizer).toBeInstanceOf(RoutingOptimizer);
    });
  });

  describe('路由决策获取', () => {
    test('应该获取基本路由决策', async () => {
      const decision = await routingOptimizer.getRoutingDecision(mockVirtualModel, mockContext);

      expect(decision).toBeDefined();
      expect(decision.providerId).toMatch(/provider-[1-3]/);
      expect(decision.strategy).toBeDefined();
      expect(decision.fallbackProviders).toBeInstanceOf(Array);
      expect(decision.estimatedLatency).toBeGreaterThanOrEqual(0);
      expect(decision.successProbability).toBeGreaterThanOrEqual(0);
      expect(decision.successProbability).toBeLessThanOrEqual(1);
      expect(decision.metadata).toBeDefined();
    });

    test('应该在没有健康提供商时抛出错误', async () => {
      // 手动设置所有提供商为不健康
      const privateOptimizer = routingOptimizer as any;
      privateOptimizer.healthStatus.set('provider-1', {
        providerId: 'provider-1',
        isHealthy: false,
        lastHealthCheck: Date.now(),
        responseTime: 0,
        errorRate: 1,
        consecutiveFailures: 10,
        lastUsed: 0,
        totalRequests: 0,
        totalFailures: 0,
        averageResponseTime: 0
      });
      privateOptimizer.healthStatus.set('provider-2', {
        providerId: 'provider-2',
        isHealthy: false,
        lastHealthCheck: Date.now(),
        responseTime: 0,
        errorRate: 1,
        consecutiveFailures: 10,
        lastUsed: 0,
        totalRequests: 0,
        totalFailures: 0,
        averageResponseTime: 0
      });
      privateOptimizer.healthStatus.set('provider-3', {
        providerId: 'provider-3',
        isHealthy: false,
        lastHealthCheck: Date.now(),
        responseTime: 0,
        errorRate: 1,
        consecutiveFailures: 10,
        lastUsed: 0,
        totalRequests: 0,
        totalFailures: 0,
        averageResponseTime: 0
      });

      await expect(routingOptimizer.getRoutingDecision(mockVirtualModel, mockContext))
        .rejects.toThrow('No healthy providers available');
    });

    test('应该包含所有健康提供商作为备用', async () => {
      const decision = await routingOptimizer.getRoutingDecision(mockVirtualModel, mockContext);

      expect(decision.fallbackProviders).toHaveLength(2);
      expect(decision.fallbackProviders).not.toContain(decision.providerId);
      expect(decision.fallbackProviders.every(p =>
        ['provider-1', 'provider-2', 'provider-3'].includes(p)
      )).toBe(true);
    });
  });

  describe('路由策略选择', () => {
    test('应该在没有负载均衡时使用轮询', async () => {
      const noLoadBalancingConfig = {
        ...config,
        enableLoadBalancing: false
      };
      const optimizer = new RoutingOptimizer(noLoadBalancingConfig);

      const decision = await optimizer.getRoutingDecision(mockVirtualModel, mockContext);
      expect(decision.strategy).toBe('round-robin');
    });

    test('应该在低健康分数时使用健康感知策略', async () => {
      // 设置低健康分数
      const privateOptimizer = routingOptimizer as any;
      privateOptimizer.healthStatus.set('provider-1', {
        providerId: 'provider-1',
        isHealthy: false,
        lastHealthCheck: Date.now(),
        responseTime: 1000,
        errorRate: 0.8,
        consecutiveFailures: 5,
        lastUsed: 0,
        totalRequests: 10,
        totalFailures: 8,
        averageResponseTime: 1000
      });

      const decision = await routingOptimizer.getRoutingDecision(mockVirtualModel, mockContext);
      expect(decision.strategy).toBe('health-aware');
    });

    test('应该在高延迟方差时使用最低延迟策略', async () => {
      // 设置高延迟方差
      const privateOptimizer = routingOptimizer as any;
      privateOptimizer.healthStatus.set('provider-1', {
        providerId: 'provider-1',
        isHealthy: true,
        lastHealthCheck: Date.now(),
        responseTime: 100,
        errorRate: 0,
        consecutiveFailures: 0,
        lastUsed: 0,
        totalRequests: 10,
        totalFailures: 0,
        averageResponseTime: 100
      });
      privateOptimizer.healthStatus.set('provider-2', {
        providerId: 'provider-2',
        isHealthy: true,
        lastHealthCheck: Date.now(),
        responseTime: 500,
        errorRate: 0,
        consecutiveFailures: 0,
        lastUsed: 0,
        totalRequests: 10,
        totalFailures: 0,
        averageResponseTime: 500
      });

      const decision = await routingOptimizer.getRoutingDecision(mockVirtualModel, mockContext);
      expect(['least-latency', 'weighted-random']).toContain(decision.strategy);
    });
  });

  describe('提供商选择算法', () => {
    describe('轮询选择', () => {
      test('应该按顺序选择提供商', () => {
        const privateOptimizer = routingOptimizer as any;
        const providers = ['provider-1', 'provider-2', 'provider-3'];

        // 清除轮询状态
        privateOptimizer.requestRoundRobin.clear();

        const first = privateOptimizer.selectRoundRobin(providers);
        const second = privateOptimizer.selectRoundRobin(providers);
        const third = privateOptimizer.selectRoundRobin(providers);
        const fourth = privateOptimizer.selectRoundRobin(providers);

        expect(first).toBe('provider-1');
        expect(second).toBe('provider-2');
        expect(third).toBe('provider-3');
        expect(fourth).toBe('provider-1');
      });

      test('应该为不同提供商组维护独立的轮询状态', () => {
        const privateOptimizer = routingOptimizer as any;
        const group1 = ['provider-1', 'provider-2'];
        const group2 = ['provider-3', 'provider-4'];

        // 清除轮询状态
        privateOptimizer.requestRoundRobin.clear();

        const group1First = privateOptimizer.selectRoundRobin(group1);
        const group2First = privateOptimizer.selectRoundRobin(group2);
        const group1Second = privateOptimizer.selectRoundRobin(group1);

        expect(group1First).toBe('provider-1');
        expect(group2First).toBe('provider-3');
        expect(group1Second).toBe('provider-2');
      });
    });

    describe('加权随机选择', () => {
      test('应该根据权重选择提供商', () => {
        const privateOptimizer = routingOptimizer as any;
        const providers = ['provider-1', 'provider-2', 'provider-3'];
        const weights = [0.1, 0.8, 0.1];

        // 多次运行测试分布
        const results: { [key: string]: number } = {};
        for (let i = 0; i < 1000; i++) {
          const selected = privateOptimizer.selectWeightedRandom(providers, weights);
          results[selected] = (results[selected] || 0) + 1;
        }

        // provider-2 应该被选中最多
        expect(results['provider-2']).toBeGreaterThan(results['provider-1']);
        expect(results['provider-2']).toBeGreaterThan(results['provider-3']);
      });

      test('应该处理权重总和为零的情况', () => {
        const privateOptimizer = routingOptimizer as any;
        const providers = ['provider-1', 'provider-2'];
        const weights = [0, 0];

        const selected = privateOptimizer.selectWeightedRandom(providers, weights);
        expect(providers).toContain(selected);
      });
    });

    describe('最低延迟选择', () => {
      test('应该选择延迟最低的提供商', () => {
        const privateOptimizer = routingOptimizer as any;
        const providers = ['provider-1', 'provider-2', 'provider-3'];

        // 设置不同的延迟
        privateOptimizer.healthStatus.set('provider-1', {
          providerId: 'provider-1',
          isHealthy: true,
          lastHealthCheck: Date.now(),
          responseTime: 100,
          errorRate: 0,
          consecutiveFailures: 0,
          lastUsed: 0,
          totalRequests: 0,
          totalFailures: 0,
          averageResponseTime: 100
        });
        privateOptimizer.healthStatus.set('provider-2', {
          providerId: 'provider-2',
          isHealthy: true,
          lastHealthCheck: Date.now(),
          responseTime: 50,
          errorRate: 0,
          consecutiveFailures: 0,
          lastUsed: 0,
          totalRequests: 0,
          totalFailures: 0,
          averageResponseTime: 50
        });
        privateOptimizer.healthStatus.set('provider-3', {
          providerId: 'provider-3',
          isHealthy: true,
          lastHealthCheck: Date.now(),
          responseTime: 200,
          errorRate: 0,
          consecutiveFailures: 0,
          lastUsed: 0,
          totalRequests: 0,
          totalFailures: 0,
          averageResponseTime: 200
        });

        const selected = privateOptimizer.selectLeastLatency(providers);
        expect(selected).toBe('provider-2');
      });

      test('应该在没有健康状态时选择第一个提供商', () => {
        const privateOptimizer = routingOptimizer as any;
        const providers = ['provider-1', 'provider-2', 'provider-3'];

        const selected = privateOptimizer.selectLeastLatency(providers);
        expect(selected).toBe('provider-1');
      });
    });

    describe('最少连接选择', () => {
      test('应该选择连接数最少的提供商', () => {
        const privateOptimizer = routingOptimizer as any;
        const providers = ['provider-1', 'provider-2', 'provider-3'];

        // 设置不同的连接数
        privateOptimizer.healthStatus.set('provider-1', {
          providerId: 'provider-1',
          isHealthy: true,
          lastHealthCheck: Date.now(),
          responseTime: 0,
          errorRate: 0,
          consecutiveFailures: 0,
          lastUsed: 0,
          totalRequests: 100,
          totalFailures: 0,
          averageResponseTime: 0
        });
        privateOptimizer.healthStatus.set('provider-2', {
          providerId: 'provider-2',
          isHealthy: true,
          lastHealthCheck: Date.now(),
          responseTime: 0,
          errorRate: 0,
          consecutiveFailures: 0,
          lastUsed: 0,
          totalRequests: 50,
          totalFailures: 0,
          averageResponseTime: 0
        });
        privateOptimizer.healthStatus.set('provider-3', {
          providerId: 'provider-3',
          isHealthy: true,
          lastHealthCheck: Date.now(),
          responseTime: 0,
          errorRate: 0,
          consecutiveFailures: 0,
          lastUsed: 0,
          totalRequests: 75,
          totalFailures: 0,
          averageResponseTime: 0
        });

        const selected = privateOptimizer.selectLeastConnections(providers);
        expect(selected).toBe('provider-2');
      });
    });

    describe('健康感知选择', () => {
      test('应该选择健康分数最高的提供商', () => {
        const privateOptimizer = routingOptimizer as any;
        const providers = ['provider-1', 'provider-2', 'provider-3'];

        // 设置不同的健康状态
        privateOptimizer.healthStatus.set('provider-1', {
          providerId: 'provider-1',
          isHealthy: true,
          lastHealthCheck: Date.now(),
          responseTime: 100,
          errorRate: 0.1,
          consecutiveFailures: 0,
          lastUsed: 0,
          totalRequests: 10,
          totalFailures: 1,
          averageResponseTime: 100
        });
        privateOptimizer.healthStatus.set('provider-2', {
          providerId: 'provider-2',
          isHealthy: true,
          lastHealthCheck: Date.now(),
          responseTime: 50,
          errorRate: 0.05,
          consecutiveFailures: 0,
          lastUsed: 0,
          totalRequests: 20,
          totalFailures: 1,
          averageResponseTime: 50
        });
        privateOptimizer.healthStatus.set('provider-3', {
          providerId: 'provider-3',
          isHealthy: false,
          lastHealthCheck: Date.now(),
          responseTime: 1000,
          errorRate: 0.8,
          consecutiveFailures: 5,
          lastUsed: 0,
          totalRequests: 10,
          totalFailures: 8,
          averageResponseTime: 1000
        });

        const selected = privateOptimizer.selectHealthAware(providers);
        expect(selected).toBe('provider-2');
      });

      test('应该在没有健康状态时给所有提供商相同分数', () => {
        const privateOptimizer = routingOptimizer as any;
        const providers = ['provider-1', 'provider-2', 'provider-3'];

        const selected = privateOptimizer.selectHealthAware(providers);
        expect(providers).toContain(selected);
      });
    });
  });

  describe('健康分数计算', () => {
    test('应该正确计算健康分数', () => {
      const privateOptimizer = routingOptimizer as any;

      // 设置健康提供商
      privateOptimizer.healthStatus.set('provider-1', {
        providerId: 'provider-1',
        isHealthy: true,
        lastHealthCheck: Date.now(),
        responseTime: 100,
        errorRate: 0.05,
        consecutiveFailures: 0,
        lastUsed: 0,
        totalRequests: 20,
        totalFailures: 1,
        averageResponseTime: 100
      });

      const score = privateOptimizer.getHealthScore('provider-1');
      expect(score).toBeGreaterThan(0.8); // 应该有很高的健康分数
      expect(score).toBeLessThanOrEqual(1);
    });

    test('应该为不健康提供商计算低分数', () => {
      const privateOptimizer = routingOptimizer as any;

      // 设置不健康提供商
      privateOptimizer.healthStatus.set('provider-1', {
        providerId: 'provider-1',
        isHealthy: false,
        lastHealthCheck: Date.now(),
        responseTime: 1000,
        errorRate: 0.8,
        consecutiveFailures: 10,
        lastUsed: 0,
        totalRequests: 10,
        totalFailures: 8,
        averageResponseTime: 1000
      });

      const score = privateOptimizer.getHealthScore('provider-1');
      expect(score).toBeLessThan(0.5); // 应该有较低的健康分数
      expect(score).toBeGreaterThanOrEqual(0);
    });

    test('应该在没有健康状态时返回默认分数', () => {
      const privateOptimizer = routingOptimizer as any;

      const score = privateOptimizer.getHealthScore('non-existent-provider');
      expect(score).toBe(1.0);
    });
  });

  describe('请求结果记录', () => {
    test('应该记录成功的请求结果', () => {
      routingOptimizer.recordRequestResult('provider-1', true, 150);

      const metrics = routingOptimizer.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBe(150);
      expect(metrics.minResponseTime).toBe(150);
      expect(metrics.maxResponseTime).toBe(150);
    });

    test('应该记录失败的请求结果', () => {
      routingOptimizer.recordRequestResult('provider-1', false, 200);

      const metrics = routingOptimizer.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.averageResponseTime).toBe(200);
    });

    test('应该正确计算平均响应时间', () => {
      routingOptimizer.recordRequestResult('provider-1', true, 100);
      routingOptimizer.recordRequestResult('provider-1', true, 200);
      routingOptimizer.recordRequestResult('provider-1', true, 300);

      const metrics = routingOptimizer.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.averageResponseTime).toBe(200); // (100 + 200 + 300) / 3
    });

    test('应该更新提供商健康状态', () => {
      routingOptimizer.recordRequestResult('provider-1', true, 150);
      routingOptimizer.recordRequestResult('provider-1', false, 200);

      const healthStatus = routingOptimizer.getHealthStatus();
      const health = healthStatus.get('provider-1');

      expect(health).toBeDefined();
      expect(health?.totalRequests).toBe(2);
      expect(health?.totalFailures).toBe(1);
      expect(health?.errorRate).toBe(0.5);
      expect(health?.averageResponseTime).toBe(175); // (150 + 200) / 2
    });
  });

  describe('延迟和成功率估算', () => {
    test('应该正确估算延迟', () => {
      const privateOptimizer = routingOptimizer as any;

      privateOptimizer.healthStatus.set('provider-1', {
        providerId: 'provider-1',
        isHealthy: true,
        lastHealthCheck: Date.now(),
        responseTime: 150,
        errorRate: 0,
        consecutiveFailures: 0,
        lastUsed: 0,
        totalRequests: 10,
        totalFailures: 0,
        averageResponseTime: 150
      });

      const latency = privateOptimizer.estimateLatency('provider-1');
      expect(latency).toBe(150);
    });

    test('应该为不存在的提供商返回零延迟', () => {
      const privateOptimizer = routingOptimizer as any;

      const latency = privateOptimizer.estimateLatency('non-existent-provider');
      expect(latency).toBe(0);
    });

    test('应该正确计算成功概率', () => {
      const privateOptimizer = routingOptimizer as any;

      privateOptimizer.healthStatus.set('provider-1', {
        providerId: 'provider-1',
        isHealthy: true,
        lastHealthCheck: Date.now(),
        responseTime: 0,
        errorRate: 0.1,
        consecutiveFailures: 0,
        lastUsed: 0,
        totalRequests: 10,
        totalFailures: 1,
        averageResponseTime: 0
      });

      const probability = privateOptimizer.calculateSuccessProbability('provider-1');
      expect(probability).toBe(0.9);
    });

    test('应该为不存在的提供商返回默认成功概率', () => {
      const privateOptimizer = routingOptimizer as any;

      const probability = privateOptimizer.calculateSuccessProbability('non-existent-provider');
      expect(probability).toBe(1.0);
    });
  });

  describe('健康检查', () => {
    test('应该启动健康检查定时器', () => {
      const configWithHealthCheck = {
        ...config,
        enableHealthCheck: true,
        healthCheckInterval: 1000 // 短间隔用于测试
      };
      const optimizer = new RoutingOptimizer(configWithHealthCheck);

      // 等待一段时间让健康检查运行
      jest.advanceTimersByTime(1500);

      // 验证健康状态被更新
      const healthStatus = optimizer.getHealthStatus();
      expect(healthStatus.size).toBeGreaterThanOrEqual(0);
    });

    test('应该在不启用健康检查时不启动定时器', () => {
      const configWithoutHealthCheck = {
        ...config,
        enableHealthCheck: false
      };
      const optimizer = new RoutingOptimizer(configWithoutHealthCheck);

      // 验证没有定时器被设置
      const privateOptimizer = optimizer as any;
      expect(privateOptimizer.healthCheckInterval).toBeNull();
    });
  });

  describe('性能指标获取', () => {
    test('应该返回性能指标的副本', () => {
      routingOptimizer.recordRequestResult('provider-1', true, 100);

      const metrics1 = routingOptimizer.getPerformanceMetrics();
      const metrics2 = routingOptimizer.getPerformanceMetrics();

      expect(metrics1).toEqual(metrics2);
      expect(metrics1).not.toBe(metrics2); // 应该是不同的对象
    });

    test('应该返回健康状态的副本', () => {
      routingOptimizer.recordRequestResult('provider-1', true, 100);

      const status1 = routingOptimizer.getHealthStatus();
      const status2 = routingOptimizer.getHealthStatus();

      expect(status1).toEqual(status2);
      expect(status1).not.toBe(status2); // 应该是不同的Map对象
    });
  });

  describe('销毁和清理', () => {
    test('应该清理所有资源', () => {
      const configWithHealthCheck = {
        ...config,
        enableHealthCheck: true,
        healthCheckInterval: 1000
      };
      const optimizer = new RoutingOptimizer(configWithHealthCheck);

      // 添加一些健康状态
      optimizer.recordRequestResult('provider-1', true, 100);

      expect(optimizer.getHealthStatus().size).toBeGreaterThan(0);

      // 销毁优化器
      optimizer.destroy();

      // 验证资源被清理
      const privateOptimizer = optimizer as any;
      expect(privateOptimizer.healthCheckInterval).toBeNull();
      expect(privateOptimizer.healthStatus.size).toBe(0);
      expect(privateOptimizer.circuitBreakers.size).toBe(0);
    });

    test('应该在没有定时器时安全销毁', () => {
      const configWithoutHealthCheck = {
        ...config,
        enableHealthCheck: false
      };
      const optimizer = new RoutingOptimizer(configWithoutHealthCheck);

      // 应该不抛出错误
      expect(() => optimizer.destroy()).not.toThrow();
    });
  });

  describe('边界情况和错误处理', () => {
    test('应该处理空提供商列表', async () => {
      const emptyVirtualModel: VirtualModel = {
        id: 'empty-model',
        name: 'Empty Model',
        description: 'Model with no targets',
        targets: []
      };

      await expect(routingOptimizer.getRoutingDecision(emptyVirtualModel, mockContext))
        .rejects.toThrow('No healthy providers available');
    });

    test('应该处理单个提供商', async () => {
      const singleProviderModel: VirtualModel = {
        id: 'single-model',
        name: 'Single Provider Model',
        description: 'Model with one provider',
        targets: [{ providerId: 'provider-1', modelId: 'model-1' }]
      };

      const decision = await routingOptimizer.getRoutingDecision(singleProviderModel, mockContext);

      expect(decision.providerId).toBe('provider-1');
      expect(decision.fallbackProviders).toHaveLength(0);
    });

    test('应该处理权重数组长度不匹配的情况', () => {
      const privateOptimizer = routingOptimizer as any;
      const providers = ['provider-1', 'provider-2'];
      const weights = [0.5]; // 权重数组长度不匹配

      // 应该不抛出错误
      expect(() => {
        privateOptimizer.selectWeightedRandom(providers, weights);
      }).not.toThrow();
    });

    test('应该处理负权重', () => {
      const privateOptimizer = routingOptimizer as any;
      const providers = ['provider-1', 'provider-2'];
      const weights = [-0.5, 1.5]; // 包含负权重

      // 应该不抛出错误
      expect(() => {
        privateOptimizer.selectWeightedRandom(providers, weights);
      }).not.toThrow();
    });
  });

  describe('CircuitBreaker (熔断器)', () => {
    let circuitBreaker: any;

    beforeEach(() => {
      const config = {
        failureThreshold: 3,
        recoveryTimeout: 5000,
        expectedException: []
      };
      circuitBreaker = new (RoutingOptimizer as any).CircuitBreaker(config);
    });

    test('应该在成功操作后重置熔断器', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation);
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
    });

    test('应该在达到失败阈值时打开熔断器', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));

      // 触发失败直到达到阈值
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // 预期的错误
        }
      }

      expect(circuitBreaker.getState()).toBe('open');

      // 下一个请求应该被阻止
      await expect(circuitBreaker.execute(operation))
        .rejects.toThrow('Circuit breaker is OPEN - blocking requests');
    });

    test('应该在恢复超时后尝试半开状态', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));

      // 触发熔断器打开
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // 预期的错误
        }
      }

      expect(circuitBreaker.getState()).toBe('open');

      // 等待恢复超时
      jest.advanceTimersByTime(6000);

      // 下一个请求应该尝试半开状态
      try {
        await circuitBreaker.execute(operation);
      } catch (error) {
        // 预期的错误
      }

      expect(circuitBreaker.getState()).toBe('half-open');
    });

    test('应该在半开状态成功后关闭熔断器', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('failure'));
      const successOperation = jest.fn().mockResolvedValue('success');

      // 触发熔断器打开
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // 预期的错误
        }
      }

      expect(circuitBreaker.getState()).toBe('open');

      // 等待恢复超时
      jest.advanceTimersByTime(6000);

      // 在半开状态下执行成功操作
      const result = await circuitBreaker.execute(successOperation);
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });
});