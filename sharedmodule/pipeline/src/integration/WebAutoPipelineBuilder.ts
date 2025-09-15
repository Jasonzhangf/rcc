/**
 * WebAuto Pipeline Builder
 *
 * This builder creates and configures WebAuto pipelines based on RCC configurations.
 * It follows the builder pattern to create complex pipeline configurations with
 * load balancing, error handling, and monitoring capabilities.
 */

import {
  WebAutoPipelineConfig,
  WebAutoProviderConfig,
  AdapterResult
} from './WebAutoConfigurationAdapter';

/**
 * Builder options interface
 */
export interface PipelineBuilderOptions {
  enableLoadBalancing?: boolean;
  enableMetrics?: boolean;
  enableErrorRecovery?: boolean;
  enableCaching?: boolean;
  defaultTimeout?: number;
  retryCount?: number;
}

/**
 * Load balancing configuration
 */
export interface LoadBalancingConfig {
  strategy: 'roundRobin' | 'weighted' | 'leastConnections' | 'random';
  weights?: Record<string, number>;
  healthCheckInterval?: number;
  circuitBreakerConfig?: {
    enabled: boolean;
    threshold: number;
    timeout: number;
  };
}

/**
 * Pipeline construction result
 */
export interface PipelineConstructionResult {
  success: boolean;
  pipelineId?: string;
  configuration?: any;
  errors?: string[];
  warnings?: string[];
  metrics?: {
    buildTime: number;
    nodeCount: number;
  };
}

/**
 * WebAuto Pipeline Builder
 *
 * Constructs WebAuto pipelines with RCC-specific configurations
 */
export class WebAutoPipelineBuilder {
  private readonly options: PipelineBuilderOptions;
  private currentConfig: WebAutoPipelineConfig;
  private loadBalancingConfig?: LoadBalancingConfig;
  private intermediateNodeConfigs: any[] = [];

  constructor(options: PipelineBuilderOptions = {}) {
    this.options = {
      enableLoadBalancing: true,
      enableMetrics: true,
      enableErrorRecovery: true,
      enableCaching: true,
      defaultTimeout: 30000,
      retryCount: 3,
      ...options
    };

    console.log('WebAutoPipelineBuilder initialized with options:', this.options);
  }

  /**
   * Start building a new pipeline
   */
  createPipeline(pipelineConfig: WebAutoPipelineConfig): this {
    this.currentConfig = { ...pipelineConfig };
    this.intermediateNodeConfigs = [];
    this.loadBalancingConfig = undefined;

    console.log(`Creating new pipeline: ${pipelineConfig.name}`);
    return this;
  }

  /**
   * Add load balancing to the pipeline
   */
  withLoadBalancing(config: LoadBalancingConfig): this {
    this.loadBalancingConfig = config;

    // Add load balancing node configuration
    this.intermediateNodeConfigs.push({
      type: 'loadBalancer',
      config,
      position: 'pre-provider'
    });

    console.log(`Added load balancing with strategy: ${config.strategy}`);
    return this;
  }

  /**
   * Add metrics collection to the pipeline
   */
  withMetrics(events: string[]): this {
    if (!this.currentConfig.metrics) {
      this.currentConfig.metrics = { enabled: false };
    }

    this.currentConfig.metrics.enabled = this.options.enableMetrics!;
    this.currentConfig.metrics.events = events;

    // Add metrics node configuration
    this.intermediateNodeConfigs.push({
      type: 'metrics',
      config: { events },
      position: 'pre-and-post'
    });

    console.log(`Added metrics collection for events: ${events.join(', ')}`);
    return this;
  }

  /**
   * Add error recovery mechanism
   */
  withErrorRecovery(retryConfig?: { maxRetries?: number; retryDelay?: number }): this {
    const mergedConfig = {
      maxRetries: retryConfig?.maxRetries || this.options.retryCount,
      retryDelay: retryConfig?.retryDelay || 1000,
      ...retryConfig
    };

    // Add error recovery node configuration
    this.intermediateNodeConfigs.push({
      type: 'errorRecovery',
      config: mergedConfig,
      position: 'post-provider'
    });

    console.log(`Added error recovery with max retries: ${mergedConfig.maxRetries}`);
    return this;
  }

  /**
   * Add caching mechanism
   */
  withCaching(cacheConfig?: { ttl?: number; maxSize?: number }): this {
    if (!this.options.enableCaching) {
      console.warn('Caching is disabled in options');
      return this;
    }

    const mergedConfig = {
      ttl: cacheConfig?.ttl || 300000, // 5 minutes
      maxSize: cacheConfig?.maxSize || 1000,
      ...cacheConfig
    };

    // Add caching node configuration
    this.intermediateNodeConfigs.push({
      type: 'cache',
      config: mergedConfig,
      position: 'pre-provider'
    });

    console.log(`Added caching with TTL: ${mergedConfig.ttl}ms, maxSize: ${mergedConfig.maxSize}`);
    return this;
  }

