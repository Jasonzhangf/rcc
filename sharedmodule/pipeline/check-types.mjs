#!/usr/bin/env node

// Simple TypeScript compilation check
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const pipelineDir = '/Users/fanzhang/Documents/github/rcc/sharedmodule/pipeline';

try {
  console.log('Running TypeScript compilation check...');

  // Run TypeScript compiler
  const result = execSync('npx tsc --noEmit', {
    cwd: pipelineDir,
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  console.log('✅ TypeScript compilation successful!');
  console.log(result);

} catch (error) {
  console.error('❌ TypeScript compilation failed:');
  console.error(error.stdout || error.message);

  // Try to get more detailed error information
  try {
    const detailedResult = execSync('npx tsc --noEmit --listFiles', {
      cwd: pipelineDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log('Detailed compilation results:');
    console.log(detailedResult);
  } catch (detailedError) {
    console.error('Detailed error:', detailedError.stdout || detailedError.message);
  }

  process.exit(1);
}