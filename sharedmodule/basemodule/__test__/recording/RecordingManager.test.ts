import { RecordingManager } from '../../src/recording/RecordingManager';
import { BaseModuleRecordingConfig } from '../../src/interfaces/Recording';

describe('RecordingManager', () => {
  let recordingManager: RecordingManager;
  let basicConfig: BaseModuleRecordingConfig;

  beforeEach(() => {
    basicConfig = {
      enabled: true,
      basePath: './test-logs',
      cycle: {
        enabled: true,
        mode: 'single',
        basePath: './test-logs/cycles',
        cycleDirTemplate: 'cycles/${cycleId}',
        mainFileTemplate: 'main.json',
        summaryFileTemplate: 'summary.json',
        format: 'json',
        includeIndex: true,
        includeTimestamp: true,
        autoCreateDirectory: true,
        autoCloseOnComplete: true,
        maxCyclesRetained: 100
      },
      error: {
        enabled: true,
        levels: ['error', 'fatal'],
        categories: ['system', 'processing'],
        basePath: './test-logs/errors',
        indexFileTemplate: 'errors/index.jsonl',
        detailFileTemplate: 'errors/${errorId}.json',
        summaryFileTemplate: 'errors/summary.json',
        dailyDirTemplate: 'errors/${date}',
        indexFormat: 'jsonl',
        detailFormat: 'json',
        autoRecoveryTracking: true,
        maxErrorsRetained: 1000,
        enableStatistics: true
      },
      truncation: {
        enabled: true,
        defaultStrategy: 'truncate',
        defaultMaxLength: 1000,
        defaultReplacementText: '[...]',
        fields: [],
        pathPatterns: [],
        excludedFields: [],
        preserveStructure: true,
        truncateArrays: true,
        arrayTruncateLimit: 100,
        recursiveTruncation: true
      }
    };

    recordingManager = new RecordingManager(basicConfig);
  });

  describe('Configuration Management', () => {
    test('should initialize with default configuration', () => {
      const manager = new RecordingManager();
      const config = manager.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.basePath).toBe('./recording-logs');
    });

    test('should update configuration', async () => {
      const newConfig = {
        enabled: false,
        basePath: './updated-logs'
      };

      const result = await recordingManager.updateConfig(newConfig);

      expect(result.success).toBe(true);
      const updatedConfig = recordingManager.getConfig();
      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.basePath).toBe('./updated-logs');
    });

    test('should validate configuration', async () => {
      const invalidConfig = {
        cycle: {
          enabled: true,
          // Missing required basePath
        }
      };

      const result = await recordingManager.updateConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('Request Context Management', () => {
    test('should create new request context', () => {
      const context = recordingManager.createRequestContext({
        customConfig: { module: 'test-module' }
      });

      expect(context.requestId).toBeDefined();
      expect(context.sessionId).toBeDefined();
      expect(context.traceId).toBeDefined();
      expect(context.chainId).toBeDefined();
      expect(context.currentModule).toBe('test-module');
      expect(context.status).toBe('active');
    });

    test('should inherit context when specified', () => {
      const parentContext = recordingManager.createRequestContext({
        customConfig: { module: 'parent-module' }
      });

      const childContext = recordingManager.createRequestContext({
        inheritContext: parentContext.requestId,
        customConfig: { module: 'child-module' }
      });

      expect(childContext.chainId).toBe(parentContext.chainId);
      expect(childContext.sessionId).toBe(parentContext.sessionId);
      expect(childContext.currentModule).toBe('child-module');
      expect(childContext.moduleStack).toContain('parent-module');
      expect(childContext.moduleStack).toContain('child-module');
    });

    test('should update request context', () => {
      const context = recordingManager.createRequestContext({
        customConfig: { module: 'test-module' }
      });

      const success = recordingManager.updateRequestContext(context.requestId, {
        currentPath: '/new/path',
        currentModule: 'updated-module'
      });

      expect(success).toBe(true);
      const updatedContext = recordingManager.getRequestContext(context.requestId);
      expect(updatedContext?.currentPath).toBe('/new/path');
      expect(updatedContext?.currentModule).toBe('updated-module');
      expect(updatedContext?.pathHistory.length).toBe(1);
    });

    test('should complete request context', () => {
      const context = recordingManager.createRequestContext();

      const success = recordingManager.completeRequestContext(context.requestId, 'completed');

      expect(success).toBe(true);
      const completedContext = recordingManager.getRequestContext(context.requestId);
      expect(completedContext).toBeUndefined();
    });
  });

  describe('Cycle Recording', () => {
    test('should start cycle recording', () => {
      const context = recordingManager.createRequestContext();

      const handle = recordingManager.startCycleRecording(
        context.requestId,
        'test-operation',
        'test-module'
      );

      expect(handle).toBeDefined();
      expect(handle?.cycleId).toBeDefined();
      expect(handle?.operation).toBe('test-operation');
      expect(handle?.module).toBe('test-module');
    });

    test('should return null when cycle recording is disabled', () => {
      const disabledManager = new RecordingManager({
        enabled: true,
        cycle: { enabled: false }
      });

      const context = disabledManager.createRequestContext();
      const handle = disabledManager.startCycleRecording(
        context.requestId,
        'test-operation',
        'test-module'
      );

      expect(handle).toBeNull();
    });
  });

  describe('Error Recording', () => {
    test('should record error', () => {
      const errorId = recordingManager.recordError({
        error: new Error('Test error'),
        level: 'error',
        category: 'system',
        operation: 'test-operation',
        context: { module: 'test-module' },
        recoverable: true
      });

      expect(errorId).toBeDefined();
      expect(typeof errorId).toBe('string');
    });

    test('should get error records', () => {
      recordingManager.recordError({
        error: new Error('Test error 1'),
        level: 'error',
        category: 'system'
      });

      // Add a small delay to ensure different timestamps
      jest.useFakeTimers();
      jest.advanceTimersByTime(1);

      recordingManager.recordError({
        error: new Error('Test error 2'),
        level: 'fatal',
        category: 'processing'
      });

      jest.useRealTimers();

      const errors = recordingManager.getErrorRecords();
      expect(errors.length).toBe(2);
      expect(errors[0].message).toBe('Test error 2'); // Sorted by timestamp (newest first)
      expect(errors[1].message).toBe('Test error 1');
    });

    test('should filter error records', () => {
      recordingManager.recordError({
        error: new Error('Error 1'),
        level: 'error',
        category: 'system'
      });

      recordingManager.recordError({
        error: new Error('Error 2'),
        level: 'fatal',
        category: 'system'
      });

      const systemErrors = recordingManager.getErrorRecords({
        category: ['system']
      });

      expect(systemErrors.length).toBe(2);

      const fatalErrors = recordingManager.getErrorRecords({
        level: ['fatal']
      });

      expect(fatalErrors.length).toBe(1);
      expect(fatalErrors[0].level).toBe('fatal');
    });

    test('should resolve error', () => {
      const errorId = recordingManager.recordError({
        error: new Error('Test error'),
        level: 'error',
        category: 'system'
      });

      const success = recordingManager.resolveError(errorId, 'Issue resolved');
      expect(success).toBe(true);

      const errors = recordingManager.getErrorRecords({ resolved: true });
      expect(errors.length).toBe(1);
      expect(errors[0].resolved).toBe(true);
      expect(errors[0].resolution).toBe('Issue resolved');
    });
  });

  describe('Field Truncation', () => {
    test('should truncate long string fields', () => {
      const longString = 'a'.repeat(2000);
      const data = {
        message: longString,
        short: 'short message'
      };

      const truncated = recordingManager.truncateFields(data, 'test');

      expect(truncated.message).toBe('a'.repeat(1000) + '...');
      expect(truncated.short).toBe('short message');
    });

    test('should handle null and undefined values', () => {
      const data = {
        nullValue: null,
        undefinedValue: undefined,
        stringValue: 'test'
      };

      const truncated = recordingManager.truncateFields(data, 'test');

      expect(truncated.nullValue).toBeNull();
      expect(truncated.undefinedValue).toBeUndefined();
      expect(truncated.stringValue).toBe('test');
    });

    test('should get truncation statistics', () => {
      const longString = 'a'.repeat(2000);
      const data = {
        message: longString,
        content: longString
      };

      recordingManager.truncateFields(data, 'test');
      const stats = recordingManager.getTruncationStats();

      expect(stats.totalProcessed).toBe(3); // 2 fields + 1 object
      expect(stats.totalTruncated).toBe(2);
      expect(stats.savingsPercentage).toBeGreaterThan(0);
    });
  });

  describe('Configuration Synchronization', () => {
    test('should synchronize configuration across modules', async () => {
      const moduleConfigs = {
        'module1': { enabled: true, basePath: './logs/module1' },
        'module2': { enabled: true, basePath: './logs/module2' }
      };

      const result = await recordingManager.syncConfiguration(moduleConfigs);

      expect(result.success).toBe(true);
      expect(result.moduleResults['module1']).toBe(true);
      expect(result.moduleResults['module2']).toBe(true);
    });
  });
});