import { BaseModule } from 'rcc-basemodule';
import { IVirtualModelRouter } from '../interfaces/IServerModule';
import { VirtualModelConfig, ClientRequest, RoutingRule } from '../types/ServerTypes';
type BaseProvider = any;
export interface RoutingDecision {
    model: VirtualModelConfig;
    confidence: number;
    reason: string;
    alternativeModels?: VirtualModelConfig[];
}
export interface ModelMetrics {
    modelId: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastUsed: number;
    uptime: number;
    errorRate: number;
    throughput: number;
}
export declare class VirtualModelRouter extends BaseModule implements IVirtualModelRouter {
    private virtualModels;
    private routingRules;
    private modelMetrics;
    private schedulerManager;
    private pipelineTracker;
    private providers;
    private isSchedulerEnabled;
    constructor();
    /**
     * Route a request to the appropriate virtual model
     */
    routeRequest(request: ClientRequest): Promise<VirtualModelConfig>;
    /**
     * Register a new virtual model
     */
    registerModel(model: VirtualModelConfig): Promise<void>;
    /**
     * Process targets array and convert to model configuration
     */
    private processTargets;
    /**
     * Infer capabilities from targets configuration
     */
    private inferCapabilitiesFromTargets;
    /**
     * Generate endpoint URL from provider ID
     */
    private generateEndpointFromProvider;
    /**
     * Unregister a virtual model
     */
    unregisterModel(modelId: string): Promise<void>;
    /**
     * Update routing rules for a model
     */
    updateRoutingRules(modelId: string, rules: RoutingRule[]): Promise<void>;
    /**
     * Get model metrics
     */
    getModelMetrics(modelId: string): Promise<ModelMetrics>;
    /**
     * Get all registered models
     */
    getModels(): VirtualModelConfig[];
    /**
     * Get enabled models only
     */
    getEnabledModels(): VirtualModelConfig[];
    /**
     * Get model by ID
     */
    getModel(modelId: string): VirtualModelConfig | undefined;
    /**
     * Make routing decision based on rules
     */
    private makeRoutingDecision;
    /**
     * Apply routing rules to filter candidate models
     */
    private applyRoutingRules;
    /**
     * Evaluate routing rules for a request
     */
    private evaluateRoutingRules;
    /**
     * Evaluate a single rule condition
     */
    private evaluateRuleCondition;
    /**
     * Analyze request features for intelligent routing
     */
    private analyzeRequestFeatures;
    /**
     * Intelligent model selection based on request features
     */
    private intelligentModelSelection;
    /**
     * Select the best candidate from the list
     */
    private selectBestCandidate;
    /**
     * Generate routing reason for logging
     */
    private generateRoutingReason;
    /**
     * Calculate confidence score for model selection
     */
    private calculateConfidence;
    /**
     * Extract required capabilities from request
     */
    private extractRequiredCapabilities;
    /**
     * Record request metrics
     */
    private recordRequestMetrics;
    /**
     * Validate model configuration
     */
    private validateModelConfig;
    /**
     * Validate routing rule
     */
    private validateRoutingRule;
    /**
     * Get detailed model status for debugging
     */
    getModelStatus(): {
        totalModels: number;
        enabledModels: number;
        disabledModels: number;
        modelDetails: Array<{
            id: string;
            name: string;
            enabled: boolean;
            capabilities: string[];
            health: number;
            lastUsed?: number;
        }>;
    };
    /**
     * Perform health check on all models
     */
    performHealthCheck(): Promise<void>;
    /**
     * Cleanup resources
     */
    destroy(): Promise<void>;
    /**
     * Add provider to scheduler system
     */
    addProvider(providerId: string, provider: BaseProvider): Promise<void>;
    /**
     * Remove provider from scheduler system
     */
    removeProvider(providerId: string): Promise<boolean>;
    /**
     * Execute request through scheduler
     */
    executeWithScheduler(virtualModelId: string, request: any, operation?: 'chat' | 'streamChat' | 'healthCheck', options?: {
        timeout?: number;
        retries?: number;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        metadata?: Record<string, any>;
    }): Promise<any>;
    /**
     * Execute streaming request through scheduler
     */
    executeStreamingWithScheduler(virtualModelId: string, request: any, operation?: 'chat' | 'streamChat' | 'healthCheck', options?: {
        timeout?: number;
        retries?: number;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        metadata?: Record<string, any>;
    }): AsyncGenerator<any, void, unknown>;
    /**
     * Get scheduler metrics
     */
    getSchedulerMetrics(): any;
    /**
     * Get scheduler health
     */
    getSchedulerHealth(): any;
    /**
     * Enable/disable scheduler
     */
    setSchedulerEnabled(enabled: boolean): void;
    /**
     * Get virtual model scheduler
     */
    getVirtualModelScheduler(virtualModelId: string): any | null;
    /**
     * Get all virtual model mappings
     */
    getVirtualModelMappings(): any[];
}
export {};
//# sourceMappingURL=VirtualModelRouter.d.ts.map