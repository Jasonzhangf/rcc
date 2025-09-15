import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../modules/BasePipelineModule';
import { NodeImplementationInfo } from '../../core/NodeImplementationInfo';
/**
 * LLM Switch Framework Configuration
 */
export interface LLMSwitchFrameworkConfig {
    /** Input protocol type */
    inputProtocol: string;
    /** Output protocol type */
    outputProtocol: string;
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
 * LLM Switch Framework - Manages LLM protocol conversion implementations
 */
export declare class LLMSwitchFramework extends BasePipelineModule {
    protected config: LLMSwitchFrameworkConfig;
    private registry;
    private selectedImplementation;
    private implementationInstance;
    constructor(info: ModuleInfo);
    /**
     * Configure the LLM Switch Framework
     * @param config - Framework configuration
     */
    configure(config: LLMSwitchFrameworkConfig): Promise<void>;
    /**
     * Process request through selected implementation
     * @param request - Input request in source protocol format
     * @returns Promise<any> - Transformed request in target protocol format
     */
    process(request: any): Promise<any>;
    /**
     * Process response through selected implementation
     * @param response - Response in target protocol format
     * @returns Promise<any> - Transformed response in source protocol format
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
        inputProtocol: string;
        outputProtocol: string;
    };
}
//# sourceMappingURL=LLMSwitchFramework.d.ts.map