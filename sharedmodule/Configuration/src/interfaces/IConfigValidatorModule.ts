/**
 * Config Validator Module Interface
 * 
 * Defines the contract for validating configuration data integrity,
 * including schema validation, business rules, dependencies, and security checks.
 */

import { 
  ConfigData, 
  ConfigSchema, 
  ConfigValidationResult, 
  ValidationRule,
  ConstraintRule 
} from '../core/ConfigData';

/**
 * Validation types
 */
export type ValidationType = 'schema' | 'business-rules' | 'dependencies' | 'security' | 'performance';

/**
 * Validation severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Validation context
 */
export interface ValidationContext {
  /**
   * Configuration being validated
   */
  config: ConfigData;
  
  /**
   * Schema to validate against
   */
  schema?: ConfigSchema;
  
  /**
   * Validation options
   */
  options: ValidationOptions;
  
  /**
   * Environment context
   */
  environment?: string;
  
  /**
   * Validation timestamp
   */
  timestamp: string;
  
  /**
   * Additional context data
   */
  metadata?: Record<string, any>;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * Validation types to perform
   */
  types?: ValidationType[];
  
  /**
   * Validation level
   */
  level?: 'strict' | 'normal' | 'loose';
  
  /**
   * Whether to continue validation after first error
   */
  continueOnError?: boolean;
  
  /**
   * Maximum validation time in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to include warnings in results
   */
  includeWarnings?: boolean;
  
  /**
   * Whether to include detailed error paths
   */
  includeErrorPaths?: boolean;
  
  /**
   * Custom validation rules to apply
   */
  customRules?: CustomValidationRule[];
  
  /**
   * Schema format to use
   */
  schemaFormat?: 'json-schema' | 'ajv' | 'joi' | 'yup';
  
  /**
   * Environment-specific validation rules
   */
  environmentRules?: Record<string, ValidationRule[]>;
}

/**
 * Custom validation rule
 */
export interface CustomValidationRule {
  /**
   * Rule identifier
   */
  id: string;
  
  /**
   * Rule name
   */
  name: string;
  
  /**
   * Rule description
   */
  description: string;
  
  /**
   * Rule type
   */
  type: ValidationType;
  
  /**
   * Rule severity
   */
  severity: ValidationSeverity;
  
  /**
   * Validation function
   */
  validator: (value: any, context: ValidationContext) => ValidationRuleResult;
  
  /**
   * Paths this rule applies to (JSONPath expressions)
   */
  paths?: string[];
  
  /**
   * Conditions for when this rule should be applied
   */
  conditions?: ValidationCondition[];
  
  /**
   * Error message template
   */
  errorMessage: string;
  
  /**
   * Suggested fix message
   */
  suggestedFix?: string;
}

/**
 * Validation condition
 */
export interface ValidationCondition {
  /**
   * Condition type
   */
  type: 'environment' | 'field-value' | 'field-exists' | 'custom';
  
  /**
   * Field path for field-based conditions
   */
  field?: string;
  
  /**
   * Expected value or pattern
   */
  value?: any;
  
  /**
   * Comparison operator
   */
  operator?: 'equals' | 'not-equals' | 'contains' | 'matches' | 'greater-than' | 'less-than';
  
  /**
   * Custom condition function
   */
  condition?: (context: ValidationContext) => boolean;
}

/**
 * Validation rule result
 */
export interface ValidationRuleResult {
  /**
   * Whether validation passed
   */
  passed: boolean;
  
  /**
   * Error message if validation failed
   */
  message?: string;
  
  /**
   * Detailed error information
   */
  details?: Record<string, any>;
  
  /**
   * Suggested fix
   */
  suggestedFix?: any;
}

/**
 * Schema validation options
 */
export interface SchemaValidationOptions {
  /**
   * Schema format
   */
  format: 'json-schema' | 'ajv' | 'joi' | 'yup';
  
  /**
   * Schema version
   */
  version?: string;
  
  /**
   * Whether to validate additional properties
   */
  additionalProperties?: boolean;
  
