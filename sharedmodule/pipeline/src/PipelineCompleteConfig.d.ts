/**
 * Complete pipeline system configuration interfaces
 * Based on the configuration requirements document
 */
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
    conditions: RouteCondition[];
    pipelineSelection: {
        strategy: 'fixed' | 'weighted' | 'custom';
        targetPipelineIds?: string[];
        weights?: Record<string, number>;
        customSelector?: string;
    };
    moduleFilters: ModuleFilter[];
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
export declare enum ConditionOperator {
    EQUALS = "equals",
    NOT_EQUALS = "not_equals",
    CONTAINS = "contains",
    NOT_CONTAINS = "not_contains",
    STARTS_WITH = "starts_with",
    ENDS_WITH = "ends_with",
    GREATER_THAN = "greater_than",
    LESS_THAN = "less_than",
    GREATER_EQUAL = "greater_equal",
    LESS_EQUAL = "less_equal",
    IN = "in",
    NOT_IN = "not_in",
    REGEX = "regex",
    CUSTOM = "custom"
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
    baseConfig: PipelineBaseConfig;
    moduleAssembly: ModuleAssemblyConfig;
    executionStrategy: {
        mode: 'sequential' | 'parallel' | 'conditional';
        maxConcurrency?: number;
        timeout?: number;
        retryPolicy?: RetryPolicy;
    };
    conditionalBranches?: ConditionalBranch[];
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
    initialization: {
        config: Record<string, any>;
        dependencies?: string[];
        startupOrder: number;
        required: boolean;
    };
    execution: {
        timeout?: number;
        retryPolicy?: RetryPolicy;
        circuitBreaker?: CircuitBreakerConfig;
        healthCheck?: HealthCheckConfig;
    };
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
    transform?: string;
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
/**
 * Configuration factory for creating default configurations
 */
export declare class PipelineConfigFactory {
    /**
     * Create default pipeline assembly table
     */
    static createDefaultAssemblyTable(): PipelineAssemblyTable;
    /**
     * Create default scheduler configuration
     */
    static createDefaultSchedulerConfig(): PipelineSchedulerConfig;
}
