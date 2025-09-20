/**
 * DebugCenter 集成测试
 * 验证与 BaseModule 的集成功能
 */

import { DebugCenter, DebugEventBus, type DebugEvent } from '../src/index';

// 模拟 BaseModule 接口
interface MockBaseModule {
  id: string;
  name: string;
  version: string;
  setExternalDebugHandler: (handler: (event: DebugEvent) => void) => void;
  startIOTracking: (operationId: string, input: any, method?: string) => void;
  endIOTracking: (operationId: string, output: any, success?: boolean, error?: string) => void;
}

class MockBaseModuleImpl implements MockBaseModule {
  public id: string;
  public name: string;
  public version: string;
  private externalDebugHandler?: (event: DebugEvent) => void;

  constructor(info: { id: string; name: string; version: string }) {
    this.id = info.id;
    this.name = info.name;
    this.version = info.version;
  }

  public setExternalDebugHandler(handler: (event: DebugEvent) => void): void {
    this.externalDebugHandler = handler;
  }

  public startIOTracking(operationId: string, input: any, method?: string): void {
    if (!this.externalDebugHandler) return;

    const event: DebugEvent = {
      sessionId: 'test-session-123',
      moduleId: this.id,
      operationId,
      timestamp: Date.now(),
      type: 'start',
      position: 'middle',
      data: {
        input,
        method,
        moduleInfo: {
          id: this.id,
          name: this.name,
          version: this.version
        }
      }
    };

    this.externalDebugHandler(event);
  }

  public endIOTracking(operationId: string, output: any, success: boolean = true, error?: string): void {
    if (!this.externalDebugHandler) return;

    const event: DebugEvent = {
      sessionId: 'test-session-123',
      moduleId: this.id,
      operationId,
      timestamp: Date.now(),
      type: success ? 'end' : 'error',
      position: 'middle',
      data: {
        output,
        success,
        error,
        moduleInfo: {
          id: this.id,
          name: this.name,
          version: this.version
        }
      }
    };

    this.externalDebugHandler(event);
  }
}

