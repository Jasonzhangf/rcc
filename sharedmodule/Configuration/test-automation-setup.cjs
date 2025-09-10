/**
 * Web UI Test Automation Setup
 * 
 * Setup script for configuring automated testing environment for Web UI components.
 * This script sets up the necessary dependencies, configuration files, and test runners.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Web UI Test Automation...');

// Check and create necessary directories
function setupDirectories() {
  console.log('\n📁 Setting up test directories...');
  
  const testDirs = [
    '__test__',
    '__test__/fixtures',
    '__test__/utils',
    '__test__/helpers',
    'test-reports',
    'test-coverage'
  ];
  
  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✅ Created: ${dir}`);
    } else {
      console.log(`  ✅ Exists: ${dir}`);
    }
  });
}

// Create test configuration files
function setupTestConfiguration() {
  console.log('\n⚙️ Setting up test configuration...');
  
  // Jest configuration for UI tests
  const jestConfig = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src', '<rootDir>/__test__'],
    testMatch: [
      '**/__test__/**/*.test.ts',
      '**/src/**/*.test.ts'
    ],
    transform: {
      '^.+\\.ts$': 'ts-jest'
    },
    moduleNameMapping: {
      '^@/(.*)$': '<rootDir>/src/$1',
      '^@test/(.*)$': '<rootDir>/__test__/$1'
    },
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.d.ts',
      '!src/**/__test__/**',
      '!src/**/index.ts'
    ],
    coverageReporters: [
      'html',
      'text',
      'text-summary',
      'lcov',
      'cobertura'
    ],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    setupFilesAfterEnv: ['<rootDir>/__test__/setup.ts'],
    testTimeout: 30000,
    verbose: true,
    testSequencer: '@jest/test-sequencer'
  };
  
  fs.writeFileSync(
    path.join('__test__', 'jest.config.json'),
    JSON.stringify(jestConfig, null, 2)
  );
  console.log('  ✅ Created: jest.config.json');

  // Puppeteer configuration for E2E tests
  const puppeteerConfig = {
    launchOptions: {
      headless: process.env.HEADLESS !== 'false',
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    },
    server: {
      command: 'npm run dev',
      port: 3000,
      launchTimeout: 30000,
      debug: process.env.DEBUG === 'true'
    },
    context: {
      viewport: {
        width: 1280,
        height: 720
      },
      userAgent: 'RCC-Test-Automation/1.0.0'
    },
    screenshots: {
      path: './test-reports/screenshots/',
      takeOnFailure: true
    },
    videos: {
      enabled: process.env.RECORD_VIDEOS === 'true',
      path: './test-reports/videos/'
    }
  };
  
  fs.writeFileSync(
    path.join('__test__', 'puppeteer.config.json'),
    JSON.stringify(puppeteerConfig, null, 2)
  );
  console.log('  ✅ Created: puppeteer.config.json');

  // Test utilities configuration
  const testUtilsConfig = {
    fixtures: {
      path: './__test__/fixtures',
      files: [
        'sample-config.json',
        'invalid-config.json',
        'large-config.json',
        'sample-yaml-config.yaml'
      ]
    },
    timeouts: {
      short: 5000,
      medium: 15000,
      long: 30000,
      extraLong: 60000
    },
    selectors: {
      testIds: {
        prefix: 'data-testid',
        attributes: ['data-test', 'data-automation-id']
      },
      accessibility: {
        skipHidden: true,
        waitForVisible: true
      }
    },
    reporting: {
      outputDir: './test-reports',
      formats: ['json', 'html', 'junit'],
      includeScreenshots: true
    }
  };
  
  fs.writeFileSync(
    path.join('__test__', 'test-utils.config.json'),
    JSON.stringify(testUtilsConfig, null, 2)
  );
  console.log('  ✅ Created: test-utils.config.json');
}

