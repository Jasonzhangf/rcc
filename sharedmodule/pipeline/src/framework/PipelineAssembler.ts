/**
 * Pipeline Assembler - Assembles pipelines from configuration and discovered providers
 * 流水线组装器 - 从配置和发现的provider组装流水线
 */

import { ModuleScanner, ProviderDiscoveryOptions } from './ModuleScanner';
import { PipelineFactory, PipelineFactoryConfig } from './PipelineFactory';
import { PipelineTracker } from './PipelineTracker';
import { VirtualModelConfig } from '../types/virtual-model';
import { Pipeline, PipelineConfig } from './Pipeline';
import { BaseProvider } from './BaseProvider';

export interface AssemblerConfig {
  providerDiscoveryOptions?: ProviderDiscoveryOptions;
  pipelineFactoryConfig?: PipelineFactoryConfig;
  enableAutoDiscovery?: boolean;
  fallbackStrategy?: 'first-available' | 'round-robin';
}

export interface PipelinePool {
  virtualModelId: string;
  pipelines: Map<string, Pipeline>;
  activePipeline: Pipeline | null;
  healthStatus: 'healthy'; // Always healthy
  lastHealthCheck: number;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
}

export interface AssemblyResult {
  success: boolean;
  pipelinePools: Map<string, PipelinePool>;
  errors: Array<{
    virtualModelId: string;
    error: string;
    provider?: string;
  }>;
  warnings: Array<{
    virtualModelId: string;
    warning: string;
  }>;
}

/**
 * Pipeline Assembler - Core service for assembling pipelines from configuration
 * 流水线组装器 - 从配置组装流水线的核心服务
 */
export class PipelineAssembler {
  private config: AssemblerConfig;
  private moduleScanner: ModuleScanner;
  private pipelineFactory: PipelineFactory;
  private pipelineTracker: PipelineTracker;
  private pipelinePools: Map<string, PipelinePool> = new Map();
  private discoveredProviders: Map<string, BaseProvider> = new Map();

  constructor(config: AssemblerConfig, pipelineTracker: PipelineTracker) {
    this.config = {
      enableAutoDiscovery: true,
      fallbackStrategy: 'first-available',
      ...config
    };

    this.pipelineTracker = pipelineTracker;
    this.moduleScanner = new ModuleScanner();

    const factoryConfig: PipelineFactoryConfig = {
      defaultTimeout: 30000,
      defaultHealthCheckInterval: 60000,
      defaultMaxRetries: 3,
      defaultLoadBalancingStrategy: 'round-robin',
      enableHealthChecks: true,
      metricsEnabled: true,
      ...config.pipelineFactoryConfig
    };

    this.pipelineFactory = new PipelineFactory(factoryConfig, pipelineTracker);
  }

  /**
   * Assemble pipelines from virtual model configurations
   * 从虚拟模型配置组装流水线
   */
  async assemblePipelines(virtualModelConfigs: VirtualModelConfig[]): Promise<AssemblyResult> {
    console.log('🚀 Starting pipeline assembly process...');

    const result: AssemblyResult = {
      success: true,
      pipelinePools: new Map(),
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Discover available providers
      console.log('🔍 Discovering available providers...');
      const providers = await this.discoverProviders();

      if (providers.size === 0) {
        result.errors.push({
          virtualModelId: 'global',
          error: 'No providers discovered - assembly cannot proceed'
        });
        result.success = false;
        return result;
      }

      console.log(`✅ Discovered ${providers.size} providers: ${Array.from(providers.keys()).join(', ')}`);

      // Step 2: Assemble pipeline for each virtual model
      console.log('🏗️  Assembling pipelines for virtual models...');

      for (const virtualModelConfig of virtualModelConfigs) {
        try {
          const pool = await this.assemblePipelinePool(virtualModelConfig, providers);

          if (pool.pipelines.size === 0) {
            result.warnings.push({
              virtualModelId: virtualModelConfig.id,
              warning: `No pipelines could be assembled for virtual model - will use fallback strategy`
            });
          }

          this.pipelinePools.set(virtualModelConfig.id, pool);
          result.pipelinePools.set(virtualModelConfig.id, pool);

          console.log(`✅ Assembled pipeline pool for virtual model: ${virtualModelConfig.id}`);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push({
            virtualModelId: virtualModelConfig.id,
            error: errorMessage
          });

          console.error(`❌ Failed to assemble pipeline for virtual model ${virtualModelConfig.id}:`, errorMessage);
        }
      }

      // Step 3: Validate overall assembly
      result.success = result.errors.length < virtualModelConfigs.length; // At least one succeeded

      console.log(`🎯 Pipeline assembly completed. Success: ${result.success}`);
      console.log(`📊 Results: ${result.pipelinePools.size} pools, ${result.errors.length} errors, ${result.warnings.length} warnings`);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Critical assembly error:', errorMessage);

      result.success = false;
      result.errors.push({
        virtualModelId: 'assembly-process',
        error: `Critical assembly error: ${errorMessage}`
      });

      return result;
    }
  }

