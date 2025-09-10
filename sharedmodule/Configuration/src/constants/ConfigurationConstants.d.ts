/**
 * Configuration Module Constants
 *
 * This file contains all constants used by the Configuration module.
 * Following RCC anti-hardcoding policy, all configuration values
 * are centralized here.
 */
/**
 * Configuration System Constants
 */
export declare const CONFIGURATION_SYSTEM_CONSTANTS: {
    readonly MODULE_TYPE: "configuration-system";
    readonly MODULE_VERSION: "1.0.0";
    readonly MODULE_NAME: "ConfigurationSystem";
    readonly MODULE_DESCRIPTION: "Central configuration management system";
    readonly DEFAULT_CONFIG_FILE: "config.json";
    readonly DEFAULT_CONFIG_DIRECTORY: "./config";
    readonly DEFAULT_BACKUP_DIRECTORY: "./config/backups";
    readonly DEFAULT_SCHEMA_FILE: "config-schema.json";
    readonly MAX_CONFIG_SIZE_MB: 10;
    readonly MAX_NESTING_DEPTH: 10;
    readonly MAX_ARRAY_LENGTH: 1000;
    readonly MAX_STRING_LENGTH: 10000;
    readonly DEFAULT_TIMEOUT_MS: 30000;
    readonly CONFIG_WATCH_DEBOUNCE_MS: 1000;
    readonly BACKUP_INTERVAL_MS: 3600000;
    readonly VALIDATION_TIMEOUT_MS: 5000;
    readonly DEFAULT_ENCRYPTION_ALGORITHM: "aes-256-gcm";
    readonly KEY_DERIVATION_ITERATIONS: 100000;
    readonly IV_LENGTH: 16;
    readonly TAG_LENGTH: 16;
    readonly MESSAGE_TYPES: {
        readonly CONFIG_LOADED: "config:loaded";
        readonly CONFIG_SAVED: "config:saved";
        readonly CONFIG_VALIDATED: "config:validated";
        readonly CONFIG_CHANGED: "config:changed";
        readonly CONFIG_ERROR: "config:error";
        readonly VALIDATION_FAILED: "config:validation-failed";
        readonly BACKUP_CREATED: "config:backup-created";
        readonly ENCRYPTION_ENABLED: "config:encryption-enabled";
    };
    readonly ERROR_CODES: {
        readonly INVALID_CONFIG_FORMAT: "CFG_E001";
        readonly VALIDATION_FAILED: "CFG_E002";
        readonly FILE_NOT_FOUND: "CFG_E003";
        readonly PERMISSION_DENIED: "CFG_E004";
        readonly ENCRYPTION_FAILED: "CFG_E005";
        readonly DECRYPTION_FAILED: "CFG_E006";
        readonly BACKUP_FAILED: "CFG_E007";
        readonly SCHEMA_INVALID: "CFG_E008";
        readonly SIZE_LIMIT_EXCEEDED: "CFG_E009";
        readonly TIMEOUT_EXCEEDED: "CFG_E010";
        readonly INITIALIZATION_FAILED: "CFG_E011";
        readonly CONFIG_NOT_LOADED: "CFG_E012";
        readonly CONFIG_UPDATE_FAILED: "CFG_E013";
        readonly WATCH_SETUP_FAILED: "CFG_E014";
        readonly UNSUPPORTED_FORMAT: "CFG_E015";
        readonly EXPORT_FAILED: "CFG_E016";
        readonly IMPORT_FAILED: "CFG_E017";
        readonly DESTRUCTION_FAILED: "CFG_E018";
    };
};
/**
 * Config Loader Module Constants
 */
