/**
 * RCC Pipeline Module - Modular Pipeline System
 * RCC流水线模块 - 模块化流水线系统
 */

// Core interfaces
export {
  IModularPipelineExecutor,
  ILLMSwitch,
  IWorkflowModule,
  ICompatibilityModule,
  IProviderModule,
  IPipelineModule,
  IModuleFactory,
  IConfigurationValidator,
  PipelineWrapper,
  ModuleConfig,
  PipelineExecutionContext,
  PipelineExecutionResult,
  PipelineExecutionStep,
  ProtocolType,
  ProtocolConversion,
  FieldMapping,
  ProviderInfo
} from './interfaces/ModularInterfaces';

// Core modules
export { ModularPipelineExecutor } from './core/ModularPipelineExecutor';
export { ModuleFactory } from './core/ModuleFactory';
export { ConfigurationValidator } from './core/ConfigurationValidator';

// Strategic error handling
export { StrategyManager } from './core/strategies/StrategyManager';
export { RetryStrategy } from './core/strategies/RetryStrategy';
export { FallbackStrategy } from './core/strategies/FallbackStrategy';
export { CircuitBreakerStrategy } from './core/strategies/CircuitBreakerStrategy';
export {
  IErrorHandlingStrategy,
  StrategyConfig,
  RetryStrategyConfig,
  FallbackStrategyConfig,
  CircuitBreakerStrategyConfig,
  StrategyContext,
  IStrategyManager,
  StrategyManagerMetrics,
  StrategyManagerHealth
} from './core/strategies/StrategyInterfaces';

// Monitoring and metrics system
export {
  ErrorMonitor,
  IErrorMonitor,
  AutomatedRecoverySystem,
  HealthCheckSystem,
  MonitoringIntegration,
  ErrorEvent,
  HealthStatus,
  Alert,
  RecoveryAction,
  StrategyContext as MonitoringStrategyContext,
  RecoveryPattern,
  MonitoringConfig,
  AdaptiveRecoveryConfig,
  HealthCheckConfig,
  MonitoringIntegrationConfig,
  UnifiedDashboardData
} from './core/monitoring';

// Default configurations
export {
  DEFAULT_MONITORING_CONFIG,
  DEFAULT_RECOVERY_CONFIG,
  DEFAULT_HEALTH_CHECK_CONFIG,
  DEFAULT_INTEGRATION_CONFIG
} from './core/monitoring';

// Factory functions
export {
  createErrorMonitor,
  createAutomatedRecoverySystem,
  createHealthCheckSystem,
  createMonitoringIntegration
} from './core/monitoring';

// Monitoring system version
export const MONITORING_SYSTEM_VERSION = '1.0.0';
export const MONITORING_SYSTEM_NAME = 'RCC Pipeline Monitoring System';

// Framework components
export { VirtualModelSchedulerManager } from './framework/VirtualModelSchedulerManager';
export { PipelineAssembler } from './framework/PipelineAssembler';
export { ModuleScanner } from './framework/ModuleScanner';
export { PipelineTracker } from './framework/PipelineTracker';
export {
  PipelinePool,
  AssemblyResult
} from './framework/PipelineAssembler';

// Simple stub classes for compatibility
export class PipelineFactory {
  static createPipeline(config: any) {
    return null; // Stub implementation
  }
}

// Provider stubs
export class QwenProvider {
  constructor(config: any) {
    // Stub implementation
  }
}

export class IFlowProvider {
  constructor(config: any) {
    // Stub implementation
  }
}

export class PipelineScheduler {
  constructor(config: any) {
    // Stub implementation
  }
}

export class BaseProvider {
  constructor(config: any) {
    // Stub implementation
  }
}

// Pipeline modules
export { LLMSwitchModule } from './modules/LLMSwitchModule';
export { WorkflowModule } from './modules/WorkflowModule';
export { CompatibilityModule } from './modules/CompatibilityModule';
// ProviderModule has been removed - real providers are now used directly
export { BasePipelineModule } from './modules/BasePipelineModule';
export { UnifiedPipelineBaseModule, PipelineBaseModule, DebuggablePipelineModule } from './modules/PipelineBaseModule';

// Version info
export const version = '0.1.0';
export const name = 'RCC Modular Pipeline System';