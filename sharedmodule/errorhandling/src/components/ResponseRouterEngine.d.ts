import { ErrorContext, ResponseHandler, ResponseRouterEngine as IResponseRouterEngine, RoutingRule, ModuleRegistration } from '../../../SharedTypes';
/**
 * Response Router Engine - Routes errors to appropriate response handlers
 * Implements routing strategies based on error type, module, and custom rules
 */
export declare class ResponseRouterEngine implements IResponseRouterEngine {
    private routingRules;
    private moduleHandlers;
    private defaultHandler;
    private isInitialized;
    private enableMetrics;
    /**
     * Constructs the Response Router Engine
     * @param defaultHandler - Default response handler when no specific handler is found
     */
    constructor(defaultHandler: ResponseHandler);
    /**
     * Initialize the response router engine
     */
    initialize(): Promise<void>;
    /**
     * Route error to appropriate response handler
     * @param error - Error context to route
     * @returns Promise<ResponseHandler> - The appropriate response handler
     */
    route(error: ErrorContext): Promise<ResponseHandler>;
    /**
     * Register a routing rule
     * @param rule - Routing rule to register
     */
    registerRoute(rule: RoutingRule): void;
    /**
     * Unregister a routing rule
     * @param ruleId - Rule ID to unregister
     */
    unregisterRoute(ruleId: string): void;
    /**
     * Register a module with its response handler
     * @param module - Module registration information
     */
    registerModule(module: ModuleRegistration): void;
    /**
     * Unregister a module
     * @param moduleId - Module ID to unregister
     */
    unregisterModule(moduleId: string): void;
    /**
     * Shutdown the response router engine
     */
    shutdown(): Promise<void>;
    /**
     * Get router engine status
     * @returns Router status information
     */
    getStatus(): any;
    /**
     * Enable or disable metrics collection
     * @param enabled - Whether to enable metrics
     */
    setMetricsEnabled(enabled: boolean): void;
    /**
     * Get all registered routing rules
     * @returns Array of routing rules
     */
    getRoutingRules(): RoutingRule[];
    /**
     * Get all registered module handlers
     * @returns Map of module ID to handler
     */
    getModuleHandlers(): Map<string, ResponseHandler>;
    /**
     * Find handler by routing rules
     * @param error - Error context
     * @returns Response handler or null if no matching rule found
     */
    private findHandlerByRoutingRules;
    /**
     * Find handler by module
     * @param error - Error context
     * @returns Response handler or null if no handler found
     */
    private findHandlerByModule;
    /**
     * Check if error matches routing rule condition
     * @param condition - Route condition to check
     * @param error - Error context
     * @returns Whether the condition matches
     */
    private matchesRoutingRule;
    /**
     * Get nested value from object using dot notation
     * @param obj - Object to get value from
     * @param path - Dot notation path
     * @returns Value or undefined
     */
    private getNestedValue;
    /**
     * Register default routing rules
     */
    private registerDefaultRoutingRules;
    /**
     * Register routing rules for a specific module
     * @param module - Module registration
     */
    private registerModuleRoutingRules;
    /**
     * Convert custom rule to route condition
     * @param customRule - Custom rule to convert
     * @returns Route condition
     */
    private convertCustomRuleToRouteCondition;
    /**
     * Remove routing rules for a specific module
     * @param moduleId - Module ID
     */
    private removeModuleRoutingRules;
    /**
     * Ensure router engine is initialized
     * @throws Error if not initialized
     */
    private ensureInitialized;
}
