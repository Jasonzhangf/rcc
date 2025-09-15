/**
 * Decoupled Configuration to Pipeline Integration Module
 *
 * This module provides pipeline assembly functionality based on virtual model mapping configurations
 * with two key decouplings:
 * 1. Virtual model parsing uses only built-in virtual model field parsing, no external dependencies
 * 2. Pipeline assembly factory only reads pipeline configurations, achieving decoupling
 */

import { ConfigData, VirtualModelTarget } from '../core/ConfigData';
import { PipelineEntry } from '../core/PipelineTable';

/**
 * Virtual model mapping configuration (decoupled version)
 */
export interface VirtualModelMapping {
  /**
   * Virtual model identifier
   */
  virtualModelId: string;

  /**
   * Target configuration list
   */
  targets: VirtualModelTarget[];

  /**
   * Priority for routing (higher = higher priority)
   */
  priority?: number;

  /**
   * Whether this mapping is enabled
   */
  enabled?: boolean;

  /**
   * Weight for load balancing
   */
  weight?: number;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Decoupled Pipeline table generation configuration
 */
export interface DecoupledPipelineTableConfig {
  /**
   * Whether to generate pipeline tables automatically
   */
  enabled: boolean;

  /**
   * Fixed virtual models to process
   */
  fixedVirtualModels: string[];

  /**
   * Validation settings
   */
  validation?: {
    strict: boolean;
    failOnError: boolean;
    warnOnUnknown: boolean;
  };
}

/**
 * Decoupled Configuration to Pipeline Integration Module
 */
export class DecoupledConfigurationToPipelineModule {
  protected config: DecoupledPipelineTableConfig;
  private isInitialized: boolean = false;

  constructor(config?: Partial<DecoupledPipelineTableConfig>) {
    // Default configuration
    this.config = {
      enabled: true,
      fixedVirtualModels: [
        'default',
        'longcontext',
        'thinking',
        'background',
        'websearch',
        'vision',
        'coding'
      ],
      validation: {
        strict: false,
        failOnError: false,
        warnOnUnknown: true
      },
      ...config
    };
  }

  /**
   * Initialize the decoupled configuration to pipeline integration
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Decoupled Configuration to Pipeline module is already initialized');
      return;
    }

    console.log('Initializing Decoupled Configuration to Pipeline Integration Module');

    // Start initialization
    this.isInitialized = true;
    console.log('Decoupled Configuration to Pipeline Integration Module initialized successfully');
  }

  /**
   * Parse virtual model mappings from configuration (decoupled version)
   * Uses only built-in virtual model field parsing, no external dependencies
   */
  public parseVirtualModelMappings(config: ConfigData): VirtualModelMapping[] {
    console.log('Parsing virtual model mappings (decoupled version)');

    try {
      if (!config.virtualModels) {
        console.warn('No virtual models found in configuration');
        return [];
      }

      const virtualModels = config.virtualModels;
      const mappings: VirtualModelMapping[] = [];

      // Only process fixed virtual models
      for (const virtualModelId of this.config.fixedVirtualModels) {
        const vmConfig = virtualModels[virtualModelId];
        if (!vmConfig) {
          console.warn(`Fixed virtual model ${virtualModelId} not found in configuration`);
          continue;
        }

        try {
          const virtualModelMapping: VirtualModelMapping = {
            virtualModelId,
            targets: vmConfig.targets || [],
            priority: vmConfig.priority || 1,
            enabled: vmConfig.enabled !== false,
            weight: vmConfig.weight,
            metadata: {}
          };

          // Validate mapping using built-in validation only
          this.validateVirtualModelMapping(virtualModelMapping);

          mappings.push(virtualModelMapping);

        } catch (error) {
          console.error(`Failed to parse virtual model mapping for ${virtualModelId}`, error);

          if (this.config.validation?.failOnError) {
            throw error;
          }
        }
      }

      // Sort by priority (highest first)
      mappings.sort((a, b) => (b.priority || 1) - (a.priority || 1));

      console.log('Virtual model mappings parsed successfully (decoupled)', {
        mappingCount: mappings.length
      });

      return mappings;

    } catch (error) {
      console.error('Failed to parse virtual model mappings (decoupled)', error);
      throw error;
    }
  }

