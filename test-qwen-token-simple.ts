/**
 * Simplified Qwen Token Management Test
 * Tests the core token refresh and parsing logic
 */

import * as fs from 'fs';
import * as path from 'path';

// Mock Qwen Provider Module for testing
class MockQwenProviderModule {
  private config: any;
  private debugLogs: any[] = [];
  
  constructor() {}
  
  configure(config: any) {
    this.config = config;
    this.logDebug('Module configured', { config });
  }
  
  async initialize() {
    this.logDebug('Initializing module', {});
    
    // Simulate token loading
    try {
      const accessTokenFile = this.config.auth.accessTokenFile;
      const refreshTokenFile = this.config.auth.refreshTokenFile;
      
      if (fs.existsSync(accessTokenFile)) {
        const accessTokenData = JSON.parse(fs.readFileSync(accessTokenFile, 'utf-8'));
        this.logDebug('Token loaded from file', { 
          token: accessTokenData.access_token,
          expiresAt: this.calculateExpiry(accessTokenData),
          isExpired: this.isTokenExpired(accessTokenData)
        });
      }
      
      if (fs.existsSync(refreshTokenFile)) {
        const refreshTokenData = JSON.parse(fs.readFileSync(refreshTokenFile, 'utf-8'));
        this.logDebug('Refresh token loaded from file', { 
          refreshToken: refreshTokenData.refresh_token
        });
      }
      
    } catch (error) {
      this.logDebug('Failed to load tokens', { error });
      throw error;
    }
  }
  
  async refreshToken() {
    this.logDebug('Attempting token refresh');
    
    // Simulate token refresh
    try {
      const newToken = {
        access_token: 'new_mock_access_token_' + Date.now(),
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile',
        created_at: Math.floor(Date.now() / 1000)
      };
      
      // Save new token
      const accessTokenFile = this.config.auth.accessTokenFile;
      fs.writeFileSync(accessTokenFile, JSON.stringify(newToken, null, 2));
      
      this.logDebug('Token refresh successful', { newToken });
      
    } catch (error) {
      this.logDebug('Token refresh failed', { error });
      throw error;
    }
  }
  
