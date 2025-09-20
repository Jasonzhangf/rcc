#!/usr/bin/env node

/**
 * Simple build script to test if compilation works
 */

const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('🔍 Running TypeScript compilation check...');

  // Change to the project directory
  const projectDir = '/Users/fanzhang/Documents/github/rcc/sharedmodule/pipeline';
  process.chdir(projectDir);

  // Run TypeScript compiler with noEmit flag
  const result = execSync('npx tsc --noEmit', {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  console.log('✅ TypeScript compilation successful!');

  // If successful, try the actual build
  console.log('🏗️  Running full build...');
  execSync('npm run build', {
    encoding: 'utf8',
    stdio: 'inherit'
  });

  console.log('🎉 Build completed successfully!');

} catch (error) {
  console.error('❌ Build failed:');
  if (error.stdout) {
    console.error('STDOUT:', error.stdout);
  }
  if (error.stderr) {
    console.error('STDERR:', error.stderr);
  }
  process.exit(1);
}