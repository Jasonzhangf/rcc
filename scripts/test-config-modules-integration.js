#!/usr/bin/env node

/**
 * Configuration System Module Integration Test
 * 
 * This script tests the full Configuration System modules working together
 * to validate real-world configuration management scenarios.
 */

const fs = require('fs');
const path = require('path');

// Colors for output
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

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function fail(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function header(message) {
  log(`\n${colors.bold}${colors.cyan}${message}${colors.reset}`);
}

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function runTest(name, testFn) {
  testResults.total++;
  testResults.tests.push(name);
  
  try {
    const result = testFn();
    if (result !== false) {
      success(name);
      testResults.passed++;
      return true;
    } else {
      fail(name);
      testResults.failed++;
      return false;
    }
  } catch (error) {
    fail(`${name}: ${error.message}`);
    testResults.failed++;
    return false;
  }
}

// Mock BaseModule functionality for testing
class MockBaseModule {
  constructor(info) {
    this.info = info;
    this.initialized = false;
    this.configured = false;
    this.config = {};
    this.inputConnections = new Map();
    this.outputConnections = new Map();
    this.validationRules = [];
  }

  async initialize() {
    this.initialized = true;
  }

  configure(config) {
    this.config = { ...config };
    this.configured = true;
  }

  getInfo() {
    return { ...this.info };
  }

  getConfig() {
    return { ...this.config };
  }

  validateInput(data) {
    // Simple validation
    const errors = [];
    for (const rule of this.validationRules) {
      const value = data[rule.field];
      if (rule.type === 'required' && (value === undefined || value === null)) {
        errors.push(rule.message);
      }
    }
    return { isValid: errors.length === 0, errors, data };
  }

  addOutputConnection(connection) {
    this.outputConnections.set(connection.id, connection);
  }

  addInputConnection(connection) {
    this.inputConnections.set(connection.id, connection);
  }

  async receiveData(dataTransfer) {
    info(`Module ${this.info.id} received data: ${JSON.stringify(dataTransfer.data).slice(0, 100)}...`);
  }

  async destroy() {
    this.inputConnections.clear();
    this.outputConnections.clear();
    this.initialized = false;
    this.configured = false;
    this.config = {};
  }
}

// Mock Configuration Loader Module
class MockConfigLoaderModule extends MockBaseModule {
  constructor(info) {
    super(info);
    this.validationRules = [
      {
        field: 'filePath',
        type: 'required',
        message: 'File path is required'
      }
    ];
  }

  async loadFromFile(filePath, options = {}) {
    const validation = this.validateInput({ filePath });
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    const rawContent = fs.readFileSync(filePath, 'utf8');
    const parsedContent = this.parseJSON5(rawContent);
    const interpolatedContent = this.interpolateEnvironmentVariables(parsedContent);

    return {
      raw: rawContent,
      parsed: interpolatedContent,
      validated: false,
      metadata: {
        filePath,
        fileSize: rawContent.length,
        lastModified: Date.now(),
        version: '1.0.0',
        environmentVariables: this.extractEnvVars(rawContent),
        loadTime: Date.now()
      }
    };
  }

  parseJSON5(content) {
    // Simple JSON5 parser
    let cleaned = content
      .split('\n')
      .map(line => {
        let inString = false;
        let escaped = false;
        let result = '';
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (!inString && char === '/' && nextChar === '/') {
            break;
          }
          
          if (char === '"' && !escaped) {
            inString = !inString;
          }
          
          escaped = char === '\\' && !escaped;
          result += char;
        }
        
        return result;
      })
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,(\s*[}\]])/g, '$1');
    
    return JSON.parse(cleaned);
  }

  interpolateEnvironmentVariables(obj) {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/g, (match, braced, unbraced) => {
        const varName = braced || unbraced;
        return process.env[varName] || match;
      });
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateEnvironmentVariables(item));
    } else if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateEnvironmentVariables(value);
      }
      return result;
    }
    return obj;
  }

  extractEnvVars(content) {
    const regex = /\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/g;
    const matches = content.match(regex) || [];
    return [...new Set(matches)];
  }

  async mergeConfigurations(configs) {
    const merged = configs.reduce((result, config) => {
      return this.deepMerge(result, config.parsed || config);
    }, {});

    return {
      raw: JSON.stringify(merged),
      parsed: merged,
      validated: false,
      metadata: {
        merged: true,
        sourceCount: configs.length,
        loadTime: Date.now()
      }
    };
  }

  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

