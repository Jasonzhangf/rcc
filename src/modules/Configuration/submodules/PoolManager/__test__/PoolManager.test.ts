/**
 * PoolManager Test Suite
 * Comprehensive tests for PoolManager module
 */

import { PoolManager } from '../src/PoolManager';
import { POOL_MANAGER_CONSTANTS } from '../constants/PoolManager.constants';
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
        },
        {
          id: 'another-provider',
          name: 'Another Provider',
          protocol: 'openai',
          api_base_url: 'https://api.another.com/v1',
          api_key: ['another-key'],
          auth_type: 'api_key',
          models: [
            {
              id: 'another-model',
              name: 'Another Model',
              max_tokens: 2048,
              description: 'Model from another provider',
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

describe('PoolManager', () => {
  let poolManager: PoolManager;
  let mockConfigManager: MockConfigManager;
  let deduplicationCoordinator: DeduplicationCoordinator;

  beforeEach(async () => {
    mockConfigManager = new MockConfigManager();
    deduplicationCoordinator = new DeduplicationCoordinator(mockConfigManager);
    await deduplicationCoordinator.initialize();
    
    poolManager = new PoolManager();
    poolManager.setDeduplicationCoordinator(deduplicationCoordinator);
    
    await poolManager.initialize({ configManager: mockConfigManager });
  });

  afterEach(async () => {
    await poolManager.destroy();
  });

  describe('Module Lifecycle', () => {
    test('should initialize successfully with valid config manager', async () => {
      const newManager = new PoolManager();
      await expect(newManager.initialize({ configManager: mockConfigManager })).resolves.not.toThrow();
      expect(newManager.isInitialized).toBe(true);
      await newManager.destroy();
    });

    test('should throw error when initialized without config manager', async () => {
      const newManager = new PoolManager();
      await expect(newManager.initialize({})).rejects.toThrow(
        POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.CONFIG_MANAGER_NOT_PROVIDED
      );
    });

    test('should handle config updates', async () => {
      const updatedConfig = await mockConfigManager.loadConfig();
      updatedConfig.provider_pool = [];
      
      await poolManager.onConfigUpdate(updatedConfig);
      
      const result = await poolManager.getAllPoolModels();
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });

    test('should validate config correctly', async () => {
      const validConfig = await mockConfigManager.loadConfig();
      expect(poolManager.validateConfig(validConfig)).toBe(true);

      const invalidConfig = { ...validConfig, provider_pool: 'invalid' as any };
      expect(poolManager.validateConfig(invalidConfig)).toBe(false);
    });

    test('should return correct module name', () => {
      expect(poolManager.getName()).toBe(POOL_MANAGER_CONSTANTS.MODULE_NAME);
    });
  });

  describe('Pool Operations', () => {
    test('should add model to pool successfully', async () => {
      const result = await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      expect(result.success).toBe(true);
      expect(result.data.poolEntry.modelName).toBe('Test Model 1');
      expect(result.data.poolEntry.providerName).toBe('Test Provider');
      expect(result.data.totalPoolSize).toBe(1);
      expect(result.statusCode).toBe(POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS);
    });

    test('should return error for non-existent provider', async () => {
      const result = await poolManager.addToProviderPool('non-existent', 'test-model-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.PROVIDER_NOT_FOUND);
      expect(result.statusCode).toBe(POOL_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND);
    });

    test('should return error for non-existent model', async () => {
      const result = await poolManager.addToProviderPool('test-provider', 'non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.MODEL_NOT_FOUND);
      expect(result.statusCode).toBe(POOL_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND);
    });

    test('should update existing pool entry when adding duplicate', async () => {
      // Add model to pool
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      // Add same model again (should update)
      const result = await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      expect(result.success).toBe(true);
      expect(result.data.totalPoolSize).toBe(1); // Should still be 1
    });

    test('should remove model from pool successfully', async () => {
      // First add to pool
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      // Then remove
      const result = await poolManager.removeFromPool('Test Provider.Test Model 1');
      
      expect(result.success).toBe(true);
      expect(result.data.modelName).toBe('Test Model 1');
      expect(result.totalPoolSize).toBe(0);
      expect(result.statusCode).toBe(POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS);
    });

    test('should return error when removing non-existent pool entry', async () => {
      const result = await poolManager.removeFromPool('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.MODEL_NOT_IN_POOL);
      expect(result.statusCode).toBe(POOL_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND);
    });

    test('should get all pool models', async () => {
      // Add some models to pool
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      await poolManager.addToProviderPool('test-provider', 'test-model-2');
      await poolManager.addToProviderPool('another-provider', 'another-model');
      
      const result = await poolManager.getAllPoolModels();
      
      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
      expect(Array.isArray(result.data)).toBe(true);
    });

    test('should get pool models grouped by provider', async () => {
      // Add models to pool
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      await poolManager.addToProviderPool('another-provider', 'another-model');
      
      const result = await poolManager.getPoolModelsByProvider();
      
      expect(result.success).toBe(true);
      expect(result.data['test-provider']).toHaveLength(1);
      expect(result.data['another-provider']).toHaveLength(1);
    });

    test('should check if model is in pool', async () => {
      const modelId = 'Test Provider.Test Model 1';
      
      // Initially not in pool
      expect(poolManager.isModelInPool(modelId)).toBe(false);
      
      // Add to pool
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      // Now should be in pool
      expect(poolManager.isModelInPool(modelId)).toBe(true);
    });

    test('should get pool entry by model ID', async () => {
      const modelId = 'Test Provider.Test Model 1';
      
      // Initially no entry
      expect(poolManager.getPoolEntry(modelId)).toBeNull();
      
      // Add to pool
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      // Now should have entry
      const entry = poolManager.getPoolEntry(modelId);
      expect(entry).not.toBeNull();
      expect(entry?.modelName).toBe('Test Model 1');
    });

    test('should get correct pool size', async () => {
      expect(poolManager.getPoolSize()).toBe(0);
      
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      expect(poolManager.getPoolSize()).toBe(1);
      
      await poolManager.addToProviderPool('test-provider', 'test-model-2');
      expect(poolManager.getPoolSize()).toBe(2);
    });
  });

  describe('Pool Validation', () => {
    test('should validate pool entry correctly', () => {
      const validEntry = {
        id: 'Provider.Model',
        providerId: 'provider-id',
        providerName: 'Provider',
        modelId: 'model-id',
        modelName: 'Model',
        api_base_url: 'https://api.example.com',
        protocol: 'openai',
        auth_type: 'api_key',
        api_key: ['key'],
        model: {} as any,
        added_at: new Date().toISOString(),
        status: 'active'
      };

      expect(poolManager.validatePoolEntry(validEntry)).toBe(true);

      const invalidEntry = { ...validEntry, id: '' };
      expect(poolManager.validatePoolEntry(invalidEntry)).toBe(false);
    });

    test('should validate model for pool', async () => {
      const result = await poolManager.validateModelForPool('test-provider', 'test-model-1');
      
      expect(result.valid).toBe(true);
    });

    test('should reject blacklisted model for pool', async () => {
      // Mock blacklisted model
      const config = await mockConfigManager.loadConfig();
      config.providers[0].models[0].blacklisted = true;
      await mockConfigManager.saveConfig(config);
      await poolManager.onConfigUpdate(config);
      
      const result = await poolManager.validateModelForPool('test-provider', 'test-model-1');
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('blacklisted');
    });

    test('should validate pool constraints', async () => {
      // Add some models
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      await poolManager.addToProviderPool('test-provider', 'test-model-2');
      
      const result = await poolManager.validatePoolConstraints();
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Pool Metrics', () => {
    test('should get pool statistics', async () => {
      // Add some models
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      await poolManager.addToProviderPool('another-provider', 'another-model');
      
      const stats = poolManager.getPoolStats();
      
      expect(stats.totalModels).toBe(2);
      expect(stats.activeModels).toBe(2);
      expect(stats.providersCount).toBe(2);
      expect(stats.avgModelsPerProvider).toBe(1);
      expect(stats.lastUpdated).toBeDefined();
    });

    test('should get pool health status', async () => {
      // Add a model to have a valid pool
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      const health = poolManager.getPoolHealth();
      
      expect(health.healthy).toBe(true);
      expect(Array.isArray(health.issues)).toBe(true);
      expect(Array.isArray(health.warnings)).toBe(true);
    });

    test('should detect unhealthy pool when empty', () => {
      const health = poolManager.getPoolHealth();
      
      expect(health.healthy).toBe(false);
      expect(health.issues.length).toBeGreaterThan(0);
    });
  });

  describe('API Routing', () => {
    test('should handle GET /api/pool request', async () => {
      // Add model to pool first
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      const response = await poolManager.handle(['pool'], 'GET', '');
      
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.statusCode).toBe(POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS);
    });

    test('should handle GET /api/pool/providers request', async () => {
      // Add model to pool first
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      const response = await poolManager.handle(['pool', 'providers'], 'GET', '');
      
      expect(response.success).toBe(true);
      expect(typeof response.data).toBe('object');
      expect(response.statusCode).toBe(POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS);
    });

    test('should handle GET /api/pool/stats request', async () => {
      const response = await poolManager.handle(['pool', 'stats'], 'GET', '');
      
      expect(response.success).toBe(true);
      expect(response.data.totalModels).toBeDefined();
      expect(response.statusCode).toBe(POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS);
    });

    test('should handle GET /api/pool/health request', async () => {
      const response = await poolManager.handle(['pool', 'health'], 'GET', '');
      
      expect(response.success).toBe(true);
      expect(response.data.healthy).toBeDefined();
      expect(response.statusCode).toBe(POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS);
    });

    test('should handle DELETE /api/pool/{modelId} request', async () => {
      // Add model to pool first
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      const response = await poolManager.handle(['pool', 'Test%20Provider.Test%20Model%201'], 'DELETE', '');
      
      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS);
    });

    test('should return error for unsupported HTTP method', async () => {
      const response = await poolManager.handle(['pool'], 'POST', '');
      
      expect(response.success).toBe(false);
      expect(response.error).toBe(POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.METHOD_NOT_ALLOWED);
      expect(response.statusCode).toBe(POOL_MANAGER_CONSTANTS.STATUS_CODES.METHOD_NOT_ALLOWED);
    });

    test('should return error for malformed requests', async () => {
      const response = await poolManager.handle(['pool', 'unknown-action'], 'GET', '');
      
      expect(response.success).toBe(false);
      expect(response.error).toBe(POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.BAD_REQUEST);
      expect(response.statusCode).toBe(POOL_MANAGER_CONSTANTS.STATUS_CODES.BAD_REQUEST);
    });
  });

  describe('Deduplication Logic', () => {
    test('should remove model from blacklist when adding to pool', async () => {
      const mockConfig = await mockConfigManager.loadConfig();
      // Add model to blacklist first
      mockConfig.model_blacklist = [{
        id: 'Test Provider.Test Model 1',
        providerId: 'test-provider',
        providerName: 'Test Provider',
        modelId: 'test-model-1',
        modelName: 'Test Model 1',
        reason: 'Test blacklist',
        blacklisted_at: new Date().toISOString(),
        original_model: mockConfig.providers[0].models[0]
      }];
      // Mark original model as blacklisted
      mockConfig.providers[0].models[0].blacklisted = true;
      await mockConfigManager.saveConfig(mockConfig);
      await poolManager.onConfigUpdate(mockConfig);
      
      // Add to pool (should remove from blacklist)
      const result = await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      expect(result.success).toBe(true);
      
      // Verify it's removed from blacklist and model status updated
      const updatedConfig = await mockConfigManager.loadConfig();
      expect(updatedConfig.model_blacklist).toHaveLength(0);
      expect(updatedConfig.providers[0].models[0].blacklisted).toBe(false);
    });

    test('should handle notification when model blacklisted', async () => {
      // Add to pool first
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      // Simulate notification from BlacklistManager
      await poolManager.onModelBlacklisted('Test Provider.Test Model 1');
      
      // Should be removed from pool
      const result = await poolManager.getAllPoolModels();
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
      
      const errorManager = new PoolManager();
      await errorManager.initialize({ configManager: errorConfigManager });
      
      const result = await errorManager.addToProviderPool('test-provider', 'test-model-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Pool operation failed');
      
      await errorManager.destroy();
    });

    test('should handle missing configuration data', async () => {
      const emptyConfigManager = new MockConfigManager({
        providers: []
      });
      
      const emptyManager = new PoolManager();
      await emptyManager.initialize({ configManager: emptyConfigManager });
      
      const result = await emptyManager.addToProviderPool('non-existent', 'test-model');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.PROVIDER_NOT_FOUND);
      
      await emptyManager.destroy();
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large pool efficiently', async () => {
      const startTime = Date.now();
      
      // Add many entries (limited by available models)
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      await poolManager.addToProviderPool('test-provider', 'test-model-2');
      await poolManager.addToProviderPool('another-provider', 'another-model');
      
      const result = await poolManager.getAllPoolModels();
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });

    test('should handle URL-encoded model IDs', async () => {
      await poolManager.addToProviderPool('test-provider', 'test-model-1');
      
      const encodedId = encodeURIComponent('Test Provider.Test Model 1');
      const result = await poolManager.removeFromPool(encodedId);
      
      expect(result.success).toBe(true);
    });

    test('should maintain data integrity during concurrent operations', async () => {
      // Simulate concurrent pool operations
      const promises = Array.from({ length: 3 }, () => 
        poolManager.addToProviderPool('test-provider', 'test-model-1')
      );
      
      const results = await Promise.all(promises);
      
      // All should succeed (updates to same entry)
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      const finalResult = await poolManager.getAllPoolModels();
      expect(finalResult.count).toBe(1); // Should have one entry (updated multiple times)
    });
  });
});