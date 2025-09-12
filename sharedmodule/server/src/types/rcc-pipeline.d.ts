declare module 'rcc-pipeline' {
  export interface IPipelineScheduler {
    initialize(): Promise<void>;
    executePipeline(modelId: string, context: any): Promise<any>;
    getPipelineConfig(modelId: string): Promise<any>;
    destroy(): Promise<void>;
  }

  export class PipelineScheduler implements IPipelineScheduler {
    initialize(): Promise<void>;
    executePipeline(modelId: string, context: any): Promise<any>;
    getPipelineConfig(modelId: string): Promise<any>;
    destroy(): Promise<void>;
  }
}