// Create test fixtures
function createTestFixtures() {
  console.log('\n📋 Creating test fixtures...');
  
  const fixturesDir = '__test__/fixtures';
  
  // Sample configuration fixture
  const sampleConfig = {
    metadata: {
      name: 'sample-test-config',
      description: 'Sample configuration for testing',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
      author: 'Test Automation',
      environment: 'test'
    },
    settings: {
      general: {
        appName: {
          value: 'Test Application',
          type: 'string',
          required: true,
          description: 'Application name'
        },
        version: {
          value: '1.0.0',
          type: 'string',
          required: true,
          description: 'Application version'
        }
      },
      database: {
        host: {
          value: 'localhost',
          type: 'string',
          required: true,
          description: 'Database host'
        },
        port: {
          value: 5432,
          type: 'number',
          required: true,
          description: 'Database port'
        },
        ssl: {
          value: false,
          type: 'boolean',
          required: false,
          description: 'Enable SSL'
        }
      },
      features: {
        experimental: {
          value: ['feature1', 'feature2'],
          type: 'array',
          required: false,
          description: 'Experimental features'
        }
      }
    },
    version: '1.0.0'
  };
  
  fs.writeFileSync(
    path.join(fixturesDir, 'sample-config.json'),
    JSON.stringify(sampleConfig, null, 2)
  );
  console.log('  ✅ Created: sample-config.json');

  // Invalid configuration fixture
  const invalidConfig = {
    metadata: {
      name: 'invalid-config'
      // Missing required fields
    },
    // Missing settings and version
    invalidField: 'invalid'
  };
  
  fs.writeFileSync(
    path.join(fixturesDir, 'invalid-config.json'),
    JSON.stringify(invalidConfig, null, 2)
  );
  console.log('  ✅ Created: invalid-config.json');

  // Large configuration fixture
  const largeConfig = {
    metadata: {
      name: 'large-test-config',
      description: 'Large configuration for performance testing',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
      author: 'Test Automation',
      environment: 'test'
    },
    settings: {},
    version: '1.0.0'
  };
  
  // Add many settings
  for (let i = 0; i < 1000; i++) {
    largeConfig.settings[`category_${i}`] = {
      [`setting_${i}`]: {
        value: `value_${i}`,
        type: 'string',
        required: false,
        description: `Setting ${i} for performance testing`
      }
    };
  }
  
  fs.writeFileSync(
    path.join(fixturesDir, 'large-config.json'),
    JSON.stringify(largeConfig, null, 2)
  );
  console.log('  ✅ Created: large-config.json');

  // YAML configuration fixture
  const yamlConfig = `metadata:
  name: sample-yaml-config
  description: Sample YAML configuration for testing
  createdAt: 2023-01-01T00:00:00.000Z
  updatedAt: 2023-01-01T00:00:00.000Z
  author: Test Automation
  environment: test
settings:
  general:
    appName:
      value: Test Application
      type: string
      required: true
      description: Application name
    version:
      value: 1.0.0
      type: string
      required: true
      description: Application version
  database:
    host:
      value: localhost
      type: string
      required: true
      description: Database host
    port:
      value: 5432
      type: number
      required: true
      description: Database port
version: 1.0.0`;
  
  fs.writeFileSync(
    path.join(fixturesDir, 'sample-yaml-config.yaml'),
    yamlConfig
  );
  console.log('  ✅ Created: sample-yaml-config.yaml');
}

