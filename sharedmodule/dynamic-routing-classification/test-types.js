#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('Testing TypeScript compilation with updated type definitions...');

try {
  // Change to module directory
  process.chdir('/Users/fanzhang/Documents/github/rcc/sharedmodule/dynamic-routing-classification');

  // Run TypeScript compiler with detailed output
  console.log('Running TypeScript compilation...');
  const result = execSync('npx tsc --noEmit --listFiles', {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  console.log('✅ TypeScript compilation successful!');
  console.log('All type definitions are working correctly.');

} catch (error) {
  console.error('❌ TypeScript compilation failed:');
  if (error.stdout) {
    console.log('STDOUT:', error.stdout);
  }
  if (error.stderr) {
    console.log('STDERR:', error.stderr);
  }
  if (error.message) {
    console.log('Message:', error.message);
  }
  process.exit(1);
}