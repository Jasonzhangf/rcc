// RCC Server Module - Client input proxy response server

// Main exports
export { ServerModule } from './ServerModule';
export { HttpServerComponent } from './components/HttpServer';
export { RequestForwarder } from './components/RequestForwarder';  // 替换 VirtualModelRouter

// Interfaces - 移除所有虚拟模型相关接口
export type {
  IServerModule,
  IHttpServer,
  IClientManager,
  IMiddlewareManager,
  RouteConfig
} from './interfaces/IServerModule';

export type { IServerForwarder } from './interfaces/IServerForwarder'; // 新接口: 纯转发

// Types - 简化类型，移除虚拟模型相关类型
export type {
  ServerConfig,
  ClientRequest,
  ClientResponse,
  ServerStatus,
  RequestMetrics,
  ConnectionInfo,
  MiddlewareConfig,
  PipelineIntegrationConfig
} from './types/ServerTypes';

// Utilities - Not currently implemented
// export { ImportManager } from './utils/dynamic-import-manager';
// export { JsonManager } from './utils/safe-json';

// Version info
export const version = '3.0.0';
export const name = 'RCC Server Module';

/**
 * Server Module 重要架构变更说明:
 *
 * 版本 v3.0 重大变化:
 * 1. 架构: "智能路由" → "纯转发"
 * 2. 组件: VirtualModelRouter → RequestForwarder
 * 3. 职责: Server负责HTTP转发，调度器负责所有智能决策
 * 4. 配置: 移除所有虚拟模型相关配置，只保留基础HTTP配置
 * 5. 接口: 新增 IServerForwarder，删除 IVirtualModelRouter
 *
 * 新架构:
 * 用户请求 → Server(HTTP监听) → RequestForwarder(纯转发) → VirtualModelScheduler(智能调度) → Provider(执行)
 *
 * 所有模型选择、负载均衡、故障转移等功能，**全部交给调度器处理**！
 */