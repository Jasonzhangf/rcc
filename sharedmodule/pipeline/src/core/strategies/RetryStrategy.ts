/**
 * Retry Strategy for RCC Pipeline System
 * RCC流水线系统的重试策略
 *
 * Implements automatic retry mechanism with exponential backoff
 * for provider timeouts and temporary failures.
 */

import {
  ErrorHandlingCenter,
  ErrorHandlingResult,
  ErrorCategory,
  ErrorSeverity
} from 'rcc-errorhandling';

import {
  IErrorHandlingStrategy,
  StrategyContext,
  StrategyConfig,
  StrategyHealth,
  StrategyMetrics,
  RetryStrategyConfig
} from './StrategyInterfaces';

/**
 * Retry Strategy Implementation
 * 重试策略实现
 */
export class RetryStrategy implements IErrorHandlingStrategy {
  readonly name: string = 'retry';
  readonly config: RetryStrategyConfig;

  private errorHandlingCenter: ErrorHandlingCenter;
  private metrics: StrategyMetrics;
  private health: StrategyHealth;

  constructor(
    config: Partial<RetryStrategyConfig>,
    errorHandlingCenter: ErrorHandlingCenter
  ) {
    this.config = {
      enabled: true,
      priority: 1,
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: [
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'EAI_AGAIN',
        'TIMEOUT_ERROR',
        'NETWORK_ERROR',
        'RATE_LIMIT_ERROR'
      ],
      timeoutErrors: [
        'Request timeout',
        'Response timeout',
        'Connection timeout',
        'Operation timeout'
      ],
      networkErrors: [
        'Network error',
        'Connection failed',
        'DNS resolution failed',
        'Socket timeout'
      ],
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
   * Check if this strategy should handle the given error
   * 检查此策略是否应该处理给定错误
   */
  canHandle(error: Error, context: StrategyContext): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check if we've exceeded max attempts
    if (context.attempt >= (this.config.maxRetries || 3)) {
      return false;
    }

    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toUpperCase();

    // Check retryable error types
    const isRetryableError = this.config.retryableErrors.some(pattern =>
      errorMessage.includes(pattern.toLowerCase()) ||
      errorName.includes(pattern)
    );

    // Check timeout errors
    const isTimeoutError = this.config.timeoutErrors.some(pattern =>
      errorMessage.includes(pattern.toLowerCase())
    );

    // Check network errors
    const isNetworkError = this.config.networkErrors.some(pattern =>
      errorMessage.includes(pattern.toLowerCase())
    );

    // Check HTTP status codes that should be retried
    const isRetryableHttpError = this.isRetryableHttpError(error);

    return isRetryableError || isTimeoutError || isNetworkError || isRetryableHttpError;
  }

  /**
   * Check if HTTP error should be retried
   * 检查HTTP错误是否应该重试
   */
  private isRetryableHttpError(error: Error): boolean {
    const axiosError = error as any;

    if (axiosError.response) {
      const status = axiosError.response.status;
      return status === 408 || // Request Timeout
             status === 429 || // Too Many Requests
             status === 500 || // Internal Server Error
             status === 502 || // Bad Gateway
             status === 503 || // Service Unavailable
             status === 504;   // Gateway Timeout
    }

    return false;
  }

  /**
   * Execute the retry strategy
   * 执行重试策略
   */
  async execute(error: Error, context: StrategyContext): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    const retryAttempt = context.attempt;
    const maxRetries = this.config.maxRetries || 3;

    this.metrics.totalExecutions++;

    try {
      // Calculate delay with exponential backoff
      const delay = this.calculateRetryDelay(retryAttempt);

      // Log retry attempt
      this.logRetryAttempt(error, context, retryAttempt, delay);

      // Wait for the delay
      await this.sleep(delay);

      // Prepare retry context
      const retryContext: StrategyContext = {
        ...context,
        attempt: retryAttempt + 1,
        strategyData: {
          ...context.strategyData,
          retryAttempt,
          delay,
          originalError: error.message
        }
      };

      const executionTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(true, executionTime, error);

      // Return success result
      return {
        success: true,
        handled: true,
        strategy: this.name,
        action: 'retry',
        message: `Retry attempt ${retryAttempt + 1}/${maxRetries} scheduled`,
        context: {
          retryAttempt,
          delay,
          executionTime,
          nextAttemptTime: Date.now() + delay
        },
        recovery: {
          attempted: true,
          successful: true,
          method: 'exponential_backoff',
          details: {
            delay,
            multiplier: this.config.backoffMultiplier,
            jitter: this.config.jitter
          }
        }
      };

    } catch (retryError) {
      const executionTime = Date.now() - startTime;

      // Update metrics for failure
      this.updateMetrics(false, executionTime, error);

      return {
        success: false,
        handled: true,
        strategy: this.name,
        action: 'retry_failed',
        message: `Retry attempt ${retryAttempt + 1}/${maxRetries} failed: ${retryError instanceof Error ? retryError.message : String(retryError)}`,
        error: retryError instanceof Error ? retryError : new Error(String(retryError)),
        context: {
          retryAttempt,
          executionTime,
          maxRetries
        },
        recovery: {
          attempted: true,
          successful: false,
          method: 'exponential_backoff',
          error: retryError instanceof Error ? retryError : new Error(String(retryError))
        }
      };
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   * 计算带有指数退避和抖动的重试延迟
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.baseDelay || 1000;
    const maxDelay = this.config.maxDelay || 30000;
    const multiplier = this.config.backoffMultiplier || 2;
    const jitter = this.config.jitter || true;

    // Calculate exponential backoff
    let delay = baseDelay * Math.pow(multiplier, attempt);

    // Apply maximum delay cap
    delay = Math.min(delay, maxDelay);

    // Add jitter to prevent thundering herd
    if (jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for the specified duration
   * 睡眠指定持续时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log retry attempt
   * 记录重试尝试
   */
  private logRetryAttempt(error: Error, context: StrategyContext, attempt: number, delay: number): void {
    this.errorHandlingCenter.handleError({
      error: new Error(`Retry attempt ${attempt + 1} scheduled after ${delay}ms for: ${error.message}`),
      source: context.moduleId,
      severity: 'medium' as ErrorSeverity,
      timestamp: Date.now(),
      context: {
        strategy: this.name,
        operationId: context.operationId,
        attempt,
        delay,
        originalError: error.message,
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
    this.health.lastExecutionTime = Date.now();
    this.health.averageResponseTime = this.metrics.averageExecutionTime;
    this.health.successRate = this.metrics.successRate;

    if (this.health.successRate >= 0.8) {
      this.health.status = 'healthy';
      this.health.consecutiveFailures = 0;
    } else if (this.health.successRate >= 0.5) {
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