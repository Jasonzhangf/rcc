/**
 * Token Detector Interfaces
 * Defines contracts for token limit detection across different providers
 */

export interface IProvider {
  id: string;
  name: string;
  protocol: string;
  api_base_url: string;
  api_key: string | string[];
}

export interface IModel {
  id: string;
  name: string;
  max_tokens: number;
  description?: string;
}

export interface ITokenDetectionResult {
  success: boolean;
  detectedTokens: number | null;
  error?: string;
  testResults?: ITokenTestResult[];
  providerType?: string;
}

export interface ITokenTestResult {
  tokenLimit: number;
  success: boolean;
  responseTime?: number;
  errorMessage?: string;
}

export interface IHttpResponse {
  success: boolean;
  statusCode: number;
  data?: any;
  error?: string;
  responseTime: number;
  rawResponse?: any;
}

export interface IConversationTestConfig {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens: number;
  temperature?: number;
}

export interface ITokenDetector {
  /**
   * Detect the actual token limit for a model by testing API responses
   */
  detectTokenLimit(provider: IProvider, model: IModel, apiKey: string): Promise<ITokenDetectionResult>;

  /**
   * Test a specific token limit
   */
  testTokenLimit(provider: IProvider, model: IModel, apiKey: string, tokenLimit: number): Promise<ITokenTestResult>;

  /**
   * Check if this detector supports the given provider
   */
  supportsProvider(provider: IProvider): boolean;

  /**
   * Extract token limit from error message
   */
  extractTokenFromError(errorMessage: string): number | null;
}

export interface IProviderDetector {
  /**
   * Determine if a provider is of a specific type (e.g., iFlow)
   */
  isProviderType(provider: IProvider): boolean;

  /**
   * Get provider type identifier
   */
  getProviderType(): string;
}

export interface IErrorParser {
  /**
   * Parse error response and extract meaningful information
   */
  parseError(response: any): {
    message: string;
    code?: number;
    tokenLimit?: number;
  };

  /**
   * Check if error indicates token limit exceeded
   */
  isTokenLimitError(response: any): boolean;
}