import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../../modules/BasePipelineModule';
import { CompatibilityConfig } from '../../../modules/CompatibilityModule';

/**
 * JSON Compatibility Module
 * Handles JSON field mapping and schema transformation
 */
export class JSONCompatibilityModule extends BasePipelineModule {
  protected override config: CompatibilityConfig = {} as CompatibilityConfig;
  private fieldMappings: Record<string, any> = {};

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('JSONCompatibilityModule initialized', { module: this.moduleName }, 'constructor');
  }

  override async configure(config: CompatibilityConfig): Promise<void> {
    this.config = config;
    
    // Initialize field mappings (simplified for this example)
    this.initializeFieldMappings();
    
    await super.configure(config);
    this.logInfo('JSONCompatibilityModule configured', config, 'configure');
  }

  override async process(request: any): Promise<any> {
    this.logInfo('Processing JSON compatibility mapping', request, 'process');
    
    // Apply field mappings
    const mappedRequest = await this.applyFieldMappings(request);
    
    // Validate transformed data
    const validatedRequest = await this.validateMappedData(mappedRequest);
    
    return validatedRequest;
  }

  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing JSON compatibility mapping for response', response, 'processResponse');
    
    // Apply reverse field mappings for response
    const mappedResponse = await this.applyReverseFieldMappings(response);
    
    // Validate transformed response data
    const validatedResponse = await this.validateMappedData(mappedResponse);
    
    return validatedResponse;
  }

  private initializeFieldMappings(): void {
    // Define field mappings (in a real implementation, this would come from configuration)
    this.fieldMappings = {
      // OpenAI to Gemini mappings
      'messages': 'contents',
      'model': 'model',
      'temperature': 'generationConfig.temperature',
      'max_tokens': 'generationConfig.maxOutputTokens',
      'top_p': 'generationConfig.topP',
      'frequency_penalty': 'generationConfig.frequencyPenalty',
      'presence_penalty': 'generationConfig.presencePenalty',
      
      // Common field transformations
      'prompt': 'contents.0.text',
      'completion': 'candidates.0.content.parts.0.text',
      
      // Array field mappings
      'tools': 'tools.functionDeclarations',
      'tool_choice': 'toolChoice'
    };
    
    this.logInfo('Initialized field mappings', {
      mappingCount: Object.keys(this.fieldMappings).length
    }, 'initializeFieldMappings');
  }

  private async applyFieldMappings(data: any): Promise<any> {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    this.logInfo('Applying field mappings', {
      sourceFieldCount: Object.keys(data).length,
      mappingCount: Object.keys(this.fieldMappings).length
    }, 'applyFieldMappings');
    
    const result: any = {};
    
    // Apply each field mapping
    for (const [sourceField, targetPath] of Object.entries(this.fieldMappings)) {
      const sourceValue = this.getNestedValue(data, sourceField);
      
      if (sourceValue !== undefined) {
        // Apply transformation if needed
        const transformedValue = await this.transformFieldValue(sourceValue, sourceField);
        
        // Set nested value in result
        this.setNestedValue(result, targetPath, transformedValue);
        
        this.debug('debug', `Mapped field: ${sourceField} -> ${targetPath}`, {
          sourceValue,
          transformedValue
        }, 'applyFieldMappings');
      }
    }
    
    // Preserve unknown fields if not in strict mode
    if (!this.config.strictMapping) {
      for (const [field, value] of Object.entries(data)) {
        if (!(field in this.fieldMappings)) {
          result[field] = value;
        }
      }
    }
    
    this.logInfo('Field mapping completed', {
      resultFieldCount: Object.keys(result).length
    }, 'applyFieldMappings');
    
    return result;
  }

  private async applyReverseFieldMappings(data: any): Promise<any> {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    this.logInfo('Applying reverse field mappings', {
      sourceFieldCount: Object.keys(data).length
    }, 'applyReverseFieldMappings');
    
    const result: any = {};
    
    // Create reverse mapping
    const reverseMappings: Record<string, string> = {};
    for (const [sourceField, targetPath] of Object.entries(this.fieldMappings)) {
      reverseMappings[targetPath] = sourceField;
    }
    
    // Apply reverse mappings
    for (const [sourcePath, targetField] of Object.entries(reverseMappings)) {
      const sourceValue = this.getNestedValue(data, sourcePath);
      
      if (sourceValue !== undefined) {
        // Apply reverse transformation if needed
        const transformedValue = await this.transformFieldValueReverse(sourceValue, targetField);
        
        result[targetField] = transformedValue;
      }
    }
    
    // Preserve unknown fields
    for (const [field, value] of Object.entries(data)) {
      if (!(field in reverseMappings)) {
        result[field] = value;
      }
    }
    
    this.logInfo('Reverse field mapping completed', {
      resultFieldCount: Object.keys(result).length
    }, 'applyReverseFieldMappings');
    
    return result;
  }

  private async transformFieldValue(value: any, field: string): Promise<any> {
    // Apply field-specific transformations
    switch (field) {
      case 'messages':
        return this.transformMessagesToContents(value);
      
      case 'tools':
        return this.transformTools(value);
      
      case 'temperature':
      case 'top_p':
      case 'max_tokens':
        // Ensure numeric values are properly formatted
        return typeof value === 'number' ? value : parseFloat(value);
      
      default:
        return value;
    }
  }

  private async transformFieldValueReverse(value: any, field: string): Promise<any> {
    // Apply reverse field-specific transformations
    switch (field) {
      case 'messages':
        return this.transformContentsToMessages(value);
      
      case 'tools':
        return this.transformFunctionDeclarations(value);
      
      default:
        return value;
    }
  }

  private transformMessagesToContents(messages: any[]): any[] {
    if (!Array.isArray(messages)) return messages;
    
    return messages.map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content || '' }]
    }));
  }

  private transformContentsToMessages(contents: any[]): any[] {
    if (!Array.isArray(contents)) return contents;
    
    return contents.map(content => ({
      role: content.role === 'model' ? 'assistant' : 'user',
      content: content.parts?.[0]?.text || ''
    }));
  }

  private transformTools(tools: any[]): any {
    if (!Array.isArray(tools)) return tools;
    
    return {
      functionDeclarations: tools.map(tool => tool.function)
    };
  }

  private transformFunctionDeclarations(functionDeclarations: any): any {
    if (!functionDeclarations?.functionDeclarations) return functionDeclarations;
    
    return functionDeclarations.functionDeclarations.map((func: any) => ({
      type: 'function',
      function: func
    }));
  }

  private async validateMappedData(data: any): Promise<any> {
    if (!this.config.validation?.enabled) {
      return data;
    }
    
    this.logInfo('Validating mapped data', {
      validationConfig: this.config.validation,
      dataFieldCount: Object.keys(data).length
    }, 'validateMappedData');
    
    // Basic validation logic
    const errors: string[] = [];
    
    // Check required fields
    if (this.config.validation.required) {
      for (const field of this.config.validation.required) {
        if (!(field in data) || data[field] === undefined || data[field] === null) {
          errors.push(`Required field missing: ${field}`);
        }
      }
    }
    
    // Check field types
    if (this.config.validation.types) {
      for (const [field, expectedType] of Object.entries(this.config.validation.types)) {
        if (field in data && data[field] !== undefined) {
          const actualType = typeof data[field];
          if (actualType !== expectedType) {
            errors.push(`Field ${field} has invalid type: expected ${expectedType}, got ${actualType}`);
          }
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    this.logInfo('Data validation passed', {}, 'validateMappedData');
    return data;
  }

  private getNestedValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    
    return current;
  }

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
    
    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  }
}

