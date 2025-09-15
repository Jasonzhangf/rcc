/**
 * Node Implementation Information
 * Contains metadata about pipeline node implementations
 */
export interface NodeImplementationInfo {
    /** Unique identifier for this implementation */
    id: string;
    /** Human-readable name */
    name: string;
    /** Version of the implementation */
    version: string;
    /** Description of what this implementation does */
    description: string;
    /** Node type this implementation supports */
    nodeType: 'llmswitch' | 'workflow' | 'compatibility' | 'provider';
    /** List of supported input protocols */
    supportedProtocols: string[];
    /** List of supported output formats */
    supportedFormats: string[];
    /** Priority for selection (higher = more preferred) */
    priority: number;
    /** Weight for load balancing */
    weight: number;
    /** Module class constructor */
    moduleClass: new (info: ModuleInfo) => BasePipelineModule;
    /** Configuration schema for validation */
    configSchema?: any;
    /** Custom matching function */
    matches?: (input: any, context: any) => boolean;
    /** Tags for categorization */
    tags?: string[];
    /** Dependencies */
    dependencies?: string[];
    /** Author information */
    author?: string;
    /** License information */
    license?: string;
}
//# sourceMappingURL=NodeImplementationInfo.d.ts.map