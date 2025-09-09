import { 
  ErrorContext, 
  ErrorResponse, 
  ErrorQueueManager as IErrorQueueManager,
  QueueStatus 
} from '../../types/ErrorHandlingCenter.types';
import { ERROR_HANDLING_CENTER_CONSTANTS } from '../../constants/ErrorHandlingCenter.constants';

/**
 * Error Queue Manager - Manages error queue, priority, and distribution
 * Handles error queue operations with priority management and flow control
 */
export class ErrorQueueManager implements IErrorQueueManager {
  private queue: ErrorContext[] = [];
  private priorityQueue: Map<string, ErrorContext[]> = new Map();
  private isProcessing: boolean = false;
  private isInitialized: boolean = false;
  private flushTimer: NodeJS.Timeout | null = null;
  
  private readonly maxQueueSize: number;
  private readonly flushInterval: number;
  private readonly enableBatchProcessing: boolean;
  private readonly maxBatchSize: number;
  
  /**
   * Constructs the Error Queue Manager
   * @param config - Configuration for the queue manager
   */
  constructor(config?: {
    maxQueueSize?: number;
    flushInterval?: number;
    enableBatchProcessing?: boolean;
    maxBatchSize?: number;
  }) {
    this.maxQueueSize = config?.maxQueueSize || ERROR_HANDLING_CENTER_CONSTANTS.DEFAULT_QUEUE_SIZE;
    this.flushInterval = config?.flushInterval || ERROR_HANDLING_CENTER_CONSTANTS.QUEUE_FLUSH_INTERVAL;
    this.enableBatchProcessing = config?.enableBatchProcessing ?? true;
    this.maxBatchSize = config?.maxBatchSize || 100;
    
    // Initialize priority queues
    this.initializePriorityQueues();
  }

  /**
   * Initialize the queue manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Start flush timer if batch processing is enabled
      if (this.enableBatchProcessing) {
        this.startFlushTimer();
      }
      
      this.isInitialized = true;
      console.log('Error Queue Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Error Queue Manager:', error);
      throw error;
    }
  }

  /**
   * Add error to queue based on priority
   * @param error - Error context to add to queue
   */
  public enqueue(error: ErrorContext): void {
    this.ensureInitialized();
    
    try {
      // Check queue capacity and make room if needed
      if (this.queue.length >= this.maxQueueSize) {
        this.evictLowPriorityErrors();
      }
      
      // Ensure we have space (should be true after eviction)
      if (this.queue.length < this.maxQueueSize) {
        // Add to appropriate priority queue
        const priority = this.getPriorityKey(error.classification.severity);
        const priorityQueue = this.priorityQueue.get(priority);
        if (priorityQueue) {
          priorityQueue.push(error);
        }
        
        // Add to main queue
        this.queue.push(error);
        
        console.log(`Error ${error.errorId} enqueued with priority ${priority}`);
      } else {
        // If still no space, don't add the error
        console.warn(`Error ${error.errorId} not enqueued - queue still full after eviction`);
      }
    } catch (error) {
      const errorObj = error as Error;
      console.error(`Failed to enqueue error:`, errorObj);
      throw errorObj;
    }
  }

  /**
   * Remove and return next error from queue (highest priority first)
   * @returns ErrorContext or null if queue is empty
   */
  public dequeue(): ErrorContext | null {
    this.ensureInitialized();
    
    if (this.queue.length === 0) {
      return null;
    }

    // Get highest priority error
    const error = this.getHighestPriorityError();
    
    // Remove from main queue and priority queue
    const index = this.queue.findIndex(e => e.errorId === error.errorId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
    
    this.removeFromPriorityQueue(error);
    
    return error;
  }

  /**
   * Get current queue size
   * @returns Current queue size
   */
  public getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get queue status
   * @returns Queue status information
   */
  public getQueueStatus(): QueueStatus {
    const priorityCounts = this.getPriorityCounts();
    
    return {
      size: this.queue.length,
      Processing: this.isProcessing,
      flushed: false,
      lastProcessTime: this.getLastProcessTime(),
      nextProcessTime: this.getNextProcessTime(),
      priorityCounts
    };
  }

  /**
   * Flush the queue and process all pending errors
   * @returns Promise<ErrorResponse[]> - Array of responses for flushed errors
   */
  public async flush(): Promise<ErrorResponse[]> {
    this.ensureInitialized();
    
    if (this.queue.length === 0) {
      return [];
    }

    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      console.log(`Flushing queue with ${this.queue.length} errors`);
      
      // Get all errors in order
      const errorsToProcess: ErrorContext[] = [];
      while (this.queue.length > 0) {
        const error = this.dequeue();
        if (error) {
          errorsToProcess.push(error);
        }
      }

      // Process batch of errors
      const responses: ErrorResponse[] = [];
      for (const error of errorsToProcess) {
        try {
          // For flush operation, we return empty responses since processing
          // will be handled by the router engine
          const response: ErrorResponse = {
            responseId: `flush_${error.errorId}_${Date.now()}`,
            errorId: error.errorId,
            result: {
              status: 'success' as any,
              message: 'Error flushed from queue',
              details: 'Error moved from queue to processing pipeline',
              code: 'QUEUE_FLUSHED'
            },
            timestamp: new Date(),
            processingTime: Date.now() - startTime,
            data: {
              moduleName: error.source.moduleName,
              moduleId: error.source.moduleId,
              response: { message: 'Queue flush response' },
              config: error.config,
              metadata: { flushed: true }
            },
            actions: [],
            annotations: []
          };
          responses.push(response);
        } catch (error) {
          const errorObj = error as Error;
          console.error(`Error processing queued error:`, errorObj);
        }
      }

      const flushTime = Date.now() - startTime;
      console.log(`Queue flushed ${responses.length} errors in ${flushTime}ms`);
      
      this.isProcessing = false;
      return responses;
    } catch (error) {
      this.isProcessing = false;
      console.error('Error during queue flush:', error);
      throw error;
    }
  }