/**
 * Default Compatibility Module
 * A flexible implementation that can handle various compatibility scenarios
 */
export class DefaultCompatibilityModule extends BasePipelineModule {
  protected override config: CompatibilityConfig = {} as CompatibilityConfig;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('DefaultCompatibilityModule initialized', { module: this.moduleName }, 'constructor');
  }

  override async configure(config: CompatibilityConfig): Promise<void> {
    this.config = config;
    await super.configure(config);
    this.logInfo('DefaultCompatibilityModule configured', config, 'configure');
  }

  override async process(request: any): Promise<any> {
    this.logInfo('Processing compatibility with default implementation', {
      strictMapping: this.config.strictMapping,
      preserveUnknownFields: this.config.preserveUnknownFields
    }, 'process');
    
    // Generic compatibility processing
    const processedRequest = await this.genericCompatibilityProcess(request);
    
    return processedRequest;
  }

  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing compatibility response with default implementation', {
      strictMapping: this.config.strictMapping,
      preserveUnknownFields: this.config.preserveUnknownFields
    }, 'processResponse');
    
    // Generic compatibility processing for response
    const processedResponse = await this.genericCompatibilityProcess(response);
    
    return processedResponse;
  }

  private async genericCompatibilityProcess(data: any): Promise<any> {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    this.logInfo('Applying generic compatibility processing', {
      dataType: typeof data,
      fieldCount: Object.keys(data).length
    }, 'genericCompatibilityProcess');
    
    const result: any = {};
    
    // Apply common field transformations
    const commonMappings = {
      'id': 'id',
      'object': 'object',
      'created': 'created',
      'model': 'model',
      'choices': 'choices',
      'usage': 'usage'
    };
    
    // Apply mappings
    for (const [sourceField, targetField] of Object.entries(commonMappings)) {
      if (sourceField in data) {
        result[targetField] = data[sourceField];
      }
    }
    
    // Handle unknown fields
    if (this.config.preserveUnknownFields) {
      for (const [field, value] of Object.entries(data)) {
        if (!(field in commonMappings)) {
          result[field] = value;
        }
      }
    }
    
    // Add compatibility metadata
    result.processedBy = 'DefaultCompatibilityModule';
    result.processedAt = Date.now();
    
    this.logInfo('Generic compatibility processing completed', {
      resultFieldCount: Object.keys(result).length
    }, 'genericCompatibilityProcess');
    
    return result;
  }
}