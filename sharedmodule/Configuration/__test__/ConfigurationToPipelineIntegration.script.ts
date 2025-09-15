/**
 * Configuration to Pipeline Integration Test
 * 
 * This test demonstrates the enhanced configuration module's ability to generate
 * complete pipeline configurations that are compatible with both PipelineAssembler
 * and PipelineScheduler expectations.
 */

import { EnhancedPipelineConfigGenerator, EnhancedPipelineConfigConverter } from '../src/index';
import { ConfigData } from '../src/core/ConfigData';

/**
 * Test configuration data
 */
const testConfig: ConfigData = {
  version: '1.0.0',
  providers: {
    'openai': {
      id: 'openai',
      name: 'OpenAI',
      type: 'llm-provider',
      endpoint: 'https://api.openai.com/v1',
      models: {
        'gpt-4': {
          id: 'gpt-4',
          name: 'GPT-4',
          contextLength: 8192,
          supportsFunctions: true
        },
        'gpt-3.5-turbo': {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          contextLength: 4096,
          supportsFunctions: true
        }
      },
      auth: {
        type: 'bearer',
        keys: ['sk-test-key-1', 'sk-test-key-2']
      }
    },
    'anthropic': {
      id: 'anthropic',
      name: 'Anthropic',
      type: 'llm-provider',
      endpoint: 'https://api.anthropic.com/v1',
      models: {
        'claude-3-opus': {
          id: 'claude-3-opus',
          name: 'Claude 3 Opus',
          contextLength: 200000,
          supportsFunctions: false
        }
      },
      auth: {
        type: 'x-api-key',
        keys: ['sk-ant-test-key-1']
      }
    }
  },
  virtualModels: {
    'default': {
      id: 'default',
      targets: [
        {
          providerId: 'openai',
          modelId: 'gpt-4',
          keyIndex: 0
        },
        {
          providerId: 'openai',
          modelId: 'gpt-3.5-turbo',
          keyIndex: 1
        }
      ],
      enabled: true,
      priority: 1
    },
    'longcontext': {
      id: 'longcontext',
      targets: [
        {
          providerId: 'anthropic',
          modelId: 'claude-3-opus',
          keyIndex: 0
        }
      ],
      enabled: true,
      priority: 2
    }
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

/**
 * Test the EnhancedPipelineConfigGenerator
 */
async function testEnhancedPipelineConfigGenerator() {
  console.log('🧪 Testing EnhancedPipelineConfigGenerator');
  
  const generator = new EnhancedPipelineConfigGenerator();
  
  try {
    // Initialize the generator
    await generator.initialize();
    
    // Generate complete pipeline configuration
    const completeConfig = await generator.generateCompletePipelineConfig(testConfig);
    
    console.log('✅ Complete pipeline configuration generated successfully');
    console.log('📊 Configuration metadata:', completeConfig.metadata);
    
    // Validate assembly configuration structure
    const assemblyConfig = completeConfig.assemblyConfig;
    console.log('🔧 Assembly configuration:');
    console.log(`  - Version: ${assemblyConfig.version}`);
    console.log(`  - Routing rules: ${assemblyConfig.routingRules.length}`);
    console.log(`  - Pipeline templates: ${assemblyConfig.pipelineTemplates.length}`);
    console.log(`  - Module registry: ${assemblyConfig.moduleRegistry.length}`);
    console.log(`  - Assembly strategies: ${assemblyConfig.assemblyStrategies.length}`);
    
    // Validate scheduler configuration structure
    const schedulerConfig = completeConfig.schedulerConfig;
    console.log('⚙️ Scheduler configuration:');
    console.log(`  - Scheduler ID: ${schedulerConfig.basic.schedulerId}`);
    console.log(`  - Load balancing strategy: ${schedulerConfig.loadBalancing.strategy}`);
    console.log(`  - Health check strategy: ${schedulerConfig.healthCheck.strategy}`);
    console.log(`  - Performance monitoring: ${schedulerConfig.monitoring.metrics.enabled ? 'enabled' : 'disabled'}`);
    
    return completeConfig;
    
  } catch (error) {
    console.error('❌ EnhancedPipelineConfigGenerator test failed:', error);
    throw error;
  }
}

/**
 * Test the EnhancedPipelineConfigConverter
 */
async function testEnhancedPipelineConfigConverter() {
  console.log('🧪 Testing EnhancedPipelineConfigConverter');
  
  try {
    // Convert config data with default options
    const completeConfig = EnhancedPipelineConfigConverter.convertFromConfigData(testConfig);
    
    console.log('✅ Configuration converted successfully');
    console.log('📊 Configuration metadata:', completeConfig.metadata);
    
    // Test with custom options
    const minimalConfig = EnhancedPipelineConfigConverter.convertFromConfigData(testConfig, {
      generateSchedulerConfig: true,
      includeMonitoring: false,
      includeHealthChecks: false,
      customOverrides: {
        assemblyConfig: {
          version: '2.0.0',
          metadata: {
            description: 'Custom assembly configuration'
          }
        }
      }
    });
    
    console.log('✅ Custom configuration conversion completed');
    console.log(`📝 Custom version: ${minimalConfig.assemblyConfig.version}`);
    console.log(`🔍 Monitoring: ${minimalConfig.schedulerConfig.monitoring.metrics.enabled ? 'enabled' : 'disabled'}`);
    
    return completeConfig;
    
  } catch (error) {
    console.error('❌ EnhancedPipelineConfigConverter test failed:', error);
    throw error;
  }
}

/**
 * Test backward compatibility
 */
async function testBackwardCompatibility() {
  console.log('🧪 Testing backward compatibility');
  
  try {
    // Test simple pipeline table generation
    const generator = new EnhancedPipelineConfigGenerator();
    await generator.initialize();
    
    // This should still work for backward compatibility
    const pipelineTable = await (generator as any).generatePipelineTable(testConfig);
    
    console.log('✅ Backward compatibility maintained');
    console.log(`📋 Simple pipeline table size: ${pipelineTable.size}`);
    
    // Test pipeline validation
    const isValid = await (generator as any).validatePipelineTable(pipelineTable);
    console.log(`✅ Pipeline table validation: ${isValid ? 'valid' : 'invalid'}`);
    
    return pipelineTable;
    
  } catch (error) {
    console.error('❌ Backward compatibility test failed:', error);
    throw error;
  }
}

/**
 * Test configuration validation
 */
async function testConfigurationValidation() {
  console.log('🧪 Testing configuration validation');
  
  try {
    // Test valid configuration
    const converter = new (EnhancedPipelineConfigConverter as any)();
    const isValid = converter.validatePipelineTable({
      'test-entry': {
        virtualModelId: 'default',
        targetProvider: 'openai',
        targetModel: 'gpt-4',
        apiKeyIndex: 0,
        enabled: true,
        priority: 1
      }
    });
    
    console.log(`✅ Valid configuration validation: ${isValid}`);
    
    // Test invalid configuration
    const isInvalid = converter.validatePipelineTable({
      'invalid-entry': {
        virtualModelId: '', // Empty virtual model ID
        targetProvider: 'openai',
        targetModel: 'gpt-4',
        apiKeyIndex: -1, // Invalid key index
        enabled: 'invalid', // Invalid boolean
        priority: 15 // Invalid priority
      }
    });
    
    console.log(`✅ Invalid configuration validation: ${!isInvalid}`);
    
    return { valid: isValid, invalid: !isInvalid };
    
  } catch (error) {
    console.error('❌ Configuration validation test failed:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Configuration to Pipeline Integration Tests');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Enhanced Pipeline Config Generator
    const generatorResult = await testEnhancedPipelineConfigGenerator();
    console.log('');
    
    // Test 2: Enhanced Pipeline Config Converter
    const converterResult = await testEnhancedPipelineConfigConverter();
    console.log('');
    
    // Test 3: Backward Compatibility
    const compatibilityResult = await testBackwardCompatibility();
    console.log('');
    
    // Test 4: Configuration Validation
    const validationResult = await testConfigurationValidation();
    console.log('');
    
    // Summary
    console.log('🎉 All tests completed successfully!');
    console.log('');
    console.log('📋 Test Summary:');
    console.log(`  ✅ EnhancedPipelineConfigGenerator: Generated complete config with ${generatorResult.assemblyConfig.pipelineTemplates.length} templates`);
    console.log(`  ✅ EnhancedPipelineConfigConverter: Successfully converted config data`);
    console.log(`  ✅ Backward Compatibility: Generated ${compatibilityResult.size} pipeline entries`);
    console.log(`  ✅ Configuration Validation: Valid=${validationResult.valid}, Invalid=${validationResult.invalid}`);
    
    console.log('');
    console.log('🔧 Generated configuration files:');
    console.log(`  - Assembly Config: ${generatorResult.assemblyConfig.version}`);
    console.log(`  - Scheduler Config: ${generatorResult.schedulerConfig.basic.version}`);
    console.log(`  - Module Registry: ${generatorResult.assemblyConfig.moduleRegistry.length} modules`);
    console.log(`  - Routing Rules: ${generatorResult.assemblyConfig.routingRules.length} rules`);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Export test functions for external use
export {
  testEnhancedPipelineConfigGenerator,
  testEnhancedPipelineConfigConverter,
  testBackwardCompatibility,
  testConfigurationValidation,
  runAllTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}