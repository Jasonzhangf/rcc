#!/usr/bin/env ts-node

/**
 * Debug script to test the extractConfigurationPaths function
 * from the RCC Configuration module.
 */

// Use direct path to the function since we're running from project root
import { extractConfigurationPaths } from './sharedmodule/Configuration/src/index';

// Import the sample configuration directly
import * as sampleConfig from './sharedmodule/Configuration/src/test-config.json';

console.log('=== Configuration Paths Debug Script ===\n');

console.log('Sample configuration loaded:');
console.log(JSON.stringify(sampleConfig, null, 2));

console.log('\n=== Extracted Configuration Paths ===\n');

const paths = extractConfigurationPaths(sampleConfig);
console.log('Total paths found:', paths.length);
console.log('\nPaths:');
paths.forEach((path, index) => {
  console.log(`${index + 1}. ${path}`);
});

// Let's also demonstrate getting specific values
console.log('\n=== Sample Path Value Retrieval ===\n');
const samplePaths = [
  'version',
  'providers.openai-test.name',
  'providers.openai-test.models.gpt-4.name',
  'virtualModels.default.targetModel',
  'createdAt'
];

samplePaths.forEach(path => {
  // We'd need the getConfigurationValue function for this, but let's just show the path structure
  console.log(`Path: ${path}`);
});

console.log('\n=== Debug Script Complete ===');