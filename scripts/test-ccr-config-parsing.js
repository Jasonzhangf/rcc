#!/usr/bin/env node

/**
 * Claude Code Router Configuration Parsing Test
 * 
 * This script tests parsing the real claude-code-router configuration file
 * using our RCC Configuration System modules.
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

// Configuration file path
const CONFIG_FILE = '/Users/fanzhang/.claude-code-router/config.json';

// Mock ConfigLoaderModule for testing
class CCRConfigLoader {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    success('ConfigLoaderModule initialized');
  }

  async loadFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    const rawContent = fs.readFileSync(filePath, 'utf8');
    const parsedContent = JSON.parse(rawContent);

    return {
      raw: rawContent,
      parsed: parsedContent,
      validated: false,
      metadata: {
        filePath,
        fileSize: rawContent.length,
        lastModified: fs.statSync(filePath).mtime,
        version: parsedContent.version || 'unknown',
        loadTime: Date.now()
      }
    };
  }

  extractProviders(config) {
    return config.Providers || [];
  }

  extractRouterConfig(config) {
    return config.Router || {};
  }

  extractStatusLineConfig(config) {
    return config.StatusLine || {};
  }

  analyzeConfiguration(config) {
    const analysis = {
      providerCount: (config.Providers || []).length,
      models: [],
      transformers: [],
      routerRules: Object.keys(config.Router || {}).length,
      statusLineEnabled: config.StatusLine?.enabled || false,
      features: []
    };

    // Extract all models
    if (config.Providers) {
      config.Providers.forEach(provider => {
        if (provider.models) {
          analysis.models.push(...provider.models.map(model => ({
            provider: provider.name,
            model: model
          })));
        }
        
        // Extract transformers
        if (provider.transformer) {
          Object.keys(provider.transformer).forEach(model => {
            analysis.transformers.push({
              provider: provider.name,
              model: model,
              transforms: provider.transformer[model].use || []
            });
          });
        }
      });
    }

    // Detect features
    if (config.LOG) analysis.features.push('logging');
    if (config.PROXY_URL) analysis.features.push('proxy');
    if (config.transformers && config.transformers.length > 0) analysis.features.push('transformers');
    if (config.StatusLine?.enabled) analysis.features.push('statusLine');

    return analysis;
  }
}

// Mock ConfigValidatorModule for testing
class CCRConfigValidator {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    success('ConfigValidatorModule initialized');
  }

  validateCCRConfig(config) {
    const errors = [];
    const warnings = [];

    // Required fields validation
    const requiredFields = ['HOST', 'PORT', 'APIKEY'];
    for (const field of requiredFields) {
      if (!config[field]) {
        errors.push(`Required field missing: ${field}`);
      }
    }

    // Type validation
    if (config.PORT && typeof config.PORT !== 'number') {
      errors.push('PORT must be a number');
    }
    if (config.LOG !== undefined && typeof config.LOG !== 'boolean') {
      errors.push('LOG must be a boolean');
    }
    if (config.API_TIMEOUT_MS && isNaN(parseInt(config.API_TIMEOUT_MS))) {
      warnings.push('API_TIMEOUT_MS should be a number');
    }

    // Provider validation
    if (!config.Providers || !Array.isArray(config.Providers)) {
      errors.push('Providers must be an array');
    } else {
      config.Providers.forEach((provider, index) => {
        if (!provider.name) {
          errors.push(`Provider ${index}: name is required`);
        }
        if (!provider.api_base_url) {
          errors.push(`Provider ${index}: api_base_url is required`);
        }
        if (!provider.api_key) {
          errors.push(`Provider ${index}: api_key is required`);
        }
        if (!provider.models || !Array.isArray(provider.models)) {
          errors.push(`Provider ${index}: models must be an array`);
        }
      });
    }

    // Router validation
    if (config.Router) {
      if (!config.Router.default) {
        warnings.push('Router.default is not configured');
      }
      if (config.Router.longContextThreshold && typeof config.Router.longContextThreshold !== 'number') {
        errors.push('Router.longContextThreshold must be a number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: config
    };
  }

  validateProviderConnection(provider) {
    const errors = [];
    
    // Basic connectivity validation (mock)
    if (!provider.api_base_url.startsWith('http')) {
      errors.push(`Invalid API base URL: ${provider.api_base_url}`);
    }
    
    if (!provider.api_key || provider.api_key === 'your-api-key') {
      errors.push(`Invalid API key for provider: ${provider.name}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      provider: provider.name
    };
  }
}

// Test functions
async function testConfigurationLoading() {
  header('📂 Testing Claude Code Router Configuration Loading');

  const loader = new CCRConfigLoader();
  await loader.initialize();

  try {
    info(`Loading configuration from: ${CONFIG_FILE}`);
    
    const configData = await loader.loadFromFile(CONFIG_FILE);
    success(`Configuration loaded successfully (${configData.metadata.fileSize} bytes)`);
    
    info('Configuration metadata:');
    console.log(JSON.stringify(configData.metadata, null, 2));
    
    return configData;
  } catch (error) {
    fail(`Configuration loading failed: ${error.message}`);
    throw error;
  }
}

async function testConfigurationValidation(configData) {
  header('✅ Testing Configuration Validation');

  const validator = new CCRConfigValidator();
  await validator.initialize();

  try {
    const validationResult = validator.validateCCRConfig(configData.parsed);
    
    if (validationResult.isValid) {
      success('Configuration validation passed');
    } else {
      warning(`Configuration validation failed with ${validationResult.errors.length} errors`);
      validationResult.errors.forEach(error => {
        log(`  • ${error}`, 'red');
      });
    }

    if (validationResult.warnings.length > 0) {
      warning(`Configuration has ${validationResult.warnings.length} warnings:`);
      validationResult.warnings.forEach(warning => {
        log(`  • ${warning}`, 'yellow');
      });
    }

    return validationResult;
  } catch (error) {
    fail(`Configuration validation failed: ${error.message}`);
    throw error;
  }
}

async function testConfigurationAnalysis(configData) {
  header('🔍 Testing Configuration Analysis');

  const loader = new CCRConfigLoader();
  
  try {
    const analysis = loader.analyzeConfiguration(configData.parsed);
    
    success('Configuration analysis completed');
    
    info('Configuration Analysis Results:');
    log(`  Providers: ${analysis.providerCount}`, 'cyan');
    log(`  Total Models: ${analysis.models.length}`, 'cyan');
    log(`  Models with Transformers: ${analysis.transformers.length}`, 'cyan');
    log(`  Router Rules: ${analysis.routerRules}`, 'cyan');
    log(`  Status Line Enabled: ${analysis.statusLineEnabled}`, 'cyan');
    log(`  Features: ${analysis.features.join(', ') || 'none'}`, 'cyan');

    // Display providers
    info('Providers Configuration:');
    configData.parsed.Providers?.forEach(provider => {
      log(`  • ${provider.name}: ${provider.models?.length || 0} models`, 'magenta');
      provider.models?.forEach(model => {
        log(`    - ${model}`, 'white');
      });
    });

    // Display router configuration
    info('Router Configuration:');
    Object.entries(configData.parsed.Router || {}).forEach(([key, value]) => {
      if (typeof value === 'string') {
        log(`  • ${key}: ${value}`, 'yellow');
      } else {
        log(`  • ${key}: ${JSON.stringify(value)}`, 'yellow');
      }
    });

    return analysis;
  } catch (error) {
    fail(`Configuration analysis failed: ${error.message}`);
    throw error;
  }
}

async function testProviderValidation(configData) {
  header('🔌 Testing Provider Connection Validation');

  const validator = new CCRConfigValidator();
  
  try {
    const providers = configData.parsed.Providers || [];
    const results = [];

    for (const provider of providers) {
      info(`Validating provider: ${provider.name}`);
      
      const validationResult = validator.validateProviderConnection(provider);
      
      if (validationResult.isValid) {
        success(`Provider ${provider.name} validation passed`);
      } else {
        warning(`Provider ${provider.name} validation issues:`);
        validationResult.errors.forEach(error => {
          log(`  • ${error}`, 'red');
        });
      }
      
      results.push(validationResult);
    }

    const validProviders = results.filter(r => r.isValid).length;
    const totalProviders = results.length;
    
    info(`Provider validation summary: ${validProviders}/${totalProviders} providers valid`);
    
    return results;
  } catch (error) {
    fail(`Provider validation failed: ${error.message}`);
    throw error;
  }
}

async function testStatusLineConfiguration(configData) {
  header('📊 Testing Status Line Configuration');

  const loader = new CCRConfigLoader();
  
  try {
    const statusLineConfig = loader.extractStatusLineConfig(configData.parsed);
    
    info('Status Line Configuration:');
    console.log(JSON.stringify(statusLineConfig, null, 2));
    
    if (statusLineConfig.enabled) {
      success('Status Line is enabled');
      
      const styles = Object.keys(statusLineConfig).filter(key => 
        key !== 'enabled' && key !== 'currentStyle'
      );
      info(`Available styles: ${styles.join(', ')}`);
      
      if (statusLineConfig.currentStyle) {
        info(`Current style: ${statusLineConfig.currentStyle}`);
      }
    } else {
      warning('Status Line is disabled');
    }

    return statusLineConfig;
  } catch (error) {
    fail(`Status Line configuration test failed: ${error.message}`);
    throw error;
  }
}

// Generate comprehensive test report
function generateTestReport(results) {
  header('📊 Claude Code Router Configuration Test Report');
  
  const { configData, validationResult, analysis, providerValidation, statusLineConfig } = results;
  
  log(`\n${colors.bold}Configuration Parsing Test Report${colors.reset}`);
  log(`${'='.repeat(50)}`);
  
  // Basic info
  log(`Configuration File: ${colors.cyan}${CONFIG_FILE}${colors.reset}`);
  log(`File Size: ${colors.cyan}${configData.metadata.fileSize} bytes${colors.reset}`);
  log(`Load Time: ${colors.cyan}${new Date(configData.metadata.loadTime).toLocaleString()}${colors.reset}`);
  
  // Validation results
  log(`\nValidation Results:`);
  log(`  Status: ${validationResult.isValid ? colors.green + 'VALID' : colors.red + 'INVALID'}${colors.reset}`);
  log(`  Errors: ${colors.red}${validationResult.errors.length}${colors.reset}`);
  log(`  Warnings: ${colors.yellow}${validationResult.warnings.length}${colors.reset}`);
  
  // Configuration analysis
  log(`\nConfiguration Analysis:`);
  log(`  Providers: ${colors.cyan}${analysis.providerCount}${colors.reset}`);
  log(`  Models: ${colors.cyan}${analysis.models.length}${colors.reset}`);
  log(`  Transformers: ${colors.cyan}${analysis.transformers.length}${colors.reset}`);
  log(`  Router Rules: ${colors.cyan}${analysis.routerRules}${colors.reset}`);
  
  // Provider validation
  const validProviders = providerValidation.filter(p => p.isValid).length;
  log(`  Valid Providers: ${colors.cyan}${validProviders}/${analysis.providerCount}${colors.reset}`);
  
  // Status line
  log(`  Status Line: ${statusLineConfig.enabled ? colors.green + 'Enabled' : colors.yellow + 'Disabled'}${colors.reset}`);
  
  log(`${'='.repeat(50)}`);
  
  if (validationResult.isValid && validProviders > 0) {
    log(`\n${colors.bold}${colors.green}🎉 CONFIGURATION PARSING TEST PASSED!${colors.reset}`);
    log(`${colors.green}Claude Code Router configuration is valid and properly parsed.${colors.reset}`);
    return 0;
  } else {
    log(`\n${colors.bold}${colors.red}⚠️  CONFIGURATION PARSING TEST COMPLETED WITH ISSUES${colors.reset}`);
    log(`${colors.yellow}Configuration was parsed but has validation issues.${colors.reset}`);
    return 1;
  }
}

// Main test execution
async function main() {
  log(`${colors.bold}${colors.cyan}Claude Code Router Configuration Parsing Test${colors.reset}`);
  log(`${colors.cyan}Testing real claude-code-router configuration file parsing${colors.reset}\n`);

  try {
    // Test configuration loading
    const configData = await testConfigurationLoading();
    
    // Test configuration validation
    const validationResult = await testConfigurationValidation(configData);
    
    // Test configuration analysis
    const analysis = await testConfigurationAnalysis(configData);
    
    // Test provider validation
    const providerValidation = await testProviderValidation(configData);
    
    // Test status line configuration
    const statusLineConfig = await testStatusLineConfiguration(configData);
    
    // Generate comprehensive report
    return generateTestReport({
      configData,
      validationResult,
      analysis,
      providerValidation,
      statusLineConfig
    });

  } catch (error) {
    fail(`Test execution failed: ${error.message}`);
    return 1;
  }
}

// Show usage
function showUsage() {
  log("Usage: node scripts/test-ccr-config-parsing.js [options]");
  log("");
  log("Options:");
  log("  -h, --help     Show this help message");
  log("  -v, --verbose  Enable verbose output");
  log("");
  log("This script tests parsing the claude-code-router configuration file.");
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