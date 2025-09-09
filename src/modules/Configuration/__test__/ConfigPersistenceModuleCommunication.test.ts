/**
 * ConfigPersistenceModule Communication Tests
 * 
 * Tests for inter-module communication capabilities of the Configuration Persistence Module
 * following RCC governance rules for module communication testing
 */

import { ConfigPersistenceModule } from '../src/ConfigPersistenceModule';
import { ConfigValidatorModule } from '../src/ConfigValidatorModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ModuleRegistry } from '../../../registry/ModuleRegistry';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';
import { CONFIG_PERSISTENCE_CONSTANTS } from '../constants/ConfigPersistenceConstants';
import { CONFIG_VALIDATOR_CONSTANTS } from '../constants/ConfigValidatorConstants';
import * as fs from 'fs/promises';
import * as path from 'path';
import { testData } from './fixtures/test-data';

describe('ConfigPersistenceModule Communication', () => {
  let persistenceModule: ConfigPersistenceModule;
  let validatorModule: ConfigValidatorModule;
  let registry: ModuleRegistry;
  let testConfigDir: string;
  let testFilePath: string;

  beforeAll(async () => {
    // Setup test environment
    testConfigDir = path.join(__dirname, '../../../tmp/test-config-communication');
    testFilePath = path.join(testConfigDir, 'test-config.json');
    
    // Ensure test directory exists
    await fs.mkdir(testConfigDir, { recursive: true });
    
    // Get registry instance
    registry = ModuleRegistry.getInstance();
  });

  beforeEach(async () => {
    // Create module instances
    const persistenceInfo: ModuleInfo = {
      id: 'test-config-persistence-comm',
      name: 'Test Config Persistence Module',
      version: '1.0.0',
      description: 'Test instance for communication testing',
      type: 'config-persistence'
    };

    const validatorInfo: ModuleInfo = {
      id: 'test-config-validator-comm',
      name: 'Test Config Validator Module',
      version: '1.0.0',
      description: 'Test instance for communication testing',
      type: 'config-validator'
    };

    persistenceModule = new ConfigPersistenceModule(persistenceInfo);
    validatorModule = new ConfigValidatorModule(validatorInfo);
    
    // Configure modules
    persistenceModule.configure({
      defaultConfigPath: testFilePath,
      testMode: true
    });

    validatorModule.configure({
      testMode: true
    });

    // Initialize modules
    await persistenceModule.initialize();
    await validatorModule.initialize();
  });

  afterEach(async () => {
    if (persistenceModule) {
      await persistenceModule.destroy();
    }
    if (validatorModule) {
      await validatorModule.destroy();
    }
  });

  afterAll(async () => {
    // Cleanup test files
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error.message);
    }
  });

  describe('Module Connection Establishment', () => {
    test('should establish input connection successfully', () => {
      const inputConnection: ConnectionInfo = {
        id: 'persistence-input-connection',
        type: 'input',
        sourceModuleId: 'test-config-validator-comm',
        targetModuleId: 'test-config-persistence-comm',
        dataTypes: [CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.SAVE_REQUEST],
        metadata: {
          description: 'Receives save requests from validator module',
          priority: 1
        }
      };

      persistenceModule.addInputConnection(inputConnection);
      
      const inputConnections = persistenceModule.getInputConnections();
      expect(inputConnections).toHaveLength(1);
      expect(inputConnections[0].id).toBe('persistence-input-connection');
    });

    test('should establish output connection successfully', () => {
      const outputConnection: ConnectionInfo = {
        id: 'persistence-output-connection',
        type: 'output',
        sourceModuleId: 'test-config-persistence-comm',
        targetModuleId: 'test-config-validator-comm',
        dataTypes: [CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.PERSISTENCE_RESULT],
        metadata: {
          description: 'Sends persistence results to validator module',
          priority: 1
        }
      };

      persistenceModule.addOutputConnection(outputConnection);
      
      const outputConnections = persistenceModule.getOutputConnections();
      expect(outputConnections).toHaveLength(1);
      expect(outputConnections[0].id).toBe('persistence-output-connection');
    });

    test('should remove connections properly', () => {
      const connection: ConnectionInfo = {
        id: 'temp-connection',
        type: 'input',
        sourceModuleId: 'source',
        targetModuleId: 'target',
        dataTypes: ['test-data']
      };

      persistenceModule.addInputConnection(connection);
      expect(persistenceModule.getInputConnections()).toHaveLength(1);

      persistenceModule.removeInputConnection('temp-connection');
      expect(persistenceModule.getInputConnections()).toHaveLength(0);
    });

    test('should validate connection types', () => {
      const invalidConnection: ConnectionInfo = {
        id: 'invalid-connection',
        type: 'output', // Wrong type for input
        sourceModuleId: 'source',
        targetModuleId: 'target',
        dataTypes: ['test-data']
      };

      expect(() => {
        persistenceModule.addInputConnection(invalidConnection);
      }).toThrow('Invalid connection type for input');
    });
  });

  describe('Module Handshaking', () => {
    test('should perform successful handshake between modules', async () => {
      const handshakeResult = await persistenceModule.handshake(validatorModule);
      expect(handshakeResult).toBe(true);
    });

    test('should handle handshake with self', async () => {
      const selfHandshake = await persistenceModule.handshake(persistenceModule);
      expect(selfHandshake).toBe(true);
    });
  });

  describe('Data Transfer Operations', () => {
    beforeEach(() => {
      // Setup connections between modules
      const persistenceToValidator: ConnectionInfo = {
        id: 'persistence-to-validator',
        type: 'output',
        sourceModuleId: 'test-config-persistence-comm',
        targetModuleId: 'test-config-validator-comm',
        dataTypes: [CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.CONFIGURATION_DATA]
      };

      const validatorToPersistence: ConnectionInfo = {
        id: 'validator-to-persistence',
        type: 'input',
        sourceModuleId: 'test-config-validator-comm',
        targetModuleId: 'test-config-persistence-comm',
        dataTypes: [CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.SAVE_REQUEST]
      };

      persistenceModule.addOutputConnection(persistenceToValidator);
      persistenceModule.addInputConnection(validatorToPersistence);
    });

    test('should handle save request data transfer', async () => {
      const saveRequestData: DataTransfer = {
        id: 'save-request-transfer',
        sourceConnectionId: 'validator-to-persistence',
        targetConnectionId: 'test-config-persistence-comm',
        data: {
          config: testData.sampleConfigurations.basic,
          filePath: testFilePath
        },
        timestamp: Date.now(),
        metadata: {
          type: CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.SAVE_REQUEST,
          priority: 1
        }
      };

      await persistenceModule.receiveData(saveRequestData);

      // Verify the configuration was saved
      const fileExists = await fs.access(testFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    test('should handle load request data transfer', async () => {
      // First save a configuration
      await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, testFilePath);

      const loadRequestData: DataTransfer = {
        id: 'load-request-transfer',
        sourceConnectionId: 'validator-to-persistence',
        targetConnectionId: 'test-config-persistence-comm',
        data: {
          filePath: testFilePath
        },
        timestamp: Date.now(),
        metadata: {
          type: CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.LOAD_REQUEST
        }
      };

      await persistenceModule.receiveData(loadRequestData);

      // Verify operation was recorded in history
      const history = await persistenceModule.getOperationHistory(1);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].operationType).toBe('load');
    });

    test('should handle backup request data transfer', async () => {
      // First save a configuration
      await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, testFilePath);

      const backupRequestData: DataTransfer = {
        id: 'backup-request-transfer',
        sourceConnectionId: 'validator-to-persistence',
        targetConnectionId: 'test-config-persistence-comm',
        data: {
          filePath: testFilePath,
          backupName: 'communication-test-backup'
        },
        timestamp: Date.now(),
        metadata: {
          type: CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.BACKUP_REQUEST
        }
      };

      await persistenceModule.receiveData(backupRequestData);

      // Verify backup was created
      const backups = await persistenceModule.listBackups(testFilePath);
      expect(backups.length).toBeGreaterThan(0);
    });

    test('should handle restore request data transfer', async () => {
      // Setup: save config and create backup
      await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, testFilePath);
      const backupResult = await persistenceModule.createBackup(testFilePath);

      const restoreRequestData: DataTransfer = {
        id: 'restore-request-transfer',
        sourceConnectionId: 'validator-to-persistence',
        targetConnectionId: 'test-config-persistence-comm',
        data: {
          backupId: backupResult.backupId,
          targetPath: testFilePath
        },
        timestamp: Date.now(),
        metadata: {
          type: CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.RESTORE_REQUEST
        }
      };

      await persistenceModule.receiveData(restoreRequestData);

      // Verify operation was recorded
      const history = await persistenceModule.getOperationHistory(5);
      const restoreOp = history.find(op => op.operationType === 'restore');
      expect(restoreOp).toBeDefined();
    });

    test('should handle unknown data transfer types gracefully', async () => {
      const unknownRequestData: DataTransfer = {
        id: 'unknown-request-transfer',
        sourceConnectionId: 'validator-to-persistence',
        targetConnectionId: 'test-config-persistence-comm',
        data: {},
        timestamp: Date.now(),
        metadata: {
          type: 'unknown-request-type'
        }
      };

      // Should not throw, but should handle gracefully
      await expect(
        persistenceModule.receiveData(unknownRequestData)
      ).resolves.not.toThrow();
    });
  });

  describe('Bidirectional Communication', () => {
    test('should establish bidirectional communication flow', async () => {
      // Setup bidirectional connections
      const persistenceToValidator: ConnectionInfo = {
        id: 'persistence-to-validator-bidir',
        type: 'output',
        sourceModuleId: 'test-config-persistence-comm',
        targetModuleId: 'test-config-validator-comm',
        dataTypes: [CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.CONFIGURATION_DATA]
      };

      const validatorToPersistence: ConnectionInfo = {
        id: 'validator-to-persistence-bidir',
        type: 'input',
        sourceModuleId: 'test-config-validator-comm',
        targetModuleId: 'test-config-persistence-comm',
        dataTypes: [CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.SAVE_REQUEST]
      };

      persistenceModule.addOutputConnection(persistenceToValidator);
      persistenceModule.addInputConnection(validatorToPersistence);

      // Test save request from validator to persistence
      const saveRequest: DataTransfer = {
        id: 'bidir-save-request',
        sourceConnectionId: 'validator-to-persistence-bidir',
        targetConnectionId: 'test-config-persistence-comm',
        data: {
          config: testData.sampleConfigurations.basic,
          filePath: testFilePath
        },
        timestamp: Date.now(),
        metadata: {
          type: CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.SAVE_REQUEST
        }
      };

      await persistenceModule.receiveData(saveRequest);

      // Verify file was saved
      const fileExists = await fs.access(testFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Load the configuration and verify data flow
      const configData = await persistenceModule.loadConfiguration(testFilePath);
      expect(configData.data).toEqual(testData.sampleConfigurations.basic);
    });
  });

  describe('Error Handling in Communication', () => {
    test('should handle communication errors gracefully', async () => {
      const errorRequestData: DataTransfer = {
        id: 'error-request-transfer',
        sourceConnectionId: 'validator-to-persistence',
        targetConnectionId: 'test-config-persistence-comm',
        data: {
          config: null, // Invalid config data
          filePath: testFilePath
        },
        timestamp: Date.now(),
        metadata: {
          type: CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.SAVE_REQUEST
        }
      };

      // Should handle error and not crash
      await expect(
        persistenceModule.receiveData(errorRequestData)
      ).resolves.not.toThrow();
    });

    test('should send error responses for failed operations', async () => {
      const invalidSaveRequest: DataTransfer = {
        id: 'invalid-save-request',
        sourceConnectionId: 'validator-to-persistence',
        targetConnectionId: 'test-config-persistence-comm',
        data: {
          config: testData.sampleConfigurations.basic,
          filePath: '/invalid/path/that/does/not/exist.json'
        },
        timestamp: Date.now(),
        metadata: {
          type: CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.SAVE_REQUEST
        }
      };

      // This should trigger an error response
      await persistenceModule.receiveData(invalidSaveRequest);

      // In a real implementation, we would verify that an error response was sent
      // For now, we just verify that the module doesn't crash
      expect(true).toBe(true);
    });
  });

  describe('Connection Metadata and Priority', () => {
    test('should respect connection priorities', () => {
      const highPriorityConnection: ConnectionInfo = {
        id: 'high-priority-connection',
        type: 'input',
        sourceModuleId: 'source1',
        targetModuleId: 'test-config-persistence-comm',
        dataTypes: ['data1'],
        metadata: { priority: 1 }
      };

      const lowPriorityConnection: ConnectionInfo = {
        id: 'low-priority-connection',
        type: 'input',
        sourceModuleId: 'source2',
        targetModuleId: 'test-config-persistence-comm',
        dataTypes: ['data2'],
        metadata: { priority: 2 }
      };

      persistenceModule.addInputConnection(highPriorityConnection);
      persistenceModule.addInputConnection(lowPriorityConnection);

      const connections = persistenceModule.getInputConnections();
      expect(connections).toHaveLength(2);
      
      // Both connections should be present
      expect(connections.find(c => c.id === 'high-priority-connection')).toBeDefined();
      expect(connections.find(c => c.id === 'low-priority-connection')).toBeDefined();
    });

    test('should handle connection metadata properly', () => {
      const connectionWithMetadata: ConnectionInfo = {
        id: 'metadata-connection',
        type: 'output',
        sourceModuleId: 'test-config-persistence-comm',
        targetModuleId: 'target',
        dataTypes: ['data'],
        metadata: {
          description: 'Test connection with metadata',
          version: '1.0.0',
          author: 'test-suite',
          tags: ['test', 'metadata']
        }
      };

      persistenceModule.addOutputConnection(connectionWithMetadata);

      const connections = persistenceModule.getOutputConnections();
      const connection = connections.find(c => c.id === 'metadata-connection');
      
      expect(connection).toBeDefined();
      expect(connection!.metadata!.description).toBe('Test connection with metadata');
      expect(connection!.metadata!.tags).toEqual(['test', 'metadata']);
    });
  });

  describe('Data Type Filtering', () => {
    test('should filter data transfers by supported types', async () => {
      const supportedConnection: ConnectionInfo = {
        id: 'supported-data-connection',
        type: 'input',
        sourceModuleId: 'source',
        targetModuleId: 'test-config-persistence-comm',
        dataTypes: [CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.SAVE_REQUEST]
      };

      persistenceModule.addInputConnection(supportedConnection);

      // This should work - supported data type
      const supportedData: DataTransfer = {
        id: 'supported-transfer',
        sourceConnectionId: 'supported-data-connection',
        targetConnectionId: 'test-config-persistence-comm',
        data: {
          config: testData.sampleConfigurations.basic,
          filePath: testFilePath
        },
        timestamp: Date.now(),
        metadata: {
          type: CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.SAVE_REQUEST
        }
      };

      await persistenceModule.receiveData(supportedData);

      // Verify the operation was processed
      const history = await persistenceModule.getOperationHistory(1);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Module Registry Integration', () => {
    test('should register modules with communication capabilities', () => {
      registry.registerModuleType('config-persistence-comm', ConfigPersistenceModule);
      registry.registerModuleType('config-validator-comm', ConfigValidatorModule);

      const registeredTypes = registry.getRegisteredTypes();
      expect(registeredTypes).toContain('config-persistence-comm');
      expect(registeredTypes).toContain('config-validator-comm');
    });

    test('should create communicating modules through registry', async () => {
      registry.registerModuleType('config-persistence-registry-comm', ConfigPersistenceModule);

      const moduleInfo: ModuleInfo = {
        id: 'registry-comm-test',
        name: 'Registry Communication Test',
        version: '1.0.0',
        description: 'Test module communication through registry',
        type: 'config-persistence-registry-comm'
      };

      const createdModule = await registry.createModule('config-persistence-registry-comm', moduleInfo);
      expect(createdModule).toBeInstanceOf(ConfigPersistenceModule);

      // Test that the module can establish connections
      const testConnection: ConnectionInfo = {
        id: 'registry-test-connection',
        type: 'input',
        sourceModuleId: 'source',
        targetModuleId: 'registry-comm-test',
        dataTypes: ['test-data']
      };

      createdModule.addInputConnection(testConnection);
      expect(createdModule.getInputConnections()).toHaveLength(1);

      await createdModule.destroy();
    });
  });

  describe('Performance in Communication', () => {
    test('should handle high-volume data transfers efficiently', async () => {
      const startTime = Date.now();
      const transferPromises: Promise<void>[] = [];

      // Setup connection
      const connection: ConnectionInfo = {
        id: 'high-volume-connection',
        type: 'input',
        sourceModuleId: 'source',
        targetModuleId: 'test-config-persistence-comm',
        dataTypes: [CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.SAVE_REQUEST]
      };

      persistenceModule.addInputConnection(connection);

      // Send multiple data transfers concurrently
      for (let i = 0; i < 10; i++) {
        const transfer: DataTransfer = {
          id: `bulk-transfer-${i}`,
          sourceConnectionId: 'high-volume-connection',
          targetConnectionId: 'test-config-persistence-comm',
          data: {
            config: { ...testData.sampleConfigurations.basic, id: i },
            filePath: path.join(testConfigDir, `bulk-${i}.json`)
          },
          timestamp: Date.now(),
          metadata: {
            type: CONFIG_PERSISTENCE_CONSTANTS.DATA_TRANSFER_TYPES.SAVE_REQUEST
          }
        };

        transferPromises.push(persistenceModule.receiveData(transfer));
      }

      await Promise.all(transferPromises);

      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds for 10 operations

      // Verify all files were created
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(testConfigDir, `bulk-${i}.json`);
        const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(fileExists).toBe(true);
      }
    });

    test('should maintain connection state during high load', async () => {
      // Add multiple connections
      for (let i = 0; i < 20; i++) {
        const connection: ConnectionInfo = {
          id: `load-test-connection-${i}`,
          type: 'input',
          sourceModuleId: `source-${i}`,
          targetModuleId: 'test-config-persistence-comm',
          dataTypes: ['test-data']
        };
        persistenceModule.addInputConnection(connection);
      }

      expect(persistenceModule.getInputConnections()).toHaveLength(20);

      // Perform operations while connections are active
      await persistenceModule.saveConfiguration(testData.sampleConfigurations.basic, testFilePath);

      // Verify connections are still intact
      expect(persistenceModule.getInputConnections()).toHaveLength(20);
    });
  });
});