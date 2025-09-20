/**
 * RCC DebugCenter Tests
 *
 * Comprehensive unit tests for the DebugCenter class,
 * covering session management, event handling, file operations, and debug functionality.
 */

import { DebugCenter, PipelineSession, DebugCenterConfig } from '../../src/core/DebugCenter';
import { DebugEventBus, DebugEvent } from '../../src/core/DebugEventBus';

// Mock file system
jest.mock('fs');
const mockedFs = require('fs');

// Mock path
jest.mock('path');
const mockedPath = require('path');

describe('DebugCenter', () => {
  let debugCenter: DebugCenter;
  let config: DebugCenterConfig;
  let mockEventBus: DebugEventBus;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock file system methods
    mockedFs.promises = {
      mkdir: jest.fn().mockResolvedValue(undefined)
    };
    mockedFs.writeFileSync = jest.fn();
    mockedFs.existsSync = jest.fn().mockReturnValue(false);

    // Mock path methods
    mockedPath.join = jest.fn().mockImplementation((...args) => args.join('/'));

    config = {
      outputDirectory: './test-debug-logs',
      maxSessions: 100,
      retentionDays: 7,
      enableRealTimeUpdates: true
    };

    debugCenter = new DebugCenter(config);
    mockEventBus = DebugEventBus.getInstance();
  });

  afterEach(() => {
    debugCenter.destroy();
  });

  describe('Constructor and Configuration', () => {
    test('should create DebugCenter with default configuration', () => {
      const defaultCenter = new DebugCenter();
      expect(defaultCenter).toBeInstanceOf(DebugCenter);
      expect(defaultCenter.getConfig().outputDirectory).toBe('./debug-logs');
      expect(defaultCenter.getConfig().maxSessions).toBe(1000);
      defaultCenter.destroy();
    });

    test('should create DebugCenter with custom configuration', () => {
      expect(debugCenter).toBeInstanceOf(DebugCenter);
      expect(debugCenter.getConfig()).toEqual(config);
    });

    test('should ensure output directory on creation', () => {
      expect(mockedFs.promises.mkdir).toHaveBeenCalledWith(
        config.outputDirectory,
        { recursive: true }
      );
    });

    test('should setup event listeners and start cleanup timer', () => {
      // Verify that event listeners are set up by checking the event bus has subscribers
      const stats = mockEventBus.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Session Management', () => {
    test('should handle session start event', () => {
      const event: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'system',
        operationId: 'session_start',
        timestamp: Date.now(),
        type: 'start',
        position: 'start',
        data: { pipelineId: 'test-pipeline' }
      };

      // Manually call the event handler since we're testing the logic directly
      (debugCenter as any).handleSessionStart(event);

      const session = debugCenter.getSession('test-session');
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe('test-session');
      expect(session?.pipelineId).toBe('test-pipeline');
      expect(session?.status).toBe('active');
    });

    test('should handle session end event', () => {
      // First create a session
      const startEvent: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'system',
        operationId: 'session_start',
        timestamp: Date.now(),
        type: 'start',
        position: 'start',
        data: { pipelineId: 'test-pipeline' }
      };
      (debugCenter as any).handleSessionStart(startEvent);

      // Then end it
      const endEvent: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'system',
        operationId: 'session_end',
        timestamp: Date.now() + 1000,
        type: 'end',
        position: 'end'
      };

      (debugCenter as any).handleSessionEnd(endEvent);

      // Session should be removed from active sessions
      const session = debugCenter.getSession('test-session');
      expect(session).toBeUndefined();
    });

    test('should create session from operation event when no session exists', () => {
      const event: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start',
        position: 'middle',
        data: { input: 'test-input' }
      };

      (debugCenter as any).handleOperationStart(event);

      const session = debugCenter.getSession('test-session');
      expect(session).toBeDefined();
      expect(session?.operations).toHaveLength(1);
      expect(session?.operations[0].operationId).toBe('test-operation');
    });

    test('should handle events without session ID gracefully', () => {
      const eventWithoutSession: DebugEvent = {
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start',
        position: 'middle'
      };

      expect(() => {
        (debugCenter as any).handleOperationStart(eventWithoutSession);
      }).not.toThrow();

      const eventWithoutSessionEnd: DebugEvent = {
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'end',
        position: 'middle'
      };

      expect(() => {
        (debugCenter as any).handleOperationEnd(eventWithoutSessionEnd);
      }).not.toThrow();
    });
  });

  describe('Operation Tracking', () => {
    let testSession: PipelineSession;

    beforeEach(() => {
      testSession = {
        sessionId: 'test-session',
        pipelineId: 'test-pipeline',
        startTime: Date.now(),
        status: 'active',
        operations: []
      };
      (debugCenter as any).activeSessions.set('test-session', testSession);
    });

    test('should handle operation start', () => {
      const event: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start',
        position: 'middle',
        data: { input: 'test-data' }
      };

      (debugCenter as any).handleOperationStart(event);

      expect(testSession.operations).toHaveLength(1);
      expect(testSession.operations[0].operationId).toBe('test-operation');
      expect(testSession.operations[0].moduleId).toBe('test-module');
      expect(testSession.operations[0].status).toBe('running');
      expect(testSession.operations[0].input).toBe('test-data');
    });

    test('should handle operation end', () => {
      // First start an operation
      const startEvent: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start',
        position: 'middle'
      };
      (debugCenter as any).handleOperationStart(startEvent);

      // Then end it
      const endEvent: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now() + 100,
        type: 'end',
        position: 'middle',
        data: { output: 'test-result' }
      };

      (debugCenter as any).handleOperationEnd(endEvent);

      const operation = testSession.operations[0];
      expect(operation.status).toBe('completed');
      expect(operation.endTime).toBe(endEvent.timestamp);
      expect(operation.output).toBe('test-result');
    });

    test('should handle operation error', () => {
      // First start an operation
      const startEvent: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start',
        position: 'middle'
      };
      (debugCenter as any).handleOperationStart(startEvent);

      // Then error it
      const errorEvent: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now() + 100,
        type: 'error',
        position: 'middle',
        data: { error: 'Test error message' }
      };

      (debugCenter as any).handleOperationError(errorEvent);

      const operation = testSession.operations[0];
      expect(operation.status).toBe('failed');
      expect(operation.endTime).toBe(errorEvent.timestamp);
      expect(operation.error).toBe('Test error message');
      expect(testSession.status).toBe('failed');
      expect(testSession.endTime).toBe(errorEvent.timestamp);
    });

    test('should handle error events for unknown sessions gracefully', () => {
      const errorEvent: DebugEvent = {
        sessionId: 'unknown-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'error',
        position: 'middle'
      };

      expect(() => {
        (debugCenter as any).handleOperationError(errorEvent);
      }).not.toThrow();
    });
  });

  describe('File Operations', () => {
    test('should create session file on session start', () => {
      const event: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'system',
        operationId: 'session_start',
        timestamp: Date.now(),
        type: 'start',
        position: 'start',
        data: { pipelineId: 'test-pipeline' }
      };

      (debugCenter as any).handleSessionStart(event);

      expect(mockedPath.join).toHaveBeenCalledWith(
        config.outputDirectory,
        'pipeline-session-test-session.json'
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    test('should update session file on operation changes', () => {
      const session: PipelineSession = {
        sessionId: 'test-session',
        pipelineId: 'test-pipeline',
        startTime: Date.now(),
        status: 'active',
        operations: []
      };
      (debugCenter as any).activeSessions.set('test-session', session);

      (debugCenter as any).updateSessionFile(session);

      expect(mockedPath.join).toHaveBeenCalledWith(
        config.outputDirectory,
        'pipeline-session-test-session.json'
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    test('should finalize session file on session end', () => {
      const session: PipelineSession = {
        sessionId: 'test-session',
        pipelineId: 'test-pipeline',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        status: 'completed',
        operations: []
      };
      (debugCenter as any).activeSessions.set('test-session', session);

      (debugCenter as any).finalizeSessionFile(session);

      // Should have called writeJsonFile twice (update + summary)
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    test('should generate session summary correctly', () => {
      const session: PipelineSession = {
        sessionId: 'test-session',
        pipelineId: 'test-pipeline',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        status: 'completed',
        operations: [
          {
            operationId: 'op1',
            moduleId: 'module1',
            position: 'start',
            startTime: Date.now(),
            endTime: Date.now() + 100,
            status: 'completed'
          },
          {
            operationId: 'op2',
            moduleId: 'module2',
            position: 'middle',
            startTime: Date.now() + 200,
            endTime: Date.now() + 400,
            status: 'failed'
          }
        ]
      };

      const summary = (debugCenter as any).generateSessionSummary(session);

      expect(summary.sessionId).toBe('test-session');
      expect(summary.pipelineId).toBe('test-pipeline');
      expect(summary.totalDuration).toBe(1000);
      expect(summary.operationCount).toBe(2);
      expect(summary.successCount).toBe(1);
      expect(summary.failureCount).toBe(1);
      expect(summary.runningCount).toBe(0);
      expect(summary.timeline).toHaveLength(2);
    });

    test('should handle file write errors gracefully', () => {
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      const session: PipelineSession = {
        sessionId: 'test-session',
        pipelineId: 'test-pipeline',
        startTime: Date.now(),
        status: 'active',
        operations: []
      };

      expect(() => {
        (debugCenter as any).writeJsonFile('/test/path', session);
      }).not.toThrow();
    });
  });

  describe('Public API Methods', () => {
    beforeEach(() => {
      // Create test sessions
      const session1: PipelineSession = {
        sessionId: 'session-1',
        pipelineId: 'pipeline-1',
        startTime: Date.now(),
        status: 'active',
        operations: []
      };

      const session2: PipelineSession = {
        sessionId: 'session-2',
        pipelineId: 'pipeline-2',
        startTime: Date.now(),
        status: 'active',
        operations: []
      };

      (debugCenter as any).activeSessions.set('session-1', session1);
      (debugCenter as any).activeSessions.set('session-2', session2);
    });

    test('should get all active sessions', () => {
      const sessions = debugCenter.getActiveSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.sessionId)).toContain('session-1');
      expect(sessions.map(s => s.sessionId)).toContain('session-2');
    });

    test('should get specific session by ID', () => {
      const session = debugCenter.getSession('session-1');
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe('session-1');
    });

    test('should return undefined for non-existent session', () => {
      const session = debugCenter.getSession('non-existent');
      expect(session).toBeUndefined();
    });

    test('should get session count', () => {
      const count = debugCenter.getSessionCount();
      expect(count).toBe(2);
    });

    test('should update configuration', () => {
      const newConfig: Partial<DebugCenterConfig> = {
        maxSessions: 200,
        retentionDays: 14
      };

      debugCenter.updateConfig(newConfig);

      const updatedConfig = debugCenter.getConfig();
      expect(updatedConfig.maxSessions).toBe(200);
      expect(updatedConfig.retentionDays).toBe(14);
      expect(updatedConfig.outputDirectory).toBe(config.outputDirectory); // Unchanged
    });

    test('should ensure output directory when updating config', () => {
      const newConfig: Partial<DebugCenterConfig> = {
        outputDirectory: '/new/path'
      };

      debugCenter.updateConfig(newConfig);

      expect(mockedFs.promises.mkdir).toHaveBeenCalledWith('/new/path', { recursive: true });
    });

    test('should return configuration copy', () => {
      const configCopy = debugCenter.getConfig();
      expect(configCopy).toEqual(config);

      // Verify it's a copy, not the original
      configCopy.outputDirectory = '/modified';
      expect(debugCenter.getConfig().outputDirectory).toBe(config.outputDirectory);
    });
  });

  describe('External Debug Event Processing', () => {
    test('should process valid debug events', () => {
      const event: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start',
        position: 'middle',
        data: { input: 'test-data' }
      };

      debugCenter.processDebugEvent(event);

      const session = debugCenter.getSession('test-session');
      expect(session).toBeDefined();
      expect(session?.operations).toHaveLength(1);
    });

    test('should skip processing when real-time updates are disabled', () => {
      const disabledCenter = new DebugCenter({ enableRealTimeUpdates: false });

      const event: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start',
        position: 'middle'
      };

      disabledCenter.processDebugEvent(event);

      const session = disabledCenter.getSession('test-session');
      expect(session).toBeUndefined();
      disabledCenter.destroy();
    });

    test('should reject invalid debug events', () => {
      const invalidEvent: DebugEvent = {
        sessionId: 'test-session',
        moduleId: '', // Invalid: empty
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start',
        position: 'middle'
      };

      expect(() => {
        debugCenter.processDebugEvent(invalidEvent);
      }).not.toThrow();

      const session = debugCenter.getSession('test-session');
      expect(session).toBeUndefined();
    });

    test('should handle events with missing required fields', () => {
      const incompleteEvent: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        // Missing operationId
        timestamp: Date.now(),
        type: 'start',
        position: 'middle'
      };

      debugCenter.processDebugEvent(incompleteEvent);

      const session = debugCenter.getSession('test-session');
      expect(session).toBeUndefined();
    });

    test('should publish to internal event bus', () => {
      const publishSpy = jest.spyOn(mockEventBus, 'publish');

      const event: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start',
        position: 'middle'
      };

      debugCenter.processDebugEvent(event);

      expect(publishSpy).toHaveBeenCalled();
      publishSpy.mockRestore();
    });
  });

  describe('BaseModule Integration', () => {
    test('should connect BaseModule with external debug handler', () => {
      const mockBaseModule = {
        setExternalDebugHandler: jest.fn()
      };

      debugCenter.connectBaseModule(mockBaseModule);

      expect(mockBaseModule.setExternalDebugHandler).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    test('should handle BaseModule without external debug support', () => {
      const mockBaseModule = {
        // Missing setExternalDebugHandler method
      };

      expect(() => {
        debugCenter.connectBaseModule(mockBaseModule);
      }).not.toThrow();
    });

    test('should process events from connected BaseModule', () => {
      const mockBaseModule = {
        setExternalDebugHandler: jest.fn()
      };

      debugCenter.connectBaseModule(mockBaseModule);

      // Get the handler function that was set
      const handler = mockBaseModule.setExternalDebugHandler.mock.calls[0][0];

      const event: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start',
        position: 'middle'
      };

      handler(event);

      const session = debugCenter.getSession('test-session');
      expect(session).toBeDefined();
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(() => {
      // Create old sessions
      const oldTime = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago

      const oldSession: PipelineSession = {
        sessionId: 'old-session',
        pipelineId: 'pipeline-1',
        startTime: oldTime,
        status: 'active',
        operations: []
      };

      const recentSession: PipelineSession = {
        sessionId: 'recent-session',
        pipelineId: 'pipeline-2',
        startTime: Date.now(),
        status: 'active',
        operations: []
      };

      (debugCenter as any).activeSessions.set('old-session', oldSession);
      (debugCenter as any).activeSessions.set('recent-session', recentSession);
    });

    test('should cleanup old sessions based on retention policy', () => {
      (debugCenter as any).cleanupOldSessions();

      expect(debugCenter.getSession('old-session')).toBeUndefined();
      expect(debugCenter.getSession('recent-session')).toBeDefined();
    });

    test('should handle cleanup timer gracefully', () => {
      jest.useFakeTimers();

      const centerWithCleanup = new DebugCenter({
        ...config,
        retentionDays: 1 // Short retention for testing
      });

      // Add very old session
      const veryOldTime = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
      const oldSession: PipelineSession = {
        sessionId: 'very-old-session',
        pipelineId: 'pipeline-1',
        startTime: veryOldTime,
        status: 'active',
        operations: []
      };
      (centerWithCleanup as any).activeSessions.set('very-old-session', oldSession);

      // Advance timer to trigger cleanup
      jest.advanceTimersByTime(60 * 60 * 1000); // 1 hour

      expect(centerWithCleanup.getSession('very-old-session')).toBeUndefined();

      centerWithCleanup.destroy();
      jest.useRealTimers();
    });
  });

  describe('Destruction and Cleanup', () => {
    test('should destroy DebugCenter and cleanup resources', () => {
      // Add some sessions
      const session: PipelineSession = {
        sessionId: 'destroy-session',
        pipelineId: 'pipeline-1',
        startTime: Date.now(),
        status: 'active',
        operations: []
      };
      (debugCenter as any).activeSessions.set('destroy-session', session);

      expect(() => {
        debugCenter.destroy();
      }).not.toThrow();

      // Sessions should be cleared
      expect(debugCenter.getSessionCount()).toBe(0);
    });

    test('should finalize all active sessions on destruction', () => {
      const session: PipelineSession = {
        sessionId: 'destroy-session',
        pipelineId: 'pipeline-1',
        startTime: Date.now(),
        status: 'active',
        operations: []
      };
      (debugCenter as any).activeSessions.set('destroy-session', session);

      debugCenter.destroy();

      // Should have written final session files
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    test('should handle multiple destroy calls', () => {
      debugCenter.destroy();
      expect(() => {
        debugCenter.destroy();
      }).not.toThrow();
    });

    test('should clear cleanup interval on destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      debugCenter.destroy();

      // Interval should be cleared (called once during normal operation)
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle session end for unknown sessions gracefully', () => {
      const event: DebugEvent = {
        sessionId: 'unknown-session',
        moduleId: 'system',
        operationId: 'session_end',
        timestamp: Date.now(),
        type: 'end',
        position: 'end'
      };

      expect(() => {
        (debugCenter as any).handleSessionEnd(event);
      }).not.toThrow();
    });

    test('should handle operation end for unknown sessions gracefully', () => {
      const event: DebugEvent = {
        sessionId: 'unknown-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'end',
        position: 'middle'
      };

      expect(() => {
        (debugCenter as any).handleOperationEnd(event);
      }).not.toThrow();
    });

    test('should handle operation end for unknown operations gracefully', () => {
      // Create session but no operation
      const session: PipelineSession = {
        sessionId: 'test-session',
        pipelineId: 'pipeline-1',
        startTime: Date.now(),
        status: 'active',
        operations: []
      };
      (debugCenter as any).activeSessions.set('test-session', session);

      const event: DebugEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'unknown-operation',
        timestamp: Date.now(),
        type: 'end',
        position: 'middle'
      };

      expect(() => {
        (debugCenter as any).handleOperationEnd(event);
      }).not.toThrow();
    });

    test('should handle directory creation errors gracefully', () => {
      mockedFs.promises.mkdir.mockRejectedValue(new Error('Permission denied'));

      expect(() => {
        new DebugCenter(config);
      }).not.toThrow();
    });

    test('should handle session with no operations in summary generation', () => {
      const session: PipelineSession = {
        sessionId: 'empty-session',
        pipelineId: 'pipeline-1',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        status: 'completed',
        operations: []
      };

      const summary = (debugCenter as any).generateSessionSummary(session);

      expect(summary.sessionId).toBe('empty-session');
      expect(summary.operationCount).toBe(0);
      expect(summary.successCount).toBe(0);
      expect(summary.failureCount).toBe(0);
      expect(summary.averageOperationDuration).toBe(0);
      expect(summary.timeline).toHaveLength(0);
    });
  });
});