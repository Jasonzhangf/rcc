// Simple test to verify framework-based OpenAI modules can be imported and instantiated
import { ModuleInfo } from 'rcc-basemodule';

// Direct imports from the module files
import { OpenAIProviderModule } from './src/modules/FrameworkOpenAIProviderModule';
import { CompatibilityModule } from './src/modules/FrameworkCompatibilityModule';

console.log('🔍 Testing framework-based OpenAI modules...');

try {
  // Test FrameworkOpenAIProviderModule
  const providerModuleInfo: ModuleInfo = {
    id: 'test-framework-openai-provider',
    name: 'Test Framework OpenAI Provider',
    version: '1.0.0',
    type: 'provider',
    description: 'Test framework-based OpenAI provider module'
  };
  
  const openaiProvider = new OpenAIProviderModule(providerModuleInfo);
  console.log('✅ FrameworkOpenAIProviderModule instance created successfully');
  
  // Test FrameworkCompatibilityModule
  const compatibilityModuleInfo: ModuleInfo = {
    id: 'test-framework-compatibility',
    name: 'Test Framework Compatibility',
    version: '1.0.0',
    type: 'compatibility',
    description: 'Test framework-based compatibility module'
  };
  
  const compatibilityModule = new CompatibilityModule(compatibilityModuleInfo);
  console.log('✅ FrameworkCompatibilityModule instance created successfully');
  
  console.log('\n🎉 Framework-based OpenAI modules test completed successfully!');
  console.log('📝 Note: Full functionality testing requires valid API credentials and proper configuration.');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error during framework-based OpenAI modules test:', error);
  process.exit(1);
}