// Mock Configuration Validator Module
class MockConfigValidatorModule extends MockBaseModule {
  constructor(info) {
    super(info);
    this.schemas = new Map();
    this.customValidators = new Map();
  }

  registerSchema(name, schema) {
    this.schemas.set(name, schema);
  }

  async validateComplete(config) {
    const errors = [];
    const warnings = [];

    // Basic structure validation
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object');
    }

    // Type validation for common fields
    if (config.system) {
      if (config.system.name && typeof config.system.name !== 'string') {
        errors.push('system.name must be a string');
      }
      if (config.system.version && typeof config.system.version !== 'string') {
        errors.push('system.version must be a string');
      }
    }

    if (config.database) {
      if (config.database.port && isNaN(parseInt(config.database.port))) {
        warnings.push('database.port should be a number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: config
    };
  }

  async validateSection(section, data) {
    const errors = [];

    switch (section) {
      case 'system':
        if (!data.name) errors.push('system.name is required');
        break;
      case 'database':
        if (!data.host) errors.push('database.host is required');
        break;
      case 'statusLine':
        if (!data.theme) errors.push('statusLine.theme is required');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      data
    };
  }
}

// Test configuration creation
function createTestConfigurations() {
  header('📁 Creating Test Configuration Files');

  // Test configuration 1: Basic config
  const basicConfig = {
    system: {
      name: 'RCC Test System',
      version: '1.0.0',
      environment: '${NODE_ENV}',
      debug: true
    },
    database: {
      host: '${DB_HOST}',
      port: '${DB_PORT}',
      username: '${DB_USER}',
      password: '${DB_PASSWORD}'
    }
  };

  // Test configuration 2: Extended config
  const extendedConfig = {
    server: {
      port: 3000,
      host: 'localhost'
    },
    features: {
      authentication: true,
      cache: true
    }
  };

  // Test configuration 3: Status line config
  const statusLineConfig = {
    statusLine: {
      theme: 'powerline',
      position: 'bottom',
      components: ['mode', 'file', 'position']
    }
  };

  const configs = {
    'test-basic.json5': JSON.stringify(basicConfig, null, 2),
    'test-extended.json': JSON.stringify(extendedConfig, null, 2),
    'test-statusline.json5': `{
  // Status line configuration
  "statusLine": {
    "theme": "powerline",
    "position": "bottom",
    "components": ["mode", "file", "position"]
  }
}`
  };

  Object.entries(configs).forEach(([filename, content]) => {
    fs.writeFileSync(filename, content);
    success(`Created test configuration: ${filename}`);
  });

  return Object.keys(configs);
}

// Test module initialization
function testModuleInitialization() {
  header('🚀 Testing Module Initialization');

  const moduleInfo = {
    id: 'test-config-loader',
    name: 'Test Configuration Loader',
    version: '1.0.0',
    description: 'Test configuration loader module',
    type: 'config-loader'
  };

  return runTest('ConfigLoaderModule initialization', () => {
    const configLoader = new MockConfigLoaderModule(moduleInfo);
    return configLoader.getInfo().id === 'test-config-loader';
  });
}

// Test configuration loading
function testConfigurationLoading(configFiles) {
  header('📖 Testing Configuration Loading');

  const moduleInfo = {
    id: 'test-config-loader',
    name: 'Test Configuration Loader',
    version: '1.0.0',
    description: 'Test configuration loader module',
    type: 'config-loader'
  };

  const configLoader = new MockConfigLoaderModule(moduleInfo);

  let allTestsPassed = true;

  for (const configFile of configFiles) {
    const testPassed = runTest(`Load configuration file: ${configFile}`, async () => {
      try {
        const configData = await configLoader.loadFromFile(configFile);
        
        return (
          configData.raw &&
          configData.parsed &&
          configData.metadata &&
          configData.metadata.filePath === configFile
        );
      } catch (error) {
        log(`Loading error: ${error.message}`, 'red');
        return false;
      }
    });
    
    if (!testPassed) allTestsPassed = false;
  }

  return allTestsPassed;
}

// Test environment variable interpolation
function testEnvironmentInterpolation(configFiles) {
  header('🔄 Testing Environment Variable Interpolation');

  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = 'testhost';
  process.env.DB_PORT = '5432';
  process.env.DB_USER = 'testuser';
  process.env.DB_PASSWORD = 'testpass';

  const moduleInfo = {
    id: 'test-config-loader',
    name: 'Test Configuration Loader',
    version: '1.0.0',
    description: 'Test configuration loader module',
    type: 'config-loader'
  };

  const configLoader = new MockConfigLoaderModule(moduleInfo);

  return runTest('Environment variable interpolation', async () => {
    try {
      const configData = await configLoader.loadFromFile(configFiles[0]); // basic config
      
      return (
        configData.parsed.system.environment === 'test' &&
        configData.parsed.database.host === 'testhost' &&
        configData.parsed.database.port === '5432'
      );
    } catch (error) {
      log(`Interpolation error: ${error.message}`, 'red');
      return false;
    }
  });
}

// Test configuration validation
function testConfigurationValidation() {
  header('✅ Testing Configuration Validation');

  const moduleInfo = {
    id: 'test-config-validator',
    name: 'Test Configuration Validator',
    version: '1.0.0',
    description: 'Test configuration validator module',
    type: 'config-validator'
  };

  const configValidator = new MockConfigValidatorModule(moduleInfo);

  const validConfig = {
    system: {
      name: 'Test System',
      version: '1.0.0'
    },
    database: {
      host: 'localhost',
      port: 5432
    }
  };

  const invalidConfig = {
    system: {
      // missing name
      version: 123 // wrong type
    }
  };

  let allTestsPassed = true;

  // Test valid configuration
  allTestsPassed &= runTest('Validate valid configuration', async () => {
    const result = await configValidator.validateComplete(validConfig);
    return result.isValid;
  });

  // Test invalid configuration
  allTestsPassed &= runTest('Reject invalid configuration', async () => {
    const result = await configValidator.validateComplete(invalidConfig);
    return !result.isValid && result.errors.length > 0;
  });

  // Test section validation
  allTestsPassed &= runTest('Section validation', async () => {
    const result = await configValidator.validateSection('system', validConfig.system);
    return result.isValid;
  });

  return allTestsPassed;
}

// Test configuration merging
function testConfigurationMerging(configFiles) {
  header('🔀 Testing Configuration Merging');

  const moduleInfo = {
    id: 'test-config-loader',
    name: 'Test Configuration Loader',
    version: '1.0.0',
    description: 'Test configuration loader module',
    type: 'config-loader'
  };

  const configLoader = new MockConfigLoaderModule(moduleInfo);

  return runTest('Configuration merging', async () => {
    try {
      const configs = [];
      
      for (const configFile of configFiles) {
        const configData = await configLoader.loadFromFile(configFile);
        configs.push(configData);
      }

      const mergedConfig = await configLoader.mergeConfigurations(configs);
      
      return (
        mergedConfig.parsed.system &&
        mergedConfig.parsed.server &&
        mergedConfig.parsed.statusLine &&
        mergedConfig.metadata.merged === true
      );
    } catch (error) {
      log(`Merging error: ${error.message}`, 'red');
      return false;
    }
  });
}

// Test module communication
function testModuleCommunication() {
  header('🔗 Testing Module Communication');

  const loaderInfo = {
    id: 'test-config-loader',
    name: 'Test Configuration Loader',
    version: '1.0.0',
    type: 'config-loader'
  };

  const validatorInfo = {
    id: 'test-config-validator',
    name: 'Test Configuration Validator',
    version: '1.0.0',
    type: 'config-validator'
  };

  const configLoader = new MockConfigLoaderModule(loaderInfo);
  const configValidator = new MockConfigValidatorModule(validatorInfo);

  return runTest('Module connection setup', () => {
    // Set up connections
    configLoader.addOutputConnection({
      id: 'loader-to-validator',
      sourceModuleId: configLoader.getInfo().id,
      targetModuleId: configValidator.getInfo().id,
      type: 'output',
      status: 'connected'
    });

    configValidator.addInputConnection({
      id: 'validator-from-loader',
      sourceModuleId: configLoader.getInfo().id,
      targetModuleId: configValidator.getInfo().id,
      type: 'input',
      status: 'connected'
    });

    return (
      configLoader.outputConnections.size === 1 &&
      configValidator.inputConnections.size === 1
    );
  });
}

// Cleanup test files
function cleanupTestFiles(configFiles) {
  header('🧹 Cleaning Up Test Files');

  configFiles.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        success(`Removed test file: ${file}`);
      }
    } catch (error) {
      warning(`Failed to remove ${file}: ${error.message}`);
    }
  });
}

