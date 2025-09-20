import { ModuleInfo } from '../interfaces/ModuleInfo';
import { ConnectionInfo, DataTransfer } from '../interfaces/Connection';
import { MessageCenter } from '../MessageCenter';
import { v4 as uuidv4 } from 'uuid';

/**
 * Core module functionality - handles basic module lifecycle and registration
 */
export class BaseModuleCore {
  protected info: ModuleInfo;
  protected initialized: boolean = false;
  protected configured: boolean = false;
  protected config: Record<string, any> = {};
  protected messageCenter: MessageCenter;

  constructor(info: ModuleInfo) {
    this.info = info;
    this.messageCenter = MessageCenter.getInstance();
  }

  /**
   * Static factory method to create an instance of the module
   */
  static createInstance<T extends BaseModuleCore>(this: new (info: ModuleInfo) => T, info: ModuleInfo): T {
    return new this(info);
  }

  /**
   * Configures the module with initialization data
   */
  public configure(config: Record<string, any>): void {
    if (this.initialized) {
      throw new Error('Cannot configure module after initialization');
    }

    this.config = { ...config };
    this.configured = true;
  }

  /**
   * Initializes the module
   */
  public async initialize(): Promise<void> {
    if (!this.configured) {
      console.warn(`Module ${this.info.id} is being initialized without configuration`);
    }

    // Register with message center
    this.messageCenter.registerModule(this.info.id, this);

    // Base initialization logic
    this.initialized = true;
  }

  /**
   * Gets the module information
   */
  public getInfo(): ModuleInfo {
    return { ...this.info };
  }

  /**
   * Gets the module configuration
   */
  public getConfig(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Handle module lifecycle events
   */
  public onModuleRegistered(moduleId: string): void {
    // Base implementation - can be overridden
  }

  /**
   * Handle module lifecycle events
   */
  public onModuleUnregistered(moduleId: string): void {
    // Base implementation - can be overridden
  }

  /**
   * Basic cleanup
   */
  public async destroy(): Promise<void> {
    this.initialized = false;
    this.configured = false;
    this.config = {};

    // Unregister from message center
    this.messageCenter.unregisterModule(this.info.id);
  }
}