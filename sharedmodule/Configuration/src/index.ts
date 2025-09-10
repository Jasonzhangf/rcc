/**
 * RCC Configuration Module
 * 
 * Main entry point for the RCC Configuration module.
 * This module provides comprehensive configuration management capabilities
 * including loading, validation, persistence, and UI management.
 */

// Export core system
export { ConfigurationSystem } from './core/ConfigurationSystem';
// Also import for default export
import { ConfigurationSystem } from './core/ConfigurationSystem';

// Export all interfaces
export * from './interfaces/IConfigurationSystem';
export * from './interfaces/IConfigLoaderModule';
export * from './interfaces/IConfigUIModule';
export * from './interfaces/IConfigPersistenceModule';
export * from './interfaces/IConfigValidatorModule';

// Export constants only (types are already exported from interfaces)
export * from './constants/ConfigurationConstants';

// Export Web UI module
export * from './webui';

// Export individual module implementations (when available)
// These would be actual implementations of the interface modules
// For now, we export the interfaces as the implementations would be separate

/**
 * Module version information
 */
export const MODULE_VERSION = '0.1.0';

/**
 * Module information
 */
export const MODULE_INFO = {
  name: 'rcc-configuration',
  version: MODULE_VERSION,
  description: 'RCC Configuration Module - Comprehensive configuration management for modular TypeScript applications',
  author: 'RCC Development Team',
  license: 'MIT',
  repository: 'https://github.com/rcc/rcc-configuration',
  keywords: [
    'rcc',
    'configuration',
    'config-management',
    'typescript',
    'modular-architecture',
    'validation',
    'persistence'
  ]
};

/**
 * Module capabilities
 */
export const MODULE_CAPABILITIES = [
  'configuration-loading',
  'configuration-saving',
  'configuration-validation',
  'configuration-watching',
  'backup-restore',
  'encryption-decryption',
  'multi-format-support',
  'ui-management',
  'dependency-validation',
  'security-validation'
];

/**
 * Quick start factory function for creating a configuration system
 * 
 * @param options Configuration system options
 * @returns Initialized configuration system instance
 */
export async function createConfigurationSystem(options?: {
  id?: string;
  name?: string;
  initialConfig?: any;
  modules?: Record<string, any>;
}): Promise<ConfigurationSystem> {
  const system = new ConfigurationSystem({
    id: options?.id || `configuration-system-${Date.now()}`,
    name: options?.name || 'ConfigurationSystem',
    version: MODULE_VERSION,
    description: 'Configuration management system',
    type: 'configuration-system'
  });

  await system.initialize({
    initialConfig: options?.initialConfig,
    modules: options?.modules
  });

  return system;
}

/**
 * Utility function to validate a configuration object structure
 * 
 * @param config Configuration object to validate
 * @returns Whether the configuration has the required structure
 */
export function isValidConfigurationStructure(config: any): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  // Check for required top-level properties
  const requiredProps = ['metadata', 'settings', 'version'];
  for (const prop of requiredProps) {
    if (!(prop in config)) {
      return false;
    }
  }

  // Check metadata structure
  if (!config.metadata || typeof config.metadata !== 'object') {
    return false;
  }

  const requiredMetadataProps = ['name', 'createdAt', 'updatedAt'];
  for (const prop of requiredMetadataProps) {
    if (!(prop in config.metadata)) {
      return false;
    }
  }

  // Check settings structure
  if (!config.settings || typeof config.settings !== 'object') {
    return false;
  }

  // Check version
  if (typeof config.version !== 'string') {
    return false;
  }

  return true;
}

/**
 * Utility function to create a basic configuration template
 * 
 * @param name Configuration name
 * @param description Optional configuration description
 * @returns Basic configuration template
 */
export function createConfigurationTemplate(
  name: string,
  description?: string
): import('./interfaces/IConfigurationSystem').ConfigData {
  const now = new Date().toISOString();
  
  return {
    metadata: {
      name,
      description: description || `Configuration for ${name}`,
      createdAt: now,
      updatedAt: now,
      author: 'RCC Configuration Module',
      environment: 'development'
    },
    settings: {
      general: {},
      application: {},
      database: {},
      security: {},
      performance: {}
    },
    version: '1.0.0'
  };
}

/**
 * Utility function to merge configuration objects
 * 
 * @param target Target configuration object
 * @param source Source configuration object
 * @param strategy Merge strategy
 * @returns Merged configuration object
 */
export function mergeConfigurations(
  target: import('./interfaces/IConfigurationSystem').ConfigData,
  source: import('./interfaces/IConfigurationSystem').ConfigData,
  strategy: 'shallow' | 'deep' | 'replace' = 'deep'
): import('./interfaces/IConfigurationSystem').ConfigData {
  if (strategy === 'replace') {
    return { ...source };
  }

  if (strategy === 'shallow') {
    return {
      ...target,
      ...source,
      metadata: { ...target.metadata, ...source.metadata, updatedAt: new Date().toISOString() },
      settings: { ...target.settings, ...source.settings }
    };
  }

  // Deep merge strategy
  function deepMerge(obj1: any, obj2: any): any {
    const result = { ...obj1 };
    
    for (const key in obj2) {
      if (Object.prototype.hasOwnProperty.call(obj2, key)) {
        if (
          obj2[key] && 
          typeof obj2[key] === 'object' && 
          !Array.isArray(obj2[key]) &&
          obj1[key] && 
          typeof obj1[key] === 'object' && 
          !Array.isArray(obj1[key])
        ) {
          result[key] = deepMerge(obj1[key], obj2[key]);
        } else {
          result[key] = obj2[key];
        }
      }
    }
    
    return result;
  }

  const merged = deepMerge(target, source);
  merged.metadata.updatedAt = new Date().toISOString();
  
  return merged;
}

/**
 * Utility function to extract configuration paths for validation
 * 
 * @param config Configuration object
 * @param prefix Path prefix
 * @returns Array of configuration paths
 */
export function extractConfigurationPaths(
  config: Record<string, any>,
  prefix = ''
): string[] {
  const paths: string[] = [];
  
  for (const key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      paths.push(currentPath);
      
      if (config[key] && typeof config[key] === 'object' && !Array.isArray(config[key])) {
        paths.push(...extractConfigurationPaths(config[key], currentPath));
      }
    }
  }
  
  return paths;
}

/**
 * Utility function to get a nested value from configuration
 * 
 * @param config Configuration object
 * @param path Dot-notation path
 * @param defaultValue Default value if path not found
 * @returns Value at path or default value
 */
export function getConfigurationValue(
  config: Record<string, any>,
  path: string,
  defaultValue?: any
): any {
  const keys = path.split('.');
  let current = config;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  
  return current;
}

/**
 * Utility function to set a nested value in configuration
 * 
 * @param config Configuration object
 * @param path Dot-notation path
 * @param value Value to set
 */
export function setConfigurationValue(
  config: Record<string, any>,
  path: string,
  value: any
): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current = config;
  
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
}

/**
 * Default export for CommonJS compatibility
 */
export default {
  ConfigurationSystem,
  createConfigurationSystem,
  isValidConfigurationStructure,
  createConfigurationTemplate,
  mergeConfigurations,
  extractConfigurationPaths,
  getConfigurationValue,
  setConfigurationValue,
  MODULE_VERSION,
  MODULE_INFO,
  MODULE_CAPABILITIES
};