/**
 * Configuration System Implementation
 *
 * Main orchestrator for the configuration management system that coordinates
 * all configuration modules and provides a unified API for configuration operations.
 */
import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { IConfigurationSystem, ConfigData, ConfigSource, ConfigSchema, ConfigValidationResult, ConfigPersistenceOptions, ConfigChangeEvent, BackupOptions, EncryptionOptions } from '../interfaces/IConfigurationSystem';
/**
 * Configuration System module that orchestrates all configuration operations
 */
export declare class ConfigurationSystem extends BaseModule implements IConfigurationSystem {
    private static instanceCounter;
    private currentConfig;
    private currentSchema;
    private watchers;
    private loaderModule;
    private persistenceModule;
    private validatorModule;
    constructor(info?: Partial<ModuleInfo>);
    /**
     * Initialize the configuration system
     */
    initialize(config?: Record<string, any>): Promise<void>;
    /**
     * Load configuration from a source
     */
    loadConfiguration(source: string | ConfigSource): Promise<ConfigData>;
    /**
     * Load configuration from multiple sources
     */
    loadMultipleConfigurations(sources: (string | ConfigSource)[], mergeStrategy?: 'shallow' | 'deep' | 'replace'): Promise<ConfigData>;
    /**
     * Save configuration to a target
     */
    saveConfiguration(config: ConfigData, target?: string, options?: ConfigPersistenceOptions): Promise<void>;
    /**
     * Validate configuration data
     */
    validateConfiguration(config: ConfigData, schema?: ConfigSchema): Promise<ConfigValidationResult>;
    /**
     * Get current configuration data
     */
    getConfiguration(): ConfigData;
    /**
     * Update configuration with partial data
     */
    updateConfiguration(updates: Partial<ConfigData>, validate?: boolean): Promise<ConfigData>;
    /**
     * Watch for configuration changes
     */
    watchConfiguration(callback: (event: ConfigChangeEvent) => void, sources?: (string | ConfigSource)[]): void;
    /**
     * Stop watching for configuration changes
     */
    stopWatching(sources?: (string | ConfigSource)[]): void;
    /**
     * Create a backup of current configuration
     */
    createBackup(options?: BackupOptions): Promise<string>;
    /**
     * Restore configuration from backup
     */
    restoreFromBackup(backupPath: string, validate?: boolean): Promise<ConfigData>;
    /**
     * Get configuration schema
     */
    getSchema(): ConfigSchema | undefined;
    /**
     * Set configuration schema
     */
    setSchema(schema: ConfigSchema): void;
    /**
     * Encrypt sensitive configuration values
     */
    encryptConfiguration(config: ConfigData, options: EncryptionOptions): Promise<ConfigData>;
    /**
     * Decrypt encrypted configuration values
     */
    decryptConfiguration(config: ConfigData, options: EncryptionOptions): Promise<ConfigData>;
    /**
     * Get configuration history/versions
     */
    getConfigurationHistory(limit?: number): Promise<ConfigData[]>;
    /**
     * Revert to a previous configuration version
     */
    revertToVersion(version: string, validate?: boolean): Promise<ConfigData>;
    /**
     * Export configuration in various formats
     */
    exportConfiguration(format: 'json' | 'yaml' | 'toml' | 'env', options?: Record<string, any>): Promise<string>;
    /**
     * Import configuration from various formats
     */
    importConfiguration(data: string, format: 'json' | 'yaml' | 'toml' | 'env', validate?: boolean): Promise<ConfigData>;
    /**
     * Clean up resources and stop all operations
     */
    destroy(): Promise<void>;
    /**
     * Initialize sub-modules
     * @private
     */
    private initializeSubModules;
    /**
     * Load initial configuration
     * @private
     */
    private loadInitialConfiguration;
    /**
     * Calculate changes between two configurations
     * @private
     */
    private calculateChanges;
    /**
     * Notify all registered watchers
     * @private
     */
    private notifyWatchers;
    /**
     * Handle incoming messages from other modules
     * @override
     */
    handleMessage(message: import('rcc-basemodule').Message): Promise<import('rcc-basemodule').MessageResponse | void>;
    /**
     * Handle incoming data from other modules
     * @override
     */
    receiveData(dataTransfer: import('rcc-basemodule').DataTransfer): Promise<void>;
}
