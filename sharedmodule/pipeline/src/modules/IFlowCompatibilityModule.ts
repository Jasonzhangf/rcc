/**
 * iFlow Compatibility Module
 * Handles OpenAI ↔ iFlow protocol conversion using agent-based architecture inspired by Claude Code Router
 */

import { ModuleInfo, ValidationRule } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import { CompatibilityModule } from './CompatibilityModule';
import {
  FieldMapping,
  ModuleConfig,
  PipelineExecutionContext
} from '../interfaces/ModularInterfaces';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration for compatibility mapping
 */
export interface CompatibilityConfig {
  providerType: 'openai' | 'anthropic' | 'iflow' | 'custom';
  mappings: MappingTable;
  enabledTools?: string[];
  customHandlers?: Record<string, Function>;
}

/**
 * Mapping table for field transformations
 */
export interface MappingTable {
  requestFields: FieldMapping[];
  responseFields: FieldMapping[];
  toolFields?: FieldMapping[];
}

/**
 * iFlow Agent Interface
 */
export interface IFlowAgent {
  name: string;
  shouldHandle: (request: any, config: any) => boolean;
  process: (request: any, config: any) => Promise<any>;
  tools?: Map<string, any>;
}

/**
 * iFlow Tool Interface
 */
export interface IFlowTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
}

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
export interface IFlowOpenAIChatRequest {
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
 * iFlow Chat Completion Request (agent-based architecture)
 */
export interface IFlowChatRequest {
  taskId: string;
  agentId: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
    name?: string;
    tool_call_id?: string;
    tool_calls?: OpenAIToolCall[];
  }>;
  tools?: OpenAITool[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  temperature?: number;
  maxTokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  n?: number;
  userId?: string;
  sessionInfo?: any;
  parameters?: any;
  agentConfig?: any;
  timeout?: number;
  priority?: string;
  context?: any;
}

/**
 * OpenAI Chat Completion Response
 */
export interface IFlowOpenAIChatResponse {
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
 * iFlow Chat Completion Response
 */
export interface IFlowChatResponse {
  taskId: string;
  result: any;
  agentResponse?: any;
  toolCalls?: OpenAIToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  sessionId?: string;
  executionTime?: number;
  status?: string;
  error?: any;
  metadata?: {
    processingTime: number;
    agentUsed: string;
    toolsInvoked: string[];
    session_info?: any;
    timeout?: number;
    priority?: string;
    context?: any;
  };
}

/**
 * iFlow Compatibility Module Configuration
 */
export interface IFlowCompatibilityConfig extends CompatibilityConfig {
  /** Conversion direction */
  direction: 'openai-to-iflow' | 'iflow-to-openai' | 'bidirectional';
  /** Enable agent-based processing */
  enableAgents?: boolean;
  /** Available agents */
  agents?: IFlowAgent[];
  /** Model mapping configuration */
  modelMapping?: {
    /** Map OpenAI models to iFlow agents */
    openaiToIFlow?: Record<string, string>;
    /** Map iFlow agents to OpenAI models */
    iflowToOpenai?: Record<string, string>;
  };
  /** Agent configuration */
  agentConfig?: {
    /** Enable image processing agent */
    enableImageAgent?: boolean;
    /** Enable code processing agent */
    enableCodeAgent?: boolean;
    /** Enable tool processing agent */
    enableToolAgent?: boolean;
    /** Default agent */
    defaultAgent?: string;
  };
  /** Additional compatibility properties */
  mappingTable?: any;
  strictMapping?: boolean;
  preserveUnknownFields?: boolean;
  validation?: any;
}

/**
 * iFlow Compatibility Module
 * Implements agent-based architecture inspired by Claude Code Router
 */
export class IFlowCompatibilityModule extends CompatibilityModule {
  protected iflowConfig: IFlowCompatibilityConfig = {} as IFlowCompatibilityConfig;
  private agents: Map<string, IFlowAgent> = new Map();

  // Required by IPipelineModule interface
  public readonly moduleId: string;
  public readonly moduleName: string;
  public readonly moduleVersion: string;

