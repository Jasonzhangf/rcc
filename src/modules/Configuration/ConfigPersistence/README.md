# ConfigPersistenceModule

## Overview

The ConfigPersistenceModule is a comprehensive, production-ready configuration persistence solution that extends the BaseModule architecture. It provides atomic file operations, backup management, version control, and health monitoring capabilities for configuration data management.

## Key Features

### 🔐 Atomic Operations
- **Atomic Write Operations**: All write operations use temp files with atomic rename for data integrity
- **Integrity Verification**: Automatic checksum verification before and after operations
- **File System Sync**: Forced filesystem sync to ensure data is written to disk
- **Rollback Capability**: Automatic backup creation before modifications

### 📁 Backup Management
- **Automatic Backups**: Configurable automatic backup creation
- **Retention Policies**: Multiple backup retention strategies (FIFO, LIFO, Priority-based)
- **Compression**: Optional backup compression to save storage space
- **Metadata Preservation**: Complete metadata preservation in backups

### 🔒 Concurrency Control
- **File Locking**: Prevents concurrent access issues with robust file locking
- **Lock Timeout**: Configurable lock timeouts with automatic cleanup
- **Stale Lock Detection**: Automatic detection and cleanup of stale locks
- **Process Identification**: Lock ownership tracking by process

### 📤 Import/Export
- **Multiple Formats**: Support for JSON, YAML, TOML, INI, XML, and Properties formats
- **Format Validation**: Automatic validation during import/export operations
- **Data Transformation**: Format conversion capabilities
- **Batch Operations**: Support for bulk import/export operations

### 📊 Health Monitoring
- **Storage Health**: Continuous monitoring of storage usage and health
- **Performance Tracking**: Operation performance metrics and tracking
- **Error Monitoring**: Comprehensive error tracking and reporting
- **Automatic Alerts**: Configurable alerts for critical issues

### 💾 Caching
- **Configuration Caching**: Intelligent caching of frequently accessed configurations
- **Metadata Caching**: Metadata caching for improved performance
- **TTL Management**: Time-based cache expiration
- **Memory Management**: Automatic memory cleanup and optimization

## Architecture

### Module Structure

```
ConfigPersistenceModule/
├── README.md                           # This file
├── interfaces/
│   └── IConfigPersistenceModule.ts     # Module interface definitions
├── constants/
│   └── ConfigPersistenceConstants.ts   # All configuration constants
├── src/
│   └── ConfigPersistenceModule.ts      # Main module implementation
└── __tests__/
    ├── ConfigPersistenceModule.test.ts # Unit tests
    ├── ConfigPersistenceModuleCommunication.test.ts # Communication tests
    └── fixtures/
        └── test-data.ts                 # Test data fixtures
```

### Core Components

1. **Configuration Persistence Engine**: Core functionality for saving/loading configurations
2. **Backup Management System**: Handles backup creation, retention, and restoration
3. **File Locking Manager**: Manages concurrent access through file locks
4. **Import/Export Handler**: Manages format conversions and data transfer
5. **Health Monitor**: Monitors system health and performance
6. **Cache Manager**: Handles configuration and metadata caching

## API Reference

### Core Operations

#### Save Configuration
```typescript
async saveConfiguration(config: any, filePath?: string): Promise<PersistenceResult>
```
Saves configuration data with atomic write operations.

**Parameters:**
- `config`: Configuration data to save
- `filePath`: Optional file path (uses default if not provided)

**Returns:** `PersistenceResult` with operation details

#### Load Configuration
```typescript
async loadConfiguration(filePath?: string): Promise<ConfigurationData>
```
Loads configuration with integrity verification.

**Parameters:**
- `filePath`: Optional file path (uses default if not provided)

**Returns:** `ConfigurationData` with metadata and validation status

#### Delete Configuration
```typescript
async deleteConfiguration(filePath: string): Promise<PersistenceResult>
```
Deletes configuration file with automatic backup creation.

**Parameters:**
- `filePath`: File path to delete

