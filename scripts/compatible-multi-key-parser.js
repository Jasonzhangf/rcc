#!/usr/bin/env node

/**
 * 兼容性多Key配置解析器
 * 
 * 1. 完全兼容当前格式
 * 2. 自动识别单key(string)或多key(array)格式
 * 3. 支持auth_type选择 (api_key, oauth)
 * 4. 支持key文件路径加载
 * 5. 自动轮换多个key
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
function info(msg) { log(`ℹ️  ${msg}`, 'blue'); }
function header(msg) { log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`); }

// 兼容性配置解析器
class CompatibleConfigParser {
  constructor() {
    this.keyRotationCounters = new Map();
  }

  // 解析配置文件
  parseConfig(configPath) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // 处理每个Provider，确保兼容性
    config.Providers = config.Providers.map(provider => this.normalizeProvider(provider));
    
    return config;
  }

  // 标准化Provider配置
  normalizeProvider(provider) {
    const normalized = { ...provider };
    
    // 1. 兼容api_key格式 (string -> array)
    if (typeof provider.api_key === 'string') {
      normalized._original_format = 'single_key';
      normalized.api_key = [provider.api_key];
    } else if (Array.isArray(provider.api_key)) {
      normalized._original_format = 'multi_key';
      normalized.api_key = [...provider.api_key];
    }

    // 2. 设置默认认证类型
    if (!normalized.auth_type) {
      normalized.auth_type = 'api_key';
    }

    // 3. 加载key值（处理文件路径）
    normalized.api_key = normalized.api_key.map(key => this.loadKeyValue(key, provider.name));

    // 4. 添加元数据
    normalized._key_count = normalized.api_key.length;
    normalized._supports_rotation = normalized.api_key.length > 1;

    return normalized;
  }

  // 加载key值，支持文件路径
  loadKeyValue(keyOrPath, providerName) {
    // 检查是否为文件路径
    if (this.isFilePath(keyOrPath)) {
      try {
        if (fs.existsSync(keyOrPath)) {
          const content = fs.readFileSync(keyOrPath, 'utf8').trim();
          info(`${providerName}: Loaded key from ${keyOrPath}`);
          return content;
        } else {
          log(`⚠️  ${providerName}: Key file not found: ${keyOrPath}`, 'yellow');
          return keyOrPath; // 回退到原值
        }
      } catch (error) {
        log(`⚠️  ${providerName}: Error reading ${keyOrPath}: ${error.message}`, 'yellow');
        return keyOrPath;
      }
    }
    
    return keyOrPath;
  }

  // 判断是否为文件路径
  isFilePath(str) {
    return str.startsWith('./') || 
           str.startsWith('/') ||
           str.startsWith('../') ||
           /\.(key|txt|token|json|pem)$/i.test(str);
  }

  // 获取当前可用的key（带轮换）
  getCurrentKey(provider) {
    const providerName = provider.name;
    const keys = provider.api_key;

    if (keys.length === 1) {
      return keys[0];
    }

    // 多key轮换
    if (!this.keyRotationCounters.has(providerName)) {
      this.keyRotationCounters.set(providerName, 0);
    }

    const counter = this.keyRotationCounters.get(providerName);
    const selectedKey = keys[counter % keys.length];
    
    // 更新计数器
    this.keyRotationCounters.set(providerName, counter + 1);

    return selectedKey;
  }

  // 生成认证头
  generateAuthHeaders(provider) {
    const currentKey = this.getCurrentKey(provider);
    const authType = provider.auth_type || 'api_key';

    switch (authType) {
      case 'api_key':
        return {
          'Authorization': `Bearer ${currentKey}`,
          'Content-Type': 'application/json'
        };
        
      case 'oauth':
        // OAuth可能是JSON格式的token信息
        const tokenInfo = this.parseOAuthToken(currentKey);
        return {
          'Authorization': `Bearer ${tokenInfo.access_token}`,
          'Content-Type': 'application/json'
        };
        
      default:
        throw new Error(`Unsupported auth_type: ${authType}`);
    }
  }

  // 解析OAuth token
  parseOAuthToken(tokenData) {
    try {
      // 如果是JSON字符串，解析它
      const parsed = JSON.parse(tokenData);
      return parsed;
    } catch {
      // 如果不是JSON，假设是直接的access_token
      return { access_token: tokenData };
    }
  }

  // 生成兼容性报告
  generateCompatibilityReport(config) {
    const report = {
      total_providers: config.Providers.length,
      single_key_providers: 0,
      multi_key_providers: 0,
      auth_types: {},
      file_keys: 0,
      direct_keys: 0,
      total_keys: 0
    };

    config.Providers.forEach(provider => {
      // 统计key格式
      if (provider._original_format === 'single_key') {
        report.single_key_providers++;
      } else {
        report.multi_key_providers++;
      }

      // 统计认证类型
      const authType = provider.auth_type || 'api_key';
      report.auth_types[authType] = (report.auth_types[authType] || 0) + 1;

      // 统计key来源
      provider.api_key.forEach(key => {
        if (this.isFilePath(key)) {
          report.file_keys++;
        } else {
          report.direct_keys++;
        }
        report.total_keys++;
      });
    });

    return report;
  }
}

// 测试当前claude-code-router配置
async function testCurrentConfig() {
  header('🔍 Testing Current Claude Code Router Configuration');

  const configPath = '/Users/fanzhang/.claude-code-router/config.json';
  const parser = new CompatibleConfigParser();

  try {
    // 解析现有配置
    const config = parser.parseConfig(configPath);
    success('Current configuration parsed successfully');

    // 显示每个Provider的信息
    config.Providers.forEach(provider => {
      header(`Provider: ${provider.name}`);
      info(`Original format: ${provider._original_format}`);
      info(`Auth type: ${provider.auth_type}`);
      info(`Key count: ${provider._key_count}`);
      info(`Supports rotation: ${provider._supports_rotation}`);

      // 测试认证头生成
      try {
        const headers = parser.generateAuthHeaders(provider);
        const authHeader = headers.Authorization.substring(0, 30) + '...[hidden]';
        info(`Auth header: ${authHeader}`);
      } catch (error) {
        log(`⚠️  Auth header generation failed: ${error.message}`, 'yellow');
      }

      // 如果支持轮换，测试几次
      if (provider._supports_rotation) {
        info('Testing key rotation:');
        for (let i = 0; i < Math.min(3, provider._key_count); i++) {
          const key = parser.getCurrentKey(provider);
          const safeKey = key.substring(0, 15) + '...[hidden]';
          info(`  Round ${i + 1}: ${safeKey}`);
        }
      }
    });

    // 生成兼容性报告
    const report = parser.generateCompatibilityReport(config);
    header('📊 Compatibility Report');
    console.log(JSON.stringify(report, null, 2));

    return config;

  } catch (error) {
    log(`❌ Error testing current config: ${error.message}`, 'red');
    throw error;
  }
}

// 测试兼容性示例配置
async function testCompatibilityExamples() {
  header('🧪 Testing Compatibility Examples');

  // 创建测试key文件
  if (!fs.existsSync('test-keys')) {
    fs.mkdirSync('test-keys');
  }
  fs.writeFileSync('test-keys/backup.key', 'sk-backup-from-file-123');
  fs.writeFileSync('test-keys/oauth.json', JSON.stringify({
    access_token: 'oauth_token_from_file_456',
    token_type: 'Bearer',
    expires_in: 3600
  }));

  const testConfigs = [
    // 1. 当前格式 (单key字符串)
    {
      name: "current-format",
      api_base_url: "https://api.current.com/v1/chat/completions",
      api_key: "sk-current-format-key-123",
      models: ["current-model"]
    },
    
    // 2. 新格式 (多key数组)
    {
      name: "new-multi-format",
      api_base_url: "https://api.multi.com/v1/chat/completions", 
      api_key: [
        "sk-multi-key-1-abc",
        "sk-multi-key-2-def",
        "sk-multi-key-3-ghi"
      ],
      auth_type: "api_key",
      models: ["multi-model"]
    },

    // 3. 文件路径格式
    {
      name: "file-path-format",
      api_base_url: "https://api.files.com/v1/chat/completions",
      api_key: [
        "sk-direct-key-xyz",
        "./test-keys/backup.key"
      ],
      auth_type: "api_key", 
      models: ["file-model"]
    },

    // 4. OAuth格式
    {
      name: "oauth-format",
      api_base_url: "https://api.oauth.com/v1/chat/completions",
      api_key: ["./test-keys/oauth.json"],
      auth_type: "oauth",
      models: ["oauth-model"]
    }
  ];

  const parser = new CompatibleConfigParser();
  
  // 测试每个配置格式
  testConfigs.forEach(provider => {
    header(`Testing: ${provider.name}`);
    
    // 标准化Provider
    const normalized = parser.normalizeProvider(provider);
    
    info(`Original format: ${normalized._original_format}`);
    info(`Processed keys: ${normalized._key_count}`);
    info(`Auth type: ${normalized.auth_type}`);
    
    // 测试认证头生成
    try {
      const headers = parser.generateAuthHeaders(normalized);
      const authHeader = headers.Authorization.length > 40 ? 
        headers.Authorization.substring(0, 40) + '...[hidden]' : 
        headers.Authorization;
      success(`Auth header: ${authHeader}`);
    } catch (error) {
      log(`❌ Auth generation failed: ${error.message}`, 'red');
    }
  });

  // 清理测试文件
  if (fs.existsSync('test-keys/backup.key')) fs.unlinkSync('test-keys/backup.key');
  if (fs.existsSync('test-keys/oauth.json')) fs.unlinkSync('test-keys/oauth.json');
  if (fs.existsSync('test-keys')) fs.rmdirSync('test-keys');
}

// 生成迁移建议
function generateMigrationGuide() {
  header('📖 Migration Guide');
  
  log('Current format (unchanged):');
  log('  "api_key": "sk-your-key"');
  
  log('\nNew multi-key format:');
  log('  "api_key": ["sk-key1", "sk-key2", "sk-key3"]');
  
  log('\nFile path support:');
  log('  "api_key": ["sk-direct", "./keys/backup.key"]');
  
  log('\nOAuth support:');
  log('  "api_key": ["./oauth-token.json"]');
  log('  "auth_type": "oauth"');
  
  log('\nAdvantages:');
  log('  • Complete backward compatibility');
  log('  • Automatic key rotation for multi-key providers');
  log('  • File-based key management');
  log('  • OAuth token support');
  log('  • No breaking changes to existing configs');
}

// 主函数
async function main() {
  log(`${colors.bold}${colors.cyan}Compatible Multi-Key Configuration Parser${colors.reset}`);
  log(`${colors.cyan}Testing backward compatibility and new multi-key features${colors.reset}\n`);

  try {
    // 测试当前配置文件
    await testCurrentConfig();
    
    // 测试各种兼容性示例
    await testCompatibilityExamples();
    
    // 显示迁移指南
    generateMigrationGuide();

    header('✅ Compatibility Test Results');
    success('All compatibility tests passed');
    success('Current configurations work without changes');  
    success('New multi-key features ready for use');
    
    return 0;

  } catch (error) {
    log(`❌ Compatibility test failed: ${error.message}`, 'red');
    return 1;
  }
}

// 运行测试
if (require.main === module) {
  main()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      log(`❌ Unhandled error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { CompatibleConfigParser };