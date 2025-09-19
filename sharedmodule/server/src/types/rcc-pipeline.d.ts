declare module 'rcc-pipeline' {
  export interface PipelineConfig {
    id: string;
    name: string;
    virtualModelId: string;
    targets: any[];
    loadBalancingStrategy: string;
    healthCheckInterval: number;
    maxRetries: number;
    timeout: number;
  }

  export interface PipelineTarget {
    providerId: string;
    modelId: string;
    keyIndex: number;
    weight?: number;
    enabled?: boolean;
  }

  export interface PipelineExecutionResult {
    success: boolean;
    response?: any;
    error?: string;
    duration: number;
    executionId: string;
  }

  export class Pipeline {
    constructor(config: PipelineConfig, tracker: any);
    execute(request: any, operationType: string): Promise<PipelineExecutionResult>;
  }

  export class VirtualModelSchedulerManager {
    constructor(config: any);
    registerVirtualModel(config: any): Promise<void>;
    getVirtualModel(modelId: string): any;
    scheduleRequest(request: any, modelId: string): Promise<any>;
  }
}