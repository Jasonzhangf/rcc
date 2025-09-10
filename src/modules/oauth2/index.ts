/**
 * OAuth2 Module Index
 * Main entry point for the simplified OAuth2 implementation
 */

// Core classes
export { OAuth2Module } from './OAuth2Module';
export { TokenStorage } from './TokenStorage';

// Types and interfaces
export {
  OAuth2ModuleConfig,
  DeviceAuthorizationResponse,
  TokenData,
  TokenStatus,
  OAuth2ErrorCode,
  AuthState,
  StoredTokenInfo,
  PKCEPair,
  OAuth2Stats,
  OAuth2ErrorContext
} from './OAuth2Types';

// Constants
export {
  DEFAULT_OAUTH2_CONFIG,
  OAUTH2_ERROR_MESSAGES,
  OAUTH2_ERROR_CATEGORIES,
  OAUTH2_HTTP_STATUS,
  TOKEN_FILE_PATTERNS,
  CONTENT_TYPES,
  GRANT_TYPES,
  PKCE_CHALLENGE_METHODS
} from './OAuth2Constants';

// Usage examples
export {
  OAuth2Examples,
  basicOAuth2Flow,
  tokenManagementExample,
  tokenStorageExample,
  errorHandlingExample,
  messageCommunicationExample,
  completeIntegrationExample
} from './examples/OAuth2UsageExamples';

// Module version
export const OAUTH2_MODULE_VERSION = '1.0.0';

/**
 * Create a complete OAuth2 module with default configuration
 */
export function createOAuth2Module(
  config: Partial<OAuth2ModuleConfig>,
  errorHandlerCenter: any
): OAuth2Module {
  const defaultConfig: OAuth2ModuleConfig = {
    clientId: config.clientId || '',
    scope: config.scope || 'openid profile email',
    deviceAuthEndpoint: config.deviceAuthEndpoint || '',
    tokenEndpoint: config.tokenEndpoint || '',
    tokenStoragePath: config.tokenStoragePath || './tokens/',
    enablePKCE: config.enablePKCE ?? true
  };

  return new OAuth2Module(defaultConfig, errorHandlerCenter);
}

/**
 * Quick start example for OAuth2 module
 */
export async function quickStartOAuth2(config: OAuth2ModuleConfig) {
  try {
    // Import dependencies
    const { ErrorHandlerCenter } = await import('sharedmodule/pipeline');
    const { PipelineConfigManager } = await import('sharedmodule/pipeline');
    
    // Create error handling center
    const errorHandlerCenter = new ErrorHandlerCenter(new PipelineConfigManager());
    await errorHandlerCenter.initialize();
    
    // Create OAuth2 module
    const oauth2Module = createOAuth2Module(config, errorHandlerCenter);
    await oauth2Module.initialize();
    
    return {
      oauth2Module,
      errorHandlerCenter,
      cleanup: async () => {
        await oauth2Module.destroy();
        await errorHandlerCenter.destroy();
      }
    };
  } catch (error) {
    console.error('Failed to initialize OAuth2 module:', error);
    throw error;
  }
}

// Re-export for convenience
export * from 'rcc-basemodule';