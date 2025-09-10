import { 
  ModuleRegistration
} from '../../../SharedTypes';

/**
 * Module Registry Manager - Manages all registered modules' error handling configurations
 * Handles module lifecycle, configuration management, and dependency tracking
 */
export class ModuleRegistryManager {
  private modules: Map<string, ModuleRegistration> = new Map();
  private moduleDependencies: Map<string, string[]> = new Map();
  private moduleConfigs: Map<string, any> = new Map();
  private isInitialized: boolean = false;
  private enableMetrics: boolean = true;
  
  /**
   * Constructs the Module Registry Manager
   */
  constructor() {
    // Initialize with default configuration
  }

  /**
   * Initialize the module registry manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.isInitialized = true;
      console.log('Module Registry Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Module Registry Manager:', error);
      throw error;
    }
  }

  /**
   * Register a module with the registry
   * @param module - Module registration information
   */
  public registerModule(module: ModuleRegistration): void {
    this.ensureInitialized();
    
    try {
      // Validate module registration
      this.validateModuleRegistration(module);
      
      // Check if module already exists
      if (this.modules.has(module.moduleId)) {
        console.warn(`Module ${module.moduleId} is already registered. Overwriting...`);
      }
      
      // Register the module
      this.modules.set(module.moduleId, module);
      
      // Track dependencies
      this.moduleDependencies.set(module.moduleId, module.dependencies || []);
      
      // Store module configuration
      this.moduleConfigs.set(module.moduleId, {
        registrationTime: new Date(),
        lastUpdated: new Date(),
        status: 'active',
        errorCount: 0,
        successCount: 0
      });
      
      // Validate dependencies
      this.validateDependencies(module);
      
      if (this.enableMetrics) {
        console.log(`Module ${module.moduleName} (${module.moduleId}) registered successfully`);
        console.log(`  - Version: ${module.version}`);
        console.log(`  - Dependencies: ${module.dependencies ? module.dependencies.join(', ') : 'none'}`);
        console.log(`  - Policies: ${module.errorPolicies?.length || 0}`);
        console.log(`  - Custom rules: ${module.customRules?.length || 0}`);
      }
    } catch (error) {
      console.error(`Failed to register module ${module.moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a module from the registry
   * @param moduleId - Module ID to unregister
   */
  public unregisterModule(moduleId: string): void {
    this.ensureInitialized();
    
    try {
      const module = this.modules.get(moduleId);
      if (!module) {
        console.warn(`Module ${moduleId} not found for unregistration`);
        return;
      }
      
      // Check if other modules depend on this module
      const dependents = this.getDependents(moduleId);
      if (dependents.length > 0) {
        throw new Error(`Cannot unregister module ${moduleId}. It has ${dependents.length} dependent modules: ${dependents.join(', ')}`);
      }
      
      // Remove from registry
      this.modules.delete(moduleId);
      this.moduleDependencies.delete(moduleId);
      this.moduleConfigs.delete(moduleId);
      
      if (this.enableMetrics) {
        console.log(`Module ${module.moduleName} (${moduleId}) unregistered successfully`);
      }
    } catch (error) {
      console.error(`Failed to unregister module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Get module registration by ID
   * @param moduleId - Module ID
   * @returns Module registration or null if not found
   */
  public getModule(moduleId: string): ModuleRegistration | null {
    this.ensureInitialized();
    return this.modules.get(moduleId) || null;
  }

  /**
   * Get all registered modules
   * @returns Array of all module registrations
   */
  public getAllModules(): ModuleRegistration[] {
    this.ensureInitialized();
    return Array.from(this.modules.values());
  }

  /**
   * Get modules by type or other criteria
   * @param filter - Filter criteria
   * @returns Array of filtered modules
   */
  public getModulesByFilter(filter: {
    type?: string;
    version?: string;
    hasDependencies?: boolean;
    status?: string;
  }): ModuleRegistration[] {
    this.ensureInitialized();
    
    let modules = Array.from(this.modules.values());
    
    if (filter.type) {
      modules = modules.filter(m => m.metadata?.category === filter.type);
    }
    
    if (filter.version) {
      modules = modules.filter(m => m.version === filter.version);
    }
    
    if (filter.hasDependencies !== undefined) {
      modules = modules.filter(m => 
        filter.hasDependencies ? 
        (m.dependencies && m.dependencies.length > 0) : 
        (!m.dependencies || m.dependencies.length === 0)
      );
    }
    
    if (filter.status) {
      modules = modules.filter(m => {
        const config = this.moduleConfigs.get(m.moduleId);
        return config && config.status === filter.status;
      });
    }
    
    return modules;
  }

  /**
   * Get module dependencies
   * @param moduleId - Module ID
   * @returns Array of dependency module IDs
   */
  public getModuleDependencies(moduleId: string): string[] {
    this.ensureInitialized();
    return this.moduleDependencies.get(moduleId) || [];
  }

  /**
   * Get modules that depend on the given module
   * @param moduleId - Module ID
   * @returns Array of dependent module IDs
   */
  public getDependents(moduleId: string): string[] {
    this.ensureInitialized();
    
    const dependents: string[] = [];
    this.moduleDependencies.forEach((dependencies, id) => {
      if (dependencies.includes(moduleId)) {
        dependents.push(id);
      }
    });
    
    return dependents;
  }

  /**
   * Get module configuration
   * @param moduleId - Module ID
   * @returns Module configuration or null if not found
   */
  public getModuleConfig(moduleId: string): any {
    this.ensureInitialized();
    return this.moduleConfigs.get(moduleId) || null;
  }

  /**
   * Update module configuration
   * @param moduleId - Module ID
   * @param config - Configuration updates
   */
  public updateModuleConfig(moduleId: string, config: any): void {
    this.ensureInitialized();
    
    const existingConfig = this.moduleConfigs.get(moduleId);
    if (!existingConfig) {
      throw new Error(`Module ${moduleId} not found`);
    }
    
    this.moduleConfigs.set(moduleId, {
      ...existingConfig,
      ...config,
      lastUpdated: new Date()
    });
  }

  /**
   * Increment module error count
   * @param moduleId - Module ID
   */
  public incrementErrorCount(moduleId: string): void {
    this.ensureInitialized();
    
    const config = this.moduleConfigs.get(moduleId);
    if (config) {
      config.errorCount = (config.errorCount || 0) + 1;
      config.lastUpdated = new Date();
    }
  }

  /**
   * Increment module success count
   * @param moduleId - Module ID
   */
  public incrementSuccessCount(moduleId: string): void {
    this.ensureInitialized();
    
    const config = this.moduleConfigs.get(moduleId);
    if (config) {
      config.successCount = (config.successCount || 0) + 1;
      config.lastUpdated = new Date();
    }
  }

  /**
   * Check if module is healthy
   * @param moduleId - Module ID
   * @returns Whether module is healthy
   */
  public isModuleHealthy(moduleId: string): boolean {
    this.ensureInitialized();
    
    const config = this.moduleConfigs.get(moduleId);
    if (!config) {
      return false;
    }
    
    // Simple health check - can be enhanced with more sophisticated logic
    const totalRequests = (config.errorCount || 0) + (config.successCount || 0);
    const errorRate = totalRequests > 0 ? (config.errorCount || 0) / totalRequests : 0;
    
    return config.status === 'active' && errorRate < 0.1; // Less than 10% error rate
  }

  /**
   * Get module health status for all modules
   * @returns Health status for all modules
   */
  public getAllModulesHealth(): Record<string, any> {
    this.ensureInitialized();
    
    const health: Record<string, any> = {};
    
    this.moduleConfigs.forEach((config, moduleId) => {
      const module = this.modules.get(moduleId);
      health[moduleId] = {
        status: config.status,
        healthy: this.isModuleHealthy(moduleId),
        errorCount: config.errorCount || 0,
        successCount: config.successCount || 0,
        lastUpdated: config.lastUpdated,
        moduleInfo: module ? {
          name: module.moduleName,
          version: module.version,
          type: module.metadata?.category
        } : null
      };
    });
    
    return health;
  }

  /**
   * Resolve dependency order for modules
   * @returns Array of module IDs in dependency order
   */
  public resolveDependencyOrder(): string[] {
    this.ensureInitialized();
    
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];
    
    const visit = (moduleId: string): void => {
      if (visited.has(moduleId)) {
        return;
      }
      
      if (visiting.has(moduleId)) {
        throw new Error(`Circular dependency detected involving module ${moduleId}`);
      }
      
      visiting.add(moduleId);
      
      const dependencies = this.getModuleDependencies(moduleId);
      for (const dep of dependencies) {
        if (this.modules.has(dep)) {
          visit(dep);
        }
      }
      
      visiting.delete(moduleId);
      visited.add(moduleId);
      order.push(moduleId);
    };
    
    // Visit all modules
    this.modules.forEach((_, moduleId) => {
      visit(moduleId);
    });
    
    return order;
  }

  /**
   * Shutdown the module registry manager
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Shutting down Module Registry Manager...');
      
      // Clear all registries
      this.modules.clear();
      this.moduleDependencies.clear();
      this.moduleConfigs.clear();
      
      this.isInitialized = false;
      console.log('Module Registry Manager shutdown completed');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get registry manager status
   * @returns Registry status information
   */
  public getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      enableMetrics: this.enableMetrics,
      modulesCount: this.modules.size,
      dependencyGraph: Object.fromEntries(this.moduleDependencies),
      healthStatus: this.getAllModulesHealth()
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
   * Validate module registration
   * @param module - Module registration to validate
   * @throws Error if validation fails
   */
  private validateModuleRegistration(module: ModuleRegistration): void {
    if (!module.moduleId || module.moduleId.trim() === '') {
      throw new Error('Module ID is required');
    }
    
    if (!module.moduleName || module.moduleName.trim() === '') {
      throw new Error('Module name is required');
    }
    
    if (!module.version || module.version.trim() === '') {
      throw new Error('Module version is required');
    }
    
    // responseHandler is optional now
    // if (!module.responseHandler) {
    //   throw new Error('Module response handler is required');
    // }
    
    if (!Array.isArray(module.dependencies)) {
      throw new Error('Module dependencies must be an array');
    }
    
    if (module.errorPolicies && !Array.isArray(module.errorPolicies)) {
      throw new Error('Module error policies must be an array');
    }
    
    if (module.customRules && !Array.isArray(module.customRules)) {
      throw new Error('Module custom rules must be an array');
    }
  }

  /**
   * Validate module dependencies
   * @param module - Module registration
   * @throws Error if dependencies are invalid
   */
  private validateDependencies(module: ModuleRegistration): void {
    if (module.dependencies && module.dependencies.length > 0) {
      for (const dep of module.dependencies) {
        if (!this.modules.has(dep)) {
          throw new Error(`Dependency module ${dep} not found for module ${module.moduleId}`);
        }
      }
    }
  }

  /**
   * Ensure registry manager is initialized
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Module Registry Manager is not initialized. Call initialize() first.');
    }
  }
}