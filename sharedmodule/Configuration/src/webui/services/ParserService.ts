/**
 * 解析服务
 * 
 * 提供用户配置解析、流水线生成等业务功能
 */

import { 
  UIService, 
  UserConfig, 
  PipelineConfig, 
  ParseResult 
} from '../types/ui.types';
import { FileSystemService } from './FileSystemService';

/**
 * 配置解析器类
 * 
 * 根据解析规则将用户配置转换为流水线配置:
 * 1. provider.model.key = 1条独立流水线
 * 2. 多个virtualmodel可指向同一流水线
 * 3. 1个virtualmodel可有多条流水线  
 * 4. 1个provider多个key = 扩展为多条流水线
 */
export class ParserService implements UIService {
  private initialized = false;
  private parseRules: any = {};
  private fileSystemService: FileSystemService | null = null;

  /**
   * 初始化服务
   */
  public async initialize(fileSystemService?: FileSystemService): Promise<void> {
    try {
      // 设置文件系统服务
      if (fileSystemService) {
        this.fileSystemService = fileSystemService;
      }
      
      // 初始化解析规则
      this.initializeParseRules();
      
      this.initialized = true;
      console.log('ParserService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ParserService:', error);
      throw error;
    }
  }

  /**
   * 配置服务
   */
  public configure(options: any): void {
    if (options.parseRules) {
      this.parseRules = { ...this.parseRules, ...options.parseRules };
    }
    console.log('ParserService configured with options:', options);
  }

  /**
   * 获取服务状态
   */
  public getStatus(): any {
    return {
      initialized: this.initialized,
      rulesLoaded: Object.keys(this.parseRules).length
    };
  }

  /**
   * 初始化解析规则
   */
  private initializeParseRules(): void {
    this.parseRules = {
      // 流水线ID生成规则
      pipelineIdFormat: '{provider}.{model}.{keyIndex}',
      
      // 默认配置
      defaultLLMSwitch: {
        enabled: true,
        strategy: 'round-robin',
        healthCheck: true
      },
      
      defaultWorkflow: {
        enabled: false,
        steps: []
      },
      
      defaultCompatibility: {
        openai: true,
        anthropic: true
      },
      
      // 虚拟模型默认映射
      defaultVirtualModels: {
        'claude-3-sonnet': {
          fallbackProvider: 'openai',
          fallbackModel: 'gpt-4'
        },
        'claude-3-opus': {
          fallbackProvider: 'openai',
          fallbackModel: 'gpt-4'
        },
        'gpt-4': {
          fallbackProvider: 'anthropic',
          fallbackModel: 'claude-3-sonnet'
        }
      }
    };
  }

  // 已移除自动加载逻辑，由ConfigLoadingManager统一管理

  /**
   * 转换配置数据为用户配置格式
   */
  private convertConfigDataToUserConfig(configData: any): UserConfig {
    // 这里实现将ConfigData转换为UserConfig的逻辑
    // 根据实际数据结构调整转换逻辑
    
    const userConfig: UserConfig = {
      providers: {}
    };
    
    // 从configData.settings.providers提取供应商信息
    if (configData.settings && configData.settings.providers) {
      for (const [providerId, providerData] of Object.entries(configData.settings.providers)) {
        // 确保providerData是对象且有必要的属性
        if (typeof providerData === 'object' && providerData !== null) {
          const providerAny: any = providerData;
          
          userConfig.providers[providerId] = {
            models: {}
          };
          
          // 处理模型和密钥
          if (providerAny.models) {
            for (const [modelId, modelData] of Object.entries(providerAny.models)) {
              const modelAny: any = modelData;
              
              // 提取密钥信息（假设在auth中）
              let keys: string[] = [];
              if (providerAny.auth && Array.isArray(providerAny.auth.keys)) {
                keys = providerAny.auth.keys;
              }
              
              userConfig.providers[providerId].models[modelId] = {
                keys: keys
              };
            }
          }
        }
      }
    }
    
    // 处理虚拟模型（如果存在）
    if (configData.settings && configData.settings.virtualModels) {
      userConfig.virtualModels = {};
      for (const [vmName, vmData] of Object.entries(configData.settings.virtualModels)) {
        const vmAny: any = vmData;
        userConfig.virtualModels[vmName] = {
          targetProvider: vmAny.targetProvider || '',
          targetModel: vmAny.targetModel || ''
        };
      }
    }
    
    return userConfig;
  }

