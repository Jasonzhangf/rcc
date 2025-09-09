// Configuration Module Entry Point
// Exports all configuration-related modules following RCC standards

// Export module classes
export { ConfigLoaderModule } from './ConfigLoaderModule';
export { ConfigValidatorModule } from './ConfigValidatorModule';
export { ConfigPersistenceModule } from './ConfigPersistenceModule';
export { ConfigUIModule } from './ConfigUIModule';

// Export interfaces
export type { IConfigLoaderModule } from '../interfaces/IConfigLoaderModule';
export type { IConfigValidatorModule } from '../interfaces/IConfigValidatorModule';
export type { IConfigPersistenceModule } from '../interfaces/IConfigPersistenceModule';
export type { IConfigUIModule } from '../interfaces/IConfigUIModule';

// Export types
export type { ConfigurationData } from '../types/Configuration.types';
export type { ValidationError } from '../types/Validation.types';
export type { BackupInfo } from '../types/Backup.types';

// Export constants
export {
  CONFIG_LOADER_CONSTANTS,
  CONFIG_VALIDATOR_CONSTANTS,
  CONFIG_PERSISTENCE_CONSTANTS,
  CONFIG_UI_CONSTANTS
} from '../constants';

// Default export
export default {
  ConfigLoaderModule,
  ConfigValidatorModule,
  ConfigPersistenceModule,
  ConfigUIModule
};