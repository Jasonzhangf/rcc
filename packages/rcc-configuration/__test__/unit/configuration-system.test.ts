/**
 * Unit tests for Configuration System
 */

import { createConfigurationSystem } from '../../src';
import type { IConfigurationSystem, IConfigurationSystemOptions } from '../../src';

describe('Configuration System', () => {
  let configSystem: IConfigurationSystem;
  let tempConfigPath: string;

  beforeEach(() => {
    tempConfigPath = `/tmp/test-config-${Date.now()}.json`;
  });

  afterEach(async () => {
    if (configSystem) {
      await configSystem.destroy();
    }
    // Clean up temp config file
    try {
      const fs = require('fs-extra');
      await fs.remove(tempConfigPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('createConfigurationSystem', () => {
    test('should create configuration system with default options', async () => {
      configSystem = await createConfigurationSystem();
      
      expect(configSystem).toBeDefined();
      expect(configSystem.config).toBeDefined();
      expect(configSystem.providers).toBeDefined();
      expect(configSystem.models).toBeDefined();
      expect(configSystem.blacklist).toBeDefined();
      expect(configSystem.pool).toBeDefined();
      expect(configSystem.deduplication).toBeDefined();
    });

    test('should create configuration system with custom options', async () => {
      const options: IConfigurationSystemOptions = {
        configPath: tempConfigPath,
        enableDeduplication: true,
        enableProviderTesting: true,
        enableModelDiscovery: true
      };

      configSystem = await createConfigurationSystem(options);
      
      expect(configSystem).toBeDefined();
      expect(configSystem.config).toBeDefined();
    });

    test('should initialize all modules successfully', async () => {
      configSystem = await createConfigurationSystem({
        configPath: tempConfigPath
      });

      await expect(configSystem.initialize()).resolves.not.toThrow();
    });

    test('should get system health status', async () => {
      configSystem = await createConfigurationSystem({
        configPath: tempConfigPath
      });

      await configSystem.initialize();
      const health = await configSystem.getSystemHealth();

      expect(health).toBeDefined();
      expect(health.overall).toMatch(/^(healthy|warning|error)$/);
      expect(health.components).toBeDefined();
      expect(health.details).toBeDefined();
      expect(health.details.lastHealthCheck).toBeDefined();
    });

    test('should destroy all modules successfully', async () => {
      configSystem = await createConfigurationSystem({
        configPath: tempConfigPath
      });

      await configSystem.initialize();
      await expect(configSystem.destroy()).resolves.not.toThrow();
    });
  });

  describe('Module Integration', () => {
    beforeEach(async () => {
      configSystem = await createConfigurationSystem({
        configPath: tempConfigPath,
        enableDeduplication: true
      });
      await configSystem.initialize();
    });

    test('should integrate config manager', async () => {
      const config = await configSystem.config.getConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    test('should integrate providers manager', async () => {
      const providers = await configSystem.providers.getAll();
      expect(Array.isArray(providers)).toBe(true);
    });

    test('should integrate models manager', async () => {
      expect(configSystem.models.getAll).toBeDefined();
      expect(typeof configSystem.models.getAll).toBe('function');
    });

    test('should integrate blacklist manager', async () => {
      const blacklist = await configSystem.blacklist.getAll();
      expect(Array.isArray(blacklist)).toBe(true);
    });

    test('should integrate pool manager', async () => {
      const pool = await configSystem.pool.getAll();
      expect(Array.isArray(pool)).toBe(true);
    });

    test('should integrate deduplication coordinator', async () => {
      expect(configSystem.deduplication).toBeDefined();
      expect(configSystem.deduplication.initialize).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid config path gracefully', async () => {
      const invalidPath = '/invalid/path/config.json';
      configSystem = await createConfigurationSystem({
        configPath: invalidPath
      });

      // Should not throw during creation, but might during initialization
      expect(configSystem).toBeDefined();
    });

    test('should handle system health check errors gracefully', async () => {
      configSystem = await createConfigurationSystem({
        configPath: tempConfigPath
      });

      const health = await configSystem.getSystemHealth();
      expect(health).toBeDefined();
      expect(health.overall).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    test('should have proper TypeScript types', async () => {
      configSystem = await createConfigurationSystem();
      
      // These should not cause TypeScript compilation errors
      const _config: typeof configSystem.config = configSystem.config;
      const _providers: typeof configSystem.providers = configSystem.providers;
      const _models: typeof configSystem.models = configSystem.models;
      const _blacklist: typeof configSystem.blacklist = configSystem.blacklist;
      const _pool: typeof configSystem.pool = configSystem.pool;
      
      expect(true).toBe(true); // If we get here, types are correct
    });
  });
});