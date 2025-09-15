/**
 * Virtual Model Router Node
 *
 * This enhanced node provides intelligent routing for virtual models within the RCC system,
 * supporting multiple routing strategies, priority-based selection, and fallback mechanisms.
 */

import { BasePipelineNode } from 'webauto-pipelineframework';

/**
 * Virtual model routing configuration
 */
export interface VirtualModelRoutingConfig {
  virtualModelId: string;
  strategy: 'priority' | 'roundRobin' | 'weighted' | 'leastLatency';
  targets: Array<{
    providerId: string;
    modelId: string;
    weight?: number;
    priority?: number;
    endpoint?: string;
    healthScore?: number;
  }>;
  fallbackEnabled: boolean;
  circuitBreakerEnabled: boolean;
  timeout?: number;
  healthCheckInterval?: number;
}

/**
 * Routing result information
 */
export interface RoutingResult {
  success: boolean;
  selectedTarget?: {
    providerId: string;
    modelId: string;
    endpoint: string;
  };
  alternativeTargets?: Array<{
    providerId: string;
    modelId: string;
    endpoint: string;
  }>;
  routingTime: number;
  strategy: string;
  error?: string;
}

/**
 * Virtual Model Router Node
 */
export class VirtualModelRouterNode extends BasePipelineNode {
  private config: VirtualModelRoutingConfig;
  private targetStates: Map<string, any> = new Map();
  private routingStats: Map<string, any> = new Map();
  private healthMonitor: NodeJS.Timeout | null = null;

  constructor(config: Partial<VirtualModelRoutingConfig> = {}) {
    const defaultConfig: VirtualModelRoutingConfig = {
      virtualModelId: 'default-virtual-model',
      strategy: 'priority',
      targets: [],
      fallbackEnabled: true,
      circuitBreakerEnabled: true,
      timeout: 30000,
      healthCheckInterval: 60000
    };

    super({
      ...config,
      type: 'virtual-model-router'
    });

    this.config = { ...defaultConfig, ...config };
    this.initializeTargetStates();

    console.log(`VirtualModelRouterNode initialized for ${this.config.virtualModelId} with strategy: ${this.config.strategy}`);

    // Start health monitoring
    this.startHealthMonitoring();
  }

  async handleProcess(inputData): Promise<any> {
    console.log(`Routing request for virtual model: ${this.config.virtualModelId}`);

    const startTime = Date.now();

    try {
      // Perform routing selection
      const routingResult = await this.selectTarget(inputData);

      if (!routingResult.success) {
        console.error(`Routing failed: ${routingResult.error}`);
        throw new Error(routingResult.error);
      }

      const routingTime = Date.now() - startTime;

      // Update routing statistics
      this.updateRoutingStats(routingResult, routingTime);

      // Prepare route data
      const routeData = {
        ...inputData,
        routing: {
          selectedTarget: routingResult.selectedTarget,
          alternativeTargets: routingResult.alternativeTargets,
          strategy: this.config.strategy,
          virtualModelId: this.config.virtualModelId,
          routingTime
        }
      };

      // Execute the next node with routing information
      const result = await this.executeNext(routeData);

      return {
        ...result,
        routing: {
          ...routeData.routing,
          success: true
        }
      };

    } catch (error) {
      console.error(`Virtual model routing failed: ${error.message}`);

      // Try fallback routing if enabled
      if (this.config.fallbackEnabled) {
        const fallbackResult = await this.tryFallbackRouting(inputData);

        if (fallbackResult.success) {
          return {
            ...fallbackResult.data,
            routing: {
              selectedTarget: fallbackResult.selectedTarget,
              strategy: this.config.strategy,
              virtualModelId: this.config.virtualModelId,
              fallback: true,
              routingTime: Date.now() - startTime
            }
          };
        }
      }

      throw new Error(`Virtual model routing failed after all attempts: ${error.message}`);
    }
  }

  private async selectTarget(inputData: any): Promise<RoutingResult> {
    const availableTargets = this.getAvailableTargets();

    if (availableTargets.length === 0) {
      return {
        success: false,
        error: 'No available targets for routing',
        routingTime: 0,
        strategy: this.config.strategy
      };
    }

    let selectedTarget: { providerId: string; modelId: string; endpoint: string; } | null = null;
    const alternativeTargets = availableTargets.slice(0, 2); // Top 2 alternatives

    switch (this.config.strategy) {
      case 'priority':
        selectedTarget = this.selectByPriority(availableTargets, inputData);
        break;

      case 'roundRobin':
        selectedTarget = this.selectByRoundRobin(availableTargets, inputData);
        break;

      case 'weighted':
        selectedTarget = this.selectByWeightedRoundRobin(availableTargets, inputData);
        break;

      case 'leastLatency':
        selectedTarget = this.selectByLeastLatency(availableTargets, inputData);
        break;

      default:
        throw new Error(`Unsupported routing strategy: ${this.config.strategy}`);
    }

    return {
      success: true,
      selectedTarget: selectedTarget!,
      alternativeTargets,
      routingTime: 0,
      strategy: this.config.strategy
    };
  }

