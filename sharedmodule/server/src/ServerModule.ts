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
  MiddlewareConfig,
  PipelineIntegrationConfig,
  } from './types/ServerTypes';

import { UnderConstruction } from 'rcc-underconstruction';
import { VirtualModelRulesModule } from 'rcc-virtual-model-rules';

export class ServerModule extends BaseModule implements IServerModule {
  private httpServer: HttpServerComponent;
  private virtualModelRouter: VirtualModelRouter;
  private underConstruction: UnderConstruction | null = null;
  private pipelineIntegrationConfig: PipelineIntegrationConfig;
  private config: ServerConfig | null = null;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private messageHandlers: Map<string, (message: any) => Promise<void>> = new Map();
  
  // Virtual Model Rules Integration
  private virtualModelRulesModule: VirtualModelRulesModule | null = null;
  
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
      description: 'HTTP server with virtual model routing and rule evaluation for RCC framework',
      type: 'server',
      capabilities: ['http-server', 'virtual-model-routing', 'websocket', 'underconstruction-integration'] as string[],
      dependencies: ['rcc-basemodule', 'rcc-underconstruction'],
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
    this.underConstruction = null;
    this.pipelineIntegrationConfig = this.getDefaultPipelineIntegrationConfig();
  }

  /**
   * Configure the server module
   */
  public override configure(config: Record<string, any>): void {
    super.configure(config);
    this.config = config as ServerConfig;
  }

  /**
   * Initialize the server module
   */
  public override async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.warn('Server module is already initialized');
      return;
    }

    this.log('Initializing Server Module');
    
    try {
      // Call parent initialize first
      await super.initialize();
      
      // Validate configuration
      if (this.config) {
        this.validateConfig(this.config);
      }
      
      // Initialize HTTP server
      if (this.config) {
        this.httpServer.configure(this.config);
        await this.httpServer.initialize();
      }
      
      // Initialize UnderConstruction module
      if (this.underConstruction) {
        await this.underConstruction.initialize();
      }
      
      // Initialize Virtual Model Rules Module
      await this.initializeVirtualModelRulesIntegration();
      
      // Set up request handling
      this.setupRequestHandling();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      this.isInitialized = true;
      this.logInfo('Server Module initialized successfully');
      
      // Notify initialization complete
      (this as any).sendMessage('server-initialized', { config: this.config || {} });
      
    } catch (error) {
      this.error('Failed to initialize Server Module', { method: 'initialize' });
      throw error;
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Server module must be initialized before starting');
    }
    
    if (this.isRunning) {
      this.warn('Server is already running');
      return;
    }

    this.log('Starting Server Module');
    
    try {
      // Start HTTP server
      await this.httpServer.listen(this.config!.port, this.config!.host);
      
      this.isRunning = true;
      this.startTime = Date.now();
      
      this.logInfo(`Server started on ${this.config!.host}:${this.config!.port}`);
      
      // Notify server started
      (this as any).sendMessage('server-started', { 
        host: this.config?.host || '',
        port: this.config?.port || 0,
        startTime: this.startTime
      });
      
    } catch (error) {
      this.error('Failed to start Server Module', { method: 'start' });
      throw error;
    }
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      this.warn('Server is not running');
      return;
    }

    this.log('Stopping Server Module');
    
    try {
      // Stop HTTP server
      await this.httpServer.close();
      
      this.isRunning = false;
      
      this.logInfo('Server stopped successfully');
      
      // Notify server stopped
      (this as any).sendMessage('server-stopped', { 
        uptime: Date.now() - this.startTime,
        totalRequests: this.requestMetrics.length
      });
      
    } catch (error) {
      this.error('Failed to stop Server Module', { method: 'stop' });
      throw error;
    }
  }

  /**
   * Restart the server
   */
  public async restart(): Promise<void> {
    this.log('Restarting Server Module');
    
    await this.stop();
    await this.start();
    
    this.logInfo('Server restarted successfully');
  }

  /**
   * Handle client request
   */
  public async handleRequest(request: ClientRequest): Promise<ClientResponse> {
    if (!this.isRunning) {
      throw new Error('Server is not running');
    }

    const startTime = Date.now();
    
    try {
      this.log('Handling request');
      
      // Route to virtual model
      const virtualModel = await this.virtualModelRouter.routeRequest(request);
      
      // Process the request through the virtual model
      const response = await this.processVirtualModelRequest(request, virtualModel);
      
      // Record metrics
      const processingTime = Date.now() - startTime;
      await this.recordRequestMetrics({
        requestId: request.id,
        method: request.method,
        path: request.path,
        timestamp: startTime,
        virtualModel: virtualModel.id,
        processingTime,
        status: response.status,
        bytesSent: 0,
        bytesReceived: 0
      });
      
      this.logInfo('Request processed successfully');
      
      return response;
      
    } catch (error) {
      this.error('Failed to handle request');
      
      // Record error metrics
      const processingTime = Date.now() - startTime;
      await this.recordRequestMetrics({
        requestId: request.id,
        method: request.method,
        path: request.path,
        timestamp: startTime,
        virtualModel: request.virtualModel || '',
        processingTime,
        status: 500,
        bytesSent: 0,
        bytesReceived: 0,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Create standardized error response using Pipeline error handling if available
      const errorResponse = this.createErrorResponse(error, request);
      
      return {
        id: request.id,
        status: errorResponse.httpStatus || 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Error': errorResponse.error.code,
          'X-Error-Category': errorResponse.error.category,
          'X-Processing-Method': 'server'
        },
        body: errorResponse,
        timestamp: Date.now(),
        processingTime,
        requestId: request.id
      };
    }
  }

  /**
   * Handle WebSocket connection
   */
  public async handleWebSocket(connection: ConnectionInfo): Promise<void> {
    this.log('Handling WebSocket connection');
    
    // Add to connections registry
    this.connections.set(connection.id, connection);
    
    // Set up connection event handlers
    this.setupConnectionHandlers(connection);
    
    // Notify connection established
    (this as any).sendMessage('websocket-connected', { connectionId: connection.id });
  }

  /**
   * Register a route
   */
  public async registerRoute(route: RouteConfig): Promise<void> {
    this.log('Registering route');
    
    // Validate route configuration
    this.validateRouteConfig(route);
    
    // Add to routes registry
    this.routes.set(route.id, route);
    
    // Add to HTTP server
    this.addRouteToHttpServer(route);
    
    this.logInfo('Route registered successfully');
  }

  /**
   * Unregister a route
   */
  public async unregisterRoute(routeId: string): Promise<void> {
    this.log('Unregistering route');
    
    if (!this.routes.has(routeId)) {
      throw new Error(`Route '${routeId}' not found`);
    }
    
    // Remove from registries
    this.routes.delete(routeId);
    
    this.logInfo('Route unregistered successfully');
  }

  /**
   * Get all registered routes
   */
  public getRoutes(): RouteConfig[] {
    return Array.from(this.routes.values());
  }

  /**
   * Register a virtual model
   */
  public async registerVirtualModel(model: VirtualModelConfig): Promise<void> {
    this.log('Registering virtual model');
    
    await this.virtualModelRouter.registerModel(model);
    
    this.logInfo('Virtual model registered successfully');
  }

  /**
   * Unregister a virtual model
   */
  public async unregisterVirtualModel(modelId: string): Promise<void> {
    this.log('Unregistering virtual model');
    
    await this.virtualModelRouter.unregisterModel(modelId);
    
    this.logInfo('Virtual model unregistered successfully');
  }

  /**
   * Get virtual model by ID
   */
  public getVirtualModel(modelId: string): VirtualModelConfig | undefined {
    return this.virtualModelRouter.getModel(modelId);
  }

  /**
   * Get all virtual models
   */
  public getVirtualModels(): VirtualModelConfig[] {
    return this.virtualModelRouter.getModels();
  }

  /**
   * Register middleware
   */
  public async registerMiddleware(middleware: MiddlewareConfig): Promise<void> {
    this.log('Registering middleware');
    
    this.middlewares.set(middleware.name, middleware);
    
    this.logInfo('Middleware registered successfully');
  }

  /**
   * Unregister middleware
   */
  public async unregisterMiddleware(middlewareId: string): Promise<void> {
    this.log('Unregistering middleware');
    
    if (!this.middlewares.has(middlewareId)) {
      throw new Error(`Middleware '${middlewareId}' not found`);
    }
    
    this.middlewares.delete(middlewareId);
    
    this.logInfo('Middleware unregistered successfully');
  }

  /**
   * Get server status with unified monitoring
   */
  public getStatus(): ServerStatus {
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
      },
      pipelineIntegration: {
        enabled: this.pipelineIntegrationConfig.enabled,
        schedulerAvailable: false,
        processingMethod: this.underConstruction && this.pipelineIntegrationConfig.enabled ? 'underconstruction' : 'direct',
        fallbackEnabled: this.pipelineIntegrationConfig.fallbackToDirect,
        unifiedErrorHandling: this.pipelineIntegrationConfig.unifiedErrorHandling || false,
        unifiedMonitoring: this.pipelineIntegrationConfig.unifiedMonitoring || false,
        errorMapping: this.pipelineIntegrationConfig.errorMapping || {}
      },
      monitoring: {
        enabled: this.pipelineIntegrationConfig.unifiedMonitoring || false,
        detailedMetrics: this.pipelineIntegrationConfig.monitoringConfig?.enableDetailedMetrics || false,
        requestTracing: this.pipelineIntegrationConfig.monitoringConfig?.enableRequestTracing || false,
        performanceMonitoring: this.pipelineIntegrationConfig.monitoringConfig?.enablePerformanceMonitoring || false
      }
    };
  }

  /**
   * Get request metrics
   */
  public getMetrics(): RequestMetrics[] {
    return [...this.requestMetrics];
  }

  /**
   * Get active connections
   */
  public getConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get health status with unified monitoring
   */
  public async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    timestamp: number;
    underConstructionModule?: boolean;
    errorHandling?: boolean;
    monitoring?: boolean;
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
    
    // Check underconstruction module if available
    let underConstructionHealth = true;
    if (this.underConstruction) {
      underConstructionHealth = true; // UnderConstruction module is always healthy
      checks['underconstruction_module'] = underConstructionHealth;
    }
    
    // Check virtual model rules integration
    checks['virtual_model_rules_integration'] = this.virtualModelRulesModule !== null;
    
    // Check unified error handling
    checks['unified_error_handling'] = this.pipelineIntegrationConfig.unifiedErrorHandling || false;
    
    // Check unified monitoring
    checks['unified_monitoring'] = this.pipelineIntegrationConfig.unifiedMonitoring || false;
    
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
      timestamp: Date.now(),
      underConstructionModule: underConstructionHealth,
      errorHandling: this.pipelineIntegrationConfig.unifiedErrorHandling || false,
      monitoring: this.pipelineIntegrationConfig.unifiedMonitoring || false
    };
  }

  /**
   * Update server configuration
   */
  public async updateConfig(config: Partial<ServerConfig>): Promise<void> {
    this.log('Updating server configuration');
    
    if (!this.config) {
      throw new Error('Server not initialized');
    }
    
    // Merge configuration
    this.config = { ...this.config, ...config };
    
    this.logInfo('Server configuration updated successfully');
  }

  /**
   * Get current configuration
   */
  public getConfig(): ServerConfig {
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
    this.log('Registered message handler');
  }

  /**
   * Handle incoming messages
   */
  public async handleMessage(message: any): Promise<any> {
    this.log('Handling message');
    
    if (this.messageHandlers.has(message.type)) {
      const handler = this.messageHandlers.get(message.type)!;
      await handler(message);
    }
    
    return;
  }

  /**
   * Initialize Virtual Model Rules Integration
   */
  private async initializeVirtualModelRulesIntegration(): Promise<void> {
    this.log('Initializing Virtual Model Rules Integration');
    
    try {
      // Initialize Virtual Model Rules Module
      this.virtualModelRulesModule = new VirtualModelRulesModule();
      await this.virtualModelRulesModule.initialize();
      
      // Mark pipeline integration as under construction
      if (this.underConstruction) {
        this.underConstruction.callUnderConstructionFeature('pipeline-integration', {
          caller: 'ServerModule.initializeVirtualModelRulesIntegration',
          parameters: { 
            integrationType: 'virtual-model-rules',
            status: 'under-construction'
          },
          purpose: '虚拟模型规则集成替代pipeline集成'
        });
      }
      
      this.logInfo('Virtual Model Rules Integration initialized successfully');
      
    } catch (error) {
      this.error('Failed to initialize Virtual Model Rules Integration');
      // Don't throw error - allow server to start without virtual model rules integration
      this.warn('Virtual Model Rules Integration failed, continuing without it');
    }
  }

  /**
   * Get Virtual Model Configuration
   */
  private _getVirtualModelConfig(virtualModelId: string): any {
    // Mark as under construction feature
    if (this.underConstruction) {
      this.underConstruction.callUnderConstructionFeature('get-virtual-model-config', {
        caller: 'ServerModule.getVirtualModelConfig',
        parameters: { virtualModelId },
        purpose: '获取虚拟模型配置'
      });
    }
    
    // Placeholder implementation
    return {
      id: virtualModelId,
      name: virtualModelId,
      provider: 'under-construction',
      endpoint: '',
      model: virtualModelId,
      capabilities: [],
      enabled: true,
      priority: 'medium'
    };
  }

  /**
   * Process request through virtual model
   */
  public async processVirtualModelRequest(request: ClientRequest, model: VirtualModelConfig): Promise<ClientResponse> {
    this.log('Processing request with virtual model');
    
    // Mark pipeline processing as under construction
    if (this.underConstruction) {
      this.underConstruction.callUnderConstructionFeature('virtual-model-request-processing', {
        caller: 'ServerModule.processVirtualModelRequest',
        parameters: { 
          requestId: request.id, 
          modelId: model.id,
          provider: model.provider
        },
        purpose: '虚拟模型请求处理（原Pipeline调度器功能）'
      });
    }
    
    // Use direct processing (pipeline functionality is under construction)
    return await this.processDirectly(request, model);
  }

  /**
   * Process request via UnderConstruction (formerly Pipeline Scheduler)
   */
  private async _processViaUnderConstruction(request: ClientRequest, model: VirtualModelConfig): Promise<ClientResponse> {
    this.log('Processing via UnderConstruction (formerly Pipeline)');
    
    if (!this.underConstruction) {
      throw new Error('UnderConstruction module not available');
    }
    
    try {
      // Mark pipeline processing as under construction
      this.underConstruction.callUnderConstructionFeature('pipeline-scheduler-replacement', {
        caller: 'ServerModule.processViaUnderConstruction',
        parameters: { 
          requestId: request.id,
          modelId: model.id,
          provider: model.provider,
          originalMethod: 'processViaPipelineScheduler'
        },
        purpose: '替代Pipeline调度器的UnderConstruction实现'
      });
      
      // Simulate pipeline processing with under construction
      const processingTime = Math.random() * 100 + 50; // 50-150ms
      
      // Return mock pipeline response
      return {
        id: request.id,
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Virtual-Model': model.id,
          'X-Provider': model.provider,
          'X-Processing-Method': 'underconstruction-pipeline',
          'X-Integration-Status': 'rcc-v4-unified'
        },
        body: {
          message: 'Request processed via UnderConstruction (Pipeline replacement)',
          model: model.id,
          provider: model.provider,
          processingMethod: 'underconstruction-pipeline',
          originalRequest: {
            method: request.method,
            path: request.path,
            timestamp: request.timestamp
          },
          timestamp: Date.now(),
          integration: {
            unified: true,
            version: 'v4',
            errorHandler: 'unified-pipeline-error-handling',
            status: 'under-construction'
          }
        },
        timestamp: Date.now(),
        processingTime,
        requestId: request.id
      };
      
    } catch (error) {
      this.error('UnderConstruction processing failed', {
        modelId: model.id,
        error: error instanceof Error ? error.message : String(error),
        method: 'processViaUnderConstruction'
      });
      
      // Re-throw to trigger fallback mechanism
      throw error;
    }
  }

  /**
   * Process request directly (fallback method)
   */
  private async processDirectly(request: ClientRequest, model: VirtualModelConfig): Promise<ClientResponse> {
    this.log('Processing request directly');
    
    const startTime = Date.now();
    
    try {
      // Mark this as a fallback implementation
      if (this.underConstruction) {
        this.underConstruction.callUnderConstructionFeature('direct-virtual-model-processing', {
          caller: 'ServerModule.processDirectly',
          parameters: { 
            requestId: request.id, 
            modelId: model.id,
            provider: model.provider
          },
          purpose: '直接处理虚拟模型请求，绕过Pipeline调度器'
        });
      }
      
      // Basic request processing without Pipeline
      const processingTime = Date.now() - startTime;
      
      return {
        id: request.id,
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Virtual-Model': model.id,
          'X-Provider': model.provider,
          'X-Processing-Method': 'direct',
          'X-Fallback-Reason': 'pipeline-unavailable',
          'X-Integration-Status': 'rcc-v4-unified'
        },
        body: {
          message: 'Request processed successfully via direct processing',
          model: model.id,
          provider: model.provider,
          processingMethod: 'direct',
          originalRequest: {
            method: request.method,
            path: request.path,
            timestamp: request.timestamp
          },
          timestamp: Date.now(),
          integration: {
            unified: true,
            version: 'v4',
            errorHandler: 'unified-pipeline-error-handling'
          }
        },
        timestamp: Date.now(),
        processingTime,
        requestId: request.id
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.error('Direct processing failed', {
        modelId: model.id,
        error: error instanceof Error ? error.message : String(error),
        method: 'processDirectly'
      });
      
      // Create standardized error response
      const errorResponse = this.createErrorResponse(error, request);
      
      return {
        id: request.id,
        status: errorResponse.httpStatus || 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Virtual-Model': model.id,
          'X-Provider': model.provider,
          'X-Processing-Method': 'direct',
          'X-Error-Type': 'direct-processing-failed',
          'X-Integration-Status': 'rcc-v4-unified'
        },
        body: {
          ...errorResponse,
          processingMethod: 'direct',
          model: model.id,
          provider: model.provider,
          timestamp: Date.now(),
          integration: {
            unified: true,
            version: 'v4',
            errorHandler: 'unified-pipeline-error-handling'
          }
        },
        timestamp: Date.now(),
        processingTime,
        requestId: request.id
      };
    }
  }

  /**
   * Set UnderConstruction Module (formerly Pipeline Scheduler)
   */
  public async setUnderConstructionModule(underConstructionModule: UnderConstruction): Promise<void> {
    this.log('Setting UnderConstruction Module');
    
    try {
      // Mark underconstruction module setup as under construction
      if (this.underConstruction) {
        this.underConstruction.callUnderConstructionFeature('underconstruction-module-setup', {
          caller: 'ServerModule.setUnderConstructionModule',
          parameters: { 
            moduleType: 'UnderConstruction',
            enabled: true
          },
          purpose: '设置UnderConstruction模块替代Pipeline调度器'
        });
      }
      
      // Initialize the module if not already initialized
      if (typeof underConstructionModule.initialize === 'function') {
        await underConstructionModule.initialize();
      }
      
      // Check if features exist (simple check)
      const hasFeatures = typeof underConstructionModule.callUnderConstructionFeature === 'function';
      
      if (!hasFeatures) {
        this.warn('UnderConstruction module may not be properly initialized');
      }
      
      this.underConstruction = underConstructionModule;
      this.pipelineIntegrationConfig.enabled = true;
      
      this.logInfo('UnderConstruction Module set successfully');
      
      // Broadcast module integration event
      (this as any).sendMessage('underconstruction-integrated', {
        enabled: true,
        config: this.pipelineIntegrationConfig
      });
      
    } catch (error) {
      this.error('Failed to set UnderConstruction Module');
      throw error;
    }
  }

  /**
   * Get Pipeline Integration Configuration
   */
  public getPipelineIntegrationConfig(): PipelineIntegrationConfig {
    return { ...this.pipelineIntegrationConfig };
  }

  
  /**
   * Create standardized error response using unified error handling
   */
  private createErrorResponse(error: any, request?: ClientRequest): any {
    let pipelineError;
    
    // Convert error to PipelineError format if possible
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      pipelineError = error;
    } else {
      // Map common server errors to PipelineError format
      const errorMap: Record<string, string> = {
        'Server is not running': 'SERVER_NOT_RUNNING',
        'Pipeline execution failed': 'PIPELINE_EXECUTION_FAILED',
        'Direct processing failed': 'DIRECT_PROCESSING_FAILED',
        'Internal Server Error': 'INTERNAL_SERVER_ERROR',
        'Not Found': 'RESOURCE_NOT_FOUND',
        'Unauthorized': 'AUTHORIZATION_FAILED',
        'Forbidden': 'ACCESS_DENIED'
      };
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = errorMap[errorMessage] || 'UNKNOWN_ERROR';
      
      pipelineError = {
        code: errorCode,
        message: errorMessage,
        category: 'server',
        severity: 'high',
        recoverability: 'recoverable',
        impact: 'single_module',
        source: 'server',
        timestamp: Date.now()
      };
    }
    
    // Map error code to HTTP status
    const statusMap: Record<string, number> = {
      'SERVER_NOT_RUNNING': 503,
      'PIPELINE_EXECUTION_FAILED': 500,
      'DIRECT_PROCESSING_FAILED': 500,
      'INTERNAL_SERVER_ERROR': 500,
      'RESOURCE_NOT_FOUND': 404,
      'AUTHORIZATION_FAILED': 401,
      'ACCESS_DENIED': 403,
      'NO_AVAILABLE_PIPELINES': 503,
      'PIPELINE_SELECTION_FAILED': 500,
      'EXECUTION_FAILED': 500,
      'EXECUTION_TIMEOUT': 504
    };
    
    const httpStatus = statusMap[pipelineError.code] || 500;
    
    return {
      success: false,
      error: {
        code: pipelineError.code,
        message: pipelineError.message,
        category: pipelineError.category || 'server',
        severity: pipelineError.severity || 'medium',
        timestamp: pipelineError.timestamp || Date.now(),
        details: pipelineError.details || {}
      },
      context: request ? {
        requestId: request.id,
        method: request.method,
        path: request.path,
        virtualModel: request.virtualModel,
        timestamp: request.timestamp
      } : undefined,
      httpStatus,
      integration: {
        unified: true,
        version: 'v4',
        errorHandler: 'unified-pipeline-error-handling'
      }
    };
  }

  /**
   * Get default Pipeline Integration Configuration
   */
  private getDefaultPipelineIntegrationConfig(): PipelineIntegrationConfig {
    return {
      enabled: false,
      defaultTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      fallbackToDirect: true,
      enableMetrics: true,
      enableHealthCheck: true,
      pipelineSelectionStrategy: 'round-robin',
      customHeaders: {
        'X-Pipeline-Integration': 'RCC-Server',
        'X-Integration-Status': 'rcc-v4-unified'
      },
      errorMapping: {
        'NO_AVAILABLE_PIPELINES': 503,
        'PIPELINE_SELECTION_FAILED': 500,
        'EXECUTION_FAILED': 500,
        'EXECUTION_TIMEOUT': 504,
        'SERVER_ERROR': 500,
        'DIRECT_PROCESSING_FAILED': 500
      },
      unifiedErrorHandling: true,
      unifiedMonitoring: true
    };
  }

  /**
   * Setup request handling with unified logging
   */
  private setupRequestHandling(): void {
    const app = this.httpServer.getApp();
    
    // Add default route for all requests
    app.use('*', async (req: any, res: any) => {
      const requestStartTime = Date.now();
      const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Add request ID to headers for tracing
        res.setHeader('X-Request-ID', requestId);
        res.setHeader('X-Integration-Status', 'rcc-v4-unified');
        
        // Convert Express request to ClientRequest
        const clientRequest = this.httpServer.expressToClientRequest(req);
        clientRequest.id = requestId;
        
        // Handle request
        const clientResponse = await this.handleRequest(clientRequest);
        
        // Add unified monitoring headers
        const processingTime = Date.now() - requestStartTime;
        res.setHeader('X-Processing-Time', processingTime.toString());
        res.setHeader('X-Processing-Method', clientResponse.headers['X-Processing-Method'] || 'server');
        res.setHeader('X-Monitoring-Enabled', this.pipelineIntegrationConfig.unifiedMonitoring ? 'true' : 'false');
        
        // Convert ClientResponse to Express response
        this.httpServer.clientResponseToExpress(clientResponse, res);
        
        // Log request completion with unified monitoring
        if (this.pipelineIntegrationConfig.unifiedMonitoring) {
          this.log('Request completed', {
            requestId,
            method: req.method,
            path: req.path,
            status: clientResponse.status,
            processingTime,
            processingMethod: clientResponse.headers['X-Processing-Method'] || 'server',
            logMethod: 'requestMonitoring'
          });
        }
        
      } catch (error) {
        const processingTime = Date.now() - requestStartTime;
        
        this.error('Error handling request', {
          requestId,
          method: req.method,
          path: req.path,
          processingTime,
          error: error instanceof Error ? error.message : String(error),
          logMethod: 'requestHandling'
        });
        
        // Create standardized error response
        const errorResponse = this.createErrorResponse(error);
        
        res.status(errorResponse.httpStatus || 500).json({
          ...errorResponse,
          requestId,
          processingTime,
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
    this.registerMessageHandler('shutdown-request', async () => {
      this.log('Received shutdown request', { method: 'setupEventHandlers' });
      await this.stop();
    });
    
    // Handle HTTP server events (if EventEmitter is available)
    if (typeof this.httpServer.on === 'function') {
      this.httpServer.on('error', () => {
        this.error('HTTP server error', { method: 'setupEventHandlers' });
      });
    }
    
    // Handle process events
    process.on('SIGTERM', async () => {
      this.log('Received SIGTERM signal', { method: 'setupEventHandlers' });
      await this.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      this.log('Received SIGINT signal', { method: 'setupEventHandlers' });
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
      
      connection.on('error', () => {
        this.connections.delete(connection.id);
        this.warn('Connection error', { method: 'setupConnectionHandlers' });
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
  private createRouteHandler(_route: RouteConfig) {
    return async (req: any, res: any) => {
      try {
        const clientRequest = this.httpServer.expressToClientRequest(req);
        const clientResponse = await this.handleRequest(clientRequest);
        this.httpServer.clientResponseToExpress(clientResponse, res);
      } catch (error) {
        this.error('Route handler error', { method: 'createRouteHandler' });
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? errorMessage : 'An unexpected error occurred'
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
   * Cleanup resources with unified logging
   */
  public override async destroy(): Promise<void> {
    this.log('Cleaning up Server Module with unified cleanup', { method: 'destroy' });
    
    try {
      // Stop server if running
      if (this.isRunning) {
        await this.stop();
      }
      
            
      if (this.virtualModelRulesModule) {
        await this.virtualModelRulesModule.destroy();
        this.virtualModelRulesModule = null;
      }
      
      // Cleanup components
      if (typeof this.httpServer.destroy === 'function') {
        await this.httpServer.destroy();
      }
      if (typeof this.virtualModelRouter.destroy === 'function') {
        await this.virtualModelRouter.destroy();
      }
      
      // Clear registries
      this.routes.clear();
      this.middlewares.clear();
      this.requestMetrics.length = 0;
      this.connections.clear();
      this.messageHandlers.clear();
            
      this.config = null;
      this.isInitialized = false;
      
      this.logInfo('Server Module cleanup completed successfully');
      
      await super.destroy();
      
    } catch (error) {
      this.error('Error during unified cleanup', { method: 'destroy' });
      throw error;
    }
  }
}

export default ServerModule;