/**
 * RCC LLMSwitch Module - 标准协议转换层
 * 基于配置表实现协议字段转换，支持多种协议转换实现
 */

import { ModuleInfo, ValidationRule } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import { FieldMapping, MappingTable, ProtocolValidator } from '../interfaces/FieldMapping';
import { StandardRequest, StandardResponse, StandardErrorResponse } from '../interfaces/StandardInterfaces';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 协议类型定义
 */
export type ProtocolType = 'anthropic' | 'openai' | 'custom';

export interface TransformContext {
  sourceProtocol: ProtocolType;
  targetProtocol: ProtocolType;
  direction: 'request' | 'response';
  traceId?: string;
  timestamp?: number;
}

/**
 * 转换器接口
 */
export interface ProtocolTransformer {
  readonly name: string;
  readonly sourceProtocol: ProtocolType;
  readonly targetProtocol: ProtocolType;
  readonly version: string;

  /**
   * 转换请求
   */
  transformRequest(request: any): StandardRequest;

  /**
   * 转换响应
   */
  transformResponse(response: StandardRequest): any;

  /**
   * 验证输入协议
   */
  validateInput(request: any): { isValid: boolean; errors: string[] };

  /**
   * 验证输出协议
   */
  validateOutput(response: any): { isValid: boolean; errors: string[] };
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
  /** 是否记录IO */
  enableIORecording?: boolean;
  /** IO记录目录 */
  ioRecordingPath?: string;
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
export class LLMSwitchModule extends BasePipelineModule {
  protected config!: LLMSwitchConfig;
  private transformers: Map<string, TransformerRegistration> = new Map();
  private mappingTable: MappingTable | null = null;
  private ioRecorder: IORecorder | null = null;
  private isInitialized: boolean = false;

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('LLMSwitchModule initialized', { module: this.moduleName }, 'constructor');
  }