  /**
   * 解析用户配置
   */
  public async parseUserConfig(
    userConfig: UserConfig,
    options?: {
      onProgress?: (step: string, progress: number) => void;
      validateStructure?: boolean;
      generateStatistics?: boolean;
    }
  ): Promise<ParseResult> {
    try {
      const onProgress = options?.onProgress || (() => {});
      const validateStructure = options?.validateStructure !== false;
      const generateStatistics = options?.generateStatistics !== false;

      onProgress('验证配置结构...', 10);
      
      // 步骤1: 验证配置结构
      if (validateStructure) {
        const structureValidation = this.validateConfigStructure(userConfig);
        if (!structureValidation.isValid) {
          return {
            success: false,
            pipelines: [],
            statistics: {
              totalPipelines: 0,
              totalProviders: 0,
              totalModels: 0,
              totalKeys: 0
            },
            errors: structureValidation.errors
          };
        }
      }

      onProgress('解析供应商配置...', 30);
      
      // 步骤2: 解析供应商配置
      const providerPipelines = await this.parseProviders(userConfig.providers);
      
      onProgress('处理虚拟模型映射...', 60);
      
      // 步骤3: 处理虚拟模型映射
      const finalPipelines = await this.processVirtualModels(
        providerPipelines,
        userConfig.virtualModels || {}
      );
      
      onProgress('生成统计信息...', 90);
      
      // 步骤4: 生成统计信息
      const statistics = generateStatistics 
        ? this.generateStatistics(finalPipelines, userConfig)
        : {
            totalPipelines: finalPipelines.length,
            totalProviders: Object.keys(userConfig.providers).length,
            totalModels: 0,
            totalKeys: 0
          };
      
      onProgress('解析完成', 100);
      
      return {
        success: true,
        pipelines: finalPipelines,
        statistics,
        warnings: this.generateWarnings(userConfig, finalPipelines)
      };
    } catch (error) {
      console.error('Failed to parse user config:', error);
      return {
        success: false,
        pipelines: [],
        statistics: {
          totalPipelines: 0,
          totalProviders: 0,
          totalModels: 0,
          totalKeys: 0
        },
        errors: [`解析失败: ${error}`]
      };
    }
  }

