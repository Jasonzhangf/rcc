# RCC Pipeline 更新架构设计

基于您的修正意见，重新设计的核心架构要点：

## 📌 核心设计修正要点

### 1. LLMSwitch层修正 - 无模型映射
**原设计问题：** LLMSwitch处理模型名映射
**修正后职责：**
```
LLMSwitch层职责 (修正)：
├── 协议格式转换 (不涉及模型映射)
├── 字段结构标准化 
├── 数据类型适配
├── 错误格式统一化
└── 基础验证机制

不再处理：
❌ 模型名称映射 (model: claude → gpt-4)
❌ 模型路由选择
❌ 模型可用性检查
```

### 2. 流水线层面修正 - 无路由功能
**原设计问题：** 流水线内置路由逻辑
**修正后设计：**
```
流水线职责明确：
├── 固定的四层处理链
├── 单一协议转换路径
├── 无动态路由决策
└── 纯数据处理流水线

路由职责外移：
→ 由外部系统决定使用哪条流水线
→ 每条流水线处理固定的协议组合
→ 流水线本身不包含路由逻辑
```

### 3. Workflow层修正 - 仅流式转换
**原设计问题：** Workflow层包含太多功能 (流控、重试、超时等)
**修正后职责：**
```
Workflow层职责 (精简)：
├── 流式响应 ↔ 非流式响应转换
├── 流式数据收集和组装
├── 块数据处理逻辑
└── 流式状态管理

移除功能：
❌ 速率限制/流控
❌ 超时管理  
❌ 重试机制
❌ 请求批处理
❌ 优先级队列
```

### 4. Provider层修正 - 可插拔OAuth设计
**原设计问题：** Provider层鉴权设计不够灵活
**修正后设计：**
```
Provider层新特性：
├── 可插拔鉴权模块
│   ├── API Key鉴权 (标准第三方)
│   ├── OAuth2.0鉴权 (参考qwen设计)
│   ├── JWT鉴权
│   └── 自定义鉴权扩展
├── 可插拔提供商适配器
│   ├── OpenAI适配器
│   ├── Anthropic适配器  
│   ├── Gemini适配器
│   ├── Qwen适配器 (新增)
│   └── 自定义适配器扩展
├── 标准化 endpoint 管理
└── 统一错误处理机制
```

## 🔧 详细架构设计

### 1. LLMSwitch层详细设计 (修正版)

#### 1.1 核心职责
```
专注于协议格式转换，类似于HTTP的Content-Type转换：
├── 请求协议转换 (格式层面)
│   ├── 字段名称标准化
│   ├── 数据结构重组  
│   ├── 嵌套字段处理
│   └── 数组/对象结构调整
├── 响应协议转换 (格式层面)
│   ├── 响应字段重组
│   ├── 错误格式统一
│   └── 元数据标准化
└── 基础数据验证
    ├── 必需字段存在性检查
    ├── 基础数据类型验证
    └── 格式合规性检查
```

#### 1.2 转表示例 (无模型映射)
```typescript
// Anthropic → OpenAI 格式转换 (无模型名处理)
const anthropicToOpenAI: TransformTable = {
  version: "1.0.0",
  protocols: { input: "anthropic", output: "openai" },
  
  requestMappings: {
    // 直接字段映射 (不处理模型名)
    "model": "model",           // 保持原样，不转换
    "max_tokens": "max_tokens", // 直接映射
    
    // 结构调整映射
    "messages": {              // 结构重组
      field: "messages",
      transform: (messages) => {
        return messages.map(msg => ({
          // 角色标准化 (但不是模型映射)
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content
        }));
      }
    },
    
    // 新增字段处理
    "stream": {
      field: "stream",
      defaultValue: false     // 默认值设置
    }
  },
  
  responseMappings: {
    // 响应结构重组 (不涉及模型)
    "choices[0].message.content": "content",
    "choices[0].message.role": "role", 
    "choices[0].finish_reason": "stop_reason",
    
    // 使用信息保持原样
    "usage.prompt_tokens": "usage.input_tokens",
    "usage.completion_tokens": "usage.output_tokens",
    
    // 错误格式统一
    "error": {
      field: "error",
      transform: (error) => ({
        type: "api_error",
        message: error.message || "Unknown error",
        code: error.code
      })
    }
  }
};
```

