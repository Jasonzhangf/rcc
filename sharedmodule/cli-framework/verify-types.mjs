#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verifying TypeScript compilation fixes...\n');

const tests = [
  {
    name: 'TypeScript compilation check',
    command: 'npx tsc --noEmit',
    expected: 'success'
  },
  {
    name: 'Build with Rollup',
    command: 'npx rollup -c',
    expected: 'success'
  },
  {
    name: 'Lint check',
    command: 'npx eslint src/**/*.ts --max-warnings=0',
    expected: 'success'
  }
];

let passedTests = 0;
let totalTests = tests.length;

for (const test of tests) {
  try {
    console.log(`🧪 Running: ${test.name}`);

    const result = execSync(test.command, {
      cwd: __dirname,
      stdio: 'pipe',
      encoding: 'utf8'
    });

    if (test.expected === 'success') {
      console.log(`✅ ${test.name} - PASSED`);
      passedTests++;
    } else {
      console.log(`❌ ${test.name} - FAILED (unexpected success)`);
    }

  } catch (error) {
    if (test.expected === 'fail') {
      console.log(`✅ ${test.name} - PASSED (expected failure)`);
      passedTests++;
    } else {
      console.log(`❌ ${test.name} - FAILED`);
      console.log(`Error: ${error.message}`);
      if (error.stdout) console.log(`Stdout: ${error.stdout}`);
      if (error.stderr) console.log(`Stderr: ${error.stderr}`);
    }
  }

  console.log('');
}

console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All TypeScript compilation issues have been resolved!');
  process.exit(0);
} else {
  console.log('❌ Some issues remain. Please check the output above.');
  process.exit(1);
}