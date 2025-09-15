/**
 * Pipeline instance implementation
 */
import { BaseModule } from 'rcc-basemodule';
import { PipelineConfig } from './PipelineConfig';
import { PipelineState, PipelineHealth, PipelineHealthMetrics, PipelineExecutionContext, PipelineExecutionResult, PipelineError, PipelineErrorCode } from './ErrorTypes';
/**
 * Pipeline instance interface
 */
export interface IPipelineInstance {
    getId(): string;
    getPipelineId(): string;
    getConfig(): PipelineConfig;
    getState(): PipelineState;
    getHealth(): PipelineHealth;
    getHealthMetrics(): PipelineHealthMetrics;
    isHealthy(): boolean;
    isReady(): boolean;
    initialize(): Promise<void>;
    execute(context: PipelineExecutionContext): Promise<PipelineExecutionResult>;
    destroy(): Promise<void>;
    updateHealthMetrics(metrics: Partial<PipelineHealthMetrics>): void;
    recordError(error: PipelineError): void;
    recordSuccess(responseTime: number): void;
    setState(state: PipelineState): void;
    enable(): void;
    disable(): void;
    setMaintenance(enabled: boolean): void;
    performHealthCheck(): Promise<boolean>;
}
/**
 * Pipeline instance implementation
 */
export declare class PipelineInstance extends BaseModule implements IPipelineInstance {
    private pipelineId;
    private pipelineConfig;
    private state;
    private healthMetrics;
    private lastHealthCheck;
    private healthCheckInterval;
    private isMaintenanceMode;
    private isEnabled;
    constructor(pipelineId: string, config: PipelineConfig, healthCheckInterval?: number);
    /**
     * Get pipeline instance ID
     */
    getId(): string;
    /**
     * Get pipeline ID
     */
    getPipelineId(): string;
    /**
     * Get pipeline configuration
     */
    getConfig(): PipelineConfig;
    /**
     * Get current state
     */
    getState(): PipelineState;
    /**
     * Get current health status
     */
    getHealth(): PipelineHealth;
    /**
     * Get health metrics
     */
    getHealthMetrics(): PipelineHealthMetrics;
    /**
     * Check if instance is healthy
     */
    isHealthy(): boolean;
    /**
     * Check if instance is ready for requests
     */
    isReady(): boolean;
    /**
     * Initialize the pipeline instance
     */
    initialize(): Promise<void>;
    /**
     * Execute a request on this pipeline instance
     */
    execute(context: PipelineExecutionContext): Promise<PipelineExecutionResult>;
    /**
     * Destroy the pipeline instance
     */
    destroy(): Promise<void>;
    /**
     * Update health metrics
     */
    updateHealthMetrics(metrics: Partial<PipelineHealthMetrics>): void;
    /**
     * Record an error
     */
    recordError(error: PipelineError): void;
    /**
     * Record a successful execution
     */
    recordSuccess(responseTime: number): void;
    /**
     * Set pipeline state
     */
    setState(state: PipelineState): void;
    /**
     * Enable the pipeline instance
     */
    enable(): void;
    /**
     * Disable the pipeline instance
     */
    disable(): void;
    /**
     * Set maintenance mode
     */
    setMaintenance(enabled: boolean): void;
    /**
     * Initialize the actual pipeline implementation
     * Override this method in subclasses
     */
    protected initializePipeline(): Promise<void>;
    /**
     * Execute the actual pipeline implementation
     * Override this method in subclasses
     */
    protected executePipeline(context: PipelineExecutionContext): Promise<any>;
    /**
     * Destroy the actual pipeline implementation
     * Override this method in subclasses
     */
    protected destroyPipeline(): Promise<void>;
    /**
     * Convert any error to PipelineError
     */
    private convertToPipelineError;
    /**
     * Update health status based on metrics
     */
    private updateHealthStatus;
    /**
     * Create initial health metrics
     */
    private createInitialHealthMetrics;
    /**
     * Perform health check
     */
    performHealthCheck(): Promise<boolean>;
    /**
     * Perform actual health check
     * Override this method in subclasses
     */
    protected performActualHealthCheck(): Promise<boolean>;
    /**
     * Get HTTP status code for error
     */
    getHttpStatusCode(errorCode: PipelineErrorCode): number;
}
//# sourceMappingURL=PipelineInstance.d.ts.map