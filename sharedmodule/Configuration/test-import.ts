import { EnhancedPipelineConfigGenerator } from './src/core/PipelineTableGenerator';

console.log('EnhancedPipelineConfigGenerator type:', typeof EnhancedPipelineConfigGenerator);
console.log('EnhancedPipelineConfigGenerator is function:', typeof EnhancedPipelineConfigGenerator === 'function');

// Try to create an instance
try {
  const generator = new EnhancedPipelineConfigGenerator();
  console.log('Successfully created instance');
} catch (error) {
  console.error('Failed to create instance:', error);
}