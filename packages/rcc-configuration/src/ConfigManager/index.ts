/**
 * ConfigManager - Configuration File Management
 * 
 * Handles configuration file operations including loading, saving, validation,
 * and backup management for the RCC configuration system.
 */

export { ConfigManager } from './src/ConfigManager';
export type { 
  IConfigManager,
  IConfigurationData,
  IConfigManagerOptions 
} from './interfaces/IConfigManager';
export { CONFIG_MANAGER_CONSTANTS } from './constants/ConfigManager.constants';