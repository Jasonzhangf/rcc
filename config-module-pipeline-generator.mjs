#!/usr/bin/env node

/**
 * Configuration Module Pipeline Table Generator
 * Uses the actual ConfigurationToPipelineModule to generate pipeline table
 * from ~/.rcc/config.json and saves to ~/.rcc/pipeline/pipeline-table.json
 */

import fs from 'fs';
import path from 'path';

// Dynamically import the configuration module
async function generatePipelineTableWithConfigModule() {
  console.log('=== Configuration Module Pipeline Table Generator ===');

  try {
    // Load configuration from default path
    const configPath = path.join(process.env.HOME || '.', '.rcc', 'config.json');
    console.log('Loading configuration from:', configPath);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found at ${configPath}`);
    }

    // Load raw config JSON
    const configContent = fs.readFileSync(configPath, 'utf8');
    const rawConfig = JSON.parse(configContent);

    console.log('Configuration loaded successfully');
    console.log('Config version:', rawConfig.version);
    console.log('Providers:', Object.keys(rawConfig.providers).length);
    console.log('Virtual Models:', Object.keys(rawConfig.virtualModels).length);

    // Show provider details
    for (const [providerId, provider] of Object.entries(rawConfig.providers)) {
      const apiKeys = Array.isArray(provider.api_key) ? provider.api_key.length : 1;
      const models = Array.isArray(provider.models) ? provider.models.length : 0;
      console.log(`Provider ${providerId}: ${apiKeys} keys, ${models} models`);
    }

    // Filter out virtual models with no targets
    const filteredVirtualModels = {};
    for (const [vmId, vmConfig] of Object.entries(rawConfig.virtualModels)) {
      if (vmConfig.targets && vmConfig.targets.length > 0) {
        filteredVirtualModels[vmId] = vmConfig;
      } else {
        console.log(`Skipping virtual model ${vmId} - no targets configured`);
      }
    }

    // Create a new config with filtered virtual models
    const filteredConfig = {
      ...rawConfig,
      virtualModels: filteredVirtualModels
    };

    // Import the built configuration module
    const configModulePath = path.join(process.cwd(), 'sharedmodule', 'Configuration', 'dist', 'index.esm.js');
    console.log('Importing configuration module from:', configModulePath);

    const configModule = await import(configModulePath);
    const { ConfigurationSystem, ConfigurationToPipelineModule } = configModule;

    // Create a minimal configuration system instance
    const configSystem = new ConfigurationSystem();

    // Initialize without config first
    await configSystem.initialize();

    // Load configuration from file using the configuration system
    const loadedConfig = await configSystem.loadConfiguration(configPath);

    // Create a mock pipeline assembler (we don't need actual assembly, just the config parsing)
    const mockPipelineAssembler = {
      assemble: async () => ({}),
      activate: async () => {},
      deactivate: async () => {},
      getActivePipeline: () => null
    };

    // Create a mock virtual model rules module
    const mockVirtualModelRulesModule = {
      initialize: async () => {},
      destroy: async () => {}
    };

    // Create the ConfigurationToPipelineModule instance with relaxed validation
    const configToPipelineModule = new ConfigurationToPipelineModule(
      configSystem,
      mockPipelineAssembler,
      mockVirtualModelRulesModule,
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

    // Parse virtual model mappings from configuration using the raw config
    const mappings = await configToPipelineModule.parseVirtualModelMappings(filteredConfig);
    console.log('Parsed virtual model mappings:', mappings.length);

    // Generate pipeline table from mappings
    const pipelineTable = await configToPipelineModule.generatePipelineTable(mappings);
    console.log('Generated pipeline table with', pipelineTable.size, 'entries');

    // Convert the pipeline table to our required format using the raw config
    const pipelineEntries = [];
    for (const [virtualModelId, pipelineConfig] of pipelineTable.entries()) {
      // Find the virtual model in our original config
      const vmConfig = filteredConfig.virtualModels[virtualModelId];
      if (vmConfig && vmConfig.targets) {
        vmConfig.targets.forEach((target, targetIndex) => {
          const provider = filteredConfig.providers[target.providerId];
          if (provider) {
            // Create pipeline entries for each API key in the provider
            const apiKeys = Array.isArray(provider.api_key) ? provider.api_key : [provider.api_key];

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
      configVersion: rawConfig.version || 'unknown',
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