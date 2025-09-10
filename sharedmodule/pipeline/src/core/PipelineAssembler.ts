import { ModuleInfo, BaseModule } from 'rcc-basemodule';
import { IPipelineAssembler, PipelineAssemblyConfig, Pipeline as IPipelineInterface, PipelineModuleConfig, ModuleConnection } from '../interfaces/IPipelineAssembler';
import { BasePipelineModule } from '../modules/BasePipelineModule';
import { LLMSwitchModule } from '../modules/LLMSwitchModule';
import { WorkflowModule } from '../modules/WorkflowModule';
import { CompatibilityModule } from '../modules/CompatibilityModule';
import { ProviderModule } from '../modules/ProviderModule';
import { v4 as uuidv4 } from 'uuid';

/**
 * Pipeline Implementation
 */
export class Pipeline implements IPipelineInterface {
  private id: string;
  private name: string;
  private version: string;
  private description?: string;
  private modules: Map<string, BasePipelineModule> = new Map();
  private connections: ModuleConnection[] = [];
  private isActive: boolean = false;

  constructor(config: PipelineAssemblyConfig) {
    this.id = config.id;
    this.name = config.name;
    this.version = config.version;
    this.description = config.description;
    this.connections = config.connections;
  }

  /**
   * Add a module to the pipeline
   * @param module - Module instance
   */
  addModule(module: BasePipelineModule): void {
    this.modules.set(module.getId(), module);
  }

  /**
   * Process request through the pipeline
   * @param request - Input request
   * @returns Promise<any> - Processed request
   */
  async process(request: any): Promise<any> {
    if (!this.isActive) {
      throw new Error('Pipeline is not active');
    }

    const pipelineContext = {
      pipelineId: this.id,
      requestId: uuidv4(),
      startTime: Date.now(),
      metadata: {}
    };

    let result = { ...request, ...pipelineContext };

    // Process through modules based on request connections
    const requestConnections = this.connections.filter(conn => conn.type === 'request');
    for (const connection of requestConnections) {
      const module = this.modules.get(connection.source);
      if (module) {
        try {
          result = await module.process(result);
        } catch (error: any) {
          throw new Error(`Pipeline processing failed at module ${connection.source}: ${error.message}`);
        }
      }
    }

    return result;
  }

  /**
   * Process response through the pipeline
   * @param response - Input response
   * @returns Promise<any> - Processed response
   */
  async processResponse(response: any): Promise<any> {
    if (!this.isActive) {
      throw new Error('Pipeline is not active');
    }

    let result = response;

    // Process through modules based on response connections (reverse order)
    const responseConnections = this.connections.filter(conn => conn.type === 'response');
    for (const connection of responseConnections.reverse()) {
      const module = this.modules.get(connection.source);
      if (module) {
        try {
          if (module.processResponse) {
            result = await module.processResponse(result);
          }
        } catch (error: any) {
          throw new Error(`Pipeline response processing failed at module ${connection.source}: ${error.message}`);
        }
      }
    }

    return result;
  }

  /**
   * Activate all modules in the pipeline
   */
  async activate(): Promise<void> {
    if (this.isActive) {
      return;
    }

    for (const module of this.modules.values()) {
      try {
        if (!module.isConfigured()) {
          throw new Error(`Module ${module.getId()} is not configured`);
        }
        // Module will be connected through pipeline connections
      } catch (error: any) {
        throw new Error(`Failed to activate module ${module.getId()}: ${error.message}`);
      }
    }

    this.isActive = true;
  }

  /**
   * Deactivate all modules in the pipeline
   */
  async deactivate(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    for (const module of this.modules.values()) {
      try {
        // Module will be disconnected through pipeline connections
      } catch (error: any) {
        console.error(`Failed to deactivate module ${module.getId()}:`, error);
      }
    }

    this.isActive = false;
  }

  /**
   * Check if pipeline is active
   */
  isPipelineActive(): boolean {
    return this.isActive;
  }

