import { 
  ErrorContext, 
  ResponseHandler,
  ResponseRouterEngine as IResponseRouterEngine,
  RoutingRule,
  RouteCondition,
  ModuleRegistration 
} from '../../../SharedTypes';

/**
 * Response Router Engine - Routes errors to appropriate response handlers
 * Implements routing strategies based on error type, module, and custom rules
 */
export class ResponseRouterEngine implements IResponseRouterEngine {
  private routingRules: Map<string, RoutingRule> = new Map();
  private moduleHandlers: Map<string, ResponseHandler> = new Map();
  private defaultHandler: ResponseHandler;
  private isInitialized: boolean = false;
  private enableMetrics: boolean = true;
  
  /**
   * Constructs the Response Router Engine
   * @param defaultHandler - Default response handler when no specific handler is found
   */
  constructor(defaultHandler: ResponseHandler) {
    this.defaultHandler = defaultHandler;
  }

  /**
   * Initialize the response router engine
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Set initialized first to allow rule registration
      this.isInitialized = true;
      
      // Register default routing rules
      this.registerDefaultRoutingRules();
      
      console.log('Response Router Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Response Router Engine:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Route error to appropriate response handler
   * @param error - Error context to route
   * @returns Promise<ResponseHandler> - The appropriate response handler
   */
  public async route(error: ErrorContext): Promise<ResponseHandler> {
    this.ensureInitialized();
    
    try {
      if (this.enableMetrics) {
        console.log(`Routing error ${error.errorId} to handler`);
      }

      // Try to find specific handler based on routing rules
      let handler = this.findHandlerByRoutingRules(error);
      
      if (!handler) {
        // Fallback to module-specific handler
        handler = this.findHandlerByModule(error);
      }
      
      if (!handler) {
        // Fallback to default handler
        handler = this.defaultHandler;
        if (this.enableMetrics) {
          console.log(`Using default handler for error ${error.errorId}`);
        }
      }

      return handler;
    } catch (error) {
      console.error(`Error routing error:`, error instanceof Error ? error : new Error(String(error)));
      return this.defaultHandler;
    }
  }

