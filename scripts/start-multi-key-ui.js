#!/usr/bin/env node

/**
 * Multi-Key Configuration UI Server
 * 启动Web服务器展示多key配置管理界面
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

// Import virtual routes API handler
const { handleVirtualRoutesAPI, VirtualRoutesManager } = require('../api/virtual-routes');

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

class MultiKeyUIServer {
  constructor(port = 9999) {
    this.port = port;
    this.server = null;
    this.uiPath = path.join(__dirname, '../src/modules/Configuration/ui/multi-key-config-ui.html');
    
    // 配置文件路径设置
    this.configDir = path.join(os.homedir(), '.rcc');
    this.configPath = path.join(this.configDir, 'config.json');
    
    // 配置数据结构
    this.config = {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      providers: [],
      routes: [],
      global_config: {
        load_balancing: 'round_robin',
        rate_limiting: {
          enabled: false,
          requests_per_minute: 100
        }
      }
    };
    
    // 下一个ID计数器
    this.nextId = 1;
  }

  // 获取配置文件路径
  getConfigPath() {
    return this.configPath;
  }

  // 初始化配置目录和文件
  initializeConfig() {
    try {
      // 确保配置目录存在
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
        success(`Created config directory: ${this.configDir}`);
      }

      // 检查配置文件是否存在
      if (!fs.existsSync(this.configPath)) {
        // 创建默认配置文件
        this.createDefaultConfig();
        this.saveConfig();
        success(`Created default config file: ${this.configPath}`);
      }

      return true;
    } catch (error) {
      log(`❌ Failed to initialize config: ${error.message}`, 'red');
      throw error;
    }
  }

  // 创建默认配置
  createDefaultConfig() {
    this.config = {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      providers: [
        {
          id: 'default-openai',
          name: 'OpenAI Compatible',
          protocol: 'openai',
          api_base_url: 'https://api.openai.com/v1',
          api_key: [],
          auth_type: 'api_key',
          models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo']
        },
        {
          id: 'default-anthropic',
          name: 'Anthropic Claude',
          protocol: 'anthropic',
          api_base_url: 'https://api.anthropic.com/v1',
          api_key: [],
          auth_type: 'api_key',
          models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
        },
        {
          id: 'default-gemini',
          name: 'Google Gemini',
          protocol: 'gemini',
          api_base_url: 'https://generativelanguage.googleapis.com/v1beta',
          api_key: [],
          auth_type: 'api_key',
          models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro']
        }
      ],
      routes: [
        {
          id: 'route-gpt-4',
          pattern: 'gpt-4*',
          provider: 'default-openai',
          model: 'auto',
          priority: 'high',
          enabled: true
        },
        {
          id: 'route-claude',
          pattern: 'claude-*',
          provider: 'default-anthropic',
          model: 'auto',
          priority: 'high',
          enabled: true
        },
        {
          id: 'route-gemini',
          pattern: 'gemini-*',
          provider: 'default-gemini',
          model: 'auto',
          priority: 'medium',
          enabled: true
        }
      ],
      global_config: {
        load_balancing: 'round_robin',
        rate_limiting: {
          enabled: false,
          requests_per_minute: 100
        }
      }
    };
    this.nextId = 4;
  }

  // 从文件加载配置
  loadConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        log(`⚠️  Config file not found, using default configuration`, 'yellow');
        this.createDefaultConfig();
        return;
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      const parsedConfig = JSON.parse(configData);

      // 验证配置文件格式
      if (!this.validateConfigFormat(parsedConfig)) {
        log(`⚠️  Invalid config format, creating backup and using default`, 'yellow');
        this.createConfigBackup();
        this.createDefaultConfig();
        return;
      }

      // 加载配置数据
      this.config = parsedConfig;
      
      // 计算下一个ID
      this.nextId = this.calculateNextId();

      success(`Loaded config from: ${this.configPath}`);
      info(`Loaded ${this.config.providers.length} providers`);
      
    } catch (error) {
      log(`❌ Failed to load config: ${error.message}`, 'red');
      log(`⚠️  Creating backup and using default configuration`, 'yellow');
      
      try {
        this.createConfigBackup();
      } catch (backupError) {
        log(`⚠️  Failed to create backup: ${backupError.message}`, 'yellow');
      }
      
      this.createDefaultConfig();
    }
  }

  // 保存配置到文件
  saveConfig() {
    try {
      // 更新时间戳
      this.config.last_updated = new Date().toISOString();
      
      // 确保配置目录存在
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      // 写入配置文件
      const configData = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.configPath, configData, 'utf8');
      
      info(`Config saved to: ${this.configPath}`);
      
    } catch (error) {
      log(`❌ Failed to save config: ${error.message}`, 'red');
      throw error;
    }
  }

  // 验证配置文件格式
  validateConfigFormat(config) {
    try {
      // 检查必需的顶级字段
      if (!config.version || !config.providers || !Array.isArray(config.providers)) {
        return false;
      }

      // 检查每个provider的格式
      for (const provider of config.providers) {
        if (!provider.id || !provider.name || !provider.protocol || !provider.api_base_url) {
          return false;
        }
        if (!Array.isArray(provider.api_key)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // 创建配置文件备份
  createConfigBackup() {
    try {
      const backupPath = `${this.configPath}.backup.${Date.now()}`;
      if (fs.existsSync(this.configPath)) {
        fs.copyFileSync(this.configPath, backupPath);
        info(`Created config backup: ${backupPath}`);
      }
    } catch (error) {
      log(`⚠️  Failed to create backup: ${error.message}`, 'yellow');
    }
  }

  // 计算下一个ID
  calculateNextId() {
    let maxId = 0;
    for (const provider of this.config.providers) {
      const idNumber = parseInt(provider.id.replace(/\D/g, ''));
      if (idNumber > maxId) {
        maxId = idNumber;
      }
    }
    return maxId + 1;
  }

  // 启动Web服务器
  async start() {
    header('🚀 Starting Multi-Key Configuration UI Server');
    
    try {
      // 初始化配置
      this.initializeConfig();
      this.loadConfig();
      
      // 检查UI文件是否存在
      if (!fs.existsSync(this.uiPath)) {
        throw new Error(`UI file not found: ${this.uiPath}`);
      }
      
      success('UI file found');

      // 创建HTTP服务器
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      // 启动服务器
      await new Promise((resolve, reject) => {
        this.server.listen(this.port, '0.0.0.0', (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      success(`Web server started successfully`);
      info(`Server listening on: http://localhost:${this.port}`);
      info(`UI accessible at: http://localhost:${this.port}/`);
      
      // 自动打开浏览器
      await this.openBrowser();
      
      // 显示使用说明
      this.showUsageInstructions();
      
    } catch (error) {
      log(`❌ Failed to start server: ${error.message}`, 'red');
      throw error;
    }
  }

  // 处理HTTP请求
  handleRequest(req, res) {
    const url = req.url;
    
    // 记录请求
    log(`${req.method} ${url}`, 'cyan');
    
    if (url === '/' || url === '/index.html') {
      this.serveUIFile(res);
    } else if (url.startsWith('/api/')) {
      this.handleApiRequest(req, res);
    } else {
      this.serve404(res);
    }
  }

  // 提供UI文件
  serveUIFile(res) {
    try {
      const content = fs.readFileSync(this.uiPath, 'utf8');
      
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      
      res.end(content);
      
    } catch (error) {
      log(`❌ Error serving UI file: ${error.message}`, 'red');
      this.serve500(res, error.message);
    }
  }

  // 处理API请求 (模拟后端API)
  handleApiRequest(req, res) {
    const url = req.url;
    let body = '';
    
    // 处理CORS预检请求
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const response = await this.processApiRequest(url, req.method, body);
        
        res.writeHead(response.statusCode || 200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        
        res.end(JSON.stringify(response));
        
      } catch (error) {
        log(`❌ API Error: ${error.message}`, 'red');
        this.serve500(res, error.message);
      }
    });
  }

  // 处理API请求逻辑
  async processApiRequest(url, method, body) {
    const timestamp = new Date().toISOString();
    info(`🌐 API ${method} ${url} at ${timestamp}`);
    log(`📥 Request body length: ${body ? body.length : 0} bytes`, 'cyan');
    if (body && body.length > 0 && body.length < 2000) {
      log(`📋 Request body content: ${body}`, 'cyan');
    } else if (body && body.length >= 2000) {
      log(`📋 Request body content (truncated): ${body.substring(0, 500)}...`, 'cyan');
    }
    
    try {
      // 解析URL和参数
      const urlParts = url.split('/');
      const apiPath = urlParts.slice(2); // 去掉 ['', 'api']
      
      log(`🔍 Parsed API path: [${apiPath.join(', ')}]`, 'cyan');
      
      // 路由处理
      if (apiPath[0] === 'providers') {
        log(`🏭 Routing to providers API handler`, 'cyan');
        const result = await this.handleProvidersAPI(apiPath, method, body);
        log(`✅ Providers API result: ${result.success ? 'SUCCESS' : 'FAILURE'}`, result.success ? 'green' : 'red');
        if (!result.success) {
          log(`❌ Providers API error: ${result.error}`, 'red');
          log(`❌ Status code: ${result.statusCode}`, 'red');
        }
        return result;
      } else if (apiPath[0] === 'config') {
        log(`⚙️  Routing to config API handler`, 'cyan');
        const result = this.handleConfigAPI(apiPath, method, body);
        log(`✅ Config API result: ${result.success ? 'SUCCESS' : 'FAILURE'}`, result.success ? 'green' : 'red');
        return result;
      } else if (apiPath[0] === 'blacklist') {
        log(`🚫 Routing to blacklist API handler`, 'cyan');
        const result = this.handleBlacklistAPI(apiPath, method, body);
        log(`✅ Blacklist API result: ${result.success ? 'SUCCESS' : 'FAILURE'}`, result.success ? 'green' : 'red');
        return result;
      } else if (apiPath[0] === 'pool') {
        log(`🏊 Routing to pool API handler`, 'cyan');
        const result = this.handlePoolAPI(apiPath, method, body);
        log(`✅ Pool API result: ${result.success ? 'SUCCESS' : 'FAILURE'}`, result.success ? 'green' : 'red');
        return result;
      } else if (apiPath[0] === 'virtual-routes') {
        log(`🛣️  Routing to virtual-routes API handler`, 'cyan');
        return new Promise((resolve, reject) => {
          // Create mock response object
          const mockRes = {
            statusCode: 200,
            headers: {},
            writeHead: (status, headers) => { 
              mockRes.statusCode = status; 
              mockRes.headers = headers; 
            },
            end: (data) => { 
              try {
                const result = JSON.parse(data);
                resolve({
                  success: true,
                  data: result,
                  statusCode: mockRes.statusCode,
                  timestamp: Date.now()
                });
              } catch (error) {
                log(`❌ Virtual routes API parsing error: ${error.message}`, 'red');
                reject(error);
              }
            }
          };
          
          // Create mock request object  
          const mockReq = {
            url: '/api/' + apiPath.join('/'),
            method: method,
            on: (event, callback) => {
              if (event === 'data' && body) {
                callback(body);
              } else if (event === 'end') {
                callback();
              }
            }
          };
          
          try {
            // Handle virtual routes API
            handleVirtualRoutesAPI(mockReq, mockRes, this.getConfigManager(), this.getProvidersManager(), this.getPoolManager());
          } catch (error) {
            log(`❌ Virtual routes API error: ${error.message}`, 'red');
            reject(error);
          }
        });
      } else {
        log(`❌ Unknown API endpoint: ${apiPath[0]}`, 'red');
        return {
          success: false,
          error: 'API endpoint not found',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
      
    } catch (error) {
      log(`❌ API Processing Error: ${error.message}`, 'red');
      log(`❌ Error stack: ${error.stack}`, 'red');
      return {
        success: false,
        error: error.message,
        statusCode: 500,
        timestamp: Date.now(),
        debug: {
          url,
          method,
          body,
          errorMessage: error.message,
          errorStack: error.stack
        }
      };
    }
  }
  
  // 处理Providers API
  async handleProvidersAPI(pathParts, method, body) {
    const [, providerId, action] = pathParts; // ['providers', id?, action?]
    
    log(`🏭 Processing providers API request:`, 'cyan');
    log(`   - pathParts: [${pathParts.join(', ')}]`, 'cyan');
    log(`   - method: ${method}`, 'cyan');
    log(`   - providerId (raw): ${providerId}`, 'cyan');
    log(`   - action: ${action}`, 'cyan');
    
    // URL解码providerId，支持特殊字符和空格
    const decodedProviderId = providerId ? decodeURIComponent(providerId) : null;
    log(`   - decodedProviderId: ${decodedProviderId}`, 'cyan');
    
    // 添加详细的调试信息
    log(`🔍 Switch statement debug:`, 'cyan');
    log(`   - method: "${method}"`, 'cyan');
    log(`   - providerId exists: ${!!decodedProviderId}`, 'cyan');
    log(`   - action: "${action}"`, 'cyan');
    log(`   - pathParts: [${pathParts.join(', ')}]`, 'cyan');
    
    switch (method) {
      case 'GET':
        log(`🔍 In GET case`, 'cyan');
        if (!providerId) {
          log(`🔍 No providerId - getting all providers`, 'cyan');
          // GET /api/providers - 获取所有providers
          return {
            success: true,
            data: this.config.providers,
            timestamp: Date.now()
          };
        } else {
          log(`🔍 Has providerId - getting specific provider`, 'cyan');
          // GET /api/providers/:id - 获取特定provider（支持按id或name查找）
          const provider = this.config.providers.find(p => 
            p.id === decodedProviderId || p.name === decodedProviderId
          );
          if (provider) {
            return {
              success: true,
              data: provider,
              timestamp: Date.now()
            };
          } else {
            return {
              success: false,
              error: 'Provider not found',
              statusCode: 404,
              timestamp: Date.now()
            };
          }
        }
        
      case 'POST':
        log(`🔍 In POST case`, 'cyan');
        if (!providerId) {
          log(`🔍 No providerId - calling addProvider`, 'cyan');
          // POST /api/providers - 添加新provider
          return this.addProvider(body);
        } else if (action === 'test') {
          log(`🔍 Action is test - calling testProvider`, 'cyan');
          // POST /api/providers/:id/test - 测试provider
          return await this.testProvider(decodedProviderId, body);
        } else if (action === 'models') {
          log(`🔍 Action is models - calling getProviderModels`, 'cyan');
          // POST /api/providers/:id/models - 获取模型列表
          return await this.getProviderModels(decodedProviderId, body);
        } else if (action === 'verify-model') {
          log(`🔍 Action is verify-model - calling verifyProviderModel`, 'cyan');
          // POST /api/providers/:id/verify-model - 验证单个模型
          return await this.verifyProviderModel(decodedProviderId, body);
        } else if (action === 'detect-tokens') {
          log(`🔍 Action is detect-tokens - calling detectModelTokens`, 'cyan');
          // POST /api/providers/:id/detect-tokens - 自动检测模型max_tokens
          return await this.detectModelTokens(decodedProviderId, body);
        } else if (action === 'blacklist-model') {
          log(`🔍 Action is blacklist-model - calling blacklistModel`, 'cyan');
          // POST /api/providers/:id/blacklist-model - 将模型加入黑名单
          return await this.blacklistModel(decodedProviderId, body);
        } else if (action === 'add-to-pool') {
          log(`🔍 Action is add-to-pool - calling addToProviderPool`, 'cyan');
          // POST /api/providers/:id/add-to-pool - 添加provider.model到池子
          return await this.addToProviderPool(decodedProviderId, body);
        } else {
          log(`🔍 POST: Unhandled action: "${action}"`, 'red');
        }
        break;
        
      case 'PUT':
        log(`🔍 In PUT case`, 'cyan');
        if (decodedProviderId) {
          log(`🔍 Has decodedProviderId - calling updateProvider`, 'cyan');
          // PUT /api/providers/:id - 更新provider
          log(`🔄 Calling updateProvider with ID: ${decodedProviderId}`, 'cyan');
          const result = this.updateProvider(decodedProviderId, body);
          log(`🔄 UpdateProvider result: ${result.success ? 'SUCCESS' : 'FAILURE'}`, result.success ? 'green' : 'red');
          return result;
        } else {
          log(`❌ PUT request missing provider ID`, 'red');
        }
        break;
        
      case 'DELETE':
        log(`🔍 In DELETE case`, 'cyan');
        if (decodedProviderId) {
          log(`🔍 Has decodedProviderId - calling deleteProvider`, 'cyan');
          // DELETE /api/providers/:id - 删除provider
          return this.deleteProvider(decodedProviderId);
        } else {
          log(`❌ DELETE request missing provider ID`, 'red');
        }
        break;
        
      default:
        log(`🔍 Unknown HTTP method: "${method}"`, 'red');
        return {
          success: false,
          error: 'Method not allowed',
          statusCode: 405,
          timestamp: Date.now()
        };
    }
    
    log(`❌ Reached end of handleProvidersAPI without handling - this should not happen`, 'red');
    log(`❌ Debug info: method=${method}, providerId=${decodedProviderId}, action=${action}`, 'red');
    log(`🔍 Final debug check:`, 'red');
    log(`   - Switch completed but no return statement was reached`, 'red');
    log(`   - This indicates a logic path that didn't return a value`, 'red');
    log(`   - Check if any case statements are missing return statements`, 'red');
    return {
      success: false,
      error: 'Bad request',
      statusCode: 400,
      timestamp: Date.now(),
      debug: {
        method,
        providerId: decodedProviderId,
        action,
        pathParts
      }
    };
  }
  
  // 添加新provider
  addProvider(bodyStr) {
    try {
      const data = JSON.parse(bodyStr || '{}');
      
      // 数据验证
      const validation = this.validateProviderData(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          statusCode: 400,
          timestamp: Date.now()
        };
      }
      
      // 检查名称是否重复
      const existingProvider = this.config.providers.find(p => p.name === data.name);
      if (existingProvider) {
        return {
          success: false,
          error: 'Provider name already exists',
          statusCode: 400,
          timestamp: Date.now()
        };
      }
      
      // 创建新provider
      const newProvider = {
        id: `provider-${this.nextId++}`,
        name: data.name,
        protocol: data.protocol,
        api_base_url: data.api_base_url,
        api_key: Array.isArray(data.api_key) ? 
          [...new Set(data.api_key.filter(key => key && key.trim() !== ''))] : 
          [data.api_key].filter(Boolean),
        auth_type: data.auth_type || 'api_key',
        models: Array.isArray(data.models) ? data.models : []
      };
      
      this.config.providers.push(newProvider);
      
      // 保存配置到文件
      this.saveConfig();
      
      success(`Added new provider: ${newProvider.name}`);
      
      return {
        success: true,
        data: newProvider,
        message: 'Provider added successfully',
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Invalid JSON data: ${error.message}`,
        statusCode: 400,
        timestamp: Date.now()
      };
    }
  }
  
  // 更新provider
  updateProvider(providerId, bodyStr) {
    // 开始调试日志
    log(`📥 Received PUT data for provider ${providerId}: ${bodyStr}`, 'cyan');
    log(`🔍 Looking for provider: ${providerId}`, 'cyan');
    
    try {
      const data = JSON.parse(bodyStr || '{}');
      log(`✅ Successfully parsed JSON data:`, 'cyan');
      log(`   - name: ${data.name}`, 'cyan');
      log(`   - protocol: ${data.protocol}`, 'cyan');
      log(`   - api_base_url: ${data.api_base_url}`, 'cyan');
      log(`   - api_key: ${Array.isArray(data.api_key) ? `[${data.api_key.length} keys]` : data.api_key ? '[1 key]' : 'none'}`, 'cyan');
      log(`   - auth_type: ${data.auth_type}`, 'cyan');
      log(`   - models: ${Array.isArray(data.models) ? `[${data.models.length} models]` : 'none'}`, 'cyan');
      
      // 找到要更新的provider（支持按id或name查找）
      const providerIndex = this.config.providers.findIndex(p => 
        p.id === providerId || p.name === providerId
      );
      
      log(`🔍 Provider search result: index = ${providerIndex}`, 'cyan');
      if (providerIndex !== -1) {
        const currentProvider = this.config.providers[providerIndex];
        log(`📋 Found existing provider:`, 'cyan');
        log(`   - id: ${currentProvider.id}`, 'cyan');
        log(`   - name: ${currentProvider.name}`, 'cyan');
        log(`   - protocol: ${currentProvider.protocol}`, 'cyan');
      }
      
      if (providerIndex === -1) {
        log(`❌ Provider not found with ID/name: ${providerId}`, 'red');
        log(`📋 Available providers:`, 'red');
        this.config.providers.forEach((p, i) => {
          log(`   ${i}: id="${p.id}", name="${p.name}"`, 'red');
        });
        return {
          success: false,
          error: 'Provider not found',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
      
      // 数据验证
      log(`🔍 Starting validation for provider data...`, 'cyan');
      const validation = this.validateProviderData(data, providerId);
      log(`🔍 Validation result: ${validation.valid ? 'PASSED' : 'FAILED'}`, validation.valid ? 'green' : 'red');
      
      if (!validation.valid) {
        log(`❌ Validation failed: ${validation.error}`, 'red');
        return {
          success: false,
          error: validation.error,
          statusCode: 400,
          timestamp: Date.now()
        };
      }
      
      // 检查名称是否与其他provider重复
      log(`🔍 Checking for name conflicts...`, 'cyan');
      const currentProvider = this.config.providers[providerIndex];
      const existingProvider = this.config.providers.find(p => p.name === data.name && p.id !== currentProvider.id);
      if (existingProvider) {
        log(`❌ Name conflict: Provider name "${data.name}" already exists with ID "${existingProvider.id}"`, 'red');
        return {
          success: false,
          error: 'Provider name already exists',
          statusCode: 400,
          timestamp: Date.now()
        };
      }
      log(`✅ No name conflicts found`, 'green');
      
      // 更新provider
      log(`🔄 Creating updated provider object...`, 'cyan');
      
      // 处理API key数组并去重
      let processedApiKeys;
      if (Array.isArray(data.api_key)) {
        processedApiKeys = data.api_key.filter(key => key && key.trim() !== '');
        log(`📋 Original API keys count: ${processedApiKeys.length}`, 'cyan');
        
        // 去重处理
        const uniqueKeys = [...new Set(processedApiKeys)];
        const duplicateCount = processedApiKeys.length - uniqueKeys.length;
        
        if (duplicateCount > 0) {
          log(`🔄 Removed ${duplicateCount} duplicate API keys`, 'yellow');
        }
        
        processedApiKeys = uniqueKeys;
        log(`✅ Final API keys count after deduplication: ${processedApiKeys.length}`, 'green');
      } else {
        processedApiKeys = [data.api_key].filter(Boolean);
        log(`📋 Single API key processed`, 'cyan');
      }
      
      const updatedProvider = {
        ...currentProvider,
        name: data.name,
        protocol: data.protocol,
        api_base_url: data.api_base_url,
        api_key: processedApiKeys,
        auth_type: data.auth_type || 'api_key',
        models: Array.isArray(data.models) ? data.models : []
      };
      
      log(`📝 Updated provider object:`, 'cyan');
      log(`   - id: ${updatedProvider.id}`, 'cyan');
      log(`   - name: ${updatedProvider.name}`, 'cyan');
      log(`   - protocol: ${updatedProvider.protocol}`, 'cyan');
      log(`   - api_key count: ${updatedProvider.api_key.length}`, 'cyan');
      log(`   - models count: ${updatedProvider.models.length}`, 'cyan');
      
      this.config.providers[providerIndex] = updatedProvider;
      
      // 保存配置到文件
      log(`💾 Saving configuration...`, 'cyan');
      try {
        this.saveConfig();
        log(`✅ Configuration saved successfully`, 'green');
      } catch (saveError) {
        log(`❌ Failed to save configuration: ${saveError.message}`, 'red');
        throw saveError;
      }
      
      success(`Updated provider: ${updatedProvider.name}`);
      
      return {
        success: true,
        data: updatedProvider,
        message: 'Provider updated successfully',
        timestamp: Date.now()
      };
      
    } catch (error) {
      log(`❌ Exception in updateProvider: ${error.message}`, 'red');
      log(`❌ Error stack: ${error.stack}`, 'red');
      return {
        success: false,
        error: `Invalid JSON data: ${error.message}`,
        statusCode: 400,
        timestamp: Date.now(),
        debug: {
          providerId,
          bodyStr,
          errorMessage: error.message,
          errorStack: error.stack
        }
      };
    }
  }
  
  // 删除provider
  deleteProvider(providerId) {
    // 支持按id或name查找provider
    const providerIndex = this.config.providers.findIndex(p => 
      p.id === providerId || p.name === providerId
    );
    if (providerIndex === -1) {
      return {
        success: false,
        error: 'Provider not found',
        statusCode: 404,
        timestamp: Date.now()
      };
    }
    
    const deletedProvider = this.config.providers.splice(providerIndex, 1)[0];
    
    // 保存配置到文件
    this.saveConfig();
    
    success(`Deleted provider: ${deletedProvider.name}`);
    
    return {
      success: true,
      data: { id: providerId },
      message: 'Provider deleted successfully',
      timestamp: Date.now()
    };
  }
  
  // 测试provider连接
  async testProvider(providerId, bodyStr) {
    try {
      const data = JSON.parse(bodyStr || '{}');
      // 支持按id或name查找provider
      const provider = this.config.providers.find(p => 
        p.id === providerId || p.name === providerId
      );
      
      if (!provider) {
        return {
          success: false,
          error: 'Provider not found',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
      
      // 真实API测试结果
      const testResults = [];
      const keysToTest = data.testAllKeys ? provider.api_key : [data.api_key].filter(Boolean);
      
      for (const key of keysToTest) {
        if (!key || key.trim() === '') {
          continue;
        }
        
        // 执行真实API测试
        const result = await this.performRealApiTest(provider, key);
        testResults.push({
          api_key: key.substring(0, 8) + '...',
          success: result.success,
          statusCode: result.statusCode,
          responseTime: result.responseTime,
          message: result.message,
          timestamp: Date.now(),
          models: result.models || []
        });
      }
      
      info(`Tested ${testResults.length} keys for provider: ${provider.name}`);
      
      return {
        success: true,
        data: {
          provider: provider.name,
          testResults: testResults,
          summary: {
            total: testResults.length,
            successful: testResults.filter(r => r.success).length,
            failed: testResults.filter(r => !r.success).length
          }
        },
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Test failed: ${error.message}`,
        statusCode: 500,
        timestamp: Date.now()
      };
    }
  }

  // 获取基础API URL，智能处理特定端点路径
  getBaseApiUrl(apiBaseUrl) {
    // 移除常见的特定端点路径
    const endpointsToRemove = [
      '/chat/completions',
      '/messages', 
      '/models',
      '/completions'
    ];
    
    let baseUrl = apiBaseUrl.trim();
    
    // 移除末尾的斜杠
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // 检查并移除特定端点
    for (const endpoint of endpointsToRemove) {
      if (baseUrl.endsWith(endpoint)) {
        baseUrl = baseUrl.slice(0, -endpoint.length);
        break;
      }
    }
    
    return baseUrl;
  }

  // 构建完整的API端点URL，确保格式正确
  buildApiEndpoint(baseUrl, endpoint) {
    // 确保baseUrl不以斜杠结尾
    const cleanBase = baseUrl.replace(/\/$/, '');
    // 确保endpoint以斜杠开头
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    const fullUrl = `${cleanBase}${cleanEndpoint}`;
    log(`🔧 Built API endpoint: ${cleanBase} + ${cleanEndpoint} = ${fullUrl}`, 'cyan');
    
    return fullUrl;
  }

  // 执行真实API测试
  async performRealApiTest(provider, apiKey) {
    const startTime = Date.now();
    
    try {
      let testEndpoint, headers, body, method = 'GET';
      
      // 获取基础API URL
      const baseUrl = this.getBaseApiUrl(provider.api_base_url);
      log(`🔗 Original API base URL: ${provider.api_base_url}`, 'cyan');
      log(`🔗 Processed base URL: ${baseUrl}`, 'cyan');
      
      // 根据协议类型构建测试端点
      switch (provider.protocol) {
        case 'openai':
          testEndpoint = this.buildApiEndpoint(baseUrl, '/models');
          log(`🎯 OpenAI test endpoint: ${testEndpoint}`, 'cyan');
          headers = {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'RCC-Multi-Key-Manager/1.0'
          };
          break;
          
        case 'anthropic':
          testEndpoint = this.buildApiEndpoint(baseUrl, '/messages');
          log(`🎯 Anthropic test endpoint: ${testEndpoint}`, 'cyan');
          headers = {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
            'User-Agent': 'RCC-Multi-Key-Manager/1.0'
          };
          method = 'POST';
          body = JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{
              role: 'user',
              content: 'test'
            }]
          });
          break;
          
        case 'gemini':
          // Gemini API 通常使用查询参数传递 API key
          const geminiEndpoint = this.buildApiEndpoint(baseUrl, '/models');
          testEndpoint = `${geminiEndpoint}?key=${encodeURIComponent(apiKey)}`;
          log(`🎯 Gemini test endpoint: ${testEndpoint}`, 'cyan');
          headers = {
            'User-Agent': 'RCC-Multi-Key-Manager/1.0'
          };
          break;
          
        default:
          throw new Error(`Unsupported protocol: ${provider.protocol}`);
      }
      
      // 发送HTTP请求
      const https = require('https');
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = new URL(testEndpoint);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: headers,
        timeout: 10000, // 10秒超时
        // 忽略SSL证书错误（用于测试环境）
        rejectUnauthorized: false
      };
      
      const responsePromise = new Promise((resolve, reject) => {
        const req = client.request(options, (res) => {
          let data = '';
          
          res.on('data', chunk => {
            data += chunk;
          });
          
          res.on('end', () => {
            const responseTime = Date.now() - startTime;
            
            try {
              let parsedData = {};
              if (data) {
                parsedData = JSON.parse(data);
              }
              
              // 根据状态码判断成功或失败
              const success = res.statusCode >= 200 && res.statusCode < 300;
              
              let models = [];
              let message = 'Connection successful';
              
              if (success) {
                // 尝试解析模型列表
                if (provider.protocol === 'openai' && parsedData.data) {
                  models = parsedData.data.map(model => model.id || model.name).filter(Boolean);
                } else if (provider.protocol === 'gemini' && parsedData.models) {
                  models = parsedData.models.map(model => model.name || model.id).filter(Boolean);
                }
                
                message = models.length > 0 ? 
                  `Connection successful. Found ${models.length} models` : 
                  'Connection successful';
              } else {
                // 处理错误响应
                if (res.statusCode === 401 || res.statusCode === 403) {
                  message = 'Authentication failed - Invalid API key';
                } else if (res.statusCode === 429) {
                  message = 'Rate limit exceeded';
                } else if (res.statusCode === 404) {
                  message = 'API endpoint not found';
                } else {
                  message = parsedData.error?.message || parsedData.message || `HTTP ${res.statusCode} error`;
                }
              }
              
              resolve({
                success: success,
                statusCode: res.statusCode,
                responseTime: responseTime,
                message: message,
                models: models,
                rawResponse: parsedData
              });
            } catch (parseError) {
              resolve({
                success: res.statusCode >= 200 && res.statusCode < 300,
                statusCode: res.statusCode,
                responseTime: Date.now() - startTime,
                message: res.statusCode >= 200 && res.statusCode < 300 ? 
                  'Connection successful (non-JSON response)' : 
                  `HTTP ${res.statusCode} - Response parsing failed`,
                models: [],
                rawResponse: data
              });
            }
          });
        });
        
        req.on('error', (error) => {
          reject({
            success: false,
            statusCode: 0,
            responseTime: Date.now() - startTime,
            message: `Connection failed: ${error.message}`,
            models: [],
            error: error.message
          });
        });
        
        req.on('timeout', () => {
          req.destroy();
          reject({
            success: false,
            statusCode: 0,
            responseTime: Date.now() - startTime,
            message: 'Request timeout (10 seconds)',
            models: [],
            error: 'timeout'
          });
        });
        
        // 发送请求体（如果有）
        if (body) {
          req.write(body);
        }
        
        req.end();
      });
      
      return await responsePromise;
      
    } catch (error) {
      return {
        success: false,
        statusCode: 0,
        responseTime: Date.now() - startTime,
        message: `Test failed: ${error.message}`,
        models: [],
        error: error.message
      };
    }
  }

  // 获取provider的模型列表
  async getProviderModels(providerId, bodyStr) {
    try {
      const data = JSON.parse(bodyStr || '{}');
      const provider = this.config.providers.find(p => 
        p.id === providerId || p.name === providerId
      );
      
      if (!provider) {
        return {
          success: false,
          error: 'Provider not found',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
      
      // 选择一个有效的API key进行测试
      const keys = Array.isArray(provider.api_key) ? provider.api_key : [provider.api_key];
      const validKey = keys.find(key => key && key.trim() !== '') || keys[0];
      
      if (!validKey) {
        return {
          success: false,
          error: 'No API key configured for this provider',
          statusCode: 400,
          timestamp: Date.now()
        };
      }
      
      info(`Fetching models for provider: ${provider.name}`);
      
      // 执行API调用获取模型列表
      const result = await this.performRealApiTest(provider, validKey);
      
      if (result.success && result.models && result.models.length > 0) {
        // 更新provider的模型列表
        const providerIndex = this.config.providers.findIndex(p => 
          p.id === providerId || p.name === providerId
        );
        
        if (providerIndex !== -1) {
          this.config.providers[providerIndex].models = result.models;
          this.saveConfig();
          
          success(`Updated models for provider: ${provider.name} (${result.models.length} models)`);
        }
        
        return {
          success: true,
          data: {
            provider: provider.name,
            models: result.models,
            count: result.models.length,
            updated: true
          },
          message: `Found ${result.models.length} models`,
          timestamp: Date.now()
        };
      } else if (result.statusCode === 404) {
        // 处理API不支持models端点的情况
        const fallbackModels = this.generateFallbackModels(provider);
        
        // 如果provider已经有模型列表，保持不变；否则使用回退模型
        if (!provider.models || provider.models.length === 0) {
          const providerIndex = this.config.providers.findIndex(p => 
            p.id === providerId || p.name === providerId
          );
          
          if (providerIndex !== -1) {
            this.config.providers[providerIndex].models = fallbackModels;
            this.saveConfig();
          }
        }
        
        return {
          success: false,
          error: `This API provider doesn't support model listing. Using ${provider.models?.length || fallbackModels.length} configured models.`,
          statusCode: 404,
          timestamp: Date.now(),
          data: {
            provider: provider.name,
            models: provider.models || fallbackModels,
            count: provider.models?.length || fallbackModels.length,
            updated: false,
            fallback: true,
            reason: 'API endpoint not supported'
          },
          debug: {
            testResult: result,
            fallbackUsed: true
          }
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to fetch models',
          statusCode: result.statusCode || 500,
          timestamp: Date.now(),
          debug: {
            testResult: result
          }
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to get models: ${error.message}`,
        statusCode: 500,
        timestamp: Date.now(),
        debug: {
          error: error.message,
          stack: error.stack
        }
      };
    }
  }

  // 生成回退模型列表，用于不支持models端点的API
  generateFallbackModels(provider) {
    const protocol = provider.protocol?.toLowerCase();
    
    switch (protocol) {
      case 'openai':
        return [
          'gpt-4-turbo-preview',
          'gpt-4',
          'gpt-3.5-turbo',
          'text-davinci-003',
          'text-curie-001'
        ];
        
      case 'anthropic':
        return [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
          'claude-2.1',
          'claude-instant-1.2'
        ];
        
      case 'gemini':
        return [
          'gemini-pro',
          'gemini-pro-vision',
          'gemini-1.5-pro',
          'gemini-1.5-flash'
        ];
        
      default:
        // 通用回退模型
        return [
          'default-model',
          'chat-model',
          'text-model'
        ];
    }
  }

  // 验证单个模型（真实对话测试）
  async verifyProviderModel(providerId, bodyStr) {
    try {
      const data = JSON.parse(bodyStr || '{}');
      const { modelId, testMessage = "Hello, how are you?" } = data;
      
      const provider = this.config.providers.find(p => 
        p.id === providerId || p.name === providerId
      );
      
      if (!provider) {
        return {
          success: false,
          error: 'Provider not found',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
      
      const model = provider.models.find(m => m.id === modelId || m.name === modelId);
      if (!model) {
        return {
          success: false,
          error: 'Model not found in provider',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
      
      // 选择一个有效的API key
      const keys = Array.isArray(provider.api_key) ? provider.api_key : [provider.api_key];
      const validKey = keys.find(key => key && key.trim() !== '') || keys[0];
      
      // 执行真实对话测试
      const result = await this.performRealConversationTest(provider, model, validKey, testMessage);
      
      // 更新模型验证状态
      const modelIndex = provider.models.findIndex(m => m.id === modelId || m.name === modelId);
      if (modelIndex !== -1) {
        provider.models[modelIndex].verified = result.success;
        provider.models[modelIndex].last_verification = new Date().toISOString();
        provider.models[modelIndex].updated_at = new Date().toISOString();
        
        // 如果验证成功，对非iFlow providers进行token检测
        if (result.success) {
          const isIFlow = this.isIFlowProvider(provider);
          
          if (isIFlow) {
            console.log(`⏭️ Skipping token detection for iFlow provider: ${model.name} (iFlow token testing is unreliable)`);
            // 对于iFlow，不进行token检测，因为测试结果不可靠
            provider.models[modelIndex].auto_detected_tokens = null;
            provider.models[modelIndex].updated_at = new Date().toISOString();
          } else {
            try {
              console.log(`🔍 Starting token detection for non-iFlow model: ${model.name}`);
              const tokenResult = await this.performTokenDetection(provider, model, validKey);
              console.log(`🔍 Token detection result for ${model.name}:`, tokenResult);
              if (tokenResult.success) {
                console.log(`✅ Setting auto_detected_tokens to ${tokenResult.detectedTokens} for ${model.name}`);
                provider.models[modelIndex].auto_detected_tokens = tokenResult.detectedTokens;
                provider.models[modelIndex].updated_at = new Date().toISOString();
              } else {
                console.log(`❌ Token detection failed for ${model.name}: ${tokenResult.detectedTokens || 'null'}`);
              }
            } catch (tokenError) {
              console.log(`❌ Token detection exception for ${model.name}:`, tokenError.message);
              console.log(`❌ Token detection stack trace:`, tokenError.stack);
            }
          }
        }
        
        this.saveConfig();
      }
      
      return {
        success: result.success,
        data: {
          model: model.name,
          verified: result.success,
          testMessage,
          response: result.response,
          responseTime: result.responseTime,
          tokensUsed: result.tokensUsed
        },
        message: result.success ? 'Model verification successful' : (result.message || 'Model verification failed - no response content'),
        statusCode: result.statusCode || 200,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Model verification failed: ${error.message}`,
        statusCode: 500,
        timestamp: Date.now()
      };
    }
  }

  // 自动检测模型的max_tokens（通过折叠测试）
  async detectModelTokens(providerId, bodyStr) {
    try {
      const data = JSON.parse(bodyStr || '{}');
      const { modelId } = data;
      
      const provider = this.config.providers.find(p => 
        p.id === providerId || p.name === providerId
      );
      
      if (!provider) {
        return {
          success: false,
          error: 'Provider not found',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
      
      const model = provider.models.find(m => m.id === modelId || m.name === modelId);
      if (!model) {
        return {
          success: false,
          error: 'Model not found in provider',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
      
      // 选择一个有效的API key
      const keys = Array.isArray(provider.api_key) ? provider.api_key : [provider.api_key];
      const validKey = keys.find(key => key && key.trim() !== '') || keys[0];
      
      // 执行折叠测试：512K → 256K → 128K → 64K → 32K → 16K → 8K → 4K
      const testValues = [524288, 262144, 131072, 65536, 32768, 16384, 8192, 4096];
      let detectedTokens = null;
      
      info(`Starting token detection for model: ${model.name}`);
      
      for (const tokenLimit of testValues) {
        const result = await this.performTokenLimitTest(provider, model, validKey, tokenLimit);
        
        if (result.success) {
          detectedTokens = tokenLimit;
          success(`Detected max_tokens: ${tokenLimit} for model ${model.name}`);
          break;
        } else {
          log(`Token limit ${tokenLimit} failed for model ${model.name}: ${result.message}`, 'yellow');
        }
        
        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 更新模型的auto_detected_tokens
      const modelIndex = provider.models.findIndex(m => m.id === modelId || m.name === modelId);
      if (modelIndex !== -1) {
        provider.models[modelIndex].auto_detected_tokens = detectedTokens;
        provider.models[modelIndex].updated_at = new Date().toISOString();
        this.saveConfig();
      }
      
      return {
        success: detectedTokens !== null,
        data: {
          model: model.name,
          detectedTokens,
          originalTokens: model.max_tokens,
          testValues: testValues
        },
        message: detectedTokens ? 
          `Successfully detected max_tokens: ${detectedTokens}` : 
          'Could not detect max_tokens - all test values failed',
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Token detection failed: ${error.message}`,
        statusCode: 500,
        timestamp: Date.now()
      };
    }
  }

  // 将模型加入黑名单
  async blacklistModel(providerId, bodyStr) {
    try {
      const data = JSON.parse(bodyStr || '{}');
      const { modelId, reason = 'Manual blacklist' } = data;
      
      const provider = this.config.providers.find(p => 
        p.id === providerId || p.name === providerId
      );
      
      if (!provider) {
        return {
          success: false,
          error: 'Provider not found',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
      
      const modelIndex = provider.models.findIndex(m => m.id === modelId || m.name === modelId);
      if (modelIndex === -1) {
        return {
          success: false,
          error: 'Model not found in provider',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
      
      const model = provider.models[modelIndex];
      
      // 将模型添加到黑名单
      if (!this.config.model_blacklist) {
        this.config.model_blacklist = [];
      }
      
      const blacklistEntry = {
        id: `${provider.name}.${model.name}`,
        providerId: provider.id,
        providerName: provider.name,
        modelId: model.id,
        modelName: model.name,
        reason,
        blacklisted_at: new Date().toISOString(),
        original_model: { ...model }
      };
      
      // 去重逻辑：从pool中移除相同的 provider.model 组合
      if (this.config.provider_pool) {
        const poolIndex = this.config.provider_pool.findIndex(p => p.id === blacklistEntry.id);
        if (poolIndex !== -1) {
          this.config.provider_pool.splice(poolIndex, 1);
        }
      }
      
      this.config.model_blacklist.push(blacklistEntry);
      
      // 更新原模型状态
      provider.models[modelIndex].blacklisted = true;
      provider.models[modelIndex].blacklist_reason = reason;
      provider.models[modelIndex].status = 'blacklisted';
      provider.models[modelIndex].updated_at = new Date().toISOString();
      
      this.saveConfig();
      
      return {
        success: true,
        data: {
          model: model.name,
          provider: provider.name,
          reason,
          blacklistId: blacklistEntry.id
        },
        message: `Model ${model.name} has been blacklisted`,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Blacklist operation failed: ${error.message}`,
        statusCode: 500,
        timestamp: Date.now()
      };
    }
  }

  // 添加provider.model到池子
  async addToProviderPool(providerId, bodyStr) {
    try {
      const data = JSON.parse(bodyStr || '{}');
      const { modelId } = data;
      
      const provider = this.config.providers.find(p => 
        p.id === providerId || p.name === providerId
      );
      
      if (!provider) {
        return {
          success: false,
          error: 'Provider not found',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
      
      const model = provider.models.find(m => m.id === modelId || m.name === modelId);
      if (!model) {
        return {
          success: false,
          error: 'Model not found in provider',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
      
      // 初始化provider_pool
      if (!this.config.provider_pool) {
        this.config.provider_pool = [];
      }
      
      const poolEntry = {
        id: `${provider.name}.${model.name}`,
        providerId: provider.id,
        providerName: provider.name,
        modelId: model.id,
        modelName: model.name,
        api_base_url: provider.api_base_url,
        protocol: provider.protocol,
        auth_type: provider.auth_type,
        api_key: provider.api_key, // 保持引用
        model: { ...model },
        added_at: new Date().toISOString(),
        status: 'active'
      };
      
      // 去重逻辑：从黑名单中移除相同的 provider.model 组合
      const duplicateKey = `${provider.name}.${model.name}`;
      if (this.config.model_blacklist) {
        const blacklistIndex = this.config.model_blacklist.findIndex(b => b.id === duplicateKey);
        if (blacklistIndex !== -1) {
          this.config.model_blacklist.splice(blacklistIndex, 1);
          // 同时更新原模型状态
          const originalModel = provider.models.find(m => m.id === model.id || m.name === model.name);
          if (originalModel) {
            originalModel.blacklisted = false;
            originalModel.blacklist_reason = null;
            originalModel.status = 'active';
            originalModel.updated_at = new Date().toISOString();
          }
        }
      }

      // 检查是否已存在
      const existingIndex = this.config.provider_pool.findIndex(p => p.id === poolEntry.id);
      if (existingIndex !== -1) {
        // 更新现有条目
        this.config.provider_pool[existingIndex] = poolEntry;
      } else {
        // 添加新条目
        this.config.provider_pool.push(poolEntry);
      }
      
      this.saveConfig();
      
      return {
        success: true,
        data: {
          poolEntry,
          totalPoolSize: this.config.provider_pool.length
        },
        message: `Added ${provider.name}.${model.name} to provider pool`,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Add to pool failed: ${error.message}`,
        statusCode: 500,
        timestamp: Date.now()
      };
    }
  }

  // 执行真实对话测试
  async performRealConversationTest(provider, model, apiKey, testMessage) {
    const startTime = Date.now();
    
    try {
      const https = require('https');
      const http = require('http');
      
      // 构建对话请求
      const baseUrl = this.getBaseApiUrl(provider.api_base_url);
      let testEndpoint, headers, body, method = 'POST';
      
      switch (provider.protocol) {
        case 'openai':
          testEndpoint = this.buildApiEndpoint(baseUrl, '/chat/completions');
          headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'RCC-Model-Verifier/1.0'
          };
          body = JSON.stringify({
            model: model.name,
            messages: [{ role: 'user', content: testMessage }],
            max_tokens: Math.min(100, model.max_tokens || 100),
            temperature: 0.7
          });
          break;
          
        case 'anthropic':
          testEndpoint = this.buildApiEndpoint(baseUrl, '/messages');
          headers = {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
            'User-Agent': 'RCC-Model-Verifier/1.0'
          };
          body = JSON.stringify({
            model: model.name,
            max_tokens: Math.min(100, model.max_tokens || 100),
            messages: [{ role: 'user', content: testMessage }]
          });
          break;
          
        default:
          throw new Error(`Unsupported protocol for conversation test: ${provider.protocol}`);
      }
      
      // 执行HTTP请求
      const parsedUrl = new URL(testEndpoint);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const result = await new Promise((resolve, reject) => {
        const req = client.request({
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: method,
          headers: headers,
          timeout: 30000, // 30秒超时
          rejectUnauthorized: false
        }, (res) => {
          let data = '';
          
          res.on('data', chunk => {
            data += chunk;
          });
          
          res.on('end', () => {
            const responseTime = Date.now() - startTime;
            
            try {
              const parsedData = data ? JSON.parse(data) : {};
              
              const httpSuccess = res.statusCode >= 200 && res.statusCode < 300;
              
              let response = '';
              let tokensUsed = 0;
              let actualSuccess = false;
              
              if (httpSuccess) {
                if (provider.protocol === 'openai' && parsedData.choices && parsedData.choices[0]) {
                  // 处理标准 content 字段以及 GLM-4.5 的 reasoning_content 字段
                  const message = parsedData.choices[0].message;
                  response = message?.content || message?.reasoning_content || '';
                  tokensUsed = parsedData.usage?.total_tokens || 0;
                } else if (provider.protocol === 'anthropic' && parsedData.content && parsedData.content[0]) {
                  response = parsedData.content[0].text || '';
                  tokensUsed = parsedData.usage?.output_tokens || 0;
                }
                
                // 只有当有实际响应内容时才算验证成功
                actualSuccess = response.trim().length > 0;
              }
              
              resolve({
                success: actualSuccess,
                statusCode: res.statusCode,
                responseTime: responseTime,
                response: response,
                tokensUsed: tokensUsed,
                message: actualSuccess ? 'Conversation test successful' : 
                  (!httpSuccess ? (parsedData.message || parsedData.error?.message || `HTTP ${res.statusCode} error`) :
                   'Model responded but with empty content - verification failed'),
                rawResponse: parsedData
              });
              
            } catch (parseError) {
              resolve({
                success: false,
                statusCode: res.statusCode,
                responseTime: responseTime,
                response: '',
                tokensUsed: 0,
                message: `Response parsing failed: ${parseError.message}`,
                rawResponse: data
              });
            }
          });
        });
        
        req.on('error', (error) => {
          reject({
            success: false,
            statusCode: 0,
            responseTime: Date.now() - startTime,
            response: '',
            tokensUsed: 0,
            message: `Connection failed: ${error.message}`,
            error: error.message
          });
        });
        
        req.on('timeout', () => {
          req.destroy();
          reject({
            success: false,
            statusCode: 0,
            responseTime: Date.now() - startTime,
            response: '',
            tokensUsed: 0,
            message: 'Request timeout (30 seconds)',
            error: 'timeout'
          });
        });
        
        if (body) {
          req.write(body);
        }
        
        req.end();
      });
      
      return result;
      
    } catch (error) {
      return {
        success: false,
        statusCode: 0,
        responseTime: Date.now() - startTime,
        response: '',
        tokensUsed: 0,
        message: `Conversation test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  // 执行token限制测试
  async performTokenLimitTest(provider, model, apiKey, tokenLimit) {
    // 生成一个大约需要指定token数量的测试内容
    const testContent = this.generateTestContent(tokenLimit);
    
    try {
      const result = await this.performRealConversationTest(
        provider, 
        { ...model, max_tokens: tokenLimit }, 
        apiKey, 
        testContent
      );
      
      // 如果成功响应，说明这个token限制是可接受的
      return result;
      
    } catch (error) {
      return {
        success: false,
        message: error.message,
        tokenLimit: tokenLimit
      };
    }
  }

  // 检查是否为iFlow provider
  isIFlowProvider(provider) {
    const urlPatterns = [
      /apis\.iflow\.cn/i,
      /iflow\.cn/i,
      /platform\.iflow\.cn/i
    ];
    
    const namePatterns = ['iflow', 'iFlow', 'IFLOW'];
    
    const urlMatch = urlPatterns.some(pattern => pattern.test(provider.api_base_url));
    const nameMatch = namePatterns.includes(provider.name);
    
    return urlMatch || nameMatch;
  }

  // iFlow特定的错误解析
  parseIFlowError(response) {
    // iFlow format: {"message": "...", "error_code": 400}
    // OpenAI format: {"error": {"message": "..."}}
    let message = '';
    let code;
    
    if (response.message) {
      message = response.message;
      code = response.error_code;
    } else if (response.error?.message) {
      message = response.error.message;
      code = response.error.code;
    }
    
    return { message, code };
  }

  // 从iFlow错误消息中提取token限制
  extractTokenFromIFlowError(errorMessage) {
    const iflowPatterns = [
      /maximum context length of (\d{1,7}) tokens/i,
      /maximum context length is (\d{1,7}) tokens/i,
      /context[\s_]*length[\s_]*(?:of|is|limit|max)?[:\s]*(\d{1,7})/i,
      /token[\s_]*(?:count[\s_]*)?(?:limit|max)[:\s]*(\d{1,7})/i,
      /(\d{1,7})[\s_]*tokens?[\s_]*(?:limit|max|maximum)/i
    ];
    
    for (const pattern of iflowPatterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        const tokenLimit = parseInt(match[1]);
        if (tokenLimit >= 1000 && tokenLimit <= 2000000) {
          return tokenLimit;
        }
      }
    }
    
    return null;
  }

  // 执行token检测（iFlow特定逻辑）
  async performTokenDetection(provider, model, apiKey) {
    try {
      const isIFlow = this.isIFlowProvider(provider);
      console.log(`🔍 Starting token detection for ${isIFlow ? 'iFlow' : 'generic'} provider: ${model.name}`);
      
      // 设置512K tokens来触发API限制错误，根据用户要求
      const result = await this.performRealConversationTest(
        provider, 
        { ...model, max_tokens: 524288 }, // 设置512K tokens触发错误
        apiKey, 
        "Hello, please respond with OK."
      );
      
      console.log(`Token detection test result:`, {
        success: result.success,
        statusCode: result.statusCode,
        message: result.message,
        hasRawResponse: !!result.rawResponse,
        providerType: isIFlow ? 'iflow' : 'generic'
      });
      
      // 如果成功，说明模型支持512K tokens或更多
      if (result.success) {
        console.log(`✅ Model ${model.name} supports at least 512K tokens`);
        return {
          success: true,
          detectedTokens: 524288 // 至少支持512K
        };
      }
      
      // 如果失败，使用provider特定的错误解析
      if (result.rawResponse) {
        let errorMsg = '';
        
        if (isIFlow) {
          // 使用iFlow特定的错误解析
          const parsed = this.parseIFlowError(result.rawResponse);
          errorMsg = parsed.message;
          console.log(`🔧 iFlow error parsed:`, parsed);
        } else {
          // 通用错误解析
          errorMsg = result.rawResponse.error?.message || result.rawResponse.message || '';
        }
        
        console.log(`Token detection - API error response: ${errorMsg}`);
        console.log(`Token detection - Raw response:`, JSON.stringify(result.rawResponse, null, 2));
        
        if (errorMsg) {
          // 使用provider特定的token提取
          let detectedTokens = null;
          
          if (isIFlow) {
            detectedTokens = this.extractTokenFromIFlowError(errorMsg);
          } else {
            // 通用token提取逻辑
            detectedTokens = this.extractTokenFromGenericError(errorMsg);
          }
          
          if (detectedTokens) {
            console.log(`✅ Detected actual token limit from ${isIFlow ? 'iFlow' : 'generic'} API: ${detectedTokens.toLocaleString()}`);
            return {
              success: true,
              detectedTokens: detectedTokens
            };
          }
          
          // 回退到通用数字提取
          const allNumbers = errorMsg.match(/(\d{1,7})/g);
          if (allNumbers) {
            const possibleTokens = allNumbers.map(num => parseInt(num))
              .filter(num => num >= 1000 && num <= 2000000)
              .sort((a, b) => b - a);
            
            console.log(`All possible tokens from error: ${possibleTokens}`);
            if (possibleTokens.length > 0) {
              const fallbackTokens = possibleTokens[0];
              console.log(`✅ Fallback: Detected tokens from numbers: ${fallbackTokens.toLocaleString()}`);
              return {
                success: true,
                detectedTokens: fallbackTokens
              };
            }
          }
        }
      }
      
      console.log(`❌ Token detection failed: no parseable token limit in error response`);
      return {
        success: false,
        detectedTokens: null
      };
      
    } catch (error) {
      console.log(`❌ Token detection exception:`, error.message);
      return {
        success: false,
        detectedTokens: null
      };
    }
  }

  // 通用错误token提取（用于非iFlow providers）
  extractTokenFromGenericError(errorMessage) {
    const genericPatterns = [
      /maximum.*?(\d{1,7}).*?tokens/i,
      /token.*?limit.*?(\d{1,7})/i,
      /(\d{1,7}).*?token.*?limit/i
    ];
    
    for (const pattern of genericPatterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        const tokenLimit = parseInt(match[1]);
        if (tokenLimit >= 1000 && tokenLimit <= 2000000) {
          return tokenLimit;
        }
      }
    }
    
    return null;
  }

  // 生成测试内容（近似指定token数量）
  generateTestContent(targetTokens) {
    // 粗略估算：1 token ≈ 4 characters（英文）
    const targetChars = Math.floor(targetTokens * 3); // 保守估计
    const baseText = "This is a test message to determine the maximum token limit of the model. ";
    
    let content = baseText;
    while (content.length < targetChars) {
      content += baseText + `Repeat ${content.length / baseText.length}: `;
    }
    
    return content.substring(0, targetChars) + " Please respond with a simple 'OK'.";
  }

  // 处理Config API
  handleConfigAPI(pathParts, method, body) {
    const [, action] = pathParts; // ['config', action?]
    
    switch (method) {
      case 'GET':
        if (!action || action === 'status') {
          // GET /api/config 或 /api/config/status - 获取配置状态
          return {
            success: true,
            data: {
              config_path: this.configPath,
              config_dir: this.configDir,
              version: this.config.version,
              last_updated: this.config.last_updated,
              providers_count: this.config.providers.length,
              routes_count: this.config.routes.length,
              file_exists: fs.existsSync(this.configPath),
              file_size: fs.existsSync(this.configPath) ? fs.statSync(this.configPath).size : 0,
              next_id: this.nextId
            },
            timestamp: Date.now()
          };
        } else if (action === 'export') {
          // GET /api/config/export - 导出完整配置
          return {
            success: true,
            data: this.config,
            message: 'Configuration exported successfully',
            timestamp: Date.now()
          };
        }
        break;
        
      case 'POST':
        if (action === 'import') {
          // POST /api/config/import - 导入配置
          return this.importConfig(body);
        } else if (action === 'backup') {
          // POST /api/config/backup - 创建配置备份
          return this.createManualBackup();
        } else if (action === 'reset') {
          // POST /api/config/reset - 重置为默认配置
          this.resetProviders();
          return {
            success: true,
            message: 'Configuration reset to defaults',
            timestamp: Date.now()
          };
        }
        break;
        
      case 'PUT':
        if (action === 'global') {
          // PUT /api/config/global - 更新全局配置
          return this.updateGlobalConfig(body);
        }
        break;
        
      default:
        return {
          success: false,
          error: 'Method not allowed',
          statusCode: 405,
          timestamp: Date.now()
        };
    }
    
    return {
      success: false,
      error: 'Bad request',
      statusCode: 400,
      timestamp: Date.now()
    };
  }

  // 处理Blacklist API
  handleBlacklistAPI(pathParts, method, body) {
    const [, action] = pathParts; // ['blacklist', action?]
    
    switch (method) {
      case 'GET':
        if (!action) {
          // GET /api/blacklist - 获取所有黑名单模型
          const blacklistModels = this.config.model_blacklist || [];
          return {
            success: true,
            data: blacklistModels,
            count: blacklistModels.length,
            timestamp: Date.now()
          };
        } else if (action === 'providers') {
          // GET /api/blacklist/providers - 按provider分组的黑名单
          const blacklistModels = this.config.model_blacklist || [];
          const groupedByProvider = {};
          
          blacklistModels.forEach(model => {
            const providerId = model.providerId;
            if (!groupedByProvider[providerId]) {
              groupedByProvider[providerId] = [];
            }
            groupedByProvider[providerId].push(model);
          });
          
          return {
            success: true,
            data: groupedByProvider,
            timestamp: Date.now()
          };
        }
        break;
        
      case 'DELETE':
        if (action) {
          // DELETE /api/blacklist/{modelId} - 从黑名单移除指定模型
          const modelId = decodeURIComponent(action);
          const blacklistIndex = this.config.model_blacklist.findIndex(m => m.id === modelId);
          
          if (blacklistIndex === -1) {
            return {
              success: false,
              error: 'Model not found in blacklist',
              statusCode: 404,
              timestamp: Date.now()
            };
          }
          
          // 移除黑名单记录
          const removedModel = this.config.model_blacklist.splice(blacklistIndex, 1)[0];
          
          // 更新provider中的模型状态
          const provider = this.config.providers.find(p => p.id === removedModel.providerId);
          if (provider) {
            const model = provider.models.find(m => m.id === removedModel.modelId);
            if (model) {
              model.blacklisted = false;
              model.blacklist_reason = null;
              model.status = 'active';
              model.updated_at = new Date().toISOString();
            }
          }
          
          // 保存配置
          this.saveConfig();
          
          return {
            success: true,
            message: `Model ${removedModel.modelName} removed from blacklist`,
            data: removedModel,
            timestamp: Date.now()
          };
        }
        break;
        
      default:
        return {
          success: false,
          error: 'Method not allowed',
          statusCode: 405,
          timestamp: Date.now()
        };
    }
    
    return {
      success: false,
      error: 'Bad request',
      statusCode: 400,
      timestamp: Date.now()
    };
  }

  // 处理Pool API
  handlePoolAPI(pathParts, method, body) {
    const [, action] = pathParts; // ['pool', action?]
    
    switch (method) {
      case 'GET':
        if (!action) {
          // GET /api/pool - 获取所有pool模型
          const poolModels = this.config.provider_pool || [];
          return {
            success: true,
            data: poolModels,
            count: poolModels.length,
            timestamp: Date.now()
          };
        } else if (action === 'providers') {
          // GET /api/pool/providers - 按provider分组的pool
          const poolModels = this.config.provider_pool || [];
          const groupedByProvider = {};
          
          poolModels.forEach(model => {
            const providerId = model.providerId;
            if (!groupedByProvider[providerId]) {
              groupedByProvider[providerId] = [];
            }
            groupedByProvider[providerId].push(model);
          });
          
          return {
            success: true,
            data: groupedByProvider,
            timestamp: Date.now()
          };
        }
        break;
        
      case 'DELETE':
        if (action) {
          // DELETE /api/pool/{modelId} - 从pool移除指定模型
          const modelId = decodeURIComponent(action);
          const poolIndex = this.config.provider_pool.findIndex(m => m.id === modelId);
          
          if (poolIndex === -1) {
            return {
              success: false,
              error: 'Model not found in pool',
              statusCode: 404,
              timestamp: Date.now()
            };
          }
          
          // 移除pool记录
          const removedModel = this.config.provider_pool.splice(poolIndex, 1)[0];
          
          // 保存配置
          this.saveConfig();
          
          return {
            success: true,
            message: `Model ${removedModel.modelName} removed from pool`,
            data: removedModel,
            timestamp: Date.now()
          };
        }
        break;
        
      default:
        return {
          success: false,
          error: 'Method not allowed',
          statusCode: 405,
          timestamp: Date.now()
        };
    }
    
    return {
      success: false,
      error: 'Bad request',
      statusCode: 400,
      timestamp: Date.now()
    };
  }

  // 导入配置
  importConfig(bodyStr) {
    try {
      const importData = JSON.parse(bodyStr || '{}');
      
      // 验证导入的配置格式
      if (!this.validateConfigFormat(importData)) {
        return {
          success: false,
          error: 'Invalid configuration format',
          statusCode: 400,
          timestamp: Date.now()
        };
      }
      
      // 创建当前配置的备份
      this.createConfigBackup();
      
      // 更新配置
      this.config = {
        ...importData,
        last_updated: new Date().toISOString()
      };
      
      // 重新计算下一个ID
      this.nextId = this.calculateNextId();
      
      // 保存到文件
      this.saveConfig();
      
      success(`Configuration imported successfully with ${this.config.providers.length} providers`);
      
      return {
        success: true,
        data: {
          providers_count: this.config.providers.length,
          routes_count: this.config.routes.length
        },
        message: 'Configuration imported successfully',
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Import failed: ${error.message}`,
        statusCode: 400,
        timestamp: Date.now()
      };
    }
  }

  // 创建手动备份
  createManualBackup() {
    try {
      const backupPath = `${this.configPath}.manual-backup.${Date.now()}`;
      if (fs.existsSync(this.configPath)) {
        fs.copyFileSync(this.configPath, backupPath);
        success(`Created manual backup: ${backupPath}`);
        
        return {
          success: true,
          data: { backup_path: backupPath },
          message: 'Manual backup created successfully',
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: 'No config file to backup',
          statusCode: 404,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Backup failed: ${error.message}`,
        statusCode: 500,
        timestamp: Date.now()
      };
    }
  }

  // 更新全局配置
  updateGlobalConfig(bodyStr) {
    try {
      const data = JSON.parse(bodyStr || '{}');
      
      // 更新全局配置
      this.config.global_config = {
        ...this.config.global_config,
        ...data
      };
      
      // 保存配置
      this.saveConfig();
      
      success('Global configuration updated');
      
      return {
        success: true,
        data: this.config.global_config,
        message: 'Global configuration updated successfully',
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Update failed: ${error.message}`,
        statusCode: 400,
        timestamp: Date.now()
      };
    }
  }
  
  // 验证provider数据
  validateProviderData(data, excludeId = null) {
    log(`🔍 Starting detailed validation for provider data...`, 'cyan');
    log(`📋 Validation input data:`, 'cyan');
    log(`   - data: ${JSON.stringify(data, null, 2)}`, 'cyan');
    log(`   - excludeId: ${excludeId}`, 'cyan');
    
    const errors = [];
    
    // 必需字段检查 - Name
    log(`🔍 Validating name field...`, 'cyan');
    if (!data.name) {
      log(`❌ Name validation: field is missing or falsy`, 'red');
      errors.push('Name is required and must be a non-empty string');
    } else if (typeof data.name !== 'string') {
      log(`❌ Name validation: field is not a string (type: ${typeof data.name})`, 'red');
      errors.push('Name is required and must be a non-empty string');
    } else if (data.name.trim() === '') {
      log(`❌ Name validation: field is empty after trimming`, 'red');
      errors.push('Name is required and must be a non-empty string');
    } else {
      log(`✅ Name validation: passed ("${data.name}")`, 'green');
    }
    
    // 必需字段检查 - Protocol
    log(`🔍 Validating protocol field...`, 'cyan');
    const validProtocols = ['openai', 'anthropic', 'gemini'];
    if (!data.protocol) {
      log(`❌ Protocol validation: field is missing or falsy`, 'red');
      errors.push('Protocol is required and must be one of: openai, anthropic, gemini');
    } else if (!validProtocols.includes(data.protocol)) {
      log(`❌ Protocol validation: invalid protocol "${data.protocol}", must be one of: ${validProtocols.join(', ')}`, 'red');
      errors.push('Protocol is required and must be one of: openai, anthropic, gemini');
    } else {
      log(`✅ Protocol validation: passed ("${data.protocol}")`, 'green');
    }
    
    // 必需字段检查 - API Base URL
    log(`🔍 Validating api_base_url field...`, 'cyan');
    if (!data.api_base_url) {
      log(`❌ API Base URL validation: field is missing or falsy`, 'red');
      errors.push('API base URL is required and must be a valid URL string');
    } else if (typeof data.api_base_url !== 'string') {
      log(`❌ API Base URL validation: field is not a string (type: ${typeof data.api_base_url})`, 'red');
      errors.push('API base URL is required and must be a valid URL string');
    } else if (data.api_base_url.trim() === '') {
      log(`❌ API Base URL validation: field is empty after trimming`, 'red');
      errors.push('API base URL is required and must be a valid URL string');
    } else {
      try {
        const url = new URL(data.api_base_url);
        log(`✅ API Base URL validation: passed ("${data.api_base_url}")`, 'green');
        log(`   - Protocol: ${url.protocol}`, 'cyan');
        log(`   - Host: ${url.host}`, 'cyan');
      } catch (urlError) {
        log(`❌ API Base URL validation: invalid URL format - ${urlError.message}`, 'red');
        errors.push('API base URL must be a valid URL');
      }
    }
    
    // Auth Type验证
    log(`🔍 Validating auth_type field...`, 'cyan');
    const validAuthTypes = ['api_key', 'oauth'];
    if (data.auth_type) {
      if (!validAuthTypes.includes(data.auth_type)) {
        log(`❌ Auth type validation: invalid auth_type "${data.auth_type}", must be one of: ${validAuthTypes.join(', ')}`, 'red');
        errors.push('Auth type must be one of: api_key, oauth');
      } else {
        log(`✅ Auth type validation: passed ("${data.auth_type}")`, 'green');
      }
    } else {
      log(`ℹ️  Auth type validation: field not provided, will use default "api_key"`, 'cyan');
    }
    
    // 长度限制检查
    log(`🔍 Validating length limits...`, 'cyan');
    if (data.name && data.name.length > 100) {
      log(`❌ Length validation: name too long (${data.name.length} > 100)`, 'red');
      errors.push('Name must be less than 100 characters');
    } else if (data.name) {
      log(`✅ Length validation: name length OK (${data.name.length} chars)`, 'green');
    }
    
    // API Key验证和去重检查
    log(`🔍 Validating api_key field...`, 'cyan');
    if (data.api_key !== undefined) {
      if (Array.isArray(data.api_key)) {
        log(`✅ API Key validation: array format with ${data.api_key.length} keys`, 'green');
        
        // 检查重复的API key
        const validKeys = data.api_key.filter(key => key && key.trim() !== '');
        const uniqueKeys = [...new Set(validKeys)];
        
        if (validKeys.length !== uniqueKeys.length) {
          const duplicateCount = validKeys.length - uniqueKeys.length;
          log(`❌ Duplicate API keys detected: ${duplicateCount} duplicates found`, 'red');
          errors.push(`Duplicate API keys are not allowed (found ${duplicateCount} duplicates)`);
        } else {
          log(`✅ No duplicate API keys found`, 'green');
        }
        
        data.api_key.forEach((key, index) => {
          if (typeof key === 'string' && key.trim() !== '') {
            log(`   [${index}]: Valid key (length: ${key.length})`, 'cyan');
          } else {
            log(`   [${index}]: Invalid key (empty or not string)`, 'yellow');
          }
        });
      } else if (typeof data.api_key === 'string') {
        log(`✅ API Key validation: string format (length: ${data.api_key.length})`, 'green');
      } else {
        log(`⚠️  API Key validation: unexpected format (type: ${typeof data.api_key})`, 'yellow');
      }
    } else {
      log(`ℹ️  API Key validation: field not provided`, 'cyan');
    }
    
    // Models验证 (可选)
    log(`🔍 Validating models field...`, 'cyan');
    if (data.models !== undefined) {
      if (Array.isArray(data.models)) {
        log(`✅ Models validation: array format with ${data.models.length} models`, 'green');
      } else {
        log(`⚠️  Models validation: not an array (type: ${typeof data.models})`, 'yellow');
      }
    } else {
      log(`ℹ️  Models validation: field not provided`, 'cyan');
    }
    
    const result = {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : null
    };
    
    log(`🔍 Validation summary:`, result.valid ? 'green' : 'red');
    log(`   - Valid: ${result.valid}`, result.valid ? 'green' : 'red');
    log(`   - Error count: ${errors.length}`, result.valid ? 'green' : 'red');
    if (!result.valid) {
      log(`   - Errors: ${result.error}`, 'red');
    }
    
    return result;
  }

  // 获取当前providers数据
  getProviders() {
    return this.config.providers;
  }
  
  // 获取完整配置
  getConfig() {
    return this.config;
  }
  
  // 重置为默认providers（用于测试）
  resetProviders() {
    this.createDefaultConfig();
    this.saveConfig();
    info('Providers reset to default configuration and saved to file');
  }

  // 404错误页面
  serve404(res) {
    res.writeHead(404, {
      'Content-Type': 'text/html; charset=utf-8'
    });
    res.end(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
          <h1>404 - Page Not Found</h1>
          <p>The requested resource was not found.</p>
          <a href="/">Go to Multi-Key Configuration UI</a>
        </body>
      </html>
    `);
  }

  // 500错误页面
  serve500(res, errorMessage) {
    res.writeHead(500, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: Date.now()
    }));
  }

  // 打开浏览器
  async openBrowser() {
    const url = `http://localhost:${this.port}`;
    
    try {
      const platform = process.platform;
      let command, args;
      
      switch (platform) {
        case 'darwin': // macOS
          command = 'open';
          args = [url];
          break;
        case 'win32': // Windows
          command = 'start';
          args = ['""', url];
          break;
        default: // Linux
          command = 'xdg-open';
          args = [url];
          break;
      }
      
      const browser = spawn(command, args, {
        detached: true,
        stdio: 'ignore'
      });
      
      browser.unref();
      success('Browser opened automatically');
      
    } catch (error) {
      log(`⚠️  Could not open browser automatically: ${error.message}`, 'yellow');
      info(`Please manually open: http://localhost:${this.port}`);
    }
  }

  // 显示使用说明
  showUsageInstructions() {
    header('🎯 Multi-Key Configuration UI Features');
    
    log('Features available in the UI:', 'cyan');
    log('  • ➕ Add new API keys to providers');
    log('  • ✏️  Edit existing API keys');
    log('  • 🗑️  Remove API keys from multi-key providers');
    log('  • 🧪 Test individual keys for connectivity');
    log('  • 🚀 Test all keys in a provider');
    log('  • 🔄 Demonstrate key rotation mechanism');
    log('  • 📁 Support for file-based key storage');
    log('  • 🔐 OAuth token management');
    log('  • 💾 Automatic configuration persistence to ~/.rcc/config.json');
    log('  • 🔄 Real-time configuration updates with auto-save');
    log('  • ➕ Add and manage providers (OpenAI, Anthropic, Gemini)');
    log('  • ✏️  Edit provider configurations and protocols');
    log('  • 🗑️  Delete providers');
    log('  • 🛣️  Manage router table and routing rules');
    log('  • 📊 Configure global settings and load balancing');
    log('  • 📤 Export/Import complete configuration');
    log('  • 🗄️  Automatic backup creation on config changes');
    log('  • ↩️  Configuration recovery and validation');
    
    log('\nSupported Protocol Types:', 'cyan');
    log('  • anthropic: Claude AI models (Anthropic API)');
    log('  • openai: GPT models (OpenAI-compatible API)');
    log('  • gemini: Gemini models (Google AI API)');
    
    log('\nSupported Authentication Types:', 'cyan');
    log('  • api_key: Standard API key authentication');
    log('  • oauth: OAuth 2.0 token authentication');
    
    log('\nConfiguration Storage:', 'cyan');
    log('  • Config Directory: ~/.rcc/');
    log('  • Main Config: ~/.rcc/config.json');
    log('  • Auto-backup: ~/.rcc/config.json.backup.[timestamp]');
    log('  • Manual backup: ~/.rcc/config.json.manual-backup.[timestamp]');
    
    log('\nKey Storage Options:', 'cyan');
    log('  • Direct: Keys stored directly in configuration');
    log('  • File-based: Keys stored in external files');
    log('  • Mixed: Combination of direct and file-based keys');
    
    log('\nControls:', 'cyan');
    log('  • Press Ctrl+C to stop the server');
    log('  • Refresh browser to reload the interface');
    
    header('🔧 Testing the Multi-Key Features');
    
    log('Try these actions in the UI:', 'yellow');
    log('  1. PROVIDERS TAB:');
    log('     • Click "Add New Provider" to create providers for different AI services');
    log('     • Edit provider settings including protocol type, base URL, and models');
    log('     • Click "Add Key" to add API keys to any provider');
    log('     • Test individual keys or entire provider configurations');
    log('  2. ROUTER TABLE TAB:');
    log('     • Click "Add Route" to create new routing rules');
    log('     • Set patterns, priorities, and provider assignments');
    log('     • Enable/disable routes and sort by priority');
    log('  3. CONFIGURATION TAB:');
    log('     • Configure global settings like load balancing strategy');
    log('     • Set rate limiting and monitoring options');
    log('     • Export/Import complete configuration as JSON');
    log('  4. ADVANCED FEATURES:');
    log('     • Use file storage option for secure key management');
    log('     • Switch between different authentication types');
    log('     • Test key rotation on multi-key providers');
  }

  // Helper methods for virtual routes API
  getConfigManager() {
    return {
      getConfig: () => this.config,
      saveConfig: (config) => {
        this.config = config;
        this.saveConfig();
      }
    };
  }

  getProvidersManager() {
    return {
      getAll: () => this.config.providers || [],
      getById: (id) => this.config.providers?.find(p => p.id === id) || null
    };
  }

  getPoolManager() {
    return {
      getAll: () => this.config.pool_entries || [],
      getByProviderId: (providerId) => this.config.pool_entries?.filter(p => p.providerId === providerId) || []
    };
  }

  // 停止服务器
  async stop() {
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
      success('Web server stopped');
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const port = args.find(arg => arg.startsWith('--port='))?.split('=')[1] || 9999;
  
  header('Multi-Key Configuration UI Server');
  info('Starting advanced multi-key authentication management interface');
  
  const server = new MultiKeyUIServer(parseInt(port));
  
  // 处理优雅退出
  process.on('SIGINT', async () => {
    log('\n🛑 Received shutdown signal', 'yellow');
    try {
      await server.stop();
      log('Goodbye! 👋', 'green');
      process.exit(0);
    } catch (error) {
      log(`Error during shutdown: ${error.message}`, 'red');
      process.exit(1);
    }
  });
  
  try {
    await server.start();
    
    // 保持服务器运行
    log('\n✨ Server is running! The UI is now accessible.', 'green');
    log('Press Ctrl+C to stop the server', 'cyan');
    
  } catch (error) {
    log(`❌ Failed to start server: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 显示帮助
function showHelp() {
  log('Multi-Key Configuration UI Server');
  log('');
  log('Usage:');
  log('  node scripts/start-multi-key-ui.js [options]');
  log('');
  log('Options:');
  log('  --port=<number>    Server port (default: 9999)');
  log('  --help, -h         Show this help message');
  log('');
  log('Examples:');
  log('  node scripts/start-multi-key-ui.js');
  log('  node scripts/start-multi-key-ui.js --port=8080');
}

// 解析命令行参数
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// 运行服务器
if (require.main === module) {
  main().catch(error => {
    log(`❌ Unhandled error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { MultiKeyUIServer };