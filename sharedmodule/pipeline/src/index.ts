/**
 * RCC Pipeline Module System - Enhanced with WebAuto Framework
 * A comprehensive pipeline scheduling and load balancing system built on BaseModule
 * Now integrated with WebAuto Pipeline Framework for enhanced capabilities
 */

// Export BaseModule interfaces and types from rcc-basemodule package
export {
  BaseModule,
  ModuleInfo,
  Message,
  MessageResponse,
  MessageCenter,
  ValidationResult
} from 'rcc-basemodule';

// === LEGACY RCC PIPELINE COMPONENTS (for backward compatibility) ===

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
  SchedulerConfig,
  BlacklistConfig,
  PipelineSystemConfig,
  GlobalSettings
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

// Legacy pipeline modules
export {
  BasePipelineModule,
  WorkflowModule,
  ProviderModule,
  CompatibilityModule,
  LLMSwitchModule,
  LMStudioProviderModule
} from './modules';

// Legacy compatibility modules
export {
  QwenCompatibilityModule,
  QwenCompatibilityConfig,
  type OpenAIChatRequest as QwenOpenAIChatRequest,
  type OpenAIChatResponse as QwenOpenAIChatResponse,
  type QwenChatRequest,
  type QwenChatResponse
} from './modules/QwenCompatibilityModule';

export {
  LMStudioCompatibilityModule,
  LMStudioCompatibilityConfig,
  type OpenAIChatRequest as LMStudioOpenAIChatRequest,
  type OpenAIChatResponse as LMStudioOpenAIChatResponse,
  type LMStudioChatRequest,
  type LMStudioChatResponse
} from './modules/LMStudioCompatibilityModule';

export {
  IFlowCompatibilityModule,
  IFlowCompatibilityConfig,
  IFlowAgent,
  IFlowTool,
  type OpenAIChatRequest as IFlowOpenAIChatRequest,
  type OpenAIChatResponse as IFlowOpenAIChatResponse,
  type IFlowChatRequest,
  type IFlowChatResponse
} from './modules/IFlowCompatibilityModule';

// New Pipeline Node Frameworks
export * from './nodes';

// Pipeline assembler interfaces
export {
  IPipelineAssembler
} from './interfaces';

// === NEW WEBAUTO INTEGRATION COMPONENTS ===

// Enhanced integration components
export {
  EnhancedConfigurationToPipelineModule,
  EnhancedPipelineAssemblyResult,
  PipelineExecutionResult
} from './integration/EnhancedConfigurationToPipelineModule';

// Configuration adapter for WebAuto framework
export {
  WebAutoConfigurationAdapter,
  WebAutoProviderConfig,
  WebAutoPipelineConfig,
  AdapterResult
} from './integration/WebAutoConfigurationAdapter';

// Pipeline builder for WebAuto framework
export {
  WebAutoPipelineBuilder,
  PipelineBuilderOptions,
  LoadBalancingConfig,
  PipelineConstructionResult
} from './integration/WebAutoPipelineBuilder';

// Try to export WebAuto components (if available)
let WebAutoFramework: any;
try {
  WebAutoFramework = require('webauto-pipelineframework');

  // Export WebAuto core components
  export const {
    Pipeline: WebAutoPipeline,
    PipelineManager: WebAutoPipelineManager,
    BasePipelineNode: WebAutoBasePipelineNode
  } = WebAutoFramework;

  // Export WebAuto nodes
  export const {
    LLMSwitchNode: WebAutoLLMSwitchNode,
    WorkflowNode: WebAutoWorkflowNode,
    CompatibilityNode: WebAutoCompatibilityNode,
    ProviderNode: WebAutoProviderNode
  } = WebAutoFramework;

  // Export WebAuto compatibility components
  export const {
    CompatibilityManager: WebAutoCompatibilityManager,
    GenericCompatibility: WebAutoGenericCompatibility
  } = WebAutoFramework;

  // Export WebAuto transformer components
  export const {
    Transformer: WebAutoTransformer,
    TransformerManager: WebAutoTransformerManager,
    AnthropicTransformer: WebAutoAnthropicTransformer,
    OpenAITransformer: WebAutoOpenAITransformer,
    GeminiTransformer: WebAutoGeminiTransformer,
    PassThroughTransformer: WebAutoPassThroughTransformer,
    UnifiedChatRequest: WebAutoUnifiedChatRequest,
    UnifiedChatResponse: WebAutoUnifiedChatResponse
  } = WebAutoFramework;

} catch (error) {
  console.warn('WebAuto Pipeline Framework not available, exports will be undefined');

  // Provide dummy exports for TypeScript compilation
  export const WebAutoPipeline = undefined;
  export const WebAutoPipelineManager = undefined;
  export const WebAutoBasePipelineNode = undefined;
  export const WebAutoLLMSwitchNode = undefined;
  export const WebAutoWorkflowNode = undefined;
  export const WebAutoCompatibilityNode = undefined;
  export const WebAutoProviderNode = undefined;
  export const WebAutoCompatibilityManager = undefined;
  export const WebAutoGenericCompatibility = undefined;
  export const WebAutoTransformer = undefined;
  export const WebAutoTransformerManager = undefined;
}