  /**
   * Register a routing rule
   * @param rule - Routing rule to register
   */
  public registerRoute(rule: RoutingRule): void {
    this.ensureInitialized();
    
    try {
      this.routingRules.set(rule.ruleId, rule);
      console.log(`Routing rule ${rule.name} (${rule.ruleId}) registered successfully`);
    } catch (error) {
      console.error(`Failed to register routing rule ${rule.ruleId}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a routing rule
   * @param ruleId - Rule ID to unregister
   */
  public unregisterRoute(ruleId: string): void {
    this.ensureInitialized();
    
    try {
      const deleted = this.routingRules.delete(ruleId);
      if (deleted) {
        console.log(`Routing rule ${ruleId} unregistered successfully`);
      } else {
        console.warn(`Routing rule ${ruleId} not found for unregistration`);
      }
    } catch (error) {
      console.error(`Failed to unregister routing rule ${ruleId}:`, error);
      throw error;
    }
  }

  /**
   * Register a module with its response handler
   * @param module - Module registration information
   */
  public registerModule(module: ModuleRegistration): void {
    this.ensureInitialized();
    
    try {
      if (module.responseHandler) {
        this.moduleHandlers.set(module.moduleId, module.responseHandler);
      }
      
      // Register routing rules for this module
      this.registerModuleRoutingRules(module);
      
      console.log(`Module ${module.moduleName} (${module.moduleId}) handler registered successfully`);
    } catch (error) {
      console.error(`Failed to register module handler ${module.moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a module
   * @param moduleId - Module ID to unregister
   */
  public unregisterModule(moduleId: string): void {
    this.ensureInitialized();
    
    try {
      const deleted = this.moduleHandlers.delete(moduleId);
      
      if (deleted) {
        // Remove routing rules for this module
        this.removeModuleRoutingRules(moduleId);
        console.log(`Module ${moduleId} handler unregistered successfully`);
      } else {
        console.warn(`Module handler ${moduleId} not found for unregistration`);
      }
    } catch (error) {
      console.error(`Failed to unregister module handler ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Shutdown the response router engine
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Shutting down Response Router Engine...');
      
      // Clear routing rules and handlers
      this.routingRules.clear();
      this.moduleHandlers.clear();
      
      this.isInitialized = false;
      console.log('Response Router Engine shutdown completed');
    } catch (error) {
      console.error('Error during shutdown:', error instanceof Error ? error : new Error(String(error)));
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get router engine status
   * @returns Router status information
   */
  public getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      enableMetrics: this.enableMetrics,
      routingRulesCount: this.routingRules.size,
      moduleHandlersCount: this.moduleHandlers.size,
      hasDefaultHandler: !!this.defaultHandler
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
   * Get all registered routing rules
   * @returns Array of routing rules
   */
  public getRoutingRules(): RoutingRule[] {
    return Array.from(this.routingRules.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all registered module handlers
   * @returns Map of module ID to handler
   */
  public getModuleHandlers(): Map<string, ResponseHandler> {
    return new Map(this.moduleHandlers);
  }

  /**
   * Find handler by routing rules
   * @param error - Error context
   * @returns Response handler or null if no matching rule found
   */
  private findHandlerByRoutingRules(error: ErrorContext): ResponseHandler | null {
    // Sort rules by priority (highest first)
    const sortedRules = this.getRoutingRules();
    
    for (const rule of sortedRules) {
      if (!rule.enabled) continue;
      
      if (this.matchesRoutingRule(rule.condition, error)) {
        if (this.enableMetrics) {
          console.log(`Error ${error.errorId} matches routing rule ${rule.name}`);
        }
        return rule.handler;
      }
    }
    
    return null;
  }

  /**
   * Find handler by module
   * @param error - Error context
   * @returns Response handler or null if no handler found
   */
  private findHandlerByModule(error: ErrorContext): ResponseHandler | null {
    const handler = this.moduleHandlers.get(error.source.moduleId) || null;
    
    if (handler && this.enableMetrics) {
      console.log(`Error ${error.errorId} routed to module ${error.source.moduleId} handler`);
    }
    
    return handler;
  }

  /**
   * Check if error matches routing rule condition
   * @param condition - Route condition to check
   * @param error - Error context
   * @returns Whether the condition matches
   */
  private matchesRoutingRule(condition: RouteCondition, error: ErrorContext): boolean {
    // Check module IDs
    if (condition.moduleIds && condition.moduleIds.length > 0) {
      if (!condition.moduleIds.includes(error.source.moduleId)) {
        return false;
      }
    }
    
    // Check error types
    if (condition.errorTypes && condition.errorTypes.length > 0) {
      if (!condition.errorTypes.includes(error.classification.type)) {
        return false;
      }
    }
    
    // Check severities
    if (condition.severities && condition.severities.length > 0) {
      if (!condition.severities.includes(error.classification.severity)) {
        return false;
      }
    }
    
    // Check custom fields
    if (condition.custom) {
      for (const [key, expectedValue] of Object.entries(condition.custom)) {
        const actualValue = this.getNestedValue(error.data, key);
        if (actualValue !== expectedValue) {
          return false;
        }
      }
    }
    
    return true;
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
   * Register default routing rules
   */
  private registerDefaultRoutingRules(): void {
    // Critical errors get highest priority
    const criticalRule: RoutingRule = {
      ruleId: `critical_errors_${Date.now()}`,
      name: 'CriticalErrorsRule',
      priority: 100,
      condition: {
        severities: ['critical' as any]
      },
      handler: this.defaultHandler,
      enabled: true
    };
    this.registerRoute(criticalRule);

    // Under construction modules get special handling
    const underConstructionRule: RoutingRule = {
      ruleId: `under_construction_${Date.now()}`,
      name: 'UnderConstructionRule',
      priority: 90,
      condition: {
        custom: {
          'isUnderConstruction': true
        }
      },
      handler: this.defaultHandler,
      enabled: true
    };
    this.registerRoute(underConstructionRule);

    // Technical errors get specific handling
    const technicalRule: RoutingRule = {
      ruleId: `technical_errors_${Date.now()}`,
      name: 'TechnicalErrorsRule',
      priority: 70,
      condition: {
        errorTypes: ['technical' as any]
      },
      handler: this.defaultHandler,
      enabled: true
    };
    this.registerRoute(technicalRule);
  }

  /**
   * Register routing rules for a specific module
   * @param module - Module registration
   */
  private registerModuleRoutingRules(module: ModuleRegistration): void {
    // Create rule for this specific module - only if responseHandler exists
    if (module.responseHandler) {
      const moduleRule: RoutingRule = {
        ruleId: `module_${module.moduleId}_${Date.now()}`,
        name: `Module${module.moduleName}Rule`,
        priority: 80,
        condition: {
          moduleIds: [module.moduleId]
        },
        handler: module.responseHandler,
        enabled: true
      };
      this.registerRoute(moduleRule);

      // Register custom rules for this module
      if (module.customRules) {
        for (const customRule of module.customRules) {
          const customRoutingRule: RoutingRule = {
            ruleId: `custom_${customRule.ruleId}_${Date.now()}`,
            name: customRule.name,
            priority: customRule.priority,
            condition: this.convertCustomRuleToRouteCondition(customRule),
            handler: module.responseHandler,
            enabled: true
          };
          this.registerRoute(customRoutingRule);
        }
      }
    }
  }

  /**
   * Convert custom rule to route condition
   * @param customRule - Custom rule to convert
   * @returns Route condition
   */
  private convertCustomRuleToRouteCondition(customRule: any): RouteCondition {
    const condition: RouteCondition = {};
    
    if (customRule.condition.field === 'moduleId') {
      condition.moduleIds = [customRule.condition.value];
    } else if (customRule.condition.field === 'errorType') {
      condition.errorTypes = [customRule.condition.value];
    } else if (customRule.condition.field === 'severity') {
      condition.severities = [customRule.condition.value];
    } else {
      // Custom field
      condition.custom = {
        [customRule.condition.field]: customRule.condition.value
      };
    }
    
    return condition;
  }

  /**
   * Remove routing rules for a specific module
   * @param moduleId - Module ID
   */
  private removeModuleRoutingRules(moduleId: string): void {
    const rulesToRemove = Array.from(this.routingRules.keys())
      .filter(ruleId => ruleId.includes(`module_${moduleId}`) || ruleId.includes(`custom_${moduleId}`));
    
    for (const ruleId of rulesToRemove) {
      this.unregisterRoute(ruleId);
    }
  }

  /**
   * Ensure router engine is initialized
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Response Router Engine is not initialized. Call initialize() first.');
    }
  }
}