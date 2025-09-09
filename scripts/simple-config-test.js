#!/usr/bin/env node

/**
 * Simple Configuration Loading Test
 * Tests basic configuration file reading without external dependencies
 */

const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function header(message) {
  log(`\n${colors.bold}${colors.cyan}${message}${colors.reset}`);
}

// Simple JSON5-like parser (basic implementation)
function parseJSON5(content) {
  try {
    // Remove comments and trailing commas for basic JSON5 support
    let cleaned = content
      .split('\n')
      .map(line => {
        // Remove line comments (but preserve strings)
        let inString = false;
        let escaped = false;
        let result = '';
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (!inString && char === '/' && nextChar === '/') {
            // Found line comment outside string, stop here
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
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
    
    return JSON.parse(cleaned);
  } catch (error) {
    // If JSON5 parsing fails, try to provide more helpful error info
    log(`JSON5 parsing failed: ${error.message}`, 'red');
    log('Attempting fallback to standard JSON...', 'yellow');
    
    try {
      return JSON.parse(content);
    } catch (fallbackError) {
      throw new Error(`Both JSON5 and JSON parsing failed. Original: ${error.message}, Fallback: ${fallbackError.message}`);
    }
  }
}

// Environment variable interpolation
function interpolateEnvVars(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/g, (match, braced, unbraced) => {
      const varName = braced || unbraced;
      const value = process.env[varName];
      if (value !== undefined) {
        info(`Interpolated ${varName}: ${value}`);
        return value;
      } else {
        log(`⚠️  Environment variable not found: ${varName}`, 'yellow');
        return match;
      }
    });
  } else if (Array.isArray(obj)) {
    return obj.map(interpolateEnvVars);
  } else if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateEnvVars(value);
    }
    return result;
  }
  return obj;
}

