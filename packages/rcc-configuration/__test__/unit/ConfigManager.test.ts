/**
 * Unit tests for ConfigManager
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../../src';
import type { IConfigurationData } from '../../src';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let tempConfigPath: string;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rcc-config-test-'));
    tempConfigPath = path.join(tempDir, 'config.json');
    configManager = new ConfigManager(tempConfigPath);
  });

  afterEach(async () => {
    if (configManager) {
      await configManager.destroy();
    }
    await fs.remove(tempDir);
  });

  describe('Lifecycle', () => {
    test('should initialize successfully', async () => {
      await expect(configManager.initialize()).resolves.not.toThrow();
    });

    test('should initialize with default config if none exists', async () => {
      await configManager.initialize();
      const config = await configManager.getConfig();
      
      expect(config).toBeDefined();
      expect(config!.version).toBeDefined();
      expect(config!.providers).toEqual([]);
    });

    test('should destroy successfully', async () => {
      await configManager.initialize();
      await expect(configManager.destroy()).resolves.not.toThrow();
    });
  });

  describe('Configuration Operations', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    test('should save and load configuration', async () => {
      const testConfig: IConfigurationData = {
        version: '1.0.0',
        last_updated: new Date().toISOString(),
        providers: [],
        global_config: {
          load_balancing: 'round_robin',
          rate_limiting: {
            enabled: false,
            requests_per_minute: 100
          },
          monitoring: {
            enabled: true,
            health_check_interval: 60000,
            alert_thresholds: {
              error_rate: 0.05,
              response_time_ms: 10000,
              availability: 0.95
            }
          }
        }
      };

      await configManager.saveConfig(testConfig);
      const loadedConfig = await configManager.getConfig();
      
      expect(loadedConfig).toBeDefined();
      expect(loadedConfig!.version).toBe(testConfig.version);
      expect(loadedConfig!.providers).toEqual(testConfig.providers);
    });

    test('should update configuration partially', async () => {
      const initialConfig = await configManager.getConfig();
      expect(initialConfig).toBeDefined();
      
      await configManager.updateConfig({
        version: '2.0.0'
      });
      
      const updatedConfig = await configManager.getConfig();
      expect(updatedConfig!.version).toBe('2.0.0');
      expect(updatedConfig!.providers).toEqual(initialConfig!.providers);
    });

    test('should reset configuration to defaults', async () => {
      // Update config first
      await configManager.updateConfig({
        version: '2.0.0'
      });
      
      // Reset to defaults
      await configManager.resetConfig();
      
      const resetConfig = await configManager.getConfig();
      expect(resetConfig!.version).toBe('1.0.0'); // Default version
    });
  });

  describe('Backup Management', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    test('should create backup', async () => {
      const backupId = await configManager.createBackup('test-backup');
      expect(backupId).toBeDefined();
      expect(typeof backupId).toBe('string');
    });

    test('should list backups', async () => {
      await configManager.createBackup('test-backup-1');
      await configManager.createBackup('test-backup-2');
      
      const backups = await configManager.listBackups();
      expect(backups.length).toBeGreaterThanOrEqual(2);
      expect(backups[0]).toHaveProperty('id');
      expect(backups[0]).toHaveProperty('created_at');
      expect(backups[0]).toHaveProperty('size');
    });

    test('should restore backup', async () => {
      // Create initial config
      await configManager.updateConfig({ version: '2.0.0' });
      
      // Create backup
      const backupId = await configManager.createBackup('before-change');
      
      // Change config
      await configManager.updateConfig({ version: '3.0.0' });
      
      // Restore backup
      await configManager.restoreBackup(backupId);
      
      const restoredConfig = await configManager.getConfig();
      expect(restoredConfig!.version).toBe('2.0.0');
    });

    test('should delete backup', async () => {
      const backupId = await configManager.createBackup('to-delete');
      
      const deleted = await configManager.deleteBackup(backupId);
      expect(deleted).toBe(true);
      
      const backups = await configManager.listBackups();
      expect(backups.find(b => b.id === backupId)).toBeUndefined();
    });
  });

  describe('Validation', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    test('should validate valid configuration', async () => {
      const config = await configManager.getConfig();
      const validation = await configManager.validateConfig(config!);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect validation errors', async () => {
      const invalidConfig = {
        // Missing required fields
      } as any;
      
      const validation = await configManager.validateConfig(invalidConfig);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should repair corrupted configuration', async () => {
      const corruptedConfig = {
        // Missing version and providers
        last_updated: new Date().toISOString()
      } as any;
      
      const repairResult = await configManager.repairConfig(corruptedConfig);
      
      expect(repairResult.config.version).toBeDefined();
      expect(repairResult.config.providers).toEqual([]);
      expect(repairResult.repairs_made.length).toBeGreaterThan(0);
    });
  });

  describe('File Operations', () => {
    test('should report config path', () => {
      const path = configManager.getConfigPath();
      expect(path).toBe(tempConfigPath);
    });

    test('should detect config existence', async () => {
      expect(await configManager.configExists()).toBe(false);
      
      await configManager.initialize();
      expect(await configManager.configExists()).toBe(true);
    });

    test('should provide config stats', async () => {
      await configManager.initialize();
      
      const stats = await configManager.getConfigStats();
      expect(stats.exists).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.modified_at).toBeDefined();
      expect(stats.version).toBeDefined();
    });

    test('should track last modified time', async () => {
      await configManager.initialize();
      
      const lastModified = await configManager.getLastModified();
      expect(lastModified).toBeDefined();
      
      // Wait a bit and modify
      await new Promise(resolve => setTimeout(resolve, 100));
      await configManager.updateConfig({ version: '2.0.0' });
      
      const newLastModified = await configManager.getLastModified();
      expect(new Date(newLastModified!).getTime()).toBeGreaterThan(new Date(lastModified!).getTime());
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    test('should notify listeners on config change', async () => {
      const listener = jest.fn();
      configManager.onConfigChanged(listener);
      
      await configManager.updateConfig({ version: '2.0.0' });
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ version: '2.0.0' }));
    });

    test('should remove listeners', async () => {
      const listener = jest.fn();
      configManager.onConfigChanged(listener);
      configManager.offConfigChanged(listener);
      
      await configManager.updateConfig({ version: '2.0.0' });
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should throw error when not initialized', async () => {
      const uninitializedManager = new ConfigManager(tempConfigPath);
      
      await expect(uninitializedManager.getConfig()).rejects.toThrow();
    });

    test('should handle invalid config path gracefully', async () => {
      const invalidPath = '/invalid/path/config.json';
      const invalidManager = new ConfigManager(invalidPath);
      
      await expect(invalidManager.initialize()).rejects.toThrow();
    });

    test('should handle backup restoration of non-existent backup', async () => {
      await configManager.initialize();
      
      await expect(configManager.restoreBackup('non-existent-id')).rejects.toThrow();
    });
  });
});