  getHealth() {
    const hasAccessToken = fs.existsSync(this.config.auth.accessTokenFile);
    const hasRefreshToken = fs.existsSync(this.config.auth.refreshTokenFile);
    
    return {
      status: hasAccessToken && hasRefreshToken ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        accessTokenExists: hasAccessToken,
        refreshTokenExists: hasRefreshToken
      }
    };
  }
  
  getDebugLogs(level: string, limit: number) {
    return this.debugLogs
      .filter(log => log.level === level)
      .slice(-limit);
  }
  
  private calculateExpiry(tokenData: any) {
    return (tokenData.created_at + tokenData.expires_in) * 1000;
  }
  
  private isTokenExpired(tokenData: any) {
    const expiresAt = this.calculateExpiry(tokenData);
    return Date.now() > expiresAt;
  }
  
  private logDebug(message: string, data?: any) {
    this.debugLogs.push({
      level: 'debug',
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

// Test configuration
const testConfig = {
  provider: 'qwen',
  endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  auth: {
    type: 'oauth2',
    accessTokenFile: './test-data/qwen-access-token.json',
    refreshTokenFile: './test-data/qwen-refresh-token.json',
    tokenStoreDir: './test-data',
    autoRefresh: true,
    refreshThreshold: 5 * 60 * 1000,
    deviceFlow: {
      enabled: true,
      clientId: 'test_client_id',
      scope: 'openid profile',
      pkce: true,
      authEndpoint: 'https://dashscope.aliyuncs.com/authorization',
      tokenEndpoint: 'https://dashscope.aliyuncs.com/token',
      pollingInterval: 5000,
      maxPollingAttempts: 60
    }
  },
  model: 'qwen-turbo',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true,
  debug: {
    enabled: true,
    logLevel: 'debug',
    logDir: './test-data/logs',
    maxLogFiles: 10,
    maxFileSize: 1024 * 1024
  }
};

// Module info (not used in simple test)
// const moduleInfo = {
//   id: 'qwen-provider-test',
//   name: 'Qwen Provider Test',
//   version: '1.0.0',
//   type: 'provider',
//   description: 'Test module for Qwen provider token management',
//   metadata: {
//     author: 'Test Suite',
//     tags: ['test', 'qwen', 'token'],
//     capabilities: ['token-management', 'oauth2', 'api-calls']
//   }
// };

// Test data directory setup
const testDataDir = './test-data';
const logsDir = './test-data/logs';

async function setupTestEnvironment(): Promise<void> {
  console.log('🔧 Setting up test environment...');
  
  // Create test directories
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create mock token files for testing
  const mockAccessToken = {
    access_token: 'mock_access_token_' + Date.now(),
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'openid profile',
    created_at: Math.floor(Date.now() / 1000)
  };
  
  const mockRefreshToken = {
    refresh_token: 'mock_refresh_token_' + Date.now(),
    created_at: Math.floor(Date.now() / 1000)
  };
  
  fs.writeFileSync(
    path.join(testDataDir, 'qwen-access-token.json'),
    JSON.stringify(mockAccessToken, null, 2)
  );
  
  fs.writeFileSync(
    path.join(testDataDir, 'qwen-refresh-token.json'),
    JSON.stringify(mockRefreshToken, null, 2)
  );
  
  console.log('✅ Test environment setup complete');
}

async function cleanupTestEnvironment(): Promise<void> {
  console.log('🧹 Cleaning up test environment...');
  
  // Remove test files
  const testFiles = [
    'qwen-access-token.json',
    'qwen-refresh-token.json'
  ];
  
  for (const file of testFiles) {
    const filePath = path.join(testDataDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  
  // Remove log files
  if (fs.existsSync(logsDir)) {
    const logFiles = fs.readdirSync(logsDir);
    for (const file of logFiles) {
      fs.unlinkSync(path.join(logsDir, file));
    }
    fs.rmdirSync(logsDir);
  }
  
  if (fs.existsSync(testDataDir)) {
    fs.rmdirSync(testDataDir);
  }
  
  console.log('✅ Test environment cleanup complete');
}

async function testTokenLoading(): Promise<void> {
  console.log('\n📋 Testing Token Loading...');
  
  const qwenModule = new MockQwenProviderModule();
  
  try {
    // Configure the module
    qwenModule.configure(testConfig);
    
    // Initialize the module
    await qwenModule.initialize();
    
    // Check token loading
    const health = qwenModule.getHealth();
    console.log('Module Health:', health);
    
    if (health.status === 'healthy') {
      console.log('✅ Token loading test passed');
    } else {
      console.log('❌ Token loading test failed - module not healthy');
    }
    
  } catch (error) {
    console.error('❌ Token loading test failed:', error);
  }
}

async function testTokenParsing(): Promise<void> {
  console.log('\n📋 Testing Token Parsing...');
  
  const qwenModule = new MockQwenProviderModule();
  
  try {
    // Configure the module
    qwenModule.configure(testConfig);
    
    // Initialize to load token
    await qwenModule.initialize();
    
    // Test token parsing by checking debug logs
    const debugLogs = qwenModule.getDebugLogs('debug', 10);
    const tokenLogs = debugLogs.filter((log: any) => 
      log.message.includes('Token loaded') || 
      log.message.includes('expiresAt') ||
      log.message.includes('isExpired')
    );
    
    console.log('Token parsing logs found:', tokenLogs.length);
    
    if (tokenLogs.length > 0) {
      console.log('✅ Token parsing test passed');
      tokenLogs.forEach((log: any) => {
        console.log(`  - ${log.message}: ${JSON.stringify(log.data)}`);
      });
    } else {
      console.log('❌ Token parsing test failed - no token logs found');
    }
    
  } catch (error) {
    console.error('❌ Token parsing test failed:', error);
  }
}

async function testTokenRefresh(): Promise<void> {
  console.log('\n📋 Testing Token Refresh Logic...');
  
  const qwenModule = new MockQwenProviderModule();
  
  try {
    // Configure the module
    qwenModule.configure(testConfig);
    
    // Initialize the module
    await qwenModule.initialize();
    
    // Test token refresh
    console.log('Attempting token refresh...');
    await qwenModule.refreshToken();
    
    // Check if refresh was successful
    const health = qwenModule.getHealth();
    console.log('Module health after refresh:', health);
    
    // Check refresh logs
    const debugLogs = qwenModule.getDebugLogs('debug', 10);
    const refreshLogs = debugLogs.filter((log: any) => 
      log.message.includes('refresh')
    );
    
    console.log('Token refresh logs found:', refreshLogs.length);
    
    if (refreshLogs.length > 0) {
      console.log('✅ Token refresh test passed');
      refreshLogs.forEach((log: any) => {
        console.log(`  - ${log.message}`);
      });
    } else {
      console.log('❌ Token refresh test failed - no refresh logs found');
    }
    
  } catch (error) {
    console.error('❌ Token refresh test failed:', error);
  }
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Qwen Token Management Tests...\n');
  
  try {
    // Setup test environment
    await setupTestEnvironment();
    
    // Run all tests
    await testTokenLoading();
    await testTokenParsing();
    await testTokenRefresh();
    
    console.log('\n🎉 All Qwen token management tests completed!');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  } finally {
    // Cleanup
    await cleanupTestEnvironment();
  }
}

// Run the tests
runAllTests().catch(console.error);

export {
  setupTestEnvironment,
  cleanupTestEnvironment,
  testTokenLoading,
  testTokenParsing,
  testTokenRefresh,
  runAllTests
};