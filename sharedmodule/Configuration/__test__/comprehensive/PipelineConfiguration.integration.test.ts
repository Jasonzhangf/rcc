import { EnhancedPipelineConfigGenerator, EnhancedPipelineConfigConverter, ConfigData } from '../../src';

describe('Pipeline Configuration Integration Tests', () => {
  // Complex configuration example
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
          keys: ['openai-key-1', 'openai-key-2', 'openai-key-3']
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
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  describe('Complex Configuration Scenarios', () => {
    let generator: EnhancedPipelineConfigGenerator;
    
    beforeEach(async () => {
      generator = new EnhancedPipelineConfigGenerator();
      await generator.initialize();
    });
    
    afterEach(async () => {
      if (generator) {
        await generator.destroy();
      }
    });
    
    test('should handle complex multi-provider configuration', async () => {
      const pipelineTable = await generator.generatePipelineTable(complexConfig);
      
      expect(pipelineTable).toBeInstanceOf(Map);
      // Should have 3 entries: 2 for openai keys (keyIndex 0 and 1) + 1 for anthropic
      expect(pipelineTable.size).toBe(3);
      
      // Check openai entries
      const openaiEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.targetProvider === 'openai'
      );
      expect(openaiEntries).toHaveLength(2);
      
      // Check anthropic entry
      const anthropicEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.targetProvider === 'anthropic'
      );
      expect(anthropicEntries).toHaveLength(1);
    });
    
    test('should generate complete pipeline configuration with complex setup', async () => {
      const completeConfig = await generator.generateCompletePipelineConfig(complexConfig);
      
      expect(completeConfig).toBeDefined();
      expect(completeConfig.assemblyConfig).toBeDefined();
      expect(completeConfig.schedulerConfig).toBeDefined();
      expect(completeConfig.metadata).toBeDefined();
      
      // Check assembly config contents
      expect(completeConfig.assemblyConfig.routingRules).toHaveLength(2);
      expect(completeConfig.assemblyConfig.pipelineTemplates).toHaveLength(2);
      expect(completeConfig.assemblyConfig.moduleRegistry).toHaveLength(4); // 1 default + 3 provider modules
      
      // Check scheduler config
      expect(completeConfig.schedulerConfig.loadBalancing.strategy).toBe('weighted');
      expect(completeConfig.schedulerConfig.healthCheck.strategy).toBe('hybrid');
    });
  });
  
  describe('Error Handling and Validation', () => {
    let generator: EnhancedPipelineConfigGenerator;
    
    beforeEach(async () => {
      generator = new EnhancedPipelineConfigGenerator();
      await generator.initialize();
    });
    
    afterEach(async () => {
      if (generator) {
        await generator.destroy();
      }
    });
    
    test('should handle missing provider gracefully', async () => {
      const configWithMissingProvider: ConfigData = {
        ...complexConfig,
        virtualModels: {
          ...complexConfig.virtualModels,
          'invalid': {
            id: 'invalid',
            targets: [
              {
                providerId: 'nonexistent',
                modelId: 'model-1',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1
          }
        }
      };
      
      const pipelineTable = await generator.generatePipelineTable(configWithMissingProvider);
      
      // Should not include the invalid entry
      expect(pipelineTable.size).toBe(3); // Still 3 from valid entries
      
      const invalidEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.targetProvider === 'nonexistent'
      );
      expect(invalidEntries).toHaveLength(0);
    });
    
    test('should validate pipeline table entries', async () => {
      const pipelineTable = await generator.generatePipelineTable(complexConfig);
      const validationResult = await generator.validatePipelineTable(pipelineTable);
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });
    
    test('should detect invalid pipeline table entries', async () => {
      // Create an invalid table with missing required fields
      const invalidTable: any = new Map([
        ['invalid_entry', {
          virtualModelId: 'default',
          // Missing targetProvider and targetModel
          keyIndex: 0
        }]
      ]);
      
      const validationResult = await generator.validatePipelineTable(invalidTable);
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toHaveLength(2);
    });
  });
  
  describe('Edge Cases', () => {
    let generator: EnhancedPipelineConfigGenerator;
    
    beforeEach(async () => {
      generator = new EnhancedPipelineConfigGenerator();
      await generator.initialize();
    });
    
    afterEach(async () => {
      if (generator) {
        await generator.destroy();
      }
    });
    
    test('should handle empty configuration', async () => {
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
      
      const completeConfig = await generator.generateCompletePipelineConfig(emptyConfig);
      expect(completeConfig.assemblyConfig.routingRules).toHaveLength(0);
      expect(completeConfig.assemblyConfig.pipelineTemplates).toHaveLength(0);
    });
    
    test('should handle configuration with no API keys', async () => {
      const configWithoutKeys: ConfigData = {
        ...complexConfig,
        providers: {
          ...complexConfig.providers,
          'openai': {
            ...complexConfig.providers.openai,
            auth: {
              type: 'api-key',
              keys: []
            }
          }
        }
      };
      
      const pipelineTable = await generator.generatePipelineTable(configWithoutKeys);
      
      // Should still create entries but with empty keys
      expect(pipelineTable.size).toBe(1); // Only anthropic entry since openai has no keys
      
      const openaiEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.targetProvider === 'openai'
      );
      expect(openaiEntries).toHaveLength(0);
    });
    
    test('should handle configuration with invalid key indices', async () => {
      const configWithInvalidKeyIndex: ConfigData = {
        ...complexConfig,
        virtualModels: {
          ...complexConfig.virtualModels,
          'default': {
            ...complexConfig.virtualModels.default,
            targets: [
              {
                providerId: 'openai',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 999 // Invalid index
              }
            ]
          }
        }
      };
      
      const pipelineTable = await generator.generatePipelineTable(configWithInvalidKeyIndex);
      
      // Should filter out entries with invalid key indices when provider has fewer keys
      const openaiEntries = Array.from(pipelineTable.entries()).filter(([id, entry]) => 
        entry.targetProvider === 'openai' && entry.targetModel === 'gpt-3.5-turbo'
      );
      // Since openai only has 3 keys (0, 1, 2), key index 999 is invalid and should be filtered out
      expect(openaiEntries).toHaveLength(0);
    });
  });
  
  describe('EnhancedPipelineConfigConverter Integration Tests', () => {
    test('should convert complex configuration with all options', () => {
      const result = EnhancedPipelineConfigConverter.convertFromConfigData(complexConfig);
      
      expect(result).toBeDefined();
      expect(result.assemblyConfig).toBeDefined();
      expect(result.schedulerConfig).toBeDefined();
      expect(result.metadata).toBeDefined();
      
      // Check metadata
      expect(result.metadata.virtualModelCount).toBe(2);
      expect(result.metadata.pipelineTemplateCount).toBe(2);
    });
    
    test('should handle conversion options', () => {
      const options = {
        generateSchedulerConfig: false,
        includeMonitoring: false,
        includeHealthChecks: false
      };
      
      const result = EnhancedPipelineConfigConverter.convertFromConfigData(complexConfig, options);
      
      expect(result).toBeDefined();
      expect(result.assemblyConfig).toBeDefined();
      expect(result.schedulerConfig).toBeDefined();
    });
    
    test('should convert to system configuration', () => {
      const pipelineTable = {
        'default_openai_gpt-3.5-turbo_0': {
          virtualModelId: 'default',
          targetProvider: 'openai',
          targetModel: 'gpt-3.5-turbo',
          apiKeyIndex: 0,
          enabled: true,
          priority: 1
        },
        'thinking_anthropic_claude-2_0': {
          virtualModelId: 'thinking',
          targetProvider: 'anthropic',
          targetModel: 'claude-2',
          apiKeyIndex: 0,
          enabled: true,
          priority: 2
        }
      };
      
      const systemConfig = EnhancedPipelineConfigConverter.convertToSystemConfig(pipelineTable);
      
      expect(systemConfig).toBeDefined();
      expect(systemConfig.pipelines).toHaveLength(2);
      
      // Check pipeline configurations
      expect(systemConfig.pipelines[0].id).toBe('default_openai_gpt-3.5-turbo_0');
      expect(systemConfig.pipelines[1].id).toBe('thinking_anthropic_claude-2_0');
      expect(systemConfig.pipelines[0].enabled).toBe(true);
      expect(systemConfig.pipelines[1].enabled).toBe(true);
    });
    
    test('should validate pipeline table format', () => {
      const validTable = {
        'default_openai_gpt-3.5-turbo_0': {
          virtualModelId: 'default',
          targetProvider: 'openai',
          targetModel: 'gpt-3.5-turbo',
          apiKeyIndex: 0,
          enabled: true,
          priority: 1
        }
      };
      
      const invalidTable: any = {
        'invalid_entry': {
          virtualModelId: 'default',
          // Missing required fields
        }
      };
      
      expect(EnhancedPipelineConfigConverter.validatePipelineTable(validTable)).toBe(true);
      expect(EnhancedPipelineConfigConverter.validatePipelineTable(invalidTable)).toBe(false);
      expect(EnhancedPipelineConfigConverter.validatePipelineTable(null as any)).toBe(false);
      expect(EnhancedPipelineConfigConverter.validatePipelineTable(undefined as any)).toBe(false);
    });
  });
  
  describe('Integration Tests', () => {
    let generator: EnhancedPipelineConfigGenerator;
    
    beforeEach(async () => {
      generator = new EnhancedPipelineConfigGenerator();
      await generator.initialize();
    });
    
    afterEach(async () => {
      if (generator) {
        await generator.destroy();
      }
    });
    
    test('should integrate Generator and Converter correctly', async () => {
      // Generate pipeline table using Generator
      const pipelineTable = await generator.generatePipelineTable(complexConfig);
      
      // Convert to system config using Converter
      const pipelineTableObj: any = {};
      for (const [key, entry] of pipelineTable.entries()) {
        pipelineTableObj[key] = {
          virtualModelId: entry.virtualModelId,
          targetProvider: entry.targetProvider,
          targetModel: entry.targetModel,
          apiKeyIndex: entry.keyIndex,
          enabled: entry.enabled,
          priority: entry.priority
        };
      }
      const systemConfig = EnhancedPipelineConfigConverter.convertToSystemConfig(pipelineTableObj);
      
      // Validate integration
      expect(systemConfig.pipelines).toHaveLength(pipelineTable.size);
      
      // Check that all pipeline IDs match
      const pipelineIds = Array.from(pipelineTable.keys());
      const systemPipelineIds = systemConfig.pipelines.map(p => p.id);
      
      pipelineIds.forEach(id => {
        expect(systemPipelineIds).toContain(id);
      });
    });
    
    test('should maintain data consistency between Generator and Converter', async () => {
      // Generate complete config using Generator
      const generatedConfig = await generator.generateCompletePipelineConfig(complexConfig);
      
      // Convert using Converter
      const convertedConfig = EnhancedPipelineConfigConverter.convertFromConfigData(complexConfig);
      
      // Check consistency
      expect(generatedConfig.metadata.virtualModelCount).toBe(convertedConfig.metadata.virtualModelCount);
      expect(generatedConfig.assemblyConfig.routingRules.length).toBe(convertedConfig.assemblyConfig.routingRules.length);
    });
  });
  
  describe('Performance Tests', () => {
    let generator: EnhancedPipelineConfigGenerator;
    
    beforeEach(async () => {
      generator = new EnhancedPipelineConfigGenerator();
      await generator.initialize();
    });
    
    afterEach(async () => {
      if (generator) {
        await generator.destroy();
      }
    });
    
    test('should handle large configuration efficiently', async () => {
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
            keys: [`key-${i}-1`, `key-${i}-2`]
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
      
      // Add 20 virtual models
      for (let i = 0; i < 20; i++) {
        const vmId = `vm-${i}`;
        largeConfig.virtualModels[vmId] = {
          id: vmId,
          targets: [
            {
              providerId: `provider-${i % 10}`,
              modelId: `model-${i % 5}`,
              keyIndex: i % 2
            }
          ],
          enabled: true,
          priority: (i % 5) + 1,
          weight: 100 / 20
        };
      }
      
      // Measure performance
      const start = Date.now();
      const pipelineTable = await generator.generatePipelineTable(largeConfig);
      const end = Date.now();
      
      // Should complete within reasonable time (less than 1 second)
      expect(end - start).toBeLessThan(1000);
      
      // Should generate correct number of entries (20 virtual models * 1 target each, but only if keyIndex is valid)
      // Each target uses keyIndex i % 2, and each provider has 2 keys, so all should be valid
      expect(pipelineTable.size).toBe(20);
    });
  });
});