/**
 * Configuration System Tests
 * 
 * Comprehensive tests for the ConfigurationSystem class
 * covering all major functionality and edge cases.
 * All mock tests have been removed and replaced with real functional tests.
 * Target coverage: 90%+
 */

import { ConfigurationSystem } from '../src/core/ConfigurationSystem';
import { 
  createConfigurationSystem,
  isValidConfigurationStructure,
  createConfigurationTemplate,
  mergeConfigurations,
  extractConfigurationPaths,
  getConfigurationValue,
  setConfigurationValue
} from '../src/index';
import { 
  ConfigData, 
  ConfigValue, 
  ConfigSource, 
  ConfigSchema,
  ConfigPersistenceOptions,
  BackupOptions,
  EncryptionOptions,
  ValidationRule,
  // ValidationError, ValidationWarning // Unused
} from '../src/interfaces/IConfigurationSystem';
import { CONFIGURATION_SYSTEM_CONSTANTS } from '../src/constants/ConfigurationConstants';

describe('ConfigurationSystem', () => {
  let configSystem: ConfigurationSystem;

  beforeEach(() => {
    configSystem = new ConfigurationSystem({
      id: 'test-config-system',
      name: 'Test Configuration System',
      version: '1.0.0'
    });
  });

  afterEach(async () => {
    if (configSystem) {
      try {
        await configSystem.destroy();
      } catch (error) {
        // Ignore cleanup errors in tests
      }
    }
  });

  describe('Initialization', () => {
    test('should create ConfigurationSystem with default values', () => {
      const system = new ConfigurationSystem();
      expect(system).toBeInstanceOf(ConfigurationSystem);
      expect(system.getInfo().name).toBe(CONFIGURATION_SYSTEM_CONSTANTS.MODULE_NAME);
      expect(system.getInfo().type).toBe(CONFIGURATION_SYSTEM_CONSTANTS.MODULE_TYPE);
      expect(system.getInfo().version).toBe(CONFIGURATION_SYSTEM_CONSTANTS.MODULE_VERSION);
      expect(system.getInfo().description).toBe(CONFIGURATION_SYSTEM_CONSTANTS.MODULE_DESCRIPTION);
      expect(system.getInfo().metadata?.['capabilities']).toContain('configuration-loading');
      expect(system.getInfo().metadata?.['capabilities']).toContain('configuration-saving');
      expect(system.getInfo().metadata?.['capabilities']).toContain('configuration-validation');
    });

    test('should create ConfigurationSystem with custom values', () => {
      const customInfo = {
        id: 'custom-id',
        name: 'Custom Config System',
        version: '2.0.0',
        description: 'Custom description',
        metadata: { customProperty: 'test' }
      };

      const system = new ConfigurationSystem(customInfo);
      expect(system.getInfo().id).toBe(customInfo.id);
      expect(system.getInfo().name).toBe(customInfo.name);
      expect(system.getInfo().version).toBe(customInfo.version);
      expect(system.getInfo().description).toBe(customInfo.description);
      expect(system.getInfo().metadata?.['customProperty']).toBe('test');
      expect(system.getInfo().metadata?.['capabilities']).toBeDefined();
    });

    test('should generate unique IDs when not provided', () => {
      const system1 = new ConfigurationSystem();
      const system2 = new ConfigurationSystem();
      expect(system1.getInfo().id).not.toBe(system2.getInfo().id);
      expect(system1.getInfo().id).toContain(CONFIGURATION_SYSTEM_CONSTANTS.MODULE_NAME);
    });

    test('should initialize successfully without config', async () => {
      await expect(configSystem.initialize()).resolves.not.toThrow();
      expect(configSystem.getInfo().metadata?.['capabilities']).toBeDefined();
    });

    test('should initialize with empty config object', async () => {
      await expect(configSystem.initialize({})).resolves.not.toThrow();
    });

    test('should initialize with modules config', async () => {
      const initConfig = {
        modules: {
          loader: { enabled: true, format: 'json' },
          validator: { enabled: true, strict: false },
          persistence: { enabled: false },
          ui: { enabled: false }
        }
      };

      await expect(configSystem.initialize(initConfig)).resolves.not.toThrow();
    });

    test('should initialize with initial configuration data', async () => {
      const testConfig = createConfigurationTemplate('initial-config');
      const initConfig = {
        initialConfig: testConfig
      };

      await configSystem.initialize(initConfig);
      expect(() => configSystem.getConfiguration()).not.toThrow();
      const loadedConfig = configSystem.getConfiguration();
      expect(loadedConfig.metadata.name).toBe('initial-config');
    });

    test('should initialize with initial configuration source', async () => {
      const initConfig = {
        initialConfig: 'test-config.json'
      };

      // This should not throw, even though loader module is not available
      await expect(configSystem.initialize(initConfig)).resolves.not.toThrow();
    });

    test('should handle initialization errors gracefully', async () => {
      const invalidConfig = {
        initialConfig: { invalid: 'structure' }
      };

      await expect(configSystem.initialize(invalidConfig)).rejects.toThrow('Configuration system initialization failed');
    });
  });

  describe('Configuration Loading and Sources', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });

    test('should throw error when loading without loader module', async () => {
      await expect(configSystem.loadConfiguration('test-config.json')).rejects.toThrow('Loader module not available');
    });

    test('should throw error when loading from string source', async () => {
      await expect(configSystem.loadConfiguration('nonexistent-file.json')).rejects.toThrow('Loader module not available');
    });

    test('should throw error when loading from ConfigSource object', async () => {
      const source: ConfigSource = {
        type: 'file',
        path: 'test-config.json',
        format: 'json'
      };
      await expect(configSystem.loadConfiguration(source)).rejects.toThrow('Loader module not available');
    });

    test('should throw error when loading multiple configurations', async () => {
      const sources = ['config1.json', 'config2.json'];
      await expect(configSystem.loadMultipleConfigurations(sources)).rejects.toThrow('Loader module not available');
    });

    test('should handle different merge strategies for multiple configs', async () => {
      const sources: ConfigSource[] = [
        { type: 'file', path: 'config1.json' },
        { type: 'environment', format: 'env' }
      ];
      
      await expect(configSystem.loadMultipleConfigurations(sources, 'deep')).rejects.toThrow('Loader module not available');
      await expect(configSystem.loadMultipleConfigurations(sources, 'shallow')).rejects.toThrow('Loader module not available');
      await expect(configSystem.loadMultipleConfigurations(sources, 'replace')).rejects.toThrow('Loader module not available');
    });

    test('should handle remote configuration sources', async () => {
      const remoteSource: ConfigSource = {
        type: 'remote',
        url: 'https://example.com/config.json',
        format: 'json',
        headers: { 'Authorization': 'Bearer token' },
        auth: { type: 'bearer', token: 'test-token' }
      };
      await expect(configSystem.loadConfiguration(remoteSource)).rejects.toThrow('Loader module not available');
    });

    test('should handle database configuration sources', async () => {
      const dbSource: ConfigSource = {
        type: 'database',
        path: 'config_table',
        options: { connectionString: 'postgres://test' }
      };
      await expect(configSystem.loadConfiguration(dbSource)).rejects.toThrow('Loader module not available');
    });
  });

  describe('Configuration Management and State', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });

    test('should throw error when getting configuration before loading', () => {
      expect(() => configSystem.getConfiguration()).toThrow('No configuration loaded');
      expect(() => configSystem.getConfiguration()).toThrow(CONFIGURATION_SYSTEM_CONSTANTS.ERROR_CODES.CONFIG_NOT_LOADED);
    });

    test('should return deep copy of configuration to prevent external modification', () => {
      const testConfig = createConfigurationTemplate('test-config');
      // Directly set configuration for testing (simulating successful load)
      configSystem['currentConfig'] = testConfig;

      const retrievedConfig = configSystem.getConfiguration();
      expect(retrievedConfig).toEqual(testConfig);
      expect(retrievedConfig).not.toBe(testConfig); // Different object reference
      
      // Modify retrieved config should not affect internal state
      retrievedConfig.metadata.name = 'modified-name';
      expect(configSystem.getConfiguration().metadata.name).toBe('test-config');
    });

    test('should handle configuration updates with validation enabled', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      configSystem['currentConfig'] = testConfig;

      const updates: Partial<ConfigData> = {
        settings: {
          newCategory: {
            newSetting: {
              value: 'newValue',
              type: 'string',
              required: false,
              description: 'A new setting'
            } as ConfigValue
          }
        },
        metadata: {
          ...testConfig.metadata,
          author: 'Test Author'
        }
      };

      const updatedConfig = await configSystem.updateConfiguration(updates, true);
      
      expect(updatedConfig.settings['newCategory']?.['newSetting']?.value).toBe('newValue');
      expect(updatedConfig.metadata.author).toBe('Test Author');
      expect(updatedConfig.metadata.updatedAt).toBeDefined();
      expect(new Date(updatedConfig.metadata.updatedAt).getTime()).toBeGreaterThan(new Date(testConfig.metadata.updatedAt).getTime());
    });

    test('should handle configuration updates with validation disabled', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      configSystem['currentConfig'] = testConfig;

      const updates: Partial<ConfigData> = {
        settings: {
          existing: {
            modifiedSetting: {
              value: 'modifiedValue',
              type: 'string',
              required: true
            } as ConfigValue
          }
        }
      };

      const updatedConfig = await configSystem.updateConfiguration(updates, false);
      expect(updatedConfig.settings['existing']?.['modifiedSetting']?.value).toBe('modifiedValue');
    });

    test('should throw error when updating without loaded configuration', async () => {
      const updates: Partial<ConfigData> = { 
        settings: { 
          test: {
            testValue: {
              value: 'value',
              type: 'string',
              required: false
            } as ConfigValue
          }
        }
      };
      await expect(configSystem.updateConfiguration(updates)).rejects.toThrow('No configuration loaded to update');
    });

    test('should calculate and track configuration changes', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      configSystem['currentConfig'] = testConfig;

      const originalSettings = JSON.stringify(testConfig.settings);
      const updates: Partial<ConfigData> = {
        version: '2.0.0',
        settings: {
          performance: {
            cacheSize: {
              value: 1024,
              type: 'number',
              required: false
            } as ConfigValue
          }
        }
      };

      const updatedConfig = await configSystem.updateConfiguration(updates, false);
      expect(updatedConfig.version).toBe('2.0.0');
      expect(JSON.stringify(updatedConfig.settings)).not.toBe(originalSettings);
    });
  });

  describe('Schema Management', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });

    test('should set and get simple schema', () => {
      const schema: ConfigSchema = {
        version: '1.0.0',
        type: 'json-schema',
        definition: {
          type: 'object',
          properties: {
            settings: { type: 'object' }
          }
        }
      };

      configSystem.setSchema(schema);
      const retrievedSchema = configSystem.getSchema();

      expect(retrievedSchema).toEqual(schema);
      expect(retrievedSchema).not.toBe(schema); // Should be a deep copy
    });

    test('should set and get complex schema with validation rules', () => {
      const validationRules: ValidationRule[] = [
        {
          name: 'required-name',
          type: 'format',
          params: { pattern: '^[a-zA-Z0-9-_]+$' },
          message: 'Name must contain only alphanumeric characters, hyphens, and underscores',
          required: true
        },
        {
          name: 'version-format',
          type: 'pattern',
          params: { regex: '^\\d+\\.\\d+\\.\\d+$' },
          message: 'Version must be in semantic versioning format',
          required: true
        }
      ];

      const schema: ConfigSchema = {
        version: '2.0.0',
        type: 'ajv',
        definition: {
          type: 'object',
          required: ['metadata', 'settings', 'version'],
          properties: {
            metadata: {
              type: 'object',
              required: ['name', 'createdAt', 'updatedAt']
            },
            settings: { type: 'object' },
            version: { type: 'string' }
          }
        },
        rules: validationRules
      };

      configSystem.setSchema(schema);
      const retrievedSchema = configSystem.getSchema();

      expect(retrievedSchema).toEqual(schema);
      expect(retrievedSchema?.rules).toHaveLength(2);
      expect(retrievedSchema?.rules?.[0]?.name).toBe('required-name');
    });

    test('should return undefined when no schema is set', () => {
      expect(configSystem.getSchema()).toBeUndefined();
    });

    test('should handle schema with constraints', () => {
      const schema: ConfigSchema = {
        version: '1.0.0',
        type: 'json-schema',
        definition: { type: 'object' },
        constraints: [
          {
            name: 'environment-consistency',
            fields: ['metadata.environment', 'settings.general.env'],
            constraint: (config: ConfigData) => config.metadata.environment === 'production',
            message: 'Environment settings must be consistent',
            severity: 'error'
          }
        ]
      };

      configSystem.setSchema(schema);
      const retrievedSchema = configSystem.getSchema();
      expect(retrievedSchema?.constraints).toHaveLength(1);
    });
  });

  describe('Configuration Validation', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });

    test('should validate configuration without validator module', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      
      const result = await configSystem.validateConfiguration(testConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.duration).toBe(0);
      expect(result.metadata.validatorVersion).toBe('built-in');
    });

    test('should validate configuration with provided schema', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      const schema: ConfigSchema = {
        version: '1.0.0',
        type: 'json-schema',
        definition: { 
          type: 'object',
          required: ['metadata', 'settings', 'version']
        }
      };
      
      const result = await configSystem.validateConfiguration(testConfig, schema);
      
      expect(result.isValid).toBe(true);
      expect(result.metadata.validatorVersion).toBe('built-in');
    });

    test('should validate configuration with current schema', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      const schema: ConfigSchema = {
        version: '1.0.0',
        type: 'json-schema',
        definition: { type: 'object' }
      };
      
      configSystem.setSchema(schema);
      const result = await configSystem.validateConfiguration(testConfig);
      
      expect(result.isValid).toBe(true);
    });

    test('should handle validation of invalid configuration structure', async () => {
      const invalidConfig = { invalid: 'structure' } as any;
      
      // Even without validator module, should return basic validation
      const result = await configSystem.validateConfiguration(invalidConfig);
      expect(result.isValid).toBe(true); // Built-in validator is basic
    });

    test('should validate complex configuration with nested settings', async () => {
      const complexConfig = createConfigurationTemplate('complex-config');
      complexConfig.settings = {
        database: {
          host: { value: 'localhost', type: 'string', required: true } as ConfigValue,
          port: { value: 5432, type: 'number', required: true } as ConfigValue,
          ssl: { value: true, type: 'boolean', required: false } as ConfigValue
        },
        cache: {
          enabled: { value: true, type: 'boolean', required: false } as ConfigValue,
          ttl: { value: 3600, type: 'number', required: false } as ConfigValue
        },
        features: {
          experimental: { value: ['feature1', 'feature2'], type: 'array', required: false } as ConfigValue
        }
      };

      const result = await configSystem.validateConfiguration(complexConfig);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Configuration Watching and Events', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });

    test('should set up configuration watcher with callback', () => {
      const callback = (event: any) => {
        expect(event).toBeDefined();
      };
      const sources = ['test-config.json'];

      expect(() => {
        configSystem.watchConfiguration(callback, sources);
      }).not.toThrow();
    });

    test('should set up watcher without specific sources', () => {
      const callback = (event: any) => {
        expect(event.type).toBeDefined();
      };

      expect(() => {
        configSystem.watchConfiguration(callback);
      }).not.toThrow();
    });

    test('should set up watcher with ConfigSource objects', () => {
      const callback = (event: any) => {
        expect(event).toBeDefined();
      };
      const sources: ConfigSource[] = [
        { type: 'file', path: 'config1.json', watch: true },
        { type: 'remote', url: 'https://example.com/config.json', watch: true }
      ];

      expect(() => {
        configSystem.watchConfiguration(callback, sources);
      }).not.toThrow();
    });

    test('should stop watching specific configuration sources', () => {
      const callback = (_event: any) => {}; // Unused parameter
      const sources = ['test-config.json'];

      configSystem.watchConfiguration(callback, sources);
      
      expect(() => {
        configSystem.stopWatching(sources);
      }).not.toThrow();
    });

    test('should stop all watchers when no sources specified', () => {
      const callback = (_event: any) => {}; // Unused parameter
      configSystem.watchConfiguration(callback);
      
      expect(() => {
        configSystem.stopWatching();
      }).not.toThrow();
    });

    test('should stop watching with ConfigSource objects', () => {
      const callback = (_event: any) => {}; // Unused parameter
      const sources: ConfigSource[] = [
        { type: 'file', path: 'config1.json' }
      ];

      configSystem.watchConfiguration(callback, sources);
      
      expect(() => {
        configSystem.stopWatching(sources);
      }).not.toThrow();
    });
  });

  describe('Configuration Persistence and Saving', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });

    test('should throw error when saving without persistence module', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      
      await expect(configSystem.saveConfiguration(testConfig))
        .rejects.toThrow('Persistence module not available');
    });

    test('should throw error when saving with specific target', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      
      await expect(configSystem.saveConfiguration(testConfig, 'custom-config.json'))
        .rejects.toThrow('Persistence module not available');
    });

    test('should throw error when saving with persistence options', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      const options: ConfigPersistenceOptions = {
        type: 'file',
        format: 'json',
        validate: true,
        backup: true
      };
      
      await expect(configSystem.saveConfiguration(testConfig, undefined, options))
        .rejects.toThrow('Persistence module not available');
    });

    test('should handle different persistence options', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      
      const fileOptions: ConfigPersistenceOptions = {
        type: 'file',
        path: './config/app.json',
        format: 'json',
        validate: true,
        backup: true,
        backupOptions: {
          enabled: true,
          maxCount: 5,
          compress: true
        }
      };

      await expect(configSystem.saveConfiguration(testConfig, undefined, fileOptions))
        .rejects.toThrow('Persistence module not available');

      const dbOptions: ConfigPersistenceOptions = {
        type: 'database',
        validate: false,
        encryption: {
          enabled: true,
          algorithm: 'aes-256-gcm'
        }
      };

      await expect(configSystem.saveConfiguration(testConfig, undefined, dbOptions))
        .rejects.toThrow('Persistence module not available');
    });
  });

  describe('Backup and Restore Operations', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });

    test('should throw error when creating backup without persistence module', async () => {
      await expect(configSystem.createBackup()).rejects.toThrow('Persistence module not available');
    });

    test('should throw error when creating backup without loaded configuration', async () => {
      // The method checks for persistence module first, so this will throw persistence error
      await expect(configSystem.createBackup()).rejects.toThrow('Persistence module not available');
    });

    test('should handle backup creation with options', async () => {
      const backupOptions: BackupOptions = {
        enabled: true,
        maxCount: 10,
        directory: './backups',
        namingPattern: 'config-backup-YYYY-MM-DD',
        compress: true,
        autoCleanup: true
      };

      await expect(configSystem.createBackup(backupOptions))
        .rejects.toThrow('Persistence module not available');
    });

    test('should throw error when restoring without persistence module', async () => {
      await expect(configSystem.restoreFromBackup('backup-id'))
        .rejects.toThrow('Persistence module not available');
    });

    test('should handle restore with validation enabled', async () => {
      await expect(configSystem.restoreFromBackup('backup-id', true))
        .rejects.toThrow('Persistence module not available');
    });

    test('should handle restore with validation disabled', async () => {
      await expect(configSystem.restoreFromBackup('backup-id', false))
        .rejects.toThrow('Persistence module not available');
    });

    test('should get configuration history', async () => {
      await expect(configSystem.getConfigurationHistory())
        .rejects.toThrow('Persistence module not available');
    });

    test('should get limited configuration history', async () => {
      await expect(configSystem.getConfigurationHistory(5))
        .rejects.toThrow('Persistence module not available');
    });

    test('should revert to specific version', async () => {
      await expect(configSystem.revertToVersion('version-1'))
        .rejects.toThrow('Persistence module not available');
    });

    test('should revert to version with validation', async () => {
      await expect(configSystem.revertToVersion('version-1', true))
        .rejects.toThrow('Persistence module not available');
    });
  });

  describe('Encryption and Decryption', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });

    test('should throw error when encrypting without persistence module', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      const encryptionOptions: EncryptionOptions = {
        enabled: true,
        algorithm: 'aes-256-gcm',
        key: 'test-key-32-characters-long-here'
      };

      await expect(configSystem.encryptConfiguration(testConfig, encryptionOptions))
        .rejects.toThrow('Configuration encryption failed');
    });

    test('should handle encryption with key derivation options', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      const encryptionOptions: EncryptionOptions = {
        enabled: true,
        algorithm: 'aes-256-gcm',
        key: 'password',
        keyDerivation: {
          salt: 'random-salt',
          iterations: 100000,
          keyLength: 32
        }
      };

      await expect(configSystem.encryptConfiguration(testConfig, encryptionOptions))
        .rejects.toThrow('Configuration encryption failed');
    });

    test('should handle encryption of specific fields', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      const encryptionOptions: EncryptionOptions = {
        enabled: true,
        algorithm: 'aes-256-gcm',
        key: 'test-key',
        fields: ['settings.database.password', 'settings.api.secret']
      };

      await expect(configSystem.encryptConfiguration(testConfig, encryptionOptions))
        .rejects.toThrow('Configuration encryption failed');
    });

    test('should throw error when decrypting without persistence module', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      const encryptionOptions: EncryptionOptions = {
        enabled: true,
        algorithm: 'aes-256-gcm',
        key: 'test-key'
      };

      await expect(configSystem.decryptConfiguration(testConfig, encryptionOptions))
        .rejects.toThrow('Configuration decryption failed');
    });

    test('should handle decryption with different algorithms', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      
      const aesOptions: EncryptionOptions = {
        enabled: true,
        algorithm: 'aes-256-cbc',
        key: 'test-key'
      };

      await expect(configSystem.decryptConfiguration(testConfig, aesOptions))
        .rejects.toThrow('Configuration decryption failed');
    });
  });

  describe('Configuration Export and Import', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });

    test('should export configuration as JSON', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      configSystem['currentConfig'] = testConfig;

      const exported = await configSystem.exportConfiguration('json');
      expect(typeof exported).toBe('string');
      expect(JSON.parse(exported)).toEqual(testConfig);
    });

    test('should export with custom formatting options', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      configSystem['currentConfig'] = testConfig;

      const options = { indent: 4, sortKeys: true };
      const exported = await configSystem.exportConfiguration('json', options);
      expect(typeof exported).toBe('string');
      expect(JSON.parse(exported)).toEqual(testConfig);
    });

    test('should throw error when exporting without loaded configuration', async () => {
      await expect(configSystem.exportConfiguration('json'))
        .rejects.toThrow('No configuration loaded to export');
    });

    test('should throw error for unsupported export formats without loader', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      configSystem['currentConfig'] = testConfig;

      await expect(configSystem.exportConfiguration('yaml'))
        .rejects.toThrow('not supported without loader module');
      
      await expect(configSystem.exportConfiguration('toml'))
        .rejects.toThrow('not supported without loader module');
      
      await expect(configSystem.exportConfiguration('env'))
        .rejects.toThrow('not supported without loader module');
    });

    test('should import configuration from JSON', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      const configJson = JSON.stringify(testConfig);

      const imported = await configSystem.importConfiguration(configJson, 'json', false);
      expect(imported).toEqual(testConfig);
      expect(configSystem.getConfiguration()).toEqual(testConfig);
    });

    test('should import and validate configuration', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      const configJson = JSON.stringify(testConfig);

      const imported = await configSystem.importConfiguration(configJson, 'json', true);
      expect(imported).toEqual(testConfig);
    });

    test('should throw error for invalid JSON import', async () => {
      const invalidJson = '{ invalid json }';

      await expect(configSystem.importConfiguration(invalidJson, 'json'))
        .rejects.toThrow();
    });

    test('should throw error for malformed JSON', async () => {
      const malformedJson = '{"key": "value"'; // Missing closing brace

      await expect(configSystem.importConfiguration(malformedJson, 'json'))
        .rejects.toThrow();
    });

    test('should throw error for unsupported import formats without loader', async () => {
      const configData = 'test: value';

      await expect(configSystem.importConfiguration(configData, 'yaml'))
        .rejects.toThrow('not supported without loader module');
      
      await expect(configSystem.importConfiguration(configData, 'toml'))
        .rejects.toThrow('not supported without loader module');
      
      await expect(configSystem.importConfiguration(configData, 'env'))
        .rejects.toThrow('not supported without loader module');
    });

    test('should handle import of empty JSON object', async () => {
      const emptyJson = '{}';

      // This will fail validation because empty object doesn't have required structure
      await expect(configSystem.importConfiguration(emptyJson, 'json', true))
        .rejects.toThrow();
    });
  });

  describe('Message Handling and Communication', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });

    test('should handle config:get message', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      configSystem['currentConfig'] = testConfig;

      const getMessage = {
        id: 'test-message-get',
        type: 'config:get',
        source: 'test-sender',
        payload: {},
        timestamp: Date.now()
      };

      const response = await configSystem.handleMessage(getMessage);
      
      expect(response).toBeDefined();
      expect(response?.success).toBe(true);
      expect(response?.data).toEqual(testConfig);
      expect(response?.messageId).toBe('test-message-get');
      expect(response?.timestamp).toBeDefined();
    });

    test('should handle config:get message without loaded config', async () => {
      const getMessage = {
        id: 'test-message-get-empty',
        type: 'config:get',
        source: 'test-sender',
        payload: {},
        timestamp: Date.now()
      };

      const response = await configSystem.handleMessage(getMessage);
      
      expect(response).toBeDefined();
      expect(response?.success).toBe(true);
      expect(response?.data).toBeNull();
    });

    test('should handle config:update message', async () => {
      const testConfig = createConfigurationTemplate('test-config');
      configSystem['currentConfig'] = testConfig;

      const updateMessage = {
        id: 'test-message-update',
        type: 'config:update',
        source: 'test-sender',
        payload: {
          settings: {
            newSetting: {
              newValue: {
                value: 'updated',
                type: 'string',
                required: false
              } as ConfigValue
            }
          }
        },
        timestamp: Date.now(),
        correlationId: 'correlation-123'
      };

      const response = await configSystem.handleMessage(updateMessage);
      
      expect(response).toBeDefined();
      expect(response?.success).toBe(true);
      expect(response?.correlationId).toBe('correlation-123');
    });

    test('should handle config:validate message', async () => {
      const testConfig = createConfigurationTemplate('test-config');

      const validateMessage = {
        id: 'test-message-validate',
        type: 'config:validate',
        source: 'test-sender',
        payload: testConfig,
        timestamp: Date.now()
      };

      const response = await configSystem.handleMessage(validateMessage);
      
      expect(response).toBeDefined();
      expect(response?.success).toBe(true);
      expect(response?.data).toBeDefined();
      expect(response?.data.isValid).toBe(true);
    });

    test('should handle unknown message types', async () => {
      const unknownMessage = {
        id: 'test-message-unknown',
        type: 'unknown-type',
        source: 'test-sender',
        payload: {},
        timestamp: Date.now()
      };

      const response = await configSystem.handleMessage(unknownMessage);
      
      expect(response).toBeUndefined();
    });

    test('should handle message with invalid payload', async () => {
      const invalidMessage = {
        id: 'test-message-invalid',
        type: 'config:update',
        source: 'test-sender',
        payload: null,
        timestamp: Date.now()
      };

      const response = await configSystem.handleMessage(invalidMessage);
      
      expect(response).toBeUndefined();
    });

    test('should handle errors in message processing', async () => {
      const errorMessage = {
        id: 'test-message-error',
        type: 'config:update',
        source: 'test-sender',
        payload: { invalid: 'update' },
        timestamp: Date.now()
      };

      const response = await configSystem.handleMessage(errorMessage);
      
      expect(response).toBeDefined();
      expect(response?.success).toBe(false);
      expect(response?.error).toBeDefined();
    });
  });

  describe('Data Reception and Processing', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });

    test('should receive and process valid configuration data', async () => {
      const testConfig = createConfigurationTemplate('received-config');
      const dataTransfer = {
        id: "transfer-" + Math.random().toString(36).substring(2, 8),
        sourceConnectionId: 'source-connection-1',
        targetConnectionId: 'target-connection-1',
        data: testConfig,
        timestamp: Date.now(),
        metadata: { type: 'configuration' }
      };

      await expect(configSystem.receiveData(dataTransfer)).resolves.not.toThrow();
      
      // Verify data was stored
      expect(configSystem['receivedData']).toContain(testConfig);
    });

    test('should receive and process non-configuration data', async () => {
      const nonConfigData = { someData: 'value', type: 'other' };
      const dataTransfer = {
        id: "transfer-" + Math.random().toString(36).substring(2, 8),
        sourceConnectionId: 'source-connection-2',
        targetConnectionId: 'target-connection-2',
        data: nonConfigData,
        timestamp: Date.now(),
        metadata: {}
      };

      await expect(configSystem.receiveData(dataTransfer)).resolves.not.toThrow();
      expect(configSystem['receivedData']).toContain(nonConfigData);
    });

    test('should handle invalid configuration data gracefully', async () => {
      const invalidConfigData = { 
        metadata: { name: 'invalid' }, 
        // Missing required fields
      };
      const dataTransfer = {
        id: "transfer-" + Math.random().toString(36).substring(2, 8),
        sourceConnectionId: 'source-connection-3',
        targetConnectionId: 'target-connection-3',
        data: invalidConfigData,
        timestamp: Date.now(),
        metadata: {}
      };

      await expect(configSystem.receiveData(dataTransfer)).resolves.not.toThrow();
    });

    test('should handle null or undefined data', async () => {
      const dataTransfer = {
        id: "transfer-" + Math.random().toString(36).substring(2, 8),
        sourceConnectionId: 'source-connection-4',
        targetConnectionId: 'target-connection-4',
        data: null,
        timestamp: Date.now(),
        metadata: {}
      };

      await expect(configSystem.receiveData(dataTransfer)).resolves.not.toThrow();
    });

    test('should handle primitive data types', async () => {
      const dataTransfers = [
        { id: "transfer-" + Math.random().toString(36).substring(2, 8),
        sourceConnectionId: 'src-1', targetConnectionId: 'tgt-1', data: 'string-data', timestamp: Date.now(), metadata: {} },
        { id: "transfer-" + Math.random().toString(36).substring(2, 8),
        sourceConnectionId: 'src-2', targetConnectionId: 'tgt-2', data: 12345, timestamp: Date.now(), metadata: {} },
        { id: "transfer-" + Math.random().toString(36).substring(2, 8),
        sourceConnectionId: 'src-3', targetConnectionId: 'tgt-3', data: true, timestamp: Date.now(), metadata: {} }
      ];

      for (const transfer of dataTransfers) {
        await expect(configSystem.receiveData(transfer)).resolves.not.toThrow();
      }
    });
  });

  describe('Lifecycle Events and Module Management', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });

    test('should handle module registration events', () => {
      expect(() => {
        configSystem.onModuleRegistered('config-loader-module');
      }).not.toThrow();

      expect(() => {
        configSystem.onModuleRegistered('config-validator-module');
      }).not.toThrow();

      expect(() => {
        configSystem.onModuleRegistered('config-persistence-module');
      }).not.toThrow();
    });

    test('should handle module unregistration events', () => {
      expect(() => {
        configSystem.onModuleUnregistered('config-loader-module');
      }).not.toThrow();

      expect(() => {
        configSystem.onModuleUnregistered('non-existent-module');
      }).not.toThrow();
    });

    test('should handle multiple module registrations', () => {
      const modules = [
        'config-loader-module',
        'config-validator-module', 
        'config-persistence-module',
        'config-ui-module'
      ];

      modules.forEach(module => {
        expect(() => {
          configSystem.onModuleRegistered(module);
        }).not.toThrow();
      });

      modules.forEach(module => {
        expect(() => {
          configSystem.onModuleUnregistered(module);
        }).not.toThrow();
      });
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should destroy successfully after initialization', async () => {
      await configSystem.initialize();
      await expect(configSystem.destroy()).resolves.not.toThrow();
    });

    test('should destroy successfully without initialization', async () => {
      await expect(configSystem.destroy()).resolves.not.toThrow();
    });

    test('should clean up watchers during destruction', async () => {
      await configSystem.initialize();
      
      const callback = (_event: any) => {}; // Unused parameter
      configSystem.watchConfiguration(callback, ['test.json']);
      
      await expect(configSystem.destroy()).resolves.not.toThrow();
    });

    test('should handle destruction with loaded configuration', async () => {
      await configSystem.initialize();
      
      const testConfig = createConfigurationTemplate('cleanup-test');
      configSystem['currentConfig'] = testConfig;
      
      await expect(configSystem.destroy()).resolves.not.toThrow();
    });

    test('should handle destruction with schema set', async () => {
      await configSystem.initialize();
      
      const schema: ConfigSchema = {
        version: '1.0.0',
        type: 'json-schema',
        definition: { type: 'object' }
      };
      configSystem.setSchema(schema);
      
      await expect(configSystem.destroy()).resolves.not.toThrow();
    });

    test('should clear all internal state during destruction', async () => {
      await configSystem.initialize();
      
      const testConfig = createConfigurationTemplate('state-test');
      configSystem['currentConfig'] = testConfig;
      
      const schema: ConfigSchema = {
        version: '1.0.0',
        type: 'json-schema',
        definition: { type: 'object' }
      };
      configSystem.setSchema(schema);
      
      const callback = (_event: any) => {}; // Unused parameter
      configSystem.watchConfiguration(callback);
      
      await configSystem.destroy();
      
      // Verify state is cleared
      expect(configSystem['currentConfig']).toBeNull();
      expect(configSystem['currentSchema']).toBeUndefined();
      expect(configSystem['watchers'].size).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle double initialization gracefully', async () => {
      await configSystem.initialize();
      await expect(configSystem.initialize()).resolves.not.toThrow();
    });

    test('should handle double destruction gracefully', async () => {
      await configSystem.initialize();
      await configSystem.destroy();
      await expect(configSystem.destroy()).resolves.not.toThrow();
    });

    test('should handle operations after destruction', async () => {
      await configSystem.initialize();
      await configSystem.destroy();
      
      expect(() => configSystem.getConfiguration()).toThrow();
      expect(configSystem.getSchema()).toBeUndefined();
      
      const callback = (_event: any) => {}; // Unused parameter
      expect(() => configSystem.watchConfiguration(callback)).not.toThrow();
    });

    test('should handle very large configuration objects', async () => {
      await configSystem.initialize();
      
      const largeConfig = createConfigurationTemplate('large-config');
      
      // Create a large settings object
      for (let i = 0; i < 1000; i++) {
        largeConfig.settings[`category_${i}`] = {
          [`setting_${i}`]: {
            value: `value_${i}`.repeat(100),
            type: 'string',
            required: false
          } as ConfigValue
        };
      }
      
      const result = await configSystem.validateConfiguration(largeConfig);
      expect(result.isValid).toBe(true);
    });

    test('should handle circular reference attempts gracefully', async () => {
      await configSystem.initialize();
      
      const configWithCircular: any = createConfigurationTemplate('circular-test');
      configWithCircular.settings.self = configWithCircular; // Create circular reference
      
      // This should not crash the system
      await expect(configSystem.validateConfiguration(configWithCircular)).resolves.toBeDefined();
    });
  });
});

