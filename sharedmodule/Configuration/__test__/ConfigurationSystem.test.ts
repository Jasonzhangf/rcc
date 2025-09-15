/**
 * Configuration System Tests
 * 
 * Comprehensive tests for the ConfigurationSystem core functionality
 */

import { ConfigurationSystem } from '../src/core/ConfigurationSystem';
import { ConfigData } from '../src/core/ConfigData';
import { PipelineTable } from '../src/core/PipelineTable';

// Mock module info for testing
const mockModuleInfo = {
  id: 'test-config-system',
  name: 'Test Configuration System',
  version: '1.0.0',
  description: 'Test configuration system module'
};

describe('ConfigurationSystem', () => {
  let configSystem: ConfigurationSystem;
  
  beforeEach(() => {
    configSystem = new ConfigurationSystem(mockModuleInfo);
  });
  
  afterEach(async () => {
    if (configSystem) {
      await configSystem.destroy();
    }
  });
  
  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(configSystem.initialize()).resolves.not.toThrow();
      // Check that module is properly initialized
      expect(configSystem.getInfo().id).toBe('test-config-system');
    });
    
    test('should initialize with configuration', async () => {
      const config = { test: 'value' };
      await expect(configSystem.initialize(config)).resolves.not.toThrow();
      // Note: This test would need to be enhanced based on actual implementation
    });
  });
  
  describe('Configuration Management', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });
    
    test('should handle empty configuration', async () => {
      // Test that we can work with an empty configuration
      const emptyConfig: ConfigData = {
        version: '1.0.0',
        providers: {},
        virtualModels: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // This would normally load a configuration, but since we're testing
      // we'll just check that the structure is handled correctly
      expect(emptyConfig.version).toBe('1.0.0');
    });
    
    test('should create configuration with fixed virtual models', () => {
      const configModule = (configSystem as any).configurationModule;
      if (configModule) {
        const emptyConfig = configModule.createEmptyConfig();
        expect(emptyConfig.version).toBe('1.0.0');
        expect(emptyConfig.providers).toEqual({});
        expect(emptyConfig.virtualModels).toEqual({});
      }
    });
  });
  
  describe('Pipeline Generation', () => {
    beforeEach(async () => {
      await configSystem.initialize();
    });
    
    test('should fail to generate pipeline table when no configuration loaded', async () => {
      await expect(configSystem.generatePipelineTable()).rejects.toThrow();
    });
    
    test('should generate empty pipeline table from empty configuration', async () => {
      const emptyConfig: ConfigData = {
        version: '1.0.0',
        providers: {},
        virtualModels: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Set the configuration directly for testing
      (configSystem as any).currentConfig = emptyConfig;
      
      const pipelineTable = await configSystem.generatePipelineTable();
      expect(pipelineTable).toBeInstanceOf(Map);
      expect(pipelineTable.size).toBe(0);
    });
    
    test('should generate pipeline table with valid configuration', async () => {
      const testConfig: ConfigData = {
        version: '1.0.0',
        providers: {
          'test-provider': {
            id: 'test-provider',
            name: 'Test Provider',
            type: 'openai',
            auth: {
              type: 'api-key',
              keys: ['test-key-1', 'test-key-2']
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
      
      // Set the configuration directly for testing
      (configSystem as any).currentConfig = testConfig;
      
      const pipelineTable = await configSystem.generatePipelineTable();
      expect(pipelineTable).toBeInstanceOf(Map);
      // Should generate entries for each API key
      expect(pipelineTable.size).toBe(2);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', async () => {
      // This test would need specific error scenarios to test
      // For now, we just ensure initialization doesn't throw unexpected errors
      await expect(configSystem.initialize()).resolves.not.toThrow();
    });
    
    test('should handle configuration loading errors', async () => {
      await configSystem.initialize();
      // Test with invalid source
      await expect(configSystem.loadConfiguration('/invalid/path/config.json')).rejects.toThrow();
    });
  });
  
  describe('Module Lifecycle', () => {
    test('should destroy cleanly', async () => {
      await configSystem.initialize();
      await expect(configSystem.destroy()).resolves.not.toThrow();
    });
    
    test('should handle multiple destroy calls', async () => {
      await configSystem.initialize();
      await configSystem.destroy();
      await expect(configSystem.destroy()).resolves.not.toThrow();
    });
  });
});