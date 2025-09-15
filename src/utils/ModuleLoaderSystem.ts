/**
 * RCC Module Loader System
 * Loads and manages RCC modules with dependency resolution
 */

import { ModuleInfo } from 'rcc-basemodule';
import { BaseModule } from 'rcc-basemodule';
import { ModuleDiscoverySystem, ModuleMetadata } from './ModuleDiscoverySystem';
import { ModuleConfigurationManager } from './ModuleConfigurationManager';

/**
 * Loaded module instance
 */
export interface LoadedModule {
  /** Module metadata */
  metadata: ModuleMetadata;
  /** Module instance */
  instance: BaseModule;
  /** Module exports */
  exports: any;
  /** Load timestamp */
  loadedAt: number;
  /** Whether module is initialized */
  initialized: boolean;
  /** Whether module is running */
  running: boolean;
}

/**
 * Module loader configuration
 */
export interface ModuleLoaderConfig {
  /** Module discovery system */
  moduleDiscovery: ModuleDiscoverySystem;
  /** Configuration manager */
  configManager: ModuleConfigurationManager;
  /** Auto-load modules on startup */
  autoLoad?: boolean;
  /** Auto-initialize modules */
  autoInitialize?: boolean;
  /** Dependency resolution timeout */
  dependencyTimeout?: number;
  /** Enable hot reload */
  hotReload?: boolean;
}

/**
 * Module loading error
 */
export class ModuleLoadError extends Error {
  constructor(
    public moduleName: string,
    message: string,
    public cause?: Error
  ) {
    super(`Failed to load module ${moduleName}: ${message}`);
    this.name = 'ModuleLoadError';
  }
}

/**
 * Module dependency resolution error
 */
export class ModuleDependencyError extends Error {
  constructor(
    public moduleName: string,
    public missingDependencies: string[]
  ) {
    super(`Missing dependencies for module ${moduleName}: ${missingDependencies.join(', ')}`);
    this.name = 'ModuleDependencyError';
  }
}

/**
 * Module Loader System
 */
export class ModuleLoaderSystem {
  private config: ModuleLoaderConfig;
  private loadedModules: Map<string, LoadedModule> = new Map();
  private loadOrder: string[] = [];
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private loadingPromises: Map<string, Promise<LoadedModule>> = new Map();

  constructor(config: ModuleLoaderConfig) {
    this.config = {
      moduleDiscovery: config.moduleDiscovery,
      configManager: config.configManager,
      autoLoad: config.autoLoad || false,
      autoInitialize: config.autoInitialize || false,
      dependencyTimeout: config.dependencyTimeout || 30000,
      hotReload: config.hotReload || false
    };

    // Setup hot reload if enabled
    if (this.config.hotReload) {
      this.setupHotReload();
    }
  }

  /**
   * Initialize the module loader
   */
  public async initialize(): Promise<void> {
    console.log('[ModuleLoader] Initializing module loader system');

    if (this.config.autoLoad) {
      await this.loadAllModules();
    }

    console.log('[ModuleLoader] Module loader system initialized');
  }

