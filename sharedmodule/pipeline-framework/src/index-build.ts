/**
 * Build-ready exports for OpenAI Compatible Providers
 * 构建就绪的OpenAI兼容提供商导出
 */

// Import and export SimpleDebugLogManager and types
import { SimpleDebugLogManager } from './framework/SimpleDebugLogManager';
import { DEFAULT_DEBUG_CONFIG } from './types/debug-types';

export { SimpleDebugLogManager };
export { DEFAULT_DEBUG_CONFIG };
export type { DebugConfig } from './types/debug-types';

// Export basic provider interfaces
export interface ProviderConfig {
  name: string;
  endpoint: string;
  supportedModels?: string[];
  defaultModel?: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  totalTokens: number;
}

// Default export
export default {
  SimpleDebugLogManager,
  DEFAULT_DEBUG_CONFIG
};