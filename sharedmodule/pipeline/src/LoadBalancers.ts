/**
 * Load balancer strategies implementation
 */

import { PipelineConfig } from './PipelineConfig';
import { IPipelineInstance } from './PipelineInstance';
import { PipelineHealth, PipelineHealthMetrics } from './ErrorTypes';

/**
 * Load balancer strategy interface
 */
export interface LoadBalancerStrategy {
  selectInstance(instances: IPipelineInstance[]): IPipelineInstance | null;
  updateInstanceMetrics(instanceId: string, metrics: PipelineHealthMetrics): void;
  onInstanceHealthChange(instanceId: string, isHealthy: boolean): void;
  getStrategyName(): string;
  getStats(): LoadBalancerStats;
  recordRequestSuccess?(instanceId: string, responseTime: number): void;
  recordRequestFailure?(instanceId: string, responseTime: number): void;
}

/**
 * Load balancer statistics
 */
export interface LoadBalancerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  instanceStats: Map<string, InstanceStats>;
}

/**
 * Individual instance statistics
 */
export interface InstanceStats {
  requestCount: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  lastRequestTime: number;
  healthStatus: boolean;
  currentConnections: number;
}

/**
 * Round Robin load balancer
 */
export class RoundRobinLoadBalancer implements LoadBalancerStrategy {
  private currentIndex: number = 0;
  private stats: LoadBalancerStats;
  private instanceStats: Map<string, InstanceStats> = new Map();

  constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      instanceStats: this.instanceStats
    };
  }

  selectInstance(instances: IPipelineInstance[]): IPipelineInstance | null {
    const healthyInstances = instances.filter(instance => instance.isHealthy());
    
    if (healthyInstances.length === 0) {
      return null;
    }

    // Simple round robin selection
    const selectedInstance = healthyInstances[this.currentIndex % healthyInstances.length];
    this.currentIndex = (this.currentIndex + 1) % healthyInstances.length;

    // Update statistics
    this.updateStats(selectedInstance.getId());
    
    return selectedInstance;
  }

  updateInstanceMetrics(instanceId: string, metrics: PipelineHealthMetrics): void {
    let stats = this.instanceStats.get(instanceId);
    if (!stats) {
      stats = this.createInitialStats();
      this.instanceStats.set(instanceId, stats);
    }

    stats.averageResponseTime = metrics.averageResponseTime;
    stats.healthStatus = metrics.health === PipelineHealth.HEALTHY;
    
    // Update overall stats
    this.updateOverallStats();
  }

  onInstanceHealthChange(instanceId: string, isHealthy: boolean): void {
    let stats = this.instanceStats.get(instanceId);
    if (!stats) {
      stats = this.createInitialStats();
      this.instanceStats.set(instanceId, stats);
    }

    stats.healthStatus = isHealthy;
  }

  getStrategyName(): string {
    return 'roundrobin';
  }

  getStats(): LoadBalancerStats {
    return { ...this.stats };
  }

  private updateStats(instanceId: string): void {
    this.stats.totalRequests++;
    
    let stats = this.instanceStats.get(instanceId);
    if (!stats) {
      stats = this.createInitialStats();
      this.instanceStats.set(instanceId, stats);
    }

    stats.requestCount++;
    stats.lastRequestTime = Date.now();
    stats.currentConnections++;
  }

  private updateOverallStats(): void {
    let totalResponseTime = 0;
    let totalRequests = 0;

    for (const stats of this.instanceStats.values()) {
      totalResponseTime += stats.averageResponseTime * stats.requestCount;
      totalRequests += stats.requestCount;
    }

    this.stats.averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
  }

  private createInitialStats(): InstanceStats {
    return {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      lastRequestTime: 0,
      healthStatus: true,
      currentConnections: 0
    };
  }

  public recordRequestSuccess(instanceId: string, responseTime: number): void {
    const stats = this.instanceStats.get(instanceId);
    if (stats) {
      stats.successCount++;
      stats.currentConnections--;
      
      // Update average response time
      const alpha = 0.1; // smoothing factor
      stats.averageResponseTime = (alpha * responseTime) + ((1 - alpha) * stats.averageResponseTime);
      
      this.stats.successfulRequests++;
      this.updateOverallStats();
    }
  }

  public recordRequestFailure(instanceId: string, responseTime: number): void {
    const stats = this.instanceStats.get(instanceId);
    if (stats) {
      stats.failureCount++;
      stats.currentConnections--;
      
      // Update average response time
      const alpha = 0.1; // smoothing factor
      stats.averageResponseTime = (alpha * responseTime) + ((1 - alpha) * stats.averageResponseTime);
      
      this.stats.failedRequests++;
      this.updateOverallStats();
    }
  }
}

