/**
 * Shared Interfaces Export Module
 * 
 * Central export point for all shared interfaces used across the configuration package.
 * This helps maintain consistency and provides easy imports for complex types.
 */

// Base interfaces shared across all modules
export interface IManagerOptions {
  enableLogging?: boolean;
  enableValidation?: boolean;
  enableBackups?: boolean;
  backupCount?: number;
  configPath?: string;
}

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IHealthStatus {
  status: 'healthy' | 'warning' | 'error';
  details?: string[];
  lastChecked?: string;
}

// Configuration-related interfaces
export interface IConfigurationData {
  providers?: IProvider[];
  blacklist?: IBlacklistEntry[];
  pool?: IPoolEntry[];
  routes?: IRoute[];
  virtual_categories?: IVirtualModelCategory[];
  metadata?: {
    version?: string;
    created_at?: string;
    updated_at?: string;
  };
}

// Provider and Model interfaces
export interface IProvider {
  id: string;
  name: string;
  type: string;
  base_url: string;
  api_key?: string;
  models?: IModel[];
  status?: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

export interface IModel {
  id: string;
  name: string;
  context_length: number;
  max_tokens?: number;
  auto_detected_tokens?: number;
  supports_code?: boolean;
  supports_reasoning?: boolean;
  supports_vision?: boolean;
  supports_functions?: boolean;
  cost_per_token?: number;
  success_rate?: number;
  average_response_time_ms?: number;
  status?: 'active' | 'inactive' | 'testing' | 'verified' | 'failed';
  verification_status?: 'pending' | 'verified' | 'failed';
  last_verified?: string;
  metadata?: Record<string, any>;
}

// Blacklist interfaces
export interface IBlacklistEntry {
  id: string;
  provider_id: string;
  model_id?: string;
  reason: string;
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

// Pool interfaces
export interface IPoolEntry {
  id: string;
  provider_id: string;
  model_id: string;
  status: 'active' | 'inactive' | 'testing';
  priority?: number;
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

// Route interfaces (imported from RoutesManager)
export interface IRoute {
  id: string;
  name: string;
  category: string;
  virtual_model?: string;
  description?: string;
  targets: IRouteTarget[];
  load_balancing: ILoadBalancingStrategy;
  health_check?: IRouteHealthConfig;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface IRouteTarget {
  id: string;
  provider_id: string;
  provider_name: string;
  model_id: string;
  model_name: string;
  weight?: number;
  priority?: number;
  status: 'active' | 'inactive' | 'error';
  health_status?: IRouteTargetHealth;
  fallback_order?: number;
}

export interface IVirtualModelCategory {
  name: string;
  display_name: string;
  description: string;
  selection_criteria: IModelSelectionCriteria;
  fallback_categories?: string[];
  default_targets?: IRouteTarget[];
}

export interface IModelSelectionCriteria {
  min_context_length?: number;
  max_context_length?: number;
  supports_code?: boolean;
  supports_reasoning?: boolean;
  supports_vision?: boolean;
  supports_functions?: boolean;
  max_response_time_ms?: number;
  min_success_rate?: number;
  max_cost_per_token?: number;
  prefer_lower_cost?: boolean;
  preferred_providers?: string[];
  excluded_providers?: string[];
  excluded_models?: string[];
  prefer_pool_models?: boolean;
  prefer_verified_models?: boolean;
  exclude_blacklisted?: boolean;
}

export interface ILoadBalancingStrategy {
  type: 'round_robin' | 'weighted' | 'random' | 'health_based' | 'priority' | 'least_connections';
  config?: {
    current_index?: number;
    total_weight?: number;
    health_threshold?: number;
    failure_timeout_ms?: number;
    failover_enabled?: boolean;
    connection_counts?: Record<string, number>;
  };
}

export interface IRouteHealthConfig {
  enabled: boolean;
  check_interval_ms: number;
  timeout_ms: number;
  failure_threshold: number;
  recovery_threshold: number;
  retry_after_ms: number;
}

export interface IRouteTargetHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  last_check: string;
  response_time_ms?: number;
  error_count: number;
  success_count: number;
  last_error?: string;
  consecutive_failures: number;
  consecutive_successes: number;
}

// Provider testing interfaces
export interface IProviderTestResult {
  success: boolean;
  response_time_ms?: number;
  error?: string;
  status_code?: number;
  tested_at: string;
}

export interface IModelVerificationResult {
  success: boolean;
  model_id: string;
  provider_id: string;
  response_time_ms?: number;
  max_tokens_detected?: number;
  supports_code?: boolean;
  supports_reasoning?: boolean;
  error?: string;
  tested_at: string;
}

export interface ITokenDetectionResult {
  success: boolean;
  detected_max_tokens?: number;
  detection_method: string;
  error?: string;
  tested_at: string;
}

// Deduplication interfaces
export interface IDeduplicationResult {
  duplicates_found: number;
  duplicates_removed: number;
  conflicts_resolved: number;
  blacklist_prioritized: number;
  pool_entries_removed: number;
  details: Array<{
    provider_id: string;
    model_id: string;
    action: 'blacklist_priority' | 'pool_removed' | 'conflict_resolved';
    reason: string;
  }>;
}

// Event interfaces
export interface IConfigChangeEvent {
  type: 'provider_added' | 'provider_removed' | 'provider_updated' | 
        'model_added' | 'model_removed' | 'model_updated' |
        'blacklist_added' | 'blacklist_removed' |
        'pool_added' | 'pool_removed' |
        'route_added' | 'route_removed' | 'route_updated';
  data: any;
  timestamp: string;
}

// Error interfaces
export interface IConfigurationError extends Error {
  code: string;
  context?: Record<string, any>;
}

// Metrics interfaces
export interface ISystemMetrics {
  providers: {
    total: number;
    active: number;
    inactive: number;
  };
  models: {
    total: number;
    verified: number;
    failed: number;
    pending: number;
  };
  blacklist: {
    total: number;
    provider_blocks: number;
    model_blocks: number;
  };
  pool: {
    total: number;
    active: number;
    inactive: number;
  };
  routes: {
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
  };
  last_updated: string;
}