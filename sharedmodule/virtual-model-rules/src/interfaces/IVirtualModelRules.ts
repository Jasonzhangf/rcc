// Interface definitions for RCC Virtual Model Rules Module

import { BaseModule } from 'rcc-basemodule';
import { 
  VirtualModelRule, 
  RuleCondition, 
  RuleAction, 
  ModelSchedule, 
  EvaluationContext, 
  EvaluationResult 
} from '../types/VirtualModelRulesTypes';

/**
 * Virtual Model Rules Module interface
 */
export interface IVirtualModelRulesModule extends BaseModule {
  /**
   * Initialize the rules module with configuration
   */
  configure(config: any): void;

  /**
   * Load rules from configuration file
   */
  loadRules(rulesPath: string): Promise<void>;

  /**
   * Add a new virtual model rule
   */
  addRule(rule: VirtualModelRule): Promise<void>;

  /**
   * Remove a virtual model rule
   */
  removeRule(ruleId: string): Promise<void>;

  /**
   * Update an existing rule
   */
  updateRule(ruleId: string, updates: Partial<VirtualModelRule>): Promise<void>;

  /**
   * Get all rules
   */
  getRules(): VirtualModelRule[];

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): VirtualModelRule | undefined;

  /**
   * Evaluate rules against context
   */
  evaluateRules(context: EvaluationContext): Promise<EvaluationResult[]>;

  /**
   * Get model schedule
   */
  getModelSchedule(modelId: string): ModelSchedule | undefined;

  /**
   * Set model schedule
   */
  setModelSchedule(modelId: string, schedule: ModelSchedule): Promise<void>;

  /**
   * Get active rules for model
   */
  getActiveRules(modelId: string): VirtualModelRule[];

  /**
   * Enable/disable rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): Promise<void>;

  /**
   * Get rule metrics
   */
  getRuleMetrics(ruleId: string): any;
}

/**
 * Rule Engine interface
 */
export interface IRuleEngine extends BaseModule {
  /**
   * Start the rule engine
   */
  start(): Promise<void>;

  /**
   * Stop the rule engine
   */
  stop(): Promise<void>;

  /**
   * Register a rule
   */
  registerRule(rule: VirtualModelRule): Promise<void>;

  /**
   * Unregister a rule
   */
  unregisterRule(ruleId: string): Promise<void>;

  /**
   * Process evaluation context
   */
  processContext(context: EvaluationContext): Promise<EvaluationResult[]>;

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
 * Model Scheduler interface
 */
export interface IModelScheduler extends BaseModule {
  /**
   * Schedule model for execution
   */
  scheduleModel(modelId: string, schedule: ModelSchedule): Promise<void>;

  /**
   * Remove model schedule
   */
  removeSchedule(modelId: string): Promise<void>;

  /**
   * Get next execution time for model
   */
  getNextExecutionTime(modelId: string): number | undefined;

  /**
   * Check if model should run now
   */
  shouldRunNow(modelId: string): boolean;

  /**
   * Get all scheduled models
   */
  getScheduledModels(): string[];

  /**
   * Update schedule
   */
  updateSchedule(modelId: string, updates: Partial<ModelSchedule>): Promise<void>;
}

/**
 * Rule Evaluator interface
 */
export interface IRuleEvaluator extends BaseModule {
  /**
   * Evaluate a single condition
   */
  evaluateCondition(condition: RuleCondition, context: EvaluationContext): Promise<boolean>;

  /**
   * Evaluate a rule
   */
  evaluateRule(rule: VirtualModelRule, context: EvaluationContext): Promise<boolean>;

  /**
   * Execute rule action
   */
  executeAction(action: RuleAction, context: EvaluationContext): Promise<any>;

  /**
   * Batch evaluate conditions
   */
  batchEvaluateConditions(conditions: RuleCondition[], context: EvaluationContext): Promise<boolean[]>;

  /**
   * Get evaluation metrics
   */
  getEvaluationMetrics(): any;

  /**
   * Add custom condition evaluator
   */
  addConditionEvaluator(type: string, evaluator: (condition: RuleCondition, context: EvaluationContext) => Promise<boolean>): void;

  /**
   * Add custom action executor
   */
  addActionExecutor(type: string, executor: (action: RuleAction, context: EvaluationContext) => Promise<any>): void;
}