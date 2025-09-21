# RCC Pipeline Monitoring and Metrics System

RCC流水线监控和指标系统

A comprehensive error monitoring, automated recovery, and health check system for the RCC pipeline architecture.

## 📋 Overview 概述

The monitoring system provides three core capabilities:

1. **Error Monitoring & Metrics Collection** - Comprehensive error tracking with pattern analysis
2. **Automated Recovery System** - Intelligent error recovery with machine learning
3. **Real-time Health Monitoring** - Continuous health checks with anomaly detection

## 🏗️ Architecture 架构

```
┌─────────────────────────────────────────────────────────────┐
│                   Monitoring Integration                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Error Monitor │  │ Automated Rec.  │  │Health Check │ │
│  │                 │  │                 │  │             │ │
│  │ • Error Metrics │  │ • Pattern Learn.│  │ • Health    │ │
│  │ • Real-time     │  │ • Recovery      │  │ • Anomaly   │ │
│  │ • Alerts        │  │ • Self-healing  │  │ • Trends    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Unified Dashboard                        │
│                                                             │
│  • System Overview  • Error Metrics  • Health Status       │
│  • Recovery Status  • Active Alerts  • Trends              │
│  • Real-time Updates • Export Options • Recommendations     │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start 快速开始

### Basic Setup 基本设置

```typescript
import {
  MonitoringIntegration,
  ErrorHandlingCenter
} from './core/monitoring';

// Initialize error handling center
const errorHandlingCenter = new ErrorHandlingCenter();

// Create monitoring integration
const monitoring = new MonitoringIntegration(
  errorHandlingCenter,
  strategyManager,      // Optional
  pipelineExecutor,     // Optional
  config               // Optional, uses defaults
);

// Initialize and start monitoring
await monitoring.initialize();
await monitoring.start();

// Record errors
await monitoring.recordError(errorEvent);

// Get dashboard data
const dashboardData = monitoring.getDashboardData();
```

### Advanced Setup 高级设置

```typescript
import {
  MonitoringIntegration,
  DEFAULT_INTEGRATION_CONFIG
} from './core/monitoring';

const customConfig = {
  ...DEFAULT_INTEGRATION_CONFIG,
  errorMonitoring: {
    ...DEFAULT_INTEGRATION_CONFIG.errorMonitoring,
    collectionInterval: 15000,  // 15 seconds
    alertThresholds: {
      errorRate: 3,              // Lower threshold
      recoveryRate: 0.6,
      averageHandlingTime: 8000,
      consecutiveErrors: 2
    }
  },
  automatedRecovery: {
    ...DEFAULT_INTEGRATION_CONFIG.automatedRecovery,
    learningRate: 0.15,          // Faster learning
    maxRecoveryAttempts: 4
  },
  healthCheck: {
    ...DEFAULT_INTEGRATION_CONFIG.healthCheck,
    checkInterval: 20000,        // 20 seconds
    thresholds: {
      errorRate: 3,
      responseTime: 3000,
      availability: 97,
      memoryUsage: 75,
      cpuUsage: 65
    }
  },
  notifications: {
    ...DEFAULT_INTEGRATION_CONFIG.notifications,
    enabled: true,
    channels: ['webhook'],
    severityFilter: ['high', 'critical']
  }
};

const monitoring = new MonitoringIntegration(
  errorHandlingCenter,
  strategyManager,
  pipelineExecutor,
  customConfig,
  {
    onErrorRecorded: (event) => console.log('Error recorded:', event),
    onHealthStatusChanged: (status) => console.log('Health changed:', status),
    onAlertTriggered: (alert) => console.log('Alert triggered:', alert),
    onRecoveryActionExecuted: (action, result) => console.log('Recovery executed:', action, result),
    onDashboardUpdated: (data) => console.log('Dashboard updated:', data)
  }
);
```

## 📊 Core Components 核心组件

### 1. Error Monitor 错误监控器

**Purpose**: Comprehensive error tracking and metrics collection

**Features**:
- Real-time error event recording
- Error pattern analysis and classification
- Provider and module-specific metrics
- Recovery success rate tracking
- Alert generation based on thresholds
- Data export (JSON, CSV, Prometheus)

**Key Metrics**:
- Total errors and error rates
- Recovery success rates
- Average handling times
- Error type distribution
- Provider/module health scores

```typescript
// Record an error event
const errorEvent = {
  errorType: 'TimeoutError',
  errorMessage: 'Request timeout after 5000ms',
  severity: 'high',
  category: 'timeout',
  moduleId: 'qwen-provider',
  context: { providerId: 'qwen', endpoint: '...' },
  recoveryAttempted: false,
  handlingTime: 5200
};

