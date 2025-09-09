/**
 * iFlow Token Detector
 * Specialized token detection for iFlow API with proper error format handling
 */

import { IFLOW_CONSTANTS } from '../constants/IFlowProvider.constants';
import { 
  ITokenDetector, 
  IProvider, 
  IModel, 
  ITokenDetectionResult, 
  ITokenTestResult,
  IHttpResponse,
  IConversationTestConfig,
  IProviderDetector,
  IErrorParser
} from '../interfaces/ITokenDetector';

export class IFlowProviderDetector implements IProviderDetector {
  isProviderType(provider: IProvider): boolean {
    // Check URL patterns
    const urlMatch = IFLOW_CONSTANTS.PROVIDER_DETECTION.URL_PATTERNS.some(pattern => 
      pattern.test(provider.api_base_url)
    );

    // Check provider names
    const nameMatch = IFLOW_CONSTANTS.PROVIDER_DETECTION.PROVIDER_NAMES.includes(provider.name);

    return urlMatch || nameMatch;
  }

  getProviderType(): string {
    return 'iflow';
  }
}

export class IFlowErrorParser implements IErrorParser {
  parseError(response: any): { message: string; code?: number; tokenLimit?: number } {
    // iFlow format: {"message": "...", "error_code": 400}
    let message = '';
    let code: number | undefined;
    
    if (response.message) {
      message = response.message;
      code = response.error_code;
    } else if (response.error?.message) {
      // Fallback to OpenAI format
      message = response.error.message;
      code = response.error.code;
    }

    // Try to extract token limit from message
    const tokenLimit = this.extractTokenFromMessage(message);

    return { message, code, tokenLimit };
  }

  isTokenLimitError(response: any): boolean {
    const parsed = this.parseError(response);
    
    // Check if error code indicates token limit issue
    if (parsed.code === IFLOW_CONSTANTS.ERROR_FORMAT.EXPECTED_ERROR_CODE) {
      return true;
    }

    // Check message content for token limit keywords
    const message = parsed.message.toLowerCase();
    return message.includes('token') && 
           (message.includes('limit') || message.includes('maximum') || message.includes('exceed'));
  }

  private extractTokenFromMessage(message: string): number | null {
    for (const pattern of IFLOW_CONSTANTS.ERROR_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        const tokenLimit = parseInt(match[1]);
        if (tokenLimit >= IFLOW_CONSTANTS.VALIDATION.MIN_TOKEN_LIMIT && 
            tokenLimit <= IFLOW_CONSTANTS.VALIDATION.MAX_TOKEN_LIMIT) {
          return tokenLimit;
        }
      }
    }
    return null;
  }
}

export class IFlowTokenDetector implements ITokenDetector {
  private providerDetector: IFlowProviderDetector;
  private errorParser: IFlowErrorParser;

  constructor() {
    this.providerDetector = new IFlowProviderDetector();
    this.errorParser = new IFlowErrorParser();
  }

  supportsProvider(provider: IProvider): boolean {
    return this.providerDetector.isProviderType(provider);
  }

  async detectTokenLimit(provider: IProvider, model: IModel, apiKey: string): Promise<ITokenDetectionResult> {
    if (!this.supportsProvider(provider)) {
      return {
        success: false,
        detectedTokens: null,
        error: `Provider ${provider.name} is not supported by iFlow token detector`
      };
    }

    console.log(`🔍 Starting iFlow token detection for model: ${model.name}`);
    console.log(`📊 Testing token limits: ${IFLOW_CONSTANTS.TEST_TOKEN_LIMITS.join(', ')}`);

    const testResults: ITokenTestResult[] = [];

    // Test token limits from high to low
    for (const tokenLimit of IFLOW_CONSTANTS.TEST_TOKEN_LIMITS) {
      console.log(`🧪 Testing token limit: ${tokenLimit.toLocaleString()}`);
      
      const result = await this.testTokenLimit(provider, model, apiKey, tokenLimit);
      testResults.push(result);

      if (result.success) {
        console.log(`✅ Model ${model.name} supports at least ${tokenLimit.toLocaleString()} tokens`);
        return {
          success: true,
          detectedTokens: tokenLimit,
          testResults,
          providerType: 'iflow'
        };
      }

      // If we get a token limit error, extract the actual limit
      if (result.errorMessage) {
        const extractedLimit = this.extractTokenFromError(result.errorMessage);
        if (extractedLimit && extractedLimit < tokenLimit) {
          console.log(`✅ Detected actual token limit from iFlow API error: ${extractedLimit.toLocaleString()}`);
          return {
            success: true,
            detectedTokens: extractedLimit,
            testResults,
            providerType: 'iflow'
          };
        }
      }
    }

    console.log(`❌ Token detection failed for model ${model.name} - no valid token limit found`);
    return {
      success: false,
      detectedTokens: null,
      error: 'Could not detect token limit from iFlow API responses',
      testResults,
      providerType: 'iflow'
    };
  }

  async testTokenLimit(provider: IProvider, model: IModel, apiKey: string, tokenLimit: number): Promise<ITokenTestResult> {
    const startTime = Date.now();

    try {
      const response = await this.makeAPIRequest(provider, model, apiKey, tokenLimit);
      const responseTime = Date.now() - startTime;

      if (response.success) {
        return {
          tokenLimit,
          success: true,
          responseTime
        };
      }

      // Parse error response
      const errorInfo = this.errorParser.parseError(response.rawResponse);
      
      return {
        tokenLimit,
        success: false,
        responseTime,
        errorMessage: errorInfo.message
      };
    } catch (error) {
      return {
        tokenLimit,
        success: false,
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  extractTokenFromError(errorMessage: string): number | null {
    return this.errorParser.extractTokenFromMessage(errorMessage);
  }

  private async makeAPIRequest(provider: IProvider, model: IModel, apiKey: string, tokenLimit: number): Promise<IHttpResponse> {
    const https = require('https');
    const { URL } = require('url');

    const config: IConversationTestConfig = {
      model: model.name,
      messages: [{ role: 'user', content: 'Hello, please respond with OK.' }],
      max_tokens: tokenLimit,
      temperature: 0.7
    };

    const url = new URL(provider.api_base_url);
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': IFLOW_CONSTANTS.REQUEST_CONFIG.USER_AGENT
    };

    const body = JSON.stringify(config);

    return new Promise((resolve) => {
      const startTime = Date.now();

      const req = https.request({
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers,
        timeout: IFLOW_CONSTANTS.REQUEST_CONFIG.DEFAULT_TIMEOUT
      }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          
          try {
            const parsedData = data ? JSON.parse(data) : {};
            const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

            resolve({
              success: isSuccess,
              statusCode: res.statusCode,
              data: isSuccess ? parsedData : null,
              error: isSuccess ? undefined : parsedData.message || parsedData.error?.message,
              responseTime,
              rawResponse: parsedData
            });
          } catch (parseError) {
            resolve({
              success: false,
              statusCode: res.statusCode || 0,
              error: `JSON parse error: ${parseError.message}`,
              responseTime,
              rawResponse: data
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          statusCode: 0,
          error: `Request error: ${error.message}`,
          responseTime: Date.now() - startTime,
          rawResponse: null
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          statusCode: 0,
          error: 'Request timeout',
          responseTime: Date.now() - startTime,
          rawResponse: null
        });
      });

      req.write(body);
      req.end();
    });
  }
}