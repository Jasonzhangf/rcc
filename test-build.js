#!/usr/bin/env node

/**
 * Simple build test script to check for TypeScript compilation errors
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Testing build...');

try {
  // Run TypeScript compilation check
  const result = execSync('npx tsc --noEmit', {
    cwd: path.join(__dirname, 'sharedmodule/pipeline'),
    encoding: 'utf8',
    stdio: 'pipe'
  });

  console.log('✅ Build successful!');
  console.log(result);
} catch (error) {
  console.error('❌ Build failed:');
  console.error(error.stdout);
  console.error(error.stderr);

  // Try to get more detailed error information
  try {
    const detailedResult = execSync('npx tsc --noEmit --pretty', {
      cwd: path.join(__dirname, 'sharedmodule/pipeline'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log(detailedResult);
  } catch (detailedError) {
    console.error('Detailed error output:');
    console.error(detailedError.stdout);
    console.error(detailedError.stderr);
  }

  process.exit(1);
}