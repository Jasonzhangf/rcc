/**
 * Event Utilities for Web UI Testing
 * Provides helper functions for event simulation and handling
 */
export declare class EventUtils {
    /**
     * Create a custom event with proper initialization
     */
    static createCustomEvent(type: string, detail?: any, bubbles?: boolean, cancelable?: boolean): CustomEvent;
    /**
     * Simulate keyboard event
     */
    static simulateKeyboardEvent(element: Element, type: 'keydown' | 'keyup' | 'keypress', key: string, options?: KeyboardEventInit): void;
    /**
     * Simulate drag and drop events
     */
    static simulateDragAndDrop(dragElement: Element, dropElement: Element, dataTransfer?: DataTransfer): void;
    /**
     * Wait for a specific event to be fired
     */
    static waitForEvent(element: Element, eventType: string, timeout?: number): Promise<Event>;
    /**
     * Track event calls
     */
    static trackEventCalls(element: Element, eventType: string): {
        getCount: () => number;
        getCalls: () => Event[];
        reset: () => void;
    };
}
