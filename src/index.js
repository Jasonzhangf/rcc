/**
 * RCC - Refactored Claude Code Router
 * TypeScript Main Entry Module - Type-safe module exports with enhanced architecture
 *
 * This is the modern TypeScript replacement for src/index.js, providing:
 * - Complete type safety for all exports
 * - ES module compatibility with CommonJS fallback
 * - Comprehensive error handling
 * - Dynamic export management
 */

import { SafeJson, safeJson } from './utils/safe-json';
import { DynamicImportManager, dynamicImportManager } from './utils/dynamic-import-manager';

import {
  RccError,
  AsyncResult,
  ServerModuleModule,
  DebugCenterModule,
  PipelineModule
} from './types';

/**
 * Core system interfaces - defining the contract for RCC modules
 */
export interface IRCCModuleSystem {
  initialize(): Promise<void>;
  loadModule(moduleId: string, config?: any): Promise<AsyncResult<any>>;
  unloadModule(moduleId: string): Promise<AsyncResult<boolean>>;
  getLoadedModules(): string[];
  getModuleInfo(moduleId: string): any;
  shutdown(): Promise<void>;
}

export interface IDebugSystem {
  enableDebugging(options?: { level?: string; outputPath?: string }): void;
  disableDebugging(): void;
  log(level: string, message: string, data?: any): void;
  createSession(sessionId: string): void;
  endSession(sessionId: string): void;
  exportLogs(outputPath: string): Promise<AsyncResult<string>>;
  setTwoPhaseDebug(enabled: boolean, baseDir?: string): void;
}

export interface IStartupSystem {
  initialize(config?: any): Promise<AsyncResult<any>>;
  startServices(): Promise<AsyncResult<any>>;
  stopServices(): Promise<AsyncResult<any>>;
  getStatus(): { running: boolean; services: string[] };
  restart(): Promise<AsyncResult<any>>;
}

export interface IModuleLoaderSystem {
  discoverModules(searchPath: string, pattern?: string): Promise<AsyncResult<any[]>>;
  loadModule(modulePath: string): Promise<AsyncResult<any>>;
  validateModule(module: any): AsyncResult<boolean>;
  getModuleMetadata(modulePath: string): Promise<AsyncResult<any>>;
}

export interface IModuleDiscoverySystem {
  scanDirectory(directory: string, recursive?: boolean): Promise<AsyncResult<string[]>>;
  searchModules(pattern: string, directory?: string): Promise<AsyncResult<string[]>>;
  getModuleInfo(modulePath: string): Promise<AsyncResult<any>>;
  buildModuleIndex(): Promise<AsyncResult<Map<string, any>>>;
}

export interface IModuleConfigurationManager {
  loadConfiguration(configPath: string): Promise<AsyncResult<any>>;
  saveConfiguration(configPath: string, config: any): Promise<AsyncResult<boolean>>;
  validateConfiguration(config: any, schema?: any): AsyncResult<boolean>;
  mergeConfigurations(base: any, override: any): any;
  watchConfiguration(configPath: string, callback: (config: any) => void): void;
}

/**
 * Utility system map for path resolution
 */
interface RCCSystemModules {
  RCCModuleSystem: IRCCModuleSystem;
  DebugSystem: IDebugSystem;
  RCCStartupSystem: IStartupSystem;
  ModuleLoaderSystem: IModuleLoaderSystem;
  ModuleDiscoverySystem: IModuleDiscoverySystem;
  ModuleConfigurationManager: IModuleConfigurationManager;
}

/**
 * RCC System modules path map with standard paths
 */
interface RCCSystemModulesPathMap {
  RCCModuleSystem: string;
  DebugSystem: string;
  RCCStartupSystem: string;
  ModuleLoaderSystem: string;
  ModuleDiscoverySystem: string;
  ModuleConfigurationManager: string;
}

/**
 * System status information
 */
export interface SystemStatus {
  initialized: boolean;
  systems: string[];
}

/**
 * Type-safe module loader with dynamic import and validation
 */
export class ModuleLoader {
  private static instance: ModuleLoader;
  private importManager: DynamicImportManager;
  private safeJson: SafeJson;
  private moduleCache: Map<string, any> = new Map();
  private systemCache: Map<string, any> = new Map();

