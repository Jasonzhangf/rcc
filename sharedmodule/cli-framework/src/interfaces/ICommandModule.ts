/**
 * Command Module Interface for RCC CLI Framework
 */

import { ICommand } from './ICommand';

export interface CommandModuleMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  repository?: string;
  keywords?: string[];
}

export interface CommandModuleConfig {
  autoLoad?: boolean;
  priority?: number;
  dependencies?: string[];
  environment?: string[];
}

export interface ICommandModule {
  /**
   * Module metadata
   */
  readonly metadata: CommandModuleMetadata;
  
  /**
   * Module configuration
   */
  readonly config?: CommandModuleConfig;
  
  /**
   * Initialize the command module
   */
  initialize?(): Promise<void>;
  
  /**
   * Get all commands provided by this module
   */
  getCommands(): Promise<ICommand[]>;
  
  /**
   * Cleanup resources when module is unloaded
   */
  cleanup?(): Promise<void>;
  
  /**
   * Check if module can be loaded in current environment
   */
  canLoad?(): Promise<boolean>;
  
  /**
   * Get module status
   */
  getStatus?(): Promise<ModuleStatus>;
}

export interface ModuleStatus {
  loaded: boolean;
  initialized: boolean;
  commandCount: number;
  lastError?: string;
  loadedAt?: Date;
}

export interface ModuleLoadResult {
  success: boolean;
  module?: ICommandModule;
  error?: string;
  warnings?: string[];
}