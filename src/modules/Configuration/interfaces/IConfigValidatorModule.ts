import { BaseModule } from '../../../core/BaseModule';
import { ValidationResult, ValidationRule } from '../../../interfaces/Validation';

/**
 * Interface for Configuration Validator Module
 */
export interface IConfigValidatorModule extends BaseModule {
  // Validation operations
  validateComplete(config: any): Promise<ValidationResult>;
  validateSection(section: string, data: any): Promise<ValidationResult>;
  validateField(field: string, value: any, rules: ValidationRule[]): ValidationResult;
  
  // Schema management
  registerSchema(name: string, schema: ConfigSchema): void;
  getSchema(name: string): ConfigSchema | undefined;
  validateAgainstSchema(config: any, schemaName: string): Promise<ValidationResult>;
  
  // Custom validators
  registerCustomValidator(name: string, validator: CustomValidator): void;
  getCustomValidator(name: string): CustomValidator | undefined;
}

/**
 * Configuration schema definition
 */
export interface ConfigSchema {
  name: string;
  version: string;
  description: string;
  properties: Record<string, SchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  dependencies?: Record<string, string[]>;
}

/**
 * Schema property definition
 */
export interface SchemaProperty {
  type: SchemaPropertyType;
  description?: string;
  default?: any;
  required?: boolean;
  validation?: PropertyValidation;
  properties?: Record<string, SchemaProperty>; // for object types
  items?: SchemaProperty; // for array types
}

/**
 * Schema property types
 */
export enum SchemaPropertyType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  NULL = 'null',
  ANY = 'any'
}

/**
 * Property validation rules
 */
export interface PropertyValidation {
  // String validation
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  format?: StringFormat;
  
  // Number validation
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  
  // Array validation
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // Object validation
  minProperties?: number;
  maxProperties?: number;
  
  // Custom validation
  customValidator?: string; // name of registered custom validator
  customValidation?: (value: any) => ValidationResult;
}

/**
 * String format types
 */
export enum StringFormat {
  EMAIL = 'email',
  URI = 'uri',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',
  UUID = 'uuid',
  JSON = 'json',
  REGEX = 'regex'
}

/**
 * Custom validator function
 */
export interface CustomValidator {
  name: string;
  description: string;
  validate: (value: any, context?: ValidationContext) => ValidationResult;
}

/**
 * Validation context
 */
export interface ValidationContext {
  field: string;
  parent?: any;
  root: any;
  path: string[];
  schema: ConfigSchema;
}

/**
 * Validation level
 */
export enum ValidationLevel {
  BASIC = 'basic',           // Type and required field validation only
  STANDARD = 'standard',     // Basic + format validation
  STRICT = 'strict',         // Standard + custom validation
  COMPREHENSIVE = 'comprehensive' // Strict + cross-field validation
}

/**
 * Validation options
 */
export interface ValidationOptions {
  level: ValidationLevel;
  stopOnFirstError?: boolean;
  validateDefaults?: boolean;
  strictMode?: boolean;
  customContext?: Record<string, any>;
}

/**
 * Enhanced validation result
 */
export interface EnhancedValidationResult extends ValidationResult {
  validatedData?: any; // Data with defaults applied
  performance: ValidationPerformance;
  validationPath: string[];
}

/**
 * Validation performance metrics
 */
export interface ValidationPerformance {
  totalTime: number;
  rulesEvaluated: number;
  customValidatorsRun: number;
  memoryUsed: number;
}

/**
 * Validation rule set
 */
export interface ValidationRuleSet {
  name: string;
  description: string;
  rules: ValidationRule[];
  applicableTypes: SchemaPropertyType[];
  priority: number;
}