await monitoring.recordError(errorEvent);

// Get current metrics
const metrics = monitoring.errorMonitor.getSystemMetrics();
console.log('Total errors:', metrics.totalErrors);
console.log('Recovery rate:', metrics.overallRecoveryRate);
```

### 2. Automated Recovery System 自动恢复系统

**Purpose**: Intelligent error recovery with adaptive learning

**Features**:
- Pattern-based error analysis
- Adaptive recovery strategies
- Machine learning for pattern evolution
- Self-healing capabilities
- Performance tracking and optimization

**Recovery Strategies**:
- **Retry**: Exponential backoff with adaptive parameters
- **Fallback**: Token refresh, provider switching
- **Circuit Breaker**: Failure threshold and recovery timeout
- **Config Adjustment**: Dynamic parameter tuning
- **Provider Switch**: Automatic failover

```typescript
// The system automatically triggers recovery for recorded errors
// Recovery patterns evolve based on success rates

// Get recovery system status
const recoveryStatus = monitoring.automatedRecovery.getStatus();
console.log('Active sessions:', recoveryStatus.sessions.active);
console.log('Success rate:', recoveryStatus.sessions.recentSuccessRate);

// Get detailed recovery report
const report = monitoring.automatedRecovery.getDetailedReport();
console.log('Pattern effectiveness:', report.patterns);
```

### 3. Health Check System 健康检查系统

**Purpose**: Continuous health monitoring with anomaly detection

**Features**:
- Multi-dimensional health assessments
- Real-time anomaly detection
- Trend analysis and prediction
- Provider and module health monitoring
- Automated health reporting

**Health Dimensions**:
- Error rates and patterns
- Response times and availability
- Resource usage (CPU, memory)
- Recovery effectiveness
- System stability

```typescript
// Force immediate health check
const healthResults = await monitoring.forceHealthCheck();

// Get current health status
const healthStatus = monitoring.healthCheckSystem.getSystemHealthSummary();
console.log('Overall status:', healthStatus.overallStatus);
console.log('Health score:', healthStatus.overallScore);

// Get health trends
const trends = monitoring.healthCheckSystem.getHealthTrends();
```

## 📈 Unified Dashboard 统一仪表板

The unified dashboard provides a comprehensive view of system health and performance.

### Dashboard Data Structure

```typescript
interface UnifiedDashboardData {
  systemOverview: {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    score: number;           // 0-100
    uptime: number;
    lastUpdated: number;
  };
  errorMetrics: {
    totalErrors: number;
    errorRate: number;       // errors per minute
    recoveryRate: number;    // 0-1
    averageHandlingTime: number;
    topErrorTypes: Array<{ type: string; count: number; percentage: number }>;
  };
  healthStatus: {
    providers: Array<{ id: string; name: string; status: string; score: number }>;
    modules: Array<{ id: string; name: string; status: string; score: number }>;
  };
  recovery: {
    activeSessions: number;
    totalSessions: number;
    successRate: number;
    averageRecoveryTime: number;
    topStrategies: Array<{ strategy: string; effectiveness: number; usage: number }>;
  };
  alerts: Array<{
    id: string;
    type: string;
    severity: ErrorSeverity;
    message: string;
    timestamp: number;
    resolved: boolean;
  }>;
  trends: {
    errorRate: Array<{ time: number; value: number }>;
    healthScore: Array<{ time: number; value: number }>;
    recoveryRate: Array<{ time: number; value: number }>;
  };
}
```

### Accessing Dashboard Data

```typescript
// Get current dashboard data
const dashboard = monitoring.getDashboardData();

