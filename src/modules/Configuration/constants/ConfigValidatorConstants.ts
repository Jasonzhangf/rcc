/**
 * Config Validator Module Constants
 * All hardcoded values for the Configuration Validator Module
 * Following RCC governance anti-hardcoding policy
 */

import { ValidationLevel, SchemaPropertyType, StringFormat } from '../interfaces/IConfigValidatorModule';

export const CONFIG_VALIDATOR_CONSTANTS = {
  // Module Information
  MODULE_NAME: 'Configuration Validator Module',
  MODULE_VERSION: '1.0.0',
  MODULE_DESCRIPTION: 'BaseModule-based configuration validation with multi-layer validation, schema management, and custom validators',
  MODULE_TYPE: 'config-validator',
  
  // Validation Levels
  VALIDATION_LEVELS: {
    BASIC: ValidationLevel.BASIC,
    STANDARD: ValidationLevel.STANDARD,
    STRICT: ValidationLevel.STRICT,
    COMPREHENSIVE: ValidationLevel.COMPREHENSIVE
  } as const,
  
  // Default Validation Settings
  DEFAULT_VALIDATION_OPTIONS: {
    level: ValidationLevel.STANDARD,
    stopOnFirstError: false,
    validateDefaults: true,
    strictMode: false,
    customContext: {}
  },
  
  // Performance Limits and Timeouts
  PERFORMANCE_LIMITS: {
    MAX_VALIDATION_TIME_MS: 30000,
    MAX_SCHEMA_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
    MAX_CONFIG_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
    MAX_RECURSION_DEPTH: 100,
    MAX_VALIDATION_ERRORS: 1000,
    MAX_CUSTOM_VALIDATORS: 500,
    MAX_REGISTERED_SCHEMAS: 1000,
    VALIDATION_TIMEOUT_WARNING_MS: 5000,
    MEMORY_USAGE_WARNING_BYTES: 100 * 1024 * 1024 // 100MB
  },
  
  // Validation Rule Types
  VALIDATION_RULE_TYPES: {
    REQUIRED: 'required',
    STRING: 'string',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    OBJECT: 'object',
    ARRAY: 'array',
    NULL: 'null',
    ANY: 'any',
    CUSTOM: 'custom'
  } as const,
  
  // Schema Property Types
  SCHEMA_PROPERTY_TYPES: {
    STRING: SchemaPropertyType.STRING,
    NUMBER: SchemaPropertyType.NUMBER,
    BOOLEAN: SchemaPropertyType.BOOLEAN,
    OBJECT: SchemaPropertyType.OBJECT,
    ARRAY: SchemaPropertyType.ARRAY,
    NULL: SchemaPropertyType.NULL,
    ANY: SchemaPropertyType.ANY
  } as const,
  
  // String Format Types
  STRING_FORMATS: {
    EMAIL: StringFormat.EMAIL,
    URI: StringFormat.URI,
    DATE: StringFormat.DATE,
    TIME: StringFormat.TIME,
    DATETIME: StringFormat.DATETIME,
    UUID: StringFormat.UUID,
    JSON: StringFormat.JSON,
    REGEX: StringFormat.REGEX
  } as const,
  
  // Validation Layer Types
  VALIDATION_LAYERS: {
    SYNTAX: 'syntax',           // JSON/YAML parsing validation
    SCHEMA: 'schema',           // Schema structure validation
    SEMANTIC: 'semantic',       // Business logic validation
    INTEGRATION: 'integration'  // Cross-field dependency validation
  } as const,
  
  // Built-in Validation Rules
  BUILTIN_VALIDATION_RULES: {
    // String validations
    MIN_LENGTH: {
      name: 'minLength',
      type: 'string',
      validator: (value: string, params: { min: number }) => value.length >= params.min,
      message: (params: { min: number }) => `Must be at least ${params.min} characters long`
    },
    MAX_LENGTH: {
      name: 'maxLength',
      type: 'string',
      validator: (value: string, params: { max: number }) => value.length <= params.max,
      message: (params: { max: number }) => `Must be no more than ${params.max} characters long`
    },
    PATTERN: {
      name: 'pattern',
      type: 'string',
      validator: (value: string, params: { pattern: RegExp }) => params.pattern.test(value),
      message: (params: { pattern: RegExp }) => `Must match pattern: ${params.pattern}`
    },
    
    // Number validations
    MIN_VALUE: {
      name: 'minimum',
      type: 'number',
      validator: (value: number, params: { min: number }) => value >= params.min,
      message: (params: { min: number }) => `Must be at least ${params.min}`
    },
    MAX_VALUE: {
      name: 'maximum',
      type: 'number',
      validator: (value: number, params: { max: number }) => value <= params.max,
      message: (params: { max: number }) => `Must be no more than ${params.max}`
    },
    MULTIPLE_OF: {
      name: 'multipleOf',
      type: 'number',
      validator: (value: number, params: { multipleOf: number }) => value % params.multipleOf === 0,
      message: (params: { multipleOf: number }) => `Must be a multiple of ${params.multipleOf}`
    },
    
    // Array validations
    MIN_ITEMS: {
      name: 'minItems',
      type: 'array',
      validator: (value: any[], params: { min: number }) => value.length >= params.min,
      message: (params: { min: number }) => `Must have at least ${params.min} items`
    },
    MAX_ITEMS: {
      name: 'maxItems',
      type: 'array',
      validator: (value: any[], params: { max: number }) => value.length <= params.max,
      message: (params: { max: number }) => `Must have no more than ${params.max} items`
    },
    UNIQUE_ITEMS: {
      name: 'uniqueItems',
      type: 'array',
      validator: (value: any[]) => new Set(value).size === value.length,
      message: () => 'All items must be unique'
    },
    
    // Object validations
    MIN_PROPERTIES: {
      name: 'minProperties',
      type: 'object',
      validator: (value: object, params: { min: number }) => Object.keys(value).length >= params.min,
      message: (params: { min: number }) => `Must have at least ${params.min} properties`
    },
    MAX_PROPERTIES: {
      name: 'maxProperties',
      type: 'object',
      validator: (value: object, params: { max: number }) => Object.keys(value).length <= params.max,
      message: (params: { max: number }) => `Must have no more than ${params.max} properties`
    }
  } as const,
  
  // Format Validation Patterns
  FORMAT_PATTERNS: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URI: /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    DATE: /^\d{4}-\d{2}-\d{2}$/,
    TIME: /^\d{2}:\d{2}:\d{2}(?:\.\d{3})?$/,
    DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/,
    JSON: /^[\s]*[{\[].*[}\]][\s]*$/
  } as const,
  
  // Error Categories
  ERROR_CATEGORIES: {
    SYNTAX_ERROR: 'syntax-error',
    SCHEMA_ERROR: 'schema-error',
    VALIDATION_ERROR: 'validation-error',
    TYPE_ERROR: 'type-error',
    CONSTRAINT_ERROR: 'constraint-error',
    DEPENDENCY_ERROR: 'dependency-error',
    CUSTOM_ERROR: 'custom-error',
    PERFORMANCE_ERROR: 'performance-error'
  } as const,
  
  // Error Messages
  ERROR_MESSAGES: {
    // General validation errors
    VALIDATION_FAILED: 'Configuration validation failed',
    INVALID_INPUT: 'Invalid input provided for validation',
    INVALID_SCHEMA: 'Invalid schema definition',
    SCHEMA_NOT_FOUND: 'Schema not found',
    CUSTOM_VALIDATOR_NOT_FOUND: 'Custom validator not found',
    VALIDATION_TIMEOUT: 'Validation operation timed out',
    
    // Type validation errors
    TYPE_MISMATCH: (expected: string, actual: string) => `Expected ${expected}, got ${actual}`,
    REQUIRED_FIELD_MISSING: (field: string) => `Required field '${field}' is missing`,
    INVALID_TYPE: (field: string, expected: string) => `Field '${field}' must be of type ${expected}`,
    
    // Schema validation errors
    SCHEMA_REGISTRATION_FAILED: 'Failed to register schema',
    INVALID_SCHEMA_STRUCTURE: 'Invalid schema structure',
    CIRCULAR_REFERENCE: 'Circular reference detected in schema',
    DEPENDENCY_NOT_MET: (field: string, dependency: string) => `Field '${field}' requires '${dependency}'`,
    
    // Performance errors
    VALIDATION_TOO_SLOW: 'Validation operation exceeded time limit',
    MEMORY_LIMIT_EXCEEDED: 'Validation operation exceeded memory limit',
    RECURSION_LIMIT_EXCEEDED: 'Maximum recursion depth exceeded',
    TOO_MANY_ERRORS: 'Maximum number of validation errors exceeded',
    
    // Custom validator errors
    CUSTOM_VALIDATOR_ERROR: (name: string, error: string) => `Custom validator '${name}' failed: ${error}`,
    VALIDATOR_REGISTRATION_FAILED: 'Failed to register custom validator',
    INVALID_VALIDATOR_FUNCTION: 'Invalid validator function provided'
  } as const,
  
  // Success Messages
  SUCCESS_MESSAGES: {
    VALIDATION_PASSED: 'Configuration validation passed successfully',
    SCHEMA_REGISTERED: 'Schema registered successfully',
    VALIDATOR_REGISTERED: 'Custom validator registered successfully',
    SECTION_VALIDATED: 'Configuration section validated successfully',
    FIELD_VALIDATED: 'Configuration field validated successfully'
  } as const,
  
  // Cache Settings
  CACHE_SETTINGS: {
    SCHEMA_CACHE_TTL_MS: 3600000, // 1 hour
    VALIDATION_CACHE_TTL_MS: 300000, // 5 minutes
    CUSTOM_VALIDATOR_CACHE_TTL_MS: 1800000, // 30 minutes
    MAX_CACHED_SCHEMAS: 100,
    MAX_CACHED_VALIDATIONS: 500,
    MAX_CACHED_VALIDATORS: 200,
    CACHE_CLEANUP_INTERVAL_MS: 600000 // 10 minutes
  },
  
  // Monitoring and Metrics
  MONITORING: {
    PERFORMANCE_SAMPLE_RATE: 0.1, // 10% of validations
    ERROR_TRACKING_ENABLED: true,
    METRICS_COLLECTION_ENABLED: true,
    VALIDATION_AUDIT_TRAIL: false, // Disabled by default for performance
    DETAILED_ERROR_LOGGING: true
  },
  
  // Connection Types
  CONNECTION_TYPES: {
    CONFIG_INPUT: 'config-input',
    VALIDATION_RESULT_OUTPUT: 'validation-result-output',
    ERROR_OUTPUT: 'error-output',
    PERFORMANCE_OUTPUT: 'performance-output',
    SCHEMA_MANAGEMENT_INPUT: 'schema-management-input'
  } as const,
  
  // Data Transfer Types
  DATA_TRANSFER_TYPES: {
    VALIDATION_REQUEST: 'validation-request',
    VALIDATION_RESULT: 'validation-result',
    SCHEMA_REGISTRATION: 'schema-registration',
    VALIDATOR_REGISTRATION: 'validator-registration',
    PERFORMANCE_METRICS: 'performance-metrics',
    ERROR_REPORT: 'error-report'
  } as const,
  
  // Validation Rule Sets
  VALIDATION_RULE_SETS: {
    BASIC_CONFIG: {
      name: 'basic-config',
      description: 'Basic configuration validation rules',
      priority: 1,
      rules: ['required', 'type-check']
    },
    PRODUCTION_CONFIG: {
      name: 'production-config',
      description: 'Production-ready configuration validation rules',
      priority: 2,
      rules: ['required', 'type-check', 'format-validation', 'constraint-validation']
    },
    SECURITY_CONFIG: {
      name: 'security-config',
      description: 'Security-focused configuration validation rules',
      priority: 3,
      rules: ['required', 'type-check', 'format-validation', 'constraint-validation', 'security-validation']
    },
    COMPREHENSIVE_CONFIG: {
      name: 'comprehensive-config',
      description: 'Comprehensive configuration validation with all checks',
      priority: 4,
      rules: ['required', 'type-check', 'format-validation', 'constraint-validation', 'security-validation', 'business-logic-validation', 'cross-field-validation']
    }
  } as const,
  
  // Default Schema Templates
  DEFAULT_SCHEMAS: {
    BASIC_CONFIG_SCHEMA: {
      name: 'basic-config',
      version: '1.0.0',
      description: 'Basic configuration schema template'
    },
    WEB_SERVICE_CONFIG_SCHEMA: {
      name: 'web-service-config',
      version: '1.0.0',
      description: 'Web service configuration schema template'
    },
    DATABASE_CONFIG_SCHEMA: {
      name: 'database-config',
      version: '1.0.0',
      description: 'Database configuration schema template'
    }
  } as const,
  
  // Validation Context Keys
  CONTEXT_KEYS: {
    FIELD_PATH: 'fieldPath',
    PARENT_OBJECT: 'parentObject',
    ROOT_CONFIG: 'rootConfig',
    VALIDATION_LEVEL: 'validationLevel',
    CUSTOM_CONTEXT: 'customContext',
    SCHEMA_NAME: 'schemaName',
    VALIDATION_TIMESTAMP: 'validationTimestamp'
  } as const,
  
  // Performance Thresholds
  PERFORMANCE_THRESHOLDS: {
    FAST_VALIDATION_MS: 100,
    ACCEPTABLE_VALIDATION_MS: 1000,
    SLOW_VALIDATION_MS: 5000,
    MEMORY_WARNING_THRESHOLD_MB: 50,
    MEMORY_ERROR_THRESHOLD_MB: 100,
    CPU_WARNING_THRESHOLD_MS: 1000,
    CPU_ERROR_THRESHOLD_MS: 5000
  } as const,
  
  // Regular Expression Patterns
  REGEX_PATTERNS: {
    FIELD_NAME: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    SCHEMA_NAME: /^[a-zA-Z0-9_-]+$/,
    VALIDATOR_NAME: /^[a-zA-Z0-9_-]+$/,
    VERSION_STRING: /^\d+\.\d+\.\d+$/,
    PATH_SEPARATOR: /[./]/
  } as const
} as const;