/**
 * Weighted Round Robin load balancer
 */
export class WeightedRoundRobinLoadBalancer implements LoadBalancerStrategy {
  private currentWeights: Map<string, number> = new Map();
  private stats: LoadBalancerStats;
  private instanceStats: Map<string, InstanceStats> = new Map();

  constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      instanceStats: this.instanceStats
    };
  }

  selectInstance(instances: IPipelineInstance[]): IPipelineInstance | null {
    const healthyInstances = instances.filter(instance => instance.isHealthy());
    
    if (healthyInstances.length === 0) {
      return null;
    }

    // Initialize current weights for new instances
    for (const instance of healthyInstances) {
      const instanceId = instance.getId();
      if (!this.currentWeights.has(instanceId)) {
        this.currentWeights.set(instanceId, 0);
      }
    }

    // Calculate effective weights (considering health and current connections)
    let bestInstance: IPipelineInstance | null = null;
    let bestWeight = -1;

    for (const instance of healthyInstances) {
      const instanceId = instance.getId();
      const config = instance.getConfig();
      const baseWeight = config.weight || 1;
      
      // Adjust weight based on health and current load
      const healthFactor = instance.getHealthMetrics().health === PipelineHealth.HEALTHY ? 1 : 0.5;
      const currentLoad = this.instanceStats.get(instanceId)?.currentConnections || 0;
      const loadFactor = Math.max(0.1, 1 - (currentLoad / 10)); // Reduce weight with high load
      
      const effectiveWeight = baseWeight * healthFactor * loadFactor;
      const currentWeight = this.currentWeights.get(instanceId) || 0;
      const newWeight = currentWeight + effectiveWeight;

      this.currentWeights.set(instanceId, newWeight);

      if (newWeight > bestWeight) {
        bestWeight = newWeight;
        bestInstance = instance;
      }
    }

    // Decrease the selected instance's weight
    if (bestInstance) {
      const bestInstanceId = bestInstance.getId();
      const config = bestInstance.getConfig();
      const baseWeight = config.weight || 1;
      this.currentWeights.set(bestInstanceId, bestWeight - baseWeight);
      
      // Update statistics
      this.updateStats(bestInstanceId);
    }

    return bestInstance;
  }

  updateInstanceMetrics(instanceId: string, metrics: PipelineHealthMetrics): void {
    let stats = this.instanceStats.get(instanceId);
    if (!stats) {
      stats = this.createInitialStats();
      this.instanceStats.set(instanceId, stats);
    }

    stats.averageResponseTime = metrics.averageResponseTime;
    stats.healthStatus = metrics.health === PipelineHealth.HEALTHY;
    
    this.updateOverallStats();
  }

  onInstanceHealthChange(instanceId: string, isHealthy: boolean): void {
    let stats = this.instanceStats.get(instanceId);
    if (!stats) {
      stats = this.createInitialStats();
      this.instanceStats.set(instanceId, stats);
    }

    stats.healthStatus = isHealthy;
  }

  getStrategyName(): string {
    return 'weighted';
  }

  getStats(): LoadBalancerStats {
    return { ...this.stats };
  }

  private updateStats(instanceId: string): void {
    this.stats.totalRequests++;
    
    let stats = this.instanceStats.get(instanceId);
    if (!stats) {
      stats = this.createInitialStats();
      this.instanceStats.set(instanceId, stats);
    }

    stats.requestCount++;
    stats.lastRequestTime = Date.now();
    stats.currentConnections++;
  }

  private updateOverallStats(): void {
    let totalResponseTime = 0;
    let totalRequests = 0;

    for (const stats of this.instanceStats.values()) {
      totalResponseTime += stats.averageResponseTime * stats.requestCount;
      totalRequests += stats.requestCount;
    }

    this.stats.averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
  }

  private createInitialStats(): InstanceStats {
    return {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      lastRequestTime: 0,
      healthStatus: true,
      currentConnections: 0
    };
  }

  public recordRequestSuccess(instanceId: string, responseTime: number): void {
    const stats = this.instanceStats.get(instanceId);
    if (stats) {
      stats.successCount++;
      stats.currentConnections--;
      
      const alpha = 0.1;
      stats.averageResponseTime = (alpha * responseTime) + ((1 - alpha) * stats.averageResponseTime);
      
      this.stats.successfulRequests++;
      this.updateOverallStats();
    }
  }

  public recordRequestFailure(instanceId: string, responseTime: number): void {
    const stats = this.instanceStats.get(instanceId);
    if (stats) {
      stats.failureCount++;
      stats.currentConnections--;
      
      const alpha = 0.1;
      stats.averageResponseTime = (alpha * responseTime) + ((1 - alpha) * stats.averageResponseTime);
      
      this.stats.failedRequests++;
      this.updateOverallStats();
    }
  }
}

