import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NodeImplementationScanner } from './NodeImplementationScanner';
import { NodeImplementationRegistry } from './NodeImplementationRegistry';
import { NodeImplementationInfo } from './NodeImplementationInfo';
import { ModuleInfo } from 'rcc-basemodule';

// Mock implementation for testing
class MockImplementation {
  constructor(info: ModuleInfo) {}
}

describe('NodeImplementationScanner', () => {
  let scanner: NodeImplementationScanner;
  let registry: NodeImplementationRegistry;

  beforeEach(() => {
    // Reset singleton for each test
    (NodeImplementationRegistry as any).instance = null;
    registry = NodeImplementationRegistry.getInstance();
    scanner = new NodeImplementationScanner();
  });

  afterEach(() => {
    // Clean up
    (NodeImplementationRegistry as any).instance = null;
  });

  it('should scan and register default implementations', async () => {
    // Mock the static registerDefaultImplementations method
    const mockImplementations: NodeImplementationInfo[] = [
      {
        id: 'test-llmswitch',
        name: 'Test LLM Switch',
        version: '1.0.0',
        nodeType: 'llmswitch',
        supportedProtocols: ['openai', 'gemini'],
        moduleClass: MockImplementation as any,
        priority: 10
      },
      {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        nodeType: 'workflow',
        supportedProtocols: ['json'],
        moduleClass: MockImplementation as any,
        priority: 5
      }
    ];

    // Mock the scanner to return test implementations
    vi.spyOn(scanner, 'scanImplementations').mockResolvedValue(mockImplementations);

    await scanner.scanAndRegister();

    // Verify implementations were registered
    const llmSwitchImpls = registry.getImplementations('llmswitch');
    const workflowImpls = registry.getImplementations('workflow');

    expect(llmSwitchImpls).toHaveLength(1);
    expect(workflowImpls).toHaveLength(1);
    expect(llmSwitchImpls[0].id).toBe('test-llmswitch');
    expect(workflowImpls[0].id).toBe('test-workflow');
  });

  it('should handle duplicate implementations gracefully', async () => {
    const mockImplementation: NodeImplementationInfo = {
      id: 'duplicate-impl',
      name: 'Duplicate Implementation',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai'],
      moduleClass: MockImplementation as any
    };

    // Mock the scanner to return the same implementation twice
    vi.spyOn(scanner, 'scanImplementations').mockResolvedValue([
      mockImplementation,
      mockImplementation
    ]);

    await scanner.scanAndRegister();

    // Verify only one implementation was registered
    const implementations = registry.getImplementations('llmswitch');
    expect(implementations).toHaveLength(1);
  });

  it('should scan and return implementations without registering', async () => {
    const mockImplementations: NodeImplementationInfo[] = [
      {
        id: 'scan-test',
        name: 'Scan Test',
        version: '1.0.0',
        nodeType: 'llmswitch',
        supportedProtocols: ['openai'],
        moduleClass: MockImplementation as any
      }
    ];

    vi.spyOn(scanner, 'scanImplementations').mockResolvedValue(mockImplementations);

    const scannedImplementations = await scanner.scan();

    expect(scannedImplementations).toEqual(mockImplementations);
    expect(registry.getImplementations('llmswitch')).toHaveLength(0); // Not registered
  });

  it('should handle empty implementations list', async () => {
    vi.spyOn(scanner, 'scanImplementations').mockResolvedValue([]);

    await scanner.scanAndRegister();

    const stats = registry.getStatistics();
    expect(stats.totalImplementations).toBe(0);
  });

  it('should validate implementation metadata', () => {
    const validImplementation: NodeImplementationInfo = {
      id: 'valid-impl',
      name: 'Valid Implementation',
      version: '1.0.0',
      nodeType: 'llmswitch',
      supportedProtocols: ['openai'],
      moduleClass: MockImplementation as any
    };

    const invalidImplementation = {
      id: 'invalid-impl',
      name: 'Invalid Implementation',
      version: '1.0.0'
      // Missing required fields
    };

    expect(() => {
      scanner.validateImplementation(validImplementation as any);
    }).not.toThrow();

    expect(() => {
      scanner.validateImplementation(invalidImplementation as any);
    }).toThrow();
  });
});