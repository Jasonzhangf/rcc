#!/usr/bin/env node

/**
 * Simple test script to verify RCC system startup with pipeline integration
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testRccStartup() {
  console.log('🚀 Testing RCC System Startup with Pipeline Integration');
  console.log('====================================================');

  try {
    // Test that we can import and use the ServerModule
    console.log('1. Testing ServerModule import...');
    const { ServerModule } = await import('../sharedmodule/server/dist/index.js');
    console.log('✅ ServerModule imported successfully');

    // Test that we can create an instance
    console.log('\n2. Testing ServerModule instantiation...');
    const serverModule = new ServerModule();
    console.log('✅ ServerModule instantiated successfully');

    // Test configuration loading
    console.log('\n3. Testing configuration loading...');
    const fs = await import('fs');
    const path = await import('path');

    const configPath = path.join(process.env.HOME, '.rcc', 'rcc-config.json');
    if (!fs.existsSync(configPath)) {
      console.error('❌ Configuration file not found');
      process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    await serverModule.configure(config);
    console.log('✅ Configuration loaded and applied successfully');

    // Test virtual model registration
    console.log('\n4. Testing virtual model system...');
    const virtualModels = serverModule.getVirtualModels();
    console.log(`✅ ${virtualModels.length} virtual models registered`);

    const enabledModels = serverModule['virtualModelRouter'].getEnabledModels();
    console.log(`✅ ${enabledModels.length} virtual models enabled`);

    // Verify no "No available targets" error
    if (enabledModels.length > 0) {
      console.log('✅ Pipeline targets are available');
    } else {
      console.error('❌ No pipeline targets available - "No available targets for pipeline execution" error would occur');
      process.exit(1);
    }

    console.log('\n🎉 RCC STARTUP TEST PASSED!');
    console.log('===========================');
    console.log('✅ ServerModule: Operational');
    console.log('✅ Configuration: Loaded');
    console.log('✅ Virtual Models: Registered and Enabled');
    console.log('✅ Pipeline Integration: Working');
    console.log('✅ No "No available targets" error');

    process.exit(0);

  } catch (error) {
    console.error('\n💥 RCC STARTUP TEST FAILED:');
    console.error('==========================');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testRccStartup();