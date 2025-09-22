/**
 * Config Loader Module Interface
 * 
 * Defines the contract for loading configuration data from various sources
 * including files, environment variables, remote APIs, and databases.
 */

import {
  ConfigData,
  ConfigSource,
  ConfigValidationResult
} from '../core/ConfigData';
import type { BufferEncoding } from 'buffer';

/**
 * Configuration loading options
 */
export interface ConfigLoadOptions {
  /**
   * File encoding for file sources
   */
  encoding?: BufferEncoding;
  
  /**
   * Whether to watch for changes
   */
  watch?: boolean;
  
  /**
   * Cache configuration for performance
   */
  cache?: boolean;
  
  /**
   * Cache TTL in milliseconds
   */
  cacheTTL?: number;
  
  /**
   * Validation options
   */
  validation?: ConfigValidationOptions;
  
  /**
   * Merge strategy for multiple sources
   */
  mergeStrategy?: 'shallow' | 'deep' | 'replace';
  
  /**
   * Transform functions to apply after loading
   */
  transforms?: ConfigTransform[];
  
  /**
   * Whether to resolve environment variable references
   */
  resolveEnvVars?: boolean;
  
  /**
   * Environment variable prefix for resolution
   */
  envVarPrefix?: string;
}

/**
 * Configuration validation options
 */
export interface ConfigValidationOptions {
  /**
   * Whether to validate during loading
   */
  enabled: boolean;
  
  /**
   * Schema to validate against
   */
  schema?: any;
  
  /**
   * Validation level
   */
  level?: 'strict' | 'normal' | 'loose';
  
  /**
   * Whether to throw on validation errors
   */
  throwOnError?: boolean;
  
  /**
   * Custom validation functions
   */
  customValidators?: ConfigCustomValidator[];
}

/**
 * Custom validator function
 */
export interface ConfigCustomValidator {
  /**
   * Validator name
   */
  name: string;
  
  /**
   * Validation function
   */
  validate: (value: any, config: ConfigData) => boolean | string;
  
  /**
   * Error message template
   */
  message: string;
}

/**
 * Configuration transform function
 */
export interface ConfigTransform {
  /**
   * Transform name
   */
  name: string;
  
  /**
   * Transform function
   */
  transform: (config: ConfigData) => ConfigData | Promise<ConfigData>;
  
  /**
   * When to apply this transform
   */
  when?: 'before-validation' | 'after-validation' | 'always';
}

/**
 * Environment variable resolution options
 */
export interface EnvVarResolutionOptions {
  /**
   * Prefix for environment variables
   */
  prefix?: string;
  
  /**
   * Separator for nested properties
   */
  separator?: string;
  
  /**
   * Whether to convert keys to lowercase
   */
  lowercase?: boolean;
  
  /**
   * Type conversion for values
   */
  typeConversion?: boolean;
  
  /**
   * Default values for missing env vars
   */
  defaults?: Record<string, any>;
}

/**
 * Remote source configuration
 */
export interface RemoteSourceConfig {
  /**
   * Request URL
   */
  url: string;
  
  /**
   * HTTP method
   */
  method?: 'GET' | 'POST' | 'PUT';
  
  /**
   * Request headers
   */
  headers?: Record<string, string>;
  
  /**
   * Request body for POST/PUT
   */
  body?: any;
  
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Number of retry attempts
   */
  retries?: number;
  
  /**
   * Retry delay in milliseconds
   */
  retryDelay?: number;
  
  /**
   * Response validation
   */
  responseValidation?: {
    /**
     * Expected status codes
     */
    statusCodes?: number[];
    
    /**
     * Response schema validation
     */
    schema?: any;
  };
}

/**
 * Database source configuration
 */
export interface DatabaseSourceConfig {
  /**
   * Database connection string
   */
  connectionString: string;
  
  /**
   * Database type
   */
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
  
  /**
   * Query to retrieve configuration
   */
  query: string;
  
  /**
   * Query parameters
   */
  parameters?: any[];
  
