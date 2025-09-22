/**
 * Pipeline Assembler - Assembles pipelines from configuration and discovered providers
 * 流水线组装器 - 从配置和发现的provider组装流水线
 */

import { ModuleScanner, ProviderDiscoveryOptions } from './ModuleScanner';
import { PipelineTracker } from './PipelineTracker';
import { DynamicRoutingConfig } from '../types/dynamic-routing';
import { Pipeline, PipelineConfig } from './Pipeline';
import { BaseProvider } from './BaseProvider';
import { DynamicRoutingManager, ManagerConfig } from './DynamicRoutingManager';
import QwenProvider from '../providers/qwen';
import IFlowProvider from '../providers/iflow';
import { EnhancedPipelineAssembler } from '../core/EnhancedPipelineAssembler';
import { RoutingOptimizationConfig, DebugConfig } from '../interfaces/ModularInterfaces';
import { UnifiedPipelineBaseModule, PipelineModuleConfig } from '../modules/PipelineBaseModule';
// Import types from our interfaces module
import {
  PipelineWrapper,
  ModuleConfig,
  RoutingConfig
} from '../interfaces/ModularInterfaces';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { RoutingCapabilities } from '../routing/RoutingCapabilities';

// Define types for config-parser integration
interface ConfigData {
  [key: string]: any;
}

interface PipelineTable {
  getEntries(): PipelineTableEntry[];
  getEntriesByDynamicRouting(routingId: string): PipelineTableEntry[];
  toJSON(): any;
}

interface PipelineTableEntry {
  /** 虚拟模型ID */
  routingId: string;
  /** 目标供应商ID */
  providerId: string;
  /** 目标模型ID */
  modelId: string;
  /** API密钥索引 */
  keyIndex: number;
  /** 优先级 */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
  /** 权重 */
  weight?: number;
  /** 负载均衡策略 */
  strategy?: 'round-robin' | 'weighted' | 'random' | 'least-connections';
}

// Import config-parser types with proper type assertion
// We'll use dynamic import to avoid TypeScript compilation issues
// Local module loading only - disable NPM module loading
let ConfigLoader: any;
let ConfigParser: any;
let PipelineConfigGenerator: any;
let parseConfigFile: any;

// Skip NPM module loading - use only local modules
console.log('ℹ️  Using local module loading only, skipping NPM rcc-config-parser');

// Provide local-only implementations
ConfigLoader = class {
  constructor(config: any) {}
  async initialize() {}
  async loadFromFile(path: string) {
    throw new Error('ConfigLoader not available in local-only mode');
  }
};

ConfigParser = class {
  constructor(config: any) {}
  async initialize() {}
  async parseConfig(data: any) {
    throw new Error('ConfigParser not available in local-only mode');
  }
};

  PipelineConfigGenerator = class {
    constructor(config: any) {}
    async initialize() {}
    async generatePipelineTable(data: any) {
      throw new Error('PipelineConfigGenerator not available');
    }

    parseConfigFile = (path: string) => {
      throw new Error('parseConfigFile not available');
    };
  };

export interface AssemblerConfig {
  providerDiscoveryOptions?: ProviderDiscoveryOptions;
  enableAutoDiscovery?: boolean;
  fallbackStrategy?: 'first-available' | 'round-robin';
  configFilePath?: string;
  enableConfigModuleIntegration?: boolean;
  pipelineTableOutputPath?: string;
  // 新增：PipelineWrapper支持
  pipelineWrapper?: PipelineWrapper;
  enableModularPipeline?: boolean;
  // Debug configuration
  enableTwoPhaseDebug?: boolean;
  debugBaseDirectory?: string;
  enableIOTracking?: boolean;
}

export interface PipelinePool {
  routingId: string;
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
  isActive: boolean; // Add missing isActive property
}

// 导出所有核心接口以支持外部类型安全

export interface AssemblyResult {
  success: boolean;
  pipelinePools: Map<string, PipelinePool>;
  errors: Array<{
    routingId: string;
    error: string;
    provider?: string;
  }>;
  warnings: Array<{
    routingId: string;
    warning: string;
  }>;
}

/**
 * Pipeline Assembler - Core service for assembling pipelines from configuration
 * 流水线组装器 - 从配置组装流水线的核心服务
 */
export class PipelineAssembler extends UnifiedPipelineBaseModule {
  public config: AssemblerConfig;
  private moduleScanner: ModuleScanner;
  private pipelineTracker: PipelineTracker;
  private pipelinePools: Map<string, PipelinePool> = new Map();
  private discoveredProviders: Map<string, BaseProvider> = new Map();
  private dynamicRoutingManager?: DynamicRoutingManager; // 动态路由管理器引用

  // Configuration module integration
  private configLoader?: any;
  private configParser?: any;
  private pipelineConfigGenerator?: any;
  private currentConfigData?: ConfigData;
  private currentPipelineTable?: PipelineTable;

  // Modular pipeline support
  private pipelineWrapper?: PipelineWrapper;
  private modularExecutor?: any; // IModularPipelineExecutor

