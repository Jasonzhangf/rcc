#!/usr/bin/env node

/**
 * 真实Qwen Provider验证测试
 * 基于CLIProxyAPI架构的简化实现
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Qwen OAuth2 配置
const QWEN_OAUTH_CONFIG = {
  deviceCodeEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/device/code',
  tokenEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/token',
  clientId: 'f0304373b74a44d2b584a3fb70ca9e56',
  scope: 'openid profile email model.completion',
  grantType: 'urn:ietf:params:oauth:grant-type:device_code'
};

// 简化的Qwen Provider实现
class SimpleQwenProvider {
  constructor(config = {}) {
    this.config = {
      endpoint: 'https://chat.qwen.ai/api/v1',
      timeout: 30000,
      ...config
    };
    
    this.httpClient = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'google-api-nodejs-client/9.15.1',
        'X-Goog-Api-Client': 'gl-node/22.17.0',
        'Client-Metadata': 'ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI'
      }
    });
    
    this.tokenData = null;
    this.tokenFile = './test-auth/qwen-token.json';
    
    // 确保认证目录存在
    this.ensureAuthDir();
  }

  ensureAuthDir() {
    const authDir = path.dirname(this.tokenFile);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
  }

  // 生成PKCE code verifier
  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  // 生成PKCE code challenge
  generateCodeChallenge(codeVerifier) {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    return hash.toString('base64url');
  }

  // 启动设备授权流程
  async startDeviceAuthorization() {
    try {
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);
      
      // 使用form-data格式，就像CLIProxyAPI一样
      const formData = new URLSearchParams();
      formData.append('client_id', QWEN_OAUTH_CONFIG.clientId);
      formData.append('scope', QWEN_OAUTH_CONFIG.scope);
      formData.append('code_challenge', codeChallenge);
      formData.append('code_challenge_method', 'S256');
      
      const response = await this.httpClient.post(QWEN_OAUTH_CONFIG.deviceCodeEndpoint, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const deviceAuth = {
        ...response.data,
        code_verifier: codeVerifier
      };
      
      console.log('✅ 设备授权流程启动成功');
      console.log(`   用户代码: ${deviceAuth.user_code}`);
      console.log(`   验证URI: ${deviceAuth.verification_uri}`);
      console.log(`   完整URI: ${deviceAuth.verification_uri_complete}`);
      
      return deviceAuth;
    } catch (error) {
      console.error('❌ 设备授权启动失败:', error.response?.data || error.message);
      throw error;
    }
  }

  // 轮询获取token
  async pollForToken(deviceCode, codeVerifier, maxAttempts = 60) {
    console.log('⏳ 开始轮询获取token...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 轮询尝试 ${attempt}/${maxAttempts}...`);
        
        const formData = new URLSearchParams();
        formData.append('grant_type', QWEN_OAUTH_CONFIG.grantType);
        formData.append('client_id', QWEN_OAUTH_CONFIG.clientId);
        formData.append('device_code', deviceCode);
        formData.append('code_verifier', codeVerifier);
        
        const response = await this.httpClient.post(QWEN_OAUTH_CONFIG.tokenEndpoint, formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        if (response.status === 200) {
          console.log('✅ Token获取成功！');
          const tokenData = {
            ...response.data,
            expires_at: Date.now() + (response.data.expires_in * 1000),
            obtained_at: Date.now()
          };
          
          // 保存token
          this.saveToken(tokenData);
          this.tokenData = tokenData;
          
          return tokenData;
        }
        
      } catch (error) {
        if (error.response?.status === 400) {
          const errorData = error.response.data;
          
          switch (errorData.error) {
            case 'authorization_pending':
              console.log('⏳ 授权待处理...');
              break;
            case 'slow_down':
              console.log('🐌 请求减速，等待更长时间...');
              break;
            case 'expired_token':
              throw new Error('设备代码已过期，请重新开始认证流程');
            case 'access_denied':
              throw new Error('授权被用户拒绝');
            default:
              throw new Error(`授权失败: ${errorData.error}`);
          }
        } else {
          console.error(`⚠️ 轮询尝试 ${attempt} 失败:`, error.message);
        }
      }
      
      // 等待下一次轮询
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('认证超时，请重新开始认证流程');
  }

  // 保存token
  saveToken(tokenData) {
    try {
      fs.writeFileSync(this.tokenFile, JSON.stringify(tokenData, null, 2));
      console.log('💾 Token已保存到:', this.tokenFile);
    } catch (error) {
      console.error('❌ 保存token失败:', error.message);
    }
  }

  // 加载token
  loadToken() {
    try {
      if (!fs.existsSync(this.tokenFile)) {
        return null;
      }
      
      const tokenData = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
      
      // 检查token是否过期
      if (Date.now() >= tokenData.expires_at) {
        console.log('⚠️ Token已过期');
        return null;
      }
      
      this.tokenData = tokenData;
      console.log('✅ Token加载成功');
      return tokenData;
    } catch (error) {
      console.error('❌ 加载token失败:', error.message);
      return null;
    }
  }

  // 检查token是否有效
  isTokenValid() {
    if (!this.tokenData) {
      return false;
    }
    
    return Date.now() < this.tokenData.expires_at;
  }

  // 发送聊天请求
  async sendChatRequest(messages, options = {}) {
    try {
      if (!this.isTokenValid()) {
        throw new Error('Token无效或已过期');
      }
      
      const request = {
        model: options.model || 'qwen-turbo',
        input: {
          messages: messages
        },
        parameters: {
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          top_p: options.top_p || 1.0
        },
        stream: options.stream || false
      };
      
      const response = await this.httpClient.post(
        `${this.config.endpoint}/chat/completions`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.tokenData.access_token}`
          }
        }
      );
      
      return this.transformToOpenAIFormat(response.data);
    } catch (error) {
      console.error('❌ 聊天请求失败:', error.response?.data || error.message);
      throw error;
    }
  }

  // 转换为OpenAI格式
  transformToOpenAIFormat(qwenResponse) {
    return {
      id: qwenResponse.request_id || `req_${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: qwenResponse.model || 'qwen-turbo',
      choices: qwenResponse.output?.choices?.map(choice => ({
        index: choice.index || 0,
        message: {
          role: choice.message?.role || 'assistant',
          content: choice.message?.content || ''
        },
        finish_reason: choice.finish_reason || 'stop'
      })) || [],
      usage: {
        prompt_tokens: qwenResponse.usage?.input_tokens || 0,
        completion_tokens: qwenResponse.usage?.output_tokens || 0,
        total_tokens: qwenResponse.usage?.total_tokens || 0
      }
    };
  }

  // 获取认证状态
  getAuthStatus() {
    return {
      hasToken: !!this.tokenData,
      isValid: this.isTokenValid(),
      expiresAt: this.tokenData?.expires_at || null,
      timeUntilExpiry: this.tokenData ? 
        Math.max(0, this.tokenData.expires_at - Date.now()) : 0
    };
  }
}

// 测试用例
class QwenProviderValidator {
  constructor() {
    this.provider = new SimpleQwenProvider();
    this.testResults = [];
    this.ensureTestDirs();
  }

  ensureTestDirs() {
    const dirs = ['./test-auth', './test-logs', './test-results'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  logResult(testName, success, data, error) {
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

  async runAllTests() {
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
      
      // 5. 兼容性转换测试
      await this.testCompatibilityTransformation();
      
    } catch (error) {
      console.error('测试过程中发生错误:', error);
    } finally {
      this.outputResults();
    }
  }

  async testInitialization() {
    try {
      console.log('📋 测试1: 模块初始化');
      
      const status = this.provider.getAuthStatus();
      this.logResult('模块初始化', true, {
        hasToken: status.hasToken,
        isValid: status.isValid
      });
      
    } catch (error) {
      this.logResult('模块初始化', false, null, error);
    }
  }

  async testAuthStatus() {
    try {
      console.log('📋 测试2: 认证状态检查');
      
      // 尝试加载现有token
      const tokenData = this.provider.loadToken();
      const status = this.provider.getAuthStatus();
      
      this.logResult('认证状态检查', true, {
        hasToken: status.hasToken,
        isValid: status.isValid,
        expiresAt: status.expiresAt,
        timeUntilExpiry: status.timeUntilExpiry
      });
      
    } catch (error) {
      this.logResult('认证状态检查', false, null, error);
    }
  }

  async testDeviceAuthorization() {
    try {
      console.log('📋 测试3: 设备授权流程');
      
      // 检查是否需要重新授权
      const status = this.provider.getAuthStatus();
      
      if (status.isValid && status.timeUntilExpiry > 300000) { // 5分钟
        this.logResult('设备授权流程', true, { 
          message: '已有有效令牌，无需重新授权',
          timeUntilExpiry: status.timeUntilExpiry
        });
        return;
      }
      
      // 启动设备授权
      const deviceAuth = await this.provider.startDeviceAuthorization();
      
      console.log('\n🌐 请在浏览器中访问以下链接进行授权:');
      console.log(`   ${deviceAuth.verification_uri_complete}`);
      console.log(`   用户代码: ${deviceAuth.user_code}`);
      console.log('\n⏳ 等待用户授权...\n');
      
      // 开始轮询获取token
      const tokenData = await this.provider.pollForToken(
        deviceAuth.device_code,
        deviceAuth.code_verifier
      );
      
      this.logResult('设备授权完成', true, {
        message: '用户授权成功',
        accessToken: tokenData.access_token?.substring(0, 20) + '...',
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope
      });
      
    } catch (error) {
      this.logResult('设备授权流程', false, null, error);
    }
  }

  async testConversation() {
    try {
      console.log('📋 测试4: 对话功能');
      
      // 检查认证状态
      const status = this.provider.getAuthStatus();
      if (!status.isValid) {
        this.logResult('对话功能', false, { 
          message: '未授权或令牌已过期' 
        });
        return;
      }
      
      // 测试基本对话
      const messages = [
        { role: 'user', content: '你好，请简单介绍一下你自己' }
      ];
      
      const response = await this.provider.sendChatRequest(messages);
      this.logResult('基本对话', true, {
        requestId: response.id,
        model: response.model,
        content: response.choices[0]?.message?.content?.substring(0, 100) + '...',
        usage: response.usage
      });
      
      // 测试英文对话
      const englishMessages = [
        { role: 'user', content: 'Hello, what is the capital of France?' }
      ];
      
      const englishResponse = await this.provider.sendChatRequest(englishMessages);
      this.logResult('英文对话', true, {
        requestId: englishResponse.id,
        content: englishResponse.choices[0]?.message?.content,
        usage: englishResponse.usage
      });
      
      // 测试多轮对话
      const multiMessages = [
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '2+2 equals 4.' },
        { role: 'user', content: 'What about 3+3?' }
      ];
      
      const multiResponse = await this.provider.sendChatRequest(multiMessages);
      this.logResult('多轮对话', true, {
        requestId: multiResponse.id,
        content: multiResponse.choices[0]?.message?.content,
        usage: multiResponse.usage
      });
      
    } catch (error) {
      this.logResult('对话功能', false, null, error);
    }
  }

  async testCompatibilityTransformation() {
    try {
      console.log('📋 测试5: 兼容性转换');
      
      // 检查认证状态
      const status = this.provider.getAuthStatus();
      if (!status.isValid) {
        this.logResult('兼容性转换', false, { 
          message: '未授权或令牌已过期' 
        });
        return;
      }
      
      // 测试OpenAI兼容性请求
      const testMessages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is the capital of Spain?' }
      ];
      
      const response = await this.provider.sendChatRequest(testMessages);
      
      // 验证OpenAI格式
      const isValidFormat = this.validateOpenAIFormat(response);
      this.logResult('OpenAI格式验证', isValidFormat, {
        format: {
          id: typeof response.id,
          object: response.object,
          created: typeof response.created,
          model: response.model,
          choices: Array.isArray(response.choices),
          usage: typeof response.usage
        }
      });
      
      // 验证字段映射
      const fieldMapping = this.validateFieldMapping(response);
      this.logResult('字段映射验证', fieldMapping.valid, fieldMapping);
      
    } catch (error) {
      this.logResult('兼容性转换', false, null, error);
    }
  }

  validateOpenAIFormat(response) {
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
    if (!choice.message || typeof choice.message.content !== 'string') {
      return false;
    }
    
    // 验证usage结构
    const usage = response.usage;
    if (typeof usage.total_tokens !== 'number') {
      return false;
    }
    
    return true;
  }

  validateFieldMapping(response) {
    const issues = [];
    
    // 检查对象类型
    if (response.object !== 'chat.completion') {
      issues.push('object字段应该为chat.completion');
    }
    
    // 检查choices结构
    if (!Array.isArray(response.choices)) {
      issues.push('choices应该为数组');
    } else {
      response.choices.forEach((choice, index) => {
        if (!choice.message) {
          issues.push(`choices[${index}].message缺失`);
        }
        if (choice.finish_reason && typeof choice.finish_reason !== 'string') {
          issues.push(`choices[${index}].finish_reason应该为字符串`);
        }
      });
    }
    
    // 检查usage结构
    const usage = response.usage;
    if (usage) {
      const usageFields = ['prompt_tokens', 'completion_tokens', 'total_tokens'];
      usageFields.forEach(field => {
        if (typeof usage[field] !== 'number') {
          issues.push(`usage.${field}应该为数字`);
        }
      });
    }
    
    return {
      valid: issues.length === 0,
      issues,
      fieldCount: Object.keys(response).length
    };
  }

  outputResults() {
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
main();