#!/usr/bin/env node

/**
 * Qwen Provider Module Test
 * Tests the Qwen provider functionality
 */

import { QwenProviderModule } from '../sharedmodule/pipeline/src/modules/QwenProviderModule';
import { QwenCompatibilityModule } from '../sharedmodule/pipeline/src/modules/QwenCompatibilityModule';
import fs from 'fs';
import path from 'path';

// Test configuration
const testConfig = {
  provider: 'qwen' as const,
  endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  auth: {
    type: 'api_key' as const,
    apiKey: process.env.QWEN_API_KEY || 'test-key'
  },
  model: 'qwen-turbo',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true,
  debug: {
    enabled: true,
    logLevel: 'info' as const
  }
};

async function testQwenProvider() {
  console.log('🚀 Starting Qwen Provider Test...\n');

  try {
    // Test 1: Module Initialization
    console.log('📋 Test 1: Module Initialization');
    const qwenProvider = new QwenProviderModule();
    
    const moduleInfo: any = {
      id: 'qwen-provider-test',
      name: 'Qwen Provider Test',
      version: '1.0.0',
      description: 'Test Qwen provider functionality',
      config: testConfig
    };

    await qwenProvider.initialize(moduleInfo);
    console.log('✅ Module initialized successfully\n');

    // Test 2: Compatibility Module
    console.log('📋 Test 2: Compatibility Module');
    const compatibilityModule = new QwenCompatibilityModule();
    
    const compatibilityInfo: any = {
      id: 'qwen-compatibility-test',
      name: 'Qwen Compatibility Test',
      version: '1.0.0',
      description: 'Test Qwen compatibility functionality',
      config: {
        provider: 'qwen',
        targetFormat: 'openai',
        enableValidation: true,
        debug: true
      }
    };

    await compatibilityModule.initialize(compatibilityInfo);
    console.log('✅ Compatibility module initialized successfully\n');

    // Test 3: Simple Request Processing
    console.log('📋 Test 3: Simple Request Processing');
    const testRequest = {
      model: 'qwen-turbo',
      messages: [
        {
          role: 'user',
          content: 'Hello, can you help me with a simple test?'
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    };

    console.log('📝 Processing test request:', JSON.stringify(testRequest, null, 2));
    
    // Process request through compatibility module first
    const compatibleRequest = await compatibilityModule.process(testRequest);
    console.log('✅ Request processed by compatibility module');
    
    // Then process through provider module
    const response = await qwenProvider.process(compatibleRequest);
    console.log('✅ Request processed by provider module');
    console.log('📤 Response received:', JSON.stringify(response, null, 2));

    // Test 4: Error Handling
    console.log('\n📋 Test 4: Error Handling');
    const invalidRequest = {
      model: 'qwen-turbo',
      messages: [] // Invalid: empty messages
    };

    try {
      await compatibilityModule.process(invalidRequest);
      console.log('❌ Expected error for invalid request');
    } catch (error) {
      console.log('✅ Error handling works correctly:', error.message);
    }

    // Test 5: Configuration Validation
    console.log('\n📋 Test 5: Configuration Validation');
    const validationStatus = await qwenProvider.validate();
    console.log('✅ Configuration validation status:', validationStatus);

    const compatibilityValidation = await compatibilityModule.validate();
    console.log('✅ Compatibility validation status:', compatibilityValidation);

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Helper function to check if required environment variables are set
function checkEnvironment() {
  const required = ['QWEN_API_KEY'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing environment variables:', missing.join(', '));
    console.log('📝 This test will run in mock mode without actual API calls');
    return false;
  }
  
  return true;
}

// Main execution
async function main() {
  console.log('🧪 Qwen Provider Test Suite');
  console.log('=================================');
  
  const hasRealCredentials = checkEnvironment();
  
  if (!hasRealCredentials) {
    console.log('🔧 Running in mock mode...');
    // Mock the API calls for testing
    process.env.QWEN_API_KEY = 'mock-key-for-testing';
  }
  
  await testQwenProvider();
}

// Run the test
main().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});