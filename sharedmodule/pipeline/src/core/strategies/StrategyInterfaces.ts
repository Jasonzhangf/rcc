/**
 * Strategic Error Handling for RCC Pipeline System
 * RCC流水线系统的策略化错误处理
 *
 * This module implements retry, fallback, and circuit breaker strategies
 * that extend the existing RCC error handling framework.
 */

import {
  ErrorHandlingCenter,
  ErrorClassifier,
  PolicyEngine,
  ErrorCategory,
  ErrorSeverity,
  ErrorType,
  ErrorSource,
  ErrorImpact,
  ErrorRecoverability,
  ModuleRegistryManager,
  ErrorInterfaceGateway,
  ErrorContext,
  ErrorPolicy,
  ErrorHandlingResult
} from 'rcc-errorhandling';

import { PipelineExecutionContext } from '../interfaces/ModularInterfaces';

/**
 * Strategy execution context for error handling
 * 错误处理的策略执行上下文
 */
export interface StrategyContext {
  operationId: string;
  moduleId: string;
  pipelineContext: PipelineExecutionContext;
  startTime: number;
  attempt: number;
  maxAttempts: number;
  lastError?: Error;
  strategyData?: Record<string, any>;
}

/**
 * Strategy configuration interface
 * 策略配置接口
 */
export interface StrategyConfig {
  enabled: boolean;
  priority: number;
  maxAttempts?: number;
  timeout?: number;
  backoffMultiplier?: number;
  recoveryThreshold?: number;
  customParameters?: Record<string, any>;
}

/**
 * Base strategy interface for all error handling strategies
 * 所有错误处理策略的基础策略接口
 */
export interface IErrorHandlingStrategy {
  readonly name: string;
  readonly config: StrategyConfig;

  /**
   * Check if this strategy should handle the given error
   * 检查此策略是否应该处理给定错误
   */
  canHandle(error: Error, context: StrategyContext): boolean;

  /**
   * Execute the error handling strategy
   * 执行错误处理策略
   */
  execute(error: Error, context: StrategyContext): Promise<ErrorHandlingResult>;

  /**
   * Get strategy health status
   * 获取策略健康状态
   */
  getHealth(): StrategyHealth;

  /**
   * Reset strategy state
   * 重置策略状态
   */
  reset(): void;

  /**
   * Get strategy metrics
   * 获取策略指标
   */
  getMetrics(): StrategyMetrics;
}

/**
 * Strategy health status
 * 策略健康状态
 */
export interface StrategyHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastExecution?: number;
  consecutiveFailures: number;
  successRate: number;
  averageResponseTime: number;
}

/**
 * Strategy metrics
 * 策略指标
 */
export interface StrategyMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  errorDistribution: Record<string, number>;
  lastExecutionTime?: number;
}

/**
 * Retry strategy configuration
 * 重试策略配置
 */
export interface RetryStrategyConfig extends StrategyConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
  timeoutErrors: string[];
  networkErrors: string[];
}

/**
 * Fallback strategy configuration
 * 降级策略配置
 */
export interface FallbackStrategyConfig extends StrategyConfig {
  fallbackActions: FallbackAction[];
  maxFallbackAttempts: number;
  authErrorPatterns: string[];
  enableGracefulDegradation: boolean;
}

/**
 * Fallback action interface
 * 降级操作接口
 */
export interface FallbackAction {
  name: string;
  type: 'token_refresh' | 'alternative_provider' | 'cached_response' | 'graceful_degradation';
  priority: number;
  execute: (context: StrategyContext) => Promise<any>;
  shouldExecute: (error: Error, context: StrategyContext) => boolean;
}

/**
 * Circuit breaker strategy configuration
 * 熔断器策略配置
 */
export interface CircuitBreakerStrategyConfig extends StrategyConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  expectedException?: string[];
  monitoringPeriod: number;
  requestVolumeThreshold: number;
  halfOpenAttempts: number;
  successThreshold: number;
}

/**
 * Circuit breaker states
 * 熔断器状态
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',        // 正常状态，允许请求通过
  OPEN = 'open',           // 熔断状态，拒绝所有请求
  HALF_OPEN = 'half_open'  // 半开状态，允许部分请求通过
}

/**
 * Strategy manager interface
 * 策略管理器接口
 */
export interface IStrategyManager {
  /**
   * Register a strategy
   * 注册策略
   */
  registerStrategy(strategy: IErrorHandlingStrategy): void;

  /**
   * Handle error with registered strategies
   * 使用注册的策略处理错误
   */
  handleError(error: Error, context: StrategyContext): Promise<ErrorHandlingResult>;

  /**
   * Get all registered strategies
   * 获取所有注册的策略
   */
  getStrategies(): IErrorHandlingStrategy[];

  /**
   * Get strategy by name
   * 按名称获取策略
   */
  getStrategy(name: string): IErrorHandlingStrategy | undefined;

  /**
   * Get manager health status
   * 获取管理器健康状态
   */
  getHealth(): StrategyManagerHealth;

  /**
   * Get combined metrics
   * 获取组合指标
   */
  getMetrics(): StrategyManagerMetrics;
}

/**
 * Strategy manager health
 * 策略管理器健康状态
 */
export interface StrategyManagerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalStrategies: number;
  healthyStrategies: number;
  degradedStrategies: number;
  unhealthyStrategies: number;
  lastExecutionTime?: number;
}

/**
 * Strategy manager metrics
 * 策略管理器指标
 */
export interface StrategyManagerMetrics {
  totalErrorsHandled: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  averageHandlingTime: number;
  strategyUsage: Record<string, number>;
  errorTypeDistribution: Record<string, number>;
  recoveryRate: number;
}