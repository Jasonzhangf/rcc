/**
 * RCC Workflow Module - 流式处理层
 * 负责流式和非流式请求的转换，支持多种流式处理策略
 */

import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import {
  IWorkflowModule,
  IPipelineModule,
  PipelineExecutionContext,
  ModuleConfig,
  PipelineStage
} from '../interfaces/ModularInterfaces';

/**
 * Workflow配置
 */
export interface WorkflowConfig {
  /** 默认块大小 */
  defaultChunkSize: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 超时时间 */
  timeout: number;
  /** 流式处理提供商配置 */
  providerConfigs: Record<string, ProviderStreamingConfig>;
  /** 是否启用流式处理 */
  enableStreaming: boolean;
  /** 是否启用批量处理 */
  enableBatching: boolean;
  /** 批处理大小 */
  batchSize: number;
  /** 流式处理日志路径 */
  streamingLogPath?: string;
}

/**
 * 提供商流式配置
 */
export interface ProviderStreamingConfig {
  /** 是否支持流式 */
  supportsStreaming: boolean;
  /** 块大小 */
  chunkSize: number;
  /** 重试次数 */
  maxRetries: number;
  /** 超时时间 */
  timeout: number;
  /** 流式端点 */
  streamingEndpoint?: string;
  /** 批处理端点 */
  batchEndpoint?: string;
}

/**
 * 流式请求上下文
 */
export interface StreamingContext {
  requestId: string;
  sessionId: string;
  providerId: string;
  chunkSize: number;
  timeout: number;
  startTime: number;
  metadata?: Record<string, any>;
}

/**
 * 流式处理结果
 */
export interface StreamingResult {
  success: boolean;
  chunks: any[];
  totalTokens: number;
  processingTime: number;
  error?: string;
}

/**
 * Workflow模块 - 实现流式处理层
 */
export class WorkflowModule extends BasePipelineModule implements IWorkflowModule {
  protected config!: WorkflowConfig;
  public readonly moduleId: string;
  public readonly moduleName: string;
  public readonly moduleVersion: string;
  public ioRecords: any[] = [];
  private providerConfigs: Map<string, ProviderStreamingConfig> = new Map();
  private activeStreams: Map<string, StreamingContext> = new Map();
  private isInitialized: boolean = false;

  constructor(config: ModuleConfig) {
    // 创建符合BaseModule要求的ModuleInfo
    const moduleInfo: ModuleInfo = {
      id: config.id,
      name: config.name || 'Workflow Module',
      version: config.version || '1.0.0',
      type: 'workflow',
      description: 'Handles streaming and non-streaming request conversion'
    };
    super(moduleInfo);
    this.moduleId = config.id;
    this.moduleName = config.name || 'Workflow Module';
    this.moduleVersion = config.version || '1.0.0';

    // 设置配置
    this.config = {
      defaultChunkSize: 1024,
      maxRetries: 3,
      timeout: 30000,
      enableStreaming: true,
      enableBatching: false,
      batchSize: 10,
      ...config.config
    };

    this.logInfo('WorkflowModule initialized', { module: this.moduleName }, 'constructor');
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

    this.logInfo('Initializing WorkflowModule', this.config as unknown as Record<string, unknown>, 'initialize');

    // 验证配置
    this.validateConfig();

    // 初始化提供商配置
    this.initializeProviderConfigs();

    this.isInitialized = true;
    this.logInfo('WorkflowModule initialized successfully', {
      enableStreaming: this.config.enableStreaming,
      providerCount: this.providerConfigs.size
    }, 'initialize');
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    if (!this.config.defaultChunkSize || this.config.defaultChunkSize <= 0) {
      throw new Error('Default chunk size must be positive');
    }

    if (!this.config.maxRetries || this.config.maxRetries < 0) {
      throw new Error('Max retries must be non-negative');
    }

    if (!this.config.timeout || this.config.timeout <= 0) {
      throw new Error('Timeout must be positive');
    }

    if (!this.config.providerConfigs || Object.keys(this.config.providerConfigs).length === 0) {
      throw new Error('At least one provider config is required');
    }
  }

  /**
   * 初始化提供商配置
   */
  private initializeProviderConfigs(): void {
    for (const [providerId, config] of Object.entries(this.config.providerConfigs)) {
      this.providerConfigs.set(providerId, {
        supportsStreaming: config.supportsStreaming,
        chunkSize: config.chunkSize || this.config.defaultChunkSize,
        maxRetries: config.maxRetries || this.config.maxRetries,
        timeout: config.timeout || this.config.timeout,
        streamingEndpoint: config.streamingEndpoint,
        batchEndpoint: config.batchEndpoint
      });

      this.logInfo('Provider config initialized', {
        providerId,
        supportsStreaming: config.supportsStreaming,
        chunkSize: config.chunkSize || this.config.defaultChunkSize
      }, 'initializeProviderConfigs');
    }
  }

