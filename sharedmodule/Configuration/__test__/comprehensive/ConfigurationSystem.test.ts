import { ConfigurationSystem } from '../../src/core/ConfigurationSystem';
import { ConfigData } from '../../src/core/ConfigData';

describe('ConfigurationSystem', () => {
  let configSystem: ConfigurationSystem;
  
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

  beforeEach(async () => {
    configSystem = new ConfigurationSystem();
    await configSystem.initialize();
  });

  afterEach(async () => {
    if (configSystem) {
      await configSystem.destroy();
    }
  });

  describe('Initialization', () => {
    it('should create a ConfigurationSystem instance', () => {
      expect(configSystem).toBeDefined();
      expect(typeof configSystem.initialize).toBe('function');
      expect(typeof configSystem.destroy).toBe('function');
    });

    it('should initialize successfully', async () => {
      const newSystem = new ConfigurationSystem();
      await expect(newSystem.initialize()).resolves.not.toThrow();
      await newSystem.destroy();
    });
  });

  describe('Configuration Operations', () => {
    it('should validate configuration structure', async () => {
      const { isValidConfigurationStructure } = await import('../../src/index');
      expect(isValidConfigurationStructure(sampleConfig)).toBe(true);
      
      // Test invalid configuration
      const invalidConfig: any = { version: '1.0.0' };
      expect(isValidConfigurationStructure(invalidConfig)).toBe(false);
    });

    it('should create configuration template', async () => {
      const { createConfigurationTemplate } = await import('../../src/index');
      const template = createConfigurationTemplate('test-config', 'Test configuration');
      expect(template).toBeDefined();
      expect(template.version).toBe('1.0.0');
      expect(template.providers).toEqual({});
      expect(template.virtualModels).toEqual({});
      expect(template.createdAt).toBeDefined();
      expect(template.updatedAt).toBeDefined();
    });

    it('should merge configurations', async () => {
      const { mergeConfigurations } = await import('../../src/index');
      const template = {
        version: '1.0.0',
        providers: {},
        virtualModels: {
          'test': {
            id: 'test',
            targets: [],
            enabled: true,
            priority: 1
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date(Date.now() - 1000).toISOString() // Ensure different timestamp
      };
      
      const merged = mergeConfigurations(template, sampleConfig, 'deep');
      expect(merged.version).toBe('1.0.0');
      expect(merged.providers).toEqual(sampleConfig.providers);
      // The merged result should contain both the 'test' model from template and 'default' model from sampleConfig
      expect(merged.virtualModels).toEqual({
        ...template.virtualModels,
        ...sampleConfig.virtualModels
      });
      expect(merged.updatedAt).not.toBe(template.updatedAt);
    });
  });

  describe('Utility Functions', () => {
    it('should extract configuration paths', async () => {
      const { extractConfigurationPaths } = await import('../../src/index');
      const paths = extractConfigurationPaths(sampleConfig);
      expect(paths).toContain('version');
      expect(paths).toContain('providers.openai');
      expect(paths).toContain('virtualModels.default.targets');
    });

    it('should get and set configuration values', async () => {
      const { getConfigurationValue, setConfigurationValue } = await import('../../src/index');
      
      // Test get value
      const version = getConfigurationValue(sampleConfig, 'version');
      expect(version).toBe('1.0.0');
      
      const providerName = getConfigurationValue(sampleConfig, 'providers.openai.name');
      expect(providerName).toBe('OpenAI');
      
      // Test set value
      const newConfig = { ...sampleConfig };
      setConfigurationValue(newConfig, 'providers.openai.name', 'New OpenAI Name');
      expect(getConfigurationValue(newConfig, 'providers.openai.name')).toBe('New OpenAI Name');
    });
  });
});