  private constructor() {
    this.importManager = DynamicImportManager.getInstance();
    this.safeJson = SafeJson.getInstance();
  }

  static getInstance(): ModuleLoader {
    if (!ModuleLoader.instance) {
      ModuleLoader.instance = new ModuleLoader();
    }
    return ModuleLoader.instance;
  }

  /**
   * Load RCC core system modules
   */
  async loadRCCSystem<T extends keyof RCCSystemModules>(
    moduleType: T,
    customPath?: string
  ): Promise<AsyncResult<RCCSystemModules[T]>> {
    const defaultPaths: RCCSystemModulesPathMap = {
      RCCModuleSystem: './RCCModuleSystem',
      DebugSystem: './debug/DebugSystem',
      RCCStartupSystem: './startup',
      ModuleLoaderSystem: './utils/ModuleLoaderSystem',
      ModuleDiscoverySystem: './utils/ModuleDiscoverySystem',
      ModuleConfigurationManager: './utils/ModuleConfigurationManager',
    };

    const basePath = customPath || defaultPaths[moduleType];
    if (!basePath) {
      return {
        success: false,
        error: new Error(`Unknown module type: ${moduleType}`),
        message: `Unsupported RCC system module: ${moduleType}`
      };
    }

    return this.loadModule<RCCSystemModules[T]>(basePath, {
      required: true,
      cache: true,
    });
  }

  /**
   * Load RCC module with comprehensive validation and error handling
   */
  async loadModule<T = any>(
    modulePath: string,
    options: {
      validator?: (module: T) => boolean;
      required?: boolean;
      fallback?: () => Promise<T>;
      cache?: boolean;
    } = {}
  ): Promise<AsyncResult<T>> {
    const { validator, required = true, fallback, cache = true } = options;

    try {
      // Check cache first
      if (cache && this.moduleCache.has(modulePath)) {
        const cached = this.moduleCache.get(modulePath);
        if (!validator || validator(cached)) {
          return { success: true, data: cached };
        }
      }

      // Perform dynamic import
      const result = await this.importManager.import<T>(modulePath, {
        validator,
        required,
        fallback,
        cacheKey: cache ? modulePath : undefined,
      });

      if (result) {
        // Cache successful result
        if (cache) {
          this.moduleCache.set(modulePath, result);
        }
        return { success: true, data: result };
      }

      return {
        success: false,
        error: new Error(`Module loading failed: ${modulePath}`),
        message: 'Module import returned null'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(errorMessage),
        message: `Failed to load module ${modulePath}: ${errorMessage}`
      };
    }
  }

  /**
   * Clear module and system cache
   */
  clearCache(modulePath?: string): void {
    if (modulePath) {
      this.moduleCache.delete(modulePath);
      this.systemCache.delete(modulePath);
    } else {
      this.moduleCache.clear();
      this.systemCache.clear();
    }
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { moduleSize: number; systemSize: number; modules: string[]; systems: string[] } {
    return {
      moduleSize: this.moduleCache.size,
      systemSize: this.systemCache.size,
      modules: Array.from(this.moduleCache.keys()),
      systems: Array.from(this.systemCache.keys()),
    };
  }
}

/**
 * All core systems interface
 */
export interface CoreSystems {
  RCCModuleSystem: IRCCModuleSystem;
  DebugSystem: IDebugSystem;
  RCCStartupSystem: IStartupSystem;
  ModuleLoaderSystem: IModuleLoaderSystem;
  ModuleDiscoverySystem: IModuleDiscoverySystem;
  ModuleConfigurationManager: IModuleConfigurationManager;
}

/**
 * Main RCC System class - Provides unified access to all RCC functionality
 */
export class RCCSystem {
  private static instance: RCCSystem;
  private loader = ModuleLoader.getInstance();
  private systems: CoreSystems | null = null;
  private initialized = false;
  private systemStatus: SystemStatus = { initialized: false, systems: [] };

  private constructor() {}

  static getInstance(): RCCSystem {
    if (!RCCSystem.instance) {
      RCCSystem.instance = new RCCSystem();
    }
    return RCCSystem.instance;
  }

