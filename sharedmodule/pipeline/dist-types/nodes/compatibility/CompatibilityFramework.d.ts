import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../modules/BasePipelineModule';
import { NodeImplementationInfo } from '../../core/NodeImplementationInfo';
/**
 * Compatibility Framework Configuration
 */
export interface CompatibilityFrameworkConfig {
    /** Mapping strategy */
    mappingStrategy: 'field-mapping' | 'schema-transformation' | 'generic';
    /** Source format/type */
    sourceFormat: string;
    /** Target format/type */
    targetFormat: string;
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
 * Compatibility Framework - Manages compatibility and schema transformation implementations
 */
export declare class CompatibilityFramework extends BasePipelineModule {
    protected config: CompatibilityFrameworkConfig;
    private registry;
    private selectedImplementation;
    private implementationInstance;
    constructor(info: ModuleInfo);
    /**
     * Configure the Compatibility Framework
     * @param config - Framework configuration
     */
    configure(config: CompatibilityFrameworkConfig): Promise<void>;
    /**
     * Process request through selected implementation
     * @param request - Input request data
     * @returns Promise<any> - Compatibility-processed request data
     */
    process(request: any): Promise<any>;
    /**
     * Process response through selected implementation
     * @param response - Input response data
     * @returns Promise<any> - Compatibility-processed response data
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
        mappingStrategy: "field-mapping" | "generic" | "schema-transformation";
        sourceFormat: string;
        targetFormat: string;
    };
}
//# sourceMappingURL=CompatibilityFramework.d.ts.map