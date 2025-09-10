import { 
  ErrorContext, 
  ErrorResponse, 
  ErrorPolicy, 
  PolicyCondition,
  PolicyType,
  ActionType,
  RouteCondition,
  ConditionOperator,
  ErrorSeverity
} from '../../../../interfaces/SharedTypes';

/**
 * Policy Engine - Executes error handling strategies and decides processing methods
 * Implements retry, fallback, isolation, and recovery strategies
 */
export class PolicyEngine {
  private policies: Map<string, ErrorPolicy> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private retryTracker: Map<string, RetryState> = new Map();
  private isInitialized: boolean = false;
  private enableMetrics: boolean = true;
  
  /**
   * Constructs the Policy Engine
   */
  constructor() {
    // Initialize with default policies
  }

  /**
   * Initialize the policy engine
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Set initialized first to allow policy registration
      this.isInitialized = true;
      
      // Register default policies
      this.registerDefaultPolicies();
      
      // Start cleanup timer for expired states
      this.startCleanupTimer();
      
      console.log('Policy Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Policy Engine:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Execute policies for an error context
   * @param error - Error context to process
   * @param originalResponse - Original response to enhance with policies
   * @returns Promise<ErrorResponse> - Enhanced error response
   */
  public async executePolicies(
    error: ErrorContext, 
    originalResponse: ErrorResponse
  ): Promise<ErrorResponse> {
    this.ensureInitialized();
    
    try {
      const startTime = Date.now();
      
      if (this.enableMetrics) {
        console.log(`Executing policies for error ${error.errorId}`);
      }

      // Find applicable policies
      const applicablePolicies = this.findApplicablePolicies(error);
      
      // Execute policies in order of priority
      let enhancedResponse = { ...originalResponse };
      
      for (const policy of applicablePolicies) {
        try {
          enhancedResponse = await this.executePolicy(policy, error, enhancedResponse);
        } catch (policyError) {
          console.error(`Error executing policy ${policy.name}:`, policyError);
          // Continue with other policies
        }
      }
      
      // Add policy execution metrics
      enhancedResponse.processingTime += Date.now() - startTime;
      
      return enhancedResponse;
    } catch (error) {
      const errorObj = error as Error;
      console.error(`Error executing policies:`, errorObj);
      return originalResponse; // Return original response on policy failure
    }
  }