  /**
   * Connection timeout
   */
  timeout?: number;
  
  /**
   * Result transformation function
   */
  transform?: (rows: any[]) => ConfigData;
}

/**
 * File watching configuration
 */
export interface FileWatchConfig {
  /**
   * Whether watching is enabled
   */
  enabled: boolean;
  
  /**
   * Debounce delay for file changes
   */
  debounceDelay?: number;
  
  /**
   * Files or patterns to watch
   */
  patterns?: string[];
  
  /**
   * Files or patterns to ignore
   */
  ignored?: string[];
  
  /**
   * Whether to watch subdirectories
   */
  recursive?: boolean;
  
  /**
   * Events to watch for
   */
  events?: ('add' | 'change' | 'unlink')[];
}

/**
 * Configuration loading result
 */
export interface ConfigLoadResult {
  /**
   * Loaded configuration data
   */
  data: ConfigData;
  
  /**
   * Source information
   */
  source: ConfigSource;
  
  /**
   * Loading metadata
   */
  metadata: ConfigLoadMetadata;
  
  /**
   * Validation result if validation was performed
   */
  validation?: ConfigValidationResult;
}

/**
 * Configuration loading metadata
 */
export interface ConfigLoadMetadata {
  /**
   * Loading timestamp
   */
  timestamp: string;
  
  /**
   * Loading duration in milliseconds
   */
  duration: number;
  
  /**
   * Source file size (for file sources)
   */
  sourceSize?: number;
  
  /**
   * Source last modified (for file sources)
   */
  sourceModified?: string;
  
  /**
   * Whether result was served from cache
   */
  fromCache?: boolean;
  
  /**
   * Number of retry attempts
   */
  retryAttempts?: number;
  
  /**
   * Transforms applied
   */
  transforms?: string[];
}

/**
 * Configuration merge result
 */
export interface ConfigMergeResult {
  /**
   * Merged configuration data
   */
  data: ConfigData;
  
  /**
   * Sources that were merged
   */
  sources: ConfigSource[];
  
  /**
   * Merge strategy used
   */
  strategy: 'shallow' | 'deep' | 'replace';
  
  /**
   * Merge conflicts (if any)
   */
  conflicts?: ConfigMergeConflict[];
  
  /**
   * Merge metadata
   */
  metadata: ConfigMergeMetadata;
}

/**
 * Configuration merge conflict
 */
export interface ConfigMergeConflict {
  /**
   * Configuration path where conflict occurred
   */
  path: string;
  
  /**
   * Conflicting values from different sources
   */
  values: Array<{
    source: ConfigSource;
    value: any;
  }>;
  
  /**
   * Resolution strategy used
   */
  resolution: 'priority' | 'manual' | 'default';
  
  /**
   * Final resolved value
   */
  resolvedValue: any;
}

/**
 * Configuration merge metadata
 */
export interface ConfigMergeMetadata {
  /**
   * Merge timestamp
   */
  timestamp: string;
  
  /**
   * Merge duration in milliseconds
   */
  duration: number;
  
  /**
   * Number of sources merged
   */
  sourceCount: number;
  
  /**
   * Number of conflicts encountered
   */
  conflictCount: number;
  
  /**
   * Merge statistics
   */
  statistics?: Record<string, any>;
}

/**
 * Config Loader Module Interface
 */
export interface IConfigLoaderModule {
  /**
   * Load configuration from a single source
   * @param source Configuration source
   * @param options Loading options
   * @returns Loading result
   */
  loadFromSource(
    source: ConfigSource,
    options?: ConfigLoadOptions
  ): Promise<ConfigLoadResult>;
  
  /**
   * Load configuration from a file
   * @param filePath Path to configuration file
   * @param options Loading options
   * @returns Loading result
   */
  loadFromFile(
    filePath: string,
    options?: ConfigLoadOptions
  ): Promise<ConfigLoadResult>;
  
