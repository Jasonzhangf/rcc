/**
 * Provider Strategy Integration for RCC Pipeline System
 * RCC流水线系统的提供商策略集成
 *
 * Utilities and helper classes to integrate error handling strategies
 * with provider implementations like QwenProvider and IFlowProvider.
 */

import { ErrorHandlingCenter } from 'rcc-errorhandling';
import { ErrorHandlingResult } from '../monitoring/ErrorMonitoringInterfaces';

import {
  StrategyContext,
  IStrategyManager,
  StrategyConfig
} from './StrategyInterfaces';

import { PipelineExecutionContext } from '../../interfaces/ModularInterfaces';

/**
 * Provider strategy integration configuration
 * 提供商策略集成配置
 */
export interface ProviderStrategyConfig {
  retryEnabled: boolean;
  fallbackEnabled: boolean;
  circuitBreakerEnabled: boolean;
  maxRetries: number;
  retryDelay: number;
  authErrorPatterns: string[];
  failureThreshold: number;
  recoveryTimeout: number;
}

/**
 * Enhanced provider execution context with strategy support
 * 带有策略支持的增强提供商执行上下文
 */
export interface ProviderExecutionConfig {
  enableStrategies: boolean;
  strategyConfig: ProviderStrategyConfig;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  onFallback?: (action: string, result: any) => void;
  onCircuitBreak?: (state: string, action: string) => void;
}

/**
 * Provider strategy integration helper
 * 提供商策略集成助手
 */
export class ProviderStrategyIntegration {
  private strategyManager: IStrategyManager;
  private errorHandlingCenter: ErrorHandlingCenter;
  private config: ProviderStrategyConfig;

  constructor(
    strategyManager: IStrategyManager,
    errorHandlingCenter: ErrorHandlingCenter,
    config: Partial<ProviderStrategyConfig> = {}
  ) {
    this.strategyManager = strategyManager;
    this.errorHandlingCenter = errorHandlingCenter;
    this.config = {
      retryEnabled: true,
      fallbackEnabled: true,
      circuitBreakerEnabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      authErrorPatterns: [
        '401',
        '403',
        'authentication failed',
        'unauthorized',
        'token expired',
        'invalid token'
      ],
      failureThreshold: 5,
      recoveryTimeout: 60000,
      ...config
    };
  }

  /**
   * Execute provider operation with strategy support
   * 执行带有策略支持的提供商操作
   */
  async executeWithStrategies<T>(
    operation: () => Promise<T>,
    context: PipelineExecutionContext,
    operationName: string,
    executionConfig: ProviderExecutionConfig
  ): Promise<{
    result: T;
    strategyResult?: ErrorHandlingResult;
    attempts: number;
    executionTime: number;
  }> {
    if (!executionConfig.enableStrategies) {
      // Execute without strategies
      const startTime = Date.now();
      try {
        const result = await operation();
        const executionTime = Date.now() - startTime;
        return { result, attempts: 1, executionTime };
      } catch (error) {
        throw error;
      }
    }

    const startTime = Date.now();
    let attempt = 0;
    const maxAttempts = this.config.maxRetries;

    while (attempt <= maxAttempts) {
      attempt++;

      try {
        const result = await operation();
        const executionTime = Date.now() - startTime;

        // Notify circuit breaker of success if enabled
        if (this.config.circuitBreakerEnabled) {
          await this.notifyCircuitBreakerSuccess();
        }

        return { result, attempts: attempt, executionTime };

      } catch (error) {
        const providerError = error instanceof Error ? error : new Error(String(error));

        // Handle error with strategies
        const strategyResult = await this.handleProviderError(
          providerError,
          context,
          operationName,
          attempt,
          executionConfig
        );

        if (strategyResult.success && strategyResult.handled) {
          const executionTime = Date.now() - startTime;

          // Check if strategy result contains a fallback response
          if (strategyResult.result) {
            return {
              result: strategyResult.result as T,
              strategyResult,
              attempts: attempt,
              executionTime
            };
          }

          // Check if strategy suggests retry
          if (this.shouldRetry(strategyResult) && attempt <= maxAttempts) {
            const delay = this.getRetryDelay(strategyResult, attempt);

            // Execute retry callback if provided
            if (executionConfig.onRetry) {
              executionConfig.onRetry(attempt, providerError, delay);
            }

            // Wait for retry delay
            await this.sleep(delay);
            continue;
          }
        }

        // If strategies couldn't handle the error or we've exhausted attempts
        throw providerError;
      }
    }

    // This should not be reached, but just in case
    throw new Error('Provider execution failed after all attempts');
  }

