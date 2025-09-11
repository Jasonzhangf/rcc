/**
 * Configuration to Pipeline Integration Module
 * 
 * This module extends the Configuration System to provide pipeline assembly functionality
 * based on virtual model mapping configurations. It serves as the bridge between
 * configuration management and pipeline execution.
 */

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import { ConfigurationSystem } from '../core/ConfigurationSystem';
import { ConfigData, VirtualModelTarget } from '../core/ConfigData';
import { PipelineAssembler } from 'rcc-pipeline';
import { VirtualModelRulesModule } from 'rcc-virtual-model-rules';
import { 
  PipelineAssemblyConfig, 
  PipelineModuleConfig, 
  ModuleConnection,
  Pipeline 
} from 'rcc-pipeline';
import { ConfigSource } from '../core/ConfigData';

/**
 * Virtual model mapping configuration
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
   * Pipeline configuration for this virtual model
   */
  pipelineConfig?: VirtualModelPipelineConfig;
  
  /**
   * Priority for routing (higher = higher priority)
   */
  priority?: number;
  
  /**
   * Whether this mapping is enabled
   */
  enabled?: boolean;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Pipeline configuration for virtual models
 */
export interface VirtualModelPipelineConfig {
  /**
   * Custom pipeline modules to include
   */
  modules?: PipelineModuleConfig[];
  
  /**
   * Custom module connections
   */
  connections?: ModuleConnection[];
  
  /**
   * Module-specific configurations
   */
  moduleConfigs?: Record<string, any>;
  
  /**
   * Pipeline execution settings
   */
  execution?: {
    timeout?: number;
    retryCount?: number;
    fallbackEnabled?: boolean;
  };
}

/**
 * Pipeline table generation configuration
 */
export interface PipelineTableConfig {
  /**
   * Whether to generate pipeline tables automatically
   */
  enabled: boolean;
  
  /**
   * Pipeline table generation strategy
   */
  strategy: 'static' | 'dynamic' | 'hybrid';
  
  /**
   * Default pipeline modules to include
   */
  defaultModules?: PipelineModuleConfig[];
  
  /**
   * Default module connections
   */
  defaultConnections?: ModuleConnection[];
  
  /**
   * Cache settings for generated pipelines
   */
  cache?: {
    enabled: boolean;
    ttl: number; // Time to live in milliseconds
    maxSize: number;
  };
  
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
 * Pipeline assembly result
 */
export interface PipelineAssemblyResult {
  /**
   * Whether assembly was successful
   */
  success: boolean;
  
  /**
   * Assembled pipeline (if successful)
   */
  pipeline?: Pipeline;
  
  /**
   * Generated pipeline table
   */
  pipelineTable?: Map<string, PipelineAssemblyConfig>;
  
  /**
   * Assembly errors (if any)
   */
  errors?: string[];
  
  /**
   * Assembly warnings (if any)
   */
  warnings?: string[];
  
  /**
   * Assembly metadata
   */
  metadata?: {
    assemblyTime: number;
    virtualModelCount: number;
    moduleCount: number;
    connectionCount: number;
  };
}

/**
 * Configuration to Pipeline Integration Module
 */
export class ConfigurationToPipelineModule extends BaseModule {
  private configurationSystem: ConfigurationSystem;
  private pipelineAssembler: PipelineAssembler;
  private virtualModelRulesModule: VirtualModelRulesModule;
  private pipelineTable: Map<string, PipelineAssemblyConfig> = new Map();
  private pipelineCache: Map<string, { pipeline: Pipeline; timestamp: number; ttl: number }> = new Map();
  protected config: PipelineTableConfig;
  private isInitialized: boolean = false;

