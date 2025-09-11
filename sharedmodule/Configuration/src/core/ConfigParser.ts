/**
 * 配置解析器
 * 
 * 负责将原始配置数据解析为标准化的ConfigData结构
 */

import { ConfigData, ProviderConfig, ModelConfig, VirtualModelConfig } from './ConfigData';

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
          keys: Array.isArray((rawProvider as any).auth?.keys) ? (rawProvider as any).auth.keys : []
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
   * 销毁解析器
   */
  public async destroy(): Promise<void> {
    this.initialized = false;
    console.log('ConfigParser destroyed successfully');
  }
}