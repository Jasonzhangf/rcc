/**
 * Pipeline Assembler - Assembles pipelines from configuration and discovered providers
 * 流水线组装器 - 从配置和发现的provider组装流水线
 */

import { ModuleScanner, ProviderDiscoveryOptions } from './ModuleScanner';
import { PipelineTracker } from './PipelineTracker';
import { VirtualModelConfig } from '../types/virtual-model';
import { Pipeline, PipelineConfig } from './Pipeline';
import { BaseProvider } from './BaseProvider';
import { VirtualModelSchedulerManager, ManagerConfig } from './VirtualModelSchedulerManager';

// Type definitions for rcc-config-parser to resolve TypeScript errors
// Since the module is untyped, we'll define the interfaces we need
interface ConfigData {
  [key: string]: unknown;
}

interface PipelineTableEntry {
  id: string;
  name: string;
  layer: string;
  config: Record<string, unknown>;
  virtualModelId: string;
  enabled: boolean;
  modelId: string;
  providerId: string;
  weight?: number;
}

interface PipelineTable {
  entries: PipelineTableEntry[];
  metadata: {
    version: string;
    created: string;
  };
  getEntries(): PipelineTableEntry[];
  toJSON(): Record<string, unknown>;
}

// Import config-parser types with proper type assertion
// We'll use dynamic import to avoid TypeScript compilation issues
let ConfigLoader: any;
let ConfigParser: any;
let PipelineConfigGenerator: any;
let parseConfigFile: any;

try {
  // Try to import the module at runtime
  const configParserModule = require('rcc-config-parser');
  ConfigLoader = configParserModule.ConfigLoader;
  ConfigParser = configParserModule.ConfigParser;
  PipelineConfigGenerator = configParserModule.PipelineConfigGenerator;
  parseConfigFile = configParserModule.parseConfigFile;
} catch (error) {
  console.warn('⚠️  rcc-config-parser module not available, some configuration features may be disabled');
}

import os from 'os';
import path from 'path';
import fs from 'fs';
import { RoutingCapabilities } from '../routing/RoutingCapabilities';

export interface AssemblerConfig {
  providerDiscoveryOptions?: ProviderDiscoveryOptions;
  enableAutoDiscovery?: boolean;
  fallbackStrategy?: 'first-available' | 'round-robin';
  configFilePath?: string;
  enableConfigModuleIntegration?: boolean;
  pipelineTableOutputPath?: string;
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
  routingCapabilities?: RoutingCapabilities; // 新增路由能力描述
}

