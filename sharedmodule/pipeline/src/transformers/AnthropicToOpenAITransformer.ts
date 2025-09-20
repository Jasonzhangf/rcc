/**
 * Anthropic to OpenAI Protocol Transformer
 * 实现Anthropic协议到OpenAI协议的完整转换
 */

import { ProtocolTransformer, ProtocolType } from '../interfaces/ModularInterfaces';
import { TransformContext } from '../interfaces/FieldMapping';
import {
  FieldMapping,
  MappingTable,
  FieldTransformerRegistry,
  defaultTransformerRegistry,
  TransformResult,
  TransformContext as FieldTransformContext
} from '../interfaces/FieldMapping';
import { StandardRequest, StandardResponse } from '../interfaces/StandardInterfaces';

/**
 * Anthropic 消息类型
 */
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64';
      media_type: string;
      data: string;
    };
  }>;
}

/**
 * Anthropic 工具调用
 */
interface AnthropicToolUse {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

/**
 * Anthropic 请求格式
 */
interface AnthropicRequest {
  model: string;
  max_tokens: number;
  temperature?: number;
  messages: AnthropicMessage[];
  tools?: Array<{
    name: string;
    description: string;
    input_schema: Record<string, any>;
  }>;
  tool_choice?: { type: 'auto' } | { type: 'tool'; name: string };
  stop_sequences?: string[];
  stream?: boolean;
}

/**
 * Anthropic 响应格式
 */
interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text' | 'tool_use';
    text?: string;
    tool_use?: AnthropicToolUse;
  }>;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * OpenAI 工具调用
 */
interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * OpenAI 请求格式
 */
interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string | Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: { url: string };
    }>;
    tool_call_id?: string;
    name?: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description?: string;
      parameters: Record<string, any>;
    };
  }>;
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  stop?: string | string[];
  stream?: boolean;
}

/**
 * OpenAI 响应格式
 */
interface OpenAIResponse {
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
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Anthropic 到 OpenAI 转换器实现
 */
export class AnthropicToOpenAITransformer implements ProtocolTransformer {
  readonly name = 'anthropic-to-openai';
  readonly sourceProtocol: ProtocolType = 'anthropic';
  readonly targetProtocol: ProtocolType = 'openai';
  readonly version = '1.0.0';

  private mappingTable: MappingTable;
  private transformerRegistry: FieldTransformerRegistry;

  constructor(mappingTable: MappingTable, registry?: FieldTransformerRegistry) {
    this.mappingTable = mappingTable;
    this.transformerRegistry = registry || defaultTransformerRegistry;
  }

