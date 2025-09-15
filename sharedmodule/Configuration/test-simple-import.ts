import { EnhancedPipelineConfigGenerator, EnhancedPipelineConfigConverter } from './src/index.ts';

console.log('EnhancedPipelineConfigGenerator:', typeof EnhancedPipelineConfigGenerator);
console.log('EnhancedPipelineConfigConverter:', typeof EnhancedPipelineConfigConverter);

// Try to create an instance
try {
  if (typeof EnhancedPipelineConfigGenerator === 'function') {
    const generator = new EnhancedPipelineConfigGenerator();
    console.log('Successfully created EnhancedPipelineConfigGenerator instance');
  } else {
    console.log('EnhancedPipelineConfigGenerator is not a constructor');
  }
} catch (error) {
  console.error('Failed to create EnhancedPipelineConfigGenerator instance:', error);
}

try {
  if (typeof EnhancedPipelineConfigConverter === 'object') {
    console.log('EnhancedPipelineConfigConverter is an object with methods');
  } else {
    console.log('EnhancedPipelineConfigConverter type:', typeof EnhancedPipelineConfigConverter);
  }
} catch (error) {
  console.error('Failed to check EnhancedPipelineConfigConverter:', error);
}