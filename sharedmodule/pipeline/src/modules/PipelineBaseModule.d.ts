/**
 * Pipeline Base Module - Base module for pipeline components with enhanced debug capabilities
 * 流水线基础模块 - 具有增强调试功能的流水线组件基础模块
 */
import { BaseModule, DebugConfig, IOTrackingConfig, ModuleIOEntry } from 'rcc-basemodule';
import { ErrorHandlingCenter } from 'rcc-errorhandling';

/**
 * Provider information structure
 * 提供者信息结构
 */
export interface ProviderInfo {
    name: string;
    endpoint?: string;
    supportedModels: string[];
    defaultModel?: string;
    type: 'provider' | 'scheduler' | 'tracker' | 'pipeline';
}

/**
 * Pipeline operation context for error handling
 * 用于错误处理的流水线操作上下文
 */
export interface PipelineOperationContext {
    operation?: string;
    stage?: string;
    requestId?: string;
    additionalData?: Record<string, unknown>;
}

/**
 * Pipeline-specific module configuration
 * 流水线特定模块配置
 */
export interface PipelineModuleConfig {
    id: string;
    name: string;
    version: string;
    description: string;
    type: 'provider' | 'scheduler' | 'tracker' | 'pipeline';
    providerName?: string;
    endpoint?: string;
    supportedModels?: string[];
    defaultModel?: string;
    maxConcurrentRequests?: number;
    requestTimeout?: number;
    enableTwoPhaseDebug?: boolean;
    debugBaseDirectory?: string;
    enableIOTracking?: boolean;
    ioTrackingConfig?: IOTrackingConfig;
}

/**
 * Pipeline metrics interface
 * 流水线指标接口
 */
export interface PipelineMetrics {
    debugEnabled: boolean;
    ioTrackingEnabled: boolean;
    debugConfig: Record<string, unknown>;
    pipelineEntries?: ModuleIOEntry[];
    ioFiles?: string[];
}

/**
 * Pipeline Base Module with enhanced debug capabilities and strict type safety
 * 具有增强调试功能和严格类型安全的流水线基础模块
 */
export declare class PipelineBaseModule extends BaseModule {
    protected pipelineConfig: PipelineModuleConfig;
    protected errorHandler: ErrorHandlingCenter;
    constructor(config: PipelineModuleConfig);

    /**
     * Get pipeline configuration (safe copy)
     * 获取流水线配置（安全副本）
     */
    getPipelineConfig(): PipelineModuleConfig;

    /**
     * Update pipeline configuration
     * 更新流水线配置
     */
    updatePipelineConfig(newConfig: Partial<PipelineModuleConfig>): void;

    /**
     * Get provider information
     * 获取提供者信息
     */
    getProviderInfo(): ProviderInfo;

    /**
     * Track pipeline operation with I/O tracking and strict typing
     * 跟踪流水线操作并记录I/O，具有严格类型
     */
    trackPipelineOperation<T, I = unknown>(
        operationId: string,
        operation: () => Promise<T>,
        inputData?: I,
        operationType?: string
    ): Promise<T>;

    /**
     * Record pipeline stage
     * 记录流水线阶段
     */
    recordPipelineStage(
        stageName: string,
        stageData?: unknown,
        status?: 'started' | 'completed' | 'failed'
    ): void;

    /**
     * Handle pipeline errors with enhanced error handling
     * 处理流水线错误并提供增强的错误处理
     */
    handlePipelineError(
        error: Error,
        context: PipelineOperationContext
    ): void;

    /**
     * Format error response with detailed information
     * 格式化错误响应并提供详细信息
     */
    formatErrorResponse(
        error: Error,
        context?: PipelineOperationContext
    ): Record<string, unknown>;

    /**
     * Get pipeline metrics with proper typing
     * 获取流水线指标，具有适当的类型
     */
    getPipelineMetrics(): PipelineMetrics;

    /**
     * Override destroy method to ensure proper cleanup
     * 重写destroy方法以确保正确的清理
     */
    destroy(): Promise<void>;
}