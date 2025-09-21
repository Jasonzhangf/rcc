/**
 * Virtual Model Scheduler Manager - Manages all pipeline pools directly
 * 虚拟模型调度器管理器 - 直接管理所有流水线池
 */

import { PipelineTracker } from './PipelineTracker';
import { BaseProvider } from './BaseProvider';
import { VirtualModelConfig } from '../types/virtual-model';
import { IRequestContext } from '../interfaces/IRequestContext';
import { PipelinePool } from './PipelineAssembler';
import { Pipeline } from './Pipeline';
import { RequestAnalyzer, RequestAnalyzerConfig } from '../routing/RequestAnalyzer';
import { RoutingRulesEngine, RoutingRulesEngineConfig } from '../routing/RoutingRulesEngine';
import { RoutingCapabilities, RequestAnalysisResult, RoutingDecision } from '../routing/RoutingCapabilities';
import { UnifiedPipelineBaseModule, PipelineModuleConfig } from '../modules/PipelineBaseModule';

// Define operation type locally
type OperationType = 'chat' | 'streamChat' | 'healthCheck';

export interface PipelinePoolData {
  virtualModelId: string;
  pool: PipelinePool;
  config: any;
}

export interface ManagerConfig {
  maxSchedulers: number;
  enableAutoScaling: boolean;
  scalingThresholds: {
    minRequestsPerMinute: number;
    maxRequestsPerMinute: number;
    scaleUpCooldown: number;
    scaleDownCooldown: number;
  };
  healthCheckInterval: number;
  metricsRetentionPeriod: number;
  enableMetricsExport: boolean;
  // 路由系统配置
  enableRouting: boolean;
  requestAnalyzerConfig?: RequestAnalyzerConfig;
  routingEngineConfig?: RoutingRulesEngineConfig;
  routingStrategy?: string;
  enableInternalAPI: boolean;
  internalAPIPort?: number;
}

export interface ManagerMetrics {
  totalSchedulers: number;
  activeSchedulers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  overallErrorRate: number;
  uptime: number;
  lastHealthCheck: number;
  virtualModelMetrics: Map<string, {
    requests: number;
    errors: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  }>;
}

export interface SchedulerOptions {
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  healthCheck?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Virtual Model Scheduler Manager - Direct pipeline pool management
 * 虚拟模型调度器管理器 - 直接流水线池管理
 */
export class VirtualModelSchedulerManager extends UnifiedPipelineBaseModule {
  private config: ManagerConfig;
  private pipelinePools: Map<string, PipelinePoolData> = new Map();
  private pipelineTracker: PipelineTracker;
  private metrics: ManagerMetrics;
  private healthCheckInterval?: NodeJS.Timeout;
  private startTime: number = Date.now();

  // 路由系统组件
  private requestAnalyzer?: RequestAnalyzer;
  private routingEngine?: RoutingRulesEngine;
  private internalAPIServer?: any; // HTTP服务器实例
  private _isInitialized: boolean = false;

  /**
   * 获取初始化状态
   */
  public get isInitializedAccessor(): boolean {
    return this._isInitialized;
  }

  /**
   * 公共初始化状态访问器
   */
  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  constructor(config: ManagerConfig, pipelineTracker: PipelineTracker) {
    super({
      id: 'virtual-model-scheduler-manager',
      name: 'Virtual Model Scheduler Manager',
      version: '1.0.0',
      description: 'Manages all pipeline pools directly with routing capabilities'
    } as PipelineModuleConfig);

    this.config = config;
    this.pipelineTracker = pipelineTracker;

    // Initialize metrics
    this.metrics = {
      totalSchedulers: 0,
      activeSchedulers: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      overallErrorRate: 0,
      uptime: Date.now(),
      lastHealthCheck: Date.now(),
      virtualModelMetrics: new Map()
    };

    // 初始化路由系统
    if (this.config.enableRouting) {
      this.initializeRoutingSystem();
    }

    // Start health checks
    this.startHealthChecks();
  }

