/**
 * RCC Pipeline Debug System Integration Tests
 *
 * 这些测试验证整个调试系统的集成功能，包括：
 * - DebuggablePipelineModule + IOTracker + DebugCenter + PipelineExecutionOptimizer + RoutingOptimizer
 * - 端到端调试流程
 * - 跨模块调试协调
 * - 文件持久化和日志管理
 */

import { DebuggablePipelineModule } from '../../src/core/DebuggablePipelineModule';
import { IOTracker } from '../../src/core/IOTracker';
import { DebugCenter } from '../../src/core/DebugCenter';
import { PipelineExecutionOptimizer } from '../../src/core/PipelineExecutionOptimizer';
import { RoutingOptimizer } from '../../src/core/RoutingOptimizer';
import { ModularPipelineExecutor } from '../../src/core/ModularPipelineExecutor';
import { PipelineWrapper, PipelineExecutionContext, DebugConfig } from '../../src/interfaces/ModularInterfaces';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('uuid');
jest.mock('fs');
jest.mock('fs-extra');
jest.mock('path');

const mockUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;
const mockFs = require('fs');
const mockFsExtra = require('fs-extra');
const mockPath = require('path');

describe('Debug System Integration', () => {
  let debuggableModule: DebuggablePipelineModule;
  let ioTracker: IOTracker;
  let debugCenter: DebugCenter;
  let executionOptimizer: PipelineExecutionOptimizer;
  let routingOptimizer: RoutingOptimizer;
  let pipelineExecutor: ModularPipelineExecutor;
  let debugConfig: DebugConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUuid.mockReturnValue('test-session-uuid-1234');

    // Mock file system operations
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockImplementation(() => {});
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFsExtra.ensureDirSync.mockImplementation(() => {});
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'));
    mockPath.basename.mockImplementation((path: string) => path.split('/').pop() || '');

    debugConfig = {
      enableIOTracking: true,
      enablePerformanceMonitoring: true,
      enableDetailedLogging: true,
      logLevel: 'debug',
      maxLogEntries: 1000,
      enableSampling: true,
      sampleRate: 1.0
    };

    // 初始化调试系统组件
    ioTracker = new IOTracker(debugConfig);
    debugCenter = new DebugCenter({
      logLevel: 'debug',
      maxSessions: 100,
      enableFilePersistence: true,
      logDirectory: '/tmp/debug-logs',
      enableConsoleOutput: false
    });
    routingOptimizer = new RoutingOptimizer({
      enableLoadBalancing: true,
      enableHealthCheck: true,
      healthCheckInterval: 30000,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      requestTimeout: 30000,
      retryAttempts: 3,
      enableMetrics: true,
      metricsCollectionInterval: 60000
    });
    executionOptimizer = new PipelineExecutionOptimizer(routingOptimizer, ioTracker);
    debuggableModule = new DebuggablePipelineModule();
    pipelineExecutor = new ModularPipelineExecutor(
      { createLLMSwitch: jest.fn(), createWorkflowModule: jest.fn(), createCompatibilityModule: jest.fn(), createProviderModule: jest.fn() } as any,
      { validateWrapper: jest.fn() } as any,
      undefined,
      debugConfig
    );
  });

  afterEach(() => {
    // 清理资源
    if (ioTracker) ioTracker.destroy();
    if (debugCenter) debugCenter.destroy();
    if (executionOptimizer) executionOptimizer.destroy();
    if (routingOptimizer) routingOptimizer.destroy();
    if (debuggableModule) (debuggableModule as any).destroy();
  });

  describe('端到端调试流程集成', () => {
    test('应该完成完整的调试流程：跟踪→记录→分析→持久化', async () => {
      // 1. 开始调试会话
      const sessionId = 'integration-test-session';
      ioTracker.startSession(sessionId);

      // 2. 模拟调试事件
      const debugEvent = {
        sessionId,
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start' as const,
        position: 'start' as const,
        data: { pipelineId: 'test-pipeline' }
      };

      debugCenter.processDebugEvent(debugEvent);

      // 3. 执行带调试的流水线操作
      const context: PipelineExecutionContext = {
        sessionId,
        requestId: 'test-request',
        virtualModelId: 'test-model',
        providerId: 'test-provider',
        startTime: Date.now(),
        ioRecords: [],
        metadata: { test: true },
        debugConfig
      };

      const mockOperation = jest.fn().mockResolvedValue('operation-result');
      const executionResult = await debuggableModule.executeWithTracing(
        mockOperation,
        'REQUEST_PROCESSING' as any,
        { testData: 'input' },
        { executionId: 'test-execution', timeout: 5000 }
      );

      // 4. 记录IO操作
      const requestId = ioTracker.trackRequest(sessionId, 'test-request', 'test-module', { input: 'data' });
      ioTracker.trackResponse(sessionId, requestId, 'test-module', { output: 'result' }, Date.now());

      // 5. 验证调试流程完整性
      expect(executionResult.status).toBe('success');
      expect(executionResult.data).toBe('operation-result');
      expect(executionResult.tracingData).toBeDefined();

      // 6. 验证IO跟踪
      const ioRecords = ioTracker.getIORecords({ sessionId });
      expect(ioRecords).toHaveLength(2); // request + response
      expect(ioRecords[0].type).toBe('request');
      expect(ioRecords[1].type).toBe('response');

      // 7. 验证DebugCenter会话状态
      const session = debugCenter.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);

      // 8. 验证性能分析
      const performanceReport = ioTracker.generateDebugReport();
      expect(performanceReport).toBeDefined();
      expect(performanceReport.totalOperations).toBeGreaterThan(0);
    });

    test('应该正确处理错误情况下的调试流程', async () => {
      const sessionId = 'error-test-session';
      ioTracker.startSession(sessionId);

      const context: PipelineExecutionContext = {
        sessionId,
        requestId: 'error-request',
        virtualModelId: 'test-model',
        providerId: 'test-provider',
        startTime: Date.now(),
        ioRecords: [],
        metadata: {},
        debugConfig
      };

      // 模拟失败的操作
      const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));

      const executionResult = await debuggableModule.executeWithTracing(
        mockOperation,
        'ERROR_PROCESSING' as any,
        { errorInput: 'data' },
        { executionId: 'error-execution', timeout: 5000 }
      );

      // 验证错误被正确跟踪
      expect(executionResult.status).toBe('error');
      expect(executionResult.error).toBeDefined();
      expect(executionResult.tracingData).toBeDefined();

      // 验证IO记录包含错误信息
      const ioRecords = ioTracker.getIORecords({ sessionId });
      const errorRecord = ioRecords.find(r => r.type === 'error');
      expect(errorRecord).toBeDefined();
      expect(errorRecord?.error).toBeDefined();

      // 验证DebugCenter记录了错误事件
      const session = debugCenter.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.events.some(e => e.type === 'error')).toBe(true);
    });
  });

  describe('多组件协作调试', () => {
    test('应该在PipelineExecutor中集成所有调试组件', async () => {
      const wrapper: PipelineWrapper = {
        dynamicRouting: [
          {
            id: 'test-routing',
            name: 'Test Routing',
            description: 'Test dynamic routing',
            targets: [{ providerId: 'test-provider', weight: 1 }]
          }
        ],
        modules: [
          { type: 'llmswitch', config: {} },
          { type: 'workflow', config: {} },
          { type: 'compatibility', config: {} },
          { type: 'provider', config: {} }
        ],
        routing: { strategy: 'round-robin', fallbackStrategy: 'random' },
        metadata: { version: '1.0.0', createdAt: new Date().toISOString() }
      };

      // Mock模块工厂
      const mockModuleFactory = {
        createLLMSwitch: jest.fn().mockResolvedValue({
          moduleId: 'llmswitch',
          moduleName: 'LLM Switch',
          convertRequest: jest.fn().mockResolvedValue({ converted: true }),
          convertResponse: jest.fn().mockResolvedValue({ response: true }),
          getStatus: jest.fn().mockResolvedValue({ status: 'healthy' }),
          destroy: jest.fn()
        }),
        createWorkflowModule: jest.fn().mockResolvedValue({
          moduleId: 'workflow',
          moduleName: 'Workflow',
          convertStreamingToNonStreaming: jest.fn().mockResolvedValue({ workflow: true }),
          getStatus: jest.fn().mockResolvedValue({ status: 'healthy' }),
          destroy: jest.fn()
        }),
        createCompatibilityModule: jest.fn().mockResolvedValue({
          moduleId: 'compatibility',
          moduleName: 'Compatibility',
          mapRequest: jest.fn().mockResolvedValue({ mapped: true }),
          mapResponse: jest.fn().mockResolvedValue({ response: true }),
          getStatus: jest.fn().mockResolvedValue({ status: 'healthy' }),
          destroy: jest.fn()
        }),
        createProviderModule: jest.fn().mockResolvedValue({
          moduleId: 'provider',
          moduleName: 'Provider',
          executeRequest: jest.fn().mockResolvedValue({ provider: true }),
          getStatus: jest.fn().mockResolvedValue({ status: 'healthy' }),
          destroy: jest.fn()
        })
      };

      const mockValidator = {
        validateWrapper: jest.fn().mockResolvedValue({ isValid: true, errors: [] })
      };

      const executor = new ModularPipelineExecutor(
        mockModuleFactory as any,
        mockValidator as any,
        undefined,
        debugConfig
      );

      // 初始化执行器
      await executor.initialize(wrapper);

      // 执行请求
      const request = { message: 'Hello, world!' };
      const result = await executor.execute(request, 'test-model');

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.steps).toHaveLength(7); // 完整的7步流程
      expect(result.executionTime).toBeGreaterThan(0);

      // 验证调试数据被收集
      const status = await executor.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.modules).toBeDefined();

      // 验证IO跟踪
      const ioRecords = await executor.getIORecords();
      expect(ioRecords.length).toBeGreaterThan(0);

      // 验证路由统计
      const routingStats = await executor.getRoutingStats();
      expect(routingStats.health).toBeDefined();
      expect(routingStats.metrics).toBeDefined();

      // 清理
      await executor.destroy();
    });

    test('应该协调多模块的调试输出', async () => {
      const sessionId = 'multi-module-session';
      ioTracker.startSession(sessionId);

      // 模拟多个模块的操作
      const modules = ['llmswitch', 'workflow', 'compatibility', 'provider'];

      for (const module of modules) {
        // 记录每个模块的调试事件
        const debugEvent = {
          sessionId,
          moduleId: module,
          operationId: `${module}-operation`,
          timestamp: Date.now(),
          type: 'start' as const,
          position: 'start' as const,
          data: { module }
        };

        debugCenter.processDebugEvent(debugEvent);

        // 记录IO操作
        const requestId = ioTracker.trackRequest(
          sessionId,
          `${module}-request`,
          module,
          { module, input: `data-for-${module}` }
        );

        ioTracker.trackResponse(
          sessionId,
          requestId,
          module,
          { module, output: `result-from-${module}` },
          Date.now()
        );
      }

      // 验证所有模块的调试数据都被正确收集
      const ioRecords = ioTracker.getIORecords({ sessionId });
      expect(ioRecords).toHaveLength(8); // 4个模块 * (request + response)

      const session = debugCenter.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.events).toHaveLength(4); // 4个模块的事件

      // 验证性能分析包含所有模块
      const performanceReport = ioTracker.generateDebugReport();
      expect(performanceReport.totalOperations).toBeGreaterThanOrEqual(4);

      // 验证模块间协调
      const moduleStats = performanceReport.moduleStats;
      expect(Object.keys(moduleStats)).toHaveLength(4);
      modules.forEach(module => {
        expect(moduleStats[module]).toBeDefined();
      });
    });
  });

  describe('文件持久化和日志管理', () => {
    test('应该正确持久化调试数据到文件', async () => {
      const sessionId = 'persistence-test-session';

      // 启用文件持久化
      debugCenter.destroy(); // 重新创建启用了持久化的DebugCenter
      debugCenter = new DebugCenter({
        logLevel: 'debug',
        maxSessions: 100,
        enableFilePersistence: true,
        logDirectory: '/tmp/debug-logs',
        enableConsoleOutput: false
      });

      ioTracker.startSession(sessionId);

      // 生成调试数据
      const debugEvent = {
        sessionId,
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start' as const,
        position: 'start' as const,
        data: { test: 'data' }
      };

      debugCenter.processDebugEvent(debugEvent);

      const requestId = ioTracker.trackRequest(sessionId, 'test-request', 'test-module', { input: 'test' });
      ioTracker.trackResponse(sessionId, requestId, 'test-module', { output: 'result' }, Date.now());

      // 生成调试报告
      const report = ioTracker.generateDebugReport();

      // 触发文件写入
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证文件操作被调用
      expect(mockFsExtra.ensureDirSync).toHaveBeenCalledWith('/tmp/debug-logs');
      expect(mockFs.writeFileSync).toHaveBeenCalled();

      // 验证会话保存
      debugCenter.saveSession(sessionId);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(sessionId),
        expect.any(String)
      );
    });

    test('应该处理文件系统错误', async () => {
      // 模拟文件系统错误
      mockFsExtra.ensureDirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const sessionId = 'error-session';
      ioTracker.startSession(sessionId);

      // 应该不抛出错误，只是无法持久化
      const debugEvent = {
        sessionId,
        moduleId: 'test-module',
        operationId: 'test-operation',
        timestamp: Date.now(),
        type: 'start' as const,
        position: 'start' as const,
        data: {}
      };

      // 应该正常处理事件，只是文件写入失败
      expect(() => {
        debugCenter.processDebugEvent(debugEvent);
      }).not.toThrow();
    });
  });

  describe('性能监控和优化', () => {
    test('应该监控和优化整个调试系统的性能', async () => {
      const sessionId = 'performance-test-session';
      ioTracker.startSession(sessionId);

      // 执行大量操作以测试性能
      const operationPromises = [];
      for (let i = 0; i < 100; i++) {
        const operation = async () => {
          const mockOperation = jest.fn().mockResolvedValue(`result-${i}`);
          return debuggableModule.executeWithTracing(
            mockOperation,
            'PERFORMANCE_TEST' as any,
            { iteration: i },
            { executionId: `perf-test-${i}`, timeout: 1000 }
          );
        };
        operationPromises.push(operation());
      }

      // 等待所有操作完成
      const results = await Promise.all(operationPromises);

      // 验证所有操作都成功
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.status).toBe('success');
      });

      // 验证性能指标
      const performanceReport = ioTracker.generateDebugReport();
      expect(performanceReport.totalOperations).toBe(100);
      expect(performanceReport.averageResponseTime).toBeGreaterThan(0);
      expect(performanceReport.successRate).toBe(1.0);

      // 验证内存使用合理
      const session = debugCenter.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.events.length).toBeGreaterThan(0);

      // 验证IO跟踪记录数量合理
      const ioRecords = ioTracker.getIORecords({ sessionId });
      expect(ioRecords.length).toBeLessThanOrEqual(200); // 不应该过度记录
    });

    test('应该正确处理高并发调试场景', async () => {
      const concurrentSessions = 10;
      const operationsPerSession = 20;

      // 创建多个并发会话
      const sessionPromises = [];
      for (let i = 0; i < concurrentSessions; i++) {
        const sessionId = `concurrent-session-${i}`;
        ioTracker.startSession(sessionId);

        const sessionOperations = [];
        for (let j = 0; j < operationsPerSession; j++) {
          const operation = async () => {
            const mockOperation = jest.fn().mockResolvedValue(`result-${i}-${j}`);
            return debuggableModule.executeWithTracing(
              mockOperation,
              'CONCURRENT_TEST' as any,
              { session: i, operation: j },
              { executionId: `concurrent-${i}-${j}`, timeout: 500 }
            );
          };
          sessionOperations.push(operation());
        }
        sessionPromises.push(Promise.all(sessionOperations));
      }

      // 等待所有会话完成
      await Promise.all(sessionPromises);

      // 验证所有会话都正常工作
      const performanceReport = ioTracker.generateDebugReport();
      expect(performanceReport.totalOperations).toBe(concurrentSessions * operationsPerSession);

      // 验证系统稳定性
      expect(performanceReport.errorRate).toBe(0);
      expect(performanceReport.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('调试系统恢复和容错', () => {
    test('应该从调试系统故障中恢复', async () => {
      const sessionId = 'recovery-test-session';
      ioTracker.startSession(sessionId);

      // 正常执行一些操作
      const mockOperation = jest.fn().mockResolvedValue('initial-result');
      await debuggableModule.executeWithTracing(
        mockOperation,
        'RECOVERY_TEST' as any,
        { phase: 'initial' },
        { executionId: 'recovery-initial', timeout: 1000 }
      );

      // 模拟系统故障（销毁组件）
      debugCenter.destroy();
      ioTracker.destroy();

      // 重新初始化调试系统
      debugCenter = new DebugCenter({
        logLevel: 'debug',
        maxSessions: 100,
        enableFilePersistence: false,
        logDirectory: '/tmp/debug-logs',
        enableConsoleOutput: false
      });
      ioTracker = new IOTracker(debugConfig);

      // 验证系统可以继续工作
      ioTracker.startSession(sessionId);

      const recoveryOperation = jest.fn().mockResolvedValue('recovery-result');
      const result = await debuggableModule.executeWithTracing(
        recoveryOperation,
        'RECOVERY_TEST' as any,
        { phase: 'recovery' },
        { executionId: 'recovery-test', timeout: 1000 }
      );

      expect(result.status).toBe('success');
      expect(result.data).toBe('recovery-result');
    });

    test('应该处理调试配置变更', async () => {
      const sessionId = 'config-test-session';

      // 使用初始配置
      ioTracker.startSession(sessionId);

      // 执行一些操作
      const mockOperation = jest.fn().mockResolvedValue('config-test-result');
      await debuggableModule.executeWithTracing(
        mockOperation,
        'CONFIG_TEST' as any,
        { config: 'initial' },
        { executionId: 'config-test', timeout: 1000 }
      );

      // 更新配置
      const newConfig: DebugConfig = {
        ...debugConfig,
        logLevel: 'error',
        maxLogEntries: 100,
        enableSampling: false,
        sampleRate: 0.1
      };

      // 重新初始化IOTracker
      ioTracker.destroy();
      ioTracker = new IOTracker(newConfig);
      ioTracker.startSession(sessionId);

      // 验证新配置生效
      const updatedOperation = jest.fn().mockResolvedValue('updated-result');
      const result = await debuggableModule.executeWithTracing(
        updatedOperation,
        'CONFIG_TEST' as any,
        { config: 'updated' },
        { executionId: 'config-updated', timeout: 1000 }
      );

      expect(result.status).toBe('success');
      expect(result.data).toBe('updated-result');
    });
  });

  describe('调试系统资源管理', () => {
    test('应该正确管理调试会话生命周期', async () => {
      // 创建多个会话
      const sessionIds = ['session-1', 'session-2', 'session-3'];

      for (const sessionId of sessionIds) {
        ioTracker.startSession(sessionId);

        const debugEvent = {
          sessionId,
          moduleId: 'test-module',
          operationId: 'test-operation',
          timestamp: Date.now(),
          type: 'start' as const,
          position: 'start' as const,
          data: { session: sessionId }
        };

        debugCenter.processDebugEvent(debugEvent);
      }

      // 验证所有会话都存在
      for (const sessionId of sessionIds) {
        const session = debugCenter.getSession(sessionId);
        expect(session).toBeDefined();
        expect(session?.sessionId).toBe(sessionId);
      }

      // 清理部分会话
      ioTracker.endSession('session-1');
      debugCenter.endSession('session-2');

      // 验证会话被正确清理
      expect(ioTracker.getIORecords({ sessionId: 'session-1' })).toHaveLength(0);
      expect(debugCenter.getSession('session-2')).toBeUndefined();

      // 验证剩余会话仍然存在
      expect(debugCenter.getSession('session-3')).toBeDefined();
    });

    test('应该限制调试资源使用', async () => {
      // 测试内存使用限制
      const maxOperations = 1000;
      const operations = [];

      for (let i = 0; i < maxOperations; i++) {
        const sessionId = `limit-test-session`;
        ioTracker.startSession(sessionId);

        const mockOperation = jest.fn().mockResolvedValue(`result-${i}`);
        operations.push(
          debuggableModule.executeWithTracing(
            mockOperation,
            'LIMIT_TEST' as any,
            { iteration: i },
            { executionId: `limit-test-${i}`, timeout: 100 }
          )
        );
      }

      // 执行所有操作
      await Promise.all(operations);

      // 验证系统仍然响应
      const performanceReport = ioTracker.generateDebugReport();
      expect(performanceReport.totalOperations).toBe(maxOperations);

      // 验证没有内存泄漏（通过检查会话清理）
      const activeSessions = Array.from(debugCenter['activeSessions'].keys());
      expect(activeSessions.length).toBeLessThanOrEqual(100); // 合理的会话数量限制
    });
  });
});