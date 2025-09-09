import { v4 as uuidv4 } from 'uuid';
import type { 
  IBlacklistManager,
  IBlacklistEntry,
  IBlacklistOptions
} from '../interfaces/IBlacklistManager';
import type { IConfigManager } from '../../shared/types';
import { BLACKLIST_MANAGER_CONSTANTS } from '../constants/BlacklistManager.constants';

export class BlacklistManager implements IBlacklistManager {
  private initialized = false;

  constructor(
    private configManager: IConfigManager,
    private options: IBlacklistOptions = {}
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    console.log(`🔧 [${BLACKLIST_MANAGER_CONSTANTS.MODULE_NAME}] Initializing...`);
    this.initialized = true;
    console.log(`✅ [${BLACKLIST_MANAGER_CONSTANTS.MODULE_NAME}] Initialized successfully`);
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    console.log(`✅ [${BLACKLIST_MANAGER_CONSTANTS.MODULE_NAME}] Destroyed successfully`);
  }

  async getAll(): Promise<IBlacklistEntry[]> {
    const config = await this.configManager.getConfig();
    return config?.model_blacklist || [];
  }

  async add(entryData: Omit<IBlacklistEntry, 'id'>): Promise<IBlacklistEntry> {
    const entry: IBlacklistEntry = {
      ...entryData,
      id: uuidv4()
    };

    const config = await this.configManager.getConfig();
    if (!config) throw new Error('Configuration not found');

    config.model_blacklist = config.model_blacklist || [];
    config.model_blacklist.push(entry);
    
    await this.configManager.saveConfig(config);
    return entry;
  }

  async remove(id: string): Promise<boolean> {
    const config = await this.configManager.getConfig();
    if (!config) return false;

    const entryIndex = config.model_blacklist?.findIndex(e => e.id === id) ?? -1;
    if (entryIndex === -1) return false;

    config.model_blacklist!.splice(entryIndex, 1);
    await this.configManager.saveConfig(config);
    return true;
  }

  async isBlacklisted(providerId: string, modelId: string): Promise<boolean> {
    const entries = await this.getAll();
    return entries.some(e => e.providerId === providerId && e.modelId === modelId);
  }
}