/**
 * Module Scanner - Discovers and manages available providers
 * 模块扫描器 - 发现并管理可用的provider
 */

import { BaseProvider } from './BaseProvider';
import { PipelineTarget } from './Pipeline';
import { DynamicRoutingConfig } from '../types/dynamic-routing';
import QwenProvider from '../providers/qwen';
import IFlowProvider from '../providers/iflow';
import { UnifiedPipelineBaseModule, PipelineModuleConfig, ProviderInfo as BaseProviderInfo } from '../modules/PipelineBaseModule';

export interface ProviderDiscoveryOptions {
  enabledProviders?: string[]; // Specific providers to enable, if empty enable all
  excludeProviders?: string[]; // Providers to exclude
  includeTestProviders?: boolean; // Whether to include test providers
  providerConfigs?: { [providerId: string]: any }; // Provider configurations from config file
}

export interface ProviderInfo {
  id: string;
  name: string;
  version: string;
  type: string;
  capabilities: string[];
  enabled: boolean;
  className: string; // Class name for instantiation
  modulePath?: string; // Module path for dynamic import
}

export interface DiscoveredProvider {
  info: ProviderInfo;
  instance: BaseProvider | null;
  status: 'available' | 'unavailable' | 'error';
  error?: string;
}

export class ModuleScanner extends UnifiedPipelineBaseModule {
  private availableProviders: Map<string, ProviderInfo> = new Map();
  private providerInstances: Map<string, BaseProvider> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    super({
      id: 'module-scanner',
      name: 'Module Scanner',
      version: '1.0.0',
      description: 'Discovers and manages available providers'
    } as PipelineModuleConfig);

