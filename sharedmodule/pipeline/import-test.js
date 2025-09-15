// Simple test to verify that the framework-based modules can be imported
console.log('🔍 Testing import of framework-based modules...');

try {
  console.log('📝 Attempting to import FrameworkOpenAIProviderModule...');
  const openaiModule = require('./dist/modules/FrameworkOpenAIProviderModule');
  console.log('✅ FrameworkOpenAIProviderModule imported successfully');
  console.log('📊 Module exports:', Object.keys(openaiModule));
  
  console.log('📝 Attempting to import FrameworkCompatibilityModule...');
  const compatibilityModule = require('./dist/modules/FrameworkCompatibilityModule');
  console.log('✅ FrameworkCompatibilityModule imported successfully');
  console.log('📊 Module exports:', Object.keys(compatibilityModule));
  
  console.log('📝 Checking if classes exist...');
  if (openaiModule.OpenAIProviderModule) {
    console.log('✅ OpenAIProviderModule class exists');
  } else {
    console.log('❌ OpenAIProviderModule class not found');
  }
  
  if (compatibilityModule.CompatibilityModule) {
    console.log('✅ CompatibilityModule class exists');
  } else {
    console.log('❌ CompatibilityModule class not found');
  }
  
  console.log('\n🎉 All import tests completed successfully!');
  
} catch (error) {
  console.error('❌ Error during import test:', error);
  process.exit(1);
}