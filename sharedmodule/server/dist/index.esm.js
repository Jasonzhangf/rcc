import { BaseModule } from 'rcc-basemodule';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { VirtualModelRulesModule } from 'rcc-virtual-model-rules';
import { PipelineScheduler } from 'rcc-pipeline';

// HTTP Server component for RCC Server Module
class HttpServerComponent extends BaseModule {
    constructor() {
        const moduleInfo = {
            id: 'HttpServer',
            name: 'HTTP Server Component',
            version: '1.0.0',
            description: 'HTTP server component for RCC Server Module',
            type: 'component',
            capabilities: ['http-server', 'middleware', 'security'],
            dependencies: ['express', 'cors', 'helmet'],
            config: {},
            metadata: {
                author: 'RCC Development Team',
                license: 'MIT'
            }
        };
        super(moduleInfo);
        this.server = null;
        this.config = null;
        this.isRunning = false;
        this.app = express();
    }
    /**
     * Initialize the HTTP server with configuration
     */
    configure(config) {
        super.configure(config);
        this.config = config;
    }
    async initialize() {
        this.log('Initializing HTTP server component');
        if (!this.config) {
            throw new Error('HTTP server not configured');
        }
        // Apply security middleware
        if (this.config.helmet) {
            this.app.use(helmet());
        }
        // Enable CORS
        this.app.use(cors(this.config.cors));
        // Enable compression
        if (this.config.compression) {
            this.app.use(compression());
        }
        // Parse request bodies
        this.app.use(bodyParser.json({ limit: this.config.bodyLimit }));
        this.app.use(bodyParser.urlencoded({ extended: true, limit: this.config.bodyLimit }));
        // Add request logging middleware
        this.app.use(this.requestLogger.bind(this));
        // Add error handling middleware
        this.app.use(this.errorHandler.bind(this));
        // Add health check endpoint
        this.app.get('/health', this.healthCheck.bind(this));
        // Add metrics endpoint
        this.app.get('/metrics', this.getMetrics.bind(this));
        this.log('HTTP server component initialized successfully', { method: 'initialize' });
    }
    /**
     * Start the HTTP server
     */
    async listen(port, host = 'localhost') {
        if (this.isRunning) {
            this.warn('HTTP server is already running', { method: 'listen' });
            return;
        }
        return new Promise((resolve, reject) => {
            this.server = createServer(this.app);
            this.server.listen(port, host, () => {
                this.isRunning = true;
                this.log(`HTTP server listening on ${host}:${port}`, { method: 'listen' });
                resolve();
            });
            this.server.on('error', (error) => {
                this.error('HTTP server error', { method: 'listen' });
                reject(error);
            });
            this.server.on('connection', (socket) => {
                this.log(`New connection established from ${socket.remoteAddress}`, { method: 'listen' });
                socket.on('close', () => {
                    this.log(`Connection closed from ${socket.remoteAddress}`, { method: 'listen' });
                });
                socket.on('error', () => {
                    this.warn('Connection error', { method: 'listen' });
                });
            });
        });
    }
    /**
     * Stop the HTTP server
     */
    async close() {
        if (!this.isRunning || !this.server) {
            this.warn('HTTP server is not running', { method: 'close' });
            return;
        }
        return new Promise((resolve) => {
            this.server.close(() => {
                this.isRunning = false;
                this.server = null;
                this.log('HTTP server stopped', { method: 'close' });
                resolve();
            });
        });
    }
    /**
     * Add event listener
     */
    on(event, callback) {
        if (this.server) {
            this.server.on(event, callback);
        }
    }
    /**
     * Remove event listener
     */
    off(event, callback) {
        if (this.server) {
            this.server.off(event, callback);
        }
    }
    /**
     * Get active connections count
     */
    getConnections(callback) {
        if (this.server) {
            this.server.getConnections(callback);
        }
        else {
            callback(new Error('Server not running'), 0);
        }
    }
    /**
     * Get the Express application instance
     */
    getApp() {
        return this.app;
    }
    /**
     * Check if server is running
     */
    isServerRunning() {
        return this.isRunning;
    }
    /**
     * Request logging middleware
     */
    requestLogger(req, res, next) {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            const status = res.statusCode;
            const method = req.method;
            const url = req.originalUrl;
            const userAgent = req.get('User-Agent') || 'Unknown';
            const ip = req.ip || req.connection.remoteAddress || 'Unknown';
            this.log(`${method} ${url} - ${status} - ${duration}ms - ${ip} - ${userAgent}`, { method: 'requestLogger' });
        });
        next();
    }
    /**
     * Error handling middleware
     */
    errorHandler(error, req, res, next) {
        this.error('Request error', { method: 'errorHandler' });
        const status = error.status || 500;
        const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message;
        res.status(status).json({
            error: {
                message,
                status,
                timestamp: Date.now(),
                requestId: req.requestId
            }
        });
    }
    /**
     * Health check endpoint
     */
    healthCheck(_req, res) {
        const health = {
            status: this.isRunning ? 'healthy' : 'unhealthy',
            timestamp: Date.now(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || 'unknown',
            node: process.version,
            memory: process.memoryUsage(),
            connections: 0
        };
        if (this.server) {
            this.getConnections((_err, count) => {
                health.connections = count;
                res.status(health.status === 'healthy' ? 200 : 503).json(health);
            });
        }
        else {
            res.status(health.status === 'healthy' ? 200 : 503).json(health);
        }
    }
    /**
     * Get server metrics
     */
    getMetrics(_req, res) {
        const metrics = {
            timestamp: Date.now(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            isRunning: this.isRunning,
            connections: 0
        };
        if (this.server) {
            this.getConnections((_err, count) => {
                metrics.connections = count;
                res.json(metrics);
            });
        }
        else {
            res.json(metrics);
        }
    }
    /**
     * Convert Express request to ClientRequest
     */
    expressToClientRequest(req) {
        return {
            id: this.generateRequestId(),
            method: req.method,
            path: req.path,
            headers: this.sanitizeHeaders(req.headers),
            body: req.body,
            query: req.query,
            timestamp: Date.now(),
            clientId: req.get('X-Client-ID') || undefined,
            virtualModel: req.get('X-Virtual-Model') || undefined
        };
    }
    /**
     * Convert ClientResponse to Express response
     */
    clientResponseToExpress(response, res) {
        res.status(response.status);
        // Set headers
        Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
        // Set default headers if not present
        if (!response.headers['Content-Type']) {
            res.setHeader('Content-Type', 'application/json');
        }
        if (!response.headers['X-Request-ID']) {
            res.setHeader('X-Request-ID', response.id);
        }
        if (!response.headers['X-Processing-Time']) {
            res.setHeader('X-Processing-Time', response.processingTime.toString());
        }
        // Send response
        if (response.body !== undefined) {
            res.json(response.body);
        }
        else {
            res.end();
        }
    }
    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Sanitize headers for logging
     */
    sanitizeHeaders(headers) {
        const sanitized = {};
        const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
        Object.keys(headers).forEach(key => {
            if (sensitiveHeaders.includes(key.toLowerCase())) {
                sanitized[key] = '[REDACTED]';
            }
            else {
                sanitized[key] = headers[key];
            }
        });
        return sanitized;
    }
    /**
     * Cleanup resources
     */
    async destroy() {
        this.log('Cleaning up HTTP server component', { method: 'destroy' });
        if (this.server) {
            await this.close();
        }
        this.app = express();
        this.config = null;
        super.destroy();
    }
}

// Virtual Model Router component for RCC Server Module
class VirtualModelRouter extends BaseModule {
    constructor() {
        const moduleInfo = {
            id: 'VirtualModelRouter',
            name: 'Virtual Model Router',
            version: '1.0.0',
            description: 'Virtual model routing with rule evaluation',
            type: 'component',
            capabilities: ['virtual-model-routing', 'rule-evaluation'],
            dependencies: ['rcc-basemodule'],
            config: {},
            metadata: {
                author: 'RCC Development Team',
                license: 'MIT'
            }
        };
        super(moduleInfo);
        this.virtualModels = new Map();
        this.routingRules = new Map();
        this.modelMetrics = new Map();
    }
    /**
     * Route a request to the appropriate virtual model
     */
    async routeRequest(request) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('=== VirtualModelRouter.routeRequest called ===');
        console.log(`[${requestId}] Request details:`, {
            method: request.method,
            path: request.path,
            virtualModel: request.virtualModel,
            headers: request.headers,
            bodyLength: request.body ? JSON.stringify(request.body).length : 0
        });
        console.log(`[${requestId}] Available virtual models:`, Array.from(this.virtualModels.keys()));
        console.log(`[${requestId}] Enabled virtual models:`, this.getEnabledModels().map(m => m.id));
        this.log('Routing request', {
            method: 'routeRequest',
            requestId,
            path: request.path,
            virtualModel: request.virtualModel
        });
        // If specific virtual model is requested, use it
        if (request.virtualModel) {
            console.log(`[${requestId}] Specific virtual model requested:`, request.virtualModel);
            const model = this.virtualModels.get(request.virtualModel);
            console.log(`[${requestId}] Model found:`, model ? {
                id: model.id,
                name: model.name,
                enabled: model.enabled ?? true,
                capabilities: model.capabilities
            } : null);
            if (model && (model.enabled ?? true)) {
                this.log('Using specified virtual model', {
                    method: 'routeRequest',
                    requestId,
                    modelId: model.id
                });
                await this.recordRequestMetrics(model.id, true);
                console.log(`[${requestId}] === VirtualModelRouter.routeRequest completed (specific model) ===`);
                return model;
            }
            this.warn('Requested virtual model not found or disabled', {
                method: 'routeRequest',
                requestId,
                requestedModel: request.virtualModel,
                availableModels: Array.from(this.virtualModels.keys())
            });
            console.log(`[${requestId}] === VirtualModelRouter.routeRequest failed (model not found or disabled) ===`);
            throw new Error(`Virtual model '${request.virtualModel}' not found or disabled`);
        }
        // Use intelligent routing to determine the best model
        console.log(`[${requestId}] Using intelligent routing to determine best model`);
        try {
            const decision = await this.makeRoutingDecision(request);
            this.log('Routing decision made', {
                method: 'routeRequest',
                requestId,
                selectedModel: decision.model.id,
                confidence: decision.confidence,
                reason: decision.reason
            });
            await this.recordRequestMetrics(decision.model.id, true);
            console.log(`[${requestId}] === VirtualModelRouter.routeRequest completed (intelligent routing) ===`);
            console.log(`[${requestId}] Selected model: ${decision.model.id} (confidence: ${decision.confidence.toFixed(2)})`);
            return decision.model;
        }
        catch (error) {
            console.error(`[${requestId}] Routing decision failed:`, error);
            // 如果智能路由失败，尝试使用第一个可用的模型作为后备
            const enabledModels = this.getEnabledModels();
            if (enabledModels.length > 0) {
                const fallbackModel = enabledModels[0];
                if (!fallbackModel) {
                    throw error;
                }
                console.log(`[${requestId}] Using fallback model: ${fallbackModel.id}`);
                this.warn('Using fallback model due to routing failure', {
                    method: 'routeRequest',
                    requestId,
                    fallbackModel: fallbackModel.id,
                    error: error instanceof Error ? error.message : String(error)
                });
                await this.recordRequestMetrics(fallbackModel.id, true);
                return fallbackModel;
            }
            throw error;
        }
    }
    /**
     * Register a new virtual model
     */
    async registerModel(model) {
        this.log('Registering virtual model', { method: 'registerModel' });
        // Validate model configuration
        this.validateModelConfig(model);
        // Check if model already exists
        if (this.virtualModels.has(model.id)) {
            throw new Error(`Virtual model '${model.id}' already exists`);
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
            throughput: 0
        });
        this.log('Virtual model registered successfully', {
            method: 'registerModel',
            modelId: model.id,
            capabilities: processedModel.capabilities,
            targetsCount: processedModel.targets?.length || 0
        });
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
                processedModel.capabilities = [...new Set([...(model.capabilities || []), ...inferredCapabilities])];
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
            'qwen': 'https://dashscope.aliyuncs.com/api/v1',
            'iflow': 'https://apis.iflow.cn/v1',
            'openai': 'https://api.openai.com/v1',
            'anthropic': 'https://api.anthropic.com/v1',
            'lmstudio': 'http://localhost:1234/v1'
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
        rules.forEach(rule => this.validateRoutingRule(rule));
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
            throughput
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
        const enabledModels = Array.from(this.virtualModels.values()).filter(model => model.enabled ?? true);
        console.log('=== VirtualModelRouter.getEnabledModels called ===');
        console.log('Total models registered:', this.virtualModels.size);
        console.log('Enabled models count:', enabledModels.length);
        console.log('Enabled models details:', enabledModels.map(m => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            capabilities: m.capabilities,
            enabled: m.enabled,
            targetsCount: m.targets?.length || 0
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
        console.log('=== makeRoutingDecision called ===');
        const enabledModels = this.getEnabledModels();
        console.log('Enabled models count:', enabledModels.length);
        console.log('Enabled models:', enabledModels.map(m => m.id));
        if (enabledModels.length === 0) {
            console.log('❌ No enabled virtual models available - throwing error');
            throw new Error('No enabled virtual models available');
        }
        // 智能路由：分析请求特征
        const requestFeatures = this.analyzeRequestFeatures(request);
        console.log('Request features:', requestFeatures);
        // 基于特征匹配候选模型
        const candidates = await this.intelligentModelSelection(request, enabledModels, requestFeatures);
        console.log('Candidates count:', candidates.length);
        console.log('Candidates:', candidates.map(m => m.id));
        if (candidates.length === 0) {
            console.log('❌ No suitable virtual models found for this request - throwing error');
            throw new Error('No suitable virtual models found for this request');
        }
        // 选择最佳候选模型
        const selected = this.selectBestCandidate(candidates, requestFeatures);
        console.log('Selected model:', selected?.id);
        if (!selected) {
            console.log('❌ No suitable model found - throwing error');
            throw new Error('No suitable model found');
        }
        console.log('=== makeRoutingDecision completed ===');
        return {
            model: selected,
            confidence: this.calculateConfidence(selected, request),
            reason: this.generateRoutingReason(selected, requestFeatures),
            alternativeModels: candidates.filter(m => m.id !== selected.id)
        };
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
            const hasRequiredCapabilities = requiredCapabilities.every(cap => model.capabilities.includes(cap));
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
            .filter(rule => rule.enabled)
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
            specialRequirements
        };
    }
    /**
     * Intelligent model selection based on request features
     */
    async intelligentModelSelection(request, models, features) {
        const candidates = [];
        for (const model of models) {
            let score = 0;
            let reasons = [];
            // 能力匹配评分
            const capabilityMatches = features.capabilities.filter(cap => model.capabilities.includes(cap));
            score += (capabilityMatches.length / features.capabilities.length) * 40;
            reasons.push(`capability-match: ${capabilityMatches.length}/${features.capabilities.length}`);
            // 上下文长度匹配
            if (features.contextLength > 4000 && model.capabilities.includes('long-context')) {
                score += 30;
                reasons.push('long-context-support');
            }
            // 复杂度匹配
            if (features.complexity === 'complex' && model.capabilities.includes('thinking')) {
                score += 20;
                reasons.push('thinking-mode-support');
            }
            // 优先级匹配
            if (features.priority === 'high' && model.capabilities.includes('high-performance')) {
                score += 10;
                reasons.push('high-performance-support');
            }
            // 模型健康度
            const metrics = this.modelMetrics.get(model.id);
            if (metrics) {
                const healthScore = (1 - metrics.errorRate) * 100;
                score += healthScore * 0.1;
                reasons.push(`health-score: ${healthScore.toFixed(1)}`);
            }
            // 特殊需求检查
            features.specialRequirements.some(req => {
                if (req.startsWith('preferred-model:') && req.includes(model.id)) {
                    score += 25;
                    reasons.push('preferred-model');
                    return true;
                }
                if (req.startsWith('exclude-models:') && req.includes(model.id)) {
                    score = 0;
                    reasons.push('excluded-model');
                    return true;
                }
                return false;
            });
            // 只有分数大于0才作为候选
            if (score > 0) {
                candidates.push({
                    ...model,
                    // 临时存储分数用于后续排序
                    routingScore: score
                });
                console.log(`Model ${model.id} scored ${score.toFixed(1)}: ${reasons.join(', ')}`);
            }
        }
        // 按分数排序
        candidates.sort((a, b) => (b.routingScore || 0) - (a.routingScore || 0));
        // 移除临时分数属性
        return candidates.map(model => {
            const { routingScore, ...cleanModel } = model;
            return cleanModel;
        });
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
        const capabilityMatch = capabilities.filter(cap => model.capabilities.includes(cap)).length;
        const capabilityScore = capabilities.length > 0 ? capabilityMatch / capabilities.length : 1;
        // Consider model health (error rate)
        const metrics = this.modelMetrics.get(model.id);
        const healthScore = metrics ? (1 - metrics.errorRate) : 1;
        // Consider recent performance
        const recentPerformance = metrics ?
            (metrics.successfulRequests / Math.max(metrics.totalRequests, 1)) : 1;
        return (capabilityScore * 0.6 + healthScore * 0.25 + recentPerformance * 0.15);
    }
    /**
     * Extract required capabilities from request
     */
    extractRequiredCapabilities(request) {
        const capabilities = [];
        // Basic capability detection based on request characteristics
        if (request.method === 'POST' && request.body) {
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
            if (content.includes('translate') || content.includes('language') || content.includes('中文')) {
                capabilities.push('multilingual');
            }
        }
        // 检测特殊请求头
        if (request.headers) {
            if (request.headers['x-rcc-capabilities']) {
                const headerCaps = request.headers['x-rcc-capabilities'].split(',').map((cap) => cap.trim());
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
        return [...new Set(capabilities)];
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
        // 为可选字段提供默认值
        if (!model.endpoint) {
            this.warn(`Model ${model.id} missing endpoint, using default`, { method: 'validateModelConfig' });
            model.endpoint = 'http://localhost:8000/v1';
        }
        if (!model.capabilities || model.capabilities.length === 0) {
            this.warn(`Model ${model.id} missing capabilities, using defaults`, { method: 'validateModelConfig' });
            model.capabilities = ['chat', 'streaming', 'tools'];
        }
        // 为数值字段提供默认值和验证
        if (typeof model.maxTokens !== 'number' || model.maxTokens < 1) {
            this.warn(`Model ${model.id} invalid maxTokens, using default`, { method: 'validateModelConfig' });
            model.maxTokens = 4000;
        }
        if (typeof model.temperature !== 'number' || model.temperature < 0 || model.temperature > 2) {
            this.warn(`Model ${model.id} invalid temperature, using default`, { method: 'validateModelConfig' });
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
        const enabledModels = allModels.filter(m => m.enabled);
        const disabledModels = allModels.filter(m => !m.enabled);
        const modelDetails = allModels.map(model => {
            const metrics = this.modelMetrics.get(model.id);
            const health = metrics ? (1 - metrics.errorRate) * 100 : 100;
            const result = {
                id: model.id,
                name: model.name,
                enabled: model.enabled ?? true,
                capabilities: model.capabilities,
                health: Math.round(health * 100) / 100
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
            modelDetails
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
                totalRequests: metrics.totalRequests
            });
            // 如果模型不健康，可以考虑禁用它
            if (!isHealthy && metrics.errorRate > 0.5 && metrics.totalRequests > 10) {
                this.warn(`Disabling model ${modelId} due to high error rate`, {
                    method: 'performHealthCheck',
                    modelId,
                    errorRate: metrics.errorRate
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
        this.virtualModels.clear();
        this.routingRules.clear();
        this.modelMetrics.clear();
        await super.destroy();
    }
}

// Main Server Module for RCC
class ServerModule extends BaseModule {
    constructor() {
        const moduleInfo = {
            id: 'ServerModule',
            name: 'RCC Server Module',
            version: '1.0.0',
            description: 'HTTP server with virtual model routing and rule evaluation for RCC framework',
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
        this.underConstruction = null;
        this.config = null;
        this.isInitialized = false;
        this.isRunning = false;
        this.messageHandlers = new Map();
        // Pipeline Scheduler Integration
        this.pipelineScheduler = null;
        // Virtual Model Rules Integration
        this.virtualModelRulesModule = null;
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
        this.config = config;
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
        this.log('ServerModule.configure called', { hasParsedConfig: !!config.parsedConfig, configKeys: Object.keys(config) });
        // Load virtual models from parsed configuration if available
        console.log('=== Checking condition for loading virtual models ===');
        console.log('config.parsedConfig exists:', !!config.parsedConfig);
        console.log('config.parsedConfig.virtualModels exists:', !!(config.parsedConfig && config.parsedConfig.virtualModels));
        console.log('Full config object keys:', Object.keys(config));
        if (config.parsedConfig && config.parsedConfig.virtualModels) {
            this.log('Loading virtual models from parsedConfig', {
                virtualModelsCount: Object.keys(config.parsedConfig.virtualModels).length,
                virtualModelsKeys: Object.keys(config.parsedConfig.virtualModels)
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
                parsedConfigKeys: config.parsedConfig ? Object.keys(config.parsedConfig) : 'null'
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
            // Initialize Pipeline Scheduler
            await this.initializePipelineScheduler();
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
            this.sendMessage('server-initialized', { config: this.config || {} });
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
        try {
            // Start HTTP server
            await this.httpServer.listen(this.config.port, this.config.host);
            this.isRunning = true;
            this.startTime = Date.now();
            this.logInfo(`Server started on ${this.config.host}:${this.config.port}`);
            // Notify server started
            this.sendMessage('server-started', {
                host: this.config?.host || '',
                port: this.config?.port || 0,
                startTime: this.startTime
            });
        }
        catch (error) {
            this.error('Failed to start Server Module', { method: 'start' });
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
                totalRequests: this.requestMetrics.length
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
     * Handle client request
     */
    async handleRequest(request) {
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
                const typedVmConfig = vmConfig;
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
                                routingRules: [] // No custom routing rules by default
                            };
                            console.log(`Virtual model config for ${modelId}:`, virtualModelConfig);
                            // Register the virtual model synchronously
                            await this.virtualModelRouter.registerModel(virtualModelConfig);
                            this.logInfo(`Virtual model registered successfully: ${modelId}`, {
                                modelId: modelId,
                                provider: virtualModelConfig.provider,
                                model: virtualModelConfig.model
                            });
                            console.log(`✅ Virtual model registered successfully: ${modelId}`);
                        }
                        else {
                            this.warn(`No targets found for virtual model: ${modelId}`, {
                                vmConfigTargets: typedVmConfig.targets,
                                targetsLength: typedVmConfig.targets ? typedVmConfig.targets.length : 0
                            });
                            console.log(`⚠️ No targets found for virtual model: ${modelId}`);
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
                totalModelsProcessed: virtualModelsKeys.length
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
        // Check virtual model rules integration
        checks['virtual_model_rules_integration'] = this.virtualModelRulesModule !== null;
        // Check unified error handling
        checks['unified_error_handling'] = this.pipelineIntegrationConfig.unifiedErrorHandling || false;
        // Check unified monitoring
        checks['unified_monitoring'] = this.pipelineIntegrationConfig.unifiedMonitoring || false;
        // Determine overall status
        let status = 'healthy';
        const failedChecks = Object.values(checks).filter(check => !check).length;
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
            underConstructionModule: underConstructionHealth,
            errorHandling: this.pipelineIntegrationConfig.unifiedErrorHandling || false,
            monitoring: this.pipelineIntegrationConfig.unifiedMonitoring || false
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
        if (!this.config) {
            throw new Error('Server not configured');
        }
        return { ...this.config };
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
     * Initialize Pipeline Scheduler
     */
    async initializePipelineScheduler() {
        this.log('Initializing Pipeline Scheduler');
        try {
            // Initialize Pipeline Scheduler
            this.pipelineScheduler = new PipelineScheduler();
            await this.pipelineScheduler.initialize();
            this.logInfo('Pipeline Scheduler initialized successfully');
        }
        catch (error) {
            this.error('Failed to initialize Pipeline Scheduler');
            // Don't throw error - allow server to start without pipeline scheduler
            this.warn('Pipeline Scheduler initialization failed, continuing without it');
        }
    }
    /**
     * Initialize Virtual Model Rules Integration
     */
    async initializeVirtualModelRulesIntegration() {
        this.log('Initializing Virtual Model Rules Integration');
        try {
            // Initialize Virtual Model Rules Module
            this.virtualModelRulesModule = new VirtualModelRulesModule();
            await this.virtualModelRulesModule.initialize();
            this.logInfo('Virtual Model Rules Integration initialized successfully');
        }
        catch (error) {
            this.error('Failed to initialize Virtual Model Rules Integration');
            // Don't throw error - allow server to start without virtual model rules integration
            this.warn('Virtual Model Rules Integration failed, continuing without it');
        }
    }
    /**
     * Get Virtual Model Configuration
     */
    async _getVirtualModelConfig(virtualModelId) {
        // Check if pipeline scheduler is available
        if (this.pipelineScheduler) {
            try {
                // Get pipeline configuration for the virtual model
                const pipelineConfig = await this.pipelineScheduler.getPipelineConfig(virtualModelId);
                return {
                    id: virtualModelId,
                    name: virtualModelId,
                    provider: pipelineConfig?.provider || 'default',
                    endpoint: pipelineConfig?.endpoint || '',
                    model: pipelineConfig?.model || virtualModelId,
                    capabilities: pipelineConfig?.capabilities || [],
                    enabled: pipelineConfig?.enabled !== undefined ? pipelineConfig.enabled : true,
                    priority: pipelineConfig?.priority || 'medium',
                    config: pipelineConfig
                };
            }
            catch (error) {
                this.warn(`Failed to get pipeline config for virtual model ${virtualModelId}, using default`);
            }
        }
        // Mark as under construction feature if pipeline scheduler is not available
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
    async processVirtualModelRequest(request, model) {
        this.log('Processing request with virtual model');
        // Check if pipeline scheduler is available
        if (this.pipelineScheduler) {
            try {
                // Process request through pipeline scheduler
                const executionContext = {
                    requestId: request.id,
                    method: request.method,
                    path: request.path,
                    headers: request.headers,
                    body: request.body,
                    query: request.query,
                    timestamp: request.timestamp,
                    clientId: request.clientId,
                    virtualModelId: model.id,
                    metadata: {
                        source: 'server-module'
                    }
                };
                const executionResult = await this.pipelineScheduler.executePipeline(model.id, executionContext);
                // Convert execution result to client response
                return {
                    id: request.id,
                    status: executionResult.error ? 500 : 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Virtual-Model': model.id,
                        'X-Provider': model.provider,
                        'X-Processing-Method': 'pipeline',
                        'X-Pipeline-Execution-Id': executionResult.executionId || 'unknown',
                        'X-Integration-Status': 'rcc-v4-unified'
                    },
                    body: executionResult.result || executionResult.error || { message: 'Request processed successfully' },
                    timestamp: Date.now(),
                    processingTime: executionResult.duration || 0,
                    requestId: request.id
                };
            }
            catch (error) {
                this.error('Pipeline processing failed', {
                    modelId: model.id,
                    error: error instanceof Error ? error.message : String(error),
                    method: 'processVirtualModelRequest'
                });
                // Pipeline processing failed - throw error to indicate system issue
                throw new Error(`Pipeline processing failed for model ${model.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        // Pipeline scheduler not available - throw error to indicate system issue
        throw new Error('Pipeline scheduler not available - system configuration issue');
    }
    /**
     * Process request via Pipeline Scheduler
     */
    async _processViaPipelineScheduler(request, model) {
        this.log('Processing via Pipeline Scheduler');
        if (!this.pipelineScheduler) {
            throw new Error('Pipeline Scheduler not available');
        }
        try {
            // Process request through pipeline scheduler
            const executionContext = {
                requestId: request.id,
                method: request.method,
                path: request.path,
                headers: request.headers,
                body: request.body,
                query: request.query,
                timestamp: request.timestamp,
                clientId: request.clientId,
                virtualModelId: model.id,
                metadata: {
                    source: 'server-module-internal'
                }
            };
            const executionResult = await this.pipelineScheduler.executePipeline(model.id, executionContext);
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
                    message: 'Request processed via Pipeline Scheduler',
                    model: model.id,
                    provider: model.provider,
                    processingMethod: 'pipeline-scheduler',
                    originalRequest: {
                        method: request.method,
                        path: request.path,
                        timestamp: request.timestamp
                    },
                    executionResult: executionResult,
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
        }
        catch (error) {
            this.error('Pipeline Scheduler processing failed', {
                modelId: model.id,
                error: error instanceof Error ? error.message : String(error),
                method: 'processViaPipelineScheduler'
            });
            // Re-throw to trigger fallback mechanism
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
                config: this.pipelineIntegrationConfig
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
        const statusMap = {
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
    setupRequestHandling() {
        const app = this.httpServer.getApp();
        // Add default route for all requests
        app.all('*', async (req, res, next) => {
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
            }
            catch (error) {
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
                    message: process.env.NODE_ENV === 'development' ? errorMessage : 'An unexpected error occurred'
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
            this.requestMetrics = this.requestMetrics.slice(-1e3);
        }
    }
    /**
     * Calculate error rate
     */
    calculateErrorRate() {
        if (this.requestMetrics.length === 0) {
            return 0;
        }
        const errors = this.requestMetrics.filter(m => m.status >= 400).length;
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
        }
        catch (error) {
            this.error('Error during unified cleanup', { method: 'destroy' });
            throw error;
        }
    }
}

export { HttpServerComponent, ServerModule, VirtualModelRouter, ServerModule as default };
//# sourceMappingURL=index.esm.js.map