// System overview
console.log(`System status: ${dashboard.systemOverview.status}`);
console.log(`Health score: ${dashboard.systemOverview.score}/100`);

// Error metrics
console.log(`Error rate: ${dashboard.errorMetrics.errorRate}/min`);
console.log(`Recovery rate: ${(dashboard.errorMetrics.recoveryRate * 100).toFixed(1)}%`);

// Health status
dashboard.healthStatus.providers.forEach(provider => {
  console.log(`${provider.name}: ${provider.score}/100 (${provider.status})`);
});

// Active alerts
const activeAlerts = dashboard.alerts.filter(alert => !alert.resolved);
console.log(`Active alerts: ${activeAlerts.length}`);
```

## 🔔 Event Handling 事件处理

The monitoring system provides comprehensive event handling for real-time integration.

### Available Events 可用事件

```typescript
const eventHandlers = {
  onErrorRecorded: (event: ErrorEvent) => {
    console.log('Error recorded:', event.errorType, event.moduleId);
  },

  onHealthStatusChanged: (status: HealthStatus) => {
    console.log('Health status changed:', status.status, status.score);
  },

  onAlertTriggered: (alert: Alert) => {
    console.log('Alert triggered:', alert.type, alert.severity, alert.message);
  },

  onRecoveryActionExecuted: (action: RecoveryAction, result: any) => {
    console.log('Recovery action:', action.type, 'Success:', result.success);
  },

  onDashboardUpdated: (data: UnifiedDashboardData) => {
    console.log('Dashboard updated - Health score:', data.systemOverview.score);
  }
};
```

### Event Handler Setup 事件处理器设置

```typescript
const monitoring = new MonitoringIntegration(
  errorHandlingCenter,
  strategyManager,
  pipelineExecutor,
  config,
  eventHandlers
);
```

## 📤 Data Export 数据导出

The monitoring system supports multiple export formats for external integration.

### Export Formats 导出格式

```typescript
// Export as JSON
const jsonData = monitoring.exportData('json');
// Returns: JSON string with all dashboard data

// Export as CSV
const csvData = monitoring.exportData('csv');
// Returns: CSV format with key metrics

// Export as Prometheus
const prometheusData = monitoring.exportData('prometheus');
// Returns: Prometheus-compatible metrics format
```

### Prometheus Export Example

```text
# HELP rcc_monitoring_total_errors Total number of errors
# TYPE rcc_monitoring_total_errors counter
rcc_monitoring_total_errors 42

# HELP rcc_monitoring_error_rate Current error rate per minute
# TYPE rcc_monitoring_error_rate gauge
rcc_monitoring_error_rate 2.5

# HELP rcc_monitoring_recovery_rate Overall recovery rate
# TYPE rcc_monitoring_recovery_rate gauge
rcc_monitoring_recovery_rate 0.78

