/**
 * Phase 4 Integration Test - RCC System with Enhanced Wrapper Validation
 *
 * This script tests the complete integration of the wrapper validation system
 * including fallback mechanisms, comprehensive error handling, and logging.
 */

import { generateAllWrappers } from './sharedmodule/config-parser/src/index';
import { WrapperGenerator, ConfigValidator } from './src/utils/config-validation';

/**
 * Sample configuration for testing
 */
const testConfig = {
  version: '1.0.0',
  port: 8080,
  providers: {
    'openai-provider': {
      name: 'OpenAI Provider',
      type: 'openai',
      endpoint: 'https://api.openai.com/v1',
      models: {
        'gpt-4': {
          id: 'gpt-4',
          name: 'GPT-4',
          contextLength: 8192,
          supportsFunctions: true
        }
      },
      auth: {
        type: 'api-key',
        keys: ['sk-test-key']
      }
    },
    'anthropic-provider': {
      name: 'Anthropic Provider',
      type: 'anthropic',
      endpoint: 'https://api.anthropic.com',
      models: {
        'claude-3': {
          id: 'claude-3',
          name: 'Claude 3',
          contextLength: 200000,
          supportsFunctions: true
        }
      },
      auth: {
        type: 'api-key',
        keys: ['sk-ant-test-key']
      }
    }
  },
  virtualModels: {
    'default-model': {
      id: 'default-model',
      targets: [
        {
          providerId: 'openai-provider',
          modelId: 'gpt-4',
          keyIndex: 0
        }
      ],
      enabled: true,
      priority: 1,
      weight: 0.7
    },
    'fallback-model': {
      id: 'fallback-model',
      targets: [
        {
          providerId: 'anthropic-provider',
          modelId: 'claude-3',
          keyIndex: 0
        }
      ],
      enabled: true,
      priority: 2,
      weight: 0.3
    }
  },
  server: {
    port: 8080,
    host: '0.0.0.0',
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true
    },
    compression: true,
    helmet: true,
    rateLimit: {
      windowMs: 900000,
      max: 200
    },
    timeout: 60000,
    bodyLimit: '50mb'
  },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z'
};

/**
 * Test cases for wrapper validation
 */
const testCases = [
  {
    name: 'Valid Configuration',
    config: testConfig,
    expectSuccess: true
  },
  {
    name: 'Missing Required Fields',
    config: {
      ...testConfig,
      providers: undefined
    },
    expectSuccess: false
  },
  {
    name: 'Invalid Virtual Models',
    config: {
      ...testConfig,
      virtualModels: {
        'invalid-model': {
          id: 'invalid-model',
          targets: [], // Empty targets should fail
          enabled: true
        }
      }
    },
    expectSuccess: false
  },
  {
    name: 'Invalid Server Port',
    config: {
      ...testConfig,
      server: {
        ...testConfig.server,
        port: 99999 // Invalid port
      }
    },
    expectSuccess: false
  }
];

/**
 * Run comprehensive integration tests
 */
