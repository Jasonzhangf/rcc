/**
 * SafeJSON - Type-safe JSON parsing with validation
 * Comprehensive JSON handling with runtime validation and error recovery
 */

import fs from 'fs-extra';
import { RccError } from '../types';

/**
 * Parsed JSON result with error handling
 */
export interface ParsedJsonResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  validationErrors?: string[];
}

/**
 * JSON Schema validator function
 */
export type JsonSchemaValidator = (data: any) => string[];

/**
 * Safe JSON parsing options
 */
export interface SafeJsonParseOptions {
  required?: boolean;
  schema?: any; // JSON Schema object
  defaultValue?: any;
  reviver?: (key: string, value: any) => any;
  maxDepth?: number;
  fallback?: () => any;
  silent?: boolean;
}

/**
 * Safe JSON wrapper class with comprehensive validation
 */
export class SafeJson {
  private static instance: SafeJson;
  private maxDepth: number = 10;
  private maxStringLength: number = 50 * 1024 * 1024; // 50MB

  private constructor() {}

  /**
   * Singleton instance getter
   */
  static getInstance(): SafeJson {
    if (!SafeJson.instance) {
      SafeJson.instance = new SafeJson();
    }
    return SafeJson.instance;
  }

  /**
   * Parse JSON string with comprehensive validation
   */
  parse<T = any>(jsonString: string, options: SafeJsonParseOptions = {}): T | null {
    const {
      required = true,
      schema,
      defaultValue = null,
      reviver,
      maxDepth,
      fallback,
      silent = false,
    } = options;

    try {
      // Validate input string
      if (!this.validateInputString(jsonString)) {
        throw new Error('Invalid JSON string input');
      }

      // Parse JSON with depth limit
      const parsed = this.parseWithDepthLimit(jsonString, maxDepth || this.maxDepth, reviver);

      // Validate against schema if provided
      if (schema && !this.validateSchema(parsed, schema)) {
        if (!silent) {
          console.warn('JSON validation failed, attempting fallback recovery...');
        }

        // Try fallback recovery
        if (fallback) {
          try {
            const fallbackData = fallback();
            if (this.validateSchema(fallbackData, schema)) {
              return fallbackData;
            }
          } catch (fallbackError) {
            if (!silent) {
              console.warn(
                'Fallback recovery failed:',
                fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
              );
            }
          }
        }

        if (required) {
          throw new Error('JSON validation failed');
        }

        return defaultValue;
      }

      return parsed as T;
    } catch (error) {
      if (required && !silent) {
        console.error(
          'SafeJSON parse error:',
          error instanceof Error ? error.message : String(error)
        );
      }

      // Try fallback if available
      if (fallback) {
        try {
          return fallback();
        } catch (fallbackError) {
          if (!silent) {
            console.warn(
              'Fallback failed:',
              fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
            );
          }
        }
      }

      return defaultValue;
    }
  }

