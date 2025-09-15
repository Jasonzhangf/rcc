/**
 * RCC Module Discovery System
 * Discovers and loads modules from the src/modules directory
 */

import * as fs from 'fs';
import * as path from 'path';
import { ModuleInfo } from 'rcc-basemodule';

/**
 * Module metadata structure
 */
export interface ModuleMetadata {
  /** Module directory name */
  name: string;
  /** Full path to module directory */
  path: string;
  /** Module package.json content */
  packageInfo: any;
  /** Module main file path */
  mainFile: string;
  /** Module type (provider, processor, etc.) */
  type: string;
  /** Whether module is enabled */
  enabled: boolean;
  /** Module dependencies */
  dependencies: string[];
  /** Module configuration schema */
  configSchema?: any;
}

/**
 * Module discovery configuration
 */
export interface ModuleDiscoveryConfig {
  /** Root modules directory */
  modulesDir: string;
  /** Module types to discover */
  moduleTypes?: string[];
  /** Exclude patterns */
  excludePatterns?: string[];
  /** Auto-load enabled modules */
  autoLoad?: boolean;
  /** Cache discovered modules */
  cacheEnabled?: boolean;
  /** Cache duration in milliseconds */
  cacheDuration?: number;
}

/**
 * Module Discovery System
 */
export class ModuleDiscoverySystem {
  private config: ModuleDiscoveryConfig;
  private discoveredModules: Map<string, ModuleMetadata> = new Map();
  private cacheTimestamp: number = 0;
  private cacheExpiry: number = 0;

  constructor(config: ModuleDiscoveryConfig) {
    this.config = {
      modulesDir: config.modulesDir,
      moduleTypes: config.moduleTypes || ['provider', 'processor', 'transformer'],
      excludePatterns: config.excludePatterns || ['node_modules', '.git', 'dist', '__test__'],
      autoLoad: config.autoLoad || false,
      cacheEnabled: config.cacheEnabled || true,
      cacheDuration: config.cacheDuration || 60000 // 1 minute default
    };
    this.cacheExpiry = this.config.cacheDuration;
  }

  /**
   * Discover all modules in the modules directory
   */
  public async discoverModules(): Promise<ModuleMetadata[]> {
    // Check cache first
    if (this.isCacheValid()) {
      return Array.from(this.discoveredModules.values());
    }

    this.clearCache();

    try {
      const modulesDir = this.config.modulesDir;
      
      if (!fs.existsSync(modulesDir)) {
        this.logWarn(`Modules directory not found: ${modulesDir}`, 'discoverModules');
        return [];
      }

      const entries = fs.readdirSync(modulesDir, { withFileTypes: true });
      const modules: ModuleMetadata[] = [];

      for (const entry of entries) {
        if (entry.isDirectory() && !this.shouldExclude(entry.name)) {
          const moduleMetadata = await this.analyzeModule(entry.name, path.join(modulesDir, entry.name));
          if (moduleMetadata) {
            modules.push(moduleMetadata);
            this.discoveredModules.set(entry.name, moduleMetadata);
          }
        }
      }

      this.updateCache();
      this.logInfo(`Discovered ${modules.length} modules`, { modules: modules.map(m => m.name) }, 'discoverModules');

      return modules;
    } catch (error) {
      this.error('Error discovering modules', error, 'discoverModules');
      return [];
    }
  }

