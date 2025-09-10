import { ErrorContext, ErrorResponse, ErrorQueueManager as IErrorQueueManager, QueueStatus } from '../../../SharedTypes';
/**
 * Error Queue Manager - Manages error queue, priority, and distribution
 * Handles error queue operations with priority management and flow control
 */
export declare class ErrorQueueManager implements IErrorQueueManager {
    private queue;
    private priorityQueue;
    private isProcessing;
    private isInitialized;
    private flushTimer;
    private readonly maxQueueSize;
    private readonly flushInterval;
    private readonly enableBatchProcessing;
    /**
     * Constructs the Error Queue Manager
     * @param config - Configuration for the queue manager
     */
    constructor(config?: {
        maxQueueSize?: number;
        flushInterval?: number;
        enableBatchProcessing?: boolean;
        maxBatchSize?: number;
    });
    /**
     * Initialize the queue manager
     */
    initialize(): Promise<void>;
    /**
     * Add error to queue based on priority
     * @param error - Error context to add to queue
     */
    enqueue(error: ErrorContext): void;
    /**
     * Remove and return next error from queue (highest priority first)
     * @returns ErrorContext or null if queue is empty
     */
    dequeue(): ErrorContext | null;
    /**
     * Get current queue size
     * @returns Current queue size
     */
    getQueueSize(): number;
    /**
     * Get queue status
     * @returns Queue status information
     */
    getQueueStatus(): QueueStatus;
    /**
     * Flush the queue and process all pending errors
     * @returns Promise<ErrorResponse[]> - Array of responses for flushed errors
     */
    flush(): Promise<ErrorResponse[]>;
    /**
     * Shutdown the queue manager
     */
    shutdown(): Promise<void>;
    /**
     * Get priority counts for each severity level
     * @returns Priority counts
     */
    getPriorityCounts(): Record<string, number>;
    /**
     * Initialize priority queues
     */
    private initializePriorityQueues;
    /**
     * Start automatic flush timer
     */
    private startFlushTimer;
    /**
     * Get priority key from severity
     * @param severity - Error severity
     * @returns Priority key
     */
    private getPriorityKey;
    /**
     * Get highest priority error from queue
     * @returns Highest priority error
     */
    private getHighestPriorityError;
    /**
     * Remove error from priority queue
     * @param error - Error to remove
     */
    private removeFromPriorityQueue;
    /**
     * Evict low priority errors when queue is full
     */
    private evictLowPriorityErrors;
    /**
     * Get last process time
     * @returns Last process time or undefined
     */
    private getLastProcessTime;
    /**
     * Get next process time
     * @returns Next process time or undefined
     */
    private getNextProcessTime;
    /**
     * Ensure queue manager is initialized
     * @throws Error if not initialized
     */
    private ensureInitialized;
}
