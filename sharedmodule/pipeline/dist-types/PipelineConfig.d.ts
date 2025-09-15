/**
 * Pipeline configuration management
 */
import { ErrorHandlingStrategy } from './ErrorTypes';
/**
 * Pipeline configuration interface
 */
export interface PipelineConfig {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    priority: number;
    weight?: number;
    maxConcurrentRequests?: number;
    timeout?: number;
    retryPolicy?: RetryPolicy;
    healthCheck?: HealthCheckConfig;
    customConfig?: Record<string, any>;
}
/**
 * Load balancer configuration
 */
export interface LoadBalancerConfig {
    strategy: 'roundrobin' | 'weighted' | 'least_connections' | 'random';
    healthCheckInterval: number;
    unhealthyThreshold: number;
    healthyThreshold: number;
    enableCircuitBreaker?: boolean;
    circuitBreakerConfig?: CircuitBreakerConfig;
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
 * Health check configuration
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
 * Scheduler configuration
 */
export interface SchedulerConfig {
    maxRetries: number;
    defaultTimeout: number;
    enableMetrics: boolean;
    enableHealthChecks: boolean;
    enableCircuitBreaker: boolean;
    errorHandlingStrategies: ErrorHandlingStrategy[];
    customErrorHandlers: Record<string, string>;
    blacklistConfig: BlacklistConfig;
}
/**
 * Blacklist configuration
 */
export interface BlacklistConfig {
    enabled: boolean;
    maxEntries: number;
    cleanupInterval: number;
    defaultBlacklistDuration: number;
    maxBlacklistDuration: number;
}
/**
 * Full pipeline system configuration
 */
export interface PipelineSystemConfig {
    scheduler: SchedulerConfig;
    loadBalancer: LoadBalancerConfig;
    pipelines: PipelineConfig[];
    globalSettings: GlobalSettings;
}
/**
 * Global settings
 */
export interface GlobalSettings {
    debug: boolean;
    logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    metricsEnabled: boolean;
    healthCheckEnabled: boolean;
    enableCircuitBreaker: boolean;
    maxConcurrentRequests: number;
    defaultTimeout: number;
}
/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    config?: PipelineSystemConfig;
}
/**
 * Pipeline configuration manager
 */
export declare class PipelineConfigManager {
    private config;
    private validationRules;
    private errorHandlers;
    constructor(config: PipelineSystemConfig);
    /**
     * Initialize validation rules
     */
    private initializeValidationRules;
    /**
     * Validate configuration
     */
    validateConfig(config: PipelineSystemConfig): ConfigValidationResult;
    /**
     * Validate individual pipeline configuration
     */
    private validatePipelineConfig;
    /**
     * Validate scheduler configuration
     */
    private validateSchedulerConfig;
    /**
     * Validate load balancer configuration
     */
    private validateLoadBalancerConfig;
    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue;
    /**
     * Apply validation rule
     */
    private applyValidationRule;
    /**
     * Get configuration
     */
    getConfig(): PipelineSystemConfig;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<PipelineSystemConfig>): ConfigValidationResult;
    /**
     * Merge configuration objects
     */
    private mergeConfig;
    /**
     * Get pipeline configuration
     */
    getPipelineConfig(pipelineId: string): PipelineConfig | undefined;
    /**
     * Get enabled pipelines
     */
    getEnabledPipelines(): PipelineConfig[];
    /**
     * Get error handling strategy for a specific error code
     */
    getErrorHandlingStrategy(errorCode: number): ErrorHandlingStrategy | undefined;
    /**
     * Register custom error handler
     */
    registerErrorHandler(name: string, handler: Function): void;
    /**
     * Get error handler by name
     */
    getErrorHandler(name: string): Function | undefined;
    /**
     * Create default configuration
     */
    static createDefaultConfig(): PipelineSystemConfig;
}
//# sourceMappingURL=PipelineConfig.d.ts.map