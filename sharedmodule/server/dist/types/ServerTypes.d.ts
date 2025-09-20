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
export interface RouteConfig {
    id: string;
    method: string;
    path: string;
    handler: (request: any, response: any) => void;
    middleware?: string[];
    enabled: boolean;
}
export interface MiddlewareConfig {
    id: string;
    name: string;
    type: 'pre' | 'post';
    handler: (requestOrResponse: any) => Promise<any>;
    enabled: boolean;
    priority: number;
    description?: string;
}
export interface ConnectionInfo {
    id: string;
    ip: string;
    userAgent?: string;
    connectedAt: number;
    lastActivity: number;
    status: 'connected' | 'disconnected';
    metadata?: Record<string, any>;
}
export interface ServerStatus {
    status: 'running' | 'stopped' | 'error';
    uptime: number;
    port: number;
    host: string;
    connections: number;
    forwardingReady: boolean;
}
export interface RequestMetrics {
    id: string;
    timestamp: number;
    method: string;
    path: string;
    status: number;
    processingTime: number;
    clientId?: string;
    error?: string;
}
export interface PipelineIntegrationConfig {
    enabled: boolean;
    unifiedErrorHandling: boolean;
    unifiedMonitoring: boolean;
    errorMapping: Record<string, string>;
    monitoringConfig?: {
        enableDetailedMetrics: boolean;
        enableRequestTracing: boolean;
        enablePerformanceMonitoring: boolean;
    };
}
//# sourceMappingURL=ServerTypes.d.ts.map