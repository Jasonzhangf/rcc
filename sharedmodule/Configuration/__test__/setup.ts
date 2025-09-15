
/**
 * Test Setup for Web UI Testing
 * Global setup and teardown for all test suites
 */

import { JSDOM } from 'jsdom';

// Setup DOM environment
export function setupDOM() {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    runScripts: 'dangerously'
  });

  global.window = dom.window as any;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator as any;
  global.location = dom.window.location as any;
  global.localStorage = dom.window.localStorage as any;
  global.sessionStorage = dom.window.sessionStorage as any;

  // Mock requestAnimationFrame
  global.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(callback, 0);
  };

  // Mock cancelAnimationFrame
  global.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    root: Element | null = null;
    rootMargin: string = '';
    thresholds: number[] = [];
    
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {}
    
    disconnect() {}
    observe(target: Element) {}
    unobserve(target: Element) {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor(callback: ResizeObserverCallback) {}
    
    disconnect() {}
    observe(target: Element, options?: ResizeObserverOptions) {}
    unobserve(target: Element) {}
  };

  // Mock MutationObserver
  global.MutationObserver = class MutationObserver {
    constructor(callback: MutationCallback) {}
    
    disconnect() {}
    observe(target: Node, options: MutationObserverInit) {}
    unobserve(target: Node) {}
    takeRecords(): MutationRecord[] {
      return [];
    }
  };

  return dom;
}

// Setup global test utilities
export function setupTestUtils() {
  // Add custom matchers
  expect.extend({
    toHaveClass(received: Element, className: string) {
      const pass = received.classList.contains(className);
      return {
        message: () => `expected ${received} ${pass ? 'not ' : ''}to have class ${className}`,
        pass
      };
    },

    toHaveAttribute(received: Element, attributeName: string, expectedValue?: string) {
      const actualValue = received.getAttribute(attributeName);
      const pass = expectedValue !== undefined 
        ? actualValue === expectedValue 
        : actualValue !== null;
      
      return {
        message: () => {
          if (expectedValue !== undefined) {
            return `expected ${received} ${pass ? 'not ' : ''}to have attribute ${attributeName} with value ${expectedValue}`;
          }
          return `expected ${received} ${pass ? 'not ' : ''}to have attribute ${attributeName}`;
        },
        pass
      };
    },

    toBeVisible(received: Element) {
      const htmlElement = received as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      const pass = rect.width > 0 && rect.height > 0;
      
      return {
        message: () => `expected ${received} ${pass ? 'not ' : ''}to be visible`,
        pass
      };
    }
  });
}

// Cleanup after tests
export function cleanupDOM() {
  // Clean up global objects
  if (global.window) {
    global.window.close();
  }
  
  delete global.window;
  delete global.document;
  delete global.navigator;
  delete global.location;
  delete global.localStorage;
  delete global.sessionStorage;
  delete global.requestAnimationFrame;
  delete global.cancelAnimationFrame;
  delete global.IntersectionObserver;
  delete global.ResizeObserver;
  delete global.MutationObserver;
}

// Setup global test hooks
beforeAll(() => {
  setupDOM();
  setupTestUtils();
});

afterAll(() => {
  cleanupDOM();
});

// Setup for each test
beforeEach(() => {
  // Clear localStorage before each test
  if (global.localStorage) {
    global.localStorage.clear();
  }
  
  // Clear sessionStorage before each test
  if (global.sessionStorage) {
    global.sessionStorage.clear();
  }
  
  // Clear document body
  if (global.document) {
    global.document.body.innerHTML = '';
  }
});

afterEach(() => {
  // Clean up after each test
  if (global.document) {
    global.document.body.innerHTML = '';
  }
});
