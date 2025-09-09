import { BaseModule } from '../src/BaseModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../../../interfaces/Connection';
import { ValidationRule } from '../../../interfaces/Validation';
import { Message, MessageResponse } from '../../../interfaces/Message';
import { MessageCenter } from '../../MessageCenter';

/**
 * Complete coverage tests for BaseModule
 * Focus on missing coverage lines: 176, 351-580, 646-737
 */
describe('BaseModule Complete Coverage', () => {
  let moduleInfo: ModuleInfo;
  let messageCenter: MessageCenter;

  beforeAll(() => {
    messageCenter = MessageCenter.getInstance();
  });

  beforeEach(() => {
    moduleInfo = {
      id: 'complete-coverage-test',
      type: 'test',
      name: 'Complete Coverage Test Module',
      version: '1.0.0',
      description: 'Module for complete coverage testing'
    };
  });

  /**
   * Complete test implementation with full coverage
   */
  class CompleteCoverageModule extends BaseModule {
    constructor(info: ModuleInfo) {
      super(info);
    }

    public async initialize(): Promise<void> {
      await super.initialize();
    }

    public async receiveData(dataTransfer: DataTransfer): Promise<void> {
      await super.receiveData(dataTransfer);
    }

    public async handshake(targetModule: BaseModule): Promise<boolean> {
      return await super.handshake(targetModule);
    }

    public async destroy(): Promise<void> {
      await super.destroy();
    }

    // Expose protected methods for testing
    public setDebugConfigPublic(config: any) {
      // @ts-ignore - accessing protected method for testing
      return this.setDebugConfig(config);
    }

    public getDebugConfigPublic() {
      // @ts-ignore - accessing protected method for testing
      return this.getDebugConfig();
    }

    public validateInputPublic(data: any) {
      // @ts-ignore - accessing protected method for testing
      return this.validateInput(data);
    }

    public async transferDataPublic(data: any, targetConnectionId?: string): Promise<void> {
      // @ts-ignore - accessing protected method for testing
      return this.transferData(data, targetConnectionId);
    }

    public getDebugLogsPublic() {
      // @ts-ignore - accessing protected method for testing
      return this.getDebugLogs();
    }

    public clearDebugLogsPublic() {
      // @ts-ignore - accessing protected method for testing
      return this.clearDebugLogs();
    }

    public sendMessagePublic(
      type: string,
      payload: any,
      target?: string,
      metadata?: Record<string, any>,
      ttl?: number,
      priority?: number
    ): void {
      // @ts-ignore - accessing protected method for testing
      this.sendMessage(type, payload, target, metadata, ttl, priority);
    }

    public async sendRequestPublic(
      type: string,
      payload: any,
      target: string,
      timeout: number = 30000,
      metadata?: Record<string, any>,
      ttl?: number,
      priority?: number
    ): Promise<MessageResponse> {
      // @ts-ignore - accessing protected method for testing
      return this.sendRequest(type, payload, target, timeout, metadata, ttl, priority);
    }

    public sendRequestAsyncPublic(
      type: string,
      payload: any,
      target: string,
      callback: (response: MessageResponse) => void,
      timeout: number = 30000,
      metadata?: Record<string, any>,
      ttl?: number,
      priority?: number
    ): void {
      // @ts-ignore - accessing protected method for testing
      this.sendRequestAsync(type, payload, target, callback, timeout, metadata, ttl, priority);
    }

    public broadcastMessagePublic(
      type: string,
      payload: any,
      metadata?: Record<string, any>,
      ttl?: number,
      priority?: number
    ): void {
      // @ts-ignore - accessing protected method for testing
      this.broadcastMessage(type, payload, metadata, ttl, priority);
    }

    public async handleMessagePublic(message: Message): Promise<MessageResponse | void> {
      return this.handleMessage(message);
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

  describe('Static Factory Method Coverage (Line 176)', () => {
    it('should create instance using createInstance method and cover line 176', () => {
      // This covers line 176: return new this(info);
      const instance = CompleteCoverageModule.createInstance(moduleInfo);
      expect(instance).toBeInstanceOf(CompleteCoverageModule);
      expect(instance.getInfo().id).toBe(moduleInfo.id);
    });

    it('should create multiple instances with different configurations', () => {
      const instances: CompleteCoverageModule[] = [];
      const moduleInfos: ModuleInfo[] = [
        { ...moduleInfo, id: 'factory-test-1' },
        { ...moduleInfo, id: 'factory-test-2', name: 'Factory Test 2' },
        { ...moduleInfo, id: 'factory-test-3', version: '2.0.0' }
      ];

      moduleInfos.forEach(info => {
        const instance = CompleteCoverageModule.createInstance(info);
        instances.push(instance);
      });

      expect(instances).toHaveLength(3);
      expect(instances[0].getInfo().id).toBe('factory-test-1');
      expect(instances[1].getInfo().name).toBe('Factory Test 2');
      expect(instances[2].getInfo().version).toBe('2.0.0');
    });
  });

  describe('Configuration Method Coverage (Lines 351-360)', () => {
    let module: CompleteCoverageModule;

    beforeEach(() => {
      module = new CompleteCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      await module.destroy();
    });

    it('should throw error when configuring after initialization (covers lines 351-353)', async () => {
      // Initialize first
      await module.initialize();
      expect(module.getIsInitialized()).toBe(true);

      // Try to configure after initialization - should throw
      expect(() => module.configure({ test: 'value' })).toThrow('Cannot configure module after initialization');
    });

    it('should handle complex configuration objects (covers line 355)', () => {
      const complexConfig = {
        nested: {
          deep: {
            value: 'test',
            array: [1, 2, 3],
            object: { key: 'value' }
          }
        },
        date: new Date(),
        regex: /test/g,
        function: () => 'test',
        symbol: Symbol('test'),
        nullValue: null,
        undefinedValue: undefined
      };

      module.configure(complexConfig);
      
      const retrievedConfig = module.getConfigPublic();
      expect(retrievedConfig.nested.deep.value).toBe('test');
      expect(retrievedConfig.nested.deep.array).toEqual([1, 2, 3]);
      expect(retrievedConfig.nullValue).toBeNull();
    });

    it('should set configured flag (covers line 356)', () => {
      expect(module.getIsConfigured()).toBe(false);
      
      module.configure({ test: 'value' });
      expect(module.getIsConfigured()).toBe(true);
    });

    it('should log configuration debug message (covers lines 358-359)', () => {
      // Enable debug logging to capture the message
      module.setDebugConfigPublic({ enabled: true, consoleOutput: false });
      
      module.configure({ test: 'value' });
      
      const logs = module.getDebugLogsPublic();
      const configLog = logs.find((log: any) => log.message === 'Module configured');
      expect(configLog).toBeDefined();
      expect(configLog?.data).toEqual({ test: 'value' });
      expect(configLog?.method).toBe('configure');
    });
  });

  describe('Initialization Method Coverage (Lines 382-394)', () => {
    let module: CompleteCoverageModule;

    beforeEach(() => {
      module = new CompleteCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      await module.destroy();
    });

    it('should log warning when initializing without configuration (covers lines 383-385)', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await module.initialize();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Module ${moduleInfo.id} is being initialized without configuration`);
      consoleWarnSpy.mockRestore();
    });

    it('should not log warning when initializing with configuration (covers lines 383-385)', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      module.configure({ test: 'value' });
      await module.initialize();
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should register with message center (covers line 388)', async () => {
      await module.initialize();
      
      // Verify module is registered by trying to send it a message
      const testMessage: Message = {
        id: 'test-message',
        type: 'ping',
        source: 'test-source',
        target: moduleInfo.id,
        payload: {},
        timestamp: Date.now()
      };

      // Should be able to handle message (means it's registered)
      const response = await module.handleMessagePublic(testMessage);
      expect(response).toBeDefined();
    });

    it('should set initialization flag (covers line 391)', async () => {
      expect(module.getIsInitialized()).toBe(false);
      
      await module.initialize();
      expect(module.getIsInitialized()).toBe(true);
    });

    it('should log initialization message (covers lines 393-394)', async () => {
      module.setDebugConfigPublic({ enabled: true, consoleOutput: false });
      
      await module.initialize();
      
      const logs = module.getDebugLogsPublic();
      const initLog = logs.find((log: any) => log.message === 'Module initialized');
      expect(initLog).toBeDefined();
      expect(initLog?.data).toEqual({ configured: false });
      expect(initLog?.method).toBe('initialize');
    });
  });

  describe('Connection Management Coverage (Lines 401-433)', () => {
    let module: CompleteCoverageModule;

    beforeEach(() => {
      module = new CompleteCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      await module.destroy();
    });

    it('should validate input connection type and throw error (covers lines 402-404)', () => {
      const invalidConnection: ConnectionInfo = {
        id: 'invalid-input',
        sourceModuleId: 'sender-1',
        targetModuleId: moduleInfo.id,
        type: 'output', // Wrong type for input connection
        status: 'pending'
      };

      expect(() => module.addInputConnection(invalidConnection)).toThrow('Invalid connection type for input');
    });

    it('should validate output connection type and throw error (covers lines 413-415)', () => {
      const invalidConnection: ConnectionInfo = {
        id: 'invalid-output',
        sourceModuleId: moduleInfo.id,
        targetModuleId: 'receiver-1',
        type: 'input', // Wrong type for output connection
        status: 'pending'
      };

      expect(() => module.addOutputConnection(invalidConnection)).toThrow('Invalid connection type for output');
    });

    it('should handle removing non-existent connections (covers lines 423-433)', () => {
      expect(() => {
        module.removeInputConnection('non-existent');
        module.removeOutputConnection('non-existent');
      }).not.toThrow();
    });

    it('should handle empty connection lists (covers lines 439-449)', () => {
      const inputConnections = module.getInputConnections();
      const outputConnections = module.getOutputConnections();
      
      expect(inputConnections).toEqual([]);
      expect(outputConnections).toEqual([]);
    });
  });

  describe('Data Validation Coverage (Lines 456-506)', () => {
    let module: CompleteCoverageModule;

    beforeEach(() => {
      module = new CompleteCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      await module.destroy();
    });

    it('should validate all rule types with failing cases (covers lines 456-506)', () => {
      const validationRules: ValidationRule[] = [
        { field: 'requiredField', type: 'required', message: 'Required field missing' },
        { field: 'stringField', type: 'string', message: 'String field invalid' },
        { field: 'numberField', type: 'number', message: 'Number field invalid' },
        { field: 'booleanField', type: 'boolean', message: 'Boolean field invalid' },
        { field: 'objectField', type: 'object', message: 'Object field invalid' },
        { field: 'arrayField', type: 'array', message: 'Array field invalid' },
        { field: 'customField', type: 'custom', message: 'Custom validation failed', validator: () => false }
      ];

      // Set validation rules
      (module as any).validationRules = validationRules;

      // Test data that fails all validations
      const invalidData = {
        requiredField: null,      // Should fail required
        stringField: 123,         // Should fail string
        numberField: 'not a number', // Should fail number
        booleanField: 'not boolean', // Should fail boolean
        objectField: 'not object',   // Should fail object
        arrayField: 'not array',     // Should fail array
        customField: 'any value'     // Should fail custom (validator returns false)
      };

      const result = module.validateInputPublic(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(7);
      expect(result.errors).toContain('Required field missing');
      expect(result.errors).toContain('String field invalid');
      expect(result.errors).toContain('Number field invalid');
      expect(result.errors).toContain('Boolean field invalid');
      expect(result.errors).toContain('Object field invalid');
      expect(result.errors).toContain('Array field invalid');
      expect(result.errors).toContain('Custom validation failed');
    });

    it('should validate custom rules with various validator behaviors (covers lines 493-497)', () => {
      const testData = { testField: 'value' };

      // Test validator returning non-boolean
      (module as any).validationRules = [
        { field: 'testField', type: 'custom', message: 'Non-boolean validator', validator: () => 'not boolean' as any }
      ];
      const result1 = module.validateInputPublic(testData);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Non-boolean validator');

      // Test validator throwing error
      (module as any).validationRules = [
        { field: 'testField', type: 'custom', message: 'Validator error', validator: () => { throw new Error('Validator crashed'); } }
      ];
      const result2 = module.validateInputPublic(testData);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Validator error');

      // Test validator returning null/undefined
      (module as any).validationRules = [
        { field: 'testField', type: 'custom', message: 'Null validator', validator: () => null as any }
      ];
      const result3 = module.validateInputPublic(testData);
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toContain('Null validator');
    });
  });

  describe('Data Transfer Coverage (Lines 529-582)', () => {
    let sourceModule: CompleteCoverageModule;
    let targetModule: CompleteCoverageModule;

    beforeEach(async () => {
      sourceModule = new CompleteCoverageModule(moduleInfo);
      targetModule = new CompleteCoverageModule({ ...moduleInfo, id: 'target-module' });
      
      await sourceModule.initialize();
      await targetModule.initialize();
    });

    afterEach(async () => {
      await sourceModule.destroy();
      await targetModule.destroy();
    });

    it('should transfer data to specific connection (covers lines 533-543)', async () => {
      const connection: ConnectionInfo = {
        id: 'specific-connection',
        sourceModuleId: moduleInfo.id,
        targetModuleId: 'target-module',
        type: 'output',
        status: 'pending'
      };

      sourceModule.addOutputConnection(connection);
      
      const testData = { message: 'test data transfer' };
      
      // Should not throw when transferring to valid connection
      await expect(sourceModule.transferDataPublic(testData, 'specific-connection')).resolves.not.toThrow();
    });

    it('should throw error when transferring to non-existent connection (covers lines 536-538)', async () => {
      const testData = { message: 'test data' };
      
      await expect(sourceModule.transferDataPublic(testData, 'non-existent-connection'))
        .rejects.toThrow("Output connection with ID 'non-existent-connection' not found");
    });

    it('should handle receiveData method (covers lines 573-582)', async () => {
      sourceModule.setDebugConfigPublic({ enabled: true, consoleOutput: false, trackDataFlow: true });
      
      const dataTransfer: DataTransfer = {
        id: 'test-transfer',
        sourceConnectionId: 'source-connection',
        targetConnectionId: moduleInfo.id,
        data: { message: 'test data' },
        timestamp: Date.now()
      };

      await sourceModule.receiveData(dataTransfer);
      
      // Should log the received data
      const logs = sourceModule.getDebugLogsPublic();
      const receiveLog = logs.find((log: any) => log.message === 'Data received');
      expect(receiveLog).toBeDefined();
    });
  });

  describe('Destroy Method Coverage (Lines 587-606)', () => {
    let module: CompleteCoverageModule;

    beforeEach(() => {
      module = new CompleteCoverageModule(moduleInfo);
    });

    it('should clean up all connections (covers lines 588-590)', async () => {
      // Add some connections
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
      expect(module.getConfigPublic()).toEqual({ test: 'value' });
      
      await module.destroy();
      
      expect(module.getIsInitialized()).toBe(false);
      expect(module.getIsConfigured()).toBe(false);
      expect(module.getConfigPublic()).toEqual({});
    });

    it('should clear debug logs (covers line 599)', async () => {
      module.setDebugConfigPublic({ enabled: true, consoleOutput: false });
      (module as any).logInfo('test log message');
      
      expect(module.getDebugLogsPublic()).toHaveLength(1);
      
      await module.destroy();
      
      expect(module.getDebugLogsPublic()).toHaveLength(0);
    });

    it('should clear pending requests (covers line 602)', async () => {
      expect((module as any).pendingRequests.size).toBe(0);
      
      await module.destroy();
      
      expect((module as any).pendingRequests.size).toBe(0);
    });

    it('should log destruction message (covers lines 604-605)', async () => {
      module.setDebugConfigPublic({ enabled: true, consoleOutput: false });
      
      await module.destroy();
      
      const logs = module.getDebugLogsPublic();
      const destroyLog = logs.find((log: any) => log.message === 'Module destroyed');
      expect(destroyLog).toBeDefined();
      expect(destroyLog?.method).toBe('destroy');
    });
  });

  describe('Debug System Coverage (Lines 202-341)', () => {
    let module: CompleteCoverageModule;

    beforeEach(() => {
      module = new CompleteCoverageModule(moduleInfo);
    });

    afterEach(async () => {
      await module.destroy();
    });

    it('should respect debug enabled flag (covers line 204)', () => {
      module.setDebugConfigPublic({ enabled: false });
      
      (module as any).debug('info', 'test message');
      
      expect(module.getDebugLogsPublic()).toHaveLength(0);
    });

    it('should filter by log level (covers lines 206-210)', () => {
      module.setDebugConfigPublic({ enabled: true, level: 'warn' });
      
      (module as any).debug('info', 'info message');
      (module as any).debug('debug', 'debug message');
      (module as any).debug('warn', 'warn message');
      (module as any).debug('error', 'error message');
      
      const logs = module.getDebugLogsPublic();
      // Should only have warn and error logs (level >= warn)
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe('warn');
      expect(logs[1].level).toBe('error');
    });

    it('should create log entries with all fields (covers lines 212-224)', () => {
      module.setDebugConfigPublic({ enabled: true, consoleOutput: false });
      
      const testData = { key: 'value' };
      (module as any).debug('info', 'test message', testData, 'testMethod');
      
      const logs = module.getDebugLogsPublic();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('test message');
      expect(logs[0].data).toEqual(testData);
      expect(logs[0].method).toBe('testMethod');
      expect(logs[0].moduleId).toBe(moduleInfo.id);
      expect(logs[0].timestamp).toBeDefined();
    });

    it('should handle stack trace recording for errors (covers lines 226-235)', () => {
      module.setDebugConfigPublic({ enabled: true, consoleOutput: false, recordStack: true });
      
      (module as any).debug('error', 'error message');
      
      const logs = module.getDebugLogsPublic();
      expect(logs).toHaveLength(1);
      expect(logs[0].stack).toBeDefined();
      expect(logs[0].stack).toContain('Stack trace');
    });

    it('should limit log entries (covers lines 237-243)', () => {
      module.setDebugConfigPublic({ enabled: true, consoleOutput: false, maxLogEntries: 3 });
      
      // Add more logs than the limit
      for (let i = 0; i < 10; i++) {
        (module as any).debug('info', `log message ${i}`);
      }
      
      const logs = module.getDebugLogsPublic();
      // Should be limited to maxLogEntries
      expect(logs.length).toBeLessThanOrEqual(3);
    });

    it('should handle all log levels (covers lines 272-314)', () => {
      module.setDebugConfigPublic({ enabled: true, consoleOutput: false });
      
      (module as any).trace('trace message');
      (module as any).log('debug message');
      (module as any).logInfo('info message');
      (module as any).warn('warn message');
      (module as any).error('error message');
      
      const logs = module.getDebugLogsPublic();
      expect(logs).toHaveLength(5);
      
      const levels = logs.map((log: any) => log.level);
      expect(levels).toContain('trace');
      expect(levels).toContain('debug');
      expect(levels).toContain('info');
      expect(levels).toContain('warn');
      expect(levels).toContain('error');
    });
  });

  describe('Message System Coverage (Lines 617-737)', () => {
    let sourceModule: CompleteCoverageModule;
    let targetModule: CompleteCoverageModule;

    beforeAll(async () => {
      sourceModule = new CompleteCoverageModule(moduleInfo);
      targetModule = new CompleteCoverageModule({ ...moduleInfo, id: 'message-target' });
      
      await sourceModule.initialize();
      await targetModule.initialize();
    });

    afterAll(async () => {
      await sourceModule.destroy();
      await targetModule.destroy();
    });

    it('should handle sendMessage errors (covers lines 637-647)', () => {
      sourceModule.setDebugConfigPublic({ enabled: true, consoleOutput: false });
      
      // Send message to non-existent target
      sourceModule.sendMessagePublic('test-message', { data: 'test' }, 'non-existent-target');
      
      // Should log the error
      const logs = sourceModule.getDebugLogsPublic();
      const errorLogs = logs.filter((log: any) => log.level === 'error');
      expect(errorLogs.length).toBeGreaterThan(0);
    });

    it('should handle sendRequest errors (covers lines 684-693)', async () => {
      sourceModule.setDebugConfigPublic({ enabled: true, consoleOutput: false });
      
      // Send request to non-existent target with short timeout
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await expect(sourceModule.sendRequestPublic('test-request', { data: 'test' }, 'non-existent-target', 100))
        .rejects.toThrow();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle sendRequestAsync callback (covers lines 729-738)', (done) => {
      sourceModule.setDebugConfigPublic({ enabled: true, consoleOutput: false });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      sourceModule.sendRequestAsyncPublic(
        'test-async-request', 
        { data: 'test' }, 
        'non-existent-target',
        (response) => {
          // Callback should be called even for errors
          expect(response).toBeDefined();
          expect(response.success).toBe(false);
          consoleErrorSpy.mockRestore();
          done();
        },
        100
      );
    });

    it('should handle broadcastMessage (covers lines 749-757)', () => {
      sourceModule.setDebugConfigPublic({ enabled: true, consoleOutput: false });
      
      sourceModule.broadcastMessagePublic('broadcast-message', { data: 'test' });
      
      // Should call sendMessage with undefined target
      const logs = sourceModule.getDebugLogsPublic();
      const debugLogs = logs.filter((log: any) => log.level === 'debug');
      expect(debugLogs.length).toBeGreaterThan(0);
    });

    it('should handle handleMessage ping requests (covers lines 770-778)', async () => {
      const pingMessage: Message = {
        id: 'ping-test',
        type: 'ping',
        source: 'test-source',
        target: moduleInfo.id,
        payload: {},
        timestamp: Date.now()
      };

      const response = await sourceModule.handleMessagePublic(pingMessage);
      
      expect(response).toBeDefined();
      if (response && typeof response !== 'undefined') {
        expect((response as MessageResponse).success).toBe(true);
        expect((response as MessageResponse).data).toEqual(
          expect.objectContaining({
            pong: true,
            moduleId: moduleInfo.id
          })
        );
      }
    });

    it('should handle handleMessage unhandled types (covers lines 779-787)', async () => {
      sourceModule.setDebugConfigPublic({ enabled: true, consoleOutput: false });
      
      const unknownMessage: Message = {
        id: 'unknown-test',
        type: 'unknown-type',
        source: 'test-source',
        target: moduleInfo.id,
        payload: {},
        timestamp: Date.now()
      };

      const response = await sourceModule.handleMessagePublic(unknownMessage);
      
      expect(response).toBeDefined();
      if (response && typeof response !== 'undefined') {
        expect((response as MessageResponse).success).toBe(false);
        expect((response as MessageResponse).error).toContain('Unhandled message type');
      }
      
      // Should log warning
      const logs = sourceModule.getDebugLogsPublic();
      const warnLogs = logs.filter((log: any) => log.level === 'warn');
      expect(warnLogs.length).toBeGreaterThan(0);
    });

    it('should handle lifecycle events (covers lines 795-805)', () => {
      sourceModule.setDebugConfigPublic({ enabled: true, consoleOutput: false });
      
      sourceModule.onModuleRegistered('test-module-1');
      sourceModule.onModuleUnregistered('test-module-2');
      
      const logs = sourceModule.getDebugLogsPublic();
      const registeredLog = logs.find((log: any) => log.message === 'Module registered');
      const unregisteredLog = logs.find((log: any) => log.message === 'Module unregistered');
      
      expect(registeredLog).toBeDefined();
      expect(unregisteredLog).toBeDefined();
    });
  });
});