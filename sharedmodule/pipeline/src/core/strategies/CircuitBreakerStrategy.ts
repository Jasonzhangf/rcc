/**
 * Circuit Breaker Strategy for RCC Pipeline System
 * RCC流水线系统的熔断器策略
 *
 * Implements circuit breaker pattern to protect third-party services
 * from cascading failures and provide fast failure detection.
 */

import {
  ErrorHandlingCenter,
  ErrorHandlingResult,
  ErrorSeverity
} from 'rcc-errorhandling';

import {
  IErrorHandlingStrategy,
  StrategyContext,
  StrategyConfig,
  StrategyHealth,
  StrategyMetrics,
  CircuitBreakerStrategyConfig,
  CircuitBreakerState
} from './StrategyInterfaces';

/**
 * Circuit Breaker State Machine
 * 熔断器状态机
 */
interface CircuitBreakerStateMachine {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime: number;
  lastStateChangeTime: number;
  halfOpenAttempts: number;
  successCount: number;
  requestCount: number;
}

/**
 * Circuit Breaker Strategy Implementation
 * 熔断器策略实现
 */
export class CircuitBreakerStrategy implements IErrorHandlingStrategy {
  readonly name: string = 'circuit_breaker';
  readonly config: CircuitBreakerStrategyConfig;

  private errorHandlingCenter: ErrorHandlingCenter;
  private metrics: StrategyMetrics;
  private health: StrategyHealth;
  private stateMachine: CircuitBreakerStateMachine;

