/**
 * WebAuto Enhanced Nodes
 *
 * This module extends the WebAuto Pipeline Framework with RCC-specific enhancements,
 * providing advanced functionality such as load balancing, error recovery, caching,
 * and performance monitoring.
 */

import { BasePipelineNode } from 'webauto-pipelineframework';

/**
 * Enhanced load balancing node for RCC
 */
export class RCCLoadBalancerNode extends BasePipelineNode {
  constructor(config = {}) {
    super({ ...config, type: 'rcc-load-balancer' });
    this.strategy = config.strategy || 'roundRobin';
    this.weights = config.weights || {};
    this.healthCheckInterval = config.healthCheckInterval || 30000;
    this.circuitBreakerConfig = config.circuitBreakerConfig || { enabled: false, threshold: 3 };
    this.instances = [];
    this.currentIndex = 0;
    this.healthStatus = new Map();

    console.log(`RCCLoadBalancerNode initialized with strategy: ${this.strategy}`);
  }

  async handleProcess(inputData) {
    console.log(`Processing load balancing with strategy: ${this.strategy}`);

    try {
      // Select target instance based on strategy
      const targetInstance = this.selectInstance(inputData);

      if (!targetInstance) {
        throw new Error('No available instances for load balancing');
      }

      // Health check if needed
      await this.healthCheck(targetInstance);

      // Process with circuit breaker
      const result = await this.executeWithCircuitBreaker(targetInstance, inputData);

      return {
        data: result,
        loadBalancer: {
          strategy: this.strategy,
          selectedInstance: targetInstance.id,
          timestamp: Date.now()
        }
      };

    } catch (error) {
      console.error('Load balancing failed:', error.message);
      throw error;
    }
  }

  selectInstance(inputData) {
    const availableInstances = this.getAvailableInstances();

    switch (this.strategy) {
      case 'roundRobin':
        return this.roundRobinSelect(availableInstances);

      case 'weighted':
        return this.weightedSelect(availableInstances);

      case 'leastConnections':
        return this.leastConnectionsSelect(availableInstances);

      case 'random':
        return this.randomSelect(availableInstances);

      default:
        throw new Error(`Unsupported load balancing strategy: ${this.strategy}`);
    }
  }

  roundRobinSelect(instances) {
    if (instances.length === 0) return null;

    const instance = instances[this.currentIndex % instances.length];
    this.currentIndex++;
    return instance;
  }

  weightedSelect(instances) {
    const totalWeight = instances.reduce((sum, instance) => {
      return sum + (this.weights[instance.id] || 1);
    }, 0);

    if (totalWeight === 0) return this.roundRobinSelect(instances);

    let random = Math.random() * totalWeight;
    for (const instance of instances) {
      const weight = this.weights[instance.id] || 1;
      random -= weight;
      if (random <= 0) {
        return instance;
      }
    }

    return instances[instances.length - 1];
  }

  leastConnectionsSelect(instances) {
    return instances.reduce((least, current) => {
      const leastConnections = least.connections || 0;
      const currentConnections = current.connections || 0;
      return currentConnections < leastConnections ? current : least;
    }, instances[0]);
  }

  randomSelect(instances) {
    if (instances.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * instances.length);
    return instances[randomIndex];
  }

  getAvailableInstances() {
    return this.instances.filter(instance => {
      const health = this.healthStatus.get(instance.id);
      return health && health.isHealthy;
    });
  }

  async healthCheck(instance) {
    const lastCheck = this.healthStatus.get(instance.id)?.lastCheck || 0;
    const now = Date.now();

    if (now - lastCheck > this.healthCheckInterval) {
      try {
        // Simulate health check
        const isHealthy = await this.performHealthCheck(instance);
        this.healthStatus.set(instance.id, {
          isHealthy,
          lastCheck: now,
          errorCount: 0
        });
      } catch (error) {
        this.healthStatus.set(instance.id, {
          isHealthy: false,
          lastCheck: now,
          errorCount: (this.healthStatus.get(instance.id)?.errorCount || 0) + 1
        });
      }
    }
  }

  async performHealthCheck(instance) {
    // Implement actual health check logic
    // For now, always return healthy for simulation
    return true;
  }

  async executeWithCircuitBreaker(instance, inputData) {
    if (!this.circuitBreakerConfig.enabled) {
      return this.executeRequest(instance, inputData);
    }

    const status = this.healthStatus.get(instance.id);
    if (status && status.errorCount >= this.circuitBreakerConfig.threshold) {
      throw new Error(`Circuit breaker open for instance ${instance.id}`);
    }

    try {
      const result = await this.executeRequest(instance, inputData);
      // Reset error count on success
      if (status) {
        status.errorCount = 0;
      }
      return result;
    } catch (error) {
      // Increment error count
      if (status) {
        status.errorCount++;
      }
      throw error;
    }
  }

