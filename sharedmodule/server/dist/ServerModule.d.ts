import { BaseModule } from 'rcc-basemodule';
import { IServerModule } from './interfaces/IServerModule';
import { ServerConfig, ClientRequest, ClientResponse, VirtualModelConfig, RouteConfig, ServerStatus, RequestMetrics, ConnectionInfo, MiddlewareConfig, PipelineIntegrationConfig } from './types/ServerTypes';
import { UnderConstruction } from 'rcc-underconstruction';
import { DebugCenter } from 'rcc-debugcenter';
export declare class ServerModule extends BaseModule implements IServerModule {
    private httpServer;
    private virtualModelRouter;
    private serverCore;
    private virtualModelManager;
    private requestHandlerService;
    private underConstruction;
    private pipelineIntegrationConfig;
    private serverConfig;
    private isInitialized;
    private isRunning;
    private messageHandlers;
    private pipelineScheduler;
    private debugLogManager;
    private debugEventBus;
    debugCenter: DebugCenter | null;
    debugCenterSessionId: string | null;
    private routes;
    private middlewares;
    private requestMetrics;
    private connections;
    private startTime;
    constructor(schedulerManager?: any, initialConfig?: ServerConfig);
    /**
     * Configure the server module
     */
    configure(config: Record<string, any>): Promise<void>;
    /**
     * Initialize the server module
     */
    initialize(): Promise<void>;
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * Restart the server
     */
    restart(): Promise<void>;
    /**
     * Handle client request with enhanced logging via DebugLogManager
     */
    handleRequest(request: ClientRequest): Promise<ClientResponse>;
    /**
     * Handle WebSocket connection
     */
    handleWebSocket(connection: ConnectionInfo): Promise<void>;
    /**
     * Register a route
     */
    registerRoute(route: RouteConfig): Promise<void>;
    /**
     * Unregister a route
     */
    unregisterRoute(routeId: string): Promise<void>;
    /**
     * Get all registered routes
     */
    getRoutes(): RouteConfig[];
    /**
     * Register a virtual model
     */
    registerVirtualModel(model: VirtualModelConfig): Promise<void>;
    /**
     * Unregister a virtual model
     */
    unregisterVirtualModel(modelId: string): Promise<void>;
    /**
     * Load virtual models from configuration
     */
    private loadVirtualModelsFromConfig;
    /**
     * Get virtual model by ID
     */
    getVirtualModel(modelId: string): VirtualModelConfig | undefined;
    /**
     * Get all virtual models
     */
    getVirtualModels(): VirtualModelConfig[];
    /**
     * Register middleware
     */
    registerMiddleware(middleware: MiddlewareConfig): Promise<void>;
    /**
     * Unregister middleware
     */
    unregisterMiddleware(middlewareId: string): Promise<void>;
    /**
     * Get server status with unified monitoring
     */
    getStatus(): ServerStatus;
    /**
     * Get request metrics
     */
    getMetrics(): RequestMetrics[];
    /**
     * Get active connections
     */
    getConnections(): ConnectionInfo[];
    /**
     * Get health status with unified monitoring
     */
    getHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        checks: Record<string, boolean>;
        timestamp: number;
        underConstructionModule?: boolean;
        errorHandling?: boolean;
        monitoring?: boolean;
        pipelineScheduler?: boolean;
    }>;
    /**
     * Update server configuration
     */
    updateConfig(config: Partial<ServerConfig>): Promise<void>;
    /**
     * Get current configuration
     */
    getConfig(): ServerConfig;
    /**
     * Register message handler
     */
    private registerMessageHandler;
    /**
     * Handle incoming messages
     */
    handleMessage(message: any): Promise<any>;
    /**
     * Set Virtual Model Scheduler Manager
     */
    setVirtualModelSchedulerManager(schedulerManager: any): void;
    /**
     * Initialize Virtual Model Scheduler Manager
     */
    private initializePipelineScheduler;
    /**
     * Get Virtual Model Configuration
     */
    private _getVirtualModelConfig;
    /**
     * Process request through virtual model
     */
    processVirtualModelRequest(request: ClientRequest, model: VirtualModelConfig): Promise<ClientResponse>;
    /**
     * Process request via Pipeline Scheduler
     */
    private _processViaPipelineScheduler;
    /**
     * Set Debug Log Manager for enhanced request logging
     */
    setDebugLogManager(debugLogManager: any): void;
    /**
     * Publish debug event through DebugEventBus
     */
    private publishDebugEvent;
    /**
     * Set UnderConstruction Module
     */
    setUnderConstructionModule(underConstructionModule: UnderConstruction): Promise<void>;
    /**
     * Get Pipeline Integration Configuration
     */
    getPipelineIntegrationConfig(): PipelineIntegrationConfig;
    /**
     * Create standardized error response using unified error handling
     */
    private createErrorResponse;
    /**
     * Get default Pipeline Integration Configuration
     */
    private getDefaultPipelineIntegrationConfig;
    /**
     * Setup request handling with unified logging
     */
    private setupRequestHandling;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    /**
     * Setup connection handlers
     */
    private setupConnectionHandlers;
    /**
     * Add route to HTTP server
     */
    private addRouteToHttpServer;
    /**
     * Create route handler
     */
    private createRouteHandler;
    /**
     * Record request metrics
     */
    private recordRequestMetrics;
    /**
     * Calculate error rate
     */
    private calculateErrorRate;
    /**
     * Get server status
     */
    private getServerStatus;
    /**
     * Validate server configuration
     */
    private validateConfig;
    /**
     * Validate route configuration
     */
    private validateRouteConfig;
    /**
     * Cleanup resources with unified logging
     */
    destroy(): Promise<void>;
}
export default ServerModule;
//# sourceMappingURL=ServerModule.d.ts.map