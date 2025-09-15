// Test script to verify CompatibilityModule with new framework
import { ModuleInfo } from 'rcc-basemodule';
import { CompatibilityModule } from './src/modules/CompatibilityModule';

async function testCompatibilityModule() {
  console.log('🔍 Testing CompatibilityModule with new framework...');
  
  // Create module info
  const moduleInfo: ModuleInfo = {
    id: 'test-compatibility-module',
    name: 'Test Compatibility Module',
    version: '1.0.0',
    type: 'compatibility',
    description: 'Test compatibility module with new framework'
  };

  // Create compatibility configuration
  const compatibilityConfig = {
    mappingTable: 'qwen', // Use Qwen mapping table
    strictMapping: true,
    preserveUnknownFields: false,
    validation: {
      enabled: true,
      required: ['model', 'messages'],
      types: {
        'model': 'string',
        'messages': 'array'
      }
    }
  };

  try {
    // Create compatibility module instance
    const compatibilityModule = new CompatibilityModule(moduleInfo);
    console.log('✅ CompatibilityModule instance created successfully');

    // Configure the module
    await compatibilityModule.configure(compatibilityConfig);
    console.log('✅ CompatibilityModule configured successfully');

    // Test processing a sample request
    const sampleRequest = {
      model: 'qwen-turbo',
      messages: [
        { role: 'user', content: 'Hello, world!' }
      ],
      temperature: 0.7
    };

    console.log('🔄 Processing sample request...');
    const processedRequest = await compatibilityModule.process(sampleRequest);
    console.log('✅ Request processed successfully:', JSON.stringify(processedRequest, null, 2));

    // Test processing a sample response
    const sampleResponse = {
      id: 'test-response-id',
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you today?'
          },
          finish_reason: 'stop',
          index: 0
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 15,
        total_tokens: 25
      }
    };

    console.log('🔄 Processing sample response...');
    const processedResponse = await compatibilityModule.processResponse(sampleResponse);
    console.log('✅ Response processed successfully:', JSON.stringify(processedResponse, null, 2));

    console.log('\n🎉 CompatibilityModule test completed successfully!');

    // Clean up
    await compatibilityModule.destroy();
    console.log('🧹 CompatibilityModule cleaned up successfully');

  } catch (error) {
    console.error('❌ Error during CompatibilityModule test:', error);
    process.exit(1);
  }
}

// Run the test
testCompatibilityModule().catch(console.error);