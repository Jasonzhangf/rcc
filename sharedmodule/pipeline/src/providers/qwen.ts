/**
 * Qwen Provider Implementation (TypeScript)
 * 支持OAuth 2.0 Device Flow的Qwen Provider - TypeScript版本
 */

import { BaseProvider, ProviderConfig } from '../framework/BaseProvider';
import { IProviderModule, ProtocolType, PipelineExecutionContext, ModuleConfig, PipelineStage, ProviderInfo } from '../interfaces/ModularInterfaces';
import { ErrorHandlingCenter as ErrorHandlingCenterImpl } from 'rcc-errorhandling';
import { OpenAIChatRequest, OpenAIChatRequestData, OpenAIChatResponse } from '../framework/OpenAIInterface';
import axios from 'axios';
import crypto from 'crypto';
import open from 'open';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface QwenProviderConfig {
  name: string;
  endpoint: string;
  tokenStoragePath?: string;
  supportedModels?: Array<any>;
  defaultModel?: string;
  metadata?: {
    auth?: {
      tokenStoragePath?: string;
    };
  };
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  lastRefresh: number;
  provider: string;
}

interface DeviceFlowData {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
  pkceVerifier: string;
}

interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

class QwenProvider extends BaseProvider implements IProviderModule {
  // 实现 BaseProvider 的抽象方法
  async process(data: any): Promise<any> {
    // 默认实现，可以根据需要扩展
    return data;
  }

  async processResponse(response: any): Promise<any> {
    // 默认实现，可以根据需要扩展
    return response;
  }
  readonly moduleId: string = 'qwen-provider';
  readonly moduleName: string = 'Qwen AI Provider';
  readonly moduleVersion: string = '1.0.0';
  protected isInitialized: boolean = false;
  protected endpoint: string = 'https://portal.qwen.ai/v1';  // 默认使用CLIProxyAPI的endpoint
  protected maxTokens: number = 262144;
  private tokenStoragePath: string;
  protected supportedModels: Array<any>;
  protected defaultModel: string;
  private accessToken: string | null;
  private refreshToken: string | null;
  private tokenExpiry: number | null;
    
  // OAuth配置
  private oauthConfig = {
    clientId: 'f0304373b74a44d2b584a3fb70ca9e56',
    deviceCodeUrl: 'https://chat.qwen.ai/api/v1/oauth2/device/code',
    tokenUrl: 'https://chat.qwen.ai/api/v1/oauth2/token',
    scopes: ['openid', 'profile', 'email', 'model.completion']
  };

  constructor(config: QwenProviderConfig) {
    // 准备完整的配置，包括auth配置
    const { name, ...configWithoutName } = config;
    const fullConfig = {
      id: 'provider-' + name,
      name: name + ' Provider',
      version: '1.0.0',
      type: 'provider',
      ...configWithoutName,
      metadata: {
        auth: {
          tokenStoragePath: config.tokenStoragePath || path.join(os.homedir(), '.webauto', 'auth', 'qwen-token.json'),
          ...config.metadata?.auth
        }
      }
    };

    super(fullConfig);

    this.endpoint = config.endpoint;
    this.supportedModels = config.supportedModels || this.getDefaultModels();
    this.defaultModel = config.defaultModel || 'qwen3-coder-plus';
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    
    // 使用BaseModule配置属性来管理token存储路径
    // 修改为读取~/.qwen/oauth_creds.json文件
    this.tokenStoragePath = path.join(os.homedir(), '.qwen', 'oauth_creds.json');
    
      
    // 初始化时尝试加载保存的token
    this.loadTokens();
  }

  /**
   * 初始化模块 (实现IPipelineModule接口)
   */
  async initialize(config?: ModuleConfig): Promise<void> {
    // 构造函数已经完成初始化，这里只需要标记为已初始化
    this.isInitialized = true;
    this.logInfo('QwenProvider initialized successfully', { moduleId: this.moduleId }, 'initialize');
  }

  /**
   * 销毁模块 (实现IPipelineModule接口)
   */
  async destroy(): Promise<void> {
    this.isInitialized = false;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.logInfo('QwenProvider destroyed successfully', { moduleId: this.moduleId }, 'destroy');
  }

  private getDefaultModels(): Array<any> {
    return [
      {
        id: 'qwen3-coder-plus',
        name: 'Qwen3 Coder Plus',
        description: 'Advanced coding model with enhanced programming capabilities',
        maxTokens: 262144, // 256K 默认值
        contextWindow: 262144,
        supportsStreaming: true,
        supportsTools: true
      }
    ];
  }

