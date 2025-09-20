/**
 * RCC Enhanced Pipeline Assembler
 *
 * 增强版流水线组装器，集成路由优化、IO跟踪、执行优化等功能
 */

import {
  PipelineWrapper,
  ModuleConfig,
  VirtualModel,
  RoutingConfig,
  RoutingOptimizationConfig,
  DebugConfig,
  IModularPipelineExecutor
} from '../interfaces/ModularInterfaces';
import { ModuleFactory } from './ModuleFactory';
import { ConfigurationValidator } from './ConfigurationValidator';
import { ModularPipelineExecutor } from './ModularPipelineExecutor';
import { RoutingOptimizer } from './RoutingOptimizer';
import { IOTracker } from './IOTracker';
import { PipelineExecutionOptimizer } from './PipelineExecutionOptimizer';

/**
 * 组装器配置
 */
interface AssemblerConfig {
  autoDiscovery: boolean;
  enableOptimization: boolean;
  enableMonitoring: boolean;
  enableHealthCheck: boolean;
  scanInterval: number;
  maxProviders: number;
  fallbackTimeout: number;
}

/**
 * 提供商发现配置
 */
interface ProviderDiscoveryConfig {
  enabled: boolean;
  endpoints: string[];
  types: string[];
  autoRegister: boolean;
}

/**
 * 性能监控配置
 */
interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
  };
}

/**
 * 增强版流水线组装器类
 */
export class EnhancedPipelineAssembler {
  private executor: IModularPipelineExecutor | null = null;
  private moduleFactory: ModuleFactory;
  private configValidator: ConfigurationValidator;
  private routingOptimizer: RoutingOptimizer | null = null;
  private ioTracker: IOTracker | null = null;
  private executionOptimizer: PipelineExecutionOptimizer | null = null;

  private config: AssemblerConfig;
  private routingConfig: RoutingOptimizationConfig;
  private debugConfig: DebugConfig;
  private providerDiscoveryConfig: ProviderDiscoveryConfig;
  private monitoringConfig: MonitoringConfig;

