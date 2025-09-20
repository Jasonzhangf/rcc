#!/usr/bin/env node

/**
 * Simple TypeScript compiler script for testing build issues
 */

const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('🔍 Running TypeScript compilation...');

  // Run TypeScript compiler
  const result = execSync('npx tsc --noEmit', {
    cwd: '/Users/fanzhang/Documents/github/rcc/sharedmodule/pipeline',
    encoding: 'utf8'
  });

  console.log('✅ TypeScript compilation successful');
  console.log(result);

} catch (error) {
  console.error('❌ TypeScript compilation failed:');
  console.error(error.stdout || error.message);
  process.exit(1);
}