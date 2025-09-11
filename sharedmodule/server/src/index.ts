// RCC Server Module - Client input proxy response server

// Main exports
export { ServerModule } from './ServerModule';
export { HttpServerComponent } from './components/HttpServer';
export { VirtualModelRouter } from './components/VirtualModelRouter';

// Interfaces
export type { 
  IServerModule,
  IHttpServer,
  IRequestProcessor,
  IVirtualModelRouter,
  IClientManager,
  IMiddlewareManager,
  IServerMetrics
} from './interfaces/IServerModule';

// Types
export type {
  ServerConfig,
  ClientRequest,
  ClientResponse,
  VirtualModelConfig,
  RoutingRule,
  RouteConfig,
  ServerStatus,
  RequestMetrics,
  ConnectionInfo,
  MiddlewareConfig
} from './types/ServerTypes';

// Virtual Model Router types
export type {
  RoutingDecision,
  ModelMetrics
} from './components/VirtualModelRouter';

// Default exports
export default ServerModule;