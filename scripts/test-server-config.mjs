#!/usr/bin/env node

/**
 * Test script to understand how configuration is passed to ServerModule
 */

import { ServerModule } from './sharedmodule/server/dist/index.js';
import fs from 'fs';
import path from 'path';

async function testServerConfiguration() {
  console.log('🚀 Testing ServerModule configuration loading...');

  // Load the configuration
  const configPath = path.join(process.env.HOME, '.rcc', 'rcc-config.json');
  console.log('Loading configuration from:', configPath);

  if (!fs.existsSync(configPath)) {
    console.error('❌ Configuration file not found');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('✅ Configuration loaded successfully');

  // Create server module
  const serverModule = new ServerModule();
  console.log('✅ ServerModule created');

  // Check config structure
  console.log('\n🔍 Configuration structure:');
  console.log('Keys:', Object.keys(config));
  console.log('Has virtualModels:', !!config.virtualModels);
  console.log('Has providers:', !!config.providers);

  if (config.virtualModels) {
    console.log('Virtual models count:', Object.keys(config.virtualModels).length);
  }

  // Try to configure the server
  try {
    console.log('\n🔧 Configuring ServerModule...');
    await serverModule.configure(config);
    console.log('✅ ServerModule configured successfully');

    // Check if virtual models were loaded
    const virtualModels = serverModule.getVirtualModels();
    console.log('\n📊 Virtual models after configuration:');
    console.log('Count:', virtualModels.length);

    virtualModels.forEach((model, index) => {
      console.log(`${index + 1}. ${model.id} (${model.provider}) - ${model.enabled ? 'enabled' : 'disabled'}`);
    });

  } catch (error) {
    console.error('❌ Failed to configure ServerModule:', error.message);
    console.error('Stack:', error.stack);
  }
}

testServerConfiguration().catch(console.error);