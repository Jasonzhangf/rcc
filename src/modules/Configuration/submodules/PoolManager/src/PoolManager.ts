/**
 * PoolManager
 * Configuration submodule that handles provider pool operations with deduplication logic
 */

import { BaseModule } from '../../../../core/BaseModule';
import { IConfigurationSubmodule } from '../../interfaces/IConfiguration';
import { IRouteHandler, IApiResponse } from '../../../ApiRouter/interfaces/IApiRouter';
import { IPoolManager, IPoolManagerResponse, IPoolValidation, IPoolMetrics } from '../interfaces/IPoolManager';
import { IConfigManager, IConfigData, IPoolEntry, IProvider, IModel } from '../../submodules/ConfigManager/interfaces/IConfigManager';
import { IDeduplicationCoordinator } from '../../submodules/BlacklistManager/interfaces/IBlacklistManager';
import { POOL_MANAGER_CONSTANTS } from '../constants/PoolManager.constants';

export class PoolManager extends BaseModule implements IConfigurationSubmodule, IRouteHandler, IPoolManager, IPoolValidation, IPoolMetrics {
  
  private configManager: IConfigManager | null = null;
  private configData: IConfigData | null = null;
  private deduplicationCoordinator: IDeduplicationCoordinator | null = null;

  constructor() {
    super();
    this.moduleInfo = {
      id: 'pool-manager',
      name: POOL_MANAGER_CONSTANTS.MODULE_NAME,
      version: POOL_MANAGER_CONSTANTS.MODULE_VERSION,
      description: POOL_MANAGER_CONSTANTS.MODULE_DESCRIPTION,
      type: 'configuration-submodule',
      metadata: {
        routes: [POOL_MANAGER_CONSTANTS.API_ROUTES.POOL],
        capabilities: ['pool_management', 'deduplication', 'api_routing', 'validation', 'metrics'],
        dependencies: ['ConfigManager']
      }
    };
  }

