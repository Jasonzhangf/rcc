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
  toJSON(): any;
}

interface PipelineTableEntry {
  id: string;
  name: string;
  config: any;
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
  isActive: boolean; // Add missing isActive property
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
export class PipelineAssembler extends UnifiedPipelineBaseModule {
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
      enableConfigModuleIntegration: true,
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
      this.logInfo('Initializing configuration modules', {}, 'initialization');

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

      this.logInfo('Configuration modules initialized successfully', {}, 'initialization');
    } catch (error) {
      this.logError('Failed to initialize configuration modules', error, 'initialization');
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
      this.logInfo('Loading configuration and generating pipeline table', { configPath }, 'config-loading');

      // Find configuration file
      const configPath = this.config.configFilePath || this.getDefaultConfigPath();
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
      this.logError('Failed to load configuration and generate pipeline table', error, 'config-loading');
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
      this.logError('Failed to save pipeline table', error, 'config-persistence');
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
      const virtualModelId = `vm-${entry.id}`;
      if (!virtualModelConfigs.has(virtualModelId)) {
        virtualModelConfigs.set(virtualModelId, {
          id: virtualModelId,
          name: entry.name || virtualModelId,
          enabled: entry.config?.enabled !== false,
          modelId: entry.config?.modelId || 'default',
          provider: entry.config?.providerId || 'unknown',
          targets: [],
          capabilities: ['chat']
        });
      }

      const vmConfig = virtualModelConfigs.get(virtualModelId)!;
      if (vmConfig.targets) {
        vmConfig.targets.push({
          providerId: entry.config?.providerId || 'unknown',
          modelId: entry.config?.modelId || 'default',
          weight: entry.config?.weight || 1,
          enabled: entry.config?.enabled !== false
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
    this.logInfo('Starting pipeline assembly from pipeline table', {}, 'assembly-process');

    try {
      // Convert pipeline table to virtual model configs
      const virtualModelConfigs = this.convertPipelineTableToVirtualModelConfigs(pipelineTable);
      this.logInfo('Converted pipeline table to virtual model configs', { count: virtualModelConfigs.length }, 'assembly-process');

      // Use existing assembly logic
      return await this.assemblePipelines(virtualModelConfigs);

    } catch (error) {
      this.logError('Failed to load from pipeline table', error, 'assembly-process');

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
          virtualModelId: 'wrapper-validation',
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
      this.logError('Modular assembly error', error, 'assembly-process');

      result.success = false;
      result.errors.push({
        virtualModelId: 'modular-assembly',
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

    // 验证虚拟模型配置
    if (!wrapper.virtualModels || wrapper.virtualModels.length === 0) {
      errors.push('PipelineWrapper.virtualModels不能为空');
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
    this.logInfo('Assembling modular pipelines from PipelineWrapper', { wrapperId: wrapper.id, virtualModels: wrapper.virtualModels.length, modules: wrapper.modules.length }, 'assembly-process');

    const result: AssemblyResult = {
      success: true,
      pipelinePools: new Map(),
      errors: [],
      warnings: []
    };

    try {
      // 为每个虚拟模型创建流水线池
      for (const virtualModel of wrapper.virtualModels) {
        try {
          const pool = await this.assembleModularPipelinePool(virtualModel, wrapper);

          if (pool.pipelines.size === 0) {
            result.warnings.push({
              virtualModelId: virtualModel.id,
              warning: `No modular pipelines could be assembled for virtual model`
            });
          }

          result.pipelinePools.set(virtualModel.id, pool);
          this.logInfo('Assembled modular pipeline pool', { virtualModelId: virtualModel.id, pipelineCount: pool.pipelines.size }, 'assembly-process');

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push({
            virtualModelId: virtualModel.id,
            error: errorMessage
          });
          this.logError('Failed to assemble modular pipeline', { virtualModelId: virtualModel.id, error: errorMessage }, 'assembly-process');
        }
      }

      result.success = result.errors.length < wrapper.virtualModels.length;
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logError('Modular pipeline assembly failed', { error: errorMessage }, 'assembly-process');

      result.success = false;
      result.errors.push({
        virtualModelId: 'modular-assembly',
        error: `Modular pipeline assembly failed: ${errorMessage}`
      });

      return result;
    }
  }

  /**
   * Assemble modular pipeline pool for a single virtual model
   * 为单个虚拟模型组装模块化流水线池
   */
  private async assembleModularPipelinePool(virtualModel: any, wrapper: PipelineWrapper): Promise<PipelinePool> {
    this.logInfo('Assembling modular pipeline pool', { virtualModelId: virtualModel.id }, 'assembly-process');

    const pipelines = new Map<string, Pipeline>();

    try {
      // 创建模块化流水线
      const modularPipeline = await this.createModularPipeline(virtualModel, wrapper);
      if (modularPipeline) {
        const pipelineId = `modular_${virtualModel.id}`;
        pipelines.set(pipelineId, modularPipeline);
        this.logInfo('Created modular pipeline', { pipelineId }, 'assembly-process');
      }

      const pool: PipelinePool = {
        virtualModelId: virtualModel.id,
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
        routingCapabilities: this.createModularRoutingCapabilities(virtualModel, wrapper),
        isActive: true
      };

      this.logInfo('Modular pipeline pool assembled', { virtualModelId: virtualModel.id, pipelineCount: pipelines.size }, 'assembly-process');
      return pool;

    } catch (error) {
      this.logError('Failed to assemble modular pipeline pool', { virtualModelId: virtualModel.id, error: error.message || error }, 'assembly-process');

      return {
        virtualModelId: virtualModel.id,
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
        routingCapabilities: this.createDefaultModularRoutingCapabilities(virtualModel),
        isActive: false
      };
    }
  }

  /**
   * Create modular pipeline using wrapper configuration
   * 使用wrapper配置创建模块化流水线
   */
  private async createModularPipeline(virtualModel: any, wrapper: PipelineWrapper): Promise<Pipeline | null> {
    try {
      this.logInfo('Creating modular pipeline', { virtualModelId: virtualModel.id }, 'assembly-process');

      // 初始化模块化执行器（如果尚未初始化）
      if (!this.modularExecutor) {
        await this.initializeModularExecutor(wrapper);
      }

      // 构建流水线配置
      const pipelineConfig = this.buildModularPipelineConfig(virtualModel, wrapper);

      // 创建模块化流水线实例
      const pipeline = new Pipeline(pipelineConfig, this.pipelineTracker);

      this.logInfo('Created modular pipeline', { virtualModelId: virtualModel.id }, 'assembly-process');
      return pipeline;

    } catch (error) {
      this.logError('Failed to create modular pipeline', { virtualModelId: virtualModel.id, error: error.message || error }, 'assembly-process');
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
      this.logError('Failed to initialize modular executor', error, 'initialization');
      throw error;
    }
  }

  /**
   * Build modular pipeline configuration
   * 构建模块化流水线配置
   */
  private buildModularPipelineConfig(virtualModel: any, wrapper: PipelineWrapper): any {
    // 从wrapper配置中提取模块配置
    const llmswitchModule = wrapper.modules.find(m => m.type === 'llmswitch');
    const workflowModule = wrapper.modules.find(m => m.type === 'workflow');
    const compatibilityModule = wrapper.modules.find(m => m.type === 'compatibility');
    const providerModule = wrapper.modules.find(m => m.type === 'provider');

    // 确定目标提供商和模型
    const target = virtualModel.targets[0] || { providerId: 'default', modelId: 'default' };

    return {
      id: `modular_pipeline_${virtualModel.id}_${Date.now()}`,
      name: `Modular Pipeline for ${virtualModel.name || virtualModel.id}`,
      virtualModelId: virtualModel.id,
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
        id: `${virtualModel.id}_${target.providerId}_${target.modelId}`,
        providerId: target.providerId,
        modelId: target.modelId,
        weight: target.weight || 1,
        enabled: target.enabled !== false,
        healthStatus: 'healthy',
        lastHealthCheck: Date.now(),
        requestCount: 0,
        errorCount: 0,
        metadata: {
          virtualModelId: virtualModel.id,
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
        virtualModelName: virtualModel.name || virtualModel.id,
        virtualModelProvider: target.providerId,
        capabilities: virtualModel.capabilities || ['chat'],
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
  private createModularRoutingCapabilities(virtualModel: any, wrapper: PipelineWrapper): any {
    // 从wrapper的路由配置创建路由能力
    return {
      supportedModels: [virtualModel.modelId || 'default'],
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
  private createDefaultModularRoutingCapabilities(virtualModel: any): any {
    return {
      supportedModels: [virtualModel.modelId || 'default'],
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
   * Assemble pipelines from virtual model configurations
   * 从虚拟模型配置组装流水线
   */
  async assemblePipelines(virtualModelConfigs?: VirtualModelConfig[]): Promise<AssemblyResult> {
    this.logInfo('Starting pipeline assembly process', {}, 'assembly-process');

    const result: AssemblyResult = {
      success: true,
      pipelinePools: new Map(),
      errors: [],
      warnings: []
    };

    // If config module integration is enabled and no explicit configs provided, load from config file
    if (this.config.enableConfigModuleIntegration && (!virtualModelConfigs || virtualModelConfigs.length === 0)) {
      this.logInfo('No explicit virtual model configs provided - loading from configuration file', {}, 'assembly-process');

      const configData = await this.loadConfigurationAndGeneratePipelineTable();
      if (configData && this.currentPipelineTable) {
        // Convert pipeline table to virtual model configs and proceed
        virtualModelConfigs = this.convertPipelineTableToVirtualModelConfigs(this.currentPipelineTable);
        this.logInfo('Loaded virtual model configurations from pipeline table', { count: virtualModelConfigs.length }, 'assembly-process');
      } else {
        this.logWarn('Failed to load configuration from file - falling back to empty configs', {}, 'assembly-process');
        virtualModelConfigs = [];
      }
    }

    // Ensure we have virtual model configs to work with
    if (!virtualModelConfigs || virtualModelConfigs.length === 0) {
      this.logWarn('No virtual model configurations available - creating empty assembly', {}, 'assembly-process');
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
      this.logInfo('Discovering available providers', {}, 'provider-discovery');
      const providers = await this.discoverProviders();

      if (providers.size === 0) {
        result.errors.push({
          virtualModelId: 'global',
          error: 'No providers discovered - assembly cannot proceed'
        });
        result.success = false;
        return result;
      }

      this.logInfo('Provider discovery completed', { providerCount: providers.size, providers: Array.from(providers.keys()) }, 'provider-discovery');

      // Step 2: Assemble pipeline for each virtual model
      this.logInfo('Assembling pipelines for virtual models', {}, 'assembly-process');

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

          this.logInfo('Assembled pipeline pool for virtual model', { virtualModelId: virtualModelConfig.id }, 'assembly-process');

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push({
            virtualModelId: virtualModelConfig.id,
            error: errorMessage
          });

          this.logError('Failed to assemble pipeline for virtual model', { virtualModelId: virtualModelConfig.id, error: errorMessage }, 'assembly-process');
        }
      }

      // Step 3: Validate overall assembly
      result.success = result.errors.length < virtualModelConfigs.length; // At least one succeeded

      this.logInfo('Pipeline assembly completed', { success: result.success, pools: result.pipelinePools.size, errors: result.errors.length, warnings: result.warnings.length }, 'assembly-process');

      // 如果有可用的scheduler并且组装成功，初始化scheduler
      if (result.success && this.virtualModelScheduler) {
        this.logInfo('Initializing VirtualModelSchedulerManager with assembled pipeline pools', {}, 'initialization');
        try {
          this.virtualModelScheduler.initialize(result.pipelinePools);
          this.logInfo('VirtualModelSchedulerManager initialized successfully', {}, 'initialization');
        } catch (error) {
          this.logWarn('Failed to initialize VirtualModelSchedulerManager', { error: error.message || error }, 'initialization');
        }
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logError('Critical assembly error', { error: errorMessage }, 'assembly-process');

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
    this.logInfo('Provider discovery started', { options }, 'provider-discovery');

    const discoveredProviders = await this.moduleScanner.scan(options);
    const providers = new Map<string, BaseProvider>();

    for (const discovered of discoveredProviders) {
      if (discovered.status === 'available' && discovered.instance) {
        providers.set(discovered.info.id, discovered.instance);
        this.discoveredProviders.set(discovered.info.id, discovered.instance);

        this.logInfo('Provider discovered and loaded', { id: discovered.info.id, name: discovered.info.name, type: discovered.info.type }, 'provider-discovery');
      } else {
        this.logWarn('Provider unavailable', { id: discovered.info.id, error: discovered.error }, 'provider-discovery');
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
    this.logInfo('Assembling pipeline pool for virtual model', { virtualModelId: virtualModel.id }, 'assembly-process');

    const pipelines = new Map<string, Pipeline>();

    try {
      // Validate virtual model configuration
      if (!virtualModel.targets || virtualModel.targets.length === 0) {
        this.logWarn('Virtual model has no targets - creating minimal pipeline', { virtualModelId: virtualModel.id }, 'assembly-process');

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
              this.logWarn('Provider not found for target', { providerId: targetConfig.providerId, virtualModelId: virtualModel.id }, 'assembly-process');
              continue;
            }

            const pipeline = this.createPipelineFromTarget(virtualModel, targetConfig, provider);
            if (pipeline) {
              const pipelineId = `${virtualModel.id}_${targetConfig.providerId}_${targetConfig.modelId}`;
              pipelines.set(pipelineId, pipeline);

              this.logInfo('Created pipeline', { pipelineId }, 'assembly-process');
            }

          } catch (error) {
            this.logError('Failed to assemble pipeline for target', { providerId: targetConfig.providerId, modelId: targetConfig.modelId, error: error.message || error }, 'assembly-process');
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
        routingCapabilities,
        isActive: true
      };

      this.logInfo('Pipeline pool assembled', { virtualModelId: virtualModel.id, pipelineCount: pipelines.size, healthStatus: pool.healthStatus }, 'assembly-process');
      return pool;

    } catch (error) {
      this.logError('Failed to assemble pipeline pool', { virtualModelId: virtualModel.id, error: error.message || error }, 'assembly-process');

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
        routingCapabilities: this.createDefaultRoutingCapabilities(virtualModel),
        isActive: false
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
        maxContextLength: Number.MAX_SAFE_INTEGER, // 使用最大安全整数，实际限制由provider控制
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
  private estimateMaxTokens(virtualModel: VirtualModelConfig): number {
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
      this.logError('Failed to create pipeline from target', { providerId: targetConfig.providerId, modelId: targetConfig.modelId, error: error.message || error }, 'assembly-process');
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
    this.logInfo('Reloading providers and reassembling pipelines', {}, 'reload-process');

    // Clear existing pools temporarily
    const existingPools = new Map(this.pipelinePools);
    this.pipelinePools.clear();
    this.discoveredProviders.clear();

    try {
      // Rediscover providers
      const providers = await this.discoverProviders();
      this.logInfo('Providers rediscovered', { count: providers.size }, 'reload-process');

      // Reassemble pipelines for existing virtual models
      for (const [virtualModelId, oldPool] of existingPools.entries()) {
        try {
          // Restore original virtual model config (would need to store this)
          const virtualModelConfig = this.inferVirtualModelConfig(virtualModelId, oldPool);
          const newPool = await this.assemblePipelinePool(virtualModelConfig, providers);

          this.pipelinePools.set(virtualModelId, newPool);
          this.logInfo('Pipeline pool reassembled', { virtualModelId }, 'reload-process');
        } catch (error) {
          this.logError('Failed to reassemble pipeline pool', { virtualModelId, error: error.message || error }, 'reload-process');
        }
      }

      this.logInfo('Provider reload and pipeline reassembly completed', {}, 'reload-process');

    } catch (error) {
      this.logError('Provider reload failed', error, 'reload-process');
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
    this.logInfo('Setting VirtualModelSchedulerManager for PipelineAssembler', {}, 'initialization');
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