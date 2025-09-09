/**
 * ProvidersManager - Configuration Submodule
 * Handles all provider-related operations including CRUD, testing, and model management
 * Extracted from monolithic server for better modularity and API isolation
 */

import { BaseModule } from '../../../../core/BaseModule';
import { ModuleInfo } from '../../../../interfaces/ModuleInfo';
import { IRouteHandler, IApiResponse } from '../../../ApiRouter/interfaces/IApiRouter';
import { IConfigurationSubmodule } from '../../interfaces/IConfiguration';
import { 
  IConfigManager, 
  IConfigData, 
  IProvider, 
  IModel,
  IBlacklistEntry,
  IPoolEntry
} from '../../ConfigManager/interfaces/IConfigManager';
import {
  IProvidersManager,
  IProviderInput,
  IProviderTestOptions,
  IModelFetchOptions,
  IModelVerificationInput,
  ITokenDetectionInput,
  IModelBlacklistInput,
  IProviderPoolInput,
  IProvidersManagerResponse,
  IProviderTestResult,
  IProviderValidationResult,
  IApiTestResult
} from '../interfaces/IProvidersManager';
import { 
  PROVIDERS_MANAGER_CONSTANTS, 
  ProviderProtocol, 
  AuthType 
} from '../constants/ProvidersManager.constants';

export class ProvidersManager extends BaseModule implements IConfigurationSubmodule, IRouteHandler, IProvidersManager {
  private configManager: IConfigManager | null = null;
  private currentConfig: IConfigData | null = null;
  private nextId: number = 1;

  constructor(info: ModuleInfo) {
    super(info);
  }

  // IConfigurationSubmodule implementation
  async initialize(configManager: IConfigManager): Promise<void> {
    try {
      this.configManager = configManager;
      this.currentConfig = await configManager.loadConfig();
      
      // Initialize next ID based on existing providers
      this.initializeNextId();
      
      console.log(`${PROVIDERS_MANAGER_CONSTANTS.LOG_PREFIX} ${PROVIDERS_MANAGER_CONSTANTS.SUCCESS.INITIALIZATION_COMPLETE}`);
    } catch (error) {
      console.error(`${PROVIDERS_MANAGER_CONSTANTS.LOG_PREFIX} Initialization failed:`, error);
      throw error;
    }
  }

  async onConfigUpdate(configData: IConfigData): Promise<void> {
    this.currentConfig = configData;
    this.initializeNextId();
  }

  validateConfig(configData: IConfigData): boolean {
    if (!configData.providers || !Array.isArray(configData.providers)) {
      return false;
    }

    for (const provider of configData.providers) {
      const validation = this.validateProviderData(provider);
      if (!validation.valid) {
        return false;
      }
    }

    return true;
  }

  getName(): string {
    return PROVIDERS_MANAGER_CONSTANTS.MODULE_NAME;
  }

  async destroy(): Promise<void> {
    this.configManager = null;
    this.currentConfig = null;
    this.nextId = 1;
    await super.destroy();
  }

