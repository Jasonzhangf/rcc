import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../modules/BasePipelineModule';

// Import the new frameworks
import { 
  LLMSwitchFramework, 
  LLMSwitchFrameworkConfig 
} from '../nodes/llmswitch';

import { 
  WorkflowFramework, 
  WorkflowFrameworkConfig 
} from '../nodes/workflow';

import { 
  CompatibilityFramework, 
  CompatibilityFrameworkConfig 
} from '../nodes/compatibility';

import { 
  ProviderFramework, 
  ProviderFrameworkConfig 
} from '../nodes/provider';

// Import the original modules for backward compatibility
import { LLMSwitchModule, LLMSwitchConfig } from '../modules/LLMSwitchModule';
import { WorkflowModule, WorkflowConfig } from '../modules/WorkflowModule';
import { CompatibilityModule, CompatibilityConfig } from '../modules/CompatibilityModule';
import { ProviderModule, ProviderConfig } from '../modules/ProviderModule';
import { 
  IPipelineAssembler, 
  PipelineAssemblyConfig, 
  PipelineModuleConfig, 
  ModuleConnection, 
  Pipeline 
} from '../interfaces/IPipelineAssembler';

// Import framework initialization utilities
import { 
  NodeImplementationScanner, 
  initializePipelineFrameworks 
} from '../nodes';

/**
 * Pipeline Module Factory - Creates instances of pipeline modules
 */
class PipelineModuleFactory {
  /**
   * Create a pipeline module instance based on configuration
   * @param moduleConfig - Module configuration
   * @returns BasePipelineModule - Created module instance
   */
  static createModule(moduleConfig: PipelineModuleConfig): BasePipelineModule {
    const moduleInfo: ModuleInfo = {
      id: moduleConfig.id,
      name: moduleConfig.id, // Use id as name for simplicity
      version: '1.0.0',
      description: `${moduleConfig.type} module`,
      type: moduleConfig.type,
      metadata: {
        enabled: true,
        config: moduleConfig.config
      }
    };

    // Check if we should use the new framework or legacy module
    const useFramework = moduleConfig.config?.useFramework !== false;

    switch (moduleConfig.type) {
      case 'llmswitch':
        if (useFramework) {
          return new LLMSwitchFramework(moduleInfo);
        } else {
          return new LLMSwitchModule(moduleInfo);
        }
      
      case 'workflow':
        if (useFramework) {
          return new WorkflowFramework(moduleInfo);
        } else {
          return new WorkflowModule(moduleInfo);
        }
      
      case 'compatibility':
        if (useFramework) {
          return new CompatibilityFramework(moduleInfo);
        } else {
          return new CompatibilityModule(moduleInfo);
        }
      
      case 'provider':
        if (useFramework) {
          return new ProviderFramework(moduleInfo);
        } else {
          return new ProviderModule(moduleInfo);
        }
      
      default:
        throw new Error(`Unsupported module type: ${moduleConfig.type}`);
    }
  }
}

/**
 * Pipeline Implementation - Manages the complete pipeline flow
 */
class ConcretePipeline implements Pipeline {
  private pipelineId: string;
  private name: string;
  private version: string;
  private description: string;
  private modules: Map<string, BasePipelineModule> = new Map();
  private requestChain: BasePipelineModule[] = [];
  private responseChain: BasePipelineModule[] = [];
  private activated: boolean = false;

  constructor(
    pipelineId: string,
    name: string,
    version: string,
    description: string,
    modules: Map<string, BasePipelineModule>,
    requestChain: BasePipelineModule[],
    responseChain: BasePipelineModule[]
  ) {
    this.pipelineId = pipelineId;
    this.name = name;
    this.version = version;
    this.description = description;
    this.modules = modules;
    this.requestChain = requestChain;
    this.responseChain = responseChain;
  }

  /**
   * Process request through the pipeline chain
   * @param request - Input request
   * @returns Promise<any> - Processed request
   */
  async process(request: any): Promise<any> {
    if (!this.activated) {
      throw new Error('Pipeline not activated: Pipeline must be activated before processing');
    }

    const startTime = Date.now();
    let currentRequest = request;

    try {
      // Process through each module in the request chain
      for (const module of this.requestChain) {
        currentRequest = await module.process(currentRequest);
      }

      return currentRequest;

    } catch (error: any) {
      throw new Error(`Pipeline processing failed: ${error.message}`);
    }
  }

