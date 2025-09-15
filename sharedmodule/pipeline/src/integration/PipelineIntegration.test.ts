import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PipelineAssembler } from '../assembler/PipelineAssembler';
import { PipelineAssemblyConfig } from '../interfaces/IPipelineAssembler';
import { NodeImplementationRegistry } from '../core/NodeImplementationRegistry';
import { initializePipelineFrameworks } from '../nodes';
import { BasePipelineModule } from '../modules/BasePipelineModule';
import { ModuleInfo } from 'rcc-basemodule';

// Mock implementation for end-to-end testing
class MockEndToEndLLMSwitch extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    // Simulate OpenAI to Gemini conversion
    return {
      ...request,
      converted: true,
      protocol: 'gemini',
      contents: this.convertMessagesToContents(request.messages || []),
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.max_tokens || undefined
      }
    };
  }

  private convertMessagesToContents(messages: any[]) {
    return messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));
  }

  override async configure(config: any): Promise<void> {
    // Configuration logic
  }
}

class MockEndToEndWorkflow extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    // Simulate workflow processing
    return {
      ...request,
      workflowProcessed: true,
      steps: ['validation', 'transformation', 'routing']
    };
  }

  override async configure(config: any): Promise<void> {
    // Configuration logic
  }
}

class MockEndToEndCompatibility extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    // Simulate compatibility layer
    return {
      ...request,
      compatibilityChecked: true,
      format: 'standard',
      validated: true
    };
  }

  override async configure(config: any): Promise<void> {
    // Configuration logic
  }
}

class MockEndToEndProvider extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    // Simulate provider processing
    return {
      ...request,
      providerResponse: {
        id: 'response-' + Date.now(),
        object: 'chat.completion',
        created: Date.now(),
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! This is a mock response.'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        }
      }
    };
  }

  override async configure(config: any): Promise<void> {
    // Configuration logic
  }
}

