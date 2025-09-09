import type { 
  IModelsManager,
  IModel,
  IModelVerificationResult,
  ITokenDetectionResult
} from '../interfaces/IModelsManager';
import type { IConfigManager, IProvidersManager } from '../../shared/types';
import { MODELS_MANAGER_CONSTANTS } from '../constants/ModelsManager.constants';

export class ModelsManager implements IModelsManager {
  private initialized = false;

  constructor(
    private configManager: IConfigManager,
    private providersManager: IProvidersManager
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    console.log(`🔧 [${MODELS_MANAGER_CONSTANTS.MODULE_NAME}] Initializing...`);
    this.initialized = true;
    console.log(`✅ [${MODELS_MANAGER_CONSTANTS.MODULE_NAME}] Initialized successfully`);
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    console.log(`✅ [${MODELS_MANAGER_CONSTANTS.MODULE_NAME}] Destroyed successfully`);
  }

  async getAll(): Promise<IModel[]> {
    const providers = await this.providersManager.getAll();
    const models: IModel[] = [];
    for (const provider of providers) {
      if (provider.models) {
        models.push(...provider.models);
      }
    }
    return models;
  }

  async verifyModel(providerId: string, modelId: string): Promise<IModelVerificationResult> {
    const provider = await this.providersManager.getById(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    const model = provider.models?.find(m => m.id === modelId);
    if (!model) {
      throw new Error(MODELS_MANAGER_CONSTANTS.ERRORS.MODEL_NOT_FOUND);
    }

    // Mock verification
    return {
      success: true,
      provider_id: providerId,
      model_id: modelId,
      verified_at: new Date().toISOString(),
      response_time_ms: 200,
      max_tokens_detected: model.max_tokens,
      details: {
        test_message: 'Hello, world!',
        response_received: true,
        token_count: 12
      }
    };
  }

  async detectTokens(providerId: string, modelId: string): Promise<ITokenDetectionResult> {
    const provider = await this.providersManager.getById(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    const model = provider.models?.find(m => m.id === modelId);
    if (!model) {
      throw new Error(MODELS_MANAGER_CONSTANTS.ERRORS.MODEL_NOT_FOUND);
    }

    // Mock token detection
    return {
      success: true,
      provider_id: providerId,
      model_id: modelId,
      detected_tokens: model.max_tokens,
      detection_method: 'api_response',
      tested_at: new Date().toISOString(),
      details: {
        tests_performed: 1,
        max_tested: model.max_tokens,
        min_tested: 1000
      }
    };
  }
}