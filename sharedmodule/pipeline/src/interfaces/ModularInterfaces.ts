/**
 * RCC Pipeline Modular Interfaces
 *
 * 核心模块化接口定义，实现 llmswitch → workflow → compatibility → provider 的流水线架构
 */

import { PipelineStage, ErrorCategory, ErrorSeverity, ExecutionContextFactory, ExecutionContextOptions, ModuleInfo, PipelineExecutionContext } from '../core/PipelineExecutionContext';

// Re-export core types for convenience
export { PipelineStage, ErrorCategory, ErrorSeverity, ExecutionContextFactory, ExecutionContextOptions, ModuleInfo, PipelineExecutionContext } from '../core/PipelineExecutionContext';

/**
 * Enhanced execution error with timestamp
 */
export interface ExecutionError {
  errorId: string;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  timestamp: number;
  context?: Record<string, any>;
}

// 定义PipelineWrapper接口
export interface PipelineWrapper {
  virtualModels: VirtualModel[];
  modules: ModuleConfig[];
  routing: RoutingConfig;
  metadata: Metadata;
}

export interface VirtualModel {
  id: string;
  name: string;
  description?: string;
  targets: VirtualModelTarget[];
  capabilities: string[];
  tags?: string[];
}

export interface VirtualModelTarget {
  providerId: string;
  weight?: number;
  fallback?: boolean;
}

export interface RoutingConfig {
  strategy: string;
  fallbackStrategy: string;
  rules?: RoutingRule[];
}

export interface RoutingRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  priority?: number;
}

export interface Metadata {
  version: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  [key: string]: any;
}

export interface ModuleConfig {
  id: string;
  name: string;
  type: string;
  version?: string;
  config: any;
  enabled?: boolean;
}

/**
 * 协议类型枚举
 */
export enum ProtocolType {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  QWEN = 'qwen',
  IFLOW = 'iflow',
  LMSTUDIO = 'lmstudio'
}

/**
 * 协议转换信息
 */
export interface ProtocolConversion {
  fromProtocol: ProtocolType;
  toProtocol: ProtocolType;
  supported: boolean;
  description?: string;
}

/**
 * IO记录项
 */
export interface IORecord {
  id: string;
  timestamp: number;
  sessionId: string;
  requestId: string;
  type: 'request' | 'response' | 'transformation' | 'error';
  moduleId: string;
  step: string;
  data: any;
  size: number;
  processingTime: number;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * 性能统计
 */
export interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  lastRequestTime: number;
  providerStats: {
    [providerId: string]: {
      requests: number;
      successRate: number;
      averageResponseTime: number;
      lastUsed: number;
    };
  };
  moduleStats: {
    [moduleId: string]: {
      calls: number;
      averageProcessingTime: number;
      errors: number;
    };
  };
}

/**
 * 路由决策
 */
export interface RoutingDecision {
  providerId: string;
  strategy: string;
  fallbackProviders: string[];
  estimatedLatency?: number;
  successProbability?: number;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * 路由优化配置
 */
export interface RoutingOptimizationConfig {
  enableLoadBalancing: boolean;
  enableHealthCheck: boolean;
  healthCheckInterval: number;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  requestTimeout: number;
  retryAttempts: number;
  enableMetrics: boolean;
  metricsCollectionInterval: number;
}

/**
 * 调试配置
 */
export interface DebugConfig {
  enableIOTracking: boolean;
  enablePerformanceMonitoring: boolean;
  enableDetailedLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxLogEntries: number;
  enableSampling: boolean;
  sampleRate: number;
}

// PipelineExecutionContext is now imported from core/PipelineExecutionContext

/**
 * 流水线模块基础接口
 */
export interface IPipelineModule {
  readonly moduleId: string;
  readonly moduleName: string;
  readonly moduleVersion: string;

  /**
   * 初始化模块
   */
  initialize(config?: ModuleConfig): Promise<void>;

  /**
   * 销毁模块
   */
  destroy(): Promise<void>;

  /**
   * 获取模块状态
   */
  getStatus(): Promise<{
    isInitialized: boolean;
    isRunning: boolean;
    lastError?: Error;
    statistics: {
      requestsProcessed: number;
      averageResponseTime: number;
      errorRate: number;
    };
  }>;
}

/**
 * LLM Switch模块接口
 * 负责双向协议转换和响应转换
 */
export interface ILLMSwitch extends IPipelineModule {
  /**
   * 转换请求格式
   */
  convertRequest(request: any, fromProtocol: ProtocolType, toProtocol: ProtocolType, context: PipelineExecutionContext): Promise<any>;

  /**
   * 转换响应格式
   */
  convertResponse(response: any, fromProtocol: ProtocolType, toProtocol: ProtocolType, context: PipelineExecutionContext): Promise<any>;

  /**
   * 获取支持的协议转换
   */
  getSupportedConversions(): ProtocolConversion[];

  /**
   * 检查是否支持特定转换
   */
  supportsConversion(fromProtocol: ProtocolType, toProtocol: ProtocolType): boolean;
}

/**
 * Workflow模块接口
 * 负责流式和非流式请求的转换
 */
export interface IWorkflowModule extends IPipelineModule {
  /**
   * 将流式请求转换为非流式
   */
  convertStreamingToNonStreaming(streamRequest: any, context: PipelineExecutionContext): Promise<any>;

