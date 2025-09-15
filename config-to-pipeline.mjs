#!/usr/bin/env node

/**
 * Standalone Configuration to Pipeline Table Generator
 * Reads ~/.rcc/config.json and generates pipeline-table.json
 */

import { createConfigurationSystem } from './sharedmodule/Configuration/dist/index.esm.js';
import fs from 'fs';
import path from 'path';

async function generatePipelineTable() {
  console.log('=== Configuration to Pipeline Table Generator ===');

  try {
    // Create configuration system
    console.log('Creating configuration system...');
    const configSystem = await createConfigurationSystem({
      id: 'pipeline-generator',
      name: 'Pipeline Table Generator',
      enablePipelineIntegration: true
    });

    console.log('Configuration system created successfully');

    // Load configuration from default path
    const configPath = path.join(process.env.HOME || '.', '.rcc', 'config.json');
    console.log('Loading configuration from:', configPath);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found at ${configPath}`);
    }

    const config = await configSystem.loadConfiguration(configPath);
    console.log('Configuration loaded successfully');
    console.log('Config version:', config.version);
    console.log('Providers:', Object.keys(config.providers).length);
    console.log('Virtual Models:', Object.keys(config.virtualModels).length);

    // Generate pipeline table
    console.log('Generating pipeline table...');
    const pipelineTable = await configSystem.generatePipelineTable();
    console.log('Pipeline table generated successfully');
    console.log('Pipeline entries:', pipelineTable.size);

    // Save pipeline table to file
    console.log('Saving pipeline table to file...');
    const pipelineDir = path.join(process.env.HOME || '.', '.rcc', 'pipeline');

    // Create directory if it doesn't exist
    if (!fs.existsSync(pipelineDir)) {
      console.log('Creating pipeline directory:', pipelineDir);
      fs.mkdirSync(pipelineDir, { recursive: true });
    }

    // Convert Map to array for JSON serialization
    const pipelineArray = Array.from(pipelineTable.entries()).map(([key, value]) => ({
      key,
      ...value
    }));

    // Create pipeline table config object
    const pipelineTableConfig = {
      entries: pipelineArray,
      generatedAt: new Date().toISOString(),
      configVersion: config.version || 'unknown',
      entryCount: pipelineTable.size
    };

    // Save to file
    const pipelineFilePath = path.join(pipelineDir, 'pipeline-table.json');
    console.log('Saving to:', pipelineFilePath);
    fs.writeFileSync(pipelineFilePath, JSON.stringify(pipelineTableConfig, null, 2));
    console.log('Pipeline table saved to file successfully');

    // Show sample entries
    console.log('\nSample pipeline entries:');
    let count = 0;
    for (const [key, value] of pipelineTable.entries()) {
      console.log(`  ${key}:`, JSON.stringify(value, null, 2));
      count++;
      if (count >= 3) break;
    }

    console.log('\n=== Pipeline Table Generation Complete ===');
    return true;

  } catch (error) {
    console.error('Error generating pipeline table:', error);
    return false;
  }
}

// Run the generator
generatePipelineTable().then(success => {
  if (success) {
    console.log('Pipeline table generation completed successfully');
    process.exit(0);
  } else {
    console.error('Pipeline table generation failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});