  /**
   * Initialize all RCC systems
   */
  async initialize(config?: any): Promise<AsyncResult<CoreSystems>> {
    if (this.initialized) {
      return {
        success: true,
        data: this.systems!,
        message: 'RCC System already initialized',
      };
    }

    try {
      console.log('🚀 Initializing RCC TypeScript System...');

      const result = await this.loadAllCoreSystems();

      if (result.success && result.data) {
        this.systems = result.data;
        this.initialized = true;

        // Update system status
        this.systemStatus = {
          initialized: true,
          systems: Object.keys(result.data) as (keyof CoreSystems)[]
        };

        console.log('✅ RCC TypeScript System initialized successfully');
        return {
          success: true,
          data: this.systems,
          message: 'All RCC systems initialized successfully'
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(errorMessage),
        message: `RCC System initialization failed: ${errorMessage}`
      };
    }
  }

  /**
   * Load all core systems at once with validation
   */
  private async loadAllCoreSystems(): Promise<AsyncResult<CoreSystems>> {
    try {
      const [
        moduleSystem,
        debugSystem,
        startupSystem,
        loaderSystem,
        discoverySystem,
        configManager
      ] = await Promise.all([
        this.loader.loadRCCSystem('RCCModuleSystem'),
        this.loader.loadRCCSystem('DebugSystem'),
        this.loader.loadRCCSystem('RCCStartupSystem'),
        this.loader.loadRCCSystem('ModuleLoaderSystem'),
        this.loader.loadRCCSystem('ModuleDiscoverySystem'),
        this.loader.loadRCCSystem('ModuleConfigurationManager')
      ]);

      // Validate all systems loaded successfully
      if (!moduleSystem.success || !debugSystem.success || !startupSystem.success ||
          !loaderSystem.success || !discoverySystem.success || !configManager.success) {
        return {
          success: false,
          error: new Error('Failed to load all required core systems'),
          message: 'One or more core systems failed to initialize'
        };
      }

      const systems: CoreSystems = {
        RCCModuleSystem: moduleSystem.data!,
        DebugSystem: debugSystem.data!,
        RCCStartupSystem: startupSystem.data!,
        ModuleLoaderSystem: loaderSystem.data!,
        ModuleDiscoverySystem: discoverySystem.data!,
        ModuleConfigurationManager: configManager.data!
      };

      return { success: true, data: systems };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(errorMessage),
        message: `Failed to load core systems: ${errorMessage}`
      };
    }
  }

  /**
   * Get specific system
   */
  getSystem<T extends keyof CoreSystems>(systemName: T): CoreSystems[T] | null {
    if (!this.initialized || !this.systems) {
      return null;
    }
    return this.systems[systemName];
  }

  /**
   * Check if system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get system status
   */
  getStatus(): SystemStatus {
    return { ...this.systemStatus };
  }