  /**
   * Shutdown the queue manager
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Shutting down Error Queue Manager...');
      
      // Stop flush timer
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }
      
      // Flush remaining errors
      if (this.queue.length > 0) {
        console.log(`Flushing ${this.queue.length} remaining errors before shutdown`);
        await this.flush();
      }
      
      this.isInitialized = false;
      console.log('Error Queue Manager shutdown completed');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get priority counts for each severity level
   * @returns Priority counts
   */
  public getPriorityCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [priority, queue] of this.priorityQueue.entries()) {
      counts[priority] = queue.length;
    }
    return counts;
  }

  /**
   * Initialize priority queues
   */
  private initializePriorityQueues(): void {
    const priorities = ['critical', 'high', 'medium', 'low'];
    for (const priority of priorities) {
      this.priorityQueue.set(priority, []);
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      try {
        if (this.queue.length > 0 && !this.isProcessing) {
          await this.flush();
        }
      } catch (error) {
        console.error('Error in automatic flush:', error);
      }
    }, this.flushInterval);
  }

  /**
   * Get priority key from severity
   * @param severity - Error severity
   * @returns Priority key
   */
  private getPriorityKey(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Get highest priority error from queue
   * @returns Highest priority error
   */
  private getHighestPriorityError(): ErrorContext {
    // Check priority order: critical -> high -> medium -> low
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    
    for (const priority of priorityOrder) {
      const queue = this.priorityQueue.get(priority);
      if (queue && queue.length > 0) {
        return queue[0]; // Get first error in this priority
      }
    }
    
    // Should not reach here, but fallback to main queue
    return this.queue[0];
  }

  /**
   * Remove error from priority queue
   * @param error - Error to remove
   */
  private removeFromPriorityQueue(error: ErrorContext): void {
    const priority = this.getPriorityKey(error.classification.severity);
    const queue = this.priorityQueue.get(priority);
    if (queue) {
      const index = queue.findIndex(e => e.errorId === error.errorId);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    }
  }

  /**
   * Evict low priority errors when queue is full
   */
  private evictLowPriorityErrors(): void {
    const toEvict = Math.max(1, Math.floor(this.queue.length * 0.1)); // Evict at least 1, or 10%
    let evictedCount = 0;
    
    // Evict from low to high priority
    const priorityOrder = ['low', 'medium', 'high'];
    
    for (const priority of priorityOrder) {
      if (evictedCount >= toEvict) break;
      
      const queue = this.priorityQueue.get(priority);
      if (queue && queue.length > 0) {
        const evicted = queue.splice(0, Math.min(toEvict - evictedCount, queue.length));
        evictedCount += evicted.length;
        
        // Remove from main queue
        for (const error of evicted) {
          const index = this.queue.findIndex(e => e.errorId === error.errorId);
          if (index !== -1) {
            this.queue.splice(index, 1);
          }
          console.warn(`Evicted error ${error.errorId} due to queue capacity`);
        }
      }
    }
  }

  /**
   * Get last process time
   * @returns Last process time or undefined
   */
  private getLastProcessTime(): Date | undefined {
    // This would need to be tracked properly in a real implementation
    return undefined;
  }

  /**
   * Get next process time
   * @returns Next process time or undefined
   */
  private getNextProcessTime(): Date | undefined {
    if (this.flushTimer) {
      return new Date(Date.now() + this.flushInterval);
    }
    return undefined;
  }

  /**
   * Ensure queue manager is initialized
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Error Queue Manager is not initialized. Call initialize() first.');
    }
  }
}