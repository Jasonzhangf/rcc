// Note: DebugModule interface has been moved to rcc-debugcenter package
// Import IDebugModule from 'rcc-debugcenter' instead

/**
 * Debug level enumeration
 */
export enum DebugLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

/**
 * Debug log entry interface
 */
export interface DebugLogEntry {
  message: string;
  level: DebugLevel;
  timestamp: number;
  moduleId?: string;
  metadata?: any;
}

/**
 * Debug configuration interface
 */
export interface DebugConfig {
  enabled: boolean;
  level: DebugLevel;
  maxEntries: number;
  includeTimestamps: boolean;
  includeModuleInfo: boolean;
}
