/**
 * Routes Manager Interfaces
 * 
 * Interface definitions for route CONFIGURATION management system.
 * Provides configuration tables for virtual model categories and routing rules.
 * Does NOT include actual routing execution - that's handled by routing engines.
 */

import type { IProvider, IModel, IPoolEntry, IManagerOptions } from '../../shared/types';

// Core route interfaces
export interface IRoute {
  id: string;
  name: string;
  category: string;
  virtual_model?: string; // Virtual model name (e.g., "default", "coding", "reasoning")
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
  weight?: number; // For weighted load balancing
  priority?: number; // For priority-based selection
  status: 'active' | 'inactive' | 'error';
  health_status?: IRouteTargetHealth;
  fallback_order?: number;
}

export interface IVirtualModelCategory {
  name: string; // e.g., "default", "coding", "reasoning", "fast", "accurate"
  display_name: string;
  description: string;
  selection_criteria: IModelSelectionCriteria;
  fallback_categories?: string[];
  default_targets?: IRouteTarget[];
}

export interface IModelSelectionCriteria {
  // Model capability requirements
  min_context_length?: number;
  max_context_length?: number;
  supports_code?: boolean;
  supports_reasoning?: boolean;
  supports_vision?: boolean;
  supports_functions?: boolean;
  
  // Performance requirements
  max_response_time_ms?: number;
  min_success_rate?: number;
  
  // Cost considerations
  max_cost_per_token?: number;
  prefer_lower_cost?: boolean;
  
  // Provider preferences
  preferred_providers?: string[];
  excluded_providers?: string[];
  excluded_models?: string[];
  
  // Source preferences
  prefer_pool_models?: boolean;
  prefer_verified_models?: boolean;
  exclude_blacklisted?: boolean;
}

export interface ILoadBalancingStrategy {
  type: 'round_robin' | 'weighted' | 'random' | 'health_based' | 'priority' | 'least_connections';
  config?: {
    // Round robin specific
    current_index?: number;
    
    // Weighted specific
    total_weight?: number;
    
    // Health-based specific
    health_threshold?: number;
    failure_timeout_ms?: number;
    
    // Priority specific
    failover_enabled?: boolean;
    
    // Least connections specific
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

export interface IRouteHealthStatus {
  route_id: string;
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  healthy_targets: number;
  total_targets: number;
  targets: IRouteTargetHealth[];
  last_updated: string;
}

// Route selection and routing results
export interface IRouteSelectionResult {
  success: boolean;
  route?: IRoute;
  target?: IRouteTarget;
  provider?: IProvider;
  model?: IModel;
  selection_reason: string;
  fallback_used?: boolean;
  load_balancing_info?: {
    strategy_used: string;
    target_selection_method: string;
    next_target_hint?: string;
  };
  performance_info?: {
    selection_time_ms: number;
    health_check_time_ms?: number;
  };
  error?: string;
}

export interface IRoutingOptions {
  virtual_model?: string;
  category?: string;
  preferred_provider?: string;
  exclude_providers?: string[];
  require_healthy?: boolean;
  max_selection_time_ms?: number;
  enable_fallback?: boolean;
  metadata?: Record<string, any>;
}

// Metrics and monitoring
export interface IRoutingMetrics {
  route_id: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time_ms: number;
  target_usage: Record<string, number>; // target_id -> request_count
  error_distribution: Record<string, number>; // error_type -> count
  last_24h_stats: {
    requests: number;
    success_rate: number;
    average_response_time_ms: number;
  };
  uptime_percentage: number;
  created_at: string;
  updated_at: string;
}

// Routes Manager main interface
export interface IRoutesManager {
  // Lifecycle
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  
  // Route CRUD operations
  getAll(): Promise<IRoute[]>;
  getById(id: string): Promise<IRoute | null>;
  getByCategory(category: string): Promise<IRoute[]>;
  getByVirtualModel(virtualModel: string): Promise<IRoute | null>;
  create(route: Omit<IRoute, 'id' | 'created_at' | 'updated_at'>): Promise<IRoute>;
  update(id: string, updates: Partial<IRoute>): Promise<IRoute>;
  delete(id: string): Promise<boolean>;
  
  // Virtual model category management
  getVirtualCategories(): Promise<IVirtualModelCategory[]>;
  getVirtualCategory(name: string): Promise<IVirtualModelCategory | null>;
  createVirtualCategory(category: Omit<IVirtualModelCategory, 'default_targets'>): Promise<IVirtualModelCategory>;
  updateVirtualCategory(name: string, updates: Partial<IVirtualModelCategory>): Promise<IVirtualModelCategory>;
  deleteVirtualCategory(name: string): Promise<boolean>;
  
  // Route target management
  addTarget(routeId: string, target: Omit<IRouteTarget, 'id'>): Promise<IRouteTarget>;
  updateTarget(routeId: string, targetId: string, updates: Partial<IRouteTarget>): Promise<IRouteTarget>;
  removeTarget(routeId: string, targetId: string): Promise<boolean>;
  
  // Configuration generation for routing engines
  generateRoutingTable(): Promise<{
    routes: IRoute[];
    virtual_categories: IVirtualModelCategory[];
    default_strategies: Record<string, ILoadBalancingStrategy>;
    generated_at: string;
  }>;
  
  // Model source integration for route configuration
  getAvailableModelsForRouting(options?: {
    include_config?: boolean;
    include_providers?: boolean;
    include_pool?: boolean;
    exclude_blacklisted?: boolean;
    filter_criteria?: IModelSelectionCriteria;
  }): Promise<Array<{
    source: 'config' | 'provider' | 'pool';
    provider: IProvider;
    model: IModel;
    pool_entry?: IPoolEntry;
    route_compatible: boolean;
  }>>;
  
  // Auto-configuration for route setup
  generateDefaultRoutes(options?: {
    create_default_categories?: boolean;
    use_pool_models?: boolean;
    use_provider_models?: boolean;
    default_load_balancing?: ILoadBalancingStrategy['type'];
  }): Promise<IRoute[]>;
  
  // Load balancing configuration management
  updateLoadBalancingConfig(routeId: string, strategy: ILoadBalancingStrategy): Promise<void>;
  getLoadBalancingConfig(routeId: string): Promise<ILoadBalancingStrategy | null>;
  
  // Configuration management
  exportRoutes(): Promise<{
    routes: IRoute[];
    virtual_categories: IVirtualModelCategory[];
    exported_at: string;
    version: string;
  }>;
  importRoutes(data: {
    routes: IRoute[];
    virtual_categories?: IVirtualModelCategory[];
  }): Promise<{
    imported_routes: number;
    imported_categories: number;
    skipped: number;
    errors: string[];
  }>;
  
  // Validation
  validateRoute(route: Partial<IRoute>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  validateRouteTarget(target: Partial<IRouteTarget>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    provider_available?: boolean;
    model_available?: boolean;
  }>;
}

export interface IRoutesManagerOptions extends IManagerOptions {
  enableHealthMonitoring?: boolean;
  healthCheckInterval?: number;
  enableMetrics?: boolean;
  metricsRetentionDays?: number;
  defaultLoadBalancing?: ILoadBalancingStrategy['type'];
  autoCreateCategories?: boolean;
}