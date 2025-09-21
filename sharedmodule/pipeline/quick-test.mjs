#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('🔍 Testing TypeScript compilation...');

try {
  const result = execSync('npx tsc --noEmit', {
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  console.log('✅ Compilation successful!');

} catch (error) {
  console.error('❌ Compilation failed:');
  console.error(error.message);
  process.exit(1);
}