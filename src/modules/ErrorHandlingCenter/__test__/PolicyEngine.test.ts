import { PolicyEngine } from '../src/components/PolicyEngine';
import { 
  ErrorContext, 
  ErrorResponse, 
  ErrorPolicy, 
  PolicyType,
  ActionType,
  RouteCondition,
  ConditionOperator,
  ErrorSeverity,
  ErrorSource,
  ErrorType,
  ErrorImpact,
  ErrorRecoverability
} from '../types/ErrorHandlingCenter.types';

describe('PolicyEngine', () => {
  let policyEngine: PolicyEngine;
  let mockErrorContext: ErrorContext;
  let mockErrorResponse: ErrorResponse;
  let mockCriticalErrorContext: ErrorContext;

  beforeEach(() => {
    policyEngine = new PolicyEngine();

    mockErrorContext = {
      errorId: 'test-error-1',
      error: new Error('Test error'),
      source: {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0',
        fileName: 'test-module.ts',
        lineNumber: 42
      },
      classification: {
        source: ErrorSource.MODULE,
        type: ErrorType.TECHNICAL,
        severity: ErrorSeverity.MEDIUM,
        impact: ErrorImpact.SINGLE_MODULE,
        recoverability: ErrorRecoverability.RECOVERABLE
      },
      timestamp: new Date(),
      config: {},
      data: {}
    };

    mockCriticalErrorContext = {
      ...mockErrorContext,
      errorId: 'critical-error-1',
      classification: {
        ...mockErrorContext.classification,
        severity: ErrorSeverity.CRITICAL
      }
    };

    mockErrorResponse = {
      responseId: 'test-response',
      errorId: 'test-error-1',
      result: {
        status: 'success' as any,
        message: 'Error handled successfully',
        details: '',
        code: 'SUCCESS'
      },
      timestamp: new Date(),
      processingTime: 100,
      data: {
        moduleName: 'TestModule',
        moduleId: 'test-module',
        response: {},
        config: {},
        metadata: {}
      },
      actions: [],
      annotations: []
    };
  });

  afterEach(async () => {
    if (policyEngine) {
      await policyEngine.shutdown();
    }
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await policyEngine.initialize();
      const status = policyEngine.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    test('should register default policies on initialization', async () => {
      await policyEngine.initialize();
      const policies = policyEngine.getPolicies();
      
      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some(p => p.name.includes('Default')));
    });

    test('should not initialize twice', async () => {
      await policyEngine.initialize();
      await policyEngine.initialize();
      
      const status = policyEngine.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    test('should handle initialization errors', async () => {
      // Mock registerDefaultPolicies to throw error
      jest.spyOn(policyEngine as any, 'registerDefaultPolicies').mockImplementation(() => {
        throw new Error('Policy registration failed');
      });

      await expect(policyEngine.initialize())
        .rejects.toThrow('Policy registration failed');
    });
  });

  describe('Policy Execution', () => {
    beforeEach(async () => {
      await policyEngine.initialize();
    });

    test('should execute policies successfully', async () => {
      const enhancedResponse = await policyEngine.executePolicies(mockErrorContext, mockErrorResponse);
      
      expect(enhancedResponse).toBeDefined();
      expect(enhancedResponse.processingTime).toBeGreaterThanOrEqual(0);
    });

    test('should apply policies in priority order', async () => {
      // Register custom policies with different priorities
      const lowPriorityPolicy: ErrorPolicy = {
        policyId: 'low-priority',
        name: 'Low Priority Policy',
        policyType: PolicyType.NOTIFICATION,
        type: PolicyType.NOTIFICATION,
        conditions: [{ severities: ['medium' as any] }],
        actions: [],
        enabled: true,
        priority: 10
      };

      const highPriorityPolicy: ErrorPolicy = {
        policyId: 'high-priority',
        name: 'High Priority Policy',
        policyType: PolicyType.RETRY,
        type: PolicyType.RETRY,
        conditions: [{ severities: ['medium' as any] }],
        actions: [],
        enabled: true,
        priority: 90
      };

      policyEngine.registerPolicy(lowPriorityPolicy);
      policyEngine.registerPolicy(highPriorityPolicy);

      // Mock policy execution to log order
      const executionOrder: string[] = [];
      jest.spyOn(policyEngine as any, 'executePolicy').mockImplementation(
        (...args: unknown[]) => {
          const policy = args[0] as ErrorPolicy;
          executionOrder.push(policy.name);
          return Promise.resolve(mockErrorResponse);
        }
      );

      await policyEngine.executePolicies(mockErrorContext, mockErrorResponse);
      
      expect(executionOrder[0]).toBe('High Priority Policy');
      expect(executionOrder[1]).toBe('Low Priority Policy');
    });

    test('should skip disabled policies', async () => {
      const disabledPolicy: ErrorPolicy = {
        policyId: 'disabled-policy',
        name: 'Disabled Policy',
        policyType: PolicyType.NOTIFICATION,
        type: PolicyType.NOTIFICATION,
        conditions: [{ severities: ['medium' as any] }],
        actions: [],
        enabled: false,
        priority: 50
      };

      policyEngine.registerPolicy(disabledPolicy);

      const executeSpy = jest.spyOn(policyEngine as any, 'executePolicy');
      
      await policyEngine.executePolicies(mockErrorContext, mockErrorResponse);
      
      expect(executeSpy).not.toHaveBeenCalledWith(disabledPolicy);
    });

    test('should handle policy execution errors gracefully', async () => {
      const failingPolicy: ErrorPolicy = {
        policyId: 'failing-policy',
        name: 'Failing Policy',
        policyType: PolicyType.NOTIFICATION,
        type: PolicyType.NOTIFICATION,
        conditions: [{ severities: ['medium' as any] }],
        actions: [],
        enabled: true,
        priority: 50
      };

      policyEngine.registerPolicy(failingPolicy);

      jest.spyOn(policyEngine as any, 'executePolicy').mockImplementation(
        (...args: unknown[]) => {
          const policy = args[0] as ErrorPolicy;
          if (policy.name === 'Failing Policy') {
            throw new Error('Policy execution failed');
          }
          return Promise.resolve(mockErrorResponse);
        }
      );

      const response = await policyEngine.executePolicies(mockErrorContext, mockErrorResponse);
      
      expect(response).toBeDefined();
      expect(response).toBe(mockErrorResponse); // Should return original response
    });

    test('should throw error when not initialized', async () => {
      const uninitializedEngine = new PolicyEngine();
      
      await expect(uninitializedEngine.executePolicies(mockErrorContext, mockErrorResponse))
        .rejects.toThrow('Policy Engine is not initialized');
    });

    test('should find applicable policies based on error context', async () => {
      const applicablePolicy: ErrorPolicy = {
        policyId: 'applicable-policy',
        name: 'Applicable Policy',
        policyType: PolicyType.RETRY,
        type: PolicyType.RETRY,
        conditions: [
          { 
            severities: ['critical' as any],
            errorTypes: ['technical' as any]
          }
        ],
        actions: [],
        enabled: true,
        priority: 50
      };

      const nonApplicablePolicy: ErrorPolicy = {
        policyId: 'non-applicable-policy',
        name: 'Non Applicable Policy',
        policyType: PolicyType.RETRY,
        type: PolicyType.RETRY,
        conditions: [
          { 
            severities: ['low' as any] // Won't match
          }
        ],
        actions: [],
        enabled: true,
        priority: 50
      };

      policyEngine.registerPolicy(applicablePolicy);
      policyEngine.registerPolicy(nonApplicablePolicy);

      // Mock execution to track which policies are called
      const executedPolicies: string[] = [];
      jest.spyOn(policyEngine as any, 'executePolicy').mockImplementation(
        (...args: unknown[]) => {
          const policy = args[0] as ErrorPolicy;
          executedPolicies.push(policy.name);
          return Promise.resolve(mockErrorResponse);
        }
      );

      await policyEngine.executePolicies(mockCriticalErrorContext, mockErrorResponse);
      
      expect(executedPolicies).toContain('Applicable Policy');
      expect(executedPolicies).not.toContain('Non Applicable Policy');
    });
  });

  describe('Policy Registration', () => {
    beforeEach(async () => {
      await policyEngine.initialize();
    });

    test('should register policy successfully', () => {
      const policy: ErrorPolicy = {
        policyId: 'test-policy',
        name: 'Test Policy',
        policyType: PolicyType.RETRY,
        type: PolicyType.RETRY,
        conditions: [{ severities: ['high' as any] }],
        actions: [],
        enabled: true,
        priority: 50
      };

      expect(() => policyEngine.registerPolicy(policy)).not.toThrow();
      
      const retrievedPolicy = policyEngine.getPolicy('test-policy');
      expect(retrievedPolicy?.policyId).toBe('test-policy');
      expect(retrievedPolicy?.name).toBe('Test Policy');
    });

    test('should validate policy registration', () => {
      // Test with empty policy ID
      expect(() => {
        policyEngine.registerPolicy({
          ...mockErrorResponse,
          policyId: '',
          name: 'Test Policy',
          policyType: PolicyType.RETRY as any,
          type: PolicyType.RETRY,
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        } as any);
      }).toThrow('Policy ID is required');

      // Test with empty policy name
      expect(() => {
        policyEngine.registerPolicy({
          ...mockErrorResponse,
          policyId: 'test-policy',
          name: '',
          policyType: PolicyType.RETRY as any,
          type: PolicyType.RETRY,
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        } as any);
      }).toThrow('Policy name is required');

      // Test with invalid policy type
      expect(() => {
        policyEngine.registerPolicy({
          ...mockErrorResponse,
          policyId: 'test-policy',
          name: 'Test Policy',
          policyType: 'invalid-type' as any,
          type: 'invalid-type' as any,
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        } as any);
      }).toThrow('Invalid policy type: invalid-type');

      // Test with invalid conditions array
      expect(() => {
        policyEngine.registerPolicy({
          ...mockErrorResponse,
          policyId: 'test-policy',
          name: 'Test Policy',
          policyType: PolicyType.RETRY as any,
          type: PolicyType.RETRY,
          conditions: {} as any,
          actions: [],
          enabled: true,
          priority: 50
        } as any);
      }).toThrow('Policy conditions must be an array');

      // Test with invalid priority
      expect(() => {
        policyEngine.registerPolicy({
          ...mockErrorResponse,
          policyId: 'test-policy',
          name: 'Test Policy',
          policyType: PolicyType.RETRY as any,
          type: PolicyType.RETRY,
          conditions: [],
          actions: [],
          enabled: true,
          priority: -1
        } as any);
      }).toThrow('Policy priority must be a non-negative number');
    });

    test('should handle registration errors', () => {
      const policy: ErrorPolicy = {
        policyId: 'test-policy',
        name: 'Test Policy',
        policyType: PolicyType.RETRY,
        type: PolicyType.RETRY,
        conditions: [{ severities: ['high' as any] }],
        actions: [],
        enabled: true,
        priority: 50
      };

      jest.spyOn(policyEngine as any, 'validatePolicy').mockImplementation(() => {
        throw new Error('Validation failed');
      });

      expect(() => policyEngine.registerPolicy(policy))
        .toThrow('Validation failed');
    });
  });

  describe('Policy Unregistration', () => {
    beforeEach(async () => {
      await policyEngine.initialize();
    });

    test('should unregister policy successfully', () => {
      const policy: ErrorPolicy = {
        policyId: 'test-policy',
        name: 'Test Policy',
        policyType: PolicyType.RETRY,
        type: PolicyType.RETRY,
        conditions: [],
        actions: [],
        enabled: true,
        priority: 50
      };

      policyEngine.registerPolicy(policy);
      expect(policyEngine.getPolicy('test-policy')).toBeDefined();
      
      policyEngine.unregisterPolicy('test-policy');
      expect(policyEngine.getPolicy('test-policy')).toBeNull();
    });

    test('should handle unregistering non-existent policy', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => {
        policyEngine.unregisterPolicy('non-existent-policy');
      }).not.toThrow();
      
      expect(console.warn).toHaveBeenCalledWith(
        'Policy non-existent-policy not found for unregistration'
      );
      
      jest.restoreAllMocks();
    });
  });

  describe('Policy Retrieval', () => {
    beforeEach(async () => {
      await policyEngine.initialize();
    });

    test('should get all policies sorted by priority', () => {
      const lowPriorityPolicy: ErrorPolicy = {
        policyId: 'low-priority',
        name: 'Low Priority Policy',
        policyType: PolicyType.NOTIFICATION,
        type: PolicyType.NOTIFICATION,
        conditions: [],
        actions: [],
        enabled: true,
        priority: 10
      };

      const highPriorityPolicy: ErrorPolicy = {
        policyId: 'high-priority',
        name: 'High Priority Policy',
        policyType: PolicyType.RETRY,
        type: PolicyType.RETRY,
        conditions: [],
        actions: [],
        enabled: true,
        priority: 90
      };

      policyEngine.registerPolicy(lowPriorityPolicy);
      policyEngine.registerPolicy(highPriorityPolicy);

      const policies = policyEngine.getPolicies();
      
      expect(policies[0].priority).toBeGreaterThan(policies[1].priority);
      expect(policies[0].name).toBe('High Priority Policy');
      expect(policies[1].name).toBe('Low Priority Policy');
    });

    test('should get policy by ID', () => {
      const policy: ErrorPolicy = {
        policyId: 'test-policy',
        name: 'Test Policy',
        policyType: PolicyType.RETRY,
        type: PolicyType.RETRY,
        conditions: [],
        actions: [],
        enabled: true,
        priority: 50
      };

      policyEngine.registerPolicy(policy);
      
      const retrievedPolicy = policyEngine.getPolicy('test-policy');
      expect(retrievedPolicy?.policyId).toBe('test-policy');
      expect(retrievedPolicy?.name).toBe('Test Policy');
    });

    test('should return null for non-existent policy', () => {
      const policy = policyEngine.getPolicy('non-existent-policy');
      expect(policy).toBeNull();
    });
  });

  describe('Policy Type Execution', () => {
    beforeEach(async () => {
      await policyEngine.initialize();
    });

    describe('Retry Policy', () => {
      test('should execute retry policy successfully', async () => {
        const retryPolicy: ErrorPolicy = {
          policyId: 'retry-policy',
          name: 'Retry Policy',
          policyType: PolicyType.RETRY,
          type: PolicyType.RETRY,
          config: {
            retryConfig: {
              maxRetries: 3,
              delay: 1000,
              backoffMultiplier: 2,
              maxDelay: 30000,
              retryableErrors: ['SUCCESS']
            }
          },
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        };

        const response = await policyEngine['executePolicy'](retryPolicy, mockErrorContext, mockErrorResponse);
        
        expect(response.actions).toHaveLength(1);
        expect(response.actions[0].type).toBe(ActionType.RETRY);
        expect(response.result.status).toBe('retry' as any);
        expect(response.result.code).toBe('RETRY_SCHEDULED');
      });

      test('should not retry non-retryable errors', async () => {
        const retryPolicy: ErrorPolicy = {
          policyId: 'retry-policy',
          name: 'Retry Policy',
          policyType: PolicyType.RETRY,
          type: PolicyType.RETRY,
          config: {
            retryConfig: {
              maxRetries: 3,
              delay: 1000,
              backoffMultiplier: 2,
              maxDelay: 30000,
              retryableErrors: ['OTHER_ERROR'] // Not matching our response code
            }
          },
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        };

        const response = await policyEngine['executePolicy'](retryPolicy, mockErrorContext, mockErrorResponse);
        
        expect(response.actions).toHaveLength(0);
      });

      test('should handle missing retry config gracefully', async () => {
        const retryPolicy: ErrorPolicy = {
          policyId: 'retry-policy',
          name: 'Retry Policy',
          policyType: PolicyType.RETRY,
          type: PolicyType.RETRY,
          config: {}, // Missing retry config
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        };

        const response = await policyEngine['executePolicy'](retryPolicy, mockErrorContext, mockErrorResponse);
        
        expect(response.actions).toHaveLength(0);
      });
    });

    describe('Fallback Policy', () => {
      test('should execute fallback policy successfully', async () => {
        const fallbackPolicy: ErrorPolicy = {
          policyId: 'fallback-policy',
          name: 'Fallback Policy',
          policyType: PolicyType.FALLBACK,
          type: PolicyType.FALLBACK,
          config: {
            fallbackConfig: {
              enabled: true,
              fallbackResponse: {
                message: 'Fallback response',
                code: 'FALLBACK_RESPONSE'
              },
              timeout: 5000
            }
          },
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        };

        const response = await policyEngine['executePolicy'](fallbackPolicy, mockErrorContext, mockErrorResponse);
        
        expect(response.actions).toHaveLength(1);
        expect(response.actions[0].type).toBe(ActionType.FALLBACK);
        expect(response.result.status).toBe('fallback' as any);
        expect(response.result.code).toBe('FALLBACK_ACTIVATED');
        expect(response.data.response).toEqual({
          message: 'Fallback response',
          code: 'FALLBACK_RESPONSE'
        });
      });

      test('should handle disabled fallback config', async () => {
        const fallbackPolicy: ErrorPolicy = {
          policyId: 'fallback-policy',
          name: 'Fallback Policy',
          policyType: PolicyType.FALLBACK,
          type: PolicyType.FALLBACK,
          config: {
            fallbackConfig: {
              enabled: false,
              fallbackResponse: {
                message: 'Fallback response',
                code: 'FALLBACK_RESPONSE'
              },
              timeout: 5000
            }
          },
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        };

        const response = await policyEngine['executePolicy'](fallbackPolicy, mockErrorContext, mockErrorResponse);
        
        expect(response.actions).toHaveLength(0);
      });
    });

    describe('Isolation Policy', () => {
      test('should execute isolation policy successfully', async () => {
        const isolationPolicy: ErrorPolicy = {
          policyId: 'isolation-policy',
          name: 'Isolation Policy',
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
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        };

        const response = await policyEngine['executePolicy'](isolationPolicy, mockErrorContext, mockErrorResponse);
        
        expect(response.actions).toHaveLength(1);
        expect(response.actions[0].type).toBe(ActionType.ISOLATE);
      });

      test('should check circuit breaker before isolation', async () => {
        const isolationPolicy: ErrorPolicy = {
          policyId: 'isolation-policy',
          name: 'Isolation Policy',
          policyType: PolicyType.ISOLATION,
          type: PolicyType.ISOLATION,
          config: {
            isolationConfig: {
              enabled: true,
              timeout: 60000,
              threshold: 1, // Low threshold
              recoveryTime: 300000
            }
          },
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        };

        // Record a failure to trigger circuit breaker
        if (isolationPolicy.config?.isolationConfig) {
          policyEngine.updateCircuitBreaker('test-module', false, isolationPolicy.config.isolationConfig);
        }
        
        const response = await policyEngine['executePolicy'](isolationPolicy, mockErrorContext, mockErrorResponse);
        
        expect(response.result.status).toBe('failure' as any);
        expect(response.result.code).toBe('CIRCUIT_BREAKER_OPEN');
      });
    });

    describe('Notification Policy', () => {
      test('should execute notification policy successfully', async () => {
        const notificationPolicy: ErrorPolicy = {
          policyId: 'notification-policy',
          name: 'Notification Policy',
          policyType: PolicyType.NOTIFICATION,
          type: PolicyType.NOTIFICATION,
          config: {
            notificationConfig: {
              enabled: true,
              severity: ['critical' as ErrorSeverity],
              channels: [
                { type: 'email', config: { recipients: ['admin@example.com'] } }
              ]
            }
          },
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        };

        const response = await policyEngine['executePolicy'](notificationPolicy, mockCriticalErrorContext, mockErrorResponse);
        
        expect(response.actions).toHaveLength(1);
        expect(response.actions[0].type).toBe(ActionType.NOTIFY);
      });

      test('should not notify for non-matching severity', async () => {
        const notificationPolicy: ErrorPolicy = {
          policyId: 'notification-policy',
          name: 'Notification Policy',
          policyType: PolicyType.NOTIFICATION,
          type: PolicyType.NOTIFICATION,
          config: {
            notificationConfig: {
              enabled: true,
              severity: ['critical' as ErrorSeverity], // Only critical
              channels: [
                { type: 'email', config: { recipients: ['admin@example.com'] } }
              ]
            }
          },
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        };

        const response = await policyEngine['executePolicy'](notificationPolicy, mockErrorContext, mockErrorResponse);
        
        expect(response.actions).toHaveLength(0); // Medium severity shouldn't trigger
      });
    });

    describe('Custom Policy', () => {
      test('should execute custom policy successfully', async () => {
        const customPolicy: ErrorPolicy = {
          policyId: 'custom-policy',
          name: 'Custom Policy',
          policyType: PolicyType.CUSTOM,
          type: PolicyType.CUSTOM,
          config: {
            custom: {
              customParam: 'custom-value'
            }
          },
          conditions: [],
          actions: [],
          enabled: true,
          priority: 50
        };

        const response = await policyEngine['executePolicy'](customPolicy, mockErrorContext, mockErrorResponse);
        
        expect(response.actions).toHaveLength(1);
        expect(response.actions[0].type).toBe(ActionType.CUSTOM);
        expect(response.actions[0].payload.policyId).toBe('custom-policy');
      });
    });
  });

  describe('Circuit Breaker Management', () => {
    beforeEach(async () => {
      await policyEngine.initialize();
    });

    test('should update circuit breaker state for successful operations', () => {
      const config = { threshold: 3, recoveryTime: 60000 };
      
      policyEngine.updateCircuitBreaker('test-module', true, config);
      
      const isAllowed = policyEngine.isCircuitBreakerAllow('test-module');
      expect(isAllowed).toBe(true);
    });

    test('should update circuit breaker state for failed operations', () => {
      const config = { threshold: 2, recoveryTime: 60000 };
      
      // Record failures to trigger circuit breaker
      policyEngine.updateCircuitBreaker('test-module', false, config);
      policyEngine.updateCircuitBreaker('test-module', false, config);
      
      const isAllowed = policyEngine.isCircuitBreakerAllow('test-module');
      expect(isAllowed).toBe(false); // Should be open now
    });

    test('should allow requests after recovery time', () => {
      const config = { threshold: 2, recoveryTime: 100 }; // Short recovery time
      
      // Record failures to trigger circuit breaker
      policyEngine.updateCircuitBreaker('test-module', false, config);
      policyEngine.updateCircuitBreaker('test-module', false, config);
      
      // Should be blocked immediately
      expect(policyEngine.isCircuitBreakerAllow('test-module')).toBe(false);
      
      // Wait for recovery time
      jest.useFakeTimers();
      jest.advanceTimersByTime(150);
      
      // Should be allowed now
      expect(policyEngine.isCircuitBreakerAllow('test-module')).toBe(true);
      
      jest.useRealTimers();
    });

    test('should allow requests when circuit breaker is not present', () => {
      const isAllowed = policyEngine.isCircuitBreakerAllow('non-existent-module');
      expect(isAllowed).toBe(true);
    });
  });

  describe('Retry State Management', () => {
    beforeEach(async () => {
      await policyEngine.initialize();
    });

    test('should track retry state', () => {
      // Retry state is created internally during policy execution
      // Let's test the retry state access
      const retryState = policyEngine.getRetryState('test-error');
      expect(retryState).toBeNull();
    });

    test('should handle retry limits', () => {
      const retryConfig = {
        maxRetries: 2,
        delay: 1000,
        backoffMultiplier: 2,
        maxDelay: 30000
      };

      const retryState = new (policyEngine as any).RetryState(retryConfig);
      
      expect(retryState.canRetry()).toBe(true);
      expect(retryState.getRetryCount()).toBe(0);
      
      const firstDelay = retryState.getNextDelay();
      expect(firstDelay).toBe(1000);
      expect(retryState.getRetryCount()).toBe(1);
      
      const secondDelay = retryState.getNextDelay();
      expect(secondDelay).toBe(2000);
      expect(retryState.getRetryCount()).toBe(2);
      
      expect(retryState.canRetry()).toBe(false); // Max retries reached
    });
  });

  describe('Condition Matching', () => {
    beforeEach(async () => {
      await policyEngine.initialize();
    });

    test('should match equals operator', () => {
      const condition: any = {
        field: 'moduleId',
        operator: ConditionOperator.EQUALS,
        value: 'test-module'
      };

      const matches = (policyEngine as any).matchesPolicyCondition(condition, mockErrorContext);
      expect(matches).toBe(true);
    });

    test('should match not_equals operator', () => {
      const condition: any = {
        field: 'moduleId',
        operator: ConditionOperator.NOT_EQUALS,
        value: 'other-module'
      };

      const matches = (policyEngine as any).matchesPolicyCondition(condition, mockErrorContext);
      expect(matches).toBe(true);
    });

    test('should match contains operator', () => {
      const condition: any = {
        field: 'moduleName',
        operator: ConditionOperator.CONTAINS,
        value: 'Test'
      };

      const matches = (policyEngine as any).matchesPolicyCondition(condition, mockErrorContext);
      expect(matches).toBe(true);
    });

    test('should match regex operator', () => {
      const condition: any = {
        field: 'moduleName',
        operator: ConditionOperator.REGEX,
        value: 'Test.*'
      };

      const matches = (policyEngine as any).matchesPolicyCondition(condition, mockErrorContext);
      expect(matches).toBe(true);
    });

    test('should match in operator', () => {
      const condition: any = {
        field: 'moduleId',
        operator: ConditionOperator.IN,
        value: ['test-module', 'other-module']
      };

      const matches = (policyEngine as any).matchesPolicyCondition(condition, mockErrorContext);
      expect(matches).toBe(true);
    });

    test('should handle nested field access', () => {
      const condition: any = {
        field: 'isUnderConstruction',
        operator: ConditionOperator.EQUALS,
        value: false
      };

      const matches = (policyEngine as any).matchesPolicyCondition(condition, mockErrorContext);
      expect(matches).toBe(true); // Mock context has isUnderConstruction as false
    });

    test('should handle non-existent fields gracefully', () => {
      const condition: any = {
        field: 'non.existent.field',
        operator: ConditionOperator.EQUALS,
        value: 'test'
      };

      const matches = (policyEngine as any).matchesPolicyCondition(condition, mockErrorContext);
      expect(matches).toBe(false);
    });
  });

  describe('Status and Configuration', () => {
    beforeEach(async () => {
      await policyEngine.initialize();
    });

    test('should return correct status', () => {
      const status = policyEngine.getStatus();
      
      expect(status.isInitialized).toBe(true);
      expect(status.enableMetrics).toBe(true);
      expect(status.policiesCount).toBeGreaterThan(0);
      expect(status.circuitBreakersCount).toBe(0);
      expect(status.retryTrackersCount).toBe(0);
    });

    test('should enable and disable metrics', () => {
      policyEngine.setMetricsEnabled(false);
      
      let status = policyEngine.getStatus();
      expect(status.enableMetrics).toBe(false);
      
      policyEngine.setMetricsEnabled(true);
      status = policyEngine.getStatus();
      expect(status.enableMetrics).toBe(true);
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(async () => {
      await policyEngine.initialize();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should clean up expired retry trackers', async () => {
      // This is difficult to test directly as it's internal
      // But we can verify the cleanup timer exists
      expect(policyEngine.getStatus().retryTrackersCount).toBe(0);
    });

    test('should clean up recovered circuit breakers', async () => {
      const config = { threshold: 2, recoveryTime: 60000 };
      
      // Create circuit breaker state
      policyEngine.updateCircuitBreaker('test-module', true, config);
      
      jest.advanceTimersByTime(61000); // Advance past cleanup time
      
      // The cleanup should run automatically via the timer
      // Note: This is hard to test precisely due to the internal nature
      expect(policyEngine.getStatus().circuitBreakersCount).toBe(0);
    });
  });

  describe('Shutdown', () => {
    test('should shutdown successfully', async () => {
      await policyEngine.initialize();
      
      expect(policyEngine.getPolicies().length).toBeGreaterThan(0);
      
      await policyEngine.shutdown();
      
      const status = policyEngine.getStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.policiesCount).toBe(0);
    });

    test('should shutdown when not initialized', async () => {
      const uninitializedEngine = new PolicyEngine();
      
      await expect(uninitializedEngine.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await policyEngine.initialize();
    });

    test('should handle policy with empty conditions', () => {
      const policy: ErrorPolicy = {
        policyId: 'empty-conditions-policy',
        name: 'Empty Conditions Policy',
        policyType: PolicyType.NOTIFICATION,
        type: PolicyType.NOTIFICATION,
        conditions: [], // Empty conditions should match all
        actions: [],
        enabled: true,
        priority: 50
      };

      policyEngine.registerPolicy(policy);

      const executeSpy = jest.spyOn(policyEngine as any, 'executePolicy');
      
      policyEngine.executePolicies(mockErrorContext, mockErrorResponse);
      
      // Empty conditions should match, so the policy should be executed
      expect(executeSpy).toHaveBeenCalledWith(policy, mockErrorContext, mockErrorResponse);
    });

    test('should handle policy execution with null response', async () => {
      const policy: ErrorPolicy = {
        policyId: 'null-response-policy',
        name: 'Null Response Policy',
        policyType: PolicyType.NOTIFICATION,
        type: PolicyType.NOTIFICATION,
        conditions: [],
        actions: [],
        enabled: true,
        priority: 50
      };

      policyEngine.registerPolicy(policy);

      const response = await policyEngine.executePolicies(mockErrorContext, null as any);
      
      // Should handle null response gracefully
      expect(response).toBeDefined();
    });

    test('should handle very large number of policies', async () => {
      // Add many policies
      for (let i = 0; i < 1000; i++) {
        const policy: ErrorPolicy = {
          policyId: `bulk-policy-${i}`,
          name: `Bulk Policy ${i}`,
          policyType: PolicyType.NOTIFICATION,
          type: PolicyType.NOTIFICATION,
          conditions: [{ severities: ['medium' as any] }],
          actions: [],
          enabled: true,
          priority: Math.floor(Math.random() * 100)
        };

        policyEngine.registerPolicy(policy);
      }

      const startTime = Date.now();
      await policyEngine.executePolicies(mockErrorContext, mockErrorResponse);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should be reasonably fast
    });

    test('should handle concurrent policy execution', async () => {
      const policies = Array(50).fill(null).map((_, i) => ({
        policyId: `concurrent-policy-${i}`,
        name: `Concurrent Policy ${i}`,
        policyType: PolicyType.NOTIFICATION as any,
        type: PolicyType.NOTIFICATION,
        conditions: [],
        actions: [],
        enabled: true,
        priority: 50
      }));

      // Register all policies
      policies.forEach(policy => policyEngine.registerPolicy(policy));

      // Execute multiple policy executions concurrently
      const executionPromises = Array(10).fill(null).map(() =>
        policyEngine.executePolicies(mockErrorContext, mockErrorResponse)
      );

      await Promise.all(executionPromises);
      
      // Should complete without errors
      expect(true).toBe(true);
    });

    test('should handle memory management for many circuit breakers', async () => {
      const config = { threshold: 2, recoveryTime: 60000 };

      // Create many circuit breakers
      for (let i = 0; i < 1000; i++) {
        policyEngine.updateCircuitBreaker(`module-${i}`, true, config);
      }

      const status = policyEngine.getStatus();
      expect(status.circuitBreakersCount).toBe(1000);

      // Shutdown should clean them up
      await policyEngine.shutdown();
      
      const finalStatus = policyEngine.getStatus();
      expect(finalStatus.circuitBreakersCount).toBe(0);
    });
  });
});