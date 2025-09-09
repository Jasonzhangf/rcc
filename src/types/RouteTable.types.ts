/**
 * RCC 路由表配置类型定义
 * 定义静态路由表的用户配置结构
 */

export interface StaticRouteTable {
  version: string;                    // 配置版本
  description?: string;               // 配置描述
  globalSettings: GlobalSettings;      // 全局设置
  categories: VirtualModelCategories;  // 虚拟模型类别
}

export interface GlobalSettings {
  defaultCategory: string;             // 默认模型类别
  loadBalancer: LoadBalancerConfig;    // 负载均衡配置
  healthCheck: HealthCheckConfig;      // 健康检查配置
  metrics: MetricsConfig;              // 指标收集配置
  cache: CacheConfig;                  // 缓存配置
}

export interface LoadBalancerConfig {
  algorithm: 'weighted_round_robin' | 'least_connections' | 'random' | 'custom';
  healthCheckInterval: number;         // 健康检查间隔(ms)
  retryAttempts: number;               // 重试次数
  retryDelay: number;                  // 重试延迟(ms)
  circuitBreaker?: CircuitBreakerConfig; // 熔断器配置
}

export interface CircuitBreakerConfig {
  failureThreshold: number;           // 失败阈值
  recoveryTime: number;               // 恢复时间(ms)
  requestVolumeThreshold: number;      // 请求量阈值
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;                    // 检查间隔(ms)
  timeout: number;                     // 超时时间(ms)
  endpoint?: string;                  // 健康检查端点
}

export interface MetricsConfig {
  enabled: boolean;
  collectionInterval: number;          // 收集间隔(ms)
  retentionDays: number;               // 保留天数
}

export interface CacheConfig {
  enabled: boolean;
  maxSize: number;                     // 最大缓存数量
  ttl: number;                         // 缓存存活时间(ms)
}

export type VirtualModelCategories = {
  [categoryName: string]: VirtualModelCategory;
};

export interface VirtualModelCategory {
  displayName: string;                 // 显示名称
  description: string;                 // 类别描述
  enabled: boolean;                    // 是否启用
  defaultProvider?: string;             // 默认提供商
  targets: RouteTarget[];              // 路由目标列表
  fallbackCategory?: string;           // 回退类别
  metadata?: {                         // 类别特定元数据
    maxInputLength?: number;
    preferredLanguage?: string;
    supportedFormats?: string[];
    costOptimization?: boolean;
  };
}

export interface RouteTarget {
  id: string;                          // 唯一标识
  provider: string;                    // 提供商名称
  model: string;                       // 模型名称
  weight: number;                      // 负载均衡权重 (1-1000)
  enabled: boolean;                    // 是否启用
  priority: number;                    // 优先级 (1-10, 1为最高)
  metadata?: RouteTargetMetadata;      // 路由目标元数据
  constraints?: RouteConstraints;      // 路由约束
  cost?: CostSettings;                 // 成本设置
}

export interface RouteTargetMetadata {
  displayName?: string;                // 显示名称
  description?: string;                // 描述
  maxTokens?: number;                  // 最大令牌数
  temperature?: number;                // 温度参数(0-1)
  topP?: number;                       // top_p参数(0-1)
  frequencyPenalty?: number;           // 频率惩罚(-2至2)
  presencePenalty?: number;            // 存在惩罚(-2至2)
  timeout?: number;                    // 请求超时时间(ms)
  retries?: number;                    // 重试次数
  region?: string;                     // 地区偏好
  supportedLanguages?: string[];       // 支持的语言
  capabilities?: string[];            // 能力标签(如: 'code', 'math', 'vision')
  tags?: string[];                     // 自定义标签
}

export interface RouteConstraints {
  maxInputLength?: number;             // 最大输入长度
  minInputLength?: number;             // 最小输入长度
  allowedContentTypes?: string[];     // 允许的内容类型
  blockedContentTypes?: string[];      // 阻止的内容类型
  requiredCapabilities?: string[];     // 需要的能力
  excludedCapabilities?: string[];     // 排除的能力
  timeWindows?: TimeWindow[];          // 时间窗口约束
  rateLimits?: RateLimit[];           // 速率限制
}

