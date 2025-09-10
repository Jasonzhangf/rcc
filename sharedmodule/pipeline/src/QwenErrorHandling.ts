/**
 * Qwen Error Handling Configuration
 * Defines error handling strategies specific to Qwen authentication and provider operations
 */

import { 
  PipelineErrorCode, 
  ErrorHandlingStrategy, 
  DEFAULT_ERROR_HANDLING_STRATEGIES 
} from '../ErrorTypes';

/**
 * Qwen-specific error handling strategies
 */
export const QWEN_ERROR_HANDLING_STRATEGIES: ErrorHandlingStrategy[] = [
  {
    errorCode: PipelineErrorCode.QWEN_DEVICE_CODE_EXPIRED,
    action: 'maintenance',
    retryCount: 0,
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.QWEN_AUTHORIZATION_PENDING,
    action: 'ignore',
    retryCount: 0,
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.QWEN_SLOW_DOWN,
    action: 'retry',
    retryCount: 3,
    retryDelay: 2000,
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.QWEN_ACCESS_DENIED,
    action: 'blacklist_permanent',
    retryCount: 0,
    shouldDestroyPipeline: true
  },
  {
    errorCode: PipelineErrorCode.QWEN_INVALID_CLIENT,
    action: 'blacklist_permanent',
    retryCount: 0,
    shouldDestroyPipeline: true
  },
  {
    errorCode: PipelineErrorCode.QWEN_INVALID_SCOPE,
    action: 'blacklist_permanent',
    retryCount: 0,
    shouldDestroyPipeline: true
  },
  {
    errorCode: PipelineErrorCode.QWEN_AUTH_SERVER_ERROR,
    action: 'failover',
    retryCount: 2,
    retryDelay: 1000,
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.QWEN_TEMPORARILY_UNAVAILABLE,
    action: 'blacklist_temporary',
    retryCount: 0,
    blacklistDuration: 300000, // 5 minutes
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.QWEN_INVALID_REQUEST,
    action: 'blacklist_permanent',
    retryCount: 0,
    shouldDestroyPipeline: true
  },
  {
    errorCode: PipelineErrorCode.QWEN_UNSUPPORTED_RESPONSE_TYPE,
    action: 'blacklist_permanent',
    retryCount: 0,
    shouldDestroyPipeline: true
  },
  {
    errorCode: PipelineErrorCode.QWEN_INVALID_GRANT,
    action: 'maintenance',
    retryCount: 0,
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.QWEN_UNAUTHORIZED_CLIENT,
    action: 'blacklist_permanent',
    retryCount: 0,
    shouldDestroyPipeline: true
  },
  {
    errorCode: PipelineErrorCode.QWEN_INVALID_DEVICE_CODE,
    action: 'maintenance',
    retryCount: 0,
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.QWEN_AUTHORIZATION_FAILED,
    action: 'maintenance',
    retryCount: 0,
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.QWEN_TOKEN_REFRESH_FAILED,
    action: 'maintenance',
    retryCount: 0,
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.QWEN_TOKEN_STORAGE_FAILED,
    action: 'failover',
    retryCount: 1,
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.QWEN_CONFIGURATION_INVALID,
    action: 'blacklist_permanent',
    retryCount: 0,
    shouldDestroyPipeline: true
  }
];

/**
 * Get Qwen error handling strategies
 */
export function getQwenErrorHandlingStrategies(): ErrorHandlingStrategy[] {
  return [...QWEN_ERROR_HANDLING_STRATEGIES];
}

/**
 * Get all error handling strategies including Qwen-specific ones
 */
export function getAllErrorHandlingStrategies(): ErrorHandlingStrategy[] {
  return [...DEFAULT_ERROR_HANDLING_STRATEGIES, ...QWEN_ERROR_HANDLING_STRATEGIES];
}

/**
 * Get error handling strategy for a specific error code
 */
export function getQwenErrorHandlingStrategy(errorCode: PipelineErrorCode): ErrorHandlingStrategy | undefined {
  return QWEN_ERROR_HANDLING_STRATEGIES.find(strategy => strategy.errorCode === errorCode);
}

/**
 * Check if an error code is Qwen-specific
 */
export function isQwenError(errorCode: PipelineErrorCode): boolean {
  return errorCode >= PipelineErrorCode.QWEN_DEVICE_CODE_EXPIRED && 
         errorCode <= PipelineErrorCode.QWEN_CONFIGURATION_INVALID;
}

/**
 * Get recommended action for Qwen authentication errors
 */
export function getQwenAuthErrorAction(errorCode: PipelineErrorCode): 'retry' | 'maintenance' | 'blacklist_permanent' | 'failover' {
  const strategy = getQwenErrorHandlingStrategy(errorCode);
  return strategy?.action || 'maintenance';
}

/**
 * Get human-readable error message for Qwen errors
 */
export function getQwenErrorMessage(errorCode: PipelineErrorCode): string {
  const errorMessages: Record<PipelineErrorCode, string> = {
    [PipelineErrorCode.QWEN_DEVICE_CODE_EXPIRED]: 'Device code has expired, please restart authentication',
    [PipelineErrorCode.QWEN_AUTHORIZATION_PENDING]: 'Waiting for user authorization',
    [PipelineErrorCode.QWEN_SLOW_DOWN]: 'Polling too fast, slowing down',
    [PipelineErrorCode.QWEN_ACCESS_DENIED]: 'User denied authorization',
    [PipelineErrorCode.QWEN_INVALID_CLIENT]: 'Invalid client configuration',
    [PipelineErrorCode.QWEN_INVALID_SCOPE]: 'Invalid scope requested',
    [PipelineErrorCode.QWEN_AUTH_SERVER_ERROR]: 'Authentication server error',
    [PipelineErrorCode.QWEN_TEMPORARILY_UNAVAILABLE]: 'Authentication service temporarily unavailable',
    [PipelineErrorCode.QWEN_INVALID_REQUEST]: 'Invalid authentication request',
    [PipelineErrorCode.QWEN_UNSUPPORTED_RESPONSE_TYPE]: 'Unsupported response type',
    [PipelineErrorCode.QWEN_INVALID_GRANT]: 'Invalid grant type',
    [PipelineErrorCode.QWEN_UNAUTHORIZED_CLIENT]: 'Unauthorized client',
    [PipelineErrorCode.QWEN_INVALID_DEVICE_CODE]: 'Invalid device code',
    [PipelineErrorCode.QWEN_AUTHORIZATION_FAILED]: 'Authorization failed',
    [PipelineErrorCode.QWEN_TOKEN_REFRESH_FAILED]: 'Token refresh failed',
    [PipelineErrorCode.QWEN_TOKEN_STORAGE_FAILED]: 'Token storage failed',
    [PipelineErrorCode.QWEN_CONFIGURATION_INVALID]: 'Invalid Qwen configuration'
  };
  
  return errorMessages[errorCode] || 'Unknown Qwen authentication error';
}