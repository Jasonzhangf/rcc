/**
 * Jest Test Setup Configuration
 * 
 * Global test configuration and setup for the RCC Configuration System
 * test suite. This file runs before all tests and sets up the testing
 * environment with proper configurations, mocks, and utilities.
 * 
 * @author RCC Testing Framework
 * @version 1.0.0
 */

import { jest } from '@jest/globals';

// Increase the default timeout for longer-running integration tests
jest.setTimeout(30000);

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log during tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn, // Keep warnings
  error: console.error, // Keep errors
};

// Enable garbage collection for memory leak tests
if (global.gc) {
  global.gc();
}

// Mock fetch for UI module tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve('OK'),
  } as Response)
);

// Mock WebSocket for real-time communication tests
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate connection after a brief delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string | Buffer): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Echo the message back for testing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data }));
      }
    }, 1);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  terminate(): void {
    this.close();
  }
}

global.WebSocket = MockWebSocket as any;

// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';
process.env.LOG_LEVEL = 'error'; // Minimize log output during tests

// Mock file system operations that might be problematic in tests
const originalProcessExit = process.exit;
process.exit = jest.fn() as any;

// Restore process.exit after tests
afterAll(() => {
  process.exit = originalProcessExit;
});

// Global test utilities
(global as any).testUtils = {
  /**
   * Creates a delay for testing async operations
   */
  delay: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Creates a mock module info object
   */
  createMockModuleInfo: (overrides: any = {}) => ({
    id: 'test-module-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Module',
    version: '1.0.0',
    description: 'Test module for unit testing',
    type: 'test',
    ...overrides
  }),

  /**
   * Creates a mock configuration object
   */
  createMockConfig: (overrides: any = {}) => ({
    name: 'test-config',
    version: '1.0.0',
    timestamp: Date.now(),
    settings: {
      enabled: true,
      timeout: 5000
    },
    ...overrides
  }),

  /**
   * Waits for a condition to be true or timeout
   */
  waitFor: async (
    condition: () => boolean | Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 100
  ): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return false;
  },

  /**
   * Gets current memory usage
   */
  getMemoryUsage: (): number => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  },

  /**
   * Forces garbage collection if available
   */
  forceGC: (): void => {
    if (global.gc) {
      global.gc();
    }
  }
};

// Type declarations for global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        delay: (ms: number) => Promise<void>;
        createMockModuleInfo: (overrides?: any) => any;
        createMockConfig: (overrides?: any) => any;
        waitFor: (
          condition: () => boolean | Promise<boolean>,
          timeoutMs?: number,
          intervalMs?: number
        ) => Promise<boolean>;
        getMemoryUsage: () => number;
        forceGC: () => void;
      };
      fetch: jest.Mock;
      WebSocket: typeof MockWebSocket;
    }
  }
}

// Setup performance measurement
beforeEach(() => {
  // Clear any previous performance marks
  performance.clearMarks();
  performance.clearMeasures();
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Log test environment setup completion
console.log('✅ RCC Test Environment Setup Complete');
console.log(`📊 Test Timeout: ${jest.getSeed()}ms`);
console.log(`🔧 Node Version: ${process.version}`);
console.log(`📦 Test Environment: ${process.env.NODE_ENV}`);

export {}; // Make this file a module