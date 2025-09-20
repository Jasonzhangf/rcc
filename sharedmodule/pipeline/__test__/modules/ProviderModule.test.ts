/**
 * Provider Module Unit Tests
 *
 * Tests the Provider module implementation for actual AI provider integration
 */

import { ProviderModule } from '../../src/modules/ProviderModule';
import { PipelineExecutionContext } from '../../src/interfaces/ModularInterfaces';
import { createTestPipelineWrapper, createTestRequest, TEST_TIMEOUT } from '../setup';

// Mock HTTP requests
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn()
}));

import axios from 'axios';

describe('ProviderModule', () => {
  let provider: ProviderModule;
  let testContext: PipelineExecutionContext;
  let mockAxiosPost: jest.MockedFunction<typeof axios.post>;
  let mockAxiosGet: jest.MockedFunction<typeof axios.get>;

  beforeEach(() => {
    const config = createTestPipelineWrapper().modules.find(m => m.type === 'provider')!;
    provider = new ProviderModule(config);

    testContext = {
      sessionId: 'test-session',
      requestId: 'test-request',
      virtualModelId: 'test-virtual-model',
      providerId: 'test-provider',
      startTime: Date.now(),
      ioRecords: [],
      metadata: {}
    };

    mockAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;
    mockAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;
  });

  afterEach(async () => {
    if (provider) {
      await provider.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid config', async () => {
      await expect(provider.initialize()).resolves.not.toThrow();

      const status = await provider.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.isRunning).toBe(true);
    });

    test('should have correct module properties', () => {
      expect(provider.moduleId).toBe('test-provider');
      expect(provider.moduleName).toBe('Test Provider');
      expect(provider.moduleVersion).toBe('1.0.0');
    });

    test('should validate configuration during initialization', async () => {
      const invalidConfig = {
        id: 'invalid-provider',
        name: 'Invalid Provider',
        type: 'provider',
        version: '1.0.0',
        config: {
          // Missing required endpoint
          models: ['test-model'],
          authentication: { type: 'bearer' },
          capabilities: { streaming: true }
        },
        enabled: true
      };

      const invalidProvider = new ProviderModule(invalidConfig);

      await expect(invalidProvider.initialize()).rejects.toThrow('Provider endpoint is required');
    });
  });

  describe('Request Execution', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should execute request successfully', async () => {
      const request = createTestRequest();
      const mockResponse = {
        data: {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1234567890,
          model: 'test-model',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Hello! This is a test response.'
              },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18
          }
        }
      };

      mockAxiosPost.mockResolvedValue(mockResponse);

      const response = await provider.executeRequest(request, testContext);

      expect(response).toBeDefined();
      expect(response.id).toBe('chatcmpl-123');
      expect(response.object).toBe('chat.completion');
      expect(response.choices[0].message.content).toBe('Hello! This is a test response.');

      expect(mockAxiosPost).toHaveBeenCalledWith(
        'https://api.test.com/v1/chat/completions',
        expect.objectContaining({
          model: 'test-model',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Hello, this is a test request'
            })
          ])
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key'
          }),
          timeout: 30000
        })
      );
    }, TEST_TIMEOUT);

    test('should handle request timeout', async () => {
      const request = createTestRequest();

      mockAxiosPost.mockRejectedValue(new Error('Request timeout'));

      await expect(provider.executeRequest(request, testContext)).rejects.toThrow('Provider execution failed: Request timeout');
    }, TEST_TIMEOUT);

    test('should handle API errors', async () => {
      const request = createTestRequest();

      mockAxiosPost.mockRejectedValue({
        response: {
          status: 401,
          data: {
            error: {
              message: 'Invalid API key',
              type: 'authentication_error'
            }
          }
        }
      });

      await expect(provider.executeRequest(request, testContext)).rejects.toThrow('Provider execution failed');
    }, TEST_TIMEOUT);

    test('should handle network errors', async () => {
      const request = createTestRequest();

      mockAxiosPost.mockRejectedValue(new Error('Network error'));

      await expect(provider.executeRequest(request, testContext)).rejects.toThrow('Provider execution failed: Network error');
    }, TEST_TIMEOUT);
  });

  describe('Streaming Request Execution', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should execute streaming request successfully', async () => {
      const request = {
        ...createTestRequest(),
        stream: true
      };

      const mockChunks = [
        { id: 'chunk-1', choices: [{ delta: { content: 'Hello' } }] },
        { id: 'chunk-2', choices: [{ delta: { content: ' from' } }] },
        { id: 'chunk-3', choices: [{ delta: { content: ' streaming' } }] },
        { id: 'chunk-4', choices: [{ delta: { content: ' response' }, finish_reason: 'stop' }] }
      ];

      // Mock streaming response
      const mockStream = {
        data: JSON.stringify(mockChunks[0]),
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockChunks) {
            yield { data: JSON.stringify(chunk) };
          }
        }
      };

      mockAxiosPost.mockResolvedValue(mockStream);

      const streamingResponse = provider.executeStreamingRequest(request, testContext);
      const chunks: any[] = [];

      for await (const chunk of streamingResponse) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(4);
      expect(chunks[0].choices[0].delta.content).toBe('Hello');
      expect(chunks[chunks.length - 1].choices[0].finish_reason).toBe('stop');
    }, TEST_TIMEOUT);

    test('should handle streaming errors', async () => {
      const request = {
        ...createTestRequest(),
        stream: true
      };

      mockAxiosPost.mockRejectedValue(new Error('Streaming failed'));

      const streamingResponse = provider.executeStreamingRequest(request, testContext);

      await expect(streamingResponse.next()).rejects.toThrow('Provider streaming execution failed: Streaming failed');
    }, TEST_TIMEOUT);

    test('should reject streaming for non-streaming provider', async () => {
      // Create a non-streaming provider
      const nonStreamingConfig = {
        id: 'non-streaming-provider',
        name: 'Non-Streaming Provider',
        type: 'provider',
        version: '1.0.0',
        config: {
          endpoint: 'https://api.test.com/v1/chat/completions',
          models: ['test-model'],
          authentication: { type: 'bearer', apiKey: 'test-key' },
          capabilities: { streaming: false, functions: false, vision: false, maxTokens: 4096 }
        },
        enabled: true
      };

      const nonStreamingProvider = new ProviderModule(nonStreamingConfig);
      await nonStreamingProvider.initialize();

      const request = {
        ...createTestRequest(),
        stream: true
      };

      await expect(
        nonStreamingProvider.executeStreamingRequest(request, testContext)
      ).rejects.toThrow('Provider Non-Streaming Provider does not support streaming');

      await nonStreamingProvider.destroy();
    }, TEST_TIMEOUT);
  });

  describe('Provider Information', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should return correct provider information', () => {
      const providerInfo = provider.getProviderInfo();

      expect(providerInfo.id).toBe('test-provider');
      expect(providerInfo.name).toBe('Test Provider');
      expect(providerInfo.type).toBeDefined();
      expect(providerInfo.endpoint).toBe('https://api.test.com/v1/chat/completions');
      expect(providerInfo.models).toEqual(['test-model']);
      expect(providerInfo.capabilities.streaming).toBe(true);
      expect(providerInfo.capabilities.functions).toBe(true);
      expect(providerInfo.capabilities.vision).toBe(false);
      expect(providerInfo.capabilities.maxTokens).toBe(4096);
      expect(providerInfo.authentication.type).toBe('bearer');
      expect(providerInfo.authentication.required).toBe(true);
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should return healthy status when endpoint is reachable', async () => {
      mockAxiosGet.mockResolvedValue({ data: { status: 'ok' } });

      const healthStatus = await provider.checkHealth();

      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.responseTime).toBeGreaterThan(0);
      expect(healthStatus.error).toBeUndefined();
    });

    test('should return unhealthy status when endpoint is unreachable', async () => {
      mockAxiosGet.mockRejectedValue(new Error('Connection failed'));

      const healthStatus = await provider.checkHealth();

      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.responseTime).toBeGreaterThan(0);
      expect(healthStatus.error).toBe('Connection failed');
    });

    test('should return unhealthy status when not initialized', async () => {
      const uninitializedProvider = new ProviderModule(
        createTestPipelineWrapper().modules.find(m => m.type === 'provider')!
      );

      const healthStatus = await uninitializedProvider.checkHealth();

      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.error).toBe('Provider not initialized');
    });
  });

  describe('Error Handling Edge Cases', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should handle malformed API responses', async () => {
      const request = createTestRequest();

      mockAxiosPost.mockResolvedValue({
        data: {
          // Missing required fields
          invalid: 'response'
        }
      });

      const response = await provider.executeRequest(request, testContext);
      // Should still return the malformed response
      expect(response).toBeDefined();
      expect(response.invalid).toBe('response');
    }, TEST_TIMEOUT);

    test('should handle partial error responses', async () => {
      const request = createTestRequest();

      mockAxiosPost.mockResolvedValue({
        data: {
          error: {
            message: 'Rate limit exceeded',
            type: 'rate_limit_error'
          },
          id: 'error-response',
          object: 'error'
        }
      });

      await expect(provider.executeRequest(request, testContext)).resolves.toThrow();
    }, TEST_TIMEOUT);
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should handle concurrent requests efficiently', async () => {
      const request = createTestRequest();
      const mockResponse = {
        data: {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1234567890,
          model: 'test-model',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Concurrent response'
              },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18
          }
        }
      };

      mockAxiosPost.mockResolvedValue(mockResponse);

      const concurrentRequests = 10;
      const startTime = Date.now();

      const promises = Array(concurrentRequests).fill(null).map(() =>
        provider.executeRequest(request, testContext)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.id).toBeDefined();
        expect(result.choices[0].message.content).toBe('Concurrent response');
      });

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      expect(averageTime).toBeLessThan(100); // Should be less than 100ms per request
      console.log(`Average concurrent request time: ${averageTime.toFixed(2)}ms`);
    }, TEST_TIMEOUT);

    test('should perform streaming efficiently', async () => {
      const request = {
        ...createTestRequest(),
        stream: true
      };

      const mockChunks = [
        { id: 'chunk-1', choices: [{ delta: { content: 'Test' } }] },
        { id: 'chunk-2', choices: [{ delta: { content: ' streaming' } }] },
        { id: 'chunk-3', choices: [{ delta: { content: ' performance' } }] }
      ];

      const mockStream = {
        data: JSON.stringify(mockChunks[0]),
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockChunks) {
            yield { data: JSON.stringify(chunk) };
            await new Promise(resolve => setTimeout(resolve, 1)); // Simulate small delay
          }
        }
      };

      mockAxiosPost.mockResolvedValue(mockStream);

      const startTime = Date.now();
      const streamingResponse = provider.executeStreamingRequest(request, testContext);
      const chunks: any[] = [];

      for await (const chunk of streamingResponse) {
        chunks.push(chunk);
      }

      const endTime = Date.now();

      expect(chunks).toHaveLength(3);
      expect(endTime - startTime).toBeLessThan(50); // Should complete in less than 50ms
      console.log(`Streaming request completed in ${endTime - startTime}ms`);
    }, TEST_TIMEOUT);
  });

  describe('Status and Cleanup', () => {
    test('should provide correct status information', async () => {
      await provider.initialize();

      const status = await provider.getStatus();

      expect(status.isInitialized).toBe(true);
      expect(status.isRunning).toBe(true);
      expect(status.statistics.requestsProcessed).toBe(0);
      expect(status.statistics.averageResponseTime).toBe(0);
      expect(status.statistics.errorRate).toBe(0);
    });

    test('should cleanup resources properly', async () => {
      await provider.initialize();

      await provider.destroy();

      const status = await provider.getStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.isRunning).toBe(false);
    });
  });
});