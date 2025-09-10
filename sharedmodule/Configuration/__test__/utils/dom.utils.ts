
/**
 * DOM Utilities for Web UI Testing
 * Provides helper functions for DOM manipulation and querying
 */

export class DOMUtils {
  /**
   * Wait for an element to appear in the DOM
   */
  static async waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  /**
   * Wait for an element to be visible
   */
  static async waitForVisible(selector: string, timeout = 5000): Promise<Element | null> {
    const element = await this.waitForElement(selector, timeout);
    if (!element) return null;

    return new Promise((resolve) => {
      if (this.isVisible(element)) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        if (this.isVisible(element)) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(element, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  /**
   * Check if an element is visible
   */
  static isVisible(element: Element): boolean {
    const htmlElement = element as HTMLElement;
    const rect = htmlElement.getBoundingClientRect();
    
    return rect.width > 0 && 
           rect.height > 0 && 
           htmlElement.style.display !== 'none' &&
           htmlElement.style.visibility !== 'hidden' &&
           htmlElement.style.opacity !== '0';
  }

  /**
   * Simulate user input
   */
  static async simulateInput(element: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Simulate click with proper event sequence
   */
  static async simulateClick(element: Element): Promise<void> {
    const htmlElement = element as HTMLElement;
    
    // Mouse events sequence
    htmlElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    htmlElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    htmlElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  /**
   * Get all test data attributes from an element
   */
  static getTestData(element: Element): Record<string, string> {
    const data: Record<string, string> = {};
    const attributes = element.attributes;
    
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr.name.startsWith('data-')) {
        data[attr.name] = attr.value;
      }
    }
    
    return data;
  }

  /**
   * Find element by test ID
   */
  static findByTestId(testId: string): Element | null {
    return document.querySelector(`[data-testid="${testId}"], [data-test="${testId}"], [data-automation-id="${testId}"]`
    );
  }

  /**
   * Find all elements by test ID
   */
  static findAllByTestId(testId: string): Element[] {
    return Array.from(document.querySelectorAll(
      `[data-testid="${testId}"], [data-test="${testId}"], [data-automation-id="${testId}"]`
    ));
  }
}
