/**
 * Error handling center types and interfaces
 */

import { 
  ModuleInfo, 
  Message, 
  MessageResponse,
  ErrorSeverity,
  ErrorRecoverability,
  ErrorImpact,
  ErrorSource
} from 'rcc-basemodule';

/**
 * Error context interface
 */
export interface ErrorContext {
  error: Error | string;
  source: ErrorSource | string;
  severity: ErrorSeverity | string;
  timestamp: number;
  moduleId?: string;
  context?: Record<string, any>;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: boolean;
  message: string;
  actionTaken?: string;
  timestamp: number;
  errorId?: string;
  details?: Record<string, any>;
}

/**
 * Module registration interface
 */
export interface ModuleRegistration {
  moduleId: string;
  moduleInfo: ModuleInfo;
  errorHandlers: ErrorHandler[];
  priority: number;
}

/**
 * Error handler interface
 */
export interface ErrorHandler {
  errorType: string;
  handler: (error: ErrorContext) => Promise<ErrorResponse>;
  priority: number;
}

/**
 * Error handling center main interface
 */
export interface IErrorHandlingCenter {
  initialize(): Promise<void>;
  handleError(error: ErrorContext): Promise<ErrorResponse>;
  handleErrorAsync(error: ErrorContext): void;
  handleBatchErrors(errors: ErrorContext[]): Promise<ErrorResponse[]>;
  registerModule(module: ModuleRegistration): void;
  unregisterModule(moduleId: string): void;
  shutdown(): Promise<void>;
  getHealth(): {
    isInitialized: boolean;
    registeredModules: number;
    totalErrorsProcessed: number;
    uptime: number;
  };
}