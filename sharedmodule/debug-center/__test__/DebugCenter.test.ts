/**
 * DebugCenter Tests
 */

import { DebugCenter } from '../src/DebugCenter';
import { DebugEventBus } from 'rcc-basemodule';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

describe('DebugCenter', () => {
  let debugCenter: DebugCenter;
  let testOutputDir: string;
  let eventBus: DebugEventBus;

  beforeEach(() => {
    testOutputDir = path.join(__dirname, 'test-logs');
    debugCenter = new DebugCenter({
      outputDirectory: testOutputDir,
      maxSessions: 10,
      retentionDays: 1,
      enableRealTimeUpdates: false
    });

    eventBus = DebugEventBus.getInstance();

    // Clean up any existing test files
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterEach(async () => {
    await debugCenter.destroy();

    // Clean up test files
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('Session Management', () => {
    test('should create and track sessions', () => {
      const sessionId = uuidv4();

      // Send session start event
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'session_start',
        timestamp: Date.now(),
        type: 'start',
        position: 'start',
        data: {
          pipelineConfig: {
            pipelineId: 'test-pipeline',
            startModule: 'test-module',
            middleModules: [],
            endModule: 'test-module',
            recordingMode: 'unified'
          }
        }
      });

      // Check session was created
      expect(debugCenter.getSessionCount()).toBe(1);
      const session = debugCenter.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session!.sessionId).toBe(sessionId);
      expect(session!.status).toBe('active');
    });

    test('should handle session completion', () => {
      const sessionId = uuidv4();

      // Start session
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'session_start',
        timestamp: Date.now(),
        type: 'start',
        position: 'start',
        data: {
          pipelineConfig: {
            pipelineId: 'test-pipeline',
            startModule: 'test-module',
            middleModules: [],
            endModule: 'test-module',
            recordingMode: 'unified'
          }
        }
      });

      // End session
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'session_end',
        timestamp: Date.now() + 1000,
        type: 'end',
        position: 'end',
        data: { success: true }
      });

      // Check session was completed
      const session = debugCenter.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session!.status).toBe('completed');
      expect(session!.endTime).toBeDefined();
    });

    test('should handle operations within sessions', () => {
      const sessionId = uuidv4();

      // Start session
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'session_start',
        timestamp: Date.now(),
        type: 'start',
        position: 'start',
        data: {
          pipelineConfig: {
            pipelineId: 'test-pipeline',
            startModule: 'test-module',
            middleModules: [],
            endModule: 'test-module',
            recordingMode: 'unified'
          }
        }
      });

      // Add operation
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now() + 100,
        type: 'start',
        position: 'middle',
        data: { input: 'test-input' }
      });

      // Complete operation
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now() + 200,
        type: 'end',
        position: 'middle',
        data: { output: 'test-output' }
      });

      // Check operations were tracked
      const session = debugCenter.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session!.operations.length).toBe(1);
      expect(session!.operations[0].operationId).toBe('test-operation');
      expect(session!.operations[0].status).toBe('completed');
    });

    test('should handle operation errors', () => {
      const sessionId = uuidv4();

      // Start session
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'session_start',
        timestamp: Date.now(),
        type: 'start',
        position: 'start',
        data: {
          pipelineConfig: {
            pipelineId: 'test-pipeline',
            startModule: 'test-module',
            middleModules: [],
            endModule: 'test-module',
            recordingMode: 'unified'
          }
        }
      });

      // Add operation that fails
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'failing-operation',
        timestamp: Date.now() + 100,
        type: 'start',
        position: 'middle',
        data: { input: 'test-input' }
      });

      // Mark operation as failed
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'failing-operation',
        timestamp: Date.now() + 200,
        type: 'error',
        position: 'middle',
        data: { error: 'Test error message' }
      });

      // Check error was tracked
      const session = debugCenter.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session!.operations.length).toBe(1);
      expect(session!.operations[0].status).toBe('failed');
      expect(session!.operations[0].error).toBe('Test error message');
    });
  });

  describe('File Management', () => {
    test('should create session files', () => {
      const sessionId = uuidv4();

      // Start session
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'session_start',
        timestamp: Date.now(),
        type: 'start',
        position: 'start',
        data: {
          pipelineConfig: {
            pipelineId: 'test-pipeline',
            startModule: 'test-module',
            middleModules: [],
            endModule: 'test-module',
            recordingMode: 'unified'
          }
        }
      });

      // Check file was created
      const sessionFile = path.join(testOutputDir, `pipeline-session-${sessionId}.json`);
      expect(fs.existsSync(sessionFile)).toBe(true);

      // Check file content
      const content = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
      expect(content.sessionId).toBe(sessionId);
      expect(content.pipelineId).toBe('test-pipeline');
      expect(content.status).toBe('active');
    });

    test('should create summary files on session completion', () => {
      const sessionId = uuidv4();

      // Start session
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'session_start',
        timestamp: Date.now(),
        type: 'start',
        position: 'start',
        data: {
          pipelineConfig: {
            pipelineId: 'test-pipeline',
            startModule: 'test-module',
            middleModules: [],
            endModule: 'test-module',
            recordingMode: 'unified'
          }
        }
      });

      // Add operation
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now() + 100,
        type: 'start',
        position: 'middle',
        data: { input: 'test-input' }
      });

      // Complete operation
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now() + 200,
        type: 'end',
        position: 'middle',
        data: { output: 'test-output' }
      });

      // End session
      eventBus.publish({
        sessionId,
        moduleId: 'test-module',
        operationId: 'session_end',
        timestamp: Date.now() + 300,
        type: 'end',
        position: 'end',
        data: { success: true }
      });

      // Wait for async operations to complete
      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        // Check summary file was created
        const summaryFile = path.join(testOutputDir, `pipeline-session-${sessionId}-summary.json`);
        expect(fs.existsSync(summaryFile)).toBe(true);

        // Check summary content
        const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
        expect(summary.sessionId).toBe(sessionId);
        expect(summary.operationCount).toBe(1);
        expect(summary.successCount).toBe(1);
        expect(summary.failureCount).toBe(0);
      });
    });
  });

  describe('Configuration', () => {
    test('should allow configuration updates', () => {
      const originalConfig = debugCenter.getConfig();

      debugCenter.updateConfig({
        maxSessions: 50,
        retentionDays: 14
      });

      const newConfig = debugCenter.getConfig();
      expect(newConfig.maxSessions).toBe(50);
      expect(newConfig.retentionDays).toBe(14);
      expect(newConfig.outputDirectory).toBe(originalConfig.outputDirectory);
    });
  });
});