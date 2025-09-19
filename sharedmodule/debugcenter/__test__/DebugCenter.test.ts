import { DebugCenter } from '../src/core/DebugCenter';
import { DebugEventBus } from '../src/core/DebugEventBus';
import { DebugLevel, PipelineOperationType } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DebugCenter', () => {
  let debugCenter: DebugCenter;
  let testDir: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'debugcenter-test-'));
    
    debugCenter = new DebugCenter({
      enabled: true,
      baseDirectory: testDir,
      enableFileLogging: true,
      consoleOutput: false, // Disable console output during tests
      pipelineIO: {
        enabled: true,
        autoRecordPipelineStart: true,
        autoRecordPipelineEnd: true,
        pipelineSessionFileName: 'test-pipeline-session.jsonl',
        pipelineDirectory: testDir,
        recordAllOperations: true,
        includeModuleContext: true,
        includeTimestamp: true,
        includeDuration: true,
        maxPipelineOperationsPerFile: 100,
      }
    });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('Pipeline Session Management', () => {
    test('should start a new pipeline session', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      
      const activeSessions = debugCenter.getActiveSessions();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].pipelineId).toBe('test-pipeline');
      expect(activeSessions[0].pipelineName).toBe('Test Pipeline');
      expect(activeSessions[0].startTime).toBeDefined();
    });

    test('should end a pipeline session', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      // Wait a bit to ensure duration is measurable
      setTimeout(() => {
        debugCenter.endPipelineSession(sessionId, true);
        
        const activeSessions = debugCenter.getActiveSessions();
        expect(activeSessions).toHaveLength(0);
        
        // Check that session was saved to file
        const files = fs.readdirSync(testDir);
        const sessionFiles = files.filter(file => file.endsWith('.json') && !file.endsWith('.jsonl'));
        expect(sessionFiles.length).toBeGreaterThan(0);
      }, 10);
    });

    test('should handle session end with error', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      debugCenter.endPipelineSession(sessionId, false, 'Test error message');
      
      const activeSessions = debugCenter.getActiveSessions();
      expect(activeSessions).toHaveLength(0);
    });
  });

  describe('Pipeline Operation Recording', () => {
    test('should record pipeline start', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      debugCenter.recordPipelineStart(
        sessionId,
        'test-pipeline',
        'Test Pipeline',
        { input: 'test data' }
      );
      
      const entries = debugCenter.getPipelineEntries({ pipelineId: 'test-pipeline' });
      expect(entries).toHaveLength(1);
      expect(entries[0].operationType).toBe(PipelineOperationType.pipeline_start);
      expect(entries[0].input).toEqual({ input: 'test data' });
    });

    test('should record pipeline end', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      debugCenter.recordPipelineEnd(
        sessionId,
        'test-pipeline',
        'Test Pipeline',
        { output: 'test result' },
        true
      );
      
      const entries = debugCenter.getPipelineEntries({ pipelineId: 'test-pipeline' });
      expect(entries).toHaveLength(1);
      expect(entries[0].operationType).toBe(PipelineOperationType.pipeline_end);
      expect(entries[0].output).toEqual({ output: 'test result' });
    });

    test('should record module operation', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      debugCenter.recordOperation(
        sessionId,
        'test-module',
        'test-operation',
        { input: 'test input' },
        { output: 'test output' },
        'testMethod',
        true
      );
      
      const entries = debugCenter.getPipelineEntries({ sessionId });
      expect(entries).toHaveLength(1);
      expect(entries[0].operationType).toBe(PipelineOperationType.module_operation);
      expect(entries[0].moduleId).toBe('test-module');
      expect(entries[0].operationId).toBe('test-operation');
      expect(entries[0].method).toBe('testMethod');
      expect(entries[0].success).toBe(true);
    });

    test('should record failed operation', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      debugCenter.recordOperation(
        sessionId,
        'test-module',
        'test-operation',
        { input: 'test input' },
        null,
        'testMethod',
        false,
        'Test error message'
      );
      
      const entries = debugCenter.getPipelineEntries({ sessionId });
      expect(entries).toHaveLength(1);
      expect(entries[0].success).toBe(false);
      expect(entries[0].error).toBe('Test error message');
    });
  });

  describe('Data Export', () => {
    test('should export data as JSON', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      debugCenter.recordOperation(
        sessionId,
        'test-module',
        'test-operation',
        { input: 'test input' },
        { output: 'test output' }
      );
      
      const jsonExport = debugCenter.exportData({ format: 'json', includeStats: false, includeContext: false });
      expect(() => JSON.parse(jsonExport)).not.toThrow();
      
      const parsed = JSON.parse(jsonExport);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });

    test('should export data as CSV', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      debugCenter.recordOperation(
        sessionId,
        'test-module',
        'test-operation',
        { input: 'test input' },
        { output: 'test output' }
      );
      
      const csvExport = debugCenter.exportData({ format: 'csv', includeStats: false, includeContext: false });
      const lines = csvExport.split('\n');
      
      expect(lines.length).toBeGreaterThan(1); // Header + at least one data line
      expect(lines[0]).toContain('timestamp,pipelineId,pipelineName,moduleId,operationId');
    });

    test('should export data as NDJSON', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      debugCenter.recordOperation(
        sessionId,
        'test-module',
        'test-operation',
        { input: 'test input' },
        { output: 'test output' }
      );
      
      const ndjsonExport = debugCenter.exportData({ format: 'ndjson', includeStats: false, includeContext: false });
      const lines = ndjsonExport.trim().split('\n');
      
      expect(lines.length).toBe(1);
      expect(() => JSON.parse(lines[0])).not.toThrow();
    });
  });

  describe('Statistics', () => {
    test('should return correct statistics', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      
      // Record some operations
      debugCenter.recordOperation(sessionId, 'module1', 'op1', {}, {}, 'method1', true);
      debugCenter.recordOperation(sessionId, 'module2', 'op2', {}, {}, 'method2', true);
      debugCenter.recordOperation(sessionId, 'module3', 'op3', {}, {}, 'method3', false);
      
      const stats = debugCenter.getStats();
      
      expect(stats.totalOperations).toBe(3);
      expect(stats.successfulOperations).toBe(2);
      expect(stats.failedOperations).toBe(1);
      expect(stats.totalSessions).toBeGreaterThanOrEqual(1);
      expect(stats.averageDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration', () => {
    test('should update configuration', () => {
      const newConfig = {
        enabled: false,
        level: 'error' as DebugLevel,
        consoleOutput: false
      };
      
      debugCenter.updateConfig(newConfig);
      
      // Should not throw an error
      expect(() => debugCenter.startPipelineSession('test', 'Test')).not.toThrow();
    });
  });

  describe('Event Bus Integration', () => {
    test('should handle debug events from event bus', () => {
      const eventBus = DebugEventBus.getInstance();
      
      const testEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start' as const,
        position: 'middle' as const,
        data: { input: 'test input' }
      };
      
      eventBus.publish(testEvent);
      
      // Allow some time for async processing
      setTimeout(() => {
        const entries = debugCenter.getPipelineEntries({ sessionId: 'test-session' });
        expect(entries.length).toBeGreaterThan(0);
      }, 10);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid session operations gracefully', () => {
      // Try to record operation for non-existent session
      expect(() => {
        debugCenter.recordOperation(
          'non-existent-session',
          'test-module',
          'test-operation',
          {},
          {}
        );
      }).not.toThrow();
    });

    test('should handle ending non-existent session gracefully', () => {
      expect(() => {
        debugCenter.endPipelineSession('non-existent-session');
      }).not.toThrow();
    });
  });

  describe('File Operations', () => {
    test('should create pipeline session file', () => {
      const sessionId = debugCenter.startPipelineSession('test-pipeline', 'Test Pipeline');
      debugCenter.endPipelineSession(sessionId, true);
      
      const files = fs.readdirSync(testDir);
      const sessionFiles = files.filter(file => 
        file.endsWith('.json') && !file.endsWith('.jsonl') && file.includes('test-pipeline')
      );
      
      expect(sessionFiles.length).toBeGreaterThan(0);
      
      // Verify file content
      const sessionFile = path.join(testDir, sessionFiles[0]);
      const content = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      expect(content.pipelineId).toBe('test-pipeline');
      expect(content.pipelineName).toBe('Test Pipeline');
      expect(content.sessionId).toBe(sessionId);
    });
  });
});