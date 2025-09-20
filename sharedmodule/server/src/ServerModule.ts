// Main Server Module for RCC - 纯转发架构 (v3.0)
// 职责: 仅HTTP接入和请求转发，不做任何模型选择或路由决策

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { IServerModule } from './interfaces/IServerModule';
import { HttpServerComponent } from './components/HttpServer';
import { RequestForwarder } from './components/RequestForwarder';
import { ServerCore } from './core/ServerCore';
import { RequestHandlerService } from './services/RequestHandlerService';
import { Application } from 'express';

import {
  ServerConfig,
  ClientRequest,
  ClientResponse,
  RouteConfig,
  ServerStatus,
  RequestMetrics,
  ConnectionInfo,
  MiddlewareConfig,
  PipelineIntegrationConfig
} from './types/ServerTypes';

export class ServerModule extends BaseModule implements IServerModule {
  private httpServer: HttpServerComponent;
  private forwarder: RequestForwarder;  // 替换 VirtualModelRouter
  private serverCore: ServerCore;
  private requestHandlerService: RequestHandlerService;
  private serverConfig: ServerConfig | null = null;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  constructor() {
    const moduleInfo: ModuleInfo = {
      id: 'ServerModule',
      name: 'Server Module',
      version: '3.0.0',
      description: 'Pure HTTP server and request forwarder - no routing logic',
      type: 'server',
      metadata: {
        author: 'RCC Development Team',
        license: 'MIT'
      }
    };

    super(moduleInfo);

    // 组件初始化
    this.httpServer = new HttpServerComponent();
    this.forwarder = new RequestForwarder();  // 新转发器
    this.serverCore = new ServerCore();
    this.requestHandlerService = new RequestHandlerService();
    this.serverConfig = null;
    this.isInitialized = false;
    this.isRunning = false;
  }

  /**
   * 配置服务器 - 只保留基础HTTP配置
   */
  public override async configure(config: any): Promise<void> {
    this.log('Configuring Server Module', { config });

    // 基础验证（只验证HTTP配置）
    if (!config) {
      throw new Error('Server configuration is required');
    }

    // 配置核心组件（不包含任何虚拟模型配置）
    await this.serverCore.configure(config);
    await this.requestHandlerService.configure(config);

    this.serverConfig = config as ServerConfig;
    this.config = config; // 父类配置
  }

