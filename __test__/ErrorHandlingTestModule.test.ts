import { ErrorHandlingTestModule } from '../src/modules/ErrorHandlingTestModule';
import { MessageCenter } from '../src/MessageCenter';
import { ErrorInterfaceGateway } from '../src/modules/ErrorHandlingCenter/src/components/ErrorInterfaceGateway';
import { ResponseRouterEngine } from '../src/modules/ErrorHandlingCenter/src/components/ResponseRouterEngine';
import { ErrorQueueManager } from '../src/modules/ErrorHandlingCenter/src/components/ErrorQueueManager';
import { ResponseExecutor } from '../src/modules/ErrorHandlingCenter/src/components/ResponseExecutor';
import { ErrorClassifier } from '../src/modules/ErrorHandlingCenter/src/components/ErrorClassifier';
import { PolicyEngine } from '../src/modules/ErrorHandlingCenter/src/components/PolicyEngine';
import { ResponseTemplateManager } from '../src/modules/ErrorHandlingCenter/src/components/ResponseTemplateManager';
import { ModuleRegistryManager } from '../src/modules/ErrorHandlingCenter/src/components/ModuleRegistryManager';

/**
 * 错误处理测试模块集成测试
 * 验证推荐的消息注册和函数注册方式，以及阻塞和非阻塞处理
 */