**Returns:** `PersistenceResult` with operation details

### Atomic Operations

#### Atomic Save
```typescript
async saveConfigurationAtomic(config: any, filePath?: string): Promise<PersistenceResult>
```
Performs atomic save operation with integrity verification.

#### Verify Integrity
```typescript
async verifyConfigurationIntegrity(filePath: string): Promise<IntegrityResult>
```
Verifies file integrity using checksums and metadata validation.

### Backup Management

#### Create Backup
```typescript
async createBackup(filePath?: string, backupName?: string): Promise<BackupResult>
```
Creates a backup of the configuration file.

**Parameters:**
- `filePath`: File to backup (uses default if not provided)
- `backupName`: Optional custom backup name

**Returns:** `BackupResult` with backup information

#### List Backups
```typescript
async listBackups(filePath?: string): Promise<BackupInfo[]>
```
Lists all available backups, optionally filtered by file path.

#### Restore from Backup
```typescript
async restoreFromBackup(backupId: string, targetPath?: string): Promise<RestoreResult>
```
Restores configuration from a specific backup.

**Parameters:**
- `backupId`: ID of the backup to restore
- `targetPath`: Optional target path for restoration

**Returns:** `RestoreResult` with restoration details

#### Cleanup Old Backups
```typescript
async cleanupOldBackups(retentionCount?: number): Promise<CleanupResult>
```
Cleans up old backups based on retention policy.

### File Locking

#### Acquire Lock
```typescript
async acquireFileLock(filePath: string, timeout?: number): Promise<FileLockResult>
```
Acquires an exclusive lock on a file.

#### Release Lock
```typescript
async releaseFileLock(lockId: string): Promise<PersistenceResult>
```
Releases a previously acquired file lock.

#### Check Lock Status
```typescript
async checkFileLock(filePath: string): Promise<LockStatus>
```
Checks the current lock status of a file.

### Import/Export

#### Export Configuration
```typescript
async exportConfiguration(format: ExportFormat, filePath?: string): Promise<ExportResult>
```
Exports configuration in the specified format.

**Supported Formats:**
- JSON
- YAML
- TOML
- ZIP
- TAR.GZ

#### Import Configuration
```typescript
async importConfiguration(importPath: string, format: ExportFormat, targetPath?: string): Promise<ImportResult>
```
Imports configuration from an external file.

#### Validate Import Data
```typescript
async validateImportData(importData: any, format: ExportFormat): Promise<ValidationResult>
```
Validates import data before processing.

### Health Monitoring

#### Get Storage Statistics
```typescript
async getStorageStatistics(): Promise<StorageStatistics>
```
Returns comprehensive storage usage statistics.

#### Validate Storage Health
```typescript
async validateStorageHealth(): Promise<HealthCheckResult>
```
Performs comprehensive health checks on the storage system.

#### Get Operation History
```typescript
async getOperationHistory(limit?: number): Promise<OperationHistoryEntry[]>
```
Returns history of recent operations.

### Configuration Management

#### Set Default Path
```typescript
setDefaultConfigurationPath(filePath: string): void
```
Sets the default configuration file path.

#### Get Default Path
```typescript
getDefaultConfigurationPath(): string
```
Gets the current default configuration file path.

#### Get/Set Metadata
```typescript
async getConfigurationMetadata(filePath?: string): Promise<ConfigurationMetadata>
async setConfigurationMetadata(metadata: ConfigurationMetadata, filePath?: string): Promise<PersistenceResult>
```
Manages configuration metadata.

## Configuration

### Module Configuration

```typescript
const config = {
  // File system paths
  defaultConfigPath: './config/app.json',
  backupDirectory: './config/backups',
  tempDirectory: './config/temp',
  
  // Backup settings
  backupRetentionCount: 3,
  autoBackupEnabled: true,
  compressionEnabled: true,
  
  // Performance settings
  enableCaching: true,
  cacheTTL: 300000, // 5 minutes
  maxConcurrentOperations: 10,
  
  // Health monitoring
  enableHealthChecks: true,
  healthCheckInterval: 300000, // 5 minutes
  
  // File locking
  lockTimeout: 30000, // 30 seconds
  staleLockThreshold: 600000, // 10 minutes
  
  // Format support
  supportedFormats: ['json', 'yaml', 'toml', 'ini', 'xml', 'properties']
};
```

