/**
 * RCC Pipeline Module System
 * A comprehensive pipeline scheduling and load balancing system built on BaseModule
 */

// Export BaseModule interfaces and types from rcc-basemodule package
export * from 'rcc-basemodule';

// Core pipeline components
export { PipelineScheduler, IPipelineScheduler } from './PipelineScheduler';
export { PipelineInstance, IPipelineInstance } from './PipelineInstance';
export { PipelineConfigManager } from './PipelineConfig';

// Load balancer exports
export {
  LoadBalancerStrategy,
  LoadBalancerStats,
  InstanceStats,
  RoundRobinLoadBalancer,
  WeightedRoundRobinLoadBalancer,
  LeastConnectionsLoadBalancer,
  RandomLoadBalancer,
  LoadBalancerFactory
} from './LoadBalancers';

// Error handling exports
export {
  // Error codes
  PipelineErrorCode,
  PipelineErrorCategory,
  PipelineState,
  PipelineHealth,
  PipelineExecutionStatus,
  
  // Core types
  PipelineError,
  PipelineErrorImpl,
  ErrorHandlingStrategy,
  PipelineHealthMetrics,
  PipelineExecutionContext,
  PipelineExecutionResult,
  ErrorHandlerFunction,
  ErrorHandlingAction,
  PipelineBlacklistEntry,
  
  // Constants and mappings
  ERROR_CODE_TO_HTTP_STATUS,
  DEFAULT_ERROR_HANDLING_STRATEGIES
} from './ErrorTypes';

// Configuration exports
export {
  PipelineConfig,
  LoadBalancerConfig,
  CircuitBreakerConfig,
  RetryPolicy,
  HealthCheckConfig,
  SchedulerConfig,
  BlacklistConfig,
  PipelineSystemConfig,
  GlobalSettings,
  ConfigValidationResult
} from './PipelineConfig';

// Complete configuration interfaces
export {
  PipelineAssemblyTable,
  PipelineSchedulerConfig,
  RoutingRule,
  RouteCondition,
  ConditionOperator,
  PipelineTemplate,
  ModuleInstanceConfig,
  ModuleAssemblyConfig,
  LoadBalancingConfig,
  HealthCheckConfig,
  ErrorHandlingConfig,
  PerformanceConfig,
  MonitoringConfig,
  SecurityConfig,
  CompleteConfigValidationResult,
  PipelineConfigFactory
} from './PipelineCompleteConfig';

// Pipeline modules
export {
  BasePipelineModule,
  WorkflowModule,
  ProviderModule,
  CompatibilityModule,
  LLMSwitchModule
} from './modules';

// Pipeline assembler
export {
  PipelineAssembler,
  IPipelineAssembler
} from './interfaces';

// Configuration examples
export {
  simpleApiAssemblyTable,
  advancedSchedulerConfig,
  simpleSchedulerConfig,
  getSchedulerConfig,
  getAssemblyTable
} from './ConfigurationExamples';