  constructor(
    configurationSystem: ConfigurationSystem,
    pipelineAssembler: PipelineAssembler,
    virtualModelRulesModule: VirtualModelRulesModule,
    config?: Partial<PipelineTableConfig>
  ) {
    const moduleInfo: ModuleInfo = {
      id: 'ConfigurationToPipelineModule',
      name: 'RCC Configuration to Pipeline Integration Module',
      version: '1.0.0',
      description: 'Integrates configuration system with pipeline assembly for virtual model mapping',
      type: 'configuration-to-pipeline',
      metadata: {
        capabilities: [
          'virtual-model-mapping',
          'pipeline-generation',
          'assembly-management',
          'configuration-validation'
        ],
        dependencies: [
          'rcc-configuration',
          'rcc-pipeline',
          'rcc-virtual-model-rules'
        ],
        author: 'RCC Development Team',
        license: 'MIT'
      }
    };

    super(moduleInfo);

    this.configurationSystem = configurationSystem;
    this.pipelineAssembler = pipelineAssembler;
    this.virtualModelRulesModule = virtualModelRulesModule;
    
    // Default configuration
    this.config = {
      enabled: true,
      strategy: 'static',
      cache: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 100
      },
      validation: {
        strict: true,
        failOnError: true,
        warnOnUnknown: true
      },
      ...config
    };
  }

