/**
 * IFlow Provider 认证错误处理器
 * IFlow Provider Authentication Error Handler
 */

import { AuthenticationErrorHandler, AuthErrorHandlerConfig, AuthErrorContext, AuthRecoveryResult } from './AuthenticationErrorHandler';

export interface IFlowAuthConfig extends AuthErrorHandlerConfig {
  clientId: string;
  tokenUrl: string;
  deviceCodeUrl?: string;
}

export class IFlowAuthHandler extends AuthenticationErrorHandler {
  private iflowConfig: Required<IFlowAuthConfig>;

  constructor(config: IFlowAuthConfig, errorHandler: any) {
    const baseConfig: AuthErrorHandlerConfig = {
      providerName: config.providerName,
      maxRefreshAttempts: config.maxRefreshAttempts || 3,
      autoReauthEnabled: config.autoReauthEnabled !== false,
      reauthTimeout: config.reauthTimeout || 300000,
    };

    super(baseConfig, errorHandler);

    this.iflowConfig = {
      ...baseConfig,
      clientId: config.clientId,
      tokenUrl: config.tokenUrl,
      deviceCodeUrl: config.deviceCodeUrl || 'https://chat.iflow.cn/api/v1/oauth2/device/code',
    } as Required<IFlowAuthConfig>;
  }

  /**
   * 处理IFlow特定的认证错误
   */
  async handleIFlowAuthError(
    context: AuthErrorContext,
    tokenRefresher: () => Promise<{ accessToken: string; refreshToken?: string; expiry?: number }>,
    reauthenticator: () => Promise<{ success: boolean; tokens?: any; error?: string }>
  ): Promise<AuthRecoveryResult> {
    console.log(`[IFlowAuthHandler] Handling IFlow authentication error`);

    // IFlow特定的错误处理逻辑
    const enhancedContext: AuthErrorContext = {
      ...context,
      providerInfo: {
        ...context.providerInfo,
        name: 'IFlow AI Provider'
      }
    };

    return await this.handleAuthError(enhancedContext, tokenRefresher, reauthenticator);
  }

  /**
   * IFlow特定的健康检查增强
   */
  async enhancedHealthCheck(
    isTokenExpired: () => boolean,
    tokenRefresher: () => Promise<{ accessToken: string; refreshToken?: string; expiry?: number }>,
    reauthenticator: () => Promise<{ success: boolean; tokens?: any; error?: string }>,
    apiTestFunction: () => Promise<any>
  ): Promise<{
    status: 'healthy' | 'warning' | 'unhealthy';
    provider: string;
    message?: string;
    error?: string;
    needsReauth?: boolean;
    tokenStatus?: string;
    recovery?: string;
  }> {
    try {
      // 检查token状态
      if (isTokenExpired()) {
        console.log('[IFlowAuthHandler] Token expired, attempting auto-refresh...');

        const tokenResult = await this.ensureValidToken(isTokenExpired, tokenRefresher, reauthenticator);

        if (tokenResult.success) {
          console.log('[IFlowAuthHandler] Token recovery successful');
        } else {
          return {
            status: 'unhealthy',
            provider: 'IFlow',
            message: 'Token recovery failed',
            error: tokenResult.error,
            needsReauth: true,
            tokenStatus: 'expired'
          };
        }
      }

      // 测试API连接
      const testResult = await apiTestFunction();

      return {
        status: 'healthy',
        provider: 'IFlow',
        tokenStatus: 'valid',
        message: 'API connection successful',
        ...testResult
      };
    } catch (error: any) {
      console.log('[IFlowAuthHandler] Health check failed:', error.message);

      // 检查是否是认证错误
      if (error.response?.status === 401) {
        console.log('[IFlowAuthHandler] Authentication error during health check, attempting recovery...');

        try {
          const recoveryResult = await this.handleAuthError(
            {
              operation: 'health_check_recovery',
              originalError: error,
              providerInfo: {
                name: 'IFlow AI Provider',
                endpoint: this.iflowConfig.providerName
              }
            },
            tokenRefresher,
            reauthenticator
          );

          if (recoveryResult.success) {
            // 重新测试API连接
            const retryResult = await apiTestFunction();
            return {
              status: 'healthy',
              provider: 'IFlow',
              tokenStatus: recoveryResult.action === 'refresh' ? 'refreshed' : 'reauthenticated',
              recovery: 'successful',
              ...retryResult
            };
          } else {
            return {
              status: 'unhealthy',
              provider: 'IFlow',
              message: 'Authentication recovery failed',
              error: recoveryResult.error,
              needsReauth: true,
              recovery: 'failed'
            };
          }
        } catch (recoveryError) {
          return {
            status: 'unhealthy',
            provider: 'IFlow',
            message: 'Recovery process failed',
            error: (recoveryError as Error).message,
            needsReauth: true,
            recovery: 'failed'
          };
        }
      }

      return {
        status: 'unhealthy',
        provider: 'IFlow',
        error: error.message
      };
    }
  }

  /**
   * 获取IFlow配置信息
   */
  getIFlowConfig(): Required<IFlowAuthConfig> {
    return { ...this.iflowConfig };
  }
}