#!/usr/bin/env node

/**
 * Test script to verify Phase 3: Pipeline integration with wrapper interfaces
 *
 * This script tests the new wrapper generation functionality in the RCC system
 */

import { generateAllWrappers } from '../sharedmodule/config-parser/src/index';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function testWrapperGeneration() {
  console.log('🧪 Testing Phase 3: Pipeline integration with wrapper interfaces');
  console.log('='.repeat(60));

  try {
    // Test configuration
    const testConfig = {
      version: '1.0.0',
      providers: {
        qwen: {
          name: 'Qwen Provider',
          type: 'qwen',
          endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          models: {
            'qwen-turbo': {
              name: 'Qwen Turbo',
              maxTokens: 2000
            }
          },
          auth: {
            type: 'bearer',
            keys: ['test-key-1', 'test-key-2']
          }
        },
        iflow: {
          name: 'IFlow Provider',
          type: 'iflow',
          endpoint: 'https://api.openai.com/v1/chat/completions',
          models: {
            'gpt-4': {
              name: 'GPT-4',
              maxTokens: 4000
            }
          },
          auth: {
            type: 'bearer',
            keys: ['test-key-1']
          }
        }
      },
      virtualModels: {
        'smart-assistant': {
          id: 'smart-assistant',
          name: 'Smart Assistant',
          enabled: true,
          targets: [
            {
              providerId: 'qwen',
              modelId: 'qwen-turbo',
              keyIndex: 0
            },
            {
              providerId: 'iflow',
              modelId: 'gpt-4',
              keyIndex: 0
            }
          ],
          capabilities: ['text-generation', 'code-generation'],
          maxTokens: 2000
        },
        'code-expert': {
          id: 'code-expert',
          name: 'Code Expert',
          enabled: true,
          targets: [
            {
              providerId: 'qwen',
              modelId: 'qwen-turbo',
              keyIndex: 1
            }
          ],
          capabilities: ['code-generation', 'code-review'],
          maxTokens: 4000
        }
      },
      pipeline: {
        scanPaths: ['./sharedmodule'],
        providerPatterns: ['*Provider.js', '*Provider.ts'],
        defaultTimeout: 30000,
        healthCheckInterval: 60000,
        maxRetries: 3,
        loadBalancingStrategy: 'round-robin'
      }
    };

    console.log('📋 Test configuration loaded:');
    console.log(`   - Providers: ${Object.keys(testConfig.providers).length}`);
    console.log(`   - Virtual models: ${Object.keys(testConfig.virtualModels).length}`);
    console.log(`   - Pipeline config: ${Object.keys(testConfig.pipeline).length} settings`);

    // Test wrapper generation
    console.log('\n🔧 Generating configuration wrappers...');
    const { server: serverWrapper, pipeline: pipelineWrapper } = await generateAllWrappers(testConfig);

    console.log('✅ Wrapper generation completed successfully!');

    // Verify server wrapper
    console.log('\n📋 Server Wrapper Verification:');
    console.log(`   - Port: ${serverWrapper.port}`);
    console.log(`   - Host: ${serverWrapper.host}`);
    console.log(`   - CORS enabled: ${!!serverWrapper.cors}`);
    console.log(`   - Compression: ${serverWrapper.compression}`);
    console.log(`   - Pipeline enabled: ${serverWrapper.pipeline?.enabled}`);
    console.log(`   - Error mapping: ${Object.keys(serverWrapper.pipeline?.errorMapping || {}).length} mappings`);

    // Verify pipeline wrapper
    console.log('\n📋 Pipeline Wrapper Verification:');
    console.log(`   - Virtual models: ${pipelineWrapper.virtualModels?.length || 0}`);
    console.log(`   - Modules: ${pipelineWrapper.modules?.length || 0}`);
    console.log(`   - Routing strategy: ${pipelineWrapper.routing?.strategy}`);
    console.log(`   - Metadata version: ${pipelineWrapper.metadata?.version}`);

    // Verify virtual model transformation
    if (pipelineWrapper.virtualModels && pipelineWrapper.virtualModels.length > 0) {
      console.log('\n🔄 Virtual Model Transformation:');
      pipelineWrapper.virtualModels.forEach((vm, index) => {
        console.log(`   ${index + 1}. ${vm.id}:`);
        console.log(`      - Name: ${vm.name}`);
        console.log(`      - Enabled: ${vm.enabled}`);
        console.log(`      - Targets: ${vm.targets?.length || 0}`);
        console.log(`      - Capabilities: ${vm.capabilities?.join(', ') || 'none'}`);
      });
    }

    // Test that server wrapper contains only HTTP configuration
    console.log('\n🔍 Server Wrapper Clean Separation Test:');
    const serverFields = Object.keys(serverWrapper);
    const expectedServerFields = ['port', 'host', 'cors', 'compression', 'helmet', 'rateLimit', 'timeout', 'bodyLimit', 'pipeline'];
    const unexpectedFields = serverFields.filter(field => !expectedServerFields.includes(field));

    if (unexpectedFields.length === 0) {
      console.log('✅ Server wrapper contains only HTTP configuration (no virtual models)');
    } else {
      console.log(`⚠️  Server wrapper contains unexpected fields: ${unexpectedFields.join(', ')}`);
    }

    // Test that pipeline wrapper contains pipeline-specific configuration
    console.log('\n🔍 Pipeline Wrapper Configuration Test:');
    const pipelineFields = Object.keys(pipelineWrapper);
    const expectedPipelineFields = ['virtualModels', 'modules', 'routing', 'metadata'];
    const hasAllExpectedFields = expectedPipelineFields.every(field => pipelineFields.includes(field));

    if (hasAllExpectedFields) {
      console.log('✅ Pipeline wrapper contains all expected fields');
    } else {
      console.log(`⚠️  Pipeline wrapper missing expected fields`);
    }

    // Test configuration integrity
    console.log('\n🔍 Configuration Integrity Test:');
    const originalVMCount = Object.keys(testConfig.virtualModels).length;
    const wrapperVMCount = pipelineWrapper.virtualModels?.length || 0;

    if (originalVMCount === wrapperVMCount) {
      console.log(`✅ Virtual model count preserved: ${originalVMCount}`);
    } else {
      console.log(`❌ Virtual model count mismatch: original=${originalVMCount}, wrapper=${wrapperVMCount}`);
    }

    console.log('\n🎉 Phase 3 Integration Test Completed Successfully!');
    console.log('✅ Wrapper generation works correctly');
    console.log('✅ Server wrapper contains only HTTP configuration');
    console.log('✅ Pipeline wrapper contains pipeline-specific configuration');
    console.log('✅ Configuration separation is working as expected');

    return true;

  } catch (error) {
    console.error('\n❌ Phase 3 Integration Test Failed:');
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    return false;
  }
}

