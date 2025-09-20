import { ModuleInfo, ValidationRule } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Compatibility Module Configuration
 */
export interface CompatibilityConfig {
  /** Field mapping table name */
  mappingTable: string;
  /** Enable strict mapping */
  strictMapping?: boolean;
  /** Preserve unknown fields */
  preserveUnknownFields?: boolean;
  /** Validation configuration */
  validation?: {
    /** Enable validation */
    enabled: boolean;
    /** Required fields */
    required?: string[];
    /** Field type constraints */
    types?: Record<string, string>;
    /** Field value constraints */
    constraints?: Record<string, any>;
  };
}

/**
 * Field Mapping Configuration
 */
export interface FieldMapping {
  /** Target field name */
  targetField: string;
  /** Transform function */
  transform?: (value: any, context?: any) => any;
  /** Default value */
  defaultValue?: any;
  /** Required field */
  required?: boolean;
  /** Validation constraints */
  validation?: {
    /** Allow empty values */
    allowEmpty?: boolean;
    /** Minimum length */
    minLength?: number;
    /** Maximum length */
    maxLength?: number;
    /** Minimum value */
    min?: number;
    /** Maximum value */
    max?: number;
    /** Allowed values */
    allowed?: any[];
    /** Regular expression pattern */
    pattern?: string;
  };
}

/**
 * Mapping Table
 */
export interface MappingTable {
  /** Table version */
  version: string;
  /** Table description */
  description: string;
  /** Field mappings */
  fieldMappings: Record<string, string | FieldMapping>;
  /** Validation rules */
  validationRules?: {
    /** Global required fields */
    required?: string[];
    /** Global type constraints */
    types?: Record<string, string>;
    /** Global field constraints */
    constraints?: Record<string, any>;
  };
  /** Source and target format information */
  formats?: {
    source: string;
    target: string;
  };
  /** Transform functions */
  transformFunctions?: Record<string, any>;
}

/**
 * Validation context
 */
export interface ValidationContext {
  /** Data being validated */
  data: any;
  /** Validation mode */
  mode: 'request' | 'response';
  /** Mapping rules */
  mapping: Record<string, FieldMapping>;
  /** Validation configuration */
  validation: CompatibilityConfig['validation'];
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Transformed data */
  transformedData: any;
}

