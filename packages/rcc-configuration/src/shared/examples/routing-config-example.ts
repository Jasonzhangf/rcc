/**
 * Routing Configuration Examples
 * 
 * This file demonstrates how the RoutesManager generates configuration
 * that can be consumed by actual routing engines.
 * 
 * IMPORTANT: This module only generates CONFIGURATION - it does NOT:
 * - Execute load balancing
 * - Handle actual API routing
 * - Manage multi-key authentication
 * - Perform health checks
 * 
 * These are handled by separate routing engines that consume this config.
 */

import type { IRoute, IVirtualModelCategory } from '../RoutesManager/interfaces/IRoutesManager';

// Example: Virtual model category configuration
export const EXAMPLE_VIRTUAL_CATEGORIES: IVirtualModelCategory[] = [
  {
    name: 'default',
    display_name: 'Default Models',
    description: 'General-purpose models for typical requests',
    selection_criteria: {
      min_context_length: 128000,
      exclude_blacklisted: true,
      prefer_verified_models: true,
      prefer_pool_models: true,
    }
  },
  {
    name: 'coding',
    display_name: 'Coding Assistant',
    description: 'Models optimized for code generation',
    selection_criteria: {
      supports_code: true,
      min_context_length: 200000,
      preferred_providers: ['openai', 'anthropic'],
      exclude_blacklisted: true,
    }
  }
];

// Example: Route configuration table
export const EXAMPLE_ROUTES: IRoute[] = [
  {
    id: 'default-route',
    name: 'Default Route',
    category: 'default',
    virtual_model: 'default',
    description: 'Default routing for general requests',
    targets: [
      {
        id: 'target-1',
        provider_id: 'iflow-provider',
        provider_name: 'iFlow',
        model_id: 'qwen3-max-preview', 
        model_name: 'qwen3-max-preview',
        weight: 3, // Higher weight = more traffic
        priority: 1,
        status: 'active',
      },
      {
        id: 'target-2',
        provider_id: 'iflow-provider',
        provider_name: 'iFlow',
        model_id: 'kimi-k2',
        model_name: 'kimi-k2',
        weight: 2,
        priority: 2,
        status: 'active',
      }
    ],
    load_balancing: {
      type: 'weighted', // Configuration only - actual implementation elsewhere
      config: {
        total_weight: 5,
      }
    },
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    status: 'active'
  }
];

// Example: Generated routing table for consumption by routing engines
export const EXAMPLE_ROUTING_TABLE = {
  routes: EXAMPLE_ROUTES,
  virtual_categories: EXAMPLE_VIRTUAL_CATEGORIES,
  default_strategies: {
    round_robin: {
      type: 'round_robin',
      config: { current_index: 0 }
    },
    weighted: {
      type: 'weighted', 
      config: { total_weight: 0 }
    }
  },
  generated_at: '2024-01-01T00:00:00.000Z'
};

// Example: How a routing engine would consume this config
export interface IRoutingEngineConfig {
  // This is what routing engines expect from RoutesManager
  routing_table: typeof EXAMPLE_ROUTING_TABLE;
  
  // Routing engines handle these aspects (NOT RoutesManager):
  // - Actual request routing logic
  // - Load balancing execution  
  // - Multi-key authentication rotation
  // - Health checking implementation
  // - Metrics collection
  // - Failover handling
}

/**
 * Usage Example for Routing Engines:
 * 
 * ```typescript
 * import { RoutesManager } from '@rcc/configuration';
 * 
 * class MyRoutingEngine {
 *   constructor(private routesManager: RoutesManager) {}
 *   
 *   async initialize() {
 *     // Get routing configuration from RoutesManager
 *     const routingTable = await this.routesManager.generateRoutingTable();
 *     
 *     // Use the config to implement actual routing logic
 *     this.setupRoutes(routingTable.routes);
 *     this.configureLoadBalancing(routingTable.default_strategies);
 *   }
 *   
 *   async routeRequest(virtualModel: string, request: any) {
 *     // Implement actual routing logic using the configuration
 *     const route = this.findRoute(virtualModel);
 *     const target = this.selectTarget(route); // Load balancing implementation
 *     const provider = this.getProvider(target.provider_id);
 *     
 *     // Execute request with selected target
 *     return this.executeRequest(provider, target.model_id, request);
 *   }
 * }
 * ```
 */