    this.initializeProviderRegistry();
  }

  /**
   * Initialize provider registry with known providers
   * 用已知的provider初始化注册表
   */
  private initializeProviderRegistry(): void {
    // Register known providers from rcc-pipeline module
    const knownProviders: ProviderInfo[] = [
      {
        id: 'qwen',
        name: 'Qwen Provider',
        version: '1.0.0',
        type: 'llm',
        capabilities: ['chat', 'stream', 'completion'],
        enabled: true,
        className: 'QwenProvider',
        modulePath: './providers/qwen.js'
      },
      {
        id: 'iflow',
        name: 'iFlow Provider',
        version: '1.0.0',
        type: 'llm',
        capabilities: ['chat', 'stream', 'completion'],
        enabled: true,
        className: 'IFlowProvider',
        modulePath: './providers/iflow.js'
      }
    ];

    knownProviders.forEach(provider => {
      this.availableProviders.set(provider.id, provider);
    });
  }

  /**
   * Scan and discover available providers based on options
   * 根据选项扫描并发现可用的provider
   */
  async scan(options: ProviderDiscoveryOptions = {}): Promise<DiscoveredProvider[]> {
    const discovered: DiscoveredProvider[] = [];

    for (const [providerId, providerInfo] of this.availableProviders.entries()) {
      // Check exclusion list
      if (options.excludeProviders?.includes(providerId)) {
        continue;
      }

      // Check inclusion list (if specified, only include these providers)
      if (options.enabledProviders && options.enabledProviders.length > 0) {
        if (!options.enabledProviders.includes(providerId)) {
          continue;
        }
      }

      try {
        // Get provider configuration from options
        const providerConfig = options.providerConfigs?.[providerId];

        // Attempt to load the provider
        const provider = await this.loadProvider(providerInfo, providerConfig);

        discovered.push({
          info: providerInfo,
          instance: provider,
          status: provider ? 'available' : 'unavailable'
        });

        if (provider) {
          this.providerInstances.set(providerId, provider);
        }

      } catch (error) {
        discovered.push({
          info: providerInfo,
          instance: null,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.isInitialized = true;
    return discovered;
  }

  /**
   * Transform configuration from rcc-config format to provider format
   * 将rcc-config格式的配置转换为provider格式
   */
  private transformProviderConfig(providerId: string, config: any): any {
    // Handle the correct rcc-config format
    if (!config) {
      throw new Error(`Provider config not found for ${providerId}`);
    }

    const supportedModels = config.models ? Object.keys(config.models) : [];
    const firstModel = supportedModels.length > 0 ? supportedModels[0] : 'unknown';

    // DEBUG: Log the input config
    console.log(`[ModuleScanner] DEBUG: Transforming config for provider ${providerId}`, {
      inputConfig: config,
      endpoint: config.endpoint,
      models: config.models,
      supportedModels,
      firstModel
    });

    const transformedConfig = {
      name: config.name || `${providerId} Provider`,
      endpoint: config.endpoint,  // Use endpoint from config
      supportedModels: supportedModels,
      defaultModel: firstModel,
      apiKey: config.auth?.keys?.[0] || `${providerId}-auth-1`
    };

    // DEBUG: Log the transformed config
    console.log(`[ModuleScanner] DEBUG: Transformed config for provider ${providerId}`, transformedConfig);

    return transformedConfig;
  }

  /**
   * Load provider instance using imported classes
   * 使用导入的类加载provider实例
   */
  private async loadProvider(providerInfo: ProviderInfo, providerConfig?: any): Promise<BaseProvider | null> {
    try {
      let ProviderClass;

      switch (providerInfo.id) {
        case 'qwen':
          ProviderClass = QwenProvider;
          break;
        case 'iflow':
          ProviderClass = IFlowProvider;
          break;
        default:
          this.logWarn('Unknown provider', { providerId: providerInfo.id }, 'provider-scanning');
          return null;
      }

      // Configuration must be provided from config file - no hardcoded defaults
      if (!providerConfig) {
        this.logError('Provider requires configuration from config file', { providerId: providerInfo.id }, 'provider-scanning');
        return null;
      }

      // Transform rcc-config format to provider format
      const config = this.transformProviderConfig(providerInfo.id, providerConfig);

      const provider = new ProviderClass(config);

      return provider as BaseProvider;
    } catch (error) {
      this.logError('Failed to load provider', {
        providerId: providerInfo.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'provider-scanning');
      return null;
    }
  }

  /**
   * Get discovered provider by ID
   * 通过ID获取发现的provider
   */
  getProvider(providerId: string): BaseProvider | null {
    return this.providerInstances.get(providerId) || null;
  }

  /**
   * Get all discovered providers
   * 获取所有发现的provider
   */
  getAllProviders(): Map<string, BaseProvider> {
    return new Map(this.providerInstances);
  }

  /**
   * Get provider information by ID
   * 通过ID获取provider信息
   */
  getProviderInfoById(providerId: string): ProviderInfo | null {
    return this.availableProviders.get(providerId) || null;
  }

  /**
   * Select providers based on criteria (provider + model + compatibility)
   * 根据条件选择provider（provider + 模型 + 兼容性）
   */
  selectProviders(
    criteria: {
      provider?: string;
      model?: string;
      compatibility?: string;
      capability?: string;
    } = {}
  ): BaseProvider[] {
    const selected: BaseProvider[] = [];

    for (const [providerId, provider] of this.providerInstances.entries()) {
      const providerInfo = this.availableProviders.get(providerId);
      if (!providerInfo || !providerInfo.enabled) {
        continue;
      }

      // Match provider ID
      if (criteria.provider && providerId !== criteria.provider) {
        continue;
      }

      // Match capability if specified
      if (criteria.capability) {
        const hasCapability = providerInfo.capabilities.includes(criteria.capability);
        if (!hasCapability) {
          continue;
        }
      }

      selected.push(provider);
    }

    return selected;
  }

  /**
   * Create pipeline targets from routing configuration and discovered providers
   * 从路由配置和发现的provider创建流水线目标
   */
  createTargetsFromRoutingConfig(routingConfig: DynamicRoutingConfig): PipelineTarget[] {
    const targets: PipelineTarget[] = [];

    if (!routingConfig.targets || routingConfig.targets.length === 0) {
      return targets;
    }

    routingConfig.targets.forEach(targetConfig => {
      const provider = this.getProvider(targetConfig.providerId);
      if (!provider) {
        this.logWarn('Provider not found for routing configuration', { providerId: targetConfig.providerId, routingId: routingConfig.id }, 'target-creation');
        return;
      }

      const target: PipelineTarget = {
        id: `${routingConfig.id}_${targetConfig.providerId}_${targetConfig.modelId}`,
        provider,
        weight: targetConfig.weight || 1,
        enabled: targetConfig.enabled !== false,
        healthStatus: 'unknown',
        lastHealthCheck: Date.now(),
        requestCount: 0,
        errorCount: 0,
        metadata: {
          keyIndex: targetConfig.keyIndex,
          routingId: routingConfig.id,
          ...targetConfig
        }
      };

      targets.push(target);
    });

    return targets;
  }

  /**
   * Get scanner status
   * 获取扫描器状态
   */
  getStatus(): {
    initialized: boolean;
    totalProviders: number;
    availableProviders: number;
    providerIds: string[];
  } {
    return {
      initialized: this.isInitialized,
      totalProviders: this.availableProviders.size,
      availableProviders: this.providerInstances.size,
      providerIds: Array.from(this.providerInstances.keys())
    };
  }

  /**
   * Process method - Required by BasePipelineModule interface
   * 处理方法 - BasePipelineModule接口必需
   */
  async process(request: any): Promise<any> {
    this.logInfo('Processing request in ModuleScanner', { requestType: typeof request }, 'process');

    // ModuleScanner is primarily a discovery component, return request as-is
    // ModuleScanner主要是发现组件，直接返回请求
    return request;
  }

  /**
   * Process response method - Required by BasePipelineModule interface
   * 处理响应方法 - BasePipelineModule接口必需
   */
  async processResponse(response: any): Promise<any> {
    this.logInfo('Processing response in ModuleScanner', { responseType: typeof response }, 'processResponse');

    // ModuleScanner is primarily a discovery component, return response as-is
    // ModuleScanner主要是发现组件，直接返回响应
    return response;
  }

  /**
   * Get provider info method - Override base class method
   * 获取provider信息方法 - 覆盖基类方法
   */
  getProviderInfo(): BaseProviderInfo {
    return {
      name: 'Module Scanner',
      type: 'pipeline',
      supportedModels: [],
      defaultModel: undefined
    };
  }

  /**
   * Clear all cached providers
   * 清空所有缓存的provider
   */
  clear(): void {
    this.providerInstances.clear();
    this.isInitialized = false;
  }
}

export default ModuleScanner;