  /**
   * Add protocol transformation if needed
   */
  withProtocolTransformation(inputProtocol: string, outputProtocol: string): this {
    if (inputProtocol === outputProtocol) {
      console.log('No protocol transformation needed');
      return this;
    }

    // Add LLM switch configuration
    this.currentConfig.llmSwitch = {
      name: `${this.currentConfig.name}-switch`,
      protocolMap: {
        [`${inputProtocol}_to_${outputProtocol}`]: this.getProtocolTemplate(inputProtocol, outputProtocol)
      }
    };

    console.log(`Added protocol transformation: ${inputProtocol} → ${outputProtocol}`);
    return this;
  }

  /**
   * Add workflow configuration
   */
  withWorkflow(workflowConfig: { name?: string; rules?: any[] }): this {
    this.currentConfig.workflow = {
      name: workflowConfig.name || this.currentConfig.name + '-workflow'
    };

    // Add workflow node configuration
    this.intermediateNodeConfigs.push({
      type: 'workflow',
      config: workflowConfig,
      position: 'pre-compatibility'
    });

    console.log(`Added workflow: ${this.currentConfig.workflow.name}`);
    return this;
  }

  /**
   * Add virtual model routing
   */
  withVirtualModelRouting(virtualModelId: string, targets: any[]): this {
    const routingConfig = {
      virtualModelId,
      targets,
      strategy: 'priority',
      fallbackEnabled: true
    };

    // Add virtual model routing node configuration
    this.intermediateNodeConfigs.push({
      type: 'virtualModelRouter',
      config: routingConfig,
      position: 'pre-llmswitch'
    });

    console.log(`Added virtual model routing for: ${virtualModelId}`);
    return this;
  }

