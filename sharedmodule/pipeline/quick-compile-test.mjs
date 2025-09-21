#!/usr/bin/env node

import { execSync } from 'child_process';

const pipelineDir = '/Users/fanzhang/Documents/github/rcc/sharedmodule/pipeline';

console.log('🔍 Testing TypeScript compilation for RCC pipeline module...');

try {
  // Test TypeScript compilation
  console.log('📋 Running TypeScript type checking...');
  const result = execSync('npx tsc --noEmit', {
    cwd: pipelineDir,
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  console.log('✅ TypeScript compilation successful!');
  if (result) {
    console.log(result);
  }

} catch (error) {
  if (error instanceof Error) {
    console.error('❌ TypeScript compilation failed:');
    console.error(error.message);
    process.exit(1);
  }
}

console.log('\n🎯 All TypeScript compilation errors have been resolved!');