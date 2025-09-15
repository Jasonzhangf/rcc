#!/usr/bin/env node

/**
 * Decoupled Configuration Module Pipeline Table Generator
 * Uses the decoupled ConfigurationToPipelineModule to generate pipeline table
 * from ~/.rcc/config.json and saves to ~/.rcc/pipeline/pipeline-table.json
 */

import fs from 'fs';
import path from 'path';

// Import the configuration system and decoupled module from the main entry point
import { ConfigurationSystem, DecoupledConfigurationToPipelineModule } from './sharedmodule/Configuration/dist/index.esm.js';

async function generatePipelineTableWithDecoupledConfigModule() {
  console.log('=== Decoupled Configuration Module Pipeline Table Generator ===');

  try {
    // Load configuration from default path
    const configPath = path.join(process.env.HOME || '.', '.rcc', 'config.json');
    console.log('Loading configuration from:', configPath);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found at ${configPath}`);
    }

    // Create configuration system instance
    const configSystem = new ConfigurationSystem();
    await configSystem.initialize();

    // Load configuration
    const config = await configSystem.loadConfiguration(configPath);
    console.log('Configuration loaded successfully');

    // Filter out virtual models with no targets
    const filteredVirtualModels = {};
    for (const [vmId, vmConfig] of Object.entries(config.virtualModels)) {
      if (vmConfig.targets && vmConfig.targets.length > 0) {
        filteredVirtualModels[vmId] = vmConfig;
      } else {
        console.log(`Skipping virtual model ${vmId} - no targets configured`);
      }
    }

    // Create a new config with filtered virtual models
    const filteredConfig = {
      ...config,
      virtualModels: filteredVirtualModels
    };

    // Create the decoupled ConfigurationToPipelineModule instance
    const decoupledConfigToPipelineModule = new DecoupledConfigurationToPipelineModule({
      enabled: true,
      fixedVirtualModels: [
        'default',
        'longcontext',
        'thinking',
        'background',
        'websearch',
        'vision',
        'coding'
      ],
      validation: {
        strict: false,
        failOnError: false,
        warnOnUnknown: true
      }
    });

    // Initialize the decoupled config to pipeline module
    await decoupledConfigToPipelineModule.initialize();

    // Parse virtual model mappings from configuration using decoupled module
    const mappings = decoupledConfigToPipelineModule.parseVirtualModelMappings(filteredConfig);
    console.log('Parsed virtual model mappings:', mappings.length);

    // Generate pipeline table from mappings using decoupled module
    const pipelineTable = decoupledConfigToPipelineModule.generatePipelineTable(mappings, filteredConfig);
    console.log('Generated pipeline table with', pipelineTable.size, 'virtual models');

    // Convert the pipeline table to our required format
    const pipelineEntries = [];
    for (const [virtualModelId, entries] of pipelineTable.entries()) {
      pipelineEntries.push(...entries);
    }

    // Save pipeline table to file
    console.log('Saving pipeline table to file...');
    const pipelineDir = path.join(process.env.HOME || '.', '.rcc', 'pipeline');

    // Create directory if it doesn't exist
    if (!fs.existsSync(pipelineDir)) {
      console.log('Creating pipeline directory:', pipelineDir);
      fs.mkdirSync(pipelineDir, { recursive: true });
    }

    // Create pipeline table config object
    const pipelineTableConfig = {
      entries: pipelineEntries,
      generatedAt: new Date().toISOString(),
      configVersion: filteredConfig.version || 'unknown',
      entryCount: pipelineEntries.length
    };

    // Save to file
    const pipelineFilePath = path.join(pipelineDir, 'pipeline-table.json');
    console.log('Saving to:', pipelineFilePath);
    fs.writeFileSync(pipelineFilePath, JSON.stringify(pipelineTableConfig, null, 2));
    console.log('Pipeline table saved to file successfully');

    // Show sample entries
    console.log('\nSample pipeline entries:');
    pipelineEntries.slice(0, 5).forEach(entry => {
      console.log(`  ${entry.virtualModelId}: ${entry.targetProvider}/${entry.targetModel} (key ${entry.keyIndex})`);
    });

    console.log('\n=== Pipeline Table Generation Complete ===');
    return true;
  } catch (error) {
    console.error('Error generating pipeline table:', error);
    return false;
  }
}

// Run the generator
generatePipelineTableWithDecoupledConfigModule().then(success => {
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