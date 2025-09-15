import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../modules/BasePipelineModule';
import { NodeImplementationInfo } from '../../core/NodeImplementationInfo';
/**
 * Provider Framework Configuration
 */
export interface ProviderFrameworkConfig {
    /** Provider type (openai, gemini, qwen, etc.) */
    providerType: string;
    /** API endpoint */
    endpoint: string;
    /** Authentication type */
    authType: 'api_key' | 'oauth2' | 'jwt' | 'custom' | 'qwen';
    /** Model name (optional) */
    model?: string;
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
 * Provider Framework - Manages provider implementations for different AI services
 */
export declare class ProviderFramework extends BasePipelineModule {
    protected config: ProviderFrameworkConfig;
    private registry;
    private selectedImplementation;
    private implementationInstance;
    constructor(info: ModuleInfo);
    /**
     * Configure the Provider Framework
     * @param config - Framework configuration
     */
    configure(config: ProviderFrameworkConfig): Promise<void>;
    /**
     * Process request through selected implementation
     * @param request - Input request data
     * @returns Promise<any> - Provider response
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
        providerType: string;
        authType: "custom" | "jwt" | "api_key" | "oauth2" | "qwen";
        endpoint: string;
    };
}
//# sourceMappingURL=ProviderFramework.d.ts.map