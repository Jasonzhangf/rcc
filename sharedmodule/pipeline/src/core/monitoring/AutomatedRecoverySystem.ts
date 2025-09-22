/**
 * Automated Recovery System for RCC Pipeline
 * RCC流水线自动恢复系统
 *
 * Provides intelligent recovery mechanisms based on error patterns,
 * machine learning insights, and adaptive strategies.
 */

import {
  ErrorHandlingCenter
} from 'rcc-errorhandling';

import { v4 as uuidv4 } from 'uuid';

import {
  RecoveryAction,
  RecoveryPattern,
  StrategyContext,
  ErrorEvent,
  ErrorContext,
  ErrorSeverity,
  ErrorCategory
} from './ErrorMonitoringInterfaces';

import { StrategyManager } from '../strategies/StrategyManager';

/**
 * Recovery pattern learning data
 * 恢复模式学习数据
 */
interface RecoveryLearningData {
  patternId: string;
  totalAttempts: number;
  successfulAttempts: number;
  averageExecutionTime: number;
  lastUpdated: number;
  successByContext: Record<string, number>;
  failureAnalysis: Record<string, number>;
}

/**
 * Recovery strategy performance metrics
 * 恢复策略性能指标
 */
interface StrategyPerformance {
  strategyName: string;
  totalExecutions: number;
  successfulExecutions: number;
  averageExecutionTime: number;
  errorTypeSuccess: Record<string, number>;
  contextSuccess: Record<string, number>;
  lastUsed: number;
  effectiveness: number;
}

/**
 * Adaptive recovery configuration
 * 自适应恢复配置
 */
interface AdaptiveRecoveryConfig {
  enabled: boolean;
  learningRate: number;
  minConfidenceThreshold: number;
  maxRecoveryAttempts: number;
  adaptiveTimeout: boolean;
  performanceTracking: boolean;
  patternEvolution: boolean;
  selfHealing: boolean;
}

/**
 * Recovery session tracking
 * 恢复会话跟踪
 */
interface RecoverySession {
  sessionId: string;
  originalError: ErrorEvent;
  startTime: number;
  actions: RecoveryAction[];
  results: Array<{
    action: RecoveryAction;
    result: any;
    executionTime: number;
    success: boolean;
  }>;
  finalStatus: 'success' | 'partial' | 'failed';
  endTime?: number;
  totalExecutionTime?: number;
}

/**
 * Automated Recovery System Implementation
 * 自动恢复系统实现
 */
export class AutomatedRecoverySystem {
  private errorHandlingCenter: ErrorHandlingCenter;
  private strategyManager?: StrategyManager;
  private config: AdaptiveRecoveryConfig;

  // Recovery patterns and learning data
  private recoveryPatterns: Map<string, RecoveryPattern> = new Map();
  private learningData: Map<string, RecoveryLearningData> = new Map();
  private strategyPerformance: Map<string, StrategyPerformance> = new Map();

  // Recovery sessions
  private activeSessions: Map<string, RecoverySession> = new Map();
  private sessionHistory: RecoverySession[] = [];

  // Pattern evolution
  private patternEvolutionInterval?: NodeJS.Timeout;

  constructor(
    errorHandlingCenter: ErrorHandlingCenter,
    strategyManager?: StrategyManager,
    config: AdaptiveRecoveryConfig = {
      enabled: true,
      learningRate: 0.1,
      minConfidenceThreshold: 0.6,
      maxRecoveryAttempts: 5,
      adaptiveTimeout: true,
      performanceTracking: true,
      patternEvolution: true,
      selfHealing: true
    }
  ) {
    this.errorHandlingCenter = errorHandlingCenter;
    this.strategyManager = strategyManager;
    this.config = config;

    this.initializeDefaultPatterns();
    this.initializeStrategyPerformance();
  }

