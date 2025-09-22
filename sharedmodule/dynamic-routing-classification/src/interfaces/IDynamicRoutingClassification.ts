// Interface definitions for RCC Dynamic Routing Classification Module

import {
  RoutingRule,
  RoutingCondition,
  RoutingAction,
  RoutingSchedule,
  RoutingContext,
  RoutingResult,
  RoutingMetrics
} from '../types/DynamicRoutingTypes';

/**
 * Dynamic Routing Classification Module interface
 */
export interface IDynamicRoutingClassification {
  /**
   * Initialize the rules module with configuration
   */
  configure(config: any): void;

  /**
   * Load rules from configuration file
   */
  loadRules(rulesPath: string): Promise<void>;

  /**
   * Add a new routing rule
   */
  addRule(rule: RoutingRule): Promise<void>;

  /**
   * Remove a routing rule
   */
  removeRule(ruleId: string): Promise<void>;

  /**
   * Update an existing routing rule
   */
  updateRule(ruleId: string, updates: Partial<RoutingRule>): Promise<void>;

  /**
   * Get all routing rules
   */
  getRules(): RoutingRule[];

  /**
   * Get routing rule by ID
   */
  getRule(ruleId: string): RoutingRule | undefined;

  /**
   * Evaluate routing rules against context
   */
  evaluateRules(context: RoutingContext): Promise<RoutingResult[]>;

  /**
   * Get routing schedule for model
   */
  getRoutingSchedule(modelId: string): RoutingSchedule | undefined;

  /**
   * Set routing schedule for model
   */
  setRoutingSchedule(modelId: string, schedule: RoutingSchedule): Promise<void>;

  /**
   * Get active routing rules for model
   */
  getActiveRules(modelId: string): RoutingRule[];

  /**
   * Enable/disable rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): Promise<void>;

  /**
   * Get routing rule metrics
   */
  getRoutingMetrics(ruleId?: string): RoutingMetrics[];
}

/**
 * Rule Engine interface
 */
export interface IRuleEngine {
  /**
   * Start the rule engine
   */
  start(): Promise<void>;

  /**
   * Stop the rule engine
   */
  stop(): Promise<void>;

  /**
   * Register a routing rule
   */
  registerRule(rule: RoutingRule): Promise<void>;

  /**
   * Unregister a rule
   */
  unregisterRule(ruleId: string): Promise<void>;

  /**
   * Process routing context
   */
  processContext(context: RoutingContext): Promise<RoutingResult[]>;

  /**
   * Get engine status
   */
  getStatus(): any;

  /**
   * Get engine metrics
   */
  getMetrics(): any;
}

/**
 * Request Routing Scheduler interface
 */
export interface IRequestRoutingScheduler {
  /**
   * Schedule model for request routing
   */
  scheduleModel(modelId: string, schedule: RoutingSchedule): Promise<void>;

  /**
   * Remove model routing schedule
   */
  removeSchedule(modelId: string): Promise<void>;

  /**
   * Get next routing execution time for model
   */
  getNextExecutionTime(modelId: string): number | undefined;

  /**
   * Check if model should route requests now
   */
  shouldRunNow(modelId: string): boolean;

  /**
   * Get all scheduled models for routing
   */
  getScheduledModels(): string[];

  /**
   * Update routing schedule
   */
  updateSchedule(modelId: string, updates: Partial<RoutingSchedule>): Promise<void>;
}

/**
 * Rule Evaluator interface
 */
export interface IRuleEvaluator {
  /**
   * Evaluate a single routing condition
   */
  evaluateCondition(condition: RoutingCondition, context: RoutingContext): Promise<boolean>;

  /**
   * Evaluate a routing rule
   */
  evaluateRule(rule: RoutingRule, context: RoutingContext): Promise<boolean>;

  /**
   * Execute routing action
   */
  executeAction(action: RoutingAction, context: RoutingContext): Promise<any>;

  /**
   * Batch evaluate routing conditions
   */
  batchEvaluateConditions(conditions: RoutingCondition[], context: RoutingContext): Promise<boolean[]>;

  /**
   * Get routing evaluation metrics
   */
  getEvaluationMetrics(): any;

  /**
   * Add custom routing condition evaluator
   */
  addConditionEvaluator(type: string, evaluator: (condition: RoutingCondition, context: RoutingContext) => Promise<boolean>): void;

  /**
   * Add custom routing action executor
   */
  addActionExecutor(type: string, executor: (action: RoutingAction, context: RoutingContext) => Promise<any>): void;
}