  /**
   * Get module by ID
   * @param moduleId - Module ID
   * @returns BasePipelineModule | undefined - Module instance
   */
  getModule(moduleId: string): BasePipelineModule | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Get all modules
   * @returns BasePipelineModule[] - Array of modules
   */
  getModules(): BasePipelineModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get pipeline information
   */
  getPipelineInfo() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      isActive: this.isActive,
      moduleCount: this.modules.size,
      connectionCount: this.connections.length
    };
  }

  /**
   * Get pipeline health status
   * @returns Object containing health information
   */
  getHealth(): any {
    const moduleHealth = Array.from(this.modules.values()).map(module => {
      try {
        return module.getHealth();
      } catch (error) {
        return {
          moduleId: module.getId(),
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    return {
      pipelineId: this.id,
      status: this.isActive ? 'active' : 'inactive',
      uptime: Date.now() - (this as any).startTime || Date.now(),
      moduleCount: this.modules.size,
      modules: moduleHealth,
      lastCheck: Date.now()
    };
  }
}

/**
 * Pipeline Assembler Implementation
 */
export class PipelineAssembler implements IPipelineAssembler {
  private activePipeline: Pipeline | null = null;
  private moduleFactories: Map<string, (info: ModuleInfo) => BasePipelineModule> = new Map();

  constructor() {
    this.initializeModuleFactories();
  }

  /**
   * Initialize module factories for creating module instances
   */
  private initializeModuleFactories(): void {
    this.moduleFactories.set('LLMSwitch', (info: ModuleInfo) => new LLMSwitchModule(info));
    this.moduleFactories.set('Workflow', (info: ModuleInfo) => new WorkflowModule(info));
    this.moduleFactories.set('Compatibility', (info: ModuleInfo) => new CompatibilityModule(info));
    this.moduleFactories.set('Provider', (info: ModuleInfo) => new ProviderModule(info));
  }

  /**
   * Assemble a pipeline from configuration
   * @param config - Pipeline assembly configuration
   * @returns Promise<Pipeline> - Assembled pipeline
   */
  async assemble(config: PipelineAssemblyConfig): Promise<Pipeline> {
    try {
      // Deactivate existing pipeline if any
      if (this.activePipeline) {
        await this.deactivate();
      }

      // Validate configuration
      this.validateConfig(config);

      // Create new pipeline instance
      const pipeline = new Pipeline(config);

      // Create and register module instances
      for (const moduleConfig of config.modules) {
        const module = await this.createModule(moduleConfig);
        pipeline.addModule(module);
      }

      // Validate connections
      this.validateConnection(config.connections, pipeline);

      this.activePipeline = pipeline;

      return pipeline;
    } catch (error: any) {
      throw new Error(`Failed to assemble pipeline: ${error.message}`);
    }
  }

  /**
   * Create a module instance from configuration
   * @param moduleConfig - Module configuration
   * @returns Promise<BasePipelineModule> - Created module instance
   */
  private async createModule(moduleConfig: PipelineModuleConfig): Promise<BasePipelineModule> {
    const factory = this.moduleFactories.get(moduleConfig.type);
    if (!factory) {
      throw new Error(`Unknown module type: ${moduleConfig.type}`);
    }

    const moduleInfo: ModuleInfo = {
      id: moduleConfig.id,
      name: moduleConfig.type,
      version: '1.0.0',
      description: `${moduleConfig.type} module`,
      type: moduleConfig.type.toLowerCase(),
      metadata: {}
    };

    const module = factory(moduleInfo);

    // Configure the module
    if (moduleConfig.config) {
      await module.configure(moduleConfig.config);
    }

    return module;
  }

  /**
   * Validate pipeline configuration
   * @param config - Pipeline assembly configuration
   */
  private validateConfig(config: PipelineAssemblyConfig): void {
    if (!config.id || !config.name || !config.version) {
      throw new Error('Pipeline configuration must have id, name, and version');
    }

    if (!config.modules || config.modules.length === 0) {
      throw new Error('Pipeline must have at least one module');
    }

    // Check for duplicate module IDs
    const moduleIds = new Set<string>();
    for (const moduleConfig of config.modules) {
      if (!moduleConfig.id || !moduleConfig.type) {
        throw new Error('Each module must have id and type');
      }
      if (moduleIds.has(moduleConfig.id)) {
        throw new Error(`Duplicate module ID: ${moduleConfig.id}`);
      }
      moduleIds.add(moduleConfig.id);
    }

    // Validate module types
    for (const moduleConfig of config.modules) {
      if (!this.moduleFactories.has(moduleConfig.type)) {
        throw new Error(`Unsupported module type: ${moduleConfig.type}`);
      }
    }
  }

  /**
   * Validate pipeline connections
   * @param connections - Module connections
   * @param pipeline - Pipeline instance
   */
  private validateConnection(connections: ModuleConnection[], pipeline: Pipeline): void {
    const validModuleIds = new Set(pipeline.getModules().map(m => m.getId()));

    for (const connection of connections) {
      if (!connection.source || !connection.target) {
        throw new Error('Each connection must have source and target');
      }

      if (!validModuleIds.has(connection.source)) {
        throw new Error(`Invalid connection source module: ${connection.source}`);
      }

      if (!validModuleIds.has(connection.target)) {
        throw new Error(`Invalid connection target module: ${connection.target}`);
      }

      if (connection.type !== 'request' && connection.type !== 'response') {
        throw new Error(`Invalid connection type: ${connection.type}`);
      }
    }
  }

  /**
   * Activate the assembled pipeline
   */
  async activate(): Promise<void> {
    if (!this.activePipeline) {
      throw new Error('No pipeline assembled. Call assemble() first.');
    }

    await this.activePipeline.activate();
  }

  /**
   * Deactivate the active pipeline
   */
  async deactivate(): Promise<void> {
    if (this.activePipeline) {
      await this.activePipeline.deactivate();
      this.activePipeline = null;
    }
  }

  /**
   * Get the active pipeline
   * @returns Pipeline | null - Active pipeline instance
   */
  getActivePipeline(): Pipeline | null {
    return this.activePipeline;
  }

  /**
   * Get available module types
   * @returns string[] - Array of available module types
   */
  getAvailableModuleTypes(): string[] {
    return Array.from(this.moduleFactories.keys());
  }

  /**
   * Get pipeline status
   */
  getPipelineStatus() {
    if (!this.activePipeline) {
      return {
        status: 'inactive',
        message: 'No active pipeline'
      };
    }

    return {
      status: 'active',
      pipeline: this.activePipeline.getPipelineInfo(),
      modules: this.activePipeline.getModules().map(m => ({
        id: m.getId(),
        name: m.getName(),
        type: m.getType(),
        isConfigured: m.isConfigured()
      }))
    };
  }
}