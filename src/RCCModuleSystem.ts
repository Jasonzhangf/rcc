/**
 * RCC Framework Module Integration System
 * Main entry point for the complete module configuration system
 */

import { ModuleDiscoverySystem } from './utils/ModuleDiscoverySystem';
import { ModuleConfigurationManager } from './utils/ModuleConfigurationManager';
import { ModuleLoaderSystem } from './utils/ModuleLoaderSystem';
import * as path from 'path';

/**
 * RCC Module System Configuration
 */
export interface RCCModuleSystemConfig {
  /** Root directory for RCC modules */
  modulesDir?: string;
  /** Configuration directory */
  configDir?: string;
  /** Auto-load modules on startup */
  autoLoadModules?: boolean;
  /** Auto-initialize modules */
  autoInitializeModules?: boolean;
  /** Enable hot reload */
  enableHotReload?: boolean;
  /** Environment variable prefix */
  envPrefix?: string;
}

/**
 * RCC Module System Status
 */
export interface RCCModuleSystemStatus {
  /** System is initialized */
  initialized: boolean;
  /** Number of discovered modules */
  discoveredModules: number;
  /** Number of loaded modules */
  loadedModules: number;
  /** Number of running modules */
  runningModules: number;
  /** System health */
  health: 'healthy' | 'warning' | 'error';
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * RCC Module System
 * Complete module management system for RCC framework
 */
export class RCCModuleSystem {
  private config: Required<RCCModuleSystemConfig>;
  private moduleDiscovery: ModuleDiscoverySystem;
  private configManager: ModuleConfigurationManager;
  private moduleLoader: ModuleLoaderSystem;
  private initialized: boolean = false;
  private status: RCCModuleSystemStatus = {
    initialized: false,
    discoveredModules: 0,
    loadedModules: 0,
    runningModules: 0,
    health: 'healthy',
    lastUpdated: Date.now()
  };

  constructor(config: RCCModuleSystemConfig = {}) {
    this.config = {
      modulesDir: config.modulesDir || path.join(process.cwd(), 'src', 'modules'),
      configDir: config.configDir || path.join(process.cwd(), 'config', 'modules'),
      autoLoadModules: config.autoLoadModules !== false, // Default to true
      autoInitializeModules: config.autoInitializeModules !== false, // Default to true
      enableHotReload: config.enableHotReload || false,
      envPrefix: config.envPrefix || 'RCC_'
    };

    // Initialize subsystems
    this.moduleDiscovery = new ModuleDiscoverySystem({
      modulesDir: this.config.modulesDir,
      autoLoad: false,
      cacheEnabled: true,
      cacheDuration: 60000 // 1 minute
    });

    this.configManager = new ModuleConfigurationManager({
      configDir: this.config.configDir,
      moduleDiscovery: this.moduleDiscovery,
      envPrefix: this.config.envPrefix,
      autoSave: true
    });

    this.moduleLoader = new ModuleLoaderSystem({
      moduleDiscovery: this.moduleDiscovery,
      configManager: this.configManager,
      autoLoad: this.config.autoLoadModules,
      autoInitialize: this.config.autoInitializeModules,
      hotReload: this.config.enableHotReload
    });

    console.log('[RCCModuleSystem] Module system created');
  }

  /**
   * Initialize the RCC module system
   */
  public async initialize(): Promise<void> {
    try {
      console.log('[RCCModuleSystem] Initializing RCC module system...');

      // Initialize configuration manager
      await this.configManager.initialize();

      // Initialize module loader
      await this.moduleLoader.initialize();

      this.initialized = true;
      this.updateStatus();

      console.log('[RCCModuleSystem] ✓ RCC module system initialized successfully');
      console.log(`[RCCModuleSystem]   - Discovered modules: ${this.status.discoveredModules}`);
      console.log(`[RCCModuleSystem]   - Loaded modules: ${this.status.loadedModules}`);
      console.log(`[RCCModuleSystem]   - Running modules: ${this.status.runningModules}`);

    } catch (error) {
      this.status.health = 'error';
      console.error('[RCCModuleSystem] ✗ Failed to initialize RCC module system:', error);
      throw error;
    }
  }

