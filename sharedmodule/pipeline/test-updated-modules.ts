// Test script to verify our updated modules can be imported and instantiated
import { ModuleInfo } from 'rcc-basemodule';
import { ProviderModule } from './src/modules/ProviderModule';
import { CompatibilityModule } from './src/modules/CompatibilityModule';
import { QwenProviderModule } from './src/modules/QwenProviderModule';

console.log('🔍 Verifying updated module imports and instantiation...');

try {
  // Test ProviderModule
  const providerModuleInfo: ModuleInfo = {
    id: 'test-provider',
    name: 'Test Provider',
    version: '1.0.0',
    type: 'provider',
    description: 'Test provider module'
  };
  
  const providerModule = new ProviderModule(providerModuleInfo);
  console.log('✅ ProviderModule imported and instantiated successfully');
  
  // Test CompatibilityModule
  const compatibilityModuleInfo: ModuleInfo = {
    id: 'test-compatibility',
    name: 'Test Compatibility',
    version: '1.0.0',
    type: 'compatibility',
    description: 'Test compatibility module'
  };
  
  const compatibilityModule = new CompatibilityModule(compatibilityModuleInfo);
  console.log('✅ CompatibilityModule imported and instantiated successfully');
  
  // Test QwenProviderModule
  const qwenModuleInfo: ModuleInfo = {
    id: 'test-qwen',
    name: 'Test Qwen',
    version: '1.0.0',
    type: 'provider',
    description: 'Test Qwen provider module'
  };
  
  const qwenModule = new QwenProviderModule(qwenModuleInfo);
  console.log('✅ QwenProviderModule imported and instantiated successfully');
  
  console.log('\n🎉 All updated modules verified successfully!');
  console.log('📝 Note: This is a basic import/instantiation test. Full functionality testing requires valid API credentials.');
  
} catch (error) {
  console.error('❌ Error during updated module verification:', error);
  process.exit(1);
}