  /**
   * 将非流式响应转换为流式
   */
  convertNonStreamingToStreaming(response: any, context: PipelineExecutionContext): AsyncGenerator<any>;

  /**
   * 检查是否支持流式处理
   */
  supportsStreaming(providerId: string): boolean;

  /**
   * 获取流式处理配置
   */
  getStreamingConfig(providerId: string): {
    chunkSize: number;
    maxRetries: number;
    timeout: number;
  };
}

/**
 * Compatibility模块接口
 * 负责字段映射和第三方提供商兼容性
 */
export interface ICompatibilityModule extends IPipelineModule {
  /**
   * 映射请求字段
   */
  mapRequest(request: any, provider: string, context: PipelineExecutionContext): Promise<any>;

  /**
   * 映射响应字段
   */
  mapResponse(response: any, provider: string, context: PipelineExecutionContext): Promise<any>;

  /**
   * 获取字段映射配置
   */
  getFieldMappings(provider: string): FieldMapping[];

  /**
   * 获取特定提供商的兼容性配置
   */
  getCompatibilityConfig(provider: string): {
    supportsStreaming: boolean;
    supportedModels: string[];
    specialHandling: Record<string, any>;
  };
}

/**
 * Provider模块接口
 * 负责实际的AI服务调用
 */
export interface IProviderModule extends IPipelineModule {
  /**
   * 执行请求
   */
  executeRequest(request: any, context: PipelineExecutionContext): Promise<any>;

  /**
   * 执行流式请求
   */
  executeStreamingRequest(request: any, context: PipelineExecutionContext): AsyncGenerator<any>;

  /**
   * 获取模块化提供商信息
   */
  getModularProviderInfo(): ProviderInfo;

  /**
   * 检查健康状态
   */
  checkHealth(): Promise<{
    isHealthy: boolean;
    responseTime: number;
    error?: string;
  }>;
}

/**
 * 字段映射定义
 */
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  type: 'direct' | 'transform' | 'conditional';
  transformFunction?: string;
  condition?: string;
  description?: string;
}

/**
 * 提供商信息
 */
export interface ProviderInfo {
  id: string;
  name: string;
  type: ProtocolType;
  endpoint: string;
  models: string[];
  capabilities: {
    streaming: boolean;
    functions: boolean;
    vision: boolean;
    maxTokens: number;
  };
  authentication: {
    type: string;
    required: boolean;
  };
}

/**
 * 流水线执行结果
 */
export interface PipelineExecutionResult {
  success: boolean;
  response?: any;
  error?: Error;
  executionTime: number;
  steps: PipelineExecutionStep[];
  context: PipelineExecutionContext;
}

/**
 * 流水线执行步骤
 */
export interface PipelineExecutionStep {
  moduleId: string;
  moduleName: string;
  stepType: 'request' | 'response' | 'transformation' | 'error';
  startTime: number;
  endTime: number;
  input?: any;
  output?: any;
  error?: Error;
}

/**
 * 模块化流水线执行器接口
 */
export interface IModularPipelineExecutor {
  /**
   * 初始化执行器
   */
  initialize(wrapper: PipelineWrapper): Promise<void>;

  /**
   * 执行请求
   */
  execute(request: any, virtualModelId: string, context?: Partial<PipelineExecutionContext>): Promise<PipelineExecutionResult>;

  /**
   * 执行流式请求
   */
  executeStreaming(request: any, virtualModelId: string, context?: Partial<PipelineExecutionContext>): AsyncGenerator<PipelineExecutionStep>;

  /**
   * 获取执行器状态
   */
  getStatus(): Promise<{
    isInitialized: boolean;
    modules: {
      [moduleId: string]: {
        status: string;
        statistics: any;
      };
    };
  }>;

  /**
   * 销毁执行器
   */
  destroy(): Promise<void>;
}

/**
 * 模块工厂接口
 */
export interface IModuleFactory {
  /**
   * 创建LLMSwitch模块实例
   */
  createLLMSwitch(config: ModuleConfig): Promise<ILLMSwitch>;

  /**
   * 创建Workflow模块实例
   */
  createWorkflowModule(config: ModuleConfig): Promise<IWorkflowModule>;

  /**
   * 创建Compatibility模块实例
   */
  createCompatibilityModule(config: ModuleConfig): Promise<ICompatibilityModule>;

  /**
   * 创建Provider模块实例
   */
  createProviderModule(config: ModuleConfig): Promise<IProviderModule>;
}

/**
 * 协议转换器接口
 */
export interface ProtocolTransformer {
  readonly name: string;
  readonly sourceProtocol: ProtocolType;
  readonly targetProtocol: ProtocolType;
  readonly version: string;
  /**
   * 转换请求
   */
  transformRequest(request: any): any;
  /**
   * 转换响应
   */
  transformResponse(response: any): any;
  /**
   * 验证输入
   */
  validateInput(request: any): { isValid: boolean; errors: string[] };
  /**
   * 验证输出
   */
  validateOutput(response: any): { isValid: boolean; errors: string[] };
}

/**
 * 配置验证接口
 */
export interface IConfigurationValidator {
  /**
   * 验证PipelineWrapper配置
   */
  validateWrapper(wrapper: PipelineWrapper): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 验证模块配置
   */
  validateModuleConfig(moduleType: string, config: ModuleConfig): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
}