export interface TimeWindow {
  dayOfWeek: number;                   // 0-6 (周日-周六)
  startHour: number;                   // 0-23
  endHour: number;                     // 0-23
  enabled: boolean;                    // 是否启用
}

export interface RateLimit {
  requestsPerMinute?: number;          // 每分钟请求数
  requestsPerHour?: number;            // 每小时请求数
  requestsPerDay?: number;             // 每天请求数
}

export interface CostSettings {
  costFactor: number;                  // 成本因子 (默认为1.0)
  budgetLimit?: number;                // 预算限制
  alertThreshold?: number;             // 告警阈值
  costOptimization: boolean;           // 是否启用成本优化
}

/**
 * 扩展路由表类型 (运行时使用)
 */
export interface ExtendedRouteTable {
  version: string;
  generatedAt: Date;
  globalSettings: {
    defaultCategory: string;
    loadBalancer: LoadBalancerConfig;
  };
  categories: ExtendedVirtualModelCategories;
}

export type ExtendedVirtualModelCategories = {
  [categoryName: string]: ExtendedVirtualModelCategory;
};

export interface ExtendedVirtualModelCategory {
  displayName: string;
  description: string;
  enabled: boolean;
  targets: ExtendedRouteTarget[];
  balancer: LoadBalancer;
  fallbackCategory?: string;
}

export interface ExtendedRouteTarget {
  id: string;
  provider: string;
  model: string;
  key: string;                         // provider.model.id 的唯一key
  pipeline: PipelineConfiguration;    // 流水线配置
  weight: number;
  enabled: boolean;
  priority: number;
  status: RouteTargetStatus;           // 当前状态
  metadata?: RouteTargetMetadata;
  constraints?: RouteConstraints;
  cost?: CostSettings;
  stats: RouteTargetStats;              // 统计数据
}

export type RouteTargetStatus = 'healthy' | 'degraded' | 'unhealthy' | 'disabled';

export interface PipelineConfiguration {
  endpoint: string;                    // API端点
  authentication: AuthConfiguration;   // 认证配置
  parameters: ModelParameters;         // 模型参数
  rateLimit?: RateLimit;               // 限流配置
  timeout: number;                     // 请求超时时间(ms)
  retries: number;                     // 重试次数
  headers?: Record<string, string>;    // 自定义请求头
  fallback?: FallbackConfiguration;    // 回退配置
}

export interface AuthConfiguration {
  type: 'bearer' | 'basic' | 'api-key' | 'custom';
  credentials: AuthCredentials;
}

export interface AuthCredentials {
  apiKey?: string;                     // API密钥
  token?: string;                      // Bearer token
  username?: string;                   // 用户名(basic auth)
  password?: string;                   // 密码(basic auth)
  customHeaders?: Record<string, string>; // 自定义认证头
}

export interface ModelParameters {
  model: string;                       // 模型名称
  max_tokens?: number;                 // 最大令牌数
  temperature?: number;                // 温度
  top_p?: number;                       // top_p
  top_k?: number;                       // top_k
  frequency_penalty?: number;           // 频率惩罚
  presence_penalty?: number;            // 存在惩罚
  stop?: string[];                     // 停止序列
  stream?: boolean;                    // 是否流式输出
  // 提供商特定参数
  [key: string]: any;
}

export interface FallbackConfiguration {
  enabled: boolean;                    // 是否启用回退
  fallbackModel?: string;              // 回退模型
  maxRetries: number;                  // 最大重试次数
  backoffFactor: number;               // 退避因子
  jitter: boolean;                     // 是否添加抖动
}

export interface RouteTargetStats {
  totalRequests: number;               // 总请求数
  successfulRequests: number;          // 成功请求数
  failedRequests: number;              // 失败请求数
  totalLatency: number;                // 总延迟(ms)
  averageLatency: number;              // 平均延迟(ms)
  lastUsed: Date;                      // 最后使用时间
  lastHealthCheck: Date;               // 最后健康检查时间
  consecutiveFailures: number;         // 连续失败次数
}

export interface LoadBalancer {
  algorithm: string;
  select(): ExtendedRouteTarget;
  update(targetId: string, status: RouteTargetStatus): void;
  getStats(): LoadBalancerStats;
  resetStats(): void;
}

export interface LoadBalancerStats {
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  targetStats: {
    [targetId: string]: RouteTargetStats;
  };
}