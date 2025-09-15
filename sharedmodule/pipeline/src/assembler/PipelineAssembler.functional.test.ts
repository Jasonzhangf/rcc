import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PipelineAssembler } from '../assembler/PipelineAssembler';
import { PipelineAssemblyConfig } from '../interfaces/IPipelineAssembler';
import { NodeImplementationRegistry } from '../core/NodeImplementationRegistry';
import { BasePipelineModule } from '../modules/BasePipelineModule';
import { ModuleInfo } from 'rcc-basemodule';

// Mock legacy modules
const mockLegacyLLMSwitchModule = class extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    return { ...request, processedBy: 'LegacyLLMSwitchModule' };
  }
  
  override async configure(config: any): Promise<void> {
    // Mock implementation
  }
};

const mockLegacyWorkflowModule = class extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    return { ...request, processedBy: 'LegacyWorkflowModule' };
  }
  
  override async configure(config: any): Promise<void> {
    // Mock implementation
  }
};

// Mock framework implementation
class MockFrameworkImplementation extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    return { ...request, processedBy: 'MockFrameworkImplementation' };
  }
  
  override async configure(config: any): Promise<void> {
    // Mock implementation
  }
};

describe('PipelineAssembler Functionality', () => {
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

  describe('Pipeline Assembly', () => {
    it('should assemble pipeline with correct module configuration', async () => {
      // Register framework implementation
      const frameworkImpl = {
        id: 'framework-llmswitch',
        name: 'Framework LLM Switch',
        version: '1.0.0',
        nodeType: 'llmswitch' as const,
        supportedProtocols: ['openai', 'gemini'],
        moduleClass: MockFrameworkImplementation,
        priority: 10
      };

      registry.register(frameworkImpl);

      const config: PipelineAssemblyConfig = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        version: '1.0.0',
        description: 'Test pipeline assembly',
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

      expect(pipeline).toBeDefined();
      expect(pipeline.getHealth().pipelineId).toBe('test-pipeline');
      expect(pipeline.getHealth().modules).toBe(1);
    });

    it('should handle pipeline activation and deactivation', async () => {
      const frameworkImpl = {
        id: 'framework-llmswitch',
        name: 'Framework LLM Switch',
        version: '1.0.0',
        nodeType: 'llmswitch' as const,
        supportedProtocols: ['openai', 'gemini'],
        moduleClass: MockFrameworkImplementation,
        priority: 10
      };

      registry.register(frameworkImpl);

      const config: PipelineAssemblyConfig = {
        id: 'activation-test',
        name: 'Activation Test',
        version: '1.0.0',
        description: 'Test pipeline activation',
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

      // Test activation
      await pipeline.activate();
      expect(pipeline.getHealth().activated).toBe(true);

      // Test deactivation
      await pipeline.deactivate();
      expect(pipeline.getHealth().activated).toBe(false);
    });

    it('should process requests through pipeline chain', async () => {
      const frameworkImpl = {
        id: 'framework-llmswitch',
        name: 'Framework LLM Switch',
        version: '1.0.0',
        nodeType: 'llmswitch' as const,
        supportedProtocols: ['openai', 'gemini'],
        moduleClass: MockFrameworkImplementation,
        priority: 10
      };

      registry.register(frameworkImpl);

      const config: PipelineAssemblyConfig = {
        id: 'chain-test',
        name: 'Chain Test',
        version: '1.0.0',
        description: 'Test pipeline processing chain',
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

      const request = { message: 'Hello World', temperature: 0.7 };
      const result = await pipeline.process(request);

      expect(result.processedBy).toBe('MockFrameworkImplementation');
      expect(result.message).toBe('Hello World');
      expect(result.temperature).toBe(0.7);
    });
  });

  describe('Module Management', () => {
    it('should manage active pipeline correctly', async () => {
      const frameworkImpl = {
        id: 'framework-llmswitch',
        name: 'Framework LLM Switch',
        version: '1.0.0',
        nodeType: 'llmswitch' as const,
        supportedProtocols: ['openai', 'gemini'],
        moduleClass: MockFrameworkImplementation,
        priority: 10
      };

      registry.register(frameworkImpl);

      const config: PipelineAssemblyConfig = {
        id: 'active-test',
        name: 'Active Test',
        version: '1.0.0',
        description: 'Test active pipeline management',
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

      // Test setting active pipeline
      assembler.setActivePipeline('active-test');
      expect(assembler.getActivePipeline()).toBe(pipeline);

      // Test removing pipeline
      await assembler.removePipeline('active-test');
      expect(assembler.getPipeline('active-test')).toBeNull();
      expect(assembler.getActivePipeline()).toBeNull();
    });

    it('should throw error for non-existent pipeline', () => {
      expect(() => {
        assembler.setActivePipeline('non-existent');
      }).toThrow('Pipeline not found: non-existent');
    });
  });

  describe('Error Handling', () => {
    it('should handle module configuration errors', async () => {
      const config: PipelineAssemblyConfig = {
        id: 'error-test',
        name: 'Error Test',
        version: '1.0.0',
        description: 'Test error handling',
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

      // No implementations registered - should throw error
      await expect(assembler.assemble(config)).rejects.toThrow();
    });

    it('should handle processing errors gracefully', async () => {
      // Create a failing implementation
      class FailingImplementation extends MockFrameworkImplementation {
        override async process(request: any): Promise<any> {
          throw new Error('Processing failed');
        }
      }

      const frameworkImpl = {
        id: 'failing-impl',
        name: 'Failing Implementation',
        version: '1.0.0',
        nodeType: 'llmswitch' as const,
        supportedProtocols: ['openai', 'gemini'],
        moduleClass: FailingImplementation,
        priority: 10
      };

      registry.register(frameworkImpl);

      const config: PipelineAssemblyConfig = {
        id: 'failing-test',
        name: 'Failing Test',
        version: '1.0.0',
        description: 'Test failing implementation',
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

      const request = { message: 'test' };
      
      await expect(pipeline.process(request)).rejects.toThrow('Pipeline processing failed');
    });
  });

  describe('Framework Initialization', () => {
    it('should initialize frameworks only once', async () => {
      const frameworkImpl = {
        id: 'framework-llmswitch',
        name: 'Framework LLM Switch',
        version: '1.0.0',
        nodeType: 'llmswitch' as const,
        supportedProtocols: ['openai', 'gemini'],
        moduleClass: MockFrameworkImplementation,
        priority: 10
      };

      registry.register(frameworkImpl);

      const config1: PipelineAssemblyConfig = {
        id: 'pipeline-1',
        name: 'Pipeline 1',
        version: '1.0.0',
        description: 'First pipeline',
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

      const config2: PipelineAssemblyConfig = {
        id: 'pipeline-2',
        name: 'Pipeline 2',
        version: '1.0.0',
        description: 'Second pipeline',
        modules: [
          {
            id: 'llmswitch-2',
            type: 'llmswitch',
            config: {
              useFramework: true
            }
          }
        ],
        connections: []
      };

      // Assemble first pipeline (should initialize frameworks)
      const pipeline1 = await assembler.assemble(config1);
      
      // Assemble second pipeline (should reuse initialized frameworks)
      const pipeline2 = await assembler.assemble(config2);

      expect(pipeline1).toBeDefined();
      expect(pipeline2).toBeDefined();
    });
  });
});