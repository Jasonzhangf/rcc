/**
 * Configuration Module Types
 * 
 * Additional utility types for the Configuration module.
 * Core interfaces are exported directly from their respective files.
 */

/**
 * Configuration module types enum
 */
export enum ConfigModuleType {
  SYSTEM = 'configuration-system',
  LOADER = 'config-loader',
  UI = 'config-ui',
  PERSISTENCE = 'config-persistence',
  VALIDATOR = 'config-validator'
}

/**
 * Configuration data format types
 */
export enum ConfigFormat {
  JSON = 'json',
  YAML = 'yaml',
  YML = 'yml',
  TOML = 'toml',
  INI = 'ini',
  ENV = 'env'
}

/**
 * Storage backend types enum
 */
export enum StorageBackend {
  FILESYSTEM = 'filesystem',
  DATABASE = 'database',
  MEMORY = 'memory',
  CLOUD = 'cloud',
  ENCRYPTED = 'encrypted'
}

/**
 * Validation types enum
 */
export enum ValidationType {
  SCHEMA = 'schema',
  BUSINESS_RULES = 'business-rules',
  DEPENDENCIES = 'dependencies',
  SECURITY = 'security',
  PERFORMANCE = 'performance'
}

/**
 * Configuration value types
 */
export enum ConfigValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  NULL = 'null'
}

/**
 * UI component types enum
 */
export enum UIComponentType {
  EDITOR = 'editor',
  VIEWER = 'viewer',
  WIZARD = 'wizard',
  VALIDATOR = 'validator',
  DIFF = 'diff'
}

/**
 * Merge strategy types
 */
export enum MergeStrategy {
  SHALLOW = 'shallow',
  DEEP = 'deep',
  REPLACE = 'replace'
}

/**
 * Utility type for deep partial configuration
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Utility type for configuration paths
 */
export type ConfigPath = string;

/**
 * Utility type for configuration keys
 */
export type ConfigKey = string | number | symbol;

/**
 * Utility type for configuration values
 */
export type ConfigValue = any;

/**
 * Utility type for async result with error handling
 */
export type AsyncResult<T, E = Error> = Promise<{
  success: boolean;
  data?: T;
  error?: E;
}>;

/**
 * Utility type for operation status
 */
export interface OperationStatus {
  /**
   * Whether operation is in progress
   */
  inProgress: boolean;
  
  /**
   * Operation progress percentage (0-100)
   */
  progress: number;
  
  /**
   * Current operation message
   */
  message?: string;
  
  /**
   * Operation start time
   */
  startTime: number;
  
  /**
   * Estimated completion time
   */
  estimatedCompletion?: number;
}

/**
 * Utility type for event callbacks
 */
export type EventCallback<T = any> = (data: T) => void | Promise<void>;

/**
 * Utility type for disposable resources
 */
export interface Disposable {
  dispose(): void | Promise<void>;
}

/**
 * Utility type for observable pattern
 */
export interface Observable<T> {
  subscribe(observer: EventCallback<T>): Disposable;
  unsubscribe(observer: EventCallback<T>): void;
}

/**
 * Utility type for configuration module lifecycle
 */
export interface ModuleLifecycle {
  /**
   * Initialize the module
   */
  initialize(): Promise<void>;
  
  /**
   * Configure the module
   */
  configure(config: Record<string, any>): Promise<void>;
  
  /**
   * Start the module
   */
  start(): Promise<void>;
  
  /**
   * Stop the module
   */
  stop(): Promise<void>;
  
  /**
   * Destroy the module and cleanup resources
   */
  destroy(): Promise<void>;
}

/**
 * Utility type for health check
 */
export interface HealthCheck {
  /**
   * Check health status
   */
  checkHealth(): Promise<{
    healthy: boolean;
    message?: string;
    details?: Record<string, any>;
  }>;
}

/**
 * Utility type for metrics collection
 */
export interface MetricsCollector {
  /**
   * Collect metrics
   */
  collectMetrics(): Promise<Record<string, any>>;
  