export declare const CONFIG_LOADER_CONSTANTS: {
    readonly MODULE_TYPE: "config-loader";
    readonly MODULE_NAME: "ConfigLoaderModule";
    readonly MODULE_DESCRIPTION: "Loads configuration from various sources";
    readonly SUPPORTED_FORMATS: readonly ["json", "yaml", "yml", "toml", "ini", "env"];
    readonly SOURCE_TYPES: {
        readonly FILE: "file";
        readonly ENVIRONMENT: "environment";
        readonly REMOTE: "remote";
        readonly DATABASE: "database";
        readonly MEMORY: "memory";
    };
    readonly DEFAULT_ENCODING: "utf8";
    readonly DEFAULT_ENV_PREFIX: "APP_";
    readonly DEFAULT_MERGE_STRATEGY: "deep";
    readonly HTTP_TIMEOUT_MS: 15000;
    readonly HTTP_RETRY_COUNT: 3;
    readonly HTTP_RETRY_DELAY_MS: 1000;
    readonly CACHE_TTL_MS: 300000;
    readonly MAX_CACHE_SIZE: 50;
    readonly WATCH_DEBOUNCE_MS: 500;
    readonly WATCH_PERSISTENCE_MS: 1000;
};
/**
 * Config UI Module Constants
 */
export declare const CONFIG_UI_CONSTANTS: {
    readonly MODULE_TYPE: "config-ui";
    readonly MODULE_NAME: "ConfigUIModule";
    readonly MODULE_DESCRIPTION: "Provides user interface for configuration management";
    readonly COMPONENT_TYPES: {
        readonly EDITOR: "editor";
        readonly VIEWER: "viewer";
        readonly WIZARD: "wizard";
        readonly VALIDATOR: "validator";
        readonly DIFF: "diff";
    };
    readonly EDITOR_THEMES: readonly ["light", "dark", "auto"];
    readonly EDITOR_LANGUAGES: readonly ["json", "yaml", "toml"];
    readonly DEFAULT_EDITOR_THEME: "auto";
    readonly DEFAULT_EDITOR_LANGUAGE: "json";
    readonly DEFAULT_SIDEBAR_WIDTH: 300;
    readonly DEFAULT_PANEL_HEIGHT: 400;
    readonly MIN_EDITOR_WIDTH: 400;
    readonly MIN_EDITOR_HEIGHT: 200;
    readonly AUTO_SAVE_DELAY_MS: 2000;
    readonly AUTO_BACKUP_INTERVAL_MS: 60000;
    readonly UI_MESSAGES: {
        readonly LOADING: "Loading configuration...";
        readonly SAVING: "Saving configuration...";
        readonly VALIDATING: "Validating configuration...";
        readonly SAVED: "Configuration saved successfully";
        readonly VALIDATION_ERROR: "Configuration validation failed";
        readonly LOAD_ERROR: "Failed to load configuration";
        readonly SAVE_ERROR: "Failed to save configuration";
    };
};
/**
 * Config Persistence Module Constants
 */
export declare const CONFIG_PERSISTENCE_CONSTANTS: {
    readonly MODULE_TYPE: "config-persistence";
    readonly MODULE_NAME: "ConfigPersistenceModule";
    readonly MODULE_DESCRIPTION: "Manages configuration data persistence";
    readonly STORAGE_TYPES: {
        readonly FILE_SYSTEM: "filesystem";
        readonly DATABASE: "database";
        readonly MEMORY: "memory";
        readonly CLOUD: "cloud";
        readonly ENCRYPTED: "encrypted";
    };
    readonly FILE_PERMISSIONS: 384;
    readonly BACKUP_SUFFIX: ".backup";
    readonly TEMP_SUFFIX: ".tmp";
    readonly LOCK_SUFFIX: ".lock";
    readonly MAX_BACKUP_COUNT: 10;
    readonly BACKUP_COMPRESSION: true;
    readonly BACKUP_NAMING_PATTERN: "YYYY-MM-DD_HH-mm-ss";
    readonly CONNECTION_POOL_SIZE: 5;
    readonly QUERY_TIMEOUT_MS: 10000;
    readonly TRANSACTION_TIMEOUT_MS: 30000;
    readonly CLOUD_TIMEOUT_MS: 30000;
    readonly CLOUD_RETRY_COUNT: 3;
    readonly CLOUD_CHUNK_SIZE: number;
    readonly LOCK_TIMEOUT_MS: 5000;
    readonly LOCK_RETRY_INTERVAL_MS: 100;
    readonly LOCK_MAX_RETRIES: 50;
};
/**
 * Config Validator Module Constants
 */
