/**
 * Strategy Manager for RCC Pipeline System
 * RCC流水线系统的策略管理器
 *
 * Coordinates multiple error handling strategies and provides
 * a unified interface for error recovery.
 */

import {
  ErrorHandlingCenter
} from 'rcc-errorhandling';

import {
  IStrategyManager,
  IErrorHandlingStrategy,
  StrategyContext,
  StrategyManagerHealth,
  StrategyManagerMetrics,
  ErrorHandlingResult,
  ErrorContext,
  ErrorSeverity
} from './StrategyInterfaces';

/**
 * Strategy Manager Implementation
 * 策略管理器实现
 */
export class StrategyManager implements IStrategyManager {
  private strategies: Map<string, IErrorHandlingStrategy> = new Map();
  private errorHandlingCenter: ErrorHandlingCenter;
  private metrics: StrategyManagerMetrics;

  constructor(errorHandlingCenter: ErrorHandlingCenter) {
    this.errorHandlingCenter = errorHandlingCenter;
    this.initializeMetrics();
  }

  /**
   * Initialize manager metrics
   * 初始化管理器指标
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalErrorsHandled: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageHandlingTime: 0,
      strategyUsage: {},
      errorTypeDistribution: {},
      recoveryRate: 0
    };
  }

  /**
   * Register a strategy
   * 注册策略
   */
  registerStrategy(strategy: IErrorHandlingStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.metrics.strategyUsage[strategy.name] = 0;

    this.logStrategyRegistration(strategy.name);
  }

  /**
   * Unregister a strategy
   * 注销策略
   */
  unregisterStrategy(strategyName: string): void {
    this.strategies.delete(strategyName);
    delete this.metrics.strategyUsage[strategyName];

    this.logStrategyUnregistration(strategyName);
  }

  /**
   * Handle error with registered strategies
   * 使用注册的策略处理错误
   */
  async handleError(error: Error, context: StrategyContext): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    this.metrics.totalErrorsHandled++;

