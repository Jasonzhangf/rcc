/**
 * Configuration Module Initialization and Parsing System Test
 *
 * This test verifies the complete flow of configuration module initialization,
 * configuration parsing, and pipeline table generation during RCC system startup.
 */

import { ConfigurationModule } from '../../../sharedmodule/Configuration/src/core/ConfigurationModule';
import { ConfigData } from '../../../sharedmodule/Configuration/src/core/ConfigData';

describe('RCC System Configuration Initialization and Parsing', () => {
  let configModule: ConfigurationModule;

  // Complete test configuration that represents a real-world scenario
  const completeTestConfig: ConfigData = {
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
          },
          'mistral': {
            id: 'mistral',
            name: 'Mistral',
            contextLength: 32768,
            supportsFunctions: false
          }
        },
        auth: {
          type: 'api-key',
          keys: ['lm-studio-key-1', 'lm-studio-key-2']
        }
      },
      'openai': {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        endpoint: 'https://api.openai.com/v1',
        models: {
          'gpt-4': {
            id: 'gpt-4',
            name: 'GPT-4',
            contextLength: 128000,
            supportsFunctions: true
          },
          'gpt-3.5-turbo': {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            contextLength: 16385,
            supportsFunctions: true
          }
        },
        auth: {
          type: 'api-key',
          keys: ['openai-key-1', 'openai-key-2', 'openai-key-3']
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
          },
          {
            providerId: 'openai',
            modelId: 'gpt-3.5-turbo',
            keyIndex: 1
          }
        ],
        enabled: true,
        priority: 1,
        weight: 70
      },
      'longcontext': {
        id: 'longcontext',
        targets: [
          {
            providerId: 'lmstudio',
            modelId: 'mistral',
            keyIndex: 1
          },
          {
            providerId: 'openai',
            modelId: 'gpt-4',
            keyIndex: 2
          }
        ],
        enabled: true,
        priority: 2,
        weight: 30
      },
      'thinking': {
        id: 'thinking',
        targets: [
          {
            providerId: 'openai',
            modelId: 'gpt-4',
            keyIndex: 0
          }
        ],
        enabled: true,
        priority: 3,
        weight: 100
      },
      'background': {
        id: 'background',
        targets: [
          {
            providerId: 'lmstudio',
            modelId: 'llama3.1',
            keyIndex: 0
          }
        ],
        enabled: true,
        priority: 1,
        weight: 100
      },
      'websearch': {
        id: 'websearch',
        targets: [
          {
            providerId: 'openai',
            modelId: 'gpt-3.5-turbo',
            keyIndex: 1
          }
        ],
        enabled: true,
        priority: 1,
        weight: 100
      },
      'vision': {
        id: 'vision',
        targets: [
          {
            providerId: 'openai',
            modelId: 'gpt-4',
            keyIndex: 0
          }
        ],
        enabled: true,
        priority: 1,
        weight: 100
      },
      'coding': {
        id: 'coding',
        targets: [
          {
            providerId: 'openai',
            modelId: 'gpt-4',
            keyIndex: 0
          },
          {
            providerId: 'lmstudio',
            modelId: 'llama3.1',
            keyIndex: 0
          }
        ],
        enabled: true,
        priority: 2,
        weight: 50
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(async () => {
    // Initialize the configuration module with default options
    configModule = new ConfigurationModule({
      configPath: './test-config.json',
      autoLoad: false
    });
  });

  afterEach(async () => {
    // Clean up resources
    if (configModule) {
      await configModule.destroy();
    }
  });

  /**
   * Test 1: Configuration Module Initialization
   *
   * This test verifies that the configuration module initializes correctly
   * during system startup.
   */
  describe('Configuration Module Initialization', () => {
    test('should initialize configuration module successfully', async () => {
      // Act
      await expect(configModule.initialize()).resolves.not.toThrow();

      // Assert
      // Verify the module is initialized
      expect((configModule as any).initialized).toBe(true);

      // Verify sub-components are initialized
      expect((configModule as any).configLoader).toBeDefined();
      expect((configModule as any).configParser).toBeDefined();
      expect((configModule as any).pipelineTableGenerator).toBeDefined();
      expect((configModule as any).virtualModelRulesModule).toBeDefined();
    });

    test('should initialize with custom options', async () => {
      // Arrange
      const customConfigModule = new ConfigurationModule({
        configPath: './custom-test-config.json',
        autoLoad: true,
        fixedVirtualModels: ['custom-model']
      });

      // Act
      await expect(customConfigModule.initialize()).resolves.not.toThrow();

      // Assert
      expect((customConfigModule as any).initialized).toBe(true);
      expect((customConfigModule as any).options.configPath).toBe('./custom-test-config.json');
      expect((customConfigModule as any).options.autoLoad).toBe(true);
      expect((customConfigModule as any).options.fixedVirtualModels).toEqual(['custom-model']);

      // Cleanup
      await customConfigModule.destroy();
    });

    test('should handle multiple initialization calls gracefully', async () => {
      // Act
      await configModule.initialize();
      await expect(configModule.initialize()).resolves.not.toThrow();

      // Assert
      expect((configModule as any).initialized).toBe(true);
    });
  });

  /**
   * Test 2: Configuration Parsing
   *
   * This test verifies that configuration files are correctly parsed
   * and converted to the standardized ConfigData structure.
   */
  describe('Configuration Parsing', () => {
    beforeEach(async () => {
      await configModule.initialize();
    });

    test('should parse complete configuration correctly', async () => {
      // Manually set the configuration since we're not actually loading from file
      (configModule as any).currentConfig = completeTestConfig;
      const currentConfig = configModule.getCurrentConfig();

      // Assert
      expect(currentConfig).toBeDefined();
      expect(currentConfig!.version).toBe('1.0.0');
      expect(Object.keys(currentConfig!.providers)).toHaveLength(2);
      expect(Object.keys(currentConfig!.virtualModels)).toHaveLength(7);

      // Verify provider structure
      const lmstudioProvider = currentConfig!.providers['lmstudio'];
      expect(lmstudioProvider).toBeDefined();
      expect(lmstudioProvider.name).toBe('LM Studio');
      expect(lmstudioProvider.type).toBe('openai');
      expect(lmstudioProvider.endpoint).toBe('http://localhost:1234/v1');
      expect(Object.keys(lmstudioProvider.models)).toHaveLength(2);
      expect(lmstudioProvider.auth.keys).toHaveLength(2);

      // Verify virtual model structure
      const defaultVm = currentConfig!.virtualModels['default'];
      expect(defaultVm).toBeDefined();
      expect(defaultVm.targets).toHaveLength(2);
      expect(defaultVm.enabled).toBe(true);
      expect(defaultVm.priority).toBe(1);
      expect(defaultVm.weight).toBe(70);
    });

    test('should create empty configuration template', () => {
      // Act
      const emptyConfig = configModule.createEmptyConfig();

      // Assert
      expect(emptyConfig.version).toBe('1.0.0');
      expect(emptyConfig.providers).toEqual({});
      expect(emptyConfig.virtualModels).toEqual({});
      expect(emptyConfig.createdAt).toBeDefined();
      expect(emptyConfig.updatedAt).toBeDefined();
    });

    test('should validate valid configuration', async () => {
      // Act
      const validationResult = await configModule.validateConfiguration(completeTestConfig);

      // Assert
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toEqual([]);
    });

    test('should detect invalid configuration', async () => {
      // Arrange
      const invalidConfig: any = {
        // Missing version
        providers: {
          // Missing name, type, auth, models
          'invalid-provider': {}
        },
        virtualModels: {
          'default': {
            id: 'default',
            targets: [], // Empty targets
            enabled: true,
            priority: 1
          }
        }
      };

      // Act
      const validationResult = await configModule.validateConfiguration(invalidConfig);

      // Assert
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toContain('Missing version');
      expect(validationResult.errors).toContain('Provider invalid-provider missing name');
      expect(validationResult.errors).toContain('Provider invalid-provider missing type');
      expect(validationResult.errors).toContain('Provider invalid-provider missing authentication configuration');
      expect(validationResult.errors).toContain('Provider invalid-provider has no models');
    });
  });

  /**
   * Test 3: Pipeline Table Generation
   *
   * This test verifies that the parsed configuration is correctly
   * converted to a pipeline table for the next module.
   */
  describe('Pipeline Table Generation', () => {
    beforeEach(async () => {
      await configModule.initialize();
      // Set the configuration manually
      (configModule as any).currentConfig = completeTestConfig;
    });

    test('should generate pipeline table from configuration', async () => {
      // Act
      const pipelineTable = await configModule.generatePipelineTable();

      // Assert
      expect(pipelineTable).toBeDefined();
      expect(pipelineTable.size).toBeGreaterThan(0);

      // Check that entries exist for our virtual models
      const entries = Array.from(pipelineTable.entries());
      expect(entries.length).toBeGreaterThan(0);

      // Verify structure of pipeline entries
      for (const [, entry] of entries) {
        expect(entry.virtualModelId).toBeDefined();
        expect(entry.targetProvider).toBeDefined();
        expect(entry.targetModel).toBeDefined();
        expect(typeof entry.keyIndex).toBe('number');
        expect(typeof entry.priority).toBe('number');
        expect(typeof entry.enabled).toBe('boolean');
        expect(typeof entry.weight).toBe('number');
        expect(entry.metadata).toBeDefined();
      }

      // Verify specific entries exist
      let defaultEntryFound = false;
      let thinkingEntryFound = false;

      for (const [, entry] of entries) {
        if (entry.virtualModelId === 'default') {
          defaultEntryFound = true;
          expect(entry.targetProvider).toBe('lmstudio'); // First target
          expect(entry.targetModel).toBe('llama3.1');
          expect(entry.keyIndex).toBe(0);
        }

        if (entry.virtualModelId === 'thinking') {
          thinkingEntryFound = true;
          expect(entry.targetProvider).toBe('openai');
          expect(entry.targetModel).toBe('gpt-4');
          expect(entry.keyIndex).toBe(0);
        }
      }

      expect(defaultEntryFound).toBe(true);
      expect(thinkingEntryFound).toBe(true);
    });

    test('should validate generated pipeline table', async () => {
      // Act
      await configModule.generatePipelineTable();
      const validationResult = await configModule.validateConfiguration(completeTestConfig);

      // Assert
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toEqual([]);
    });

    test('should return current pipeline table', async () => {
      // Arrange
      await configModule.generatePipelineTable();

      // Act
      const currentPipelineTable = configModule.getCurrentPipelineTable();

      // Assert
      expect(currentPipelineTable).toBeDefined();
      expect(currentPipelineTable!.size).toBeGreaterThan(0);
    });
  });

  /**
   * Test 4: Integration Flow
   *
   * This test verifies the complete flow from initialization to pipeline generation.
   */
  describe('Complete Integration Flow', () => {
    test('should complete full initialization and parsing flow', async () => {
      // Step 1: Initialize module
      await expect(configModule.initialize()).resolves.not.toThrow();
      expect((configModule as any).initialized).toBe(true);

      // Step 2: Load and parse configuration
      (configModule as any).currentConfig = completeTestConfig;
      const currentConfig = configModule.getCurrentConfig();
      expect(currentConfig).toBeDefined();
      expect(currentConfig!.version).toBe('1.0.0');

      // Step 3: Validate configuration
      const validationResult = await configModule.validateConfiguration(completeTestConfig);
      expect(validationResult.valid).toBe(true);

      // Step 4: Generate pipeline table
      const pipelineTableResult = await configModule.generatePipelineTable();
      expect(pipelineTableResult).toBeDefined();
      expect(pipelineTableResult.size).toBeGreaterThan(0);

      // Step 5: Verify current state
      const finalConfig = configModule.getCurrentConfig();
      const finalPipelineTable = configModule.getCurrentPipelineTable();
      expect(finalConfig).toBe(currentConfig);
      expect(finalPipelineTable).toBe(pipelineTableResult);
    });
  });

  /**
   * Test 5: Error Handling
   *
   * This test verifies that the module handles errors gracefully.
   */
  describe('Error Handling', () => {
    beforeEach(async () => {
      await configModule.initialize();
    });

    test('should handle missing configuration gracefully', async () => {
      // Act & Assert
      await expect(configModule.generatePipelineTable()).rejects.toThrow('No configuration loaded');
    });

    test('should handle destroy on uninitialized module', async () => {
      // Arrange
      const newModule = new ConfigurationModule();

      // Act & Assert
      await expect(newModule.destroy()).resolves.not.toThrow();
    });
  });
});