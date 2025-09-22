/**
 * Fallback Strategy for RCC Pipeline System
 * RCC流水线系统的降级策略
 *
 * Implements fallback mechanisms for authentication failures
 * and other recoverable errors with graceful degradation.
 */

import {
  ErrorHandlingCenter
} from 'rcc-errorhandling';

import {
  IErrorHandlingStrategy,
  StrategyContext,
  StrategyConfig,
  StrategyHealth,
  StrategyMetrics,
  FallbackStrategyConfig,
  FallbackAction,
  ErrorHandlingResult,
  ErrorSeverity,
  ErrorCategory
} from './StrategyInterfaces';

/**
 * Fallback Strategy Implementation
 * 降级策略实现
 */
export class FallbackStrategy implements IErrorHandlingStrategy {
  readonly name: string = 'fallback';
  readonly config: FallbackStrategyConfig;

  private errorHandlingCenter: ErrorHandlingCenter;
  private metrics: StrategyMetrics;
  private health: StrategyHealth;

  constructor(
    config: Partial<FallbackStrategyConfig>,
    errorHandlingCenter: ErrorHandlingCenter
  ) {
    this.config = {
      enabled: true,
      priority: 2,
      maxFallbackAttempts: 3,
      authErrorPatterns: [
        '401',
        '403',
        'authentication failed',
        'unauthorized',
        'token expired',
        'invalid token',
        'access denied',
        'auth error',
        'oauth'
      ],
      enableGracefulDegradation: true,
      fallbackActions: this.getDefaultFallbackActions(),
      ...config
    };

    this.errorHandlingCenter = errorHandlingCenter;
    this.initializeMetrics();
    this.health = {
      status: 'healthy',
      consecutiveFailures: 0,
      successRate: 1.0,
      averageResponseTime: 0
    };
  }

  /**
   * Initialize strategy metrics
   * 初始化策略指标
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      successRate: 1.0,
      errorDistribution: {}
    };
  }

  /**
   * Get default fallback actions
   * 获取默认降级操作
   */
  private getDefaultFallbackActions(): FallbackAction[] {
    return [
      {
        name: 'token_refresh',
        type: 'token_refresh',
        priority: 1,
        execute: this.executeTokenRefresh.bind(this),
        shouldExecute: this.shouldExecuteTokenRefresh.bind(this)
      },
      {
        name: 'alternative_provider',
        type: 'alternative_provider',
        priority: 2,
        execute: this.executeAlternativeProvider.bind(this),
        shouldExecute: this.shouldExecuteAlternativeProvider.bind(this)
      },
      {
        name: 'cached_response',
        type: 'cached_response',
        priority: 3,
        execute: this.executeCachedResponse.bind(this),
        shouldExecute: this.shouldExecuteCachedResponse.bind(this)
      },
      {
        name: 'graceful_degradation',
        type: 'graceful_degradation',
        priority: 4,
        execute: this.executeGracefulDegradation.bind(this),
        shouldExecute: this.shouldExecuteGracefulDegradation.bind(this)
      }
    ];
  }

  /**
   * Check if this strategy should handle the given error
   * 检查此策略是否应该处理给定错误
   */
  canHandle(error: Error, context: StrategyContext): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check if we've exceeded max fallback attempts
    const fallbackAttempt = context.strategyData?.fallbackAttempt || 0;
    if (fallbackAttempt >= (this.config.maxFallbackAttempts || 3)) {
      return false;
    }

    const errorMessage = error.message.toLowerCase();

    // Check authentication errors
    const isAuthError = this.config.authErrorPatterns.some(pattern =>
      errorMessage.includes(pattern.toLowerCase())
    );

    // Check if any fallback action can handle this error
    const hasApplicableAction = this.config.fallbackActions.some(action =>
      action.shouldExecute(error, context)
    );

