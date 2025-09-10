import { ErrorContext, ErrorResponse, ErrorPolicy } from '../../../SharedTypes';
/**
 * Policy Engine - Executes error handling strategies and decides processing methods
 * Implements retry, fallback, isolation, and recovery strategies
 */
export declare class PolicyEngine {
    private policies;
    private circuitBreakers;
    private retryTracker;
    private isInitialized;
    private enableMetrics;
    /**
     * Constructs the Policy Engine
     */
    constructor();
    /**
     * Initialize the policy engine
     */
    initialize(): Promise<void>;
    /**
     * Execute policies for an error context
     * @param error - Error context to process
     * @param originalResponse - Original response to enhance with policies
     * @returns Promise<ErrorResponse> - Enhanced error response
     */
    executePolicies(error: ErrorContext, originalResponse: ErrorResponse): Promise<ErrorResponse>;
    /**
     * Register a policy
     * @param policy - Policy to register
     */
    registerPolicy(policy: ErrorPolicy): void;
    /**
     * Unregister a policy
     * @param policyId - Policy ID to unregister
     */
    unregisterPolicy(policyId: string): void;
    /**
     * Get all registered policies
     * @returns Array of all policies
     */
    getPolicies(): ErrorPolicy[];
    /**
     * Get policy by ID
     * @param policyId - Policy ID
     * @returns Policy or null if not found
     */
    getPolicy(policyId: string): ErrorPolicy | null;
    /**
     * Update circuit breaker state
     * @param moduleId - Module ID
     * @param success - Whether the operation was successful
     * @param config - Circuit breaker configuration
     */
    updateCircuitBreaker(moduleId: string, success: boolean, config: any): void;
    /**
     * Check if circuit breaker allows request for module
     * @param moduleId - Module ID
     * @returns Whether circuit breaker allows request
     */
    isCircuitBreakerAllow(moduleId: string): boolean;
    /**
     * Get retry state for error
     * @param errorId - Error ID
     * @returns Retry state or null if not found
     */
    getRetryState(errorId: string): RetryState | null;
    /**
     * Shutdown the policy engine
     */
    shutdown(): Promise<void>;
    /**
     * Get policy engine status
     * @returns Policy engine status information
     */
    getStatus(): any;
    /**
     * Enable or disable metrics collection
     * @param enabled - Whether to enable metrics
     */
    setMetricsEnabled(enabled: boolean): void;
    /**
     * Find policies applicable to the error context
     * @param error - Error context
     * @returns Array of applicable policies
     */
    private findApplicablePolicies;
    /**
     * Check if policy condition matches error context
     * @param condition - Policy condition
     * @param error - Error context
     * @returns Whether condition matches
     */
    private matchesPolicyCondition;
    /**
     * Get field value from error context
     * @param error - Error context
     * @param field - Field name (supports dot notation)
     * @returns Field value
     */
    private getErrorFieldValue;
    /**
     * Get nested value from object using dot notation
     * @param obj - Object to get value from
     * @param path - Dot notation path
     * @returns Value or undefined
     */
    private getNestedValue;
    /**
     * Convert RouteCondition to PolicyCondition
     * @param routeCondition - Route condition to convert
     * @returns Policy condition
     */
    private convertRouteToPolicyCondition;
    /**
     * Execute a single policy
     * @param policy - Policy to execute
     * @param error - Error context
     * @param response - Current response to enhance
     * @returns Enhanced response
     */
    private executePolicy;
    /**
     * Execute retry policy
     * @param policy - Retry policy
     * @param error - Error context
     * @param response - Current response
     * @returns Enhanced response
     */
    private executeRetryPolicy;
    /**
     * Execute fallback policy
     * @param policy - Fallback policy
     * @param error - Error context
     * @param response - Current response
     * @returns Enhanced response
     */
    private executeFallbackPolicy;
    /**
     * Execute isolation policy
     * @param policy - Isolation policy
     * @param error - Error context
     * @param response - Current response
     * @returns Enhanced response
     */
    private executeIsolationPolicy;
    /**
     * Execute notification policy
     * @param policy - Notification policy
     * @param error - Error context
     * @param response - Current response
     * @returns Enhanced response
     */
    private executeNotificationPolicy;
    /**
     * Execute custom policy
     * @param policy - Custom policy
     * @param error - Error context
     * @param response - Current response
     * @returns Enhanced response
     */
    private executeCustomPolicy;
    /**
     * Register default policies
     */
    private registerDefaultPolicies;
    /**
     * Validate policy configuration
     * @param policy - Policy to validate
     * @throws Error if validation fails
     */
    private validatePolicy;
    /**
     * Start cleanup timer for expired states
     */
    private startCleanupTimer;
    /**
     * Clean up expired states
     */
    private cleanupExpiredStates;
    /**
     * Ensure policy engine is initialized
     * @throws Error if not initialized
     */
    private ensureInitialized;
}
/**
 * Retry state tracking
 */
declare class RetryState {
    private retryCount;
    private startTime;
    private nextDelay;
    private config;
    constructor(config: any);
    canRetry(): boolean;
    getRetryCount(): number;
    getNextDelay(): number;
    getStartTime(): number;
}
export {};
