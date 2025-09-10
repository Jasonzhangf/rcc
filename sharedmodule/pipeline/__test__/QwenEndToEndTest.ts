/**
 * Qwen End-to-End Integration Test
 * Tests complete pipeline flow with authentication, compatibility conversion, and debug logging
 */

import { QwenProviderModule } from '../src/modules/QwenProviderModule';
import { QwenCompatibilityModule } from '../src/modules/QwenCompatibilityModule';
import { QwenDebugModule } from '../src/modules/QwenDebugModule';
import { Message, MessageResponse } from 'rcc-basemodule';

// Mock dependencies
jest.mock('fs');
jest.mock('axios');
jest.mock('crypto');

describe('Qwen End-to-End Integration Test', () => {
  let qwenProvider: QwenProviderModule;
  let qwenCompatibility: QwenCompatibilityModule;
  let qwenDebug: QwenDebugModule;
  let mockFs: jest.Mocked<typeof fs>;
  let mockAxios: jest.Mocked<typeof axios>;
  let mockCrypto: jest.Mocked<typeof crypto>;

  // Test configuration
  const providerConfig = {
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

  const compatibilityConfig = {
    direction: 'bidirectional' as const,
    mappingTable: 'openai-to-qwen',
    strictMapping: false,
    preserveUnknownFields: true,
    enableQwenOptimizations: true,
    modelMapping: {
      openaiToQwen: {
        'gpt-3.5-turbo': 'qwen-turbo',
        'gpt-4': 'qwen-plus'
      },
      qwenToOpenai: {
        'qwen-turbo': 'gpt-3.5-turbo',
        'qwen-plus': 'gpt-4'
      }
    }
  };

  const debugConfig = {
    enabled: true,
    logDirectory: './test-logs',
    maxLogSize: 1024 * 1024, // 1MB
    maxLogFiles: 5,
    logLevel: 'debug' as const,
    logRequests: true,
    logResponses: true,
    logErrors: true,
    logPerformance: true,
    logToolCalls: true,
    logAuth: true,
    logPipelineState: true,
    filterSensitiveData: true,
    sensitivePatterns: ['access_token', 'refresh_token', 'api_key']
  };

  beforeEach(() => {
    // Reset mocks
    mockFs = require('fs') as jest.Mocked<typeof fs>;
    mockAxios = require('axios') as jest.Mocked<typeof axios>;
    mockCrypto = require('crypto') as jest.Mocked<typeof crypto>;
    
    // Setup mock implementations
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.writeFileSync.mockImplementation(() => undefined);
    mockFs.readFileSync.mockReturnValue('{}');
    mockFs.unlinkSync.mockImplementation(() => undefined);
    mockFs.appendFileSync.mockImplementation(() => undefined);
    
    mockAxios.post.mockResolvedValue({
      data: {
        device_code: 'test-device-code',
        user_code: 'TEST-USER-CODE',
        verification_uri: 'https://chat.qwen.ai/device',
        verification_uri_complete: 'https://chat.qwen.ai/device?code=TEST-USER-CODE',
        expires_in: 600,
        interval: 5
      }
    });
    
    mockCrypto.createHash.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mock-hash')
    } as any);
    
    mockCrypto.randomBytes.mockReturnValue(Buffer.from('mock-random-bytes'));
    
    // Create test instances
    qwenProvider = new QwenProviderModule({
      id: 'qwen-provider',
      name: 'QwenProvider',
      version: '1.0.0',
      description: 'Qwen provider module',
      type: 'provider',
      dependencies: [],
      config: providerConfig
    });
    
    qwenCompatibility = new QwenCompatibilityModule({
      id: 'qwen-compatibility',
      name: 'QwenCompatibility',
      version: '1.0.0',
      description: 'Qwen compatibility module',
      type: 'compatibility',
      dependencies: [],
      config: compatibilityConfig
    });
    
    qwenDebug = new QwenDebugModule({
      id: 'qwen-debug',
      name: 'QwenDebug',
      version: '1.0.0',
      description: 'Qwen debug module',
      type: 'debug',
      dependencies: [],
      config: debugConfig
    });
  });

  afterEach(async () => {
    if (qwenProvider) {
      await qwenProvider.destroy();
    }
    if (qwenCompatibility) {
      await qwenCompatibility.destroy();
    }
    if (qwenDebug) {
      await qwenDebug.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Complete Pipeline Flow', () => {
    it('should handle complete OpenAI to Qwen to OpenAI flow with tools', async () => {
      // Initialize all modules
      await qwenDebug.initialize();
      await qwenCompatibility.initialize();
      await qwenProvider.initialize();

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

      await qwenProvider.startDeviceAuthorization();

      // Test OpenAI request with tools
      const openAIRequest = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'What is the weather in Beijing?' }
        ],
        temperature: 0.7,
        tools: [
          {
            type: 'function' as const,
            function: {
              name: 'get_weather',
              description: 'Get weather information for a location',
              parameters: {
                type: 'object' as const,
                properties: {
                  location: {
                    type: 'string',
                    description: 'The location to get weather for'
                  }
                },
                required: ['location']
              }
            }
          }
        ],
        tool_choice: 'auto'
      };

      // Log the request
      qwenDebug.logRequest('test-request-1', openAIRequest, 'test-module');

      // Convert OpenAI to Qwen using compatibility module
      const qwenRequest = qwenCompatibility.convertOpenAIToQwen(openAIRequest);

      // Verify conversion
      expect(qwenRequest.model).toBe('qwen-turbo');
      expect(qwenRequest.input.messages).toHaveLength(1);
      expect(qwenRequest.tools).toHaveLength(1);
      expect(qwenRequest.tool_choice).toBe('auto');

      // Mock Qwen API response with tool calls
      mockAxios.request.mockResolvedValue({
        data: {
          request_id: 'test-request-id',
          output: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'I will check the weather in Beijing for you.',
                  tool_calls: [
                    {
                      id: 'tool-call-1',
                      type: 'function',
                      function: {
                        name: 'get_weather',
                        arguments: JSON.stringify({ location: 'Beijing' })
                      }
                    }
                  ]
                },
                finish_reason: 'tool_calls',
                index: 0
              }
            ]
          },
          usage: {
            input_tokens: 25,
            output_tokens: 15,
            total_tokens: 40
          }
        }
      });

      // Process request through Qwen provider
      const qwenResponse = await qwenProvider.processRequest(qwenRequest);

      // Verify Qwen response
      expect(qwenResponse.request_id).toBe('test-request-id');
      expect(qwenResponse.output.choices).toHaveLength(1);
      expect(qwenResponse.output.choices[0].message.tool_calls).toHaveLength(1);

      // Log the response
      qwenDebug.logResponse('test-request-1', qwenResponse, 'test-module');

      // Convert Qwen response back to OpenAI format
      const openAIResponse = qwenCompatibility.convertQwenToOpenAI(qwenResponse, 'gpt-3.5-turbo');

      // Verify final OpenAI response
      expect(openAIResponse.id).toBe('test-request-id');
      expect(openAIResponse.object).toBe('chat.completion');
      expect(openAIResponse.choices).toHaveLength(1);
      expect(openAIResponse.choices[0].message.tool_calls).toHaveLength(1);
      expect(openAIResponse.choices[0].finish_reason).toBe('tool_calls');

      // Log the final response
      qwenDebug.logResponse('test-request-1-final', openAIResponse, 'test-module');

      // Verify debug logs
      const debugLogs = qwenDebug.getDebugLogs();
      expect(debugLogs.length).toBeGreaterThan(0);
      
      const requestLogs = debugLogs.filter(log => log.category === 'request');
      expect(requestLogs.length).toBeGreaterThan(0);
      
      const responseLogs = debugLogs.filter(log => log.category === 'response');
      expect(responseLogs.length).toBeGreaterThan(0);

      // Verify debug statistics
      const debugStats = qwenDebug.getDebugStats();
      expect(debugStats.totalRequests).toBeGreaterThan(0);
      expect(debugStats.totalResponses).toBeGreaterThan(0);
    });

    it('should handle authentication flow with debug logging', async () => {
      // Initialize modules
      await qwenDebug.initialize();
      await qwenProvider.initialize();

      // Log authentication state
      qwenDebug.logAuthState('uninitialized', { stage: 'initialization' }, 'test-module');

      // Start device authorization
      const deviceAuth = await qwenProvider.startDeviceAuthorization();

      // Log authentication state
      qwenDebug.logAuthState('pending_authorization', { 
        deviceCode: deviceAuth.device_code,
        userCode: deviceAuth.user_code 
      }, 'test-module');

      // Verify device authorization
      expect(deviceAuth.device_code).toBe('test-device-code');
      expect(deviceAuth.user_code).toBe('TEST-USER-CODE');

      // Mock successful token response
      mockAxios.post.mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile model.completion'
        }
      });

      // Simulate token acquisition
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

      // Log successful authentication
      qwenDebug.logAuthState('authorized', { 
        tokenStatus: 'valid',
        authMethod: 'device_flow'
      }, 'test-module');

      // Verify authentication state
      const authStatus = qwenProvider.getAuthStatus();
      expect(authStatus.isAuthorized).toBe(true);

      // Verify debug logs contain authentication events
      const authLogs = qwenDebug.getDebugLogs({ category: 'auth' });
      expect(authLogs.length).toBeGreaterThan(0);
      
      const authStateLogs = authLogs.filter(log => log.auth?.state === 'authorized');
      expect(authStateLogs.length).toBe(1);
    });

    it('should handle tool call execution flow', async () => {
      // Initialize modules
      await qwenDebug.initialize();
      await qwenCompatibility.initialize();

      // Test tool call result conversion
      const toolCallId = 'tool-call-1';
      const toolResult = {
        temperature: 25,
        condition: 'sunny',
        humidity: 60
      };

      // Convert tool result to message
      const toolMessage = qwenCompatibility.convertToolCallResultToMessage(
        toolCallId, 
        toolResult, 
        'get_weather'
      );

      // Verify tool message
      expect(toolMessage.role).toBe('tool');
      expect(toolMessage.tool_call_id).toBe(toolCallId);
      expect(toolMessage.name).toBe('get_weather');
      expect(toolMessage.content).toBe(JSON.stringify(toolResult));

      // Log tool calls
      qwenDebug.logToolCalls([
        {
          id: toolCallId,
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: JSON.stringify({ location: 'Beijing' })
          }
        }
      ], 'test-request-1', 'request', 'test-module');

      // Verify tool call logs
      const toolCallLogs = qwenDebug.getDebugLogs({ category: 'tool_calls' });
      expect(toolCallLogs.length).toBe(1);
      expect(toolCallLogs[0].data?.toolCallCount).toBe(1);
      expect(toolCallLogs[0].data?.toolNames).toContain('get_weather');
    });

    it('should handle pipeline state transitions', async () => {
      // Initialize modules
      await qwenDebug.initialize();

      // Log pipeline state transitions
      qwenDebug.logPipelineState('initialization', 'started', 'pipeline-1', 'exec-1');
      qwenDebug.logPipelineState('authentication', 'in_progress', 'pipeline-1', 'exec-1');
      qwenDebug.logPipelineState('authentication', 'completed', 'pipeline-1', 'exec-1');
      qwenDebug.logPipelineState('request_processing', 'in_progress', 'pipeline-1', 'exec-1');
      qwenDebug.logPipelineState('request_processing', 'completed', 'pipeline-1', 'exec-1');
      qwenDebug.logPipelineState('response_processing', 'in_progress', 'pipeline-1', 'exec-1');
      qwenDebug.logPipelineState('response_processing', 'completed', 'pipeline-1', 'exec-1');
      qwenDebug.logPipelineState('cleanup', 'started', 'pipeline-1', 'exec-1');
      qwenDebug.logPipelineState('cleanup', 'completed', 'pipeline-1', 'exec-1');

      // Verify pipeline state logs
      const pipelineLogs = qwenDebug.getDebugLogs({ category: 'state' });
      expect(pipelineLogs.length).toBe(8);

      // Verify state transitions
      const states = pipelineLogs.map(log => log.pipeline?.stage);
      expect(states).toContain('initialization');
      expect(states).toContain('authentication');
      expect(states).toContain('request_processing');
      expect(states).toContain('response_processing');
      expect(states).toContain('cleanup');

      // Verify all transitions are logged
      const statuses = pipelineLogs.map(log => log.pipeline?.status);
      expect(statuses).toContain('started');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('completed');
    });

    it('should handle error scenarios with debug logging', async () => {
      // Initialize modules
      await qwenDebug.initialize();
      await qwenProvider.initialize();

      // Log an error
      const testError = new Error('Test authentication error');
      qwenDebug.logError('Authentication failed', testError, 'test-module', 'auth');

      // Verify error logs
      const errorLogs = qwenDebug.getDebugLogs({ level: 'error' });
      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].message).toBe('Authentication failed');
      expect(errorLogs[0].error?.name).toBe('Error');
      expect(errorLogs[0].error?.message).toBe('Test authentication error');

      // Verify error statistics
      const debugStats = qwenDebug.getDebugStats();
      expect(debugStats.totalErrors).toBe(1);
    });

    it('should export debug logs in different formats', async () => {
      // Initialize modules
      await qwenDebug.initialize();

      // Add some test logs
      qwenDebug.logRequest('test-1', { model: 'gpt-3.5-turbo', messages: [] }, 'test-module');
      qwenDebug.logResponse('test-1', { request_id: 'test-1', output: { choices: [] } }, 'test-module');

      // Test JSON export
      const jsonExport = qwenDebug.exportDebugLogs('json');
      expect(jsonExport).toContain('"category":"request"');
      expect(jsonExport).toContain('"category":"response"');

      // Test CSV export
      const csvExport = qwenDebug.exportDebugLogs('csv');
      expect(csvExport).toContain('id,timestamp,level,module,category,message');
      expect(csvExport).toContain('request');
      expect(csvExport).toContain('response');
    });

    it('should handle message communication between modules', async () => {
      // Initialize modules
      await qwenDebug.initialize();

      // Test get_debug_logs message
      const debugMessage: Message = {
        id: 'msg-1',
        type: 'get_debug_logs',
        source: 'test-module',
        target: 'qwen-debug',
        payload: { limit: 10 },
        timestamp: Date.now()
      };

      const debugResponse = await qwenDebug.handleMessage(debugMessage) as MessageResponse;
      expect(debugResponse.success).toBe(true);
      expect(debugResponse.data).toBeDefined();
      expect(debugResponse.data.logs).toBeDefined();
      expect(debugResponse.data.stats).toBeDefined();

      // Test clear_debug_logs message
      const clearMessage: Message = {
        id: 'msg-2',
        type: 'clear_debug_logs',
        source: 'test-module',
        target: 'qwen-debug',
        payload: {},
        timestamp: Date.now()
      };

      const clearResponse = await qwenDebug.handleMessage(clearMessage) as MessageResponse;
      expect(clearResponse.success).toBe(true);
      expect(clearResponse.data.message).toBe('Debug logs cleared');

      // Verify logs are cleared
      const clearedLogs = qwenDebug.getDebugLogs();
      expect(clearedLogs.length).toBe(0);
    });

    it('should handle performance monitoring', async () => {
      // Initialize modules
      await qwenDebug.initialize();

      // Simulate request/response cycle with timing
      const startTime = Date.now();
      
      qwenDebug.logRequest('perf-test', { model: 'gpt-3.5-turbo', messages: [] }, 'test-module');
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      qwenDebug.logResponse('perf-test', { request_id: 'perf-test', output: { choices: [] } }, 'test-module');

      // Verify performance metrics
      const debugStats = qwenDebug.getDebugStats();
      expect(debugStats.averageResponseTime).toBeGreaterThan(0);
      expect(debugStats.totalRequests).toBe(1);
      expect(debugStats.totalResponses).toBe(1);
    });
  });

  describe('Compatibility Module Field Mapping', () => {
    it('should use field mapping tables for conversion', async () => {
      // Initialize compatibility module
      await qwenCompatibility.initialize();

      // Test complex OpenAI request
      const complexRequest = {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'Help me with something' }
        ],
        temperature: 0.8,
        max_tokens: 1000,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        stop: ['END'],
        stream: false,
        user: 'test-user',
        tools: [
          {
            type: 'function' as const,
            function: {
              name: 'calculate',
              description: 'Perform calculations',
              parameters: {
                type: 'object' as const,
                properties: {
                  expression: { type: 'string' }
                },
                required: ['expression']
              }
            }
          }
        ],
        tool_choice: 'auto'
      };

      // Convert using field mapping
      const qwenRequest = qwenCompatibility.convertOpenAIToQwen(complexRequest);

      // Verify field mapping worked correctly
      expect(qwenRequest.model).toBe('qwen-plus');
      expect(qwenRequest.input.messages).toHaveLength(4);
      expect(qwenRequest.parameters?.temperature).toBe(0.8);
      expect(qwenRequest.parameters?.max_tokens).toBe(1000);
      expect(qwenRequest.parameters?.top_p).toBe(0.9);
      expect(qwenRequest.parameters?.frequency_penalty).toBe(0.1);
      expect(qwenRequest.parameters?.presence_penalty).toBe(0.1);
      expect(qwenRequest.parameters?.stop).toEqual(['END']);
      expect(qwenRequest.stream).toBe(false);
      expect(qwenRequest.user).toBe('test-user');
      expect(qwenRequest.tools).toHaveLength(1);
      expect(qwenRequest.tool_choice).toBe('auto');

      // Get field mappings for inspection
      const fieldMappings = qwenCompatibility.getFieldMappings();
      expect(fieldMappings.openaiToQwen).toBeDefined();
      expect(fieldMappings.qwenToOpenai).toBeDefined();
      expect(Object.keys(fieldMappings.openaiToQwen).length).toBeGreaterThan(0);
    });
  });

  describe('Health Monitoring', () => {
    it('should provide health status for all modules', async () => {
      // Initialize modules
      await qwenDebug.initialize();
      await qwenCompatibility.initialize();
      await qwenProvider.initialize();

      // Check debug module health
      const debugHealth = await qwenDebug.getHealth();
      expect(debugHealth.status).toBe('healthy');
      expect(debugHealth.details.enabled).toBe(true);
      expect(debugHealth.details.logDirectory).toBe('./test-logs');

      // Check compatibility module health
      const compatibilityHealth = await qwenCompatibility.getHealth();
      expect(compatibilityHealth.status).toBe('healthy');

      // Check provider module health
      const providerHealth = await qwenProvider.getHealth();
      expect(providerHealth.status).toBeDefined();
    });
  });
});