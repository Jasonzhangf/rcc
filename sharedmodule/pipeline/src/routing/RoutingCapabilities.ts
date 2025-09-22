/**
 * Routing Capabilities Interface - Describes routing capabilities of pipeline pools
 * 路由能力接口 - 描述流水线池的路由能力
 */

/**
 * Routing Context Interface - Context information for routing decisions
 * 路由上下文接口 - 路由决策的上下文信息
 */
export interface RoutingContext {
  /**
   * 请求ID
   */
  requestId: string;

  /**
   * 用户ID
   */
  userId?: string;

  /**
   * 会话ID
   */
  sessionId?: string;

  /**
   * 时间戳
   */
  timestamp: number;

  /**
   * 客户端信息
   */
  clientInfo?: {
    userAgent?: string;
    region?: string;
    deviceType?: string;
  };

  /**
   * 自定义元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 路由能力配置
 */
export interface RoutingCapabilities {
  /**
   * 支持的模型列表
   */
  supportedModels: string[];

  /**
   * 最大token限制
   */
  maxTokens: number;

  /**
   * 是否支持流式响应
   */
  supportsStreaming: boolean;

  /**
   * 是否支持工具调用
   */
  supportsTools: boolean;

  /**
   * 是否支持图像处理
   */
  supportsImages: boolean;

  /**
   * 是否支持函数调用
   */
  supportsFunctionCalling: boolean;

  /**
   * 是否支持多模态输入
   */
  supportsMultimodal: boolean;

  /**
   * 支持的输入模态列表
   */
  supportedModalities: string[];

  /**
   * 优先级（数字越大优先级越高）
   */
  priority: number;

  /**
   * 可用性（0-1，1表示完全可用）
   */
  availability: number;

  /**
   * 负载权重（用于负载均衡）
   */
  loadWeight: number;

  /**
   * 成本分数（用于成本优化）
   */
  costScore: number;

  /**
   * 性能分数（基于响应时间）
   */
  performanceScore: number;

  /**
   * 路由规则标签
   */
  routingTags: string[];

  /**
   * 扩展能力配置
   */
  extendedCapabilities?: {
    supportsVision?: boolean;
    supportsAudio?: boolean;
    supportsCodeExecution?: boolean;
    supportsWebSearch?: boolean;
    maxContextLength?: number;
    temperatureRange?: [number, number];
    topPRange?: [number, number];
  };

  /**
   * 区域限制
   */
  regionRestrictions?: {
    allowedRegions?: string[];
    deniedRegions?: string[];
  };

  /**
   * 使用限制
   */
  usageLimits?: {
    maxRequestsPerMinute?: number;
    maxTokensPerMinute?: number;
    maxConcurrentRequests?: number;
  };
}

/**
 * 请求分析结果
 */
export interface RequestAnalysisResult {
  /**
   * 请求token数量
   */
  tokenCount: number;

  /**
   * 是否包含工具调用
   */
  hasToolCalls: boolean;

  /**
   * 是否包含图像
   */
  hasImages: boolean;

  /**
   * 是否包含函数调用
   */
  hasFunctionCalls: boolean;

  /**
   * 输入模态类型
   */
  modalities: string[];

  /**
   * 请求类型
   */
  requestType: 'chat' | 'completion' | 'embedding' | 'function_call' | 'tool_call';

  /**
   * 复杂度评分
   */
  complexityScore: number;

  /**
   * 优先级需求
   */
  priority: 'low' | 'medium' | 'high' | 'critical';

  /**
   * 流式需求
   */
  requiresStreaming: boolean;

  /**
   * 特殊需求
   */
  specialRequirements: {
    needsVision?: boolean;
    needsAudio?: boolean;
    needsCodeExecution?: boolean;
    needsWebSearch?: boolean;
    needsMultimodal?: boolean;
    maxTokensRequired?: number;
    temperatureRequired?: number;
    topPRequired?: number;
  };

  /**
   * 用户上下文
   */
  userContext?: {
    userId?: string;
    sessionId?: string;
    userTier?: string;
    region?: string;
  };
}

/**
 * 路由匹配结果
 */
export interface RoutingMatchResult {
  /**
   * 是否匹配成功
   */
  isMatch: boolean;

  /**
   * 匹配分数（0-1，1表示完全匹配）
   */
  matchScore: number;

  /**
   * 匹配详情
   */
  matchDetails: {
    capabilities: {
      modelSupport: boolean;
      tokenSupport: boolean;
      streamingSupport: boolean;
      toolsSupport: boolean;
      imagesSupport: boolean;
      multimodalSupport: boolean;
      modalitySupport: boolean;
      availability: boolean;
      region: boolean;
      usageLimits: boolean;
    };
    scores: {
      capabilityScore: number;
      performanceScore: number;
      costScore: number;
      priorityScore: number;
      overallScore: number;
    };
  };

  /**
   * 不匹配的原因
   */
  mismatchReasons?: string[];

  /**
   * 建议的参数调整
   */
  suggestedAdjustments?: {
    reduceTokens?: boolean;
    disableTools?: boolean;
    removeImages?: boolean;
    changeModel?: boolean;
  };
}

/**
 * 路由决策
 */
export interface RoutingDecision {
  /**
   * 目标路由ID
   */
  targetRoutingId: string;

  /**
   * 选择的流水线池ID
   */
  selectedPoolId: string;

  /**
   * 匹配结果
   */
  matchResult: RoutingMatchResult;

  /**
   * 备选方案
   */
  alternatives?: Array<{
    routingId: string;
    matchScore: number;
    reason: string;
  }>;

  /**
   * 路由元数据
   */
  metadata?: {
    routingTime: number;
    strategyUsed: string;
    decisionReason: string;
    fallbackUsed: boolean;
  };
}

/**
 * 路由规则
 */
export interface RoutingRule {
  /**
   * 规则名称
   */
  name: string;

  /**
   * 规则描述
   */
  description: string;

  /**
   * 启用状态
   */
  enabled: boolean;

  /**
   * 优先级（数字越大优先级越高）
   */
  priority: number;

  /**
   * 条件匹配器
   */
  conditions: Array<{
    field: keyof RequestAnalysisResult;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'regex';
    value: any;
  }>;

  /**
   * 动作
   */
  actions: Array<{
    type: 'select_routing' | 'set_priority' | 'add_metadata' | 'transform_request';
    target: string;
    parameters?: Record<string, any>;
  }>;

  /**
   * 权重
   */
  weight: number;

  /**
   * 失效时间
   */
  expiresAt?: Date;
}

/**
 * 路由策略配置
 */
export interface RoutingStrategyConfig {
  /**
   * 策略名称
   */
  name: string;

  /**
   * 策略描述
   */
  description: string;

  /**
   * 默认策略
   */
  isDefault: boolean;

  /**
   * 启用状态
   */
  enabled: boolean;

  /**
   * 匹配算法
   */
  matchingAlgorithm: 'exact' | 'score_based' | 'weighted' | 'priority_based' | 'hybrid';

  /**
   * 权重配置
   */
  weights: {
    capabilityScore: number;
    performanceScore: number;
    costScore: number;
    availabilityScore: number;
    priorityScore: number;
  };

  /**
   * 阈值配置
   */
  thresholds: {
    minimumMatchScore: number;
    highAvailabilityThreshold: number;
    loadBalanceThreshold: number;
  };

  /**
   * 默认回退路由
   */
  fallbackRouting?: string;

  /**
   * 负载均衡配置
   */
  loadBalancing: {
    enabled: boolean;
    strategy: 'round_robin' | 'weighted' | 'least_connections' | 'random';
    weights?: Map<string, number>;
  };
}