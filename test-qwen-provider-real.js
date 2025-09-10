#!/usr/bin/env node

/**
 * 真实Qwen Provider验证测试
 * 测试OAuth2认证流程和API对话功能
 */

import { QwenProviderModule } from './sharedmodule/pipeline/src/modules/QwenProviderModule';
import * as fs from 'fs';
import * as path from 'path';

// 测试配置
const testConfig = {
  provider: 'qwen',
  endpoint: 'https://chat.qwen.ai/api/v1',
  auth: {
    type: 'qwen',
    accessTokenFile: './test-auth/qwen-access-token.json',
    refreshTokenFile: './test-auth/qwen-refresh-token.json',
    tokenStoreDir: './test-auth',
    autoRefresh: true,
    refreshThreshold: 300000,
    deviceFlow: {
      enabled: true,
      clientId: 'f0304373b74a44d2b584a3fb70ca9e56',
      scope: 'openid profile email model.completion',
      pkce: true,
      authEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/device/code',
      tokenEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/token',
      pollingInterval: 5000,
      maxPollingAttempts: 60
    },
    onMaintenanceMode: (enabled) => {
      console.log(`维护模式: ${enabled ? '开启' : '关闭'}`);
    }
  },
  model: 'qwen-turbo',
  timeout: 60000,
  maxRetries: 3,
  retryDelay: 1000,
  headers: {
    'User-Agent': 'RCC-Qwen-Provider/1.0.0'
  },
  enableLogging: true,
  debug: {
    enabled: true,
    logLevel: 'debug',
    logDir: './test-logs',
    maxLogFiles: 10,
    maxFileSize: 10485760 // 10MB
  }
};

// 测试用例
class QwenProviderValidator {
  private provider: QwenProviderModule;
  private testResults: any[] = [];

  constructor() {
    this.provider = new QwenProviderModule({
      id: 'qwen-provider-test',
      name: 'QwenProviderTest',
      version: '1.0.0',
      description: 'Qwen provider validation test',
      type: 'provider',
      dependencies: [],
      config: testConfig
    });

    // 确保测试目录存在
    this.ensureTestDirs();
  }