  // 从配置获取token存储路径
  private getTokenStoragePathFromConfig(): string {
    const config = this.getConfig();
    return config.metadata?.auth?.tokenStoragePath || path.join(os.homedir(), '.webauto', 'auth', 'qwen-token.json');
  }

  // 获取token存储路径
  private getTokenStoragePath(): string {
    return this.tokenStoragePath;
  }

  // 保存tokens到文件
  private saveTokens(fullTokenData?: any): boolean {
    if (!this.accessToken) return false;

    // 使用CLIProxyAPI格式保存token
    const tokenData = {
      access_token: this.accessToken!,
      refresh_token: this.refreshToken!,
      expired: new Date(this.tokenExpiry!).toISOString(),
      last_refresh: new Date().toISOString(),
      resource_url: fullTokenData?.resource_url || 'portal.qwen.ai',
      email: fullTokenData?.email || 'user@example.com',
      type: 'qwen'
    };

    try {
      const tokenPath = this.getTokenStoragePath();
      const authDir = path.dirname(tokenPath);

      // 确保目录存在
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }

      fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2));
      console.log('[QwenProvider] Tokens saved to: ' + tokenPath);
      return true;
    } catch (error) {
      this.errorHandler.handleError({
        error: error as Error,
        source: 'QwenProvider.saveTokens',
        severity: 'high',
        timestamp: Date.now()
      });
      return false;
    }
  }

  // 从文件加载tokens - 支持多种token格式
  private loadTokens(): boolean {
    try {
      const tokenPath = this.getTokenStoragePath();

      if (!fs.existsSync(tokenPath)) {
        console.log('[QwenProvider] No token file found at:', tokenPath);
        return false;
      }

      const tokenFileContent = fs.readFileSync(tokenPath, 'utf8');
      const tokenData = JSON.parse(tokenFileContent);

      console.log('[QwenProvider] Loading tokens from:', tokenPath);
      console.log('[QwenProvider] Token data keys:', Object.keys(tokenData));

      // 支持多种token格式
      if (tokenData.access_token && tokenData.refresh_token && tokenData.expired) {
        // CLIProxyAPI格式 (OAuth标准)
        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        this.tokenExpiry = new Date(tokenData.expired).getTime();
        console.log('[QwenProvider] Loaded CLIProxyAPI format');
      } else if (tokenData.accessToken && tokenData.refreshToken && tokenData.tokenExpiry) {
        // 旧的TokenData格式
        this.accessToken = tokenData.accessToken;
        this.refreshToken = tokenData.refreshToken;
        this.tokenExpiry = tokenData.tokenExpiry;
        console.log('[QwenProvider] Loaded legacy TokenData format');
      } else if (tokenData.access_token && tokenData.refresh_token && tokenData.expiry_date) {
        // 标准OAuth格式
        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        this.tokenExpiry = tokenData.expiry_date;
        console.log('[QwenProvider] Loaded OAuth standard format');
      } else {
        console.log('[QwenProvider] Unknown token format:', tokenFileContent);
        return false;
      }

      console.log('[QwenProvider] Tokens loaded successfully');
      console.log('[QwenProvider] Access token exists:', !!this.accessToken);
      console.log('[QwenProvider] Access token length:', this.accessToken ? this.accessToken.length : 0);
      console.log('[QwenProvider] Refresh token exists:', !!this.refreshToken);
      console.log('[QwenProvider] Token expiry:', this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : 'null');
      console.log('[QwenProvider] Current time:', new Date().toISOString());
      console.log('[QwenProvider] Token expired:', this.isTokenExpired());
      console.log('[QwenProvider] Time until expiry:', this.tokenExpiry ? (this.tokenExpiry - Date.now()) / 1000 / 60 + ' minutes' : 'unknown');

      return true;
    } catch (error) {
      console.log('[QwenProvider] Error loading tokens:', (error as Error).message);
      this.errorHandler.handleError({
        error: error as Error,
        source: 'QwenProvider.loadTokens',
        severity: 'medium',
        timestamp: Date.now()
      });
      return false;
    }
  }

  // 清除保存的tokens
  private clearSavedTokens(): void {
    try {
      const tokenPath = this.getTokenStoragePath();
      if (fs.existsSync(tokenPath)) {
        fs.unlinkSync(tokenPath);
        console.log('[QwenProvider] Tokens cleared from: ' + tokenPath);
      }
    } catch (error) {
      this.errorHandler.handleError({
        error: error as Error,
        source: 'QwenProvider.clearSavedTokens',
        severity: 'medium',
        timestamp: Date.now()
      });
    }
  }

  // 生成PKCE verifier
  private generatePKCEVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  // 生成PKCE challenge
  private generatePKCEChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  // 检查token是否过期
  private isTokenExpired(): boolean {
    return !this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry;
  }

  // 确保有有效的access token
  private async ensureValidToken(): Promise<void> {
    if (this.isTokenExpired()) {
      console.log('[QwenProvider] Token expired, attempting auto-refresh...');
      if (this.refreshToken) {
        try {
          await this.refreshAccessToken();
          console.log('[QwenProvider] Token auto-refresh successful');
        } catch (refreshError) {
          console.log('[QwenProvider] Token auto-refresh failed:', (refreshError as Error).message);
          throw new Error('Token refresh failed. Please re-authenticate.');
        }
      } else {
        console.log('[QwenProvider] No refresh token available');
        throw new Error('No valid token available. Please authenticate first.');
      }
    }
  }

  // 增强的token验证方法
  private async ensureValidTokenWithRetry(forceRefresh: boolean = false): Promise<void> {
    // 只有在强制刷新或token过期时才处理
    if (forceRefresh || this.isTokenExpired()) {
      if (this.refreshToken) {
        try {
          await this.refreshAccessToken();
          console.log('[QwenProvider] Token auto-refreshed successfully');
        } catch (refreshError) {
          console.log('[QwenProvider] Auto-refresh failed, manual re-authentication required');
          throw new Error('Token refresh failed: ' + (refreshError as Error).message);
        }
      } else {
        throw new Error('No valid token available. Please authenticate first.');
      }
    }
    // 如果token没有过期且不强制刷新，直接使用现有token
  }

  // OAuth Device Flow 初始化
  async initiateDeviceFlow(autoOpen: boolean = true): Promise<DeviceFlowData> {
    try {
      const pkceVerifier = this.generatePKCEVerifier();
      const pkceChallenge = this.generatePKCEChallenge(pkceVerifier);

      // 使用form-data格式，参考CLIProxyAPI实现
      const formData = new URLSearchParams();
      formData.append('client_id', this.oauthConfig.clientId);
      formData.append('scope', this.oauthConfig.scopes.join(' '));
      formData.append('code_challenge', pkceChallenge);
      formData.append('code_challenge_method', 'S256');

      const response = await axios.post(this.oauthConfig.deviceCodeUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      const responseData = response.data as any;

      const deviceFlow: DeviceFlowData = {
        deviceCode: responseData.device_code,
        userCode: responseData.user_code,
        verificationUri: responseData.verification_uri,
        verificationUriComplete: responseData.verification_uri_complete,
        expiresIn: responseData.expires_in,
        interval: responseData.interval,
        pkceVerifier
      };

      // 自动打开浏览器进行授权
      if (autoOpen && deviceFlow.verificationUriComplete) {
        console.log('[QwenProvider] Opening browser for OAuth authorization...');
        
        try {
          await open(deviceFlow.verificationUriComplete, { 
            wait: false
          });
          console.log('[QwenProvider] Browser opened successfully!');
        } catch (browserError) {
          this.errorHandler.handleError({
            error: browserError as Error,
            source: 'QwenProvider.initiateDeviceFlow',
            severity: 'medium',
            timestamp: Date.now()
          });
        }
      }

      return deviceFlow;
    } catch (error) {
      this.errorHandler.handleError({
        error: error as Error,
        source: 'QwenProvider.initiateDeviceFlow',
        severity: 'high',
        timestamp: Date.now()
      });
      throw new Error('Failed to initiate device flow: ' + (error as Error).message);
    }
  }

  // 等待设备授权
  async waitForDeviceAuthorization(deviceCode: string, pkceVerifier: string, interval: number = 5, maxAttempts: number = 60): Promise<OAuthTokens> {
    const startTime = Date.now();
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        // 使用form-data格式，参考CLIProxyAPI实现
        const formData = new URLSearchParams();
        formData.append('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
        formData.append('client_id', this.oauthConfig.clientId);
        formData.append('device_code', deviceCode);
        formData.append('code_verifier', pkceVerifier);

        const response = await axios.post(this.oauthConfig.tokenUrl, formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        });

        const tokenData = response.data as any;

        // 成功获取token
        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

        // 保存tokens到文件
        this.saveTokens();

        return {
          accessToken: this.accessToken!,
          refreshToken: this.refreshToken!,
          expiresIn: tokenData.expires_in,
          tokenType: tokenData.token_type,
          scope: tokenData.scope
        };
      } catch (error) {
        if ((error as any).response?.data?.error === 'authorization_pending') {
          // 授权尚未完成，继续等待
          await new Promise(resolve => setTimeout(resolve, interval * 1000));
          attempts++;
          continue;
        } else if ((error as any).response?.data?.error === 'slow_down') {
          // 请求太频繁，增加间隔时间
          interval += 2;
          await new Promise(resolve => setTimeout(resolve, interval * 1000));
          attempts++;
          continue;
        } else {
          this.errorHandler.handleError({
            error: error as Error,
            source: 'QwenProvider.waitForDeviceAuthorization',
            severity: 'high',
            timestamp: Date.now()
          });
          throw new Error('Device authorization failed: ' + ((error as any).response?.data?.error_description || (error as Error).message));
        }
      }
    }

    throw new Error('Device authorization timeout');
  }

  // 刷新access token
  private async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      // 使用form-data格式，参考CLIProxyAPI实现
      const formData = new URLSearchParams();
      formData.append('grant_type', 'refresh_token');
      formData.append('client_id', this.oauthConfig.clientId);
      formData.append('refresh_token', this.refreshToken);

      const response = await axios.post(this.oauthConfig.tokenUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const refreshData = response.data as any;

      this.accessToken = refreshData.access_token;
      this.refreshToken = refreshData.refresh_token;
      this.tokenExpiry = Date.now() + (refreshData.expires_in * 1000);

      // 保存完整的token信息，包括resource_url
      this.saveTokens(refreshData);

      return {
        accessToken: this.accessToken!,
        refreshToken: this.refreshToken!,
        expiresIn: refreshData.expires_in,
        tokenType: 'Bearer',
        scope: this.oauthConfig.scopes.join(' ')
      };
    } catch (error) {
      this.errorHandler.handleError({
        error: error as Error,
        source: 'QwenProvider.refreshAccessToken',
        severity: 'high',
        timestamp: Date.now()
      });
      throw new Error('Failed to refresh token: ' + (error as Error).message);
    }
  }

  // 主要的chat实现 - 增强版自动刷新和失败自动认证
  async executeChat(providerRequest: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    console.log('[QwenProvider] Starting executeChat request');
    console.log('[QwenProvider] Initial token state:', {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      tokenExpiry: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : 'null',
      isExpired: this.isTokenExpired()
    });

    try {
      // 确保有有效token（只有在认证失败时才强制刷新）
      await this.ensureValidToken();

      // 检查token是否真的有效
      if (!this.accessToken || this.isTokenExpired()) {
        console.log('[QwenProvider] No valid access token available after ensureValidToken');
        throw new Error('No valid access token available');
      }

      console.log('[QwenProvider] Token is valid, proceeding with API call');

      // 转换OpenAI格式到Qwen格式
      const qwenRequest = this.convertToQwenFormat(providerRequest);

      // 调试日志：检查转换后的请求内容
      console.log(`Qwen request keys: ${Object.keys(qwenRequest).join(', ')}`);
      if (qwenRequest.tools) {
        console.log(`Tools included: ${qwenRequest.tools.length} tools`);
      }

      console.log('[QwenProvider] Making API call to:', this.endpoint + '/chat/completions');
      console.log('[QwenProvider] Using token (first 10 chars):', this.accessToken ? this.accessToken.substring(0, 10) + '...' : 'null');

      const authHeader = 'Bearer ' + this.accessToken;
      console.log('[QwenProvider] Authorization header (first 20 chars):', authHeader.substring(0, 20) + '...');

      const response = await axios.post(this.endpoint + '/chat/completions', qwenRequest, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      console.log('[QwenProvider] API call successful');

      // 转换Qwen响应到标准格式
      return this.convertQwenResponse(response.data);

    } catch (error: any) {
      console.log(`[QwenProvider] Error:`, error.message);
      console.log(`[QwenProvider] Error response status:`, error.response?.status);
      console.log(`[QwenProvider] Error response data:`, error.response?.data);

      // 检查是否是认证错误 (401)
      if (error.response?.status === 401) {
        console.log('[QwenProvider] Authentication error detected, attempting recovery...');

        try {
          // 尝试自动刷新token
          if (this.refreshToken) {
            console.log('[QwenProvider] Attempting token refresh...');
            await this.refreshAccessToken();
            console.log('[QwenProvider] Token refreshed successfully');
          } else {
            // 没有refresh token，启动重新认证流程
            console.log('[QwenProvider] No refresh token, starting re-authentication...');
            const authResult = await this.authenticate(true, {
              interval: 5,
              maxAttempts: 60
            });

            if (!authResult.success) {
              throw new Error(`Re-authentication failed: ${authResult.error}`);
            }
            console.log('[QwenProvider] Re-authentication successful');
          }

          // 重新尝试API调用
          console.log('[QwenProvider] Retrying API call with refreshed token...');
          const qwenRequest = this.convertToQwenFormat(providerRequest);
          const retryResponse = await axios.post(this.endpoint + '/chat/completions', qwenRequest, {
            headers: {
              'Authorization': 'Bearer ' + this.accessToken,
              'Content-Type': 'application/json'
            }
          });

          console.log('[QwenProvider] Retry successful after token refresh');
          return this.convertQwenResponse(retryResponse.data);

        } catch (recoveryError: any) {
          console.log('[QwenProvider] Recovery failed:', recoveryError.message);

          // 如果恢复失败，记录错误并抛出
          this.errorHandler.handleError({
            error: recoveryError as Error,
            source: 'QwenProvider.executeChat.recovery',
            severity: 'high',
            timestamp: Date.now()
          });

          throw new Error(`Authentication recovery failed: ${recoveryError.message}. Please manually re-authenticate.`);
        }
      }

      // 非认证错误，正常处理
      this.errorHandler.handleError({
        error: error as Error,
        source: 'QwenProvider.executeChat',
        severity: 'high',
        timestamp: Date.now()
      });
      throw new Error('Qwen API error: ' + error.message);
    }
  }

  // 流式chat实现 - 增强版自动刷新和失败自动认证
  async *executeStreamChat(providerRequest: OpenAIChatRequest): AsyncGenerator<OpenAIChatResponse> {
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        // 确保有有效token（只有在认证失败时才强制刷新）
        await this.ensureValidToken();

        // 检查token是否真的有效
        if (!this.accessToken || this.isTokenExpired()) {
          throw new Error('No valid access token available');
        }

        const requestData: OpenAIChatRequestData = {
          model: providerRequest.model,
          messages: providerRequest.messages,
          stream: true,
          temperature: providerRequest.temperature,
          max_tokens: providerRequest.max_tokens,
          top_p: providerRequest.top_p,
          n: providerRequest.n,
          stop: providerRequest.stop,
          presence_penalty: providerRequest.presence_penalty,
          frequency_penalty: providerRequest.frequency_penalty,
          logit_bias: providerRequest.logit_bias,
          user: providerRequest.user,
          tools: providerRequest.tools,
          tool_choice: providerRequest.tool_choice
        };

        const openAIRequest = new OpenAIChatRequest(requestData);
        const qwenRequest = this.convertToQwenFormat(openAIRequest);

        const response = await axios.post(this.endpoint + '/chat/completions', qwenRequest, {
          headers: {
            'Authorization': 'Bearer ' + this.accessToken,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        });

        const stream = response.data as any;
        let buffer = '';

        for await (const chunk of stream) {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留未完成的行

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                return;
              }

              try {
                const parsed = JSON.parse(data);
                yield this.convertQwenResponse(parsed);
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
        return; // 成功完成，退出重试循环

      } catch (error: any) {
        retryCount++;

        // 只有在真正的401错误时才尝试刷新token
        if (error.response?.status === 401 && retryCount <= maxRetries) {
          console.log(`[QwenProvider] Streaming authentication failed (attempt ${retryCount}/${maxRetries + 1})`);

          if (retryCount === 1) {
            // 第一次尝试：刷新token
            try {
              console.log('[QwenProvider] Stream attempting token refresh...');
              await this.refreshAccessToken();
              console.log('[QwenProvider] Stream token refreshed successfully');
              continue;
            } catch (refreshError) {
              console.log('[QwenProvider] Stream token refresh failed:', (refreshError as Error).message);
              // 如果刷新失败，直接抛出错误，不要重新认证
              throw new Error('Stream token refresh failed: ' + (refreshError as Error).message);
            }
          }
        }

        // 其他错误或重试用完
        this.errorHandler.handleError({
          error: error as Error,
          source: 'QwenProvider.executeStreamChat',
          severity: 'high',
          timestamp: Date.now()
        });
        throw new Error('Qwen streaming error: ' + error.message);
      }
    }

    throw new Error('Maximum stream retry attempts exceeded');
  }

  // 转换OpenAI请求到Qwen格式
  private convertToQwenFormat(openaiRequest: OpenAIChatRequest): any {
    // 安全检查：确保messages存在且是数组
    if (!openaiRequest.messages || !Array.isArray(openaiRequest.messages)) {
      throw new Error('Invalid request: messages is required and must be an array');
    }

    const qwenRequest: any = {
      model: this.defaultModel, // 始终使用配置的模型，忽略请求中的虚拟模型名称
      messages: openaiRequest.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream: openaiRequest.stream || false
    };

    // 添加可选参数
    if (openaiRequest.temperature !== undefined) {
      qwenRequest.temperature = openaiRequest.temperature;
    }
    if (openaiRequest.top_p !== undefined) {
      qwenRequest.top_p = openaiRequest.top_p;
    }
    if (openaiRequest.max_tokens !== undefined) {
      qwenRequest.max_tokens = openaiRequest.max_tokens;
    }

    // 工具调用支持 - 转换OpenAI格式到Qwen格式
    if (openaiRequest.tools && this.supportsTools(openaiRequest.model)) {
      qwenRequest.tools = this.convertToQwenTools(openaiRequest.tools);
    }

    return qwenRequest;
  }

  // 转换Qwen响应到标准格式
  private convertQwenResponse(qwenResponse: any): OpenAIChatResponse {
    return new OpenAIChatResponse({
      id: qwenResponse.id || 'qwen_' + Date.now(),
      object: qwenResponse.object || 'chat.completion',
      created: qwenResponse.created || Date.now(),
      model: qwenResponse.model || this.defaultModel,
      choices: qwenResponse.choices?.map((choice: any) => ({
        index: choice.index || 0,
        message: {
          role: choice.message?.role || 'assistant',
          content: choice.message?.content || '',
          tool_calls: choice.message?.tool_calls
        },
        finish_reason: choice.finish_reason || 'stop'
      })) || [],
      usage: qwenResponse.usage ? {
        prompt_tokens: qwenResponse.usage.prompt_tokens,
        completion_tokens: qwenResponse.usage.completion_tokens,
        total_tokens: qwenResponse.usage.total_tokens
      } : undefined
    });
  }

  // 转换OpenAI工具格式到Qwen格式
  private convertToQwenTools(openAITools: any[]): any[] {
    return openAITools.map(tool => {
      if (tool.type === 'function' && tool.function) {
        return {
          type: 'function',
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters || {},
            // Qwen特定的字段
            input_schema: tool.function.parameters || {}
          }
        };
      }
      return tool; // 保持其他格式不变
    });
  }

  // 检查模型是否支持工具调用
  private supportsTools(model: string): boolean {
    // 首先检查本地配置的模型
    const modelInfo = this.supportedModels.find(m => m.id === model);
    if (modelInfo && modelInfo.supportsTools !== undefined) {
      return modelInfo.supportsTools;
    }
    
    // 如果本地没有配置，假设Qwen模型都支持工具调用
    // Qwen API文档显示支持工具调用
    return model.startsWith('qwen-');
  }

  // 获取Provider信息
  getInfo(): any {
    const baseInfo = super.getInfo();
    return {
      ...baseInfo,
      name: baseInfo.name.replace(' Provider', ''),
      endpoint: this.endpoint,
      supportedModels: this.supportedModels,
      defaultModel: this.defaultModel,
      capabilities: this.getCapabilities(),
      authentication: {
        type: 'oauth2',
        flow: 'device_code',
        status: this.accessToken ? 'authenticated' : 'not_authenticated'
      }
    };
  }

  // 获取能力
  getCapabilities(): any {
    return {
      streaming: true,
      tools: true,
      vision: false,
      jsonMode: true,
      oauth: true
    };
  }

  // 验证请求
  // 根据架构设计，提供商应忽略请求中的模型参数，使用初始化时配置的模型
  validate(request: any): boolean {
    // 不再验证request.model，因为提供商使用初始化时配置的模型
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Messages are required');
    }
    return true;
  }

  // 转换为标准格式
  toStandardFormat(): any {
    return {
      id: this.info.id,
      name: this.info.name,
      endpoint: this.endpoint,
      supportedModels: this.supportedModels,
      defaultModel: this.defaultModel,
      capabilities: this.getCapabilities()
    };
  }

  // 健康检查 - 增强版自动刷新和重新认证
  async healthCheck(): Promise<any> {
    try {
      // 检查token状态
      if (this.isTokenExpired()) {
        console.log('[QwenProvider] Token expired, attempting auto-refresh...');

        // 尝试自动刷新token
        if (this.refreshToken) {
          try {
            await this.refreshAccessToken();
            console.log('[QwenProvider] Token auto-refresh successful');
            // 刷新成功后继续健康检查
          } catch (refreshError) {
            console.log('[QwenProvider] Token auto-refresh failed:', (refreshError as Error).message);

            // 刷新失败，启动重新认证流程
            console.log('[QwenProvider] Starting re-authentication process...');
            try {
              const authResult = await this.authenticate(true, {
                interval: 5,
                maxAttempts: 60
              });

              if (authResult.success) {
                console.log('[QwenProvider] Re-authentication successful');
                // 重新认证成功后继续健康检查
              } else {
                console.log('[QwenProvider] Re-authentication failed:', authResult.error);
                return {
                  status: 'unhealthy',
                  provider: this.getInfo().name,
                  message: 'Re-authentication failed: ' + authResult.error,
                  error: authResult.error,
                  needsReauth: true,
                  timestamp: Date.now()
                };
              }
            } catch (authError) {
              console.log('[QwenProvider] Re-authentication process failed:', (authError as Error).message);
              return {
                status: 'unhealthy',
                provider: this.getInfo().name,
                message: 'Authentication process failed: ' + (authError as Error).message,
                error: (authError as Error).message,
                needsReauth: true,
                timestamp: Date.now()
              };
            }
          }
        } else {
          console.log('[QwenProvider] No refresh token available, starting authentication...');

          // 没有refresh token，直接启动认证流程
          try {
            const authResult = await this.authenticate(true, {
              interval: 5,
              maxAttempts: 60
            });

            if (authResult.success) {
              console.log('[QwenProvider] Authentication successful');
              // 认证成功后继续健康检查
            } else {
              return {
                status: 'unhealthy',
                provider: this.getInfo().name,
                message: 'Authentication failed: ' + authResult.error,
                error: authResult.error,
                needsReauth: true,
                timestamp: Date.now()
              };
            }
          } catch (authError) {
            return {
              status: 'unhealthy',
              provider: this.getInfo().name,
              message: 'Authentication process failed: ' + (authError as Error).message,
              error: (authError as Error).message,
              needsReauth: true,
              timestamp: Date.now()
            };
          }
        }
      }

      // 测试API连接
      await this.ensureValidToken();
      const testResponse = await axios.get(this.endpoint + '/models', {
        headers: {
          'Authorization': 'Bearer ' + this.accessToken
        }
      });

      const testData = testResponse.data as any;

      return {
        status: 'healthy',
        provider: this.getInfo().name,
        timestamp: Date.now(),
        models: testData?.data?.length || 0,
        tokenStatus: 'valid',
        autoRefreshEnabled: true
      };
    } catch (error) {
      console.log('[QwenProvider] Health check failed:', (error as Error).message);

      // 检查是否是认证错误
      if ((error as any).response?.status === 401) {
        console.log('[QwenProvider] Authentication error during health check, attempting recovery...');

        try {
          // 尝试刷新token
          if (this.refreshToken) {
            await this.refreshAccessToken();
            console.log('[QwenProvider] Token refreshed during health check recovery');
          } else {
            // 没有refresh token，启动认证流程
            const authResult = await this.authenticate(true, {
              interval: 5,
              maxAttempts: 60
            });

            if (!authResult.success) {
              throw new Error(authResult.error);
            }
          }

          // 重新测试API连接
          const retryResponse = await axios.get(this.endpoint + '/models', {
            headers: {
              'Authorization': 'Bearer ' + this.accessToken
            }
          });

          const retryData = retryResponse.data as any;

          return {
            status: 'healthy',
            provider: this.getInfo().name,
            timestamp: Date.now(),
            models: retryData?.data?.length || 0,
            tokenStatus: 'refreshed',
            recovery: 'successful'
          };

        } catch (recoveryError) {
          console.log('[QwenProvider] Recovery failed:', (recoveryError as Error).message);
          return {
            status: 'unhealthy',
            provider: this.getInfo().name,
            message: 'Authentication recovery failed: ' + (recoveryError as Error).message,
            error: (recoveryError as Error).message,
            needsReauth: true,
            recovery: 'failed',
            timestamp: Date.now()
          };
        }
      }

      this.errorHandler.handleError({
        error: error as Error,
        source: 'QwenProvider.healthCheck',
        severity: 'medium',
        timestamp: Date.now()
      });

      return {
        status: 'unhealthy',
        provider: this.getInfo().name,
        error: (error as Error).message,
        timestamp: Date.now()
      };
    }
  }

  // 获取模型列表
  async getModels(): Promise<any[]> {
    try {
      await this.ensureValidToken();
      const response = await axios.get(this.endpoint + '/models', {
        headers: {
          'Authorization': 'Bearer ' + this.accessToken
        }
      });

      const modelData = response.data as any;
      return modelData.data || [];
    } catch (error) {
      // 如果API失败，返回本地配置的模型
      return this.supportedModels;
    }
  }

  // 完整的OAuth认证流程（包括自动打开浏览器和等待授权）
  async authenticate(autoOpen: boolean = true, options: any = {}): Promise<any> {
    console.log('[QwenProvider] Starting OAuth authentication flow...');
    
    try {
      // 初始化设备流程
      const deviceFlow = await this.initiateDeviceFlow(autoOpen);
      
      // 等待用户授权
      const tokens = await this.waitForDeviceAuthorization(
        deviceFlow.deviceCode,
        deviceFlow.pkceVerifier,
        options.interval || deviceFlow.interval,
        options.maxAttempts || Math.floor(deviceFlow.expiresIn / (options.interval || deviceFlow.interval))
      );
      
      console.log('[QwenProvider] Authentication completed successfully');
      
      return {
        success: true,
        tokens,
        provider: this.getInfo().name,
        timestamp: Date.now()
      };
      
    } catch (error) {
      this.errorHandler.handleError({
        error: error as Error,
        source: 'QwenProvider.authenticate',
        severity: 'high',
        timestamp: Date.now()
      });
      return {
        success: false,
        error: (error as Error).message,
        provider: this.getInfo().name,
        timestamp: Date.now()
      };
    }
  }

  // ===== IProviderModule Interface Implementation =====

  /**
   * 执行请求 (实现IProviderModule接口)
   */
  async executeRequest(request: any, context: PipelineExecutionContext): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('QwenProvider not initialized');
    }

    try {
      // 调试日志：检查传入的request结构
      console.log('[QwenProvider] executeRequest received request:', {
        hasMessages: !!request.messages,
        messagesType: typeof request.messages,
        messagesLength: request.messages?.length,
        requestKeys: Object.keys(request),
        messages: request.messages
      });

      // 转换为OpenAI格式并执行
      const openaiRequest = new OpenAIChatRequest(request);
      return await this.executeChat(openaiRequest);
    } catch (error) {
      this.error('Request execution failed', error, 'executeRequest');
      throw error;
    }
  }

  /**
   * 执行流式请求 (实现IProviderModule接口)
   */
  async *executeStreamingRequest(request: any, context: PipelineExecutionContext): AsyncGenerator<any> {
    if (!this.isInitialized) {
      throw new Error('QwenProvider not initialized');
    }

    try {
      // 转换为OpenAI格式并执行
      const openaiRequest = new OpenAIChatRequest(request);
      yield* this.executeStreamChat(openaiRequest);
    } catch (error) {
      this.error('Streaming request execution failed', error, 'executeStreamingRequest');
      throw error;
    }
  }

  /**
   * 获取模块化提供商信息 (实现IProviderModule接口)
   */
  getModularProviderInfo(): ProviderInfo {
    return {
      id: 'qwen',
      name: 'Qwen AI Provider',
      type: ProtocolType.OPENAI,
      endpoint: this.endpoint,
      models: this.supportedModels,
      capabilities: {
        streaming: true,
        functions: true,
        vision: false,
        maxTokens: this.maxTokens || 262144
      },
      authentication: {
        type: this.hasValidAuthentication() ? 'oauth' : 'none',
        required: true
      }
    };
  }

  // Keep BaseProvider's original getProviderInfo accessible if needed
  getBaseProviderInfo() {
    const info = this.getInfo();
    return {
      name: info.name.replace(' Provider', ''),
      endpoint: this.endpoint,
      supportedModels: this.supportedModels,
      defaultModel: this.defaultModel,
      capabilities: this.getCapabilities(),
      type: 'provider'
    };
  }

  /**
   * 检查健康状态 (实现IProviderModule接口)
   */
  async checkHealth(): Promise<{
    isHealthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const healthResult = await this.healthCheck();
      const responseTime = Date.now() - startTime;

      return {
        isHealthy: healthResult.success,
        responseTime,
        error: healthResult.success ? undefined : healthResult.error
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        isHealthy: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取模块状态 (实现IPipelineModule接口)
   */
  async getStatus(): Promise<{
    isInitialized: boolean;
    isRunning: boolean;
    lastError?: Error;
    statistics: {
      requestsProcessed: number;
      averageResponseTime: number;
      errorRate: number;
    };
  }> {
    const healthResult = await this.checkHealth();

    return {
      isInitialized: this.isInitialized,
      isRunning: healthResult.isHealthy,
      lastError: healthResult.isHealthy ? undefined : new Error(healthResult.error || 'Unknown error'),
      statistics: {
        requestsProcessed: 0, // TODO: Implement request tracking
        averageResponseTime: healthResult.responseTime,
        errorRate: healthResult.isHealthy ? 0 : 100
      }
    };
  }

  /**
   * 检查是否有有效认证
   */
  private hasValidAuthentication(): boolean {
    return !!this.accessToken && !this.isTokenExpired();
  }
}

export default QwenProvider;