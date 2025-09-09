// Configuration Module Constants Index
// Exports all configuration-related constants following RCC standards

// Export individual constant files
export { CONFIG_LOADER_CONSTANTS } from './ConfigLoaderConstants';
export { CONFIG_VALIDATOR_CONSTANTS } from './ConfigValidatorConstants';
export { CONFIG_PERSISTENCE_CONSTANTS } from './ConfigPersistenceConstants';
export { CONFIG_UI_CONSTANTS } from './ConfigUIModule.constants';
export { CONFIGURATION_SYSTEM_CONSTANTS } from './ConfigurationSystem.constants';

// Export types
export type {
  WatchEventType,
  MergeStrategy,
  ConnectionType,
  DataTransferType
} from './ConfigLoaderConstants';

// Default export
export default {
  CONFIG_LOADER_CONSTANTS,
  CONFIG_VALIDATOR_CONSTANTS,
  CONFIG_PERSISTENCE_CONSTANTS,
  CONFIG_UI_CONSTANTS,
  CONFIGURATION_SYSTEM_CONSTANTS
};