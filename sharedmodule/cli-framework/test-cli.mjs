#!/usr/bin/env node

/**
 * Test script for CLI framework basic functionality
 */

import { CLIEngine } from './dist/index.js';

async function testCLIFramework() {
  console.log('Testing CLI Framework...');
  let cliEngine;

  try {
    // Create CLI engine instance
    cliEngine = new CLIEngine({
      name: 'test-cli',
      version: '1.0.0',
      description: 'Test CLI Framework'
    });

    console.log('✅ CLI Engine created successfully');

    // Test initialization
    await cliEngine.initialize();
    console.log('✅ CLI Engine initialized successfully');

    // Test help functionality
    console.log('\n✅ Testing help functionality...');
    await cliEngine.execute(['--help']);

    // Test version functionality
    console.log('\n✅ Testing version functionality...');
    await cliEngine.execute(['--version']);

    // Test basic command registration
    cliEngine.registerCommand({
      name: 'test',
      description: 'Test command',
      execute: async (context) => {
        context.logger.info('Test command executed successfully');
      }
    });

    console.log('✅ Test command registered successfully');

    // Test command execution
    await cliEngine.executeCommand('test');
    console.log('✅ Test command executed successfully');

    // Test built-in commands (if available)
    const commands = cliEngine.getAllCommands();
    console.log(`\n✅ Available commands (${commands.length}):`);
    commands.forEach(cmd => {
      console.log(`  - ${cmd.name}: ${cmd.description}`);
    });

    console.log('🎉 All CLI framework tests passed!');

  } catch (error) {
    console.error('❌ CLI framework test failed:', error);
    process.exit(1);
  } finally {
    // Clean up
    try {
      await cliEngine.destroy();
      console.log('✅ CLI Engine destroyed successfully');
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError);
    }
  }
}

testCLIFramework();