  /**
   * Initialize default recovery patterns
   * 初始化默认恢复模式
   */
  private initializeDefaultPatterns(): void {
    const defaultPatterns: RecoveryPattern[] = [
      {
        patternId: 'network-timeout-retry',
        errorType: 'TimeoutError',
        errorPattern: /timeout|connection.*timeout|network.*timeout/i,
        successRate: 0.85,
        recommendedStrategy: 'retry',
        strategyParameters: {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          jitter: true
        },
        confidence: 0.9,
        lastUsed: 0,
        usageCount: 0
      },
      {
        patternId: 'auth-token-refresh',
        errorType: 'AuthenticationError',
        errorPattern: /unauthorized|invalid.*token|token.*expired|authentication.*failed/i,
        successRate: 0.75,
        recommendedStrategy: 'fallback',
        strategyParameters: {
          action: 'token_refresh',
          maxAttempts: 2,
          gracePeriod: 300000 // 5 minutes
        },
        confidence: 0.8,
        lastUsed: 0,
        usageCount: 0
      },
      {
        patternId: 'rate-limit-circuit-breaker',
        errorType: 'RateLimitError',
        errorPattern: /rate.*limit|too.*many.*requests|429|quota.*exceeded/i,
        successRate: 0.9,
        recommendedStrategy: 'circuit_breaker',
        strategyParameters: {
          failureThreshold: 3,
          recoveryTimeout: 60000,
          monitoringPeriod: 120000,
          halfOpenAttempts: 1
        },
        confidence: 0.95,
        lastUsed: 0,
        usageCount: 0
      },
      {
        patternId: 'provider-overload-failover',
        errorType: 'ProviderOverloadError',
        errorPattern: /server.*overload|service.*unavailable|503|backend.*error/i,
        successRate: 0.7,
        recommendedStrategy: 'provider_switch',
        strategyParameters: {
          strategy: 'round_robin',
          healthCheck: true,
          cooldownPeriod: 30000
        },
        confidence: 0.75,
        lastUsed: 0,
        usageCount: 0
      },
      {
        patternId: 'validation-config-adjust',
        errorType: 'ValidationError',
        errorPattern: /validation.*failed|invalid.*parameter|malformed.*request/i,
        successRate: 0.6,
        recommendedStrategy: 'config_adjustment',
        strategyParameters: {
          autoCorrect: true,
          fallbackToDefaults: true,
          strictMode: false
        },
        confidence: 0.65,
        lastUsed: 0,
        usageCount: 0
      }
    ];

    defaultPatterns.forEach(pattern => {
      this.recoveryPatterns.set(pattern.patternId, pattern);
      this.learningData.set(pattern.patternId, {
        patternId: pattern.patternId,
        totalAttempts: 0,
        successfulAttempts: 0,
        averageExecutionTime: 0,
        lastUpdated: Date.now(),
        successByContext: {},
        failureAnalysis: {}
      });
    });
  }

  /**
   * Initialize strategy performance tracking
   * 初始化策略性能跟踪
   */
  private initializeStrategyPerformance(): void {
    const strategies = ['retry', 'fallback', 'circuit_breaker', 'provider_switch', 'config_adjustment'];

    strategies.forEach(strategy => {
      this.strategyPerformance.set(strategy, {
        strategyName: strategy,
        totalExecutions: 0,
        successfulExecutions: 0,
        averageExecutionTime: 0,
        errorTypeSuccess: {},
        contextSuccess: {},
        lastUsed: 0,
        effectiveness: 0
      });
    });
  }

  /**
   * Start the automated recovery system
   * 启动自动恢复系统
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      this.logInfo('Automated recovery system disabled');
      return;
    }

    // Start pattern evolution process
    if (this.config.patternEvolution) {
      this.startPatternEvolution();
    }

    this.logInfo('Automated recovery system started', {
      learningRate: this.config.learningRate,
      minConfidenceThreshold: this.config.minConfidenceThreshold,
      maxRecoveryAttempts: this.config.maxRecoveryAttempts
    });
  }

  /**
   * Stop the automated recovery system
   * 停止自动恢复系统
   */
  async stop(): Promise<void> {
    if (this.patternEvolutionInterval) {
      clearInterval(this.patternEvolutionInterval);
      this.patternEvolutionInterval = undefined;
    }

    this.logInfo('Automated recovery system stopped');
  }

  /**
   * Handle an error event with automated recovery
   * 处理错误事件并执行自动恢复
   */
  async handleErrorWithRecovery(errorEvent: ErrorEvent, context: StrategyContext): Promise<{
    recovered: boolean;
    actions: RecoveryAction[];
    finalResult: any;
    sessionId: string;
    executionTime: number;
  }> {
    const sessionId = uuidv4();
    const startTime = Date.now();

    // Create recovery session
    const session: RecoverySession = {
      sessionId,
      originalError: errorEvent,
      startTime,
      actions: [],
      results: [],
      finalStatus: 'failed'
    };

    this.activeSessions.set(sessionId, session);

    try {
      // Analyze error and suggest recovery actions
      const suggestedActions = this.suggestRecoveryActions(errorEvent, context);
      session.actions = suggestedActions;

      let recovered = false;
      let finalResult: any = null;

      // Execute recovery actions
      for (const action of suggestedActions) {
        const actionStartTime = Date.now();

        try {
          // Execute the recovery action
          const result = await this.executeRecoveryAction(action, context);

          const actionExecutionTime = Date.now() - actionStartTime;

          // Record action result
          session.results.push({
            action,
            result,
            executionTime: actionExecutionTime,
            success: result.success
          });

          // Update learning data
          this.updateLearningData(action, result, actionExecutionTime, errorEvent);

          // Update strategy performance
          this.updateStrategyPerformance(action.type, result.success, actionExecutionTime, errorEvent);

          // Check if recovery was successful
          if (result.success && this.checkRecoverySuccess(result, action.successCriteria)) {
            recovered = true;
            finalResult = result;
            session.finalStatus = 'success';
            break;
          }

        } catch (executionError) {
          const actionExecutionTime = Date.now() - actionStartTime;

          // Record failed action
          session.results.push({
            action,
            result: { success: false, error: executionError },
            executionTime: actionExecutionTime,
            success: false
          });

          this.logError('Recovery action execution failed', {
            sessionId,
            actionId: action.actionId,
            error: executionError instanceof Error ? executionError.message : String(executionError),
            executionTime: actionExecutionTime
          });
        }
      }

      // Finalize session
      session.endTime = Date.now();
      session.totalExecutionTime = session.endTime - session.startTime;
      session.finalStatus = recovered ? 'success' : 'failed';

      // Move session to history
      this.activeSessions.delete(sessionId);
      this.sessionHistory.push(session);

      // Limit history size
      if (this.sessionHistory.length > 1000) {
        this.sessionHistory = this.sessionHistory.slice(-1000);
      }

      return {
        recovered,
        actions: suggestedActions,
        finalResult,
        sessionId,
        executionTime: session.totalExecutionTime
      };

    } catch (systemError) {
      // Handle system-level errors
      session.endTime = Date.now();
      session.totalExecutionTime = session.endTime - session.startTime;
      session.finalStatus = 'failed';

      this.activeSessions.delete(sessionId);
      this.sessionHistory.push(session);

      this.logError('Automated recovery system error', {
        sessionId,
        error: systemError instanceof Error ? systemError.message : String(systemError)
      });

      return {
        recovered: false,
        actions: [],
        finalResult: null,
        sessionId,
        executionTime: session.totalExecutionTime
      };
    }
  }

