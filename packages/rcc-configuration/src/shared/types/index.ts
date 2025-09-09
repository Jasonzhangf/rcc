/**
 * Shared type definitions for RCC Configuration package
 */

// Base configuration types
export interface IConfigurationData {
  version: string;
  last_updated: string;
  providers: IProvider[];
  routes: IRoute[];
  global_config: IGlobalConfig;
  model_blacklist: IBlacklistEntry[];
  provider_pool: IPoolEntry[];
}

// Provider types
export interface IProvider {
  id: string;
  name: string;
  protocol: 'openai' | 'anthropic' | 'gemini' | 'custom';
  api_base_url: string;
  api_key: string | string[];
  auth_type: 'api_key' | 'bearer_token' | 'oauth2' | 'custom';
  models?: IModel[];
  created_at?: string;
  updated_at?: string;
  status?: 'active' | 'inactive' | 'error';
  health_status?: IHealthStatus;
}

// Model types
export interface IModel {
  id: string;
  name: string;
  max_tokens: number;
  description?: string;
  status: 'active' | 'inactive' | 'blacklisted' | 'pending';
  verified: boolean;
  auto_detected_tokens?: number | null;
  blacklisted: boolean;
  blacklist_reason?: string | null;
  manual_override: boolean;
  created_at: string;
  updated_at: string;
  last_verification?: string;
  capabilities?: IModelCapabilities;
  pricing?: IModelPricing;
}

// Blacklist types
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

// Pool types
export interface IPoolEntry {
  id: string;
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  api_base_url: string;
  protocol: string;
  auth_type: string;
  api_key: string | string[];
  model: IModel;
  added_at: string;
  status: 'active' | 'inactive';
  priority?: number;
  weight?: number;
}

// Route types
export interface IRoute {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  target_provider?: string;
  load_balancing?: 'round_robin' | 'weighted' | 'health_based';
  created_at: string;
  updated_at: string;
}

// Global configuration types
export interface IGlobalConfig {
  load_balancing: 'round_robin' | 'weighted' | 'health_based';
  rate_limiting: IRateLimiting;
  caching?: ICachingConfig;
  monitoring?: IMonitoringConfig;
  security?: ISecurityConfig;
}

export interface IRateLimiting {
  enabled: boolean;
  requests_per_minute: number;
  burst_limit?: number;
  per_provider?: boolean;
}

export interface ICachingConfig {
  enabled: boolean;
  ttl_seconds: number;
  max_size: number;
  strategy: 'lru' | 'lfu' | 'fifo';
}

export interface IMonitoringConfig {
  enabled: boolean;
  metrics_endpoint?: string;
  health_check_interval: number;
  alert_thresholds: IAlertThresholds;
}

export interface IAlertThresholds {
  error_rate: number;
  response_time_ms: number;
  availability: number;
}

export interface ISecurityConfig {
  api_key_validation: boolean;
  request_signing: boolean;
  rate_limiting_by_key: boolean;
  allowed_origins?: string[];
}

// Health and status types
export interface IHealthStatus {
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  last_check: string;
  response_time_ms?: number;
  error_count: number;
  success_rate: number;
  details?: Record<string, any>;
}

export interface IModelCapabilities {
  supports_streaming: boolean;
  supports_functions: boolean;
  supports_vision: boolean;
  supports_code: boolean;
  max_context_length: number;
  languages: string[];
}

export interface IModelPricing {
  input_tokens_per_million: number;
  output_tokens_per_million: number;
  currency: string;
  effective_date: string;
}

// API response types
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Test and verification types
export interface IProviderTestResult {
  success: boolean;
  provider_id: string;
  response_time_ms: number;
  status_code?: number;
  error?: string;
  tested_at: string;
  details?: {
    endpoint_tested: string;
    api_key_used: string;
    models_discovered?: number;
  };
}

export interface IModelVerificationResult {
  success: boolean;
  provider_id: string;
  model_id: string;
  verified_at: string;
  response_time_ms?: number;
  max_tokens_detected?: number;
  error?: string;
  details?: {
    test_message: string;
    response_received: boolean;
    token_count?: number;
  };
}

export interface ITokenDetectionResult {
  success: boolean;
  provider_id: string;
  model_id: string;
  detected_tokens: number | null;
  detection_method: 'incremental' | 'binary_search' | 'api_response';
  tested_at: string;
  error?: string;
  details?: {
    tests_performed: number;
    max_tested: number;
    min_tested: number;
  };
}

// Deduplication types
export interface IDeduplicationResult {
  success: boolean;
  conflicts_found: number;
  conflicts_resolved: number;
  actions_taken: IDeduplicationAction[];
  processed_at: string;
}

export interface IDeduplicationAction {
  action: 'remove_from_blacklist' | 'remove_from_pool' | 'update_status';
  target: 'blacklist' | 'pool' | 'model';
  item_id: string;
  reason: string;
  performed_at: string;
}

