/**
 * Providers Manager Interface
 * Handles provider CRUD operations, testing, and management
 */

import { IProvider, IModel, IConfigData, IConfigManager } from '../../ConfigManager/interfaces/IConfigManager';
import { IApiResponse } from '../../../../ApiRouter/interfaces/IApiRouter';

export interface IProvidersManager {
  /**
   * Initialize the providers manager
   */
  initialize(configManager: IConfigManager): Promise<void>;
  
  /**
   * Handle configuration updates
   */
  onConfigUpdate(configData: IConfigData): Promise<void>;
  
  /**
   * Validate provider-specific configuration
   */
  validateConfig(configData: IConfigData): boolean;
  
  /**
   * Get submodule name
   */
  getName(): string;
  
  /**
   * Clean up resources
   */
  destroy(): Promise<void>;
  
  /**
   * Add a new provider
   */
  addProvider(providerData: IProviderInput): Promise<IProvidersManagerResponse>;
  
  /**
   * Update existing provider
   */
  updateProvider(providerId: string, providerData: IProviderInput): Promise<IProvidersManagerResponse>;
  
  /**
   * Delete provider
   */
  deleteProvider(providerId: string): Promise<IProvidersManagerResponse>;
  
  /**
   * Get all providers
   */
  getProviders(): Promise<IProvider[]>;
  
  /**
   * Get specific provider by ID or name
   */
  getProvider(providerId: string): Promise<IProvider | null>;
  
  /**
   * Test provider connection
   */
  testProvider(providerId: string, testOptions: IProviderTestOptions): Promise<IProvidersManagerResponse>;
  
  /**
   * Get provider models
   */
  getProviderModels(providerId: string, options?: IModelFetchOptions): Promise<IProvidersManagerResponse>;
  
  /**
   * Verify specific provider model
   */
  verifyProviderModel(providerId: string, modelData: IModelVerificationInput): Promise<IProvidersManagerResponse>;
  
  /**
   * Detect model token limits
   */
  detectModelTokens(providerId: string, modelData: ITokenDetectionInput): Promise<IProvidersManagerResponse>;
  
  /**
   * Blacklist a model
   */
  blacklistModel(providerId: string, modelData: IModelBlacklistInput): Promise<IProvidersManagerResponse>;
  
  /**
   * Add provider.model to pool
   */
  addToProviderPool(providerId: string, poolData: IProviderPoolInput): Promise<IProvidersManagerResponse>;
}

export interface IProviderInput {
  name: string;
  protocol: string;
  api_base_url: string;
  api_key: string[] | string;
  auth_type: string;
  models?: IModel[];
  model_blacklist?: string[];
  provider_pool?: string[];
}

export interface IProviderTestOptions {
  api_key?: string;
  testAllKeys?: boolean;
}

export interface IModelFetchOptions {
  api_key?: string;
  forceRefresh?: boolean;
}

export interface IModelVerificationInput {
  modelId: string;
  api_key?: string;
}

export interface ITokenDetectionInput {
  modelId: string;
  api_key?: string;
  testPrompt?: string;
}

export interface IModelBlacklistInput {
  modelId: string;
  reason: string;
}

export interface IProviderPoolInput {
  modelId: string;
  priority?: number;
}

export interface IProvidersManagerResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
  message?: string;
  timestamp: number;
}

export interface IProviderTestResult {
  api_key: string;
  success: boolean;
  statusCode: number;
  responseTime: number;
  message: string;
  timestamp: number;
  models?: string[];
}

export interface IProviderValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface IApiTestResult {
  success: boolean;
  statusCode: number;
  responseTime: number;
  message: string;
  models: string[];
  rawResponse?: any;
  error?: string;
}