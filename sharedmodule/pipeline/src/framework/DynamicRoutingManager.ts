/**
 * Dynamic Routing Manager - Manages all pipeline pools directly with intelligent routing
 * 动态路由管理器 - 直接管理所有流水线池，具有智能路由功能
 */

import { PipelineTracker } from './PipelineTracker';
import { BaseProvider } from './BaseProvider';
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
  routingId: string;
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
  routingMetrics: Map<string, {
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
 * Dynamic Routing Manager - Direct pipeline pool management with intelligent routing
 * 动态路由管理器 - 直接流水线池管理，具有智能路由功能
 */
export class DynamicRoutingManager extends UnifiedPipelineBaseModule {
  public config: ManagerConfig;
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
      id: 'dynamic-routing-manager',
      name: 'Dynamic Routing Manager',
      version: '1.0.0',
      description: 'Manages all pipeline pools directly with intelligent routing capabilities'
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
      routingMetrics: new Map()
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
      this.logError('Failed to initialize routing system', error as unknown as Record<string, unknown>, 'routing-initialization');
      throw new Error(`Routing system initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 初始化流水线池 - 接收PipelineAssembler传递的pools并注册到路由系统
   */
  async initialize(pipelinePools?: Map<string, PipelinePool>): Promise<void> {
    this.logInfo('Initializing DynamicRoutingManager with pipeline pools', { poolCount: pipelinePools?.size || 0 }, 'initialization');

    try {
      // 添加所有流水线池
      if (pipelinePools) {
        for (const [routingId, pool] of pipelinePools) {
        this.addPipelinePool(routingId, pool);
        }
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
      this.logInfo('DynamicRoutingManager initialized successfully', {
        poolCount: pipelinePools?.size || 0,
        routingEnabled: this.config.enableRouting,
        internalAPIEnabled: this.config.enableInternalAPI
      }, 'initialization');

    } catch (error) {
      this.logError('Failed to initialize DynamicRoutingManager', error as unknown as Record<string, unknown>, 'initialization');
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

    for (const [routingId, pool] of pipelinePools) {
      if (pool.routingCapabilities) {
        this.routingEngine.registerPipelinePool(routingId, pool.routingCapabilities);
        this.logInfo('Registered pipeline pool with routing capabilities', { routingId }, 'routing-registration');
      } else {
        this.logWarn('Pipeline pool has no routing capabilities, using defaults', { routingId }, 'routing-registration');

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

        this.routingEngine.registerPipelinePool(routingId, defaultCapabilities);
        this.logInfo('Registered pipeline pool with default capabilities', { routingId }, 'routing-registration');
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
      this.logError('Failed to start internal API server', error as unknown as Record<string, unknown>, 'api-server');
      throw new Error(`Internal API server startup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理路由请求 - 主要的路由入口点
   */
  async handleRequest(request: any, context?: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('DynamicRoutingManager not initialized');
    }

    this.logInfo('Processing routing request', { routingId: request?.model }, 'request-processing');

    try {
      // 如果启用了路由系统，使用智能路由
      if (this.config.enableRouting && this.requestAnalyzer && this.routingEngine) {
        return await this.routeWithSmartRouting(request, context);
      } else {
        // 回退到简单的轮询或固定路由
        return await this.routeWithFallback(request);
      }

    } catch (error) {
      this.logError('Request handling failed', error as unknown as Record<string, unknown>, 'request-processing');
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

    this.logInfo('Routing decision made', { targetRoutingId: routingDecision.targetRoutingId, score: routingDecision.matchResult.matchScore }, 'request-processing');

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
    const targetPool = this.pipelinePools.get(decision.targetRoutingId);

    if (!targetPool) {
      throw new Error(`Target pipeline pool not found: ${decision.targetRoutingId}`);
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

    return await this.execute(decision.targetRoutingId, request, operation, options);
  }

  /**
   * Determine which routing classification should handle the request
   * 根据请求确定应该使用哪个路由分类
   */
  private determineRoutingForRequest(request: any): string | null {
    // Simple routing strategy: use the first available routing classification
    // This could be enhanced with more sophisticated logic based on:
    // - Request content analysis
    // - User preferences
    // - Load balancing
    // - Capability matching

    const availableRoutingClassifications = Array.from(this.pipelinePools.keys());
    if (availableRoutingClassifications.length === 0) {
      return null;
    }

    // For now, prefer 'default' if available, otherwise use the first one
    if (availableRoutingClassifications.includes('default')) {
      return 'default';
    }

    return availableRoutingClassifications[0];
  }

  /**
   * 使用回退路由处理请求
   */
  private async routeWithFallback(request: any): Promise<any> {
    this.logInfo('Using pipeline table based routing', { routingId: request?.model }, 'request-processing');

    // Routing classification is based on configuration, not request.model
    // The request.model should be preserved and passed through unchanged
    // We need to determine which routing classification should handle this request

    // For now, use a simple routing strategy - this could be enhanced with
    // more sophisticated routing logic based on request content or other criteria
    let requestedRoutingId = this.determineRoutingForRequest(request);

    if (!requestedRoutingId) {
      throw new Error('No routing classification available to handle this request');
    }

    // Find the pipeline pool for the requested routing classification
    const targetPool = this.pipelinePools.get(requestedRoutingId);
    if (!targetPool) {
      throw new Error(`No pipeline pool found for routing classification: ${requestedRoutingId}`);
    }

    const operation: OperationType = this.determineOperationType(request);
    this.logInfo('Routing request to routing classification pipeline pool', {
      routingId: requestedRoutingId,
      operation,
      pipelineCount: targetPool.pool.pipelines.size
    }, 'request-processing');

    return await this.execute(requestedRoutingId, request, operation);
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
   * Add pipeline pool for routing classification
   * 为路由分类添加流水线池
   */
  addPipelinePool(routingId: string, pool: PipelinePool): void {
    this.pipelinePools.set(routingId, {
      routingId,
      pool,
      config: pool.routingId || routingId // Use routingId as config for now
    });

    // Initialize routing metrics
    this.metrics.routingMetrics.set(routingId, {
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
   * Remove pipeline pool for routing classification
   * 移除路由分类的流水线池
   */
  removePipelinePool(routingId: string): boolean {
    const removed = this.pipelinePools.delete(routingId);
    if (removed) {
      this.metrics.routingMetrics.delete(routingId);
      this.metrics.activeSchedulers--;
    }
    return removed;
  }

  /**
   * Execute request through appropriate pipeline pool
   * 通过适当的流水线池执行请求
   */
  async execute(
    routingId: string,
    request: any,
    operation: OperationType,
    options?: SchedulerOptions
  ): Promise<any> {
    const startTime = Date.now();
    const poolData = this.pipelinePools.get(routingId);

    if (!poolData) {
      throw new Error(`No pipeline pool found for routing classification: ${routingId}`);
    }

    try {
      // Create request context if tracker is available
      let requestContext: IRequestContext | undefined;
      if (this.pipelineTracker) {
        requestContext = this.pipelineTracker.createRequestContext(
          routingId,
          operation,
          {
            managerId: 'DynamicRoutingManager',
            priority: options?.priority || 'medium',
            ...options?.metadata
          }
        );
      }

      // Execute request through pipeline pool's active pipeline
      if (!poolData.pool.activePipeline) {
        throw new Error(`No active pipeline available for routing classification: ${routingId}`);
      }

      const result = await poolData.pool.activePipeline.execute(request, operation, {
        timeout: options?.timeout || 30000,
        requestContext,
        metadata: options?.metadata
      });

      // Update metrics
      this.updateMetrics(routingId, Date.now() - startTime, true);

      return result;

    } catch (error: any) {
      // Update error metrics
      this.updateMetrics(routingId, Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Execute streaming request through pipeline pool
   * 通过流水线池执行流式请求
   */
  async *executeStreaming(
    routingId: string,
    request: any,
    operation: OperationType,
    options?: SchedulerOptions
  ): AsyncGenerator<any, void, unknown> {
    const poolData = this.pipelinePools.get(routingId);

    if (!poolData) {
      throw new Error(`No pipeline pool found for routing classification: ${routingId}`);
    }

    try {
      // Create request context if tracker is available
      let requestContext: IRequestContext | undefined;
      if (this.pipelineTracker) {
        requestContext = this.pipelineTracker.createRequestContext(
          routingId,
          operation,
          {
            managerId: 'DynamicRoutingManager',
            streaming: true,
            priority: options?.priority || 'medium',
            ...options?.metadata
          }
        );
      }

      // Execute streaming request through pipeline pool's active pipeline
      if (!poolData.pool.activePipeline) {
        throw new Error(`No active pipeline available for routing classification: ${routingId}`);
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
      this.updateMetrics(routingId, 0, false);
      throw error;
    }
  }

  /**
   * Get pipeline pool for routing classification
   * 获取路由分类的流水线池
   */
  getPipelinePool(routingId: string): PipelinePool | null {
    const poolData = this.pipelinePools.get(routingId);
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
   * Get routing classification metrics
   * 获取路由分类指标
   */
  getRoutingMetrics(routingId: string): any {
    return this.metrics.routingMetrics.get(routingId);
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
      for (const [routingId, poolData] of this.pipelinePools) {
        try {
          // Perform health check directly on providers in the pipeline
          if (!poolData.pool.activePipeline) {
            this.logWarn('No active pipeline for health check on routing classification', { routingId }, 'health-check');
            continue;
          }

          // Access the pipeline's targets and call healthCheck directly on each provider
          const pipeline = poolData.pool.activePipeline;
          const targets = this.getPipelineTargets(pipeline);

          if (targets.length === 0) {
            this.logWarn('No targets found for health check on routing classification', { routingId }, 'health-check');
            continue;
          }

          // Perform health check on each provider
          for (const target of targets) {
            try {
              const healthResult = await target.provider.healthCheck();
              this.logInfo('Health check passed', { provider: target.provider.getProviderInfo().name, routingId, status: healthResult.status }, 'health-check');
            } catch (error) {
              this.logWarn('Health check failed', {
                provider: target.provider.getProviderInfo().name,
                routingId,
                error: error instanceof Error ? error.message : String(error)
              }, 'health-check');
            }
          }
        } catch (error) {
          this.logWarn('Health check failed for routing classification', {
            routingId,
            error: error instanceof Error ? error.message : String(error)
          }, 'health-check');
        }
      }

      this.metrics.lastHealthCheck = Date.now();
    } catch (error) {
      this.logError('Health check failed', error as unknown as Record<string, unknown>, 'health-check');
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
      this.logWarn('Could not access pipeline targets for health check', {
        error: error instanceof Error ? error.message : String(error)
      }, 'health-check');
      return [];
    }
  }

  /**
   * Update metrics
   * 更新指标
   */
  private updateMetrics(routingId: string, responseTime: number, success: boolean): void {
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

    // Update routing classification specific metrics
    const routingMetrics = this.metrics.routingMetrics.get(routingId);
    if (routingMetrics) {
      routingMetrics.requests++;
      if (!success) {
        routingMetrics.errors++;
      }
      routingMetrics.errorRate = routingMetrics.errors / routingMetrics.requests;

      const routingTotalDuration = routingMetrics.averageResponseTime * (routingMetrics.requests - 1);
      routingMetrics.averageResponseTime = (routingTotalDuration + responseTime) / routingMetrics.requests;
    }
  }

  /**
   * Get routing classification mappings for compatibility
   * 获取路由分类映射以保持兼容性
   */
  getRoutingMappings(): any {
    const mappings: any = {};

    for (const [routingId, poolData] of this.pipelinePools) {
      mappings[routingId] = {
        id: routingId,
        name: poolData.config.name || routingId,
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
  async destroy(): Promise<void> {
    this.logInfo('Destroying DynamicRoutingManager', {}, 'shutdown');

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
    this.metrics.routingMetrics.clear();
    this._isInitialized = false;

    this.logInfo('DynamicRoutingManager destroyed', {}, 'shutdown');
  }

  /**
   * Process a request (required abstract method implementation)
   * 处理请求（必需的抽象方法实现）
   */
  public async process(request: any): Promise<any> {
    throw new Error('DynamicRoutingManager does not support direct request processing');
  }

  /**
   * Process a response (required abstract method implementation)
   * 处理响应（必需的抽象方法实现）
   */
  public async processResponse(response: any): Promise<any> {
    return response;
  }
}