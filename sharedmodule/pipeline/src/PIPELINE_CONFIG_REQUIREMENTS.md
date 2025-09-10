# Pipeline系统完整配置需求文档

## 1. 流水线组装表配置需求

### 1.1 流水线组装表输入格式

```typescript
interface PipelineAssemblyTable {
  version: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    description: string;
    author: string;
  };
  routingRules: RoutingRule[];
  pipelineTemplates: PipelineTemplate[];
  moduleRegistry: ModuleRegistry[];
  assemblyStrategies: AssemblyStrategy[];
}
```

### 1.2 路由规则配置

```typescript
interface RoutingRule {
  ruleId: string;
  name: string;
  priority: number;
  enabled: boolean;
  
  // 路由判断条件
  conditions: RouteCondition[];
  
  // 流水线选择策略
  pipelineSelection: {
    strategy: 'fixed' | 'weighted' | 'custom';
    targetPipelineIds?: string[];  // 固定策略使用
    weights?: Record<string, number>;  // 加权策略使用
    customSelector?: string;  // 自定义选择器函数名
  };
  
  // 模块过滤条件
  moduleFilters: ModuleFilter[];
  
  // 动态配置
  dynamicConfig: {
    enableAdaptiveRouting: boolean;
    performanceThresholds: {
      maxResponseTime: number;
      minSuccessRate: number;
      maxErrorRate: number;
    };
  };
}
```

### 1.3 流水线模板配置

```typescript
interface PipelineTemplate {
  templateId: string;
  name: string;
  description: string;
  version: string;
  
  // 流水线基本配置
  baseConfig: PipelineBaseConfig;
  
  // 模块组装配置
  moduleAssembly: ModuleAssemblyConfig;
  
  // 执行策略
  executionStrategy: {
    mode: 'sequential' | 'parallel' | 'conditional';
    maxConcurrency?: number;
    timeout?: number;
    retryPolicy?: RetryPolicy;
  };
  
  // 条件分支配置
  conditionalBranches?: ConditionalBranch[];
  
  // 数据流配置
  dataFlow: DataFlowConfig;
}
```

### 1.4 模块组装配置

```typescript
interface ModuleAssemblyConfig {
  // 模块实例化配置
  moduleInstances: ModuleInstanceConfig[];
  
  // 模块连接配置
  connections: ModuleConnection[];
  
  // 数据映射配置
  dataMappings: DataMapping[];
  
  // 条件配置
  conditions: ModuleCondition[];
}
```

### 1.5 模块实例配置

```typescript
interface ModuleInstanceConfig {
  instanceId: string;
  moduleId: string;
  name: string;
  
  // 模块初始化配置
  initialization: {
    config: Record<string, any>;  // 模块特定配置
    dependencies?: string[];      // 依赖的其他模块实例ID
    startupOrder: number;         // 启动顺序
    required: boolean;            // 是否必需模块
  };
  
  // 执行配置
  execution: {
    timeout?: number;
    retryPolicy?: RetryPolicy;
    circuitBreaker?: CircuitBreakerConfig;
    healthCheck?: HealthCheckConfig;
  };
  
  // 条件配置
  conditions: {
    enableConditions?: ModuleCondition[];
    skipConditions?: ModuleCondition[];
  };
}
```

### 1.6 判断字段配置

```typescript
interface RouteCondition {
  field: string;  // 判断字段路径，支持嵌套如 'request.headers.content-type'
  operator: ConditionOperator;
  value: any;
  
  // 逻辑组合
  logicalOperator?: 'AND' | 'OR';
  
  // 条件权重
  weight?: number;
  
  // 条件描述
  description?: string;
}

enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_EQUAL = 'greater_equal',
  LESS_EQUAL = 'less_equal',
  IN = 'in',
  NOT_IN = 'not_in',
  REGEX = 'regex',
  CUSTOM = 'custom'
}
```

### 1.7 模块过滤配置

