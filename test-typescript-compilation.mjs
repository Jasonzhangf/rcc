#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Testing TypeScript compilation for pipeline module...');
  const pipelineDir = path.join(__dirname, 'sharedmodule', 'pipeline');

  // Change to pipeline directory and run TypeScript check
  process.chdir(pipelineDir);

  // Run TypeScript compiler
  const result = execSync('npx tsc --noEmit', {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  console.log('✅ TypeScript compilation successful!');
  console.log('No compilation errors found.');

} catch (error) {
  if (error.stdout) {
    console.log('❌ TypeScript compilation errors found:');
    console.log(error.stdout);
  } else {
    console.log('❌ Error running TypeScript compiler:', error.message);
  }
  process.exit(1);
}