/**
 * Pipeline Assembler Interface
 * Defines methods for assembling and managing pipelines
 */
export interface IPipelineAssembler {
    assemble(config: PipelineAssemblyConfig): Promise<Pipeline>;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
}
export interface PipelineAssemblyConfig {
    id: string;
    name: string;
    version: string;
    description?: string;
    modules: PipelineModuleConfig[];
    connections: ModuleConnection[];
}
export interface PipelineModuleConfig {
    id: string;
    type: string;
    config: any;
}
export interface ModuleConnection {
    source: string;
    target: string;
    type: 'request' | 'response';
}
export interface Pipeline {
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    getHealth(): any;
}
