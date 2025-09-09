/**
 * Routes Manager Constants
 * 
 * All constants and default configurations for the Routes Configuration Manager.
 * This module only manages routing CONFIGURATION, not execution.
 * Follows anti-hardcoding policy by centralizing all configuration values.
 */

import type { IVirtualModelCategory, ILoadBalancingStrategy, IRouteHealthConfig } from '../interfaces/IRoutesManager';

export const ROUTES_MANAGER_CONSTANTS = {
  // Module identification
  MODULE_NAME: 'RoutesManager',
  MODULE_VERSION: '1.0.0',
  
  // Default configuration for routing configuration management
  DEFAULT_CONFIG: {
    AUTO_CREATE_CATEGORIES: true,
    DEFAULT_LOAD_BALANCING_TYPE: 'round_robin' as const,
    ENABLE_ROUTE_VALIDATION: true,
    ENABLE_TARGET_VALIDATION: true,
    MAX_ROUTES_PER_CATEGORY: 50,
    MAX_TARGETS_PER_ROUTE: 20,
    DEFAULT_ROUTE_STATUS: 'active' as const,
    DEFAULT_TARGET_STATUS: 'active' as const,
  },
  
  // Load balancing strategies
  LOAD_BALANCING_STRATEGIES: {
    ROUND_ROBIN: 'round_robin',
    WEIGHTED: 'weighted', 
    RANDOM: 'random',
    HEALTH_BASED: 'health_based',
    PRIORITY: 'priority',
    LEAST_CONNECTIONS: 'least_connections',
  } as const,
  
  // Virtual model categories
  DEFAULT_VIRTUAL_CATEGORIES: [
    {
      name: 'default',
      display_name: 'Default Models',
      description: 'General-purpose models suitable for most tasks',
      selection_criteria: {
        min_context_length: 128000,
        exclude_blacklisted: true,
        prefer_verified_models: true,
        prefer_pool_models: true,
      }
    },
    {
      name: 'coding',
      display_name: 'Coding & Development',
      description: 'Models optimized for code generation and development tasks',
      selection_criteria: {
        supports_code: true,
        min_context_length: 200000,
        prefer_pool_models: true,
        preferred_providers: ['openai', 'anthropic'],
        exclude_blacklisted: true,
      }
    },
    {
      name: 'reasoning',
      display_name: 'Reasoning & Analysis',
      description: 'Models with strong reasoning and analytical capabilities',
      selection_criteria: {
        supports_reasoning: true,
        min_context_length: 128000,
        max_response_time_ms: 30000,
        prefer_verified_models: true,
        exclude_blacklisted: true,
      }
    },
    {
      name: 'fast',
      display_name: 'Fast Response',
      description: 'Models optimized for quick responses',
      selection_criteria: {
        max_response_time_ms: 5000,
        min_success_rate: 0.95,
        exclude_blacklisted: true,
        prefer_pool_models: true,
      }
    },
    {
      name: 'accurate',
      display_name: 'High Accuracy',
      description: 'Models with highest accuracy for critical tasks',
      selection_criteria: {
        min_success_rate: 0.98,
        prefer_verified_models: true,
        preferred_providers: ['openai', 'anthropic'],
        exclude_blacklisted: true,
      }
    },
    {
      name: 'vision',
      display_name: 'Vision & Multimodal',
      description: 'Models with vision and multimodal capabilities',
      selection_criteria: {
        supports_vision: true,
        min_context_length: 128000,
        exclude_blacklisted: true,
      }
    }
  ] as IVirtualModelCategory[],
  
  // Default load balancing configurations
  DEFAULT_LOAD_BALANCING_CONFIGS: {
    round_robin: {
      type: 'round_robin',
      config: {
        current_index: 0,
      }
    },
    weighted: {
      type: 'weighted',
      config: {
        total_weight: 0,
      }
    },
    random: {
      type: 'random',
      config: {}
    },
    health_based: {
      type: 'health_based',
      config: {
        health_threshold: 0.8,
        failure_timeout_ms: 300000, // 5 minutes
      }
    },
    priority: {
      type: 'priority',
      config: {
        failover_enabled: true,
      }
    },
    least_connections: {
      type: 'least_connections',
      config: {
        connection_counts: {},
      }
    }
  } as Record<string, ILoadBalancingStrategy>,
  
  // Health monitoring defaults
  DEFAULT_HEALTH_CONFIG: {
    enabled: true,
    check_interval_ms: 60000, // 1 minute
    timeout_ms: 10000, // 10 seconds
    failure_threshold: 3,
    recovery_threshold: 2,
    retry_after_ms: 300000, // 5 minutes
  } as IRouteHealthConfig,
  
  // Route status values
  ROUTE_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive', 
    MAINTENANCE: 'maintenance',
  } as const,
  
  // Target status values
  TARGET_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ERROR: 'error',
  } as const,
  
  // Health status values
  HEALTH_STATUS: {
    HEALTHY: 'healthy',
    UNHEALTHY: 'unhealthy',
    UNKNOWN: 'unknown',
    DEGRADED: 'degraded',
  } as const,
  
  // Route selection reasons
  SELECTION_REASONS: {
    EXACT_MATCH: 'Virtual model matched exactly',
    CATEGORY_MATCH: 'Category matched',
    FALLBACK_USED: 'Fallback category used',
    CRITERIA_MATCH: 'Selection criteria matched',
    DEFAULT_SELECTED: 'Default route selected',
    LOAD_BALANCED: 'Load balancing applied',
    HEALTH_BASED: 'Health-based selection',
    PRIORITY_BASED: 'Priority-based selection',
    RANDOM_SELECTION: 'Random selection applied',
    WEIGHTED_SELECTION: 'Weighted selection applied',
    NO_MATCH: 'No suitable route found',
  } as const,
  
  // Error messages
  ERRORS: {
    ROUTE_NOT_FOUND: 'Route not found',
    TARGET_NOT_FOUND: 'Route target not found',
    INVALID_ROUTE: 'Invalid route configuration',
    INVALID_TARGET: 'Invalid route target configuration',
    LOAD_BALANCING_FAILED: 'Load balancing selection failed',
    HEALTH_CHECK_FAILED: 'Health check failed',
    NO_HEALTHY_TARGETS: 'No healthy targets available',
    VIRTUAL_CATEGORY_NOT_FOUND: 'Virtual model category not found',
    SELECTION_TIMEOUT: 'Route selection timed out',
    INVALID_LOAD_BALANCING_STRATEGY: 'Invalid load balancing strategy',
    PROVIDER_NOT_AVAILABLE: 'Provider not available',
    MODEL_NOT_AVAILABLE: 'Model not available',
    CIRCULAR_FALLBACK: 'Circular fallback dependency detected',
  } as const,
  
  // Validation rules
  VALIDATION: {
    ROUTE_NAME_MIN_LENGTH: 1,
    ROUTE_NAME_MAX_LENGTH: 100,
    CATEGORY_NAME_MIN_LENGTH: 1,
    CATEGORY_NAME_MAX_LENGTH: 50,
    DESCRIPTION_MAX_LENGTH: 500,
    MAX_TARGETS_PER_ROUTE: 20,
    MIN_WEIGHT: 0,
    MAX_WEIGHT: 1000,
    MIN_PRIORITY: 0,
    MAX_PRIORITY: 100,
    MAX_FALLBACK_DEPTH: 5,
  } as const,
  
  // Performance thresholds
  PERFORMANCE: {
    MAX_ROUTE_SELECTION_TIME_MS: 5000,
    MAX_HEALTH_CHECK_TIME_MS: 10000,
    TARGET_RESPONSE_TIME_WARNING_MS: 10000,
    TARGET_RESPONSE_TIME_ERROR_MS: 30000,
    MIN_SUCCESS_RATE_WARNING: 0.9,
    MIN_SUCCESS_RATE_ERROR: 0.7,
  } as const,
  
  // Metrics configuration
  METRICS: {
    RETENTION_DAYS: 30,
    AGGREGATION_INTERVAL_MS: 300000, // 5 minutes
    MAX_ERROR_TYPES: 50,
    CLEANUP_INTERVAL_MS: 86400000, // 24 hours
  } as const,
  
  // Import/Export configuration
  IMPORT_EXPORT: {
    VERSION: '1.0.0',
    MAX_IMPORT_SIZE_MB: 10,
    SUPPORTED_FORMATS: ['json'],
    BACKUP_COUNT: 5,
  } as const,
} as const;

// Type exports for constants
export type RouteStatus = typeof ROUTES_MANAGER_CONSTANTS.ROUTE_STATUS[keyof typeof ROUTES_MANAGER_CONSTANTS.ROUTE_STATUS];
export type TargetStatus = typeof ROUTES_MANAGER_CONSTANTS.TARGET_STATUS[keyof typeof ROUTES_MANAGER_CONSTANTS.TARGET_STATUS];
export type HealthStatus = typeof ROUTES_MANAGER_CONSTANTS.HEALTH_STATUS[keyof typeof ROUTES_MANAGER_CONSTANTS.HEALTH_STATUS];
export type SelectionReason = typeof ROUTES_MANAGER_CONSTANTS.SELECTION_REASONS[keyof typeof ROUTES_MANAGER_CONSTANTS.SELECTION_REASONS];
export type LoadBalancingType = keyof typeof ROUTES_MANAGER_CONSTANTS.DEFAULT_LOAD_BALANCING_CONFIGS;