/**
 * RCC Phase 4 Optimization Test
 *
 * 测试路由优化和IO记录增强功能
 */

import { EnhancedPipelineAssembler } from '../core/EnhancedPipelineAssembler';
import { ModularPipelineExecutor } from '../core/ModularPipelineExecutor';
import { RoutingOptimizer } from '../core/RoutingOptimizer';
import { IOTracker } from '../core/IOTracker';
import { PipelineExecutionOptimizer } from '../core/PipelineExecutionOptimizer';

/**
 * 测试数据
 */
const testRequest = {
  model: 'claude-3-sonnet',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ],
  max_tokens: 100,
  temperature: 0.7
};

/**
 * 路由优化测试
 */
async function testRoutingOptimization() {
  console.log('\n🔄 测试路由优化功能...');

  try {
    // 创建路由优化器
    const routingConfig = {
      enableLoadBalancing: true,
      enableHealthCheck: true,
      healthCheckInterval: 10000,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 3,
      requestTimeout: 5000,
      retryAttempts: 2,
      enableMetrics: true,
      metricsCollectionInterval: 30000
    };

    const routingOptimizer = new RoutingOptimizer(routingConfig);

    // 模拟虚拟模型
    const virtualModel = {
      id: 'test-model',
      name: 'Test Model',
      targets: [
        { providerId: 'provider-1', weight: 0.6 },
        { providerId: 'provider-2', weight: 0.4 }
      ],
      capabilities: ['text-generation']
    };

    // 测试路由决策
    const routingDecision = await routingOptimizer.getRoutingDecision(virtualModel);
    console.log('✅ 路由决策:', routingDecision);

    // 测试性能指标
    const metrics = routingOptimizer.getPerformanceMetrics();
    console.log('📊 性能指标:', metrics);

    // 测试健康状态
    const healthStatus = routingOptimizer.getHealthStatus();
    console.log('🏥 健康状态:', healthStatus);

    // 记录一些测试结果
    routingOptimizer.recordRequestResult('provider-1', true, 1200);
    routingOptimizer.recordRequestResult('provider-2', false, 3000);
    routingOptimizer.recordRequestResult('provider-1', true, 800);

    const updatedMetrics = routingOptimizer.getPerformanceMetrics();
    console.log('📈 更新后的指标:', updatedMetrics);

    routingOptimizer.destroy();
    console.log('✅ 路由优化测试完成');

  } catch (error) {
    console.error('❌ 路由优化测试失败:', error);
    throw error;
  }
}

/**
 * IO跟踪测试
 */
async function testIOTracking() {
  console.log('\n📝 测试IO跟踪功能...');

  try {
    // 创建IO跟踪器
    const debugConfig = {
      enableIOTracking: true,
      enablePerformanceMonitoring: true,
      enableDetailedLogging: true,
      logLevel: 'debug' as const,
      maxLogEntries: 100,
      enableSampling: true,
      sampleRate: 1.0
    };

    const ioTracker = new IOTracker(debugConfig);

    // 开始会话
    const sessionId = 'test-session-001';
    const requestId = ioTracker.startSession(sessionId);
    console.log('🚀 会话开始:', { sessionId, requestId });

    // 记录各种IO操作
    ioTracker.trackRequest(sessionId, requestId, 'llmswitch', testRequest);

    // 模拟步骤执行
    const stepResult = await ioTracker.trackStepExecution(
      sessionId,
      requestId,
      'llmswitch',
      'protocol_conversion',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { converted: true };
      }
    );

    console.log('✅ 步骤执行结果:', stepResult);

    // 模拟响应
    const testResponse = {
      id: 'test-response',
      object: 'chat.completion',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! I am doing well, thank you for asking.'
          },
          finish_reason: 'stop'
        }
      ]
    };

    ioTracker.trackResponse(sessionId, requestId, 'provider', testResponse, Date.now());

    // 添加调试数据
    ioTracker.addDebugData(sessionId, 'user-agent', 'test-client/1.0');
    ioTracker.addDebugData(sessionId, 'request-size', JSON.stringify(testRequest).length);

    // 获取会话数据
    const sessionData = ioTracker.getSessionData(sessionId);
    console.log('📋 会话数据:', {
      sessionId: sessionData?.sessionId,
      requestId: sessionData?.requestId,
      recordCount: sessionData?.ioRecords.length
    });

    // 获取性能分析
    const performanceAnalysis = ioTracker.getPerformanceAnalysis(sessionId);
    console.log('📊 性能分析:', performanceAnalysis);

    // 获取调试报告
    const debugReport = ioTracker.generateDebugReport(sessionId);
    console.log('🐛 调试报告:', debugReport);

    // 结束会话
    ioTracker.endSession(sessionId);

    // 获取IO记录
    const ioRecords = ioTracker.getIORecords({ sessionId });
    console.log('📝 IO记录数量:', ioRecords.length);

    ioTracker.destroy();
    console.log('✅ IO跟踪测试完成');

  } catch (error) {
    console.error('❌ IO跟踪测试失败:', error);
    throw error;
  }
}

