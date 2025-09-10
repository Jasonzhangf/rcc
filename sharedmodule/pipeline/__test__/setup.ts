/**
 * Jest setup file for pipeline module tests
 */

import { jest } from '@jest/globals';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock BaseModule to avoid dependency issues
jest.mock('rcc-basemodule', () => ({
  BaseModule: class {
    constructor(info: any) {
      this.info = info;
    }
    
    async initialize(): Promise<void> {}
    async destroy(): Promise<void> {}
    async configure(config: any): Promise<void> {}
    getInfo() { return this.info; }
    getConfig() { return {}; }
    log() {}
    debug() {}
    info() {}
    warn() {}
    error() {}
    logInfo() {}
    
    // Mock message handling
    on() {}
    off() {}
    emit() {}
    sendMessage() {}
    registerMessageHandler() {}
  },
  ModuleInfo: {},
  Message: {},
  MessageResponse: {},
  ValidationRule: {},
  ErrorSource: {},
  ErrorSeverity: {},
  ErrorImpact: {},
  ErrorRecoverability: {}
}));

// Mock other dependencies
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
}));

// Set test timeout
jest.setTimeout(30000);

// Global test utilities
(global as any).createMockPipelineError = (code: any, message: string, category: any) => ({
  code,
  message,
  category,
  severity: 'high',
  recoverability: 'recoverable',
  impact: 'single_module',
  source: 'module',
  pipelineId: 'test-pipeline',
  instanceId: 'test-instance',
  timestamp: Date.now()
});

(global as any).createMockExecutionContext = () => ({
  executionId: 'test-execution-' + Math.random().toString(36).substr(2, 9),
  pipelineId: 'test-pipeline',
  instanceId: 'test-instance',
  startTime: Date.now(),
  timeout: 30000,
  payload: { test: 'data' },
  metadata: {},
  retryCount: 0,
  maxRetries: 3
});

// Clean up after each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Set up test environment
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
});