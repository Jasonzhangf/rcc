import { 
  ErrorContext, 
  ErrorResponse, 
  ModuleResponse,
  ModuleAnnotation,
  ErrorHandlingConfig,
  ModuleSource,
  ErrorClassification,
  ErrorSource,
  ErrorType,
  ErrorSeverity,
  ErrorImpact,
  ErrorRecoverability,
  AnnotationType,
  HandlingStatus,
  ResponseStatus,
  ModuleInfo,
  ModuleRegistration,
  ResponseHandler,
  RetryPolicy,
  CircuitBreakerConfig
} from '../../../interfaces/SharedTypes';

export interface IErrorHandlingCenter {
  initialize(): Promise<void>;
  handleError(error: ErrorContext): Promise<ErrorResponse>;
  handleErrorAsync(error: ErrorContext): void;
  handleBatchErrors(errors: ErrorContext[]): Promise<ErrorResponse[]>;
  registerModule(module: ModuleRegistration): void;
  unregisterModule(moduleId: string): void;
  shutdown(): Promise<void>;
}