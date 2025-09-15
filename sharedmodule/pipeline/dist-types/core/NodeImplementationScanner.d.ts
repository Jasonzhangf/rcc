import { NodeImplementationInfo } from './NodeImplementationInfo';
/**
 * Node Implementation Scanner
 * Discovers and registers pipeline node implementations
 */
export declare class NodeImplementationScanner {
    private static readonly DEFAULT_PRIORITY;
    private static readonly DEFAULT_WEIGHT;
    /**
     * Scan and register all default implementations
     */
    static scanAndRegister(): Promise<void>;
    /**
     * Discover all available implementations
     * @returns Array of implementation information
     */
    private static discoverImplementations;
    /**
     * Validate implementation information
     * @param impl - Implementation to validate
     * @returns Validation result
     */
    static validateImplementation(impl: NodeImplementationInfo): {
        isValid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=NodeImplementationScanner.d.ts.map