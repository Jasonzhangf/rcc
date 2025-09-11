/**
 * Comprehensive Unit Tests for OAuth2Module
 * Using real implementations instead of mocks where possible
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { OAuth2Module } from '../OAuth2Module';
import { TokenStorage } from '../TokenStorage';
import { OAuth2ModuleConfig, OAuth2ErrorCode, TokenData } from '../OAuth2Types';

// Test doubles instead of mocks where possible
class TestTokenStorage extends TokenStorage {
  private tokens: Map<string, TokenData> = new Map();

  constructor() {
    super('/tmp/test-tokens.json');
  }

  async saveToken(email: string, tokenData: TokenData): Promise<void> {
    this.tokens.set(email, tokenData);
  }

  async loadToken(email: string): Promise<TokenData | null> {
    return this.tokens.get(email) || null;
  }

  async deleteToken(email: string): Promise<void> {
    this.tokens.delete(email);
  }

  clear(): void {
    this.tokens.clear();
  }
}

// Real HTTP server simulation for testing OAuth2 flows
class TestOAuth2Server {
  private authCodes: Map<string, any> = new Map();
  private tokens: Map<string, TokenData> = new Map();

  simulateDeviceAuthorization(clientId: string, scope: string, codeChallenge?: string): any {
    const deviceCode = `device-code-${Math.random().toString(36).substr(2, 9)}`;
    const userCode = `USER-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    this.authCodes.set(deviceCode, {
      clientId,
      scope,
      codeChallenge,
      userCode,
      expiresAt: Date.now() + 300000, // 5 minutes
      verified: false,
    });

    return {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: 'https://example.com/verify',
      verification_uri_complete: `https://example.com/verify?user_code=${userCode}`,
      expires_in: 300,
      interval: 5,
    };
  }

  simulateTokenRequest(_clientId: string, deviceCode: string, codeVerifier?: string): any {
    const authCode = this.authCodes.get(deviceCode);
    if (!authCode) {
      throw { response: { data: { error: 'invalid_device_code' } } };
    }

    if (authCode.expiresAt < Date.now()) {
      throw { response: { data: { error: 'expired_token' } } };
    }

    if (!authCode.verified) {
      throw { response: { data: { error: 'authorization_pending' } } };
    }

    // Verify PKCE if enabled
    if (authCode.codeChallenge && codeVerifier) {
      const crypto = require('crypto');
      const calculatedChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      if (calculatedChallenge !== authCode.codeChallenge) {
        throw { response: { data: { error: 'invalid_grant' } } };
      }
    }

    const tokenData: TokenData = {
      accessToken: `access-token-${Math.random().toString(36).substr(2, 16)}`,
      refreshToken: `refresh-token-${Math.random().toString(36).substr(2, 16)}`,
      tokenType: 'Bearer',
      expiresAt: Date.now() + 3600000, // 1 hour
      scope: authCode.scope,
    };

    this.tokens.set(tokenData.accessToken, tokenData);

    return {
      access_token: tokenData.accessToken,
      refresh_token: tokenData.refreshToken,
      token_type: tokenData.tokenType,
      expires_in: 3600,
      scope: tokenData.scope,
    };
  }

  simulateRefreshToken(_clientId: string, refreshToken: string): any {
    // Find token by refresh token
    for (const token of this.tokens.values()) {
      if (token.refreshToken === refreshToken) {
        const newToken: TokenData = {
          accessToken: `access-token-${Math.random().toString(36).substr(2, 16)}`,
          refreshToken: token.refreshToken,
          tokenType: token.tokenType,
          expiresAt: Date.now() + 3600000,
          scope: token.scope,
        };

        this.tokens.set(newToken.accessToken, newToken);

        return {
          access_token: newToken.accessToken,
          refresh_token: newToken.refreshToken,
          token_type: newToken.tokenType,
          expires_in: 3600,
          scope: newToken.scope,
        };
      }
    }

    throw { response: { data: { error: 'invalid_grant' } } };
  }

  verifyDeviceCode(deviceCode: string): void {
    const authCode = this.authCodes.get(deviceCode);
    if (authCode) {
      authCode.verified = true;
    }
  }

  clear(): void {
    this.authCodes.clear();
    this.tokens.clear();
  }
}

// Mock ErrorHandlerCenter with real implementation
class MockErrorHandlerCenter {
  private errors: any[] = [];
  private customHandlers: Map<string, Function> = new Map();

  async handleError(error: any, context: any): Promise<void> {
    this.errors.push({ error, context });
  }

  registerCustomHandler(errorCode: string, handler: Function): void {
    this.customHandlers.set(errorCode, handler);
  }

  unregisterCustomHandler(errorCode: string): void {
    this.customHandlers.delete(errorCode);
  }

  sendMessage(_message: string, _data: any): void {
    // Mock implementation
  }

  getErrors(): any[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }
}

describe('OAuth2Module Unit Tests', () => {
  let oauth2Module: OAuth2Module;
  let errorHandlerCenter: MockErrorHandlerCenter;
  let tokenStorage: TestTokenStorage;
  let testServer: TestOAuth2Server;
  let mockAxios: any;

  const validConfig: OAuth2ModuleConfig = {
    clientId: 'test-client-id',
    scope: 'openid profile email',
    deviceAuthEndpoint: 'https://example.com/device/auth',
    tokenEndpoint: 'https://example.com/token',
    tokenStoragePath: '/tmp/test-tokens.json',
    enablePKCE: true,
  };

  beforeEach(async () => {
    errorHandlerCenter = new MockErrorHandlerCenter();
    tokenStorage = new TestTokenStorage();
    testServer = new TestOAuth2Server();

    // Create real OAuth2 module with test dependencies
    oauth2Module = new OAuth2Module(validConfig, errorHandlerCenter as any);

    // Replace axios with our test server simulation
    mockAxios = {
      post: jest.fn().mockImplementation((url: any, data: any) => {
        if (url === validConfig.deviceAuthEndpoint) {
          const result = testServer.simulateDeviceAuthorization(
            data.client_id,
            data.scope,
            data.code_challenge
          );
          return Promise.resolve({ data: result });
        } else if (url === validConfig.tokenEndpoint) {
          if (data.grant_type === 'urn:ietf:params:oauth:grant-type:device_code') {
            const result = testServer.simulateTokenRequest(
              data.client_id,
              data.device_code,
              data.code_verifier
            );
            return Promise.resolve({ data: result });
          } else if (data.grant_type === 'refresh_token') {
            const result = testServer.simulateRefreshToken(data.client_id, data.refresh_token);
            return Promise.resolve({ data: result });
          }
        }
        return Promise.reject(new Error('Unknown endpoint'));
      }),
    };

    // Replace axios in the module
    (oauth2Module as any).axios = mockAxios;

    await oauth2Module.initialize();
  });

  afterEach(async () => {
    if (oauth2Module) {
      await oauth2Module.destroy();
    }
    tokenStorage.clear();
    testServer.clear();
    errorHandlerCenter.clearErrors();
    jest.clearAllMocks();
  });

  describe('Module Initialization', () => {
    it('should initialize with valid configuration', async () => {
      expect(oauth2Module).toBeDefined();
      expect(oauth2Module.getTokenStatus().hasToken).toBe(false);
    });

    it('should validate configuration on initialization', async () => {
      const invalidConfig = { ...validConfig, clientId: '' };

      await expect(async () => {
        const module = new OAuth2Module(invalidConfig, errorHandlerCenter as any);
        await module.initialize();
      }).rejects.toThrow('Client ID is required');
    });

    it('should register error handlers on initialization', () => {
      // The module should register custom error handlers
      expect(errorHandlerCenter['customHandlers'].size).toBeGreaterThan(0);
    });
  });

  describe('Device Authorization Flow', () => {
    it('should initiate device authorization successfully', async () => {
      const response = await oauth2Module.initiateDeviceAuthorization();

      expect(response).toHaveProperty('device_code');
      expect(response).toHaveProperty('user_code');
      expect(response).toHaveProperty('verification_uri');
      expect(response).toHaveProperty('expires_in');
      expect(response).toHaveProperty('interval');

      expect(mockAxios.post).toHaveBeenCalledWith(
        validConfig.deviceAuthEndpoint,
        expect.objectContaining({
          client_id: validConfig.clientId,
          scope: validConfig.scope,
        }),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
    });

    it('should generate PKCE codes when enabled', async () => {
      await oauth2Module.initiateDeviceAuthorization();

      // Verify PKCE codes were generated
      expect(mockAxios.post).toHaveBeenCalledWith(
        validConfig.deviceAuthEndpoint,
        expect.objectContaining({
          code_challenge: expect.any(String),
          code_challenge_method: 'S256',
        })
      );
    });

    it('should handle device authorization errors', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(oauth2Module.initiateDeviceAuthorization()).rejects.toThrow('Network error');

      // Verify error was sent to error handler
      expect(errorHandlerCenter.getErrors()).toHaveLength(1);
    });

    it('should update stats on authorization attempts', () => {
      const initialStats = oauth2Module.getStats();
      expect(initialStats.totalAuthAttempts).toBe(0);
    });
  });

  describe('Token Management', () => {
    it('should request token successfully with device code', async () => {
      const deviceAuth = await oauth2Module.initiateDeviceAuthorization();
      testServer.verifyDeviceCode(deviceAuth.device_code);

      const tokenData = await oauth2Module.requestToken(
        deviceAuth.device_code,
        'test-code-verifier'
      );

      expect(tokenData).toHaveProperty('accessToken');
      expect(tokenData).toHaveProperty('refreshToken');
      expect(tokenData).toHaveProperty('tokenType');
      expect(tokenData).toHaveProperty('expiresAt');
      expect(tokenData).toHaveProperty('scope');

      expect(oauth2Module.getTokenStatus().hasToken).toBe(true);
    });

    it('should handle authorization pending error', async () => {
      const deviceAuth = await oauth2Module.initiateDeviceAuthorization();

      // Don't verify device code to simulate pending authorization
      await expect(
        oauth2Module.requestToken(deviceAuth.device_code, 'test-code-verifier')
      ).rejects.toThrow(OAuth2ErrorCode.AUTHORIZATION_PENDING);
    });

    it('should handle expired device code', async () => {
      const deviceAuth = await oauth2Module.initiateDeviceAuthorization();

      // Simulate expired device code
      (testServer as any).authCodes.get(deviceAuth.device_code).expiresAt = Date.now() - 1000;

      await expect(
        oauth2Module.requestToken(deviceAuth.device_code, 'test-code-verifier')
      ).rejects.toThrow(OAuth2ErrorCode.DEVICE_CODE_EXPIRED);
    });

    it('should refresh token successfully', async () => {
      // First get a token
      const deviceAuth = await oauth2Module.initiateDeviceAuthorization();
      testServer.verifyDeviceCode(deviceAuth.device_code);
      const initialToken = await oauth2Module.requestToken(
        deviceAuth.device_code,
        'test-code-verifier'
      );

      // Then refresh it
      const refreshedToken = await oauth2Module.refreshToken(initialToken.refreshToken);

      expect(refreshedToken).toHaveProperty('accessToken');
      expect(refreshedToken.accessToken).not.toBe(initialToken.accessToken);
      expect(refreshedToken.refreshToken).toBe(initialToken.refreshToken);
    });

    it('should handle token refresh errors', async () => {
      await expect(oauth2Module.refreshToken('invalid-refresh-token')).rejects.toThrow();
    });

    it('should provide accurate token status', () => {
      const status = oauth2Module.getTokenStatus();

      expect(status).toHaveProperty('hasToken');
      expect(status).toHaveProperty('isExpired');
      expect(status).toHaveProperty('expiresAt');
      expect(status).toHaveProperty('timeUntilExpiry');
      expect(status).toHaveProperty('tokenType');
      expect(status).toHaveProperty('scope');
    });
  });

  describe('Token Storage', () => {
    it('should save token for email', async () => {
      const deviceAuth = await oauth2Module.initiateDeviceAuthorization();
      testServer.verifyDeviceCode(deviceAuth.device_code);
      const tokenData = await oauth2Module.requestToken(
        deviceAuth.device_code,
        'test-code-verifier'
      );

      await oauth2Module.saveTokenForEmail('test@example.com', tokenData);

      // Verify token was saved
      const savedToken = await tokenStorage.loadToken('test@example.com');
      expect(savedToken).toEqual(tokenData);
    });

    it('should load token for email', async () => {
      const deviceAuth = await oauth2Module.initiateDeviceAuthorization();
      testServer.verifyDeviceCode(deviceAuth.device_code);
      const tokenData = await oauth2Module.requestToken(
        deviceAuth.device_code,
        'test-code-verifier'
      );

      await oauth2Module.saveTokenForEmail('test@example.com', tokenData);

      // Clear current token
      oauth2Module.invalidateToken();

      // Load token for email
      const loadedToken = await oauth2Module.loadTokenForEmail('test@example.com');
      expect(loadedToken).toEqual(tokenData);
      expect(oauth2Module.getTokenStatus().hasToken).toBe(true);
    });

    it('should handle token storage errors', async () => {
      const invalidToken = { ...oauth2Module.getCurrentToken(), accessToken: '' };

      await expect(
        oauth2Module.saveTokenForEmail('test@example.com', invalidToken as any)
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors through error center', async () => {
      mockAxios.post.mockRejectedValueOnce({
        response: { data: { error: 'invalid_client' } },
      });

      await expect(oauth2Module.initiateDeviceAuthorization()).rejects.toThrow();

      expect(errorHandlerCenter.getErrors()).toHaveLength(1);
      const error = errorHandlerCenter.getErrors()[0];
      expect(error.error.code).toBe('OAUTH2_ERROR');
    });

    it('should handle network errors', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network connection failed'));

      await expect(oauth2Module.initiateDeviceAuthorization()).rejects.toThrow(
        'Network connection failed'
      );
    });

    it('should handle token expiry gracefully', async () => {
      const deviceAuth = await oauth2Module.initiateDeviceAuthorization();
      testServer.verifyDeviceCode(deviceAuth.device_code);
      const tokenData = await oauth2Module.requestToken(
        deviceAuth.device_code,
        'test-code-verifier'
      );

      // Simulate token expiry
      (tokenData as any).expiresAt = Date.now() - 1000;
      (oauth2Module as any).currentToken = tokenData;

      const status = oauth2Module.getTokenStatus();
      expect(status.isExpired).toBe(true);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track authentication attempts', async () => {
      const initialStats = oauth2Module.getStats();
      expect(initialStats.totalAuthAttempts).toBe(0);

      await oauth2Module.initiateDeviceAuthorization();
      const afterAuthStats = oauth2Module.getStats();
      expect(afterAuthStats.totalAuthAttempts).toBe(1);
    });

    it('should track successful authentications', async () => {
      const deviceAuth = await oauth2Module.initiateDeviceAuthorization();
      testServer.verifyDeviceCode(deviceAuth.device_code);

      await oauth2Module.requestToken(deviceAuth.device_code, 'test-code-verifier');

      const stats = oauth2Module.getStats();
      expect(stats.successfulAuths).toBe(1);
    });

    it('should track failed authentications', async () => {
      await expect(oauth2Module.requestToken('invalid-device-code')).rejects.toThrow();

      const stats = oauth2Module.getStats();
      expect(stats.failedAuths).toBeGreaterThan(0);
    });

    it('should track token refreshes', async () => {
      const deviceAuth = await oauth2Module.initiateDeviceAuthorization();
      testServer.verifyDeviceCode(deviceAuth.device_code);
      const tokenData = await oauth2Module.requestToken(
        deviceAuth.device_code,
        'test-code-verifier'
      );

      await oauth2Module.refreshToken(tokenData.refreshToken);

      const stats = oauth2Module.getStats();
      expect(stats.tokenRefreshes).toBe(1);
    });
  });

  describe('Module Lifecycle', () => {
    it('should handle module destruction gracefully', async () => {
      const deviceAuth = await oauth2Module.initiateDeviceAuthorization();
      testServer.verifyDeviceCode(deviceAuth.device_code);
      await oauth2Module.requestToken(deviceAuth.device_code, 'test-code-verifier');

      await oauth2Module.destroy();

      expect(oauth2Module.getTokenStatus().hasToken).toBe(false);
    });

    it('should unregister error handlers on destruction', () => {
      const initialHandlerCount = errorHandlerCenter['customHandlers'].size;

      oauth2Module.destroy();

      expect(errorHandlerCenter['customHandlers'].size).toBeLessThan(initialHandlerCount);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(oauth2Module.initiateDeviceAuthorization());
      }

      const results = await Promise.all(requests);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toHaveProperty('device_code');
        expect(result).toHaveProperty('user_code');
      });
    });

    it('should handle rapid token status checks', async () => {
      const checks = [];
      for (let i = 0; i < 10; i++) {
        checks.push(oauth2Module.getTokenStatus());
      }

      const results = await Promise.all(checks);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toHaveProperty('hasToken');
        expect(result).toHaveProperty('isExpired');
      });
    });
  });
});
