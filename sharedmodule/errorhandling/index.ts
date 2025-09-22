/**
 * Simple ErrorHandling Center for RCC
 * Basic error handling functionality
 */

import { BaseModule } from 'rcc-basemodule';
import { ModuleInfo } from 'rcc-basemodule';

/**
 * Simple error context
 */
export interface ErrorContext {
  error: Error | string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  moduleId?: string;
  context?: Record<string, any>;
}

/**
 * Simple error response
 */
export interface ErrorResponse {
  success: boolean;
  message: string;
  actionTaken?: string;
  timestamp: number;
  errorId?: string;
}

/**
 * Simple ErrorHandling Center extending BaseModule
 */
export class ErrorHandlingCenter extends BaseModule {
  private _isInitialized: boolean = false;
  private errorCount: number = 0;
  private startTime: number = Date.now();

  constructor(moduleInfo?: ModuleInfo) {
    const defaultInfo: ModuleInfo = {
      id: 'error-handling-center',
      name: 'ErrorHandlingCenter',
      version: '1.0.0',
      description: 'Simple error handling center for RCC',
      type: 'error-handling'
    };

    super(moduleInfo || defaultInfo);
  }

  /**
   * Initialize the error handling center
   */
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing ErrorHandlingCenter');
      this._isInitialized = true;
      console.log('ErrorHandlingCenter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ErrorHandlingCenter:', error);
      throw error;
    }
  }

  /**
   * Handle an error
   */
  public async handleError(error: ErrorContext): Promise<ErrorResponse> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    this.errorCount++;
    const errorId = `error_${this.errorCount}_${Date.now()}`;

    console.error('Error received:', {
      errorId,
      error: error.error,
      source: error.source,
      severity: error.severity,
      moduleId: error.moduleId
    });

    // Basic error handling - just log and acknowledge
    const response: ErrorResponse = {
      success: true,
      message: `Error processed: ${typeof error.error === 'string' ? error.error : error.error.message}`,
      actionTaken: 'logged',
      timestamp: Date.now(),
      errorId
    };

    console.log('Error handled successfully:', { errorId, response });
    return response;
  }

  /**
   * Handle error asynchronously (fire and forget)
   */
  public handleErrorAsync(error: ErrorContext): void {
    this.handleError(error).catch(err => {
      console.error('Failed to handle async error:', err);
    });
  }

  /**
   * Handle batch errors
   */
  public async handleBatchErrors(errors: ErrorContext[]): Promise<ErrorResponse[]> {
    const responses: ErrorResponse[] = [];
    
    for (const error of errors) {
      try {
        const response = await this.handleError(error);
        responses.push(response);
      } catch (err) {
        responses.push({
          success: false,
          message: `Failed to handle error: ${err}`,
          timestamp: Date.now()
        });
      }
    }

    return responses;
  }

  /**
   * Get health status
   */
  public getHealth() {
    return {
      isInitialized: this._isInitialized,
      errorCount: this.errorCount,
      uptime: Date.now() - this.startTime,
      lastError: this.errorCount > 0 ? `Last error was error_${this.errorCount}` : 'No errors'
    };
  }

  /**
   * Get error statistics
   */
  public getStats() {
    return {
      totalErrors: this.errorCount,
      uptime: Date.now() - this.startTime,
      isInitialized: this._isInitialized,
      moduleId: 'error-handling-center',
      moduleName: 'ErrorHandlingCenter'
    };
  }

  /**
   * Reset error count
   */
  public resetErrorCount(): void {
    this.errorCount = 0;
    console.log('Error count reset');
  }

  /**
   * Destroy the error handling center
   */
  public async destroy(): Promise<void> {
    try {
      console.log('Destroying ErrorHandlingCenter:', {
        finalErrorCount: this.errorCount,
        uptime: Date.now() - this.startTime
      });

      this._isInitialized = false;
      console.log('ErrorHandlingCenter destroyed successfully');
    } catch (error) {
      console.error('Failed to destroy ErrorHandlingCenter:', error);
      throw error;
    }
  }

  /**
   * Override BaseModule methods
   */
  public isInitialized(): boolean {
    return this._isInitialized;
  }

  public isRunning(): boolean {
    return this._isInitialized;
  }
}

// Version info
export const ErrorHandlingCenterVersion = '1.0.0';

// Default export
export default ErrorHandlingCenter;