// Create test utilities and helpers
function createTestUtilities() {
  console.log('\n🛠️ Creating test utilities...');
  
  const utilsDir = '__test__/utils';
  
  // DOM utilities
  const domUtils = `
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
    return document.querySelector(\`[data-testid="\${testId}"], [data-test="\${testId}"], [data-automation-id="\${testId}"]\`
    );
  }

  /**
   * Find all elements by test ID
   */
  static findAllByTestId(testId: string): Element[] {
    return Array.from(document.querySelectorAll(
      \`[data-testid="\${testId}"], [data-test="\${testId}"], [data-automation-id="\${testId}"]\`
    ));
  }
}
`;
  
  fs.writeFileSync(path.join(utilsDir, 'dom.utils.ts'), domUtils);
  console.log('  ✅ Created: dom.utils.ts');

  // Event utilities
  const eventUtils = `
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
        reject(new Error(\`Event \${eventType} not fired within \${timeout}ms\`));
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
`;
  
  fs.writeFileSync(path.join(utilsDir, 'event.utils.ts'), eventUtils);
  console.log('  ✅ Created: event.utils.ts');

  // Assertion utilities
  const assertionUtils = `
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
      throw new Error(message || \`Element with selector '\${selector}' not found\`);
    }

    const htmlElement = element as HTMLElement;
    const rect = htmlElement.getBoundingClientRect();
    
    if (rect.width === 0 || rect.height === 0) {
      throw new Error(message || \`Element with selector '\${selector}' is not visible\`);
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
      throw new Error(\`Element with selector '\${selector}' not found\`);
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
        throw new Error(\`Expected text to be '\${expectedText}', but got '\${actualText}'\`);
      }
    } else {
      if (!actualText.includes(expectedText)) {
        throw new Error(\`Expected text to contain '\${expectedText}', but got '\${actualText}'\`);
      }
    }
  }

  /**
   * Assert element has specific CSS class
   */
  static assertElementHasClass(selector: string, className: string): void {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(\`Element with selector '\${selector}' not found\`);
    }

    if (!element.classList.contains(className)) {
      throw new Error(\`Element with selector '\${selector}' does not have class '\${className}'\`);
    }
  }

  /**
   * Assert element has specific attribute
   */
  static assertElementHasAttribute(selector: string, attributeName: string, expectedValue?: string): void {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(\`Element with selector '\${selector}' not found\`);
    }

    const actualValue = element.getAttribute(attributeName);
    if (actualValue === null) {
      throw new Error(\`Element with selector '\${selector}' does not have attribute '\${attributeName}'\`);
    }

    if (expectedValue !== undefined && actualValue !== expectedValue) {
      throw new Error(\`Expected attribute '\${attributeName}' to be '\${expectedValue}', but got '\${actualValue}'\`);
    }
  }

  /**
   * Assert form field has specific value
   */
  static assertFieldValue(selector: string, expectedValue: string): void {
    const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!element) {
      throw new Error(\`Form field with selector '\${selector}' not found\`);
    }

    if (element.value !== expectedValue) {
      throw new Error(\`Expected field value to be '\${expectedValue}', but got '\${element.value}'\`);
    }
  }

  /**
   * Assert element is disabled
   */
  static assertElementDisabled(selector: string): void {
    const element = document.querySelector(selector) as HTMLButtonElement | HTMLInputElement;
    if (!element) {
      throw new Error(\`Element with selector '\${selector}' not found\`);
    }

    if (!element.disabled) {
      throw new Error(\`Element with selector '\${selector}' is not disabled\`);
    }
  }

  /**
   * Assert element is enabled
   */
  static assertElementEnabled(selector: string): void {
    const element = document.querySelector(selector) as HTMLButtonElement | HTMLInputElement;
    if (!element) {
      throw new Error(\`Element with selector '\${selector}' not found\`);
    }

    if (element.disabled) {
      throw new Error(\`Element with selector '\${selector}' is disabled\`);
    }
  }
}
`;
  
  fs.writeFileSync(path.join(utilsDir, 'assertion.utils.ts'), assertionUtils);
  console.log('  ✅ Created: assertion.utils.ts');
}

// Create test setup file
function createTestSetup() {
  console.log('\n🔧 Creating test setup file...');
  
  const setupFile = `
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
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  };

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  };

  // Mock MutationObserver
  global.MutationObserver = class MutationObserver {
    constructor(callback: MutationCallback) {}
    disconnect() {}
    observe() {}
    unobserve() {}
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
        message: () => \`expected \${received} \${pass ? 'not ' : ''}to have class \${className}\`,
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
            return \`expected \${received} \${pass ? 'not ' : ''}to have attribute \${attributeName} with value \${expectedValue}\`;
          }
          return \`expected \${received} \${pass ? 'not ' : ''}to have attribute \${attributeName}\`;
        },
        pass
      };
    },

    toBeVisible(received: Element) {
      const htmlElement = received as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      const pass = rect.width > 0 && rect.height > 0;
      
      return {
        message: () => \`expected \${received} \${pass ? 'not ' : ''}to be visible\`,
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
`;
  
  fs.writeFileSync(path.join('__test__', 'setup.ts'), setupFile);
  console.log('  ✅ Created: setup.ts');
}

// Create package.json test scripts
function updatePackageScripts() {
  console.log('\n📦 Updating package.json test scripts...');
  
  const packageJsonPath = 'package.json';
  let packageJson = {};
  
  if (fs.existsSync(packageJsonPath)) {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  }
  
  // Add test scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    'test': 'jest',
    'test:watch': 'jest --watch',
    'test:coverage': 'jest --coverage',
    'test:ui': 'jest __test__/**/*.test.ts',
    'test:ui:watch': 'jest __test__/**/*.test.ts --watch',
    'test:ui:coverage': 'jest __test__/**/*.test.ts --coverage',
    'test:e2e': 'jest __test__/**/*e2e*.test.ts',
    'test:automation': 'jest __test__/**/*automation*.test.ts',
    'test:performance': 'jest __test__/**/*performance*.test.ts',
    'test:report': 'jest --coverage --coverageReporters=text --coverageReporters=html',
    'test:ci': 'jest --ci --coverage --coverageReporters=text --coverageReporters=cobertura',
    'test:clean': 'rimraf test-reports test-coverage coverage',
    'validate:tests': 'npm run test:ci && npm run test:ui:coverage'
  };
  
  // Add development dependencies for testing
  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    '@types/jest': '^29.5.11',
    '@types/jsdom': '^21.1.6',
    '@testing-library/jest-dom': '^6.1.6',
    '@testing-library/user-event': '^14.5.1',
    'jest': '^29.7.0',
    'jest-environment-jsdom': '^29.7.0',
    'jsdom': '^23.0.1',
    'puppeteer': '^21.6.1',
    '@jest/test-sequencer': '^29.7.0'
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('  ✅ Updated package.json with test scripts');
}

