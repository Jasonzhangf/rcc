/**
 * Qwen Provider Factory Utilities
 */

import { ModuleInfo } from 'rcc-basemodule';
import { QwenProviderModule } from '../QwenProviderModule';
import { QwenProviderConfig } from '../types/QwenProviderTypes';

/**
 * Default Qwen provider configuration
 */
export const DEFAULT_QWEN_CONFIG: Partial<QwenProviderConfig> = {
  provider: 'qwen',
  endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true,
  debug: {
    enabled: false,
    logLevel: 'info'
  }
};

/**
 * Create a Qwen provider with default configuration
 * @param info - Module information
 * @param config - Provider configuration (optional)
 * @returns Configured QwenProviderModule instance
 */
export function createQwenProvider(
  info: ModuleInfo, 
  config?: Partial<QwenProviderConfig>
): QwenProviderModule {
  const finalConfig: QwenProviderConfig = {
    ...DEFAULT_QWEN_CONFIG,
    ...config,
    provider: 'qwen' // Ensure provider type is always 'qwen'
  } as QwenProviderConfig;

  const module = new QwenProviderModule(info);
  
  // Configure if config provided
  if (config) {
    module.configure(finalConfig).catch(error => {
      console.error('Failed to configure Qwen provider:', error);
    });
  }

  return module;
}

/**
 * Quick start configuration for Qwen provider
 * @param clientId - OAuth2 client ID
 * @param tokenDir - Token storage directory (default: './tokens')
 * @returns Partial configuration for quick setup
 */
export function quickStartQwenConfig(
  clientId: string,
  tokenDir: string = './tokens'
): Partial<QwenProviderConfig> {
  return {
    auth: {
      type: 'qwen',
      accessTokenFile: `${tokenDir}/qwen-access.json`,
      refreshTokenFile: `${tokenDir}/qwen-refresh.json`,
      autoRefresh: true,
      refreshThreshold: 300000, // 5 minutes
      deviceFlow: {
        enabled: true,
        clientId,
        scope: 'openid profile email',
        pkce: true,
        authEndpoint: 'https://dashscope.aliyuncs.com/api/v1/oauth2/device',
        tokenEndpoint: 'https://dashscope.aliyuncs.com/api/v1/oauth2/token',
        pollingInterval: 5000,
        maxPollingAttempts: 60
      }
    },
    debug: {
      enabled: true,
      logLevel: 'debug',
      logDir: './logs'
    }
  };
}

/**
 * Validate Qwen provider configuration
 * @param config - Configuration to validate
 * @returns Validation result with errors if any
 */
export function validateQwenConfig(config: Partial<QwenProviderConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.auth) {
    errors.push('Authentication configuration is required');
    return { valid: false, errors };
  }

  if (!config.auth.deviceFlow?.enabled) {
    errors.push('Device flow must be enabled');
  }

  if (!config.auth.deviceFlow?.clientId) {
    errors.push('Client ID is required for device flow');
  }

  if (!config.auth.deviceFlow?.authEndpoint) {
    errors.push('Auth endpoint is required for device flow');
  }

  if (!config.auth.deviceFlow?.tokenEndpoint) {
    errors.push('Token endpoint is required for device flow');
  }

  if (!config.auth.accessTokenFile) {
    errors.push('Access token file path is required');
  }

  if (!config.auth.refreshTokenFile) {
    errors.push('Refresh token file path is required');
  }

  if (!config.endpoint) {
    errors.push('API endpoint is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create module info for Qwen provider
 * @param id - Module ID (optional, will generate if not provided)
 * @param version - Module version (default: '0.1.0')
 * @returns ModuleInfo object
 */
export function createQwenModuleInfo(
  id?: string,
  version: string = '0.1.0'
): ModuleInfo {
  return {
    id: id || `qwen-provider-${Date.now()}`,
    name: 'Qwen Provider',
    version,
    description: 'Qwen AI service provider with OAuth2 authentication',
    dependencies: ['rcc-basemodule'],
    config: {}
  };
}