// Main Server Module for RCC

import { BaseModule } from 'rcc-basemodule';
import { ModuleInfo } from 'rcc-basemodule';
import { IServerModule } from './interfaces/IServerModule';
import { HttpServerComponent } from './components/HttpServer';
import { VirtualModelRouter } from './components/VirtualModelRouter';
import { 
  ServerConfig, 
  ClientRequest, 
  ClientResponse, 
  VirtualModelConfig, 
  RouteConfig, 
  ServerStatus, 
  RequestMetrics, 
  ConnectionInfo, 
  MiddlewareConfig 
} from './types/ServerTypes';

export class ServerModule extends BaseModule implements IServerModule {
  private httpServer: HttpServerComponent;
  private virtualModelRouter: VirtualModelRouter;
  private config: ServerConfig | null = null;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private messageHandlers: Map<string, (message: any) => Promise<void>> = new Map();
  
  // Internal state
  private routes: Map<string, RouteConfig> = new Map();
  private middlewares: Map<string, MiddlewareConfig> = new Map();
  private requestMetrics: RequestMetrics[] = [];
  private connections: Map<string, ConnectionInfo> = new Map();
  private startTime: number = 0;

  constructor() {
    const moduleInfo: ModuleInfo = {
      id: 'ServerModule',
      name: 'RCC Server Module',
      version: '1.0.0',
      description: 'HTTP server with virtual model routing for RCC framework',
      type: 'server',
      capabilities: ['http-server', 'virtual-model-routing', 'load-balancing', 'websocket'] as string[],
      dependencies: ['rcc-basemodule'],
      config: {},
      metadata: {
        author: 'RCC Development Team',
        license: 'MIT',
        repository: 'https://github.com/rcc/rcc-server'
      }
    };
    
    super(moduleInfo);
    this.httpServer = new HttpServerComponent();
    this.virtualModelRouter = new VirtualModelRouter();
  }

  /**
   * Configure the server module
   */
  public configure(config: ServerConfig): void {
    super.configure(config);
    this.config = config;
  }

  /**
   * Initialize the server module
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.warn('Server module is already initialized', {}, 'initialize');
      return;
    }

    this.log('Initializing Server Module', {}, 'initialize');
    
    try {
      // Call parent initialize first
      await super.initialize();
      
      // Validate configuration
      this.validateConfig(this.config);
      
      // Initialize HTTP server
      await this.httpServer.initialize(this.config);
      
      // Set up request handling
      this.setupRequestHandling();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      this.isInitialized = true;
      this.logInfo('Server Module initialized successfully', {}, 'initialize');
      
      // Notify initialization complete
      this.broadcastMessage('server-initialized', { config: this.config });
      
    } catch (error) {
      this.error('Failed to initialize Server Module', error, 'initialize');
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Server module must be initialized before starting');
    }
    
    if (this.isRunning) {
      this.warn('Server is already running', {}, 'start');
      return;
    }

    this.log('Starting Server Module', {}, 'start');
    
    try {
      // Start HTTP server
      await this.httpServer.listen(this.config!.port, this.config!.host);
      
      this.isRunning = true;
      this.startTime = Date.now();
      
      this.logInfo(`Server started on ${this.config!.host}:${this.config!.port}`, { host: this.config!.host, port: this.config!.port }, 'start');
      
      // Notify server started
      this.broadcastMessage('server-started', { 
        host: this.config!.host,
        port: this.config!.port,
        startTime: this.startTime
      });
      
    } catch (error) {
      this.error('Failed to start Server Module', error, 'start');
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.warn('Server is not running', {}, 'stop');
      return;
    }

    this.log('Stopping Server Module', {}, 'stop');
    
    try {
      // Stop HTTP server
      await this.httpServer.close();
      
      this.isRunning = false;
      
      this.logInfo('Server stopped successfully', { uptime: Date.now() - this.startTime }, 'stop');
      
      // Notify server stopped
      this.broadcastMessage('server-stopped', { 
        uptime: Date.now() - this.startTime,
        totalRequests: this.requestMetrics.length
      });
      
    } catch (error) {
      this.error('Failed to stop Server Module', error, 'stop');
      throw error;
    }
  }

  /**
   * Restart the server
   */
  async restart(): Promise<void> {
    this.log('Restarting Server Module', {}, 'restart');
    
    await this.stop();
    await this.start();
    
    this.logInfo('Server restarted successfully', {}, 'restart');
  }