  /**
   * Load configuration from environment variables
   * @param prefix Environment variable prefix
   * @param options Loading and resolution options
   * @returns Loading result
   */
  loadFromEnvironment(
    prefix?: string,
    options?: ConfigLoadOptions & EnvVarResolutionOptions
  ): Promise<ConfigLoadResult>;
  
  /**
   * Load configuration from a remote source
   * @param config Remote source configuration
   * @param options Loading options
   * @returns Loading result
   */
  loadFromRemote(
    config: RemoteSourceConfig,
    options?: ConfigLoadOptions
  ): Promise<ConfigLoadResult>;
  
  /**
   * Load configuration from a database
   * @param config Database source configuration
   * @param options Loading options
   * @returns Loading result
   */
  loadFromDatabase(
    config: DatabaseSourceConfig,
    options?: ConfigLoadOptions
  ): Promise<ConfigLoadResult>;
  
  /**
   * Load and merge configuration from multiple sources
   * @param sources Array of configuration sources
   * @param options Loading and merging options
   * @returns Merge result
   */
  loadAndMerge(
    sources: ConfigSource[],
    options?: ConfigLoadOptions & { mergeStrategy?: 'shallow' | 'deep' | 'replace' }
  ): Promise<ConfigMergeResult>;
  
  /**
   * Merge multiple configuration objects
   * @param configs Array of configuration data
   * @param strategy Merge strategy
   * @returns Merged configuration
   */
  mergeConfigurations(
    configs: ConfigData[],
    strategy?: 'shallow' | 'deep' | 'replace'
  ): ConfigData;
  
  /**
   * Resolve environment variable references in configuration
   * @param config Configuration data with env var references
   * @param options Resolution options
   * @returns Configuration with resolved values
   */
  resolveEnvironmentVariables(
    config: ConfigData,
    options?: EnvVarResolutionOptions
  ): ConfigData;
  
  /**
   * Parse configuration string in various formats
   * @param data Configuration data as string
   * @param format Data format
   * @returns Parsed configuration data
   */
  parseConfigurationString(
    data: string,
    format: 'json' | 'yaml' | 'yml' | 'toml' | 'ini' | 'env'
  ): ConfigData;
  
  /**
   * Validate configuration data
   * @param config Configuration data to validate
   * @param options Validation options
   * @returns Validation result
   */
  validateConfiguration(
    config: ConfigData,
    options?: ConfigValidationOptions
  ): Promise<ConfigValidationResult>;
  
  /**
   * Start watching configuration sources for changes
   * @param sources Sources to watch
   * @param callback Change callback function
   * @param options Watch configuration
   */
  startWatching(
    sources: ConfigSource[],
    callback: (result: ConfigLoadResult) => void,
    options?: FileWatchConfig
  ): void;
  
  /**
   * Stop watching configuration sources
   * @param sources Optional specific sources to stop watching
   */
  stopWatching(sources?: ConfigSource[]): void;
  
  /**
   * Check if a source is currently being watched
   * @param source Configuration source
   * @returns Whether source is being watched
   */
  isWatching(source: ConfigSource): boolean;
  
  /**
   * Get cached configuration if available
   * @param source Configuration source
   * @returns Cached configuration or null
   */
  getCachedConfiguration(source: ConfigSource): ConfigLoadResult | null;
  
  /**
   * Clear configuration cache
   * @param source Optional specific source to clear
   */
  clearCache(source?: ConfigSource): void;
  
  /**
   * Register a custom configuration transform
   * @param transform Transform function
   */
  registerTransform(transform: ConfigTransform): void;
  
  /**
   * Unregister a configuration transform
   * @param name Transform name
   */
  unregisterTransform(name: string): void;
  
  /**
   * Register a custom validator
   * @param validator Custom validator
   */
  registerValidator(validator: ConfigCustomValidator): void;
  
  /**
   * Unregister a custom validator
   * @param name Validator name
   */
  unregisterValidator(name: string): void;
  
  /**
   * Get loading statistics
   * @returns Loading statistics
   */
  getLoadingStatistics(): Record<string, any>;
  
  /**
   * Reset loading statistics
   */
  resetStatistics(): void;
}