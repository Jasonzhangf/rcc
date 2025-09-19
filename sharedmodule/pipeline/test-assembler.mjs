/**
 * Test for new Pipeline Assembler functionality
 * 新流水线组装器功能测试
 */

import { PipelineAssembler, AssemblerConfig } from '../src/framework/PipelineAssembler';
import { ModuleScanner } from '../src/framework/ModuleScanner';
import { PipelineTracker } from '../src/framework/PipelineTracker';
import { VirtualModelConfig } from '../src/types/virtual-model';

// Mock providers for testing
import BaseProvider from '../src/framework/BaseProvider';

// Simple mock provider for testing
class MockProvider extends BaseProvider {
  constructor(config: any) {
    super(config);
  }

  healthCheck(): Promise<any> {
    return Promise.resolve({
      status: 'healthy',
      provider: this.getInfo().name,
      timestamp: Date.now()
    });
  }

  getCapabilities(): any {
    return {
      streaming: true,
      tools: true,
      vision: false,
      jsonMode: true
    };
  }
}

async function testPipelineAssembly() {
  console.log('🚀 Testing Pipeline Assembly...');

  try {
    // Step 1: Create tracker
    const pipelineTracker = new PipelineTracker({
      enabled: true,
      baseDirectory: './test-logs',
      paths: {
        requests: 'requests',
        responses: 'responses',
        errors: 'errors',
        pipeline: 'pipeline',
        system: 'system'
      },
      logLevel: 'info',
      requestTracking: {
        enabled: true,
        generateRequestIds: true,
        includeTimestamps: true,
        trackMetadata: true
      }
    });

    // Step 2: Create assembler with test configuration
    const assemblerConfig: AssemblerConfig = {
      enableAutoDiscovery: true,
      fallbackStrategy: 'first-available',
      providerDiscoveryOptions: {
        enabledProviders: ['qwen'], // Test with qwen provider
        includeTestProviders: true
      },
      pipelineFactoryConfig: {
        defaultTimeout: 30000,
        defaultHealthCheckInterval: 30000,
        defaultMaxRetries: 3,
        defaultLoadBalancingStrategy: 'round-robin',
        enableHealthChecks: true,
        metricsEnabled: true
      }
    };

    const assembler = new PipelineAssembler(assemblerConfig, pipelineTracker);
    console.log('✅ PipelineAssembler created successfully');

    // Step 3: Test virtual model configuration
    const virtualModels: VirtualModelConfig[] = [
      {
        id: 'v1',
        name: 'V1 Model',
        modelId: 'qwen-turbo',
        provider: 'qwen',
        enabled: true,
        targets: [
          {
            providerId: 'qwen',
            modelId: 'qwen-turbo',
            weight: 1,
            enabled: true
          }
        ],
        capabilities: ['chat', 'stream']
      },
      {
        id: 'v2',
        name: 'V2 Model',
        modelId: 'qwen-plus',
        provider: 'qwen',
        enabled: true,
        targets: [
          {
            providerId: 'qwen',
            modelId: 'qwen-plus',
            weight: 1,
            enabled: true
          }
        ]
      }
    ];

    // Step 4: Test provider discovery
    console.log('🔍 Testing provider discovery...');
    const result = await assembler.discoverProviders?.() || new Map();
    console.log(`✅ Provider discovery completed. Found ${result.size} providers`);

    // Step 5: Test pipeline assembly
    console.log('🏗️  Testing pipeline assembly...');
    const assemblyResult = await assembler.assemblePipelines(virtualModels);

    console.log('📊 Assembly Results:');
    console.log(`✅ Success: ${assemblyResult.success}`);
    console.log(`📦 Pipeline pools: ${assemblyResult.pipelinePools.size}`);
    console.log(`⚠️  Errors: ${assemblyResult.errors.length}`);
    console.log(`⚠️  Warnings: ${assemblyResult.warnings.length}`);

    // Print pool details
    if (assemblyResult.success && assemblyResult.pipelinePools.size > 0) {
      console.log('\n🏊‍♂️ Pipeline Pools Details:');
      for (const [vmId, pool] of assemblyResult.pipelinePools.entries()) {
        console.log(`\nPool for VM: ${vmId}`);
        console.log(`  - Pipelines: ${pool.pipelines.size}`);
        console.log(`  - Health: ${pool.healthStatus}`);
        console.log(`  - Active pipeline: ${pool.activePipeline ? 'yes' : 'no'}`);
        console.log(`  - Metrics: ${pool.metrics.totalRequests} total, ${pool.metrics.successfulRequests} success, ${pool.metrics.failedRequests} failed`);

        // Show pipeline details
        if (pool.pipelines.size > 0) {
          console.log('  - Pipeline IDs:');
          for (const [pipelineId, pipeline] of pool.pipelines.entries()) {
            console.log(`    * ${pipelineId}: ${pipeline.config.name}`);
          }
        }
      }
    }

    // Step 6: Test assembler status
    const status = assembler.getStatus();
    console.log('\n📋 Assembler Status:');
    console.log(`  - Initialized: ${status.initialized}`);
    console.log(`  - Total pools: ${status.totalPools}`);
    console.log(`  - Total pipelines: ${status.totalPipelines}`);
    console.log(`  - Healthy pools: ${status.healthyPools}`);
    console.log(`  - Discovered providers: ${status.discoveredProviders}`);
    console.log(`  - Virtual models: ${status.virtualModelIds.join(', ')}`);

    // Step 7: Test individual pool access
    const pool1 = assembler.getPipelinePool('v1');
    if (pool1) {
      console.log('\n🎯 Individual Pool Access Test:');
      console.log(`✅ Found pool for v1: ${pool1.virtualModelId}, pipelines: ${pool1.pipelines.size}`);
    } else {
      console.log('❌ Pool for v1 not found');
    }

    console.log('\n🎉 Pipeline Assembly Test completed successfully!');

    // Cleanup
    assembler.destroy();
    pipelineTracker.destroy();

  } catch (error) {
    console.error('❌ Pipeline Assembly Test failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testPipelineAssembly().then(() => {
    console.log('✅ Test execution completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { testPipelineAssembly };