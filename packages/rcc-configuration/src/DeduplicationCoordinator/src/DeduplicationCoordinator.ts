import type { 
  IDeduplicationCoordinator,
  IDeduplicationResult,
  IDeduplicationOptions
} from '../interfaces/IDeduplicationCoordinator';
import type { IBlacklistManager, IPoolManager, IDeduplicationAction } from '../../shared/types';
import { DEDUPLICATION_COORDINATOR_CONSTANTS } from '../constants/DeduplicationCoordinator.constants';

export class DeduplicationCoordinator implements IDeduplicationCoordinator {
  private initialized = false;
  private intervalId?: NodeJS.Timeout;

  constructor(
    private blacklistManager: IBlacklistManager,
    private poolManager: IPoolManager,
    private options: IDeduplicationOptions = {}
  ) {
    this.options = {
      enableAutoDeduplication: DEDUPLICATION_COORDINATOR_CONSTANTS.DEFAULT_CONFIG.ENABLE_AUTO_DEDUPLICATION,
      conflictResolutionStrategy: DEDUPLICATION_COORDINATOR_CONSTANTS.DEFAULT_CONFIG.CONFLICT_RESOLUTION_STRATEGY,
      checkInterval: DEDUPLICATION_COORDINATOR_CONSTANTS.DEFAULT_CONFIG.CHECK_INTERVAL,
      ...options
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    console.log(`🔧 [${DEDUPLICATION_COORDINATOR_CONSTANTS.MODULE_NAME}] Initializing...`);
    
    if (this.options.enableAutoDeduplication) {
      this.scheduleDeduplication(this.options.checkInterval || DEDUPLICATION_COORDINATOR_CONSTANTS.DEFAULT_CONFIG.CHECK_INTERVAL);
    }
    
    this.initialized = true;
    console.log(`✅ [${DEDUPLICATION_COORDINATOR_CONSTANTS.MODULE_NAME}] Initialized successfully`);
  }

  async destroy(): Promise<void> {
    this.stopScheduledDeduplication();
    this.initialized = false;
    console.log(`✅ [${DEDUPLICATION_COORDINATOR_CONSTANTS.MODULE_NAME}] Destroyed successfully`);
  }

  async performDeduplication(): Promise<IDeduplicationResult> {
    console.log(`🔄 [${DEDUPLICATION_COORDINATOR_CONSTANTS.MODULE_NAME}] Starting deduplication process...`);
    
    try {
      const blacklistEntries = await this.blacklistManager.getAll();
      const poolEntries = await this.poolManager.getAll();
      
      const conflicts = [];
      const actions: IDeduplicationAction[] = [];
      
      // Find conflicts between blacklist and pool
      for (const blacklistEntry of blacklistEntries) {
        for (const poolEntry of poolEntries) {
          if (blacklistEntry.providerId === poolEntry.providerId && 
              blacklistEntry.modelId === poolEntry.modelId) {
            conflicts.push({ blacklistEntry, poolEntry });
          }
        }
      }
      
      // Resolve conflicts based on strategy
      for (const conflict of conflicts) {
        if (this.options.conflictResolutionStrategy === 'prefer_blacklist') {
          // Remove from pool
          await this.poolManager.remove(conflict.poolEntry.id);
          actions.push({
            action: 'remove_from_pool',
            target: 'pool',
            item_id: conflict.poolEntry.id,
            reason: 'Conflict with blacklist - prefer blacklist',
            performed_at: new Date().toISOString()
          });
        } else if (this.options.conflictResolutionStrategy === 'prefer_pool') {
          // Remove from blacklist
          await this.blacklistManager.remove(conflict.blacklistEntry.id);
          actions.push({
            action: 'remove_from_blacklist',
            target: 'blacklist',
            item_id: conflict.blacklistEntry.id,
            reason: 'Conflict with pool - prefer pool',
            performed_at: new Date().toISOString()
          });
        }
      }
      
      const result: IDeduplicationResult = {
        success: true,
        conflicts_found: conflicts.length,
        conflicts_resolved: actions.length,
        actions_taken: actions,
        processed_at: new Date().toISOString()
      };
      
      console.log(`✅ [${DEDUPLICATION_COORDINATOR_CONSTANTS.MODULE_NAME}] Deduplication completed: ${result.conflicts_resolved}/${result.conflicts_found} conflicts resolved`);
      return result;
      
    } catch (error) {
      console.error(`❌ [${DEDUPLICATION_COORDINATOR_CONSTANTS.MODULE_NAME}] Deduplication failed:`, error);
      return {
        success: false,
        conflicts_found: 0,
        conflicts_resolved: 0,
        actions_taken: [],
        processed_at: new Date().toISOString()
      };
    }
  }

  scheduleDeduplication(intervalMs: number): void {
    this.stopScheduledDeduplication();
    this.intervalId = setInterval(() => {
      this.performDeduplication().catch(error => {
        console.error(`❌ [${DEDUPLICATION_COORDINATOR_CONSTANTS.MODULE_NAME}] Scheduled deduplication failed:`, error);
      });
    }, intervalMs);
    
    console.log(`📅 [${DEDUPLICATION_COORDINATOR_CONSTANTS.MODULE_NAME}] Scheduled deduplication every ${intervalMs}ms`);
  }

  stopScheduledDeduplication(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log(`⏹️ [${DEDUPLICATION_COORDINATOR_CONSTANTS.MODULE_NAME}] Stopped scheduled deduplication`);
    }
  }
}