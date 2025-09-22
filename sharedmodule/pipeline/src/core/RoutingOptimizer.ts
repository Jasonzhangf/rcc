/**
 * RCC Pipeline Routing Optimizer
 *
 * 路由优化组件，提供智能路由决策、负载均衡、健康检查等功能
 */

import {
  RoutingDecision,
  RoutingOptimizationConfig,
  DynamicRouting,
  PerformanceMetrics,
  PipelineExecutionContext,
  ProviderInfo
} from '../interfaces/ModularInterfaces';
import { v4 as uuidv4 } from 'uuid';

/**
 * 提供商健康状态
 */
interface ProviderHealth {
  providerId: string;
  isHealthy: boolean;
  lastHealthCheck: number;
  responseTime: number;
  errorRate: number;
  consecutiveFailures: number;
  lastUsed: number;
  totalRequests: number;
  totalFailures: number;
  averageResponseTime: number;
}

/**
 * 路由策略
 */
type RoutingStrategy = 'round-robin' | 'weighted-random' | 'least-latency' | 'least-connections' | 'health-aware';

/**
 * 熔断器状态
 */
enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

/**
 * 熔断器配置
 */
interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  expectedException: any[];
}

/**
 * 熔断器实例
 */
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN - blocking requests');
      }
      this.state = CircuitBreakerState.HALF_OPEN;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = CircuitBreakerState.CLOSED;
  }

  private onFailure(error: any): void {
    this.failures++;
    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.lastFailureTime = Date.now();
      this.nextAttemptTime = this.lastFailureTime + this.config.recoveryTimeout;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }
}

/**
 * 路由优化器类
 */
export class RoutingOptimizer {
  private healthStatus: Map<string, ProviderHealth> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private performanceMetrics: PerformanceMetrics;
  private requestRoundRobin: Map<string, number> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(private config: RoutingOptimizationConfig) {
    this.performanceMetrics = this.initializeMetrics();
    this.initializeHealthChecks();
  }

