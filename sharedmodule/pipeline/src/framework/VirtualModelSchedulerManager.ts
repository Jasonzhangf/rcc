/**
 * Virtual Model Scheduler Manager - Manages all scheduler instances
 * 虚拟模型调度器管理器 - 管理所有调度器实例
 */

import { PipelineScheduler, SchedulerConfig } from './PipelineScheduler';
import { PipelineFactory, PipelineFactoryConfig, VirtualModelPipelineConfig } from './PipelineFactory';
import { PipelineTracker } from './PipelineTracker';
import { BaseProvider } from './BaseProvider';
import { VirtualModelConfig } from '../types/virtual-model';
import { IRequestContext } from '../interfaces/IRequestContext';
import { PipelinePool } from './PipelineAssembler';
import { Pipeline } from './Pipeline';
// Define operation type locally
type OperationType = 'chat' | 'streamChat' | 'healthCheck';

export interface PipelinePoolData {
  virtualModelId: string;
  pool: PipelinePool;
}

export interface ManagerConfig {
  maxSchedulers: number;
  defaultSchedulerConfig: SchedulerConfig;
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
    lastUsed: number;
    healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  }>;
  systemLoad: {
    cpuUsage?: number;
    memoryUsage?: number;
    activeConnections: number;
    queueLength: number;
  };
}

export interface ManagerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  overallHealth: number; // 0-100 score
  schedulerHealth: Map<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    health: number;
    details: any;
  }>;
  systemHealth: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
      schedulerAvailability: boolean;
      errorRates: boolean;
      responseTimes: boolean;
      systemResources: boolean;
    };
    details: any;
  };
}

export interface VirtualModelMapping {
  virtualModelId: string;
  schedulerId: string;
  config: VirtualModelConfig;
  providers: Map<string, BaseProvider>;
  createdAt: number;
  lastUsed: number;
  enabled: boolean;
}

export interface SchedulingOptions {
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  healthCheck?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Virtual Model Scheduler Manager - Central management for all virtual model schedulers
 * 虚拟模型调度器管理器 - 所有虚拟模型调度器的中央管理
 */
export class VirtualModelSchedulerManager {
  private config: ManagerConfig;
  private schedulers: Map<string, PipelineScheduler> = new Map();
  private pipelinePools: Map<string, PipelinePool> = new Map();
  private pipelineTracker: PipelineTracker;
  private virtualModelMappings: Map<string, VirtualModelMapping> = new Map();
  private metrics: ManagerMetrics;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsCleanupInterval?: NodeJS.Timeout;
  private scalingCooldowns: Map<string, number> = new Map();

  constructor(pipelinePools: Map<string, PipelinePool>, config: ManagerConfig, pipelineTracker: PipelineTracker);
  constructor(configOrPools: ManagerConfig | Map<string, PipelinePool>, trackerOrConfig: PipelineTracker | ManagerConfig, optionalTracker?: PipelineTracker) {
    // Determine which constructor signature is being used
    let pipelinePools: Map<string, PipelinePool>;
    let config: ManagerConfig;
    let tracker: PipelineTracker;

    if (optionalTracker) {
      // Signature: (pipelinePools: Map<string, PipelinePool>, config: ManagerConfig, pipelineTracker: PipelineTracker)
      pipelinePools = configOrPools as Map<string, PipelinePool>;
      config = trackerOrConfig as ManagerConfig;
      tracker = optionalTracker;
    } else {
      // Signature: (config: ManagerConfig, pipelineTracker: PipelineTracker) - legacy
      console.warn('⚠️  Using deprecated constructor. Consider migrating to pipeline pools constructor.');
      config = configOrPools as ManagerConfig;
      tracker = trackerOrConfig as PipelineTracker;
      pipelinePools = new Map<string, PipelinePool>();
    }

    this.config = config;
    this.pipelineTracker = tracker;
    this.pipelinePools = pipelinePools;

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
      virtualModelMetrics: new Map(),
      systemLoad: {
        activeConnections: 0,
        queueLength: 0
      }
    };