  /**
   * Process response through the response chain (reverse order)
   * @param response - Input response
   * @returns Promise<any> - Processed response
   */
  async processResponse(response: any): Promise<any> {
    if (!this.activated) {
      throw new Error('Pipeline not activated: Pipeline must be activated before processing responses');
    }

    const startTime = Date.now();
    let currentResponse = response;

    try {
      // Process through each module in the response chain (reverse order)
      for (const module of this.responseChain) {
        currentResponse = await module.processResponse?.(currentResponse) || currentResponse;
      }

      return currentResponse;

    } catch (error: any) {
      throw new Error(`Pipeline response processing failed: ${error.message}`);
    }
  }

  /**
   * Activate the pipeline - Initialize all modules
   */
  async activate(): Promise<void> {
    if (this.activated) {
      return;
    }

    try {
      // Configure and initialize all modules
      for (const module of this.modules.values()) {
        module.configure; // We'll add a proper check later
      }

      this.activated = true;
      console.log(`Pipeline ${this.pipelineId} activated successfully`);

    } catch (error: any) {
      throw new Error(`Pipeline activation failed: ${error.message}`);
    }
  }

  /**
   * Deactivate the pipeline - Cleanup resources
   */
  async deactivate(): Promise<void> {
    if (!this.activated) {
      return;
    }

    try {
      // Cleanup all modules
      for (const module of this.modules.values()) {
        await module.destroy();
      }

      this.modules.clear();
      this.requestChain = [];
      this.responseChain = [];
      this.activated = false;

      console.log(`Pipeline ${this.pipelineId} deactivated successfully`);

    } catch (error: any) {
      throw new Error(`Pipeline deactivation failed: ${error.message}`);
    }
  }

  /**
   * Get pipeline health status
   * @returns any - Health status information
   */
  getHealth(): any {
    return {
      pipelineId: this.pipelineId,
      name: this.name,
      version: this.version,
      activated: this.activated,
      modules: this.modules.size,
      requestChainLength: this.requestChain.length,
      responseChainLength: this.responseChain.length,
      timestamp: Date.now()
    };
  }
}

/**
 * Pipeline Assembler - Assembles and manages pipeline configurations
 * Implements the IPipelineAssembler interface
 */
export class PipelineAssembler implements IPipelineAssembler {
  private pipelines: Map<string, Pipeline> = new Map();
  private activePipeline: Pipeline | null = null;
  private frameworksInitialized: boolean = false;

  /**
   * Assemble a pipeline from configuration
   * @param config - Pipeline assembly configuration
   * @returns Promise<Pipeline> - Assembled pipeline
   */
  async assemble(config: PipelineAssemblyConfig): Promise<Pipeline> {
    console.log(`Assembling pipeline: ${config.id}`);

    try {
      // Initialize frameworks if not already done
      if (!this.frameworksInitialized) {
        console.log('Initializing pipeline frameworks...');
        await initializePipelineFrameworks();
        this.frameworksInitialized = true;
      }

      // Create all modules
      const modules: Map<string, BasePipelineModule> = new Map();
      
      for (const moduleConfig of config.modules) {
        const module = PipelineModuleFactory.createModule(moduleConfig);
        
        // Configure the module
        await module.configure(moduleConfig.config);
        modules.set(moduleConfig.id, module);
      }

      // Build request and response chains based on connections
      const { requestChain, responseChain } = this.buildProcessingChains(config, modules);

      // Create pipeline instance
      const pipeline = new ConcretePipeline(
        config.id,
        config.name,
        config.version,
        config.description || '',
        modules,
        requestChain,
        responseChain
      );

      // Store pipeline
      this.pipelines.set(config.id, pipeline);

      console.log(`Pipeline ${config.id} assembled successfully`);
      return pipeline;

    } catch (error: any) {
      throw new Error(`Pipeline assembly failed: ${error.message}`);
    }
  }

