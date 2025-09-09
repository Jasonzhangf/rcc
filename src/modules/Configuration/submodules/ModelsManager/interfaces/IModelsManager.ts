/**
 * Models Manager Interface
 * Handles model verification, token detection, and status management
 */

import { IProvider, IModel, IConfigData, IConfigManager } from '../../ConfigManager/interfaces/IConfigManager';

export interface IModelsManager {
  /**
   * Initialize the models manager
   */
  initialize(configManager: IConfigManager): Promise<void>;
  
  /**
   * Handle configuration updates
   */
  onConfigUpdate(configData: IConfigData): Promise<void>;
  
  /**
   * Validate model-specific configuration
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
   * Verify a model with real API conversation test
   */
  verifyProviderModel(providerId: string, modelData: IModelVerificationInput): Promise<IModelsManagerResponse>;
  
  /**
   * Detect model token limits automatically
   */
  detectModelTokens(providerId: string, modelData: ITokenDetectionInput): Promise<IModelsManagerResponse>;
  
  /**
   * Perform real conversation test with a model
   */
  performRealConversationTest(provider: IProvider, model: IModel, apiKey: string, testMessage: string): Promise<IModelTestResult>;
  
  /**
   * Perform token limit test with specific token count
   */
  performTokenLimitTest(provider: IProvider, model: IModel, apiKey: string, tokenLimit: number): Promise<IModelTestResult>;
  
  /**
   * Perform comprehensive token detection (iFlow specialization)
   */
  performTokenDetection(provider: IProvider, model: IModel, apiKey: string): Promise<ITokenDetectionResult>;
  
  /**
   * Check if provider is iFlow
   */
  isIFlowProvider(provider: IProvider): boolean;
  
  /**
   * Parse iFlow-specific error responses
   */
  parseIFlowError(response: any): IErrorParseResult;
  
  /**
   * Extract token limit from iFlow error message
   */
  extractTokenFromIFlowError(errorMessage: string): number | null;
  
  /**
   * Extract token limit from generic error message
   */
  extractTokenFromGenericError(errorMessage: string): number | null;
  
  /**
   * Generate test content for token limit testing
   */
  generateTestContent(targetTokens: number): string;
}

export interface IModelVerificationInput {
  modelId: string;
  testMessage?: string;
  apiKey?: string;
}

export interface ITokenDetectionInput {
  modelId: string;
  apiKey?: string;
}

export interface IModelsManagerResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
  message?: string;
  timestamp: number;
}

export interface IModelTestResult {
  success: boolean;
  statusCode: number;
  responseTime: number;
  message: string;
  response?: string;
  tokensUsed?: number;
  rawResponse?: any;
  error?: string;
}

export interface ITokenDetectionResult {
  success: boolean;
  detectedTokens: number | null;
  error?: string;
}

export interface IErrorParseResult {
  message: string;
  code?: number;
}

export interface IProtocolHandler {
  protocol: string;
  parseResponse(response: any): {
    content: string;
    tokensUsed: number;
  };
}

export interface ITokenTestOptions {
  testValues: number[];
  maxTestAttempts: number;
  timeoutMs: number;
}