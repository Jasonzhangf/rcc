import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';

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
  protected config: LLMSwitchConfig = {} as LLMSwitchConfig;
  private transformTable: TransformTable | null = null;
  private requestCache: Map<string, any> = new Map();
  private responseCache: Map<string, any> = new Map();

  constructor(info: ModuleInfo) {
    super(info);
    console.log(`[INFO] LLMSwitchModule initialized: ${this.moduleName}`);
  }

  /**
   * Configure the LLMSwitch module
   * @param config - Configuration object
   */
  async configure(config: LLMSwitchConfig): Promise<void> {
    console.log(`[INFO] Configuring LLMSwitchModule:`, config);
    
    this.config = config;
    
    // Load transform table
    await this.loadTransformTable(config.transformTable);
    
    // Initialize cache if enabled
    if (config.caching?.enabled) {
      this.initializeCache();
    }
    
    await super.configure(config);
    console.log(`[INFO] LLMSwitchModule configured successfully`);
  }

  /**
   * Process request - Core interface implementation
   * Converts input protocol to output protocol format
   * @param request - Input request in source protocol format
   * @returns Promise<any> - Transformed request in target protocol format
   */
  async process(request: any): Promise<any> {
    console.log(`[INFO] Processing LLMSwitch request`, {
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
      
      this.logProcessingComplete('LLMSwitch request', transformedRequest, Date.now() - startTime, 'process');
      
      return transformedRequest;
    } catch (error) {
      this.logError(error as Error, { operation: 'process' }, 'process');
      throw error;
    }
  }

  /**
   * Process response - Handle response transformation
   * @param response - Response in target protocol format
   * @returns Promise<any> - Transformed response in source protocol format
   */
  async processResponse(response: any): Promise<any> {
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
      
      this.logProcessingComplete('LLMSwitch response', transformedResponse, Date.now() - startTime, 'processResponse');
      
      return transformedResponse;
    } catch (error) {
      this.logError(error as Error, { operation: 'processResponse' }, 'processResponse');
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
      this.logError(error as Error, { tableName }, 'loadTransformTable');
      throw error;
    }
  }

  /**
   * Get transform table by name (mock implementation)
   * @param tableName - Name of the transform table
   * @returns Promise<TransformTable> - Transform table
   */
  private async getTransformTable(tableName: string): Promise<TransformTable> {
    // This would typically load from a file or database
    // Mock implementation for demonstration
    const mockTables: Record<string, TransformTable> = {
      'anthropic-to-openai-v1': {
        version: '1.0.0',
        description: 'Anthropic to OpenAI protocol conversion',
        protocols: {
          input: 'anthropic',
          output: 'openai'
        },
        requestMappings: {
          'model': 'model',
          'max_tokens': 'max_tokens',
          'messages': {
            field: 'messages',
            transform: (messages: any[]) => {
              return messages.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
              }));
            }
          }
        },
        responseMappings: {
          'choices[0].message.content': 'content',
          'choices[0].message.role': 'role',
          'usage.prompt_tokens': 'usage.input_tokens',
          'usage.completion_tokens': 'usage.output_tokens'
        }
      }
    };
    
    const table = mockTables[tableName];
    if (!table) {
      throw new Error(`Transform table not found: ${tableName}`);
    }
    
    return table;
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
          transformedValue = await mappingConfig.transform(sourceValue, { sourcePath, request });
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
          transformedValue = await mappingConfig.transform(sourceValue, { sourcePath, response });
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
      if (!(part in current) || current[part] === null || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
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
}