  /**
   * 转换请求
   */
  transformRequest(request: any): StandardRequest {
    const anthropicRequest = request as AnthropicRequest;
    const context: TransformContext = {
      sourceProtocol: 'anthropic',
      targetProtocol: 'openai',
      direction: 'request',
      traceId: request.metadata?.traceId
    };

    try {
      const openaiRequest = this.convertAnthropicToOpenAIRequest(anthropicRequest, context);

      return {
        protocol: 'openai',
        payload: openaiRequest,
        metadata: {
          ...request.metadata,
          transformerName: this.name,
          conversionApplied: true,
          originalProtocol: 'anthropic',
          targetProtocol: 'openai'
        }
      };
    } catch (error) {
      throw new Error(`Failed to transform Anthropic request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 转换响应
   */
  transformResponse(response: StandardRequest): any {
    const openaiResponse = response.payload as OpenAIResponse;
    const context: TransformContext = {
      sourceProtocol: 'openai',
      targetProtocol: 'anthropic',
      direction: 'response',
      traceId: response.metadata?.traceId
    };

    try {
      const anthropicResponse = this.convertOpenAIToAnthropicResponse(openaiResponse, context);

      return {
        protocol: 'anthropic',
        payload: anthropicResponse,
        metadata: {
          ...response.metadata,
          transformerName: this.name,
          conversionApplied: true,
          originalProtocol: 'openai',
          targetProtocol: 'anthropic'
        }
      };
    } catch (error) {
      throw new Error(`Failed to transform OpenAI response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 验证输入
   */
  validateInput(request: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.model) {
      errors.push('Model is required');
    }

    if (!request.max_tokens) {
      errors.push('Max tokens is required');
    }

    if (!request.messages || !Array.isArray(request.messages)) {
      errors.push('Messages must be an array');
    }

    // 验证消息格式
    if (request.messages) {
      request.messages.forEach((msg: any, index: number) => {
        if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
          errors.push(`Message ${index}: Invalid role '${msg.role}'`);
        }

        if (!msg.content || !Array.isArray(msg.content)) {
          errors.push(`Message ${index}: Content must be an array`);
        }

        if (msg.content) {
          msg.content.forEach((content: any, contentIndex: number) => {
            if (!content.type || !['text', 'image'].includes(content.type)) {
              errors.push(`Message ${index}, Content ${contentIndex}: Invalid type '${content.type}'`);
            }
          });
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 验证输出
   */
  validateOutput(response: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!response.model) {
      errors.push('Model is required');
    }

    if (!response.messages || !Array.isArray(response.messages)) {
      errors.push('Messages must be an array');
    }

    if (response.choices && !Array.isArray(response.choices)) {
      errors.push('Choices must be an array');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 转换 Anthropic 请求到 OpenAI 请求
   */
  private convertAnthropicToOpenAIRequest(anthropic: AnthropicRequest, context: TransformContext): OpenAIRequest {
    const openai: OpenAIRequest = {
      model: anthropic.model,
      messages: this.convertMessages(anthropic.messages, context),
      temperature: anthropic.temperature,
      max_tokens: anthropic.max_tokens,
      stream: anthropic.stream || false
    };

    // 转换工具
    if (anthropic.tools) {
      openai.tools = anthropic.tools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema
        }
      }));
    }

    // 转换工具选择
    if (anthropic.tool_choice) {
      if (anthropic.tool_choice.type === 'auto') {
        openai.tool_choice = 'auto';
      } else if (anthropic.tool_choice.type === 'tool') {
        openai.tool_choice = {
          type: 'function',
          function: { name: anthropic.tool_choice.name }
        };
      }
    }

    // 转换停止序列
    if (anthropic.stop_sequences) {
      openai.stop = anthropic.stop_sequences;
    }

    return openai;
  }

  /**
   * 转换 OpenAI 响应到 Anthropic 响应
   */
  private convertOpenAIToAnthropicResponse(openai: OpenAIResponse, context: TransformContext): AnthropicResponse {
    const choice = openai.choices[0];
    const anthropic: AnthropicResponse = {
      id: openai.id,
      type: 'message',
      role: 'assistant',
      content: [],
      stop_reason: this.convertFinishReason(choice.finish_reason)
    };

    // 转换内容
    if (choice.message.content) {
      anthropic.content.push({
        type: 'text',
        text: choice.message.content
      });
    }

    // 转换工具调用
    if (choice.message.tool_calls) {
      choice.message.tool_calls.forEach(toolCall => {
        anthropic.content.push({
          type: 'tool_use',
          tool_use: {
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments)
          }
        });
      });

      // 如果有工具调用，更新停止原因
      if (choice.finish_reason === 'tool_calls') {
        anthropic.stop_reason = 'tool_use';
      }
    }

    // 转换使用统计
    if (openai.usage) {
      anthropic.usage = {
        input_tokens: openai.usage.prompt_tokens,
        output_tokens: openai.usage.completion_tokens
      };
    }

    return anthropic;
  }

  /**
   * 转换消息
   */
  private convertMessages(anthropicMessages: AnthropicMessage[], context: TransformContext): OpenAIRequest['messages'] {
    const openaiMessages: OpenAIRequest['messages'] = [];

    anthropicMessages.forEach(anthropicMsg => {
      const openaiMsg: OpenAIRequest['messages'][0] = {
        role: anthropicMsg.role,
        content: []
      };

      // 转换内容
      anthropicMsg.content.forEach(content => {
        if (content.type === 'text' && content.text) {
          if (Array.isArray(openaiMsg.content)) {
            (openaiMsg.content as any[]).push({
              type: 'text',
              text: content.text
            });
          } else {
            openaiMsg.content = content.text;
          }
        } else if (content.type === 'image' && content.source) {
          if (Array.isArray(openaiMsg.content)) {
            (openaiMsg.content as any[]).push({
              type: 'image_url',
              image_url: {
                url: `data:${content.source.media_type};base64,${content.source.data}`
              }
            });
          }
        }
      });

      // 如果内容是数组且只有一个文本元素，简化为字符串
      if (Array.isArray(openaiMsg.content) && openaiMsg.content.length === 1 && openaiMsg.content[0].type === 'text') {
        openaiMsg.content = openaiMsg.content[0].text;
      }

      openaiMessages.push(openaiMsg);
    });

    return openaiMessages;
  }

  /**
   * 转换完成原因
   */
  private convertFinishReason(finishReason: string): AnthropicResponse['stop_reason'] {
    const mapping = {
      'stop': 'end_turn',
      'length': 'max_tokens',
      'tool_calls': 'tool_use',
      'content_filter': 'end_turn'
    };

    return (mapping[finishReason as keyof typeof mapping] || 'end_turn') as AnthropicResponse['stop_reason'];
  }

  
  /**
   * 应用字段映射
   */
  private applyFieldMappings(
    data: any,
    mappings: FieldMapping[],
    context: FieldTransformContext
  ): any {
    const result: any = {};

    mappings.forEach(mapping => {
      const sourceValue = this.getNestedValue(data, mapping.source);

      if (sourceValue !== undefined || mapping.defaultValue !== undefined) {
        const valueToTransform = sourceValue !== undefined ? sourceValue : mapping.defaultValue;

        const transformResult = this.transformerRegistry.transform(
          valueToTransform,
          mapping.transform,
          mapping.params,
          context
        );

        if (transformResult.success) {
          this.setNestedValue(result, mapping.target, transformResult.data!);
        } else if (mapping.required) {
          throw new Error(`Failed to transform field ${mapping.source}: ${transformResult.errors?.join(', ') || 'unknown error'}`);
        }
      } else if (mapping.required) {
        throw new Error(`Required field ${mapping.source} is missing`);
      }
    });

    return result;
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;

    let current = obj;
    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }
}