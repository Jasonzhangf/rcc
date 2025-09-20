/**
 * Virtual Model Routing System Example
 * 虚拟模型路由系统示例
 */

import {
  VirtualModelSchedulerManager,
  ManagerConfig
} from '../framework/VirtualModelSchedulerManager';

import {
  PipelineAssembler,
  AssemblerConfig
} from '../framework/PipelineAssembler';

import {
  PipelineTracker
} from '../framework/PipelineTracker';

import {
  RoutingContext,
  RoutingCapabilities
} from './RoutingCapabilities';

/**
 * 路由系统使用示例
 */
export class RoutingExample {
  private pipelineTracker: PipelineTracker;
  private pipelineAssembler: PipelineAssembler;
  private virtualModelScheduler: VirtualModelSchedulerManager;

  constructor() {
    console.log('🚀 Initializing Virtual Model Routing System Example...');

    // 初始化Pipeline Tracker
    this.pipelineTracker = new PipelineTracker();

    // 创建支持路由的Scheduler配置
    const schedulerConfig: ManagerConfig = {
      maxSchedulers: 10,
      enableAutoScaling: true,
      scalingThresholds: {
        minRequestsPerMinute: 10,
        maxRequestsPerMinute: 1000,
        scaleUpCooldown: 30000,
        scaleDownCooldown: 120000
      },
      healthCheckInterval: 60000,
      metricsRetentionPeriod: 3600000,
      enableMetricsExport: true,
      // 路由系统配置
      enableRouting: true,
      requestAnalyzerConfig: {
        enableDetailedTokenCounting: true,
        enableContentAnalysis: true,
        defaultTokenEstimationFactor: 1.3,
        complexityThresholds: {
          low: 0.3,
          medium: 0.6,
          high: 0.8,
          critical: 0.95
        },
        enabledAnalyzers: {
          tokenAnalyzer: true,
          toolAnalyzer: true,
          imageAnalyzer: true,
          modalityAnalyzer: true,
          complexityAnalyzer: true
        }
      },
      routingEngineConfig: {
        defaultMatchThreshold: 0.6,
        enableFallback: true,
        maxAlternatives: 3,
        enableLoadBalancing: true,
        enablePerformanceOptimization: true,
        ruleCacheTime: 300000,
        decisionTimeout: 1000
      },
      routingStrategy: 'balanced',
      enableInternalAPI: true,
      internalAPIPort: 8080
    };

    // 创建Virtual Model Scheduler Manager
    this.virtualModelScheduler = new VirtualModelSchedulerManager(
      schedulerConfig,
      this.pipelineTracker
    );

    // 创建Pipeline Assembler配置
    const assemblerConfig: AssemblerConfig = {
      enableAutoDiscovery: true,
      fallbackStrategy: 'first-available',
      enableConfigModuleIntegration: true,
      providerDiscoveryOptions: {
        enabledProviders: ['qwen', 'iflow'],
        includeTestProviders: false
      }
    };

    // 创建Pipeline Assembler
    this.pipelineAssembler = new PipelineAssembler(
      assemblerConfig,
      this.pipelineTracker
    );

    // 将Scheduler连接到Assembler
    this.pipelineAssembler.setVirtualModelScheduler(this.virtualModelScheduler);

    console.log('✅ Virtual Model Routing System Example initialized');
  }