  /**
   * Parse JSON file with validation
   */
  parseFile<T = any>(filePath: string, options: SafeJsonParseOptions = {}): T | null {
    const { required = true, silent = false } = options;

    try {
      // Check file existence and size
      if (!fs.existsSync(filePath)) {
        if (required && !silent) {
          console.warn(`JSON file not found: ${filePath}`);
        }
        return options.defaultValue || null;
      }

      const stats = fs.statSync(filePath);
      if (stats.size > this.maxStringLength) {
        throw new Error(`JSON file too large: ${stats.size} bytes (max: ${this.maxStringLength})`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      return this.parse<T>(fileContent, options);
    } catch (error) {
      if (required && !silent) {
        console.error(
          `SafeJSON file parse error (${filePath}):`,
          error instanceof Error ? error.message : String(error)
        );
      }
      return options.defaultValue || null;
    }
  }

  /**
   * Safe number parsing with validation
   */
  parseNumber(
    value: string | number | undefined | null,
    options: {
      defaultValue?: number;
      min?: number;
      max?: number;
      integer?: boolean;
      allowFloat?: boolean;
      silent?: boolean;
    } = {}
  ): number {
    const {
      defaultValue = 0,
      min,
      max,
      integer = false,
      allowFloat = true,
      silent = false,
    } = options;

    try {
      let result: number;

      if (typeof value === 'number') {
        result = value;
      } else if (typeof value === 'string') {
        const cleanValue = value.trim();

        // Handle special numeric formats
        if (cleanValue.startsWith('0x')) {
          result = parseInt(cleanValue, 16);
        } else if (cleanValue.startsWith('0b')) {
          result = parseInt(cleanValue, 2);
        } else if (cleanValue.startsWith('0o')) {
          result = parseInt(cleanValue, 8);
        } else {
          result = parseFloat(cleanValue);
        }

        if (isNaN(result)) {
          throw new Error('Invalid numeric string');
        }
      } else {
        throw new Error('Invalid input type for numeric parsing');
      }

      // Apply integer constraint
      if (integer) {
        result = Math.floor(result);
      }

      // Validate range
      if (min !== undefined && result < min) {
        throw new Error(`Value below minimum: ${result} < ${min}`);
      }

      if (max !== undefined && result > max) {
        throw new Error(`Value above maximum: ${result} > ${max}`);
      }

      return result;
    } catch (error) {
      if (!silent) {
        console.warn(`Number parsing failed, using default: ${defaultValue}`);
      }
      return defaultValue;
    }
  }

  /**
   * Safe boolean parsing with validation
   */
  parseBoolean(
    value: string | boolean | undefined | null,
    options: {
      defaultValue?: boolean;
      trueValues?: string[];
      falseValues?: string[];
      silent?: boolean;
    } = {}
  ): boolean {
    const {
      defaultValue = false,
      trueValues = ['true', '1', 'yes', 'on', 'enabled', 'active'],
      falseValues = ['false', '0', 'no', 'off', 'disabled', 'inactive'],
      silent = false,
    } = options;

    try {
      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'string') {
        const cleanValue = value.toLowerCase().trim();
        if (trueValues.includes(cleanValue)) {
          return true;
        }
        if (falseValues.includes(cleanValue)) {
          return false;
        }
        throw new Error(`Unrecognized boolean string: ${value}`);
      }

      if (typeof value === 'number') {
        return value !== 0;
      }

      throw new Error('Invalid input type for boolean parsing');
    } catch (error) {
      if (!silent) {
        console.warn(`Boolean parsing failed, using default: ${defaultValue}`);
      }
      return defaultValue;
    }
  }

  /**
   * Safe array parsing with validation
   */
  parseArray<T = any>(
    value: string | T[] | undefined | null,
    options: {
      defaultValue?: T[];
      delimiter?: string;
      itemParser?: (item: string) => T;
      itemValidator?: (item: T) => boolean;
      minItems?: number;
      maxItems?: number;
      silent?: boolean;
    } = {}
  ): T[] {
    const {
      defaultValue = [],
      delimiter = ',',
      itemParser = (item: string) => item.trim() as unknown as T,
      itemValidator,
      minItems,
      maxItems,
      silent = false,
    } = options;

    try {
      let array: T[];

      if (Array.isArray(value)) {
        array = value;
      } else if (typeof value === 'string') {
        array = value.split(delimiter).map(itemParser);
      } else if (value === null || value === undefined) {
        array = [];
      } else {
        throw new Error('Invalid input type for array parsing');
      }

      // Validate item count
      if (minItems !== undefined && array.length < minItems) {
        throw new Error(`Array too small: ${array.length} < ${minItems}`);
      }

      if (maxItems !== undefined && array.length > maxItems) {
        throw new Error(`Array too large: ${array.length} > ${maxItems}`);
      }

      // Validate individual items
      if (itemValidator) {
        const invalidItems = array.filter((item) => !itemValidator(item));
        if (invalidItems.length > 0) {
          throw new Error(`Invalid array items: ${invalidItems}`);
        }
      }

      return array;
    } catch (error) {
      if (!silent) {
        console.warn(`Array parsing failed, using default:`, defaultValue);
      }
      return defaultValue;
    }
  }

  /**
   * Safe object parsing with validation
   */
  parseObject<T = Record<string, any>>(
    value: string | object | undefined | null,
    options: {
      defaultValue?: T;
      allowDotNotation?: boolean;
      requiredProperties?: string[];
      silent?: boolean;
    } = {}
  ): T | null {
    const {
      defaultValue = {} as T,
      allowDotNotation = false,
      requiredProperties = [],
      silent = false,
    } = options;

    try {
      let result: T;

      if (typeof value === 'object' && value !== null) {
        result = value as T;
      } else if (typeof value === 'string') {
        result = this.parse(value, { silent: true, required: false }) || (defaultValue as T);
      } else {
        return defaultValue;
      }

      // Check required properties
      for (const prop of requiredProperties) {
        if (result[prop as keyof T] === undefined) {
          throw new Error(`Missing required property: ${prop}`);
        }
      }

      return result;
    } catch (error) {
      if (!silent) {
        console.warn(`Object parsing failed, using default:`, defaultValue);
      }
      return defaultValue;
    }
  }

  /**
   * Compile-time schema validation check (for build time)
   */
  compileTimeValidate<T>(data: T, schema: any): { valid: boolean; errors?: string[] } {
    try {
      const errors = this.validateSchema(data, schema, true);
      return { valid: errors.length === 0, errors: errors.length > 0 ? errors : [] };
    } catch (error) {
      return { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
    }
  }

  /**
   * Runtime validation with detailed error reporting
   */
  validate<T>(data: T, schema: any): ParsedJsonResult<T> {
    try {
      const errors = this.validateSchema(data, schema);
      if (errors.length === 0) {
        return { success: true, data };
      }

      return {
        success: false,
        error: new Error(`Validation failed: ${errors.join(', ')}`),
        validationErrors: errors,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Generate type-safe JSON validator
   */
  generateValidator(schema: any): JsonSchemaValidator {
    return (data: any): string[] => {
      return this.validateSchema(data, schema);
    };
  }

  /**
   * Parse with automatic fallback on failure
   */
  parseWithFallback<T = any>(
    primary: string,
    fallback: string,
    options: SafeJsonParseOptions = {}
  ): T | null {
    const primaryResult = this.parse(primary, { ...options, silent: true });
    if (primaryResult !== null) {
      return primaryResult;
    }

    console.warn('Primary JSON parse failed, trying fallback...');
    return this.parse(fallback, options);
  }

  // Private validation methods

  private validateInputString(input: string): boolean {
    if (typeof input !== 'string') {
      return false;
    }

    if (input.length > this.maxStringLength) {
      return false;
    }

    // Basic JSON syntax validation
    const trimmed = input.trim();
    if (!trimmed || trimmed.length < 2) {
      return false;
    }

    // Check if it could be JSON
    const firstChar = trimmed[0];
    const lastChar = trimmed[trimmed.length - 1];

    const validObjs = firstChar === '{' && lastChar === '}';
    const validArrays = firstChar === '[' && lastChar === ']';

    if (!validObjs && !validArrays) {
      return false;
    }

    return true;
  }

  private parseWithDepthLimit(
    jsonString: string,
    maxDepth: number,
    reviver?: (key: string, value: any) => any
  ): any {
    // Pre-parsing depth check
    const depth = this.calculateJsonDepth(jsonString);
    if (depth > maxDepth) {
      throw new Error(`JSON depth ${depth} exceeds maximum ${maxDepth}`);
    }

    return JSON.parse(jsonString, reviver);
  }

  private calculateJsonDepth(jsonString: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    const ignoreNext = false;
    let inString = false;

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      const prevChar = i > 0 ? jsonString[i - 1] : ' ';
      const nextChar = i < jsonString.length - 1 ? jsonString[i + 1] : ' ';

      if (!inString) {
        if (char === '"' && prevChar !== '\\') {
          inString = true;
        } else if (char === '{' || char === '[') {
          currentDepth++;
          maxDepth = Math.max(maxDepth, currentDepth);
        } else if (char === '}' || char === ']') {
          currentDepth = Math.max(0, currentDepth - 1);
        }
      } else {
        if (char === '"' && prevChar !== '\\') {
          inString = false;
        }
      }
    }

    return maxDepth;
  }

  private validateSchema(data: any, schema: any, silent = false): string[] {
    const errors: string[] = [];

    try {
      // Basic schema validation (simplified JSON Schema implementation)
      if (schema.type) {
        if (!this.validateType(data, schema.type)) {
          errors.push(`Expected ${schema.type}, got ${typeof data}`);
        }
      }

      if (schema.properties && typeof data === 'object' && data !== null) {
        for (const [prop, propSchema] of Object.entries(schema.properties)) {
          if ((propSchema as any).required && !(prop in data)) {
            errors.push(`Missing required property: ${prop}`);
          } else if (prop in data) {
            const propErrors = this.validateProperty(data[prop], propSchema as any, prop);
            errors.push(...propErrors);
          }
        }
      }

      if (schema.required && Array.isArray(schema.required)) {
        for (const prop of schema.required) {
          if (!(prop in data)) {
            errors.push(`Missing required property: ${prop}`);
          }
        }
      }

      return errors;
    } catch (error) {
      if (!silent) {
        console.error('Schema validation error:', error);
      }
      return [
        `Schema validation system error: ${error instanceof Error ? error.message : String(error)}`,
      ];
    }
  }

  private validateProperty(property: any, schema: any, propName: string): string[] {
    const errors: string[] = [];

    if (schema.type && !this.validateType(property, schema.type)) {
      errors.push(`Property "${propName}" expected ${schema.type}, got ${typeof property}`);
    }

    if (typeof property !== 'undefined') {
      // Additional property-specific validations
      if (schema.min !== undefined && property < schema.min) {
        errors.push(`Property "${propName}" below minimum: ${property} < ${schema.min}`);
      }

      if (schema.max !== undefined && property > schema.max) {
        errors.push(`Property "${propName}" above maximum: ${property} > ${schema.max}`);
      }

      // String validations
      if (
        schema.minLength !== undefined &&
        typeof property === 'string' &&
        property.length < schema.minLength
      ) {
        errors.push(`Property "${propName}" too short: ${property.length} < ${schema.minLength}`);
      }

      if (
        schema.maxLength !== undefined &&
        typeof property === 'string' &&
        property.length > schema.maxLength
      ) {
        errors.push(`Property "${propName}" too long: ${property.length} > ${schema.maxLength}`);
      }

      // Array validations
      if (
        schema.minItems !== undefined &&
        Array.isArray(property) &&
        property.length < schema.minItems
      ) {
        errors.push(
          `Property "${propName}" array too small: ${property.length} < ${schema.minItems}`
        );
      }

      if (
        schema.maxItems !== undefined &&
        Array.isArray(property) &&
        property.length > schema.maxItems
      ) {
        errors.push(
          `Property "${propName}" array too large: ${property.length} > ${schema.maxItems}`
        );
      }
    }

    return errors;
  }

  private validateType(value: any, expectedType: string): boolean {
    let type = typeof value;

    if (value === null) {
      type = 'null' as any; // null特殊处理
    } else if (Array.isArray(value)) {
      type = 'array' as any; // 数组特殊处理
    }

    return (
      type === expectedType ||
      (expectedType === 'integer' && type === 'number' && Number.isInteger(value))
    );
  }

  /**
   * Stringify with improved error handling
   */
  stringify(
    data: any,
    options: {
      space?: number | string;
      replacer?: (key: string, value: any) => any;
      cycleHandling?: 'ignore' | 'error' | 'skip';
      circularWarning?: boolean;
    } = {}
  ): string {
    const { space = 2, replacer, cycleHandling = 'skip', circularWarning = true } = options;

    try {
      // Check for cycles
      const hasCycles = this.hasCircularReferences(data);
      if (hasCycles) {
        if (cycleHandling === 'error') {
          throw new Error('Circular reference detected');
        } else if (cycleHandling === 'ignore') {
          // Continue with normal stringify (will throw error)
        } else if (cycleHandling === 'skip') {
          // Create cycle-safe version
          const cycleSafe = this.makeCycleSafe(data);
          if (circularWarning) {
            console.warn('Circular references detected and skipped in JSON output');
          }
          return JSON.stringify(cycleSafe, replacer, space);
        }
      }

      return JSON.stringify(data, replacer, space);
    } catch (error) {
      throw new Error(
        `JSON stringify failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private hasCircularReferences(obj: any, visited = new WeakSet()): boolean {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }

    if (visited.has(obj)) {
      return true;
    }

    visited.add(obj);

    try {
      for (const value of Object.values(obj)) {
        if (this.hasCircularReferences(value, visited)) {
          return true;
        }
      }
    } finally {
      visited.delete(obj);
    }

    return false;
  }

  private makeCycleSafe(obj: any, visited = new WeakSet()): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (visited.has(obj)) {
      return '[Circular]';
    }

    visited.add(obj);

    try {
      if (Array.isArray(obj)) {
        return obj.map((item) => this.makeCycleSafe(item, visited));
      } else {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = this.makeCycleSafe(value, visited);
        }
        return result;
      }
    } finally {
      visited.delete(obj);
    }
  }
}

// Export singleton instance
export const safeJson = SafeJson.getInstance();