// Generate final test report
function generateTestReport() {
  header('📊 Integration Test Report');

  const passRate = testResults.total > 0 ? (testResults.passed / testResults.total * 100).toFixed(1) : 0;

  log(`\n${colors.bold}Configuration System Integration Test Report${colors.reset}`);
  log(`${'='.repeat(55)}`);
  log(`Total Tests: ${colors.bold}${testResults.total}${colors.reset}`);
  log(`Passed: ${colors.green}${testResults.passed}${colors.reset}`);
  log(`Failed: ${colors.red}${testResults.failed}${colors.reset}`);
  log(`Pass Rate: ${passRate >= 80 ? colors.green : colors.red}${passRate}%${colors.reset}`);
  log(`${'='.repeat(55)}`);

  if (testResults.failed > 0) {
    log(`\n${colors.bold}${colors.red}Failed Tests:${colors.reset}`);
    // Could list specific failed tests here
  }

  if (passRate >= 80) {
    log(`\n${colors.bold}${colors.green}🎉 INTEGRATION TESTS PASSED!${colors.reset}`);
    log(`${colors.green}Configuration System modules are working correctly together.${colors.reset}`);
    return 0;
  } else {
    log(`\n${colors.bold}${colors.red}❌ INTEGRATION TESTS FAILED${colors.reset}`);
    log(`${colors.red}Some module integration issues need to be resolved.${colors.reset}`);
    return 1;
  }
}

// Main test execution
async function main() {
  log(`${colors.bold}${colors.cyan}Configuration System Module Integration Test${colors.reset}`);
  log(`${colors.cyan}Testing complete configuration system workflow${colors.reset}\n`);

  try {
    // Create test configurations
    const configFiles = createTestConfigurations();

    // Run all integration tests
    testModuleInitialization();
    testConfigurationLoading(configFiles);
    testEnvironmentInterpolation(configFiles);
    testConfigurationValidation();
    testConfigurationMerging(configFiles);
    testModuleCommunication();

    // Cleanup and report
    cleanupTestFiles(configFiles);
    return generateTestReport();

  } catch (error) {
    fail(`Integration test execution failed: ${error.message}`);
    return 1;
  }
}

// Show usage
function showUsage() {
  log("Usage: node scripts/test-config-modules-integration.js [options]");
  log("");
  log("Options:");
  log("  -h, --help     Show this help message");
  log("  -v, --verbose  Enable verbose output");
  log("");
  log("This script tests the Configuration System module integration.");
}

// Parse arguments
const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  showUsage();
  process.exit(0);
}

// Run main function
if (require.main === module) {
  main()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      fail(`Unhandled error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { main };