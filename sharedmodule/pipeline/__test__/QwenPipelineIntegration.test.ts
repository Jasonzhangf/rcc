/**
 * Qwen Pipeline Integration Tests
 * Tests for complete Qwen pipeline integration with scheduler and error handling
 */

import { QwenProviderModule } from '../modules/QwenProviderModule';
import { QwenCompatibilityModule } from '../modules/QwenCompatibilityModule';
import { QwenAuthCenter } from '../modules/QwenAuthCenter';
import { ErrorHandlerCenter } from '../ErrorHandlerCenter';
import { PipelineScheduler } from '../PipelineScheduler';
import { PipelineConfigManager } from '../PipelineConfig';
import { PipelineAssembler } from '../core/PipelineAssembler';
import { 
  PipelineErrorCode, 
  PipelineErrorCategory,
  PipelineExecutionContext,
  PipelineExecutionResult,
  PipelineExecutionStatus 
} from '../ErrorTypes';
import { Message, MessageResponse } from 'rcc-basemodule';

// Mock dependencies
jest.mock('fs');
jest.mock('axios');
jest.mock('crypto');

describe('Qwen Pipeline Integration', () => {
  let qwenProvider: QwenProviderModule;
  let qwenCompatibility: QwenCompatibilityModule;
  let qwenAuthCenter: QwenAuthCenter;
  let errorHandlerCenter: ErrorHandlerCenter;
  let pipelineScheduler: PipelineScheduler;
  let configManager: PipelineConfigManager;
  let pipelineAssembler: PipelineAssembler;
  let mockFs: jest.Mocked<typeof fs>;
  let mockAxios: jest.Mocked<typeof axios>;

  // Test configuration
  const testPipelineConfig = {
    templateId: 'qwen-chat-primary',
    name: 'Qwen Chat Pipeline',
    description: 'Primary Qwen chat completion pipeline',
    version: '1.0.0',
    modules: {
      provider: {
        type: 'QwenProviderModule',
        config: {
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
        }
      },
      compatibility: {
        type: 'QwenCompatibilityModule',
        config: {
          direction: 'openai-to-qwen',
          mappingTable: 'qwen-mapping',
          strictMapping: true,
          modelMapping: {
            openaiToQwen: {
              'gpt-3.5-turbo': 'qwen-turbo',
              'gpt-4': 'qwen-plus'
            }
          }
        }
      }
    },
    routing: {
      rules: [
        {
          id: 'qwen-rule',
          name: 'Qwen Model Routing',
          condition: {
            model: ['gpt-3.5-turbo', 'gpt-4']
          },
          action: {
            pipelineId: 'qwen-chat-primary',
            priority: 1
          }
        }
      ]
    },
    errorHandling: {
      strategies: [
        {
          errorCode: PipelineErrorCode.TOKEN_EXPIRED,
          action: 'maintenance',
          retryCount: 0,
          shouldDestroyPipeline: false
        },
        {
          errorCode: PipelineErrorCode.AUTHENTICATION_FAILED,
          action: 'retry',
          retryCount: 2,
          retryDelay: 1000,
          shouldDestroyPipeline: false
        }
      ]
    }
  };

  const authConfig = {
    clientId: 'test-client-id',
    scope: 'openid profile model.completion',
    deviceAuthEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/device/code',
    tokenEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/token',
    accessTokenFile: './test-auth/qwen-access-token.json.json',
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
    configManager = new PipelineConfigManager(testPipelineConfig);
    errorHandlerCenter = new ErrorHandlerCenter(configManager);
    qwenAuthCenter = new QwenAuthCenter(authConfig, errorHandlerCenter);
    pipelineScheduler = new PipelineScheduler(configManager, errorHandlerCenter);
    pipelineAssembler = new PipelineAssembler(configManager);
    
    qwenProvider = new QwenProviderModule({
      id: 'qwen-provider',
      name: 'QwenProvider',
      version: '1.0.0',
      description: 'Qwen provider module',
      type: 'provider',
      dependencies: ['qwen-auth-center'],
      config: testPipelineConfig.modules.provider.config
    });
    
    qwenCompatibility = new QwenCompatibilityModule({
      id: 'qwen-compatibility',
      name: 'QwenCompatibility',
      version: '1.0.0',
      description: 'Qwen compatibility module',
      type: 'compatibility',
      dependencies: ['qwen-provider'],
      config: testPipelineConfig.modules.compatibility.config
    });
  });

  afterEach(async () => {
    if (qwenProvider) {
      await qwenProvider.destroy();
    }
    if (qwenCompatibility) {
      await qwenCompatibility.destroy();
    }
    if (qwenAuthCenter) {
      await qwenAuthCenter.destroy();
    }
    if (errorHandlerCenter) {
      await errorHandlerCenter.destroy();
    }
    if (pipelineScheduler) {
      await pipelineScheduler.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Pipeline Assembly', () => {
    it('should assemble Qwen pipeline successfully', async () => {
      const assemblyResult = await pipelineAssembler.assemblePipeline(testPipelineConfig);
      
      expect(assemblyResult.success).toBe(true);
      expect(assemblyResult.pipeline).toBeDefined();
      expect(assemblyResult.modules).toHaveLength(2);
    });

    it('should handle assembly configuration validation', async () => {
      const invalidConfig = { ...testPipelineConfig, templateId: '' };
      
      const assemblyResult = await pipelineAssembler.assemblePipeline(invalidConfig);
      
      expect(assemblyResult.success).toBe(false);
      expect(assemblyResult.error).toBeDefined();
    });

    it('should handle missing module dependencies', async () => {
      const configWithoutAuth = {
        ...testPipelineConfig,
        modules: {
          ...testPipelineConfig.modules,
          provider: {
            ...testPipelineConfig.modules.provider,
            dependencies: []
          }
        }
      };
      
      const assemblyResult = await pipelineAssembler.assemblePipeline(configWithoutAuth);
      
      expect(assemblyResult.success).toBe(false);
      expect(assemblyResult.error).toBeDefined();
    });
  });

  describe('Pipeline Scheduling', () => {
    beforeEach(async () => {
      await qwenAuthCenter.initialize();
      await qwenProvider.initialize();
      await qwenCompatibility.initialize();
      await errorHandlerCenter.initialize();
      await pipelineScheduler.initialize();
    });

    it('should schedule requests to Qwen pipeline', async () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello, world!' }
        ],
        temperature: 0.7,
        max_tokens: 1000
      };

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
      
      await qwenAuthCenter.loadStoredToken();
      
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
      
      const result = await pipelineScheduler.scheduleRequest(request);
      
      expect(result.status).toBe(PipelineExecutionStatus.COMPLETED);
      expect(result.result).toBeDefined();
      expect(result.result.choices).toHaveLength(1);
    });

    it('should handle authentication errors during scheduling', async () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello, world!' }
        ]
      };

      // Mock authentication failure
      mockFs.existsSync.mockReturnValue(false);
      
      const result = await pipelineScheduler.scheduleRequest(request);
      
      expect(result.status).toBe(PipelineExecutionStatus.FAILED);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(PipelineErrorCode.AUTHENTICATION_FAILED);
    });

    it('should handle pipeline maintenance mode', async () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello, world!' }
        ]
      };

      // Put pipeline in maintenance mode
      await qwenAuthCenter.enterMaintenanceMode();
      
      const result = await pipelineScheduler.scheduleRequest(request);
      
      expect(result.status).toBe(PipelineExecutionStatus.FAILED);
      expect(result.error?.code).toBe(PipelineErrorCode.MAINTENANCE_MODE);
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(async () => {
      await qwenAuthCenter.initialize();
      await qwenProvider.initialize();
      await qwenCompatibility.initialize();
      await errorHandlerCenter.initialize();
      await pipelineScheduler.initialize();
    });

    it('should handle token expiry with automatic refresh', async () => {
      const context: PipelineExecutionContext = {
        executionId: 'test-execution-id',
        pipelineId: 'qwen-chat-primary',
        instanceId: 'qwen-provider',
        startTime: Date.now(),
        timeout: 30000,
        payload: {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }]
        },
        retryCount: 0,
        maxRetries: 3
      };
      
      const tokenExpiredError = {
        code: PipelineErrorCode.TOKEN_EXPIRED,
        message: 'Token expired',
        category: PipelineErrorCategory.AUTHENTICATION,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'qwen-provider' as any,
        pipelineId: 'qwen-chat-primary',
        instanceId: 'qwen-provider',
        timestamp: Date.now()
      };
      
      // Mock successful token refresh
      mockAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile model.completion',
          created_at: Math.floor(Date.now() / 1000)
        }
      });
      
      const action = await errorHandlerCenter.handleError(tokenExpiredError, context);
      
      expect(action.action).toBe('maintenance');
      expect(action.shouldRetry).toBe(false);
    });

    it('should handle rate limiting with backoff', async () => {
      const context: PipelineExecutionContext = {
        executionId: 'test-execution-id',
        pipelineId: 'qwen-chat-primary',
        instanceId: 'qwen-provider',
        startTime: Date.now(),
        timeout: 30000,
        payload: {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }]
        },
        retryCount: 0,
        maxRetries: 3
      };
      
      const rateLimitError = {
        code: PipelineErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        category: PipelineErrorCategory.RATE_LIMITING,
        severity: 'medium' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'qwen-provider' as any,
        pipelineId: 'qwen-chat-primary',
        instanceId: 'qwen-provider',
        timestamp: Date.now()
      };
      
      const action = await errorHandlerCenter.handleError(rateLimitError, context);
      
      expect(action.action).toBe('blacklist_temporary');
      expect(action.shouldRetry).toBe(false);
    });

    it('should handle network errors with failover', async () => {
      const context: PipelineExecutionContext = {
        executionId: 'test-execution-id',
        pipelineId: 'qwen-chat-primary',
        instanceId: 'qwen-provider',
        startTime: Date.now(),
        timeout: 30000,
        payload: {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }]
        },
        retryCount: 0,
        maxRetries: 3
      };
      
      const networkError = {
        code: PipelineErrorCode.CONNECTION_FAILED,
        message: 'Connection failed',
        category: PipelineErrorCategory.NETWORK,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'qwen-provider' as any,
        pipelineId: 'qwen-chat-primary',
        instanceId: 'qwen-provider',
        timestamp: Date.now()
      };
      
      const action = await errorHandlerCenter.handleError(networkError, context);
      
      expect(action.action).toBe('failover');
      expect(action.shouldRetry).toBe(true);
    });
  });

  describe('Message Flow Integration', () => {
    beforeEach(async () => {
      await qwenAuthCenter.initialize();
      await qwenProvider.initialize();
      await qwenCompatibility.initialize();
      await errorHandlerCenter.initialize();
      await pipelineScheduler.initialize();
    });

    it('should handle token refresh instructions from scheduler', async () => {
      const message: Message = {
        id: 'test-message-id',
        type: 'token_refresh_instruction',
        source: 'scheduler',
        target: 'qwen-auth-center',
        payload: {
          pipelineId: 'qwen-chat-primary',
          instanceId: 'qwen-provider'
        },
        timestamp: Date.now()
      };

      // Mock successful token refresh
      mockAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile model.completion',
          created_at: Math.floor(Date.now() / 1000)
        }
      });
      
      const response = await qwenAuthCenter.handleMessage(message) as MessageResponse;
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it('should handle pipeline status updates', async () => {
      const message: Message = {
        id: 'test-message-id',
        type: 'pipeline_status_update',
        source: 'qwen-provider',
        target: 'scheduler',
        payload: {
          pipelineId: 'qwen-chat-primary',
          status: 'healthy',
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };

      const response = await pipelineScheduler.handleMessage(message) as MessageResponse;
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it('should handle error notifications between modules', async () => {
      const message: Message = {
        id: 'test-message-id',
        type: 'error_notification',
        source: 'qwen-provider',
        target: 'error-handler-center',
        payload: {
          error: {
            code: PipelineErrorCode.TOKEN_EXPIRED,
            message: 'Token expired',
            pipelineId: 'qwen-chat-primary',
            timestamp: Date.now()
          }
        },
        timestamp: Date.now()
      };

      const response = await errorHandlerCenter.handleMessage(message) as MessageResponse;
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });
  });

  describe('Performance and Monitoring', () => {
    beforeEach(async () => {
      await qwenAuthCenter.initialize();
      await qwenProvider.initialize();
      await qwenCompatibility.initialize();
      await errorHandlerCenter.initialize();
      await pipelineScheduler.initialize();
    });

    it('should track pipeline performance metrics', async () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello, world!' }
        ]
      };

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
      
      await qwenAuthCenter.loadStoredToken();
      
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
      
      const startTime = Date.now();
      await pipelineScheduler.scheduleRequest(request);
      const endTime = Date.now();
      
      const metrics = pipelineScheduler.getMetrics();
      
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeLessThan(endTime - startTime + 100);
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(5).fill(null).map((_, i) => ({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: `Hello ${i}!` }]
      }));

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
      
      await qwenAuthCenter.loadStoredToken();
      
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
      
      const results = await Promise.all(requests.map(req => pipelineScheduler.scheduleRequest(req)));
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r.status === PipelineExecutionStatus.COMPLETED)).toBe(true);
      
      const metrics = pipelineScheduler.getMetrics();
      expect(metrics.totalRequests).toBe(5);
      expect(metrics.successfulRequests).toBe(5);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should clean up all pipeline resources properly', async () => {
      await qwenAuthCenter.initialize();
      await qwenProvider.initialize();
      await qwenCompatibility.initialize();
      await errorHandlerCenter.initialize();
      await pipelineScheduler.initialize();
      
      // Destroy in reverse order
      await pipelineScheduler.destroy();
      await errorHandlerCenter.destroy();
      await qwenCompatibility.destroy();
      await qwenProvider.destroy();
      await qwenAuthCenter.destroy();
      
      // Verify all resources are cleaned up
      expect(qwenAuthCenter['authState']).toBe('uninitialized');
      expect(qwenProvider['authCenter']).toBeUndefined();
    });
  });
});