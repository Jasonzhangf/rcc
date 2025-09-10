/**
 * Configuration Module Types
 *
 * Additional utility types for the Configuration module.
 * Core interfaces are exported directly from their respective files.
 */
/**
 * Configuration module types enum
 */
export declare enum ConfigModuleType {
    SYSTEM = "configuration-system",
    LOADER = "config-loader",
    UI = "config-ui",
    PERSISTENCE = "config-persistence",
    VALIDATOR = "config-validator"
}
/**
 * Configuration data format types
 */
export declare enum ConfigFormat {
    JSON = "json",
    YAML = "yaml",
    YML = "yml",
    TOML = "toml",
    INI = "ini",
    ENV = "env"
}
/**
 * Storage backend types enum
 */
export declare enum StorageBackend {
    FILESYSTEM = "filesystem",
    DATABASE = "database",
    MEMORY = "memory",
    CLOUD = "cloud",
    ENCRYPTED = "encrypted"
}
/**
 * Validation types enum
 */
export declare enum ValidationType {
    SCHEMA = "schema",
    BUSINESS_RULES = "business-rules",
    DEPENDENCIES = "dependencies",
    SECURITY = "security",
    PERFORMANCE = "performance"
}
/**
 * Configuration value types
 */
export declare enum ConfigValueType {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    OBJECT = "object",
    ARRAY = "array",
    NULL = "null"
}
/**
 * UI component types enum
 */
export declare enum UIComponentType {
    EDITOR = "editor",
    VIEWER = "viewer",
    WIZARD = "wizard",
    VALIDATOR = "validator",
    DIFF = "diff"
}
/**
 * Merge strategy types
 */
export declare enum MergeStrategy {
    SHALLOW = "shallow",
    DEEP = "deep",
    REPLACE = "replace"
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
export declare class ConfigurationError extends Error {
    code: string;
    details?: Record<string, any> | undefined;
    constructor(message: string, code: string, details?: Record<string, any> | undefined);
}
export declare class ConfigValidationError extends ConfigurationError {
    path: string;
    expected?: any | undefined;
    actual?: any | undefined;
    constructor(message: string, path: string, expected?: any | undefined, actual?: any | undefined);
}
export declare class PersistenceError extends ConfigurationError {
    operation: string;
    target?: string | undefined;
    constructor(message: string, operation: string, target?: string | undefined);
}
export declare class LoadError extends ConfigurationError {
    source: string;
    format?: string | undefined;
    constructor(message: string, source: string, format?: string | undefined);
}
export declare class SecurityError extends ConfigurationError {
    securityIssue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    constructor(message: string, securityIssue: string, severity?: 'low' | 'medium' | 'high' | 'critical');
}
/**
 * Type guards for configuration objects
 */
export declare const TypeGuards: {
    /**
     * Check if value is a valid configuration data object
     */
    isConfigData(value: any): value is import("../interfaces/IConfigurationSystem").ConfigData;
    /**
     * Check if value is a valid configuration schema
     */
    isConfigSchema(value: any): value is import("../interfaces/IConfigurationSystem").ConfigSchema;
    /**
     * Check if value is a valid configuration source
     */
    isConfigSource(value: any): value is import("../interfaces/IConfigurationSystem").ConfigSource;
    /**
     * Check if value is a validation result
     */
    isValidationResult(value: any): value is import("../interfaces/IConfigurationSystem").ConfigValidationResult;
};
/**
 * Utility functions for configuration operations
 */
export declare const ConfigUtils: {
    /**
     * Generate a unique identifier
     */
    generateId(): string;
    /**
     * Deep clone a configuration object
     */
    deepClone<T>(obj: T): T;
    /**
     * Get nested value from configuration using dot notation
     */
    getNestedValue(obj: any, path: string): any;
    /**
     * Set nested value in configuration using dot notation
     */
    setNestedValue(obj: any, path: string, value: any): void;
    /**
     * Compare two configuration objects for equality
     */
    isEqual(obj1: any, obj2: any): boolean;
    /**
     * Flatten nested configuration object
     */
    flatten(obj: any, prefix?: string, separator?: string): Record<string, any>;
    /**
     * Unflatten flattened configuration object
     */
    unflatten(obj: Record<string, any>, separator?: string): any;
};
