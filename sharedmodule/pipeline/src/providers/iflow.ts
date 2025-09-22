/**
 * iFlow Provider Implementation (TypeScript)
 * 使用iflow现有OAuth凭据文件的iFlow Provider - TypeScript版本
 */

import { BaseProvider, ProviderConfig } from '../framework/BaseProvider';
import { IProviderModule, ProtocolType, PipelineExecutionContext, ModuleConfig, PipelineStage, ProviderInfo } from '../interfaces/ModularInterfaces';
import { ErrorHandlingCenter } from 'rcc-errorhandling';
import { OpenAIChatRequest, OpenAIChatResponse } from '../framework/OpenAIInterface';
import { IFlowAuthHandler, IFlowAuthConfig } from '../auth/IFlowAuthHandler';
import axios from 'axios';
import * as crypto from 'crypto';
import open from 'open';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<any>;
    };
    finish_reason: string | null;
  }>;
}

interface IFlowOAuthCredentials {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  scope: string;
  apiKey?: string;
}

interface IFlowConfig {
  name?: string;
  endpoint: string;
  model: string;
  supportedModels?: string[];
  credentialsPath?: string;
  authMode?: 'oauth' | 'apikey';
  apiKey?: string;
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

class IFlowProvider extends BaseProvider implements IProviderModule {
  readonly moduleId: string = 'iflow-provider';
  readonly moduleName: string = 'iFlow AI Provider';
  readonly moduleVersion: string = '1.0.0';
  protected isInitialized: boolean = false;
  protected maxTokens: number = 262144;
  private credentialsPath: string;
  private accessToken: string = '';
  private refreshToken: string = '';
  private tokenExpiry: number = 0;
  private authMode: 'oauth' | 'apikey';
  private apiKey: string = '';
  private authHandler: IFlowAuthHandler;
  
  // OAuth configuration for iFlow
  private oauthConfig = {
    clientId: '10009311001',
    clientSecret: '4Z3YjXycVsQvyGF1etiNlIBB4RsqSDtW',
    authUrl: 'https://iflow.cn/oauth',
    tokenUrl: 'https://iflow.cn/oauth/token',
    deviceCodeUrl: 'https://iflow.cn/oauth/device/code',
    scopes: ['openid', 'profile', 'api']
  };
  
  constructor(config?: Partial<IFlowConfig>) {
    const defaultConfig: IFlowConfig = {
      name: 'iflow',
      endpoint: 'https://apis.iflow.cn/v1',
      model: 'qwen3-coder-plus',
      supportedModels: ['qwen3-coder-plus', 'qwen-turbo', 'qwen-max'],
      authMode: 'oauth', // 默认使用OAuth认证
      credentialsPath: path.join(os.homedir(), '.iflow', 'oauth_creds.json') // 默认使用~/.iflow/oauth_creds.json
    };

    const finalConfig = { ...defaultConfig, ...config };

    super({
      name: finalConfig.name || 'iflow',
      endpoint: finalConfig.endpoint,
      supportedModels: finalConfig.supportedModels,
      defaultModel: finalConfig.model
    });

    this.authMode = finalConfig.authMode || 'oauth';
    this.credentialsPath = finalConfig.credentialsPath || path.join(os.homedir(), '.iflow', 'oauth_creds.json');
    this.apiKey = finalConfig.apiKey || '';

    // 初始化认证错误处理器 - 使用简单对象作为临时解决方案
    const errorHandlingCenter = {
      handleError: (error: any) => console.error('Error:', error),
      logError: (error: any) => console.log('Logging error:', error)
    };
    const authConfig: IFlowAuthConfig = {
      providerName: 'IFlowProvider',
      clientId: this.oauthConfig.clientId,
      tokenUrl: this.oauthConfig.tokenUrl,
      deviceCodeUrl: this.oauthConfig.deviceCodeUrl,
      maxRefreshAttempts: 3,
      autoReauthEnabled: true,
      reauthTimeout: 300000
    };
    this.authHandler = new IFlowAuthHandler(authConfig, errorHandlingCenter);

    this.log(`iFlow Provider initialized (auth mode: ${this.authMode})`);

    // 在初始化时预加载token，而不是等到第一次请求
    this.preloadTokens();
  }

