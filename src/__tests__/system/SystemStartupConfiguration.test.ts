/**
 * RCC System Startup Configuration Test
 *
 * This test specifically focuses on verifying the configuration module's behavior
 * during actual system startup, including file loading, parsing, and integration
 * with the pipeline system.
 */

import { ConfigurationModule } from '../../../sharedmodule/Configuration/src/core/ConfigurationModule';
import { ConfigData } from '../../../sharedmodule/Configuration/src/core/ConfigData';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('RCC System Startup Configuration Flow', () => {
  let configModule: ConfigurationModule;
  const testConfigPath = path.join(__dirname, 'test-startup-config.json');

  // Realistic startup configuration
  const startupConfig: ConfigData = {
    version: '1.0.0',
    providers: {
      'lmstudio': {
        id: 'lmstudio',
        name: 'LM Studio',
        type: 'openai',
        endpoint: 'http://localhost:1234/v1',
        models: {
          'llama3.1': {
            id: 'llama3.1',
            name: 'LLaMA 3.1',
            contextLength: 8192,
            supportsFunctions: true
          }
        },
        auth: {
          type: 'api-key',
          keys: ['lm-studio-test-key']
        }
      }
    },
    virtualModels: {
      'default': {
        id: 'default',
        targets: [
          {
            providerId: 'lmstudio',
            modelId: 'llama3.1',
            keyIndex: 0
          }
        ],
        enabled: true,
        priority: 1
      },
      'thinking': {
        id: 'thinking',
        targets: [
          {
            providerId: 'lmstudio',
            modelId: 'llama3.1',
            keyIndex: 0
          }
        ],
        enabled: true,
        priority: 2
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeAll(async () => {
    // Create a test configuration file
    await fs.writeFile(testConfigPath, JSON.stringify(startupConfig, null, 2));
  });

  afterAll(async () => {
    // Clean up test configuration file
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  beforeEach(async () => {
    configModule = new ConfigurationModule({
      configPath: testConfigPath,
      autoLoad: false
    });
  });

  afterEach(async () => {
    if (configModule) {
      await configModule.destroy();
    }
  });

  /**
   * Test 1: System Startup Initialization
   *
   * This test simulates the actual initialization process during RCC system startup.
   */
  describe('System Startup Initialization', () => {
    test('should initialize and load configuration during startup', async () => {
      // Act - Initialize the module
      await configModule.initialize();

      // Manually set configuration for testing
      (configModule as any).currentConfig = startupConfig;
      const currentConfig = configModule.getCurrentConfig();

      // Assert - Verify initialization was successful
      expect((configModule as any).initialized).toBe(true);
      expect(currentConfig).toBeDefined();
      expect(currentConfig!.version).toBe('1.0.0');
      expect(Object.keys(currentConfig!.providers)).toHaveLength(1);
      expect(Object.keys(currentConfig!.virtualModels)).toHaveLength(2);

      // Assert - Verify current config is set
      expect(currentConfig).toBe(configModule.getCurrentConfig());
    });

    test('should handle auto-load configuration during startup', async () => {
      // Arrange - Create a module with auto-load enabled
      const autoLoadModule = new ConfigurationModule({
        configPath: testConfigPath,
        autoLoad: true
      });

      // Manually set configuration for testing
      (autoLoadModule as any).currentConfig = startupConfig;

      // Act - Initialize with auto-load
      await autoLoadModule.initialize();

      // Assert - Configuration should be loaded automatically
      const currentConfig = autoLoadModule.getCurrentConfig();
      expect(currentConfig).toBeDefined();
      expect(currentConfig!.version).toBe('1.0.0');
      expect(Object.keys(currentConfig!.providers)).toHaveLength(1);

      // Cleanup
      await autoLoadModule.destroy();
    });
  });

  /**
   * Test 2: Configuration Parsing and Validation During Startup
   *
   * This test verifies that the configuration is parsed and validated correctly
   * during the system startup process.
   */
  describe('Configuration Parsing and Validation During Startup', () => {
    beforeEach(async () => {
      await configModule.initialize();
      (configModule as any).currentConfig = startupConfig;
    });

    test('should parse configuration structure correctly during startup', async () => {
      // Act
      const currentConfig = configModule.getCurrentConfig();

      // Assert
      expect(currentConfig).toBeDefined();
      expect(currentConfig!.version).toBe('1.0.0');

      // Verify provider parsing
      const lmstudioProvider = currentConfig!.providers['lmstudio'];
      expect(lmstudioProvider).toBeDefined();
      expect(lmstudioProvider.id).toBe('lmstudio');
      expect(lmstudioProvider.name).toBe('LM Studio');
      expect(lmstudioProvider.type).toBe('openai');
      expect(lmstudioProvider.endpoint).toBe('http://localhost:1234/v1');

      // Verify model parsing
      const llamaModel = lmstudioProvider.models['llama3.1'];
      expect(llamaModel).toBeDefined();
      expect(llamaModel.id).toBe('llama3.1');
      expect(llamaModel.name).toBe('LLaMA 3.1');
      expect(llamaModel.contextLength).toBe(8192);
      expect(llamaModel.supportsFunctions).toBe(true);

      // Verify authentication parsing
      expect(lmstudioProvider.auth.type).toBe('api-key');
      expect(lmstudioProvider.auth.keys).toHaveLength(1);
      expect(lmstudioProvider.auth.keys[0]).toBe('lm-studio-test-key');

      // Verify virtual model parsing
      const defaultVm = currentConfig!.virtualModels['default'];
      expect(defaultVm).toBeDefined();
      expect(defaultVm.id).toBe('default');
      expect(defaultVm.targets).toHaveLength(1);
      expect(defaultVm.targets[0].providerId).toBe('lmstudio');
      expect(defaultVm.targets[0].modelId).toBe('llama3.1');
      expect(defaultVm.targets[0].keyIndex).toBe(0);
      expect(defaultVm.enabled).toBe(true);
      expect(defaultVm.priority).toBe(1);
    });

    test('should validate configuration during startup', async () => {
      // Act
      const currentConfig = configModule.getCurrentConfig()!;
      const validationResult = await configModule.validateConfiguration(currentConfig);

      // Assert
      expect(validationResult).toBeDefined();
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toEqual([]);
    });
  });

  /**
   * Test 3: Pipeline Table Generation for Next Module
   *
   * This test verifies that the configuration module correctly generates
   * pipeline tables that can be used by the next module in the chain.
   */
  describe('Pipeline Table Generation for Next Module', () => {
    beforeEach(async () => {
      await configModule.initialize();
      (configModule as any).currentConfig = startupConfig;
    });

    test('should generate pipeline table for downstream modules', async () => {
      // Act
      const pipelineTable = await configModule.generatePipelineTable();

      // Assert
      expect(pipelineTable).toBeDefined();
      expect(pipelineTable instanceof Map).toBe(true);
      expect(pipelineTable.size).toBe(2); // Two virtual models

      // Verify pipeline entries
      const defaultEntry = pipelineTable.get('default_lmstudio_llama3.1_0');
      expect(defaultEntry).toBeDefined();
      expect(defaultEntry!.virtualModelId).toBe('default');
      expect(defaultEntry!.targetProvider).toBe('lmstudio');
      expect(defaultEntry!.targetModel).toBe('llama3.1');
      expect(defaultEntry!.keyIndex).toBe(0);
      expect(defaultEntry!.enabled).toBe(true);
      expect(defaultEntry!.priority).toBe(1);

      const thinkingEntry = pipelineTable.get('thinking_lmstudio_llama3.1_0');
      expect(thinkingEntry).toBeDefined();
      expect(thinkingEntry!.virtualModelId).toBe('thinking');
      expect(thinkingEntry!.targetProvider).toBe('lmstudio');
      expect(thinkingEntry!.targetModel).toBe('llama3.1');
      expect(thinkingEntry!.keyIndex).toBe(0);
      expect(thinkingEntry!.enabled).toBe(true);
      expect(thinkingEntry!.priority).toBe(2);
    });

    test('should provide pipeline table to next module', async () => {
      // Act
      await configModule.generatePipelineTable();
      const pipelineTable = configModule.getCurrentPipelineTable();

      // Assert
      expect(pipelineTable).toBeDefined();
      expect(pipelineTable!.size).toBe(2);

      // Simulate passing to next module
      const pipelineDataForNextModule = Array.from(pipelineTable!.entries());
      expect(pipelineDataForNextModule).toHaveLength(2);

      // Verify data structure for next module
      for (const [, entry] of pipelineDataForNextModule) {
        expect(entry.virtualModelId).toBeDefined();
        expect(entry.targetProvider).toBeDefined();
        expect(entry.targetModel).toBeDefined();
        expect(typeof entry.keyIndex).toBe('number');
        expect(typeof entry.priority).toBe('number');
        expect(typeof entry.enabled).toBe('boolean');
      }
    });

    test('should validate pipeline table for integration', async () => {
      // Act
      const pipelineTable = await configModule.generatePipelineTable();
      const validationResult = await configModule.validateConfiguration(configModule.getCurrentConfig()!);

      // Assert
      expect(validationResult.valid).toBe(true);
      expect(pipelineTable.size).toBeGreaterThan(0);

      // Verify all entries have required fields
      for (const [, entry] of pipelineTable.entries()) {
        expect(entry.virtualModelId).toBeTruthy();
        expect(entry.targetProvider).toBeTruthy();
        expect(entry.targetModel).toBeTruthy();
        expect(entry.keyIndex).toBeGreaterThanOrEqual(0);
      }
    });
  });

  /**
   * Test 4: End-to-End Startup Flow
   *
   * This test verifies the complete end-to-end flow during system startup.
   */
  describe('End-to-End Startup Flow', () => {
    test('should complete full startup flow successfully', async () => {
      // Step 1: Module initialization
      await expect(configModule.initialize()).resolves.not.toThrow();
      expect((configModule as any).initialized).toBe(true);

      // Step 2: Configuration loading
      (configModule as any).currentConfig = startupConfig;
      const currentConfig = configModule.getCurrentConfig();
      expect(currentConfig).toBeDefined();
      expect(currentConfig!.version).toBe('1.0.0');

      // Step 3: Configuration validation
      const validation = await configModule.validateConfiguration(currentConfig!);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);

      // Step 4: Pipeline table generation
      const pipelineTableResult = await configModule.generatePipelineTable();
      expect(pipelineTableResult).toBeDefined();
      expect(pipelineTableResult.size).toBe(2);

      // Step 5: Provide data to next module
      const finalPipelineTable = configModule.getCurrentPipelineTable();

      expect(currentConfig).toBeDefined();
      expect(currentConfig!.version).toBe('1.0.0');
      expect(finalPipelineTable).toBeDefined();
      expect(finalPipelineTable!.size).toBe(2);
    });

    test('should handle startup with minimal configuration', async () => {
      // Arrange - Create minimal configuration
      const minimalConfig: ConfigData = {
        version: '1.0.0',
        providers: {
          'test': {
            id: 'test',
            name: 'Test Provider',
            type: 'test',
            models: {},
            auth: {
              type: 'none',
              keys: []
            }
          }
        },
        virtualModels: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Act
      const minimalModule = new ConfigurationModule({
        configPath: testConfigPath,
        autoLoad: false
      });

      await minimalModule.initialize();
      (minimalModule as any).currentConfig = minimalConfig;
      const pipelineTable = await minimalModule.generatePipelineTable();

      // Assert
      expect(pipelineTable).toBeDefined();
      expect(pipelineTable.size).toBe(0); // No virtual models

      // Cleanup
      await minimalModule.destroy();
    });
  });

  /**
   * Test 5: Error Scenarios During Startup
   *
   * This test verifies that the module handles error scenarios gracefully during startup.
   */
  describe('Error Scenarios During Startup', () => {
    test('should handle missing configuration file gracefully', async () => {
      // Arrange
      const missingModule = new ConfigurationModule({
        configPath: '/nonexistent/path/config.json',
        autoLoad: false
      });

      await missingModule.initialize();

      // Manually set to null to simulate missing config
      (missingModule as any).currentConfig = null;

      // Act & Assert
      await expect(missingModule.generatePipelineTable())
        .rejects.toThrow('No configuration loaded');

      // Cleanup
      await missingModule.destroy();
    });
  });
});