    // Initialize schedulers from pipeline pools
    this.initializeSchedulersFromPipelinePools();

    // Start metrics cleanup
    this.startMetricsCleanup();
  }

  /**
   * Initialize schedulers from pipeline pools
   * 从流水线池初始化调度器
   */
  private initializeSchedulersFromPipelinePools(): void {
    if (this.pipelinePools.size === 0) {
      console.warn('No pipeline pools provided to scheduler manager');
      return;
    }

    console.log(`Initializing schedulers for ${this.pipelinePools.size} pipeline pools...`);

    for (const [virtualModelId, pool] of this.pipelinePools.entries()) {
      try {
        this.createSchedulerFromPool(virtualModelId, pool);
      } catch (error) {
        console.error(`Failed to create scheduler for virtual model ${virtualModelId}:`, error);
      }
    }

    this.metrics.totalSchedulers = this.schedulers.size;
    this.metrics.activeSchedulers = this.schedulers.size; // Simplified: all schedulers are active

    console.log(`✅ Initialized ${this.schedulers.size} schedulers from ${this.pipelinePools.size} pipeline pools`);
  }

  /**
   * Create scheduler from pipeline pool
   * 从流水线池创建调度器
   */
  private createSchedulerFromPool(virtualModelId: string, pool: PipelinePool): void {
    const schedulerId = `scheduler_${virtualModelId}_${Date.now()}`;

    if (this.schedulers.size >= this.config.maxSchedulers) {
      throw new Error(`Maximum number of schedulers (${this.config.maxSchedulers}) reached`);
    }

    // Check if scheduler already exists for this virtual model
    const existingScheduler = Array.from(this.virtualModelMappings.values())
      .find(m => m.virtualModelId === virtualModelId);
    if (existingScheduler) {
      throw new Error(`Virtual model ${virtualModelId} already has a scheduler`);
    }

    // Create scheduler
    const scheduler = new PipelineScheduler(
      virtualModelId,
      this.config.defaultSchedulerConfig,
      this.pipelineTracker
    );

    // Add all pipelines from pool to scheduler
    for (const [pipelineId, pipeline] of pool.pipelines.entries()) {
      scheduler.addPipeline(pipeline);
    }

    // Register scheduler
    this.schedulers.set(schedulerId, scheduler);

    // Create virtual model mapping
    const mapping: VirtualModelMapping = {
      virtualModelId,
      schedulerId,
      config: {
        id: virtualModelId,
        name: pool.virtualModelId,
        modelId: pool.activePipeline?.getConfig().metadata?.targetModel || 'unknown',
        provider: pool.activePipeline?.getConfig().metadata?.targetProvider || 'unknown',
        enabled: true,
        targets: Array.from(pool.pipelines.values()).map(pipeline => ({
          providerId: pipeline.getConfig().metadata?.targetProvider || 'unknown',
          modelId: pipeline.getConfig().metadata?.targetModel || 'unknown',
          weight: 1,
          enabled: pipeline.isHealthy()
        })),
        capabilities: pool.activePipeline?.getConfig().metadata?.capabilities || ['chat']
      },
      providers: new Map(), // Will be populated later if needed
      createdAt: Date.now(),
      lastUsed: Date.now(),
      enabled: true
    };

    this.virtualModelMappings.set(virtualModelId, mapping);

    // Initialize virtual model metrics
    this.metrics.virtualModelMetrics.set(virtualModelId, {
      requests: 0,
      errors: 0,
      averageResponseTime: 0,
      lastUsed: Date.now(),
      healthStatus: 'healthy'
    });

    console.log(`✅ Created scheduler for virtual model ${virtualModelId} with ${pool.pipelines.size} pipelines`);
  }

