/**
 * Integration tests for the complete configuration system
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { createConfigurationSystem } from '../../src';
import type { IConfigurationSystem } from '../../src';

describe('System Integration', () => {
  let configSystem: IConfigurationSystem;
  let tempDir: string;
  let configPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rcc-integration-test-'));
    configPath = path.join(tempDir, 'config.json');
    
    configSystem = await createConfigurationSystem({
      configPath,
      enableDeduplication: true,
      enableProviderTesting: true,
      enableModelDiscovery: true
    });
    
    await configSystem.initialize();
  });

  afterEach(async () => {
    if (configSystem) {
      await configSystem.destroy();
    }
    await fs.remove(tempDir);
  });

  describe('Complete Workflow', () => {
    test('should handle complete provider lifecycle', async () => {
      // 1. Add a provider
      const provider = await configSystem.providers.create({
        name: 'OpenAI',
        protocol: 'openai',
        api_base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test-key',
        auth_type: 'api_key',
        models: [
          {
            id: 'gpt-4',
            name: 'GPT-4',
            max_tokens: 8192,
            status: 'active',
            verified: false,
            blacklisted: false,
            manual_override: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      });

      expect(provider).toBeDefined();
      expect(provider.id).toBeDefined();

      // 2. Test the provider
      const testResult = await configSystem.providers.testProvider(provider.id);
      expect(testResult.success).toBe(true);

      // 3. Verify model
      const verificationResult = await configSystem.models.verifyModel(provider.id, 'gpt-4');
      expect(verificationResult.success).toBe(true);

      // 4. Add model to pool
      const poolEntry = await configSystem.pool.add({
        providerId: provider.id,
        providerName: provider.name,
        modelId: 'gpt-4',
        modelName: 'GPT-4',
        api_base_url: provider.api_base_url,
        protocol: provider.protocol,
        auth_type: provider.auth_type,
        api_key: provider.api_key,
        model: provider.models![0],
        added_at: new Date().toISOString(),
        status: 'active'
      });

      expect(poolEntry).toBeDefined();

      // 5. Check system health
      const health = await configSystem.getSystemHealth();
      expect(health.overall).toBe('healthy');
      expect(health.details.providersCount).toBe(1);
    });

    test('should handle blacklisting and deduplication', async () => {
      // 1. Create provider and add to pool
      const provider = await configSystem.providers.create({
        name: 'Test Provider',
        protocol: 'openai',
        api_base_url: 'https://api.test.com',
        api_key: 'test-key',
        auth_type: 'api_key',
        models: [
          {
            id: 'test-model',
            name: 'Test Model',
            max_tokens: 4096,
            status: 'active',
            verified: false,
            blacklisted: false,
            manual_override: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      });

      const poolEntry = await configSystem.pool.add({
        providerId: provider.id,
        providerName: provider.name,
        modelId: 'test-model',
        modelName: 'Test Model',
        api_base_url: provider.api_base_url,
        protocol: provider.protocol,
        auth_type: provider.auth_type,
        api_key: provider.api_key,
        model: provider.models![0],
        added_at: new Date().toISOString(),
        status: 'active'
      });

      // 2. Blacklist the same model
      const blacklistEntry = await configSystem.blacklist.add({
        providerId: provider.id,
        providerName: provider.name,
        modelId: 'test-model',
        modelName: 'Test Model',
        reason: 'Test blacklist reason',
        blacklisted_at: new Date().toISOString(),
        original_model: provider.models![0]
      });

      expect(blacklistEntry).toBeDefined();

      // 3. Run deduplication
      const deduplicationResult = await configSystem.deduplication.performDeduplication();
      expect(deduplicationResult.success).toBe(true);
      expect(deduplicationResult.conflicts_found).toBe(1);
      expect(deduplicationResult.conflicts_resolved).toBe(1);

      // 4. Verify the conflict was resolved (pool entry removed, blacklist kept)
      const isInPool = await configSystem.pool.isInPool(provider.id, 'test-model');
      const isBlacklisted = await configSystem.blacklist.isBlacklisted(provider.id, 'test-model');
      
      expect(isInPool).toBe(false);
      expect(isBlacklisted).toBe(true);
    });

    test('should persist data across system restarts', async () => {
      // 1. Add data to first system instance
      const provider = await configSystem.providers.create({
        name: 'Persistent Provider',
        protocol: 'openai',
        api_base_url: 'https://api.persistent.com',
        api_key: 'persistent-key',
        auth_type: 'api_key'
      });

      const providerId = provider.id;

      // 2. Destroy first instance
      await configSystem.destroy();

      // 3. Create new system instance
      const newConfigSystem = await createConfigurationSystem({
        configPath,
        enableDeduplication: true
      });
      await newConfigSystem.initialize();

      // 4. Verify data persisted
      const retrievedProvider = await newConfigSystem.providers.getById(providerId);
      expect(retrievedProvider).toBeDefined();
      expect(retrievedProvider!.name).toBe('Persistent Provider');

      await newConfigSystem.destroy();
    });

    test('should handle system health monitoring', async () => {
      const health = await configSystem.getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.overall).toMatch(/^(healthy|warning|error)$/);
      expect(health.components).toBeDefined();
      expect(health.components.config).toMatch(/^(healthy|error)$/);
      expect(health.components.providers).toMatch(/^(healthy|error)$/);
      expect(health.components.models).toMatch(/^(healthy|error)$/);
      expect(health.components.blacklist).toMatch(/^(healthy|error)$/);
      expect(health.components.pool).toMatch(/^(healthy|error)$/);
      expect(health.components.deduplication).toMatch(/^(healthy|error)$/);
      expect(health.details).toBeDefined();
      expect(health.details.lastHealthCheck).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle corrupted configuration gracefully', async () => {
      // Corrupt the config file
      await fs.writeFile(configPath, 'invalid json content');
      
      // System should handle this gracefully
      const newConfigSystem = await createConfigurationSystem({ configPath });
      
      // Initialize might fail, but should not crash
      try {
        await newConfigSystem.initialize();
        // If initialization succeeds, config was repaired
        const config = await newConfigSystem.config.getConfig();
        expect(config).toBeDefined();
      } catch (error) {
        // If initialization fails, error should be meaningful
        expect(error).toBeDefined();
      }
      
      await newConfigSystem.destroy();
    });

    test('should handle missing configuration file', async () => {
      // Remove config file
      await fs.remove(configPath);
      
      const newConfigSystem = await createConfigurationSystem({ configPath });
      
      // Should create default configuration
      await expect(newConfigSystem.initialize()).resolves.not.toThrow();
      
      const config = await newConfigSystem.config.getConfig();
      expect(config).toBeDefined();
      expect(config!.version).toBeDefined();
      expect(config!.providers).toEqual([]);
      
      await newConfigSystem.destroy();
    });

    test('should handle concurrent operations safely', async () => {
      // Simulate concurrent provider creation
      const promises = Array.from({ length: 5 }, (_, i) =>
        configSystem.providers.create({
          name: `Concurrent Provider ${i}`,
          protocol: 'openai',
          api_base_url: `https://api${i}.test.com`,
          api_key: `key-${i}`,
          auth_type: 'api_key'
        })
      );

      const providers = await Promise.all(promises);
      
      expect(providers).toHaveLength(5);
      providers.forEach((provider, i) => {
        expect(provider.name).toBe(`Concurrent Provider ${i}`);
      });

      // Verify all providers were saved
      const allProviders = await configSystem.providers.getAll();
      expect(allProviders).toHaveLength(5);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large numbers of providers efficiently', async () => {
      const startTime = Date.now();
      
      // Create 100 providers
      const createPromises = Array.from({ length: 100 }, (_, i) =>
        configSystem.providers.create({
          name: `Provider ${i}`,
          protocol: 'openai',
          api_base_url: `https://api${i}.test.com`,
          api_key: `key-${i}`,
          auth_type: 'api_key'
        })
      );

      await Promise.all(createPromises);
      
      const creationTime = Date.now() - startTime;
      
      // Retrieve all providers
      const retrievalStartTime = Date.now();
      const providers = await configSystem.providers.getAll();
      const retrievalTime = Date.now() - retrievalStartTime;
      
      expect(providers).toHaveLength(100);
      expect(creationTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(retrievalTime).toBeLessThan(1000); // Should retrieve within 1 second
    });

    test('should handle system health check performance', async () => {
      // Add some data first
      await configSystem.providers.create({
        name: 'Health Test Provider',
        protocol: 'openai',
        api_base_url: 'https://api.health-test.com',
        api_key: 'health-key',
        auth_type: 'api_key'
      });

      const startTime = Date.now();
      const health = await configSystem.getSystemHealth();
      const healthCheckTime = Date.now() - startTime;
      
      expect(health).toBeDefined();
      expect(healthCheckTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});