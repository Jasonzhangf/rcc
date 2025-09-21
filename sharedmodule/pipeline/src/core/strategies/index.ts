/**
 * Strategic Error Handling for RCC Pipeline System
 * RCC流水线系统的策略化错误处理
 *
 * Comprehensive error handling strategies including retry, fallback,
 * and circuit breaker patterns that integrate with RCC error handling framework.
 */

export {
  // Interfaces
  IErrorHandlingStrategy,
  StrategyContext,
  StrategyConfig,
  StrategyHealth,
  StrategyMetrics,
  RetryStrategyConfig,
  FallbackStrategyConfig,
  CircuitBreakerStrategyConfig,
  FallbackAction,
  CircuitBreakerState,
  IStrategyManager,
  StrategyManagerHealth,
  StrategyManagerMetrics
} from './StrategyInterfaces';

export {
  // Strategies
  RetryStrategy
} from './RetryStrategy';

export {
  FallbackStrategy
} from './FallbackStrategy';

export {
  CircuitBreakerStrategy
} from './CircuitBreakerStrategy';

export {
  // Manager
  StrategyManager
} from './StrategyManager';

// Convenience exports
export * from './StrategyInterfaces';