// Virtual Model Router component for RCC Server Module

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { IVirtualModelRouter } from '../interfaces/IServerModule';
import { VirtualModelConfig, ClientRequest, RoutingRule } from '../types/ServerTypes';

export interface RoutingDecision {
  model: VirtualModelConfig;
  confidence: number;
  reason: string;
  alternativeModels?: VirtualModelConfig[];
}

export interface ModelMetrics {
  modelId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastUsed: number;
  uptime: number;
  errorRate: number;
  throughput: number;
}

export class VirtualModelRouter extends BaseModule implements IVirtualModelRouter {
  private virtualModels: Map<string, VirtualModelConfig> = new Map();
  private routingRules: Map<string, RoutingRule[]> = new Map();
  private modelMetrics: Map<string, ModelMetrics> = new Map();

  constructor() {
    const moduleInfo: ModuleInfo = {
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
  }

  /**
   * Route a request to the appropriate virtual model
   */
  public async routeRequest(request: ClientRequest): Promise<VirtualModelConfig> {
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
    } catch (error) {
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
  public async registerModel(model: VirtualModelConfig): Promise<void> {
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
  private processTargets(model: VirtualModelConfig): VirtualModelConfig {
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
  private inferCapabilitiesFromTargets(targets: any[]): string[] {
    const capabilities: string[] = [];

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
  private generateEndpointFromProvider(providerId: string): string {
    // 常见提供商的默认端点
    const providerEndpoints: Record<string, string> = {
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
  public async unregisterModel(modelId: string): Promise<void> {
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
  public async updateRoutingRules(modelId: string, rules: RoutingRule[]): Promise<void> {
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
  public async getModelMetrics(modelId: string): Promise<ModelMetrics> {
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
  public getModels(): VirtualModelConfig[] {
    return Array.from(this.virtualModels.values());
  }

  /**
   * Get enabled models only
   */
  public getEnabledModels(): VirtualModelConfig[] {
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
  public getModel(modelId: string): VirtualModelConfig | undefined {
    return this.virtualModels.get(modelId);
  }

  
  /**
   * Make routing decision based on rules
   */
  private async makeRoutingDecision(request: ClientRequest): Promise<RoutingDecision> {
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
  private async applyRoutingRules(request: ClientRequest, models: VirtualModelConfig[]): Promise<VirtualModelConfig[]> {
    const candidates: VirtualModelConfig[] = [];
    
    for (const model of models) {
      const rules = this.routingRules.get(model.id) || [];
      
      // Check if model supports required capabilities
      const requiredCapabilities = this.extractRequiredCapabilities(request);
      const hasRequiredCapabilities = requiredCapabilities.every(cap => 
        model.capabilities.includes(cap)
      );
      
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
  private async evaluateRoutingRules(request: ClientRequest, rules: RoutingRule[]): Promise<boolean> {
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
      } catch (error) {
        this.warn('Error evaluating routing rule', { method: 'routeRequest' });
        continue;
      }
    }
    
    return false;
  }

  /**
   * Evaluate a single rule condition
   */
  private async evaluateRuleCondition(condition: string, request: ClientRequest): Promise<boolean> {
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
      const actualValue = request.headers[headerName as keyof typeof request.headers];
      return actualValue === expectedValue;
    }
    
    // Add more condition types as needed
    return false;
  }

  
  /**
   * Analyze request features for intelligent routing
   */
  private analyzeRequestFeatures(request: ClientRequest): {
    capabilities: string[];
    contextLength: number;
    complexity: 'simple' | 'medium' | 'complex';
    priority: 'low' | 'medium' | 'high';
    specialRequirements: string[];
  } {
    const capabilities = this.extractRequiredCapabilities(request);

    // 计算上下文长度
    const content = JSON.stringify(request.body || {});
    const contextLength = content.length;

    // 计算复杂度
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (contextLength > 8000) {
      complexity = 'complex';
    } else if (contextLength > 2000) {
      complexity = 'medium';
    }

    // 检测优先级
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (request.headers['x-rcc-priority'] === 'high' || request.path.includes('urgent')) {
      priority = 'high';
    } else if (request.headers['x-rcc-priority'] === 'low') {
      priority = 'low';
    }

    // 特殊需求
    const specialRequirements: string[] = [];
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
  private async intelligentModelSelection(
    request: ClientRequest,
    models: VirtualModelConfig[],
    features: ReturnType<typeof this.analyzeRequestFeatures>
  ): Promise<VirtualModelConfig[]> {
    const candidates: VirtualModelConfig[] = [];

    for (const model of models) {
      let score = 0;
      let reasons: string[] = [];

      // 能力匹配评分
      const capabilityMatches = features.capabilities.filter(cap =>
        model.capabilities.includes(cap)
      );
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
      const hasSpecialRequirement = features.specialRequirements.some(req => {
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
        } as any);
        console.log(`Model ${model.id} scored ${score.toFixed(1)}: ${reasons.join(', ')}`);
      }
    }

    // 按分数排序
    candidates.sort((a: any, b: any) => (b.routingScore || 0) - (a.routingScore || 0));

    // 移除临时分数属性
    return candidates.map(model => {
      const { routingScore, ...cleanModel } = model as any;
      return cleanModel;
    });
  }

  /**
   * Select the best candidate from the list
   */
  private selectBestCandidate(candidates: VirtualModelConfig[], features: any): VirtualModelConfig {
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
  private generateRoutingReason(model: VirtualModelConfig, features: any): string {
    const reasons: string[] = [];

    // 基于能力匹配
    const matches = features.capabilities.filter((cap: string) =>
      model.capabilities.includes(cap)
    );
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
  private calculateConfidence(model: VirtualModelConfig, request: ClientRequest): number {
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
  private extractRequiredCapabilities(request: ClientRequest): string[] {
    const capabilities: string[] = [];

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
        const headerCaps = request.headers['x-rcc-capabilities'].split(',').map((cap: string) => cap.trim());
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
  private async recordRequestMetrics(modelId: string, success: boolean): Promise<void> {
    const metrics = this.modelMetrics.get(modelId);
    
    if (metrics) {
      metrics.totalRequests++;
      metrics.lastUsed = Date.now();
      
      if (success) {
        metrics.successfulRequests++;
      } else {
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
  private validateModelConfig(model: VirtualModelConfig): void {
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
  private validateRoutingRule(rule: RoutingRule): void {
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
  public getModelStatus(): {
    totalModels: number;
    enabledModels: number;
    disabledModels: number;
    modelDetails: Array<{
      id: string;
      name: string;
      enabled: boolean;
      capabilities: string[];
      health: number;
      lastUsed?: number;
    }>;
  } {
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
        (result as any).lastUsed = metrics.lastUsed;
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
  public async performHealthCheck(): Promise<void> {
    this.log('Performing health check on all virtual models', { method: 'performHealthCheck' });

    for (const [modelId, model] of this.virtualModels.entries()) {
      const metrics = this.modelMetrics.get(modelId);
      if (!metrics) continue;

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
  public override async destroy(): Promise<void> {
    this.log('Cleaning up Virtual Model Router', { method: 'destroy' });

    this.virtualModels.clear();
    this.routingRules.clear();
    this.modelMetrics.clear();

    await super.destroy();
  }
}