  async executeRequest(instance, inputData) {
    // Simulate request execution
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      from: instance.id,
      timestamp: Date.now(),
     responseData: {
        model: inputData.data?.model || 'default',
        response: `${instance.id}-response-${Date.now()}`
      }
    };
  }

  validateConfig() {
    if (!['roundRobin', 'weighted', 'leastConnections', 'random'].includes(this.strategy)) {
      throw new Error(`Invalid load balancing strategy: ${this.strategy}`);
    }

    if (this.healthCheckInterval < 1000) {
      throw new Error('Health check interval must be at least 1000ms');
    }

    return true;
  }

  getInfo() {
    return {
      type: 'rcc-load-balancer',
      strategy: this.strategy,
      instanceCount: this.instances.length,
      availableInstances: this.getAvailableInstances().length,
      healthCheckInterval: this.healthCheckInterval,
      circuitBreakerEnabled: this.circuitBreakerConfig.enabled
    };
  }

  addInstance(instance) {
    this.instances.push(instance);
    this.healthStatus.set(instance.id, {
      isHealthy: true,
      lastCheck: Date.now(),
      errorCount: 0
    });
  }

  removeInstance(instanceId) {
    this.instances = this.instances.filter(instance => instance.id !== instanceId);
    this.healthStatus.delete(instanceId);
  }

  updateWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
  }

  getStats() {
    return {
      totalRequests: Array.from(this.healthStatus.values())
        .reduce((sum, status) => sum + (status.requestCount || 0), 0),
      averageResponseTime: 100, // Mock value
      errorRate: Array.from(this.healthStatus.values())
        .reduce((sum, status) => sum + (status.errorCount || 0), 0) / Math.max(this.instances.length, 1),
      healthyInstances: this.getAvailableInstances().length,
      totalInstances: this.instances.length
    };
  }
}

/**
 * Enhanced error recovery node for RCC
 */
export class RCCErrorRecoveryNode extends BasePipelineNode {
  constructor(config = {}) {
    super({ ...config, type: 'rcc-error-recovery' });
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.fallbackEnabled = config.fallbackEnabled !== false;
    this.exponentialBackoff = config.exponentialBackoff !== false;
    this.retryCondition = config.retryCondition || this.defaultRetryCondition;

    console.log(`RCCErrorRecoveryNode initialized with ${this.maxRetries} max retries`);
  }

