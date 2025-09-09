import { ResponseRouterEngine } from '../src/components/ResponseRouterEngine';
import { 
  ErrorContext, 
  ModuleResponse, 
  ResponseHandler,
  RoutingRule,
  RouteCondition,
  ModuleRegistration,
  ErrorType,
  ErrorSeverity
} from '../types/ErrorHandlingCenter.types';

describe('ResponseRouterEngine', () => {
  let responseRouterEngine: ResponseRouterEngine;
  let mockDefaultHandler: jest.Mocked<ResponseHandler>;
  let mockModuleHandler: jest.Mocked<ResponseHandler>;
  let mockCustomHandler: jest.Mocked<ResponseHandler>;
  let mockErrorContext: ErrorContext;
  let mockCriticalErrorContext: ErrorContext;

  beforeEach(() => {
    mockDefaultHandler = {
      execute: jest.fn()
    } as jest.Mocked<ResponseHandler>;

    mockModuleHandler = {
      execute: jest.fn()
    } as jest.Mocked<ResponseHandler>;

    mockCustomHandler = {
      execute: jest.fn()
    } as jest.Mocked<ResponseHandler>;

    responseRouterEngine = new ResponseRouterEngine(mockDefaultHandler);

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
        source: 'module' as any,
        type: 'technical' as any,
        severity: 'medium' as any,
        impact: 'single_module' as any,
        recoverability: 'recoverable' as any
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
        severity: 'critical' as any
      }
    };

    // Setup default mock behavior
    mockDefaultHandler.execute.mockResolvedValue({
      responseId: 'default-response',
      errorId: 'test-error-1',
      result: {
        status: 'success' as any,
        message: 'Default handler executed',
        details: '',
        code: 'DEFAULT_HANDLER'
      },
      timestamp: new Date(),
      processingTime: 100,
      data: {
        moduleName: 'DefaultHandler',
        moduleId: 'default_handler',
        response: {},
        config: {},
        metadata: {}
      },
      actions: [],
      annotations: []
    } as any);

    mockModuleHandler.execute.mockResolvedValue({
      responseId: 'module-response',
      errorId: 'test-error-1',
      result: {
        status: 'success' as any,
        message: 'Module handler executed',
        details: '',
        code: 'MODULE_HANDLER'
      },
      timestamp: new Date(),
      processingTime: 150,
      data: {
        moduleName: 'TestModule',
        moduleId: 'test-module',
        response: {},
        config: {},
        metadata: {}
      },
      actions: [],
      annotations: []
    } as any);

    mockCustomHandler.execute.mockResolvedValue({
      responseId: 'custom-response',
      errorId: 'test-error-1',
      result: {
        status: 'success' as any,
        message: 'Custom handler executed',
        details: '',
        code: 'CUSTOM_HANDLER'
      },
      timestamp: new Date(),
      processingTime: 200,
      data: {
        moduleName: 'CustomHandler',
        moduleId: 'custom_handler',
        response: {},
        config: {},
        metadata: {}
      },
      actions: [],
      annotations: []
    } as any);
  });

  afterEach(async () => {
    if (responseRouterEngine) {
      await responseRouterEngine.shutdown();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await responseRouterEngine.initialize();
      const status = responseRouterEngine.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    test('should register default routing rules on initialization', async () => {
      await responseRouterEngine.initialize();
      const routingRules = responseRouterEngine.getRoutingRules();
      
      expect(routingRules.length).toBeGreaterThan(0);
      expect(routingRules.some(rule => rule.name.includes('Critical') || rule.name.includes('Technical')));
    });

    test('should not initialize twice', async () => {
      await responseRouterEngine.initialize();
      await responseRouterEngine.initialize();
      
      const status = responseRouterEngine.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    test('should handle initialization errors', async () => {
      // Mock registerDefaultRoutingRules to throw error
      jest.spyOn(responseRouterEngine as any, 'registerDefaultRoutingRules').mockImplementation(() => {
        throw new Error('Rule registration failed');
      });

      await expect(responseRouterEngine.initialize())
        .rejects.toThrow('Rule registration failed');
    });
  });

  describe('Error Routing', () => {
    beforeEach(async () => {
      await responseRouterEngine.initialize();
    });

    test('should route error to default handler when no specific rules match', async () => {
      const handler = await responseRouterEngine.route(mockErrorContext);
      
      expect(handler).toBe(mockDefaultHandler);
    });

    test('should route error to matching routing rule handler', async () => {
      const customRule: RoutingRule = {
        ruleId: 'custom-rule',
        name: 'Custom Rule',
        priority: 50,
        condition: {
          moduleIds: ['test-module']
        },
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(customRule);
      
      const handler = await responseRouterEngine.route(mockErrorContext);
      
      expect(handler).toBe(mockCustomHandler);
    });

    test('should route error to module-specific handler', async () => {
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);
      
      const handler = await responseRouterEngine.route(mockErrorContext);
      
      expect(handler).toBe(mockModuleHandler);
    });

    test('should prioritize custom routing rules over module handlers', async () => {
      const customRule: RoutingRule = {
        ruleId: 'custom-priority-rule',
        name: 'Custom Priority Rule',
        priority: 90, // High priority
        condition: {
          moduleIds: ['test-module']
        },
        handler: mockCustomHandler,
        enabled: true
      };

      const moduleRegistration: ModuleRegistration = {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      responseRouterEngine.registerRoute(customRule);
      responseRouterEngine.registerModule(moduleRegistration);
      
      const handler = await responseRouterEngine.route(mockErrorContext);
      
      // Custom rule should take precedence due to priority
      expect(handler).toBe(mockCustomHandler);
    });

    test('should route error by severity using default rules', async () => {
      const handler = await responseRouterEngine.route(mockCriticalErrorContext);
      
      expect(handler).toBe(mockDefaultHandler); // Default critical errors rule
    });

    test('should handle routing errors gracefully', async () => {
      const originalRouteHandler = responseRouterEngine['findHandlerByRoutingRules'];
      jest.spyOn(responseRouterEngine as any, 'findHandlerByRoutingRules').mockImplementation(() => {
        throw new Error('Routing failed');
      });

      const handler = await responseRouterEngine.route(mockErrorContext);
      
      expect(handler).toBe(mockDefaultHandler); // Should fallback to default
      
      (responseRouterEngine as any).findHandlerByRoutingRules = originalRouteHandler;
    });

    test('should multiple condition matching in routing rules', async () => {
      const complexRule: RoutingRule = {
        ruleId: 'complex-rule',
        name: 'Complex Rule',
        priority: 80,
        condition: {
          moduleIds: ['test-module'],
          errorTypes: ['technical' as ErrorType],
          severities: ['medium' as ErrorSeverity]
        },
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(complexRule);
      
      const handler = await responseRouterEngine.route(mockErrorContext);
      
      expect(handler).toBe(mockCustomHandler);
    });

    test('should not route to disabled rules', async () => {
      const disabledRule: RoutingRule = {
        ruleId: 'disabled-rule',
        name: 'Disabled Rule',
        priority: 90,
        condition: {
          moduleIds: ['test-module']
        },
        handler: mockCustomHandler,
        enabled: false
      };

      responseRouterEngine.registerRoute(disabledRule);
      
      const handler = await responseRouterEngine.route(mockErrorContext);
      
      expect(handler).toBe(mockDefaultHandler); // Should use default
    });

    test('should route errors in priority order', async () => {
      const lowPriorityRule: RoutingRule = {
        ruleId: 'low-priority-rule',
        name: 'Low Priority Rule',
        priority: 10,
        condition: {
          moduleIds: ['test-module']
        },
        handler: mockModuleHandler,
        enabled: true
      };

      const highPriorityRule: RoutingRule = {
        ruleId: 'high-priority-rule',
        name: 'High Priority Rule',
        priority: 90,
        condition: {
          moduleIds: ['test-module']
        },
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(lowPriorityRule);
      responseRouterEngine.registerRoute(highPriorityRule);
      
      const handler = await responseRouterEngine.route(mockErrorContext);
      
      expect(handler).toBe(mockCustomHandler); // High priority should win
    });
  });

  describe('Route Registration', () => {
    beforeEach(async () => {
      await responseRouterEngine.initialize();
    });

    test('should register route successfully', () => {
      const rule: RoutingRule = {
        ruleId: 'test-route',
        name: 'Test Route',
        priority: 50,
        condition: {
          moduleIds: ['test-module']
        },
        handler: mockCustomHandler,
        enabled: true
      };

      expect(() => responseRouterEngine.registerRoute(rule)).not.toThrow();
      
      const routingRules = responseRouterEngine.getRoutingRules();
      expect(routingRules.some(r => r.ruleId === 'test-route')).toBe(true);
    });

    test('should handle registration errors', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock Map.set to throw an error
      jest.spyOn(Map.prototype, 'set').mockImplementationOnce(() => {
        throw new Error('Registration failed');
      });

      const rule: RoutingRule = {
        ruleId: 'test-route',
        name: 'Test Route',
        priority: 50,
        condition: {
          moduleIds: ['test-module']
        },
        handler: mockCustomHandler,
        enabled: true
      };

      expect(() => responseRouterEngine.registerRoute(rule))
        .toThrow('Registration failed');
      
      jest.restoreAllMocks();
    });
  });

  describe('Route Unregistration', () => {
    beforeEach(async () => {
      await responseRouterEngine.initialize();
    });

    test('should unregister route successfully', () => {
      const rule: RoutingRule = {
        ruleId: 'test-route',
        name: 'Test Route',
        priority: 50,
        condition: {
          moduleIds: ['test-module']
        },
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(rule);
      expect(responseRouterEngine.getRoutingRules().some(r => r.ruleId === 'test-route')).toBe(true);
      
      responseRouterEngine.unregisterRoute('test-route');
      expect(responseRouterEngine.getRoutingRules().some(r => r.ruleId === 'test-route')).toBe(false);
    });

    test('should handle unregistering non-existent route', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => {
        responseRouterEngine.unregisterRoute('non-existent-route');
      }).not.toThrow();
      
      expect(console.warn).toHaveBeenCalledWith(
        'Routing rule non-existent-route not found for unregistration'
      );
      
      jest.restoreAllMocks();
    });
  });

  describe('Module Registration', () => {
    beforeEach(async () => {
      await responseRouterEngine.initialize();
    });

    test('should register module successfully', () => {
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);
      
      const moduleHandlers = responseRouterEngine.getModuleHandlers();
      expect(moduleHandlers.get('test-module')).toBe(mockModuleHandler);
      
      // Should also register routing rule
      const routingRules = responseRouterEngine.getRoutingRules();
      expect(routingRules.some(rule => rule.name.includes('TestModule'))).toBe(true);
    });

    test('should register module without response handler', () => {
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0'
        // No responseHandler
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);
      
      const moduleHandlers = responseRouterEngine.getModuleHandlers();
      expect(moduleHandlers.get('test-module')).toBeUndefined();
    });

    test('should register module with custom rules', () => {
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler,
        customRules: [
          {
            ruleId: 'custom-module-rule',
            name: 'Custom Module Rule',
            ruleType: 'validation' as any,
            condition: {
              field: 'moduleId',
              operator: 'equals' as any,
              value: 'test-module'
            },
            action: {},
            enabled: true,
            priority: 75
          }
        ]
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);
      
      // Should have module-specific rule
      const routingRules = responseRouterEngine.getRoutingRules();
      expect(routingRules.some(rule => rule.name.includes('TestModule'))).toBe(true);
      expect(routingRules.some(rule => rule.name.includes('Custom Module Rule'))).toBe(true);
    });

    test('should handle module registration errors', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      // Mock Map.set to throw an error
      jest.spyOn(Map.prototype, 'set').mockImplementationOnce(() => {
        throw new Error('Module registration failed');
      });

      expect(() => responseRouterEngine.registerModule(moduleRegistration))
        .toThrow('Module registration failed');
      
      jest.restoreAllMocks();
    });
  });

  describe('Module Unregistration', () => {
    beforeEach(async () => {
      await responseRouterEngine.initialize();
    });

    test('should unregister module successfully', () => {
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);
      expect(responseRouterEngine.getModuleHandlers().get('test-module')).toBeDefined();
      
      responseRouterEngine.unregisterModule('test-module');
      expect(responseRouterEngine.getModuleHandlers().get('test-module')).toBeUndefined();
    });

    test('should remove module routing rules on unregistration', () => {
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);
      expect(responseRouterEngine.getRoutingRules().some(rule => rule.name.includes('TestModule'))).toBe(true);
      
      responseRouterEngine.unregisterModule('test-module');
      expect(responseRouterEngine.getRoutingRules().some(rule => rule.name.includes('TestModule'))).toBe(false);
    });

    test('should handle unregistering non-existent module', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => {
        responseRouterEngine.unregisterModule('non-existent-module');
      }).not.toThrow();
      
      expect(console.warn).toHaveBeenCalledWith(
        'Module handler non-existent-module not found for unregistration'
      );
      
      jest.restoreAllMocks();
    });
  });

  describe('Routing Rule Matching', () => {
    beforeEach(async () => {
      await responseRouterEngine.initialize();
    });

    test('should match module IDs condition', async () => {
      const rule: RoutingRule = {
        ruleId: 'module-id-rule',
        name: 'Module ID Rule',
        priority: 50,
        condition: {
          moduleIds: ['test-module', 'other-module']
        },
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(rule);
      
      const handler = await responseRouterEngine.route(mockErrorContext);
      expect(handler).toBe(mockCustomHandler);
    });

    test('should match error types condition', async () => {
      const rule: RoutingRule = {
        ruleId: 'error-type-rule',
        name: 'Error Type Rule',
        priority: 50,
        condition: {
          errorTypes: ['technical' as ErrorType, 'business' as ErrorType]
        },
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(rule);
      
      const handler = await responseRouterEngine.route(mockErrorContext);
      expect(handler).toBe(mockCustomHandler);
    });

    test('should match severities condition', async () => {
      const rule: RoutingRule = {
        ruleId: 'severity-rule',
        name: 'Severity Rule',
        priority: 50,
        condition: {
          severities: ['medium' as ErrorSeverity, 'high' as ErrorSeverity]
        },
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(rule);
      
      const handler = await responseRouterEngine.route(mockErrorContext);
      expect(handler).toBe(mockCustomHandler);
    });

    test('should match custom field conditions', async () => {
      const rule: RoutingRule = {
        ruleId: 'custom-field-rule',
        name: 'Custom Field Rule',
        priority: 50,
        condition: {
          custom: {
            'isUnderConstruction': true
          }
        },
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(rule);
      
      const errorWithCustomField = {
        ...mockErrorContext,
        data: {
          isUnderConstruction: true
        }
      };
      
      const handler = await responseRouterEngine.route(errorWithCustomField);
      expect(handler).toBe(mockCustomHandler);
    });

    test('should not match if any condition fails', async () => {
      const rule: RoutingRule = {
        ruleId: 'multiple-conditions-rule',
        name: 'Multiple Conditions Rule',
        priority: 50,
        condition: {
          moduleIds: ['test-module'],
          severities: ['high' as ErrorSeverity] // This won't match (error has medium severity)
        },
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(rule);
      
      const handler = await responseRouterEngine.route(mockErrorContext);
      expect(handler).toBe(mockDefaultHandler); // Should not match
    });

    test('should match nested custom field conditions', async () => {
      const rule: RoutingRule = {
        ruleId: 'nested-field-rule',
        name: 'Nested Field Rule',
        priority: 50,
        condition: {
          custom: {
            'user.role': 'admin'
          }
        },
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(rule);
      
      const errorWithNestedField = {
        ...mockErrorContext,
        data: {
          user: {
            role: 'admin',
            permissions: ['read', 'write']
          }
        }
      };
      
      const handler = await responseRouterEngine.route(errorWithNestedField);
      expect(handler).toBe(mockCustomHandler);
    });

    test('should handle undefined nested fields gracefully', async () => {
      const rule: RoutingRule = {
        ruleId: 'undefined-nested-rule',
        name: 'Undefined Nested Rule',
        priority: 50,
        condition: {
          custom: {
            'undefined.field': 'value'
          }
        },
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(rule);
      
      const handler = await responseRouterEngine.route(mockErrorContext);
      expect(handler).toBe(mockDefaultHandler); // Should not match undefined field
    });
  });

  describe('Handler Retrieval', () => {
    beforeEach(async () => {
      await responseRouterEngine.initialize();
    });

    test('should get all routing rules sorted by priority', async () => {
      const lowPriorityRule: RoutingRule = {
        ruleId: 'low-priority',
        name: 'Low Priority',
        priority: 10,
        condition: {
          moduleIds: ['test-module']
        },
        handler: mockCustomHandler,
        enabled: true
      };

      const highPriorityRule: RoutingRule = {
        ruleId: 'high-priority',
        name: 'High Priority',
        priority: 90,
        condition: {
          moduleIds: ['test-module']
        },
        handler: mockModuleHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(lowPriorityRule);
      responseRouterEngine.registerRoute(highPriorityRule);
      
      const rules = responseRouterEngine.getRoutingRules();
      
      expect(rules[0].priority).toBeGreaterThan(rules[1].priority);
      expect(rules[0].name).toBe('High Priority');
      expect(rules[1].name).toBe('Low Priority');
    });

    test('should get all module handlers', async () => {
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);
      
      const handlers = responseRouterEngine.getModuleHandlers();
      expect(handlers.get('test-module')).toBe(mockModuleHandler);
    });
  });

  describe('Status and Configuration', () => {
    beforeEach(async () => {
      await responseRouterEngine.initialize();
    });

    test('should return correct status', () => {
      const status = responseRouterEngine.getStatus();
      
      expect(status.isInitialized).toBe(true);
      expect(status.enableMetrics).toBe(true);
      expect(status.routingRulesCount).toBeGreaterThan(0);
      expect(status.moduleHandlersCount).toBeGreaterThanOrEqual(0);
      expect(status.hasDefaultHandler).toBe(true);
    });

    test('should enable and disable metrics', () => {
      responseRouterEngine.setMetricsEnabled(false);
      
      let status = responseRouterEngine.getStatus();
      expect(status.enableMetrics).toBe(false);
      
      responseRouterEngine.setMetricsEnabled(true);
      status = responseRouterEngine.getStatus();
      expect(status.enableMetrics).toBe(true);
    });
  });

  describe('Shutdown', () => {
    test('should shutdown successfully', async () => {
      await responseRouterEngine.initialize();
      
      expect(responseRouterEngine.getRoutingRules().length).toBeGreaterThan(0);
      
      await responseRouterEngine.shutdown();
      
      const status = responseRouterEngine.getStatus();
      expect(status.isInitialized).toBe(false);
      expect(responseRouterEngine.getRoutingRules().length).toBe(0);
      expect(responseRouterEngine.getModuleHandlers().size).toBe(0);
    });

    test('should handle shutdown errors gracefully', async () => {
      await responseRouterEngine.initialize();
      
      // Mock Map.clear to throw an error
      jest.spyOn(Map.prototype, 'clear').mockImplementation(() => {
        throw new Error('Shutdown failed');
      });

      await expect(responseRouterEngine.shutdown())
        .rejects.toThrow('Shutdown failed');
    });

    test('should shutdown when not initialized', async () => {
      const uninitializedRouter = new ResponseRouterEngine(mockDefaultHandler);
      
      await expect(uninitializedRouter.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await responseRouterEngine.initialize();
    });

    test('should handle error with missing classification', async () => {
      const errorWithoutClassification = {
        ...mockErrorContext,
        classification: undefined as any
      };

      await expect(responseRouterEngine.route(errorWithoutClassification))
        .rejects.toThrow();
    });

    test('should handle concurrent route operations', async () => {
      const routingPromises = Array(100).fill(null).map((_, i) => {
        const errorContext = { ...mockErrorContext, errorId: `concurrent-error-${i}` };
        return responseRouterEngine.route(errorContext);
      });

      const handlers = await Promise.all(routingPromises);
      
      expect(handlers).toHaveLength(100);
      handlers.forEach(handler => {
        expect(handler).toBeDefined();
      });
    });

    test('should handle very large number of routing rules', async () => {
      // Register many rules
      for (let i = 0; i < 1000; i++) {
        const rule: RoutingRule = {
          ruleId: `bulk-rule-${i}`,
          name: `Bulk Rule ${i}`,
          priority: Math.floor(Math.random() * 100),
          condition: {
            moduleIds: [`test-module-${i}`]
          },
          handler: mockCustomHandler,
          enabled: i % 2 === 0 // Enable every other rule
        };

        responseRouterEngine.registerRoute(rule);
      }

      const startTime = Date.now();
      const handler = await responseRouterEngine.route(mockErrorContext);
      const endTime = Date.now();

      expect(handler).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should be reasonably fast
    });

    test('should handle custom rule conversion from module rules', async () => {
      const moduleRegistration: ModuleRegistration = {
        moduleId: 'test-module',
        moduleName: 'TestModule',
        version: '1.0.0',
        responseHandler: mockModuleHandler,
        customRules: [
          {
            ruleId: 'custom-convert-rule',
            name: 'Custom Convert Rule',
            ruleType: 'validation' as any,
            condition: {
              field: 'moduleId',
              operator: 'equals' as any,
              value: 'test-module'
            },
            action: {},
            enabled: true,
            priority: 75
          }
        ]
      } as ModuleRegistration;

      responseRouterEngine.registerModule(moduleRegistration);
      
      // Should have converted custom rule
      const routingRules = responseRouterEngine.getRoutingRules();
      expect(routingRules.some(rule => rule.name.includes('Custom Convert Rule'))).toBe(true);
    });

    test('should handle routing rule with no conditions', async () => {
      const catchAllRule: RoutingRule = {
        ruleId: 'catch-all-rule',
        name: 'Catch All Rule',
        priority: 100,
        condition: {}, // No conditions - should match all
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(catchAllRule);
      
      const handler = await responseRouterEngine.route(mockErrorContext);
      expect(handler).toBe(mockCustomHandler);
    });

    test('should handle performance for complex matching', async () => {
      // Create a complex rule with many conditions
      const complexRule: RoutingRule = {
        ruleId: 'complex-matching-rule',
        name: 'Complex Matching Rule',
        priority: 95,
        condition: {
          moduleIds: Array(100).fill(null).map((_, i) => `module-${i}`),
          errorTypes: Array(10).fill(null).map((_, i) => `type-${i}`) as any,
          severities: Array(5).fill(null).map((_, i) => `severity-${i}`) as any,
          custom: {
            'complex.nested.field': 'value',
            'another.field': undefined as any
          }
        },
        handler: mockCustomHandler,
        enabled: true
      };

      responseRouterEngine.registerRoute(complexRule);
      
      const startTime = Date.now();
      const handler = await responseRouterEngine.route(mockErrorContext);
      const endTime = Date.now();

      expect(handler).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast even with complex rules
    });

    test('should handle handler lookup failures gracefully', async () => {
      // Create a rule with a handler that might fail to be found
      const rule: RoutingRule = {
        ruleId: 'handler-lookup-rule',
        name: 'Handler Lookup Rule',
        priority: 80,
        condition: {
          moduleIds: ['test-module']
        },
        handler: null as any, // This shouldn't happen in normal usage
        enabled: true
      };

      responseRouterEngine.registerRoute(rule);
      
      // Should handle gracefully and route to default
      const handler = await responseRouterEngine.route(mockErrorContext);
      expect(handler).toBe(mockDefaultHandler);
    });
  });
});