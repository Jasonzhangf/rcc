#!/usr/bin/env node

/**
 * 配置模块HTTP服务器
 * 为WebUI提供RESTful API接口
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

// 服务器配置
const PORT = 5001;
const CONFIG_DIR = path.join(require('os').homedir(), '.rcc');

// 确保配置目录存在
async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create config directory:', error);
  }
}

// 解析请求体
async function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

// 处理CORS
function handleCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// 创建默认配置
function createDefaultConfig(existingConfig = null) {
  const now = new Date().toISOString();
  
  // 如果存在现有配置，保留providers和其他重要数据
  if (existingConfig) {
    return {
      ...existingConfig,
      updatedAt: now
    };
  }
  
  // 检查是否存在现有的配置文件
  try {
    const fs = require('fs');
    const configPath = path.join(CONFIG_DIR, 'config.json');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const existing = JSON.parse(content);
      return {
        ...existing,
        updatedAt: now
      };
    }
  } catch (error) {
    console.log('Failed to read existing config file:', error);
  }
  
  return {
    version: '1.0.0',
    providers: {},
    virtualModels: {
      'default': {
        targets: []
      },
      'longcontext': {
        targets: []
      },
      'thinking': {
        targets: []
      },
      'background': {
        targets: []
      },
      'websearch': {
        targets: []
      },
      'vision': {
        targets: []
      },
      'coding': {
        targets: []
      }
    },
    createdAt: now,
    updatedAt: now
  };
}

// API路由处理
async function handleRequest(req, res) {
  handleCors(res);
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  const configPath = path.join(CONFIG_DIR, 'config.json');
  
  try {
    // 获取配置
    if (req.method === 'GET' && url.pathname === '/api/config') {
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(config, null, 2));
      } catch (error) {
        if (error.code === 'ENOENT') {
          // 文件不存在，返回默认配置
          const defaultConfig = createDefaultConfig();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(defaultConfig, null, 2));
        } else {
          throw error;
        }
      }
    }
    // 保存配置
    else if (req.method === 'PUT' && url.pathname === '/api/config') {
      const config = await parseRequestBody(req);
      config.updatedAt = new Date().toISOString();
      
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Configuration saved successfully' }));
    }
    // 创建新配置
    else if (req.method === 'POST' && url.pathname === '/api/config') {
      const defaultConfig = createDefaultConfig();
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(defaultConfig, null, 2));
    }
    // 生成流水线表
    else if (req.method === 'POST' && url.pathname === '/api/pipeline') {
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        
        // 生成流水线表逻辑
        const pipelineTable = new Map();
        
        // 为每个虚拟模型生成流水线表项
        Object.entries(config.virtualModels).forEach(([vmId, virtualModel]) => {
          if (virtualModel.targets) {
            virtualModel.targets.forEach((target, index) => {
              if (target.providerId && target.modelId) {
                const provider = config.providers[target.providerId];
                if (provider) {
                  // 如果有API密钥，为每个密钥生成一条独立的流水线
                  if (Array.isArray(provider.api_key) && provider.api_key.length > 0) {
                    provider.api_key.forEach((key, keyIndex) => {
                      const entryId = `${vmId}_${target.providerId}_${target.modelId}_${keyIndex}`;
                      pipelineTable.set(entryId, {
                        virtualModelId: vmId,
                        targetProvider: target.providerId,
                        targetModel: target.modelId,
                        apiKeyIndex: keyIndex,
                        enabled: virtualModel.enabled !== false,
                        priority: virtualModel.priority || 1
                      });
                    });
                  } else {
                    // 没有API密钥的情况
                    const entryId = `${vmId}_${target.providerId}_${target.modelId}`;
                    pipelineTable.set(entryId, {
                      virtualModelId: vmId,
                      targetProvider: target.providerId,
                      targetModel: target.modelId,
                      apiKeyIndex: 0,
                      enabled: virtualModel.enabled !== false,
                      priority: virtualModel.priority || 1
                    });
                  }
                }
              }
            });
          }
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(Object.fromEntries(pipelineTable), null, 2));
      } catch (error) {
        if (error.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Configuration file not found' }));
        } else {
          console.error('Pipeline generation error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to generate pipeline table' }));
        }
      }
    }
    // 生成流水线装配配置
    else if (req.method === 'POST' && url.pathname === '/api/pipeline/assembly') {
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        
        // 生成流水线表逻辑
        const pipelineTable = new Map();
        
        // 为每个虚拟模型生成流水线表项
        Object.entries(config.virtualModels).forEach(([vmId, virtualModel]) => {
          if (virtualModel.targets) {
            virtualModel.targets.forEach((target, index) => {
              if (target.providerId && target.modelId) {
                const provider = config.providers[target.providerId];
                if (provider) {
                  // 如果有API密钥，为每个密钥生成一条独立的流水线
                  if (Array.isArray(provider.api_key) && provider.api_key.length > 0) {
                    provider.api_key.forEach((key, keyIndex) => {
                      const entryId = `${vmId}_${target.providerId}_${target.modelId}_${keyIndex}`;
                      pipelineTable.set(entryId, {
                        virtualModelId: vmId,
                        targetProvider: target.providerId,
                        targetModel: target.modelId,
                        apiKeyIndex: keyIndex,
                        enabled: virtualModel.enabled !== false,
                        priority: virtualModel.priority || 1
                      });
                    });
                  } else {
                    // 没有API密钥的情况
                    const entryId = `${vmId}_${target.providerId}_${target.modelId}`;
                    pipelineTable.set(entryId, {
                      virtualModelId: vmId,
                      targetProvider: target.providerId,
                      targetModel: target.modelId,
                      apiKeyIndex: 0,
                      enabled: virtualModel.enabled !== false,
                      priority: virtualModel.priority || 1
                    });
                  }
                }
              }
            });
          }
        });
        
        // 转换为装配配置格式
        const assemblyConfigs = [];
        const virtualModelGroups = {};
        
        // 按虚拟模型分组
        for (const [entryId, entry] of Object.entries(Object.fromEntries(pipelineTable))) {
          if (!virtualModelGroups[entry.virtualModelId]) {
            virtualModelGroups[entry.virtualModelId] = [];
          }
          virtualModelGroups[entry.virtualModelId].push(entry);
        }
        
        // 为每个虚拟模型创建装配配置
        for (const [virtualModelId, entries] of Object.entries(virtualModelGroups)) {
          // 为每个条目创建单独的流水线
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const pipelineId = `${virtualModelId}_${entry.targetProvider}_${entry.targetModel}_${entry.apiKeyIndex}`;
            
            // 创建模块配置
            const modules = [
              // 兼容性模块 - 处理请求格式转换
              {
                id: `compatibility-${pipelineId}`,
                type: 'compatibility',
                config: {
                  targetProvider: entry.targetProvider,
                  targetModel: entry.targetModel,
                  useFramework: true
                }
              },
              // 提供商模块 - 实际调用提供商API
              {
                id: `provider-${pipelineId}`,
                type: 'provider',
                config: {
                  providerId: entry.targetProvider,
                  modelId: entry.targetModel,
                  keyIndex: entry.apiKeyIndex,
                  useFramework: true
                }
              },
              // 工作流模块 - 处理工作流逻辑
              {
                id: `workflow-${pipelineId}`,
                type: 'workflow',
                config: {
                  virtualModelId: entry.virtualModelId,
                  useFramework: true
                }
              }
            ];
            
            // 创建模块连接
            const connections = [
              // 请求流：工作流 -> 兼容性 -> 提供商
              {
                source: `workflow-${pipelineId}`,
                target: `compatibility-${pipelineId}`,
                type: 'request'
              },
              {
                source: `compatibility-${pipelineId}`,
                target: `provider-${pipelineId}`,
                type: 'request'
              },
              // 响应流：提供商 -> 兼容性 -> 工作流
              {
                source: `provider-${pipelineId}`,
                target: `compatibility-${pipelineId}`,
                type: 'response'
              },
              {
                source: `compatibility-${pipelineId}`,
                target: `workflow-${pipelineId}`,
                type: 'response'
              }
            ];
            
            // 创建装配配置
            const assemblyConfig = {
              id: pipelineId,
              name: `Pipeline for ${virtualModelId} routing to ${entry.targetProvider}/${entry.targetModel}`,
              version: '1.0.0',
              description: `Pipeline for virtual model ${virtualModelId} with provider ${entry.targetProvider}, model ${entry.targetModel}, key index ${entry.apiKeyIndex}`,
              modules,
              connections
            };
            
            assemblyConfigs.push(assemblyConfig);
          }
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(assemblyConfigs, null, 2));
      } catch (error) {
        if (error.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Configuration file not found' }));
        } else {
          console.error('Pipeline assembly config generation error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to generate pipeline assembly config' }));
        }
      }
    }
    // 生成流水线系统配置
    else if (req.method === 'POST' && url.pathname === '/api/pipeline/system') {
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        
        // 生成流水线表逻辑
        const pipelineTable = new Map();
        
        // 为每个虚拟模型生成流水线表项
        Object.entries(config.virtualModels).forEach(([vmId, virtualModel]) => {
          if (virtualModel.targets) {
            virtualModel.targets.forEach((target, index) => {
              if (target.providerId && target.modelId) {
                const provider = config.providers[target.providerId];
                if (provider) {
                  // 如果有API密钥，为每个密钥生成一条独立的流水线
                  if (Array.isArray(provider.api_key) && provider.api_key.length > 0) {
                    provider.api_key.forEach((key, keyIndex) => {
                      const entryId = `${vmId}_${target.providerId}_${target.modelId}_${keyIndex}`;
                      pipelineTable.set(entryId, {
                        virtualModelId: vmId,
                        targetProvider: target.providerId,
                        targetModel: target.modelId,
                        apiKeyIndex: keyIndex,
                        enabled: virtualModel.enabled !== false,
                        priority: virtualModel.priority || 1
                      });
                    });
                  } else {
                    // 没有API密钥的情况
                    const entryId = `${vmId}_${target.providerId}_${target.modelId}`;
                    pipelineTable.set(entryId, {
                      virtualModelId: vmId,
                      targetProvider: target.providerId,
                      targetModel: target.modelId,
                      apiKeyIndex: 0,
                      enabled: virtualModel.enabled !== false,
                      priority: virtualModel.priority || 1
                    });
                  }
                }
              }
            });
          }
        });
        
        // 转换为系统配置格式
        const pipelines = Object.entries(Object.fromEntries(pipelineTable)).map(([entryId, entry]) => ({
          id: `${entry.virtualModelId}_${entry.targetProvider}_${entry.targetModel}_${entry.apiKeyIndex}`,
          name: `Pipeline for ${entry.virtualModelId} (${entry.targetProvider}/${entry.targetModel})`,
          type: 'model-routing',
          enabled: entry.enabled !== false,
          priority: entry.priority || 1,
          weight: 1,
          maxConcurrentRequests: 100,
          timeout: 30000
        }));
        
        const systemConfig = {
          loadBalancer: {
            strategy: 'roundrobin',
            healthCheckInterval: 30000
          },
          scheduler: {
            defaultTimeout: 30000,
            maxRetries: 3
          },
          pipelines
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(systemConfig, null, 2));
      } catch (error) {
        if (error.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Configuration file not found' }));
        } else {
          console.error('Pipeline system config generation error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to generate pipeline system config' }));
        }
      }
    }
    // 默认生成流水线表 (GET请求)
    else if (req.method === 'GET' && url.pathname === '/api/pipeline') {
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        
        // 生成流水线表逻辑
        const pipelineTable = new Map();
        
        // 为每个虚拟模型生成流水线表项
        Object.entries(config.virtualModels).forEach(([vmId, virtualModel]) => {
          if (virtualModel.targets) {
            virtualModel.targets.forEach((target, index) => {
              if (target.providerId && target.modelId) {
                const provider = config.providers[target.providerId];
                if (provider) {
                  // 如果有API密钥，为每个密钥生成一条独立的流水线
                  if (Array.isArray(provider.api_key) && provider.api_key.length > 0) {
                    provider.api_key.forEach((key, keyIndex) => {
                      const entryId = `${vmId}_${target.providerId}_${target.modelId}_${keyIndex}`;
                      pipelineTable.set(entryId, {
                        virtualModelId: vmId,
                        targetProvider: target.providerId,
                        targetModel: target.modelId,
                        apiKeyIndex: keyIndex,
                        enabled: virtualModel.enabled !== false,
                        priority: virtualModel.priority || 1
                      });
                    });
                  } else {
                    // 没有API密钥的情况
                    const entryId = `${vmId}_${target.providerId}_${target.modelId}`;
                    pipelineTable.set(entryId, {
                      virtualModelId: vmId,
                      targetProvider: target.providerId,
                      targetModel: target.modelId,
                      apiKeyIndex: 0,
                      enabled: virtualModel.enabled !== false,
                      priority: virtualModel.priority || 1
                    });
                  }
                }
              }
            });
          }
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(Object.fromEntries(pipelineTable), null, 2));
      } catch (error) {
        if (error.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Configuration file not found' }));
        } else {
          console.error('Pipeline generation error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to generate pipeline table' }));
        }
      }
    }
    // 静态文件服务
    else if (req.method === 'GET') {
      let filePath = url.pathname;
      if (filePath === '/' || filePath === '/index.html') {
        filePath = '/simple-config-ui.html';
      }
      
      const absolutePath = path.join(__dirname, filePath);
      
      // 安全检查，确保文件在当前目录内
      if (!absolutePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      
      try {
        const content = await fs.readFile(absolutePath);
        const ext = path.extname(absolutePath).toLowerCase();
        const contentType = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.json': 'application/json'
        }[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (error) {
        if (error.code === 'ENOENT') {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          throw error;
        }
      }
    }
    // 404
    else {
      res.writeHead(404);
      res.end('Not Found');
    }
  } catch (error) {
    console.error('Request handling error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// 启动服务器
async function startServer() {
  await ensureConfigDir();
  
  const server = http.createServer(handleRequest);
  
  server.listen(PORT, () => {
    console.log(`🚀 配置模块API服务器启动成功!`);
    console.log(`📂 服务器将在 http://localhost:${PORT} 上运行`);
    console.log(`📄 WebUI可在 http://localhost:${PORT}/ 访问`);
    console.log(`📄 API接口可在 http://localhost:${PORT}/api/ 访问`);
    console.log(`🛑 按 Ctrl+C 停止服务器`);
  });
  
  server.on('error', (error) => {
    console.error('Server error:', error);
  });
}

// 启动服务器
startServer().catch(console.error);