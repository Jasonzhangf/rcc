/**
 * OpenAI Compatible Providers Framework Entry Point
 * OpenAI兼容Providers框架入口点
 */

// Enhanced base modules
export { PipelineBaseModule, PipelineModuleConfig } from './modules/PipelineBaseModule';

// Framework classes
export { default as BaseProvider } from './framework/BaseProvider';

// Scheduling system
export { Pipeline } from './framework/Pipeline';
export { PipelineFactory } from './framework/PipelineFactory';
export { PipelineScheduler } from './framework/PipelineScheduler';
export { VirtualModelSchedulerManager } from './framework/VirtualModelSchedulerManager';

// Pipeline tracking
export { PipelineTracker } from './framework/PipelineTracker';

// OpenAI interface
export * from './framework/OpenAIInterface';

// Qwen provider
export { default as QwenProvider } from './providers/qwen';

// iFlow provider
export { default as IFlowProvider } from './providers/iflow';

// Version info
export const version = '1.0.0';
export const name = 'OpenAI Compatible Providers Framework';