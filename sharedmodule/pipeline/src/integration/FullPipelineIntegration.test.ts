import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PipelineAssembler } from '../assembler/PipelineAssembler';
import { PipelineAssemblyConfig } from '../interfaces/IPipelineAssembler';
import { NodeImplementationRegistry } from '../core/NodeImplementationRegistry';
import { initializePipelineFrameworks } from '../nodes';
import { BasePipelineModule } from '../modules/BasePipelineModule';
import { ModuleInfo } from 'rcc-basemodule';

// Integration test implementations
class IntegrationTestLLMSwitch extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    // Convert OpenAI format to Gemini format
    return {
      ...request,
      format: 'gemini',
      contents: request.messages?.map((msg: any) => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      })) || [],
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.max_tokens || undefined
      }
    };
  }

  override async configure(config: any): Promise<void> {
    // Configuration
  }
}

class IntegrationTestWorkflow extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    // Add workflow metadata
    return {
      ...request,
      workflow: {
        steps: ['preprocessing', 'validation', 'transformation'],
        validated: true,
        timestamp: Date.now()
      }
    };
  }

  override async configure(config: any): Promise<void> {
    // Configuration
  }
}

class IntegrationTestCompatibility extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    // Ensure compatibility
    return {
      ...request,
      compatibility: {
        format: 'standard',
        version: '1.0',
        validated: true
      }
    };
  }

  override async configure(config: any): Promise<void> {
    // Configuration
  }
}

class IntegrationTestProvider extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    // Mock provider response
    return {
      ...request,
      response: {
        id: 'resp_' + Date.now(),
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Integration test response: ' + (request.contents?.[0]?.parts?.[0]?.text || 'Hello')
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
    // Configuration
  }
}