describe('ErrorHandlingTestModule Integration Tests', () => {
  let testModule: ErrorHandlingTestModule;
  let messageCenter: MessageCenter;
  let errorInterfaceGateway: ErrorInterfaceGateway;
  let responseRouterEngine: ResponseRouterEngine;
  let errorQueueManager: ErrorQueueManager;
  let responseExecutor: ResponseExecutor;
  let errorClassifier: ErrorClassifier;
  let policyEngine: PolicyEngine;
  let responseTemplateManager: ResponseTemplateManager;
  let moduleRegistryManager: ModuleRegistryManager;

  beforeEach(async () => {
    // 创建测试模块
    testModule = new ErrorHandlingTestModule();
    
    // 创建消息中心
    messageCenter = MessageCenter.getInstance();
    
    // 创建错误处理中心组件
    errorClassifier = new ErrorClassifier();
    errorQueueManager = new ErrorQueueManager();
    responseTemplateManager = new ResponseTemplateManager();
    moduleRegistryManager = new ModuleRegistryManager();
    policyEngine = new PolicyEngine();
    
    // 创建需要依赖的组件
    const defaultHandler = {
      handleId: 'default-handler',
      name: 'Default Handler',
      priority: 100,
      isEnabled: true,
      conditions: [],
      execute: async (error: any) => ({
        responseId: 'default-response',
        errorId: error.errorId || 'unknown',
        result: { 
          status: 'success' as any, 
          message: 'Default handler executed',
          details: 'Default handler processed the error',
          code: 'DEFAULT_SUCCESS'
        },
        timestamp: new Date(),
        processingTime: 0,
        data: {
          moduleName: 'DefaultHandler',
          moduleId: 'default-handler',
          response: { message: 'Default handler response' },
          config: {},
          metadata: {}
        },
        actions: [],
        annotations: []
      })
    };
    
    responseRouterEngine = new ResponseRouterEngine(defaultHandler);
    responseExecutor = new ResponseExecutor(policyEngine);
    errorInterfaceGateway = new ErrorInterfaceGateway(errorQueueManager, responseRouterEngine);

    // 初始化所有组件
    await errorClassifier.initialize();
    await errorQueueManager.initialize();
    await responseTemplateManager.initialize();
    await moduleRegistryManager.initialize();
    await policyEngine.initialize();
    await responseExecutor.initialize();
    await responseRouterEngine.initialize();
    await errorInterfaceGateway.initialize();
    await testModule.initialize();

    // 注册模块
    messageCenter.registerModule('error-handling-test-module', testModule);
    errorInterfaceGateway.registerModule(testModule.createModuleRegistration());
  });

  afterEach(async () => {
    // 清理资源
    try {
      // TestModule 没有destroy方法，跳过
      await errorInterfaceGateway.shutdown();
      await responseRouterEngine.shutdown();
      await responseExecutor.shutdown();
      await policyEngine.shutdown();
      await moduleRegistryManager.shutdown();
      await responseTemplateManager.shutdown();
      await errorQueueManager.shutdown();
      await errorClassifier.shutdown();
      messageCenter.unregisterModule('error-handling-test-module');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('Module Registration and Initialization', () => {
    test('should initialize test module successfully', () => {
      expect(testModule).toBeDefined();
      expect(testModule.getInfo().id).toBe('error-handling-test-module');
      expect(testModule.getInfo().name).toBe('ErrorHandlingTestModule');
    });

    test('should register default error handlers', () => {
      const stats = testModule.getStatistics();
      expect(stats.registeredErrorHandlers).toBeGreaterThan(0);
      expect(stats.registeredErrorHandlers).toBe(5); // validation, network, business, system, default
    });

    test('should register default message handlers', () => {
      const stats = testModule.getStatistics();
      expect(stats.registeredMessageHandlers).toBeGreaterThan(0);
      expect(stats.registeredMessageHandlers).toBe(4); // ping, error-test, batch-error-test, status-query
    });

    test('should create proper module registration', () => {
      const registration = testModule.createModuleRegistration();
      expect(registration.moduleId).toBe(testModule.getInfo().id);
      expect(registration.moduleName).toBe(testModule.getInfo().name);
      expect(registration.responseHandler).toBeDefined();
      expect(registration.capabilities).toContain('error-handling');
    });
  });

  describe('Recommended Function Registration', () => {
    test('should register custom error handler via recommended function', () => {
      // 测试推荐的函数注册方式
      const customHandler = async (error: any) => {
        return {
          responseId: 'custom-response',
          errorId: error.errorId,
          result: { 
            status: 'success' as any, 
            message: 'Custom handler executed',
            details: 'Custom handler processed the error',
            code: 'CUSTOM_HANDLER'
          },
          timestamp: new Date(),
          processingTime: 0,
          data: {
            moduleName: 'CustomHandler',
            moduleId: 'custom-handler',
            response: { message: 'Custom handler response' },
            config: error.config || {},
            metadata: { 
              handlerType: 'custom',
              timestamp: Date.now()
            }
          },
          actions: [],
          annotations: []
        };
      };

      testModule.registerErrorHandler('custom-error', customHandler);
      
      const stats = testModule.getStatistics();
      expect(stats.registeredErrorHandlers).toBe(6); // 5 default + 1 custom
    });

    test('should register custom message handler via recommended function', () => {
      // 测试推荐的消息注册方式
      const customMessageHandler = async (message: any) => {
        return { type: 'custom-response', data: message };
      };

      testModule.registerMessageHandler('custom-message', customMessageHandler);
      
      const stats = testModule.getStatistics();
      expect(stats.registeredMessageHandlers).toBe(5); // 4 default + 1 custom
    });
  });

  describe('Blocking Error Handling', () => {
    test('should handle validation error in blocking mode', async () => {
      const errorContext = {
        errorId: 'test-validation-error',
        error: new Error('Invalid input parameter'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      };

      const response = await testModule.handleErrorBlocking(errorContext);

      expect(response).toBeDefined();
      expect(response.errorId).toBe('test-validation-error');
      expect(response.result.status).toBe('success');
      expect(response.result.code).toBe('VALIDATION_HANDLED');
      expect(response.processingTime).toBeGreaterThan(0);
    });

    test('should handle network error in blocking mode', async () => {
      const errorContext = {
        errorId: 'test-network-error',
        error: new Error('Network connection failed'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      };

      const response = await testModule.handleErrorBlocking(errorContext);

      expect(response).toBeDefined();
      expect(response.errorId).toBe('test-network-error');
      expect(response.result.status).toBe('success');
      expect(response.result.code).toBe('NETWORK_HANDLED');
    });

    test('should handle business error in blocking mode', async () => {
      const errorContext = {
        errorId: 'test-business-error',
        error: new Error('Business rule violation'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      };

      const response = await testModule.handleErrorBlocking(errorContext);

      expect(response).toBeDefined();
      expect(response.errorId).toBe('test-business-error');
      expect(response.result.status).toBe('success');
      expect(response.result.code).toBe('BUSINESS_HANDLED');
    });

    test('should handle system error in blocking mode', async () => {
      const errorContext = {
        errorId: 'test-system-error',
        error: new Error('System internal error'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      };

      const response = await testModule.handleErrorBlocking(errorContext);

      expect(response).toBeDefined();
      expect(response.errorId).toBe('test-system-error');
      expect(response.result.status).toBe('success');
      expect(response.result.code).toBe('SYSTEM_HANDLED');
    });
  });

  describe('Non-Blocking Error Handling', () => {
    test('should handle error in non-blocking mode with callback', (done) => {
      const errorContext = {
        errorId: 'test-non-blocking-error',
        error: new Error('Test non-blocking error'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      };

      let callbackCallCount = 0;
      const callback = (response: any) => {
        callbackCallCount++;
        
        if (callbackCallCount === 1) {
          // 第一次回调应该是部分响应
          expect(response.result.status).toBe('partial');
          expect(response.result.code).toBe('ASYNC_QUEUED');
        } else if (callbackCallCount === 2) {
          // 第二次回调应该是完整响应
          expect(response.result.status).toBe('success');
          expect(response.errorId).toBe('test-non-blocking-error');
          done();
        }
      };

      testModule.handleErrorNonBlocking(errorContext, callback);
    });

    test('should handle error in non-blocking mode without callback', (done) => {
      const errorContext = {
        errorId: 'test-non-blocking-no-callback',
        error: new Error('Test non-blocking error without callback'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      };

      // 不提供回调，应该不会报错
      expect(() => {
        testModule.handleErrorNonBlocking(errorContext);
        
        // 等待一段时间让异步处理完成
        setTimeout(() => {
          const stats = testModule.getStatistics();
          expect(stats.errorCount).toBe(1);
          done();
        }, 100);
      }).not.toThrow();
    });

    test('should handle non-blocking processing errors gracefully', (done) => {
      const errorContext = {
        errorId: 'test-non-blocking-error-handler',
        error: new Error('Test error that will fail in handler'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      };

      // 注册一个会失败的处理器
      const failingHandler = async () => {
        throw new Error('Handler failed intentionally');
      };
      
      testModule.registerErrorHandler('failing-error', failingHandler);

      let callbackCallCount = 0;
      const callback = (response: any) => {
        callbackCallCount++;
        
        if (callbackCallCount === 1) {
          // 第一次回调应该是部分响应
          expect(response.result.status).toBe('partial');
        } else if (callbackCallCount === 2) {
          // 第二次回调应该是错误响应
          expect(response.result.status).toBe('error');
          expect(response.result.code).toBe('ASYNC_PROCESSING_FAILED');
          done();
        }
      };

      testModule.handleErrorNonBlocking(errorContext, callback);
    });
  });

  describe('Message Processing', () => {
    test('should handle ping message', async () => {
      const pingMessage = {
        id: 'test-ping-1',
        type: 'ping',
        timestamp: new Date()
      };

      const response = await testModule.handleMessage(pingMessage);

      expect(response.type).toBe('pong');
      expect(response.originalId).toBe('test-ping-1');
      expect(response.moduleId).toBe(testModule.getInfo().id);
      expect(response.status).toBe('healthy');
    });

    test('should handle error test message', async () => {
      const errorMessage = {
        id: 'test-error-1',
        type: 'error-test',
        error: {
          message: 'Test error from message'
        },
        config: { test: true },
        metadata: { source: 'message-test' }
      };

      const response = await testModule.handleMessage(errorMessage);

      expect(response.type).toBe('error-response');
      expect(response.originalId).toBe('test-error-1');
      expect(response.errorId).toBeDefined();
      expect(response.response).toBeDefined();
      expect(response.response.result.status).toBe('success');
    });

    test('should handle batch error test message', async () => {
      const batchErrorMessage = {
        id: 'test-batch-1',
        type: 'batch-error-test',
        errors: [
          { id: 'batch-error-1', message: 'Batch error 1' },
          { id: 'batch-error-2', message: 'Batch error 2' },
          { id: 'batch-error-3', message: 'Batch error 3' }
        ]
      };

      const response = await testModule.handleMessage(batchErrorMessage);

      expect(response.type).toBe('batch-error-response');
      expect(response.originalId).toBe('test-batch-1');
      expect(response.count).toBe(3);
      expect(response.responses).toHaveLength(3);
      
      // 验证所有错误都被处理
      response.responses.forEach((resp: any) => {
        expect(resp.result.status).toBe('success');
      });
    });

    test('should handle status query message', async () => {
      const statusMessage = {
        id: 'test-status-1',
        type: 'status-query'
      };

      const response = await testModule.handleMessage(statusMessage);

      expect(response.type).toBe('status-response');
      expect(response.originalId).toBe('test-status-1');
      expect(response.moduleId).toBe(testModule.getInfo().id);
      expect(response.status).toBeDefined();
      expect(response.status.errorCount).toBeGreaterThanOrEqual(0);
      expect(response.status.registeredHandlers).toBeGreaterThan(0);
    });

    test('should handle unknown message type gracefully', async () => {
      const unknownMessage = {
        id: 'test-unknown-1',
        type: 'unknown-type'
      };

      const response = await testModule.handleMessage(unknownMessage);

      expect(response.type).toBe('error');
      expect(response.originalId).toBe('test-unknown-1');
      expect(response.error).toContain('Unknown message type');
    });
  });

  describe('Integration with ErrorHandlingCenter', () => {
    test('should integrate with error interface gateway', async () => {
      const errorContext = {
        errorId: 'test-integration-error',
        error: new Error('Integration test error'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          moduleType: testModule.getInfo().type,
          version: '1.0.0'
        },
        timestamp: new Date(),
        config: {},
        metadata: {},
        classification: {
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any,
          source: 'system' as any
        },
        data: {}
      };

      // 通过错误接口网关处理错误
      const response = await errorInterfaceGateway.handleError(errorContext);

      expect(response).toBeDefined();
      expect(response.errorId).toBe('test-integration-error');
      expect(response.result.status).toBe('success');
    });

    test('should handle errors via message center', async () => {
      const errorMessage = {
        id: 'test-message-center-error',
        type: 'error-test',
        error: {
          message: 'Message center test error'
        }
      };

      // 通过消息中心发送消息
      const response = await messageCenter.sendRequest({
        id: 'test-request-1',
        type: 'error-test',
        source: 'test-sender',
        target: testModule.getInfo().id,
        payload: errorMessage,
        timestamp: Date.now()
      });

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should track error statistics correctly', async () => {
      const initialStats = testModule.getStatistics();
      const initialErrorCount = initialStats.errorCount;

      // 处理几个错误
      await testModule.handleErrorBlocking({
        errorId: 'stats-test-1',
        error: new Error('Stats test error 1'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      });

      await testModule.handleErrorBlocking({
        errorId: 'stats-test-2',
        error: new Error('Stats test error 2'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      });

      const finalStats = testModule.getStatistics();
      
      expect(finalStats.errorCount).toBe(initialErrorCount + 2);
      expect(finalStats.handledErrors).toBe(initialStats.handledErrors + 2);
      expect(finalStats.responseCount).toBe(initialStats.responseCount + 2);
    });

    test('should reset statistics correctly', async () => {
      // 先处理一些错误
      await testModule.handleErrorBlocking({
        errorId: 'reset-test-1',
        error: new Error('Reset test error'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      });

      // 重置统计
      testModule.resetStatistics();

      const stats = testModule.getStatistics();
      
      expect(stats.errorCount).toBe(0);
      expect(stats.handledErrors).toBe(0);
      expect(stats.responseCount).toBe(0);
    });
  });

  describe('Error Classification and Routing', () => {
    test('should correctly classify validation errors', async () => {
      const errorContext = {
        errorId: 'classification-validation',
        error: new Error('Invalid user input validation failed'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      };

      const response = await testModule.handleErrorBlocking(errorContext);

      expect(response.result.code).toBe('VALIDATION_HANDLED');
      expect(response.data.metadata.errorType).toBe('validation');
    });

    test('should correctly classify network errors', async () => {
      const errorContext = {
        errorId: 'classification-network',
        error: new Error('Network connection timeout occurred'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      };

      const response = await testModule.handleErrorBlocking(errorContext);

      expect(response.result.code).toBe('NETWORK_HANDLED');
      expect(response.data.metadata.errorType).toBe('network');
    });

    test('should correctly classify business errors', async () => {
      const errorContext = {
        errorId: 'classification-business',
        error: new Error('Business logic rule violation detected'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      };

      const response = await testModule.handleErrorBlocking(errorContext);

      expect(response.result.code).toBe('BUSINESS_HANDLED');
      expect(response.data.metadata.errorType).toBe('business');
    });

    test('should correctly classify system errors', async () => {
      const errorContext = {
        errorId: 'classification-system',
        error: new Error('System internal memory error'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      };

      const response = await testModule.handleErrorBlocking(errorContext);

      expect(response.result.code).toBe('SYSTEM_HANDLED');
      expect(response.data.metadata.errorType).toBe('system');
    });

    test('should use default handler for unknown errors', async () => {
      const errorContext = {
        errorId: 'classification-unknown',
        error: new Error('Some unknown weird error'),
        source: {
          moduleId: testModule.getInfo().id,
          moduleName: testModule.getInfo().name,
          version: '1.0.0'
        },
        timestamp: new Date(),
        classification: {
          source: 'system' as any,
          type: 'technical' as any,
          severity: 'medium' as any,
          impact: 'single_module' as any,
          recoverability: 'recoverable' as any
        },
        data: {},
        config: {}
      };

      const response = await testModule.handleErrorBlocking(errorContext);

      expect(response.result.code).toBe('DEFAULT_HANDLED');
      expect(response.data.metadata.errorType).toBe('unknown');
    });
  });
});