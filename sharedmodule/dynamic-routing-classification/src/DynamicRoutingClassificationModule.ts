// Main Dynamic Routing Classification Module for RCC

import { BaseModule, ModuleInfo } from 'rcc-basemodule';

// Define message types for internal use
interface Message {
  type: string;
  data: any;
  timestamp: number;
  id?: string;
  correlationId?: string;
  source?: string;
  payload?: any;
}

interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  messageId?: string;
  correlationId?: string;
  timestamp?: number;
}
import { IDynamicRoutingClassification } from './interfaces/IDynamicRoutingClassification';
import {
  RoutingRule,
  RoutingSchedule,
  RoutingContext,
  RoutingResult,
  RoutingMetrics,
  RoutingPriority,
  RoutingConditionOperator
} from './types/DynamicRoutingTypes';

/**
 * Dynamic Routing Classification Module for RCC
 * Manages intelligent routing rules, request classification, and request processing
 * based on Claude Code Router patterns and dynamic routing capabilities
 */
export class DynamicRoutingClassificationModule extends BaseModule implements IDynamicRoutingClassification {
  private rules: Map<string, RoutingRule> = new Map();
  private schedules: Map<string, RoutingSchedule> = new Map();
  private ruleMetrics: Map<string, RoutingMetrics> = new Map();
  private evaluationContext: RoutingContext | null = null;
  private isInitialized: boolean = false;
  private ruleExecutionCache: Map<string, { result: boolean; timestamp: number; ttl: number }> = new Map();
  private cacheCleanupInterval: any = null;
  
  constructor() {
    const moduleInfo: ModuleInfo = {
      id: 'DynamicRoutingClassificationModule',
      name: 'RCC Dynamic Routing Classification Module',
      version: '1.0.0',
      description: 'Dynamic routing classification and request routing based on Claude Code Router patterns',
      type: 'dynamic-routing-classification',
      metadata: {
        capabilities: ['rule-engine', 'request-routing', 'intelligent-routing', 'request-evaluation'],
        dependencies: ['rcc-basemodule'],
        author: 'RCC Development Team',
        license: 'MIT',
        repository: 'https://github.com/rcc/rcc-dynamic-routing-classification'
      }
    };
    
    super(moduleInfo);
  }

  /**
   * Configure the dynamic routing classification module
   */
  public override configure(config: Record<string, any>): void {
    super.configure(config);
    this.log('Dynamic Routing Classification module configured', { method: 'configure' });
  }

