/**
 * Jest Test Setup for RCC Pipeline Modules
 *
 * This file sets up the testing environment for all pipeline module tests
 */

import { ModuleFactory } from '../src/core/ModuleFactory';
import { ConfigurationValidator } from '../src/core/ConfigurationValidator';
import { ModularPipelineExecutor } from '../src/core/ModularPipelineExecutor';
import { PipelineWrapper, ModuleConfig } from '../src/interfaces/ModularInterfaces';

// Mock rcc-basemodule for testing
jest.mock('rcc-basemodule', () => ({
  ModuleInfo: class {
    constructor(
      public id: string,
      public name: string,
      public version: string,
      public type: string,
      public description?: string
    ) {}
  },
  BaseModule: class {
    protected moduleId: string;
    protected moduleName: string;
    protected moduleVersion: string;

    constructor(moduleInfo: any) {
      this.moduleId = moduleInfo.id;
      this.moduleName = moduleInfo.name;
      this.moduleVersion = moduleInfo.version;
    }

    async initialize(): Promise<void> {}
    async destroy(): Promise<void> {}
    logInfo(message: string, data?: any, operation?: string): void {
      console.log(`[${this.moduleId}] ${message}`, data);
    }
    error(message: string, error: Error, operation?: string): void {
      console.error(`[${this.moduleId}] ${message}`, error);
    }
  }
}));

// Mock uuid for consistent test results
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}));

// Global test utilities
export const createTestPipelineWrapper = (): PipelineWrapper => ({
  virtualModels: [
    {
      id: 'test-virtual-model',
      name: 'Test Virtual Model',
      description: 'Test virtual model for unit tests',
      targets: [
        {
          providerId: 'test-provider',
          weight: 1,
          fallback: false
        }
      ],
      capabilities: ['chat', 'streaming'],
      tags: ['test']
    }
  ],
  modules: [
    {
      id: 'test-llmswitch',
      name: 'Test LLMSwitch',
      type: 'llmswitch',
      version: '1.0.0',
      config: {
        protocolConversion: {
          enabled: true,
          defaultProtocol: 'openai'
        }
      },
      enabled: true
    },
    {
      id: 'test-workflow',
      name: 'Test Workflow',
      type: 'workflow',
      version: '1.0.0',
      config: {
        streaming: {
          enabled: true,
          chunkSize: 1000
        }
      },
      enabled: true
    },
    {
      id: 'test-compatibility',
      name: 'Test Compatibility',
      type: 'compatibility',
      version: '1.0.0',
      config: {
        fieldMapping: {
          enabled: true,
          mappings: {
            'openai-to-test': {
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
      },
      enabled: true
    },
    {
      id: 'test-provider',
      name: 'Test Provider',
      type: 'provider',
      version: '1.0.0',
      config: {
        endpoint: 'https://api.test.com/v1/chat/completions',
        models: ['test-model'],
        authentication: {
          type: 'bearer',
          apiKey: 'test-key'
        },
        capabilities: {
          streaming: true,
          functions: true,
          vision: false,
          maxTokens: 4096
        }
      },
      enabled: true
    }
  ],
  routing: {
    strategy: 'round-robin',
    fallbackStrategy: 'random',
    rules: []
  },
  metadata: {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    description: 'Test pipeline wrapper for unit tests'
  }
});

export const createTestRequest = () => ({
  model: 'test-model',
  messages: [
    {
      role: 'user',
      content: 'Hello, this is a test request'
    }
  ],
  temperature: 0.7,
  max_tokens: 1000
});

export const createStreamingTestRequest = () => ({
  model: 'test-model',
  messages: [
    {
      role: 'user',
      content: 'Hello, this is a streaming test request'
    }
  ],
  temperature: 0.7,
  max_tokens: 1000,
  stream: true
});

// Test timeout configuration
export const TEST_TIMEOUT = 30000;

// Performance test configuration
export const PERFORMANCE_TEST_CONFIG = {
  iterations: 100,
  concurrency: 10,
  timeoutMs: 10000
};

// Error test utilities
export const expectError = async (asyncFn: () => Promise<any>, expectedMessage: string) => {
  try {
    await asyncFn();
    fail('Expected function to throw an error');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(expectedMessage);
  }
};

// Async test utilities
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const createMockModuleConfig = (type: string, config: any = {}): ModuleConfig => ({
  id: `test-${type}`,
  name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
  type,
  version: '1.0.0',
  config: {
    ...config,
    enabled: true
  },
  enabled: true
});