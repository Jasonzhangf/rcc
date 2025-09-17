/**
 * Interface for debug module
 */
export interface IDebugModule {
  /**
   * Log a message
   * @param message - Message to log
   * @param level - Log level (optional)
   * @param moduleInfo - Module information (optional)
   */
  log(message: string, level?: number, moduleInfo?: any): void;

  /**
   * Record data flow between modules
   * @param sourceModuleId - Source module ID
   * @param targetModuleId - Target module ID
   * @param data - Data being transferred
   */
  recordDataFlow(sourceModuleId: string, targetModuleId: string, data: any): void;

  /**
   * Add module connection
   * @param moduleId - Module ID
   * @param connectionType - Connection type
   */
  addModuleConnection(moduleId: string, connectionType: 'input' | 'output'): void;

  /**
   * Remove module connection
   * @param moduleId - Module ID
   */
  removeModuleConnection(moduleId: string): void;
}

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
