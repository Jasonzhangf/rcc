/**
 * Qwen Authentication Center Tests
 * Tests for Qwen authentication center integration with error handling system
 */

import { QwenAuthCenter } from '../modules/QwenAuthCenter';
import { ErrorHandlerCenter } from '../ErrorHandlerCenter';
import { PipelineConfigManager } from '../PipelineConfig';
import { 
  PipelineErrorCode, 
  PipelineErrorCategory,
  PipelineExecutionContext 
} from '../ErrorTypes';
import { Message, MessageResponse } from 'rcc-basemodule';

// Mock dependencies
jest.mock('fs');
jest.mock('axios');
jest.mock('crypto');

describe('QwenAuthCenter', () => {
  let qwenAuthCenter: QwenAuthCenter;
  let errorHandlerCenter: ErrorHandlerCenter;
  let configManager: PipelineConfigManager;
  let mockFs: jest.Mocked<typeof fs>;
  let mockAxios: jest.Mocked<typeof axios>;
  let mockCrypto: jest.Mocked<typeof crypto>;

  // Test configuration
  const testConfig = {
    clientId: 'test-client-id',
    scope: 'openid profile model.completion',
    deviceAuthEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/device/code',
    tokenEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/token',
    accessTokenFile: './test-auth/qwen-access-token.json',
    refreshTokenFile: './test-auth/qwen-refresh-token.json',
    refreshThreshold: 300000, // 5 minutes
    pollingInterval: 5000,
    maxPollingAttempts: 60,
    enablePKCE: true,
    maintenanceCallback: 'test_maintenance_callback'
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
    mockFs.unlinkSync.mockImplementation(() => undefined);
    mockFs.readFileSync.mockReturnValue('{}');
    
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
    configManager = new PipelineConfigManager({});
    errorHandlerCenter = new ErrorHandlerCenter(configManager);
    qwenAuthCenter = new QwenAuthCenter(testConfig, errorHandlerCenter);
  });

  afterEach(async () => {
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
      await expect(qwenAuthCenter.initialize()).resolves.not.toThrow();
      
      const status = qwenAuthCenter.getAuthStatus();
      expect(status.state).toBe('uninitialized');
      expect(status.isAuthorized).toBe(false);
    });

    it('should fail initialization with invalid configuration', async () => {
      const invalidConfig = { ...testConfig, clientId: '' };
      const invalidAuthCenter = new QwenAuthCenter(invalidConfig, errorHandlerCenter);
      
      await expect(invalidAuthCenter.initialize()).rejects.toThrow();
    });

    it('should create auth directory if it does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await qwenAuthCenter.initialize();
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('test-auth'),
        { recursive: true }
      );
    });

    it('should register error handlers with error handling center', async () => {
      const registerSpy = jest.spyOn(errorHandlerCenter, 'registerCustomHandler');
      
      await qwenAuthCenter.initialize();
      
      expect(registerSpy).toHaveBeenCalledWith(
        PipelineErrorCode.TOKEN_EXPIRED,
        expect.any(Function)
      );
      expect(registerSpy).toHaveBeenCalledWith(
        PipelineErrorCode.AUTHENTICATION_FAILED,
        expect.any(Function)
      );
    });
  });

  describe('Device Authorization', () => {
    beforeEach(async () => {
      await qwenAuthCenter.initialize();
    });

    it('should start device authorization successfully', async () => {
      const deviceAuth = await qwenAuthCenter.startDeviceAuthorization();
      
      expect(deviceAuth.device_code).toBe('test-device-code');
      expect(deviceAuth.user_code).toBe('TEST-USER-CODE');
      expect(deviceAuth.verification_uri).toBe('https://chat.qwen.ai/device');
      
      const status = qwenAuthCenter.getAuthStatus();
      expect(status.state).toBe('pending_authorization');
      expect(status.deviceCode).toBe('test-device-code');
      expect(status.userCode).toBe('TEST-USER-CODE');
    });

    it('should generate PKCE codes when enabled', async () => {
      await qwenAuthCenter.startDeviceAuthorization();
      
      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
      
      // Verify the POST request includes PKCE parameters
      expect(mockAxios.post).toHaveBeenCalledWith(
        testConfig.deviceAuthEndpoint,
        expect.objectContaining({
          client_id: testConfig.clientId,
          scope: testConfig.scope,
          code_challenge: 'mock-hash',
          code_challenge_method: 'S256'
        }),
        expect.any(Object)
      );
    });

    it('should handle device authorization failure', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network error'));
      
      await expect(qwenAuthCenter.startDeviceAuthorization()).rejects.toThrow('Network error');
      
      const status = qwenAuthCenter.getAuthStatus();
      expect(status.state).toBe('error');
    });
  });

  describe('Token Management', () => {
    const mockTokenData = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'openid profile model.completion',
      created_at: Math.floor(Date.now() / 1000)
    };

    beforeEach(async () => {
      await qwenAuthCenter.initialize();
    });

    it('should store token successfully', async () => {
      // Mock successful token response
      mockAxios.post.mockResolvedValue({
        data: mockTokenData
      });
      
      await qwenAuthCenter.startDeviceAuthorization();
      
      // Simulate successful token reception
      const status = qwenAuthCenter.getAuthStatus();
      expect(status.state).toBe('authorized');
    });

    it('should load existing token from files', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify(mockTokenData))
        .mockReturnValueOnce(JSON.stringify({ refresh_token: 'mock-refresh-token' }));
      
      await qwenAuthCenter.initialize();
      
      const status = qwenAuthCenter.getAuthStatus();
      expect(status.state).toBe('authorized');
    });

    it('should handle token loading failure', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      
      await qwenAuthCenter.initialize();
      
      const status = qwenAuthCenter.getAuthStatus();
      expect(status.state).toBe('uninitialized');
    });

    it('should invalidate token successfully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      
      await qwenAuthCenter.invalidateToken();
      
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(testConfig.accessTokenFile);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(testConfig.refreshTokenFile);
      
      const status = qwenAuthCenter.getAuthStatus();
      expect(status.state).toBe('uninitialized');
    });
  });

  describe('Error Handling Integration', () => {
    let mockContext: PipelineExecutionContext;

    beforeEach(async () => {
      await qwenAuthCenter.initialize();
      
      mockContext = {
        executionId: 'test-execution-id',
        pipelineId: 'test-pipeline-id',
        instanceId: 'test-instance-id',
        startTime: Date.now(),
        timeout: 30000,
        payload: {},
        retryCount: 0,
        maxRetries: 3
      };
    });

    it('should handle token expired error with maintenance action', async () => {
      const tokenExpiredError = {
        code: PipelineErrorCode.TOKEN_EXPIRED,
        message: 'Token has expired',
        category: PipelineErrorCategory.AUTHENTICATION,
        severity: 'high' as const,
        recoverability: 'recoverable' as const,
        impact: 'single_module' as const,
        source: 'qwen-auth-center' as const,
        pipelineId: 'test-pipeline-id',
        instanceId: 'test-instance-id',
        timestamp: Date.now()
      };

      // Get the registered error handler
      const errorHandler = errorHandlerCenter['customHandlers'].get(PipelineErrorCode.TOKEN_EXPIRED);
      
      if (errorHandler) {
        const action = await errorHandler(tokenExpiredError, mockContext);
        
        expect(action.action).toBe('maintenance');
        expect(action.shouldRetry).toBe(false);
      }
    });

    it('should handle authentication failed error with retry action', async () => {
      const authFailedError = {
        code: PipelineErrorCode.AUTHENTICATION_FAILED,
        message: 'Authentication failed',
        category: PipelineErrorCategory.AUTHENTICATION,
        severity: 'high' as const,
        recoverability: 'recoverable' as const,
        impact: 'single_module' as const,
        source: 'qwen-auth-center' as const,
        pipelineId: 'test-pipeline-id',
        instanceId: 'test-instance-id',
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

      // Get the registered error handler
      const errorHandler = errorHandlerCenter['customHandlers'].get(PipelineErrorCode.AUTHENTICATION_FAILED);
      
      if (errorHandler) {
        const action = await errorHandler(authFailedError, mockContext);
        
        expect(action.action).toBe('retry');
        expect(action.shouldRetry).toBe(true);
        expect(action.retryDelay).toBe(1000);
      }
    });

    it('should handle refresh token failure with maintenance action', async () => {
      const authFailedError = {
        code: PipelineErrorCode.AUTHENTICATION_FAILED,
        message: 'Authentication failed',
        category: PipelineErrorCategory.AUTHENTICATION,
        severity: 'high' as const,
        recoverability: 'recoverable' as const,
        impact: 'single_module' as const,
        source: 'qwen-auth-center' as const,
        pipelineId: 'test-pipeline-id',
        instanceId: 'test-instance-id',
        timestamp: Date.now()
      };

      // Mock failed token refresh
      mockAxios.post.mockRejectedValue(new Error('Refresh failed'));

      // Get the registered error handler
      const errorHandler = errorHandlerCenter['customHandlers'].get(PipelineErrorCode.AUTHENTICATION_FAILED);
      
      if (errorHandler) {
        const action = await errorHandler(authFailedError, mockContext);
        
        expect(action.action).toBe('maintenance');
        expect(action.shouldRetry).toBe(false);
      }
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await qwenAuthCenter.initialize();
    });

    it('should handle get_auth_status message', async () => {
      const message: Message = {
        id: 'test-message-id',
        type: 'get_auth_status',
        source: 'test-source',
        target: 'qwen-auth-center',
        payload: {},
        timestamp: Date.now()
      };

      const response = await qwenAuthCenter.handleMessage(message) as MessageResponse;
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.state).toBe('uninitialized');
    });

    it('should handle refresh_token message', async () => {
      const message: Message = {
        id: 'test-message-id',
        type: 'refresh_token',
        source: 'test-source',
        target: 'qwen-auth-center',
        payload: {},
        timestamp: Date.now()
      };

      const response = await qwenAuthCenter.handleMessage(message) as MessageResponse;
      
      expect(response.success).toBe(false); // Should fail without valid refresh token
    });

    it('should handle token_refresh_instruction message', async () => {
      const message: Message = {
        id: 'test-message-id',
        type: 'token_refresh_instruction',
        source: 'scheduler',
        target: 'qwen-auth-center',
        payload: {},
        timestamp: Date.now()
      };

      const response = await qwenAuthCenter.handleMessage(message) as MessageResponse;
      
      expect(response.success).toBe(false); // Should fail without valid refresh token
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await qwenAuthCenter.initialize();
    });

    it('should track authentication statistics', async () => {
      const initialStats = qwenAuthCenter.getAuthStats();
      expect(initialStats.totalAuthAttempts).toBe(0);
      expect(initialStats.successfulAuths).toBe(0);
      expect(initialStats.failedAuths).toBe(0);
      
      // Simulate failed authorization attempt
      mockAxios.post.mockRejectedValue(new Error('Network error'));
      
      try {
        await qwenAuthCenter.startDeviceAuthorization();
      } catch (error) {
        // Expected to fail
      }
      
      const updatedStats = qwenAuthCenter.getAuthStats();
      expect(updatedStats.totalAuthAttempts).toBe(1);
      expect(updatedStats.failedAuths).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources properly', async () => {
      await qwenAuthCenter.initialize();
      
      const unregisterSpy = jest.spyOn(errorHandlerCenter, 'unregisterCustomHandler');
      
      await qwenAuthCenter.destroy();
      
      expect(unregisterSpy).toHaveBeenCalledWith(PipelineErrorCode.TOKEN_EXPIRED);
      expect(unregisterSpy).toHaveBeenCalledWith(PipelineErrorCode.AUTHENTICATION_FAILED);
    });
  });
});

