#!/usr/bin/env node

/**
 * Correct Configuration to Pipeline Table Generator
 * Reads ~/.rcc/config.json and generates pipeline-table.json
 * Generates proper pipeline entries for each provider.model.key combination
 */

import fs from 'fs';
import path from 'path';

// Function to generate pipeline table from configuration
function generatePipelineTableFromConfig(config) {
  console.log('Generating pipeline table from configuration...');

  const pipelineTable = new Map();

  // Process each virtual model
  for (const [virtualModelId, virtualModel] of Object.entries(config.virtualModels)) {
    // Process each target in the virtual model
    if (virtualModel.targets && Array.isArray(virtualModel.targets)) {
      virtualModel.targets.forEach((target, targetIndex) => {
        const provider = config.providers[target.providerId];
        if (provider) {
          // Check if the target model exists in provider's models
          if (provider.models && provider.models.includes(target.modelId)) {
            // Create pipeline entries for each API key in the provider
            const apiKeys = Array.isArray(provider.api_key) ? provider.api_key : [provider.api_key];

            apiKeys.forEach((apiKey, keyIndex) => {
              // Create pipeline entry for each provider.model.key combination
              const entry = {
                virtualModelId: virtualModelId,
                targetProvider: target.providerId,
                targetModel: target.modelId,
                keyIndex: keyIndex,
                enabled: true,
                priority: 100 - (targetIndex * 10), // Priority based on target order
                weight: Math.max(1, Math.floor(100 / virtualModel.targets.length)), // Weight distribution
                metadata: {
                  providerType: provider.type || 'unknown',
                  apiKey: apiKey,
                  createdAt: new Date().toISOString()
                }
              };

              // Create a unique key for this entry
              const entryKey = `${virtualModelId}-${target.providerId}-${target.modelId}-${keyIndex}`;
              pipelineTable.set(entryKey, entry);
            });
          }
        }
      });
    }
  }

  console.log('Pipeline table generated with', pipelineTable.size, 'entries');
  return pipelineTable;
}

// Main function
async function main() {
  console.log('=== Correct Configuration to Pipeline Table Generator ===');

  try {
    // Load configuration from default path
    const configPath = path.join(process.env.HOME || '.', '.rcc', 'config.json');
    console.log('Loading configuration from:', configPath);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found at ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    console.log('Configuration loaded successfully');
    console.log('Config version:', config.version);
    console.log('Providers:', Object.keys(config.providers).length);
    console.log('Virtual Models:', Object.keys(config.virtualModels).length);

    // Show provider details
    for (const [providerId, provider] of Object.entries(config.providers)) {
      const apiKeys = Array.isArray(provider.api_key) ? provider.api_key.length : 1;
      const models = Array.isArray(provider.models) ? provider.models.length : 0;
      console.log(`Provider ${providerId}: ${apiKeys} keys, ${models} models`);
    }

    // Generate pipeline table
    const pipelineTable = generatePipelineTableFromConfig(config);

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
      if (count >= 5) break;
    }

    console.log('\n=== Pipeline Table Generation Complete ===');
    return true;

  } catch (error) {
    console.error('Error generating pipeline table:', error);
    return false;
  }
}

// Run the generator
main().then(success => {
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