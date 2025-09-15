/**
 * Config Loader and Parser Tests
 * 
 * Comprehensive tests for configuration loading and parsing functionality
 */

import { ConfigLoader } from '../src/core/ConfigLoader';
import { ConfigParser } from '../src/core/ConfigParser';
import { ConfigData } from '../src/core/ConfigData';

// Mock fs module (since ConfigLoader uses fs/promises)
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockImplementation((path: string) => {
    console.log('fs.readFile called with path:', path);
    if (path === './valid-config.json') {
      const content = JSON.stringify({
        version: '1.0.0',
        providers: {},
        virtualModels: {}
      });
      console.log('Returning valid config content:', content);
      return Promise.resolve(content);
    } else if (path === './invalid-config.json') {
      // Return a string that will cause JSON.parse to throw a SyntaxError
      console.log('Returning invalid JSON content: invalid json content');
      return Promise.resolve('invalid json content');
    } else {
      console.log('File not found, rejecting with ENOENT');
      return Promise.reject({ code: 'ENOENT' });
    }
  }),
  writeFile: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockImplementation((path: string) => {
    if (path.includes('nonexistent')) {
      return Promise.reject({ code: 'ENOENT' });
    }
    return Promise.resolve();
  }),
  mkdir: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockRejectedValue({ code: 'ENOENT' })
}));

// Mock global JSON.parse to throw SyntaxError for invalid JSON
const originalJSONParse = JSON.parse;
JSON.parse = jest.fn().mockImplementation((text: string) => {
  console.log('JSON.parse called with:', text);
  if (text === 'invalid json content') {
    const error = new SyntaxError('Unexpected token i in JSON at position 0');
    console.log('Throwing SyntaxError:', error.message);
    throw error;
  }
  console.log('Parsing with original JSON.parse');
  return originalJSONParse(text);
});

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  
  beforeEach(() => {
    configLoader = new ConfigLoader();
  });
  
  afterEach(async () => {
    if (configLoader) {
      await configLoader.destroy();
    }
  });
  
  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(configLoader.initialize()).resolves.not.toThrow();
    });
  });
  
  describe('Configuration Loading', () => {
    beforeEach(async () => {
      await configLoader.initialize();
    });
    
    test('should load valid configuration file', async () => {
      const config = await configLoader.loadConfig('./valid-config.json');
      expect(config).toBeDefined();
      expect(config.version).toBe('1.0.0');
    });
    
    test('should handle missing configuration file by creating empty config', async () => {
      const config = await configLoader.loadConfig('./nonexistent-config.json');
      expect(config).toBeDefined();
      expect(config.version).toBe('1.0.0');
      expect(config.providers).toEqual({});
      expect(config.virtualModels).toEqual({});
    });
    
    test('should handle invalid JSON in configuration file', async () => {
      await expect(configLoader.loadConfig('./invalid-config.json')).rejects.toThrow();
    });
  });
  
  describe('Configuration Saving', () => {
    beforeEach(async () => {
      await configLoader.initialize();
    });
    
    test('should save valid configuration', async () => {
      const config: ConfigData = {
        version: '1.0.0',
        providers: {},
        virtualModels: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await expect(configLoader.saveConfig(config, './test-config.json')).resolves.not.toThrow();
    });
  });
  
  describe('Module Lifecycle', () => {
    test('should destroy cleanly', async () => {
      await configLoader.initialize();
      await expect(configLoader.destroy()).resolves.not.toThrow();
    });
  });
});

describe('ConfigParser', () => {
  let configParser: ConfigParser;
  
  beforeEach(() => {
    configParser = new ConfigParser();
  });
  
  afterEach(async () => {
    if (configParser) {
      await configParser.destroy();
    }
  });
  
  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(configParser.initialize()).resolves.not.toThrow();
    });
  });
  
  describe('Configuration Parsing', () => {
    beforeEach(async () => {
      await configParser.initialize();
    });
    
    test('should parse valid raw configuration data', async () => {
      const rawData = {
        version: '1.0.0',
        providers: {},
        virtualModels: {}
      };
      
      const parsedConfig = await configParser.parseConfig(rawData);
      expect(parsedConfig).toBeDefined();
      expect(parsedConfig.version).toBe('1.0.0');
    });
    
    test('should add missing metadata fields during parsing', async () => {
      const rawData = {
        version: '1.0.0',
        providers: {},
        virtualModels: {}
      };
      
      const parsedConfig = await configParser.parseConfig(rawData);
      expect(parsedConfig.createdAt).toBeDefined();
      expect(parsedConfig.updatedAt).toBeDefined();
    });
    
    test('should preserve existing metadata fields', async () => {
      const createdAt = new Date().toISOString();
      const updatedAt = new Date().toISOString();
      
      const rawData = {
        version: '1.0.0',
        providers: {},
        virtualModels: {},
        createdAt,
        updatedAt
      };
      
      const parsedConfig = await configParser.parseConfig(rawData);
      expect(parsedConfig.createdAt).toBe(createdAt);
      expect(parsedConfig.updatedAt).toBe(updatedAt);
    });
  });
  
  describe('Module Lifecycle', () => {
    test('should destroy cleanly', async () => {
      await configParser.initialize();
      await expect(configParser.destroy()).resolves.not.toThrow();
    });
  });
});