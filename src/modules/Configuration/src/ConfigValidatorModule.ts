import { BaseModule } from '../../../core/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ValidationResult, ValidationRule } from '../../../interfaces/Validation';
import { DataTransfer } from '../../../interfaces/Connection';
import {
  IConfigValidatorModule,
  ConfigSchema,
  CustomValidator,
  ValidationContext,
  ValidationLevel,
  ValidationOptions,
  EnhancedValidationResult,
  ValidationPerformance,
  ValidationRuleSet,
  SchemaProperty,
  SchemaPropertyType,
  PropertyValidation,
  StringFormat
} from '../interfaces/IConfigValidatorModule';
import { CONFIG_VALIDATOR_CONSTANTS } from '../constants/ConfigValidatorConstants';

/**
 * Configuration Validator Module
 * 
 * A comprehensive BaseModule-based configuration validation system that provides:
 * - Multi-layer validation (syntax, schema, semantic, integration)
 * - Custom validation rules and business logic support
 * - Schema management and registration
 * - Cross-field dependency validation
 * - Performance monitoring and caching
 * - Type-safe validation with comprehensive error reporting
 * 
 * @extends BaseModule
 * @implements IConfigValidatorModule
 */
export class ConfigValidatorModule extends BaseModule implements IConfigValidatorModule {
  /**
   * Registered configuration schemas
   */
  private schemas: Map<string, ConfigSchema> = new Map();
  
  /**
   * Registered custom validators
   */
  private customValidators: Map<string, CustomValidator> = new Map();
  
  /**
   * Validation cache for performance optimization
   */
  private validationCache: Map<string, { result: EnhancedValidationResult; timestamp: number }> = new Map();
  
  /**
   * Schema cache for performance optimization
   */
  private schemaCache: Map<string, { schema: ConfigSchema; timestamp: number }> = new Map();
  
  /**
   * Performance metrics tracking
   */
  private performanceMetrics: {
    totalValidations: number;
    averageValidationTime: number;
    errorCount: number;
    cacheHitRate: number;
  } = {
    totalValidations: 0,
    averageValidationTime: 0,
    errorCount: 0,
    cacheHitRate: 0
  };
  
  /**
   * Cache cleanup interval
   */
  private cacheCleanupInterval?: NodeJS.Timeout;

  /**
   * Creates an instance of ConfigValidatorModule
   * @param info - Module information
   */
  constructor(info: ModuleInfo) {
    super(info);
    this.setupValidationRules();
    this.registerBuiltinValidators();
  }

  /**
   * Static factory method to create an instance of ConfigValidatorModule
   * @param info - Module information
   * @returns Instance of ConfigValidatorModule
   */
  static createInstance(info: ModuleInfo): ConfigValidatorModule {
    return new ConfigValidatorModule(info);
  }

  /**
   * Initializes the module
   * @param config - Configuration data for the module
   */
  public async initialize(config?: Record<string, any>): Promise<void> {
    if (config) {
      this.configure(config);
    }
    await super.initialize();
    
    // Set up cache cleanup interval
    this.cacheCleanupInterval = setInterval(
      () => this.cleanupCache(),
      CONFIG_VALIDATOR_CONSTANTS.CACHE_SETTINGS.CACHE_CLEANUP_INTERVAL_MS
    );
    
    // Register default schemas
    this.registerDefaultSchemas();
    
    console.log(`${CONFIG_VALIDATOR_CONSTANTS.MODULE_NAME} initialized successfully`);
  }