  /**
   * 验证配置结构
   */
  private validateConfigStructure(userConfig: UserConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 检查基本结构
    if (!userConfig || typeof userConfig !== 'object') {
      errors.push('配置文件格式不正确');
      return { isValid: false, errors };
    }

    // 检查供应商配置
    if (!userConfig.providers || typeof userConfig.providers !== 'object') {
      errors.push('缺少供应商配置');
    } else {
      for (const [providerId, providerConfig] of Object.entries(userConfig.providers)) {
        if (!providerConfig || typeof providerConfig !== 'object') {
          errors.push(`供应商 ${providerId} 配置格式不正确`);
          continue;
        }

        if (!providerConfig.models || typeof providerConfig.models !== 'object') {
          errors.push(`供应商 ${providerId} 缺少模型配置`);
          continue;
        }

        for (const [modelId, modelConfig] of Object.entries(providerConfig.models)) {
          if (!modelConfig || typeof modelConfig !== 'object') {
            errors.push(`供应商 ${providerId} 的模型 ${modelId} 配置格式不正确`);
            continue;
          }

          if (!Array.isArray(modelConfig.keys)) {
            errors.push(`供应商 ${providerId} 的模型 ${modelId} 缺少或keys格式不正确`);
          } else if (modelConfig.keys.length === 0) {
            errors.push(`供应商 ${providerId} 的模型 ${modelId} 没有配置API密钥`);
          }
        }
      }
    }

    // 检查虚拟模型配置(可选)
    if (userConfig.virtualModels && typeof userConfig.virtualModels !== 'object') {
      errors.push('虚拟模型配置格式不正确');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 解析供应商配置生成流水线
   */
  private async parseProviders(providers: UserConfig['providers']): Promise<PipelineConfig[]> {
    const pipelines: PipelineConfig[] = [];

    for (const [providerId, providerConfig] of Object.entries(providers)) {
      for (const [modelId, modelConfig] of Object.entries(providerConfig.models)) {
        // 每个key生成一条流水线
        for (let keyIndex = 0; keyIndex < modelConfig.keys.length; keyIndex++) {
          const pipelineId = this.generatePipelineId(providerId, modelId, keyIndex);
          
          const pipeline: PipelineConfig = {
            id: pipelineId,
            virtualModels: [], // 初始为空，后续处理虚拟模型时填充
            llmswitch: {
              provider: providerId,
              model: modelId,
              keyIndex: keyIndex
            },
            workflow: { ...this.parseRules.defaultWorkflow },
            compatibility: { ...this.parseRules.defaultCompatibility },
            provider: {
              id: providerId,
              name: providerId, // 可以从配置中获取真实名称
              type: this.detectProviderType(providerId),
              endpoint: this.getProviderEndpoint(providerId),
              models: [{
                id: modelId,
                name: modelId,
                enabled: true
              }],
              auth: {
                type: 'api-key',
                keys: [modelConfig.keys?.[keyIndex] ?? '']
              },
              enabled: true
            }
          };
          
          pipelines.push(pipeline);
        }
      }
    }

    return pipelines;
  }

  /**
   * 处理虚拟模型映射
   */
  private async processVirtualModels(
    pipelines: PipelineConfig[],
    virtualModels: Record<string, any>
  ): Promise<PipelineConfig[]> {
    // 创建供应商+模型到流水线的映射
    const providerModelToPipelines = new Map<string, PipelineConfig[]>();
    
    for (const pipeline of pipelines) {
      const key = `${pipeline.llmswitch.provider}.${pipeline.llmswitch.model}`;
      if (!providerModelToPipelines.has(key)) {
        providerModelToPipelines.set(key, []);
      }
      providerModelToPipelines.get(key)!.push(pipeline);
    }

    // 处理虚拟模型映射
    for (const [virtualModelName, virtualModelConfig] of Object.entries(virtualModels)) {
      const targetProvider = virtualModelConfig.targetProvider;
      const targetModel = virtualModelConfig.targetModel;
      
      if (!targetProvider || !targetModel) {
        console.warn(`虚拟模型 ${virtualModelName} 缺少目标供应商或模型`);
        continue;
      }
      
      const targetKey = `${targetProvider}.${targetModel}`;
      const targetPipelines = providerModelToPipelines.get(targetKey);
      
      if (!targetPipelines || targetPipelines.length === 0) {
        console.warn(`虚拟模型 ${virtualModelName} 的目标 ${targetKey} 没有对应的流水线`);
        continue;
      }
      
      // 将虚拟模型添加到所有目标流水线
      for (const pipeline of targetPipelines) {
        if (!pipeline.virtualModels.includes(virtualModelName)) {
          pipeline.virtualModels.push(virtualModelName);
        }
      }
    }

    // 为没有虚拟模型映射的流水线添加默认虚拟模型
    for (const pipeline of pipelines) {
      if (pipeline.virtualModels.length === 0) {
        // 使用原始模型名作为虚拟模型
        const originalModel = `${pipeline.llmswitch.provider}-${pipeline.llmswitch.model}`;
        pipeline.virtualModels.push(originalModel);
      }
    }

    return pipelines;
  }

  /**
   * 生成流水线ID
   */
  private generatePipelineId(provider: string, model: string, keyIndex: number): string {
    return this.parseRules.pipelineIdFormat
      .replace('{provider}', provider)
      .replace('{model}', model)
      .replace('{keyIndex}', keyIndex.toString());
  }

  /**
   * 检测供应商类型
   */
  private detectProviderType(providerId: string): 'openai' | 'anthropic' | 'google' | 'local' | 'custom' {
    const lowerProvider = providerId.toLowerCase();
    
    if (lowerProvider.includes('openai') || lowerProvider.includes('gpt')) {
      return 'openai';
    } else if (lowerProvider.includes('anthropic') || lowerProvider.includes('claude')) {
      return 'anthropic';
    } else if (lowerProvider.includes('google') || lowerProvider.includes('gemini')) {
      return 'google';
    } else if (lowerProvider.includes('local') || lowerProvider.includes('localhost')) {
      return 'local';
    } else {
      return 'custom';
    }
  }

  /**
   * 获取供应商端点
   */
  private getProviderEndpoint(providerId: string): string {
    const providerType = this.detectProviderType(providerId);
    
    switch (providerType) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'google':
        return 'https://generativelanguage.googleapis.com/v1beta';
      case 'local':
        return 'http://localhost:1234/v1';
      default:
        return 'https://api.example.com/v1';
    }
  }

  /**
   * 生成统计信息
   */
  private generateStatistics(
    pipelines: PipelineConfig[],
    _userConfig: UserConfig
  ): {
    totalPipelines: number;
    totalProviders: number;
    totalModels: number;
    totalKeys: number;
  } {
    const providers = new Set<string>();
    const models = new Set<string>();
    let totalKeys = 0;
    
    for (const pipeline of pipelines) {
      providers.add(pipeline.llmswitch.provider);
      models.add(`${pipeline.llmswitch.provider}.${pipeline.llmswitch.model}`);
      totalKeys += pipeline.provider.auth.keys.length;
    }
    
    return {
      totalPipelines: pipelines.length,
      totalProviders: providers.size,
      totalModels: models.size,
      totalKeys
    };
  }

  /**
   * 生成警告信息
   */
  private generateWarnings(userConfig: UserConfig, pipelines: PipelineConfig[]): string[] {
    const warnings: string[] = [];
    
    // 检查是否有未使用的虚拟模型
    if (userConfig.virtualModels) {
      for (const virtualModelName of Object.keys(userConfig.virtualModels)) {
        const isUsed = pipelines.some(p => p.virtualModels.includes(virtualModelName));
        if (!isUsed) {
          warnings.push(`虚拟模型 ${virtualModelName} 未被任何流水线使用`);
        }
      }
    }
    
    // 检查是否有过多的流水线
    if (pipelines.length > 50) {
      warnings.push(`生成了 ${pipelines.length} 条流水线，可能会影响性能`);
    }
    
    // 检查是否有重复的API密钥
    const allKeys = new Set<string>();
    const duplicateKeys: string[] = [];
    
    for (const pipeline of pipelines) {
      for (const key of pipeline.provider.auth.keys) {
        if (allKeys.has(key)) {
          duplicateKeys.push(key);
        } else {
          allKeys.add(key);
        }
      }
    }
    
    if (duplicateKeys.length > 0) {
      warnings.push(`发现 ${duplicateKeys.length} 个重复的API密钥`);
    }
    
    return warnings;
  }

  /**
   * 验证流水线配置
   */
  public validatePipelines(pipelines: PipelineConfig[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const pipeline of pipelines) {
      // 检查必要字段
      if (!pipeline.id) {
        errors.push(`流水线缺少ID`);
      }
      
      if (!pipeline.llmswitch || !pipeline.llmswitch.provider || !pipeline.llmswitch.model) {
        errors.push(`流水线 ${pipeline.id} 缺少LLM切换配置`);
      }
      
      if (!pipeline.provider || !pipeline.provider.auth || !pipeline.provider.auth.keys.length) {
        errors.push(`流水线 ${pipeline.id} 缺少认证配置`);
      }
      
      if (!pipeline.virtualModels || pipeline.virtualModels.length === 0) {
        warnings.push(`流水线 ${pipeline.id} 没有虚拟模型映射`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 优化流水线配置
   */
  public optimizePipelines(pipelines: PipelineConfig[]): PipelineConfig[] {
    // 合并相同配置的流水线
    const optimized: PipelineConfig[] = [];
    const pipelineGroups = new Map<string, PipelineConfig[]>();
    
    // 按供应商+模型分组
    for (const pipeline of pipelines) {
      const groupKey = `${pipeline.llmswitch.provider}.${pipeline.llmswitch.model}`;
      if (!pipelineGroups.has(groupKey)) {
        pipelineGroups.set(groupKey, []);
      }
      pipelineGroups.get(groupKey)!.push(pipeline);
    }
    
    // 合并同组流水线
    for (const [_groupKey, groupPipelines] of pipelineGroups) {
      if (groupPipelines.length === 1 && groupPipelines[0]) {
        optimized.push(groupPipelines[0]);
      } else if (groupPipelines.length > 1) {
        // 合并多个流水线
        const mergedPipeline = this.mergePipelines(groupPipelines);
        optimized.push(mergedPipeline);
      }
    }
    
    return optimized;
  }

  /**
   * 合并流水线
   */
  private mergePipelines(pipelines: PipelineConfig[]): PipelineConfig {
    const firstPipeline = pipelines[0];
    if (!firstPipeline) {
      throw new Error('No pipelines to merge');
    }
    
    const mergedPipeline: PipelineConfig = {
      id: `${firstPipeline.llmswitch.provider}.${firstPipeline.llmswitch.model}.merged`,
      virtualModels: [],
      llmswitch: { ...firstPipeline.llmswitch },
      workflow: { ...firstPipeline.workflow },
      compatibility: { ...firstPipeline.compatibility },
      provider: {
        ...firstPipeline.provider,
        auth: {
          ...firstPipeline.provider.auth,
          keys: []
        }
      }
    };
    
    // 合并虚拟模型
    const allVirtualModels = new Set<string>();
    for (const pipeline of pipelines) {
      for (const vm of pipeline.virtualModels) {
        allVirtualModels.add(vm);
      }
    }
    mergedPipeline.virtualModels = Array.from(allVirtualModels);
    
    // 合并API密钥
    const allKeys = new Set<string>();
    for (const pipeline of pipelines) {
      for (const key of pipeline.provider.auth.keys) {
        allKeys.add(key);
      }
    }
    mergedPipeline.provider.auth.keys = Array.from(allKeys);
    
    return mergedPipeline;
  }

  /**
   * 导出流水线配置
   */
  public exportPipelines(
    pipelines: PipelineConfig[],
    format: 'json' | 'yaml' | 'summary' = 'json'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(pipelines, null, 2);
      case 'yaml':
        // 这里需要YAML库
        return JSON.stringify(pipelines, null, 2); // 临时返回JSON
      case 'summary':
        return this.generatePipelineSummary(pipelines);
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 生成流水线摘要
   */
  private generatePipelineSummary(pipelines: PipelineConfig[]): string {
    let summary = '# 流水线配置摘要\n\n';
    
    summary += `总计: ${pipelines.length} 条流水线\n\n`;
    
    const providerGroups = new Map<string, PipelineConfig[]>();
    for (const pipeline of pipelines) {
      const provider = pipeline.llmswitch.provider;
      if (!providerGroups.has(provider)) {
        providerGroups.set(provider, []);
      }
      providerGroups.get(provider)!.push(pipeline);
    }
    
    for (const [provider, providerPipelines] of providerGroups) {
      summary += `## ${provider} (${providerPipelines.length}条流水线)\n\n`;
      
      for (const pipeline of providerPipelines) {
        summary += `- **${pipeline.id}**\n`;
        summary += `  - 模型: ${pipeline.llmswitch.model}\n`;
        summary += `  - 虚拟模型: ${pipeline.virtualModels.join(', ')}\n`;
        summary += `  - API密钥数量: ${pipeline.provider.auth.keys.length}\n\n`;
      }
    }
    
    return summary;
  }

  /**
   * 获取流水线统计信息
   */
  public getPipelineStatistics(pipelines: PipelineConfig[]): any {
    const providers = new Set<string>();
    const models = new Set<string>();
    const virtualModels = new Set<string>();
    let totalKeys = 0;
    
    for (const pipeline of pipelines) {
      providers.add(pipeline.llmswitch.provider);
      models.add(`${pipeline.llmswitch.provider}.${pipeline.llmswitch.model}`);
      
      for (const vm of pipeline.virtualModels) {
        virtualModels.add(vm);
      }
      
      totalKeys += pipeline.provider.auth.keys.length;
    }
    
    return {
      totalPipelines: pipelines.length,
      totalProviders: providers.size,
      totalModels: models.size,
      totalVirtualModels: virtualModels.size,
      totalKeys,
      averageKeysPerPipeline: totalKeys / pipelines.length,
      providerDistribution: this.getProviderDistribution(pipelines),
      modelDistribution: this.getModelDistribution(pipelines)
    };
  }

  /**
   * 获取供应商分布
   */
  private getProviderDistribution(pipelines: PipelineConfig[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const pipeline of pipelines) {
      const provider = pipeline.llmswitch.provider;
      distribution[provider] = (distribution[provider] || 0) + 1;
    }
    
    return distribution;
  }

  /**
   * 获取模型分布
   */
  private getModelDistribution(pipelines: PipelineConfig[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const pipeline of pipelines) {
      const model = `${pipeline.llmswitch.provider}.${pipeline.llmswitch.model}`;
      distribution[model] = (distribution[model] || 0) + 1;
    }
    
    return distribution;
  }
}