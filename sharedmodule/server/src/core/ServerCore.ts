import { ServerConfig, ServerStatus, RequestMetrics, ConnectionInfo } from '../types/ServerTypes';

export class ServerCore {
  private config: ServerConfig | null = null;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private routes: Map<string, any> = new Map();
  private middlewares: Map<string, any> = new Map();
  private connections: Map<string, ConnectionInfo> = new Map();
  private requestMetrics: RequestMetrics[] = [];
  private errorCount: number = 0;
  private totalRequests: number = 0;

  constructor() {
    this.initializeDefaultConfig();
  }

  private initializeDefaultConfig(): void {
    this.config = {
      port: 5506,
      host: 'localhost',
      cors: {
        origin: '*',
        credentials: true
      },
      compression: true,
      helmet: true,
      rateLimit: {
        windowMs: 60000,
        max: 100
      },
      timeout: 30000,
      bodyLimit: '10mb'
    };
  }

  public async configure(config: Partial<ServerConfig>): Promise<void> {
    if (this.config) {
      this.config = { ...this.config, ...config };
      this.validateConfig(this.config);
    }
  }

  public getConfig(): ServerConfig | null {
    return this.config;
  }

  public getStatus(): ServerStatus {
    const status = this.getServerStatus();
    const virtualModels = {
      total: 0,
      active: 0,
      inactive: 0
    };

    return {
      status,
      uptime: process.uptime() * 1000,
      port: this.config?.port || 5506,
      host: this.config?.host || 'localhost',
      connections: this.connections.size,
      requestsHandled: this.totalRequests,
      errors: this.errorCount,
      lastHeartbeat: Date.now(),
      virtualModels,
      pipelineIntegration: {
        enabled: false,
        schedulerAvailable: false,
        processingMethod: 'direct',
        fallbackEnabled: false,
        unifiedErrorHandling: false,
        unifiedMonitoring: false,
        errorMapping: {}
      },
      monitoring: {
        enabled: false,
        detailedMetrics: false,
        requestTracing: false,
        performanceMonitoring: false
      }
    };
  }

  public getMetrics(): RequestMetrics[] {
    return this.requestMetrics;
  }

  public getConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  public setInitialized(initialized: boolean): void {
    this.isInitialized = initialized;
  }

  public setRunning(running: boolean): void {
    this.isRunning = running;
  }

  public isServerInitialized(): boolean {
    return this.isInitialized;
  }

  public isServerRunning(): boolean {
    return this.isRunning;
  }

  public addRoute(route: any): void {
    this.routes.set(route.id, route);
  }

  public removeRoute(routeId: string): void {
    this.routes.delete(routeId);
  }

  public getRoutes(): any[] {
    return Array.from(this.routes.values());
  }

  public addConnection(connection: ConnectionInfo): void {
    this.connections.set(connection.id, connection);
  }

  public removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  public addMiddleware(middleware: any): void {
    this.middlewares.set(middleware.id, middleware);
  }

  public removeMiddleware(middlewareId: string): void {
    this.middlewares.delete(middlewareId);
  }

  public async recordRequestMetrics(metrics: RequestMetrics): Promise<void> {
    this.requestMetrics.push(metrics);
    this.totalRequests++;

    if (metrics.status >= 400) {
      this.errorCount++;
    }

    // Keep only last 1000 metrics
    if (this.requestMetrics.length > 1000) {
      this.requestMetrics = this.requestMetrics.slice(-1000);
    }
  }

  private calculateErrorRate(): number {
    if (this.totalRequests === 0) return 0;
    return (this.errorCount / this.totalRequests) * 100;
  }

  private getServerStatus(): ServerStatus['status'] {
    if (!this.isInitialized) return 'stopped';
    if (!this.isRunning) return 'stopped';
    if (this.errorCount > this.totalRequests * 0.1) return 'error';
    return 'running';
  }

  private validateConfig(config: ServerConfig): void {
    if (!config.host) {
      throw new Error('Server host is required');
    }
    if (!config.port || config.port < 1 || config.port > 65535) {
      throw new Error('Valid server port is required');
    }
    if (!config.cors) {
      throw new Error('CORS configuration is required');
    }
    if (!config.rateLimit) {
      throw new Error('Rate limit configuration is required');
    }
  }

  public async getHealth(): Promise<{
    healthy: boolean;
    status: string;
    checks: any[];
  }> {
    const checks = [];

    // Check basic server health
    checks.push({
      name: 'server_status',
      healthy: this.isRunning,
      message: this.isRunning ? 'Server is running' : 'Server is not running'
    });

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryThreshold = 500 * 1024 * 1024; // 500MB
    checks.push({
      name: 'memory_usage',
      healthy: memoryUsage.heapUsed < memoryThreshold,
      message: `Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    });

    // Check connection count
    const connectionThreshold = 100;
    checks.push({
      name: 'connection_count',
      healthy: this.connections.size < connectionThreshold,
      message: `Connections: ${this.connections.size}/${connectionThreshold}`
    });

    const healthy = checks.every(check => check.healthy);
    const status = healthy ? 'healthy' : 'unhealthy';

    return { healthy, status, checks };
  }
}