  /**
   * Register a policy
   * @param policy - Policy to register
   */
  public registerPolicy(policy: ErrorPolicy): void {
    this.ensureInitialized();
    
    try {
      this.validatePolicy(policy);
      this.policies.set(policy.policyId, policy);
      
      if (this.enableMetrics) {
        console.log(`Policy ${policy.name} (${policy.policyId}) registered successfully`);
      }
    } catch (error) {
      console.error(`Failed to register policy ${policy.policyId}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a policy
   * @param policyId - Policy ID to unregister
   */
  public unregisterPolicy(policyId: string): void {
    this.ensureInitialized();
    
    try {
      const deleted = this.policies.delete(policyId);
      if (deleted) {
        console.log(`Policy ${policyId} unregistered successfully`);
      } else {
        console.warn(`Policy ${policyId} not found for unregistration`);
      }
    } catch (error) {
      console.error(`Failed to unregister policy ${policyId}:`, error);
      throw error;
    }
  }

  /**
   * Get all registered policies
   * @returns Array of all policies
   */
  public getPolicies(): ErrorPolicy[] {
    this.ensureInitialized();
    return Array.from(this.policies.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get policy by ID
   * @param policyId - Policy ID
   * @returns Policy or null if not found
   */
  public getPolicy(policyId: string): ErrorPolicy | null {
    this.ensureInitialized();
    return this.policies.get(policyId) || null;
  }

  /**
   * Update circuit breaker state
   * @param moduleId - Module ID
   * @param success - Whether the operation was successful
   * @param config - Circuit breaker configuration
   */
  public updateCircuitBreaker(moduleId: string, success: boolean, config: any): void {
    this.ensureInitialized();
    
    let state = this.circuitBreakers.get(moduleId);
    if (!state) {
      state = new CircuitBreakerState(config);
      this.circuitBreakers.set(moduleId, state);
    }
    
    state.recordAttempt(success);
  }

  /**
   * Check if circuit breaker allows request for module
   * @param moduleId - Module ID
   * @returns Whether circuit breaker allows request
   */
  public isCircuitBreakerAllow(moduleId: string): boolean {
    this.ensureInitialized();
    
    const state = this.circuitBreakers.get(moduleId);
    return state ? state.isAllowed() : true;
  }

  /**
   * Get retry state for error
   * @param errorId - Error ID
   * @returns Retry state or null if not found
   */
  public getRetryState(errorId: string): RetryState | null {
    this.ensureInitialized();
    return this.retryTracker.get(errorId) || null;
  }

  /**
   * Shutdown the policy engine
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Shutting down Policy Engine...');
      
      // Clear all policies and state
      this.policies.clear();
      this.circuitBreakers.clear();
      this.retryTracker.clear();
      
      this.isInitialized = false;
      console.log('Policy Engine shutdown completed');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get policy engine status
   * @returns Policy engine status information
   */
  public getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      enableMetrics: this.enableMetrics,
      policiesCount: this.policies.size,
      circuitBreakersCount: this.circuitBreakers.size,
      retryTrackersCount: this.retryTracker.size,
      circuitBreakerStates: Object.fromEntries(this.circuitBreakers)
    };
  }

  /**
   * Enable or disable metrics collection
   * @param enabled - Whether to enable metrics
   */
  public setMetricsEnabled(enabled: boolean): void {
    this.enableMetrics = enabled;
  }

  /**
   * Find policies applicable to the error context
   * @param error - Error context
   * @returns Array of applicable policies
   */
  private findApplicablePolicies(error: ErrorContext): ErrorPolicy[] {
    const policies = this.getPolicies();
    
    return policies.filter(policy => {
      if (!policy.enabled) return false;
      
      return policy.conditions.every(condition => 
        this.matchesPolicyCondition(this.convertRouteToPolicyCondition(condition), error)
      );
    });
  }

  /**
   * Check if policy condition matches error context
   * @param condition - Policy condition
   * @param error - Error context
   * @returns Whether condition matches
   */
  private matchesPolicyCondition(condition: PolicyCondition, error: ErrorContext): boolean {
    const fieldValue = this.getErrorFieldValue(error, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
      case 'not_contains':
        return typeof fieldValue === 'string' && !fieldValue.includes(condition.value);
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > condition.value;
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'regex':
        return typeof fieldValue === 'string' && new RegExp(condition.value).test(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Get field value from error context
   * @param error - Error context
   * @param field - Field name (supports dot notation)
   * @returns Field value
   */
  private getErrorFieldValue(error: ErrorContext, field: string): any {
    const fieldMap: Record<string, any> = {
      'moduleId': error.source.moduleId,
      'moduleName': error.source.moduleName,
      'errorType': error.classification.type,
      'errorSeverity': error.classification.severity,
      'errorSource': error.classification.source,
      'errorImpact': error.classification.impact,
      'isUnderConstruction': error.data.isUnderConstruction || false
    };
    
    return fieldMap[field] || this.getNestedValue(error.data, field);
  }

  /**
   * Get nested value from object using dot notation
   * @param obj - Object to get value from
   * @param path - Dot notation path
   * @returns Value or undefined
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Convert RouteCondition to PolicyCondition
   * @param routeCondition - Route condition to convert
   * @returns Policy condition
   */
  private convertRouteToPolicyCondition(routeCondition: RouteCondition): PolicyCondition {
    // Find the first matching field - this is a simplified conversion
    if (routeCondition.moduleIds && routeCondition.moduleIds.length > 0) {
      return {
        field: 'moduleId',
        operator: 'in' as ConditionOperator,
        value: routeCondition.moduleIds
      };
    }
    
    if (routeCondition.errorTypes && routeCondition.errorTypes.length > 0) {
      return {
        field: 'errorType',
        operator: 'in' as ConditionOperator,
        value: routeCondition.errorTypes
      };
    }
    
    if (routeCondition.severities && routeCondition.severities.length > 0) {
      return {
        field: 'errorSeverity',
        operator: 'in' as ConditionOperator,
        value: routeCondition.severities
      };
    }
    
    // Default condition - always true
    return {
      field: 'moduleId',
      operator: 'not_equals' as ConditionOperator,
      value: '__never_match__'
    };
  }

  /**
   * Execute a single policy
   * @param policy - Policy to execute
   * @param error - Error context
   * @param response - Current response to enhance
   * @returns Enhanced response
   */
  private async executePolicy(
    policy: ErrorPolicy, 
    error: ErrorContext, 
    response: ErrorResponse
  ): Promise<ErrorResponse> {
    if (this.enableMetrics) {
      console.log(`Executing policy ${policy.name} (${policy.type}) for error ${error.errorId}`);
    }

    switch (policy.type) {
      case PolicyType.RETRY:
        return this.executeRetryPolicy(policy, error, response);
      case PolicyType.FALLBACK:
        return this.executeFallbackPolicy(policy, error, response);
      case PolicyType.ISOLATION:
        return this.executeIsolationPolicy(policy, error, response);
      case PolicyType.NOTIFICATION:
        return this.executeNotificationPolicy(policy, error, response);
      case PolicyType.CUSTOM:
        return this.executeCustomPolicy(policy, error, response);
      default:
        console.warn(`Unknown policy type: ${policy.type}`);
        return response;
    }
  }

  /**
   * Execute retry policy
   * @param policy - Retry policy
   * @param error - Error context
   * @param response - Current response
   * @returns Enhanced response
   */
  private async executeRetryPolicy(
    policy: ErrorPolicy, 
    error: ErrorContext, 
    response: ErrorResponse
  ): Promise<ErrorResponse> {
    if (!policy.config?.retryConfig) {
      return response;
    }

    const retryConfig = policy.config.retryConfig;
    
    // Check if error is retryable
    if (!retryConfig.retryableErrors.includes(response.result.code)) {
      return response;
    }

    // Get or create retry state
    let retryState = this.retryTracker.get(error.errorId);
    if (!retryState) {
      retryState = new RetryState(retryConfig);
      this.retryTracker.set(error.errorId, retryState);
    }

    // Check if we can retry
    if (retryState.canRetry()) {
      const action = {
        actionId: `retry_${error.errorId}_${Date.now()}`,
        type: ActionType.RETRY,
        target: error.source.moduleId,
        payload: {
          retryAttempt: retryState.getRetryCount() + 1,
          maxRetries: retryConfig.maxRetries,
          delay: retryState.getNextDelay()
        },
        priority: 'medium' as any,
        status: 'pending' as any,
        timestamp: new Date()
      };

      response.actions.push(action);
      response.result.status = 'retry' as any;
      response.result.code = 'RETRY_SCHEDULED';
    }

    return response;
  }

  /**
   * Execute fallback policy
   * @param policy - Fallback policy
   * @param error - Error context
   * @param response - Current response
   * @returns Enhanced response
   */
  private async executeFallbackPolicy(
    policy: ErrorPolicy, 
    error: ErrorContext, 
    response: ErrorResponse
  ): Promise<ErrorResponse> {
    if (!policy.config?.fallbackConfig) {
      return response;
    }

    const fallbackConfig = policy.config.fallbackConfig;
    
    if (fallbackConfig.enabled && fallbackConfig.fallbackResponse) {
      const action = {
        actionId: `fallback_${error.errorId}_${Date.now()}`,
        type: ActionType.FALLBACK,
        target: error.source.moduleId,
        payload: {
          fallbackResponse: fallbackConfig.fallbackResponse,
          timeout: fallbackConfig.timeout
        },
        priority: 'high' as any,
        status: 'completed' as any,
        timestamp: new Date()
      };

      response.actions.push(action);
      response.result.status = 'fallback' as any;
      response.result.code = 'FALLBACK_ACTIVATED';
      response.data.response = fallbackConfig.fallbackResponse;
    }

    return response;
  }

  /**
   * Execute isolation policy
   * @param policy - Isolation policy
   * @param error - Error context
   * @param response - Current response
   * @returns Enhanced response
   */
  private async executeIsolationPolicy(
    policy: ErrorPolicy, 
    error: ErrorContext, 
    response: ErrorResponse
  ): Promise<ErrorResponse> {
    if (!policy.config?.isolationConfig) {
      return response;
    }

    const isolationConfig = policy.config.isolationConfig;
    
    if (isolationConfig.enabled) {
      // Update circuit breaker state
      this.updateCircuitBreaker(error.source.moduleId, false, isolationConfig);
      
      // Check if circuit breaker is triggered
      if (!this.isCircuitBreakerAllow(error.source.moduleId)) {
        const action = {
          actionId: `isolate_${error.errorId}_${Date.now()}`,
          type: ActionType.ISOLATE,
          target: error.source.moduleId,
          payload: {
            isolationTimeout: isolationConfig.timeout,
            recoveryTime: isolationConfig.recoveryTime
          },
          priority: 'critical' as any,
          status: 'completed' as any,
          timestamp: new Date()
        };

        response.actions.push(action);
        response.result.status = 'failure' as any;
        response.result.code = 'CIRCUIT_BREAKER_OPEN';
        response.result.message = 'Module is temporarily isolated due to failures';
      }
    }

    return response;
  }

  /**
   * Execute notification policy
   * @param policy - Notification policy
   * @param error - Error context
   * @param response - Current response
   * @returns Enhanced response
   */
  private async executeNotificationPolicy(
    policy: ErrorPolicy, 
    error: ErrorContext, 
    response: ErrorResponse
  ): Promise<ErrorResponse> {
    if (!policy.config?.notificationConfig) {
      return response;
    }

    const notificationConfig = policy.config.notificationConfig;
    
    if (notificationConfig.enabled && 
        notificationConfig.severity.includes(error.classification.severity)) {
      
      for (const channel of notificationConfig.channels) {
        const action = {
          actionId: `notify_${channel.type}_${error.errorId}_${Date.now()}`,
          type: ActionType.NOTIFY,
          target: channel.type,
          payload: {
            channel: channel.type,
            config: channel.config,
            template: notificationConfig.template,
            error: {
              id: error.errorId,
              message: error.error.message,
              severity: error.classification.severity,
              module: error.source.moduleName
            }
          },
          priority: 'medium' as any,
          status: 'pending' as any,
          timestamp: new Date()
        };

        response.actions.push(action);
      }
    }

    return response;
  }

  /**
   * Execute custom policy
   * @param policy - Custom policy
   * @param error - Error context
   * @param response - Current response
   * @returns Enhanced response
   */
  private async executeCustomPolicy(
    policy: ErrorPolicy, 
    error: ErrorContext, 
    response: ErrorResponse
  ): Promise<ErrorResponse> {
    const customConfig = policy.config?.custom;
    
    if (customConfig) {
      const action = {
        actionId: `custom_${policy.policyId}_${error.errorId}_${Date.now()}`,
        type: ActionType.CUSTOM,
        target: 'custom_action',
        payload: {
          policyId: policy.policyId,
          customConfig,
          errorContext: error
        },
        priority: 'low' as any,
        status: 'pending' as any,
        timestamp: new Date()
      };

      response.actions.push(action);
    }

    return response;
  }

  /**
   * Register default policies
   */
  private registerDefaultPolicies(): void {
    // Default retry policy
    const retryPolicy: ErrorPolicy = {
      policyId: `default_retry_${Date.now()}`,
      name: 'DefaultRetryPolicy',
      policyType: PolicyType.RETRY,
      type: PolicyType.RETRY,
      config: {
        retryConfig: {
          maxRetries: 3,
          delay: 1000,
          backoffMultiplier: 2,
          maxDelay: 30000,
          retryableErrors: [
            'NETWORK_ERROR',
            'TIMEOUT_ERROR',
            'TEMPORARY_ERROR'
          ]
        }
      },
      conditions: [
        {
          severities: [ErrorSeverity.HIGH]
        }
      ],
      actions: [],
      priority: 70,
      enabled: true
    };
    this.registerPolicy(retryPolicy);

    // Default fallback policy
    const fallbackPolicy: ErrorPolicy = {
      policyId: `default_fallback_${Date.now()}`,
      name: 'DefaultFallbackPolicy',
      policyType: PolicyType.FALLBACK,
      type: PolicyType.FALLBACK,
      config: {
        fallbackConfig: {
          enabled: true,
          fallbackResponse: {
            message: 'Service temporarily unavailable. Please try again later.',
            code: 'FALLBACK_RESPONSE'
          },
          timeout: 5000,
          healthCheck: true
        }
      },
      conditions: [
        {
          custom: {
            isUnderConstruction: true
          }
        }
      ],
      actions: [],
      priority: 80,
      enabled: true
    };
    this.registerPolicy(fallbackPolicy);

    // Default isolation policy
    const isolationPolicy: ErrorPolicy = {
      policyId: `default_isolation_${Date.now()}`,
      name: 'DefaultIsolationPolicy',
      policyType: PolicyType.ISOLATION,
      type: PolicyType.ISOLATION,
      config: {
        isolationConfig: {
          enabled: true,
          timeout: 60000,
          threshold: 5,
          recoveryTime: 300000
        }
      },
      conditions: [
        {
          severities: [ErrorSeverity.CRITICAL]
        }
      ],
      actions: [],
      priority: 90,
      enabled: true
    };
    this.registerPolicy(isolationPolicy);
  }

  /**
   * Validate policy configuration
   * @param policy - Policy to validate
   * @throws Error if validation fails
   */
  private validatePolicy(policy: ErrorPolicy): void {
    if (!policy.policyId || policy.policyId.trim() === '') {
      throw new Error('Policy ID is required');
    }
    
    if (!policy.name || policy.name.trim() === '') {
      throw new Error('Policy name is required');
    }
    
    if (!Object.values(PolicyType).includes(policy.type)) {
      throw new Error(`Invalid policy type: ${policy.type}`);
    }
    
    if (!Array.isArray(policy.conditions)) {
      throw new Error('Policy conditions must be an array');
    }
    
    if (typeof policy.priority !== 'number' || policy.priority < 0) {
      throw new Error('Policy priority must be a non-negative number');
    }
  }

  /**
   * Start cleanup timer for expired states
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredStates();
    }, 60000); // Clean up every minute
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    
    // Clean up old retry trackers
    this.retryTracker.forEach((state, errorId) => {
      if (now - state.getStartTime() > 3600000) { // 1 hour
        this.retryTracker.delete(errorId);
      }
    });
    
    // Clean up recovered circuit breakers
    this.circuitBreakers.forEach((state, moduleId) => {
      if (state.getState() === 'closed' && now - state.getLastAttemptTime() > 1800000) { // 30 minutes
        this.circuitBreakers.delete(moduleId);
      }
    });
  }

  /**
   * Ensure policy engine is initialized
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Policy Engine is not initialized. Call initialize() first.');
    }
  }
}

/**
 * Circuit breaker state tracking
 */
class CircuitBreakerState {
  private state: 'closed' | 'open' | 'half_open' = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private lastAttemptTime: number = 0;
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  public recordAttempt(success: boolean): void {
    this.lastAttemptTime = Date.now();
    
    if (success) {
      this.failureCount = 0;
      this.state = 'closed';
    } else {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.config.threshold) {
        this.state = 'open';
      }
    }
  }

  public isAllowed(): boolean {
    if (this.state === 'closed') {
      return true;
    }
    
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTime) {
        this.state = 'half_open';
        return true;
      }
      return false;
    }
    
    // half_open state - allow one request to test
    return true;
  }

  public getState(): string {
    return this.state;
  }

  public getFailureCount(): number {
    return this.failureCount;
  }

  public getLastAttemptTime(): number {
    return this.lastAttemptTime;
  }
}

/**
 * Retry state tracking
 */
class RetryState {
  private retryCount: number = 0;
  private startTime: number = Date.now();
  private nextDelay: number;
  private config: any;

  constructor(config: any) {
    this.config = config;
    this.nextDelay = config.delay;
  }

  public canRetry(): boolean {
    return this.retryCount < this.config.maxRetries;
  }

  public getRetryCount(): number {
    return this.retryCount;
  }

  public getNextDelay(): number {
    const delay = this.nextDelay;
    
    // Calculate next delay with backoff
    this.nextDelay = Math.min(
      this.nextDelay * this.config.backoffMultiplier,
      this.config.maxDelay
    );
    
    this.retryCount++;
    
    return delay;
  }

  public getStartTime(): number {
    return this.startTime;
  }
}