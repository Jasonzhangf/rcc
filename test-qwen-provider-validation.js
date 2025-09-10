#!/usr/bin/env node

/**
 * 真实Qwen Provider验证测试
 * 测试OAuth2认证流程和API对话功能
 */

const fs = require('fs');
const path = require('path');

// 动态导入ES模块
async function loadQwenProviderModule() {
  try {
    // 尝试从编译后的文件加载
    const modulePath = path.join(__dirname, 'dist/sharedmodule/pipeline/src/modules/QwenProviderModule.js');
    if (fs.existsSync(modulePath)) {
      const module = await import(modulePath);
      return module.QwenProviderModule;
    }
    
    // 尝试从源文件加载
    const sourcePath = path.join(__dirname, 'sharedmodule/pipeline/src/modules/QwenProviderModule.ts');
    if (fs.existsSync(sourcePath)) {
      console.log('警告: 使用TypeScript源文件，建议先编译项目');
      return null;
    }
    
    throw new Error('找不到QwenProviderModule模块');
  } catch (error) {
    console.error('加载QwenProviderModule失败:', error);
    return null;
  }
}

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
  constructor(QwenProviderModule) {
    this.QwenProviderModule = QwenProviderModule;
    this.provider = null;
    this.testResults = [];
    
    // 确保测试目录存在
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
    
    if (!this.QwenProviderModule) {
      this.logResult('模块加载', false, null, new Error('无法加载QwenProviderModule'));
      this.outputResults();
      return;
    }
    
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
        if (this.provider) {
          await this.provider.destroy();
        }
      } catch (error) {
        console.warn('清理资源时出错:', error);
      }
      
      // 输出测试结果
      this.outputResults();
    }
  }

  async testInitialization() {
    try {
      console.log('📋 测试1: 模块初始化');
      
      this.provider = new this.QwenProviderModule({
        id: 'qwen-provider-test',
        name: 'QwenProviderTest',
        version: '1.0.0',
        description: 'Qwen provider validation test',
        type: 'provider',
        dependencies: [],
        config: testConfig
      });
      
      await this.provider.initialize();
      
      const health = await this.provider.getHealth();
      this.logResult('模块初始化', health.status === 'healthy', {
        status: health.status,
        isAvailable: health.isAvailable
      });
      
    } catch (error) {
      this.logResult('模块初始化', false, null, error);
    }
  }

  async testAuthStatus() {
    try {
      console.log('📋 测试2: 认证状态检查');
      
      if (!this.provider) {
        this.logResult('认证状态检查', false, null, new Error('Provider未初始化'));
        return;
      }
      
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
        this.logResult('访问令牌获取', false, null, error);
      }
      
    } catch (error) {
      this.logResult('认证状态检查', false, null, error);
    }
  }

  async testDeviceAuthorization() {
    try {
      console.log('📋 测试3: 设备授权流程');
      
      if (!this.provider) {
        this.logResult('设备授权流程', false, null, new Error('Provider未初始化'));
        return;
      }
      
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
      this.logResult('设备授权流程', false, null, error);
    }
  }

  async testConversation() {
    try {
      console.log('📋 测试4: 对话功能');
      
      if (!this.provider) {
        this.logResult('对话功能', false, null, new Error('Provider未初始化'));
        return;
      }
      
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
      
    } catch (error) {
      this.logResult('对话功能', false, null, error);
    }
  }

  async testErrorHandling() {
    try {
      console.log('📋 测试5: 错误处理');
      
      if (!this.provider) {
        this.logResult('错误处理测试', false, null, new Error('Provider未初始化'));
        return;
      }
      
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
      
    } catch (error) {
      this.logResult('错误处理测试', false, null, error);
    }
  }

  async testCompatibilityTransformation() {
    try {
      console.log('📋 测试6: 兼容性转换');
      
      if (!this.provider) {
        this.logResult('兼容性转换', false, null, new Error('Provider未初始化'));
        return;
      }
      
      // 检查认证状态
      const authStatus = this.provider.getAuthStatus();
      if (!authStatus.isAuthorized || authStatus.isExpired) {
        this.logResult('兼容性转换', false, { 
          message: '未授权或令牌已过期' 
        });
        return;
      }
      
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
      
    } catch (error) {
      this.logResult('兼容性转换', false, null, error);
    }
  }

  validateOpenAIResponse(response) {
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
  try {
    const QwenProviderModule = await loadQwenProviderModule();
    const validator = new QwenProviderValidator(QwenProviderModule);
    await validator.runAllTests();
  } catch (error) {
    console.error('测试启动失败:', error);
    process.exit(1);
  }
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