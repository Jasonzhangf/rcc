import { BaseModule } from 'rcc-basemodule';
import { UnderConstruction } from 'rcc-underconstruction';
import { Application, Request, Response } from 'express';

interface ServerConfig {
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
}
interface ClientRequest {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    headers: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
    timestamp: number;
    clientId: string | undefined;
    virtualModel: string | undefined;
}
interface ClientResponse {
    id: string;
    status: number;
    headers: Record<string, string>;
    body?: any;
    timestamp: number;
    processingTime: number;
    error?: string;
    requestId: string;
}
interface VirtualModelConfig {
    id: string;
    name: string;
    provider: string;
    endpoint?: string;
    apiKey?: string;
    model?: string;
    capabilities: string[];
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    enabled?: boolean;
    routingRules?: RoutingRule[];
    targets?: TargetConfig[];
    priority?: number;
}
interface TargetConfig {
    providerId: string;
    modelId: string;
    keyIndex?: number;
    weight?: number;
    enabled?: boolean;
}
interface RoutingRule {
    id: string;
    name: string;
    condition: string;
    weight: number;
    enabled: boolean;
    priority: number;
    modelId: string;
}
interface RouteConfig {
    id: string;
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    handler: string;
    middleware?: string[];
    virtualModel?: string;
    authRequired?: boolean;
}
interface ServerStatus {
    status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
    uptime: number;
    port: number;
    host: string;
    connections: number;
    requestsHandled: number;
    errors: number;
    lastHeartbeat: number;
    virtualModels: {
        total: number;
        active: number;
        inactive: number;
    };
    pipelineIntegration?: {
        enabled: boolean;
        schedulerAvailable: boolean;
        processingMethod: 'pipeline' | 'direct' | 'underconstruction';
        fallbackEnabled: boolean;
        unifiedErrorHandling?: boolean;
        unifiedMonitoring?: boolean;
        errorMapping?: Record<string, number>;
    };
    monitoring?: {
        enabled: boolean;
        detailedMetrics: boolean;
        requestTracing: boolean;
        performanceMonitoring: boolean;
    };
}
interface RequestMetrics {
    requestId: string;
    timestamp: number;
    processingTime: number;
    method: string;
    path: string;
    status: number;
    virtualModel?: string;
    error?: string;
    bytesSent: number;
    bytesReceived: number;
}
interface ConnectionInfo {
    id: string;
    clientId?: string;
    remoteAddress: string;
    userAgent: string;
    connectedAt: number;
    lastActivity: number;
    requestsCount: number;
    isActive: boolean;
    on?(event: string, callback: (...args: any[]) => void): void;
}
interface MiddlewareConfig {
    name: string;
    type: 'pre' | 'post' | 'error';
    priority: number;
    enabled: boolean;
    config?: Record<string, any>;
}
interface PipelineRequestContext {
    requestId: string;
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
    timestamp: number;
    clientId?: string;
    virtualModelId: string;
    metadata?: Record<string, any>;
}
interface PipelineResponseContext {
    executionId: string;
    pipelineId: string;
    instanceId: string;
    status: 'completed' | 'failed' | 'timeout';
    startTime: number;
    endTime: number;
    duration: number;
    result?: any;
    error?: {
        code: string;
        message: string;
        category: string;
        severity: string;
    };
    metadata?: Record<string, any>;
}
interface PipelineIntegrationConfig {
    enabled: boolean;
    defaultTimeout: number;
    maxRetries: number;
    retryDelay: number;
    fallbackToDirect: boolean;
    enableMetrics: boolean;
    enableHealthCheck: boolean;
    pipelineSelectionStrategy: 'round-robin' | 'weighted' | 'least-connections' | 'custom';
    customHeaders?: Record<string, string>;
    errorMapping?: Record<string, number>;
    unifiedErrorHandling?: boolean;
    unifiedMonitoring?: boolean;
    enableLoadBalancing?: boolean;
    enableCaching?: boolean;
    enableThrottling?: boolean;
    enableCircuitBreaking?: boolean;
    monitoringConfig?: {
        metricsInterval?: number;
        healthCheckInterval?: number;
        enableDetailedMetrics?: boolean;
        enableRequestTracing?: boolean;
        enablePerformanceMonitoring?: boolean;
    };
}

