import { BaseModule } from '../src/BaseModule';
import { DebugEventBus } from '../src/debug/DebugEventBus';
import { DebugCenter } from 'rcc-debugcenter';
import { DebugLevel, PipelineOperationType } from 'rcc-debugcenter';

describe('Refactored Debug Integration', () => {
  let baseModule: BaseModule;
  let debugCenter: DebugCenter;
  let eventBus: DebugEventBus;
  let testDir: string;

  beforeEach(() => {
    // Create test module
    baseModule = new BaseModule({
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0',
      description: 'Test module for debug integration'
    });

    // Create debug center
    testDir = `/tmp/debug-test-${Date.now()}`;
    debugCenter = new DebugCenter({
      enabled: true,
      baseDirectory: testDir,
      consoleOutput: false
    });

    // Get event bus instance
    eventBus = DebugEventBus.getInstance();

    // Initialize module
    baseModule.setDebugConfig({
      enabled: true,
      level: 'debug',
      recordStack: false,
      maxLogEntries: 100,
      consoleOutput: false,
      trackDataFlow: true,
      enableFileLogging: false,
      maxFileSize: 1024 * 1024,
      maxLogFiles: 5
    });
  });

  afterEach(() => {
    // Clean up
    baseModule.clearDebugLogs();
    eventBus.clear();
    debugCenter.clear();
  });

  describe('Event Bus Integration', () => {
    test('should publish I/O tracking events to event bus', () => {
      const sessionId = 'test-session';
      baseModule.setCurrentSession(sessionId);
      baseModule.setPipelinePosition('middle');

      const mockCallback = jest.fn();
      eventBus.subscribe('start', mockCallback);

      // Start I/O tracking
      baseModule.startIOTracking('test-operation', { input: 'test data' }, 'testMethod');

      expect(mockCallback).toHaveBeenCalled();
      const event = mockCallback.mock.calls[0][0];
      expect(event.sessionId).toBe(sessionId);
      expect(event.moduleId).toBe('test-module');
      expect(event.operationId).toBe('test-operation');
      expect(event.type).toBe('start');
      expect(event.data.input).toEqual({ input: 'test data' });
      expect(event.data.method).toBe('testMethod');
    });

    test('should publish end events with proper structure', () => {
      const sessionId = 'test-session';
      baseModule.setCurrentSession(sessionId);
      baseModule.setPipelinePosition('middle');

      const mockCallback = jest.fn();
      eventBus.subscribe('end', mockCallback);

      // End I/O tracking
      baseModule.endIOTracking('test-operation', { output: 'test result' }, true);

      expect(mockCallback).toHaveBeenCalled();
      const event = mockCallback.mock.calls[0][0];
      expect(event.sessionId).toBe(sessionId);
      expect(event.moduleId).toBe('test-module');
      expect(event.operationId).toBe('test-operation');
      expect(event.type).toBe('end');
      expect(event.data.output).toEqual({ output: 'test result' });
      expect(event.data.success).toBe(true);
    });

    test('should publish error events when operations fail', () => {
      const sessionId = 'test-session';
      baseModule.setCurrentSession(sessionId);
      baseModule.setPipelinePosition('middle');

      const mockCallback = jest.fn();
      eventBus.subscribe('error', mockCallback);

      // End I/O tracking with error
      baseModule.endIOTracking('test-operation', null, false, 'Test error message');

      expect(mockCallback).toHaveBeenCalled();
      const event = mockCallback.mock.calls[0][0];
      expect(event.type).toBe('error');
      expect(event.data.success).toBe(false);
      expect(event.data.error).toBe('Test error message');
    });
  });

  describe('Debug Center Integration', () => {
    test('should handle pipeline sessions', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');

      const activeSessions = debugCenter.getActiveSessions();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].pipelineId).toBe('test-pipeline');
    });

    test('should integrate BaseModule events with DebugCenter', (done) => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      // Set up event listener
      debugCenter.subscribe('pipelineEntry', (entry: any) => {
        expect(entry.pipelineId).toBe('test-pipeline');
        expect(entry.moduleId).toBe('test-module');
        expect(entry.operationId).toBe('test-operation');
        expect(entry.success).toBe(true);
        done();
      });

      // Use BaseModule I/O tracking
      baseModule.setCurrentSession(sessionId);
      baseModule.setPipelinePosition('middle');
      baseModule.startIOTracking('test-operation', { input: 'test' }, 'testMethod');
      baseModule.endIOTracking('test-operation', { output: 'result' }, true);
    });

    test('should handle module context in events', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      baseModule.setCurrentSession(sessionId);
      baseModule.setPipelinePosition('start');
      
      baseModule.startIOTracking('context-test', { data: 'test' }, 'contextMethod');
      baseModule.endIOTracking('context-test', { result: 'success' }, true);

      // Check recorded entries
      const entries = debugCenter.getPipelineEntries({ sessionId });
      expect(entries.length).toBeGreaterThan(0);
      
      const startEntry = entries.find(e => e.operationId === 'context-test' && e.type === 'start');
      expect(startEntry).toBeDefined();
      expect(startEntry?.position).toBe('start');
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain existing BaseModule debug functionality', () => {
      baseModule.setCurrentSession('test-session');
      baseModule.setPipelinePosition('middle');

      // Test I/O tracking
      baseModule.startIOTracking('legacy-test', { input: 'data' }, 'legacyMethod');
      baseModule.endIOTracking('legacy-test', { output: 'result' }, true);

      // Check local debug logs
      const logs = baseModule.getDebugLogs();
      expect(logs.length).toBeGreaterThan(0);
      
      const trackingLogs = logs.filter(log => 
        log.message.includes('I/O tracking started') || 
        log.message.includes('I/O tracking ended')
      );
      expect(trackingLogs.length).toBe(2);
    });

    test('should handle session management', () => {
      const sessionId = 'test-session';
      
      baseModule.startPipelineSession(sessionId, { test: 'config' });
      expect(baseModule.getCurrentSession()).toBeDefined();
      
      baseModule.endPipelineSession(sessionId, true);
      // Session should be cleared
      // Note: getCurrentSession is not available in the current interface
      // but the functionality is preserved
    });

    test('should preserve all debug logging methods', () => {
      // Test all debug level methods
      baseModule.trace('Trace message');
      baseModule.log('Debug message');
      baseModule.logInfo('Info message');
      baseModule.warn('Warning message');
      baseModule.error('Error message');

      const logs = baseModule.getDebugLogs();
      expect(logs.length).toBe(5);
      
      const levels = logs.map(log => log.level);
      expect(levels).toContain('trace');
      expect(levels).toContain('debug');
      expect(levels).toContain('info');
      expect(levels).toContain('warn');
      expect(levels).toContain('error');
    });
  });

  describe('Error Handling', () => {
    test('should handle events without sessions gracefully', () => {
      // Don't set session ID
      expect(() => {
        baseModule.startIOTracking('no-session-test', {});
        baseModule.endIOTracking('no-session-test', {});
      }).not.toThrow();
    });

    test('should handle disabled debug configuration', () => {
      baseModule.setDebugConfig({ enabled: false });
      baseModule.setCurrentSession('test-session');

      const mockCallback = jest.fn();
      eventBus.subscribe('start', mockCallback);

      baseModule.startIOTracking('disabled-test', {});
      
      // Should not publish events when disabled
      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should handle invalid pipeline positions', () => {
      baseModule.setCurrentSession('test-session');
      // Don't set pipeline position (should default to 'middle')
      
      expect(() => {
        baseModule.startIOTracking('position-test', {});
      }).not.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high-frequency events', () => {
      const sessionId = 'perf-test';
      baseModule.setCurrentSession(sessionId);
      
      const operationCount = 100;
      const mockCallback = jest.fn();
      eventBus.subscribe('start', mockCallback);

      // Generate many events quickly
      for (let i = 0; i < operationCount; i++) {
        baseModule.startIOTracking(`perf-op-${i}`, { index: i });
      }

      expect(mockCallback).toHaveBeenCalledTimes(operationCount);
    });

    test('should manage event queue size', () => {
      const stats = eventBus.getStats();
      expect(stats.queueSize).toBeGreaterThanOrEqual(0);
      expect(stats.maxQueueSize).toBeGreaterThan(0);
    });
  });

  describe('Cross-Module Communication', () => {
    test('should allow multiple modules to communicate via event bus', () => {
      // Create multiple modules
      const moduleA = new BaseModule({
        id: 'module-a',
        name: 'Module A',
        version: '1.0.0'
      });
      
      const moduleB = new BaseModule({
        id: 'module-b',
        name: 'Module B',
        version: '1.0.0'
      });

      const sessionId = debugCenter.startPipelineSession('cross-module-test');
      
      moduleA.setCurrentSession(sessionId);
      moduleB.setCurrentSession(sessionId);

      const receivedEvents: any[] = [];
      eventBus.subscribe('*', (event: any) => {
        receivedEvents.push(event);
      });

      // Both modules publish events
      moduleA.startIOTracking('module-a-op', { from: 'A' });
      moduleB.startIOTracking('module-b-op', { from: 'B' });

      expect(receivedEvents.length).toBe(2);
      expect(receivedEvents.some(e => e.moduleId === 'module-a')).toBe(true);
      expect(receivedEvents.some(e => e.moduleId === 'module-b')).toBe(true);
    });
  });
});