#### 1.3 核心接口设计
```typescript
export class LLMSwitchModule extends BasePipelineModule {
  private transformTable: TransformTable;
  private inputProtocol: SupportedProtocol;
  private outputProtocol: SupportedProtocol;
  
  /**
   * 核心处理接口 - 阻塞式，专注于协议格式转换
   */
  async process(request: any): Promise<any> {
    this.debug('info', 'Processing protocol conversion', {
      inputProtocol: this.inputProtocol,
      outputProtocol: this.outputProtocol
    }, 'process');
    
    try {
      // 1. 协议识别验证
      this.validateProtocolCompatibility(request);
      
      // 2. 请求数据格式转换 (不处理模型)
      const convertedRequest = await this.convertRequestFormat(request);
      
      // 3. 基础验证 (不包括模型有效性)
      await this.validateBasicStructure(convertedRequest);
      
      return convertedRequest;
    } catch (error) {
      this.error('Protocol conversion failed', error, 'process');
      throw error;
    }
  }
  
  /**
   * 协议格式转换 - 专注于格式，不映射模型
   */
  private async convertRequestFormat(request: any): Promise<any> {
    const executor = new TransformExecutor(this.transformTable);
    const context = {
      direction: 'request',
      protocol: this.inputProtocol
    };
    
    return executor.transform(request, context);
  }
  
  /**
   * 响应格式转换 - 专注于格式还原
   */
  private async convertResponseFormat(response: any): Promise<any> {
    const executor = new TransformExecutor(this.transformTable);
    const context = {
      direction: 'response', 
      protocol: this.outputProtocol
    };
    
    return executor.transform(response, context);
  }
  
  /**
   * 协议兼容性验证 - 不验证模型
   */
  private validateProtocolCompatibility(request: any): void {
    // 只验证协议格式兼容性
    // 不验证模型名称的有效性
    if (!this.isCompatibleProtocol(request)) {
      throw new ProtocolCompatibilityError(
        `Incompatible protocol format for ${this.inputProtocol}`
      );
    }
  }
}
```

### 2. Workflow层详细设计 (精简版)

#### 2.1 核心职责
```
只做流式/非流式转换，纯粹的格式转换器：
├── 流式响应 → 非流式响应
│   ├── 收集流式数据块
│   ├── 合并成完整响应
│   ├── 处理流式元数据
│   └── 转换为标准响应格式
├── 非流式响应 → 流式响应  
│   ├── 分解大响应为流式块
│   ├── 模拟流式发送时机
│   ├── 添加流式控制字符
│   └── 维护流式状态
├── 流式数据处理
│   ├── 数据块验证
│   ├── 内容完整性检查
│   └── 顺序性保证
└── 转换状态管理
    ├── 转换模式识别
    ├── 转换进度跟踪
    └── 错误恢复机制
```