  // BaseModule implementation
  async initialize(data?: any): Promise<void> {
    try {
      if (!data?.configManager) {
        throw new Error(POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.CONFIG_MANAGER_NOT_PROVIDED);
      }

      this.configManager = data.configManager;
      this.configData = await this.configManager.loadConfig();

      // Initialize provider pool array if it doesn't exist
      if (!this.configData.provider_pool) {
        this.configData.provider_pool = [];
      }

      this.isInitialized = true;
      console.log(`✅ ${POOL_MANAGER_CONSTANTS.MODULE_NAME} initialized successfully`);
    } catch (error) {
      const errorMsg = `${POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.INITIALIZATION_FAILED}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }

  async receiveData(data: any): Promise<any> {
    // Handle incoming data for module operations
    return { processed: true };
  }

  async destroy(): Promise<void> {
    this.configManager = null;
    this.configData = null;
    this.deduplicationCoordinator = null;
    this.isInitialized = false;
    console.log(`🧹 ${POOL_MANAGER_CONSTANTS.MODULE_NAME} destroyed`);
  }

  // IConfigurationSubmodule implementation
  async onConfigUpdate(configData: IConfigData): Promise<void> {
    this.configData = configData;
    
    // Initialize provider pool array if it doesn't exist
    if (!this.configData.provider_pool) {
      this.configData.provider_pool = [];
    }

    console.log(`📝 ${POOL_MANAGER_CONSTANTS.MODULE_NAME} received config update`);
  }

  validateConfig(configData: IConfigData): boolean {
    // Validate provider pool structure
    if (configData.provider_pool && !Array.isArray(configData.provider_pool)) {
      return false;
    }

    // Validate each pool entry
    if (configData.provider_pool) {
      for (const entry of configData.provider_pool) {
        if (!this.validatePoolEntry(entry)) {
          return false;
        }
      }
    }

    return true;
  }

  getName(): string {
    return POOL_MANAGER_CONSTANTS.MODULE_NAME;
  }

  setDeduplicationCoordinator(coordinator: IDeduplicationCoordinator): void {
    this.deduplicationCoordinator = coordinator;
  }

  // IRouteHandler implementation
  async handle(pathParts: string[], method: string, body: string): Promise<IApiResponse> {
    try {
      if (!this.isInitialized) {
        return this.createErrorResponse(
          POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.INITIALIZATION_FAILED,
          POOL_MANAGER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
        );
      }

      const [, action] = pathParts; // ['pool', action?]
      
      switch (method) {
        case POOL_MANAGER_CONSTANTS.HTTP_METHODS.GET:
          return await this.handleGetRequest(action);
        
        case POOL_MANAGER_CONSTANTS.HTTP_METHODS.DELETE:
          return await this.handleDeleteRequest(action);
        
        default:
          return this.createErrorResponse(
            POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.METHOD_NOT_ALLOWED,
            POOL_MANAGER_CONSTANTS.STATUS_CODES.METHOD_NOT_ALLOWED
          );
      }
    } catch (error) {
      return this.createErrorResponse(
        `${POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.POOL_OPERATION_FAILED}: ${error.message}`,
        POOL_MANAGER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  // IPoolManager implementation
  async addToProviderPool(providerId: string, modelId: string): Promise<IPoolManagerResponse> {
    try {
      if (!this.configData) {
        throw new Error('Configuration data not loaded');
      }

      const provider = this.findProvider(providerId);
      if (!provider) {
        return this.createResponse(
          false,
          null,
          POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.PROVIDER_NOT_FOUND,
          POOL_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND
        );
      }

      const model = provider.models.find(m => m.id === modelId || m.name === modelId);
      if (!model) {
        return this.createResponse(
          false,
          null,
          POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.MODEL_NOT_FOUND,
          POOL_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND
        );
      }

      // Initialize provider pool
      if (!this.configData.provider_pool) {
        this.configData.provider_pool = [];
      }

      // Create pool entry
      const poolEntry: IPoolEntry = {
        id: `${provider.name}.${model.name}`,
        providerId: provider.id,
        providerName: provider.name,
        modelId: model.id,
        modelName: model.name,
        api_base_url: provider.api_base_url,
        protocol: provider.protocol,
        auth_type: provider.auth_type,
        api_key: provider.api_key, // Keep reference
        model: { ...model },
        added_at: new Date().toISOString(),
        status: POOL_MANAGER_CONSTANTS.POOL_STATUS.ACTIVE
      };

      // CRITICAL DEDUPLICATION LOGIC: Remove from blacklist if exists
      const duplicateKey = `${provider.name}.${model.name}`;
      if (this.deduplicationCoordinator) {
        await this.deduplicationCoordinator.removeFromBlacklist(duplicateKey);
      } else {
        // Fallback to direct removal if coordinator not available
        if (this.configData.model_blacklist) {
          const blacklistIndex = this.configData.model_blacklist.findIndex(b => b.id === duplicateKey);
          if (blacklistIndex !== -1) {
            this.configData.model_blacklist.splice(blacklistIndex, 1);
            console.log(`🔄 Removed ${duplicateKey} from blacklist during pool add operation`);
            
            // Update original model status
            const originalModel = provider.models.find(m => m.id === model.id || m.name === model.name);
            if (originalModel) {
              originalModel.blacklisted = false;
              originalModel.blacklist_reason = null;
              originalModel.status = POOL_MANAGER_CONSTANTS.MODEL_STATUS.ACTIVE;
              originalModel.updated_at = new Date().toISOString();
            }
          }
        }
      }

      // Check for existing entry and update or add
      const existingIndex = this.configData.provider_pool.findIndex(p => p.id === poolEntry.id);
      if (existingIndex !== -1) {
        // Update existing entry
        this.configData.provider_pool[existingIndex] = poolEntry;
      } else {
        // Add new entry
        this.configData.provider_pool.push(poolEntry);
      }

      // Save configuration
      if (this.configManager) {
        await this.configManager.saveConfig(this.configData);
      }

      return this.createResponse(
        true,
        {
          poolEntry,
          totalPoolSize: this.configData.provider_pool.length
        },
        null,
        POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS,
        `${POOL_MANAGER_CONSTANTS.SUCCESS_MESSAGES.MODEL_ADDED_TO_POOL}: ${provider.name}.${model.name}`,
        undefined,
        this.configData.provider_pool.length
      );

    } catch (error) {
      return this.createResponse(
        false,
        null,
        `${POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.POOL_OPERATION_FAILED}: ${error.message}`,
        POOL_MANAGER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  async removeFromPool(modelId: string): Promise<IPoolManagerResponse> {
    try {
      if (!this.configData?.provider_pool) {
        return this.createResponse(
          false,
          null,
          POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.MODEL_NOT_IN_POOL,
          POOL_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND
        );
      }

      const decodedModelId = decodeURIComponent(modelId);
      const poolIndex = this.configData.provider_pool.findIndex(m => m.id === decodedModelId);
      
      if (poolIndex === -1) {
        return this.createResponse(
          false,
          null,
          POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.MODEL_NOT_IN_POOL,
          POOL_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND
        );
      }

      // Remove from pool
      const removedModel = this.configData.provider_pool.splice(poolIndex, 1)[0];

      // Save configuration
      if (this.configManager) {
        await this.configManager.saveConfig(this.configData);
      }

      return this.createResponse(
        true,
        removedModel,
        null,
        POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS,
        `${POOL_MANAGER_CONSTANTS.SUCCESS_MESSAGES.MODEL_REMOVED_FROM_POOL}: ${removedModel.modelName}`,
        undefined,
        this.configData.provider_pool.length
      );

    } catch (error) {
      return this.createResponse(
        false,
        null,
        `${POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.POOL_OPERATION_FAILED}: ${error.message}`,
        POOL_MANAGER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getAllPoolModels(): Promise<IPoolManagerResponse> {
    try {
      const poolModels = this.configData?.provider_pool || [];
      
      return this.createResponse(
        true,
        poolModels,
        null,
        POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS,
        POOL_MANAGER_CONSTANTS.SUCCESS_MESSAGES.POOL_RETRIEVED,
        poolModels.length
      );
    } catch (error) {
      return this.createResponse(
        false,
        null,
        `${POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.POOL_OPERATION_FAILED}: ${error.message}`,
        POOL_MANAGER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getPoolModelsByProvider(): Promise<IPoolManagerResponse> {
    try {
      const poolModels = this.configData?.provider_pool || [];
      const groupedByProvider: Record<string, IPoolEntry[]> = {};
      
      poolModels.forEach(model => {
        const providerId = model.providerId;
        if (!groupedByProvider[providerId]) {
          groupedByProvider[providerId] = [];
        }
        groupedByProvider[providerId].push(model);
      });

      return this.createResponse(
        true,
        groupedByProvider,
        null,
        POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS,
        POOL_MANAGER_CONSTANTS.SUCCESS_MESSAGES.GROUPED_POOL_RETRIEVED
      );
    } catch (error) {
      return this.createResponse(
        false,
        null,
        `${POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.POOL_OPERATION_FAILED}: ${error.message}`,
        POOL_MANAGER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  isModelInPool(modelId: string): boolean {
    if (!this.configData?.provider_pool) {
      return false;
    }

    return this.configData.provider_pool.some(entry => entry.id === modelId);
  }

  getPoolEntry(modelId: string): IPoolEntry | null {
    if (!this.configData?.provider_pool) {
      return null;
    }

    return this.configData.provider_pool.find(entry => entry.id === modelId) || null;
  }

  getPoolSize(): number {
    return this.configData?.provider_pool?.length || 0;
  }

  async onModelBlacklisted(modelId: string): Promise<void> {
    // Handle notification from BlacklistManager about model being blacklisted
    // This triggers deduplication removal from pool
    if (this.isModelInPool(modelId)) {
      console.log(`🔄 Model ${modelId} blacklisted, removing from pool for deduplication`);
      await this.removeFromPool(modelId);
    }
  }

  // IPoolValidation implementation
  validatePoolEntry(entry: IPoolEntry): boolean {
    const requiredFields = POOL_MANAGER_CONSTANTS.VALIDATION.REQUIRED_FIELDS.POOL_ENTRY;
    
    for (const field of requiredFields) {
      if (!entry[field as keyof IPoolEntry]) {
        return false;
      }
    }

    return true;
  }

  async validateModelForPool(providerId: string, modelId: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const provider = this.findProvider(providerId);
      if (!provider) {
        return { valid: false, reason: POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.PROVIDER_NOT_FOUND };
      }

      const model = provider.models.find(m => m.id === modelId || m.name === modelId);
      if (!model) {
        return { valid: false, reason: POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.MODEL_NOT_FOUND };
      }

      // Check if model is blacklisted
      if (model.blacklisted) {
        return { valid: false, reason: 'Model is currently blacklisted' };
      }

      // Check pool size limits
      const currentPoolSize = this.getPoolSize();
      if (currentPoolSize >= POOL_MANAGER_CONSTANTS.PERFORMANCE.MAX_POOL_SIZE) {
        return { valid: false, reason: POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.POOL_SIZE_LIMIT_EXCEEDED };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: `Validation failed: ${error.message}` };
    }
  }

  async validatePoolConstraints(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const poolSize = this.getPoolSize();

    // Check pool size limits
    if (poolSize > POOL_MANAGER_CONSTANTS.PERFORMANCE.MAX_POOL_SIZE) {
      issues.push(`Pool size (${poolSize}) exceeds maximum limit (${POOL_MANAGER_CONSTANTS.PERFORMANCE.MAX_POOL_SIZE})`);
    }

    // Check for duplicate entries
    const poolEntries = this.configData?.provider_pool || [];
    const seenIds = new Set<string>();
    for (const entry of poolEntries) {
      if (seenIds.has(entry.id)) {
        issues.push(`Duplicate pool entry found: ${entry.id}`);
      }
      seenIds.add(entry.id);
    }

    return { valid: issues.length === 0, issues };
  }

  // IPoolMetrics implementation
  getPoolStats(): {
    totalModels: number;
    activeModels: number;
    providersCount: number;
    avgModelsPerProvider: number;
    lastUpdated: string;
  } {
    const poolEntries = this.configData?.provider_pool || [];
    const activeModels = poolEntries.filter(entry => entry.status === POOL_MANAGER_CONSTANTS.POOL_STATUS.ACTIVE).length;
    const providers = new Set(poolEntries.map(entry => entry.providerId));
    
    return {
      totalModels: poolEntries.length,
      activeModels,
      providersCount: providers.size,
      avgModelsPerProvider: providers.size > 0 ? poolEntries.length / providers.size : 0,
      lastUpdated: this.configData?.last_updated || new Date().toISOString()
    };
  }

  getPoolHealth(): { healthy: boolean; issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];
    const stats = this.getPoolStats();

    // Check minimum requirements
    if (stats.totalModels < POOL_MANAGER_CONSTANTS.HEALTH_THRESHOLDS.MIN_POOL_SIZE) {
      issues.push(`Pool size (${stats.totalModels}) is below minimum threshold (${POOL_MANAGER_CONSTANTS.HEALTH_THRESHOLDS.MIN_POOL_SIZE})`);
    }

    if (stats.providersCount < POOL_MANAGER_CONSTANTS.HEALTH_THRESHOLDS.MIN_ACTIVE_PROVIDERS) {
      issues.push(`Active providers (${stats.providersCount}) is below minimum threshold (${POOL_MANAGER_CONSTANTS.HEALTH_THRESHOLDS.MIN_ACTIVE_PROVIDERS})`);
    }

    // Check warning thresholds
    if (stats.totalModels > POOL_MANAGER_CONSTANTS.HEALTH_THRESHOLDS.MAX_POOL_SIZE_WARNING) {
      warnings.push(`Pool size (${stats.totalModels}) is approaching maximum limit`);
    }

    if (stats.avgModelsPerProvider > POOL_MANAGER_CONSTANTS.HEALTH_THRESHOLDS.MAX_MODELS_PER_PROVIDER_WARNING) {
      warnings.push(`Average models per provider (${stats.avgModelsPerProvider.toFixed(1)}) is high`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      warnings
    };
  }

  // Private helper methods
  private async handleGetRequest(action?: string): Promise<IApiResponse> {
    if (!action) {
      // GET /api/pool - Get all pool models
      const result = await this.getAllPoolModels();
      return this.convertToApiResponse(result);
    } else if (action === POOL_MANAGER_CONSTANTS.API_ROUTES.PROVIDERS) {
      // GET /api/pool/providers - Get pool models grouped by provider
      const result = await this.getPoolModelsByProvider();
      return this.convertToApiResponse(result);
    } else if (action === POOL_MANAGER_CONSTANTS.API_ROUTES.STATS) {
      // GET /api/pool/stats - Get pool statistics
      const stats = this.getPoolStats();
      return {
        success: true,
        data: stats,
        statusCode: POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS,
        timestamp: Date.now(),
        message: POOL_MANAGER_CONSTANTS.SUCCESS_MESSAGES.POOL_STATS_RETRIEVED
      };
    } else if (action === POOL_MANAGER_CONSTANTS.API_ROUTES.HEALTH) {
      // GET /api/pool/health - Get pool health status
      const health = this.getPoolHealth();
      return {
        success: true,
        data: health,
        statusCode: POOL_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS,
        timestamp: Date.now(),
        message: POOL_MANAGER_CONSTANTS.SUCCESS_MESSAGES.POOL_HEALTH_RETRIEVED
      };
    }

    return this.createErrorResponse(
      POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.BAD_REQUEST,
      POOL_MANAGER_CONSTANTS.STATUS_CODES.BAD_REQUEST
    );
  }

  private async handleDeleteRequest(action?: string): Promise<IApiResponse> {
    if (action) {
      // DELETE /api/pool/{modelId} - Remove from pool
      const result = await this.removeFromPool(action);
      return this.convertToApiResponse(result);
    }

    return this.createErrorResponse(
      POOL_MANAGER_CONSTANTS.ERROR_MESSAGES.BAD_REQUEST,
      POOL_MANAGER_CONSTANTS.STATUS_CODES.BAD_REQUEST
    );
  }

  private findProvider(providerId: string): IProvider | null {
    if (!this.configData?.providers) {
      return null;
    }

    return this.configData.providers.find(p => p.id === providerId || p.name === providerId) || null;
  }

  private createResponse(
    success: boolean,
    data: any,
    error: string | null,
    statusCode: number,
    message?: string,
    count?: number,
    totalPoolSize?: number
  ): IPoolManagerResponse {
    const response: IPoolManagerResponse = {
      success,
      statusCode,
      timestamp: Date.now()
    };

    if (data !== null) response.data = data;
    if (error) response.error = error;
    if (message) response.message = message;
    if (count !== undefined) response.count = count;
    if (totalPoolSize !== undefined) response.totalPoolSize = totalPoolSize;

    return response;
  }

  private createErrorResponse(error: string, statusCode: number): IApiResponse {
    return {
      success: false,
      error,
      statusCode,
      timestamp: Date.now()
    };
  }

  private convertToApiResponse(result: IPoolManagerResponse): IApiResponse {
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      statusCode: result.statusCode,
      timestamp: result.timestamp,
      message: result.message
    };
  }
}