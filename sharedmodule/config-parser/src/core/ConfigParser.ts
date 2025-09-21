/**
 * 配置解析器
 * 
 * 负责将原始配置数据解析为标准化的ConfigData结构
 */

import { ConfigData, ProviderConfig, ModelConfig, VirtualModelConfig, ServerWrapper, PipelineWrapper, ModuleConfig, RoutingConfig } from './ConfigData';
import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import * as fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * 预处理选项
 */
export interface PreprocessingOptions {
  /** 启用环境变量替换 */
  substituteEnvVars?: boolean;
  /** 启用模板处理 */
  processTemplates?: boolean;
  /** 启用数据验证 */
  validateData?: boolean;
  /** 目标语言环境 */
  targetLocale?: string;
  /** 自定义处理器函数 */
  customProcessors?: Function[];
  /** 启用缓存 */
  enableCaching?: boolean;
}

/**
 * 配置解析器类
 */
export class ConfigParser extends BaseModule {

  constructor(info: ModuleInfo = {
    id: 'config-parser',
    type: 'config-parser',
    name: 'Config Parser Module',
    version: '1.0.0',
    description: 'RCC Configuration Parser Module'
  }) {
    super(info);
  }

  /**
   * 初始化解析器
   */
  public async initialize(): Promise<void> {
    await super.initialize();

    this.logInfo('ConfigParser initialized successfully');
  }


