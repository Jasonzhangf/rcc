import { 
  ErrorContext, 
  ErrorResponse, 
  ModuleRegistration
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