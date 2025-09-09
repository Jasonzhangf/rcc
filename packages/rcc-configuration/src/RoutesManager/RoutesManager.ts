/**
 * RoutesManager - Route Configuration Management System
 * 
 * This module provides CONFIGURATION-LEVEL route management for virtual model
 * categories and routing tables. It generates configuration data that is consumed
 * by routing engines for actual request routing.
 * 
 * IMPORTANT: This module only manages route CONFIGURATION, not execution.
 * Actual routing, load balancing, and multi-key authentication are handled
 * by separate routing engines that consume the configuration generated here.
 */

import type { 
  IRoutesManager,
  IRoute,
  IRouteTarget,
  IVirtualModelCategory,
  ILoadBalancingStrategy,
  IRoutingOptions,
  IRouteSelectionResult,
  IRoutingMetrics,
  IRoutesManagerOptions,
  IModelSelectionCriteria
} from './interfaces/IRoutesManager';

import type { 
  IConfigManager, 
  IProvidersManager, 
  IModelsManager,
  IPoolManager,
  IBlacklistManager,
  IProvider, 
  IModel, 
  IPoolEntry,
  IManagerOptions
} from '../shared/types';

import { ROUTES_MANAGER_CONSTANTS } from './constants/RoutesManager.constants';

export class RoutesManager implements IRoutesManager {
  private routes: Map<string, IRoute> = new Map();
  private virtualCategories: Map<string, IVirtualModelCategory> = new Map();
  private initialized = false;

  constructor(
    private configManager: IConfigManager,
    private providersManager?: IProvidersManager,
    private modelsManager?: IModelsManager,
    private poolManager?: IPoolManager,
    private blacklistManager?: IBlacklistManager,
    private options: IRoutesManagerOptions = {}
  ) {
    // Initialize with default virtual categories
    this.loadDefaultVirtualCategories();
  }

