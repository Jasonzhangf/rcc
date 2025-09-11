/**
 * LMStudio Compatibility Module
 * Handles OpenAI ↔ LMStudio protocol conversion using field mapping tables
 * Note: LMStudio is fully OpenAI-compatible, so this module primarily provides validation and optimization
 */

import { ModuleInfo, ValidationRule } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import { CompatibilityModule, MappingTable, FieldMapping, CompatibilityConfig } from './CompatibilityModule';
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
 * OpenAI Chat Completion Request
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
      function_call?: {  // Legacy format
        name: string;
        arguments: string;
      };
    };
    finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * LMStudio Chat Request (identical to OpenAI format)
 */
export interface LMStudioChatRequest {
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
 * LMStudio Chat Response (identical to OpenAI format)
 */
export interface LMStudioChatResponse {
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
      function_call?: {  // Legacy format
        name: string;
        arguments: string;
      };
    };
    finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * LMStudio Compatibility Module Configuration
 * LMStudio is fully OpenAI-compatible, so this module primarily provides validation and optimization
 */
export interface LMStudioCompatibilityConfig extends CompatibilityConfig {
  /** Conversion direction */
  direction: 'openai-to-lmstudio' | 'lmstudio-to-openai' | 'bidirectional';
  /** Enable LMStudio-specific optimizations */
  enableLMStudioOptimizations?: boolean;
  /** Tool use handling configuration */
  toolUseConfig?: {
    /** Enable tool use support */
    enabled: boolean;
    /** Handle legacy function_call format */
    supportLegacyFunctionCall: boolean;
    /** Tool call parsing mode */
    parsingMode: 'strict' | 'lenient';
  };
  /** Model mapping configuration */
  modelMapping?: {
    /** Map OpenAI models to LMStudio models */
    openaiToLMStudio?: Record<string, string>;
    /** Map LMStudio models to OpenAI models */
    lmStudioToOpenai?: Record<string, string>;
  };
}

/**
 * LMStudio Compatibility Module
 */
export class LMStudioCompatibilityModule extends CompatibilityModule {
  protected override config: LMStudioCompatibilityConfig = {} as LMStudioCompatibilityConfig;
  private reverseFieldMappings: Record<string, FieldMapping> = {};

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('LMStudioCompatibilityModule initialized', { module: this.moduleName }, 'constructor');
  }

  /**
   * Configure the LMStudio compatibility module
   */
  override async configure(config: LMStudioCompatibilityConfig): Promise<void> {
    this.logInfo('Configuring LMStudioCompatibilityModule', config, 'configure');
    
    this.config = config;
    
    // Validate configuration
    this.validateLMStudioConfig();
    
    // Configure base compatibility module
    await super.configure({
      mappingTable: config.mappingTable,
      strictMapping: config.strictMapping,
      preserveUnknownFields: config.preserveUnknownFields,
      validation: config.validation
    });
    
    // Build reverse field mappings for response conversion
    this.buildReverseFieldMappings();
    
    this.logInfo('LMStudioCompatibilityModule configured successfully', config, 'configure');
  }

  /**
   * Validate configuration
   */
  private validateLMStudioConfig(): void {
    if (!this.config.direction) {
      throw new Error('Conversion direction is required');
    }

    if (!this.config.mappingTable) {
      throw new Error('Mapping table name is required');
    }
  }

  /**
   * Build reverse field mappings
   */
  private buildReverseFieldMappings(): void {
    // Get field mappings from parent class
    const fieldMappings = (this as any).fieldMappings as Record<string, FieldMapping>;
    
    this.reverseFieldMappings = {};
    
    for (const [sourceField, mapping] of Object.entries(fieldMappings)) {
      const targetField = typeof mapping === 'string' ? mapping : mapping.targetField;
      
      // Create reverse mapping
      this.reverseFieldMappings[targetField] = {
        targetField: sourceField,
        transform: mapping.transform ? this.createReverseTransformFunction(mapping.transform) : undefined
      };
    }

    this.logInfo('Reverse field mappings built', {
      fieldCount: Object.keys(this.reverseFieldMappings).length
    }, 'buildReverseFieldMappings');
  }

  /**
   * Create reverse transform function
   */
  private createReverseTransformFunction(forwardTransform: any): (value: any) => any {
    // This is a simplified version - in practice, you'd need to implement proper reverse transforms
    return (value: any) => value;
  }

