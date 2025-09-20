#!/usr/bin/env node

/**
 * Test configuration loading functionality
 * 测试配置加载功能
 */

import { PipelineAssembler } from './dist/index.esm.js';
import { PipelineTracker } from './dist/index.esm.js';
import fs from 'fs';
import path from 'path';

async function testConfigLoading() {
  console.log('🧪 Testing configuration loading...');

  try {
    // Create tracker
    const tracker = new PipelineTracker();
    console.log('✅ Pipeline tracker created');

    // Test configuration file path
    const configPath = path.join(process.env.HOME || '', '.rcc/rcc-config.json');
    console.log('📁 Configuration file path:', configPath);

    // Check if config file exists
    if (fs.existsSync(configPath)) {
      console.log('✅ Configuration file exists');

      // Read and parse config file
      const configContent = fs.readFileSync(configPath, 'utf8');
      const configData = JSON.parse(configContent);
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
      console.log('❌ Configuration file does not exist');
      return false;
    }

    // Create assembler with configuration module integration
    const assembler = new PipelineAssembler({
      providerDiscoveryOptions: {},
      pipelineFactoryConfig: {
        enableHealthChecks: true,
        metricsEnabled: true
      },
      enableConfigModuleIntegration: true,
      configFilePath: configPath
    }, tracker);

    console.log('✅ Pipeline assembler created with config integration');

    // Test 1: Check if config modules were initialized
    console.log('\n📋 Test 1: Configuration module initialization');

    // Check assembler status which includes config integration info
    const status = assembler.getStatus();
    console.log('📊 Configuration module status:');
    console.log(`  - Config integration enabled: ${status.configModuleIntegration.enabled}`);
    console.log(`  - Config data loaded: ${status.configModuleIntegration.configLoaded}`);
    console.log(`  - Pipeline table generated: ${status.configModuleIntegration.pipelineTableGenerated}`);
    console.log(`  - Config file path: ${status.configModuleIntegration.configFilePath || 'default'}`);

    // Test 2: Test pipeline assembly with automatic config loading
    console.log('\n📋 Test 2: Pipeline assembly with automatic config loading');

    try {
      const assemblyResult = await assembler.assemblePipelines();
      if (assemblyResult.success) {
        console.log('✅ Pipeline assembly from automatic config loading successful');
        console.log(`  - Pipeline pools created: ${assemblyResult.pipelinePools.size}`);
        console.log(`  - Errors: ${assemblyResult.errors.length}`);
        console.log(`  - Warnings: ${assemblyResult.warnings.length}`);
      } else {
        console.log('❌ Pipeline assembly failed');
        console.log('  - Errors:', assemblyResult.errors.map(e => e.error).join(', '));
      }
    } catch (error) {
      console.log('❌ Pipeline assembly caused exception:', error.message);
    }

    // Test 3: Test status reporting
    console.log('\n📋 Test 3: Status reporting');
    const statusAfterAssembly = assembler.getStatus();
    console.log('📊 Assembler status after assembly:');
    console.log(`  - Total pools: ${statusAfterAssembly.totalPools}`);
    console.log(`  - Total pipelines: ${statusAfterAssembly.totalPipelines}`);
    console.log(`  - Virtual model IDs: ${statusAfterAssembly.virtualModelIds.join(', ') || 'none'}`);

    // Test 4: Cleanup
    console.log('\n📋 Test 4: Resource cleanup');
    assembler.destroy();
    console.log('✅ Resources cleaned up successfully');

    console.log('\n🎉 Configuration loading tests completed!');
    return true;

  } catch (error) {
    console.error('❌ Configuration loading test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testConfigLoading()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });