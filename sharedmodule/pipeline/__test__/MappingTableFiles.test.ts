/**
 * Simple test to verify mapping table JSON files can be loaded
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Mapping Table JSON Files', () => {
  describe('File Existence', () => {
    it('should have openai-to-qwen.json mapping table file', () => {
      const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', 'openai-to-qwen.json');
      expect(fs.existsSync(mappingTablePath)).toBe(true);
    });

    it('should have qwen-to-openai.json mapping table file', () => {
      const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', 'qwen-to-openai.json');
      expect(fs.existsSync(mappingTablePath)).toBe(true);
    });
  });

  describe('JSON Structure Validation', () => {
    it('should have valid openai-to-qwen.json structure', () => {
      const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', 'openai-to-qwen.json');
      const content = fs.readFileSync(mappingTablePath, 'utf-8');
      const mappingTable = JSON.parse(content);

      expect(mappingTable).toHaveProperty('version');
      expect(mappingTable).toHaveProperty('description');
      expect(mappingTable).toHaveProperty('formats');
      expect(mappingTable).toHaveProperty('fieldMappings');
      expect(mappingTable).toHaveProperty('validationRules');
      expect(mappingTable).toHaveProperty('transformFunctions');

      expect(mappingTable.formats).toHaveProperty('source');
      expect(mappingTable.formats).toHaveProperty('target');
      expect(mappingTable.formats.source).toBe('openai');
      expect(mappingTable.formats.target).toBe('qwen');

      expect(typeof mappingTable.fieldMappings).toBe('object');
      expect(Object.keys(mappingTable.fieldMappings).length).toBeGreaterThan(0);
    });

    it('should have valid qwen-to-openai.json structure', () => {
      const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', 'qwen-to-openai.json');
      const content = fs.readFileSync(mappingTablePath, 'utf-8');
      const mappingTable = JSON.parse(content);

      expect(mappingTable).toHaveProperty('version');
      expect(mappingTable).toHaveProperty('description');
      expect(mappingTable).toHaveProperty('formats');
      expect(mappingTable).toHaveProperty('fieldMappings');
      expect(mappingTable).toHaveProperty('validationRules');
      expect(mappingTable).toHaveProperty('transformFunctions');

      expect(mappingTable.formats).toHaveProperty('source');
      expect(mappingTable.formats).toHaveProperty('target');
      expect(mappingTable.formats.source).toBe('qwen');
      expect(mappingTable.formats.target).toBe('openai');

      expect(typeof mappingTable.fieldMappings).toBe('object');
      expect(Object.keys(mappingTable.fieldMappings).length).toBeGreaterThan(0);
    });
  });

  describe('Key Field Mappings', () => {
    it('should have essential OpenAI to Qwen field mappings', () => {
      const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', 'openai-to-qwen.json');
      const content = fs.readFileSync(mappingTablePath, 'utf-8');
      const mappingTable = JSON.parse(content);

      const fieldMappings = mappingTable.fieldMappings;
      
      // Check for essential fields
      expect(fieldMappings).toHaveProperty('model');
      expect(fieldMappings).toHaveProperty('messages');
      expect(fieldMappings).toHaveProperty('temperature');
      
      // Check model mapping
      expect(fieldMappings.model.targetField).toBe('model');
      expect(fieldMappings.model.transform).toBe('mapOpenAIModelToQwen');
      
      // Check messages mapping
      expect(fieldMappings.messages.targetField).toBe('input.messages');
      expect(fieldMappings.messages.transform).toBe('convertOpenAIMessagesToQwen');
    });

    it('should have essential Qwen to OpenAI field mappings', () => {
      const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', 'qwen-to-openai.json');
      const content = fs.readFileSync(mappingTablePath, 'utf-8');
      const mappingTable = JSON.parse(content);

      const fieldMappings = mappingTable.fieldMappings;
      
      // Check for essential fields
      expect(fieldMappings).toHaveProperty('request_id');
      expect(fieldMappings['output.choices']).toBeDefined();
      expect(fieldMappings).toHaveProperty('usage');
      
      // Check request_id mapping
      expect(fieldMappings.request_id.targetField).toBe('id');
      expect(fieldMappings.request_id.transform).toBe('prefixRequestId');
      
      // Check choices mapping
      expect(fieldMappings['output.choices'].targetField).toBe('choices');
      expect(fieldMappings['output.choices'].transform).toBe('convertQwenChoicesToOpenAI');
    });
  });

  describe('Transform Functions', () => {
    it('should have model mapping transform functions', () => {
      const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', 'openai-to-qwen.json');
      const content = fs.readFileSync(mappingTablePath, 'utf-8');
      const mappingTable = JSON.parse(content);

      const transformFunctions = mappingTable.transformFunctions;
      
      expect(transformFunctions).toHaveProperty('mapOpenAIModelToQwen');
      expect(transformFunctions.mapOpenAIModelToQwen.type).toBe('mapping');
      expect(transformFunctions.mapOpenAIModelToQwen.defaultMappings).toBeDefined();
      
      // Check some default mappings
      const mappings = transformFunctions.mapOpenAIModelToQwen.defaultMappings;
      expect(mappings['gpt-3.5-turbo']).toBeDefined();
      expect(mappings['gpt-4']).toBeDefined();
      expect(mappings['gpt-3.5-turbo']).toBe('qwen-turbo');
      expect(mappings['gpt-4']).toBe('qwen-plus');
    });

    it('should have message transform functions', () => {
      const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', 'openai-to-qwen.json');
      const content = fs.readFileSync(mappingTablePath, 'utf-8');
      const mappingTable = JSON.parse(content);

      const transformFunctions = mappingTable.transformFunctions;
      
      expect(transformFunctions).toHaveProperty('convertOpenAIMessagesToQwen');
      expect(transformFunctions.convertOpenAIMessagesToQwen.type).toBe('array_transform');
      expect(transformFunctions.convertOpenAIMessagesToQwen.elementTransform).toBeDefined();
    });

    it('should have string transform functions for Qwen to OpenAI', () => {
      const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', 'qwen-to-openai.json');
      const content = fs.readFileSync(mappingTablePath, 'utf-8');
      const mappingTable = JSON.parse(content);

      const transformFunctions = mappingTable.transformFunctions;
      
      expect(transformFunctions).toHaveProperty('prefixRequestId');
      expect(transformFunctions.prefixRequestId.type).toBe('string_transform');
      expect(transformFunctions.prefixRequestId.operation).toBe('prefix');
      expect(transformFunctions.prefixRequestId.prefix).toBe('req_');
    });
  });

  describe('Validation Rules', () => {
    it('should have proper validation rules for OpenAI to Qwen', () => {
      const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', 'openai-to-qwen.json');
      const content = fs.readFileSync(mappingTablePath, 'utf-8');
      const mappingTable = JSON.parse(content);

      const validationRules = mappingTable.validationRules;
      
      expect(validationRules).toHaveProperty('required');
      expect(validationRules).toHaveProperty('types');
      expect(validationRules).toHaveProperty('constraints');
      
      expect(validationRules.required).toContain('model');
      expect(validationRules.required).toContain('messages');
      
      expect(validationRules.types.model).toBe('string');
      expect(validationRules.types.messages).toBe('array');
    });

    it('should have proper validation rules for Qwen to OpenAI', () => {
      const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', 'qwen-to-openai.json');
      const content = fs.readFileSync(mappingTablePath, 'utf-8');
      const mappingTable = JSON.parse(content);

      const validationRules = mappingTable.validationRules;
      
      expect(validationRules).toHaveProperty('required');
      expect(validationRules).toHaveProperty('types');
      
      expect(validationRules.required).toContain('request_id');
      expect(validationRules.required).toContain('output.choices');
      
      expect(validationRules.types.request_id).toBe('string');
      expect(validationRules.types.output).toBe('object');
    });
  });
});