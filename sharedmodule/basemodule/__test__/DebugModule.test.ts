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
      expect(config.port).toBe(300);
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
      expect(logContent[0].message).toBe('File test message');
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
});