/**
 * Config Persistence Module Interface
 *
 * Defines the contract for persisting configuration data to various storage backends
 * including file systems, databases, cloud storage, and memory stores.
 */
/// <reference types="node" />
import { ConfigData, ConfigPersistenceOptions, BackupOptions, EncryptionOptions } from '../core/ConfigData';
/**
 * Storage backend types
 */
export type StorageBackendType = 'filesystem' | 'database' | 'memory' | 'cloud' | 'encrypted';
/**
 * Persistence operation types
 */
export type PersistenceOperation = 'create' | 'read' | 'update' | 'delete' | 'backup' | 'restore';
/**
 * Storage backend configuration
 */
export interface StorageBackendConfig {
    /**
     * Backend type
     */
    type: StorageBackendType;
    /**
     * Backend-specific connection configuration
     */
    connection: Record<string, any>;
    /**
     * Operation timeout in milliseconds
     */
    timeout?: number;
    /**
     * Maximum retry attempts
     */
    maxRetries?: number;
    /**
     * Retry delay in milliseconds
     */
    retryDelay?: number;
    /**
     * Whether to use connection pooling
     */
    pooling?: boolean;
    /**
     * Pool configuration
     */
    poolConfig?: {
        min?: number;
        max?: number;
        acquireTimeoutMillis?: number;
        idleTimeoutMillis?: number;
    };
}
/**
 * File system storage configuration
 */
export interface FileSystemStorageConfig {
    /**
     * Base directory for configuration files
     */
    baseDirectory: string;
    /**
     * File permissions (octal)
     */
    permissions?: number;
    /**
     * Whether to create directory structure if missing
     */
    createDirectories?: boolean;
    /**
     * File encoding
     */
    encoding?: BufferEncoding;
    /**
     * Whether to use file locking
     */
    useLocking?: boolean;
    /**
     * Lock timeout in milliseconds
     */
    lockTimeout?: number;
    /**
     * Atomic write operations
     */
    atomicWrites?: boolean;
}
/**
 * Database storage configuration
 */
export interface DatabaseStorageConfig {
    /**
     * Database connection string or configuration
     */
    connection: string | {
        host: string;
        port: number;
        database: string;
        username: string;
        password: string;
        ssl?: boolean;
    };
    /**
     * Database type
     */
    type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'redis';
    /**
     * Table/collection name for storing configurations
     */
    tableName: string;
    /**
     * Schema definition
     */
    schema?: Record<string, any>;
    /**
     * Index configurations
     */
    indexes?: Array<{
        fields: string[];
        unique?: boolean;
        name?: string;
    }>;
    /**
     * Migration configuration
     */
    migrations?: {
        enabled: boolean;
        directory?: string;
    };
}
/**
 * Cloud storage configuration
 */
export interface CloudStorageConfig {
    /**
     * Cloud provider
     */
    provider: 'aws-s3' | 'gcp-storage' | 'azure-blob' | 'digitalocean-spaces';
    /**
     * Bucket/container name
     */
    bucket: string;
    /**
     * Region
     */
    region?: string;
    /**
     * Access credentials
     */
    credentials: {
        accessKey?: string;
        secretKey?: string;
        sessionToken?: string;
        credentialsFile?: string;
    };
    /**
     * Object key prefix
     */
    keyPrefix?: string;
    /**
     * Storage class
     */
    storageClass?: string;
    /**
     * Server-side encryption
     */
    encryption?: {
        algorithm?: string;
        kmsKeyId?: string;
    };
}
/**
 * Memory storage configuration
 */
export interface MemoryStorageConfig {
    /**
     * Maximum number of configurations to store
     */
    maxSize?: number;
    /**
     * TTL for stored configurations in milliseconds
     */
    ttl?: number;
    /**
     * Whether to persist to disk on shutdown
     */
    persistOnShutdown?: boolean;
    /**
     * Persistence file path
     */
    persistenceFile?: string;
    /**
     * Eviction strategy
     */
    evictionStrategy?: 'lru' | 'lfu' | 'fifo';
}
/**
 * Persistence operation result
 */
export interface PersistenceResult {
    /**
     * Whether operation was successful
     */
    success: boolean;
    /**
     * Operation type
     */
    operation: PersistenceOperation;
    /**
     * Storage backend used
     */
    backend: StorageBackendType;
    /**
     * Operation metadata
     */
    metadata: PersistenceMetadata;
    /**
     * Error information if operation failed
     */
    error?: PersistenceError;
    /**
     * Result data (for read operations)
     */
    data?: ConfigData;
}
/**
 * Persistence operation metadata
 */
