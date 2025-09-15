import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PipelineAssembler } from '../assembler/PipelineAssembler';
import { PipelineAssemblyConfig } from '../interfaces/IPipelineAssembler';
import { NodeImplementationRegistry } from '../core/NodeImplementationRegistry';
import { BasePipelineModule } from '../modules/BasePipelineModule';
import { ModuleInfo } from 'rcc-basemodule';

// Mock implementation for testing
class MockPipelineModule extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    return { ...request, processedBy: this.moduleInfo.id };
  }
  
  override async configure(config: any): Promise<void> {
    // Mock implementation
  }
}

describe('PipelineAssembler', () => {
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

  it('should assemble a pipeline with framework modules', async () => {
    // Register mock implementations
    const mockLLMSwitch: NodeImplementationInfo = {
      id: 'mock-llmswitch',
      name: 'Mock LLM Switch',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai', 'gemini'],
      moduleClass: MockPipelineModule as any,
      priority: 10
    };

    const mockWorkflow: NodeImplementationInfo = {
      id: 'mock-workflow',
      name: 'Mock Workflow',
      version: '1.0.0',
      nodeType: 'workflow',
      supportedProtocols: ['json'],
      moduleClass: MockPipelineModule as any,
      priority: 10
    };

    registry.register(mockLLMSwitch);
    registry.register(mockWorkflow);

    // Create pipeline configuration
    const config: PipelineAssemblyConfig = {
      id: 'test-pipeline',
      name: 'Test Pipeline',
      version: '1.0.0',
      description: 'Test pipeline with framework modules',
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
    expect(pipeline.getHealth().activated).toBe(false); // Not activated yet
    expect(pipeline.getHealth().modules).toBe(2);
  });

  it('should assemble a pipeline with legacy modules', async () => {
    // Create pipeline configuration with legacy modules
    const config: PipelineAssemblyConfig = {
      id: 'legacy-pipeline',
      name: 'Legacy Pipeline',
      version: '1.0.0',
      description: 'Test pipeline with legacy modules',
      modules: [
        {
          id: 'llmswitch-1',
          type: 'llmswitch',
          config: {
            useFramework: false // Use legacy module
          }
        },
        {
          id: 'workflow-1',
          type: 'workflow',
          config: {
            useFramework: false // Use legacy module
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

    // Mock the legacy module import
    vi.doMock('../modules/LLMSwitchModule', () => ({
      LLMSwitchModule: class extends MockPipelineModule {}
    }));

    vi.doMock('../modules/WorkflowModule', () => ({
      WorkflowModule: class extends MockPipelineModule {}
    }));

    const pipeline = await assembler.assemble(config);

    expect(pipeline).toBeDefined();
    expect(pipeline.getHealth().modules).toBe(2);
  });

  it('should handle mixed framework and legacy modules', async () => {
    // Register mock implementation for framework module
    const mockLLMSwitch: NodeImplementationInfo = {
      id: 'mock-llmswitch',
      name: 'Mock LLM Switch',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai', 'gemini'],
      moduleClass: MockPipelineModule as any,
      priority: 10
    };

    registry.register(mockLLMSwitch);

    // Create mixed configuration
    const config: PipelineAssemblyConfig = {
      id: 'mixed-pipeline',
      name: 'Mixed Pipeline',
      version: '1.0.0',
      description: 'Test pipeline with mixed framework and legacy modules',
      modules: [
        {
          id: 'llmswitch-1',
          type: 'llmswitch',
          config: {
            inputProtocol: 'openai',
            outputProtocol: 'gemini',
            useFramework: true // Use framework
          }
        },
        {
          id: 'workflow-1',
          type: 'workflow',
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
        }
      ]
    };

    // Mock the legacy module import
    vi.doMock('../modules/WorkflowModule', () => ({
      WorkflowModule: class extends MockPipelineModule {}
    }));

    const pipeline = await assembler.assemble(config);

    expect(pipeline).toBeDefined();
    expect(pipeline.getHealth().modules).toBe(2);
  });

  it('should validate module connections', async () => {
    // Register mock implementations
    const mockLLMSwitch: NodeImplementationInfo = {
      id: 'mock-llmswitch',
      name: 'Mock LLM Switch',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai', 'gemini'],
      moduleClass: MockPipelineModule as any,
      priority: 10
    };

    registry.register(mockLLMSwitch);

    // Create configuration with invalid connection
    const config: PipelineAssemblyConfig = {
      id: 'invalid-pipeline',
      name: 'Invalid Pipeline',
      version: '1.0.0',
      description: 'Test pipeline with invalid connection',
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

  it('should detect circular dependencies', async () => {
    // Register mock implementations
    const mockLLMSwitch: NodeImplementationInfo = {
      id: 'mock-llmswitch',
      name: 'Mock LLM Switch',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai', 'gemini'],
      moduleClass: MockPipelineModule as any,
      priority: 10
    };

    const mockWorkflow: NodeImplementationInfo = {
      id: 'mock-workflow',
      name: 'Mock Workflow',
      version: '1.0.0',
      nodeType: 'workflow',
      supportedProtocols: ['json'],
      moduleClass: MockPipelineModule as any,
      priority: 10
    };

    registry.register(mockLLMSwitch);
    registry.register(mockWorkflow);

    // Create configuration with circular dependency
    const config: PipelineAssemblyConfig = {
      id: 'circular-pipeline',
      name: 'Circular Pipeline',
      version: '1.0.0',
      description: 'Test pipeline with circular dependency',
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
        },
        {
          source: 'workflow-1',
          target: 'llmswitch-1',
          type: 'request'
        }
      ]
    };

    await expect(assembler.assemble(config)).rejects.toThrow('Circular dependency');
  });

  it('should process requests through the pipeline', async () => {
    // Register mock implementations
    const mockLLMSwitch: NodeImplementationInfo = {
      id: 'mock-llmswitch',
      name: 'Mock LLM Switch',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai', 'gemini'],
      moduleClass: MockPipelineModule as any,
      priority: 10
    };

    registry.register(mockLLMSwitch);

    // Create simple pipeline
    const config: PipelineAssemblyConfig = {
      id: 'process-pipeline',
      name: 'Process Pipeline',
      version: '1.0.0',
      description: 'Test pipeline for processing requests',
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
    const result = await pipeline.process(request);

    expect(result.processedBy).toBe('llmswitch-1');
  });

  it('should manage multiple pipelines', async () => {
    // Register mock implementations
    const mockLLMSwitch: NodeImplementationInfo = {
      id: 'mock-llmswitch',
      name: 'Mock LLM Switch',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai', 'gemini'],
      moduleClass: MockPipelineModule as any,
      priority: 10
    };

    registry.register(mockLLMSwitch);

    // Create first pipeline
    const config1: PipelineAssemblyConfig = {
      id: 'pipeline-1',
      name: 'Pipeline 1',
      version: '1.0.0',
      description: 'First test pipeline',
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

    // Create second pipeline
    const config2: PipelineAssemblyConfig = {
      id: 'pipeline-2',
      name: 'Pipeline 2',
      version: '1.0.0',
      description: 'Second test pipeline',
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

    const pipeline1 = await assembler.assemble(config1);
    const pipeline2 = await assembler.assemble(config2);

    expect(assembler.getPipelineIds()).toHaveLength(2);
    expect(assembler.getPipeline('pipeline-1')).toBe(pipeline1);
    expect(assembler.getPipeline('pipeline-2')).toBe(pipeline2);
  });

  it('should provide system status', async () => {
    const status = assembler.getSystemStatus();
    
    expect(status).toBeDefined();
    expect(status.totalPipelines).toBe(0);
    expect(status.pipelineIds).toEqual([]);
    expect(status.timestamp).toBeInstanceOf(Number);
  });
});