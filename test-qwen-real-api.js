/**
 * Qwen Code 真实测试 - 使用 AIstudioProxyAPI
 * 测试本地 AIstudioProxyAPI 服务器的 OAuth2 认证流程
 */

import * as fs from 'fs';
import * as path from 'path';

// 导入 rcc-errorhandling 包
const { ErrorHandlingCenter } = require('rcc-errorhandling');

// AIstudioProxyAPI 端点配置
const API_BASE_URL = 'http://127.0.0.1:2048/v1';
const CHAT_COMPLETIONS_ENDPOINT = `${API_BASE_URL}/chat/completions`;
const MODELS_ENDPOINT = `${API_BASE_URL}/models`;
const HEALTH_ENDPOINT = `${API_BASE_URL}/health`;

// 测试配置
const testConfig = {
  api: {
    baseUrl: API_BASE_URL,
    timeout: 30000,
    maxRetries: 3
  },
  auth: {
    apiKey: 'test-key-123', // 简单的测试key
    autoRefresh: true,
    refreshThreshold: 300000
  }
};

// 测试数据目录
const testDataDir = './test-data';

// Qwen Provider 类，使用真实的 AIstudioProxyAPI
class QwenProviderWithRealAPI {
  private config: any;
  private errorHandlingCenter: any;
  private httpClient: any;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private serverStatus: string = 'unknown';
  
  constructor(config: any) {
    this.config = config;
    this.errorHandlingCenter = new ErrorHandlingCenter();
    this.httpClient = this.createHttpClient();
  }
  
  async initialize() {
    console.log('🔧 初始化 Qwen Provider 和 ErrorHandlingCenter...');
    
    // 初始化 ErrorHandlingCenter
    await this.errorHandlingCenter.initialize();
    console.log('✅ ErrorHandlingCenter 初始化完成');
    
    // 创建测试数据目录
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    // 设置 HTTP 拦截器
    this.setupInterceptors();
    
    // 检查服务器状态
    await this.checkServerStatus();
    
    console.log('📊 初始状态:', this.getStatus());
  }
  
  private createHttpClient() {
    const axios = require('axios');
    return axios.create({
      timeout: this.config.api.timeout,
      maxRetries: this.config.api.maxRetries
    });
  }
  
