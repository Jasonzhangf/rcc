/**
 * Submodule Integration
 * Utility for integrating BlacklistManager and PoolManager with the Configuration system
 */

import { BlacklistManager } from '../BlacklistManager/src/BlacklistManager';
import { PoolManager } from '../PoolManager/src/PoolManager';
import { DeduplicationCoordinator } from './DeduplicationCoordinator';
import { IConfigManager } from '../ConfigManager/interfaces/IConfigManager';
import { IApiRouter } from '../../../ApiRouter/interfaces/IApiRouter';

export interface ISubmoduleIntegrationConfig {
  configManager: IConfigManager;
  apiRouter?: IApiRouter;
  enableDeduplication?: boolean;
  enableApiRouting?: boolean;
}

export class SubmoduleIntegration {
  private blacklistManager: BlacklistManager;
  private poolManager: PoolManager;
  private deduplicationCoordinator: DeduplicationCoordinator;
  private configManager: IConfigManager;
  private apiRouter?: IApiRouter;

  constructor(config: ISubmoduleIntegrationConfig) {
    this.configManager = config.configManager;
    this.apiRouter = config.apiRouter;
    
    // Initialize submodules
    this.blacklistManager = new BlacklistManager();
    this.poolManager = new PoolManager();
    
    // Initialize deduplication coordinator if enabled
    if (config.enableDeduplication !== false) {
      this.deduplicationCoordinator = new DeduplicationCoordinator(this.configManager);
      this.blacklistManager.setDeduplicationCoordinator(this.deduplicationCoordinator);
      this.poolManager.setDeduplicationCoordinator(this.deduplicationCoordinator);
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing submodule integration...');

      // Initialize deduplication coordinator
      if (this.deduplicationCoordinator) {
        await this.deduplicationCoordinator.initialize();
        console.log('✅ DeduplicationCoordinator initialized');
      }

      // Initialize BlacklistManager
      await this.blacklistManager.initialize({ 
        configManager: this.configManager 
      });
      console.log('✅ BlacklistManager initialized');

      // Initialize PoolManager
      await this.poolManager.initialize({ 
        configManager: this.configManager 
      });
      console.log('✅ PoolManager initialized');

      // Register API routes if router provided
      if (this.apiRouter) {
        this.registerApiRoutes();
        console.log('✅ API routes registered');
      }

      // Set up cross-module communication
      this.setupCrossModuleCommunication();
      console.log('✅ Cross-module communication established');

      console.log('🎉 Submodule integration completed successfully');
    } catch (error) {
      console.error('❌ Failed to initialize submodule integration:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      console.log('🧹 Destroying submodule integration...');

      await this.blacklistManager.destroy();
      await this.poolManager.destroy();

      if (this.deduplicationCoordinator) {
        // DeduplicationCoordinator doesn't have destroy method, just clear references
        this.deduplicationCoordinator = null;
      }

      console.log('✅ Submodule integration destroyed');
    } catch (error) {
      console.error('❌ Error during submodule integration destruction:', error);
      throw error;
    }
  }

  // Public access to submodules
  getBlacklistManager(): BlacklistManager {
    return this.blacklistManager;
  }

  getPoolManager(): PoolManager {
    return this.poolManager;
  }

  getDeduplicationCoordinator(): DeduplicationCoordinator | undefined {
    return this.deduplicationCoordinator;
  }

  // Utility methods for common operations
  async blacklistModel(providerId: string, modelId: string, reason?: string): Promise<any> {
    return await this.blacklistManager.blacklistModel(providerId, modelId, reason);
  }

  async addModelToPool(providerId: string, modelId: string): Promise<any> {
    return await this.poolManager.addToProviderPool(providerId, modelId);
  }

  async removeFromBlacklist(modelId: string): Promise<any> {
    return await this.blacklistManager.removeFromBlacklist(modelId);
  }

  async removeFromPool(modelId: string): Promise<any> {
    return await this.poolManager.removeFromPool(modelId);
  }

  // Utility methods for queries
  isModelBlacklisted(modelId: string): boolean {
    return this.blacklistManager.isModelBlacklisted(modelId);
  }

  isModelInPool(modelId: string): boolean {
    return this.poolManager.isModelInPool(modelId);
  }

  getPoolSize(): number {
    return this.poolManager.getPoolSize();
  }

  // Get comprehensive status
  async getModelStatus(modelId: string): Promise<{
    exists: boolean;
    inBlacklist: boolean;
    inPool: boolean;
    blacklistReason?: string;
    poolStatus?: string;
  }> {
    const inBlacklist = this.isModelBlacklisted(modelId);
    const inPool = this.isModelInPool(modelId);
    
    const blacklistEntry = this.blacklistManager.getBlacklistEntry(modelId);
    const poolEntry = this.poolManager.getPoolEntry(modelId);

    return {
      exists: inBlacklist || inPool,
      inBlacklist,
      inPool,
      blacklistReason: blacklistEntry?.reason,
      poolStatus: poolEntry?.status
    };
  }

  // Deduplication utilities
  async performDeduplicationAudit(): Promise<any> {
    if (!this.deduplicationCoordinator) {
      throw new Error('Deduplication coordinator not initialized');
    }

    return await this.deduplicationCoordinator.performDeduplicationAudit();
  }

  getDeduplicationStats(): any {
    if (!this.deduplicationCoordinator) {
      throw new Error('Deduplication coordinator not initialized');
    }

    return this.deduplicationCoordinator.getDeduplicationStats();
  }

  // Pool health and statistics
  getPoolStats() {
    return this.poolManager.getPoolStats();
  }

  getPoolHealth() {
    return this.poolManager.getPoolHealth();
  }

  private registerApiRoutes(): void {
    if (!this.apiRouter) return;

    // Register BlacklistManager routes
    this.apiRouter.registerHandler('blacklist', this.blacklistManager);
    console.log('📍 Registered route: /api/blacklist -> BlacklistManager');

    // Register PoolManager routes
    this.apiRouter.registerHandler('pool', this.poolManager);
    console.log('📍 Registered route: /api/pool -> PoolManager');
  }

  private setupCrossModuleCommunication(): void {
    if (!this.deduplicationCoordinator) return;

    // Set up event handlers for cross-module communication
    this.deduplicationCoordinator.onDeduplicationEvent((event) => {
      console.log(`🔄 Deduplication event: ${event.type} for ${event.modelId} from ${event.source}`);
    });

    console.log('🔗 Cross-module communication established');
  }
}

/**
 * Factory function to create and initialize submodule integration
 */
export async function createSubmoduleIntegration(
  config: ISubmoduleIntegrationConfig
): Promise<SubmoduleIntegration> {
  const integration = new SubmoduleIntegration(config);
  await integration.initialize();
  return integration;
}

/**
 * Integration utility for existing Configuration modules
 * This can be used to integrate with existing Configuration systems
 */
export class ConfigurationSystemIntegration {
  static async integrateSubmodules(
    configManager: IConfigManager,
    apiRouter?: IApiRouter
  ): Promise<SubmoduleIntegration> {
    console.log('🎯 Starting Configuration system submodule integration...');

    const integration = await createSubmoduleIntegration({
      configManager,
      apiRouter,
      enableDeduplication: true,
      enableApiRouting: !!apiRouter
    });

    console.log('✅ Configuration system submodule integration complete');
    return integration;
  }