#### 2.2 核心接口设计
```typescript
export class WorkflowModule extends BasePipelineModule {
  private streamConverter: StreamConverter;
  private config: WorkflowConfig;
  
  /**
   * 核心处理接口 - 专注于流式转换
   */
  async process(request: any): Promise<any> {
    this.debug('info', 'Processing workflow stream conversion', {
      hasStreaming: request.stream || false,
      conversionMode: this.config.conversionMode
    }, 'process');
    
    try {
      // 1. 识别转换需求
      const conversionNeeds = this.analyzeStreamConversion(request);
      
      // 2. 应用流式转换
      const processedRequest = await this.applyStreamConversion(request, conversionNeeds);
      
      // 3. 添加转换元数据
      const enhancedRequest = this.enhanceWithMetadata(processedRequest, conversionNeeds);
      
      return enhancedRequest;
    } catch (error) {
      this.error('Stream conversion failed', error, 'process');
      throw error;
    }
  }
  
  /**
   * 分析流式转换需求
   */
  private analyzeStreamConversion(request: any): StreamConversionNeeds {
    const needs: StreamConversionNeeds = {
      requiresConversion: false,
      targetFormat: 'none',
      sourceFormat: 'none'
    };
    
    // 判断输入是否为流式请求
    const isStreamRequest = request.stream === true;
    
    // 根据配置决定目标格式
    if (this.config.conversionMode === 'stream-to-non-stream') {
      needs.requiresConversion = isStreamRequest;
      needs.sourceFormat = 'stream';
      needs.targetFormat = 'non-stream';
    } else if (this.config.conversionMode === 'non-stream-to-stream') {
      needs.requiresConversion = !isStreamRequest;
      needs.sourceFormat = 'non-stream';
      needs.targetFormat = 'stream';
    }
    
    return needs;
  }
  
  /**
   * 应用流式转换
   */
  private async applyStreamConversion(request: any, needs: StreamConversionNeeds): Promise<any> {
    if (!needs.requiresConversion) {
      return request; // 无需转换，直接返回
    }
    
    if (needs.sourceFormat === 'stream' && needs.targetFormat === 'non-stream') {
      // 流式 → 非流式转换
      returnthis.streamConverter.streamToNonStream(request);
    } else if (needs.sourceFormat === 'non-stream' && needs.targetFormat === 'stream') {
      // 非流式 → 流式转换  
      return this.streamConverter.nonStreamToStream(request);
    }
    
    return request;
  }
  
  /**
   * 请求响应处理 - 统一的流式转换逻辑
   */
  async handleResponse(response: any): Promise<any> {
    // 响应的流式转换逻辑
    return this.streamConverter.convertResponse(response);
  }
  
  /**
   * 流式转换器核心类 (内部实现)
   */
  private streamConverter = {
    /**
     * 流式转非流式 - 将流式响应转换为完整响应
     */
    streamToNonStream: async (streamRequest: any): Promise<any> => {
      // 构造模拟的流式响应处理
      return {
        ...streamRequest,
        stream: false,  // 标记为非流式
        streamMode: 'converted-to-non-stream',
        originalStream: true
      };
    },
    
    /**
     * 非流式转流式 - 将完整响应转换为流式格式
     */
    nonStreamToStream: async (nonStreamRequest: any): Promise<any> => {
      return {
        ...nonStreamRequest,
        stream: true,  // 标记为流式
        streamMode: 'converted-to-stream',
        chunkSize: this.config.streamConfig?.chunkSize || 1000
      };
    },
    
    /**
     * 响应格式转换
     */
    convertResponse: async (response: any): Promise<any> => {
      if (response.stream) {
        // 如果是流式响应，转换为非流式完整响应
        return this.convertStreamToCompleteResponse(response);
      } else {
        // 如果是完整响应，可能需要转换为流式
        return this.convertCompleteToStreamResponse(response);
      }
    },
    
    convertStreamToCompleteResponse: async (streamResponse: any): Promise<any> => {
      // 模拟收集流式数据并组装成完整响应
      const completeResponse = {
        ...streamResponse,
        stream: false,
        content: streamResponse.content || '',
        chunks: streamResponse.chunks || [],
        conversionInfo: {
          originalFormat: 'stream',
          targetFormat: 'complete',
          chunksCollected: (streamResponse.chunks || []).length
        }
      };
      
      return completeResponse;
    },
    
    convertCompleteToStreamResponse: async (completeResponse: any): Promise<any> => {
      // 模拟将完整响应分解为流式数据
      const content = completeResponse.content || '';
      const chunkSize = this.config.streamConfig?.chunkSize || 1000;
      const chunks = this.createStreamChunks(content, chunkSize);
      
      return {
        ...completeResponse,
        stream: true,
        chunks,
        conversionInfo: {
          originalFormat: 'complete', 
          targetFormat: 'stream',
          chunkCount: chunks.length
        }
      };
    },
    
    createStreamChunks: (content: string, chunkSize: number): any[] => {
      const chunks: any[] = [];
      for (let i = 0; i < content.length; i += chunkSize) {
        const chunk = content.slice(i, i + chunkSize);
        chunks.push({
          index: Math.floor(i / chunkSize),
          content: chunk,
          isLast: i + chunkSize >= content.length
        });
      }
      return chunks;
    }
  };
}
```

### 3. Provider层详细设计 (可插拔OAuth)