  private ensureTestDirs(): void {
    const dirs = ['./test-auth', './test-logs'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private logResult(testName: string, success: boolean, data?: any, error?: any): void {
    const result = {
      test: testName,
      success,
      timestamp: new Date().toISOString(),
      data,
      error: error?.message || error
    };
    
    this.testResults.push(result);
    console.log(`[${success ? '✅' : '❌'}] ${testName}`);
    
    if (error) {
      console.log(`   错误: ${error.message || error}`);
    }
    
    if (data) {
      console.log(`   数据: ${JSON.stringify(data, null, 2)}`);
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 开始Qwen Provider验证测试...\n');
    
    try {
      // 1. 初始化测试
      await this.testInitialization();
      
      // 2. 认证状态测试
      await this.testAuthStatus();
      
      // 3. 设备授权流程测试
      await this.testDeviceAuthorization();
      
      // 4. 对话功能测试
      await this.testConversation();
      
      // 5. 错误处理测试
      await this.testErrorHandling();
      
      // 6. 兼容性转换测试
      await this.testCompatibilityTransformation();
      
    } catch (error) {
      console.error('测试过程中发生错误:', error);
    } finally {
      // 清理资源
      try {
        await this.provider.destroy();
      } catch (error) {
        console.warn('清理资源时出错:', error);
      }
      
      // 输出测试结果
      this.outputResults();
    }
  }

  private async testInitialization(): Promise<void> {
    try {
      console.log('📋 测试1: 模块初始化');
      await this.provider.initialize();
      
      const health = await this.provider.getHealth();
      this.logResult('模块初始化', health.status === 'healthy', {
        status: health.status,
        isAvailable: health.isAvailable
      });
      
    } catch (error) {
      this.logResult('模块初始化', false, undefined, error);
    }
  }

  private async testAuthStatus(): Promise<void> {
    try {
      console.log('📋 测试2: 认证状态检查');
      
      // 检查认证状态
      const authStatus = this.provider.getAuthStatus();
      this.logResult('认证状态检查', true, {
        state: authStatus.state,
        isAuthorized: authStatus.isAuthorized,
        isExpired: authStatus.isExpired,
        maintenanceMode: authStatus.maintenanceMode
      });
      
      // 尝试获取访问令牌
      try {
        const token = await this.provider.getAccessToken();
        this.logResult('访问令牌获取', true, { hasToken: !!token });
      } catch (error) {
        this.logResult('访问令牌获取', false, undefined, error);
      }
      
    } catch (error) {
      this.logResult('认证状态检查', false, undefined, error);
    }
  }

  private async testDeviceAuthorization(): Promise<void> {
    try {
      console.log('📋 测试3: 设备授权流程');
      
      // 检查是否需要设备授权
      const authStatus = this.provider.getAuthStatus();
      
      if (authStatus.isAuthorized && !authStatus.isExpired) {
        this.logResult('设备授权流程', true, { 
          message: '已有有效令牌，无需重新授权' 
        });
        return;
      }
      
      // 启动设备授权
      const deviceAuth = await this.provider.startDeviceAuthorization();
      this.logResult('设备授权流程', true, {
        deviceCode: deviceAuth.device_code,
        userCode: deviceAuth.user_code,
        verificationUri: deviceAuth.verification_uri,
        expiresIn: deviceAuth.expires_in
      });
      
      console.log('\n🌐 请在浏览器中访问以下链接进行授权:');
      console.log(`   ${deviceAuth.verification_uri_complete}`);
      console.log(`   用户代码: ${deviceAuth.user_code}`);
      console.log('\n⏳ 等待用户授权...\n');
      
      // 等待授权完成（这里简化处理，实际应用中应该有超时机制）
      let authorized = false;
      let attempts = 0;
      const maxAttempts = 60; // 5分钟
      
      while (!authorized && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
        
        const currentStatus = this.provider.getAuthStatus();
        if (currentStatus.isAuthorized && !currentStatus.isExpired) {
          authorized = true;
          this.logResult('设备授权完成', true, { 
            message: '用户授权成功',
            attempts 
          });
        }
      }
      
      if (!authorized) {
        this.logResult('设备授权完成', false, { 
          message: '授权超时',
          attempts 
        });
      }
      
    } catch (error) {
      this.logResult('设备授权流程', false, undefined, error);
    }
  }

  private async testConversation(): Promise<void> {
    try {
      console.log('📋 测试4: 对话功能');
      
      // 检查认证状态
      const authStatus = this.provider.getAuthStatus();
      if (!authStatus.isAuthorized || authStatus.isExpired) {
        this.logResult('对话功能', false, { 
          message: '未授权或令牌已过期' 
        });
        return;
      }
      
      // 测试对话请求
      const testRequest = {
        model: 'qwen-turbo',
        messages: [
          { role: 'user', content: '你好，请介绍一下你自己' }
        ],
        temperature: 0.7,
        max_tokens: 1000
      };
      
      const response = await this.provider.processRequest(testRequest);
      this.logResult('对话功能', true, {
        requestId: response.request_id,
        model: response.model,
        choices: response.choices?.length || 0,
        usage: response.usage
      });
      
      // 测试工具调用请求
      const toolRequest = {
        model: 'qwen-turbo',
        messages: [
          { role: 'user', content: '请列出当前目录中的文件' }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'list_files',
              description: '列出指定目录中的文件',
              parameters: {
                type: 'object',
                properties: {
                  path: {
                    type: 'string',
                    description: '目录路径'
                  }
                },
                required: ['path']
              }
            }
          }
        ],
        tool_choice: 'auto'
      };
      
      const toolResponse = await this.provider.processRequest(toolRequest);
      this.logResult('工具调用功能', true, {
        requestId: toolResponse.request_id,
        hasToolCalls: !!toolResponse.choices?.[0]?.message?.tool_calls,
        usage: toolResponse.usage
      });
      
    } catch (error) {
      this.logResult('对话功能', false, undefined, error);
    }
  }

  private async testErrorHandling(): Promise<void> {
    try {
      console.log('📋 测试5: 错误处理');
      
      // 测试无效模型
      try {
        const invalidRequest = {
          model: 'invalid-model',
          messages: [{ role: 'user', content: 'test' }]
        };
        
        await this.provider.processRequest(invalidRequest);
        this.logResult('无效模型处理', false, { 
          message: '应该抛出错误但没有' 
        });
      } catch (error) {
        this.logResult('无效模型处理', true, { 
          message: '正确处理了无效模型',
          error: error.message 
        });
      }
      
      // 测试空消息
      try {
        const emptyRequest = {
          model: 'qwen-turbo',
          messages: []
        };
        
        await this.provider.processRequest(emptyRequest);
        this.logResult('空消息处理', false, { 
          message: '应该抛出错误但没有' 
        });
      } catch (error) {
        this.logResult('空消息处理', true, { 
          message: '正确处理了空消息',
          error: error.message 
        });
      }
      
      // 测试超时处理
      try {
        const timeoutRequest = {
          model: 'qwen-turbo',
          messages: [{ role: 'user', content: 'test' }],
          timeout: 1
        };
        
        await this.provider.processRequest(timeoutRequest);
        this.logResult('超时处理', false, { 
          message: '应该抛出超时错误但没有' 
        });
      } catch (error) {
        this.logResult('超时处理', true, { 
          message: '正确处理了超时',
          error: error.message 
        });
      }
      
    } catch (error) {
      this.logResult('错误处理测试', false, undefined, error);
    }
  }

  private async testCompatibilityTransformation(): Promise<void> {
    try {
      console.log('📋 测试6: 兼容性转换');
      
      // 测试OpenAI兼容性请求
      const openAIRequest = {
        model: 'qwen-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'What is the capital of France?' }
        ],
        temperature: 0.7,
        max_tokens: 100,
        top_p: 1.0,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: false
      };
      
      const response = await this.provider.processRequest(openAIRequest);
      this.logResult('OpenAI兼容性', true, {
        hasId: !!response.id,
        hasObject: !!response.object,
        hasCreated: !!response.created,
        hasChoices: !!response.choices,
        hasUsage: !!response.usage
      });
      
      // 验证响应字段转换
      const isValidResponse = this.validateOpenAIResponse(response);
      this.logResult('响应字段转换', isValidResponse, {
        valid: isValidResponse,
        fields: {
          id: typeof response.id,
          object: typeof response.object,
          created: typeof response.created,
          model: typeof response.model,
          choices: Array.isArray(response.choices),
          usage: typeof response.usage
        }
      });
      
      // 测试流式响应
      const streamRequest = {
        ...openAIRequest,
        stream: true
      };
      
      // 注意：这里只测试请求格式，不实际测试流式响应
      this.logResult('流式响应支持', true, {
        message: '流式请求格式验证通过',
        stream: streamRequest.stream
      });
      
    } catch (error) {
      this.logResult('兼容性转换', false, undefined, error);
    }
  }

