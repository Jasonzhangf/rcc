/**
 * @rcc/configuration - Unified Configuration Management Package
 * 
 * This package provides a comprehensive set of configuration management modules
 * including providers, models, blacklist, and pool management with advanced
 * deduplication logic and multi-protocol support.
 * 
 * @version 1.0.0
 * @author RCC Development Team
 * @license MIT
 */

// Core Configuration Modules
export { ConfigManager } from './ConfigManager';
export { ProvidersManager } from './ProvidersManager';
export { ModelsManager } from './ModelsManager';
export { BlacklistManager } from './BlacklistManager';
export { PoolManager } from './PoolManager';

// Advanced Management Modules
export { RoutesManager } from './RoutesManager';
export { ConfigImportExportManager } from './ConfigImportExportManager';

// Coordination Components
export { DeduplicationCoordinator } from './DeduplicationCoordinator';

// Shared Types and Interfaces
export * from './shared/types';
export * from './shared/interfaces';

// Utilities
export * from './shared/utils';

// Constants
export * from './shared/constants';

// Re-export individual module interfaces for advanced use cases
export type {
  IConfigManager,
  IConfigurationData,
  IConfigManagerOptions,
} from './ConfigManager';

export type {
  IProvidersManager,
  IProvider,
  IProviderTestResult,
  IProviderOptions,
} from './ProvidersManager';

export type {
  IModelsManager,
  IModel,
  IModelVerificationResult,
  ITokenDetectionResult,
} from './ModelsManager';

export type {
  IBlacklistManager,
  IBlacklistEntry,
  IBlacklistOptions,
} from './BlacklistManager';

export type {
  IPoolManager,
  IPoolEntry,
  IPoolOptions,
} from './PoolManager';

export type {
  IDeduplicationCoordinator,
  IDeduplicationResult,
  IDeduplicationOptions,
} from './DeduplicationCoordinator';

export type {
  IConfigImportExportManager
} from './ConfigImportExportManager';

export type {
  IRoutesManager,
  IRoute,
  IRouteTarget,
  IVirtualModelCategory,
  ILoadBalancingStrategy,
  IRoutingOptions,
  IRouteSelectionResult,
  IRoutingMetrics,
} from './RoutesManager';

/**
 * Configuration Factory - Creates a complete configuration management system
 * 
 * @example
 * ```typescript
 * import { createConfigurationSystem } from '@rcc/configuration';
 * 
 * const config = await createConfigurationSystem({
 *   configPath: '/path/to/config.json',
 *   enableDeduplication: true,
 *   enableProviderTesting: true
 * });
 * 
 * // Use the configuration system
 * const providers = await config.providers.getAll();
 * await config.models.verifyModel('provider-id', 'model-id');
 * ```
 */
export interface IConfigurationSystemOptions {
  /** Path to configuration file */
  configPath?: string;
  /** Enable automatic deduplication between blacklist and pool */
  enableDeduplication?: boolean;
  /** Enable provider testing capabilities */
  enableProviderTesting?: boolean;
  /** Enable automatic model discovery */
  enableModelDiscovery?: boolean;
  /** Custom configuration for each manager */
  managerOptions?: {
    config?: IConfigManagerOptions;
    providers?: IProviderOptions;
    blacklist?: IBlacklistOptions;
    pool?: IPoolOptions;
  };
}

export interface IConfigurationSystem {
  /** Configuration file management */
  config: IConfigManager;
  /** Provider CRUD and testing */
  providers: IProvidersManager;
  /** Model verification and token detection */
  models: IModelsManager;
  /** Blacklist management with deduplication */
  blacklist: IBlacklistManager;
  /** Provider pool management with deduplication */
  pool: IPoolManager;
  /** Deduplication coordination */
  deduplication: IDeduplicationCoordinator;
  
  /** Initialize all managers */
  initialize(): Promise<void>;
  /** Cleanup all resources */
  destroy(): Promise<void>;
  /** Get system health status */
  getSystemHealth(): Promise<ISystemHealth>;
}