// Type definitions for constants
export type ValidationLevel = typeof CONFIG_VALIDATOR_CONSTANTS.VALIDATION_LEVELS[keyof typeof CONFIG_VALIDATOR_CONSTANTS.VALIDATION_LEVELS];
export type ValidationRuleType = typeof CONFIG_VALIDATOR_CONSTANTS.VALIDATION_RULE_TYPES[keyof typeof CONFIG_VALIDATOR_CONSTANTS.VALIDATION_RULE_TYPES];
export type SchemaPropertyType = typeof CONFIG_VALIDATOR_CONSTANTS.SCHEMA_PROPERTY_TYPES[keyof typeof CONFIG_VALIDATOR_CONSTANTS.SCHEMA_PROPERTY_TYPES];
export type ValidationLayer = typeof CONFIG_VALIDATOR_CONSTANTS.VALIDATION_LAYERS[keyof typeof CONFIG_VALIDATOR_CONSTANTS.VALIDATION_LAYERS];
export type ErrorCategory = typeof CONFIG_VALIDATOR_CONSTANTS.ERROR_CATEGORIES[keyof typeof CONFIG_VALIDATOR_CONSTANTS.ERROR_CATEGORIES];
export type ConnectionType = typeof CONFIG_VALIDATOR_CONSTANTS.CONNECTION_TYPES[keyof typeof CONFIG_VALIDATOR_CONSTANTS.CONNECTION_TYPES];
export type DataTransferType = typeof CONFIG_VALIDATOR_CONSTANTS.DATA_TRANSFER_TYPES[keyof typeof CONFIG_VALIDATOR_CONSTANTS.DATA_TRANSFER_TYPES];