/**
 * Configuration System Interface
 * 
 * Defines the contract for the main configuration management system
 * that orchestrates all configuration modules.
 */

// import { ModuleInfo } from 'rcc-basemodule'; // Commented out - unused in interface file

/**
 * Configuration data structure
 */
export interface ConfigData {
  /**
   * Configuration metadata
   */
  metadata: ConfigMetadata;
  
  /**
   * Configuration settings organized by category
   */
  settings: Record<string, Record<string, ConfigValue>>;
  
  /**
   * Validation schema for the configuration
   */
  schema?: ConfigSchema;
  
  /**
   * Configuration version for compatibility tracking
   */
  version: string;
}

/**
 * Configuration metadata
 */
export interface ConfigMetadata {
  /**
   * Configuration name
   */
  name: string;
  
  /**
   * Configuration description
   */
  description?: string;
  
  /**
   * Configuration author
   */
  author?: string;
  
  /**
   * Creation timestamp
   */
  createdAt: string;
  
  /**
   * Last update timestamp
   */
  updatedAt: string;
  
  /**
   * Configuration tags for categorization
   */
  tags?: string[];
  
  /**
   * Environment this configuration is for
   */
  environment?: string;
}

/**
 * Configuration value with metadata
 */
export interface ConfigValue {
  /**
   * The actual value
   */
  value: any;
  
  /**
   * Value type
   */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  
  /**
   * Whether this value is required
   */
  required: boolean;
  
  /**
   * Default value if not provided
   */
  default?: any;
  
  /**
   * Human-readable description
   */
  description?: string;
  
  /**
   * Validation rules for this value
   */
  validation?: ValidationRule[];
  
  /**
   * Whether this value is sensitive (should be encrypted)
   */
  sensitive?: boolean;
  
  /**
   * Source where this value came from
   */
  source?: string;
}

/**
 * Configuration schema
 */
export interface ConfigSchema {
  /**
   * Schema version
   */
  version: string;
  
  /**
   * Schema type (json-schema, ajv, etc.)
   */
  type: string;
  
  /**
   * The actual schema definition
   */
  definition: Record<string, any>;
  
  /**
   * Validation rules
   */
  rules?: ValidationRule[];
  
  /**
   * Constraint rules
   */
  constraints?: ConstraintRule[];
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  /**
   * Rule name/identifier
   */
  name: string;
  
  /**
   * Rule type
   */
  type: 'format' | 'range' | 'pattern' | 'custom' | 'dependency';
  
  /**
   * Rule parameters
   */
  params?: Record<string, any>;
  
  /**
   * Error message if validation fails
   */
  message: string;
  
  /**
   * Whether this rule is required or optional
   */
  required?: boolean;
}

/**
 * Constraint rule for business logic validation
 */
export interface ConstraintRule {
  /**
   * Constraint name
   */
  name: string;
  
  /**
   * Fields this constraint applies to
   */
  fields: string[];
  
  /**
   * Constraint expression or function
   */
  constraint: string | ((config: ConfigData) => boolean);
  
  /**
   * Error message if constraint is violated
   */
  message: string;
  
  /**
   * Constraint severity
   */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Configuration source definition
 */
export interface ConfigSource {
  /**
   * Source type
   */
  type: 'file' | 'environment' | 'remote' | 'database' | 'memory';
  
  /**
   * Source path or identifier
   */
  path?: string;
  
  /**
   * Source URL for remote sources
   */
  url?: string;
  
  /**
   * Configuration format
   */
  format?: 'json' | 'yaml' | 'yml' | 'toml' | 'ini' | 'env';
  
  /**
   * Source-specific options
   */
  options?: Record<string, any>;
  
  /**
   * Headers for remote sources
   */
  headers?: Record<string, string>;
  
  /**
   * Authentication information
   */
  auth?: ConfigSourceAuth;
  
  /**
   * Whether this source should be watched for changes
   */
  watch?: boolean;
  
  /**
   * Priority for merge operations (higher = takes precedence)
   */
  priority?: number;
}

/**
 * Authentication for configuration sources
 */
export interface ConfigSourceAuth {
  /**
   * Authentication type
   */
  type: 'bearer' | 'basic' | 'api-key' | 'oauth2';
  
  /**
   * Authentication token
   */
  token?: string;
  
  /**
   * Username for basic auth
   */
  username?: string;
  
  /**
   * Password for basic auth
   */
  password?: string;
  
  /**
   * API key value
   */
  apiKey?: string;
  
  /**
   * API key header name
   */
  apiKeyHeader?: string;
}

/**
 * Configuration persistence options
 */
export interface ConfigPersistenceOptions {
  /**
   * Storage type
   */
  type: 'file' | 'database' | 'memory' | 'cloud';
  
