#!/usr/bin/env node

/**
 * Debug script to identify pipeline integration issues
 * This script will help us understand why virtual models aren't being properly loaded
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the configuration
const configPath = path.join(process.env.HOME, '.rcc', 'rcc-config.json');
console.log('🔍 Loading configuration from:', configPath);

if (!fs.existsSync(configPath)) {
  console.error('❌ Configuration file not found');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
console.log('✅ Configuration loaded successfully');

// Check virtual models configuration
console.log('\n🔍 Checking virtual models configuration:');
console.log('========================================');

if (!config.virtualModels) {
  console.error('❌ No virtualModels found in configuration');
  process.exit(1);
}

const virtualModels = config.virtualModels;
console.log(`Found ${Object.keys(virtualModels).length} virtual models:`);

for (const [modelId, modelConfig] of Object.entries(virtualModels)) {
  console.log(`\nModel: ${modelId}`);
  console.log(`  Enabled: ${modelConfig.enabled}`);
  console.log(`  Targets: ${modelConfig.targets ? modelConfig.targets.length : 0}`);

  if (modelConfig.targets && Array.isArray(modelConfig.targets)) {
    modelConfig.targets.forEach((target, index) => {
      console.log(`    Target ${index + 1}:`);
      console.log(`      Provider ID: ${target.providerId}`);
      console.log(`      Model ID: ${target.modelId}`);
      console.log(`      Key Index: ${target.keyIndex}`);
      console.log(`      Enabled: ${target.enabled}`);
    });
  }
}

// Check providers configuration
console.log('\n🔍 Checking providers configuration:');
console.log('===================================');

if (!config.providers) {
  console.error('❌ No providers found in configuration');
  process.exit(1);
}

const providers = config.providers;
console.log(`Found ${Object.keys(providers).length} providers:`);

for (const [providerId, providerConfig] of Object.entries(providers)) {
  console.log(`\nProvider: ${providerId}`);
  console.log(`  Type: ${providerConfig.type}`);
  console.log(`  Endpoint: ${providerConfig.endpoint}`);

  if (providerConfig.models) {
    console.log(`  Models: ${Object.keys(providerConfig.models).length}`);
    for (const [modelId, model] of Object.entries(providerConfig.models)) {
      console.log(`    - ${modelId}: ${model.name}`);
    }
  }
}

console.log('\n✅ Configuration validation completed');