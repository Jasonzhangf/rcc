// Compatibility Framework exports
export { CompatibilityFramework } from './CompatibilityFramework';
export { CompatibilityFrameworkConfig } from './CompatibilityFramework';

// Compatibility Implementation exports
export {
  JSONCompatibilityModule,
  DefaultCompatibilityModule
} from './implementations/CompatibilityImplementations';

// Legacy support - export the original CompatibilityModule as well
export { CompatibilityModule } from '../../modules/CompatibilityModule';
export { 
  CompatibilityConfig,
  FieldMapping,
  MappingTable,
  ValidationContext,
  ValidationResult
} from '../../modules/CompatibilityModule';

// Type exports
export type { 
  CompatibilityFrameworkConfig 
} from './CompatibilityFramework';