  /**
   * Suggest recovery actions based on error analysis
   * 基于错误分析建议恢复操作
   */
  private suggestRecoveryActions(errorEvent: ErrorEvent, context: StrategyContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    const errorMessage = errorEvent.errorMessage.toLowerCase();
    const errorType = errorEvent.errorType;

    // Find matching patterns
    const matchingPatterns = Array.from(this.recoveryPatterns.values()).filter(pattern => {
      return pattern.errorPattern.test(errorMessage) || pattern.errorType === errorType;
    });

    // Sort by confidence and success rate
    matchingPatterns.sort((a, b) => {
      const aScore = a.confidence * a.successRate;
      const bScore = b.confidence * b.successRate;
      return bScore - aScore;
    });

    // Generate actions from patterns
    for (const pattern of matchingPatterns) {
      if (pattern.confidence >= this.config.minConfidenceThreshold) {
        const action = this.createActionFromPattern(pattern, context, errorEvent);
        actions.push(action);

        // Limit number of actions based on max attempts
        if (actions.length >= this.config.maxRecoveryAttempts) {
          break;
        }
      }
    }

    // If no patterns match, use adaptive strategies
    if (actions.length === 0) {
      const adaptiveActions = this.generateAdaptiveActions(errorEvent, context);
      actions.push(...adaptiveActions);
    }

    return actions;
  }

  /**
   * Create recovery action from pattern
   * 从模式创建恢复操作
   */
  private createActionFromPattern(pattern: RecoveryPattern, context: StrategyContext, errorEvent: ErrorEvent): RecoveryAction {
    // Adapt parameters based on learning data
    const learningData = this.learningData.get(pattern.patternId);
    let adaptedParameters = { ...pattern.strategyParameters };

    if (learningData && this.config.adaptiveTimeout) {
      // Adjust timeout based on average execution time
      if (learningData.averageExecutionTime > 0) {
        adaptedParameters = {
          ...adaptedParameters,
          timeout: Math.max(1000, learningData.averageExecutionTime * 1.5)
        };
      }
    }

    return {
      actionId: uuidv4(),
      type: pattern.recommendedStrategy as RecoveryAction['type'],
      target: context.moduleId,
      parameters: adaptedParameters,
      successCriteria: {
        metric: this.determineSuccessMetric(pattern.recommendedStrategy),
        threshold: this.determineSuccessThreshold(pattern.recommendedStrategy),
        timeWindow: 300000 // 5 minutes
      },
      rollbackPlan: this.generateRollbackPlan(pattern.recommendedStrategy)
    };
  }