# HELP rcc_monitoring_health_score System health score (0-100)
# TYPE rcc_monitoring_health_score gauge
rcc_monitoring_health_score 85.3
```

## 📋 Configuration Options 配置选项

### Error Monitoring Configuration

```typescript
interface MonitoringConfig {
  enabled: boolean;
  collectionInterval: number;     // milliseconds
  retentionPeriod: number;        // milliseconds
  alertThresholds: {
    errorRate: number;            // errors per minute
    recoveryRate: number;         // minimum recovery rate
    averageHandlingTime: number;  // maximum handling time
    consecutiveErrors: number;    // maximum consecutive errors
  };
  healthCheck: {
    enabled: boolean;
    interval: number;             // milliseconds
    timeout: number;              // milliseconds
    providers: string[];
    modules: string[];
  };
  notifications: {
    enabled: boolean;
    severityFilter: ErrorSeverity[];
  };
}
```

### Automated Recovery Configuration

```typescript
interface AdaptiveRecoveryConfig {
  enabled: boolean;
  learningRate: number;           // 0-1
  minConfidenceThreshold: number; // 0-1
  maxRecoveryAttempts: number;
  adaptiveTimeout: boolean;
  performanceTracking: boolean;
  patternEvolution: boolean;
  selfHealing: boolean;
}
```

### Health Check Configuration

```typescript
interface HealthCheckConfig {
  enabled: boolean;
  checkInterval: number;          // milliseconds
  timeout: number;                // milliseconds
  retryAttempts: number;
  thresholds: {
    errorRate: number;            // errors per minute
    responseTime: number;         // milliseconds
    availability: number;         // percentage 0-100
    memoryUsage: number;          // percentage 0-100
    cpuUsage: number;             // percentage 0-100
  };
  providers: string[];
  modules: string[];
  anomalyDetection: {
    enabled: boolean;
    sensitivity: number;         // 0-1
    windowSize: number;           // data points
    alertThreshold: number;       // standard deviations
  };
}
```

## 🧪 Testing and Examples 测试和示例

### Running the Example 运行示例

```typescript
import { runMonitoringExample } from './core/monitoring/MonitoringUsageExample';

// Run the complete monitoring example
await runMonitoringExample();
```

### Example Output 示例输出

```
🚀 Starting RCC Pipeline Monitoring System Example

🚀 Initializing RCC Pipeline Monitoring System...
✅ Monitoring system initialized and started successfully

📊 Demonstrating monitoring capabilities...

📝 Simulating error events...
  📝 Recorded error: TimeoutError for qwen-provider
  📝 Recorded error: AuthenticationError for iflow-provider
  📝 Recorded error: RateLimitError for qwen-provider
  ✅ Recorded 3 error events

📊 Current Dashboard Data:
============================================================

🖥️  System Overview:
   Status: DEGRADED
   Health Score: 72.5/100
   Uptime: 2m 15s
   Last Updated: 2024-01-15 10:30:25

📈 Error Metrics:
   Total Errors: 3
   Error Rate: 1.33/min
   Recovery Rate: 33.3%
   Avg Handling Time: 4,900ms

   Top Error Types:
     1. TimeoutError: 1 (33.3%)
     2. AuthenticationError: 1 (33.3%)
     3. RateLimitError: 1 (33.3%)

💚 Health Status:
   Providers (2):
     ✅ Qwen Provider: 85.0/100
     ⚠️ IFlow Provider: 65.0/100

   Modules (2):
     ✅ LLM Switch: 90.0/100
     ✅ Workflow: 88.0/100

🔄 Recovery Status:
   Active Sessions: 1
   Total Sessions: 3
   Success Rate: 66.7%
   Avg Recovery Time: 5,200ms

   Top Recovery Strategies:
     1. retry: 85.0% effective (12 uses)
     2. fallback: 70.0% effective (8 uses)

🚨 Active Alerts:
   🟠 health_check: Degraded component detected: IFlow Provider
   🟡 error_rate: Error rate threshold exceeded

============================================================
```

## 🔧 Integration with Pipeline Architecture 与流水线架构集成

### Integrating with Modular Pipeline Executor

```typescript
import { ModularPipelineExecutor } from './core/ModularPipelineExecutor';
import { MonitoringIntegration } from './core/monitoring';

// Create pipeline executor
const pipelineExecutor = new ModularPipelineExecutor();

// Create monitoring integration
const monitoring = new MonitoringIntegration(
  errorHandlingCenter,
  strategyManager,
  pipelineExecutor,
  config
);

// Initialize both systems
await pipelineExecutor.initialize(wrapper);
await monitoring.initialize();