  /**
   * Shutdown all systems gracefully
   */
  async shutdown(): Promise<AsyncResult<boolean>> {
    if (!this.initialized || !this.systems) {
      return {
        success: true,
        data: true,
        message: 'System not initialized'
      };
    }

    try {
      console.log('🛑 Shutting down RCC TypeScript System...');

      // Shutdown systems in reverse order (most recent first)
      const systemsToShutdown: [string, any][] = [
        ['DebugSystem', this.systems.DebugSystem],
        ['RCCStartupSystem', this.systems.RCCStartupSystem],
        ['RCCModuleSystem', this.systems.RCCModuleSystem],
      ];

      const shutdownResults: string[] = [];

      for (const [name, system] of systemsToShutdown) {
        if (system?.shutdown || system?.stopServices) {
          try {
            if (system.shutdown) {
              await system.shutdown();
            } else if (system.stopServices) {
              await system.stopServices();
            }
            shutdownResults.push(`✅ ${name} shutdown successfully`);
          } catch (error) {
            console.warn(`⚠️ Warning: Failed to shutdown ${name}:`, error);
            shutdownResults.push(`⚠️ ${name} shutdown failed`);
          }
        }
      }

      // Clear systems and status
      this.systems = null;
      this.initialized = false;
      this.systemStatus = { initialized: false, systems: [] };

      // Clear loader cache
      this.loader.clearCache();

      console.log('✅ RCC TypeScript System shut down successfully');
      console.log('Shutdown results:');
      shutdownResults.forEach(result => console.log(`  ${result}`));

      return {
        success: true,
        data: true,
        message: 'All RCC systems shutdown successfully'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(errorMessage),
        message: `RCC System shutdown failed: ${errorMessage}`
      };
    }
  }
}

/**
 * Load all core systems at once - public wrapper
 */
export async function loadAllCoreSystems(): Promise<AsyncResult<CoreSystems>> {
  const system = RCCSystem.getInstance();
  if (!system.isInitialized()) {
    return {
      success: false,
      error: new Error('RCC System not initialized'),
      message: 'Cannot load core systems - RCC System not initialized'
    };
  }

  // Since systems are already initialized, just return them
  const systems = {
    RCCModuleSystem: system.getSystem('RCCModuleSystem')!,
    DebugSystem: system.getSystem('DebugSystem')!,
    RCCStartupSystem: system.getSystem('RCCStartupSystem')!,
    ModuleLoaderSystem: system.getSystem('ModuleLoaderSystem')!,
    ModuleDiscoverySystem: system.getSystem('ModuleDiscoverySystem')!,
    ModuleConfigurationManager: system.getSystem('ModuleConfigurationManager')!,
  };

  return {
    success: true,
    data: systems,
    message: 'Core systems already loaded and available'
  };
}

/**
 * Create system factory function - lazy initialization
 */
export function createRCCSystem(): RCCSystem {
  return RCCSystem.getInstance();
}

/**
 * Initialize RCC system with configuration
 */
export async function initializeRCCSystem(config?: any): Promise<AsyncResult<RCCSystem>> {
  const system = RCCSystem.getInstance();
  const result = await system.initialize(config);

  if (result.success) {
    return {
      success: true,
      data: system,
      message: result.message || 'RCC System initialized successfully'
    };
  }

  return {
    success: false,
    error: result.error,
    message: result.message || 'RCC System initialization failed'
  };
}

// ===== DEFAULT EXPORTS WITH BACKWARD COMPATIBILITY =====

// Core utility exports
export { SafeJson, safeJson } from './utils/safe-json';
export { DynamicImportManager, dynamicImportManager } from './utils/dynamic-import-manager';

// Type exports
export type {
  IRCCModuleSystem,
  IDebugSystem,
  IStartupSystem,
  IModuleLoaderSystem,
  IModuleDiscoverySystem,
  IModuleConfigurationManager,
  CoreSystems,
  SystemStatus,
  AsyncResult,
  RccError,
};

// Main system exports
export const rccSystem = RCCSystem.getInstance();
export const moduleLoader = ModuleLoader.getInstance();

// Legacy compatibility error classes
export class ModuleLoadError extends Error {
  constructor(message: string, public modulePath?: string) {
    super(message);
    this.name = 'ModuleLoadError';
  }
}

export class ModuleDependencyError extends Error {
  constructor(message: string, public dependencies: string[]) {
    super(message);
    this.name = 'ModuleDependencyError';
  }
}

export class ModuleMetadata {
  constructor(
    public id: string,
    public name: string,
    public version: string,
    public dependencies: string[] = [],
    public config: any = null
  ) {}
}

/**
 * Startup system configuration
 */
export interface StartupConfig {
  port?: number;
  host?: string;
  debugPath?: string;
  enableTwoPhaseDebug?: boolean;
  providers?: Record<string, any>;
  virtualModels?: Record<string, any>;
}

/**
 * RCC Startup System Interface
 */
export interface RCCStartupSystemInterface {
  initialize(config?: StartupConfig): Promise<AsyncResult<any>>;
  start(): Promise<AsyncResult<any>>;
  stop(): Promise<AsyncResult<any>>;
  getStatus(): { running: boolean; port?: number };
}

/**
 * Legacy startup system wrapper for backward compatibility
 */
export class StartupSystem implements RCCStartupSystemInterface {
  private system = rccSystem;

  async initialize(config?: StartupConfig): Promise<AsyncResult<any>> {
    const startupSystem = this.system.getSystem('RCCStartupSystem');
    if (!startupSystem) {
      return {
        success: false,
        error: new Error('Startup system not available')
      };
    }
    return startupSystem.initialize(config);
  }

  async start(): Promise<AsyncResult<any>> {
    const startupSystem = this.system.getSystem('RCCStartupSystem');
    if (!startupSystem) {
      return {
        success: false,
        error: new Error('Startup system not available')
      };
    }
    return startupSystem.startServices();
  }