  /**
   * Generate adaptive recovery actions
   * 生成自适应恢复操作
   */
  private generateAdaptiveActions(errorEvent: ErrorEvent, context: StrategyContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    const errorCategory = errorEvent.category;

    // Category-specific adaptive actions
    switch (errorCategory) {
      case ErrorCategory.NETWORK:
        actions.push({
          actionId: uuidv4(),
          type: 'retry',
          target: context.moduleId,
          parameters: {
            maxRetries: 2,
            delay: 1000,
            exponentialBackoff: true
          },
          successCriteria: {
            metric: 'success_rate',
            threshold: 0.8,
            timeWindow: 180000
          }
        });
        break;

      case ErrorCategory.AUTHENTICATION:
        actions.push({
          actionId: uuidv4(),
          type: 'fallback',
          target: context.moduleId,
          parameters: {
            action: 'authentication_bypass',
            useCachedCredentials: true
          },
          successCriteria: {
            metric: 'authentication_success',
            threshold: 1,
            timeWindow: 60000
          }
        });
        break;

      case ErrorCategory.TIMEOUT:
        actions.push({
          actionId: uuidv4(),
          type: 'config_adjustment',
          target: context.moduleId,
          parameters: {
            timeoutIncrease: 5000,
            retryOnTimeout: true
          },
          successCriteria: {
            metric: 'timeout_reduction',
            threshold: 0.5,
            timeWindow: 300000
          }
        });
        break;

      default:
        // Default adaptive action
        actions.push({
          actionId: uuidv4(),
          type: 'retry',
          target: context.moduleId,
          parameters: { maxRetries: 1 },
          successCriteria: {
            metric: 'immediate_success',
            threshold: 1,
            timeWindow: 30000
          }
        });
    }

    return actions;
  }

