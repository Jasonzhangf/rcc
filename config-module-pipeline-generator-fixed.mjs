#!/usr/bin/env node

/**
 * Configuration Module Pipeline Table Generator (Fixed Version)
 * Uses the actual ConfigurationModule to generate pipeline table
 * from ~/.rcc/config.json and saves to ~/.rcc/pipeline/pipeline-table.json
 */

import fs from 'fs';
import path from 'path';

// Import the actual configuration module
import { ConfigurationSystem } from './sharedmodule/Configuration/src/core/ConfigurationSystem.js';
import { ConfigurationToPipelineModule } from './sharedmodule/Configuration/src/integration/ConfigurationToPipelineModule.js';
import { PipelineAssembler } from './sharedmodule/pipeline/src/assembler/PipelineAssembler.js';
import { VirtualModelRulesModule } from './sharedmodule/Configuration/src/core/VirtualModelRulesModule.js';

async function generatePipelineTableWithConfigModule() {
  console.log('=== Configuration Module Pipeline Table Generator (Fixed) ===');

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

    // Create actual dependencies
    const pipelineAssembler = new PipelineAssembler();
    const virtualModelRulesModule = new VirtualModelRulesModule();
    await virtualModelRulesModule.initialize();

    // Create the ConfigurationToPipelineModule instance with actual dependencies
    const configToPipelineModule = new ConfigurationToPipelineModule(
      configSystem,
      pipelineAssembler,
      virtualModelRulesModule,
      {
        enabled: true,
        strategy: 'static',
        cache: {
          enabled: false,
          ttl: 0,
          maxSize: 0
        },
        validation: {
          strict: false,  // Relaxed validation
          failOnError: false,  // Don't fail on validation errors
          warnOnUnknown: true
        }
      }
    );

    // Initialize the config to pipeline module
    await configToPipelineModule.initialize();

    // Parse virtual model mappings from configuration
    const mappings = await configToPipelineModule.parseVirtualModelMappings(filteredConfig);
    console.log('Parsed virtual model mappings:', mappings.length);

    // Generate pipeline table from mappings
    const pipelineTable = await configToPipelineModule.generatePipelineTable(mappings);
    console.log('Generated pipeline table with', pipelineTable.size, 'entries');

    // Convert the pipeline table to our required format
    const pipelineEntries = [];
    for (const [virtualModelId, pipelineConfig] of pipelineTable.entries()) {
      // Find the virtual model in our original config
      const vmConfig = filteredConfig.virtualModels[virtualModelId];
      if (vmConfig && vmConfig.targets) {
        vmConfig.targets.forEach((target, targetIndex) => {
          const provider = filteredConfig.providers[target.providerId];
          if (provider) {
            // Create pipeline entries for each API key in the provider
            const apiKeys = Array.isArray(provider.auth?.keys) ? provider.auth.keys :
                           (provider.auth?.keys ? [provider.auth.keys] : []);

            if (apiKeys.length > 0) {
              apiKeys.forEach((apiKey, keyIndex) => {
                // Create pipeline entry for each provider.model.key combination
                const entry = {
                  key: `${virtualModelId}-${target.providerId}-${target.modelId}-${keyIndex}`,
                  virtualModelId: virtualModelId,
                  targetProvider: target.providerId,
                  targetModel: target.modelId,
                  keyIndex: keyIndex,
                  enabled: true,
                  priority: 100 - (targetIndex * 10), // Priority based on target order
                  weight: Math.max(1, Math.floor(100 / vmConfig.targets.length)), // Weight distribution
                  metadata: {
                    providerType: provider.type || 'unknown',
                    apiKey: apiKey,
                    createdAt: new Date().toISOString()
                  }
                };

                pipelineEntries.push(entry);
              });
            } else {
              // If no API keys, create entry with empty key
              const entry = {
                key: `${virtualModelId}-${target.providerId}-${target.modelId}-0`,
                virtualModelId: virtualModelId,
                targetProvider: target.providerId,
                targetModel: target.modelId,
                keyIndex: 0,
                enabled: true,
                priority: 100 - (targetIndex * 10), // Priority based on target order
                weight: Math.max(1, Math.floor(100 / vmConfig.targets.length)), // Weight distribution
                metadata: {
                  providerType: provider.type || 'unknown',
                  apiKey: '',
                  createdAt: new Date().toISOString()
                }
              };

              pipelineEntries.push(entry);
            }
          }
        });
      }
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
      console.log(`  ${entry.key}: ${entry.targetProvider}/${entry.targetModel} (key ${entry.keyIndex})`);
    });

    console.log('\n=== Pipeline Table Generation Complete ===');
    return true;
  } catch (error) {
    console.error('Error generating pipeline table:', error);
    return false;
  }
}

// Run the generator
generatePipelineTableWithConfigModule().then(success => {
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