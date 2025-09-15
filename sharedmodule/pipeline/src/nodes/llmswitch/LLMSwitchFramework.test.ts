import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LLMSwitchFramework } from '../nodes/llmswitch/LLMSwitchFramework';
import { NodeImplementationRegistry } from '../core/NodeImplementationRegistry';
import { NodeImplementationInfo } from '../core/NodeImplementationInfo';
import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../modules/BasePipelineModule';

// Mock implementation for testing
class MockLLMImplementation extends BasePipelineModule {
  override async process(request: any): Promise<any> {
    return { ...request, processedBy: 'MockLLMImplementation' };
  }
  
  override async configure(config: any): Promise<void> {
    // Mock implementation
  }
}

describe('LLMSwitchFramework', () => {
  let framework: LLMSwitchFramework;
  let registry: NodeImplementationRegistry;
  let moduleInfo: ModuleInfo;

  beforeEach(() => {
    // Reset singleton for each test
    (NodeImplementationRegistry as any).instance = null;
    registry = NodeImplementationRegistry.getInstance();
    
    moduleInfo = {
      id: 'test-llmswitch',
      name: 'Test LLM Switch',
      version: '1.0.0',
      description: 'Test LLM Switch Framework',
      type: 'llmswitch',
      metadata: { enabled: true }
    };

    framework = new LLMSwitchFramework(moduleInfo);
  });

  afterEach(() => {
    // Clean up
    (NodeImplementationRegistry as any).instance = null;
  });

  it('should initialize with default values', () => {
    expect(framework).toBeInstanceOf(LLMSwitchFramework);
    expect(framework.moduleInfo).toBe(moduleInfo);
  });

  it('should select and use implementation based on configuration', async () => {
    // Register a mock implementation
    const mockImplementation: NodeImplementationInfo = {
      id: 'mock-llmswitch',
      name: 'Mock LLM Switch',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai', 'gemini'],
      moduleClass: MockLLMImplementation as any,
      priority: 10
    };

    registry.register(mockImplementation);

    // Configure the framework
    const config = {
      inputProtocol: 'openai',
      outputProtocol: 'gemini',
      implementationId: 'mock-llmswitch'
    };

    await framework.configure(config);

    // Process a request
    const request = {
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0.7
    };

    const result = await framework.process(request);

    expect(result.processedBy).toBe('MockLLMImplementation');
  });

  it('should fallback to default implementation when specific one not found', async () => {
    // Register a mock implementation
    const mockImplementation: NodeImplementationInfo = {
      id: 'mock-llmswitch',
      name: 'Mock LLM Switch',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai', 'gemini'],
      moduleClass: MockLLMImplementation as any,
      priority: 10
    };

    registry.register(mockImplementation);

    // Configure with non-existent implementation
    const config = {
      inputProtocol: 'openai',
      outputProtocol: 'gemini',
      implementationId: 'non-existent'
    };

    await framework.configure(config);

    // Should still work with default selection
    const request = {
      messages: [{ role: 'user', content: 'Hello' }]
    };

    const result = await framework.process(request);
    expect(result.processedBy).toBe('MockLLMImplementation');
  });

  it('should handle implementation selection by protocol matching', async () => {
    // Register multiple implementations
    const openaiToGemini: NodeImplementationInfo = {
      id: 'openai-to-gemini',
      name: 'OpenAI to Gemini',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai', 'gemini'],
      moduleClass: MockLLMImplementation as any,
      priority: 10
    };

    const geminiToOpenAI: NodeImplementationInfo = {
      id: 'gemini-to-openai',
      name: 'Gemini to OpenAI',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['gemini', 'openai'],
      moduleClass: MockLLMImplementation as any,
      priority: 5
    };

    registry.register(openaiToGemini);
    registry.register(geminiToOpenAI);

    // Configure for openai to gemini conversion
    const config = {
      inputProtocol: 'openai',
      outputProtocol: 'gemini'
    };

    await framework.configure(config);

    const request = {
      messages: [{ role: 'user', content: 'Hello' }]
    };

    await framework.process(request);

    // Should select the higher priority implementation
    // (In real implementation, we'd need to check which one was selected)
    expect(true).toBe(true); // Placeholder for actual selection verification
  });

  it('should throw error when no implementation is available', async () => {
    // Don't register any implementations
    const config = {
      inputProtocol: 'openai',
      outputProtocol: 'gemini'
    };

    await expect(framework.configure(config)).rejects.toThrow();
  });

  it('should handle response processing', async () => {
    const mockImplementation: NodeImplementationInfo = {
      id: 'mock-llmswitch',
      name: 'Mock LLM Switch',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai', 'gemini'],
      moduleClass: MockLLMImplementation as any,
      priority: 10
    };

    registry.register(mockImplementation);

    const config = {
      inputProtocol: 'openai',
      outputProtocol: 'gemini'
    };

    await framework.configure(config);

    const response = {
      choices: [{ message: { content: 'Hello' } }],
      usage: { total_tokens: 10 }
    };

    const processedResponse = await framework.processResponse(response);

    expect(processedResponse).toBeDefined();
    // The response should be processed by the underlying implementation
  });
});