/**
 * WebAuto Configuration Adapter
 *
 * This adapter converts RCC configuration format to WebAuto Pipeline Framework format.
 * It serves as the bridge between the existing RCC configuration system and the new
 * WebAuto pipeline framework.
 */

import { ConfigData, VirtualModelTarget, ProviderConfig } from 'rcc-configuration';

/**
 * WebAuto Pipeline Manager types (imported dynamically)
 */
type PipelineManagerType = any;
type PipelineType = any;

/**
 * Configuration for WebAuto provider
 */
export interface WebAutoProviderConfig {
  name: string;
  apiKey: string;
  apiEndpoint: string;
  providerName: 'openai' | 'anthropic' | 'qwen' | 'lmstudio' | 'gemini';
  timeout?: number;
}

/**
 * Configuration for WebAuto pipeline
 */
export interface WebAutoPipelineConfig {
  name: string;
  inputProtocol?: 'anthropic' | 'openai' | 'qwen';
  llmSwitch?: {
    name: string;
    protocolMap?: Record<string, any>;
  };
  workflow?: {
    name: string;
  };
  compatibility?: {
    configPath: string;
    targetProtocol?: string;
  };
  provider: WebAutoProviderConfig;
  metrics?: {
    enabled: boolean;
    events?: string[];
  };
}

/**
 * Adapter result interface
 */
export interface AdapterResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

/**
 * WebAuto Configuration Adapter
 *
 * Converts RCC configuration format to WebAuto pipeline format
 */
export class WebAutoConfigurationAdapter {
  private readonly knownProviders = new Set([
    'openai', 'anthropic', 'qwen', 'lmstudio', 'gemini'
  ]);

  private readonly providerProtocolMap: Record<string, string> = {
    openai: 'openai',
    anthropic: 'anthropic',
    qwen: 'openai', // qwen uses OpenAI-compatible interface
    lmstudio: 'openai', // lmstudio uses OpenAI-compatible interface
    gemini: 'openai' // gemini can be mapped to OpenAI interface
  };

  constructor() {
    console.log('WebAutoConfigurationAdapter initialized');
  }

