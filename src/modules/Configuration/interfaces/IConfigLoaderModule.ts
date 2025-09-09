import { BaseModule } from '../../../core/BaseModule';
import { ConfigurationData } from './IConfigurationSystem';

/**
 * Interface for Configuration Loader Module
 */
export interface IConfigLoaderModule extends BaseModule {
  // File operations
  loadFromFile(filePath: string): Promise<ConfigurationData>;
  watchFile(filePath: string, callback: FileChangeCallback): void;
  stopWatching(filePath: string): void;
  
  // Environment variable processing
  interpolateEnvironmentVariables(config: any): Promise<any>;
  validateEnvironmentVariables(config: any): Promise<string[]>;
  
  // Multi-file support
  mergeConfigurations(configs: ConfigurationData[]): Promise<ConfigurationData>;
}

/**
 * File change callback
 */
export type FileChangeCallback = (event: FileChangeEvent) => void;

/**
 * File change event
 */
export interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted' | 'renamed';
  filePath: string;
  timestamp: number;
  previousPath?: string; // for rename events
}

/**
 * Configuration load options
 */
export interface ConfigLoadOptions {
  watchForChanges?: boolean;
  environmentOverrides?: Record<string, string>;
  validationLevel?: 'basic' | 'strict' | 'comprehensive';
  encoding?: BufferEncoding;
  timeout?: number;
}

/**
 * Environment variable interpolation options
 */
export interface EnvironmentInterpolationOptions {
  throwOnMissing?: boolean;
  defaultValues?: Record<string, string>;
  allowedVariables?: string[];
  sanitizeValues?: boolean;
}

/**
 * Configuration merge strategy
 */
export enum MergeStrategy {
  REPLACE = 'replace',       // Replace arrays and objects
  MERGE_DEEP = 'merge-deep', // Deep merge objects, concat arrays
  MERGE_SHALLOW = 'merge-shallow', // Shallow merge only
  CUSTOM = 'custom'          // Use custom merge function
}

/**
 * Configuration merge options
 */
export interface ConfigMergeOptions {
  strategy: MergeStrategy;
  customMerger?: (target: any, source: any, key: string) => any;
  arrayHandling?: 'replace' | 'concat' | 'merge';
  conflictResolution?: 'first-wins' | 'last-wins' | 'error';
}

/**
 * Configuration parsing result
 */
export interface ConfigParseResult {
  success: boolean;
  data?: any;
  errors: ParseError[];
  warnings: string[];
  metadata: ParseMetadata;
}

/**
 * Parse error
 */
export interface ParseError {
  line?: number;
  column?: number;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

/**
 * Parse metadata
 */
export interface ParseMetadata {
  parseTime: number;
  fileSize: number;
  encoding: BufferEncoding;
  environmentVariablesFound: string[];
  syntaxFeatures: string[]; // JSON5 features used
}