  /**
   * 演示基本路由功能
   */
  async demonstrateBasicRouting(): Promise<void> {
    console.log('🎯 Demonstrating basic routing functionality...');

    try {
      // 示例请求 - 简单聊天
      const simpleChatRequest = {
        messages: [
          { role: 'user', content: 'Hello, how are you?' }
        ],
        model: 'gpt-3.5-turbo'
      };

      // 示例请求 - 带图像的聊天
      const visionChatRequest = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What do you see in this image?' },
              { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } }
            ]
          }
        ],
        model: 'gpt-4-vision'
      };

      // 示例请求 - 工具调用
      const toolCallRequest = {
        messages: [
          { role: 'user', content: 'Search for the latest news about AI' }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search the web for information',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string' }
                }
              }
            }
          }
        ],
        model: 'gpt-4'
      };

      // 创建路由上下文
      const routingContext: RoutingContext = {
        requestId: 'demo-request-001',
        userId: 'user-123',
        sessionId: 'session-456',
        timestamp: Date.now(),
        clientInfo: {
          userAgent: 'DemoClient/1.0',
          region: 'us-east-1'
        },
        metadata: {
          priority: 'medium',
          debug: true
        }
      };

      console.log('📝 Processing simple chat request...');
      const simpleResult = await this.virtualModelScheduler.handleRequest(
        simpleChatRequest,
        routingContext
      );
      console.log('✅ Simple chat result:', simpleResult);

      console.log('📝 Processing vision chat request...');
      const visionResult = await this.virtualModelScheduler.handleRequest(
        visionChatRequest,
        { ...routingContext, requestId: 'demo-request-002' }
      );
      console.log('✅ Vision chat result:', visionResult);

      console.log('📝 Processing tool call request...');
      const toolResult = await this.virtualModelScheduler.handleRequest(
        toolCallRequest,
        { ...routingContext, requestId: 'demo-request-003' }
      );
      console.log('✅ Tool call result:', toolResult);

    } catch (error) {
      console.error('❌ Basic routing demonstration failed:', error);
    }
  }

  /**
   * 演示自定义路由规则
   */
  async demonstrateCustomRoutingRules(): Promise<void> {
    console.log('🎯 Demonstrating custom routing rules...');

    try {
      // 添加自定义路由规则
      const customRule = {
        name: 'high_priority_user',
        description: '优先为高级用户使用高性能模型',
        enabled: true,
        priority: 95,
        conditions: [
          { field: 'userContext', operator: 'contains', value: { userTier: 'premium' } }
        ],
        actions: [
          { type: 'select_virtual_model', target: 'high-performance-model', parameters: {} }
        ],
        weight: 1.5
      };

      // 注意：在实际实现中，需要通过routingEngine.addRule()添加规则
      console.log('📝 Custom routing rule would be added here:', customRule);

      // 演示高级用户请求
      const premiumUserRequest = {
        messages: [
          { role: 'user', content: 'I need a complex analysis of market trends' }
        ],
        model: 'auto'
      };

      const premiumContext: RoutingContext = {
        requestId: 'premium-request-001',
        userId: 'premium-user-789',
        sessionId: 'session-456',
        timestamp: Date.now(),
        metadata: {
          userTier: 'premium',
          priority: 'high'
        }
      };

      console.log('📝 Processing premium user request...');
      const premiumResult = await this.virtualModelScheduler.handleRequest(
        premiumUserRequest,
        premiumContext
      );
      console.log('✅ Premium user result:', premiumResult);

    } catch (error) {
      console.error('❌ Custom routing rules demonstration failed:', error);
    }
  }

  /**
   * 演示路由统计和监控
   */
  async demonstrateRoutingStatistics(): Promise<void> {
    console.log('📊 Demonstrating routing statistics and monitoring...');

    try {
      // 获取路由引擎统计信息
      if (this.virtualModelScheduler['routingEngine']) {
        const routingStats = this.virtualModelScheduler['routingEngine'].getStatistics();
        console.log('📈 Routing Statistics:', routingStats);
      }

      // 获取请求分析器统计信息
      if (this.virtualModelScheduler['requestAnalyzer']) {
        const analyzerStats = this.virtualModelScheduler['requestAnalyzer'].getStatistics();
        console.log('📊 Request Analyzer Statistics:', analyzerStats);
      }

      // 获取虚拟模型调度器统计信息
      const schedulerMetrics = this.virtualModelScheduler.getMetrics();
      console.log('🎯 Scheduler Metrics:', schedulerMetrics);

      // 获取流水线组装器状态
      const assemblerStatus = this.pipelineAssembler.getStatus();
      console.log('🏗️ Assembler Status:', assemblerStatus);

    } catch (error) {
      console.error('❌ Routing statistics demonstration failed:', error);
    }
  }

  /**
   * 运行完整演示
   */
  async runFullDemo(): Promise<void> {
    console.log('🎪 Running complete virtual model routing demonstration...');

    try {
      // 步骤1: 演示基本路由功能
      await this.demonstrateBasicRouting();

      // 步骤2: 演示自定义路由规则
      await this.demonstrateCustomRoutingRules();

      // 步骤3: 演示路由统计和监控
      await this.demonstrateRoutingStatistics();

      console.log('🎉 Virtual model routing demonstration completed successfully!');

    } catch (error) {
      console.error('❌ Full demonstration failed:', error);
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    console.log('🧹 Cleaning up routing example...');

    if (this.pipelineAssembler) {
      this.pipelineAssembler.destroy();
    }

    if (this.virtualModelScheduler) {
      this.virtualModelScheduler.destroy();
    }

    if (this.pipelineTracker) {
      this.pipelineTracker.destroy();
    }

    console.log('✅ Routing example cleaned up');
  }
}

/**
 * 运行路由系统示例
 */
export async function runRoutingExample(): Promise<void> {
  const example = new RoutingExample();

  try {
    await example.runFullDemo();
  } catch (error) {
    console.error('❌ Routing example failed:', error);
  } finally {
    example.cleanup();
  }
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  runRoutingExample().catch(console.error);
}