/**
 * Configuration Management Interface
 * Main coordinator for all configuration-related submodules
 */

import { IConfigManager, IConfigData } from '../submodules/ConfigManager/interfaces/IConfigManager';

export interface IConfigurationManager {
  /**
   * Initialize all configuration submodules
   */
  initialize(): Promise<void>;
  
  /**
   * Get current configuration data
   */
  getCurrentConfig(): Promise<IConfigData>;
  
  /**
   * Update configuration and notify all submodules
   */
  updateConfig(updates: Partial<IConfigData>): Promise<void>;
  
  /**
   * Get reference to specific submodule
   */
  getSubmodule<T>(submoduleName: string): T | null;
  
  /**
   * Register a configuration submodule
   */
  registerSubmodule(name: string, submodule: IConfigurationSubmodule): void;
  
  /**
   * Coordinate data synchronization between submodules
   */
  synchronizeSubmodules(): Promise<void>;
  
  /**
   * Validate entire configuration consistency
   */
  validateConfiguration(): Promise<boolean>;
  
  /**
   * Create comprehensive configuration backup
   */
  createFullBackup(): Promise<string>;
}

export interface IConfigurationSubmodule {
  /**
   * Initialize the submodule
   */
  initialize(configManager: IConfigManager): Promise<void>;
  
  /**
   * Handle configuration updates from main manager
   */
  onConfigUpdate(configData: IConfigData): Promise<void>;
  
  /**
   * Validate submodule-specific configuration
   */
  validateConfig(configData: IConfigData): boolean;
  
  /**
   * Get submodule name
   */
  getName(): string;
  
  /**
   * Clean up resources
   */
  destroy(): Promise<void>;
}

export interface IConfigurationEvent {
  type: 'update' | 'create' | 'delete' | 'validate' | 'backup';
  submodule: string;
  data?: any;
  timestamp: number;
}

export interface IConfigurationState {
  initialized: boolean;
  submodules: Map<string, IConfigurationSubmodule>;
  configManager: IConfigManager | null;
  lastSync: number;
  events: IConfigurationEvent[];
}