#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to validate module API registry structure
function validateModuleApiRegistry(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const apiRegistry = JSON.parse(content);
    
    const errors = [];
    const warnings = [];
    
    // Check required root structure
    if (!apiRegistry.module_apis) {
      errors.push('Missing "module_apis" object');
      return {
        valid: false,
        errors: errors,
        warnings: warnings
      };
    }
    
    // Validate each module API
    const moduleNames = Object.keys(apiRegistry.module_apis);
    
    if (moduleNames.length === 0) {
      errors.push('No modules found in registry');
    }
    
    for (const moduleName of moduleNames) {
      const moduleApi = apiRegistry.module_apis[moduleName];
      
      // Check required module fields
      if (!moduleApi.module) {
        errors.push(`Module ${moduleName}: Missing "module" object`);
      } else {
        if (!moduleApi.module.name) {
          errors.push(`Module ${moduleName}: Missing module.name`);
        }
        if (!moduleApi.module.description) {
          errors.push(`Module ${moduleName}: Missing module.description`);
        }
        if (!moduleApi.module.version) {
          errors.push(`Module ${moduleName}: Missing module.version`);
        }
        if (!moduleApi.module.basePath) {
          errors.push(`Module ${moduleName}: Missing module.basePath`);
        }
      }
      
      // Check endpoints
      if (!moduleApi.endpoints) {
        errors.push(`Module ${moduleName}: Missing "endpoints" array`);
      } else if (!Array.isArray(moduleApi.endpoints)) {
        errors.push(`Module ${moduleName}: "endpoints" should be an array`);
      } else {
        moduleApi.endpoints.forEach((endpoint, index) => {
          if (!endpoint.name) {
            errors.push(`Module ${moduleName}, Endpoint ${index}: Missing name`);
          }
          if (!endpoint.description) {
            errors.push(`Module ${moduleName}, Endpoint ${index}: Missing description`);
          }
          if (!endpoint.method) {
            errors.push(`Module ${moduleName}, Endpoint ${index}: Missing method`);
          }
          if (!endpoint.path) {
            errors.push(`Module ${moduleName}, Endpoint ${index}: Missing path`);
          }
          if (!endpoint.returnType) {
            errors.push(`Module ${moduleName}, Endpoint ${index}: Missing returnType`);
          }
          if (!endpoint.access) {
            errors.push(`Module ${moduleName}, Endpoint ${index}: Missing access`);
          }
          
          // Validate method
          const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
          if (endpoint.method && !validMethods.includes(endpoint.method)) {
            errors.push(`Module ${moduleName}, Endpoint ${index}: Invalid method "${endpoint.method}". Should be one of: ${validMethods.join(', ')}`);
          }
          
          // Validate access
          const validAccess = ['public', 'protected', 'private'];
          if (endpoint.access && !validAccess.includes(endpoint.access)) {
            errors.push(`Module ${moduleName}, Endpoint ${index}: Invalid access "${endpoint.access}". Should be one of: ${validAccess.join(', ')}`);
          }
          
          // Check parameters
          if (endpoint.parameters) {
            if (!Array.isArray(endpoint.parameters)) {
              errors.push(`Module ${moduleName}, Endpoint ${index}: "parameters" should be an array`);
            } else {
              endpoint.parameters.forEach((param, paramIndex) => {
                if (!param.name) {
                  errors.push(`Module ${moduleName}, Endpoint ${index}, Parameter ${paramIndex}: Missing name`);
                }
                if (!param.type) {
                  errors.push(`Module ${moduleName}, Endpoint ${index}, Parameter ${paramIndex}: Missing type`);
                }
                if (!param.description) {
                  errors.push(`Module ${moduleName}, Endpoint ${index}, Parameter ${paramIndex}: Missing description`);
                }
              });
            }
          }
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${error.message}`],
      warnings: []
    };
  }
}

// Function to check consistency between registry and module implementations
function checkRegistryConsistency(registryPath) {
  const PROJECT_ROOT = path.join(__dirname, '..');
  const MODULES_PATH = path.join(PROJECT_ROOT, 'src', 'modules');
  const API_REGISTRY_PATH = path.join(PROJECT_ROOT, '.claude', 'module-api-registry.json');
  
  const errors = [];
  const warnings = [];
  
  try {
    // Load registry
    const registryContent = fs.readFileSync(API_REGISTRY_PATH, 'utf8');
    const apiRegistry = JSON.parse(registryContent);
    
    // Check if modules directory exists
    if (!fs.existsSync(MODULES_PATH)) {
      warnings.push('Modules directory not found');
      return { errors, warnings };
    }
    
    // Get all modules (both directories and single files)
    const modules = fs.readdirSync(MODULES_PATH)
      .filter(item => {
        const itemPath = path.join(MODULES_PATH, item);
        const stat = fs.statSync(itemPath);
        // Include directories and .ts files (but not test files)
        return stat.isDirectory() || (stat.isFile() && item.endsWith('.ts') && !item.endsWith('.test.ts'));
      });
    
    // Check 1: Every module in registry should have corresponding implementation
    console.log('\n📋 Checking registry-to-implementation consistency...');
    
    for (const [moduleName, moduleSpec] of Object.entries(apiRegistry.module_apis)) {
      // Skip BaseModule as it's a base class, not a module implementation
      if (moduleName === 'BaseModule') {
        continue;
      }
      
      // Special handling for modules in specific locations
      let moduleExists = false;
      let modulePath = '';
      
      // Check common locations where modules might be found
      const possiblePaths = [
        path.join(MODULES_PATH, `${moduleName}.ts`), // Single file module
        path.join(MODULES_PATH, moduleName, `src`, `${moduleName}.ts`), // Directory with src structure
        path.join(MODULES_PATH, 'debug', 'src', `${moduleName}.ts`), // Debug module
        path.join(MODULES_PATH, 'Configuration', 'src', `${moduleName}.ts`), // Configuration modules
        path.join(MODULES_PATH, 'StatusLine', 'src', `${moduleName}.ts`), // StatusLine module
        path.join(PROJECT_ROOT, 'src', 'core', `${moduleName}.ts`), // Core modules
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          moduleExists = true;
          modulePath = possiblePath;
          break;
        }
      }
      
      if (!moduleExists) {
        errors.push(`Module "${moduleName}" exists in registry but implementation not found in expected locations`);
      }
    }
    
    // Check 2: Every module implementation should be in registry
    console.log('📋 Checking implementation-to-registry consistency...');
    
    // Check file modules
    const fileModules = modules.filter(module => module.endsWith('.ts'));
    for (const moduleName of fileModules) {
      
      const actualModuleName = moduleName.replace('.ts', '');
      if (!apiRegistry.module_apis[actualModuleName]) {
        errors.push(`Module "${actualModuleName}" exists in implementation but not registered in API registry`);
      }
    }
    
    // Check directory modules
    const dirModules = modules.filter(module => !module.endsWith('.ts'));
    for (const moduleName of dirModules) {
      const modulePath = path.join(MODULES_PATH, moduleName);
      
      // Special handling for modules with src subdirectory
      if (moduleName === 'Configuration' || moduleName === 'StatusLine' || moduleName === 'debug') {
        const srcPath = path.join(modulePath, 'src');
        if (fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory()) {
          // Get the actual module name from the file
          const tsFiles = fs.readdirSync(srcPath).filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'));
          for (const tsFile of tsFiles) {
            const actualModuleName = tsFile.replace('.ts', '');
            if (!apiRegistry.module_apis[actualModuleName]) {
              errors.push(`Module "${actualModuleName}" exists in implementation but not registered in API registry`);
            }
          }
        }
      } else if (fs.statSync(modulePath).isDirectory()) {
        // For other directory modules, check if they have .ts files directly
        const hasTsFiles = fs.readdirSync(modulePath)
          .some(file => file.endsWith('.ts') && !file.endsWith('.d.ts') && !file.endsWith('.test.ts'));
        
        if (hasTsFiles && !apiRegistry.module_apis[moduleName]) {
          errors.push(`Module "${moduleName}" exists in implementation but not registered in API registry`);
        }
      }
    }
    
    // Special handling for core modules
    const corePath = path.join(PROJECT_ROOT, 'src', 'core');
    if (fs.existsSync(corePath)) {
      const coreFiles = fs.readdirSync(corePath).filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'));
      for (const coreFile of coreFiles) {
        const actualModuleName = coreFile.replace('.ts', '');
        // Only check UnderConstruction since BaseModule is already handled
        if (actualModuleName === 'UnderConstruction' && !apiRegistry.module_apis[actualModuleName]) {
          errors.push(`Module "${actualModuleName}" exists in implementation but not registered in API registry`);
        }
      }
    }
    
  } catch (error) {
    errors.push(`Failed to check registry consistency: ${error.message}`);
  }
  
  return { errors, warnings };
}

// Main function
function main() {
  const registryPath = path.join(__dirname, '..', '.claude', 'module-api-registry.json');
  
  console.log('Validating module API registry and consistency...\n');
  
  if (!fs.existsSync(registryPath)) {
    console.log('Module API registry not found at:', registryPath);
    process.exit(1);
  }
  
  // Validate registry format
  console.log('🔍 Validating API registry format...');
  const result = validateModuleApiRegistry(registryPath);
  
  // Check consistency
  console.log('🔍 Validating API registry consistency...');
  const consistencyResult = checkRegistryConsistency(registryPath);
  
  // Combine results
  const allErrors = [...result.errors, ...consistencyResult.errors];
  const allWarnings = [...result.warnings, ...consistencyResult.warnings];
  
  if (allErrors.length === 0 && allWarnings.length === 0) {
    console.log('✅ Module API registry format and consistency validation passed\n');
    console.log('Found modules:');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const moduleNames = Object.keys(registry.module_apis).filter(name => name !== 'BaseModule');
    moduleNames.forEach(name => {
      console.log(`  - ${name}`);
    });
  } else {
    if (allWarnings.length > 0) {
      console.log('⚠️  Warnings:');
      allWarnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
    }
    
    if (allErrors.length > 0) {
      console.log('\n❌ Module API registry validation failed');
      allErrors.forEach(error => {
        console.log(`  - ${error}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ Registry format is valid, but there are warnings above');
    }
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  validateModuleApiRegistry,
  checkRegistryConsistency
};