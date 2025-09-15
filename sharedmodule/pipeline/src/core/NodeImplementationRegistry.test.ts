import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NodeImplementationRegistry } from './NodeImplementationRegistry';
import { NodeImplementationInfo, SelectionCriteria } from './NodeImplementationInfo';
import { ModuleInfo } from 'rcc-basemodule';

describe('NodeImplementationRegistry', () => {
  let registry: NodeImplementationRegistry;

  beforeEach(() => {
    // Reset singleton for each test
    (NodeImplementationRegistry as any).instance = null;
    registry = NodeImplementationRegistry.getInstance();
  });

  afterEach(() => {
    // Clean up
    (NodeImplementationRegistry as any).instance = null;
  });

  it('should be a singleton', () => {
    const instance1 = NodeImplementationRegistry.getInstance();
    const instance2 = NodeImplementationRegistry.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should register and retrieve implementations', () => {
    const mockImpl: NodeImplementationInfo = {
      id: 'test-impl',
      name: 'Test Implementation',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai', 'gemini'],
      moduleClass: class TestModule {
        constructor(info: ModuleInfo) {}
      } as any
    };

    registry.register(mockImpl);
    const implementations = registry.getImplementations('llmswitch');
    
    expect(implementations).toHaveLength(1);
    expect(implementations[0]).toBe(mockImpl);
  });

  it('should select implementation based on criteria', () => {
    const mockImpl1: NodeImplementationInfo = {
      id: 'openai-to-gemini',
      name: 'OpenAI to Gemini',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai', 'gemini'],
      moduleClass: class TestModule {
        constructor(info: ModuleInfo) {}
      } as any,
      priority: 10
    };

    const mockImpl2: NodeImplementationInfo = {
      id: 'gemini-to-openai',
      name: 'Gemini to OpenAI',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['gemini', 'openai'],
      moduleClass: class TestModule {
        constructor(info: ModuleInfo) {}
      } as any,
      priority: 5
    };

    registry.register(mockImpl1);
    registry.register(mockImpl2);

    const criteria: SelectionCriteria = {
      nodeType: 'llmswitch',
      inputProtocol: 'openai',
      outputProtocol: 'gemini',
      context: {}
    };

    const selected = registry.selectImplementation('llmswitch', criteria);
    
    expect(selected).toBe(mockImpl1); // Higher priority
  });

  it('should return undefined when no implementation matches criteria', () => {
    const mockImpl: NodeImplementationInfo = {
      id: 'test-impl',
      name: 'Test Implementation',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai'],
      moduleClass: class TestModule {
        constructor(info: ModuleInfo) {}
      } as any
    };

    registry.register(mockImpl);

    const criteria: SelectionCriteria = {
      nodeType: 'llmswitch',
      inputProtocol: 'unsupported',
      outputProtocol: 'gemini',
      context: {}
    };

    const selected = registry.selectImplementation('llmswitch', criteria);
    
    expect(selected).toBeUndefined();
  });

  it('should return statistics', () => {
    const mockImpl1: NodeImplementationInfo = {
      id: 'impl1',
      name: 'Implementation 1',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai'],
      moduleClass: class TestModule {
        constructor(info: ModuleInfo) {}
      } as any
    };

    const mockImpl2: NodeImplementationInfo = {
      id: 'impl2',
      name: 'Implementation 2',
      version: '1.0.0',
      nodeType: 'workflow',
      supportedProtocols: ['json'],
      moduleClass: class TestModule {
        constructor(info: ModuleInfo) {}
      } as any
    };

    registry.register(mockImpl1);
    registry.register(mockImpl2);

    const stats = registry.getStatistics();
    
    expect(stats.totalImplementations).toBe(2);
    expect(stats.implementationsByNodeType.llmswitch).toBe(1);
    expect(stats.implementationsByNodeType.workflow).toBe(1);
  });

  it('should unregister implementations', () => {
    const mockImpl: NodeImplementationInfo = {
      id: 'test-impl',
      name: 'Test Implementation',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai'],
      moduleClass: class TestModule {
        constructor(info: ModuleInfo) {}
      } as any
    };

    registry.register(mockImpl);
    expect(registry.getImplementations('llmswitch')).toHaveLength(1);

    registry.unregister('test-impl');
    expect(registry.getImplementations('llmswitch')).toHaveLength(0);
  });

  it('should clear all implementations', () => {
    const mockImpl: NodeImplementationInfo = {
      id: 'test-impl',
      name: 'Test Implementation',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai'],
      moduleClass: class TestModule {
        constructor(info: ModuleInfo) {}
      } as any
    };

    registry.register(mockImpl);
    expect(registry.getImplementations('llmswitch')).toHaveLength(1);

    registry.clear();
    expect(registry.getImplementations('llmswitch')).toHaveLength(0);
  });
});