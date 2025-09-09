/**
 * ConfigManager Module Tests
 * Basic tests to verify the module works correctly
 */

import { ConfigManager } from '../src/ConfigManager';
import { CONFIG_MANAGER_CONSTANTS } from '../constants/ConfigManager.constants';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  afterEach(async () => {
    await configManager.destroy();
  });

  describe('Initialization', () => {
    test('should create ConfigManager instance', () => {
      expect(configManager).toBeInstanceOf(ConfigManager);
      expect(configManager.getInfo().name).toBe('ConfigManager');
      expect(configManager.getInfo().version).toBe('1.0.0');
    });

    test('should return correct config path', () => {
      const path = configManager.getConfigPath();
      expect(path).toBe(CONFIG_MANAGER_CONSTANTS.CONFIG_FILE_PATH);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate valid configuration', () => {
      const validConfig = {
        version: '2.0.0',
        last_updated: '2025-09-09T09:00:00.000Z',
        providers: [{
          id: 'test-provider',
          name: 'test',
          protocol: 'openai',
          api_base_url: 'https://api.test.com',
          api_key: ['test-key'],
          auth_type: 'api_key',
          models: []
        }],
        routes: [],
        global_config: {
          load_balancing: 'round_robin',
          rate_limiting: {
            enabled: false,
            requests_per_minute: 100
          }
        },
        model_blacklist: [],
        provider_pool: []
      };

      const isValid = configManager.validateConfig(validConfig);
      expect(isValid).toBe(true);
    });

    test('should reject invalid configuration - missing required fields', () => {
      const invalidConfig = {
        version: '2.0.0'
        // Missing providers and global_config
      };

      const isValid = configManager.validateConfig(invalidConfig as any);
      expect(isValid).toBe(false);
    });

    test('should reject invalid provider configuration', () => {
      const configWithInvalidProvider = {
        version: '2.0.0',
        last_updated: '2025-09-09T09:00:00.000Z',
        providers: [{
          id: 'test-provider',
          // Missing required fields: name, protocol, api_base_url
          auth_type: 'api_key',
          models: []
        }],
        routes: [],
        global_config: {
          load_balancing: 'round_robin',
          rate_limiting: {
            enabled: false,
            requests_per_minute: 100
          }
        },
        model_blacklist: [],
        provider_pool: []
      };

      const isValid = configManager.validateConfig(configWithInvalidProvider as any);
      expect(isValid).toBe(false);
    });
  });

  describe('Data Reception', () => {
    test('should handle validate action', async () => {
      const testConfig = {
        version: '2.0.0',
        providers: [],
        global_config: {}
      };

      const result = await configManager.receiveData({
        action: 'validate',
        config: testConfig
      });

      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
    });

    test('should handle unknown action', async () => {
      await expect(configManager.receiveData({
        action: 'unknown_action'
      })).rejects.toThrow('Unknown action: unknown_action');
    });
  });
});

// Integration test placeholders
describe('ConfigManager Integration Tests', () => {
  test('should be able to load real config file', async () => {
    // This would test against the actual config file
    // For now, just verify the path exists
    const configManager = new ConfigManager();
    const path = configManager.getConfigPath();
    expect(path).toBeTruthy();
    await configManager.destroy();
  });
});