/**
 * Least Connections load balancer
 */
export class LeastConnectionsLoadBalancer implements LoadBalancerStrategy {
  private stats: LoadBalancerStats;
  private instanceStats: Map<string, InstanceStats> = new Map();

  constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      instanceStats: this.instanceStats
    };
  }

  selectInstance(instances: IPipelineInstance[]): IPipelineInstance | null {
    const healthyInstances = instances.filter(instance => instance.isHealthy());
    
    if (healthyInstances.length === 0) {
      return null;
    }

    // Select instance with least connections
    let bestInstance: IPipelineInstance | null = null;
    let leastConnections = Infinity;

    for (const instance of healthyInstances) {
      const instanceId = instance.getId();
      const stats = this.instanceStats.get(instanceId) || this.createInitialStats();
      
      if (stats.currentConnections < leastConnections) {
        leastConnections = stats.currentConnections;
        bestInstance = instance;
      }
    }

    if (bestInstance) {
      this.updateStats(bestInstance.getId());
    }

    return bestInstance;
  }

  updateInstanceMetrics(instanceId: string, metrics: PipelineHealthMetrics): void {
    let stats = this.instanceStats.get(instanceId);
    if (!stats) {
      stats = this.createInitialStats();
      this.instanceStats.set(instanceId, stats);
    }

    stats.averageResponseTime = metrics.averageResponseTime;
    stats.healthStatus = metrics.health === PipelineHealth.HEALTHY;
    
    this.updateOverallStats();
  }

  onInstanceHealthChange(instanceId: string, isHealthy: boolean): void {
    let stats = this.instanceStats.get(instanceId);
    if (!stats) {
      stats = this.createInitialStats();
      this.instanceStats.set(instanceId, stats);
    }

    stats.healthStatus = isHealthy;
  }

  getStrategyName(): string {
    return 'least_connections';
  }

  getStats(): LoadBalancerStats {
    return { ...this.stats };
  }

  private updateStats(instanceId: string): void {
    this.stats.totalRequests++;
    
    let stats = this.instanceStats.get(instanceId);
    if (!stats) {
      stats = this.createInitialStats();
      this.instanceStats.set(instanceId, stats);
    }

    stats.requestCount++;
    stats.lastRequestTime = Date.now();
    stats.currentConnections++;
  }

  private updateOverallStats(): void {
    let totalResponseTime = 0;
    let totalRequests = 0;

    for (const stats of this.instanceStats.values()) {
      totalResponseTime += stats.averageResponseTime * stats.requestCount;
      totalRequests += stats.requestCount;
    }

    this.stats.averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
  }

  private createInitialStats(): InstanceStats {
    return {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      lastRequestTime: 0,
      healthStatus: true,
      currentConnections: 0
    };
  }

  public recordRequestSuccess(instanceId: string, responseTime: number): void {
    const stats = this.instanceStats.get(instanceId);
    if (stats) {
      stats.successCount++;
      stats.currentConnections--;
      
      const alpha = 0.1;
      stats.averageResponseTime = (alpha * responseTime) + ((1 - alpha) * stats.averageResponseTime);
      
      this.stats.successfulRequests++;
      this.updateOverallStats();
    }
  }

  public recordRequestFailure(instanceId: string, responseTime: number): void {
    const stats = this.instanceStats.get(instanceId);
    if (stats) {
      stats.failureCount++;
      stats.currentConnections--;
      
      const alpha = 0.1;
      stats.averageResponseTime = (alpha * responseTime) + ((1 - alpha) * stats.averageResponseTime);
      
      this.stats.failedRequests++;
      this.updateOverallStats();
    }
  }
}

