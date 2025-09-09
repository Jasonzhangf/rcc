/**
 * ConfigManager Interface Definitions
 * 
 * Defines the contract for configuration file management operations
 */

import type { 
  IConfigurationData, 
  IManagerOptions, 
  IValidationResult,
  IConfigManagerOptions
} from '../../shared/types';

export interface IConfigManager {
  // Lifecycle methods
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  // Configuration CRUD operations
  getConfig(): Promise<IConfigurationData | null>;
  saveConfig(config: IConfigurationData): Promise<void>;
  updateConfig(updates: Partial<IConfigurationData>): Promise<void>;
  resetConfig(): Promise<void>;

  // Backup management
  createBackup(label?: string): Promise<string>;
  restoreBackup(backupId: string): Promise<void>;
  listBackups(): Promise<Array<{
    id: string;
    label?: string;
    created_at: string;
    size: number;
  }>>;
  deleteBackup(backupId: string): Promise<boolean>;

  // Validation
  validateConfig(config?: IConfigurationData): Promise<IValidationResult>;
  repairConfig(config?: IConfigurationData): Promise<{
    config: IConfigurationData;
    repairs_made: string[];
  }>;

  // File operations
  getConfigPath(): string;
  configExists(): Promise<boolean>;
  getConfigStats(): Promise<{
    exists: boolean;
    size: number;
    modified_at: string;
    version?: string;
  }>;

  // Events and monitoring
  onConfigChanged(callback: (config: IConfigurationData) => void): void;
  offConfigChanged(callback: (config: IConfigurationData) => void): void;
  getLastModified(): Promise<string | null>;
}

export interface IConfigurationData {
  version: string;
  last_updated: string;
  providers: any[];
  routes?: any[];
  virtual_categories?: any[];
  global_config: any;
  model_blacklist?: any[];
  provider_pool?: any[];
  metadata?: Record<string, any>;
}

export { IConfigManagerOptions } from '../../shared/types';