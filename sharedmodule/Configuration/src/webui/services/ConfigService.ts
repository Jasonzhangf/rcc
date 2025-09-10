/**
 * 配置服务
 * 
 * 提供配置生成、验证、模板管理等业务功能
 */

import { 
  UIService, 
  ProviderConfig, 
  ModelConfig, 
  VirtualModelConfig, 
  RouteConfig 
} from '../types/ui.types';
import { ConfigData } from '../../interfaces/IConfigurationSystem';

/**
 * 配置服务类
 */
export class ConfigService implements UIService {
  private initialized = false;
  private templates: Record<string, any> = {};
  private providerDefaults: Record<string, any> = {};

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    try {
      // 加载默认模板
      await this.loadDefaultTemplates();
      
      // 加载供应商默认配置
      await this.loadProviderDefaults();
      
      this.initialized = true;
      console.log('ConfigService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ConfigService:', error);
      throw error;
    }
  }

  /**
   * 配置服务
   */
  public configure(options: any): void {
    // 可以用于配置服务选项
    console.log('ConfigService configured with options:', options);
  }

  /**
   * 获取服务状态
   */
  public getStatus(): any {
    return {
      initialized: this.initialized,
      templatesLoaded: Object.keys(this.templates).length,
      providersSupported: Object.keys(this.providerDefaults).length
    };
  }

  /**
   * 加载默认模板
   */
  private async loadDefaultTemplates(): Promise<void> {
    this.templates = {
      'single-provider': {
        name: '单供应商模板',
        description: '适用于单一LLM供应商的简单配置',
        providers: [
          {
            id: 'openai',
            name: 'OpenAI',
            type: 'openai',
            endpoint: 'https://api.openai.com/v1',
            models: [
              {
                id: 'gpt-4',
                name: 'GPT-4',
                contextLength: 8192,
                supportsFunctions: true,
                enabled: true
              },
              {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                contextLength: 4096,
                supportsFunctions: true,
                enabled: true
              }
            ],
            auth: {
              type: 'api-key',
              keys: []
            },
            enabled: true
          }
        ],
        virtualModels: [
          {
            name: 'claude-3-sonnet',
            targetModel: 'gpt-4',
            targetProvider: 'openai',
            enabled: true
          }
        ],
        routes: []
      },
      
      'multi-provider': {
        name: '多供应商模板',
        description: '支持多个LLM供应商的复合配置',
        providers: [
          {
            id: 'openai',
            name: 'OpenAI',
            type: 'openai',
            endpoint: 'https://api.openai.com/v1',
            models: [
              {
                id: 'gpt-4',
                name: 'GPT-4',
                contextLength: 8192,
                supportsFunctions: true,
                enabled: true
              }
            ],
            auth: {
              type: 'api-key',
              keys: []
            },
            enabled: true
          },
          {
            id: 'anthropic',
            name: 'Anthropic',
            type: 'anthropic',
            endpoint: 'https://api.anthropic.com/v1',
            models: [
              {
                id: 'claude-3-sonnet',
                name: 'Claude 3 Sonnet',
                contextLength: 200000,
                supportsFunctions: true,
                enabled: true
              }
            ],
            auth: {
              type: 'api-key',
              keys: []
            },
            enabled: true
          }
        ],
        virtualModels: [],
        routes: []
      },
      
      'enterprise': {
        name: '企业级模板',
        description: '适用于企业环境的高级配置',
        providers: [
          {
            id: 'local-llm',
            name: '本地LLM',
            type: 'local',
            endpoint: 'http://localhost:1234/v1',
            models: [
              {
                id: 'local-model',
                name: '本地模型',
                contextLength: 4096,
                supportsFunctions: false,
                enabled: true
              }
            ],
            auth: {
              type: 'api-key',
              keys: ['local-key']
            },
            enabled: true
          }
        ],
        virtualModels: [],
        routes: []
      }
    };
  }

  /**
   * 加载供应商默认配置
   */
  private async loadProviderDefaults(): Promise<void> {
    this.providerDefaults = {
      openai: {
        name: 'OpenAI',
        type: 'openai',
        endpoint: 'https://api.openai.com/v1',
        models: [
          { id: 'gpt-4', name: 'GPT-4', contextLength: 8192, supportsFunctions: true },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextLength: 128000, supportsFunctions: true },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextLength: 4096, supportsFunctions: true }
        ],
        auth: { type: 'api-key', keys: [] },
        limits: { rateLimit: 3500, maxTokens: 4096, timeout: 30000 }
      },
      
      anthropic: {
        name: 'Anthropic',
        type: 'anthropic',
        endpoint: 'https://api.anthropic.com/v1',
        models: [
          { id: 'claude-3-opus', name: 'Claude 3 Opus', contextLength: 200000, supportsFunctions: true },
          { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', contextLength: 200000, supportsFunctions: true },
          { id: 'claude-3-haiku', name: 'Claude 3 Haiku', contextLength: 200000, supportsFunctions: true }
        ],
        auth: { type: 'api-key', keys: [] },
        limits: { rateLimit: 1000, maxTokens: 4096, timeout: 30000 }
      },
      
      google: {
        name: 'Google AI',
        type: 'google',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        models: [
          { id: 'gemini-pro', name: 'Gemini Pro', contextLength: 32768, supportsFunctions: true },
          { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', contextLength: 16384, supportsFunctions: false }
        ],
        auth: { type: 'api-key', keys: [] },
        limits: { rateLimit: 60, maxTokens: 2048, timeout: 30000 }
      },
      
      local: {
        name: '本地LLM',
        type: 'local',
        endpoint: 'http://localhost:1234/v1',
        models: [
          { id: 'local-model', name: '本地模型', contextLength: 4096, supportsFunctions: false }
        ],
        auth: { type: 'api-key', keys: ['local-key'] },
        limits: { rateLimit: 1000, maxTokens: 4096, timeout: 60000 }
      }
    };
  }

  /**
   * 获取模板
   */
  public async getTemplate(templateType: string): Promise<any> {
    return this.templates[templateType] || null;
  }

  /**
   * 获取所有模板
   */
  public async getAllTemplates(): Promise<any[]> {
    return Object.keys(this.templates).map(key => ({
      id: key,
      ...this.templates[key]
    }));
  }

  /**
   * 获取供应商默认配置
   */
  public getProviderDefaults(providerType: string): any {
    return this.providerDefaults[providerType] || null;
  }

  /**
   * 获取所有支持的供应商类型
   */
  public getSupportedProviders(): string[] {
    return Object.keys(this.providerDefaults);
  }

  /**
   * 生成配置
   */
  public async generateConfig(options: {
    providers: ProviderConfig[];
    virtualModels: VirtualModelConfig[];
    routes: RouteConfig[];
  }): Promise<ConfigData> {
    const now = new Date().toISOString();
    
    const config: ConfigData = {
      metadata: {
        name: 'RCC Configuration',
        description: 'Generated configuration for RCC Claude Code Router',
        createdAt: now,
        updatedAt: now,
        author: 'RCC Configuration Generator',
        environment: 'development'
      },
      settings: {
        general: {
          port: 5506,
          debug: true,
          cors: {
            enabled: true,
            origins: ['*']
          }
        },
        providers: this.convertProvidersToSettings(options.providers),
        virtualModels: this.convertVirtualModelsToSettings(options.virtualModels),
        routes: this.convertRoutesToSettings(options.routes),
        security: {
          rateLimiting: {
            enabled: true,
            maxRequests: 100,
            windowMs: 60000
          },
          authentication: {
            required: false
          }
        },
        monitoring: {
          logging: {
            level: 'info',
            file: './logs/rcc.log'
          },
          metrics: {
            enabled: true,
            endpoint: '/metrics'
          }
        }
      },
      version: '1.0.0'
    };

    return config;
  }

  /**
   * 转换供应商配置
   */
  private convertProvidersToSettings(providers: ProviderConfig[]): any {
    const settings: any = {};
    
    for (const provider of providers) {
      if (!provider.enabled) continue;
      
      settings[provider.id] = {
        name: provider.name,
        type: provider.type,
        endpoint: provider.endpoint,
        models: provider.models.reduce((acc, model) => {
          if (model.enabled) {
            acc[model.id] = {
              name: model.name,
              contextLength: model.contextLength,
              supportsFunctions: model.supportsFunctions
            };
          }
          return acc;
        }, {} as any),
        auth: {
          type: provider.auth.type,
          keys: provider.auth.keys
        },
        limits: provider.limits || {
          rateLimit: 1000,
          maxTokens: 4096,
          timeout: 30000
        }
      };
    }
    
    return settings;
  }

  /**
   * 转换虚拟模型配置
   */
  private convertVirtualModelsToSettings(virtualModels: VirtualModelConfig[]): any {
    const settings: any = {};
    
    for (const vm of virtualModels) {
      if (!vm.enabled) continue;
      
      settings[vm.name] = {
        targetProvider: vm.targetProvider,
        targetModel: vm.targetModel,
        weight: vm.weight || 1
      };
    }
    
    return settings;
  }

  /**
   * 转换路由配置
   */
  private convertRoutesToSettings(routes: RouteConfig[]): any {
    const settings: any = {};
    
    for (const route of routes) {
      if (!route.enabled) continue;
      
      settings[route.id] = {
        path: route.path,
        provider: route.provider,
        model: route.model,
        weight: route.weight || 1,
        healthCheck: route.healthCheck || {
          enabled: true,
          interval: 30000,
          timeout: 5000
        }
      };
    }
    
    return settings;
  }

  /**
   * 验证配置
   */
  public async validateConfig(config: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证供应商配置
    if (!config.providers || Object.keys(config.providers).length === 0) {
      errors.push('至少需要配置一个供应商');
    } else {
      for (const [providerId, provider] of Object.entries(config.providers as any)) {
        if (!provider.name) {
          errors.push(`供应商 ${providerId} 缺少名称`);
        }
        if (!provider.endpoint) {
          errors.push(`供应商 ${providerId} 缺少端点地址`);
        }
        if (!provider.auth || !provider.auth.keys || provider.auth.keys.length === 0) {
          warnings.push(`供应商 ${providerId} 缺少API密钥`);
        }
        if (!provider.models || Object.keys(provider.models).length === 0) {
          errors.push(`供应商 ${providerId} 缺少模型配置`);
        }
      }
    }

    // 验证虚拟模型配置
    if (config.virtualModels) {
      for (const [vmName, vm] of Object.entries(config.virtualModels as any)) {
        if (!vm.targetProvider) {
          errors.push(`虚拟模型 ${vmName} 缺少目标供应商`);
        }
        if (!vm.targetModel) {
          errors.push(`虚拟模型 ${vmName} 缺少目标模型`);
        }
        
        // 检查目标供应商是否存在
        if (vm.targetProvider && !config.providers[vm.targetProvider]) {
          errors.push(`虚拟模型 ${vmName} 的目标供应商 ${vm.targetProvider} 不存在`);
        }
        
        // 检查目标模型是否存在
        if (vm.targetProvider && vm.targetModel && config.providers[vm.targetProvider]) {
          const provider = config.providers[vm.targetProvider];
          if (!provider.models[vm.targetModel]) {
            errors.push(`虚拟模型 ${vmName} 的目标模型 ${vm.targetModel} 在供应商 ${vm.targetProvider} 中不存在`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 优化配置
   */
  public async optimizeConfig(config: any): Promise<any> {
    const optimizedConfig = JSON.parse(JSON.stringify(config));
    
    // 移除空的配置项
    this.removeEmptyProperties(optimizedConfig);
    
    // 合并重复的配置
    this.mergeDuplicateConfigs(optimizedConfig);
    
    // 优化限制设置
    this.optimizeLimits(optimizedConfig);
    
    return optimizedConfig;
  }

  /**
   * 移除空属性
   */
  private removeEmptyProperties(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (value === null || value === undefined || value === '') {
          delete obj[key];
        } else if (typeof value === 'object') {
          if (Array.isArray(value)) {
            if (value.length === 0) {
              delete obj[key];
            }
          } else {
            this.removeEmptyProperties(value);
            if (Object.keys(value).length === 0) {
              delete obj[key];
            }
          }
        }
      }
    }
  }

  /**
   * 合并重复配置
   */
  private mergeDuplicateConfigs(config: any): void {
    // 这里可以实现合并重复配置的逻辑
    // 例如合并相同的供应商配置等
  }

  /**
   * 优化限制设置
   */
  private optimizeLimits(config: any): void {
    if (config.providers) {
      for (const provider of Object.values(config.providers) as any[]) {
        if (provider.limits) {
          // 根据供应商类型优化限制设置
          if (provider.type === 'openai') {
            provider.limits.rateLimit = Math.min(provider.limits.rateLimit || 3500, 3500);
          } else if (provider.type === 'anthropic') {
            provider.limits.rateLimit = Math.min(provider.limits.rateLimit || 1000, 1000);
          }
        }
      }
    }
  }

  /**
   * 导出配置
   */
  public async exportConfig(config: any, format: 'json' | 'yaml' | 'toml' = 'json'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);
      case 'yaml':
        // 这里需要YAML库来实现
        return JSON.stringify(config, null, 2); // 临时返回JSON
      case 'toml':
        // 这里需要TOML库来实现
        return JSON.stringify(config, null, 2); // 临时返回JSON
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 导入配置
   */
  public async importConfig(data: string, format: 'json' | 'yaml' | 'toml' = 'json'): Promise<any> {
    try {
      switch (format) {
        case 'json':
          return JSON.parse(data);
        case 'yaml':
          // 这里需要YAML库来实现
          return JSON.parse(data); // 临时用JSON解析
        case 'toml':
          // 这里需要TOML库来实现
          return JSON.parse(data); // 临时用JSON解析
        default:
          throw new Error(`不支持的导入格式: ${format}`);
      }
    } catch (error) {
      throw new Error(`解析配置数据失败: ${error}`);
    }
  }

  /**
   * 获取配置统计信息
   */
  public getConfigStatistics(config: any): any {
    const stats = {
      totalProviders: 0,
      totalModels: 0,
      totalVirtualModels: 0,
      totalRoutes: 0,
      enabledProviders: 0,
      totalApiKeys: 0
    };

    if (config.providers) {
      stats.totalProviders = Object.keys(config.providers).length;
      
      for (const provider of Object.values(config.providers) as any[]) {
        if (provider.enabled !== false) {
          stats.enabledProviders++;
        }
        
        if (provider.models) {
          stats.totalModels += Object.keys(provider.models).length;
        }
        
        if (provider.auth && provider.auth.keys) {
          stats.totalApiKeys += provider.auth.keys.length;
        }
      }
    }

    if (config.virtualModels) {
      stats.totalVirtualModels = Object.keys(config.virtualModels).length;
    }

    if (config.routes) {
      stats.totalRoutes = Object.keys(config.routes).length;
    }

    return stats;
  }

  /**
   * 生成配置文档
   */
  public generateConfigDocumentation(config: any): string {
    let doc = '# RCC Configuration Documentation\n\n';
    
    doc += '## 概述\n\n';
    doc += `该配置文件包含 ${config.providers ? Object.keys(config.providers).length : 0} 个供应商和 ${config.virtualModels ? Object.keys(config.virtualModels).length : 0} 个虚拟模型的配置。\n\n`;
    
    if (config.providers) {
      doc += '## 供应商配置\n\n';
      for (const [providerId, provider] of Object.entries(config.providers) as [string, any][]) {
        doc += `### ${provider.name || providerId}\n\n`;
        doc += `- **类型**: ${provider.type}\n`;
        doc += `- **端点**: ${provider.endpoint}\n`;
        doc += `- **模型数量**: ${provider.models ? Object.keys(provider.models).length : 0}\n`;
        doc += `- **API密钥数量**: ${provider.auth && provider.auth.keys ? provider.auth.keys.length : 0}\n\n`;
      }
    }
    
    if (config.virtualModels) {
      doc += '## 虚拟模型配置\n\n';
      for (const [vmName, vm] of Object.entries(config.virtualModels) as [string, any][]) {
        doc += `### ${vmName}\n\n`;
        doc += `- **目标供应商**: ${vm.targetProvider}\n`;
        doc += `- **目标模型**: ${vm.targetModel}\n`;
        doc += `- **权重**: ${vm.weight || 1}\n\n`;
      }
    }
    
    return doc;
  }
}