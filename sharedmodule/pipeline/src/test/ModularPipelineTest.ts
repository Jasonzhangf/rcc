/**
 * Modular Pipeline Integration Test
 * Tests the complete modular pipeline architecture
 */

import { ModuleFactory } from '../core/ModuleFactory';
import { ModularPipelineExecutor } from '../core/ModularPipelineExecutor';
import { ConfigurationValidator } from '../core/ConfigurationValidator';
import { PipelineWrapper } from '../interfaces/ModularInterfaces';
import { LLMSwitchModule } from '../modules/LLMSwitchModule';
import { WorkflowModule } from '../modules/WorkflowModule';
import { CompatibilityModule } from '../modules/CompatibilityModule';
import { ProviderModule } from '../modules/ProviderModule';
import { BaseProvider } from '../framework/BaseProvider';

/**
 * Mock Provider for testing
 */
class MockProvider extends BaseProvider {
  async executeChat(providerRequest: any): Promise<any> {
    // Mock implementation
    return {
      id: 'mock-response-' + Date.now(),
      object: 'chat.completion',
      created: Date.now(),
      model: 'mock-model',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'Mock response from provider'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    };
  }

  async *executeStreamChat(providerRequest: any): AsyncGenerator<any, void, unknown> {
    // Mock streaming implementation
    const chunks = [
      { id: 'chunk-1', choices: [{ delta: { content: 'Hello' } }] },
      { id: 'chunk-2', choices: [{ delta: { content: ' from' } }] },
      { id: 'chunk-3', choices: [{ delta: { content: ' mock' } }] },
      { id: 'chunk-4', choices: [{ delta: { content: ' provider' } }] }
    ];

    for (const chunk of chunks) {
      yield chunk;
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    }
  }
}

/**
 * Test configuration
 */
const testConfig: PipelineWrapper = {
  id: 'test-pipeline',
  name: 'Test Modular Pipeline',
  version: '1.0.0',
  type: 'pipeline',
  description: 'Test pipeline for modular architecture',
    modules: {
    llmswitch: {
      enabled: true,
      config: {
        protocolConversion: {
          enabled: true,
          defaultProtocol: 'openai'
        },
        intelligentRouting: {
          enabled: true,
          routingStrategy: 'smart'
        }
      }
    },
    workflow: {
      enabled: true,
      config: {
        streaming: {
          enabled: true,
          chunkSize: 1000
        },
        requestProcessing: {
          maxConcurrentRequests: 5,
          timeout: 30000
        }
      }
    },
    compatibility: {
      enabled: true,
      config: {
        fieldMapping: {
          enabled: true,
          mappings: {
            'openai-to-mock': {
              request: {
                'messages': 'inputs',
                'model': 'model_name'
              },
              response: {
                'choices': 'outputs',
                'usage': 'token_usage'
              }
            }
          }
        }
      }
    },
    provider: {
      enabled: true,
      config: {
        streamingEnabled: true,
        requestTimeout: 30000,
        retryAttempts: 3
      }
    }
  }
};

/**
 * Test suite for modular pipeline
 */
class ModularPipelineTest {
  private moduleFactory: ModuleFactory;
  private executor: ModularPipelineExecutor;
  private validator: ConfigurationValidator;

  constructor() {
    this.moduleFactory = new ModuleFactory();
    this.executor = new ModularPipelineExecutor();
    this.validator = new ConfigurationValidator();
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Modular Pipeline Integration Tests...\n');

    try {
      await this.testConfigurationValidation();
      await this.testModuleFactory();
      await this.testLLMSwitchModule();
      await this.testWorkflowModule();
      await this.testCompatibilityModule();
      await this.testProviderModule();
      await this.testCompletePipeline();

      console.log('✅ All tests passed successfully!');
    } catch (error) {
      console.error('❌ Tests failed:', error);
      throw error;
    }
  }

  /**
   * Test configuration validation
   */
  private async testConfigurationValidation(): Promise<void> {
    console.log('🔍 Testing Configuration Validation...');

    // Test valid configuration
    const validationResult = await this.validator.validatePipelineConfiguration(testConfig);
    if (!validationResult.isValid) {
      throw new Error(`Configuration validation failed: ${validationResult.errors.join(', ')}`);
    }

    console.log('✅ Configuration validation passed');
  }

  /**
   * Test module factory
   */
  private async testModuleFactory(): Promise<void> {
    console.log('🏭 Testing Module Factory...');

    const registeredTypes = this.moduleFactory.getRegisteredModuleTypes();
    const expectedTypes = ['llmswitch', 'workflow', 'compatibility', 'provider'];

    for (const type of expectedTypes) {
      if (!registeredTypes.includes(type)) {
        throw new Error(`Module type '${type}' not registered in factory`);
      }
    }

    console.log('✅ Module factory registered all required types:', registeredTypes);
  }

