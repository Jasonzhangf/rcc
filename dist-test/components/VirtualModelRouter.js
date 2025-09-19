// Virtual Model Router component for RCC Server Module
import { BaseModule } from 'rcc-basemodule';
export class VirtualModelRouter extends BaseModule {
    constructor() {
        const moduleInfo = {
            id: 'VirtualModelRouter',
            name: 'Virtual Model Router',
            version: '2.0.0',
            description: 'Virtual model routing with intelligent scheduling',
            type: 'component',
            capabilities: ['virtual-model-routing', 'intelligent-scheduling', 'load-balancing'],
            dependencies: ['rcc-basemodule', 'rcc-pipeline'],
            metadata: {
                author: 'RCC Development Team',
                license: 'MIT',
            },
        };
        super(moduleInfo);
        this.virtualModels = new Map();
        this.routingRules = new Map();
        this.modelMetrics = new Map();
        this.providers = new Map();
        this.isSchedulerEnabled = false;
        // Initialize pipeline tracker for debugging
        // Note: PipelineTracker class not available in current pipeline module
        this.pipelineTracker = {
            enabled: true,
            baseDirectory: './logs',
            paths: {
                requests: 'requests',
                responses: 'responses',
                errors: 'errors',
                pipeline: 'pipeline',
                system: 'system',
            },
            logLevel: 'info',
            requestTracking: {
                enabled: true,
                generateRequestIds: true,
                includeTimestamps: true,
                trackMetadata: true,
            },
            contentFiltering: {
                enabled: true,
                sensitiveFields: ['api_key', 'password', 'token', 'secret', 'authorization'],
                maxContentLength: 10000,
                sanitizeResponses: true,
            },
        };
        // Debug module not available - using mock structure
        this.pipelineTracker = {
            ...this.pipelineTracker,
            fileManagement: {
                maxFileSize: 10,
                maxFiles: 100,
                compressOldLogs: true,
                retentionDays: 30,
            },
            performanceTracking: {
                enabled: true,
                trackTiming: true,
                trackMemoryUsage: false,
                trackSuccessRates: true,
            },
        };
        // Initialize scheduler manager (interface only, no concrete class)
        this.schedulerManager = {
            config: {
                maxSchedulers: 100,
                defaultSchedulerConfig: {
                    maxConcurrentRequests: 50,
                    requestTimeout: 30000,
                    healthCheckInterval: 60000,
                    retryStrategy: {
                        maxRetries: 3,
                        baseDelay: 1000,
                        maxDelay: 10000,
                        backoffMultiplier: 2,
                    },
                    loadBalancingStrategy: 'round-robin',
                    enableCircuitBreaker: true,
                    circuitBreakerThreshold: 5,
                    circuitBreakerTimeout: 300000,
                },
                pipelineFactoryConfig: {
                    defaultTimeout: 30000,
                    defaultHealthCheckInterval: 60000,
                    defaultMaxRetries: 3,
                    defaultLoadBalancingStrategy: 'round-robin',
                    enableHealthChecks: true,
                    metricsEnabled: true,
                },
                enableAutoScaling: true,
                scalingThresholds: {
                    minRequestsPerMinute: 10,
                    maxRequestsPerMinute: 1000,
                    scaleUpCooldown: 300000,
                    scaleDownCooldown: 600000,
                },
                healthCheckInterval: 30000,
                metricsRetentionPeriod: 86400000, // 24 hours
                enableMetricsExport: true,
            },
            tracker: this.pipelineTracker,
            name: 'VirtualModelSchedulerManager',
            initialize: async () => {
                console.log('Scheduler initialized');
            },
            destroy: async () => {
                console.log('Scheduler destroyed');
            },
            registerVirtualModel: async (config) => {
                console.log('Model registered:', config);
            },
        };
        this.isSchedulerEnabled = true;
    }
    /**
     * Route a request to the appropriate virtual model
     */
    async routeRequest(request) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const operationId = `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('=== VirtualModelRouter.routeRequest called ===');
        console.log(`[${requestId}] Request details:`, {
            method: request.method,
            path: request.path,
            virtualModel: request.virtualModel,
            headers: request.headers,
            bodyLength: request.body ? JSON.stringify(request.body).length : 0,
        });
        console.log(`[${requestId}] Available virtual models:`, Array.from(this.virtualModels.keys()));
        console.log(`[${requestId}] Enabled virtual models:`, this.getEnabledModels().map((m) => m.id));
        console.log(`[${requestId}] Scheduler enabled:`, this.isSchedulerEnabled);
        this.log('Routing request', {
            method: 'routeRequest',
            requestId,
            path: request.path,
            virtualModel: request.virtualModel,
        });
        // Start I/O tracking for the routing operation
        this.startIOTracking(operationId, {
            method: request.method,
            path: request.path,
            virtualModel: request.virtualModel,
            headers: request.headers,
            body: request.body,
            query: request.query,
            clientId: request.clientId,
            availableModels: Array.from(this.virtualModels.keys()),
            enabledModels: this.getEnabledModels().map((m) => m.id),
            schedulerEnabled: this.isSchedulerEnabled,
        }, 'routeRequest');
        // Use scheduler if enabled and available
        if (this.isSchedulerEnabled && request.virtualModel) {
            // Track scheduler routing attempt
            const schedulerOperationId = `scheduler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            try {
                console.log(`[${requestId}] Attempting to use scheduler for virtual model:`, request.virtualModel);
                this.startIOTracking(schedulerOperationId, {
                    virtualModel: request.virtualModel,
                    schedulerEnabled: this.isSchedulerEnabled,
                    operation: request.path.includes('stream') ? 'streamChat' : 'chat',
                }, 'schedulerRouting');
                // Check if we have a scheduler for this virtual model
                const scheduler = this.schedulerManager.getVirtualModelScheduler(request.virtualModel);
                if (scheduler) {
                    console.log(`[${requestId}] Found scheduler for virtual model, executing request`);
                    // Execute through scheduler
                    const operation = request.path.includes('stream')
                        ? 'streamChat'
                        : 'chat';
                    // Note: This is a routing decision - actual execution happens elsewhere
                    // For now, we'll return the model configuration and let the actual execution happen
                    const model = this.virtualModels.get(request.virtualModel);
                    if (model && (model.enabled ?? true)) {
                        console.log(`[${requestId}] Using scheduler-based routing for virtual model:`, request.virtualModel);
                        await this.recordRequestMetrics(model.id, true);
                        // Complete scheduler routing tracking
                        this.endIOTracking(schedulerOperationId, {
                            routingMethod: 'scheduler',
                            selectedModel: model.id,
                            modelConfig: {
                                id: model.id,
                                name: model.name,
                                provider: model.provider,
                                enabled: model.enabled,
                                capabilities: model.capabilities,
                            },
                        }, true);
                        return model;
                    }
                }
                else {
                    console.log(`[${requestId}] No scheduler found for virtual model:`, request.virtualModel);
                    // Complete scheduler routing tracking with fallback
                    this.endIOTracking(schedulerOperationId, {
                        routingMethod: 'scheduler',
                        result: 'no_scheduler_found',
                        fallback: 'traditional_routing',
                    }, false, 'No scheduler found for virtual model');
                }
            }
            catch (error) {
                console.warn(`[${requestId}] Scheduler execution failed, falling back to traditional routing:`, error);
                // Complete scheduler routing tracking with error
                this.endIOTracking(schedulerOperationId, {
                    routingMethod: 'scheduler',
                    result: 'scheduler_failed',
                    fallback: 'traditional_routing',
                    error: error instanceof Error ? error.message : String(error),
                }, false, error instanceof Error ? error.message : String(error));
                // Fallback to traditional routing
            }
        }
        // Fallback to traditional routing
        if (request.virtualModel) {
            console.log(`[${requestId}] Specific virtual model requested:`, request.virtualModel);
            // Track traditional routing attempt
            const traditionalOperationId = `traditional_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.startIOTracking(traditionalOperationId, {
                routingMethod: 'traditional',
                requestedModel: request.virtualModel,
                availableModels: Array.from(this.virtualModels.keys()),
            }, 'traditionalRouting');
            const model = this.virtualModels.get(request.virtualModel);
            console.log(`[${requestId}] Model found:`, model
                ? {
                    id: model.id,
                    name: model.name,
                    enabled: model.enabled ?? true,
                    capabilities: model.capabilities,
                }
                : null);
            if (model && (model.enabled ?? true)) {
                this.log('Using specified virtual model', {
                    method: 'routeRequest',
                    requestId,
                    modelId: model.id,
                });
                await this.recordRequestMetrics(model.id, true);
                // Complete traditional routing tracking
                this.endIOTracking(traditionalOperationId, {
                    routingMethod: 'traditional',
                    result: 'success',
                    selectedModel: model.id,
                    modelConfig: {
                        id: model.id,
                        name: model.name,
                        provider: model.provider,
                        enabled: model.enabled,
                        capabilities: model.capabilities,
                    },
                }, true);
                // Complete main routing tracking
                this.endIOTracking(operationId, {
                    routingMethod: 'specific_model',
                    selectedModel: model.id,
                    routingPath: 'traditional',
                    requestId: requestId,
                }, true);
                console.log(`[${requestId}] === VirtualModelRouter.routeRequest completed (specific model) ===`);
                return model;
            }
            this.warn('Requested virtual model not found or disabled', {
                method: 'routeRequest',
                requestId,
                requestedModel: request.virtualModel,
                availableModels: Array.from(this.virtualModels.keys()),
            });
            // Complete traditional routing tracking with error
            this.endIOTracking(traditionalOperationId, {
                routingMethod: 'traditional',
                result: 'model_not_found_or_disabled',
                requestedModel: request.virtualModel,
                availableModels: Array.from(this.virtualModels.keys()),
            }, false, `Virtual model '${request.virtualModel}' not found or disabled`);
            // Complete main routing tracking with error
            this.endIOTracking(operationId, {
                routingMethod: 'specific_model',
                result: 'model_not_found_or_disabled',
                requestedModel: request.virtualModel,
                requestId: requestId,
            }, false, `Virtual model '${request.virtualModel}' not found or disabled`);
            console.log(`[${requestId}] === VirtualModelRouter.routeRequest failed (model not found or disabled) ===`);
            throw new Error(`Virtual model '${request.virtualModel}' not found or disabled`);
        }
        // Use intelligent routing to determine the best model
        console.log(`[${requestId}] Using intelligent routing to determine best model`);
        // Track intelligent routing attempt
        const intelligentOperationId = `intelligent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
            this.startIOTracking(intelligentOperationId, {
                routingMethod: 'intelligent',
                enabledModels: this.getEnabledModels().map((m) => m.id),
                requestFeatures: this.analyzeRequestFeatures(request),
            }, 'intelligentRouting');
            const decision = await this.makeRoutingDecision(request);
            this.log('Routing decision made', {
                method: 'routeRequest',
                requestId,
                selectedModel: decision.model.id,
                confidence: decision.confidence,
                reason: decision.reason,
            });
            await this.recordRequestMetrics(decision.model.id, true);
            // Complete intelligent routing tracking
            this.endIOTracking(intelligentOperationId, {
                routingMethod: 'intelligent',
                result: 'success',
                selectedModel: decision.model.id,
                confidence: decision.confidence,
                reason: decision.reason,
                alternativeModels: decision.alternativeModels?.map((m) => m.id),
                decisionDetails: {
                    modelConfig: {
                        id: decision.model.id,
                        name: decision.model.name,
                        provider: decision.model.provider,
                        enabled: decision.model.enabled,
                        capabilities: decision.model.capabilities,
                    },
                    confidence: decision.confidence,
                    reasoning: decision.reason,
                },
            }, true);
            // Complete main routing tracking
            this.endIOTracking(operationId, {
                routingMethod: 'intelligent',
                selectedModel: decision.model.id,
                confidence: decision.confidence,
                reason: decision.reason,
                routingPath: 'intelligent',
                requestId: requestId,
                alternativeModels: decision.alternativeModels?.map((m) => m.id),
            }, true);
            console.log(`[${requestId}] === VirtualModelRouter.routeRequest completed (intelligent routing) ===`);
            console.log(`[${requestId}] Selected model: ${decision.model.id} (confidence: ${decision.confidence.toFixed(2)})`);
            return decision.model;
        }
        catch (error) {
            console.error(`[${requestId}] Routing decision failed:`, error);
            // Complete intelligent routing tracking with error
            this.endIOTracking(intelligentOperationId, {
                routingMethod: 'intelligent',
                result: 'routing_decision_failed',
                error: error instanceof Error ? error.message : String(error),
            }, false, error instanceof Error ? error.message : String(error));
            // Complete main routing tracking with error
            this.endIOTracking(operationId, {
                routingMethod: 'intelligent',
                result: 'routing_decision_failed',
                error: error instanceof Error ? error.message : String(error),
                requestId: requestId,
            }, false, error instanceof Error ? error.message : String(error));
            // 智能路由失败时，明确抛出错误而不是使用fallback
            this.error('Intelligent routing failed - no fallback mechanism available', {
                method: 'routeRequest',
                requestId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error(`Virtual model routing failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Register a new virtual model
     */
    async registerModel(model) {
        const registrationOperationId = `register_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.log('Registering virtual model', { method: 'registerModel' });
        // Start I/O tracking for model registration
        this.startIOTracking(registrationOperationId, {
            modelConfig: model,
            schedulerEnabled: this.isSchedulerEnabled,
            existingModels: Array.from(this.virtualModels.keys()),
        }, 'registerModel');
        try {
            // Validate model configuration
            this.validateModelConfig(model);
            // Check if model already exists
            if (this.virtualModels.has(model.id)) {
                const error = new Error(`Virtual model '${model.id}' already exists`);
                this.endIOTracking(registrationOperationId, {
                    result: 'model_exists',
                    error: error.message,
                }, false, error.message);
                throw error;
            }
            // Process targets array if present (convert from configuration format)
            const processedModel = this.processTargets(model);
            // Add model to registry
            this.virtualModels.set(model.id, processedModel);
            // Initialize routing rules
            this.routingRules.set(model.id, processedModel.routingRules || []);
            // Initialize metrics
            this.modelMetrics.set(model.id, {
                modelId: model.id,
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageResponseTime: 0,
                lastUsed: Date.now(),
                uptime: Date.now(),
                errorRate: 0,
                throughput: 0,
            });
            // Register with scheduler if enabled
            let schedulerRegistrationResult = null;
            if (this.isSchedulerEnabled && processedModel.targets && processedModel.targets.length > 0) {
                try {
                    // Create providers map for this virtual model
                    const providers = new Map();
                    // Note: In a real implementation, you would create actual provider instances
                    // For now, we'll register without providers and let them be added later
                    const schedulerId = await this.schedulerManager.registerVirtualModel(processedModel, providers, {
                        metadata: {
                            virtualModelName: processedModel.name,
                            capabilities: processedModel.capabilities,
                            registeredAt: Date.now(),
                        },
                    });
                    schedulerRegistrationResult = {
                        success: true,
                        schedulerId: schedulerId,
                        targetsCount: processedModel.targets?.length || 0,
                    };
                    this.log('Virtual model registered with scheduler successfully', {
                        method: 'registerModel',
                        modelId: model.id,
                        schedulerId,
                        capabilities: processedModel.capabilities,
                        targetsCount: processedModel.targets?.length || 0,
                    });
                }
                catch (error) {
                    schedulerRegistrationResult = {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                    this.warn('Failed to register virtual model with scheduler, continuing without it', {
                        method: 'registerModel',
                        modelId: model.id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
            else {
                this.log('Virtual model registered successfully (scheduler disabled or no targets)', {
                    method: 'registerModel',
                    modelId: model.id,
                    capabilities: processedModel.capabilities,
                    targetsCount: processedModel.targets?.length || 0,
                    schedulerEnabled: this.isSchedulerEnabled,
                });
            }
            // Complete registration tracking successfully
            this.endIOTracking(registrationOperationId, {
                result: 'success',
                modelId: model.id,
                processedConfig: {
                    id: processedModel.id,
                    name: processedModel.name,
                    provider: processedModel.provider,
                    capabilities: processedModel.capabilities,
                    enabled: processedModel.enabled,
                    targetsCount: processedModel.targets?.length || 0,
                },
                schedulerRegistration: schedulerRegistrationResult,
                registryState: {
                    totalModels: this.virtualModels.size,
                    routingRulesCount: this.routingRules.size,
                    metricsCount: this.modelMetrics.size,
                },
            }, true);
        }
        catch (error) {
            // Complete registration tracking with error
            this.endIOTracking(registrationOperationId, {
                result: 'registration_failed',
                modelId: model.id,
                error: error instanceof Error ? error.message : String(error),
            }, false, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    /**
     * Process targets array and convert to model configuration
     */
    processTargets(model) {
        const processedModel = { ...model };
        // 如果有targets数组，从中推断模型能力
        if (model.targets && model.targets.length > 0) {
            // 从目标推断能力
            const inferredCapabilities = this.inferCapabilitiesFromTargets(model.targets);
            if (inferredCapabilities.length > 0) {
                processedModel.capabilities = [
                    ...new Set([...(model.capabilities || []), ...inferredCapabilities]),
                ];
            }
            // 从目标生成模型信息
            const firstTarget = model.targets[0];
            if (firstTarget && !processedModel.model) {
                processedModel.model = firstTarget.modelId;
            }
            // 生成端点URL（如果没有明确指定）
            if (firstTarget && !processedModel.endpoint) {
                processedModel.endpoint = this.generateEndpointFromProvider(firstTarget.providerId);
            }
        }
        return processedModel;
    }
    /**
     * Infer capabilities from targets configuration
     */
    inferCapabilitiesFromTargets(targets) {
        const capabilities = [];
        for (const target of targets) {
            // 基于模型ID推断能力
            const modelId = target.modelId.toLowerCase();
            if (modelId.includes('long') || modelId.includes('context')) {
                capabilities.push('long-context');
            }
            if (modelId.includes('think') || modelId.includes('reason') || modelId.includes('r1')) {
                capabilities.push('thinking');
            }
            if (modelId.includes('code') || modelId.includes('coder')) {
                capabilities.push('coding');
            }
            if (modelId.includes('vision') || modelId.includes('image')) {
                capabilities.push('vision');
            }
            // 基于提供商推断能力
            const providerId = target.providerId.toLowerCase();
            if (providerId.includes('qwen') || providerId.includes('iflow')) {
                capabilities.push('chat', 'streaming', 'tools');
            }
        }
        // 确保有基础能力
        const baseCapabilities = ['chat', 'streaming'];
        return [...new Set([...baseCapabilities, ...capabilities])];
    }
    /**
     * Generate endpoint URL from provider ID
     */
    generateEndpointFromProvider(providerId) {
        // 常见提供商的默认端点
        const providerEndpoints = {
            qwen: 'https://dashscope.aliyuncs.com/api/v1',
            iflow: 'https://apis.iflow.cn/v1',
            openai: 'https://api.openai.com/v1',
            anthropic: 'https://api.anthropic.com/v1',
            lmstudio: 'http://localhost:1234/v1',
        };
        return providerEndpoints[providerId.toLowerCase()] || 'http://localhost:8000/v1';
    }
    /**
     * Unregister a virtual model
     */
    async unregisterModel(modelId) {
        this.log('Unregistering virtual model', { method: 'unregisterModel' });
        if (!this.virtualModels.has(modelId)) {
            throw new Error(`Virtual model '${modelId}' not found`);
        }
        // Remove from registries
        this.virtualModels.delete(modelId);
        this.routingRules.delete(modelId);
        this.modelMetrics.delete(modelId);
        this.log('Virtual model unregistered successfully', { method: 'unregisterModel' });
    }
    /**
     * Update routing rules for a model
     */
    async updateRoutingRules(modelId, rules) {
        this.log('Updating routing rules for model', { method: 'updateRoutingRules' });
        if (!this.virtualModels.has(modelId)) {
            throw new Error(`Virtual model '${modelId}' not found`);
        }
        // Validate rules
        rules.forEach((rule) => this.validateRoutingRule(rule));
        this.routingRules.set(modelId, rules);
        this.log('Routing rules updated for model', { method: 'updateRoutingRules' });
    }
    /**
     * Get model metrics
     */
    async getModelMetrics(modelId) {
        const metrics = this.modelMetrics.get(modelId);
        if (!metrics) {
            throw new Error(`Metrics for model '${modelId}' not found`);
        }
        // Calculate dynamic metrics
        const now = Date.now();
        const uptime = now - metrics.uptime;
        const throughput = metrics.totalRequests / (uptime / 1000); // requests per second
        return {
            ...metrics,
            uptime,
            throughput,
        };
    }
    /**
     * Get all registered models
     */
    getModels() {
        return Array.from(this.virtualModels.values());
    }
    /**
     * Get enabled models only
     */
    getEnabledModels() {
        const enabledModels = Array.from(this.virtualModels.values()).filter((model) => model.enabled ?? true);
        console.log('=== VirtualModelRouter.getEnabledModels called ===');
        console.log('Total models registered:', this.virtualModels.size);
        console.log('Enabled models count:', enabledModels.length);
        console.log('Enabled models details:', enabledModels.map((m) => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            capabilities: m.capabilities,
            enabled: m.enabled,
            targetsCount: m.targets?.length || 0,
        })));
        return enabledModels;
    }
    /**
     * Get model by ID
     */
    getModel(modelId) {
        return this.virtualModels.get(modelId);
    }
    /**
     * Make routing decision based on rules
     */
    async makeRoutingDecision(request) {
        const decisionOperationId = `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('=== makeRoutingDecision called ===');
        const enabledModels = this.getEnabledModels();
        console.log('Enabled models count:', enabledModels.length);
        console.log('Enabled models:', enabledModels.map((m) => m.id));
        // Start I/O tracking for the decision process
        this.startIOTracking(decisionOperationId, {
            enabledModels: enabledModels.map((m) => m.id),
            enabledModelsCount: enabledModels.length,
            request: {
                method: request.method,
                path: request.path,
                virtualModel: request.virtualModel,
            },
        }, 'makeRoutingDecision');
        try {
            if (enabledModels.length === 0) {
                console.log('❌ No enabled virtual models available - throwing error');
                // Complete decision tracking with error
                this.endIOTracking(decisionOperationId, {
                    result: 'no_enabled_models',
                    error: 'No enabled virtual models available',
                }, false, 'No enabled virtual models available');
                throw new Error('No enabled virtual models available');
            }
            // 智能路由：分析请求特征
            const requestFeatures = this.analyzeRequestFeatures(request);
            console.log('Request features:', requestFeatures);
            // Track feature analysis
            const featureOperationId = `features_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.startIOTracking(featureOperationId, {
                requestFeatures: requestFeatures,
            }, 'analyzeRequestFeatures');
            // 基于特征匹配候选模型
            const candidates = await this.intelligentModelSelection(request, enabledModels, requestFeatures);
            console.log('Candidates count:', candidates.length);
            console.log('Candidates:', candidates.map((m) => m.id));
            // Complete feature analysis tracking
            this.endIOTracking(featureOperationId, {
                result: 'success',
                candidatesCount: candidates.length,
                candidates: candidates.map((m) => m.id),
                featureAnalysisComplete: true,
            }, true);
            if (candidates.length === 0) {
                console.log('❌ No suitable virtual models found for this request - using fallback');
                // Fallback: select the first enabled model
                if (enabledModels.length > 0) {
                    const fallbackModel = enabledModels[0];
                    if (fallbackModel) {
                        candidates.push(fallbackModel);
                        console.log(`🔄 Using fallback model: ${fallbackModel.id}`);
                        // Complete decision tracking with fallback info
                        this.endIOTracking(decisionOperationId, {
                            result: 'fallback_used',
                            fallbackModel: fallbackModel.id,
                            requestFeatures: requestFeatures,
                            enabledModels: enabledModels.map((m) => m.id),
                        }, true, 'Used fallback model selection');
                    }
                }
                else {
                    // Complete decision tracking with error
                    this.endIOTracking(decisionOperationId, {
                        result: 'no_suitable_models',
                        requestFeatures: requestFeatures,
                        enabledModels: enabledModels.map((m) => m.id),
                    }, false, 'No suitable virtual models found for this request');
                    throw new Error('No suitable virtual models found for this request');
                }
            }
            // 选择最佳候选模型
            const selected = this.selectBestCandidate(candidates, requestFeatures);
            console.log('Selected model:', selected?.id);
            if (!selected) {
                console.log('❌ No suitable model found - throwing error');
                // Complete decision tracking with error
                this.endIOTracking(decisionOperationId, {
                    result: 'no_model_selected',
                    candidates: candidates.map((m) => m.id),
                    requestFeatures: requestFeatures,
                }, false, 'No suitable model found');
                throw new Error('No suitable model found');
            }
            // Calculate confidence and reason
            const confidence = this.calculateConfidence(selected, request);
            const reason = this.generateRoutingReason(selected, requestFeatures);
            console.log('=== makeRoutingDecision completed ===');
            // Complete decision tracking successfully
            this.endIOTracking(decisionOperationId, {
                result: 'success',
                selectedModel: selected.id,
                confidence: confidence,
                reason: reason,
                requestFeatures: requestFeatures,
                candidatesCount: candidates.length,
                alternativeModelsCount: candidates.filter((m) => m.id !== selected.id).length,
                decisionProcess: {
                    featureAnalysis: 'completed',
                    candidateSelection: 'completed',
                    bestCandidateSelection: 'completed',
                },
            }, true);
            return {
                model: selected,
                confidence: confidence,
                reason: reason,
                alternativeModels: candidates.filter((m) => m.id !== selected.id),
            };
        }
        catch (error) {
            // Complete decision tracking with error
            this.endIOTracking(decisionOperationId, {
                result: 'decision_failed',
                error: error instanceof Error ? error.message : String(error),
            }, false, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    /**
     * Apply routing rules to filter candidate models
     */
    async applyRoutingRules(request, models) {
        const candidates = [];
        for (const model of models) {
            const rules = this.routingRules.get(model.id) || [];
            // Check if model supports required capabilities
            const requiredCapabilities = this.extractRequiredCapabilities(request);
            const hasRequiredCapabilities = requiredCapabilities.every((cap) => model.capabilities.includes(cap));
            if (!hasRequiredCapabilities) {
                this.log('Model lacks required capabilities', { method: 'routeRequest' });
                continue;
            }
            // Apply custom routing rules
            const rulesMatch = await this.evaluateRoutingRules(request, rules);
            if (rulesMatch) {
                candidates.push(model);
            }
        }
        return candidates;
    }
    /**
     * Evaluate routing rules for a request
     */
    async evaluateRoutingRules(request, rules) {
        if (rules.length === 0) {
            return true; // No rules means model is eligible for all requests
        }
        // Sort rules by priority
        const sortedRules = rules
            .filter((rule) => rule.enabled)
            .sort((a, b) => b.priority - a.priority);
        for (const rule of sortedRules) {
            try {
                const matches = await this.evaluateRuleCondition(rule.condition, request);
                if (matches) {
                    this.log('Routing rule matched', { method: 'routeRequest' });
                    return true;
                }
            }
            catch (error) {
                this.warn('Error evaluating routing rule', { method: 'routeRequest' });
                continue;
            }
        }
        return false;
    }
    /**
     * Evaluate a single rule condition
     */
    async evaluateRuleCondition(condition, request) {
        // Simple condition evaluation (can be extended with more complex logic)
        if (condition.startsWith('path:')) {
            const expectedPath = condition.substring(5);
            return request.path === expectedPath;
        }
        if (condition.startsWith('method:')) {
            const expectedMethod = condition.substring(7);
            return request.method === expectedMethod;
        }
        if (condition.startsWith('header:')) {
            const [headerName, expectedValue] = condition.substring(7).split('=');
            const actualValue = request.headers[headerName];
            return actualValue === expectedValue;
        }
        // Add more condition types as needed
        return false;
    }
    /**
     * Analyze request features for intelligent routing
     */
    analyzeRequestFeatures(request) {
        const capabilities = this.extractRequiredCapabilities(request);
        // 计算上下文长度
        const content = JSON.stringify(request.body || {});
        const contextLength = content.length;
        // 计算复杂度
        let complexity = 'simple';
        if (contextLength > 8000) {
            complexity = 'complex';
        }
        else if (contextLength > 2000) {
            complexity = 'medium';
        }
        // 检测优先级
        let priority = 'medium';
        if (request.headers['x-rcc-priority'] === 'high' || request.path.includes('urgent')) {
            priority = 'high';
        }
        else if (request.headers['x-rcc-priority'] === 'low') {
            priority = 'low';
        }
        // 特殊需求
        const specialRequirements = [];
        if (request.headers['x-rcc-preferred-model']) {
            specialRequirements.push('preferred-model:' + request.headers['x-rcc-preferred-model']);
        }
        if (request.headers['x-rcc-exclude-models']) {
            specialRequirements.push('exclude-models:' + request.headers['x-rcc-exclude-models']);
        }
        return {
            capabilities,
            contextLength,
            complexity,
            priority,
            specialRequirements,
        };
    }
    /**
     * Intelligent model selection based on request features
     */
    async intelligentModelSelection(request, models, features) {
        const selectionOperationId = `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Start I/O tracking for the selection process
        this.startIOTracking(selectionOperationId, {
            totalModels: models.length,
            requestFeatures: features,
            selectionCriteria: {
                capabilityMatch: { weight: 40, maxScore: 40 },
                contextLength: { weight: 30, maxScore: 30 },
                complexity: { weight: 20, maxScore: 20 },
                priority: { weight: 10, maxScore: 10 },
                healthScore: { weight: 0.1, maxScore: 10 },
                specialRequirements: { weight: 25, maxScore: 25 },
            },
        }, 'intelligentModelSelection');
        const candidates = [];
        const modelScores = [];
        for (const model of models) {
            let score = 0;
            let reasons = [];
            const detailedScores = {};
            // 能力匹配评分
            const capabilityMatches = features.capabilities.filter((cap) => model.capabilities.includes(cap));
            const capabilityScore = (capabilityMatches.length / features.capabilities.length) * 40;
            detailedScores.capabilityMatch = capabilityScore;
            score += capabilityScore;
            reasons.push(`capability-match: ${capabilityMatches.length}/${features.capabilities.length}`);
            // 上下文长度匹配
            if (features.contextLength > 4000 && model.capabilities.includes('long-context')) {
                const contextScore = 30;
                detailedScores.contextLength = contextScore;
                score += contextScore;
                reasons.push('long-context-support');
            }
            else {
                detailedScores.contextLength = 0;
            }
            // 复杂度匹配
            if (features.complexity === 'complex' && model.capabilities.includes('thinking')) {
                const complexityScore = 20;
                detailedScores.complexity = complexityScore;
                score += complexityScore;
                reasons.push('thinking-mode-support');
            }
            else {
                detailedScores.complexity = 0;
            }
            // 优先级匹配
            if (features.priority === 'high' && model.capabilities.includes('high-performance')) {
                const priorityScore = 10;
                detailedScores.priority = priorityScore;
                score += priorityScore;
                reasons.push('high-performance-support');
            }
            else {
                detailedScores.priority = 0;
            }
            // 模型健康度
            const metrics = this.modelMetrics.get(model.id);
            if (metrics) {
                const healthScore = (1 - metrics.errorRate) * 100;
                const healthContribution = healthScore * 0.1;
                detailedScores.healthScore = healthContribution;
                score += healthContribution;
                reasons.push(`health-score: ${healthScore.toFixed(1)}`);
            }
            else {
                detailedScores.healthScore = 0;
            }
            // 特殊需求检查
            const hasSpecialRequirement = features.specialRequirements.some((req) => {
                if (req.startsWith('preferred-model:') && req.includes(model.id)) {
                    const preferredScore = 25;
                    detailedScores.preferredModel = preferredScore;
                    score += preferredScore;
                    reasons.push('preferred-model');
                    return true;
                }
                if (req.startsWith('exclude-models:') && req.includes(model.id)) {
                    detailedScores.excludedModel = -score; // Zero out score
                    score = 0;
                    reasons.push('excluded-model');
                    return true;
                }
                return false;
            });
            // 只有分数大于0才作为候选，但如果没有候选，则启用所有模型
            if (score > 0 || candidates.length === 0) {
                candidates.push({
                    ...model,
                    routingScore: score,
                });
                // Store detailed scoring information
                modelScores.push({
                    modelId: model.id,
                    score,
                    reasons,
                    detailedScores,
                });
                console.log(`Model ${model.id} scored ${score.toFixed(1)}: ${reasons.join(', ')}`);
            }
        }
        // 按分数排序
        candidates.sort((a, b) => (b.routingScore || 0) - (a.routingScore || 0));
        // 移除排序分数属性
        const finalCandidates = candidates.map((model) => {
            const { routingScore, ...cleanModel } = model;
            return cleanModel;
        });
        // Complete selection tracking
        this.endIOTracking(selectionOperationId, {
            result: 'success',
            totalModels: models.length,
            candidatesCount: finalCandidates.length,
            modelScores: modelScores,
            finalRanking: finalCandidates.map((model, index) => ({
                rank: index + 1,
                modelId: model.id,
                score: modelScores.find((s) => s.modelId === model.id)?.score || 0,
            })),
            selectionThreshold: 0, // Models with score > 0 are included
            selectionComplete: true,
        }, true);
        return finalCandidates;
    }
    /**
     * Select the best candidate from the list
     */
    selectBestCandidate(candidates, features) {
        // 简单策略：选择第一个候选（已按分数排序）
        // 可以根据需要实现更复杂的策略
        const candidate = candidates[0];
        if (!candidate) {
            throw new Error('No candidates available for selection');
        }
        return candidate;
    }
    /**
     * Generate routing reason for logging
     */
    generateRoutingReason(model, features) {
        const reasons = [];
        // 基于能力匹配
        const matches = features.capabilities.filter((cap) => model.capabilities.includes(cap));
        if (matches.length > 0) {
            reasons.push(`matched capabilities: ${matches.join(', ')}`);
        }
        // 基于上下文长度
        if (features.contextLength > 4000 && model.capabilities.includes('long-context')) {
            reasons.push('long context support');
        }
        // 基于复杂度
        if (features.complexity === 'complex' && model.capabilities.includes('thinking')) {
            reasons.push('thinking mode support');
        }
        // 基于优先级
        if (features.priority === 'high' && model.capabilities.includes('high-performance')) {
            reasons.push('high performance support');
        }
        return reasons.length > 0 ? reasons.join(', ') : 'default selection';
    }
    /**
     * Calculate confidence score for model selection
     */
    calculateConfidence(model, request) {
        // Enhanced confidence calculation
        const capabilities = this.extractRequiredCapabilities(request);
        const capabilityMatch = capabilities.filter((cap) => model.capabilities.includes(cap)).length;
        const capabilityScore = capabilities.length > 0 ? capabilityMatch / capabilities.length : 1;
        // Consider model health (error rate)
        const metrics = this.modelMetrics.get(model.id);
        const healthScore = metrics ? 1 - metrics.errorRate : 1;
        // Consider recent performance
        const recentPerformance = metrics
            ? metrics.successfulRequests / Math.max(metrics.totalRequests, 1)
            : 1;
        return capabilityScore * 0.6 + healthScore * 0.25 + recentPerformance * 0.15;
    }
    /**
     * Extract required capabilities from request
     */
    extractRequiredCapabilities(request) {
        const capabilities = [];
        // Basic capability detection based on request characteristics
        // Always add 'chat' capability for POST requests to common API endpoints
        if (request.method === 'POST') {
            capabilities.push('chat');
        }
        // Special handling for common API endpoints
        if (request.path.includes('/v1/messages') || request.path.includes('/v1/chat')) {
            capabilities.push('chat');
        }
        if (request.path.includes('stream')) {
            capabilities.push('streaming');
        }
        if (request.path.includes('function') || request.path.includes('tool')) {
            capabilities.push('tools');
        }
        // 智能检测：根据请求内容推断所需能力
        if (request.body && typeof request.body === 'object') {
            const content = JSON.stringify(request.body).toLowerCase();
            // 检测长上下文需求
            if (content.length > 4000 || content.includes('long') || content.includes('context')) {
                capabilities.push('long-context');
            }
            // 检测思考模式需求
            if (content.includes('think') || content.includes('reason') || content.includes('step')) {
                capabilities.push('thinking');
            }
            // 检测代码生成需求
            if (content.includes('code') || content.includes('program') || content.includes('function')) {
                capabilities.push('coding');
            }
            // 检测多语言需求
            if (content.includes('translate') ||
                content.includes('language') ||
                content.includes('中文')) {
                capabilities.push('multilingual');
            }
        }
        // 检测特殊请求头
        if (request.headers) {
            if (request.headers['x-rcc-capabilities']) {
                const headerCaps = request.headers['x-rcc-capabilities']
                    .split(',')
                    .map((cap) => cap.trim());
                capabilities.push(...headerCaps);
            }
            // 检测用户代理模式
            if (request.headers['user-agent']) {
                const userAgent = request.headers['user-agent'].toLowerCase();
                if (userAgent.includes('claude') || userAgent.includes('ai')) {
                    capabilities.push('ai-assistant');
                }
            }
        }
        // 去重并返回
        const uniqueCapabilities = [...new Set(capabilities)];
        // 确保至少有基础能力
        if (uniqueCapabilities.length === 0) {
            // 对于没有明确能力要求的请求，提供默认能力
            uniqueCapabilities.push('chat');
        }
        return uniqueCapabilities;
    }
    /**
     * Record request metrics
     */
    async recordRequestMetrics(modelId, success) {
        const metrics = this.modelMetrics.get(modelId);
        if (metrics) {
            metrics.totalRequests++;
            metrics.lastUsed = Date.now();
            if (success) {
                metrics.successfulRequests++;
            }
            else {
                metrics.failedRequests++;
            }
            // Update error rate
            metrics.errorRate = metrics.failedRequests / metrics.totalRequests;
            // Update throughput
            const uptime = Date.now() - metrics.uptime;
            metrics.throughput = metrics.totalRequests / (uptime / 1000);
        }
    }
    /**
     * Validate model configuration
     */
    validateModelConfig(model) {
        // 只验证核心字段，使配置更加灵活
        if (!model.id || !model.name || !model.provider) {
            throw new Error('Model configuration missing required fields: id, name, provider');
        }
        // 虚拟模型是路由机制，端点和能力从targets动态生成，不需要警告
        if (!model.endpoint) {
            // 端点将在processTargets中从targets动态生成
            model.endpoint = '';
        }
        if (!model.capabilities || model.capabilities.length === 0) {
            // 能力将在processTargets中从targets动态推断
            model.capabilities = [];
        }
        // 为数值字段提供默认值和验证
        if (typeof model.maxTokens !== 'number' || model.maxTokens < 1) {
            this.warn(`Model ${model.id} invalid maxTokens, using default`, {
                method: 'validateModelConfig',
            });
            model.maxTokens = 4000;
        }
        if (typeof model.temperature !== 'number' || model.temperature < 0 || model.temperature > 2) {
            this.warn(`Model ${model.id} invalid temperature, using default`, {
                method: 'validateModelConfig',
            });
            model.temperature = 0.7;
        }
        if (typeof model.topP !== 'number' || model.topP < 0 || model.topP > 1) {
            this.warn(`Model ${model.id} invalid topP, using default`, { method: 'validateModelConfig' });
            model.topP = 0.9;
        }
        // 确保enabled字段存在
        if (typeof model.enabled !== 'boolean') {
            model.enabled = true;
        }
        // 确保routingRules字段存在
        if (!model.routingRules) {
            model.routingRules = [];
        }
        this.log(`Model ${model.id} validation completed`, { method: 'validateModelConfig' });
    }
    /**
     * Validate routing rule
     */
    validateRoutingRule(rule) {
        if (!rule.id || !rule.name || !rule.condition) {
            throw new Error('Routing rule missing required fields');
        }
        if (rule.weight < 0 || rule.weight > 1) {
            throw new Error('Routing rule weight must be between 0 and 1');
        }
        if (rule.priority < 1 || rule.priority > 10) {
            throw new Error('Routing rule priority must be between 1 and 10');
        }
    }
    /**
     * Get detailed model status for debugging
     */
    getModelStatus() {
        const allModels = Array.from(this.virtualModels.values());
        const enabledModels = allModels.filter((m) => m.enabled);
        const disabledModels = allModels.filter((m) => !m.enabled);
        const modelDetails = allModels.map((model) => {
            const metrics = this.modelMetrics.get(model.id);
            const health = metrics ? (1 - metrics.errorRate) * 100 : 100;
            const result = {
                id: model.id,
                name: model.name,
                enabled: model.enabled ?? true,
                capabilities: model.capabilities,
                health: Math.round(health * 100) / 100,
            };
            // Only add lastUsed if it exists
            if (metrics?.lastUsed) {
                result.lastUsed = metrics.lastUsed;
            }
            return result;
        });
        return {
            totalModels: allModels.length,
            enabledModels: enabledModels.length,
            disabledModels: disabledModels.length,
            modelDetails,
        };
    }
    /**
     * Perform health check on all models
     */
    async performHealthCheck() {
        this.log('Performing health check on all virtual models', { method: 'performHealthCheck' });
        for (const [modelId, model] of this.virtualModels.entries()) {
            const metrics = this.modelMetrics.get(modelId);
            if (!metrics)
                continue;
            // 简单的健康检查逻辑
            const isHealthy = metrics.errorRate < 0.1 && metrics.totalRequests > 0;
            const healthStatus = isHealthy ? 'healthy' : 'unhealthy';
            this.log(`Health check for model ${modelId}: ${healthStatus}`, {
                method: 'performHealthCheck',
                modelId,
                healthStatus,
                errorRate: metrics.errorRate,
                totalRequests: metrics.totalRequests,
            });
            // 如果模型不健康，可以考虑禁用它
            if (!isHealthy && metrics.errorRate > 0.5 && metrics.totalRequests > 10) {
                this.warn(`Disabling model ${modelId} due to high error rate`, {
                    method: 'performHealthCheck',
                    modelId,
                    errorRate: metrics.errorRate,
                });
                model.enabled = false;
            }
        }
        this.log('Health check completed', { method: 'performHealthCheck' });
    }
    /**
     * Cleanup resources
     */
    async destroy() {
        this.log('Cleaning up Virtual Model Router', { method: 'destroy' });
        // Destroy scheduler manager
        if (this.schedulerManager) {
            this.schedulerManager.destroy();
        }
        // Clear collections
        this.virtualModels.clear();
        this.routingRules.clear();
        this.modelMetrics.clear();
        this.providers.clear();
        await super.destroy();
    }
    /**
     * Add provider to scheduler system
     */
    async addProvider(providerId, provider) {
        this.providers.set(providerId, provider);
        this.log('Provider added to scheduler system', {
            method: 'addProvider',
            providerId,
            providerName: provider.getInfo().name,
        });
    }
    /**
     * Remove provider from scheduler system
     */
    async removeProvider(providerId) {
        const removed = this.providers.delete(providerId);
        if (removed) {
            this.log('Provider removed from scheduler system', {
                method: 'removeProvider',
                providerId,
            });
        }
        return removed;
    }
    /**
     * Execute request through scheduler
     */
    async executeWithScheduler(virtualModelId, request, operation = 'chat', options) {
        if (!this.isSchedulerEnabled) {
            throw new Error('Scheduler is not enabled');
        }
        return this.schedulerManager.execute(virtualModelId, request, operation, options);
    }
    /**
     * Execute streaming request through scheduler
     */
    async *executeStreamingWithScheduler(virtualModelId, request, operation = 'streamChat', options) {
        if (!this.isSchedulerEnabled) {
            throw new Error('Scheduler is not enabled');
        }
        for await (const chunk of this.schedulerManager.executeStreaming(virtualModelId, request, operation, options)) {
            yield chunk;
        }
    }
    /**
     * Get scheduler metrics
     */
    getSchedulerMetrics() {
        if (!this.isSchedulerEnabled) {
            return null;
        }
        return this.schedulerManager.getManagerMetrics();
    }
    /**
     * Get scheduler health
     */
    getSchedulerHealth() {
        if (!this.isSchedulerEnabled) {
            return null;
        }
        return this.schedulerManager.getManagerHealth();
    }
    /**
     * Enable/disable scheduler
     */
    setSchedulerEnabled(enabled) {
        this.isSchedulerEnabled = enabled;
        this.log('Scheduler ' + (enabled ? 'enabled' : 'disabled'), {
            method: 'setSchedulerEnabled',
            enabled,
        });
    }
    /**
     * Get virtual model scheduler
     */
    getVirtualModelScheduler(virtualModelId) {
        if (!this.isSchedulerEnabled) {
            return null;
        }
        return this.schedulerManager.getVirtualModelScheduler(virtualModelId);
    }
    /**
     * Get all virtual model mappings
     */
    getVirtualModelMappings() {
        if (!this.isSchedulerEnabled) {
            return [];
        }
        return this.schedulerManager.getVirtualModelMappings();
    }
}
