import { BaseModule } from '../../BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';
import { ValidationRule } from '../../../interfaces/Validation';
import { Message, MessageResponse } from '../../../interfaces/Message';

/**
 * Final coverage tests for BaseModule - Focus on missing lines
 * Target lines: 176, 351-580, 646-737
 */
describe('BaseModule Final Coverage', () => {
  let moduleInfo: ModuleInfo;

  beforeEach(() => {
    moduleInfo = {
      id: 'final-coverage-test',
      type: 'test',
      name: 'Final Coverage Test Module',
      version: '1.0.0',
      description: 'Module for final coverage testing'
    };
  });

  /**
   * Test implementation focusing on uncovered lines
   */
  class FinalCoverageModule extends BaseModule {
    constructor(info: ModuleInfo) {
      super(info);
    }

    public async initialize(): Promise<void> {
      await super.initialize();
    }

    public async receiveData(dataTransfer: DataTransfer): Promise<void> {
      await super.receiveData(dataTransfer);
    }

    // Configuration access
    public setBasicDebugConfig() {
      // Use public API if available, otherwise skip debug config tests
    }

    public validateInputDirect(data: any) {
      return (this as any).validateInput(data);
    }

    public async transferDataDirect(data: any, targetConnectionId?: string): Promise<void> {
      return (this as any).transferData(data, targetConnectionId);
    }

    public getDebugLogsDirect() {
      return (this as any).getDebugLogs();
    }

    public clearDebugLogsDirect() {
      return (this as any).clearDebugLogs();
    }

    public sendMessageDirect(
      type: string,
      payload: any,
      target?: string,
      metadata?: Record<string, any>,
      ttl?: number,
      priority?: number
    ): void {
      (this as any).sendMessage(type, payload, target, metadata, ttl, priority);
    }

    public async sendRequestDirect(
      type: string,
      payload: any,
      target: string,
      timeout: number = 30000,
      metadata?: Record<string, any>,
      ttl?: number,
      priority?: number
    ): Promise<MessageResponse> {
      return (this as any).sendRequest(type, payload, target, timeout, metadata, ttl, priority);
    }

    public sendRequestAsyncDirect(
      type: string,
      payload: any,
      target: string,
      callback: (response: MessageResponse) => void,
      timeout: number = 30000,
      metadata?: Record<string, any>,
      ttl?: number,
      priority?: number
    ): void {
      (this as any).sendRequestAsync(type, payload, target, callback, timeout, metadata, ttl, priority);
    }

    public getIsInitialized() {
      return this.initialized;
    }

    public getIsConfigured() {
      return this.configured;
    }

    public getInfoPublic() {
      return this.getInfo();
    }

    public getConfigPublic() {
      return this.getConfig();
    }
  }

  describe('Line 176 - Static Factory Method Coverage', () => {
    it('should create instance using createInstance method', () => {
      // This directly covers line 176: return new this(info);
      const instance = FinalCoverageModule.createInstance(moduleInfo);
      expect(instance).toBeInstanceOf(FinalCoverageModule);
      expect(instance.getInfoPublic().id).toBe(moduleInfo.id);
    });
  });

  describe('Lines 351-360 - Configuration Method Coverage', () => {
    let module: FinalCoverageModule;

    beforeEach(() => {
      module = new FinalCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      try {
        await module.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
    });

    it('should throw error when configuring after initialization (covers lines 351-353)', async () => {
      await module.initialize();
      expect(module.getIsInitialized()).toBe(true);

      expect(() => module.configure({ test: 'value' }))
        .toThrow('Cannot configure module after initialization');
    });

    it('should handle complex configuration objects (covers line 355)', () => {
      const complexConfig = {
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined
      };

      module.configure(complexConfig);
      const retrievedConfig = module.getConfigPublic();
      
      expect(retrievedConfig.nested.deep.value).toBe('test');
      expect(retrievedConfig.array).toEqual([1, 2, 3]);
      expect(retrievedConfig.nullValue).toBeNull();
    });

    it('should set configured flag (covers line 356)', () => {
      expect(module.getIsConfigured()).toBe(false);
      module.configure({ test: 'value' });
      expect(module.getIsConfigured()).toBe(true);
    });
  });

  describe('Lines 382-394 - Initialization Method Coverage', () => {
    let module: FinalCoverageModule;

    beforeEach(() => {
      module = new FinalCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      try {
        await module.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
    });

    it('should log warning when initializing without configuration (covers lines 383-385)', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      await module.initialize();
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Module ${moduleInfo.id} is being initialized without configuration`);
      consoleWarnSpy.mockRestore();
    });

    it('should set initialization flag (covers line 391)', async () => {
      expect(module.getIsInitialized()).toBe(false);
      await module.initialize();
      expect(module.getIsInitialized()).toBe(true);
    });
  });

  describe('Lines 401-433 - Connection Management Coverage', () => {
    let module: FinalCoverageModule;

    beforeEach(() => {
      module = new FinalCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      try {
        await module.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
    });

    it('should validate input connection type and throw error (covers lines 402-404)', () => {
      const invalidConnection: ConnectionInfo = {
        id: 'invalid-input',
        sourceModuleId: 'sender-1',
        targetModuleId: moduleInfo.id,
        type: 'output', // Wrong type for input connection
        status: 'pending'
      };

      expect(() => module.addInputConnection(invalidConnection))
        .toThrow('Invalid connection type for input');
    });

    it('should validate output connection type and throw error (covers lines 413-415)', () => {
      const invalidConnection: ConnectionInfo = {
        id: 'invalid-output',
        sourceModuleId: moduleInfo.id,
        targetModuleId: 'receiver-1',
        type: 'input', // Wrong type for output connection
        status: 'pending'
      };

      expect(() => module.addOutputConnection(invalidConnection))
        .toThrow('Invalid connection type for output');
    });

    it('should handle removing non-existent connections (covers lines 423-433)', () => {
      expect(() => {
        module.removeInputConnection('non-existent');
        module.removeOutputConnection('non-existent');
      }).not.toThrow();
    });
  });

  describe('Lines 456-506 - Data Validation Coverage', () => {
    let module: FinalCoverageModule;

    beforeEach(() => {
      module = new FinalCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      try {
        await module.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
    });

    it('should validate all rule types with failing cases (covers validation logic)', () => {
      // Set validation rules directly
      (module as any).validationRules = [
        { field: 'requiredField', type: 'required', message: 'Required field missing' },
        { field: 'stringField', type: 'string', message: 'String field invalid' },
        { field: 'numberField', type: 'number', message: 'Number field invalid' },
        { field: 'booleanField', type: 'boolean', message: 'Boolean field invalid' },
        { field: 'objectField', type: 'object', message: 'Object field invalid' },
        { field: 'arrayField', type: 'array', message: 'Array field invalid' },
        { field: 'customField', type: 'custom', message: 'Custom validation failed', validator: () => false }
      ];

      // Test data that fails all validations
      const invalidData = {
        requiredField: null,
        stringField: 123,
        numberField: 'not a number',
        booleanField: 'not boolean',
        objectField: 'not object',
        arrayField: 'not array',
        customField: 'any value'
      };

      const result = module.validateInputDirect(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(7);
    });

    it('should handle custom validator edge cases (covers lines 493-497)', () => {
      const testData = { testField: 'value' };

      // Test validator returning falsy value (which should trigger validation error)
      (module as any).validationRules = [
        { field: 'testField', type: 'custom', message: 'Validator returned falsy', validator: () => false }
      ];
      
      const result = module.validateInputDirect(testData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Validator returned falsy');
    });
  });

  describe('Lines 529-582 - Data Transfer Coverage', () => {
    let module: FinalCoverageModule;

    beforeEach(() => {
      module = new FinalCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      try {
        await module.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
    });

    it('should throw error when transferring to non-existent connection (covers lines 536-538)', async () => {
      await expect(module.transferDataDirect({ data: 'test' }, 'non-existent-connection'))
        .rejects.toThrow("Output connection with ID 'non-existent-connection' not found");
    });
  });

  describe('Lines 587-606 - Destroy Method Coverage', () => {
    let module: FinalCoverageModule;

    beforeEach(() => {
      module = new FinalCoverageModule(moduleInfo);
    });

    it('should clean up all connections (covers lines 588-590)', async () => {
      const inputConnection: ConnectionInfo = {
        id: 'input-connection',
        sourceModuleId: 'sender',
        targetModuleId: moduleInfo.id,
        type: 'input',
        status: 'pending'
      };

      const outputConnection: ConnectionInfo = {
        id: 'output-connection',
        sourceModuleId: moduleInfo.id,
        targetModuleId: 'receiver',
        type: 'output',
        status: 'pending'
      };

      module.addInputConnection(inputConnection);
      module.addOutputConnection(outputConnection);
      
      expect(module.getInputConnections()).toHaveLength(1);
      expect(module.getOutputConnections()).toHaveLength(1);
      
      await module.destroy();
      
      expect(module.getInputConnections()).toHaveLength(0);
      expect(module.getOutputConnections()).toHaveLength(0);
    });

    it('should reset state flags (covers lines 591-593)', async () => {
      module.configure({ test: 'value' });
      await module.initialize();
      
      expect(module.getIsInitialized()).toBe(true);
      expect(module.getIsConfigured()).toBe(true);
      
      await module.destroy();
      
      expect(module.getIsInitialized()).toBe(false);
      expect(module.getIsConfigured()).toBe(false);
    });
  });

  describe('Lines 617-737 - Message System Coverage', () => {
    let module: FinalCoverageModule;

    beforeEach(() => {
      module = new FinalCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      try {
        await module.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
    });

    // Note: Full message system testing requires integration with MessageCenter
    // These tests focus on method coverage rather than full integration
    
    it('should handle sendMessage call without crashing (basic coverage)', () => {
      expect(() => {
        module.sendMessageDirect('test-message', { data: 'test' }, 'non-existent-target');
      }).not.toThrow();
    });

    it('should handle sendRequest call without crashing (basic coverage)', async () => {
      await expect(module.sendRequestDirect('test-request', { data: 'test' }, 'non-existent-target', 100))
        .rejects.toThrow(); // Expected to fail due to non-existent target
    });

    it('should handle sendRequestAsync call without crashing (basic coverage)', () => {
      expect(() => {
        // Mock the callback to avoid async issues
        const mockCallback = jest.fn();
        module.sendRequestAsyncDirect(
          'test-async-request', 
          { data: 'test' }, 
          'non-existent-target',
          mockCallback,
          100
        );
      }).not.toThrow();
    });
  });

  describe('HandleMessage Coverage (Lines 765-789)', () => {
    let module: FinalCoverageModule;

    beforeEach(() => {
      module = new FinalCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      try {
        await module.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
    });

    it('should handle ping message (covers lines 771-778)', async () => {
      const pingMessage: Message = {
        id: 'ping-test',
        type: 'ping',
        source: 'test-source',
        target: moduleInfo.id,
        payload: {},
        timestamp: Date.now()
      };

      const response = await module.handleMessage(pingMessage);
      
      expect(response).toBeDefined();
      if (response) {
        expect((response as MessageResponse).success).toBe(true);
        expect((response as MessageResponse).data).toEqual(
          expect.objectContaining({
            pong: true,
            moduleId: moduleInfo.id
          })
        );
      }
    });

    it('should handle unhandled message types (covers lines 779-787)', async () => {
      const unknownMessage: Message = {
        id: 'unknown-test',
        type: 'unknown-type',
        source: 'test-source',
        target: moduleInfo.id,
        payload: {},
        timestamp: Date.now()
      };

      const response = await module.handleMessage(unknownMessage);
      
      expect(response).toBeDefined();
      if (response) {
        expect((response as MessageResponse).success).toBe(false);
        expect((response as MessageResponse).error).toContain('Unhandled message type');
      }
    });
  });

  describe('Lifecycle Events Coverage (Lines 795-805)', () => {
    let module: FinalCoverageModule;

    beforeEach(() => {
      module = new FinalCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      try {
        await module.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
    });

    it('should handle module registration event (covers lines 795-797)', () => {
      expect(() => {
        module.onModuleRegistered('test-module');
      }).not.toThrow();
    });

    it('should handle module unregistration event (covers lines 803-805)', () => {
      expect(() => {
        module.onModuleUnregistered('test-module');
      }).not.toThrow();
    });
  });
});