  async handleProcess(inputData) {
    console.log(`Processing error recovery (max retries: ${this.maxRetries})`);

    let lastError;
    let retryCount = 0;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        retryCount = attempt;
        const result = await this.executeWithRetry(inputData, attempt);

        if (attempt > 0) {
          result.recoveryInfo = {
            attempts: attempt + 1,
            retryCount,
            success: true,
            timestamp: Date.now()
          };
        }

        return result;

      } catch (error) {
        lastError = error;

        if (attempt < this.maxRetries && this.shouldRetry(error, retryCount)) {
          await this.waitBeforeRetry(attempt);
          continue;
        }

        break;
      }
    }

    // All retries failed, try fallback if enabled
    if (this.fallbackEnabled) {
      try {
        console.log('Attempting fallback execution');
        const fallbackResult = await this.executeFallback(inputData);

        return {
          data: fallbackResult,
          recoveryInfo: {
            attempts: retryCount + 1,
            fallback: true,
            success: true,
            timestamp: Date.now(),
            originalError: lastError?.message
          }
        };
      } catch (fallbackError) {
        console.error('Fallback execution also failed:', fallbackError.message);
      }
    }

    // everything failed
    const errorDetails = {
      attempts: retryCount + 1,
      fallbackTried: this.fallbackEnabled,
      success: false,
      originalError: lastError?.message || 'Unknown error',
      timestamp: Date.now()
    };

    throw new Error(`Request failed after ${retryCount + 1} attempts. Details: ${JSON.stringify(errorDetails)}`);
  }

  async executeWithRetry(inputData, attempt) {
    if (attempt === 0) {
      // First attempt, original execution
      return await this.executeNext(inputData);
    } else {
      // Retry attempt
      console.log(`Retry attempt ${attempt} of ${this.maxRetries}`);
      const retryData = {
        ...inputData,
        retryContext: {
          attemptNumber: attempt,
          totalRetries: this.maxRetries,
          timestamp: Date.now()
        }
      };
      return await this.executeNext(retryData);
    }
  }

  shouldRetry(error, attemptNumber) {
    // Use custom retry condition if provided
    if (typeof this.retryCondition === 'function') {
      return this.retryCondition(error, attemptNumber);
    }

    // Default retry condition
    const retryableErrorTypes = [
      'ENOTFOUND',      // DNS resolution failed
      'ECONNRESET',    // Connection reset by peer
      'ETIMEDOUT',     // Connection timeout
      'ECONNREFUSED',  // Connection refused
      'EAI_AGAIN',     // DNS lookup timeout
    ];

    const errorCode = error.code || error.message;
    return retryableErrorTypes.some(type =>
      errorCode.includes(type) || errorCode.includes('timeout') || errorCode.includes('timeout')
    );
  }

  defaultRetryCondition(error, attemptNumber) {
    return attemptNumber < this.maxRetries &&
           (error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.message?.includes('timeout') ||
            error.message?.includes('retry'));
  }

  async waitBeforeRetry(attempt) {
    let delay = this.retryDelay;

    if (this.exponentialBackoff) {
      delay = this.retryDelay * Math.pow(2, attempt);
    }

    // Add some randomness to avoid thundering herd
    const jitter = Math.random() * delay * 0.1; // 10% jitter
    delay += jitter;

    console.log(`Waiting ${Math.round(delay)}ms before retry attempt ${attempt + 1}`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async executeFallback(inputData) {
    // Simulate fallback execution
    console.log('Executing fallback logic');

    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      from: 'fallback',
      timestamp: Date.now(),
      responseData: {
        model: inputData.data?.model || 'fallback-model',
        response: 'Fallback response: requesting service temporarily unavailable',
        confidence: 0.5,
        fallback: true
      }
    };
  }

  validateConfig() {
    if (this.maxRetries < 0) {
      throw new Error('Max retries must be non-negative');
    }

    if (this.retryDelay <= 0) {
      throw new Error('Retry delay must be positive');
    }

    if (typeof this.retryCondition !== 'function' && typeof this.retryCondition !== 'undefined') {
      throw new Error('Retry condition must be a function');
    }

    return true;
  }

  getInfo() {
    return {
      type: 'rcc-error-recovery',
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      fallbackEnabled: this.fallbackEnabled,
      exponentialBackoff: this.exponentialBackoff
    };
  }

  getStats() {
    // Mock statistics - in real implementation these would be tracked
    return {
      totalRetries: 0,
      successfulRetries: 0,
      fallbackActivations: 0,
      averageRetryDelay: this.retryDelay,
      successRate: 0.95 // Mock success rate
    };
  }
}

/**
 * Enhanced metrics collection node for RCC
 */
export class RCCMetricsNode extends BasePipelineNode {
  constructor(config = {}) {
    super({ ...config, type: 'rcc-metrics' });
    this.events = config.events || ['request', 'response', 'error'];
    this.metricsStorage = new Map();
    this.publishInterval = config.publishInterval || 30000;
    this.flushOnShutdown = config.flushOnShutdown !== false;

    console.log(`RCCMetricsNode initialized, tracking events: ${this.events.join(', ')}`);

    // Start metrics publishing
    this.startMetricsPublisher();
  }

  async handleProcess(inputData) {
    const startTime = Date.now();
    const eventId = this.generateEventId();

    try {
      // Record request metrics
      this.recordMetric('request', {
        eventId,
        timestamp: startTime,
        data: inputData,
        nodeType: this.getType()
      });

      // Execute next node
      const result = await this.executeNext(inputData);

      // Record response metrics
      const endTime = Date.now();
      this.recordMetric('response', {
        eventId,
        timestamp: endTime,
        duration: endTime - startTime,
        result,
        nodeType: this.getType()
      });

      return result;

    } catch (error) {
      // Record error metrics
      const endTime = Date.now();
      this.recordMetric('error', {
        eventId,
        timestamp: endTime,
        duration: endTime - startTime,
        error: error.message,
        nodeType: this.getType()
      });

      throw error;
    }
  }

  recordMetric(eventType, metricData) {
    if (!this.events.includes(eventType)) {
      return;
    }

    const metrics = this.metricsStorage.get(eventType) || [];
    metrics.push(metricData);

    // Keep only last 1000 metrics to avoid memory bloat
    if (metrics.length > 1000) {
      metrics.shift();
    }

    this.metricsStorage.set(eventType, metrics);

    console.log(`Recorded ${eventType} metric: ${metricData.eventId}`);
  }

