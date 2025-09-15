import { NodeImplementationInfo } from './NodeImplementationInfo';
import { SelectionCriteria } from './SelectionCriteria';
/**
 * Node Implementation Registry
 * Manages registration and selection of pipeline node implementations
 */
export declare class NodeImplementationRegistry {
    private static instance;
    private implementations;
    /**
     * Get singleton instance
     */
    static getInstance(): NodeImplementationRegistry;
    /**
     * Register a node implementation
     * @param nodeType - Type of node this implementation supports
     * @param implementation - Implementation information
     */
    register(nodeType: string, implementation: NodeImplementationInfo): void;
    /**
     * Unregister a node implementation
     * @param nodeType - Type of node
     * @param implementationId - Implementation identifier
     */
    unregister(nodeType: string, implementationId: string): boolean;
    /**
     * Get all implementations for a node type
     * @param nodeType - Node type
     * @returns Array of implementation information
     */
    getImplementations(nodeType: string): NodeImplementationInfo[];
    /**
     * Get specific implementation by ID
     * @param nodeType - Node type
     * @param implementationId - Implementation identifier
     * @returns Implementation information or undefined
     */
    getImplementation(nodeType: string, implementationId: string): NodeImplementationInfo | undefined;
    /**
     * Select the best implementation based on criteria
     * @param nodeType - Node type
     * @param criteria - Selection criteria
     * @returns Best matching implementation or undefined
     */
    selectImplementation(nodeType: string, criteria: SelectionCriteria): NodeImplementationInfo | undefined;
    /**
     * Check if implementation matches criteria
     * @param impl - Implementation to check
     * @param criteria - Selection criteria
     * @returns True if matches
     */
    private matchesCriteria;
    /**
     * Compare implementations by priority
     * @param a - First implementation
     * @param b - Second implementation
     * @param criteria - Selection criteria
     * @returns Comparison result
     */
    private compareByPriority;
    /**
     * Get all registered node types
     * @returns Array of node types
     */
    getRegisteredNodeTypes(): string[];
    /**
     * Get registry statistics
     * @returns Registry statistics
     */
    getStatistics(): {
        totalImplementations: number;
        implementationsByType: Record<string, number>;
        nodeTypes: string[];
    };
    /**
     * Clear all registrations (mainly for testing)
     */
    clear(): void;
    /**
     * Export registry state (for debugging)
     * @returns Registry state
     */
    exportState(): Record<string, NodeImplementationInfo[]>;
}
//# sourceMappingURL=NodeImplementationRegistry.d.ts.map