```typescript
interface ModuleFilter {
  // 模块类型过滤
  moduleTypes?: string[];
  
  // 模块能力过滤
  capabilities?: string[];
  
  // 性能要求过滤
  performanceRequirements?: {
    maxResponseTime: number;
    minSuccessRate: number;
    maxMemoryUsage: number;
  };
  
  // 标签过滤
  tags?: string[];
  
  // 自定义过滤函数
  customFilter?: {
    functionName: string;
    parameters: Record<string, any>;
  };
}
```

## 2. 流水线调度配置需求

### 2.1 调度系统主配置

```typescript
interface PipelineSchedulerConfig {
  // 基础配置
  basic: {
    schedulerId: string;
    name: string;
    version: string;
    description: string;
  };
  
  // 负载均衡配置
  loadBalancing: LoadBalancingConfig;
  
  // 健康检查配置
  healthCheck: HealthCheckConfig;
  
  // 错误处理配置
  errorHandling: ErrorHandlingConfig;
  
  // 性能配置
  performance: PerformanceConfig;
  
  // 监控配置
  monitoring: MonitoringConfig;
  
  // 安全配置
  security: SecurityConfig;
}
```

### 2.2 负载均衡配置

```typescript
interface LoadBalancingConfig {
  // 策略选择
  strategy: 'roundrobin' | 'weighted' | 'least_connections' | 'random' | 'custom';
  
  // 策略特定配置
  strategyConfig: {
    // Round Robin配置
    roundRobin?: {
      enableStickySessions: boolean;
      sessionTimeout: number;
    };
    
    // 加权配置
    weighted?: {
      weights: Record<string, number>;
      enableDynamicWeightAdjustment: boolean;
      weightAdjustmentInterval: number;
    };
    
    // 最少连接配置
    leastConnections?: {
      maxConnectionsPerInstance: number;
      connectionTimeout: number;
    };
    
    // 自定义配置
    custom?: {
      selectorFunction: string;
      config: Record<string, any>;
    };
  };
  
  // 故障转移配置
  failover: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
    enableCircuitBreaker: boolean;
  };
}
```

### 2.3 健康检查配置

```typescript
interface HealthCheckConfig {
  // 检查策略
  strategy: 'passive' | 'active' | 'hybrid';
  
  // 检查间隔
  intervals: {
    activeCheckInterval: number;
    passiveCheckInterval: number;
    fullCheckInterval: number;
  };
  
  // 检查配置
  checks: {
    basic: {
      enabled: boolean;
      timeout: number;
      endpoint?: string;
    };
    
    detailed: {
      enabled: boolean;
      timeout: number;
      includeMetrics: boolean;
      includeDependencies: boolean;
    };
    
    custom: {
      enabled: boolean;
      checkFunction: string;
      parameters: Record<string, any>;
    };
  };
  
  // 健康阈值配置
  thresholds: {
    healthyThreshold: number;
    unhealthyThreshold: number;
    degradationThreshold: number;
  };
  
  // 恢复配置
  recovery: {
    autoRecovery: boolean;
    recoveryStrategies: RecoveryStrategy[];
    maxRecoveryAttempts: number;
  };
}
```

### 2.4 错误处理配置

```typescript
interface ErrorHandlingConfig {
  // 错误分类配置
  errorClassification: {
    enableAutomaticClassification: boolean;
    customClassifiers: ErrorClassifierConfig[];
  };
  
  // 错误处理策略
  strategies: {
    // 不可恢复错误处理
    unrecoverableErrors: {
      action: 'destroy_pipeline' | 'mark_as_failed' | 'quarantine';
      notificationEnabled: boolean;
      logLevel: 'error' | 'warn' | 'info';
    };
    
    // 可恢复错误处理
    recoverableErrors: {
      action: 'retry' | 'blacklist_temporary' | 'degrade_service';
      maxRetryAttempts: number;
      blacklistDuration: number;
      exponentialBackoff: boolean;
    };
    
    // 认证错误处理
    authenticationErrors: {
      action: 'enter_maintenance' | 'refresh_credentials' | 'disable_pipeline';
      maintenanceDuration: number;
      credentialRefreshFunction?: string;
    };
    
    // 网络错误处理
    networkErrors: {
      action: 'retry_with_backoff' | 'switch_pipeline' | 'buffer_requests';
      maxRetryAttempts: number;
      backoffMultiplier: number;
      bufferSize: number;
    };
  };
  
  // 黑名单配置
  blacklist: {
    enabled: boolean;
    maxEntries: number;
    defaultDuration: number;
    maxDuration: number;
    cleanupInterval: number;
    autoExpiry: boolean;
  };
  
  // 错误报告配置
  reporting: {
    enableDetailedReporting: boolean;
    reportInterval: number;
    includeStackTraces: boolean;
    includeContext: boolean;
    customReporters: string[];
  };
}
```

