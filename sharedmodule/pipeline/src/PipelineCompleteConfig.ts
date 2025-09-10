/**
 * Complete pipeline system configuration interfaces
 * Based on the configuration requirements document
 */

import { PipelineErrorCode } from './ErrorTypes';

// ===== Pipeline Assembly Configuration =====

/**
 * Complete pipeline assembly table configuration
 */
export interface PipelineAssemblyTable {
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

/**
 * Routing rule configuration
 */
export interface RoutingRule {
  ruleId: string;
  name: string;
  priority: number;
  enabled: boolean;
  
  // Route conditions
  conditions: RouteCondition[];
  
  // Pipeline selection strategy
  pipelineSelection: {
    strategy: 'fixed' | 'weighted' | 'custom';
    targetPipelineIds?: string[];
    weights?: Record<string, number>;
    customSelector?: string;
  };
  
  // Module filters
  moduleFilters: ModuleFilter[];
  
  // Dynamic configuration
  dynamicConfig: {
    enableAdaptiveRouting: boolean;
    performanceThresholds: {
      maxResponseTime: number;
      minSuccessRate: number;
      maxErrorRate: number;
    };
  };
}

/**
 * Route condition interface
 */
export interface RouteCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR';
  weight?: number;
  description?: string;
}

/**
 * Condition operators
 */
export enum ConditionOperator {
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

/**
 * Module filter configuration
 */
export interface ModuleFilter {
  moduleTypes?: string[];
  capabilities?: string[];
  performanceRequirements?: {
    maxResponseTime: number;
    minSuccessRate: number;
    maxMemoryUsage: number;
  };
  tags?: string[];
  customFilter?: {
    functionName: string;
    parameters: Record<string, any>;
  };
}

/**
 * Pipeline template configuration
 */
export interface PipelineTemplate {
  templateId: string;
  name: string;
  description: string;
  version: string;
  
  // Base pipeline configuration
  baseConfig: PipelineBaseConfig;
  
  // Module assembly configuration
  moduleAssembly: ModuleAssemblyConfig;
  
  // Execution strategy
  executionStrategy: {
    mode: 'sequential' | 'parallel' | 'conditional';
    maxConcurrency?: number;
    timeout?: number;
    retryPolicy?: RetryPolicy;
  };
  
  // Conditional branches
  conditionalBranches?: ConditionalBranch[];
  
  // Data flow configuration
  dataFlow: DataFlowConfig;
}

/**
 * Pipeline base configuration
 */
export interface PipelineBaseConfig {
  timeout?: number;
  maxConcurrentRequests?: number;
  priority: number;
  enabled: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Module assembly configuration
 */
export interface ModuleAssemblyConfig {
  moduleInstances: ModuleInstanceConfig[];
  connections: ModuleConnection[];
  dataMappings: DataMapping[];
  conditions: ModuleCondition[];
}

/**
 * Module instance configuration
 */
export interface ModuleInstanceConfig {
  instanceId: string;
  moduleId: string;
  name: string;
  
  // Initialization configuration
  initialization: {
    config: Record<string, any>;
    dependencies?: string[];
    startupOrder: number;
    required: boolean;
  };
  
  // Execution configuration
  execution: {
    timeout?: number;
    retryPolicy?: RetryPolicy;
    circuitBreaker?: CircuitBreakerConfig;
    healthCheck?: HealthCheckConfig;
  };
  
