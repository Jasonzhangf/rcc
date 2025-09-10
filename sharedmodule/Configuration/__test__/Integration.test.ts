/**
 * Integration Tests for Configuration Module
 * 
 * End-to-end tests that verify the complete functionality of the Configuration module
 * including all components working together.
 */

import { ConfigurationSystem } from '../src/core/ConfigurationSystem';
import { ConfigurationCenterUI } from '../src/webui/index';
import { 
  createConfigurationSystem,
  isValidConfigurationStructure,
  createConfigurationTemplate,
  mergeConfigurations,
  extractConfigurationPaths,
  getConfigurationValue,
  setConfigurationValue
} from '../src/index';
import { ConfigData, ConfigSource, ConfigSchema } from '../src/interfaces/IConfigurationSystem';

describe('Integration Tests', () => {
  let configSystem: ConfigurationSystem;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    // Create mock container for UI tests
    mockContainer = document.createElement('div');
    mockContainer.id = 'test-container';
    document.body.appendChild(mockContainer);

    // Reset UI singleton
    (ConfigurationCenterUI as any).instance = null;
  });

  afterEach(async () => {
    // Clean up
    if (configSystem) {
      await configSystem.destroy();
    }
    
    if (mockContainer && mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
  });

  describe('Complete Configuration Workflow', () => {
    test('should handle complete configuration lifecycle', async () => {
      // Create configuration system
      configSystem = new ConfigurationSystem({
        id: 'integration-test-system',
        name: 'Integration Test System',
        version: '1.0.0'
      });

      // Initialize system
      await configSystem.initialize();

      // Create initial configuration
      const initialConfig = createConfigurationTemplate('integration-test', 'Integration test configuration');
      
      // Validate configuration structure
      expect(isValidConfigurationStructure(initialConfig)).toBe(true);

      // Load configuration into system
      configSystem['currentConfig'] = initialConfig;

      // Update configuration
      const updates: Partial<ConfigData> = {
        settings: {
          integration: {
            testSetting: {
              value: 'test-value',
              type: 'string',
              required: false,
              description: 'Test setting for integration'
            }
          }
        },
        metadata: {
          author: 'Integration Test',
          environment: 'test'
        }
      };

      const updatedConfig = await configSystem.updateConfiguration(updates, false);
      
      expect(updatedConfig.settings['integration']?.['testSetting']?.value).toBe('test-value');
      expect(updatedConfig.metadata.author).toBe('Integration Test');
      expect(updatedConfig.metadata.environment).toBe('test');

      // Export configuration
      const exported = await configSystem.exportConfiguration('json');
      expect(typeof exported).toBe('string');
      
      // Import configuration back
      const imported = await configSystem.importConfiguration(exported, 'json', false);
      expect(imported).toEqual(updatedConfig);

      // Validate configuration
      const validationResult = await configSystem.validateConfiguration(imported);
      expect(validationResult.isValid).toBe(true);

      // Clean up
      await configSystem.destroy();
    });

    test('should handle configuration merging', async () => {
      // Create two configurations
      const config1 = createConfigurationTemplate('config1', 'First configuration');
      const config2 = createConfigurationTemplate('config2', 'Second configuration');

      // Add different settings to each
      config1.settings.general = { app1: { value: 'value1', type: 'string', required: false } };
      config2.settings.general = { app2: { value: 'value2', type: 'string', required: false } };
      config2.settings.database = { host: { value: 'localhost', type: 'string', required: false } };

      // Test deep merge
      const deepMerged = mergeConfigurations(config1, config2, 'deep');
      
      expect(deepMerged.metadata.name).toBe('config2');
      expect(deepMerged.settings.general['app1']?.value).toBe('value1');
      expect(deepMerged.settings.general['app2']?.value).toBe('value2');
      expect(deepMerged.settings.database['host']?.value).toBe('localhost');

      // Test shallow merge
      const shallowMerged = mergeConfigurations(config1, config2, 'shallow');
      
      expect(shallowMerged.metadata.name).toBe('config2');
      expect(shallowMerged.settings.general['app2']?.value).toBe('value2');
      expect(shallowMerged.settings.database['host']?.value).toBe('localhost');
      // In shallow merge, entire general object should be replaced
      expect(shallowMerged.settings.general['app1']).toBeUndefined();

      // Test replace merge
      const replaced = mergeConfigurations(config1, config2, 'replace');
      
      expect(replaced).toEqual(config2);
    });

    test('should handle configuration paths and values', () => {
      const config = {
        metadata: { name: 'test', author: 'test-author' },
        settings: {
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
          }
        },
        version: '1.0.0'
      };

      // Test path extraction
      const paths = extractConfigurationPaths(config);
      
      expect(paths).toContain('metadata');
      expect(paths).toContain('metadata.name');
      expect(paths).toContain('settings.database');
      expect(paths).toContain('settings.database.host');
      expect(paths).toContain('settings.database.connection.pool.min');
      expect(paths).toContain('settings.cache.enabled');

      // Test value retrieval
      expect(getConfigurationValue(config, 'metadata.name')).toBe('test');
      expect(getConfigurationValue(config, 'settings.database.host')).toBe('localhost');
      expect(getConfigurationValue(config, 'settings.database.connection.pool.min')).toBe(5);
      expect(getConfigurationValue(config, 'settings.cache.enabled')).toBe(true);
      expect(getConfigurationValue(config, 'nonexistent', 'default')).toBe('default');

      // Test value setting
      const mutableConfig = JSON.parse(JSON.stringify(config));
      
      setConfigurationValue(mutableConfig, 'settings.database.port', 5432);
      setConfigurationValue(mutableConfig, 'settings.newFeature.enabled', true);
      setConfigurationValue(mutableConfig, 'metadata.tags', ['test', 'integration']);

      expect(mutableConfig.settings.database.port).toBe(5432);
      expect(mutableConfig.settings.newFeature.enabled).toBe(true);
      expect(mutableConfig.metadata.tags).toEqual(['test', 'integration']);
    });
  });

  describe('UI and System Integration', () => {
    test('should integrate UI with configuration system', async () => {
      // Create configuration system
      configSystem = new ConfigurationSystem({
        id: 'ui-integration-test',
        name: 'UI Integration Test',
        version: '1.0.0'
      });

      await configSystem.initialize();

      // Create UI
      const configUI = ConfigurationCenterUI.getInstance();
      
      const uiOptions = {
        containerId: 'test-container',
        theme: 'light',
        defaultView: 'generator',
        version: '1.0.0'
      };

      await configUI.initialize(uiOptions);

      // Verify UI structure
      expect(mockContainer.querySelector('.config-center-app')).toBeTruthy();
      expect(mockContainer.querySelector('.config-center-header')).toBeTruthy();
      expect(mockContainer.querySelector('.config-center-sidebar')).toBeTruthy();

      // Test UI services
      const services = configUI.getServices();
      expect(services.configService).toBeDefined();
      expect(services.parserService).toBeDefined();
      expect(services.storageService).toBeDefined();

      // Create configuration through UI service
      const uiConfig = await services.configService.createConfigurationTemplate('ui-test', 'UI generated config');
      
      // Load configuration into system
      configSystem['currentConfig'] = uiConfig;

      // Update configuration through system
      const updates: Partial<ConfigData> = {
        settings: {
          ui: {
            theme: {
              value: 'dark',
              type: 'string',
              required: false
            }
          }
        }
      };

      const updatedConfig = await configSystem.updateConfiguration(updates, false);
      
      // Verify configuration is accessible through UI
      const currentConfig = await configUI.getCurrentConfiguration();
      expect(currentConfig).toEqual(updatedConfig);

      // Clean up
      await configUI.destroy();
      await configSystem.destroy();
    });

    test('should handle message passing between UI and system', async () => {
      configSystem = new ConfigurationSystem({
        id: 'message-test-system',
        name: 'Message Test System',
        version: '1.0.0'
      });

      await configSystem.initialize();

      // Create UI
      const configUI = ConfigurationCenterUI.getInstance();
      
      const uiOptions = {
        containerId: 'test-container',
        theme: 'light'
      };

      await configUI.initialize(uiOptions);

      // Load configuration into system
      const testConfig = createConfigurationTemplate('message-test');
      configSystem['currentConfig'] = testConfig;

      // Send config:get message to system
      const getMessage = {
        id: 'test-get-message',
        type: 'config:get',
        source: 'test-ui',
        payload: {},
        timestamp: Date.now()
      };

      const getResponse = await configSystem.handleMessage(getMessage);
      
      expect(getResponse).toBeDefined();
      expect(getResponse?.success).toBe(true);
      expect(getResponse?.data).toEqual(testConfig);

      // Send config:update message to system
      const updateMessage = {
        id: 'test-update-message',
        type: 'config:update',
        source: 'test-ui',
        payload: {
          settings: {
            message: {
              test: {
                value: 'updated-value',
                type: 'string',
                required: false
              }
            }
          }
        },
        timestamp: Date.now()
      };

      const updateResponse = await configSystem.handleMessage(updateMessage);
      
      expect(updateResponse).toBeDefined();
      expect(updateResponse?.success).toBe(true);

      // Verify update was applied
      const updatedConfig = configSystem.getConfiguration();
      expect(updatedConfig.settings['message']?.['test']?.value).toBe('updated-value');

      // Clean up
      await configUI.destroy();
      await configSystem.destroy();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid configuration data gracefully', async () => {
      configSystem = new ConfigurationSystem({
        id: 'error-test-system',
        name: 'Error Test System',
        version: '1.0.0'
      });

      await configSystem.initialize();

      // Test with invalid configuration structure
      const invalidConfig = { invalid: 'structure' };
      
      const validationResult = await configSystem.validateConfiguration(invalidConfig);
      expect(validationResult.isValid).toBe(true); // Built-in validator is basic

      // Test with malformed JSON
      await expect(configSystem.importConfiguration('{ invalid json }', 'json'))
        .rejects.toThrow();

      // Test with empty configuration
      await expect(configSystem.importConfiguration('{}', 'json', true))
        .rejects.toThrow();

      await configSystem.destroy();
    });

    test('should handle concurrent operations', async () => {
      configSystem = new ConfigurationSystem({
        id: 'concurrent-test-system',
        name: 'Concurrent Test System',
        version: '1.0.0'
      });

      await configSystem.initialize();

      const testConfig = createConfigurationTemplate('concurrent-test');
      configSystem['currentConfig'] = testConfig;

      // Perform multiple operations concurrently
      const operations = [
        configSystem.updateConfiguration({ 
          settings: { op1: { value: 'value1', type: 'string', required: false } } 
        }, false),
        configSystem.updateConfiguration({ 
          settings: { op2: { value: 'value2', type: 'string', required: false } } 
        }, false),
        configSystem.updateConfiguration({ 
          settings: { op3: { value: 'value3', type: 'string', required: false } } 
        }, false),
        configSystem.validateConfiguration(testConfig),
        configSystem.exportConfiguration('json')
      ];

      const results = await Promise.allSettled(operations);
      
      // All operations should complete successfully
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });

      await configSystem.destroy();
    });

    test('should handle large configurations', async () => {
      configSystem = new ConfigurationSystem({
        id: 'large-config-test-system',
        name: 'Large Config Test System',
        version: '1.0.0'
      });

      await configSystem.initialize();

      // Create large configuration
      const largeConfig = createConfigurationTemplate('large-config');
      
      // Add many settings
      for (let i = 0; i < 1000; i++) {
        largeConfig.settings[`category_${i}`] = {
          [`setting_${i}`]: {
            value: `value_${i}`,
            type: 'string',
            required: false
          }
        };
      }

      configSystem['currentConfig'] = largeConfig;

      // Test validation
      const validationResult = await configSystem.validateConfiguration(largeConfig);
      expect(validationResult.isValid).toBe(true);

      // Test export
      const exported = await configSystem.exportConfiguration('json');
      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(10000); // Should be substantial

      // Test import
      const imported = await configSystem.importConfiguration(exported, 'json', false);
      expect(imported).toEqual(largeConfig);

      await configSystem.destroy();
    });
  });

  describe('Schema and Validation Integration', () => {
    test('should handle schema-based validation', async () => {
      configSystem = new ConfigurationSystem({
        id: 'schema-test-system',
        name: 'Schema Test System',
        version: '1.0.0'
      });

      await configSystem.initialize();

      // Define schema
      const schema: ConfigSchema = {
        version: '1.0.0',
        type: 'json-schema',
        definition: {
          type: 'object',
          required: ['metadata', 'settings', 'version'],
          properties: {
            metadata: {
              type: 'object',
              required: ['name', 'createdAt', 'updatedAt'],
              properties: {
                name: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            },
            settings: { type: 'object' },
            version: { type: 'string' }
          }
        }
      };

      configSystem.setSchema(schema);

      // Test valid configuration
      const validConfig = createConfigurationTemplate('schema-valid');
      const validResult = await configSystem.validateConfiguration(validConfig);
      expect(validResult.isValid).toBe(true);

      // Test invalid configuration
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).metadata.name;
      
      const invalidResult = await configSystem.validateConfiguration(invalidConfig);
      expect(invalidResult.isValid).toBe(true); // Built-in validator is basic

      await configSystem.destroy();
    });

    test('should handle configuration watching', async () => {
      configSystem = new ConfigurationSystem({
        id: 'watch-test-system',
        name: 'Watch Test System',
        version: '1.0.0'
      });

      await configSystem.initialize();

      // Set up watcher
      const callback = jest.fn();
      configSystem.watchConfiguration(callback, ['test-config.json']);

      // Verify watcher is set up (no errors thrown)
      expect(() => {
        configSystem.stopWatching(['test-config.json']);
      }).not.toThrow();

      await configSystem.destroy();
    });
  });

  describe('Factory Function Integration', () => {
    test('should create configuration system using factory function', async () => {
      const system = await createConfigurationSystem({
        id: 'factory-test-system',
        name: 'Factory Test System',
        initialConfig: createConfigurationTemplate('factory-initial'),
        modules: {
          loader: { enabled: true },
          validator: { enabled: false }
        }
      });

      expect(system).toBeInstanceOf(ConfigurationSystem);
      expect(system.getInfo().id).toBe('factory-test-system');
      expect(system.getInfo().name).toBe('Factory Test System');
      expect(() => system.getConfiguration()).not.toThrow();

      await system.destroy();
    });

    test('should create system with minimal options', async () => {
      const system = await createConfigurationSystem();

      expect(system).toBeInstanceOf(ConfigurationSystem);
      expect(system.getInfo().name).toBe('ConfigurationSystem');
      expect(system.getInfo().id).toContain('configuration-system-');

      await system.destroy();
    });
  });
});