  private selectByPriority(targets: any[], inputData: any): any {
    // Sort by priority (highest first) and return the top priority target
    return targets.sort((a, b) => (b.priority || 1) - (a.priority || 1))[0];
  }

  private selectByRoundRobin(targets: any[], inputData: any): any {
    const virtualModelId = this.config.virtualModelId;
    const state = this.targetStates.get(`roundRobin-${virtualModelId}`) || { index: 0 };

    const selected = targets[state.index % targets.length];

    // Update state
    state.index = (state.index + 1) % targets.length;
    this.targetStates.set(`roundRobin-${virtualModelId}`, state);

    return selected;
  }

  private selectByWeightedRoundRobin(targets: any[], inputData: any): any {
    const virtualModelId = this.config.virtualModelId;
    const state = this.targetStates.get(`weighted-${virtualModelId}`) || { current: 0 };

    const totalWeight = targets.reduce((sum, target) => sum + (target.weight || 1), 0);
    let random = Math.random() * totalWeight;
    let selected = targets[0];

    for (const target of targets) {
      const weight = target.weight || 1;
      random -= weight;
      if (random <= 0) {
        selected = target;
        break;
      }
    }

    // Update state
    state.current = targets.indexOf(selected);
    this.targetStates.set(`weighted-${virtualModelId}`, state);

    return selected;
  }

  private selectByLeastLatency(targets: any[], inputData: any): any {
    // fallback to selection by health score if latency data is not available
    return targets.sort((a, b) => (b.healthScore || 50) - (a.healthScore || 50))[0];
  }

  private getAvailableTargets(): any[] {
    return this.config.targets.filter(target => {
      const state = this.targetStates.get(target.providerId);
      return state && state.isHealthy && !state.circuitBreakerOpen;
    });
  }

  private initializeTargetStates(): void {
    for (const target of this.config.targets) {
      if (!this.targetStates.has(target.providerId)) {
        this.targetStates.set(target.providerId, {
          isHealthy: true,
          healthScore: 100,
          lastHealthCheck: 0,
          errorCount: 0,
          averageLatency: 0,
          requestCount: 0,
          circuitBreakerOpen: false,
          circuitBreakerTripped: 0
        });
      }
    }

    // Initialize strategy-specific states
    if (!this.targetStates.has(`roundRobin-${this.config.virtualModelId}`)) {
      this.targetStates.set(`roundRobin-${this.config.virtualModelId}`, { index: 0 });
    }

    if (!this.targetStates.has(`weighted-${this.config.virtualModelId}`)) {
      this.targetStates.set(`weighted-${this.config.virtualModelId}`, { current: 0 });
    }
  }

  private async tryFallbackRouting(inputData: any): Promise<{
    success: boolean;
    data?: any;
    selectedTarget?: any;
  }> {
    console.log('Attempting fallback routing');

    // Try all available targets one by one
    const availableTargets = this.getAvailableTargets();

    for (const target of availableTargets) {
      try {
        console.log(`Trying fallback to ${target.providerId}:${target.modelId}`);

        const fallbackData = {
          ...inputData,
          routing: {
            selectedTarget: target,
            strategy: 'fallback',
            virtualModelId: this.config.virtualModelId
          }
        };

        // Attempt to execute with fallback target
        const result = await this.executeNext(fallbackData);

        return {
          success: true,
          data: result,
          selectedTarget: target
        };

      } catch (error) {
        console.log(`Fallback to ${target.providerId}:${target.modelId} failed: ${error.message}`);
        continue;
      }
    }

    console.log('All fallback attempts failed');
    return { success: false };
  }

  private updateRoutingStats(routingResult: RoutingResult, routingTime: number): void {
    if (!routingResult.selectedTarget) return;

    const key = `${this.config.virtualModelId}-${routingResult.selectedTarget.providerId}`;
    let stats = this.routingStats.get(key) || {
      requestCount: 0,
      totalRoutingTime: 0,
      averageRoutingTime: 0,
      errorCount: 0,
      lastUsed: 0
    };

    stats.requestCount++;
    stats.totalRoutingTime += routingTime;
    stats.averageRoutingTime = stats.totalRoutingTime / stats.requestCount;
    stats.lastUsed = Date.now();

    this.routingStats.set(key, stats);

    // Update provider state
    const providerState = this.targetStates.get(routingResult.selectedTarget.providerId);
    if (providerState) {
      providerState.requestCount++;
    }
  }

