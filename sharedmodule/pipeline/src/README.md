# Pipeline Scheduling System

A comprehensive pipeline scheduling and load balancing system built with TypeScript, designed for high availability, fault tolerance, and scalability.

## Features

### Core Functionality
- **Multiple Load Balancing Strategies**: Round Robin, Weighted Round Robin, Least Connections, Random
- **Intelligent Error Handling**: Configurable error handling strategies with automatic recovery
- **Pipeline Lifecycle Management**: Dynamic creation, destruction, and maintenance of pipeline instances
- **Health Monitoring**: Continuous health checks with automatic failover
- **Circuit Breaker Pattern**: Prevents cascading failures
- **Blacklist Management**: Automatic and manual pipeline blacklisting with expiry
- **Comprehensive Metrics**: Detailed statistics and monitoring

### Error Handling
- **Error Classification**: Categorizes errors by type, severity, and recoverability
- **Automatic Retry**: Configurable retry policies with exponential backoff
- **Failover Support**: Automatic switching to available pipelines on failure
- **Maintenance Mode**: Graceful handling of pipeline maintenance
- **Custom Error Handlers**: Extensible error handling with custom strategies
- **HTTP Status Mapping**: Proper HTTP status codes for different error types

### Monitoring and Observability
- **Real-time Metrics**: Request counts, success rates, response times
- **Health Status**: Individual and system-wide health monitoring
- **Error Statistics**: Detailed error tracking and classification
- **Load Balancer Statistics**: Per-instance performance metrics
- **Logging**: Comprehensive logging with multiple levels

## Architecture

### Components

1. **PipelineScheduler**: Central orchestrator for pipeline execution and management
2. **PipelineInstance**: Individual pipeline implementation with lifecycle management
3. **ErrorHandlerCenter**: Centralized error handling and recovery
4. **LoadBalancer**: Various load balancing strategies implementation
5. **PipelineConfigManager**: Configuration management and validation

### Data Flow

```
Client Request → PipelineScheduler → LoadBalancer → PipelineInstance → External Service
                     ↓                       ↓                  ↓
                ErrorHandlerCenter ← Error Response ← Health Check
```

## Installation

```bash
npm install @rcc/pipeline-scheduler
```

## Quick Start

### Basic Setup

```typescript
import { PipelineScheduler, PipelineSystemConfig } from '@rcc/pipeline-scheduler';

const config: PipelineSystemConfig = {
  scheduler: {
    maxRetries: 3,
    defaultTimeout: 30000,
    enableMetrics: true,
    enableHealthChecks: true,
    enableCircuitBreaker: true,
    errorHandlingStrategies: [], // Use default strategies
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
    healthyThreshold: 2
  },
  pipelines: [
    {
      id: 'pipeline-1',
      name: 'Primary Pipeline',
      type: 'http',
      enabled: true,
      priority: 1,
      maxConcurrentRequests: 10,
      timeout: 30000
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

const scheduler = new PipelineScheduler(config);
await scheduler.initialize();

// Execute a request
const result = await scheduler.execute({
  action: 'process_data',
  data: { id: 1, content: 'Hello World' }
});

console.log('Result:', result);
```

### Advanced Setup with Custom Error Handling

```typescript
import { PipelineScheduler, PipelineErrorCode, ErrorHandlerCenter } from '@rcc/pipeline-scheduler';

const scheduler = new PipelineScheduler(config);
await scheduler.initialize();

// Register custom error handler
const errorHandler = (scheduler as any).errorHandler as ErrorHandlerCenter;
errorHandler.registerCustomHandler(
  PipelineErrorCode.RATE_LIMIT_EXCEEDED,
  async (error, context) => {
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

// Execute with custom options
const result = await scheduler.execute(payload, {
  timeout: 15000,
  maxRetries: 5,
  retryDelay: 1000,
  metadata: { requestId: '12345' }
});
```

## Configuration

### Load Balancer Strategies

#### Round Robin
```typescript
loadBalancer: {
  strategy: 'roundrobin',
  healthCheckInterval: 30000,
  unhealthyThreshold: 3,
  healthyThreshold: 2
}
```

#### Weighted Round Robin
```typescript
loadBalancer: {
  strategy: 'weighted',
  healthCheckInterval: 30000,
  unhealthyThreshold: 3,
  healthyThreshold: 2
},
pipelines: [
  {
    id: 'high-capacity',
    name: 'High Capacity Pipeline',
    weight: 3, // 3x more traffic
    // ... other config
  },
  {
    id: 'low-capacity',
    name: 'Low Capacity Pipeline',
    weight: 1, // 1x traffic
    // ... other config
  }
]
```

#### Least Connections
```typescript
loadBalancer: {
  strategy: 'least_connections',
  healthCheckInterval: 30000,
  unhealthyThreshold: 3,
  healthyThreshold: 2
}
```

### Error Handling Strategies

```typescript
errorHandlingStrategies: [
  {
    errorCode: PipelineErrorCode.RATE_LIMIT_EXCEEDED,
    action: 'blacklist_temporary',
    retryCount: 0,
    blacklistDuration: 60000, // 1 minute
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.CONNECTION_FAILED,
    action: 'failover',
    retryCount: 3,
    retryDelay: 1000,
    shouldDestroyPipeline: true
  },
  {
    errorCode: PipelineErrorCode.AUTHENTICATION_FAILED,
    action: 'maintenance',
    retryCount: 0,
    shouldDestroyPipeline: false
  }
]
```

