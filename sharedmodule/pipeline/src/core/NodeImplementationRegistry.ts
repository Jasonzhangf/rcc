import { NodeImplementationInfo } from './NodeImplementationInfo';
import { SelectionCriteria } from './SelectionCriteria';
import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../modules/BasePipelineModule';

/**
 * Node Implementation Registry
 * Manages registration and selection of pipeline node implementations
 */
export class NodeImplementationRegistry {
  private static instance: NodeImplementationRegistry;
  private implementations: Map<string, Map<string, NodeImplementationInfo>> = new Map();
  
  /**
   * Get singleton instance
   */
  static getInstance(): NodeImplementationRegistry {
    if (!NodeImplementationRegistry.instance) {
      NodeImplementationRegistry.instance = new NodeImplementationRegistry();
    }
    return NodeImplementationRegistry.instance;
  }
  
  /**
   * Register a node implementation
   * @param nodeType - Type of node this implementation supports
   * @param implementation - Implementation information
   */
  register(nodeType: string, implementation: NodeImplementationInfo): void {
    if (!this.implementations.has(nodeType)) {
      this.implementations.set(nodeType, new Map());
    }
    
    const nodeMap = this.implementations.get(nodeType)!;
    nodeMap.set(implementation.id, implementation);
    
    console.log(`Registered ${nodeType} implementation: ${implementation.id} (${implementation.name})`);
  }
  
  /**
   * Unregister a node implementation
   * @param nodeType - Type of node
   * @param implementationId - Implementation identifier
   */
  unregister(nodeType: string, implementationId: string): boolean {
    const nodeMap = this.implementations.get(nodeType);
    if (!nodeMap) {
      return false;
    }
    
    const removed = nodeMap.delete(implementationId);
    if (removed) {
      console.log(`Unregistered ${nodeType} implementation: ${implementationId}`);
    }
    
    return removed;
  }
  
  /**
   * Get all implementations for a node type
   * @param nodeType - Node type
   * @returns Array of implementation information
   */
  getImplementations(nodeType: string): NodeImplementationInfo[] {
    return Array.from(this.implementations.get(nodeType)?.values() || []);
  }
  
  /**
   * Get specific implementation by ID
   * @param nodeType - Node type
   * @param implementationId - Implementation identifier
   * @returns Implementation information or undefined
   */
  getImplementation(nodeType: string, implementationId: string): NodeImplementationInfo | undefined {
    return this.implementations.get(nodeType)?.get(implementationId);
  }
  
  /**
   * Select the best implementation based on criteria
   * @param nodeType - Node type
   * @param criteria - Selection criteria
   * @returns Best matching implementation or undefined
   */
  selectImplementation(nodeType: string, criteria: SelectionCriteria): NodeImplementationInfo | undefined {
    const availableImpls = this.getImplementations(nodeType);
    
    if (availableImpls.length === 0) {
      console.warn(`No implementations available for node type: ${nodeType}`);
      return undefined;
    }
    
    // Filter by criteria
    const filtered = availableImpls.filter(impl => this.matchesCriteria(impl, criteria));
    
    if (filtered.length === 0) {
      console.warn(`No implementations match criteria for node type: ${nodeType}`, criteria);
      return undefined;
    }
    
    // Sort by priority and preferences
    const sorted = filtered.sort((a, b) => this.compareByPriority(a, b, criteria));
    
    // Return the best match
    const selected = sorted[0];
    console.log(`Selected implementation for ${nodeType}: ${selected.id} (${selected.name})`);
    return selected;
  }
  
  /**
   * Check if implementation matches criteria
   * @param impl - Implementation to check
   * @param criteria - Selection criteria
   * @returns True if matches
   */
  private matchesCriteria(impl: NodeImplementationInfo, criteria: SelectionCriteria): boolean {
    // Check node type
    if (impl.nodeType !== criteria.nodeType) {
      return false;
    }
    
    // Check preferred implementation ID
    if (criteria.preferences?.implementationId && impl.id !== criteria.preferences.implementationId) {
      return false;
    }
    
    // Check input protocol
    if (criteria.inputProtocol && !impl.supportedProtocols.includes(criteria.inputProtocol)) {
      return false;
    }
    
    // Check output format
    if (criteria.outputFormat && !impl.supportedFormats.includes(criteria.outputFormat)) {
      return false;
    }
    
    // Check tags preference
    if (criteria.preferences?.tags && criteria.preferences.tags.length > 0) {
      const hasAllTags = criteria.preferences.tags.every(tag => 
        impl.tags?.includes(tag)
      );
      if (!hasAllTags) {
        return false;
      }
    }
    
    // Check custom matching function
    if (impl.matches && criteria.context) {
      if (!impl.matches(criteria.context.input || {}, criteria.context)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Compare implementations by priority
   * @param a - First implementation
   * @param b - Second implementation
   * @param criteria - Selection criteria
   * @returns Comparison result
   */
  private compareByPriority(
    a: NodeImplementationInfo, 
    b: NodeImplementationInfo, 
    criteria: SelectionCriteria
  ): number {
    // Preferred implementation gets highest priority
    if (criteria.preferences?.implementationId) {
      if (a.id === criteria.preferences.implementationId) return -1;
      if (b.id === criteria.preferences.implementationId) return 1;
    }
    
    // Compare by explicit priority
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Higher priority first
    }
    
    // Compare by weight
    if (a.weight !== b.weight) {
      return b.weight - a.weight; // Higher weight first
    }
    
    // Compare by specificity (more protocols/formats = higher priority)
    const aSpecificity = a.supportedProtocols.length + a.supportedFormats.length;
    const bSpecificity = b.supportedProtocols.length + b.supportedFormats.length;
    if (aSpecificity !== bSpecificity) {
      return bSpecificity - aSpecificity;
    }
    
    // Finally, sort by ID for consistency
    return a.id.localeCompare(b.id);
  }
  
  /**
   * Get all registered node types
   * @returns Array of node types
   */
  getRegisteredNodeTypes(): string[] {
    return Array.from(this.implementations.keys());
  }
  
  /**
   * Get registry statistics
   * @returns Registry statistics
   */
  getStatistics(): {
    totalImplementations: number;
    implementationsByType: Record<string, number>;
    nodeTypes: string[];
  } {
    const implementationsByType: Record<string, number> = {};
    let totalImplementations = 0;
    
    for (const [nodeType, impls] of this.implementations.entries()) {
      const count = impls.size;
      implementationsByType[nodeType] = count;
      totalImplementations += count;
    }
    
    return {
      totalImplementations,
      implementationsByType,
      nodeTypes: this.getRegisteredNodeTypes()
    };
  }
  
  /**
   * Clear all registrations (mainly for testing)
   */
  clear(): void {
    this.implementations.clear();
    console.log('Node implementation registry cleared');
  }
  
  /**
   * Export registry state (for debugging)
   * @returns Registry state
   */
  exportState(): Record<string, NodeImplementationInfo[]> {
    const state: Record<string, NodeImplementationInfo[]> = {};
    
    for (const [nodeType, impls] of this.implementations.entries()) {
      state[nodeType] = Array.from(impls.values());
    }
    
    return state;
  }
}