    try {
      // Log error handling start
      this.logErrorHandlingStart(error, context);

      // Get strategies sorted by priority
      const strategies = this.getStrategiesByPriority();

      // Try each strategy in order
      for (const strategy of strategies) {
        if (!strategy.canHandle(error, context)) {
          continue;
        }

        const strategyStartTime = Date.now();

        try {
          // Execute strategy
          const result = await strategy.execute(error, context);
          const strategyExecutionTime = Date.now() - strategyStartTime;

          // Update metrics
          this.updateStrategyMetrics(strategy.name, result.success, strategyExecutionTime);

          // Log strategy execution
          this.logStrategyExecution(strategy.name, result, context);

          // Handle strategy result
          if (result.handled) {
            const totalTime = Date.now() - startTime;
            this.updateOverallMetrics(result.success, totalTime, error);

            return this.enrichResult(result, totalTime, strategy.name);
          }

        } catch (strategyError) {
          const strategyExecutionTime = Date.now() - strategyStartTime;

          // Update metrics for strategy failure
          this.updateStrategyMetrics(strategy.name, false, strategyExecutionTime);

          // Log strategy error
          this.logStrategyError(strategy.name, strategyError, context);

          // Continue to next strategy
          continue;
        }
      }

      // No strategy could handle the error
      const totalTime = Date.now() - startTime;
      this.updateOverallMetrics(false, totalTime, error);

      return {
        success: false,
        handled: false,
        strategy: 'none',
        action: 'no_strategy_available',
        message: 'No strategy could handle the error',
        error,
        context: {
          executionTime: totalTime,
          attemptedStrategies: strategies.map(s => s.name)
        }
      };

    } catch (managerError) {
      const totalTime = Date.now() - startTime;

      // Update metrics for manager failure
      this.updateOverallMetrics(false, totalTime, error);

      // Log manager error
      this.logManagerError(managerError, context);

      return {
        success: false,
        handled: true,
        strategy: 'manager',
        action: 'manager_error',
        message: 'Strategy manager encountered an error',
        error: managerError instanceof Error ? managerError : new Error(String(managerError)),
        context: {
          executionTime: totalTime,
          managerError: managerError instanceof Error ? managerError.message : String(managerError)
        }
      };
    }
  }

  /**
   * Get all registered strategies sorted by priority
   * 获取按优先级排序的所有注册策略
   */
  private getStrategiesByPriority(): IErrorHandlingStrategy[] {
    return Array.from(this.strategies.values())
      .sort((a, b) => a.config.priority - b.config.priority);
  }

  /**
   * Update strategy-specific metrics
   * 更新策略特定指标
   */
  private updateStrategyMetrics(strategyName: string, success: boolean, executionTime: number): void {
    if (!this.metrics.strategyUsage[strategyName]) {
      this.metrics.strategyUsage[strategyName] = 0;
    }
    this.metrics.strategyUsage[strategyName]++;
  }

  /**
   * Update overall manager metrics
   * 更新总体管理器指标
   */
  private updateOverallMetrics(success: boolean, executionTime: number, error: Error): void {
    this.metrics.averageHandlingTime = (
      (this.metrics.averageHandlingTime * (this.metrics.totalErrorsHandled - 1) + executionTime) /
      this.metrics.totalErrorsHandled
    );

    if (success) {
      this.metrics.successfulRecoveries++;
    } else {
      this.metrics.failedRecoveries++;
    }

    this.metrics.recoveryRate = this.metrics.successfulRecoveries / this.metrics.totalErrorsHandled;

    // Update error type distribution
    const errorType = error.constructor.name;
    this.metrics.errorTypeDistribution[errorType] = (this.metrics.errorTypeDistribution[errorType] || 0) + 1;
  }

  /**
   * Enrich result with additional information
   * 使用附加信息丰富结果
   */
  private enrichResult(result: ErrorHandlingResult, executionTime: number, strategyName: string): ErrorHandlingResult {
    return {
      ...result,
      context: {
        ...result.context,
        executionTime,
        managerStrategy: strategyName
      }
    };
  }

  /**
   * Get all registered strategies
   * 获取所有注册的策略
   */
  getStrategies(): IErrorHandlingStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get strategy by name
   * 按名称获取策略
   */
  getStrategy(name: string): IErrorHandlingStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Get manager health status
   * 获取管理器健康状态
   */
  getHealth(): StrategyManagerHealth {
    const strategies = Array.from(this.strategies.values());
    const healthyStrategies = strategies.filter(s => s.getHealth().status === 'healthy').length;
    const degradedStrategies = strategies.filter(s => s.getHealth().status === 'degraded').length;
    const unhealthyStrategies = strategies.filter(s => s.getHealth().status === 'unhealthy').length;

    const status = unhealthyStrategies === 0 ? 'healthy' :
                   degradedStrategies > healthyStrategies ? 'unhealthy' : 'degraded';

    return {
      status,
      totalStrategies: strategies.length,
      healthyStrategies,
      degradedStrategies,
      unhealthyStrategies,
      lastExecutionTime: this.getLastExecutionTime()
    };
  }

  /**
   * Get combined metrics
   * 获取组合指标
   */
  getMetrics(): StrategyManagerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get strategy health summary
   * 获取策略健康摘要
   */
  getStrategyHealthSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    for (const [name, strategy] of this.strategies) {
      const health = strategy.getHealth();
      const metrics = strategy.getMetrics();

      summary[name] = {
        health,
        metrics,
        config: strategy.config
      };
    }

    return summary;
  }

  /**
   * Reset all strategies
   * 重置所有策略
   */
  resetAllStrategies(): void {
    for (const strategy of this.strategies.values()) {
      strategy.reset();
    }

    this.initializeMetrics();
    this.logManagerReset();
  }

  /**
   * Get last execution time
   * 获取最后执行时间
   */
  private getLastExecutionTime(): number {
    const strategyMetrics = Array.from(this.strategies.values())
      .map(s => s.getMetrics())
      .filter(m => m.lastExecutionTime);

    return strategyMetrics.length > 0 ? Math.max(...strategyMetrics.map(m => m.lastExecutionTime!)) : 0;
  }

  /**
   * Log strategy registration
   * 记录策略注册
   */
  private logStrategyRegistration(strategyName: string): void {
    this.errorHandlingCenter.handleError({
      error: new Error(`Strategy registered: ${strategyName}`),
      source: 'strategy-manager',
      severity: 'low' as ErrorSeverity,
      timestamp: Date.now(),
      context: {
        action: 'register_strategy',
        strategyName,
        totalStrategies: this.strategies.size
      }
    });
  }

  /**
   * Log strategy unregistration
   * 记录策略注销
   */
  private logStrategyUnregistration(strategyName: string): void {
    this.errorHandlingCenter.handleError({
      error: new Error(`Strategy unregistered: ${strategyName}`),
      source: 'strategy-manager',
      severity: 'low' as ErrorSeverity,
      timestamp: Date.now(),
      context: {
        action: 'unregister_strategy',
        strategyName,
        totalStrategies: this.strategies.size
      }
    });
  }

  /**
   * Log error handling start
   * 记录错误处理开始
   */
  private logErrorHandlingStart(error: Error, context: StrategyContext): void {
    this.errorHandlingCenter.handleError({
      error: new Error(`Error handling started for operation ${context.operationId}`),
      source: 'strategy-manager',
      severity: 'medium' as ErrorSeverity,
      timestamp: Date.now(),
      context: {
        action: 'handle_error_start',
        operationId: context.operationId,
        moduleId: context.moduleId,
        error: error.message,
        availableStrategies: Array.from(this.strategies.keys())
      }
    });
  }

  /**
   * Log strategy execution
   * 记录策略执行
   */
  private logStrategyExecution(strategyName: string, result: ErrorHandlingResult, context: StrategyContext): void {
    this.errorHandlingCenter.handleError({
      error: new Error(`Strategy ${strategyName} executed with result: ${result.success}`),
      source: 'strategy-manager',
      severity: result.success ? 'low' as ErrorSeverity : 'medium' as ErrorSeverity,
      timestamp: Date.now(),
      context: {
        action: 'strategy_execution',
        strategyName,
        result: {
          success: result.success,
          handled: result.handled,
          action: result.action,
          message: result.message
        },
        operationId: context.operationId,
        moduleId: context.moduleId
      }
    });
  }

  /**
   * Log strategy error
   * 记录策略错误
   */
  private logStrategyError(strategyName: string, strategyError: unknown, context: StrategyContext): void {
    this.errorHandlingCenter.handleError({
      error: strategyError instanceof Error ? strategyError : new Error(String(strategyError)),
      source: 'strategy-manager',
      severity: 'high' as ErrorSeverity,
      timestamp: Date.now(),
      context: {
        action: 'strategy_error',
        strategyName,
        operationId: context.operationId,
        moduleId: context.moduleId,
        error: strategyError instanceof Error ? strategyError.message : String(strategyError)
      }
    });
  }

  /**
   * Log manager error
   * 记录管理器错误
   */
  private logManagerError(managerError: unknown, context: StrategyContext): void {
    this.errorHandlingCenter.handleError({
      error: managerError instanceof Error ? managerError : new Error(String(managerError)),
      source: 'strategy-manager',
      severity: 'critical' as ErrorSeverity,
      timestamp: Date.now(),
      context: {
        action: 'manager_error',
        operationId: context.operationId,
        moduleId: context.moduleId,
        error: managerError instanceof Error ? managerError.message : String(managerError)
      }
    });
  }

  /**
   * Log manager reset
   * 记录管理器重置
   */
  private logManagerReset(): void {
    this.errorHandlingCenter.handleError({
      error: new Error('Strategy manager reset all strategies'),
      source: 'strategy-manager',
      severity: 'low' as ErrorSeverity,
      timestamp: Date.now(),
      context: {
        action: 'manager_reset',
        strategiesReset: Array.from(this.strategies.keys())
      }
    });
  }

  /**
   * Get detailed execution report
   * 获取详细执行报告
   */
  getExecutionReport(): {
    managerHealth: StrategyManagerHealth;
    managerMetrics: StrategyManagerMetrics;
    strategySummary: Record<string, any>;
    recommendations: string[];
  } {
    const health = this.getHealth();
    const metrics = this.getMetrics();
    const strategySummary = this.getStrategyHealthSummary();

    const recommendations = this.generateRecommendations(health, metrics, strategySummary);

    return {
      managerHealth: health,
      managerMetrics: metrics,
      strategySummary,
      recommendations
    };
  }

  /**
   * Generate recommendations based on current state
   * 根据当前状态生成建议
   */
  private generateRecommendations(
    health: StrategyManagerHealth,
    metrics: StrategyManagerMetrics,
    strategySummary: Record<string, any>
  ): string[] {
    const recommendations: string[] = [];

    if (health.status === 'unhealthy') {
      recommendations.push('Some strategies are unhealthy. Consider investigating and resetting them.');
    }

    if (metrics.recoveryRate < 0.5) {
      recommendations.push('Low recovery rate detected. Consider tuning strategy configurations.');
    }

    if (metrics.averageHandlingTime > 5000) {
      recommendations.push('High average handling time detected. Consider optimizing strategy execution.');
    }

    // Strategy-specific recommendations
    for (const [name, summary] of Object.entries(strategySummary)) {
      if (summary.health.status === 'unhealthy') {
        recommendations.push(`${name} strategy is unhealthy and may need attention.`);
      }

      if (summary.metrics.successRate < 0.3) {
        recommendations.push(`${name} strategy has low success rate. Consider adjusting configuration.`);
      }
    }

    return recommendations;
  }
}