  /**
   * Whether to use strict mode
   */
  strict?: boolean;
  
  /**
   * Custom format validators
   */
  customFormats?: Record<string, (value: any) => boolean>;
  
  /**
   * Schema resolution options
   */
  resolution?: {
    /**
     * Base URI for resolving references
     */
    baseUri?: string;
    
    /**
     * Custom schema loader
     */
    loader?: (uri: string) => Promise<any>;
  };
}

/**
 * Business rule validation options
 */
export interface BusinessRuleValidationOptions {
  /**
   * Rule sets to apply
   */
  ruleSets?: string[];
  
  /**
   * Whether to validate cross-field dependencies
   */
  validateDependencies?: boolean;
  
  /**
   * Whether to validate business constraints
   */
  validateConstraints?: boolean;
  
  /**
   * Context data for rule evaluation
   */
  context?: Record<string, any>;
}

/**
 * Security validation options
 */
export interface SecurityValidationOptions {
  /**
   * Whether to check for injection attacks
   */
  checkInjection?: boolean;
  
  /**
   * Whether to validate secrets format
   */
  validateSecrets?: boolean;
  
  /**
   * Whether to check for path traversal
   */
  checkPathTraversal?: boolean;
  
  /**
   * Whether to validate permissions
   */
  validatePermissions?: boolean;
  
  /**
   * Custom security patterns to check
   */
  customPatterns?: Array<{
    name: string;
    pattern: RegExp;
    message: string;
  }>;
  
  /**
   * Whitelist of allowed values
   */
  whitelist?: Record<string, any[]>;
  
  /**
   * Blacklist of forbidden values
   */
  blacklist?: Record<string, any[]>;
}

/**
 * Performance validation options
 */
export interface PerformanceValidationOptions {
  /**
   * Maximum allowed configuration size in bytes
   */
  maxSize?: number;
  
  /**
   * Maximum nesting depth
   */
  maxDepth?: number;
  
  /**
   * Maximum array length
   */
  maxArrayLength?: number;
  
  /**
   * Maximum object property count
   */
  maxPropertyCount?: number;
  
  /**
   * Maximum string length
   */
  maxStringLength?: number;
  
  /**
   * Memory usage thresholds
   */
  memoryThresholds?: {
    warning: number;
    error: number;
  };
}

/**
 * Dependency validation options
 */
export interface DependencyValidationOptions {
  /**
   * Whether to validate required dependencies
   */
  checkRequired?: boolean;
  
  /**
   * Whether to validate circular dependencies
   */
  checkCircular?: boolean;
  
  /**
   * Whether to validate version compatibility
   */
  checkVersions?: boolean;
  
  /**
   * Dependency graph to validate against
   */
  dependencyGraph?: DependencyGraph;
  
  /**
   * External dependency resolver
   */
  resolver?: (dependency: string) => Promise<boolean>;
}

/**
 * Dependency graph definition
 */
export interface DependencyGraph {
  /**
   * Graph nodes (configuration fields)
   */
  nodes: DependencyNode[];
  
  /**
   * Graph edges (dependencies)
   */
  edges: DependencyEdge[];
}

/**
 * Dependency node
 */
export interface DependencyNode {
  /**
   * Node identifier
   */
  id: string;
  
  /**
   * Configuration field path
   */
  path: string;
  
  /**
   * Node type
   */
  type: 'required' | 'optional' | 'conditional';
  
  /**
   * Node metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Dependency edge
 */
export interface DependencyEdge {
  /**
   * Source node identifier
   */
  from: string;
  
  /**
   * Target node identifier
   */
  to: string;
  
  /**
   * Dependency type
   */
  type: 'requires' | 'conflicts' | 'implies';
  
  /**
   * Dependency condition
   */
  condition?: string | ((context: ValidationContext) => boolean);
  
  /**
   * Dependency metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Validation report
 */
export interface ValidationReport {
  /**
   * Overall validation result
   */
  result: ConfigValidationResult;
  
  /**
   * Validation context
   */
  context: ValidationContext;
  
