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
    virtualModel: string | undefined;
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
export interface VirtualModelConfig {
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
export interface TargetConfig {
    providerId: string;
    modelId: string;
    keyIndex?: number;
    weight?: number;
    enabled?: boolean;
}
export interface RoutingRule {
    id: string;
    name: string;
    condition: string;
    weight: number;
    enabled: boolean;
    priority: number;
    modelId: string;
}
export interface RouteConfig {
    id: string;
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    handler: string;
    middleware?: string[];
    virtualModel?: string;
    authRequired?: boolean;
}
export interface ServerStatus {
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
export interface RequestMetrics {
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
export interface ConnectionInfo {
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
export interface MiddlewareConfig {
    name: string;
    type: 'pre' | 'post' | 'error';
    priority: number;
    enabled: boolean;
    config?: Record<string, any>;
}
export interface PipelineRequestContext {
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
export interface PipelineResponseContext {
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
export interface PipelineExecutionResult {
    pipelineId: string;
    instanceId: string;
    executionId: string;
    status: string;
    duration: number;
    result?: any;
    error?: any;
    retryCount: number;
}
export interface PipelineExecutionStatus {
    COMPLETED: 'completed';
    FAILED: 'failed';
    TIMEOUT: 'timeout';
    CANCELLED: 'cancelled';
}
export interface PipelineIntegrationConfig {
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
