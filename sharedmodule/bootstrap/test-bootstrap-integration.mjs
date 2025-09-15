#!/usr/bin/env node

// Simple test script to verify BootstrapService integration
import { BootstrapService } from './dist/esm/index.js';

async function testBootstrapService() {
  console.log('Testing BootstrapService with BaseModule integration...');

  try {
    const bootstrap = new BootstrapService();
    console.log('✅ BootstrapService created successfully');

    // Test two-phase debug system
    console.log('🔧 Testing two-phase debug system...');
    bootstrap.enableTwoPhaseDebug('~/.rcc/debug');
    console.log('✅ Two-phase debug system enabled');

    // Test port mode switching
    console.log('🔧 Testing port mode switching...');
    bootstrap.switchDebugToPortMode(5506);
    console.log('✅ Port mode switched');

    // Test configuration
    console.log('🔧 Testing configuration...');
    await bootstrap.configure({
      services: [{
        id: 'test-service',
        name: 'Test Service',
        description: 'A test service',
        type: 'server',
        enabled: true,
        dependencies: [],
        config: { port: 5506 }
      }]
    });
    console.log('✅ Configuration completed');

    // Test startup
    console.log('🔧 Testing startup...');
    await bootstrap.start();
    console.log('✅ BootstrapService started successfully');

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testBootstrapService();