  /**
   * Initialize the RoutesManager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔧 [RoutesManager] Initializing route configuration management...');

    try {
      // Load existing routes from configuration if available
      const config = await this.configManager.getConfig();
      if (config?.routes) {
        for (const route of config.routes) {
          this.routes.set(route.id, route);
        }
      }

      // Load virtual categories from configuration if available
      if (config?.virtual_categories) {
        for (const category of config.virtual_categories) {
          this.virtualCategories.set(category.name, category);
        }
      }

      // Auto-generate default routes if enabled and no routes exist
      if (this.options.autoCreateCategories !== false && this.routes.size === 0) {
        await this.generateDefaultRoutes();
      }

      this.initialized = true;
      console.log(`✅ [RoutesManager] Initialized with ${this.routes.size} routes and ${this.virtualCategories.size} virtual categories`);
    } catch (error) {
      console.error('❌ [RoutesManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.routes.clear();
    this.virtualCategories.clear();
    this.initialized = false;
    console.log('✅ [RoutesManager] Destroyed successfully');
  }

  // Route CRUD Operations
  async getAll(): Promise<IRoute[]> {
    return Array.from(this.routes.values());
  }

  async getById(id: string): Promise<IRoute | null> {
    return this.routes.get(id) || null;
  }

  async getByCategory(category: string): Promise<IRoute[]> {
    return Array.from(this.routes.values()).filter(route => route.category === category);
  }

  async getByVirtualModel(virtualModel: string): Promise<IRoute | null> {
    const route = Array.from(this.routes.values()).find(r => r.virtual_model === virtualModel);
    return route || null;
  }

  async create(routeData: Omit<IRoute, 'id' | 'created_at' | 'updated_at'>): Promise<IRoute> {
    const route: IRoute = {
      ...routeData,
      id: this.generateRouteId(routeData.name),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Validate route before creating
    const validation = await this.validateRoute(route);
    if (!validation.isValid) {
      throw new Error(`Route validation failed: ${validation.errors.join(', ')}`);
    }

    this.routes.set(route.id, route);
    await this.saveConfiguration();
    
    console.log(`✅ [RoutesManager] Created route: ${route.name} (${route.id})`);
    return route;
  }

  async update(id: string, updates: Partial<IRoute>): Promise<IRoute> {
    const existingRoute = this.routes.get(id);
    if (!existingRoute) {
      throw new Error(ROUTES_MANAGER_CONSTANTS.ERRORS.ROUTE_NOT_FOUND);
    }

    const updatedRoute: IRoute = {
      ...existingRoute,
      ...updates,
      id, // Preserve original ID
      updated_at: new Date().toISOString()
    };

    // Validate updated route
    const validation = await this.validateRoute(updatedRoute);
    if (!validation.isValid) {
      throw new Error(`Route update validation failed: ${validation.errors.join(', ')}`);
    }

    this.routes.set(id, updatedRoute);
    await this.saveConfiguration();
    
    console.log(`✅ [RoutesManager] Updated route: ${updatedRoute.name} (${id})`);
    return updatedRoute;
  }

  async delete(id: string): Promise<boolean> {
    const route = this.routes.get(id);
    if (!route) {
      return false;
    }

    this.routes.delete(id);
    await this.saveConfiguration();
    
    console.log(`✅ [RoutesManager] Deleted route: ${route.name} (${id})`);
    return true;
  }

  // Virtual Category Management
  async getVirtualCategories(): Promise<IVirtualModelCategory[]> {
    return Array.from(this.virtualCategories.values());
  }

  async getVirtualCategory(name: string): Promise<IVirtualModelCategory | null> {
    return this.virtualCategories.get(name) || null;
  }

  async createVirtualCategory(categoryData: Omit<IVirtualModelCategory, 'default_targets'>): Promise<IVirtualModelCategory> {
    const category: IVirtualModelCategory = {
      ...categoryData,
      default_targets: []
    };

    this.virtualCategories.set(category.name, category);
    await this.saveConfiguration();
    
    console.log(`✅ [RoutesManager] Created virtual category: ${category.name}`);
    return category;
  }

  async updateVirtualCategory(name: string, updates: Partial<IVirtualModelCategory>): Promise<IVirtualModelCategory> {
    const existingCategory = this.virtualCategories.get(name);
    if (!existingCategory) {
      throw new Error(ROUTES_MANAGER_CONSTANTS.ERRORS.VIRTUAL_CATEGORY_NOT_FOUND);
    }

    const updatedCategory: IVirtualModelCategory = {
      ...existingCategory,
      ...updates,
      name // Preserve original name
    };

    this.virtualCategories.set(name, updatedCategory);
    await this.saveConfiguration();
    
    console.log(`✅ [RoutesManager] Updated virtual category: ${name}`);
    return updatedCategory;
  }

  async deleteVirtualCategory(name: string): Promise<boolean> {
    const category = this.virtualCategories.get(name);
    if (!category) {
      return false;
    }

    this.virtualCategories.delete(name);
    await this.saveConfiguration();
    
    console.log(`✅ [RoutesManager] Deleted virtual category: ${name}`);
    return true;
  }

  // Route Target Management
  async addTarget(routeId: string, targetData: Omit<IRouteTarget, 'id'>): Promise<IRouteTarget> {
    const route = this.routes.get(routeId);
    if (!route) {
      throw new Error(ROUTES_MANAGER_CONSTANTS.ERRORS.ROUTE_NOT_FOUND);
    }

    const target: IRouteTarget = {
      ...targetData,
      id: this.generateTargetId(targetData.provider_id, targetData.model_id)
    };

    // Validate target
    const validation = await this.validateRouteTarget(target);
    if (!validation.isValid) {
      throw new Error(`Route target validation failed: ${validation.errors.join(', ')}`);
    }

    route.targets.push(target);
    route.updated_at = new Date().toISOString();
    
    await this.saveConfiguration();
    
    console.log(`✅ [RoutesManager] Added target to route ${routeId}: ${target.provider_name}/${target.model_name}`);
    return target;
  }

  async updateTarget(routeId: string, targetId: string, updates: Partial<IRouteTarget>): Promise<IRouteTarget> {
    const route = this.routes.get(routeId);
    if (!route) {
      throw new Error(ROUTES_MANAGER_CONSTANTS.ERRORS.ROUTE_NOT_FOUND);
    }

    const targetIndex = route.targets.findIndex(t => t.id === targetId);
    if (targetIndex === -1) {
      throw new Error(ROUTES_MANAGER_CONSTANTS.ERRORS.TARGET_NOT_FOUND);
    }

    const updatedTarget: IRouteTarget = {
      ...route.targets[targetIndex],
      ...updates,
      id: targetId // Preserve original ID
    };

    // Validate updated target
    const validation = await this.validateRouteTarget(updatedTarget);
    if (!validation.isValid) {
      throw new Error(`Route target update validation failed: ${validation.errors.join(', ')}`);
    }

    route.targets[targetIndex] = updatedTarget;
    route.updated_at = new Date().toISOString();
    
    await this.saveConfiguration();
    
    console.log(`✅ [RoutesManager] Updated target ${targetId} in route ${routeId}`);
    return updatedTarget;
  }

  async removeTarget(routeId: string, targetId: string): Promise<boolean> {
    const route = this.routes.get(routeId);
    if (!route) {
      return false;
    }

    const targetIndex = route.targets.findIndex(t => t.id === targetId);
    if (targetIndex === -1) {
      return false;
    }

    route.targets.splice(targetIndex, 1);
    route.updated_at = new Date().toISOString();
    
    await this.saveConfiguration();
    
    console.log(`✅ [RoutesManager] Removed target ${targetId} from route ${routeId}`);
    return true;
  }

  /**
   * Generate routing table configuration for consumption by routing engines
   */
  async generateRoutingTable(): Promise<{
    routes: IRoute[];
    virtual_categories: IVirtualModelCategory[];
    default_strategies: Record<string, ILoadBalancingStrategy>;
    generated_at: string;
  }> {
    const routes = await this.getAll();
    const virtualCategories = await this.getVirtualCategories();
    
    return {
      routes,
      virtual_categories: virtualCategories,
      default_strategies: ROUTES_MANAGER_CONSTANTS.DEFAULT_LOAD_BALANCING_CONFIGS,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Get available models for routing from multiple sources
   * 
   * This method implements the user requirement:
   * "可以添加的模型可以来自于配置文件中的模型和provider,同时可以来自于pool"
   * (Models can be added from config file models and providers, and also from pool)
   */
  async getAvailableModelsForRouting(options: {
    include_config?: boolean;
    include_providers?: boolean;
    include_pool?: boolean;
    exclude_blacklisted?: boolean;
    filter_criteria?: IModelSelectionCriteria;
  } = {}): Promise<Array<{
    source: 'config' | 'provider' | 'pool';
    provider: IProvider;
    model: IModel;
    pool_entry?: IPoolEntry;
    route_compatible: boolean;
  }>> {
    const {
      include_config = true,
      include_providers = true,
      include_pool = true,
      exclude_blacklisted = true,
      filter_criteria
    } = options;

    const availableModels: Array<{
      source: 'config' | 'provider' | 'pool';
      provider: IProvider;
      model: IModel;
      pool_entry?: IPoolEntry;
      route_compatible: boolean;
    }> = [];

    // Get blacklisted models for filtering
    const blacklistedModels = new Set<string>();
    if (exclude_blacklisted && this.blacklistManager) {
      const blacklistEntries = await this.blacklistManager.getAll();
      blacklistEntries.forEach(entry => {
        blacklistedModels.add(`${entry.provider_id}:${entry.model_id}`);
      });
    }

    // 1. Get models from configuration file
    if (include_config) {
      const config = await this.configManager.getConfig();
      if (config?.providers) {
        for (const provider of config.providers) {
          if (provider.models) {
            for (const model of provider.models) {
              const modelKey = `${provider.id}:${model.id}`;
              
              // Skip blacklisted models
              if (exclude_blacklisted && blacklistedModels.has(modelKey)) {
                continue;
              }

              // Apply filter criteria if provided
              if (filter_criteria && !this.modelMatchesCriteria(model, filter_criteria)) {
                continue;
              }

              availableModels.push({
                source: 'config',
                provider,
                model,
                route_compatible: this.isModelRouteCompatible(model)
              });
            }
          }
        }
      }
    }

    // 2. Get models from providers manager
    if (include_providers && this.providersManager) {
      try {
        const providers = await this.providersManager.getAll();
        for (const provider of providers) {
          if (provider.models) {
            for (const model of provider.models) {
              const modelKey = `${provider.id}:${model.id}`;
              
              // Skip blacklisted models
              if (exclude_blacklisted && blacklistedModels.has(modelKey)) {
                continue;
              }

              // Skip if already included from config
              const alreadyIncluded = availableModels.some(
                item => item.provider.id === provider.id && item.model.id === model.id
              );
              if (alreadyIncluded) {
                continue;
              }

              // Apply filter criteria if provided
              if (filter_criteria && !this.modelMatchesCriteria(model, filter_criteria)) {
                continue;
              }

              availableModels.push({
                source: 'provider',
                provider,
                model,
                route_compatible: this.isModelRouteCompatible(model)
              });
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ [RoutesManager] Failed to get models from providers manager:', error);
      }
    }

    // 3. Get models from pool manager
    if (include_pool && this.poolManager) {
      try {
        const poolEntries = await this.poolManager.getAll();
        for (const poolEntry of poolEntries) {
          const modelKey = `${poolEntry.provider_id}:${poolEntry.model_id}`;
          
          // Skip blacklisted models
          if (exclude_blacklisted && blacklistedModels.has(modelKey)) {
            continue;
          }

          // Skip if already included from config or providers
          const alreadyIncluded = availableModels.some(
            item => item.provider.id === poolEntry.provider_id && item.model.id === poolEntry.model_id
          );
          if (alreadyIncluded) {
            continue;
          }

          // Get provider and model details
          const provider = await this.getProviderById(poolEntry.provider_id);
          const model = await this.getModelById(poolEntry.provider_id, poolEntry.model_id);
          
          if (provider && model) {
            // Apply filter criteria if provided
            if (filter_criteria && !this.modelMatchesCriteria(model, filter_criteria)) {
              continue;
            }

            availableModels.push({
              source: 'pool',
              provider,
              model,
              pool_entry: poolEntry,
              route_compatible: this.isModelRouteCompatible(model)
            });
          }
        }
      } catch (error) {
        console.warn('⚠️ [RoutesManager] Failed to get models from pool manager:', error);
      }
    }

    console.log(`🔍 [RoutesManager] Found ${availableModels.length} available models for routing`);
    console.log(`📊 [RoutesManager] Sources - Config: ${availableModels.filter(m => m.source === 'config').length}, Providers: ${availableModels.filter(m => m.source === 'provider').length}, Pool: ${availableModels.filter(m => m.source === 'pool').length}`);

    return availableModels;
  }

  /**
   * Generate default routes based on available models and virtual categories
   */
  async generateDefaultRoutes(options: {
    create_default_categories?: boolean;
    use_pool_models?: boolean;
    use_provider_models?: boolean;
    default_load_balancing?: ILoadBalancingStrategy['type'];
  } = {}): Promise<IRoute[]> {
    const {
      create_default_categories = true,
      use_pool_models = true,
      use_provider_models = true,
      default_load_balancing = 'round_robin'
    } = options;

    // Ensure we have virtual categories
    if (create_default_categories && this.virtualCategories.size === 0) {
      this.loadDefaultVirtualCategories();
    }

    // Get available models
    const availableModels = await this.getAvailableModelsForRouting({
      include_config: true,
      include_providers: use_provider_models,
      include_pool: use_pool_models,
      exclude_blacklisted: true
    });

    const generatedRoutes: IRoute[] = [];

    // Generate routes for each virtual category
    for (const category of this.virtualCategories.values()) {
      // Find models that match this category's criteria
      const matchingModels = availableModels.filter(item => 
        this.modelMatchesCriteria(item.model, category.selection_criteria)
      );

      if (matchingModels.length === 0) {
        console.warn(`⚠️ [RoutesManager] No models match criteria for category: ${category.name}`);
        continue;
      }

      // Create route targets from matching models
      const targets: IRouteTarget[] = matchingModels.map((item, index) => ({
        id: this.generateTargetId(item.provider.id, item.model.id),
        provider_id: item.provider.id,
        provider_name: item.provider.name || item.provider.id,
        model_id: item.model.id,
        model_name: item.model.name || item.model.id,
        weight: 1, // Equal weight by default
        priority: index + 1,
        status: 'active' as const
      }));

      // Create the route
      const route: IRoute = {
        id: this.generateRouteId(`${category.name}-route`),
        name: `${category.display_name} Route`,
        category: category.name,
        virtual_model: category.name,
        description: `Auto-generated route for ${category.description.toLowerCase()}`,
        targets,
        load_balancing: {
          type: default_load_balancing,
          config: ROUTES_MANAGER_CONSTANTS.DEFAULT_LOAD_BALANCING_CONFIGS[default_load_balancing].config
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      };

      generatedRoutes.push(route);
      this.routes.set(route.id, route);
    }

    // Save configuration
    await this.saveConfiguration();

    console.log(`✅ [RoutesManager] Generated ${generatedRoutes.length} default routes`);
    return generatedRoutes;
  }

  // Load Balancing Configuration Management
  async updateLoadBalancingConfig(routeId: string, strategy: ILoadBalancingStrategy): Promise<void> {
    const route = this.routes.get(routeId);
    if (!route) {
      throw new Error(ROUTES_MANAGER_CONSTANTS.ERRORS.ROUTE_NOT_FOUND);
    }

    route.load_balancing = strategy;
    route.updated_at = new Date().toISOString();
    
    await this.saveConfiguration();
    
    console.log(`✅ [RoutesManager] Updated load balancing config for route ${routeId}: ${strategy.type}`);
  }

  async getLoadBalancingConfig(routeId: string): Promise<ILoadBalancingStrategy | null> {
    const route = this.routes.get(routeId);
    return route?.load_balancing || null;
  }

  // Configuration Import/Export
  async exportRoutes(): Promise<{
    routes: IRoute[];
    virtual_categories: IVirtualModelCategory[];
    exported_at: string;
    version: string;
  }> {
    return {
      routes: await this.getAll(),
      virtual_categories: await this.getVirtualCategories(),
      exported_at: new Date().toISOString(),
      version: ROUTES_MANAGER_CONSTANTS.IMPORT_EXPORT.VERSION
    };
  }

  async importRoutes(data: {
    routes: IRoute[];
    virtual_categories?: IVirtualModelCategory[];
  }): Promise<{
    imported_routes: number;
    imported_categories: number;
    skipped: number;
    errors: string[];
  }> {
    const result = {
      imported_routes: 0,
      imported_categories: 0,
      skipped: 0,
      errors: []
    };

    // Import virtual categories first
    if (data.virtual_categories) {
      for (const category of data.virtual_categories) {
        try {
          if (this.virtualCategories.has(category.name)) {
            result.skipped++;
            continue;
          }

          this.virtualCategories.set(category.name, category);
          result.imported_categories++;
        } catch (error) {
          result.errors.push(`Failed to import category ${category.name}: ${error}`);
        }
      }
    }

    // Import routes
    for (const route of data.routes) {
      try {
        const validation = await this.validateRoute(route);
        if (!validation.isValid) {
          result.errors.push(`Route ${route.name} validation failed: ${validation.errors.join(', ')}`);
          continue;
        }

        if (this.routes.has(route.id)) {
          result.skipped++;
          continue;
        }

        this.routes.set(route.id, route);
        result.imported_routes++;
      } catch (error) {
        result.errors.push(`Failed to import route ${route.name}: ${error}`);
      }
    }

    // Save configuration
    await this.saveConfiguration();

    console.log(`✅ [RoutesManager] Import completed: ${result.imported_routes} routes, ${result.imported_categories} categories, ${result.skipped} skipped, ${result.errors.length} errors`);
    return result;
  }

  // Validation Methods
  async validateRoute(route: Partial<IRoute>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!route.name || route.name.trim().length === 0) {
      errors.push('Route name is required');
    } else if (route.name.length > ROUTES_MANAGER_CONSTANTS.VALIDATION.ROUTE_NAME_MAX_LENGTH) {
      errors.push(`Route name exceeds maximum length of ${ROUTES_MANAGER_CONSTANTS.VALIDATION.ROUTE_NAME_MAX_LENGTH}`);
    }

    if (!route.category || route.category.trim().length === 0) {
      errors.push('Route category is required');
    }

    if (!route.targets || route.targets.length === 0) {
      errors.push('Route must have at least one target');
    } else if (route.targets.length > ROUTES_MANAGER_CONSTANTS.VALIDATION.MAX_TARGETS_PER_ROUTE) {
      errors.push(`Route exceeds maximum targets limit of ${ROUTES_MANAGER_CONSTANTS.VALIDATION.MAX_TARGETS_PER_ROUTE}`);
    }

    if (!route.load_balancing) {
      errors.push('Route must have load balancing configuration');
    }

    // Validate targets if present
    if (route.targets) {
      for (const target of route.targets) {
        const targetValidation = await this.validateRouteTarget(target);
        if (!targetValidation.isValid) {
          errors.push(...targetValidation.errors.map(err => `Target ${target.id}: ${err}`));
        }
        warnings.push(...targetValidation.warnings.map(warn => `Target ${target.id}: ${warn}`));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateRouteTarget(target: Partial<IRouteTarget>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    provider_available?: boolean;
    model_available?: boolean;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let provider_available = false;
    let model_available = false;

    // Required fields validation
    if (!target.provider_id) {
      errors.push('Target provider_id is required');
    }

    if (!target.model_id) {
      errors.push('Target model_id is required');
    }

    if (target.weight !== undefined) {
      if (target.weight < ROUTES_MANAGER_CONSTANTS.VALIDATION.MIN_WEIGHT || 
          target.weight > ROUTES_MANAGER_CONSTANTS.VALIDATION.MAX_WEIGHT) {
        errors.push(`Target weight must be between ${ROUTES_MANAGER_CONSTANTS.VALIDATION.MIN_WEIGHT} and ${ROUTES_MANAGER_CONSTANTS.VALIDATION.MAX_WEIGHT}`);
      }
    }

    if (target.priority !== undefined) {
      if (target.priority < ROUTES_MANAGER_CONSTANTS.VALIDATION.MIN_PRIORITY || 
          target.priority > ROUTES_MANAGER_CONSTANTS.VALIDATION.MAX_PRIORITY) {
        errors.push(`Target priority must be between ${ROUTES_MANAGER_CONSTANTS.VALIDATION.MIN_PRIORITY} and ${ROUTES_MANAGER_CONSTANTS.VALIDATION.MAX_PRIORITY}`);
      }
    }

    // Check provider availability
    if (target.provider_id) {
      const provider = await this.getProviderById(target.provider_id);
      provider_available = !!provider;
      if (!provider_available) {
        warnings.push(`Provider ${target.provider_id} not found in configuration`);
      }
    }

    // Check model availability
    if (target.provider_id && target.model_id) {
      const model = await this.getModelById(target.provider_id, target.model_id);
      model_available = !!model;
      if (!model_available) {
        warnings.push(`Model ${target.model_id} not found for provider ${target.provider_id}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      provider_available,
      model_available
    };
  }

  // Private Helper Methods
  private loadDefaultVirtualCategories(): void {
    for (const category of ROUTES_MANAGER_CONSTANTS.DEFAULT_VIRTUAL_CATEGORIES) {
      this.virtualCategories.set(category.name, category);
    }
    console.log(`📋 [RoutesManager] Loaded ${ROUTES_MANAGER_CONSTANTS.DEFAULT_VIRTUAL_CATEGORIES.length} default virtual categories`);
  }

  private generateRouteId(name: string): string {
    const timestamp = Date.now();
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim();
    return `route-${sanitized}-${timestamp}`;
  }

  private generateTargetId(providerId: string, modelId: string): string {
    const timestamp = Date.now();
    return `target-${providerId}-${modelId}-${timestamp}`;
  }

  private modelMatchesCriteria(model: IModel, criteria: IModelSelectionCriteria): boolean {
    // Context length requirements
    if (criteria.min_context_length && model.context_length && model.context_length < criteria.min_context_length) {
      return false;
    }

    if (criteria.max_context_length && model.context_length && model.context_length > criteria.max_context_length) {
      return false;
    }

    // Capability requirements
    if (criteria.supports_code && !model.supports_code) {
      return false;
    }

    if (criteria.supports_reasoning && !model.supports_reasoning) {
      return false;
    }

    if (criteria.supports_vision && !model.supports_vision) {
      return false;
    }

    if (criteria.supports_functions && !model.supports_functions) {
      return false;
    }

    // Performance requirements
    if (criteria.max_response_time_ms && model.average_response_time_ms && 
        model.average_response_time_ms > criteria.max_response_time_ms) {
      return false;
    }

    if (criteria.min_success_rate && model.success_rate && model.success_rate < criteria.min_success_rate) {
      return false;
    }

    // Cost considerations
    if (criteria.max_cost_per_token && model.cost_per_token && model.cost_per_token > criteria.max_cost_per_token) {
      return false;
    }

    return true;
  }

  private isModelRouteCompatible(model: IModel): boolean {
    // Basic compatibility check - model should have minimum required properties
    return !!(model.id && model.name && model.context_length && model.context_length >= 128000);
  }

  private async getProviderById(providerId: string): Promise<IProvider | null> {
    if (this.providersManager) {
      try {
        return await this.providersManager.getById(providerId);
      } catch {
        // Fall back to config
      }
    }

    const config = await this.configManager.getConfig();
    return config?.providers?.find(p => p.id === providerId) || null;
  }

  private async getModelById(providerId: string, modelId: string): Promise<IModel | null> {
    const provider = await this.getProviderById(providerId);
    return provider?.models?.find(m => m.id === modelId) || null;
  }

  private async saveConfiguration(): Promise<void> {
    try {
      const config = await this.configManager.getConfig() || {};
      
      // Update routes and virtual categories in config
      config.routes = await this.getAll();
      config.virtual_categories = await this.getVirtualCategories();
      
      await this.configManager.saveConfig(config);
    } catch (error) {
      console.warn('⚠️ [RoutesManager] Failed to save configuration:', error);
    }
  }
}