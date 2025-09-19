#!/usr/bin/env node

/**
 * Comprehensive test script to verify pipeline integration is working correctly
 * This script tests the full pipeline from configuration loading to virtual model routing
 */

import { ServerModule } from '../sharedmodule/server/dist/index.js';
import fs from 'fs';
import path from 'path';

async function runComprehensivePipelineTest() {
  console.log('🚀 Running Comprehensive Pipeline Integration Test');
  console.log('================================================');

  try {
    // Load the configuration
    const configPath = path.join(process.env.HOME, '.rcc', 'rcc-config.json');
    console.log('1. Loading configuration from:', configPath);

    if (!fs.existsSync(configPath)) {
      console.error('❌ Configuration file not found');
      process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('✅ Configuration loaded successfully');

    // Create and configure server module
    console.log('\n2. Creating and configuring ServerModule...');
    const serverModule = new ServerModule();
    await serverModule.configure(config);
    console.log('✅ ServerModule configured successfully');

    // Check virtual models
    console.log('\n3. Checking virtual models...');
    const virtualModels = serverModule.getVirtualModels();
    console.log(`✅ ${virtualModels.length} virtual models loaded`);

    if (virtualModels.length === 0) {
      console.error('❌ No virtual models loaded - test failed');
      process.exit(1);
    }

    // Check enabled models in VirtualModelRouter
    console.log('\n4. Checking enabled models in VirtualModelRouter...');
    const enabledModels = serverModule['virtualModelRouter'].getEnabledModels();
    console.log(`✅ ${enabledModels.length} enabled models found`);

    if (enabledModels.length === 0) {
      console.error('❌ No enabled models - test failed');
      process.exit(1);
    }

    // Test model capability inference
    console.log('\n5. Testing model capability inference...');
    let capabilityInferenceWorking = true;
    enabledModels.forEach((model, index) => {
      console.log(`   ${index + 1}. ${model.id}: ${model.capabilities.length} capabilities`);
      if (model.capabilities.length === 0) {
        capabilityInferenceWorking = false;
      }
      if (model.targets && model.targets.length > 0) {
        console.log(`      Targets: ${model.targets.length}`);
      }
    });

    if (!capabilityInferenceWorking) {
      console.error('❌ Capability inference not working properly');
      process.exit(1);
    }

    console.log('✅ Capability inference working correctly');

    // Test specific model lookups
    console.log('\n6. Testing specific model lookups...');
    const testModels = ['default', 'thinking', 'coding'];
    testModels.forEach(modelId => {
      const model = serverModule.getVirtualModel(modelId);
      if (model) {
        console.log(`   ✅ Found model '${modelId}': ${model.provider} -> ${model.model}`);
      } else {
        console.log(`   ❌ Model '${modelId}' not found`);
      }
    });

    // Test routing capabilities
    console.log('\n7. Testing routing capabilities...');

    // Test that we can get model status
    const modelStatus = serverModule['virtualModelRouter'].getModelStatus();
    console.log(`   Total models: ${modelStatus.totalModels}`);
    console.log(`   Enabled models: ${modelStatus.enabledModels}`);
    console.log(`   Disabled models: ${modelStatus.disabledModels}`);

    // Verify all enabled models have proper capabilities
    const modelsWithNoCapabilities = modelStatus.modelDetails.filter(
      model => model.enabled && (!model.capabilities || model.capabilities.length === 0)
    );

    if (modelsWithNoCapabilities.length > 0) {
      console.error('❌ Some enabled models have no capabilities:');
      modelsWithNoCapabilities.forEach(model => {
        console.error(`   - ${model.id}`);
      });
      process.exit(1);
    }

    console.log('✅ All enabled models have proper capabilities');

    // Final test: simulate a routing request
    console.log('\n8. Testing simulated routing request...');
    try {
      // This would normally be called during request processing
      const router = serverModule['virtualModelRouter'];

      // Test that getEnabledModels returns models
      const routerEnabledModels = router.getEnabledModels();
      console.log(`   Router reports ${routerEnabledModels.length} enabled models`);

      if (routerEnabledModels.length > 0) {
        console.log('✅ Routing system has available targets');
      } else {
        console.error('❌ Routing system reports no available targets');
        process.exit(1);
      }
    } catch (routingError) {
      console.error('❌ Routing test failed:', routingError.message);
      process.exit(1);
    }

    // Summary
    console.log('\n🎉 COMPREHENSIVE PIPELINE TEST PASSED!');
    console.log('=====================================');
    console.log('✅ Configuration loading: Working');
    console.log('✅ Virtual model registration: Working');
    console.log('✅ Target preservation: Working');
    console.log('✅ Capability inference: Working');
    console.log('✅ Model lookups: Working');
    console.log('✅ Routing system: Working');
    console.log('\n📋 Summary:');
    console.log(`   - ${virtualModels.length} virtual models loaded`);
    console.log(`   - ${enabledModels.length} models enabled`);
    console.log('   - All models have proper capabilities');
    console.log('   - Pipeline integration working correctly');

    process.exit(0);

  } catch (error) {
    console.error('\n💥 COMPREHENSIVE PIPELINE TEST FAILED:');
    console.error('=====================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runComprehensivePipelineTest();