#!/usr/bin/env node

/**
 * TypeScript build diagnostic script
 * Used to identify compilation errors in the pipeline module
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Starting TypeScript compilation diagnostic...\n');

try {
  // Run TypeScript compiler to check for errors
  console.log('📝 Running TypeScript compiler...');
  const tscOutput = execSync('npx tsc --noEmit', {
    cwd: path.dirname(__filename),
    encoding: 'utf8',
    stdio: 'pipe'
  });

  console.log('✅ TypeScript compilation completed successfully');
  console.log('No compilation errors found.');

} catch (error) {
  console.log('❌ TypeScript compilation failed with errors:\n');
  console.log(error.stdout || error.message || error);

  // Try to identify specific error patterns
  const errorOutput = error.stdout || error.message || '';
  console.log('\n📊 Error Analysis:');

  // Check for common error patterns
  if (errorOutput.includes('Cannot find module')) {
    console.log('🔧 Module import issues detected');
  }

  if (errorOutput.includes('Property') && errorOutput.includes('does not exist')) {
    console.log('🔧 Property access issues detected');
  }

  if (errorOutput.includes('Type') && errorOutput.includes('is not assignable')) {
    console.log('🔧 Type compatibility issues detected');
  }

  if (errorOutput.includes('Cannot use') && errorOutput.includes('as a type')) {
    console.log('🔧 Type declaration issues detected');
  }

  process.exit(1);
}