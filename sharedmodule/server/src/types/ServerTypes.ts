// Server module types

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
  clientId?: string;
  virtualModel?: string;
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
  endpoint: string;
  apiKey?: string;
  model: string;
  capabilities: string[];
  maxTokens: number;
  temperature: number;
  topP: number;
  priority: number;
  enabled: boolean;
  routingRules: RoutingRule[];
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
}

export interface MiddlewareConfig {
  name: string;
  type: 'pre' | 'post' | 'error';
  priority: number;
  enabled: boolean;
  config?: Record<string, any>;
}