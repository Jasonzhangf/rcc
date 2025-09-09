import { v4 as uuidv4 } from 'uuid';
import type { 
  IPoolManager,
  IPoolEntry,
  IPoolOptions
} from '../interfaces/IPoolManager';
import type { IConfigManager } from '../../shared/types';
import { POOL_MANAGER_CONSTANTS } from '../constants/PoolManager.constants';

export class PoolManager implements IPoolManager {
  private initialized = false;

  constructor(
    private configManager: IConfigManager,
    private options: IPoolOptions = {}
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    console.log(`🔧 [${POOL_MANAGER_CONSTANTS.MODULE_NAME}] Initializing...`);
    this.initialized = true;
    console.log(`✅ [${POOL_MANAGER_CONSTANTS.MODULE_NAME}] Initialized successfully`);
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    console.log(`✅ [${POOL_MANAGER_CONSTANTS.MODULE_NAME}] Destroyed successfully`);
  }

  async getAll(): Promise<IPoolEntry[]> {
    const config = await this.configManager.getConfig();
    return config?.provider_pool || [];
  }

  async add(entryData: Omit<IPoolEntry, 'id'>): Promise<IPoolEntry> {
    const entry: IPoolEntry = {
      ...entryData,
      id: uuidv4()
    };

    const config = await this.configManager.getConfig();
    if (!config) throw new Error('Configuration not found');

    config.provider_pool = config.provider_pool || [];
    config.provider_pool.push(entry);
    
    await this.configManager.saveConfig(config);
    return entry;
  }

  async remove(id: string): Promise<boolean> {
    const config = await this.configManager.getConfig();
    if (!config) return false;

    const entryIndex = config.provider_pool?.findIndex(e => e.id === id) ?? -1;
    if (entryIndex === -1) return false;

    config.provider_pool!.splice(entryIndex, 1);
    await this.configManager.saveConfig(config);
    return true;
  }

  async isInPool(providerId: string, modelId: string): Promise<boolean> {
    const entries = await this.getAll();
    return entries.some(e => e.providerId === providerId && e.modelId === modelId);
  }
}