import { EnhancedPipelineConfigGenerator, EnhancedPipelineConfigConverter } from './src/index.ts';

console.log('EnhancedPipelineConfigGenerator type:', typeof EnhancedPipelineConfigGenerator);
console.log('EnhancedPipelineConfigConverter type:', typeof EnhancedPipelineConfigConverter);

if (typeof EnhancedPipelineConfigGenerator === 'function') {
  console.log('✅ EnhancedPipelineConfigGenerator is correctly imported as a function');
} else {
  console.log('❌ EnhancedPipelineConfigGenerator is not a function:', EnhancedPipelineConfigGenerator);
}

if (typeof EnhancedPipelineConfigConverter === 'function') {
  console.log('✅ EnhancedPipelineConfigConverter is correctly imported as a function');
} else {
  console.log('❌ EnhancedPipelineConfigConverter is not a function:', EnhancedPipelineConfigConverter);
}