#### 3.1 核心架构
```
Provider层采用完全可插拔设计：
├── ProviderManager (管理器)
│   ├── Provider注册和发现
│   ├── Provider生命周期管理
│   └── 统一接口封装
├── AuthProvider (鉴权插件)
│   ├── API Key鉴权 provider
│   ├── OAuth2.0鉴权 provider
│   ├── JWT鉴权 provider
│   └── 自定义鉴权扩展点
├── ServiceProvider (服务商插件)
│   ├── OpenAI Service Provider
│   ├── Anthropic Service Provider  
│   ├── Gemini Service Provider
│   ├── Qwen Service Provider
│   └── 自定义Service Provider扩展点
└── HttpClient (统一HTTP客户端)
    ├── 连接池管理
    ├── 请求重试
    ├── 错误处理
    └── 指标收集
```

#### 3.2 OAuth2.0鉴权设计 (参考qwen代码)

```typescript
/**
 * OAuth2.0鉴权Provider - 基于CLIProxyApi qwen设计
 */
export class OAuth2AuthProvider implements AuthProvider {
  private config: OAuth2Config;
  private httpClient: HttpClient;
  private tokenStorage: TokenStorage;
  
  constructor(config: OAuth2Config) {
    this.config = config;
    this.httpClient = new HttpClient(config.httpClient);
    this.tokenStorage = new TokenStorage(config.storage);
  }
  
  /**
   * 获取访问令牌 - 支持设备码流程和授权码流程
   */
  async getAccessToken(): Promise<AccessToken> {
    // 1. 检查缓存的有效token
    const cachedToken = await this.getValidCachedToken();
    if (cachedToken) {
      return cachedToken;
    }
    
    // 2. 尝试使用refresh token刷新
    const refreshToken = await this.tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        const newToken = await this.refreshAccessToken(refreshToken);
        await this.tokenStorage.saveToken(newToken);
        return newToken;
      } catch (error) {
        console.log('Token refresh failed, initiating new authentication flow');
      }
    }
    
    // 3. 启动新的认证流程
    return this.initiateAuthenticationFlow();
  }
  
  /**
   * 设备码流程 - 参考qwen的PKCE实现
   */
  private async initiateDeviceFlow(): Promise<AccessToken> {
    // 1. 生成PKCE码对
    const { codeVerifier, codeChallenge } = await this.generatePKCEPair();
    
    // 2. 请求设备码
    const deviceFlow = await this.requestDeviceCode(codeChallenge);
    
    // 3. 轮询获取token
    return this.pollForToken(deviceFlow.deviceCode, codeVerifier);
  }
  
  /**
   * 生成PKCE码对 - 完全参考qwen实现
   */
  private async generatePKCEPair(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = await this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    return { codeVerifier, codeChallenge };
  }
  
  /**
   * 随机码生成器 - 32字节随机数
   */
  private async generateCodeVerifier(): Promise<string> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
  }
  
  /**
   * 生成code challenge - SHA256 + base64url
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(hashBuffer));
  }
  
  /**
   * 请求设备码 - 调用OAuth设备码端点
   */
  private async requestDeviceCode(codeChallenge: string): Promise<DeviceFlowResponse> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: this.config.scope,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    
    const response = await this.httpClient.post(
      this.config.deviceCodeEndpoint,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );
    
    return {
      deviceCode: response.device_code,
      userCode: response.user_code,
      verificationUri: response.verification_uri,
      verificationUriComplete: response.verification_uri_complete,
      expiresIn: response.expires_in,
      interval: response.interval
    };
  }
  
  /**
   * 轮询获取token - 完整的轮询逻辑，参考qwen实现
   */
  private async pollForToken(deviceCode: string, codeVerifier: string): Promise<AccessToken> {
    const pollInterval = this.config.pollInterval || 5000; // 5秒
    const maxDuration = this.config.maxPollDuration || 300000; // 5分钟
    const maxAttempts = maxDuration / pollInterval;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const tokenResponse = await this.requestToken(deviceCode, codeVerifier);
        
        // 成功获取token
        return {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          tokenType: tokenResponse.token_type,
          expiresIn: tokenResponse.expires_in,
          scope: tokenResponse.scope
        };
        
      } catch (error: any) {
        const response = error.response;
        
        if (response?.status === 400) {
          const errorData = response.data;
          const errorType = errorData?.error;
          
          // 处理OAuth RFC 8628 标准错误类型
          switch (errorType) {
            case 'authorization_pending':
              // 用户尚未授权，继续轮询
              console.log(`Polling attempt ${attempt + 1}/${maxAttempts} - authorization pending`);
              await this.delay(pollInterval);
              continue;
              
            case 'slow_down':
              // 服务器要求降低轮询频率
              const newInterval = Math.min(pollInterval * 1.5, 10000); // 最大10秒
              console.log(`Server requested slowdown, increasing interval to ${newInterval}ms`);
              await this.delay(newInterval);
              continue;
              
            case 'expired_token':
              throw new Error('Device code expired. Please restart authentication');
              
            case 'access_denied':
              throw new Error('Authorization denied by user');
              
            case 'invalid_grant':
              throw new Error('Invalid device code or verifier');
              
            default:
              // 其他错误，抛出详细错误
              throw new Error(`Token polling failed: ${errorType} - ${errorData?.error_description}`);
          }
        } else {
          // 非OAuth标准错误，可能是网络错误等
          console.log(`Polling attempt ${attempt + 1}/${maxAttempts} failed: ${error.message}`);
          
          if (attempt === maxAttempts - 1) {
            throw new Error(`Authentication timeout after ${maxAttempts} attempts`);
          }
          
          await this.delay(pollInterval);
        }
      }
    }
    
    throw new Error('Authentication timeout reached');
  }
  
  /**
   * 请求token - 向token端点发送请求
   */
  private async requestToken(deviceCode: string, codeVerifier: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: this.config.clientId,
      device_code: deviceCode,
      code_verifier: codeVerifier
    });
    
    const response = await this.httpClient.post(
      this.config.tokenEndpoint,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );
    
    return response.data;
  }
  
  /**
   * 刷新access token
   */
  private async refreshAccessToken(refreshToken: string): Promise<AccessToken> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId
    });
    
    const response = await this.httpClient.post(
      this.config.tokenEndpoint,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );
    
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
      scope: response.data.scope
    };
  }
  
  /**
   * 延迟工具方法
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 3.3 Provider管理器设计

```typescript
/**
 * Provider管理器 - 统一管理所有服务提供商和鉴权方式
 */