  /**
   * Detailed results by validation type
   */
  typeResults: Record<ValidationType, ValidationTypeResult>;
  
  /**
   * Performance metrics
   */
  metrics: ValidationMetrics;
  
  /**
   * Suggestions for improvement
   */
  suggestions?: ValidationSuggestion[];
}

/**
 * Validation type result
 */
export interface ValidationTypeResult {
  /**
   * Validation type
   */
  type: ValidationType;
  
  /**
   * Whether this type passed validation
   */
  passed: boolean;
  
  /**
   * Errors found by this validation type
   */
  errors: ValidatorValidationError[];
  
  /**
   * Warnings found by this validation type
   */
  warnings: ValidatorValidationWarning[];
  
  /**
   * Duration of this validation type
   */
  duration: number;
}

/**
 * Enhanced validation error
 */
export interface ValidatorValidationError {
  /**
   * Error code
   */
  code: string;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Field path where error occurred
   */
  path: string;
  
  /**
   * Validation type that found this error
   */
  type: ValidationType;
  
  /**
   * Error severity
   */
  severity: ValidationSeverity;
  
  /**
   * Expected value or format
   */
  expected?: any;
  
  /**
   * Actual value that caused the error
   */
  actual?: any;
  
  /**
   * Validation rule that failed
   */
  rule?: string;
  
  /**
   * Suggested fix
   */
  suggestedFix?: any;
  
  /**
   * Additional error context
   */
  context?: Record<string, any>;
}

/**
 * Enhanced validation warning
 */
export interface ValidatorValidationWarning {
  /**
   * Warning code
   */
  code: string;
  
  /**
   * Warning message
   */
  message: string;
  
  /**
   * Field path where warning occurred
   */
  path: string;
  
  /**
   * Validation type that found this warning
   */
  type: ValidationType;
  
  /**
   * Suggested value or action
   */
  suggestion?: any;
  
  /**
   * Additional warning context
   */
  context?: Record<string, any>;
}

/**
 * Validation metrics
 */
export interface ValidationMetrics {
  /**
   * Total validation time
   */
  totalDuration: number;
  
  /**
   * Time by validation type
   */
  durationByType: Record<ValidationType, number>;
  
  /**
   * Number of rules evaluated
   */
  rulesEvaluated: number;
  
  /**
   * Number of fields validated
   */
  fieldsValidated: number;
  
  /**
   * Memory usage during validation
   */
  memoryUsage?: number;
  
  /**
   * Configuration complexity metrics
   */
  complexity?: {
    depth: number;
    breadth: number;
    cyclomaticComplexity: number;
  };
}

/**
 * Validation suggestion
 */
export interface ValidationSuggestion {
  /**
   * Suggestion type
   */
  type: 'optimization' | 'best-practice' | 'security' | 'performance';
  
  /**
   * Suggestion message
   */
  message: string;
  
  /**
   * Field path this suggestion applies to
   */
  path?: string;
  
  /**
   * Suggested change
   */
  suggestedChange?: any;
  
  /**
   * Priority level
   */
  priority: 'low' | 'medium' | 'high';
  
  /**
   * Additional context
   */
  context?: Record<string, any>;
}

/**
 * Config Validator Module Interface
 */
export interface IConfigValidatorModule {
  /**
   * Validate configuration data
   * @param config Configuration data to validate
   * @param schema Optional schema to validate against
   * @param options Validation options
   * @returns Validation report
   */
  validate(
    config: ConfigData,
    schema?: ConfigSchema,
    options?: ValidationOptions
  ): Promise<ValidationReport>;
  
  /**
   * Validate configuration schema
   * @param schema Schema to validate
   * @param options Schema validation options
   * @returns Validation result
   */
  validateSchema(
    schema: ConfigSchema,
    options?: SchemaValidationOptions
  ): Promise<ConfigValidationResult>;
  
