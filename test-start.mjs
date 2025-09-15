#!/usr/bin/env node

// Test script to debug RCC system startup and HTTP server port listening issues

import { BootstrapService } from './sharedmodule/bootstrap/dist/esm/index.js';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

console.log('🚀 Testing RCC System Startup and Port Listening...');

// Test configuration
const testPort = 5506;
const configPath = './config.json';

console.log(`📁 Using config: ${configPath}`);
console.log(`🔌 Using port: ${testPort}`);

// Default configuration if config file doesn't exist
const defaultConfig = {
  system: {
    name: "RCC4 Integrated System",
    version: "0.1.0",
    port: testPort,
    logLevel: "debug"
  },
  services: [
    {
      id: 'rcc-server',
      type: 'http-server',
      name: 'RCC HTTP Server',
      description: 'Main HTTP API server for RCC system',
      config: {
        port: testPort,
        host: 'localhost',
        enableVirtualModels: true,
        enablePipeline: true
      }
    }
  ]
};

async function testRCCSystem() {
  try {
    console.log('\n🔧 Initializing Bootstrap Service...');
    const bootstrap = new BootstrapService();

    // Enable debug mode
    bootstrap.enableTwoPhaseDebug('./debug-logs');
    bootstrap.switchDebugToPortMode(testPort);

    // Load configuration
    let config = defaultConfig;
    if (existsSync(configPath)) {
      try {
        const configContent = readFileSync(configPath, 'utf8');
        config = JSON.parse(configContent);
        console.log('✅ Configuration loaded successfully');
      } catch (error) {
        console.warn('⚠️  Failed to parse config file, using default config:', error.message);
      }
    } else {
      console.log('📝 Config file not found, using default configuration');
    }

    console.log('\n⚙️  Configuring Bootstrap Service...');
    console.log('Config details:', JSON.stringify(config, null, 2));

    await bootstrap.configure(config);
    console.log('✅ Bootstrap Service configured successfully');

    console.log('\n🚀 Starting Bootstrap Service...');
    await bootstrap.start();
    console.log('✅ Bootstrap Service started successfully');

    console.log('\n📡 Checking HTTP Server status...');
    const systemStatus = bootstrap.getSystemStatus();
    console.log('System Status:', JSON.stringify(systemStatus, null, 2));

    console.log(`\n✅ RCC System started successfully`);
    console.log(`📡 HTTP Server should be running on port ${testPort}`);
    console.log('📝 Press Ctrl+C to stop the system gracefully');

    // Keep the process running for a while to test
    setTimeout(() => {
      console.log('\n⏰ Test completed. Shutting down...');
      process.exit(0);
    }, 10000);

  } catch (error) {
    console.error('\n❌ Failed to start RCC system:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testRCCSystem().catch(console.error);