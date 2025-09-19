// Main Server Module for RCC

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { IServerModule } from './interfaces/IServerModule';
import { HttpServerComponent } from './components/HttpServer';
import { VirtualModelRouter } from './components/VirtualModelRouter';
import { ServerCore } from './core/ServerCore';
import { VirtualModelManager } from './core/VirtualModelManager';
import { RequestHandlerService } from './services/RequestHandlerService';
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
import { DebugCenter } from 'rcc-debugcenter';

// PipelineScheduler import removed - not available in current pipeline module

export class ServerModule extends BaseModule implements IServerModule {
  private httpServer: HttpServerComponent;
  private virtualModelRouter: VirtualModelRouter;
  private serverCore: ServerCore;
  private virtualModelManager: VirtualModelManager;
  private requestHandlerService: RequestHandlerService;
  private underConstruction: UnderConstruction | null = null;
  private pipelineIntegrationConfig: PipelineIntegrationConfig;
  // Using serverConfig instead of config to avoid inheritance conflict
  private serverConfig: ServerConfig | null = null;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private messageHandlers: Map<string, (message: any) => Promise<void>> = new Map();

  // Pipeline Scheduler Integration (under construction)
  private pipelineScheduler: any = null;

  


  // Debug Log Manager Integration
  private debugLogManager: DebugCenter | null = null;
  private debugEventBus: any = null;

  // Debug Center integration
  public debugCenter: DebugCenter | null = null;
  public debugCenterSessionId: string | null = null;
  
  // Internal state
  private routes: Map<string, RouteConfig> = new Map();
  private middlewares: Map<string, MiddlewareConfig> = new Map();
  private requestMetrics: RequestMetrics[] = [];
  private connections: Map<string, ConnectionInfo> = new Map();
  private startTime: number = 0;
  
  
  constructor(schedulerManager?: any, initialConfig?: ServerConfig) {
    const moduleInfo: ModuleInfo & { capabilities: string[], dependencies: string[], config: any } = {
      id: 'ServerModule',
      name: 'RCC Server Module',
      version: '1.0.0',
      description: 'HTTP server with virtual model routing for RCC framework',
      type: 'server',
      capabilities: ['http-server', 'virtual-model-routing', 'websocket', 'configuration-integration', 'pipeline-integration'],
      dependencies: ['rcc-basemodule', 'rcc-configuration', 'rcc-pipeline'],
      config: {},
      metadata: {
        author: 'RCC Development Team',
        license: 'MIT',
        repository: 'https://github.com/rcc/rcc-server'
      }
    };

    super(moduleInfo);

    // Initialize components
    this.httpServer = new HttpServerComponent();
    this.virtualModelRouter = new VirtualModelRouter();
    this.serverCore = new ServerCore();
    this.virtualModelManager = new VirtualModelManager();
    this.requestHandlerService = new RequestHandlerService(this.serverCore, this.virtualModelManager);
    this.underConstruction = null;
    this.pipelineIntegrationConfig = this.getDefaultPipelineIntegrationConfig();

    // Set scheduler manager if provided (T3: 流水线优先架构)
    if (schedulerManager) {
      this.pipelineScheduler = schedulerManager;
      this.logInfo('VirtualModelSchedulerManager provided in constructor', {
        hasScheduler: true,
        schedulerType: typeof schedulerManager
      });
    }

    // Store initial config if provided
    if (initialConfig) {
      this.serverConfig = initialConfig;
      this.logInfo('Initial configuration provided in constructor', {
        hasConfig: true,
        configKeys: Object.keys(initialConfig)
      });
    }
  }

  /**
   * Configure the server module
   */
  public override async configure(config: Record<string, any>): Promise<void> {
    console.log('=== ServerModule.configure called ===');

    super.configure(config);

    // Configure server core
    await this.serverCore.configure(config);

    // Configure virtual models
    if (config.virtualModels) {
      await this.virtualModelManager.loadVirtualModelsFromConfig(config.virtualModels);
    }

    this.serverConfig = config as ServerConfig;
    this.config = config; // Set parent class config

    console.log('=== ServerModule.configure completed ===');
  }

