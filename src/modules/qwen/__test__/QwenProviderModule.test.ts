/**
 * Qwen Provider Module Tests
 */

import { QwenProviderModule } from '../src/QwenProviderModule';
import { QwenProviderConfig, AuthState } from '../types/QwenProviderTypes';
import { ModuleInfo } from 'rcc-basemodule';

// Mock fs module
jest.mock('fs');
const mockFs = require('fs') as any;

// Mock axios
jest.mock('axios');
const mockAxios = require('axios') as any;

// Mock uuid
jest.mock('uuid');
const mockUuid = require('uuid') as any;

describe('QwenProviderModule', () => {
  let module: QwenProviderModule;
  let moduleInfo: ModuleInfo;
  let mockConfig: QwenProviderConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup module info
    moduleInfo = {
      id: 'test-qwen-provider',
      name: 'Test Qwen Provider',
      version: '0.1.0',
      description: 'Test Qwen provider module',
      dependencies: [],
      config: {}
    };

    // Setup mock config
    mockConfig = {
      provider: 'qwen',
      endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      auth: {
        type: 'qwen',
        accessTokenFile: './test-tokens/qwen-access.json',
        refreshTokenFile: './test-tokens/qwen-refresh.json',
        deviceFlow: {
          enabled: true,
          clientId: 'test-client-id',
          scope: 'test-scope',
          pkce: false,
          authEndpoint: 'https://test-auth.com/device',
          tokenEndpoint: 'https://test-token.com/token'
        }
      },
      model: 'qwen-turbo',
      timeout: 30000,
      debug: {
        enabled: true,
        logLevel: 'debug'
      }
    };

    // Mock fs.existsSync
    mockFs.existsSync = jest.fn().mockReturnValue(false);
    
    // Mock fs.mkdirSync
    mockFs.mkdirSync = jest.fn();
    
    // Mock fs.writeFileSync
    mockFs.writeFileSync = jest.fn();
    
    // Mock fs.readFileSync
    mockFs.readFileSync = jest.fn();
    
    // Mock fs.unlinkSync
    mockFs.unlinkSync = jest.fn();

    // Mock axios.create
    mockAxios.create = jest.fn().mockReturnValue({
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    });

    // Mock uuid.v4
    mockUuid.v4 = jest.fn().mockReturnValue('test-uuid');

    // Create module instance
    module = new QwenProviderModule(moduleInfo);
  });

  describe('Constructor', () => {
    it('should create module instance with correct configuration', () => {
      expect(module).toBeInstanceOf(QwenProviderModule);
      expect(module.moduleName).toBe('Test Qwen Provider');
    });
  });

  describe('configure', () => {
    it('should configure module with provided config', async () => {
      await module.configure(mockConfig);

      expect((module as any).config).toEqual(mockConfig);
      expect(mockAxios.create).toHaveBeenCalledWith({
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });
  });

  describe('initialize', () => {
    beforeEach(async () => {
      await module.configure(mockConfig);
    });

    it('should initialize successfully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'test-scope',
        created_at: Math.floor(Date.now() / 1000)
      }));

      await module.initialize();

      expect(mockFs.mkdirSync).toHaveBeenCalled();
      expect(mockFs.existsSync).toHaveBeenCalledTimes(2);
      expect(mockFs.readFileSync).toHaveBeenCalledTimes(2);
    });

    it('should handle missing token files', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await module.initialize();

      expect((module as any).authState).toBe(AuthState.UNINITIALIZED);
      expect((module as any).storedToken).toBeNull();
    });
  });

  describe('getAuthStatus', () => {
    beforeEach(async () => {
      await module.configure(mockConfig);
    });

    it('should return unauthorized status when not initialized', () => {
      const status = module.getAuthStatus();

      expect(status.state).toBe(AuthState.UNINITIALIZED);
      expect(status.isAuthorized).toBe(false);
      expect(status.isExpired).toBe(true);
    });

    it('should return authorized status when token is valid', async () => {
      // Set valid token
      (module as any).storedToken = {
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        scope: 'test-scope',
        createdAt: Date.now()
      };
      (module as any).authState = AuthState.AUTHORIZED;

      const status = module.getAuthStatus();

      expect(status.state).toBe(AuthState.AUTHORIZED);
      expect(status.isAuthorized).toBe(true);
      expect(status.isExpired).toBe(false);
    });
  });

  describe('startDeviceAuthorization', () => {
    beforeEach(async () => {
      await module.configure(mockConfig);
      await module.initialize();
    });

    it('should start device authorization flow', async () => {
      const mockDeviceAuth = {
        device_code: 'test-device-code',
        user_code: 'TEST-USER-CODE',
        verification_uri: 'https://test.com/verify',
        verification_uri_complete: 'https://test.com/verify?code=TEST-USER-CODE',
        expires_in: 600,
        interval: 5
      };

      mockAxios.create().post.mockResolvedValue({
        data: mockDeviceAuth
      });

      const result = await module.startDeviceAuthorization();

      expect(result).toEqual(mockDeviceAuth);
      expect((module as any).authState).toBe(AuthState.PENDING_AUTHORIZATION);
      expect((module as any).deviceCodeInfo).toEqual(mockDeviceAuth);
    });

    it('should throw error when device flow is not enabled', async () => {
      await module.configure({
        ...mockConfig,
        auth: {
          ...mockConfig.auth,
          deviceFlow: {
            ...mockConfig.auth.deviceFlow!,
            enabled: false
          }
        }
      });

      await expect(module.startDeviceAuthorization()).rejects.toThrow('Device flow is not enabled');
    });
  });

  describe('getAccessToken', () => {
    beforeEach(async () => {
      await module.configure(mockConfig);
      await module.initialize();
    });

    it('should return access token when available and valid', async () => {
      const testToken = 'test-access-token';
      (module as any).storedToken = {
        accessToken: testToken,
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 3600000,
        scope: 'test-scope',
        createdAt: Date.now()
      };
      (module as any).authState = AuthState.AUTHORIZED;

      const token = await module.getAccessToken();

      expect(token).toBe(testToken);
    });

    it('should throw error when no token is available', async () => {
      await expect(module.getAccessToken()).rejects.toThrow('No valid access token available');
    });
  });

  describe('refreshToken', () => {
    beforeEach(async () => {
      await module.configure(mockConfig);
      await module.initialize();
    });

    it('should refresh token successfully', async () => {
      // Setup existing token
      (module as any).storedToken = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() - 1000, // Expired
        scope: 'test-scope',
        createdAt: Date.now() - 3600000
      };

      const mockNewToken = {
        access_token: 'new-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'test-scope',
        created_at: Math.floor(Date.now() / 1000)
      };

      mockAxios.create().post.mockResolvedValue({
        data: mockNewToken
      });

      await module.refreshToken();

      expect((module as any).authState).toBe(AuthState.AUTHORIZED);
      expect((module as any).storedToken.accessToken).toBe('new-token');
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it('should throw error when no refresh token is available', async () => {
      await expect(module.refreshToken()).rejects.toThrow('No refresh token available');
    });
  });

  describe('process', () => {
    beforeEach(async () => {
      await module.configure(mockConfig);
      await module.initialize();
    });

    it('should process request successfully when authorized', async () => {
      // Setup authorized state
      (module as any).storedToken = {
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 3600000,
        scope: 'test-scope',
        createdAt: Date.now()
      };
      (module as any).authState = AuthState.AUTHORIZED;

      const mockResponse = {
        request_id: 'test-request-id',
        output: {
          text: 'Test response'
        },
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          total_tokens: 15
        }
      };

      mockAxios.create().post.mockResolvedValue({
        data: mockResponse
      });

      const request = {
        model: 'qwen-turbo',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const response = await module.process(request);

      expect(response).toEqual(mockResponse);
      expect((module as any).metrics.totalRequests).toBe(1);
      expect((module as any).metrics.successfulRequests).toBe(1);
    });

    it('should throw error when not authorized', async () => {
      const request = {
        model: 'qwen-turbo',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(module.process(request)).rejects.toThrow('Qwen provider not authorized');
    });
  });

  describe('destroy', () => {
    it('should clean up resources properly', async () => {
      // Setup some state
      (module as any).storedToken = { accessToken: 'test' };
      (module as any).deviceCodeInfo = { device_code: 'test' };
      (module as any).refreshTimer = setTimeout(() => {}, 1000);
      (module as any).pollingTimer = setTimeout(() => {}, 1000);
      (module as any).debugLogs = [{ timestamp: Date.now(), level: 'debug', message: 'test', moduleId: 'test' }];

      await module.destroy();

      expect((module as any).storedToken).toBeNull();
      expect((module as any).deviceCodeInfo).toBeNull();
      expect((module as any).refreshTimer).toBeNull();
      expect((module as any).pollingTimer).toBeNull();
      expect((module as any).debugLogs).toEqual([]);
    });
  });
});