  /**
   * Build the final pipeline configuration
   */
  build(): PipelineConstructionResult {
    const startTime = Date.now();

    try {
      if (!this.currentConfig) {
        throw new Error('Pipeline configuration not initialized. Call createPipeline() first.');
      }

      // Sort intermediate nodes by position
      const sortedNodes = this.sortNodesByPosition(this.intermediateNodeConfigs);

      // Build the complete configuration
      const completeConfig = this.buildCompleteConfiguration(sortedNodes);

      const buildTime = Date.now() - startTime;

      const result: PipelineConstructionResult = {
        success: true,
        pipelineId: this.currentConfig.name,
        configuration: completeConfig,
        metrics: {
          buildTime,
          nodeCount: this.calculateNodeCount(completeConfig)
        }
      };

      console.log(`Pipeline built successfully: ${this.currentConfig.name}`, {
        buildTime,
        nodeCount: result.metrics?.nodeCount
      });

      return result;

    } catch (error) {
      const buildTime = Date.now() - startTime;
      console.error('Failed to build pipeline:', error);

      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        metrics: {
          buildTime,
          nodeCount: 0
        }
      };
    }
  }

  /**
   * Build from virtual model configuration (convenience method)
   */
  buildFromVirtualModel(
    virtualModelId: string,
    virtualModelConfig: any,
    providersConfig: Record<string, any>,
    adapter: any
  ): PipelineConstructionResult {
    try {
      // Convert virtual model config to pipeline config
      const adapterResult = adapter.convertVirtualModelToPipelineConfig(
        virtualModelId,
        virtualModelConfig,
        providersConfig
      );

      if (!adapterResult.success || !adapterResult.data) {
        return {
          success: false,
          errors: [`Adapter conversion failed: ${adapterResult.error}`]
        };
      }

      // Start building the pipeline
      this.createPipeline(adapterResult.data);

      // Add common RCC pipeline features
      if (this.options.enableLoadBalancing) {
        this.withLoadBalancing({
          strategy: 'roundRobin',
          healthCheckInterval: 30000,
          circuitBreakerConfig: {
            enabled: true,
            threshold: 3,
            timeout: 15000
          }
        });
      }

      if (this.options.enableMetrics) {
        this.withMetrics(['request', 'response', 'error', 'timeout']);
      }

      if (this.options.enableErrorRecovery) {
        this.withErrorRecovery({
          maxRetries: this.options.retryCount!,
          retryDelay: 1000
        });
      }

      if (this.options.enableCaching) {
        this.withCaching({
          ttl: 300000, // 5 minutes
          maxSize: 1000
        });
      }

      // Add virtual model specific configurations
      if (virtualModelConfig.workflow) {
        this.withWorkflow(virtualModelConfig.workflow);
      }

      if (virtualModelConfig.targets && virtualModelConfig.targets.length > 1) {
        this.withVirtualModelRouting(virtualModelId, virtualModelConfig.targets);
      }

      // Add protocol transformation if needed
      const inputProtocol = adapterResult.data.inputProtocol;
      const targetProtocol = this.determineTargetProtocol(adaptersResult.data);
      if (inputProtocol && targetProtocol && inputProtocol !== targetProtocol) {
        this.withProtocolTransformation(inputProtocol, targetProtocol);
      }

      return this.build();

    } catch (error) {
      console.error(`Failed to build pipeline from virtual model ${virtualModelId}:`, error);

      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Build multiple pipelines from project configuration
   */
  buildPipelinesFromProject(
    configData: any,
    adapter: any
  ): AdapterResult<PipelineConstructionResult[]> {
    console.log('Building pipelines from project configuration');

    const results: PipelineConstructionResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!configData || !configData.virtualModels) {
      errors.push('Project configuration must contain virtualModels');
      return {
        success: false,
        error: errors.join(', ')
      };
    }

    // Build pipeline for each virtual model
    for (const [virtualModelId, vmConfig] of Object.entries(configData.virtualModels)) {
      try {
        const result = this.buildFromVirtualModel(
          virtualModelId,
          vmConfig,
          configData.providers || {},
          adapter
        );
        results.push(result);

        if (!result.success) {
          errors.push(`Pipeline ${virtualModelId} failed: ${result.errors?.join(', ')}`);
        }
      } catch (error) {
        const errorMsg = `Error building pipeline ${virtualModelId}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
      }
    }

    const success = results.length > 0 && errors.length === 0;

    console.log(`Pipeline building completed`, {
      success,
      pipelineCount: results.length,
      errorCount: errors.length
    });

    return {
      success,
      data: results,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Get current configuration state (for debugging)
   */
  getCurrentConfiguration(): WebAutoPipelineConfig | null {
    return this.currentConfig ? { ...this.currentConfig } : null;
  }

  /**
   * Reset builder state
   */
  reset(): void {
    this.currentConfig = {} as WebAutoPipelineConfig;
    this.intermediateNodeConfigs = [];
    this.loadBalancingConfig = undefined;
    console.log('Pipeline builder state reset');
  }

  /**
   * Sort nodes by execution position
   */
  private sortNodesByPosition(nodes: any[]): any[] {
    const positionOrder = {
      'pre-llmswitch': 1,
      'llmswitch': 2,
      'pre-compatibility': 3,
      'compatibility': 4,
      'pre-provider': 5,
      'provider': 6,
      'post-provider': 7,
      'pre-and-post': 8
    };

    return nodes.sort((a, b) => {
      const posA = positionOrder[a.position as keyof typeof positionOrder] || 10;
      const posB = positionOrder[b.position as keyof typeof positionOrder] || 10;
      return posA - posB;
    });
  }

  /**
   * Build complete pipeline configuration
   */
  private buildCompleteConfiguration(sortedNodes: any[]): any {
    const enhancedConfig = {
      ...this.currentConfig,
      nodes: [],
      metadata: {
        builderOptions: this.options,
        loadBalancing: this.loadBalancingConfig,
        intermediateNodes: sortedNodes.length,
        buildTimestamp: Date.now()
      }
    };

    // Add intermediate nodes to the configuration
    sortedNodes.forEach(nodeConfig => {
      enhancedConfig.nodes.push(nodeConfig);
    });

    return enhancedConfig;
  }

  /**
   * Calculate total node count
   */
  private calculateNodeCount(config: any): number {
    let count = config.nodes ? config.nodes.length : 0;

    // Count standard pipeline nodes
    if (config.llmSwitch) count++;
    if (config.workflow) count++;
    if (config.compatibility) count++;
    if (config.provider) count++;

    return count;
  }

  /**
   * Get protocol conversion template
   */
  private getProtocolTemplate(inputProtocol: string, outputProtocol: string): any {
    // Template for common protocol conversions
    const templates: Record<string, Record<string, any>> = {
      'anthropic_to_openai': {
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
      },
      'openai_to_openai': {
        requestTemplate: {
          model: "{{model}}",
          messages: "{{messages}}"
        },
        responseTemplate: {
          id: "{{id}}",
          object: "{{object}}",
          choices: "{{choices}}"
        }
      }
    };

    return templates[`${inputProtocol}_to_${outputProtocol}`] || {};
  }

  /**
   * Determine target protocol based on provider configuration
   */
  private determineTargetProtocol(config: WebAutoPipelineConfig): string {
    const providerPriorities = {
      'openai': 'openai',
      'anthropic': 'anthropic',
      'qwen': 'openai',
      'lmstudio': 'openai',
      'gemini': 'openai'
    };

    return providerPriorities[config.provider.providerName] || 'openai';
  }
}