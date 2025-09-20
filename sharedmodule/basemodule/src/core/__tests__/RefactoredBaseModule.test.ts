import { RefactoredBaseModule } from '../RefactoredBaseModule';
import { DebugLevel, DebugLogEntry, DebugConfig } from '../DebugLogger';
import { ConnectionInfo, DataTransfer } from '../../interfaces/Connection';
import { ValidationRule, ValidationResult } from '../../interfaces/Validation';
import { Message, MessageResponse } from '../../interfaces/Message';
import { ModuleInfo } from '../../interfaces/ModuleInfo';

describe('RefactoredBaseModule', () => {
  const mockModuleInfo: ModuleInfo = {
    id: 'test-module',
    type: 'processor',
    name: 'Test Module',
    version: '1.0.0',
    description: 'Test module for refactoring'
  };

  class TestModule extends RefactoredBaseModule {
    constructor(info: ModuleInfo) {
      super(info);
    }
  }

  let module: TestModule;

  beforeEach(() => {
    module = new TestModule(mockModuleInfo);
  });

  describe('Core Functionality', () => {
    it('should create instance with factory method', () => {
      const instance = TestModule.createInstance(mockModuleInfo);
      expect(instance).toBeInstanceOf(TestModule);
    });

    it('should get module information', () => {
      const info = module.getInfo();
      expect(info.id).toBe(mockModuleInfo.id);
      expect(info.name).toBe(mockModuleInfo.name);
      expect(info.version).toBe(mockModuleInfo.version);
    });

    it('should configure module', () => {
      const config = { timeout: 5000, retryCount: 3 };
      module.configure(config);
      expect(module.getConfig()).toEqual(config);
    });

    it('should initialize module', async () => {
      await module.initialize();
      expect(module.getInfo()).toBeDefined();
    });

    it('should destroy module', async () => {
      await module.initialize();
      await module.destroy();
      // Module should be properly cleaned up
      expect(module.getConfig()).toEqual({});
    });
  });

  describe('Connection Management', () => {
    const mockConnection: ConnectionInfo = {
      id: 'test-connection',
      type: 'output',
      targetModuleId: 'target-module'
    };

    it('should add output connection', () => {
      module.addOutputConnection(mockConnection);
      const connections = module.getOutputConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0]).toEqual(mockConnection);
    });

    it('should add input connection', () => {
      const inputConnection: ConnectionInfo = {
        ...mockConnection,
        type: 'input'
      };
      module.addInputConnection(inputConnection);
      const connections = module.getInputConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0]).toEqual(inputConnection);
    });

    it('should remove connection', () => {
      module.addOutputConnection(mockConnection);
      module.removeOutputConnection(mockConnection.id);
      const connections = module.getOutputConnections();
      expect(connections).toHaveLength(0);
    });

    it('should transfer data', async () => {
      const mockData = { test: 'data' };
      await expect(module.transferData(mockData)).resolves.not.toThrow();
    });

    it('should receive data', async () => {
      const mockDataTransfer: DataTransfer = {
        id: 'test-transfer',
        sourceConnectionId: 'source',
        targetConnectionId: 'target',
        data: { test: 'data' },
        timestamp: Date.now()
      };
      await expect(module.receiveData(mockDataTransfer)).resolves.not.toThrow();
    });
  });

  describe('Debug Logging', () => {
    it('should set debug configuration', () => {
      const config: DebugConfig = {
        enabled: false,
        level: 'error',
        recordStack: false,
        maxLogEntries: 100,
        consoleOutput: false,
        trackDataFlow: false,
        enableFileLogging: false,
        maxFileSize: 1024,
        maxLogFiles: 1
      };
      module.setDebugConfig(config);
      expect(module.getDebugConfig()).toEqual(config);
    });

    it('should log messages at different levels', () => {
      module.trace('trace message');
      module.log('debug message');
      module.logInfo('info message');
      module.warn('warning message');
      module.error('error message');

      const logs = module.getDebugLogs();
      expect(logs).toHaveLength(5);
      expect(logs[0].level).toBe('trace');
      expect(logs[1].level).toBe('debug');
      expect(logs[2].level).toBe('info');
      expect(logs[3].level).toBe('warn');
      expect(logs[4].level).toBe('error');
    });

    it('should filter logs by level', () => {
      module.logInfo('info message');
      module.error('error message');

      const errorLogs = module.getDebugLogs('error');
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');
    });

    it('should limit log entries', () => {
      for (let i = 0; i < 10; i++) {
        module.logInfo(`message ${i}`);
      }

      const limitedLogs = module.getDebugLogs(undefined, 5);
      expect(limitedLogs).toHaveLength(5);
      expect(limitedLogs[0].message).toBe('message 5');
    });

    it('should clear debug logs', () => {
      module.logInfo('test message');
      expect(module.getDebugLogs()).toHaveLength(1);

      module.clearDebugLogs();
      expect(module.getDebugLogs()).toHaveLength(0);
    });
  });

  describe('Message Handling', () => {
    it('should send message', () => {
      expect(() => {
        module.sendMessage('test-type', { data: 'test' });
      }).not.toThrow();
    });

    it('should send broadcast message', () => {
      expect(() => {
        module.broadcastMessage('broadcast-type', { data: 'test' });
      }).not.toThrow();
    });

    it('should handle ping message', async () => {
      const message: Message = {
        id: 'test-id',
        type: 'ping',
        source: 'sender',
        target: 'test-module',
        payload: {},
        timestamp: Date.now()
      };

      const response = await module.handleMessage(message);
      expect(response).toBeDefined();
      expect(response?.success).toBe(true);
      expect(response?.data).toEqual({ pong: true, moduleId: 'test-module' });
    });

    it('should handle unknown message type', async () => {
      const message: Message = {
        id: 'test-id',
        type: 'unknown-type',
        source: 'sender',
        target: 'test-module',
        payload: {},
        timestamp: Date.now()
      };

      const response = await module.handleMessage(message);
      expect(response).toBeDefined();
      expect(response?.success).toBe(false);
      expect(response?.error).toContain('Unhandled message type');
    });
  });

  describe('Validation', () => {
    const mockRule: ValidationRule = {
      field: 'testField',
      type: 'required',
      message: 'Test field is required'
    };

    it('should add validation rule', () => {
      module.addValidationRule(mockRule);
      const rules = module.getValidationRules();
      expect(rules).toHaveLength(1);
      expect(rules[0]).toEqual(mockRule);
    });

    it('should remove validation rule', () => {
      module.addValidationRule(mockRule);
      module.removeValidationRule('testField');
      const rules = module.getValidationRules();
      expect(rules).toHaveLength(0);
    });

    it('should validate input data', () => {
      module.addValidationRule(mockRule);

      const validResult = module.validateInput({ testField: 'value' });
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = module.validateInput({});
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
      expect(invalidResult.errors[0]).toBe(mockRule.message);
    });

    it('should validate individual field', () => {
      module.addValidationRule(mockRule);

      const validResult = module.validateField('testField', 'value');
      expect(validResult.isValid).toBe(true);

      const invalidResult = module.validateField('testField', null);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should clear validation rules', () => {
      module.addValidationRule(mockRule);
      module.clearValidationRules();
      expect(module.getValidationRules()).toHaveLength(0);
    });
  });

  describe('Pipeline Session Management', () => {
    it('should set pipeline position', () => {
      module.setPipelinePosition('start');
      expect(module.getPipelinePosition()).toBe('start');
    });

    it('should set current session', () => {
      module.setCurrentSession('test-session');
      expect(module.getCurrentSession()).toBe('test-session');
      expect(module.hasActiveSession()).toBe(true);
    });

    it('should check active session', () => {
      expect(module.hasActiveSession()).toBe(false);
      module.setCurrentSession('test-session');
      expect(module.hasActiveSession()).toBe(true);
    });

    it('should get pipeline position string', () => {
      expect(module.getPipelinePositionString()).toBe('middle');
      module.setPipelinePosition('start');
      expect(module.getPipelinePositionString()).toBe('start');
    });
  });

  describe('I/O Tracking', () => {
    it('should start I/O tracking', () => {
      expect(() => {
        module.startIOTracking('test-operation', { input: 'data' }, 'testMethod');
      }).not.toThrow();
    });

    it('should end I/O tracking', () => {
      expect(() => {
        module.endIOTracking('test-operation', { output: 'result' }, true);
      }).not.toThrow();
    });

    it('should end I/O tracking with error', () => {
      expect(() => {
        module.endIOTracking('test-operation', null, false, 'Test error');
      }).not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    it('should get configuration value', () => {
      module.configure({ key1: 'value1', key2: 42 });
      expect(module.getConfigurationValue('key1')).toBe('value1');
      expect(module.getConfigurationValue('key2')).toBe(42);
      expect(module.getConfigurationValue('nonexistent', 'default')).toBe('default');
    });

    it('should set configuration value', () => {
      module.setConfigurationValue('key', 'value');
      expect(module.getConfigurationValue('key')).toBe('value');
    });

    it('should merge configuration', () => {
      module.configure({ key1: 'value1' });
      module.mergeConfiguration({ key2: 'value2' });
      expect(module.getConfigurationValue('key1')).toBe('value1');
      expect(module.getConfigurationValue('key2')).toBe('value2');
    });

    it('should check configuration key existence', () => {
      module.configure({ existingKey: 'value' });
      expect(module.hasConfigurationKey('existingKey')).toBe(true);
      expect(module.hasConfigurationKey('nonexistentKey')).toBe(false);
    });

    it('should get configuration keys', () => {
      module.configure({ key1: 'value1', key2: 'value2' });
      const keys = module.getConfigurationKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });
  });

  describe('Pipeline Sessions', () => {
    it('should start pipeline session', () => {
      expect(() => {
        module.startPipelineSession('test-session', { pipeline: 'config' });
      }).not.toThrow();
    });

    it('should end pipeline session', () => {
      expect(() => {
        module.endPipelineSession('test-session', true);
      }).not.toThrow();
    });

    it('should end pipeline session with failure', () => {
      expect(() => {
        module.endPipelineSession('test-session', false);
      }).not.toThrow();
    });
  });

  describe('Lifecycle Events', () => {
    it('should handle module registration', () => {
      expect(() => {
        module.onModuleRegistered('other-module');
      }).not.toThrow();
    });

    it('should handle module unregistration', () => {
      expect(() => {
        module.onModuleUnregistered('other-module');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid connection type', () => {
      const invalidConnection: ConnectionInfo = {
        id: 'invalid',
        type: 'invalid' as any,
        targetModuleId: 'target'
      };

      expect(() => {
        module.addInputConnection(invalidConnection);
      }).toThrow('Invalid connection type for input');

      expect(() => {
        module.addOutputConnection(invalidConnection);
      }).toThrow('Invalid connection type for output');
    });

    it('should handle non-existent connection removal', () => {
      expect(() => {
        module.removeInputConnection('non-existent');
        module.removeOutputConnection('non-existent');
      }).not.toThrow();
    });

    it('should handle configuration after initialization', () => {
      return module.initialize().then(() => {
        expect(() => {
          module.configure({ key: 'value' });
        }).toThrow('Cannot configure module after initialization');
      });
    });
  });
});