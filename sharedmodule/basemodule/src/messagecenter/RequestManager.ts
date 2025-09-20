import { Message, MessageResponse } from '../interfaces/Message';
import { v4 as uuidv4 } from 'uuid';

/**
 * Manages request/response lifecycle with timeout handling
 */
export class RequestManager {
  private pendingRequests: Map<
    string,
    {
      resolve: (response: MessageResponse) => void;
      reject: (error: any) => void;
      timeoutId: NodeJS.Timeout;
      startTime: number;
    }
  > = new Map();

  /**
   * Create a new pending request
   * @param correlationId - Request correlation ID
   * @param timeout - Timeout in milliseconds
   * @returns Promise that resolves to response or rejects on timeout
   */
  public createRequest(correlationId: string, timeout: number = 30000): Promise<MessageResponse> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeoutId,
        startTime: Date.now(),
      });
    });
  }

  /**
   * Create a pending request with callback support
   * @param correlationId - Request correlation ID
   * @param callback - Callback function
   * @param timeout - Timeout in milliseconds
   */
  public createRequestAsync(
    correlationId: string,
    callback: (response: MessageResponse) => void,
    timeout: number = 30000
  ): void {
    const timeoutId = setTimeout(() => {
      this.pendingRequests.delete(correlationId);
      callback({
        messageId: '',
        correlationId,
        success: false,
        error: `Request timeout after ${timeout}ms`,
        timestamp: Date.now(),
      });
    }, timeout);

    this.pendingRequests.set(correlationId, {
      resolve: (response: MessageResponse) => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(correlationId);
        callback(response);
      },
      reject: (error: any) => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(correlationId);
        callback({
          messageId: '',
          correlationId,
          success: false,
          error: error.message || 'Unknown error',
          timestamp: Date.now(),
        });
      },
      timeoutId,
      startTime: Date.now(),
    });
  }

  /**
   * Resolve a pending request
   * @param correlationId - Request correlation ID
   * @param response - Response to send
   * @returns True if request was found and resolved
   */
  public resolveRequest(correlationId: string, response: MessageResponse): boolean {
    const request = this.pendingRequests.get(correlationId);
    if (!request) {
      return false;
    }

    clearTimeout(request.timeoutId);
    request.resolve(response);
    this.pendingRequests.delete(correlationId);
    return true;
  }

  /**
   * Reject a pending request
   * @param correlationId - Request correlation ID
   * @param error - Error to reject with
   * @returns True if request was found and rejected
   */
  public rejectRequest(correlationId: string, error: any): boolean {
    const request = this.pendingRequests.get(correlationId);
    if (!request) {
      return false;
    }

    clearTimeout(request.timeoutId);
    request.reject(error);
    this.pendingRequests.delete(correlationId);
    return true;
  }

  /**
   * Check if a request is pending
   * @param correlationId - Request correlation ID
   * @returns True if request is pending
   */
  public hasPendingRequest(correlationId: string): boolean {
    return this.pendingRequests.has(correlationId);
  }

  /**
   * Get the number of pending requests
   * @returns Number of pending requests
   */
  public getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get response time for a completed request
   * @param correlationId - Request correlation ID
   * @returns Response time in milliseconds or undefined if not found
   */
  public getResponseTime(correlationId: string): number | undefined {
    const request = this.pendingRequests.get(correlationId);
    return request ? Date.now() - request.startTime : undefined;
  }

  /**
   * Cancel all pending requests
   * @param error - Error to reject pending requests with
   */
  public cancelAll(error: Error = new Error('All requests cancelled')): void {
    for (const [correlationId, request] of this.pendingRequests.entries()) {
      clearTimeout(request.timeoutId);
      request.reject(error);
    }
    this.pendingRequests.clear();
  }

  /**
   * Clean up expired requests older than specified time
   * @param maxAge - Maximum age in milliseconds
   * @returns Number of expired requests cleaned up
   */
  public cleanupExpired(maxAge: number): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [correlationId, request] of this.pendingRequests.entries()) {
      if (now - request.startTime > maxAge) {
        clearTimeout(request.timeoutId);
        request.reject(new Error(`Request expired after ${maxAge}ms`));
        this.pendingRequests.delete(correlationId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get all pending request correlation IDs
   * @returns Array of correlation IDs
   */
  public getPendingRequestIds(): string[] {
    return Array.from(this.pendingRequests.keys());
  }

  /**
   * Clear all pending requests without rejecting them
   */
  public clear(): void {
    for (const [, request] of this.pendingRequests.entries()) {
      clearTimeout(request.timeoutId);
    }
    this.pendingRequests.clear();
  }
}