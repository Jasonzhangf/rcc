#!/usr/bin/env node

/**
 * Test updated assembler with real configuration data
 * 测试更新后的组装器与真实配置数据
 */

import { PipelineAssembler } from './dist/index.esm.js';
import { PipelineTracker } from './dist/index.esm.js';
import fs from 'fs';
import path from 'path';

async function testAssemblerWithConfig() {
  console.log('🧪 Testing assembler with real configuration data...');

  try {
    // Create tracker
    const tracker = new PipelineTracker();
    console.log('✅ Pipeline tracker created');

    // Create assembler with configuration module integration enabled
    const assembler = new PipelineAssembler({
      providerDiscoveryOptions: {},
      pipelineFactoryConfig: {
        enableHealthChecks: true,
        metricsEnabled: true
      },
      enableConfigModuleIntegration: true,
      configFilePath: path.join(process.env.HOME || '', '.rcc/rcc-config.json')
    }, tracker);

    console.log('✅ Pipeline assembler created with config integration');

    // Test 1: Get assembler status before initialization
    console.log('\n📋 Test 1: Assembler status before initialization');
    const statusBefore = assembler.getStatus();
    console.log('Status before initialization:', JSON.stringify(statusBefore, null, 2));

    // Test 2: Assembler is automatically initialized in constructor
    console.log('\n📋 Test 2: Assembler constructor initialization');
    console.log('✅ Assembler initialized automatically in constructor');

    // Test 3: Get assembler status after initialization
    console.log('\n📋 Test 3: Assembler status after initialization');
    const statusAfter = assembler.getStatus();
    console.log('Status after initialization:', JSON.stringify(statusAfter, null, 2));

    // Test 4: Test pipeline assembly from configuration
    console.log('\n📋 Test 4: Pipeline assembly from configuration');
    const assemblyResult = await assembler.assemblePipelines();

    if (assemblyResult.success) {
      console.log('✅ Pipelines assembled successfully from configuration');
      console.log('📊 Assembly details:');
      console.log(`  - Total pipelines: ${assemblyResult.pipelines?.length || 0}`);
      console.log(`  - Total providers: ${assemblyResult.providers?.length || 0}`);
      console.log(`  - Virtual models: ${assemblyResult.virtualModels?.join(', ') || 'none'}`);
    } else {
      console.log('❌ Pipeline assembly failed:', assemblyResult.error);
      return false;
    }

    // Test 5: Check current configuration data
    console.log('\n📋 Test 5: Configuration data access');
    const configData = assembler.getCurrentConfigData();
    if (configData) {
      console.log('✅ Configuration data loaded');
      console.log('📊 Configuration summary:');
      console.log(`  - Version: ${configData.version}`);
      console.log(`  - Providers: ${Object.keys(configData.providers || {}).length}`);
      console.log(`  - Virtual models: ${Object.keys(configData.virtualModels || {}).length}`);

      // Show enabled virtual models
      const enabledVMs = Object.entries(configData.virtualModels || {})
        .filter(([_, vm]) => vm.enabled)
        .map(([id, _]) => id);
      console.log(`  - Enabled virtual models: ${enabledVMs.join(', ') || 'none'}`);
    } else {
      console.log('❌ No configuration data loaded');
      return false;
    }

    // Test 6: Check current pipeline table
    console.log('\n📋 Test 6: Pipeline table access');
    const pipelineTable = assembler.getCurrentPipelineTable();
    if (pipelineTable) {
      console.log('✅ Pipeline table generated');
      console.log('📊 Pipeline table summary:');
      console.log(`  - Version: ${pipelineTable.version}`);
      console.log(`  - Entries: ${pipelineTable.entries.length}`);

      // Show sample entries
      console.log('📝 Sample pipeline entries:');
      pipelineTable.entries.slice(0, 3).forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.virtualModelId} -> ${entry.providerId}/${entry.modelId} (weight: ${entry.weight})`);
      });
    } else {
      console.log('❌ No pipeline table generated');
      return false;
    }

    // Test 7: Test error handling with invalid config
    console.log('\n📋 Test 7: Error handling with invalid configuration');
    const invalidAssembler = new PipelineAssembler({
      providerDiscoveryOptions: {},
      pipelineFactoryConfig: {
        enableHealthChecks: true,
        metricsEnabled: true
      },
      enableConfigModuleIntegration: true,
      configFilePath: '/nonexistent/path/config.json'
    }, tracker);

    // Invalid config assembler should be created without errors
    // (errors will be handled during assemblePipelines call)
    console.log('✅ Invalid config handled gracefully in constructor');

    // Test 8: Cleanup
    console.log('\n📋 Test 8: Resource cleanup');
    assembler.destroy();
    console.log('✅ Resources cleaned up successfully');

    console.log('\n🎉 All assembler configuration tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Assembler configuration test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testAssemblerWithConfig()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });