import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PipelineAssembler } from '../assembler/PipelineAssembler';
import { PipelineAssemblyConfig } from '../interfaces/IPipelineAssembler';
import { NodeImplementationRegistry } from '../core/NodeImplementationRegistry';
import { BasePipelineModule } from '../modules/BasePipelineModule';
import { ModuleInfo } from 'rcc-basemodule';

// Mock legacy modules (simulate actual legacy modules)
class MockLegacyLLMSwitchModule extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    return { 
      ...request, 
      processedBy: 'LegacyLLMSwitchModule',
      legacy: true 
    };
  }
  
  override async configure(config: any): Promise<void> {
    // Legacy module configuration
  }
}

class MockLegacyWorkflowModule extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    return { 
      ...request, 
      processedBy: 'LegacyWorkflowModule',
      legacy: true 
    };
  }
  
  override async configure(config: any): Promise<void> {
    // Legacy module configuration
  }
}

class MockLegacyCompatibilityModule extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    return { 
      ...request, 
      processedBy: 'LegacyCompatibilityModule',
      legacy: true 
    };
  }
  
  override async configure(config: any): Promise<void> {
    // Legacy module configuration
  }
}

class MockLegacyProviderModule extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    return { 
      ...request, 
      processedBy: 'LegacyProviderModule',
      legacy: true 
    };
  }
  
  override async configure(config: any): Promise<void> {
    // Legacy module configuration
  }
}

// Mock framework implementations
class MockFrameworkLLMSwitch extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    return { 
      ...request, 
      processedBy: 'FrameworkLLMSwitch',
      framework: true 
    };
  }
  
  override async configure(config: any): Promise<void> {
    // Framework module configuration
  }
}

class MockFrameworkWorkflow extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    return { 
      ...request, 
      processedBy: 'FrameworkWorkflow',
      framework: true 
    };
  }
  
  override async configure(config: any): Promise<void> {
    // Framework module configuration
  }
}

describe('Backward Compatibility', () => {
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

  describe('Legacy Module Support', () => {
    it('should work with legacy modules when useFramework is false', async () => {
      // Mock the legacy module imports
      vi.doMock('../modules/LLMSwitchModule', () => ({
        LLMSwitchModule: MockLegacyLLMSwitchModule
      }));

      vi.doMock('../modules/WorkflowModule', () => ({
        WorkflowModule: MockLegacyWorkflowModule
      }));

      vi.doMock('../modules/CompatibilityModule', () => ({
        CompatibilityModule: MockLegacyCompatibilityModule
      }));

      vi.doMock('../modules/ProviderModule', () => ({
        ProviderModule: MockLegacyProviderModule
      }));

      const config: PipelineAssemblyConfig = {
        id: 'legacy-pipeline',
        name: 'Legacy Pipeline',
        version: '1.0.0',
        description: 'Test backward compatibility with legacy modules',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: {
              useFramework: false // Explicitly use legacy
            }
          },
          {
            id: 'workflow-1',
            type: 'workflow',
            config: {
              useFramework: false // Explicitly use legacy
            }
          },
          {
            id: 'compatibility-1',
            type: 'compatibility',
            config: {
              useFramework: false // Explicitly use legacy
            }
          },
          {
            id: 'provider-1',
            type: 'provider',
            config: {
              useFramework: false // Explicitly use legacy
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

      expect(pipeline).toBeDefined();
      expect(pipeline.getHealth().modules).toBe(4);
      expect(pipeline.getHealth().pipelineId).toBe('legacy-pipeline');
    });

    it('should default to legacy modules when useFramework is undefined', async () => {
      // Mock the legacy module imports
      vi.doMock('../modules/LLMSwitchModule', () => ({
        LLMSwitchModule: MockLegacyLLMSwitchModule
      }));

      vi.doMock('../modules/WorkflowModule', () => ({
        WorkflowModule: MockLegacyWorkflowModule
      }));

      const config: PipelineAssemblyConfig = {
        id: 'default-legacy-pipeline',
        name: 'Default Legacy Pipeline',
        version: '1.0.0',
        description: 'Test default behavior for legacy modules',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: {} // No useFramework specified - should default to legacy
          },
          {
            id: 'workflow-1',
            type: 'workflow',
            config: {} // No useFramework specified - should default to legacy
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

      expect(pipeline).toBeDefined();
      expect(pipeline.getHealth().modules).toBe(2);
    });
  });

  describe('Mixed Module Support', () => {
    it('should support mixed framework and legacy modules', async () => {
      // Register framework implementations
      const frameworkLLMSwitch = {
        id: 'framework-llmswitch',
        name: 'Framework LLM Switch',
        version: '1.0.0',
        nodeType: 'llmswitch' as const,
        supportedProtocols: ['openai', 'gemini'],
        moduleClass: MockFrameworkLLMSwitch,
        priority: 10
      };

      const frameworkWorkflow = {
        id: 'framework-workflow',
        name: 'Framework Workflow',
        version: '1.0.0',
        nodeType: 'workflow' as const,
        supportedProtocols: ['json'],
        moduleClass: MockFrameworkWorkflow,
        priority: 10
      };

      registry.register(frameworkLLMSwitch);
      registry.register(frameworkWorkflow);

      // Mock the legacy module imports for compatibility and provider
      vi.doMock('../modules/CompatibilityModule', () => ({
        CompatibilityModule: MockLegacyCompatibilityModule
      }));

      vi.doMock('../modules/ProviderModule', () => ({
        ProviderModule: MockLegacyProviderModule
      }));

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
              useFramework: true // Use framework
            }
          },
          {
            id: 'workflow-1',
            type: 'workflow',
            config: {
              useFramework: true // Use framework
            }
          },
          {
            id: 'compatibility-1',
            type: 'compatibility',
            config: {
              useFramework: false // Use legacy
            }
          },
          {
            id: 'provider-1',
            type: 'provider',
            config: {
              useFramework: false // Use legacy
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

      expect(pipeline).toBeDefined();
      expect(pipeline.getHealth().modules).toBe(4);
    });
  });

  describe('Configuration Compatibility', () => {
    it('should handle legacy configuration formats', async () => {
      // Mock the legacy module imports
      vi.doMock('../modules/LLMSwitchModule', () => ({
        LLMSwitchModule: MockLegacyLLMSwitchModule
      }));

      // Test legacy configuration format (without useFramework)
      const legacyConfig: PipelineAssemblyConfig = {
        id: 'legacy-config-pipeline',
        name: 'Legacy Config Pipeline',
        version: '1.0.0',
        description: 'Test legacy configuration format',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: {
              // Legacy config without useFramework
              inputFormat: 'openai',
              outputFormat: 'gemini'
            }
          }
        ],
        connections: []
      };

      const pipeline = await assembler.assemble(legacyConfig);

      expect(pipeline).toBeDefined();
      expect(pipeline.getHealth().modules).toBe(1);
    });

    it('should handle new configuration formats with legacy modules', async () => {
      // Mock the legacy module imports
      vi.doMock('../modules/LLMSwitchModule', () => ({
        LLMSwitchModule: MockLegacyLLMSwitchModule
      }));

      // Test new configuration format with explicit legacy setting
      const newConfig: PipelineAssemblyConfig = {
        id: 'new-config-legacy-pipeline',
        name: 'New Config Legacy Pipeline',
        version: '1.0.0',
        description: 'Test new configuration with legacy modules',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: {
              useFramework: false,
              inputProtocol: 'openai',
              outputProtocol: 'gemini'
            }
          }
        ],
        connections: []
      };

      const pipeline = await assembler.assemble(newConfig);

      expect(pipeline).toBeDefined();
      expect(pipeline.getHealth().modules).toBe(1);
    });
  });

  describe('Processing Compatibility', () => {
    it('should process requests correctly with legacy modules', async () => {
      // Mock the legacy module imports
      vi.doMock('../modules/LLMSwitchModule', () => ({
        LLMSwitchModule: MockLegacyLLMSwitchModule
      }));

      vi.doMock('../modules/WorkflowModule', () => ({
        WorkflowModule: MockLegacyWorkflowModule
      }));

      const config: PipelineAssemblyConfig = {
        id: 'legacy-processing-pipeline',
        name: 'Legacy Processing Pipeline',
        version: '1.0.0',
        description: 'Test processing with legacy modules',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: {
              useFramework: false
            }
          },
          {
            id: 'workflow-1',
            type: 'workflow',
            config: {
              useFramework: false
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

      const request = { 
        message: 'Hello World',
        temperature: 0.7,
        max_tokens: 100
      };

      const result = await pipeline.process(request);

      expect(result).toBeDefined();
      expect(result.message).toBe('Hello World');
      expect(result.temperature).toBe(0.7);
      expect(result.max_tokens).toBe(100);
      // Legacy modules should preserve all original data
    });

    it('should handle response processing with legacy modules', async () => {
      // Mock the legacy module imports
      vi.doMock('../modules/LLMSwitchModule', () => ({
        LLMSwitchModule: MockLegacyLLMSwitchModule
      }));

      const config: PipelineAssemblyConfig = {
        id: 'legacy-response-pipeline',
        name: 'Legacy Response Pipeline',
        version: '1.0.0',
        description: 'Test response processing with legacy modules',
        modules: [
          {
            id: 'llmswitch-1',
            type: 'llmswitch',
            config: {
              useFramework: false
            }
          }
        ],
        connections: []
      };

      const pipeline = await assembler.assemble(config);
      await pipeline.activate();

      const response = {
        choices: [{ message: { content: 'Hello' } }],
        usage: { total_tokens: 10 }
      };

      const processedResponse = await pipeline.processResponse(response);

      expect(processedResponse).toBeDefined();
      expect(processedResponse.choices).toBeDefined();
      expect(processedResponse.usage).toBeDefined();
    });
  });
});