  /**
   * Perform schema-based validation
   * @param config Configuration data
   * @param schema Schema to validate against
   * @param options Schema validation options
   * @returns Validation type result
   */
  validateWithSchema(
    config: ConfigData,
    schema: ConfigSchema,
    options?: SchemaValidationOptions
  ): Promise<ValidationTypeResult>;
  
  /**
   * Perform business rule validation
   * @param config Configuration data
   * @param rules Business rules to apply
   * @param options Business rule validation options
   * @returns Validation type result
   */
  validateBusinessRules(
    config: ConfigData,
    rules: ConstraintRule[],
    options?: BusinessRuleValidationOptions
  ): Promise<ValidationTypeResult>;
  
  /**
   * Perform security validation
   * @param config Configuration data
   * @param options Security validation options
   * @returns Validation type result
   */
  validateSecurity(
    config: ConfigData,
    options?: SecurityValidationOptions
  ): Promise<ValidationTypeResult>;
  
  /**
   * Perform performance validation
   * @param config Configuration data
   * @param options Performance validation options
   * @returns Validation type result
   */
  validatePerformance(
    config: ConfigData,
    options?: PerformanceValidationOptions
  ): Promise<ValidationTypeResult>;
  
  /**
   * Perform dependency validation
   * @param config Configuration data
   * @param options Dependency validation options
   * @returns Validation type result
   */
  validateDependencies(
    config: ConfigData,
    options?: DependencyValidationOptions
  ): Promise<ValidationTypeResult>;
  
  /**
   * Register a custom validation rule
   * @param rule Custom validation rule
   */
  registerCustomRule(rule: CustomValidationRule): void;
  
  /**
   * Unregister a custom validation rule
   * @param ruleId Rule identifier
   */
  unregisterCustomRule(ruleId: string): void;
  
  /**
   * Get all registered custom rules
   * @returns Array of custom validation rules
   */
  getCustomRules(): CustomValidationRule[];
  
  /**
   * Register a custom format validator
   * @param name Format name
   * @param validator Format validation function
   */
  registerCustomFormat(
    name: string,
    validator: (value: any) => boolean
  ): void;
  
  /**
   * Unregister a custom format validator
   * @param name Format name
   */
  unregisterCustomFormat(name: string): void;
  
  /**
   * Set default validation options
   * @param options Default validation options
   */
  setDefaultOptions(options: Partial<ValidationOptions>): void;
  
  /**
   * Get default validation options
   * @returns Default validation options
   */
  getDefaultOptions(): ValidationOptions;
  
  /**
   * Create a validation schema from configuration
   * @param config Configuration data
   * @param options Schema generation options
   * @returns Generated schema
   */
  generateSchema(
    config: ConfigData,
    options?: {
      format?: 'json-schema' | 'ajv';
      strict?: boolean;
      includeExamples?: boolean;
    }
  ): Promise<ConfigSchema>;
  
  /**
   * Merge multiple schemas
   * @param schemas Array of schemas to merge
   * @param strategy Merge strategy
   * @returns Merged schema
   */
  mergeSchemas(
    schemas: ConfigSchema[],
    strategy?: 'union' | 'intersection' | 'replace'
  ): ConfigSchema;
  
  /**
   * Validate configuration against multiple schemas
   * @param config Configuration data
   * @param schemas Array of schemas
   * @param strategy Validation strategy
   * @returns Validation result
   */
  validateMultipleSchemas(
    config: ConfigData,
    schemas: ConfigSchema[],
    strategy?: 'all' | 'any' | 'priority'
  ): Promise<ConfigValidationResult>;
  
  /**
   * Get validation statistics
   * @returns Validation statistics
   */
  getValidationStatistics(): Record<string, any>;
  
  /**
   * Reset validation statistics
   */
  resetStatistics(): void;
  
  /**
   * Benchmark validation performance
   * @param config Configuration data
   * @param schema Optional schema
   * @param iterations Number of iterations
   * @returns Benchmark results
   */
  benchmark(
    config: ConfigData,
    schema?: ConfigSchema,
    iterations?: number
  ): Promise<{
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
    memoryUsage: number;
  }>;
}