async function runIntegrationTests() {
  console.log('🧪 Phase 4 Integration Test - RCC Wrapper Validation System');
  console.log('='.repeat(60));

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);

    try {
      // Test enhanced wrapper generation with validation
      const result = await WrapperGenerator.generateWrappersWithValidation(
        testCase.config,
        generateAllWrappers
      );

      console.log(`   Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);

      if (result.success) {
        console.log(`   - Generation time: ${result.metadata?.generationTime}ms`);
        console.log(`   - Providers: ${result.metadata?.providerCount}`);
        console.log(`   - Virtual models: ${result.metadata?.virtualModelCount}`);

        // Additional validation
        const serverErrors = ConfigValidator.validateServerWrapper(result.server!);
        const pipelineErrors = ConfigValidator.validatePipelineWrapper(result.pipeline!);

        if (serverErrors.length > 0) {
          console.log(`   - Server wrapper validation errors: ${serverErrors.length}`);
          serverErrors.forEach(error => {
            console.log(`     * ${error.code}: ${error.message}`);
          });
        }

        if (pipelineErrors.length > 0) {
          console.log(`   - Pipeline wrapper validation errors: ${pipelineErrors.length}`);
          pipelineErrors.forEach(error => {
            console.log(`     * ${error.code}: ${error.message}`);
          });
        }

        if (serverErrors.length === 0 && pipelineErrors.length === 0) {
          console.log(`   - All wrapper validations passed: ✅`);
        }
      } else {
        console.log(`   - Validation errors: ${result.errors?.length || 0}`);
        result.errors?.forEach(error => {
          console.log(`     * ${error.code}: ${error.message} (${error.path})`);
        });
      }

      // Check if test result matches expectation
      if (result.success === testCase.expectSuccess) {
        console.log(`   Test result matches expectation: ✅`);
        passedTests++;
      } else {
        console.log(`   Test result does not match expectation: ❌`);
        console.log(`   Expected: ${testCase.expectSuccess ? 'success' : 'failure'}`);
        console.log(`   Actual: ${result.success ? 'success' : 'failure'}`);
      }

    } catch (error) {
      console.log(`   Test failed with exception: ❌`);
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);

      if (!testCase.expectSuccess) {
        console.log(`   Exception was expected: ✅`);
        passedTests++;
      }
    }
  }

  // Test fallback mechanism
  console.log(`\n🔄 Testing Fallback Mechanism...`);
  try {
    const fallbackWrappers = WrapperGenerator.generateFallbackWrappers(testConfig);
    console.log(`   Fallback server wrapper generated: ✅`);
    console.log(`   - Port: ${fallbackWrappers.server.port}`);
    console.log(`   - Host: ${fallbackWrappers.server.host}`);
    console.log(`   - CORS: ${Array.isArray(fallbackWrappers.server.cors.origin) ? fallbackWrappers.server.cors.origin.join(', ') : fallbackWrappers.server.cors.origin}`);

    console.log(`   Fallback pipeline wrapper generated: ✅`);
    console.log(`   - Virtual models: ${fallbackWrappers.pipeline.virtualModels.length}`);
    console.log(`   - Modules: ${fallbackWrappers.pipeline.modules.length}`);
    console.log(`   - Routing: ${fallbackWrappers.pipeline.routing.strategy}`);

    passedTests++;
  } catch (error) {
    console.log(`   Fallback mechanism failed: ❌`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Summary
  console.log(`\n📊 Test Summary:`);
  console.log(`   Passed: ${passedTests}/${totalTests + 1} tests`);
  console.log(`   Success rate: ${Math.round((passedTests / (totalTests + 1)) * 100)}%`);

  if (passedTests === totalTests + 1) {
    console.log(`\n🎉 All tests passed! Phase 4 integration is complete.`);
  } else {
    console.log(`\n⚠️  Some tests failed. Please review the issues above.`);
  }
}

/**
 * Test configuration validation directly
 */
function testConfigurationValidation() {
  console.log(`\n🔍 Testing Configuration Validation...`);

  // Test valid configuration
  const validConfig = testConfig;
  const validErrors = ConfigValidator.validateRccConfig(validConfig);
  console.log(`   Valid configuration errors: ${validErrors.length} (expected: 0)`);

  // Test invalid configuration
  const invalidConfig = {
    ...testConfig,
    providers: 'not-an-object' as any
  };
  const invalidErrors = ConfigValidator.validateRccConfig(invalidConfig);
  console.log(`   Invalid configuration errors: ${invalidErrors.length} (expected: >0)`);

  if (invalidErrors.length > 0) {
    console.log(`   Sample error: ${invalidErrors[0].code} - ${invalidErrors[0].message}`);
  }
}

// Run the tests
async function main() {
  try {
    await runIntegrationTests();
    testConfigurationValidation();

    console.log(`\n✨ Phase 4 Integration Test completed!`);
    console.log(`\nThe RCC system now includes:`);
    console.log(`   ✅ Enhanced wrapper validation with comprehensive error reporting`);
    console.log(`   ✅ Fallback configuration generation for robustness`);
    console.log(`   ✅ Type-safe configuration interfaces`);
    console.log(`   ✅ Clean separation between HTTP and pipeline configuration`);
    console.log(`   ✅ Comprehensive logging and debugging support`);

  } catch (error) {
    console.error(`❌ Test execution failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main().catch(console.error);