  /**
   * Handle client request
   */
  async handleRequest(request: ClientRequest): Promise<ClientResponse> {
    if (!this.isRunning) {
      throw new Error('Server is not running');
    }

    const startTime = Date.now();
    
    try {
      this.log('Handling request', { id: request.id, method: request.method, path: request.path }, 'handleRequest');
      
      // Route to virtual model
      const virtualModel = await this.virtualModelRouter.routeRequest(request);
      
      // Process the request through the virtual model
      const response = await this.processVirtualModelRequest(request, virtualModel);
      
      // Record metrics
      const processingTime = Date.now() - startTime;
      await this.recordRequestMetrics({
        ...request,
        virtualModel: virtualModel.id,
        processingTime,
        status: response.status,
        timestamp: startTime
      });
      
      this.log('Request processed successfully', { id: request.id, processingTime }, 'handleRequest');
      
      return response;
      
    } catch (error) {
      this.error('Failed to handle request', { id: request.id, error }, 'handleRequest');
      
      // Record error metrics
      const processingTime = Date.now() - startTime;
      await this.recordRequestMetrics({
        ...request,
        processingTime,
        status: 500,
        timestamp: startTime,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return error response
      return {
        id: request.id,
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Error': 'internal-server-error'
        },
        body: {
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
        },
        timestamp: Date.now(),
        processingTime,
        requestId: request.id
      };
    }
  }

  /**
   * Handle WebSocket connection
   */
  async handleWebSocket(connection: ConnectionInfo): Promise<void> {
    this.log('Handling WebSocket connection', { connectionId: connection.id }, 'handleWebSocket');
    
    // Add to connections registry
    this.connections.set(connection.id, connection);
    
    // Set up connection event handlers
    this.setupConnectionHandlers(connection);
    
    // Notify connection established
    this.broadcastMessage('websocket-connected', { connectionId: connection.id });
  }

  /**
   * Register a route
   */
  async registerRoute(route: RouteConfig): Promise<void> {
    this.log('Registering route', { id: route.id, method: route.method, path: route.path }, 'registerRoute');
    
    // Validate route configuration
    this.validateRouteConfig(route);
    
    // Add to routes registry
    this.routes.set(route.id, route);
    
    // Add to HTTP server
    this.addRouteToHttpServer(route);
    
    this.logInfo('Route registered successfully', { routeId: route.id }, 'registerRoute');
  }

  /**
   * Unregister a route
   */
  async unregisterRoute(routeId: string): Promise<void> {
    this.log('Unregistering route', { routeId }, 'unregisterRoute');
    
    if (!this.routes.has(routeId)) {
      throw new Error(`Route '${routeId}' not found`);
    }
    
    // Remove from registries
    this.routes.delete(routeId);
    
    this.logInfo('Route unregistered successfully', { routeId }, 'unregisterRoute');
  }

  /**
   * Get all registered routes
   */
  getRoutes(): RouteConfig[] {
    return Array.from(this.routes.values());
  }

  /**
   * Register a virtual model
   */
  async registerVirtualModel(model: VirtualModelConfig): Promise<void> {
    this.log('Registering virtual model', { modelId: model.id }, 'registerVirtualModel');
    
    await this.virtualModelRouter.registerModel(model);
    
    this.logInfo('Virtual model registered successfully', { modelId: model.id }, 'registerVirtualModel');
  }

  /**
   * Unregister a virtual model
   */
  async unregisterVirtualModel(modelId: string): Promise<void> {
    this.log('Unregistering virtual model', { modelId }, 'unregisterVirtualModel');
    
    await this.virtualModelRouter.unregisterModel(modelId);
    
    this.logInfo('Virtual model unregistered successfully', { modelId }, 'unregisterVirtualModel');
  }

  /**
   * Get virtual model by ID
   */
  getVirtualModel(modelId: string): VirtualModelConfig | undefined {
    return this.virtualModelRouter.getModel(modelId);
  }

  /**
   * Get all virtual models
   */
  getVirtualModels(): VirtualModelConfig[] {
    return this.virtualModelRouter.getModels();
  }

  /**
   * Register middleware
   */
  async registerMiddleware(middleware: MiddlewareConfig): Promise<void> {
    this.log('Registering middleware', { name: middleware.name }, 'registerMiddleware');
    
    this.middlewares.set(middleware.name, middleware);
    
    this.logInfo('Middleware registered successfully', { name: middleware.name }, 'registerMiddleware');
  }

  /**
   * Unregister middleware
   */
  async unregisterMiddleware(middlewareId: string): Promise<void> {
    this.log('Unregistering middleware', { middlewareId }, 'unregisterMiddleware');
    
    if (!this.middlewares.has(middlewareId)) {
      throw new Error(`Middleware '${middlewareId}' not found`);
    }
    
    this.middlewares.delete(middlewareId);
    
    this.logInfo('Middleware unregistered successfully', { middlewareId }, 'unregisterMiddleware');
  }

  /**
   * Get server status
   */
  getStatus(): ServerStatus {
    const uptime = this.isRunning ? Date.now() - this.startTime : 0;
    const virtualModels = this.virtualModelRouter.getModels();
    
    return {
      status: this.getServerStatus(),
      uptime,
      port: this.config?.port || 0,
      host: this.config?.host || '',
      connections: this.connections.size,
      requestsHandled: this.requestMetrics.length,
      errors: this.requestMetrics.filter(m => m.status >= 400).length,
      lastHeartbeat: Date.now(),
      virtualModels: {
        total: virtualModels.length,
        active: virtualModels.filter(m => m.enabled).length,
        inactive: virtualModels.filter(m => !m.enabled).length
      }
    };
  }

  /**
   * Get request metrics
   */
  getMetrics(): RequestMetrics[] {
    return [...this.requestMetrics];
  }

  /**
   * Get active connections
   */
  getConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    timestamp: number;
  }> {
    const checks: Record<string, boolean> = {};
    
    // Check HTTP server
    checks['http_server'] = this.isRunning;
    
    // Check virtual models
    const virtualModels = this.virtualModelRouter.getEnabledModels();
    checks['virtual_models'] = virtualModels.length > 0;
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryThreshold = 500 * 1024 * 1024; // 500MB
    checks['memory'] = memoryUsage.heapUsed < memoryThreshold;
    
    // Check error rate
    const errorRate = this.calculateErrorRate();
    checks['error_rate'] = errorRate < 0.05; // 5% threshold
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const failedChecks = Object.values(checks).filter(check => !check).length;
    
    if (failedChecks === 0) {
      status = 'healthy';
    } else if (failedChecks <= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      checks,
      timestamp: Date.now()
    };
  }

