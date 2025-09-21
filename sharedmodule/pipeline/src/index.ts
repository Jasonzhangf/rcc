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
export { ProviderModule } from './modules/ProviderModule';
export { BasePipelineModule } from './modules/BasePipelineModule';

// Version info
export const version = '0.1.0';
export const name = 'RCC Modular Pipeline System';