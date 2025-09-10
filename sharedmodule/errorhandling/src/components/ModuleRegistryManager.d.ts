import { ModuleRegistration } from '../../../SharedTypes';
/**
 * Module Registry Manager - Manages all registered modules' error handling configurations
 * Handles module lifecycle, configuration management, and dependency tracking
 */
export declare class ModuleRegistryManager {
    private modules;
    private moduleDependencies;
    private moduleConfigs;
    private isInitialized;
    private enableMetrics;
    /**
     * Constructs the Module Registry Manager
     */
    constructor();
    /**
     * Initialize the module registry manager
     */
    initialize(): Promise<void>;
    /**
     * Register a module with the registry
     * @param module - Module registration information
     */
    registerModule(module: ModuleRegistration): void;
    /**
     * Unregister a module from the registry
     * @param moduleId - Module ID to unregister
     */
    unregisterModule(moduleId: string): void;
    /**
     * Get module registration by ID
     * @param moduleId - Module ID
     * @returns Module registration or null if not found
     */
    getModule(moduleId: string): ModuleRegistration | null;
    /**
     * Get all registered modules
     * @returns Array of all module registrations
     */
    getAllModules(): ModuleRegistration[];
    /**
     * Get modules by type or other criteria
     * @param filter - Filter criteria
     * @returns Array of filtered modules
     */
    getModulesByFilter(filter: {
        type?: string;
        version?: string;
        hasDependencies?: boolean;
        status?: string;
    }): ModuleRegistration[];
    /**
     * Get module dependencies
     * @param moduleId - Module ID
     * @returns Array of dependency module IDs
     */
    getModuleDependencies(moduleId: string): string[];
    /**
     * Get modules that depend on the given module
     * @param moduleId - Module ID
     * @returns Array of dependent module IDs
     */
    getDependents(moduleId: string): string[];
    /**
     * Get module configuration
     * @param moduleId - Module ID
     * @returns Module configuration or null if not found
     */
    getModuleConfig(moduleId: string): any;
    /**
     * Update module configuration
     * @param moduleId - Module ID
     * @param config - Configuration updates
     */
    updateModuleConfig(moduleId: string, config: any): void;
    /**
     * Increment module error count
     * @param moduleId - Module ID
     */
    incrementErrorCount(moduleId: string): void;
    /**
     * Increment module success count
     * @param moduleId - Module ID
     */
    incrementSuccessCount(moduleId: string): void;
    /**
     * Check if module is healthy
     * @param moduleId - Module ID
     * @returns Whether module is healthy
     */
    isModuleHealthy(moduleId: string): boolean;
    /**
     * Get module health status for all modules
     * @returns Health status for all modules
     */
    getAllModulesHealth(): Record<string, any>;
    /**
     * Resolve dependency order for modules
     * @returns Array of module IDs in dependency order
     */
    resolveDependencyOrder(): string[];
    /**
     * Shutdown the module registry manager
     */
    shutdown(): Promise<void>;
    /**
     * Get registry manager status
     * @returns Registry status information
     */
    getStatus(): any;
    /**
     * Enable or disable metrics collection
     * @param enabled - Whether to enable metrics
     */
    setMetricsEnabled(enabled: boolean): void;
    /**
     * Validate module registration
     * @param module - Module registration to validate
     * @throws Error if validation fails
     */
    private validateModuleRegistration;
    /**
     * Validate module dependencies
     * @param module - Module registration
     * @throws Error if dependencies are invalid
     */
    private validateDependencies;
    /**
     * Ensure registry manager is initialized
     * @throws Error if not initialized
     */
    private ensureInitialized;
}
