/**
 * RCC Qwen Provider Module - Entry Point
 * 
 * A standalone module for integrating with Qwen AI services.
 * Provides OAuth2 authentication, token management, and OpenAI-compatible API interface.
 */

// Main module export
export { QwenProviderModule } from '../QwenProviderModule';

// Type exports
export type {
  QwenProviderConfig,
  QwenAuthConfig,
  AuthState,
  StoredToken,
  DeviceAuthorizationResponse,
  TokenResponse,
  DebugLogEntry,
  ProviderMetrics,
  AuthStatus,
  OpenAIChatRequest,
  OpenAIChatResponse
} from '../types/QwenProviderTypes';

// Utility functions
export { createQwenProvider } from '../utils/QwenProviderFactory';

// Version info
export const version = '0.1.0';
export const name = 'rcc-qwen-provider';