/**
 * Configuration Manager Interface
 * Handles configuration file operations, backup/restore functionality
 */

export interface IConfigData {
  version: string;
  last_updated: string;
  providers: IProvider[];
  routes: IRoute[];
  global_config: IGlobalConfig;
  model_blacklist: IBlacklistEntry[];
  provider_pool: IPoolEntry[];
}

export interface IProvider {
  id: string;
  name: string;
  protocol: string;
  api_base_url: string;
  api_key: string[] | string;
  auth_type: string;
  models: IModel[];
  model_blacklist?: string[];
  provider_pool?: string[];
}

export interface IModel {
  id: string;
  name: string;
  max_tokens: number;
  description: string;
  status: string;
  verified: boolean;
  auto_detected_tokens?: number | null;
  blacklisted: boolean;
  blacklist_reason?: string | null;
  manual_override: boolean;
  created_at: string;
  updated_at: string;
  last_verification?: string;
}

export interface IRoute {
  id: string;
  pattern: string;
  priority: number;
  provider: string;
  enabled: boolean;
}

export interface IGlobalConfig {
  load_balancing: string;
  rate_limiting: {
    enabled: boolean;
    requests_per_minute: number;
  };
}

export interface IBlacklistEntry {
  id: string;
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  reason: string;
  blacklisted_at: string;
  original_model: IModel;
}

export interface IPoolEntry {
  id: string;
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  api_base_url: string;
  protocol: string;
  auth_type: string;
  api_key: string[] | string;
  model: IModel;
  added_at: string;
  status: string;
}

export interface IConfigManager {
  /**
   * Load configuration from file
   */
  loadConfig(): Promise<IConfigData>;
  
  /**
   * Save configuration to file
   */
  saveConfig(config: IConfigData): Promise<void>;
  
  /**
   * Create backup of current configuration
   */
  createBackup(): Promise<string>;
  
  /**
   * Restore configuration from backup
   */
  restoreFromBackup(backupPath: string): Promise<void>;
  
  /**
   * Validate configuration structure
   */
  validateConfig(config: IConfigData): boolean;
  
  /**
   * Get configuration file path
   */
  getConfigPath(): string;
}