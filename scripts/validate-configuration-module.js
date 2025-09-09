#!/usr/bin/env node

/**
 * RCC4 Configuration Module Validation Script
 * 
 * This script validates that the Configuration Module system complies with all
 * RCC4 Module Development Guidelines and standards.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Configuration module paths
const CONFIG_MODULE_BASE = 'src/modules/Configuration';
const API_REGISTRY_PATH = '.claude/module-api-registry.json';

// Required modules in the Configuration system
const REQUIRED_MODULES = [
  'ConfigLoaderModule',
  'ConfigValidatorModule', 
  'ConfigPersistenceModule',
  'ConfigUIModule',
  'StatusLineModule'
];

// Required directory structure for each module
const REQUIRED_STRUCTURE = {
  '__tests__': [
    'fixtures/test-data.ts'
  ],
  'constants': [],
  'interfaces': [],
  'src': []
};

// Global validation results
let validationResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: []
};

/**
 * Colored console output helpers
 */
function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  validationResults.passed++;
  log(`✅ ${message}`, 'green');
}

function fail(message) {
  validationResults.failed++;
  validationResults.errors.push(message);
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  validationResults.warnings++;
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function header(message) {
  log(`\n${colors.bold}${colors.cyan}${message}${colors.reset}`);
}

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
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
    throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
  }
}

/**
 * Read file content
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * Check if directory exists
 */