interface IServerModule {
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
interface IHttpServer {
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
interface IRequestProcessor {
    process(request: ClientRequest): Promise<ClientResponse>;
    validate(request: ClientRequest): Promise<boolean>;
    sanitize(request: ClientRequest): ClientRequest;
    enrich(request: ClientRequest): ClientRequest;
}
interface IVirtualModelRouter {
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
interface IClientManager {
    addConnection(connection: ConnectionInfo): Promise<void>;
    removeConnection(connectionId: string): Promise<void>;
    getConnection(connectionId: string): ConnectionInfo | undefined;
    getConnections(): ConnectionInfo[];
    broadcast(message: any): Promise<void>;
    sendToClient(connectionId: string, message: any): Promise<void>;
}
interface IMiddlewareManager {
    registerMiddleware(middleware: MiddlewareConfig): Promise<void>;
    unregisterMiddleware(middlewareId: string): Promise<void>;
    executePreMiddleware(request: ClientRequest): Promise<ClientRequest>;
    executePostMiddleware(request: ClientRequest, response: ClientResponse): Promise<ClientResponse>;
    executeErrorMiddleware(error: Error, request: ClientRequest): Promise<ClientResponse>;
}
interface IServerMetrics {
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

declare class ServerModule extends BaseModule implements IServerModule {
    private httpServer;
    private virtualModelRouter;
    private underConstruction;
    private pipelineIntegrationConfig;
    private config;
    private isInitialized;
    private isRunning;
    private messageHandlers;
    private pipelineScheduler;
    private virtualModelRulesModule;
    private routes;
    private middlewares;
    private requestMetrics;
    private connections;
    private startTime;
    constructor();
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
     * Handle client request
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
     * Initialize Pipeline Scheduler
     */
    private initializePipelineScheduler;
    /**
     * Initialize Virtual Model Rules Integration
     */
    private initializeVirtualModelRulesIntegration;
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

declare class HttpServerComponent extends BaseModule implements IHttpServer {
    private app;
    private server;
    private config;
    private isRunning;
    constructor();
    /**
     * Initialize the HTTP server with configuration
     */
    configure(config: ServerConfig): void;
    initialize(): Promise<void>;
    /**
     * Start the HTTP server
     */
    listen(port: number, host?: string): Promise<void>;
    /**
     * Stop the HTTP server
     */
    close(): Promise<void>;
    /**
     * Add event listener
     */
    on(event: string, callback: (...args: any[]) => void): void;
    /**
     * Remove event listener
     */
    off(event: string, callback: (...args: any[]) => void): void;
    /**
     * Get active connections count
     */
    getConnections(callback: (err: Error | null, count: number) => void): void;
    /**
     * Get the Express application instance
     */
    getApp(): Application;
    /**
     * Check if server is running
     */
    isServerRunning(): boolean;
    /**
     * Request logging middleware
     */
    private requestLogger;
    /**
     * Error handling middleware
     */
    private errorHandler;
    /**
     * Health check endpoint
     */
    private healthCheck;
    /**
     * Get server metrics
     */
    private getMetrics;
    /**
     * Convert Express request to ClientRequest
     */
    expressToClientRequest(req: Request): ClientRequest;
    /**
     * Convert ClientResponse to Express response
     */
    clientResponseToExpress(response: ClientResponse, res: Response): void;
    /**
     * Generate unique request ID
     */
    private generateRequestId;
    /**
     * Sanitize headers for logging
     */
    private sanitizeHeaders;
    /**
     * Cleanup resources
     */
    destroy(): Promise<void>;
}

interface RoutingDecision {
    model: VirtualModelConfig;
    confidence: number;
    reason: string;
    alternativeModels?: VirtualModelConfig[];
}
interface ModelMetrics {
    modelId: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastUsed: number;
    uptime: number;
    errorRate: number;
    throughput: number;
}
declare class VirtualModelRouter extends BaseModule implements IVirtualModelRouter {
    private virtualModels;
    private routingRules;
    private modelMetrics;
    constructor();
    /**
     * Route a request to the appropriate virtual model
     */
    routeRequest(request: ClientRequest): Promise<VirtualModelConfig>;
    /**
     * Register a new virtual model
     */
    registerModel(model: VirtualModelConfig): Promise<void>;
    /**
     * Process targets array and convert to model configuration
     */
    private processTargets;
    /**
     * Infer capabilities from targets configuration
     */
    private inferCapabilitiesFromTargets;
    /**
     * Generate endpoint URL from provider ID
     */
    private generateEndpointFromProvider;
    /**
     * Unregister a virtual model
     */
    unregisterModel(modelId: string): Promise<void>;
    /**
     * Update routing rules for a model
     */
    updateRoutingRules(modelId: string, rules: RoutingRule[]): Promise<void>;
    /**
     * Get model metrics
     */
    getModelMetrics(modelId: string): Promise<ModelMetrics>;
    /**
     * Get all registered models
     */
    getModels(): VirtualModelConfig[];
    /**
     * Get enabled models only
     */
    getEnabledModels(): VirtualModelConfig[];
    /**
     * Get model by ID
     */
    getModel(modelId: string): VirtualModelConfig | undefined;
    /**
     * Make routing decision based on rules
     */
    private makeRoutingDecision;
    /**
     * Apply routing rules to filter candidate models
     */
    private applyRoutingRules;
    /**
     * Evaluate routing rules for a request
     */
    private evaluateRoutingRules;
    /**
     * Evaluate a single rule condition
     */
    private evaluateRuleCondition;
    /**
     * Analyze request features for intelligent routing
     */
    private analyzeRequestFeatures;
    /**
     * Intelligent model selection based on request features
     */
    private intelligentModelSelection;
    /**
     * Select the best candidate from the list
     */
    private selectBestCandidate;
    /**
     * Generate routing reason for logging
     */
    private generateRoutingReason;
    /**
     * Calculate confidence score for model selection
     */
    private calculateConfidence;
    /**
     * Extract required capabilities from request
     */
    private extractRequiredCapabilities;
    /**
     * Record request metrics
     */
    private recordRequestMetrics;
    /**
     * Validate model configuration
     */
    private validateModelConfig;
    /**
     * Validate routing rule
     */
    private validateRoutingRule;
    /**
     * Get detailed model status for debugging
     */
    getModelStatus(): {
        totalModels: number;
        enabledModels: number;
        disabledModels: number;
        modelDetails: Array<{
            id: string;
            name: string;
            enabled: boolean;
            capabilities: string[];
            health: number;
            lastUsed?: number;
        }>;
    };
    /**
     * Perform health check on all models
     */
    performHealthCheck(): Promise<void>;
    /**
     * Cleanup resources
     */
    destroy(): Promise<void>;
}

export { HttpServerComponent, ServerModule, VirtualModelRouter, ServerModule as default };
export type { ClientRequest, ClientResponse, ConnectionInfo, IClientManager, IHttpServer, IMiddlewareManager, IRequestProcessor, IServerMetrics, IServerModule, IVirtualModelRouter, MiddlewareConfig, ModelMetrics, PipelineIntegrationConfig, PipelineRequestContext, PipelineResponseContext, RequestMetrics, RouteConfig, RoutingDecision, RoutingRule, ServerConfig, ServerStatus, VirtualModelConfig };
