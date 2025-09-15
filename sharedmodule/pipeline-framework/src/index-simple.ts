/**
 * Simple exports for debug logging
 * 简单调试日志导出
 */

import { SimpleDebugLogManager } from './framework/SimpleDebugLogManager';
import { DEFAULT_DEBUG_CONFIG } from './types/debug-types';
import type { DebugConfig } from './types/debug-types';

export { SimpleDebugLogManager };
export { DEFAULT_DEBUG_CONFIG };
export type { DebugConfig };

// Re-export for compatibility
export {
  SimpleDebugLogManager as DebugLogManager,
  DEFAULT_DEBUG_CONFIG as default
};