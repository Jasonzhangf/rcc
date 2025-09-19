/**
 * Debug Event Bus - 事件驱动的调试通信总线
 * Event-driven debug communication bus
 */

// DebugEvent interface defined here to avoid circular imports
export interface DebugEvent {
  sessionId: string;
  moduleId: string;
  operationId: string;
  timestamp: number;
  type: 'start' | 'end' | 'error';
  position: 'start' | 'middle' | 'end';
  data?: any;
}

export class DebugEventBus {
  private static instance: DebugEventBus;
  private subscribers: Map<string, Function[]> = new Map();
  private eventQueue: DebugEvent[] = [];
  private maxQueueSize: number = 10000;

  private constructor() {}

  public static getInstance(): DebugEventBus {
    if (!DebugEventBus.instance) {
      DebugEventBus.instance = new DebugEventBus();
    }
    return DebugEventBus.instance;
  }

  /**
   * Publish a debug event
   * @param event - Debug event to publish
   */
  public publish(event: DebugEvent): void {
    // Add to queue
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.eventQueue.shift(); // Remove oldest event
    }
    this.eventQueue.push(event);

    // Process event immediately
    this.processEvent(event);
  }

  /**
   * Process a single event
   * @param event - Event to process
   */
  private processEvent(event: DebugEvent): void {
    const subscribers = this.subscribers.get(event.type) || [];
    const allSubscribers = this.subscribers.get('*') || [];

    // Notify type-specific subscribers
    subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in debug event subscriber:', error);
      }
    });

    // Notify wildcard subscribers
    allSubscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in debug event subscriber:', error);
      }
    });
  }

  /**
   * Subscribe to debug events
   * @param eventType - Event type to subscribe to ('*' for all events)
   * @param callback - Callback function
   */
  public subscribe(eventType: string, callback: Function): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(callback);
  }

  /**
   * Unsubscribe from debug events
   * @param eventType - Event type to unsubscribe from
   * @param callback - Callback function to remove
   */
  public unsubscribe(eventType: string, callback: Function): void {
    const subscribers = this.subscribers.get(eventType);
    if (subscribers) {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    }
  }

  /**
   * Get recent events from the queue
   * @param limit - Maximum number of events to return
   * @param type - Optional event type filter
   */
  public getRecentEvents(limit: number = 100, type?: string): DebugEvent[] {
    let events = [...this.eventQueue];
    
    if (type) {
      events = events.filter(event => event.type === type);
    }
    
    return events.slice(-limit);
  }

  /**
   * Clear the event queue
   */
  public clear(): void {
    this.eventQueue = [];
    this.subscribers.clear();
  }

  /**
   * Get queue statistics
   */
  public getStats() {
    return {
      queueSize: this.eventQueue.length,
      subscriberCount: Array.from(this.subscribers.values()).reduce((sum, subs) => sum + subs.length, 0),
      eventTypes: Array.from(this.subscribers.keys()),
      maxQueueSize: this.maxQueueSize
    };
  }

  /**
   * Set maximum queue size
   * @param size - Maximum queue size
   */
  public setMaxQueueSize(size: number): void {
    this.maxQueueSize = Math.max(100, size);
    
    // Trim queue if necessary
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue = this.eventQueue.slice(-this.maxQueueSize);
    }
  }
}