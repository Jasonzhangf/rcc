/**
 * RCC LLMSwitch Module - 标准协议转换层
 * 基于配置表实现协议字段转换，支持多种协议转换实现
 */

import { ModuleInfo, ValidationRule } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import {
  ILLMSwitch,
  IPipelineModule,
  ProtocolType,
  ProtocolConversion,
  PipelineExecutionContext,
  ModuleConfig,
  ProtocolTransformer
} from '../interfaces/ModularInterfaces';
import {
  StandardRequest,
  StandardResponse,
  StandardErrorResponse
} from '../interfaces/StandardInterfaces';

// 重新导出类型以便其他模块使用
export type { ProtocolType } from '../interfaces/ModularInterfaces';
export type { ProtocolTransformer } from '../interfaces/ModularInterfaces';
import * as fs from 'fs';
import * as path from 'path';

// 简化的映射表接口
interface MappingTable {
  version: string;
  description: string;
  fieldMappings: Record<string, any>;
  protocolMappings: Record<string, any>;
  enumMappings: Record<string, any>;
}

/**
 * 协议类型定义 (向后兼容)
 */
export type LegacyProtocolType = 'anthropic' | 'openai' | 'custom';

export interface TransformContext {
  sourceProtocol: ProtocolType;
  targetProtocol: ProtocolType;
  direction: 'request' | 'response';
  traceId?: string;
  timestamp?: number;
}

/**
 * LLMSwitch 配置
 */
export interface LLMSwitchConfig {
  /** 启用的转换器列表 */
  enabledTransformers: string[];
  /** 默认源协议 */
  defaultSourceProtocol: ProtocolType;
  /** 默认目标协议 */
  defaultTargetProtocol: ProtocolType;
  /** 配置表路径 */
  mappingTablePath?: string;
  /** 自定义映射表 */
  customMappings?: MappingTable;
  /** 是否启用严格模式 */
  strictMode?: boolean;
  /** 是否启用协议验证 */
  enableValidation?: boolean;
}

/**
 * 转换器注册信息
 */
export interface TransformerRegistration {
  name: string;
  transformer: ProtocolTransformer;
  priority: number;
  enabled: boolean;
  supportedSourceProtocols: ProtocolType[];
  supportedTargetProtocols: ProtocolType[];
}

/**
 * LLMSwitch 模块 - 实现标准协议转换层
 */
export class LLMSwitchModule extends BasePipelineModule implements ILLMSwitch {
  protected config!: LLMSwitchConfig;
  public readonly moduleId: string;
  public readonly moduleName: string;
  public readonly moduleVersion: string;
  private transformers: Map<string, TransformerRegistration> = new Map();
  private mappingTable: MappingTable | null = null;
  private isInitialized: boolean = false;

  constructor(config: ModuleConfig) {
    // 创建符合BaseModule要求的ModuleInfo
    const moduleInfo: ModuleInfo = {
      id: config.id,
      name: config.name || 'LLMSwitch Module',
      version: config.version || '1.0.0',
      type: 'llmswitch',
      description: 'Handles protocol conversion between different AI providers'
    };
    super(moduleInfo);
    this.moduleId = config.id;
    this.moduleName = config.name || 'LLMSwitch Module';
    this.moduleVersion = config.version || '1.0.0';

    // 设置配置
    this.config = {
      enabledTransformers: ['anthropic-to-openai', 'openai-passthrough'],
      defaultSourceProtocol: ProtocolType.ANTHROPIC,
      defaultTargetProtocol: ProtocolType.OPENAI,
      strictMode: true,
      enableValidation: true,
      ...config.config
    };

    this.logInfo('LLMSwitchModule initialized', { module: this.moduleName }, 'constructor');
  }

  /**
   * 初始化模块 (实现IPipelineModule接口)
   */
  async initialize(config?: ModuleConfig): Promise<void> {
    // 如果有传入配置，合并到现有配置
    if (config) {
      this.config = {
        ...this.config,
        ...config.config
      };
    }

    this.logInfo('Configuring LLMSwitchModule', { config: this.config }, 'initialize');

    // 验证配置
    this.validateConfig();

    // 加载映射表
    await this.loadMappingTable();

    // 注册内置转换器
    this.registerBuiltinTransformers();

    this.isInitialized = true;
    this.logInfo('LLMSwitchModule configured successfully', {
      enabledTransformers: this.config.enabledTransformers,
      sourceProtocol: this.config.defaultSourceProtocol,
      targetProtocol: this.config.defaultTargetProtocol
    }, 'initialize');
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    if (!this.config.enabledTransformers || this.config.enabledTransformers.length === 0) {
      throw new Error('At least one transformer must be enabled');
    }

    if (!this.config.defaultSourceProtocol) {
      throw new Error('Default source protocol is required');
    }

    if (!this.config.defaultTargetProtocol) {
      throw new Error('Default target protocol is required');
    }

    if (this.config.defaultSourceProtocol === this.config.defaultTargetProtocol) {
      throw new Error('Source and target protocols cannot be the same');
    }
  }

