#!/usr/bin/env node

// Test script to check TypeScript compilation
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing TypeScript compilation...');

try {
  // Try to compile TypeScript
  execSync('npx tsc --noEmit', {
    cwd: __dirname,
    stdio: 'inherit'
  });

  console.log('✅ TypeScript compilation successful!');

  // Try to build with rollup
  execSync('npx rollup -c', {
    cwd: __dirname,
    stdio: 'inherit'
  });

  console.log('✅ Rollup build successful!');

} catch (error) {
  console.error('❌ Compilation failed:', error.message);
  process.exit(1);
}