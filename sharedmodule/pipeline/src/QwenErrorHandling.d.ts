/**
 * Qwen Error Handling Configuration
 * Defines error handling strategies specific to Qwen authentication and provider operations
 */
import { PipelineErrorCode, ErrorHandlingStrategy } from '../ErrorTypes';
/**
 * Qwen-specific error handling strategies
 */
export declare const QWEN_ERROR_HANDLING_STRATEGIES: ErrorHandlingStrategy[];
/**
 * Get Qwen error handling strategies
 */
export declare function getQwenErrorHandlingStrategies(): ErrorHandlingStrategy[];
/**
 * Get all error handling strategies including Qwen-specific ones
 */
export declare function getAllErrorHandlingStrategies(): ErrorHandlingStrategy[];
/**
 * Get error handling strategy for a specific error code
 */
export declare function getQwenErrorHandlingStrategy(errorCode: PipelineErrorCode): ErrorHandlingStrategy | undefined;
/**
 * Check if an error code is Qwen-specific
 */
export declare function isQwenError(errorCode: PipelineErrorCode): boolean;
/**
 * Get recommended action for Qwen authentication errors
 */
export declare function getQwenAuthErrorAction(errorCode: PipelineErrorCode): 'retry' | 'maintenance' | 'blacklist_permanent' | 'failover';
/**
 * Get human-readable error message for Qwen errors
 */
export declare function getQwenErrorMessage(errorCode: PipelineErrorCode): string;