function dirExists(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get all files in directory
 */
function getFilesInDir(dirPath) {
  try {
    if (!dirExists(dirPath)) return [];
    return fs.readdirSync(dirPath).filter(file => 
      fs.lstatSync(path.join(dirPath, file)).isFile()
    );
  } catch {
    return [];
  }
}

/**
 * Validate basic directory structure
 */
function validateDirectoryStructure() {
  header('🏗️  Validating Directory Structure');

  // Check if main Configuration module directory exists
  if (!dirExists(CONFIG_MODULE_BASE)) {
    fail(`Configuration module base directory not found: ${CONFIG_MODULE_BASE}`);
    return;
  }
  success(`Configuration module base directory exists: ${CONFIG_MODULE_BASE}`);

  // Validate required directory structure
  Object.keys(REQUIRED_STRUCTURE).forEach(requiredDir => {
    const dirPath = path.join(CONFIG_MODULE_BASE, requiredDir);
    if (!dirExists(dirPath)) {
      fail(`Required directory missing: ${dirPath}`);
    } else {
      success(`Required directory exists: ${requiredDir}`);
      
      // Check required files in directory
      const requiredFiles = REQUIRED_STRUCTURE[requiredDir];
      requiredFiles.forEach(file => {
        const filePath = path.join(dirPath, file);
        if (!fileExists(filePath)) {
          fail(`Required file missing: ${file} in ${requiredDir}`);
        } else {
          success(`Required file exists: ${file}`);
        }
      });
    }
  });

  // Check for README.md
  const readmePath = path.join(CONFIG_MODULE_BASE, 'README.md');
  if (!fileExists(readmePath)) {
    fail('README.md not found in Configuration module');
  } else {
    success('README.md exists');
  }

  // Check for API documentation
  const apiDocPath = path.join(CONFIG_MODULE_BASE, 'API_DOCUMENTATION.md');
  if (!fileExists(apiDocPath)) {
    fail('API_DOCUMENTATION.md not found in Configuration module');
  } else {
    success('API_DOCUMENTATION.md exists');
  }
}

/**
 * Validate BaseModule inheritance for all modules
 */
function validateBaseModuleInheritance() {
  header('🏛️  Validating BaseModule Inheritance');

  REQUIRED_MODULES.forEach(moduleName => {
    const modulePath = path.join(CONFIG_MODULE_BASE, 'src', `${moduleName}.ts`);
    
    if (!fileExists(modulePath)) {
      fail(`Module file not found: ${moduleName}.ts`);
      return;
    }

    const moduleContent = readFile(modulePath);
    
    // Check BaseModule import
    const baseModuleImport = /import.*BaseModule.*from.*['"](.*BaseModule.*)['"]/;
    if (!baseModuleImport.test(moduleContent)) {
      fail(`${moduleName} does not import BaseModule`);
    } else {
      success(`${moduleName} imports BaseModule`);
    }

    // Check BaseModule extension
    const extendsBaseModule = new RegExp(`class\\s+${moduleName}\\s+extends\\s+BaseModule`);
    if (!extendsBaseModule.test(moduleContent)) {
      fail(`${moduleName} does not extend BaseModule`);
    } else {
      success(`${moduleName} extends BaseModule`);
    }

    // Check required lifecycle methods
    const requiredMethods = ['initialize', 'destroy', 'receiveData'];
    requiredMethods.forEach(method => {
      const methodRegex = new RegExp(`(public\\s+)?async\\s+${method}\\s*\\(`);
      if (!methodRegex.test(moduleContent)) {
        fail(`${moduleName} missing required method: ${method}`);
      } else {
        success(`${moduleName} implements ${method} method`);
      }
    });

    // Check constructor
    const constructorRegex = /constructor\s*\(\s*info\s*:\s*ModuleInfo\s*\)\s*{[\s\S]*super\s*\(\s*info\s*\)/;
    if (!constructorRegex.test(moduleContent)) {
      fail(`${moduleName} missing proper constructor with super(info) call`);
    } else {
      success(`${moduleName} has proper constructor`);
    }
  });
}

/**
 * Validate API registry entries
 */
function validateAPIRegistry() {
  header('📋 Validating API Registry');

  if (!fileExists(API_REGISTRY_PATH)) {
    fail(`API registry file not found: ${API_REGISTRY_PATH}`);
    return;
  }

  let apiRegistry;
  try {
    apiRegistry = readJsonFile(API_REGISTRY_PATH);
  } catch (error) {
    fail(`Failed to parse API registry: ${error.message}`);
    return;
  }

  success('API registry file exists and is valid JSON');

  // Check if module_apis exists
  if (!apiRegistry.module_apis) {
    fail('API registry missing module_apis section');
    return;
  }

  // Validate each Configuration module in registry
  REQUIRED_MODULES.forEach(moduleName => {
    if (!apiRegistry.module_apis[moduleName]) {
      fail(`${moduleName} not found in API registry`);
      return;
    }

    const moduleEntry = apiRegistry.module_apis[moduleName];
    
    // Validate module metadata
    if (!moduleEntry.module) {
      fail(`${moduleName} missing module metadata in API registry`);
      return;
    }

    const requiredFields = ['name', 'description', 'version', 'basePath'];
    requiredFields.forEach(field => {
      if (!moduleEntry.module[field]) {
        fail(`${moduleName} missing ${field} in module metadata`);
      } else {
        success(`${moduleName} has ${field} in registry`);
      }
    });

    // Validate endpoints
    if (!moduleEntry.endpoints || !Array.isArray(moduleEntry.endpoints)) {
      fail(`${moduleName} missing or invalid endpoints in API registry`);
      return;
    }

    if (moduleEntry.endpoints.length === 0) {
      warning(`${moduleName} has no endpoints in API registry`);
    } else {
      success(`${moduleName} has ${moduleEntry.endpoints.length} endpoints in registry`);
      
      // Validate endpoint structure
      moduleEntry.endpoints.forEach((endpoint, index) => {
        const requiredEndpointFields = ['name', 'description', 'method', 'path', 'returnType', 'access'];
        requiredEndpointFields.forEach(field => {
          if (!endpoint[field]) {
            fail(`${moduleName} endpoint ${index} missing ${field}`);
          }
        });
      });
    }
  });
}

/**
 * Validate anti-hardcoding policy compliance
 */
function validateAntiHardcodingPolicy() {
  header('🚫 Validating Anti-Hardcoding Policy');

  REQUIRED_MODULES.forEach(moduleName => {
    // Check if constants file exists
    const constantsPath = path.join(CONFIG_MODULE_BASE, 'constants', `${moduleName}.constants.ts`);
    
    if (!fileExists(constantsPath)) {
      fail(`Constants file not found for ${moduleName}: ${constantsPath}`);
      return;
    }
    success(`Constants file exists for ${moduleName}`);

    // Check module file for hardcoded values
    const modulePath = path.join(CONFIG_MODULE_BASE, 'src', `${moduleName}.ts`);
    if (!fileExists(modulePath)) {
      return; // Already checked in BaseModule validation
    }

    const moduleContent = readFile(modulePath);
    
    // Check for hardcoded strings (basic check)
    const hardcodedStringRegex = /['"]\s*[A-Z_]{2,}\s*['"]|['"]\s*\/[^'"]*\s*['"]|['"]\s*https?:\/\/[^'"]*\s*['"]/g;
    const potentialHardcoded = moduleContent.match(hardcodedStringRegex);
    
    if (potentialHardcoded && potentialHardcoded.length > 5) {
      warning(`${moduleName} may contain hardcoded values. Review for compliance.`);
    } else {
      success(`${moduleName} appears to follow anti-hardcoding policy`);
    }

    // Check for constants import
    const constantsImportRegex = new RegExp(`import.*${moduleName.toUpperCase()}_CONSTANTS.*from.*constants`);
    if (!constantsImportRegex.test(moduleContent)) {
      warning(`${moduleName} may not be importing its constants file`);
    } else {
      success(`${moduleName} imports its constants file`);
    }
  });
}

/**
 * Validate test coverage
 */
function validateTestCoverage() {
  header('🧪 Validating Test Coverage');

  REQUIRED_MODULES.forEach(moduleName => {
    // Check unit test file
    const unitTestPath = path.join(CONFIG_MODULE_BASE, '__tests__', `${moduleName}.test.ts`);
    if (!fileExists(unitTestPath)) {
      fail(`Unit test file not found for ${moduleName}: ${unitTestPath}`);
    } else {
      success(`Unit test file exists for ${moduleName}`);
      
      // Basic test content validation
      const testContent = readFile(unitTestPath);
      if (!testContent.includes('describe(') || !testContent.includes('it(')) {
        fail(`${moduleName} test file appears incomplete`);
      } else {
        success(`${moduleName} test file contains test cases`);
      }
    }

    // Check communication test file
    const commTestPath = path.join(CONFIG_MODULE_BASE, '__tests__', `${moduleName}Communication.test.ts`);
    if (!fileExists(commTestPath)) {
      fail(`Communication test file not found for ${moduleName}: ${commTestPath}`);
    } else {
      success(`Communication test file exists for ${moduleName}`);
    }
  });

  // Check for integration tests
  const integrationTestPath = path.join(CONFIG_MODULE_BASE, '__tests__', 'ConfigurationSystem.integration.test.ts');
  if (!fileExists(integrationTestPath)) {
    fail('Integration test file not found: ConfigurationSystem.integration.test.ts');
  } else {
    success('Integration test file exists');
  }

  // Check test fixtures
  const fixturesPath = path.join(CONFIG_MODULE_BASE, '__tests__', 'fixtures', 'test-data.ts');
  if (!fileExists(fixturesPath)) {
    fail('Test fixtures file not found: test-data.ts');
  } else {
    success('Test fixtures file exists');
  }
}

/**
 * Validate TypeScript compliance
 */
function validateTypeScriptCompliance() {
  header('📝 Validating TypeScript Compliance');

  try {
    // Check if tsconfig.json exists
    if (!fileExists('tsconfig.json')) {
      fail('tsconfig.json not found in project root');
      return;
    }
    success('tsconfig.json exists');

    // Run TypeScript compiler check
    info('Running TypeScript compiler check...');
    execSync('npx tsc --noEmit --project tsconfig.json', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    success('TypeScript compilation check passed');

  } catch (error) {
    fail('TypeScript compilation check failed');
    if (error.stdout) {
      log('TypeScript errors:', 'red');
      log(error.stdout.toString(), 'red');
    }
  }

  // Check interface files
  REQUIRED_MODULES.forEach(moduleName => {
    const interfacePath = path.join(CONFIG_MODULE_BASE, 'interfaces', `I${moduleName}.ts`);
    if (!fileExists(interfacePath)) {
      warning(`Interface file not found for ${moduleName}: I${moduleName}.ts`);
    } else {
      success(`Interface file exists for ${moduleName}`);
    }
  });
}

/**
 * Validate documentation compliance
 */
function validateDocumentation() {
  header('📚 Validating Documentation');

  // Check README.md content
  const readmePath = path.join(CONFIG_MODULE_BASE, 'README.md');
  if (fileExists(readmePath)) {
    const readmeContent = readFile(readmePath);
    
    // Check for required sections
    const requiredSections = [
      'RCC4 Compliance',
      'BaseModule Architecture', 
      'API Reference',
      'Installation and Setup',
      'Testing',
      'Performance Benchmarks'
    ];

    requiredSections.forEach(section => {
      if (!readmeContent.includes(section)) {
        fail(`README.md missing required section: ${section}`);
      } else {
        success(`README.md contains section: ${section}`);
      }
    });

    // Check for API registry mention
    if (!readmeContent.includes('module-api-registry.json')) {
      warning('README.md should reference API registry');
    } else {
      success('README.md references API registry');
    }
  }

  // Check API documentation
  const apiDocPath = path.join(CONFIG_MODULE_BASE, 'API_DOCUMENTATION.md');
  if (fileExists(apiDocPath)) {
    const apiDocContent = readFile(apiDocPath);
    
    // Check if all modules are documented
    REQUIRED_MODULES.forEach(moduleName => {
      if (!apiDocContent.includes(moduleName)) {
        fail(`API documentation missing ${moduleName}`);
      } else {
        success(`API documentation includes ${moduleName}`);
      }
    });
  }
}

/**
 * Run package.json validation commands
 */
function runPackageValidation() {
  header('📦 Running Package Validation Commands');

  const validationCommands = [
    { name: 'Lint Check', command: 'npm run lint' },
    { name: 'Format Check', command: 'npm run format:check' },
    { name: 'Type Check', command: 'npm run typecheck' }
  ];

  validationCommands.forEach(({ name, command }) => {
    try {
      info(`Running ${name}...`);
      execSync(command, { stdio: 'pipe', cwd: process.cwd() });
      success(`${name} passed`);
    } catch (error) {
      fail(`${name} failed`);
      if (error.stdout) {
        log(`${name} output:`, 'yellow');
        log(error.stdout.toString().slice(0, 500), 'yellow');
      }
    }
  });
}

/**
 * Generate final validation report
 */
function generateReport() {
  header('📊 Validation Report');

  const total = validationResults.passed + validationResults.failed;
  const passRate = total > 0 ? (validationResults.passed / total * 100).toFixed(1) : 0;

  log(`\n${colors.bold}Configuration Module RCC4 Compliance Report${colors.reset}`);
  log(`${'='.repeat(50)}`);
  log(`✅ Passed: ${colors.green}${validationResults.passed}${colors.reset}`);
  log(`❌ Failed: ${colors.red}${validationResults.failed}${colors.reset}`);
  log(`⚠️  Warnings: ${colors.yellow}${validationResults.warnings}${colors.reset}`);
  log(`📊 Pass Rate: ${passRate >= 90 ? colors.green : colors.red}${passRate}%${colors.reset}`);
  log(`${'='.repeat(50)}`);

  if (validationResults.failed > 0) {
    log(`\n${colors.bold}${colors.red}❌ CRITICAL ISSUES:${colors.reset}`);
    validationResults.errors.forEach((error, index) => {
      log(`${index + 1}. ${error}`, 'red');
    });
  }

  if (passRate >= 90 && validationResults.failed === 0) {
    log(`\n${colors.bold}${colors.green}🎉 CONFIGURATION MODULE PASSES RCC4 COMPLIANCE!${colors.reset}`);
    log(`${colors.green}All critical requirements met. Module is ready for production.${colors.reset}`);
    return 0;
  } else {
    log(`\n${colors.bold}${colors.red}❌ CONFIGURATION MODULE FAILS RCC4 COMPLIANCE${colors.reset}`);
    log(`${colors.red}Critical issues must be resolved before production deployment.${colors.reset}`);
    return 1;
  }
}

/**
 * Main validation function
 */
function main() {
  log(`${colors.bold}${colors.cyan}RCC4 Configuration Module Validation${colors.reset}`);
  log(`${colors.cyan}Validating compliance with RCC4 Module Development Guidelines${colors.reset}\n`);

  try {
    validateDirectoryStructure();
    validateBaseModuleInheritance();
    validateAPIRegistry();
    validateAntiHardcodingPolicy();
    validateTestCoverage();
    validateTypeScriptCompliance();
    validateDocumentation();
    runPackageValidation();

    return generateReport();
  } catch (error) {
    fail(`Validation failed with error: ${error.message}`);
    return 1;
  }
}

// Run validation if called directly
if (require.main === module) {
  process.exit(main());
}

module.exports = {
  validateDirectoryStructure,
  validateBaseModuleInheritance,
  validateAPIRegistry,
  validateAntiHardcodingPolicy,
  validateTestCoverage,
  validateTypeScriptCompliance,
  validateDocumentation,
  main
};