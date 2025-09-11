// Test utilities for server module tests
import { jest } from '@jest/globals';

/**
 * Create mock ServerConfig for testing
 */
export function createMockServerConfig(overrides = {}): any {
  return {
    port: 3000,
    host: 'localhost',
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true
    },
    compression: true,
    helmet: true,
    rateLimit: {
      windowMs: 60000,
      max: 100
    },
    timeout: 30000,
    bodyLimit: '10mb',
    ...overrides
  };
}

/**
 * Create mock ClientRequest for testing
 */
export function createMockClientRequest(overrides = {}): any {
  return {
    id: 'test-request-123',
    method: 'POST',
    path: '/api/chat',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'test-agent'
    },
    body: {
      message: 'Hello, world!'
    },
    query: {},
    timestamp: Date.now(),
    clientId: 'test-client',
    virtualModel: 'test-model',
    ...overrides
  };
}

/**
 * Create mock VirtualModelConfig for testing
 */
export function createMockVirtualModelConfig(overrides = {}): any {
  return {
    id: 'test-model',
    name: 'Test Model',
    provider: 'test-provider',
    endpoint: 'https://api.test.com/v1/chat',
    model: 'test-model-v1',
    capabilities: ['chat', 'streaming'],
    maxTokens: 4000,
    temperature: 0.7,
    topP: 1.0,
    priority: 5,
    enabled: true,
    routingRules: [],
    ...overrides
  };
}

/**
 * Create mock RouteConfig for testing
 */
export function createMockRouteConfig(overrides = {}): any {
  return {
    id: 'test-route',
    path: '/api/test',
    method: 'POST',
    handler: 'testHandler',
    middleware: [],
    virtualModel: 'test-model',
    authRequired: false,
    ...overrides
  };
}

/**
 * Create mock MiddlewareConfig for testing
 */
export function createMockMiddlewareConfig(overrides = {}): any {
  return {
    name: 'test-middleware',
    type: 'pre',
    priority: 10,
    enabled: true,
    config: {},
    ...overrides
  };
}

/**
 * Wait for async operations
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock EventEmitter for testing
 */
export function createMockEventEmitter() {
  return {
    on: jest.fn(),
    emit: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn()
  };
}

/**
 * Mock Response object for Express
 */
export function createMockResponse() {
  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    end: jest.fn(),
    get: jest.fn()
  };
  
  return mockResponse;
}

/**
 * Mock Request object for Express
 */
export function createMockRequest(overrides = {}) {
  return {
    method: 'POST',
    path: '/api/test',
    headers: {},
    body: {},
    query: {},
    params: {},
    ...overrides
  };
}