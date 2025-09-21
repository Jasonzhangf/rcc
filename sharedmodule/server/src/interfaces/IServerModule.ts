// 服务器模块接口 - 纯HTTP服务和调度器连接

import {
  ServerConfig,
  ClientRequest,
  ClientResponse,
  ServerStatus,
  RequestMetrics,
  ConnectionInfo,
  MiddlewareConfig,
  PipelineIntegrationConfig
} from '../types/ServerTypes';

import { UnderConstruction } from 'rcc-underconstruction';
import { Application } from 'express';

// 纯转发架构 - 移除所有虚拟模型相关内容

// HTTP服务器接口
export interface IHttpServer {
  configure(config: ServerConfig): void;
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  getExpressApp(): Application;
  isRunning(): boolean;
  setRequestHandler(handler: (request: ClientRequest) => Promise<ClientResponse>): void;
}

// 请求处理器接口
export interface IRequestProcessor {
  configure(config: any): Promise<void>;
  initialize(): Promise<void>;
  process(request: ClientRequest): Promise<ClientResponse>;
  destroy(): Promise<void>;
}

// 服务端指标接口
export interface IServerMetrics {
  getMetrics(): RequestMetrics[];
  getConnections(): ConnectionInfo[];
  getErrors(): any[];
}

export interface IServerModule {
  // 生命周期方法
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;

  // 请求处理 - 纯转发给调度器
  handleRequest(request: ClientRequest): Promise<ClientResponse>;
  handleWebSocket(connection: ConnectionInfo): Promise<void>;

  // 基础路由管理（HTTP路径，不是虚拟模型）
  registerRoute(route: RouteConfig): Promise<void>;
  unregisterRoute(routeId: string): Promise<void>;
  getRoutes(): RouteConfig[];

  // 中间件管理
  registerMiddleware(middleware: MiddlewareConfig): Promise<void>;
  unregisterMiddleware(middlewareId: string): Promise<void>;
  getMiddlewares(): MiddlewareConfig[];

  // 服务器状态
  getServerStatus(): ServerStatus;
  getMetrics(): RequestMetrics[];
  getConnections(): ConnectionInfo[];

  // 基础HTTP配置
  getConfig(): ServerConfig;
  updateConfig(config: Partial<ServerConfig>): void;

  // 与调度器的纯转发连接
  setSchedulerManager(schedulerManager: any): void;
  getSchedulerManager(): any | null;

  // Express应用访问
  getExpressApp(): Application;

  // 健康检查
  isHealthy(): boolean;
  getHeathStatus(): Record<string, any>;

  // 生命周期管理
  destroy(): Promise<void>;
}

// 路由配置（基础HTTP路由，不是虚拟模型路由）
export interface RouteConfig {
  id: string;
  method: string;
  path: string;
  handler: (request: any, response: any) => void;
  middleware?: string[];
  enabled: boolean;
}

// Express中间件接口保持不变
export interface IMiddlewareManager {
  registerMiddleware(middleware: MiddlewareConfig): Promise<void>;
  unregisterMiddleware(middlewareId: string): Promise<void>;
  executePreMiddleware(request: ClientRequest): Promise<ClientRequest>;
  executePostMiddleware(response: ClientResponse): Promise<ClientResponse>;
  getMiddlewares(): MiddlewareConfig[];
  destroy(): Promise<void>;
}

// 客户端管理接口保持不变
export interface IClientManager {
  addConnection(connection: ConnectionInfo): Promise<void>;
  removeConnection(connectionId: string): Promise<void>;
  getConnection(connectionId: string): ConnectionInfo | undefined;
  getConnections(): ConnectionInfo[];
  broadcast(message: any): Promise<void>;
  sendToClient(connectionId: string, message: any): Promise<void>;
  destroy(): Promise<void>;
}