export class ProviderManager {
  private authProviders: Map<string, AuthProvider> = new Map();
  private serviceProviders: Map<string, ServiceProvider> = new Map();
  private httpClient: HttpClient;
  
  constructor() {
    this.httpClient = new HttpClient();
    this.initializeDefaultProviders();
  }
  
  /**
   * 注册鉴权Provider
   */
  registerAuthProvider(type: string, provider: AuthProvider): void {
    this.authProviders.set(type, provider);
  }
  
  /**
   * 注册服务Provider
   */
  registerServiceProvider(type: string, provider: ServiceProvider): void {
    this.serviceProviders.set(type, provider);
  }
  
  /**
   * 获取鉴权token
   */
  async getAccessToken(providerType: string, authConfig: AuthConfig): Promise<AccessToken> {
    const authProvider = this.authProviders.get(authConfig.type);
    if (!authProvider) {
      throw new Error(`Authentication provider not found: ${authConfig.type}`);
    }
    
    return authProvider.getAccessToken(authConfig);
  }
  
  /**
   * 发送Provider请求
   */
  async sendRequest(
    providerType: string,
    config: ProviderConfig,
    request: any
  ): Promise<any> {
    const serviceProvider = this.serviceProviders.get(providerType);
    if (!serviceProvider) {
      throw new Error(`Service provider not found: ${providerType}`);
    }
    
    // 1. 获取鉴权token
    const token = await this.getAccessToken(providerType, config.auth);
    
    // 2. 构建请求
    const httpRequest = await serviceProvider.buildRequest(request, config, token);
    
    // 3. 发送HTTP请求
    const httpResponse = await this.httpClient.send(httpRequest);
    
    // 4. 处理响应
    return serviceProvider.processResponse(httpResponse);
  }
  
