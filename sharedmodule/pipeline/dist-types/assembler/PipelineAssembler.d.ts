import { IPipelineAssembler, PipelineAssemblyConfig, Pipeline } from '../interfaces/IPipelineAssembler';
/**
 * Pipeline Assembler - Assembles and manages pipeline configurations
 * Implements the IPipelineAssembler interface
 */
export declare class PipelineAssembler implements IPipelineAssembler {
    private pipelines;
    private activePipeline;
    private frameworksInitialized;
    /**
     * Assemble a pipeline from configuration
     * @param config - Pipeline assembly configuration
     * @returns Promise<Pipeline> - Assembled pipeline
     */
    assemble(config: PipelineAssemblyConfig): Promise<Pipeline>;
    /**
     * Build processing chains based on module connections
     * @param config - Pipeline assembly configuration
     * @param modules - Map of module instances
     * @returns object - Request and response processing chains
     */
    private buildProcessingChains;
    /**
     * Topological sort to determine module processing order
     * @param graph - Module graph
     * @returns string[] - Sorted module IDs
     */
    private topologicalSort;
    /**
     * Activate the pipeline system
     * No-op in this implementation, individual pipelines are activated separately
     */
    activate(): Promise<void>;
    /**
     * Deactivate the pipeline system
     * Deactivates all pipelines
     */
    deactivate(): Promise<void>;
    /**
     * Get a pipeline by ID
     * @param pipelineId - Pipeline ID
     * @returns Pipeline | null - Pipeline instance or null if not found
     */
    getPipeline(pipelineId: string): Pipeline | null;
    /**
     * Get all pipeline IDs
     * @returns string[] - Array of pipeline IDs
     */
    getPipelineIds(): string[];
    /**
     * Set the active pipeline
     * @param pipelineId - Pipeline ID
     */
    setActivePipeline(pipelineId: string): void;
    /**
     * Get the active pipeline
     * @returns Pipeline | null - Active pipeline or null
     */
    getActivePipeline(): Pipeline | null;
    /**
     * Remove a pipeline
     * @param pipelineId - Pipeline ID
     */
    removePipeline(pipelineId: string): Promise<void>;
    /**
     * Get system status
     * @returns any - System status information
     */
    getSystemStatus(): any;
}
//# sourceMappingURL=PipelineAssembler.d.ts.map