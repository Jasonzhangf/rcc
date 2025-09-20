#!/usr/bin/env node

/**
 * Test script for config-parser module functionality
 */

import * as configParser from './dist/index.js';

async function testConfigParser() {
  console.log('Testing config-parser module...');

  try {
    console.log('Available exports:', Object.keys(configParser));

    // Test ConfigParser
    const parser = configParser.createConfigParser();
    await parser.initialize();

    // Test basic configuration parsing
    const testConfig = {
      version: '1.0.0',
      providers: {
        'test-provider': {
          name: 'Test Provider',
          type: 'api',
          endpoint: 'https://api.example.com',
          models: {
            'test-model': {
              name: 'Test Model',
              contextLength: 4096,
              supportsFunctions: true
            }
          },
          auth: {
            type: 'api-key',
            keys: ['test-key-123']
          }
        }
      },
      virtualModels: {
        'test-vm': {
          targets: [{
            providerId: 'test-provider',
            modelId: 'test-model',
            keyIndex: 0
          }],
          enabled: true,
          priority: 1
        }
      }
    };

    console.log('Parsing test configuration...');
    const parsedConfig = await parser.parseConfig(testConfig);

    console.log('✅ ConfigParser test passed');
    console.log('Parsed config:', {
      version: parsedConfig.version,
      providerCount: Object.keys(parsedConfig.providers).length,
      virtualModelCount: Object.keys(parsedConfig.virtualModels).length
    });

    // Test ConfigLoader
    const loader = configParser.createConfigLoader();
    await loader.initialize();

    // Create a temporary test config file
    const testConfigPath = './test-config.json';
    await loader.saveConfig(testConfig, testConfigPath);

    console.log('Testing file-based configuration loading...');
    const loadedConfig = await loader.loadFromFile(testConfigPath);

    console.log('✅ ConfigLoader test passed');
    console.log('Loaded config:', {
      version: loadedConfig.version,
      providerCount: Object.keys(loadedConfig.providers).length,
      virtualModelCount: Object.keys(loadedConfig.virtualModels).length
    });

    // Clean up
    await parser.destroy();
    await loader.destroy();

    console.log('🎉 All config-parser tests completed successfully!');

  } catch (error) {
    console.error('❌ Config-parser test failed:', error.message);
    process.exit(1);
  }
}

testConfigParser();