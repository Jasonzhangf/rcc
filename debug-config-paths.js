/**
 * JavaScript debug script to test configuration path extraction.
 * This version implements the extractConfigurationPaths function directly
 * to avoid import issues.
 */

const fs = require('fs');
const path = require('path');

// Direct implementation of extractConfigurationPaths function
function extractConfigurationPaths(config, prefix = '') {
  const paths = [];
  
  for (const key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      paths.push(currentPath);
      
      if (config[key] && typeof config[key] === 'object' && !Array.isArray(config[key])) {
        paths.push(...extractConfigurationPaths(config[key], currentPath));
      }
    }
  }
  
  return paths;
}

console.log('=== Configuration Paths Debug Script ===\n');

try {
  // Load the sample configuration directly
  const configPath = path.join(__dirname, 'sharedmodule', 'Configuration', 'src', 'test-config.json');
  const fileContent = fs.readFileSync(configPath, 'utf-8');
  const sampleConfig = JSON.parse(fileContent);

  console.log('Sample configuration loaded:');
  // Log just a portion of the config to keep output manageable
  console.log('Version:', sampleConfig.version);
  console.log('Providers:', Object.keys(sampleConfig.providers));
  console.log('Virtual Models:', Object.keys(sampleConfig.virtualModels));

  console.log('\n=== Extracted Configuration Paths ===\n');

  const paths = extractConfigurationPaths(sampleConfig);
  console.log('Total paths found:', paths.length);
  console.log('\nPaths:');
  paths.forEach((path, index) => {
    console.log(`${index + 1}. ${path}`);
  });

  console.log('\n=== Debug Script Complete ===');
} catch (error) {
  console.error('Error in debug script:', error);
}