    return isAuthError || hasApplicableAction;
  }

  /**
   * Execute the fallback strategy
   * 执行降级策略
   */
  async execute(error: Error, context: StrategyContext): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    const fallbackAttempt = (context.strategyData?.fallbackAttempt || 0) + 1;

    this.metrics.totalExecutions++;

    try {
      // Find applicable fallback actions, sorted by priority
      const applicableActions = this.config.fallbackActions
        .filter(action => action.shouldExecute(error, context))
        .sort((a, b) => a.priority - b.priority);

      if (applicableActions.length === 0) {
        throw new Error('No applicable fallback actions found');
      }

      // Execute the highest priority applicable action
      const action = applicableActions[0];
      const result = await action.execute(context);

      const executionTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(true, executionTime, error);

      return {
        success: true,
        handled: true,
        strategy: this.name,
        action: action.name,
        message: `Fallback executed successfully using ${action.name}`,
        result,
        context: {
          fallbackAttempt,
          actionType: action.type,
          executionTime,
          actionResult: result
        },
        recovery: {
          attempted: true,
          successful: true,
          method: action.name,
          details: {
            actionType: action.type,
            priority: action.priority,
            fallbackAttempt
          }
        }
      };

    } catch (fallbackError) {
      const executionTime = Date.now() - startTime;

      // Update metrics for failure
      this.updateMetrics(false, executionTime, error);

      return {
        success: false,
        handled: true,
        strategy: this.name,
        action: 'fallback_failed',
        message: `Fallback attempt ${fallbackAttempt} failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        error: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
        context: {
          fallbackAttempt,
          executionTime,
          originalError: error.message
        },
        recovery: {
          attempted: true,
          successful: false,
          method: 'fallback',
          error: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
        }
      };
    }
  }

  /**
   * Check if token refresh should be executed
   * 检查是否应该执行token刷新
   */
  private shouldExecuteTokenRefresh(error: Error, context: StrategyContext): boolean {
    const errorMessage = error.message.toLowerCase();
    const authPatterns = ['401', 'token expired', 'invalid token', 'unauthorized'];

    return authPatterns.some(pattern => errorMessage.includes(pattern)) &&
           this.isTokenRefreshAvailable(context);
  }

  /**
   * Execute token refresh
   * 执行token刷新
   */
  private async executeTokenRefresh(context: StrategyContext): Promise<any> {
    this.logFallbackAction('token_refresh', context);

    // Try to refresh token through the pipeline context or module
    const pipelineContext = context.pipelineContext;

    // Check if the provider has a token refresh method
    if (pipelineContext && 'refreshToken' in pipelineContext && typeof (pipelineContext as any).refreshToken === 'function') {
      try {
        const newToken = await (pipelineContext as any).refreshToken();
        return {
          success: true,
          action: 'token_refresh',
          newToken: newToken,
          message: 'Token refreshed successfully'
        };
      } catch (refreshError) {
        throw new Error(`Token refresh failed: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
      }
    }

    throw new Error('Token refresh not available in current context');
  }

  /**
   * Check if token refresh is available
   * 检查token刷新是否可用
   */
  private isTokenRefreshAvailable(context: StrategyContext): boolean {
    const pipelineContext = context.pipelineContext;
    return pipelineContext && 'refreshToken' in pipelineContext && typeof (pipelineContext as any).refreshToken === 'function';
  }

  /**
   * Check if alternative provider should be used
   * 检查是否应该使用备用提供商
   */
  private shouldExecuteAlternativeProvider(error: Error, context: StrategyContext): boolean {
    const errorMessage = error.message.toLowerCase();
    const providerErrorPatterns = ['provider unavailable', 'service down', 'timeout'];

    return providerErrorPatterns.some(pattern => errorMessage.includes(pattern)) &&
           this.hasAlternativeProvider(context);
  }

  /**
   * Execute alternative provider
   * 执行备用提供商
   */
  private async executeAlternativeProvider(context: StrategyContext): Promise<any> {
    this.logFallbackAction('alternative_provider', context);

    // This would typically involve switching to a different provider
    // For now, return a graceful degradation response
    return {
      success: true,
      action: 'alternative_provider',
      message: 'Switched to alternative provider (simulated)',
      fallbackResponse: {
        type: 'provider_fallback',
        message: 'Service temporarily unavailable, please try again later'
      }
    };
  }

  /**
   * Check if alternative provider is available
   * 检查备用提供商是否可用
   */
  private hasAlternativeProvider(context: StrategyContext): boolean {
    // Check if there are alternative providers configured
    // This would typically be determined from the pipeline configuration
    return true; // For now, assume alternatives are available
  }

  /**
   * Check if cached response should be used
   * 检查是否应该使用缓存响应
   */
  private shouldExecuteCachedResponse(error: Error, context: StrategyContext): boolean {
    // Use cached response for any error if caching is available
    return this.isCacheAvailable(context);
  }

  /**
   * Execute cached response
   * 执行缓存响应
   */
  private async executeCachedResponse(context: StrategyContext): Promise<any> {
    this.logFallbackAction('cached_response', context);

    // This would retrieve a cached response if available
    return {
      success: true,
      action: 'cached_response',
      message: 'Retrieved cached response',
      fallbackResponse: {
        type: 'cached_response',
        message: 'Returning cached response due to service unavailability'
      }
    };
  }

  /**
   * Check if cache is available
   * 检查缓存是否可用
   */
  private isCacheAvailable(context: StrategyContext): boolean {
    // Check if caching is enabled and available
    return false; // For now, assume caching is not implemented
  }

  /**
   * Check if graceful degradation should be executed
   * 检查是否应该执行优雅降级
   */
  private shouldExecuteGracefulDegradation(error: Error, context: StrategyContext): boolean {
    return this.config.enableGracefulDegradation;
  }

  /**
   * Execute graceful degradation
   * 执行优雅降级
   */
  private async executeGracefulDegradation(context: StrategyContext): Promise<any> {
    this.logFallbackAction('graceful_degradation', context);

    return {
      success: true,
      action: 'graceful_degradation',
      message: 'Graceful degradation activated',
      fallbackResponse: {
        type: 'graceful_degradation',
        message: 'Service is currently experiencing issues. Some features may be limited.',
        severity: 'warning',
        suggestions: [
          'Please try again later',
          'Contact support if the issue persists',
          'Check service status page'
        ]
      }
    };
  }

  /**
   * Log fallback action execution
   * 记录降级操作执行
   */
  private logFallbackAction(actionName: string, context: StrategyContext): void {
    this.errorHandlingCenter.handleError({
      error: new Error(`Fallback action ${actionName} executed for operation ${context.operationId}`),
      source: context.moduleId,
      severity: 'medium' as ErrorSeverity,
      timestamp: Date.now(),
      context: {
        strategy: this.name,
        action: actionName,
        operationId: context.operationId,
        pipelineContext: context.pipelineContext
      }
    });
  }

  /**
   * Update strategy metrics
   * 更新策略指标
   */
  private updateMetrics(success: boolean, executionTime: number, error: Error): void {
    this.metrics.totalExecutions++;
    this.metrics.averageExecutionTime = (
      (this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1) + executionTime) /
      this.metrics.totalExecutions
    );

    if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    this.metrics.successRate = this.metrics.successfulExecutions / this.metrics.totalExecutions;

    // Update error distribution
    const errorType = error.constructor.name;
    this.metrics.errorDistribution[errorType] = (this.metrics.errorDistribution[errorType] || 0) + 1;

    // Update health
    this.updateHealth();
  }

  /**
   * Update strategy health status
   * 更新策略健康状态
   */
  private updateHealth(): void {
    this.health.lastExecution = Date.now();
    this.health.averageResponseTime = this.metrics.averageExecutionTime;
    this.health.successRate = this.metrics.successRate;

    if (this.health.successRate >= 0.7) {
      this.health.status = 'healthy';
      this.health.consecutiveFailures = 0;
    } else if (this.health.successRate >= 0.4) {
      this.health.status = 'degraded';
      this.health.consecutiveFailures = 0;
    } else {
      this.health.status = 'unhealthy';
      this.health.consecutiveFailures++;
    }
  }

  /**
   * Get strategy health status
   * 获取策略健康状态
   */
  getHealth(): StrategyHealth {
    return { ...this.health };
  }

  /**
   * Reset strategy state
   * 重置策略状态
   */
  reset(): void {
    this.initializeMetrics();
    this.health = {
      status: 'healthy',
      consecutiveFailures: 0,
      successRate: 1.0,
      averageResponseTime: 0
    };
  }

  /**
   * Get strategy metrics
   * 获取策略指标
   */
  getMetrics(): StrategyMetrics {
    return { ...this.metrics };
  }
}