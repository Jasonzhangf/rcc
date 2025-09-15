import { EnhancedPipelineConfigGenerator, ConfigData, PipelineTable } from '../../src';

describe('EnhancedPipelineConfigGenerator - Comprehensive Tests', () => {
  let generator: EnhancedPipelineConfigGenerator;
  
  // Complex test configuration data
  const complexConfig: ConfigData = {
    version: '1.0.0',
    providers: {
      'openai': {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        models: {
          'gpt-3.5-turbo': {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            contextLength: 4096,
            supportsFunctions: true
          },
          'gpt-4': {
            id: 'gpt-4',
            name: 'GPT-4',
            contextLength: 8192,
            supportsFunctions: true
          }
        },
        auth: {
          type: 'api-key',
          keys: ['test-key-1', 'test-key-2', 'test-key-3']
        }
      },
      'anthropic': {
        id: 'anthropic',
        name: 'Anthropic',
        type: 'anthropic',
        models: {
          'claude-2': {
            id: 'claude-2',
            name: 'Claude 2',
            contextLength: 100000,
            supportsFunctions: false
          }
        },
        auth: {
          type: 'api-key',
          keys: ['anthropic-key-1']
        }
      },
      'google': {
        id: 'google',
        name: 'Google',
        type: 'google',
        models: {
          'gemini-pro': {
            id: 'gemini-pro',
            name: 'Gemini Pro',
            contextLength: 32768,
            supportsFunctions: true
          }
        },
        auth: {
          type: 'api-key',
          keys: ['google-key-1', 'google-key-2']
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
          },
          {
            providerId: 'openai',
            modelId: 'gpt-4',
            keyIndex: 1
          }
        ],
        enabled: true,
        priority: 1,
        weight: 60
      },
      'thinking': {
        id: 'thinking',
        targets: [
          {
            providerId: 'anthropic',
            modelId: 'claude-2',
            keyIndex: 0
          }
        ],
        enabled: true,
        priority: 2,
        weight: 40
      },
      'longcontext': {
        id: 'longcontext',
        targets: [
          {
            providerId: 'anthropic',
            modelId: 'claude-2',
            keyIndex: 0
          },
          {
            providerId: 'google',
            modelId: 'gemini-pro',
            keyIndex: 1
          }
        ],
        enabled: true,
        priority: 3,
        weight: 20
      },
      'coding': {
        id: 'coding',
        targets: [
          {
            providerId: 'openai',
            modelId: 'gpt-4',
            keyIndex: 2
          }
        ],
        enabled: false,
        priority: 4,
        weight: 10
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(async () => {
    generator = new EnhancedPipelineConfigGenerator();
    await generator.initialize();
  });

  afterEach(async () => {
    if (generator) {
      await generator.destroy();
    }
  });

  describe('Complex Configuration Generation', () => {
    it('should generate complete pipeline configuration with complex setup', async () => {
      const result = await generator.generateCompletePipelineConfig(complexConfig);
      
      expect(result).toBeDefined();
      expect(result.assemblyConfig).toBeDefined();
      expect(result.schedulerConfig).toBeDefined();
      expect(result.metadata).toBeDefined();
      
      // Check metadata
      expect(result.metadata.configVersion).toBe('1.0.0');
      expect(result.metadata.virtualModelCount).toBe(4);
      expect(result.metadata.generatedAt).toBeDefined();
      expect(result.metadata.pipelineTemplateCount).toBeGreaterThanOrEqual(4);
      expect(result.metadata.moduleRegistryCount).toBeGreaterThanOrEqual(4);
    });

    it('should generate assembly configuration with all components', async () => {
      const assemblyConfig = await generator.generateAssemblyConfig(complexConfig);
      
      expect(assemblyConfig).toBeDefined();
      expect(assemblyConfig.version).toBe('1.0.0');
      expect(assemblyConfig.routingRules).toBeDefined();
      expect(assemblyConfig.pipelineTemplates).toBeDefined();
      expect(assemblyConfig.moduleRegistry).toBeDefined();
      expect(assemblyConfig.assemblyStrategies).toBeDefined();
      
      // Check routing rules for fixed virtual models
      expect(assemblyConfig.routingRules.length).toBeGreaterThanOrEqual(4);
      
      // Check pipeline templates
      expect(assemblyConfig.pipelineTemplates.length).toBeGreaterThanOrEqual(4);
      
      // Check module registry - should have at least default modules plus provider modules
      expect(assemblyConfig.moduleRegistry.length).toBeGreaterThanOrEqual(4);
      
      // Verify module registry contains expected modules
      const moduleIds = assemblyConfig.moduleRegistry.map(m => m.moduleId);
      expect(moduleIds).toContain('compatibility-module');
      
      // Check for provider modules
      expect(moduleIds).toContain('provider-openai-gpt-3.5-turbo');
      expect(moduleIds).toContain('provider-anthropic-claude-2');
      expect(moduleIds).toContain('provider-google-gemini-pro');
    });

    it('should generate scheduler configuration with all sections', async () => {
      const assemblyConfig = await generator.generateAssemblyConfig(complexConfig);
      const schedulerConfig = await generator.generateSchedulerConfig(complexConfig, assemblyConfig);
      
      expect(schedulerConfig).toBeDefined();
      expect(schedulerConfig.basic).toBeDefined();
      expect(schedulerConfig.loadBalancing).toBeDefined();
      expect(schedulerConfig.healthCheck).toBeDefined();
      expect(schedulerConfig.errorHandling).toBeDefined();
      expect(schedulerConfig.performance).toBeDefined();
      expect(schedulerConfig.monitoring).toBeDefined();
      expect(schedulerConfig.security).toBeDefined();
      
      // Check load balancing configuration
      expect(schedulerConfig.loadBalancing.strategy).toBe('weighted');
      expect(schedulerConfig.loadBalancing.failover.enabled).toBe(true);
      expect(schedulerConfig.loadBalancing.failover.maxRetries).toBe(3);
      
      // Check health check configuration
      expect(schedulerConfig.healthCheck.strategy).toBe('hybrid');
      expect(schedulerConfig.healthCheck.intervals.activeCheckInterval).toBe(30000);
      
      // Check error handling configuration
      expect(schedulerConfig.errorHandling.errorClassification.enableAutomaticClassification).toBe(true);
      expect(schedulerConfig.errorHandling.strategies.unrecoverableErrors.action).toBe('destroy_pipeline');
      
      // Check performance configuration
      expect(schedulerConfig.performance.concurrency.maxConcurrentRequests).toBe(1000);
      expect(schedulerConfig.performance.timeouts.defaultTimeout).toBe(30000);
      
      // Check monitoring configuration
      expect(schedulerConfig.monitoring.metrics.enabled).toBe(true);
      expect(schedulerConfig.monitoring.logging.level).toBe('info');
    });
  });

  describe('Pipeline Table Generation', () => {
    it('should generate pipeline table with correct structure', async () => {
      const pipelineTable = await generator.generatePipelineTable(complexConfig);
      
      expect(pipelineTable).toBeDefined();
      expect(pipelineTable).toBeInstanceOf(Map);
      expect(pipelineTable.size).toBeGreaterThan(0);
      
      // Check that entries exist for our virtual models
      const entries = Array.from(pipelineTable.entries());
      expect(entries.length).toBeGreaterThan(0);
      
      // Check entry structure for all entries
      for (const [entryId, entry] of entries) {
        expect(entry.virtualModelId).toBeDefined();
        expect(entry.targetProvider).toBeDefined();
        expect(entry.targetModel).toBeDefined();
        expect(typeof entry.keyIndex).toBe('number');
        expect(typeof entry.priority).toBe('number');
        expect(typeof entry.enabled).toBe('boolean');
        expect(typeof entry.weight).toBe('number');
        
        // Check entry ID format
        expect(entryId).toMatch(/^[a-zA-Z0-9_-]+_[a-zA-Z0-9_-]+_[a-zA-Z0-9_-]+_\d+$/);
        
        // Check metadata
        expect(entry.metadata).toBeDefined();
        expect(entry.metadata?.providerType).toBeDefined();
        expect(entry.metadata?.createdAt).toBeDefined();
      }
    });

    it('should generate correct number of entries for multiple API keys', async () => {
      const pipelineTable = await generator.generatePipelineTable(complexConfig);
      
      // For openai gpt-3.5-turbo, should have entries for each API key when keyIndex is not specified
      // But in our config, we explicitly specify keyIndex, so should have only one entry per target
      const openaiEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.targetProvider === 'openai' && entry.targetModel === 'gpt-3.5-turbo'
      );
      
      // Should have one entry for each explicitly specified key
      expect(openaiEntries.length).toBe(1); // Only one target with keyIndex: 0
      
      // Check for openai gpt-4 entries
      const openai4Entries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.targetProvider === 'openai' && entry.targetModel === 'gpt-4'
      );
      
      // Should have 2 entries: one for keyIndex: 1 and one for keyIndex: 2
      expect(openai4Entries.length).toBe(2);
      
      // Check key indices
      const keyIndices = openai4Entries.map(([, entry]) => entry.keyIndex);
      expect(keyIndices).toContain(1);
      expect(keyIndices).toContain(2);
    });

    it('should correctly handle virtual model weights and priorities', async () => {
      const pipelineTable = await generator.generatePipelineTable(complexConfig);
      
      // Check entries for each virtual model
      const defaultEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.virtualModelId === 'default'
      );
      
      expect(defaultEntries.length).toBe(2); // Two targets
      
      // Check weights and priorities
      for (const [, entry] of defaultEntries) {
        expect(entry.priority).toBe(1);
        expect(entry.weight).toBe(60);
        expect(entry.enabled).toBe(true);
      }
      
      const thinkingEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.virtualModelId === 'thinking'
      );
      
      expect(thinkingEntries.length).toBe(1);
      expect(thinkingEntries[0][1].priority).toBe(2);
      expect(thinkingEntries[0][1].weight).toBe(40);
      expect(thinkingEntries[0][1].enabled).toBe(true);
      
      const codingEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.virtualModelId === 'coding'
      );
      
      expect(codingEntries.length).toBe(1);
      expect(codingEntries[0][1].priority).toBe(4);
      expect(codingEntries[0][1].weight).toBe(10);
      expect(codingEntries[0][1].enabled).toBe(false); // Should be disabled
    });
  });

  describe('Advanced Edge Cases', () => {
    it('should handle configuration with missing models', async () => {
      const configWithMissingModels: ConfigData = {
        ...complexConfig,
        virtualModels: {
          ...complexConfig.virtualModels,
          'invalid': {
            id: 'invalid',
            targets: [
              {
                providerId: 'openai',
                modelId: 'nonexistent-model',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1
          }
        }
      };
      
      const pipelineTable = await generator.generatePipelineTable(configWithMissingModels);
      
      // Should not create entries for nonexistent models
      const invalidEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.virtualModelId === 'invalid'
      );
      expect(invalidEntries.length).toBe(0);
    });

    it('should handle configuration with empty API key arrays', async () => {
      const configWithEmptyKeys: ConfigData = {
        ...complexConfig,
        providers: {
          ...complexConfig.providers,
          'openai': {
            ...complexConfig.providers.openai,
            auth: {
              type: 'api-key',
              keys: [] // Empty keys
            }
          }
        }
      };
      
      const pipelineTable = await generator.generatePipelineTable(configWithEmptyKeys);
      
      // Should not create entries for providers with no API keys
      const openaiEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.targetProvider === 'openai'
      );
      expect(openaiEntries.length).toBe(0);
    });

    it('should handle configuration with undefined keyIndex', async () => {
      const configWithUndefinedKeyIndex: ConfigData = {
        ...complexConfig,
        virtualModels: {
          ...complexConfig.virtualModels,
          'no-key-index': {
            id: 'no-key-index',
            targets: [
              {
                providerId: 'openai',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1,
            weight: 50
          }
        }
      };
      
      const pipelineTable = await generator.generatePipelineTable(configWithUndefinedKeyIndex);
      
      // Should create entries for each API key when keyIndex is undefined
      const noKeyIndexEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.virtualModelId === 'no-key-index'
      );
      
      // Should have one entry for each API key
      expect(noKeyIndexEntries.length).toBe(3); // 3 API keys for openai
      
      // Check key indices
      const keyIndices = noKeyIndexEntries.map(([, entry]) => entry.keyIndex);
      expect(keyIndices).toContain(0);
      expect(keyIndices).toContain(1);
      expect(keyIndices).toContain(2);
    });

    it('should handle configuration with no fixed virtual models', async () => {
      const configWithoutFixedModels: ConfigData = {
        ...complexConfig,
        virtualModels: {
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
        }
      };
      
      const pipelineTable = await generator.generatePipelineTable(configWithoutFixedModels);
      
      // Should not create entries for non-fixed virtual models
      expect(pipelineTable.size).toBe(0);
    });
  });

  describe('Validation Methods', () => {
    it('should validate pipeline table with multiple invalid entries', async () => {
      // Create an invalid pipeline table manually with multiple issues
      const invalidTable = new Map<string, any>([
        ['invalid_entry_1', {
          virtualModelId: 'default',
          // Missing targetProvider and targetModel
          keyIndex: 0
        }],
        ['invalid_entry_2', {
          virtualModelId: 'default',
          targetProvider: 'openai',
          targetModel: 'gpt-3.5-turbo',
          keyIndex: -1, // Invalid key index
          priority: 15 // Invalid priority
        }]
      ]);
      
      const validationResult = await generator.validatePipelineTable(invalidTable as PipelineTable);
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThanOrEqual(3);
      expect(validationResult.errors).toContain('Entry invalid_entry_1 missing target provider');
      expect(validationResult.errors).toContain('Entry invalid_entry_1 missing target model');
      expect(validationResult.errors).toContain('Entry invalid_entry_2 has invalid key index: -1');
      expect(validationResult.errors).toContain('Entry invalid_entry_2 has invalid priority: 15');
    });

    it('should validate completely empty pipeline table', async () => {
      const emptyTable = new Map<string, any>();
      const validationResult = await generator.validatePipelineTable(emptyTable as PipelineTable);
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should validate pipeline table with valid entries', async () => {
      const validTable = new Map<string, any>([
        ['valid_entry', {
          virtualModelId: 'default',
          targetProvider: 'openai',
          targetModel: 'gpt-3.5-turbo',
          keyIndex: 0,
          priority: 1,
          enabled: true,
          weight: 100,
          metadata: {
            providerType: 'openai',
            apiKey: 'test-key',
            createdAt: new Date().toISOString()
          }
        }]
      ]);
      
      const validationResult = await generator.validatePipelineTable(validTable as PipelineTable);
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large configuration with many providers and models efficiently', async () => {
      // Create a large configuration with many providers and models
      const largeConfig: ConfigData = {
        version: '1.0.0',
        providers: {},
        virtualModels: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add 10 providers with 5 models each
      for (let i = 0; i < 10; i++) {
        const providerId = `provider-${i}`;
        largeConfig.providers[providerId] = {
          id: providerId,
          name: `Provider ${i}`,
          type: 'generic',
          models: {},
          auth: {
            type: 'api-key',
            keys: [`key-${i}-1`, `key-${i}-2`, `key-${i}-3`]
          }
        };
        
        // Add 5 models per provider
        for (let j = 0; j < 5; j++) {
          const modelId = `model-${j}`;
          largeConfig.providers[providerId].models[modelId] = {
            id: modelId,
            name: `Model ${j}`,
            contextLength: 4096,
            supportsFunctions: true
          };
        }
      }
      
      // Add 5 virtual models with multiple targets
      for (let i = 0; i < 5; i++) {
        const vmId = `vm-${i}`;
        const targets = [];
        for (let j = 0; j < 3; j++) {
          targets.push({
            providerId: `provider-${i}`,
            modelId: `model-${j}`,
            keyIndex: j % 3
          });
        }
        largeConfig.virtualModels[vmId] = {
          id: vmId,
          targets,
          enabled: true,
          priority: (i % 5) + 1,
          weight: 100 / 5
        };
      }
      
      // Measure performance
      const start = Date.now();
      const pipelineTable = await generator.generatePipelineTable(largeConfig);
      const end = Date.now();
      
      // Should complete within reasonable time (less than 2 seconds for large config)
      expect(end - start).toBeLessThan(2000);
      
      // Should generate correct number of entries (5 virtual models * 3 targets each = 15)
      expect(pipelineTable.size).toBe(15);
    });

    it('should maintain consistency between different generation methods in complex scenarios', async () => {
      // Generate pipeline table
      const pipelineTable = await generator.generatePipelineTable(complexConfig);
      
      // Generate complete configuration
      const completeConfig = await generator.generateCompletePipelineConfig(complexConfig);
      
      // The assembly config should contain information consistent with the pipeline table
      expect(completeConfig.assemblyConfig.pipelineTemplates.length).toBeGreaterThanOrEqual(4);
      expect(completeConfig.metadata.virtualModelCount).toBe(4);
      
      // Check that routing rules exist for each fixed virtual model
      const routingRuleNames = completeConfig.assemblyConfig.routingRules.map(rule => rule.name);
      expect(routingRuleNames).toContain('Virtual Model default Routing');
      expect(routingRuleNames).toContain('Virtual Model thinking Routing');
      expect(routingRuleNames).toContain('Virtual Model longcontext Routing');
      expect(routingRuleNames).toContain('Virtual Model coding Routing');
      
      // Check weights in load balancing configuration
      const weights = completeConfig.schedulerConfig.loadBalancing.strategyConfig.weighted.weights;
      expect(Object.keys(weights)).toContain('pipeline-default');
      expect(Object.keys(weights)).toContain('pipeline-thinking');
      expect(Object.keys(weights)).toContain('pipeline-longcontext');
      expect(Object.keys(weights)).toContain('pipeline-coding');
    });
  });

  describe('Custom Fixed Virtual Models', () => {
    it('should work with custom fixed virtual models', async () => {
      const customGenerator = new EnhancedPipelineConfigGenerator(['custom-model', 'special-model']);
      await customGenerator.initialize();
      
      const customConfig: ConfigData = {
        ...complexConfig,
        virtualModels: {
          ...complexConfig.virtualModels,
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
          },
          'special-model': {
            id: 'special-model',
            targets: [
              {
                providerId: 'anthropic',
                modelId: 'claude-2',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 2
          }
        }
      };
      
      const pipelineTable = await customGenerator.generatePipelineTable(customConfig);
      
      // Should create entries for custom fixed models
      const customModelEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.virtualModelId === 'custom-model'
      );
      expect(customModelEntries.length).toBe(1);
      
      const specialModelEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.virtualModelId === 'special-model'
      );
      expect(specialModelEntries.length).toBe(1);
      
      // Should not create entries for default fixed models not in custom list
      const defaultEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.virtualModelId === 'default'
      );
      expect(defaultEntries.length).toBe(0);
      
      await customGenerator.destroy();
    });
  });
});