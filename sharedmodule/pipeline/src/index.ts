/**
 * RCC Pipeline Module - Enhanced Pipeline System with Integrated Tracing
 * RCC流水线模块 - 带有集成跟踪的增强流水线系统
 */

// Enhanced base modules
export { PipelineBaseModule, PipelineModuleConfig } from './modules/PipelineBaseModule';

// Debuggable pipeline module
export {
  DebuggablePipelineModule,
  DebuggablePipelineModuleConfig,
  ExecutionOptions,
  ExecutionResult,
  ExecutionMetrics,
  TraceSummary
} from './core/DebuggablePipelineModule';

// Core execution context system
export {
  PipelineExecutionContext,
  ExecutionContextFactory,
  ExecutionContextOptions,
  ModuleInfo,
  PipelineStage,
  ExecutionError,
  ExecutionStatistics
} from './core/PipelineExecutionContext';

// LLMSwitch Module - Standard Protocol Conversion Layer
export {
  LLMSwitchModule,
  LLMSwitchConfig,
  ProtocolTransformer,
  TransformerRegistration,
  ProtocolType
} from './modules/LLMSwitchModule';

// Field mapping interfaces and transformation system
export {
  MappingTable,
  FieldMapping,
  ProtocolMapping,
  FieldTransformType,
  TransformContext,
  FieldTransformerRegistry,
  TransformResult
} from './interfaces/FieldMapping';

// Standard request/response interfaces
export {
  StandardRequest,
  StandardResponse,
  StandardErrorResponse
} from './interfaces/StandardInterfaces';

// Built-in transformers
export { AnthropicToOpenAITransformer } from './transformers/AnthropicToOpenAITransformer';
export { OpenAIPassthroughTransformer } from './modules/LLMSwitchModule';

// Framework classes
export { BaseProvider } from './framework/BaseProvider';

// Module discovery and assembly
export { ModuleScanner, ProviderDiscoveryOptions } from './framework/ModuleScanner';
export { PipelineAssembler, AssemblerConfig, AssemblyResult } from './framework/PipelineAssembler';

// Scheduling system
export { Pipeline } from './framework/Pipeline';
export { VirtualModelSchedulerManager } from './framework/VirtualModelSchedulerManager';

// Pipeline tracking
export { PipelineTracker } from './framework/PipelineTracker';

// Error types
export {
  ErrorCategory,
  ErrorSeverity,
  TraceEventType,
  EnhancedErrorInfo,
  TraceEvent,
  IErrorHandler,
  IPerformanceMetrics
} from './types/ErrorTypes';

// OpenAI interface
export * from './framework/OpenAIInterface';

// Qwen provider
export { default as QwenProvider } from './providers/qwen';

// iFlow provider
export { default as IFlowProvider } from './providers/iflow';

// Routing system
export {
  RoutingCapabilities,
  RequestAnalysisResult,
  RoutingDecision,
  RoutingMatchResult,
  RoutingRule,
  RoutingStrategyConfig
} from './routing/RoutingCapabilities';

export {
  RequestAnalyzer,
  RequestAnalyzerConfig,
  AnalysisStatistics
} from './routing/RequestAnalyzer';

export {
  RoutingRulesEngine,
  RoutingRulesEngineConfig,
  RoutingStatistics
} from './routing/RoutingRulesEngine';

// RoutingContext is exported from RoutingCapabilities, not RoutingRulesEngine
export {
  RoutingContext
} from './routing/RoutingCapabilities';

// Routing system example
export {
  RoutingExample,
  runRoutingExample
} from './routing/RoutingExample';

// Version info
export const version = '1.0.0';
export const name = 'OpenAI Compatible Providers Framework';