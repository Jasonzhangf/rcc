/**
 * Error Management Center Interface
 * Defines methods for handling pipeline errors
 */

export interface IErrorManagementCenter {
  handleError(error: any, context?: any): void;
  getErrorHistory(): any[];
  clearErrorHistory(): void;
}

export interface SystemErrorManagementCenter extends IErrorManagementCenter {
  registerSystemErrorHandlers(): void;
}