  /**
   * Update server configuration
   */
  async updateConfig(config: Partial<ServerConfig>): Promise<void> {
    this.log('Updating server configuration', config, 'updateConfig');
    
    if (!this.config) {
      throw new Error('Server not initialized');
    }
    
    // Merge configuration
    this.config = { ...this.config, ...config };
    
    this.logInfo('Server configuration updated successfully', this.config, 'updateConfig');
  }

  /**
   * Get current configuration
   */
  getConfig(): ServerConfig {
    if (!this.config) {
      throw new Error('Server not configured');
    }
    
    return { ...this.config };
  }

  /**
   * Register message handler
   */
  private registerMessageHandler(type: string, handler: (message: any) => Promise<void>): void {
    this.messageHandlers.set(type, handler);
    this.log('Registered message handler', { type }, 'registerMessageHandler');
  }

  /**
   * Handle incoming messages
   */
  public async handleMessage(message: any): Promise<any> {
    this.log('Handling message', { type: message.type, source: message.source }, 'handleMessage');
    
    if (this.messageHandlers.has(message.type)) {
      const handler = this.messageHandlers.get(message.type)!;
      await handler(message);
    }
    
    return await super.handleMessage(message);
  }

  /**
   * Process request through virtual model
   */
  private async processVirtualModelRequest(request: ClientRequest, model: VirtualModelConfig): Promise<ClientResponse> {
    // This is a placeholder for actual virtual model processing
    // In a real implementation, this would forward the request to the actual model endpoint
    
    this.log('Processing request with virtual model', { modelId: model.id }, 'processVirtualModelRequest');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Return mock response
    return {
      id: request.id,
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Virtual-Model': model.id,
        'X-Provider': model.provider
      },
      body: {
        message: 'Request processed successfully',
        model: model.id,
        provider: model.provider,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      processingTime: Math.floor(Math.random() * 100),
      requestId: request.id
    };
  }

