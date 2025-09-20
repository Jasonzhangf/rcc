import { BaseModule } from 'rcc-basemodule';
import { IServerModule } from './interfaces/IServerModule';
import { Application } from 'express';
import { ServerConfig, ClientRequest, ClientResponse, RouteConfig, ServerStatus, RequestMetrics, ConnectionInfo, MiddlewareConfig } from './types/ServerTypes';
export declare class ServerModule extends BaseModule implements IServerModule {
    private httpServer;
    private forwarder;
    private serverCore;
    private requestHandlerService;
    private serverConfig;
    private isInitialized;
    private isRunning;
    constructor();
    /**
     * 配置服务器 - 只保留基础HTTP配置
     */
    configure(config: any): Promise<void>;
    /**
     * 初始化服务器 - 只初始化HTTP组件和转发器
     */
    initialize(): Promise<void>;
    /**
     * 启动服务器 - 只启动HTTP监听
     */
    start(): Promise<void>;
    /**
     * 处理请求 - 纯转发给调度器
     */
    handleRequest(request: ClientRequest): Promise<ClientResponse>;
    /**
     * 设置调度器管理器 - 转发器必须的依赖
     */
    setSchedulerManager(schedulerManager: any): void;
    /**
     * 设置虚拟模型调度器管理器 - 连接pipeline虚拟模型路由系统
     */
    setVirtualModelSchedulerManager(schedulerManager: any): void;
    /**
     * 获取调度器管理器
     */
    getSchedulerManager(): any | null;
    /**
     * 停止服务
     */
    stop(): Promise<void>;
    /**
     * 重启服务
     */
    restart(): Promise<void>;
    /**
     * 获取基础服务器状态
     */
    getServerStatus(): ServerStatus;
    registerRoute(route: RouteConfig): Promise<void>;
    unregisterRoute(routeId: string): Promise<void>;
    getRoutes(): RouteConfig[];
    registerMiddleware(middleware: MiddlewareConfig): Promise<void>;
    unregisterMiddleware(middlewareId: string): Promise<void>;
    getMiddlewares(): MiddlewareConfig[];
    handleWebSocket(connection: ConnectionInfo): Promise<void>;
    getMetrics(): RequestMetrics[];
    getConnections(): ConnectionInfo[];
    getConfig(): ServerConfig;
    updateConfig(config: Partial<ServerConfig>): void;
    isHealthy(): boolean;
    getHeathStatus(): Record<string, any>;
    getExpressApp(): Application;
    destroy(): Promise<void>;
    private validateConfig;
}
//# sourceMappingURL=ServerModule.d.ts.map