/**
 * BlacklistManager Interface
 * Handles model blacklist operations with deduplication logic
 */

import { IBlacklistEntry, IConfigData } from '../../submodules/ConfigManager/interfaces/IConfigManager';

export interface IBlacklistManager {
  /**
   * Add model to blacklist with deduplication
   */
  blacklistModel(providerId: string, modelId: string, reason?: string): Promise<IBlacklistManagerResponse>;

  /**
   * Remove model from blacklist
   */
  removeFromBlacklist(modelId: string): Promise<IBlacklistManagerResponse>;

  /**
   * Get all blacklisted models
   */
  getAllBlacklistedModels(): Promise<IBlacklistManagerResponse>;

  /**
   * Get blacklisted models grouped by provider
   */
  getBlacklistedModelsByProvider(): Promise<IBlacklistManagerResponse>;

  /**
   * Check if model is blacklisted
   */
  isModelBlacklisted(modelId: string): boolean;

  /**
   * Get blacklist entry by model ID
   */
  getBlacklistEntry(modelId: string): IBlacklistEntry | null;

  /**
   * Notify about pool changes for deduplication
   */
  onModelAddedToPool(modelId: string): Promise<void>;
}

export interface IBlacklistManagerResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
  timestamp: number;
  message?: string;
  count?: number;
}

export interface IDeduplicationCoordinator {
  /**
   * Remove model from pool when adding to blacklist
   */
  removeFromPool(modelId: string): Promise<void>;

  /**
   * Remove model from blacklist when adding to pool
   */
  removeFromBlacklist(modelId: string): Promise<void>;

  /**
   * Check for duplicate entries across blacklist and pool
   */
  checkDuplicates(modelId: string): Promise<{
    inBlacklist: boolean;
    inPool: boolean;
  }>;

  /**
   * Ensure no duplicates exist between blacklist and pool
   */
  ensureNoDuplicates(modelId: string, operation: 'add_to_blacklist' | 'add_to_pool'): Promise<void>;
}

export interface IDeduplicationEvent {
  type: 'add_to_blacklist' | 'add_to_pool' | 'remove_from_blacklist' | 'remove_from_pool';
  modelId: string;
  providerId: string;
  timestamp: number;
  source: 'BlacklistManager' | 'PoolManager';
}