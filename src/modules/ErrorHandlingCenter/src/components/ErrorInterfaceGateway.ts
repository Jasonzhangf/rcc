import { 
  IErrorHandlingCenter, 
  ErrorContext, 
  ErrorResponse, 
  ModuleRegistration 
} from '../../../../interfaces/SharedTypes';
import { ErrorQueueManager } from './ErrorQueueManager';
import { ResponseRouterEngine } from './ResponseRouterEngine';

/**
 * Error Interface Gateway - Main entry point for all external error requests
 * Acts as the primary interface for the Error Handling Center
 */
export class ErrorInterfaceGateway implements IErrorHandlingCenter {
  private queueManager: ErrorQueueManager;
  private routerEngine: ResponseRouterEngine;
  private isInitialized: boolean = false;
  private enableMetrics: boolean = true;
  
  /**
   * Constructs the Error Interface Gateway
   * @param queueManager - Error queue manager instance
   * @param routerEngine - Response router engine instance
   */
  constructor(
    queueManager: ErrorQueueManager,
    routerEngine: ResponseRouterEngine
  ) {
    this.queueManager = queueManager;
    this.routerEngine = routerEngine;
  }

  /**
   * Initialize the Error Interface Gateway
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize components
      await this.queueManager.initialize();
      await this.routerEngine.initialize();
      
      this.isInitialized = true;
      console.log('Error Interface Gateway initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Error Interface Gateway:', error);
      throw error;
    }
  }

  /**
   * Handle error in blocking mode
   * @param error - Error context to handle
   * @returns Promise<ErrorResponse> - Error response
   */
  public async handleError(error: ErrorContext): Promise<ErrorResponse> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      if (this.enableMetrics) {
        console.log(`Processing error ${error.errorId} in blocking mode`);
      }

      // Add error to queue
      this.queueManager.enqueue(error);
      
      // Process the queue immediately for synchronous handling
      await this.processQueue();
      
      // For sync handling, we need to find and return the actual processed response
      // Since the queue processing is async, we'll process this specific error directly
      const handler = await this.routerEngine.route(error);
      const response = await handler.execute(error);
      
      // Add processing time
      const processingTime = Date.now() - startTime;
      