  /**
   * 将流式请求转换为非流式 (实现IWorkflowModule接口)
   */
  async convertStreamingToNonStreaming(streamRequest: any, context: PipelineExecutionContext): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Workflow module not initialized');
    }

    const startTime = Date.now();
    const streamingContext: StreamingContext = {
      requestId: context.requestId,
      sessionId: context.sessionId,
      providerId: context.providerId,
      chunkSize: this.getStreamingConfig(context.providerId).chunkSize,
      timeout: this.getStreamingConfig(context.providerId).timeout,
      startTime,
      metadata: context.metadata
    };

    try {
      this.logInfo('Converting streaming to non-streaming', {
        requestId: context.requestId,
        providerId: context.providerId,
        chunkSize: streamingContext.chunkSize
      }, 'convertStreamingToNonStreaming');

      // 检查是否是流式请求
      if (this.isStreamingRequest(streamRequest)) {
        // 收集所有流式数据块
        const chunks = await this.collectStreamingChunks(streamRequest, streamingContext);

        // 合并数据块为单一响应
        const nonStreamingResponse = this.mergeChunksToResponse(chunks);

        this.logInfo('Streaming conversion completed', {
          requestId: context.requestId,
          chunkCount: chunks.length,
          processingTime: Date.now() - startTime
        }, 'convertStreamingToNonStreaming');

        return nonStreamingResponse;
      } else {
        // 非流式请求，直接返回
        this.logInfo('Request is not streaming, returning as-is', {
          requestId: context.requestId
        }, 'convertStreamingToNonStreaming');

        return streamRequest;
      }

    } catch (error) {
      this.error('Streaming to non-streaming conversion failed', error, 'convertStreamingToNonStreaming');
      throw error;
    }
  }

  /**
   * 将非流式响应转换为流式 (实现IWorkflowModule接口)
   */
  async *convertNonStreamingToStreaming(response: any, context: PipelineExecutionContext): AsyncGenerator<any> {
    if (!this.isInitialized) {
      throw new Error('Workflow module not initialized');
    }

    const startTime = Date.now();
    const streamingContext: StreamingContext = {
      requestId: context.requestId,
      sessionId: context.sessionId,
      providerId: context.providerId,
      chunkSize: this.getStreamingConfig(context.providerId).chunkSize,
      timeout: this.getStreamingConfig(context.providerId).timeout,
      startTime,
      metadata: context.metadata
    };

    try {
      this.logInfo('Converting non-streaming to streaming', {
        requestId: context.requestId,
        providerId: context.providerId,
        chunkSize: streamingContext.chunkSize
      }, 'convertNonStreamingToStreaming');

      // 检查提供商是否支持流式
      if (!this.supportsStreaming(context.providerId)) {
        // 不支持流式，返回单一数据块
        yield {
          type: 'response',
          content: response,
          isFinal: true,
          metadata: {
            processingTime: Date.now() - startTime,
            streaming: false
          }
        };
        return;
      }

      // 将响应分割为数据块
      const chunks = this.splitResponseToChunks(response, streamingContext);

      // 逐个产生数据块
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const isFinal = i === chunks.length - 1;

        yield {
          type: 'chunk',
          content: chunk,
          index: i,
          total: chunks.length,
          isFinal,
          metadata: {
            processingTime: Date.now() - startTime,
            streaming: true
          }
        };

        // 添加延迟以模拟流式效果
        if (!isFinal) {
          await this.sleep(50); // 50ms delay between chunks
        }
      }

      this.logInfo('Non-streaming to streaming conversion completed', {
        requestId: context.requestId,
        chunkCount: chunks.length,
        processingTime: Date.now() - startTime
      }, 'convertNonStreamingToStreaming');

    } catch (error) {
      this.error('Non-streaming to streaming conversion failed', error, 'convertNonStreamingToStreaming');
      throw error;
    }
  }

  /**
   * 检查是否支持流式处理 (实现IWorkflowModule接口)
   */
  supportsStreaming(providerId: string): boolean {
    const providerConfig = this.providerConfigs.get(providerId);
    return providerConfig?.supportsStreaming || false;
  }

  /**
   * Process method - 实现 BasePipelineModule 抽象方法
   */
  async process(request: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Workflow module not initialized');
    }

    // 创建简单的执行上下文
    const context: PipelineExecutionContext = {
      sessionId: 'session-' + Date.now(),
      requestId: 'req-' + Date.now(),
      executionId: 'exec-' + Date.now(),
      traceId: 'trace-' + Date.now(),
      routingId: 'default',
      providerId: 'default-provider',
      startTime: Date.now(),
      stage: PipelineStage.REQUEST_INIT,
      timing: {
        startTime: Date.now(),
        endTime: undefined,
        duration: undefined,
        stageTimings: new Map(),
        status: 'pending'
      },
      ioRecords: [],
      metadata: {},
      parentContext: undefined,
      debugConfig: undefined,
      routingDecision: undefined,
      performanceMetrics: undefined
    };

    return this.convertStreamingToNonStreaming(request, context);
  }

  /**
   * Process response method - 可选实现
   */
  async processResponse?(response: any): Promise<any> {
    this.logInfo('Processing response', { responseId: response?.id }, 'processResponse');
    return response;
  }

  /**
   * 获取流式处理配置 (实现IWorkflowModule接口)
   */
  getStreamingConfig(providerId: string): {
    chunkSize: number;
    maxRetries: number;
    timeout: number;
  } {
    const providerConfig = this.providerConfigs.get(providerId);
    if (!providerConfig) {
      throw new Error(`No config found for provider: ${providerId}`);
    }

    return {
      chunkSize: providerConfig.chunkSize,
      maxRetries: providerConfig.maxRetries,
      timeout: providerConfig.timeout
    };
  }

  /**
   * 检查是否是流式请求
   */
  private isStreamingRequest(request: any): boolean {
    // 检查请求中是否包含流式相关字段
    return request.stream === true ||
           request.streaming === true ||
           (request.options && request.options.stream === true) ||
           (Array.isArray(request.messages) && request.messages.some((msg: any) => msg.streaming));
  }

  /**
   * 收集流式数据块
   */
  private async collectStreamingChunks(request: any, context: StreamingContext): Promise<any[]> {
    const chunks: any[] = [];

    // 模拟收集流式数据块的逻辑
    // 在实际实现中，这里会连接到实际的流式数据源
    if (request.chunks && Array.isArray(request.chunks)) {
      chunks.push(...request.chunks);
    } else {
      // 如果没有明确的数据块，将整个请求作为一个数据块
      chunks.push(request);
    }

    return chunks;
  }

  /**
   * 合并数据块为响应
   */
  private mergeChunksToResponse(chunks: any[]): any {
    if (chunks.length === 0) {
      return null;
    }

    if (chunks.length === 1) {
      return chunks[0];
    }

    // 合并多个数据块
    const mergedResponse = {
      ...chunks[0],
      content: chunks.map(chunk => chunk.content || '').join(''),
      usage: {
        total_tokens: chunks.reduce((sum, chunk) => sum + (chunk.usage?.total_tokens || 0), 0),
        prompt_tokens: chunks.reduce((sum, chunk) => sum + (chunk.usage?.prompt_tokens || 0), 0),
        completion_tokens: chunks.reduce((sum, chunk) => sum + (chunk.usage?.completion_tokens || 0), 0)
      }
    };

    return mergedResponse;
  }

  /**
   * 将响应分割为数据块
   */
  private splitResponseToChunks(response: any, context: StreamingContext): any[] {
    const chunks: any[] = [];

    if (!response.content) {
      return [response];
    }

    // 简单的内容分割策略
    const content = response.content;
    const chunkSize = context.chunkSize;

    for (let i = 0; i < content.length; i += chunkSize) {
      const chunkContent = content.substring(i, i + chunkSize);
      const isLastChunk = i + chunkSize >= content.length;

      chunks.push({
        content: chunkContent,
        index: Math.floor(i / chunkSize),
        total: Math.ceil(content.length / chunkSize),
        isFinal: isLastChunk,
        ...response.metadata
      });
    }

    return chunks;
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      statistics: {
        requestsProcessed: 0, // 简化实现
        averageResponseTime: 0,
        errorRate: 0
      }
    };
  }

  /**
   * 销毁模块 (实现IPipelineModule接口)
   */
  async destroy(): Promise<void> {
    await super.destroy();
    this.providerConfigs.clear();
    this.activeStreams.clear();
    this.isInitialized = false;
    this.logInfo('WorkflowModule destroyed', {}, 'destroy');
  }
}