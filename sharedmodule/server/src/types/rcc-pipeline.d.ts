declare module 'rcc-pipeline' {
  export interface IPipelineScheduler {
    initialize(): Promise<void>;
    executePipeline(modelId: string, context: any): Promise<any>;
    getPipelineConfig(modelId: string): Promise<any>;
    destroy(): Promise<void>;
    getSchedulerStats(): any;
    healthCheck(): Promise<boolean>;
    shutdown(): Promise<void>;
  }

  export class PipelineScheduler implements IPipelineScheduler {
    initialize(): Promise<void>;
    executePipeline(modelId: string, context: any): Promise<any>;
    getPipelineConfig(modelId: string): Promise<any>;
    destroy(): Promise<void>;
    getSchedulerStats(): any;
    healthCheck(): Promise<boolean>;
    shutdown(): Promise<void>;
  }

  export interface PipelineExecutionResult {
    executionId: string;
    pipelineId: string;
    instanceId: string;
    status: string;
    startTime: number;
    endTime: number;
    duration: number;
    result: any;
    metadata: any;
    retryCount: number;
    error?: any;
  }

  export interface SchedulerStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    activeInstances: number;
    totalInstances: number;
    blacklistedInstances: number;
    uptime: number;
    lastHealthCheck: number;
    requestsByPipeline: Map<string, number>;
    errorsByPipeline: Map<string, number>;
    loadBalancerStats: any;
  }
}