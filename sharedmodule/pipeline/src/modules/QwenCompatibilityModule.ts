/**
 * Qwen Compatibility Module
 * Handles OpenAI ↔ Qwen protocol conversion using field mapping tables
 */

import { ModuleInfo, ValidationRule } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import { MappingTable, FieldMapping, CompatibilityConfig } from './CompatibilityModule';
import * as fs from 'fs';
import * as path from 'path';

/**
 * OpenAI Tool Call
 */
export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * OpenAI Tool
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: {
      type: 'object';
      properties?: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * OpenAI Chat Completion Request with Tools
 */
export interface OpenAIChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
    name?: string;
    tool_call_id?: string;
    tool_calls?: OpenAIToolCall[];
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  n?: number;
  user?: string;
  tools?: OpenAITool[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}

/**
 * Qwen Tool Call
 */
export interface QwenToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Qwen Tool
 */
export interface QwenTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: {
      type: 'object';
      properties?: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Qwen Chat Completion Request
 */
export interface QwenChatRequest {
  model: string;
  input: {
    messages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool';
      content?: string;
      name?: string;
      tool_call_id?: string;
      tool_calls?: QwenToolCall[];
    }>;
  };
  parameters?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string | string[];
  };
  stream?: boolean;
  user?: string;
  tools?: QwenTool[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}

/**
 * OpenAI Chat Completion Response
 */
export interface OpenAIChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content?: string;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
    logprobs?: any;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Qwen Chat Completion Response
 */
export interface QwenChatResponse {
  request_id: string;
  output: {
    choices: Array<{
      message: {
        role: 'assistant';
        content?: string;
        tool_calls?: QwenToolCall[];
      };
      finish_reason: 'stop' | 'length' | 'tool_calls';
      index: number;
    }>;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

/**
 * Qwen Compatibility Module Configuration
 */
export interface QwenCompatibilityConfig extends CompatibilityConfig {
  /** Conversion direction */
  direction: 'openai-to-qwen' | 'qwen-to-openai' | 'bidirectional';
  /** Enable Qwen-specific optimizations */
  enableQwenOptimizations?: boolean;
  /** Model mapping configuration */
  modelMapping?: {
    /** Map OpenAI models to Qwen models */
    openaiToQwen?: Record<string, string>;
    /** Map Qwen models to OpenAI models */
    qwenToOpenai?: Record<string, string>;
  };
}

/**
 * Qwen Compatibility Module
 */
export class QwenCompatibilityModule extends BasePipelineModule {
  protected override config: QwenCompatibilityConfig = {} as QwenCompatibilityConfig;
  private mappingTable: MappingTable | null = null;
  private fieldMappings: Record<string, FieldMapping> = {};
  private reverseFieldMappings: Record<string, FieldMapping> = {};
  private mappingValidationRules: MappingTable['validationRules'] = {};

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('QwenCompatibilityModule initialized', { module: this.moduleName }, 'constructor');
  }

  /**
   * Initialize the compatibility module
   */
  public async initialize(): Promise<void> {
    try {
      this.logInfo('Initializing Qwen compatibility module', { config: this.config }, 'initialize');
      
      // Validate configuration
      this.validateConfig();
      
      // Load mapping table
      await this.loadMappingTable(this.config.mappingTable);
      
      // Process field mappings
      this.processFieldMappings();
      
      this.logInfo('Qwen compatibility module initialized successfully', {}, 'initialize');
    } catch (error) {
      this.error('Failed to initialize Qwen compatibility module', error, 'initialize');
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.direction) {
      throw new Error('Conversion direction is required');
    }

    if (!this.config.mappingTable) {
      throw new Error('Mapping table name is required');
    }
  }

  /**
   * Load mapping table
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
      this.error('Error loading mapping table', error, 'loadMappingTable');
      throw error;
    }
  }

  /**
   * Get mapping table by name - load from JSON file
   */
  private async getMappingTable(tableName: string): Promise<MappingTable> {
    try {
      // Construct path to mapping table file
      const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', `${tableName}.json`);
      
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
      
      this.logInfo(`Mapping table loaded successfully: ${tableName}`, {
        version: mappingTable.version,
        formats: mappingTable.formats,
        fieldCount: Object.keys(mappingTable.fieldMappings).length
      }, 'getMappingTable');
      
      return mappingTable;
    } catch (error) {
      this.error(`Failed to load mapping table: ${tableName}`, error, 'getMappingTable');
      throw error;
    }
  }
  
  /**
   * Validate mapping table structure
   */
  private validateMappingTableStructure(mappingTable: any, tableName: string): void {
    const requiredFields = ['version', 'description', 'formats', 'fieldMappings'];
    
    for (const field of requiredFields) {
      if (!(field in mappingTable)) {
        throw new Error(`Mapping table ${tableName} is missing required field: ${field}`);
      }
    }
    
    if (!mappingTable.formats.source || !mappingTable.formats.target) {
      throw new Error(`Mapping table ${tableName} must specify source and target formats`);
    }
    
    if (!mappingTable.fieldMappings || typeof mappingTable.fieldMappings !== 'object') {
      throw new Error(`Mapping table ${tableName} must have valid fieldMappings`);
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
    this.reverseFieldMappings = {};
    
    // Process field mappings with transform functions
    for (const [sourceField, mapping] of Object.entries(this.mappingTable.fieldMappings)) {
      if (typeof mapping === 'string') {
        // Simple field rename
        this.fieldMappings[sourceField] = {
          targetField: mapping,
          required: false
        };
      } else {
        // Complex field mapping with transform function processing
        const processedMapping = { ...mapping };
        
        // Process transform function from JSON definition
        if (mapping.transform && typeof mapping.transform === 'string') {
          processedMapping.transform = this.createTransformFunction(mapping.transform);
        }
        
        this.fieldMappings[sourceField] = processedMapping;
      }
    }
    
    // Create reverse mappings for bidirectional conversion
    if (this.config.direction === 'bidirectional') {
      for (const [sourceField, mapping] of Object.entries(this.fieldMappings)) {
        const targetField = typeof mapping === 'string' ? mapping : mapping.targetField;
        this.reverseFieldMappings[targetField] = {
          targetField: sourceField,
          transform: mapping.transform ? (value: any, context: any) => {
            // Simple reverse transformation - in practice this would be more sophisticated
            return value;
          } : undefined
        };
      }
    }
    
    this.logInfo('Processed field mappings', {
      totalCount: Object.keys(this.fieldMappings).length,
      requiredCount: Object.values(this.fieldMappings).filter(m => m.required).length,
      transformCount: Object.values(this.fieldMappings).filter(m => m.transform).length
    }, 'processFieldMappings');
  }
  
  /**
   * Create transform function from JSON definition
   */
  private createTransformFunction(transformName: string): (value: any, context: any) => any {
    const transformFunctions = this.mappingTable?.transformFunctions || {};
    const transformDef = transformFunctions[transformName];
    
    if (!transformDef) {
      throw new Error(`Transform function not found: ${transformName}`);
    }
    
    return (value: any, context: any) => {
      this.debug("debug", `Applying transform: ${transformName}`, {
        type: transformDef.type,
        value
      }, 'createTransformFunction');
      
      switch (transformDef.type) {
        case 'mapping':
          return this.applyMappingTransform(value, transformDef);
        case 'string_transform':
          return this.applyStringTransform(value, transformDef);
        case 'array_transform':
          return this.applyArrayTransform(value, transformDef, context);
        case 'object_transform':
          return this.applyObjectTransform(value, transformDef, context);
        case 'function':
          return this.applyFunctionTransform(value, transformDef, context);
        case 'validation':
          return this.applyValidationTransform(value, transformDef, context);
        default:
          throw new Error(`Unknown transform type: ${transformDef.type}`);
      }
    };
  }
  
  /**
   * Apply mapping transform
   */
  private applyMappingTransform(value: any, transformDef: any): any {
    if (transformDef.mappings && transformDef.mappings[value]) {
      return transformDef.mappings[value];
    }
    return transformDef.defaultValue || value;
  }
  
  /**
   * Apply string transform
   */
  private applyStringTransform(value: any, transformDef: any): any {
    if (typeof value !== 'string') {
      return value;
    }
    
    switch (transformDef.operation) {
      case 'prefix':
        return transformDef.prefix + value;
      case 'suffix':
        return value + transformDef.suffix;
      case 'uppercase':
        return value.toUpperCase();
      case 'lowercase':
        return value.toLowerCase();
      case 'replace':
        return value.replace(new RegExp(transformDef.pattern, transformDef.flags || 'g'), transformDef.replacement);
      default:
        return value;
    }
  }
  
  /**
   * Apply array transform
   */
  private applyArrayTransform(value: any, transformDef: any, context: any): any {
    if (!Array.isArray(value)) {
      return value;
    }
    
    return value.map((item, index) => {
      if (transformDef.elementTransform) {
        const elementContext = { ...context, index, item };
        return this.applyFieldMappingHelper(item, transformDef.elementTransform, elementContext);
      }
      return item;
    });
  }
  
  /**
   * Apply object transform
   */
  private applyObjectTransform(value: any, transformDef: any, context: any): any {
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    
    const result: any = {};
    
    for (const [field, fieldTransform] of Object.entries(transformDef.fields || {})) {
      const fieldValue = value[field];
      
      if (fieldValue !== undefined) {
        if (typeof fieldTransform === 'string') {
          result[fieldTransform] = fieldValue;
        } else if (fieldTransform.mapping) {
          result[field] = this.applyMappingTransform(fieldValue, fieldTransform);
        } else if (fieldTransform.transform) {
          result[field] = this.createTransformFunction(fieldTransform.transform)(fieldValue, context);
        } else {
          result[field] = fieldValue;
        }
      } else if (fieldTransform.required) {
        throw new Error(`Required field missing in object transform: ${field}`);
      }
    }
    
    return result;
  }
  
  /**
   * Apply function transform
   */
  private applyFunctionTransform(value: any, transformDef: any, context: any): any {
    if (transformDef.function) {
      try {
        // Create a safe function execution context
        const func = new Function('value', 'context', `return ${transformDef.function}`);
        return func(value, context);
      } catch (error) {
        this.error(`Failed to execute function transform: ${transformDef.function}`, error, 'applyFunctionTransform');
        return value;
      }
    }
    return value;
  }
  
  /**
   * Apply validation transform
   */
  private applyValidationTransform(value: any, transformDef: any, context: any): any {
    // Validation transforms don't change the value, they just validate it
    switch (transformDef.validation) {
      case 'sum_equals_total':
        if (Array.isArray(transformDef.fields)) {
          const sum = transformDef.fields.reduce((acc: number, field: string) => {
            return acc + (context.data?.[field] || 0);
          }, 0);
          if (sum !== value) {
            throw new Error(`Validation failed: sum of fields (${sum}) does not equal total (${value})`);
          }
        }
        break;
    }
    return value;
  }
  
  /**
   * Apply field mapping helper for nested transforms
   */
  private applyFieldMappingHelper(value: any, fieldTransform: any, context: any): any {
    if (typeof fieldTransform === 'string') {
      return value;
    }
    
    if (fieldTransform.mapping) {
      return this.applyMappingTransform(value, fieldTransform);
    }
    
    if (fieldTransform.transform) {
      return this.createTransformFunction(fieldTransform.transform)(value, context);
    }
    
    return value;
  }

  /**
   * Convert OpenAI request to Qwen request using field mapping
   */
  public convertOpenAIToQwen(openaiRequest: OpenAIChatRequest): QwenChatRequest {
    this.debug("debug", 'Converting OpenAI request to Qwen', { 
      model: openaiRequest.model,
      messageCount: openaiRequest.messages.length,
      hasTools: !!openaiRequest.tools?.length
    }, 'convertOpenAIToQwen');

    try {
      // Use field mapping to convert the request
      const qwenRequest = this.applyFieldMapping(openaiRequest, this.fieldMappings);
      
      this.debug("debug", 'OpenAI to Qwen conversion completed', { 
        qwenModel: qwenRequest.model,
        hasParameters: !!qwenRequest.parameters,
        hasTools: !!qwenRequest.tools?.length
      }, 'convertOpenAIToQwen');

      return qwenRequest;
    } catch (error) {
      this.error('Failed to convert OpenAI request to Qwen', error, 'convertOpenAIToQwen');
      throw error;
    }
  }

  /**
   * Convert Qwen response to OpenAI response using field mapping
   */
  public convertQwenToOpenAI(qwenResponse: QwenChatResponse, model: string): OpenAIChatResponse {
    this.debug("debug", 'Converting Qwen response to OpenAI', { 
      requestId: qwenResponse.request_id,
      choiceCount: qwenResponse.output.choices.length 
    }, 'convertQwenToOpenAI');

    try {
      // Add model to response for mapping
      const responseWithModel = { ...qwenResponse, model };
      
      // Use reverse field mapping to convert the response
      const openaiResponse = this.applyFieldMapping(responseWithModel, this.reverseFieldMappings);
      
      // Ensure required OpenAI fields are present
      if (!openaiResponse.object) {
        openaiResponse.object = 'chat.completion';
      }
      if (!openaiResponse.created) {
        openaiResponse.created = Math.floor(Date.now() / 1000);
      }
      
      this.debug("debug", 'Qwen to OpenAI conversion completed', { 
        responseId: openaiResponse.id,
        choiceCount: openaiResponse.choices?.length || 0
      }, 'convertQwenToOpenAI');

      return openaiResponse;
    } catch (error) {
      this.error('Failed to convert Qwen response to OpenAI', error, 'convertQwenToOpenAI');
      throw error;
    }
  }

  /**
   * Apply field mapping to data
   */
  private applyFieldMapping(data: any, mappings: Record<string, FieldMapping>): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    this.debug("debug", 'Applying field mapping', {
      fieldCount: Object.keys(mappings).length,
      dataFieldCount: Object.keys(data).length
    }, 'applyFieldMapping');
    
    const mappedData: any = {};
    const unmappedFields: string[] = [];
    
    // Apply mapped fields
    for (const [sourceField, mapping] of Object.entries(mappings)) {
      const sourceValue = data[sourceField];
      
      if (sourceValue !== undefined) {
        // Apply transformation if specified
        let transformedValue = sourceValue;
        if (mapping.transform) {
          const transformContext = { sourceField, data, mapping };
          transformedValue = mapping.transform(sourceValue, transformContext);
          this.debug("debug", `Applied transform for field: ${sourceField}`, {
            fromValue: sourceValue,
            toValue: transformedValue
          }, 'applyFieldMapping');
        }
        
        // Validate value if constraints are specified
        if (mapping.validation) {
          this.validateFieldValue(transformedValue, mapping.validation, sourceField);
        }
        
        // Handle nested field mapping (e.g., 'input.messages')
        this.setNestedValue(mappedData, mapping.targetField, transformedValue);
      } else if (mapping.required) {
        throw new Error(`Required field missing: ${sourceField}`);
      } else if (mapping.defaultValue !== undefined) {
        this.setNestedValue(mappedData, mapping.targetField, mapping.defaultValue);
        this.debug("debug", `Applied default value for field: ${sourceField}`, {
          defaultValue: mapping.defaultValue
        }, 'applyFieldMapping');
      }
    }
    
    // Handle unknown fields
    if (this.config?.preserveUnknownFields) {
      for (const field of Object.keys(data)) {
        if (!(field in mappings)) {
          mappedData[field] = data[field];
          unmappedFields.push(field);
        }
      }
    }
    
    if (unmappedFields.length > 0) {
      this.debug("debug", 'Preserved unknown fields', {
        fieldCount: unmappedFields.length,
        fields: unmappedFields.slice(0, 10)
      }, 'applyFieldMapping');
    }
    
    return mappedData;
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as any;
    }
    
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }

  /**
   * Validate field value
   */
  private validateFieldValue(value: any, validation: FieldMapping['validation'], field: string): void {
    if (!validation) {
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
  }

  /**
   * Model mapping helpers
   */
  private mapOpenAIModelToQwen(openaiModel: string): string {
    if (this.config.modelMapping?.openaiToQwen?.[openaiModel]) {
      return this.config.modelMapping.openaiToQwen[openaiModel];
    }

    const defaultMappings: Record<string, string> = {
      'gpt-3.5-turbo': 'qwen-turbo',
      'gpt-3.5-turbo-16k': 'qwen-turbo',
      'gpt-4': 'qwen-plus',
      'gpt-4-32k': 'qwen-plus',
      'gpt-4-turbo': 'qwen-max',
      'gpt-4-turbo-preview': 'qwen-max',
      'gpt-4o': 'qwen-max'
    };

    return defaultMappings[openaiModel] || openaiModel;
  }

  private mapQwenModelToOpenAI(qwenModel: string): string {
    if (this.config.modelMapping?.qwenToOpenai?.[qwenModel]) {
      return this.config.modelMapping.qwenToOpenai[qwenModel];
    }

    const defaultMappings: Record<string, string> = {
      'qwen-turbo': 'gpt-3.5-turbo',
      'qwen-plus': 'gpt-4',
      'qwen-max': 'gpt-4-turbo'
    };

    return defaultMappings[qwenModel] || qwenModel;
  }

  /**
   * Tool conversion helpers
   */
  private convertOpenAIToolToQwen(tool: OpenAITool): QwenTool {
    return {
      type: tool.type,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      }
    };
  }

  private convertQwenToolToOpenAI(tool: QwenTool): OpenAITool {
    return {
      type: tool.type,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      }
    };
  }

  private convertOpenAIToolCallToQwen(toolCall: OpenAIToolCall): QwenToolCall {
    return {
      id: toolCall.id,
      type: toolCall.type,
      function: {
        name: toolCall.function.name,
        arguments: toolCall.function.arguments
      }
    };
  }

  private convertQwenToolCallToOpenAI(toolCall: QwenToolCall): OpenAIToolCall {
    return {
      id: toolCall.id,
      type: toolCall.type,
      function: {
        name: toolCall.function.name,
        arguments: toolCall.function.arguments
      }
    };
  }

  private convertOpenAIToolChoiceToQwen(choice: any): any {
    if (typeof choice === 'string') {
      return choice;
    } else if (typeof choice === 'object' && choice.type === 'function') {
      return {
        type: 'function',
        function: {
          name: choice.function.name
        }
      };
    }
    return 'auto';
  }

  /**
   * Message conversion helpers
   */
  private convertOpenAIMessageToQwen(message: any): any {
    const qwenMessage: any = {
      role: message.role,
      content: message.content
    };

    if (message.name) {
      qwenMessage.name = message.name;
    }

    if (message.tool_call_id) {
      qwenMessage.tool_call_id = message.tool_call_id;
    }

    if (message.tool_calls) {
      qwenMessage.tool_calls = message.tool_calls.map((call: OpenAIToolCall) => 
        this.convertOpenAIToolCallToQwen(call)
      );
    }

    return qwenMessage;
  }

  private convertQwenMessageToOpenAI(message: any): any {
    const openAIMessage: any = {
      role: message.role,
      content: message.content
    };

    if (message.tool_calls) {
      openAIMessage.tool_calls = message.tool_calls.map((call: QwenToolCall) => 
        this.convertQwenToolCallToOpenAI(call)
      );
    }

    return openAIMessage;
  }

  /**
   * Finish reason mapping
   */
  private mapQwenFinishReason(qwenFinishReason: string): 'stop' | 'length' | 'content_filter' | 'tool_calls' {
    const mapping: Record<string, 'stop' | 'length' | 'content_filter' | 'tool_calls'> = {
      'stop': 'stop',
      'length': 'length',
      'content_filter': 'content_filter',
      'tool_calls': 'tool_calls'
    };

    return mapping[qwenFinishReason] || 'stop';
  }

  /**
   * Process method - Required by BasePipelineModule
   */
  public async process(request: any): Promise<any> {
    // Convert OpenAI request to Qwen request
    if (request.model && request.messages) {
      return this.convertOpenAIToQwen(request);
    }
    
    // If it's already a Qwen request, return as-is
    return request;
  }

  /**
   * Process response method - Optional for BasePipelineModule
   */
  public async processResponse(response: any): Promise<any> {
    // Convert Qwen response to OpenAI response if needed
    if (response.request_id && response.output) {
      return this.convertQwenToOpenAI(response, response.model || 'unknown');
    }
    
    // If it's already an OpenAI response, return as-is
    return response;
  }

  /**
   * Get compatibility module info
   */
  public getCompatibilityInfo(): {
    direction: string;
    mappingTable: string;
    strictMapping: boolean;
    modelMappings: Record<string, string>;
    supportedConversions: string[];
  } {
    return {
      direction: this.config.direction,
      mappingTable: this.config.mappingTable,
      strictMapping: this.config.strictMapping || false,
      modelMappings: this.config.modelMapping?.openaiToQwen || {},
      supportedConversions: ['openai-to-qwen', 'qwen-to-openai']
    };
  }

  /**
   * Get field mappings for inspection
   */
  public getFieldMappings(): {
    openaiToQwen: Record<string, FieldMapping>;
    qwenToOpenAI: Record<string, FieldMapping>;
  } {
    return {
      openaiToQwen: this.fieldMappings,
      qwenToOpenAI: this.reverseFieldMappings
    };
  }

  /**
   * Validation methods
   */
  public validateOpenAIRequest(request: OpenAIChatRequest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!request.model) {
      errors.push('Model is required');
    }

    if (!request.messages || request.messages.length === 0) {
      errors.push('Messages are required and cannot be empty');
    }

    // Message validation
    if (request.messages) {
      for (let i = 0; i < request.messages.length; i++) {
        const message = request.messages[i];
        
        if (!message || !message.role) {
          errors.push(`Message ${i} role is required`);
          continue;
        }
        
        if (!message.content && message.role !== 'tool') {
          errors.push(`Message ${i} content is required for role: ${message.role}`);
        }
        
        if (!['system', 'user', 'assistant', 'tool'].includes(message.role)) {
          warnings.push(`Message ${i} has invalid role: ${message.role}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public validateQwenResponse(response: QwenChatResponse): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!response.request_id) {
      errors.push('Request ID is required');
    }

    if (!response.output?.choices || response.output.choices.length === 0) {
      errors.push('Output choices are required and cannot be empty');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}