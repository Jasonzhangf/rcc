// Configuration Module Interfaces Index
// Exports all configuration-related interfaces following RCC standards

// Export individual interface files
export type { IConfigLoaderModule } from './IConfigLoaderModule';
export type { IConfigValidatorModule } from './IConfigValidatorModule';
export type { IConfigPersistenceModule } from './IConfigPersistenceModule';
export type { IConfigUIModule } from './IConfigUIModule';
export type { IConfigurationSystem } from './IConfigurationSystem';

// Default export
export default {
  // Interfaces are type-only exports, so we can't default export them
  // This default export is just to satisfy the module structure requirement
};