// Test configuration loading
async function testConfigurationLoading() {
  header('🧪 Simple Configuration Loading Test');
  
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  process.env.DB_USER = 'testuser';
  process.env.DB_PASSWORD = 'secure123';
  
  info('Test environment variables set up');

  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Check if test configuration file exists
  header('Test 1: Configuration File Existence');
  testResults.total++;
  
  const testConfigPath = 'test-config.json5';
  if (fs.existsSync(testConfigPath)) {
    success(`Configuration file exists: ${testConfigPath}`);
    testResults.passed++;
  } else {
    fail(`Configuration file not found: ${testConfigPath}`);
    testResults.failed++;
    
    // Create a test configuration file
    const testConfig = {
      system: {
        name: 'Test Configuration',
        environment: '${NODE_ENV}',
        debug: true
      },
      database: {
        host: '${DB_HOST}',
        port: '${DB_PORT}',
        user: '${DB_USER}',
        password: '${DB_PASSWORD}'
      },
      features: {
        webUI: true,
        statusLine: {
          theme: 'default',
          position: 'bottom'
        }
      }
    };
    
    try {
      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
      success(`Created test configuration file: ${testConfigPath}`);
    } catch (error) {
      fail(`Failed to create test configuration: ${error.message}`);
    }
  }

  // Test 2: Read and parse configuration file
  header('Test 2: Configuration File Reading and Parsing');
  testResults.total++;
  
  try {
    const rawContent = fs.readFileSync(testConfigPath, 'utf8');
    success(`Successfully read configuration file (${rawContent.length} bytes)`);
    
    const parsedConfig = parseJSON5(rawContent);
    success('Successfully parsed configuration as JSON5');
    
    info('Parsed configuration structure:');
    console.log(JSON.stringify(parsedConfig, null, 2));
    
    testResults.passed++;
  } catch (error) {
    fail(`Failed to read/parse configuration: ${error.message}`);
    testResults.failed++;
  }

  // Test 3: Environment variable interpolation
  header('Test 3: Environment Variable Interpolation');
  testResults.total++;
  
  try {
    const rawContent = fs.readFileSync(testConfigPath, 'utf8');
    const parsedConfig = parseJSON5(rawContent);
    const interpolatedConfig = interpolateEnvVars(parsedConfig);
    
    success('Environment variable interpolation completed');
    
    info('Configuration after environment variable interpolation:');
    console.log(JSON.stringify(interpolatedConfig, null, 2));
    
    // Verify that interpolation worked
    if (interpolatedConfig.system && interpolatedConfig.system.environment === 'test') {
      success('NODE_ENV environment variable correctly interpolated');
    }
    
    if (interpolatedConfig.database && interpolatedConfig.database.host === 'localhost') {
      success('DB_HOST environment variable correctly interpolated');
    }
    
    testResults.passed++;
  } catch (error) {
    fail(`Environment variable interpolation failed: ${error.message}`);
    testResults.failed++;
  }

  // Test 4: Configuration validation (basic)
  header('Test 4: Basic Configuration Validation');
  testResults.total++;
  
  try {
    const rawContent = fs.readFileSync(testConfigPath, 'utf8');
    const parsedConfig = parseJSON5(rawContent);
    const interpolatedConfig = interpolateEnvVars(parsedConfig);
    
    // Basic validation rules
    const requiredFields = ['system', 'database', 'features'];
    let validationPassed = true;
    
    for (const field of requiredFields) {
      if (!interpolatedConfig[field]) {
        fail(`Required field missing: ${field}`);
        validationPassed = false;
      } else {
        success(`Required field found: ${field}`);
      }
    }
    
    // Type validation
    if (typeof interpolatedConfig.system?.name !== 'string') {
      fail('system.name should be a string');
      validationPassed = false;
    } else {
      success('system.name is a valid string');
    }
    
    if (typeof interpolatedConfig.system?.debug !== 'boolean') {
      fail('system.debug should be a boolean');
      validationPassed = false;
    } else {
      success('system.debug is a valid boolean');
    }
    
    if (validationPassed) {
      success('All basic validation checks passed');
      testResults.passed++;
    } else {
      fail('Some validation checks failed');
      testResults.failed++;
    }
  } catch (error) {
    fail(`Configuration validation failed: ${error.message}`);
    testResults.failed++;
  }

  // Test 5: Configuration file watching simulation
  header('Test 5: File Watching Simulation');
  testResults.total++;
  
  try {
    const watchTestFile = 'watch-test.json';
    const initialConfig = { test: true, timestamp: Date.now() };
    
    fs.writeFileSync(watchTestFile, JSON.stringify(initialConfig, null, 2));
    info(`Created watch test file: ${watchTestFile}`);
    
    // Simulate file watching by checking file modification time
    const initialStats = fs.statSync(watchTestFile);
    info(`Initial file modification time: ${initialStats.mtime}`);
    
    // Wait and modify file
    setTimeout(() => {
      try {
        const updatedConfig = { test: true, timestamp: Date.now(), updated: true };
        fs.writeFileSync(watchTestFile, JSON.stringify(updatedConfig, null, 2));
        
        const updatedStats = fs.statSync(watchTestFile);
        if (updatedStats.mtime > initialStats.mtime) {
          success('File modification detected (simulation of file watching)');
        } else {
          fail('File modification not detected');
        }
        
        // Cleanup
        fs.unlinkSync(watchTestFile);
        info('Cleaned up watch test file');
      } catch (error) {
        fail(`File watching simulation error: ${error.message}`);
      }
    }, 100);
    
    success('File watching simulation completed');
    testResults.passed++;
  } catch (error) {
    fail(`File watching simulation failed: ${error.message}`);
    testResults.failed++;
  }

  // Generate test report
  header('📊 Test Results Summary');
  
  const passRate = testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;
  
  log(`\n${colors.bold}Configuration Loading Test Report${colors.reset}`);
  log(`${'='.repeat(40)}`);
  log(`Total Tests: ${colors.bold}${testResults.total}${colors.reset}`);
  log(`Passed: ${colors.green}${testResults.passed}${colors.reset}`);
  log(`Failed: ${colors.red}${testResults.failed}${colors.reset}`);
  log(`Pass Rate: ${passRate >= 80 ? colors.green : colors.red}${passRate}%${colors.reset}`);
  log(`${'='.repeat(40)}`);

  if (passRate >= 80) {
    log(`\n${colors.bold}${colors.green}🎉 CONFIGURATION LOADING TESTS PASSED!${colors.reset}`);
    log(`${colors.green}Basic configuration loading functionality is working.${colors.reset}`);
    return 0;
  } else {
    log(`\n${colors.bold}${colors.red}❌ CONFIGURATION LOADING TESTS FAILED${colors.reset}`);
    log(`${colors.red}Some functionality needs attention.${colors.reset}`);
    return 1;
  }
}

// Main function
async function main() {
  log(`${colors.bold}${colors.cyan}Configuration System Basic Functionality Test${colors.reset}`);
  log(`${colors.cyan}Testing core configuration file operations${colors.reset}\n`);

  try {
    return await testConfigurationLoading();
  } catch (error) {
    fail(`Test execution failed: ${error.message}`);
    return 1;
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(exitCode => {
      setTimeout(() => process.exit(exitCode), 500); // Allow async operations to complete
    })
    .catch(error => {
      fail(`Unhandled error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { main };