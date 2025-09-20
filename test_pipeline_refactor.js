const { PipelineBaseModule } = require('./sharedmodule/pipeline/dist/index.esm.js');

/**
 * Comprehensive test suite for refactored PipelineBaseModule
 * 重构后PipelineBaseModule的综合测试套件
 */

async function testPipelineBaseModuleRefactor() {
  console.log('🧪 Testing refactored PipelineBaseModule...\n');

  // Test 1: Basic instantiation with type-safe configuration
  console.log('1️⃣ Testing basic instantiation...');
  try {
    const config = {
      id: 'test-pipeline-001',
      name: 'Test Pipeline Module',
      version: '1.0.0',
      description: 'Test module for type-safe refactoring',
      type: 'pipeline',
      providerName: 'TestProvider',
      endpoint: 'http://localhost:3000',
      supportedModels: ['model-1', 'model-2'],
      defaultModel: 'model-1',
      enableTwoPhaseDebug: true,
      debugBaseDirectory: './test-logs',
      enableIOTracking: true
    };

    const pipelineModule = new PipelineBaseModule(config);
    console.log('✅ Basic instantiation passed');
  } catch (error) {
    console.error('❌ Basic instantiation failed:', error.message);
    return false;
  }

  // Test 2: Configuration management
  console.log('\n2️⃣ Testing configuration management...');
  try {
    const originalConfig = {
      id: 'test-pipeline-002',
      name: 'Config Test Module',
      version: '1.0.0',
      description: 'Testing config management',
      type: 'provider'
    };

    const pipelineModule = new PipelineBaseModule(originalConfig);

    // Test getPipelineConfig
    const retrievedConfig = pipelineModule.getPipelineConfig();
    console.log('✅ getPipelineConfig works');

    // Test updatePipelineConfig
    const updateConfig = { providerName: 'UpdatedProvider', endpoint: 'http://updated.endpoint' };
    pipelineModule.updatePipelineConfig(updateConfig);
    const updatedConfig = pipelineModule.getPipelineConfig();

    if (updatedConfig.providerName === 'UpdatedProvider' && updatedConfig.endpoint === 'http://updated.endpoint') {
      console.log('✅ updatePipelineConfig works correctly');
    } else {
      console.error('❌ updatePipelineConfig failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Configuration management failed:', error.message);
    return false;
  }

  // Test 3: Provider information
  console.log('\n3️⃣ Testing provider information...');
  try {
    const config = {
      id: 'test-pipeline-003',
      name: 'Provider Info Test',
      version: '1.0.0',
      description: 'Testing provider info',
      type: 'provider',
      providerName: 'TestAI',
      supportedModels: ['gpt-3.5-turbo', 'gpt-4'],
      defaultModel: 'gpt-3.5-turbo'
    };

    const pipelineModule = new PipelineBaseModule(config);
    const providerInfo = pipelineModule.getProviderInfo();

    if (providerInfo.name === 'TestAI' &&
        providerInfo.supportedModels.length === 2 &&
        providerInfo.type === 'provider') {
      console.log('✅ Provider info retrieval works correctly');
    } else {
      console.error('❌ Provider info mismatch:', providerInfo);
      return false;
    }
  } catch (error) {
    console.error('❌ Provider information test failed:', error.message);
    return false;
  }

  // Test 4: Error handling with typed context
  console.log('\n4️⃣ Testing error handling with typed context...');
  try {
    const config = {
      id: 'test-pipeline-004',
      name: 'Error Handling Test',
      version: '1.0.0',
      description: 'Testing error handling',
      type: 'pipeline'
    };

    const pipelineModule = new PipelineBaseModule(config);

    const testError = new Error('Test error message');
    const context = {
      operation: 'testOperation',
      stage: 'validation',
      requestId: 'req-123',
      additionalData: { userId: 'user-456', timestamp: Date.now() }
    };

    // This should not throw, just log and handle
    pipelineModule.handlePipelineError(testError, context);

    // Test error formatting
    const errorResponse = pipelineModule.formatErrorResponse(testError, context);

    if (errorResponse.error && errorResponse.context && errorResponse.system) {
      console.log('✅ Error handling and formatting works correctly');
    } else {
      console.error('❌ Error formatting failed:', errorResponse);
      return false;
    }
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
    return false;
  }

  // Test 5: Pipeline operation tracking with generics
  console.log('\n5️⃣ Testing pipeline operation tracking with generics...');
  try {
    const config = {
      id: 'test-pipeline-005',
      name: 'Operation Tracking Test',
      version: '1.0.0',
      description: 'Testing operation tracking',
      type: 'pipeline',
      enableIOTracking: true
    };

    const pipelineModule = new PipelineBaseModule(config);

    // Test successful operation
    const result = await pipelineModule.trackPipelineOperation(
      'test-operation-001',
      async () => {
        return { success: true, data: 'test result' };
      },
      { input: 'test input' },
      'test-operation'
    );

    if (result.success === true && result.data === 'test result') {
      console.log('✅ Successful operation tracking works');
    } else {
      console.error('❌ Successful operation tracking failed');
      return false;
    }

    // Test failed operation
    try {
      await pipelineModule.trackPipelineOperation(
        'failing-operation-001',
        async () => {
          throw new Error('Expected failure');
        },
        { input: 'will fail' },
        'failing-operation'
      );
      console.error('❌ Failing operation should have thrown');
      return false;
    } catch (error) {
      if (error.message === 'Expected failure') {
        console.log('✅ Failing operation tracking works correctly');
      } else {
        console.error('❌ Unexpected error in failing operation:', error.message);
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Operation tracking test failed:', error.message);
    return false;
  }

  // Test 6: Pipeline stage recording
  console.log('\n6️⃣ Testing pipeline stage recording...');
  try {
    const config = {
      id: 'test-pipeline-006',
      name: 'Stage Recording Test',
      version: '1.0.0',
      description: 'Testing stage recording',
      type: 'pipeline'
    };

    const pipelineModule = new PipelineBaseModule(config);

    pipelineModule.recordPipelineStage('initialization', { status: 'ready' }, 'started');
    pipelineModule.recordPipelineStage('processing', { items: 10 }, 'completed');
    pipelineModule.recordPipelineStage('cleanup', null, 'failed');

    console.log('✅ Pipeline stage recording works correctly');
  } catch (error) {
    console.error('❌ Pipeline stage recording failed:', error.message);
    return false;
  }

  // Test 7: Pipeline metrics
  console.log('\n7️⃣ Testing pipeline metrics...');
  try {
    const config = {
      id: 'test-pipeline-007',
      name: 'Metrics Test',
      version: '1.0.0',
      description: 'Testing metrics',
      type: 'pipeline',
      enableTwoPhaseDebug: true
    };

    const pipelineModule = new PipelineBaseModule(config);
    const metrics = pipelineModule.getPipelineMetrics();

    if (metrics.debugEnabled === true &&
        typeof metrics.debugConfig === 'object' &&
        Array.isArray(metrics.debugConfig)) {
      console.log('✅ Pipeline metrics retrieval works correctly');
    } else {
      console.error('❌ Pipeline metrics structure invalid:', metrics);
      return false;
    }
  } catch (error) {
    console.error('❌ Pipeline metrics test failed:', error.message);
    return false;
  }

  // Test 8: Module cleanup (destroy)
  console.log('\n8️⃣ Testing module cleanup...');
  try {
    const config = {
      id: 'test-pipeline-008',
      name: 'Cleanup Test',
      version: '1.0.0',
      description: 'Testing cleanup',
      type: 'pipeline'
    };

    const pipelineModule = new PipelineBaseModule(config);
    await pipelineModule.destroy();

    console.log('✅ Module cleanup works correctly');
  } catch (error) {
    console.error('❌ Module cleanup failed:', error.message);
    return false;
  }

  console.log('\n🎉 All PipelineBaseModule refactoring tests passed!\n');
  return true;
}

// Run the test suite
if (require.main === module) {
  testPipelineBaseModuleRefactor()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}

module.exports = { testPipelineBaseModuleRefactor };