// 导出所有核心接口以支持外部类型安全

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
  private pipelineTracker: PipelineTracker;
  private pipelinePools: Map<string, PipelinePool> = new Map();
  private discoveredProviders: Map<string, BaseProvider> = new Map();
  private virtualModelScheduler?: VirtualModelSchedulerManager; // 虚拟模型调度器引用

  // Configuration module integration
  private configLoader?: any;
  private configParser?: any;
  private pipelineConfigGenerator?: any;
  private currentConfigData?: ConfigData;
  private currentPipelineTable?: PipelineTable;

  constructor(config: AssemblerConfig, pipelineTracker: PipelineTracker) {
    this.config = {
      enableAutoDiscovery: true,
      fallbackStrategy: 'first-available',
      enableConfigModuleIntegration: true,
      ...config
    };

    this.pipelineTracker = pipelineTracker;
    this.moduleScanner = new ModuleScanner();

    // Initialize configuration modules if enabled
    if (this.config.enableConfigModuleIntegration) {
      this.initializeConfigModules();
    }
  }

  /**
   * Initialize configuration modules
   * 初始化配置模块
   */
  private initializeConfigModules(): void {
    try {
      console.log('🔧 Initializing configuration modules...');

      // Create configuration module instances
      this.configLoader = new ConfigLoader({
        id: 'config-loader',
        type: 'config-loader',
        name: 'Config Loader Module',
        version: '1.0.0',
        description: 'RCC Configuration Loader Module'
      });

      this.configParser = new ConfigParser({
        id: 'config-parser',
        type: 'config-parser',
        name: 'Config Parser Module',
        version: '1.0.0',
        description: 'RCC Configuration Parser Module'
      });

      this.pipelineConfigGenerator = new PipelineConfigGenerator({
        id: 'pipeline-config-generator',
        type: 'pipeline-config-generator',
        name: 'Pipeline Config Generator Module',
        version: '1.0.0',
        description: 'RCC Pipeline Configuration Generator Module'
      });

      console.log('✅ Configuration modules initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize configuration modules:', error);
      // Don't throw - allow fallback to traditional assembly
    }
  }

  /**
   * Load configuration from file and generate pipeline table
   * 从文件加载配置并生成流水线表
   */
  private async loadConfigurationAndGeneratePipelineTable(): Promise<ConfigData | null> {
    if (!this.config.enableConfigModuleIntegration || !this.configLoader || !this.configParser || !this.pipelineConfigGenerator) {
      return null;
    }

    try {
      console.log('📖 Loading configuration and generating pipeline table...');

      // Find configuration file
      const configPath = this.config.configFilePath || this.getDefaultConfigPath();
      console.log('📁 Configuration file path:', configPath);

      // Initialize config modules
      await this.configLoader.initialize();
      await this.configParser.initialize();
      await this.pipelineConfigGenerator.initialize();

      // Load configuration
      const rawData = await this.configLoader!.loadFromFile(configPath);
      console.log('📋 Configuration file loaded successfully');

      // Parse configuration
      this.currentConfigData = await this.configParser!.parseConfig(rawData);
      console.log('🔍 Configuration parsed successfully');

      // Generate pipeline table
      this.currentPipelineTable = await this.pipelineConfigGenerator!.generatePipelineTable(this.currentConfigData);
      if (this.currentPipelineTable) {
        console.log(`🗂️  Pipeline table generated with ${this.currentPipelineTable.getEntries().length} entries`);
      } else {
        console.log('🗂️  Pipeline table generated but is undefined');
      }

      // Save pipeline table to file if output path specified
      if (this.config.pipelineTableOutputPath && this.currentPipelineTable) {
        await this.savePipelineTableToFile(this.currentPipelineTable, this.config.pipelineTableOutputPath);
      }

      return this.currentConfigData || null;
    } catch (error) {
      console.error('❌ Failed to load configuration and generate pipeline table:', error);
      return null;
    }
  }

  /**
   * Get default configuration file path
   * 获取默认配置文件路径
   */
  private getDefaultConfigPath(): string {
    // Try multiple possible locations in order of preference
    const possiblePaths = [
      path.join(os.homedir(), '.rcc', 'rcc-config.json'),
      path.join(process.cwd(), '.rcc', 'rcc-config.json'),
      path.join(process.cwd(), 'rcc-config.json')
    ];

    for (const configPath of possiblePaths) {
      try {
        if (fs.existsSync(configPath)) {
          return configPath;
        }
      } catch {
        // File doesn't exist or can't be accessed
      }
    }

    // Return default path
    return path.join(os.homedir(), '.rcc', 'rcc-config.json');
  }

  /**
   * Save pipeline table to file
   * 保存流水线表到文件
   */
  private async savePipelineTableToFile(pipelineTable: PipelineTable, outputPath: string): Promise<void> {
    try {
      const fs = await import('fs');
      const dir = path.dirname(outputPath);

      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const tableData = pipelineTable.toJSON();
      await fs.promises.writeFile(outputPath, JSON.stringify(tableData, null, 2));

      console.log(`💾 Pipeline table saved to: ${outputPath}`);
    } catch (error) {
      console.error('❌ Failed to save pipeline table:', error);
    }
  }

  /**
   * Convert pipeline table entries to VirtualModelConfig array
   * 将流水线表条目转换为VirtualModelConfig数组
   */
  private convertPipelineTableToVirtualModelConfigs(pipelineTable: PipelineTable): VirtualModelConfig[] {
    const entries = pipelineTable.getEntries();
    const virtualModelConfigs: Map<string, VirtualModelConfig> = new Map();

    for (const entry of entries) {
      const virtualModelId = entry.virtualModelId || `vm-${entry.id}`;
      if (!virtualModelConfigs.has(virtualModelId)) {
        virtualModelConfigs.set(virtualModelId, {
          id: virtualModelId,
          name: entry.name || virtualModelId,
          enabled: entry.enabled !== false,
          modelId: entry.modelId || 'default',
          provider: entry.providerId || 'unknown',
          targets: [],
          capabilities: ['chat']
        });
      }

      const vmConfig = virtualModelConfigs.get(virtualModelId)!;
      if (vmConfig.targets) {
        vmConfig.targets.push({
          providerId: entry.providerId || 'unknown',
          modelId: entry.modelId || 'default',
          weight: entry.weight || 1,
          enabled: entry.enabled !== false
        });
      }
    }

    return Array.from(virtualModelConfigs.values());
  }

  /**
   * Load configuration from pipeline table
   * 从流水线表加载配置
   */
  async loadFromPipelineTable(pipelineTable: PipelineTable): Promise<AssemblyResult> {
    console.log('🚀 Starting pipeline assembly from pipeline table...');

    try {
      // Convert pipeline table to virtual model configs
      const virtualModelConfigs = this.convertPipelineTableToVirtualModelConfigs(pipelineTable);
      console.log(`📋 Converted pipeline table to ${virtualModelConfigs.length} virtual model configs`);

      // Use existing assembly logic
      return await this.assemblePipelines(virtualModelConfigs);

    } catch (error) {
      console.error('❌ Failed to load from pipeline table:', error);

      return {
        success: false,
        pipelinePools: new Map(),
        errors: [{
          virtualModelId: 'pipeline-table',
          error: `Failed to load from pipeline table: ${error instanceof Error ? error.message : String(error)}`
        }],
        warnings: []
      };
    }
  }

  /**
   * Assemble pipelines from virtual model configurations
   * 从虚拟模型配置组装流水线
   */
  async assemblePipelines(virtualModelConfigs?: VirtualModelConfig[]): Promise<AssemblyResult> {
    console.log('🚀 Starting pipeline assembly process...');

    const result: AssemblyResult = {
      success: true,
      pipelinePools: new Map(),
      errors: [],
      warnings: []
    };

    // If config module integration is enabled and no explicit configs provided, load from config file
    if (this.config.enableConfigModuleIntegration && (!virtualModelConfigs || virtualModelConfigs.length === 0)) {
      console.log('📖 No explicit virtual model configs provided - loading from configuration file...');

      const configData = await this.loadConfigurationAndGeneratePipelineTable();
      if (configData && this.currentPipelineTable) {
        // Convert pipeline table to virtual model configs and proceed
        virtualModelConfigs = this.convertPipelineTableToVirtualModelConfigs(this.currentPipelineTable);
        console.log(`✅ Loaded ${virtualModelConfigs.length} virtual model configurations from pipeline table`);
      } else {
        console.warn('⚠️  Failed to load configuration from file - falling back to empty configs');
        virtualModelConfigs = [];
      }
    }

    // Ensure we have virtual model configs to work with
    if (!virtualModelConfigs || virtualModelConfigs.length === 0) {
      console.warn('⚠️  No virtual model configurations available - creating empty assembly');
      return {
        success: false,
        pipelinePools: new Map(),
        errors: [{
          virtualModelId: 'global',
          error: 'No virtual model configurations available for assembly'
        }],
        warnings: []
      };
    }

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

      // 如果有可用的scheduler并且组装成功，初始化scheduler
      if (result.success && this.virtualModelScheduler) {
        console.log('🔄 Initializing VirtualModelSchedulerManager with assembled pipeline pools...');
        try {
          this.virtualModelScheduler.initialize(result.pipelinePools);
          console.log('✅ VirtualModelSchedulerManager initialized successfully');
        } catch (error) {
          console.warn('⚠️ Failed to initialize VirtualModelSchedulerManager:', error);
        }
      }

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

      // 创建路由能力描述
      const routingCapabilities: RoutingCapabilities = this.createRoutingCapabilities(virtualModel, providers);

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
        },
        routingCapabilities
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
        },
        routingCapabilities: this.createDefaultRoutingCapabilities(virtualModel)
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
   * 创建路由能力描述
   */
  private createRoutingCapabilities(virtualModel: VirtualModelConfig, providers: Map<string, BaseProvider>): RoutingCapabilities {
    // 从虚拟模型配置和能力中推断路由能力
    const capabilities = virtualModel.capabilities || ['chat'];
    const supportedModels = virtualModel.targets?.map(target => target.modelId) || [virtualModel.modelId || 'default'];

    return {
      supportedModels,
      maxTokens: this.estimateMaxTokens(virtualModel),
      supportsStreaming: capabilities.includes('streaming') || capabilities.includes('chat'),
      supportsTools: capabilities.includes('tools') || capabilities.includes('function-calling'),
      supportsImages: capabilities.includes('vision') || capabilities.includes('images'),
      supportsFunctionCalling: capabilities.includes('function-calling'),
      supportsMultimodal: capabilities.includes('multimodal') || capabilities.includes('vision'),
      supportedModalities: this.determineSupportedModalities(capabilities),
      priority: this.determinePriority(virtualModel),
      availability: 0.9, // 默认高可用性
      loadWeight: virtualModel.targets?.reduce((sum, target) => sum + (target.weight || 1), 0) || 1,
      costScore: this.estimateCostScore(virtualModel),
      performanceScore: this.estimatePerformanceScore(virtualModel),
      routingTags: this.generateRoutingTags(virtualModel),
      extendedCapabilities: {
        supportsVision: capabilities.includes('vision'),
        supportsAudio: capabilities.includes('audio'),
        supportsCodeExecution: capabilities.includes('code-execution'),
        supportsWebSearch: capabilities.includes('web-search'),
        maxContextLength: this.estimateMaxTokens(virtualModel),
        temperatureRange: [0, 1],
        topPRange: [0, 1]
      }
    };
  }

  /**
   * 创建默认路由能力
   */
  private createDefaultRoutingCapabilities(virtualModel: VirtualModelConfig): RoutingCapabilities {
    return {
      supportedModels: [virtualModel.modelId || 'default'],
      maxTokens: 4000,
      supportsStreaming: true,
      supportsTools: true,
      supportsImages: true,
      supportsFunctionCalling: true,
      supportsMultimodal: true,
      supportedModalities: ['text'],
      priority: 50,
      availability: 0.5, // 较低的可用性，因为是错误情况
      loadWeight: 1.0,
      costScore: 0.5,
      performanceScore: 0.3,
      routingTags: ['fallback', 'error'],
      extendedCapabilities: {
        supportsVision: false,
        maxContextLength: 4000
      }
    };
  }

  /**
   * 估算最大token数
   */
  private estimateMaxTokens(virtualModel: VirtualModelConfig): number {
    // 根据模型类型估算最大token数
    const modelId = virtualModel.modelId?.toLowerCase() || '';

    if (modelId.includes('gpt-4')) {
      return modelId.includes('32k') ? 32768 : 8192;
    } else if (modelId.includes('gpt-3.5')) {
      return 4096;
    } else if (modelId.includes('claude')) {
      return modelId.includes('100k') ? 100000 : 100000;
    } else {
      return 4000; // 默认值
    }
  }

  /**
   * 确定支持的模态
   */
  private determineSupportedModalities(capabilities: string[]): string[] {
    const modalities = new Set<string>(['text']); // 默认支持文本

    for (const capability of capabilities) {
      switch (capability.toLowerCase()) {
        case 'vision':
        case 'images':
          modalities.add('vision');
          break;
        case 'audio':
          modalities.add('audio');
          break;
        case 'multimodal':
          modalities.add('vision');
          modalities.add('audio');
          break;
      }
    }

    return Array.from(modalities);
  }

  /**
   * 确定优先级
   */
  private determinePriority(virtualModel: VirtualModelConfig): number {
    // 根据模型类型确定优先级
    const modelId = virtualModel.modelId?.toLowerCase() || '';

    if (modelId.includes('gpt-4')) {
      return 80;
    } else if (modelId.includes('claude')) {
      return 75;
    } else if (modelId.includes('gpt-3.5')) {
      return 60;
    } else {
      return 50; // 默认优先级
    }
  }

  /**
   * 估算成本分数
   */
  private estimateCostScore(virtualModel: VirtualModelConfig): number {
    // 根据模型类型估算成本（0-1，分数越高成本越高）
    const modelId = virtualModel.modelId?.toLowerCase() || '';

    if (modelId.includes('gpt-4')) {
      return 0.8;
    } else if (modelId.includes('claude')) {
      return 0.7;
    } else if (modelId.includes('gpt-3.5')) {
      return 0.4;
    } else {
      return 0.5; // 默认成本
    }
  }

  /**
   * 估算性能分数
   */
  private estimatePerformanceScore(virtualModel: VirtualModelConfig): number {
    // 根据模型类型估算性能（0-1，分数越高性能越好）
    const modelId = virtualModel.modelId?.toLowerCase() || '';

    if (modelId.includes('gpt-4')) {
      return 0.9;
    } else if (modelId.includes('claude')) {
      return 0.8;
    } else if (modelId.includes('gpt-3.5')) {
      return 0.7;
    } else {
      return 0.6; // 默认性能
    }
  }

  /**
   * 生成路由标签
   */
  private generateRoutingTags(virtualModel: VirtualModelConfig): string[] {
    const tags: string[] = [];
    const modelId = virtualModel.modelId?.toLowerCase() || '';
    const capabilities = virtualModel.capabilities || [];

    // 添加模型相关标签
    if (modelId.includes('gpt-4')) {
      tags.push('gpt-4', 'high-performance');
    } else if (modelId.includes('claude')) {
      tags.push('claude', 'large-context');
    } else if (modelId.includes('gpt-3.5')) {
      tags.push('gpt-3.5', 'cost-effective');
    }

    // 添加能力相关标签
    for (const capability of capabilities) {
      tags.push(capability.toLowerCase());
    }

    // 添加通用标签
    tags.push('available');

    return tags;
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

      // 直接创建Pipeline实例
      return new Pipeline(pipelineConfig, this.pipelineTracker);

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
   * Get current configuration data
   * 获取当前配置数据
   */
  getCurrentConfigData(): ConfigData | undefined {
    return this.currentConfigData;
  }

  /**
   * Get current pipeline table
   * 获取当前流水线表
   */
  getCurrentPipelineTable(): PipelineTable | undefined {
    return this.currentPipelineTable;
  }

  /**
   * 设置虚拟模型调度器
   */
  setVirtualModelScheduler(scheduler: VirtualModelSchedulerManager): void {
    console.log('🔗 Setting VirtualModelSchedulerManager for PipelineAssembler');
    this.virtualModelScheduler = scheduler;
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
    routingEnabled: boolean;
    schedulerInitialized: boolean;
    configModuleIntegration: {
      enabled: boolean;
      configLoaded: boolean;
      pipelineTableGenerated: boolean;
      configFilePath?: string;
    };
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
      virtualModelIds: Array.from(this.pipelinePools.keys()),
      routingEnabled: !!this.virtualModelScheduler,
      schedulerInitialized: this.virtualModelScheduler?.isInitializedAccessor || false,
      configModuleIntegration: {
        enabled: this.config.enableConfigModuleIntegration || false,
        configLoaded: !!this.currentConfigData,
        pipelineTableGenerated: !!this.currentPipelineTable,
        configFilePath: this.config.configFilePath
      }
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