  async stop(): Promise<AsyncResult<any>> {
    const startupSystem = this.system.getSystem('RCCStartupSystem');
    if (!startupSystem) {
      return {
        success: false,
        error: new Error('Startup system not available')
      };
    }
    return startupSystem.stopServices();
  }

  getStatus(): { running: boolean; port?: number } {
    const startupSystem = this.system.getSystem('RCCStartupSystem');
    if (!startupSystem) {
      return { running: false };
    }
    return startupSystem.getStatus();
  }
}

// Legacy named exports for backward compatibility
export const RCCModuleSystem = new Proxy({} as IRCCModuleSystem, {
  get(target, prop) {
    return async (...args: any[]) => {
      const system = rccSystem.getSystem('RCCModuleSystem');
      if (!system) throw new Error('RCCModuleSystem not initialized');
      return (system as any)[prop]?.(...args);
    };
  }
});

export const DebugSystem = new Proxy({} as IDebugSystem, {
  get(target, prop) {
    return async (...args: any[]) => {
      const system = rccSystem.getSystem('DebugSystem');
      if (!system) throw new Error('DebugSystem not initialized');
      return (system as any)[prop]?.(...args);
    };
  }
});

export const RCCStartupSystem = new Proxy({} as IStartupSystem, {
  get(target, prop) {
    return async (...args: any[]) => {
      const system = rccSystem.getSystem('RCCStartupSystem');
      if (!system) throw new Error('RCCStartupSystem not initialized');
      return (system as any)[prop]?.(...args);
    };
  }
});

export const ModuleLoaderSystem = new Proxy({} as IModuleLoaderSystem, {
  get(target, prop) {
    return async (...args: any[]) => {
      const system = rccSystem.getSystem('ModuleLoaderSystem');
      if (!system) throw new Error('ModuleLoaderSystem not initialized');
      return (system as any)[prop]?.(...args);
    };
  }
});

export const ModuleDiscoverySystem = new Proxy({} as IModuleDiscoverySystem, {
  get(target, prop) {
    return async (...args: any[]) => {
      const system = rccSystem.getSystem('ModuleDiscoverySystem');
      if (!system) throw new Error('ModuleDiscoverySystem not initialized');
      return (system as any)[prop]?.(...args);
    };
  }
});

export const ModuleConfigurationManager = new Proxy({} as IModuleConfigurationManager, {
  get(target, prop) {
    return async (...args: any[]) => {
      const system = rccSystem.getSystem('ModuleConfigurationManager');
      if (!system) throw new Error('ModuleConfigurationManager not initialized');
      return (system as any)[prop]?.(...args);
    };
  }
});

/**
 * ===== DEFAULT EXPORT - LEGACY COMPATIBILITY SYSTEM =====
 * Provides backward-compatible default export matching the original JavaScript
 */
const legacyCompatibilitySystem = {
  // Core system exports (proxied for lazy loading)
  RCCModuleSystem,
  DebugSystem,
  RCCStartupSystem,
  ModuleLoaderSystem,
  ModuleDiscoverySystem,
  ModuleConfigurationManager,

  // Startup system wrapper
  StartupSystem,

  // Modern system access points
  system: rccSystem,
  loader: moduleLoader,
  safeJson,
  dynamicImportManager,

  // Factory function for creating complete system
  createSystem: createRCCSystem,
  initializeRCCSystem,
  loadAllCoreSystems,

  // Error classes
  ModuleLoadError,
  ModuleDependencyError,
  ModuleMetadata,
};

/**
 * Type-safe default export
 */
export default legacyCompatibilitySystem;

/**
 * Module export metadata
 */
export const __esModule = true;

/**
 * Version and metadata information
 */
export const version = '2.0.0-ts';
export const name = 'rcc-typescript-framework';
export const description = 'TypeScript refactored main entry point with complete type safety';
export const framework = 'RCC4 TypeScript Framework';

/**
 * Export status helper function
 */
export function getSystemInfo() {
  const system = rccSystem.getStatus();
  const loader = moduleLoader.getCacheStatus();

  return {
    framework,
    version,
    initialized: system.initialized,
    activeSystems: system.systems.length,
    systemNames: system.systems,
    moduleCacheSize: loader.moduleSize,
    systemCacheSize: loader.systemSize,
  };
}
