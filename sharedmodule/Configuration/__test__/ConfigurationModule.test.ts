/**
 * Configuration Module Tests
 * 
 * Comprehensive tests for the ConfigurationModule functionality
 */

import { ConfigurationModule } from '../src/core/ConfigurationModule';
import { ConfigData } from '../src/core/ConfigData';
import { PipelineTable } from '../src/core/PipelineTable';

// Mock file system operations
jest.mock('fs-extra', () => ({
  readFile: jest.fn().mockResolvedValue('{}'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(true)
}));

describe('ConfigurationModule', () => {
  let configModule: ConfigurationModule;
  
  beforeEach(() => {
    configModule = new ConfigurationModule({
      configPath: './test-config.json',
      autoLoad: false
    });
  });
  
  afterEach(async () => {
    if (configModule) {
      await configModule.destroy();
    }
  });
  
  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(configModule.initialize()).resolves.not.toThrow();
    });
    
    test('should initialize with default options', async () => {
      const defaultModule = new ConfigurationModule();
      await expect(defaultModule.initialize()).resolves.not.toThrow();
    });
    
    test('should initialize with custom options', async () => {
      const customModule = new ConfigurationModule({
        configPath: './custom-config.json',
        autoLoad: true,
        fixedVirtualModels: ['custom-model']
      });
      await expect(customModule.initialize()).resolves.not.toThrow();
    });
  });
  
  describe('Configuration Management', () => {
    beforeEach(async () => {
      await configModule.initialize();
    });
    
    test('should create empty configuration', () => {
      const emptyConfig = configModule.createEmptyConfig();
      expect(emptyConfig.version).toBe('1.0.0');
      expect(emptyConfig.providers).toEqual({});
      expect(emptyConfig.virtualModels).toEqual({});
      expect(emptyConfig.createdAt).toBeDefined();
      expect(emptyConfig.updatedAt).toBeDefined();
    });
    
    test('should validate valid configuration', async () => {
      const validConfig: ConfigData = {
        version: '1.0.0',
        providers: {
          'test-provider': {
            id: 'test-provider',
            name: 'Test Provider',
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
                providerId: 'test-provider',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1
          },
          'longcontext': {
            id: 'longcontext',
            targets: [
              {
                providerId: 'test-provider',
                modelId: 'gpt-3.5-turbo',
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
                providerId: 'test-provider',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1
          },
          'background': {
            id: 'background',
            targets: [
              {
                providerId: 'test-provider',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1
          },
          'websearch': {
            id: 'websearch',
            targets: [
              {
                providerId: 'test-provider',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1
          },
          'vision': {
            id: 'vision',
            targets: [
              {
                providerId: 'test-provider',
                modelId: 'gpt-3.5-turbo',
                keyIndex: 0
              }
            ],
            enabled: true,
            priority: 1
          },
          'coding': {
            id: 'coding',
            targets: [
              {
                providerId: 'test-provider',
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
      
      const result = await configModule.validateConfiguration(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
    
    test('should detect invalid configuration', async () => {
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
          },
          'longcontext': {
            id: 'longcontext',
            targets: [],
            enabled: true,
            priority: 1
          },
          'thinking': {
            id: 'thinking',
            targets: [],
            enabled: true,
            priority: 1
          },
          'background': {
            id: 'background',
            targets: [],
            enabled: true,
            priority: 1
          },
          'websearch': {
            id: 'websearch',
            targets: [],
            enabled: true,
            priority: 1
          },
          'vision': {
            id: 'vision',
            targets: [],
            enabled: true,
            priority: 1
          },
          'coding': {
            id: 'coding',
            targets: [],
            enabled: true,
            priority: 1
          }
        }
      };
      
      const result = await configModule.validateConfiguration(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing version');
      expect(result.errors).toContain('Provider invalid-provider missing name');
      expect(result.errors).toContain('Provider invalid-provider missing type');
      expect(result.errors).toContain('Provider invalid-provider missing authentication configuration');
      expect(result.errors).toContain('Provider invalid-provider has no models');
    });
  });
  
  describe('Pipeline Generation', () => {
    beforeEach(async () => {
      await configModule.initialize();
    });
    
    test('should fail to generate pipeline table when no configuration loaded', async () => {
      await expect(configModule.generatePipelineTable()).rejects.toThrow('No configuration loaded');
    });
    
    test('should generate pipeline table when configuration is set', async () => {
      const testConfig: ConfigData = {
        version: '1.0.0',
        providers: {
          'test-provider': {
            id: 'test-provider',
            name: 'Test Provider',
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
                providerId: 'test-provider',
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
      
      // Set configuration directly
      (configModule as any).currentConfig = testConfig;
      
      const pipelineTable = await configModule.generatePipelineTable();
      expect(pipelineTable).toBeInstanceOf(Map);
      expect(pipelineTable.size).toBe(1);
    });
  });
  
  describe('Module State Management', () => {
    beforeEach(async () => {
      await configModule.initialize();
    });
    
    test('should return null for current config when none loaded', () => {
      const currentConfig = configModule.getCurrentConfig();
      expect(currentConfig).toBeNull();
    });
    
    test('should return null for current pipeline table when none generated', () => {
      const pipelineTable = configModule.getCurrentPipelineTable();
      expect(pipelineTable).toBeNull();
    });
  });
  
  describe('Module Lifecycle', () => {
    test('should destroy cleanly', async () => {
      await configModule.initialize();
      await expect(configModule.destroy()).resolves.not.toThrow();
    });
    
    test('should handle multiple destroy calls', async () => {
      await configModule.initialize();
      await configModule.destroy();
      await expect(configModule.destroy()).resolves.not.toThrow();
    });
  });
});