## API Reference

### PipelineScheduler

#### Methods
- `initialize()`: Initialize the scheduler and all pipeline instances
- `execute(payload, options?)`: Execute a request through the pipeline system
- `createPipeline(config)`: Create a new pipeline instance
- `destroyPipeline(pipelineId)`: Destroy a pipeline instance
- `enablePipeline(pipelineId)`: Enable a pipeline
- `disablePipeline(pipelineId)`: Disable a pipeline
- `setPipelineMaintenance(pipelineId, enabled)`: Set maintenance mode
- `getPipelineStatus(pipelineId)`: Get status of a specific pipeline
- `getAllPipelineStatuses()`: Get status of all pipelines
- `getSchedulerStats()`: Get scheduler statistics
- `healthCheck()`: Perform system health check
- `shutdown()`: Gracefully shutdown the scheduler

#### Events
- `pipeline_created`: Emitted when a pipeline is created
- `pipeline_destroyed`: Emitted when a pipeline is destroyed
- `pipeline_health_changed`: Emitted when pipeline health changes
- `pipeline_blacklisted`: Emitted when a pipeline is blacklisted
- `pipeline_unblacklisted`: Emitted when a pipeline is unblacklisted

### Error Types

The system defines comprehensive error types with proper HTTP status mapping:

```typescript
enum PipelineErrorCode {
  // Configuration errors (1000-1999)
  INVALID_CONFIG = 1001,
  MISSING_CONFIG = 1002,
  
  // Pipeline lifecycle errors (2000-2999)
  PIPELINE_CREATION_FAILED = 2001,
  PIPELINE_INITIALIZATION_FAILED = 2002,
  
  // Scheduling errors (3000-3999)
  NO_AVAILABLE_PIPELINES = 3001,
  SCHEDULING_FAILED = 3002,
  
  // Execution errors (4000-4999)
  EXECUTION_FAILED = 4001,
  EXECUTION_TIMEOUT = 4002,
  
  // Network errors (5000-5999)
  CONNECTION_FAILED = 5001,
  REQUEST_TIMEOUT = 5002,
  
  // Authentication errors (6000-6999)
  AUTHENTICATION_FAILED = 6001,
  AUTHORIZATION_FAILED = 6002,
  
  // Rate limiting errors (7000-7999)
  RATE_LIMIT_EXCEEDED = 7001,
  TOO_MANY_REQUESTS = 7002,
  
  // Resource errors (8000-8999)
  INSUFFICIENT_MEMORY = 8001,
  RESOURCE_EXHAUSTED = 8004,
  
  // System errors (10000-10999)
  INTERNAL_ERROR = 10001,
  SERVICE_UNAVAILABLE = 10003
}
```

## Monitoring

### Health Checks

The system performs regular health checks on all pipeline instances:

```typescript
// Get overall system health
const isHealthy = await scheduler.healthCheck();

// Get individual pipeline status
const status = await scheduler.getPipelineStatus('pipeline-1');
console.log(status.health); // 'healthy', 'degraded', 'unhealthy'
```

### Metrics

```typescript
const stats = scheduler.getSchedulerStats();
console.log({
  totalRequests: stats.totalRequests,
  successfulRequests: stats.successfulRequests,
  failedRequests: stats.failedRequests,
  averageResponseTime: stats.averageResponseTime,
  activeInstances: stats.activeInstances,
  blacklistedInstances: stats.blacklistedInstances
});
```

### Error Statistics

```typescript
const errorStats = errorHandler.getErrorStats();
console.log({
  totalErrors: errorStats.totalErrors,
  handledErrors: errorStats.handledErrors,
  retryCount: errorStats.retryCount,
  failoverCount: errorStats.failoverCount,
  blacklistCount: errorStats.blacklistCount
});
```

## Best Practices

### 1. Configuration Management
- Use environment-specific configurations
- Implement proper validation for custom configurations
- Monitor configuration changes and their impact

### 2. Error Handling
- Implement custom error handlers for business-specific errors
- Set appropriate retry limits and delays
- Monitor error patterns and adjust strategies accordingly

### 3. Performance Optimization
- Choose appropriate load balancing strategies for your use case
- Configure proper timeouts and retry policies
- Monitor resource usage and scale accordingly

### 4. Monitoring and Alerting
- Set up comprehensive monitoring for all metrics
- Implement alerts for critical errors and health issues
- Regular review of performance statistics

### 5. Security Considerations
- Implement proper authentication and authorization
- Use secure communication channels
- Monitor for suspicious activities

## Examples

See the `examples.ts` file for comprehensive usage examples:

1. **Basic Setup**: Simple round-robin load balancing
2. **Weighted Load Balancing**: Traffic distribution based on capacity
3. **Custom Error Handling**: Advanced error recovery strategies
4. **Dynamic Pipeline Management**: Runtime pipeline management
5. **Health Monitoring**: Comprehensive monitoring example

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test pipeline-scheduler.test.ts

# Run with coverage
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes with tests
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, please:
- Check the documentation
- Review the examples
- Open an issue with detailed information
- Contact the development team