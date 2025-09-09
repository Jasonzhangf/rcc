/**
 * ModelsManager Implementation
 * Configuration submodule for model verification, token detection, and status management
 */

import { BaseModule } from '../../../../core/BaseModule';
import { ModuleInfo } from '../../../../interfaces/ModuleInfo';
import { IConfigurationSubmodule } from '../../interfaces/IConfiguration';
import { 
  IModelsManager, 
  IModelVerificationInput, 
  ITokenDetectionInput,
  IModelsManagerResponse,
  IModelTestResult,
  ITokenDetectionResult,
  IErrorParseResult
} from '../interfaces/IModelsManager';
import { IProvider, IModel, IConfigData, IConfigManager } from '../../ConfigManager/interfaces/IConfigManager';
import { MODELS_MANAGER_CONSTANTS } from '../constants/ModelsManager.constants';
import * as https from 'https';
import * as http from 'http';

export class ModelsManager extends BaseModule implements IConfigurationSubmodule, IModelsManager {
  private configManager: IConfigManager | null = null;
  private initialized: boolean = false;

  constructor(info: ModuleInfo) {
    super(info);
  }

  /**
   * Initialize the models manager
   */
  async initialize(configManager: IConfigManager): Promise<void> {
    try {
      this.configManager = configManager;
      this.initialized = true;
      console.log(`✅ ${MODELS_MANAGER_CONSTANTS.MODULE_NAME} initialized successfully`);
    } catch (error) {
      console.error(`❌ Failed to initialize ${MODELS_MANAGER_CONSTANTS.MODULE_NAME}:`, error);
      throw error;
    }
  }

  /**
   * Handle configuration updates
   */
  async onConfigUpdate(configData: IConfigData): Promise<void> {
    if (!this.initialized) {
      throw new Error(`${MODELS_MANAGER_CONSTANTS.MODULE_NAME} not initialized`);
    }
    
    // Update internal state based on configuration changes
    console.log(`📋 ${MODELS_MANAGER_CONSTANTS.MODULE_NAME} configuration updated`);
  }

