/**
 * BlacklistManager
 * Configuration submodule that handles model blacklist operations with deduplication logic
 */

import { BaseModule } from '../../../../core/BaseModule';
import { IConfigurationSubmodule } from '../../interfaces/IConfiguration';
import { IRouteHandler, IApiResponse } from '../../../ApiRouter/interfaces/IApiRouter';
import { IBlacklistManager, IBlacklistManagerResponse, IDeduplicationCoordinator } from '../interfaces/IBlacklistManager';
import { IConfigManager, IConfigData, IBlacklistEntry, IProvider, IModel } from '../../submodules/ConfigManager/interfaces/IConfigManager';
import { BLACKLIST_MANAGER_CONSTANTS } from '../constants/BlacklistManager.constants';

export class BlacklistManager extends BaseModule implements IConfigurationSubmodule, IRouteHandler, IBlacklistManager {
  
  private configManager: IConfigManager | null = null;
  private configData: IConfigData | null = null;
  private deduplicationCoordinator: IDeduplicationCoordinator | null = null;

  constructor() {
    super();
    this.moduleInfo = {
      id: 'blacklist-manager',
      name: BLACKLIST_MANAGER_CONSTANTS.MODULE_NAME,
      version: BLACKLIST_MANAGER_CONSTANTS.MODULE_VERSION,
      description: BLACKLIST_MANAGER_CONSTANTS.MODULE_DESCRIPTION,
      type: 'configuration-submodule',
      metadata: {
        routes: [BLACKLIST_MANAGER_CONSTANTS.API_ROUTES.BLACKLIST],
        capabilities: ['blacklist_management', 'deduplication', 'api_routing'],
        dependencies: ['ConfigManager']
      }
    };
  }

