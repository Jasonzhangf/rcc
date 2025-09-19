/**
 * Module Scanner - Discovers and manages available providers
 * 模块扫描器 - 发现并管理可用的provider
 */

import BaseProvider from './BaseProvider';
import { PipelineTarget } from './Pipeline';
import { VirtualModelConfig } from '../types/virtual-model';
import QwenProvider from '../providers/qwen';
import IFlowProvider from '../providers/iflow';

export interface ProviderDiscoveryOptions {
  enabledProviders?: string[]; // Specific providers to enable, if empty enable all
  excludeProviders?: string[]; // Providers to exclude
  includeTestProviders?: boolean; // Whether to include test providers
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

export class ModuleScanner {
  private availableProviders: Map<string, ProviderInfo> = new Map();
  private providerInstances: Map<string, BaseProvider> = new Map();
  private isInitialized: boolean = false;

  constructor() {
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
        // Attempt to load the provider
        const provider = await this.loadProvider(providerInfo);

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
   * Load provider instance using imported classes
   * 使用导入的类加载provider实例
   */
  private async loadProvider(providerInfo: ProviderInfo): Promise<BaseProvider | null> {
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
          console.warn(`Unknown provider ${providerInfo.id}`);
          return null;
      }

      // Instantiate provider with appropriate configuration
      let providerConfig;

      switch (providerInfo.id) {
        case 'qwen':
          providerConfig = {
            name: providerInfo.name,
            endpoint: 'https://chat.qwen.ai/api/v1/services/chat/',
            supportedModels: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
            defaultModel: 'qwen-turbo'
          };
          break;
        case 'iflow':
          providerConfig = {
            name: providerInfo.name,
            endpoint: 'https://api.openai.com/v1/chat/completions',
            supportedModels: ['gpt-3.5-turbo', 'gpt-4'],
            defaultModel: 'gpt-3.5-turbo'
          };
          break;
        default:
          console.warn(`Unknown provider ${providerInfo.id}`);
          return null;
      }

      const provider = new ProviderClass(providerConfig);

      return provider as BaseProvider;
    } catch (error) {
      console.error(`Failed to load provider ${providerInfo.id}:`, error);
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
        console.warn(`Provider ${targetConfig.providerId} not found for virtual model ${virtualModel.id}`);
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