  /**
   * Setup request handling
   */
  private setupRequestHandling(): void {
    const app = this.httpServer.getApp();
    
    // Add default route for all requests
    app.use('*', async (req, res) => {
      try {
        // Convert Express request to ClientRequest
        const clientRequest = this.httpServer.expressToClientRequest(req);
        
        // Handle request
        const clientResponse = await this.handleRequest(clientRequest);
        
        // Convert ClientResponse to Express response
        this.httpServer.clientResponseToExpress(clientResponse, res);
        
      } catch (error) {
        this.error('Error handling request:', error);
        
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle system messages through message handler
    this.registerMessageHandler('shutdown-request', async (message) => {
      this.log('Received shutdown request', {}, 'setupEventHandlers');
      await this.stop();
    });
    
    // Handle HTTP server events (if EventEmitter is available)
    if (typeof this.httpServer.on === 'function') {
      this.httpServer.on('error', (error) => {
        this.error('HTTP server error', error, 'setupEventHandlers');
      });
    }
    
    // Handle process events
    process.on('SIGTERM', async () => {
      this.log('Received SIGTERM signal', {}, 'setupEventHandlers');
      await this.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      this.log('Received SIGINT signal', {}, 'setupEventHandlers');
      await this.stop();
      process.exit(0);
    });
  }

  /**
   * Setup connection handlers
   */
  private setupConnectionHandlers(connection: ConnectionInfo): void {
    // Handle connection events if available
    if (typeof connection.on === 'function') {
      connection.on('close', () => {
        this.connections.delete(connection.id);
        this.log('Connection closed:', connection.id);
      });
      
      connection.on('error', (error) => {
        this.connections.delete(connection.id);
        this.warn('Connection error:', { connectionId: connection.id, error });
      });
    }
  }

  /**
   * Add route to HTTP server
   */
  private addRouteToHttpServer(route: RouteConfig): void {
    const app = this.httpServer.getApp();
    
    // Add route based on method
    switch (route.method.toLowerCase()) {
      case 'get':
        app.get(route.path, this.createRouteHandler(route));
        break;
      case 'post':
        app.post(route.path, this.createRouteHandler(route));
        break;
      case 'put':
        app.put(route.path, this.createRouteHandler(route));
        break;
      case 'delete':
        app.delete(route.path, this.createRouteHandler(route));
        break;
      case 'patch':
        app.patch(route.path, this.createRouteHandler(route));
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${route.method}`);
    }
  }

  /**
   * Create route handler
   */
  private createRouteHandler(route: RouteConfig) {
    return async (req: any, res: any) => {
      try {
        const clientRequest = this.httpServer.expressToClientRequest(req);
        const clientResponse = await this.handleRequest(clientRequest);
        this.httpServer.clientResponseToExpress(clientResponse, res);
      } catch (error) {
        this.error('Route handler error:', route.id, error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
        });
      }
    };
  }

  /**
   * Record request metrics
   */
  private async recordRequestMetrics(metrics: RequestMetrics): Promise<void> {
    this.requestMetrics.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.requestMetrics.length > 1000) {
      this.requestMetrics = this.requestMetrics.slice(-1000);
    }
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    if (this.requestMetrics.length === 0) {
      return 0;
    }
    
    const errors = this.requestMetrics.filter(m => m.status >= 400).length;
    return errors / this.requestMetrics.length;
  }

  /**
   * Get server status
   */
  private getServerStatus(): ServerStatus['status'] {
    if (!this.isInitialized) {
      return 'stopped';
    }
    
    if (!this.isRunning) {
      return 'stopped';
    }
    
    return 'running';
  }

  /**
   * Validate server configuration
   */
  private validateConfig(config: ServerConfig): void {
    if (!config.port || config.port < 1 || config.port > 65535) {
      throw new Error('Invalid port number');
    }
    
    if (!config.host) {
      throw new Error('Host is required');
    }
    
    if (config.timeout < 1000 || config.timeout > 60000) {
      throw new Error('Timeout must be between 1000 and 60000ms');
    }
  }

  /**
   * Validate route configuration
   */
  private validateRouteConfig(route: RouteConfig): void {
    if (!route.id || !route.path || !route.method || !route.handler) {
      throw new Error('Route configuration missing required fields');
    }
    
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(route.method)) {
      throw new Error(`Invalid HTTP method: ${route.method}`);
    }
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    this.log('Cleaning up Server Module', {}, 'destroy');
    
    try {
      // Stop server if running
      if (this.isRunning) {
        await this.stop();
      }
      
      // Cleanup components
      if (typeof this.httpServer.cleanup === 'function') {
        await this.httpServer.cleanup();
      }
      if (typeof this.virtualModelRouter.cleanup === 'function') {
        await this.virtualModelRouter.cleanup();
      }
      
      // Clear registries
      this.routes.clear();
      this.middlewares.clear();
      this.requestMetrics.length = 0;
      this.connections.clear();
      this.messageHandlers.clear();
      
      this.config = null;
      this.isInitialized = false;
      
      await super.destroy();
      
    } catch (error) {
      this.error('Error during cleanup', error, 'destroy');
      throw error;
    }
  }
}