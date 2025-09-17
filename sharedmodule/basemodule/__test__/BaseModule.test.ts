import { BaseModule } from '../src/BaseModule';
import { ModuleInfo } from '../src/interfaces/ModuleInfo';

describe('BaseModule', () => {
  let mockModuleInfo: ModuleInfo;
  let testModule: TestModule;

  class TestModule extends BaseModule {
    public async initialize(): Promise<void> {
      await super.initialize();
      this.logInfo('TestModule initialized');
    }

    public async receiveData(dataTransfer: any): Promise<void> {
      this.logInfo('TestModule received data', dataTransfer.data);
    }
  }

  beforeEach(() => {
    mockModuleInfo = {
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0',
      description: 'A test module',
      type: 'test',
    };

    testModule = new TestModule(mockModuleInfo);
  });

  test('should create module with correct info', () => {
    const info = testModule.getInfo();
    expect(info).toEqual(mockModuleInfo);
  });

  test('should initialize correctly', async () => {
    await testModule.initialize();
    // Test module should be initialized
    expect(testModule.getInfo()).toEqual(mockModuleInfo);
  });

  test('should handle configuration', () => {
    const config = { setting1: 'value1', setting2: 42 };
    testModule.configure(config);

    const retrievedConfig = testModule.getConfig();
    expect(retrievedConfig).toEqual(config);
  });

  test('should throw error if configured after initialization', async () => {
    await testModule.initialize();

    expect(() => {
      testModule.configure({ setting: 'value' });
    }).toThrow('Cannot configure module after initialization');
  });

  test('should handle debug configuration', () => {
    const debugConfig = {
      enabled: false,
      level: 'error' as const,
      recordStack: false,
      maxLogEntries: 500,
      consoleOutput: false,
      trackDataFlow: false,
    };

    testModule.setDebugConfig(debugConfig);
    const retrievedConfig = testModule.getDebugConfig();

    expect(retrievedConfig).toMatchObject(debugConfig);
  });

  test('should add and remove input connections', () => {
    const connection = {
      id: 'input-1',
      type: 'input' as const,
      sourceModuleId: 'test-module',
      targetModuleId: 'module-1',
    };

    testModule.addInputConnection(connection);
    const connections = testModule.getInputConnections();
    expect(connections).toContain(connection);

    testModule.removeInputConnection('input-1');
    const connectionsAfterRemove = testModule.getInputConnections();
    expect(connectionsAfterRemove).not.toContain(connection);
  });

  test('should add and remove output connections', () => {
    const connection = {
      id: 'output-1',
      type: 'output' as const,
      sourceModuleId: 'test-module',
      targetModuleId: 'module-1',
    };

    testModule.addOutputConnection(connection);
    const connections = testModule.getOutputConnections();
    expect(connections).toContain(connection);

    testModule.removeOutputConnection('output-1');
    const connectionsAfterRemove = testModule.getOutputConnections();
    expect(connectionsAfterRemove).not.toContain(connection);
  });

  test('should throw error for invalid connection types', () => {
    const invalidInputConnection = {
      id: 'invalid-1',
      type: 'output' as const,
      sourceModuleId: 'test-module',
      targetModuleId: 'module-1',
    };

    expect(() => {
      testModule.addInputConnection(invalidInputConnection);
    }).toThrow('Invalid connection type for input');

    const invalidOutputConnection = {
      id: 'invalid-2',
      type: 'input' as const,
      sourceModuleId: 'test-module',
      targetModuleId: 'module-1',
    };

    expect(() => {
      testModule.addOutputConnection(invalidOutputConnection);
    }).toThrow('Invalid connection type for output');
  });

  test('should validate input data', () => {
    testModule.configure({}); // Configure to allow testing

    // Add validation rules
    (testModule as any).validationRules = [
      {
        field: 'name',
        type: 'required' as const,
        message: 'Name is required',
      },
      {
        field: 'age',
        type: 'number' as const,
        message: 'Age must be a number',
      },
    ];

    const validData = { name: 'John', age: 30 };
    const invalidData = { age: 'thirty' };
    const missingData = { age: 30 };

    const validResult = (testModule as any).validateInput(validData);
    expect(validResult.isValid).toBe(true);

    const invalidResult = (testModule as any).validateInput(invalidData);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toContain('Age must be a number');

    const missingResult = (testModule as any).validateInput(missingData);
    expect(missingResult.isValid).toBe(false);
    expect(missingResult.errors).toContain('Name is required');
  });

  test('should handle messages', async () => {
    await testModule.initialize();

    const message = {
      id: 'test-message',
      type: 'ping',
      source: 'test-sender',
      target: 'test-module',
      payload: {},
      timestamp: Date.now(),
    };

    const response = await testModule.handleMessage(message);
    expect(response).toBeDefined();
    if (response && typeof response === 'object' && 'success' in response) {
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ pong: true, moduleId: 'test-module' });
    }
  });

  test('should destroy correctly', async () => {
    await testModule.initialize();

    // Add some test data
    testModule.addInputConnection({
      id: 'input-1',
      type: 'input' as const,
      sourceModuleId: 'test-module',
      targetModuleId: 'module-1',
    });

    testModule.addOutputConnection({
      id: 'output-1',
      type: 'output' as const,
      sourceModuleId: 'test-module',
      targetModuleId: 'module-1',
    });

    await testModule.destroy();

    expect(testModule.getInputConnections()).toHaveLength(0);
    expect(testModule.getOutputConnections()).toHaveLength(0);
    expect(testModule.getDebugLogs()).toHaveLength(0);
  });

  describe('I/O Tracking Integration', () => {
    test('should enable two-phase debug with I/O tracking', () => {
      testModule.enableTwoPhaseDebug(true, '~/.rcc/debug-logs');

      const debugConfig = testModule.getDebugConfig();
      expect(debugConfig.enabled).toBe(true);
      expect(debugConfig.ioTracking).toBeDefined();
      expect(debugConfig.ioTracking.enabled).toBe(true);
    });

    test('should track I/O operations automatically', () => {
      testModule.enableTwoPhaseDebug(true, '~/.rcc/debug-logs');

      const input = { query: 'test data', parameters: { limit: 10 } };
      const output = { results: ['item1', 'item2'], count: 2 };

      testModule.recordIOOperation('fetch-data', input, output, 'fetchData');

      // Verify that the I/O operation was tracked
      expect(testModule['twoPhaseDebugSystem'].getIOEntries()).toHaveLength(1);

      const ioEntry = testModule['twoPhaseDebugSystem'].getIOEntries()[0];
      expect(ioEntry.moduleId).toBe('test-module');
      expect(ioEntry.operationId).toBe('fetch-data');
      expect(ioEntry.input).toEqual(input);
      expect(ioEntry.output).toEqual(output);
      expect(ioEntry.method).toBe('fetchData');
    });

    test('should track I/O operations with start and end', () => {
      testModule.enableTwoPhaseDebug(true, '~/.rcc/debug-logs');

      const input = { query: 'test data' };
      const output = { result: 'success' };

      testModule.startIOTracking('process-data', input, 'processData');

      // Add a small delay to ensure measurable duration
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait for 10ms
      }

      testModule.endIOTracking('process-data', output, true);

      const ioEntries = testModule['twoPhaseDebugSystem'].getIOEntries();
      expect(ioEntries).toHaveLength(1);
      expect(ioEntries[0].moduleId).toBe('test-module');
      expect(ioEntries[0].operationId).toBe('process-data');
      expect(ioEntries[0].success).toBe(true);
      expect(ioEntries[0].duration).toBeGreaterThan(0);
    });

    test('should track failed I/O operations', () => {
      testModule.enableTwoPhaseDebug(true, '~/.rcc/debug-logs');

      const input = { query: 'invalid data' };
      const error = 'Validation failed';

      testModule.startIOTracking('validate-data', input, 'validateData');
      testModule.endIOTracking('validate-data', null, false, error);

      const ioEntries = testModule['twoPhaseDebugSystem'].getIOEntries();
      expect(ioEntries).toHaveLength(1);
      expect(ioEntries[0].success).toBe(false);
      expect(ioEntries[0].error).toBe(error);
    });

    test('should save I/O operations to individual files', () => {
      testModule.enableTwoPhaseDebug(true, '~/.rcc/debug-logs');

      // Clear any existing I/O entries and files to ensure clean test
      testModule['twoPhaseDebugSystem'].clearIOEntries();

      const input = { query: 'test data' };
      const output = { result: 'success' };

      testModule.recordIOOperation('unique-individual-file-test', input, output, 'testMethod');

      const individualFiles = testModule['twoPhaseDebugSystem'].getIndividualIOFiles();
      expect(individualFiles.length).toBeGreaterThan(0);

      // Find the file that contains our specific operation name
      const matchingFile = individualFiles.find((file) =>
        file.includes('unique-individual-file-test')
      );
      expect(matchingFile).toBeDefined();
      expect(matchingFile).toContain('test-module_unique-individual-file-test');
      expect(matchingFile!.endsWith('.json'));
    });

    test('should save multiple operations to session file', () => {
      testModule.enableTwoPhaseDebug(true, '~/.rcc/debug-logs');

      // Record multiple operations
      for (let i = 0; i < 3; i++) {
        testModule.recordIOOperation(`operation-${i}`, { data: i }, { result: i });
      }

      const sessionFiles = testModule['twoPhaseDebugSystem'].getSessionIOFiles();
      expect(sessionFiles.length).toBeGreaterThan(0);

      const sessionFile = sessionFiles[0];
      expect(sessionFile).toContain('test-module_session');
      expect(sessionFile.endsWith('.jsonl'));
    });

    test('should respect I/O tracking configuration', () => {
      testModule.enableTwoPhaseDebug(true, '~/.rcc/debug-logs');

      // Disable I/O tracking
      const debugConfig = testModule.getDebugConfig();
      testModule.setDebugConfig({
        ...debugConfig,
        ioTracking: {
          ...debugConfig.ioTracking,
          enabled: false,
        },
      });

      testModule.recordIOOperation('disabled-operation', { data: 1 }, { result: 1 });

      // Should not track when disabled
      expect(testModule['twoPhaseDebugSystem'].getIOEntries()).toHaveLength(0);
    });

    test('should integrate with existing debug logging', () => {
      testModule.enableTwoPhaseDebug(true, '~/.rcc/debug-logs');

      // Clear existing debug logs to ensure clean test
      testModule['twoPhaseDebugSystem'].clearLogs();

      // Log regular debug messages
      testModule.logInfo('Regular debug message');
      testModule.warn('Warning message');

      // Log I/O operations
      testModule.recordIOOperation('test-operation', { input: 1 }, { output: 1 });

      // Both should be recorded separately
      const debugLogs = testModule['twoPhaseDebugSystem'].getLogs();
      const ioEntries = testModule['twoPhaseDebugSystem'].getIOEntries();

      expect(debugLogs.length).toBeGreaterThan(0);
      expect(ioEntries.length).toBe(1);

      // Verify the debug logs contain the regular messages
      expect(debugLogs.some((log) => log.message === 'Regular debug message')).toBe(true);
      expect(debugLogs.some((log) => log.message === 'Warning message')).toBe(true);
    });

    test('should handle I/O tracking with custom configuration', () => {
      testModule.enableTwoPhaseDebug(true, '~/.rcc/debug-logs', {
        enabled: true,
        autoRecord: false,
        saveIndividualFiles: true,
        saveSessionFiles: false,
        ioDirectory: '~/.rcc/debug-logs/io',
        includeTimestamp: true,
        includeDuration: true,
        maxEntriesPerFile: 100,
      });

      const debugConfig = testModule.getDebugConfig();
      expect(debugConfig.ioTracking.autoRecord).toBe(false);
      expect(debugConfig.ioTracking.saveSessionFiles).toBe(false);
      expect(debugConfig.ioTracking.maxEntriesPerFile).toBe(100);
    });

    test('should provide I/O tracking statistics', () => {
      testModule.enableTwoPhaseDebug(true, '~/.rcc/debug-logs');

      // Clear any existing I/O entries to ensure clean test
      testModule['twoPhaseDebugSystem'].clearIOEntries();

      // Record some operations
      testModule.recordIOOperation('op1', { data: 1 }, { result: 1 });
      testModule.recordIOOperation('op2', { data: 2 }, { result: 2 });

      // Add a small delay to ensure measurable duration
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait for 10ms
      }

      testModule.startIOTracking('op3', { data: 3 });

      // Add another small delay
      const start2 = Date.now();
      while (Date.now() - start2 < 2) {
        // Busy wait for 2ms
      }

      testModule.endIOTracking('op3', { result: 3 }, true);

      const ioEntries = testModule['twoPhaseDebugSystem'].getIOEntries();
      expect(ioEntries).toHaveLength(3);

      // Verify operation types
      expect(ioEntries.filter((entry) => entry.success).length).toBe(3);
      expect(
        ioEntries.filter((entry) => entry.duration !== undefined && entry.duration > 0).length
      ).toBe(1);
    });
  });

  describe('Debug Path Configuration', () => {
    test('should configure debug path to ~/.rcc/debug-logs', () => {
      testModule.enableTwoPhaseDebug(true, '~/.rcc/debug-logs');

      const debugConfig = testModule.getDebugConfig();
      expect(debugConfig.baseDirectory).toBe('~/.rcc/debug-logs');

      // Verify the debug module was configured with the correct path
      const debugModuleConfig = testModule['twoPhaseDebugSystem'].getConfig();
      expect(debugModuleConfig.baseDirectory).toBe('~/.rcc/debug-logs');
    });

    test('should handle custom debug paths', () => {
      const customPath = '/tmp/custom-debug-logs';
      testModule.enableTwoPhaseDebug(true, customPath);

      const debugConfig = testModule.getDebugConfig();
      expect(debugConfig.baseDirectory).toBe(customPath);
    });

    test('should disable debug functionality', () => {
      testModule.enableTwoPhaseDebug(false);

      const debugConfig = testModule.getDebugConfig();
      expect(debugConfig.enabled).toBe(false);

      // Should still be able to log, but they won't be processed
      testModule.logInfo('This should not be processed');
      const debugLogs = testModule.getDebugLogs();
      expect(debugLogs).toHaveLength(0);
    });
  });
});