export interface ISystemHealth {
  overall: 'healthy' | 'warning' | 'error';
  components: {
    config: 'healthy' | 'error';
    providers: 'healthy' | 'error';
    models: 'healthy' | 'error';
    blacklist: 'healthy' | 'error';
    pool: 'healthy' | 'error';
    deduplication: 'healthy' | 'error';
  };
  details: {
    configLoaded: boolean;
    providersCount: number;
    modelsCount: number;
    blacklistCount: number;
    poolCount: number;
    lastHealthCheck: string;
  };
}

/**
 * Creates and initializes a complete configuration management system
 */
export async function createConfigurationSystem(
  options: IConfigurationSystemOptions = {}
): Promise<IConfigurationSystem> {
  const {
    configPath = require('path').join(require('os').homedir(), '.rcc', 'config.json'),
    enableDeduplication = true,
    enableProviderTesting = true,
    enableModelDiscovery = true,
    managerOptions = {}
  } = options;

  // Create all managers
  const configManager = new ConfigManager(configPath, managerOptions.config);
  const providersManager = new ProvidersManager(configManager, managerOptions.providers);
  const modelsManager = new ModelsManager(configManager, providersManager);
  const blacklistManager = new BlacklistManager(configManager, managerOptions.blacklist);
  const poolManager = new PoolManager(configManager, managerOptions.pool);

  // Create deduplication coordinator if enabled
  let deduplicationCoordinator: IDeduplicationCoordinator | null = null;
  if (enableDeduplication) {
    deduplicationCoordinator = new DeduplicationCoordinator(
      blacklistManager,
      poolManager,
      { enableAutoDeduplication: true }
    );
  }

  const system: IConfigurationSystem = {
    config: configManager,
    providers: providersManager,
    models: modelsManager,
    blacklist: blacklistManager,
    pool: poolManager,
    deduplication: deduplicationCoordinator!,

    async initialize(): Promise<void> {
      // Initialize in dependency order
      await configManager.initialize();
      await providersManager.initialize();
      await modelsManager.initialize();
      await blacklistManager.initialize();
      await poolManager.initialize();
      
      if (deduplicationCoordinator) {
        await deduplicationCoordinator.initialize();
      }

      console.log('✅ [ConfigurationSystem] All modules initialized successfully');
    },

    async destroy(): Promise<void> {
      if (deduplicationCoordinator) {
        await deduplicationCoordinator.destroy();
      }
      await poolManager.destroy();
      await blacklistManager.destroy();
      await modelsManager.destroy();
      await providersManager.destroy();
      await configManager.destroy();

      console.log('✅ [ConfigurationSystem] All modules destroyed successfully');
    },

    async getSystemHealth(): Promise<ISystemHealth> {
      const health: ISystemHealth = {
        overall: 'healthy',
        components: {
          config: 'healthy',
          providers: 'healthy',
          models: 'healthy',
          blacklist: 'healthy',
          pool: 'healthy',
          deduplication: 'healthy'
        },
        details: {
          configLoaded: false,
          providersCount: 0,
          modelsCount: 0,
          blacklistCount: 0,
          poolCount: 0,
          lastHealthCheck: new Date().toISOString()
        }
      };

      try {
        // Check each component
        const config = await configManager.getConfig();
        health.details.configLoaded = !!config;
        
        const providers = await providersManager.getAll();
        health.details.providersCount = providers.length;
        
        const blacklistItems = await blacklistManager.getAll();
        health.details.blacklistCount = blacklistItems.length;
        
        const poolItems = await poolManager.getAll();
        health.details.poolCount = poolItems.length;

        // Calculate models count
        let totalModels = 0;
        for (const provider of providers) {
          if (provider.models) {
            totalModels += provider.models.length;
          }
        }
        health.details.modelsCount = totalModels;

      } catch (error) {
        health.overall = 'error';
        console.error('❌ [ConfigurationSystem] Health check failed:', error);
      }

      return health;
    }
  };

  return system;
}

/**
 * Default export for convenience
 */
export default {
  ConfigManager,
  ProvidersManager,
  ModelsManager,
  BlacklistManager,
  PoolManager,
  DeduplicationCoordinator,
  createConfigurationSystem
};