  /**
   * Generate pipeline table from virtual model mappings (decoupled version)
   * Pipeline assembly factory only reads pipeline configurations, achieving decoupling
   */
  public generatePipelineTable(mappings: VirtualModelMapping[], config: ConfigData): Map<string, PipelineEntry[]> {
    console.log('Generating pipeline table (decoupled)', { mappingCount: mappings.length });

    try {
      const pipelineTable = new Map<string, PipelineEntry[]>();

      for (const mapping of mappings) {
        try {
          // Generate pipeline entries for this mapping
          const pipelineEntries = this.generatePipelineEntries(mapping, config);
          pipelineTable.set(mapping.virtualModelId, pipelineEntries);

        } catch (error) {
          console.error(`Failed to generate pipeline entries for ${mapping.virtualModelId}`, error);

          if (this.config.validation?.failOnError) {
            throw error;
          }
        }
      }

      console.log('Pipeline table generated successfully (decoupled)', {
        pipelineCount: pipelineTable.size
      });

      return pipelineTable;

    } catch (error) {
      console.error('Failed to generate pipeline table (decoupled)', error);
      throw error;
    }
  }

  /**
   * Generate pipeline entries from virtual model mapping (decoupled version)
   * This method only reads configurations and generates entries, no assembly
   */
  private generatePipelineEntries(mapping: VirtualModelMapping, config: ConfigData): PipelineEntry[] {
    const entries: PipelineEntry[] = [];

    // Process each target in the mapping
    for (let targetIndex = 0; targetIndex < mapping.targets.length; targetIndex++) {
      const target = mapping.targets[targetIndex];

      // Get provider configuration
      const provider = config.providers[target.providerId];
      if (!provider) {
        console.warn(`Provider ${target.providerId} not found for virtual model ${mapping.virtualModelId}`);
        continue;
      }

      // Get API keys from provider
      const apiKeys = Array.isArray(provider.auth?.keys) ? provider.auth.keys :
                     (provider.auth?.keys ? [provider.auth.keys] : []);

      // Create pipeline entries for each API key
      if (apiKeys.length > 0) {
        apiKeys.forEach((apiKey, keyIndex) => {
          const entry: PipelineEntry = {
            virtualModelId: mapping.virtualModelId,
            targetProvider: target.providerId,
            targetModel: target.modelId,
            keyIndex: keyIndex,
            enabled: mapping.enabled !== false,
            priority: mapping.priority || 100 - (targetIndex * 10),
            weight: mapping.weight || Math.max(1, Math.floor(100 / mapping.targets.length)),
            metadata: {
              providerType: provider.type || 'unknown',
              apiKey: apiKey,
              createdAt: new Date().toISOString()
            }
          };

          entries.push(entry);
        });
      } else {
        // If no API keys, create entry with empty key
        const entry: PipelineEntry = {
          virtualModelId: mapping.virtualModelId,
          targetProvider: target.providerId,
          targetModel: target.modelId,
          keyIndex: 0,
          enabled: mapping.enabled !== false,
          priority: mapping.priority || 100 - (targetIndex * 10),
          weight: mapping.weight || Math.max(1, Math.floor(100 / mapping.targets.length)),
          metadata: {
            providerType: provider.type || 'unknown',
            apiKey: '',
            createdAt: new Date().toISOString()
          }
        };

        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Validate virtual model mapping using only built-in validation
   */
  private validateVirtualModelMapping(mapping: VirtualModelMapping): void {
    if (!mapping.virtualModelId) {
      throw new Error('Virtual model ID is required');
    }

    if (!mapping.targets || mapping.targets.length === 0) {
      throw new Error(`At least one target is required for virtual model ${mapping.virtualModelId}`);
    }

    for (const target of mapping.targets) {
      if (!target.providerId) {
        throw new Error(`Target provider is required for virtual model ${mapping.virtualModelId}`);
      }

      if (!target.modelId) {
        throw new Error(`Target model is required for virtual model ${mapping.virtualModelId}`);
      }
    }

    if (mapping.priority && (mapping.priority < 1 || mapping.priority > 10)) {
      throw new Error(`Priority must be between 1 and 10 for virtual model ${mapping.virtualModelId}`);
    }
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    console.log('Cleaning up Decoupled Configuration to Pipeline Integration Module');
    this.isInitialized = false;
  }
}