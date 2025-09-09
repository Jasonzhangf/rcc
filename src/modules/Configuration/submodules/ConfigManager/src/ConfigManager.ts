/**
 * Configuration Manager Module
 * Handles configuration file operations, backup/restore functionality
 * Extracted from monolithic server for better modularity
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { BaseModule } from '../../core/BaseModule';
import { CONFIG_MANAGER_CONSTANTS } from '../constants/ConfigManager.constants';
import {
  IConfigManager,
  IConfigData,
  IProvider,
  IModel,
  IBlacklistEntry,
  IPoolEntry
} from '../interfaces/IConfigManager';

export class ConfigManager extends BaseModule implements IConfigManager {
  private configPath: string;
  private configDirPath: string;
  private currentConfig: IConfigData | null = null;

  constructor() {
    super('ConfigManager', '1.0.0', 'Configuration management for multi-key UI');
    this.configPath = CONFIG_MANAGER_CONSTANTS.CONFIG_FILE_PATH;
    this.configDirPath = CONFIG_MANAGER_CONSTANTS.CONFIG_DIR_PATH;
  }

  async initialize(): Promise<void> {
    try {
      await this.ensureConfigDirectory();
      this.currentConfig = await this.loadConfig();
      console.log(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} ${CONFIG_MANAGER_CONSTANTS.SUCCESS.CONFIG_LOADED}`);
    } catch (error) {
      console.error(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} Initialization failed:`, error);
      throw error;
    }
  }

  async loadConfig(): Promise<IConfigData> {
    try {
      const configData = await fs.readFile(this.configPath, CONFIG_MANAGER_CONSTANTS.FILE_ENCODING);
      const config: IConfigData = JSON.parse(configData);
      
      if (!this.validateConfig(config)) {
        throw new Error(CONFIG_MANAGER_CONSTANTS.ERRORS.VALIDATION_FAILED);
      }
      
      this.currentConfig = config;
      return config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(CONFIG_MANAGER_CONSTANTS.ERRORS.CONFIG_NOT_FOUND);
      }
      throw new Error(`${CONFIG_MANAGER_CONSTANTS.ERRORS.FILE_READ_ERROR}: ${(error as Error).message}`);
    }
  }

  async saveConfig(config: IConfigData): Promise<void> {
    try {
      if (!this.validateConfig(config)) {
        throw new Error(CONFIG_MANAGER_CONSTANTS.ERRORS.VALIDATION_FAILED);
      }
      
      // Update timestamp
      config.last_updated = new Date().toISOString();
      
      // Create backup before saving
      if (this.currentConfig) {
        await this.createBackup();
      }
      
      const configJson = JSON.stringify(config, null, 2);
      await fs.writeFile(this.configPath, configJson, CONFIG_MANAGER_CONSTANTS.FILE_ENCODING);
      
      this.currentConfig = config;
      console.log(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} ${CONFIG_MANAGER_CONSTANTS.SUCCESS.CONFIG_SAVED}`);
    } catch (error) {
      throw new Error(`${CONFIG_MANAGER_CONSTANTS.ERRORS.FILE_WRITE_ERROR}: ${(error as Error).message}`);
    }
  }

  async createBackup(): Promise<string> {
    try {
      if (!this.currentConfig) {
        await this.loadConfig();
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${CONFIG_MANAGER_CONSTANTS.BACKUP_PREFIX}${timestamp}`;
      const backupPath = join(this.configDirPath, backupFileName);
      
      const configJson = JSON.stringify(this.currentConfig, null, 2);
      await fs.writeFile(backupPath, configJson, CONFIG_MANAGER_CONSTANTS.FILE_ENCODING);
      
      console.log(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} ${CONFIG_MANAGER_CONSTANTS.SUCCESS.BACKUP_CREATED}: ${backupPath}`);
      return backupPath;
    } catch (error) {
      throw new Error(`${CONFIG_MANAGER_CONSTANTS.ERRORS.BACKUP_FAILED}: ${(error as Error).message}`);
    }
  }

  async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      const backupData = await fs.readFile(backupPath, CONFIG_MANAGER_CONSTANTS.FILE_ENCODING);
      const backupConfig: IConfigData = JSON.parse(backupData);
      
      if (!this.validateConfig(backupConfig)) {
        throw new Error(`${CONFIG_MANAGER_CONSTANTS.ERRORS.VALIDATION_FAILED} - Invalid backup file`);
      }
      
      await this.saveConfig(backupConfig);
      console.log(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} ${CONFIG_MANAGER_CONSTANTS.SUCCESS.CONFIG_RESTORED}`);
    } catch (error) {
      throw new Error(`${CONFIG_MANAGER_CONSTANTS.ERRORS.RESTORE_FAILED}: ${(error as Error).message}`);
    }
  }

  validateConfig(config: IConfigData): boolean {
    try {
      // Check required top-level fields
      for (const field of CONFIG_MANAGER_CONSTANTS.VALIDATION.REQUIRED_FIELDS) {
        if (!(field in config)) {
          console.error(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} Missing required field: ${field}`);
          return false;
        }
      }
      
      // Validate providers
      if (!Array.isArray(config.providers)) {
        console.error(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} Providers must be an array`);
        return false;
      }
      
      for (const provider of config.providers) {
        if (!this.validateProvider(provider)) {
          return false;
        }
      }
      
      // Validate arrays exist (can be empty)
      const arrayFields = ['routes', 'model_blacklist', 'provider_pool'];
      for (const field of arrayFields) {
        if (config[field as keyof IConfigData] && !Array.isArray(config[field as keyof IConfigData])) {
          console.error(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} ${field} must be an array`);
          return false;
        }
      }
      
      console.log(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} ${CONFIG_MANAGER_CONSTANTS.SUCCESS.VALIDATION_PASSED}`);
      return true;
    } catch (error) {
      console.error(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} Validation error:`, error);
      return false;
    }
  }

  getConfigPath(): string {
    return this.configPath;
  }

  getCurrentConfig(): IConfigData | null {
    return this.currentConfig;
  }

  // Helper methods
  private async ensureConfigDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.configDirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create config directory: ${(error as Error).message}`);
    }
  }

  private validateProvider(provider: IProvider): boolean {
    // Check required provider fields
    for (const field of CONFIG_MANAGER_CONSTANTS.VALIDATION.MIN_PROVIDER_FIELDS) {
      if (!(field in provider)) {
        console.error(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} Provider missing required field: ${field}`);
        return false;
      }
    }
    
    // Validate protocol
    if (!CONFIG_MANAGER_CONSTANTS.VALIDATION.SUPPORTED_PROTOCOLS.includes(provider.protocol)) {
      console.error(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} Unsupported protocol: ${provider.protocol}`);
      return false;
    }
    
    // Validate auth_type
    if (!CONFIG_MANAGER_CONSTANTS.VALIDATION.SUPPORTED_AUTH_TYPES.includes(provider.auth_type)) {
      console.error(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} Unsupported auth_type: ${provider.auth_type}`);
      return false;
    }
    
    // Validate models array
    if (!Array.isArray(provider.models)) {
      console.error(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} Provider models must be an array`);
      return false;
    }
    
    return true;
  }

  // BaseModule required methods
  async receiveData(data: any): Promise<any> {
    // Handle configuration operations
    const { action, config } = data;
    
    switch (action) {
      case 'load':
        return await this.loadConfig();
      case 'save':
        await this.saveConfig(config);
        return { success: true };
      case 'backup':
        const backupPath = await this.createBackup();
        return { success: true, backupPath };
      case 'restore':
        await this.restoreFromBackup(data.backupPath);
        return { success: true };
      case 'validate':
        const isValid = this.validateConfig(config);
        return { valid: isValid };
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async destroy(): Promise<void> {
    this.currentConfig = null;
    console.log(`${CONFIG_MANAGER_CONSTANTS.LOG_PREFIX} Module destroyed`);
  }
}