describe('DebugCenter Integration', () => {
  let debugCenter: DebugCenter;
  let baseModule: MockBaseModule;

  beforeEach(() => {
    debugCenter = new DebugCenter({
      enabled: true,
      outputDirectory: './test-debug-logs',
      enableRealTimeUpdates: true,
      maxSessions: 100
    });
    baseModule = new MockBaseModuleImpl({
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0'
    });
  });

  afterEach(async () => {
    await debugCenter.destroy();
  });

  describe('手动集成测试', () => {
    test('应该能通过手动设置处理器接收调试事件', () => {
      // 设置处理器
      baseModule.setExternalDebugHandler((event) => {
        debugCenter.processDebugEvent(event);
      });

      // 模拟操作
      baseModule.startIOTracking('test-operation', { input: 'test-data' });
      baseModule.endIOTracking('test-operation', { output: 'test-result' }, true);

      // 验证会话创建
      const sessions = debugCenter.getActiveSessions();
      expect(sessions).toHaveLength(1);

      const session = sessions[0];
      expect(session.sessionId).toBe('test-session-123');
      expect(session.operations).toHaveLength(1);

      const operation = session.operations[0];
      expect(operation.operationId).toBe('test-operation');
      expect(operation.status).toBe('completed');
    });

    test('应该能正确处理错误事件', () => {
      baseModule.setExternalDebugHandler((event) => {
        debugCenter.processDebugEvent(event);
      });

      // 模拟失败操作
      baseModule.startIOTracking('failing-operation', { input: 'test-data' });
      baseModule.endIOTracking('failing-operation', null, false, 'Test error');

      const sessions = debugCenter.getActiveSessions();
      expect(sessions).toHaveLength(1);

      const session = sessions[0];
      expect(session.status).toBe('failed');

      const operation = session.operations[0];
      expect(operation.status).toBe('failed');
      expect(operation.error).toBe('Test error');
    });
  });

  describe('便捷方法测试', () => {
    test('应该能通过便捷方法连接 BaseModule', () => {
      // 使用便捷方法
      debugCenter.connectBaseModule(baseModule);

      // 模拟操作
      baseModule.startIOTracking('convenient-operation', { input: 'test-data' });
      baseModule.endIOTracking('convenient-operation', { output: 'test-result' }, true);

      // 验证连接成功
      const sessions = debugCenter.getActiveSessions();
      expect(sessions).toHaveLength(1);

      const session = sessions[0];
      expect(session.operations).toHaveLength(1);
    });

    test('应该能处理不支持外部处理器的模块', () => {
      const incompatibleModule = {
        id: 'incompatible',
        name: 'Incompatible Module',
        version: '1.0.0'
        // 没有 setExternalDebugHandler 方法
      };

      // 应该不抛出错误
      expect(() => {
        debugCenter.connectBaseModule(incompatibleModule as any);
      }).not.toThrow();
    });
  });

  describe('事件总线测试', () => {
    test('应该能通过事件总线接收事件', (done) => {
      const eventBus = DebugEventBus.getInstance();

      // 订阅事件
      eventBus.subscribe('start', (event: DebugEvent) => {
        expect(event.operationId).toBe('eventbus-operation');
        expect(event.moduleId).toBe('test-module');
        done();
      });

      // 连接模块
      debugCenter.connectBaseModule(baseModule);

      // 触发事件
      baseModule.startIOTracking('eventbus-operation', { input: 'test-data' });
    });

    test('应该能获取事件统计', () => {
      const eventBus = DebugEventBus.getInstance();

      // 连接模块并触发事件
      debugCenter.connectBaseModule(baseModule);
      baseModule.startIOTracking('stats-operation', { input: 'test-data' });

      const stats = eventBus.getStats();
      expect(stats.queueSize).toBeGreaterThan(0);
      expect(stats.eventTypes).toContain('start');
    });
  });

  describe('独立功能测试', () => {
    test('应该能独立使用 DebugCenter', () => {
      const sessionId = debugCenter.startPipelineSession('standalone-test', 'Standalone Test');

      debugCenter.recordOperation(
        sessionId,
        'standalone-module',
        'standalone-operation',
        { input: 'test' },
        { output: 'result' },
        'testMethod',
        true
      );

      debugCenter.endPipelineSession(sessionId, true);

      const sessions = debugCenter.getActiveSessions();
      expect(sessions).toHaveLength(0); // 会话应该已经结束

      // 可以通过导出数据验证
      const exportData = debugCenter.exportData({ format: 'json', includeStats: true });
      expect(exportData).toBeDefined();
    });

    test('应该能更新配置', () => {
      const originalConfig = debugCenter.getConfig();

      debugCenter.updateConfig({
        maxSessions: 500,
        retentionDays: 14
      });

      const newConfig = debugCenter.getConfig();
      expect(newConfig.maxSessions).toBe(500);
      expect(newConfig.retentionDays).toBe(14);
      expect(newConfig.outputDirectory).toBe(originalConfig.outputDirectory); // 其他配置保持不变
    });
  });

  describe('错误处理测试', () => {
    test('应该能处理无效的调试事件', () => {
      // 测试缺少必要字段的事件
      const invalidEvent = {
        sessionId: 'test-session',
        // 缺少 moduleId 和 operationId
        timestamp: Date.now(),
        type: 'start' as const,
        position: 'middle' as const
      };

      // 应该不抛出错误
      expect(() => {
        debugCenter.processDebugEvent(invalidEvent as DebugEvent);
      }).not.toThrow();
    });

    test('应该能处理未知的事件类型', () => {
      const unknownEvent = {
        sessionId: 'test-session',
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'unknown' as any,
        position: 'middle' as const
      };

      // 应该不抛出错误
      expect(() => {
        debugCenter.processDebugEvent(unknownEvent as DebugEvent);
      }).not.toThrow();
    });
  });
});