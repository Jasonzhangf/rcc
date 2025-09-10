/**
 * Qwen Code OAuth2 认证模块
 * 基于 CLIProxyAPI 的实现进行移植
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// OAuth2 配置
const QWEN_OAUTH_CONFIG = {
  deviceCodeEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/device/code',
  tokenEndpoint: 'https://chat.qwen.ai/api/v1/oauth2/token',
  clientId: 'f0304373b74a44d2b584a3fb70ca9e56',
  scope: 'openid profile email model.completion',
  grantType: 'urn:ietf:params:oauth:grant-type:device_code'
};

// Token 数据结构
class QwenTokenData {
  constructor(data) {
    this.accessToken = data.access_token || '';
    this.refreshToken = data.refresh_token || '';
    this.tokenType = data.token_type || 'Bearer';
    this.resourceUrl = data.resource_url || 'portal.qwen.ai';
    this.expiresIn = data.expires_in || 0;
    this.expiresAt = this.calculateExpiry(data.expires_in);
  }
  
  calculateExpiry(expiresIn) {
    return Date.now() + (expiresIn * 1000);
  }
  
  isExpired() {
    // 提前5分钟判断过期
    return Date.now() >= (this.expiresAt - 300000);
  }
  
  toJSON() {
    return {
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
      token_type: this.tokenType,
      resource_url: this.resourceUrl,
      expiry_date: new Date(this.expiresAt).toISOString(),
      last_refresh: new Date().toISOString()
    };
  }
  
  static fromJSON(jsonData) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    return new QwenTokenData({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      resource_url: data.resource_url,
      expires_in: Math.floor((new Date(data.expiry_date).getTime() - Date.now()) / 1000)
    });
  }
}

// 设备流响应结构
class DeviceFlow {
  constructor(data) {
    this.deviceCode = data.device_code || '';
    this.userCode = data.user_code || '';
    this.verificationUri = data.verification_uri || '';
    this.verificationUriComplete = data.verification_uri_complete || '';
    this.expiresIn = data.expires_in || 300;
    this.interval = data.interval || 5;
    this.codeVerifier = data.code_verifier || '';
  }
}

// Qwen OAuth2 认证类
class QwenOAuth2Auth {
  constructor(config = {}) {
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });
    this.config = config;
  }
  
  // 生成 PKCE code verifier
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }
  
  // 生成 PKCE code challenge
  generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    return crypto.subtle.digest('SHA-256', data).then(hash => {
      return this.base64UrlEncode(new Uint8Array(hash));
    });
  }
  
  // Base64 URL 编码
  base64UrlEncode(buffer) {
    return btoa(String.fromCharCode.apply(null, buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  // 生成 PKCE 对
  async generatePKCEPair() {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    return { codeVerifier, codeChallenge };
  }
  
  // 启动设备授权流程
  async initiateDeviceFlow() {
    try {
      // 生成 PKCE 对
      const { codeVerifier, codeChallenge } = await this.generatePKCEPair();
      
      // 构建设备授权请求
      const params = new URLSearchParams({
        client_id: QWEN_OAUTH_CONFIG.clientId,
        scope: QWEN_OAUTH_CONFIG.scope,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });
      
      console.log('📡 请求设备授权...');
      const response = await this.httpClient.post(QWEN_OAUTH_CONFIG.deviceCodeEndpoint, params.toString());
      
      if (response.status !== 200) {
        throw new Error(`设备授权失败: ${response.status} ${response.statusText}`);
      }
      
      const deviceFlow = new DeviceFlow({
        ...response.data,
        code_verifier: codeVerifier
      });
      
      console.log('✅ 设备授权流程启动');
      console.log(`  用户代码: ${deviceFlow.userCode}`);
      console.log(`  验证 URI: ${deviceFlow.verificationUri}`);
      console.log(`  完整 URI: ${deviceFlow.verificationUriComplete}`);
      
      return deviceFlow;
      
    } catch (error) {
      console.error('❌ 启动设备授权流程失败:', error.message);
      throw error;
    }
  }
  
  // 轮询获取 token
  async pollForToken(deviceCode, codeVerifier, options = {}) {
    const {
      maxAttempts = 60,
      pollingInterval = 5000,
      onPolling = null,
      onUserCodeDisplay = null
    } = options;
    
    console.log('⏳ 开始轮询获取 token...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 轮询尝试 ${attempt}/${maxAttempts}...`);
        
        if (onPolling) {
          onPolling(attempt, maxAttempts);
        }
        
        const params = new URLSearchParams({
          grant_type: QWEN_OAUTH_CONFIG.grantType,
          client_id: QWEN_OAUTH_CONFIG.clientId,
          device_code: deviceCode,
          code_verifier: codeVerifier
        });
        
        const response = await this.httpClient.post(QWEN_OAUTH_CONFIG.tokenEndpoint, params.toString());
        
        if (response.status === 200) {
          console.log('✅ Token 获取成功！');
          return new QwenTokenData(response.data);
        }
        
        if (response.status === 400) {
          const errorData = response.data;
          
          switch (errorData.error) {
            case 'authorization_pending':
              console.log('⏳ 授权待处理...');
              break;
            case 'slow_down':
              console.log('🐌 请求减速，增加轮询间隔');
              pollingInterval = Math.min(pollingInterval * 1.5, 10000);
              break;
            case 'expired_token':
              throw new Error('设备代码已过期，请重新开始认证流程');
            case 'access_denied':
              throw new Error('授权被用户拒绝');
            default:
              throw new Error(`授权失败: ${errorData.error} - ${errorData.error_description || ''}`);
          }
        } else {
          throw new Error(`Token 轮询失败: ${response.status} ${response.statusText}`);
        }
        
      } catch (error) {
        if (error.response?.status !== 400) {
          console.error(`⚠️ 轮询尝试 ${attempt} 失败:`, error.message);
        }
      }
      
      // 等待下一次轮询
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }
    
    throw new Error('认证超时，请重新开始认证流程');
  }
  
  // 刷新 token
  async refreshToken(refreshToken) {
    try {
      console.log('🔄 刷新 access token...');
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: QWEN_OAUTH_CONFIG.clientId
      });
      
      const response = await this.httpClient.post(QWEN_OAUTH_CONFIG.tokenEndpoint, params.toString());
      
      if (response.status !== 200) {
        throw new Error(`Token 刷新失败: ${response.status} ${response.statusText}`);
      }
      
      console.log('✅ Token 刷新成功！');
      return new QwenTokenData(response.data);
      
    } catch (error) {
      console.error('❌ Token 刷新失败:', error.message);
      throw error;
    }
  }
  
  // 带重试的 token 刷新
  async refreshTokenWithRetry(refreshToken, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.refreshToken(refreshToken);
      } catch (error) {
        console.warn(`⚠️ Token 刷新尝试 ${attempt}/${maxRetries} 失败:`, error.message);
        
        if (attempt === maxRetries) {
          throw new Error(`Token 刷新失败，已重试 ${maxRetries} 次: ${error.message}`);
        }
        
        // 等待后重试
        const delay = attempt * 1000;
        console.log(`⏳ 等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Token 存储管理
class QwenTokenStorage {
  constructor(storageDir = './auth') {
    this.storageDir = storageDir;
    this.ensureStorageDir();
  }
  
  ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }
  
  getFilePath(email) {
    return path.join(this.storageDir, `qwen-${email}.json`);
  }
  
  async saveToken(tokenData, email) {
    try {
      const filePath = this.getFilePath(email);
      const storageData = {
        ...tokenData.toJSON(),
        email,
        type: 'qwen'
      };
      
      await fs.promises.writeFile(filePath, JSON.stringify(storageData, null, 2));
      console.log(`💾 Token 已保存到: ${filePath}`);
      
      return storageData;
    } catch (error) {
      console.error('❌ 保存 token 失败:', error.message);
      throw error;
    }
  }
  
  async loadToken(email) {
    try {
      const filePath = this.getFilePath(email);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const data = await fs.promises.readFile(filePath, 'utf8');
      const tokenData = JSON.parse(data);
      
      return QwenTokenData.fromJSON(tokenData);
    } catch (error) {
      console.error('❌ 加载 token 失败:', error.message);
      return null;
    }
  }
  
  async deleteToken(email) {
    try {
      const filePath = this.getFilePath(email);
      
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`🗑️ Token 已删除: ${filePath}`);
      }
    } catch (error) {
      console.error('❌ 删除 token 失败:', error.message);
      throw error;
    }
  }
  
  listTokens() {
    try {
      const files = fs.readdirSync(this.storageDir);
      return files
        .filter(file => file.startsWith('qwen-') && file.endsWith('.json'))
        .map(file => file.replace('qwen-', '').replace('.json', ''));
    } catch (error) {
      console.error('❌ 列出 token 失败:', error.message);
      return [];
    }
  }
}

// 完整的 Qwen Code OAuth2 认证管理器
class QwenCodeAuthManager {
  constructor(config = {}) {
    this.auth = new QwenOAuth2Auth(config);
    this.storage = new QwenTokenStorage(config.storageDir);
    this.currentToken = null;
    this.currentEmail = null;
  }
  
  // 完整的认证流程
  async authenticate(options = {}) {
    const {
      email,
      autoSave = true,
      onUserCodeDisplay = null,
      onPolling = null
    } = options;
    
    try {
      console.log('🚀 开始 Qwen Code OAuth2 认证流程...');
      
      // 1. 启动设备授权流程
      const deviceFlow = await this.auth.initiateDeviceFlow();
      
      // 2. 显示用户代码
      console.log('\n🌐 需要用户授权:');
      console.log(`  1. 访问: ${deviceFlow.verificationUriComplete}`);
      console.log(`  2. 输入代码: ${deviceFlow.userCode}`);
      console.log(`  3. 授权应用\n`);
      
      if (onUserCodeDisplay) {
        onUserCodeDisplay(deviceFlow);
      }
      
      // 3. 获取用户邮箱
      const userEmail = email || await this.promptForEmail();
      
      // 4. 轮询获取 token
      const tokenData = await this.auth.pollForToken(
        deviceFlow.deviceCode,
        deviceFlow.codeVerifier,
        {
          onPolling,
          maxAttempts: options.maxAttempts || 60,
          pollingInterval: options.pollingInterval || 5000
        }
      );
      
      // 5. 保存 token
      if (autoSave) {
        await this.storage.saveToken(tokenData, userEmail);
      }
      
      // 6. 设置当前 token
      this.currentToken = tokenData;
      this.currentEmail = userEmail;
      
      console.log('🎉 Qwen Code OAuth2 认证成功！');
      console.log(`  用户: ${userEmail}`);
      console.log(`  过期时间: ${new Date(tokenData.expiresAt).toLocaleString()}`);
      
      return { tokenData, email: userEmail };
      
    } catch (error) {
      console.error('❌ 认证流程失败:', error.message);
      throw error;
    }
  }
  
  // 提示用户输入邮箱
  async promptForEmail() {
    // 在实际应用中，这里应该弹出 UI 让用户输入
    // 这里简化为返回一个默认邮箱
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question('请输入您的邮箱地址: ', (email) => {
        rl.close();
        resolve(email.trim() || 'default@example.com');
      });
    });
  }
  
  // 获取有效的 token
  async getValidToken(email) {
    if (!email) {
      throw new Error('邮箱地址不能为空');
    }
    
    let tokenData = await this.storage.loadToken(email);
    
    // 如果 token 不存在或已过期，尝试刷新
    if (!tokenData) {
      throw new Error(`未找到用户 ${email} 的 token，请先进行认证`);
    }
    
    if (tokenData.isExpired()) {
      console.log('⚠️ Token 已过期，尝试刷新...');
      
      if (tokenData.refreshToken) {
        try {
          tokenData = await this.auth.refreshTokenWithRetry(tokenData.refreshToken);
          await this.storage.saveToken(tokenData, email);
          console.log('✅ Token 刷新成功');
        } catch (error) {
          console.error('❌ Token 刷新失败，需要重新认证:', error.message);
          throw new Error('Token 已过期且刷新失败，请重新进行认证');
        }
      } else {
        throw new Error('Token 已过期且无 refresh token，请重新进行认证');
      }
    }
    
    this.currentToken = tokenData;
    this.currentEmail = email;
    
    return tokenData;
  }
  
  // 检查 token 状态
  async checkTokenStatus(email) {
    try {
      const tokenData = await this.storage.loadToken(email);
      
      if (!tokenData) {
        return { status: 'not_found', message: '未找到 token' };
      }
      
      if (tokenData.isExpired()) {
        return { 
          status: 'expired', 
          message: 'Token 已过期',
          expiresAt: tokenData.expiresAt,
          hasRefreshToken: !!tokenData.refreshToken
        };
      }
      
      return {
        status: 'valid',
        message: 'Token 有效',
        expiresAt: tokenData.expiresAt,
        accessToken: tokenData.accessToken.substring(0, 20) + '...'
      };
      
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
  
  // 删除 token
  async removeToken(email) {
    await this.storage.deleteToken(email);
    
    if (this.currentEmail === email) {
      this.currentToken = null;
      this.currentEmail = null;
    }
  }
  
  // 获取当前 token
  getCurrentToken() {
    return this.currentToken;
  }
  
  // 获取当前邮箱
  getCurrentEmail() {
    return this.currentEmail;
  }
}

module.exports = {
  QwenOAuth2Auth,
  QwenTokenData,
  DeviceFlow,
  QwenTokenStorage,
  QwenCodeAuthManager,
  QWEN_OAUTH_CONFIG
};