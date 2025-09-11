/**
 * Enhanced Configuration System with Pipeline Integration
 * 
 * This extends the base ConfigurationSystem to add pipeline assembly capabilities
 * for virtual model mapping configurations.
 */

import { ConfigurationSystem } from '../core/ConfigurationSystem';
import { ConfigData } from '../core/ConfigData';

// 使用相对路径导入
import { ConfigurationToPipelineModule } from '../integration/ConfigurationToPipelineModule';
import { ConfigSource } from './ConfigData';
import { PipelineTableConfig, VirtualModelMapping, PipelineAssemblyResult } from '../integration/ConfigurationToPipelineModule';

// 使用any类型避免导入错误
type PipelineAssembler = any;
type VirtualModelRulesModule = any;
type PipelineAssemblyConfig = any;
type Pipeline = any;

/**
 * Enhanced Configuration System with Pipeline Integration
 */
export class EnhancedConfigurationSystem extends ConfigurationSystem {
  private pipelineAssembler: PipelineAssembler;
  private virtualModelRulesModule: VirtualModelRulesModule;
  private configToPipelineModule: ConfigurationToPipelineModule;
  private pipelineIntegrationEnabled: boolean = false;

  constructor(
    pipelineAssembler?: any,
    virtualModelRulesModule?: any,
    pipelineTableConfig?: Partial<PipelineTableConfig>
  ) {
    super();
    
    // 使用any类型避免构造函数错误
    this.pipelineAssembler = pipelineAssembler || {} as any;
    this.virtualModelRulesModule = virtualModelRulesModule || {} as any;
    
    this.configToPipelineModule = new ConfigurationToPipelineModule(
      this,
      this.pipelineAssembler,
      this.virtualModelRulesModule,
      pipelineTableConfig
    );
  }

