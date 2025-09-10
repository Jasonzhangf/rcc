#!/usr/bin/env node

/**
 * Configuration Module Validation Script
 * 
 * This script validates the configuration module structure and basic functionality
 * to ensure the migration was successful and the module is ready for independent publishing.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Validation results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

/**
 * Log a test result
 */
function logTest(name, passed, message = '') {
  const status = passed ? 
    `${colors.green}✓ PASS${colors.reset}` : 
    `${colors.red}✗ FAIL${colors.reset}`;
  
  console.log(`  ${status} ${name}`);
  if (message) {
    console.log(`    ${colors.cyan}${message}${colors.reset}`);
  }
  
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

/**
 * Log a warning
 */
function logWarning(message) {
  console.log(`  ${colors.yellow}⚠ WARNING${colors.reset} ${message}`);
  results.warnings++;
}

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists
 */
function dirExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Read and parse JSON file
 */
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Validate package.json structure
 */
function validatePackageJson() {
  console.log(`\n${colors.bright}Validating package.json...${colors.reset}`);
  
  const packagePath = path.join(__dirname, '../package.json');
  const packageExists = fileExists(packagePath);
  logTest('package.json exists', packageExists);
  
  if (!packageExists) return;
  
  const pkg = readJsonFile(packagePath);
  if (!pkg) {
    logTest('package.json is valid JSON', false);
    return;
  }
  
  logTest('package.json is valid JSON', true);
  
  // Check required fields
  const requiredFields = ['name', 'version', 'description', 'main', 'types'];
  for (const field of requiredFields) {
    logTest(`package.json has ${field}`, !!pkg[field]);
  }
  
  // Check name
  logTest('package name is rcc-configuration', pkg.name === 'rcc-configuration');
  
  // Check dependencies
  const hasDeps = pkg.dependencies && typeof pkg.dependencies === 'object';
  logTest('package.json has dependencies', hasDeps);
  
  if (hasDeps) {
    logTest('has rcc-basemodule dependency', !!pkg.dependencies['rcc-basemodule']);
    logTest('has uuid dependency', !!pkg.dependencies['uuid']);
  }
  
  // Check scripts
  const hasScripts = pkg.scripts && typeof pkg.scripts === 'object';
  logTest('package.json has scripts', hasScripts);
  
  if (hasScripts) {
    const requiredScripts = ['build', 'test', 'lint'];
    for (const script of requiredScripts) {
      logTest(`has ${script} script`, !!pkg.scripts[script]);
    }
  }
}

/**
 * Validate directory structure
 */
function validateDirectoryStructure() {
  console.log(`\n${colors.bright}Validating directory structure...${colors.reset}`);
  
  const baseDir = path.join(__dirname, '..');
  
  // Required directories
  const requiredDirs = [
    'src',
    'src/core',
    'src/interfaces',
    'src/constants',
    'src/types',
    '__test__'
  ];
  
  for (const dir of requiredDirs) {
    const dirPath = path.join(baseDir, dir);
    logTest(`${dir}/ directory exists`, dirExists(dirPath));
  }
  
  // Required files
  const requiredFiles = [
    'src/index.ts',
    'src/core/ConfigurationSystem.ts',
    'src/interfaces/IConfigurationSystem.ts',
    'src/interfaces/IConfigLoaderModule.ts',
    'src/interfaces/IConfigUIModule.ts',
    'src/interfaces/IConfigPersistenceModule.ts',
    'src/interfaces/IConfigValidatorModule.ts',
    'src/constants/ConfigurationConstants.ts',
    'src/types/index.ts',
    '__test__/ConfigurationSystem.test.ts',
    'tsconfig.json',
    'README.md',
    'CHANGELOG.md',
    'LICENSE'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(baseDir, file);
    logTest(`${file} exists`, fileExists(filePath));
  }
}

/**
 * Validate TypeScript configuration
 */
function validateTypeScriptConfig() {
  console.log(`\n${colors.bright}Validating TypeScript configuration...${colors.reset}`);
  
  const tsconfigPath = path.join(__dirname, '../tsconfig.json');
  const tsconfigExists = fileExists(tsconfigPath);
  logTest('tsconfig.json exists', tsconfigExists);
  
  if (!tsconfigExists) return;
  
  const tsconfig = readJsonFile(tsconfigPath);
  if (!tsconfig) {
    logTest('tsconfig.json is valid JSON', false);
    return;
  }
  
  logTest('tsconfig.json is valid JSON', true);
  
  // Check compiler options
  const compilerOptions = tsconfig.compilerOptions;
  if (compilerOptions) {
    logTest('has compiler options', true);
    logTest('target is ES2020 or later', ['ES2020', 'ES2021', 'ES2022', 'ESNext'].includes(compilerOptions.target));
    logTest('module is ESNext', compilerOptions.module === 'ESNext');
    logTest('strict mode enabled', compilerOptions.strict === true);
    logTest('declaration enabled', compilerOptions.declaration === true);
    logTest('source maps enabled', compilerOptions.sourceMap === true);
  } else {
    logTest('has compiler options', false);
  }
}

/**
 * Validate source code structure
 */
function validateSourceCode() {
  console.log(`\n${colors.bright}Validating source code...${colors.reset}`);
  
  const indexPath = path.join(__dirname, '../src/index.ts');
  if (fileExists(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    logTest('index.ts exports ConfigurationSystem', indexContent.includes('export { ConfigurationSystem }'));
    logTest('index.ts has module info', indexContent.includes('MODULE_INFO'));
    logTest('index.ts has utility functions', indexContent.includes('createConfigurationSystem'));
  }
  
  const configSystemPath = path.join(__dirname, '../src/core/ConfigurationSystem.ts');
  if (fileExists(configSystemPath)) {
    const configSystemContent = fs.readFileSync(configSystemPath, 'utf8');
    logTest('ConfigurationSystem extends BaseModule', configSystemContent.includes('extends BaseModule'));
    logTest('ConfigurationSystem implements interface', configSystemContent.includes('implements IConfigurationSystem'));
    logTest('Uses rcc-basemodule import', configSystemContent.includes("from 'rcc-basemodule'"));
  }
  
  const constantsPath = path.join(__dirname, '../src/constants/ConfigurationConstants.ts');
  if (fileExists(constantsPath)) {
    const constantsContent = fs.readFileSync(constantsPath, 'utf8');
    logTest('Constants file has proper exports', constantsContent.includes('export const'));
    logTest('Constants file follows anti-hardcoding policy', constantsContent.includes('CONFIGURATION_SYSTEM_CONSTANTS'));
  }
}

/**
 * Validate test files
 */
function validateTests() {
  console.log(`\n${colors.bright}Validating test files...${colors.reset}`);
  
  const testPath = path.join(__dirname, '../__test__/ConfigurationSystem.test.ts');
  if (fileExists(testPath)) {
    const testContent = fs.readFileSync(testPath, 'utf8');
    logTest('Test file imports ConfigurationSystem', testContent.includes('ConfigurationSystem'));
    logTest('Test file has describe blocks', testContent.includes('describe('));
    logTest('Test file has test cases', testContent.includes('test(') || testContent.includes('it('));
    logTest('Test file tests initialization', testContent.includes('initialize'));
    logTest('Test file tests configuration management', testContent.includes('getConfiguration') || testContent.includes('updateConfiguration'));
  }
}

/**
 * Validate build configuration
 */
function validateBuildConfig() {
  console.log(`\n${colors.bright}Validating build configuration...${colors.reset}`);
  
  const rollupCjsPath = path.join(__dirname, '../rollup.config.cjs.js');
  const rollupEsmPath = path.join(__dirname, '../rollup.config.esm.js');
  
  logTest('Rollup CJS config exists', fileExists(rollupCjsPath));
  logTest('Rollup ESM config exists', fileExists(rollupEsmPath));
  
  if (fileExists(rollupCjsPath)) {
    const rollupContent = fs.readFileSync(rollupCjsPath, 'utf8');
    logTest('Rollup config has TypeScript plugin', rollupContent.includes('typescript'));
    logTest('Rollup config excludes tests', rollupContent.includes('__test__') || rollupContent.includes('*.test.ts'));
  }
}

/**
 * Validate documentation
 */
function validateDocumentation() {
  console.log(`\n${colors.bright}Validating documentation...${colors.reset}`);
  
  const readmePath = path.join(__dirname, '../README.md');
  if (fileExists(readmePath)) {
    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    logTest('README has installation instructions', readmeContent.includes('npm install'));
    logTest('README has usage examples', readmeContent.includes('```typescript') || readmeContent.includes('```javascript'));
    logTest('README has API documentation', readmeContent.includes('API') || readmeContent.includes('Methods'));
  }
  
  const changelogPath = path.join(__dirname, '../CHANGELOG.md');
  if (fileExists(changelogPath)) {
    const changelogContent = fs.readFileSync(changelogPath, 'utf8');
    logTest('CHANGELOG follows Keep a Changelog format', changelogContent.includes('Keep a Changelog'));
    logTest('CHANGELOG has version information', changelogContent.includes('[0.1.0]') || changelogContent.includes('## ['));
  }
  
  const licensePath = path.join(__dirname, '../LICENSE');
  logTest('LICENSE file exists', fileExists(licensePath));
}

/**
 * Check for common issues
 */
function checkCommonIssues() {
  console.log(`\n${colors.bright}Checking for common issues...${colors.reset}`);
  
  // Check for hardcoded values in source files
  const srcDir = path.join(__dirname, '../src');
  let hasHardcodedValues = false;
  
  try {
    function checkDirectory(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          checkDirectory(itemPath);
        } else if (item.endsWith('.ts') && !item.includes('.test.')) {
          const content = fs.readFileSync(itemPath, 'utf8');
          
          // Check for common hardcoded patterns (very basic check)
          const hardcodedPatterns = [
            /setTimeout\s*\(\s*[^,]+,\s*\d+\s*\)/, // setTimeout with hardcoded delay
            /port:\s*\d{4,5}/, // hardcoded ports
            /timeout:\s*\d+/, // hardcoded timeouts (not in constants)
          ];
          
          for (const pattern of hardcodedPatterns) {
            if (pattern.test(content) && !content.includes('constants')) {
              hasHardcodedValues = true;
              break;
            }
          }
        }
      }
    }
    
    checkDirectory(srcDir);
  } catch (error) {
    logWarning('Could not check for hardcoded values');
  }
  
  logTest('No obvious hardcoded values found', !hasHardcodedValues);
  
  // Check for TODO/FIXME comments
  let hasTodos = false;
  try {
    function checkTodos(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          checkTodos(itemPath);
        } else if (item.endsWith('.ts')) {
          const content = fs.readFileSync(itemPath, 'utf8');
          if (content.includes('TODO') || content.includes('FIXME')) {
            hasTodos = true;
            break;
          }
        }
      }
    }
    
    checkTodos(srcDir);
  } catch (error) {
    logWarning('Could not check for TODO/FIXME comments');
  }
  
  if (hasTodos) {
    logWarning('Found TODO/FIXME comments in source code');
  }
}