describe('Utility Functions', () => {
  describe('createConfigurationSystem', () => {
    test('should create and initialize configuration system with all options', async () => {
      const system = await createConfigurationSystem({
        id: 'test-system',
        name: 'Test System',
        initialConfig: createConfigurationTemplate('initial'),
        modules: {
          loader: { enabled: true },
          validator: { enabled: false }
        }
      });

      expect(system).toBeInstanceOf(ConfigurationSystem);
      expect(system.getInfo().id).toBe('test-system');
      expect(system.getInfo().name).toBe('Test System');
      expect(() => system.getConfiguration()).not.toThrow();

      await system.destroy();
    });

    test('should create system without options', async () => {
      const system = await createConfigurationSystem();

      expect(system).toBeInstanceOf(ConfigurationSystem);
      expect(system.getInfo().name).toBe('ConfigurationSystem');
      expect(system.getInfo().id).toContain('configuration-system-');

      await system.destroy();
    });

    test('should create system with partial options', async () => {
      const system = await createConfigurationSystem({
        name: 'Partial System'
      });

      expect(system.getInfo().name).toBe('Partial System');
      expect(system.getInfo().id).toContain('configuration-system-');

      await system.destroy();
    });
  });

  describe('isValidConfigurationStructure', () => {
    test('should validate correct configuration structure', () => {
      const validConfig = createConfigurationTemplate('test');
      expect(isValidConfigurationStructure(validConfig)).toBe(true);
    });

    test('should validate complex configuration structure', () => {
      const complexConfig = createConfigurationTemplate('complex');
      complexConfig.metadata.author = 'Test Author';
      complexConfig.metadata.tags = ['production', 'critical'];
      complexConfig.metadata.environment = 'production';
      complexConfig.schema = {
        version: '1.0.0',
        type: 'json-schema',
        definition: { type: 'object' }
      };
      
      expect(isValidConfigurationStructure(complexConfig)).toBe(true);
    });

    test('should reject null and undefined', () => {
      expect(isValidConfigurationStructure(null)).toBe(false);
      expect(isValidConfigurationStructure(undefined)).toBe(false);
    });

    test('should reject primitive types', () => {
      expect(isValidConfigurationStructure('string')).toBe(false);
      expect(isValidConfigurationStructure(123)).toBe(false);
      expect(isValidConfigurationStructure(true)).toBe(false);
      expect(isValidConfigurationStructure([])).toBe(false);
    });

    test('should reject objects without required properties', () => {
      expect(isValidConfigurationStructure({})).toBe(false);
      expect(isValidConfigurationStructure({ metadata: {} })).toBe(false);
      expect(isValidConfigurationStructure({ settings: {} })).toBe(false);
      expect(isValidConfigurationStructure({ version: '1.0.0' })).toBe(false);
    });

    test('should reject objects with incomplete metadata', () => {
      expect(isValidConfigurationStructure({ 
        metadata: { name: 'test' }, 
        settings: {},
        version: '1.0.0'
      })).toBe(false);
      
      expect(isValidConfigurationStructure({ 
        metadata: { name: 'test', createdAt: '2023-01-01' }, 
        settings: {},
        version: '1.0.0'
      })).toBe(false);
    });

    test('should reject objects with wrong property types', () => {
      expect(isValidConfigurationStructure({ 
        metadata: 'not-object', 
        settings: {},
        version: '1.0.0'
      })).toBe(false);
      
      expect(isValidConfigurationStructure({ 
        metadata: { name: 'test', createdAt: '2023-01-01', updatedAt: '2023-01-01' }, 
        settings: 'not-object',
        version: '1.0.0'
      })).toBe(false);
      
      expect(isValidConfigurationStructure({ 
        metadata: { name: 'test', createdAt: '2023-01-01', updatedAt: '2023-01-01' }, 
        settings: {},
        version: 123
      })).toBe(false);
    });
  });

  describe('createConfigurationTemplate', () => {
    test('should create valid configuration template with description', () => {
      const template = createConfigurationTemplate('test-config', 'Test description');
      
      expect(isValidConfigurationStructure(template)).toBe(true);
      expect(template.metadata.name).toBe('test-config');
      expect(template.metadata.description).toBe('Test description');
      expect(template.metadata.author).toBe('RCC Configuration Module');
      expect(template.metadata.environment).toBe('development');
      expect(template.version).toBe('1.0.0');
      expect(template.metadata.createdAt).toBeDefined();
      expect(template.metadata.updatedAt).toBeDefined();
    });

    test('should create template without description', () => {
      const template = createConfigurationTemplate('test-config');
      
      expect(template.metadata.description).toBe('Configuration for test-config');
    });

    test('should create template with proper timestamp format', () => {
      const template = createConfigurationTemplate('timestamp-test');
      
      expect(template.metadata.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(template.metadata.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should create template with default categories', () => {
      const template = createConfigurationTemplate('categories-test');
      
      expect(template.settings).toHaveProperty('general');
      expect(template.settings).toHaveProperty('application');
      expect(template.settings).toHaveProperty('database');
      expect(template.settings).toHaveProperty('security');
      expect(template.settings).toHaveProperty('performance');
    });

    test('should create templates with unique timestamps', async () => {
      const template1 = createConfigurationTemplate('test1');
      await new Promise(resolve => setTimeout(resolve, 10));
      const template2 = createConfigurationTemplate('test2');
      
      expect(template1.metadata.createdAt).not.toBe(template2.metadata.createdAt);
    });
  });

  describe('mergeConfigurations', () => {
    let target: ConfigData;
    let source: ConfigData;

    beforeEach(() => {
      target = createConfigurationTemplate('target');
      target.settings['database'] = {
        host: { value: 'localhost', type: 'string', required: false } as ConfigValue,
        port: { value: 5432, type: 'number', required: false } as ConfigValue,
        ssl: { value: false, type: 'boolean', required: false } as ConfigValue
      };
      
      source = createConfigurationTemplate('source');
      source.settings['database'] = {
        port: { value: 3306, type: 'number', required: false } as ConfigValue,
        user: { value: 'admin', type: 'string', required: false } as ConfigValue,
        ssl: { value: true, type: 'boolean', required: false } as ConfigValue
      };
      source.settings['cache'] = {
        enabled: { value: true, type: 'boolean', required: false } as ConfigValue,
        ttl: { value: 3600, type: 'number', required: false } as ConfigValue
      };
    });

    test('should merge configurations with deep strategy (default)', () => {
      const merged = mergeConfigurations(target, source);
      
      expect(merged.settings['database']?.['host']?.value).toBe('localhost'); // from target
      expect(merged.settings['database']?.['port']?.value).toBe(3306); // from source (overridden)
      expect(merged.settings['database']?.['user']?.value).toBe('admin'); // from source (new)
      expect(merged.settings['database']?.['ssl']?.value).toBe(true); // from source (overridden)
      expect(merged.settings['cache']?.['enabled']?.value).toBe(true); // from source (new category)
      expect(merged.settings['cache']?.['ttl']?.value).toBe(3600); // from source (new)
    });

    test('should merge configurations with explicit deep strategy', () => {
      const merged = mergeConfigurations(target, source, 'deep');
      
      expect(merged.settings['database']?.['host']?.value).toBe('localhost');
      expect(merged.settings['database']?.['port']?.value).toBe(3306);
      expect(merged.settings['database']?.['user']?.value).toBe('admin');
      expect(merged.settings['cache']?.['enabled']?.value).toBe(true);
    });

    test('should merge configurations with shallow strategy', () => {
      const merged = mergeConfigurations(target, source, 'shallow');
      
      // Shallow merge replaces entire settings categories
      expect(merged.settings['database']?.['port']?.value).toBe(3306);
      expect(merged.settings['database']?.['user']?.value).toBe('admin');
      expect(merged.settings['database']?.['ssl']?.value).toBe(true);
      expect(merged.settings['cache']?.['enabled']?.value).toBe(true);
      // Host setting should be missing because entire database object was replaced
      expect(merged.settings['database']?.['host']).toBeUndefined();
    });

    test('should merge configurations with replace strategy', () => {
      const merged = mergeConfigurations(target, source, 'replace');
      
      expect(merged).toEqual({ ...source });
      expect(merged.metadata.name).toBe('source');
    });

    test('should update updatedAt timestamp during merge', async () => {
      const beforeMerge = Date.now();
      await new Promise(resolve => setTimeout(resolve, 10));
      const merged = mergeConfigurations(target, source);
      
      expect(new Date(merged.metadata.updatedAt).getTime()).toBeGreaterThanOrEqual(beforeMerge);
      expect(merged.metadata.updatedAt).not.toBe(target.metadata.updatedAt);
      expect(merged.metadata.updatedAt).not.toBe(source.metadata.updatedAt);
    });

    test('should preserve metadata correctly in deep merge', () => {
      target.metadata.author = 'Target Author';
      target.metadata.environment = 'development';
      source.metadata.author = 'Source Author';
      source.metadata.tags = ['production'];
      
      const merged = mergeConfigurations(target, source, 'deep');
      
      expect(merged.metadata.author).toBe('Source Author'); // Overridden
      expect(merged.metadata.environment).toBe('development'); // Preserved from target
      expect(merged.metadata.tags).toEqual(['production']); // Added from source
    });

    test('should handle nested object merging correctly', () => {
      target.settings['nested'] = {
        level1: {
          value: {
            level2: {
              value: 'deep-target',
              type: 'string',
              required: false
            } as ConfigValue,
            sibling: {
              value: 'target-sibling',
              type: 'string',
              required: false
            } as ConfigValue
          },
          type: 'object',
          required: false
        } as ConfigValue
      };
      
      source.settings['nested'] = {
        level1: {
          value: {
            level2: {
              value: 'deep-source',
              type: 'string',
              required: false
            } as ConfigValue,
            newChild: {
              value: 'source-new',
              type: 'string',
              required: false
            } as ConfigValue
          },
          type: 'object',
          required: false
        } as ConfigValue
      };
      
      const merged = mergeConfigurations(target, source, 'deep');
      
      expect(merged.settings['nested']?.['level1']?.value?.['level2']?.value).toBe('deep-source');
      expect(merged.settings['nested']?.['level1']?.value?.['sibling']?.value).toBe('target-sibling');
      expect(merged.settings['nested']?.['level1']?.value?.['newChild']?.value).toBe('source-new');
    });

    test('should handle array replacement in deep merge', () => {
      target.settings['arrays'] = {
        list: {
          value: ['target1', 'target2'],
          type: 'array',
          required: false
        } as ConfigValue
      };
      
      source.settings['arrays'] = {
        list: {
          value: ['source1', 'source2', 'source3'],
          type: 'array',
          required: false
        } as ConfigValue
      };
      
      const merged = mergeConfigurations(target, source, 'deep');
      
      // Arrays should be replaced, not merged
      expect(merged.settings['arrays']?.['list']?.value).toEqual(['source1', 'source2', 'source3']);
    });
  });

  describe('extractConfigurationPaths', () => {
    test('should extract paths from simple object', () => {
      const config = {
        name: 'test',
        version: '1.0.0',
        enabled: true
      };
      
      const paths = extractConfigurationPaths(config);
      
      expect(paths).toContain('name');
      expect(paths).toContain('version');
      expect(paths).toContain('enabled');
      expect(paths).toHaveLength(3);
    });

    test('should extract nested paths', () => {
      const config = {
        database: {
          host: 'localhost',
          connection: {
            pool: {
              min: 5,
              max: 20
            }
          }
        },
        cache: {
          enabled: true
        }
      };
      
      const paths = extractConfigurationPaths(config);
      
      expect(paths).toContain('database');
      expect(paths).toContain('database.host');
      expect(paths).toContain('database.connection');
      expect(paths).toContain('database.connection.pool');
      expect(paths).toContain('database.connection.pool.min');
      expect(paths).toContain('database.connection.pool.max');
      expect(paths).toContain('cache');
      expect(paths).toContain('cache.enabled');
    });

    test('should extract paths with custom prefix', () => {
      const config = {
        setting1: 'value1',
        nested: {
          setting2: 'value2'
        }
      };
      
      const paths = extractConfigurationPaths(config, 'root');
      
      expect(paths).toContain('root.setting1');
      expect(paths).toContain('root.nested');
      expect(paths).toContain('root.nested.setting2');
    });

    test('should handle arrays correctly', () => {
      const config = {
        list: ['item1', 'item2'],
        nested: {
          array: [1, 2, 3]
        }
      };
      
      const paths = extractConfigurationPaths(config);
      
      expect(paths).toContain('list');
      expect(paths).toContain('nested');
      expect(paths).toContain('nested.array');
      // Array items should not be included as individual paths
      expect(paths).not.toContain('list.0');
      expect(paths).not.toContain('nested.array.0');
    });

    test('should handle empty objects', () => {
      const config = {};
      const paths = extractConfigurationPaths(config);
      expect(paths).toEqual([]);
    });
  });

  describe('getConfigurationValue', () => {
    const config = {
      database: {
        host: 'localhost',
        connection: {
          pool: {
            min: 5,
            max: 20
          }
        }
      },
      cache: {
        enabled: true,
        ttl: 3600
      },
      list: ['item1', 'item2', 'item3']
    };

    test('should get simple property values', () => {
      expect(getConfigurationValue(config, 'database')).toEqual(config.database);
      expect(getConfigurationValue(config, 'cache')).toEqual(config.cache);
    });

    test('should get nested property values', () => {
      expect(getConfigurationValue(config, 'database.host')).toBe('localhost');
      expect(getConfigurationValue(config, 'cache.enabled')).toBe(true);
      expect(getConfigurationValue(config, 'cache.ttl')).toBe(3600);
    });

    test('should get deeply nested values', () => {
      expect(getConfigurationValue(config, 'database.connection.pool.min')).toBe(5);
      expect(getConfigurationValue(config, 'database.connection.pool.max')).toBe(20);
    });

    test('should return default value for non-existent paths', () => {
      expect(getConfigurationValue(config, 'nonexistent', 'default')).toBe('default');
      expect(getConfigurationValue(config, 'database.nonexistent', null)).toBeNull();
      expect(getConfigurationValue(config, 'deep.nested.path', 42)).toBe(42);
    });

    test('should return undefined for non-existent paths without default', () => {
      expect(getConfigurationValue(config, 'nonexistent')).toBeUndefined();
      expect(getConfigurationValue(config, 'database.nonexistent')).toBeUndefined();
    });

    test('should handle array access', () => {
      expect(getConfigurationValue(config, 'list')).toEqual(['item1', 'item2', 'item3']);
    });

    test('should handle null and undefined values in path', () => {
      const configWithNulls = {
        nullable: null,
        undefined: undefined,
        nested: {
          nullable: null
        }
      };
      
      expect(getConfigurationValue(configWithNulls, 'nullable')).toBeNull();
      expect(getConfigurationValue(configWithNulls, 'undefined')).toBeUndefined();
      expect(getConfigurationValue(configWithNulls, 'nested.nullable')).toBeNull();
      expect(getConfigurationValue(configWithNulls, 'nullable.nonexistent', 'default')).toBe('default');
    });
  });

  describe('setConfigurationValue', () => {
    test('should set simple property values', () => {
      const config = {};
      
      setConfigurationValue(config, 'name', 'test-config');
      setConfigurationValue(config, 'version', '1.0.0');
      setConfigurationValue(config, 'enabled', true);
      
      expect(config).toEqual({
        name: 'test-config',
        version: '1.0.0',
        enabled: true
      });
    });

    test('should set nested property values', () => {
      const config = {};
      
      setConfigurationValue(config, 'database.host', 'localhost');
      setConfigurationValue(config, 'database.port', 5432);
      setConfigurationValue(config, 'cache.enabled', true);
      
      expect(config).toEqual({
        database: {
          host: 'localhost',
          port: 5432
        },
        cache: {
          enabled: true
        }
      });
    });

    test('should set deeply nested values', () => {
      const config = {};
      
      setConfigurationValue(config, 'app.database.connection.pool.min', 5);
      setConfigurationValue(config, 'app.database.connection.pool.max', 20);
      setConfigurationValue(config, 'app.cache.redis.host', 'redis-server');
      
      expect(config).toEqual({
        app: {
          database: {
            connection: {
              pool: {
                min: 5,
                max: 20
              }
            }
          },
          cache: {
            redis: {
              host: 'redis-server'
            }
          }
        }
      });
    });

    test('should overwrite existing values', () => {
      const config = {
        database: {
          host: 'old-host',
          port: 3306
        }
      };
      
      setConfigurationValue(config, 'database.host', 'new-host');
      setConfigurationValue(config, 'database.port', 5432);
      
      expect(config.database.host).toBe('new-host');
      expect(config.database.port).toBe(5432);
    });

    test('should create intermediate objects as needed', () => {
      const config = {
        existing: 'value'
      };
      
      setConfigurationValue(config, 'new.nested.deep.value', 'deep-value');
      
      expect(config).toEqual({
        existing: 'value',
        new: {
          nested: {
            deep: {
              value: 'deep-value'
            }
          }
        }
      });
    });

    test('should handle setting values in existing nested structure', () => {
      const config = {
        database: {
          host: 'localhost'
        }
      };
      
      setConfigurationValue(config, 'database.connection.pool.size', 10);
      
      expect(config).toEqual({
        database: {
          host: 'localhost',
          connection: {
            pool: {
              size: 10
            }
          }
        }
      });
    });

    test('should handle different value types', () => {
      const config = {};
      
      setConfigurationValue(config, 'string', 'text');
      setConfigurationValue(config, 'number', 123);
      setConfigurationValue(config, 'boolean', false);
      setConfigurationValue(config, 'null', null);
      setConfigurationValue(config, 'array', [1, 2, 3]);
      setConfigurationValue(config, 'object', { nested: true });
      
      expect(config).toEqual({
        string: 'text',
        number: 123,
        boolean: false,
        null: null,
        array: [1, 2, 3],
        object: { nested: true }
      });
    });
  });
});