  // Conditions
  conditions: {
    enableConditions?: ModuleCondition[];
    skipConditions?: ModuleCondition[];
  };
}

/**
 * Module connection configuration
 */
export interface ModuleConnection {
  id: string;
  from: string;
  to: string;
  type: 'success' | 'error' | 'timeout' | 'conditional';
  conditions?: ModuleCondition[];
  dataMapping?: DataMapping;
  priority?: number;
}

/**
 * Data mapping configuration
 */
export interface DataMapping {
  sourcePath: string;
  targetPath: string;
  transform?: string; // Transform function name
  defaultValue?: any;
  required: boolean;
}

/**
 * Module condition configuration
 */
export interface ModuleCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

/**
 * Conditional branch configuration
 */
export interface ConditionalBranch {
  branchId: string;
  name: string;
  conditions: ModuleCondition[];
  targetPipelineId: string;
  priority: number;
}

/**
 * Data flow configuration
 */
export interface DataFlowConfig {
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  intermediateSchemas?: Record<string, any>;
  validation: {
    enabled: boolean;
    strict: boolean;
    customValidators?: string[];
  };
}

/**
 * Assembly strategy configuration
 */
export interface AssemblyStrategy {
  strategyId: string;
  name: string;
  description: string;
  algorithm: 'dynamic' | 'static' | 'hybrid';
  config: Record<string, any>;
  selectionCriteria: {
    performance: boolean;
    cost: boolean;
    reliability: boolean;
    custom?: string[];
  };
}

/**
 * Module registry configuration
 */
export interface ModuleRegistry {
  moduleId: string;
  name: string;
  version: string;
  type: string;
  description: string;
  capabilities: string[];
  dependencies?: string[];
  configSchema: Record<string, any>;
  initializationConfig: Record<string, any>;
  healthCheckConfig?: HealthCheckConfig;
  tags?: string[];
  metadata?: Record<string, any>;
}

// ===== Scheduler Configuration =====

/**
 * Complete scheduler configuration
 */
export interface PipelineSchedulerConfig {
  basic: {
    schedulerId: string;
    name: string;
    version: string;
    description: string;
  };
  
  loadBalancing: LoadBalancingConfig;
  healthCheck: HealthCheckConfig;
  errorHandling: ErrorHandlingConfig;
  performance: PerformanceConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

/**
 * Load balancing configuration
 */
export interface LoadBalancingConfig {
  strategy: 'roundrobin' | 'weighted' | 'least_connections' | 'random' | 'custom';
  
  strategyConfig: {
    roundRobin?: {
      enableStickySessions: boolean;
      sessionTimeout: number;
    };
    
    weighted?: {
      weights: Record<string, number>;
      enableDynamicWeightAdjustment: boolean;
      weightAdjustmentInterval: number;
    };
    
    leastConnections?: {
      maxConnectionsPerInstance: number;
      connectionTimeout: number;
    };
    
    custom?: {
      selectorFunction: string;
      config: Record<string, any>;
    };
  };
  
  failover: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
    enableCircuitBreaker: boolean;
  };
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  strategy: 'passive' | 'active' | 'hybrid';
  
  intervals: {
    activeCheckInterval: number;
    passiveCheckInterval: number;
    fullCheckInterval: number;
  };
  
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
  
  thresholds: {
    healthyThreshold: number;
    unhealthyThreshold: number;
    degradationThreshold: number;
  };
  
  recovery: {
    autoRecovery: boolean;
    recoveryStrategies: RecoveryStrategy[];
    maxRecoveryAttempts: number;
  };
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  errorClassification: {
    enableAutomaticClassification: boolean;
    customClassifiers: ErrorClassifierConfig[];
  };
  
  strategies: {
    unrecoverableErrors: {
      action: 'destroy_pipeline' | 'mark_as_failed' | 'quarantine';
      notificationEnabled: boolean;
      logLevel: 'error' | 'warn' | 'info';
    };
    
    recoverableErrors: {
      action: 'retry' | 'blacklist_temporary' | 'degrade_service';
      maxRetryAttempts: number;
      blacklistDuration: number;
      exponentialBackoff: boolean;
    };
    
    authenticationErrors: {
      action: 'enter_maintenance' | 'refresh_credentials' | 'disable_pipeline';
      maintenanceDuration: number;
      credentialRefreshFunction?: string;
    };
    
    networkErrors: {
      action: 'retry_with_backoff' | 'switch_pipeline' | 'buffer_requests';
      maxRetryAttempts: number;
      backoffMultiplier: number;
      bufferSize: number;
    };
  };
  
  blacklist: {
    enabled: boolean;
    maxEntries: number;
    defaultDuration: number;
    maxDuration: number;
    cleanupInterval: number;
    autoExpiry: boolean;
  };
  
  reporting: {
    enableDetailedReporting: boolean;
    reportInterval: number;
    includeStackTraces: boolean;
    includeContext: boolean;
    customReporters: string[];
  };
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  concurrency: {
    maxConcurrentRequests: number;
    maxConcurrentRequestsPerPipeline: number;
    queueSize: number;
    enablePriorityQueue: boolean;
  };
  