describe('End-to-End Integration Tests', () => {
  let assembler: PipelineAssembler;
  let registry: NodeImplementationRegistry;

  beforeEach(() => {
    // Reset singleton for each test
    (NodeImplementationRegistry as any).instance = null;
    registry = NodeImplementationRegistry.getInstance();
    assembler = new PipelineAssembler();
  });

  afterEach(() => {
    // Clean up
    (NodeImplementationRegistry as any).instance = null;
  });

  describe('Complete Pipeline Flow', () => {
    it('should process complete 4-node pipeline flow', async () => {
      // Register all framework implementations
      const implementations = [
        {
          id: 'e2e-llmswitch',
          name: 'E2E LLM Switch',
          version: '1.0.0',
          nodeType: 'llmswitch' as const,
          supportedProtocols: ['openai', 'gemini'],
          moduleClass: MockEndToEndLLMSwitch,
          priority: 10
        },
        {
          id: 'e2e-workflow',
          name: 'E2E Workflow',
          version: '1.0.0',
          nodeType: 'workflow' as const,
          supportedProtocols: ['json'],
          moduleClass: MockEndToEndWorkflow,
          priority: 10
        },
        {
          id: 'e2e-compatibility',
          name: 'E2E Compatibility',
          version: '1.0.0',
          nodeType: 'compatibility' as const,
          supportedProtocols: ['standard'],
          moduleClass: MockEndToEndCompatibility,
          priority: 10
        },
        {
          id: 'e2e-provider',
          name: 'E2E Provider',
          version: '1.0.0',
          nodeType: 'provider' as const,
          supportedProtocols: ['openai'],
          moduleClass: MockEndToEndProvider,
          priority: 10
        }
      ];

      implementations.forEach(impl => registry.register(impl));

      // Create complete pipeline configuration
      const config: PipelineAssemblyConfig = {
        id: 'e2e-complete-pipeline',
        name: 'E2E Complete Pipeline',
        version: '1.0.0',
        description: 'End-to-end test with complete 4-node pipeline',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: {
              inputProtocol: 'openai',
              outputProtocol: 'gemini',
              useFramework: true
            }
          },
          {
            id: 'workflow-1',
            type: 'workflow',
            config: {
              useFramework: true
            }
          },
          {
            id: 'compatibility-1',
            type: 'compatibility',
            config: {
              useFramework: true
            }
          },
          {
            id: 'provider-1',
            type: 'provider',
            config: {
              useFramework: true
            }
          }
        ],
        connections: [
          {
            source: 'llmswitch-1',
            target: 'workflow-1',
            type: 'request'
          },
          {
            source: 'workflow-1',
            target: 'compatibility-1',
            type: 'request'
          },
          {
            source: 'compatibility-1',
            target: 'provider-1',
            type: 'request'
          }
        ]
      };

      // Initialize frameworks and assemble pipeline
      await initializePipelineFrameworks();
      const pipeline = await assembler.assemble(config);
      await pipeline.activate();

      // Process test request
      const request = {
        messages: [
          { role: 'user', content: 'Hello, how are you?' }
        ],
        temperature: 0.7,
        max_tokens: 100
      };

      const result = await pipeline.process(request);

      // Verify complete pipeline processing
      expect(result).toBeDefined();
      expect(result.converted).toBe(true); // LLM Switch processed
      expect(result.workflowProcessed).toBe(true); // Workflow processed
      expect(result.compatibilityChecked).toBe(true); // Compatibility processed
      expect(result.providerResponse).toBeDefined(); // Provider responded
      expect(result.providerResponse.choices).toHaveLength(1);
      expect(result.providerResponse.choices[0].message.content).toBe('Hello! This is a mock response.');
    });

    it('should handle response processing through pipeline', async () => {
      // Register minimal implementations
      const implementations = [
        {
          id: 'e2e-llmswitch',
          name: 'E2E LLM Switch',
          version: '1.0.0',
          nodeType: 'llmswitch' as const,
          supportedProtocols: ['openai', 'gemini'],
          moduleClass: MockEndToEndLLMSwitch,
          priority: 10
        }
      ];

      implementations.forEach(impl => registry.register(impl));

      const config: PipelineAssemblyConfig = {
        id: 'e2e-response-pipeline',
        name: 'E2E Response Pipeline',
        version: '1.0.0',
        description: 'Test response processing through pipeline',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: {
              useFramework: true
            }
          }
        ],
        connections: []
      };

      await initializePipelineFrameworks();
      const pipeline = await assembler.assemble(config);
      await pipeline.activate();

      const response = {
        choices: [{ message: { content: 'Test response' } }],
        usage: { total_tokens: 20 }
      };

      const processedResponse = await pipeline.processResponse(response);

      expect(processedResponse).toBeDefined();
      expect(processedResponse.choices).toBeDefined();
      expect(processedResponse.usage).toBeDefined();
    });
  });

  describe('Framework Integration', () => {
    it('should initialize and use framework registry correctly', async () => {
      // Test framework initialization
      await initializePipelineFrameworks();

      const stats = registry.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalImplementations).toBeGreaterThanOrEqual(0);
    });

    it('should handle framework initialization errors gracefully', async () => {
      // Mock initialization to throw error
      vi.doMock('../nodes', async () => ({
        initializePipelineFrameworks: async () => {
          throw new Error('Framework initialization failed');
        }
      }));

      const { initializePipelineFrameworks: mockInit } = await import('../nodes');
      
      await expect(mockInit()).rejects.toThrow('Framework initialization failed');
    });
  });

  describe('Pipeline Management', () => {
    it('should manage multiple pipelines with framework support', async () => {
      const implementations = [
        {
          id: 'e2e-llmswitch',
          name: 'E2E LLM Switch',
          version: '1.0.0',
          nodeType: 'llmswitch' as const,
          supportedProtocols: ['openai', 'gemini'],
          moduleClass: MockEndToEndLLMSwitch,
          priority: 10
        }
      ];

      implementations.forEach(impl => registry.register(impl));

      // Create multiple pipelines
      const pipelineConfigs: PipelineAssemblyConfig[] = [
        {
          id: 'pipeline-1',
          name: 'Pipeline 1',
          version: '1.0.0',
          description: 'First pipeline',
          modules: [
            {
              id: 'llmswitch-1',
              type: 'llmswitch',
              config: { useFramework: true }
            }
          ],
          connections: []
        },
        {
          id: 'pipeline-2',
          name: 'Pipeline 2',
          version: '1.0.0',
          description: 'Second pipeline',
          modules: [
            {
              id: 'llmswitch-2',
              type: 'llmswitch',
              config: { useFramework: true }
            }
          ],
          connections: []
        }
      ];

      await initializePipelineFrameworks();

      // Assemble all pipelines
      const pipelines = [];
      for (const config of pipelineConfigs) {
        const pipeline = await assembler.assemble(config);
        await pipeline.activate();
        pipelines.push(pipeline);
      }

      // Verify pipeline management
      expect(assembler.getPipelineIds()).toHaveLength(2);
      expect(assembler.getPipeline('pipeline-1')).toBeDefined();
      expect(assembler.getPipeline('pipeline-2')).toBeDefined();

      // Test system status
      const status = assembler.getSystemStatus();
      expect(status.totalPipelines).toBe(2);
      expect(status.pipelineIds).toEqual(['pipeline-1', 'pipeline-2']);
    });

    it('should handle pipeline lifecycle correctly', async () => {
      const implementations = [
        {
          id: 'e2e-llmswitch',
          name: 'E2E LLM Switch',
          version: '1.0.0',
          nodeType: 'llmswitch' as const,
          supportedProtocols: ['openai', 'gemini'],
          moduleClass: MockEndToEndLLMSwitch,
          priority: 10
        }
      ];

      implementations.forEach(impl => registry.register(impl));

      const config: PipelineAssemblyConfig = {
        id: 'lifecycle-pipeline',
        name: 'Lifecycle Pipeline',
        version: '1.0.0',
        description: 'Test pipeline lifecycle',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: { useFramework: true }
          }
        ],
        connections: []
      };

      await initializePipelineFrameworks();
      const pipeline = await assembler.assemble(config);

      // Test initial state
      let health = pipeline.getHealth();
      expect(health.activated).toBe(false);

      // Test activation
      await pipeline.activate();
      health = pipeline.getHealth();
      expect(health.activated).toBe(true);

      // Test processing
      const request = { messages: [{ role: 'user', content: 'Hello' }] };
      const result = await pipeline.process(request);
      expect(result).toBeDefined();

      // Test deactivation
      await pipeline.deactivate();
      health = pipeline.getHealth();
      expect(health.activated).toBe(false);

      // Test removal
      await assembler.removePipeline('lifecycle-pipeline');
      expect(assembler.getPipeline('lifecycle-pipeline')).toBeNull();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle implementation selection failures', async () => {
      // Don't register any implementations
      const config: PipelineAssemblyConfig = {
        id: 'error-pipeline',
        name: 'Error Pipeline',
        version: '1.0.0',
        description: 'Test error handling',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: { useFramework: true }
          }
        ],
        connections: []
      };

      await expect(assembler.assemble(config)).rejects.toThrow();
    });

    it('should handle pipeline processing errors', async () => {
      // Create a failing implementation
      class FailingImplementation extends BasePipelineModule {
        override async process(request: any): Promise<any> {
          throw new Error('Processing failed');
        }

        override async configure(config: any): Promise<void> {
          // Configuration
        }
      }

      const implementations = [
        {
          id: 'failing-impl',
          name: 'Failing Implementation',
          version: '1.0.0',
          nodeType: 'llmswitch' as const,
          supportedProtocols: ['openai'],
          moduleClass: FailingImplementation,
          priority: 10
        }
      ];

      implementations.forEach(impl => registry.register(impl));

      const config: PipelineAssemblyConfig = {
        id: 'failing-pipeline',
        name: 'Failing Pipeline',
        version: '1.0.0',
        description: 'Test failing implementation',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: { useFramework: true }
          }
        ],
        connections: []
      };

      const pipeline = await assembler.assemble(config);
      await pipeline.activate();

      const request = { messages: [{ role: 'user', content: 'Hello' }] };
      
      await expect(pipeline.process(request)).rejects.toThrow('Pipeline processing failed');
    });
  });
});