  /**
   * Reset metrics
   */
  resetMetrics(): Promise<void>;
}

/**
 * Configuration module factory function type
 */
export type ConfigModuleFactory<T> = (config?: Record<string, any>) => Promise<T>;

/**
 * Configuration transformer function type
 */
export type ConfigTransformer<T = any> = (input: T) => T | Promise<T>;

/**
 * Configuration validator function type
 */
export type ConfigValidator<T = any> = (input: T) => boolean | string | Promise<boolean | string>;

/**
 * Configuration serializer function type
 */
export type ConfigSerializer<T = any> = {
  serialize: (data: T) => string | Promise<string>;
  deserialize: (data: string) => T | Promise<T>;
};

/**
 * Error types for configuration operations
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ConfigValidationError extends ConfigurationError {
  constructor(
    message: string,
    public path: string,
    public expected?: any,
    public actual?: any
  ) {
    super(message, 'VALIDATION_ERROR', { path, expected, actual });
    this.name = 'ConfigValidationError';
  }
}

export class PersistenceError extends ConfigurationError {
  constructor(
    message: string,
    public operation: string,
    public target?: string
  ) {
    super(message, 'PERSISTENCE_ERROR', { operation, target });
    this.name = 'PersistenceError';
  }
}

export class LoadError extends ConfigurationError {
  constructor(
    message: string,
    public source: string,
    public format?: string
  ) {
    super(message, 'LOAD_ERROR', { source, format });
    this.name = 'LoadError';
  }
}

export class SecurityError extends ConfigurationError {
  constructor(
    message: string,
    public securityIssue: string,
    public severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super(message, 'SECURITY_ERROR', { securityIssue, severity });
    this.name = 'SecurityError';
  }
}

/**
 * Type guards for configuration objects
 */
export const TypeGuards = {
  /**
   * Check if value is a valid configuration data object
   */
  isConfigData(value: any): value is import('../interfaces/IConfigurationSystem').ConfigData {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof value.metadata === 'object' &&
      typeof value.settings === 'object' &&
      typeof value.version === 'string'
    );
  },

  /**
   * Check if value is a valid configuration schema
   */
  isConfigSchema(value: any): value is import('../interfaces/IConfigurationSystem').ConfigSchema {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof value.version === 'string' &&
      typeof value.type === 'string' &&
      typeof value.definition === 'object'
    );
  },

  /**
   * Check if value is a valid configuration source
   */
  isConfigSource(value: any): value is import('../interfaces/IConfigurationSystem').ConfigSource {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof value.type === 'string' &&
      ['file', 'environment', 'remote', 'database', 'memory'].includes(value.type)
    );
  },

  /**
   * Check if value is a validation result
   */
  isValidationResult(value: any): value is import('../interfaces/IConfigurationSystem').ConfigValidationResult {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof value.isValid === 'boolean' &&
      Array.isArray(value.errors) &&
      Array.isArray(value.warnings)
    );
  }
};

/**
 * Utility functions for configuration operations
 */
export const ConfigUtils = {
  /**
   * Generate a unique identifier
   */
  generateId(): string {
    return `cfg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  },

  /**
   * Deep clone a configuration object
   */
  deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    
    return cloned;
  },

  /**
   * Get nested value from configuration using dot notation
   */
  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  },

  /**
   * Set nested value in configuration using dot notation
   */
  setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  },

  /**
   * Compare two configuration objects for equality
   */
  isEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return obj1 === obj2;
    
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 !== 'object') return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.isEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  },

  /**
   * Flatten nested configuration object
   */
  flatten(obj: any, prefix = '', separator = '.'): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newKey = prefix ? `${prefix}${separator}${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(result, this.flatten(obj[key], newKey, separator));
        } else {
          result[newKey] = obj[key];
        }
      }
    }
    
    return result;
  },

  /**
   * Unflatten flattened configuration object
   */
  unflatten(obj: Record<string, any>, separator = '.'): any {
    const result: any = {};
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        this.setNestedValue(result, key.split(separator).join('.'), obj[key]);
      }
    }
    
    return result;
  }
};