  timeouts: {
    defaultTimeout: number;
    executionTimeout: number;
    idleTimeout: number;
    startupTimeout: number;
    shutdownTimeout: number;
  };
  
  caching: {
    enabled: boolean;
    strategy: 'lru' | 'lfu' | 'fifo';
    maxSize: number;
    ttl: number;
  };
  
  rateLimiting: {
    enabled: boolean;
    strategy: 'token_bucket' | 'sliding_window' | 'fixed_window';
    requestsPerSecond: number;
    burstSize: number;
  };
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
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
  
  logging: {
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text' | 'structured';
    outputs: LogOutput[];
    sampling: {
      enabled: boolean;
      rate: number;
    };
  };
  
  tracing: {
    enabled: boolean;
    samplingRate: number;
    includePayloads: boolean;
    customSpans: string[];
  };
  
  alerts: {
    enabled: boolean;
    rules: AlertRule[];
    channels: AlertChannel[];
  };
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  authentication: {
    enabled: boolean;
    method: 'jwt' | 'oauth' | 'api_key' | 'custom';
    config: Record<string, any>;
  };
  
  authorization: {
    enabled: boolean;
    roles: string[];
    permissions: Record<string, string[]>;
  };
  
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyRotationInterval: number;
  };
  
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burstSize: number;
  };
}

// ===== Supporting Interfaces =====

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTime: number;
  requestVolumeThreshold: number;
  timeout: number;
}

/**
 * Health check configuration (specific)
 */
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  endpoint?: string;
  expectedStatusCode?: number;
  customHealthCheck?: string;
}

/**
 * Error classifier configuration
 */
export interface ErrorClassifierConfig {
  name: string;
  errorCodeRanges: number[];
  classificationRules: ClassificationRule[];
  action: string;
}

/**
 * Classification rule configuration
 */
export interface ClassificationRule {
  field: string;
  operator: ConditionOperator;
  value: any;
  classification: {
    category: string;
    severity: string;
    recoverability: string;
  };
}

/**
 * Recovery strategy configuration
 */
export interface RecoveryStrategy {
  strategyId: string;
  name: string;
  conditions: ModuleCondition[];
  actions: RecoveryAction[];
  priority: number;
}

/**
 * Recovery action configuration
 */
export interface RecoveryAction {
  type: 'restart' | 'reconfigure' | 'scale' | 'migrate' | 'notify';
  parameters: Record<string, any>;
  timeout: number;
}

/**
 * Metric configuration
 */
export interface MetricConfig {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  labels: Record<string, string>;
  buckets?: number[];
}

/**
 * Log output configuration
 */
export interface LogOutput {
  type: 'console' | 'file' | 'network' | 'custom';
  config: Record<string, any>;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  format?: string;
}

/**
 * Alert rule configuration
 */
export interface AlertRule {
  ruleId: string;
  name: string;
  condition: string;
  threshold: number;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];
}

/**
 * Alert channel configuration
 */
export interface AlertChannel {
  channelId: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
}

// ===== Configuration Validation =====

/**
 * Configuration validation result
 */
export interface CompleteConfigValidationResult {
  isValid: boolean;
  errors: ConfigError[];
  warnings: ConfigWarning[];
  recommendations: ConfigRecommendation[];
}

/**
 * Configuration error
 */
export interface ConfigError {
  field: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestion?: string;
}

/**
 * Configuration warning
 */
export interface ConfigWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Configuration recommendation
 */
export interface ConfigRecommendation {
  field: string;
  current: any;
  recommended: any;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

// ===== Configuration Factory =====

/**
 * Configuration factory for creating default configurations
 */
export class PipelineConfigFactory {
  /**
   * Create default pipeline assembly table
   */
  static createDefaultAssemblyTable(): PipelineAssemblyTable {
    return {
      version: '1.0.0',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Default pipeline assembly table',
        author: 'RCC System'
      },
      routingRules: [],
      pipelineTemplates: [],
      moduleRegistry: [],
      assemblyStrategies: []
    };
  }