  // IRouteHandler implementation
  async handle(pathParts: string[], method: string, body: string): Promise<IApiResponse> {
    const [, providerId, action] = pathParts; // ['providers', id?, action?]
    
    console.log(`${PROVIDERS_MANAGER_CONSTANTS.LOG_PREFIX} Processing API request:`, {
      pathParts,
      method,
      providerId,
      action
    });

    // URL decode providerId for special characters and spaces
    const decodedProviderId = providerId ? decodeURIComponent(providerId) : null;

    try {
      switch (method) {
        case 'GET':
          if (!providerId) {
            // GET /api/providers - Get all providers
            const providers = await this.getProviders();
            return this.createApiResponse(true, providers);
          } else {
            // GET /api/providers/:id - Get specific provider
            const provider = await this.getProvider(decodedProviderId);
            if (provider) {
              return this.createApiResponse(true, provider);
            } else {
              return this.createApiResponse(
                false, 
                null, 
                PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND, 
                PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
              );
            }
          }

        case 'POST':
          if (!providerId) {
            // POST /api/providers - Add new provider
            return await this.handleAddProvider(body);
          } else if (action === 'test') {
            // POST /api/providers/:id/test - Test provider
            return await this.handleTestProvider(decodedProviderId, body);
          } else if (action === 'models') {
            // POST /api/providers/:id/models - Get provider models
            return await this.handleGetProviderModels(decodedProviderId, body);
          } else if (action === 'verify-model') {
            // POST /api/providers/:id/verify-model - Verify single model
            return await this.handleVerifyProviderModel(decodedProviderId, body);
          } else if (action === 'detect-tokens') {
            // POST /api/providers/:id/detect-tokens - Auto-detect model max_tokens
            return await this.handleDetectModelTokens(decodedProviderId, body);
          } else if (action === 'blacklist-model') {
            // POST /api/providers/:id/blacklist-model - Blacklist model
            return await this.handleBlacklistModel(decodedProviderId, body);
          } else if (action === 'add-to-pool') {
            // POST /api/providers/:id/add-to-pool - Add provider.model to pool
            return await this.handleAddToProviderPool(decodedProviderId, body);
          }
          break;

        case 'PUT':
          if (decodedProviderId) {
            // PUT /api/providers/:id - Update provider
            return await this.handleUpdateProvider(decodedProviderId, body);
          }
          break;

        case 'DELETE':
          if (decodedProviderId) {
            // DELETE /api/providers/:id - Delete provider
            return await this.handleDeleteProvider(decodedProviderId);
          }
          break;

        default:
          return this.createApiResponse(
            false,
            null,
            'Method not allowed',
            PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.METHOD_NOT_ALLOWED
          );
      }

      return this.createApiResponse(
        false,
        null,
        'Bad request',
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST
      );

    } catch (error) {
      console.error(`${PROVIDERS_MANAGER_CONSTANTS.LOG_PREFIX} API handler error:`, error);
      return this.createApiResponse(
        false,
        null,
        `Internal server error: ${error.message}`,
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  // IProvidersManager implementation
  async addProvider(providerData: IProviderInput): Promise<IProvidersManagerResponse> {
    try {
      const validation = this.validateProviderData(providerData);
      if (!validation.valid) {
        return this.createResponse(false, null, validation.error, PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      // Check for name conflicts
      const existingProvider = this.currentConfig?.providers.find(p => p.name === providerData.name);
      if (existingProvider) {
        return this.createResponse(
          false, 
          null, 
          PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NAME_EXISTS, 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.CONFLICT
        );
      }

      // Create new provider
      const newProvider: IProvider = {
        id: `${PROVIDERS_MANAGER_CONSTANTS.ID_GENERATION.PREFIX}${this.nextId++}`,
        name: providerData.name,
        protocol: providerData.protocol,
        api_base_url: providerData.api_base_url,
        api_key: this.processApiKeys(providerData.api_key),
        auth_type: providerData.auth_type || 'api_key',
        models: providerData.models || []
      };

      // Add to config
      if (this.currentConfig) {
        this.currentConfig.providers.push(newProvider);
        await this.saveConfig();
      }

      console.log(`${PROVIDERS_MANAGER_CONSTANTS.LOG_PREFIX} Added provider: ${newProvider.name}`);
      return this.createResponse(true, newProvider, PROVIDERS_MANAGER_CONSTANTS.SUCCESS.PROVIDER_ADDED);

    } catch (error) {
      return this.createResponse(
        false, 
        null, 
        `${PROVIDERS_MANAGER_CONSTANTS.ERRORS.VALIDATION_FAILED}: ${error.message}`, 
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateProvider(providerId: string, providerData: IProviderInput): Promise<IProvidersManagerResponse> {
    try {
      const providerIndex = this.findProviderIndex(providerId);
      if (providerIndex === -1) {
        return this.createResponse(
          false, 
          null, 
          PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND, 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      const validation = this.validateProviderData(providerData, providerId);
      if (!validation.valid) {
        return this.createResponse(false, null, validation.error, PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      // Check for name conflicts (excluding current provider)
      const currentProvider = this.currentConfig!.providers[providerIndex];
      const existingProvider = this.currentConfig?.providers.find(
        p => p.name === providerData.name && p.id !== currentProvider.id
      );
      if (existingProvider) {
        return this.createResponse(
          false, 
          null, 
          PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NAME_EXISTS, 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.CONFLICT
        );
      }

      // Update provider
      const updatedProvider: IProvider = {
        ...currentProvider,
        name: providerData.name,
        protocol: providerData.protocol,
        api_base_url: providerData.api_base_url,
        api_key: this.processApiKeys(providerData.api_key),
        auth_type: providerData.auth_type || 'api_key',
        models: providerData.models || currentProvider.models || []
      };

      this.currentConfig!.providers[providerIndex] = updatedProvider;
      await this.saveConfig();

      console.log(`${PROVIDERS_MANAGER_CONSTANTS.LOG_PREFIX} Updated provider: ${updatedProvider.name}`);
      return this.createResponse(true, updatedProvider, PROVIDERS_MANAGER_CONSTANTS.SUCCESS.PROVIDER_UPDATED);

    } catch (error) {
      return this.createResponse(
        false, 
        null, 
        `${PROVIDERS_MANAGER_CONSTANTS.ERRORS.VALIDATION_FAILED}: ${error.message}`, 
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deleteProvider(providerId: string): Promise<IProvidersManagerResponse> {
    try {
      const providerIndex = this.findProviderIndex(providerId);
      if (providerIndex === -1) {
        return this.createResponse(
          false, 
          null, 
          PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND, 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      const deletedProvider = this.currentConfig!.providers.splice(providerIndex, 1)[0];
      await this.saveConfig();

      console.log(`${PROVIDERS_MANAGER_CONSTANTS.LOG_PREFIX} Deleted provider: ${deletedProvider.name}`);
      return this.createResponse(true, { id: providerId }, PROVIDERS_MANAGER_CONSTANTS.SUCCESS.PROVIDER_DELETED);

    } catch (error) {
      return this.createResponse(
        false, 
        null, 
        `Delete failed: ${error.message}`, 
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getProviders(): Promise<IProvider[]> {
    return this.currentConfig?.providers || [];
  }

  async getProvider(providerId: string): Promise<IProvider | null> {
    const providers = await this.getProviders();
    return providers.find(p => p.id === providerId || p.name === providerId) || null;
  }

  async testProvider(providerId: string, testOptions: IProviderTestOptions): Promise<IProvidersManagerResponse> {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) {
        return this.createResponse(
          false, 
          null, 
          PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND, 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      const testResults: IProviderTestResult[] = [];
      const keysToTest = testOptions.testAllKeys ? 
        (Array.isArray(provider.api_key) ? provider.api_key : [provider.api_key]) : 
        [testOptions.api_key].filter(Boolean);

      for (const key of keysToTest) {
        if (!key || key.trim() === '') {
          continue;
        }

        const result = await this.performRealApiTest(provider, key);
        testResults.push({
          api_key: key.substring(0, 8) + '...',
          success: result.success,
          statusCode: result.statusCode,
          responseTime: result.responseTime,
          message: result.message,
          timestamp: Date.now(),
          models: result.models || []
        });
      }

      console.log(`${PROVIDERS_MANAGER_CONSTANTS.LOG_PREFIX} Tested ${testResults.length} keys for provider: ${provider.name}`);

      return this.createResponse(true, {
        provider: provider.name,
        testResults: testResults,
        summary: {
          total: testResults.length,
          successful: testResults.filter(r => r.success).length,
          failed: testResults.filter(r => !r.success).length
        }
      }, PROVIDERS_MANAGER_CONSTANTS.SUCCESS.PROVIDER_TESTED);

    } catch (error) {
      return this.createResponse(
        false, 
        null, 
        `${PROVIDERS_MANAGER_CONSTANTS.ERRORS.TEST_FAILED}: ${error.message}`, 
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getProviderModels(providerId: string, options?: IModelFetchOptions): Promise<IProvidersManagerResponse> {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) {
        return this.createResponse(
          false, 
          null, 
          PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND, 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      // Select a valid API key for testing
      const keys = Array.isArray(provider.api_key) ? provider.api_key : [provider.api_key];
      const validKey = options?.api_key || keys.find(key => key && key.trim() !== '') || keys[0];

      if (!validKey) {
        return this.createResponse(
          false, 
          null, 
          'No API key configured for this provider', 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      console.log(`${PROVIDERS_MANAGER_CONSTANTS.LOG_PREFIX} Fetching models for provider: ${provider.name}`);

      // Execute API call to get model list
      const result = await this.performRealApiTest(provider, validKey);

      if (result.success && result.models && result.models.length > 0) {
        // Update provider's model list
        const providerIndex = this.findProviderIndex(providerId);
        
        if (providerIndex !== -1) {
          const models = result.models.map(modelId => this.createModelObject(modelId));
          this.currentConfig!.providers[providerIndex].models = models;
          await this.saveConfig();
          
          console.log(`${PROVIDERS_MANAGER_CONSTANTS.LOG_PREFIX} Updated models for provider: ${provider.name} (${models.length} models)`);
        }

        return this.createResponse(true, {
          provider: provider.name,
          models: result.models,
          count: result.models.length,
          updated: true
        }, `Found ${result.models.length} models`);
      } else if (result.statusCode === 404) {
        // Handle APIs that don't support model listing
        const fallbackModels = this.generateFallbackModels(provider);
        
        if (!provider.models || provider.models.length === 0) {
          const providerIndex = this.findProviderIndex(providerId);
          
          if (providerIndex !== -1) {
            this.currentConfig!.providers[providerIndex].models = fallbackModels;
            await this.saveConfig();
          }
        }

        return this.createResponse(false, {
          provider: provider.name,
          models: provider.models || fallbackModels,
          count: provider.models?.length || fallbackModels.length,
          updated: false,
          fallback: true,
          reason: 'API endpoint not supported'
        }, `This API provider doesn't support model listing. Using ${provider.models?.length || fallbackModels.length} configured models.`);
      } else {
        return this.createResponse(
          false, 
          null, 
          result.message || PROVIDERS_MANAGER_CONSTANTS.ERRORS.MODELS_FETCH_FAILED, 
          result.statusCode || PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    } catch (error) {
      return this.createResponse(
        false, 
        null, 
        `${PROVIDERS_MANAGER_CONSTANTS.ERRORS.MODELS_FETCH_FAILED}: ${error.message}`, 
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  async verifyProviderModel(providerId: string, modelData: IModelVerificationInput): Promise<IProvidersManagerResponse> {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) {
        return this.createResponse(
          false, 
          null, 
          PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND, 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      const model = provider.models.find(m => m.id === modelData.modelId || m.name === modelData.modelId);
      if (!model) {
        return this.createResponse(
          false, 
          null, 
          'Model not found in provider', 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      // Select a valid API key
      const keys = Array.isArray(provider.api_key) ? provider.api_key : [provider.api_key];
      const validKey = modelData.api_key || keys.find(key => key && key.trim() !== '') || keys[0];

      if (!validKey) {
        return this.createResponse(
          false, 
          null, 
          'No API key configured for this provider', 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Perform model verification via actual API call
      const verificationResult = await this.performModelVerification(provider, model, validKey);
      
      // Update model verification status
      const providerIndex = this.findProviderIndex(providerId);
      if (providerIndex !== -1) {
        const modelIndex = this.currentConfig!.providers[providerIndex].models.findIndex(
          m => m.id === modelData.modelId || m.name === modelData.modelId
        );
        
        if (modelIndex !== -1) {
          this.currentConfig!.providers[providerIndex].models[modelIndex].verified = verificationResult.success;
          this.currentConfig!.providers[providerIndex].models[modelIndex].last_verification = new Date().toISOString();
          this.currentConfig!.providers[providerIndex].models[modelIndex].status = verificationResult.success ? 'verified' : 'failed';
          await this.saveConfig();
        }
      }

      return this.createResponse(verificationResult.success, {
        provider: provider.name,
        model: model.name,
        verified: verificationResult.success,
        message: verificationResult.message,
        responseTime: verificationResult.responseTime,
        timestamp: Date.now()
      }, verificationResult.message);

    } catch (error) {
      return this.createResponse(
        false, 
        null, 
        `${PROVIDERS_MANAGER_CONSTANTS.ERRORS.MODEL_VERIFICATION_FAILED}: ${error.message}`, 
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  async detectModelTokens(providerId: string, modelData: ITokenDetectionInput): Promise<IProvidersManagerResponse> {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) {
        return this.createResponse(
          false, 
          null, 
          PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND, 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      const model = provider.models.find(m => m.id === modelData.modelId || m.name === modelData.modelId);
      if (!model) {
        return this.createResponse(
          false, 
          null, 
          'Model not found in provider', 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      // Select a valid API key
      const keys = Array.isArray(provider.api_key) ? provider.api_key : [provider.api_key];
      const validKey = modelData.api_key || keys.find(key => key && key.trim() !== '') || keys[0];

      if (!validKey) {
        return this.createResponse(
          false, 
          null, 
          'No API key configured for this provider', 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Perform token detection
      const detectionResult = await this.performTokenDetection(provider, model, validKey, modelData.testPrompt);
      
      // Update model with detected tokens
      if (detectionResult.success && detectionResult.detectedTokens) {
        const providerIndex = this.findProviderIndex(providerId);
        if (providerIndex !== -1) {
          const modelIndex = this.currentConfig!.providers[providerIndex].models.findIndex(
            m => m.id === modelData.modelId || m.name === modelData.modelId
          );
          
          if (modelIndex !== -1) {
            this.currentConfig!.providers[providerIndex].models[modelIndex].auto_detected_tokens = detectionResult.detectedTokens;
            this.currentConfig!.providers[providerIndex].models[modelIndex].updated_at = new Date().toISOString();
            await this.saveConfig();
          }
        }
      }

      return this.createResponse(detectionResult.success, {
        provider: provider.name,
        model: model.name,
        detectedTokens: detectionResult.detectedTokens,
        message: detectionResult.message,
        attempts: detectionResult.attempts,
        timestamp: Date.now()
      }, detectionResult.message);

    } catch (error) {
      return this.createResponse(
        false, 
        null, 
        `${PROVIDERS_MANAGER_CONSTANTS.ERRORS.TOKEN_DETECTION_FAILED}: ${error.message}`, 
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  async blacklistModel(providerId: string, modelData: IModelBlacklistInput): Promise<IProvidersManagerResponse> {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) {
        return this.createResponse(
          false, 
          null, 
          PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND, 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      const modelIndex = provider.models.findIndex(m => m.id === modelData.modelId || m.name === modelData.modelId);
      if (modelIndex === -1) {
        return this.createResponse(
          false, 
          null, 
          'Model not found in provider', 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      const model = provider.models[modelIndex];
      
      // Add model to blacklist
      if (!this.currentConfig!.model_blacklist) {
        this.currentConfig!.model_blacklist = [];
      }

      const blacklistEntry = {
        id: `blacklist-${Date.now()}`,
        providerId: provider.id,
        providerName: provider.name,
        modelId: model.id,
        modelName: model.name,
        reason: modelData.reason || PROVIDERS_MANAGER_CONSTANTS.BLACKLIST.DEFAULT_REASON,
        blacklisted_at: new Date().toISOString(),
        original_model: { ...model }
      };

      this.currentConfig!.model_blacklist.push(blacklistEntry);

      // Update model status in provider
      const providerIndex = this.findProviderIndex(providerId);
      if (providerIndex !== -1) {
        this.currentConfig!.providers[providerIndex].models[modelIndex].blacklisted = true;
        this.currentConfig!.providers[providerIndex].models[modelIndex].blacklist_reason = modelData.reason;
        this.currentConfig!.providers[providerIndex].models[modelIndex].updated_at = new Date().toISOString();
      }

      await this.saveConfig();

      console.log(`${PROVIDERS_MANAGER_CONSTANTS.LOG_PREFIX} Blacklisted model: ${model.name} from provider: ${provider.name}`);

      return this.createResponse(true, {
        blacklistEntry,
        provider: provider.name,
        model: model.name,
        reason: modelData.reason
      }, PROVIDERS_MANAGER_CONSTANTS.SUCCESS.MODEL_BLACKLISTED);

    } catch (error) {
      return this.createResponse(
        false, 
        null, 
        `${PROVIDERS_MANAGER_CONSTANTS.ERRORS.BLACKLIST_FAILED}: ${error.message}`, 
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  async addToProviderPool(providerId: string, poolData: IProviderPoolInput): Promise<IProvidersManagerResponse> {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) {
        return this.createResponse(
          false, 
          null, 
          PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND, 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      const model = provider.models.find(m => m.id === poolData.modelId || m.name === poolData.modelId);
      if (!model) {
        return this.createResponse(
          false, 
          null, 
          'Model not found in provider', 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND
        );
      }

      // Initialize provider_pool if it doesn't exist
      if (!this.currentConfig!.provider_pool) {
        this.currentConfig!.provider_pool = [];
      }

      // Check if this provider.model combination already exists in pool
      const existingEntry = this.currentConfig!.provider_pool.find(
        entry => entry.providerId === provider.id && entry.modelId === model.id
      );

      if (existingEntry) {
        return this.createResponse(
          false, 
          null, 
          'This provider-model combination is already in the pool', 
          PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.CONFLICT
        );
      }

      const poolEntry = {
        id: `pool-${Date.now()}`,
        providerId: provider.id,
        providerName: provider.name,
        modelId: model.id,
        modelName: model.name,
        api_base_url: provider.api_base_url,
        protocol: provider.protocol,
        auth_type: provider.auth_type,
        api_key: provider.api_key,
        model: { ...model },
        added_at: new Date().toISOString(),
        status: 'active'
      };

      this.currentConfig!.provider_pool.push(poolEntry);
      await this.saveConfig();

      console.log(`${PROVIDERS_MANAGER_CONSTANTS.LOG_PREFIX} Added to provider pool: ${model.name} from ${provider.name}`);

      return this.createResponse(true, {
        poolEntry,
        provider: provider.name,
        model: model.name,
        poolSize: this.currentConfig!.provider_pool.length
      }, PROVIDERS_MANAGER_CONSTANTS.SUCCESS.ADDED_TO_POOL);

    } catch (error) {
      return this.createResponse(
        false, 
        null, 
        `${PROVIDERS_MANAGER_CONSTANTS.ERRORS.POOL_ADDITION_FAILED}: ${error.message}`, 
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Private helper methods
  private async handleAddProvider(body: string): Promise<IApiResponse> {
    try {
      const data = JSON.parse(body || '{}');
      const result = await this.addProvider(data);
      return this.convertToApiResponse(result);
    } catch (error) {
      return this.createApiResponse(
        false,
        null,
        PROVIDERS_MANAGER_CONSTANTS.ERRORS.INVALID_JSON,
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  private async handleTestProvider(providerId: string, body: string): Promise<IApiResponse> {
    try {
      const data = JSON.parse(body || '{}');
      const result = await this.testProvider(providerId, data);
      return this.convertToApiResponse(result);
    } catch (error) {
      return this.createApiResponse(
        false,
        null,
        PROVIDERS_MANAGER_CONSTANTS.ERRORS.INVALID_JSON,
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  private async handleGetProviderModels(providerId: string, body: string): Promise<IApiResponse> {
    try {
      const data = JSON.parse(body || '{}');
      const result = await this.getProviderModels(providerId, data);
      return this.convertToApiResponse(result);
    } catch (error) {
      return this.createApiResponse(
        false,
        null,
        PROVIDERS_MANAGER_CONSTANTS.ERRORS.INVALID_JSON,
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  private async handleVerifyProviderModel(providerId: string, body: string): Promise<IApiResponse> {
    try {
      const data = JSON.parse(body || '{}');
      const result = await this.verifyProviderModel(providerId, data);
      return this.convertToApiResponse(result);
    } catch (error) {
      return this.createApiResponse(
        false,
        null,
        PROVIDERS_MANAGER_CONSTANTS.ERRORS.INVALID_JSON,
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  private async handleDetectModelTokens(providerId: string, body: string): Promise<IApiResponse> {
    try {
      const data = JSON.parse(body || '{}');
      const result = await this.detectModelTokens(providerId, data);
      return this.convertToApiResponse(result);
    } catch (error) {
      return this.createApiResponse(
        false,
        null,
        PROVIDERS_MANAGER_CONSTANTS.ERRORS.INVALID_JSON,
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  private async handleBlacklistModel(providerId: string, body: string): Promise<IApiResponse> {
    try {
      const data = JSON.parse(body || '{}');
      const result = await this.blacklistModel(providerId, data);
      return this.convertToApiResponse(result);
    } catch (error) {
      return this.createApiResponse(
        false,
        null,
        PROVIDERS_MANAGER_CONSTANTS.ERRORS.INVALID_JSON,
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  private async handleAddToProviderPool(providerId: string, body: string): Promise<IApiResponse> {
    try {
      const data = JSON.parse(body || '{}');
      const result = await this.addToProviderPool(providerId, data);
      return this.convertToApiResponse(result);
    } catch (error) {
      return this.createApiResponse(
        false,
        null,
        PROVIDERS_MANAGER_CONSTANTS.ERRORS.INVALID_JSON,
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  private async handleUpdateProvider(providerId: string, body: string): Promise<IApiResponse> {
    try {
      const data = JSON.parse(body || '{}');
      const result = await this.updateProvider(providerId, data);
      return this.convertToApiResponse(result);
    } catch (error) {
      return this.createApiResponse(
        false,
        null,
        PROVIDERS_MANAGER_CONSTANTS.ERRORS.INVALID_JSON,
        PROVIDERS_MANAGER_CONSTANTS.HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  private async handleDeleteProvider(providerId: string): Promise<IApiResponse> {
    const result = await this.deleteProvider(providerId);
    return this.convertToApiResponse(result);
  }

  private validateProviderData(data: IProviderInput, excludeId?: string): IProviderValidationResult {
    const errors: string[] = [];

    // Name validation
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push(PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NAME_REQUIRED);
    }

    // Protocol validation
    if (!data.protocol || !PROVIDERS_MANAGER_CONSTANTS.VALIDATION.SUPPORTED_PROTOCOLS.includes(data.protocol as ProviderProtocol)) {
      errors.push(PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROTOCOL_REQUIRED);
    }

    // API Base URL validation
    if (!data.api_base_url || typeof data.api_base_url !== 'string' || data.api_base_url.trim() === '') {
      errors.push(PROVIDERS_MANAGER_CONSTANTS.ERRORS.API_BASE_URL_REQUIRED);
    } else {
      try {
        new URL(data.api_base_url);
      } catch {
        errors.push(PROVIDERS_MANAGER_CONSTANTS.ERRORS.API_BASE_URL_REQUIRED);
      }
    }

    // API Key validation
    if (!data.api_key || (Array.isArray(data.api_key) && data.api_key.length === 0)) {
      errors.push(PROVIDERS_MANAGER_CONSTANTS.ERRORS.API_KEY_REQUIRED);
    }

    // Auth type validation
    if (data.auth_type && !PROVIDERS_MANAGER_CONSTANTS.VALIDATION.SUPPORTED_AUTH_TYPES.includes(data.auth_type as AuthType)) {
      errors.push(PROVIDERS_MANAGER_CONSTANTS.ERRORS.INVALID_AUTH_TYPE);
    }

    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  private async performRealApiTest(provider: IProvider, apiKey: string): Promise<IApiTestResult> {
    const startTime = Date.now();

    try {
      let testEndpoint: string;
      let headers: Record<string, string>;
      let body: string | undefined;
      let method = 'GET';

      const baseUrl = this.getBaseApiUrl(provider.api_base_url);

      switch (provider.protocol) {
        case 'openai':
          testEndpoint = this.buildApiEndpoint(baseUrl, PROVIDERS_MANAGER_CONSTANTS.API_TEST.OPENAI_TEST_ENDPOINT);
          headers = {
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.AUTHORIZATION]: `${PROVIDERS_MANAGER_CONSTANTS.HEADERS.BEARER_PREFIX}${apiKey}`,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.USER_AGENT_HEADER]: PROVIDERS_MANAGER_CONSTANTS.API_TEST.USER_AGENT
          };
          break;

        case 'anthropic':
          testEndpoint = this.buildApiEndpoint(baseUrl, PROVIDERS_MANAGER_CONSTANTS.API_TEST.ANTHROPIC_TEST_ENDPOINT);
          headers = {
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.X_API_KEY]: apiKey,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.ANTHROPIC_VERSION]: PROVIDERS_MANAGER_CONSTANTS.API_TEST.ANTHROPIC_API_VERSION,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.CONTENT_TYPE]: PROVIDERS_MANAGER_CONSTANTS.HEADERS.CONTENT_TYPE,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.USER_AGENT_HEADER]: PROVIDERS_MANAGER_CONSTANTS.API_TEST.USER_AGENT
          };
          method = 'POST';
          body = JSON.stringify({
            model: PROVIDERS_MANAGER_CONSTANTS.API_TEST.TEST_MODEL_CLAUDE,
            max_tokens: PROVIDERS_MANAGER_CONSTANTS.API_TEST.TEST_MAX_TOKENS,
            messages: [{
              role: 'user',
              content: PROVIDERS_MANAGER_CONSTANTS.API_TEST.TEST_MESSAGE
            }]
          });
          break;

        case 'gemini':
          const geminiEndpoint = this.buildApiEndpoint(baseUrl, PROVIDERS_MANAGER_CONSTANTS.API_TEST.GEMINI_TEST_ENDPOINT);
          testEndpoint = `${geminiEndpoint}?key=${encodeURIComponent(apiKey)}`;
          headers = {
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.USER_AGENT_HEADER]: PROVIDERS_MANAGER_CONSTANTS.API_TEST.USER_AGENT
          };
          break;

        default:
          throw new Error(`${PROVIDERS_MANAGER_CONSTANTS.ERRORS.UNSUPPORTED_PROTOCOL}: ${provider.protocol}`);
      }

      // Perform HTTP request using built-in modules
      const result = await this.performHttpRequest(testEndpoint, method, headers, body);
      
      const responseTime = Date.now() - startTime;
      const success = result.statusCode >= 200 && result.statusCode < 300;

      let models: string[] = [];
      let message = PROVIDERS_MANAGER_CONSTANTS.MESSAGES.CONNECTION_SUCCESSFUL;

      if (success && result.data) {
        // Parse model list for different protocols
        if (provider.protocol === 'openai' && result.data.data) {
          models = result.data.data.map((model: any) => model.id || model.name).filter(Boolean);
        } else if (provider.protocol === 'gemini' && result.data.models) {
          models = result.data.models.map((model: any) => model.name || model.id).filter(Boolean);
        }

        message = models.length > 0 ? 
          `${PROVIDERS_MANAGER_CONSTANTS.MESSAGES.CONNECTION_SUCCESSFUL}. Found ${models.length} models` : 
          PROVIDERS_MANAGER_CONSTANTS.MESSAGES.CONNECTION_SUCCESSFUL;
      } else {
        // Handle error responses
        if (result.statusCode === 401 || result.statusCode === 403) {
          message = PROVIDERS_MANAGER_CONSTANTS.MESSAGES.AUTHENTICATION_FAILED;
        } else if (result.statusCode === 429) {
          message = PROVIDERS_MANAGER_CONSTANTS.MESSAGES.RATE_LIMIT_EXCEEDED;
        } else if (result.statusCode === 404) {
          message = PROVIDERS_MANAGER_CONSTANTS.MESSAGES.ENDPOINT_NOT_FOUND;
        } else {
          message = result.data?.error?.message || result.data?.message || `HTTP ${result.statusCode} error`;
        }
      }

      return {
        success,
        statusCode: result.statusCode,
        responseTime,
        message,
        models,
        rawResponse: result.data
      };

    } catch (error) {
      return {
        success: false,
        statusCode: 0,
        responseTime: Date.now() - startTime,
        message: `${PROVIDERS_MANAGER_CONSTANTS.MESSAGES.CONNECTION_FAILED}: ${error.message}`,
        models: [],
        error: error.message
      };
    }
  }

  private async performHttpRequest(url: string, method: string, headers: Record<string, string>, body?: string): Promise<{statusCode: number, data: any}> {
    // This would contain the HTTP request implementation similar to the original
    // Using Node.js built-in https/http modules
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');

    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: headers,
        timeout: PROVIDERS_MANAGER_CONSTANTS.API_TEST.TIMEOUT_MS,
        rejectUnauthorized: false
      };

      const req = client.request(options, (res: any) => {
        let data = '';

        res.on('data', (chunk: any) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            let parsedData = {};
            if (data) {
              parsedData = JSON.parse(data);
            }
            resolve({ statusCode: res.statusCode, data: parsedData });
          } catch (parseError) {
            resolve({ statusCode: res.statusCode, data: { raw: data } });
          }
        });
      });

      req.on('error', (error: any) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(PROVIDERS_MANAGER_CONSTANTS.MESSAGES.REQUEST_TIMEOUT));
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  private findProviderIndex(providerId: string): number {
    return this.currentConfig?.providers.findIndex(p => 
      p.id === providerId || p.name === providerId
    ) ?? -1;
  }

  private processApiKeys(apiKey: string[] | string): string[] {
    if (Array.isArray(apiKey)) {
      const filtered = apiKey.filter(key => key && key.trim() !== '');
      return [...new Set(filtered)]; // Remove duplicates
    }
    return [apiKey].filter(Boolean);
  }

  private initializeNextId(): void {
    if (this.currentConfig?.providers) {
      const maxId = this.currentConfig.providers
        .map(p => parseInt(p.id.replace(PROVIDERS_MANAGER_CONSTANTS.ID_GENERATION.PREFIX, '')) || 0)
        .reduce((max, id) => Math.max(max, id), 0);
      this.nextId = maxId + 1;
    }
  }

  private getBaseApiUrl(apiBaseUrl: string): string {
    let baseUrl = apiBaseUrl;
    for (const endpoint of PROVIDERS_MANAGER_CONSTANTS.BASE_URL_ENDPOINTS_TO_REMOVE) {
      if (baseUrl.endsWith(endpoint)) {
        baseUrl = baseUrl.slice(0, -endpoint.length);
        break;
      }
    }
    return baseUrl.replace(/\/$/, '');
  }

  private buildApiEndpoint(baseUrl: string, endpoint: string): string {
    const cleanBase = baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${cleanBase}${cleanEndpoint}`;
  }

  private async saveConfig(): Promise<void> {
    if (this.configManager && this.currentConfig) {
      await this.configManager.saveConfig(this.currentConfig);
    }
  }

  private createResponse(success: boolean, data: any = null, message?: string, statusCode?: number): IProvidersManagerResponse {
    return {
      success,
      data,
      message,
      error: success ? undefined : message,
      statusCode,
      timestamp: Date.now()
    };
  }

  private createApiResponse(success: boolean, data: any = null, error?: string, statusCode?: number): IApiResponse {
    return {
      success,
      data,
      error,
      statusCode,
      timestamp: Date.now()
    };
  }

  private convertToApiResponse(response: IProvidersManagerResponse): IApiResponse {
    return {
      success: response.success,
      data: response.data,
      error: response.error,
      statusCode: response.statusCode,
      timestamp: response.timestamp
    };
  }

  private createModelObject(modelId: string): IModel {
    return {
      id: modelId,
      name: modelId,
      max_tokens: 0, // Will be detected or manually set
      description: `Auto-discovered model: ${modelId}`,
      status: 'discovered',
      verified: false,
      auto_detected_tokens: null,
      blacklisted: false,
      blacklist_reason: null,
      manual_override: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_verification: undefined
    };
  }

  private generateFallbackModels(provider: IProvider): IModel[] {
    // Generate fallback models based on protocol
    const fallbackModels: { [key: string]: string[] } = {
      openai: ['gpt-4', 'gpt-3.5-turbo', 'text-davinci-003'],
      anthropic: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
      gemini: ['gemini-pro', 'gemini-pro-vision']
    };

    const models = fallbackModels[provider.protocol] || [];
    return models.map(modelId => this.createModelObject(modelId));
  }

  private async performModelVerification(provider: IProvider, model: IModel, apiKey: string): Promise<{
    success: boolean;
    message: string;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      let testEndpoint: string;
      let headers: Record<string, string>;
      let body: string;
      let method = 'POST';

      const baseUrl = this.getBaseApiUrl(provider.api_base_url);

      switch (provider.protocol) {
        case 'openai':
          testEndpoint = this.buildApiEndpoint(baseUrl, '/chat/completions');
          headers = {
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.AUTHORIZATION]: `${PROVIDERS_MANAGER_CONSTANTS.HEADERS.BEARER_PREFIX}${apiKey}`,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.CONTENT_TYPE]: PROVIDERS_MANAGER_CONSTANTS.HEADERS.CONTENT_TYPE,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.USER_AGENT_HEADER]: PROVIDERS_MANAGER_CONSTANTS.API_TEST.USER_AGENT
          };
          body = JSON.stringify({
            model: model.id,
            messages: [{ role: 'user', content: 'Hello, how are you?' }],
            max_tokens: 5
          });
          break;

        case 'anthropic':
          testEndpoint = this.buildApiEndpoint(baseUrl, PROVIDERS_MANAGER_CONSTANTS.API_TEST.ANTHROPIC_TEST_ENDPOINT);
          headers = {
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.X_API_KEY]: apiKey,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.ANTHROPIC_VERSION]: PROVIDERS_MANAGER_CONSTANTS.API_TEST.ANTHROPIC_API_VERSION,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.CONTENT_TYPE]: PROVIDERS_MANAGER_CONSTANTS.HEADERS.CONTENT_TYPE,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.USER_AGENT_HEADER]: PROVIDERS_MANAGER_CONSTANTS.API_TEST.USER_AGENT
          };
          body = JSON.stringify({
            model: model.id,
            max_tokens: PROVIDERS_MANAGER_CONSTANTS.API_TEST.TEST_MAX_TOKENS,
            messages: [{ role: 'user', content: 'Hello, how are you?' }]
          });
          break;

        case 'gemini':
          const geminiEndpoint = this.buildApiEndpoint(baseUrl, `/models/${model.id}:generateContent`);
          testEndpoint = `${geminiEndpoint}?key=${encodeURIComponent(apiKey)}`;
          headers = {
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.CONTENT_TYPE]: PROVIDERS_MANAGER_CONSTANTS.HEADERS.CONTENT_TYPE,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.USER_AGENT_HEADER]: PROVIDERS_MANAGER_CONSTANTS.API_TEST.USER_AGENT
          };
          body = JSON.stringify({
            contents: [{ parts: [{ text: 'Hello, how are you?' }] }]
          });
          break;

        default:
          throw new Error(`${PROVIDERS_MANAGER_CONSTANTS.ERRORS.UNSUPPORTED_PROTOCOL}: ${provider.protocol}`);
      }

      const result = await this.performHttpRequest(testEndpoint, method, headers, body);
      const responseTime = Date.now() - startTime;
      const success = result.statusCode >= 200 && result.statusCode < 300;

      return {
        success,
        message: success ? 'Model verification successful' : `Verification failed: HTTP ${result.statusCode}`,
        responseTime
      };

    } catch (error) {
      return {
        success: false,
        message: `Verification failed: ${error.message}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  private async performTokenDetection(provider: IProvider, model: IModel, apiKey: string, testPrompt?: string): Promise<{
    success: boolean;
    message: string;
    detectedTokens?: number;
    attempts: number;
  }> {
    const prompt = testPrompt || PROVIDERS_MANAGER_CONSTANTS.TOKEN_DETECTION.DEFAULT_TEST_PROMPT;
    const steps = PROVIDERS_MANAGER_CONSTANTS.TOKEN_DETECTION.INCREMENTAL_STEPS;
    let attempts = 0;
    let lastSuccessfulTokens = 0;

    for (const tokens of steps) {
      attempts++;
      
      try {
        const result = await this.testModelWithTokens(provider, model, apiKey, prompt, tokens);
        
        if (result.success) {
          lastSuccessfulTokens = tokens;
        } else {
          // If we fail at this token count, the limit is likely the previous successful count
          break;
        }
        
        if (attempts >= PROVIDERS_MANAGER_CONSTANTS.TOKEN_DETECTION.MAX_DETECTION_ATTEMPTS) {
          break;
        }
      } catch (error) {
        break;
      }
    }

    if (lastSuccessfulTokens > 0) {
      return {
        success: true,
        message: `Detected maximum tokens: ${lastSuccessfulTokens}`,
        detectedTokens: lastSuccessfulTokens,
        attempts
      };
    } else {
      return {
        success: false,
        message: 'Unable to detect token limits',
        attempts
      };
    }
  }

  private async testModelWithTokens(provider: IProvider, model: IModel, apiKey: string, prompt: string, maxTokens: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      let testEndpoint: string;
      let headers: Record<string, string>;
      let body: string;
      let method = 'POST';

      const baseUrl = this.getBaseApiUrl(provider.api_base_url);

      switch (provider.protocol) {
        case 'openai':
          testEndpoint = this.buildApiEndpoint(baseUrl, '/chat/completions');
          headers = {
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.AUTHORIZATION]: `${PROVIDERS_MANAGER_CONSTANTS.HEADERS.BEARER_PREFIX}${apiKey}`,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.CONTENT_TYPE]: PROVIDERS_MANAGER_CONSTANTS.HEADERS.CONTENT_TYPE,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.USER_AGENT_HEADER]: PROVIDERS_MANAGER_CONSTANTS.API_TEST.USER_AGENT
          };
          body = JSON.stringify({
            model: model.id,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens
          });
          break;

        case 'anthropic':
          testEndpoint = this.buildApiEndpoint(baseUrl, PROVIDERS_MANAGER_CONSTANTS.API_TEST.ANTHROPIC_TEST_ENDPOINT);
          headers = {
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.X_API_KEY]: apiKey,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.ANTHROPIC_VERSION]: PROVIDERS_MANAGER_CONSTANTS.API_TEST.ANTHROPIC_API_VERSION,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.CONTENT_TYPE]: PROVIDERS_MANAGER_CONSTANTS.HEADERS.CONTENT_TYPE,
            [PROVIDERS_MANAGER_CONSTANTS.HEADERS.USER_AGENT_HEADER]: PROVIDERS_MANAGER_CONSTANTS.API_TEST.USER_AGENT
          };
          body = JSON.stringify({
            model: model.id,
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
          });
          break;

        case 'gemini':
          // Gemini doesn't have a direct max_tokens parameter in the same way
          return { success: true, message: 'Gemini token detection not directly supported' };

        default:
          throw new Error(`${PROVIDERS_MANAGER_CONSTANTS.ERRORS.UNSUPPORTED_PROTOCOL}: ${provider.protocol}`);
      }

      const result = await this.performHttpRequest(testEndpoint, method, headers, body);
      const success = result.statusCode >= 200 && result.statusCode < 300;

      return {
        success,
        message: success ? `Token test passed for ${maxTokens} tokens` : `Token test failed at ${maxTokens} tokens`
      };

    } catch (error) {
      return {
        success: false,
        message: `Token test error: ${error.message}`
      };
    }
  }
}