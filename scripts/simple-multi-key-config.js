#!/usr/bin/env node

/**
 * 简化多Key配置方案
 * 
 * 1. api_key 改为数组支持多key
 * 2. 增加 auth_type 选择 (api_key, oauth)  
 * 3. key 可以是直接值或文件路径
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', white: '\x1b[37m',
  reset: '\x1b[0m', bold: '\x1b[1m'
};

function log(msg, color = 'white') { console.log(`${colors[color]}${msg}${colors.reset}`); }
function success(msg) { log(`✅ ${msg}`, 'green'); }
function fail(msg) { log(`❌ ${msg}`, 'red'); }
function info(msg) { log(`ℹ️  ${msg}`, 'blue'); }
function header(msg) { log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`); }

// 简化的配置加载器
class SimpleMultiKeyLoader {
  constructor() {
    this.keyRotationIndex = new Map(); // 轮换索引
  }

  // 加载配置文件
  loadConfig(configPath) {
    const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // 处理每个Provider的多key配置
    const processedProviders = rawConfig.Providers.map(provider => {
      return this.processProvider(provider);
    });

    return {
      ...rawConfig,
      Providers: processedProviders
    };
  }

  // 处理单个Provider
  processProvider(provider) {
    // 向后兼容：如果是字符串，转换为数组
    if (typeof provider.api_key === 'string') {
      provider.api_key = [provider.api_key];
    }

    // 确保api_key是数组
    if (!Array.isArray(provider.api_key)) {
      throw new Error(`Provider ${provider.name}: api_key must be string or array`);
    }

    // 加载key值（支持文件路径）
    provider.api_key = provider.api_key.map(key => this.loadKeyValue(key));

    // 设置默认认证类型
    if (!provider.auth_type) {
      provider.auth_type = 'api_key';
    }

    return provider;
  }

  // 加载key值，支持文件路径
  loadKeyValue(keyOrPath) {
    // 如果是文件路径（以./或/开头，或包含.txt/.key等扩展名）
    if (this.isFilePath(keyOrPath)) {
      try {
        if (fs.existsSync(keyOrPath)) {
          const content = fs.readFileSync(keyOrPath, 'utf8').trim();
          info(`Loaded key from file: ${keyOrPath}`);
          return content;
        } else {
          fail(`Key file not found: ${keyOrPath}`);
          return keyOrPath; // 回退到原始值
        }
      } catch (error) {
        fail(`Error loading key file ${keyOrPath}: ${error.message}`);
        return keyOrPath;
      }
    }
    
    // 直接返回key值
    return keyOrPath;
  }

  // 判断是否为文件路径
  isFilePath(str) {
    return str.startsWith('./') || 
           str.startsWith('/') || 
           str.includes('.txt') || 
           str.includes('.key') || 
           str.includes('.token') ||
           str.includes('.json');
  }

  // 获取认证头
  getAuthHeaders(provider) {
    const authType = provider.auth_type || 'api_key';
    const keys = provider.api_key || [];
    
    if (keys.length === 0) {
      throw new Error(`Provider ${provider.name}: No API keys configured`);
    }

    // 轮换选择key
    const selectedKey = this.rotateKey(provider.name, keys);
    
    switch (authType) {
      case 'api_key':
        return {
          'Authorization': `Bearer ${selectedKey}`,
          'Content-Type': 'application/json'
        };
      
      case 'oauth':
        // OAuth需要从文件加载token信息
        const oauthConfig = this.parseOAuthConfig(selectedKey);
        return {
          'Authorization': `Bearer ${oauthConfig.access_token}`,
          'Content-Type': 'application/json'
        };
        
      default:
        throw new Error(`Provider ${provider.name}: Unsupported auth_type: ${authType}`);
    }
  }

  // key轮换逻辑
  rotateKey(providerName, keys) {
    if (!this.keyRotationIndex.has(providerName)) {
      this.keyRotationIndex.set(providerName, 0);
    }
    
    const index = this.keyRotationIndex.get(providerName);
    const selectedKey = keys[index % keys.length];
    
    // 更新下次轮换索引
    this.keyRotationIndex.set(providerName, index + 1);
    
    return selectedKey;
  }

  // 解析OAuth配置
  parseOAuthConfig(configOrPath) {
    if (this.isFilePath(configOrPath)) {
      const config = JSON.parse(fs.readFileSync(configOrPath, 'utf8'));
      return config;
    }
    
    // 假设是JSON字符串
    try {
      return JSON.parse(configOrPath);
    } catch {
      // 假设是直接的token
      return { access_token: configOrPath };
    }
  }
}

// 创建测试配置
function createSimpleTestConfigs() {
  header('📁 Creating Simple Multi-Key Test Configurations');

  // 创建key文件
  const keyFiles = {
    'keys/primary.key': 'sk-primary-key-12345abcdef',
    'keys/backup.key': 'sk-backup-key-67890ghijkl',
    'keys/oauth-token.json': JSON.stringify({
      "access_token": "oauth_access_token_12345",
      "token_type": "Bearer",
      "expires_in": 3600,
      "scope": "api:read api:write"
    }, null, 2)
  };

  // 确保keys目录存在
  if (!fs.existsSync('keys')) {
    fs.mkdirSync('keys');
  }

  // 创建key文件
  Object.entries(keyFiles).forEach(([filepath, content]) => {
    fs.writeFileSync(filepath, content);
    success(`Created key file: ${filepath}`);
  });

  // 简化的测试配置
  const testConfig = {
    "LOG": false,
    "HOST": "127.0.0.1",
    "PORT": 3456,
    "APIKEY": "global-api-key",
    "Providers": [
      // 向后兼容：单个key（字符串）
      {
        "name": "single-key-provider",
        "api_base_url": "https://api.single.com/v1/chat/completions",
        "api_key": "sk-single-key-direct",
        "auth_type": "api_key",
        "models": ["model-1"]
      },
      // 多key：直接值数组
      {
        "name": "multi-key-direct",
        "api_base_url": "https://api.multi.com/v1/chat/completions", 
        "api_key": [
          "sk-direct-key1-abc123",
          "sk-direct-key2-def456", 
          "sk-direct-key3-ghi789"
        ],
        "auth_type": "api_key",
        "models": ["model-2", "model-3"]
      },
      // 多key：文件路径
      {
        "name": "multi-key-files",
        "api_base_url": "https://api.files.com/v1/chat/completions",
        "api_key": [
          "./keys/primary.key",
          "./keys/backup.key"
        ],
        "auth_type": "api_key", 
        "models": ["model-4"]
      },
      // OAuth认证
      {
        "name": "oauth-provider",
        "api_base_url": "https://api.oauth.com/v1/chat/completions",
        "api_key": [
          "./keys/oauth-token.json"
        ],
        "auth_type": "oauth",
        "models": ["oauth-model-1"]
      },
      // 混合模式：直接值 + 文件路径
      {
        "name": "hybrid-provider", 
        "api_base_url": "https://api.hybrid.com/v1/chat/completions",
        "api_key": [
          "sk-direct-hybrid-key",
          "./keys/primary.key"
        ],
        "auth_type": "api_key",
        "models": ["hybrid-model-1"]
      }
    ]
  };

  const configPath = 'simple-multi-key-config.json';
  fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
  success(`Created test configuration: ${configPath}`);

  return { configPath, keyFiles: Object.keys(keyFiles) };
}

// 测试多key配置
async function testSimpleMultiKeyConfig(configPath) {
  header('🔑 Testing Simple Multi-Key Configuration');

  const loader = new SimpleMultiKeyLoader();

  try {
    // 加载配置
    const config = loader.loadConfig(configPath);
    success('Configuration loaded successfully');

    // 测试每个Provider
    for (const provider of config.Providers) {
      header(`Testing Provider: ${provider.name}`);
      
      info(`Auth Type: ${provider.auth_type}`);
      info(`Keys Count: ${provider.api_key.length}`);
      
      // 显示处理后的key（隐藏敏感信息）
      provider.api_key.forEach((key, index) => {
        const safeKey = key.length > 20 ? key.substring(0, 20) + '...[hidden]' : key;
        info(`  Key ${index + 1}: ${safeKey}`);
      });

      // 测试轮换3次
      info('Testing key rotation:');
      for (let i = 0; i < 3; i++) {
        try {
          const headers = loader.getAuthHeaders(provider);
          const authHeader = headers['Authorization'];
          const safeAuth = authHeader.length > 30 ? 
            authHeader.substring(0, 30) + '...[hidden]' : authHeader;
          info(`  Round ${i + 1}: ${safeAuth}`);
        } catch (error) {
          fail(`  Round ${i + 1}: ${error.message}`);
        }
      }
    }

    return config;

  } catch (error) {
    fail(`Configuration test failed: ${error.message}`);
    throw error;
  }
}

// 验证配置
function validateSimpleConfig(config) {
  header('✅ Simple Multi-Key Configuration Validation');

  const errors = [];
  const warnings = [];

  for (const provider of config.Providers) {
    const providerName = provider.name;

    // 验证必需字段
    if (!provider.api_key || provider.api_key.length === 0) {
      errors.push(`Provider ${providerName}: api_key is required and cannot be empty`);
    }

    if (!provider.auth_type) {
      warnings.push(`Provider ${providerName}: auth_type not specified, defaulting to api_key`);
    } else {
      // 验证支持的认证类型
      const supportedTypes = ['api_key', 'oauth'];
      if (!supportedTypes.includes(provider.auth_type)) {
        errors.push(`Provider ${providerName}: Unsupported auth_type "${provider.auth_type}". Supported: ${supportedTypes.join(', ')}`);
      }
    }

    // 验证api_key数组
    if (Array.isArray(provider.api_key)) {
      provider.api_key.forEach((key, index) => {
        if (!key || key.trim() === '') {
          errors.push(`Provider ${providerName}: Empty key at index ${index}`);
        }
      });
    }

    // 验证URL格式
    if (provider.api_base_url && !provider.api_base_url.startsWith('http')) {
      errors.push(`Provider ${providerName}: Invalid api_base_url format`);
    }

    // 验证models
    if (!provider.models || provider.models.length === 0) {
      warnings.push(`Provider ${providerName}: No models specified`);
    }
  }

  const isValid = errors.length === 0;

  if (isValid) {
    success('Simple configuration validation passed');
  } else {
    fail(`Configuration validation failed with ${errors.length} errors`);
    errors.forEach(error => log(`  • ${error}`, 'red'));
  }

  if (warnings.length > 0) {
    info(`Configuration has ${warnings.length} warnings:`);
    warnings.forEach(warning => log(`  • ${warning}`, 'yellow'));
  }

  return { isValid, errors, warnings };
}

// 清理测试文件
function cleanupTestFiles(configPath, keyFiles) {
  header('🧹 Cleaning Up Test Files');

  // 删除配置文件
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
    success(`Removed: ${configPath}`);
  }

  // 删除key文件
  keyFiles.forEach(keyFile => {
    if (fs.existsSync(keyFile)) {
      fs.unlinkSync(keyFile);
      success(`Removed: ${keyFile}`);
    }
  });

  // 删除keys目录
  if (fs.existsSync('keys') && fs.readdirSync('keys').length === 0) {
    fs.rmdirSync('keys');
    success('Removed: keys directory');
  }
}

// 主函数
async function main() {
  log(`${colors.bold}${colors.cyan}Simple Multi-Key Configuration Test${colors.reset}`);
  log(`${colors.cyan}Testing simplified multi-key and OAuth authentication${colors.reset}\n`);

  let testFiles = null;

  try {
    // 创建测试配置
    testFiles = createSimpleTestConfigs();

    // 测试多key配置
    const config = await testSimpleMultiKeyConfig(testFiles.configPath);

    // 验证配置
    const validation = validateSimpleConfig(config);

    // 生成报告
    header('📊 Simple Multi-Key Configuration Test Report');

    log(`\n${colors.bold}Test Results Summary${colors.reset}`);
    log(`${'='.repeat(40)}`);
    log(`Total Providers: ${colors.cyan}${config.Providers.length}${colors.reset}`);
    log(`Validation Status: ${validation.isValid ? colors.green + 'PASSED' : colors.red + 'FAILED'}${colors.reset}`);
    log(`Validation Errors: ${colors.red}${validation.errors.length}${colors.reset}`);
    log(`Validation Warnings: ${colors.yellow}${validation.warnings.length}${colors.reset}`);

    // 统计key数量和认证类型
    const keyStats = config.Providers.reduce((stats, provider) => {
      stats.totalKeys += provider.api_key.length;
      stats.authTypes[provider.auth_type] = (stats.authTypes[provider.auth_type] || 0) + 1;
      if (provider.api_key.length > 1) stats.multiKeyProviders++;
      return stats;
    }, { totalKeys: 0, multiKeyProviders: 0, authTypes: {} });

    log(`\nStatistics:`);
    log(`  Total Keys: ${colors.cyan}${keyStats.totalKeys}${colors.reset}`);
    log(`  Multi-Key Providers: ${colors.cyan}${keyStats.multiKeyProviders}${colors.reset}`);
    log(`  Auth Types:`);
    Object.entries(keyStats.authTypes).forEach(([type, count]) => {
      log(`    ${type}: ${colors.cyan}${count}${colors.reset}`);
    });

    log(`${'='.repeat(40)}`);

    if (validation.isValid) {
      log(`\n${colors.bold}${colors.green}🎉 SIMPLE MULTI-KEY CONFIGURATION TEST PASSED!${colors.reset}`);
      log(`${colors.green}Simplified multi-key and OAuth authentication working correctly.${colors.reset}`);
      return 0;
    } else {
      log(`\n${colors.bold}${colors.red}❌ SIMPLE MULTI-KEY CONFIGURATION TEST FAILED${colors.reset}`);
      log(`${colors.red}Configuration validation issues need to be resolved.${colors.reset}`);
      return 1;
    }

  } catch (error) {
    fail(`Test execution failed: ${error.message}`);
    return 1;
  } finally {
    // 清理测试文件
    if (testFiles) {
      cleanupTestFiles(testFiles.configPath, testFiles.keyFiles);
    }
  }
}

// 显示使用方法
function showUsage() {
  log("Simple Multi-Key Configuration Format:");
  log("");
  log("Single Key (backward compatible):");
  log('  "api_key": "sk-your-key-here"');
  log("");
  log("Multiple Keys (array):");
  log('  "api_key": ["sk-key1", "sk-key2", "./path/to/key.txt"]');
  log("");
  log("Auth Types:");
  log('  "auth_type": "api_key"  // Default');
  log('  "auth_type": "oauth"    // OAuth token');
  log("");
  log("File Path Support:");
  log('  - Paths starting with "./" or "/"');
  log('  - Files with extensions: .key, .txt, .token, .json');
}

// 解析参数
const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  showUsage();
  process.exit(0);
}

// 运行测试
if (require.main === module) {
  main()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      fail(`Unhandled error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { main, SimpleMultiKeyLoader };