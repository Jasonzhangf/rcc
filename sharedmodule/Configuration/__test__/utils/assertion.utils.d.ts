/**
 * Assertion Utilities for Web UI Testing
 * Provides custom assertions for UI testing scenarios
 */
export declare class AssertionUtils {
    /**
     * Assert element exists and is visible
     */
    static assertElementVisible(selector: string, message?: string): void;
    /**
     * Assert element has specific text content
     */
    static assertElementText(selector: string, expectedText: string, options?: {
        exact?: boolean;
        trim?: boolean;
        ignoreCase?: boolean;
    }): void;
    /**
     * Assert element has specific CSS class
     */
    static assertElementHasClass(selector: string, className: string): void;
    /**
     * Assert element has specific attribute
     */
    static assertElementHasAttribute(selector: string, attributeName: string, expectedValue?: string): void;
    /**
     * Assert form field has specific value
     */
    static assertFieldValue(selector: string, expectedValue: string): void;
    /**
     * Assert element is disabled
     */
    static assertElementDisabled(selector: string): void;
    /**
     * Assert element is enabled
     */
    static assertElementEnabled(selector: string): void;
}
