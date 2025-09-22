/**
 * 认证错误处理器 - 统一处理token过期、刷新和重新认证
 * Authentication Error Handler - Unified handling of token expiration, refresh and re-authentication
 */

import { ErrorHandlingCenter as ErrorHandlingCenterImpl } from 'rcc-errorhandling';

export interface AuthErrorHandlerConfig {
  providerName: string;
  maxRefreshAttempts?: number;
  autoReauthEnabled?: boolean;
  reauthTimeout?: number;
}

export interface AuthErrorContext {
  operation: string;
  originalError?: any;
  providerInfo: {
    name: string;
    endpoint: string;
  };
}

export interface AuthRecoveryResult {
  success: boolean;
  action: 'none' | 'refresh' | 'reauth' | 'failed';
  message?: string;
  newToken?: string;
  error?: string;
}

export class AuthenticationErrorHandler {
  private config: Required<AuthErrorHandlerConfig>;
  private errorHandler: ErrorHandlingCenterImpl;
  private refreshAttempts: number = 0;

  constructor(config: AuthErrorHandlerConfig, errorHandler: ErrorHandlingCenterImpl) {
    this.config = {
      providerName: config.providerName,
      maxRefreshAttempts: config.maxRefreshAttempts || 3,
      autoReauthEnabled: config.autoReauthEnabled !== false,
      reauthTimeout: config.reauthTimeout || 300000, // 5 minutes
    };
    this.errorHandler = errorHandler;
  }

  /**
   * 处理认证错误
   * @param context 错误上下文
   * @param tokenRefresher token刷新函数
   * @param reauthenticator 重新认证函数
   */
  async handleAuthError(
    context: AuthErrorContext,
    tokenRefresher: () => Promise<{ accessToken: string; refreshToken?: string; expiry?: number }>,
    reauthenticator: () => Promise<{ success: boolean; tokens?: any; error?: string }>
  ): Promise<AuthRecoveryResult> {
    console.log(`[${this.config.providerName}] Handling authentication error for operation: ${context.operation}`);
    console.log(`[${this.config.providerName}] Original error:`, context.originalError?.message);

    // 检查是否是401认证错误
    if (context.originalError?.response?.status !== 401) {
      return {
        success: false,
        action: 'none',
        message: 'Not an authentication error',
        error: context.originalError?.message
      };
    }

    // 首先尝试刷新token
    if (this.refreshAttempts < this.config.maxRefreshAttempts) {
      this.refreshAttempts++;
      console.log(`[${this.config.providerName}] Attempting token refresh (${this.refreshAttempts}/${this.config.maxRefreshAttempts})...`);

      try {
        const refreshResult = await tokenRefresher();
        console.log(`[${this.config.providerName}] Token refresh successful`);

        // 重置刷新计数
        this.refreshAttempts = 0;

        return {
          success: true,
          action: 'refresh',
          message: 'Token refreshed successfully',
          newToken: refreshResult.accessToken
        };
      } catch (refreshError) {
        console.log(`[${this.config.providerName}] Token refresh failed:`, (refreshError as Error).message);

        // 如果刷新失败且启用了自动重新认证
        if (this.config.autoReauthEnabled) {
          return await this.attemptReauthentication(reauthenticator);
        } else {
          return {
            success: false,
            action: 'failed',
            message: 'Token refresh failed and auto-reauthentication disabled',
            error: (refreshError as Error).message
          };
        }
      }
    } else {
      console.log(`[${this.config.providerName}] Max refresh attempts reached`);

      // 达到最大刷新次数，尝试重新认证
      if (this.config.autoReauthEnabled) {
        return await this.attemptReauthentication(reauthenticator);
      } else {
        return {
          success: false,
          action: 'failed',
          message: 'Max refresh attempts reached and auto-reauthentication disabled',
          error: 'Authentication failed - manual intervention required'
        };
      }
    }
  }

  /**
   * 尝试重新认证
   */
  private async attemptReauthentication(
    reauthenticator: () => Promise<{ success: boolean; tokens?: any; error?: string }>
  ): Promise<AuthRecoveryResult> {
    console.log(`[${this.config.providerName}] Starting re-authentication process...`);

    try {
      const authResult = await Promise.race([
        reauthenticator(),
        new Promise<{ success: boolean; error: string }>((_, reject) =>
          setTimeout(() => reject(new Error('Re-authentication timeout')), this.config.reauthTimeout)
        )
      ]);

      if (authResult.success) {
        console.log(`[${this.config.providerName}] Re-authentication successful`);
        // 重置刷新计数
        this.refreshAttempts = 0;

        return {
          success: true,
          action: 'reauth',
          message: 'Re-authentication successful',
          newToken: (authResult as any).tokens?.accessToken
        };
      } else {
        console.log(`[${this.config.providerName}] Re-authentication failed:`, authResult.error);
        return {
          success: false,
          action: 'failed',
          message: 'Re-authentication failed',
          error: authResult.error
        };
      }
    } catch (authError) {
      console.log(`[${this.config.providerName}] Re-authentication process failed:`, (authError as Error).message);

      this.errorHandler.handleError({
        error: authError as Error,
        source: `${this.config.providerName}.AuthenticationErrorHandler.reauth`,
        severity: 'high',
        timestamp: Date.now()
      });

      return {
        success: false,
        action: 'failed',
        message: 'Re-authentication process failed',
        error: (authError as Error).message
      };
    }
  }

  /**
   * 检查token状态并在过期时刷新
   */
  async ensureValidToken(
    isTokenExpired: () => boolean,
    tokenRefresher: () => Promise<{ accessToken: string; refreshToken?: string; expiry?: number }>,
    reauthenticator: () => Promise<{ success: boolean; tokens?: any; error?: string }>
  ): Promise<{ success: boolean; action?: string; message?: string; error?: string }> {
    if (isTokenExpired()) {
      console.log(`[${this.config.providerName}] Token expired, attempting auto-refresh...`);

      const refreshResult = await this.handleAuthError(
        {
          operation: 'token_validation',
          providerInfo: {
            name: this.config.providerName,
            endpoint: ''
          }
        },
        tokenRefresher,
        reauthenticator
      );

      if (refreshResult.success) {
        console.log(`[${this.config.providerName}] Token auto-refresh/re-auth successful: ${refreshResult.action}`);
        return {
          success: true,
          action: refreshResult.action,
          message: refreshResult.message
        };
      } else {
        console.log(`[${this.config.providerName}] Token auto-refresh/re-auth failed: ${refreshResult.error}`);
        return {
          success: false,
          message: refreshResult.message,
          error: refreshResult.error
        };
      }
    }

    return { success: true, message: 'Token is valid' };
  }

  /**
   * 重置刷新计数器
   */
  resetRefreshAttempts(): void {
    this.refreshAttempts = 0;
    console.log(`[${this.config.providerName}] Refresh attempts reset`);
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    providerName: string;
    refreshAttempts: number;
    maxRefreshAttempts: number;
    autoReauthEnabled: boolean;
  } {
    return {
      providerName: this.config.providerName,
      refreshAttempts: this.refreshAttempts,
      maxRefreshAttempts: this.config.maxRefreshAttempts,
      autoReauthEnabled: this.config.autoReauthEnabled
    };
  }
}