  /**
   * Get current system status
   */
  public getStatus(): RCCModuleSystemStatus {
    return { ...this.status };
  }

  /**
   * List all discovered modules
   */
  public async listModules(options?: {
    type?: string;
    enabled?: boolean;
    loaded?: boolean;
    running?: boolean;
  }) {
    let modules = await this.moduleDiscovery.discoverModules();

    // Apply filters
    if (options?.type) {
      modules = modules.filter(m => m.type === options.type);
    }
    if (options?.enabled !== undefined) {
      modules = modules.filter(m => m.enabled === options.enabled);
    }
    if (options?.loaded !== undefined) {
      modules = modules.filter(m => {
        const loaded = this.moduleLoader.isModuleLoaded(m.name);
        return options.loaded ? loaded : !loaded;
      });
    }
    if (options?.running !== undefined) {
      modules = modules.filter(m => {
        const loadedModule = this.moduleLoader.getLoadedModule(m.name);
        const running = loadedModule?.running || false;
        return options.running ? running : !running;
      });
    }

    return modules;
  }

  /**
   * Get detailed information about a module
   */
  public async getModuleInfo(moduleName: string) {
    const metadata = await this.moduleDiscovery.getModule(moduleName);
    if (!metadata) {
      throw new Error(`Module not found: ${moduleName}`);
    }

    const config = this.configManager.getModuleConfiguration(moduleName);
    const loadedModule = this.moduleLoader.getLoadedModule(moduleName);

    return {
      metadata,
      configuration: config,
      loaded: loadedModule || null
    };
  }

  /**
   * Load a module
   */
  public async loadModule(moduleName: string, config?: any) {
    const loadedModule = await this.moduleLoader.loadModule(moduleName, config);
    this.updateStatus();
    return loadedModule;
  }

  /**
   * Unload a module
   */
  public async unloadModule(moduleName: string) {
    await this.moduleLoader.unloadModule(moduleName);
    this.updateStatus();
  }

  /**
   * Start a module
   */
  public async startModule(moduleName: string) {
    await this.moduleLoader.startModule(moduleName);
    this.updateStatus();
  }

  /**
   * Stop a module
   */
  public async stopModule(moduleName: string) {
    await this.moduleLoader.stopModule(moduleName);
    this.updateStatus();
  }

  /**
   * Get module configuration
   */
  public getModuleConfiguration(moduleName: string) {
    return this.configManager.getModuleConfiguration(moduleName);
  }

  /**
   * Set module configuration value
   */
  public async setModuleConfiguration(moduleName: string, key: string, value: any) {
    await this.configManager.setConfigurationValue(moduleName, key, value);
  }

  /**
   * Get module by type
   */
  public async getModulesByType(type: string) {
    return this.moduleDiscovery.getModulesByType(type);
  }

  /**
   * Get all provider modules
   */
  public async getProviderModules() {
    return this.moduleDiscovery.getProviderModules();
  }

  /**
   * Create a new module
   */
  public async createModule(moduleName: string, options: {
    type?: string;
    description?: string;
    template?: 'basic' | 'provider' | 'processor';
  } = {}) {
    const moduleDir = path.join(this.config.modulesDir, moduleName);
    
    // Check if module already exists
    const existing = await this.moduleDiscovery.getModule(moduleName);
    if (existing) {
      throw new Error(`Module already exists: ${moduleName}`);
    }

    // Create module directory structure
    const { execSync } = require('child_process');
    const type = options.type || 'provider';
    const description = options.description || `RCC ${type} module`;

    // Use CLI to create module
    const cliPath = path.join(__dirname, '..', 'cli-commands', 'module', 'src', 'ModuleCLI.ts');
    const command = `node -r ts-node/register ${cliPath} create ${moduleName} --type ${type} --description "${description}"`;
    
    try {
      execSync(command, { stdio: 'inherit', cwd: process.cwd() });
      
      // Refresh module discovery
      await this.moduleDiscovery.refreshCache();
      this.updateStatus();
      
      console.log(`[RCCModuleSystem] ✓ Created module: ${moduleName}`);
    } catch (error) {
      console.error(`[RCCModuleSystem] ✗ Failed to create module: ${moduleName}`, error);
      throw error;
    }
  }