  /**
   * Load a specific module by name
   */
  public async loadModule(moduleName: string, config?: any): Promise<LoadedModule> {
    // Check if already loading
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName)!;
    }

    // Check if already loaded
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName)!;
    }

    const loadPromise = this.loadModuleInternal(moduleName, config);
    this.loadingPromises.set(moduleName, loadPromise);

    try {
      const loadedModule = await loadPromise;
      return loadedModule;
    } finally {
      this.loadingPromises.delete(moduleName);
    }
  }

  /**
   * Internal module loading logic
   */
  private async loadModuleInternal(moduleName: string, config?: any): Promise<LoadedModule> {
    try {
      console.log(`[ModuleLoader] Loading module: ${moduleName}`);

      // Get module metadata
      const metadata = await this.config.moduleDiscovery.getModule(moduleName);
      if (!metadata) {
        throw new ModuleLoadError(moduleName, 'Module not found');
      }

      // Check if module is enabled
      if (!metadata.enabled) {
        throw new ModuleLoadError(moduleName, 'Module is disabled');
      }

      // Resolve dependencies
      await this.resolveDependencies(metadata);

      // Load the module
      const moduleExports = await this.config.moduleDiscovery.loadModule(moduleName);
      
      // Get module configuration
      const moduleConfig = this.config.configManager.getModuleConfiguration(moduleName);
      const finalConfig = { ...moduleConfig?.values, ...config };

      // Create module info
      const moduleInfo: ModuleInfo = {
        id: `rcc-${moduleName}-${Date.now()}`,
        name: moduleName,
        version: metadata.packageInfo.version,
        description: metadata.packageInfo.description || '',
        dependencies: metadata.dependencies,
        config: finalConfig
      };

      // Create module instance
      let moduleInstance: BaseModule;
      
      if (moduleExports.default && typeof moduleExports.default === 'function') {
        // ES6 default export class
        moduleInstance = new moduleExports.default(moduleInfo);
      } else if (moduleExports[moduleName.charAt(0).toUpperCase() + moduleName.slice(1) + 'Module']) {
        // Named export class
        const ModuleClass = moduleExports[moduleName.charAt(0).toUpperCase() + moduleName.slice(1) + 'Module'];
        moduleInstance = new ModuleClass(moduleInfo);
      } else {
        // Try to find any class that extends BaseModule
        const moduleClasses = Object.values(moduleExports).filter(
          (exp: any) => typeof exp === 'function' && exp.prototype instanceof BaseModule
        );
        
        if (moduleClasses.length === 0) {
          throw new ModuleLoadError(moduleName, 'No valid module class found');
        }
        
        moduleInstance = new (moduleClasses[0] as any)(moduleInfo);
      }

      // Configure the module
      await moduleInstance.configure(finalConfig);

      const loadedModule: LoadedModule = {
        metadata,
        instance: moduleInstance,
        exports: moduleExports,
        loadedAt: Date.now(),
        initialized: false,
        running: false
      };

      // Store the loaded module
      this.loadedModules.set(moduleName, loadedModule);
      this.loadOrder.push(moduleName);

      // Update dependency graph
      this.updateDependencyGraph(metadata);

      // Auto-initialize if enabled
      if (this.config.autoInitialize) {
        await this.initializeModule(moduleName);
      }

      console.log(`[ModuleLoader] ✓ Successfully loaded module: ${moduleName}`);
      return loadedModule;

    } catch (error) {
      console.error(`[ModuleLoader] ✗ Failed to load module: ${moduleName}`, error);
      throw error;
    }
  }

  /**
   * Load all enabled modules
   */
  public async loadAllModules(): Promise<LoadedModule[]> {
    console.log('[ModuleLoader] Loading all enabled modules');

    const modules = await this.config.moduleDiscovery.discoverModules();
    const enabledModules = modules.filter(m => m.enabled);
    
    // Sort by dependency order
    const sortedModules = this.sortModulesByDependencies(enabledModules);

    const loadedModules: LoadedModule[] = [];
    
    for (const module of sortedModules) {
      try {
        const loadedModule = await this.loadModule(module.name);
        loadedModules.push(loadedModule);
      } catch (error) {
        console.error(`[ModuleLoader] Failed to load module ${module.name}:`, error);
        // Continue loading other modules
      }
    }

    console.log(`[ModuleLoader] Loaded ${loadedModules.length}/${enabledModules.length} modules`);
    return loadedModules;
  }

  /**
   * Initialize a loaded module
   */
  public async initializeModule(moduleName: string): Promise<void> {
    const loadedModule = this.loadedModules.get(moduleName);
    
    if (!loadedModule) {
      throw new ModuleLoadError(moduleName, 'Module not loaded');
    }

    if (loadedModule.initialized) {
      console.log(`[ModuleLoader] Module ${moduleName} already initialized`);
      return;
    }

    try {
      console.log(`[ModuleLoader] Initializing module: ${moduleName}`);
      await loadedModule.instance.initialize();
      loadedModule.initialized = true;
      
      console.log(`[ModuleLoader] ✓ Module ${moduleName} initialized`);
    } catch (error) {
      console.error(`[ModuleLoader] ✗ Failed to initialize module ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Start a loaded module
   */
  public async startModule(moduleName: string): Promise<void> {
    const loadedModule = this.loadedModules.get(moduleName);
    
    if (!loadedModule) {
      throw new ModuleLoadError(moduleName, 'Module not loaded');
    }

    if (loadedModule.running) {
      console.log(`[ModuleLoader] Module ${moduleName} already running`);
      return;
    }

    try {
      console.log(`[ModuleLoader] Starting module: ${moduleName}`);
      
      // Initialize if not already initialized
      if (!loadedModule.initialized) {
        await this.initializeModule(moduleName);
      }

      // Call start method if available
      if (typeof loadedModule.instance.start === 'function') {
        await loadedModule.instance.start();
      }

      loadedModule.running = true;
      
      console.log(`[ModuleLoader] ✓ Module ${moduleName} started`);
    } catch (error) {
      console.error(`[ModuleLoader] ✗ Failed to start module ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Stop a running module
   */
  public async stopModule(moduleName: string): Promise<void> {
    const loadedModule = this.loadedModules.get(moduleName);
    
    if (!loadedModule) {
      throw new ModuleLoadError(moduleName, 'Module not loaded');
    }

    if (!loadedModule.running) {
      console.log(`[ModuleLoader] Module ${moduleName} not running`);
      return;
    }

    try {
      console.log(`[ModuleLoader] Stopping module: ${moduleName}`);
      
      // Call stop method if available
      if (typeof loadedModule.instance.stop === 'function') {
        await loadedModule.instance.stop();
      }

      loadedModule.running = false;
      
      console.log(`[ModuleLoader] ✓ Module ${moduleName} stopped`);
    } catch (error) {
      console.error(`[ModuleLoader] ✗ Failed to stop module ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Unload a module
   */
  public async unloadModule(moduleName: string): Promise<void> {
    const loadedModule = this.loadedModules.get(moduleName);
    
    if (!loadedModule) {
      console.log(`[ModuleLoader] Module ${moduleName} not loaded`);
      return;
    }

    try {
      console.log(`[ModuleLoader] Unloading module: ${moduleName}`);

      // Stop if running
      if (loadedModule.running) {
        await this.stopModule(moduleName);
      }

      // Destroy module
      if (typeof loadedModule.instance.destroy === 'function') {
        await loadedModule.instance.destroy();
      }

      // Remove from loaded modules
      this.loadedModules.delete(moduleName);
      this.loadOrder = this.loadOrder.filter(name => name !== moduleName);

      // Clear from require cache
      this.clearRequireCache(loadedModule.metadata.mainFile);

      console.log(`[ModuleLoader] ✓ Module ${moduleName} unloaded`);
    } catch (error) {
      console.error(`[ModuleLoader] ✗ Failed to unload module ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Get a loaded module
   */
  public getLoadedModule(moduleName: string): LoadedModule | null {
    return this.loadedModules.get(moduleName) || null;
  }

  /**
   * Get all loaded modules
   */
  public getAllLoadedModules(): LoadedModule[] {
    return Array.from(this.loadedModules.values());
  }

  /**
   * Get module load order
   */
  public getLoadOrder(): string[] {
    return [...this.loadOrder];
  }

  /**
   * Check if module is loaded
   */
  public isModuleLoaded(moduleName: string): boolean {
    return this.loadedModules.has(moduleName);
  }

  /**
   * Get module dependencies
   */
  public getModuleDependencies(moduleName: string): string[] {
    const dependencies = this.dependencyGraph.get(moduleName);
    return dependencies ? Array.from(dependencies) : [];
  }

  /**
   * Get modules that depend on this module
   */
  public getModuleDependents(moduleName: string): string[] {
    const dependents: string[] = [];
    
    for (const [mod, deps] of this.dependencyGraph.entries()) {
      if (deps.has(moduleName)) {
        dependents.push(mod);
      }
    }
    
    return dependents;
  }

  /**
   * Resolve module dependencies
   */
  private async resolveDependencies(metadata: ModuleMetadata): Promise<void> {
    const missingDependencies: string[] = [];

    for (const dep of metadata.dependencies) {
      // Check if it's an RCC module
      if (dep.startsWith('rcc-')) {
        const depName = dep.replace('rcc-', '');
        const depModule = await this.config.moduleDiscovery.getModule(depName);
        
        if (!depModule || !depModule.enabled) {
          missingDependencies.push(dep);
        }
      }
      // npm dependencies are assumed to be available
    }

    if (missingDependencies.length > 0) {
      throw new ModuleDependencyError(metadata.name, missingDependencies);
    }
  }

  /**
   * Sort modules by dependency order
   */
  private sortModulesByDependencies(modules: ModuleMetadata[]): ModuleMetadata[] {
    const sorted: ModuleMetadata[] = [];
    const remaining = new Set(modules.map(m => m.name));
    const visited = new Set<string>();

    const visit = (moduleName: string) => {
      if (visited.has(moduleName)) {
        return;
      }

      visited.add(moduleName);

      const module = modules.find(m => m.name === moduleName);
      if (module) {
        // Visit dependencies first
        for (const dep of module.dependencies) {
          if (dep.startsWith('rcc-')) {
            const depName = dep.replace('rcc-', '');
            if (remaining.has(depName)) {
              visit(depName);
            }
          }
        }

        // Add this module
        sorted.push(module);
        remaining.delete(moduleName);
      }
    };

    // Visit all modules
    for (const moduleName of remaining) {
      visit(moduleName);
    }

    return sorted;
  }

  /**
   * Update dependency graph
   */
  private updateDependencyGraph(metadata: ModuleMetadata): void {
    const dependencies = new Set<string>();

    for (const dep of metadata.dependencies) {
      if (dep.startsWith('rcc-')) {
        dependencies.add(dep.replace('rcc-', ''));
      }
    }

    this.dependencyGraph.set(metadata.name, dependencies);
  }

  /**
   * Clear require cache for a module
   */
  private clearRequireCache(modulePath: string): void {
    const resolvedPath = require.resolve(modulePath);
    
    // Clear from require cache
    if (require.cache[resolvedPath]) {
      delete require.cache[resolvedPath];
    }

    // Clear children from cache
    Object.keys(require.cache).forEach(key => {
      if (key.startsWith(modulePath) || key.includes(modulePath)) {
        delete require.cache[key];
      }
    });
  }

  /**
   * Setup hot reload
   */
  private setupHotReload(): void {
    // This would typically use file watchers to detect changes
    // and automatically reload modules
    console.log('[ModuleLoader] Hot reload enabled (implementation pending)');
  }

  /**
   * Shutdown the module loader
   */
  public async shutdown(): Promise<void> {
    console.log('[ModuleLoader] Shutting down module loader');

    // Stop all running modules in reverse order
    for (let i = this.loadOrder.length - 1; i >= 0; i--) {
      const moduleName = this.loadOrder[i];
      const loadedModule = this.loadedModules.get(moduleName);
      
      if (loadedModule && loadedModule.running) {
        try {
          await this.stopModule(moduleName);
        } catch (error) {
          console.error(`[ModuleLoader] Error stopping module ${moduleName}:`, error);
        }
      }
    }

    // Unload all modules
    for (const moduleName of this.loadOrder) {
      try {
        await this.unloadModule(moduleName);
      } catch (error) {
        console.error(`[ModuleLoader] Error unloading module ${moduleName}:`, error);
      }
    }

    console.log('[ModuleLoader] Module loader shutdown complete');
  }
}