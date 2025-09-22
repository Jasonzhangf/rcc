#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('Testing Dynamic Routing Classification Module compilation...');

try {
  // Change to module directory
  process.chdir('/Users/fanzhang/Documents/github/rcc/sharedmodule/dynamic-routing-classification');

  // Run TypeScript compiler to check for errors
  console.log('Running TypeScript compilation check...');
  const result = execSync('npx tsc --noEmit', { encoding: 'utf8' });

  console.log('✅ Compilation successful!');
  console.log('Module is ready for build.');

} catch (error) {
  console.error('❌ Compilation failed:');
  console.error(error.stdout || error.message);
  process.exit(1);
}