  constructor(config: ModuleConfig) {
    // Pass the config directly - BasePipelineModule will handle the conversion
    super(config as any);

    // Initialize required interface properties
    this.moduleId = config.id;
    this.moduleName = config.name || 'IFlow Compatibility Module';
    this.moduleVersion = config.version || '1.0.0';

    // Set the IFlow-specific config
    this.iflowConfig = config.config as IFlowCompatibilityConfig;

    this.logInfo('IFlowCompatibilityModule initialized', { module: this.moduleName }, 'constructor');
  }


  /**
   * Validate iFlow configuration
   */
  private validateIFlowConfig(): void {
    if (!this.iflowConfig.direction) {
      throw new Error('Conversion direction is required');
    }

    if (!this.iflowConfig.mappingTable) {
      throw new Error('Mapping table name is required');
    }
  }

  /**
   * Initialize agents for agent-based processing
   */
  private async initializeAgents(): Promise<void> {
    this.logInfo('Initializing iFlow agents', {}, 'initializeAgents');
    
    // Default agents
    const defaultAgents: IFlowAgent[] = [
      {
        name: 'general',
        shouldHandle: (request: any, config: any) => true,
        process: async (request: any, config: any) => {
          return this.processGeneralRequest(request, config);
        }
      }
    ];

    // Add image processing agent if enabled
    if (this.iflowConfig.agentConfig?.enableImageAgent) {
      const imageAgent: IFlowAgent = {
        name: 'image',
        shouldHandle: (request: any, config: any) => {
          return this.hasImageContent(request);
        },
        process: async (request: any, config: any) => {
          return this.processImageRequest(request, config);
        },
        tools: new Map([
          ['analyzeImage', {
            name: 'analyzeImage',
            description: 'Analyze image or images by ID and extract information',
            parameters: {
              type: 'object',
              properties: {
                imageId: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of IDs to analyse'
                },
                task: {
                  type: 'string',
                  description: 'Detailed task description'
                },
                regions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional regions of interest'
                }
              },
              required: ['imageId', 'task']
            }
          }]
        ])
      };
      defaultAgents.push(imageAgent);
    }

    // Add code processing agent if enabled
    if (this.iflowConfig.agentConfig?.enableCodeAgent) {
      const codeAgent: IFlowAgent = {
        name: 'code',
        shouldHandle: (request: any, config: any) => {
          return this.hasCodeContent(request);
        },
        process: async (request: any, config: any) => {
          return this.processCodeRequest(request, config);
        }
      };
      defaultAgents.push(codeAgent);
    }

    // Add tool processing agent if enabled
    if (this.iflowConfig.agentConfig?.enableToolAgent) {
      const toolAgent: IFlowAgent = {
        name: 'tool',
        shouldHandle: (request: any, config: any) => {
          return this.hasToolContent(request);
        },
        process: async (request: any, config: any) => {
          return this.processToolRequest(request, config);
        }
      };
      defaultAgents.push(toolAgent);
    }

    // Register agents
    for (const agent of defaultAgents) {
      this.agents.set(agent.name, agent);
    }

    this.logInfo('iFlow agents initialized', {
      agentCount: this.agents.size,
      agentNames: Array.from(this.agents.keys())
    }, 'initializeAgents');
  }

  /**
   * Check if request contains image content
   */
  private hasImageContent(request: any): boolean {
    if (!request.messages) return false;
    
    return request.messages.some((message: any) => {
      if (Array.isArray(message.content)) {
        return message.content.some((item: any) => 
          item.type === 'image_url' || (item.type === 'text' && item.text.includes('image'))
        );
      }
      return false;
    });
  }

  /**
   * Check if request contains code content
   */
  private hasCodeContent(request: any): boolean {
    if (!request.messages) return false;
    
    return request.messages.some((message: any) => {
      const content = typeof message.content === 'string' ? message.content : '';
      return content.includes('```') || content.includes('function') || content.includes('class');
    });
  }

  /**
   * Check if request contains tool content
   */
  private hasToolContent(request: any): boolean {
    return !!(request.tools && request.tools.length > 0) || 
           !!(request.tool_choice && request.tool_choice !== 'auto');
  }