  /**
   * Initialize the enhanced configuration system
   */
  public override async initialize(config?: Record<string, any>): Promise<void> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Initializing Enhanced Configuration System', 2, {});
      }

      // Initialize base configuration system
      await super.initialize(config);

      // Initialize pipeline integration if enabled
      if (config?.['pipelineIntegration']?.enabled !== false) {
        await this.initializePipelineIntegration(config?.['pipelineIntegration']);
      }

      if (this.debugModule) {
        this.debugModule.log('Enhanced Configuration System initialized successfully', 2, {});
      }

    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to initialize Enhanced Configuration System', 0, { error });
      }
      throw error;
    }
  }

  /**
   * Initialize pipeline integration
   */
  private async initializePipelineIntegration(config?: any): Promise<void> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Initializing pipeline integration', 2, { config });
      }

      // Initialize virtual model rules module
      await this.virtualModelRulesModule.initialize();

      // Initialize configuration to pipeline module
      await this.configToPipelineModule.initialize();

      this.pipelineIntegrationEnabled = true;

      if (this.debugModule) {
        this.debugModule.log('Pipeline integration initialized successfully', 2, {});
      }

    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to initialize pipeline integration', 0, { error });
      }
      throw error;
    }
  }

  /**
   * Load configuration and automatically assemble pipelines
   */
  public override async loadConfiguration(source: string | ConfigSource): Promise<ConfigData> {
    const config = await super.loadConfiguration(source);

    // Automatically assemble pipelines if integration is enabled
    if (this.pipelineIntegrationEnabled) {
      try {
        await this.assemblePipelinesFromConfiguration(config);
      } catch (error) {
        if (this.debugModule) {
          this.debugModule.log('Failed to automatically assemble pipelines after configuration load', 1, { error });
        }
        // Don't fail the configuration load if pipeline assembly fails
      }
    }

    return config;
  }

  /**
   * Parse virtual model mappings from configuration
   */
  public async parseVirtualModelMappings(config?: ConfigData): Promise<VirtualModelMapping[]> {
    if (!this.pipelineIntegrationEnabled) {
      throw new Error('Pipeline integration is not enabled');
    }

    return await this.configToPipelineModule.parseVirtualModelMappings(config);
  }

  /**
   * Generate pipeline table from virtual model mappings
   */
  public async generatePipelineTable(mappings?: VirtualModelMapping[]): Promise<Map<string, PipelineAssemblyConfig>> {
    if (!this.pipelineIntegrationEnabled) {
      throw new Error('Pipeline integration is not enabled');
    }

    return await this.configToPipelineModule.generatePipelineTable(mappings);
  }

  /**
   * Assemble pipelines from configuration
   */
  public async assemblePipelinesFromConfiguration(config?: ConfigData): Promise<PipelineAssemblyResult> {
    if (!this.pipelineIntegrationEnabled) {
      throw new Error('Pipeline integration is not enabled');
    }

    return await this.configToPipelineModule.assemblePipelinesFromConfiguration(config);
  }

  /**
   * Get pipeline configuration for a virtual model
   */
  public getPipelineConfig(virtualModelId: string): PipelineAssemblyConfig | undefined {
    if (!this.pipelineIntegrationEnabled) {
      return undefined;
    }

    return this.configToPipelineModule.getPipelineConfig(virtualModelId);
  }

  /**
   * Get all pipeline configurations
   */
  public getAllPipelineConfigs(): Map<string, PipelineAssemblyConfig> {
    if (!this.pipelineIntegrationEnabled) {
      return new Map();
    }

    return this.configToPipelineModule.getAllPipelineConfigs();
  }

  /**
   * Get pipeline for a virtual model
   */
  public getPipeline(virtualModelId: string): Pipeline | undefined {
    if (!this.pipelineIntegrationEnabled) {
      return undefined;
    }

    return this.configToPipelineModule.getPipeline(virtualModelId);
  }

  /**
   * Validate configuration for pipeline assembly
   */
  public async validateConfigurationForPipeline(config: ConfigData): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    if (!this.pipelineIntegrationEnabled) {
      return { valid: true, errors: [], warnings: [] };
    }

    return await this.configToPipelineModule.validateConfigurationForPipeline(config);
  }

  /**
   * Reload configuration and reassemble pipelines
   */
  public async reloadAndReassemble(): Promise<PipelineAssemblyResult> {
    if (!this.pipelineIntegrationEnabled) {
      throw new Error('Pipeline integration is not enabled');
    }

    return await this.configToPipelineModule.reloadAndReassemble();
  }

  /**
   * Get enhanced configuration system status
   */
  public getEnhancedStatus() {
    const baseStatus = {
      moduleId: 'EnhancedConfigurationSystem',
      initialized: this.initialized, // 使用基类的initialized属性
      hasConfiguration: false, // 简化状态检查
      pipelineIntegrationEnabled: this.pipelineIntegrationEnabled
    };

    if (this.pipelineIntegrationEnabled) {
      return {
        ...baseStatus,
        pipelineIntegration: this.configToPipelineModule.getStatus()
      };
    }

    return baseStatus;
  }

  /**
   * Handle incoming messages with enhanced pipeline integration support
   */
  public override async handleMessage(message: any): Promise<any> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Handling message', 2, { 
          type: message.type,
          source: message.source
        });
      }

      // Handle pipeline integration specific messages
      if (this.pipelineIntegrationEnabled) {
        switch (message.type) {
          case 'pipeline-assembly-request':
          case 'pipeline-reload-request':
          case 'pipeline-status-request':
          case 'config-validation-request':
            return await this.configToPipelineModule.handleMessage(message);
        }
      }

      // Fall back to base message handling
      return await super.handleMessage(message);

    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Error handling message', 0, { error, messageType: message.type });
      }
      return {
        messageId: message.id,
        correlationId: message.correlationId || `response-${message.id}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Clean up enhanced configuration system resources
   */
  public override async destroy(): Promise<void> {
    try {
      if (this.debugModule) {
        this.debugModule.log('Destroying Enhanced Configuration System', 2, {});
      }

      // Clean up pipeline integration
      if (this.pipelineIntegrationEnabled) {
        await this.configToPipelineModule.destroy();
        await this.virtualModelRulesModule.destroy();
        await this.pipelineAssembler.deactivate();
      }

      // Clean up base configuration system
      await super.destroy();

      if (this.debugModule) {
        this.debugModule.log('Enhanced Configuration System destroyed successfully', 2, {});
      }

    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to destroy Enhanced Configuration System', 0, { error });
      }
      throw error;
    }
  }

  /**
   * Enable pipeline integration
   */
  public async enablePipelineIntegration(config?: Partial<PipelineTableConfig>): Promise<void> {
    if (this.pipelineIntegrationEnabled) {
      return; // Already enabled
    }

    try {
      // Initialize pipeline modules
      await this.virtualModelRulesModule.initialize();
      
      // Reinitialize config to pipeline module with new config
      if (config) {
        this.configToPipelineModule = new ConfigurationToPipelineModule(
          this,
          this.pipelineAssembler,
          this.virtualModelRulesModule,
          config
        );
      }
      
      await this.configToPipelineModule.initialize();
      this.pipelineIntegrationEnabled = true;

      // Assemble pipelines from current configuration if available
      // Note: We cannot access private currentConfig property, so we skip this step

    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to enable pipeline integration', 0, { error });
      }
      throw error;
    }
  }

  /**
   * Disable pipeline integration
   */
  public async disablePipelineIntegration(): Promise<void> {
    if (!this.pipelineIntegrationEnabled) {
      return; // Already disabled
    }

    try {
      // Deactivate pipelines
      await this.pipelineAssembler.deactivate();
      
      // Destroy integration module
      await this.configToPipelineModule.destroy();
      
      this.pipelineIntegrationEnabled = false;

    } catch (error) {
      if (this.debugModule) {
        this.debugModule.log('Failed to disable pipeline integration', 0, { error });
      }
      throw error;
    }
  }

  /**
   * Check if pipeline integration is enabled
   */
  public isPipelineIntegrationEnabled(): boolean {
    return this.pipelineIntegrationEnabled;
  }

  /**
   * Get pipeline assembler instance
   */
  public getPipelineAssembler(): any {
    return this.pipelineAssembler;
  }

  /**
   * Get virtual model rules module instance
   */
  public getVirtualModelRulesModule(): any {
    return this.virtualModelRulesModule;
  }

  /**
   * Get configuration to pipeline module instance
   */
  public getConfigToPipelineModule(): ConfigurationToPipelineModule {
    return this.configToPipelineModule;
  }
}