/**
 * ConfigManager - Configuration File Management Implementation
 * 
 * Provides robust configuration file operations with validation, backup,
 * and event handling capabilities for the RCC configuration system.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

import type { 
  IConfigManager,
  IConfigurationData,
  IConfigManagerOptions
} from '../interfaces/IConfigManager';
import type { IValidationResult } from '../../shared/types';
import { CONFIG_MANAGER_CONSTANTS } from '../constants/ConfigManager.constants';

export class ConfigManager implements IConfigManager {
  private configPath: string;
  private initialized = false;
  private configCache: IConfigurationData | null = null;
  private changeListeners: Array<(config: IConfigurationData) => void> = [];
  private backupDir: string;
  private tempDir: string;
  private saveInProgress = false;

  constructor(
    configPath?: string,
    private options: IConfigManagerOptions = {}
  ) {
    // Set up paths
    if (configPath) {
      this.configPath = configPath;
    } else {
      const homeDir = os.homedir();
      const configDir = path.join(homeDir, CONFIG_MANAGER_CONSTANTS.FILE_SYSTEM.DEFAULT_CONFIG_DIR);
      this.configPath = path.join(configDir, CONFIG_MANAGER_CONSTANTS.FILE_SYSTEM.DEFAULT_CONFIG_FILENAME);
    }
    
    this.backupDir = path.join(path.dirname(this.configPath), CONFIG_MANAGER_CONSTANTS.FILE_SYSTEM.BACKUP_DIR);
    this.tempDir = path.join(path.dirname(this.configPath), CONFIG_MANAGER_CONSTANTS.FILE_SYSTEM.TEMP_DIR);

    // Apply default options
    this.options = {
      autoSave: CONFIG_MANAGER_CONSTANTS.DEFAULT_CONFIG.AUTO_SAVE,
      backupOnChange: CONFIG_MANAGER_CONSTANTS.DEFAULT_CONFIG.BACKUP_ON_CHANGE,
      maxBackups: CONFIG_MANAGER_CONSTANTS.DEFAULT_CONFIG.MAX_BACKUPS,
      validateOnLoad: CONFIG_MANAGER_CONSTANTS.DEFAULT_CONFIG.VALIDATE_ON_LOAD,
      enableLogging: true,
      logLevel: 'info',
      enableValidation: true,
      ...options
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log(`🔧 [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Initializing configuration manager...`);

    try {
      // Ensure directories exist
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.ensureDir(this.backupDir);
      await fs.ensureDir(this.tempDir);

      // Load configuration if it exists, otherwise create default
      if (await this.configExists()) {
        await this.loadConfiguration();
      } else if (CONFIG_MANAGER_CONSTANTS.DEFAULT_CONFIG.CREATE_MISSING) {
        await this.createDefaultConfiguration();
      }

      this.initialized = true;
      console.log(`✅ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Initialized successfully`);
    } catch (error) {
      console.error(`❌ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Initialization failed:`, error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    // Save any pending changes
    if (this.configCache && this.options.autoSave) {
      await this.saveConfig(this.configCache);
    }

    // Clear cache and listeners
    this.configCache = null;
    this.changeListeners.length = 0;
    this.initialized = false;

    console.log(`✅ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Destroyed successfully`);
  }

  // Configuration operations
  async getConfig(): Promise<IConfigurationData | null> {
    if (!this.initialized) {
      throw new Error('ConfigManager not initialized');
    }

    if (this.configCache) {
      return { ...this.configCache }; // Return a copy
    }

    return await this.loadConfiguration();
  }

  async saveConfig(config: IConfigurationData): Promise<void> {
    if (!this.initialized) {
      throw new Error('ConfigManager not initialized');
    }

    if (this.saveInProgress) {
      console.warn(`⚠️ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Save already in progress, queuing...`);
      // Could implement a queue here for concurrent saves
      return;
    }

    this.saveInProgress = true;

    try {
      // Validate configuration
      if (this.options.validateOnLoad) {
        const validation = await this.validateConfig(config);
        if (!validation.isValid) {
          throw new Error(`${CONFIG_MANAGER_CONSTANTS.ERRORS.VALIDATION_FAILED}: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      // Create backup if enabled
      if (this.options.backupOnChange && await this.configExists()) {
        await this.createBackup('auto-backup-before-save');
      }

      // Update timestamps
      config.last_updated = new Date().toISOString();

      // Write to temporary file first for atomic operation
      const tempFilePath = path.join(this.tempDir, `config-${uuidv4()}.json`);
      await fs.writeJSON(tempFilePath, config, { 
        spaces: 2,
        encoding: CONFIG_MANAGER_CONSTANTS.FILE_SYSTEM.ENCODING
      });

      // Atomic move to final location
      await fs.move(tempFilePath, this.configPath);

      // Set appropriate permissions
      await fs.chmod(this.configPath, CONFIG_MANAGER_CONSTANTS.FILE_SYSTEM.PERMISSIONS);

      // Update cache
      this.configCache = { ...config };

      // Notify listeners
      this.notifyConfigChanged(config);

      console.log(`✅ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] ${CONFIG_MANAGER_CONSTANTS.SUCCESS.CONFIG_SAVED}`);
    } catch (error) {
      console.error(`❌ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Failed to save configuration:`, error);
      throw error;
    } finally {
      this.saveInProgress = false;
    }
  }

  async updateConfig(updates: Partial<IConfigurationData>): Promise<void> {
    const currentConfig = await this.getConfig();
    if (!currentConfig) {
      throw new Error(CONFIG_MANAGER_CONSTANTS.ERRORS.CONFIG_NOT_FOUND);
    }

    const updatedConfig: IConfigurationData = {
      ...currentConfig,
      ...updates,
      last_updated: new Date().toISOString()
    };

    await this.saveConfig(updatedConfig);
  }

  async resetConfig(): Promise<void> {
    const defaultConfig = await this.createDefaultConfigurationObject();
    await this.saveConfig(defaultConfig);
    console.log(`✅ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Configuration reset to defaults`);
  }

  // Backup management
  async createBackup(label?: string): Promise<string> {
    if (!await this.configExists()) {
      throw new Error(CONFIG_MANAGER_CONSTANTS.ERRORS.CONFIG_NOT_FOUND);
    }

    const backupId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${CONFIG_MANAGER_CONSTANTS.FILE_SYSTEM.BACKUP_FILENAME_PREFIX}${timestamp}-${backupId}${CONFIG_MANAGER_CONSTANTS.FILE_SYSTEM.BACKUP_FILENAME_SUFFIX}`;
    const backupPath = path.join(this.backupDir, backupFileName);

    try {
      // Copy current config to backup location
      await fs.copy(this.configPath, backupPath);

      // Store metadata
      const metadataPath = path.join(this.backupDir, `${backupId}.meta.json`);
      const metadata = {
        id: backupId,
        label,
        created_at: new Date().toISOString(),
        original_path: this.configPath,
        backup_path: backupPath
      };
      await fs.writeJSON(metadataPath, metadata);

      // Cleanup old backups
      await this.cleanupOldBackups();

      console.log(`✅ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] ${CONFIG_MANAGER_CONSTANTS.SUCCESS.BACKUP_CREATED}: ${backupId}`);
      return backupId;
    } catch (error) {
      console.error(`❌ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Failed to create backup:`, error);
      throw error;
    }
  }

  async restoreBackup(backupId: string): Promise<void> {
    const metadataPath = path.join(this.backupDir, `${backupId}.meta.json`);
    
    if (!await fs.pathExists(metadataPath)) {
      throw new Error(CONFIG_MANAGER_CONSTANTS.ERRORS.BACKUP_NOT_FOUND);
    }

    try {
      const metadata = await fs.readJSON(metadataPath);
      
      if (!await fs.pathExists(metadata.backup_path)) {
        throw new Error(CONFIG_MANAGER_CONSTANTS.ERRORS.BACKUP_CORRUPT);
      }

      // Create backup of current config before restore
      await this.createBackup('before-restore');

      // Restore the backup
      await fs.copy(metadata.backup_path, this.configPath);

      // Reload configuration
      await this.loadConfiguration();

      console.log(`✅ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] ${CONFIG_MANAGER_CONSTANTS.SUCCESS.BACKUP_RESTORED}: ${backupId}`);
    } catch (error) {
      console.error(`❌ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Failed to restore backup:`, error);
      throw error;
    }
  }

  async listBackups(): Promise<Array<{
    id: string;
    label?: string;
    created_at: string;
    size: number;
  }>> {
    const backups: Array<{
      id: string;
      label?: string;
      created_at: string;
      size: number;
    }> = [];

    try {
      const files = await fs.readdir(this.backupDir);
      const metadataFiles = files.filter(f => f.endsWith('.meta.json'));

      for (const metaFile of metadataFiles) {
        const metadataPath = path.join(this.backupDir, metaFile);
        const metadata = await fs.readJSON(metadataPath);
        
        const stats = await fs.stat(metadata.backup_path);
        
        backups.push({
          id: metadata.id,
          label: metadata.label,
          created_at: metadata.created_at,
          size: stats.size
        });
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return backups;
    } catch (error) {
      console.error(`❌ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Failed to list backups:`, error);
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<boolean> {
    const metadataPath = path.join(this.backupDir, `${backupId}.meta.json`);
    
    if (!await fs.pathExists(metadataPath)) {
      return false;
    }

    try {
      const metadata = await fs.readJSON(metadataPath);
      
      // Remove backup file
      if (await fs.pathExists(metadata.backup_path)) {
        await fs.remove(metadata.backup_path);
      }

      // Remove metadata file
      await fs.remove(metadataPath);

      console.log(`✅ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Deleted backup: ${backupId}`);
      return true;
    } catch (error) {
      console.error(`❌ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Failed to delete backup:`, error);
      return false;
    }
  }

  // Validation
  async validateConfig(config?: IConfigurationData): Promise<IValidationResult> {
    const configToValidate = config || this.configCache;
    
    if (!configToValidate) {
      return {
        isValid: false,
        errors: [{
          field: 'config',
          message: 'No configuration to validate',
          code: 'MISSING_CONFIG'
        }]
      };
    }

    const errors: Array<{field: string; message: string; code: string}> = [];
    const warnings: Array<{field: string; message: string; code: string}> = [];

    // Required fields validation
    for (const field of CONFIG_MANAGER_CONSTANTS.VALIDATION.REQUIRED_FIELDS) {
      if (!configToValidate[field as keyof IConfigurationData]) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          code: 'MISSING_FIELD'
        });
      }
    }

    // Version validation
    if (configToValidate.version && configToValidate.version.length < CONFIG_MANAGER_CONSTANTS.VALIDATION.MIN_VERSION_LENGTH) {
      errors.push({
        field: 'version',
        message: 'Version string is too short',
        code: 'INVALID_VERSION'
      });
    }

    // Array validations
    if (configToValidate.providers && !Array.isArray(configToValidate.providers)) {
      errors.push({
        field: 'providers',
        message: 'Providers must be an array',
        code: 'INVALID_TYPE'
      });
    } else if (configToValidate.providers && configToValidate.providers.length > CONFIG_MANAGER_CONSTANTS.VALIDATION.MAX_PROVIDERS) {
      warnings.push({
        field: 'providers',
        message: `Large number of providers (${configToValidate.providers.length})`,
        code: 'HIGH_COUNT'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async repairConfig(config?: IConfigurationData): Promise<{
    config: IConfigurationData;
    repairs_made: string[];
  }> {
    const configToRepair = config ? { ...config } : (this.configCache ? { ...this.configCache } : null);
    
    if (!configToRepair) {
      throw new Error('No configuration to repair');
    }

    const repairs: string[] = [];

    // Repair missing version
    if (!configToRepair.version) {
      configToRepair.version = CONFIG_MANAGER_CONSTANTS.DEFAULT_CONFIG_TEMPLATE.version;
      repairs.push(CONFIG_MANAGER_CONSTANTS.REPAIR_STRATEGIES.MISSING_VERSION);
    }

    // Repair missing providers
    if (!configToRepair.providers) {
      configToRepair.providers = [];
      repairs.push(CONFIG_MANAGER_CONSTANTS.REPAIR_STRATEGIES.MISSING_PROVIDERS);
    }

    // Repair invalid timestamp
    if (!configToRepair.last_updated) {
      configToRepair.last_updated = new Date().toISOString();
      repairs.push(CONFIG_MANAGER_CONSTANTS.REPAIR_STRATEGIES.INVALID_TIMESTAMP);
    }

    // Repair corrupted arrays
    if (configToRepair.providers && !Array.isArray(configToRepair.providers)) {
      configToRepair.providers = [];
      repairs.push(CONFIG_MANAGER_CONSTANTS.REPAIR_STRATEGIES.CORRUPTED_ARRAY);
    }

    // Repair missing global config
    if (!configToRepair.global_config) {
      configToRepair.global_config = CONFIG_MANAGER_CONSTANTS.DEFAULT_CONFIG_TEMPLATE.global_config;
      repairs.push(CONFIG_MANAGER_CONSTANTS.REPAIR_STRATEGIES.INVALID_GLOBAL_CONFIG);
    }

    console.log(`🔧 [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Configuration repaired with ${repairs.length} fixes`);

    return {
      config: configToRepair,
      repairs_made: repairs
    };
  }

  // File operations
  getConfigPath(): string {
    return this.configPath;
  }

  async configExists(): Promise<boolean> {
    return fs.pathExists(this.configPath);
  }

  async getConfigStats(): Promise<{
    exists: boolean;
    size: number;
    modified_at: string;
    version?: string;
  }> {
    const exists = await this.configExists();
    
    if (!exists) {
      return {
        exists: false,
        size: 0,
        modified_at: '',
      };
    }

    const stats = await fs.stat(this.configPath);
    let version: string | undefined;

    try {
      const config = await fs.readJSON(this.configPath);
      version = config.version;
    } catch {
      // Ignore errors reading version
    }

    return {
      exists: true,
      size: stats.size,
      modified_at: stats.mtime.toISOString(),
      version
    };
  }

  // Event handling
  onConfigChanged(callback: (config: IConfigurationData) => void): void {
    this.changeListeners.push(callback);
  }

  offConfigChanged(callback: (config: IConfigurationData) => void): void {
    const index = this.changeListeners.indexOf(callback);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  async getLastModified(): Promise<string | null> {
    if (!await this.configExists()) {
      return null;
    }

    const stats = await fs.stat(this.configPath);
    return stats.mtime.toISOString();
  }

  // Private helper methods
  private async loadConfiguration(): Promise<IConfigurationData | null> {
    try {
      const config = await fs.readJSON(this.configPath);
      
      // Validate if enabled
      if (this.options.validateOnLoad) {
        const validation = await this.validateConfig(config);
        if (!validation.isValid) {
          console.warn(`⚠️ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Configuration validation warnings:`, validation.errors);
        }
      }

      this.configCache = config;
      console.log(`✅ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] ${CONFIG_MANAGER_CONSTANTS.SUCCESS.CONFIG_LOADED}`);
      
      return { ...config };
    } catch (error) {
      console.error(`❌ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] ${CONFIG_MANAGER_CONSTANTS.ERRORS.LOAD_FAILED}:`, error);
      throw error;
    }
  }

  private async createDefaultConfiguration(): Promise<void> {
    const defaultConfig = await this.createDefaultConfigurationObject();
    await this.saveConfig(defaultConfig);
    console.log(`✅ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Created default configuration`);
  }

  private async createDefaultConfigurationObject(): Promise<IConfigurationData> {
    return {
      ...CONFIG_MANAGER_CONSTANTS.DEFAULT_CONFIG_TEMPLATE,
      last_updated: new Date().toISOString(),
      metadata: {
        ...CONFIG_MANAGER_CONSTANTS.DEFAULT_CONFIG_TEMPLATE.metadata,
        created_at: new Date().toISOString(),
      }
    };
  }

  private notifyConfigChanged(config: IConfigurationData): void {
    for (const listener of this.changeListeners) {
      try {
        listener(config);
      } catch (error) {
        console.error(`❌ [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Error in config change listener:`, error);
      }
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    const maxBackups = this.options.maxBackups || CONFIG_MANAGER_CONSTANTS.BACKUP.MAX_BACKUPS_DEFAULT;
    const backups = await this.listBackups();

    if (backups.length > maxBackups) {
      const backupsToDelete = backups.slice(maxBackups);
      
      for (const backup of backupsToDelete) {
        await this.deleteBackup(backup.id);
      }

      console.log(`🧹 [${CONFIG_MANAGER_CONSTANTS.MODULE_NAME}] Cleaned up ${backupsToDelete.length} old backups`);
    }
  }
}