  /**
   * 初始化模块 (实现IPipelineModule接口)
   */
  async initialize(config?: ModuleConfig): Promise<void> {
    // 构造函数已经完成初始化，这里只需要标记为已初始化
    this.isInitialized = true;
    this.logInfo('IFlowProvider initialized successfully', { moduleId: this.moduleId }, 'initialize');
  }

  /**
   * 销毁模块 (实现IPipelineModule接口)
   */
  async destroy(): Promise<void> {
    this.isInitialized = false;
    this.accessToken = '';
    this.refreshToken = '';
    this.tokenExpiry = 0;
    this.logInfo('IFlowProvider destroyed successfully', { moduleId: this.moduleId }, 'destroy');
  }

  /**
   * 预加载token，在初始化时调用
   */
  private async preloadTokens(): Promise<void> {
    if (this.authMode === 'oauth') {
      try {
        await this.loadAccessToken();
        this.log(`IFlow tokens preloaded: access_token=${!!this.accessToken}, refresh_token=${!!this.refreshToken}, valid=${this.isTokenValid()}`);
      } catch (error) {
        this.log(`IFlow token preloading failed: ${error}`);
      }
    } else if (this.authMode === 'apikey') {
      try {
        await this.loadApiKey();
        this.log(`IFlow API key preloaded: ${!!this.apiKey}`);
      } catch (error) {
        this.log(`IFlow API key preloading failed: ${error}`);
      }
    }
  }

  /**
   * 重写能力获取方法
   */
  protected getCapabilities() {
    return {
      streaming: true,
      tools: true,
      vision: false,
      jsonMode: true
    };
  }

  /**
   * 检查Token是否有效
   */
  private isTokenValid(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  }

  /**
   * 从iflow凭据文件加载访问令牌 (OAuth模式)
   */
  private async loadAccessToken(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.credentialsPath)) {
        this.log('iFlow OAuth credentials file not found');
        return false;
      }

      const credentialsData = fs.readFileSync(this.credentialsPath, 'utf8');
      const credentials: IFlowOAuthCredentials = JSON.parse(credentialsData);

