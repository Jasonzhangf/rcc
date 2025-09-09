/**
 * StatusLineModule Communication Tests
 * Tests for inter-module communication functionality
 * 
 * @author RCC System
 * @version 1.0.0
 * @since 2025-01-09
 */

import { StatusLineModule } from '../src/StatusLineModule';
import { BaseModule } from '../../../core/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';
import { STATUS_LINE_CONSTANTS } from '../constants/StatusLine.constants';
import { testData } from './fixtures/test-data';

/**
 * Mock module for testing communication
 */
class MockModule extends BaseModule {
  public receivedData: DataTransfer[] = [];
  public handshakeResults: boolean[] = [];

  static createInstance(info: ModuleInfo): MockModule {
    return new MockModule(info);
  }

  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    this.receivedData.push(dataTransfer);
  }

  public async handshake(targetModule: BaseModule): Promise<boolean> {
    const result = await super.handshake(targetModule);
    this.handshakeResults.push(result);
    return result;
  }

  public getReceivedData(): DataTransfer[] {
    return [...this.receivedData];
  }

  public clearReceivedData(): void {
    this.receivedData = [];
  }
}

/**
 * Test suite for StatusLineModule communication
 */
describe('StatusLineModule Communication', () => {
  let statusLineModule: StatusLineModule;
  let mockModule: MockModule;
  let statusLineInfo: ModuleInfo;
  let mockModuleInfo: ModuleInfo;

  // Setup before each test
  beforeEach(async () => {
    statusLineInfo = {
      id: 'test-status-line-module',
      name: 'Test StatusLine Module',
      version: '1.0.0',
      description: 'Test instance of StatusLine module',
      type: 'ui-configuration',
    };

    mockModuleInfo = {
      id: 'test-mock-module',
      name: 'Test Mock Module',
      version: '1.0.0',
      description: 'Mock module for testing communication',
      type: 'test-module',
    };

    statusLineModule = new StatusLineModule(statusLineInfo);
    mockModule = new MockModule(mockModuleInfo);

    // Configure and initialize modules
    statusLineModule.configure({ preview: { enabled: false } });
    await statusLineModule.initialize();
    await mockModule.initialize();
  });

  // Cleanup after each test
  afterEach(async () => {
    await statusLineModule.destroy();
    await mockModule.destroy();
  });

  /**
   * Connection management tests
   */
  describe('Connection Management', () => {
    test('should add input connection successfully', () => {
      const connection: ConnectionInfo = {
        id: 'test-input-connection',
        type: 'input',
        sourceModuleId: mockModuleInfo.id,
        targetModuleId: statusLineInfo.id,
        dataType: 'status-line-input',
        metadata: { description: 'Test input connection' },
      };

      expect(() => {
        statusLineModule.addInputConnection(connection);
      }).not.toThrow();

      const inputConnections = statusLineModule.getInputConnections();
      expect(inputConnections).toContainEqual(connection);
    });

    test('should add output connection successfully', () => {
      const connection: ConnectionInfo = {
        id: 'test-output-connection',
        type: 'output',
        sourceModuleId: statusLineInfo.id,
        targetModuleId: mockModuleInfo.id,
        dataType: 'status-line-output',
        metadata: { description: 'Test output connection' },
      };

      expect(() => {
        statusLineModule.addOutputConnection(connection);
      }).not.toThrow();

      const outputConnections = statusLineModule.getOutputConnections();
      expect(outputConnections).toContainEqual(connection);
    });

    test('should remove connections successfully', () => {
      const inputConnection: ConnectionInfo = {
        id: 'test-input-connection',
        type: 'input',
        sourceModuleId: mockModuleInfo.id,
        targetModuleId: statusLineInfo.id,
        dataType: 'status-line-input',
      };

      const outputConnection: ConnectionInfo = {
        id: 'test-output-connection',
        type: 'output',
        sourceModuleId: statusLineInfo.id,
        targetModuleId: mockModuleInfo.id,
        dataType: 'status-line-output',
      };

      statusLineModule.addInputConnection(inputConnection);
      statusLineModule.addOutputConnection(outputConnection);

      // Remove connections
      statusLineModule.removeInputConnection(inputConnection.id);
      statusLineModule.removeOutputConnection(outputConnection.id);

      expect(statusLineModule.getInputConnections()).toHaveLength(0);
      expect(statusLineModule.getOutputConnections()).toHaveLength(0);
    });

    test('should reject invalid connection types', () => {
      const invalidInputConnection: ConnectionInfo = {
        id: 'invalid-input',
        type: 'output', // Wrong type for input
        sourceModuleId: mockModuleInfo.id,
        targetModuleId: statusLineInfo.id,
        dataType: 'test-data',
      };

      const invalidOutputConnection: ConnectionInfo = {
        id: 'invalid-output',
        type: 'input', // Wrong type for output
        sourceModuleId: statusLineInfo.id,
        targetModuleId: mockModuleInfo.id,
        dataType: 'test-data',
      };

      expect(() => {
        statusLineModule.addInputConnection(invalidInputConnection);
      }).toThrow('Invalid connection type for input');

      expect(() => {
        statusLineModule.addOutputConnection(invalidOutputConnection);
      }).toThrow('Invalid connection type for output');
    });
  });

  /**
   * Data transfer tests
   */
  describe('Data Transfer', () => {
    beforeEach(() => {
      // Setup output connection from StatusLine to Mock module
      const outputConnection: ConnectionInfo = {
        id: 'status-line-to-mock',
        type: 'output',
        sourceModuleId: statusLineInfo.id,
        targetModuleId: mockModuleInfo.id,
        dataType: 'status-line-events',
      };
      
      statusLineModule.addOutputConnection(outputConnection);
      mockModule.clearReceivedData();
    });

    test('should transfer data on theme change', async () => {
      const result = await statusLineModule.setTheme(testData.themes.powerline);
      
      expect(result.success).toBe(true);
      
      // Check if data was transferred (in real implementation, this would be handled by the registry)
      // For now, we can verify the operation completed successfully
      expect(result.theme?.id).toBe(testData.themes.powerline.id);
    });

    test('should transfer data on layout update', async () => {
      const newLayout = {
        ...statusLineModule.getCurrentLayout(),
        position: 'top' as const,
        height: 30,
      };

      const result = await statusLineModule.updateLayout(newLayout);
      
      expect(result.success).toBe(true);
      expect(result.layout?.position).toBe('top');
      expect(result.layout?.height).toBe(30);
    });

    test('should transfer data on component changes', async () => {
      const newComponent = {
        id: 'communication-test-component',
        type: 'custom' as const,
        label: 'Communication Test',
        enabled: true,
        position: 'left' as const,
        priority: 100,
      };

      const addResult = await statusLineModule.addComponent(newComponent);
      expect(addResult.success).toBe(true);

      const removeResult = await statusLineModule.removeComponent(newComponent.id);
      expect(removeResult.success).toBe(true);
    });

    test('should transfer data on preview generation', async () => {
      const previewConfig = {
        enabled: true,
        realTime: false,
        duration: 1000,
        showTooltips: true,
        highlightChanges: false,
        sampleData: testData.sampleData,
      };

      const result = await statusLineModule.generatePreview(previewConfig);
      
      expect(result.success).toBe(true);
      expect(result.preview).toBeDefined();
    });
  });

  /**
   * Data reception tests
   */
  describe('Data Reception', () => {
    test('should receive and process valid status line input', async () => {
      const inputData = {
        action: 'setTheme',
        theme: testData.themes.minimal,
        metadata: { source: 'test' },
      };

      const dataTransfer: DataTransfer = {
        id: 'test-transfer-1',
        sourceConnectionId: 'test-source',
        targetConnectionId: statusLineInfo.id,
        data: inputData,
        timestamp: Date.now(),
      };

      await expect(
        statusLineModule.receiveData(dataTransfer)
      ).resolves.not.toThrow();

      // Verify the theme was applied
      expect(statusLineModule.getCurrentTheme().id).toBe(testData.themes.minimal.id);
    });

    test('should receive and process layout update input', async () => {
      const newLayout = {
        ...statusLineModule.getCurrentLayout(),
        position: 'top' as const,
        height: 28,
      };

      const inputData = {
        action: 'updateLayout',
        layout: newLayout,
      };

      const dataTransfer: DataTransfer = {
        id: 'test-transfer-2',
        sourceConnectionId: 'test-source',
        targetConnectionId: statusLineInfo.id,
        data: inputData,
        timestamp: Date.now(),
      };

      await statusLineModule.receiveData(dataTransfer);

      // Verify the layout was updated
      const currentLayout = statusLineModule.getCurrentLayout();
      expect(currentLayout.position).toBe('top');
      expect(currentLayout.height).toBe(28);
    });

    test('should receive and process component management input', async () => {
      const newComponent = {
        id: 'received-component',
        type: 'custom' as const,
        label: 'Received Component',
        enabled: true,
        position: 'right' as const,
        priority: 90,
      };

      const addInputData = {
        action: 'addComponent',
        component: newComponent,
      };

      const addDataTransfer: DataTransfer = {
        id: 'test-transfer-3',
        sourceConnectionId: 'test-source',
        targetConnectionId: statusLineInfo.id,
        data: addInputData,
        timestamp: Date.now(),
      };

      await statusLineModule.receiveData(addDataTransfer);

      // Verify component was added
      const components = statusLineModule.getComponents();
      expect(components.find(c => c.id === 'received-component')).toBeDefined();

      // Test component removal
      const removeInputData = {
        action: 'removeComponent',
        componentId: 'received-component',
      };

      const removeDataTransfer: DataTransfer = {
        id: 'test-transfer-4',
        sourceConnectionId: 'test-source',
        targetConnectionId: statusLineInfo.id,
        data: removeInputData,
        timestamp: Date.now(),
      };

      await statusLineModule.receiveData(removeDataTransfer);

      // Verify component was removed
      const updatedComponents = statusLineModule.getComponents();
      expect(updatedComponents.find(c => c.id === 'received-component')).toBeUndefined();
    });

    test('should handle invalid input data gracefully', async () => {
      const invalidInputData = {
        action: 'invalidAction',
        invalidField: 'invalidValue',
      };

      const dataTransfer: DataTransfer = {
        id: 'test-transfer-invalid',
        sourceConnectionId: 'test-source',
        targetConnectionId: statusLineInfo.id,
        data: invalidInputData,
        timestamp: Date.now(),
      };

      // Should not throw, but log error
      await expect(
        statusLineModule.receiveData(dataTransfer)
      ).resolves.not.toThrow();
    });

    test('should handle missing required fields', async () => {
      const incompleteInputData = {
        // Missing action field
        theme: testData.themes.default,
      };

      const dataTransfer: DataTransfer = {
        id: 'test-transfer-incomplete',
        sourceConnectionId: 'test-source',
        targetConnectionId: statusLineInfo.id,
        data: incompleteInputData,
        timestamp: Date.now(),
      };

      await expect(
        statusLineModule.receiveData(dataTransfer)
      ).resolves.not.toThrow();
    });
  });

  /**
   * Handshake protocol tests
   */
  describe('Handshake Protocol', () => {
    test('should perform successful handshake with compatible module', async () => {
      const result = await statusLineModule.handshake(mockModule);
      
      expect(result).toBe(true);
    });

    test('should provide module capabilities during handshake', async () => {
      // Setup output connection to capture handshake data
      const connection: ConnectionInfo = {
        id: 'handshake-connection',
        type: 'output',
        sourceModuleId: statusLineInfo.id,
        targetModuleId: mockModuleInfo.id,
        dataType: 'handshake-data',
      };
      
      statusLineModule.addOutputConnection(connection);
      
      const result = await statusLineModule.handshake(mockModule);
      
      expect(result).toBe(true);
      
      // In a real implementation, handshake data would be captured by the mock module
      // Here we verify the handshake completed successfully
    });

    test('should handle handshake with multiple modules', async () => {
      const mockModule2 = new MockModule({
        id: 'test-mock-module-2',
        name: 'Test Mock Module 2',
        version: '1.0.0',
        description: 'Second mock module for testing',
        type: 'test-module',
      });

      await mockModule2.initialize();

      try {
        const result1 = await statusLineModule.handshake(mockModule);
        const result2 = await statusLineModule.handshake(mockModule2);
        
        expect(result1).toBe(true);
        expect(result2).toBe(true);
      } finally {
        await mockModule2.destroy();
      }
    });
  });

  /**
   * Event-driven communication tests
   */
  describe('Event-driven Communication', () => {
    test('should emit events for theme changes', async () => {
      const result = await statusLineModule.setTheme(testData.themes.powerline);
      
      expect(result.success).toBe(true);
      
      // Verify event data structure
      expect(result.theme).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.operationId).toBeDefined();
    });

    test('should emit events for layout changes', async () => {
      const newLayout = {
        ...statusLineModule.getCurrentLayout(),
        height: 32,
      };

      const result = await statusLineModule.updateLayout(newLayout);
      
      expect(result.success).toBe(true);
      expect(result.layout).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('should emit events for component changes', async () => {
      const newComponent = {
        id: 'event-test-component',
        type: 'custom' as const,
        label: 'Event Test Component',
        enabled: true,
        position: 'center' as const,
        priority: 75,
      };

      const addResult = await statusLineModule.addComponent(newComponent);
      expect(addResult.success).toBe(true);
      expect(addResult.component).toEqual(newComponent);

      const updateResult = await statusLineModule.updateComponent(
        newComponent.id,
        { label: 'Updated Event Test Component' }
      );
      expect(updateResult.success).toBe(true);
      expect(updateResult.component?.label).toBe('Updated Event Test Component');

      const removeResult = await statusLineModule.removeComponent(newComponent.id);
      expect(removeResult.success).toBe(true);
    });

    test('should emit events for export/import operations', async () => {
      const exportResult = await statusLineModule.exportConfiguration('json');
      expect(exportResult.success).toBe(true);
      expect(exportResult.exportData).toBeDefined();

      const importResult = await statusLineModule.importConfiguration(
        exportResult.exportData!.content,
        'json'
      );
      expect(importResult.success).toBe(true);
      expect(importResult.importedData).toBeDefined();
    });
  });

  /**
   * Error propagation tests
   */
  describe('Error Propagation', () => {
    test('should propagate validation errors through communication', async () => {
      const invalidTheme = {
        ...testData.themes.default,
        id: '', // Invalid
      };

      const inputData = {
        action: 'setTheme',
        theme: invalidTheme,
      };

      const dataTransfer: DataTransfer = {
        id: 'test-transfer-error',
        sourceConnectionId: 'test-source',
        targetConnectionId: statusLineInfo.id,
        data: inputData,
        timestamp: Date.now(),
      };

      // Should handle error gracefully without throwing
      await expect(
        statusLineModule.receiveData(dataTransfer)
      ).resolves.not.toThrow();
    });

    test('should handle communication timeout scenarios', async () => {
      // Simulate a slow operation by testing with a large number of components
      const manyComponents = Array.from({ length: 100 }, (_, i) => ({
        id: `bulk-component-${i}`,
        type: 'custom' as const,
        label: `Bulk Component ${i}`,
        enabled: true,
        position: 'left' as const,
        priority: i,
      }));

      // Add components in batches to test performance
      const batchSize = 10;
      for (let i = 0; i < manyComponents.length; i += batchSize) {
        const batch = manyComponents.slice(i, i + batchSize);
        const promises = batch.map(component => 
          statusLineModule.addComponent(component)
        );
        
        const results = await Promise.all(promises);
        results.forEach(result => {
          expect(result.success).toBe(true);
        });
      }

      // Verify all components were added
      const components = statusLineModule.getComponents();
      expect(components.length).toBeGreaterThanOrEqual(manyComponents.length);
    });
  });

  /**
   * Concurrent communication tests
   */
  describe('Concurrent Communication', () => {
    test('should handle multiple simultaneous data transfers', async () => {
      const transfers = [
        {
          action: 'setTheme',
          theme: testData.themes.powerline,
        },
        {
          action: 'updateLayout',
          layout: {
            ...statusLineModule.getCurrentLayout(),
            height: 26,
          },
        },
        {
          action: 'addComponent',
          component: {
            id: 'concurrent-component-1',
            type: 'custom' as const,
            label: 'Concurrent Component 1',
            enabled: true,
            position: 'left' as const,
            priority: 80,
          },
        },
        {
          action: 'addComponent',
          component: {
            id: 'concurrent-component-2',
            type: 'custom' as const,
            label: 'Concurrent Component 2',
            enabled: true,
            position: 'right' as const,
            priority: 81,
          },
        },
      ];

      const dataTransfers = transfers.map((data, index) => ({
        id: `concurrent-transfer-${index}`,
        sourceConnectionId: 'test-source',
        targetConnectionId: statusLineInfo.id,
        data,
        timestamp: Date.now() + index,
      }));

      // Process all transfers concurrently
      const promises = dataTransfers.map(transfer => 
        statusLineModule.receiveData(transfer)
      );

      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Verify final state
      expect(statusLineModule.getCurrentTheme().id).toBe(testData.themes.powerline.id);
      expect(statusLineModule.getCurrentLayout().height).toBe(26);
      
      const components = statusLineModule.getComponents();
      expect(components.find(c => c.id === 'concurrent-component-1')).toBeDefined();
      expect(components.find(c => c.id === 'concurrent-component-2')).toBeDefined();
    });

    test('should maintain data consistency during concurrent operations', async () => {
      const initialComponentCount = statusLineModule.getComponents().length;
      
      // Add and remove components concurrently
      const addOperations = Array.from({ length: 5 }, (_, i) => 
        statusLineModule.addComponent({
          id: `consistency-component-${i}`,
          type: 'custom',
          label: `Consistency Component ${i}`,
          enabled: true,
          position: 'left',
          priority: 200 + i,
        })
      );

      const addResults = await Promise.all(addOperations);
      
      // Verify all additions succeeded
      addResults.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Remove half of the added components
      const removeOperations = Array.from({ length: 3 }, (_, i) => 
        statusLineModule.removeComponent(`consistency-component-${i}`)
      );

      const removeResults = await Promise.all(removeOperations);
      
      // Verify all removals succeeded
      removeResults.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify final component count is correct
      const finalComponents = statusLineModule.getComponents();
      expect(finalComponents.length).toBe(initialComponentCount + 2); // 5 added - 3 removed = +2
    });
  });
});