  /**
   * Create default scheduler configuration
   */
  static createDefaultSchedulerConfig(): PipelineSchedulerConfig {
    return {
      basic: {
        schedulerId: 'default-scheduler',
        name: 'Default Scheduler',
        version: '1.0.0',
        description: 'Default pipeline scheduler configuration'
      },
      loadBalancing: {
        strategy: 'roundrobin',
        strategyConfig: {
          roundRobin: {
            enableStickySessions: false,
            sessionTimeout: 1800000
          }
        },
        failover: {
          enabled: true,
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2,
          enableCircuitBreaker: true
        }
      },
      healthCheck: {
        strategy: 'hybrid',
        intervals: {
          activeCheckInterval: 30000,
          passiveCheckInterval: 10000,
          fullCheckInterval: 300000
        },
        checks: {
          basic: {
            enabled: true,
            timeout: 5000
          },
          detailed: {
            enabled: false,
            timeout: 10000,
            includeMetrics: false,
            includeDependencies: false
          },
          custom: {
            enabled: false,
            checkFunction: '',
            parameters: {}
          }
        },
        thresholds: {
          healthyThreshold: 2,
          unhealthyThreshold: 3,
          degradationThreshold: 1
        },
        recovery: {
          autoRecovery: true,
          recoveryStrategies: [],
          maxRecoveryAttempts: 3
        }
      },
      errorHandling: {
        errorClassification: {
          enableAutomaticClassification: true,
          customClassifiers: []
        },
        strategies: {
          unrecoverableErrors: {
            action: 'destroy_pipeline',
            notificationEnabled: true,
            logLevel: 'error'
          },
          recoverableErrors: {
            action: 'blacklist_temporary',
            maxRetryAttempts: 3,
            blacklistDuration: 60000,
            exponentialBackoff: true
          },
          authenticationErrors: {
            action: 'enter_maintenance',
            maintenanceDuration: 300000
          },
          networkErrors: {
            action: 'retry_with_backoff',
            maxRetryAttempts: 3,
            backoffMultiplier: 2,
            bufferSize: 100
          }
        },
        blacklist: {
          enabled: true,
          maxEntries: 1000,
          defaultDuration: 60000,
          maxDuration: 3600000,
          cleanupInterval: 300000,
          autoExpiry: true
        },
        reporting: {
          enableDetailedReporting: true,
          reportInterval: 60000,
          includeStackTraces: true,
          includeContext: true,
          customReporters: []
        }
      },
      performance: {
        concurrency: {
          maxConcurrentRequests: 1000,
          maxConcurrentRequestsPerPipeline: 100,
          queueSize: 5000,
          enablePriorityQueue: true
        },
        timeouts: {
          defaultTimeout: 30000,
          executionTimeout: 60000,
          idleTimeout: 300000,
          startupTimeout: 60000,
          shutdownTimeout: 30000
        },
        caching: {
          enabled: false,
          strategy: 'lru',
          maxSize: 1000,
          ttl: 3600000
        },
        rateLimiting: {
          enabled: false,
          strategy: 'token_bucket',
          requestsPerSecond: 100,
          burstSize: 200
        }
      },
      monitoring: {
        metrics: {
          enabled: true,
          collectionInterval: 10000,
          metrics: [],
          aggregation: {
            enabled: true,
            interval: 60000,
            functions: ['avg', 'sum', 'count', 'max', 'min']
          }
        },
        logging: {
          level: 'info',
          format: 'json',
          outputs: [
            {
              type: 'console',
              config: {},
              level: 'info'
            }
          ],
          sampling: {
            enabled: false,
            rate: 1.0
          }
        },
        tracing: {
          enabled: false,
          samplingRate: 0.01,
          includePayloads: false,
          customSpans: []
        },
        alerts: {
          enabled: false,
          rules: [],
          channels: []
        }
      },
      security: {
        authentication: {
          enabled: false,
          method: 'jwt',
          config: {}
        },
        authorization: {
          enabled: false,
          roles: [],
          permissions: {}
        },
        encryption: {
          enabled: false,
          algorithm: 'aes-256-gcm',
          keyRotationInterval: 86400000
        },
        rateLimiting: {
          enabled: false,
          requestsPerMinute: 1000,
          burstSize: 100
        }
      }
    };
  }
}