#!/usr/bin/env node

/**
 * Compatibility Module Test
 * Tests the Compatibility module functionality with JSON configuration
 */

import { CompatibilityModule } from '../sharedmodule/pipeline/src/modules/CompatibilityModule';
import fs from 'fs';
import path from 'path';

// Test configuration
const testConfig = {
  mappingTable: 'openai-to-anthropic',
  strictMapping: true,
  preserveUnknownFields: false,
  validation: {
    enabled: true,
    required: ['model', 'messages'],
    types: {
      model: 'string',
      messages: 'array'
    }
  }
};

async function testCompatibilityModule() {
  console.log('🚀 Starting Compatibility Module Test...\n');

  try {
    // Test 1: Module Initialization
    console.log('📋 Test 1: Module Initialization');
    const compatibilityModule = new CompatibilityModule({
      id: 'compatibility-test',
      name: 'Compatibility Test',
      version: '1.0.0',
      description: 'Test Compatibility module functionality'
    });

    await compatibilityModule.initialize();
    console.log('✅ Module initialized successfully\n');

    // Test 2: Module Configuration
    console.log('📋 Test 2: Module Configuration');
    await compatibilityModule.configure(testConfig);
    console.log('✅ Module configured successfully\n');

    // Test 3: Request Processing
    console.log('📋 Test 3: Request Processing');
    const testRequest = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: 'Hello, can you help me with a simple test?'
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0
    };

    console.log('📝 Processing test request:', JSON.stringify(testRequest, null, 2));
    const processedRequest = await compatibilityModule.process(testRequest);
    console.log('✅ Request processed successfully');
    console.log('📤 Processed request:', JSON.stringify(processedRequest, null, 2));

    // Test 4: Response Processing
    console.log('\n📋 Test 4: Response Processing');
    const testResponse = {
      id: 'chatcmpl-test123',
      object: 'chat.completion',
      created: 1640995200,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! I\'d be happy to help you with your test.'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 15,
        total_tokens: 35
      }
    };

    console.log('📝 Processing test response:', JSON.stringify(testResponse, null, 2));
    const processedResponse = await compatibilityModule.processResponse(testResponse);
    console.log('✅ Response processed successfully');
    console.log('📤 Processed response:', JSON.stringify(processedResponse, null, 2));

    // Test 5: Error Handling
    console.log('\n📋 Test 5: Error Handling');
    const invalidRequest = {
      model: 'gpt-4o'
      // Missing required 'messages' field
    };

    try {
      await compatibilityModule.process(invalidRequest);
      console.log('❌ Expected error for invalid request');
    } catch (error) {
      console.log('✅ Error handling works correctly:', error.message);
    }

    // Test 6: Configuration Validation
    console.log('\n📋 Test 6: Configuration Validation');
    const validationStatus = await compatibilityModule.validate();
    console.log('✅ Configuration validation status:', validationStatus);

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Helper function to check if mapping table files exist
function checkMappingTables() {
  const mappingTablePath = path.join(__dirname, '..', 'mapping-tables', 'openai-to-anthropic.json');
  
  if (!fs.existsSync(mappingTablePath)) {
    console.warn('⚠️  Mapping table file not found:', mappingTablePath);
    console.log('📝 This test will fail without the mapping table file');
    return false;
  }
  
  return true;
}

// Main execution
async function main() {
  console.log('🧪 Compatibility Module Test Suite');
  console.log('=================================');
  
  const hasMappingTables = checkMappingTables();
  
  if (!hasMappingTables) {
    console.log('🔧 Please ensure mapping table files are available before running this test');
    process.exit(1);
  }
  
  await testCompatibilityModule();
}

// Run the test
main().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});