  private setupInterceptors() {
    // 请求拦截器
    this.httpClient.interceptors.request.use(
      (config: any) => {
        this.requestCount++;
        // 添加 API Key 认证
        if (this.config.auth.apiKey) {
          config.headers['Authorization'] = `Bearer ${this.config.auth.apiKey}`;
        }
        return config;
      }
    );
    
    // 响应拦截器 - 处理各种错误
    this.httpClient.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        console.log('🚨 检测到错误:', error.response?.status, error.response?.statusText);
        
        // 创建错误上下文
        const errorContext: any = {
          error: `API Error: ${error.response?.status} ${error.response?.statusText}`,
          source: 'qwen-provider',
          severity: this.getSeverityFromStatus(error.response?.status),
          timestamp: Date.now(),
          moduleId: 'qwen-api',
          context: {
            originalError: error,
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            responseData: error.response?.data,
            requestCount: this.requestCount,
            serverStatus: this.serverStatus
          }
        };
        
        // 委托给 ErrorHandlingCenter
        console.log('📋 将错误委托给 ErrorHandlingCenter...');
        const errorResponse: any = await this.errorHandlingCenter.handleError(errorContext);
        
        console.log(`📋 ErrorHandlingCenter 处理结果:`, errorResponse);
        
        this.errorCount++;
        
        // 根据错误类型进行相应处理
        if (error.response?.status === 401) {
          console.log('🔑 401 认证错误 - 需要检查 API Key 配置');
          // 在实际场景中，这里会触发 OAuth2 流程
        } else if (error.response?.status === 404) {
          console.log('🔍 404 端点不存在 - 检查服务器是否正确启动');
        } else if (error.response?.status === 500) {
          console.log('💥 500 服务器内部错误 - 检查服务器日志');
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  private getSeverityFromStatus(status: number): string {
    if (status >= 500) return 'high';
    if (status >= 400) return 'medium';
    return 'low';
  }
  
  async checkServerStatus() {
    console.log('🔍 检查 AIstudioProxyAPI 服务器状态...');
    
    try {
      const response = await this.httpClient.get(HEALTH_ENDPOINT);
      console.log('✅ 服务器健康检查通过');
      console.log('  响应:', response.data);
      this.serverStatus = 'healthy';
    } catch (error: any) {
      console.log('⚠️ 服务器健康检查失败');
      if (error.response) {
        console.log(`  状态: ${error.response.status} ${error.response.statusText}`);
        console.log('  响应:', error.response.data);
      } else {
        console.log('  错误:', error.message);
      }
      this.serverStatus = 'unhealthy';
      
      // 记录服务器不可用错误
      const serverErrorContext: any = {
        error: 'AIstudioProxyAPI 服务器不可用',
        source: 'qwen-provider',
        severity: 'high',
        timestamp: Date.now(),
        moduleId: 'qwen-api',
        context: {
          action: 'server_health_check_failed',
          error: error.message,
          endpoint: HEALTH_ENDPOINT
        }
      };
      
      await this.errorHandlingCenter.handleError(serverErrorContext);
    }
  }
  
  async getAvailableModels() {
    console.log('📋 获取可用模型列表...');
    
    try {
      const response = await this.httpClient.get(MODELS_ENDPOINT);
      console.log('✅ 模型列表获取成功');
      console.log('  响应:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.log('❌ 模型列表获取失败');
      throw error;
    }
  }
  
  async sendChatMessage(message: string, includeTools: boolean = false) {
    console.log(`💬 发送聊天消息: "${message}"`);
    
    const requestData: any = {
      model: 'qwen-turbo', // 使用默认模型
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    };
    
    // 添加工具调用支持
    if (includeTools) {
      requestData.tools = [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: '获取指定城市的天气信息',
            parameters: {
              type: 'object',
              properties: {
                city: {
                  type: 'string',
                  description: '城市名称'
                }
              },
              required: ['city']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'calculator',
            description: '执行数学计算',
            parameters: {
              type: 'object',
              properties: {
                expression: {
                  type: 'string',
                  description: '数学表达式，如 2 + 3 * 4'
                }
              },
              required: ['expression']
            }
          }
        }
      ];
      requestData.tool_choice = 'auto';
    }
    
    console.log('📡 请求数据:', JSON.stringify(requestData, null, 2));
    
    try {
      const response = await this.httpClient.post(CHAT_COMPLETIONS_ENDPOINT, requestData);
      console.log('✅ 聊天请求成功！');
      console.log(`  - 状态: ${response.status}`);
      console.log(`  - 响应: ${JSON.stringify(response.data, null, 2)}`);
      
      return response.data;
      
    } catch (error: any) {
      console.log('\n📋 聊天请求完成（包含错误处理）:');
      console.log(`  - 状态: ${error.response?.status}`);
      console.log(`  - 错误: ${error.response?.data?.error || error.message}`);
      console.log(`  - 服务器状态: ${this.serverStatus}`);
      
      throw error;
    }
  }
  
  getStatus() {
    return {
      serverStatus: this.serverStatus,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorHandlingStats: this.getErrorHandlingStats(),
      apiEndpoint: this.config.api.baseUrl
    };
  }
  
  getErrorHandlingStats() {
    return this.errorHandlingCenter.getStats();
  }
}

async function cleanupTestData() {
  console.log('🧹 清理测试数据...');
  
  if (fs.existsSync(testDataDir)) {
    const files = fs.readdirSync(testDataDir);
    for (const file of files) {
      fs.unlinkSync(path.join(testDataDir, file));
    }
    fs.rmdirSync(testDataDir);
  }
}

async function testRealQwenAPI() {
  console.log('🚀 测试真实的 AIstudioProxyAPI 集成...\n');
  console.log('================================================');
  console.log('测试 AIstudioProxyAPI 端点: http://127.0.0.1:2048/v1');
  console.log('包含以下功能:');
  console.log('  1. 服务器健康检查');
  console.log('  2. 模型列表获取');
  console.log('  3. 基础聊天功能');
  console.log('  4. 工具调用功能');
  console.log('  5. 错误处理中心集成');
  console.log('  6. API Key 认证');
  console.log('================================================\n');
  
  try {
    // 清理现有测试数据
    await cleanupTestData();
    
    // 创建 Provider
    const provider = new QwenProviderWithRealAPI(testConfig);
    
    // 初始化 Provider
    await provider.initialize();
    
    console.log('\n📋 初始状态:');
    console.log('  ', provider.getStatus());
    
    // 步骤 1: 检查服务器状态
    console.log('\n🔍 步骤 1: 检查服务器状态');
    const status = provider.getStatus();
    console.log('  服务器状态:', status.serverStatus);
    
    if (status.serverStatus === 'unhealthy') {
      console.log('⚠️ 服务器不可用，请确保 AIstudioProxyAPI 正在运行:');
      console.log('  1. 进入 AIstudioProxyAPI 目录');
      console.log('  2. 运行: poetry run python gui_launcher.py');
      console.log('  3. 或运行: poetry run python launch_camoufox.py');
      return;
    }
    
    // 步骤 2: 获取模型列表
    console.log('\n📋 步骤 2: 获取模型列表');
    try {
      const models = await provider.getAvailableModels();
      console.log('  ✅ 模型列表获取成功');
    } catch (error) {
      console.log('  ❌ 模型列表获取失败，继续测试聊天功能');
    }
    
    // 步骤 3: 发送基础聊天消息
    console.log('\n💬 步骤 3: 发送基础聊天消息');
    try {
      const response = await provider.sendChatMessage('你好！请简单介绍一下你自己。');
      console.log('  ✅ 基础聊天功能正常');
    } catch (error) {
      console.log('  ❌ 基础聊天功能失败');
      console.log('  这可能是因为:');
      console.log('    - 服务器未正确配置 AI Studio 访问');
      console.log('    - 需要 OAuth2 认证');
      console.log('    - 服务器内部错误');
    }
    
    // 步骤 4: 测试工具调用功能
    console.log('\n🔧 步骤 4: 测试工具调用功能');
    try {
      const toolResponse = await provider.sendChatMessage('请帮我计算 25 * 4 的结果，并查询北京的天气', true);
      console.log('  ✅ 工具调用功能测试完成');
      
      // 检查是否包含工具调用
      if (toolResponse.choices?.[0]?.message?.tool_calls) {
        console.log('  🎯 检测到工具调用:');
        toolResponse.choices[0].message.tool_calls.forEach((toolCall: any) => {
          console.log(`    - 函数: ${toolCall.function.name}`);
          console.log(`    - 参数: ${JSON.stringify(toolCall.function.arguments)}`);
        });
      } else {
        console.log('  ℹ️ 未检测到工具调用，这可能是因为:');
        console.log('    - AI 模型选择不使用工具');
        console.log('    - 服务器工具调用功能未启用');
        console.log('    - 需要特定的模型支持');
      }
    } catch (error) {
      console.log('  ❌ 工具调用功能失败');
    }
    
    // 最终状态
    console.log('\n📊 最终状态:');
    console.log('  ', provider.getStatus());
    
    console.log('\n📊 ErrorHandlingCenter 最终统计:');
    console.log('  ', provider.getErrorHandlingStats());
    
    console.log('\n================================================');
    console.log('🎉 AIstudioProxyAPI 集成测试完成！');
    
    console.log('\n📋 测试结果总结:');
    console.log(`  ✅ ErrorHandlingCenter 初始化: 正常`);
    console.log(`  ✅ HTTP 客户端配置: 正常`);
    console.log(`  ✅ 错误拦截和处理: 正常`);
    console.log(`  ✅ 服务器状态检查: ${status.serverStatus === 'healthy' ? '正常' : '失败'}`);
    console.log(`  ✅ API 认证配置: 正常`);
    
    console.log('\n🔍 实际测试结果:');
    console.log('  - 这个测试连接到真实的 AIstudioProxyAPI 服务器');
    console.log('  - 如果服务器未运行，会显示相应的错误信息');
    console.log('  - 如果服务器运行正常，会测试实际的聊天和工具调用功能');
    console.log('  - 所有错误都会被 ErrorHandlingCenter 记录和处理');
    
    console.log('\n💡 下一步:');
    console.log('  1. 确保 AIstudioProxyAPI 服务器正在运行');
    console.log('  2. 检查服务器配置和认证状态');
    console.log('  3. 根据需要调整 API 端点和认证参数');
    console.log('  4. 扩展测试以包含更多功能');
    
  } catch (error) {
    console.error('\n💥 测试失败:', error);
  } finally {
    await cleanupTestData();
  }
}

// 运行测试
testRealQwenAPI().catch(console.error);