import { TwoPhaseDebugSystem } from '../src/debug/TwoPhaseDebugSystem';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Two-Phase Debug System', () => {
  let tempDir: string;
  let debugSystem: TwoPhaseDebugSystem;

  beforeAll(() => {
    tempDir = path.join(os.tmpdir(), 'rcc-debug-test-' + Date.now());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    debugSystem = new TwoPhaseDebugSystem(tempDir);
  });

  test('should initialize with systemstart phase', () => {
    const config = debugSystem.getConfig();

    expect(config.phase).toBe('systemstart');
    expect(config.systemStartDirectory).toBe(path.join(tempDir, 'systemstart'));
    expect(config.enabled).toBe(true);
    expect(config.enableConsoleLogging).toBe(true);
    expect(config.enableFileLogging).toBe(true);
  });

  test('should create systemstart directory', () => {
    expect(fs.existsSync(debugSystem.getCurrentLogDirectory())).toBe(true);
  });

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

  test('should log messages in systemstart phase', () => {
    debugSystem.log('info', 'Test systemstart message', { data: 'test' });

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

    debugSystem.log('debug', 'Test port message', { port: testPort });

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

  test('should handle invalid file paths gracefully', () => {
    const invalidPath = '/invalid/path/that/does/not/exist';
    const invalidDebugSystem = new TwoPhaseDebugSystem(invalidPath);

    // Should not throw, but should log error to console
    expect(() => invalidDebugSystem.log('info', 'Test message')).not.toThrow();
  });
});
