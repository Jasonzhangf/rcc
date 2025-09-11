#!/usr/bin/env node

/**
 * Test script for RCC CLI Framework
 */

const { createCLIFramework } = require('./dist/index.cjs');

async function testFramework() {
  console.log('Testing RCC CLI Framework...');
  
  try {
    // Create framework instance
    const framework = createCLIFramework({
      name: 'test-cli',
      version: '1.0.0',
      projectRoot: process.cwd(),
      modulePaths: ['./test-commands/*/src/*Module.js'],
      devMode: true,
      logger: {
        level: 'debug',
        console: true
      }
    });
    
    console.log('✓ Framework instance created successfully');
    
    // Initialize framework
    await framework.initialize();
    console.log('✓ Framework initialized successfully');
    
    // Test configuration
    const config = framework.getConfig();
    console.log('✓ Configuration loaded:', config.framework.name);
    
    // Test command registry
    const commands = framework.getCommands();
    console.log(`✓ Command registry initialized with ${commands.size} commands`);
    
    // Test help
    console.log('\n--- Help Output ---');
    framework.showHelp();
    
    // Shutdown
    await framework.shutdown();
    console.log('✓ Framework shutdown successfully');
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFramework();