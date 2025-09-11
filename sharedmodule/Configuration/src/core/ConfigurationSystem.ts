/**
 * Configuration System Implementation
 * 
 * Main orchestrator for the configuration management system that coordinates
 * all configuration modules and provides a unified API for configuration operations.
 */

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { 
  IConfigurationSystem,
  ConfigData,
  ConfigSource,
  ConfigSchema,
  ConfigValidationResult,
  ConfigPersistenceOptions,
  ConfigChangeEvent,
  BackupOptions,
  EncryptionOptions
} from '../interfaces/IConfigurationSystem';
import { IConfigLoaderModule } from '../interfaces/IConfigLoaderModule';
// import { IConfigUIModule } from '../interfaces/IConfigUIModule'; // Commented out - unused
import { IConfigPersistenceModule } from '../interfaces/IConfigPersistenceModule';
import { IConfigValidatorModule } from '../interfaces/IConfigValidatorModule';
import { 
  CONFIGURATION_SYSTEM_CONSTANTS
} from '../constants/ConfigurationConstants';
// Define error classes locally to avoid circular imports
class ConfigurationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(`${message} (${code})`);
    this.name = 'ConfigurationError';
  }
}

class ValidationError extends ConfigurationError {
  constructor(
    message: string,
    public path: string,
    public expected?: any,
    public actual?: any
  ) {
    super(message, 'VALIDATION_ERROR', { path, expected, actual });
    this.name = 'ValidationError';
  }
}

class PersistenceError extends ConfigurationError {
  constructor(
    message: string,
    public operation: string,
    public target?: string
  ) {
    super(message, 'PERSISTENCE_ERROR', { operation, target });
    this.name = 'PersistenceError';
  }
}

class LoadError extends ConfigurationError {
  constructor(
    message: string,
    public source: string,
    public format?: string
  ) {
    super(message, 'LOAD_ERROR', { source, format });
    this.name = 'LoadError';
  }
}

/**
 * Configuration System module that orchestrates all configuration operations
 */
export class ConfigurationSystem extends BaseModule implements IConfigurationSystem {
  private static instanceCounter = 0;
  private currentConfig: ConfigData | null = null;
  private currentSchema: ConfigSchema | undefined;
  private watchers: Map<string, (event: ConfigChangeEvent) => void> = new Map();
  private loaderModule: IConfigLoaderModule | null = null;
  private persistenceModule: IConfigPersistenceModule | null = null;
  private validatorModule: IConfigValidatorModule | null = null;

  constructor(info?: Partial<ModuleInfo>) {
    ConfigurationSystem.instanceCounter++;
    const moduleInfo: ModuleInfo = {
      id: info?.id || `${CONFIGURATION_SYSTEM_CONSTANTS.MODULE_NAME}-${Date.now()}-${ConfigurationSystem.instanceCounter}`,
      name: info?.name || CONFIGURATION_SYSTEM_CONSTANTS.MODULE_NAME,
      version: info?.version || CONFIGURATION_SYSTEM_CONSTANTS.MODULE_VERSION,
      description: info?.description || CONFIGURATION_SYSTEM_CONSTANTS.MODULE_DESCRIPTION,
      type: CONFIGURATION_SYSTEM_CONSTANTS.MODULE_TYPE,
      metadata: {
        ...info?.metadata,
        capabilities: [
          'configuration-loading',
          'configuration-saving',
          'configuration-validation',
          'configuration-watching',
          'backup-restore',
          'encryption-decryption'
        ],
        dependencies: [
          'rcc-basemodule'
        ]
      }
    };

    super(moduleInfo);
    if (this.debugModule) {
      this.debugModule.log('ConfigurationSystem created', 2, { moduleInfo });
    }
  }

