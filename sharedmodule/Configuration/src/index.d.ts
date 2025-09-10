/**
 * RCC Configuration Module
 *
 * Main entry point for the RCC Configuration module.
 * This module provides comprehensive configuration management capabilities
 * including loading, validation, persistence, and UI management.
 */
export { ConfigurationSystem } from './core/ConfigurationSystem';
import { ConfigurationSystem } from './core/ConfigurationSystem';
export * from './interfaces/IConfigurationSystem';
export * from './interfaces/IConfigLoaderModule';
export * from './interfaces/IConfigUIModule';
export * from './interfaces/IConfigPersistenceModule';
export * from './interfaces/IConfigValidatorModule';
export * from './constants/ConfigurationConstants';
import * as WebUI from './webui';
export { WebUI };
/**
 * Module version information
 */
export declare const MODULE_VERSION = "0.1.0";
/**
 * Module information
 */
export declare const MODULE_INFO: {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    repository: string;
    keywords: string[];
};
/**
 * Module capabilities
 */
export declare const MODULE_CAPABILITIES: string[];
/**
 * Quick start factory function for creating a configuration system
 *
 * @param options Configuration system options
 * @returns Initialized configuration system instance
 */
export declare function createConfigurationSystem(options?: {
    id?: string;
    name?: string;
    initialConfig?: any;
    modules?: Record<string, any>;
}): Promise<ConfigurationSystem>;
/**
 * Utility function to validate a configuration object structure
 *
 * @param config Configuration object to validate
 * @returns Whether the configuration has the required structure
 */
export declare function isValidConfigurationStructure(config: any): boolean;
/**
 * Utility function to create a basic configuration template
 *
 * @param name Configuration name
 * @param description Optional configuration description
 * @returns Basic configuration template
 */
export declare function createConfigurationTemplate(name: string, description?: string): import('./interfaces/IConfigurationSystem').ConfigData;
/**
 * Utility function to merge configuration objects
 *
 * @param target Target configuration object
 * @param source Source configuration object
 * @param strategy Merge strategy
 * @returns Merged configuration object
 */
export declare function mergeConfigurations(target: import('./interfaces/IConfigurationSystem').ConfigData, source: import('./interfaces/IConfigurationSystem').ConfigData, strategy?: 'shallow' | 'deep' | 'replace'): import('./interfaces/IConfigurationSystem').ConfigData;
/**
 * Utility function to extract configuration paths for validation
 *
 * @param config Configuration object
 * @param prefix Path prefix
 * @returns Array of configuration paths
 */
export declare function extractConfigurationPaths(config: Record<string, any>, prefix?: string): string[];
/**
 * Utility function to get a nested value from configuration
 *
 * @param config Configuration object
 * @param path Dot-notation path
 * @param defaultValue Default value if path not found
 * @returns Value at path or default value
 */
export declare function getConfigurationValue(config: Record<string, any>, path: string, defaultValue?: any): any;
/**
 * Utility function to set a nested value in configuration
 *
 * @param config Configuration object
 * @param path Dot-notation path
 * @param value Value to set
 */
export declare function setConfigurationValue(config: Record<string, any>, path: string, value: any): void;
/**
 * Default export for CommonJS compatibility
 */
declare const _default: {
    ConfigurationSystem: typeof ConfigurationSystem;
    createConfigurationSystem: typeof createConfigurationSystem;
    isValidConfigurationStructure: typeof isValidConfigurationStructure;
    createConfigurationTemplate: typeof createConfigurationTemplate;
    mergeConfigurations: typeof mergeConfigurations;
    extractConfigurationPaths: typeof extractConfigurationPaths;
    getConfigurationValue: typeof getConfigurationValue;
    setConfigurationValue: typeof setConfigurationValue;
    MODULE_VERSION: string;
    MODULE_INFO: {
        name: string;
        version: string;
        description: string;
        author: string;
        license: string;
        repository: string;
        keywords: string[];
    };
    MODULE_CAPABILITIES: string[];
};
export default _default;