  /**
   * 加载映射表
   */
  private async loadMappingTable(): Promise<void> {
    try {
      if (this.config.mappingTablePath) {
        const mappingData = await fs.promises.readFile(this.config.mappingTablePath, 'utf-8');
        this.mappingTable = JSON.parse(mappingData);
        this.logInfo('Mapping table loaded from file', { path: this.config.mappingTablePath }, 'loadMappingTable');
      } else if (this.config.customMappings) {
        this.mappingTable = this.config.customMappings;
        this.logInfo('Using custom mapping table', {}, 'loadMappingTable');
      } else {
        this.warn('No mapping table provided, using default mappings', {}, 'loadMappingTable');
        this.mappingTable = this.getDefaultMappingTable();
      }
    } catch (error) {
      this.error('Failed to load mapping table', error, 'loadMappingTable');
      if (this.config.strictMode) {
        throw error;
      }
      this.mappingTable = this.getDefaultMappingTable();
    }
  }

  /**
   * 获取默认映射表
   */
  private getDefaultMappingTable(): MappingTable {
    return {
      version: '1.0.0',
      description: 'Default LLMSwitch mapping table',
      fieldMappings: [],
      protocolMappings: {
        'anthropic-to-openai': {
          requestFields: [
            { source: 'model', target: 'model', transform: 'direct' },
            { source: 'max_tokens', target: 'max_tokens', transform: 'direct' },
            { source: 'temperature', target: 'temperature', transform: 'direct' },
            { source: 'messages', target: 'messages', transform: 'array' }
          ],
          responseFields: [
            { source: 'content', target: 'content', transform: 'direct' },
            { source: 'stop_reason', target: 'finish_reason', transform: 'enum' },
            { source: 'stop_sequence', target: 'stop_sequence', transform: 'direct' }
          ]
        }
      },
      enumMappings: {
        'finish_reason': {
          'end_turn': 'stop',
          'max_tokens': 'length',
          'stop_sequence': 'stop',
          'tool_use': 'tool_calls'
        }
      }
    };
  }

  /**
   * 注册内置转换器
   */
  private registerBuiltinTransformers(): void {
    // 注册 Anthropic 到 OpenAI 转换器
    this.registerTransformer({
      name: 'anthropic-to-openai',
      transformer: new AnthropicToOpenAITransformer(this.mappingTable || this.getDefaultMappingTable()),
      priority: 100,
      enabled: this.config.enabledTransformers.includes('anthropic-to-openai'),
      supportedSourceProtocols: [ProtocolType.ANTHROPIC],
      supportedTargetProtocols: [ProtocolType.OPENAI]
    });

    // 注册 OpenAI 透传转换器
    this.registerTransformer({
      name: 'openai-passthrough',
      transformer: new OpenAIPassthroughTransformer(),
      priority: 50,
      enabled: this.config.enabledTransformers.includes('openai-passthrough'),
      supportedSourceProtocols: [ProtocolType.OPENAI],
      supportedTargetProtocols: [ProtocolType.OPENAI]
    });

    this.logInfo('Builtin transformers registered', {
      total: this.transformers.size,
      enabled: Array.from(this.transformers.values()).filter(t => t.enabled).length
    }, 'registerBuiltinTransformers');
  }

  /**
   * 注册转换器
   */
  registerTransformer(registration: TransformerRegistration): void {
    this.transformers.set(registration.name, registration);
    this.logInfo('Transformer registered', {
      name: registration.name,
      enabled: registration.enabled,
      priority: registration.priority
    }, 'registerTransformer');
  }

  /**
   * 选择合适的转换器
   */
  private selectTransformer(sourceProtocol: ProtocolType, targetProtocol: ProtocolType): TransformerRegistration | null {
    const candidates = Array.from(this.transformers.values()).filter(reg =>
      reg.enabled &&
      reg.supportedSourceProtocols.includes(sourceProtocol) &&
      reg.supportedTargetProtocols.includes(targetProtocol)
    );

    if (candidates.length === 0) {
      return null;
    }

    // 按优先级排序，选择最高优先级的转换器
    candidates.sort((a, b) => b.priority - a.priority);
    return candidates[0];
  }