export class CompatibilityModule extends BasePipelineModule {
  protected config: CompatibilityConfig = {} as CompatibilityConfig;
  private mappingTable: MappingTable | null = null;
  private fieldMappings: Record<string, FieldMapping> = {};
  private mappingValidationRules: MappingTable['validationRules'] = {};

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('CompatibilityModule initialized', { module: this.moduleName }, 'constructor');
  }

  /**
   * Configure the Compatibility module
   * @param config - Configuration object
   */
  async configure(config: CompatibilityConfig): Promise<void> {
    this.logInfo('Configuring CompatibilityModule', config, 'configure');
    
    this.config = config;
    
    // Validate configuration
    this.validateConfig(config);
    
    // Load mapping table
    await this.loadMappingTable(config.mappingTable);
    
    // Process field mappings
    this.processFieldMappings();
    
    await super.configure(config);
    this.logInfo('CompatibilityModule configured successfully', config, 'configure');
  }

  /**
   * Process request - Apply field mapping and validation
   * @param request - Input request data
   * @returns Promise<any> - Mapped and validated request data
   */
  async process(request: any): Promise<any> {
    this.logInfo('Processing CompatibilityModule request', {
      mappingTable: this.config?.mappingTable,
      strictMapping: this.config?.strictMapping,
      requestSize: JSON.stringify(request).length
    }, 'process');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(request, 'compatibility-input', 'previous-module');
      
      // Validate configuration
      if (!this.config) {
        throw new Error('CompatibilityModule not configured');
      }
      
      // Apply field mapping
      const mappedRequest = await this.applyFieldMapping(request);
      
      // Apply validation if enabled
      const validatedRequest = await this.validateData(mappedRequest, 'request');
      
      // Apply final transformations
      const finalRequest = await this.applyFinalTransformations(validatedRequest);
      
      // Log output data at output port
      this.logOutputPort(finalRequest, 'compatibility-output', 'next-module');
      
      this.debug('debug', 'CompatibilityModule request processing complete', { data: finalRequest, processingTime: Date.now() - startTime }, 'process');
      
      return finalRequest;
    } catch (error) {
      this.error('Error processing request', { error: error as Error, operation: 'process' }, 'process');
      throw error;
    }
  }

  /**
   * Process response - Apply field mapping and validation for response
   * @param response - Input response data
   * @returns Promise<any> - Mapped and validated response data
   */
  async processResponse(response: any): Promise<any> {
    this.logInfo('Processing CompatibilityModule response', {
      mappingTable: this.config?.mappingTable,
      strictMapping: this.config?.strictMapping,
      responseSize: JSON.stringify(response).length
    }, 'processResponse');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(response, 'compatibility-response-input', 'previous-module');
      
      // Validate configuration
      if (!this.config) {
        throw new Error('CompatibilityModule not configured');
      }
      
      // Apply field mapping
      const mappedResponse = await this.applyFieldMapping(response);
      
      // Apply validation if enabled
      const validatedResponse = await this.validateData(mappedResponse, 'response');
      
      // Apply final transformations
      const finalResponse = await this.applyFinalTransformations(validatedResponse);
      
      // Log output data at output port
      this.logOutputPort(finalResponse, 'compatibility-response-output', 'next-module');
      
      this.debug('debug', 'CompatibilityModule response processing complete', { data: finalResponse, processingTime: Date.now() - startTime }, 'processResponse');
      
      return finalResponse;
    } catch (error) {
      this.error('Error processing response', { error: error as Error, operation: 'processResponse' }, 'processResponse');
      throw error;
    }
  }

  /**
   * Validate configuration
   * @param config - Configuration to validate
   */
  private validateConfig(config: CompatibilityConfig): void {
    if (!config.mappingTable) {
      throw new Error('Mapping table name is required');
    }
    
    if (config.validation?.enabled && !config.validation.required?.length) {
      this.logInfo('Validation enabled but no required fields specified', config.validation, 'validateConfig');
    }
  }

  /**
   * Load mapping table
   * @param tableName - Name of the mapping table to load
   */
  private async loadMappingTable(tableName: string): Promise<void> {
    this.logInfo(`Loading mapping table: ${tableName}`, {}, 'loadMappingTable');
    
    try {
      this.mappingTable = await this.getMappingTable(tableName);
      
      if (!this.mappingTable) {
        throw new Error(`Mapping table not found: ${tableName}`);
      }
      
      this.mappingValidationRules = this.mappingTable.validationRules || {};
      
      this.logInfo(`Mapping table loaded successfully: ${tableName}`, {
        version: this.mappingTable.version,
        formats: this.mappingTable.formats,
        fieldCount: Object.keys(this.mappingTable.fieldMappings).length
      }, 'loadMappingTable');
    } catch (error) {
      this.error('Error loading mapping table', { error: error as Error, tableName }, 'loadMappingTable');
      throw error;
    }
  }

  /**
   * Get mapping table by name from JSON file
   * @param tableName - Name of the mapping table
   * @returns Promise<MappingTable> - Mapping table
   */
  private async getMappingTable(tableName: string): Promise<MappingTable> {
    try {
      // Construct path to mapping table file
      const mappingTablePath = path.join(__dirname, '..', '..', '..', 'mapping-tables', `${tableName}.json`);
      
      this.logInfo(`Loading mapping table from file: ${mappingTablePath}`, {}, 'getMappingTable');
      
      // Check if file exists
      if (!fs.existsSync(mappingTablePath)) {
        throw new Error(`Mapping table file not found: ${mappingTablePath}`);
      }
      
      // Read and parse JSON file
      const fileContent = fs.readFileSync(mappingTablePath, 'utf-8');
      const mappingTable = JSON.parse(fileContent) as MappingTable;
      
      // Validate mapping table structure
      this.validateMappingTableStructure(mappingTable, tableName);
      
      return mappingTable;
    } catch (error) {
      this.error(`Failed to load mapping table: ${tableName}`, error, 'getMappingTable');
      throw error;
    }
  }

  /**
   * Process field mappings
   */
  private processFieldMappings(): void {
    if (!this.mappingTable) {
      return;
    }
    
    this.fieldMappings = {};
    
    for (const [sourceField, mapping] of Object.entries(this.mappingTable.fieldMappings)) {
      if (typeof mapping === 'string') {
        // Simple field rename
        this.fieldMappings[sourceField] = {
          targetField: mapping,
          required: false
        };
      } else {
        // Complex field mapping
        this.fieldMappings[sourceField] = mapping;
      }
    }
    
    this.logInfo('Processed field mappings', {
      totalCount: Object.keys(this.fieldMappings).length,
      requiredCount: Object.values(this.fieldMappings).filter(m => m.required).length,
      transformCount: Object.values(this.fieldMappings).filter(m => m.transform).length
    }, 'processFieldMappings');
  }

  /**
   * Apply field mapping to data
   * @param data - Data to map
   * @returns Promise<any> - Mapped data
   */
  private async applyFieldMapping(data: any): Promise<any> {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    this.logInfo('Applying field mapping', {
      fieldCount: Object.keys(this.fieldMappings).length,
      dataFieldCount: Object.keys(data).length
    }, 'applyFieldMapping');
    
    const mappedData: any = {};
    const unmappedFields: string[] = [];
    
    // Apply mapped fields
    for (const [sourceField, mapping] of Object.entries(this.fieldMappings)) {
      const sourceValue = data[sourceField];
      
      if (sourceValue !== undefined) {
        // Apply transformation if specified
        let transformedValue = sourceValue;
        if (mapping.transform) {
          if (typeof mapping.transform === 'function') {
            // Legacy function transform
            const transformContext = { sourceField, data, mapping };
            transformedValue = await mapping.transform(sourceValue, transformContext);
          } else if (typeof mapping.transform === 'string') {
            // JSON-based transform function reference
            const transformContext = { sourceField, data, mapping };
            transformedValue = await this.resolveTransformFunction(mapping.transform, sourceValue, transformContext);
          }
          this.debug('debug', `Applied transform for field: ${sourceField}`, {
            fromValue: sourceValue,
            toValue: transformedValue
          }, 'applyFieldMapping');
        }
        
        // Validate value if constraints are specified
        if (mapping.validation) {
          this.validateFieldValue(transformedValue, mapping.validation, sourceField);
        }
        
        mappedData[mapping.targetField] = transformedValue;
      } else if (mapping.required) {
        throw new Error(`Required field missing: ${sourceField}`);
      } else if (mapping.defaultValue !== undefined) {
        mappedData[mapping.targetField] = mapping.defaultValue;
        this.debug('debug', `Applied default value for field: ${sourceField}`, {
          defaultValue: mapping.defaultValue
        }, 'applyFieldMapping');
      }
    }
    
    // Handle unknown fields
    if (this.config?.preserveUnknownFields) {
      for (const field of Object.keys(data)) {
        if (!(field in this.fieldMappings)) {
          mappedData[field] = data[field];
          unmappedFields.push(field);
        }
      }
    }
    
    if (unmappedFields.length > 0) {
      this.logInfo('Preserved unknown fields', {
        fieldCount: unmappedFields.length,
        fields: unmappedFields.slice(0, 10) // Log first 10 to avoid spam
      }, 'applyFieldMapping');
    }
    
    this.logInfo('Field mapping completed', {
      mappedFieldCount: Object.keys(mappedData).length,
      preservedFieldCount: unmappedFields.length
    }, 'applyFieldMapping');
    
    return mappedData;
  }

  /**
   * Validate field value
   * @param value - Value to validate
   * @param validation - Validation constraints
   * @param field - Field name
   */
  private validateFieldValue(value: any, validation: FieldMapping['validation'], field: string): void {
    if (!validation || !this.config?.validation?.enabled) {
      return;
    }
    
    // Check if empty values are allowed
    if (value === null || value === undefined || value === '') {
      if (!validation.allowEmpty) {
        throw new Error(`Field ${field} cannot be empty`);
      }
    }
    
    // Check minimum length
    if (validation.minLength !== undefined && typeof value === 'string') {
      if (value.length < validation.minLength) {
        throw new Error(`Field ${field} is too short: minimum length ${validation.minLength}`);
      }
    }
    
    // Check maximum length
    if (validation.maxLength !== undefined && typeof value === 'string') {
      if (value.length > validation.maxLength) {
        throw new Error(`Field ${field} is too long: maximum length ${validation.maxLength}`);
      }
    }
    
    // Check minimum value
    if (validation.min !== undefined && typeof value === 'number') {
      if (value < validation.min) {
        throw new Error(`Field ${field} is too small: minimum ${validation.min}`);
      }
    }
    
    // Check maximum value
    if (validation.max !== undefined && typeof value === 'number') {
      if (value > validation.max) {
        throw new Error(`Field ${field} is too large: maximum ${validation.max}`);
      }
    }
    
    // Check allowed values
    if (validation.allowed && validation.allowed.length > 0) {
      if (!validation.allowed.includes(value)) {
        throw new Error(`Field ${field} has invalid value: ${value}. Allowed values: ${validation.allowed.join(', ')}`);
      }
    }
    
    // Check pattern
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        throw new Error(`Field ${field} does not match pattern: ${validation.pattern}`);
      }
    }
    
    this.debug('debug', `Field validation passed for: ${field}`, {
      value,
      constraints: validation
    }, 'validateFieldValue');
  }

  /**
   * Validate data
   * @param data - Data to validate
   * @param mode - Validation mode ('request' or 'response')
   * @returns Promise<any> - Validated data
   */
  private async validateData(data: any, mode: 'request' | 'response'): Promise<any> {
    if (!this.config?.validation?.enabled) {
      return data;
    }
    
    this.logInfo('Validating data', {
      mode,
      validationConfig: this.config.validation,
      dataFieldCount: Object.keys(data).length
    }, 'validateData');
    
    const context: ValidationContext = {
      data,
      mode,
      mapping: this.fieldMappings,
      validation: this.config.validation
    };
    
    const result = await this.performValidation(context);
    
    if (!result.isValid) {
      const errorMessages = result.errors.join('; ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    
    if (result.warnings.length > 0) {
      this.warn(`Validation warnings: ${result.warnings.join('; ')}`, { warnings: result.warnings }, 'validateData');
    }
    
    this.logInfo('Data validation completed', {
      mode,
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length
    }, 'validateData');
    
    return result.transformedData;
  }

  /**
   * Perform validation
   * @param context - Validation context
   * @returns Promise<ValidationResult> - Validation result
   */
  private async performValidation(context: ValidationContext): Promise<ValidationResult> {
    const { data, validation } = context;
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      transformedData: { ...data } // Create copy
    };
    
    // Check global validation rules
    if (this.mappingValidationRules) {
      // Validate required fields
      if (this.mappingValidationRules.required) {
        for (const field of this.mappingValidationRules.required) {
          if (!(field in data) || data[field] === undefined || data[field] === null) {
            result.isValid = false;
            result.errors.push(`Required field missing: ${field}`);
          }
        }
      }
      
      // Validate field types
      if (this.mappingValidationRules.types) {
        for (const [field, expectedType] of Object.entries(this.mappingValidationRules.types)) {
          if (field in data && data[field] !== undefined) {
            const actualType = typeof data[field];
            if (actualType !== expectedType) {
              result.errors.push(`Field ${field} has invalid type: expected ${expectedType}, got ${actualType}`);
              result.isValid = false;
            }
          }
        }
      }
      
      // Validate field constraints
      if (this.mappingValidationRules.constraints) {
        for (const [field, constraints] of Object.entries(this.mappingValidationRules.constraints)) {
          if (field in data && data[field] !== undefined) {
            this.validateFieldConstraints(data[field], constraints, field, result);
          }
        }
      }
    }
    
    // Check validation-specific rules
    if (validation) {
      // Validate required fields if specified
      if (validation.required) {
        for (const field of validation.required) {
          if (!(field in data) || data[field] === undefined || data[field] === null) {
            result.errors.push(`Required field missing: ${field}`);
            result.isValid = false;
          }
        }
      }
      
      // Validate field types if specified
      if (validation.types) {
        for (const [field, expectedType] of Object.entries(validation.types)) {
          if (field in data && data[field] !== undefined) {
            const actualType = typeof data[field];
            if (actualType !== expectedType) {
              result.errors.push(`Field ${field} has invalid type: expected ${expectedType}, got ${actualType}`);
              result.isValid = false;
            }
          }
        }
      }
      
      // Validate field constraints if specified
      if (validation.constraints) {
        for (const [field, constraints] of Object.entries(validation.constraints)) {
          if (field in data && data[field] !== undefined) {
            this.validateFieldConstraints(data[field], constraints, field, result);
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Validate field constraints
   * @param value - Field value
   * @param constraints - Field constraints
   * @param field - Field name
   * @param result - Validation result to update
   */
  private validateFieldConstraints(value: any, constraints: any, field: string, result: ValidationResult): void {
    if (!constraints || value === undefined) {
      return;
    }
    
    // Validate minimum value
    if (constraints.min !== undefined && typeof value === 'number') {
      if (value < constraints.min) {
        result.errors.push(`Field ${field} is too small: minimum ${constraints.min}`);
        result.isValid = false;
      }
    }
    
    // Validate maximum value
    if (constraints.max !== undefined && typeof value === 'number') {
      if (value > constraints.max) {
        result.errors.push(`Field ${field} is too large: maximum ${constraints.max}`);
        result.isValid = false;
      }
    }
    
    // Validate allowed values
    if (constraints.allowed && Array.isArray(constraints.allowed)) {
      if (!constraints.allowed.includes(value)) {
        result.errors.push(`Field ${field} has invalid value: ${value}. Allowed: ${constraints.allowed.join(', ')}`);
        result.isValid = false;
      }
    }
    
    // Validate pattern for strings
    if (constraints.pattern && typeof value === 'string') {
      const regex = new RegExp(constraints.pattern);
      if (!regex.test(value)) {
        result.errors.push(`Field ${field} does not match pattern: ${constraints.pattern}`);
        result.isValid = false;
      }
    }
  }

  /**
   * Validate mapping table structure
   * @param mappingTable - Mapping table to validate
   * @param tableName - Table name for error messages
   */
  private validateMappingTableStructure(mappingTable: MappingTable, tableName: string): void {
    if (!mappingTable.version) {
      throw new Error(`Mapping table ${tableName} missing required field: version`);
    }
    
    if (!mappingTable.description) {
      throw new Error(`Mapping table ${tableName} missing required field: description`);
    }
    
    if (!mappingTable.fieldMappings || typeof mappingTable.fieldMappings !== 'object') {
      throw new Error(`Mapping table ${tableName} missing required field: fieldMappings`);
    }
    
    // Validate field mappings structure
    for (const [sourceField, mapping] of Object.entries(mappingTable.fieldMappings)) {
      if (typeof mapping === 'string') {
        // Simple string mapping is valid
        continue;
      }
      
      if (typeof mapping === 'object' && mapping !== null) {
        if (!mapping.targetField) {
          throw new Error(`Field mapping ${sourceField} in ${tableName} missing required field: targetField`);
        }
      } else {
        throw new Error(`Invalid field mapping for ${sourceField} in ${tableName}: must be string or object`);
      }
    }
    
    this.logInfo(`Mapping table structure validated: ${tableName}`, {
      version: mappingTable.version,
      fieldCount: Object.keys(mappingTable.fieldMappings).length,
      hasValidationRules: !!mappingTable.validationRules
    }, 'validateMappingTableStructure');
  }

  /**
   * Resolve transform function from mapping table
   * @param transformRef - Transform function reference
   * @param value - Value to transform
   * @param context - Transform context
   * @returns Promise<any> - Transformed value
   */
  private async resolveTransformFunction(transformRef: string, value: any, context: any): Promise<any> {
    if (!this.mappingTable?.transformFunctions) {
      throw new Error(`No transform functions defined in mapping table`);
    }

    const transformConfig = this.mappingTable.transformFunctions[transformRef];
    if (!transformConfig) {
      throw new Error(`Transform function not found: ${transformRef}`);
    }

    switch (transformConfig.type) {
      case 'mapping':
        return this.applyMappingTransform(value, transformConfig);
      
      case 'transform':
        return this.applyGenericTransform(value, transformConfig);
      
      case 'array_transform':
        return this.applyArrayTransform(value, transformConfig);
      
      case 'function':
        return this.applyFunctionTransform(value, transformConfig);
      
      default:
        throw new Error(`Unknown transform function type: ${transformConfig.type}`);
    }
  }

  /**
   * Apply mapping transform
   * @param value - Value to transform
   * @param config - Transform configuration
   * @returns any - Transformed value
   */
  private applyMappingTransform(value: any, config: any): any {
    if (!config.mapping || typeof config.mapping !== 'object') {
      return value;
    }
    
    return config.mapping[value] || value;
  }

  /**
   * Apply generic transform
   * @param value - Value to transform
   * @param config - Transform configuration
   * @returns any - Transformed value
   */
  private applyGenericTransform(value: any, config: any): any {
    // Apply various generic transformations based on config
    if (config.operation === 'scale') {
      if (typeof value === 'number' && config.factor !== undefined) {
        return value * config.factor;
      }
    }
    
    if (config.operation === 'offset') {
      if (typeof value === 'number' && config.offset !== undefined) {
        return value + config.offset;
      }
    }
    
    if (config.operation === 'clamp') {
      if (typeof value === 'number') {
        let result = value;
        if (config.min !== undefined) result = Math.max(result, config.min);
        if (config.max !== undefined) result = Math.min(result, config.max);
        return result;
      }
    }
    
    return value;
  }

  /**
   * Apply array transform
   * @param value - Value to transform
   * @param config - Transform configuration
   * @returns any - Transformed value
   */
  private applyArrayTransform(value: any, config: any): any {
    if (!Array.isArray(value)) {
      return value;
    }
    
    if (config.operation === 'map') {
      return value.map((item: any) => {
        if (config.itemMapping) {
          return this.applyMappingTransform(item, config.itemMapping);
        }
        return item;
      });
    }
    
    if (config.operation === 'filter') {
      return value.filter((item: any) => {
        if (config.filterField) {
          return item[config.filterField] !== undefined;
        }
        return true;
      });
    }
    
    return value;
  }

  /**
   * Apply function transform
   * @param value - Value to transform
   * @param config - Transform configuration
   * @returns any - Transformed value
   */
  private applyFunctionTransform(value: any, config: any): any {
    // For complex functions, we might need to implement specific logic
    // For now, return the value as-is
    return value;
  }

  /**
   * Apply final transformations
   * @param data - Data to transform
   * @returns Promise<any> - Transformed data
   */
  private async applyFinalTransformations(data: any): Promise<any> {
    // Additional post-processing can be added here
    // For example, data normalization, format adjustments, etc.
    
    this.debug('debug', 'Applying final transformations', {
      fieldCount: Object.keys(data).length,
      dataType: typeof data
    }, 'applyFinalTransformations');
    
    return data;
  }
}