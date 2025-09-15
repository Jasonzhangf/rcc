import { IPipelineAssembler, PipelineAssemblyConfig, Pipeline as IPipelineInterface } from '../interfaces/IPipelineAssembler';
import { BasePipelineModule } from '../modules/BasePipelineModule';
/**
 * Pipeline Implementation
 */
export declare class Pipeline implements IPipelineInterface {
    private id;
    private name;
    private version;
    private description?;
    private modules;
    private connections;
    private isActive;
    constructor(config: PipelineAssemblyConfig);
    /**
     * Add a module to the pipeline
     * @param module - Module instance
     */
    addModule(module: BasePipelineModule): void;
    /**
     * Process request through the pipeline
     * @param request - Input request
     * @returns Promise<any> - Processed request
     */
    process(request: any): Promise<any>;
    /**
     * Process response through the pipeline
     * @param response - Input response
     * @returns Promise<any> - Processed response
     */
    processResponse(response: any): Promise<any>;
    /**
     * Activate all modules in the pipeline
     */
    activate(): Promise<void>;
    /**
     * Deactivate all modules in the pipeline
     */
    deactivate(): Promise<void>;
    /**
     * Check if pipeline is active
     */
    isPipelineActive(): boolean;
    /**
     * Get module by ID
     * @param moduleId - Module ID
     * @returns BasePipelineModule | undefined - Module instance
     */
    getModule(moduleId: string): BasePipelineModule | undefined;
    /**
     * Get all modules
     * @returns BasePipelineModule[] - Array of modules
     */
    getModules(): BasePipelineModule[];
    /**
     * Get pipeline information
     */
    getPipelineInfo(): {
        id: string;
        name: string;
        version: string;
        description: string;
        isActive: boolean;
        moduleCount: number;
        connectionCount: number;
    };
    /**
     * Get pipeline health status
     * @returns Object containing health information
     */
    getHealth(): any;
}
/**
 * Pipeline Assembler Implementation
 */
export declare class PipelineAssembler implements IPipelineAssembler {
    private activePipeline;
    private moduleFactories;
    constructor();
    /**
     * Initialize module factories for creating module instances
     */
    private initializeModuleFactories;
    /**
     * Assemble a pipeline from configuration
     * @param config - Pipeline assembly configuration
     * @returns Promise<Pipeline> - Assembled pipeline
     */
    assemble(config: PipelineAssemblyConfig): Promise<Pipeline>;
    /**
     * Create a module instance from configuration
     * @param moduleConfig - Module configuration
     * @returns Promise<BasePipelineModule> - Created module instance
     */
    private createModule;
    /**
     * Validate pipeline configuration
     * @param config - Pipeline assembly configuration
     */
    private validateConfig;
    /**
     * Validate pipeline connections
     * @param connections - Module connections
     * @param pipeline - Pipeline instance
     */
    private validateConnection;
    /**
     * Activate the assembled pipeline
     */
    activate(): Promise<void>;
    /**
     * Deactivate the active pipeline
     */
    deactivate(): Promise<void>;
    /**
     * Get the active pipeline
     * @returns Pipeline | null - Active pipeline instance
     */
    getActivePipeline(): Pipeline | null;
    /**
     * Get available module types
     * @returns string[] - Array of available module types
     */
    getAvailableModuleTypes(): string[];
    /**
     * Get pipeline status
     */
    getPipelineStatus(): {
        status: string;
        message: string;
        pipeline?: undefined;
        modules?: undefined;
    } | {
        status: string;
        pipeline: {
            id: string;
            name: string;
            version: string;
            description: string;
            isActive: boolean;
            moduleCount: number;
            connectionCount: number;
        };
        modules: {
            id: string;
            name: string;
            type: string;
            isConfigured: boolean;
        }[];
        message?: undefined;
    };
}
//# sourceMappingURL=PipelineAssembler.d.ts.map