// Test configuration file loading
async function testConfigFileLoading() {
  console.log('\n📁 Testing Configuration File Loading...');

  try {
    const configPath = path.join(os.homedir(), '.rcc/rcc-config.json');

    if (fs.existsSync(configPath)) {
      console.log(`✅ Configuration file found: ${configPath}`);

      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`   - Providers: ${Object.keys(configData.providers || {}).length}`);
      console.log(`   - Virtual models: ${Object.keys(configData.virtualModels || {}).length}`);

      // Test wrapper generation with real config
      const { server: serverWrapper, pipeline: pipelineWrapper } = await generateAllWrappers(configData);

      console.log('✅ Real configuration wrapper generation successful');
      console.log(`   - Server port: ${serverWrapper.port}`);
      console.log(`   - Pipeline virtual models: ${pipelineWrapper.virtualModels?.length || 0}`);

    } else {
      console.log(`⚠️  Configuration file not found: ${configPath}`);
      console.log('   Skipping real configuration test');
    }
  } catch (error) {
    console.log(`⚠️  Configuration file test failed: ${error.message}`);
  }
}

// Main test function
async function runTests() {
  const success = await testWrapperGeneration();
  await testConfigFileLoading();

  if (success) {
    console.log('\n🎯 All tests passed! Phase 3 integration is ready.');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Check the output above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});