  /**
   * Initialize the configuration system
   */
  public override async initialize(config?: Record<string, any>): Promise<void> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Initializing ConfigurationSystem', 2, {});
      }

      // Call parent initialization
      await super.initialize();

      // Store configuration
      if (config) {
        this.config = config;
      }

      // Initialize sub-modules if provided in config
      if (config?.['modules']) {
        await this.initializeSubModules(config['modules']);
      }

      // Load initial configuration if specified
      if (config?.['initialConfig']) {
        await this.loadInitialConfiguration(config['initialConfig']);
      }

      if (this.debugModule) {
        this.debugModule.log('ConfigurationSystem initialized successfully', 2, {});
      }
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to initialize ConfigurationSystem', 0, { error });
      }
      throw new ConfigurationError(
        'Configuration system initialization failed',
        CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['INITIALIZATION_FAILED'],
        { originalError: error }
      );
    }
  }

  /**
   * Load configuration from a source
   */
  public async loadConfiguration(source: string | ConfigSource): Promise<ConfigData> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Loading configuration', 2, { source });
      }

      if (!this.loaderModule) {
        throw new LoadError(
          'Loader module not available',
          typeof source === 'string' ? source : source.type
        );
      }

      // Convert string source to ConfigSource object
      const configSource: ConfigSource = typeof source === 'string' 
        ? { type: 'file', path: source }
        : source;

      // Load configuration using loader module
      const loadResult = await this.loaderModule.loadFromSource(configSource);
      
      if (!loadResult.data) {
        throw new LoadError(
          'Failed to load configuration data',
          typeof source === 'string' ? source : source.type
        );
      }

      // Validate configuration if validator is available
      if (this.validatorModule && this.currentSchema) {
        const validationResult = await this.validatorModule.validate(
          loadResult.data,
          this.currentSchema
        );

        if (!validationResult.result.isValid) {
          if (this.debugModule) {
            this.debugModule.log('Configuration validation failed', 1, { 
              errors: validationResult.result.errors 
            });
          }
        }
      }

      // Update current configuration
      this.currentConfig = loadResult.data;

      // Emit configuration loaded event
      this.broadcastMessage(
        CONFIGURATION_SYSTEM_CONSTANTS.MESSAGE_TYPES['CONFIG_LOADED'],
        {
          config: this.currentConfig,
          source: configSource,
          metadata: loadResult.metadata
        }
      );

      if (this.debugModule) {
        this.debugModule.log('Configuration loaded successfully', 2, { 
          configSize: JSON.stringify(this.currentConfig).length 
        });
      }

      return this.currentConfig;
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to load configuration', 0, { error, source });
      }
      
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new LoadError(
        'Configuration loading failed',
        typeof source === 'string' ? source : source.type || 'unknown'
      );
    }
  }

  /**
   * Load configuration from multiple sources
   */
  public async loadMultipleConfigurations(
    sources: (string | ConfigSource)[],
    mergeStrategy: 'shallow' | 'deep' | 'replace' = 'deep'
  ): Promise<ConfigData> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Loading multiple configurations', 2, { 
          sources: sources.length, 
          mergeStrategy 
        });
      }

      if (!this.loaderModule) {
        throw new LoadError('Loader module not available', 'multiple-sources');
      }

      // Convert to ConfigSource objects
      const configSources: ConfigSource[] = sources.map(source => 
        typeof source === 'string' 
          ? { type: 'file', path: source }
          : source
      );

      // Load and merge configurations
      const mergeResult = await this.loaderModule.loadAndMerge(
        configSources,
        { mergeStrategy }
      );

      if (!mergeResult.data) {
        throw new LoadError('Failed to merge configuration data', 'multiple-sources');
      }

      // Update current configuration
      this.currentConfig = mergeResult.data;

      // Emit configuration loaded event
      this.broadcastMessage(
        CONFIGURATION_SYSTEM_CONSTANTS.MESSAGE_TYPES['CONFIG_LOADED'],
        {
          config: this.currentConfig,
          sources: configSources,
          mergeStrategy,
          conflicts: mergeResult.conflicts
        }
      );

      if (this.debugModule) {
        this.debugModule.log('Multiple configurations loaded and merged successfully', 2, {
          sourcesCount: sources.length,
          conflictsCount: mergeResult.conflicts?.length || 0
        });
      }

      return this.currentConfig;
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to load multiple configurations', 0, { 
          error, 
          sources: sources.length 
        });
      }
      
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new LoadError('Multiple configuration loading failed', 'multiple-sources');
    }
  }

  /**
   * Save configuration to a target
   */
  public async saveConfiguration(
    config: ConfigData,
    target?: string,
    options?: ConfigPersistenceOptions
  ): Promise<void> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Saving configuration', 2, { target, options });
      }

      if (!this.persistenceModule) {
        throw new PersistenceError(
          'Persistence module not available',
          'save',
          target
        );
      }

      // Use default target if not specified
      const saveTarget = target || CONFIGURATION_SYSTEM_CONSTANTS.DEFAULT_CONFIG_FILE;

      // Validate configuration before saving if validator is available
      if (this.validatorModule && (!options || options.validate !== false)) {
        const validationResult = await this.validatorModule.validate(
          config,
          this.currentSchema
        );

        if (!validationResult.result.isValid) {
          throw new ValidationError(
            'Configuration validation failed before save',
            'root',
            'valid configuration',
            config
          );
        }
      }

      // Save configuration using persistence module
      const saveResult = await this.persistenceModule.save(
        config,
        saveTarget,
        options
      );

      if (!saveResult.success) {
        throw new PersistenceError(
          'Save operation failed',
          'save',
          saveTarget
        );
      }

      // Update current configuration if this was a save of current config
      if (this.currentConfig === config || !this.currentConfig) {
        this.currentConfig = config;
      }

      // Emit configuration saved event
      this.broadcastMessage(
        CONFIGURATION_SYSTEM_CONSTANTS.MESSAGE_TYPES['CONFIG_SAVED'],
        {
          config,
          target: saveTarget,
          options,
          metadata: saveResult.metadata
        }
      );

      if (this.debugModule) {
        this.debugModule.log('Configuration saved successfully', 2, { 
          target: saveTarget,
          metadata: saveResult.metadata
        });
      }
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to save configuration', 0, { error, target });
      }
      
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new PersistenceError(
        'Configuration save failed',
        'save',
        target
      );
    }
  }

  /**
   * Validate configuration data
   */
  public async validateConfiguration(
    config: ConfigData,
    schema?: ConfigSchema
  ): Promise<ConfigValidationResult> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Validating configuration', 2, { 
          hasSchema: !!schema || !!this.currentSchema 
        });
      }

      if (!this.validatorModule) {
        // Return basic validation if validator module not available
        // Built-in validator is very basic and lenient
        return {
          isValid: true,
          errors: [],
          warnings: [],
          metadata: {
            timestamp: new Date().toISOString(),
            duration: 0,
            validatorVersion: 'built-in'
          }
        };
      }

      // Use provided schema or current schema
      const validationSchema = schema || this.currentSchema;

      // Perform validation
      const validationReport = await this.validatorModule.validate(
        config,
        validationSchema
      );

      // Emit validation event
      this.broadcastMessage(
        CONFIGURATION_SYSTEM_CONSTANTS.MESSAGE_TYPES['CONFIG_VALIDATED'],
        {
          config,
          schema: validationSchema,
          result: validationReport.result
        }
      );

      if (!validationReport.result.isValid) {
        this.broadcastMessage(
          CONFIGURATION_SYSTEM_CONSTANTS.MESSAGE_TYPES['VALIDATION_FAILED'],
          {
            config,
            errors: validationReport.result.errors,
            warnings: validationReport.result.warnings
          }
        );
      }

      if (this.debugModule) {
        this.debugModule.log('Configuration validation completed', 2, {
          isValid: validationReport.result.isValid,
          errorsCount: validationReport.result.errors.length,
          warningsCount: validationReport.result.warnings.length
        });
      }

      return validationReport.result;
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to validate configuration', 0, { error });
      }
      
      throw new ValidationError(
        'Configuration validation failed',
        'root',
        'valid configuration',
        config
      );
    }
  }

  /**
   * Get current configuration data
   */
  public getConfiguration(): ConfigData {
    if (!this.currentConfig) {
      throw new ConfigurationError(
        'No configuration loaded',
        CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['CONFIG_NOT_LOADED']
      );
    }

    // Return a deep copy to prevent external modification
    return JSON.parse(JSON.stringify(this.currentConfig));
  }

  /**
   * Update configuration with partial data
   */
  public async updateConfiguration(
    updates: Partial<ConfigData>,
    validate: boolean = true
  ): Promise<ConfigData> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Updating configuration', 2, { validate });
      }

      if (!this.currentConfig) {
        throw new ConfigurationError(
          'No configuration loaded to update',
          CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['CONFIG_NOT_LOADED']
        );
      }

      // Create updated configuration by merging
      // Ensure updatedAt is always newer than the current timestamp
      const currentTime = Date.now();
      const previousTime = new Date(this.currentConfig.metadata.updatedAt).getTime();
      const newTimestamp = currentTime > previousTime ? currentTime : previousTime + 1;
      
      const updatedConfig: ConfigData = {
        ...this.currentConfig,
        ...updates,
        settings: {
          ...this.currentConfig.settings,
          ...updates.settings
        },
        metadata: {
          ...this.currentConfig.metadata,
          ...updates.metadata,
          updatedAt: new Date(newTimestamp).toISOString()
        }
      };

      // Validate updated configuration if requested
      if (validate) {
        const validationResult = await this.validateConfiguration(updatedConfig);
        if (!validationResult.isValid) {
          throw new ValidationError(
            'Updated configuration validation failed',
            'root',
            'valid configuration',
            updatedConfig
          );
        }
      }

      // Calculate changes for event
      const changes = this.calculateChanges(this.currentConfig, updatedConfig);

      // Update current configuration
      const oldConfig = this.currentConfig;
      this.currentConfig = updatedConfig;

      // Emit configuration changed event
      this.broadcastMessage(
        CONFIGURATION_SYSTEM_CONSTANTS.MESSAGE_TYPES['CONFIG_CHANGED'],
        {
          oldConfig,
          newConfig: this.currentConfig,
          changes
        }
      );

      // Notify watchers
      this.notifyWatchers({
        type: 'updated',
        path: 'root',
        oldValue: oldConfig,
        newValue: this.currentConfig,
        timestamp: new Date().toISOString(),
        source: 'update-operation'
      });

      if (this.debugModule) {
        this.debugModule.log('Configuration updated successfully', 2, {
          changesCount: changes.length
        });
      }

      return this.currentConfig;
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to update configuration', 0, { error });
      }
      
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new ConfigurationError(
        'Configuration update failed',
        CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['CONFIG_UPDATE_FAILED'],
        { originalError: error }
      );
    }
  }

  /**
   * Watch for configuration changes
   */
  public watchConfiguration(
    callback: (event: ConfigChangeEvent) => void,
    sources?: (string | ConfigSource)[]
  ): void {
    try {
      const watcherId = `watcher-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      if (this.debugModule) {
        this.debugModule.log('Setting up configuration watcher', 2, { 
          watcherId, 
          sourcesCount: sources?.length 
        });
      }

      // Register internal watcher
      this.watchers.set(watcherId, callback);

      // Set up file system watching if loader module supports it
      if (this.loaderModule && sources) {
        const configSources: ConfigSource[] = sources.map(source => 
          typeof source === 'string' 
            ? { type: 'file', path: source, watch: true }
            : { ...source, watch: true }
        );

        this.loaderModule.startWatching(
          configSources,
          (loadResult) => {
            callback({
              type: 'updated',
              path: loadResult.source.path || 'unknown',
              newValue: loadResult.data,
              timestamp: new Date().toISOString(),
              source: 'file-watcher',
              metadata: loadResult.metadata
            });
          }
        );
      }

      if (this.debugModule) {
        this.debugModule.log('Configuration watcher set up successfully', 2, { 
          watcherId 
        });
      }
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to set up configuration watcher', 0, { error });
      }
      throw new ConfigurationError(
        'Watch setup failed',
        CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['WATCH_SETUP_FAILED'],
        { originalError: error }
      );
    }
  }

  /**
   * Stop watching for configuration changes
   */
  public stopWatching(sources?: (string | ConfigSource)[]): void {
    try {
      if (this.debugModule) {
        this.debugModule.log('Stopping configuration watchers', 2, { 
          sourcesCount: sources?.length 
        });
      }

      // Stop file system watching if loader module supports it
      if (this.loaderModule && sources) {
        const configSources: ConfigSource[] = sources.map(source => 
          typeof source === 'string' 
            ? { type: 'file', path: source }
            : source
        );

        this.loaderModule.stopWatching(configSources);
      } else if (this.loaderModule && !sources) {
        // Stop all watching
        this.loaderModule.stopWatching();
      }

      // Clear all watchers if no specific sources
      if (!sources) {
        this.watchers.clear();
      }

      if (this.debugModule) {
        this.debugModule.log('Configuration watchers stopped', 2, {});
      }
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to stop configuration watchers', 0, { error });
      }
    }
  }

  /**
   * Create a backup of current configuration
   */
  public async createBackup(options?: BackupOptions): Promise<string> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Creating configuration backup', 2, { options });
      }

      if (!this.persistenceModule) {
        throw new PersistenceError(
          'Persistence module not available',
          'backup'
        );
      }

      if (!this.currentConfig) {
        throw new ConfigurationError(
          'No configuration loaded to backup',
          CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['CONFIG_NOT_LOADED']
        );
      }

      // Create backup using persistence module
      const backupResult = await this.persistenceModule.createBackup(
        'current-config',
        options
      );

      if (!backupResult.success) {
        throw new PersistenceError(
          'Backup creation failed',
          'backup'
        );
      }

      // Emit backup created event
      this.broadcastMessage(
        CONFIGURATION_SYSTEM_CONSTANTS.MESSAGE_TYPES['BACKUP_CREATED'],
        {
          backupId: backupResult.backupId,
          config: this.currentConfig,
          options,
          metadata: backupResult.metadata
        }
      );

      if (this.debugModule) {
        this.debugModule.log('Configuration backup created successfully', 2, {
          backupId: backupResult.backupId,
          size: backupResult.size
        });
      }

      return backupResult.backupId;
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to create configuration backup', 0, { error });
      }
      
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new PersistenceError('Backup creation failed', 'backup');
    }
  }

  /**
   * Restore configuration from backup
   */
  public async restoreFromBackup(
    backupPath: string,
    validate: boolean = true
  ): Promise<ConfigData> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Restoring configuration from backup', 2, { 
          backupPath, 
          validate 
        });
      }

      if (!this.persistenceModule) {
        throw new PersistenceError(
          'Persistence module not available',
          'restore',
          backupPath
        );
      }

      // Restore configuration using persistence module
      const restoreResult = await this.persistenceModule.restoreFromBackup(backupPath);

      if (!restoreResult.success || !restoreResult.data) {
        throw new PersistenceError(
          'Restore operation failed',
          'restore',
          backupPath
        );
      }

      // Validate restored configuration if requested
      if (validate) {
        const validationResult = await this.validateConfiguration(restoreResult.data);
        if (!validationResult.isValid) {
          throw new ValidationError(
            'Restored configuration validation failed',
            'root',
            'valid configuration',
            restoreResult.data
          );
        }
      }

      // Update current configuration
      const oldConfig = this.currentConfig;
      this.currentConfig = restoreResult.data;

      // Emit configuration changed event
      this.broadcastMessage(
        CONFIGURATION_SYSTEM_CONSTANTS.MESSAGE_TYPES['CONFIG_CHANGED'],
        {
          oldConfig,
          newConfig: this.currentConfig,
          source: 'backup-restore'
        }
      );

      if (this.debugModule) {
        this.debugModule.log('Configuration restored from backup successfully', 2, {
          backupPath
        });
      }

      return this.currentConfig;
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to restore configuration from backup', 0, { 
          error, 
          backupPath 
        });
      }
      
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new PersistenceError('Backup restore failed', 'restore', backupPath);
    }
  }

  /**
   * Get configuration schema
   */
  public getSchema(): ConfigSchema | undefined {
    return this.currentSchema ? JSON.parse(JSON.stringify(this.currentSchema)) : undefined;
  }

  /**
   * Set configuration schema
   */
  public setSchema(schema: ConfigSchema): void {
    if (this.debugModule) {
      this.debugModule.log('Setting configuration schema', 2, { 
        version: schema.version,
        type: schema.type
      });
    }

    this.currentSchema = schema;
  }

  /**
   * Encrypt sensitive configuration values
   */
  public async encryptConfiguration(
    config: ConfigData,
    options: EncryptionOptions
  ): Promise<ConfigData> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Encrypting configuration', 2, { options });
      }

      if (!this.persistenceModule) {
        throw new PersistenceError(
          'Persistence module not available for encryption',
          'encrypt'
        );
      }

      const encryptedConfig = await this.persistenceModule.encrypt(config, options);

      // Emit encryption event
      this.broadcastMessage(
        CONFIGURATION_SYSTEM_CONSTANTS.MESSAGE_TYPES['ENCRYPTION_ENABLED'],
        {
          originalConfig: config,
          encryptedConfig,
          options
        }
      );

      if (this.debugModule) {
        this.debugModule.log('Configuration encrypted successfully', 2, {});
      }

      return encryptedConfig;
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to encrypt configuration', 0, { error });
      }
      
      throw new ConfigurationError(
        'Configuration encryption failed',
        CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['ENCRYPTION_FAILED'],
        { originalError: error }
      );
    }
  }

  /**
   * Decrypt encrypted configuration values
   */
  public async decryptConfiguration(
    config: ConfigData,
    options: EncryptionOptions
  ): Promise<ConfigData> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Decrypting configuration', 2, {});
      }

      if (!this.persistenceModule) {
        throw new PersistenceError(
          'Persistence module not available for decryption',
          'decrypt'
        );
      }

      const decryptedConfig = await this.persistenceModule.decrypt(config, options);

      if (this.debugModule) {
        this.debugModule.log('Configuration decrypted successfully', 2, {});
      }

      return decryptedConfig;
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to decrypt configuration', 0, { error });
      }
      
      throw new ConfigurationError(
        'Configuration decryption failed',
        CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['DECRYPTION_FAILED'],
        { originalError: error }
      );
    }
  }

  /**
   * Get configuration history/versions
   */
  public async getConfigurationHistory(limit?: number): Promise<ConfigData[]> {
    if (this.debugModule) {
      this.debugModule.log('Getting configuration history', 2, { limit });
    }

    if (!this.persistenceModule) {
      throw new PersistenceError(
        'Persistence module not available',
        'get-history'
      );
    }
    
    try {

      // Get backup list as history
      const backups = await this.persistenceModule.listBackups();
      
      // Sort by timestamp and limit if specified
      const sortedBackups = backups
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      // Load configurations from backups
      const history: ConfigData[] = [];
      for (const backup of sortedBackups) {
        try {
          const restoreResult = await this.persistenceModule.restoreFromBackup(backup.backupId);
          if (restoreResult.success && restoreResult.data) {
            history.push(restoreResult.data);
          }
        } catch (error) {
          if (this.debugModule) {
            this.debugModule.log('Failed to load backup for history', 1, { 
              backupId: backup.backupId,
              error 
            });
          }
        }
      }

      if (this.debugModule) {
        this.debugModule.log('Configuration history retrieved', 2, { 
          totalCount: history.length 
        });
      }

      return history;
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to get configuration history', 0, { error });
      }
      
      throw new PersistenceError('Failed to retrieve configuration history', 'get-history');
    }
  }

  /**
   * Revert to a previous configuration version
   */
  public async revertToVersion(
    version: string,
    validate: boolean = true
  ): Promise<ConfigData> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Reverting to configuration version', 2, { 
          version, 
          validate 
        });
      }

      // This is essentially the same as restoring from backup
      return await this.restoreFromBackup(version, validate);
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to revert to configuration version', 0, { 
          error, 
          version 
        });
      }
      
      throw error; // Re-throw as it should already be a proper ConfigurationError
    }
  }

  /**
   * Export configuration in various formats
   */
  public async exportConfiguration(
    format: 'json' | 'yaml' | 'toml' | 'env',
    options?: Record<string, any>
  ): Promise<string> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Exporting configuration', 2, { format, options });
      }

      if (!this.currentConfig) {
        throw new ConfigurationError(
          'No configuration loaded to export',
          CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['CONFIG_NOT_LOADED']
        );
      }

      // Use loader module to format the configuration if available
      if (this.loaderModule) {
        // UnderConstruction: format conversion feature in loader module
        // For now, fallback to JSON
        return JSON.stringify(this.currentConfig, null, 2);
      }

      // Basic export as JSON if no loader module
      switch (format) {
        case 'json':
          return JSON.stringify(this.currentConfig, null, 2);
        case 'yaml':
        case 'toml':
        case 'env':
          // Would need specific libraries for these formats
          throw new ConfigurationError(
            `Export format '${format}' not supported without loader module`,
            CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['UNSUPPORTED_FORMAT']
          );
        default:
          throw new ConfigurationError(
            `Unsupported export format: ${format}`,
            CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['UNSUPPORTED_FORMAT']
          );
      }
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to export configuration', 0, { error, format });
      }
      
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new ConfigurationError(
        'Configuration export failed',
        CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['EXPORT_FAILED'],
        { originalError: error }
      );
    }
  }

  /**
   * Import configuration from various formats
   */
  public async importConfiguration(
    data: string,
    format: 'json' | 'yaml' | 'toml' | 'env',
    validate: boolean = true
  ): Promise<ConfigData> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Importing configuration', 2, { format, validate });
      }

      let importedConfig: ConfigData;

      // Use loader module to parse the configuration if available
      if (this.loaderModule) {
        // UnderConstruction: parseConfigurationString method in loader module
        // For now, fallback to basic JSON parsing
        if (format === 'json') {
          importedConfig = JSON.parse(data);
        } else {
          throw new ConfigurationError(
            `Format '${format}' not supported without parseConfigurationString method`,
            CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['UNSUPPORTED_FORMAT']
          );
        }
      } else {
        // Basic import from JSON if no loader module
        switch (format) {
          case 'json':
            importedConfig = JSON.parse(data);
            break;
          case 'yaml':
          case 'toml':
          case 'env':
            throw new ConfigurationError(
              `Import format '${format}' not supported without loader module`,
              CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['UNSUPPORTED_FORMAT']
            );
          default:
            throw new ConfigurationError(
              `Unsupported import format: ${format}`,
              CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['UNSUPPORTED_FORMAT']
            );
        }
      }

      // Validate imported configuration if requested
      if (validate) {
        // First check basic structure since import validation should be stricter
        const { isValidConfigurationStructure } = await import('../index');
        if (!isValidConfigurationStructure(importedConfig)) {
          throw new ValidationError(
            'Imported configuration does not have required structure',
            'root',
            'object with metadata, settings, and version properties',
            importedConfig
          );
        }
        
        // Then run regular validation
        const validationResult = await this.validateConfiguration(importedConfig);
        if (!validationResult.isValid) {
          throw new ValidationError(
            'Imported configuration validation failed',
            'root',
            'valid configuration',
            importedConfig
          );
        }
      }

      // Update current configuration
      const oldConfig = this.currentConfig;
      this.currentConfig = importedConfig;

      // Emit configuration changed event
      this.broadcastMessage(
        CONFIGURATION_SYSTEM_CONSTANTS.MESSAGE_TYPES['CONFIG_CHANGED'],
        {
          oldConfig,
          newConfig: this.currentConfig,
          source: 'import-operation'
        }
      );

      if (this.debugModule) {
        this.debugModule.log('Configuration imported successfully', 2, { format });
      }

      return this.currentConfig;
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to import configuration', 0, { error, format });
      }
      
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new ConfigurationError(
        'Configuration import failed',
        CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['IMPORT_FAILED'],
        { originalError: error }
      );
    }
  }

  /**
   * Clean up resources and stop all operations
   */
  public override async destroy(): Promise<void> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Destroying ConfigurationSystem', 2, {});
      }

      // Stop all watchers
      this.stopWatching();

      // Clean up sub-modules
      if (this.loaderModule) {
        // Loader module cleanup would go here
      }

      if (this.persistenceModule) {
        await this.persistenceModule.close();
      }

      // Clear current state
      this.currentConfig = null;
      this.currentSchema = undefined;
      this.watchers.clear();

      // Call parent cleanup
      await super.destroy();

      if (this.debugModule) {
        this.debugModule.log('ConfigurationSystem destroyed successfully', 2, {});
      }
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to destroy ConfigurationSystem', 0, { error });
      }
      throw new ConfigurationError(
        'Configuration system destruction failed',
        CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES['DESTRUCTION_FAILED'],
        { originalError: error }
      );
    }
  }

  /**
   * Initialize sub-modules
   * @private
   */
  private async initializeSubModules(modules: Record<string, any>): Promise<void> {
    if (this.debugModule) {
      this.debugModule.log('Initializing sub-modules', 2, { 
        moduleCount: Object.keys(modules).length 
      });
    }

    // Initialize modules based on configuration
    // This would typically involve importing and instantiating the actual module classes
    // For now, we'll just log the intent
    
    if (modules['loader']) {
      if (this.debugModule) {
        this.debugModule.log('Would initialize loader module', 2, { config: modules['loader'] });
      }
    }

    if (modules['ui']) {
      if (this.debugModule) {
        this.debugModule.log('Would initialize UI module', 2, { config: modules['ui'] });
      }
    }

    if (modules['persistence']) {
      if (this.debugModule) {
        this.debugModule.log('Would initialize persistence module', 2, { config: modules['persistence'] });
      }
    }

    if (modules['validator']) {
      if (this.debugModule) {
        this.debugModule.log('Would initialize validator module', 2, { config: modules['validator'] });
      }
    }
  }

  /**
   * Load initial configuration
   * @private
   */
  private async loadInitialConfiguration(initialConfig: string | ConfigSource | ConfigData): Promise<void> {
    if (this.debugModule) {
      this.debugModule.log('Loading initial configuration', 2, { 
        type: typeof initialConfig 
      });
    }

    if (typeof initialConfig === 'object') {
      if ('metadata' in initialConfig) {
        // It's already a ConfigData object
        this.currentConfig = initialConfig as ConfigData;
      } else if ('type' in initialConfig || 'path' in initialConfig || 'url' in initialConfig) {
        // It's a ConfigSource object
        try {
          await this.loadConfiguration(initialConfig as ConfigSource);
        } catch (error) {
          // For initialization, we'll just log the warning and continue
          if (this.debugModule) {
            this.debugModule.log('Could not load initial configuration from source, continuing without it', 1, { error });
          }
        }
      } else {
        // It's an invalid object structure
        throw new ConfigurationError(
          'Initial configuration object must be either ConfigData with metadata/settings/version or ConfigSource with type/path/url',
          CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES.INVALID_CONFIG_FORMAT
        );
      }
    } else if (typeof initialConfig === 'string') {
      // It's a file path or source string
      try {
        await this.loadConfiguration(initialConfig);
      } catch (error) {
        // For initialization, we'll just log the warning and continue
        if (this.debugModule) {
          this.debugModule.log('Could not load initial configuration from string, continuing without it', 1, { error });
        }
      }
    } else {
      throw new ConfigurationError(
        'Initial configuration must be a string, ConfigSource, or ConfigData object',
        CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES.INVALID_CONFIG_FORMAT
      );
    }
  }

  /**
   * Calculate changes between two configurations
   * @private
   */
  private calculateChanges(oldConfig: ConfigData, newConfig: ConfigData): Array<{
    path: string;
    type: 'added' | 'removed' | 'modified';
    oldValue?: any;
    newValue?: any;
  }> {
    const changes: Array<{
      path: string;
      type: 'added' | 'removed' | 'modified';
      oldValue?: any;
      newValue?: any;
    }> = [];

    // Simple comparison - in a real implementation, this would be more sophisticated
    const oldStr = JSON.stringify(oldConfig);
    const newStr = JSON.stringify(newConfig);

    if (oldStr !== newStr) {
      changes.push({
        path: 'root',
        type: 'modified',
        oldValue: oldConfig,
        newValue: newConfig
      });
    }

    return changes;
  }

  /**
   * Notify all registered watchers
   * @private
   */
  private notifyWatchers(event: ConfigChangeEvent): void {
    for (const [watcherId, callback] of this.watchers) {
      try {
        callback(event);
      } catch (error) {
        if (this.debugModule) {
          this.debugModule.log('Error in configuration watcher callback', 1, { 
            watcherId, 
            error 
          });
        }
      }
    }
  }

  /**
   * Handle incoming messages from other modules
   * @override
   */
  public override async handleMessage(message: import('rcc-basemodule').Message): Promise<import('rcc-basemodule').MessageResponse | void> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Handling message', 2, { 
          type: message.type,
          source: message.source
        });
      }

      switch (message.type) {
        case 'config:get':
          return {
            messageId: message.id,
            correlationId: message.correlationId || `response-${message.id}`,
            success: true,
            data: this.currentConfig,
            timestamp: Date.now()
          };

        case 'config:update':
          if (message.payload && typeof message.payload === 'object') {
            await this.updateConfiguration(message.payload);
            return {
              messageId: message.id,
              correlationId: message.correlationId || `response-${message.id}`,
              success: true,
              timestamp: Date.now()
            };
          }
          break;

        case 'config:validate':
          if (message.payload) {
            const result = await this.validateConfiguration(message.payload);
            return {
              messageId: message.id,
              correlationId: message.correlationId || `response-${message.id}`,
              success: true,
              data: result,
              timestamp: Date.now()
            };
          }
          break;

        default:
          if (this.debugModule) {
            this.debugModule.log('Unhandled message type', 1, { type: message.type });
          }
          break;
      }
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Error handling message', 0, { error, messageType: message.type });
      }
      return {
        messageId: message.id,
        correlationId: message.correlationId || `response-${message.id}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Handle incoming data from other modules
   * @override
   */
  public override async receiveData(dataTransfer: import('rcc-basemodule').DataTransfer): Promise<void> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Received data from module', 2, { 
          sourceConnectionId: dataTransfer.sourceConnectionId,
          dataType: typeof dataTransfer.data 
        });
      }

      // Store received data for testing purposes
      this.receivedData.push(dataTransfer.data);

      // Process configuration data if it's a valid format
      if (dataTransfer.data && typeof dataTransfer.data === 'object') {
        // Check if it's configuration data
        if (dataTransfer.data.metadata && dataTransfer.data.settings) {
          // Validate and potentially update current configuration
          const validationResult = await this.validateConfiguration(dataTransfer.data);
          
          if (validationResult.isValid) {
            // Emit configuration received event
            this.broadcastMessage(
              'config:received',
              {
                source: dataTransfer.sourceConnectionId,
                config: dataTransfer.data,
                timestamp: dataTransfer.timestamp
              }
            );
          } else {
            if (this.debugModule) {
              this.debugModule.log('Received invalid configuration data', 1, { 
                errors: validationResult.errors 
              });
            }
          }
        }
      }
    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to process received data', 0, { error });
      }
      // Don't throw here - just log the error
    }
  }
}