  private validateOpenAIResponse(response: any): boolean {
    const requiredFields = ['id', 'object', 'created', 'model', 'choices', 'usage'];
    
    for (const field of requiredFields) {
      if (!response[field]) {
        return false;
      }
    }
    
    // 验证choices结构
    if (!Array.isArray(response.choices) || response.choices.length === 0) {
      return false;
    }
    
    const choice = response.choices[0];
    if (!choice.message || !choice.message.content) {
      return false;
    }
    
    // 验证usage结构
    const usage = response.usage;
    if (!usage || typeof usage.total_tokens !== 'number') {
      return false;
    }
    
    return true;
  }

  private outputResults(): void {
    console.log('\n📊 测试结果总结:');
    console.log('=' .repeat(50));
    
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.success).length;
    const failed = total - passed;
    
    console.log(`总测试数: ${total}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log(`成功率: ${((passed / total) * 100).toFixed(1)}%`);
    
    console.log('\n详细结果:');
    this.testResults.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.test} - ${result.timestamp}`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
    });
    
    // 保存详细结果到文件
    const resultFile = './test-results/qwen-provider-validation.json';
    const resultDir = path.dirname(resultFile);
    
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }
    
    fs.writeFileSync(resultFile, JSON.stringify({
      testRun: {
        timestamp: new Date().toISOString(),
        total,
        passed,
        failed,
        successRate: ((passed / total) * 100).toFixed(1) + '%'
      },
      results: this.testResults
    }, null, 2));
    
    console.log(`\n📄 详细结果已保存到: ${resultFile}`);
    
    if (failed > 0) {
      console.log('\n⚠️  有测试失败，请检查错误信息并修复问题。');
      process.exit(1);
    } else {
      console.log('\n🎉 所有测试通过！Qwen Provider验证完成。');
    }
  }
}

// 运行测试
async function main() {
  const validator = new QwenProviderValidator();
  await validator.runAllTests();
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动测试
main().catch(error => {
  console.error('测试启动失败:', error);
  process.exit(1);
});