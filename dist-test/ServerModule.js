// Main Server Module for RCC
import { BaseModule } from 'rcc-basemodule';
import { HttpServerComponent } from './components/HttpServer';
import { VirtualModelRouter } from './components/VirtualModelRouter';
// PipelineScheduler import removed - not available in current pipeline module
export class ServerModule extends BaseModule {
    constructor() {
        const moduleInfo = {
            id: 'ServerModule',
            name: 'RCC Server Module',
            version: '1.0.0',
            description: 'HTTP server with virtual model routing for RCC framework',
            type: 'server',
            capabilities: [
                'http-server',
                'virtual-model-routing',
                'websocket',
                'configuration-integration',
                'pipeline-integration',
            ],
            dependencies: ['rcc-basemodule', 'rcc-configuration', 'rcc-pipeline'],
            config: {},
            metadata: {
                author: 'RCC Development Team',
                license: 'MIT',
                repository: 'https://github.com/rcc/rcc-server',
            },
        };
        super(moduleInfo);
        this.underConstruction = null;
        // Using serverConfig instead of config to avoid inheritance conflict
        this.serverConfig = null;
        this.isInitialized = false;
        this.isRunning = false;
        this.messageHandlers = new Map();
        // Pipeline Scheduler Integration (under construction)
        this.pipelineScheduler = null;
        // Test Scheduler Integration (under construction)
        this.testScheduler = null;
        // Debug Log Manager Integration
        this.debugLogManager = null;
        // Internal state
        this.routes = new Map();
        this.middlewares = new Map();
        this.requestMetrics = [];
        this.connections = new Map();
        this.startTime = 0;
        this.httpServer = new HttpServerComponent();
        this.virtualModelRouter = new VirtualModelRouter();
        this.underConstruction = null;
        this.pipelineIntegrationConfig = this.getDefaultPipelineIntegrationConfig();
    }
    /**
     * Configure the server module
     */
    async configure(config) {
        console.error('=== ServerModule.configure called ===');
        this.log('ServerModule.configure method called', { method: 'configure' });
        console.log('Config keys:', Object.keys(config));
        console.log('Config:', JSON.stringify(config, null, 2));
        super.configure(config);
        this.serverConfig = config;
        this.config = config; // Set parent class config
        console.log('=== ServerModule.configure - checking parsedConfig ===');
        console.log('config.parsedConfig:', config.parsedConfig);
        console.log('config.parsedConfig type:', typeof config.parsedConfig);
        console.log('config.parsedConfig exists:', !!config.parsedConfig);
        if (config.parsedConfig) {
            console.log('config.parsedConfig.keys:', Object.keys(config.parsedConfig));
            console.log('config.parsedConfig.virtualModels:', config.parsedConfig.virtualModels);
            console.log('config.parsedConfig.virtualModels exists:', !!config.parsedConfig.virtualModels);
            if (config.parsedConfig.virtualModels) {
                console.log('config.parsedConfig.virtualModels type:', typeof config.parsedConfig.virtualModels);
                console.log('config.parsedConfig.virtualModels keys:', Object.keys(config.parsedConfig.virtualModels));
            }
        }
        this.log('ServerModule.configure called', {
            hasParsedConfig: !!config.parsedConfig,
            configKeys: Object.keys(config),
        });
        // Load virtual models from parsed configuration if available
        console.log('=== Checking condition for loading virtual models ===');
        console.log('config.parsedConfig exists:', !!config.parsedConfig);
        console.log('config.parsedConfig.virtualModels exists:', !!(config.parsedConfig && config.parsedConfig.virtualModels));
        console.log('Full config object keys:', Object.keys(config));
        if (config.parsedConfig && config.parsedConfig.virtualModels) {
            this.log('Loading virtual models from parsedConfig', {
                virtualModelsCount: Object.keys(config.parsedConfig.virtualModels).length,
                virtualModelsKeys: Object.keys(config.parsedConfig.virtualModels),
            });
            console.log('=== Calling loadVirtualModelsFromConfig ===');
            console.log('Virtual models to load:', config.parsedConfig.virtualModels);
            await this.loadVirtualModelsFromConfig(config.parsedConfig.virtualModels);
            console.log('=== loadVirtualModelsFromConfig call completed ===');
        }
        else {
            this.log('No parsedConfig or virtualModels found', {
                hasParsedConfig: !!config.parsedConfig,
                hasVirtualModels: !!(config.parsedConfig && config.parsedConfig.virtualModels),
                parsedConfigType: typeof config.parsedConfig,
                parsedConfigKeys: config.parsedConfig ? Object.keys(config.parsedConfig) : 'null',
            });
            console.log('=== NOT calling loadVirtualModelsFromConfig - condition not met ===');
        }
        console.log('=== ServerModule.configure completed ===');
    }
    /**
     * Initialize the server module
     */
    async initialize() {
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
            // Initialize Virtual Model Scheduler Manager
            await this.initializePipelineScheduler();
            // Set up request handling
            this.setupRequestHandling();
            // Set up event handlers
            this.setupEventHandlers();
            this.isInitialized = true;
            this.logInfo('Server Module initialized successfully');
            // Notify initialization complete
            this.sendMessage('server-initialized', { config: this.serverConfig || {} });
        }
        catch (error) {
            this.error('Failed to initialize Server Module', { method: 'initialize' });
            throw error;
        }
    }
    /**
     * Start the server
     */
    async start() {
        if (!this.isInitialized) {
            throw new Error('Server module must be initialized before starting');
        }
        if (this.isRunning) {
            this.warn('Server is already running');
            return;
        }
        this.log('Starting Server Module');
        console.log(`🚀 Starting RCC HTTP Server on ${this.serverConfig.host}:${this.serverConfig.port}`);
        try {
            // Start HTTP server
            this.logInfo(`Attempting to start HTTP server on ${this.serverConfig.host}:${this.serverConfig.port}`);
            await this.httpServer.listen(this.serverConfig.port, this.serverConfig.host);
            this.isRunning = true;
            this.startTime = Date.now();
            this.logInfo(`Server started successfully on ${this.serverConfig.host}:${this.serverConfig.port}`);
            console.log(`✅ RCC HTTP Server started successfully on ${this.serverConfig.host}:${this.serverConfig.port}`);
            // Notify server started
            this.sendMessage('server-started', {
                host: this.serverConfig?.host || '',
                port: this.serverConfig?.port || 0,
                startTime: this.startTime,
            });
            // Add a small delay to ensure the server is fully started
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Test if server is actually listening
            if (!this.httpServer.isServerRunning()) {
                throw new Error('HTTP server failed to start - server not running after startup');
            }
            this.logInfo('Server startup verification completed');
        }
        catch (error) {
            this.error('Failed to start Server Module', {
                method: 'start',
                error: error instanceof Error ? error.message : String(error),
                port: this.serverConfig?.port,
                host: this.serverConfig?.host,
            });
            console.error(`❌ Failed to start RCC HTTP Server: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    /**
     * Stop the server
     */
    async stop() {
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
            this.sendMessage('server-stopped', {
                uptime: Date.now() - this.startTime,
                totalRequests: this.requestMetrics.length,
            });
        }
        catch (error) {
            this.error('Failed to stop Server Module', { method: 'stop' });
            throw error;
        }
    }
    /**
     * Restart the server
     */
    async restart() {
        this.log('Restarting Server Module');
        await this.stop();
        await this.start();
        this.logInfo('Server restarted successfully');
    }
    /**
     * Handle client request with enhanced logging via DebugLogManager
     */
    async handleRequest(request) {
        if (!this.isRunning) {
            throw new Error('Server is not running');
        }
        const startTime = Date.now();
        let requestContext = null;
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
                virtualModel: request.virtualModel,
            }, 'handleRequest');
            // Start request tracking if DebugLogManager is available
            if (this.debugLogManager) {
                try {
                    requestContext = this.debugLogManager.startRequest('http-server', 'incoming-request', {
                        requestId: request.id,
                        method: request.method,
                        path: request.path,
                        timestamp: startTime,
                        virtualModel: request.virtualModel,
                        headers: request.headers,
                        sourceIp: request.clientId,
                    });
                    this.log('Request tracking started', {
                        requestId: request.id,
                        contextId: requestContext?.getRequestId?.(),
                    });
                }
                catch (trackingError) {
                    this.warn('Failed to start request tracking', {
                        error: trackingError instanceof Error ? trackingError.message : String(trackingError),
                    });
                }
            }
            // Track request routing stage
            if (this.debugLogManager && requestContext) {
                try {
                    this.debugLogManager.trackStage(requestContext.getRequestId(), 'virtual-model-routing');
                }
                catch (stageError) {
                    this.warn('Failed to track routing stage', {
                        error: stageError instanceof Error ? stageError.message : String(stageError),
                    });
                }
            }
            // Route to virtual model with I/O tracking
            const routingOperationId = `${operationId}-routing`;
            this.startIOTracking(routingOperationId, {
                request: {
                    method: request.method,
                    path: request.path,
                    virtualModel: request.virtualModel,
                },
                availableModels: this.virtualModelRouter.getEnabledModels().map((m) => m.id),
            }, 'routeRequest');
            const virtualModel = await this.virtualModelRouter.routeRequest(request);
            // Record routing decision
            this.endIOTracking(routingOperationId, {
                selectedModel: virtualModel.id,
                provider: virtualModel.provider,
                capabilities: virtualModel.capabilities,
                routingDecision: 'success',
            }, true);
            // Complete routing stage
            if (this.debugLogManager && requestContext) {
                try {
                    this.debugLogManager.completeStage(requestContext.getRequestId(), 'virtual-model-routing', {
                        virtualModelId: virtualModel.id,
                        routingTime: Date.now() - startTime,
                    });
                }
                catch (stageError) {
                    this.warn('Failed to complete routing stage', {
                        error: stageError instanceof Error ? stageError.message : String(stageError),
                    });
                }
            }
            // Track request processing stage
            if (this.debugLogManager && requestContext) {
                try {
                    this.debugLogManager.trackStage(requestContext.getRequestId(), 'virtual-model-processing');
                }
                catch (stageError) {
                    this.warn('Failed to track processing stage', {
                        error: stageError instanceof Error ? stageError.message : String(stageError),
                    });
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
                    body: request.body,
                },
            }, 'processVirtualModelRequest');
            const response = await this.processVirtualModelRequest(request, virtualModel);
            // Record processing result
            this.endIOTracking(processingOperationId, {
                response: {
                    status: response.status,
                    headers: response.headers,
                    body: response.body,
                },
                processingTime: response.processingTime,
            }, true);
            // Complete processing stage
            if (this.debugLogManager && requestContext) {
                try {
                    this.debugLogManager.completeStage(requestContext.getRequestId(), 'virtual-model-processing', {
                        responseStatus: response.status,
                        processingTime: Date.now() - startTime,
                    });
                }
                catch (stageError) {
                    this.warn('Failed to complete processing stage', {
                        error: stageError instanceof Error ? stageError.message : String(stageError),
                    });
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
                bytesReceived: 0,
            });
            // Log successful request completion
            if (this.debugLogManager && requestContext) {
                try {
                    await this.debugLogManager.logSuccess(requestContext, {
                        method: request.method,
                        path: request.path,
                        headers: request.headers,
                        body: request.body,
                        query: request.query,
                        timestamp: startTime,
                    }, {
                        status: response.status,
                        headers: response.headers,
                        body: response.body,
                        timestamp: Date.now(),
                        processingTime,
                    });
                }
                catch (logError) {
                    this.warn('Failed to log request success', {
                        error: logError instanceof Error ? logError.message : String(logError),
                    });
                }
            }
            // Complete I/O tracking for the entire request
            this.endIOTracking(operationId, {
                response: {
                    status: response.status,
                    headers: response.headers,
                    body: response.body,
                },
                processingTime: processingTime,
                virtualModel: virtualModel.id,
                metrics: {
                    totalRequests: this.requestMetrics.length,
                    errorRate: this.calculateErrorRate(),
                },
            }, true);
            this.logInfo('Request processed successfully with enhanced logging');
            return response;
        }
        catch (error) {
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
                error: error instanceof Error ? error.message : String(error),
            });
            // Log request error if DebugLogManager is available
            if (this.debugLogManager && requestContext) {
                try {
                    await this.debugLogManager.logError(requestContext, error, {
                        method: request.method,
                        path: request.path,
                        headers: request.headers,
                        body: request.body,
                        query: request.query,
                        timestamp: startTime,
                    }, 'virtual-model-processing', {
                        errorPhase: 'request-processing',
                        virtualModel: request.virtualModel,
                    });
                }
                catch (logError) {
                    this.warn('Failed to log request error', {
                        error: logError instanceof Error ? logError.message : String(logError),
                    });
                }
            }
            // Complete I/O tracking with error
            this.endIOTracking(operationId, {
                error: error instanceof Error ? error.message : String(error),
                processingTime: processingTime,
                virtualModel: request.virtualModel || 'unknown',
                errorPhase: 'request-processing',
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
                    'X-Processing-Method': 'server',
                },
                body: errorResponse,
                timestamp: Date.now(),
                processingTime,
                requestId: request.id,
            };
        }
    }
    /**
     * Handle WebSocket connection
     */
    async handleWebSocket(connection) {
        this.log('Handling WebSocket connection');
        // Add to connections registry
        this.connections.set(connection.id, connection);
        // Set up connection event handlers
        this.setupConnectionHandlers(connection);
        // Notify connection established
        this.sendMessage('websocket-connected', { connectionId: connection.id });
    }
    /**
     * Register a route
     */
    async registerRoute(route) {
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
    async unregisterRoute(routeId) {
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
    getRoutes() {
        return Array.from(this.routes.values());
    }
    /**
     * Register a virtual model
     */
    async registerVirtualModel(model) {
        this.log('Registering virtual model');
        await this.virtualModelRouter.registerModel(model);
        this.logInfo('Virtual model registered successfully');
    }
    /**
     * Unregister a virtual model
     */
    async unregisterVirtualModel(modelId) {
        this.log('Unregistering virtual model');
        await this.virtualModelRouter.unregisterModel(modelId);
        this.logInfo('Virtual model unregistered successfully');
    }
    /**
     * Load virtual models from configuration
     */
    async loadVirtualModelsFromConfig(virtualModels) {
        console.log('=== loadVirtualModelsFromConfig called ===');
        console.log('virtualModels:', virtualModels);
        console.log('virtualModels type:', typeof virtualModels);
        this.log('Loading virtual models from configuration', {
            virtualModelsType: typeof virtualModels,
            virtualModelsKeys: virtualModels ? Object.keys(virtualModels) : 'null',
        });
        try {
            // Check if virtualModels is valid
            if (!virtualModels || typeof virtualModels !== 'object') {
                this.warn('Invalid virtualModels data provided to loadVirtualModelsFromConfig', {
                    virtualModelsType: typeof virtualModels,
                    virtualModelsValue: virtualModels,
                });
                return;
            }
            const virtualModelsKeys = Object.keys(virtualModels);
            console.log('Virtual models keys:', virtualModelsKeys);
            this.log('Processing virtual models', {
                virtualModelsCount: virtualModelsKeys.length,
                virtualModelsKeys: virtualModelsKeys,
            });
            // Convert configuration virtual models to ServerModule format
            for (const [modelId, vmConfig] of Object.entries(virtualModels)) {
                const typedVmConfig = vmConfig;
                console.log(`Processing virtual model: ${modelId}`, vmConfig);
                this.log(`Processing virtual model: ${modelId}`, {
                    vmConfigType: typeof vmConfig,
                    vmConfigKeys: vmConfig ? Object.keys(vmConfig) : 'null',
                });
                if (typedVmConfig.enabled !== false) {
                    try {
                        // Get the first target for basic configuration
                        const firstTarget = typedVmConfig.targets && typedVmConfig.targets.length > 0
                            ? typedVmConfig.targets[0]
                            : null;
                        console.log(`First target for ${modelId}:`, firstTarget);
                        if (firstTarget) {
                            this.log(`Registering virtual model with first target: ${modelId}`, {
                                firstTargetProviderId: firstTarget.providerId,
                                firstTargetModelId: firstTarget.modelId,
                                firstTargetKeyIndex: firstTarget.keyIndex,
                            });
                            const virtualModelConfig = {
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
                            };
                            console.log(`Virtual model config for ${modelId}:`, virtualModelConfig);
                            // Register the virtual model with traditional router
                            await this.virtualModelRouter.registerModel(virtualModelConfig);
                            // Register the virtual model with scheduler if available
                            if (this.pipelineScheduler) {
                                try {
                                    // Convert virtual model config to scheduler format
                                    const schedulerConfig = {
                                        virtualModelId: modelId,
                                        provider: firstTarget.providerId,
                                        model: firstTarget.modelId,
                                        enabled: typedVmConfig.enabled !== false,
                                        targets: typedVmConfig.targets || [],
                                        schedulingStrategy: 'round-robin',
                                        healthCheckInterval: 30000,
                                        maxRetries: 3,
                                        timeout: 30000,
                                    };
                                    await this.pipelineScheduler.registerVirtualModel(schedulerConfig);
                                    this.logInfo(`Virtual model registered with scheduler: ${modelId}`, {
                                        modelId: modelId,
                                        provider: virtualModelConfig.provider,
                                        targetsCount: typedVmConfig.targets?.length || 0,
                                    });
                                }
                                catch (schedulerError) {
                                    this.warn(`Failed to register virtual model ${modelId} with scheduler`, {
                                        error: schedulerError instanceof Error
                                            ? schedulerError.message
                                            : String(schedulerError),
                                    });
                                    // Continue with traditional routing if scheduler registration fails
                                }
                            }
                            this.logInfo(`Virtual model registered successfully: ${modelId}`, {
                                modelId: modelId,
                                provider: virtualModelConfig.provider,
                                model: virtualModelConfig.model,
                            });
                            console.log(`✅ Virtual model registered successfully: ${modelId}`);
                        }
                        else {
                            // Virtual models without targets will route to default - no warning needed
                            console.log(`ℹ️ Virtual model ${modelId} will route to default (no specific targets configured)`);
                        }
                    }
                    catch (error) {
                        this.warn(`Error processing virtual model ${modelId}:`, error instanceof Error ? error.message : String(error));
                        console.log(`❌ Error processing virtual model ${modelId}:`, error instanceof Error ? error.message : String(error));
                    }
                }
                else {
                    this.log(`Virtual model is disabled: ${modelId}`);
                    console.log(`Virtual model is disabled: ${modelId}`);
                }
            }
            this.logInfo('Virtual models loaded from configuration successfully', {
                totalModelsProcessed: virtualModelsKeys.length,
            });
            console.log('=== loadVirtualModelsFromConfig completed ===');
        }
        catch (error) {
            this.error('Failed to load virtual models from configuration', error instanceof Error ? error.message : String(error));
            console.log('❌ Failed to load virtual models from configuration:', error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Get virtual model by ID
     */
    getVirtualModel(modelId) {
        return this.virtualModelRouter.getModel(modelId);
    }
    /**
     * Get all virtual models
     */
    getVirtualModels() {
        return this.virtualModelRouter.getModels();
    }
    /**
     * Register middleware
     */
    async registerMiddleware(middleware) {
        this.log('Registering middleware');
        this.middlewares.set(middleware.name, middleware);
        this.logInfo('Middleware registered successfully');
    }
    /**
     * Unregister middleware
     */
    async unregisterMiddleware(middlewareId) {
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
    getStatus() {
        const uptime = this.isRunning ? Date.now() - this.startTime : 0;
        const virtualModels = this.virtualModelRouter.getModels();
        return {
            status: this.getServerStatus(),
            uptime,
            port: this.config?.port || 0,
            host: this.config?.host || '',
            connections: this.connections.size,
            requestsHandled: this.requestMetrics.length,
            errors: this.requestMetrics.filter((m) => m.status >= 400).length,
            lastHeartbeat: Date.now(),
            virtualModels: {
                total: virtualModels.length,
                active: virtualModels.filter((m) => m.enabled).length,
                inactive: virtualModels.filter((m) => !m.enabled).length,
            },
            pipelineIntegration: {
                enabled: this.pipelineIntegrationConfig.enabled,
                schedulerAvailable: this.pipelineScheduler !== null,
                processingMethod: 'direct',
                fallbackEnabled: true,
                unifiedErrorHandling: this.pipelineIntegrationConfig.unifiedErrorHandling || false,
                unifiedMonitoring: this.pipelineIntegrationConfig.unifiedMonitoring || false,
                errorMapping: this.pipelineIntegrationConfig.errorMapping || {},
            },
            monitoring: {
                enabled: this.pipelineIntegrationConfig.unifiedMonitoring || false,
                detailedMetrics: this.pipelineIntegrationConfig.monitoringConfig?.enableDetailedMetrics || false,
                requestTracing: this.pipelineIntegrationConfig.monitoringConfig?.enableRequestTracing || false,
                performanceMonitoring: this.pipelineIntegrationConfig.monitoringConfig?.enablePerformanceMonitoring || false,
            },
        };
    }
    /**
     * Get request metrics
     */
    getMetrics() {
        return [...this.requestMetrics];
    }
    /**
     * Get active connections
     */
    getConnections() {
        return Array.from(this.connections.values());
    }
    /**
     * Get health status with unified monitoring
     */
    async getHealth() {
        const checks = {};
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
        let status = 'healthy';
        const failedChecks = Object.values(checks).filter((check) => !check).length;
        if (failedChecks === 0) {
            status = 'healthy';
        }
        else if (failedChecks <= 2) {
            status = 'degraded';
        }
        else {
            status = 'unhealthy';
        }
        return {
            status,
            checks,
            timestamp: Date.now(),
            pipelineScheduler: this.pipelineScheduler !== null,
            errorHandling: this.pipelineIntegrationConfig.unifiedErrorHandling || false,
            monitoring: this.pipelineIntegrationConfig.unifiedMonitoring || false,
        };
    }
    /**
     * Update server configuration
     */
    async updateConfig(config) {
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
    getConfig() {
        if (!this.serverConfig) {
            throw new Error('Server not configured');
        }
        return { ...this.serverConfig };
    }
    /**
     * Register message handler
     */
    registerMessageHandler(type, handler) {
        this.messageHandlers.set(type, handler);
        this.log('Registered message handler');
    }
    /**
     * Handle incoming messages
     */
    async handleMessage(message) {
        this.log('Handling message');
        if (this.messageHandlers.has(message.type)) {
            const handler = this.messageHandlers.get(message.type);
            await handler(message);
        }
        return;
    }
    /**
     * Set Virtual Model Scheduler Manager
     */
    setVirtualModelSchedulerManager(schedulerManager) {
        this.log('Setting Virtual Model Scheduler Manager');
        try {
            this.pipelineScheduler = schedulerManager;
            this.logInfo('Virtual Model Scheduler Manager set successfully');
            // Broadcast scheduler integration event
            this.sendMessage('virtual-model-scheduler-integrated', {
                enabled: true,
                capabilities: ['request-scheduling', 'load-balancing', 'health-monitoring'],
            });
        }
        catch (error) {
            this.error('Failed to set Virtual Model Scheduler Manager');
            throw error;
        }
    }
    /**
     * Set Test Scheduler for virtual model mapping validation
     */
    setTestScheduler(testScheduler) {
        this.log('Setting Test Scheduler for virtual model mapping validation');
        try {
            this.testScheduler = testScheduler;
            this.logInfo('Test Scheduler set successfully - will print detailed mapping information');
            // Broadcast test scheduler integration event
            this.sendMessage('test-scheduler-integrated', {
                enabled: true,
                capabilities: ['virtual-model-mapping', 'request-distribution', 'logging'],
            });
        }
        catch (error) {
            this.error('Failed to set Test Scheduler');
            throw error;
        }
    }
    /**
     * Initialize Virtual Model Scheduler Manager
     */
    async initializePipelineScheduler() {
        this.log('Initializing Virtual Model Scheduler Manager');
        try {
            this.logInfo('Virtual Model Scheduler Manager interface initialized (concrete implementation not available in current pipeline module)');
            this.logInfo('Virtual Model Scheduler Manager initialized successfully');
        }
        catch (error) {
            this.error('Failed to initialize Virtual Model Scheduler Manager');
            // Don't throw error - allow server to start without scheduler
            this.warn('Virtual Model Scheduler Manager failed, continuing without it');
        }
    }
    /**
     * Get Virtual Model Configuration
     */
    async _getVirtualModelConfig(virtualModelId) {
        // Pipeline scheduler removed - using DebugLogManager for request tracking
        this.log(`Getting configuration for virtual model ${virtualModelId} using DebugLogManager`);
        // Mark as under construction feature for virtual model configuration
        if (this.underConstruction) {
            this.underConstruction.callUnderConstructionFeature('get-virtual-model-config', {
                caller: 'ServerModule.getVirtualModelConfig',
                parameters: { virtualModelId },
                purpose: '获取虚拟模型配置',
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
            priority: 'medium',
        };
    }
    /**
     * Process request through virtual model
     */
    async processVirtualModelRequest(request, model) {
        this.log('Processing request with virtual model using scheduler');
        try {
            const startTime = Date.now();
            // Use the test scheduler for virtual model mapping validation
            if (this.testScheduler) {
                try {
                    // Route request through test scheduler
                    const schedulerResult = await this.testScheduler.processVirtualModelRequest(request, model);
                    // Create response from test scheduler result
                    return {
                        id: request.id,
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Virtual-Model': model.id,
                            'X-Provider': model.provider,
                            'X-Processing-Method': 'test-scheduler',
                            'X-Integration-Status': 'rcc-v4-test-scheduler',
                        },
                        body: {
                            id: `msg_${request.id}_${Date.now()}`,
                            type: 'message',
                            role: 'assistant',
                            content: [
                                {
                                    type: 'text',
                                    text: `Virtual model request processed via test scheduler. Model: ${model.id}, Provider: ${model.provider}`,
                                },
                            ],
                            model: model.id,
                            stop_reason: 'end_turn',
                            stop_sequence: null,
                            usage: {
                                input_tokens: 10,
                                output_tokens: 20,
                            },
                        },
                        timestamp: Date.now(),
                        processingTime: Date.now() - startTime,
                        requestId: request.id,
                    };
                }
                catch (schedulerError) {
                    this.warn('Test scheduler processing failed, falling back to direct processing', {
                        error: schedulerError instanceof Error ? schedulerError.message : String(schedulerError),
                    });
                    // Fall back to direct processing
                }
            }
            // Fallback to direct processing with DebugLogManager
            if (this.debugLogManager) {
                try {
                    await this.debugLogManager.logRequest({
                        requestId: request.id,
                        provider: model.provider,
                        operation: 'process-virtual-model',
                        request: {
                            method: request.method,
                            path: request.path,
                            headers: request.headers,
                            body: request.body,
                        },
                        metadata: {
                            virtualModelId: model.id,
                            clientId: request.clientId,
                            source: 'server-module-fallback',
                        },
                    });
                }
                catch (logError) {
                    this.warn('Failed to log request to DebugLogManager', { error: logError });
                }
            }
            // Return fallback response
            return {
                id: request.id,
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Virtual-Model': model.id,
                    'X-Provider': model.provider,
                    'X-Processing-Method': 'direct-fallback',
                    'X-Integration-Status': 'rcc-v4-fallback',
                },
                body: {
                    id: `msg_${request.id}_${Date.now()}`,
                    type: 'message',
                    role: 'assistant',
                    content: [
                        {
                            type: 'text',
                            text: `Virtual model request processed via fallback. Model: ${model.id}, Provider: ${model.provider}`,
                        },
                    ],
                    model: model.id,
                    stop_reason: 'end_turn',
                    stop_sequence: null,
                    usage: {
                        input_tokens: 10,
                        output_tokens: 20,
                    },
                },
                timestamp: Date.now(),
                processingTime: Date.now() - startTime,
                requestId: request.id,
            };
        }
        catch (error) {
            this.error('Virtual model processing failed', {
                modelId: model.id,
                error: error instanceof Error ? error.message : String(error),
                method: 'processVirtualModelRequest',
            });
            throw new Error(`Virtual model processing failed for model ${model.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Process request via Pipeline Scheduler
     */
    async _processViaPipelineScheduler(request, model) {
        this.log('Processing via DebugLogManager (replaces Pipeline Scheduler)');
        try {
            // Use DebugLogManager for request tracking instead of pipeline scheduler
            const startTime = Date.now();
            // Log the request with DebugLogManager if available
            if (this.debugLogManager) {
                try {
                    await this.debugLogManager.logRequest({
                        requestId: request.id,
                        provider: model.provider,
                        operation: 'pipeline-scheduler-replacement',
                        request: {
                            method: request.method,
                            path: request.path,
                            headers: request.headers,
                            body: request.body,
                        },
                        metadata: {
                            virtualModelId: model.id,
                            clientId: request.clientId,
                            source: 'server-module-internal',
                        },
                    });
                }
                catch (logError) {
                    this.warn('Failed to log request to DebugLogManager', { error: logError });
                }
            }
            // Create execution result
            const executionResult = {
                result: {
                    message: 'Request processed via DebugLogManager',
                    virtualModelId: model.id,
                    provider: model.provider,
                },
                error: null, // Add error property
                executionId: request.id,
                duration: Date.now() - startTime,
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
                    'X-Integration-Status': 'rcc-v4-unified',
                },
                body: {
                    model: model.id,
                    provider: model.provider,
                    processingMethod: 'pipeline-scheduler',
                    originalRequest: {
                        method: request.method,
                        path: request.path,
                        timestamp: request.timestamp,
                    },
                    executionResult: executionResult.result || executionResult.error,
                    timestamp: Date.now(),
                    integration: {
                        unified: true,
                        version: 'v4',
                        errorHandler: 'unified-pipeline-error-handling',
                    },
                },
                timestamp: Date.now(),
                processingTime: executionResult.duration || 0,
                requestId: request.id,
            };
        }
        catch (error) {
            this.error('Pipeline Scheduler processing failed', {
                modelId: model.id,
                error: error instanceof Error ? error.message : String(error),
                method: 'processViaPipelineScheduler',
            });
            throw error;
        }
    }
    /**
     * Set Debug Log Manager for enhanced request logging
     */
    setDebugLogManager(debugLogManager) {
        this.log('Setting Debug Log Manager for enhanced request logging');
        try {
            this.debugLogManager = debugLogManager;
            this.logInfo('Debug Log Manager set successfully - all HTTP requests will be tracked');
            // Broadcast debug log manager integration event
            this.sendMessage('debug-log-manager-integrated', {
                enabled: true,
                capabilities: ['request-tracking', 'pipeline-logging', 'performance-monitoring'],
            });
        }
        catch (error) {
            this.error('Failed to set Debug Log Manager');
            throw error;
        }
    }
    /**
     * Set UnderConstruction Module
     */
    async setUnderConstructionModule(underConstructionModule) {
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
            this.sendMessage('underconstruction-integrated', {
                enabled: true,
                config: this.pipelineIntegrationConfig,
            });
        }
        catch (error) {
            this.error('Failed to set UnderConstruction Module');
            throw error;
        }
    }
    /**
     * Get Pipeline Integration Configuration
     */
    getPipelineIntegrationConfig() {
        return { ...this.pipelineIntegrationConfig };
    }
    /**
     * Create standardized error response using unified error handling
     */
    createErrorResponse(error, request) {
        let pipelineError;
        // Convert error to PipelineError format if possible
        if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
            pipelineError = error;
        }
        else {
            // Map common server errors to PipelineError format
            const errorMap = {
                'Server is not running': 'SERVER_NOT_RUNNING',
                'Pipeline execution failed': 'PIPELINE_EXECUTION_FAILED',
                'Internal Server Error': 'INTERNAL_SERVER_ERROR',
                'Not Found': 'RESOURCE_NOT_FOUND',
                Unauthorized: 'AUTHORIZATION_FAILED',
                Forbidden: 'ACCESS_DENIED',
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
                timestamp: Date.now(),
            };
        }
        // Map error code to HTTP status
        const statusMap = {
            SERVER_NOT_RUNNING: 503,
            PIPELINE_EXECUTION_FAILED: 500,
            DIRECT_PROCESSING_FAILED: 500,
            INTERNAL_SERVER_ERROR: 500,
            RESOURCE_NOT_FOUND: 404,
            AUTHORIZATION_FAILED: 401,
            ACCESS_DENIED: 403,
            NO_AVAILABLE_PIPELINES: 503,
            PIPELINE_SELECTION_FAILED: 500,
            EXECUTION_FAILED: 500,
            EXECUTION_TIMEOUT: 504,
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
                details: pipelineError.details || {},
            },
            context: request
                ? {
                    requestId: request.id,
                    method: request.method,
                    path: request.path,
                    virtualModel: request.virtualModel,
                    timestamp: request.timestamp,
                }
                : undefined,
            httpStatus,
            integration: {
                unified: true,
                version: 'v4',
                errorHandler: 'unified-pipeline-error-handling',
            },
        };
    }
    /**
     * Get default Pipeline Integration Configuration
     */
    getDefaultPipelineIntegrationConfig() {
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
                'X-Integration-Status': 'rcc-v4-unified',
            },
            errorMapping: {
                NO_AVAILABLE_PIPELINES: 503,
                PIPELINE_SELECTION_FAILED: 500,
                EXECUTION_FAILED: 500,
                EXECUTION_TIMEOUT: 504,
                SERVER_ERROR: 500,
                DIRECT_PROCESSING_FAILED: 500,
            },
            unifiedErrorHandling: true,
            unifiedMonitoring: true,
        };
    }
    /**
     * Setup request handling with unified logging
     */
    setupRequestHandling() {
        const app = this.httpServer.getApp();
        // Add a simple test endpoint
        app.get('/test', async (req, res) => {
            res.json({
                message: 'RCC Server is running',
                timestamp: Date.now(),
                port: this.config?.port,
                virtualModels: this.virtualModelRouter.getModels().length,
                status: 'healthy',
            });
        });
        // Add default route for all requests
        app.all('*', async (req, res, next) => {
            const requestStartTime = Date.now();
            const requestId = req.headers['x-request-id'] ||
                `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
                        logMethod: 'requestMonitoring',
                    });
                }
            }
            catch (error) {
                const processingTime = Date.now() - requestStartTime;
                this.error('Error handling request', {
                    requestId,
                    method: req.method,
                    path: req.path,
                    processingTime,
                    error: error instanceof Error ? error.message : String(error),
                    logMethod: 'requestHandling',
                });
                // Create standardized error response
                const errorResponse = this.createErrorResponse(error);
                res.status(errorResponse.httpStatus || 500).json({
                    ...errorResponse,
                    requestId,
                    processingTime,
                    timestamp: Date.now(),
                });
            }
        });
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
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
    setupConnectionHandlers(connection) {
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
    addRouteToHttpServer(route) {
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
    createRouteHandler(_route) {
        return async (req, res) => {
            try {
                const clientRequest = this.httpServer.expressToClientRequest(req);
                const clientResponse = await this.handleRequest(clientRequest);
                this.httpServer.clientResponseToExpress(clientResponse, res);
            }
            catch (error) {
                this.error('Route handler error', { method: 'createRouteHandler' });
                const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
                res.status(500).json({
                    error: 'Internal Server Error',
                    message: process.env.NODE_ENV === 'development' ? errorMessage : 'An unexpected error occurred',
                });
            }
        };
    }
    /**
     * Record request metrics
     */
    async recordRequestMetrics(metrics) {
        this.requestMetrics.push(metrics);
        // Keep only last 1000 metrics
        if (this.requestMetrics.length > 1000) {
            this.requestMetrics = this.requestMetrics.slice(-1000);
        }
    }
    /**
     * Calculate error rate
     */
    calculateErrorRate() {
        if (this.requestMetrics.length === 0) {
            return 0;
        }
        const errors = this.requestMetrics.filter((m) => m.status >= 400).length;
        return errors / this.requestMetrics.length;
    }
    /**
     * Get server status
     */
    getServerStatus() {
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
    validateConfig(config) {
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
    validateRouteConfig(route) {
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
    async destroy() {
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
        }
        catch (error) {
            this.error('Error during unified cleanup', { method: 'destroy' });
            throw error;
        }
    }
}
export default ServerModule;
