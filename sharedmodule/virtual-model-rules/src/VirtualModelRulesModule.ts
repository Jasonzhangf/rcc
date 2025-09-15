// Main Virtual Model Rules Module for RCC

import { BaseModule } from 'rcc-basemodule';
import { ModuleInfo } from 'rcc-basemodule';
import { IVirtualModelRules } from './interfaces/IVirtualModelRules';
import { 
  VirtualModelRule, 
  ModelSchedule, 
  EvaluationContext, 
  EvaluationResult, 
  RuleMetrics,
  RulePriority 
} from './types/VirtualModelRulesTypes';

/**
 * Virtual Model Rules Module for RCC
 * Manages intelligent routing rules, model scheduling, and request processing
 * based on Claude Code Router patterns and virtual model capabilities
 */
export class VirtualModelRulesModule extends BaseModule implements IVirtualModelRules {
  private rules: Map<string, VirtualModelRule> = new Map();
  private schedules: Map<string, ModelSchedule> = new Map();
  private ruleMetrics: Map<string, RuleMetrics> = new Map();
  private evaluationContext: EvaluationContext | null = null;
  private isInitialized: boolean = false;
  private ruleExecutionCache: Map<string, { result: boolean; timestamp: number; ttl: number }> = new Map();
  private cacheCleanupInterval: any = null;
  
  constructor() {
    const moduleInfo: ModuleInfo = {
      id: 'VirtualModelRulesModule',
      name: 'RCC Virtual Model Rules Module',
      version: '1.0.0',
      description: 'Virtual model routing rules and scheduling based on Claude Code Router patterns',
      type: 'virtual-model-rules',
      capabilities: ['rule-engine', 'model-scheduling', 'intelligent-routing', 'request-evaluation'],
      dependencies: ['rcc-basemodule'],
      config: {},
      metadata: {
        author: 'RCC Development Team',
        license: 'MIT',
        repository: 'https://github.com/rcc/rcc-virtual-model-rules'
      }
    };
    
    super(moduleInfo);
  }

  /**
   * Configure the virtual model rules module
   */
  public override configure(config: any): void {
    super.configure(config);
    this.logInfo('Virtual Model Rules module configured', 'configure');
  }

