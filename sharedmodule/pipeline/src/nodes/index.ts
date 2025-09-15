// Pipeline Node Frameworks Main Index
// This file exports all node frameworks and their implementations

// Core Framework Components
export {
  NodeImplementationInfo,
  NodeImplementationRegistry,
  NodeImplementationScanner,
  SelectionCriteria
} from '../core';

// Individual Node Frameworks
export * from './llmswitch';
export * from './workflow';
export * from './compatibility';
export * from './provider';

// Legacy Module Support (for backward compatibility)
// Excluding specific conflicting exports
export {
  BasePipelineModule,
  LLMSwitchModule,
  CompatibilityModule,
  WorkflowModule,
  AuthModule,
  AuthCenter
} from '../modules';

// Type exports for all frameworks
export type {
  LLMSwitchFrameworkConfig,
  WorkflowFrameworkConfig,
  CompatibilityFrameworkConfig,
  ProviderFrameworkConfig
} from './';

// Utility functions for framework initialization
export async function initializePipelineFrameworks(): Promise<void> {
  // Initialize and scan for all implementations
  await NodeImplementationScanner.scanAndRegister();
}

// Get statistics for all frameworks
export function getPipelineFrameworkStatistics() {
  const registry = NodeImplementationRegistry.getInstance();
  const stats = registry.getStatistics();
  
  return {
    ...stats,
    frameworks: {
      llmswitch: registry.getImplementations('llmswitch').length,
      workflow: registry.getImplementations('workflow').length,
      compatibility: registry.getImplementations('compatibility').length,
      provider: registry.getImplementations('provider').length
    }
  };
}