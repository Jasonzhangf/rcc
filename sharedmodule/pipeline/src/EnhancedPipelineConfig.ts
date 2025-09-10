/**
 * Enhanced Pipeline System Configuration Example
 * Demonstrates the complete pipeline scheduling system with error response center
 */

import { PipelineScheduler } from './PipelineScheduler';
import { EnhancedErrorResponseCenter, ErrorResponseCenterConfig } from './EnhancedErrorResponseCenter';
import { PipelineErrorCode } from './ErrorTypes';

/**
 * Complete pipeline system configuration
 */
export interface EnhancedPipelineSystemConfig {
  loadBalancer: {
    strategy: 'roundrobin' | 'weighted' | 'least_connections' | 'random';
    healthCheckInterval: number;
    enableHealthChecks: boolean;
  };
  scheduler: {
    defaultTimeout: number;
    maxRetries: number;
    retryDelay: number;
    enableMetrics: boolean;
    metricsInterval: number;
  };
  errorHandler: {
    enableEnhancedErrorHandling: boolean;
    enableLocalErrorHandling: boolean;
    enableServerErrorHandling: boolean;
    enableRecoveryActions: boolean;
    enableErrorLogging: boolean;
    enableErrorMetrics: boolean;
    maxErrorHistorySize: number;
    errorCleanupInterval: number;
    recoveryActionTimeout: number;
  };
  blacklistConfig: {
    enabled: boolean;
    defaultDuration: number;
    maxBlacklistedPipelines: number;
    cleanupInterval: number;
  };
  pipelines: PipelineConfig[];
}

/**
 * Individual pipeline configuration
 */
export interface PipelineConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  weight: number;
  maxConcurrentRequests?: number;
  timeout?: number;
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
    unhealthyThreshold: number;
    healthyThreshold: number;
  };
  recovery?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
    enableCircuitBreaker: boolean;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
  };
}

/**
 * Example configuration with enhanced error handling
 */
export const exampleEnhancedPipelineConfig: EnhancedPipelineSystemConfig = {
  loadBalancer: {
    strategy: 'roundrobin', // Can be 'roundrobin', 'weighted', 'least_connections', 'random'
    healthCheckInterval: 30000, // 30 seconds
    enableHealthChecks: true
  },
  scheduler: {
    defaultTimeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    enableMetrics: true,
    metricsInterval: 60000 // 1 minute
  },
  errorHandler: {
    enableEnhancedErrorHandling: true,
    enableLocalErrorHandling: true,
    enableServerErrorHandling: true,
    enableRecoveryActions: true,
    enableErrorLogging: true,
    enableErrorMetrics: true,
    maxErrorHistorySize: 1000,
    errorCleanupInterval: 300000, // 5 minutes
    recoveryActionTimeout: 30000 // 30 seconds
  },
  blacklistConfig: {
    enabled: true,
    defaultDuration: 300000, // 5 minutes
    maxBlacklistedPipelines: 10,
    cleanupInterval: 60000 // 1 minute
  },
  pipelines: [
    {
      id: 'pipeline-1',
      name: 'Primary AI Service Pipeline',
      type: 'ai-service',
      enabled: true,
      priority: 1,
      weight: 3,
      maxConcurrentRequests: 100,
      timeout: 25000,
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        unhealthyThreshold: 3,
        healthyThreshold: 2
      },
      recovery: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 60000
      }
    },
    {
      id: 'pipeline-2',
      name: 'Secondary AI Service Pipeline',
      type: 'ai-service',
      enabled: true,
      priority: 2,
      weight: 2,
      maxConcurrentRequests: 50,
      timeout: 30000,
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        unhealthyThreshold: 3,
        healthyThreshold: 2
      },
      recovery: {
        maxRetries: 2,
        retryDelay: 2000,
        backoffMultiplier: 1.5,
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 3,
        circuitBreakerTimeout: 30000
      }
    },
    {
      id: 'pipeline-3',
      name: 'Fallback AI Service Pipeline',
      type: 'ai-service',
      enabled: true,
      priority: 3,
      weight: 1,
      maxConcurrentRequests: 25,
      timeout: 35000,
      healthCheck: {
        enabled: true,
        interval: 60000,
        timeout: 10000,
        unhealthyThreshold: 5,
        healthyThreshold: 3
      },
      recovery: {
        maxRetries: 1,
        retryDelay: 5000,
        backoffMultiplier: 1,
        enableCircuitBreaker: false,
        circuitBreakerThreshold: 10,
        circuitBreakerTimeout: 120000
      }
    }
  ]
};

/**
 * Factory function to create enhanced pipeline scheduler
 */
export function createEnhancedPipelineScheduler(config: EnhancedPipelineSystemConfig): PipelineScheduler {
  // Convert to internal config format
  const internalConfig = {
    loadBalancer: config.loadBalancer,
    scheduler: config.scheduler,
    errorHandler: config.errorHandler,
    blacklistConfig: config.blacklistConfig,
    pipelines: config.pipelines
  };

  return new PipelineScheduler(internalConfig as any);
}

