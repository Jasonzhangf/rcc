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

// Pipeline modules
export { LLMSwitchModule } from './modules/LLMSwitchModule';
export { WorkflowModule } from './modules/WorkflowModule';
export { CompatibilityModule } from './modules/CompatibilityModule';
export { ProviderModule } from './modules/ProviderModule';
export { BasePipelineModule } from './modules/BasePipelineModule';

// Version info
export const version = '0.1.0';
export const name = 'RCC Modular Pipeline System';