  /**
   * Initialize the configuration to pipeline integration
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Configuration to Pipeline module is already initialized');
      return;
    }

    console.log('Initializing Configuration to Pipeline Integration Module');

    try {
      // Call parent initialize first
      await super.initialize();

      // Initialize sub-modules if needed
      if (!this.configurationSystem) {
        throw new Error('ConfigurationSystem is required');
      }
      if (!this.pipelineAssembler) {
        throw new Error('PipelineAssembler is required');
      }
      if (!this.virtualModelRulesModule) {
        throw new Error('VirtualModelRulesModule is required');
      }

      // Setup message handlers
      this.setupMessageHandlers();

      // Start cache cleanup
      this.startCacheCleanup();

      this.isInitialized = true;
      console.log('Configuration to Pipeline Integration Module initialized successfully');

      // Notify initialization complete
      this.broadcastMessage('configuration-to-pipeline-initialized', {
        config: this.config
      });

    } catch (error) {
      console.error('Failed to initialize Configuration to Pipeline Integration Module', error);
      throw error;
    }
  }

  /**
   * Parse virtual model mappings from configuration
   */
  public async parseVirtualModelMappings(config?: ConfigData): Promise<VirtualModelMapping[]> {
    console.log('Parsing virtual model mappings');

    try {
      // Use provided config or get from configuration system
      const configData = config || this.configurationSystem.getConfiguration();
      
      if (!configData.virtualModels) {
        console.warn('No virtual models found in configuration');
        return [];
      }

      const virtualModels = configData.virtualModels;
      const mappings: VirtualModelMapping[] = [];

      for (const [virtualModelId, vmConfig] of Object.entries(virtualModels)) {
        try {
          const virtualModelMapping: VirtualModelMapping = {
            virtualModelId,
            targets: vmConfig.targets || [],
            priority: vmConfig.priority || 1,
            enabled: vmConfig.enabled !== false,
            metadata: {}
          };

          // Parse pipeline configuration if present
          // In our simplified structure, pipelineConfig is part of the VirtualModelConfig
          if ((vmConfig as any).pipelineConfig) {
            virtualModelMapping.pipelineConfig = this.parsePipelineConfig((vmConfig as any).pipelineConfig);
          }

          // Validate mapping
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

      console.log('Virtual model mappings parsed successfully', { 
        mappingCount: mappings.length 
      });

      return mappings;

    } catch (error) {
      console.error('Failed to parse virtual model mappings', error);
      throw error;
    }
  }

  /**
   * Generate pipeline table from virtual model mappings
   */
  public async generatePipelineTable(mappings: VirtualModelMapping[]): Promise<Map<string, PipelineAssemblyConfig>> {
    console.log('Generating pipeline table', { mappingCount: mappings.length });

    try {
      const pipelineTable = new Map<string, PipelineAssemblyConfig>();

      for (const mapping of mappings) {
        try {
          const pipelineConfig = await this.generatePipelineConfig(mapping);
          pipelineTable.set(mapping.virtualModelId, pipelineConfig);

        } catch (error) {
          console.error(`Failed to generate pipeline config for ${mapping.virtualModelId}`, error);
          
          if (this.config.validation?.failOnError) {
            throw error;
          }
        }
      }

      // Store generated pipeline table
      this.pipelineTable = pipelineTable;

      console.log('Pipeline table generated successfully', { 
        pipelineCount: pipelineTable.size 
      });

      return pipelineTable;

    } catch (error) {
      console.error('Failed to generate pipeline table', error);
      throw error;
    }
  }

  /**
   * Assemble pipelines from configuration (static one-time assembly)
   */
  public async assemblePipelinesFromConfiguration(config?: ConfigData): Promise<PipelineAssemblyResult> {
    console.log('Assembling pipelines from configuration');

    try {
      const startTime = Date.now();

      // Parse virtual model mappings
      const mappings = await this.parseVirtualModelMappings(config);

      // Generate pipeline table
      const pipelineTable = await this.generatePipelineTable(mappings);

      // Assemble pipelines
      const assemblyResults: PipelineAssemblyResult = {
        success: true,
        pipelineTable,
        metadata: {
          assemblyTime: 0,
          virtualModelCount: mappings.length,
          moduleCount: 0,
          connectionCount: 0
        }
      };

      let totalModuleCount = 0;
      let totalConnectionCount = 0;

      for (const [virtualModelId, pipelineConfig] of pipelineTable.entries()) {
        try {
          // Check cache first
          const cacheKey = `pipeline-${virtualModelId}-${JSON.stringify(pipelineConfig.modules)}`;
          const cached = this.pipelineCache.get(cacheKey);
          
          if (cached && Date.now() - cached.timestamp < cached.ttl) {
            console.log(`Using cached pipeline for ${virtualModelId}`);
            continue;
          }

          // Assemble pipeline
          const pipeline = await this.pipelineAssembler.assemble(pipelineConfig);
          
          // Cache the assembled pipeline
          if (this.config.cache?.enabled) {
            this.pipelineCache.set(cacheKey, {
              pipeline,
              timestamp: Date.now(),
              ttl: this.config.cache.ttl
            });
          }

          totalModuleCount += pipelineConfig.modules.length;
          totalConnectionCount += pipelineConfig.connections.length;

          console.log(`Pipeline assembled successfully for ${virtualModelId}`);

        } catch (error) {
          console.error(`Failed to assemble pipeline for ${virtualModelId}`, error);
          
          if (!assemblyResults.errors) {
            assemblyResults.errors = [];
          }
          assemblyResults.errors.push(`Failed to assemble pipeline for ${virtualModelId}: ${error instanceof Error ? error.message : String(error)}`);
          
          if (this.config.validation?.failOnError) {
            assemblyResults.success = false;
            break;
          }
        }
      }

      assemblyResults.metadata!.assemblyTime = Date.now() - startTime;
      assemblyResults.metadata!.moduleCount = totalModuleCount;
      assemblyResults.metadata!.connectionCount = totalConnectionCount;

      // Activate the assembled pipelines
      if (assemblyResults.success && pipelineTable.size > 0) {
        try {
          await this.pipelineAssembler.activate();
          console.log('All pipelines activated successfully');
        } catch (error) {
          console.error('Failed to activate pipelines', error);
          assemblyResults.success = false;
          assemblyResults.errors = assemblyResults.errors || [];
          assemblyResults.errors.push(`Failed to activate pipelines: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log('Pipeline assembly completed', { 
        success: assemblyResults.success,
        virtualModelCount: assemblyResults.metadata!.virtualModelCount,
        assemblyTime: assemblyResults.metadata!.assemblyTime
      });

      return assemblyResults;

    } catch (error) {
      console.error('Failed to assemble pipelines from configuration', error);
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        metadata: {
          assemblyTime: Date.now() - (this as any).startTime || 0,
          virtualModelCount: 0,
          moduleCount: 0,
          connectionCount: 0
        }
      };
    }
  }

  /**
   * Get pipeline configuration for a virtual model
   */
  public getPipelineConfig(virtualModelId: string): PipelineAssemblyConfig | undefined {
    return this.pipelineTable.get(virtualModelId);
  }

  /**
   * Get all pipeline configurations
   */
  public getAllPipelineConfigs(): Map<string, PipelineAssemblyConfig> {
    return new Map(this.pipelineTable);
  }

  /**
   * Get pipeline for a virtual model
   */
  public getPipeline(virtualModelId: string): Pipeline | undefined {
    const pipelineConfig = this.pipelineTable.get(virtualModelId);
    if (!pipelineConfig) {
      return undefined;
    }

    const cacheKey = `pipeline-${virtualModelId}-${JSON.stringify(pipelineConfig.modules)}`;
    const cached = this.pipelineCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.pipeline;
    }

    return undefined;
  }

  /**
   * Validate configuration before pipeline assembly
   */
  public async validateConfigurationForPipeline(config: ConfigData): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    console.log('Validating configuration for pipeline assembly');

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Virtual models validation
      if (!config.virtualModels) {
        warnings.push('No virtual models configured');
      } else {
        // Validate each virtual model mapping
        for (const [virtualModelId, vmConfig] of Object.entries(config.virtualModels)) {
          // Check if targets exist and validate first target
          if (vmConfig.targets && vmConfig.targets.length > 0) {
            const firstTarget = vmConfig.targets[0];
            if (!firstTarget.providerId) {
              errors.push(`Virtual model ${virtualModelId} missing providerId in first target`);
            }
            if (!firstTarget.modelId) {
              errors.push(`Virtual model ${virtualModelId} missing modelId in first target`);
            }
          } else {
            warnings.push(`Virtual model ${virtualModelId} has no targets configured`);
          }
          
          // Validate provider exists
          if (config.providers && vmConfig.targets && vmConfig.targets.length > 0) {
            const firstTarget = vmConfig.targets[0];
            if (!config.providers[firstTarget.providerId]) {
              errors.push(`Virtual model ${virtualModelId} references unknown provider: ${firstTarget.providerId}`);
            }
          }
        }
      }

      // Providers validation
      if (!config.providers) {
        warnings.push('No providers configured');
      } else {
        // Validate each provider
        for (const [providerId, provider] of Object.entries(config.providers)) {
          if (!provider.models || Object.keys(provider.models).length === 0) {
            warnings.push(`Provider ${providerId} has no models configured`);
          }
        }
      }

      const valid = errors.length === 0;
      
      console.log('Configuration validation completed', { 
        valid, 
        errorCount: errors.length, 
        warningCount: warnings.length 
      });

      return { valid, errors, warnings };

    } catch (error) {
      console.error('Failed to validate configuration', error);
      errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Reload configuration and reassemble pipelines
   */
  public async reloadAndReassemble(): Promise<PipelineAssemblyResult> {
    console.log('Reloading configuration and reassembling pipelines');

    try {
      // Clear existing pipeline table and cache
      this.pipelineTable.clear();
      this.pipelineCache.clear();

      // Deactivate existing pipelines
      await this.pipelineAssembler.deactivate();

      // Reassemble from current configuration
      return await this.assemblePipelinesFromConfiguration();

    } catch (error) {
      console.error('Failed to reload and reassemble', error);
      throw error;
    }
  }

  /**
   * Get module status and health information
   */
  public getStatus() {
    return {
      moduleId: 'ConfigurationToPipelineModule',
      initialized: this.isInitialized,
      config: this.config,
      pipelineTableSize: this.pipelineTable.size,
      pipelineCacheSize: this.pipelineCache.size,
      activePipeline: this.pipelineAssembler.getActivePipeline(),
      timestamp: Date.now()
    };
  }

  /**
   * Handle incoming messages
   */
  public async handleMessage(message: any): Promise<any> {
    console.log('Handling message', { type: message.type, source: message.source });

    try {
      switch (message.type) {
        case 'pipeline-assembly-request':
          return await this.handlePipelineAssemblyRequest(message);
        
        case 'pipeline-reload-request':
          return await this.handlePipelineReloadRequest(message);
        
        case 'pipeline-status-request':
          return await this.handlePipelineStatusRequest(message);
        
        case 'config-validation-request':
          return await this.handleConfigValidationRequest(message);
        
        default:
          return await super.handleMessage(message);
      }
    } catch (error) {
      console.error('Error handling message', error);
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    console.log('Cleaning up Configuration to Pipeline Integration Module');

    try {
      // Clear caches
      this.pipelineTable.clear();
      this.pipelineCache.clear();

      // Deactivate pipelines
      if (this.pipelineAssembler) {
        await this.pipelineAssembler.deactivate();
      }

      this.isInitialized = false;
      await super.destroy();

    } catch (error) {
      console.error('Error during cleanup', error);
      throw error;
    }
  }

  /**
   * Parse pipeline configuration from mapping
   */
  private parsePipelineConfig(pipelineConfig: any): VirtualModelPipelineConfig {
    const config: VirtualModelPipelineConfig = {
      execution: {
        timeout: pipelineConfig.timeout || 30000,
        retryCount: pipelineConfig.retryCount || 3,
        fallbackEnabled: pipelineConfig.fallbackEnabled !== false
      }
    };

    if (pipelineConfig.modules) {
      config.modules = pipelineConfig.modules.map((module: any) => ({
        id: module.id,
        type: module.type,
        config: module.config || {}
      }));
    }

    if (pipelineConfig.connections) {
      config.connections = pipelineConfig.connections.map((connection: any) => ({
        source: connection.source,
        target: connection.target,
        type: connection.type || 'request'
      }));
    }

    if (pipelineConfig.moduleConfigs) {
      config.moduleConfigs = { ...pipelineConfig.moduleConfigs };
    }

    return config;
  }

  /**
   * Generate pipeline configuration from virtual model mapping
   */
  private async generatePipelineConfig(mapping: VirtualModelMapping): Promise<PipelineAssemblyConfig> {
    const modules: PipelineModuleConfig[] = [];
    const connections: ModuleConnection[] = [];

    // Default modules based on strategy
    if (this.config.strategy === 'static' || this.config.strategy === 'hybrid') {
      // Add default modules
      if (this.config.defaultModules) {
        modules.push(...this.config.defaultModules);
      } else {
        // Get the first target for pipeline generation
        const firstTarget = mapping.targets && mapping.targets.length > 0 ? mapping.targets[0] : null;
        const providerId = firstTarget ? firstTarget.providerId : '';
        const modelId = firstTarget ? firstTarget.modelId : '';
        
        // Add basic default modules
        modules.push(
          {
            id: `${mapping.virtualModelId}-provider`,
            type: 'Provider',
            config: {
              providerId: providerId,
              modelId: modelId,
              ...mapping.pipelineConfig?.moduleConfigs?.provider
            }
          },
          {
            id: `${mapping.virtualModelId}-compatibility`,
            type: 'Compatibility',
            config: {
              targetProvider: providerId,
              targetModel: modelId,
              ...mapping.pipelineConfig?.moduleConfigs?.compatibility
            }
          }
        );
      }

      // Add default connections
      if (this.config.defaultConnections) {
        connections.push(...this.config.defaultConnections);
      } else {
        // Add basic default connections
        connections.push(
          {
            source: `${mapping.virtualModelId}-compatibility`,
            target: `${mapping.virtualModelId}-provider`,
            type: 'request'
          }
        );
      }
    }

    // Add custom modules from mapping
    if (mapping.pipelineConfig?.modules) {
      modules.push(...mapping.pipelineConfig.modules);
    }

    // Add custom connections from mapping
    if (mapping.pipelineConfig?.connections) {
      connections.push(...mapping.pipelineConfig.connections);
    }

    // Add workflow module if dynamic strategy
    if (this.config.strategy === 'dynamic' || this.config.strategy === 'hybrid') {
      modules.push({
        id: `${mapping.virtualModelId}-workflow`,
        type: 'Workflow',
        config: {
          virtualModelId: mapping.virtualModelId,
          priority: mapping.priority,
          ...mapping.pipelineConfig?.moduleConfigs?.workflow
        }
      });

      // Connect workflow module
      if (modules.length > 1) {
        connections.push({
          source: `${mapping.virtualModelId}-workflow`,
          target: modules[modules.length - 2].id,
          type: 'request'
        });
      }
    }

    // Get the first target for pipeline description
    const firstTarget = mapping.targets && mapping.targets.length > 0 ? mapping.targets[0] : null;
    const providerId = firstTarget ? firstTarget.providerId : '';
    const modelId = firstTarget ? firstTarget.modelId : '';
    
    const pipelineConfig: PipelineAssemblyConfig = {
      id: `pipeline-${mapping.virtualModelId}`,
      name: `Pipeline for ${mapping.virtualModelId}`,
      version: '1.0.0',
      description: `Pipeline for virtual model ${mapping.virtualModelId} routing to ${providerId}/${modelId}`,
      modules,
      connections
    };

    return pipelineConfig;
  }

  /**
   * Validate virtual model mapping
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
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    console.log('Setting up message handlers');
    // Message handling is done in handleMessage method
  }

  /**
   * Start cache cleanup
   */
  private startCacheCleanup(): void {
    // Clean up expired cache entries every minute
    setInterval(() => {
      this.cleanupCache();
    }, 60000);

    console.log('Cache cleanup started');
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, value] of this.pipelineCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.pipelineCache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log('Cache cleanup completed', { 
        entriesRemoved: keysToDelete.length 
      });
    }
  }

  /**
   * Handle pipeline assembly request
   */
  private async handlePipelineAssemblyRequest(message: any): Promise<any> {
    console.log('Handling pipeline assembly request');

    try {
      const config = message.payload?.config;
      const result = await this.assemblePipelinesFromConfiguration(config);

      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: true,
        data: { result },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Handle pipeline reload request
   */
  private async handlePipelineReloadRequest(message: any): Promise<any> {
    console.log('Handling pipeline reload request');

    try {
      const result = await this.reloadAndReassemble();

      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: true,
        data: { result },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Handle pipeline status request
   */
  private async handlePipelineStatusRequest(message: any): Promise<any> {
    console.log('Handling pipeline status request');

    const status = {
      moduleStatus: this.getStatus(),
      pipelineTable: Object.fromEntries(this.pipelineTable),
      cacheStats: {
        size: this.pipelineCache.size,
        entries: Array.from(this.pipelineCache.entries()).map(([key, value]) => ({
          key,
          timestamp: value.timestamp,
          ttl: value.ttl
        }))
      }
    };

    return {
      messageId: message.id,
      correlationId: message.correlationId || '',
      success: true,
      data: { status },
      timestamp: Date.now()
    };
  }

  /**
   * Handle configuration validation request
   */
  private async handleConfigValidationRequest(message: any): Promise<any> {
    console.log('Handling configuration validation request');

    try {
      const config = message.payload?.config || this.configurationSystem.getConfiguration();
      const validation = await this.validateConfigurationForPipeline(config);

      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: true,
        data: { validation },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }
}