/**
 * Pipeline scheduler - central scheduling and load balancing system
 */
import { BaseModule } from 'rcc-basemodule';
import { Message, MessageResponse } from 'rcc-basemodule';
import { PipelineSystemConfig } from './PipelineConfig';
import { PipelineError, PipelineExecutionResult, PipelineState, PipelineHealth } from './ErrorTypes';
/**
 * Scheduler statistics
 */
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
    loadBalancerStats: Record<string, any>;
}
/**
 * Pipeline scheduler interface
 */
export interface IPipelineScheduler {
    initialize(): Promise<void>;
    execute(payload: Record<string, any>, options?: ExecutionOptions): Promise<PipelineExecutionResult>;
    createPipeline(config: Record<string, any>): Promise<string>;
    destroyPipeline(pipelineId: string): Promise<void>;
    enablePipeline(pipelineId: string): Promise<void>;
    disablePipeline(pipelineId: string): Promise<void>;
    setPipelineMaintenance(pipelineId: string, enabled: boolean): Promise<void>;
    getPipelineStatus(pipelineId: string): Promise<PipelineStatus>;
    getAllPipelineStatuses(): Promise<PipelineStatus[]>;
    getSchedulerStats(): SchedulerStats;
    healthCheck(): Promise<boolean>;
    shutdown(): Promise<void>;
}
/**
 * Execution options
 */
export interface ExecutionOptions {
    timeout?: number;
    maxRetries?: number;
    preferredPipelineId?: string;
    retryDelay?: number;
    metadata?: Record<string, any>;
}
/**
 * Pipeline status
 */
export interface PipelineStatus {
    pipelineId: string;
    name: string;
    type: string;
    state: PipelineState;
    health: PipelineHealth;
    enabled: boolean;
    inMaintenance: boolean;
    instanceCount: number;
    healthyInstanceCount: number;
    lastError?: PipelineError;
    uptime: number;
    requestCount: number;
    successRate: number;
    averageResponseTime: number;
}
/**
 * Pipeline scheduler implementation
 */
export declare class PipelineScheduler extends BaseModule implements IPipelineScheduler {
    private configManager;
    private errorHandler;
    private enhancedErrorHandler;
    private loadBalancer;
    private pipelineInstances;
    private schedulerStats;
    private healthCheckInterval;
    private metricsInterval;
    private isShuttingDown;
    private startTime;
    constructor(config: PipelineSystemConfig);
    /**
     * Initialize the scheduler
     */
    initialize(): Promise<void>;
    /**
     * Execute a request through the pipeline system
     */
    execute(payload: Record<string, any>, options?: ExecutionOptions): Promise<PipelineExecutionResult>;
    /**
     * Execute with retry logic
     */
    private executeWithRetry;
    /**
     * Create a new pipeline
     */
    createPipeline(config: Record<string, any>): Promise<string>;
    /**
     * Destroy a pipeline
     */
    destroyPipeline(pipelineId: string): Promise<void>;
    /**
     * Enable a pipeline
     */
    enablePipeline(pipelineId: string): Promise<void>;
    /**
     * Disable a pipeline
     */
    disablePipeline(pipelineId: string): Promise<void>;
    /**
     * Set pipeline maintenance mode
     */
    setPipelineMaintenance(pipelineId: string, enabled: boolean): Promise<void>;
    /**
     * Get pipeline status
     */
    getPipelineStatus(pipelineId: string): Promise<PipelineStatus>;
    /**
     * Get all pipeline statuses
     */
    getAllPipelineStatuses(): Promise<PipelineStatus[]>;
    /**
     * Get scheduler statistics
     */
    getSchedulerStats(): SchedulerStats;
    /**
     * Perform health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Shutdown the scheduler
     */
    shutdown(): Promise<void>;
    /**
     * Create pipeline instances from configuration
     */
    private createPipelineInstances;
    /**
     * Start health checks
     */
    private startHealthChecks;
    /**
     * Start metrics collection
     */
    private startMetricsCollection;
    /**
     * Collect metrics
     */
    private collectMetrics;
    /**
     * Update pipeline statistics
     */
    private updatePipelineStats;
    /**
     * Update pipeline configuration
     */
    private updatePipelineConfig;
    /**
     * Register message handlers
     */
    private registerMessageHandlers;
    /**
     * Handle incoming messages
     */
    handleMessage(message: Message): Promise<MessageResponse | void>;
    /**
     * Check if error is a local error
     */
    private isLocalError;
    /**
     * Check if error is a send phase error (500)
     */
    private isSendPhaseError;
    /**
     * Create initial statistics
     */
    private createInitialStats;
}
//# sourceMappingURL=PipelineScheduler.d.ts.map