### 2.5 性能配置

```typescript
interface PerformanceConfig {
  // 并发控制
  concurrency: {
    maxConcurrentRequests: number;
    maxConcurrentRequestsPerPipeline: number;
    queueSize: number;
    enablePriorityQueue: boolean;
  };
  
  // 超时配置
  timeouts: {
    defaultTimeout: number;
    executionTimeout: number;
    idleTimeout: number;
    startupTimeout: number;
    shutdownTimeout: number;
  };
  
  // 缓存配置
  caching: {
    enabled: boolean;
    strategy: 'lru' | 'lfu' | 'fifo';
    maxSize: number;
    ttl: number;
  };
  
  // 限流配置
  rateLimiting: {
    enabled: boolean;
    strategy: 'token_bucket' | 'sliding_window' | 'fixed_window';
    requestsPerSecond: number;
    burstSize: number;
  };
}
```

### 2.6 监控配置

```typescript
interface MonitoringConfig {
  // 指标收集
  metrics: {
    enabled: boolean;
    collectionInterval: number;
    metrics: MetricConfig[];
    aggregation: {
      enabled: boolean;
      interval: number;
      functions: string[];
    };
  };
  
  // 日志配置
  logging: {
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text' | 'structured';
    outputs: LogOutput[];
    sampling: {
      enabled: boolean;
      rate: number;
    };
  };
  
  // 追踪配置
  tracing: {
    enabled: boolean;
    samplingRate: number;
    includePayloads: boolean;
    customSpans: string[];
  };
  
  // 告警配置
  alerts: {
    enabled: boolean;
    rules: AlertRule[];
    channels: AlertChannel[];
  };
}
```

## 3. 完整配置示例

### 3.1 流水线组装表示例

```json
{
  "version": "1.0.0",
  "metadata": {
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "description": "API处理流水线组装表",
    "author": "RCC System"
  },
  "routingRules": [
    {
      "ruleId": "api-request-routing",
      "name": "API请求路由规则",
      "priority": 1,
      "enabled": true,
      "conditions": [
        {
          "field": "request.method",
          "operator": "in",
          "value": ["GET", "POST", "PUT", "DELETE"]
        },
        {
          "field": "request.headers.content-type",
          "operator": "contains",
          "value": "application/json"
        }
      ],
      "pipelineSelection": {
        "strategy": "weighted",
        "weights": {
          "api-pipeline-v1": 70,
          "api-pipeline-v2": 30
        }
      },
      "moduleFilters": [
        {
          "moduleTypes": ["api-handler", "data-processor"],
          "capabilities": ["json-processing", "error-handling"]
        }
      ]
    }
  ],
  "pipelineTemplates": [
    {
      "templateId": "api-pipeline-v1",
      "name": "API处理流水线v1",
      "description": "标准的API请求处理流水线",
      "version": "1.0.0",
      "baseConfig": {
        "timeout": 30000,
        "maxConcurrentRequests": 100,
        "retryPolicy": {
          "maxRetries": 3,
          "baseDelay": 1000,
          "maxDelay": 10000
        }
      },
      "moduleAssembly": {
        "moduleInstances": [
          {
            "instanceId": "auth-validator",
            "moduleId": "authentication-module",
            "name": "认证验证器",
            "initialization": {
              "config": {
                "validateTokens": true,
                "tokenExpiryCheck": true
              },
              "startupOrder": 1,
              "required": true
            },
            "execution": {
              "timeout": 5000,
              "healthCheck": {
                "enabled": true,
                "interval": 30000
              }
            }
          },
          {
            "instanceId": "data-processor",
            "moduleId": "data-processing-module",
            "name": "数据处理器",
            "initialization": {
              "config": {
                "enableValidation": true,
                "maxDataSize": 10485760
              },
              "startupOrder": 2,
              "required": true
            }
          }
        ],
        "connections": [
          {
            "from": "auth-validator",
            "to": "data-processor",
            "type": "success",
            "dataMapping": {
              "userId": "auth-validator.result.userId",
              "permissions": "auth-validator.result.permissions"
            }
          }
        ]
      }
    }
  ]
}
```

