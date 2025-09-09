import { ModuleInfo } from '../../../interfaces/ModuleInfo';

/**
 * Log levels for debugging
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Interface for the Debug Module
 * Defines all methods that BaseModule can call on DebugModule
 */
export interface IDebugModule {
  /**
   * Logs a message with module information and call stack
   * @param message - Message to log
   * @param level - Log level (default: INFO)
   * @param moduleInfo - Module information (optional)
   */
  log(message: string, level?: LogLevel, moduleInfo?: ModuleInfo): void;

  /**
   * Records data flow between modules
   * @param sourceModuleId - Source module ID
   * @param targetModuleId - Target module ID
   * @param data - Data being transferred
   */
  recordDataFlow(sourceModuleId: string, targetModuleId: string, data: any): void;

  /**
   * Adds a module connection for data flow recording
   * @param moduleId - Module ID
   * @param connectionType - Connection type
   */
  addModuleConnection(moduleId: string, connectionType: 'input' | 'output'): void;

  /**
   * Removes a module connection
   * @param moduleId - Module ID
   */
  removeModuleConnection(moduleId: string): void;
}