  /**
   * Process general request
   */
  private async processGeneralRequest(request: any, config: any): Promise<any> {
    // Use parent class process method to apply field mapping
    return super.process(request);
  }

  /**
   * Process image request
   */
  private async processImageRequest(request: any, config: any): Promise<any> {
    this.logInfo('Processing image request with image agent', { 
      messageIdCount: request.messages?.length || 0 
    }, 'processImageRequest');
    
    // Use parent class process method to apply field mapping
    const mappedRequest = await super.process(request);
    
    // Add image-specific metadata
    mappedRequest.agent = 'image';
    mappedRequest.metadata = {
      ...mappedRequest.metadata,
      processingType: 'image',
      imageAnalysis: true
    };
    
    return mappedRequest;
  }

  /**
   * Process code request
   */
  private async processCodeRequest(request: any, config: any): Promise<any> {
    this.logInfo('Processing code request with code agent', { 
      messageIdCount: request.messages?.length || 0 
    }, 'processCodeRequest');
    
    // Use parent class process method to apply field mapping
    const mappedRequest = await super.process(request);
    
    // Add code-specific metadata
    mappedRequest.agent = 'code';
    mappedRequest.metadata = {
      ...mappedRequest.metadata,
      processingType: 'code',
      codeAnalysis: true
    };
    
    return mappedRequest;
  }

  /**
   * Process tool request
   */
  private async processToolRequest(request: any, config: any): Promise<any> {
    this.logInfo('Processing tool request with tool agent', { 
      toolCount: request.tools?.length || 0,
      toolChoice: request.tool_choice
    }, 'processToolRequest');
    
    // Use parent class process method to apply field mapping
    const mappedRequest = await super.process(request);
    
    // Add tool-specific metadata
    mappedRequest.agent = 'tool';
    mappedRequest.metadata = {
      ...mappedRequest.metadata,
      processingType: 'tool',
      toolProcessing: true,
      toolCount: request.tools?.length || 0
    };
    
    return mappedRequest;
  }

  /**
   * Convert OpenAI request to iFlow request using field mapping and agent selection
   */
  public async convertOpenAIToIFlow(openaiRequest: IFlowOpenAIChatRequest): Promise<IFlowChatRequest> {
    const startTime = Date.now();
    
    try {
      this.logInfo('Converting OpenAI request to iFlow', {
        model: openaiRequest.model,
        messageCount: openaiRequest.messages.length,
        hasTools: !!openaiRequest.tools?.length,
        enableAgents: this.iflowConfig.enableAgents
      }, 'convertOpenAIToIFlow');

      let processedRequest: any;

      if (this.iflowConfig.enableAgents) {
        // Agent-based processing
        const selectedAgent = this.selectAgent(openaiRequest);
        this.logInfo('Selected agent for processing', {
          agent: selectedAgent.name,
          reason: 'content-based selection'
        }, 'convertOpenAIToIFlow');

        processedRequest = await selectedAgent.process(openaiRequest, this.iflowConfig);
      } else {
        // Direct field mapping
        processedRequest = await super.process(openaiRequest);
      }
      
      this.logInfo('OpenAI to iFlow conversion completed', { 
        processingTime: Date.now() - startTime,
        iFlowAgentId: processedRequest.agentId,
        hasParameters: !!processedRequest.parameters
      }, 'convertOpenAIToIFlow');

      return processedRequest;
    } catch (error) {
      this.error('Failed to convert OpenAI request to iFlow', error, 'convertOpenAIToIFlow');
      throw error;
    }
  }