  constructor(
    config: Partial<CircuitBreakerStrategyConfig>,
    errorHandlingCenter: ErrorHandlingCenter
  ) {
    this.config = {
      enabled: true,
      priority: 0, // Highest priority - runs before other strategies
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 60000, // 1 minute
      requestVolumeThreshold: 10,
      halfOpenAttempts: 3,
      successThreshold: 2,
      ...config
    };

    this.errorHandlingCenter = errorHandlingCenter;
    this.initializeMetrics();
    this.initializeStateMachine();
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
   * Initialize state machine
   * 初始化状态机
   */
  private initializeStateMachine(): void {
    this.stateMachine = {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      lastFailureTime: 0,
      lastStateChangeTime: Date.now(),
      halfOpenAttempts: 0,
      successCount: 0,
      requestCount: 0
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

    // Check circuit breaker state first
    if (this.stateMachine.state === CircuitBreakerState.OPEN) {
      return true; // Always handle when circuit is open
    }

    // Check if this error type should trigger circuit breaker
    const shouldTrigger = this.shouldTriggerCircuitBreaker(error);

    return shouldTrigger || this.stateMachine.state === CircuitBreakerState.HALF_OPEN;
  }

  /**
   * Check if error should trigger circuit breaker
   * 检查错误是否应该触发熔断器
   */
  private shouldTriggerCircuitBreaker(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();

    // Check for expected exceptions if configured
    if (this.config.expectedException && this.config.expectedException.length > 0) {
      return this.config.expectedException.some(pattern =>
        errorMessage.includes(pattern.toLowerCase())
      );
    }

    // Default trigger conditions
    const triggerPatterns = [
      'connection refused',
      'connection timeout',
      'service unavailable',
      'bad gateway',
      'gateway timeout',
      'internal server error',
      'network unreachable',
      'host unreachable'
    ];

    return triggerPatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Execute the circuit breaker strategy
   * 执行熔断器策略
   */
  async execute(error: Error, context: StrategyContext): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    this.metrics.totalExecutions++;

    try {
      // Update state machine
      const currentState = this.stateMachine.state;
      let result: ErrorHandlingResult;

      switch (currentState) {
        case CircuitBreakerState.CLOSED:
          result = await this.handleClosedState(error, context);
          break;
        case CircuitBreakerState.OPEN:
          result = await this.handleOpenState(error, context);
          break;
        case CircuitBreakerState.HALF_OPEN:
          result = await this.handleHalfOpenState(error, context);
          break;
        default:
          result = this.createUnknownStateResult(currentState);
      }

      const executionTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(result.success, executionTime, error);

      return result;

    } catch (circuitError) {
      const executionTime = Date.now() - startTime;

      // Update metrics for failure
      this.updateMetrics(false, executionTime, error);

      return {
        success: false,
        handled: true,
        strategy: this.name,
        action: 'circuit_breaker_error',
        message: `Circuit breaker error: ${circuitError instanceof Error ? circuitError.message : String(circuitError)}`,
        error: circuitError instanceof Error ? circuitError : new Error(String(circuitError)),
        context: {
          state: this.stateMachine.state,
          executionTime
        },
        recovery: {
          attempted: true,
          successful: false,
          method: 'circuit_breaker',
          error: circuitError instanceof Error ? circuitError : new Error(String(circuitError))
        }
      };
    }
  }

  /**
   * Handle CLOSED state
   * 处理关闭状态
   */
  private async handleClosedState(error: Error, context: StrategyContext): Promise<ErrorHandlingResult> {
    // Increment failure count
    this.stateMachine.failureCount++;
    this.stateMachine.lastFailureTime = Date.now();
    this.stateMachine.requestCount++;

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.transitionToOpenState();
      this.logStateTransition('CLOSED -> OPEN', context);

      return {
        success: true,
        handled: true,
        strategy: this.name,
        action: 'circuit_opened',
        message: 'Circuit breaker opened due to failure threshold exceeded',
        context: {
          previousState: CircuitBreakerState.CLOSED,
          newState: CircuitBreakerState.OPEN,
          failureCount: this.stateMachine.failureCount,
          threshold: this.config.failureThreshold
        },
        recovery: {
          attempted: true,
          successful: true,
          method: 'circuit_breaker_open',
          details: {
            failureCount: this.stateMachine.failureCount,
            threshold: this.config.failureThreshold,
            recoveryTimeout: this.config.recoveryTimeout
          }
        }
      };
    }

    // Return failure to allow other strategies to handle
    return {
      success: false,
      handled: false,
      strategy: this.name,
      action: 'failure_counted',
      message: 'Failure counted but circuit remains closed',
      context: {
        state: this.stateMachine.state,
        failureCount: this.stateMachine.failureCount,
        threshold: this.config.failureThreshold
      }
    };
  }

  /**
   * Handle OPEN state
   * 处理开启状态
   */
  private async handleOpenState(error: Error, context: StrategyContext): Promise<ErrorHandlingResult> {
    this.stateMachine.requestCount++;

    // Check if we should attempt recovery
    if (this.shouldAttemptRecovery()) {
      this.transitionToHalfOpenState();
      this.logStateTransition('OPEN -> HALF_OPEN', context);

      return {
        success: true,
        handled: true,
        strategy: this.name,
        action: 'circuit_half_open',
        message: 'Circuit breaker moved to half-open state for recovery attempt',
        context: {
          previousState: CircuitBreakerState.OPEN,
          newState: CircuitBreakerState.HALF_OPEN,
          recoveryTimeout: this.config.recoveryTimeout
        },
        recovery: {
          attempted: true,
          successful: true,
          method: 'circuit_breaker_half_open',
          details: {
            halfOpenAttempts: this.config.halfOpenAttempts,
            successThreshold: this.config.successThreshold
          }
        }
      };
    }

    // Circuit is open, fail fast
    return {
      success: true,
      handled: true,
      strategy: this.name,
      action: 'circuit_open_reject',
      message: 'Request rejected due to open circuit breaker',
      error: new Error('Service temporarily unavailable due to circuit breaker'),
      context: {
        state: this.stateMachine.state,
        failureCount: this.stateMachine.failureCount,
        timeUntilRecovery: this.getTimeUntilRecovery()
      },
      recovery: {
        attempted: false,
        successful: false,
        method: 'circuit_breaker_open',
        details: {
          state: CircuitBreakerState.OPEN,
          timeUntilRecovery: this.getTimeUntilRecovery()
        }
      }
    };
  }

  /**
   * Handle HALF_OPEN state
   * 处理半开状态
   */
  private async handleHalfOpenState(error: Error, context: StrategyContext): Promise<ErrorHandlingResult> {
    this.stateMachine.halfOpenAttempts++;
    this.stateMachine.requestCount++;

    // Any failure in half-open state should open the circuit again
    this.transitionToOpenState();
    this.logStateTransition('HALF_OPEN -> OPEN', context);

    return {
      success: true,
      handled: true,
      strategy: this.name,
      action: 'circuit_reopened',
      message: 'Circuit breaker reopened due to failure in half-open state',
      context: {
        previousState: CircuitBreakerState.HALF_OPEN,
        newState: CircuitBreakerState.OPEN,
        halfOpenAttempts: this.stateMachine.halfOpenAttempts,
        maxHalfOpenAttempts: this.config.halfOpenAttempts
      },
      recovery: {
        attempted: true,
        successful: false,
        method: 'circuit_breaker_reopen',
        details: {
          halfOpenAttempts: this.stateMachine.halfOpenAttempts,
          failure: error.message
        }
      }
    };
  }

  /**
   * Handle successful request (called from outside)
   * 处理成功请求（从外部调用）
   */
  public handleSuccess(): void {
    switch (this.stateMachine.state) {
      case CircuitBreakerState.CLOSED:
        // Reset failure count on success in closed state
        this.stateMachine.failureCount = 0;
        break;
      case CircuitBreakerState.HALF_OPEN:
        this.stateMachine.successCount++;
        if (this.stateMachine.successCount >= this.config.successThreshold) {
          this.transitionToClosedState();
        }
        break;
    }
  }

  /**
   * Check if circuit should be opened
   * 检查是否应该开启熔断器
   */
  private shouldOpenCircuit(): boolean {
    const now = Date.now();
    const monitoringWindow = now - this.config.monitoringPeriod;

    // Reset failure count if monitoring period has passed
    if (this.stateMachine.lastFailureTime < monitoringWindow) {
      this.stateMachine.failureCount = 0;
    }

    // Check if we've exceeded thresholds
    return this.stateMachine.failureCount >= this.config.failureThreshold &&
           this.stateMachine.requestCount >= this.config.requestVolumeThreshold;
  }

  /**
   * Check if we should attempt recovery
   * 检查是否应该尝试恢复
   */
  private shouldAttemptRecovery(): boolean {
    const now = Date.now();
    return now - this.stateMachine.lastStateChangeTime >= this.config.recoveryTimeout;
  }

  /**
   * Get time until recovery
   * 获取恢复时间
   */
  private getTimeUntilRecovery(): number {
    const now = Date.now();
    const recoveryTime = this.stateMachine.lastStateChangeTime + this.config.recoveryTimeout;
    return Math.max(0, recoveryTime - now);
  }

  /**
   * Transition to OPEN state
   * 转换到开启状态
   */
  private transitionToOpenState(): void {
    this.stateMachine.state = CircuitBreakerState.OPEN;
    this.stateMachine.lastStateChangeTime = Date.now();
    this.stateMachine.halfOpenAttempts = 0;
    this.stateMachine.successCount = 0;
  }

  /**
   * Transition to HALF_OPEN state
   * 转换到半开状态
   */
  private transitionToHalfOpenState(): void {
    this.stateMachine.state = CircuitBreakerState.HALF_OPEN;
    this.stateMachine.lastStateChangeTime = Date.now();
    this.stateMachine.halfOpenAttempts = 0;
    this.stateMachine.successCount = 0;
  }

  /**
   * Transition to CLOSED state
   * 转换到关闭状态
   */
  private transitionToClosedState(): void {
    this.stateMachine.state = CircuitBreakerState.CLOSED;
    this.stateMachine.lastStateChangeTime = Date.now();
    this.stateMachine.failureCount = 0;
    this.stateMachine.halfOpenAttempts = 0;
    this.stateMachine.successCount = 0;
  }

  /**
   * Log state transition
   * 记录状态转换
   */
  private logStateTransition(transition: string, context: StrategyContext): void {
    this.errorHandlingCenter.handleError({
      error: new Error(`Circuit breaker state transition: ${transition}`),
      source: context.moduleId,
      severity: 'medium' as ErrorSeverity,
      timestamp: Date.now(),
      context: {
        strategy: this.name,
        operationId: context.operationId,
        stateTransition: transition,
        stateMachine: this.stateMachine,
        pipelineContext: context.pipelineContext
      }
    });
  }

  /**
   * Create unknown state result
   * 创建未知状态结果
   */
  private createUnknownStateResult(state: CircuitBreakerState): ErrorHandlingResult {
    return {
      success: false,
      handled: true,
      strategy: this.name,
      action: 'unknown_state',
      message: `Unknown circuit breaker state: ${state}`,
      error: new Error(`Unknown circuit breaker state: ${state}`),
      context: {
        state
      }
    };
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

    // Health based on circuit breaker state
    switch (this.stateMachine.state) {
      case CircuitBreakerState.CLOSED:
        this.health.status = 'healthy';
        this.health.consecutiveFailures = 0;
        break;
      case CircuitBreakerState.HALF_OPEN:
        this.health.status = 'degraded';
        this.health.consecutiveFailures = 0;
        break;
      case CircuitBreakerState.OPEN:
        this.health.status = 'unhealthy';
        this.health.consecutiveFailures = this.stateMachine.failureCount;
        break;
    }
  }

  /**
   * Get strategy health status
   * 获取策略健康状态
   */
  getHealth(): StrategyHealth {
    return {
      ...this.health,
      lastExecutionTime: this.health.lastExecutionTime
    };
  }

  /**
   * Reset strategy state
   * 重置策略状态
   */
  reset(): void {
    this.initializeMetrics();
    this.initializeStateMachine();
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
    return {
      ...this.metrics,
      lastExecutionTime: this.metrics.lastExecutionTime
    };
  }

  /**
   * Get current circuit breaker state
   * 获取当前熔断器状态
   */
  getCircuitState(): CircuitBreakerState {
    return this.stateMachine.state;
  }

  /**
   * Get circuit breaker statistics
   * 获取熔断器统计信息
   */
  getCircuitStats(): {
    state: CircuitBreakerState;
    failureCount: number;
    requestCount: number;
    lastFailureTime: number;
    timeUntilRecovery: number;
    halfOpenAttempts: number;
    successCount: number;
  } {
    return {
      state: this.stateMachine.state,
      failureCount: this.stateMachine.failureCount,
      requestCount: this.stateMachine.requestCount,
      lastFailureTime: this.stateMachine.lastFailureTime,
      timeUntilRecovery: this.getTimeUntilRecovery(),
      halfOpenAttempts: this.stateMachine.halfOpenAttempts,
      successCount: this.stateMachine.successCount
    };
  }
}