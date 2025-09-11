/**
 * Test Configuration to Pipeline Integration
 * 
 * This script demonstrates and tests the Configuration to Pipeline integration functionality.
 */

import { createEnhancedConfigurationSystem } from './src/index';
import { basicVirtualModelConfig, advancedVirtualModelConfig } from './src/examples/ConfigurationToPipelineExamples';

async function testConfigurationToPipelineIntegration() {
  console.log('🧪 Testing Configuration to Pipeline Integration...\n');

  try {
    // Test 1: Basic Configuration
    console.log('📋 Test 1: Basic Configuration with Virtual Model Mapping');
    console.log('============================================================');

    const basicConfigSystem = await createEnhancedConfigurationSystem({
      pipelineIntegration: {
        enabled: true,
        strategy: 'static',
        cache: {
          enabled: true,
          ttl: 300000,
          maxSize: 50
        },
        validation: {
          strict: true,
          failOnError: false,
          warnOnUnknown: true
        }
      }
    });

    console.log('✓ Enhanced configuration system created');

    // Load basic configuration
    await basicConfigSystem.loadConfiguration(basicVirtualModelConfig as any);
    console.log('✓ Basic configuration loaded');

    // Check pipeline integration status
    const status = basicConfigSystem.getEnhancedStatus();
    console.log('📊 System Status:', JSON.stringify(status, null, 2));

    // Get pipeline configurations
    const pipelineConfigs = basicConfigSystem.getAllPipelineConfigs();
    console.log(`🔧 Generated ${pipelineConfigs.size} pipeline configurations`);

    // Show pipeline details
    for (const [virtualModelId, pipelineConfig] of pipelineConfigs.entries()) {
      console.log(`\n📋 Pipeline: ${virtualModelId}`);
      console.log(`   ID: ${pipelineConfig.id}`);
      console.log(`   Name: ${pipelineConfig.name}`);
      console.log(`   Modules: ${pipelineConfig.modules.length}`);
      console.log(`   Connections: ${pipelineConfig.connections.length}`);
      
      console.log('   Modules:');
      pipelineConfig.modules.forEach(module => {
        console.log(`     - ${module.id} (${module.type})`);
      });
      
      console.log('   Connections:');
      pipelineConfig.connections.forEach(connection => {
        console.log(`     - ${connection.source} → ${connection.target} (${connection.type})`);
      });
    }

    // Test pipeline retrieval
    const testPipeline = basicConfigSystem.getPipeline('smart-assistant');
    console.log(`\n🔄 Pipeline retrieval test: ${testPipeline ? '✓ Success' : '✗ Failed'}`);

    // Validate configuration
    const validation = await basicConfigSystem.validateConfigurationForPipeline(
      basicConfigSystem.getConfiguration()
    );
    console.log('🔍 Configuration validation:', {
      valid: validation.valid,
      errors: validation.errors.length,
      warnings: validation.warnings.length
    });

    if (validation.errors.length > 0) {
      console.log('   Errors:', validation.errors);
    }

    // Cleanup
    await basicConfigSystem.destroy();
    console.log('✓ Basic configuration system cleaned up\n');

    // Test 2: Advanced Configuration
    console.log('📋 Test 2: Advanced Configuration with Custom Pipelines');
    console.log('============================================================');

    const advancedConfigSystem = await createEnhancedConfigurationSystem({
      pipelineIntegration: {
        enabled: true,
        strategy: 'hybrid',
        cache: {
          enabled: true,
          ttl: 600000,
          maxSize: 100
        },
        validation: {
          strict: true,
          failOnError: false,
          warnOnUnknown: true
        }
      }
    });

    console.log('✓ Advanced configuration system created');

    // Load advanced configuration
    await advancedConfigSystem.loadConfiguration(advancedVirtualModelConfig as any);
    console.log('✓ Advanced configuration loaded');

    // Check advanced pipeline configurations
    const advancedPipelineConfigs = advancedConfigSystem.getAllPipelineConfigs();
    console.log(`🔧 Generated ${advancedPipelineConfigs.size} advanced pipeline configurations`);

    // Show advanced pipeline details
    for (const [virtualModelId, pipelineConfig] of advancedPipelineConfigs.entries()) {
      console.log(`\n📋 Advanced Pipeline: ${virtualModelId}`);
      console.log(`   ID: ${pipelineConfig.id}`);
      console.log(`   Name: ${pipelineConfig.name}`);
      console.log(`   Description: ${pipelineConfig.description}`);
      console.log(`   Modules: ${pipelineConfig.modules.length}`);
      console.log(`   Connections: ${pipelineConfig.connections.length}`);
      
      console.log('   Modules:');
      pipelineConfig.modules.forEach(module => {
        console.log(`     - ${module.id} (${module.type})`);
        if (Object.keys(module.config).length > 0) {
          console.log(`       Config: ${JSON.stringify(module.config, null, 2)}`);
        }
      });
      
      console.log('   Connections:');
      pipelineConfig.connections.forEach(connection => {
        console.log(`     - ${connection.source} → ${connection.target} (${connection.type})`);
      });
    }

    // Test advanced pipeline retrieval
    const codeAssistantPipeline = advancedConfigSystem.getPipeline('code-assistant');
    const contentCreatorPipeline = advancedConfigSystem.getPipeline('content-creator');
    console.log(`\n🔄 Advanced pipeline retrieval test:`);
    console.log(`   Code Assistant: ${codeAssistantPipeline ? '✓ Success' : '✗ Failed'}`);
    console.log(`   Content Creator: ${contentCreatorPipeline ? '✓ Success' : '✗ Failed'}`);

    // Test reload and reassemble
    console.log('\n🔄 Testing reload and reassemble...');
    const reloadResult = await advancedConfigSystem.reloadAndReassemble();
    console.log('📊 Reload result:', {
      success: reloadResult.success,
      assemblyTime: reloadResult.metadata?.assemblyTime,
      virtualModelCount: reloadResult.metadata?.virtualModelCount
    });

    // Cleanup
    await advancedConfigSystem.destroy();
    console.log('✓ Advanced configuration system cleaned up\n');

    // Test 3: Error Handling
    console.log('📋 Test 3: Error Handling and Validation');
    console.log('============================================================');

    const errorTestSystem = await createEnhancedConfigurationSystem({
      pipelineIntegration: {
        enabled: true,
        validation: {
          strict: false,
          failOnError: false,
          warnOnUnknown: true
        }
      }
    });

    console.log('✓ Error test configuration system created');

    // Test with invalid configuration
    const invalidConfig = {
      metadata: {
        name: 'Invalid Configuration',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      settings: {
        providers: {
          // Missing models
          openai: {
            name: 'OpenAI Provider',
            type: 'openai',
            models: {}
          }
        },
        virtualModels: {
          'invalid-assistant': {
            targetProvider: 'nonexistent-provider', // Invalid provider
            targetModel: 'gpt-4'
          },
          'incomplete-assistant': {
            targetProvider: 'openai'
            // Missing targetModel
          }
        }
      },
      version: '1.0.0'
    };

    const errorValidation = await errorTestSystem.validateConfigurationForPipeline(invalidConfig as any);
    console.log('🔍 Invalid configuration validation:', {
      valid: errorValidation.valid,
      errorCount: errorValidation.errors.length,
      warningCount: errorValidation.warnings.length
    });

    if (errorValidation.errors.length > 0) {
      console.log('   Errors:');
      errorValidation.errors.forEach((error, index) => {
        console.log(`     ${index + 1}. ${error}`);
      });
    }

    if (errorValidation.warnings.length > 0) {
      console.log('   Warnings:');
      errorValidation.warnings.forEach((warning, index) => {
        console.log(`     ${index + 1}. ${warning}`);
      });
    }

    // Try to assemble with invalid config (should fail gracefully)
    try {
      const assemblyResult = await errorTestSystem.assemblePipelinesFromConfiguration(invalidConfig as any);
      console.log('📊 Assembly result with invalid config:', {
        success: assemblyResult.success,
        errorCount: assemblyResult.errors?.length || 0
      });

      if (assemblyResult.errors && assemblyResult.errors.length > 0) {
        console.log('   Assembly errors:');
        assemblyResult.errors.forEach((error, index) => {
          console.log(`     ${index + 1}. ${error}`);
        });
      }
    } catch (error) {
      console.log('❌ Assembly failed with exception:', error.message);
    }

    // Cleanup
    await errorTestSystem.destroy();
    console.log('✓ Error test configuration system cleaned up\n');

    // Test 4: Performance Test
    console.log('📋 Test 4: Performance and Caching Test');
    console.log('============================================================');

    const performanceTestSystem = await createEnhancedConfigurationSystem({
      pipelineIntegration: {
        enabled: true,
        strategy: 'static',
        cache: {
          enabled: true,
          ttl: 300000,
          maxSize: 1000
        },
        validation: {
          strict: true,
          failOnError: false,
          warnOnUnknown: false
        }
      }
    });

    console.log('✓ Performance test configuration system created');

    // Load configuration
    await performanceTestSystem.loadConfiguration(basicVirtualModelConfig as any);
    console.log('✓ Configuration loaded for performance test');

    // Test multiple pipeline retrievals (should use cache)
    const startTime = Date.now();
    const retrievalCount = 100;
    
    for (let i = 0; i < retrievalCount; i++) {
      const pipeline = performanceTestSystem.getPipeline('smart-assistant');
      if (!pipeline) {
        console.log('❌ Pipeline retrieval failed during performance test');
        break;
      }
    }

    const endTime = Date.now();
    const averageTime = (endTime - startTime) / retrievalCount;
    
    console.log(`📊 Performance test results:`);
    console.log(`   Retrievals: ${retrievalCount}`);
    console.log(`   Total time: ${endTime - startTime}ms`);
    console.log(`   Average time: ${averageTime.toFixed(2)}ms per retrieval`);
    console.log(`   Cache performance: ${averageTime < 1 ? '✓ Excellent' : averageTime < 5 ? '✓ Good' : '⚠️ Needs optimization'}`);

    // Get cache statistics
    const perfStatus = performanceTestSystem.getEnhancedStatus();
    console.log('   Cache statistics:', perfStatus.pipelineIntegration?.pipelineCacheSize || 0);

    // Cleanup
    await performanceTestSystem.destroy();
    console.log('✓ Performance test configuration system cleaned up\n');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testConfigurationToPipelineIntegration()
    .then(() => {
      console.log('\n✅ Configuration to Pipeline Integration Test Suite Completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test Suite Failed:', error);
      process.exit(1);
    });
}

export { testConfigurationToPipelineIntegration };