  /**
   * Validate model-specific configuration
   */
  validateConfig(configData: IConfigData): boolean {
    try {
      // Validate that providers have valid model structures
      for (const provider of configData.providers) {
        if (!Array.isArray(provider.models)) {
          console.error(`Invalid models array for provider ${provider.id}`);
          return false;
        }
        
        for (const model of provider.models) {
          if (!model.id || !model.name || typeof model.max_tokens !== 'number') {
            console.error(`Invalid model structure in provider ${provider.id}:`, model);
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Configuration validation error:`, error);
      return false;
    }
  }

  /**
   * Get submodule name
   */
  getName(): string {
    return MODELS_MANAGER_CONSTANTS.MODULE_NAME;
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    this.configManager = null;
    this.initialized = false;
    console.log(`🧹 ${MODELS_MANAGER_CONSTANTS.MODULE_NAME} destroyed`);
  }

  /**
   * Verify a model with real API conversation test
   */
  async verifyProviderModel(providerId: string, modelData: IModelVerificationInput): Promise<IModelsManagerResponse> {
    try {
      if (!this.configManager) {
        throw new Error(`${MODELS_MANAGER_CONSTANTS.MODULE_NAME} not initialized`);
      }

      const config = await this.configManager.loadConfig();
      const provider = config.providers.find(p => p.id === providerId);
      
      if (!provider) {
        return {
          success: false,
          error: `Provider not found: ${providerId}`,
          statusCode: MODELS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND,
          timestamp: Date.now()
        };
      }

      const model = provider.models.find(m => m.id === modelData.modelId || m.name === modelData.modelId);
      if (!model) {
        return {
          success: false,
          error: `Model not found: ${modelData.modelId}`,
          statusCode: MODELS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND,
          timestamp: Date.now()
        };
      }

      // Select valid API key
      const keys = Array.isArray(provider.api_key) ? provider.api_key : [provider.api_key];
      const validKey = modelData.apiKey || keys.find(key => key && key.trim() !== '') || keys[0];

      if (!validKey) {
        return {
          success: false,
          error: 'No valid API key available',
          statusCode: MODELS_MANAGER_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
          timestamp: Date.now()
        };
      }

      // Perform real conversation test
      const testMessage = modelData.testMessage || MODELS_MANAGER_CONSTANTS.VERIFICATION.DEFAULT_TEST_MESSAGE;
      const result = await this.performRealConversationTest(provider, model, validKey, testMessage);

      // Update model verification status
      const modelIndex = provider.models.findIndex(m => m.id === modelData.modelId || m.name === modelData.modelId);
      if (modelIndex !== -1) {
        provider.models[modelIndex].verified = result.success;
        provider.models[modelIndex].last_verification = new Date().toISOString();
        provider.models[modelIndex].updated_at = new Date().toISOString();

        // If verification successful, perform token detection for non-iFlow providers
        if (result.success) {
          const isIFlow = this.isIFlowProvider(provider);
          
          if (isIFlow) {
            console.log(`⏭️ Skipping token detection for iFlow provider: ${model.name} (iFlow token testing is unreliable)`);
            provider.models[modelIndex].auto_detected_tokens = null;
            provider.models[modelIndex].updated_at = new Date().toISOString();
          } else {
            try {
              console.log(`🔍 Starting token detection for non-iFlow model: ${model.name}`);
              const tokenResult = await this.performTokenDetection(provider, model, validKey);
              console.log(`🔍 Token detection result for ${model.name}:`, tokenResult);
              
              if (tokenResult.success && tokenResult.detectedTokens) {
                console.log(`✅ Setting auto_detected_tokens to ${tokenResult.detectedTokens} for ${model.name}`);
                provider.models[modelIndex].auto_detected_tokens = tokenResult.detectedTokens;
                provider.models[modelIndex].updated_at = new Date().toISOString();
              }
            } catch (tokenError) {
              console.error(`Token detection failed for ${model.name}:`, tokenError);
              provider.models[modelIndex].auto_detected_tokens = null;
            }
          }
        }

        // Save updated configuration
        await this.configManager.saveConfig(config);
      }

      return {
        success: result.success,
        data: {
          providerId,
          modelId: modelData.modelId,
          verified: result.success,
          responseTime: result.responseTime,
          response: result.response,
          tokensUsed: result.tokensUsed,
          message: result.message
        },
        message: result.message,
        statusCode: result.statusCode,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Model verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during model verification',
        statusCode: MODELS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Detect model token limits automatically
   */
  async detectModelTokens(providerId: string, modelData: ITokenDetectionInput): Promise<IModelsManagerResponse> {
    try {
      if (!this.configManager) {
        throw new Error(`${MODELS_MANAGER_CONSTANTS.MODULE_NAME} not initialized`);
      }

      const config = await this.configManager.loadConfig();
      const provider = config.providers.find(p => p.id === providerId);
      
      if (!provider) {
        return {
          success: false,
          error: `Provider not found: ${providerId}`,
          statusCode: MODELS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND,
          timestamp: Date.now()
        };
      }

      const model = provider.models.find(m => m.id === modelData.modelId || m.name === modelData.modelId);
      if (!model) {
        return {
          success: false,
          error: `Model not found: ${modelData.modelId}`,
          statusCode: MODELS_MANAGER_CONSTANTS.HTTP_STATUS.NOT_FOUND,
          timestamp: Date.now()
        };
      }

      // Select valid API key
      const keys = Array.isArray(provider.api_key) ? provider.api_key : [provider.api_key];
      const validKey = modelData.apiKey || keys.find(key => key && key.trim() !== '') || keys[0];

      if (!validKey) {
        return {
          success: false,
          error: 'No valid API key available',
          statusCode: MODELS_MANAGER_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
          timestamp: Date.now()
        };
      }

      let detectedTokens: number | null = null;
      console.log(`Starting token detection for model: ${model.name}`);

      // Test different token limits in descending order
      for (const tokenLimit of MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.TEST_TOKEN_LIMITS) {
        const result = await this.performTokenLimitTest(provider, model, validKey, tokenLimit);
        
        if (result.success) {
          detectedTokens = tokenLimit;
          console.log(`✅ Detected max_tokens: ${tokenLimit} for model ${model.name}`);
          break;
        } else {
          console.log(`❌ Token limit ${tokenLimit} failed for ${model.name}: ${result.message}`);
        }
      }

      // Update model configuration
      const modelIndex = provider.models.findIndex(m => m.id === modelData.modelId || m.name === modelData.modelId);
      if (modelIndex !== -1) {
        provider.models[modelIndex].auto_detected_tokens = detectedTokens;
        provider.models[modelIndex].updated_at = new Date().toISOString();
        await this.configManager.saveConfig(config);
      }

      return {
        success: detectedTokens !== null,
        data: {
          providerId,
          modelId: modelData.modelId,
          detectedTokens,
          message: detectedTokens 
            ? `Successfully detected ${detectedTokens} tokens for ${model.name}`
            : `Failed to detect token limit for ${model.name}`
        },
        message: detectedTokens 
          ? `Token detection successful: ${detectedTokens}`
          : 'Token detection failed',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Token detection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during token detection',
        statusCode: MODELS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Perform real conversation test with a model
   */
  async performRealConversationTest(provider: IProvider, model: IModel, apiKey: string, testMessage: string): Promise<IModelTestResult> {
    const startTime = Date.now();
    
    try {
      const requestBody = {
        model: model.id,
        messages: [{
          role: 'user',
          content: testMessage
        }],
        max_tokens: model.max_tokens,
        temperature: 0.1
      };

      const requestOptions = {
        method: 'POST',
        hostname: new URL(provider.api_base_url).hostname,
        port: new URL(provider.api_base_url).port || (provider.api_base_url.startsWith('https') ? 443 : 80),
        path: provider.protocol === MODELS_MANAGER_CONSTANTS.PROTOCOLS.OPENAI.NAME 
          ? '/v1/chat/completions' 
          : '/v1/messages',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'RCC-ModelsManager/1.0'
        },
        timeout: MODELS_MANAGER_CONSTANTS.REQUEST_TIMEOUT_MS
      };

      const responseData = await this.makeHttpRequest(requestOptions, JSON.stringify(requestBody));
      const responseTime = Date.now() - startTime;

      // Parse response based on protocol
      let response = '';
      let tokensUsed = 0;
      let actualSuccess = false;
      
      const httpSuccess = responseData.statusCode === MODELS_MANAGER_CONSTANTS.HTTP_STATUS.OK;
      let parsedData: any = {};

      if (responseData.body) {
        try {
          parsedData = JSON.parse(responseData.body);
        } catch (parseError) {
          console.error('Failed to parse response body:', parseError);
        }
      }

      if (httpSuccess) {
        if (provider.protocol === MODELS_MANAGER_CONSTANTS.PROTOCOLS.OPENAI.NAME && parsedData.choices?.[0]) {
          // Handle standard content field and GLM-4.5 reasoning_content field
          const message = parsedData.choices[0].message;
          response = message?.content || message?.reasoning_content || '';
          tokensUsed = parsedData.usage?.total_tokens || 0;
        } else if (provider.protocol === MODELS_MANAGER_CONSTANTS.PROTOCOLS.ANTHROPIC.NAME && parsedData.content?.[0]) {
          response = parsedData.content[0].text || '';
          tokensUsed = parsedData.usage?.output_tokens || 0;
        }
        
        // Only consider successful if there's actual response content
        actualSuccess = response.trim().length > MODELS_MANAGER_CONSTANTS.VERIFICATION.REQUIRED_RESPONSE_MIN_LENGTH;
      }

      const result: IModelTestResult = {
        success: actualSuccess,
        statusCode: responseData.statusCode,
        responseTime,
        message: actualSuccess 
          ? `Model verification successful. Response: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"${tokensUsed > 0 ? ` (${tokensUsed} tokens)` : ''}`
          : `Model verification failed. Status: ${responseData.statusCode}`,
        response: actualSuccess ? response : undefined,
        tokensUsed: tokensUsed > 0 ? tokensUsed : undefined,
        rawResponse: parsedData,
        error: !actualSuccess ? (parsedData.error?.message || parsedData.message || 'No valid response') : undefined
      };

      if (MODELS_MANAGER_CONSTANTS.LOGGING.ENABLE_DEBUG) {
        console.log(`Model test result for ${model.name}:`, {
          success: result.success,
          statusCode: result.statusCode,
          responseTime: result.responseTime,
          hasResponse: !!result.response,
          tokensUsed: result.tokensUsed
        });
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        statusCode: MODELS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR,
        responseTime,
        message: `Model test failed: ${errorMessage}`,
        error: errorMessage
      };
    }
  }

  /**
   * Perform token limit test with specific token count
   */
  async performTokenLimitTest(provider: IProvider, model: IModel, apiKey: string, tokenLimit: number): Promise<IModelTestResult> {
    // Generate test content for the specified token limit
    const testContent = this.generateTestContent(tokenLimit);
    
    try {
      const result = await this.performRealConversationTest(
        provider,
        { ...model, max_tokens: tokenLimit },
        apiKey,
        testContent
      );
      
      return result;
    } catch (error) {
      return {
        success: false,
        statusCode: MODELS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR,
        responseTime: 0,
        message: `Token limit test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Perform comprehensive token detection (iFlow specialization)
   */
  async performTokenDetection(provider: IProvider, model: IModel, apiKey: string): Promise<ITokenDetectionResult> {
    try {
      const isIFlow = this.isIFlowProvider(provider);
      console.log(`🔍 Starting token detection for ${isIFlow ? 'iFlow' : 'generic'} provider: ${model.name}`);
      
      // Set 512K tokens to trigger API limit error
      const result = await this.performRealConversationTest(
        provider,
        { ...model, max_tokens: MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.TRIGGER_LIMIT_TOKENS },
        apiKey,
        MODELS_MANAGER_CONSTANTS.VERIFICATION.TOKEN_TEST_MESSAGE
      );
      
      if (MODELS_MANAGER_CONSTANTS.LOGGING.ENABLE_DEBUG) {
        console.log(`Token detection test result:`, {
          success: result.success,
          statusCode: result.statusCode,
          message: result.message,
          hasRawResponse: !!result.rawResponse,
          providerType: isIFlow ? 'iflow' : 'generic'
        });
      }
      
      // If successful, model supports at least 512K tokens
      if (result.success) {
        console.log(`✅ Model ${model.name} supports at least 512K tokens`);
        return {
          success: true,
          detectedTokens: MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.TRIGGER_LIMIT_TOKENS
        };
      }
      
      // If failed, parse error response for token limits
      if (result.rawResponse) {
        let errorMsg = '';
        
        if (isIFlow) {
          // Use iFlow-specific error parsing
          const parsed = this.parseIFlowError(result.rawResponse);
          errorMsg = parsed.message;
          if (MODELS_MANAGER_CONSTANTS.LOGGING.ENABLE_DEBUG) {
            console.log(`🔧 iFlow error parsed:`, parsed);
          }
        } else {
          // Generic error parsing
          errorMsg = result.rawResponse.error?.message || result.rawResponse.message || '';
        }
        
        if (MODELS_MANAGER_CONSTANTS.LOGGING.LOG_RAW_RESPONSES) {
          console.log(`Token detection - API error response: ${errorMsg}`);
          console.log(`Token detection - Raw response:`, JSON.stringify(result.rawResponse, null, 2));
        }
        
        if (errorMsg) {
          // Use provider-specific token extraction
          let detectedTokens: number | null = null;
          
          if (isIFlow) {
            detectedTokens = this.extractTokenFromIFlowError(errorMsg);
          } else {
            detectedTokens = this.extractTokenFromGenericError(errorMsg);
          }
          
          if (detectedTokens) {
            console.log(`✅ Detected actual token limit from ${isIFlow ? 'iFlow' : 'generic'} API: ${detectedTokens.toLocaleString()}`);
            return {
              success: true,
              detectedTokens
            };
          }
          
          // Fallback to generic number extraction
          const allNumbers = errorMsg.match(/(\d{1,7})/g);
          if (allNumbers) {
            const possibleTokens = allNumbers
              .map(num => parseInt(num))
              .filter(num => 
                num >= MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.MIN_VALID_TOKENS && 
                num <= MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.MAX_VALID_TOKENS
              )
              .sort((a, b) => b - a);
            
            console.log(`All possible tokens from error: ${possibleTokens}`);
            if (possibleTokens.length > 0) {
              const fallbackTokens = possibleTokens[0];
              console.log(`✅ Fallback: Detected tokens from numbers: ${fallbackTokens.toLocaleString()}`);
              return {
                success: true,
                detectedTokens: fallbackTokens
              };
            }
          }
        }
      }
      
      console.log(`❌ Token detection failed: no parseable token limit in error response`);
      return {
        success: false,
        detectedTokens: null
      };
      
    } catch (error) {
      console.log(`❌ Token detection exception:`, error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        detectedTokens: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if provider is iFlow
   */
  isIFlowProvider(provider: IProvider): boolean {
    const urlMatch = MODELS_MANAGER_CONSTANTS.IFLOW_DETECTION.URL_PATTERNS.some(pattern => 
      pattern.test(provider.api_base_url)
    );
    const nameMatch = MODELS_MANAGER_CONSTANTS.IFLOW_DETECTION.NAME_PATTERNS.includes(provider.name);
    
    return urlMatch || nameMatch;
  }

  /**
   * Parse iFlow-specific error responses
   */
  parseIFlowError(response: any): IErrorParseResult {
    // iFlow format: {"message": "...", "error_code": 400}
    // OpenAI format: {"error": {"message": "..."}}
    let message = '';
    let code: number | undefined;
    
    if (response.message) {
      message = response.message;
      code = response.error_code;
    } else if (response.error?.message) {
      message = response.error.message;
      code = response.error.code;
    }
    
    return { message, code };
  }

  /**
   * Extract token limit from iFlow error message
   */
  extractTokenFromIFlowError(errorMessage: string): number | null {
    for (const pattern of MODELS_MANAGER_CONSTANTS.IFLOW_TOKEN_PATTERNS) {
      const match = errorMessage.match(pattern);
      if (match) {
        const tokenLimit = parseInt(match[1]);
        if (tokenLimit >= MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.MIN_VALID_TOKENS && 
            tokenLimit <= MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.MAX_VALID_TOKENS) {
          return tokenLimit;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract token limit from generic error message
   */
  extractTokenFromGenericError(errorMessage: string): number | null {
    for (const pattern of MODELS_MANAGER_CONSTANTS.GENERIC_TOKEN_PATTERNS) {
      const match = errorMessage.match(pattern);
      if (match) {
        const tokenLimit = parseInt(match[1]);
        if (tokenLimit >= MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.MIN_VALID_TOKENS && 
            tokenLimit <= MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.MAX_VALID_TOKENS) {
          return tokenLimit;
        }
      }
    }
    
    return null;
  }

  /**
   * Generate test content for token limit testing
   */
  generateTestContent(targetTokens: number): string {
    // Rough estimation: 1 token ≈ 3-4 characters (English)
    const targetChars = Math.floor(targetTokens * MODELS_MANAGER_CONSTANTS.TOKEN_DETECTION.CHARS_PER_TOKEN_ESTIMATE);
    const baseText = MODELS_MANAGER_CONSTANTS.TEST_CONTENT.BASE_TEXT;
    
    let content = baseText;
    let repeatCount = 1;
    
    while (content.length < targetChars) {
      content += baseText + `${MODELS_MANAGER_CONSTANTS.TEST_CONTENT.REPEAT_PREFIX}${repeatCount}: `;
      repeatCount++;
    }
    
    return content.substring(0, targetChars) + MODELS_MANAGER_CONSTANTS.TEST_CONTENT.SUFFIX;
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  private makeHttpRequest(options: any, data: string): Promise<{statusCode: number, body: string}> {
    return new Promise((resolve, reject) => {
      const httpModule = options.port === 443 || options.hostname?.includes('https') ? https : http;
      
      const req = httpModule.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || MODELS_MANAGER_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR,
            body
          });
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${MODELS_MANAGER_CONSTANTS.REQUEST_TIMEOUT_MS}ms`));
      });
      
      if (data) {
        req.write(data);
      }
      
      req.end();
    });
  }
}