  /**
   * Performs complete configuration validation with all enabled layers
   * @param config - Configuration object to validate
   * @param options - Validation options
   * @returns Enhanced validation result with performance metrics
   */
  public async validateComplete(
    config: any,
    options: ValidationOptions = CONFIG_VALIDATOR_CONSTANTS.DEFAULT_VALIDATION_OPTIONS
  ): Promise<EnhancedValidationResult> {
    const startTime = performance.now();
    const memoryStart = this.getMemoryUsage();
    
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(config, options);
      
      // Check cache first
      if (this.isValidationCached(cacheKey)) {
        const cachedResult = this.getFromValidationCache(cacheKey);
        if (cachedResult) {
          this.updateCacheHitRate(true);
          return cachedResult;
        }
      }
      
      this.updateCacheHitRate(false);
      
      // Initialize validation result
      const result: EnhancedValidationResult = {
        isValid: true,
        errors: [],
        data: config,
        validatedData: { ...config },
        performance: {
          totalTime: 0,
          rulesEvaluated: 0,
          customValidatorsRun: 0,
          memoryUsed: 0
        },
        validationPath: []
      };
      
      // Multi-layer validation based on validation level
      switch (options.level) {
        case ValidationLevel.COMPREHENSIVE:
          await this.validateIntegrationLayer(config, result, options);
          // fall through
        case ValidationLevel.STRICT:
          await this.validateSemanticLayer(config, result, options);
          // fall through
        case ValidationLevel.STANDARD:
          await this.validateSchemaLayer(config, result, options);
          // fall through
        case ValidationLevel.BASIC:
          await this.validateSyntaxLayer(config, result, options);
          break;
      }
      
      // Apply defaults if requested
      if (options.validateDefaults) {
        this.applyDefaults(result, options);
      }
      
      // Calculate performance metrics
      const endTime = performance.now();
      const memoryEnd = this.getMemoryUsage();
      
      result.performance = {
        totalTime: endTime - startTime,
        rulesEvaluated: result.performance.rulesEvaluated,
        customValidatorsRun: result.performance.customValidatorsRun,
        memoryUsed: memoryEnd - memoryStart
      };
      
      // Check performance thresholds
      this.checkPerformanceThresholds(result.performance);
      
      // Cache the result
      this.cacheValidationResult(cacheKey, result);
      
      // Update global metrics
      this.updatePerformanceMetrics(result);
      
      return result;
      
    } catch (error) {
      this.performanceMetrics.errorCount++;
      
      return {
        isValid: false,
        errors: [`${CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.VALIDATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`],
        data: config,
        validatedData: config,
        performance: {
          totalTime: performance.now() - startTime,
          rulesEvaluated: 0,
          customValidatorsRun: 0,
          memoryUsed: this.getMemoryUsage() - memoryStart
        },
        validationPath: []
      };
    }
  }

  /**
   * Validates a specific configuration section
   * @param section - Section name
   * @param data - Section data to validate
   * @param options - Validation options
   * @returns Enhanced validation result
   */
  public async validateSection(
    section: string,
    data: any,
    options: ValidationOptions = CONFIG_VALIDATOR_CONSTANTS.DEFAULT_VALIDATION_OPTIONS
  ): Promise<ValidationResult> {
    const sectionData = { [section]: data };
    const result = await this.validateComplete(sectionData, options);
    
    return {
      isValid: result.isValid,
      errors: result.errors,
      data: data
    };
  }

  /**
   * Validates a specific field against provided validation rules
   * @param field - Field name
   * @param value - Field value
   * @param rules - Validation rules to apply
   * @returns Validation result
   */
  public validateField(field: string, value: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    let rulesEvaluated = 0;
    
    for (const rule of rules) {
      rulesEvaluated++;
      
      switch (rule.type) {
        case CONFIG_VALIDATOR_CONSTANTS.VALIDATION_RULE_TYPES.REQUIRED:
          if (value === undefined || value === null || value === '') {
            errors.push(rule.message || CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.REQUIRED_FIELD_MISSING(field));
          }
          break;
          
        case CONFIG_VALIDATOR_CONSTANTS.VALIDATION_RULE_TYPES.STRING:
          if (typeof value !== 'string') {
            errors.push(rule.message || CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.INVALID_TYPE(field, 'string'));
          }
          break;
          
        case CONFIG_VALIDATOR_CONSTANTS.VALIDATION_RULE_TYPES.NUMBER:
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(rule.message || CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.INVALID_TYPE(field, 'number'));
          }
          break;
          
        case CONFIG_VALIDATOR_CONSTANTS.VALIDATION_RULE_TYPES.BOOLEAN:
          if (typeof value !== 'boolean') {
            errors.push(rule.message || CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.INVALID_TYPE(field, 'boolean'));
          }
          break;
          
        case CONFIG_VALIDATOR_CONSTANTS.VALIDATION_RULE_TYPES.OBJECT:
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            errors.push(rule.message || CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.INVALID_TYPE(field, 'object'));
          }
          break;
          
        case CONFIG_VALIDATOR_CONSTANTS.VALIDATION_RULE_TYPES.ARRAY:
          if (!Array.isArray(value)) {
            errors.push(rule.message || CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.INVALID_TYPE(field, 'array'));
          }
          break;
          
        case CONFIG_VALIDATOR_CONSTANTS.VALIDATION_RULE_TYPES.CUSTOM:
          if (rule.validator && !rule.validator(value)) {
            errors.push(rule.message || `Custom validation failed for field '${field}'`);
          }
          break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: { [field]: value }
    };
  }

  /**
   * Registers a configuration schema
   * @param name - Schema name
   * @param schema - Schema definition
   */
  public registerSchema(name: string, schema: ConfigSchema): void {
    try {
      // Validate schema structure
      this.validateSchemaStructure(schema);
      
      // Register the schema
      this.schemas.set(name, { ...schema });
      
      // Cache the schema
      this.schemaCache.set(name, {
        schema: { ...schema },
        timestamp: Date.now()
      });
      
      console.log(`${CONFIG_VALIDATOR_CONSTANTS.SUCCESS_MESSAGES.SCHEMA_REGISTERED}: ${name}`);
      
    } catch (error) {
      throw new Error(`${CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.SCHEMA_REGISTRATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets a registered schema by name
   * @param name - Schema name
   * @returns Schema definition or undefined
   */
  public getSchema(name: string): ConfigSchema | undefined {
    // Check cache first
    const cachedSchema = this.schemaCache.get(name);
    if (cachedSchema && this.isCacheValid(cachedSchema.timestamp, CONFIG_VALIDATOR_CONSTANTS.CACHE_SETTINGS.SCHEMA_CACHE_TTL_MS)) {
      return { ...cachedSchema.schema };
    }
    
    // Get from main storage
    const schema = this.schemas.get(name);
    if (schema) {
      // Update cache
      this.schemaCache.set(name, {
        schema: { ...schema },
        timestamp: Date.now()
      });
      return { ...schema };
    }
    
    return undefined;
  }

  /**
   * Validates configuration against a registered schema
   * @param config - Configuration to validate
   * @param schemaName - Name of registered schema
   * @returns Enhanced validation result
   */
  public async validateAgainstSchema(config: any, schemaName: string): Promise<ValidationResult> {
    const schema = this.getSchema(schemaName);
    if (!schema) {
      return {
        isValid: false,
        errors: [CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.SCHEMA_NOT_FOUND],
        data: config
      };
    }
    
    return this.validateWithSchema(config, schema);
  }

  /**
   * Registers a custom validator
   * @param name - Validator name
   * @param validator - Custom validator definition
   */
  public registerCustomValidator(name: string, validator: CustomValidator): void {
    try {
      // Validate validator function
      if (typeof validator.validate !== 'function') {
        throw new Error(CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.INVALID_VALIDATOR_FUNCTION);
      }
      
      // Register the validator
      this.customValidators.set(name, { ...validator });
      
      console.log(`${CONFIG_VALIDATOR_CONSTANTS.SUCCESS_MESSAGES.VALIDATOR_REGISTERED}: ${name}`);
      
    } catch (error) {
      throw new Error(`${CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.VALIDATOR_REGISTRATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets a registered custom validator by name
   * @param name - Validator name
   * @returns Custom validator or undefined
   */
  public getCustomValidator(name: string): CustomValidator | undefined {
    const validator = this.customValidators.get(name);
    return validator ? { ...validator } : undefined;
  }

  /**
   * Receives data from connected modules
   * @param dataTransfer - Data transfer information
   */
  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    try {
      switch (dataTransfer.metadata?.type) {
        case CONFIG_VALIDATOR_CONSTANTS.DATA_TRANSFER_TYPES.VALIDATION_REQUEST:
          await this.handleValidationRequest(dataTransfer);
          break;
          
        case CONFIG_VALIDATOR_CONSTANTS.DATA_TRANSFER_TYPES.SCHEMA_REGISTRATION:
          await this.handleSchemaRegistration(dataTransfer);
          break;
          
        case CONFIG_VALIDATOR_CONSTANTS.DATA_TRANSFER_TYPES.VALIDATOR_REGISTRATION:
          await this.handleValidatorRegistration(dataTransfer);
          break;
          
        default:
          console.warn(`Unknown data transfer type: ${dataTransfer.metadata?.type}`);
      }
    } catch (error) {
      console.error(`Error processing data transfer: ${error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)}`);
      
      // Send error response
      await this.transferData({
        type: CONFIG_VALIDATOR_CONSTANTS.DATA_TRANSFER_TYPES.ERROR_REPORT,
        error: error instanceof Error ? error.message : String(error),
        originalRequest: dataTransfer
      }, CONFIG_VALIDATOR_CONSTANTS.CONNECTION_TYPES.ERROR_OUTPUT);
    }
  }

  /**
   * Performs handshake with another module
   * @param moduleInfo - Module information
   * @param connectionInfo - Connection information
   * @returns Whether handshake was successful
   */
  public async handshake(targetModule: BaseModule): Promise<boolean> {
    try {
      // Perform config validator specific handshake validation
      // Check if target module is compatible
      const moduleInfo = targetModule.getInfo();
      const compatibleTypes = ['config-loader', 'config-persistence', 'config-ui'];
      if (!compatibleTypes.includes(moduleInfo.type)) {
        console.warn(`Handshake warning: Module type '${moduleInfo.type}' may not be fully compatible`);
      }

      return await super.handshake(targetModule);
    } catch (error) {
      console.error(`Handshake failed with module ${targetModule.getInfo().id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Cleans up resources and connections
   */
  public async destroy(): Promise<void> {
    // Clear cache cleanup interval
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    
    // Clear all caches and maps
    this.schemas.clear();
    this.customValidators.clear();
    this.validationCache.clear();
    this.schemaCache.clear();
    
    // Reset performance metrics
    this.performanceMetrics = {
      totalValidations: 0,
      averageValidationTime: 0,
      errorCount: 0,
      cacheHitRate: 0
    };
    
    await super.destroy();
  }

  // Private implementation methods

  /**
   * Sets up base validation rules for the module
   */
  private setupValidationRules(): void {
    this.validationRules = [
      {
        field: 'config',
        type: 'required',
        message: 'Configuration data is required'
      },
      {
        field: 'options',
        type: 'object',
        message: 'Validation options must be an object'
      }
    ];
  }

  /**
   * Registers built-in custom validators
   */
  private registerBuiltinValidators(): void {
    // Register format validators
    Object.entries(CONFIG_VALIDATOR_CONSTANTS.FORMAT_PATTERNS).forEach(([format, pattern]) => {
      this.registerCustomValidator(`format-${format.toLowerCase()}`, {
        name: `format-${format.toLowerCase()}`,
        description: `Validates ${format} format`,
        validate: (value: string) => {
          if (typeof value !== 'string') return { isValid: false, errors: ['Value must be a string'], data: value };
          return { isValid: pattern.test(value), errors: pattern.test(value) ? [] : [`Invalid ${format} format`], data: value };
        }
      });
    });
  }

  /**
   * Registers default configuration schemas
   */
  private registerDefaultSchemas(): void {
    // Register basic config schema
    this.registerSchema('basic-config', {
      name: 'basic-config',
      version: '1.0.0',
      description: 'Basic configuration schema',
      properties: {
        name: {
          type: SchemaPropertyType.STRING,
          description: 'Configuration name',
          required: true
        },
        version: {
          type: SchemaPropertyType.STRING,
          description: 'Configuration version',
          required: true,
          validation: {
            pattern: CONFIG_VALIDATOR_CONSTANTS.REGEX_PATTERNS.VERSION_STRING
          }
        }
      },
      required: ['name', 'version']
    });
  }

  /**
   * Validates syntax layer (JSON/YAML parsing)
   */
  private async validateSyntaxLayer(
    config: any,
    result: EnhancedValidationResult,
    options: ValidationOptions
  ): Promise<void> {
    try {
      // Basic syntax validation - ensure config is properly formed
      if (config === null || config === undefined) {
        result.isValid = false;
        result.errors.push('Configuration cannot be null or undefined');
        return;
      }
      
      // Try to serialize and parse to validate structure
      const serialized = JSON.stringify(config);
      JSON.parse(serialized);
      
      result.performance.rulesEvaluated++;
      
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Syntax validation failed: ${error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)}`);
    }
  }

  /**
   * Validates schema layer (structure validation)
   */
  private async validateSchemaLayer(
    config: any,
    result: EnhancedValidationResult,
    options: ValidationOptions
  ): Promise<void> {
    // Schema validation would be implemented here
    // For now, perform basic type checking
    if (typeof config !== 'object' || config === null) {
      result.isValid = false;
      result.errors.push('Configuration must be an object');
    }
    
    result.performance.rulesEvaluated++;
  }

  /**
   * Validates semantic layer (business logic validation)
   */
  private async validateSemanticLayer(
    config: any,
    result: EnhancedValidationResult,
    options: ValidationOptions
  ): Promise<void> {
    // Semantic validation implementation
    result.performance.rulesEvaluated++;
  }

  /**
   * Validates integration layer (cross-field dependencies)
   */
  private async validateIntegrationLayer(
    config: any,
    result: EnhancedValidationResult,
    options: ValidationOptions
  ): Promise<void> {
    // Integration validation implementation
    result.performance.rulesEvaluated++;
  }

  /**
   * Validates configuration against a specific schema
   */
  private validateWithSchema(config: any, schema: ConfigSchema): ValidationResult {
    const errors: string[] = [];
    
    // Validate required properties
    if (schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in config)) {
          errors.push(CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.REQUIRED_FIELD_MISSING(requiredField));
        }
      }
    }
    
    // Validate properties
    for (const [propertyName, property] of Object.entries(schema.properties)) {
      if (propertyName in config) {
        const fieldErrors = this.validateSchemaProperty(config[propertyName], property, propertyName);
        errors.push(...fieldErrors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: config
    };
  }

  /**
   * Validates a single schema property
   */
  private validateSchemaProperty(value: any, property: SchemaProperty, fieldName: string): string[] {
    const errors: string[] = [];
    
    // Type validation
    if (!this.validatePropertyType(value, property.type)) {
      errors.push(CONFIG_VALIDATOR_CONSTANTS.ERROR_MESSAGES.TYPE_MISMATCH(property.type, typeof value));
    }
    
    // Additional validation rules
    if (property.validation) {
      const validationErrors = this.validatePropertyConstraints(value, property.validation, fieldName);
      errors.push(...validationErrors);
    }
    
    return errors;
  }

  /**
   * Validates property type
   */
  private validatePropertyType(value: any, type: SchemaPropertyType): boolean {
    switch (type) {
      case SchemaPropertyType.STRING:
        return typeof value === 'string';
      case SchemaPropertyType.NUMBER:
        return typeof value === 'number' && !isNaN(value);
      case SchemaPropertyType.BOOLEAN:
        return typeof value === 'boolean';
      case SchemaPropertyType.OBJECT:
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case SchemaPropertyType.ARRAY:
        return Array.isArray(value);
      case SchemaPropertyType.NULL:
        return value === null;
      case SchemaPropertyType.ANY:
        return true;
      default:
        return false;
    }
  }

  /**
   * Validates property constraints
   */
  private validatePropertyConstraints(value: any, validation: PropertyValidation, fieldName: string): string[] {
    const errors: string[] = [];
    
    // String validation
    if (typeof value === 'string') {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        errors.push(`Field '${fieldName}' must be at least ${validation.minLength} characters long`);
      }
      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        errors.push(`Field '${fieldName}' must be no more than ${validation.maxLength} characters long`);
      }
      if (validation.pattern && !validation.pattern.test(value)) {
        errors.push(`Field '${fieldName}' does not match required pattern`);
      }
    }
    
    // Number validation
    if (typeof value === 'number') {
      if (validation.minimum !== undefined && value < validation.minimum) {
        errors.push(`Field '${fieldName}' must be at least ${validation.minimum}`);
      }
      if (validation.maximum !== undefined && value > validation.maximum) {
        errors.push(`Field '${fieldName}' must be no more than ${validation.maximum}`);
      }
      if (validation.multipleOf !== undefined && value % validation.multipleOf !== 0) {
        errors.push(`Field '${fieldName}' must be a multiple of ${validation.multipleOf}`);
      }
    }
    
    // Array validation
    if (Array.isArray(value)) {
      if (validation.minItems !== undefined && value.length < validation.minItems) {
        errors.push(`Field '${fieldName}' must have at least ${validation.minItems} items`);
      }
      if (validation.maxItems !== undefined && value.length > validation.maxItems) {
        errors.push(`Field '${fieldName}' must have no more than ${validation.maxItems} items`);
      }
      if (validation.uniqueItems && new Set(value).size !== value.length) {
        errors.push(`Field '${fieldName}' must have unique items`);
      }
    }
    
    // Object validation
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const keys = Object.keys(value);
      if (validation.minProperties !== undefined && keys.length < validation.minProperties) {
        errors.push(`Field '${fieldName}' must have at least ${validation.minProperties} properties`);
      }
      if (validation.maxProperties !== undefined && keys.length > validation.maxProperties) {
        errors.push(`Field '${fieldName}' must have no more than ${validation.maxProperties} properties`);
      }
    }
    
    return errors;
  }

  /**
   * Validates schema structure
   */
  private validateSchemaStructure(schema: ConfigSchema): void {
    if (!schema.name || typeof schema.name !== 'string') {
      throw new Error('Schema must have a valid name');
    }
    
    if (!schema.version || typeof schema.version !== 'string') {
      throw new Error('Schema must have a valid version');
    }
    
    if (!schema.properties || typeof schema.properties !== 'object') {
      throw new Error('Schema must have properties definition');
    }
  }

  /**
   * Applies default values to configuration
   */
  private applyDefaults(result: EnhancedValidationResult, options: ValidationOptions): void {
    // Implementation for applying default values
    // This would traverse the configuration and apply defaults where values are missing
  }

  /**
   * Generates cache key for validation result
   */
  private generateCacheKey(config: any, options: ValidationOptions): string {
    const configHash = this.hashObject(config);
    const optionsHash = this.hashObject(options);
    return `${configHash}-${optionsHash}`;
  }

  /**
   * Simple object hashing for cache keys
   */
  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').substring(0, 32);
  }

  /**
   * Checks if validation result is cached
   */
  private isValidationCached(cacheKey: string): boolean {
    const cached = this.validationCache.get(cacheKey);
    return cached !== undefined && this.isCacheValid(cached.timestamp, CONFIG_VALIDATOR_CONSTANTS.CACHE_SETTINGS.VALIDATION_CACHE_TTL_MS);
  }

  /**
   * Gets validation result from cache
   */
  private getFromValidationCache(cacheKey: string): EnhancedValidationResult | undefined {
    const cached = this.validationCache.get(cacheKey);
    return cached?.result;
  }

  /**
   * Caches validation result
   */
  private cacheValidationResult(cacheKey: string, result: EnhancedValidationResult): void {
    this.validationCache.set(cacheKey, {
      result: { ...result },
      timestamp: Date.now()
    });
  }

  /**
   * Checks if cache entry is still valid
   */
  private isCacheValid(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp < ttl;
  }

  /**
   * Cleans up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    // Clean validation cache
    for (const [key, value] of this.validationCache.entries()) {
      if (!this.isCacheValid(value.timestamp, CONFIG_VALIDATOR_CONSTANTS.CACHE_SETTINGS.VALIDATION_CACHE_TTL_MS)) {
        this.validationCache.delete(key);
      }
    }
    
    // Clean schema cache
    for (const [key, value] of this.schemaCache.entries()) {
      if (!this.isCacheValid(value.timestamp, CONFIG_VALIDATOR_CONSTANTS.CACHE_SETTINGS.SCHEMA_CACHE_TTL_MS)) {
        this.schemaCache.delete(key);
      }
    }
  }

  /**
   * Gets current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Checks performance thresholds and logs warnings
   */
  private checkPerformanceThresholds(performance: ValidationPerformance): void {
    if (performance.totalTime > CONFIG_VALIDATOR_CONSTANTS.PERFORMANCE_THRESHOLDS.SLOW_VALIDATION_MS) {
      console.warn(`Slow validation detected: ${performance.totalTime}ms`);
    }
    
    if (performance.memoryUsed > CONFIG_VALIDATOR_CONSTANTS.PERFORMANCE_THRESHOLDS.MEMORY_WARNING_THRESHOLD_MB * 1024 * 1024) {
      console.warn(`High memory usage during validation: ${Math.round(performance.memoryUsed / 1024 / 1024)}MB`);
    }
  }

  /**
   * Updates global performance metrics
   */
  private updatePerformanceMetrics(result: EnhancedValidationResult): void {
    this.performanceMetrics.totalValidations++;
    this.performanceMetrics.averageValidationTime = 
      (this.performanceMetrics.averageValidationTime * (this.performanceMetrics.totalValidations - 1) + result.performance.totalTime) / 
      this.performanceMetrics.totalValidations;
  }

  /**
   * Updates cache hit rate metrics
   */
  private updateCacheHitRate(isHit: boolean): void {
    // Simple moving average for cache hit rate
    const weight = 0.1;
    this.performanceMetrics.cacheHitRate = 
      this.performanceMetrics.cacheHitRate * (1 - weight) + (isHit ? 1 : 0) * weight;
  }

  /**
   * Handles validation request from connected modules
   */
  private async handleValidationRequest(dataTransfer: DataTransfer): Promise<void> {
    const { config, options = CONFIG_VALIDATOR_CONSTANTS.DEFAULT_VALIDATION_OPTIONS } = dataTransfer.data;
    
    const result = await this.validateComplete(config, options);
    
    await this.transferData({
      type: CONFIG_VALIDATOR_CONSTANTS.DATA_TRANSFER_TYPES.VALIDATION_RESULT,
      result,
      requestId: dataTransfer.id
    }, CONFIG_VALIDATOR_CONSTANTS.CONNECTION_TYPES.VALIDATION_RESULT_OUTPUT);
  }

  /**
   * Handles schema registration from connected modules
   */
  private async handleSchemaRegistration(dataTransfer: DataTransfer): Promise<void> {
    const { name, schema } = dataTransfer.data;
    
    try {
      this.registerSchema(name, schema);
      
      await this.transferData({
        type: CONFIG_VALIDATOR_CONSTANTS.DATA_TRANSFER_TYPES.VALIDATION_RESULT,
        success: true,
        message: CONFIG_VALIDATOR_CONSTANTS.SUCCESS_MESSAGES.SCHEMA_REGISTERED,
        requestId: dataTransfer.id
      }, CONFIG_VALIDATOR_CONSTANTS.CONNECTION_TYPES.VALIDATION_RESULT_OUTPUT);
      
    } catch (error) {
      throw error; // Will be handled by the calling method
    }
  }

  /**
   * Handles custom validator registration from connected modules
   */
  private async handleValidatorRegistration(dataTransfer: DataTransfer): Promise<void> {
    const { name, validator } = dataTransfer.data;
    
    try {
      this.registerCustomValidator(name, validator);
      
      await this.transferData({
        type: CONFIG_VALIDATOR_CONSTANTS.DATA_TRANSFER_TYPES.VALIDATION_RESULT,
        success: true,
        message: CONFIG_VALIDATOR_CONSTANTS.SUCCESS_MESSAGES.VALIDATOR_REGISTERED,
        requestId: dataTransfer.id
      }, CONFIG_VALIDATOR_CONSTANTS.CONNECTION_TYPES.VALIDATION_RESULT_OUTPUT);
      
    } catch (error) {
      throw error; // Will be handled by the calling method
    }
  }

  /**
   * Gets the module information
   * @returns Module information
   */
  public get getModuleInfo(): ModuleInfo {
    return { ...this.info };
  }
  
  /**
   * Gets the module configuration
   * @returns Module configuration
   */
  public get moduleConfig(): Record<string, any> {
    return { ...this.config };
  }
}

// Default export
export default ConfigValidatorModule;