  generateEventId() {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  startMetricsPublisher() {
    if (this.publishInterval <= 0) {
      return;
    }

    this.metricsPublisher = setInterval(() => {
      this.publishMetrics();
    }, this.publishInterval);

    console.log(`Metrics publisher started, interval: ${this.publishInterval}ms`);
  }

  publishMetrics() {
    if (this.metricsStorage.size === 0) {
      return;
    }

    const metricsSummary = {};
    for (const [eventType, metrics] of this.metricsStorage.entries()) {
      metricsSummary[eventType] = {
        count: metrics.length,
        oldestMetric: metrics[0]?.timestamp,
        newestMetric: metrics[metrics.length - 1]?.timestamp
      };
    }

    broadcastMessage('metrics-update', {
      summary: metricsSummary,
      timestamp: Date.now(),
      nodeType: this.getType()
    });

    console.log('Published metrics summary:', JSON.stringify(metricsSummary, null, 2));
  }

  getMetrics(eventType, limit = 100) {
    const metrics = this.metricsStorage.get(eventType) || [];
    return metrics.slice(-limit);
  }

  getAllMetrics() {
    const allMetrics = {};
    for (const eventType of this.events) {
      allMetrics[eventType] = this.getMetrics(eventType);
    }
    return allMetrics;
  }

  getMetricsSummary() {
    const summary = {};
    for (const eventType of this.events) {
      const metrics = this.metricsStorage.get(eventType) || [];

      if (metrics.length > 0) {
        const durations = metrics
          .filter(m => m.duration !== undefined)
          .map(m => m.duration);

        const avgDuration = durations.length > 0
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length
          : 0;

        summary[eventType] = {
          count: metrics.length,
          averageDuration: Math.round(avgDuration),
          minDuration: durations.length > 0 ? Math.min(...durations) : 0,
          maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
          timestamp: metrics[metrics.length - 1]?.timestamp
        };
      } else {
        summary[eventType] = { count: 0 };
      }
    }

    return summary;
  }

  clearMetrics(eventType) {
    if (eventType) {
      this.metricsStorage.delete(eventType);
    } else {
      this.metricsStorage.clear();
    }
  }

  validateConfig() {
    if (!Array.isArray(this.events) || this.events.length === 0) {
      throw new Error('Events list must be a non-empty array');
    }

    if (this.publishInterval < 0) {
      throw new Error('Publish interval must be non-negative');
    }

    return true;
  }

  getInfo() {
    return {
      type: 'rcc-metrics',
      trackedEvents: this.events,
      publishInterval: this.publishInterval,
      metricsCount: Array.from(this.metricsStorage.values()).reduce((sum, metrics) => sum + metrics.length, 0)
    };
  }

  destroy() {
    if (this.metricsPublisher) {
      clearInterval(this.metricsPublisher);
      this.metricsPublisher = null;
    }

    if (this.flushOnShutdown) {
      this.publishMetrics();
    }

    console.log('RCCMetricsNode destroyed');
  }

  broadcastMessage(type, payload) {
    if (typeof this.emit === 'function') {
      this.emit(type, payload);
    }
  }
}

// Export all enhanced nodes
export {
  RCCLoadBalancerNode,
  RCCErrorRecoveryNode,
  RCCMetricsNode
};

/**
 * Factory function for creating enhanced nodes
 */
export function createEnhancedNode(nodeType, config = {}) {
  switch (nodeType) {
    case 'loadBalancer':
      return new RCCLoadBalancerNode(config);

    case 'errorRecovery':
      return new RCCErrorRecoveryNode(config);

    case 'metrics':
      return new RCCMetricsNode(config);

    default:
      throw new Error(`Unknown enhanced node type: ${nodeType}`);
  }
}

/**
 * Enhanced node configuration templates
 */
export const EnhancedNodeTemplates = {
  loadBalancer: {
    strategy: 'roundRobin',
    healthCheckInterval: 30000,
    circuitBreakerConfig: {
      enabled: true,
      threshold: 3
    }
  },

  errorRecovery: {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackEnabled: true,
    exponentialBackoff: true
  },

  metrics: {
    events: ['request', 'response', 'error'],
    publishInterval: 30000,
    flushOnShutdown: true
  }
};

export default {
  RCCLoadBalancerNode,
  RCCErrorRecoveryNode,
  RCCMetricsNode,
  createEnhancedNode,
  EnhancedNodeTemplates
};