/**
 * Main validation function
 */
function main() {
  console.log(`${colors.bright}${colors.blue}RCC Configuration Module Validation${colors.reset}\n`);
  console.log('Validating configuration module structure and setup...\n');
  
  // Run all validation checks
  validatePackageJson();
  validateDirectoryStructure();
  validateTypeScriptConfig();
  validateSourceCode();
  validateTests();
  validateBuildConfig();
  validateDocumentation();
  checkCommonIssues();
  
  // Summary
  console.log(`\n${colors.bright}Validation Summary:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}Warnings: ${results.warnings}${colors.reset}`);
  
  const totalTests = results.passed + results.failed;
  const successRate = totalTests > 0 ? Math.round((results.passed / totalTests) * 100) : 0;
  
  console.log(`\n${colors.bright}Success Rate: ${successRate}%${colors.reset}`);
  
  if (results.failed === 0) {
    console.log(`\n${colors.green}${colors.bright}✓ Configuration module validation passed!${colors.reset}`);
    console.log(`The module is ready for independent publishing.`);
  } else {
    console.log(`\n${colors.red}${colors.bright}✗ Configuration module validation failed.${colors.reset}`);
    console.log(`Please fix the failed tests before publishing.`);
  }
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = {
  validatePackageJson,
  validateDirectoryStructure,
  validateTypeScriptConfig,
  validateSourceCode,
  validateTests,
  validateBuildConfig,
  validateDocumentation,
  checkCommonIssues
};