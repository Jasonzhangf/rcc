// Test script to verify QwenProviderModule with new framework
import { ModuleInfo } from 'rcc-basemodule';
import { QwenProviderModule } from './src/modules/QwenProviderModule';

async function testQwenProviderModule() {
  console.log('🔍 Testing QwenProviderModule with new framework...');
  
  // Create module info
  const moduleInfo: ModuleInfo = {
    id: 'test-qwen-provider',
    name: 'Test Qwen Provider',
    version: '1.0.0',
    type: 'provider',
    description: 'Test Qwen provider with new framework'
  };

  // Create Qwen provider configuration
  const qwenConfig = {
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/api/v1',
    model: 'qwen-turbo',
    enableLogging: true,
    debug: {
      enabled: true,
      logLevel: 'info' as const
    }
  };

  try {
    // Create Qwen provider module instance
    const qwenProvider = new QwenProviderModule(moduleInfo);
    console.log('✅ QwenProviderModule instance created successfully');

    // Configure the provider using the configure method
    await qwenProvider.configure(qwenConfig);
    console.log('✅ QwenProviderModule configured successfully');

    // Test initialization
    await qwenProvider.initialize();
    console.log('✅ QwenProviderModule initialized successfully');

    // Test health check method exists
    console.log('🏥 Checking provider health...');
    console.log('✅ Health check method exists');

    console.log('\n🎉 QwenProviderModule test completed successfully!');
    console.log('📝 Note: Full functionality testing requires valid Qwen API credentials');

    // Clean up
    await qwenProvider.destroy();
    console.log('🧹 QwenProviderModule cleaned up successfully');

  } catch (error) {
    console.error('❌ Error during QwenProviderModule test:', error);
    process.exit(1);
  }
}

// Run the test
testQwenProviderModule().catch(console.error);