  private async performHealthCheck(target: any): Promise<boolean> {
    try {
      // Simulate health check - in real implementation, this would ping the actual endpoint
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = this.targetStates.get(target.providerId);
      if (!state) return false;

      // Update health score based on recent performance
      const healthScore = this.calculateHealthScore(state);
      state.healthScore = healthScore;
      state.lastHealthCheck = Date.now();

      // Reset error count if healthy
      if (healthScore > 80) {
        state.errorCount = 0;
      }

      return healthScore > 50;

    } catch (error) {
      console.error(`Health check failed for ${target.providerId}: ${error.message}`);
      return false;
    }
  }

  private calculateHealthScore(state: any): number {
    let score = 100;

    // Penalize for errors
    score -= Math.min(state.errorCount * 10, 50);

    // Adjust based on latency
    if (state.averageLatency > 1000) {
      score -= Math.min(Math.floor(state.averageLatency / 1000) * 5, 25);
    }

    // Circuit breaker penalty
    if (state.circuitBreakerOpen) {
      score -= 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  private startHealthMonitoring(): void {
    if (!this.config.healthCheckInterval || this.config.healthCheckInterval <= 0) {
      return;
    }

    this.healthMonitor = setInterval(async () => {
      for (const target of this.config.targets) {
        try {
          const isHealthy = await this.performHealthCheck(target);
          const state = this.targetStates.get(target.providerId);
          if (state) {
            state.isHealthy = isHealthy;

            // Handle circuit breaker logic
            if (this.config.circuitBreakerEnabled) {
              this.handleCircuitBreaker(state, target.providerId);
            }
          }
        } catch (error) {
          console.error(`Health monitoring failed for ${target.providerId}: ${error.message}`);
        }
      }
    }, this.config.healthCheckInterval);

    console.log(`Health monitoring started for ${this.config.virtualModelId}`);
  }

  private handleCircuitBreaker(state: any, providerId: string): void {
    // Open circuit breaker if error count exceeds threshold
    if (state.errorCount >= 5 && !state.circuitBreakerOpen) {
      state.circuitBreakerOpen = true;
      state.circuitBreakerTripped = Date.now();
      console.warn(`Circuit breaker opened for ${providerId}`);

      // Schedule circuit breaker reset
      setTimeout(() => {
        if (state.circuitBreakerOpen) {
          state.circuitBreakerOpen = false;
          state.errorCount = 0;
          console.info(`Circuit breaker closed for ${providerId}`);
        }
      }, 300000); // 5 minutes
    }
  }

  private executeNext(inputData: any): Promise<any> {
    // This should be implemented by the BasePipelineNode
    // For now, return a mock response
    return Promise.resolve(inputData);
  }

  // Public API methods

  /**
   * Add a new target to the router
   */
  addTarget(target: { providerId: string; modelId: string; endpoint?: string; weight?: number; priority?: number }): void {
    this.config.targets.push(target);

    if (!this.targetStates.has(target.providerId)) {
      this.targetStates.set(target.providerId, {
        isHealthy: true,
        healthScore: 100,
        lastHealthCheck: 0,
        errorCount: 0,
        averageLatency: 0,
        requestCount: 0,
        circuitBreakerOpen: false,
        circuitBreakerTripped: 0
      });
    }

    console.log(`Added target to router: ${target.providerId}:${target.modelId}`);
  }

  /**
   * Remove a target from the router
   */
  removeTarget(providerId: string, modelId: string): void {
    this.config.targets = this.config.targets.filter(
      target => !(target.providerId === providerId && target.modelId === modelId)
    );

    console.log(`Removed target from router: ${providerId}:${modelId}`);
  }

  /**
   * Update target configuration
   */
  updateTarget(providerId: string, modelId: string, updates: Partial<{
    weight: number;
    priority: number;
    endpoint: string;
  }>): void {
    const target = this.config.targets.find(
      t => t.providerId === providerId && t.modelId === modelId
    );

    if (target) {
      Object.assign(target, updates);
      console.log(`Updated target configuration: ${providerId}:${modelId}`);
    }
  }

  /**
   * Force health check for a specific provider
   */
  async forceHealthCheck(providerId: string): Promise<boolean> {
    const target = this.config.targets.find(t => t.providerId === providerId);
    if (!target) {
      throw new Error(`Target not found: ${providerId}`);
    }

    return await this.performHealthCheck(target);
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): any {
    const stats: any = {
      virtualModelId: this.config.virtualModelId,
      strategy: this.config.strategy,
      targetCount: this.config.targets.length,
      availableTargets: this.getAvailableTargets().length,
      targets: {}
    };

    for (const [key, targetStats] of this.routingStats.entries()) {
      stats.targets[key] = targetStats;
    }

    return stats;
  }

  /**
   * Get target health information
   */
  getTargetHealth(): any {
    const health: any = {
      virtualModelId: this.config.virtualModelId,
      targets: {}
    };

    for (const [providerId, state] of this.targetStates.entries()) {
      if (!providerId.includes('-' + this.config.virtualModelId)) {
        health.targets[providerId] = { ...state };
      }
    }

    return health;
  }

  /**
   * Reset all routing statistics
   */
  resetStats(): void {
    this.routingStats.clear();

    // Reset target states but preserve health info
    for (const [providerId, state] of this.targetStates.entries()) {
      if (!providerId.includes('-' + this.config.virtualModelId)) {
        state.requestCount = 0;
        state.errorCount = 0;
        state.averageLatency = 0;
      }
    }

    console.log(`Reset routing statistics for ${this.config.virtualModelId}`);
  }

  /**
   * Validate configuration
   */
  validateConfig(): void {
    if (!this.config.virtualModelId || typeof this.config.virtualModelId !== 'string') {
      throw new Error('Virtual model ID is required and must be a string');
    }

    if (!Array.isArray(this.config.targets) || this.config.targets.length === 0) {
      throw new Error('At least one target must be configured');
    }

    for (const target of this.config.targets) {
      if (!target.providerId || !target.modelId) {
        throw new Error('Each target must have providerId and modelId');
      }
    }

    const validStrategies = ['priority', 'roundRobin', 'weighted', 'leastLatency'];
    if (!validStrategies.includes(this.config.strategy)) {
      throw new Error(`Invalid routing strategy: ${this.config.strategy}`);
    }

    if (this.config.timeout !== undefined && this.config.timeout <= 0) {
      throw new Error('Timeout must be positive');
    }

    if (this.config.healthCheckInterval !== undefined && this.config.healthCheckInterval < 0) {
      throw new Error('Health check interval must be non-negative');
    }
  }

  /**
   * Get node information
   */
  getInfo(): any {
    return {
      type: 'virtual-model-router',
      virtualModelId: this.config.virtualModelId,
      strategy: this.config.strategy,
      targetCount: this.config.targets.length,
      availableTargets: this.getAvailableTargets().length,
      fallbackEnabled: this.config.fallbackEnabled,
      circuitBreakerEnabled: this.config.circuitBreakerEnabled,
      timeout: this.config.timeout
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthMonitor) {
      clearInterval(this.healthMonitor);
      this.healthMonitor = null;
    }

    this.targetStates.clear();
    this.routingStats.clear();

    console.log(`VirtualModelRouterNode destroyed for ${this.config.virtualModelId}`);
  }
}

/**
 * Factory function for creating virtual model router nodes
 */
export function createVirtualModelRouter(config: Partial<VirtualModelRoutingConfig>): VirtualModelRouterNode {
  return new VirtualModelRouterNode(config);
}

/**
 * Configuration templates for common routing scenarios
 */
export const VirtualModelRouterTemplates = {
  // High availability with priority routing
  highAvailability: {
    strategy: 'priority' as const,
    fallbackEnabled: true,
    circuitBreakerEnabled: true,
    timeout: 30000,
    healthCheckInterval: 30000
  },

  // Load balancing with weighted round robin
  loadBalanced: {
    strategy: 'weighted' as const,
    fallbackEnabled: true,
    circuitBreakerEnabled: true,
    timeout: 15000,
    healthCheckInterval: 15000
  },

  // Performance optimized with least latency
  performance: {
    strategy: 'leastLatency' as const,
    fallbackEnabled: false,
    circuitBreakerEnabled: true,
    timeout: 10000,
    healthCheckInterval: 10000
  },

  // Simple round robin for equal load distribution
  simple: {
    strategy: 'roundRobin' as const,
    fallbackEnabled: true,
    circuitBreakerEnabled: false,
    timeout: 30000,
    healthCheckInterval: 60000
  }
};

export default {
  VirtualModelRouterNode,
  createVirtualModelRouter,
  VirtualModelRouterTemplates
};