/**
 * Qwen Server Token Management Test Script
 * 测试Qwen服务器的token刷新和解析逻辑
 */

import { QwenProviderModule, QwenProviderConfig } from './sharedmodule/pipeline/src/modules/QwenProviderModule';
import { ModuleInfo } from './src/index';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const testConfig: QwenProviderConfig = {
  provider: 'qwen',
  endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  auth: {
    type: 'oauth2',
    accessTokenFile: './test-data/qwen-access-token.json',
    refreshTokenFile: './test-data/qwen-refresh-token.json',
    tokenStoreDir: './test-data',
    autoRefresh: true,
    refreshThreshold: 5 * 60 * 1000, // 5 minutes
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
    maxFileSize: 1024 * 1024 // 1MB
  }
};

// Module info
const moduleInfo: ModuleInfo = {
  id: 'qwen-provider-test',
  name: 'Qwen Provider Test',
  version: '1.0.0',
  type: 'provider',
  description: 'Test module for Qwen provider token management',
  metadata: {
    author: 'Test Suite',
    tags: ['test', 'qwen', 'token'],
    capabilities: ['token-management', 'oauth2', 'api-calls']
  }
};

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
  
  const qwenModule = new QwenProviderModule(moduleInfo);
  
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
  
  const qwenModule = new QwenProviderModule(moduleInfo);
  
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
  
  const qwenModule = new QwenProviderModule(moduleInfo);
  
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
      log.message.includes('refresh') || 
      log.method === 'refreshToken'
    );
    
    console.log('Token refresh logs found:', refreshLogs.length);
    
    if (refreshLogs.length > 0) {
      console.log('✅ Token refresh test passed');
      refreshLogs.forEach((log: any) => {
        console.log(`  - ${log.method}: ${log.message}`);
      });
    } else {
      console.log('❌ Token refresh test failed - no refresh logs found');
    }
    
  } catch (error) {
    console.error('❌ Token refresh test failed:', error);
  }
}

async function testTokenExpiration(): Promise<void> {
  console.log('\n📋 Testing Token Expiration Logic...');
  
  const qwenModule = new QwenProviderModule(moduleInfo);
  
  try {
    // Configure with short expiration for testing
    const shortExpirationConfig = {
      ...testConfig,
      auth: {
        ...testConfig.auth,
        refreshThreshold: 1000 // 1 second for testing
      }
    };
    
    qwenModule.configure(shortExpirationConfig);
    
    // Initialize the module
    await qwenModule.initialize();
    
    // Check if token is expired or about to expire
    const debugLogs = qwenModule.getDebugLogs('debug', 10);
    const expirationLogs = debugLogs.filter((log: any) => 
      log.message.includes('expired') || 
      log.message.includes('refresh timer')
    );
    
    console.log('Token expiration logs found:', expirationLogs.length);
    
    if (expirationLogs.length > 0) {
      console.log('✅ Token expiration test passed');
      expirationLogs.forEach((log: any) => {
        console.log(`  - ${log.message}`);
      });
    } else {
      console.log('⚠️ Token expiration test - no expiration detected (tokens may be valid)');
    }
    
  } catch (error) {
    console.error('❌ Token expiration test failed:', error);
  }
}

async function testTokenStorage(): Promise<void> {
  console.log('\n📋 Testing Token Storage...');
  
  const qwenModule = new QwenProviderModule(moduleInfo);
  
  try {
    // Configure the module
    qwenModule.configure(testConfig);
    
    // Initialize the module
    await qwenModule.initialize();
    
    // Check if token files exist
    const accessTokenFile = testConfig.auth.accessTokenFile;
    const refreshTokenFile = testConfig.auth.refreshTokenFile;
    
    const accessTokenExists = fs.existsSync(accessTokenFile);
    const refreshTokenExists = fs.existsSync(refreshTokenFile);
    
    console.log('Token storage files:');
    console.log(`  - Access token file (${accessTokenFile}): ${accessTokenExists ? '✅ exists' : '❌ missing'}`);
    console.log(`  - Refresh token file (${refreshTokenFile}): ${refreshTokenExists ? '✅ exists' : '❌ missing'}`);
    
    if (accessTokenExists && refreshTokenExists) {
      // Read and parse token files
      const accessTokenData = JSON.parse(fs.readFileSync(accessTokenFile, 'utf-8'));
      const refreshTokenData = JSON.parse(fs.readFileSync(refreshTokenFile, 'utf-8'));
      
      console.log('Token file contents:');
      console.log(`  - Access token: ${accessTokenData.access_token ? '✅ present' : '❌ missing'}`);
      console.log(`  - Refresh token: ${refreshTokenData.refresh_token ? '✅ present' : '❌ missing'}`);
      console.log(`  - Token type: ${accessTokenData.token_type}`);
      console.log(`  - Expires in: ${accessTokenData.expires_in} seconds`);
      console.log(`  - Scope: ${accessTokenData.scope}`);
      
      console.log('✅ Token storage test passed');
    } else {
      console.log('❌ Token storage test failed - token files missing');
    }
    
  } catch (error) {
    console.error('❌ Token storage test failed:', error);
  }
}

async function testErrorHandling(): Promise<void> {
  console.log('\n📋 Testing Error Handling...');
  
  const qwenModule = new QwenProviderModule(moduleInfo);
  
  try {
    // Configure with invalid token files
    const invalidConfig = {
      ...testConfig,
      auth: {
        ...testConfig.auth,
        accessTokenFile: './test-data/non-existent-access-token.json',
        refreshTokenFile: './test-data/non-existent-refresh-token.json'
      }
    };
    
    qwenModule.configure(invalidConfig);
    
    // This should handle missing token files gracefully
    await qwenModule.initialize();
    
    // Check error logs
    const debugLogs = qwenModule.getDebugLogs('error', 10);
    const errorLogs = debugLogs.filter((log: any) => 
      log.message.includes('token') || 
      log.message.includes('file') ||
      log.message.includes('failed')
    );
    
    console.log('Error handling logs found:', errorLogs.length);
    
    if (errorLogs.length > 0) {
      console.log('✅ Error handling test passed - errors were properly logged');
      errorLogs.forEach((log: any) => {
        console.log(`  - ${log.level}: ${log.message}`);
      });
    } else {
      console.log('⚠️ Error handling test - no errors detected (may be normal)');
    }
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error);
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
    await testTokenExpiration();
    await testTokenStorage();
    await testErrorHandling();
    
    console.log('\n🎉 All Qwen token management tests completed!');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  } finally {
    // Cleanup
    await cleanupTestEnvironment();
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

export {
  setupTestEnvironment,
  cleanupTestEnvironment,
  testTokenLoading,
  testTokenParsing,
  testTokenRefresh,
  testTokenExpiration,
  testTokenStorage,
  testErrorHandling,
  runAllTests
};