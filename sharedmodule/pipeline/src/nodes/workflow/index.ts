// Workflow Framework exports
export { WorkflowFramework } from './WorkflowFramework';
export { WorkflowFrameworkConfig } from './WorkflowFramework';

// Workflow Implementation exports
export {
  StreamConverterModule,
  BatchProcessorModule,
  DefaultWorkflowModule
} from './implementations/WorkflowImplementations';

// Legacy support - export the original WorkflowModule as well
export { WorkflowModule } from '../../modules/WorkflowModule';
export { 
  WorkflowConfig,
  StreamConversionNeeds,
  StreamChunk,
  StreamProcessingContext
} from '../../modules/WorkflowModule';

// Type exports
export type { 
  WorkflowFrameworkConfig 
} from './WorkflowFramework';