// Event types for inter-module communication
export interface IConfigurationEvent {
  type: 'config_updated' | 'provider_added' | 'provider_removed' | 'model_verified' | 'blacklist_updated' | 'pool_updated';
  source: 'ConfigManager' | 'ProvidersManager' | 'ModelsManager' | 'BlacklistManager' | 'PoolManager';
  data: any;
  timestamp: string;
  correlation_id?: string;
}

// Utility types
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type RequiredExcept<T, K extends keyof T> = Required<T> & Partial<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Validation types
export interface IValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface IValidationResult {
  isValid: boolean;
  errors: IValidationError[];
  warnings?: IValidationError[];
}

// Configuration options types
export interface IManagerOptions {
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  enableValidation?: boolean;
  enableMetrics?: boolean;
  timeout_ms?: number;
}

export interface IConfigManagerOptions extends IManagerOptions {
  autoSave?: boolean;
  backupOnChange?: boolean;
  maxBackups?: number;
  validateOnLoad?: boolean;
}

export interface IProviderOptions extends IManagerOptions {
  enableTesting?: boolean;
  testTimeout?: number;
  maxRetries?: number;
  enableModelDiscovery?: boolean;
}

export interface IBlacklistOptions extends IManagerOptions {
  enableAutoRemoval?: boolean;
  maxAge?: number;
}

export interface IPoolOptions extends IManagerOptions {
  enableLoadBalancing?: boolean;
  healthCheckInterval?: number;
  maxPoolSize?: number;
}

export interface IDeduplicationOptions extends IManagerOptions {
  enableAutoDeduplication?: boolean;
  conflictResolutionStrategy?: 'prefer_blacklist' | 'prefer_pool' | 'manual';
  checkInterval?: number;
}

// Forward declarations for manager interfaces
export interface IConfigManager {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  getConfig(): Promise<IConfigurationData | null>;
  saveConfig(config: IConfigurationData): Promise<void>;
  updateConfig(updates: Partial<IConfigurationData>): Promise<void>;
  resetConfig(): Promise<void>;
  createBackup(label?: string): Promise<string>;
  restoreBackup(backupId: string): Promise<void>;
  listBackups(): Promise<Array<{id: string; label?: string; created_at: string; size: number;}>>;
  deleteBackup(backupId: string): Promise<boolean>;
  validateConfig(config?: IConfigurationData): Promise<IValidationResult>;
  repairConfig(config?: IConfigurationData): Promise<{config: IConfigurationData; repairs_made: string[];}>;
  getConfigPath(): string;
  configExists(): Promise<boolean>;
  getConfigStats(): Promise<{exists: boolean; size: number; modified_at: string; version?: string;}>;
  onConfigChanged(callback: (config: IConfigurationData) => void): void;
  offConfigChanged(callback: (config: IConfigurationData) => void): void;
  getLastModified(): Promise<string | null>;
}

export interface IProvidersManager {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  getAll(): Promise<IProvider[]>;
  getById(id: string): Promise<IProvider | null>;
  create(providerData: Omit<IProvider, 'id' | 'created_at' | 'updated_at'>): Promise<IProvider>;
  update(id: string, updates: Partial<IProvider>): Promise<IProvider>;
  delete(id: string): Promise<boolean>;
  testProvider(id: string): Promise<IProviderTestResult>;
  testAllProviders(): Promise<IProviderTestResult[]>;
  validateProvider(provider: Partial<IProvider>): Promise<IValidationResult>;
  discoverModels(id: string): Promise<IProvider>;
}

export interface IModelsManager {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  getAll(): Promise<IModel[]>;
  verifyModel(providerId: string, modelId: string): Promise<IModelVerificationResult>;
  detectTokens(providerId: string, modelId: string): Promise<ITokenDetectionResult>;
}

export interface IBlacklistManager {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  getAll(): Promise<IBlacklistEntry[]>;
  add(entry: Omit<IBlacklistEntry, 'id'>): Promise<IBlacklistEntry>;
  remove(id: string): Promise<boolean>;
  isBlacklisted(providerId: string, modelId: string): Promise<boolean>;
}

export interface IPoolManager {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  getAll(): Promise<IPoolEntry[]>;
  add(entry: Omit<IPoolEntry, 'id'>): Promise<IPoolEntry>;
  remove(id: string): Promise<boolean>;
  isInPool(providerId: string, modelId: string): Promise<boolean>;
}

export interface IDeduplicationCoordinator {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  performDeduplication(): Promise<IDeduplicationResult>;
  scheduleDeduplication(intervalMs: number): void;
  stopScheduledDeduplication(): void;
}

export interface IConfigImportExportManager {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  exportConfig(): Promise<any>;
  importConfig(data: any): Promise<any>;
}