      if (credentials.access_token && credentials.expiry_date) {
        // 检查token是否过期
        if (Date.now() < credentials.expiry_date) {
          this.accessToken = credentials.access_token;
          this.refreshToken = credentials.refresh_token || '';
          this.tokenExpiry = credentials.expiry_date;
          
          // 同时加载apiKey（如果存在），用于工具调用
          if (credentials.apiKey) {
            this.apiKey = credentials.apiKey;
            this.log('Loaded iFlow access token and API key from shared credentials');
          } else {
            this.log('Loaded iFlow access token from shared credentials (no API key for tool calling)');
          }
          
          return true;
        } else {
          this.log('iFlow access token expired');
        }
      }
    } catch (error) {
      this.log(`Error loading iFlow credentials: ${error}`);
    }
    return false;
  }

  /**
   * 从凭据文件加载API密钥 (API Key模式)
   */
  private async loadApiKey(): Promise<boolean> {
    try {
      // 优先使用配置的API key
      if (this.apiKey) {
        this.log('Using configured API key');
        return true;
      }

      // 尝试从iflow凭据文件加载API key
      if (fs.existsSync(this.credentialsPath)) {
        const credentialsData = fs.readFileSync(this.credentialsPath, 'utf8');
        const credentials: IFlowOAuthCredentials = JSON.parse(credentialsData);

        if (credentials.apiKey) {
          this.apiKey = credentials.apiKey;
          this.log('Loaded API key from shared credentials');
          return true;
        }
      }

      this.log('No API key found in configuration or credentials file');
      return false;
    } catch (error) {
      this.log(`Error loading API key: ${error}`);
      return false;
    }
  }

  /**
   * 确保有效的认证凭据
   */
  private async ensureValidAuth(): Promise<void> {
    if (this.authMode === 'oauth') {
      if (!this.accessToken || !this.isTokenValid()) {
        const loaded = await this.loadAccessToken();
        if (!loaded) {
          throw new Error('无法加载有效的iFlow访问令牌。请确保iflow已登录并且凭证文件有效。');
        }
      }
    } else if (this.authMode === 'apikey') {
      if (!this.apiKey) {
        const loaded = await this.loadApiKey();
        if (!loaded) {
          throw new Error('无法加载有效的API密钥。请在配置中提供apiKey或确保iflow凭据文件包含apiKey。');
        }
      }
    }
  }

  /**
   * 获取认证头
   */
  private getAuthHeaders(): Record<string, string> {
    if (this.authMode === 'oauth') {
      // 优先使用apiKey（如果存在），因为工具调用需要apiKey认证
      if (this.apiKey) {
        this.log('Using apiKey from OAuth credentials for tool calling support');
        return {
          'Authorization': `Bearer ${this.apiKey}`
        };
      }
      return {
        'Authorization': `Bearer ${this.accessToken}`
      };
    } else if (this.authMode === 'apikey') {
      return {
        'Authorization': `Bearer ${this.apiKey}`
      };
    }
    return {};
  }

  /**
   * 将OpenAI请求转换为iFlow请求格式
   */
  private convertToIFlowRequest(openaiRequest: OpenAIChatRequest): any {
    // 安全检查：确保messages存在且是数组
    if (!openaiRequest.messages || !Array.isArray(openaiRequest.messages)) {
      throw new Error('Invalid request: messages is required and must be an array');
    }

    const iflowRequest: any = {
      model: this.defaultModel, // 始终使用配置的模型，忽略请求中的虚拟模型名称
      messages: openaiRequest.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    };

    // 添加可选参数
    if (openaiRequest.temperature !== undefined) {
      iflowRequest.temperature = openaiRequest.temperature;
    }
    if (openaiRequest.top_p !== undefined) {
      iflowRequest.top_p = openaiRequest.top_p;
    }
    if (openaiRequest.max_tokens !== undefined) {
      iflowRequest.max_tokens = openaiRequest.max_tokens;
    }

    // 添加工具调用支持
    if (openaiRequest.tools && openaiRequest.tools.length > 0) {
      iflowRequest.tools = openaiRequest.tools.map(tool => {
        if (tool.type === 'function' && tool.function) {
          return {
            ...tool,
            function: {
              ...tool.function,
              // 添加iFlow API必需的strict字段
              ...(tool.function as any).strict !== undefined ? { strict: (tool.function as any).strict } : { strict: false }
            }
          };
        }
        return tool;
      });
    }

    return iflowRequest;
  }

  /**
   * 将iFlow响应转换为OpenAI响应格式
   */
  private convertToOpenAIResponse(iflowResponse: any): OpenAIChatResponse {
    return new OpenAIChatResponse({
      id: iflowResponse.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: iflowResponse.model || this.defaultModel,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: iflowResponse.choices?.[0]?.message?.content || '',
          tool_calls: iflowResponse.choices?.[0]?.message?.tool_calls
        },
        finish_reason: iflowResponse.choices?.[0]?.finish_reason || 'stop'
      }],
      usage: iflowResponse.usage
    });
  }

  /**
   * 执行聊天请求 - 增强版本包含认证错误恢复
   */
  async executeChat(providerRequest: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        // 确保有效的认证凭据，支持自动刷新
        if (this.authMode === 'oauth') {
          await this.ensureValidTokenWithRetry(retryCount > 0);
        } else {
          await this.ensureValidAuth();
        }

        const iflowRequest = this.convertToIFlowRequest(providerRequest);

        this.log(`Sending chat request to iFlow API (attempt ${retryCount + 1})`);

        const authHeaders = this.getAuthHeaders();
        const response = await axios.post(`${this.endpoint}/chat/completions`, iflowRequest, {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30秒超时
        });

        return this.convertToOpenAIResponse(response.data);

      } catch (error: any) {
        this.log(`Chat request failed (attempt ${retryCount + 1}): ${error.response?.data?.error || error.message}`);

        // 如果是认证错误，使用认证错误处理器进行恢复
        if (error.response?.status === 401 && this.authMode === 'oauth') {
          this.log('Authentication error detected, attempting recovery...');

          try {
            const recoveryResult = await this.authHandler.handleIFlowAuthError(
              {
                operation: 'chat_request',
                originalError: error,
                providerInfo: {
                  name: 'IFlow AI Provider',
                  endpoint: this.endpoint
                }
              },
              () => this.refreshAccessToken(),
              () => this.reauthenticate()
            );

            if (recoveryResult.success) {
              this.log(`Authentication recovery successful: ${recoveryResult.action}`);
              continue; // 恢复成功，重试请求
            } else {
              this.log(`Authentication recovery failed: ${recoveryResult.error}`);
              throw new Error(`Authentication recovery failed: ${recoveryResult.error}`);
            }
          } catch (recoveryError) {
            this.log(`Authentication recovery process failed: ${(recoveryError as Error).message}`);
            throw recoveryError;
          }
        }

        retryCount++;

        // 非认证错误或重试次数用完，直接抛出错误
        if (retryCount > maxRetries) {
          throw new Error('Max retries exceeded for chat request');
        }

        // 短暂延迟后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Max retries exceeded for chat request');
  }

  /**
   * 执行流式聊天请求
   */
  async *executeStreamChat(providerRequest: OpenAIChatRequest): AsyncGenerator<any, void, unknown> {
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        // 确保有效的认证凭据，支持自动刷新
        if (this.authMode === 'oauth') {
          await this.ensureValidTokenWithRetry(retryCount > 0);
        } else {
          await this.ensureValidAuth();
        }

        const iflowRequest = this.convertToIFlowRequest(providerRequest);
        iflowRequest.stream = true;

        this.log(`Sending stream chat request to iFlow API (attempt ${retryCount + 1})`);

        const authHeaders = this.getAuthHeaders();
        const response = await axios.post(`${this.endpoint}/chat/completions`, iflowRequest, {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          },
          responseType: 'stream',
          timeout: 60000 // 60秒超时
        });

        for await (const chunk of this.createStreamIterator(response.data)) {
          yield chunk;
        }
        return; // 成功完成，退出重试循环
        
      } catch (error: any) {
        this.log(`Stream chat request failed (attempt ${retryCount + 1}): ${error.response?.data?.error || error.message}`);
        
        retryCount++;
        
        // 如果是认证错误且还有重试机会
        if (error.response?.status === 401 && retryCount <= maxRetries) {
          this.log('Authentication error, attempting token refresh and retry...');
          
          if (this.authMode === 'oauth') {
            // 清除当前token强制重新加载
            this.accessToken = '';
            this.refreshToken = '';
          } else {
            this.apiKey = '';
          }
          continue; // 重试
        }
        
        throw error;
      }
    }
    
    throw new Error('Max retries exceeded for stream chat request');
  }

  /**
   * 创建流式迭代器
   */
  private async* createStreamIterator(stream: any): AsyncIterable<OpenAIStreamChunk> {
    // Using imported readline module
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          break;
        }

        try {
          const parsed = JSON.parse(data);
          yield this.convertStreamChunk(parsed);
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }

  /**
   * 转换流式响应块
   */
  private convertStreamChunk(chunk: any): OpenAIStreamChunk {
    return {
      id: chunk.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: chunk.model || this.defaultModel,
      choices: [{
        index: 0,
        delta: {
          role: chunk.choices?.[0]?.delta?.role,
          content: chunk.choices?.[0]?.delta?.content,
          tool_calls: chunk.choices?.[0]?.delta?.tool_calls
        },
        finish_reason: chunk.choices?.[0]?.finish_reason || null
      }]
    };
  }

  /**
   * OAuth测试工具方法
   */

  /**
   * 生成PKCE验证码
   */
  private generatePKCEVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * 生成PKCE挑战码
   */
  private generatePKCEChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * 启动设备OAuth流程
   */
  async initiateDeviceFlow(autoOpen: boolean = true): Promise<DeviceFlowData> {
    try {
      this.log('Starting iFlow OAuth device flow');
      
      const pkceVerifier = this.generatePKCEVerifier();
      const pkceChallenge = this.generatePKCEChallenge(pkceVerifier);
      
      // 使用form-data格式请求设备码
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
        pkceVerifier: pkceVerifier
      };
      
      this.log(`Device flow initiated - User code: ${deviceFlow.userCode}`);
      
      // 自动打开浏览器进行授权
      if (autoOpen && deviceFlow.verificationUriComplete) {
        this.log('Opening browser for authorization...');
        await open(deviceFlow.verificationUriComplete);
      }
      
      return deviceFlow;
      
    } catch (error: any) {
      this.log(`Failed to initiate device flow: ${error.response?.data?.error || error.message}`);
      throw error;
    }
  }

  /**
   * 等待设备授权完成
   */
  async waitForDeviceAuthorization(
    deviceCode: string, 
    pkceVerifier: string, 
    interval: number = 5, 
    maxAttempts: number = 60
  ): Promise<OAuthTokens> {
    try {
      this.log(`Waiting for device authorization (device code: ${deviceCode})`);
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, interval * 1000));
        
        try {
          const formData = new URLSearchParams();
          formData.append('client_id', this.oauthConfig.clientId);
          formData.append('client_secret', this.oauthConfig.clientSecret);
          formData.append('device_code', deviceCode);
          formData.append('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
          formData.append('code_verifier', pkceVerifier);
          
          const response = await axios.post(this.oauthConfig.tokenUrl, formData.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            }
          });

          const tokenData = response.data as any;

          const tokens: OAuthTokens = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || '',
            expiresIn: tokenData.expires_in,
            tokenType: tokenData.token_type,
            scope: tokenData.scope
          };
          
          this.log('Device authorization completed successfully');
          
          // 自动保存token到凭证文件
          await this.saveOAuthTokens(tokens);
          
          return tokens;
          
        } catch (error: any) {
          if (error.response?.data?.error === 'authorization_pending') {
            this.log(`Authorization pending... (attempt ${attempt}/${maxAttempts})`);
            continue;
          } else if (error.response?.data?.error === 'slow_down') {
            this.log(`Slow down requested... (attempt ${attempt}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, interval * 1000));
            continue;
          } else {
            this.log(`Authorization failed: ${error.response?.data?.error || error.message}`);
            throw error;
          }
        }
      }
      
      throw new Error('Device authorization timed out');
      
    } catch (error: any) {
      this.log(`Failed to wait for device authorization: ${error.message}`);
      throw error;
    }
  }

  /**
   * 保存OAuth令牌到凭证文件
   */
  private async saveOAuthTokens(tokens: OAuthTokens): Promise<void> {
    try {
      const credentialsDir = path.dirname(this.credentialsPath);
      if (!fs.existsSync(credentialsDir)) {
        fs.mkdirSync(credentialsDir, { recursive: true });
      }
      
      const credentials: IFlowOAuthCredentials = {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expiry_date: Date.now() + (tokens.expiresIn * 1000),
        token_type: tokens.tokenType,
        scope: tokens.scope
      };
      
      fs.writeFileSync(this.credentialsPath, JSON.stringify(credentials, null, 2));
      this.log(`OAuth tokens saved to ${this.credentialsPath}`);
      
      // 更新内存中的token
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      this.tokenExpiry = credentials.expiry_date;
      
    } catch (error: any) {
      this.log(`Failed to save OAuth tokens: ${error.message}`);
      throw error;
    }
  }

  /**
   * 刷新访问令牌
   */
  private async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available for token refresh');
    }
    
    try {
      this.log('Attempting to refresh access token');
      
      const formData = new URLSearchParams();
      formData.append('grant_type', 'refresh_token');
      formData.append('client_id', this.oauthConfig.clientId);
      formData.append('client_secret', this.oauthConfig.clientSecret);
      formData.append('refresh_token', this.refreshToken);
      
      const response = await axios.post(this.oauthConfig.tokenUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      const refreshData = response.data as any;

      const tokens: OAuthTokens = {
        accessToken: refreshData.access_token,
        refreshToken: refreshData.refresh_token || this.refreshToken,
        expiresIn: refreshData.expires_in,
        tokenType: refreshData.token_type,
        scope: refreshData.scope
      };
      
      // 保存刷新后的令牌
      await this.saveOAuthTokens(tokens);
      
      this.log('Access token refreshed successfully');
      return tokens;
      
    } catch (error: any) {
      this.log(`Failed to refresh access token: ${error.response?.data?.error || error.message}`);
      
      // 如果refresh token也失效了，清除所有token
      if (error.response?.status === 400 || error.response?.data?.error === 'invalid_grant') {
        this.log('Refresh token expired or invalid, clearing tokens');
        this.accessToken = '';
        this.refreshToken = '';
        this.tokenExpiry = 0;
      }
      
      throw error;
    }
  }

  /**
   * 确保有效令牌（带自动刷新）
   */
  private async ensureValidTokenWithRetry(forceRefresh: boolean = false): Promise<void> {
    if (this.authMode !== 'oauth') {
      return;
    }

    // 检查是否需要刷新
    const needsRefresh = forceRefresh || !this.isTokenValid();

    if (needsRefresh) {
      // 如果没有token，先尝试加载
      if (!this.accessToken && !this.refreshToken) {
        try {
          await this.loadAccessToken();
          if (this.isTokenValid()) {
            this.log('Token loaded successfully from credentials file');
            return;
          }
        } catch (error) {
          this.log(`Failed to load token from credentials file: ${error}`);
        }
      }

      // 如果有refresh token，尝试刷新
      if (this.refreshToken) {
        try {
          await this.refreshAccessToken();
          this.log('Token auto-refreshed successfully');
        } catch (refreshError) {
          this.log('Auto-refresh failed, manual re-authentication required');
          throw new Error('Token refresh failed: ' + (refreshError as Error).message);
        }
      } else {
        throw new Error('No valid token available. Please authenticate first.');
      }
    }
  }

  /**
   * 重建OAuth认证（强制重新认证）
   */
  async rebuildOAuthAuthentication(autoOpen: boolean = true): Promise<OAuthTokens> {
    try {
      this.log('Starting OAuth authentication rebuild');
      
      // 清除现有token
      this.accessToken = '';
      this.refreshToken = '';
      this.tokenExpiry = 0;
      
      // 执行完整的OAuth流程
      const tokens = await this.completeOAuthFlow(autoOpen);
      
      this.log('OAuth authentication rebuilt successfully');
      return tokens;
      
    } catch (error: any) {
      this.log(`Failed to rebuild OAuth authentication: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查令牌状态
   */
  async getTokenStatus(): Promise<{
    authMode: 'oauth' | 'apikey';
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    isValid: boolean;
    timeUntilExpiry: number;
    credentialsPath: string;
  }> {
    const now = Date.now();
    const timeUntilExpiry = this.tokenExpiry > 0 ? Math.max(0, this.tokenExpiry - now) / 1000 : 0;
    let isValid = false;

    if (this.authMode === 'oauth') {
      isValid = this.isTokenValid();
    } else if (this.authMode === 'apikey') {
      isValid = !!this.apiKey;
    }

    return {
      authMode: this.authMode,
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      isValid: !!isValid, // 确保返回布尔值
      timeUntilExpiry,
      credentialsPath: this.credentialsPath
    };
  }

  /**
   * 验证请求
   * 根据架构设计，提供商应忽略请求中的模型参数，使用初始化时配置的模型
   */
  validate(request: any): boolean {
    // 不再验证request.model，因为提供商使用初始化时配置的模型
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Messages are required');
    }
    return true;
  }

  /**
   * 转换为标准格式
   */
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

  /**
   * 完整的OAuth认证流程
   */
  async completeOAuthFlow(autoOpen: boolean = true): Promise<OAuthTokens> {
    try {
      this.log('Starting complete OAuth flow');
      
      const deviceFlow = await this.initiateDeviceFlow(autoOpen);
      const tokens = await this.waitForDeviceAuthorization(
        deviceFlow.deviceCode,
        deviceFlow.pkceVerifier,
        deviceFlow.interval,
        Math.ceil(deviceFlow.expiresIn / deviceFlow.interval)
      );
      
      this.log('OAuth flow completed successfully');
      return tokens;
      
    } catch (error: any) {
      this.log(`OAuth flow failed: ${error.message}`);
      throw error;
    }
  }

  // ===== IProviderModule Interface Implementation =====

  /**
   * 执行请求 (实现IProviderModule接口)
   */
  async executeRequest(request: any, context: PipelineExecutionContext): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('IFlowProvider not initialized');
    }

    try {
      // 转换为IFlow格式并执行
      const iflowRequest = this.convertToIFlowRequest(request);
      return await this.executeChat(iflowRequest);
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
      throw new Error('IFlowProvider not initialized');
    }

    try {
      // 转换为IFlow格式并执行
      const iflowRequest = this.convertToIFlowRequest(request);
      yield* this.executeStreamChat(iflowRequest);
    } catch (error) {
      this.error('Streaming request execution failed', error, 'executeStreamingRequest');
      throw error;
    }
  }

  /**
   * 获取提供商信息 (实现IProviderModule接口)
   */
  getModularProviderInfo(): ProviderInfo {
    return {
      id: 'iflow',
      name: 'IFlow AI Provider',
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
        type: this.hasValidAuthentication() ? 'oauth' : 'api-key',
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
   * 检查健康状态 (实现IProviderModule接口) - 增强版本包含自动刷新和重新认证
   */
  async checkHealth(): Promise<{
    isHealthy: boolean;
    responseTime: number;
    error?: string;
    needsReauth?: boolean;
    tokenStatus?: string;
  }> {
    const startTime = Date.now();

    try {
      // 使用增强的健康检查，包含自动刷新和重新认证
      if (this.authMode === 'oauth') {
        const healthResult = await this.authHandler.enhancedHealthCheck(
          () => this.isTokenExpired(),
          () => this.refreshAccessToken(),
          () => this.reauthenticate(),
          () => this.testAPIConnection()
        );

        const responseTime = Date.now() - startTime;

        return {
          isHealthy: healthResult.status === 'healthy',
          responseTime,
          error: healthResult.status === 'unhealthy' ? healthResult.error : undefined,
          needsReauth: healthResult.needsReauth,
          tokenStatus: healthResult.tokenStatus
        };
      } else {
        // API Key模式的健康检查
        const isHealthy = this.hasValidAuthentication();
        const responseTime = Date.now() - startTime;

        return {
          isHealthy,
          responseTime,
          error: isHealthy ? undefined : 'No valid API key',
          tokenStatus: isHealthy ? 'valid' : 'invalid'
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        isHealthy: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
        tokenStatus: 'error'
      };
    }
  }

  /**
   * 检查Token是否过期
   */
  private isTokenExpired(): boolean {
    return !this.isTokenValid();
  }

  /**
   * 测试API连接
   */
  private async testAPIConnection(): Promise<any> {
    const testRequest: OpenAIChatRequest = {
      model: this.defaultModel,
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1,
      stream: false,
      validate: () => false
    };

    const iflowRequest = this.convertToIFlowRequest(testRequest);
    const authHeaders = this.getAuthHeaders();

    const response = await axios.post(`${this.endpoint}/chat/completions`, iflowRequest, {
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10秒超时用于测试
    });

    return { success: true, model: response.data.model };
  }

  /**
   * 重新认证（用于auth handler）
   */
  private async reauthenticate(): Promise<{ success: boolean; tokens?: any; error?: string }> {
    try {
      const tokens = await this.completeOAuthFlow(true);
      return {
        success: true,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiry: Date.now() + (tokens.expiresIn * 1000)
        }
      };
    } catch (error) {
      return {
        success: false,
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
    return !!(this.accessToken || this.apiKey);
  }

  /**
   * 实现BaseProvider的抽象方法 - 处理请求
   */
  async process(request: any, context?: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('IFlowProvider not initialized');
    }

    try {
      return await this.executeChat(request);
    } catch (error) {
      this.error('Request processing failed', error, 'process');
      throw error;
    }
  }

  /**
   * 实现BaseProvider的抽象方法 - 处理响应
   */
  async processResponse(response: any, context?: any): Promise<any> {
    // 对于IFlow Provider，响应已经是标准格式，直接返回
    return response;
  }

  /**
   * 健康检查方法（BaseProvider接口）
   */
  async healthCheck(): Promise<any> {
    return this.checkHealth();
  }
}

export default IFlowProvider;