/**
 * Example custom error handler registration
 */
export function registerCustomErrorHandlers(scheduler: PipelineScheduler): void {
  // This would be implemented to register custom error handlers
  // For now, this is a placeholder showing the intended usage
  
  // Example: Register custom handler for rate limiting
  /*
  scheduler.registerCustomErrorHandler(PipelineErrorCode.RATE_LIMIT_EXCEEDED, async (error, context) => {
    // Custom logic for handling rate limiting
    return {
      action: 'blacklist_temporary',
      shouldRetry: false,
      retryDelay: 60000, // 1 minute blacklist
      message: 'Rate limit exceeded, pipeline temporarily blacklisted'
    };
  });
  */
}

/**
 * Example usage of the enhanced pipeline system
 */
export async function exampleEnhancedPipelineUsage(): Promise<void> {
  try {
    // Create the enhanced pipeline scheduler
    const scheduler = createEnhancedPipelineScheduler(exampleEnhancedPipelineConfig);
    
    // Initialize the scheduler
    await scheduler.initialize();
    
    // Register custom error handlers
    registerCustomErrorHandlers(scheduler);
    
    // Example execution with enhanced error handling
    const payload = {
      query: 'What is the weather today?',
      parameters: {
        location: 'New York',
        units: 'metric'
      }
    };
    
    const options = {
      timeout: 15000,
      maxRetries: 2,
      metadata: {
        userId: 'user123',
        sessionId: 'session456'
      }
    };
    
    // Execute with enhanced error handling
    const result = await scheduler.execute(payload, options);
    
    console.log('Pipeline execution result:', result);
    
    // Get scheduler statistics
    const stats = scheduler.getSchedulerStats();
    console.log('Scheduler statistics:', stats);
    
    // Shutdown the scheduler
    await scheduler.shutdown();
    
  } catch (error) {
    console.error('Enhanced pipeline system error:', error);
  }
}

/**
 * Error handling strategies configuration
 */
export const errorHandlingStrategies = {
  // Rate limiting errors - temporary blacklist
  [PipelineErrorCode.RATE_LIMIT_EXCEEDED]: {
    action: 'blacklist_temporary',
    retryCount: 0,
    blacklistDuration: 60000, // 1 minute
    shouldDestroyPipeline: false
  },
  
  // Authentication errors - maintenance mode
  [PipelineErrorCode.AUTHENTICATION_FAILED]: {
    action: 'maintenance',
    retryCount: 0,
    shouldDestroyPipeline: false
  },
  
  // Connection errors - retry with failover
  [PipelineErrorCode.CONNECTION_FAILED]: {
    action: 'failover',
    retryCount: 3,
    retryDelay: 1000,
    shouldDestroyPipeline: true
  },
  
  // Timeout errors - retry with backoff
  [PipelineErrorCode.EXECUTION_TIMEOUT]: {
    action: 'retry',
    retryCount: 2,
    retryDelay: 2000,
    shouldDestroyPipeline: false
  },
  
  // System errors - failover
  [PipelineErrorCode.INTERNAL_ERROR]: {
    action: 'failover',
    retryCount: 1,
    shouldDestroyPipeline: true
  }
};

/**
 * Load balancing strategies comparison
 */
export const loadBalancingStrategies = {
  roundrobin: {
    description: 'Simple round-robin selection',
    bestFor: 'Equal capacity pipelines',
    pros: ['Simple', 'Predictable', 'Fair distribution'],
    cons: ['No health consideration', 'No load awareness']
  },
  
  weighted: {
    description: 'Weighted round-robin based on capacity',
    bestFor: 'Different capacity pipelines',
    pros: ['Capacity aware', 'Flexible', 'Better resource utilization'],
    cons: ['Complex configuration', 'Requires weight tuning']
  },
  
  least_connections: {
    description: 'Select pipeline with least active connections',
    bestFor: 'Variable load patterns',
    pros: ['Load aware', 'Better response times', 'Adaptive'],
    cons: ['Connection tracking overhead', 'Less predictable']
  },
  
  random: {
    description: 'Random selection from healthy pipelines',
    bestFor: 'Large scale deployments',
    pros: ['Simple', 'No state', 'Good distribution'],
    cons: ['No load awareness', 'Less optimal']
  }
};

/**
 * Performance monitoring configuration
 */
export const performanceMonitoring = {
  metrics: {
    enableRequestMetrics: true,
    enableErrorMetrics: true,
    enablePerformanceMetrics: true,
    enableHealthMetrics: true,
    collectionInterval: 60000, // 1 minute
    retentionPeriod: 86400000 // 24 hours
  },
  
  alerts: {
    enableErrorRateAlerts: true,
    errorRateThreshold: 0.05, // 5%
    enableResponseTimeAlerts: true,
    responseTimeThreshold: 5000, // 5 seconds
    enableAvailabilityAlerts: true,
    availabilityThreshold: 0.99 // 99%
  },
  
  reporting: {
    enableConsoleLogging: true,
    enableFileLogging: true,
    enableRemoteLogging: false,
    logLevel: 'info'
  }
};