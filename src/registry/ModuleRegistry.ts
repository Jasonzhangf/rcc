import { BaseModule } from '../core/BaseModule';
import { ModuleInfo } from '../interfaces/ModuleInfo';
import { MessageCenter } from '../core/MessageCenter';

/**
 * Interface for module constructors
 */
interface ModuleConstructor<T extends BaseModule> {
  new (info: ModuleInfo): T;
  createInstance(info: ModuleInfo): T;
}

/**
 * Module registry for managing module registration and routing
 */
export class ModuleRegistry {
  /**
   * Map of registered modules
   */
  private modules: Map<string, BaseModule> = new Map();
  
  /**
   * Map of module types to module classes
   */
  private moduleTypes: Map<string, ModuleConstructor<any>> = new Map();
  
  /**
   * Message center instance
   */
  private messageCenter: MessageCenter;
  
  /**
   * Singleton instance
   */
  private static instance: ModuleRegistry;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.messageCenter = MessageCenter.getInstance();
  }
  
  /**
   * Gets the singleton instance
   * @returns ModuleRegistry instance
   */
  public static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }
  
  /**
   * Registers a module type
   * @param type - Module type
   * @param moduleClass - Module class constructor
   */
  public registerModuleType<T extends BaseModule>(type: string, moduleClass: ModuleConstructor<T>): void {
    this.moduleTypes.set(type, moduleClass);
  }
  
  /**
   * Creates and registers a new module instance
   * @param info - Module information
   * @returns Created module instance
   */
  public async createModule<T extends BaseModule>(info: ModuleInfo): Promise<T> {
    const ModuleClass = this.moduleTypes.get(info.type);
    if (!ModuleClass) {
      throw new Error(`Module type '${info.type}' is not registered`);
    }
    
    const module = ModuleClass.createInstance(info);
    await module.initialize();
    
    this.modules.set(info.id, module);
    return module as T;
  }
  
  /**
   * Gets a registered module by ID
   * @param moduleId - Module ID
   * @returns Module instance or undefined if not found
   */
  public getModule(moduleId: string): BaseModule | undefined {
    return this.modules.get(moduleId);
  }
  
  /**
   * Gets all registered modules
   * @returns Array of all registered modules
   */
  public getAllModules(): BaseModule[] {
    return Array.from(this.modules.values());
  }
  
  /**
   * Gets modules by type
   * @param type - Module type
   * @returns Array of modules of the specified type
   */
  public getModulesByType(type: string): BaseModule[] {
    return Array.from(this.modules.values()).filter(module => module.getInfo().type === type);
  }
  
  /**
   * Removes a module from the registry
   * @param moduleId - Module ID
   */
  public async removeModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (module) {
      await module.destroy();
      this.modules.delete(moduleId);
    }
  }
  
  /**
   * Clears all registered modules
   */
  public async clear(): Promise<void> {
    for (const module of this.modules.values()) {
      await module.destroy();
    }
    this.modules.clear();
  }
}