  /**
   * Validate all module configurations
   */
  public async validateAllConfigurations(): Promise<{
    valid: boolean;
    results: Record<string, { valid: boolean; errors: string[] }>;
  }> {
    const modules = await this.moduleDiscovery.discoverModules();
    const results: Record<string, { valid: boolean; errors: string[] }> = {};
    let overallValid = true;

    for (const module of modules) {
      const validation = this.configManager.validateModuleConfiguration(module.name);
      results[module.name] = validation;
      
      if (!validation.valid) {
        overallValid = false;
      }
    }

    return {
      valid: overallValid,
      results
    };
  }

  /**
   * Get system statistics
   */
  public getStatistics() {
    const discoveryStats = this.moduleDiscovery.getStatistics();
    const loadedModules = this.moduleLoader.getAllLoadedModules();

    return {
      discovery: discoveryStats,
      loader: {
        totalLoaded: loadedModules.length,
        loadedByType: this.groupModulesByType(loadedModules),
        loadOrder: this.moduleLoader.getLoadOrder()
      },
      configurations: {
        totalConfigs: this.configManager.getAllConfigurations().length,
        configDir: this.config.configDir
      },
      health: this.status.health
    };
  }

  /**
   * Refresh all caches
   */
  public async refresh(): Promise<void> {
    await this.moduleDiscovery.refreshCache();
    await this.configManager.initialize();
    this.updateStatus();
    console.log('[RCCModuleSystem] ✓ System refreshed');
  }

  /**
   * Shutdown the module system
   */
  public async shutdown(): Promise<void> {
    try {
      console.log('[RCCModuleSystem] Shutting down RCC module system...');
      
      await this.moduleLoader.shutdown();
      await this.configManager.close();
      
      this.initialized = false;
      this.updateStatus();
      
      console.log('[RCCModuleSystem] ✓ RCC module system shutdown complete');
    } catch (error) {
      console.error('[RCCModuleSystem] ✗ Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Update system status
   */
  private updateStatus(): void {
    if (!this.initialized) {
      return;
    }

    const loadedModules = this.moduleLoader.getAllLoadedModules();
    const runningModules = loadedModules.filter(m => m.running);

    this.status = {
      initialized: this.initialized,
      discoveredModules: this.moduleDiscovery.getStatistics().totalModules,
      loadedModules: loadedModules.length,
      runningModules: runningModules.length,
      health: this.calculateHealth(),
      lastUpdated: Date.now()
    };
  }

  /**
   * Calculate system health
   */
  private calculateHealth(): 'healthy' | 'warning' | 'error' {
    try {
      const stats = this.moduleDiscovery.getStatistics();
      const loadedModules = this.moduleLoader.getAllLoadedModules();
      
      // If we have modules but none are loaded, that's a warning
      if (stats.totalModules > 0 && loadedModules.length === 0) {
        return 'warning';
      }
      
      // If we have errors in loaded modules, that's an error
      const failedModules = loadedModules.filter(m => !m.initialized);
      if (failedModules.length > 0) {
        return 'error';
      }
      
      return 'healthy';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Group modules by type
   */
  private groupModulesByType(modules: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    modules.forEach(module => {
      const type = module.metadata.type || 'unknown';
      groups[type] = (groups[type] || 0) + 1;
    });
    
    return groups;
  }
}

// Export singleton instance
export const rccModuleSystem = new RCCModuleSystem();

// Auto-initialize if this is the main module
if (require.main === module) {
  rccModuleSystem.initialize()
    .then(() => {
      console.log('[RCCModuleSystem] System ready for use');
    })
    .catch(error => {
      console.error('[RCCModuleSystem] Failed to initialize system:', error);
      process.exit(1);
    });
}