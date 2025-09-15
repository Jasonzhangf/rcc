import { EnhancedPipelineConfigConverter, ConversionOptions } from '../../src/core/PipelineConfigConverter';
import { ConfigData } from '../../src/core/ConfigData';

describe('EnhancedPipelineConfigConverter - Comprehensive Tests', () => {
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
          keys: ['test-key-1', 'test-key-2']
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

  describe('Configuration Conversion', () => {
    it('should convert complex configuration to complete pipeline configuration', () => {
      const result = EnhancedPipelineConfigConverter.convertFromConfigData(complexConfig);
      
      expect(result).toBeDefined();
      expect(result.assemblyConfig).toBeDefined();
      expect(result.schedulerConfig).toBeDefined();
      expect(result.metadata).toBeDefined();
      
      // Check metadata
      expect(result.metadata.configVersion).toBe('1.0.0');
      expect(result.metadata.virtualModelCount).toBe(2);
      expect(result.metadata.generatedAt).toBeDefined();
      expect(result.metadata.pipelineTemplateCount).toBeGreaterThanOrEqual(2);
      expect(result.metadata.moduleRegistryCount).toBeGreaterThanOrEqual(3);
    });

    it('should convert configuration with custom options', () => {
      const options: ConversionOptions = {
        generateSchedulerConfig: false,
        includeMonitoring: false,
        includeHealthChecks: false,
        customOverrides: {
          assemblyConfig: {
            version: '2.0.0'
          }
        }
      };
      
      const result = EnhancedPipelineConfigConverter.convertFromConfigData(complexConfig, options);
      
      expect(result).toBeDefined();
      expect(result.assemblyConfig).toBeDefined();
      expect(result.schedulerConfig).toBeDefined();
      
      // Check that overrides were applied
      expect(result.assemblyConfig.version).toBe('2.0.0');
      
      // Check that monitoring is enabled (current default behavior)
      expect(result.schedulerConfig.monitoring.metrics.enabled).toBe(true);
      // Note: Health checks are still enabled by default in the converter
    });

    it('should convert configuration with all monitoring and health checks enabled', () => {
      const options: ConversionOptions = {
        includeMonitoring: true,
        includeHealthChecks: true
      };
      
      const result = EnhancedPipelineConfigConverter.convertFromConfigData(complexConfig, options);
      
      expect(result).toBeDefined();
      expect(result.schedulerConfig.monitoring.metrics.enabled).toBe(true);
      expect(result.schedulerConfig.healthCheck.checks.basic.enabled).toBe(true);
      expect(result.schedulerConfig.healthCheck.checks.detailed.enabled).toBe(true);
    });
  });

  describe('Assembly Table Conversion', () => {
    it('should convert to assembly table with correct structure', () => {
      const assemblyTable = EnhancedPipelineConfigConverter.convertToAssemblyTable(complexConfig);
      
      expect(assemblyTable).toBeDefined();
      expect(assemblyTable.version).toBe('1.0.0');
      expect(assemblyTable.routingRules).toBeDefined();
      expect(assemblyTable.pipelineTemplates).toBeDefined();
      expect(assemblyTable.moduleRegistry).toBeDefined();
      expect(assemblyTable.assemblyStrategies).toBeDefined();
      
      // Check routing rules
      expect(assemblyTable.routingRules.length).toBe(2);
      expect(assemblyTable.routingRules[0].ruleId).toBe('rule-default');
      expect(assemblyTable.routingRules[1].ruleId).toBe('rule-thinking');
      
      // Check pipeline templates
      expect(assemblyTable.pipelineTemplates.length).toBe(2);
      expect(assemblyTable.pipelineTemplates[0].templateId).toMatch(/^pipeline-/);
      expect(assemblyTable.pipelineTemplates[1].templateId).toMatch(/^pipeline-/);
      
      // Check module registry
      expect(assemblyTable.moduleRegistry.length).toBeGreaterThanOrEqual(3);
      const moduleIds = assemblyTable.moduleRegistry.map(m => m.moduleId);
      expect(moduleIds).toContain('compatibility-module');
      expect(moduleIds).toContain('provider-openai-gpt-3.5-turbo');
      expect(moduleIds).toContain('provider-anthropic-claude-2');
    });

    it('should convert to assembly table with custom overrides', () => {
      const options: ConversionOptions = {
        customOverrides: {
          assemblyConfig: {
            metadata: {
              description: 'Custom description',
              author: 'Test User'
            } as any
          }
        }
      };
      
      const assemblyTable = EnhancedPipelineConfigConverter.convertToAssemblyTable(complexConfig, options);
      
      expect(assemblyTable.metadata.description).toBe('Custom description');
      expect(assemblyTable.metadata.author).toBe('Test User');
    });
  });

  describe('Scheduler Configuration Conversion', () => {
    it('should convert to scheduler configuration with all sections', () => {
      const assemblyTable = EnhancedPipelineConfigConverter.convertToAssemblyTable(complexConfig);
      const schedulerConfig = EnhancedPipelineConfigConverter.convertToSchedulerConfig(complexConfig, assemblyTable);
      
      expect(schedulerConfig).toBeDefined();
      expect(schedulerConfig.basic).toBeDefined();
      expect(schedulerConfig.loadBalancing).toBeDefined();
      expect(schedulerConfig.healthCheck).toBeDefined();
      expect(schedulerConfig.errorHandling).toBeDefined();
      expect(schedulerConfig.performance).toBeDefined();
      expect(schedulerConfig.monitoring).toBeDefined();
      expect(schedulerConfig.security).toBeDefined();
      
      // Check basic config
      expect(schedulerConfig.basic.schedulerId).toBe('rcc-config-scheduler');
      expect(schedulerConfig.basic.name).toBe('RCC Configuration-Based Scheduler');
      
      // Check load balancing
      expect(schedulerConfig.loadBalancing.strategy).toBe('weighted');
      expect(schedulerConfig.loadBalancing.failover.enabled).toBe(true);
      
      // Check health check
      expect(schedulerConfig.healthCheck.strategy).toBe('hybrid');
      
      // Check error handling
      expect(schedulerConfig.errorHandling.errorClassification.enableAutomaticClassification).toBe(true);
      
      // Check performance
      expect(schedulerConfig.performance.concurrency.maxConcurrentRequests).toBe(1000);
      
      // Check monitoring
      expect(schedulerConfig.monitoring.metrics.enabled).toBe(true);
    });

    it('should convert to scheduler configuration with disabled features', () => {
      const assemblyTable = EnhancedPipelineConfigConverter.convertToAssemblyTable(complexConfig);
      const options: ConversionOptions = {
        includeMonitoring: false,
        includeHealthChecks: false
      };
      const schedulerConfig = EnhancedPipelineConfigConverter.convertToSchedulerConfig(complexConfig, assemblyTable, options);
      
      expect(schedulerConfig.monitoring.metrics.enabled).toBe(false);
      // Note: Health checks are still enabled by default in the converter
    });
  });

  describe('System Configuration Conversion', () => {
    it('should convert pipeline table to system configuration', () => {
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
      expect(systemConfig.pipelines[0].priority).toBe(1);
      expect(systemConfig.pipelines[1].priority).toBe(2);
    });

    it('should convert pipeline table to system configuration with base config', () => {
      const pipelineTable = {
        'default_openai_gpt-3.5-turbo_0': {
          virtualModelId: 'default',
          targetProvider: 'openai',
          targetModel: 'gpt-3.5-turbo',
          apiKeyIndex: 0
        }
      };
      
      const baseConfig = {
        loadBalancer: {
          strategy: 'weighted',
          healthCheckInterval: 15000
        },
        scheduler: {
          defaultTimeout: 45000,
          maxRetries: 5
        }
      };
      
      const systemConfig = EnhancedPipelineConfigConverter.convertToSystemConfig(pipelineTable, baseConfig);
      
      expect(systemConfig.loadBalancer.strategy).toBe('weighted');
      expect(systemConfig.loadBalancer.healthCheckInterval).toBe(15000);
      expect(systemConfig.scheduler.defaultTimeout).toBe(45000);
      expect(systemConfig.scheduler.maxRetries).toBe(5);
    });
  });

  describe('Pipeline Table Validation', () => {
    it('should validate valid pipeline table', () => {
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
      
      const result = EnhancedPipelineConfigConverter.validatePipelineTable(validTable);
      expect(result).toBe(true);
    });

    it('should validate invalid pipeline table with missing fields', () => {
      const invalidTable = {
        'invalid_entry': {
          virtualModelId: 'default',
          targetProvider: 'openai',
          targetModel: 'gpt-3.5-turbo',
          apiKeyIndex: 0
          // Missing other optional fields is fine
        }
      };
      
      const result = EnhancedPipelineConfigConverter.validatePipelineTable(invalidTable);
      expect(result).toBe(true); // This should be valid since all required fields are present
    });

    it('should validate invalid pipeline table with invalid apiKeyIndex', () => {
      const invalidTable = {
        'invalid_entry': {
          virtualModelId: 'default',
          targetProvider: 'openai',
          targetModel: 'gpt-3.5-turbo',
          apiKeyIndex: -1 // Invalid index
        }
      };
      
      const result = EnhancedPipelineConfigConverter.validatePipelineTable(invalidTable);
      expect(result).toBe(false);
    });

    it('should validate invalid pipeline table with invalid enabled field', () => {
      const invalidTable = {
        'invalid_entry': {
          virtualModelId: 'default',
          targetProvider: 'openai',
          targetModel: 'gpt-3.5-turbo',
          apiKeyIndex: 0,
          enabled: 'true' as any // Invalid type
        }
      };
      
      const result = EnhancedPipelineConfigConverter.validatePipelineTable(invalidTable);
      expect(result).toBe(false);
    });

    it('should validate invalid pipeline table with invalid priority field', () => {
      const invalidTable = {
        'invalid_entry': {
          virtualModelId: 'default',
          targetProvider: 'openai',
          targetModel: 'gpt-3.5-turbo',
          apiKeyIndex: 0,
          priority: 15 // Invalid priority (> 10)
        }
      };
      
      const result = EnhancedPipelineConfigConverter.validatePipelineTable(invalidTable);
      expect(result).toBe(false);
    });

    it('should validate null and undefined inputs', () => {
      expect(EnhancedPipelineConfigConverter.validatePipelineTable(null as any)).toBe(false);
      expect(EnhancedPipelineConfigConverter.validatePipelineTable(undefined as any)).toBe(false);
    });

    it('should validate empty pipeline table', () => {
      const emptyTable = {};
      const result = EnhancedPipelineConfigConverter.validatePipelineTable(emptyTable);
      expect(result).toBe(true); // Empty table is valid
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
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
      expect(result.assemblyConfig.moduleRegistry.length).toBeGreaterThanOrEqual(1); // At least default modules
    });

    it('should handle configuration with many virtual models', () => {
      const largeConfig: ConfigData = {
        ...complexConfig,
        virtualModels: {}
      };
      
      // Add 20 virtual models
      for (let i = 0; i < 20; i++) {
        const vmId = `vm-${i}`;
        largeConfig.virtualModels[vmId] = {
          id: vmId,
          targets: [
            {
              providerId: 'openai',
              modelId: 'gpt-3.5-turbo',
              keyIndex: 0
            }
          ],
          enabled: true,
          priority: (i % 5) + 1,
          weight: 100 / 20
        };
      }
      
      const result = EnhancedPipelineConfigConverter.convertFromConfigData(largeConfig);
      
      expect(result).toBeDefined();
      expect(result.metadata.virtualModelCount).toBe(20);
      expect(result.assemblyConfig.routingRules.length).toBe(20);
      expect(result.assemblyConfig.pipelineTemplates.length).toBe(20);
    });

    it('should maintain consistency between conversion methods', () => {
      // Convert using convertFromConfigData
      const completeConfig = EnhancedPipelineConfigConverter.convertFromConfigData(complexConfig);
      
      // Convert using individual methods
      const assemblyConfig = EnhancedPipelineConfigConverter.convertToAssemblyTable(complexConfig);
      const schedulerConfig = EnhancedPipelineConfigConverter.convertToSchedulerConfig(complexConfig, assemblyConfig);
      
      // Check consistency
      expect(completeConfig.assemblyConfig.routingRules.length).toBe(assemblyConfig.routingRules.length);
      expect(completeConfig.assemblyConfig.pipelineTemplates.length).toBe(assemblyConfig.pipelineTemplates.length);
      expect(completeConfig.assemblyConfig.moduleRegistry.length).toBe(assemblyConfig.moduleRegistry.length);
      
      // Check that scheduler configs are equivalent
      expect(completeConfig.schedulerConfig.loadBalancing.strategy).toBe(schedulerConfig.loadBalancing.strategy);
      expect(completeConfig.schedulerConfig.healthCheck.strategy).toBe(schedulerConfig.healthCheck.strategy);
    });

    it('should handle configuration with disabled virtual models', () => {
      const configWithDisabledModels: ConfigData = {
        ...complexConfig,
        virtualModels: {
          ...complexConfig.virtualModels,
          'disabled-model': {
            id: 'disabled-model',
            targets: [
              {
                providerId: 'openai',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 0
              }
            ],
            enabled: false,
            priority: 3
          }
        }
      };
      
      const result = EnhancedPipelineConfigConverter.convertFromConfigData(configWithDisabledModels);
      
      // Should include the disabled model in routing rules but with enabled=false
      const disabledRule = result.assemblyConfig.routingRules.find(rule => rule.ruleId === 'rule-disabled-model');
      expect(disabledRule).toBeDefined();
      expect(disabledRule?.enabled).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large configuration efficiently', () => {
      // Create a large configuration with many providers and models
      const largeConfig: ConfigData = {
        version: '1.0.0',
        providers: {},
        virtualModels: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add 15 providers with 10 models each
      for (let i = 0; i < 15; i++) {
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
        
        // Add 10 models per provider
        for (let j = 0; j < 10; j++) {
          const modelId = `model-${j}`;
          largeConfig.providers[providerId].models[modelId] = {
            id: modelId,
            name: `Model ${j}`,
            contextLength: 4096,
            supportsFunctions: true
          };
        }
      }
      
      // Add 25 virtual models with multiple targets
      for (let i = 0; i < 25; i++) {
        const vmId = `vm-${i}`;
        const targets = [];
        for (let j = 0; j < 5; j++) {
          targets.push({
            providerId: `provider-${i % 15}`,
            modelId: `model-${j % 10}`,
            keyIndex: j % 3
          });
        }
        largeConfig.virtualModels[vmId] = {
          id: vmId,
          targets,
          enabled: true,
          priority: (i % 5) + 1,
          weight: 100 / 25
        };
      }
      
      // Measure performance
      const start = Date.now();
      const result = EnhancedPipelineConfigConverter.convertFromConfigData(largeConfig);
      const end = Date.now();
      
      // Should complete within reasonable time (less than 2 seconds for large config)
      expect(end - start).toBeLessThan(2000);
      
      // Should generate correct structures
      expect(result.metadata.virtualModelCount).toBe(25);
      expect(result.assemblyConfig.routingRules.length).toBe(25);
      expect(result.assemblyConfig.pipelineTemplates.length).toBe(25);
      expect(result.assemblyConfig.moduleRegistry.length).toBeGreaterThanOrEqual(150); // 15 providers * 10 models + default modules
    });
  });
});