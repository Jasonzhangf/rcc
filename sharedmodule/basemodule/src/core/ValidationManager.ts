import { ValidationRule, ValidationResult } from '../interfaces/Validation';

/**
 * Manages validation rules and input validation
 */
export class ValidationManager {
  private validationRules: ValidationRule[] = [];
  private moduleId: string;
  private debugCallback?: (level: string, message: string, data?: any, method?: string) => void;

  constructor(moduleId: string, debugCallback?: (level: string, message: string, data?: any, method?: string) => void) {
    this.moduleId = moduleId;
    this.debugCallback = debugCallback;
  }

  /**
   * Adds a validation rule
   */
  public addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * Removes a validation rule
   */
  public removeValidationRule(fieldName: string): void {
    this.validationRules = this.validationRules.filter(rule => rule.field !== fieldName);
  }

  /**
   * Gets all validation rules
   */
  public getValidationRules(): ValidationRule[] {
    return [...this.validationRules];
  }

  /**
   * Clears all validation rules
   */
  public clearValidationRules(): void {
    this.validationRules = [];
  }

  /**
   * Validates input data against validation rules
   */
  public validateInput(data: any): ValidationResult {
    const errors: string[] = [];

    for (const rule of this.validationRules) {
      const value = data[rule.field];

      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null) {
            errors.push(rule.message);
          }
          break;
        case 'string':
          if (typeof value !== 'string') {
            errors.push(rule.message);
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            errors.push(rule.message);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(rule.message);
          }
          break;
        case 'object':
          if (typeof value !== 'object' || value === null) {
            errors.push(rule.message);
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push(rule.message);
          }
          break;
        case 'custom':
          if (rule.validator && !rule.validator(value)) {
            errors.push(rule.message);
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data
    };
  }

  /**
   * Validates a specific field
   */
  public validateField(fieldName: string, value: any): ValidationResult {
    const fieldRules = this.validationRules.filter(rule => rule.field === fieldName);

    if (fieldRules.length === 0) {
      return {
        isValid: true,
        errors: [],
        data: { [fieldName]: value }
      };
    }

    const fieldData = { [fieldName]: value };
    const fieldErrors: string[] = [];

    for (const rule of fieldRules) {
      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null) {
            fieldErrors.push(rule.message);
          }
          break;
        case 'string':
          if (typeof value !== 'string') {
            fieldErrors.push(rule.message);
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            fieldErrors.push(rule.message);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            fieldErrors.push(rule.message);
          }
          break;
        case 'object':
          if (typeof value !== 'object' || value === null) {
            fieldErrors.push(rule.message);
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            fieldErrors.push(rule.message);
          }
          break;
        case 'custom':
          if (rule.validator && !rule.validator(value)) {
            fieldErrors.push(rule.message);
          }
          break;
      }
    }

    return {
      isValid: fieldErrors.length === 0,
      errors: fieldErrors,
      data: fieldData
    };
  }

  /**
   * Sets validation rules
   */
  public setValidationRules(rules: ValidationRule[]): void {
    this.validationRules = [...rules];
  }

  /**
   * Internal debug logging
   */
  private debug(level: string, message: string, data?: any, method?: string): void {
    if (this.debugCallback) {
      this.debugCallback(level, message, data, method);
    }
  }
}