// Simple test to check if we can import from the built distribution
const configModule = require('./dist/index.js');

console.log('EnhancedPipelineConfigGenerator type:', typeof configModule.EnhancedPipelineConfigGenerator);
console.log('Is function:', typeof configModule.EnhancedPipelineConfigGenerator === 'function');

if (typeof configModule.EnhancedPipelineConfigGenerator === 'function') {
  try {
    const generator = new configModule.EnhancedPipelineConfigGenerator();
    console.log('Successfully created instance');
  } catch (error) {
    console.error('Failed to create instance:', error.message);
  }
} else {
  console.log('EnhancedPipelineConfigGenerator is not a constructor');
}