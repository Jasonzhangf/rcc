/**
 * Interface for validation rules
 */
export interface ValidationRule {
  /**
   * Field name to validate
   */
  field: string;

  /**
   * Type of validation to perform
   */
  type: 'required' | 'string' | 'number' | 'boolean' | 'object' | 'array' | 'custom';

  /**
   * Error message to display if validation fails
   */
  message: string;

  /**
   * Custom validator function (only for 'custom' type)
   */
  validator?: (value: any) => boolean;
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
   * Array of error messages
   */
  errors: string[];

  /**
   * The data that was validated
   */
  data: any;
}
