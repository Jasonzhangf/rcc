#!/usr/bin/env node

/**
 * Simple test for CLI framework dependency compatibility
 */

console.log('Testing CLI Framework dependency compatibility...');

try {
  // Test if we can import rcc-basemodule
  const { BaseModule } = await import('rcc-basemodule');
  console.log('✅ rcc-basemodule imported successfully');

  // Test if we can import glob
  const glob = await import('glob');
  console.log('✅ glob imported successfully');

  // Test basic BaseModule functionality
  const testModule = new BaseModule({
    id: 'test-cli-module',
    name: 'Test CLI Module',
    version: '1.0.0',
    type: 'test',
    description: 'Test CLI module functionality'
  });

  console.log('✅ BaseModule instance created successfully');

  // Test initialization
  await testModule.initialize();
  console.log('✅ BaseModule initialized successfully');

  console.log('🎉 All dependency compatibility tests passed!');

} catch (error) {
  console.error('❌ CLI framework dependency test failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}