  /**
   * 转换请求 (实现ILLMSwitch接口)
   */
  async convertRequest(request: any, fromProtocol: ProtocolType, toProtocol: ProtocolType, context: PipelineExecutionContext): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('LLMSwitch module not initialized');
    }

    const traceId = context.sessionId || this.generateTraceId();

    try {
      this.logInfo('Converting request', {
        traceId,
        fromProtocol,
        toProtocol,
        context
      }, 'convertRequest');

      // 创建标准请求格式
      const standardRequest: StandardRequest = {
        protocol: fromProtocol,
        payload: request,
        metadata: {
          traceId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          timestamp: Date.now()
        }
      };

      // 选择转换器
      const transformer = this.selectTransformer(fromProtocol, toProtocol);
      if (!transformer) {
        throw new Error(`No suitable transformer found for ${fromProtocol} -> ${toProtocol}`);
      }

      // 执行转换
      const transformedRequest = transformer.transformer.transformRequest(standardRequest);

      // 返回转换后的载荷
      return transformedRequest.payload;

    } catch (error) {
      this.error('Request conversion failed', error, 'convertRequest');
      throw error;
    }
  }

  /**
   * 转换响应 (实现ILLMSwitch接口)
   */
  async convertResponse(response: any, fromProtocol: ProtocolType, toProtocol: ProtocolType, context: PipelineExecutionContext): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('LLMSwitch module not initialized');
    }

    const traceId = context.sessionId || this.generateTraceId();

    try {
      this.logInfo('Converting response', {
        traceId,
        fromProtocol,
        toProtocol,
        context
      }, 'convertResponse');

      // 创建标准响应格式
      const standardResponse: StandardResponse = {
        protocol: fromProtocol,
        payload: response,
        metadata: {
          traceId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          timestamp: Date.now()
        }
      };

      // 选择转换器
      const transformer = this.selectTransformer(fromProtocol, toProtocol);
      if (!transformer) {
        // 如果没有找到转换器，直接返回原始响应
        return response;
      }

      // 执行响应转换
      const transformedResponse = transformer.transformer.transformResponse(standardResponse);

      // 返回转换后的载荷
      return transformedResponse.payload;

    } catch (error) {
      this.error('Response conversion failed', error, 'convertResponse');
      throw error;
    }
  }

  /**
   * 获取支持的转换 (实现ILLMSwitch接口)
   */
  getSupportedConversions(): ProtocolConversion[] {
    const conversions: ProtocolConversion[] = [];

    for (const registration of this.transformers.values()) {
      if (registration.enabled) {
        for (const source of registration.supportedSourceProtocols) {
          for (const target of registration.supportedTargetProtocols) {
            conversions.push({
              fromProtocol: source,
              toProtocol: target,
              supported: true,
              description: `${source} to ${target} via ${registration.name}`
            });
          }
        }
      }
    }

    return conversions;
  }

  /**
   * 检查是否支持转换 (实现ILLMSwitch接口)
   */
  supportsConversion(fromProtocol: ProtocolType, toProtocol: ProtocolType): boolean {
    const transformer = this.selectTransformer(fromProtocol, toProtocol);
    return transformer !== null;
  }

  /**
   * 处理请求 - 实现BasePipelineModule接口
   */
  async process(request: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('LLMSwitch module not initialized');
    }

    const startTime = Date.now();
    const traceId = this.generateTraceId();

    try {
      this.logInfo('Processing LLMSwitch request', {
        traceId,
        transformerCount: this.transformers.size
      }, 'process');

      // 创建标准请求格式
      const standardRequest: StandardRequest = {
        protocol: this.config.defaultSourceProtocol,
        payload: request,
        metadata: {
          traceId,
          timestamp: Date.now()
        }
      };

      // 选择转换器
      const transformer = this.selectTransformer(
        this.config.defaultSourceProtocol,
        this.config.defaultTargetProtocol
      );

      if (!transformer) {
        throw new Error(`No suitable transformer found for ${this.config.defaultSourceProtocol} -> ${this.config.defaultTargetProtocol}`);
      }

      // 执行转换
      const transformedRequest = transformer.transformer.transformRequest(standardRequest);

      this.logInfo('LLMSwitch processing completed', {
        traceId,
        transformer: transformer.name,
        processingTime: Date.now() - startTime
      }, 'process');

      return transformedRequest.payload;

    } catch (error) {
      this.error('LLMSwitch processing failed', error, 'process');
      throw error;
    }
  }

  /**
   * 处理响应 - 实现BasePipelineModule接口
   */
  async processResponse(response: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('LLMSwitch module not initialized');
    }

    const traceId = this.generateTraceId();

    try {
      this.logInfo('Processing LLMSwitch response', {
        traceId,
        sourceProtocol: this.config.defaultTargetProtocol,
        targetProtocol: this.config.defaultSourceProtocol
      }, 'processResponse');

      // 创建标准响应格式
      const standardResponse: StandardResponse = {
        protocol: this.config.defaultTargetProtocol,
        payload: response,
        metadata: {
          traceId,
          timestamp: Date.now()
        }
      };

      // 选择转换器（反转方向）
      const transformer = this.selectTransformer(
        this.config.defaultTargetProtocol,
        this.config.defaultSourceProtocol
      );

      if (!transformer) {
        // 如果没有找到转换器，直接返回原始响应
        return response;
      }

      // 执行响应转换
      const transformedResponse = transformer.transformer.transformResponse(standardResponse);

      this.logInfo('LLMSwitch response processing completed', {
        traceId,
        transformer: transformer.name
      }, 'processResponse');

      return transformedResponse.payload;

    } catch (error) {
      this.error('LLMSwitch response processing failed', error, 'processResponse');
      throw error;
    }
  }

  /**
   * 生成追踪ID
   */
  private generateTraceId(): string {
    return `llmswitch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取模块状态 (实现IPipelineModule接口)
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
      isInitialized: this.isInitialized,
      isRunning: this.isInitialized,
      lastError: undefined,
      statistics: {
        requestsProcessed: 0, // 简化实现
        averageResponseTime: 0,
        errorRate: 0
      }
    };
  }

  /**
   * 销毁模块 (实现ILLMSwitch接口)
   */
  async destroy(): Promise<void> {
    await super.destroy();
    this.transformers.clear();
    this.mappingTable = null;
    this.isInitialized = false;
    this.logInfo('LLMSwitchModule destroyed', {}, 'destroy');
  }
}

// 简化的OpenAI透传转换器
class OpenAIPassthroughTransformer implements ProtocolTransformer {
  readonly name = 'openai-passthrough';
  readonly sourceProtocol: ProtocolType = ProtocolType.OPENAI;
  readonly targetProtocol: ProtocolType = ProtocolType.OPENAI;
  readonly version = '1.0.0';

  transformRequest(request: StandardRequest): StandardRequest {
    return {
      protocol: ProtocolType.OPENAI,
      payload: request.payload,
      metadata: request.metadata
    };
  }

  transformResponse(response: StandardResponse): any {
    return response.payload;
  }

  validateInput(request: any): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }

  validateOutput(response: any): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }
}

// 简化的Anthropic到OpenAI转换器
class AnthropicToOpenAITransformer implements ProtocolTransformer {
  readonly name = 'anthropic-to-openai';
  readonly sourceProtocol: ProtocolType = ProtocolType.ANTHROPIC;
  readonly targetProtocol: ProtocolType = ProtocolType.OPENAI;
  readonly version = '1.0.0';
  private mappingTable: MappingTable;

  constructor(mappingTable: MappingTable) {
    this.mappingTable = mappingTable;
  }

  transformRequest(request: StandardRequest): StandardRequest {
    const payload = request.payload;
    const transformedPayload = {
      ...payload,
      // 简化的字段映射
      messages: payload.messages,
      model: payload.model,
      temperature: payload.temperature,
      max_tokens: payload.max_tokens
    };

    return {
      protocol: ProtocolType.OPENAI,
      payload: transformedPayload,
      metadata: request.metadata
    };
  }

  transformResponse(response: StandardResponse): any {
    const payload = response.payload;
    const transformedPayload = {
      ...payload,
      // 简化的字段映射
      content: payload.choices?.[0]?.message?.content,
      stop_reason: payload.choices?.[0]?.finish_reason
    };

    return transformedPayload;
  }

  validateInput(request: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!request.payload?.model) errors.push('Model is required');
    if (!request.payload?.messages) errors.push('Messages are required');
    return { isValid: errors.length === 0, errors };
  }

  validateOutput(response: any): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }
}