import { ErrorClassifier } from '../src/components/ErrorClassifier';
import { 
  ErrorSource, 
  ErrorType, 
  ErrorSeverity, 
  ErrorImpact, 
  ErrorRecoverability,
  ModuleSource
} from '../types/ErrorHandlingCenter.types';
import { 
  TEST_MODULE_SOURCES, 
  TEST_ERROR_CLASSIFICATIONS,
  createTestErrorContext
} from './fixtures/test-data';

describe('ErrorClassifier', () => {
  let errorClassifier: ErrorClassifier;
  let mockModuleSource: ModuleSource;
  let mockNetworkError: Error;
  let mockSystemError: Error;
  let mockBusinessError: Error;
  let mockCriticalError: Error;

  beforeEach(async () => {
    errorClassifier = new ErrorClassifier();
    await errorClassifier.initialize();
    
    mockModuleSource = TEST_MODULE_SOURCES[0];
    mockNetworkError = new Error('Network connection timeout');
    mockSystemError = new Error('System out of memory');
    mockBusinessError = new Error('Invalid user input');
    mockCriticalError = new Error('Fatal system error');
  });

  afterEach(async () => {
    if (errorClassifier) {
      await errorClassifier.shutdown();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully with default rules', async () => {
      const classifier = new ErrorClassifier();
      await classifier.initialize();
      
      const status = classifier.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.classificationRulesCount).toBeGreaterThan(0);
      expect(status.severityRulesCount).toBeGreaterThan(0);
      expect(status.impactRulesCount).toBeGreaterThan(0);
      expect(status.recoverabilityRulesCount).toBeGreaterThan(0);
    });

    test('should not initialize twice', async () => {
      await errorClassifier.initialize(); // Already initialized in beforeEach
      
      const statusBefore = errorClassifier.getStatus();
      await errorClassifier.initialize();
      const statusAfter = errorClassifier.getStatus();
      
      expect(statusBefore.isInitialized).toBe(true);
      expect(statusAfter.isInitialized).toBe(true);
      // Should be the same instance
    });

    test('should handle initialization errors gracefully', async () => {
      const classifier = new ErrorClassifier();
      // Mock registerDefaultClassificationRules to throw
      jest.spyOn(classifier as any, 'registerDefaultClassificationRules').mockImplementationOnce(() => {
        throw new Error('Failed to register default rules');
      });
      
      await expect(classifier.initialize()).rejects.toThrow('Failed to register default rules');
    });

    test('should throw error when not initialized', async () => {
      const uninitializedClassifier = new ErrorClassifier();
      
      await expect(uninitializedClassifier.classify(mockNetworkError, mockModuleSource))
        .rejects.toThrow('Error Classifier is not initialized. Call initialize() first.');
    });
  });

  describe('Error Classification', () => {
    test('should classify network errors correctly', async () => {
      const classification = await errorClassifier.classify(mockNetworkError, mockModuleSource);
      
      expect(classification.source).toBe(ErrorSource.NETWORK);
      expect(classification.severity).toBe(ErrorSeverity.HIGH);
      expect(classification.type).toBe(ErrorType.TECHNICAL);
      expect(classification.impact).toBe(ErrorImpact.SINGLE_MODULE);
      expect(classification.recoverability).toBe(ErrorRecoverability.AUTO_RECOVERABLE);
    });

    test('should classify system errors correctly', async () => {
      const classification = await errorClassifier.classify(mockSystemError, mockModuleSource);
      
      expect(classification.source).toBe(ErrorSource.SYSTEM);
      expect(classification.type).toBe(ErrorType.TECHNICAL);
      expect(classification.impact).toBe(ErrorImpact.SYSTEM_WIDE);
    });

    test('should classify business errors correctly', async () => {
      const classification = await errorClassifier.classify(mockBusinessError, mockModuleSource);
      
      expect(classification.type).toBe(ErrorType.BUSINESS);
      expect(classification.severity).toBe(ErrorSeverity.MEDIUM);
    });

    test('should classify critical errors with high severity', async () => {
      const classification = await errorClassifier.classify(mockCriticalError, mockModuleSource);
      
      expect(classification.severity).toBe(ErrorSeverity.CRITICAL);
      expect(classification.recoverability).toBe(ErrorRecoverability.NON_RECOVERABLE);
    });

    test('should classify unknown errors with default values', async () => {
      const unknownError = new Error('Unknown error type');
      const classification = await errorClassifier.classify(unknownError, mockModuleSource);
      
      expect(classification.source).toBe(ErrorSource.MODULE);
      expect(classification.type).toBe(ErrorType.TECHNICAL);
      expect(classification.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classification.impact).toBe(ErrorImpact.SINGLE_MODULE);
      expect(classification.recoverability).toBe(ErrorRecoverability.RECOVERABLE);
    });

    test('should handle classification failures gracefully', async () => {
      // Mock a method to throw during classification
      jest.spyOn(errorClassifier as any, 'classifySource').mockImplementationOnce(() => {
        throw new Error('Classification failed');
      });
      
      const classification = await errorClassifier.classify(mockNetworkError, mockModuleSource);
      
      // Should return default classification
      expect(classification.source).toBe(ErrorSource.UNKNOWN);
      expect(classification.type).toBe(ErrorType.TECHNICAL);
      expect(classification.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classification.impact).toBe(ErrorImpact.SINGLE_MODULE);
      expect(classification.recoverability).toBe(ErrorRecoverability.RECOVERABLE);
    });
  });

  describe('Rule Registration', () => {
    test('should register classification rule successfully', () => {
      const rule = {
        ruleId: 'test-classification-rule',
        name: 'TestClassificationRule',
        enabled: true,
        priority: 50,
        condition: {
          criteria: [
            {
              field: 'error.message',
              operator: 'contains' as const,
              value: 'test'
            }
          ]
        },
        result: {
          type: ErrorType.BUSINESS,
          source: ErrorSource.MODULE
        }
      };
      
      expect(() => errorClassifier.registerClassificationRule(rule as any)).not.toThrow();
      
      const rules = errorClassifier.getClassificationRules();
      expect(rules.some(r => r.ruleId === 'test-classification-rule')).toBe(true);
    });

    test('should register severity rule successfully', () => {
      const rule = {
        ruleId: 'test-severity-rule',
        name: 'TestSeverityRule',
        enabled: true,
        priority: 50,
        condition: {
          criteria: [
            {
              field: 'error.message',
              operator: 'contains' as const,
              value: 'severe'
            }
          ]
        },
        severity: ErrorSeverity.CRITICAL
      };
      
      expect(() => errorClassifier.registerSeverityRule(rule as any)).not.toThrow();
      
      const rules = errorClassifier.getSeverityRules();
      expect(rules.some(r => r.ruleId === 'test-severity-rule')).toBe(true);
    });

    test('should register impact rule successfully', () => {
      const rule = {
        ruleId: 'test-impact-rule',
        name: 'TestImpactRule',
        enabled: true,
        priority: 50,
        condition: {
          criteria: [
            {
              field: 'error.message',
              operator: 'contains' as const,
              value: 'system-wide'
            }
          ]
        },
        impact: ErrorImpact.SYSTEM_WIDE
      };
      
      expect(() => errorClassifier.registerImpactRule(rule as any)).not.toThrow();
      
      const rules = errorClassifier.getImpactRules();
      expect(rules.some(r => r.ruleId === 'test-impact-rule')).toBe(true);
    });

    test('should register recoverability rule successfully', () => {
      const rule = {
        ruleId: 'test-recoverability-rule',
        name: 'TestRecoverabilityRule',
        enabled: true,
        priority: 50,
        condition: {
          criteria: [
            {
              field: 'error.message',
              operator: 'contains' as const,
              value: 'auto-recover'
            }
          ]
        },
        recoverability: ErrorRecoverability.AUTO_RECOVERABLE
      };
      
      expect(() => errorClassifier.registerRecoverabilityRule(rule as any)).not.toThrow();
      
      const rules = errorClassifier.getRecoverabilityRules();
      expect(rules.some(r => r.ruleId === 'test-recoverability-rule')).toBe(true);
    });

    test('should validate classification rule registration', () => {
      // Test empty rule ID
      expect(() => {
        errorClassifier.registerClassificationRule({
          ruleId: '',
          name: 'TestRule',
          enabled: true,
          priority: 50,
          condition: { criteria: [] },
          result: {}
        } as any);
      }).toThrow('Rule ID is required');
      
      // Test empty name
      expect(() => {
        errorClassifier.registerClassificationRule({
          ruleId: 'test-rule',
          name: '',
          enabled: true,
          priority: 50,
          condition: { criteria: [] },
          result: {}
        } as any);
      }).toThrow('Rule name is required');
      
      // Test invalid priority
      expect(() => {
        errorClassifier.registerClassificationRule({
          ruleId: 'test-rule',
          name: 'TestRule',
          enabled: true,
          priority: -1,
          condition: { criteria: [] },
          result: {}
        } as any);
      }).toThrow('Rule priority must be a non-negative number');
    });

    test('should validate severity rule registration', () => {
      expect(() => {
        errorClassifier.registerSeverityRule({
          ruleId: 'invalid-severity-rule',
          name: 'InvalidSeverityRule',
          enabled: true,
          priority: 50,
          condition: { criteria: [] },
          severity: 'invalid_severity' as any
        });
      }).toThrow('Invalid severity: invalid_severity');
    });

    test('should validate impact rule registration', () => {
      expect(() => {
        errorClassifier.registerImpactRule({
          ruleId: 'invalid-impact-rule',
          name: 'InvalidImpactRule',
          enabled: true,
          priority: 50,
          condition: { criteria: [] },
          impact: 'invalid_impact' as any
        });
      }).toThrow('Invalid impact: invalid_impact');
    });

    test('should validate recoverability rule registration', () => {
      expect(() => {
        errorClassifier.registerRecoverabilityRule({
          ruleId: 'invalid-recoverability-rule',
          name: 'InvalidRecoverabilityRule',
          enabled: true,
          priority: 50,
          condition: { criteria: [] },
          recoverability: 'invalid_recoverability' as any
        });
      }).toThrow('Invalid recoverability: invalid_recoverability');
    });

    test('should handle rule registration errors gracefully', () => {
      console.error = jest.fn();
      
      // Mock validation to throw
      jest.spyOn(errorClassifier as any, 'validateClassificationRule').mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });
      
      const rule = {
        ruleId: 'failing-rule',
        name: 'FailingRule',
        enabled: true,
        priority: 50,
        condition: { criteria: [] },
        result: {}
      };
      
      expect(() => errorClassifier.registerClassificationRule(rule as any)).toThrow('Validation failed');
      expect(console.error).toHaveBeenCalledWith('Failed to register classification rule: Error: Validation failed');
      
      console.error = jest.requireActual('console').error;
    });
  });

  describe('Rule Retrieval', () => {
    test('should get all classification rules', () => {
      const rules = errorClassifier.getClassificationRules();
      expect(Array.isArray(rules)).toBe(true);
      // Should have default rules
      expect(rules.length).toBeGreaterThan(0);
    });

    test('should get all severity rules', () => {
      const rules = errorClassifier.getSeverityRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    test('should get all impact rules', () => {
      const rules = errorClassifier.getImpactRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    test('should get all recoverability rules', () => {
      const rules = errorClassifier.getRecoverabilityRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    test('should throw error when managing rules without initialization', () => {
      const uninitializedClassifier = new ErrorClassifier();
      
      expect(() => uninitializedClassifier.getClassificationRules())
        .toThrow('Error Classifier is not initialized. Call initialize() first.');
        
      expect(() => uninitializedClassifier.registerClassificationRule({} as any))
        .toThrow('Error Classifier is not initialized. Call initialize() first.');
    });
  });

  describe('Clear Rules', () => {
    test('should clear all rules', () => {
      // Add a test rule first
      const rule = {
        ruleId: 'clear-test-rule',
        name: 'ClearTestRule',
        enabled: true,
        priority: 50,
        condition: { criteria: [] },
        result: {}
      };
      
      errorClassifier.registerClassificationRule(rule as any);
      expect(errorClassifier.getClassificationRules().length).toBeGreaterThan(0);
      
      // Clear all rules
      errorClassifier.clearRules();
      
      expect(errorClassifier.getClassificationRules().length).toBe(0);
      expect(errorClassifier.getSeverityRules().length).toBe(0);
      expect(errorClassifier.getImpactRules().length).toBe(0);
      expect(errorClassifier.getRecoverabilityRules().length).toBe(0);
    });
  });

  describe('Custom Rule Processing', () => {
    test('should apply custom classification rules with higher priority', async () => {
      // Register a high priority rule
      const customRule = {
        ruleId: 'custom-high-priority-rule',
        name: 'CustomHighPriorityRule',
        enabled: true,
        priority: 200, // Higher than default rules
        condition: {
          criteria: [
            {
              field: 'module.name',
              operator: 'equals' as const,
              value: 'TestModule1'
            }
          ]
        },
        result: {
          type: ErrorType.BUSINESS,
          source: ErrorSource.EXTERNAL,
          severity: ErrorSeverity.CRITICAL
        }
      };
      
      errorClassifier.registerClassificationRule(customRule as any);
      
      const error = new Error('Custom error for testing');
      const source = TEST_MODULE_SOURCES[0]; // TestModule1
      
      const classification = await errorClassifier.classify(error, source);
      
      // Should match our custom rule
      expect(classification.type).toBe(ErrorType.BUSINESS);
      expect(classification.source).toBe(ErrorSource.EXTERNAL);
      expect(classification.severity).toBe(ErrorSeverity.CRITICAL);
    });

    test('should apply multiple matching rules with priority ordering', async () => {
      // Register two rules that both match
      const highPriorityRule = {
        ruleId: 'high-priority-rule',
        name: 'HighPriorityRule',
        enabled: true,
        priority: 150,
        condition: {
          criteria: [
            {
              field: 'error.message',
              operator: 'contains' as const,
              value: 'priority'
            }
          ]
        },
        severity: ErrorSeverity.HIGH
      };
      
      const lowPriorityRule = {
        ruleId: 'low-priority-rule',
        name: 'LowPriorityRule',
        enabled: true,
        priority: 50,
        condition: {
          criteria: [
            {
              field: 'error.message',
              operator: 'contains' as const,
              value: 'priority'
            }
          ]
        },
        severity: ErrorSeverity.LOW
      };
      
      errorClassifier.registerSeverityRule(highPriorityRule as any);
      errorClassifier.registerSeverityRule(lowPriorityRule as any);
      
      const error = new Error('Error with priority testing');
      const classification = await errorClassifier.classify(error, mockModuleSource);
      
      // Should use the higher priority rule
      expect(classification.severity).toBe(ErrorSeverity.HIGH);
    });

    test('should not apply disabled rules', async () => {
      const disabledRule = {
        ruleId: 'disabled-rule',
        name: 'DisabledRule',
        enabled: false, // Disabled
        priority: 300, // Very high priority
        condition: {
          criteria: [
            {
              field: 'error.message',
              operator: 'contains' as const,
              value: 'disabled'
            }
          ]
        },
        result: {
          type: ErrorType.BUSINESS,
          severity: ErrorSeverity.CRITICAL
        }
      };
      
      errorClassifier.registerClassificationRule(disabledRule as any);
      
      const error = new Error('Error with disabled rule testing');
      const classification = await errorClassifier.classify(error, mockModuleSource);
      
      // Should not match the disabled rule and use default classification
      expect(classification.type).toBe(ErrorType.TECHNICAL);
      expect(classification.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });
});

describe('Utility Methods', () => {
  let localErrorClassifier: ErrorClassifier;
  
  beforeEach(async () => {
    localErrorClassifier = new ErrorClassifier();
    await localErrorClassifier.initialize();
  });

  test('should enable and disable metrics collection', () => {
    const statusBefore = localErrorClassifier.getStatus();
    expect(statusBefore.enableMetrics).toBe(true);
    
    localErrorClassifier.setMetricsEnabled(false);
    const statusAfter = localErrorClassifier.getStatus();
    expect(statusAfter.enableMetrics).toBe(false);
    
    localErrorClassifier.setMetricsEnabled(true);
    const statusFinal = localErrorClassifier.getStatus();
    expect(statusFinal.enableMetrics).toBe(true);
  });

  test('should get classifier status', () => {
    const status = localErrorClassifier.getStatus();
    
    expect(status).toBeDefined();
    expect(typeof status.isInitialized).toBe('boolean');
    expect(typeof status.enableMetrics).toBe('boolean');
    expect(typeof status.classificationRulesCount).toBe('number');
    expect(typeof status.severityRulesCount).toBe('number');
    expect(typeof status.impactRulesCount).toBe('number');
    expect(typeof status.recoverabilityRulesCount).toBe('number');
  });
});

describe('Shutdown', () => {
  let shutdownErrorClassifier: ErrorClassifier;
  let shutdownMockModuleSource: ModuleSource;
  
  beforeEach(async () => {
    shutdownErrorClassifier = new ErrorClassifier();
    await shutdownErrorClassifier.initialize();
    shutdownMockModuleSource = TEST_MODULE_SOURCES[0];
  });

  test('should shutdown successfully and clear rules', async () => {
    // Add some rules first
    const rule = {
      ruleId: 'shutdown-test-rule',
      name: 'ShutdownTestRule',
      enabled: true,
      priority: 50,
      condition: { criteria: [] },
      result: {}
    };
    
    shutdownErrorClassifier.registerClassificationRule(rule as any);
    expect(shutdownErrorClassifier.getClassificationRules().length).toBeGreaterThan(0);
    
    await shutdownErrorClassifier.shutdown();
    
    const status = shutdownErrorClassifier.getStatus();
    expect(status.isInitialized).toBe(false);
    // Rules should be cleared on shutdown
    expect(status.classificationRulesCount).toBe(0);
  });

  test('should handle shutdown errors gracefully', async () => {
    // Mock clearRules to throw
    jest.spyOn(shutdownErrorClassifier, 'clearRules').mockImplementationOnce(() => {
      throw new Error('Clear rules failed');
    });
    
    await expect(shutdownErrorClassifier.shutdown()).rejects.toThrow('Clear rules failed');
  });

  test('should not shutdown when not initialized', async () => {
    const uninitializedClassifier = new ErrorClassifier();
    // Should not throw
    await expect(uninitializedClassifier.shutdown()).resolves.not.toThrow();
  });
});

describe('Edge Cases', () => {
  let edgeErrorClassifier: ErrorClassifier;
  let edgeMockModuleSource: ModuleSource;
  
  beforeEach(async () => {
    edgeErrorClassifier = new ErrorClassifier();
    await edgeErrorClassifier.initialize();
    edgeMockModuleSource = TEST_MODULE_SOURCES[0];
  });

  test('should handle error with empty message', async () => {
    const emptyError = new Error('');
    const classification = await edgeErrorClassifier.classify(emptyError, edgeMockModuleSource);
    
    // Should still classify with defaults
    expect(classification).toBeDefined();
    expect(classification.type).toBe(ErrorType.TECHNICAL);
  });

  test('should handle error with very long message', async () => {
    const longMessage = 'A'.repeat(10000); // 10KB message
    const longError = new Error(longMessage);
    const classification = await edgeErrorClassifier.classify(longError, edgeMockModuleSource);
    
    expect(classification).toBeDefined();
  });

  test('should handle module source with missing fields', async () => {
    const incompleteSource = {
      moduleId: 'incomplete-module',
      moduleName: 'IncompleteModule'
      // Missing version, fileName, etc.
    } as ModuleSource;
    
    const error = new Error('Error with incomplete source');
    const classification = await edgeErrorClassifier.classify(error, incompleteSource);
    
    expect(classification).toBeDefined();
  });

  test('should maintain performance with many rules', async () => {
    // Add many rules
    for (let i = 0; i < 100; i++) {
      const rule = {
        ruleId: `performance-rule-${i}`,
        name: `PerformanceRule${i}`,
        enabled: true,
        priority: i,
        condition: {
          criteria: [
            {
              field: 'error.message',
              operator: 'contains' as const,
              value: `test${i}`
            }
          ]
        },
        result: {
          type: ErrorType.TECHNICAL
        }
      };
      
      edgeErrorClassifier.registerClassificationRule(rule as any);
    }
    
    expect(edgeErrorClassifier.getClassificationRules().length).toBeGreaterThanOrEqual(100);
    
    // Should still perform classification reasonably fast
    const startTime = Date.now();
    const error = new Error('Performance test error');
    const classification = await edgeErrorClassifier.classify(error, edgeMockModuleSource);
    const endTime = Date.now();
    
    expect(classification).toBeDefined();
    expect(endTime - startTime).toBeLessThan(1000); // Should be under 1 second
  });
});