/**
 * Random load balancer
 */
export class RandomLoadBalancer implements LoadBalancerStrategy {
  private stats: LoadBalancerStats;
  private instanceStats: Map<string, InstanceStats> = new Map();

  constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      instanceStats: this.instanceStats
    };
  }

  selectInstance(instances: IPipelineInstance[]): IPipelineInstance | null {
    const healthyInstances = instances.filter(instance => instance.isHealthy());
    
    if (healthyInstances.length === 0) {
      return null;
    }

    // Select random instance
    const randomIndex = Math.floor(Math.random() * healthyInstances.length);
    const selectedInstance = healthyInstances[randomIndex];

    // Update statistics
    this.updateStats(selectedInstance.getId());
    
    return selectedInstance;
  }

  updateInstanceMetrics(instanceId: string, metrics: PipelineHealthMetrics): void {
    let stats = this.instanceStats.get(instanceId);
    if (!stats) {
      stats = this.createInitialStats();
      this.instanceStats.set(instanceId, stats);
    }

    stats.averageResponseTime = metrics.averageResponseTime;
    stats.healthStatus = metrics.health === PipelineHealth.HEALTHY;
    
    this.updateOverallStats();
  }

  onInstanceHealthChange(instanceId: string, isHealthy: boolean): void {
    let stats = this.instanceStats.get(instanceId);
    if (!stats) {
      stats = this.createInitialStats();
      this.instanceStats.set(instanceId, stats);
    }

    stats.healthStatus = isHealthy;
  }

  getStrategyName(): string {
    return 'random';
  }

  getStats(): LoadBalancerStats {
    return { ...this.stats };
  }

  private updateStats(instanceId: string): void {
    this.stats.totalRequests++;
    
    let stats = this.instanceStats.get(instanceId);
    if (!stats) {
      stats = this.createInitialStats();
      this.instanceStats.set(instanceId, stats);
    }

    stats.requestCount++;
    stats.lastRequestTime = Date.now();
    stats.currentConnections++;
  }

  private updateOverallStats(): void {
    let totalResponseTime = 0;
    let totalRequests = 0;

    for (const stats of this.instanceStats.values()) {
      totalResponseTime += stats.averageResponseTime * stats.requestCount;
      totalRequests += stats.requestCount;
    }

    this.stats.averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
  }

  private createInitialStats(): InstanceStats {
    return {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      lastRequestTime: 0,
      healthStatus: true,
      currentConnections: 0
    };
  }

  public recordRequestSuccess(instanceId: string, responseTime: number): void {
    const stats = this.instanceStats.get(instanceId);
    if (stats) {
      stats.successCount++;
      stats.currentConnections--;
      
      const alpha = 0.1;
      stats.averageResponseTime = (alpha * responseTime) + ((1 - alpha) * stats.averageResponseTime);
      
      this.stats.successfulRequests++;
      this.updateOverallStats();
    }
  }

  public recordRequestFailure(instanceId: string, responseTime: number): void {
    const stats = this.instanceStats.get(instanceId);
    if (stats) {
      stats.failureCount++;
      stats.currentConnections--;
      
      const alpha = 0.1;
      stats.averageResponseTime = (alpha * responseTime) + ((1 - alpha) * stats.averageResponseTime);
      
      this.stats.failedRequests++;
      this.updateOverallStats();
    }
  }
}

/**
 * Load balancer factory
 */
export class LoadBalancerFactory {
  static create(strategy: string): LoadBalancerStrategy {
    switch (strategy.toLowerCase()) {
      case 'roundrobin':
        return new RoundRobinLoadBalancer();
      case 'weighted':
        return new WeightedRoundRobinLoadBalancer();
      case 'least_connections':
        return new LeastConnectionsLoadBalancer();
      case 'random':
        return new RandomLoadBalancer();
      default:
        throw new Error(`Unknown load balancer strategy: ${strategy}`);
    }
  }
}