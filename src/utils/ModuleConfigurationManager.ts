/**
 * RCC Module Configuration Manager
 * Manages configuration for discovered modules
 */

import * as fs from 'fs';
import * as path from 'path';
import { ModuleDiscoverySystem, ModuleMetadata } from './ModuleDiscoverySystem';

/**
 * Configuration item
 */
export interface ConfigItem {
  /** Configuration key */
  key: string;
  /** Configuration value */
  value: any;
  /** Description */
  description?: string;
  /** Data type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** Whether the value is required */
  required: boolean;
  /** Default value */
  defaultValue?: any;
  /** Validation rules */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  /** Environment variable name */
  envVar?: string;
}

/**
 * Module configuration
 */
export interface ModuleConfiguration {
  /** Module name */
  moduleName: string;
  /** Configuration items */
  configs: ConfigItem[];
  /** Configuration values */
  values: Record<string, any>;
  /** Configuration file path */
  configFilePath?: string;
  /** Last modified timestamp */
  lastModified?: number;
}

/**
 * Configuration manager configuration
 */
export interface ConfigurationManagerConfig {
  /** Configuration directory */
  configDir: string;
  /** Module discovery system */
  moduleDiscovery: ModuleDiscoverySystem;
  /** Environment variable prefix */
  envPrefix?: string;
  /** Auto-save configuration changes */
  autoSave?: boolean;
  /** Configuration file format */
  configFileFormat?: 'json' | 'yaml' | 'toml';
}

/**
 * Module Configuration Manager
 */
export class ModuleConfigurationManager {
  private config: ConfigurationManagerConfig;
  private configurations: Map<string, ModuleConfiguration> = new Map();
  private watchers: fs.FSWatcher[] = [];

  constructor(config: ConfigurationManagerConfig) {
    this.config = {
      configDir: config.configDir,
      moduleDiscovery: config.moduleDiscovery,
      envPrefix: config.envPrefix || 'RCC_',
      autoSave: config.autoSave || true,
      configFileFormat: config.configFileFormat || 'json'
    };

    // Ensure config directory exists
    this.ensureConfigDirectory();
  }

  /**
   * Initialize configuration manager
   */
  public async initialize(): Promise<void> {
    // Discover modules
    const modules = await this.config.moduleDiscovery.discoverModules();
    
    // Load configurations for all modules
    for (const module of modules) {
      await this.loadModuleConfiguration(module);
    }

    // Setup file watchers for auto-reload
    if (this.config.autoSave) {
      this.setupFileWatchers();
    }

    console.log(`[ConfigManager] Initialized with ${this.configurations.size} module configurations`);
  }

  /**
   * Load configuration for a specific module
   */
  public async loadModuleConfiguration(module: ModuleMetadata): Promise<ModuleConfiguration> {
    const configFilePath = this.getConfigFilePath(module.name);
    
    // Build configuration schema from module metadata
    const configs = this.buildConfigurationSchema(module);
    
    // Load existing values or create defaults
    let values: Record<string, any> = {};
    
    if (fs.existsSync(configFilePath)) {
      try {
        const configContent = fs.readFileSync(configFilePath, 'utf-8');
        values = JSON.parse(configContent);
      } catch (error) {
        console.warn(`[ConfigManager] Failed to load config for ${module.name}:`, error);
      }
    }

    // Apply defaults for missing values
    configs.forEach(config => {
      if (!(config.key in values) && config.defaultValue !== undefined) {
        values[config.key] = config.defaultValue;
      }
    });

    // Override with environment variables
    this.applyEnvironmentOverrides(module.name, configs, values);

    const moduleConfig: ModuleConfiguration = {
      moduleName: module.name,
      configs,
      values,
      configFilePath,
      lastModified: fs.existsSync(configFilePath) ? fs.statSync(configFilePath).mtimeMs : Date.now()
    };

    this.configurations.set(module.name, moduleConfig);
    
    console.log(`[ConfigManager] Loaded configuration for module: ${module.name}`);
    return moduleConfig;
  }

  /**
   * Get configuration for a module
   */
  public getModuleConfiguration(moduleName: string): ModuleConfiguration | null {
    return this.configurations.get(moduleName) || null;
  }

  /**
   * Get configuration value for a module
   */
  public getConfigurationValue(moduleName: string, key: string): any {
    const moduleConfig = this.configurations.get(moduleName);
    return moduleConfig?.values[key];
  }