  /**
   * 初始化性能指标
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      lastRequestTime: 0,
      providerStats: {},
      moduleStats: {}
    };
  }

  /**
   * 初始化健康检查
   */
  private initializeHealthChecks(): void {
    if (this.config.enableHealthCheck) {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthChecks();
      }, this.config.healthCheckInterval);
    }
  }

  /**
   * 执行健康检查
   */
  private async performHealthChecks(): Promise<void> {
    // 这里应该集成实际的Provider健康检查逻辑
    // 暂时使用模拟逻辑
    for (const [providerId, health] of this.healthStatus) {
      try {
        const responseTime = Math.random() * 1000; // 模拟响应时间
        const isHealthy = responseTime < 500; // 模拟健康检查

        this.updateProviderHealth(providerId, {
          isHealthy,
          responseTime,
          lastHealthCheck: Date.now()
        });
      } catch (error) {
        this.updateProviderHealth(providerId, {
          isHealthy: false,
          responseTime: 0,
          lastHealthCheck: Date.now()
        });
      }
    }
  }

  /**
   * 更新提供商健康状态
   */
  private updateProviderHealth(providerId: string, updates: Partial<ProviderHealth>): void {
    const current = this.healthStatus.get(providerId) || {
      providerId,
      isHealthy: true,
      lastHealthCheck: 0,
      responseTime: 0,
      errorRate: 0,
      consecutiveFailures: 0,
      lastUsed: 0,
      totalRequests: 0,
      totalFailures: 0,
      averageResponseTime: 0
    };

    this.healthStatus.set(providerId, { ...current, ...updates });
  }

  /**
   * 获取路由决策
   */
  async getRoutingDecision(
    dynamicRouting: DynamicRouting,
    context?: Partial<PipelineExecutionContext>
  ): Promise<RoutingDecision> {
    const targetProviders = dynamicRouting.targets.map(target => target.providerId);

    // 基于健康状态筛选可用提供商
    const availableProviders = targetProviders.filter(providerId => {
      const health = this.healthStatus.get(providerId);
      return !health || health.isHealthy;
    });

    if (availableProviders.length === 0) {
      throw new Error('No healthy providers available');
    }

    // 选择路由策略
    const strategy = this.selectRoutingStrategy(availableProviders, context);
    const selectedProvider = this.selectProvider(availableProviders, strategy);

    // 创建路由决策
    const decision: RoutingDecision = {
      providerId: selectedProvider,
      strategy: strategy.name,
      fallbackProviders: availableProviders.filter(p => p !== selectedProvider),
      estimatedLatency: this.estimateLatency(selectedProvider),
      successProbability: this.calculateSuccessProbability(selectedProvider),
      metadata: {
        loadBalanceInfo: strategy.metadata,
        healthScore: this.getHealthScore(selectedProvider)
      }
    };

    return decision;
  }

  /**
   * 选择路由策略
   */
  private selectRoutingStrategy(
    providers: string[],
    context?: Partial<PipelineExecutionContext>
  ): { name: RoutingStrategy; metadata: any } {
    if (!this.config.enableLoadBalancing) {
      return { name: 'round-robin', metadata: {} };
    }

    // 基于上下文和当前状态选择策略
    const healthScores = providers.map(p => this.getHealthScore(p));
    const avgHealthScore = healthScores.reduce((a, b) => a + b, 0) / healthScores.length;

    if (avgHealthScore < 0.5) {
      return { name: 'health-aware', metadata: { healthScores } };
    }

    const latencyVariance = this.getLatencyVariance(providers);
    if (latencyVariance > 100) {
      return { name: 'least-latency', metadata: { variance: latencyVariance } };
    }

    return { name: 'weighted-random', metadata: { weights: this.getProviderWeights(providers) } };
  }

  /**
   * 选择提供商
   */
  private selectProvider(providers: string[], strategy: { name: RoutingStrategy; metadata: any }): string {
    switch (strategy.name) {
      case 'round-robin':
        return this.selectRoundRobin(providers);

      case 'weighted-random':
        return this.selectWeightedRandom(providers, strategy.metadata.weights);

      case 'least-latency':
        return this.selectLeastLatency(providers);

      case 'least-connections':
        return this.selectLeastConnections(providers);

      case 'health-aware':
        return this.selectHealthAware(providers);

      default:
        return providers[0];
    }
  }

  /**
   * 轮询选择
   */
  private selectRoundRobin(providers: string[]): string {
    const key = providers.join(',');
    const index = (this.requestRoundRobin.get(key) || 0) % providers.length;
    this.requestRoundRobin.set(key, index + 1);
    return providers[index];
  }

  /**
   * 加权随机选择
   */
  private selectWeightedRandom(providers: string[], weights: number[]): string {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < providers.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return providers[i];
      }
    }

    return providers[providers.length - 1];
  }

  /**
   * 最低延迟选择
   */
  private selectLeastLatency(providers: string[]): string {
    return providers.reduce((best, current) => {
      const bestLatency = this.estimateLatency(best);
      const currentLatency = this.estimateLatency(current);
      return currentLatency < bestLatency ? current : best;
    });
  }

  /**
   * 最少连接选择
   */
  private selectLeastConnections(providers: string[]): string {
    return providers.reduce((best, current) => {
      const bestHealth = this.healthStatus.get(best);
      const currentHealth = this.healthStatus.get(current);

      const bestConnections = bestHealth?.totalRequests || 0;
      const currentConnections = currentHealth?.totalRequests || 0;

      return currentConnections < bestConnections ? current : best;
    });
  }

  /**
   * 健康感知选择
   */
  private selectHealthAware(providers: string[]): string {
    return providers.reduce((best, current) => {
      const bestScore = this.getHealthScore(best);
      const currentScore = this.getHealthScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * 估计延迟
   */
  private estimateLatency(providerId: string): number {
    const health = this.healthStatus.get(providerId);
    return health?.averageResponseTime || 0;
  }

  /**
   * 计算成功概率
   */
  private calculateSuccessProbability(providerId: string): number {
    const health = this.healthStatus.get(providerId);
    if (!health) return 1.0;

    return 1.0 - (health.errorRate || 0);
  }

  /**
   * 获取健康分数
   */
  private getHealthScore(providerId: string): number {
    const health = this.healthStatus.get(providerId);
    if (!health) return 1.0;

    let score = 0;

    // 健康状态 (40%)
    score += health.isHealthy ? 0.4 : 0;

    // 响应时间 (30%)
    const latencyScore = Math.max(0, 1 - health.responseTime / 1000);
    score += latencyScore * 0.3;

    // 错误率 (30%)
    const errorScore = 1 - (health.errorRate || 0);
    score += errorScore * 0.3;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 获取延迟方差
   */
  private getLatencyVariance(providers: string[]): number {
    const latencies = providers.map(p => this.estimateLatency(p));
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const variance = latencies.reduce((sum, latency) => sum + Math.pow(latency - avg, 2), 0) / latencies.length;
    return Math.sqrt(variance);
  }

  /**
   * 获取提供商权重
   */
  private getProviderWeights(providers: string[]): number[] {
    return providers.map(provider => {
      const health = this.healthStatus.get(provider);
      return health?.isHealthy ? 1 : 0.1;
    });
  }

  /**
   * 记录请求结果
   */
  recordRequestResult(providerId: string, success: boolean, responseTime: number): void {
    const health = this.healthStatus.get(providerId);
    if (health) {
      health.totalRequests++;
      if (!success) {
        health.totalFailures++;
      }
      health.averageResponseTime =
        (health.averageResponseTime * (health.totalRequests - 1) + responseTime) / health.totalRequests;
      health.errorRate = health.totalFailures / health.totalRequests;
      health.lastUsed = Date.now();
    }

    // 更新全局指标
    this.performanceMetrics.totalRequests++;
    if (success) {
      this.performanceMetrics.successfulRequests++;
    } else {
      this.performanceMetrics.failedRequests++;
    }

    // 更新平均响应时间
    const totalRequests = this.performanceMetrics.totalRequests;
    const currentAvg = this.performanceMetrics.averageResponseTime;
    this.performanceMetrics.averageResponseTime =
      (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;

    this.performanceMetrics.minResponseTime =
      Math.min(this.performanceMetrics.minResponseTime, responseTime);
    this.performanceMetrics.maxResponseTime =
      Math.max(this.performanceMetrics.maxResponseTime, responseTime);
    this.performanceMetrics.lastRequestTime = Date.now();
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * 获取健康状态
   */
  getHealthStatus(): Map<string, ProviderHealth> {
    return new Map(this.healthStatus);
  }

  /**
   * 销毁路由优化器
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.healthStatus.clear();
    this.circuitBreakers.clear();
  }
}