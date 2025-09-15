import { EnhancedPipelineConfigConverter } from '../../src/core/PipelineConfigConverter';
import { ConfigData } from '../../src/core/ConfigData';

describe('EnhancedPipelineConfigConverter', () => {
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
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  describe('Configuration Conversion', () => {
    it('should convert config data to complete pipeline configuration', () => {
      const result = EnhancedPipelineConfigConverter.convertFromConfigData(sampleConfig);
      
      expect(result).toBeDefined();
      expect(result.assemblyConfig).toBeDefined();
      expect(result.schedulerConfig).toBeDefined();
      expect(result.metadata).toBeDefined();
      
      // Check metadata
      expect(result.metadata.configVersion).toBe('1.0.0');
      expect(result.metadata.virtualModelCount).toBe(1);
      expect(result.metadata.generatedAt).toBeDefined();
    });

    it('should convert config data to assembly table', () => {
      const assemblyTable = EnhancedPipelineConfigConverter.convertToAssemblyTable(sampleConfig);
      
      expect(assemblyTable).toBeDefined();
      expect(assemblyTable.version).toBe('1.0.0');
      expect(assemblyTable.routingRules).toBeDefined();
      expect(assemblyTable.pipelineTemplates).toBeDefined();
      expect(assemblyTable.moduleRegistry).toBeDefined();
      expect(assemblyTable.assemblyStrategies).toBeDefined();
    });

    it('should convert config data to scheduler configuration', () => {
      const assemblyTable = EnhancedPipelineConfigConverter.convertToAssemblyTable(sampleConfig);
      const schedulerConfig = EnhancedPipelineConfigConverter.convertToSchedulerConfig(sampleConfig, assemblyTable);
      
      expect(schedulerConfig).toBeDefined();
      expect(schedulerConfig.basic).toBeDefined();
      expect(schedulerConfig.loadBalancing).toBeDefined();
      expect(schedulerConfig.healthCheck).toBeDefined();
      expect(schedulerConfig.errorHandling).toBeDefined();
      expect(schedulerConfig.performance).toBeDefined();
      expect(schedulerConfig.monitoring).toBeDefined();
      expect(schedulerConfig.security).toBeDefined();
    });

    it('should handle conversion options', () => {
      const options = {
        generateSchedulerConfig: false,
        includeMonitoring: false,
        includeHealthChecks: false
      };
      
      const result = EnhancedPipelineConfigConverter.convertFromConfigData(sampleConfig, options);
      
      expect(result).toBeDefined();
      expect(result.assemblyConfig).toBeDefined();
      // Should have minimal scheduler config when disabled
      expect(result.schedulerConfig).toBeDefined();
    });
  });

  describe('Pipeline Table Conversion', () => {
    it('should convert to system configuration', () => {
      const pipelineTable = {
        'default_openai_gpt-3.5-turbo_0': {
          virtualModelId: 'default',
          targetProvider: 'openai',
          targetModel: 'gpt-3.5-turbo',
          apiKeyIndex: 0,
          enabled: true,
          priority: 1
        }
      };
      
      const systemConfig = EnhancedPipelineConfigConverter.convertToSystemConfig(pipelineTable);
      
      expect(systemConfig).toBeDefined();
      expect(systemConfig.loadBalancer).toBeDefined();
      expect(systemConfig.scheduler).toBeDefined();
      expect(systemConfig.pipelines).toBeDefined();
      expect(systemConfig.pipelines.length).toBe(1);
      
      const pipeline = systemConfig.pipelines[0];
      expect(pipeline.id).toBe('default_openai_gpt-3.5-turbo_0');
      expect(pipeline.name).toBe('Pipeline for default (openai/gpt-3.5-turbo)');
      expect(pipeline.enabled).toBe(true);
      expect(pipeline.priority).toBe(1);
    });

    it('should validate pipeline table', () => {
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
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty configuration', () => {
      const emptyConfig: ConfigData = {
        version: '1.0.0',
        providers: {},
        virtualModels: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const result = EnhancedPipelineConfigConverter.convertFromConfigData(emptyConfig);
      expect(result).toBeDefined();
      expect(result.assemblyConfig.routingRules).toEqual([]);
      expect(result.assemblyConfig.pipelineTemplates).toEqual([]);
    });

    it('should handle configuration with custom overrides', () => {
      const options = {
        customOverrides: {
          assemblyConfig: {
            version: '2.0.0'
          },
          schedulerConfig: {
            basic: {
              schedulerId: 'custom-scheduler',
              name: 'Custom Scheduler',
              version: '2.0.0',
              description: 'Custom scheduler configuration'
            }
          }
        }
      };
      
      const result = EnhancedPipelineConfigConverter.convertFromConfigData(sampleConfig, options);
      
      expect(result.assemblyConfig.version).toBe('2.0.0');
      expect(result.schedulerConfig.basic.schedulerId).toBe('custom-scheduler');
      expect(result.schedulerConfig.basic.name).toBe('Custom Scheduler');
    });
  });
});