  /**
   * Set configuration value for a module
   */
  public async setConfigurationValue(moduleName: string, key: string, value: any): Promise<void> {
    const moduleConfig = this.configurations.get(moduleName);
    
    if (!moduleConfig) {
      throw new Error(`Module configuration not found: ${moduleName}`);
    }

    // Validate the value
    this.validateConfigurationValue(moduleConfig, key, value);

    // Set the value
    moduleConfig.values[key] = value;
    moduleConfig.lastModified = Date.now();

    // Save if auto-save is enabled
    if (this.config.autoSave) {
      await this.saveModuleConfiguration(moduleName);
    }

    console.log(`[ConfigManager] Set configuration value for ${moduleName}.${key} =`, value);
  }

  /**
   * Save configuration for a module
   */
  public async saveModuleConfiguration(moduleName: string): Promise<void> {
    const moduleConfig = this.configurations.get(moduleName);
    
    if (!moduleConfig) {
      throw new Error(`Module configuration not found: ${moduleName}`);
    }

    if (!moduleConfig.configFilePath) {
      throw new Error(`No config file path for module: ${moduleName}`);
    }

    try {
      const configData = JSON.stringify(moduleConfig.values, null, 2);
      fs.writeFileSync(moduleConfig.configFilePath, configData, 'utf-8');
      
      console.log(`[ConfigManager] Saved configuration for module: ${moduleName}`);
    } catch (error) {
      console.error(`[ConfigManager] Failed to save config for ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Save all module configurations
   */
  public async saveAllConfigurations(): Promise<void> {
    const savePromises = Array.from(this.configurations.keys()).map(moduleName => 
      this.saveModuleConfiguration(moduleName)
    );

    await Promise.all(savePromises);
    console.log('[ConfigManager] Saved all module configurations');
  }

  /**
   * Validate configuration values for a module
   */
  public validateModuleConfiguration(moduleName: string): {
    valid: boolean;
    errors: string[];
  } {
    const moduleConfig = this.configurations.get(moduleName);
    
    if (!moduleConfig) {
      return {
        valid: false,
        errors: [`Module configuration not found: ${moduleName}`]
      };
    }

    const errors: string[] = [];

    // Check required fields
    for (const config of moduleConfig.configs) {
      if (config.required && !(config.key in moduleConfig.values)) {
        errors.push(`Required configuration missing: ${config.key}`);
      }
    }

    // Validate values
    for (const [key, value] of Object.entries(moduleConfig.values)) {
      try {
        this.validateConfigurationValue(moduleConfig, key, value);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration schema for a module
   */
  public getConfigurationSchema(moduleName: string): ConfigItem[] {
    const moduleConfig = this.configurations.get(moduleName);
    return moduleConfig?.configs || [];
  }

  /**
   * Get all configurations
   */
  public getAllConfigurations(): ModuleConfiguration[] {
    return Array.from(this.configurations.values());
  }

  /**
   * Reload configuration for a module
   */
  public async reloadModuleConfiguration(moduleName: string): Promise<ModuleConfiguration> {
    const module = await this.config.moduleDiscovery.getModule(moduleName);
    
    if (!module) {
      throw new Error(`Module not found: ${moduleName}`);
    }

    return this.loadModuleConfiguration(module);
  }

  /**
   * Build configuration schema from module metadata
   */
  private buildConfigurationSchema(module: ModuleMetadata): ConfigItem[] {
    const configs: ConfigItem[] = [];

    // Add module name
    configs.push({
      key: 'name',
      value: module.name,
      description: 'Module name',
      type: 'string',
      required: true,
      defaultValue: module.name
    });

    // Add version
    configs.push({
      key: 'version',
      value: module.packageInfo.version,
      description: 'Module version',
      type: 'string',
      required: true,
      defaultValue: module.packageInfo.version
    });

    // Add enabled flag
    configs.push({
      key: 'enabled',
      value: module.enabled,
      description: 'Whether the module is enabled',
      type: 'boolean',
      required: false,
      defaultValue: module.enabled
    });

    // Add module-specific configurations based on type
    if (module.type === 'provider') {
      configs.push(
        {
          key: 'endpoint',
          value: '',
          description: 'API endpoint URL',
          type: 'string',
          required: true
        },
        {
          key: 'timeout',
          value: 30000,
          description: 'Request timeout in milliseconds',
          type: 'number',
          required: false,
          defaultValue: 30000,
          validation: { min: 1000, max: 300000 }
        },
        {
          key: 'maxRetries',
          value: 3,
          description: 'Maximum number of retries',
          type: 'number',
          required: false,
          defaultValue: 3,
          validation: { min: 0, max: 10 }
        }
      );
    }

    // Add configuration from schema if available
    if (module.configSchema) {
      const schemaConfigs = this.parseConfigSchema(module.configSchema);
      configs.push(...schemaConfigs);
    }

    return configs;
  }

  /**
   * Parse configuration schema
   */
  private parseConfigSchema(schema: any): ConfigItem[] {
    const configs: ConfigItem[] = [];

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties as any)) {
        configs.push({
          key,
          value: undefined,
          description: (prop as any).description || `Configuration for ${key}`,
          type: this.mapSchemaType((prop as any).type),
          required: schema.required?.includes(key) || false,
          defaultValue: (prop as any).default
        });
      }
    }

    return configs;
  }

  /**
   * Map JSON schema type to config item type
   */
  private mapSchemaType(schemaType: string): ConfigItem['type'] {
    switch (schemaType) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'object': return 'object';
      case 'array': return 'array';
      default: return 'string';
    }
  }

  /**
   * Validate configuration value
   */
  private validateConfigurationValue(moduleConfig: ModuleConfiguration, key: string, value: any): void {
    const config = moduleConfig.configs.find(c => c.key === key);
    
    if (!config) {
      throw new Error(`Unknown configuration key: ${key}`);
    }

    // Check type
    if (typeof value !== config.type) {
      throw new Error(`Expected ${config.type} for ${key}, got ${typeof value}`);
    }

    // Check validation rules
    if (config.validation) {
      if (config.validation.min !== undefined && value < config.validation.min) {
        throw new Error(`Value for ${key} must be at least ${config.validation.min}`);
      }
      
      if (config.validation.max !== undefined && value > config.validation.max) {
        throw new Error(`Value for ${key} must be at most ${config.validation.max}`);
      }
      
      if (config.validation.pattern && typeof value === 'string') {
        const regex = new RegExp(config.validation.pattern);
        if (!regex.test(value)) {
          throw new Error(`Value for ${key} does not match pattern: ${config.validation.pattern}`);
        }
      }
      
      if (config.validation.enum && !config.validation.enum.includes(value)) {
        throw new Error(`Value for ${key} must be one of: ${config.validation.enum.join(', ')}`);
      }
    }
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentOverrides(moduleName: string, configs: ConfigItem[], values: Record<string, any>): void {
    for (const config of configs) {
      if (config.envVar) {
        const envValue = process.env[config.envVar];
        if (envValue !== undefined) {
          // Convert environment variable to correct type
          switch (config.type) {
            case 'number':
              values[config.key] = Number(envValue);
              break;
            case 'boolean':
              values[config.key] = envValue.toLowerCase() === 'true';
              break;
            case 'object':
            case 'array':
              try {
                values[config.key] = JSON.parse(envValue);
              } catch {
                values[config.key] = envValue;
              }
              break;
            default:
              values[config.key] = envValue;
          }
        }
      }
    }
  }

  /**
   * Get configuration file path for a module
   */
  private getConfigFilePath(moduleName: string): string {
    const fileName = `${moduleName}.config.${this.config.configFileFormat}`;
    return path.join(this.config.configDir, fileName);
  }

  /**
   * Ensure configuration directory exists
   */
  private ensureConfigDirectory(): void {
    if (!fs.existsSync(this.config.configDir)) {
      fs.mkdirSync(this.config.configDir, { recursive: true });
    }
  }

  /**
   * Setup file watchers for auto-reload
   */
  private setupFileWatchers(): void {
    // Watch configuration directory
    try {
      const watcher = fs.watch(this.config.configDir, (eventType, filename) => {
        if (eventType === 'change' && filename?.endsWith('.config.json')) {
          const moduleName = filename.replace('.config.json', '');
          this.reloadModuleConfiguration(moduleName).catch(error => {
            console.error(`[ConfigManager] Failed to reload config for ${moduleName}:`, error);
          });
        }
      });
      
      this.watchers.push(watcher);
    } catch (error) {
      console.warn('[ConfigManager] Failed to setup file watcher:', error);
    }
  }

  /**
   * Close configuration manager
   */
  public async close(): Promise<void> {
    // Save all configurations
    await this.saveAllConfigurations();

    // Close file watchers
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    console.log('[ConfigManager] Closed');
  }
}