// Server module types - 纯转发架构 (v3.0)
// 简化配置: 只保留HTTP基础类型，移除所有虚拟模型路由相关类型

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  compression: boolean;
  helmet: boolean;
  rateLimit: {
    windowMs: number;
    max: number;
  };
  timeout: number;
  bodyLimit: string;
  // 移除: virtualModels配置、路由规则、provider相关配置等
}

export interface ClientRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  timestamp: number;
  clientId: string | undefined;
  // 移除: virtualModel, 调度器决策字段等
}

export interface ClientResponse {
  id: string;
  status: number;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
  processingTime: number;
  error?: string;
  requestId: string;
}

// 基础HTTP路由配置（路径路由，不是模型路由）
export interface RouteConfig {
  id: string;
  method: string;
  path: string;
  handler: (request: any, response: any) => void;
  middleware?: string[];
  enabled: boolean;
}

// 中间件配置（保持不变）
export interface MiddlewareConfig {
  id: string;
  name: string;
  type: 'pre' | 'post';
  handler: (requestOrResponse: any) => Promise<any>;
  enabled: boolean;
  priority: number;
  description?: string;
}

// 连接信息（不变）
export interface ConnectionInfo {
  id: string;
  ip: string;
  userAgent?: string;
  connectedAt: number;
  lastActivity: number;
  status: 'connected' | 'disconnected';
  metadata?: Record<string, any>;
}

// 服务器状态（简化版）
export interface ServerStatus {
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  port: number;
  host: string;
  connections: number;
  forwardingReady: boolean;  // 新增: 转发准备状态
  // 移除: virtualModels状态等
}

// 请求监控指标（简化版）
export interface RequestMetrics {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  status: number;
  processingTime: number;
  clientId?: string;
  error?: string;
  // 移除: virtualModel, provider, 调度器状态等
}

// 管道集成配置（保持不变）
export interface PipelineIntegrationConfig {
  enabled: boolean;
  unifiedErrorHandling: boolean;
  unifiedMonitoring: boolean;
  errorMapping: Record<string, string>;
  monitoringConfig?: {
    enableDetailedMetrics: boolean;
    enableRequestTracing: boolean;
    enablePerformanceMonitoring: boolean;
  };
}