  /**
   * Target path or identifier
   */
  path?: string;
  
  /**
   * File format for file storage
   */
  format?: 'json' | 'yaml' | 'toml';
  
  /**
   * Whether to validate before saving
   */
  validate?: boolean;
  
  /**
   * Whether to create backups
   */
  backup?: boolean;
  
  /**
   * Backup options
   */
  backupOptions?: BackupOptions;
  
  /**
   * Encryption settings
   */
  encryption?: EncryptionOptions;
  
  /**
   * Versioning options
   */
  versioning?: VersioningOptions;
  
  /**
   * Compression settings
   */
  compression?: CompressionOptions;
}

/**
 * Backup configuration options
 */
export interface BackupOptions {
  /**
   * Whether backups are enabled
   */
  enabled: boolean;
  
  /**
   * Maximum number of backups to keep
   */
  maxCount?: number;
  
  /**
   * Backup directory
   */
  directory?: string;
  
  /**
   * Backup naming pattern
   */
  namingPattern?: string;
  
  /**
   * Whether to compress backups
   */
  compress?: boolean;
  
  /**
   * Automatic cleanup of old backups
   */
  autoCleanup?: boolean;
}

/**
 * Encryption configuration options
 */
export interface EncryptionOptions {
  /**
   * Whether encryption is enabled
   */
  enabled: boolean;
  
  /**
   * Encryption algorithm
   */
  algorithm?: string;
  
  /**
   * Encryption key
   */
  key?: string;
  
  /**
   * Key derivation function options
   */
  keyDerivation?: KeyDerivationOptions;
  
  /**
   * Fields to encrypt (if not encrypting entire config)
   */
  fields?: string[];
}

/**
 * Key derivation options for encryption
 */
export interface KeyDerivationOptions {
  /**
   * Salt for key derivation
   */
  salt?: string;
  
  /**
   * Number of iterations
   */
  iterations?: number;
  
  /**
   * Key length
   */
  keyLength?: number;
}

/**
 * Versioning configuration options
 */
export interface VersioningOptions {
  /**
   * Whether versioning is enabled
   */
  enabled: boolean;
  
  /**
   * Maximum number of versions to keep
   */
  maxVersions?: number;
  
  /**
   * Version storage directory
   */
  directory?: string;
  
  /**
   * Automatic cleanup of old versions
   */
  autoCleanup?: boolean;
}

/**
 * Compression configuration options
 */
export interface CompressionOptions {
  /**
   * Whether compression is enabled
   */
  enabled: boolean;
  
  /**
   * Compression algorithm
   */
  algorithm?: 'gzip' | 'deflate' | 'brotli';
  
  /**
   * Compression level (1-9)
   */
  level?: number;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  /**
   * Whether validation passed
   */
  isValid: boolean;
  
  /**
   * Validation errors
   */
  errors: ValidationError[];
  
  /**
   * Validation warnings
   */
  warnings: ValidationWarning[];
  
  /**
   * Validation metadata
   */
  metadata: ValidationMetadata;
}

/**
 * Validation error details
 */
export interface ValidationError {
  /**
   * Error code
   */
  code: string;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Field path where error occurred
   */
  path: string;
  
  /**
   * Expected value or format
   */
  expected?: any;
  
  /**
   * Actual value that caused the error
   */
  actual?: any;
  
  /**
   * Validation rule that failed
   */
  rule?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  /**
   * Warning code
   */
  code: string;
  
  /**
   * Warning message
   */
  message: string;
  
  /**
   * Field path where warning occurred
   */
  path: string;
  
  /**
   * Suggested value or action
   */
  suggestion?: any;
}

/**
 * Validation metadata
 */
export interface ValidationMetadata {
  /**
   * Validation timestamp
   */
  timestamp: string;
  
  /**
   * Validation duration in milliseconds
   */
  duration: number;
  
  /**
   * Schema version used for validation
   */
  schemaVersion?: string;
  
  /**
   * Validator version
   */
  validatorVersion?: string;
  
  /**
   * Additional validation statistics
   */
  statistics?: Record<string, any>;
}

/**
 * Configuration change event data
 */
export interface ConfigChangeEvent {
  /**
   * Type of change
   */
  type: 'created' | 'updated' | 'deleted' | 'renamed';
  
  /**
   * Configuration path that changed
   */
  path: string;
  
  /**
   * Old value (for updates and deletes)
   */
  oldValue?: any;
  
  /**
   * New value (for creates and updates)
   */
  newValue?: any;
  
  /**
   * Timestamp of the change
   */
  timestamp: string;
  