// Errors from pipeline execution are automatically recorded
// and trigger recovery mechanisms when appropriate
```

### Error Event Integration

```typescript
// In your pipeline modules, record errors for monitoring
class PipelineModule {
  async execute(request: any, context: any) {
    try {
      // Execute pipeline logic
      return await this.processRequest(request);
    } catch (error) {
      // Record error for monitoring
      await monitoring.recordError({
        errorType: error.constructor.name,
        errorMessage: error.message,
        severity: this.determineSeverity(error),
        category: this.categorizeError(error),
        moduleId: this.moduleId,
        context: { request, ...context },
        recoveryAttempted: false,
        handlingTime: Date.now() - startTime
      });

      throw error;
    }
  }
}
```

## 📊 Performance Considerations 性能考虑

### Optimization Tips 优化建议

1. **Configure Appropriate Intervals**: Balance real-time monitoring with performance overhead
2. **Use Retention Periods**: Prevent memory bloat by setting appropriate data retention
3. **Monitor Overhead**: Track the monitoring system's own resource usage
4. **Batch Operations**: Group related operations to reduce overhead
5. **Asynchronous Processing**: Use async/await for non-blocking operations

### Resource Usage 资源使用

- **Memory**: ~50-100MB baseline, scales with data retention period
- **CPU**: ~1-5% baseline, spikes during health checks and data processing
- **Network**: Minimal, unless using remote notifications or exports
- **Storage**: Configurable, typically 100MB-1GB for 24-hour retention

## 🔍 Troubleshooting 故障排除

### Common Issues 常见问题

**High Memory Usage**
```typescript
// Reduce retention period
config.errorMonitoring.retentionPeriod = 3600000; // 1 hour instead of 24 hours
```

**Too Many Alerts**
```typescript
// Adjust alert thresholds
config.errorMonitoring.alertThresholds = {
  errorRate: 10,    // Increase from 5 to 10 errors/min
  recoveryRate: 0.3, // Decrease from 0.5 to 0.3
  consecutiveErrors: 5 // Increase from 3 to 5
};
```

**Slow Performance**
```typescript
// Increase collection intervals
config.errorMonitoring.collectionInterval = 60000; // 1 minute instead of 30 seconds
config.healthCheck.checkInterval = 120000;         // 2 minutes instead of 30 seconds
```

### Debug Mode 调试模式

```typescript
// Enable detailed logging
const debugConfig = {
  ...config,
  errorMonitoring: {
    ...config.errorMonitoring,
    notifications: {
      enabled: true,
      severityFilter: ['low', 'medium', 'high', 'critical'] // All severities
    }
  }
};
```

## 📝 API Reference API参考

### MonitoringIntegration Class

#### Constructor
```typescript
constructor(
  errorHandlingCenter: ErrorHandlingCenter,
  strategyManager?: StrategyManager,
  pipelineExecutor?: IModularPipelineExecutor,
  config?: MonitoringIntegrationConfig,
  eventHandlers?: MonitoringEventHandlers
)
```

#### Methods
```typescript
// Lifecycle
async initialize(): Promise<void>
async start(): Promise<void>
async stop(): Promise<void>
async destroy(): Promise<void>

// Data access
getDashboardData(): UnifiedDashboardData
getComprehensiveReport(timeRange?: TimeRange): ComprehensiveReport
exportData(format: 'json' | 'csv' | 'prometheus'): string
getSystemStatus(): SystemStatus

// Operations
async recordError(event: ErrorEvent): Promise<void>
async forceHealthCheck(): Promise<HealthCheckResult[]>
```

### ErrorEvent Interface

```typescript
interface ErrorEvent {
  errorId: string;
  timestamp: number;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  moduleId: string;
  moduleName: string;
  component: string;
  operationId?: string;
  sessionId?: string;
  pipelineStage?: string;
  context: Record<string, any>;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  strategyUsed?: string;
  handlingTime: number;
}
```

## 📄 License 许可证

This monitoring system is part of the RCC Pipeline System and is licensed under the same terms as the main project.

## 🤝 Contributing 贡献

Contributions are welcome! Please see the main project's contributing guidelines for details.

---

**RCC Pipeline Monitoring System** - Enterprise-grade monitoring for intelligent pipeline management