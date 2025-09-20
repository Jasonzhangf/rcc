import { v4 as uuidv4 } from 'uuid';

/**
 * Manages module registration and lifecycle
 */
export class ModuleRegistry {
  private modules: Map<string, any> = new Map();
  private onModuleRegistered?: (moduleId: string) => void;
  private onModuleUnregistered?: (moduleId: string) => void;

  /**
   * Register a module with the registry
   * @param moduleId - Module ID
   * @param moduleInstance - Module instance
   */
  public register(moduleId: string, moduleInstance: any): void {
    if (this.modules.has(moduleId)) {
      throw new Error(`Module ${moduleId} is already registered`);
    }

    this.modules.set(moduleId, moduleInstance);

    // Notify about new registration
    if (this.onModuleRegistered) {
      setImmediate(() => this.onModuleRegistered!(moduleId));
    }
  }

  /**
   * Unregister a module from the registry
   * @param moduleId - Module ID
   */
  public unregister(moduleId: string): boolean {
    const wasRegistered = this.modules.delete(moduleId);

    if (wasRegistered && this.onModuleUnregistered) {
      setImmediate(() => this.onModuleUnregistered!(moduleId));
    }

    return wasRegistered;
  }

  /**
   * Get a module by ID
   * @param moduleId - Module ID
   * @returns Module instance or undefined
   */
  public get(moduleId: string): any | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Check if a module is registered
   * @param moduleId - Module ID
   * @returns True if module is registered
   */
  public has(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  /**
   * Get all registered modules
   * @returns Map of module IDs to instances
   */
  public getAll(): Map<string, any> {
    return new Map(this.modules);
  }

  /**
   * Get the number of registered modules
   * @returns Number of registered modules
   */
  public getCount(): number {
    return this.modules.size;
  }

  /**
   * Get all module IDs
   * @returns Array of module IDs
   */
  public getModuleIds(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Set callback for module registration
   * @param callback - Callback function
   */
  public onModuleRegister(callback: (moduleId: string) => void): void {
    this.onModuleRegistered = callback;
  }

  /**
   * Set callback for module unregistration
   * @param callback - Callback function
   */
  public onModuleUnregister(callback: (moduleId: string) => void): void {
    this.onModuleUnregistered = callback;
  }

  /**
   * Clear all registered modules
   */
  public clear(): void {
    this.modules.clear();
  }

  /**
   * Check if registry is empty
   * @returns True if no modules are registered
   */
  public isEmpty(): boolean {
    return this.modules.size === 0;
  }
}