  /**
   * Source of the change
   */
  source?: string;
  
  /**
   * Additional change metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Main Configuration System Interface
 */
export interface IConfigurationSystem {
  /**
   * Initialize the configuration system
   * @param config Optional configuration for the system
   */
  initialize(config?: Record<string, any>): Promise<void>;
  
  /**
   * Load configuration from a source
   * @param source Configuration source
   * @returns Loaded configuration data
   */
  loadConfiguration(source: string | ConfigSource): Promise<ConfigData>;
  
  /**
   * Load configuration from multiple sources
   * @param sources Array of configuration sources
   * @param mergeStrategy Strategy for merging configurations
   * @returns Merged configuration data
   */
  loadMultipleConfigurations(
    sources: (string | ConfigSource)[],
    mergeStrategy?: 'shallow' | 'deep' | 'replace'
  ): Promise<ConfigData>;
  
  /**
   * Save configuration to a target
   * @param config Configuration data to save
   * @param target Optional target location
   * @param options Persistence options
   */
  saveConfiguration(
    config: ConfigData,
    target?: string,
    options?: ConfigPersistenceOptions
  ): Promise<void>;
  
  /**
   * Validate configuration data
   * @param config Configuration data to validate
   * @param schema Optional schema to validate against
   * @returns Validation result
   */
  validateConfiguration(
    config: ConfigData,
    schema?: ConfigSchema
  ): Promise<ConfigValidationResult>;
  
  /**
   * Get current configuration data
   * @returns Current configuration
   */
  getConfiguration(): ConfigData;
  
  /**
   * Update configuration with partial data
   * @param updates Partial configuration updates
   * @param validate Whether to validate after update
   * @returns Updated configuration
   */
  updateConfiguration(
    updates: Partial<ConfigData>,
    validate?: boolean
  ): Promise<ConfigData>;
  
  /**
   * Watch for configuration changes
   * @param callback Callback function for change events
   * @param sources Optional sources to watch
   */
  watchConfiguration(
    callback: (event: ConfigChangeEvent) => void,
    sources?: (string | ConfigSource)[]
  ): void;
  
  /**
   * Stop watching for configuration changes
   * @param sources Optional sources to stop watching
   */
  stopWatching(sources?: (string | ConfigSource)[]): void;
  
  /**
   * Create a backup of current configuration
   * @param options Backup options
   * @returns Backup file path or identifier
   */
  createBackup(options?: BackupOptions): Promise<string>;
  
  /**
   * Restore configuration from backup
   * @param backupPath Backup file path or identifier
   * @param validate Whether to validate restored configuration
   */
  restoreFromBackup(backupPath: string, validate?: boolean): Promise<ConfigData>;
  
  /**
   * Get configuration schema
   * @returns Current configuration schema
   */
  getSchema(): ConfigSchema | undefined;
  
  /**
   * Set configuration schema
   * @param schema Configuration schema
   */
  setSchema(schema: ConfigSchema): void;
  
  /**
   * Encrypt sensitive configuration values
   * @param config Configuration data
   * @param options Encryption options
   * @returns Encrypted configuration
   */
  encryptConfiguration(
    config: ConfigData,
    options: EncryptionOptions
  ): Promise<ConfigData>;
  
  /**
   * Decrypt encrypted configuration values
   * @param config Encrypted configuration data
   * @param options Decryption options
   * @returns Decrypted configuration
   */
  decryptConfiguration(
    config: ConfigData,
    options: EncryptionOptions
  ): Promise<ConfigData>;
  
  /**
   * Get configuration history/versions
   * @param limit Optional limit on number of versions
   * @returns Array of configuration versions
   */
  getConfigurationHistory(limit?: number): Promise<ConfigData[]>;
  
  /**
   * Revert to a previous configuration version
   * @param version Version identifier
   * @param validate Whether to validate the reverted configuration
   */
  revertToVersion(version: string, validate?: boolean): Promise<ConfigData>;
  
  /**
   * Export configuration in various formats
   * @param format Export format
   * @param options Export options
   * @returns Exported configuration as string
   */
  exportConfiguration(
    format: 'json' | 'yaml' | 'toml' | 'env',
    options?: Record<string, any>
  ): Promise<string>;
  
  /**
   * Import configuration from various formats
   * @param data Configuration data string
   * @param format Data format
   * @param validate Whether to validate imported configuration
   * @returns Imported configuration data
   */
  importConfiguration(
    data: string,
    format: 'json' | 'yaml' | 'toml' | 'env',
    validate?: boolean
  ): Promise<ConfigData>;
  
  /**
   * Clean up resources and stop all operations
   */
  destroy(): Promise<void>;
}