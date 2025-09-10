/**
 * OAuth2 Module Tests
 * Tests for the simplified OAuth2 implementation
 */

import { OAuth2Module } from '../OAuth2Module';
import { TokenStorage } from '../TokenStorage';
import { ErrorHandlerCenter } from 'sharedmodule/pipeline';
import { PipelineConfigManager } from 'sharedmodule/pipeline';
import { OAuth2ModuleConfig, OAuth2ErrorCode } from '../OAuth2Types';
import { BaseModule } from 'rcc-basemodule';

// Mock dependencies
jest.mock('axios');
jest.mock('fs');
jest.mock('sharedmodule/pipeline');

describe('OAuth2Module', () => {
  let oauth2Module: OAuth2Module;
  let mockErrorHandlerCenter: jest.Mocked<ErrorHandlerCenter>;
  let mockConfigManager: jest.Mocked<PipelineConfigManager>;
  let mockAxios: jest.Mocked<typeof import('axios')>;
  let mockFs: jest.Mocked<typeof import('fs')>;

  const mockConfig: OAuth2ModuleConfig = {
    clientId: 'test-client-id',
    scope: 'openid profile email',
    deviceAuthEndpoint: 'https://auth.example.com/device/code',
    tokenEndpoint: 'https://auth.example.com/token',
    tokenStoragePath: './test-tokens/',
    enablePKCE: true
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock ErrorHandlerCenter
    mockErrorHandlerCenter = {
      handleError: jest.fn(),
      registerCustomHandler: jest.fn(),
      unregisterCustomHandler: jest.fn(),
      sendMessage: jest.fn(),
      registerMessageHandler: jest.fn(),
      // Add other required methods...
    } as any;

    // Setup mock PipelineConfigManager
    mockConfigManager = {
      getConfig: jest.fn(),
      getErrorHandlingStrategy: jest.fn(),
      // Add other required methods...
    } as any;

    // Setup mock axios
    mockAxios = require('axios') as jest.Mocked<typeof import('axios')>;
    mockAxios.post = jest.fn();
    mockAxios.create = jest.fn().mockReturnThis();

    // Setup mock fs
    mockFs = require('fs') as jest.Mocked<typeof import('fs')>;
    mockFs.existsSync = jest.fn();
    mockFs.mkdirSync = jest.fn();
    mockFs.readdirSync = jest.fn();
    mockFs.statSync = jest.fn();

    // Create OAuth2 module instance
    oauth2Module = new OAuth2Module(mockConfig, mockErrorHandlerCenter);
  });

  describe('Constructor', () => {
    it('should create OAuth2 module with default configuration', () => {
      expect(oauth2Module).toBeInstanceOf(BaseModule);
      expect(oauth2Module.getStats()).toEqual({
        totalAuthAttempts: 0,
        successfulAuths: 0,
        failedAuths: 0,
        tokenRefreshes: 0
      });
    });

    it('should use default PKCE setting when not specified', () => {
      const configWithoutPKCE = { ...mockConfig, enablePKCE: undefined };
      const module = new OAuth2Module(configWithoutPKCE, mockErrorHandlerCenter);
      // Module should use default PKCE setting (true)
      expect(module).toBeDefined();
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      mockFs.existsSync.mockReturnValue(true);
      
      await oauth2Module.initialize();

      expect(mockErrorHandlerCenter.registerCustomHandler).toHaveBeenCalledTimes(2);
      expect(mockErrorHandlerCenter.registerCustomHandler).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function)
      );
    });

    it('should fail initialization with missing client ID', async () => {
      const invalidConfig = { ...mockConfig, clientId: '' };
      const module = new OAuth2Module(invalidConfig, mockErrorHandlerCenter);

      await expect(module.initialize()).rejects.toThrow('Client ID is required');
    });

    it('should fail initialization with missing device auth endpoint', async () => {
      const invalidConfig = { ...mockConfig, deviceAuthEndpoint: '' };
      const module = new OAuth2Module(invalidConfig, mockErrorHandlerCenter);

      await expect(module.initialize()).rejects.toThrow('Device authorization endpoint is required');
    });
  });

  describe('Device Authorization', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(true);
      await oauth2Module.initialize();
    });

    it('should initiate device authorization successfully', async () => {
      const mockDeviceAuthResponse = {
        device_code: 'test-device-code',
        user_code: 'TEST-CODE',
        verification_uri: 'https://auth.example.com/device',
        verification_uri_complete: 'https://auth.example.com/device?code=TEST-CODE',
        expires_in: 300,
        interval: 5
      };

      mockAxios.post.mockResolvedValueOnce({
        data: mockDeviceAuthResponse
      });

      const result = await oauth2Module.initiateDeviceAuthorization();

      expect(result).toEqual(mockDeviceAuthResponse);
      expect(mockAxios.post).toHaveBeenCalledWith(
        mockConfig.deviceAuthEndpoint,
        expect.stringContaining('client_id=test-client-id'),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );
    });

    it('should handle device authorization error', async () => {
      const error = new Error('Network error');
      mockAxios.post.mockRejectedValueOnce(error);

      await expect(oauth2Module.initiateDeviceAuthorization()).rejects.toThrow('Network error');
      expect(mockErrorHandlerCenter.handleError).toHaveBeenCalled();
    });

    it('should include PKCE challenge when enabled', async () => {
      const module = new OAuth2Module({ ...mockConfig, enablePKCE: true }, mockErrorHandlerCenter);
      mockFs.existsSync.mockReturnValue(true);
      await module.initialize();

      mockAxios.post.mockResolvedValueOnce({
        data: {
          device_code: 'test-device-code',
          user_code: 'TEST-CODE',
          verification_uri: 'https://auth.example.com/device',
          verification_uri_complete: 'https://auth.example.com/device?code=TEST-CODE',
          expires_in: 300,
          interval: 5
        }
      });

      await module.initiateDeviceAuthorization();

      // Verify PKCE challenge was included in the request
      const call = mockAxios.post.mock.calls[0];
      expect(call[1]).toContain('code_challenge=');
      expect(call[1]).toContain('code_challenge_method=S256');
    });
  });

  describe('Token Request', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(true);
      await oauth2Module.initialize();
    });

    it('should request token successfully', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email'
      };

      mockAxios.post.mockResolvedValueOnce({
        data: mockTokenResponse
      });

      const result = await oauth2Module.requestToken('test-device-code', 'test-code-verifier');

      expect(result).toEqual({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer',
        expiresAt: expect.any(Number),
        scope: 'openid profile email'
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        mockConfig.tokenEndpoint,
        expect.stringContaining('device_code=test-device-code'),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );
    });

    it('should handle OAuth2 authorization pending error', async () => {
      const errorResponse = {
        response: {
          data: {
            error: 'authorization_pending'
          }
        }
      };

      mockAxios.post.mockRejectedValueOnce(errorResponse);

      await expect(oauth2Module.requestToken('test-device-code')).rejects.toThrow('Authorization pending');
      expect(mockErrorHandlerCenter.handleError).toHaveBeenCalled();
    });

    it('should handle OAuth2 access denied error', async () => {
      const errorResponse = {
        response: {
          data: {
            error: 'access_denied'
          }
        }
      };

      mockAxios.post.mockRejectedValueOnce(errorResponse);

      await expect(oauth2Module.requestToken('test-device-code')).rejects.toThrow('Access denied by user');
      expect(mockErrorHandlerCenter.handleError).toHaveBeenCalled();
    });
  });

  describe('Token Refresh', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(true);
      await oauth2Module.initialize();
    });

    it('should refresh token successfully', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email'
      };

      mockAxios.post.mockResolvedValueOnce({
        data: mockTokenResponse
      });

      const result = await oauth2Module.refreshToken('test-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenType: 'Bearer',
        expiresAt: expect.any(Number),
        scope: 'openid profile email'
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        mockConfig.tokenEndpoint,
        expect.stringContaining('grant_type=refresh_token'),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );
    });

    it('should handle token refresh error', async () => {
      const error = new Error('Refresh failed');
      mockAxios.post.mockRejectedValueOnce(error);

      await expect(oauth2Module.refreshToken('test-refresh-token')).rejects.toThrow('Refresh failed');
      expect(mockErrorHandlerCenter.handleError).toHaveBeenCalled();
    });
  });

  describe('Token Status', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(true);
      await oauth2Module.initialize();
    });

    it('should return correct status when no token', () => {
      const status = oauth2Module.getTokenStatus();

      expect(status).toEqual({
        hasToken: false,
        isExpired: true
      });
    });

    it('should return correct status when token is valid', () => {
      // Set a valid token (expires in 1 hour)
      oauth2Module['currentToken'] = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 3600000,
        scope: 'openid profile email'
      };

      const status = oauth2Module.getTokenStatus();

      expect(status).toEqual({
        hasToken: true,
        isExpired: false,
        expiresAt: expect.any(Number),
        timeUntilExpiry: expect.any(Number),
        tokenType: 'Bearer',
        scope: 'openid profile email'
      });
    });

    it('should return correct status when token is expired', () => {
      // Set an expired token (expired 1 hour ago)
      oauth2Module['currentToken'] = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        tokenType: 'Bearer',
        expiresAt: Date.now() - 3600000,
        scope: 'openid profile email'
      };

      const status = oauth2Module.getTokenStatus();

      expect(status).toEqual({
        hasToken: true,
        isExpired: true,
        expiresAt: expect.any(Number),
        timeUntilExpiry: 0,
        tokenType: 'Bearer',
        scope: 'openid profile email'
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(true);
      await oauth2Module.initialize();
    });

    it('should handle token expired error with refresh', async () => {
      // Set up current token with refresh token
      oauth2Module['currentToken'] = {
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() - 3600000,
        scope: 'openid profile email'
      };

      // Mock successful refresh
      mockAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email'
        }
      });

      const mockError = {
        code: 'TOKEN_EXPIRED' as any,
        message: 'Token expired',
        category: 'authentication' as any,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'test',
        pipelineId: 'test',
        instanceId: 'test',
        timestamp: Date.now()
      };

      const mockContext = {
        executionId: 'test',
        pipelineId: 'test',
        instanceId: 'test',
        retryCount: 0
      };

      const handler = oauth2Module['handleTokenExpired'].bind(oauth2Module);
      const result = await handler(mockError, mockContext);

      expect(result).toEqual({
        action: 'retry',
        shouldRetry: true,
        message: 'Token refreshed successfully'
      });
    });

    it('should handle authentication failed error', async () => {
      const mockError = {
        code: 'AUTHENTICATION_FAILED' as any,
        message: 'Authentication failed',
        category: 'authentication' as any,
        severity: 'high' as any,
        recoverability: 'recoverable' as any,
        impact: 'single_module' as any,
        source: 'test',
        pipelineId: 'test',
        instanceId: 'test',
        timestamp: Date.now()
      };

      const mockContext = {
        executionId: 'test',
        pipelineId: 'test',
        instanceId: 'test',
        retryCount: 0
      };

      const handler = oauth2Module['handleAuthenticationFailed'].bind(oauth2Module);
      const result = await handler(mockError, mockContext);

      expect(result).toEqual({
        action: 'maintenance',
        shouldRetry: false,
        message: 'Authentication failed - requires user interaction'
      });
    });
  });

  describe('Message Handlers', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(true);
      await oauth2Module.initialize();
    });

    it('should handle get_token_status message', async () => {
      const message = {
        id: 'test-id',
        type: 'get_token_status',
        source: 'test',
        destination: 'oauth2-module',
        payload: {},
        timestamp: Date.now()
      };

      const response = await oauth2Module.handleMessage(message);

      expect(response).toEqual({
        success: true,
        data: {
          hasToken: false,
          isExpired: true
        }
      });
    });

    it('should handle get_oauth2_stats message', async () => {
      const message = {
        id: 'test-id',
        type: 'get_oauth2_stats',
        source: 'test',
        destination: 'oauth2-module',
        payload: {},
        timestamp: Date.now()
      };

      const response = await oauth2Module.handleMessage(message);

      expect(response).toEqual({
        success: true,
        data: {
          totalAuthAttempts: 0,
          successfulAuths: 0,
          failedAuths: 0,
          tokenRefreshes: 0
        }
      });
    });

    it('should handle invalidate_token message', async () => {
      const message = {
        id: 'test-id',
        type: 'invalidate_token',
        source: 'test',
        destination: 'oauth2-module',
        payload: {},
        timestamp: Date.now()
      };

      const response = await oauth2Module.handleMessage(message);

      expect(response).toEqual({
        success: true,
        data: {
          message: 'Token invalidated'
        }
      });

      const status = oauth2Module.getTokenStatus();
      expect(status.hasToken).toBe(false);
    });
  });

  describe('Token Storage Integration', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(true);
      await oauth2Module.initialize();
    });

    it('should save token for email', async () => {
      const tokenData = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 3600000,
        scope: 'openid profile email'
      };

      // Mock successful save
      const mockStorage = oauth2Module['tokenStorage'] as any;
      mockStorage.saveToken = jest.fn().mockResolvedValue(undefined);

      await oauth2Module.saveTokenForEmail('test@example.com', tokenData);

      expect(mockStorage.saveToken).toHaveBeenCalledWith('test@example.com', tokenData);
    });

    it('should load token for email', async () => {
      const tokenData = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 3600000,
        scope: 'openid profile email'
      };

      // Mock successful load
      const mockStorage = oauth2Module['tokenStorage'] as any;
      mockStorage.loadToken = jest.fn().mockResolvedValue(tokenData);

      const result = await oauth2Module.loadTokenForEmail('test@example.com');

      expect(result).toEqual(tokenData);
      expect(oauth2Module.getCurrentToken()).toEqual(tokenData);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(true);
      await oauth2Module.initialize();
    });

    it('should track authentication attempts', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: {
          device_code: 'test-device-code',
          user_code: 'TEST-CODE',
          verification_uri: 'https://auth.example.com/device',
          verification_uri_complete: 'https://auth.example.com/device?code=TEST-CODE',
          expires_in: 300,
          interval: 5
        }
      });

      await oauth2Module.initiateDeviceAuthorization();

      let stats = oauth2Module.getStats();
      expect(stats.totalAuthAttempts).toBe(1);

      // Simulate successful token request
      mockAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email'
        }
      });

      await oauth2Module.requestToken('test-device-code');

      stats = oauth2Module.getStats();
      expect(stats.successfulAuths).toBe(1);
    });

    it('should track failed authentication attempts', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(oauth2Module.initiateDeviceAuthorization()).rejects.toThrow();

      const stats = oauth2Module.getStats();
      expect(stats.totalAuthAttempts).toBe(1);
      expect(stats.failedAuths).toBe(1);
    });

    it('should track token refreshes', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email'
        }
      });

      await oauth2Module.refreshToken('test-refresh-token');

      const stats = oauth2Module.getStats();
      expect(stats.tokenRefreshes).toBe(1);
    });
  });
});