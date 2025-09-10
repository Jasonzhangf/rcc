
/**
 * Event Utilities for Web UI Testing
 * Provides helper functions for event simulation and handling
 */

export class EventUtils {
  /**
   * Create a custom event with proper initialization
   */
  static createCustomEvent(type: string, detail?: any, bubbles = true, cancelable = true): CustomEvent {
    return new CustomEvent(type, {
      detail,
      bubbles,
      cancelable
    });
  }

  /**
   * Simulate keyboard event
   */
  static simulateKeyboardEvent(
    element: Element,
    type: 'keydown' | 'keyup' | 'keypress',
    key: string,
    options: KeyboardEventInit = {}
  ): void {
    const event = new KeyboardEvent(type, {
      key,
      bubbles: true,
      cancelable: true,
      ...options
    });
    
    element.dispatchEvent(event);
  }

  /**
   * Simulate drag and drop events
   */
  static simulateDragAndDrop(
    dragElement: Element,
    dropElement: Element,
    dataTransfer?: DataTransfer
  ): void {
    // Drag start
    const dragStartEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer || new DataTransfer()
    });
    dragElement.dispatchEvent(dragStartEvent);

    // Drag over
    const dragOverEvent = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer || new DataTransfer()
    });
    dropElement.dispatchEvent(dragOverEvent);

    // Drop
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer || new DataTransfer()
    });
    dropElement.dispatchEvent(dropEvent);

    // Drag end
    const dragEndEvent = new DragEvent('dragend', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer || new DataTransfer()
    });
    dragElement.dispatchEvent(dragEndEvent);
  }

  /**
   * Wait for a specific event to be fired
   */
  static async waitForEvent(
    element: Element,
    eventType: string,
    timeout = 5000
  ): Promise<Event> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event ${eventType} not fired within ${timeout}ms`));
      }, timeout);

      element.addEventListener(eventType, (event) => {
        clearTimeout(timer);
        resolve(event);
      }, { once: true });
    });
  }

  /**
   * Track event calls
   */
  static trackEventCalls(element: Element, eventType: string): {
    getCount: () => number;
    getCalls: () => Event[];
    reset: () => void;
  } {
    let calls: Event[] = [];

    const handler = (event: Event) => {
      calls.push(event);
    };

    element.addEventListener(eventType, handler);

    return {
      getCount: () => calls.length,
      getCalls: () => [...calls],
      reset: () => {
        calls = [];
      }
    };
  }
}
