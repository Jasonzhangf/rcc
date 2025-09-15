import { EnhancedPipelineConfigGenerator, EnhancedPipelineConfigConverter } from '../src/index';

describe('Simple Import Test', () => {
  it('should import EnhancedPipelineConfigGenerator', () => {
    console.log('EnhancedPipelineConfigGenerator type:', typeof EnhancedPipelineConfigGenerator);
    expect(typeof EnhancedPipelineConfigGenerator).toBe('function');
  });

  it('should import EnhancedPipelineConfigConverter', () => {
    console.log('EnhancedPipelineConfigConverter type:', typeof EnhancedPipelineConfigConverter);
    expect(typeof EnhancedPipelineConfigConverter).toBe('function');
  });
});