import { ServerConfig, ClientRequest, ClientResponse, VirtualModelConfig, RouteConfig, ServerStatus, RequestMetrics, ConnectionInfo, MiddlewareConfig, PipelineIntegrationConfig } from '../types/ServerTypes';
import { UnderConstruction } from 'rcc-underconstruction';
import { Application } from 'express';
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
    registerVirtualModel(model: VirtualModelConfig): Promise<void>;
    unregisterVirtualModel(modelId: string): Promise<void>;
    getVirtualModel(modelId: string): VirtualModelConfig | undefined;
    getVirtualModels(): VirtualModelConfig[];
    registerMiddleware(middleware: MiddlewareConfig): Promise<void>;
    unregisterMiddleware(middlewareId: string): Promise<void>;
    getStatus(): ServerStatus;
    getMetrics(): RequestMetrics[];
    getConnections(): ConnectionInfo[];
    getHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        checks: Record<string, boolean>;
        timestamp: number;
    }>;
    updateConfig(config: Partial<ServerConfig>): Promise<void>;
    getConfig(): ServerConfig;
    setUnderConstructionModule(underConstruction: UnderConstruction): Promise<void>;
    processVirtualModelRequest(request: ClientRequest, model: VirtualModelConfig): Promise<ClientResponse>;
    getPipelineIntegrationConfig(): PipelineIntegrationConfig;
}
export interface IHttpServer {
    listen(port: number, host?: string): Promise<void>;
    close(): Promise<void>;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    getConnections(callback: (err: Error | null, count: number) => void): void;
    destroy(): Promise<void>;
    getApp(): Application;
    isServerRunning(): boolean;
    configure(config: ServerConfig): void;
    initialize(): Promise<void>;
}
export interface IRequestProcessor {
    process(request: ClientRequest): Promise<ClientResponse>;
    validate(request: ClientRequest): Promise<boolean>;
    sanitize(request: ClientRequest): ClientRequest;
    enrich(request: ClientRequest): ClientRequest;
}
export interface IVirtualModelRouter {
    routeRequest(request: ClientRequest): Promise<VirtualModelConfig>;
    registerModel(model: VirtualModelConfig): Promise<void>;
    unregisterModel(modelId: string): Promise<void>;
    updateRoutingRules(modelId: string, rules: any[]): Promise<void>;
    getModelMetrics(modelId: string): Promise<any>;
    destroy(): Promise<void>;
    getModels(): VirtualModelConfig[];
    getModel(modelId: string): VirtualModelConfig | undefined;
    getEnabledModels(): VirtualModelConfig[];
}
export interface IClientManager {
    addConnection(connection: ConnectionInfo): Promise<void>;
    removeConnection(connectionId: string): Promise<void>;
    getConnection(connectionId: string): ConnectionInfo | undefined;
    getConnections(): ConnectionInfo[];
    broadcast(message: any): Promise<void>;
    sendToClient(connectionId: string, message: any): Promise<void>;
}
export interface IMiddlewareManager {
    registerMiddleware(middleware: MiddlewareConfig): Promise<void>;
    unregisterMiddleware(middlewareId: string): Promise<void>;
    executePreMiddleware(request: ClientRequest): Promise<ClientRequest>;
    executePostMiddleware(request: ClientRequest, response: ClientResponse): Promise<ClientResponse>;
    executeErrorMiddleware(error: Error, request: ClientRequest): Promise<ClientResponse>;
}
export interface IServerMetrics {
    recordRequest(metrics: RequestMetrics): Promise<void>;
    getMetrics(timeRange?: {
        start: number;
        end: number;
    }): Promise<RequestMetrics[]>;
    getAggregatedMetrics(timeRange?: {
        start: number;
        end: number;
    }): Promise<{
        totalRequests: number;
        averageResponseTime: number;
        errorRate: number;
        requestsPerSecond: number;
        bandwidth: number;
    }>;
    resetMetrics(): Promise<void>;
}