  private isInitialized = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<AssemblerConfig>) {
    this.config = {
      autoDiscovery: true,
      enableOptimization: true,
      enableMonitoring: true,
      enableHealthCheck: true,
      scanInterval: 30000,
      maxProviders: 50,
      fallbackTimeout: 5000,
      ...config
    };

    this.routingConfig = {
      enableLoadBalancing: true,
      enableHealthCheck: true,
      healthCheckInterval: 30000,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      requestTimeout: 30000,
      retryAttempts: 3,
      enableMetrics: true,
      metricsCollectionInterval: 60000
    };

    this.debugConfig = {
      enableIOTracking: true,
      enablePerformanceMonitoring: true,
      enableDetailedLogging: false,
      logLevel: 'info',
      maxLogEntries: 1000,
      enableSampling: false,
      sampleRate: 0.1
    };

    this.providerDiscoveryConfig = {
      enabled: true,
      endpoints: [],
      types: ['openai', 'anthropic', 'qwen', 'lmstudio'],
      autoRegister: true
    };

    this.monitoringConfig = {
      enabled: true,
      metricsInterval: 60000,
      alertThresholds: {
        responseTime: 5000,
        errorRate: 0.1,
        memoryUsage: 0.8
      }
    };

    this.moduleFactory = new ModuleFactory();
    this.configValidator = new ConfigurationValidator();
  }

  /**
   * 初始化组装器
   */
  async initialize(wrapperConfig?: Partial<PipelineWrapper>): Promise<void> {
    try {
      // 创建或加载PipelineWrapper配置
      const wrapper = await this.createPipelineWrapper(wrapperConfig);

      // 验证配置
      const validationResult = await this.configValidator.validateWrapper(wrapper);
      if (!validationResult.isValid) {
        throw new Error(`配置验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 初始化优化组件
      if (this.config.enableOptimization) {
        this.routingOptimizer = new RoutingOptimizer(this.routingConfig);
        this.ioTracker = new IOTracker(this.debugConfig);
      }

      // 创建执行器
      this.executor = new ModularPipelineExecutor(
        this.moduleFactory,
        this.configValidator,
        this.routingConfig,
        this.debugConfig
      );

      // 初始化执行器
      await this.executor.initialize(wrapper);

      // 初始化执行优化器
      if (this.config.enableOptimization && this.routingOptimizer && this.ioTracker) {
        this.executionOptimizer = new PipelineExecutionOptimizer(
          this.routingOptimizer,
          this.ioTracker
        );
      }

      // 启动监控
      if (this.config.enableMonitoring) {
        this.startMonitoring();
      }

      // 启动自动发现
      if (this.config.autoDiscovery) {
        this.startAutoDiscovery();
      }

      this.isInitialized = true;

      console.log('✅ Enhanced Pipeline Assembler 初始化完成');
      console.log(`📊 配置统计:`);
      console.log(`  - 虚拟模型: ${wrapper.virtualModels.length}`);
      console.log(`  - 模块: ${wrapper.modules.length}`);
      console.log(`  - 路由策略: ${wrapper.routing.strategy}`);
      console.log(`  - 优化功能: ${this.config.enableOptimization ? '启用' : '禁用'}`);
      console.log(`  - 监控功能: ${this.config.enableMonitoring ? '启用' : '禁用'}`);

    } catch (error) {
      console.error('❌ Enhanced Pipeline Assembler 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建PipelineWrapper配置
   */
  private async createPipelineWrapper(config?: Partial<PipelineWrapper>): Promise<PipelineWrapper> {
    if (config) {
      return this.mergeWithDefaultConfig(config);
    }

    // 使用默认配置
    return this.createDefaultPipelineWrapper();
  }

  /**
   * 创建默认PipelineWrapper
   */
  private createDefaultPipelineWrapper(): PipelineWrapper {
    return {
      virtualModels: [
        {
          id: 'claude-3-sonnet',
          name: 'Claude 3 Sonnet',
          description: 'Anthropic Claude 3 Sonnet model',
          targets: [
            { providerId: 'anthropic-provider' }
          ],
          capabilities: ['text-generation', 'reasoning', 'code-generation'],
          tags: ['claude', 'sonnet', 'anthropic']
        }
      ],
      modules: [
        {
          id: 'llmswitch-default',
          name: 'Default LLM Switch',
          type: 'llmswitch',
          config: {
            protocolMappings: {
              'anthropic': 'openai'
            }
          }
        },
        {
          id: 'workflow-default',
          name: 'Default Workflow',
          type: 'workflow',
          config: {
            streamingSupport: true,
            chunkSize: 1024
          }
        },
        {
          id: 'compatibility-default',
          name: 'Default Compatibility',
          type: 'compatibility',
          config: {
            fieldMappings: {
              'model': 'model',
              'messages': 'messages',
              'max_tokens': 'max_tokens'
            }
          }
        },
        {
          id: 'provider-default',
          name: 'Default Provider',
          type: 'provider',
          config: {
            endpoint: 'https://api.anthropic.com',
            timeout: 30000
          }
        }
      ],
      routing: {
        strategy: 'round-robin',
        fallbackStrategy: 'failover',
        rules: [
          {
            id: 'health-check',
            name: 'Provider Health Check',
            condition: 'provider.health == "healthy"',
            action: 'use_provider',
            priority: 1
          }
        ]
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        description: 'Default pipeline configuration'
      }
    };
  }

  /**
   * 合并配置
   */
  private mergeWithDefaultConfig(config: Partial<PipelineWrapper>): PipelineWrapper {
    const defaultConfig = this.createDefaultPipelineWrapper();

    return {
      virtualModels: config.virtualModels || defaultConfig.virtualModels,
      modules: config.modules || defaultConfig.modules,
      routing: {
        ...defaultConfig.routing,
        ...config.routing
      },
      metadata: {
        ...defaultConfig.metadata,
        ...config.metadata
      }
    };
  }

  /**
   * 启动自动发现
   */
  private startAutoDiscovery(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }

    this.scanInterval = setInterval(async () => {
      try {
        await this.discoverProviders();
      } catch (error) {
        console.error('自动发现失败:', error);
      }
    }, this.config.scanInterval);

    // 立即执行一次发现
    this.discoverProviders().catch(console.error);
  }

  /**
   * 发现提供商
   */
  private async discoverProviders(): Promise<void> {
    if (!this.providerDiscoveryConfig.enabled) {
      return;
    }

    console.log('🔍 开始提供商发现...');

    // 这里应该实现实际的提供商发现逻辑
    // 包括扫描网络、检查配置文件、连接注册中心等

    // 模拟发现过程
    const discoveredProviders = [
      {
        id: 'discovered-openai',
        name: 'Discovered OpenAI Provider',
        type: 'openai',
        endpoint: 'https://api.openai.com/v1',
        capabilities: ['text-generation', 'chat', 'embeddings']
      }
    ];

    for (const provider of discoveredProviders) {
      console.log(`✅ 发现提供商: ${provider.name} (${provider.type})`);

      // 如果有执行器，可以动态注册新提供商
      if (this.executor) {
        try {
          await this.registerDiscoveredProvider(provider);
        } catch (error) {
          console.error(`注册提供商失败: ${provider.id}`, error);
        }
      }
    }
  }

  /**
   * 注册发现的提供商
   */
  private async registerDiscoveredProvider(provider: any): Promise<void> {
    // 这里应该实现提供商注册逻辑
    // 包括添加到虚拟模型配置、更新路由表等
    console.log(`📝 注册提供商: ${provider.id}`);
  }

  /**
   * 启动监控
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkSystemHealth();
        await this.collectMetrics();
      } catch (error) {
        console.error('监控检查失败:', error);
      }
    }, this.monitoringConfig.metricsInterval);

    console.log('📊 系统监控已启动');
  }

  /**
   * 检查系统健康状态
   */
  private async checkSystemHealth(): Promise<void> {
    if (!this.executor) {
      return;
    }

    try {
      const status = await this.executor.getStatus();

      // 检查各模块状态
      for (const [moduleId, moduleStatus] of Object.entries(status.modules || {})) {
        if (moduleStatus.status === 'error') {
          console.warn(`⚠️ 模块 ${moduleId} 状态异常:`, moduleStatus.statistics);
        }
      }

      // 检查性能指标
      if (this.ioTracker) {
        const analysis = this.ioTracker.getPerformanceAnalysis();
        if (analysis.averageStepTime > this.monitoringConfig.alertThresholds.responseTime) {
          console.warn(`⚠️ 平均步骤时间过长: ${analysis.averageStepTime}ms`);
        }
      }

    } catch (error) {
      console.error('健康检查失败:', error);
    }
  }

  /**
   * 收集指标
   */
  private async collectMetrics(): Promise<void> {
    if (!this.executor) {
      return;
    }

    try {
      const status = await this.executor.getStatus();

      // 收集路由指标
      if (status.routing) {
        console.log('📈 路由指标:', {
          providers: status.routing.size,
          healthyProviders: Array.from(status.routing.values()).filter(h => h.isHealthy).length
        });
      }

      // 收集性能指标
      if (status.performance) {
        console.log('📊 性能指标:', {
          averageStepTime: status.performance.averageStepTime,
          throughput: status.performance.throughput,
          bottleneck: status.performance.bottleneckStep
        });
      }

    } catch (error) {
      console.error('指标收集失败:', error);
    }
  }

  /**
   * 获取执行器
   */
  getExecutor(): IModularPipelineExecutor | null {
    return this.executor;
  }

  /**
   * 获取性能报告
   */
  async getPerformanceReport(): Promise<any> {
    if (!this.ioTracker) {
      return { error: 'IO tracker not available' };
    }

    return this.ioTracker.generateDebugReport();
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus(): Promise<any> {
    const status: any = {
      initialized: this.isInitialized,
      config: {
        autoDiscovery: this.config.autoDiscovery,
        enableOptimization: this.config.enableOptimization,
        enableMonitoring: this.config.enableMonitoring,
        enableHealthCheck: this.config.enableHealthCheck
      }
    };

    if (this.executor) {
      try {
        status.executor = await this.executor.getStatus();
      } catch (error) {
        status.executor = { error: error instanceof Error ? error.message : String(error) };
      }
    }

    if (this.routingOptimizer) {
      status.routing = {
        metrics: this.routingOptimizer.getPerformanceMetrics(),
        health: this.routingOptimizer.getHealthStatus()
      };
    }

    if (this.executionOptimizer) {
      status.optimization = this.executionOptimizer.getOptimizationStats();
    }

    return status;
  }

  /**
   * 动态添加虚拟模型
   */
  async addVirtualModel(virtualModel: VirtualModel): Promise<void> {
    if (!this.executor) {
      throw new Error('Executor not initialized');
    }

    // 这里应该实现动态添加虚拟模型的逻辑
    console.log(`➕ 添加虚拟模型: ${virtualModel.name}`);

    // 需要重新初始化执行器以应用新配置
    // 注意：这会影响正在进行的请求
  }

  /**
   * 动态更新配置
   */
  async updateConfig(config: Partial<AssemblerConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // 应用新配置
    if (this.routingOptimizer) {
      this.routingOptimizer.destroy();
      this.routingOptimizer = new RoutingOptimizer(this.routingConfig);
    }

    if (this.ioTracker) {
      this.ioTracker.destroy();
      this.ioTracker = new IOTracker(this.debugConfig);
    }

    console.log('⚙️ 配置已更新');
  }

  /**
   * 停止组装器
   */
  async stop(): Promise<void> {
    try {
      // 停止监控
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      // 停止自动发现
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }

      // 销毁组件
      if (this.executor) {
        await this.executor.destroy();
        this.executor = null;
      }

      if (this.routingOptimizer) {
        this.routingOptimizer.destroy();
        this.routingOptimizer = null;
      }

      if (this.ioTracker) {
        this.ioTracker.destroy();
        this.ioTracker = null;
      }

      if (this.executionOptimizer) {
        this.executionOptimizer.destroy();
        this.executionOptimizer = null;
      }

      this.isInitialized = false;
      console.log('🛑 Enhanced Pipeline Assembler 已停止');

    } catch (error) {
      console.error('停止组装器时发生错误:', error);
      throw error;
    }
  }
}