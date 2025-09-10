#!/usr/bin/env node

/**
 * Test runner for Web UI validation
 * Executes the Web UI test script with proper context
 */

const { spawn } = require('child_process');
const path = require('path');

// Change to the Configuration directory
process.chdir(path.resolve(__dirname));

console.log('🚀 Starting Web UI Test Suite...');
console.log('Working directory:', process.cwd());

// Execute the test script
const testProcess = spawn('node', ['test-webui.js'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

testProcess.on('close', (code) => {
  console.log(`\n🏁 Test suite completed with exit code: ${code}`);
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error);
  process.exit(1);
});