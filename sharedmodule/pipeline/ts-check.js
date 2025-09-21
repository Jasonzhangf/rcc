#!/usr/bin/env node

/**
 * Simple TypeScript checker for pipeline module
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Checking TypeScript compilation...');

try {
  // Try to run TypeScript compilation
  const result = execSync('npx tsc --noEmit', {
    cwd: __dirname,
    stdio: 'pipe',
    encoding: 'utf8'
  });

  console.log('✅ TypeScript compilation successful!');
  console.log(result);
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout || error.message);

  // Try to identify common issues
  if (error.stdout?.includes('Cannot find module')) {
    console.log('\n📋 Possible issues:');
    console.log('1. Missing dependencies in package.json');
    console.log('2. Need to run npm install');
    console.log('3. Missing type definitions');
  }

  if (error.stdout?.includes('Interface')) {
    console.log('\n📋 Interface-related issues:');
    console.log('1. Check that all interfaces are properly defined');
    console.log('2. Ensure all required methods are implemented');
    console.log('3. Verify type compatibility');
  }

  process.exit(1);
}