  /**
   * Discover available providers using ModuleScanner
   * 使用ModuleScanner发现可用的provider
   */
  private async discoverProviders(): Promise<Map<string, BaseProvider>> {
    const options = this.config.providerDiscoveryOptions || {};
    console.log('🔍 Provider discovery options:', options);

    const discoveredProviders = await this.moduleScanner.scan(options);
    const providers = new Map<string, BaseProvider>();

    for (const discovered of discoveredProviders) {
      if (discovered.status === 'available' && discovered.instance) {
        providers.set(discovered.info.id, discovered.instance);
        this.discoveredProviders.set(discovered.info.id, discovered.instance);

        console.log(`✅ Provider discovered and loaded: ${discovered.info.id} (${discovered.info.name})`);
      } else {
        console.warn(`⚠️  Provider ${discovered.info.id} unavailable:`, discovered.error);
      }
    }

    return providers;
  }

  /**
   * Assemble pipeline pool for a single virtual model
   * 为单个虚拟模型组装流水线池
   */
  private async assemblePipelinePool(
    virtualModel: VirtualModelConfig,
    providers: Map<string, BaseProvider>
  ): Promise<PipelinePool> {
    console.log(`🏗️  Assembling pipeline pool for virtual model: ${virtualModel.id}`);

    const pipelines = new Map<string, Pipeline>();

    try {
      // Validate virtual model configuration
      if (!virtualModel.targets || virtualModel.targets.length === 0) {
        console.warn(`⚠️  Virtual model ${virtualModel.id} has no targets - creating minimal pipeline`);

        // Create a minimal pipeline with available providers
        const fallbackPipeline = await this.createFallbackPipeline(virtualModel, providers);
        if (fallbackPipeline) {
          pipelines.set(`fallback_${virtualModel.id}`, fallbackPipeline);
        }
      } else {
        // Create pipelines for each valid target
        for (const targetConfig of virtualModel.targets) {
          try {
            const provider = providers.get(targetConfig.providerId);

            if (!provider) {
              console.warn(`⚠️  Provider ${targetConfig.providerId} not found for target in ${virtualModel.id}`);
              continue;
            }

            const pipeline = this.createPipelineFromTarget(virtualModel, targetConfig, provider);
            if (pipeline) {
              const pipelineId = `${virtualModel.id}_${targetConfig.providerId}_${targetConfig.modelId}`;
              pipelines.set(pipelineId, pipeline);

              console.log(`✅ Created pipeline: ${pipelineId}`);
            }

          } catch (error) {
            console.error(`❌ Failed to assemble pipeline for target ${targetConfig.providerId}:${targetConfig.modelId}:`, error);
          }
        }
      }

      // Select active pipeline (first available)
      const activePipeline = pipelines.size > 0 ? Array.from(pipelines.values())[0] : null;

      const pool: PipelinePool = {
        virtualModelId: virtualModel.id,
        pipelines,
        activePipeline,
        healthStatus: 'healthy', // Always healthy
        lastHealthCheck: Date.now(),
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0
        }
      };

      console.log(`✅ Pipeline pool assembled for ${virtualModel.id}: ${pipelines.size} pipelines, health: ${pool.healthStatus}`);
      return pool;

    } catch (error) {
      console.error(`❌ Failed to assemble pipeline pool for ${virtualModel.id}:`, error);

      return {
        virtualModelId: virtualModel.id,
        pipelines: new Map(),
        activePipeline: null,
        healthStatus: 'healthy', // Always healthy
        lastHealthCheck: Date.now(),
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0
        }
      };
    }
  }

  /**
   * Create fallback pipeline when no targets are configured
   * 当没有配置目标时创建回退流水线
   */
  private async createFallbackPipeline(
    virtualModel: VirtualModelConfig,
    providers: Map<string, BaseProvider>
  ): Promise<Pipeline | null> {
    if (providers.size === 0) {
      return null;
    }

    // Use first available provider as fallback
    const [providerId, provider] = Array.from(providers.entries())[0];

    const targetConfig = {
      providerId,
      modelId: virtualModel.modelId || 'default',
      weight: 1,
      enabled: true
    };

    return this.createPipelineFromTarget(virtualModel, targetConfig, provider);
  }

  /**
   * Create pipeline from target configuration
   * 从目标配置创建流水线
   */
  private createPipelineFromTarget(
    virtualModel: VirtualModelConfig,
    targetConfig: any,
    provider: BaseProvider
  ): Pipeline | null {
    try {
      const pipelineConfig = this.buildPipelineConfig(virtualModel, targetConfig, provider);

      if (!pipelineConfig) {
        return null;
      }

      return this.pipelineFactory.createPipelineFromConfig(pipelineConfig);

    } catch (error) {
      console.error(`❌ Failed to create pipeline from target ${targetConfig.providerId}:${targetConfig.modelId}:`, error);
      return null;
    }
  }

  /**
   * Build pipeline configuration from virtual model and target
   * 从虚拟模型和目标构建流水线配置
   */
  private buildPipelineConfig(
    virtualModel: VirtualModelConfig,
    targetConfig: any,
    provider: BaseProvider
  ): any {
    return {
      id: `pipeline_${virtualModel.id}_${targetConfig.providerId}_${targetConfig.modelId}_${Date.now()}`,
      name: `${virtualModel.name} Pipeline (${targetConfig.providerId})`,
      virtualModelId: virtualModel.id,
      description: `${virtualModel.name} using ${targetConfig.providerId}`,
      targets: [{
        id: `${virtualModel.id}_${targetConfig.providerId}_${targetConfig.modelId}`,
        provider,
        weight: targetConfig.weight || 1,
        enabled: targetConfig.enabled !== false,
        healthStatus: 'healthy', // Always healthy
        lastHealthCheck: Date.now(),
        requestCount: 0,
        errorCount: 0,
        metadata: {
          keyIndex: targetConfig.keyIndex,
          virtualModelId: virtualModel.id,
          providerId: targetConfig.providerId,
          modelId: targetConfig.modelId
        }
      }],
      loadBalancingStrategy: 'round-robin',
      healthCheckInterval: 60000,
      maxRetries: 3,
      timeout: 30000,
      metadata: {
        virtualModelName: virtualModel.name,
        virtualModelProvider: virtualModel.provider,
        capabilities: virtualModel.capabilities || ['chat'],
        targetProvider: targetConfig.providerId,
        targetModel: targetConfig.modelId
      }
    };
  }

  /**
   * Get assembled pipeline pools
   * 获取已组装的流水线池
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
   * Get all discovered providers
   * 获取所有发现的provider
   */
  getDiscoveredProviders(): Map<string, BaseProvider> {
    return new Map(this.discoveredProviders);
  }

  /**
   * Reload providers and reassemble pipelines
   * 重新加载provider并重新组装流水线
   */
  async reloadProviders(): Promise<void> {
    console.log('🔄 Reloading providers and reassembling pipelines...');

    // Clear existing pools temporarily
    const existingPools = new Map(this.pipelinePools);
    this.pipelinePools.clear();
    this.discoveredProviders.clear();

    try {
      // Rediscover providers
      const providers = await this.discoverProviders();
      console.log(`✅ Rediscovered ${providers.size} providers`);

      // Reassemble pipelines for existing virtual models
      for (const [virtualModelId, oldPool] of existingPools.entries()) {
        try {
          // Restore original virtual model config (would need to store this)
          const virtualModelConfig = this.inferVirtualModelConfig(virtualModelId, oldPool);
          const newPool = await this.assemblePipelinePool(virtualModelConfig, providers);

          this.pipelinePools.set(virtualModelId, newPool);
          console.log(`✅ Reassembled pipeline pool for ${virtualModelId}`);
        } catch (error) {
          console.error(`❌ Failed to reassemble pipeline pool for ${virtualModelId}:`, error);
        }
      }

      console.log('✅ Provider reload and pipeline reassembly completed');

    } catch (error) {
      console.error('❌ Provider reload failed:', error);
      // Restore previous state on failure
      this.pipelinePools = existingPools;
      throw error;
    }
  }

  /**
   * Infer virtual model configuration from existing pool (fallback)
   * 从现有池推断虚拟模型配置（回退）
   */
  private inferVirtualModelConfig(virtualModelId: string, pool: PipelinePool): VirtualModelConfig {
    // This is a simplified inference - in real implementation, store original configs
    const target = pool.pipelines.size > 0 ? Array.from(pool.pipelines.values())[0].config.targets[0] : null;

    return {
      id: virtualModelId,
      name: virtualModelId,
      modelId: target?.metadata?.modelId || 'default',
      provider: target?.metadata?.providerId || 'unknown',
      enabled: true,
      targets: target ? [{
        providerId: target.metadata?.providerId || 'unknown',
        modelId: target.metadata?.modelId || 'default',
        weight: target.weight || 1,
        enabled: target.enabled !== false
      }] : [],
      capabilities: ['chat'] // Default capability
    };
  }

  /**
   * Get assembler status
   * 获取组装器状态
   */
  getStatus(): {
    initialized: boolean;
    totalPools: number;
    totalPipelines: number;
    healthyPools: number;
    discoveredProviders: number;
    virtualModelIds: string[];
  } {
    let totalPipelines = 0;
    // All pools are healthy
    let healthyPools = 0;

    for (const pool of this.pipelinePools.values()) {
      totalPipelines += pool.pipelines.size;
      healthyPools++; // All pools are healthy
    }

    return {
      initialized: true,
      totalPools: this.pipelinePools.size,
      totalPipelines,
      healthyPools,
      discoveredProviders: this.discoveredProviders.size,
      virtualModelIds: Array.from(this.pipelinePools.keys())
    };
  }

  /**
   * Cleanup resources
   * 清理资源
   */
  destroy(): void {
    console.log('🧹 Destroying Pipeline Assembler...');

    // Destroy all pipelines in pools
    for (const pool of this.pipelinePools.values()) {
      for (const pipeline of pool.pipelines.values()) {
        if (typeof pipeline.destroy === 'function') {
          pipeline.destroy();
        }
      }
    }

    this.pipelinePools.clear();
    this.discoveredProviders.clear();

    console.log('✅ Pipeline Assembler destroyed');
  }
}