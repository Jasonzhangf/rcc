/**
 * DOM Utilities for Web UI Testing
 * Provides helper functions for DOM manipulation and querying
 */
export declare class DOMUtils {
    /**
     * Wait for an element to appear in the DOM
     */
    static waitForElement(selector: string, timeout?: number): Promise<Element | null>;
    /**
     * Wait for an element to be visible
     */
    static waitForVisible(selector: string, timeout?: number): Promise<Element | null>;
    /**
     * Check if an element is visible
     */
    static isVisible(element: Element): boolean;
    /**
     * Simulate user input
     */
    static simulateInput(element: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void>;
    /**
     * Simulate click with proper event sequence
     */
    static simulateClick(element: Element): Promise<void>;
    /**
     * Get all test data attributes from an element
     */
    static getTestData(element: Element): Record<string, string>;
    /**
     * Find element by test ID
     */
    static findByTestId(testId: string): Element | null;
    /**
     * Find all elements by test ID
     */
    static findAllByTestId(testId: string): Element[];
}
