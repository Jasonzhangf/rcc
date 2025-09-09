#!/usr/bin/env node

/**
 * API Key 测试功能验证脚本
 * 测试真实API调用和模型获取功能
 */

const https = require('https');
const http = require('http');

// 测试配置
const TEST_CONFIG = {
  openai: {
    protocol: 'openai',
    api_base_url: 'https://api.openai.com/v1',
    test_key: 'sk-test-key-here', // 替换为真实的API key
    expected_models: ['gpt-4', 'gpt-3.5-turbo']
  },
  anthropic: {
    protocol: 'anthropic', 
    api_base_url: 'https://api.anthropic.com/v1',
    test_key: 'sk-ant-test-key-here', // 替换为真实的API key
    expected_models: ['claude-3']
  },
  gemini: {
    protocol: 'gemini',
    api_base_url: 'https://generativelanguage.googleapis.com/v1beta',
    test_key: 'test-key-here', // 替换为真实的API key
    expected_models: ['gemini-pro']
  }
};

// 颜色输出
const colors = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', white: '\x1b[37m',
  reset: '\x1b[0m', bold: '\x1b[1m'
};

function log(msg, color = 'white') { 
  console.log(`${colors[color]}${msg}${colors.reset}`); 
}

function success(msg) { log(`✅ ${msg}`, 'green'); }
function error(msg) { log(`❌ ${msg}`, 'red'); }
function info(msg) { log(`ℹ️  ${msg}`, 'blue'); }
function header(msg) { log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`); }

// HTTP请求函数
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const isHttps = options.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const req = client.request({
      ...options,
      timeout: 10000,
      rejectUnauthorized: false
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            data: parsedData,
            rawData: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: {},
            rawData: data,
            parseError: e.message
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

// 测试OpenAI协议
async function testOpenAI(config) {
  header('Testing OpenAI Protocol');
  
  try {
    const options = {
      protocol: 'https:',
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/models',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.test_key}`,
        'User-Agent': 'RCC-Multi-Key-Manager/1.0'
      }
    };
    
    info('Sending request to OpenAI API...');
    const result = await makeRequest(options);
    
    if (result.statusCode === 200 && result.data.data) {
      const models = result.data.data.map(model => model.id);
      success(`OpenAI API响应成功 - 找到 ${models.length} 个模型`);
      info(`前5个模型: ${models.slice(0, 5).join(', ')}`);
      return { success: true, models: models };
    } else if (result.statusCode === 401) {
      error('OpenAI API key 无效或已过期');
      return { success: false, error: 'Invalid API key' };
    } else {
      error(`OpenAI API 错误: HTTP ${result.statusCode}`);
      info(`响应: ${result.rawData}`);
      return { success: false, error: `HTTP ${result.statusCode}` };
    }
  } catch (err) {
    error(`OpenAI 连接失败: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// 测试Anthropic协议
async function testAnthropic(config) {
  header('Testing Anthropic Protocol');
  
  try {
    const options = {
      protocol: 'https:',
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': config.test_key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        'User-Agent': 'RCC-Multi-Key-Manager/1.0'
      }
    };
    
    const body = JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: 'test'
      }]
    });
    
    info('Sending request to Anthropic API...');
    const result = await makeRequest(options, body);
    
    if (result.statusCode === 200 && result.data.content) {
      success('Anthropic API响应成功');
      info(`响应内容: ${JSON.stringify(result.data.content[0])}`);
      return { success: true, models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'] };
    } else if (result.statusCode === 401) {
      error('Anthropic API key 无效或已过期');
      return { success: false, error: 'Invalid API key' };
    } else {
      error(`Anthropic API 错误: HTTP ${result.statusCode}`);
      info(`响应: ${result.rawData}`);
      return { success: false, error: `HTTP ${result.statusCode}` };
    }
  } catch (err) {
    error(`Anthropic 连接失败: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// 测试Gemini协议
async function testGemini(config) {
  header('Testing Gemini Protocol');
  
  try {
    const options = {
      protocol: 'https:',
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models?key=${encodeURIComponent(config.test_key)}`,
      method: 'GET',
      headers: {
        'User-Agent': 'RCC-Multi-Key-Manager/1.0'
      }
    };
    
    info('Sending request to Gemini API...');
    const result = await makeRequest(options);
    
    if (result.statusCode === 200 && result.data.models) {
      const models = result.data.models.map(model => model.name);
      success(`Gemini API响应成功 - 找到 ${models.length} 个模型`);
      info(`前5个模型: ${models.slice(0, 5).join(', ')}`);
      return { success: true, models: models };
    } else if (result.statusCode === 403 || result.statusCode === 401) {
      error('Gemini API key 无效或已过期');
      return { success: false, error: 'Invalid API key' };
    } else {
      error(`Gemini API 错误: HTTP ${result.statusCode}`);
      info(`响应: ${result.rawData}`);
      return { success: false, error: `HTTP ${result.statusCode}` };
    }
  } catch (err) {
    error(`Gemini 连接失败: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// 测试本地服务器API
async function testLocalServer() {
  header('Testing Local Multi-Key Server API');
  
  try {
    const options = {
      protocol: 'http:',
      hostname: 'localhost',
      port: 3456,
      path: '/api/providers',
      method: 'GET'
    };
    
    info('检查本地服务器是否运行...');
    const result = await makeRequest(options);
    
    if (result.statusCode === 200) {
      success('本地服务器响应正常');
      const providers = result.data.data || [];
      info(`找到 ${providers.length} 个providers`);
      
      // 测试每个provider的测试功能
      for (const provider of providers) {
        info(`测试 provider: ${provider.name}`);
        
        const testOptions = {
          protocol: 'http:',
          hostname: 'localhost',
          port: 3456,
          path: `/api/providers/${encodeURIComponent(provider.name)}/test`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        
        const testBody = JSON.stringify({ testAllKeys: true });
        
        try {
          const testResult = await makeRequest(testOptions, testBody);
          if (testResult.statusCode === 200) {
            success(`Provider ${provider.name} 测试端点工作正常`);
          } else {
            error(`Provider ${provider.name} 测试失败: HTTP ${testResult.statusCode}`);
          }
        } catch (testErr) {
          error(`Provider ${provider.name} 测试错误: ${testErr.message}`);
        }
      }
      
      return { success: true, providers: providers };
    } else {
      error(`本地服务器错误: HTTP ${result.statusCode}`);
      return { success: false, error: `HTTP ${result.statusCode}` };
    }
  } catch (err) {
    error(`本地服务器连接失败: ${err.message}`);
    info('请确保运行: node scripts/start-multi-key-ui.js');
    return { success: false, error: err.message };
  }
}

// 主测试函数
async function runTests() {
  header('🧪 API Key 功能测试套件');
  
  const results = {
    openai: null,
    anthropic: null,
    gemini: null,
    localServer: null
  };
  
  // 提示用户配置API keys
  log('\n⚠️  注意: 请在脚本顶部配置真实的API keys才能进行完整测试', 'yellow');
  log('   当前使用测试keys，将会显示认证失败（这是正常的）', 'yellow');
  
  // 测试各个API
  results.openai = await testOpenAI(TEST_CONFIG.openai);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 避免请求过快
  
  results.anthropic = await testAnthropic(TEST_CONFIG.anthropic);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.gemini = await testGemini(TEST_CONFIG.gemini);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试本地服务器
  results.localServer = await testLocalServer();
  
  // 显示总结
  header('📊 测试结果总结');
  
  Object.entries(results).forEach(([service, result]) => {
    if (result) {
      if (result.success) {
        success(`${service.toUpperCase()}: ✅ 成功`);
        if (result.models) {
          info(`  - 模型数量: ${result.models.length}`);
        }
        if (result.providers) {
          info(`  - Providers数量: ${result.providers.length}`);
        }
      } else {
        error(`${service.toUpperCase()}: ❌ 失败 (${result.error})`);
      }
    } else {
      error(`${service.toUpperCase()}: ❌ 未测试`);
    }
  });
  
  // 功能验证指南
  header('🔍 手动测试指南');
  log('1. 启动UI服务器:', 'cyan');
  log('   node scripts/start-multi-key-ui.js', 'white');
  log('');
  log('2. 打开浏览器访问:', 'cyan');
  log('   http://localhost:3456', 'white');
  log('');
  log('3. 测试功能:', 'cyan');
  log('   • 添加真实的API keys到providers', 'white');
  log('   • 点击"Test Provider"按钮测试连接', 'white');
  log('   • 点击"Get Models"按钮获取模型列表', 'white');
  log('   • 在Router Table标签页查看默认路由规则', 'white');
  log('');
  log('4. 验证要点:', 'cyan');
  log('   • API key测试应该返回真实的状态码和响应时间', 'white');
  log('   • 成功的测试应该显示找到的模型数量', 'white');
  log('   • Get Models功能应该更新provider的模型列表', 'white');
  log('   • Router Table应该显示默认的gpt-4*, claude-*, gemini-*规则', 'white');
  
  log('\n🎉 测试完成！', 'green');
}

// 运行测试
if (require.main === module) {
  runTests().catch(err => {
    error(`测试运行失败: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runTests };