
/**
 * Assertion Utilities for Web UI Testing
 * Provides custom assertions for UI testing scenarios
 */

export class AssertionUtils {
  /**
   * Assert element exists and is visible
   */
  static assertElementVisible(selector: string, message?: string): void {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(message || `Element with selector '${selector}' not found`);
    }

    const htmlElement = element as HTMLElement;
    const rect = htmlElement.getBoundingClientRect();
    
    if (rect.width === 0 || rect.height === 0) {
      throw new Error(message || `Element with selector '${selector}' is not visible`);
    }
  }

  /**
   * Assert element has specific text content
   */
  static assertElementText(selector: string, expectedText: string, options: {
    exact?: boolean;
    trim?: boolean;
    ignoreCase?: boolean;
  } = {}): void {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element with selector '${selector}' not found`);
    }

    let actualText = element.textContent || '';
    
    if (options.trim) {
      actualText = actualText.trim();
    }
    
    if (options.ignoreCase) {
      actualText = actualText.toLowerCase();
      expectedText = expectedText.toLowerCase();
    }

    if (options.exact) {
      if (actualText !== expectedText) {
        throw new Error(`Expected text to be '${expectedText}', but got '${actualText}'`);
      }
    } else {
      if (!actualText.includes(expectedText)) {
        throw new Error(`Expected text to contain '${expectedText}', but got '${actualText}'`);
      }
    }
  }

  /**
   * Assert element has specific CSS class
   */
  static assertElementHasClass(selector: string, className: string): void {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element with selector '${selector}' not found`);
    }

    if (!element.classList.contains(className)) {
      throw new Error(`Element with selector '${selector}' does not have class '${className}'`);
    }
  }

  /**
   * Assert element has specific attribute
   */
  static assertElementHasAttribute(selector: string, attributeName: string, expectedValue?: string): void {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element with selector '${selector}' not found`);
    }

    const actualValue = element.getAttribute(attributeName);
    if (actualValue === null) {
      throw new Error(`Element with selector '${selector}' does not have attribute '${attributeName}'`);
    }

    if (expectedValue !== undefined && actualValue !== expectedValue) {
      throw new Error(`Expected attribute '${attributeName}' to be '${expectedValue}', but got '${actualValue}'`);
    }
  }

  /**
   * Assert form field has specific value
   */
  static assertFieldValue(selector: string, expectedValue: string): void {
    const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!element) {
      throw new Error(`Form field with selector '${selector}' not found`);
    }

    if (element.value !== expectedValue) {
      throw new Error(`Expected field value to be '${expectedValue}', but got '${element.value}'`);
    }
  }

  /**
   * Assert element is disabled
   */
  static assertElementDisabled(selector: string): void {
    const element = document.querySelector(selector) as HTMLButtonElement | HTMLInputElement;
    if (!element) {
      throw new Error(`Element with selector '${selector}' not found`);
    }

    if (!element.disabled) {
      throw new Error(`Element with selector '${selector}' is not disabled`);
    }
  }

  /**
   * Assert element is enabled
   */
  static assertElementEnabled(selector: string): void {
    const element = document.querySelector(selector) as HTMLButtonElement | HTMLInputElement;
    if (!element) {
      throw new Error(`Element with selector '${selector}' not found`);
    }

    if (element.disabled) {
      throw new Error(`Element with selector '${selector}' is disabled`);
    }
  }
}