  /**
   * Analyze a specific module directory
   */
  private async analyzeModule(moduleName: string, modulePath: string): Promise<ModuleMetadata | null> {
    try {
      const packagePath = path.join(modulePath, 'package.json');
      
      if (!fs.existsSync(packagePath)) {
        this.logDebug(`No package.json found in module: ${moduleName}`, 'analyzeModule');
        return null;
      }

      const packageContent = fs.readFileSync(packagePath, 'utf-8');
      const packageInfo = JSON.parse(packageContent);

      // Validate required fields
      if (!packageInfo.name || !packageInfo.version) {
        this.logWarn(`Invalid package.json in module: ${moduleName}`, 'analyzeModule');
        return null;
      }

      // Determine module type
      const moduleType = this.determineModuleType(packageInfo, modulePath);

      // Find main file
      const mainFile = this.findMainFile(modulePath, packageInfo);

      // Get dependencies
      const dependencies = Object.keys(packageInfo.dependencies || {});

      // Load config schema if available
      const configSchema = this.loadConfigSchema(modulePath);

      const metadata: ModuleMetadata = {
        name: moduleName,
        path: modulePath,
        packageInfo,
        mainFile,
        type: moduleType,
        enabled: this.isModuleEnabled(moduleName, packageInfo),
        dependencies,
        configSchema
      };

      this.logDebug(`Analyzed module: ${moduleName}`, metadata, 'analyzeModule');
      return metadata;
    } catch (error) {
      this.error(`Error analyzing module: ${moduleName}`, error, 'analyzeModule');
      return null;
    }
  }

  /**
   * Determine module type based on package.json and structure
   */
  private determineModuleType(packageInfo: any, modulePath: string): string {
    // Check package.json keywords
    const keywords = packageInfo.keywords || [];
    if (keywords.includes('provider')) return 'provider';
    if (keywords.includes('processor')) return 'processor';
    if (keywords.includes('transformer')) return 'transformer';

    // Check name patterns
    const name = packageInfo.name.toLowerCase();
    if (name.includes('provider')) return 'provider';
    if (name.includes('processor')) return 'processor';
    if (name.includes('transformer')) return 'transformer';

    // Check directory structure
    const srcPath = path.join(modulePath, 'src');
    if (fs.existsSync(srcPath)) {
      const srcFiles = fs.readdirSync(srcPath);
      if (srcFiles.some(file => file.toLowerCase().includes('provider'))) {
        return 'provider';
      }
    }

    // Default to 'generic'
    return 'generic';
  }

  /**
   * Find the main file of the module
   */
  private findMainFile(modulePath: string, packageInfo: any): string {
    // Check package.json main field
    if (packageInfo.main) {
      const mainFile = path.join(modulePath, packageInfo.main);
      if (fs.existsSync(mainFile)) {
        return mainFile;
      }
    }

    // Check for src/index.ts
    const srcIndex = path.join(modulePath, 'src', 'index.ts');
    if (fs.existsSync(srcIndex)) {
      return srcIndex;
    }

    // Check for index.ts
    const rootIndex = path.join(modulePath, 'index.ts');
    if (fs.existsSync(rootIndex)) {
      return rootIndex;
    }

    // Check for lib/index.js
    const libIndex = path.join(modulePath, 'lib', 'index.js');
    if (fs.existsSync(libIndex)) {
      return libIndex;
    }

    // Default to src/index.ts
    return srcIndex;
  }

  /**
   * Load configuration schema if available
   */
  private loadConfigSchema(modulePath: string): any {
    const schemaPaths = [
      path.join(modulePath, 'config.schema.json'),
      path.join(modulePath, 'schema', 'config.json'),
      path.join(modulePath, 'types', 'config.schema.json')
    ];

    for (const schemaPath of schemaPaths) {
      if (fs.existsSync(schemaPath)) {
        try {
          const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
          return JSON.parse(schemaContent);
        } catch (error) {
          this.logWarn(`Failed to load config schema from ${schemaPath}`, error, 'loadConfigSchema');
        }
      }
    }

    return undefined;
  }

  /**
   * Check if module should be excluded from discovery
   */
  private shouldExclude(moduleName: string): boolean {
    return this.config.excludePatterns!.some(pattern => {
      if (pattern.startsWith('*')) {
        return moduleName.endsWith(pattern.substring(1));
      } else if (pattern.endsWith('*')) {
        return moduleName.startsWith(pattern.substring(0, pattern.length - 1));
      } else {
        return moduleName === pattern;
      }
    });
  }

