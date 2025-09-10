/**
 * Pipeline Scheduling System - Usage Examples
 * 
 * This file demonstrates how to use the pipeline scheduling system
 * with various configuration options and scenarios.
 */

import { 
  PipelineScheduler, 
  PipelineConfigManager,
  PipelineSystemConfig,
  PipelineInstance,
  ErrorHandlerCenter,
  LoadBalancerFactory,
  PipelineErrorCode,
  DEFAULT_ERROR_HANDLING_STRATEGIES
} from './index';

/**
 * Example 1: Basic setup with round-robin load balancing
 */
async function basicSetupExample() {
  console.log('=== Basic Setup Example ===');
  
  // Create basic configuration
  const config: PipelineSystemConfig = {
    scheduler: {
      maxRetries: 3,
      defaultTimeout: 30000,
      enableMetrics: true,
      enableHealthChecks: true,
      enableCircuitBreaker: true,
      errorHandlingStrategies: [...DEFAULT_ERROR_HANDLING_STRATEGIES],
      customErrorHandlers: {},
      blacklistConfig: {
        enabled: true,
        maxEntries: 1000,
        cleanupInterval: 300000,
        defaultBlacklistDuration: 60000,
        maxBlacklistDuration: 3600000
      }
    },
    loadBalancer: {
      strategy: 'roundrobin',
      healthCheckInterval: 30000,
      unhealthyThreshold: 3,
      healthyThreshold: 2,
      enableCircuitBreaker: true,
      circuitBreakerConfig: {
        failureThreshold: 5,
        recoveryTime: 60000,
        requestVolumeThreshold: 10,
        timeout: 5000
      }
    },
    pipelines: [
      {
        id: 'pipeline-1',
        name: 'Primary Pipeline',
        type: 'http',
        enabled: true,
        priority: 1,
        weight: 1,
        maxConcurrentRequests: 10,
        timeout: 30000,
        healthCheck: {
          enabled: true,
          interval: 30000,
          timeout: 5000,
          endpoint: 'http://localhost:8080/health'
        }
      },
      {
        id: 'pipeline-2',
        name: 'Secondary Pipeline',
        type: 'http',
        enabled: true,
        priority: 2,
        weight: 1,
        maxConcurrentRequests: 10,
        timeout: 30000,
        healthCheck: {
          enabled: true,
          interval: 30000,
          timeout: 5000,
          endpoint: 'http://localhost:8081/health'
        }
      }
    ],
    globalSettings: {
      debug: false,
      logLevel: 'info',
      metricsEnabled: true,
      healthCheckEnabled: true,
      enableCircuitBreaker: true,
      maxConcurrentRequests: 100,
      defaultTimeout: 30000
    }
  };

  // Create and initialize scheduler
  const scheduler = new PipelineScheduler(config);
  await scheduler.initialize();

  // Execute a simple request
  try {
    const result = await scheduler.execute({
      action: 'process_data',
      data: { id: 1, content: 'Hello World' }
    });
    
    console.log('Execution successful:', result);
  } catch (error) {
    console.error('Execution failed:', error);
  }

  // Get scheduler statistics
  const stats = scheduler.getSchedulerStats();
  console.log('Scheduler stats:', stats);

  // Cleanup
  await scheduler.shutdown();
}

/**
 * Example 2: Weighted load balancing with custom error handling
 */