  /**
   * 配置 LLMSwitch 模块
   */
  async configure(config: LLMSwitchConfig): Promise<void> {
    this.logInfo('Configuring LLMSwitchModule', config, 'configure');

    this.config = {
      strictMode: true,
      enableValidation: true,
      enableIORecording: true,
      ioRecordingPath: './llmswitch-logs',
      ...config
    };

    // 验证配置
    this.validateConfig();

    // 加载映射表
    await this.loadMappingTable();

    // 初始化IO记录器
    if (this.config.enableIORecording) {
      this.ioRecorder = new IORecorder(this.config.ioRecordingPath!);
    }

    // 注册内置转换器
    this.registerBuiltinTransformers();

    this.isInitialized = true;
    this.logInfo('LLMSwitchModule configured successfully', {
      enabledTransformers: this.config.enabledTransformers,
      sourceProtocol: this.config.defaultSourceProtocol,
      targetProtocol: this.config.defaultTargetProtocol
    }, 'configure');
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
      transformer: new AnthropicToOpenAITransformer(this.mappingTable!),
      priority: 100,
      enabled: this.config.enabledTransformers.includes('anthropic-to-openai'),
      supportedSourceProtocols: ['anthropic'],
      supportedTargetProtocols: ['openai']
    });

    // 注册 OpenAI 透传转换器
    this.registerTransformer({
      name: 'openai-passthrough',
      transformer: new OpenAIPassthroughTransformer(),
      priority: 50,
      enabled: this.config.enabledTransformers.includes('openai-passthrough'),
      supportedSourceProtocols: ['openai'],
      supportedTargetProtocols: ['openai']
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
   * 处理请求 - 实现标准接口
   */
  async process(request: StandardRequest): Promise<StandardResponse | StandardErrorResponse> {
    if (!this.isInitialized) {
      return this.createErrorResponse('LLMSwitch module not initialized', 'not_initialized');
    }

    const startTime = Date.now();
    const traceId = request.metadata?.traceId || this.generateTraceId();

    try {
      this.logInfo('Processing LLMSwitch request', {
        traceId,
        sourceProtocol: request.protocol,
        targetProtocol: this.config.defaultTargetProtocol,
        transformerCount: this.transformers.size
      }, 'process');

      // 记录输入
      if (this.ioRecorder) {
        await this.ioRecorder.recordInput(traceId, request);
      }

      // 验证输入协议
      if (this.config.enableValidation) {
        const validationResult = this.validateInputProtocol(request);
        if (!validationResult.isValid) {
          return this.createErrorResponse(
            `Input validation failed: ${validationResult.errors.join(', ')}`,
            'validation_error',
            { traceId, errors: validationResult.errors }
          );
        }
      }

      // 选择转换器
      const transformer = this.selectTransformer(request.protocol as ProtocolType, this.config.defaultTargetProtocol);
      if (!transformer) {
        return this.createErrorResponse(
          `No suitable transformer found for ${request.protocol} -> ${this.config.defaultTargetProtocol}`,
          'transformer_not_found',
          { traceId, sourceProtocol: request.protocol, targetProtocol: this.config.defaultTargetProtocol }
        );
      }

      // 执行转换
      const transformedRequest = transformer.transformer.transformRequest(request);

      // 验证转换结果
      if (this.config.enableValidation) {
        const validationResult = transformer.transformer.validateOutput(transformedRequest);
        if (!validationResult.isValid) {
          return this.createErrorResponse(
            `Output validation failed: ${validationResult.errors.join(', ')}`,
            'validation_error',
            { traceId, errors: validationResult.errors }
          );
        }
      }

      // 创建标准响应
      const response: StandardResponse = {
        protocol: this.config.defaultTargetProtocol,
        payload: transformedRequest,
        metadata: {
          ...request.metadata,
          traceId,
          transformerName: transformer.name,
          processingTime: Date.now() - startTime,
          conversionApplied: true
        }
      };

      // 记录输出
      if (this.ioRecorder) {
        await this.ioRecorder.recordOutput(traceId, response);
      }

      this.logInfo('LLMSwitch processing completed', {
        traceId,
        transformer: transformer.name,
        processingTime: response.metadata?.processingTime
      }, 'process');

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.error('LLMSwitch processing failed', error, 'process');

      // 创建错误响应
      const errorResponse: StandardErrorResponse = {
        protocol: this.config.defaultTargetProtocol,
        error: {
          code: 'transformation_error',
          message: errorMessage,
          details: {
            traceId,
            sourceProtocol: request.protocol,
            targetProtocol: this.config.defaultTargetProtocol,
            processingTime: Date.now() - startTime
          }
        },
        metadata: {
          ...request.metadata,
          traceId,
          processingTime: Date.now() - startTime
        }
      };

      // 记录错误
      if (this.ioRecorder) {
        await this.ioRecorder.recordError(traceId, errorResponse);
      }

      return errorResponse;
    }
  }

  /**
   * 处理响应 - 实现标准接口
   */
  async processResponse(response: StandardResponse): Promise<StandardResponse | StandardErrorResponse> {
    if (!this.isInitialized) {
      return this.createErrorResponse('LLMSwitch module not initialized', 'not_initialized');
    }

    const traceId = response.metadata?.traceId || this.generateTraceId();

    try {
      this.logInfo('Processing LLMSwitch response', {
        traceId,
        sourceProtocol: response.protocol,
        targetProtocol: this.config.defaultSourceProtocol
      }, 'processResponse');

      // 对于响应转换，我们需要反转协议方向
      const transformer = this.selectTransformer(response.protocol as ProtocolType, this.config.defaultSourceProtocol);
      if (!transformer) {
        // 如果没有找到转换器，直接返回原始响应
        return response;
      }

      // 执行响应转换
      const transformedResponse = transformer.transformer.transformResponse(response);

      this.logInfo('LLMSwitch response processing completed', {
        traceId,
        transformer: transformer.name
      }, 'processResponse');

      return transformedResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.error('LLMSwitch response processing failed', error, 'processResponse');

      return this.createErrorResponse(
        `Response transformation failed: ${errorMessage}`,
        'response_transformation_error',
        { traceId }
      );
    }
  }

  /**
   * 验证输入协议
   */
  private validateInputProtocol(request: StandardRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.protocol) {
      errors.push('Protocol is required');
    }

    if (!request.payload) {
      errors.push('Payload is required');
    }

    // 协议握手验证
    const handshakeResult = this.performProtocolHandshake(request.protocol as ProtocolType);
    if (!handshakeResult.success) {
      errors.push(`Protocol handshake failed: ${handshakeResult.error}`);
    }

    // 基于协议类型的特定验证
    switch (request.protocol) {
      case 'anthropic':
        this.validateAnthropicRequest(request.payload, errors);
        break;
      case 'openai':
        this.validateOpenAIRequest(request.payload, errors);
        break;
      case 'custom':
        // 自定义协议验证可以由用户扩展
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 执行协议握手
   */
  private performProtocolHandshake(protocol: ProtocolType): { success: boolean; error?: string } {
    try {
      // 验证协议是否支持
      if (!this.isProtocolSupported(protocol)) {
        return { success: false, error: `Protocol '${protocol}' is not supported` };
      }

      // 验证是否有可用的转换器
      const availableTransformers = Array.from(this.transformers.values()).filter(reg =>
        reg.enabled && reg.supportedSourceProtocols.includes(protocol)
      );

      if (availableTransformers.length === 0) {
        return { success: false, error: `No available transformers for protocol '${protocol}'` };
      }

      // 验证目标协议可达性
      const targetProtocolReachable = this.isTargetProtocolReachable(this.config.defaultTargetProtocol);
      if (!targetProtocolReachable) {
        return { success: false, error: `Target protocol '${this.config.defaultTargetProtocol}' is not reachable` };
      }

      // 验证配置表加载状态
      if (!this.mappingTable) {
        return { success: false, error: 'Mapping table is not loaded' };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 检查协议是否支持
   */
  private isProtocolSupported(protocol: ProtocolType): boolean {
    const supportedProtocols: ProtocolType[] = ['anthropic', 'openai', 'custom'];
    return supportedProtocols.includes(protocol);
  }

  /**
   * 检查目标协议是否可达
   */
  private isTargetProtocolReachable(targetProtocol: ProtocolType): boolean {
    // 检查是否有转换器可以处理目标协议
    const targetTransformers = Array.from(this.transformers.values()).filter(reg =>
      reg.enabled && reg.supportedTargetProtocols.includes(targetProtocol)
    );
    return targetTransformers.length > 0;
  }

  /**
   * 协议版本兼容性检查
   */
  private checkProtocolCompatibility(sourceProtocol: ProtocolType, targetProtocol: ProtocolType): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];

    // 检查源协议和目标协议是否相同
    if (sourceProtocol === targetProtocol) {
      issues.push('Source and target protocols are the same - transformation may not be needed');
    }

    // 检查是否有兼容的转换器
    const compatibleTransformers = Array.from(this.transformers.values()).filter(reg =>
      reg.enabled &&
      reg.supportedSourceProtocols.includes(sourceProtocol) &&
      reg.supportedTargetProtocols.includes(targetProtocol)
    );

    if (compatibleTransformers.length === 0) {
      issues.push(`No compatible transformers found for ${sourceProtocol} -> ${targetProtocol}`);
    }

    // 检查配置表中是否有对应的映射
    if (this.mappingTable) {
      const mappingKey = `${sourceProtocol}-to-${targetProtocol}`;
      if (!this.mappingTable.protocolMappings[mappingKey]) {
        issues.push(`No protocol mapping found for ${mappingKey}`);
      }
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  /**
   * 验证 Anthropic 请求
   */
  private validateAnthropicRequest(payload: any, errors: string[]): void {
    if (!payload.model) {
      errors.push('Anthropic model is required');
    }
    if (!payload.messages || !Array.isArray(payload.messages)) {
      errors.push('Anthropic messages must be an array');
    }
  }

  /**
   * 验证 OpenAI 请求
   */
  private validateOpenAIRequest(payload: any, errors: string[]): void {
    if (!payload.model) {
      errors.push('OpenAI model is required');
    }
    if (!payload.messages || !Array.isArray(payload.messages)) {
      errors.push('OpenAI messages must be an array');
    }
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(
    message: string,
    code: string,
    details?: any
  ): StandardErrorResponse {
    return {
      protocol: this.config.defaultTargetProtocol,
      error: {
        code,
        message,
        details
      },
      metadata: {
        timestamp: Date.now(),
        moduleName: this.moduleName,
        error: true
      }
    };
  }

  /**
   * 生成追踪ID
   */
  private generateTraceId(): string {
    return `llmswitch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取模块状态
   */
  getStatus(): {
    initialized: boolean;
    transformers: Array<{ name: string; enabled: boolean; priority: number }>;
    mappingTableLoaded: boolean;
    ioRecordingEnabled: boolean;
  } {
    return {
      initialized: this.isInitialized,
      transformers: Array.from(this.transformers.values()).map(t => ({
        name: t.name,
        enabled: t.enabled,
        priority: t.priority
      })),
      mappingTableLoaded: !!this.mappingTable,
      ioRecordingEnabled: !!this.ioRecorder
    };
  }

  /**
   * 销毁模块
   */
  async destroy(): Promise<void> {
    await super.destroy();
    this.transformers.clear();
    this.mappingTable = null;
    this.ioRecorder = null;
    this.isInitialized = false;
    this.logInfo('LLMSwitchModule destroyed', {}, 'destroy');
  }
}

/**
 * IO 记录器
 */
class IORecorder {
  private logDirectory: string;

  constructor(logDirectory: string) {
    this.logDirectory = logDirectory;
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.promises.mkdir(this.logDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create IO recording directory:', error);
    }
  }

  async recordInput(traceId: string, request: StandardRequest): Promise<void> {
    const logFile = path.join(this.logDirectory, `input_${traceId}.json`);
    const logEntry = {
      timestamp: new Date().toISOString(),
      traceId,
      type: 'input',
      request
    };
    await fs.promises.writeFile(logFile, JSON.stringify(logEntry, null, 2));
  }

  async recordOutput(traceId: string, response: StandardResponse): Promise<void> {
    const logFile = path.join(this.logDirectory, `output_${traceId}.json`);
    const logEntry = {
      timestamp: new Date().toISOString(),
      traceId,
      type: 'output',
      response
    };
    await fs.promises.writeFile(logFile, JSON.stringify(logEntry, null, 2));
  }

  async recordError(traceId: string, error: StandardErrorResponse): Promise<void> {
    const logFile = path.join(this.logDirectory, `error_${traceId}.json`);
    const logEntry = {
      timestamp: new Date().toISOString(),
      traceId,
      type: 'error',
      error
    };
    await fs.promises.writeFile(logFile, JSON.stringify(logEntry, null, 2));
  }
}

// 导入实际转换器实现
import { AnthropicToOpenAITransformer } from '../transformers/AnthropicToOpenAITransformer';

// 重新导出转换器类以保持向后兼容性
export { AnthropicToOpenAITransformer };

export class OpenAIPassthroughTransformer implements ProtocolTransformer {
  readonly name = 'openai-passthrough';
  readonly sourceProtocol: ProtocolType = 'openai';
  readonly targetProtocol: ProtocolType = 'openai';
  readonly version = '1.0.0';

  transformRequest(request: any): StandardRequest {
    return {
      protocol: 'openai',
      payload: request.payload,
      metadata: request.metadata
    };
  }

  transformResponse(response: StandardRequest): any {
    return response.payload;
  }

  validateInput(request: any): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }

  validateOutput(response: any): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }
}