import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import * as fs from 'fs';
import * as path from 'path';

/**
 * LLMSwitch Module - Protocol conversion and field mapping
 * Does NOT handle model mapping or routing as per requirements
 */
export interface LLMSwitchConfig {
  /** Input protocol type */
  inputProtocol: string;
  /** Output protocol type */
  outputProtocol: string;
  /** Transform table name */
  transformTable: string;
  /** Enable strict mode for validation */
  strictMode?: boolean;
  /** Caching configuration */
  caching?: {
    enabled: boolean;
    ttlMs?: number;
    maxSize?: number;
  };
}

/**
 * Transform mapping configuration
 */
export interface TransformMapping {
  /** Target field name */
  field: string;
  /** Transform function (optional) */
  transform?: (value: any, context?: any) => any;
  /** Default value if source field is missing */
  defaultValue?: any;
  /** Condition function to determine if mapping should be applied */
  condition?: (value: any) => boolean;
}

/**
 * Transform table structure
 */
export interface TransformTable {
  /** Version of the transform table */
  version: string;
  /** Description of the transform table */
  description: string;
  /** Protocol mapping information */
  protocols: {
    input: string;
    output: string;
  };
  /** Request mappings */
  requestMappings: Record<string, string | TransformMapping>;
  /** Response mappings */
  responseMappings: Record<string, string | TransformMapping>;
  /** Validation rules */
  validation?: {
    required?: string[];
    types?: Record<string, string>;
    ranges?: Record<string, { min?: number; max?: number }>;
  };
}