### Constants Configuration

All hardcoded values are centralized in `ConfigPersistenceConstants.ts`:

```typescript
import { CONFIG_PERSISTENCE_CONSTANTS } from './constants/ConfigPersistenceConstants';

// File system settings
const backupDir = CONFIG_PERSISTENCE_CONSTANTS.FILE_SYSTEM.BACKUP_DIR;
const retentionCount = CONFIG_PERSISTENCE_CONSTANTS.BACKUP_SETTINGS.DEFAULT_RETENTION_COUNT;

// Performance limits
const maxFileSize = CONFIG_PERSISTENCE_CONSTANTS.PERFORMANCE_LIMITS.MAX_FILE_SIZE_BYTES;
const operationTimeout = CONFIG_PERSISTENCE_CONSTANTS.PERFORMANCE_LIMITS.MAX_OPERATION_TIME_MS;
```

## Usage Examples

### Basic Usage

```typescript
import { ConfigPersistenceModule } from './src/ConfigPersistenceModule';
import { ModuleRegistry } from '../../../registry/ModuleRegistry';

// Create and register module
const registry = ModuleRegistry.getInstance();
registry.registerModuleType('config-persistence', ConfigPersistenceModule);

// Create module instance
const moduleInfo = {
  id: 'app-config-persistence',
  name: 'Application Config Persistence',
  version: '1.0.0',
  description: 'Main configuration persistence module',
  type: 'config-persistence'
};

const persistenceModule = await registry.createModule('config-persistence', moduleInfo);

// Configure module
persistenceModule.configure({
  defaultConfigPath: './config/app.json',
  enableBackup: true,
  retentionCount: 5
});

// Initialize module
await persistenceModule.initialize();
```

### Save Configuration

```typescript
const config = {
  database: {
    host: 'localhost',
    port: 5432,
    name: 'myapp'
  },
  cache: {
    enabled: true,
    ttl: 3600
  }
};

// Save with automatic backup
const result = await persistenceModule.saveConfiguration(config);
console.log(`Configuration saved: ${result.success}`);
console.log(`Checksum: ${result.checksum}`);
console.log(`File size: ${result.fileSize} bytes`);
```

### Load Configuration

```typescript
// Load configuration with integrity verification
const configData = await persistenceModule.loadConfiguration();

if (configData.isValid) {
  console.log('Configuration loaded successfully');
  console.log('Data:', configData.data);
  console.log('Metadata:', configData.metadata);
} else {
  console.error('Configuration validation failed');
}
```

### Backup Management

```typescript
// Create manual backup
const backupResult = await persistenceModule.createBackup('./config/app.json', 'manual-backup');
console.log(`Backup created: ${backupResult.backupId}`);

// List all backups
const backups = await persistenceModule.listBackups();
console.log(`Found ${backups.length} backups`);

// Restore from backup
const restoreResult = await persistenceModule.restoreFromBackup(backupResult.backupId);
console.log(`Restore successful: ${restoreResult.success}`);

// Cleanup old backups
const cleanupResult = await persistenceModule.cleanupOldBackups(3);
console.log(`Deleted ${cleanupResult.deletedBackupsCount} old backups`);
```

### File Locking

```typescript
// Acquire exclusive lock
const lockResult = await persistenceModule.acquireFileLock('./config/app.json');

if (lockResult.success) {
  try {
    // Perform operations while file is locked
    await persistenceModule.saveConfiguration(modifiedConfig);
  } finally {
    // Always release lock
    await persistenceModule.releaseFileLock(lockResult.lockId);
  }
}
```

### Import/Export