  /**
   * Initialize the dynamic routing classification module
   */
  public override async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.warn('Dynamic Routing Classification module is already initialized', { method: 'initialize' });
      return;
    }

    this.log('Initializing Dynamic Routing Classification Module', { method: 'initialize' });
    
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
      this.log('Dynamic Routing Classification Module initialized successfully', { method: 'initialize' });

      // Notify initialization complete
      this.broadcastMessage('dynamic-routing-classification-initialized', {
        ruleCount: this.rules.size,
        scheduleCount: this.schedules.size
      });
      
    } catch (error) {
      this.error('Failed to initialize Dynamic Routing Classification Module [initialize]', { error: error instanceof Error ? error.message : String(error), method: 'initialize' });
      throw error;
    }
  }

  /**
   * Register a routing rule
   */
  public async registerRule(rule: RoutingRule): Promise<void> {
    this.log('Registering routing rule', { ruleId: rule.routingId, method: 'registerRule' });
    
    // Validate rule configuration
    this.validateRule(rule);
    
    // Add to rules registry
    this.rules.set(rule.routingId, rule);
    
    // Initialize metrics for the rule
    this.ruleMetrics.set(rule.routingId, {
      routingRuleId: rule.routingId,
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
    
    this.log('Routing rule registered successfully', { method: 'registerRule' });

    // Notify rule registered
    this.broadcastMessage('routing-rule-registered', { rule });
  }

  /**
   * Unregister a routing rule
   */
  public async unregisterRule(ruleId: string): Promise<void> {
    this.log('Unregistering routing rule', { ruleId, method: 'unregisterRule' });
    
    if (!this.rules.has(ruleId)) {
      throw new Error(`Rule '${ruleId}' not found`);
    }
    
    // Remove from registries
    this.rules.delete(ruleId);
    this.ruleMetrics.delete(ruleId);
    
    // Clear cache entries for this rule
    this.clearRuleCache(ruleId);
    
    this.log('Routing rule unregistered successfully', { method: 'unregisterRule' });

    // Notify rule unregistered
    this.broadcastMessage('routing-rule-unregistered', { ruleId });
  }

  /**
   * Get a rule by ID
   */
  public getRule(ruleId: string): RoutingRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  public getRules(): RoutingRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules for a specific route
   */
  public getRulesForRoute(modelId: string): RoutingRule[] {
    return Array.from(this.rules.values()).filter(rule =>
      !rule.modelId || rule.modelId === modelId
    );
  }

  /**
   * Evaluate rules for a given context
   */
  public async evaluateRules(context: RoutingContext): Promise<RoutingResult[]> {
    this.log('Evaluating rules', { requestId: context.requestId, method: 'evaluateRules' });
    
    const results: RoutingResult[] = [];
    const applicableRules = this.getApplicableRules(context);
    
    for (const rule of applicableRules) {
      try {
        const startTime = Date.now();
        const result = await this.evaluateRule(rule, context);
        const evaluationTime = Date.now() - startTime;
        
        // Update metrics
        this.updateRuleMetrics(rule.routingId, result, evaluationTime);
        
        results.push(result);
        
      } catch (error) {
        this.error('Rule evaluation failed', { ruleId: rule.routingId, error: error instanceof Error ? error.message : String(error), method: 'evaluateRules' });
        
        // Create error result
        results.push({
          routingRuleId: rule.routingId,
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
      resultCount: results.length,
      method: 'evaluateRules'
    });
    
    return results;
  }

  /**
   * Get rule metrics
   */
  public getRuleMetrics(ruleId?: string): RoutingMetrics[] {
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
    this.log('Loading rules from configuration file', { rulesPath, method: 'loadRules' });
    
    // Mark as under construction feature
    const underConstruction = new (await import('rcc-underconstruction')).UnderConstruction();
    await underConstruction.initialize();
    
    underConstruction.callUnderConstructionFeature('load-rules-from-config', {
      caller: 'DynamicRoutingClassificationModule.loadRules',
      parameters: { rulesPath },
      purpose: '从配置文件加载规则'
    });
    
    // Placeholder implementation
    this.log('Rules loading feature is under construction', { method: 'loadRules' });
  }

  /**
   * Add a new routing rule (alias for registerRule)
   */
  public async addRule(rule: RoutingRule): Promise<void> {
    return await this.registerRule(rule);
  }

  /**
   * Remove a routing rule (alias for unregisterRule)
   */
  public async removeRule(ruleId: string): Promise<void> {
    return await this.unregisterRule(ruleId);
  }

  /**
   * Update an existing rule
   */
  public async updateRule(ruleId: string, updates: Partial<RoutingRule>): Promise<void> {
    this.log('Updating routing rule', { ruleId, method: 'updateRule' });
    
    const existingRule = this.rules.get(ruleId);
    if (!existingRule) {
      throw new Error(`Rule '${ruleId}' not found`);
    }
    
    // Merge updates with existing rule
    const updatedRule = { ...existingRule, ...updates };
    
    // Remove and re-add the rule
    await this.unregisterRule(ruleId);
    await this.registerRule(updatedRule);
    
    this.log('Routing rule updated successfully', { method: 'updateRule' });
  }

  /**
   * Get routing schedule (alias for getSchedule)
   */
  public getRoutingSchedule(modelId: string): RoutingSchedule | undefined {
    return this.getSchedule(modelId);
  }

  /**
   * Set routing schedule (alias for registerSchedule)
   */
  public async setRoutingSchedule(modelId: string, schedule: RoutingSchedule): Promise<void> {
    // Ensure schedule has the correct modelId
    schedule.modelId = modelId;
    await this.registerSchedule(schedule);
  }

  /**
   * Get active rules for route
   */
  public getActiveRules(modelId: string): RoutingRule[] {
    return this.getRulesForRoute(modelId).filter(rule => rule.enabled);
  }

  /**
   * Enable/disable rule
   */
  public async setRuleEnabled(ruleId: string, enabled: boolean): Promise<void> {
    this.log('Setting rule enabled state', { ruleId, enabled, method: 'setRuleEnabled' });
    
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule '${ruleId}' not found`);
    }
    
    rule.enabled = enabled;
    
    this.log('Rule enabled state updated successfully', { method: 'setRuleEnabled' });
    
    // Notify rule state changed
    this.broadcastMessage('rule-state-changed', { ruleId });
  }

  /**
   * Register a routing schedule
   */
  public async registerSchedule(schedule: RoutingSchedule): Promise<void> {
    this.log('Registering routing schedule', { modelId: schedule.modelId, method: 'registerSchedule' });

    // Validate schedule configuration
    this.validateSchedule(schedule);

    // Add to schedules registry
    this.schedules.set(schedule.modelId, schedule);
    
    this.log('Routing schedule registered successfully', { method: 'registerSchedule' });

    // Notify schedule registered
    this.broadcastMessage('routing-schedule-registered', { schedule });
  }

  /**
   * Unregister a routing schedule
   */
  public async unregisterSchedule(modelId: string): Promise<void> {
    this.log('Unregistering routing schedule', { modelId, method: 'unregisterSchedule' });

    if (!this.schedules.has(modelId)) {
      throw new Error(`Schedule for model '${modelId}' not found`);
    }

    // Remove from schedules registry
    this.schedules.delete(modelId);

    this.log('Routing schedule unregistered successfully', { method: 'unregisterSchedule' });

    // Notify schedule unregistered
    this.broadcastMessage('routing-schedule-unregistered', { modelId });
  }

  /**
   * Get schedule for a route
   */
  public getSchedule(modelId: string): RoutingSchedule | undefined {
    return this.schedules.get(modelId);
  }

  /**
   * Get all schedules
   */
  public getSchedules(): RoutingSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Check if a route is currently scheduled to run
   */
  public async isRouteScheduled(modelId: string): Promise<boolean> {
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
  public override getConfig(): Record<string, any> {
    return super.getConfig();
  }

  /**
   * Update configuration
   */
  public async updateConfig(config: Record<string, any>): Promise<void> {
    this.log('Updating dynamic routing classification configuration', { config, method: 'updateConfig' });

    // Call parent update
    super.configure(config);

    this.log('Dynamic routing classification configuration updated successfully', { method: 'updateConfig' });
  }

  /**
   * Handle incoming messages
   */
  public override async handleMessage(message: Message): Promise<MessageResponse | void> {
    this.log('Handling message', { type: message?.type, source: message?.source, method: 'handleMessage' });

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
        // Handle common system messages
        this.log('Received system message', {
          type: message?.type,
          moduleId: message?.payload?.moduleId,
          messageSource: message?.source,
          method: 'handleMessage'
        });

        // For module_registered messages, update our routing rules
        if (message?.type === 'module_registered' && message?.payload?.moduleId) {
          try {
            // Check if we need to configure fallback routing for unconfigured routes
            await this.setupFallbackRouting(message.payload);
          } catch (error) {
            this.error('Failed to setup fallback routing for module registration', { error: error instanceof Error ? error.message : String(error), method: 'handleMessage' });
          }
        }

        return {
          success: true,
          message: `Handled ${message?.type}`,
          data: {
            acknowledged: true,
            moduleId: this.info.id,
            timestamp: Date.now()
          }
        };
      default:
        return await super.handleMessage(message);
    }
  }

  /**
   * Cleanup resources
   */
  public override async destroy(): Promise<void> {
    this.log('Cleaning up Dynamic Routing Classification Module', { method: 'destroy' });
    
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
      this.error('Error during cleanup [destroy]', { error: error instanceof Error ? error.message : String(error), method: 'destroy' });
      throw error;
    }
  }

  /**
   * Initialize rule engine
   */
  private initializeRuleEngine(): void {
    this.log('Initializing rule engine', { method: 'initializeRuleEngine' });
    
    // Initialize with default rules if needed
    // This could load rules from configuration files
    
    this.log('Rule engine initialized successfully', { method: 'initializeRuleEngine' });
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    this.log('Setting up message handlers', { method: 'setupMessageHandlers' });
    
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
    
    this.log('Cache cleanup started', { method: 'startCacheCleanup' });
  }

  /**
   * Validate rule configuration
   */
  private validateRule(rule: RoutingRule): void {
    if (!rule.routingId || !rule.name || !rule.priority) {
      throw new Error('Rule configuration missing required fields: routingId, name, priority');
    }
    
    if (!rule.conditions || rule.conditions.length === 0) {
      throw new Error('Rule must have at least one condition');
    }
    
    if (!rule.actions || rule.actions.length === 0) {
      throw new Error('Rule must have at least one action');
    }
    
    // Validate priority is one of the allowed values
    const validPriorities: RoutingPriority[] = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(rule.priority)) {
      throw new Error('Rule priority must be one of: low, medium, high, critical');
    }
  }

  /**
   * Validate schedule configuration
   */
  private validateSchedule(schedule: RoutingSchedule): void {
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
  private getApplicableRules(context: RoutingContext): RoutingRule[] {
    const applicableRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .filter(rule => !rule.modelId || rule.modelId === context.model?.modelId)
      .sort((a, b) => {
        // Sort by priority (higher priority first)
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    
    this.log('Found applicable rules', {
      requestId: context.requestId,
      ruleCount: applicableRules.length,
      method: 'getApplicableRules'
    });
    
    return applicableRules;
  }

  /**
   * Evaluate a single rule
   */
  private async evaluateRule(rule: RoutingRule, context: RoutingContext): Promise<RoutingResult> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.getCacheKey(rule, context);
    const cachedResult = this.ruleExecutionCache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < cachedResult.ttl) {
      this.log('Using cached rule result', { ruleId: rule.routingId, method: 'evaluateRule' });
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
  private async evaluateConditions(rule: RoutingRule, context: RoutingContext): Promise<{
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
        this.warn('Condition evaluation failed', { ruleId: rule.routingId, field: condition.field, error: error instanceof Error ? error.message : String(error), method: 'evaluateConditions' });
      }
    }
    
    const matched = conditionsMatched > 0;
    const confidence = totalWeight > 0 ? matchedWeight / totalWeight : 0;
    
    return { matched, confidence, conditionsEvaluated, conditionsMatched };
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: any, context: RoutingContext): Promise<boolean> {
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
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  /**
   * Get field value from context
   */
  private getFieldValue(context: RoutingContext, field: string): any {
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
  private async executeActions(rule: RoutingRule, context: RoutingContext): Promise<RoutingResult['executionResults']> {
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
          actionId: action.actionId || 'unknown',
          success: true,
          result,
          executionTime
        });
        
        totalExecutionTime += executionTime;
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        actions.push({
          actionId: action.actionId || 'unknown',
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
  private async executeAction(action: any, context: RoutingContext): Promise<any> {
    this.log('Executing action [executeAction]', { type: action.type, method: 'executeAction' });
    
    switch (action.type) {
      case 'route_to_service':
        return this.executeRouteToService(action, context);
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
   * Execute route to service action
   */
  private async executeRouteToService(action: any, context: RoutingContext): Promise<any> {
    this.log('Routing to service', { parameters: action.parameters, method: 'executeRouteToService' });
    return { routed: true, serviceId: action.parameters.serviceId };
  }

  /**
   * Execute set priority action
   */
  private async executeSetPriority(action: any, context: RoutingContext): Promise<any> {
    this.log('Setting priority', { parameters: action.parameters, method: 'executeSetPriority' });
    return { priority: action.parameters.priority };
  }

  /**
   * Execute add tag action
   */
  private async executeAddTag(action: any, context: RoutingContext): Promise<any> {
    this.log('Adding tag', { parameters: action.parameters, method: 'executeAddTag' });
    return { tagAdded: true, tag: action.parameters.tag };
  }

  /**
   * Execute remove tag action
   */
  private async executeRemoveTag(action: any, context: RoutingContext): Promise<any> {
    this.log('Removing tag', { parameters: action.parameters, method: 'executeRemoveTag' });
    return { tagRemoved: true, tag: action.parameters.tag };
  }

  /**
   * Execute log event action
   */
  private async executeLogEvent(action: any, context: RoutingContext): Promise<any> {
    this.log('Event logged', { eventType: action.parameters.event, method: 'executeLogEvent' });
    return { logged: true };
  }

  /**
   * Create evaluation result
   */
  private createEvaluationResult(
    rule: RoutingRule,
    matched: boolean,
    result: boolean,
    confidence: number,
    conditionEvalTime: number = 0,
    conditionsEvaluated: number = 0,
    conditionsMatched: number = 0,
    executionResults?: RoutingResult['executionResults'],
    totalExecutionTime: number = 0
  ): RoutingResult {
    return {
      routingRuleId: rule.routingId,
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
  private updateRuleMetrics(ruleId: string, result: RoutingResult, evaluationTime: number): void {
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
  private getCacheKey(rule: RoutingRule, context: RoutingContext): string {
    return `${rule.routingId}_${context.requestId}_${context.model?.modelId || 'unknown'}_${JSON.stringify(context.request)}`;
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
      this.log('Cache cleanup completed', {
        entriesRemoved: keysToDelete.length,
        method: 'cleanupCache'
      });
    }
  }

  /**
   * Check if schedule is currently active
   */
  private isScheduleActive(schedule: RoutingSchedule): boolean {
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
  private async handleRuleEvaluation(message: Message): Promise<MessageResponse> {
    this.log('Handling rule evaluation request', { method: 'handleRuleEvaluation' });

    const context: RoutingContext = message.payload?.context;
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
  private async handleScheduleStatus(message: Message): Promise<MessageResponse> {
    this.log('Handling schedule status request', { method: 'handleScheduleStatus' });

    const modelId = message.payload?.modelId;
    const scheduleStatus: Record<string, boolean> = {};

    if (modelId) {
      scheduleStatus[modelId] = await this.isRouteScheduled(modelId);
    } else {
      for (const modelId of this.schedules.keys()) {
        scheduleStatus[modelId] = await this.isRouteScheduled(modelId);
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
  private async handleRuleMetrics(message: Message): Promise<MessageResponse> {
    this.log('Handling rule metrics request', { method: 'handleRuleMetrics' });

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

  /**
   * Setup fallback routing for unconfigured routes
   */
  private async setupFallbackRouting(moduleInfo: any): Promise<void> {
    this.log('Setting up fallback routing for module', {
      moduleId: moduleInfo.moduleId,
      moduleType: moduleInfo.moduleType,
      method: 'setupFallbackRouting'
    });

    try {
      // Check if we have a default route configured
      const defaultRouteId = this.getDefaultRouteId();
      if (!defaultRouteId) {
        this.log('No default route configured, skipping fallback setup', { method: 'setupFallbackRouting' });
        return;
      }

      // Ensure the default route has proper fallback rules
      const existingRule = this.rules.get(defaultRouteId);
      if (!existingRule) {
        // Create a default fallback rule
        const fallbackRule: RoutingRule = {
          routingId: `${defaultRouteId}-fallback`,
          name: `Default Fallback for ${defaultRouteId}`,
          description: 'Automatically created fallback rule for unconfigured requests',
          conditions: [
            {
              field: 'route',
              operator: 'exists',
              value: true
            }
          ],
          actions: [{
            type: 'route_to_model',
            parameters: {
              priority: 1000, // Lowest priority
              fallback: true
            }
          }],
          priority: 'low' as RoutingPriority,
          enabled: true,
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        };

        this.rules.set(defaultRouteId, fallbackRule);
        this.log('Created fallback rule for route', {
          routeId: defaultRouteId,
          ruleId: fallbackRule.routingId,
          method: 'setupFallbackRouting'
        });
      }

      // Initialize metrics for the fallback rule
      if (!this.ruleMetrics.has(defaultRouteId)) {
        this.ruleMetrics.set(defaultRouteId, {
          routingRuleId: defaultRouteId,
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
      }

      this.log('Fallback routing setup completed successfully', {
        moduleId: moduleInfo.moduleId,
        defaultRouteId,
        ruleCount: this.rules.size,
        method: 'setupFallbackRouting'
      });

    } catch (error) {
      this.error('Failed to setup fallback routing', { error: error instanceof Error ? error.message : String(error), method: 'setupFallbackRouting' });
      throw error;
    }
  }

  /**
   * Get the default route ID
   */
  private getDefaultRouteId(): string | null {
    // First check if there's a rule with 'default' in the name
    for (const [ruleId, rule] of this.rules) {
      if (rule.name.toLowerCase().includes('default') || rule.routingId === 'default') {
        return ruleId;
      }
    }

    // If no default rule, use the first rule as fallback
    if (this.rules.size > 0) {
      const firstKey = this.rules.keys().next().value;
      return firstKey ?? 'default-route';
    }

    // If no rules exist, create a default one
    return 'default-route';
  }

  /**
   * Get routing metrics
   */
  public getRoutingMetrics(ruleId?: string): RoutingMetrics[] {
    if (ruleId) {
      const metrics = this.ruleMetrics.get(ruleId);
      return metrics ? [metrics] : [];
    }

    return Array.from(this.ruleMetrics.values());
  }
}