  /**
   * 初始化路由系统
   */
  private initializeRoutingSystem(): void {
    this.logInfo('Initializing routing system', {}, 'routing-initialization');

    try {
      // 创建请求分析器
      this.requestAnalyzer = new RequestAnalyzer(this.config.requestAnalyzerConfig);

      // 创建路由规则引擎
      this.routingEngine = new RoutingRulesEngine(this.config.routingEngineConfig);

      this.logInfo('Routing system initialized successfully', {}, 'routing-initialization');

    } catch (error) {
      this.logError('Failed to initialize routing system', error, 'routing-initialization');
      throw new Error(`Routing system initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 初始化流水线池 - 接收PipelineAssembler传递的pools并注册到路由系统
   */
  initialize(pipelinePools: Map<string, PipelinePool>): void {
    this.logInfo('Initializing VirtualModelSchedulerManager with pipeline pools', { poolCount: pipelinePools.size }, 'initialization');

    try {
      // 添加所有流水线池
      for (const [virtualModelId, pool] of pipelinePools) {
        this.addPipelinePool(virtualModelId, pool);
      }

      // 如果启用了路由，将流水线池能力注册到路由引擎
      if (this.config.enableRouting && this.routingEngine) {
        this.registerPipelinePoolsWithRoutingEngine(pipelinePools);
      }

      // 如果启用了内部API，启动API服务
      if (this.config.enableInternalAPI) {
        this.startInternalAPI();
      }

      this._isInitialized = true;
      this.logInfo('VirtualModelSchedulerManager initialized successfully', { poolCount: pipelinePools.size, routingEnabled: this.config.enableRouting, internalAPIEnabled: this.config.enableInternalAPI }, 'initialization');

    } catch (error) {
      this.logError('Failed to initialize VirtualModelSchedulerManager', error, 'initialization');
      throw error;
    }
  }

  /**
   * 将流水线池注册到路由引擎
   */
  private registerPipelinePoolsWithRoutingEngine(pipelinePools: Map<string, PipelinePool>): void {
    if (!this.routingEngine) {
      this.logWarn('Routing engine not available, skipping registration', {}, 'routing-registration');
      return;
    }

    this.logInfo('Registering pipeline pools with routing engine', {}, 'routing-registration');

    for (const [virtualModelId, pool] of pipelinePools) {
      if (pool.routingCapabilities) {
        this.routingEngine.registerPipelinePool(virtualModelId, pool.routingCapabilities);
        this.logInfo('Registered pipeline pool with routing capabilities', { virtualModelId }, 'routing-registration');
      } else {
        this.logWarn('Pipeline pool has no routing capabilities, using defaults', { virtualModelId }, 'routing-registration');

        // 使用默认的路由能力
        const defaultCapabilities: RoutingCapabilities = {
          supportedModels: ['default'],
          maxTokens: Number.MAX_SAFE_INTEGER, // 使用最大安全整数，实际限制由provider控制
          supportsStreaming: true,
          supportsTools: true,
          supportsImages: true,
          supportsFunctionCalling: true,
          supportsMultimodal: true,
          supportedModalities: ['text'],
          priority: 50,
          availability: 0.9,
          loadWeight: 1.0,
          costScore: 0.5,
          performanceScore: 0.5,
          routingTags: ['default'],
          extendedCapabilities: {
            supportsVision: true,
            maxContextLength: Number.MAX_SAFE_INTEGER // 使用最大安全整数，实际限制由provider控制
          }
        };

        this.routingEngine.registerPipelinePool(virtualModelId, defaultCapabilities);
        this.logInfo('Registered pipeline pool with default capabilities', { virtualModelId }, 'routing-registration');
      }
    }
  }

  /**
   * 启动内部API服务
   */
  private startInternalAPI(): void {
    if (!this.config.enableInternalAPI) {
      return;
    }

    const port = this.config.internalAPIPort || 8080;
    this.logInfo('Starting internal API server', { port }, 'api-server');

    try {
      // 注意：这里简化实现，实际项目中需要使用适当的HTTP服务器库
      // 例如：express, fastify, 或者 Node.js 的 http 模块
      this.logInfo('Internal API server placeholder', { port }, 'api-server');

      // 在实际实现中，这里会启动HTTP服务器并设置路由
      // this.internalAPIServer = createServer(this.handleInternalAPIRequest.bind(this));
      // this.internalAPIServer.listen(port);

      this.logInfo('Internal API server placeholder started', {}, 'api-server');

    } catch (error) {
      this.logError('Failed to start internal API server', error, 'api-server');
      throw new Error(`Internal API server startup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理路由请求 - 主要的路由入口点
   */
  async handleRequest(request: any, context?: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('VirtualModelSchedulerManager not initialized');
    }

    this.logInfo('Processing routing request', { virtualModelId: request?.model }, 'request-processing');

    try {
      // 如果启用了路由系统，使用智能路由
      if (this.config.enableRouting && this.requestAnalyzer && this.routingEngine) {
        return await this.routeWithSmartRouting(request, context);
      } else {
        // 回退到简单的轮询或固定路由
        return await this.routeWithFallback(request);
      }

    } catch (error) {
      this.logError('Request handling failed', error, 'request-processing');
      throw new Error(`Request handling failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 使用智能路由处理请求
   */
  private async routeWithSmartRouting(request: any, context?: any): Promise<any> {
    if (!this.requestAnalyzer || !this.routingEngine) {
      throw new Error('Routing components not available');
    }

    this.logInfo('Using smart routing', {}, 'request-processing');

    // 分析请求
    const analysisResult = await this.requestAnalyzer.analyzeRequest(request, context?.metadata);

    // 进行路由决策
    const routingDecision = await this.routingEngine.makeRoutingDecision(
      analysisResult,
      context,
      this.config.routingStrategy
    );

    this.logInfo('Routing decision made', { targetVirtualModelId: routingDecision.targetVirtualModelId, score: routingDecision.matchResult.matchScore }, 'request-processing');

    // 执行请求
    return await this.executeRoutingDecision(routingDecision, request, context);
  }

  /**
   * 执行路由决策
   */
  private async executeRoutingDecision(
    decision: RoutingDecision,
    request: any,
    context?: any
  ): Promise<any> {
    const targetPool = this.pipelinePools.get(decision.targetVirtualModelId);

    if (!targetPool) {
      throw new Error(`Target pipeline pool not found: ${decision.targetVirtualModelId}`);
    }

    // 创建请求上下文
    const requestContext: any = {
      ...context,
      routingDecision: decision,
      analysis: {
        timestamp: Date.now(),
        matchScore: decision.matchResult.matchScore,
        strategy: decision.metadata?.strategyUsed
      }
    };

    // 执行请求
    const operation: OperationType = this.determineOperationType(request);
    const options = {
      timeout: 30000,
      priority: this.determinePriority(request),
      metadata: requestContext
    };

    return await this.execute(decision.targetVirtualModelId, request, operation, options);
  }

  /**
   * 使用回退路由处理请求
   */
  private async routeWithFallback(request: any): Promise<any> {
    this.logInfo('Using fallback routing', {}, 'request-processing');

    // 简单的轮询选择第一个可用的流水线池
    const availablePools = Array.from(this.pipelinePools.values());
    if (availablePools.length === 0) {
      throw new Error('No pipeline pools available');
    }

    const selectedPool = availablePools[0];
    const operation: OperationType = this.determineOperationType(request);

    return await this.execute(selectedPool.virtualModelId, request, operation);
  }

  /**
   * 确定操作类型
   */
  private determineOperationType(request: any): OperationType {
    if (request.stream) {
      return 'streamChat';
    }
    if (request.type === 'health_check') {
      return 'healthCheck';
    }
    return 'chat';
  }

  /**
   * 确定请求优先级
   */
  private determinePriority(request: any): 'low' | 'medium' | 'high' | 'critical' {
    if (request.metadata?.priority) {
      return request.metadata.priority;
    }
    return 'medium';
  }

  /**
   * Add pipeline pool for virtual model
   * 为虚拟模型添加流水线池
   */
  addPipelinePool(virtualModelId: string, pool: PipelinePool): void {
    this.pipelinePools.set(virtualModelId, {
      virtualModelId,
      pool,
      config: pool.virtualModelId // Use virtualModelId as config for now
    });

    // Initialize virtual model metrics
    this.metrics.virtualModelMetrics.set(virtualModelId, {
      requests: 0,
      errors: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uptime: Date.now()
    });

    this.metrics.totalSchedulers++;
    this.metrics.activeSchedulers++;
  }

  /**
   * Remove pipeline pool for virtual model
   * 移除虚拟模型的流水线池
   */
  removePipelinePool(virtualModelId: string): boolean {
    const removed = this.pipelinePools.delete(virtualModelId);
    if (removed) {
      this.metrics.virtualModelMetrics.delete(virtualModelId);
      this.metrics.activeSchedulers--;
    }
    return removed;
  }

  /**
   * Execute request through appropriate pipeline pool
   * 通过适当的流水线池执行请求
   */
  async execute(
    virtualModelId: string,
    request: any,
    operation: OperationType,
    options?: SchedulerOptions
  ): Promise<any> {
    const startTime = Date.now();
    const poolData = this.pipelinePools.get(virtualModelId);

    if (!poolData) {
      throw new Error(`No pipeline pool found for virtual model: ${virtualModelId}`);
    }

    try {
      // Create request context if tracker is available
      let requestContext: IRequestContext | undefined;
      if (this.pipelineTracker) {
        requestContext = this.pipelineTracker.createRequestContext(
          virtualModelId,
          operation,
          {
            managerId: 'VirtualModelSchedulerManager',
            priority: options?.priority || 'medium',
            ...options?.metadata
          }
        );
      }

      // Execute request through pipeline pool's active pipeline
      if (!poolData.pool.activePipeline) {
        throw new Error(`No active pipeline available for virtual model: ${virtualModelId}`);
      }

      const result = await poolData.pool.activePipeline.execute(request, operation, {
        timeout: options?.timeout || 30000,
        requestContext,
        metadata: options?.metadata
      });

      // Update metrics
      this.updateMetrics(virtualModelId, Date.now() - startTime, true);

      return result;

    } catch (error: any) {
      // Update error metrics
      this.updateMetrics(virtualModelId, Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Execute streaming request through pipeline pool
   * 通过流水线池执行流式请求
   */
  async *executeStreaming(
    virtualModelId: string,
    request: any,
    operation: OperationType,
    options?: SchedulerOptions
  ): AsyncGenerator<any, void, unknown> {
    const poolData = this.pipelinePools.get(virtualModelId);

    if (!poolData) {
      throw new Error(`No pipeline pool found for virtual model: ${virtualModelId}`);
    }

    try {
      // Create request context if tracker is available
      let requestContext: IRequestContext | undefined;
      if (this.pipelineTracker) {
        requestContext = this.pipelineTracker.createRequestContext(
          virtualModelId,
          operation,
          {
            managerId: 'VirtualModelSchedulerManager',
            streaming: true,
            priority: options?.priority || 'medium',
            ...options?.metadata
          }
        );
      }

      // Execute streaming request through pipeline pool's active pipeline
      if (!poolData.pool.activePipeline) {
        throw new Error(`No active pipeline available for virtual model: ${virtualModelId}`);
      }

      const stream = poolData.pool.activePipeline.executeStreaming(request, operation, {
        timeout: options?.timeout || 30000,
        requestContext,
        metadata: options?.metadata
      });

      for await (const chunk of stream) {
        yield chunk;
      }

    } catch (error: any) {
      // Update error metrics
      this.updateMetrics(virtualModelId, 0, false);
      throw error;
    }
  }

  /**
   * Get pipeline pool for virtual model
   * 获取虚拟模型的流水线池
   */
  getPipelinePool(virtualModelId: string): PipelinePool | null {
    const poolData = this.pipelinePools.get(virtualModelId);
    return poolData ? poolData.pool : null;
  }

  /**
   * Get all pipeline pools
   * 获取所有流水线池
   */
  getAllPipelinePools(): PipelinePoolData[] {
    return Array.from(this.pipelinePools.values());
  }

  /**
   * Get manager metrics
   * 获取管理器指标
   */
  getMetrics(): ManagerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get virtual model metrics
   * 获取虚拟模型指标
   */
  getVirtualModelMetrics(virtualModelId: string): any {
    return this.metrics.virtualModelMetrics.get(virtualModelId);
  }

  /**
   * Health check operations
   * 健康检查操作
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheckInterval
    );
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check all pipeline pools
      for (const [virtualModelId, poolData] of this.pipelinePools) {
        try {
          // Perform health check directly on providers in the pipeline
          if (!poolData.pool.activePipeline) {
            this.logWarn('No active pipeline for health check on virtual model', { virtualModelId }, 'health-check');
            continue;
          }

          // Access the pipeline's targets and call healthCheck directly on each provider
          const pipeline = poolData.pool.activePipeline;
          const targets = this.getPipelineTargets(pipeline);

          if (targets.length === 0) {
            this.logWarn('No targets found for health check on virtual model', { virtualModelId }, 'health-check');
            continue;
          }

          // Perform health check on each provider
          for (const target of targets) {
            try {
              const healthResult = await target.provider.healthCheck();
              this.logInfo('Health check passed', { provider: target.provider.getProviderInfo().name, virtualModelId, status: healthResult.status }, 'health-check');
            } catch (error) {
              this.logWarn('Health check failed', { provider: target.provider.getProviderInfo().name, virtualModelId, error: error.message || error }, 'health-check');
            }
          }
        } catch (error) {
          this.logWarn('Health check failed for virtual model', { virtualModelId, error: error.message || error }, 'health-check');
        }
      }

      this.metrics.lastHealthCheck = Date.now();
    } catch (error) {
      this.logError('Health check failed', error, 'health-check');
    }
  }

  /**
   * Get targets from a pipeline instance
   * This is a workaround to access private targets for health checks
   */
  private getPipelineTargets(pipeline: any): any[] {
    try {
      // Try to access targets through various possible methods
      if (pipeline.targets && typeof pipeline.targets === 'object') {
        return Array.from(pipeline.targets.values());
      }
      if (pipeline.getTargets && typeof pipeline.getTargets === 'function') {
        return pipeline.getTargets();
      }
      // Fallback: return empty array
      return [];
    } catch (error) {
      this.logWarn('Could not access pipeline targets for health check', { error: error.message || error }, 'health-check');
      return [];
    }
  }

  /**
   * Update metrics
   * 更新指标
   */
  private updateMetrics(virtualModelId: string, responseTime: number, success: boolean): void {
    // Update overall metrics
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    this.metrics.overallErrorRate = this.metrics.failedRequests / this.metrics.totalRequests;

    // Update average response time
    const totalDuration = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.averageResponseTime = (totalDuration + responseTime) / this.metrics.totalRequests;

    // Update virtual model specific metrics
    const vmMetrics = this.metrics.virtualModelMetrics.get(virtualModelId);
    if (vmMetrics) {
      vmMetrics.requests++;
      if (!success) {
        vmMetrics.errors++;
      }
      vmMetrics.errorRate = vmMetrics.errors / vmMetrics.requests;

      const vmTotalDuration = vmMetrics.averageResponseTime * (vmMetrics.requests - 1);
      vmMetrics.averageResponseTime = (vmTotalDuration + responseTime) / vmMetrics.requests;
    }
  }

  /**
   * Get virtual model mappings for compatibility
   * 获取虚拟模型映射以保持兼容性
   */
  getVirtualModelMappings(): any {
    const mappings: any = {};

    for (const [virtualModelId, poolData] of this.pipelinePools) {
      mappings[virtualModelId] = {
        id: virtualModelId,
        name: poolData.config.name || virtualModelId,
        pipelineCount: poolData.pool.pipelines.size,
        status: poolData.pool.isActive ? 'active' : 'inactive',
        config: poolData.config
      };
    }

    return mappings;
  }

  /**
   * Destroy manager and cleanup resources
   * 销毁管理器并清理资源
   */
  destroy(): void {
    this.logInfo('Destroying VirtualModelSchedulerManager', {}, 'shutdown');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // 清理路由系统
    if (this.routingEngine) {
      this.routingEngine.destroy();
    }

    // 停止内部API服务器
    if (this.internalAPIServer) {
      // this.internalAPIServer.close();
      this.logInfo('Internal API server stopped', {}, 'shutdown');
    }

    // Destroy all pipelines in all pipeline pools
    for (const poolData of this.pipelinePools.values()) {
      for (const pipeline of poolData.pool.pipelines.values()) {
        pipeline.destroy();
      }
    }

    this.pipelinePools.clear();
    this.metrics.virtualModelMetrics.clear();
    this._isInitialized = false;

    this.logInfo('VirtualModelSchedulerManager destroyed', {}, 'shutdown');
  }
}