  /**
   * Convert iFlow response to OpenAI response using field mapping
   */
  public async convertIFlowToOpenAI(iflowResponse: IFlowChatResponse): Promise<IFlowOpenAIChatResponse> {
    const startTime = Date.now();
    
    try {
      this.logInfo('Converting iFlow response to OpenAI', { 
        taskId: iflowResponse.taskId,
        agentUsed: iflowResponse.metadata?.agentUsed,
        hasResult: !!iflowResponse.result
      }, 'convertIFlowToOpenAI');

      // Use parent class processResponse method to apply field mapping
      const openaiResponse = await super.processResponse(iflowResponse);
      
      // Ensure required OpenAI fields are present
      if (!openaiResponse.object) {
        openaiResponse.object = 'chat.completion';
      }
      if (!openaiResponse.created) {
        openaiResponse.created = Math.floor(Date.now() / 1000);
      }
      
      this.logInfo('iFlow to OpenAI conversion completed', { 
        processingTime: Date.now() - startTime,
        responseId: openaiResponse.id,
        choiceCount: openaiResponse.choices?.length || 0
      }, 'convertIFlowToOpenAI');

      return openaiResponse;
    } catch (error) {
      this.error('Failed to convert iFlow response to OpenAI', error, 'convertIFlowToOpenAI');
      throw error;
    }
  }

  /**
   * Select appropriate agent for request processing
   */
  private selectAgent(request: any): IFlowAgent {
    const defaultAgent = this.agents.get('general');
    if (!defaultAgent) {
      throw new Error('No agents available for processing');
    }

    // Check specialized agents in priority order
    const agentPriority = ['image', 'code', 'tool', 'general'];

    for (const agentName of agentPriority) {
      const agent = this.agents.get(agentName);
      if (agent && agent.shouldHandle(request, this.iflowConfig)) {
        return agent;
      }
    }

    return defaultAgent;
  }

  /**
   * Process method - Required by BasePipelineModule
   */
  async process(request: any): Promise<any> {
    this.logInfo('Processing IFlowCompatibilityModule request', {
      direction: this.iflowConfig.direction,
      model: request.model
    }, 'process');

    try {
      if (this.iflowConfig.direction === 'openai-to-iflow' || this.iflowConfig.direction === 'bidirectional') {
        return this.convertOpenAIToIFlow(request);
      } else {
        throw new Error(`Unsupported direction for request processing: ${this.iflowConfig.direction}`);
      }
    } catch (error) {
      this.error('Error processing request', { error: error as Error, operation: 'process' }, 'process');
      throw error;
    }
  }

  /**
   * Initialize method - Required by IPipelineModule interface
   */
  async initialize(config?: ModuleConfig): Promise<void> {
    if (config) {
      this.iflowConfig = config.config as IFlowCompatibilityConfig;
    }

    this.logInfo('Initializing IFlowCompatibilityModule', this.iflowConfig, 'initialize');

    // Validate configuration
    this.validateIFlowConfig();

    // Initialize base class
    await super.initialize({
      id: this.getId(),
      name: this.getName(),
      version: this.moduleVersion,
      type: 'compatibility',
      config: {
        mappingTable: this.iflowConfig.mappingTable,
        strictMapping: this.iflowConfig.strictMapping,
        preserveUnknownFields: this.iflowConfig.preserveUnknownFields,
        validation: this.iflowConfig.validation
      }
    });

    // Initialize agents if enabled
    if (this.iflowConfig.enableAgents) {
      await this.initializeAgents();
    }

    this.logInfo('IFlowCompatibilityModule initialized successfully', this.iflowConfig, 'initialize');
  }

  /**
   * Get module status - Required by IPipelineModule interface
   */
  async getStatus(): Promise<{
    isInitialized: boolean;
    isRunning: boolean;
    lastError?: Error;
    statistics: {
      requestsProcessed: number;
      averageResponseTime: number;
      errorRate: number;
    };
  }> {
    return {
      isInitialized: this.isConfigured(),
      isRunning: this.isConfigured(),
      lastError: undefined,
      statistics: {
        requestsProcessed: 0,
        averageResponseTime: 0,
        errorRate: 0
      }
    };
  }

  /**
   * Map request fields - Required by ICompatibilityModule interface
   */
  async mapRequest(request: any, provider: string, context: PipelineExecutionContext): Promise<any> {
    this.logInfo('Mapping request for provider', {
      provider,
      requestId: context.requestId,
      direction: this.iflowConfig.direction
    }, 'mapRequest');

    try {
      if (this.iflowConfig.direction === 'openai-to-iflow' || this.iflowConfig.direction === 'bidirectional') {
        return this.convertOpenAIToIFlow(request);
      } else {
        throw new Error(`Unsupported direction for request mapping: ${this.iflowConfig.direction}`);
      }
    } catch (error) {
      this.error('Request mapping failed', error, 'mapRequest');
      throw error;
    }
  }

