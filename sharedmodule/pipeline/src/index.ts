/**
 * RCC Pipeline Module - Simplified Version
 * Configurable AI protocol transformation pipeline
 */

// Core components
export { PipelineAssembler } from './core/PipelineAssembler';

// Modules
export { BasePipelineModule } from './modules/BasePipelineModule';
export { LLMSwitchModule } from './modules/LLMSwitchModule';
export { WorkflowModule } from './modules/WorkflowModule';
export { CompatibilityModule } from './modules/CompatibilityModule';
export { ProviderModule } from './modules/ProviderModule';

// Interfaces
export { IPipelineAssembler, PipelineAssemblyConfig, PipelineModuleConfig, ModuleConnection, Pipeline } from './interfaces/IPipelineAssembler';
export { IErrorManagementCenter } from './interfaces/IErrorManagementCenter';

// Version
export const PIPELINE_VERSION = '0.1.0';

// Import for PipelineBuilder
import { PipelineAssembler } from './core/PipelineAssembler';
import { PipelineAssemblyConfig, Pipeline } from './interfaces/IPipelineAssembler';

/**
 * Pipeline Builder - Convenience class for creating pipelines
 */
export class PipelineBuilder {
  private assembler: PipelineAssembler;
  private config: PipelineAssemblyConfig;

  constructor() {
    this.assembler = new PipelineAssembler();
    this.config = {
      id: '',
      name: '',
      version: '1.0.0',
      modules: [],
      connections: []
    };
  }

  /**
   * Set pipeline basic information
   * @param id - Pipeline ID
   * @param name - Pipeline name
   * @param version - Pipeline version
   * @param description - Pipeline description (optional)
   */
  setInfo(id: string, name: string, version: string = '1.0.0', description?: string): this {
    this.config.id = id;
    this.config.name = name;
    this.config.version = version;
    this.config.description = description;
    return this;
  }

  /**
   * Add a module to the pipeline
   * @param id - Module ID
   * @param type - Module type
   * @param config - Module configuration
   */
  addModule(id: string, type: string, config: any): this {
    this.config.modules.push({
      id,
      type,
      config
    });
    return this;
  }

  /**
   * Add LLMSwitch module
   * @param id - Module ID
   * @param config - Module configuration
   */
  addLLMSwitch(id: string, config: any = {}): this {
    return this.addModule(id, 'LLMSwitch', config);
  }

  /**
   * Add Workflow module
   * @param id - Module ID
   * @param config - Module configuration
   */
  addWorkflow(id: string, config: any = {}): this {
    return this.addModule(id, 'Workflow', config);
  }

  /**
   * Add Compatibility module
   * @param id - Module ID
   * @param config - Module configuration
   */
  addCompatibility(id: string, config: any = {}): this {
    return this.addModule(id, 'Compatibility', config);
  }

  /**
   * Add Provider module
   * @param id - Module ID
   * @param config - Module configuration
   */
  addProvider(id: string, config: any = {}): this {
    return this.addModule(id, 'Provider', config);
  }

  /**
   * Add a connection between modules
   * @param source - Source module ID
   * @param target - Target module ID
   * @param type - Connection type
   */
  addConnection(source: string, target: string, type: 'request' | 'response'): this {
    this.config.connections.push({
      source,
      target,
      type
    });
    return this;
  }

  /**
   * Build the pipeline
   * @returns Promise<Pipeline> - Built pipeline
   */
  async build(): Promise<Pipeline> {
    if (!this.config.id || !this.config.name) {
      throw new Error('Pipeline ID and name are required');
    }

    return this.assembler.assemble(this.config);
  }

  /**
   * Get the assembler instance
   * @returns PipelineAssembler - Assembler instance
   */
  getAssembler(): PipelineAssembler {
    return this.assembler;
  }
}

/**
 * Convenience function to create a pipeline builder
 */
export function createPipeline(): PipelineBuilder {
  return new PipelineBuilder();
}