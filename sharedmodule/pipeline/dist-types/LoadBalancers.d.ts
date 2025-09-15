/**
 * Load balancer strategies implementation
 */
import { IPipelineInstance } from './PipelineInstance';
import { PipelineHealthMetrics } from './ErrorTypes';
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
export declare class RoundRobinLoadBalancer implements LoadBalancerStrategy {
    private currentIndex;
    private stats;
    private instanceStats;
    constructor();
    selectInstance(instances: IPipelineInstance[]): IPipelineInstance | null;
    updateInstanceMetrics(instanceId: string, metrics: PipelineHealthMetrics): void;
    onInstanceHealthChange(instanceId: string, isHealthy: boolean): void;
    getStrategyName(): string;
    getStats(): LoadBalancerStats;
    private updateStats;
    private updateOverallStats;
    private createInitialStats;
    recordRequestSuccess(instanceId: string, responseTime: number): void;
    recordRequestFailure(instanceId: string, responseTime: number): void;
}
/**
 * Weighted Round Robin load balancer
 */
export declare class WeightedRoundRobinLoadBalancer implements LoadBalancerStrategy {
    private currentWeights;
    private stats;
    private instanceStats;
    constructor();
    selectInstance(instances: IPipelineInstance[]): IPipelineInstance | null;
    updateInstanceMetrics(instanceId: string, metrics: PipelineHealthMetrics): void;
    onInstanceHealthChange(instanceId: string, isHealthy: boolean): void;
    getStrategyName(): string;
    getStats(): LoadBalancerStats;
    private updateStats;
    private updateOverallStats;
    private createInitialStats;
    recordRequestSuccess(instanceId: string, responseTime: number): void;
    recordRequestFailure(instanceId: string, responseTime: number): void;
}
/**
 * Least Connections load balancer
 */
export declare class LeastConnectionsLoadBalancer implements LoadBalancerStrategy {
    private stats;
    private instanceStats;
    constructor();
    selectInstance(instances: IPipelineInstance[]): IPipelineInstance | null;
    updateInstanceMetrics(instanceId: string, metrics: PipelineHealthMetrics): void;
    onInstanceHealthChange(instanceId: string, isHealthy: boolean): void;
    getStrategyName(): string;
    getStats(): LoadBalancerStats;
    private updateStats;
    private updateOverallStats;
    private createInitialStats;
    recordRequestSuccess(instanceId: string, responseTime: number): void;
    recordRequestFailure(instanceId: string, responseTime: number): void;
}
/**
 * Random load balancer
 */
export declare class RandomLoadBalancer implements LoadBalancerStrategy {
    private stats;
    private instanceStats;
    constructor();
    selectInstance(instances: IPipelineInstance[]): IPipelineInstance | null;
    updateInstanceMetrics(instanceId: string, metrics: PipelineHealthMetrics): void;
    onInstanceHealthChange(instanceId: string, isHealthy: boolean): void;
    getStrategyName(): string;
    getStats(): LoadBalancerStats;
    private updateStats;
    private updateOverallStats;
    private createInitialStats;
    recordRequestSuccess(instanceId: string, responseTime: number): void;
    recordRequestFailure(instanceId: string, responseTime: number): void;
}
/**
 * Load balancer factory
 */
export declare class LoadBalancerFactory {
    static create(strategy: string): LoadBalancerStrategy;
}
//# sourceMappingURL=LoadBalancers.d.ts.map