import { BaseModule } from '../core/BaseModule';
import { ModuleInfo } from '../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../interfaces/Connection';

/**
 * Router module for handling request routing between modules
 * This module acts as a central hub for directing requests to appropriate modules
 */
export class RouterModule extends BaseModule {
  /**
   * Route mappings
   */
  private routes: Map<string, string> = new Map(); // route pattern -> module ID
  
  /**
   * Creates an instance of RouterModule
   * @param info - Module information
   */
  constructor(info: ModuleInfo) {
    super(info);
  }
  
  /**
   * Static factory method to create an instance of RouterModule
   * @param info - Module information
   * @returns Instance of RouterModule
   */
  static createInstance(info: ModuleInfo): RouterModule {
    return new RouterModule(info);
  }
  
  /**
   * Initializes the module
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    console.log(`RouterModule ${this.info.id} initialized`);
  }
  
  /**
   * Adds a route mapping
   * @param pattern - Route pattern
   * @param moduleId - Target module ID
   */
  public addRoute(pattern: string, moduleId: string): void {
    this.routes.set(pattern, moduleId);
  }
  
  /**
   * Removes a route mapping
   * @param pattern - Route pattern
   */
  public removeRoute(pattern: string): void {
    this.routes.delete(pattern);
  }
  
  /**
   * Gets the target module ID for a route pattern
   * @param pattern - Route pattern
   * @returns Target module ID or undefined if not found
   */
  public getRouteTarget(pattern: string): string | undefined {
    return this.routes.get(pattern);
  }
  
  /**
   * Routes a request to the appropriate module
   * @param pattern - Route pattern
   * @param data - Request data
   */
  public async routeRequest(pattern: string, data: any): Promise<void> {
    const targetModuleId = this.routes.get(pattern);
    
    if (!targetModuleId) {
      throw new Error(`No route found for pattern: ${pattern}`);
    }
    
    // In a real implementation, you would get the module registry instance
    // and retrieve the target module from it
    // For now, we'll just log the routing action
    console.log(`Routing request for pattern '${pattern}' to module '${targetModuleId}' with data:`, data);
    
    // Create a data transfer object
    const dataTransfer: DataTransfer = {
      id: `route-${pattern}-${Date.now()}`,
      sourceConnectionId: this.info.id,
      targetConnectionId: targetModuleId,
      data,
      timestamp: Date.now()
    };
    
    // In a real implementation, you would send the data to the target module
    // For now, we'll just log the transfer
    console.log(`Transferring routed data to module ${targetModuleId}:`, data);
  }
  
  /**
   * Gets all route mappings
   * @returns Array of route mappings
   */
  public getRoutes(): { pattern: string; moduleId: string }[] {
    const routes: { pattern: string; moduleId: string }[] = [];
    for (const [pattern, moduleId] of this.routes.entries()) {
      routes.push({ pattern, moduleId });
    }
    return routes;
  }
  
  /**
   * Cleans up resources and connections
   */
  public async destroy(): Promise<void> {
    console.log(`RouterModule ${this.info.id} destroyed`);
    this.routes.clear();
    await super.destroy();
  }
}