  /**
   * 初始化服务器 - 只初始化HTTP组件和转发器
   */
  public override async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.warn('Server module is already initialized');
      return;
    }

    this.log('Initializing Server Module');

    try {
      await super.initialize();

      // 基础配置验证
      if (this.serverConfig) {
        this.validateConfig(this.serverConfig);
      }

      // 初始化HTTP组件
      if (this.serverConfig) {
        this.httpServer.configure(this.serverConfig);
        await this.httpServer.initialize();
      }

      // 初始化转发器
      await this.requestHandlerService.initialize(this.forwarder);

      this.isInitialized = true;
      this.log('Server Module initialized successfully');

    } catch (error) {
      this.error('Failed to initialize server module', { error });
      throw error;
    }
  }

  /**
   * 启动服务器 - 只启动HTTP监听
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.warn('Server is already running');
      return;
    }

    if (!this.serverConfig) {
      throw new Error('Server must be configured before starting');
    }

    try {
      this.log('Starting Server Module');

      // 启动HTTP服务器
      await this.httpServer.start();

      // 启动转发器（但没有调度器也能启动，只是转发会失败）
      this.isRunning = true;
      this.log('Server Module started successfully');

    } catch (error) {
      this.error('Failed to start server module', { error });
      throw error;
    }
  }

  /**
   * 处理请求 - 纯转发给调度器
   */
  public async handleRequest(request: ClientRequest): Promise<ClientResponse> {
    if (!this.isRunning) {
      throw new Error('Server is not running');
    }

    // **极简逻辑**: 直接转发给调度器，**不做任何处理**
    return await this.forwarder.forwardRequest(request);
  }

  /**
   * 设置调度器管理器 - 转发器必须的依赖
   */
  public setSchedulerManager(schedulerManager: any): void {
    this.forwarder.setSchedulerManager(schedulerManager);
    this.log('Scheduler manager connected to server');
  }

  /**
   * 设置虚拟模型调度器管理器 - 连接pipeline虚拟模型路由系统
   */
  public setVirtualModelSchedulerManager(schedulerManager: any): void {
    this.forwarder.setVirtualModelSchedulerManager(schedulerManager);
    this.log('Virtual model scheduler manager connected to server');
  }

  /**
   * 获取调度器管理器
   */
  public getSchedulerManager(): any | null {
    // RequestForwarder 没有暴露 getter，直接返回 null
    return null;
  }

  /**
   * 停止服务
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      this.log('Stopping Server Module');
      await this.httpServer.stop();
      this.isRunning = false;
      this.log('Server Module stopped');
    } catch (error) {
      this.error('Error stopping server module', { error });
      throw error;
    }
  }

  /**
   * 重启服务
   */
  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * 获取基础服务器状态
   */
  public getServerStatus(): ServerStatus {
    return {
      status: this.isRunning ? 'running' : 'stopped',
      uptime: 0, // TODO: 可以添加实际运行时间
      port: this.serverConfig?.port || 0,
      host: this.serverConfig?.host || '',
      connections: 0, // 基础连接数
      forwardingReady: this.isRunning // 转发准备状态
    };
  }

  // 简化后的基础HTTP方法 - 使用ServerCore的addRoute/addMiddleware方法
  public async registerRoute(route: RouteConfig): Promise<void> {
    this.serverCore.addRoute(route);
    this.log('Route registered in ServerCore', { routeId: route.id });
  }

  public async unregisterRoute(routeId: string): Promise<void> {
    this.serverCore.removeRoute(routeId);
    this.log('Route unregistered from ServerCore', { routeId });
  }

  public getRoutes(): RouteConfig[] {
    return this.serverCore.getRoutes();
  }

  public async registerMiddleware(middleware: MiddlewareConfig): Promise<void> {
    this.serverCore.addMiddleware(middleware);
    this.log('Middleware registered in ServerCore', { middlewareId: middleware.id });
  }

  public async unregisterMiddleware(middlewareId: string): Promise<void> {
    this.serverCore.removeMiddleware(middlewareId);
    this.log('Middleware unregistered from ServerCore', { middlewareId });
  }

  public getMiddlewares(): MiddlewareConfig[] {
    return this.serverCore.getMiddlewares ? this.serverCore.getMiddlewares() : [];
  }

  public async handleWebSocket(connection: ConnectionInfo): Promise<void> {
    throw new Error('WebSocket not implemented yet');
  }

  public getMetrics(): RequestMetrics[] {
    return this.serverCore.getMetrics();
  }

  public getConnections(): ConnectionInfo[] {
    return this.serverCore.getConnections();
  }

  public override getConfig(): ServerConfig {
    return this.serverConfig || {} as ServerConfig;
  }

  public updateConfig(config: Partial<ServerConfig>): void {
    this.serverConfig = { ...this.serverConfig, ...config } as ServerConfig;
  }

  public isHealthy(): boolean {
    return this.isRunning;
  }

  public getHeathStatus(): Record<string, any> {
    return {
      status: this.isRunning ? 'healthy' : 'unhealthy',
      isRunning: this.isRunning
    };
  }

  public getExpressApp(): Application {
    return this.httpServer.getApp();
  }

  public override async destroy(): Promise<void> {
    await this.stop();

    // 清理组件
    if (this.requestHandlerService) {
      await this.requestHandlerService.destroy();
    }

    // 简化清理 - 其他组件会在stop()中处理
    this.isInitialized = false;
  }

  // 缓冲配置验证
  private validateConfig(config: ServerConfig): void {
    // 只验证基础HTTP配置
    if (config.port && (typeof config.port !== 'number' || config.port < 1 || config.port > 65535)) {
      throw new Error('Port must be a number between 1 and 65535');
    }

    if (config.host && typeof config.host !== 'string') {
      throw new Error('Host must be a string');
    }
  }
}