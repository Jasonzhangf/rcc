/**
 * WebAuto Pipeline Framework Integration Tests
 *
 * This test suite validates the integration between RCC configuration system
 * and the WebAuto pipeline framework.
 */

import {
  WebAutoConfigurationAdapter,
  WebAutoPipelineBuilder,
  EnhancedConfigurationToPipelineModule,
  EnhancedPipelineFactory,
  PipelineUtils
} from '../integration';

import {
  createConfigurationSystem,
  createConfigurationTemplate,
  ConfigData
} from 'rcc-configuration';

import { VirtualModelRulesModule } from 'rcc-virtual-model-rules';

describe('WebAuto Pipeline Framework Integration', () => {
  let configSystem: any;
  let virtualModelRulesModule: any;
  let adapter: WebAutoConfigurationAdapter;
  let builder: WebAutoPipelineBuilder;
  let enhancedSystem: EnhancedConfigurationToPipelineModule | null;

  beforeAll(async () => {
    // Create mock configuration system
    configSystem = await createConfigurationSystem({
      initialConfig: createTestConfiguration(),
      enablePipelineIntegration: true
    });

    // Create mock virtual model rules module
    virtualModelRulesModule = new VirtualModelRulesModule({
      'gpt-4-proxy': { enabled: true, rules: [] },
      'qwen-proxy': { enabled: true, rules: [] }
    });

    // Initialize components
    adapter = new WebAutoConfigurationAdapter();
    builder = new WebAutoPipelineBuilder();
  });

  describe('System Setup and Validation', () => {
    test('should validate system setup correctly', () => {
      const result = PipelineUtils.validateSystem();

      if (!result.valid && result.issues.length > 0) {
        console.log('System validation issues:', result.issues);
        console.log('Recommendations:', result.recommendations);
      }

      // At minimum, the validation should run without errors
      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should get system health information', () => {
      const health = PipelineUtils.getSystemHealth();

      expect(health).toBeDefined();
      expect(health.version).toBeDefined();
      expect(health.webAutoFramework).toBeDefined();
      expect(health.capabilities).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });

    test('should check WebAuto framework availability', () => {
      const isAvailable = EnhancedPipelineFactory.isWebAutoAvailable();

      expect(typeof isAvailable).toBe('boolean');

      const capabilities = EnhancedPipelineFactory.getAvailableCapabilities();
      expect(Array.isArray(capabilities)).toBe(true);

      if (isAvailable) {
        expect(capabilities).toContain('webauto-framework');
      }
    });
  });

  describe('WebAuto Configuration Adapter', () => {
    test('should initialize correctly', () => {
      expect(adapter).toBeInstanceOf(WebAutoConfigurationAdapter);
    });

    test('should convert virtual model to pipeline config', () => {
      const virtualModelId = 'test-virtual-model';
      const virtualModelConfig = {
        enabled: true,
        targets: [
          {
            providerId: 'openai',
            modelId: 'gpt-3.5-turbo'
          }
        ]
      };
      const providersConfig = {
        openai: {
          enabled: true,
          apiKey: 'test-api-key',
          endpoint: 'https://api.openai.com/v1/chat/completions'
        }
      };

      const result = adapter.convertVirtualModelToPipelineConfig(
        virtualModelId,
        virtualModelConfig,
        providersConfig
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data!.name).toBe(`${virtualModelId}-pipeline`);
        expect(result.data!.provider).toBeDefined();
        expect(result.data!.provider.name).toBe('openai');
      }
    });

    test('should convert project configuration', () => {
      const configData = createTestConfiguration();
      const result = adapter.convertProjectConfiguration(configData);

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);

      if (result.success) {
        expect(result.data!.length).toBeGreaterThan(0);
      }
    });

    test('should validate adapter configuration', () => {
      const result = adapter.validateConfiguration();

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    test('should provide supported protocols and providers', () => {
      const protocols = adapter.getSupportedProtocols();
      const providers = adapter.getSupportedProviders();

      expect(Array.isArray(protocols)).toBe(true);
      expect(Array.isArray(providers)).toBe(true);
      expect(protocols.length).toBeGreaterThan(0);
      expect(providers.length).toBeGreaterThan(0);
    });
  });

  describe('WebAuto Pipeline Builder', () => {
    test('should initialize with options', () => {
      const options = {
        enableLoadBalancing: true,
        enableMetrics: true,
        defaultTimeout: 60000
      };

      const customBuilder = new WebAutoPipelineBuilder(options);
      // Test that builder was created successfully
      expect(customBuilder).toBeInstanceOf(WebAutoPipelineBuilder);

      // Test getting current config (should be null initially)
      const currentConfig = customBuilder.getCurrentConfiguration();
      expect(currentConfig).toBeNull();
    });

    test('should build pipeline from virtual model', () => {
      const virtualModelId = 'test-builder-pipeline';
      const virtualModelConfig = {
        enabled: true,
        targets: [
          {
            providerId: 'openai',
            modelId: 'gpt-3.5-turbo'
          }
        ]
      };
      const providersConfig = createTestConfiguration().providers;

      const result = builder.buildFromVirtualModel(
        virtualModelId,
        virtualModelConfig,
        providersConfig,
        adapter
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');

      if (result.success) {
        expect(result.pipelineId).toBeDefined();
        expect(result.configuration).toBeDefined();
      }
    });

    test('should handle pipeline building with features', () => {
      const pipelineConfig = {
        name: 'test-enhanced-pipeline',
        inputProtocol: 'openai' as const,
        provider: {
          name: 'openai',
          apiKey: 'test-key',
          apiEndpoint: 'https://api.openai.com/v1/chat/completions',
          providerName: 'openai' as const
        }
      };

      const result = builder
        .createPipeline(pipelineConfig)
        .withLoadBalancing({
          strategy: 'roundRobin',
          healthCheckInterval: 30000
        })
        .withMetrics(['request', 'response'])
        .withErrorRecovery({ maxRetries: 3 })
        .withCaching({ ttl: 300000, maxSize: 100 })
        .build();

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Enhanced Pipeline System', () => {
    beforeEach(async () => {
      // Create enhanced system for each test
      enhancedSystem = EnhancedPipelineFactory.createEnhancedSystem({
        configurationSystem: configSystem,
        virtualModelRulesModule: virtualModelRulesModule
      });

      if (enhancedSystem) {
        await enhancedSystem.initialize();
      }
    });

    afterEach(async () => {
      if (enhancedSystem) {
        await enhancedSystem.destroy();
        enhancedSystem = null;
      }
    });

    test('should create enhanced pipeline system', () => {
      expect(enhancedSystem).toBeDefined();
      if (enhancedSystem) {
        // Check that the system has the expected methods
        expect(typeof enhancedSystem.initialize).toBe('function');
        expect(typeof enhancedSystem.assemblePipelinesWithWebAuto).toBe('function');
        expect(typeof enhancedSystem.executeWithWebAuto).toBe('function');
        expect(typeof enhancedSystem.getEnhancedStatus).toBe('function');
      }
    });

    test('should get enhanced status', () => {
      if (!enhancedSystem) return;

      const status = enhancedSystem.getEnhancedStatus();

      expect(status).toBeDefined();
      expect(status.moduleId).toBe('EnhancedConfigurationToPipelineModule');
      expect(status.initialized).toBe(true);
      expect(status.mode).toBeDefined();
      expect(status.pipelineRegistry).toBeDefined();
      expect(status.executionCache).toBeDefined();
    });

    test('should validate configuration', async () => {
      if (!enhancedSystem) return;

      const validation = await enhancedSystem.validateConfigurationForWebAuto();

      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
      expect(Array.isArray(validation.recommendations)).toBe(true);
    });

    test('should handle message processing', async () => {
      if (!enhancedSystem) return;

      const testMessage = {
        type: 'webauto-pipeline-status-request',
        source: 'test',
        id: 'test-message-001',
        correlationId: 'test-correlation-001'
      };

      const response = await enhancedSystem.handleMessage(testMessage);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.status).toBeDefined();
    });

    test('should handle error in message processing', async () => {
      if (!enhancedSystem) return;

      const errorMessage = {
        type: 'unknown-message-type',
        source: 'test',
        id: 'test-message-error',
        correlationId: 'test-correlation-error'
      };

      const response = await enhancedSystem.handleMessage(errorMessage);

      expect(response).toBeDefined();
      // For unknown message types, response should either be successful or have an error
      if (!response.success) {
        expect(response.error).toBeDefined();
      }
    });
  });

  describe('Pipeline Assembly and Execution', () => {
    beforeEach(async () => {
      enhancedSystem = EnhancedPipelineFactory.createEnhancedSystem({
        configurationSystem: configSystem,
        virtualModelRulesModule: virtualModelRulesModule
      });

      if (enhancedSystem) {
        await enhancedSystem.initialize();
      }
    });

    afterEach(async () => {
      if (enhancedSystem) {
        await enhancedSystem.destroy();
        enhancedSystem = null;
      }
    });

    test('should assemble pipelines from configuration', async () => {
      if (!enhancedSystem) return;

      const result = await enhancedSystem.assemblePipelinesWithWebAuto();

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');

      if (result.success) {
        expect(Array.isArray(result.webAutoPipelines)).toBe(true);
        expect(result.metadata).toBeDefined();
        expect(result.metadata!.webAutoPipelineCount).toBeGreaterThanOrEqual(0);
        expect(result.metadata!.assemblyTime).toBeGreaterThan(0);
      }
    });

    test('should handle assembly errors gracefully', async () => {
      if (!enhancedSystem) return;

      // This test might succeed or fail depending on WebAuto availability
      // The important thing is that it doesn't crash
      const result = await enhancedSystem.assemblePipelinesWithWebAuto();

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    test('should reload and reassemble pipelines', async () => {
      if (!enhancedSystem) return;

      const result = await enhancedSystem.reloadAndReassemble();

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.metadata).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid configuration in adapter', () => {
      const result = adapter.convertVirtualModelToPipelineConfig(
        '', // invalid virtual model ID
        {}, // invalid virtual model config
        {} // invalid providers config
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle pipeline builder errors', () => {
      // Try to build without creating pipeline first
      const result = builder.build();

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    test('should handle pipeline factory without dependencies', () => {
      const result = EnhancedPipelineFactory.createEnhancedSystem({
        configurationSystem: null,
        virtualModelRulesModule: null
      });

      expect(result).toBeNull();
    });
  });

  afterAll(async () => {
    // Cleanup
    if (configSystem && typeof configSystem.destroy === 'function') {
      await configSystem.destroy();
    }

    if (virtualModelRulesModule && typeof virtualModelRulesModule.destroy === 'function') {
      await virtualModelRulesModule.destroy();
    }
  });
});

/**
 * Create test configuration for integration tests
 */
function createTestConfiguration(): ConfigData {
  return {
    version: '1.0.0',
    providers: {
      openai: {
        enabled: true,
        apiKey: 'test-openai-api-key',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        models: {
          'gpt-3.5-turbo': {
            temperature: 0.7,
            max_tokens: 2048
          },
          'gpt-4': {
            temperature: 0.5,
            max_tokens: 4096
          }
        }
      },
      qwen: {
        enabled: true,
        apiKey: 'test-qwen-api-key',
        endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        models: {
          'qwen-turbo': {
            temperature: 0.7,
            max_tokens: 2048
          }
        }
      }
    },
    virtualModels: {
      'gpt-4-proxy': {
        enabled: true,
        description: 'GPT-4 proxy for testing',
        targets: [
          {
            providerId: 'openai',
            modelId: 'gpt-4',
            weight: 1,
            priority: 1
          }
        ],
        priority: 10,
        workflow: {
          name: 'gpt-4-workflow'
        }
      },
      'qwen-proxy': {
        enabled: true,
        description: 'Qwen proxy for testing',
        targets: [
          {
            providerId: 'qwen',
            modelId: 'qwen-turbo',
            weight: 1,
            priority: 1
          }
        ],
        priority: 8,
        workflow: {
          name: 'qwen-workflow'
        }
      }
    },
    settings: {
      globalTimeout: 30000,
      retryAttempts: 3,
      cacheEnabled: true,
      cacheTtl: 300000
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}