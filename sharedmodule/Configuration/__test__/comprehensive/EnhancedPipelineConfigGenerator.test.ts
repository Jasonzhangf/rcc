import { EnhancedPipelineConfigGenerator, ConfigData } from '../../src';

describe('EnhancedPipelineConfigGenerator', () => {
  let generator: EnhancedPipelineConfigGenerator;
  
  // Sample test configuration data
  const sampleConfig: ConfigData = {
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
          }
        },
        auth: {
          type: 'api-key',
          keys: ['test-key-1', 'test-key-2']
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
        priority: 1,
        weight: 100
      },
      'thinking': {
        id: 'thinking',
        targets: [
          {
            providerId: 'openai',
            modelId: 'gpt-4',
            keyIndex: 1
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
    generator = new EnhancedPipelineConfigGenerator();
    await generator.initialize();
  });

  afterEach(async () => {
    if (generator) {
      await generator.destroy();
    }
  });

  describe('Initialization', () => {
    it('should create an EnhancedPipelineConfigGenerator instance', () => {
      expect(generator).toBeDefined();
      expect(typeof generator.initialize).toBe('function');
      expect(typeof generator.destroy).toBe('function');
    });

    it('should initialize successfully', async () => {
      const newGenerator = new EnhancedPipelineConfigGenerator();
      await expect(newGenerator.initialize()).resolves.not.toThrow();
      await newGenerator.destroy();
    });
  });

  describe('Pipeline Generation', () => {
    it('should generate complete pipeline configuration', async () => {
      const result = await generator.generateCompletePipelineConfig(sampleConfig);
      
      expect(result).toBeDefined();
      expect(result.assemblyConfig).toBeDefined();
      expect(result.schedulerConfig).toBeDefined();
      expect(result.metadata).toBeDefined();
      
      // Check metadata
      expect(result.metadata.configVersion).toBe('1.0.0');
      expect(result.metadata.virtualModelCount).toBe(2);
      expect(result.metadata.generatedAt).toBeDefined();
    });

    it('should generate assembly configuration', async () => {
      const assemblyConfig = await generator.generateAssemblyConfig(sampleConfig);
      
      expect(assemblyConfig).toBeDefined();
      expect(assemblyConfig.version).toBe('1.0.0');
      expect(assemblyConfig.routingRules).toBeDefined();
      expect(assemblyConfig.pipelineTemplates).toBeDefined();
      expect(assemblyConfig.moduleRegistry).toBeDefined();
      expect(assemblyConfig.assemblyStrategies).toBeDefined();
      
      // Check routing rules
      expect(assemblyConfig.routingRules.length).toBeGreaterThanOrEqual(2);
      
      // Check pipeline templates
      expect(assemblyConfig.pipelineTemplates.length).toBeGreaterThanOrEqual(2);
      
      // Check module registry
      expect(assemblyConfig.moduleRegistry.length).toBeGreaterThanOrEqual(2);
    });

    it('should generate scheduler configuration', async () => {
      const assemblyConfig = await generator.generateAssemblyConfig(sampleConfig);
      const schedulerConfig = await generator.generateSchedulerConfig(sampleConfig, assemblyConfig);
      
      expect(schedulerConfig).toBeDefined();
      expect(schedulerConfig.basic).toBeDefined();
      expect(schedulerConfig.loadBalancing).toBeDefined();
      expect(schedulerConfig.healthCheck).toBeDefined();
      expect(schedulerConfig.errorHandling).toBeDefined();
      expect(schedulerConfig.performance).toBeDefined();
      expect(schedulerConfig.monitoring).toBeDefined();
      expect(schedulerConfig.security).toBeDefined();
    });

    it('should generate pipeline table', async () => {
      const pipelineTable = await generator.generatePipelineTable(sampleConfig);
      
      expect(pipelineTable).toBeDefined();
      expect(pipelineTable.size).toBeGreaterThan(0);
      
      // Check that entries exist for our virtual models
      const entries = Array.from(pipelineTable.entries());
      expect(entries.length).toBeGreaterThan(0);
      
      // Check entry structure
      for (const [entryId, entry] of entries) {
        expect(entry.virtualModelId).toBeDefined();
        expect(entry.targetProvider).toBeDefined();
        expect(entry.targetModel).toBeDefined();
        expect(typeof entry.keyIndex).toBe('number');
        expect(typeof entry.priority).toBe('number');
        expect(typeof entry.enabled).toBe('boolean');
      }
    });

    it('should validate pipeline table', async () => {
      const pipelineTable = await generator.generatePipelineTable(sampleConfig);
      const validationResult = await generator.validatePipelineTable(pipelineTable);
      
      expect(validationResult).toBeDefined();
      expect(typeof validationResult.valid).toBe('boolean');
      expect(Array.isArray(validationResult.errors)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty configuration', async () => {
      const emptyConfig: ConfigData = {
        version: '1.0.0',
        providers: {},
        virtualModels: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const result = await generator.generateCompletePipelineConfig(emptyConfig);
      expect(result).toBeDefined();
      expect(result.assemblyConfig.routingRules).toEqual([]);
      expect(result.assemblyConfig.pipelineTemplates).toEqual([]);
    });

    it('should handle configuration with missing providers', async () => {
      const configWithMissingProviders: ConfigData = {
        version: '1.0.0',
        providers: {},
        virtualModels: {
          'default': {
            id: 'default',
            targets: [
              {
                providerId: 'nonexistent',
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
      
      const pipelineTable = await generator.generatePipelineTable(configWithMissingProviders);
      // Should handle missing providers gracefully
      expect(pipelineTable).toBeDefined();
    });
  });
});