describe('Pipeline Integration Tests', () => {
  let assembler: PipelineAssembler;
  let registry: NodeImplementationRegistry;

  beforeAll(async () => {
    // Reset singleton
    (NodeImplementationRegistry as any).instance = null;
    registry = NodeImplementationRegistry.getInstance();
    assembler = new PipelineAssembler();

    // Register test implementations
    const implementations = [
      {
        id: 'integration-llmswitch',
        name: 'Integration Test LLM Switch',
        version: '1.0.0',
        nodeType: 'llmswitch' as const,
        supportedProtocols: ['openai', 'gemini'],
        moduleClass: IntegrationTestLLMSwitch,
        priority: 10
      },
      {
        id: 'integration-workflow',
        name: 'Integration Test Workflow',
        version: '1.0.0',
        nodeType: 'workflow' as const,
        supportedProtocols: ['json'],
        moduleClass: IntegrationTestWorkflow,
        priority: 10
      },
      {
        id: 'integration-compatibility',
        name: 'Integration Test Compatibility',
        version: '1.0.0',
        nodeType: 'compatibility' as const,
        supportedProtocols: ['standard'],
        moduleClass: IntegrationTestCompatibility,
        priority: 10
      },
      {
        id: 'integration-provider',
        name: 'Integration Test Provider',
        version: '1.0.0',
        nodeType: 'provider' as const,
        supportedProtocols: ['openai'],
        moduleClass: IntegrationTestProvider,
        priority: 10
      }
    ];

    implementations.forEach(impl => registry.register(impl));

    // Initialize frameworks
    await initializePipelineFrameworks();
  });

  afterAll(() => {
    // Clean up
    (NodeImplementationRegistry as any).instance = null;
  });

  describe('Full Pipeline Integration', () => {
    it('should process complete pipeline with all four nodes', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'full-integration-pipeline',
        name: 'Full Integration Pipeline',
        version: '1.0.0',
        description: 'Complete integration test with all four pipeline nodes',
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

      const pipeline = await assembler.assemble(config);
      await pipeline.activate();

      // Test request processing
      const request = {
        messages: [
          { role: 'user', content: 'Hello, integration test!' }
        ],
        temperature: 0.8,
        max_tokens: 150
      };

      const result = await pipeline.process(request);

      // Verify each node processed the request
      expect(result.format).toBe('gemini'); // LLM Switch
      expect(result.workflow).toBeDefined(); // Workflow
      expect(result.workflow.validated).toBe(true);
      expect(result.compatibility).toBeDefined(); // Compatibility
      expect(result.compatibility.validated).toBe(true);
      expect(result.response).toBeDefined(); // Provider
      expect(result.response.choices).toHaveLength(1);
      expect(result.response.choices[0].message.content).toBe('Integration test response: Hello, integration test!');

      // Verify pipeline health
      const health = pipeline.getHealth();
      expect(health.activated).toBe(true);
      expect(health.modules).toBe(4);
      expect(health.requestChainLength).toBe(4);
      expect(health.responseChainLength).toBe(4);
    });

    it('should handle response processing through complete pipeline', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'response-integration-pipeline',
        name: 'Response Integration Pipeline',
        version: '1.0.0',
        description: 'Test response processing through complete pipeline',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: {
              useFramework: true
            }
          },
          {
            id: 'workflow-1',
            type: 'workflow',
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
          }
        ]
      };

      const pipeline = await assembler.assemble(config);
      await pipeline.activate();

      const response = {
        response: {
          choices: [{ message: { content: 'Test response' } }],
          usage: { total_tokens: 25 }
        }
      };

      const processedResponse = await pipeline.processResponse(response);

      expect(processedResponse).toBeDefined();
      expect(processedResponse.response).toBeDefined();
      expect(processedResponse.workflow).toBeDefined();
    });
  });

  describe('Framework Selection and Configuration', () => {
    it('should select correct implementations based on configuration', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'selection-pipeline',
        name: 'Selection Pipeline',
        version: '1.0.0',
        description: 'Test implementation selection',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: {
              inputProtocol: 'openai',
              outputProtocol: 'gemini',
              useFramework: true
            }
          }
        ],
        connections: []
      };

      const pipeline = await assembler.assemble(config);
      await pipeline.activate();

      const request = {
        messages: [{ role: 'user', content: 'Selection test' }]
      };

      const result = await pipeline.process(request);

      // Verify the correct implementation was selected and processed
      expect(result.format).toBe('gemini');
      expect(result.contents).toBeDefined();
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].parts).toHaveLength(1);
      expect(result.contents[0].parts[0].text).toBe('Selection test');
    });

    it('should handle mixed framework and legacy configurations', async () => {
      // This test would require actual legacy module imports
      // For now, we'll test the configuration structure
      const config: PipelineAssemblyConfig = {
        id: 'mixed-pipeline',
        name: 'Mixed Pipeline',
        version: '1.0.0',
        description: 'Test mixed framework and legacy modules',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: {
              useFramework: true
            }
          },
          {
            id: 'workflow-1',
            type: 'workflow',
            config: {
              useFramework: false // Would use legacy if available
            }
          }
        ],
        connections: [
          {
            source: 'llmswitch-1',
            target: 'workflow-1',
            type: 'request'
          }
        ]
      };

      // Note: This would require legacy modules to be properly mocked
      // For integration testing, we focus on framework modules
      const pipeline = await assembler.assemble(config);
      expect(pipeline).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid pipeline configurations', async () => {
      const invalidConfig: PipelineAssemblyConfig = {
        id: 'invalid-pipeline',
        name: 'Invalid Pipeline',
        version: '1.0.0',
        description: 'Test invalid configuration',
        modules: [
          {
            id: 'invalid-module',
            type: 'invalid-type' as any, // Invalid type
            config: {
              useFramework: true
            }
          }
        ],
        connections: []
      };

      await expect(assembler.assemble(invalidConfig)).rejects.toThrow();
    });

    it('should handle connection validation errors', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'connection-error-pipeline',
        name: 'Connection Error Pipeline',
        version: '1.0.0',
        description: 'Test connection validation',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: {
              useFramework: true
            }
          }
        ],
        connections: [
          {
            source: 'llmswitch-1',
            target: 'non-existent-module',
            type: 'request'
          }
        ]
      };

      await expect(assembler.assemble(config)).rejects.toThrow('Invalid connection');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent requests', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'concurrent-pipeline',
        name: 'Concurrent Pipeline',
        version: '1.0.0',
        description: 'Test concurrent request processing',
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

      const pipeline = await assembler.assemble(config);
      await pipeline.activate();

      // Process multiple requests concurrently
      const requests = Array.from({ length: 10 }, (_, i) => ({
        messages: [{ role: 'user', content: `Concurrent test ${i}` }]
      }));

      const results = await Promise.all(
        requests.map(request => pipeline.process(request))
      );

      // Verify all requests were processed
      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.format).toBe('gemini');
        expect(result.contents[0].parts[0].text).toBe(`Concurrent test ${i}`);
      });
    });

    it('should provide accurate system statistics', async () => {
      const stats = registry.getStatistics();
      
      expect(stats.totalImplementations).toBe(4);
      expect(stats.implementationsByNodeType.llmswitch).toBe(1);
      expect(stats.implementationsByNodeType.workflow).toBe(1);
      expect(stats.implementationsByNodeType.compatibility).toBe(1);
      expect(stats.implementationsByNodeType.provider).toBe(1);

      const assemblerStats = assembler.getSystemStatus();
      expect(assemblerStats.timestamp).toBeInstanceOf(Number);
      expect(assemblerStats.totalPipelines).toBeGreaterThanOrEqual(0);
    });
  });
});