  /**
   * Handle provider error with strategies
   * 使用策略处理提供商错误
   */
  private async handleProviderError(
    error: Error,
    context: PipelineExecutionContext,
    operationName: string,
    attempt: number,
    executionConfig: ProviderExecutionConfig
  ): Promise<ErrorHandlingResult> {
    const strategyContext: StrategyContext = {
      operationId: `${context.executionId}-${operationName}`,
      moduleId: context.providerId || 'provider',
      pipelineContext: context,
      startTime: Date.now(),
      attempt,
      maxAttempts: this.config.maxRetries,
      lastError: error
    };

    return await this.strategyManager.handleError(error, strategyContext);
  }

  /**
   * Notify circuit breaker of success
   * 通知熔断器成功
   */
  private async notifyCircuitBreakerSuccess(): Promise<void> {
    const circuitBreakerStrategy = this.strategyManager.getStrategy('circuit_breaker');
    if (circuitBreakerStrategy && typeof (circuitBreakerStrategy as any).handleSuccess === 'function') {
      (circuitBreakerStrategy as any).handleSuccess();
    }
  }

  /**
   * Check if strategy result suggests retry
   * 检查策略结果是否建议重试
   */
  private shouldRetry(strategyResult: ErrorHandlingResult): boolean {
    return strategyResult.strategy === 'retry' &&
           strategyResult.action === 'retry' &&
           strategyResult.success;
  }

  /**
   * Get retry delay from strategy result
   * 从策略结果获取重试延迟
   */
  private getRetryDelay(strategyResult: ErrorHandlingResult, attempt: number): number {
    if (strategyResult.context && typeof strategyResult.context.delay === 'number') {
      return strategyResult.context.delay;
    }

    // Default exponential backoff
    return this.config.retryDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Sleep for specified duration
   * 睡眠指定持续时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get provider-specific strategy configuration
   * 获取提供商特定的策略配置
   */
  getProviderConfig(providerType: string): ProviderStrategyConfig {
    const baseConfig = { ...this.config };

    // Customize based on provider type
    switch (providerType.toLowerCase()) {
      case 'qwen':
        return {
          ...baseConfig,
          authErrorPatterns: [
            ...baseConfig.authErrorPatterns,
            'qwen authentication',
            'alibaba authentication'
          ],
          maxRetries: 3,
          recoveryTimeout: 120000 // 2 minutes for Qwen
        };

      case 'iflow':
        return {
          ...baseConfig,
          authErrorPatterns: [
            ...baseConfig.authErrorPatterns,
            'iflow authentication',
            '智谱 authentication'
          ],
          maxRetries: 2,
          recoveryTimeout: 90000 // 1.5 minutes for iFlow
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Create provider execution config
   * 创建提供商执行配置
   */
  createExecutionConfig(
    providerType: string,
    options: Partial<ProviderExecutionConfig> = {}
  ): ProviderExecutionConfig {
    const strategyConfig = this.getProviderConfig(providerType);

    return {
      enableStrategies: true,
      strategyConfig,
      ...options
    };
  }

  /**
   * Check if provider strategies are healthy
   * 检查提供商策略是否健康
   */
  checkProviderHealth(providerType: string): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    strategies: Record<string, any>;
    recommendations: string[];
  } {
    const managerHealth = this.strategyManager.getHealth();
    const strategySummary = this.strategyManager.getStrategyHealthSummary();

    const recommendations: string[] = [];

    // Check specific strategies for this provider
    const providerStrategies = ['retry', 'fallback', 'circuit_breaker'];
    const unhealthyStrategies = providerStrategies.filter(name => {
      const strategy = strategySummary[name];
      return strategy && strategy.health.status === 'unhealthy';
    });

    if (unhealthyStrategies.length > 0) {
      recommendations.push(`Unhealthy strategies detected: ${unhealthyStrategies.join(', ')}`);
    }

    if (managerHealth.status === 'unhealthy') {
      recommendations.push('Strategy manager is in unhealthy state');
    }

    return {
      overall: managerHealth.status,
      strategies: providerStrategies.reduce((acc, name) => {
        acc[name] = strategySummary[name]?.health || { status: 'unknown' };
        return acc;
      }, {} as Record<string, any>),
      recommendations
    };
  }
}