  /**
   * Convert RCC virtual model configuration to WebAuto pipeline configuration
   */
  convertVirtualModelToPipelineConfig(
    virtualModelId: string,
    virtualModelConfig: any,
    providersConfig: Record<string, ProviderConfig>
  ): AdapterResult<WebAutoPipelineConfig> {
    try {
      console.log(`Converting virtual model ${virtualModelId} to WebAuto pipeline config`);

      // Validate input
      if (!virtualModelId || typeof virtualModelId !== 'string') {
        throw new Error('Valid virtual model ID is required');
      }

      if (!virtualModelConfig || !virtualModelConfig.targets || !Array.isArray(virtualModelConfig.targets)) {
        throw new Error('Virtual model configuration must have targets array');
      }

      // Get the primary target (first target)
      const primaryTarget = virtualModelConfig.targets[0];
      if (!primaryTarget || !primaryTarget.providerId || !primaryTarget.modelId) {
        throw new Error('Primary target must have providerId and modelId');
      }

      // Get provider configuration
      const providerConfig = providersConfig[primaryTarget.providerId];
      if (!providerConfig) {
        throw new Error(`Provider configuration not found for ${primaryTarget.providerId}`);
      }

      // Build WebAuto pipeline configuration
      const pipelineConfig: WebAutoPipelineConfig = {
        name: `${virtualModelId}-pipeline`,
        provider: this.convertProviderConfig(primaryTarget.providerId, providerConfig),
        compatibility: this.buildCompatibilityConfig(primaryTarget),
        metrics: {
          enabled: true,
          events: ['request', 'response', 'error']
        }
      };

      // Add input protocol support based on provider type
      const protocol = this.providerProtocolMap[primaryTarget.providerId];
      if (protocol) {
        pipelineConfig.inputProtocol = protocol as 'anthropic' | 'openai' | 'qwen';
      }

      // Add LLM switch configuration for protocols that need transformation
      if (this.requiresLLMSwitch(primaryTarget.providerId)) {
        pipelineConfig.llmSwitch = {
          name: `${virtualModelId}-switch`,
          protocolMap: this.buildProtocolMap(primaryTarget.providerId)
        };
      }

      // Add workflow configuration if needed
      if (virtualModelConfig.workflow) {
        pipelineConfig.workflow = {
          name: `${virtualModelId}-workflow`
        };
      }

      console.log(`Successfully converted ${virtualModelId} to pipeline config`);

      return {
        success: true,
        data: pipelineConfig,
        metadata: {
          virtualModelId,
          providerId: primaryTarget.providerId,
          modelId: primaryTarget.modelId,
          protocol: pipelineConfig.inputProtocol
        }
      };

    } catch (error) {
      console.error(`Failed to convert virtual model ${virtualModelId}`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Convert RCC project configuration to multiple WebAuto pipeline configurations
   */
  convertProjectConfiguration(configData: ConfigData): AdapterResult<WebAutoPipelineConfig[]> {
    try {
      console.log('Converting project configuration to WebAuto pipeline configurations');

      const pipelineConfigs: WebAutoPipelineConfig[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate project configuration
      if (!configData || !configData.providers || !configData.virtualModels) {
        throw new Error('Project configuration must contain providers and virtualModels');
      }

      // Convert each virtual model
      for (const [virtualModelId, vmConfig] of Object.entries(configData.virtualModels)) {
        const result = this.convertVirtualModelToPipelineConfig(
          virtualModelId,
          vmConfig,
          configData.providers
        );

        if (result.success && result.data) {
          pipelineConfigs.push(result.data);
          if (result.warnings) {
            warnings.push(...result.warnings);
          }
        } else {
          errors.push(`Failed to convert ${virtualModelId}: ${result.error}`);
        }
      }

      // Sort by virtual model priority if available
      pipelineConfigs.sort((a, b) => {
        const priorityA = this.getPriorityFromPipelineName(a.name);
        const priorityB = this.getPriorityFromPipelineName(b.name);
        return priorityB - priorityA; // Higher priority first
      });

      const success = pipelineConfigs.length > 0 && errors.length === 0;

      console.log(`Project conversion completed`, {
        success,
        pipelineCount: pipelineConfigs.length,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return {
        success,
        data: success ? pipelineConfigs : undefined,
        error: errors.length > 0 ? errors.join(', ') : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: {
          pipelineCount: pipelineConfigs.length,
          errorCount: errors.length,
          warningCount: warnings.length,
          providerCount: Object.keys(configData.providers).length,
          virtualModelCount: Object.keys(configData.virtualModels).length
        }
      };

    } catch (error) {
      console.error('Failed to convert project configuration', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Convert RCC provider configuration to WebAuto provider format
   */
  private convertProviderConfig(providerId: string, providerConfig: ProviderConfig): WebAutoProviderConfig {
    const providerName = this.standardizeProviderName(providerId);

    if (!this.knownProviders.has(providerName)) {
      console.warn(`Unknown provider type: ${providerName}, treating as generic`);
    }

    const webAutoProviderConfig: WebAutoProviderConfig = {
      name: providerId,
      apiKey: providerConfig.apiKey || '',
      apiEndpoint: providerConfig.endpoint || '',
      providerName: providerName as WebAutoProviderConfig['providerName'],
      timeout: providerConfig.timeout || 30000
    };

    return webAutoProviderConfig;
  }

  /**
   * Build compatibility configuration for target
   */
  private buildCompatibilityConfig(target: VirtualModelTarget): any {
    // If the target is already compatible with OpenAI, use passthrough
    if (this.isOpenAICompatible(target.providerId)) {
      return {
        configPath: 'openai-passthrough',
        targetProtocol: 'openai'
      };
    }

    // For other providers, determine appropriate compatibility config
    return {
      configPath: `${target.providerId}-compatibility`,
      targetProtocol: this.providerProtocolMap[target.providerId] || 'openai'
    };
  }

  /**
   * Check if provider requires LLM switch for protocol transformation
   */
  private requiresLLMSwitch(providerId: string): boolean {
    return providerId === 'anthropic'; // Anthropic needs transformation to OpenAI
  }

  /**
   * Build protocol map for LLM switch
   */
  private buildProtocolMap(providerId: string): Record<string, any> {
    switch (providerId) {
      case 'anthropic':
        return {
          anthropic_to_openai: {
            requestTemplate: {
              model: "{{model}}",
              messages: "{{messages}}",
              temperature: "{{temperature}}",
              max_tokens: "{{max_tokens}}",
              stream: "{{stream}}",
              tools: "{{tools}}",
              tool_choice: "{{tool_choice}}"
            },
            responseTemplate: {
              id: "{{id}}",
              object: "{{object}}",
              created: "{{created}}",
              model: "{{model}}",
              choices: "{{choices}}",
              usage: "{{usage}}"
            }
          }
        };
      default:
        return {};
    }
  }

  /**
   * Standardize provider name
   */
  private standardizeProviderName(providerId: string): string {
    const mapping: Record<string, string> = {
      'openai': 'openai',
      'anthropic': 'anthropic',
      'qwen': 'qwen',
      'lmstudio': 'lmstudio',
      'gemini': 'gemini'
    };

    return mapping[providerId.toLowerCase()] || providerId.toLowerCase();
  }

  /**
   * Check if provider is OpenAI compatible
   */
  private isOpenAICompatible(providerId: string): boolean {
    return ['openai', 'qwen', 'lmstudio'].includes(providerId.toLowerCase());
  }

  /**
   * Extract priority from pipeline name
   */
  private getPriorityFromPipelineName(pipelineName: string): number {
    // Extract virtual model ID from pipeline name (format: "vm-id-pipeline")
    const vmId = pipelineName.replace('-pipeline', '');
    // Default priority is 1, higher values come first
    return 1; // This could be enhanced to read from virtual model config
  }

  /**
   * Validate adapter configuration
   */
  validateConfiguration(): AdapterResult<boolean> {
    try {
      // Basic validation
      const requiredProviders = ['openai', 'anthropic'];
      const missingProviders = requiredProviders.filter(p => !this.knownProviders.has(p));

      if (missingProviders.length > 0) {
        return {
          success: false,
          error: `Missing known providers: ${missingProviders.join(', ')}`
        };
      }

      return {
        success: true,
        data: true,
        metadata: {
          knownProviders: Array.from(this.knownProviders),
          protocolMap: this.providerProtocolMap
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get supported protocol types
   */
  getSupportedProtocols(): string[] {
    return ['anthropic', 'openai', 'qwen'];
  }

  /**
   * Get supported provider types
   */
  getSupportedProviders(): string[] {
    return Array.from(this.knownProviders);
  }

  /**
   * Reset adapter state (for testing/reinitialization)
   */
  reset(): void {
    console.log('WebAutoConfigurationAdapter reset');
  }
}