  /**
   * Convert OpenAI request to LMStudio format using mapping tables
   */
  public async convertOpenAIToLMStudio(openaiRequest: OpenAIChatRequest): Promise<LMStudioChatRequest> {
    const startTime = Date.now();
    
    try {
      this.logInfo('Converting OpenAI request to LMStudio', {
        model: openaiRequest.model,
        messageCount: openaiRequest.messages.length,
        hasTools: !!openaiRequest.tools
      }, 'convertOpenAIToLMStudio');
      
      // Apply model mapping if configured
      const mappedModel = this.config.modelMapping?.openaiToLMStudio?.[openaiRequest.model] || openaiRequest.model;
      
      // Use parent class process method to apply field mapping
      const lmStudioRequest = await super.process({
        ...openaiRequest,
        model: mappedModel
      });
      
      this.logInfo('OpenAI to LMStudio conversion complete', {
        processingTime: Date.now() - startTime
      }, 'convertOpenAIToLMStudio');
      
      return lmStudioRequest;
    } catch (error) {
      this.error('Failed to convert OpenAI request to LMStudio', error, 'convertOpenAIToLMStudio');
      throw error;
    }
  }

  /**
   * Convert LMStudio response to OpenAI format using mapping tables
   */
  public async convertLMStudioToOpenAI(lmStudioResponse: LMStudioChatResponse, model: string): Promise<OpenAIChatResponse> {
    const startTime = Date.now();
    
    try {
      this.logInfo('Converting LMStudio response to OpenAI', {
        model,
        responseId: lmStudioResponse.id,
        choiceCount: lmStudioResponse.choices.length
      }, 'convertLMStudioToOpenAI');
      
      // Apply model mapping if configured
      const mappedModel = this.config.modelMapping?.lmStudioToOpenai?.[model] || model;
      
      // Use parent class processResponse method to apply field mapping
      const responseWithModel = {
        ...lmStudioResponse,
        model: mappedModel
      };
      
      const openaiResponse = await super.processResponse(responseWithModel);
      
      this.logInfo('LMStudio to OpenAI conversion complete', {
        processingTime: Date.now() - startTime
      }, 'convertLMStudioToOpenAI');
      
      return openaiResponse;
    } catch (error) {
      this.error('Failed to convert LMStudio response to OpenAI', error, 'convertLMStudioToOpenAI');
      throw error;
    }
  }

  /**
   * Process method - Required by BasePipelineModule
   */
  override async process(request: any): Promise<any> {
    this.logInfo('Processing LMStudioCompatibilityModule request', {
      direction: this.config.direction,
      model: request.model
    }, 'process');
    
    try {
      if (this.config.direction === 'openai-to-lmstudio' || this.config.direction === 'bidirectional') {
        // Apply model mapping if configured
        const mappedModel = this.config.modelMapping?.openaiToLMStudio?.[request.model] || request.model;
        const requestWithMappedModel = {
          ...request,
          model: mappedModel
        };
        
        // Use parent class process method to apply field mapping
        return super.process(requestWithMappedModel);
      } else {
        throw new Error(`Unsupported direction for request processing: ${this.config.direction}`);
      }
    } catch (error) {
      this.error('Error processing request', { error: error as Error, operation: 'process' }, 'process');
      throw error;
    }
  }

  /**
   * Process response method - Required by BasePipelineModule
   */
  override async processResponse(response: any): Promise<any> {
    this.logInfo('Processing LMStudioCompatibilityModule response', {
      direction: this.config.direction,
      model: response.model
    }, 'processResponse');
    
    try {
      if (this.config.direction === 'lmstudio-to-openai' || this.config.direction === 'bidirectional') {
        // Apply model mapping if configured
        const mappedModel = this.config.modelMapping?.lmStudioToOpenai?.[response.model] || response.model;
        const responseWithMappedModel = {
          ...response,
          model: mappedModel
        };
        
        // Use parent class processResponse method to apply field mapping
        return super.processResponse(responseWithMappedModel);
      } else {
        throw new Error(`Unsupported direction for response processing: ${this.config.direction}`);
      }
    } catch (error) {
      this.error('Error processing response', { error: error as Error, operation: 'processResponse' }, 'processResponse');
      throw error;
    }
  }
}