```typescript
// Export to YAML
const exportResult = await persistenceModule.exportConfiguration(
  ExportFormat.YAML, 
  './config/app.json'
);
console.log(`Exported to: ${exportResult.exportPath}`);

// Import from YAML
const importResult = await persistenceModule.importConfiguration(
  './exports/config.yaml',
  ExportFormat.YAML,
  './config/imported.json'
);
console.log(`Import successful: ${importResult.success}`);
```

### Health Monitoring

```typescript
// Get storage statistics
const stats = await persistenceModule.getStorageStatistics();
console.log(`Total files: ${stats.totalConfigurationFiles}`);
console.log(`Storage used: ${stats.totalStorageUsed} bytes`);
console.log(`Health score: ${stats.storageHealth}`);

// Perform health check
const healthResult = await persistenceModule.validateStorageHealth();
console.log(`Overall health: ${healthResult.overallHealth}`);

if (healthResult.criticalIssues.length > 0) {
  console.error('Critical issues found:', healthResult.criticalIssues);
}

// Get operation history
const history = await persistenceModule.getOperationHistory(10);
console.log(`Recent operations: ${history.length}`);
```

### Inter-Module Communication

```typescript
// Setup connections with other modules
const validatorConnection = {
  id: 'persistence-validator-connection',
  type: 'input',
  sourceModuleId: 'config-validator',
  targetModuleId: 'config-persistence',
  dataTypes: ['save-request', 'validation-result']
};

persistenceModule.addInputConnection(validatorConnection);

// Handle incoming data
persistenceModule.receiveData({
  id: 'save-request-001',
  sourceConnectionId: 'persistence-validator-connection',
  targetConnectionId: 'config-persistence',
  data: {
    config: validatedConfig,
    filePath: './config/validated.json'
  },
  timestamp: Date.now(),
  metadata: {
    type: 'save-request',
    source: 'validator'
  }
});
```

## Error Handling

### Error Types

The module provides comprehensive error handling for various scenarios:

```typescript
try {
  await persistenceModule.saveConfiguration(config);
} catch (error) {
  if (error.name === 'PersistenceError') {
    // Handle persistence-specific errors
    console.error('Persistence failed:', error.message);
  } else if (error.code === 'EACCES') {
    // Handle permission errors
    console.error('Permission denied:', error.message);
  } else if (error.code === 'ENOSPC') {
    // Handle disk space errors
    console.error('Insufficient disk space:', error.message);
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error.message);
  }
}
```

### Error Recovery

The module includes automatic error recovery mechanisms:

- **Automatic Retry**: Operations are automatically retried with exponential backoff
- **Backup Recovery**: Failed operations can be recovered from backups
- **Lock Recovery**: Stale locks are automatically detected and cleaned up
- **Integrity Recovery**: Corrupted files can be restored from backups

## Performance Considerations

### Optimization Features

- **Async Operations**: All I/O operations are asynchronous and non-blocking
- **Connection Pooling**: Efficient connection management for concurrent operations
- **Memory Management**: Automatic memory cleanup and garbage collection
- **Caching**: Intelligent caching reduces redundant file operations

### Performance Monitoring

The module tracks performance metrics:

```typescript
const history = await persistenceModule.getOperationHistory();
const saveOperations = history.filter(op => op.operationType === 'save');
const averageDuration = saveOperations.reduce((sum, op) => sum + op.duration, 0) / saveOperations.length;

console.log(`Average save time: ${averageDuration}ms`);
```

### Tuning Guidelines

1. **Cache Settings**: Adjust cache TTL based on usage patterns
2. **Backup Retention**: Balance between storage space and recovery needs
3. **Concurrent Operations**: Limit based on system resources
4. **File Size Limits**: Set appropriate limits for your use case

## Security Features

### Access Control

- **File Permissions**: Configurable file and directory permissions
- **Process Isolation**: Lock ownership tracking prevents cross-process interference
- **Path Validation**: Input validation prevents path traversal attacks

### Data Protection

- **Integrity Verification**: Checksum verification prevents data corruption
- **Atomic Operations**: Prevent partial writes and data loss
- **Backup Encryption**: Optional backup encryption for sensitive data