export interface PersistenceMetadata {
    /**
     * Operation timestamp
     */
    timestamp: string;
    /**
     * Operation duration in milliseconds
     */
    duration: number;
    /**
     * Storage path or identifier
     */
    path?: string;
    /**
     * Data size in bytes
     */
    size?: number;
    /**
     * Checksum of stored data
     */
    checksum?: string;
    /**
     * Version information
     */
    version?: string;
    /**
     * Number of retry attempts
     */
    retryAttempts?: number;
    /**
     * Additional backend-specific metadata
     */
    backendMetadata?: Record<string, any>;
}
/**
 * Persistence error information
 */
export interface IPersistenceError {
    /**
     * Error code
     */
    code: string;
    /**
     * Error message
     */
    message: string;
    /**
     * Error severity
     */
    severity: 'error' | 'warning' | 'info';
    /**
     * Error details
     */
    details?: any;
    /**
     * Timestamp
     */
    timestamp: Date;
    /**
     * Stack trace (if available)
     */
    stack?: string;
}
/**
 * Type alias for backward compatibility
 */
export type PersistenceError = IPersistenceError;
/**
 * Backup operation result
 */
export interface BackupResult {
    /**
     * Whether backup was successful
     */
    success: boolean;
    /**
     * Backup identifier or path
     */
    backupId: string;
    /**
     * Backup timestamp
     */
    timestamp: string;
    /**
     * Original configuration path
     */
    originalPath: string;
    /**
     * Backup size in bytes
     */
    size?: number;
    /**
     * Backup metadata
     */
    metadata?: Record<string, any>;
    /**
     * Error if backup failed
     */
    error?: PersistenceError;
}
/**
 * Restore operation result
 */
export interface RestoreResult {
    /**
     * Whether restore was successful
     */
    success: boolean;
    /**
     * Restored configuration data
     */
    data?: ConfigData;
    /**
     * Backup identifier that was restored
     */
    backupId: string;
    /**
     * Restore timestamp
     */
    timestamp: string;
    /**
     * Target path where configuration was restored
     */
    targetPath?: string;
    /**
     * Restore metadata
     */
    metadata?: Record<string, any>;
    /**
     * Error if restore failed
     */
    error?: PersistenceError;
}
/**
 * Transaction configuration
 */
export interface TransactionConfig {
    /**
     * Transaction timeout in milliseconds
     */
    timeout?: number;
    /**
     * Isolation level
     */
    isolationLevel?: 'read-uncommitted' | 'read-committed' | 'repeatable-read' | 'serializable';
    /**
     * Whether to auto-commit
     */
    autoCommit?: boolean;
    /**
     * Rollback on error
     */
    rollbackOnError?: boolean;
}
/**
 * Batch operation configuration
 */
export interface BatchOperationConfig {
    /**
     * Maximum batch size
     */
    batchSize?: number;
    /**
     * Whether to stop on first error
     */
    stopOnError?: boolean;
    /**
     * Parallel execution
     */
    parallel?: boolean;
    /**
     * Maximum concurrent operations
     */
    maxConcurrency?: number;
}
/**
 * Storage health status
 */
export interface StorageHealthStatus {
    /**
     * Whether storage backend is healthy
     */
    healthy: boolean;
    /**
     * Backend type
     */
    backend: StorageBackendType;
    /**
     * Last check timestamp
     */
    lastCheck: string;
    /**
     * Response time in milliseconds
     */
    responseTime?: number;
    /**
     * Available space (for file systems)
     */
    availableSpace?: number;
    /**
     * Connection count (for databases)
     */
    connectionCount?: number;
    /**
     * Error information if unhealthy
     */
    error?: PersistenceError;
    /**
     * Additional health metrics
     */
    metrics?: Record<string, any>;
}
/**
 * Config Persistence Module Interface
 */
