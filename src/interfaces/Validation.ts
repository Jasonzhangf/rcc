/**
 * Interface for validation rules
 */
export interface ValidationRule {
  /**
   * Field name to validate
   */
  field: string;
  
  /**
   * Type of validation
   */
  type: 'required' | 'string' | 'number' | 'boolean' | 'object' | 'array' | 'custom';
  
  /**
   * Custom validation function (for custom type)
   */
  validator?: (value: any) => boolean;
  
  /**
   * Error message if validation fails
   */
  message: string;
}

/**
 * Interface for validation result
 */
export interface ValidationResult {
  /**
   * Whether the validation passed
   */
  isValid: boolean;
  
  /**
   * Error messages if validation failed
   */
  errors: string[];
  
  /**
   * Validated data
   */
  data?: any;
}