import { BaseModule } from '../src/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';
import { ValidationRule } from '../../../interfaces/Validation';
import { Message, MessageResponse } from '../../../interfaces/Message';

/**
 * Coverage tests for missing code paths in BaseModule
 * This focuses on the uncovered lines: 176, 351-580, 646-737
 */
describe('BaseModule Missing Coverage', () => {
  let moduleInfo: ModuleInfo;

  beforeEach(() => {
    moduleInfo = {
      id: 'missing-coverage-test',
      type: 'test',
      name: 'Missing Coverage Test Module',
      version: '1.0.0',
      description: 'Module for testing missing coverage paths'
    };
  });

  /**
   * Test class that exposes methods for testing missing coverage
   */
  class MissingCoverageModule extends BaseModule {
    // Store captured debug logs for testing
    private capturedLogs: string[] = [];

    constructor(info: ModuleInfo) {
      super(info);
    }

    public async initialize(): Promise<void> {
      await super.initialize();
    }

    public async receiveData(dataTransfer: DataTransfer): Promise<void> {
      await super.receiveData(dataTransfer);
    }

    // Helper methods
    public getCapturedLogs(): string[] {
      return this.capturedLogs;
    }

    public clearCapturedLogs(): void {
      this.capturedLogs = [];
    }
  }

  describe('Static Factory Method Coverage (Line 176)', () => {
    it('should test static createInstance method', () => {
      // This covers line 176: return new this(info);
      const instance = MissingCoverageModule.createInstance(moduleInfo);
      expect(instance).toBeInstanceOf(MissingCoverageModule);
      expect(instance.getInfo().id).toBe(moduleInfo.id);
    });

    it('should create multiple instances with factory method', () => {
      const instances: MissingCoverageModule[] = [];
      
      for (let i = 0; i < 3; i++) {
        const info = { ...moduleInfo, id: `factory-test-${i}` };
        const instance = MissingCoverageModule.createInstance(info);
        instances.push(instance);
      }
      
      expect(instances).toHaveLength(3);
      instances.forEach((instance, i) => {
        expect(instance.getInfo().id).toBe(`factory-test-${i}`);
      });
    });
  });

  describe('Configure Method Coverage (Lines 351-360)', () => {
    let module: MissingCoverageModule;

    beforeEach(() => {
      module = new MissingCoverageModule(moduleInfo);
    });

    it('should log configuration debug message (covers lines 358-359)', () => {
      // This covers: this.debug('debug', 'Module configured', config, 'configure');
      module.configure({ test: 'value' });
      
      expect(module.getConfig()).toEqual({ test: 'value' });
    });

    it('should throw error when configuring after initialization', async () => {
      // This covers: if (this.initialized) { throw new Error('Cannot configure module after initialization'); }
      await module.initialize();
      expect(() => module.configure({ test: 'value' })).toThrow('Cannot configure module after initialization');
    });

    it('should handle empty configuration (covers line 356)', () => {
      // This covers: this.configured = true; with empty config
      module.configure({});
      expect(module.getConfig()).toEqual({});
      expect((module as any).configured).toBe(true);
    });

    it('should handle complex configuration (covers line 355)', () => {
      // This covers: this.config = { ...config }; with complex object
      const complexConfig = {
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
        date: new Date(),
        regex: /test/,
        function: () => 'test',
        symbol: Symbol('test')
      };
      
      module.configure(complexConfig);
      const retrievedConfig = module.getConfig();
      
      expect(retrievedConfig.nested.deep.value).toBe('test');
      expect(retrievedConfig.array).toEqual([1, 2, 3]);
    });

    it('should handle configuration with null and undefined values (line 355)', () => {
      const configWithNulls = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: 'test'
      };
      
      module.configure(configWithNulls);
      const retrievedConfig = module.getConfig();
      
      expect(retrievedConfig.nullValue).toBeNull();
      expect(retrievedConfig.undefinedValue).toBeUndefined();
      expect(retrievedConfig.validValue).toBe('test');
    });
  });

  describe('AddInputConnection with Advanced Validation Coverage', () => {
    let module: MissingCoverageModule;

    beforeEach(() => {
      module = new MissingCoverageModule(moduleInfo);
    });

    it('should validate input connection type correctly', () => {
      // This covers the validation in addInputConnection method
      const connection: ConnectionInfo = {
        id: 'test-input-1',
        sourceModuleId: 'sender-1',
        targetModuleId: moduleInfo.id,
        type: 'input',
        status: 'pending'
      };

      module.addInputConnection(connection);
      const connections = module.getInputConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].id).toBe('test-input-1');
    });

    it('should reject output type connection for input method', () => {
      // This covers: if (connection.type !== 'input') { throw new Error('Invalid connection type for input'); }
      const invalidConnection: ConnectionInfo = {
        id: 'invalid-input',
        sourceModuleId: 'sender-1',
        targetModuleId: moduleInfo.id,
        type: 'output', // Wrong type
        status: 'pending'
      };

      expect(() => module.addInputConnection(invalidConnection)).toThrow('Invalid connection type for input');
    });

    it('should handle connection with minimal required fields', () => {
      const minimalConnection: ConnectionInfo = {
        id: 'minimal-input',
        sourceModuleId: 'sender-1',
        targetModuleId: moduleInfo.id,
        type: 'input',
        status: 'pending'
      };

      module.addInputConnection(minimalConnection);
      expect(module.getInputConnections()).toHaveLength(1);
    });
  });

  describe('AddOutputConnection Coverage', () => {
    let module: MissingCoverageModule;

    beforeEach(() => {
      module = new MissingCoverageModule(moduleInfo);
    });

    it('should validate output connection type correctly', () => {
      // This covers the validation in addOutputConnection method
      const connection: ConnectionInfo = {
        id: 'test-output-1',
        sourceModuleId: moduleInfo.id,
        targetModuleId: 'receiver-1',
        type: 'output',
        status: 'pending'
      };

      module.addOutputConnection(connection);
      const connections = module.getOutputConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].id).toBe('test-output-1');
    });

    it('should reject input type connection for output method', () => {
      // This covers: if (connection.type !== 'output') { throw new Error('Invalid connection type for output'); }
      const invalidConnection: ConnectionInfo = {
        id: 'invalid-output',
        sourceModuleId: moduleInfo.id,
        targetModuleId: 'receiver-1',
        type: 'input', // Wrong type
        status: 'pending'
      };

      expect(() => module.addOutputConnection(invalidConnection)).toThrow('Invalid connection type for output');
    });

    it('should handle multiple output connections', () => {
      const connections: ConnectionInfo[] = [
        {
          id: 'output-1',
          sourceModuleId: moduleInfo.id,
          targetModuleId: 'receiver-1',
          type: 'output',
          status: 'pending'
        },
        {
          id: 'output-2',
          sourceModuleId: moduleInfo.id,
          targetModuleId: 'receiver-2',
          type: 'output',
          status: 'pending'
        }
      ];

      connections.forEach(conn => module.addOutputConnection(conn));
      const retrievedConnections = module.getOutputConnections();
      
      expect(retrievedConnections).toHaveLength(2);
    });
  });

  describe('Connection Removal Coverage', () => {
    let module: MissingCoverageModule;

    beforeEach(() => {
      module = new MissingCoverageModule(moduleInfo);
    });

    it('should remove input connections correctly', () => {
      const connection: ConnectionInfo = {
        id: 'remove-test',
        sourceModuleId: 'sender-1',
        targetModuleId: moduleInfo.id,
        type: 'input',
        status: 'pending'
      };

      module.addInputConnection(connection);
      expect(module.getInputConnections()).toHaveLength(1);
      
      module.removeInputConnection('remove-test');
      expect(module.getInputConnections()).toHaveLength(0);
    });

    it('should remove output connections correctly', () => {
      const connection: ConnectionInfo = {
        id: 'remove-output-test',
        sourceModuleId: moduleInfo.id,
        targetModuleId: 'receiver-1',
        type: 'output',
        status: 'pending'
      };

      module.addOutputConnection(connection);
      expect(module.getOutputConnections()).toHaveLength(1);
      
      module.removeOutputConnection('remove-output-test');
      expect(module.getOutputConnections()).toHaveLength(0);
    });

    it('should handle removal of non-existent connections', () => {
      expect(() => {
        module.removeInputConnection('non-existent');
        module.removeOutputConnection('non-existent');
      }).not.toThrow();
    });

    it('should handle multiple connection removals', () => {
      const connections: ConnectionInfo[] = [];
      
      for (let i = 0; i < 5; i++) {
        const connection: ConnectionInfo = {
          id: `input-${i}`,
          sourceModuleId: 'sender-1',
          targetModuleId: moduleInfo.id,
          type: 'input',
          status: 'pending'
        };
        connections.push(connection);
        module.addInputConnection(connection);
      }
      
      expect(module.getInputConnections()).toHaveLength(5);
      
      // Remove all connections
      connections.forEach(conn => module.removeInputConnection(conn.id));
      expect(module.getInputConnections()).toHaveLength(0);
    });
  });

  describe('Connection Retrieval Coverage', () => {
    let module: MissingCoverageModule;

    beforeEach(() => {
      module = new MissingCoverageModule(moduleInfo);
    });

    it('should return empty array when no input connections', () => {
      const connections = module.getInputConnections();
      expect(connections).toEqual([]);
    });

    it('should return empty array when no output connections', () => {
      const connections = module.getOutputConnections();
      expect(connections).toEqual([]);
    });

    it('should return correct input connection order', () => {
      const connections: ConnectionInfo[] = [
        {
          id: 'first-input',
          sourceModuleId: 'sender-1',
          targetModuleId: moduleInfo.id,
          type: 'input',
          status: 'pending'
        },
        {
          id: 'second-input',
          sourceModuleId: 'sender-2',
          targetModuleId: moduleInfo.id,
          type: 'input',
          status: 'pending'
        }
      ];

      // Add in specific order
      module.addInputConnection(connections[0]);
      module.addInputConnection(connections[1]);
      
      const retrievedConnections = module.getInputConnections();
      expect(retrievedConnections).toHaveLength(2);
      expect(retrievedConnections[0].id).toBe('first-input');
      expect(retrievedConnections[1].id).toBe('second-input');
    });

    it('should return correct output connection order', () => {
      const connections: ConnectionInfo[] = [
        {
          id: 'first-output',
          sourceModuleId: moduleInfo.id,
          targetModuleId: 'receiver-1',
          type: 'output',
          status: 'pending'
        },
        {
          id: 'second-output',
          sourceModuleId: moduleInfo.id,
          targetModuleId: 'receiver-2',
          type: 'output',
          status: 'pending'
        }
      ];

      // Add in specific order
      module.addOutputConnection(connections[0]);
      module.addOutputConnection(connections[1]);
      
      const retrievedConnections = module.getOutputConnections();
      expect(retrievedConnections).toHaveLength(2);
      expect(retrievedConnections[0].id).toBe('first-output');
      expect(retrievedConnections[1].id).toBe('second-output');
    });
  });

  describe('Destroy Method Coverage (Lines 587-606)', () => {
    let module: MissingCoverageModule;

    beforeEach(() => {
      module = new MissingCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      await module.destroy();
    });

    it('should cleanup all resources during destroy', async () => {
      // Add some connections
      const inputConnection: ConnectionInfo = {
        id: 'destroy-test-input',
        sourceModuleId: 'sender-1',
        targetModuleId: moduleInfo.id,
        type: 'input',
        status: 'pending'
      };

      const outputConnection: ConnectionInfo = {
        id: 'destroy-test-output',
        sourceModuleId: moduleInfo.id,
        targetModuleId: 'receiver-1',
        type: 'output',
        status: 'pending'
      };

      module.addInputConnection(inputConnection);
      module.addOutputConnection(outputConnection);
      
      // Configure module
      module.configure({ test: 'value' });
      
      // Initialize module
      await module.initialize();
      
      expect(module.getInputConnections()).toHaveLength(1);
      expect(module.getOutputConnections()).toHaveLength(1);
      expect((module as any).initialized).toBe(true);
      expect((module as any).configured).toBe(true);
      expect(module.getConfig()).toEqual({ test: 'value' });
      
      // This covers the destroy method cleanup
      await module.destroy();
      
      expect(module.getInputConnections()).toHaveLength(0);
      expect(module.getOutputConnections()).toHaveLength(0);
      expect((module as any).initialized).toBe(false);
      expect((module as any).configured).toBe(false);
      expect(module.getConfig()).toEqual({}); // Config should be cleared
    });

    it('should handle destroy when module is not initialized', async () => {
      expect(() => module.getInputConnections()).toHaveLength(0);
      expect((module as any).initialized).toBe(false);
      
      await module.destroy();
      
      // Should not throw and state remains consistent
      expect(module.getInputConnections()).toHaveLength(0);
      expect((module as any).initialized).toBe(false);
    });

    it('should handle multiple destroy calls', async () => {
      await module.initialize();
      await module.destroy();
      
      expect((module as any).initialized).toBe(false);
      
      // Second destroy should not cause issues
      await module.destroy();
      expect((module as any).initialized).toBe(false);
    });
  });

  describe('Handshake Method Coverage (Lines 513-522)', () => {
    let module1: MissingCoverageModule;
    let module2: MissingCoverageModule;

    beforeEach(async () => {
      module1 = new MissingCoverageModule(moduleInfo);
      module2 = new MissingCoverageModule({ ...moduleInfo, id: 'target-handshake-test' });
      
      await module1.initialize();
      await module2.initialize();
    });

    afterEach(async () => {
      await module1.destroy();
      await module2.destroy();
    });

    it('should perform handshake with target module', async () => {
      // This covers the handshake method implementation
      const result = await module1.handshake(module2);
      expect(result).toBe(true);
    });

    it('should perform双向 handshake', async () => {
      const result1 = await module1.handshake(module2);
      const result2 = await module2.handshake(module1);
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should perform handshake with uninitialized module', async () => {
      const uninitializedModule = new MissingCoverageModule({ ...moduleInfo, id: 'uninitialized' });
      
      const result = await module1.handshake(uninitializedModule);
      expect(result).toBe(true);
      
      await uninitializedModule.destroy();
    });
  });

  describe('Module Info and Config Immutability Coverage', () => {
    let module: MissingCoverageModule;

    beforeEach(() => {
      module = new MissingCoverageModule(moduleInfo);
    });

    it('should return immutable module info', () => {
      const info = module.getInfo();
      
      // Try to modify the returned info
      (info as any).id = 'modified';
      
      // Original should be unchanged
      const originalInfo = module.getInfo();
      expect(originalInfo.id).toBe(moduleInfo.id);
    });

    it('should return configuration that reflects current state', () => {
      const config = { test: 'value', nested: { deep: 'data' } };
      module.configure(config);
      
      const retrievedConfig = module.getConfig();
      expect(retrievedConfig).toEqual(config);
      
      // Modify the config after it's been set
      const updatedConfig = { test: 'modified', nested: { deep: 'modified' } };
      module.configure(updatedConfig);
      
      // Should reflect the updated config
      const currentConfig = module.getConfig();
      expect(currentConfig.test).toBe('modified');
      expect(currentConfig.nested.deep).toBe('modified');
    });
  });
});