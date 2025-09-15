import { EnhancedPipelineConfigGenerator, EnhancedPipelineConfigConverter } from '../dist/index.esm.js';

describe('Direct Import Test', () => {
  it('should import EnhancedPipelineConfigGenerator directly from source', () => {
    console.log('EnhancedPipelineConfigGenerator type:', typeof EnhancedPipelineConfigGenerator);
    expect(typeof EnhancedPipelineConfigGenerator).toBe('function');
  });

  it('should import EnhancedPipelineConfigConverter directly from source', () => {
    console.log('EnhancedPipelineConfigConverter type:', typeof EnhancedPipelineConfigConverter);
    expect(typeof EnhancedPipelineConfigConverter).toBe('function');
  });
});