/**
 * Test Script - Phase 2 Wrapper Generation
 *
 * Tests the wrapper generation functionality for ServerModule and PipelineAssembler
 */

import { createConfigParser, ConfigData, ServerWrapper, PipelineWrapper } from './src/index';

async function testWrapperGeneration() {
  console.log('🧪 Testing Phase 2 Wrapper Generation...\n');

  // Sample configuration data
  const sampleConfig: any = {
    version: '1.0.0',
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

  try {
    // Create and initialize parser
    const parser = createConfigParser();
    await parser.initialize();

    console.log('📝 Step 1: Parsing configuration...');
    const config = await parser.parseConfig(sampleConfig);
    console.log(`✅ Config parsed - Providers: ${Object.keys(config.providers).length}, Virtual Models: ${Object.keys(config.virtualModels).length}`);

    console.log('\n📦 Step 2: Generating ServerModule wrapper...');
    const serverWrapper = parser.generateServerWrapper(config);
    console.log('✅ ServerModule wrapper generated:');
    console.log(`   Port: ${serverWrapper.port}`);
    console.log(`   Host: ${serverWrapper.host}`);
    console.log(`   CORS Origin: ${Array.isArray(serverWrapper.cors.origin) ? serverWrapper.cors.origin.join(', ') : serverWrapper.cors.origin}`);
    console.log(`   Compression: ${serverWrapper.compression}`);
    console.log(`   Rate Limit: ${serverWrapper.rateLimit.max} requests per ${serverWrapper.rateLimit.windowMs / 1000}s`);

    console.log('\n🔧 Step 3: Generating PipelineAssembler wrapper...');
    const pipelineWrapper = parser.generatePipelineWrapper(config);
    console.log('✅ PipelineAssembler wrapper generated:');
    console.log(`   Virtual Models: ${pipelineWrapper.virtualModels.length}`);
    console.log(`   Modules: ${pipelineWrapper.modules.length}`);
    console.log(`   Routing Strategy: ${pipelineWrapper.routing.strategy}`);

    // Display virtual models
    console.log('\n   Virtual Models:');
    pipelineWrapper.virtualModels.forEach((vm, index) => {
      console.log(`     ${index + 1}. ${vm.name} -> ${vm.provider}:${vm.modelId} (${vm.targets.length} targets)`);
    });

    // Display modules
    console.log('\n   Modules:');
    pipelineWrapper.modules.forEach((module, index) => {
      console.log(`     ${index + 1}. ${module.id} (${module.type}) - Priority: ${module.priority}`);
    });

    console.log('\n🔄 Step 4: Testing convenience method...');
    const allWrappers = parser.generateAllWrappers(config);
    console.log('✅ All wrappers generated successfully');
    console.log(`   Server port: ${allWrappers.server.port}`);
    console.log(`   Pipeline VM count: ${allWrappers.pipeline.virtualModels.length}`);

    console.log('\n✨ Phase 2 Wrapper Generation Test completed successfully!');

    await parser.destroy();

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testWrapperGeneration().catch(console.error);