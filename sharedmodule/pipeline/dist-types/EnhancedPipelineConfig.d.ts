/**
 * Enhanced Pipeline System Configuration Example
 * Demonstrates the complete pipeline scheduling system with error response center
 */
import { PipelineScheduler } from './PipelineScheduler';
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
export declare const exampleEnhancedPipelineConfig: EnhancedPipelineSystemConfig;
/**
 * Factory function to create enhanced pipeline scheduler
 */
export declare function createEnhancedPipelineScheduler(config: EnhancedPipelineSystemConfig): PipelineScheduler;
/**
 * Example custom error handler registration
 */
export declare function registerCustomErrorHandlers(scheduler: PipelineScheduler): void;
/**
 * Example usage of the enhanced pipeline system
 */
export declare function exampleEnhancedPipelineUsage(): Promise<void>;
/**
 * Error handling strategies configuration
 */
export declare const errorHandlingStrategies: {
    7001: {
        action: string;
        retryCount: number;
        blacklistDuration: number;
        shouldDestroyPipeline: boolean;
    };
    6001: {
        action: string;
        retryCount: number;
        shouldDestroyPipeline: boolean;
    };
    5001: {
        action: string;
        retryCount: number;
        retryDelay: number;
        shouldDestroyPipeline: boolean;
    };
    4002: {
        action: string;
        retryCount: number;
        retryDelay: number;
        shouldDestroyPipeline: boolean;
    };
    10001: {
        action: string;
        retryCount: number;
        shouldDestroyPipeline: boolean;
    };
};
/**
 * Load balancing strategies comparison
 */
export declare const loadBalancingStrategies: {
    roundrobin: {
        description: string;
        bestFor: string;
        pros: string[];
        cons: string[];
    };
    weighted: {
        description: string;
        bestFor: string;
        pros: string[];
        cons: string[];
    };
    least_connections: {
        description: string;
        bestFor: string;
        pros: string[];
        cons: string[];
    };
    random: {
        description: string;
        bestFor: string;
        pros: string[];
        cons: string[];
    };
};
/**
 * Performance monitoring configuration
 */
export declare const performanceMonitoring: {
    metrics: {
        enableRequestMetrics: boolean;
        enableErrorMetrics: boolean;
        enablePerformanceMetrics: boolean;
        enableHealthMetrics: boolean;
        collectionInterval: number;
        retentionPeriod: number;
    };
    alerts: {
        enableErrorRateAlerts: boolean;
        errorRateThreshold: number;
        enableResponseTimeAlerts: boolean;
        responseTimeThreshold: number;
        enableAvailabilityAlerts: boolean;
        availabilityThreshold: number;
    };
    reporting: {
        enableConsoleLogging: boolean;
        enableFileLogging: boolean;
        enableRemoteLogging: boolean;
        logLevel: string;
    };
};
//# sourceMappingURL=EnhancedPipelineConfig.d.ts.map