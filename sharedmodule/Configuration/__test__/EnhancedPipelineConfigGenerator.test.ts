/**
 * Enhanced Pipeline Config Generator Tests
 * 
 * Comprehensive tests for the EnhancedPipelineConfigGenerator functionality
 */

import { EnhancedPipelineConfigGenerator, ConfigData, PipelineTable } from '../src';

describe('EnhancedPipelineConfigGenerator', () => {
  let generator: EnhancedPipelineConfigGenerator;
  
  beforeEach(() => {
    generator = new EnhancedPipelineConfigGenerator();
  });
  
  afterEach(async () => {
    if (generator) {
      await generator.destroy();
    }
  });
  
  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(generator.initialize()).resolves.not.toThrow();
    });
    
    test('should initialize with custom virtual models', async () => {
      const customModels = ['custom-model-1', 'custom-model-2'];
      const customGenerator = new EnhancedPipelineConfigGenerator(customModels);
      await expect(customGenerator.initialize()).resolves.not.toThrow();
    });
  });
  
  describe('Pipeline Table Generation', () => {
    beforeEach(async () => {
      await generator.initialize();
    });
    
    test('should generate empty pipeline table from empty configuration', async () => {
      const emptyConfig: ConfigData = {
        version: '1.0.0',
        providers: {},
        virtualModels: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const pipelineTable = await generator.generatePipelineTable(emptyConfig);
      expect(pipelineTable).toBeInstanceOf(Map);
      expect(pipelineTable.size).toBe(0);
    });
    
    test('should generate pipeline table with single provider and model', async () => {
      const testConfig: ConfigData = {
        version: '1.0.0',
        providers: {
          'openai': {
            id: 'openai',
            name: 'OpenAI',
            type: 'openai',
            auth: {
              type: 'api-key',
              keys: ['test-key']
            },
            models: {
              'gpt-3.5-turbo': {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                contextLength: 4096,
                supportsFunctions: true
              }
            }
          }
        },
        virtualModels: {
          'default': {
            id: 'default',
            targets: [
              {
                providerId: 'openai',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const pipelineTable = await generator.generatePipelineTable(testConfig);
      expect(pipelineTable).toBeInstanceOf(Map);
      expect(pipelineTable.size).toBe(1);
      
      // Check that the entry has the correct structure
      const entries = Array.from(pipelineTable.entries());
      const [entryId, entry] = entries[0];
      
      expect(entry.virtualModelId).toBe('default');
      expect(entry.targetProvider).toBe('openai');
      expect(entry.targetModel).toBe('gpt-3.5-turbo');
      expect(entry.keyIndex).toBe(0);
      expect(entry.enabled).toBe(true);
      expect(entry.priority).toBe(1);
    });
    
    test('should generate pipeline table with multiple API keys', async () => {
      const testConfig: ConfigData = {
        version: '1.0.0',
        providers: {
          'openai': {
            id: 'openai',
            name: 'OpenAI',
            type: 'openai',
            auth: {
              type: 'api-key',
              keys: ['key-1', 'key-2', 'key-3']
            },
            models: {
              'gpt-3.5-turbo': {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                contextLength: 4096,
                supportsFunctions: true
              }
            }
          }
        },
        virtualModels: {
          'default': {
            id: 'default',
            targets: [
              {
                providerId: 'openai',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const pipelineTable = await generator.generatePipelineTable(testConfig);
      expect(pipelineTable).toBeInstanceOf(Map);
      // Should create one entry for each API key
      expect(pipelineTable.size).toBe(3);
      
      // Check that all entries have different key indices
      const keyIndices = Array.from(pipelineTable.values()).map(entry => entry.keyIndex);
      expect(keyIndices).toEqual([0, 1, 2]);
    });
    
    test('should handle fixed virtual models only', async () => {
      const testConfig: ConfigData = {
        version: '1.0.0',
        providers: {
          'openai': {
            id: 'openai',
            name: 'OpenAI',
            type: 'openai',
            auth: {
              type: 'api-key',
              keys: ['test-key']
            },
            models: {
              'gpt-3.5-turbo': {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                contextLength: 4096,
                supportsFunctions: true
              }
            }
          }
        },
        virtualModels: {
          'default': {
            id: 'default',
            targets: [
              {
                providerId: 'openai',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1
          },
          'custom-model': {
            id: 'custom-model',
            targets: [
              {
                providerId: 'openai',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const pipelineTable = await generator.generatePipelineTable(testConfig);
      expect(pipelineTable).toBeInstanceOf(Map);
      // Should only process fixed virtual models (default is in the fixed list)
      expect(pipelineTable.size).toBe(1);
    });
  });
  
  describe('Pipeline Table Validation', () => {
    beforeEach(async () => {
      await generator.initialize();
    });
    
    test('should validate empty pipeline table', async () => {
      const emptyTable = new Map<string, any>();
      const result = await generator.validatePipelineTable(emptyTable);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
    
    test('should validate valid pipeline table', async () => {
      const validTable = new Map<string, any>([
        ['test_entry', {
          virtualModelId: 'default',
          targetProvider: 'openai',
          targetModel: 'gpt-3.5-turbo',
          keyIndex: 0,
          priority: 1,
          enabled: true,
          weight: 100
        }]
      ]);
      
      const result = await generator.validatePipelineTable(validTable);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
    
    test('should detect invalid pipeline table entries', async () => {
      const invalidTable = new Map<string, any>([
        ['invalid_entry_1', {
          virtualModelId: 'default',
          // Missing targetProvider
          targetModel: 'gpt-3.5-turbo',
          keyIndex: -1, // Invalid key index
          priority: 15 // Invalid priority (too high)
        }]
      ]);
      
      const result = await generator.validatePipelineTable(invalidTable);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Entry invalid_entry_1 missing target provider');
      expect(result.errors).toContain('Entry invalid_entry_1 missing target model');
      expect(result.errors).toContain('Entry invalid_entry_1 has invalid key index: -1');
    });
  });
  
  describe('Complete Pipeline Configuration Generation', () => {
    beforeEach(async () => {
      await generator.initialize();
    });
    
    test('should generate complete pipeline configuration', async () => {
      const testConfig: ConfigData = {
        version: '1.0.0',
        providers: {
          'openai': {
            id: 'openai',
            name: 'OpenAI',
            type: 'openai',
            auth: {
              type: 'api-key',
              keys: ['test-key']
            },
            models: {
              'gpt-3.5-turbo': {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                contextLength: 4096,
                supportsFunctions: true
              }
            }
          }
        },
        virtualModels: {
          'default': {
            id: 'default',
            targets: [
              {
                providerId: 'openai',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const completeConfig = await generator.generateCompletePipelineConfig(testConfig);
      
      // Check assembly config
      expect(completeConfig.assemblyConfig).toBeDefined();
      expect(completeConfig.assemblyConfig.routingRules).toBeDefined();
      expect(completeConfig.assemblyConfig.pipelineTemplates).toBeDefined();
      expect(completeConfig.assemblyConfig.moduleRegistry).toBeDefined();
      
      // Check scheduler config
      expect(completeConfig.schedulerConfig).toBeDefined();
      expect(completeConfig.schedulerConfig.loadBalancing).toBeDefined();
      expect(completeConfig.schedulerConfig.healthCheck).toBeDefined();
      
      // Check metadata
      expect(completeConfig.metadata).toBeDefined();
      expect(completeConfig.metadata.generatedAt).toBeDefined();
      expect(completeConfig.metadata.configVersion).toBe('1.0.0');
    });
  });
  
  describe('Module Lifecycle', () => {
    test('should destroy cleanly', async () => {
      await generator.initialize();
      await expect(generator.destroy()).resolves.not.toThrow();
    });
    
    test('should handle multiple destroy calls', async () => {
      await generator.initialize();
      await generator.destroy();
      await expect(generator.destroy()).resolves.not.toThrow();
    });
  });
});