  /**
   * Initialize the virtual model rules module
   */
  public override async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.warn('Virtual Model Rules module is already initialized', 'initialize');
      return;
    }

    this.log('Initializing Virtual Model Rules Module', {}, 'initialize');
    
    try {
      // Call parent initialize first
      await super.initialize();
      
      // Initialize rule engine
      this.initializeRuleEngine();
      
      // Setup message handlers
      this.setupMessageHandlers();
      
      // Start cache cleanup
      this.startCacheCleanup();
      
      this.isInitialized = true;
      this.logInfo('Virtual Model Rules Module initialized successfully', 'initialize');
      
      // Notify initialization complete
      this.broadcastMessage('virtual-model-rules-initialized', { 
        ruleCount: this.rules.size,
        scheduleCount: this.schedules.size 
      });
      
    } catch (error) {
      this.error('Failed to initialize Virtual Model Rules Module [initialize]', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Register a virtual model rule
   */
  public async registerRule(rule: VirtualModelRule): Promise<void> {
    this.log('Registering virtual model rule', { ruleId: rule.id }, 'registerRule');
    
    // Validate rule configuration
    this.validateRule(rule);
    
    // Add to rules registry
    this.rules.set(rule.id, rule);
    
    // Initialize metrics for the rule
    this.ruleMetrics.set(rule.id, {
      ruleId: rule.id,
      totalEvaluations: 0,
      successfulMatches: 0,
      failedMatches: 0,
      matchRate: 0,
      avgEvaluationTime: 0,
      avgConfidence: 0,
      lastEvaluation: 0,
      actionSuccessRate: 0,
      errorCount: 0
    });
    
    this.logInfo('Virtual model rule registered successfully', 'registerRule');
    
    // Notify rule registered
    this.broadcastMessage('virtual-model-rule-registered', { rule });
  }

  /**
   * Unregister a virtual model rule
   */
  public async unregisterRule(ruleId: string): Promise<void> {
    this.log('Unregistering virtual model rule', { ruleId }, 'unregisterRule');
    
    if (!this.rules.has(ruleId)) {
      throw new Error(`Rule '${ruleId}' not found`);
    }
    
    // Remove from registries
    this.rules.delete(ruleId);
    this.ruleMetrics.delete(ruleId);
    
    // Clear cache entries for this rule
    this.clearRuleCache(ruleId);
    
    this.logInfo('Virtual model rule unregistered successfully', 'unregisterRule');
    
    // Notify rule unregistered
    this.broadcastMessage('virtual-model-rule-unregistered', { ruleId });
  }

  /**
   * Get a rule by ID
   */
  public getRule(ruleId: string): VirtualModelRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  public getRules(): VirtualModelRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules for a specific model
   */
  public getRulesForModel(modelId: string): VirtualModelRule[] {
    return Array.from(this.rules.values()).filter(rule => 
      !rule.modelId || rule.modelId === modelId
    );
  }

  /**
   * Evaluate rules for a given context
   */
  public async evaluateRules(context: EvaluationContext): Promise<EvaluationResult[]> {
    this.log('Evaluating rules', { requestId: context.requestId }, 'evaluateRules');
    
    const results: EvaluationResult[] = [];
    const applicableRules = this.getApplicableRules(context);
    
    for (const rule of applicableRules) {
      try {
        const startTime = Date.now();
        const result = await this.evaluateRule(rule, context);
        const evaluationTime = Date.now() - startTime;
        
        // Update metrics
        this.updateRuleMetrics(rule.id, result, evaluationTime);
        
        results.push(result);
        
      } catch (error) {
        this.error('Rule evaluation failed [evaluateRules]', `Rule ${rule.id} failed: ${error instanceof Error ? error.message : String(error)}`);
        
        // Create error result
        results.push({
          ruleId: rule.id,
          matched: false,
          confidence: 0,
          executionResults: {
            actions: [],
            totalExecutionTime: 0,
            allSuccess: false
          },
          timestamp: Date.now(),
          metrics: {
            conditionEvalTime: 0,
            conditionsEvaluated: 0,
            conditionsMatched: 0
          }
        });
      }
    }
    
    // Sort results by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence);
    
    this.log('Rules evaluation completed', { 
      requestId: context.requestId, 
      resultCount: results.length 
    }, 'evaluateRules');
    
    return results;
  }

  /**
   * Get rule metrics
   */
  public getRuleMetrics(ruleId?: string): RuleMetrics[] {
    if (ruleId) {
      const metrics = this.ruleMetrics.get(ruleId);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.ruleMetrics.values());
  }

  /**
   * Load rules from configuration file
   */
  public async loadRules(rulesPath: string): Promise<void> {
    this.log('Loading rules from configuration file', { rulesPath }, 'loadRules');
    
    // Mark as under construction feature
    const underConstruction = new (await import('rcc-underconstruction')).UnderConstruction();
    await underConstruction.initialize();
    
    underConstruction.callUnderConstructionFeature('load-rules-from-config', {
      caller: 'VirtualModelRulesModule.loadRules',
      parameters: { rulesPath },
      purpose: '从配置文件加载规则'
    });
    
    // Placeholder implementation
    this.logInfo('Rules loading feature is under construction', 'loadRules');
  }

  /**
   * Add a new virtual model rule (alias for registerRule)
   */
  public async addRule(rule: VirtualModelRule): Promise<void> {
    return await this.registerRule(rule);
  }

  /**
   * Remove a virtual model rule (alias for unregisterRule)
   */
  public async removeRule(ruleId: string): Promise<void> {
    return await this.unregisterRule(ruleId);
  }

  /**
   * Update an existing rule
   */
  public async updateRule(ruleId: string, updates: Partial<VirtualModelRule>): Promise<void> {
    this.log('Updating virtual model rule', { ruleId }, 'updateRule');
    
    const existingRule = this.rules.get(ruleId);
    if (!existingRule) {
      throw new Error(`Rule '${ruleId}' not found`);
    }
    
    // Merge updates with existing rule
    const updatedRule = { ...existingRule, ...updates };
    
    // Remove and re-add the rule
    await this.unregisterRule(ruleId);
    await this.registerRule(updatedRule);
    
    this.logInfo('Virtual model rule updated successfully', 'updateRule');
  }

  /**
   * Get model schedule (alias for getSchedule)
   */
  public getModelSchedule(modelId: string): ModelSchedule | undefined {
    return this.getSchedule(modelId);
  }

  /**
   * Set model schedule (alias for registerSchedule)
   */
  public async setModelSchedule(modelId: string, schedule: ModelSchedule): Promise<void> {
    // Ensure schedule has the correct modelId
    schedule.modelId = modelId;
    await this.registerSchedule(schedule);
  }

  /**
   * Get active rules for model
   */
  public getActiveRules(modelId: string): VirtualModelRule[] {
    return this.getRulesForModel(modelId).filter(rule => rule.enabled);
  }

  /**
   * Enable/disable rule
   */
  public async setRuleEnabled(ruleId: string, enabled: boolean): Promise<void> {
    this.log('Setting rule enabled state', { ruleId, enabled }, 'setRuleEnabled');
    
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule '${ruleId}' not found`);
    }
    
    rule.enabled = enabled;
    
    this.logInfo('Rule enabled state updated successfully', 'setRuleEnabled');
    
    // Notify rule state changed
    this.broadcastMessage('rule-state-changed', { ruleId, enabled });
  }

  /**
   * Register a model schedule
   */
  public async registerSchedule(schedule: ModelSchedule): Promise<void> {
    this.log('Registering model schedule', { modelId: schedule.modelId }, 'registerSchedule');
    
    // Validate schedule configuration
    this.validateSchedule(schedule);
    
    // Add to schedules registry
    this.schedules.set(schedule.modelId, schedule);
    
    this.logInfo('Model schedule registered successfully', 'registerSchedule');
    
    // Notify schedule registered
    this.broadcastMessage('model-schedule-registered', { schedule });
  }

  /**
   * Unregister a model schedule
   */
  public async unregisterSchedule(modelId: string): Promise<void> {
    this.log('Unregistering model schedule', { modelId }, 'unregisterSchedule');
    
    if (!this.schedules.has(modelId)) {
      throw new Error(`Schedule for model '${modelId}' not found`);
    }
    
    // Remove from schedules registry
    this.schedules.delete(modelId);
    
    this.logInfo('Model schedule unregistered successfully', 'unregisterSchedule');
    
    // Notify schedule unregistered
    this.broadcastMessage('model-schedule-unregistered', { modelId });
  }

  /**
   * Get schedule for a model
   */
  public getSchedule(modelId: string): ModelSchedule | undefined {
    return this.schedules.get(modelId);
  }

  /**
   * Get all schedules
   */
  public getSchedules(): ModelSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Check if a model is currently scheduled to run
   */
  public async isModelScheduled(modelId: string): Promise<boolean> {
    const schedule = this.schedules.get(modelId);
    if (!schedule || !schedule.enabled) {
      return false;
    }
    
    // Check time windows and constraints
    return this.isScheduleActive(schedule);
  }

  /**
   * Get configuration
   */
  public override getConfig(): any {
    return super.getConfig();
  }

  /**
   * Update configuration
   */
  public async updateConfig(config: any): Promise<void> {
    this.log('Updating virtual model rules configuration', config, 'updateConfig');
    
    // Call parent update
    super.configure(config);
    
    this.logInfo('Virtual model rules configuration updated successfully', 'updateConfig');
  }

  /**
   * Handle incoming messages
   */
  public override async handleMessage(message: any): Promise<any> {
    this.log('Handling message', { type: message?.type, source: message?.source }, 'handleMessage');

    switch (message?.type) {
      case 'rule-evaluation-request':
        return await this.handleRuleEvaluation(message);
      case 'schedule-status-request':
        return await this.handleScheduleStatus(message);
      case 'rule-metrics-request':
        return await this.handleRuleMetrics(message);
      case 'server-initialized':
      case 'server-started':
      case 'module_registered':
        // Handle common system messages silently
        this.log('Received system message', { type: message?.type }, 'handleMessage');
        return { success: true, message: `Handled ${message?.type}` };
      default:
        return await super.handleMessage(message);
    }
  }

  /**
   * Cleanup resources
   */
  public override async destroy(): Promise<void> {
    this.log('Cleaning up Virtual Model Rules Module', {}, 'destroy');
    
    try {
      // Clear registries
      this.rules.clear();
      this.schedules.clear();
      this.ruleMetrics.clear();
      this.ruleExecutionCache.clear();
      
      this.evaluationContext = null;
      this.isInitialized = false;
      
      // Clear cache cleanup interval
      if (this.cacheCleanupInterval) {
        clearInterval(this.cacheCleanupInterval);
        this.cacheCleanupInterval = null;
      }
      
      await super.destroy();
      
    } catch (error) {
      this.error('Error during cleanup [destroy]', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Initialize rule engine
   */
  private initializeRuleEngine(): void {
    this.log('Initializing rule engine', {}, 'initializeRuleEngine');
    
    // Initialize with default rules if needed
    // This could load rules from configuration files
    
    this.logInfo('Rule engine initialized successfully', 'initializeRuleEngine');
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    this.log('Setting up message handlers', {}, 'setupMessageHandlers');
    
    // Message handling is done in handleMessage method
  }

  /**
   * Start cache cleanup
   */
  private startCacheCleanup(): void {
    // Clean up expired cache entries every minute
    const intervalId = setInterval(() => {
      this.cleanupCache();
    }, 60000);
    
    // Store interval ID for cleanup
    this.cacheCleanupInterval = intervalId;
    
    this.log('Cache cleanup started', {}, 'startCacheCleanup');
  }

  /**
   * Validate rule configuration
   */
  private validateRule(rule: VirtualModelRule): void {
    if (!rule.id || !rule.name || !rule.priority) {
      throw new Error('Rule configuration missing required fields: id, name, priority');
    }
    
    if (!rule.conditions || rule.conditions.length === 0) {
      throw new Error('Rule must have at least one condition');
    }
    
    if (!rule.actions || rule.actions.length === 0) {
      throw new Error('Rule must have at least one action');
    }
    
    // Validate priority is one of the allowed values
    const validPriorities: RulePriority[] = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(rule.priority)) {
      throw new Error('Rule priority must be one of: low, medium, high, critical');
    }
  }

  /**
   * Validate schedule configuration
   */
  private validateSchedule(schedule: ModelSchedule): void {
    if (!schedule.modelId || !schedule.priority) {
      throw new Error('Schedule configuration missing required fields: modelId, priority');
    }
    
    if (schedule.maxExecutionTime && schedule.maxExecutionTime < 1000) {
      throw new Error('Max execution time must be at least 1000ms');
    }
  }

  /**
   * Get applicable rules for a context
   */
  private getApplicableRules(context: EvaluationContext): VirtualModelRule[] {
    const applicableRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .filter(rule => !rule.modelId || rule.modelId === context.model?.modelId)
      .sort((a, b) => {
        // Sort by priority (higher priority first)
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    
    this.trace('Found applicable rules [getApplicableRules]', { 
      requestId: context.requestId, 
      ruleCount: applicableRules.length 
    });
    
    return applicableRules;
  }

  /**
   * Evaluate a single rule
   */
  private async evaluateRule(rule: VirtualModelRule, context: EvaluationContext): Promise<EvaluationResult> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.getCacheKey(rule, context);
    const cachedResult = this.ruleExecutionCache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < cachedResult.ttl) {
      this.trace('Using cached rule result [evaluateRule]', { ruleId: rule.id });
      return this.createEvaluationResult(rule, true, cachedResult.result, 0.95);
    }
    
    // Evaluate conditions
    const conditionStartTime = Date.now();
    const { matched, confidence, conditionsEvaluated, conditionsMatched } = await this.evaluateConditions(rule, context);
    const conditionEvalTime = Date.now() - conditionStartTime;
    
    if (!matched) {
      // Cache negative result
      this.ruleExecutionCache.set(cacheKey, { 
        result: false, 
        timestamp: Date.now(), 
        ttl: 30000 // 30 seconds for negative results
      });
      
      return this.createEvaluationResult(rule, false, false, 0, conditionEvalTime, conditionsEvaluated, conditionsMatched);
    }
    
    // Execute actions
    const executionResults = await this.executeActions(rule, context);
    
    // Cache positive result
    this.ruleExecutionCache.set(cacheKey, { 
      result: true, 
      timestamp: Date.now(), 
      ttl: 60000 // 60 seconds for positive results
    });
    
    const totalExecutionTime = Date.now() - startTime;
    
    return this.createEvaluationResult(rule, true, true, confidence, conditionEvalTime, conditionsEvaluated, conditionsMatched, executionResults, totalExecutionTime);
  }

  /**
   * Evaluate rule conditions
   */
  private async evaluateConditions(rule: VirtualModelRule, context: EvaluationContext): Promise<{
    matched: boolean;
    confidence: number;
    conditionsEvaluated: number;
    conditionsMatched: number;
  }> {
    let conditionsEvaluated = 0;
    let conditionsMatched = 0;
    let totalWeight = 0;
    let matchedWeight = 0;
    
    for (const condition of rule.conditions) {
      conditionsEvaluated++;
      
      try {
        const result = await this.evaluateCondition(condition, context);
        const weight = condition.weight || 1;
        totalWeight += weight;
        
        if (result) {
          conditionsMatched++;
          matchedWeight += weight;
        }
        
      } catch (error) {
        this.warn('Condition evaluation failed [evaluateConditions]', `Rule ${rule.id}, field ${condition.field}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    const matched = conditionsMatched > 0;
    const confidence = totalWeight > 0 ? matchedWeight / totalWeight : 0;
    
    return { matched, confidence, conditionsEvaluated, conditionsMatched };
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: any, context: EvaluationContext): Promise<boolean> {
    const fieldValue = this.getFieldValue(context, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
      case 'not_contains':
        return typeof fieldValue === 'string' && !fieldValue.includes(condition.value);
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > condition.value;
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'regex':
        return typeof fieldValue === 'string' && new RegExp(condition.value).test(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Get field value from context
   */
  private getFieldValue(context: EvaluationContext, field: string): any {
    const parts = field.split('.');
    let value: any = context;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Execute rule actions
   */
  private async executeActions(rule: VirtualModelRule, context: EvaluationContext): Promise<EvaluationResult['executionResults']> {
    const actions: Array<{
      actionId: string;
      success: boolean;
      result?: any;
      error?: string;
      executionTime: number;
    }> = [];
    
    let totalExecutionTime = 0;
    let allSuccess = true;
    
    for (const action of rule.actions) {
      const startTime = Date.now();
      
      try {
        const result = await this.executeAction(action, context);
        const executionTime = Date.now() - startTime;
        
        actions.push({
          actionId: action.id || 'unknown',
          success: true,
          result,
          executionTime
        });
        
        totalExecutionTime += executionTime;
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        actions.push({
          actionId: action.id || 'unknown',
          success: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime
        });
        
        totalExecutionTime += executionTime;
        allSuccess = false;
      }
    }
    
    return {
      actions,
      totalExecutionTime,
      allSuccess
    };
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: any, context: EvaluationContext): Promise<any> {
    this.trace('Executing action [executeAction]', { type: action.type });
    
    switch (action.type) {
      case 'route_to_model':
        return this.executeRouteToModel(action, context);
      case 'set_priority':
        return this.executeSetPriority(action, context);
      case 'add_tag':
        return this.executeAddTag(action, context);
      case 'remove_tag':
        return this.executeRemoveTag(action, context);
      case 'log_event':
        return this.executeLogEvent(action, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute route to model action
   */
  private async executeRouteToModel(action: any, context: EvaluationContext): Promise<any> {
    this.trace('Routing to model [executeRouteToModel]', action.parameters);
    return { routed: true, modelId: action.parameters.modelId };
  }

  /**
   * Execute set priority action
   */
  private async executeSetPriority(action: any, context: EvaluationContext): Promise<any> {
    this.trace('Setting priority [executeSetPriority]', action.parameters);
    return { priority: action.parameters.priority };
  }

  /**
   * Execute add tag action
   */
  private async executeAddTag(action: any, context: EvaluationContext): Promise<any> {
    this.trace('Adding tag [executeAddTag]', action.parameters);
    return { tagAdded: true, tag: action.parameters.tag };
  }

  /**
   * Execute remove tag action
   */
  private async executeRemoveTag(action: any, context: EvaluationContext): Promise<any> {
    this.trace('Removing tag [executeRemoveTag]', action.parameters);
    return { tagRemoved: true, tag: action.parameters.tag };
  }

  /**
   * Execute log event action
   */
  private async executeLogEvent(action: any, context: EvaluationContext): Promise<any> {
    this.log('Event logged', { event: action.parameters.event }, 'executeLogEvent');
    return { logged: true };
  }

  /**
   * Create evaluation result
   */
  private createEvaluationResult(
    rule: VirtualModelRule,
    matched: boolean,
    result: boolean,
    confidence: number,
    conditionEvalTime: number = 0,
    conditionsEvaluated: number = 0,
    conditionsMatched: number = 0,
    executionResults?: EvaluationResult['executionResults'],
    totalExecutionTime: number = 0
  ): EvaluationResult {
    return {
      ruleId: rule.id,
      matched,
      confidence,
      executionResults: executionResults || {
        actions: [],
        totalExecutionTime: 0,
        allSuccess: false
      },
      timestamp: Date.now(),
      metrics: {
        conditionEvalTime,
        conditionsEvaluated,
        conditionsMatched
      }
    };
  }

  /**
   * Update rule metrics
   */
  private updateRuleMetrics(ruleId: string, result: EvaluationResult, evaluationTime: number): void {
    const metrics = this.ruleMetrics.get(ruleId);
    if (!metrics) return;
    
    metrics.totalEvaluations++;
    metrics.lastEvaluation = Date.now();
    metrics.avgEvaluationTime = (metrics.avgEvaluationTime * (metrics.totalEvaluations - 1) + evaluationTime) / metrics.totalEvaluations;
    
    if (result.matched) {
      metrics.successfulMatches++;
      metrics.avgConfidence = (metrics.avgConfidence * (metrics.successfulMatches - 1) + result.confidence) / metrics.successfulMatches;
    } else {
      metrics.failedMatches++;
    }
    
    metrics.matchRate = metrics.successfulMatches / metrics.totalEvaluations;
    
    if (result.executionResults.allSuccess) {
      const successCount = metrics.actionSuccessRate * (metrics.totalEvaluations - 1);
      metrics.actionSuccessRate = (successCount + 1) / metrics.totalEvaluations;
    }
    
    if (!result.executionResults.allSuccess) {
      metrics.errorCount++;
    }
  }

  /**
   * Get cache key for rule evaluation
   */
  private getCacheKey(rule: VirtualModelRule, context: EvaluationContext): string {
    return `${rule.id}_${context.requestId}_${context.model?.modelId || 'unknown'}_${JSON.stringify(context.request)}`;
  }

  /**
   * Clear cache entries for a rule
   */
  private clearRuleCache(ruleId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, value] of this.ruleExecutionCache.entries()) {
      if (key.startsWith(`${ruleId}_`)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.ruleExecutionCache.delete(key);
    }
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, value] of this.ruleExecutionCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.ruleExecutionCache.delete(key);
    }
    
    if (keysToDelete.length > 0) {
      this.trace('Cache cleanup completed [cleanupCache]', { 
        entriesRemoved: keysToDelete.length 
      });
    }
  }

  /**
   * Check if schedule is currently active
   */
  private isScheduleActive(schedule: ModelSchedule): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Check time windows
    if (schedule.timeWindows) {
      const { startTime, endTime } = schedule.timeWindows;
      
      if (startTime && endTime) {
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        const startTimeMinutes = startHour * 60 + startMinute;
        const endTimeMinutes = endHour * 60 + endMinute;
        
        if (currentTime < startTimeMinutes || currentTime > endTimeMinutes) {
          return false;
        }
      }
      
      // Check days of week
      if (schedule.timeWindows.daysOfWeek) {
        const currentDay = now.getDay();
        if (!schedule.timeWindows.daysOfWeek.includes(currentDay)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Handle rule evaluation message
   */
  private async handleRuleEvaluation(message: any): Promise<any> {
    this.log('Handling rule evaluation request', {}, 'handleRuleEvaluation');
    
    const context: EvaluationContext = message.payload?.context;
    if (!context) {
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: 'Missing evaluation context',
        timestamp: Date.now()
      };
    }
    
    try {
      const results = await this.evaluateRules(context);
      
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: true,
        data: { results },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Handle schedule status message
   */
  private async handleScheduleStatus(message: any): Promise<any> {
    this.log('Handling schedule status request', {}, 'handleScheduleStatus');
    
    const modelId = message.payload?.modelId;
    const scheduleStatus: Record<string, boolean> = {};
    
    if (modelId) {
      scheduleStatus[modelId] = await this.isModelScheduled(modelId);
    } else {
      for (const modelId of this.schedules.keys()) {
        scheduleStatus[modelId] = await this.isModelScheduled(modelId);
      }
    }
    
    return {
      messageId: message.id,
      correlationId: message.correlationId || '',
      success: true,
      data: { scheduleStatus },
      timestamp: Date.now()
    };
  }

  /**
   * Handle rule metrics message
   */
  private async handleRuleMetrics(message: any): Promise<any> {
    this.log('Handling rule metrics request', {}, 'handleRuleMetrics');
    
    const ruleId = message.payload?.ruleId;
    const metrics = this.getRuleMetrics(ruleId);
    
    return {
      messageId: message.id,
      correlationId: message.correlationId || '',
      success: true,
      data: { metrics },
      timestamp: Date.now()
    };
  }
}