  /**
   * Check if module is enabled
   */
  private isModuleEnabled(moduleName: string, packageInfo: any): boolean {
    // Check package.json enabled field
    if (typeof packageInfo.enabled === 'boolean') {
      return packageInfo.enabled;
    }

    // Check for disabled keyword
    const keywords = packageInfo.keywords || [];
    if (keywords.includes('disabled')) {
      return false;
    }

    // Default to enabled
    return true;
  }

  /**
   * Get a specific module by name
   */
  public async getModule(moduleName: string): Promise<ModuleMetadata | null> {
    const modules = await this.discoverModules();
    return modules.find(m => m.name === moduleName) || null;
  }

  /**
   * Get modules by type
   */
  public async getModulesByType(type: string): Promise<ModuleMetadata[]> {
    const modules = await this.discoverModules();
    return modules.filter(m => m.type === type && m.enabled);
  }

  /**
   * Get enabled provider modules
   */
  public async getProviderModules(): Promise<ModuleMetadata[]> {
    return this.getModulesByType('provider');
  }

  /**
   * Load a module dynamically
   */
  public async loadModule(moduleName: string): Promise<any> {
    const module = await this.getModule(moduleName);
    
    if (!module) {
      throw new Error(`Module not found: ${moduleName}`);
    }

    if (!module.enabled) {
      throw new Error(`Module is disabled: ${moduleName}`);
    }

    try {
      // Clear require cache for dynamic loading
      const resolvedPath = require.resolve(module.mainFile);
      delete require.cache[resolvedPath];

      // Load the module
      const moduleExports = require(module.mainFile);
      
      this.logInfo(`Loaded module: ${moduleName}`, { mainFile: module.mainFile }, 'loadModule');
      
      return moduleExports;
    } catch (error) {
      this.error(`Failed to load module: ${moduleName}`, error, 'loadModule');
      throw error;
    }
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    if (!this.config.cacheEnabled) {
      return false;
    }

    return Date.now() - this.cacheTimestamp < this.cacheExpiry;
  }

  /**
   * Update cache timestamp
   */
  private updateCache(): void {
    this.cacheTimestamp = Date.now();
  }

  /**
   * Clear cache
   */
  private clearCache(): void {
    this.discoveredModules.clear();
    this.cacheTimestamp = 0;
  }

  /**
   * Force refresh the module cache
   */
  public async refreshCache(): Promise<ModuleMetadata[]> {
    this.clearCache();
    return this.discoverModules();
  }

  /**
   * Get module discovery statistics
   */
  public getStatistics(): {
    totalModules: number;
    enabledModules: number;
    modulesByType: Record<string, number>;
    cacheTimestamp: number;
    cacheValid: boolean;
  } {
    const modules = Array.from(this.discoveredModules.values());
    const enabledModules = modules.filter(m => m.enabled);
    const modulesByType: Record<string, number> = {};

    modules.forEach(module => {
      modulesByType[module.type] = (modulesByType[module.type] || 0) + 1;
    });

    return {
      totalModules: modules.length,
      enabledModules: enabledModules.length,
      modulesByType,
      cacheTimestamp: this.cacheTimestamp,
      cacheValid: this.isCacheValid()
    };
  }

  /**
   * Logging utilities
   */
  private logInfo(message: string, data: any, method: string): void {
    console.log(`[ModuleDiscovery] ${message}`, { data, method });
  }

  private logDebug(message: string, data: any, method: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[ModuleDiscovery] ${message}`, { data, method });
    }
  }

  private logWarn(message: string, error: any, method: string): void {
    console.warn(`[ModuleDiscovery] ${message}`, { error, method });
  }

  private error(message: string, error: any, method: string): void {
    console.error(`[ModuleDiscovery] ${message}`, { error, method });
  }
}