// Create CI/CD configuration
function createCIConfiguration() {
  console.log('\n🔄 Creating CI/CD configuration...');
  
  // GitHub Actions workflow
  const githubWorkflow = {
    name: 'Web UI Tests',
    on: {
      push: {
        branches: ['main', 'develop']
      },
      pull_request: {
        branches: ['main']
      }
    },
    jobs: {
      test: {
        'runs-on': 'ubuntu-latest',
        strategy: {
          matrix: {
            'node-version': [16, 18, 20]
          }
        },
        steps: [
          {
            uses: 'actions/checkout@v4'
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': '${{ matrix.node-version }}',
              'cache': 'npm'
            }
          },
          {
            name: 'Install dependencies',
            run: 'npm ci'
          },
          {
            name: 'Run type checking',
            run: 'npm run typecheck'
          },
          {
            name: 'Run linting',
            run: 'npm run lint'
          },
          {
            name: 'Run unit tests',
            run: 'npm run test:ci'
          },
          {
            name: 'Run UI tests',
            run: 'npm run test:ui:coverage'
          },
          {
            name: 'Upload coverage reports',
            uses: 'codecov/codecov-action@v3',
            with: {
              file: './coverage/lcov.info'
            }
          }
        ]
      }
    }
  };
  
  const workflowsDir = '.github/workflows';
  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(workflowsDir, 'web-ui-tests.yml'),
    YAML.stringify(githubWorkflow)
  );
  console.log('  ✅ Created: .github/workflows/web-ui-tests.yml');
}

// Main setup function
function main() {
  console.log('=' .repeat(60));
  console.log('RCC Configuration Center - Web UI Test Automation Setup');
  console.log('=' .repeat(60));
  
  try {
    setupDirectories();
    setupTestConfiguration();
    createTestFixtures();
    createTestUtilities();
    createTestSetup();
    updatePackageScripts();
    createCIConfiguration();
    
    console.log('\\n🎉 Web UI Test Automation setup completed successfully!');
    console.log('\\n📋 Next steps:');
    console.log('  1. Install dependencies: npm install');
    console.log('  2. Run tests: npm run test:ui');
    console.log('  3. Run tests with coverage: npm run test:ui:coverage');
    console.log('  4. Run tests in watch mode: npm run test:ui:watch');
    console.log('  5. View coverage report: open coverage/lcov-report/index.html');
    
    console.log('\\n📁 Created files:');
    console.log('  - __test__/jest.config.json');
    console.log('  - __test__/puppeteer.config.json');
    console.log('  - __test__/test-utils.config.json');
    console.log('  - __test__/setup.ts');
    console.log('  - __test__/utils/dom.utils.ts');
    console.log('  - __test__/utils/event.utils.ts');
    console.log('  - __test__/utils/assertion.utils.ts');
    console.log('  - __test__/fixtures/sample-config.json');
    console.log('  - __test__/fixtures/invalid-config.json');
    console.log('  - __test__/fixtures/large-config.json');
    console.log('  - __test__/fixtures/sample-yaml-config.yaml');
    console.log('  - .github/workflows/web-ui-tests.yml');
    console.log('  - Updated package.json');
    
  } catch (error) {
    console.error('\\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Simple YAML stringifier for GitHub Actions
const YAML = {
  stringify: function(obj, indent = 2) {
    const yaml = JSON.stringify(obj, null, indent)
      .replace(/"([^"]+)":/g, '$1:')
      .replace(/: "([^"]+)"/g, ': $1')
      .replace(/: (\d+)/g, ': $1')
      .replace(/: (true|false)/g, ': $1')
      .replace(/: null/g, ': ');
    return yaml;
  }
};

// Run setup
if (require.main === module) {
  main();
}

module.exports = {
  setupDirectories,
  setupTestConfiguration,
  createTestFixtures,
  createTestUtilities,
  createTestSetup,
  updatePackageScripts,
  createCIConfiguration
};