/**
 * Qwen Compatibility Module Mapping Table Test
 * Tests loading and using mapping tables from JSON files
 */

import { QwenCompatibilityModule, OpenAIChatRequest } from '../src/modules/QwenCompatibilityModule';
import { ModuleInfo } from 'rcc-basemodule';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('QwenCompatibilityModule Mapping Table Test', () => {
  let compatibilityModule: QwenCompatibilityModule;
  let mockModuleInfo: ModuleInfo;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock module info
    mockModuleInfo = {
      id: 'qwen-compatibility-test',
      name: 'Qwen Compatibility Test Module',
      version: '1.0.0',
      type: 'compatibility',
      description: 'Test module for mapping table functionality'
    };

    // Create compatibility module
    compatibilityModule = new QwenCompatibilityModule(mockModuleInfo);

    // Configure the module
    const config = {
      direction: 'bidirectional',
      mappingTable: 'openai-to-qwen',
      strictMapping: true,
      preserveUnknownFields: false
    };
    compatibilityModule.configure(config);
  });

  describe('Mapping Table Loading', () => {
    it('should successfully load openai-to-qwen mapping table from JSON file', async () => {
      // Mock mapping table content
      const mockMappingTable = {
        version: '1.0.0',
        description: 'OpenAI to Qwen compatibility mapping',
        formats: {
          source: 'openai',
          target: 'qwen'
        },
        fieldMappings: {
          'model': {
            targetField: 'model',
            transform: 'mapOpenAIModelToQwen'
          },
          'messages': {
            targetField: 'input.messages',
            transform: 'convertOpenAIMessagesToQwen'
          },
          'temperature': {
            targetField: 'parameters.temperature',
            defaultValue: 0.7
          }
        },
        validationRules: {
          required: ['model', 'messages'],
          types: {
            model: 'string',
            messages: 'array'
          }
        },
        transformFunctions: {
          mapOpenAIModelToQwen: {
            type: 'mapping',
            defaultMappings: {
              'gpt-3.5-turbo': 'qwen-turbo',
              'gpt-4': 'qwen-plus'
            }
          },
          convertOpenAIMessagesToQwen: {
            type: 'array_transform',
            elementTransform: {
              role: {
                mapping: {
                  'system': 'system',
                  'user': 'user',
                  'assistant': 'assistant'
                }
              },
              content: {
                targetField: 'content',
                required: true
              }
            }
          }
        }
      };

      // Mock file system operations
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockMappingTable));

      // Initialize module
      await compatibilityModule.initialize();

      // Verify file operations were called
      const expectedPath = path.join(__dirname, '..', 'mapping-tables', 'openai-to-qwen.json');
      expect(mockFs.existsSync).toHaveBeenCalledWith(expectedPath);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf-8');

      // Get compatibility info to verify successful loading
      const info = compatibilityModule.getCompatibilityInfo();
      expect(info.mappingTable).toBe('openai-to-qwen');
      expect(info.direction).toBe('bidirectional');
    });

    it('should throw error when mapping table file does not exist', async () => {
      // Mock file not existing
      mockFs.existsSync.mockReturnValue(false);

      // Expect initialization to fail
      await expect(compatibilityModule.initialize()).rejects.toThrow(
        'Mapping table file not found'
      );
    });

    it('should throw error when mapping table JSON is invalid', async () => {
      // Mock invalid JSON
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json content');

      // Expect initialization to fail
      await expect(compatibilityModule.initialize()).rejects.toThrow();
    });

    it('should throw error when mapping table structure is invalid', async () => {
      // Mock invalid structure (missing required fields)
      const invalidMappingTable = {
        description: 'Invalid mapping table',
        // Missing version, formats, fieldMappings
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidMappingTable));

      // Expect initialization to fail
      await expect(compatibilityModule.initialize()).rejects.toThrow(
        'Mapping table openai-to-qwen is missing required field'
      );
    });
  });

  describe('Field Mapping Application', () => {
    beforeEach(async () => {
      // Mock mapping table content for conversion tests
      const mockMappingTable = {
        version: '1.0.0',
        description: 'OpenAI to Qwen compatibility mapping',
        formats: {
          source: 'openai',
          target: 'qwen'
        },
        fieldMappings: {
          'model': {
            targetField: 'model',
            transform: 'mapOpenAIModelToQwen'
          },
          'messages': {
            targetField: 'input.messages',
            transform: 'convertOpenAIMessagesToQwen'
          },
          'temperature': {
            targetField: 'parameters.temperature',
            defaultValue: 0.7
          }
        },
        validationRules: {
          required: ['model', 'messages'],
          types: {
            model: 'string',
            messages: 'array'
          }
        },
        transformFunctions: {
          mapOpenAIModelToQwen: {
            type: 'mapping',
            defaultMappings: {
              'gpt-3.5-turbo': 'qwen-turbo',
              'gpt-4': 'qwen-plus'
            }
          },
          convertOpenAIMessagesToQwen: {
            type: 'array_transform',
            elementTransform: {
              role: {
                mapping: {
                  'system': 'system',
                  'user': 'user',
                  'assistant': 'assistant'
                }
              },
              content: {
                targetField: 'content',
                required: true
              }
            }
          }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockMappingTable));
      
      await compatibilityModule.initialize();
    });

    it('should apply field mappings correctly', () => {
      const openaiRequest: OpenAIChatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ],
        temperature: 0.5
      };

      const qwenRequest = compatibilityModule['convertOpenAIToQwen'](openaiRequest);

      expect(qwenRequest.model).toBe('qwen-turbo'); // Model mapping applied
      expect(qwenRequest.input.messages).toHaveLength(2); // Messages structure transformed
      expect(qwenRequest.parameters?.temperature).toBe(0.5); // Temperature mapped correctly
    });

    it('should apply default values for missing fields', () => {
      const openaiRequest: OpenAIChatRequest = {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
        // Missing temperature - should get default value
      };

      const qwenRequest = compatibilityModule['convertOpenAIToQwen'](openaiRequest);

      expect(qwenRequest.model).toBe('qwen-plus');
      expect(qwenRequest.parameters?.temperature).toBe(0.7); // Default value applied
    });

    it('should throw error for required missing fields', () => {
      const invalidRequest: OpenAIChatRequest = {
        model: 'gpt-4',
        messages: [] // Empty messages array should trigger error
      };

      expect(() => {
        compatibilityModule['convertOpenAIToQwen'](invalidRequest);
      }).toThrow('Required field missing: messages');
    });
  });

  describe('Transform Functions', () => {
    it('should apply mapping transform correctly', () => {
      const mappingDef = {
        type: 'mapping',
        mappings: {
          'gpt-3.5-turbo': 'qwen-turbo',
          'gpt-4': 'qwen-plus'
        },
        defaultValue: 'qwen-default'
      };

      const result = compatibilityModule['applyMappingTransform']('gpt-3.5-turbo', mappingDef);
      expect(result).toBe('qwen-turbo');

      const result2 = compatibilityModule['applyMappingTransform']('unknown-model', mappingDef);
      expect(result2).toBe('qwen-default');
    });

    it('should apply string transform correctly', () => {
      const stringDef = {
        type: 'string_transform',
        operation: 'prefix',
        prefix: 'req_'
      };

      const result = compatibilityModule['applyStringTransform']('123', stringDef);
      expect(result).toBe('req_123');
    });

    it('should apply array transform correctly', () => {
      const arrayDef = {
        type: 'array_transform',
        elementTransform: {
          role: {
            mapping: {
              'user': 'user',
              'assistant': 'assistant'
            }
          },
          content: {
            targetField: 'content',
            required: true
          }
        }
      };

      const inputArray = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      const result = compatibilityModule['applyArrayTransform'](inputArray, arrayDef, {});
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('Hello');
    });
  });
});