// Jest setup file for server module tests
import { jest } from '@jest/globals';

// Mock external dependencies
jest.mock('express', () => {
  const mockExpress = () => ({
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    listen: jest.fn(),
    on: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    clear: jest.fn()
  });
  
  mockExpress.json = jest.fn(() => jest.fn());
  mockExpress.urlencoded = jest.fn(() => jest.fn());
  mockExpress.static = jest.fn();
  
  return mockExpress;
});

jest.mock('cors', () => jest.fn(() => jest.fn()));
jest.mock('helmet', () => jest.fn(() => jest.fn()));
jest.mock('compression', () => jest.fn(() => jest.fn()));
jest.mock('body-parser', () => ({
  json: jest.fn(() => jest.fn()),
  urlencoded: jest.fn(() => jest.fn())
}));

// Mock MessageCenter to avoid singleton issues
jest.mock('rcc-basemodule', () => {
  const actualModule = jest.requireActual('rcc-basemodule');
  
  return {
    ...actualModule,
    MessageCenter: {
      getInstance: jest.fn(() => ({
        registerModule: jest.fn(),
        unregisterModule: jest.fn(),
        sendMessage: jest.fn(),
        broadcastMessage: jest.fn(),
        sendRequest: jest.fn(),
        sendRequestAsync: jest.fn(),
        onMessage: jest.fn()
      }))
    }
  };
});

// Setup global test utilities
global.beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

// Cleanup after all tests
global.afterAll(() => {
  jest.clearAllMocks();
});