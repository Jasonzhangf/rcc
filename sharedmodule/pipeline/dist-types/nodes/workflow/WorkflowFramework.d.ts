import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../modules/BasePipelineModule';
import { NodeImplementationInfo } from '../../core/NodeImplementationInfo';
/**
 * Workflow Framework Configuration
 */
export interface WorkflowFrameworkConfig {
    /** Workflow processing mode */
    processingMode: 'stream-conversion' | 'batch-processing' | 'generic';
    /** Input format type */
    inputFormat: 'stream' | 'non-stream' | 'batch';
    /** Output format type */
    outputFormat: 'stream' | 'non-stream' | 'batch';
    /** Preferred implementation ID (optional) */
    preferredImplementation?: string;
    /** Framework-specific settings */
    framework?: {
        /** Enable implementation auto-discovery */
        autoDiscovery?: boolean;
        /** Fallback to default implementation if preferred fails */
        fallbackToDefault?: boolean;
        /** Implementation selection timeout */
        selectionTimeout?: number;
    };
}
/**
 * Workflow Framework - Manages workflow processing implementations
 */
export declare class WorkflowFramework extends BasePipelineModule {
    protected config: WorkflowFrameworkConfig;
    private registry;
    private selectedImplementation;
    private implementationInstance;
    constructor(info: ModuleInfo);
    /**
     * Configure the Workflow Framework
     * @param config - Framework configuration
     */
    configure(config: WorkflowFrameworkConfig): Promise<void>;
    /**
     * Process request through selected implementation
     * @param request - Input request data
     * @returns Promise<any> - Processed request data
     */
    process(request: any): Promise<any>;
    /**
     * Process response through selected implementation
     * @param response - Input response data
     * @returns Promise<any> - Processed response data
     */
    processResponse(response: any): Promise<any>;
    /**
     * Select the best implementation based on configuration
     */
    private selectImplementation;
    /**
     * Create an instance of the selected implementation
     */
    private createImplementationInstance;
    /**
     * Get information about the selected implementation
     */
    getImplementationInfo(): NodeImplementationInfo | null;
    /**
     * Get available implementations for this framework
     */
    getAvailableImplementations(): NodeImplementationInfo[];
    /**
     * Check if the framework is properly configured
     */
    isConfigured(): boolean;
    /**
     * Get framework statistics
     */
    getStatistics(): {
        configured: boolean;
        selectedImplementation: string;
        availableImplementations: number;
        processingMode: "stream-conversion" | "batch-processing" | "generic";
        inputFormat: "stream" | "non-stream" | "batch";
        outputFormat: "stream" | "non-stream" | "batch";
    };
}
//# sourceMappingURL=WorkflowFramework.d.ts.map