  constructor(config: AssemblerConfig, pipelineTracker: PipelineTracker) {
    super({
      id: 'pipeline-assembler',
      name: 'Pipeline Assembler',
      version: '1.0.0',
      description: 'Assembles pipelines from configuration and discovered providers'
    } as PipelineModuleConfig);

    this.config = {
      enableAutoDiscovery: true,
      fallbackStrategy: 'first-available',
      enableConfigModuleIntegration: true, // Enable to load provider configurations
      enableModularPipeline: false,
      ...config
    };

    this.pipelineTracker = pipelineTracker;
    this.moduleScanner = new ModuleScanner();

    // Initialize pipeline wrapper if provided
    if (this.config.pipelineWrapper) {
      this.pipelineWrapper = this.config.pipelineWrapper;
      this.logInfo('PipelineWrapper provided for modular pipeline support', { wrapperId: this.config.pipelineWrapper.id }, 'initialization');
    }

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
      this.logInfo('Configuration modules not yet implemented - skipping initialization', {}, 'initialization');

      // Note: Config modules (ConfigLoader, ConfigParser, PipelineConfigGenerator)
      // are not yet available. For now, we'll use the existing dynamic routing configs
      // directly without pipeline table generation.

      this.logWarn('Configuration modules disabled - using direct dynamic routing configs', {}, 'initialization');
    } catch (error) {
      this.logError('Failed to initialize configuration modules', error as unknown as Record<string, unknown>, 'initialization');
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
      // Find configuration file
      const configPath = this.config.configFilePath || this.getDefaultConfigPath();
      this.logInfo('Loading configuration and generating pipeline table', { configPath }, 'config-loading');
      this.logInfo('Configuration file path determined', { configPath }, 'config-loading');

      // Initialize config modules
      await this.configLoader.initialize();
      await this.configParser.initialize();
      await this.pipelineConfigGenerator.initialize();

      // Load configuration
      const rawData = await this.configLoader!.loadFromFile(configPath);
      this.logInfo('Configuration file loaded successfully', { configPath }, 'config-loading');

      // Parse configuration
      this.currentConfigData = await this.configParser!.parseConfig(rawData);
      this.logInfo('Configuration parsed successfully', {}, 'config-loading');

      // Generate pipeline table
      this.currentPipelineTable = await this.pipelineConfigGenerator!.generatePipelineTable(this.currentConfigData);
      if (this.currentPipelineTable) {
        this.logInfo('Pipeline table generated successfully', { entries: this.currentPipelineTable.getEntries().length }, 'config-loading');
      } else {
        this.logWarn('Pipeline table generated but is undefined', {}, 'config-loading');
      }

      // Save pipeline table to file if output path specified
      if (this.config.pipelineTableOutputPath && this.currentPipelineTable) {
        await this.savePipelineTableToFile(this.currentPipelineTable, this.config.pipelineTableOutputPath);
      }

      return this.currentConfigData || null;
    } catch (error) {
      this.logError('Failed to load configuration and generate pipeline table', error as unknown as Record<string, unknown>, 'config-loading');
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

      this.logInfo('Pipeline table saved to file', { outputPath }, 'config-persistence');
    } catch (error) {
      this.logError('Failed to save pipeline table', error as unknown as Record<string, unknown>, 'config-persistence');
    }
  }

  /**
   * Convert pipeline table entries to DynamicRoutingConfig array
   * 将流水线表条目转换为DynamicRoutingConfig数组
   */
  private convertPipelineTableToDynamicRoutingConfigs(pipelineTable: PipelineTable): DynamicRoutingConfig[] {
    const entries = pipelineTable.getEntries();
    const dynamicRoutingConfigs: Map<string, DynamicRoutingConfig> = new Map();

    for (const entry of entries) {
      const routingId = entry.routingId;
      if (!dynamicRoutingConfigs.has(routingId)) {
        dynamicRoutingConfigs.set(routingId, {
          id: routingId,
          name: routingId,
          enabled: entry.enabled,
          modelId: entry.modelId,
          provider: entry.providerId,
          targets: [], // Dynamic routing doesn't need targets - they route based on pipeline table
          capabilities: ['chat']
        });
      }

      // According to user feedback: dynamic routing doesn't need targets
      // They should route to appropriate pipelines based on the pipeline table
      // So we don't push targets here
    }

    return Array.from(dynamicRoutingConfigs.values());
  }

  /**
   * Create simple pipeline table from dynamic routing configs
   * 从动态路由配置创建简单的流水线表
   */
  private createSimplePipelineTable(dynamicRoutingConfigs: DynamicRoutingConfig[]): PipelineTable {
    const entries: PipelineTableEntry[] = [];

    for (const vmConfig of dynamicRoutingConfigs) {
      // If dynamic routing has targets, convert them to pipeline table entries
      if (vmConfig.targets && vmConfig.targets.length > 0) {
        for (const target of vmConfig.targets) {
          const entry: PipelineTableEntry = {
            routingId: vmConfig.id,
            providerId: target.providerId,
            modelId: target.modelId,
            keyIndex: target.keyIndex || 0,
            priority: 1,
            enabled: vmConfig.enabled && (target.enabled !== false),
            weight: target.weight || 1,
            strategy: 'round-robin'
          };
          entries.push(entry);
        }
      } else {
        // Create a default entry for dynamic routing without targets
        const entry: PipelineTableEntry = {
          routingId: vmConfig.id,
          providerId: vmConfig.provider || 'default',
          modelId: vmConfig.modelId || 'default',
          keyIndex: 0,
          priority: 1,
          enabled: vmConfig.enabled,
          weight: 1,
          strategy: 'round-robin'
        };
        entries.push(entry);
      }
    }

    return {
      getEntries: () => entries,
      getEntriesByDynamicRouting: (routingId: string) => {
        return entries.filter(entry => entry.routingId === routingId);
      },
      toJSON: () => ({ entries, metadata: { generatedAt: new Date().toISOString(), totalEntries: entries.length } })
    };
  }

  /**
   * Load configuration from pipeline table
   * 从流水线表加载配置
   */
  async loadFromPipelineTable(pipelineTable: PipelineTable): Promise<AssemblyResult> {
    this.logInfo('Starting pipeline assembly from pipeline table', {}, 'assembly-process');

    try {
      // Convert pipeline table to dynamic routing configs
      const dynamicRoutingConfigs = this.convertPipelineTableToDynamicRoutingConfigs(pipelineTable);
      this.logInfo('Converted pipeline table to dynamic routing configs', { count: dynamicRoutingConfigs.length }, 'assembly-process');

      // Use existing assembly logic
      return await this.assemblePipelines(dynamicRoutingConfigs);

    } catch (error) {
      this.logError('Failed to load from pipeline table', error as unknown as Record<string, unknown>, 'assembly-process');

      return {
        success: false,
        pipelinePools: new Map(),
        errors: [{
          routingId: 'pipeline-table',
          error: `Failed to load from pipeline table: ${error instanceof Error ? error.message : String(error)}`
        }],
        warnings: []
      };
    }
  }

  /**
   * Assemble pipelines from PipelineWrapper (modular approach)
   * 从PipelineWrapper组装流水线（模块化方法）
   */
  async assemblePipelinesFromWrapper(wrapper: PipelineWrapper): Promise<AssemblyResult> {
    this.logInfo('Starting modular pipeline assembly from PipelineWrapper', { wrapperId: wrapper.id }, 'assembly-process');

    if (!this.config.enableModularPipeline) {
      throw new Error('Modular pipeline is not enabled. Set enableModularPipeline: true in config.');
    }

    const result: AssemblyResult = {
      success: true,
      pipelinePools: new Map(),
      errors: [],
      warnings: []
    };

    try {
      // 验证PipelineWrapper配置
      const validationResult = await this.validatePipelineWrapper(wrapper);
      if (!validationResult.isValid) {
        result.errors.push(...validationResult.errors.map(error => ({
          routingId: 'wrapper-validation',
          error
        })));
        result.success = false;
        return result;
      }

      // 使用模块化执行器组装流水线
      const assemblyResult = await this.assembleModularPipelines(wrapper);

      result.pipelinePools = assemblyResult.pipelinePools;
      result.errors.push(...assemblyResult.errors);
      result.warnings.push(...assemblyResult.warnings);
      result.success = assemblyResult.success;

      this.logInfo('Modular pipeline assembly completed', { success: result.success, pools: result.pipelinePools.size, errors: result.errors.length, warnings: result.warnings.length }, 'assembly-process');

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logError('Modular assembly error', error as unknown as Record<string, unknown>, 'assembly-process');

      result.success = false;
      result.errors.push({
        routingId: 'modular-assembly',
        error: `Modular assembly error: ${errorMessage}`
      });

      return result;
    }
  }

  /**
   * Validate PipelineWrapper configuration
   * 验证PipelineWrapper配置
   */
  private async validatePipelineWrapper(wrapper: PipelineWrapper): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证动态路由配置
    if (!wrapper.dynamicRouting || wrapper.dynamicRouting.length === 0) {
      errors.push('PipelineWrapper.dynamicRouting不能为空');
    }

    // 验证模块配置
    if (!wrapper.modules || wrapper.modules.length === 0) {
      errors.push('PipelineWrapper.modules不能为空');
    }

    // 验证必需的模块类型
    const requiredModuleTypes = ['llmswitch', 'workflow', 'compatibility', 'provider'];
    const foundModuleTypes = new Set(wrapper.modules.map(m => m.type));

    for (const requiredType of requiredModuleTypes) {
      if (!foundModuleTypes.has(requiredType)) {
        errors.push(`缺少必需的模块类型: ${requiredType}`);
      }
    }

    // 验证路由配置
    if (!wrapper.routing) {
      errors.push('PipelineWrapper.routing不能为空');
    } else {
      if (!wrapper.routing.strategy) {
        errors.push('PipelineWrapper.routing.strategy不能为空');
      }
      if (!wrapper.routing.fallbackStrategy) {
        errors.push('PipelineWrapper.routing.fallbackStrategy不能为空');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Assemble modular pipelines using PipelineWrapper
   * 使用PipelineWrapper组装模块化流水线
   */
  private async assembleModularPipelines(wrapper: PipelineWrapper): Promise<AssemblyResult> {
    this.logInfo('Assembling modular pipelines from PipelineWrapper', { wrapperId: wrapper.id, dynamicRoutings: wrapper.dynamicRouting.length, modules: wrapper.modules.length }, 'assembly-process');

    const result: AssemblyResult = {
      success: true,
      pipelinePools: new Map(),
      errors: [],
      warnings: []
    };

    try {
      // 为每个动态路由创建流水线池
      for (const routingConfig of wrapper.dynamicRouting) {
        try {
          const pool = await this.assembleModularPipelinePool(routingConfig, wrapper);

          if (pool.pipelines.size === 0) {
            result.warnings.push({
              routingId: routingConfig.id,
              warning: `No modular pipelines could be assembled for dynamic route`
            });
          }

          result.pipelinePools.set(routingConfig.id, pool);
          this.logInfo('Assembled modular pipeline pool', { routingId: routingConfig.id, pipelineCount: pool.pipelines.size }, 'assembly-process');

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push({
            routingId: routingConfig.id,
            error: errorMessage
          });
          this.logError('Failed to assemble modular pipeline', { routingId: routingConfig.id, error: errorMessage }, 'assembly-process');
        }
      }

      result.success = result.errors.length < wrapper.dynamicRouting.length;
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logError('Modular pipeline assembly failed', { error: errorMessage }, 'assembly-process');

      result.success = false;
      result.errors.push({
        routingId: 'modular-assembly',
        error: `Modular pipeline assembly failed: ${errorMessage}`
      });

      return result;
    }
  }

  /**
   * Assemble modular pipeline pool for a single dynamic route
   * 为单个动态路由组装模块化流水线池
   */
  private async assembleModularPipelinePool(routingConfig: any, wrapper: PipelineWrapper): Promise<PipelinePool> {
    this.logInfo('Assembling modular pipeline pool', { routingId: routingConfig.id }, 'assembly-process');

    const pipelines = new Map<string, Pipeline>();

    try {
      // 创建模块化流水线
      const modularPipeline = await this.createModularPipeline(routingConfig, wrapper);
      if (modularPipeline) {
        const pipelineId = `modular_${routingConfig.id}`;
        pipelines.set(pipelineId, modularPipeline);
        this.logInfo('Created modular pipeline', { pipelineId }, 'assembly-process');
      }

      const pool: PipelinePool = {
        routingId: routingConfig.id,
        pipelines,
        activePipeline: pipelines.size > 0 ? Array.from(pipelines.values())[0] : null,
        healthStatus: 'healthy',
        lastHealthCheck: Date.now(),
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0
        },
        routingCapabilities: this.createModularRoutingCapabilities(routingConfig, wrapper),
        isActive: true
      };

      this.logInfo('Modular pipeline pool assembled', { routingId: routingConfig.id, pipelineCount: pipelines.size }, 'assembly-process');
      return pool;

    } catch (error) {
      this.logError('Failed to assemble modular pipeline pool', {
        routingId: routingConfig.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'assembly-process');

      return {
        routingId: routingConfig.id,
        pipelines: new Map(),
        activePipeline: null,
        healthStatus: 'healthy',
        lastHealthCheck: Date.now(),
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0
        },
        routingCapabilities: this.createDefaultModularRoutingCapabilities(routingConfig),
        isActive: false
      };
    }
  }

  /**
   * Create modular pipeline using wrapper configuration
   * 使用wrapper配置创建模块化流水线
   */
  private async createModularPipeline(routingConfig: any, wrapper: PipelineWrapper): Promise<Pipeline | null> {
    try {
      this.logInfo('Creating modular pipeline', { routingId: routingConfig.id }, 'assembly-process');

      // 初始化模块化执行器（如果尚未初始化）
      if (!this.modularExecutor) {
        await this.initializeModularExecutor(wrapper);
      }

      // 构建流水线配置
      const pipelineConfig = this.buildModularPipelineConfig(routingConfig, wrapper);

      // 创建模块化流水线实例
      const pipeline = new Pipeline(pipelineConfig, this.pipelineTracker);

      this.logInfo('Created modular pipeline', { routingId: routingConfig.id }, 'assembly-process');
      return pipeline;

    } catch (error) {
      this.logError('Failed to create modular pipeline', {
        routingId: routingConfig.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'assembly-process');
      return null;
    }
  }

  /**
   * Initialize modular executor
   * 初始化模块化执行器
   */
  private async initializeModularExecutor(wrapper: PipelineWrapper): Promise<void> {
    try {
      // 动态导入模块化执行器相关组件
      const { ModularPipelineExecutor } = await import('../core/ModularPipelineExecutor');
      const { ModuleFactory } = await import('../core/ModuleFactory');
      const { ConfigurationValidator } = await import('../core/ConfigurationValidator');

      // 创建模块工厂和配置验证器
      const moduleFactory = new ModuleFactory();
      const configValidator = new ConfigurationValidator();

      // 创建模块化执行器
      this.modularExecutor = new ModularPipelineExecutor(moduleFactory, configValidator);

      // 初始化执行器
      await this.modularExecutor.initialize(wrapper);

      this.logInfo('Modular executor initialized successfully', {}, 'initialization');
    } catch (error) {
      this.logError('Failed to initialize modular executor', error as unknown as Record<string, unknown>, 'initialization');
      throw error;
    }
  }

  /**
   * Build modular pipeline configuration
   * 构建模块化流水线配置
   */
  private buildModularPipelineConfig(routingConfig: any, wrapper: PipelineWrapper): any {
    // 从wrapper配置中提取模块配置
    const llmswitchModule = wrapper.modules.find(m => m.type === 'llmswitch');
    const workflowModule = wrapper.modules.find(m => m.type === 'workflow');
    const compatibilityModule = wrapper.modules.find(m => m.type === 'compatibility');
    const providerModule = wrapper.modules.find(m => m.type === 'provider');

    // 确定目标提供商和模型
    const target = routingConfig.targets[0] || { providerId: 'default', modelId: 'default' };

    return {
      id: `modular_pipeline_${routingConfig.id}_${Date.now()}`,
      name: `Modular Pipeline for ${routingConfig.name || routingConfig.id}`,
      routingId: routingConfig.id,
      description: `Modular pipeline using LLM Switch → Workflow → Compatibility → Provider architecture`,
      type: 'modular',

      // 模块配置
      modules: {
        llmswitch: llmswitchModule,
        workflow: workflowModule,
        compatibility: compatibilityModule,
        provider: providerModule
      },

      // 目标配置
      targets: [{
        id: `${routingConfig.id}_${target.providerId}_${target.modelId}`,
        providerId: target.providerId,
        modelId: target.modelId,
        weight: target.weight || 1,
        enabled: target.enabled !== false,
        healthStatus: 'healthy',
        lastHealthCheck: Date.now(),
        requestCount: 0,
        errorCount: 0,
        metadata: {
          routingId: routingConfig.id,
          providerId: target.providerId,
          modelId: target.modelId,
          modularPipeline: true
        }
      }],

      // 流水线配置
      loadBalancingStrategy: 'round-robin',
      healthCheckInterval: 60000,
      maxRetries: 3,
      timeout: 30000,

      // 模块化执行配置
      modularConfig: {
        enableModularExecution: true,
        executionOrder: ['llmswitch', 'workflow', 'compatibility', 'provider'],
        responseOrder: ['provider', 'compatibility', 'workflow', 'llmswitch'],
        enableStreaming: true,
        enableProtocolConversion: true,
        enableFieldMapping: true
      },

      // 元数据
      metadata: {
        routingConfigName: routingConfig.name || routingConfig.id,
        routingConfigProvider: target.providerId,
        capabilities: routingConfig.capabilities || ['chat'],
        targetProvider: target.providerId,
        targetModel: target.modelId,
        wrapperVersion: wrapper.metadata?.version || '1.0.0',
        architecture: 'modular'
      }
    };
  }

  /**
   * Create modular routing capabilities
   * 创建模块化路由能力
   */
  private createModularRoutingCapabilities(routingConfig: any, wrapper: PipelineWrapper): any {
    // 从wrapper的路由配置创建路由能力
    return {
      supportedModels: [routingConfig.modelId || 'default'],
      maxTokens: Number.MAX_SAFE_INTEGER, // 使用最大安全整数，实际限制由provider控制
      supportsStreaming: true,
      supportsTools: true,
      supportsImages: false,
      supportsFunctionCalling: true,
      supportsMultimodal: false,
      supportedModalities: ['text'],
      priority: 50,
      availability: 0.9,
      loadWeight: 1.0,
      costScore: 0.5,
      performanceScore: 0.7,
      routingTags: ['modular', 'pipeline-wrapper'],
      extendedCapabilities: {
        supportsVision: false,
        supportsAudio: false,
        supportsCodeExecution: false,
        supportsWebSearch: false,
        maxContextLength: Number.MAX_SAFE_INTEGER, // 使用最大安全整数，实际限制由provider控制
        temperatureRange: [0, 1],
        topPRange: [0, 1]
      }
    };
  }

  /**
   * Create default modular routing capabilities
   * 创建默认模块化路由能力
   */
  private createDefaultModularRoutingCapabilities(routingConfig: any): any {
    return {
      supportedModels: [routingConfig.modelId || 'default'],
      maxTokens: Number.MAX_SAFE_INTEGER, // 使用最大安全整数，实际限制由provider控制
      supportsStreaming: true,
      supportsTools: true,
      supportsImages: false,
      supportsFunctionCalling: true,
      supportsMultimodal: false,
      supportedModalities: ['text'],
      priority: 30,
      availability: 0.5,
      loadWeight: 1.0,
      costScore: 0.5,
      performanceScore: 0.5,
      routingTags: ['modular', 'fallback'],
      extendedCapabilities: {
        supportsVision: false,
        supportsAudio: false,
        supportsCodeExecution: false,
        supportsWebSearch: false,
        maxContextLength: Number.MAX_SAFE_INTEGER, // 使用最大安全整数，实际限制由provider控制
        temperatureRange: [0, 1],
        topPRange: [0, 1]
      }
    };
  }

  /**
   * Assemble pipelines from dynamic routing configurations
   * 从动态路由配置组装流水线
   */
  async assemblePipelines(dynamicRoutingConfigs?: DynamicRoutingConfig[]): Promise<AssemblyResult> {
    this.logInfo('Starting pipeline assembly process', {}, 'assembly-process');

    const result: AssemblyResult = {
      success: true,
      pipelinePools: new Map(),
      errors: [],
      warnings: []
    };

    // Load configuration if not already loaded and no explicit configs provided
    if (!this.currentConfigData && (!dynamicRoutingConfigs || dynamicRoutingConfigs.length === 0)) {
      this.logInfo('No configuration loaded - loading from configuration file', {}, 'assembly-process');

      const configData = await this.loadConfigurationAndGeneratePipelineTable();
      if (configData && this.currentPipelineTable) {
        // Convert pipeline table to dynamic routing configs and proceed
        dynamicRoutingConfigs = this.convertPipelineTableToDynamicRoutingConfigs(this.currentPipelineTable);
        this.logInfo('Loaded dynamic routing configurations from pipeline table', { count: dynamicRoutingConfigs.length }, 'assembly-process');
      } else {
        this.logWarn('Failed to load configuration from file - falling back to empty configs', {}, 'assembly-process');
        dynamicRoutingConfigs = [];
      }
    }

    // Create a simple pipeline table from dynamic routing configs for routing
    if (!this.currentPipelineTable && dynamicRoutingConfigs.length > 0) {
      this.currentPipelineTable = this.createSimplePipelineTable(dynamicRoutingConfigs);
      this.logInfo('Created simple pipeline table from dynamic routing configs', { entries: this.currentPipelineTable.getEntries().length }, 'assembly-process');
    }

    // Ensure we have dynamic routing configs to work with
    if (!dynamicRoutingConfigs || dynamicRoutingConfigs.length === 0) {
      this.logWarn('No dynamic routing configurations available - creating empty assembly', {}, 'assembly-process');
      return {
        success: false,
        pipelinePools: new Map(),
        errors: [{
          routingId: 'global',
          error: 'No dynamic routing configurations available for assembly'
        }],
        warnings: []
      };
    }

    try {
      // Step 1: Discover available providers
      this.logInfo('Discovering available providers', {}, 'provider-discovery');
      const providers = await this.discoverProviders();

      if (providers.size === 0) {
        result.errors.push({
          routingId: 'global',
          error: 'No providers discovered - assembly cannot proceed'
        });
        result.success = false;
        return result;
      }

      this.logInfo('Provider discovery completed', { providerCount: providers.size, providers: Array.from(providers.keys()) }, 'provider-discovery');

      // Step 2: Assemble pipeline for each dynamic route
      this.logInfo('Assembling pipelines for dynamic routing', {}, 'assembly-process');

      for (const routingConfig of dynamicRoutingConfigs) {
        try {
          const pool = await this.assemblePipelinePool(routingConfig, providers);

          if (pool.pipelines.size === 0) {
            result.warnings.push({
              routingId: routingConfig.id,
              warning: `No pipelines could be assembled for dynamic route - will use fallback strategy`
            });
          }

          this.pipelinePools.set(routingConfig.id, pool);
          result.pipelinePools.set(routingConfig.id, pool);

          this.logInfo('Assembled pipeline pool for dynamic route', { routingId: routingConfig.id }, 'assembly-process');

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push({
            routingId: routingConfig.id,
            error: errorMessage
          });

          this.logError('Failed to assemble pipeline for dynamic route', { routingId: routingConfig.id, error: errorMessage }, 'assembly-process');
        }
      }

      // Step 3: Validate overall assembly
      result.success = result.errors.length < dynamicRoutingConfigs.length; // At least one succeeded

      this.logInfo('Pipeline assembly completed', { success: result.success, pools: result.pipelinePools.size, errors: result.errors.length, warnings: result.warnings.length }, 'assembly-process');

      // 如果有可用的scheduler并且组装成功，初始化scheduler
      if (result.success && this.dynamicRoutingManager) {
        this.logInfo('Initializing DynamicRoutingManager with assembled pipeline pools', {}, 'initialization');
        try {
          this.dynamicRoutingManager.initialize(result.pipelinePools);
          this.logInfo('DynamicRoutingManager initialized successfully', {}, 'initialization');
        } catch (error) {
          this.logWarn('Failed to initialize DynamicRoutingManager', {
            error: error instanceof Error ? error.message : String(error)
          }, 'initialization');
        }
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logError('Critical assembly error', { error: errorMessage }, 'assembly-process');

      result.success = false;
      result.errors.push({
        routingId: 'assembly-process',
        error: `Critical assembly error: ${errorMessage}`
      });

      return result;
    }
  }

  /**
   * Discover available providers using ModuleScanner and config data
   * 使用ModuleScanner和配置数据发现可用的provider
   */
  private async discoverProviders(): Promise<Map<string, BaseProvider>> {
    const options = {
      ...this.config.providerDiscoveryOptions,
      providerConfigs: this.currentConfigData?.providers || {}
    };
    this.logInfo('Provider discovery started', { options }, 'provider-discovery');

    const providers = new Map<string, BaseProvider>();

    // Step 1: Try to discover providers using ModuleScanner
    try {
      const discoveredProviders = await this.moduleScanner.scan(options);
      for (const discovered of discoveredProviders) {
        if (discovered.status === 'available' && discovered.instance) {
          providers.set(discovered.info.id, discovered.instance);
          this.discoveredProviders.set(discovered.info.id, discovered.instance);
          this.logInfo('Provider discovered and loaded', { id: discovered.info.id, name: discovered.info.name, type: discovered.info.type }, 'provider-discovery');
        } else {
          this.logWarn('Provider unavailable', { id: discovered.info.id, error: discovered.error }, 'provider-discovery');
        }
      }
    } catch (error) {
      this.logWarn('ModuleScanner discovery failed', { error: error instanceof Error ? error.message : String(error) }, 'provider-discovery');
    }

    // Step 2: Create providers from configuration data if available
    if (this.currentConfigData && this.currentConfigData.providers) {
      this.logInfo('Creating providers from configuration data', {}, 'provider-discovery');

      const configProviders = this.currentConfigData.providers;
      for (const [providerId, providerConfig] of Object.entries(configProviders)) {
        try {
          // Skip if provider already exists
          if (providers.has(providerId)) {
            this.logInfo('Provider already exists, skipping config creation', { providerId }, 'provider-discovery');
            continue;
          }

          // Create provider based on type
          const provider = await this.createProviderFromConfig(providerId, providerConfig);
          if (provider) {
            providers.set(providerId, provider);
            this.discoveredProviders.set(providerId, provider);
            this.logInfo('Provider created from configuration', { providerId, type: (providerConfig as any).type }, 'provider-discovery');
          }
        } catch (error) {
          this.logError('Failed to create provider from configuration', {
            providerId,
            error: error instanceof Error ? error.message : String(error)
          }, 'provider-discovery');
        }
      }
    }

    this.logInfo('Provider discovery completed', {
      totalProviders: providers.size,
      discoveredProviderIds: Array.from(providers.keys())
    }, 'provider-discovery');

    return providers;
  }

  /**
   * Create a provider instance from configuration
   * 从配置创建provider实例
   */
  private async createProviderFromConfig(providerId: string, providerConfig: { type?: string; [key: string]: any }): Promise<BaseProvider | null> {
    try {
      this.logInfo('Creating provider from config', { providerId, providerConfig }, 'provider-discovery');
      const { type, endpoint, models, auth } = providerConfig;

      // Common provider configuration
      const baseConfig = {
        name: providerId,
        endpoint,
        supportedModels: models ? Object.keys(models) : [],
        defaultModel: models ? Object.keys(models)[0] : undefined,
        enableTwoPhaseDebug: this.config.enableTwoPhaseDebug || false,
        debugBaseDirectory: this.config.debugBaseDirectory || '~/.rcc/debug-logs',
        enableIOTracking: this.config.enableIOTracking || false,
        maxConcurrentRequests: 5,
        requestTimeout: 30000
      };

      this.logInfo('Base provider config created', { providerId, baseConfig }, 'provider-discovery');

      // Create provider based on type
      switch (type) {
        case 'openai':
          // For openai type, determine if it's qwen, iflow, or generic openai
          if (endpoint && endpoint.includes('qwen')) {
            return new QwenProvider(baseConfig);
          } else if (endpoint && endpoint.includes('iflow')) {
            return new IFlowProvider(baseConfig);
          } else {
            // For lmstudio and other openai-compatible providers, use QwenProvider as base
            return new QwenProvider(baseConfig);
          }

        case 'qwen':
          return new QwenProvider(baseConfig);

        case 'iflow':
          return new IFlowProvider(baseConfig);

        default:
          this.logWarn('Unknown provider type, using QwenProvider as fallback', { providerId, type }, 'provider-discovery');
          return new QwenProvider(baseConfig);
      }
    } catch (error) {
      this.logError('Failed to create provider from config', {
        providerId,
        error: error instanceof Error ? error.message : String(error)
      }, 'provider-discovery');
      return null;
    }
  }

  /**
   * Assemble pipeline pool for a single dynamic route
   * 为单个动态路由组装流水线池
   */
  private async assemblePipelinePool(
    routingConfig: DynamicRoutingConfig,
    providers: Map<string, BaseProvider>
  ): Promise<PipelinePool> {
    this.logInfo('Assembling pipeline pool for dynamic route', { routingId: routingConfig.id }, 'assembly-process');

    const pipelines = new Map<string, Pipeline>();

    try {
      // According to user feedback: dynamic routing doesn't need targets
      // They should route to appropriate pipelines based on the pipeline table
      // So we create pipelines based on the pipeline table entries for this dynamic route

      if (!this.currentPipelineTable) {
        this.logWarn('No pipeline table available - creating minimal pipeline', { routingId: routingConfig.id }, 'assembly-process');

        // Create a minimal pipeline with available providers as fallback
        const fallbackPipeline = await this.createFallbackPipeline(routingConfig, providers);
        if (fallbackPipeline) {
          pipelines.set(`fallback_${routingConfig.id}`, fallbackPipeline);
        }
      } else {
        // Get pipeline table entries for this dynamic route
        const tableEntries = this.currentPipelineTable.getEntriesByDynamicRouting(routingConfig.id);

        if (tableEntries.length === 0) {
          this.logWarn('No pipeline table entries found for dynamic route - creating minimal pipeline', { routingId: routingConfig.id }, 'assembly-process');

          // Create a minimal pipeline with available providers as fallback
          const fallbackPipeline = await this.createFallbackPipeline(routingConfig, providers);
          if (fallbackPipeline) {
            pipelines.set(`fallback_${routingConfig.id}`, fallbackPipeline);
          }
        } else {
          // Create pipelines for each pipeline table entry
          for (const entry of tableEntries) {
            try {
              // Create a new provider instance configured with pipeline table entry
              const configuredProvider = this.createProviderForPipelineEntry(entry, providers);
              if (!configuredProvider) {
                this.logWarn('Failed to create provider for pipeline table entry', {
                  providerId: entry.providerId,
                  routingId: routingConfig.id,
                  modelId: entry.modelId
                }, 'assembly-process');
                continue;
              }

              // Create a target config from the pipeline table entry
              const targetConfig = {
                providerId: entry.providerId,
                modelId: entry.modelId,
                keyIndex: entry.keyIndex,
                weight: entry.weight || 1,
                enabled: entry.enabled
              };

              const pipeline = this.createPipelineFromTarget(routingConfig, targetConfig, configuredProvider);
              if (pipeline) {
                const pipelineId = `${routingConfig.id}_${entry.providerId}_${entry.modelId}`;
                pipelines.set(pipelineId, pipeline);

                this.logInfo('Created pipeline from pipeline table entry', {
                  pipelineId,
                  routingId: routingConfig.id,
                  providerId: entry.providerId,
                  modelId: entry.modelId
                }, 'assembly-process');
              }

            } catch (error) {
              this.logError('Failed to assemble pipeline for pipeline table entry', {
                routingId: routingConfig.id,
                providerId: entry.providerId,
                modelId: entry.modelId,
                error: error instanceof Error ? error.message : String(error)
              }, 'assembly-process');
            }
          }
        }
      }

      // Select active pipeline (first available)
      const activePipeline = pipelines.size > 0 ? Array.from(pipelines.values())[0] : null;

      // 创建路由能力描述
      const routingCapabilities: RoutingCapabilities = this.createRoutingCapabilities(routingConfig, providers);

      const pool: PipelinePool = {
        routingId: routingConfig.id,
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
        routingCapabilities,
        isActive: true
      };

      this.logInfo('Pipeline pool assembled', { routingId: routingConfig.id, pipelineCount: pipelines.size, healthStatus: pool.healthStatus }, 'assembly-process');
      return pool;

    } catch (error) {
      this.logError('Failed to assemble pipeline pool', {
        routingId: routingConfig.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'assembly-process');

      return {
        routingId: routingConfig.id,
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
        routingCapabilities: this.createDefaultRoutingCapabilities(routingConfig),
        isActive: false
      };
    }
  }

  /**
   * Create fallback pipeline when no targets are configured
   * 当没有配置目标时创建回退流水线
   */
  private async createFallbackPipeline(
    routingConfig: DynamicRoutingConfig,
    providers: Map<string, BaseProvider>
  ): Promise<Pipeline | null> {
    if (providers.size === 0) {
      return null;
    }

    // Use first available provider as fallback
    const [providerId, provider] = Array.from(providers.entries())[0];

    const targetConfig = {
      providerId,
      modelId: routingConfig.modelId || 'default',
      weight: 1,
      enabled: true
    };

    return this.createPipelineFromTarget(routingConfig, targetConfig, provider);
  }

  /**
   * 创建路由能力描述
   */
  private createRoutingCapabilities(routingConfig: DynamicRoutingConfig, providers: Map<string, BaseProvider>): RoutingCapabilities {
    // 从动态路由配置和能力中推断路由能力
    const capabilities = routingConfig.capabilities || ['chat'];
    const supportedModels = routingConfig.targets?.map(target => target.modelId) || [routingConfig.modelId || 'default'];

    return {
      supportedModels,
      maxTokens: this.estimateMaxTokens(routingConfig),
      supportsStreaming: capabilities.includes('streaming') || capabilities.includes('chat'),
      supportsTools: capabilities.includes('tools') || capabilities.includes('function-calling'),
      supportsImages: capabilities.includes('vision') || capabilities.includes('images'),
      supportsFunctionCalling: capabilities.includes('function-calling'),
      supportsMultimodal: capabilities.includes('multimodal') || capabilities.includes('vision'),
      supportedModalities: this.determineSupportedModalities(capabilities),
      priority: this.determinePriority(routingConfig),
      availability: 0.9, // 默认高可用性
      loadWeight: routingConfig.targets?.reduce((sum, target) => sum + (target.weight || 1), 0) || 1,
      costScore: this.estimateCostScore(routingConfig),
      performanceScore: this.estimatePerformanceScore(routingConfig),
      routingTags: this.generateRoutingTags(routingConfig),
      extendedCapabilities: {
        supportsVision: capabilities.includes('vision'),
        supportsAudio: capabilities.includes('audio'),
        supportsCodeExecution: capabilities.includes('code-execution'),
        supportsWebSearch: capabilities.includes('web-search'),
        maxContextLength: Number.MAX_SAFE_INTEGER, // 使用最大安全整数，实际限制由provider控制
        temperatureRange: [0, 1],
        topPRange: [0, 1]
      }
    };
  }

  /**
   * 创建默认路由能力
   */
  private createDefaultRoutingCapabilities(routingConfig: DynamicRoutingConfig): RoutingCapabilities {
    return {
      supportedModels: [routingConfig.modelId || 'default'],
      maxTokens: Number.MAX_SAFE_INTEGER, // 使用最大安全整数，实际限制由provider控制
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
        maxContextLength: 262144 // 256K 默认值
      }
    };
  }

  /**
   * 估算最大token数
   */
  private estimateMaxTokens(routingConfig: DynamicRoutingConfig): number {
    // 移除硬编码token限制，从provider配置中获取实际token限制
    // 这里返回一个较大的默认值，实际限制由provider控制
    return Number.MAX_SAFE_INTEGER; // 使用最大安全整数，实际限制由provider控制
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
  private determinePriority(routingConfig: DynamicRoutingConfig): number {
    // 根据模型类型确定优先级
    const modelId = routingConfig.modelId?.toLowerCase() || '';

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
  private estimateCostScore(routingConfig: DynamicRoutingConfig): number {
    // 根据模型类型估算成本（0-1，分数越高成本越高）
    const modelId = routingConfig.modelId?.toLowerCase() || '';

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
  private estimatePerformanceScore(routingConfig: DynamicRoutingConfig): number {
    // 根据模型类型估算性能（0-1，分数越高性能越好）
    const modelId = routingConfig.modelId?.toLowerCase() || '';

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
  private generateRoutingTags(routingConfig: DynamicRoutingConfig): string[] {
    const tags: string[] = [];
    const modelId = routingConfig.modelId?.toLowerCase() || '';
    const capabilities = routingConfig.capabilities || [];

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
   * Create a new provider instance for a pipeline table entry
   * 为流水线表条目创建新的provider实例
   */
  private createProviderForPipelineEntry(entry: PipelineTableEntry, baseProviders: Map<string, BaseProvider>): BaseProvider | null {
    console.log(`[PipelineAssembler] DEBUG: createProviderForPipelineEntry called for`, entry);
    try {
      // Get the base provider template
      const baseProvider = baseProviders.get(entry.providerId);
      if (!baseProvider) {
        this.logWarn('Base provider not found', { providerId: entry.providerId }, 'provider-configuration');
        return null;
      }

      // Get the base provider's configuration from its properties
      const baseConfig = {
        name: (baseProvider as any).moduleName || (baseProvider as any).name || entry.providerId,
        endpoint: (baseProvider as any).endpoint,
        supportedModels: (baseProvider as any).supportedModels || [],
        defaultModel: (baseProvider as any).defaultModel,
        maxTokens: (baseProvider as any).maxTokens || 256000,
        metadata: (baseProvider as any).metadata || {}
      };

      // DEBUG: Log the actual properties available on the base provider
      console.log(`[PipelineAssembler] DEBUG: Base provider properties for ${entry.providerId}:`, {
        keys: Object.keys(baseProvider as any),
        name: (baseProvider as any).name,
        moduleName: (baseProvider as any).moduleName,
        endpoint: (baseProvider as any).endpoint,
        hasConfig: !!(baseProvider as any).config,
        hasPipelineConfig: !!(baseProvider as any).pipelineConfig
      });

      // Validate required configuration
      if (!baseConfig.endpoint) {
        this.logWarn('Base provider endpoint not found', {
          providerId: entry.providerId,
          actualConfig: Object.keys(baseProvider as any)
        }, 'provider-configuration');
        return null;
      }

      // Create new provider configuration with pipeline table model settings
      const newProviderConfig = {
        name: `${baseConfig.name}-${entry.modelId}`,
        endpoint: baseConfig.endpoint, // Ensure endpoint is preserved
        supportedModels: [entry.modelId], // Only support the specific model from pipeline table
        defaultModel: entry.modelId, // Set the specific model as default
        maxTokens: baseConfig.maxTokens, // Preserve max tokens configuration
        metadata: {
          ...baseConfig.metadata,
          pipelineTableEntry: entry,
          keyIndex: entry.keyIndex,
          routingId: entry.routingId
        }
      };

      // DEBUG: Log provider configuration creation
      console.log(`[PipelineAssembler] DEBUG: Creating provider for entry`, {
        entry,
        baseConfig: {
          name: baseConfig.name,
          endpoint: baseConfig.endpoint,
          hasDefaultModel: !!baseConfig.defaultModel,
          supportedModelsCount: baseConfig.supportedModels.length
        },
        newProviderConfig: {
          name: newProviderConfig.name,
          endpoint: newProviderConfig.endpoint,
          supportedModels: newProviderConfig.supportedModels,
          defaultModel: newProviderConfig.defaultModel
        }
      });

      // Create new provider instance with the specific configuration
      const ProviderClass = baseProvider.constructor as new (config: any) => BaseProvider;
      const configuredProvider = new ProviderClass(newProviderConfig);

      this.logInfo('Created configured provider for pipeline entry', {
        providerId: entry.providerId,
        modelId: entry.modelId,
        routingId: entry.routingId,
        providerName: newProviderConfig.name
      }, 'provider-configuration');

      return configuredProvider;
    } catch (error) {
      this.logError('Failed to create provider for pipeline entry', {
        providerId: entry.providerId,
        modelId: entry.modelId,
        error: error instanceof Error ? error.message : String(error)
      }, 'provider-configuration');
      return null;
    }
  }

  /**
   * Create pipeline from target configuration
   * 从目标配置创建流水线
   */
  private createPipelineFromTarget(
    routingConfig: DynamicRoutingConfig,
    targetConfig: any,
    provider: BaseProvider
  ): Pipeline | null {
    try {
      const pipelineConfig = this.buildPipelineConfig(routingConfig, targetConfig, provider);

      if (!pipelineConfig) {
        return null;
      }

      // 直接创建Pipeline实例
      return new Pipeline(pipelineConfig, this.pipelineTracker);

    } catch (error) {
      this.logError('Failed to create pipeline from target', {
        providerId: targetConfig.providerId,
        modelId: targetConfig.modelId,
        error: error instanceof Error ? error.message : String(error)
      }, 'assembly-process');
      return null;
    }
  }

  /**
   * Build pipeline configuration from dynamic routing and target
   * 从动态路由和目标构建流水线配置
   */
  private buildPipelineConfig(
    routingConfig: DynamicRoutingConfig,
    targetConfig: any,
    provider: BaseProvider
  ): any {
    return {
      id: `pipeline_${routingConfig.id}_${targetConfig.providerId}_${targetConfig.modelId}_${Date.now()}`,
      name: `${routingConfig.name} Pipeline (${targetConfig.providerId})`,
      routingId: routingConfig.id,
      description: `${routingConfig.name} using ${targetConfig.providerId}`,
      targets: [{
        id: `${routingConfig.id}_${targetConfig.providerId}_${targetConfig.modelId}`,
        provider,
        weight: targetConfig.weight || 1,
        enabled: targetConfig.enabled !== false,
        healthStatus: 'healthy', // Always healthy
        lastHealthCheck: Date.now(),
        requestCount: 0,
        errorCount: 0,
        metadata: {
          keyIndex: targetConfig.keyIndex,
          routingId: routingConfig.id,
          providerId: targetConfig.providerId,
          modelId: targetConfig.modelId
        }
      }],
      loadBalancingStrategy: 'round-robin',
      healthCheckInterval: 60000,
      maxRetries: 3,
      timeout: 30000,
      metadata: {
        routingConfigName: routingConfig.name,
        routingConfigProvider: routingConfig.provider,
        capabilities: routingConfig.capabilities || ['chat'],
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
   * Get pipeline pool for specific dynamic route
   * 获取特定动态路由的流水线池
   */
  getPipelinePool(routingId: string): PipelinePool | null {
    return this.pipelinePools.get(routingId) || null;
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
    this.logInfo('Reloading providers and reassembling pipelines', {}, 'reload-process');

    // Clear existing pools temporarily
    const existingPools = new Map(this.pipelinePools);
    this.pipelinePools.clear();
    this.discoveredProviders.clear();

    try {
      // Rediscover providers
      const providers = await this.discoverProviders();
      this.logInfo('Providers rediscovered', { count: providers.size }, 'reload-process');

      // Reassemble pipelines for existing dynamic routes
      for (const [routingId, oldPool] of existingPools.entries()) {
        try {
          // Restore original dynamic routing config (would need to store this)
          const routingConfig = this.inferDynamicRoutingConfig(routingId, oldPool);
          const newPool = await this.assemblePipelinePool(routingConfig, providers);

          this.pipelinePools.set(routingId, newPool);
          this.logInfo('Pipeline pool reassembled', { routingId }, 'reload-process');
        } catch (error) {
          this.logError('Failed to reassemble pipeline pool', {
            routingId,
            error: error instanceof Error ? error.message : String(error)
          }, 'reload-process');
        }
      }

      this.logInfo('Provider reload and pipeline reassembly completed', {}, 'reload-process');

    } catch (error) {
      this.logError('Provider reload failed', error as unknown as Record<string, unknown>, 'reload-process');
      // Restore previous state on failure
      this.pipelinePools = existingPools;
      throw error;
    }
  }

  /**
   * Infer dynamic routing configuration from existing pool (fallback)
   * 从现有池推断动态路由配置（回退）
   */
  private inferDynamicRoutingConfig(routingId: string, pool: PipelinePool): DynamicRoutingConfig {
    // This is a simplified inference - in real implementation, store original configs
    const target = pool.pipelines.size > 0 ? Array.from(pool.pipelines.values())[0].config.targets[0] : null;

    return {
      id: routingId,
      name: routingId,
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
   * 设置动态路由管理器
   */
  setDynamicRoutingManager(scheduler: DynamicRoutingManager): void {
    this.logInfo('Setting DynamicRoutingManager for PipelineAssembler', {}, 'initialization');
    this.dynamicRoutingManager = scheduler;
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
    routingIds: string[];
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
      routingIds: Array.from(this.pipelinePools.keys()),
      routingEnabled: !!this.dynamicRoutingManager,
      schedulerInitialized: this.dynamicRoutingManager?.isInitializedAccessor || false,
      configModuleIntegration: {
        enabled: this.config.enableConfigModuleIntegration || false,
        configLoaded: !!this.currentConfigData,
        pipelineTableGenerated: !!this.currentPipelineTable,
        configFilePath: this.config.configFilePath
      }
    };
  }

  /**
   * Process method - Required by BasePipelineModule interface
   * 处理方法 - BasePipelineModule接口必需
   */
  async process(request: any): Promise<any> {
    this.logInfo('Processing request in PipelineAssembler', { requestType: typeof request }, 'process');

    // For now, return the request as-is since this is primarily an assembly module
    // 暂时直接返回请求，因为这主要是一个组装模块
    return request;
  }

  /**
   * Process response method - Required by BasePipelineModule interface
   * 处理响应方法 - BasePipelineModule接口必需
   */
  async processResponse(response: any): Promise<any> {
    this.logInfo('Processing response in PipelineAssembler', { responseType: typeof response }, 'processResponse');

    // For now, return the response as-is since this is primarily an assembly module
    // 暂时直接返回响应，因为这主要是一个组装模块
    return response;
  }

  /**
   * Cleanup resources
   * 清理资源
   */
  async destroy(): Promise<void> {
    this.logInfo('Destroying Pipeline Assembler', {}, 'shutdown');

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

    this.logInfo('Pipeline Assembler destroyed', {}, 'shutdown');
  }
}