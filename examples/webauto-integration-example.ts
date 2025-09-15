/**
 * WebAuto Pipeline Framework Integration Example
 *
 * This example demonstrates how to use the new WebAuto pipeline framework
 * with RCC configuration system.
 */

import {
  EnhancedPipelineFactory,
  PipelineUtils,
  WebAutoConfigurationAdapter,
  WebAutoPipelineBuilder
} from '../sharedmodule/pipeline';

import {
  createConfigurationSystem,
  ConfigData,
  createConfigurationTemplate
} from '../sharedmodule/Configuration';

import { VirtualModelRulesModule } from 'rcc-virtual-model-rules';

async function main() {
  console.log('=== WebAuto Pipeline Framework Integration Demo ===');

  // 1. Validate system setup
  console.log('\n1. Validating system setup...');
  const validationResult = PipelineUtils.validateSystem();
  console.log('Validation result:', validationResult);

  if (!validationResult.valid) {
    console.log('System validation failed, issues:');
    validationResult.issues.forEach(issue => console.log(`  - ${issue}`));

    console.log('\nRecommendations:');
    validationResult.recommendations.forEach(rec => console.log(`  - ${rec}`));

    return;
  }

  console.log('✓ System validation passed');

  // 2. Get system health
  console.log('\n2. Getting system health...');
  const health = PipelineUtils.getSystemHealth();
  console.log('System health:', JSON.stringify(health, null, 2));

  // 3. Create configuration system
  console.log('\n3. Creating configuration system...');
  const configSystem = await createConfigurationSystem({
    initialConfig: createSampleConfiguration(),
    enablePipelineIntegration: true
  });

  // 4. Create virtual model rules module (mock for demo)
  const virtualModelRulesModule = new VirtualModelRulesModule({
    basicDavid3: {
      enabled: true,
      rules: []
    },
    basicDavid3Materials: {
      enabled: true,
      rules: []
    }
  });

  // 5. Create enhanced pipeline system
  console.log('\n4. Creating enhanced pipeline system...');
  const enhancedSystem = EnhancedPipelineFactory.createEnhancedSystem({
    configurationSystem: configSystem,
    virtualModelRulesModule: virtualModelRulesModule
  });

  if (!enhancedSystem) {
    console.error('Failed to create enhanced pipeline system');
    return;
  }

  // 6. Initialize the system
  console.log('\n5. Initializing enhanced pipeline system...');
  await enhancedSystem.initialize();

  // 7. Create configuration adapter and builder
  console.log('\n6. Creating configuration adapter and builder...');
  const adapter = new WebAutoConfigurationAdapter();
  const builder = new WebAutoPipelineBuilder();

  // 8. Build pipelines from configuration
  console.log('\n7. Building pipelines from configuration...');
  const configData = configSystem.getConfiguration();
  const buildResult = builder.buildPipelinesFromProject(configData, adapter);

  console.log('Pipeline building result:', JSON.stringify(buildResult, null, 2));

  // 9. Assemble pipelines with WebAuto framework
  console.log('\n8. Assembling pipelines with WebAuto framework...');
  const assemblyResult = await enhancedSystem.assemblePipelinesWithWebAuto();
  console.log('Assembly result:', JSON.stringify(assemblyResult, null, 2));

  // 10. Execute a pipeline
  if (assemblyResult.success && assemblyResult.webAutoPipelines && assemblyResult.webAutoPipelines.length > 0) {
    console.log('\n9. Executing pipeline...');
    const pipelineId = assemblyResult.webAutoPipelines[0];

    const executionRequest = {
      sourceProtocol: 'openai',
      targetProtocol: 'openai',
      data: {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Hello, I\'m testing the WebAuto pipeline framework!'
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      }
    };

    const executionResult = await enhancedSystem.executeWithWebAuto(pipelineId, executionRequest);
    console.log('Pipeline execution result:', JSON.stringify(executionResult, null, 2));
  }

  // 11. Get enhanced status
  console.log('\n10. Getting enhanced pipeline system status...');
  const status = enhancedSystem.getEnhancedStatus();
  console.log('System status:', JSON.stringify(status, null, 2));

  // 12. Validate configuration
  console.log('\n11. Validating configuration for WebAuto...');
  const validation = await enhancedSystem.validateConfigurationForWebAuto();
  console.log('Configuration validation:', JSON.stringify(validation, null, 2));

  console.log('\n=== Demo completed successfully! ===');
}

/**
 * Create sample configuration for testing
 */
function createSampleConfiguration(): ConfigData {
  return {
    version: '1.0.0',
    providers: {
      openai: {
        enabled: true,
        apiKey: 'your-openai-api-key',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        models: {
          'gpt-3.5-turbo': {
            temperature: 0.7,
            max_tokens: 2048
          },
          'gpt-4': {
            temperature: 0.5,
            max_tokens: 4096
          }
        }
      },
      qwen: {
        enabled: true,
        apiKey: 'your-qwen-api-key',
        endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        models: {
          'qwen-turbo': {
            temperature: 0.7,
            max_tokens: 2048
          }
        }
      }
    },
    virtualModels: {
      'basicDavid3': {
        enabled: true,
        description: 'Basic David3 model for testing',
        targets: [
          {
            providerId: 'openai',
            modelId: 'gpt-3.5-turbo',
            weight: 1,
            priority: 1
          }
        ],
        priority: 10,
        workflow: {
          name: 'basicDavid3-workflow',
          rules: []
        }
      },
      'basicDavid3Materials': {
        enabled: true,
        description: 'Basic David3 model for materials',
        targets: [
          {
            providerId: 'qwen',
            modelId: 'qwen-turbo',
            weight: 1,
            priority: 1
          }
        ],
        priority: 8,
        workflow: {
          name: 'materials-workflow'
        }
      }
    },
    settings: {
      globalTimeout: 30000,
      retryAttempts: 3,
      cacheEnabled: true,
      cacheTtl: 300000
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}

export { main, createSampleConfiguration };