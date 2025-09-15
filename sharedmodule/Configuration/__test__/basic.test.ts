import { ConfigurationSystem } from '../src/index';
import { EnhancedPipelineConfigGenerator, EnhancedPipelineConfigConverter } from '../src/index';
import { ConfigData } from '../src/core/ConfigData';

describe('Basic Configuration System Test', () => {
  it('should import ConfigurationSystem correctly', () => {
    expect(typeof ConfigurationSystem).toBe('function');
  });

  it('should import pipeline components correctly', () => {
    expect(typeof EnhancedPipelineConfigGenerator).toBe('function');
    expect(typeof EnhancedPipelineConfigConverter).toBe('function');
  });

  it('should be able to create a ConfigurationSystem instance', async () => {
    const configSystem = new ConfigurationSystem();
    expect(configSystem).toBeDefined();
    expect(typeof configSystem.initialize).toBe('function');
    await configSystem.destroy();
  });

  it('should be able to create an EnhancedPipelineConfigGenerator instance', async () => {
    const generator = new EnhancedPipelineConfigGenerator();
    expect(generator).toBeDefined();
    expect(typeof generator.initialize).toBe('function');
    await generator.destroy();
  });
});