  /**
   * Register virtual model with scheduler (legacy method - now delegates to pipeline pools)
   * 注册虚拟模型到调度器（传统方法 - 现在委托给流水线池）
   */
  async registerVirtualModel(
    virtualModelConfig: VirtualModelConfig,
    providers: Map<string, BaseProvider>,
    options?: SchedulingOptions
  ): Promise<string> {
    console.warn(`⚠️  registerVirtualModel is deprecated. Pipeline pools should be passed through constructor.`);

    // Check if we already have a pool for this virtual model
    if (this.virtualModelMappings.has(virtualModelConfig.id)) {
      throw new Error(`Virtual model ${virtualModelConfig.id} is already registered`);
    }

    // Try to create a pool dynamically (for backward compatibility)
    try {
      // Create a basic pipeline pool from the virtual model config
      const pool = await this.createPipelinePoolFromConfig(virtualModelConfig, providers);

      // Add to our pipeline pools
      this.pipelinePools.set(virtualModelConfig.id, pool);

      // Create scheduler from the new pool
      this.createSchedulerFromPool(virtualModelConfig.id, pool);

      return `scheduler_${virtualModelConfig.id}_${Date.now()}`;
    } catch (error) {
      console.error(`Failed to register virtual model ${virtualModelConfig.id}:`, error);
      throw error;
    }
  }