  /**
   * 初始化默认Provider
   */
  private initializeDefaultProviders(): void {
    // 注册API Key鉴权
    this.registerAuthProvider('api-key', new ApiKeyAuthProvider());
    
    // 注册OAuth2.0鉴权
    this.registerAuthProvider('oauth2', new OAuth2AuthProvider());
    
    // 注册JWT鉴权  
    this.registerAuthProvider('jwt', new JwtAuthProvider());
    
    // 注册标准服务Provider
    this.registerServiceProvider('openai', new OpenAIProvider());
    this.registerServiceProvider('anthropic', new AnthropicProvider());
    this.registerServiceProvider('gemini', new GeminiProvider());
    this.registerServiceProvider('qwen', new QwenProvider());
  }
}
```

#### 3.4 Provider模块核心接口

```typescript
/**
 * Provider模块 - 核心处理接口
 */
export class ProviderModule extends BasePipelineModule {
  private providerManager: ProviderManager;
  private config: ProviderConfig;
  
  /**
   * 核心处理接口 - 阻塞式，使用可插拔Provider
   */
  async process(request: any): Promise<any> {
    this.debug('info', 'Processing provider request', {
      provider: this.config.provider,
      endpoint: this.config.endpoint
    }, 'process');
    
    try {
      // 1. 选择并验证Provider配置
      const providerConfig = this.validateProviderConfig();
      
      // 2. 发送请求到具体的Provider
      const response = await this.providerManager.sendRequest(
        this.config.provider,
        providerConfig,
        request
      );
      
      // 3. 处理Provider响应
      return this.processProviderResponse(response);
      
    } catch (error) {
      this.error('Provider request failed', {
        error: error.message,
        provider: this.config.provider
      }, 'process');
      throw error;
    }
  }
  
  /**
   * 验证Provider配置
   */
  private validateProviderConfig(): ProviderConfig {
    const config = { ...this.config };
    
    // 验证必需配置
    if (!config.provider) {
      throw new ProviderError('Provider type is required');
    }
    
    if (!config.auth) {
      throw new ProviderError('Authentication configuration is required');
    }
    
    // 设置默认endpoint
    if (!config.endpoint) {
      config.endpoint = this.getDefaultEndpoint(config.provider);
    }
    
    return config;
  }
  
  /**
   * 处理Provider响应
   */
  private async processProviderResponse(response: any): Promise<any> {
    // 标准化响应格式
    return {
      id: response.id || this.generateResponseId(),
      object: response.object || 'chat.completion',
      created: response.created || Math.floor(Date.now() / 1000),
      model: response.model || this.config.model,
      choices: response.choices || [],
      usage: response.usage || {},
      provider: this.config.provider,
      metadata: {
        providerType: this.config.provider,
        statusCode: response.statusCode,
        headers: response.headers
      }
    };
  }
  
  /**
   * 获取Provider默认endpoint
   */
  private getDefaultEndpoint(providerType: string): string {
    const defaultEndpoints = {
      'openai': 'https://api.openai.com/v1/chat/completions',
      'anthropic': 'https://api.anthropic.com/v1/messages',
      'gemini': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      'qwen': 'https://chat.qwen.ai/api/v1/services/aigc/text-generation/generation'
    };
    
    const endpoint = defaultEndpoints[providerType as keyof typeof defaultEndpoints];
    if (!endpoint) {
      throw new ProviderError(`No default endpoint for provider: ${providerType}`);
    }
    
    return endpoint;
  }
}
```

## 📋 更新后的架构特点

### 1. 职责更加明确
- **LLMSwitch**: 专注于协议格式转换，不涉及模型映射
- **Workflow**: 只做流式/非流式转换，功能精简
- **Compatibility**: 字段适配和错误标准化
- **Provider**: 完全可插拔的鉴权和服务商支持

### 2. 扩展性更强
- **鉴权可插拔**: 支持API Key、OAuth2.0、JWT等
- **服务商可插拔**: 可轻松新增AI服务提供商
- **转换表配置化**: 协议转换完全通过配置驱动

### 3. 符合需求修正
- ❌ 无模型映射和路由
- ❌ 无流控功能
- ❌ 无复杂路由逻辑
- ✅ 专注流式转换
- ✅ 完善的OAuth支持
- ✅ 可插拔Provider设计

这个更新后的架构设计完全按照您的修正意见进行了调整，确保每个模块的职责清晰，功能专注，同时也为未来的扩展提供了良好的基础。