  // BaseModule implementation
  async initialize(data?: any): Promise<void> {
    try {
      if (!data?.configManager) {
        throw new Error(BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.CONFIG_MANAGER_NOT_PROVIDED);
      }

      this.configManager = data.configManager;
      this.configData = await this.configManager.loadConfig();

      // Initialize blacklist array if it doesn't exist
      if (!this.configData.model_blacklist) {
        this.configData.model_blacklist = [];
      }

      this.isInitialized = true;
      console.log(`✅ ${BLACKLIST_MANAGER_CONSTANTS.MODULE_NAME} initialized successfully`);
    } catch (error) {
      const errorMsg = `${BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.INITIALIZATION_FAILED}: ${error.message}`;
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
    console.log(`🧹 ${BLACKLIST_MANAGER_CONSTANTS.MODULE_NAME} destroyed`);
  }

  // IConfigurationSubmodule implementation
  async onConfigUpdate(configData: IConfigData): Promise<void> {
    this.configData = configData;
    
    // Initialize blacklist array if it doesn't exist
    if (!this.configData.model_blacklist) {
      this.configData.model_blacklist = [];
    }

    console.log(`📝 ${BLACKLIST_MANAGER_CONSTANTS.MODULE_NAME} received config update`);
  }

  validateConfig(configData: IConfigData): boolean {
    // Validate blacklist structure
    if (configData.model_blacklist && !Array.isArray(configData.model_blacklist)) {
      return false;
    }

    // Validate each blacklist entry
    if (configData.model_blacklist) {
      for (const entry of configData.model_blacklist) {
        if (!entry.id || !entry.providerId || !entry.modelId || !entry.modelName) {
          return false;
        }
      }
    }

    return true;
  }

  getName(): string {
    return BLACKLIST_MANAGER_CONSTANTS.MODULE_NAME;
  }

  setDeduplicationCoordinator(coordinator: IDeduplicationCoordinator): void {
    this.deduplicationCoordinator = coordinator;
  }

  // IRouteHandler implementation
  async handle(pathParts: string[], method: string, body: string): Promise<IApiResponse> {
    try {
      if (!this.isInitialized) {
        return this.createErrorResponse(
          BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.INITIALIZATION_FAILED,
          BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
        );
      }

      const [, action] = pathParts; // ['blacklist', action?]
      
      switch (method) {
        case BLACKLIST_MANAGER_CONSTANTS.HTTP_METHODS.GET:
          return await this.handleGetRequest(action);
        
        case BLACKLIST_MANAGER_CONSTANTS.HTTP_METHODS.DELETE:
          return await this.handleDeleteRequest(action);
        
        default:
          return this.createErrorResponse(
            BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.METHOD_NOT_ALLOWED,
            BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.METHOD_NOT_ALLOWED
          );
      }
    } catch (error) {
      return this.createErrorResponse(
        `${BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.BLACKLIST_OPERATION_FAILED}: ${error.message}`,
        BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  // IBlacklistManager implementation
  async blacklistModel(providerId: string, modelId: string, reason?: string): Promise<IBlacklistManagerResponse> {
    try {
      if (!this.configData) {
        throw new Error('Configuration data not loaded');
      }

      const provider = this.findProvider(providerId);
      if (!provider) {
        return this.createResponse(
          false,
          null,
          BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.PROVIDER_NOT_FOUND,
          BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND
        );
      }

      const modelIndex = provider.models.findIndex(m => m.id === modelId || m.name === modelId);
      if (modelIndex === -1) {
        return this.createResponse(
          false,
          null,
          BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.MODEL_NOT_FOUND,
          BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND
        );
      }

      const model = provider.models[modelIndex];
      const blacklistReason = reason || BLACKLIST_MANAGER_CONSTANTS.DEFAULT_BLACKLIST_REASON;

      // Create blacklist entry
      const blacklistEntry: IBlacklistEntry = {
        id: `${provider.name}.${model.name}`,
        providerId: provider.id,
        providerName: provider.name,
        modelId: model.id,
        modelName: model.name,
        reason: blacklistReason,
        blacklisted_at: new Date().toISOString(),
        original_model: { ...model }
      };

      // CRITICAL DEDUPLICATION LOGIC: Remove from pool if exists
      if (this.deduplicationCoordinator) {
        await this.deduplicationCoordinator.removeFromPool(blacklistEntry.id);
      } else {
        // Fallback to direct removal if coordinator not available
        if (this.configData.provider_pool) {
          const poolIndex = this.configData.provider_pool.findIndex(p => p.id === blacklistEntry.id);
          if (poolIndex !== -1) {
            this.configData.provider_pool.splice(poolIndex, 1);
            console.log(`🔄 Removed ${blacklistEntry.id} from pool during blacklist operation`);
          }
        }
      }

      // Add to blacklist
      if (!this.configData.model_blacklist) {
        this.configData.model_blacklist = [];
      }
      this.configData.model_blacklist.push(blacklistEntry);

      // Update original model status
      provider.models[modelIndex].blacklisted = true;
      provider.models[modelIndex].blacklist_reason = blacklistReason;
      provider.models[modelIndex].status = BLACKLIST_MANAGER_CONSTANTS.MODEL_STATUS.BLACKLISTED;
      provider.models[modelIndex].updated_at = new Date().toISOString();

      // Save configuration
      if (this.configManager) {
        await this.configManager.saveConfig(this.configData);
      }

      return this.createResponse(
        true,
        {
          model: model.name,
          provider: provider.name,
          reason: blacklistReason,
          blacklistId: blacklistEntry.id
        },
        null,
        BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS,
        `${BLACKLIST_MANAGER_CONSTANTS.SUCCESS_MESSAGES.MODEL_BLACKLISTED}: ${model.name}`
      );

    } catch (error) {
      return this.createResponse(
        false,
        null,
        `${BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.BLACKLIST_OPERATION_FAILED}: ${error.message}`,
        BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  async removeFromBlacklist(modelId: string): Promise<IBlacklistManagerResponse> {
    try {
      if (!this.configData?.model_blacklist) {
        return this.createResponse(
          false,
          null,
          BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.MODEL_NOT_IN_BLACKLIST,
          BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND
        );
      }

      const decodedModelId = decodeURIComponent(modelId);
      const blacklistIndex = this.configData.model_blacklist.findIndex(m => m.id === decodedModelId);
      
      if (blacklistIndex === -1) {
        return this.createResponse(
          false,
          null,
          BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.MODEL_NOT_IN_BLACKLIST,
          BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.NOT_FOUND
        );
      }

      // Remove from blacklist
      const removedModel = this.configData.model_blacklist.splice(blacklistIndex, 1)[0];

      // Update original model status in provider
      const provider = this.findProviderById(removedModel.providerId);
      if (provider) {
        const model = provider.models.find(m => m.id === removedModel.modelId);
        if (model) {
          model.blacklisted = false;
          model.blacklist_reason = null;
          model.status = BLACKLIST_MANAGER_CONSTANTS.MODEL_STATUS.ACTIVE;
          model.updated_at = new Date().toISOString();
        }
      }

      // Save configuration
      if (this.configManager) {
        await this.configManager.saveConfig(this.configData);
      }

      return this.createResponse(
        true,
        removedModel,
        null,
        BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS,
        `${BLACKLIST_MANAGER_CONSTANTS.SUCCESS_MESSAGES.MODEL_REMOVED_FROM_BLACKLIST}: ${removedModel.modelName}`
      );

    } catch (error) {
      return this.createResponse(
        false,
        null,
        `${BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.BLACKLIST_OPERATION_FAILED}: ${error.message}`,
        BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getAllBlacklistedModels(): Promise<IBlacklistManagerResponse> {
    try {
      const blacklistModels = this.configData?.model_blacklist || [];
      
      return this.createResponse(
        true,
        blacklistModels,
        null,
        BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS,
        BLACKLIST_MANAGER_CONSTANTS.SUCCESS_MESSAGES.BLACKLIST_RETRIEVED,
        blacklistModels.length
      );
    } catch (error) {
      return this.createResponse(
        false,
        null,
        `${BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.BLACKLIST_OPERATION_FAILED}: ${error.message}`,
        BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getBlacklistedModelsByProvider(): Promise<IBlacklistManagerResponse> {
    try {
      const blacklistModels = this.configData?.model_blacklist || [];
      const groupedByProvider: Record<string, IBlacklistEntry[]> = {};
      
      blacklistModels.forEach(model => {
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
        BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.SUCCESS,
        BLACKLIST_MANAGER_CONSTANTS.SUCCESS_MESSAGES.GROUPED_BLACKLIST_RETRIEVED
      );
    } catch (error) {
      return this.createResponse(
        false,
        null,
        `${BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.BLACKLIST_OPERATION_FAILED}: ${error.message}`,
        BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  isModelBlacklisted(modelId: string): boolean {
    if (!this.configData?.model_blacklist) {
      return false;
    }

    return this.configData.model_blacklist.some(entry => entry.id === modelId);
  }

  getBlacklistEntry(modelId: string): IBlacklistEntry | null {
    if (!this.configData?.model_blacklist) {
      return null;
    }

    return this.configData.model_blacklist.find(entry => entry.id === modelId) || null;
  }

  async onModelAddedToPool(modelId: string): Promise<void> {
    // Handle notification from PoolManager about model being added to pool
    // This triggers deduplication removal from blacklist
    if (this.isModelBlacklisted(modelId)) {
      console.log(`🔄 Model ${modelId} added to pool, removing from blacklist for deduplication`);
      await this.removeFromBlacklist(modelId);
    }
  }

  // Private helper methods
  private async handleGetRequest(action?: string): Promise<IApiResponse> {
    if (!action) {
      // GET /api/blacklist - Get all blacklisted models
      const result = await this.getAllBlacklistedModels();
      return this.convertToApiResponse(result);
    } else if (action === BLACKLIST_MANAGER_CONSTANTS.API_ROUTES.PROVIDERS) {
      // GET /api/blacklist/providers - Get blacklisted models grouped by provider
      const result = await this.getBlacklistedModelsByProvider();
      return this.convertToApiResponse(result);
    }

    return this.createErrorResponse(
      BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.BAD_REQUEST,
      BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.BAD_REQUEST
    );
  }

  private async handleDeleteRequest(action?: string): Promise<IApiResponse> {
    if (action) {
      // DELETE /api/blacklist/{modelId} - Remove from blacklist
      const result = await this.removeFromBlacklist(action);
      return this.convertToApiResponse(result);
    }

    return this.createErrorResponse(
      BLACKLIST_MANAGER_CONSTANTS.ERROR_MESSAGES.BAD_REQUEST,
      BLACKLIST_MANAGER_CONSTANTS.STATUS_CODES.BAD_REQUEST
    );
  }

  private findProvider(providerId: string): IProvider | null {
    if (!this.configData?.providers) {
      return null;
    }

    return this.configData.providers.find(p => p.id === providerId || p.name === providerId) || null;
  }

  private findProviderById(providerId: string): IProvider | null {
    if (!this.configData?.providers) {
      return null;
    }

    return this.configData.providers.find(p => p.id === providerId) || null;
  }

  private createResponse(
    success: boolean,
    data: any,
    error: string | null,
    statusCode: number,
    message?: string,
    count?: number
  ): IBlacklistManagerResponse {
    const response: IBlacklistManagerResponse = {
      success,
      statusCode,
      timestamp: Date.now()
    };

    if (data !== null) response.data = data;
    if (error) response.error = error;
    if (message) response.message = message;
    if (count !== undefined) response.count = count;

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

  private convertToApiResponse(result: IBlacklistManagerResponse): IApiResponse {
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