export class LLMSwitchModule extends BasePipelineModule {
  protected override config: LLMSwitchConfig = {} as LLMSwitchConfig;
  private transformTable: TransformTable | null = null;
  private requestCache: Map<string, any> = new Map();
  private responseCache: Map<string, any> = new Map();

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('LLMSwitchModule initialized', { module: this.moduleName }, 'constructor');
  }

  /**
   * Configure the LLMSwitch module
   * @param config - Configuration object
   */
  override async configure(config: LLMSwitchConfig): Promise<void> {
    this.logInfo('Configuring LLMSwitchModule', config, 'configure');
    
    this.config = config;
    
    // Load transform table
    await this.loadTransformTable(config.transformTable);
    
    // Initialize cache if enabled
    if (config.caching?.enabled) {
      this.initializeCache();
    }
    
    await super.configure(config);
    this.logInfo('LLMSwitchModule configured successfully', config, 'configure');
  }

  /**
   * Process request - Core interface implementation
   * Converts input protocol to output protocol format
   * @param request - Input request in source protocol format
   * @returns Promise<any> - Transformed request in target protocol format
   */
  override async process(request: any): Promise<any> {
    this.logInfo('Processing LLMSwitch request', {
      inputProtocol: this.config?.inputProtocol,
      outputProtocol: this.config?.outputProtocol,
      requestSize: JSON.stringify(request).length
    });
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(request, 'request-input', 'external');
      
      // Validate configuration
      if (!this.config) {
        throw new Error('LLMSwitchModule not configured');
      }
      
      // Generate cache key
      const cacheKey = this.generateCacheKey(request, 'request');
      
      // Check cache if enabled
      if (this.config.caching?.enabled && this.requestCache.has(cacheKey)) {
        const cachedResult = this.requestCache.get(cacheKey);
        this.logInfo('Returning cached request transformation', { cacheKey }, 'process');
        return cachedResult;
      }
      
      // Apply protocol conversion
      const transformedRequest = await this.applyRequestTransformation(request);
      
      // Validate transformed request
      await this.validateTransformedRequest(transformedRequest);
      
      // Cache result if enabled
      if (this.config.caching?.enabled) {
        this.cacheRequestResult(cacheKey, transformedRequest);
      }
      
      // Log output data at output port
      this.logOutputPort(transformedRequest, 'request-output', 'next-module');
      
      this.debug('debug', 'LLMSwitch request processing complete', { data: transformedRequest, processingTime: Date.now() - startTime }, 'process');
      
      return transformedRequest;
    } catch (error) {
      this.error('Error processing request', { error: error as Error, operation: 'process' }, 'process');
      throw error;
    }
  }

  /**
   * Process response - Handle response transformation
   * @param response - Response in target protocol format
   * @returns Promise<any> - Transformed response in source protocol format
   */
  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing LLMSwitch response', {
      inputProtocol: this.config?.inputProtocol,
      outputProtocol: this.config?.outputProtocol,
      responseSize: JSON.stringify(response).length
    }, 'processResponse');
    
    const startTime = Date.now();
    
    try {
      // Log input data at input port
      this.logInputPort(response, 'response-input', 'next-module');
      
      // Validate configuration
      if (!this.config) {
        throw new Error('LLMSwitchModule not configured');
      }
      
      // Generate cache key
      const cacheKey = this.generateCacheKey(response, 'response');
      
      // Check cache if enabled
      if (this.config.caching?.enabled && this.responseCache.has(cacheKey)) {
        const cachedResult = this.responseCache.get(cacheKey);
        this.logInfo('Returning cached response transformation', { cacheKey }, 'processResponse');
        return cachedResult;
      }
      
      // Apply protocol conversion (reverse)
      const transformedResponse = await this.applyResponseTransformation(response);
      
      // Validate transformed response
      await this.validateTransformedResponse(transformedResponse);
      
      // Cache result if enabled
      if (this.config.caching?.enabled) {
        this.cacheResponseResult(cacheKey, transformedResponse);
      }
      
      // Log output data at output port
      this.logOutputPort(transformedResponse, 'response-output', 'external');
      
      this.debug('debug', 'LLMSwitch response processing complete', { data: transformedResponse, processingTime: Date.now() - startTime }, 'processResponse');
      
      return transformedResponse;
    } catch (error) {
      this.error('Error processing response', { error: error as Error, operation: 'processResponse' }, 'processResponse');
      throw error;
    }
  }

  /**
   * Load transform table
   * @param tableName - Name of the transform table to load
   */
  private async loadTransformTable(tableName: string): Promise<void> {
    this.logInfo(`Loading transform table: ${tableName}`, {}, 'loadTransformTable');
    
    try {
      // Load transform table
      this.transformTable = await this.getTransformTable(tableName);
      
      if (!this.transformTable) {
        throw new Error(`Transform table not found: ${tableName}`);
      }
      
      // Validate transform table protocols
      if (this.transformTable.protocols.input !== this.config?.inputProtocol ||
          this.transformTable.protocols.output !== this.config?.outputProtocol) {
        throw new Error(`Transform table protocol mismatch: expected ${this.config?.inputProtocol}→${this.config?.outputProtocol}, got ${this.transformTable.protocols.input}→${this.transformTable.protocols.output}`);
      }
      
      this.logInfo(`Transform table loaded successfully: ${tableName}`, {
        inputProtocol: this.transformTable.protocols.input,
        outputProtocol: this.transformTable.protocols.output
      }, 'loadTransformTable');
    } catch (error) {
      this.error('Error loading transform table', { error: error as Error, tableName }, 'loadTransformTable');
      throw error;
    }
  }

  /**
   * Get transform table by name - load from JSON file
   * @param tableName - Name of the transform table
   * @returns Promise<TransformTable> - Transform table
   */
  private async getTransformTable(tableName: string): Promise<TransformTable> {
    try {
      // Construct path to transform table file
      const transformTablePath = path.join(__dirname, '..', 'mapping-tables', `${tableName}.json`);
      
      this.logInfo(`Loading transform table from file: ${transformTablePath}`, {}, 'getTransformTable');
      
      // Check if file exists
      if (!fs.existsSync(transformTablePath)) {
        throw new Error(`Transform table file not found: ${transformTablePath}`);
      }
      
      // Read and parse JSON file
      const fileContent = fs.readFileSync(transformTablePath, 'utf-8');
      const transformTable = JSON.parse(fileContent) as TransformTable;
      
      // Validate transform table structure
      this.validateTransformTableStructure(transformTable, tableName);
      
      this.logInfo(`Transform table loaded successfully: ${tableName}`, {
        version: transformTable.version,
        protocols: transformTable.protocols,
        requestMappingCount: Object.keys(transformTable.requestMappings).length,
        responseMappingCount: Object.keys(transformTable.responseMappings).length
      }, 'getTransformTable');
      
      return transformTable;
    } catch (error) {
      this.logError(`Failed to load transform table: ${tableName}`, error, 'getTransformTable');
      throw error;
    }
  }
  
  /**
   * Validate transform table structure
   * @param transformTable - Transform table to validate
   * @param tableName - Name of the transform table
   */
  private validateTransformTableStructure(transformTable: any, tableName: string): void {
    const requiredFields = ['version', 'description', 'protocols', 'requestMappings', 'responseMappings'];
    
    for (const field of requiredFields) {
      if (!(field in transformTable)) {
        throw new Error(`Transform table ${tableName} is missing required field: ${field}`);
      }
    }
    
    if (!transformTable.protocols.input || !transformTable.protocols.output) {
      throw new Error(`Transform table ${tableName} must specify input and output protocols`);
    }
    
    if (!transformTable.requestMappings || typeof transformTable.requestMappings !== 'object') {
      throw new Error(`Transform table ${tableName} must have valid requestMappings`);
    }
    
    if (!transformTable.responseMappings || typeof transformTable.responseMappings !== 'object') {
      throw new Error(`Transform table ${tableName} must have valid responseMappings`);
    }
  }

  /**
   * Apply request transformation
   * @param request - Input request
   * @returns Promise<any> - Transformed request
   */
  private async applyRequestTransformation(request: any): Promise<any> {
    if (!this.transformTable) {
      throw new Error('Transform table not loaded');
    }
    
    const result: any = {};
    
    // Apply field mappings
    for (const [sourcePath, mappingConfig] of Object.entries(this.transformTable.requestMappings)) {
      const sourceValue = this.getNestedValue(request, sourcePath);
      
      if (sourceValue !== undefined) {
        // Check condition if specified
        if (typeof mappingConfig === 'object' && mappingConfig.condition && !mappingConfig.condition(sourceValue)) {
          continue;
        }
        
        // Apply transform if specified
        let transformedValue = sourceValue;
        if (typeof mappingConfig === 'object' && mappingConfig.transform) {
          transformedValue = await this.resolveTransformFunction(mappingConfig.transform, sourceValue, { sourcePath, request });
        }
        
        // Set target field
        const targetField = typeof mappingConfig === 'string' ? mappingConfig : mappingConfig.field;
        this.setNestedValue(result, targetField, transformedValue);
      } else if (typeof mappingConfig === 'object' && mappingConfig.defaultValue !== undefined) {
        // Use default value if source field is missing
        const targetField = mappingConfig.field;
        this.setNestedValue(result, targetField, mappingConfig.defaultValue);
      }
    }
    
    return result;
  }

  /**
   * Apply response transformation
   * @param response - Input response
   * @returns Promise<any> - Transformed response
   */
  private async applyResponseTransformation(response: any): Promise<any> {
    if (!this.transformTable) {
      throw new Error('Transform table not loaded');
    }
    
    const result: any = {};
    
    // Apply field mappings (reverse transformation)
    for (const [sourcePath, mappingConfig] of Object.entries(this.transformTable.responseMappings)) {
      const sourceValue = this.getNestedValue(response, sourcePath);
      
      if (sourceValue !== undefined) {
        // Check condition if specified
        if (typeof mappingConfig === 'object' && mappingConfig.condition && !mappingConfig.condition(sourceValue)) {
          continue;
        }
        
        // Apply transform if specified
        let transformedValue = sourceValue;
        if (typeof mappingConfig === 'object' && mappingConfig.transform) {
          transformedValue = await this.resolveTransformFunction(mappingConfig.transform, sourceValue, { sourcePath, response });
        }
        
        // Set target field
        const targetField = typeof mappingConfig === 'string' ? mappingConfig : mappingConfig.field;
        this.setNestedValue(result, targetField, transformedValue);
      } else if (typeof mappingConfig === 'object' && mappingConfig.defaultValue !== undefined) {
        // Use default value if source field is missing
        const targetField = mappingConfig.field;
        this.setNestedValue(result, targetField, mappingConfig.defaultValue);
      }
    }
    
    return result;
  }

  /**
   * Validate transformed request
   * @param request - Transformed request to validate
   */
  private async validateTransformedRequest(request: any): Promise<void> {
    if (!request || typeof request !== 'object') {
      throw new Error('Invalid transformed request format: expected object');
    }
    
    if (this.config?.strictMode && this.transformTable?.validation) {
      // Validate required fields
      if (this.transformTable.validation.required) {
        for (const field of this.transformTable.validation.required) {
          if (!(field in request)) {
            throw new Error(`Missing required field in transformed request: ${field}`);
          }
        }
      }
      
      // Validate field types
      if (this.transformTable.validation.types) {
        for (const [field, expectedType] of Object.entries(this.transformTable.validation.types)) {
          const value = this.getNestedValue(request, field);
          if (value !== undefined && typeof value !== expectedType) {
            throw new Error(`Invalid type for field ${field}: expected ${expectedType}, got ${typeof value}`);
          }
        }
      }
    }
  }

  /**
   * Validate transformed response
   * @param response - Transformed response to validate
   */
  private async validateTransformedResponse(response: any): Promise<void> {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid transformed response format: expected object');
    }
    
    // Response validation logic would go here
    // Similar to validateTransformedRequest but for response format
  }

  /**
   * Get nested value from object using dot notation path
   * @param obj - Source object
   * @param path - Dot notation path (e.g., 'user.profile.name')
   * @returns any - Value at the path, or undefined if not found
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * Set nested value in object using dot notation path
   * @param obj - Target object
   * @param path - Dot notation path (e.g., 'user.profile.name')
   * @param value - Value to set
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part && (!(part in current) || current[part] === null || typeof current[part] !== 'object')) {
        current[part] = {};
      }
      current = part ? current[part] : current;
    }
    
    const lastPart = parts[parts.length - 1];
    if (lastPart) {
      current[lastPart] = value;
    }
  }

  /**
   * Generate cache key for request/response
   * @param data - Data to generate key for
   * @param type - Type of data ('request' or 'response')
   * @returns string - Cache key
   */
  private generateCacheKey(data: any, type: 'request' | 'response'): string {
    // Simple cache key generation - in production this would be more sophisticated
    const keyData = {
      type,
      protocol: type === 'request' ? this.config?.inputProtocol : this.config?.outputProtocol,
      data: JSON.stringify(data)
    };
    return JSON.stringify(keyData);
  }

  /**
   * Initialize cache
   */
  private initializeCache(): void {
    this.logInfo('Initializing cache', {
      ttlMs: this.config?.caching?.ttlMs,
      maxSize: this.config?.caching?.maxSize
    }, 'initializeCache');
    
    // Set up cache cleanup interval if TTL is configured
    if (this.config?.caching?.ttlMs) {
      setInterval(() => {
        this.cleanupCache();
      }, this.config.caching.ttlMs);
    }
  }

  /**
   * Cache request result
   * @param key - Cache key
   * @param result - Result to cache
   */
  private cacheRequestResult(key: string, result: any): void {
    if (this.requestCache.size >= (this.config?.caching?.maxSize || 1000)) {
      // Remove oldest entry if cache is full
      const firstKey = this.requestCache.keys().next().value;
      if (firstKey) {
        this.requestCache.delete(firstKey);
      }
    }
    
    this.requestCache.set(key, result);
  }

  /**
   * Cache response result
   * @param key - Cache key
   * @param result - Result to cache
   */
  private cacheResponseResult(key: string, result: any): void {
    if (this.responseCache.size >= (this.config?.caching?.maxSize || 1000)) {
      // Remove oldest entry if cache is full
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) {
        this.responseCache.delete(firstKey);
      }
    }
    
    this.responseCache.set(key, result);
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    // This would remove expired entries based on TTL
    // For simplicity, we're using a time-based approach
    this.requestCache.clear();
    this.responseCache.clear();
    
    this.logInfo('Cache cleanup completed', {
      requestCacheSize: this.requestCache.size,
      responseCacheSize: this.responseCache.size
    }, 'cleanupCache');
  }

  /**
   * Resolve transform function from string reference to actual function
   * @param transformRef - Transform function reference (string)
   * @param value - Value to transform
   * @param context - Transformation context
   * @returns Promise<any> - Transformed value
   */
  private async resolveTransformFunction(transformRef: string, value: any, context: any): Promise<any> {
    if (!this.transformTable?.transformFunctions) {
      throw new Error(`No transform functions defined in transform table`);
    }

    const transformConfig = this.transformTable.transformFunctions[transformRef];
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
    const mappings = config.mappings || {};
    const defaultValue = config.defaultValue;
    
    return mappings[value] || defaultValue || value;
  }

  /**
   * Apply generic transform
   * @param value - Value to transform
   * @param config - Transform configuration
   * @returns any - Transformed value
   */
  private applyGenericTransform(value: any, config: any): any {
    switch (config.operation) {
      case 'stringToArray':
        return Array.isArray(value) ? value : value ? [value] : [];
      
      case 'arrayToString':
        return Array.isArray(value) ? value.join(', ') : value;
      
      case 'convertContentToParts':
        return this.convertContentToGeminiParts(value);
      
      case 'extractTextFromParts':
        return this.extractTextFromGeminiParts(value);
      
      default:
        return value;
    }
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

    return value.map(item => {
      const result: any = {};
      
      for (const [field, fieldConfig] of Object.entries(config.elementTransform)) {
        const fieldValue = this.getNestedValue(item, field);
        
        if (fieldValue !== undefined) {
          if (typeof fieldConfig === 'object' && fieldConfig.mapping) {
            result[field] = this.applyMappingTransform(fieldValue, fieldConfig);
          } else if (typeof fieldConfig === 'object' && fieldConfig.transform) {
            result[field] = this.applyGenericTransform(fieldValue, fieldConfig);
          } else if (typeof fieldConfig === 'string') {
            result[field] = fieldValue;
          }
        }
      }
      
      return result;
    });
  }

  /**
   * Apply function transform
   * @param value - Value to transform
   * @param config - Transform configuration
   * @returns any - Transformed value
   */
  private applyFunctionTransform(value: any, config: any): any {
    try {
      // Note: In production, this should use a safe eval approach
      // For now, we'll implement specific known functions
      switch (config.function) {
        case 'Math.floor(Date.now() / 1000)':
          return Math.floor(Date.now() / 1000);
        
        default:
          return value;
      }
    } catch (error) {
      this.logError(`Error applying function transform`, error, 'applyFunctionTransform');
      return value;
    }
  }

  /**
   * Convert OpenAI content to Gemini parts
   * @param content - OpenAI content
   * @returns any - Gemini parts format
   */
  private convertContentToGeminiParts(content: any): any {
    if (typeof content === 'string') {
      return [{ text: content }];
    }
    
    if (Array.isArray(content)) {
      return content.map(item => {
        if (typeof item === 'string') {
          return { text: item };
        }
        return item;
      });
    }
    
    return [{ text: String(content) }];
  }

  /**
   * Extract text from Gemini parts
   * @param parts - Gemini parts
   * @returns string - Extracted text
   */
  private extractTextFromGeminiParts(parts: any): string {
    if (!Array.isArray(parts)) {
      return String(parts);
    }
    
    return parts
      .filter(part => part.text)
      .map(part => part.text)
      .join('');
  }
}