/**
 * 配置解析器
 * 
 * 负责将原始配置数据解析为标准化的ConfigData结构
 */

import { ConfigData, ProviderConfig, ModelConfig, VirtualModelConfig } from './ConfigData';
import * as fs from 'fs/promises';

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
export class ConfigParser {
  private initialized = false;

  /**
   * 初始化解析器
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    console.log('ConfigParser initialized successfully');
  }

  /**
   * 解析配置数据
   */
  public async parseConfig(rawData: any): Promise<ConfigData> {
    try {
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
      }

      // 解析虚拟模型配置
      if (rawData.virtualModels) {
        config.virtualModels = this.parseVirtualModels(rawData.virtualModels);
      }

      // 更新时间戳
      config.updatedAt = new Date().toISOString();

      console.log('Configuration parsed successfully');
      return config;
    } catch (error) {
      console.error('Failed to parse configuration:', error);
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
    try {
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

      // 步骤3: 解析配置（使用现有逻辑）
      const config = await this.parseConfig(rawData);

      console.log(`Configuration parsed successfully from ${configPath}`);
      return config;
    } catch (error) {
      console.error(`Failed to parse configuration from ${configPath}:`, error);
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

    return processedData;
  }

  /**
   * 翻译配置
   * 
   * @param config 配置数据
   * @param locale 语言环境
   * @returns 翻译后的配置数据
   */
  public async translateConfig(config: ConfigData, locale?: string): Promise<ConfigData> {
    // 基本翻译支持
    if (locale) {
      console.log(`Translation to locale ${locale} requested but not implemented`);
      // 在实际实现中，这里会进行键值翻译
      // 例如：将配置中的英文键翻译为其他语言
      // 这可以基于翻译资源文件或外部翻译服务
    }
    return config;
  }

  /**
   * 读取配置文件
   * 
   * @param configPath 配置文件路径
   * @returns 解析后的文件内容
   */
  private async readFile(configPath: string): Promise<any> {
    try {
      // 检查文件是否存在
      await fs.access(configPath);
      
      // 读取文件内容
      const content = await fs.readFile(configPath, 'utf-8');
      
      // 根据文件扩展名解析
      if (configPath.endsWith('.json')) {
        return JSON.parse(content);
      } else if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
        // YAML支持需要额外的包
        throw new Error('YAML support not implemented');
      } else {
        // 默认为JSON
        return JSON.parse(content);
      }
    } catch (error) {
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
    
    // 验证供应商配置结构
    if (data.providers) {
      for (const [providerId, provider] of Object.entries(data.providers as Record<string, any>)) {
        if (typeof provider !== 'object' || provider === null) {
          throw new Error(`Provider ${providerId} must be an object`);
        }
        
        // 检查必需字段
        if (!provider.name) {
          console.warn(`Provider ${providerId} missing name field`);
        }
        
        if (!provider.type) {
          console.warn(`Provider ${providerId} missing type field`);
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
              console.warn(`Model ${modelId} in provider ${providerId} missing name field`);
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
              console.warn(`Virtual model ${vmId} target ${i} missing providerId`);
            }
            
            if (!target.modelId) {
              console.warn(`Virtual model ${vmId} target ${i} missing modelId`);
            }
          }
        }
      }
    }
    
    return true;
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
    this.initialized = false;
    console.log('ConfigParser destroyed successfully');
  }
}