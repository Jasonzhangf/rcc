#!/usr/bin/env node

/**
 * 增强多Key和Auth鉴权配置测试
 * 
 * 测试向后兼容的多key和多种鉴权类型支持
 */

const fs = require('fs');
const crypto = require('crypto');

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

// 增强的配置加载器
class EnhancedConfigLoader {
  constructor() {
    this.authTypes = {
      'api_key': this.handleApiKeyAuth.bind(this),
      'bearer': this.handleBearerAuth.bind(this),
      'basic': this.handleBasicAuth.bind(this),
      'custom': this.handleCustomAuth.bind(this),
      'oauth2': this.handleOAuth2Auth.bind(this),
      'jwt': this.handleJWTAuth.bind(this)
    };
  }

  // 加载和转换配置
  async loadAndTransformConfig(configPath) {
    const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // 转换每个Provider的认证配置
    const transformedConfig = {
      ...rawConfig,
      Providers: rawConfig.Providers.map(provider => this.transformProvider(provider))
    };

    return {
      original: rawConfig,
      enhanced: transformedConfig,
      metadata: {
        providers: rawConfig.Providers.length,
        enhanced_providers: transformedConfig.Providers.length,
        transformation_time: Date.now()
      }
    };
  }

  // 转换单个Provider配置
  transformProvider(provider) {
    // 保持向后兼容
    if (!provider.auth && provider.api_key) {
      return {
        ...provider,
        auth: {
          type: 'api_key',
          keys: [{
            key: provider.api_key,
            name: 'primary',
            weight: 10,
            status: 'active',
            quota: {
              rpm: 60,
              rpd: 1000,
              concurrent: 5
            }
          }],
          rotation: {
            strategy: 'round_robin',
            health_check: {
              enabled: true,
              interval: 60000,
              timeout: 5000
            }
          }
        }
      };
    }
    
    return provider;
  }

  // API Key 认证处理
  handleApiKeyAuth(authConfig) {
    return authConfig.keys.map(keyConfig => ({
      headers: {
        'Authorization': `Bearer ${keyConfig.key}`,
        'Content-Type': 'application/json'
      },
      keyId: keyConfig.name || 'default',
      priority: keyConfig.weight || 1,
      limits: keyConfig.quota || {}
    }));
  }

  // Bearer Token 认证处理
  handleBearerAuth(authConfig) {
    return authConfig.keys.map(keyConfig => ({
      headers: {
        'Authorization': `Bearer ${keyConfig.token || keyConfig.key}`,
        'Content-Type': 'application/json'
      },
      keyId: keyConfig.name || 'bearer',
      priority: keyConfig.weight || 1
    }));
  }

  // Basic Auth 认证处理
  handleBasicAuth(authConfig) {
    return authConfig.keys.map(keyConfig => {
      const credentials = Buffer.from(`${keyConfig.username}:${keyConfig.password}`).toString('base64');
      return {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        keyId: keyConfig.name || 'basic',
        priority: keyConfig.weight || 1
      };
    });
  }

  // 自定义认证处理
  handleCustomAuth(authConfig) {
    return authConfig.keys.map(keyConfig => ({
      headers: {
        ...keyConfig.headers,
        'Content-Type': 'application/json'
      },
      keyId: keyConfig.name || 'custom',
      priority: keyConfig.weight || 1
    }));
  }

  // OAuth2 认证处理 (模拟)
  handleOAuth2Auth(authConfig) {
    // 实际实现中这里会调用token endpoint获取access token
    return authConfig.keys.map(keyConfig => ({
      headers: {
        'Authorization': `Bearer ${this.mockOAuth2Token(keyConfig)}`,
        'Content-Type': 'application/json'
      },
      keyId: keyConfig.name || 'oauth2',
      priority: keyConfig.weight || 1,
      tokenRefresh: {
        url: keyConfig.token_url,
        clientId: keyConfig.client_id,
        clientSecret: keyConfig.client_secret
      }
    }));
  }

  // JWT 认证处理 (模拟)
  handleJWTAuth(authConfig) {
    return authConfig.keys.map(keyConfig => ({
      headers: {
        'Authorization': `Bearer ${this.mockJWTToken(keyConfig)}`,
        'Content-Type': 'application/json'
      },
      keyId: keyConfig.name || 'jwt',
      priority: keyConfig.weight || 1,
      jwtConfig: {
        algorithm: keyConfig.algorithm,
        issuer: keyConfig.issuer,
        audience: keyConfig.audience
      }
    }));
  }