export interface IConfigPersistenceModule {
    /**
     * Configure storage backend
     * @param config Storage backend configuration
     */
    configureStorage(config: StorageBackendConfig): Promise<void>;
    /**
     * Save configuration data
     * @param config Configuration data to save
     * @param path Storage path or identifier
     * @param options Persistence options
     * @returns Persistence result
     */
    save(config: ConfigData, path: string, options?: ConfigPersistenceOptions): Promise<PersistenceResult>;
    /**
     * Load configuration data
     * @param path Storage path or identifier
     * @param options Loading options
     * @returns Persistence result with loaded data
     */
    load(path: string, options?: Record<string, any>): Promise<PersistenceResult>;
    /**
     * Check if configuration exists
     * @param path Storage path or identifier
     * @returns Whether configuration exists
     */
    exists(path: string): Promise<boolean>;
    /**
     * Delete configuration
     * @param path Storage path or identifier
     * @param createBackup Whether to create backup before deletion
     * @returns Persistence result
     */
    delete(path: string, createBackup?: boolean): Promise<PersistenceResult>;
    /**
     * List available configurations
     * @param pattern Optional pattern to filter results
     * @returns Array of configuration paths
     */
    list(pattern?: string): Promise<string[]>;
    /**
     * Create backup of configuration
     * @param path Configuration path
     * @param options Backup options
     * @returns Backup result
     */
    createBackup(path: string, options?: BackupOptions): Promise<BackupResult>;
    /**
     * Restore configuration from backup
     * @param backupId Backup identifier
     * @param targetPath Optional target path (defaults to original)
     * @param options Restore options
     * @returns Restore result
     */
    restoreFromBackup(backupId: string, targetPath?: string, options?: Record<string, any>): Promise<RestoreResult>;
    /**
     * List available backups
     * @param path Optional configuration path to filter backups
     * @returns Array of backup information
     */
    listBackups(path?: string): Promise<BackupResult[]>;
    /**
     * Delete backup
     * @param backupId Backup identifier
     * @returns Whether deletion was successful
     */
    deleteBackup(backupId: string): Promise<boolean>;
    /**
     * Encrypt configuration data
     * @param config Configuration data to encrypt
     * @param options Encryption options
     * @returns Encrypted configuration data
     */
    encrypt(config: ConfigData, options: EncryptionOptions): Promise<ConfigData>;
    /**
     * Decrypt configuration data
     * @param encryptedConfig Encrypted configuration data
     * @param options Decryption options
     * @returns Decrypted configuration data
     */
    decrypt(encryptedConfig: ConfigData, options: EncryptionOptions): Promise<ConfigData>;
    /**
     * Start a transaction
     * @param config Transaction configuration
     * @returns Transaction identifier
     */
    beginTransaction(config?: TransactionConfig): Promise<string>;
    /**
     * Commit a transaction
     * @param transactionId Transaction identifier
     */
    commitTransaction(transactionId: string): Promise<void>;
    /**
     * Rollback a transaction
     * @param transactionId Transaction identifier
     */
    rollbackTransaction(transactionId: string): Promise<void>;
    /**
     * Perform batch operations
     * @param operations Array of operations to perform
     * @param config Batch operation configuration
     * @returns Array of operation results
     */
    batchOperations(operations: Array<{
        operation: PersistenceOperation;
        path: string;
        data?: ConfigData;
        options?: Record<string, any>;
    }>, config?: BatchOperationConfig): Promise<PersistenceResult[]>;
    /**
     * Get storage health status
     * @returns Storage health information
     */
    getHealthStatus(): Promise<StorageHealthStatus>;
    /**
     * Get storage statistics
     * @returns Storage usage and performance statistics
     */
    getStatistics(): Promise<Record<string, any>>;
    /**
     * Optimize storage (cleanup, defragmentation, etc.)
     * @param options Optimization options
     */
    optimizeStorage(options?: Record<string, any>): Promise<void>;
    /**
     * Validate storage integrity
     * @param path Optional specific path to validate
     * @returns Integrity check results
     */
    validateIntegrity(path?: string): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    /**
     * Watch for changes in stored configurations
     * @param path Path or pattern to watch
     * @param callback Change callback function
     */
    watchChanges(path: string, callback: (event: {
        type: 'created' | 'updated' | 'deleted';
        path: string;
        timestamp: string;
    }) => void): void;
    /**
     * Stop watching for changes
     * @param path Optional specific path to stop watching
     */
    stopWatching(path?: string): void;
    /**
     * Migrate data between storage backends
     * @param sourceConfig Source storage configuration
     * @param targetConfig Target storage configuration
     * @param options Migration options
     */
    migrate(sourceConfig: StorageBackendConfig, targetConfig: StorageBackendConfig, options?: {
        batchSize?: number;
        parallel?: boolean;
        deleteSource?: boolean;
        validateAfterMigration?: boolean;
    }): Promise<{
        success: boolean;
        migratedCount: number;
        failedCount: number;
        errors: PersistenceError[];
    }>;
    /**
     * Close all connections and cleanup resources
     */
    close(): Promise<void>;
}
//# sourceMappingURL=IConfigPersistenceModule.d.ts.map