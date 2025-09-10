/**
 * Qwen Provider Module Tests
 * Tests for Qwen provider module with authentication integration
 */

import { QwenProviderModule } from '../modules/QwenProviderModule';
import { QwenAuthCenter } from '../modules/QwenAuthCenter';
import { ErrorHandlerCenter } from '../ErrorHandlerCenter';
import { PipelineConfigManager } from '../PipelineConfig';
import { PipelineErrorCode, PipelineExecutionContext } from '../ErrorTypes';
import { Message, MessageResponse } from 'rcc-basemodule';

// Mock dependencies
jest.mock('fs');
jest.mock('axios');
jest.mock('crypto');

describe('QwenProviderModule', () => {
  let qwenProvider: QwenProviderModule;
  let qwenAuthCenter: QwenAuthCenter;
  let errorHandlerCenter: ErrorHandlerCenter;
  let configManager: PipelineConfigManager;
  let mockFs: jest.Mocked<typeof fs>;
  let mockAxios: jest.Mocked<typeof axios>;

  // Test configuration
  const testProviderConfig = {
    provider: 'qwen',
    auth: {
      type: 'qwen',
      accessTokenFile: './test-auth/qwen-access-token.json',
      refreshTokenFile: './test-auth/qwen-refresh-token.json',
      deviceFlow: {
        enabled: true,
        clientId: 'test-client-id',
        scope: 'openid profile model.completion',
        deviceAuthEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/device/code',
        tokenEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/token',
        pollingInterval: 5000,
        maxPollingAttempts: 60,
        enablePKCE: true
      }
    },
    api: {
      baseUrl: 'https://chat.qwen.ai/api/v1',
      timeout: 30000,
      maxRetries: 3
    }
  };

  const authConfig = {
    clientId: 'test-client-id',
    scope: 'openid profile model.completion',
    deviceAuthEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/device/code',
    tokenEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/token',
    accessTokenFile: './test-auth/qwen-access-token.json',
    refreshTokenFile: './test-auth/qwen-refresh-token.json',
    refreshThreshold: 300000,
    pollingInterval: 5000,
    maxPollingAttempts: 60,
    enablePKCE: true
  };

  beforeEach(() => {
    // Reset mocks
    mockFs = require('fs') as jest.Mocked<typeof fs>;
    mockAxios = require('axios') as jest.Mocked<typeof axios>;
    
    // Setup mock implementations
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.writeFileSync.mockImplementation(() => undefined);
    mockFs.readFileSync.mockReturnValue('{}');
    
    mockAxios.post.mockResolvedValue({
      data: {
        device_code: 'test-device-code',
        user_code: 'TEST-USER-CODE',
        verification_uri: 'https://chat.qwen.ai/device',
        expires_in: 600,
        interval: 5
      }
    });
    
    // Create test instances
    configManager = new PipelineConfigManager({});
    errorHandlerCenter = new ErrorHandlerCenter(configManager);
    qwenAuthCenter = new QwenAuthCenter(authConfig, errorHandlerCenter);
    qwenProvider = new QwenProviderModule({
      id: 'qwen-provider',
      name: 'QwenProvider',
      version: '1.0.0',
      description: 'Qwen provider module',
      type: 'provider',
      dependencies: ['qwen-auth-center'],
      config: testProviderConfig
    });
  });

  afterEach(async () => {
    if (qwenProvider) {
      await qwenProvider.destroy();
    }
    if (qwenAuthCenter) {
      await qwenAuthCenter.destroy();
    }
    if (errorHandlerCenter) {
      await errorHandlerCenter.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      await expect(qwenProvider.initialize()).resolves.not.toThrow();
    });

    it('should validate configuration on initialization', async () => {
      const invalidConfig = { ...testProviderConfig, provider: '' };
      const invalidProvider = new QwenProviderModule({
        id: 'qwen-provider',
        name: 'QwenProvider',
        version: '1.0.0',
        description: 'Qwen provider module',
        type: 'provider',
        dependencies: ['qwen-auth-center'],
        config: invalidConfig
      });
      
      await expect(invalidProvider.initialize()).rejects.toThrow();
    });

    it('should set up authentication integration', async () => {
      await qwenProvider.initialize();
      
      // Verify authentication is set up
      expect(qwenProvider['authCenter']).toBeDefined();
    });
  });

  describe('Request Processing', () => {
    const mockRequest = {
      model: 'qwen-turbo',
      messages: [
        { role: 'user', content: 'Hello, world!' }
      ],
      temperature: 0.7,
      max_tokens: 1000
    };

    beforeEach(async () => {
      await qwenProvider.initialize();
    });

    it('should process requests successfully when authenticated', async () => {
      // Mock successful authentication
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile model.completion',
          created_at: Math.floor(Date.now() / 1000)
        }))
        .mockReturnValueOnce(JSON.stringify({
          refresh_token: 'test-refresh-token',
          created_at: Math.floor(Date.now() / 1000)
        }));
      
      await qwenAuthCenter.initialize();
      
      // Mock successful API response
      mockAxios.request.mockResolvedValue({
        data: {
          request_id: 'test-request-id',
          output: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Hello! How can I help you today?'
                },
                finish_reason: 'stop',
                index: 0
              }
            ]
          },
          usage: {
            input_tokens: 10,
            output_tokens: 15,
            total_tokens: 25
          }
        }
      });
      
      const response = await qwenProvider.processRequest(mockRequest);
      
      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content).toBe('Hello! How can I help you today?');
      expect(response.usage).toBeDefined();
    });

    it('should handle authentication errors gracefully', async () => {
      // Mock authentication failure
      mockFs.existsSync.mockReturnValue(false);
      await qwenAuthCenter.initialize();
      
      await expect(qwenProvider.processRequest(mockRequest)).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      // Mock successful authentication
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile model.completion',
          created_at: Math.floor(Date.now() / 1000)
        }))
        .mockReturnValueOnce(JSON.stringify({
          refresh_token: 'test-refresh-token',
          created_at: Math.floor(Date.now() / 1000)
        }));
      
      await qwenAuthCenter.initialize();
      
      // Mock API error
      mockAxios.request.mockRejectedValue(new Error('API error'));
      
      await expect(qwenProvider.processRequest(mockRequest)).rejects.toThrow('API error');
    });

    it('should handle network timeouts', async () => {
      // Mock successful authentication
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile model.completion',
          created_at: Math.floor(Date.now() / 1000)
        }))
        .mockReturnValueOnce(JSON.stringify({
          refresh_token: 'test-refresh-token',
          created_at: Math.floor(Date.now() / 1000)
        }));
      
      await qwenAuthCenter.initialize();
      
      // Mock timeout
      mockAxios.request.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });
      
      await expect(qwenProvider.processRequest(mockRequest)).rejects.toThrow('Timeout');
    });
  });

  describe('Authentication Integration', () => {
    beforeEach(async () => {
      await qwenProvider.initialize();
      await qwenAuthCenter.initialize();
    });

    it('should use authentication center for token management', async () => {
      const getTokenSpy = jest.spyOn(qwenAuthCenter, 'getAccessToken');
      
      try {
        await qwenProvider.processRequest({
          model: 'qwen-turbo',
          messages: [{ role: 'user', content: 'test' }]
        });
      } catch (error) {
        // Expected to fail due to mock setup
      }
      
      expect(getTokenSpy).toHaveBeenCalled();
    });

    it('should handle token refresh automatically', async () => {
      const refreshTokenSpy = jest.spyOn(qwenAuthCenter, 'refreshToken');
      
      // Simulate token expiry
      const context: PipelineExecutionContext = {
        executionId: 'test-execution-id',
        pipelineId: 'qwen-provider',
        instanceId: 'qwen-provider',
        startTime: Date.now(),
        timeout: 30000,
        payload: {},
        retryCount: 0,
        maxRetries: 3
      };
      
      const tokenExpiredError = {
        code: PipelineErrorCode.TOKEN_EXPIRED,
        message: 'Token expired',
        category: 'authentication' as any,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'qwen-provider' as any,
        pipelineId: 'qwen-provider',
        instanceId: 'qwen-provider',
        timestamp: Date.now()
      };
      
      // Trigger error handling
      await errorHandlerCenter.handleError(tokenExpiredError, context);
      
      // Verify refresh was attempted
      expect(refreshTokenSpy).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await qwenProvider.initialize();
    });

    it('should handle provider status messages', async () => {
      const message: Message = {
        id: 'test-message-id',
        type: 'get_provider_status',
        source: 'test-source',
        target: 'qwen-provider',
        payload: {},
        timestamp: Date.now()
      };

      const response = await qwenProvider.handleMessage(message) as MessageResponse;
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.provider).toBe('qwen');
    });

    it('should handle authentication status messages', async () => {
      const message: Message = {
        id: 'test-message-id',
        type: 'get_auth_status',
        source: 'test-source',
        target: 'qwen-provider',
        payload: {},
        timestamp: Date.now()
      };

      const response = await qwenProvider.handleMessage(message) as MessageResponse;
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it('should handle token refresh messages', async () => {
      const message: Message = {
        id: 'test-message-id',
        type: 'refresh_token',
        source: 'test-source',
        target: 'qwen-provider',
        payload: {},
        timestamp: Date.now()
      };

      const response = await qwenProvider.handleMessage(message) as MessageResponse;
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await qwenProvider.initialize();
    });

    it('should report healthy status when operational', async () => {
      const health = await qwenProvider.getHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.isAvailable).toBe(true);
    });

    it('should report degraded status during authentication issues', async () => {
      // Simulate authentication issues
      mockFs.existsSync.mockReturnValue(false);
      await qwenAuthCenter.initialize();
      
      const health = await qwenProvider.getHealth();
      
      expect(health.status).toBe('degraded');
      expect(health.isAvailable).toBe(false);
    });

    it('should track request metrics', async () => {
      // Mock successful authentication and API response
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile model.completion',
          created_at: Math.floor(Date.now() / 1000)
        }))
        .mockReturnValueOnce(JSON.stringify({
          refresh_token: 'test-refresh-token',
          created_at: Math.floor(Date.now() / 1000)
        }));
      
      await qwenAuthCenter.initialize();
      
      mockAxios.request.mockResolvedValue({
        data: {
          request_id: 'test-request-id',
          output: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Test response'
                },
                finish_reason: 'stop',
                index: 0
              }
            ]
          },
          usage: {
            input_tokens: 10,
            output_tokens: 15,
            total_tokens: 25
          }
        }
      });
      
      // Make a request
      await qwenProvider.processRequest({
        model: 'qwen-turbo',
        messages: [{ role: 'user', content: 'test' }]
      });
      
      const metrics = qwenProvider.getMetrics();
      
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
    });
  });

  describe('Configuration Management', () => {
    it('should validate provider configuration', async () => {
      const validConfig = { ...testProviderConfig };
      
      // Test with valid config
      await expect(qwenProvider.validateConfig(validConfig)).resolves.toBe(true);
    });

    it('should reject invalid provider configuration', async () => {
      const invalidConfig = { ...testProviderConfig, provider: '' };
      
      await expect(qwenProvider.validateConfig(invalidConfig)).resolves.toBe(false);
    });

    it('should handle configuration updates', async () => {
      await qwenProvider.initialize();
      
      const newConfig = {
        ...testProviderConfig,
        api: {
          ...testProviderConfig.api,
          timeout: 60000
        }
      };
      
      await expect(qwenProvider.updateConfig(newConfig)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await qwenProvider.initialize();
    });

    it('should handle authentication errors with retry logic', async () => {
      const context: PipelineExecutionContext = {
        executionId: 'test-execution-id',
        pipelineId: 'qwen-provider',
        instanceId: 'qwen-provider',
        startTime: Date.now(),
        timeout: 30000,
        payload: {},
        retryCount: 0,
        maxRetries: 3
      };
      
      const authError = {
        code: PipelineErrorCode.AUTHENTICATION_FAILED,
        message: 'Authentication failed',
        category: 'authentication' as any,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'qwen-provider' as any,
        pipelineId: 'qwen-provider',
        instanceId: 'qwen-provider',
        timestamp: Date.now()
      };
      
      const action = await qwenProvider.handleError(authError, context);
      
      expect(action).toBeDefined();
      expect(action.shouldRetry).toBe(true);
    });

    it('should handle network errors with failover logic', async () => {
      const context: PipelineExecutionContext = {
        executionId: 'test-execution-id',
        pipelineId: 'qwen-provider',
        instanceId: 'qwen-provider',
        startTime: Date.now(),
        timeout: 30000,
        payload: {},
        retryCount: 0,
        maxRetries: 3
      };
      
      const networkError = {
        code: PipelineErrorCode.CONNECTION_FAILED,
        message: 'Connection failed',
        category: 'network' as any,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'qwen-provider' as any,
        pipelineId: 'qwen-provider',
        instanceId: 'qwen-provider',
        timestamp: Date.now()
      };
      
      const action = await qwenProvider.handleError(networkError, context);
      
      expect(action).toBeDefined();
      expect(action.shouldRetry).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources properly', async () => {
      await qwenProvider.initialize();
      
      await qwenProvider.destroy();
      
      // Verify cleanup completed without errors
      expect(qwenProvider['authCenter']).toBeUndefined();
    });
  });
});