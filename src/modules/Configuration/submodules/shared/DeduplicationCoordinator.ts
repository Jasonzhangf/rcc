/**
 * Deduplication Coordinator
 * Shared service that coordinates deduplication between BlacklistManager and PoolManager
 */

import { IDeduplicationCoordinator, IDeduplicationEvent } from '../BlacklistManager/interfaces/IBlacklistManager';
import { IConfigManager, IConfigData } from '../ConfigManager/interfaces/IConfigManager';

export class DeduplicationCoordinator implements IDeduplicationCoordinator {
  private configManager: IConfigManager;
  private configData: IConfigData | null = null;
  private eventHandlers: Array<(event: IDeduplicationEvent) => void> = [];

  constructor(configManager: IConfigManager) {
    this.configManager = configManager;
  }

  async initialize(): Promise<void> {
    this.configData = await this.configManager.loadConfig();
    
    // Initialize arrays if they don't exist
    if (!this.configData.model_blacklist) {
      this.configData.model_blacklist = [];
    }
    if (!this.configData.provider_pool) {
      this.configData.provider_pool = [];
    }
    
    console.log('✅ DeduplicationCoordinator initialized');
  }

  async updateConfig(configData: IConfigData): Promise<void> {
    this.configData = configData;
  }

  /**
   * Remove model from pool when adding to blacklist
   */
  async removeFromPool(modelId: string): Promise<void> {
    if (!this.configData?.provider_pool) {
      return;
    }

    const poolIndex = this.configData.provider_pool.findIndex(p => p.id === modelId);
    if (poolIndex !== -1) {
      const removedEntry = this.configData.provider_pool.splice(poolIndex, 1)[0];
      
      // Emit deduplication event
      this.emitEvent({
        type: 'remove_from_pool',
        modelId,
        providerId: removedEntry.providerId,
        timestamp: Date.now(),
        source: 'BlacklistManager'
      });
      
      console.log(`🔄 DeduplicationCoordinator: Removed ${modelId} from pool`);
      
      // Save configuration
      await this.configManager.saveConfig(this.configData);
    }
  }

  /**
   * Remove model from blacklist when adding to pool
   */
  async removeFromBlacklist(modelId: string): Promise<void> {
    if (!this.configData?.model_blacklist) {
      return;
    }

    const blacklistIndex = this.configData.model_blacklist.findIndex(b => b.id === modelId);
    if (blacklistIndex !== -1) {
      const removedEntry = this.configData.model_blacklist.splice(blacklistIndex, 1)[0];
      
      // Update original model status in provider
      const provider = this.configData.providers.find(p => p.id === removedEntry.providerId);
      if (provider) {
        const model = provider.models.find(m => m.id === removedEntry.modelId);
        if (model) {
          model.blacklisted = false;
          model.blacklist_reason = null;
          model.status = 'active';
          model.updated_at = new Date().toISOString();
        }
      }
      
      // Emit deduplication event
      this.emitEvent({
        type: 'remove_from_blacklist',
        modelId,
        providerId: removedEntry.providerId,
        timestamp: Date.now(),
        source: 'PoolManager'
      });
      
      console.log(`🔄 DeduplicationCoordinator: Removed ${modelId} from blacklist`);
      
      // Save configuration
      await this.configManager.saveConfig(this.configData);
    }
  }

  /**
   * Check for duplicate entries across blacklist and pool
   */
  async checkDuplicates(modelId: string): Promise<{ inBlacklist: boolean; inPool: boolean }> {
    const inBlacklist = this.configData?.model_blacklist?.some(entry => entry.id === modelId) || false;
    const inPool = this.configData?.provider_pool?.some(entry => entry.id === modelId) || false;
    
    return { inBlacklist, inPool };
  }

  /**
   * Ensure no duplicates exist between blacklist and pool
   */
  async ensureNoDuplicates(modelId: string, operation: 'add_to_blacklist' | 'add_to_pool'): Promise<void> {
    const duplicateStatus = await this.checkDuplicates(modelId);
    
    if (operation === 'add_to_blacklist' && duplicateStatus.inPool) {
      await this.removeFromPool(modelId);
    } else if (operation === 'add_to_pool' && duplicateStatus.inBlacklist) {
      await this.removeFromBlacklist(modelId);
    }
    
    // Log deduplication action
    if ((operation === 'add_to_blacklist' && duplicateStatus.inPool) || 
        (operation === 'add_to_pool' && duplicateStatus.inBlacklist)) {
      console.log(`🔄 DeduplicationCoordinator: Ensured no duplicates for ${modelId} during ${operation}`);
    }
  }

  /**
   * Register event handler for deduplication events
   */
  onDeduplicationEvent(handler: (event: IDeduplicationEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event handler
   */
  removeEventHandler(handler: (event: IDeduplicationEvent) => void): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index !== -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Get deduplication statistics
   */
  getDeduplicationStats(): {
    totalBlacklisted: number;
    totalInPool: number;
    duplicatesFound: number;
    lastCheckTime: string;
  } {
    const blacklistCount = this.configData?.model_blacklist?.length || 0;
    const poolCount = this.configData?.provider_pool?.length || 0;
    
    // Check for any remaining duplicates (shouldn't happen with proper coordination)
    let duplicatesFound = 0;
    if (this.configData?.model_blacklist && this.configData?.provider_pool) {
      const blacklistIds = new Set(this.configData.model_blacklist.map(entry => entry.id));
      const poolIds = new Set(this.configData.provider_pool.map(entry => entry.id));
      
      for (const id of blacklistIds) {
        if (poolIds.has(id)) {
          duplicatesFound++;
        }
      }
    }
    
    return {
      totalBlacklisted: blacklistCount,
      totalInPool: poolCount,
      duplicatesFound,
      lastCheckTime: new Date().toISOString()
    };
  }

  /**
   * Perform comprehensive deduplication audit and cleanup
   */
  async performDeduplicationAudit(): Promise<{
    duplicatesFound: number;
    duplicatesResolved: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let duplicatesFound = 0;
    let duplicatesResolved = 0;

    try {
      if (!this.configData?.model_blacklist || !this.configData?.provider_pool) {
        return { duplicatesFound: 0, duplicatesResolved: 0, errors: [] };
      }

      const blacklistIds = new Set<string>();
      const duplicateIds: string[] = [];

      // Collect blacklist IDs
      this.configData.model_blacklist.forEach(entry => {
        blacklistIds.add(entry.id);
      });

      // Find duplicates in pool
      this.configData.provider_pool.forEach(entry => {
        if (blacklistIds.has(entry.id)) {
          duplicateIds.push(entry.id);
          duplicatesFound++;
        }
      });

      // Resolve duplicates by removing from pool (blacklist takes precedence)
      for (const duplicateId of duplicateIds) {
        try {
          await this.removeFromPool(duplicateId);
          duplicatesResolved++;
          console.log(`🔧 DeduplicationAudit: Resolved duplicate ${duplicateId} by removing from pool`);
        } catch (error) {
          errors.push(`Failed to resolve duplicate ${duplicateId}: ${error.message}`);
        }
      }

      return { duplicatesFound, duplicatesResolved, errors };
    } catch (error) {
      errors.push(`Deduplication audit failed: ${error.message}`);
      return { duplicatesFound, duplicatesResolved, errors };
    }
  }

  private emitEvent(event: IDeduplicationEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in deduplication event handler: ${error.message}`);
      }
    });
  }
}