describe('Qwen Error Handling Configuration', () => {
  const { getQwenErrorHandlingStrategies, isQwenError, getQwenAuthErrorAction } = require('../QwenErrorHandling');

  it('should provide Qwen-specific error handling strategies', () => {
    const strategies = getQwenErrorHandlingStrategies();
    
    expect(strategies).toHaveLength(17); // Number of Qwen-specific error codes
    
    const deviceCodeStrategy = strategies.find(s => s.errorCode === PipelineErrorCode.QWEN_DEVICE_CODE_EXPIRED);
    expect(deviceCodeStrategy).toBeDefined();
    expect(deviceCodeStrategy?.action).toBe('maintenance');
  });

  it('should identify Qwen-specific errors', () => {
    expect(isQwenError(PipelineErrorCode.QWEN_DEVICE_CODE_EXPIRED)).toBe(true);
    expect(isQwenError(PipelineErrorCode.QWEN_ACCESS_DENIED)).toBe(true);
    expect(isQwenError(PipelineErrorCode.TOKEN_EXPIRED)).toBe(false);
    expect(isQwenError(PipelineErrorCode.INTERNAL_ERROR)).toBe(false);
  });

  it('should provide recommended actions for authentication errors', () => {
    expect(getQwenAuthErrorAction(PipelineErrorCode.QWEN_DEVICE_CODE_EXPIRED)).toBe('maintenance');
    expect(getQwenAuthErrorAction(PipelineErrorCode.QWEN_SLOW_DOWN)).toBe('retry');
    expect(getQwenAuthErrorAction(PipelineErrorCode.QWEN_ACCESS_DENIED)).toBe('blacklist_permanent');
  });
});