  /**
   * Test LLMSwitch module
   */
  private async testLLMSwitchModule(): Promise<void> {
    console.log('🔄 Testing LLMSwitch Module...');

    const llmswitch = await this.moduleFactory.createLLMSwitch({
      id: 'test-llmswitch',
      name: 'Test LLMSwitch',
      version: '1.0.0',
      type: 'llmswitch'
    });

    // Test protocol conversion
    const request = { model: 'test-model', messages: [{ role: 'user', content: 'Hello' }] };
    const convertedRequest = await llmswitch.convertRequest(request, 'openai', 'mock', {
      request: { ...request },
      modules: {}
    });

    if (!convertedRequest || typeof convertedRequest !== 'object') {
      throw new Error('LLMSwitch request conversion failed');
    }

    console.log('✅ LLMSwitch module working correctly');
  }

  /**
   * Test Workflow module
   */
  private async testWorkflowModule(): Promise<void> {
    console.log('⚡ Testing Workflow Module...');

    const workflow = await this.moduleFactory.createWorkflowModule({
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      type: 'workflow'
    });

    // Test streaming detection
    const streamingContext = await workflow.createStreamingContext({
      request: { stream: true },
      modules: {}
    });

    if (!streamingContext.isStreaming) {
      throw new Error('Workflow streaming detection failed');
    }

    console.log('✅ Workflow module working correctly');
  }

  /**
   * Test Compatibility module
   */
  private async testCompatibilityModule(): Promise<void> {
    console.log('🔧 Testing Compatibility Module...');

    const compatibility = await this.moduleFactory.createCompatibilityModule({
      id: 'test-compatibility',
      name: 'Test Compatibility',
      version: '1.0.0',
      type: 'compatibility'
    });

    // Test field mapping
    const request = { messages: [{ role: 'user', content: 'Hello' }] };
    const mappedRequest = await compatibility.mapRequest(request, 'mock-provider', {
      request: { ...request },
      modules: {}
    });

    if (!mappedRequest || typeof mappedRequest !== 'object') {
      throw new Error('Compatibility request mapping failed');
    }

    console.log('✅ Compatibility module working correctly');
  }

  /**
   * Test Provider module
   */
  private async testProviderModule(): Promise<void> {
    console.log('🌐 Testing Provider Module...');

    const mockProvider = new MockProvider({
      name: 'mock-provider',
      endpoint: 'https://mock-api.example.com'
    });

    const provider = await this.moduleFactory.createProviderModule({
      id: 'test-provider',
      name: 'Test Provider',
      version: '1.0.0',
      type: 'provider',
      provider: mockProvider
    });

    // Test provider capabilities
    const capabilities = provider.getCapabilities();
    if (!capabilities || typeof capabilities !== 'object') {
      throw new Error('Provider capabilities retrieval failed');
    }

    console.log('✅ Provider module working correctly');
  }

  /**
   * Test complete pipeline
   */
  private async testCompletePipeline(): Promise<void> {
    console.log('🚀 Testing Complete Modular Pipeline...');

    // Create modules
    const mockProvider = new MockProvider({
      name: 'mock-provider',
      endpoint: 'https://mock-api.example.com'
    });

    const modules = {
      llmswitch: await this.moduleFactory.createLLMSwitch({
        id: 'test-llmswitch',
        name: 'Test LLMSwitch',
        version: '1.0.0',
        type: 'llmswitch'
      }),
      workflow: await this.moduleFactory.createWorkflowModule({
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        type: 'workflow'
      }),
      compatibility: await this.moduleFactory.createCompatibilityModule({
        id: 'test-compatibility',
        name: 'Test Compatibility',
        version: '1.0.0',
        type: 'compatibility'
      }),
      provider: await this.moduleFactory.createProviderModule({
        id: 'test-provider',
        name: 'Test Provider',
        version: '1.0.0',
        type: 'provider',
        provider: mockProvider
      })
    };

    // Test request execution
    const testRequest = {
      model: 'test-model',
      messages: [{ role: 'user', content: 'Hello from test!' }]
    };

    const response = await this.executor.executeRequest(
      testRequest,
      testConfig,
      modules
    );

    if (!response || !response.id || !response.choices) {
      throw new Error('Complete pipeline request execution failed');
    }

    console.log('✅ Complete modular pipeline working correctly');
    console.log(`   - Response ID: ${response.id}`);
    console.log(`   - Model: ${response.model}`);
    console.log(`   - Choices: ${response.choices.length}`);
  }
}

/**
 * Run the test suite
 */
async function runModularPipelineTests(): Promise<void> {
  const testSuite = new ModularPipelineTest();
  await testSuite.runAllTests();
}

// Export for external use
export { ModularPipelineTest, runModularPipelineTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runModularPipelineTests()
    .then(() => {
      console.log('\n🎉 Modular Pipeline Integration Tests Completed Successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Modular Pipeline Integration Tests Failed:', error);
      process.exit(1);
    });
}