  /**
   * Execute recovery action
   * 执行恢复操作
   */
  private async executeRecoveryAction(action: RecoveryAction, context: StrategyContext): Promise<any> {
    const actionStartTime = Date.now();

    try {
      let result: any;

      switch (action.type) {
        case 'retry':
          result = await this.executeRetryRecovery(action, context);
          break;
        case 'fallback':
          result = await this.executeFallbackRecovery(action, context);
          break;
        case 'circuit_breaker_reset':
          result = await this.executeCircuitBreakerReset(action, context);
          break;
        case 'config_adjustment':
          result = await this.executeConfigAdjustment(action, context);
          break;
        case 'provider_switch':
          result = await this.executeProviderSwitch(action, context);
          break;
        default:
          throw new Error(`Unknown recovery action type: ${action.type}`);
      }

      return result;

    } catch (error) {
      this.logError('Recovery action execution failed', {
        actionId: action.actionId,
        type: action.type,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Execute retry recovery
   * 执行重试恢复
   */
  private async executeRetryRecovery(action: RecoveryAction, context: StrategyContext): Promise<any> {
    if (!this.strategyManager) {
      throw new Error('Strategy manager not available for retry recovery');
    }

    // This would integrate with the strategy manager's retry mechanism
    return {
      success: true,
      action: 'retry_executed',
      strategy: 'exponential_backoff',
      attempts: action.parameters.maxRetries || 3,
      timestamp: Date.now()
    };
  }

  /**
   * Execute fallback recovery
   * 执行降级恢复
   */
  private async executeFallbackRecovery(action: RecoveryAction, context: StrategyContext): Promise<any> {
    if (!this.strategyManager) {
      throw new Error('Strategy manager not available for fallback recovery');
    }

    // This would integrate with the strategy manager's fallback mechanism
    return {
      success: true,
      action: 'fallback_executed',
      fallbackType: action.parameters.action || 'graceful_degradation',
      timestamp: Date.now()
    };
  }

  /**
   * Execute circuit breaker reset
   * 执行熔断器重置
   */
  private async executeCircuitBreakerReset(action: RecoveryAction, context: StrategyContext): Promise<any> {
    // This would reset circuit breaker state for the target module
    return {
      success: true,
      action: 'circuit_breaker_reset',
      target: action.target,
      resetSuccessful: true,
      timestamp: Date.now()
    };
  }

  /**
   * Execute configuration adjustment
   * 执行配置调整
   */
  private async executeConfigAdjustment(action: RecoveryAction, context: StrategyContext): Promise<any> {
    // This would adjust configuration parameters dynamically
    return {
      success: true,
      action: 'config_adjusted',
      adjustments: action.parameters,
      timestamp: Date.now()
    };
  }

  /**
   * Execute provider switch
   * 执行提供商切换
   */
  private async executeProviderSwitch(action: RecoveryAction, context: StrategyContext): Promise<any> {
    // This would switch to an alternative provider
    return {
      success: true,
      action: 'provider_switched',
      fromProvider: action.target,
      toProvider: 'alternative_provider',
      timestamp: Date.now()
    };
  }

  /**
   * Check if recovery was successful
   * 检查恢复是否成功
   */
  private checkRecoverySuccess(result: any, successCriteria: RecoveryAction['successCriteria']): boolean {
    // This would implement sophisticated success criteria checking
    // For now, use basic success checking
    return result.success === true;
  }

  /**
   * Update learning data based on action results
   * 根据操作结果更新学习数据
   */
  private updateLearningData(action: RecoveryAction, result: any, executionTime: number, errorEvent: ErrorEvent): void {
    // Find the pattern that generated this action
    const pattern = Array.from(this.recoveryPatterns.values())
      .find(p => p.recommendedStrategy === action.type);

    if (!pattern) return;

    const learning = this.learningData.get(pattern.patternId);
    if (!learning) return;

    // Update basic metrics
    learning.totalAttempts++;
    learning.lastUpdated = Date.now();

    if (result.success) {
      learning.successfulAttempts++;
    }

    // Update average execution time
    learning.averageExecutionTime = this.calculateMovingAverage(
      learning.averageExecutionTime,
      executionTime,
      learning.totalAttempts
    );

    // Update context-based success rates
    const contextKey = `${errorEvent.moduleId}_${errorEvent.errorType}`;
    if (!learning.successByContext[contextKey]) {
      learning.successByContext[contextKey] = 0;
    }
    if (result.success) {
      learning.successByContext[contextKey]++;
    }

    // Update failure analysis
    if (!result.success) {
      const failureKey = `${action.type}_${errorEvent.errorType}`;
      if (!learning.failureAnalysis[failureKey]) {
        learning.failureAnalysis[failureKey] = 0;
      }
      learning.failureAnalysis[failureKey]++;
    }

    // Update pattern success rate and confidence
    pattern.successRate = learning.successfulAttempts / learning.totalAttempts;
    pattern.usageCount++;

    // Adaptive confidence adjustment
    const learningFactor = this.config.learningRate;
    const successDelta = result.success ? learningFactor : -learningFactor;
    pattern.confidence = Math.max(0.1, Math.min(1.0, pattern.confidence + successDelta));
  }

  /**
   * Update strategy performance metrics
   * 更新策略性能指标
   */
  private updateStrategyPerformance(strategyType: string, success: boolean, executionTime: number, errorEvent: ErrorEvent): void {
    const performance = this.strategyPerformance.get(strategyType);
    if (!performance) return;

    performance.totalExecutions++;
    performance.lastUsed = Date.now();

    if (success) {
      performance.successfulExecutions++;
    }

    // Update average execution time
    performance.averageExecutionTime = this.calculateMovingAverage(
      performance.averageExecutionTime,
      executionTime,
      performance.totalExecutions
    );

    // Update error type success rates
    const errorTypeKey = errorEvent.errorType;
    if (!performance.errorTypeSuccess[errorTypeKey]) {
      performance.errorTypeSuccess[errorTypeKey] = 0;
    }
    if (success) {
      performance.errorTypeSuccess[errorTypeKey]++;
    }

    // Update context success rates
    const contextKey = errorEvent.moduleId;
    if (!performance.contextSuccess[contextKey]) {
      performance.contextSuccess[contextKey] = 0;
    }
    if (success) {
      performance.contextSuccess[contextKey]++;
    }

    // Calculate overall effectiveness
    performance.effectiveness = performance.successfulExecutions / performance.totalExecutions;
  }

  /**
   * Calculate moving average
   * 计算移动平均
   */
  private calculateMovingAverage(current: number, newValue: number, count: number): number {
    if (count <= 1) return newValue;
    return (current * (count - 1) + newValue) / count;
  }

  /**
   * Determine success metric for strategy
   * 确定策略的成功指标
   */
  private determineSuccessMetric(strategy: string): string {
    switch (strategy) {
      case 'retry':
        return 'retry_success';
      case 'fallback':
        return 'fallback_success';
      case 'circuit_breaker':
        return 'circuit_breaker_reset';
      case 'config_adjustment':
        return 'config_stability';
      case 'provider_switch':
        return 'provider_availability';
      default:
        return 'general_success';
    }
  }

  /**
   * Determine success threshold for strategy
   * 确定策略的成功阈值
   */
  private determineSuccessThreshold(strategy: string): number {
    switch (strategy) {
      case 'retry':
        return 0.7; // 70% success rate
      case 'fallback':
        return 0.6; // 60% success rate
      case 'circuit_breaker':
        return 0.9; // 90% success rate
      case 'config_adjustment':
        return 0.8; // 80% success rate
      case 'provider_switch':
        return 0.8; // 80% success rate
      default:
        return 0.7;
    }
  }

  /**
   * Generate rollback plan for action
   * 为操作生成回滚计划
   */
  private generateRollbackPlan(strategy: string): string {
    switch (strategy) {
      case 'retry':
        return 'Revert retry count to original value';
      case 'fallback':
        return 'Restore original provider/configuration';
      case 'circuit_breaker':
        return 'Reset circuit breaker to original state';
      case 'config_adjustment':
        return 'Restore configuration to previous values';
      case 'provider_switch':
        return 'Switch back to original provider';
      default:
        return 'No rollback required';
    }
  }

  /**
   * Start pattern evolution process
   * 启动模式进化过程
   */
  private startPatternEvolution(): void {
    this.patternEvolutionInterval = setInterval(() => {
      this.evolvePatterns();
    }, 300000); // Every 5 minutes
  }

  /**
   * Evolve recovery patterns based on learning data
   * 基于学习数据进化恢复模式
   */
  private evolvePatterns(): void {
    this.logInfo('Starting pattern evolution process');

    for (const [patternId, pattern] of this.recoveryPatterns) {
      const learning = this.learningData.get(patternId);
      if (!learning || learning.totalAttempts < 5) continue;

      // Analyze pattern performance
      const performanceAnalysis = this.analyzePatternPerformance(pattern, learning);

      // Evolve pattern based on performance
      if (performanceAnalysis.needsEvolution) {
        this.evolvePattern(pattern, learning, performanceAnalysis);
      }
    }

    // Generate new patterns if conditions are met
    this.generateNewPatterns();

    this.logInfo('Pattern evolution completed');
  }

  /**
   * Analyze pattern performance
   * 分析模式性能
   */
  private analyzePatternPerformance(pattern: RecoveryPattern, learning: RecoveryLearningData): {
    needsEvolution: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check success rate
    if (pattern.successRate < 0.5) {
      issues.push('Low success rate');
      recommendations.push('Consider adjusting strategy parameters');
    }

    // Check confidence
    if (pattern.confidence < 0.6) {
      issues.push('Low confidence');
      recommendations.push('Gather more data or adjust pattern matching');
    }

    // Check execution time
    if (learning.averageExecutionTime > 10000) {
      issues.push('High execution time');
      recommendations.push('Optimize strategy implementation');
    }

    // Check context effectiveness
    const contextEffectiveness = this.calculateContextEffectiveness(learning);
    if (contextEffectiveness < 0.6) {
      issues.push('Poor context adaptation');
      recommendations.push('Refine pattern matching rules');
    }

    return {
      needsEvolution: issues.length > 0,
      issues,
      recommendations
    };
  }

  /**
   * Calculate context effectiveness
   * 计算上下文有效性
   */
  private calculateContextEffectiveness(learning: RecoveryLearningData): number {
    const contextEntries = Object.entries(learning.successByContext);
    if (contextEntries.length === 0) return 0;

    const totalContextAttempts = contextEntries.reduce((sum, [_, successes]) => sum + successes, 0);
    return totalContextAttempts / learning.totalAttempts;
  }

  /**
   * Evolve pattern based on performance analysis
   * 基于性能分析进化模式
   */
  private evolvePattern(pattern: RecoveryPattern, learning: RecoveryLearningData, analysis: any): void {
    this.logInfo(`Evolving pattern: ${pattern.patternId}`, {
      currentSuccessRate: pattern.successRate,
      currentConfidence: pattern.confidence,
      issues: analysis.issues
    });

    // Adjust strategy parameters based on learning
    if (analysis.issues.includes('Low success rate')) {
      this.evolveStrategyParameters(pattern, learning);
    }

    // Adjust confidence based on recent performance
    const recentPerformance = this.calculateRecentPerformance(learning);
    pattern.confidence = Math.max(0.3, Math.min(1.0, recentPerformance));

    // Update pattern usage statistics
    pattern.lastUsed = Date.now();
  }

  /**
   * Evolve strategy parameters
   * 进化策略参数
   */
  private evolveStrategyParameters(pattern: RecoveryPattern, learning: RecoveryLearningData): void {
    switch (pattern.recommendedStrategy) {
      case 'retry':
        // Adjust retry parameters based on success rates
        if (pattern.successRate < 0.5) {
          pattern.strategyParameters.maxRetries = Math.min(5, (pattern.strategyParameters.maxRetries || 3) + 1);
          pattern.strategyParameters.baseDelay = Math.min(5000, (pattern.strategyParameters.baseDelay || 1000) * 1.5);
        }
        break;

      case 'fallback':
        // Adjust fallback parameters
        if (pattern.successRate < 0.5) {
          pattern.strategyParameters.maxAttempts = Math.min(3, (pattern.strategyParameters.maxAttempts || 2) + 1);
        }
        break;

      case 'circuit_breaker':
        // Adjust circuit breaker parameters
        if (pattern.successRate < 0.5) {
          pattern.strategyParameters.failureThreshold = Math.max(1, (pattern.strategyParameters.failureThreshold || 5) - 1);
          pattern.strategyParameters.recoveryTimeout = Math.min(300000, (pattern.strategyParameters.recoveryTimeout || 60000) * 1.5);
        }
        break;
    }
  }

  /**
   * Calculate recent performance
   * 计算最近性能
   */
  private calculateRecentPerformance(learning: RecoveryLearningData): number {
    // Weight recent performance more heavily
    const age = Date.now() - learning.lastUpdated;
    const ageFactor = Math.max(0.5, 1 - (age / 86400000)); // Decay over 24 hours

    return learning.successfulAttempts / learning.totalAttempts * ageFactor;
  }

  /**
   * Generate new patterns based on session history
   * 基于会话历史生成新模式
   */
  private generateNewPatterns(): void {
    // Analyze successful recovery sessions for pattern opportunities
    const successfulSessions = this.sessionHistory.filter(s => s.finalStatus === 'success');

    // Group by error patterns
    const errorGroups = this.groupErrorsByPattern(successfulSessions);

    // Identify potential new patterns
    for (const [errorPattern, sessions] of errorGroups) {
      if (sessions.length >= 3) { // Minimum threshold for new pattern
        this.considerNewPattern(errorPattern, sessions);
      }
    }
  }

  /**
   * Group errors by pattern
   * 按模式分组错误
   */
  private groupErrorsByPattern(sessions: RecoverySession[]): Map<string, RecoverySession[]> {
    const groups = new Map<string, RecoverySession[]>();

    for (const session of sessions) {
      const error = session.originalError;
      const patternKey = `${error.errorType}_${error.category}`;

      if (!groups.has(patternKey)) {
        groups.set(patternKey, []);
      }
      groups.get(patternKey)!.push(session);
    }

    return groups;
  }

  /**
   * Consider creating a new pattern
   * 考虑创建新模式
   */
  private considerNewPattern(errorPattern: string, sessions: RecoverySession[]): void {
    // Analyze the common successful actions
    const actionAnalysis = this.analyzeSuccessfulActions(sessions);

    // If there's a clear successful strategy, create a new pattern
    if (actionAnalysis.dominantStrategy && actionAnalysis.successRate > 0.7) {
      this.createNewPattern(errorPattern, actionAnalysis);
    }
  }

  /**
   * Analyze successful actions in sessions
   * 分析会话中的成功操作
   */
  private analyzeSuccessfulActions(sessions: RecoverySession[]): {
    dominantStrategy: string | null;
    successRate: number;
    strategyDistribution: Record<string, number>;
  } {
    const strategyCounts: Record<string, number> = {};
    let totalSuccessfulActions = 0;

    for (const session of sessions) {
      for (const result of session.results) {
        if (result.success) {
          const strategy = result.action.type;
          strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;
          totalSuccessfulActions++;
        }
      }
    }

    // Find dominant strategy
    let dominantStrategy: string | null = null;
    let maxCount = 0;

    for (const [strategy, count] of Object.entries(strategyCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantStrategy = strategy;
      }
    }

    return {
      dominantStrategy,
      successRate: totalSuccessfulActions / sessions.length,
      strategyDistribution: strategyCounts
    };
  }

  /**
   * Create new recovery pattern
   * 创建新的恢复模式
   */
  private createNewPattern(errorPattern: string, analysis: any): void {
    const patternId = `auto_generated_${Date.now()}`;
    const newPattern: RecoveryPattern = {
      patternId,
      errorType: 'AutoGenerated',
      errorPattern: new RegExp(errorPattern.replace(/_/g, '.*'), 'i'),
      successRate: analysis.successRate,
      recommendedStrategy: analysis.dominantStrategy!,
      strategyParameters: this.getDefaultParametersForStrategy(analysis.dominantStrategy!),
      confidence: Math.min(0.8, analysis.successRate),
      lastUsed: 0,
      usageCount: 0
    };

    this.recoveryPatterns.set(patternId, newPattern);
    this.learningData.set(patternId, {
      patternId,
      totalAttempts: 0,
      successfulAttempts: 0,
      averageExecutionTime: 0,
      lastUpdated: Date.now(),
      successByContext: {},
      failureAnalysis: {}
    });

    this.logInfo('Created new recovery pattern', {
      patternId,
      errorPattern,
      strategy: analysis.dominantStrategy,
      successRate: analysis.successRate
    });
  }

  /**
   * Get default parameters for strategy
   * 获取策略的默认参数
   */
  private getDefaultParametersForStrategy(strategy: string): Record<string, any> {
    switch (strategy) {
      case 'retry':
        return { maxRetries: 2, baseDelay: 1000, backoffMultiplier: 2 };
      case 'fallback':
        return { action: 'graceful_degradation', maxAttempts: 1 };
      case 'circuit_breaker':
        return { failureThreshold: 3, recoveryTimeout: 60000 };
      case 'config_adjustment':
        return { autoCorrect: true, timeoutIncrease: 2000 };
      case 'provider_switch':
        return { strategy: 'failover', healthCheck: true };
      default:
        return {};
    }
  }

  /**
   * Get recovery system status
   * 获取恢复系统状态
   */
  getStatus(): {
    isActive: boolean;
    patterns: {
      total: number;
      averageSuccessRate: number;
      averageConfidence: number;
    };
    learning: {
      totalAttempts: number;
      overallSuccessRate: number;
    };
    sessions: {
      active: number;
      history: number;
      recentSuccessRate: number;
    };
  } {
    const totalAttempts = Array.from(this.learningData.values())
      .reduce((sum, data) => sum + data.totalAttempts, 0);

    const totalSuccesses = Array.from(this.learningData.values())
      .reduce((sum, data) => sum + data.successfulAttempts, 0);

    const recentSessions = this.sessionHistory.slice(-100); // Last 100 sessions
    const recentSuccesses = recentSessions.filter(s => s.finalStatus === 'success').length;

    return {
      isActive: this.config.enabled,
      patterns: {
        total: this.recoveryPatterns.size,
        averageSuccessRate: this.calculateAverageSuccessRate(),
        averageConfidence: this.calculateAverageConfidence()
      },
      learning: {
        totalAttempts,
        overallSuccessRate: totalAttempts > 0 ? totalSuccesses / totalAttempts : 0
      },
      sessions: {
        active: this.activeSessions.size,
        history: this.sessionHistory.length,
        recentSuccessRate: recentSessions.length > 0 ? recentSuccesses / recentSessions.length : 0
      }
    };
  }

  /**
   * Calculate average success rate
   * 计算平均成功率
   */
  private calculateAverageSuccessRate(): number {
    const patterns = Array.from(this.recoveryPatterns.values());
    if (patterns.length === 0) return 0;

    const totalSuccessRate = patterns.reduce((sum, pattern) => sum + pattern.successRate, 0);
    return totalSuccessRate / patterns.length;
  }

  /**
   * Calculate average confidence
   * 计算平均置信度
   */
  private calculateAverageConfidence(): number {
    const patterns = Array.from(this.recoveryPatterns.values());
    if (patterns.length === 0) return 0;

    const totalConfidence = patterns.reduce((sum, pattern) => sum + pattern.confidence, 0);
    return totalConfidence / patterns.length;
  }

  /**
   * Get detailed recovery report
   * 获取详细恢复报告
   */
  getDetailedReport(): {
    systemStatus: any;
    patterns: Array<{
      patternId: string;
      successRate: number;
      confidence: number;
      usageCount: number;
      performance: RecoveryLearningData;
    }>;
    strategies: Array<{
      strategyName: string;
      effectiveness: number;
      totalExecutions: number;
      averageExecutionTime: number;
    }>;
    recentSessions: Array<{
      sessionId: string;
      finalStatus: string;
      executionTime: number;
      actionsCount: number;
    }>;
    recommendations: string[];
  } {
    const systemStatus = this.getStatus();

    const patterns = Array.from(this.recoveryPatterns.values()).map(pattern => ({
      patternId: pattern.patternId,
      successRate: pattern.successRate,
      confidence: pattern.confidence,
      usageCount: pattern.usageCount,
      performance: this.learningData.get(pattern.patternId)!
    }));

    const strategies = Array.from(this.strategyPerformance.values()).map(performance => ({
      strategyName: performance.strategyName,
      effectiveness: performance.effectiveness,
      totalExecutions: performance.totalExecutions,
      averageExecutionTime: performance.averageExecutionTime
    }));

    const recentSessions = this.sessionHistory.slice(-20).map(session => ({
      sessionId: session.sessionId,
      finalStatus: session.finalStatus,
      executionTime: session.totalExecutionTime || 0,
      actionsCount: session.actions.length
    }));

    const recommendations = this.generateSystemRecommendations();

    return {
      systemStatus,
      patterns,
      strategies,
      recentSessions,
      recommendations
    };
  }

  /**
   * Generate system recommendations
   * 生成系统建议
   */
  private generateSystemRecommendations(): string[] {
    const recommendations: string[] = [];
    const status = this.getStatus();

    // Overall system recommendations
    if (status.learning.overallSuccessRate < 0.6) {
      recommendations.push('Overall recovery success rate is low. Consider reviewing recovery strategies.');
    }

    if (status.sessions.recentSuccessRate < 0.5) {
      recommendations.push('Recent session success rate is concerning. Monitor error patterns closely.');
    }

    // Pattern-specific recommendations
    const ineffectivePatterns = Array.from(this.recoveryPatterns.values())
      .filter(p => p.successRate < 0.4 && p.usageCount > 10);

    if (ineffectivePatterns.length > 0) {
      recommendations.push(`${ineffectivePatterns.length} patterns have low success rates. Consider retiring or refining them.`);
    }

    // Strategy-specific recommendations
    const ineffectiveStrategies = Array.from(this.strategyPerformance.values())
      .filter(s => s.effectiveness < 0.5 && s.totalExecutions > 20);

    if (ineffectiveStrategies.length > 0) {
      recommendations.push(`${ineffectiveStrategies.length} strategies show low effectiveness. Consider parameter tuning.`);
    }

    return recommendations;
  }

  /**
   * Log helper methods
   */
  private logInfo(message: string, data?: any): void {
    this.errorHandlingCenter.handleError({
      error: new Error(message),
      source: 'automated-recovery',
      severity: 'low' as ErrorSeverity,
      timestamp: Date.now(),
      context: { action: 'log_info', data }
    });
  }

  private logError(message: string, data?: any): void {
    this.errorHandlingCenter.handleError({
      error: new Error(message),
      source: 'automated-recovery',
      severity: 'high' as ErrorSeverity,
      timestamp: Date.now(),
      context: { action: 'log_error', data }
    });
  }
}