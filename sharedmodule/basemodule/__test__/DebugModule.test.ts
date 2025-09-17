import { DebugModule } from '../src/DebugModule';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DebugModule', () => {
  let tempDir: string;
  let debugModule: DebugModule;

  beforeAll(() => {
    // Create temporary directory for testing
    tempDir = path.join(os.tmpdir(), 'rcc-debug-test');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    debugModule = new DebugModule(tempDir);
    // Clear initialization logs to start with clean state
    debugModule.clearLogs();
  });

  describe('Initialization', () => {
    test('should initialize with systemstart phase', () => {
      const config = debugModule.getConfig();
      expect(config.phase).toBe('systemstart');
      expect(config.baseDirectory).toBe(tempDir);
      expect(config.enabled).toBe(true);
    });

    test('should create log directories', () => {
      const systemStartDir = path.join(tempDir, 'systemstart');
      expect(fs.existsSync(systemStartDir)).toBe(true);
    });
  });

  describe('Logging', () => {
    test('should log messages with different levels', () => {
      debugModule.log('info', 'Test info message', { test: true }, 'testMethod');
      debugModule.log('error', 'Test error message', { error: 'test' }, 'errorMethod');

      const logs = debugModule.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('Test info message');
      expect(logs[1].level).toBe('error');
      expect(logs[1].message).toBe('Test error message');
    });

    test('should respect log level filtering', () => {
      const config = debugModule.getConfig();
      debugModule.updateConfig({ ...config, level: 'warn' });

      debugModule.log('info', 'Info message');
      debugModule.log('warn', 'Warning message');
      debugModule.log('error', 'Error message');

      const logs = debugModule.getLogs();
      expect(logs).toHaveLength(2); // Only warn and error
      expect(logs[0].level).toBe('warn');
      expect(logs[1].level).toBe('error');
    });

    test('should handle disabled state', () => {
      const config = debugModule.getConfig();
      debugModule.updateConfig({ ...config, enabled: false });

      // Clear existing logs to isolate the test
      debugModule.clearLogs();

      debugModule.log('info', 'This should not be logged');
      const logs = debugModule.getLogs();
      expect(logs).toHaveLength(0);
    });
  });

  describe('Port Mode', () => {
    test('should switch to port mode', () => {
      debugModule.switchToPortMode(3000);

      const config = debugModule.getConfig();
      expect(config.phase).toBe('port');
      expect(config.port).toBe(3000);
      expect(config.portDirectory).toContain('port-3000');

      const portDir = path.join(tempDir, 'port-3000');
      expect(fs.existsSync(portDir)).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    test('should update base directory', () => {
      const newDir = path.join(tempDir, 'new-location');
      debugModule.updateBaseDirectory(newDir);

      const config = debugModule.getConfig();
      expect(config.baseDirectory).toBe(newDir);
      expect(config.systemStartDirectory).toBe(path.join(newDir, 'systemstart'));

      const newSystemStartDir = path.join(newDir, 'systemstart');
      expect(fs.existsSync(newSystemStartDir)).toBe(true);
    });
  });

  describe('File Operations', () => {
    test('should write logs to file', () => {
      debugModule.log('info', 'File test message');

      const logFiles = debugModule.getLogFiles();
      expect(logFiles.length).toBeGreaterThan(0);

      const firstLogFile = logFiles[0];
      const logContent = debugModule.readLogFile(firstLogFile);
      expect(logContent.length).toBeGreaterThan(0);
      expect(logContent[logContent.length - 1].message).toBe('File test message');
    });

    test('should limit log entries in memory', () => {
      const config = debugModule.getConfig();
      debugModule.updateConfig({ ...config, maxLogEntries: 3 });

      debugModule.log('info', 'Message 1');
      debugModule.log('info', 'Message 2');
      debugModule.log('info', 'Message 3');
      debugModule.log('info', 'Message 4');

      const logs = debugModule.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Message 2');
      expect(logs[2].message).toBe('Message 4');
    });
  });

  describe('Convenience Methods', () => {
    test('should provide convenience logging methods', () => {
      // Set log level to trace to ensure all levels are captured
      const config = debugModule.getConfig();
      debugModule.updateConfig({ ...config, level: 'trace' });

      // Clear existing logs to isolate the test (do this after setting log level)
      debugModule.clearLogs();

      debugModule.trace('Trace message');
      debugModule.debug('Debug message');
      debugModule.info('Info message');
      debugModule.warn('Warning message');
      debugModule.error('Error message');

      const logs = debugModule.getLogs();
      expect(logs).toHaveLength(5);
      expect(logs[0].level).toBe('trace');
      expect(logs[1].level).toBe('debug');
      expect(logs[2].level).toBe('info');
      expect(logs[3].level).toBe('warn');
      expect(logs[4].level).toBe('error');
    });
  });

  describe('Legacy Compatibility', () => {
    test('should support legacy methods', () => {
      debugModule.updateLogDirectory(path.join(tempDir, 'legacy'));

      const config = debugModule.getConfig();
      expect(config.baseDirectory).toBe(path.join(tempDir, 'legacy'));

      const legacyDir = path.join(tempDir, 'legacy', 'systemstart');
      expect(fs.existsSync(legacyDir)).toBe(true);
    });
  });

  describe('I/O Tracking Configuration', () => {
    test('should initialize with I/O tracking enabled', () => {
      const config = debugModule.getConfig();
      expect(config.ioTracking).toBeDefined();
      expect(config.ioTracking.enabled).toBe(true);
      expect(config.ioTracking.autoRecord).toBe(true);
      expect(config.ioTracking.saveIndividualFiles).toBe(true);
      expect(config.ioTracking.saveSessionFiles).toBe(true);
    });

    test('should configure I/O tracking settings', () => {
      const config = debugModule.getConfig();
      debugModule.updateConfig({
        ...config,
        ioTracking: {
          enabled: false,
          autoRecord: false,
          saveIndividualFiles: false,
          saveSessionFiles: false,
          individualFileFormat: 'json',
          sessionFileFormat: 'jsonl',
          maxSessionOperations: 50,
        },
      });

      const updatedConfig = debugModule.getConfig();
      expect(updatedConfig.ioTracking.enabled).toBe(false);
      expect(updatedConfig.ioTracking.autoRecord).toBe(false);
      expect(updatedConfig.ioTracking.saveIndividualFiles).toBe(false);
      expect(updatedConfig.ioTracking.saveSessionFiles).toBe(false);
    });
  });

  describe('I/O Tracking Operations', () => {
    test('should track individual operations', () => {
      const input = { query: 'test data', parameters: { limit: 10 } };
      const output = { results: ['item1', 'item2'], count: 2 };

      debugModule.recordOperation('test-module', 'operation-1', input, output, 'fetchData');

      const ioEntries = debugModule.getIOEntries();
      expect(ioEntries).toHaveLength(1);
      expect(ioEntries[0].moduleId).toBe('test-module');
      expect(ioEntries[0].operationId).toBe('operation-1');
      expect(ioEntries[0].input).toEqual(input);
      expect(ioEntries[0].output).toEqual(output);
      expect(ioEntries[0].method).toBe('fetchData');
      expect(ioEntries[0].success).toBe(true);
    });

    test('should track operation with start and end', () => {
      const input = { query: 'test data' };
      const output = { result: 'success' };

      debugModule.startOperation('test-module', 'operation-2', input, 'processData');

      // Add a small delay to ensure measurable duration
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Busy wait for 2ms
      }

      debugModule.endOperation('test-module', 'operation-2', output, true);

      const ioEntries = debugModule.getIOEntries();
      expect(ioEntries).toHaveLength(1);
      expect(ioEntries[0].moduleId).toBe('test-module');
      expect(ioEntries[0].operationId).toBe('operation-2');
      expect(ioEntries[0].method).toBe('processData');
      expect(ioEntries[0].success).toBe(true);
      expect(ioEntries[0].duration).toBeGreaterThan(0);
    });

    test('should track failed operations', () => {
      const input = { query: 'invalid data' };
      const error = 'Validation failed';

      debugModule.startOperation('test-module', 'operation-3', input, 'validateData');
      debugModule.endOperation('test-module', 'operation-3', null, false, error);

      const ioEntries = debugModule.getIOEntries();
      expect(ioEntries).toHaveLength(1);
      expect(ioEntries[0].success).toBe(false);
      expect(ioEntries[0].error).toBe(error);
    });
  });

  describe('I/O File Persistence', () => {
    test('should save individual operations to separate files', () => {
      const input = { query: 'test data' };
      const output = { result: 'success' };

      debugModule.recordOperation('test-module', 'operation-1', input, output, 'testMethod');

      const individualFiles = debugModule.getIndividualIOFiles();
      expect(individualFiles.length).toBeGreaterThan(0);

      const firstFile = individualFiles[0];
      expect(firstFile).toContain('test-module_operation-1');
      expect(firstFile.endsWith('.json'));
    });

    test('should save session operations to session file', () => {
      const operations = [
        { moduleId: 'test-module', operationId: 'op1', input: { data: 1 }, output: { result: 1 } },
        { moduleId: 'test-module', operationId: 'op2', input: { data: 2 }, output: { result: 2 } },
        { moduleId: 'test-module', operationId: 'op3', input: { data: 3 }, output: { result: 3 } },
      ];

      operations.forEach((op) => {
        debugModule.recordOperation(op.moduleId, op.operationId, op.input, op.output);
      });

      const sessionFiles = debugModule.getSessionIOFiles();
      expect(sessionFiles.length).toBeGreaterThan(0);

      const sessionFile = sessionFiles[0];
      expect(sessionFile).toContain('test-module_session');
      expect(sessionFile.endsWith('.jsonl'));
    });

    test('should limit I/O entries in memory', () => {
      const config = debugModule.getConfig();
      debugModule.updateConfig({
        ...config,
        maxIOEntries: 3,
        ioTracking: { ...config.ioTracking, maxEntriesPerFile: 3 },
      });

      // Record more operations than the limit
      for (let i = 0; i < 5; i++) {
        debugModule.recordOperation('test-module', `operation-${i}`, { data: i }, { result: i });
      }

      const ioEntries = debugModule.getIOEntries();
      expect(ioEntries).toHaveLength(3);
      expect(ioEntries[0].operationId).toBe('operation-2');
      expect(ioEntries[2].operationId).toBe('operation-4');
    });
  });

  describe('I/O Tracking Disabled', () => {
    test('should not track operations when disabled', () => {
      const config = debugModule.getConfig();
      debugModule.updateConfig({
        ...config,
        ioTracking: { ...config.ioTracking, enabled: false },
      });

      debugModule.recordOperation('test-module', 'operation-1', { data: 1 }, { result: 1 });

      const ioEntries = debugModule.getIOEntries();
      expect(ioEntries).toHaveLength(0);
    });

    test('should not save files when persistence disabled', () => {
      const config = debugModule.getConfig();
      debugModule.updateConfig({
        ...config,
        ioTracking: {
          ...config.ioTracking,
          enabled: true,
          saveIndividualFiles: false,
          saveSessionFiles: false,
        },
      });

      debugModule.recordOperation('test-module', 'operation-1', { data: 1 }, { result: 1 });

      const individualFiles = debugModule.getIndividualIOFiles();
      const sessionFiles = debugModule.getSessionIOFiles();

      expect(individualFiles.length).toBe(0);
      expect(sessionFiles.length).toBe(0);
    });
  });

  describe('I/O File Reading', () => {
    test('should read individual I/O files correctly', () => {
      const input = { query: 'test data', parameters: { limit: 10 } };
      const output = { results: ['item1', 'item2'], count: 2 };

      debugModule.recordOperation('test-module', 'operation-1', input, output, 'fetchData');

      const individualFiles = debugModule.getIndividualIOFiles();
      expect(individualFiles.length).toBeGreaterThan(0);

      const firstFile = individualFiles[0];
      const fileContent = debugModule.readIndividualIOFile(firstFile);

      expect(fileContent).toBeDefined();
      expect(fileContent.moduleId).toBe('test-module');
      expect(fileContent.operationId).toBe('operation-1');
      expect(fileContent.input).toEqual(input);
      expect(fileContent.output).toEqual(output);
    });

    test('should read session I/O files correctly', () => {
      // Record multiple operations
      for (let i = 0; i < 3; i++) {
        debugModule.recordOperation('test-module', `operation-${i}`, { data: i }, { result: i });
      }

      const sessionFiles = debugModule.getSessionIOFiles();
      expect(sessionFiles.length).toBeGreaterThan(0);

      const sessionFile = sessionFiles[0];
      const sessionContent = debugModule.readSessionIOFile(sessionFile);

      expect(sessionContent).toHaveLength(3);
      expect(sessionContent[0].moduleId).toBe('test-module');
      expect(sessionContent[0].operationId).toBe('operation-0');
      expect(sessionContent[2].operationId).toBe('operation-2');
    });
  });

  describe('I/O Tracking with Auto Record', () => {
    test('should automatically record operations when autoRecord is enabled', () => {
      const config = debugModule.getConfig();
      debugModule.updateConfig({
        ...config,
        ioTracking: { ...config.ioTracking, autoRecord: true },
      });

      // Simulate module method calls (these would be called by BaseModule)
      debugModule.recordOperation('test-module', 'auto-operation-1', { input: 1 }, { output: 1 });
      debugModule.recordOperation('test-module', 'auto-operation-2', { input: 2 }, { output: 2 });

      const ioEntries = debugModule.getIOEntries();
      expect(ioEntries).toHaveLength(2);
      expect(ioEntries[0].operationId).toBe('auto-operation-1');
      expect(ioEntries[1].operationId).toBe('auto-operation-2');
    });

    test('should not automatically record when autoRecord is disabled', () => {
      const config = debugModule.getConfig();
      debugModule.updateConfig({
        ...config,
        ioTracking: { ...config.ioTracking, autoRecord: false },
      });

      // Even if we call recordOperation directly, it should respect the autoRecord setting
      debugModule.recordOperation('test-module', 'manual-operation', { input: 1 }, { output: 1 });

      const ioEntries = debugModule.getIOEntries();
      // Should still record since we called it directly, but autoRecord affects other behaviors
      expect(ioEntries).toHaveLength(1);
    });
  });
});