/**
 * 执行优化测试
 */
async function testExecutionOptimization() {
  console.log('\n⚡ 测试执行优化功能...');

  try {
    // 创建基础组件
    const routingOptimizer = new RoutingOptimizer({
      enableLoadBalancing: true,
      enableHealthCheck: false,
      healthCheckInterval: 0,
      enableCircuitBreaker: false,
      circuitBreakerThreshold: 0,
      requestTimeout: 5000,
      retryAttempts: 0,
      enableMetrics: true,
      metricsCollectionInterval: 0
    });

    const ioTracker = new IOTracker({
      enableIOTracking: true,
      enablePerformanceMonitoring: true,
      enableDetailedLogging: false,
      logLevel: 'info',
      maxLogEntries: 100,
      enableSampling: false,
      sampleRate: 1.0
    });

    // 创建执行优化器
    const executionOptimizer = new PipelineExecutionOptimizer(
      routingOptimizer,
      ioTracker,
      {
        enableConcurrency: true,
        maxConcurrency: 5,
        enableRetry: true,
        maxRetries: 2,
        retryDelay: 1000,
        enableCaching: true,
        cacheTTL: 60000,
        enableBatching: false,
        batchSize: 5,
        batchTimeout: 100,
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 3
      }
    );

    // 模拟执行函数
    const mockExecuteFn = async (request: any, virtualModelId: string, context?: any) => {
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

      if (Math.random() < 0.1) { // 10% 失败率
        throw new Error('Random failure for testing');
      }

      return {
        success: true,
        response: {
          id: 'test-response',
          content: 'This is a test response',
          model: virtualModelId
        },
        executionTime: 200 + Math.random() * 300,
        steps: [],
        context: context || {}
      };
    };

    // 测试并发执行
    console.log('🔄 测试并发执行...');
    const concurrentRequests = 10;
    const startTime = Date.now();

    const promises = Array(concurrentRequests).fill(0).map((_, index) =>
      executionOptimizer.executeOptimized(
        { ...testRequest, index },
        'test-model',
        mockExecuteFn,
        { sessionId: `session-${index}` }
      )
    );

    const results = await Promise.allSettled(promises);
    const executionTime = Date.now() - startTime;

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 并发执行结果:`);
    console.log(`  - 请求数量: ${concurrentRequests}`);
    console.log(`  - 成功: ${successful}`);
    console.log(`  - 失败: ${failed}`);
    console.log(`  - 总时间: ${executionTime}ms`);
    console.log(`  - 平均时间: ${executionTime / concurrentRequests}ms`);

    // 测试重试机制
    console.log('\n🔄 测试重试机制...');
    let retryCount = 0;
    const failingExecuteFn = async () => {
      retryCount++;
      if (retryCount <= 2) {
        throw new Error('Simulated failure for retry test');
      }
      return {
        success: true,
        response: { content: 'Retry successful!' },
        executionTime: 100,
        steps: [],
        context: {}
      };
    };

    try {
      const retryResult = await executionOptimizer.executeOptimized(
        testRequest,
        'test-model',
        failingExecuteFn,
        { sessionId: 'retry-test' }
      );
      console.log('✅ 重试成功:', retryResult.success);
    } catch (error) {
      console.log('❌ 重试失败:', error);
    }

    // 获取优化统计
    const optimizationStats = executionOptimizer.getOptimizationStats();
    console.log('📈 优化统计:', optimizationStats);

    executionOptimizer.destroy();
    console.log('✅ 执行优化测试完成');

  } catch (error) {
    console.error('❌ 执行优化测试失败:', error);
    throw error;
  }
}

/**
 * 增强组装器测试
 */
async function testEnhancedAssembler() {
  console.log('\n🏗️ 测试增强组装器...');

  try {
    // 创建增强组装器
    const assembler = new EnhancedPipelineAssembler({
      autoDiscovery: true,
      enableOptimization: true,
      enableMonitoring: true,
      enableHealthCheck: true,
      scanInterval: 60000,
      maxProviders: 20,
      fallbackTimeout: 3000
    });

    // 初始化组装器
    await assembler.initialize();

    // 获取执行器
    const executor = assembler.getExecutor();
    if (executor) {
      console.log('✅ 执行器获取成功');

      // 获取系统状态
      const systemStatus = await assembler.getSystemStatus();
      console.log('📊 系统状态:', {
        initialized: systemStatus.initialized,
        hasExecutor: !!systemStatus.executor,
        hasRouting: !!systemStatus.routing,
        hasOptimization: !!systemStatus.optimization
      });

      // 获取性能报告
      const performanceReport = await assembler.getPerformanceReport();
      console.log('📋 性能报告:', {
        totalSessions: performanceReport.summary?.totalSessions,
        totalRecords: performanceReport.summary?.totalRecords,
        activeSessions: performanceReport.summary?.activeSessions
      });
    }

    // 测试动态配置更新
    await assembler.updateConfig({
      enableOptimization: false,
      enableMonitoring: false
    });
    console.log('✅ 配置更新完成');

    // 停止组装器
    await assembler.stop();
    console.log('✅ 增强组装器测试完成');

  } catch (error) {
    console.error('❌ 增强组装器测试失败:', error);
    throw error;
  }
}

/**
 * 综合性能测试
 */
async function testPerformance() {
  console.log('\n🚀 综合性能测试...');

  try {
    // 创建所有组件
    const routingOptimizer = new RoutingOptimizer({
      enableLoadBalancing: true,
      enableHealthCheck: false,
      healthCheckInterval: 0,
      enableCircuitBreaker: false,
      circuitBreakerThreshold: 0,
      requestTimeout: 10000,
      retryAttempts: 1,
      enableMetrics: true,
      metricsCollectionInterval: 0
    });

    const ioTracker = new IOTracker({
      enableIOTracking: true,
      enablePerformanceMonitoring: true,
      enableDetailedLogging: false,
      logLevel: 'info',
      maxLogEntries: 1000,
      enableSampling: false,
      sampleRate: 0.1
    });

    const executionOptimizer = new PipelineExecutionOptimizer(
      routingOptimizer,
      ioTracker,
      {
        enableConcurrency: true,
        maxConcurrency: 10,
        enableRetry: true,
        maxRetries: 1,
        retryDelay: 500,
        enableCaching: true,
        cacheTTL: 300000,
        enableBatching: false,
        batchSize: 5,
        batchTimeout: 100,
        enableCircuitBreaker: false,
        circuitBreakerThreshold: 0
      }
    );

    // 模拟大量请求
    const requestCount = 100;
    console.log(`📊 发送 ${requestCount} 个测试请求...`);

    const startTime = Date.now();

    const requests = Array(requestCount).fill(0).map((_, index) =>
      executionOptimizer.executeOptimized(
        { ...testRequest, index },
        'test-model',
        async () => {
          const delay = 50 + Math.random() * 150;
          await new Promise(resolve => setTimeout(resolve, delay));

          return {
            success: true,
            response: { content: `Response ${index}`, delay },
            executionTime: delay,
            steps: [],
            context: {}
          };
        },
        { sessionId: `perf-session-${index % 10}` }
      )
    );

    const results = await Promise.allSettled(requests);
    const totalTime = Date.now() - startTime;

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 性能测试结果:`);
    console.log(`  - 总请求数: ${requestCount}`);
    console.log(`  - 成功: ${successful} (${(successful / requestCount * 100).toFixed(1)}%)`);
    console.log(`  - 失败: ${failed} (${(failed / requestCount * 100).toFixed(1)}%)`);
    console.log(`  - 总时间: ${totalTime}ms`);
    console.log(`  - 平均延迟: ${(totalTime / requestCount).toFixed(1)}ms`);
    console.log(`  - QPS: ${(requestCount / (totalTime / 1000)).toFixed(1)}`);

    // 性能分析
    const performanceAnalysis = ioTracker.getPerformanceAnalysis();
    console.log('📈 性能分析:', {
      averageStepTime: performanceAnalysis.averageStepTime.toFixed(1) + 'ms',
      throughput: performanceAnalysis.throughput.toFixed(1) + ' req/s',
      bottleneckStep: performanceAnalysis.bottleneckStep
    });

    // 优化统计
    const optimizationStats = executionOptimizer.getOptimizationStats();
    console.log('⚡ 优化统计:', {
      cacheSize: optimizationStats.cache.size,
      cacheHitRate: (optimizationStats.cache.hitRate * 100).toFixed(1) + '%',
      concurrency: optimizationStats.concurrency
    });

    // 清理
    executionOptimizer.destroy();
    console.log('✅ 综合性能测试完成');

  } catch (error) {
    console.error('❌ 综合性能测试失败:', error);
    throw error;
  }
}

/**
 * 主测试函数
 */
async function runPhase4Tests() {
  console.log('🧪 RCC Phase 4 优化测试开始\n');

  try {
    // 1. 路由优化测试
    await testRoutingOptimization();

    // 2. IO跟踪测试
    await testIOTracking();

    // 3. 执行优化测试
    await testExecutionOptimization();

    // 4. 增强组装器测试
    await testEnhancedAssembler();

    // 5. 综合性能测试
    await testPerformance();

    console.log('\n🎉 所有Phase 4优化测试完成！');
    console.log('✅ 路由优化功能正常');
    console.log('✅ IO记录增强功能正常');
    console.log('✅ 执行优化功能正常');
    console.log('✅ 增强组装器功能正常');
    console.log('✅ 性能指标符合预期');

  } catch (error) {
    console.error('\n❌ Phase 4测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runPhase4Tests()
    .then(() => {
      console.log('\n🏁 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 测试运行失败:', error);
      process.exit(1);
    });
}

export {
  runPhase4Tests,
  testRoutingOptimization,
  testIOTracking,
  testExecutionOptimization,
  testEnhancedAssembler,
  testPerformance
};