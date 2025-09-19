# BaseModule Recording System Examples

This document provides comprehensive examples of how to use the enhanced BaseModule recording system.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Cycle Recording](#cycle-recording)
3. [Error Recording](#error-recording)
4. [Field Truncation](#field-truncation)
5. [Request Context Management](#request-context-management)
6. [Global Configuration](#global-configuration)
7. [Advanced Scenarios](#advanced-scenarios)

## Basic Setup

### 1. Simple Configuration

```typescript
import { BaseModule, BaseModuleRecordingConfig } from 'rcc-basemodule';

// Basic recording configuration
const recordingConfig: BaseModuleRecordingConfig = {
  enabled: true,
  basePath: './logs',
  cycle: {
    enabled: true,
    mode: 'single',
    format: 'json',
    autoCreateDirectory: true
  },
  error: {
    enabled: true,
    levels: ['error', 'fatal'],
    categories: ['system', 'processing']
  },
  truncation: {
    enabled: true,
    defaultStrategy: 'truncate',
    defaultMaxLength: 1000
  }
};

class MyModule extends BaseModule {
  constructor() {
    super('MyModule', { recordingConfig });
  }
}
```

### 2. Advanced Configuration

```typescript
const advancedConfig: BaseModuleRecordingConfig = {
  enabled: true,
  basePath: './logs/recording',
  port: 3000,

  // Cycle recording configuration
  cycle: {
    enabled: true,
    mode: 'cyclic', // or 'single'
    basePath: './logs/cycles',
    cycleDirTemplate: 'cycles/${date}/${cycleId}',
    mainFileTemplate: 'main.${format}',
    summaryFileTemplate: 'summary.json',
    format: 'json', // 'json', 'jsonl', 'csv'
    includeIndex: true,
    includeTimestamp: true,
    autoCreateDirectory: true,
    autoCloseOnComplete: true,
    maxCyclesRetained: 100
  },

  // Error recording configuration
  error: {
    enabled: true,
    levels: ['error', 'fatal'], // 'trace', 'debug', 'info', 'warning', 'error', 'fatal'
    categories: ['network', 'validation', 'processing', 'system', 'security', 'business'],
    basePath: './logs/errors',
    indexFileTemplate: 'errors/index.jsonl',
    detailFileTemplate: 'errors/${date}/${errorId}.json',
    summaryFileTemplate: 'errors/summary.json',
    dailyDirTemplate: 'errors/${date}',
    indexFormat: 'jsonl',
    detailFormat: 'json',
    autoRecoveryTracking: true,
    maxErrorsRetained: 1000,
    enableStatistics: true
  },

  // Field truncation configuration
  truncation: {
    enabled: true,
    defaultStrategy: 'truncate', // 'truncate', 'replace', 'hide'
    defaultMaxLength: 1000,
    defaultReplacementText: '[...]',

    // Field-specific rules
    fields: [
      {
        fieldPath: 'request.messages.content',
        strategy: 'truncate',
        maxLength: 500,
        replacementText: '[LONG_CONTENT_TRUNCATED]',
        priority: 1
      },
      {
        fieldPath: 'response.data',
        strategy: 'replace',
        maxLength: 100,
        replacementText: '[DATA_REPLACED]'
      }
    ],

    // Path pattern rules
    pathPatterns: [
      {
        pattern: 'request.messages.*.content',
        condition: 'if_long',
        strategy: 'truncate',
        maxLength: 300
      },
      {
        pattern: 'response.*.data',
        condition: 'always',
        strategy: 'replace',
        replacementText: '[REDACTED]'
      }
    ],

    // Excluded fields
    excludedFields: ['request.id', 'response.timestamp'],

    // Advanced options
    preserveStructure: true,
    truncateArrays: true,
    arrayTruncateLimit: 100,
    recursiveTruncation: true
  }
};
```

## Cycle Recording

### 1. Basic Cycle Recording

```typescript
import { RecordingManager } from 'rcc-basemodule';

const manager = new RecordingManager(recordingConfig);

// Create request context
const context = manager.createRequestContext({
  customConfig: { module: 'MyModule' }
});

// Start cycle recording
const cycleHandle = manager.startCycleRecording(
  context.requestId,
  'process-request',
  'MyModule'
);

if (cycleHandle) {
  // Record cycle events
  await manager.recordCycleEvent(cycleHandle, {
    index: 0,
    type: 'start',
    module: 'MyModule',
    operation: 'process-request',
    data: { input: 'test data' },
    timestamp: Date.now(),
    cycleId: cycleHandle.cycleId,
    traceId: context.traceId,
    requestId: context.requestId
  });

  // Middle processing
  await manager.recordCycleEvent(cycleHandle, {
    index: 1,
    type: 'middle',
    module: 'MyModule',
    operation: 'process-request',
    phase: 'validation',
    data: { step: 'validating input' },
    timestamp: Date.now(),
    cycleId: cycleHandle.cycleId
  });

  // End cycle recording
  await manager.endCycleRecording(cycleHandle, {
    result: { success: true, output: 'processed data' }
  });
}

// Complete request context
manager.completeRequestContext(context.requestId, 'completed');
```

### 2. Pipeline Cycle Recording

```typescript
class PipelineModule extends BaseModule {
  async processRequest(request: any): Promise<any> {
    // Create request context
    const context = this.recordingManager?.createRequestContext({
      customConfig: { module: this.moduleName }
    });

    if (!context) {
      return this.processRequestInternal(request);
    }

    try {
      // Start cycle recording
      const cycleHandle = this.recordingManager?.startCycleRecording(
        context.requestId,
        'process-request',
        this.moduleName
      );

      if (cycleHandle) {
        await this.recordingManager?.recordCycleEvent(cycleHandle, {
          index: 0,
          type: 'start',
          module: this.moduleName,
          operation: 'process-request',
          data: { request: this.truncateFields(request) },
          timestamp: Date.now(),
          cycleId: cycleHandle.cycleId,
          traceId: context.traceId,
          requestId: context.requestId
        });
      }

      // Process the request
      const result = await this.processRequestInternal(request);

      // Record successful completion
      if (cycleHandle) {
        await this.recordingManager?.endCycleRecording(cycleHandle, {
          result: this.truncateFields(result)
        });
      }

      return result;
    } catch (error) {
      // Record error
      await this.recordError({
        error: error instanceof Error ? error : new Error(String(error)),
        level: 'error',
        category: 'processing',
        operation: 'process-request',
        context: { module: this.moduleName, request: this.truncateFields(request) },
        recoverable: true
      });

      // Record failed completion
      const cycleHandle = this.recordingManager?.startCycleRecording(
        context.requestId,
        'process-request',
        this.moduleName
      );

      if (cycleHandle) {
        await this.recordingManager?.endCycleRecording(cycleHandle, undefined, error.message);
      }

      throw error;
    } finally {
      this.recordingManager?.completeRequestContext(context.requestId);
    }
  }
}
```

## Error Recording

### 1. Basic Error Recording

```typescript
class ServiceModule extends BaseModule {
  async fetchData(url: string): Promise<any> {
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      // Record the error
      const errorId = this.recordError({
        error: error instanceof Error ? error : new Error(String(error)),
        level: 'error',
        category: 'network',
        operation: 'fetchData',
        context: {
          module: this.moduleName,
          url,
          timestamp: Date.now()
        },
        recoverable: true // Network errors might be recoverable
      });

      // You can use the errorId for tracking
      console.error(`Error recorded with ID: ${errorId}`);
      throw error;
    }
  }
}
```

### 2. Error Recovery Tracking

```typescript
class ResilientService extends BaseModule {
  async fetchDataWithRetry(url: string, maxRetries = 3): Promise<any> {
    let lastErrorId: string | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.fetchData(url);

        // Mark error as resolved if it was previously recorded
        if (lastErrorId) {
          this.resolveError(lastErrorId, `Recovered on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastErrorId = this.recordError({
          error: error instanceof Error ? error : new Error(String(error)),
          level: 'warning',
          category: 'network',
          operation: 'fetchDataWithRetry',
          context: {
            module: this.moduleName,
            url,
            attempt,
            maxRetries
          },
          recoverable: true
        });

        // Track recovery attempt
        this.trackRecoveryAttempt(lastErrorId, false);

        if (attempt === maxRetries) {
          // Mark as unresolved after final attempt
          throw new Error(`Failed after ${maxRetries} attempts: ${error}`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw new Error('Unexpected error in retry logic');
  }
}
```

### 3. Error Analysis

```typescript
class AnalyticsModule extends BaseModule {
  generateErrorReport(): void {
    // Get error statistics
    const stats = this.getErrorStatistics({
      timeRange: {
        start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
        end: Date.now()
      }
    });

    console.log('Error Statistics:', {
      totalErrors: stats.totalErrors,
      errorsByLevel: stats.errorsByLevel,
      errorsByCategory: stats.errorsByCategory,
      recoveryRate: stats.recoveryRate
    });

    // Get error trend
    const trend = this.getErrorTrend({
      start: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
      end: Date.now()
    }, 24 * 60 * 60 * 1000); // 1 day intervals

    console.log('Error Trend:', trend);

    // Get unresolved errors
    const unresolvedErrors = this.getUnresolvedErrors();
    console.log(`Unresolved errors: ${unresolvedErrors.length}`);

    // Get errors by category
    const systemErrors = this.getErrorsByCategory('system');
    console.log(`System errors: ${systemErrors.length}`);
  }
}
```

## Field Truncation

### 1. Basic Field Truncation

```typescript
class DataProcessor extends BaseModule {
  processData(data: any): any {
    // Apply field truncation
    const truncatedData = this.truncateFields(data, 'processData');

    // The data will be automatically truncated based on configuration
    return truncatedData;
  }
}
```

### 2. Custom Truncation Rules

```typescript
class CustomTruncationModule extends BaseModule {
  constructor() {
    super('CustomTruncationModule', {
      recordingConfig: {
        enabled: true,
        truncation: {
          enabled: true,
          defaultStrategy: 'truncate',
          defaultMaxLength: 500,

          // Custom field rules
          fields: [
            {
              fieldPath: 'request.body',
              strategy: 'replace',
              maxLength: 200,
              replacementText: '[REQUEST_BODY_REPLACED]'
            },
            {
              fieldPath: 'response.data',
              strategy: 'hide',
              condition: (value, context) => {
                // Only hide sensitive data
                return context.operation === 'handleSensitiveData';
              }
            }
          ],

          // Path pattern rules
          pathPatterns: [
            {
              pattern: 'request.headers.*',
              condition: 'if_long',
              strategy: 'truncate',
              maxLength: 100
            },
            {
              pattern: 'response.*.password',
              condition: 'always',
              strategy: 'hide'
            }
          ]
        }
      }
    });
  }
}
```

## Request Context Management

### 1. Cross-Module Request Tracking

```typescript
class PipelineOrchestrator {
  private modules: BaseModule[] = [];

  constructor(private recordingManager: RecordingManager) {}

  async processPipeline(input: any): Promise<any> {
    // Create root context
    const rootContext = this.recordingManager.createRequestContext({
      customConfig: { module: 'PipelineOrchestrator' }
    });

    try {
      let currentContext = rootContext;
      let result = input;

      for (const module of this.modules) {
        // Update context for current module
        this.recordingManager.updateRequestContext(currentContext.requestId, {
          currentModule: module.moduleName,
          currentPath: `/pipeline/${module.moduleName}`
        });

        // Process through module
        result = await module.process(result);

        // Share data across the chain
        this.recordingManager.setSharedData(
          currentContext.requestId,
          `processed_${module.moduleName}`,
          { timestamp: Date.now(), result: this.truncateFields(result) }
        );
      }

      return result;
    } finally {
      this.recordingManager.completeRequestContext(rootContext.requestId);
    }
  }
}
```

### 2. Chain Breakpoint Detection

```typescript
class ResilientPipeline {
  constructor(private recordingManager: RecordingManager) {}

  async processWithRecovery(input: any): Promise<any> {
    const context = this.recordingManager.createRequestContext();

    try {
      return await this.processInternal(input, context);
    } catch (error) {
      // Check for chain breakpoints
      const breakpoints = this.recordingManager.getChainBreakpoints(context.chainId);

      if (breakpoints.length > 0) {
        console.warn('Chain breakpoints detected:', breakpoints);

        // Attempt recovery
        for (const breakpoint of breakpoints) {
          if (!breakpoint.repairAttempted) {
            console.log(`Attempting repair for: ${breakpoint.reason}`);
            // Implement recovery logic
          }
        }
      }

      throw error;
    }
  }
}
```

## Global Configuration

### 1. Configuration Management

```typescript
class ConfigurationService {
  private globalConfigManager: GlobalConfigManager;

  constructor() {
    this.globalConfigManager = new GlobalConfigManager({
      enabled: true,
      basePath: './logs'
    });

    // Subscribe to configuration changes
    this.globalConfigManager.subscribe('ConfigurationService', (config) => {
      console.log('Configuration updated:', config);
      this.applyConfiguration(config);
    });
  }

  async updateConfiguration(newConfig: Partial<BaseModuleRecordingConfig>): Promise<boolean> {
    const result = await this.globalConfigManager.updateGlobalConfig({
      baseConfig: newConfig
    });

    return result.success;
  }

  registerModule(moduleId: string, config: BaseModuleRecordingConfig): boolean {
    const result = this.globalConfigManager.registerModuleConfig(moduleId, config);
    return result.success;
  }

  private applyConfiguration(config: BaseModuleRecordingConfig): void {
    // Apply configuration to all modules
    console.log('Applying new configuration to all modules');
  }
}
```

### 2. Configuration Validation

```typescript
class ConfigurationValidator {
  private validator: ConfigValidator;

  constructor() {
    this.validator = new ConfigValidator();
  }

  validateModuleConfig(config: BaseModuleRecordingConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    return this.validator.validateRecordingConfig(config);
  }

  validateChainConfigs(moduleConfigs: Record<string, BaseModuleRecordingConfig>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    moduleIssues: Record<string, string[]>;
  } {
    return this.validator.validateChainConfig(moduleConfigs);
  }
}
```

## Advanced Scenarios

### 1. Multi-Tenant Recording

```typescript
class MultiTenantModule extends BaseModule {
  constructor(
    moduleName: string,
    private tenantId: string
  ) {
    super(moduleName, {
      recordingConfig: {
        enabled: true,
        basePath: `./logs/tenants/${tenantId}`,
        cycle: {
          enabled: true,
          cycleDirTemplate: 'cycles/${date}/${cycleId}',
          format: 'json'
        },
        error: {
          enabled: true,
          detailFileTemplate: 'errors/${tenantId}/${errorId}.json'
        }
      }
    });
  }
}
```

### 2. High-Frequency Request Processing

```typescript
class HighFrequencyModule extends BaseModule {
  private requestQueue: Array<{ request: any; resolve: Function; reject: Function }> = [];
  private isProcessing = false;

  constructor() {
    super('HighFrequencyModule', {
      recordingConfig: {
        enabled: true,
        cycle: {
          enabled: true,
          mode: 'cyclic',
          format: 'jsonl', // More efficient format
          maxCyclesRetained: 50 // Limit retention for performance
        },
        truncation: {
          enabled: true,
          defaultMaxLength: 100, // Aggressive truncation for performance
          strategy: 'truncate'
        }
      }
    });
  }

  async processRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    try {
      // Batch process requests
      const batch = this.requestQueue.splice(0, 10); // Process 10 at a time

      await Promise.all(batch.map(async ({ request, resolve, reject }) => {
        try {
          const result = await this.processSingleRequest(request);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }));
    } finally {
      this.isProcessing = false;

      // Process next batch if queue is not empty
      if (this.requestQueue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }
}
```

### 3. Real-time Monitoring

```typescript
class MonitoringModule extends BaseModule {
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0
  };

  constructor() {
    super('MonitoringModule', {
      recordingConfig: {
        enabled: true,
        cycle: {
          enabled: true,
          mode: 'single',
          format: 'json'
        },
        error: {
          enabled: true,
          enableStatistics: true
        }
      }
    });
  }

  async monitoredOperation(operation: () => Promise<any>): Promise<any> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    const context = this.recordingManager?.createRequestContext({
      customConfig: { module: this.moduleName }
    });

    try {
      const result = await operation();

      this.metrics.successfulRequests++;
      this.updateAverageResponseTime(startTime);

      return result;
    } catch (error) {
      this.metrics.failedRequests++;

      this.recordError({
        error: error instanceof Error ? error : new Error(String(error)),
        level: 'error',
        category: 'processing',
        operation: 'monitoredOperation'
      });

      throw error;
    } finally {
      if (context) {
        this.recordingManager?.completeRequestContext(context.requestId);
      }
    }
  }

  private updateAverageResponseTime(startTime: number): void {
    const responseTime = Date.now() - startTime;
    const total = this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (total - 1) + responseTime) / total;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
```

## Best Practices

1. **Always clean up contexts**: Ensure that every request context is properly completed, even in error scenarios.

2. **Use appropriate truncation**: Set reasonable field length limits to balance information retention with performance.

3. **Monitor error rates**: Use error statistics to identify patterns and improve system reliability.

4. **Validate configurations**: Always validate recording configurations before applying them.

5. **Use path patterns**: Leverage path pattern matching for consistent field truncation across complex data structures.

6. **Consider performance**: For high-frequency operations, use efficient formats like JSONL and limit data retention.

7. **Implement proper error handling**: Record errors with sufficient context for debugging while avoiding sensitive information exposure.