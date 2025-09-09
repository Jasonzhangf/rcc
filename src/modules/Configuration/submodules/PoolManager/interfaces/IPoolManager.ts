/**
 * PoolManager Interface
 * Handles provider pool operations with deduplication logic
 */

import { IPoolEntry, IConfigData } from '../../submodules/ConfigManager/interfaces/IConfigManager';

export interface IPoolManager {
  /**
   * Add model to provider pool with deduplication
   */
  addToProviderPool(providerId: string, modelId: string): Promise<IPoolManagerResponse>;

  /**
   * Remove model from provider pool
   */
  removeFromPool(modelId: string): Promise<IPoolManagerResponse>;

  /**
   * Get all pool models
   */
  getAllPoolModels(): Promise<IPoolManagerResponse>;

  /**
   * Get pool models grouped by provider
   */
  getPoolModelsByProvider(): Promise<IPoolManagerResponse>;

  /**
   * Check if model is in pool
   */
  isModelInPool(modelId: string): boolean;

  /**
   * Get pool entry by model ID
   */
  getPoolEntry(modelId: string): IPoolEntry | null;

  /**
   * Get pool size
   */
  getPoolSize(): number;

  /**
   * Notify about blacklist changes for deduplication
   */
  onModelBlacklisted(modelId: string): Promise<void>;
}

export interface IPoolManagerResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
  timestamp: number;
  message?: string;
  count?: number;
  totalPoolSize?: number;
}

export interface IPoolValidation {
  /**
   * Validate pool entry structure
   */
  validatePoolEntry(entry: IPoolEntry): boolean;

  /**
   * Validate model compatibility for pool
   */
  validateModelForPool(providerId: string, modelId: string): Promise<{
    valid: boolean;
    reason?: string;
  }>;

  /**
   * Check pool constraints (size limits, duplicates, etc.)
   */
  validatePoolConstraints(): Promise<{
    valid: boolean;
    issues: string[];
  }>;
}

export interface IPoolMetrics {
  /**
   * Get pool usage statistics
   */
  getPoolStats(): {
    totalModels: number;
    activeModels: number;
    providersCount: number;
    avgModelsPerProvider: number;
    lastUpdated: string;
  };

  /**
   * Get pool health status
   */
  getPoolHealth(): {
    healthy: boolean;
    issues: string[];
    warnings: string[];
  };
}