#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Testing TypeScript compilation...');
  
  // Change to the correct directory
  process.chdir(path.join(__dirname));
  
  // Run TypeScript compilation
  const result = execSync('./node_modules/.bin/tsc --noEmit', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ TypeScript compilation successful!');
  console.log(result);
  
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout);
  console.log(error.stderr);
  process.exit(1);
}