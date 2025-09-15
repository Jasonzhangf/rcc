/**
 * Environment Variable Substitution Tests
 *
 * Tests to verify that environment variable substitution works correctly
 * in the configuration loading pipeline.
 */

import { ConfigurationModule } from '../src/core/ConfigurationModule';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as fsExtra from 'fs-extra';

describe('Environment Variable Substitution', () => {
  let configModule: ConfigurationModule;
  let tempDir: string;
  let tempConfigPath: string;

  beforeEach(() => {
    configModule = new ConfigurationModule({
      configPath: './test-config.json',
      autoLoad: false
    });
    tempDir = path.join(os.tmpdir(), 'rcc-env-var-test');
    tempConfigPath = path.join(tempDir, 'test-config-with-env-vars.json');
  });

  afterEach(async () => {
    // Clean up environment variables
    delete process.env.TEST_PROVIDER_ENDPOINT;
    delete process.env.TEST_API_KEY;
    delete process.env.TEST_MODEL_NAME;

    // Clean up test files
    if (tempDir && await fileExists(tempDir)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }

    // Clean up module
    if (configModule) {
      await configModule.destroy();
    }
  });

  // Helper function to check if file exists
  async function fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  test('should substitute environment variables when loading configuration', async () => {
    // Set up test environment variables
    process.env.TEST_PROVIDER_ENDPOINT = 'https://api.test.com/v1';
    process.env.TEST_API_KEY = 'test-api-key-123';
    process.env.TEST_MODEL_NAME = 'Test Model Override';

    // Create a config with environment variable placeholders
    const configWithEnvVars = {
      version: '1.0.0',
      providers: {
        'test-provider': {
          name: 'Test Provider',
          type: 'openai',
          endpoint: '${TEST_PROVIDER_ENDPOINT}',
          auth: {
            type: 'api-key',
            keys: ['${TEST_API_KEY}']
          },
          models: {
            'test-model': {
              name: '${TEST_MODEL_NAME}',
              contextLength: 4096
            }
          }
        }
      },
      virtualModels: {
        'test-vm': {
          targets: [{
            providerId: 'test-provider',
            modelId: 'test-model',
            keyIndex: 0
          }],
          enabled: true,
          priority: 1
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Write config to temporary file
    await fs.mkdir(tempDir, { recursive: true });
    await fsExtra.writeJson(tempConfigPath, configWithEnvVars, { spaces: 2 });

    // Initialize configuration module
    await configModule.initialize();

    // Load configuration from file
    const loadedConfig = await configModule.loadConfiguration(tempConfigPath);

    // Verify environment variables were substituted
    expect(loadedConfig.providers['test-provider'].endpoint).toBe('https://api.test.com/v1');
    expect(loadedConfig.providers['test-provider'].auth.keys[0]).toBe('test-api-key-123');
    expect(loadedConfig.providers['test-provider'].models['test-model'].name).toBe('Test Model Override');
  });

  test('should handle missing environment variables gracefully', async () => {
    // Set only some environment variables
    process.env.TEST_PROVIDER_ENDPOINT = 'https://api.test.com/v1';
    // Leave TEST_API_KEY and TEST_MODEL_NAME unset

    // Create a config with environment variable placeholders
    const configWithEnvVars = {
      version: '1.0.0',
      providers: {
        'test-provider': {
          name: 'Test Provider',
          type: 'openai',
          endpoint: '${TEST_PROVIDER_ENDPOINT}',
          auth: {
            type: 'api-key',
            keys: ['${TEST_API_KEY}'] // This will remain as-is since env var is not set
          },
          models: {
            'test-model': {
              name: '${TEST_MODEL_NAME}', // This will remain as-is since env var is not set
              contextLength: 4096
            }
          }
        }
      },
      virtualModels: {
        'test-vm': {
          targets: [{
            providerId: 'test-provider',
            modelId: 'test-model',
            keyIndex: 0
          }],
          enabled: true,
          priority: 1
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Write config to temporary file
    await fs.mkdir(tempDir, { recursive: true });
    await fsExtra.writeJson(tempConfigPath, configWithEnvVars, { spaces: 2 });

    // Initialize configuration module
    await configModule.initialize();

    // Load configuration from file
    const loadedConfig = await configModule.loadConfiguration(tempConfigPath);

    // Verify set environment variables were substituted
    expect(loadedConfig.providers['test-provider'].endpoint).toBe('https://api.test.com/v1');

    // Verify unset environment variables remain as placeholders
    expect(loadedConfig.providers['test-provider'].auth.keys[0]).toBe('${TEST_API_KEY}');
    expect(loadedConfig.providers['test-provider'].models['test-model'].name).toBe('${TEST_MODEL_NAME}');
  });
});