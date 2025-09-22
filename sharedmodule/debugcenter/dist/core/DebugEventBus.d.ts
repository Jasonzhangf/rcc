/**
 * Debug Event Bus - 事件驱动的调试通信总线
 * Event-driven debug communication bus
 */
export interface DebugEvent {
    sessionId?: string;
    moduleId: string;
    operationId: string;
    timestamp: number;
    type: 'start' | 'end' | 'error';
    position: 'start' | 'middle' | 'end';
    data?: any;
}
export declare class DebugEventBus {
    private static instance;
    private subscribers;
    private eventQueue;
    private maxQueueSize;
    private constructor();
    static getInstance(): DebugEventBus;
    /**
     * Publish a debug event
     * @param event - Debug event to publish
     */
    publish(event: DebugEvent): void;
    /**
     * Process a single event
     * @param event - Event to process
     */
    private processEvent;
    /**
     * Subscribe to debug events
     * @param eventType - Event type to subscribe to ('*' for all events)
     * @param callback - Callback function
     */
    subscribe(eventType: string, callback: Function): void;
    /**
     * Unsubscribe from debug events
     * @param eventType - Event type to unsubscribe from
     * @param callback - Callback function to remove
     */
    unsubscribe(eventType: string, callback: Function): void;
    /**
     * Get recent events from the queue
     * @param limit - Maximum number of events to return
     * @param type - Optional event type filter
     */
    getRecentEvents(limit?: number, type?: string): DebugEvent[];
    /**
     * Clear the event queue
     */
    clear(): void;
    /**
     * Get queue statistics
     */
    getStats(): {
        queueSize: number;
        subscriberCount: number;
        eventTypes: string[];
        maxQueueSize: number;
    };
    /**
     * Set maximum queue size
     * @param size - Maximum queue size
     */
    setMaxQueueSize(size: number): void;
}
//# sourceMappingURL=DebugEventBus.d.ts.map