async function weightedLoadBalancingExample() {
  console.log('=== Weighted Load Balancing Example ===');
  
  const config: PipelineSystemConfig = {
    scheduler: {
      maxRetries: 2,
      defaultTimeout: 15000,
      enableMetrics: true,
      enableHealthChecks: true,
      enableCircuitBreaker: true,
      errorHandlingStrategies: [
        ...DEFAULT_ERROR_HANDLING_STRATEGIES,
        {
          errorCode: PipelineErrorCode.RATE_LIMIT_EXCEEDED,
          action: 'blacklist_temporary',
          retryCount: 0,
          blacklistDuration: 30000, // 30 seconds
          shouldDestroyPipeline: false
        },
        {
          errorCode: PipelineErrorCode.CONNECTION_FAILED,
          action: 'failover',
          retryCount: 1,
          retryDelay: 1000,
          shouldDestroyPipeline: true
        }
      ],
      customErrorHandlers: {},
      blacklistConfig: {
        enabled: true,
        maxEntries: 500,
        cleanupInterval: 60000,
        defaultBlacklistDuration: 120000,
        maxBlacklistDuration: 7200000
      }
    },
    loadBalancer: {
      strategy: 'weighted',
      healthCheckInterval: 15000,
      unhealthyThreshold: 2,
      healthyThreshold: 1,
      enableCircuitBreaker: true,
      circuitBreakerConfig: {
        failureThreshold: 3,
        recoveryTime: 30000,
        requestVolumeThreshold: 5,
        timeout: 3000
      }
    },
    pipelines: [
      {
        id: 'high-capacity',
        name: 'High Capacity Pipeline',
        type: 'http',
        enabled: true,
        priority: 1,
        weight: 3, // 3x more traffic
        maxConcurrentRequests: 50,
        timeout: 10000
      },
      {
        id: 'medium-capacity',
        name: 'Medium Capacity Pipeline',
        type: 'http',
        enabled: true,
        priority: 2,
        weight: 2, // 2x more traffic
        maxConcurrentRequests: 20,
        timeout: 15000
      },
      {
        id: 'low-capacity',
        name: 'Low Capacity Pipeline',
        type: 'http',
        enabled: true,
        priority: 3,
        weight: 1, // 1x traffic
        maxConcurrentRequests: 5,
        timeout: 20000
      }
    ],
    globalSettings: {
      debug: true,
      logLevel: 'debug',
      metricsEnabled: true,
      healthCheckEnabled: true,
      enableCircuitBreaker: true,
      maxConcurrentRequests: 75,
      defaultTimeout: 15000
    }
  };

  const scheduler = new PipelineScheduler(config);
  await scheduler.initialize();

  // Execute multiple requests to see load balancing in action
  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push(scheduler.execute({
      action: 'process_item',
      data: { id: i, content: `Item ${i}` }
    }));
  }

  const results = await Promise.allSettled(requests);
  
  console.log('Results:');
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`Request ${index}: Success`);
    } else {
      console.log(`Request ${index}: Failed - ${result.reason}`);
    }
  });

  // Get pipeline statuses
  const statuses = await scheduler.getAllPipelineStatuses();
  console.log('Pipeline statuses:', statuses);

  await scheduler.shutdown();
}

/**
 * Example 3: Custom error handling and recovery
 */
