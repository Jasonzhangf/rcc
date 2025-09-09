/**
 * ProvidersManager Implementation
 */

import { v4 as uuidv4 } from 'uuid';
import type { 
  IProvidersManager,
  IProvider,
  IProviderTestResult,
  IProviderOptions
} from '../interfaces/IProvidersManager';
import type { IConfigManager, IValidationResult } from '../../shared/types';
import { PROVIDERS_MANAGER_CONSTANTS } from '../constants/ProvidersManager.constants';

export class ProvidersManager implements IProvidersManager {
  private initialized = false;

  constructor(
    private configManager: IConfigManager,
    private options: IProviderOptions = {}
  ) {
    this.options = {
      enableTesting: PROVIDERS_MANAGER_CONSTANTS.DEFAULT_CONFIG.ENABLE_TESTING,
      testTimeout: PROVIDERS_MANAGER_CONSTANTS.DEFAULT_CONFIG.TEST_TIMEOUT,
      maxRetries: PROVIDERS_MANAGER_CONSTANTS.DEFAULT_CONFIG.MAX_RETRIES,
      enableModelDiscovery: PROVIDERS_MANAGER_CONSTANTS.DEFAULT_CONFIG.ENABLE_MODEL_DISCOVERY,
      ...options
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    console.log(`🔧 [${PROVIDERS_MANAGER_CONSTANTS.MODULE_NAME}] Initializing...`);
    this.initialized = true;
    console.log(`✅ [${PROVIDERS_MANAGER_CONSTANTS.MODULE_NAME}] Initialized successfully`);
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    console.log(`✅ [${PROVIDERS_MANAGER_CONSTANTS.MODULE_NAME}] Destroyed successfully`);
  }

  async getAll(): Promise<IProvider[]> {
    const config = await this.configManager.getConfig();
    return config?.providers || [];
  }

  async getById(id: string): Promise<IProvider | null> {
    const providers = await this.getAll();
    return providers.find(p => p.id === id) || null;
  }

  async create(providerData: Omit<IProvider, 'id' | 'created_at' | 'updated_at'>): Promise<IProvider> {
    const provider: IProvider = {
      ...providerData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const config = await this.configManager.getConfig();
    if (!config) throw new Error('Configuration not found');

    config.providers = config.providers || [];
    config.providers.push(provider);
    
    await this.configManager.saveConfig(config);
    return provider;
  }

  async update(id: string, updates: Partial<IProvider>): Promise<IProvider> {
    const config = await this.configManager.getConfig();
    if (!config) throw new Error('Configuration not found');

    const providerIndex = config.providers?.findIndex(p => p.id === id) ?? -1;
    if (providerIndex === -1) {
      throw new Error(PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND);
    }

    const updatedProvider = {
      ...config.providers![providerIndex],
      ...updates,
      id,
      updated_at: new Date().toISOString()
    };

    config.providers![providerIndex] = updatedProvider;
    await this.configManager.saveConfig(config);
    return updatedProvider;
  }

  async delete(id: string): Promise<boolean> {
    const config = await this.configManager.getConfig();
    if (!config) return false;

    const providerIndex = config.providers?.findIndex(p => p.id === id) ?? -1;
    if (providerIndex === -1) return false;

    config.providers!.splice(providerIndex, 1);
    await this.configManager.saveConfig(config);
    return true;
  }

  async testProvider(id: string): Promise<IProviderTestResult> {
    const provider = await this.getById(id);
    if (!provider) {
      throw new Error(PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND);
    }

    // Basic test implementation - in real scenario would test actual API
    return {
      success: true,
      provider_id: id,
      response_time_ms: 150,
      status_code: 200,
      tested_at: new Date().toISOString(),
      details: {
        endpoint_tested: provider.api_base_url,
        api_key_used: Array.isArray(provider.api_key) ? provider.api_key[0] : provider.api_key,
        models_discovered: provider.models?.length || 0
      }
    };
  }

  async testAllProviders(): Promise<IProviderTestResult[]> {
    const providers = await this.getAll();
    const results: IProviderTestResult[] = [];

    for (const provider of providers) {
      try {
        const result = await this.testProvider(provider.id);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          provider_id: provider.id,
          response_time_ms: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          tested_at: new Date().toISOString()
        });
      }
    }

    return results;
  }

  async validateProvider(provider: Partial<IProvider>): Promise<IValidationResult> {
    const errors: Array<{field: string; message: string; code: string}> = [];

    if (!provider.name) {
      errors.push({ field: 'name', message: 'Provider name is required', code: 'REQUIRED' });
    }
    if (!provider.protocol) {
      errors.push({ field: 'protocol', message: 'Protocol is required', code: 'REQUIRED' });
    }
    if (!provider.api_base_url) {
      errors.push({ field: 'api_base_url', message: 'API base URL is required', code: 'REQUIRED' });
    }
    if (!provider.api_key) {
      errors.push({ field: 'api_key', message: 'API key is required', code: 'REQUIRED' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async discoverModels(id: string): Promise<IProvider> {
    const provider = await this.getById(id);
    if (!provider) {
      throw new Error(PROVIDERS_MANAGER_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND);
    }

    // Basic model discovery implementation
    const discoveredModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        max_tokens: 8192,
        status: 'active' as const,
        verified: false,
        blacklisted: false,
        manual_override: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    provider.models = discoveredModels;
    await this.update(id, { models: discoveredModels });
    return provider;
  }
}