/**
 * BlacklistManager Test Suite
 * Comprehensive tests for BlacklistManager module
 */

import { BlacklistManager } from '../src/BlacklistManager';
import { BLACKLIST_MANAGER_CONSTANTS } from '../constants/BlacklistManager.constants';
import { IConfigManager, IConfigData } from '../../ConfigManager/interfaces/IConfigManager';
import { DeduplicationCoordinator } from '../../shared/DeduplicationCoordinator';

// Mock ConfigManager
class MockConfigManager implements IConfigManager {
  private configData: IConfigData;

  constructor(initialConfig?: Partial<IConfigData>) {
    this.configData = {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      providers: [
        {
          id: 'test-provider',
          name: 'Test Provider',
          protocol: 'openai',
          api_base_url: 'https://api.test.com/v1',
          api_key: ['test-key'],
          auth_type: 'api_key',
          models: [
            {
              id: 'test-model-1',
              name: 'Test Model 1',
              max_tokens: 4096,
              description: 'Test model',
              status: 'active',
              verified: true,
              blacklisted: false,
              manual_override: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 'test-model-2',
              name: 'Test Model 2',
              max_tokens: 8192,
              description: 'Another test model',
              status: 'active',
              verified: true,
              blacklisted: false,
              manual_override: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
        }
      ],
      routes: [],
      global_config: {
        load_balancing: 'round_robin',
        rate_limiting: { enabled: false, requests_per_minute: 100 }
      },
      model_blacklist: [],
      provider_pool: [],
      ...initialConfig
    };
  }

  async loadConfig(): Promise<IConfigData> {
    return { ...this.configData };
  }

  async saveConfig(config: IConfigData): Promise<void> {
    this.configData = { ...config };
  }

  async createBackup(): Promise<string> {
    return '/tmp/backup.json';
  }

  async restoreFromBackup(backupPath: string): Promise<void> {
    // Mock implementation
  }

  validateConfig(config: IConfigData): boolean {
    return true;
  }

  getConfigPath(): string {
    return '/tmp/config.json';
  }
}

describe('BlacklistManager', () => {
  let blacklistManager: BlacklistManager;
  let mockConfigManager: MockConfigManager;
  let deduplicationCoordinator: DeduplicationCoordinator;

  beforeEach(async () => {
    mockConfigManager = new MockConfigManager();
    deduplicationCoordinator = new DeduplicationCoordinator(mockConfigManager);
    await deduplicationCoordinator.initialize();
    
    blacklistManager = new BlacklistManager();
    blacklistManager.setDeduplicationCoordinator(deduplicationCoordinator);
    
    await blacklistManager.initialize({ configManager: mockConfigManager });
  });

  afterEach(async () => {
    await blacklistManager.destroy();
  });

  describe('Module Lifecycle', () => {
    test('should initialize successfully with valid config manager', async () => {
      const newManager = new BlacklistManager();
      await expect(newManager.initialize({ configManager: mockConfigManager })).resolves.not.toThrow();
      expect(newManager.isInitialized).toBe(true);
      await newManager.destroy();
    });

    test('should throw error when initialized without config manager', async () => {
      const newManager = new BlacklistManager();
      await expect(newManager.initialize({})).rejects.toThrow(
        BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.CONFIG_MANAGER_NOT_PROVIDED
      );
    });

    test('should handle config updates', async () => {
      const updatedConfig = await mockConfigManager.loadConfig();
      updatedConfig.model_blacklist = [];
      
      await blacklistManager.onConfigUpdate(updatedConfig);
      
      const result = await blacklistManager.getAllBlacklistedModels();
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });

    test('should validate config correctly', async () => {
      const validConfig = await mockConfigManager.loadConfig();
      expect(blacklistManager.validateConfig(validConfig)).toBe(true);

      const invalidConfig = { ...validConfig, model_blacklist: 'invalid' as any };
      expect(blacklistManager.validateConfig(invalidConfig)).toBe(false);
    });

    test('should return correct module name', () => {
      expect(blacklistManager.getName()).toBe(BLACKLIST_MANAGER_CONSTANTS.MODULE_NAME);
    });
  });

  describe('Blacklist Operations', () => {
    test('should add model to blacklist successfully', async () => {
      const result = await blacklistManager.blacklistModel('test-provider', 'test-model-1', 'Test reason');
      
      expect(result.success).toBe(true);
      expect(result.data.model).toBe('Test Model 1');
      expect(result.data.provider).toBe('Test Provider');
      expect(result.data.reason).toBe('Test reason');
      expect(result.statusCode).toBe(BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS);
    });

    test('should use default reason when not provided', async () => {
      const result = await blacklistManager.blacklistModel('test-provider', 'test-model-1');
      
      expect(result.success).toBe(true);
      expect(result.data.reason).toBe(BLACKLIST_MANAGER_CONSTANTS.DEFAULT_BLACKLIST_REASON);
    });

    test('should return error for non-existent provider', async () => {
      const result = await blacklistManager.blacklistModel('non-existent', 'test-model-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.PROVIDER_NOT_FOUND);
      expect(result.statusCode).toBe(BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND);
    });

    test('should return error for non-existent model', async () => {
      const result = await blacklistManager.blacklistModel('test-provider', 'non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.MODEL_NOT_FOUND);
      expect(result.statusCode).toBe(BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND);
    });

    test('should remove model from blacklist successfully', async () => {
      // First add to blacklist
      await blacklistManager.blacklistModel('test-provider', 'test-model-1');
      
      // Then remove
      const result = await blacklistManager.removeFromBlacklist('Test Provider.Test Model 1');
      
      expect(result.success).toBe(true);
      expect(result.data.modelName).toBe('Test Model 1');
      expect(result.statusCode).toBe(BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS);
    });

    test('should return error when removing non-existent blacklist entry', async () => {
      const result = await blacklistManager.removeFromBlacklist('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.MODEL_NOT_IN_BLACKLIST);
      expect(result.statusCode).toBe(BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND);
    });

    test('should get all blacklisted models', async () => {
      // Add some models to blacklist
      await blacklistManager.blacklistModel('test-provider', 'test-model-1', 'Reason 1');
      await blacklistManager.blacklistModel('test-provider', 'test-model-2', 'Reason 2');
      
      const result = await blacklistManager.getAllBlacklistedModels();
      
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(Array.isArray(result.data)).toBe(true);
    });

    test('should get blacklisted models grouped by provider', async () => {
      // Add model to blacklist
      await blacklistManager.blacklistModel('test-provider', 'test-model-1');
      
      const result = await blacklistManager.getBlacklistedModelsByProvider();
      
      expect(result.success).toBe(true);
      expect(result.data['test-provider']).toHaveLength(1);
    });

    test('should check if model is blacklisted', async () => {
      const modelId = 'Test Provider.Test Model 1';
      
      // Initially not blacklisted
      expect(blacklistManager.isModelBlacklisted(modelId)).toBe(false);
      
      // Add to blacklist
      await blacklistManager.blacklistModel('test-provider', 'test-model-1');
      
      // Now should be blacklisted
      expect(blacklistManager.isModelBlacklisted(modelId)).toBe(true);
    });

    test('should get blacklist entry by model ID', async () => {
      const modelId = 'Test Provider.Test Model 1';
      
      // Initially no entry
      expect(blacklistManager.getBlacklistEntry(modelId)).toBeNull();
      
      // Add to blacklist
      await blacklistManager.blacklistModel('test-provider', 'test-model-1', 'Test reason');
      
      // Now should have entry
      const entry = blacklistManager.getBlacklistEntry(modelId);
      expect(entry).not.toBeNull();
      expect(entry?.reason).toBe('Test reason');
    });
  });

  describe('API Routing', () => {
    test('should handle GET /api/blacklist request', async () => {
      // Add model to blacklist first
      await blacklistManager.blacklistModel('test-provider', 'test-model-1');
      
      const response = await blacklistManager.handle(['blacklist'], 'GET', '');
      
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.statusCode).toBe(BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS);
    });

    test('should handle GET /api/blacklist/providers request', async () => {
      // Add model to blacklist first
      await blacklistManager.blacklistModel('test-provider', 'test-model-1');
      
      const response = await blacklistManager.handle(['blacklist', 'providers'], 'GET', '');
      
      expect(response.success).toBe(true);
      expect(typeof response.data).toBe('object');
      expect(response.statusCode).toBe(BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS);
    });

    test('should handle DELETE /api/blacklist/{modelId} request', async () => {
      // Add model to blacklist first
      await blacklistManager.blacklistModel('test-provider', 'test-model-1');
      
      const response = await blacklistManager.handle(['blacklist', 'Test%20Provider.Test%20Model%201'], 'DELETE', '');
      
      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS);
    });

    test('should return error for unsupported HTTP method', async () => {
      const response = await blacklistManager.handle(['blacklist'], 'POST', '');
      
      expect(response.success).toBe(false);
      expect(response.error).toBe(BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.METHOD_NOT_ALLOWED);
      expect(response.statusCode).toBe(BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.METHOD_NOT_ALLOWED);
    });

    test('should return error for malformed requests', async () => {
      const response = await blacklistManager.handle(['blacklist', 'unknown-action'], 'GET', '');
      
      expect(response.success).toBe(false);
      expect(response.error).toBe(BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.BAD_REQUEST);
      expect(response.statusCode).toBe(BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.BAD_REQUEST);
    });
  });

  describe('Deduplication Logic', () => {
    test('should remove model from pool when adding to blacklist', async () => {
      const mockConfig = await mockConfigManager.loadConfig();
      // Add model to pool first
      mockConfig.provider_pool = [{
        id: 'Test Provider.Test Model 1',
        providerId: 'test-provider',
        providerName: 'Test Provider',
        modelId: 'test-model-1',
        modelName: 'Test Model 1',
        api_base_url: 'https://api.test.com/v1',
        protocol: 'openai',
        auth_type: 'api_key',
        api_key: ['test-key'],
        model: mockConfig.providers[0].models[0],
        added_at: new Date().toISOString(),
        status: 'active'
      }];
      await mockConfigManager.saveConfig(mockConfig);
      await blacklistManager.onConfigUpdate(mockConfig);
      
      // Add to blacklist (should remove from pool)
      const result = await blacklistManager.blacklistModel('test-provider', 'test-model-1');
      
      expect(result.success).toBe(true);
      
      // Verify it's removed from pool
      const updatedConfig = await mockConfigManager.loadConfig();
      expect(updatedConfig.provider_pool).toHaveLength(0);
    });

    test('should handle notification when model added to pool', async () => {
      // Add to blacklist first
      await blacklistManager.blacklistModel('test-provider', 'test-model-1');
      
      // Simulate notification from PoolManager
      await blacklistManager.onModelAddedToPool('Test Provider.Test Model 1');
      
      // Should be removed from blacklist
      const result = await blacklistManager.getAllBlacklistedModels();
      expect(result.count).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully when config manager fails', async () => {
      // Mock config manager to throw error
      const errorConfigManager = {
        ...mockConfigManager,
        saveConfig: jest.fn().mockRejectedValue(new Error('Save failed'))
      };
      
      const errorManager = new BlacklistManager();
      await errorManager.initialize({ configManager: errorConfigManager });
      
      const result = await errorManager.blacklistModel('test-provider', 'test-model-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Blacklist operation failed');
      
      await errorManager.destroy();
    });

    test('should handle missing configuration data', async () => {
      const emptyConfigManager = new MockConfigManager({
        providers: []
      });
      
      const emptyManager = new BlacklistManager();
      await emptyManager.initialize({ configManager: emptyConfigManager });
      
      const result = await emptyManager.blacklistModel('non-existent', 'test-model');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.PROVIDER_NOT_FOUND);
      
      await emptyManager.destroy();
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large blacklist efficiently', async () => {
      const startTime = Date.now();
      
      // Add many entries
      for (let i = 0; i < 100; i++) {
        await blacklistManager.blacklistModel('test-provider', 'test-model-1', `Reason ${i}`);
      }
      
      const result = await blacklistManager.getAllBlacklistedModels();
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(result.count).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle URL-encoded model IDs', async () => {
      await blacklistManager.blacklistModel('test-provider', 'test-model-1');
      
      const encodedId = encodeURIComponent('Test Provider.Test Model 1');
      const result = await blacklistManager.removeFromBlacklist(encodedId);
      
      expect(result.success).toBe(true);
    });

    test('should maintain data integrity during concurrent operations', async () => {
      // Simulate concurrent blacklist operations
      const promises = Array.from({ length: 10 }, (_, i) => 
        blacklistManager.blacklistModel('test-provider', 'test-model-1', `Concurrent reason ${i}`)
      );
      
      const results = await Promise.all(promises);
      
      // All should succeed (last one wins for updates)
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      const finalResult = await blacklistManager.getAllBlacklistedModels();
      expect(finalResult.count).toBe(10); // Should have all entries
    });
  });
});