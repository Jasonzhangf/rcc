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
  private loadBalancingStrategy: 'round-robin' | 'weighted' | 'least-connections' = 'weighted';

  constructor() {
    const moduleInfo: ModuleInfo = {
      id: 'VirtualModelRouter',
      name: 'Virtual Model Router',
      version: '1.0.0',
      description: 'Intelligent virtual model routing with load balancing',
      type: 'component',
      capabilities: ['virtual-model-routing', 'load-balancing', 'rule-evaluation'],
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
  async routeRequest(request: ClientRequest): Promise<VirtualModelConfig> {
    this.log('Routing request:', { id: request.id, virtualModel: request.virtualModel });
    
    // If specific virtual model is requested, use it
    if (request.virtualModel) {
      const model = this.virtualModels.get(request.virtualModel);
      if (model && model.enabled) {
        this.log('Using specified virtual model:', request.virtualModel);
        await this.recordRequestMetrics(model.id, true);
        return model;
      }
      
      this.warn('Requested virtual model not found or disabled:', request.virtualModel);
      throw new Error(`Virtual model '${request.virtualModel}' not found or disabled`);
    }
    
    // Use routing rules to determine the best model
    const decision = await this.makeRoutingDecision(request);
    this.log('Routing decision:', { modelId: decision.model.id, confidence: decision.confidence });
    
    await this.recordRequestMetrics(decision.model.id, true);
    return decision.model;
  }

  /**
   * Register a new virtual model
   */
  async registerModel(model: VirtualModelConfig): Promise<void> {
    this.log('Registering virtual model:', model.id);
    
    // Validate model configuration
    this.validateModelConfig(model);
    
    // Check if model already exists
    if (this.virtualModels.has(model.id)) {
      throw new Error(`Virtual model '${model.id}' already exists`);
    }
    
    // Add model to registry
    this.virtualModels.set(model.id, model);
    
    // Initialize routing rules
    this.routingRules.set(model.id, model.routingRules || []);
    
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
    
    this.log('Virtual model registered successfully:', model.id);
  }

  /**
   * Unregister a virtual model
   */
  async unregisterModel(modelId: string): Promise<void> {
    this.log('Unregistering virtual model:', modelId);
    
    if (!this.virtualModels.has(modelId)) {
      throw new Error(`Virtual model '${modelId}' not found`);
    }
    
    // Remove from registries
    this.virtualModels.delete(modelId);
    this.routingRules.delete(modelId);
    this.modelMetrics.delete(modelId);
    
    this.log('Virtual model unregistered successfully:', modelId);
  }

  /**
   * Update routing rules for a model
   */
  async updateRoutingRules(modelId: string, rules: RoutingRule[]): Promise<void> {
    this.log('Updating routing rules for model:', modelId);
    
    if (!this.virtualModels.has(modelId)) {
      throw new Error(`Virtual model '${modelId}' not found`);
    }
    
    // Validate rules
    rules.forEach(rule => this.validateRoutingRule(rule));
    
    this.routingRules.set(modelId, rules);
    this.log('Routing rules updated for model:', modelId);
  }

  /**
   * Get model metrics
   */
  async getModelMetrics(modelId: string): Promise<ModelMetrics> {
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
  getModels(): VirtualModelConfig[] {
    return Array.from(this.virtualModels.values());
  }

  /**
   * Get enabled models only
   */
  getEnabledModels(): VirtualModelConfig[] {
    return Array.from(this.virtualModels.values()).filter(model => model.enabled);
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): VirtualModelConfig | undefined {
    return this.virtualModels.get(modelId);
  }

  /**
   * Set load balancing strategy
   */
  setLoadBalancingStrategy(strategy: 'round-robin' | 'weighted' | 'least-connections'): void {
    this.loadBalancingStrategy = strategy;
    this.log('Load balancing strategy set to:', strategy);
  }

  /**
   * Make routing decision based on rules and load balancing
   */
  private async makeRoutingDecision(request: ClientRequest): Promise<RoutingDecision> {
    const enabledModels = this.getEnabledModels();
    
    if (enabledModels.length === 0) {
      throw new Error('No enabled virtual models available');
    }
    
    // Apply routing rules
    const candidates = await this.applyRoutingRules(request, enabledModels);
    
    if (candidates.length === 0) {
      throw new Error('No suitable virtual models found for this request');
    }
    
    // Apply load balancing
    const selected = this.applyLoadBalancing(candidates);
    
    return {
      model: selected,
      confidence: this.calculateConfidence(selected, request),
      reason: `Selected based on ${this.loadBalancingStrategy} strategy`,
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
        this.log('Model lacks required capabilities:', { modelId: model.id, requiredCapabilities });
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
          this.log('Routing rule matched:', rule.name);
          return true;
        }
      } catch (error) {
        this.warn('Error evaluating routing rule:', { ruleName: rule.name, error });
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
      const actualValue = request.headers[headerName];
      return actualValue === expectedValue;
    }
    
    // Add more condition types as needed
    return false;
  }

  /**
   * Apply load balancing strategy
   */
  private applyLoadBalancing(models: VirtualModelConfig[]): VirtualModelConfig {
    switch (this.loadBalancingStrategy) {
      case 'round-robin':
        return this.roundRobinSelection(models);
      case 'weighted':
        return this.weightedSelection(models);
      case 'least-connections':
        return this.leastConnectionsSelection(models);
      default:
        return models[0];
    }
  }

  /**
   * Round-robin selection
   */
  private roundRobinSelection(models: VirtualModelConfig[]): VirtualModelConfig {
    // Simple implementation - can be enhanced with proper round-robin state
    const index = Math.floor(Math.random() * models.length);
    return models[index];
  }

  /**
   * Weighted selection based on model priority
   */
  private weightedSelection(models: VirtualModelConfig[]): VirtualModelConfig {
    const totalWeight = models.reduce((sum, model) => sum + model.priority, 0);
    let random = Math.random() * totalWeight;
    
    for (const model of models) {
      random -= model.priority;
      if (random <= 0) {
        return model;
      }
    }
    
    return models[0];
  }

  /**
   * Least connections selection
   */
  private leastConnectionsSelection(models: VirtualModelConfig[]): VirtualModelConfig {
    let selected = models[0];
    let minConnections = Infinity;
    
    for (const model of models) {
      const metrics = this.modelMetrics.get(model.id);
      const connections = metrics?.totalRequests || 0;
      
      if (connections < minConnections) {
        minConnections = connections;
        selected = model;
      }
    }
    
    return selected;
  }

  /**
   * Calculate confidence score for model selection
   */
  private calculateConfidence(model: VirtualModelConfig, request: ClientRequest): number {
    // Simple confidence calculation based on model capabilities and request requirements
    const capabilities = this.extractRequiredCapabilities(request);
    const capabilityMatch = capabilities.filter(cap => model.capabilities.includes(cap)).length;
    const capabilityScore = capabilities.length > 0 ? capabilityMatch / capabilities.length : 1;
    
    // Consider model priority
    const priorityScore = model.priority / 10; // Normalize priority
    
    // Consider model health (error rate)
    const metrics = this.modelMetrics.get(model.id);
    const healthScore = metrics ? (1 - metrics.errorRate) : 1;
    
    return (capabilityScore * 0.5 + priorityScore * 0.3 + healthScore * 0.2);
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
    
    // Add more capability detection logic as needed
    
    return capabilities;
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
    if (!model.id || !model.name || !model.provider || !model.endpoint) {
      throw new Error('Model configuration missing required fields');
    }
    
    if (model.priority < 1 || model.priority > 10) {
      throw new Error('Model priority must be between 1 and 10');
    }
    
    if (model.maxTokens < 1 || model.maxTokens > 100000) {
      throw new Error('Model maxTokens must be between 1 and 100000');
    }
    
    if (model.temperature < 0 || model.temperature > 2) {
      throw new Error('Model temperature must be between 0 and 2');
    }
    
    if (model.topP < 0 || model.topP > 1) {
      throw new Error('Model topP must be between 0 and 1');
    }
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
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    this.log('Cleaning up Virtual Model Router');
    
    this.virtualModels.clear();
    this.routingRules.clear();
    this.modelMetrics.clear();
    
    await super.destroy();
  }
}