  /**
   * Initialize the server module
   */
  public override async initialize(): Promise<void> {
    console.log('=== STARTING SERVER MODULE INITIALIZATION ===');
    if (this.isInitialized) {
      this.warn('Server module is already initialized');
      return;
    }

    this.log('Initializing Server Module');

    try {
      // Call parent initialize first
      await super.initialize();

      // Pipeline Scheduler initialization removed (not available in current pipeline module)

      // Validate configuration
      if (this.serverConfig) {
        this.validateConfig(this.serverConfig);
      }

      // Initialize HTTP server
      if (this.serverConfig) {
        this.httpServer.configure(this.serverConfig);
        await this.httpServer.initialize();
      }

      // Initialize UnderConstruction module
      if (this.underConstruction) {
        await this.underConstruction.initialize();
      }

      // Set up Virtual Model Scheduler Manager
      if (!this.pipelineScheduler) {
        // No scheduler provided - initialize internally (backward compatibility)
        this.logInfo('No external scheduler provided - initializing internally');
        await this.initializePipelineScheduler();

        // Set scheduler manager in VirtualModelRouter if available
        if (this.pipelineScheduler) {
          this.virtualModelRouter.setSchedulerManager(this.pipelineScheduler);
        }
      } else {
        // External scheduler provided via constructor (T3: 流水线优先架构)
        this.virtualModelRouter.setSchedulerManager(this.pipelineScheduler);
        this.logInfo('Using externally provided VirtualModelSchedulerManager from constructor');
      }

      // Load virtual models from configuration after scheduler is initialized
      if (this.serverConfig) {
        console.log('=== Loading virtual models from configuration after scheduler initialization ===');
        console.log('serverConfig keys:', Object.keys(this.serverConfig));

        if ((this.serverConfig as any).virtualModels) {
          this.log('Loading virtual models from config after scheduler init', {
            virtualModelsCount: Object.keys((this.serverConfig as any).virtualModels).length,
            virtualModelsKeys: Object.keys((this.serverConfig as any).virtualModels)
          });
          console.log('=== Calling loadVirtualModelsFromConfig after scheduler init ===');
          console.log('Virtual models to load:', (this.serverConfig as any).virtualModels);
          await this.loadVirtualModelsFromConfig((this.serverConfig as any).virtualModels);
          console.log('=== loadVirtualModelsFromConfig call completed after scheduler init ===');
        } else {
          this.log('No virtualModels found in serverConfig after scheduler init', {
            hasVirtualModels: !!(this.serverConfig as any).virtualModels,
            hasParsedConfig: !!(this.serverConfig as any).parsedConfig,
            hasParsedConfigVirtualModels: !!((this.serverConfig as any).parsedConfig && (this.serverConfig as any).parsedConfig.virtualModels),
            configType: typeof this.serverConfig,
            configKeys: this.serverConfig ? Object.keys(this.serverConfig) : 'null'
          });
          console.log('=== NOT calling loadVirtualModelsFromConfig after scheduler init - condition not met ===');
        }
      }

      // Set up request handling
      this.setupRequestHandling();

      // Set up event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      this.logInfo('Server Module initialized successfully');

      // Notify initialization complete
      (this as any).sendMessage('server-initialized', { config: this.serverConfig || {} });

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
    console.log(`🚀 Starting RCC HTTP Server on ${this.serverConfig!.host}:${this.serverConfig!.port}`);

    try {
      // Start HTTP server
      this.logInfo(`Attempting to start HTTP server on ${this.serverConfig!.host}:${this.serverConfig!.port}`);
      await this.httpServer.listen(this.serverConfig!.port, this.serverConfig!.host);

      this.isRunning = true;
      this.startTime = Date.now();

      this.logInfo(`Server started successfully on ${this.serverConfig!.host}:${this.serverConfig!.port}`);
      console.log(`✅ RCC HTTP Server started successfully on ${this.serverConfig!.host}:${this.serverConfig!.port}`);

      // Notify server started
      (this as any).sendMessage('server-started', {
        host: this.serverConfig?.host || '',
        port: this.serverConfig?.port || 0,
        startTime: this.startTime
      });

      // Add a small delay to ensure the server is fully started
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test if server is actually listening
      if (!this.httpServer.isServerRunning()) {
        throw new Error('HTTP server failed to start - server not running after startup');
      }

      this.logInfo('Server startup verification completed');

    } catch (error) {
      this.error('Failed to start Server Module', {
        method: 'start',
        error: error instanceof Error ? error.message : String(error),
        port: this.serverConfig?.port,
        host: this.serverConfig?.host
      });
      console.error(`❌ Failed to start RCC HTTP Server: ${error instanceof Error ? error.message : String(error)}`);
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
   * Handle client request with enhanced logging via DebugLogManager
   */
  public async handleRequest(request: ClientRequest): Promise<ClientResponse> {
    if (!this.isRunning) {
      throw new Error('Server is not running');
    }

    const startTime = Date.now();
    let requestContext: any = null;
    const operationId = `http-request-${request.id}-${Date.now()}`;

    try {
      this.log('Handling request with enhanced logging');

      // Start I/O tracking for the entire request
      this.startIOTracking(operationId, {
        method: request.method,
        path: request.path,
        headers: request.headers,
        body: request.body,
        query: request.query,
        clientId: request.clientId,
        virtualModel: request.virtualModel
      }, 'handleRequest');

      // Start request tracking if DebugLogManager is available
      if (this.debugLogManager) {
        try {
          // Use DebugEventBus instead of direct DebugCenter method
          this.publishDebugEvent({
            sessionId: 'http-server-session',
            moduleId: 'ServerModule',
            operationId: `request-${request.id}`,
            timestamp: startTime,
            type: 'start',
            position: 'start',
            data: {
              requestId: request.id,
              method: request.method,
              path: request.path,
              virtualModel: request.virtualModel,
              headers: request.headers,
              sourceIp: request.clientId
            }
          });
          requestContext = {
            getRequestId: () => request.id
          };
          this.log('Request tracking started', { requestId: request.id, contextId: requestContext?.getRequestId?.() });
        } catch (trackingError) {
          this.warn('Failed to start request tracking', { error: trackingError instanceof Error ? trackingError.message : String(trackingError) });
        }
      }

      // Track request routing stage
      if (this.debugLogManager && requestContext) {
        try {
          this.publishDebugEvent({
            sessionId: 'http-server-session',
            moduleId: 'ServerModule',
            operationId: `request-${requestContext.getRequestId()}-routing`,
            timestamp: Date.now(),
            type: 'start',
            position: 'middle',
            data: {
              stage: 'virtual-model-routing',
              requestId: requestContext.getRequestId()
            }
          });
        } catch (stageError) {
          this.warn('Failed to track routing stage', { error: stageError instanceof Error ? stageError.message : String(stageError) });
        }
      }

      // Route to virtual model with I/O tracking
      const routingOperationId = `${operationId}-routing`;
      this.startIOTracking(routingOperationId, {
        request: {
          method: request.method,
          path: request.path,
          virtualModel: request.virtualModel
        },
        availableModels: this.virtualModelRouter.getEnabledModels().map(m => m.id)
      }, 'routeRequest');

      const virtualModel = await this.virtualModelRouter.routeRequest(request);

      // Record routing decision
      this.endIOTracking(routingOperationId, {
        selectedModel: virtualModel.id,
        provider: virtualModel.provider,
        capabilities: virtualModel.capabilities,
        routingDecision: 'success'
      }, true);

      // Complete routing stage
      if (this.debugLogManager && requestContext) {
        try {
          this.publishDebugEvent({
            sessionId: 'http-server-session',
            moduleId: 'ServerModule',
            operationId: `request-${requestContext.getRequestId()}-routing-complete`,
            timestamp: Date.now(),
            type: 'end',
            position: 'middle',
            data: {
              stage: 'virtual-model-routing',
              virtualModelId: virtualModel.id,
              routingTime: Date.now() - startTime,
              requestId: requestContext.getRequestId()
            }
          });
        } catch (stageError) {
          this.warn('Failed to complete routing stage', { error: stageError instanceof Error ? stageError.message : String(stageError) });
        }
      }

      // Track request processing stage
      if (this.debugLogManager && requestContext) {
        try {
          this.publishDebugEvent({
            sessionId: 'http-server-session',
            moduleId: 'ServerModule',
            operationId: `request-${requestContext.getRequestId()}-processing`,
            timestamp: Date.now(),
            type: 'start',
            position: 'middle',
            data: {
              stage: 'virtual-model-processing',
              requestId: requestContext.getRequestId()
            }
          });
        } catch (stageError) {
          this.warn('Failed to track processing stage', { error: stageError instanceof Error ? stageError.message : String(stageError) });
        }
      }

      // Process the request through the virtual model with I/O tracking
      const processingOperationId = `${operationId}-processing`;
      this.startIOTracking(processingOperationId, {
        model: virtualModel.id,
        provider: virtualModel.provider,
        request: {
          method: request.method,
          path: request.path,
          headers: request.headers,
          body: request.body
        }
      }, 'processVirtualModelRequest');

      const response = await this.processVirtualModelRequest(request, virtualModel);

      // Record processing result
      this.endIOTracking(processingOperationId, {
        response: {
          status: response.status,
          headers: response.headers,
          body: response.body
        },
        processingTime: response.processingTime
      }, true);

      // Complete processing stage
      if (this.debugLogManager && requestContext) {
        try {
          this.publishDebugEvent({
            sessionId: 'http-server-session',
            moduleId: 'ServerModule',
            operationId: `request-${requestContext.getRequestId()}-processing-complete`,
            timestamp: Date.now(),
            type: 'end',
            position: 'middle',
            data: {
              stage: 'virtual-model-processing',
              responseStatus: response.status,
              processingTime: Date.now() - startTime,
              requestId: requestContext.getRequestId()
            }
          });
        } catch (stageError) {
          this.warn('Failed to complete processing stage', { error: stageError instanceof Error ? stageError.message : String(stageError) });
        }
      }

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

      // Log successful request completion
      if (this.debugLogManager && requestContext) {
        try {
          this.publishDebugEvent({
            sessionId: 'http-server-session',
            moduleId: 'ServerModule',
            operationId: `request-${requestContext.getRequestId()}-success`,
            timestamp: Date.now(),
            type: 'end',
            position: 'end',
            data: {
              method: request.method,
              path: request.path,
              headers: request.headers,
              body: request.body,
              query: request.query,
              timestamp: startTime,
              response: {
                status: response.status,
                headers: response.headers,
                body: response.body,
                processingTime
              },
              success: true
            }
          });
        } catch (logError) {
          this.warn('Failed to log request success', { error: logError instanceof Error ? logError.message : String(logError) });
        }
      }

      // Complete I/O tracking for the entire request
      this.endIOTracking(operationId, {
        response: {
          status: response.status,
          headers: response.headers,
          body: response.body
        },
        processingTime: processingTime,
        virtualModel: virtualModel.id,
        metrics: {
          totalRequests: this.requestMetrics.length,
          errorRate: this.calculateErrorRate()
        }
      }, true);

      this.logInfo('Request processed successfully with enhanced logging');

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

      // Log request error if DebugLogManager is available
      if (this.debugLogManager && requestContext) {
        try {
          this.publishDebugEvent({
            sessionId: 'http-server-session',
            moduleId: 'ServerModule',
            operationId: `request-${requestContext.getRequestId()}-error`,
            timestamp: Date.now(),
            type: 'error',
            position: 'end',
            data: {
              method: request.method,
              path: request.path,
              headers: request.headers,
              body: request.body,
              query: request.query,
              timestamp: startTime,
              error: error instanceof Error ? error.message : String(error),
              errorPhase: 'request-processing',
              virtualModel: request.virtualModel
            }
          });
        } catch (logError) {
          this.warn('Failed to log request error', { error: logError instanceof Error ? logError.message : String(logError) });
        }
      }

      // Complete I/O tracking with error
      this.endIOTracking(operationId, {
        error: error instanceof Error ? error.message : String(error),
        processingTime: processingTime,
        virtualModel: request.virtualModel || 'unknown',
        errorPhase: 'request-processing'
      }, false, error instanceof Error ? error.message : String(error));

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
   * Load virtual models from configuration
   */
  private async loadVirtualModelsFromConfig(virtualModels: any): Promise<void> {
    console.log('=== loadVirtualModelsFromConfig called ===');
    console.log('virtualModels:', virtualModels);
    console.log('virtualModels type:', typeof virtualModels);

    this.log('Loading virtual models from configuration', {
      virtualModelsType: typeof virtualModels,
      virtualModelsKeys: virtualModels ? Object.keys(virtualModels) : 'null'
    });

    try {
      // Check if virtualModels is valid
      if (!virtualModels || typeof virtualModels !== 'object') {
        this.warn('Invalid virtualModels data provided to loadVirtualModelsFromConfig', {
          virtualModelsType: typeof virtualModels,
          virtualModelsValue: virtualModels
        });
        return;
      }

      const virtualModelsKeys = Object.keys(virtualModels);
      console.log('Virtual models keys:', virtualModelsKeys);
      this.log('Processing virtual models', {
        virtualModelsCount: virtualModelsKeys.length,
        virtualModelsKeys: virtualModelsKeys
      });

      // Convert configuration virtual models to ServerModule format
      for (const [modelId, vmConfig] of Object.entries(virtualModels)) {
        const typedVmConfig = vmConfig as any;
        console.log(`Processing virtual model: ${modelId}`, vmConfig);
        this.log(`Processing virtual model: ${modelId}`, {
          vmConfigType: typeof vmConfig,
          vmConfigKeys: vmConfig ? Object.keys(vmConfig) : 'null'
        });

        if (typedVmConfig.enabled !== false) {
          try {
            // Get the first target for basic configuration
            const firstTarget = typedVmConfig.targets && typedVmConfig.targets.length > 0 ? typedVmConfig.targets[0] : null;
            console.log(`First target for ${modelId}:`, firstTarget);

            if (firstTarget) {
              this.log(`Registering virtual model with first target: ${modelId}`, {
                firstTargetProviderId: firstTarget.providerId,
                firstTargetModelId: firstTarget.modelId,
                firstTargetKeyIndex: firstTarget.keyIndex
              });

              const virtualModelConfig: VirtualModelConfig = {
                id: modelId,
                name: modelId,
                provider: firstTarget.providerId,
                endpoint: '', // Will be set based on provider configuration
                model: firstTarget.modelId,
                capabilities: ['chat'], // Default capabilities
                maxTokens: 4096, // Default value
                temperature: 0.7, // Default value
                topP: 1.0, // Default value
                enabled: typedVmConfig.enabled !== false,
                routingRules: [], // No custom routing rules by default
                targets: typedVmConfig.targets // Preserve targets for proper capability inference
              };

              console.log(`Virtual model config for ${modelId}:`, virtualModelConfig);

              // Register the virtual model with traditional router
              await this.virtualModelRouter.registerModel(virtualModelConfig);

              // Register the virtual model with scheduler if available (T3: 流水线优先架构)
              // 注意：由于调度器已经通过构造函数传入，这里只需要注册虚拟模型到路由器即可
              // 调度器中的虚拟模型映射应该已经通过PipelineAssembler创建
              if (this.pipelineScheduler) {
                try {
                  // Verify that the virtual model exists in scheduler mappings
                  const virtualModelMappings = this.pipelineScheduler.getVirtualModelMappings ?
                    this.pipelineScheduler.getVirtualModelMappings() : [];

                  const existingMapping = virtualModelMappings.find(m => m.virtualModelId === modelId);

                  if (existingMapping) {
                    this.logInfo(`Virtual model verified in scheduler mappings: ${modelId}`, {
                      modelId: modelId,
                      schedulerId: existingMapping.schedulerId,
                      enabled: existingMapping.enabled
                    });
                  } else {
                    this.warn(`Virtual model ${modelId} not found in scheduler mappings - may need manual registration`);
                  }
                } catch (verificationError) {
                  this.warn(`Failed to verify virtual model ${modelId} in scheduler mappings`, {
                    error: verificationError instanceof Error ? verificationError.message : String(verificationError)
                  });
                }
              }

              this.logInfo(`Virtual model registered successfully: ${modelId}`, {
                modelId: modelId,
                model: virtualModelConfig.model
              });
              console.log(`✅ Virtual model registered successfully: ${modelId}`);
            } else {
              // Virtual models without targets will route to default - no warning needed
              console.log(`ℹ️ Virtual model ${modelId} will route to default (no specific targets configured)`);
            }
          } catch (error) {
            this.warn(`Error processing virtual model ${modelId}:`, error instanceof Error ? error.message : String(error));
            console.log(`❌ Error processing virtual model ${modelId}:`, error instanceof Error ? error.message : String(error));
          }
        } else {
          this.log(`Virtual model is disabled: ${modelId}`);
          console.log(`Virtual model is disabled: ${modelId}`);
        }
      }

      this.logInfo('Virtual models loaded from configuration successfully', {
        totalModelsProcessed: virtualModelsKeys.length
      });
      console.log('=== loadVirtualModelsFromConfig completed ===');
    } catch (error) {
      this.error('Failed to load virtual models from configuration', error instanceof Error ? error.message : String(error));
      console.log('❌ Failed to load virtual models from configuration:', error instanceof Error ? error.message : String(error));
    }
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
        schedulerAvailable: this.pipelineScheduler !== null,
        processingMethod: 'direct',
        fallbackEnabled: false,
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
    pipelineScheduler?: boolean;
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
    
    // Check virtual model scheduler integration
    checks['virtual_model_scheduler_integration'] = this.pipelineScheduler !== null;

    
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
      pipelineScheduler: this.pipelineScheduler !== null,
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
  public override getConfig(): ServerConfig {
    if (!this.serverConfig) {
      throw new Error('Server not configured');
    }

    return { ...this.serverConfig };
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
  public override async handleMessage(message: any): Promise<any> {
    this.log('Handling message');
    
    if (this.messageHandlers.has(message.type)) {
      const handler = this.messageHandlers.get(message.type)!;
      await handler(message);
    }
    
    return;
  }

  
    
  /**
   * Set Virtual Model Scheduler Manager
   */
  public setVirtualModelSchedulerManager(schedulerManager: any): void {
    this.log('Setting Virtual Model Scheduler Manager');

    try {
      this.pipelineScheduler = schedulerManager;
      this.logInfo('Virtual Model Scheduler Manager set successfully');

      // Broadcast scheduler integration event
      (this as any).sendMessage('virtual-model-scheduler-integrated', {
        enabled: true,
        capabilities: ['request-scheduling', 'load-balancing', 'health-monitoring']
      });

    } catch (error) {
      this.error('Failed to set Virtual Model Scheduler Manager');
      throw error;
    }
  }


  /**
   * Initialize Virtual Model Scheduler Manager
   */
  private async initializePipelineScheduler(): Promise<void> {
    this.log('Initializing Virtual Model Scheduler Manager');

    try {
      // Import the actual VirtualModelSchedulerManager and PipelineTracker from pipeline module
      const pipelineModule: any = await import('rcc-pipeline');
      const VirtualModelSchedulerManager = pipelineModule.VirtualModelSchedulerManager;
      const PipelineTracker = pipelineModule.PipelineTracker;

      if (VirtualModelSchedulerManager && PipelineTracker) {
        // Create pipeline tracker configuration
        const trackerConfig = {
          enabled: true,
          baseDirectory: './logs',
          paths: {
            requests: 'requests',
            responses: 'responses',
            errors: 'errors',
            pipeline: 'pipeline',
            system: 'system'
          },
          logLevel: 'info',
          requestTracking: {
            enabled: true,
            generateRequestIds: true,
            includeTimestamps: true,
            trackMetadata: true
          },
          contentFiltering: {
            enabled: true,
            sensitiveFields: ['api_key', 'password', 'token', 'secret', 'authorization'],
            maxContentLength: 10000,
            sanitizeResponses: true
          },
          fileManagement: {
            maxFileSize: 10,
            maxFiles: 100,
            compressOldLogs: true,
            retentionDays: 30
          },
          performanceTracking: {
            enabled: true,
            trackTiming: true,
            trackMemoryUsage: false,
            trackSuccessRates: true
          }
        };

        // Create pipeline tracker
        const pipelineTracker = new PipelineTracker(trackerConfig);

        // Create manager configuration
        const managerConfig = {
          maxSchedulers: 100,
          defaultSchedulerConfig: {
            maxConcurrentRequests: 50,
            requestTimeout: 30000,
            healthCheckInterval: 60000,
            retryStrategy: {
              maxRetries: 3,
              baseDelay: 1000,
              maxDelay: 10000,
              backoffMultiplier: 2
            },
            loadBalancingStrategy: 'round-robin',
            enableCircuitBreaker: true,
            circuitBreakerThreshold: 5,
            circuitBreakerTimeout: 300000
          },
          pipelineFactoryConfig: {
            defaultTimeout: 30000,
            defaultHealthCheckInterval: 60000,
            defaultMaxRetries: 3,
            defaultLoadBalancingStrategy: 'round-robin',
            enableHealthChecks: true,
            metricsEnabled: true
          },
          enableAutoScaling: true,
          scalingThresholds: {
            minRequestsPerMinute: 10,
            maxRequestsPerMinute: 1000,
            scaleUpCooldown: 300000,
            scaleDownCooldown: 600000
          },
          healthCheckInterval: 30000,
          metricsRetentionPeriod: 86400000, // 24 hours
          enableMetricsExport: true
        };

        // Create actual VirtualModelSchedulerManager instance
        this.pipelineScheduler = new VirtualModelSchedulerManager(managerConfig, pipelineTracker);

        this.logInfo('Virtual Model Scheduler Manager initialized successfully with concrete implementation');
      } else {
        this.warn('VirtualModelSchedulerManager not available in pipeline module');
      }

    } catch (error) {
      this.error('Failed to initialize Virtual Model Scheduler Manager', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw error - allow server to start without scheduler
      this.warn('Virtual Model Scheduler Manager failed, continuing without it');
    }
  }



  /**
   * Get Virtual Model Configuration
   */
  private async _getVirtualModelConfig(virtualModelId: string): Promise<any> {
    // Pipeline scheduler removed - using DebugLogManager for request tracking
    this.log(`Getting configuration for virtual model ${virtualModelId} using DebugLogManager`);

    // Mark as under construction feature for virtual model configuration
    if (this.underConstruction) {
      this.underConstruction.callUnderConstructionFeature('get-virtual-model-config', {
        caller: 'ServerModule.getVirtualModelConfig',
        parameters: { virtualModelId },
        purpose: '获取虚拟模型配置'
      });
    }

    // Fallback implementation
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
    this.log('Processing request with virtual model using pipeline');

    try {
      const startTime = Date.now();

      // Convert client request to OpenAI format
      const openaiRequest = {
        model: model.model || 'default',
        messages: request.body?.messages || [],
        temperature: model.temperature,
        top_p: model.topP,
        max_tokens: model.maxTokens
      };

      // Check if we have a scheduler manager and use it for execution
      if (this.pipelineScheduler) {
        try {
          // Determine operation type based on request path
          const operationType = request.path.includes('stream') ? 'streamChat' : 'chat';

          // Execute through pipeline scheduler
          const result = await this.pipelineScheduler.execute(
            model.id,
            openaiRequest,
            operationType,
            {
              timeout: 30000,
              retries: 3,
              priority: 'medium',
              metadata: {
                requestId: request.id,
                clientId: request.clientId,
                path: request.path,
                method: request.method
              }
            }
          );

          const processingTime = Date.now() - startTime;

          // Return successful response
          return {
            id: request.id,
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Virtual-Model': model.id,
              'X-Provider': model.provider,
              'X-Processing-Method': 'pipeline-scheduler',
              'X-Integration-Status': 'rcc-v4-pipeline'
            },
            body: result,
            timestamp: Date.now(),
            processingTime: processingTime,
            requestId: request.id
          };
        } catch (schedulerError) {
          this.error('Pipeline scheduler execution failed', {
            modelId: model.id,
            error: schedulerError instanceof Error ? schedulerError.message : String(schedulerError),
            duration: Date.now() - startTime
          });

          // Create error response
          const errorResponse = this.createErrorResponse(schedulerError, request);
          const processingTime = Date.now() - startTime;

          return {
            id: request.id,
            status: errorResponse.httpStatus || 500,
            headers: {
              'Content-Type': 'application/json',
              'X-Error': errorResponse.error.code,
              'X-Error-Category': errorResponse.error.category,
              'X-Processing-Method': 'pipeline-scheduler'
            },
            body: errorResponse,
            timestamp: Date.now(),
            processingTime: processingTime,
            requestId: request.id
          };
        }
      } else {
        // Scheduler should always be available after proper initialization
        // If we reach here, it indicates a configuration or initialization issue
        console.warn(`⚠️  No scheduler available for virtual model '${model.id}' - this should not happen with proper initialization`);

        // Return error response indicating scheduler unavailability
        this.error('Scheduler not available for virtual model execution', {
          modelId: model.id
        });

        const errorResponse = this.createErrorResponse(new Error('Scheduler not available for virtual model execution'), request);

        return {
          id: request.id,
          status: errorResponse.httpStatus || 500,
          headers: errorResponse.headers || {},
          body: errorResponse.body,
          timestamp: Date.now(),
          processingTime: 0,
          requestId: request.id
        };
      }
    } catch (error) {
      this.error('Virtual model processing failed', {
        modelId: model.id,
        error: error instanceof Error ? error.message : String(error),
        method: 'processVirtualModelRequest'
      });

      throw new Error(`Virtual model processing failed for model ${model.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process request via Pipeline Scheduler
   */
  private async _processViaPipelineScheduler(request: ClientRequest, model: VirtualModelConfig): Promise<ClientResponse> {
    this.log('Processing via DebugLogManager (replaces Pipeline Scheduler)');

    try {
      // Use DebugLogManager for request tracking instead of pipeline scheduler
      const startTime = Date.now();

      // Log the request with DebugLogManager if available
      if (this.debugLogManager) {
        try {
          this.publishDebugEvent({
            sessionId: 'http-server-session',
            moduleId: 'ServerModule',
            operationId: `request-${request.id}-pipeline-replacement`,
            timestamp: Date.now(),
            type: 'info',
            position: 'middle',
            data: {
              requestId: request.id,
              provider: model.provider,
              operation: 'pipeline-scheduler-replacement',
              request: {
                method: request.method,
                path: request.path,
                headers: request.headers,
                body: request.body
              },
              metadata: {
                virtualModelId: model.id,
                clientId: request.clientId,
                source: 'server-module-internal'
              }
            }
          });
        } catch (logError) {
          this.warn('Failed to log request to DebugLogManager', { error: logError });
        }
      }

      // Create execution result
      const executionResult = {
        result: {
          message: 'Request processed via DebugLogManager',
          virtualModelId: model.id,
          provider: model.provider
        },
        error: null, // Add error property
        executionId: request.id,
        duration: Date.now() - startTime
      };

      // Validate execution result before creating response
      if (!executionResult.result && !executionResult.error) {
        throw new Error('DebugLogManager execution returned no result - invalid execution state');
      }

      // Return pipeline processing response
      return {
        id: request.id,
        status: executionResult.error ? 500 : 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Virtual-Model': model.id,
          'X-Provider': model.provider,
          'X-Processing-Method': 'pipeline-scheduler',
          'X-Pipeline-Execution-Id': executionResult.executionId || 'unknown',
          'X-Integration-Status': 'rcc-v4-unified'
        },
        body: {
          model: model.id,
          provider: model.provider,
          processingMethod: 'pipeline-scheduler',
          originalRequest: {
            method: request.method,
            path: request.path,
            timestamp: request.timestamp
          },
          executionResult: executionResult.result || executionResult.error,
          timestamp: Date.now(),
          integration: {
            unified: true,
            version: 'v4',
            errorHandler: 'unified-pipeline-error-handling'
          }
        },
        timestamp: Date.now(),
        processingTime: executionResult.duration || 0,
        requestId: request.id
      };
      
    } catch (error) {
      this.error('Pipeline Scheduler processing failed', {
        modelId: model.id,
        error: error instanceof Error ? error.message : String(error),
        method: 'processViaPipelineScheduler'
      });

      throw error;
    }
  }

  
  /**
   * Set Debug Log Manager for enhanced request logging
   */
  public setDebugLogManager(debugLogManager: any): void {
    this.log('Setting Debug Log Manager for enhanced request logging');

    try {
      this.debugLogManager = debugLogManager;

      // Also set up DebugEventBus if available
      if (debugLogManager && typeof debugLogManager.constructor.getInstance === 'function') {
        this.debugEventBus = debugLogManager.constructor.getInstance();
      }

      this.logInfo('Debug Log Manager set successfully - all HTTP requests will be tracked');

      // Broadcast debug log manager integration event
      (this as any).sendMessage('debug-log-manager-integrated', {
        enabled: true,
        capabilities: ['request-tracking', 'pipeline-logging', 'performance-monitoring']
      });

    } catch (error) {
      this.error('Failed to set Debug Log Manager');
      throw error;
    }
  }

  /**
   * Publish debug event through DebugEventBus
   */
  private publishDebugEvent(event: any): void {
    if (this.debugEventBus && typeof this.debugEventBus.publish === 'function') {
      try {
        this.debugEventBus.publish({
          sessionId: event.sessionId || 'default-session',
          moduleId: event.moduleId || 'ServerModule',
          operationId: event.operationId || 'unknown-operation',
          timestamp: event.timestamp || Date.now(),
          type: event.type || 'info',
          position: event.position || 'middle',
          data: event.data || {}
        });
      } catch (error) {
        this.warn('Failed to publish debug event', { error });
      }
    }
  }

  /**
   * Set UnderConstruction Module
   */
  public async setUnderConstructionModule(underConstructionModule: UnderConstruction): Promise<void> {
    this.log('Setting UnderConstruction Module');
    
    try {
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
      fallbackToDirect: false,
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

    // Add a simple test endpoint
    app.get('/test', async (req: any, res: any) => {
      res.json({
        message: 'RCC Server is running',
        timestamp: Date.now(),
        port: this.config?.port,
        virtualModels: this.virtualModelRouter.getModels().length,
        status: 'healthy'
      });
    });

    // Add default route for all requests
    app.all('*', async (req: any, res: any, next: any) => {
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
      
            
      if (this.pipelineScheduler) {
        await this.pipelineScheduler.destroy();
        this.pipelineScheduler = null;
      }

      // if (this.virtualModelRulesModule) {
      //   await this.virtualModelRulesModule.destroy();
      //   this.virtualModelRulesModule = null;
      // }
      
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
            
      this.config = {};
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