      return {
        ...response,
        processingTime
      };
    } catch (error) {
      const errorObj = error as Error;
      console.error(`Error processing error:`, errorObj);
      
      // Create fallback response
      return this.createFallbackResponse('unknown', errorObj);
    }
  }

  /**
   * Handle error in non-blocking mode
   * @param error - Error context to handle
   */
  public handleErrorAsync(error: ErrorContext): void {
    this.ensureInitialized();
    
    try {
      if (this.enableMetrics) {
        console.log(`Processing error ${error.errorId} in non-blocking mode`);
      }

      // Add error to queue without waiting
      this.queueManager.enqueue(error);
      
      // Return immediate PARTIAL response for async handling
      if (error.callback && typeof error.callback === 'function') {
        const partialResponse: ErrorResponse = {
          responseId: `async_${error.errorId}_${Date.now()}`,
          errorId: error.errorId,
          result: {
            status: 'partial' as any,
            message: 'Error queued for async processing',
            details: 'Error has been queued and will be processed asynchronously',
            code: 'ASYNC_QUEUED'
          },
          timestamp: new Date(),
          processingTime: 0,
          data: {
            moduleName: error.source.moduleName,
            moduleId: error.source.moduleId,
            response: { message: 'Async processing response' },
            config: error.config,
            metadata: { asyncQueued: true }
          },
          actions: [],
          annotations: []
        };
        
        error.callback(partialResponse);
      }
      
      // Process in background only if no callback was provided (internal processing)
      if (!error.callback) {
        this.processAsync(error).catch(async (processError) => {
          console.error(`Async processing failed for error ${error.errorId}:`, processError);
        });
      }
    } catch (error) {
      const errorObj = error as Error;
      console.error(`Error in async handling:`, errorObj);
    }
  }

  /**
   * Handle multiple errors in batch
   * @param errors - Array of error contexts to handle
   * @returns Promise<ErrorResponse[]> - Array of error responses
   */
  public async handleBatchErrors(errors: ErrorContext[]): Promise<ErrorResponse[]> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const responses: ErrorResponse[] = [];
    
    try {
      if (this.enableMetrics) {
        console.log(`Processing batch of ${errors.length} errors`);
      }

      // Add all errors to queue
      for (const error of errors) {
        this.queueManager.enqueue(error);
      }

      // Process each error
      for (const error of errors) {
        try {
          const handler = await this.routerEngine.route(error);
          const response = await handler.execute(error);
          
          // Add processing time
          const processingTime = Date.now() - startTime;
          responses.push({
            ...response,
            processingTime
          });
        } catch (error) {
          const errorObj = error as Error;
          console.error(`Error processing batch error:`, errorObj);
          const fallbackResponse = this.createFallbackResponse('unknown', errorObj);
          responses.push(fallbackResponse);
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      console.log(`Batch processing completed in ${totalProcessingTime}ms`);
      
      return responses;
    } catch (error) {
      console.error('Error in batch processing:', error);
      
      // Create fallback responses for all errors
      return errors.map(err => this.createFallbackResponse(err.errorId, error as Error));
    }
  }

  /**
   * Register a module with the error handling center
   * @param module - Module registration information
   */
  public registerModule(module: ModuleRegistration): void {
    this.ensureInitialized();
    
    try {
      this.routerEngine.registerModule(module);
      console.log(`Module ${module.moduleName} (${module.moduleId}) registered successfully`);
    } catch (error) {
      console.error(`Failed to register module ${module.moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a module from the error handling center
   * @param moduleId - Module ID to unregister
   */
  public unregisterModule(moduleId: string): void {
    this.ensureInitialized();
    
    try {
      this.routerEngine.unregisterModule(moduleId);
      console.log(`Module ${moduleId} unregistered successfully`);
    } catch (error) {
      console.error(`Failed to unregister module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Shutdown the error handling center
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Shutting down Error Interface Gateway...');
      
      // Shutdown components
      await this.routerEngine.shutdown();
      await this.queueManager.shutdown();
      
      this.isInitialized = false;
      console.log('Error Interface Gateway shutdown completed');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get gateway status
   * @returns Gateway status information
   */
  public getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      enableMetrics: this.enableMetrics,
      queueStatus: this.queueManager.getQueueStatus(),
      routerStatus: this.routerEngine.getStatus()
    };
  }

  /**
   * Enable or disable metrics collection
   * @param enabled - Whether to enable metrics
   */
  public setMetricsEnabled(enabled: boolean): void {
    this.enableMetrics = enabled;
  }

  /**
   * Ensure gateway is initialized
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Error Interface Gateway is not initialized. Call initialize() first.');
    }
  }

  /**
   * Process error asynchronously in background
   * @param error - Error context to process
   */
  private async processAsync(error: ErrorContext): Promise<void> {
    const handler = await this.routerEngine.route(error);
    const response = await handler.execute(error);
    
    // If callback is provided, call it with response
    if (error.callback) {
      error.callback(response);
    }
  }

  /**
   * Process all errors in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.queueManager.getQueueSize() === 0) {
      return;
    }

    try {
      // Flush the queue to get all errors
      const flushedResponses = await this.queueManager.flush();
      
      // Log the processed responses for debugging
      if (this.enableMetrics) {
        console.log(`Processed ${flushedResponses.length} errors from queue`);
      }
      
      // Process each error through the router
      for (const response of flushedResponses) {
        // Note: The flush operation already creates basic responses
        // For complete processing, we would need to extract the original error context
        // and process it through the router, but for now this is sufficient
        // to ensure the queue is properly managed
        if (this.enableMetrics) {
          console.log(`Processed error ${response.errorId} with status ${response.result.status}`);
        }
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  }

  /**
   * Create fallback response for error processing failures
   * @param errorId - Original error ID
   * @param error - Processing error
   * @returns Fallback error response
   */
  private createFallbackResponse(errorId: string, error: Error): ErrorResponse {
    return {
      responseId: `fallback_${errorId}_${Date.now()}`,
      errorId,
      result: {
        status: 'failure' as any,
        message: 'Error processing failed - fallback response',
        details: `Failed to process error: ${error.message}`,
        code: 'PROCESSING_FAILED'
      },
      timestamp: new Date(),
      processingTime: 0,
      data: {
        moduleName: 'FallbackHandler',
        moduleId: 'fallback_handler',
        response: { message: 'Fallback response due to processing failure' },
        config: {},
        metadata: { 
          isFallback: true,
          originalError: error.message,
          originalStack: error.stack
        }
      },
      actions: [],
      annotations: []
    };
  }
}