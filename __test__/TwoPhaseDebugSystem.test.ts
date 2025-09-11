import { TwoPhaseDebugSystem } from '../src/debug/TwoPhaseDebugSystem';
import { TwoPhaseDebugModule, ModuleStartupConfigs } from '../src/debug/ModuleStartupConfig';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Test module for two-phase debug configuration
 */
class TestModule extends TwoPhaseDebugModule {
  protected async initializeSystemStart(): Promise<void> {
    this.debug('info', 'Test module system start initialized', {}, 'initializeSystemStart');
  }

  protected async initializePort(portConfig: any): Promise<void> {
    this.debug('info', 'Test module port initialized', { port: portConfig.port }, 'initializePort');
  }

  protected async initializePortSpecific(): Promise<void> {
    this.debug('info', 'Test module port-specific initialized', {}, 'initializePortSpecific');
  }
}

describe('Two-Phase Debug Configuration', () => {
  let tempDir: string;
  let debugSystem: TwoPhaseDebugSystem;

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
    debugSystem = new TwoPhaseDebugSystem(tempDir);
  });

  describe('Debug System Initialization', () => {
    test('should initialize with systemstart phase', () => {
      const config = debugSystem.getConfig();

      expect(config.phase).toBe('systemstart');
      expect(config.systemStartDirectory).toBe(path.join(tempDir, 'systemstart'));
      expect(config.enabled).toBe(true);
    });

    test('should create systemstart directory', () => {
      expect(fs.existsSync(debugSystem.getCurrentLogDirectory())).toBe(true);
    });

    test('should have correct log file path for systemstart phase', () => {
      const logPath = debugSystem.getCurrentLogFilePath();
      expect(logPath).toContain('systemstart');
      expect(logPath).toMatch(/\.jsonl$/);
    });
  });

  describe('Phase Switching', () => {
    test('should switch to port mode', () => {
      const testPort = 8080;

      debugSystem.switchToPortMode(testPort);

      const config = debugSystem.getConfig();
      expect(config.phase).toBe('port');
      expect(config.port).toBe(testPort);
      expect(config.portDirectory).toBe(path.join(tempDir, 'port-8080'));
    });

    test('should create port directory when switching modes', () => {
      const testPort = 9090;

      debugSystem.switchToPortMode(testPort);

      expect(fs.existsSync(debugSystem.getCurrentLogDirectory())).toBe(true);
      expect(debugSystem.getCurrentLogDirectory()).toContain('port-9090');
    });

    test('should use correct log file path after port switch', () => {
      const testPort = 3000;

      debugSystem.switchToPortMode(testPort);

      const logPath = debugSystem.getCurrentLogFilePath();
      expect(logPath).toContain('port-3000');
      expect(logPath).toMatch(/\.jsonl$/);
    });
  });

  describe('Logging Functionality', () => {
    test('should log messages in systemstart phase', () => {
      debugSystem.log('info', 'Test systemstart message', { data: 'test' }, 'testMethod');

      const logFiles = debugSystem.getLogFiles();
      expect(logFiles.length).toBeGreaterThan(0);

      const logEntries = debugSystem.readLogFile(logFiles[0]);
      expect(logEntries.length).toBeGreaterThan(0);

      const lastEntry = logEntries[logEntries.length - 1];
      expect(lastEntry.level).toBe('info');
      expect(lastEntry.message).toBe('Test systemstart message');
      expect(lastEntry.phase).toBe('systemstart');
    });

    test('should log messages in port phase', () => {
      const testPort = 5000;
      debugSystem.switchToPortMode(testPort);

      debugSystem.log('debug', 'Test port message', { port: testPort }, 'portMethod');

      const logFiles = debugSystem.getLogFiles();
      expect(logFiles.length).toBeGreaterThan(0);

      const logEntries = debugSystem.readLogFile(logFiles[0]);
      expect(logEntries.length).toBeGreaterThan(0);

      const lastEntry = logEntries[logEntries.length - 1];
      expect(lastEntry.level).toBe('debug');
      expect(lastEntry.message).toBe('Test port message');
      expect(lastEntry.phase).toBe('port');
      expect(lastEntry.port).toBe(testPort);
    });

    test('should filter logs by level', () => {
      debugSystem.log('info', 'Info message', {}, 'test');
      debugSystem.log('error', 'Error message', {}, 'test');
      debugSystem.log('debug', 'Debug message', {}, 'test');

      const config = debugSystem.getConfig();
      config.level = 'warn';
      debugSystem.updateConfig(config);

      // These should not be logged
      debugSystem.log('info', 'Filtered info message', {}, 'test');
      debugSystem.log('debug', 'Filtered debug message', {}, 'test');

      // This should be logged
      debugSystem.log('error', 'Not filtered error message', {}, 'test');

      const logFiles = debugSystem.getLogFiles();
      const logEntries = debugSystem.readLogFile(logFiles[0]);

      const errorMessages = logEntries
        .filter((entry) => entry.level === 'error')
        .map((entry) => entry.message);

      expect(errorMessages).toContain('Error message');
      expect(errorMessages).toContain('Not filtered error message');
      expect(errorMessages).not.toContain('Filtered info message');
    });
  });

  describe('File Management', () => {
    test('should handle log rotation', async () => {
      // Create a large log file to trigger rotation
      const largeLogPath = debugSystem.getCurrentLogFilePath();
      const largeContent =
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'x'.repeat(1000000), // 1MB message
        }) + '\n';

      fs.writeFileSync(largeLogPath, largeContent.repeat(15)); // ~15MB

      // This should trigger rotation
      debugSystem.log('info', 'Post-rotation message', {}, 'test');

      // Check if rotation occurred
      const directory = debugSystem.getCurrentLogDirectory();
      const files = fs.readdirSync(directory).filter((file) => file.endsWith('.jsonl'));

      expect(files.length).toBeGreaterThan(1);
    });

    test('should cleanup old logs', () => {
      // Create old log files
      const directory = debugSystem.getCurrentLogDirectory();
      const oldFile = path.join(directory, '2020-01-01.jsonl');
      fs.writeFileSync(
        oldFile,
        '{"timestamp":"2020-01-01T00:00:00.000Z","level":"info","message":"old"}\n'
      );

      // Set file modification time to old date
      const oldTime = new Date('2020-01-01').getTime();
      fs.utimesSync(oldFile, oldTime / 1000, oldTime / 1000);

      // Cleanup logs older than 30 days
      debugSystem.cleanupOldLogs(30);

      // Old file should be removed
      expect(fs.existsSync(oldFile)).toBe(false);
    });
  });

  describe('Module Integration', () => {
    test('should create module with two-phase debug support', async () => {
      const testPort = 7000;
      const config = ModuleStartupConfigs.apiServer(testPort);

      const module = new TestModule(config.moduleInfo, {
        ...config,
        debugConfig: { ...config.debugConfig, baseDirectory: tempDir },
      });

      // Enable two-phase debug
      module.enableTwoPhaseDebug(tempDir);

      // Check initial state
      expect(module.getTwoPhaseDebugSystem().getConfig().phase).toBe('systemstart');

      // Switch to port mode
      module.switchDebugToPortMode(testPort);

      // Check port mode state
      expect(module.getTwoPhaseDebugSystem().getConfig().phase).toBe('port');
      expect(module.getTwoPhaseDebugSystem().getConfig().port).toBe(testPort);
    });

    test('should perform complete startup sequence', async () => {
      const testPort = 8000;
      const config = ModuleStartupConfigs.auth(testPort);

      const module = new TestModule(config.moduleInfo, {
        ...config,
        debugConfig: { ...config.debugConfig, baseDirectory: tempDir },
      });

      // Perform complete startup
      await module.startup();

      // Check debug system state
      const debugSystem = module.getTwoPhaseDebugSystem();
      expect(debugSystem.getConfig().phase).toBe('port');
      expect(debugSystem.getConfig().port).toBe(testPort);

      // Check if logs were created
      const logFiles = debugSystem.getLogFiles();
      expect(logFiles.length).toBeGreaterThan(0);

      // Check log content for startup phases
      const logEntries = debugSystem.readLogFile(logFiles[0]);
      const messages = logEntries.map((entry) => entry.message);

      expect(messages).toContain('System start phase initialized');
      expect(messages).toContain('Test module port initialized');
      expect(messages).toContain('Module startup completed successfully');
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration correctly', () => {
      const updates = {
        enabled: false,
        level: 'error' as const,
        enableConsoleLogging: false,
      };

      debugSystem.updateConfig(updates);

      const config = debugSystem.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.level).toBe('error');
      expect(config.enableConsoleLogging).toBe(false);
    });

    test('should maintain phase when updating unrelated config', () => {
      debugSystem.switchToPortMode(9999);

      const updates = {
        level: 'warn' as const,
        maxFileSize: 5 * 1024 * 1024,
      };

      debugSystem.updateConfig(updates);

      const config = debugSystem.getConfig();
      expect(config.phase).toBe('port');
      expect(config.port).toBe(9999);
      expect(config.level).toBe('warn');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid file paths gracefully', () => {
      const invalidPath = '/invalid/path/that/does/not/exist';
      const invalidDebugSystem = new TwoPhaseDebugSystem(invalidPath);

      // Should not throw, but should log error to console
      expect(() => invalidDebugSystem.log('info', 'Test message')).not.toThrow();
    });

    test('should handle file write errors gracefully', () => {
      // Mock file system error
      const originalAppendFileSync = fs.appendFileSync;
      fs.appendFileSync = jest.fn().mockImplementation(() => {
        throw new Error('Mock file system error');
      });

      expect(() => debugSystem.log('info', 'Test message with file error')).not.toThrow();

      // Restore original function
      fs.appendFileSync = originalAppendFileSync;
    });
  });
});
