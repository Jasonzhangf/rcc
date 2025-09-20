/**
 * RCC IOTracker Tests
 *
 * Comprehensive unit tests for the IOTracker class,
 * covering IO recording, performance tracking, session management, and debug functionality.
 */

import { IOTracker } from '../../src/core/IOTracker';
import { IORecord, DebugConfig } from '../../src/interfaces/ModularInterfaces';

// Mock uuid
jest.mock('uuid');
const mockedUuid = require('uuid');

describe('IOTracker', () => {
  let tracker: IOTracker;
  let mockUuidv4: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUuidv4 = jest.fn()
      .mockReturnValue('test-uuid-1')
      .mockReturnValueOnce('test-session-uuid')
      .mockReturnValueOnce('test-record-uuid-1')
      .mockReturnValueOnce('test-record-uuid-2')
      .mockReturnValueOnce('test-record-uuid-3')
      .mockReturnValueOnce('test-record-uuid-4');

    mockedUuid.v4 = mockUuidv4;
    tracker = new IOTracker();
  });

  afterEach(() => {
    tracker.destroy();
  });

  describe('Constructor and Configuration', () => {
    test('should create tracker with default configuration', () => {
      expect(tracker).toBeInstanceOf(IOTracker);
      expect(tracker).toBeDefined();
    });

    test('should create tracker with custom configuration', () => {
      const customConfig: Partial<DebugConfig> = {
        enableIOTracking: false,
        enablePerformanceMonitoring: false,
        enableSampling: true,
        sampleRate: 0.5
      };

      const customTracker = new IOTracker(customConfig);
      expect(customTracker).toBeInstanceOf(IOTracker);
      customTracker.destroy();
    });

    test('should handle minimal configuration', () => {
      const minimalTracker = new IOTracker({});
      expect(minimalTracker).toBeInstanceOf(IOTracker);
      minimalTracker.destroy();
    });
  });

  describe('Session Management', () => {
    test('should start session with provided session ID', () => {
      const sessionId = 'test-session';
      const requestId = tracker.startSession(sessionId);

      expect(requestId).toBe('test-session-uuid');
      expect(mockUuidv4).toHaveBeenCalled();
    });

    test('should start session with generated request ID when not provided', () => {
      mockUuidv4.mockReturnValue('generated-request-uuid');
      const sessionId = 'test-session';
      const requestId = tracker.startSession(sessionId);

      expect(requestId).toBe('generated-request-uuid');
    });

    test('should create session tracking data', () => {
      const sessionId = 'test-session';
      tracker.startSession(sessionId);

      const sessionData = (tracker as any).getSessionData(sessionId);
      expect(sessionData).toBeDefined();
      expect(sessionData.sessionId).toBe(sessionId);
      expect(sessionData.ioRecords).toHaveLength(1); // session_start record
      expect(sessionData.startTime).toBeGreaterThan(0);
    });

    test('should record session start automatically', () => {
      const sessionId = 'test-session';
      tracker.startSession(sessionId);

      const records = tracker.getIORecords({ sessionId });
      expect(records).toHaveLength(1);
      expect(records[0].step).toBe('session_start');
      expect(records[0].type).toBe('transformation');
    });

    test('should end session and record session end', () => {
      const sessionId = 'test-session';
      tracker.startSession(sessionId);
      tracker.endSession(sessionId);

      const records = tracker.getIORecords({ sessionId });
      expect(records).toHaveLength(2);
      expect(records[0].step).toBe('session_start');
      expect(records[1].step).toBe('session_end');
      expect(records[1].data.sessionEnd).toBe(true);
    });

    test('should handle ending non-existent session', () => {
      expect(() => {
        tracker.endSession('non-existent-session');
      }).not.toThrow();
    });
  });

  describe('IO Recording', () => {
    test('should record IO operation successfully', () => {
      const sessionId = 'test-session';
      tracker.startSession(sessionId);

      const record = {
        sessionId,
        requestId: 'test-request',
        moduleId: 'test-module',
        step: 'test-step',
        data: { test: 'data' },
        size: 100,
        processingTime: 50,
        type: 'transformation' as const
      };

      const recordId = (tracker as any).recordIO(record);
      expect(recordId).toBe('test-record-uuid-1');

      const records = tracker.getIORecords({ sessionId });
      expect(records).toHaveLength(2); // session_start + test record
      expect(records[1].data).toEqual({ test: 'data' });
    });

    test('should skip recording when IO tracking is disabled', () => {
      const disabledTracker = new IOTracker({ enableIOTracking: false });
      const sessionId = 'test-session';
      disabledTracker.startSession(sessionId);

      const record = {
        sessionId,
        requestId: 'test-request',
        moduleId: 'test-module',
        step: 'test-step',
        data: { test: 'data' },
        size: 100,
        processingTime: 50,
        type: 'transformation' as const
      };

      const recordId = (disabledTracker as any).recordIO(record);
      expect(recordId).toBe('');

      const records = disabledTracker.getIORecords({ sessionId });
      expect(records).toHaveLength(1); // Only session_start
      disabledTracker.destroy();
    });

    test('should respect sampling configuration', () => {
      const samplingTracker = new IOTracker({
        enableSampling: true,
        sampleRate: 0.5
      });
      const sessionId = 'test-session';
      samplingTracker.startSession(sessionId);

      // Mock Math.random to return values that should be filtered out
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.8); // Above sample rate of 0.5

      const record = {
        sessionId,
        requestId: 'test-request',
        moduleId: 'test-module',
        step: 'test-step',
        data: { test: 'data' },
        size: 100,
        processingTime: 50,
        type: 'transformation' as const
      };

      const recordId = (samplingTracker as any).recordIO(record);
      expect(recordId).toBe('');

      const records = samplingTracker.getIORecords({ sessionId });
      expect(records).toHaveLength(1); // Only session_start

      Math.random = originalRandom;
      samplingTracker.destroy();
    });

    test('should add record to global records', () => {
      const sessionId1 = 'test-session-1';
      const sessionId2 = 'test-session-2';
      tracker.startSession(sessionId1);
      tracker.startSession(sessionId2);

      const record = {
        sessionId: sessionId1,
        requestId: 'test-request',
        moduleId: 'test-module',
        step: 'test-step',
        data: { test: 'data' },
        size: 100,
        processingTime: 50,
        type: 'transformation' as const
      };

      (tracker as any).recordIO(record);

      const globalRecords = tracker.getIORecords();
      expect(globalRecords.length).toBeGreaterThan(0);
    });

    test('should enforce maximum global records limit', () => {
      // Set low limit for testing
      (tracker as any).maxGlobalRecords = 3;

      // Add more records than the limit
      for (let i = 0; i < 5; i++) {
        tracker.startSession(`session-${i}`);
      }

      const globalRecords = tracker.getIORecords();
      expect(globalRecords.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Step Tracking', () => {
    test('should track successful step execution', async () => {
      const sessionId = 'test-session';
      tracker.startSession(sessionId);

      const mockOperation = jest.fn().mockResolvedValue('success-result');

      const result = await (tracker as any).trackStepExecution(
        sessionId,
        'test-request',
        'test-module',
        'test-step',
        mockOperation
      );

      expect(result).toBe('success-result');
      expect(mockOperation).toHaveBeenCalled();

      const records = tracker.getIORecords({ sessionId });
      const stepRecord = records.find(r => r.step === 'test-step');
      expect(stepRecord).toBeDefined();
      expect(stepRecord?.data.success).toBe(true);
      expect(stepRecord?.processingTime).toBeGreaterThan(0);
    });

    test('should track failed step execution', async () => {
      const sessionId = 'test-session';
      tracker.startSession(sessionId);

      const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));

      await expect(
        (tracker as any).trackStepExecution(
          sessionId,
          'test-request',
          'test-module',
          'test-step',
          mockOperation
        )
      ).rejects.toThrow('Test error');

      const records = tracker.getIORecords({ sessionId });
      const stepRecord = records.find(r => r.step === 'test-step');
      expect(stepRecord).toBeDefined();
      expect(stepRecord?.type).toBe('error');
      expect(stepRecord?.data.error).toBe('Test error');
    });
  });

  describe('Request and Response Tracking', () => {
    test('should track request with correct data', () => {
      const sessionId = 'test-session';
      tracker.startSession(sessionId);

      const requestData = { message: 'Hello', model: 'test-model' };
      const recordId = tracker.trackRequest(
        sessionId,
        'test-request',
        'test-module',
        requestData
      );

      expect(recordId).toBeDefined();

      const records = tracker.getIORecords({ sessionId });
      const requestRecord = records.find(r => r.step === 'request');
      expect(requestRecord).toBeDefined();
      expect(requestRecord?.type).toBe('request');
      expect(requestRecord?.data).toEqual(requestData);
    });

    test('should track response with processing time', () => {
      const sessionId = 'test-session';
      tracker.startSession(sessionId);

      const responseData = { choices: [{ message: { content: 'Hello' } }] };
      const requestTime = Date.now() - 100;

      const recordId = tracker.trackResponse(
        sessionId,
        'test-request',
        'test-module',
        responseData,
        requestTime
      );

      expect(recordId).toBeDefined();

      const records = tracker.getIORecords({ sessionId });
      const responseRecord = records.find(r => r.step === 'response');
      expect(responseRecord).toBeDefined();
      expect(responseRecord?.type).toBe('response');
      expect(responseRecord?.data).toEqual(responseData);
      expect(responseRecord?.processingTime).toBeGreaterThan(90); // Allow some timing variance
    });
  });

  describe('Debug Data Management', () => {
    test('should add debug data to session', () => {
      const sessionId = 'test-session';
      tracker.startSession(sessionId);

      tracker.addDebugData(sessionId, 'test-key', 'test-value');
      tracker.addDebugData(sessionId, 'another-key', { complex: 'data' });

      const sessionData = (tracker as any).getSessionData(sessionId);
      expect(sessionData.debugData.get('test-key')).toBe('test-value');
      expect(sessionData.debugData.get('another-key')).toEqual({ complex: 'data' });
    });

    test('should handle adding debug data to non-existent session', () => {
      expect(() => {
        tracker.addDebugData('non-existent-session', 'key', 'value');
      }).not.toThrow();
    });

    test('should retrieve session data correctly', () => {
      const sessionId = 'test-session';
      tracker.startSession(sessionId);

      const sessionData = (tracker as any).getSessionData(sessionId);
      expect(sessionData).toBeDefined();
      expect(sessionData.sessionId).toBe(sessionId);
    });

    test('should return undefined for non-existent session', () => {
      const sessionData = (tracker as any).getSessionData('non-existent-session');
      expect(sessionData).toBeUndefined();
    });
  });

  describe('Record Filtering', () => {
    beforeEach(() => {
      // Setup test data
      tracker.startSession('session-1');
      tracker.startSession('session-2');

      // Add various records
      (tracker as any).recordIO({
        sessionId: 'session-1',
        requestId: 'req-1',
        moduleId: 'module-a',
        step: 'step-1',
        data: {},
        size: 100,
        processingTime: 50,
        type: 'request'
      });

      (tracker as any).recordIO({
        sessionId: 'session-2',
        requestId: 'req-2',
        moduleId: 'module-b',
        step: 'step-2',
        data: {},
        size: 200,
        processingTime: 100,
        type: 'response'
      });

      (tracker as any).recordIO({
        sessionId: 'session-1',
        requestId: 'req-1',
        moduleId: 'module-a',
        step: 'step-3',
        data: {},
        size: 150,
        processingTime: 75,
        type: 'error'
      });
    });

    test('should filter records by session ID', () => {
      const records = tracker.getIORecords({ sessionId: 'session-1' });
      expect(records).toHaveLength(3); // session_start + 2 additional records
      expect(records.every(r => r.sessionId === 'session-1')).toBe(true);
    });

    test('should filter records by request ID', () => {
      const records = tracker.getIORecords({ requestId: 'req-1' });
      expect(records).toHaveLength(2);
      expect(records.every(r => r.requestId === 'req-1')).toBe(true);
    });

    test('should filter records by module ID', () => {
      const records = tracker.getIORecords({ moduleId: 'module-a' });
      expect(records).toHaveLength(2);
      expect(records.every(r => r.moduleId === 'module-a')).toBe(true);
    });

    test('should filter records by type', () => {
      const records = tracker.getIORecords({ type: 'error' });
      expect(records).toHaveLength(1);
      expect(records[0].type).toBe('error');
    });

    test('should filter records by time range', () => {
      const now = Date.now();
      const recentRecords = tracker.getIORecords({
        timeRange: {
          start: now - 1000,
          end: now + 1000
        }
      });
      expect(recentRecords.length).toBeGreaterThan(0);
    });

    test('should filter records by size range', () => {
      const records = tracker.getIORecords({
        sizeRange: {
          min: 120,
          max: 180
        }
      });
      expect(records).toHaveLength(1);
      expect(records[0].size).toBe(150);
    });

    test('should handle combined filters', () => {
      const records = tracker.getIORecords({
        sessionId: 'session-1',
        moduleId: 'module-a',
        type: 'request'
      });
      expect(records).toHaveLength(1);
      expect(records[0].sessionId).toBe('session-1');
      expect(records[0].moduleId).toBe('module-a');
      expect(records[0].type).toBe('request');
    });

    test('should return records sorted by timestamp (newest first)', () => {
      const records = tracker.getIORecords();
      for (let i = 1; i < records.length; i++) {
        expect(records[i - 1].timestamp).toBeGreaterThanOrEqual(records[i].timestamp);
      }
    });
  });

  describe('Performance Analysis', () => {
    beforeEach(() => {
      tracker.startSession('perf-session');

      // Add test records with different processing times
      (tracker as any).recordIO({
        sessionId: 'perf-session',
        requestId: 'perf-req',
        moduleId: 'fast-module',
        step: 'fast-step',
        data: {},
        size: 100,
        processingTime: 10,
        type: 'transformation'
      });

      (tracker as any).recordIO({
        sessionId: 'perf-session',
        requestId: 'perf-req',
        moduleId: 'slow-module',
        step: 'slow-step',
        data: {},
        size: 200,
        processingTime: 100,
        type: 'transformation'
      });

      (tracker as any).recordIO({
        sessionId: 'perf-session',
        requestId: 'perf-req',
        moduleId: 'fast-module',
        step: 'fast-step',
        data: {},
        size: 150,
        processingTime: 15,
        type: 'request'
      });
    });

    test('should calculate performance analysis correctly', () => {
      const analysis = tracker.getPerformanceAnalysis('perf-session');

      expect(analysis.totalProcessingTime).toBe(125); // 10 + 100 + 15
      expect(analysis.averageStepTime).toBeCloseTo(41.67, 1); // 125 / 3
      expect(analysis.throughput).toBeGreaterThan(0);
      expect(analysis.networkLatency.total).toBe(15); // Only the request
      expect(analysis.networkLatency.average).toBe(15);
    });

    test('should identify bottleneck step', () => {
      const analysis = tracker.getPerformanceAnalysis('perf-session');
      expect(analysis.bottleneckStep).toBe('slow-module.slow-step');
    });

    test('should handle empty records for performance analysis', () => {
      const analysis = tracker.getPerformanceAnalysis('non-existent-session');
      expect(analysis.totalProcessingTime).toBe(0);
      expect(analysis.averageStepTime).toBe(0);
      expect(analysis.throughput).toBe(0);
      expect(analysis.bottleneckStep).toBeUndefined();
    });

    test('should calculate global performance analysis', () => {
      const analysis = tracker.getPerformanceAnalysis();
      expect(analysis.totalProcessingTime).toBeGreaterThan(0);
      expect(analysis.averageStepTime).toBeGreaterThan(0);
    });
  });

  describe('Debug Report Generation', () => {
    test('should generate global debug report', () => {
      tracker.startSession('report-session-1');
      tracker.startSession('report-session-2');

      const report = tracker.generateDebugReport();

      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.summary.totalSessions).toBe(2);
      expect(report.summary.totalRecords).toBeGreaterThan(0);
      expect(report.summary.activeSessions).toBe(2);
      expect(report.global).toBeDefined();
      expect(report.global.performanceAnalysis).toBeDefined();
      expect(report.global.recentErrors).toBeDefined();
      expect(report.global.topSlowSteps).toBeDefined();
    });

    test('should generate session-specific debug report', () => {
      const sessionId = 'report-session';
      tracker.startSession(sessionId);
      tracker.addDebugData(sessionId, 'debug-key', 'debug-value');

      const report = tracker.generateDebugReport(sessionId);

      expect(report.session).toBeDefined();
      expect(report.session.sessionId).toBe(sessionId);
      expect(report.session.duration).toBeGreaterThan(0);
      expect(report.session.performanceAnalysis).toBeDefined();
      expect(report.session.debugData.debugKey).toBe('debug-value');
    });

    test('should handle report generation for non-existent session', () => {
      const report = tracker.generateDebugReport('non-existent-session');
      expect(report.session).toBeUndefined();
      expect(report.summary).toBeDefined();
    });
  });

  describe('Top Slow Steps Analysis', () => {
    beforeEach(() => {
      tracker.startSession('slow-steps-session');

      // Add records with varying processing times
      const steps = [
        { moduleId: 'module-a', step: 'step-1', time: 50 },
        { moduleId: 'module-b', step: 'step-1', time: 100 },
        { moduleId: 'module-a', step: 'step-2', time: 75 },
        { moduleId: 'module-b', step: 'step-1', time: 120 }
      ];

      steps.forEach(({ moduleId, step, time }) => {
        (tracker as any).recordIO({
          sessionId: 'slow-steps-session',
          requestId: 'slow-req',
          moduleId,
          step,
          data: {},
          size: 100,
          processingTime: time,
          type: 'transformation'
        });
      });
    });

    test('should identify top slow steps correctly', () => {
      const topSlowSteps = (tracker as any).getTopSlowSteps(3);

      expect(topSlowSteps).toHaveLength(3);

      // module-b.step-1 should be first (average: 110)
      expect(topSlowSteps[0].step).toBe('module-b.step-1');
      expect(topSlowSteps[0].averageTime).toBe(110);
      expect(topSlowSteps[0].count).toBe(2);

      // module-a.step-2 should be second (average: 75)
      expect(topSlowSteps[1].step).toBe('module-a.step-2');
      expect(topSlowSteps[1].averageTime).toBe(75);
      expect(topSlowSteps[1].count).toBe(1);

      // module-a.step-1 should be third (average: 50)
      expect(topSlowSteps[2].step).toBe('module-a.step-1');
      expect(topSlowSteps[2].averageTime).toBe(50);
      expect(topSlowSteps[2].count).toBe(1);
    });

    test('should respect limit parameter', () => {
      const topSlowSteps = (tracker as any).getTopSlowSteps(1);
      expect(topSlowSteps).toHaveLength(1);
      expect(topSlowSteps[0].step).toBe('module-b.step-1');
    });
  });

  describe('Metrics Updates', () => {
    test('should update performance metrics for new records', () => {
      const sessionId = 'metrics-session';
      tracker.startSession(sessionId);

      const record = {
        sessionId,
        requestId: 'metrics-req',
        moduleId: 'metrics-module',
        step: 'metrics-step',
        data: {},
        size: 100,
        processingTime: 50,
        type: 'transformation' as const
      };

      (tracker as any).recordIO(record);

      const sessionData = (tracker as any).getSessionData(sessionId);
      const moduleStats = sessionData.performanceMetrics.moduleStats['metrics-module'];

      expect(moduleStats).toBeDefined();
      expect(moduleStats.calls).toBe(1);
      expect(moduleStats.averageProcessingTime).toBe(50);
      expect(moduleStats.errors).toBe(0);
    });

    test('should track error counts correctly', () => {
      const sessionId = 'error-session';
      tracker.startSession(sessionId);

      const errorRecord = {
        sessionId,
        requestId: 'error-req',
        moduleId: 'error-module',
        step: 'error-step',
        data: {},
        size: 0,
        processingTime: 25,
        type: 'error' as const
      };

      (tracker as any).recordIO(errorRecord);

      const sessionData = (tracker as any).getSessionData(sessionId);
      const moduleStats = sessionData.performanceMetrics.moduleStats['error-module'];

      expect(moduleStats.errors).toBe(1);
    });
  });

  describe('Cleanup Operations', () => {
    test('should cleanup old records periodically', () => {
      jest.useFakeTimers();

      const cleanupTracker = new IOTracker({
        enablePerformanceMonitoring: true
      });

      // Add old records
      const oldTime = Date.now() - 2 * 3600000; // 2 hours ago
      jest.spyOn(Date, 'now').mockReturnValue(oldTime);
      cleanupTracker.startSession('old-session');

      // Add recent records
      const recentTime = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(recentTime);
      cleanupTracker.startSession('recent-session');

      // Trigger cleanup
      jest.advanceTimersByTime(60000); // 1 minute

      // Check that old records are cleaned up
      const oldSessionData = (cleanupTracker as any).getSessionData('old-session');
      expect(oldSessionData).toBeUndefined();

      const recentSessionData = (cleanupTracker as any).getSessionData('recent-session');
      expect(recentSessionData).toBeDefined();

      cleanupTracker.destroy();
      jest.useRealTimers();
    });

    test('should handle cleanup when performance monitoring is disabled', () => {
      const disabledTracker = new IOTracker({
        enablePerformanceMonitoring: false
      });

      expect(() => {
        disabledTracker.startSession('test-session');
        // No cleanup should occur
      }).not.toThrow();

      disabledTracker.destroy();
    });
  });

  describe('Destruction and Cleanup', () => {
    test('should destroy tracker and cleanup resources', () => {
      tracker.startSession('destroy-session');
      tracker.addDebugData('destroy-session', 'key', 'value');

      expect(() => {
        tracker.destroy();
      }).not.toThrow();

      // Should handle operations after destruction gracefully
      expect(() => {
        tracker.addDebugData('destroy-session', 'another-key', 'another-value');
      }).not.toThrow();
    });

    test('should handle multiple destroy calls', () => {
      tracker.startSession('multi-destroy-session');

      tracker.destroy();
      expect(() => {
        tracker.destroy();
      }).not.toThrow();
    });

    test('should clear intervals and data on destroy', () => {
      tracker.startSession('cleanup-session');

      const metricsInterval = (tracker as any).metricsInterval;
      expect(metricsInterval).toBeDefined();

      tracker.destroy();

      expect((tracker as any).metricsInterval).toBeNull();
      expect((tracker as any).trackingData.size).toBe(0);
      expect((tracker as any).globalIORecords).toHaveLength(0);
    });
  });
});