  static async performHealthCheck(
    integration: SubmoduleIntegration
  ): Promise<{
    blacklistManager: { initialized: boolean; error?: string };
    poolManager: { initialized: boolean; error?: string };
    deduplication: { healthy: boolean; stats?: any; error?: string };
    poolHealth: { healthy: boolean; issues: string[]; warnings: string[] };
  }> {
    const blacklistManager = { initialized: false };
    const poolManager = { initialized: false };
    const deduplication = { healthy: false };
    let poolHealth = { healthy: false, issues: [], warnings: [] };

    try {
      blacklistManager.initialized = integration.getBlacklistManager().isInitialized;
    } catch (error) {
      blacklistManager.error = (error instanceof Error ? error.message : String(error));
    }

    try {
      poolManager.initialized = integration.getPoolManager().isInitialized;
    } catch (error) {
      poolManager.error = (error instanceof Error ? error.message : String(error));
    }

    try {
      const stats = integration.getDeduplicationStats();
      deduplication.healthy = stats.duplicatesFound === 0;
      deduplication.stats = stats;
    } catch (error) {
      deduplication.error = (error instanceof Error ? error.message : String(error));
    }

    try {
      poolHealth = integration.getPoolHealth();
    } catch (error) {
      poolHealth = { 
        healthy: false, 
        issues: [`Pool health check failed: ${(error instanceof Error ? error.message : String(error))}`], 
        warnings: [] 
      };
    }

    return {
      blacklistManager,
      poolManager,
      deduplication,
      poolHealth
    };
  }
}