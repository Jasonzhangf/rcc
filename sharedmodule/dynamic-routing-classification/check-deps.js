#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Checking RCC BaseModule availability...');

try {
  // Check if rcc-basemodule is available globally
  const globalModulesPath = path.join(process.env.HOME, '.npm', 'lib', 'node_modules');
  const basemodulePath = path.join(globalModulesPath, 'rcc-basemodule');

  console.log(`Checking global modules at: ${globalModulesPath}`);
  console.log(`Looking for rcc-basemodule at: ${basemodulePath}`);

  if (fs.existsSync(basemodulePath)) {
    console.log('✅ rcc-basemodule found globally');

    // Check package.json
    const packagePath = path.join(basemodulePath, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      console.log(`   Version: ${packageJson.version}`);
      console.log(`   Main: ${packageJson.main}`);
    }
  } else {
    console.log('❌ rcc-basemodule not found globally');
    console.log('   You may need to install it with: npm install -g rcc-basemodule');
  }

  // Check current directory
  const currentDir = process.cwd();
  console.log(`\nCurrent directory: ${currentDir}`);

  // Check if node_modules exists
  const nodeModulesPath = path.join(currentDir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('✅ node_modules exists');

    const localBasemodulePath = path.join(nodeModulesPath, 'rcc-basemodule');
    if (fs.existsSync(localBasemodulePath)) {
      console.log('✅ rcc-basemodule found in node_modules');
    } else {
      console.log('❌ rcc-basemodule not found in node_modules');
    }
  } else {
    console.log('❌ node_modules does not exist - run npm install');
  }

} catch (error) {
  console.error('Error checking dependencies:', error.message);
}