### Audit Trail

- **Operation Logging**: All operations are logged with timestamps
- **User Tracking**: Optional user identification in operation logs
- **Change History**: Comprehensive change tracking and history

## Testing

### Test Coverage

The module includes comprehensive test coverage:

- **Unit Tests**: 100% coverage of all public methods
- **Integration Tests**: Module interaction testing
- **Communication Tests**: Inter-module communication testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Security vulnerability testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- ConfigPersistenceModule.test.ts

# Run with coverage
npm test -- --coverage

# Run communication tests
npm test -- ConfigPersistenceModuleCommunication.test.ts
```

### Test Categories

1. **Lifecycle Tests**: Module creation, initialization, destruction
2. **Operation Tests**: Save, load, delete operations
3. **Backup Tests**: Backup creation, restoration, cleanup
4. **Locking Tests**: File locking and concurrency
5. **Format Tests**: Import/export format handling
6. **Error Tests**: Error handling and recovery
7. **Performance Tests**: Load and performance testing
8. **Security Tests**: Security and validation testing

## Troubleshooting

### Common Issues

#### Permission Errors
```
Error: EACCES: permission denied, open 'config.json'
```
**Solution**: Check file and directory permissions, run with appropriate privileges.

#### Disk Space Issues
```
Error: ENOSPC: no space left on device
```
**Solution**: Free up disk space or cleanup old backups.

#### Lock Timeout
```
Error: File lock acquisition timed out
```
**Solution**: Increase lock timeout or check for stale locks.

#### Corruption Detection
```
Error: Configuration integrity check failed
```
**Solution**: Restore from backup or regenerate configuration.

### Debug Mode

Enable debug logging for detailed troubleshooting:

```typescript
persistenceModule.configure({
  debug: {
    enableRequestLogging: true,
    enablePerformanceMonitoring: true,
    logLevel: 'debug'
  }
});
```

### Health Diagnostics

Run health diagnostics to identify issues:

```typescript
const healthResult = await persistenceModule.validateStorageHealth();

// Check for critical issues
if (healthResult.overallHealth === HealthStatus.CRITICAL) {
  console.error('Critical health issues detected:');
  healthResult.criticalIssues.forEach(issue => {
    console.error(`- ${issue.description}`);
    console.error(`  Recommendation: ${issue.recommendation}`);
  });
}
```

## Migration Guide

### From Previous Versions

When upgrading from previous versions:

1. **Backup Existing Data**: Create backups before upgrading
2. **Update Configuration**: Review and update configuration settings
3. **Test Compatibility**: Run tests to ensure compatibility
4. **Gradual Migration**: Migrate configurations gradually

### Configuration Migration

```typescript
// Migrate old configuration format
const oldConfig = await persistenceModule.loadConfiguration('./old-config.json');
const migratedConfig = migrateConfiguration(oldConfig.data);
await persistenceModule.saveConfiguration(migratedConfig, './new-config.json');
```

## Contributing

### Development Guidelines

1. **Follow RCC Governance**: Adhere to all RCC governance rules
2. **Anti-Hardcoding**: Use constants for all configuration values
3. **Complete Testing**: Maintain 100% test coverage
4. **Documentation**: Update documentation for all changes
5. **Type Safety**: Maintain strict TypeScript compliance

### Code Style

- Use TypeScript strict mode
- Follow existing naming conventions
- Include comprehensive JSDoc comments
- Use async/await for asynchronous operations
- Handle all error conditions

### Pull Request Process

1. Create feature branch from main
2. Implement changes with tests
3. Update documentation
4. Run full test suite
5. Submit pull request with description

## License

This module is part of the RCC framework and is licensed under the MIT License.

## Support

For issues and questions:

1. Check troubleshooting guide
2. Review test examples
3. Check operation history and logs
4. Submit issue with reproduction steps

---

**Note**: This module follows RCC governance rules and requires 100% test coverage. All hardcoded values must be defined in the constants file following the anti-hardcoding policy.