### 3.2 调度系统配置示例

```json
{
  "basic": {
    "schedulerId": "main-scheduler",
    "name": "主调度器",
    "version": "1.0.0",
    "description": "主要流水线调度系统"
  },
  "loadBalancing": {
    "strategy": "weighted",
    "strategyConfig": {
      "weighted": {
        "weights": {
          "api-pipeline-v1": 70,
          "api-pipeline-v2": 30
        },
        "enableDynamicWeightAdjustment": true,
        "weightAdjustmentInterval": 60000
      }
    },
    "failover": {
      "enabled": true,
      "maxRetries": 3,
      "retryDelay": 1000,
      "backoffMultiplier": 2,
      "enableCircuitBreaker": true
    }
  },
  "healthCheck": {
    "strategy": "hybrid",
    "intervals": {
      "activeCheckInterval": 30000,
      "passiveCheckInterval": 10000,
      "fullCheckInterval": 300000
    },
    "checks": {
      "basic": {
        "enabled": true,
        "timeout": 5000,
        "endpoint": "/health"
      },
      "detailed": {
        "enabled": true,
        "timeout": 10000,
        "includeMetrics": true,
        "includeDependencies": true
      }
    },
    "thresholds": {
      "healthyThreshold": 2,
      "unhealthyThreshold": 3,
      "degradationThreshold": 1
    }
  },
  "errorHandling": {
    "strategies": {
      "unrecoverableErrors": {
        "action": "destroy_pipeline",
        "notificationEnabled": true,
        "logLevel": "error"
      },
      "recoverableErrors": {
        "action": "blacklist_temporary",
        "maxRetryAttempts": 3,
        "blacklistDuration": 60000,
        "exponentialBackoff": true
      },
      "authenticationErrors": {
        "action": "enter_maintenance",
        "maintenanceDuration": 300000
      }
    },
    "blacklist": {
      "enabled": true,
      "maxEntries": 1000,
      "defaultDuration": 60000,
      "maxDuration": 3600000,
      "cleanupInterval": 300000
    }
  },
  "performance": {
    "concurrency": {
      "maxConcurrentRequests": 1000,
      "maxConcurrentRequestsPerPipeline": 100,
      "queueSize": 5000,
      "enablePriorityQueue": true
    },
    "timeouts": {
      "defaultTimeout": 30000,
      "executionTimeout": 60000,
      "idleTimeout": 300000
    }
  }
}
```

## 4. 配置验证规则

### 4.1 必需字段验证
- 路由规则必须有唯一的ruleId
- 流水线模板必须有templateId和name
- 模块实例必须有instanceId和moduleId
- 调度器必须有schedulerId

### 4.2 数据类型验证
- 权重值必须在0-100之间
- 超时时间必须为正数
- 端口号必须在有效范围内
- URL格式必须正确

### 4.3 业务逻辑验证
- 权重总和必须等于100
- 模块依赖不能形成循环
- 健康检查间隔必须合理
- 重试次数不能超过上限

### 4.4 引用完整性验证
- 引用的模块必须在注册表中存在
- 连接的目标实例必须存在
- 自定义函数必须可调用
- 配置文件路径必须有效

这个配置需求文档提供了Pipeline系统所需的完整配置结构，包括流水线组装表和调度系统的详细配置要求。