export declare const CONFIG_VALIDATOR_CONSTANTS: {
    readonly MODULE_TYPE: "config-validator";
    readonly MODULE_NAME: "ConfigValidatorModule";
    readonly MODULE_DESCRIPTION: "Validates configuration data integrity";
    readonly VALIDATION_TYPES: {
        readonly SCHEMA: "schema";
        readonly BUSINESS_RULES: "business-rules";
        readonly DEPENDENCIES: "dependencies";
        readonly SECURITY: "security";
        readonly PERFORMANCE: "performance";
    };
    readonly SCHEMA_FORMATS: readonly ["json-schema", "ajv", "joi", "yup"];
    readonly DEFAULT_SCHEMA_FORMAT: "json-schema";
    readonly VALIDATION_LEVELS: {
        readonly STRICT: "strict";
        readonly NORMAL: "normal";
        readonly LOOSE: "loose";
    };
    readonly SECURITY_PATTERNS: {
        readonly SQL_INJECTION: RegExp;
        readonly XSS_PATTERN: RegExp;
        readonly PATH_TRAVERSAL: RegExp;
        readonly COMMAND_INJECTION: RegExp;
    };
    readonly MAX_VALIDATION_TIME_MS: 5000;
    readonly MAX_RECURSIVE_DEPTH: 20;
    readonly MAX_PROPERTY_COUNT: 10000;
    readonly DEFAULT_RULES: {
        readonly REQUIRED_FIELDS: readonly ["name", "version"];
        readonly FORBIDDEN_FIELDS: readonly ["__proto__", "constructor", "prototype"];
        readonly MAX_OBJECT_DEPTH: 10;
        readonly MAX_ARRAY_SIZE: 1000;
    };
};
/**
 * Common Configuration Constants
 */
export declare const COMMON_CONSTANTS: {
    readonly LOG_LEVELS: {
        readonly TRACE: "trace";
        readonly DEBUG: "debug";
        readonly INFO: "info";
        readonly WARN: "warn";
        readonly ERROR: "error";
    };
    readonly EVENT_TYPES: {
        readonly MODULE_INITIALIZED: "module:initialized";
        readonly MODULE_CONFIGURED: "module:configured";
        readonly MODULE_DESTROYED: "module:destroyed";
        readonly CONNECTION_ESTABLISHED: "connection:established";
        readonly CONNECTION_CLOSED: "connection:closed";
        readonly DATA_RECEIVED: "data:received";
        readonly DATA_SENT: "data:sent";
        readonly ERROR_OCCURRED: "error:occurred";
    };
    readonly STATUS_CODES: {
        readonly SUCCESS: 200;
        readonly CREATED: 201;
        readonly ACCEPTED: 202;
        readonly NO_CONTENT: 204;
        readonly BAD_REQUEST: 400;
        readonly UNAUTHORIZED: 401;
        readonly FORBIDDEN: 403;
        readonly NOT_FOUND: 404;
        readonly CONFLICT: 409;
        readonly INTERNAL_ERROR: 500;
        readonly NOT_IMPLEMENTED: 501;
        readonly SERVICE_UNAVAILABLE: 503;
    };
    readonly DEFAULT_TIMEOUT: 30000;
    readonly DEFAULT_RETRY_COUNT: 3;
    readonly DEFAULT_BATCH_SIZE: 100;
    readonly DEFAULT_BUFFER_SIZE: 8192;
};
/**
 * Type definitions for constants
 */
export type ConfigurationSystemConstants = typeof CONFIGURATION_SYSTEM_CONSTANTS;
export type ConfigLoaderConstants = typeof CONFIG_LOADER_CONSTANTS;
export type ConfigUIConstants = typeof CONFIG_UI_CONSTANTS;
export type ConfigPersistenceConstants = typeof CONFIG_PERSISTENCE_CONSTANTS;
export type ConfigValidatorConstants = typeof CONFIG_VALIDATOR_CONSTANTS;
export type CommonConstants = typeof COMMON_CONSTANTS;