  /**
   * Create pipeline pool from virtual model config (for backward compatibility)
   * 从虚拟模型配置创建流水线池（用于向后兼容）
   */
  private async createPipelinePoolFromConfig(
    virtualModelConfig: VirtualModelConfig,
    providers: Map<string, BaseProvider>
  ): Promise<PipelinePool> {
    const pipelines = new Map<string, Pipeline>();

    // This is a simplified implementation - in production, you'd want to use PipelineAssembler
    console.warn(`Creating fallback pipeline pool for ${virtualModelConfig.id} - consider using PipelineAssembler for better results`);

    // Create basic pipelines for each target
    if (virtualModelConfig.targets && virtualModelConfig.targets.length > 0) {
      for (const targetConfig of virtualModelConfig.targets) {
        const provider = providers.get(targetConfig.providerId);
        if (provider) {
          // Create a simple pipeline (this is where you'd integrate with PipelineAssembler in production)
          // For now, we'll create a minimal representation
          console.log(`Would create pipeline for target: ${targetConfig.providerId}:${targetConfig.modelId}`);
        }
      }
    }

    return {
      virtualModelId: virtualModelConfig.id,
      pipelines,
      activePipeline: pipelines.size > 0 ? Array.from(pipelines.values())[0] : null,
      healthStatus: 'healthy', // PipelinePool healthStatus is always 'healthy'
      lastHealthCheck: Date.now(),
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0
      }
    };
  }

  /**
   * Unregister virtual model
   * 注销虚拟模型
   */
  async unregisterVirtualModel(virtualModelId: string): Promise<boolean> {
    const mapping = this.virtualModelMappings.get(virtualModelId);
    if (!mapping) {
      return false;
    }

    try {
      // Destroy scheduler
      const scheduler = this.schedulers.get(mapping.schedulerId);
      if (scheduler) {
        scheduler.destroy();
        this.schedulers.delete(mapping.schedulerId);
      }

      // Remove mapping
      this.virtualModelMappings.delete(virtualModelId);
      this.metrics.virtualModelMetrics.delete(virtualModelId);

      // Update metrics
      this.metrics.totalSchedulers = this.schedulers.size;
      this.metrics.activeSchedulers = this.schedulers.size;

      console.log(`Virtual model ${virtualModelId} unregistered successfully`);
      return true;

    } catch (error) {
      console.error(`Failed to unregister virtual model ${virtualModelId}:`, error);
      return false;
    }
  }

  /**
   * Execute request through virtual model scheduler
   * 通过虚拟模型调度器执行请求
   */
  async execute(
    virtualModelId: string,
    request: any,
    operation: OperationType,
    options?: SchedulingOptions
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Get scheduler for virtual model
      const scheduler = this.getSchedulerForVirtualModel(virtualModelId);
      if (!scheduler) {
        throw new Error(`No scheduler found for virtual model ${virtualModelId}`);
      }

      // Update usage metrics
      const mapping = this.virtualModelMappings.get(virtualModelId);
      if (mapping) {
        mapping.lastUsed = Date.now();
      }

      // Execute request
      const result = await scheduler.execute(request, operation, options);

      // Update success metrics
      this.metrics.successfulRequests++;
      this.updateVirtualModelMetrics(virtualModelId, true, Date.now() - startTime);
      this.updateOverallMetrics(true, Date.now() - startTime);

      return result;

    } catch (error: any) {
      // Update error metrics
      this.metrics.failedRequests++;
      this.updateVirtualModelMetrics(virtualModelId, false, Date.now() - startTime);
      this.updateOverallMetrics(false, Date.now() - startTime);

      throw error;
    } finally {
      this.metrics.totalRequests++;
    }
  }

  /**
   * Execute streaming request through virtual model scheduler
   * 通过虚拟模型调度器执行流式请求
   */
  async *executeStreaming(
    virtualModelId: string,
    request: any,
    operation: OperationType,
    options?: SchedulingOptions
  ): AsyncGenerator<any, void, unknown> {
    const startTime = Date.now();

    try {
      // Get scheduler for virtual model
      const scheduler = this.getSchedulerForVirtualModel(virtualModelId);
      if (!scheduler) {
        throw new Error(`No scheduler found for virtual model ${virtualModelId}`);
      }

      // Update usage metrics
      const mapping = this.virtualModelMappings.get(virtualModelId);
      if (mapping) {
        mapping.lastUsed = Date.now();
      }

      // Execute streaming request
      const stream = scheduler.executeStreaming(request, operation, options);

      for await (const chunk of stream) {
        yield chunk;
      }

      // Update success metrics
      this.metrics.successfulRequests++;
      this.updateVirtualModelMetrics(virtualModelId, true, Date.now() - startTime);
      this.updateOverallMetrics(true, Date.now() - startTime);

    } catch (error: any) {
      // Update error metrics
      this.metrics.failedRequests++;
      this.updateVirtualModelMetrics(virtualModelId, false, Date.now() - startTime);
      this.updateOverallMetrics(false, Date.now() - startTime);

      throw error;
    } finally {
      this.metrics.totalRequests++;
    }
  }

  /**
   * Get scheduler for virtual model
   * 获取虚拟模型的调度器
   */
  private getSchedulerForVirtualModel(virtualModelId: string): PipelineScheduler | null {
    const mapping = this.virtualModelMappings.get(virtualModelId);
    if (!mapping) {
      return null;
    }

    const scheduler = this.schedulers.get(mapping.schedulerId);
    if (!scheduler) {
      return null;
    }

    return scheduler;
  }

  /**
   * Update virtual model metrics
   * 更新虚拟模型指标
   */
  private updateVirtualModelMetrics(virtualModelId: string, success: boolean, duration: number): void {
    const vmMetrics = this.metrics.virtualModelMetrics.get(virtualModelId);
    if (!vmMetrics) {
      return;
    }

    vmMetrics.requests++;
    if (!success) {
      vmMetrics.errors++;
    }

    // Update average response time
    const totalDuration = vmMetrics.averageResponseTime * (vmMetrics.requests - 1);
    vmMetrics.averageResponseTime = (totalDuration + duration) / vmMetrics.requests;
    vmMetrics.lastUsed = Date.now();

    // Update health status
    const errorRate = vmMetrics.errors / vmMetrics.requests;
    // Health status is always healthy
  }

  /**
   * Update overall metrics
   * 更新总体指标
   */
  private updateOverallMetrics(success: boolean, duration: number): void {
    // Update average response time
    const totalDuration = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.averageResponseTime = (totalDuration + duration) / this.metrics.totalRequests;

    // Update error rate
    this.metrics.overallErrorRate = this.metrics.failedRequests / this.metrics.totalRequests;
  }

  /**
   * Metrics cleanup
   * 指标清理
   */
  private startMetricsCleanup(): void {
    this.metricsCleanupInterval = setInterval(
      () => this.cleanupOldMetrics(),
      3600000 // Clean up every hour
    );
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.config.metricsRetentionPeriod;

    // Clean up old virtual model metrics
    for (const [vmId, vmMetrics] of this.metrics.virtualModelMetrics.entries()) {
      if (vmMetrics.lastUsed < cutoffTime) {
        this.metrics.virtualModelMetrics.delete(vmId);
      }
    }
  }

  /**
   * Public API methods
   * 公共API方法
   */
  getManagerMetrics(): ManagerMetrics {
    return {
      ...this.metrics,
      virtualModelMetrics: new Map(this.metrics.virtualModelMetrics)
    };
  }

  getManagerHealth(): ManagerHealth {
    const schedulerHealth = new Map();
    let totalHealthScore = 0;
    let healthySchedulers = 0;

    for (const [schedulerId, scheduler] of this.schedulers.entries()) {
      const health = scheduler.getHealth();
      schedulerHealth.set(schedulerId, {
        status: health.status,
        health: health.status === 'healthy' ? 100 : (health.status === 'degraded' ? 50 : 0),
        details: health.details
      });

      if (health.status === 'healthy') {
        healthySchedulers++;
        totalHealthScore += 100;
      } else if (health.status === 'degraded') {
        totalHealthScore += 50;
      }
    }

    const overallHealth = this.schedulers.size > 0 ? totalHealthScore / this.schedulers.size : 0;

    return {
      status: overallHealth >= 80 ? 'healthy' : (overallHealth >= 50 ? 'degraded' : 'unhealthy'),
      overallHealth,
      schedulerHealth,
      systemHealth: {
        status: this.metrics.overallErrorRate < 0.05 ? 'healthy' :
                (this.metrics.overallErrorRate < 0.15 ? 'degraded' : 'unhealthy'),
        checks: {
          schedulerAvailability: healthySchedulers > 0,
          errorRates: this.metrics.overallErrorRate < 0.1,
          responseTimes: this.metrics.averageResponseTime < 10000,
          systemResources: this.metrics.systemLoad.activeConnections < 1000
        },
        details: {
          errorRate: this.metrics.overallErrorRate,
          averageResponseTime: this.metrics.averageResponseTime,
          activeConnections: this.metrics.systemLoad.activeConnections,
          healthySchedulers
        }
      }
    };
  }

  getVirtualModelMappings(): VirtualModelMapping[] {
    return Array.from(this.virtualModelMappings.values());
  }

  getScheduler(schedulerId: string): PipelineScheduler | undefined {
    return this.schedulers.get(schedulerId);
  }

  getVirtualModelScheduler(virtualModelId: string): PipelineScheduler | null {
    return this.getSchedulerForVirtualModel(virtualModelId);
  }

  enableVirtualModel(virtualModelId: string): boolean {
    const mapping = this.virtualModelMappings.get(virtualModelId);
    if (mapping) {
      // NOTE: Model disabling functionality removed as per user requirements
      // All models are always enabled
      return true;
    }
    return false;
  }

  /**
   * Update pipeline pools with fresh pools
   * 使用新的流水线池更新调度器
   */
  updatePipelinePools(pipelinePools: Map<string, PipelinePool>): void {
    console.log(`🔄 Updating pipeline pools: ${pipelinePools.size} pools to process`);

    // Clear existing schedulers that are no longer needed
    const newVirtualModelIds = new Set(pipelinePools.keys());
    const oldVirtualModelIds = new Set(this.pipelinePools.keys());

    // Find schedulers to remove
    const toRemove = Array.from(oldVirtualModelIds).filter(id => !newVirtualModelIds.has(id));

    // Find schedulers to add or update
    const toAddOrUpdate = Array.from(newVirtualModelIds);

    // Remove old schedulers
    for (const virtualModelId of toRemove) {
      const mapping = this.virtualModelMappings.get(virtualModelId);
      if (mapping) {
        const scheduler = this.schedulers.get(mapping.schedulerId);
        if (scheduler) {
          scheduler.destroy();
          this.schedulers.delete(mapping.schedulerId);
        }
        this.virtualModelMappings.delete(virtualModelId);
        this.metrics.virtualModelMetrics.delete(virtualModelId);
      }
    }

    // Add or update schedulers
    for (const virtualModelId of toAddOrUpdate) {
      const newPool = pipelinePools.get(virtualModelId)!;

      // Check if we need to update an existing scheduler
      const existingPool = this.pipelinePools.get(virtualModelId);
      if (existingPool) {
        // Update existing scheduler
        this.updateSchedulerFromPool(virtualModelId, newPool);
      } else {
        // Create new scheduler
        this.createSchedulerFromPool(virtualModelId, newPool);
      }
    }

    // Update pipeline pools reference
    this.pipelinePools = new Map(pipelinePools);

    // Update metrics
    this.metrics.totalSchedulers = this.schedulers.size;
    this.metrics.activeSchedulers = this.schedulers.size; // Simplified: all schedulers are active

    console.log(`✅ Updated pipeline pools: ${this.schedulers.size} active schedulers`);
  }

  /**
   * Update scheduler from pipeline pool
   * 从流水线池更新调度器
   */
  private updateSchedulerFromPool(virtualModelId: string, pool: PipelinePool): void {
    const mapping = this.virtualModelMappings.get(virtualModelId);
    if (!mapping) {
      console.warn(`No mapping found for virtual model ${virtualModelId} during update`);
      return;
    }

    const scheduler = this.schedulers.get(mapping.schedulerId);
    if (!scheduler) {
      console.warn(`No scheduler found for virtual model ${virtualModelId} during update`);
      return;
    }

    // Remove old pipelines
    const currentPipelines = scheduler.getPipelines();
    for (const pipeline of currentPipelines) {
      scheduler.removePipeline(pipeline.getConfig().id);
    }

    // Add new pipelines
    for (const [pipelineId, pipeline] of pool.pipelines.entries()) {
      scheduler.addPipeline(pipeline);
    }

    // NOTE: Model disabling functionality removed as per user requirements
    // All models are always enabled

    // Update metrics
    const vmMetrics = this.metrics.virtualModelMetrics.get(virtualModelId);
    if (vmMetrics) {
      vmMetrics.healthStatus = 'healthy';
    }

    console.log(`✅ Updated scheduler for virtual model ${virtualModelId} with ${pool.pipelines.size} pipelines`);
  }

  /**
   * Get pipeline pools
   * 获取流水线池
   */
  getPipelinePools(): Map<string, PipelinePool> {
    return new Map(this.pipelinePools);
  }

  /**
   * Get pipeline pool for specific virtual model
   * 获取特定虚拟模型的流水线池
   */
  getPipelinePool(virtualModelId: string): PipelinePool | null {
    return this.pipelinePools.get(virtualModelId) || null;
  }

  /**
   * Destroy manager and cleanup resources
   * 销毁管理器并清理资源
   */
  destroy(): void {
    // Clear intervals
    if (this.metricsCleanupInterval) {
      clearInterval(this.metricsCleanupInterval);
    }

    // Destroy all schedulers
    for (const scheduler of this.schedulers.values()) {
      scheduler.destroy();
    }

    // Clear collections
    this.schedulers.clear();
    this.virtualModelMappings.clear();
    this.metrics.virtualModelMetrics.clear();
    this.scalingCooldowns.clear();
  }
}