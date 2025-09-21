/**
 * Module Scanner - Discovers and manages available providers
 * 模块扫描器 - 发现并管理可用的provider
 */

import { BaseProvider } from './BaseProvider';
import { PipelineTarget } from './Pipeline';
import { VirtualModelConfig } from '../types/virtual-model';
import QwenProvider from '../providers/qwen';
import IFlowProvider from '../providers/iflow';
import { UnifiedPipelineBaseModule, PipelineModuleConfig } from '../modules/PipelineBaseModule';

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

    switch (providerId) {
      case 'qwen':
        return {
          name: config.name || 'Qwen Provider',
          endpoint: config.endpoint,  // Use endpoint from config
          supportedModels: supportedModels,
          defaultModel: firstModel,
          apiKey: config.auth?.keys?.[0] || 'qwen-auth-1'
        };
      case 'iflow':
        return {
          name: config.name || 'iFlow Provider',
          endpoint: config.endpoint,  // Use endpoint from config
          supportedModels: supportedModels,
          defaultModel: firstModel,
          apiKey: config.auth?.keys?.[0] || 'iflow-auth-1'
        };
      default:
        return {
          name: config.name || `${providerId} Provider`,
          endpoint: config.endpoint,
          supportedModels: supportedModels,
          defaultModel: firstModel,
          apiKey: config.auth?.keys?.[0]
        };
    }
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
      this.logError('Failed to load provider', { providerId: providerInfo.id, error: error.message || error }, 'provider-scanning');
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
   * Get provider information
   * 获取provider信息
   */
  getProviderInfo(providerId: string): ProviderInfo | null {
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
   * Create pipeline targets from virtual model configuration and discovered providers
   * 从虚拟模型配置和发现的provider创建流水线目标
   */
  createTargetsFromVirtualModel(virtualModel: VirtualModelConfig): PipelineTarget[] {
    const targets: PipelineTarget[] = [];

    if (!virtualModel.targets || virtualModel.targets.length === 0) {
      return targets;
    }

    virtualModel.targets.forEach(targetConfig => {
      const provider = this.getProvider(targetConfig.providerId);
      if (!provider) {
        this.logWarn('Provider not found for virtual model', { providerId: targetConfig.providerId, virtualModelId: virtualModel.id }, 'target-creation');
        return;
      }

      const target: PipelineTarget = {
        id: `${virtualModel.id}_${targetConfig.providerId}_${targetConfig.modelId}`,
        provider,
        weight: targetConfig.weight || 1,
        enabled: targetConfig.enabled !== false,
        healthStatus: 'unknown',
        lastHealthCheck: Date.now(),
        requestCount: 0,
        errorCount: 0,
        metadata: {
          keyIndex: targetConfig.keyIndex,
          virtualModelId: virtualModel.id,
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
   * Clear all cached providers
   * 清空所有缓存的provider
   */
  clear(): void {
    this.providerInstances.clear();
    this.isInitialized = false;
  }
}

export default ModuleScanner;