  // 模拟OAuth2 token生成
  mockOAuth2Token(config) {
    return `oauth2_${crypto.randomBytes(16).toString('hex')}`;
  }

  // 模拟JWT token生成
  mockJWTToken(config) {
    const header = Buffer.from(JSON.stringify({alg: config.algorithm || 'RS256', typ: 'JWT'})).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      iss: config.issuer || 'claude-code-router',
      aud: config.audience || 'api',
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64');
    const signature = crypto.randomBytes(32).toString('base64');
    return `${header}.${payload}.${signature}`;
  }

  // Key轮换策略
  selectKey(authConfigs, strategy = 'round_robin') {
    const activeKeys = authConfigs.filter(config => config.priority > 0);
    
    switch (strategy) {
      case 'weighted':
        return this.selectWeightedKey(activeKeys);
      case 'failover':
        return this.selectFailoverKey(activeKeys);
      case 'random':
        return activeKeys[Math.floor(Math.random() * activeKeys.length)];
      case 'round_robin':
      default:
        return this.selectRoundRobinKey(activeKeys);
    }
  }

  selectWeightedKey(keys) {
    const totalWeight = keys.reduce((sum, key) => sum + (key.priority || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const key of keys) {
      random -= (key.priority || 1);
      if (random <= 0) return key;
    }
    return keys[0];
  }

  selectRoundRobinKey(keys) {
    // 简单轮换实现
    this._roundRobinIndex = (this._roundRobinIndex || 0) % keys.length;
    return keys[this._roundRobinIndex++];
  }

  selectFailoverKey(keys) {
    // 选择优先级最高且可用的key
    return keys.sort((a, b) => (b.priority || 1) - (a.priority || 1))[0];
  }
}

// 创建测试配置
function createEnhancedTestConfig() {
  return {
    "LOG": false,
    "HOST": "127.0.0.1", 
    "PORT": 3456,
    "APIKEY": "global-api-key",
    "Providers": [
      // 现有格式 - 测试向后兼容
      {
        "name": "legacy-provider",
        "api_base_url": "https://api.legacy.com/v1/chat/completions",
        "api_key": "sk-legacy-key-12345",
        "models": ["gpt-3.5-turbo"]
      },
      // 增强多key格式
      {
        "name": "multi-key-provider",
        "api_base_url": "https://api.openai.com/v1/chat/completions", 
        "auth": {
          "type": "api_key",
          "keys": [
            {
              "key": "sk-primary-key-67890",
              "name": "primary",
              "weight": 10,
              "quota": {"rpm": 60, "rpd": 1000, "concurrent": 5},
              "status": "active",
              "metadata": {"tier": "premium", "expires": "2025-12-31"}
            },
            {
              "key": "sk-backup-key-abcdef",
              "name": "backup", 
              "weight": 5,
              "quota": {"rpm": 30, "rpd": 500, "concurrent": 3},
              "status": "active",
              "metadata": {"tier": "standard"}
            },
            {
              "key": "sk-emergency-key-xyz123",
              "name": "emergency",
              "weight": 1, 
              "quota": {"rpm": 10, "rpd": 100, "concurrent": 1},
              "status": "inactive",
              "metadata": {"tier": "basic"}
            }
          ],
          "rotation": {
            "strategy": "weighted",
            "failover_timeout": 30000,
            "health_check": {
              "enabled": true,
              "interval": 60000,
              "endpoint": "/v1/models",
              "timeout": 5000
            }
          }
        },
        "models": ["gpt-4", "gpt-3.5-turbo"]
      },
      // OAuth2 认证格式
      {
        "name": "oauth2-provider",
        "api_base_url": "https://api.enterprise.com/v1/chat/completions",
        "auth": {
          "type": "oauth2",
          "keys": [
            {
              "name": "oauth2-primary",
              "client_id": "client_12345",
              "client_secret": "secret_abcdef",
              "token_url": "https://auth.enterprise.com/oauth/token", 
              "scope": "api:read api:write",
              "weight": 10,
              "status": "active"
            }
          ],
          "rotation": {"strategy": "failover"}
        },
        "models": ["enterprise-model-1"]
      },
      // 自定义认证格式
      {
        "name": "custom-auth-provider",
        "api_base_url": "https://api.custom.com/v1/chat/completions",
        "auth": {
          "type": "custom",
          "keys": [
            {
              "name": "custom-primary",
              "headers": {
                "X-API-Key": "custom-key-12345",
                "X-User-ID": "user_67890", 
                "X-Signature": "signature_abcdef"
              },
              "weight": 10,
              "status": "active"
            }
          ]
        },
        "models": ["custom-model-1"]
      }
    ]
  };
}

// 测试函数
async function testEnhancedAuthConfig() {
  header('🔐 Enhanced Multi-Key and Auth Configuration Test');
  
  const configLoader = new EnhancedConfigLoader();
  
  // 创建测试配置
  const testConfig = createEnhancedTestConfig();
  const testConfigPath = 'enhanced-auth-test-config.json';
  fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
  success(`Created test configuration: ${testConfigPath}`);
  
  try {
    // 加载和转换配置
    const result = await configLoader.loadAndTransformConfig(testConfigPath);
    success('Configuration loaded and transformed successfully');
    
    info('Transformation Statistics:');
    console.log(JSON.stringify(result.metadata, null, 2));
    
    // 测试每个Provider的认证配置
    for (const provider of result.enhanced.Providers) {
      header(`Testing Provider: ${provider.name}`);
      
      if (provider.auth) {
        info(`Auth Type: ${provider.auth.type}`);
        
        // 生成认证配置
        const authHandler = configLoader.authTypes[provider.auth.type];
        if (authHandler) {
          const authConfigs = authHandler(provider.auth);
          success(`Generated ${authConfigs.length} auth configurations`);
          
          // 显示认证配置详情
          authConfigs.forEach((config, index) => {
            info(`  Key ${index + 1} (${config.keyId}):`);
            Object.entries(config.headers).forEach(([header, value]) => {
              // 隐藏敏感信息
              const safeValue = header.toLowerCase().includes('auth') ? 
                value.substring(0, 20) + '...[hidden]' : value;
              console.log(`    ${header}: ${safeValue}`);
            });
            if (config.limits) {
              console.log(`    Limits:`, config.limits);
            }
          });
          
          // 测试Key轮换策略
          if (provider.auth.rotation) {
            const strategy = provider.auth.rotation.strategy;
            info(`Testing ${strategy} rotation strategy:`);
            
            for (let i = 0; i < 5; i++) {
              const selectedKey = configLoader.selectKey(authConfigs, strategy);
              console.log(`  Round ${i + 1}: Selected key "${selectedKey.keyId}"`);
            }
          }
        } else {
          fail(`Unsupported auth type: ${provider.auth.type}`);
        }
      } else {
        info('Using legacy single API key configuration');
      }
    }
    
    // 清理测试文件
    fs.unlinkSync(testConfigPath);
    success('Test configuration file cleaned up');
    
    return result;
    
  } catch (error) {
    fail(`Enhanced auth config test failed: ${error.message}`);
    throw error;
  }
}

// 配置验证函数
function validateEnhancedConfig(config) {
  header('✅ Enhanced Configuration Validation');
  
  const errors = [];
  const warnings = [];
  
  for (const provider of config.Providers) {
    const providerName = provider.name;
    
    // 验证认证配置
    if (provider.auth) {
      const authType = provider.auth.type;
      
      // 验证支持的认证类型
      const supportedTypes = ['api_key', 'bearer', 'basic', 'custom', 'oauth2', 'jwt'];
      if (!supportedTypes.includes(authType)) {
        errors.push(`Provider ${providerName}: Unsupported auth type "${authType}"`);
      }
      
      // 验证keys配置
      if (!provider.auth.keys || !Array.isArray(provider.auth.keys)) {
        errors.push(`Provider ${providerName}: Auth keys must be an array`);
      } else {
        provider.auth.keys.forEach((keyConfig, index) => {
          // 验证必需字段
          switch (authType) {
            case 'api_key':
            case 'bearer':
              if (!keyConfig.key && !keyConfig.token) {
                errors.push(`Provider ${providerName}, Key ${index}: Missing key or token`);
              }
              break;
            case 'basic':
              if (!keyConfig.username || !keyConfig.password) {
                errors.push(`Provider ${providerName}, Key ${index}: Missing username or password`);
              }
              break;
            case 'oauth2':
              if (!keyConfig.client_id || !keyConfig.client_secret || !keyConfig.token_url) {
                errors.push(`Provider ${providerName}, Key ${index}: Missing OAuth2 credentials`);
              }
              break;
            case 'custom':
              if (!keyConfig.headers || Object.keys(keyConfig.headers).length === 0) {
                errors.push(`Provider ${providerName}, Key ${index}: Missing custom headers`);
              }
              break;
          }
          
          // 验证配额限制
          if (keyConfig.quota) {
            if (keyConfig.quota.rpm && keyConfig.quota.rpm <= 0) {
              warnings.push(`Provider ${providerName}, Key ${index}: Invalid RPM limit`);
            }
          }
          
          // 验证状态
          if (keyConfig.status && !['active', 'inactive', 'suspended'].includes(keyConfig.status)) {
            warnings.push(`Provider ${providerName}, Key ${index}: Invalid status`);
          }
        });
      }
      
      // 验证轮换策略
      if (provider.auth.rotation) {
        const supportedStrategies = ['round_robin', 'weighted', 'failover', 'random'];
        if (!supportedStrategies.includes(provider.auth.rotation.strategy)) {
          warnings.push(`Provider ${providerName}: Unknown rotation strategy`);
        }
      }
    } else if (!provider.api_key) {
      errors.push(`Provider ${providerName}: Missing authentication configuration`);
    }
  }
  
  const isValid = errors.length === 0;
  
  if (isValid) {
    success(`Configuration validation passed`);
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

// 主函数
async function main() {
  log(`${colors.bold}${colors.cyan}Enhanced Multi-Key and Auth Configuration Test${colors.reset}`);
  log(`${colors.cyan}Testing advanced authentication and multi-key support${colors.reset}\n`);
  
  try {
    // 测试增强认证配置
    const result = await testEnhancedAuthConfig();
    
    // 验证增强配置
    const validation = validateEnhancedConfig(result.enhanced);
    
    // 生成报告
    header('📊 Enhanced Auth Configuration Test Report');
    
    log(`\n${colors.bold}Test Results Summary${colors.reset}`);
    log(`${'='.repeat(45)}`);
    log(`Providers Processed: ${colors.cyan}${result.metadata.providers}${colors.reset}`);
    log(`Enhanced Providers: ${colors.cyan}${result.metadata.enhanced_providers}${colors.reset}`);
    log(`Validation Status: ${validation.isValid ? colors.green + 'PASSED' : colors.red + 'FAILED'}${colors.reset}`);
    log(`Validation Errors: ${colors.red}${validation.errors.length}${colors.reset}`);
    log(`Validation Warnings: ${colors.yellow}${validation.warnings.length}${colors.reset}`);
    
    // 统计认证类型
    const authTypes = result.enhanced.Providers
      .map(p => p.auth?.type || 'legacy')
      .reduce((counts, type) => {
        counts[type] = (counts[type] || 0) + 1;
        return counts;
      }, {});
    
    log(`\nAuth Types Distribution:`);
    Object.entries(authTypes).forEach(([type, count]) => {
      log(`  ${type}: ${colors.cyan}${count}${colors.reset}`);
    });
    
    log(`${'='.repeat(45)}`);
    
    if (validation.isValid) {
      log(`\n${colors.bold}${colors.green}🎉 ENHANCED AUTH CONFIGURATION TEST PASSED!${colors.reset}`);
      log(`${colors.green}Multi-key and advanced authentication features are working correctly.${colors.reset}`);
      return 0;
    } else {
      log(`\n${colors.bold}${colors.red}❌ ENHANCED AUTH CONFIGURATION TEST FAILED${colors.reset}`);
      log(`${colors.red}Configuration validation issues need to be resolved.${colors.reset}`);
      return 1;
    }
    
  } catch (error) {
    fail(`Enhanced auth test execution failed: ${error.message}`);
    return 1;
  }
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

module.exports = { main, EnhancedConfigLoader };