  /**
   * 解析配置数据
   */
  public async parseConfig(rawData: any): Promise<ConfigData> {
    const operationId = `parse-config-${Date.now()}`;
    this.startIOTracking(operationId, { dataSize: JSON.stringify(rawData).length }, 'parseConfig');

    try {
      this.logInfo(`Starting configuration parsing - dataSize: ${JSON.stringify(rawData).length}, hasProviders: ${!!rawData.providers}, hasVirtualModels: ${!!rawData.virtualModels}`);

      // 解析基本配置信息
      const config: ConfigData = {
        version: rawData.version || '1.0.0',
        providers: {},
        virtualModels: {},
        createdAt: rawData.createdAt || new Date().toISOString(),
        updatedAt: rawData.updatedAt || new Date().toISOString()
      };

      // 解析供应商配置
      if (rawData.providers) {
        config.providers = this.parseProviders(rawData.providers);
        this.logInfo(`Providers parsed successfully - providerCount: ${Object.keys(rawData.providers).length}`);
      }

      // 解析虚拟模型配置
      if (rawData.virtualModels) {
        config.virtualModels = this.parseVirtualModels(rawData.virtualModels);
        this.logInfo(`Virtual models parsed successfully - vmCount: ${Object.keys(rawData.virtualModels).length}`);
      }

      // 更新时间戳
      config.updatedAt = new Date().toISOString();

      this.logInfo('Configuration parsed successfully');
      const result = {
        providerCount: Object.keys(config.providers).length,
        virtualModelCount: Object.keys(config.virtualModels).length
      };
      this.endIOTracking(operationId, result);
      return config;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.endIOTracking(operationId, null, false, errorMessage);
      this.warn(`Failed to parse configuration - error: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 解析供应商配置
   */
  private parseProviders(rawProviders: any): Record<string, ProviderConfig> {
    const providers: Record<string, ProviderConfig> = {};

    for (const [providerId, rawProvider] of Object.entries(rawProviders)) {
      if (typeof rawProvider !== 'object' || rawProvider === null) {
        continue;
      }

      const provider: ProviderConfig = {
        id: providerId,
        name: (rawProvider as any).name || providerId,
        type: (rawProvider as any).type || 'unknown',
        endpoint: (rawProvider as any).endpoint,
        models: {},
        auth: {
          type: (rawProvider as any).auth?.type || 'api-key',
          keys: this.extractApiKeys(rawProvider as any)
        }
      };

      // 解析模型配置
      if ((rawProvider as any).models) {
        provider.models = this.parseModels((rawProvider as any).models);
      }

      providers[providerId] = provider;
    }

    return providers;
  }

  /**
   * 提取API密钥
   *
   * @param rawProvider 原始供应商配置
   * @returns API密钥数组
   */
  private extractApiKeys(rawProvider: any): string[] {
    // 首先检查auth.keys字段
    if (Array.isArray(rawProvider.auth?.keys)) {
      return rawProvider.auth.keys;
    }

    // 然后检查api_key字段（兼容旧格式）
    if (Array.isArray(rawProvider.api_key)) {
      return rawProvider.api_key;
    }

    // 检查单个api_key字段
    if (typeof rawProvider.api_key === 'string') {
      return [rawProvider.api_key];
    }

    // 返回空数组
    return [];
  }

  /**
   * 解析模型配置
   */
  private parseModels(rawModels: any): Record<string, ModelConfig> {
    const models: Record<string, ModelConfig> = {};

    for (const [modelId, rawModel] of Object.entries(rawModels)) {
      if (typeof rawModel !== 'object' || rawModel === null) {
        continue;
      }

      const model: ModelConfig = {
        id: modelId,
        name: (rawModel as any).name || modelId,
        contextLength: (rawModel as any).contextLength,
        supportsFunctions: (rawModel as any).supportsFunctions
      };

      models[modelId] = model;
    }

    return models;
  }

  /**
   * 解析虚拟模型配置
   */
  private parseVirtualModels(rawVirtualModels: any): Record<string, VirtualModelConfig> {
    const virtualModels: Record<string, VirtualModelConfig> = {};

    for (const [vmId, rawVm] of Object.entries(rawVirtualModels)) {
      if (typeof rawVm !== 'object' || rawVm === null) {
        continue;
      }

      // 处理targets数组
      let targets = [];
      if (Array.isArray((rawVm as any).targets)) {
        targets = (rawVm as any).targets.map((target: any) => ({
          providerId: target.providerId || '',
          modelId: target.modelId || '',
          keyIndex: target.keyIndex || 0
        }));
      } else if ((rawVm as any).targetProvider && (rawVm as any).targetModel) {
        // 兼容旧格式，转换为新格式
        targets = [{
          providerId: (rawVm as any).targetProvider || '',
          modelId: (rawVm as any).targetModel || '',
          keyIndex: (rawVm as any).keyIndex || 0
        }];
      } else {
        // 默认空目标
        targets = [{
          providerId: '',
          modelId: '',
          keyIndex: 0
        }];
      }

      const virtualModel: VirtualModelConfig = {
        id: vmId,
        targets: targets,
        enabled: (rawVm as any).enabled !== false,
        priority: (rawVm as any).priority || 1
      };

      virtualModels[vmId] = virtualModel;
    }

    return virtualModels;
  }

  /**
   * 从文件解析配置
   *
   * @param configPath 配置文件路径
   * @param options 预处理选项
   * @returns 解析后的配置数据
   */
  public async parseConfigFromFile(configPath: string, options?: PreprocessingOptions): Promise<ConfigData> {
    const operationId = `parse-config-file-${Date.now()}`;
    this.startIOTracking(operationId, { configPath, options }, 'parseConfigFromFile');

    try {
      this.logInfo(`Starting configuration file parsing - configPath: ${configPath}, options: ${JSON.stringify(options || {})}`);

      // 设置默认选项
      const opts: PreprocessingOptions = {
        substituteEnvVars: true,
        processTemplates: true,
        validateData: true,
        enableCaching: true,
        ...options
      };

      // 步骤1: 读取文件
      let rawData = await this.readFile(configPath);

      // 步骤2: 预处理数据
      rawData = await this.preprocessConfig(rawData, opts);
      this.logInfo(`Configuration preprocessed successfully - configPath: ${configPath}, options: ${JSON.stringify(opts)}`);

      // 步骤3: 解析配置（使用现有逻辑）
      const config = await this.parseConfig(rawData);

      this.logInfo(`Configuration parsed successfully from ${configPath}`);
      const result = {
        configPath,
        providerCount: Object.keys(config.providers).length,
        virtualModelCount: Object.keys(config.virtualModels).length,
        options: opts
      };
      this.endIOTracking(operationId, result);
      return config;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.endIOTracking(operationId, null, false, errorMessage);
      this.warn(`Failed to parse configuration from ${configPath} - error: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 预处理配置数据
   * 
   * @param rawData 原始配置数据
   * @param options 预处理选项
   * @returns 预处理后的数据
   */
  public async preprocessConfig(rawData: any, options?: PreprocessingOptions): Promise<any> {
    const operationId = `preprocess-config-${Date.now()}`;
    this.startIOTracking(operationId, { rawData, options }, 'preprocessConfig');

    try {
      const opts: PreprocessingOptions = {
        substituteEnvVars: true,
        processTemplates: true,
        validateData: true,
        ...options
      };

      let processedData = rawData;

      // 步骤1: 环境变量替换
      if (opts.substituteEnvVars) {
        processedData = this.substituteEnvVars(processedData);
      }

      // 步骤2: 模板处理
      if (opts.processTemplates) {
        processedData = this.processTemplates(processedData);
      }

      // 步骤3: 自定义处理器
      if (opts.customProcessors && opts.customProcessors.length > 0) {
        processedData = this.applyCustomProcessors(processedData, opts.customProcessors);
      }

      // 步骤4: 验证
      if (opts.validateData) {
        this.validatePreprocessedData(processedData);
      }

      const result = {
        options: opts,
        stepsApplied: [
          opts.substituteEnvVars && 'envVarSubstitution',
          opts.processTemplates && 'templateProcessing',
          opts.customProcessors && opts.customProcessors.length > 0 && 'customProcessors',
          opts.validateData && 'validation'
        ].filter(Boolean)
      };
      this.endIOTracking(operationId, result);
      return processedData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.endIOTracking(operationId, null, false, errorMessage);
      throw error;
    }
  }

  /**
   * 翻译配置
   * 
   * @param config 配置数据
   * @param locale 语言环境
   * @returns 翻译后的配置数据
   */
  public async translateConfig(config: ConfigData, locale?: string): Promise<ConfigData> {
    const operationId = `translate-config-${Date.now()}`;
    this.startIOTracking(operationId, { locale, providerCount: Object.keys(config.providers).length }, 'translateConfig');

    try {
      // 基本翻译支持
      if (locale) {
        this.warn(`Translation to locale ${locale} requested but not implemented`);
        // 在实际实现中，这里会进行键值翻译
        // 例如：将配置中的英文键翻译为其他语言
        // 这可以基于翻译资源文件或外部翻译服务
      }

      const result = {
        locale,
        translated: !!locale,
        providerCount: Object.keys(config.providers).length
      };
      this.endIOTracking(operationId, result);
      return config;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.endIOTracking(operationId, null, false, errorMessage);
      throw error;
    }
  }

  /**
   * 读取配置文件
   *
   * @param configPath 配置文件路径
   * @returns 解析后的文件内容
   */
  private async readFile(configPath: string): Promise<any> {
    const operationId = `read-config-file-${Date.now()}`;

    try {
      const stats = await fs.stat(configPath);
      this.startIOTracking(operationId, { configPath, fileSize: stats.size }, 'readFile');

      this.logInfo(`Reading configuration file - configPath: ${configPath}, fileSize: ${stats.size}`);

      // 检查文件是否存在
      await fs.access(configPath);

      // 读取文件内容
      const content = await fs.readFile(configPath, 'utf-8');

      let parsedData: any;
      // 根据文件扩展名解析
      if (configPath.endsWith('.json')) {
        parsedData = JSON.parse(content);
      } else if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
        // YAML支持需要额外的包
        throw new Error('YAML support not implemented');
      } else {
        // 默认为JSON
        parsedData = JSON.parse(content);
      }

      this.logInfo(`File read successfully - configPath: ${configPath}, dataType: ${typeof parsedData}`);

      const result = {
        configPath,
        fileSize: stats.size,
        fileType: configPath.split('.').pop() || 'unknown',
        dataType: typeof parsedData
      };
      this.endIOTracking(operationId, result);
      return parsedData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.endIOTracking(operationId, null, false, errorMessage);
      this.warn(`Failed to read configuration file - configPath: ${configPath}, error: ${errorMessage}`);

      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Configuration file not found: ${configPath}`);
      }
      throw new Error(`Failed to read configuration file ${configPath}: ${error}`);
    }
  }

  /**
   * 环境变量替换
   * 
   * @param data 配置数据
   * @returns 替换环境变量后的数据
   */
  private substituteEnvVars(data: any): any {
    if (typeof data === 'string') {
      return data.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
        return process.env[envVar] || match;
      });
    } else if (Array.isArray(data)) {
      return data.map(item => this.substituteEnvVars(item));
    } else if (typeof data === 'object' && data !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.substituteEnvVars(value);
      }
      return result;
    }
    return data;
  }

  /**
   * 模板处理
   * 
   * @param data 配置数据
   * @returns 处理模板后的数据
   */
  private processTemplates(data: any): any {
    // 基本模板处理
    // 支持简单的变量插值: {{variable}}
    if (typeof data === 'string') {
      return data.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
        // 简单的变量查找，可以从环境变量或预定义变量中获取
        return process.env[variable.trim()] || match;
      });
    } else if (Array.isArray(data)) {
      return data.map(item => this.processTemplates(item));
    } else if (typeof data === 'object' && data !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.processTemplates(value);
      }
      return result;
    }
    return data;
  }

  /**
   * 验证预处理的数据
   * 
   * @param data 预处理后的数据
   * @returns 验证是否通过
   */
  private validatePreprocessedData(data: any): boolean {
    const operationId = `validate-config-data-${Date.now()}`;
    this.startIOTracking(operationId, { dataSize: JSON.stringify(data).length }, 'validatePreprocessedData');

    try {
      // 基本验证检查
      if (!data || typeof data !== 'object') {
        throw new Error('Configuration data must be an object');
      }

      // 检查必需字段
      if (data.providers !== undefined && typeof data.providers !== 'object') {
        throw new Error('Configuration providers must be an object');
      }

      if (data.virtualModels !== undefined && typeof data.virtualModels !== 'object') {
        throw new Error('Configuration virtualModels must be an object');
      }

      let validationErrors: string[] = [];

      // 验证供应商配置结构
      if (data.providers) {
        for (const [providerId, provider] of Object.entries(data.providers as Record<string, any>)) {
          if (typeof provider !== 'object' || provider === null) {
            throw new Error(`Provider ${providerId} must be an object`);
          }

          // 检查必需字段
          if (!provider.name) {
            validationErrors.push(`Provider ${providerId} missing name field`);
            this.warn(`Provider ${providerId} missing name field`);
          }

          if (!provider.type) {
            validationErrors.push(`Provider ${providerId} missing type field`);
            this.warn(`Provider ${providerId} missing type field`);
          }

          // 验证模型结构
          if (provider.models !== undefined && typeof provider.models !== 'object') {
            throw new Error(`Provider ${providerId} models must be an object`);
          }

          if (provider.models) {
            for (const [modelId, model] of Object.entries(provider.models as Record<string, any>)) {
              if (typeof model !== 'object' || model === null) {
                throw new Error(`Model ${modelId} in provider ${providerId} must be an object`);
              }

              if (!model.name) {
                validationErrors.push(`Model ${modelId} in provider ${providerId} missing name field`);
                this.warn(`Model ${modelId} in provider ${providerId} missing name field`);
              }
            }
          }
        }
      }

      // 验证虚拟模型配置结构
      if (data.virtualModels) {
        for (const [vmId, vm] of Object.entries(data.virtualModels as Record<string, any>)) {
          if (typeof vm !== 'object' || vm === null) {
            throw new Error(`Virtual model ${vmId} must be an object`);
          }

          // 检查targets数组
          if (vm.targets !== undefined && !Array.isArray(vm.targets)) {
            throw new Error(`Virtual model ${vmId} targets must be an array`);
          }

          if (vm.targets) {
            for (let i = 0; i < vm.targets.length; i++) {
              const target = vm.targets[i];
              if (typeof target !== 'object' || target === null) {
                throw new Error(`Virtual model ${vmId} target ${i} must be an object`);
              }

              if (!target.providerId) {
                validationErrors.push(`Virtual model ${vmId} target ${i} missing providerId`);
                this.warn(`Virtual model ${vmId} target ${i} missing providerId`);
              }

              if (!target.modelId) {
                validationErrors.push(`Virtual model ${vmId} target ${i} missing modelId`);
                this.warn(`Virtual model ${vmId} target ${i} missing modelId`);
              }
            }
          }
        }
      }

      const result = {
        valid: validationErrors.length === 0,
        validationErrors,
        providerCount: data.providers ? Object.keys(data.providers).length : 0,
        virtualModelCount: data.virtualModels ? Object.keys(data.virtualModels).length : 0
      };
      this.endIOTracking(operationId, result);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.endIOTracking(operationId, null, false, errorMessage);
      throw error;
    }
  }

  /**
   * 应用自定义处理器
   * 
   * @param data 配置数据
   * @param processors 自定义处理器函数数组
   * @returns 处理后的数据
   */
  private applyCustomProcessors(data: any, processors: Function[]): any {
    let processedData = data;
    for (const processor of processors) {
      if (typeof processor === 'function') {
        processedData = processor(processedData);
      }
    }
    return processedData;
  }

  /**
   * 销毁解析器
   */
  public async destroy(): Promise<void> {
    const operationId = `destroy-config-parser-${Date.now()}`;
    this.startIOTracking(operationId, null, 'destroy');

    try {
      this.logInfo('Destroying ConfigParser');
      // Clean up resources
      this.logInfo('ConfigParser destroyed successfully');
      this.endIOTracking(operationId, { destroyed: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.endIOTracking(operationId, null, false, errorMessage);
      throw error;
    }
  }

  /**
   * Generate ServerModule wrapper from ConfigData
   *
   * Transforms ConfigData into ServerModule-compatible format
   * Contains only HTTP server configuration, no virtual model information
   *
   * @param config Parsed configuration data
   * @returns ServerWrapper configuration
   */
  public generateServerWrapper(config: ConfigData): ServerWrapper {
    const operationId = `generate-server-wrapper-${Date.now()}`;
    this.startIOTracking(operationId, { configVersion: config.version }, 'generateServerWrapper');

    try {
      this.logInfo('Generating ServerModule wrapper configuration');

      // Extract server configuration from config or use defaults
      const serverConfig = this.extractServerConfig(config);

      const serverWrapper: ServerWrapper = {
        port: serverConfig.port || 5506,
        host: serverConfig.host || 'localhost',
        cors: {
          origin: serverConfig.cors?.origin || ['*'],
          credentials: serverConfig.cors?.credentials !== false
        },
        compression: serverConfig.compression !== false,
        helmet: serverConfig.helmet !== false,
        rateLimit: {
          windowMs: serverConfig.rateLimit?.windowMs || 15 * 60 * 1000, // 15 minutes
          max: serverConfig.rateLimit?.max || 100
        },
        timeout: serverConfig.timeout || 30000,
        bodyLimit: serverConfig.bodyLimit || '10mb',
        pipeline: {
          enabled: true,
          unifiedErrorHandling: true,
          unifiedMonitoring: true,
          errorMapping: {
            'ECONNREFUSED': 'SERVICE_UNAVAILABLE',
            'ETIMEDOUT': 'TIMEOUT_ERROR',
            'EAI_AGAIN': 'DNS_RESOLUTION_FAILED'
          }
        }
      };

      this.logInfo('ServerModule wrapper generated successfully');
      this.endIOTracking(operationId, {
        port: serverWrapper.port,
        host: serverWrapper.host,
        corsEnabled: true,
        compressionEnabled: serverWrapper.compression
      });

      return serverWrapper;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.endIOTracking(operationId, null, false, errorMessage);
      this.warn(`Failed to generate ServerModule wrapper - error: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Generate PipelineAssembler wrapper from ConfigData
   *
   * Transforms ConfigData into PipelineAssembler-compatible format
   * Contains virtual model routing tables and module configurations
   *
   * @param config Parsed configuration data
   * @returns PipelineWrapper configuration
   */
  public generatePipelineWrapper(config: ConfigData): PipelineWrapper {
    const operationId = `generate-pipeline-wrapper-${Date.now()}`;
    this.startIOTracking(operationId, {
      configVersion: config.version,
      providerCount: Object.keys(config.providers).length,
      virtualModelCount: Object.keys(config.virtualModels).length
    }, 'generatePipelineWrapper');

    try {
      this.logInfo('Generating PipelineAssembler wrapper configuration');

      // Transform virtual models
      const virtualModels = this.transformVirtualModels(config.virtualModels);

      // Generate module configurations
      const modules = this.generateModuleConfigs(config);

      // Generate routing configuration
      const routing = this.generateRoutingConfig(config);

      const pipelineWrapper: PipelineWrapper = {
        virtualModels,
        modules,
        routing,
        metadata: {
          version: config.version,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
          providerCount: Object.keys(config.providers).length,
          virtualModelCount: Object.keys(config.virtualModels).length
        }
      };

      this.logInfo('PipelineAssembler wrapper generated successfully');
      this.endIOTracking(operationId, {
        virtualModelCount: pipelineWrapper.virtualModels.length,
        moduleCount: pipelineWrapper.modules.length,
        routingStrategy: pipelineWrapper.routing.strategy
      });

      return pipelineWrapper;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.endIOTracking(operationId, null, false, errorMessage);
      this.warn(`Failed to generate PipelineAssembler wrapper - error: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Extract server configuration from ConfigData
   */
  private extractServerConfig(config: ConfigData): any {
    // Look for server configuration in different possible locations
    const serverConfig = (config as any).server || {};
    const rccConfig = (config as any).rcc || {};

    return {
      ...serverConfig,
      ...rccConfig.server,
      // Use port from rcc config if available
      port: serverConfig.port || rccConfig.port || 5506,
      host: serverConfig.host || rccConfig.host || 'localhost'
    };
  }

  /**
   * Transform virtual models for PipelineAssembler format
   */
  private transformVirtualModels(virtualModels: Record<string, VirtualModelConfig>): VirtualModelConfig[] {
    const transformed: VirtualModelConfig[] = [];

    for (const [vmId, vmConfig] of Object.entries(virtualModels)) {
      if (!vmConfig.enabled) {
        continue; // Skip disabled virtual models
      }

      // Transform to PipelineAssembler VirtualModelConfig format
      const transformedVm: VirtualModelConfig = {
        id: vmId,
        name: vmConfig.id, // Use ID as name for now
        modelId: vmConfig.targets[0]?.modelId || '', // Use first target as primary
        provider: vmConfig.targets[0]?.providerId || '', // Use first target as primary
        enabled: vmConfig.enabled,
        targets: vmConfig.targets.map(target => ({
          providerId: target.providerId,
          modelId: target.modelId,
          weight: vmConfig.weight || 1.0,
          enabled: true,
          keyIndex: target.keyIndex || 0
        })),
        capabilities: ['chat', 'function-calling'], // Default capabilities
        metadata: {
          priority: vmConfig.priority,
          weight: vmConfig.weight,
          targetCount: vmConfig.targets.length
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transformed.push(transformedVm);
    }

    return transformed;
  }

  /**
   * Generate module configurations for PipelineAssembler
   */
  private generateModuleConfigs(config: ConfigData): ModuleConfig[] {
    const modules: ModuleConfig[] = [];

    // Add core pipeline modules
    modules.push({
      id: 'llmswitch',
      type: 'switch',
      config: {
        strategy: 'weighted',
        healthCheck: {
          enabled: true,
          interval: 30000
        }
      },
      enabled: true,
      priority: 1
    });

    modules.push({
      id: 'workflow',
      type: 'processor',
      config: {
        maxSteps: 100,
        timeout: 300000
      },
      enabled: true,
      priority: 2
    });

    modules.push({
      id: 'compatibility',
      type: 'transformer',
      config: {
        targetFormat: 'openai',
        enableBackwardCompatibility: true
      },
      enabled: true,
      priority: 3
    });

    // Add provider modules based on config
    for (const [providerId, providerConfig] of Object.entries(config.providers)) {
      modules.push({
        id: `provider-${providerId}`,
        type: 'provider',
        config: {
          providerId,
          endpoint: providerConfig.endpoint,
          auth: providerConfig.auth,
          models: Object.keys(providerConfig.models)
        },
        enabled: true,
        priority: 10
      });
    }

    return modules;
  }

  /**
   * Generate routing configuration for PipelineAssembler
   */
  private generateRoutingConfig(config: ConfigData): RoutingConfig {
    return {
      strategy: 'weighted',
      fallbackStrategy: 'round-robin',
      rules: [
        {
          condition: 'default',
          action: 'allow',
          target: 'primary'
        }
      ]
    };
  }

  /**
   * Generate both wrappers from ConfigData
   *
   * Convenience method to generate both ServerModule and PipelineAssembler wrappers
   *
   * @param config Parsed configuration data
   * @returns Object containing both wrappers
   */
  public generateAllWrappers(config: ConfigData): {
    server: ServerWrapper;
    pipeline: PipelineWrapper;
  } {
    const operationId = `generate-all-wrappers-${Date.now()}`;
    this.startIOTracking(operationId, { configVersion: config.version }, 'generateAllWrappers');

    try {
      this.logInfo('Generating all configuration wrappers');

      const server = this.generateServerWrapper(config);
      const pipeline = this.generatePipelineWrapper(config);

      this.logInfo('All configuration wrappers generated successfully');
      this.endIOTracking(operationId, {
        serverGenerated: true,
        pipelineGenerated: true,
        serverPort: server.port,
        pipelineVmCount: pipeline.virtualModels.length
      });

      return { server, pipeline };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.endIOTracking(operationId, null, false, errorMessage);
      this.warn(`Failed to generate all wrappers - error: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 处理系统消息
   */
  protected async handleMessage(message: any): Promise<any> {
    switch (message.type) {
      case 'module_registered':
        // 处理模块注册消息，记录模块信息
        this.logInfo(`Module registered: ${message.payload?.moduleId || 'unknown'}`, {
          moduleId: message.payload?.moduleId,
          moduleType: message.payload?.moduleType,
          source: message.source
        });
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { acknowledged: true },
          timestamp: Date.now()
        };
      default:
        // 对于其他消息类型，调用父类的默认处理
        return await super.handleMessage(message);
    }
  }
}