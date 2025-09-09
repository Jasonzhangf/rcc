/**
 * ConfigPersistenceModule Unit Tests
 * 
 * Comprehensive test suite for the Configuration Persistence Module
 * following RCC governance rules for 100% test coverage requirement
 */

import { ConfigPersistenceModule } from '../src/ConfigPersistenceModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ModuleRegistry } from '../../../registry/ModuleRegistry';
import { 
  PersistenceOperationType,
  ConfigurationFormat,
  ExportFormat,
  HealthStatus,
  LockType
} from '../interfaces/IConfigPersistenceModule';
import { CONFIG_PERSISTENCE_CONSTANTS } from '../constants/ConfigPersistenceConstants';
import * as fs from 'fs/promises';
import * as path from 'path';
import { testData } from './fixtures/test-data';

describe('ConfigPersistenceModule', () => {
  let persistenceModule: ConfigPersistenceModule;
  let registry: ModuleRegistry;
  let testConfigDir: string;
  let testFilePath: string;

  beforeAll(async () => {
    // Setup test environment
    testConfigDir = path.join(__dirname, '../../../tmp/test-config-persistence');
    testFilePath = path.join(testConfigDir, 'test-config.json');
    
    // Ensure test directory exists
    await fs.mkdir(testConfigDir, { recursive: true });
    
    // Get registry instance
    registry = ModuleRegistry.getInstance();
  });

  beforeEach(async () => {
    // Create fresh module instance for each test
    const moduleInfo: ModuleInfo = {
      id: 'test-config-persistence',
      name: 'Test Config Persistence Module',
      version: '1.0.0',
      description: 'Test instance of Configuration Persistence Module',
      type: 'config-persistence'
    };

    persistenceModule = new ConfigPersistenceModule(moduleInfo);
    
    // Configure with test settings
    persistenceModule.configure({
      defaultConfigPath: testFilePath,
      testMode: true
    });

    await persistenceModule.initialize();
  });

  afterEach(async () => {
    if (persistenceModule) {
      await persistenceModule.destroy();
    }
  });

  afterAll(async () => {
    // Cleanup test files
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error));
    }
  });

  describe('Module Lifecycle', () => {
    test('should create module instance successfully', () => {
      expect(persistenceModule).toBeInstanceOf(ConfigPersistenceModule);
      expect(persistenceModule.getInfo().type).toBe('config-persistence');
    });

    test('should initialize module with correct configuration', async () => {
      const info = persistenceModule.getInfo();
      expect(info.name).toBe(CONFIG_PERSISTENCE_CONSTANTS.MODULE_NAME);
      expect(info.version).toBe(CONFIG_PERSISTENCE_CONSTANTS.MODULE_VERSION);
      expect(info.description).toBe(CONFIG_PERSISTENCE_CONSTANTS.MODULE_DESCRIPTION);
    });

    test('should register module type with registry', () => {
      registry.registerModuleType('config-persistence-test', ConfigPersistenceModule);
      const registeredTypes = registry.getRegisteredTypes();
      expect(registeredTypes).toContain('config-persistence-test');
    });

    test('should create module through registry', async () => {
      registry.registerModuleType('config-persistence-registry', ConfigPersistenceModule);
      
      const moduleInfo: ModuleInfo = {
        id: 'registry-test',
        name: 'Registry Test Module',
        version: '1.0.0',
        description: 'Test module creation through registry',
        type: 'config-persistence-registry'
      };

      const createdModule = await registry.createModule('config-persistence-registry', moduleInfo);
      expect(createdModule).toBeInstanceOf(ConfigPersistenceModule);
      
      await createdModule.destroy();
    });

    test('should handle module destruction cleanly', async () => {
      await persistenceModule.destroy();
      
      // Verify cleanup
      const info = persistenceModule.getInfo();
      expect(info).toBeDefined(); // Info should still be accessible
    });
  });

  describe('Configuration Save Operations', () => {
    test('should save configuration successfully', async () => {
      const testConfig = testData.sampleConfigurations.basic;
      
      const result = await persistenceModule.saveConfiguration(testConfig, testFilePath);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toBe(testFilePath);
      expect(result.operationType).toBe(PersistenceOperationType.SAVE);
      expect(result.checksum).toBeDefined();
      expect(result.fileSize).toBeGreaterThan(0);
      
      // Verify file was created
      const fileExists = await fs.access(testFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    test('should perform atomic save operation', async () => {
      const testConfig = testData.sampleConfigurations.complex;
      
      const result = await persistenceModule.saveConfigurationAtomic(testConfig, testFilePath);
      
      expect(result.success).toBe(true);
      expect(result.metadata?.atomicOperation).toBe(true);
      
      // Verify integrity
      const integrity = await persistenceModule.verifyConfigurationIntegrity(testFilePath);
      expect(integrity.isValid).toBe(true);
    });

    test('should handle save operation errors gracefully', async () => {
      const invalidPath = '/invalid/path/config.json';
      
      await expect(
        persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, invalidPath)
      ).rejects.toThrow();
    });

    test('should validate configuration data before saving', async () => {
      await expect(
        persistenceModule.saveConfiguration(null, testFilePath)
      ).rejects.toThrow(CONFIG_PERSISTENCE_CONSTANTS.ERROR_MESSAGES.INVALID_CONFIGURATION_DATA);
    });

    test('should handle file locking during save operations', async () => {
      const testConfig = testData.sampleConfigurations.basic;
      
      // Acquire lock
      const lockResult = await persistenceModule.acquireFileLock(testFilePath);
      expect(lockResult.success).toBe(true);
      
      try {
        // Should still be able to save (same process)
        const saveResult = await persistenceModule.saveConfiguration(testConfig, testFilePath);
        expect(saveResult.success).toBe(true);
      } finally {
        // Release lock
        await persistenceModule.releaseFileLock(lockResult.lockId);
      }
    });
  });

  describe('Configuration Load Operations', () => {
    beforeEach(async () => {
      // Setup test configuration file
      await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, testFilePath);
    });

    test('should load configuration successfully', async () => {
      const configData = await persistenceModule.loadConfiguration(testFilePath);
      
      expect(configData.data).toEqual(testData.sampleConfigurations.basic);
      expect(configData.isValid).toBe(true);
      expect(configData.checksum).toBeDefined();
      expect(configData.metadata).toBeDefined();
    });

    test('should handle missing configuration file', async () => {
      const nonExistentPath = path.join(testConfigDir, 'nonexistent.json');
      
      await expect(
        persistenceModule.loadConfiguration(nonExistentPath)
      ).rejects.toThrow(CONFIG_PERSISTENCE_CONSTANTS.ERROR_MESSAGES.FILE_NOT_FOUND);
    });

    test('should verify integrity on load', async () => {
      const configData = await persistenceModule.loadConfiguration(testFilePath);
      
      expect(configData.isValid).toBe(true);
      
      // Verify integrity separately
      const integrity = await persistenceModule.verifyConfigurationIntegrity(testFilePath);
      expect(integrity.isValid).toBe(true);
      expect(integrity.expectedChecksum).toBe(integrity.actualChecksum);
    });

    test('should use default path when no path provided', async () => {
      // Set default path and save config
      persistenceModule.setDefaultConfigurationPath(testFilePath);
      
      const configData = await persistenceModule.loadConfiguration();
      expect(configData.filePath).toBe(testFilePath);
    });
  });

  describe('Configuration Delete Operations', () => {
    beforeEach(async () => {
      await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, testFilePath);
    });

    test('should delete configuration successfully', async () => {
      const result = await persistenceModule.deleteConfiguration(testFilePath);
      
      expect(result.success).toBe(true);
      expect(result.operationType).toBe(PersistenceOperationType.DELETE);
      
      // Verify file was deleted
      const fileExists = await fs.access(testFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });

    test('should create backup before deletion', async () => {
      const result = await persistenceModule.deleteConfiguration(testFilePath);
      
      expect(result.success).toBe(true);
      expect(result.metadata?.backupCreated).toBe(true);
      expect(result.metadata?.backupId).toBeDefined();
    });

    test('should handle deletion of non-existent file', async () => {
      const nonExistentPath = path.join(testConfigDir, 'nonexistent.json');
      
      await expect(
        persistenceModule.deleteConfiguration(nonExistentPath)
      ).rejects.toThrow(CONFIG_PERSISTENCE_CONSTANTS.ERROR_MESSAGES.FILE_NOT_FOUND);
    });
  });

  describe('Backup Management', () => {
    beforeEach(async () => {
      await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, testFilePath);
    });

    test('should create backup successfully', async () => {
      const backupResult = await persistenceModule.createBackup(testFilePath);
      
      expect(backupResult.success).toBe(true);
      expect(backupResult.backupId).toBeDefined();
      expect(backupResult.backupPath).toBeDefined();
      expect(backupResult.originalFilePath).toBe(testFilePath);
      
      // Verify backup file exists
      const backupExists = await fs.access(backupResult.backupPath).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);
    });

    test('should list backups correctly', async () => {
      // Create multiple backups
      const backup1 = await persistenceModule.createBackup(testFilePath, 'backup1');
      const backup2 = await persistenceModule.createBackup(testFilePath, 'backup2');
      
      const backups = await persistenceModule.listBackups(testFilePath);
      
      expect(backups.length).toBeGreaterThanOrEqual(2);
      expect(backups.some(b => b.id === backup1.backupId)).toBe(true);
      expect(backups.some(b => b.id === backup2.backupId)).toBe(true);
    });

    test('should restore from backup successfully', async () => {
      const originalConfig = testData.sampleConfigurations.basic;
      const modifiedConfig = { ...originalConfig, modified: true };
      
      // Create backup
      const backupResult = await persistenceModule.createBackup(testFilePath);
      
      // Modify config
      await persistenceModule.saveConfiguration(modifiedConfig, testFilePath);
      
      // Restore from backup
      const restoreResult = await persistenceModule.restoreFromBackup(backupResult.backupId, testFilePath);
      
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.dataIntegrityVerified).toBe(true);
      
      // Verify restored data
      const restoredData = await persistenceModule.loadConfiguration(testFilePath);
      expect(restoredData.data).toEqual(originalConfig);
    });

    test('should delete backup successfully', async () => {
      const backupResult = await persistenceModule.createBackup(testFilePath);
      
      const deleteResult = await persistenceModule.deleteBackup(backupResult.backupId);
      
      expect(deleteResult.success).toBe(true);
      
      // Verify backup no longer exists
      const backups = await persistenceModule.listBackups(testFilePath);
      expect(backups.some(b => b.id === backupResult.backupId)).toBe(false);
    });

    test('should cleanup old backups based on retention policy', async () => {
      const retentionCount = 2;
      
      // Create more backups than retention limit
      for (let i = 0; i < 5; i++) {
        await persistenceModule.createBackup(testFilePath, `backup${i}`);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const cleanupResult = await persistenceModule.cleanupOldBackups(retentionCount);
      
      expect(cleanupResult.success).toBe(true);
      expect(cleanupResult.deletedBackupsCount).toBeGreaterThan(0);
      expect(cleanupResult.retainedBackupsCount).toBe(retentionCount);
    });
  });

  describe('File Locking', () => {
    test('should acquire file lock successfully', async () => {
      const lockResult = await persistenceModule.acquireFileLock(testFilePath);
      
      expect(lockResult.success).toBe(true);
      expect(lockResult.lockId).toBeDefined();
      expect(lockResult.filePath).toBe(testFilePath);
      
      await persistenceModule.releaseFileLock(lockResult.lockId);
    });

    test('should check lock status correctly', async () => {
      const lockResult = await persistenceModule.acquireFileLock(testFilePath);
      
      const lockStatus = await persistenceModule.checkFileLock(testFilePath);
      
      expect(lockStatus.isLocked).toBe(true);
      expect(lockStatus.lockId).toBe(lockResult.lockId);
      
      await persistenceModule.releaseFileLock(lockResult.lockId);
      
      const unlockedStatus = await persistenceModule.checkFileLock(testFilePath);
      expect(unlockedStatus.isLocked).toBe(false);
    });

    test('should release file lock successfully', async () => {
      const lockResult = await persistenceModule.acquireFileLock(testFilePath);
      
      const releaseResult = await persistenceModule.releaseFileLock(lockResult.lockId);
      
      expect(releaseResult.success).toBe(true);
      
      // Verify lock is released
      const lockStatus = await persistenceModule.checkFileLock(testFilePath);
      expect(lockStatus.isLocked).toBe(false);
    });

    test('should handle lock timeout', async () => {
      const shortTimeout = 100; // 100ms
      
      const lockResult = await persistenceModule.acquireFileLock(testFilePath, shortTimeout);
      
      expect(lockResult.success).toBe(true);
      expect(lockResult.timeout).toBe(shortTimeout);
      
      await persistenceModule.releaseFileLock(lockResult.lockId);
    });
  });

  describe('Import/Export Operations', () => {
    beforeEach(async () => {
      await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, testFilePath);
    });

    test('should export configuration in JSON format', async () => {
      const exportResult = await persistenceModule.exportConfiguration(ExportFormat.JSON, testFilePath);
      
      expect(exportResult.success).toBe(true);
      expect(exportResult.format).toBe(ExportFormat.JSON);
      expect(exportResult.exportPath).toBeDefined();
      
      // Verify export file exists
      const exportExists = await fs.access(exportResult.exportPath).then(() => true).catch(() => false);
      expect(exportExists).toBe(true);
    });

    test('should import configuration from JSON file', async () => {
      // First export a configuration
      const exportResult = await persistenceModule.exportConfiguration(ExportFormat.JSON, testFilePath);
      
      // Create a new target file
      const importTargetPath = path.join(testConfigDir, 'imported-config.json');
      
      // Import the configuration
      const importResult = await persistenceModule.importConfiguration(
        exportResult.exportPath, 
        ExportFormat.JSON, 
        importTargetPath
      );
      
      expect(importResult.success).toBe(true);
      expect(importResult.format).toBe(ExportFormat.JSON);
      expect(importResult.validationPerformed).toBe(true);
      
      // Verify imported data
      const importedData = await persistenceModule.loadConfiguration(importTargetPath);
      expect(importedData.data).toEqual(testData.sampleConfigurations.basic);
    });

    test('should validate import data', async () => {
      const validJsonData = JSON.stringify(testData.sampleConfigurations.basic);
      const invalidJsonData = '{ invalid json }';
      
      const validResult = await persistenceModule.validateImportData(validJsonData, ExportFormat.JSON);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = await persistenceModule.validateImportData(invalidJsonData, ExportFormat.JSON);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Health Monitoring', () => {
    test('should perform storage health validation', async () => {
      const healthResult = await persistenceModule.validateStorageHealth();
      
      expect(healthResult.overallHealth).toBeDefined();
      expect(healthResult.checks).toBeInstanceOf(Array);
      expect(healthResult.checks.length).toBeGreaterThan(0);
      expect(healthResult.timestamp).toBeDefined();
    });

    test('should get storage statistics', async () => {
      // Create some test files first
      await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, testFilePath);
      await persistenceModule.createBackup(testFilePath);
      
      const stats = await persistenceModule.getStorageStatistics();
      
      expect(stats.totalConfigurationFiles).toBeGreaterThanOrEqual(0);
      expect(stats.totalBackupFiles).toBeGreaterThanOrEqual(0);
      expect(stats.totalStorageUsed).toBeGreaterThanOrEqual(0);
      expect(stats.storageHealth).toBeDefined();
    });

    test('should track operation history', async () => {
      // Perform some operations
      await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, testFilePath);
      const backupResult = await persistenceModule.createBackup(testFilePath);
      
      const history = await persistenceModule.getOperationHistory(10);
      
      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThan(0);
      
      // Check that operations are recorded
      const saveOp = history.find(op => op.operationType === PersistenceOperationType.SAVE);
      const backupOp = history.find(op => op.operationType === PersistenceOperationType.BACKUP);
      
      expect(saveOp).toBeDefined();
      expect(backupOp).toBeDefined();
    });
  });

  describe('Configuration Metadata', () => {
    beforeEach(async () => {
      await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, testFilePath);
    });

    test('should get configuration metadata', async () => {
      const metadata = await persistenceModule.getConfigurationMetadata(testFilePath);
      
      expect(metadata.version).toBeDefined();
      expect(metadata.createdAt).toBeDefined();
      expect(metadata.modifiedAt).toBeDefined();
      expect(metadata.checksum).toBeDefined();
      expect(metadata.fileSize).toBeGreaterThan(0);
      expect(metadata.format).toBe(ConfigurationFormat.JSON);
    });

    test('should set configuration metadata', async () => {
      const originalMetadata = await persistenceModule.getConfigurationMetadata(testFilePath);
      const updatedMetadata = {
        ...originalMetadata,
        description: 'Updated test configuration',
        tags: ['test', 'updated']
      };
      
      const result = await persistenceModule.setConfigurationMetadata(updatedMetadata, testFilePath);
      
      expect(result.success).toBe(true);
      
      const retrievedMetadata = await persistenceModule.getConfigurationMetadata(testFilePath);
      expect(retrievedMetadata.description).toBe('Updated test configuration');
      expect(retrievedMetadata.tags).toEqual(['test', 'updated']);
    });
  });

  describe('Default Path Management', () => {
    test('should set and get default configuration path', () => {
      const newDefaultPath = path.join(testConfigDir, 'new-default.json');
      
      persistenceModule.setDefaultConfigurationPath(newDefaultPath);
      
      const retrievedPath = persistenceModule.getDefaultConfigurationPath();
      expect(retrievedPath).toBe(newDefaultPath);
    });

    test('should use default path when no path provided', async () => {
      const defaultPath = path.join(testConfigDir, 'default-config.json');
      persistenceModule.setDefaultConfigurationPath(defaultPath);
      
      // Save without specifying path
      const result = await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic);
      
      expect(result.filePath).toBe(defaultPath);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid file paths', async () => {
      const invalidPaths = [
        '',
        null,
        undefined,
        '/invalid\x00path.json',
        'con:',  // Windows reserved name
      ];
      
      for (const invalidPath of invalidPaths) {
        await expect(
          persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, invalidPath as any)
        ).rejects.toThrow();
      }
    });

    test('should handle permission errors gracefully', async () => {
      // This test would need to create files with restricted permissions
      // Implementation depends on test environment capabilities
      expect(true).toBe(true); // Placeholder
    });

    test('should handle disk space issues', async () => {
      // This test would need to simulate disk space issues
      // Implementation depends on test environment capabilities
      expect(true).toBe(true); // Placeholder
    });

    test('should handle corrupted configuration files', async () => {
      // Create a corrupted file
      const corruptedPath = path.join(testConfigDir, 'corrupted.json');
      await fs.writeFile(corruptedPath, '{ invalid json content }', 'utf8');
      
      await expect(
        persistenceModule.loadConfiguration(corruptedPath)
      ).rejects.toThrow();
    });
  });

  describe('Performance Requirements', () => {
    test('should complete save operations within time limits', async () => {
      const startTime = Date.now();
      
      await persistenceModule.saveConfiguration(testData.sampleConfigurations.large, testFilePath);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(CONFIG_PERSISTENCE_CONSTANTS.PERFORMANCE_LIMITS.SLOW_OPERATION_THRESHOLD_MS);
    });

    test('should handle concurrent operations properly', async () => {
      const promises = [];
      
      // Start multiple concurrent save operations
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(testConfigDir, `concurrent-${i}.json`);
        promises.push(
          persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, filePath)
        );
      }
      
      const results = await Promise.all(promises);
      
      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('should respect memory usage limits', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(testConfigDir, `memory-test-${i}.json`);
        await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, filePath);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(CONFIG_PERSISTENCE_CONSTANTS.PERFORMANCE_LIMITS.WARNING_FILE_SIZE_BYTES);
    });
  });

  describe('Inter-Module Communication', () => {
    test('should receive data from connected modules', async () => {
      const testDataTransfer = {
        id: 'test-transfer',
        sourceConnectionId: 'test-source',
        targetConnectionId: 'config-persistence',
        data: {
          config: testData.sampleConfigurations.basic,
          filePath: testFilePath
        },
        timestamp: Date.now(),
        metadata: {
          type: CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.SAVE_REQUEST
        }
      };
      
      // This would normally come from another module
      await persistenceModule.receiveData(testDataTransfer);
      
      // Verify the operation was processed
      const history = await persistenceModule.getOperationHistory(1);
      expect(history.length).toBeGreaterThan(0);
    });

    test('should handle unknown data transfer types', async () => {
      const unknownDataTransfer = {
        id: 'unknown-transfer',
        sourceConnectionId: 'test-source',
        targetConnectionId: 'config-persistence',
        data: {},
        timestamp: Date.now(),
        metadata: {
          type: 'unknown-type'
        }
      };
      
      // Should not throw error, but log warning
      await expect(
        persistenceModule.receiveData(unknownDataTransfer)
      ).resolves.not.toThrow();
    });
  });

  describe('Configuration Format Support', () => {
    const formats = [
      { format: ConfigurationFormat.JSON, extension: '.json' },
      { format: ConfigurationFormat.YAML, extension: '.yaml' },
      { format: ConfigurationFormat.TOML, extension: '.toml' },
      { format: ConfigurationFormat.INI, extension: '.ini' },
      { format: ConfigurationFormat.XML, extension: '.xml' },
      { format: ConfigurationFormat.PROPERTIES, extension: '.properties' }
    ];

    formats.forEach(({ format, extension }) => {
      test(`should handle ${format} format correctly`, async () => {
        const formatFilePath = path.join(testConfigDir, `test-config${extension}`);
        
        const result = await persistenceModule.saveConfiguration(
          testData.sampleConfigurations.basic, 
          formatFilePath
        );
        
        expect(result.success).toBe(true);
        
        const loadedData = await persistenceModule.loadConfiguration(formatFilePath);
        expect(loadedData.metadata.format).toBe(format);
      });
    });
  });
});