// === ENHANCED FACTORY FUNCTIONS ===

/**
 * Enhanced pipeline factory - creates RCC pipelines using WebAuto framework
 * Provides backward compatibility by falling back to legacy system if WebAuto is not available
 */
export class EnhancedPipelineFactory {

  /**
   * Create enhanced pipeline system with integrated WebAuto capabilities
   */
  static createEnhancedSystem(config: any): EnhancedConfigurationToPipelineModule | null {
    try {
      const configurationSystem = config.configurationSystem;
      const virtualModelRulesModule = config.virtualModelRulesModule;

      if (!configurationSystem || !virtualModelRulesModule) {
        throw new Error('Configuration system and virtual model rules module are required');
      }

      return new EnhancedConfigurationToPipelineModule(
        configurationSystem,
        virtualModelRulesModule
      );
    } catch (error) {
      console.error('Failed to create enhanced pipeline system:', error);
      return null;
    }
  }

  /**
   * Check if WebAuto framework is available
   */
  static isWebAutoAvailable(): boolean {
    try {
      return !!require('webauto-pipelineframework');
    } catch {
      return false;
    }
  }

  /**
   * Get pipeline system capabilities
   */
  static getAvailableCapabilities(): string[] {
    const capabilities = [
      'legacy-pipeline',
      'load-balancing',
      'error-handling'
    ];

    if (this.isWebAutoAvailable()) {
      capabilities.push(
        'webauto-framework',
        'modular-pipeline-nodes',
        'dynamic-pipeline-building',
        'enhanced-protocol-transformation',
        'advanced-error-recovery'
      );
    }

    return capabilities;
  }
}

// === UTILITY EXPORTS ===

/**
 * Pipeline system version and metadata
 */
export const PIPELINE_MODULE_VERSION = '2.0.0';
export const PIPELINE_MODULE_COMPATIBILITY = {
  webAuto: '1.0.0+',
  rcc: '0.1.0+'
};

/**
 * Quick start utilities
 */
export const PipelineUtils = {

  /**
   * Validate pipeline system setup
   */
  validateSystem(): { valid: boolean; issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check WebAuto availability
    if (!EnhancedPipelineFactory.isWebAutoAvailable()) {
      issues.push('WebAuto Pipeline Framework is not installed or available');
      recommendations.push('Install webauto-pipelineframework: npm install webauto-pipelineframework');
    }

    // Check required dependencies
    try {
      require('rcc-basemodule');
      require('rcc-configuration');
    } catch (error) {
      issues.push(`Missing required dependency: ${error.message}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  },

  /**
   * Get system health information
   */
  getSystemHealth(): any {
    const webAutoAvailable = EnhancedPipelineFactory.isWebAutoAvailable();

    return {
      version: PIPELINE_MODULE_VERSION,
      webAutoFramework: {
        available: webAutoAvailable,
        version: webAutoAvailable ? '1.0.0+' : 'N/A'
      },
      capabilities: EnhancedPipelineFactory.getAvailableCapabilities(),
      timestamp: new Date().toISOString()
    };
  }
};

// Configuration examples - excluded due to type conflicts

// Default export for CommonJS compatibility
export default {
  // Legacy exports
  PipelineScheduler,
  PipelineInstance,
  PipelineConfigManager,
  LoadBalancerFactory,

  // New exports
  EnhancedConfigurationToPipelineModule,
  WebAutoConfigurationAdapter,
  WebAutoPipelineBuilder,
  EnhancedPipelineFactory,
  PipelineUtils,

  // Version and utilities
  PIPELINE_MODULE_VERSION,
  PIPELINE_MODULE_COMPATIBILITY,

  // WebAuto exports (conditional)
  WebAutoPipeline,
  WebAutoPipelineManager,
  WebAutoBasePipelineNode
};