  /**
   * Map response fields - Required by ICompatibilityModule interface
   */
  async mapResponse(response: any, provider: string, context: PipelineExecutionContext): Promise<any> {
    this.logInfo('Mapping response for provider', {
      provider,
      requestId: context.requestId,
      direction: this.iflowConfig.direction
    }, 'mapResponse');

    try {
      if (this.iflowConfig.direction === 'iflow-to-openai' || this.iflowConfig.direction === 'bidirectional') {
        return this.convertIFlowToOpenAI(response);
      } else {
        throw new Error(`Unsupported direction for response mapping: ${this.iflowConfig.direction}`);
      }
    } catch (error) {
      this.error('Response mapping failed', error, 'mapResponse');
      throw error;
    }
  }

  /**
   * Get field mappings - Required by ICompatibilityModule interface
   */
  getFieldMappings(provider: string): FieldMapping[] {
    // Return default field mappings for iFlow compatibility
    return [
      {
        sourceField: 'model',
        targetField: 'agentId',
        type: 'direct',
        description: 'Map OpenAI model to iFlow agent ID'
      },
      {
        sourceField: 'max_tokens',
        targetField: 'maxTokens',
        type: 'direct',
        description: 'Map max tokens field'
      },
      {
        sourceField: 'messages',
        targetField: 'messages',
        type: 'direct',
        description: 'Messages field remains the same'
      }
    ];
  }

  /**
   * Get compatibility config - Required by ICompatibilityModule interface
   */
  getCompatibilityConfig(provider: string): {
    supportsStreaming: boolean;
    supportedModels: string[];
    specialHandling: Record<string, any>;
  } {
    return {
      supportsStreaming: true,
      supportedModels: ['claude-3-sonnet', 'claude-3-opus', 'gpt-4', 'gpt-3.5-turbo'],
      specialHandling: {
        agentBasedProcessing: this.iflowConfig.enableAgents,
        toolSupport: true,
        imageProcessing: this.iflowConfig.agentConfig?.enableImageAgent
      }
    };
  }

  /**
   * Process response method - Required by BasePipelineModule
   */
  async processResponse(response: any): Promise<any> {
    this.logInfo('Processing IFlowCompatibilityModule response', {
      direction: this.iflowConfig.direction,
      taskId: response.taskId
    }, 'processResponse');

    try {
      if (this.iflowConfig.direction === 'iflow-to-openai' || this.iflowConfig.direction === 'bidirectional') {
        return this.convertIFlowToOpenAI(response);
      } else {
        throw new Error(`Unsupported direction for response processing: ${this.iflowConfig.direction}`);
      }
    } catch (error) {
      this.error('Error processing response', { error: error as Error, operation: 'processResponse' }, 'processResponse');
      throw error;
    }
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
    agentEnabled: boolean;
    availableAgents: string[];
  } {
    return {
      direction: this.iflowConfig.direction,
      mappingTable: this.iflowConfig.mappingTable,
      strictMapping: this.iflowConfig.strictMapping || false,
      modelMappings: this.iflowConfig.modelMapping?.openaiToIFlow || {},
      supportedConversions: ['openai-to-iflow', 'iflow-to-openai'],
      agentEnabled: this.iflowConfig.enableAgents || false,
      availableAgents: Array.from(this.agents.keys())
    };
  }

  /**
   * Get available agents
   */
  public getAvailableAgents(): IFlowAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Validation methods
   */
  public validateOpenAIRequest(request: IFlowOpenAIChatRequest): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
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

  public validateIFlowResponse(response: IFlowChatResponse): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!response.taskId) {
      errors.push('Task ID is required');
    }

    if (!response.result && !response.agentResponse) {
      errors.push('Response result or agentResponse is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}