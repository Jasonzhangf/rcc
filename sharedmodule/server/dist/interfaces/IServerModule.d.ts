import { ServerConfig, ClientRequest, ClientResponse, ServerStatus, RequestMetrics, ConnectionInfo, MiddlewareConfig } from '../types/ServerTypes';
import { Application } from 'express';
export interface IHttpServer {
    configure(config: ServerConfig): void;
    initialize(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    getExpressApp(): Application;
    isRunning(): boolean;
    setRequestHandler(handler: (request: ClientRequest) => Promise<ClientResponse>): void;
}
export interface IRequestProcessor {
    configure(config: any): Promise<void>;
    initialize(): Promise<void>;
    process(request: ClientRequest): Promise<ClientResponse>;
    destroy(): Promise<void>;
}
export interface IServerMetrics {
    getMetrics(): RequestMetrics[];
    getConnections(): ConnectionInfo[];
    getErrors(): any[];
}
export interface IServerModule {
    initialize(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    handleRequest(request: ClientRequest): Promise<ClientResponse>;
    handleWebSocket(connection: ConnectionInfo): Promise<void>;
    registerRoute(route: RouteConfig): Promise<void>;
    unregisterRoute(routeId: string): Promise<void>;
    getRoutes(): RouteConfig[];
    registerMiddleware(middleware: MiddlewareConfig): Promise<void>;
    unregisterMiddleware(middlewareId: string): Promise<void>;
    getMiddlewares(): MiddlewareConfig[];
    getServerStatus(): ServerStatus;
    getMetrics(): RequestMetrics[];
    getConnections(): ConnectionInfo[];
    getConfig(): ServerConfig;
    updateConfig(config: Partial<ServerConfig>): void;
    setSchedulerManager(schedulerManager: any): void;
    getSchedulerManager(): any | null;
    getExpressApp(): Application;
    isHealthy(): boolean;
    getHeathStatus(): Record<string, any>;
    destroy(): Promise<void>;
}
export interface RouteConfig {
    id: string;
    method: string;
    path: string;
    handler: (request: any, response: any) => void;
    middleware?: string[];
    enabled: boolean;
}
export interface IMiddlewareManager {
    registerMiddleware(middleware: MiddlewareConfig): Promise<void>;
    unregisterMiddleware(middlewareId: string): Promise<void>;
    executePreMiddleware(request: ClientRequest): Promise<ClientRequest>;
    executePostMiddleware(response: ClientResponse): Promise<ClientResponse>;
    getMiddlewares(): MiddlewareConfig[];
    destroy(): Promise<void>;
}
export interface IClientManager {
    addConnection(connection: ConnectionInfo): Promise<void>;
    removeConnection(connectionId: string): Promise<void>;
    getConnection(connectionId: string): ConnectionInfo | undefined;
    getConnections(): ConnectionInfo[];
    broadcast(message: any): Promise<void>;
    sendToClient(connectionId: string, message: any): Promise<void>;
    destroy(): Promise<void>;
}
//# sourceMappingURL=IServerModule.d.ts.map