  /**
   * Build processing chains based on module connections
   * @param config - Pipeline assembly configuration
   * @param modules - Map of module instances
   * @returns object - Request and response processing chains
   */
  private buildProcessingChains(
    config: PipelineAssemblyConfig, 
    modules: Map<string, BasePipelineModule>
  ): { requestChain: BasePipelineModule[]; responseChain: BasePipelineModule[] } {
    
    // Build module graph
    const moduleGraph = new Map<string, string[]>();
    const reverseGraph = new Map<string, string[]>();

    // Initialize graphs
    for (const moduleConfig of config.modules) {
      moduleGraph.set(moduleConfig.id, []);
      reverseGraph.set(moduleConfig.id, []);
    }

    // Build connection graphs
    for (const connection of config.connections) {
      if (!moduleGraph.has(connection.source) || !moduleGraph.has(connection.target)) {
        throw new Error(`Invalid connection: unknown module ${connection.source} or ${connection.target}`);
      }

      if (connection.type === 'request') {
        moduleGraph.get(connection.source)!.push(connection.target);
        reverseGraph.get(connection.target)!.push(connection.source);
      }
    }

    // Topological sort for request chain
    const requestChain = this.topologicalSort(moduleGraph);
    const requestModules = requestChain.map(moduleId => {
      const module = modules.get(moduleId);
      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }
      return module;
    });

    // Build response chain (reverse of request chain)
    const responseModules = [...requestModules].reverse();

    return { requestChain: requestModules, responseChain: responseModules };
  }

  /**
   * Topological sort to determine module processing order
   * @param graph - Module graph
   * @returns string[] - Sorted module IDs
   */
  private topologicalSort(graph: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (node: string): void => {
      if (visited.has(node)) return;
      if (visiting.has(node)) {
        throw new Error('Circular dependency detected in module connections');
      }

      visiting.add(node);

      for (const neighbor of graph.get(node) || []) {
        visit(neighbor);
      }

      visiting.delete(node);
      visited.add(node);
      result.push(node);
    };

    for (const node of graph.keys()) {
      visit(node);
    }

    return result;
  }

  /**
   * Activate the pipeline system
   * No-op in this implementation, individual pipelines are activated separately
   */
  async activate(): Promise<void> {
    // No global activation needed in this implementation
  }

  /**
   * Deactivate the pipeline system
   * Deactivates all pipelines
   */
  async deactivate(): Promise<void> {
    const deactivationPromises = Array.from(this.pipelines.values()).map(pipeline => 
      pipeline.deactivate()
    );

    await Promise.all(deactivationPromises);
    this.pipelines.clear();
    this.activePipeline = null;
  }

  /**
   * Get a pipeline by ID
   * @param pipelineId - Pipeline ID
   * @returns Pipeline | null - Pipeline instance or null if not found
   */
  getPipeline(pipelineId: string): Pipeline | null {
    return this.pipelines.get(pipelineId) || null;
  }

  /**
   * Get all pipeline IDs
   * @returns string[] - Array of pipeline IDs
   */
  getPipelineIds(): string[] {
    return Array.from(this.pipelines.keys());
  }

  /**
   * Set the active pipeline
   * @param pipelineId - Pipeline ID
   */
  setActivePipeline(pipelineId: string): void {
    const pipeline = this.getPipeline(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }
    this.activePipeline = pipeline;
  }

  /**
   * Get the active pipeline
   * @returns Pipeline | null - Active pipeline or null
   */
  getActivePipeline(): Pipeline | null {
    return this.activePipeline;
  }

  /**
   * Remove a pipeline
   * @param pipelineId - Pipeline ID
   */
  async removePipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (pipeline) {
      await pipeline.deactivate();
      this.pipelines.delete(pipelineId);
      if (this.activePipeline === pipeline) {
        this.activePipeline = null;
      }
    }
  }

  /**
   * Get system status
   * @returns any - System status information
   */
  getSystemStatus(): any {
    return {
      totalPipelines: this.pipelines.size,
      activePipeline: this.activePipeline ? 'active' : null, // Simplified as getPipelineId is not available
      pipelineIds: this.getPipelineIds(),
      allPipelinesHealth: Array.from(this.pipelines.values()).map(p => (p as any).getHealth()),
      timestamp: Date.now()
    };
  }
}