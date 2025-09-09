/**
 * ProvidersManager Constants
 */

export const PROVIDERS_MANAGER_CONSTANTS = {
  MODULE_NAME: 'ProvidersManager',
  MODULE_VERSION: '1.0.0',
  
  DEFAULT_CONFIG: {
    ENABLE_TESTING: true,
    TEST_TIMEOUT: 10000,
    MAX_RETRIES: 3,
    ENABLE_MODEL_DISCOVERY: true,
  },
  
  ERRORS: {
    PROVIDER_NOT_FOUND: 'Provider not found',
    PROVIDER_INVALID: 'Provider configuration is invalid',
    TEST_FAILED: 'Provider test failed',
    DISCOVERY_FAILED: 'Model discovery failed',
  },
} as const;