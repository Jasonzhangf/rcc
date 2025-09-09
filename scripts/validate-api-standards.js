#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to validate API standards file structure
function validateApiStandards(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const apiStandards = JSON.parse(content);
    
    const errors = [];
    
    // Check required module fields
    if (!apiStandards.module) {
      errors.push('Missing "module" object');
    } else {
      if (!apiStandards.module.name) {
        errors.push('Missing module.name');
      }
      if (!apiStandards.module.description) {
        errors.push('Missing module.description');
      }
      if (!apiStandards.module.version) {
        errors.push('Missing module.version');
      }
      if (!apiStandards.module.basePath) {
        errors.push('Missing module.basePath');
      }
    }
    
    // Check endpoints
    if (!apiStandards.endpoints) {
      errors.push('Missing "endpoints" array');
    } else if (!Array.isArray(apiStandards.endpoints)) {
      errors.push('"endpoints" should be an array');
    } else {
      apiStandards.endpoints.forEach((endpoint, index) => {
        if (!endpoint.name) {
          errors.push(`Endpoint ${index}: Missing name`);
        }
        if (!endpoint.description) {
          errors.push(`Endpoint ${index}: Missing description`);
        }
        if (!endpoint.method) {
          errors.push(`Endpoint ${index}: Missing method`);
        }
        if (!endpoint.path) {
          errors.push(`Endpoint ${index}: Missing path`);
        }
        if (!endpoint.returnType) {
          errors.push(`Endpoint ${index}: Missing returnType`);
        }
        if (!endpoint.access) {
          errors.push(`Endpoint ${index}: Missing access`);
        }
        
        // Validate method
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE'];
        if (endpoint.method && !validMethods.includes(endpoint.method)) {
          errors.push(`Endpoint ${index}: Invalid method "${endpoint.method}". Should be one of: ${validMethods.join(', ')}`);
        }
        
        // Validate access
        const validAccess = ['public', 'protected', 'private'];
        if (endpoint.access && !validAccess.includes(endpoint.access)) {
          errors.push(`Endpoint ${index}: Invalid access "${endpoint.access}". Should be one of: ${validAccess.join(', ')}`);
        }
        
        // Check parameters
        if (endpoint.parameters) {
          if (!Array.isArray(endpoint.parameters)) {
            errors.push(`Endpoint ${index}: "parameters" should be an array`);
          } else {
            endpoint.parameters.forEach((param, paramIndex) => {
              if (!param.name) {
                errors.push(`Endpoint ${index}, Parameter ${paramIndex}: Missing name`);
              }
              if (!param.type) {
                errors.push(`Endpoint ${index}, Parameter ${paramIndex}: Missing type`);
              }
              if (!param.description) {
                errors.push(`Endpoint ${index}, Parameter ${paramIndex}: Missing description`);
              }
            });
          }
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${error.message}`]
    };
  }
}

// Function to find all API standards files
function findApiStandardsFiles(dir) {
  const apiFiles = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        traverse(itemPath);
      } else if (item === 'api-standards.json') {
        apiFiles.push(itemPath);
      }
    }
  }
  
  traverse(dir);
  return apiFiles;
}

// Main function
function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  
  console.log('Validating API standards files...\n');
  
  const apiFiles = findApiStandardsFiles(srcDir);
  
  if (apiFiles.length === 0) {
    console.log('No API standards files found.');
    return;
  }
  
  let validCount = 0;
  let invalidCount = 0;
  
  for (const apiFile of apiFiles) {
    console.log(`Validating ${apiFile}...`);
    const result = validateApiStandards(apiFile);
    
    if (result.valid) {
      console.log('  ✓ Valid\n');
      validCount++;
    } else {
      console.log('  ✗ Invalid');
      result.errors.forEach(error => {
        console.log(`    - ${error}`);
      });
      console.log('');
      invalidCount++;
    }
  }
  
  console.log(`Validation complete: ${validCount} valid, ${invalidCount} invalid`);
}

// Run the script
if (require.main === module) {
  main();
}