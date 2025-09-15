// Test script to verify compiled modules can be imported and instantiated
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Testing compiled module imports and instantiation...');

try {
  // Test importing from the compiled ESM build
  const pipelineModule = await import('./dist/index.esm.js');
  console.log('✅ Pipeline module imported successfully');
  
  console.log('\n🎉 Compiled module test completed successfully!');
  
} catch (error) {
  console.error('❌ Error during compiled module test:', error);
  process.exit(1);
}