async function customErrorHandlingExample() {
  console.log('=== Custom Error Handling Example ===');
  
  const config: PipelineSystemConfig = {
    scheduler: {
      maxRetries: 3,
      defaultTimeout: 30000,
      enableMetrics: true,
      enableHealthChecks: true,
      enableCircuitBreaker: true,
      errorHandlingStrategies: [
        // Custom strategies for specific error types
        {
          errorCode: PipelineErrorCode.RATE_LIMIT_EXCEEDED,
          action: 'blacklist_temporary',
          retryCount: 0,
          blacklistDuration: 60000, // 1 minute
          shouldDestroyPipeline: false
        },
        {
          errorCode: PipelineErrorCode.AUTHENTICATION_FAILED,
          action: 'maintenance',
          retryCount: 0,
          shouldDestroyPipeline: false
        },
        {
          errorCode: PipelineErrorCode.CONNECTION_FAILED,
          action: 'failover',
          retryCount: 2,
          retryDelay: 1000,
          shouldDestroyPipeline: true
        }
      ],
      customErrorHandlers: {},
      blacklistConfig: {
        enabled: true,
        maxEntries: 100,
        cleanupInterval: 30000,
        defaultBlacklistDuration: 30000,
        maxBlacklistDuration: 1800000
      }
    },
    loadBalancer: {
      strategy: 'least_connections',
      healthCheckInterval: 10000,
      unhealthyThreshold: 3,
      healthyThreshold: 2,
      enableCircuitBreaker: true
    },
    pipelines: [
      {
        id: 'api-gateway',
        name: 'API Gateway Pipeline',
        type: 'http',
        enabled: true,
        priority: 1,
        maxConcurrentRequests: 25,
        timeout: 30000
      },
      {
        id: 'backup-gateway',
        name: 'Backup Gateway Pipeline',
        type: 'http',
        enabled: true,
        priority: 2,
        maxConcurrentRequests: 15,
        timeout: 30000
      }
    ],
    globalSettings: {
      debug: true,
      logLevel: 'info',
      metricsEnabled: true,
      healthCheckEnabled: true,
      enableCircuitBreaker: true,
      maxConcurrentRequests: 40,
      defaultTimeout: 30000
    }
  };

  const scheduler = new PipelineScheduler(config);
  await scheduler.initialize();

  // Register custom error handlers
  const errorHandler = (scheduler as any).errorHandler as ErrorHandlerCenter;
  
  // Custom handler for rate limiting
  errorHandler.registerCustomHandler(
    PipelineErrorCode.RATE_LIMIT_EXCEEDED,
    async (error, context) => {
      console.log('Custom rate limit handler:', error.message);
      
      // Implement exponential backoff
      const backoffTime = Math.min(1000 * Math.pow(2, context.retryCount), 30000);
      
      return {
        action: 'retry',
        shouldRetry: context.retryCount < 3,
        retryDelay: backoffTime,
        message: `Rate limited, retrying in ${backoffTime}ms`
      };
    }
  );

  // Test error handling with various scenarios
  const testScenarios = [
    { payload: { action: 'rate_limit_test' }, description: 'Rate limit test' },
    { payload: { action: 'auth_test' }, description: 'Auth test' },
    { payload: { action: 'connection_test' }, description: 'Connection test' },
    { payload: { action: 'normal_test' }, description: 'Normal test' }
  ];

  for (const scenario of testScenarios) {
    console.log(`Testing: ${scenario.description}`);
    
    try {
      const result = await scheduler.execute(scenario.payload, {
        maxRetries: 3,
        timeout: 10000
      });
      console.log(`✓ ${scenario.description}: Success`);
    } catch (error) {
      console.log(`✗ ${scenario.description}: Failed - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Get error statistics
  const errorStats = errorHandler.getErrorStats();
  console.log('Error statistics:', errorStats);

  await scheduler.shutdown();
}

/**
 * Example 4: Dynamic pipeline management
 */
async function dynamicPipelineManagementExample() {
  console.log('=== Dynamic Pipeline Management Example ===');
  
  const config: PipelineSystemConfig = {
    scheduler: {
      maxRetries: 2,
      defaultTimeout: 20000,
      enableMetrics: true,
      enableHealthChecks: true,
      enableCircuitBreaker: true,
      errorHandlingStrategies: [...DEFAULT_ERROR_HANDLING_STRATEGIES],
      customErrorHandlers: {},
      blacklistConfig: {
        enabled: true,
        maxEntries: 50,
        cleanupInterval: 60000,
        defaultBlacklistDuration: 120000,
        maxBlacklistDuration: 3600000
      }
    },
    loadBalancer: {
      strategy: 'roundrobin',
      healthCheckInterval: 20000,
      unhealthyThreshold: 2,
      healthyThreshold: 1
    },
    pipelines: [
      {
        id: 'initial-pipeline',
        name: 'Initial Pipeline',
        type: 'http',
        enabled: true,
        priority: 1,
        maxConcurrentRequests: 10,
        timeout: 20000
      }
    ],
    globalSettings: {
      debug: false,
      logLevel: 'info',
      metricsEnabled: true,
      healthCheckEnabled: true,
      enableCircuitBreaker: false,
      maxConcurrentRequests: 50,
      defaultTimeout: 20000
    }
  };

  const scheduler = new PipelineScheduler(config);
  await scheduler.initialize();

  // Initially there's only one pipeline
  let statuses = await scheduler.getAllPipelineStatuses();
  console.log('Initial pipelines:', statuses.map(s => s.name));

  // Dynamically add new pipelines
  const newPipeline1 = await scheduler.createPipeline({
    name: 'Dynamic Pipeline 1',
    type: 'http',
    enabled: true,
    priority: 2,
    maxConcurrentRequests: 15,
    timeout: 25000
  });

  const newPipeline2 = await scheduler.createPipeline({
    name: 'Dynamic Pipeline 2',
    type: 'http',
    enabled: true,
    priority: 3,
    maxConcurrentRequests: 8,
    timeout: 15000
  });

  console.log('Created new pipelines:', newPipeline1, newPipeline2);

  // Check updated pipeline list
  statuses = await scheduler.getAllPipelineStatuses();
  console.log('Updated pipelines:', statuses.map(s => s.name));

  // Test load balancing with new pipelines
  const requests = [];
  for (let i = 0; i < 5; i++) {
    requests.push(scheduler.execute({
      action: 'test_load_balancing',
      data: { request_id: i }
    }));
  }

  await Promise.allSettled(requests);
  console.log('Load balancing test completed');

  // Disable one pipeline
  await scheduler.disablePipeline(newPipeline1);
  console.log(`Disabled pipeline: ${newPipeline1}`);

  // Enable maintenance mode for another
  await scheduler.setPipelineMaintenance(newPipeline2, true);
  console.log(`Set maintenance mode for: ${newPipeline2}`);

  // Check final statuses
  statuses = await scheduler.getAllPipelineStatuses();
  console.log('Final pipeline statuses:');
  statuses.forEach(status => {
    console.log(`- ${status.name}: enabled=${status.enabled}, maintenance=${status.inMaintenance}`);
  });

  await scheduler.shutdown();
}

/**
 * Example 5: Health monitoring and metrics
 */
async function healthMonitoringExample() {
  console.log('=== Health Monitoring Example ===');
  
  const config: PipelineSystemConfig = {
    scheduler: {
      maxRetries: 1,
      defaultTimeout: 10000,
      enableMetrics: true,
      enableHealthChecks: true,
      enableCircuitBreaker: true,
      errorHandlingStrategies: [...DEFAULT_ERROR_HANDLING_STRATEGIES],
      customErrorHandlers: {},
      blacklistConfig: {
        enabled: true,
        maxEntries: 20,
        cleanupInterval: 30000,
        defaultBlacklistDuration: 60000,
        maxBlacklistDuration: 300000
      }
    },
    loadBalancer: {
      strategy: 'random',
      healthCheckInterval: 5000, // Very frequent for demo
      unhealthyThreshold: 2,
      healthyThreshold: 1
    },
    pipelines: [
      {
        id: 'healthy-pipeline',
        name: 'Healthy Pipeline',
        type: 'http',
        enabled: true,
        priority: 1,
        maxConcurrentRequests: 5,
        timeout: 10000
      },
      {
        id: 'unstable-pipeline',
        name: 'Unstable Pipeline',
        type: 'http',
        enabled: true,
        priority: 2,
        maxConcurrentRequests: 3,
        timeout: 10000
      }
    ],
    globalSettings: {
      debug: true,
      logLevel: 'debug',
      metricsEnabled: true,
      healthCheckEnabled: true,
      enableCircuitBreaker: true,
      maxConcurrentRequests: 8,
      defaultTimeout: 10000
    }
  };

  const scheduler = new PipelineScheduler(config);
  await scheduler.initialize();

  // Monitor health over time
  console.log('Monitoring health for 30 seconds...');
  
  const monitoringInterval = setInterval(async () => {
    const healthStatus = await scheduler.healthCheck();
    const stats = scheduler.getSchedulerStats();
    const statuses = await scheduler.getAllPipelineStatuses();
    
    console.log('\\nHealth Update:');
    console.log('- Overall Health:', healthStatus ? 'HEALTHY' : 'UNHEALTHY');
    console.log('- Active Instances:', stats.activeInstances);
    console.log('- Total Requests:', stats.totalRequests);
    console.log('- Success Rate:', ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) + '%');
    
    statuses.forEach(status => {
      console.log(`- ${status.name}: ${status.health} (${status.state})`);
    });
  }, 5000);

  // Run some load during monitoring
  const loadTest = setInterval(async () => {
    try {
      await scheduler.execute({
        action: 'health_test',
        data: { timestamp: Date.now() }
      });
    } catch (error) {
      // Expected during testing
    }
  }, 1000);

  // Stop monitoring after 30 seconds
  setTimeout(() => {
    clearInterval(monitoringInterval);
    clearInterval(loadTest);
    
    console.log('\\nFinal Statistics:');
    const finalStats = scheduler.getSchedulerStats();
    console.log(finalStats);
    
    scheduler.shutdown();
  }, 30000);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await basicSetupExample();
    console.log('\\n' + '='.repeat(50) + '\\n');
    
    await weightedLoadBalancingExample();
    console.log('\\n' + '='.repeat(50) + '\\n');
    
    await customErrorHandlingExample();
    console.log('\\n' + '='.repeat(50) + '\\n');
    
    await dynamicPipelineManagementExample();
    console.log('\\n' + '='.repeat(50) + '\\n');
    
    await healthMonitoringExample();
    
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Export examples for individual testing
export {
  basicSetupExample,
  weightedLoadBalancingExample,
  customErrorHandlingExample,
  dynamicPipelineManagementExample,
  healthMonitoringExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}