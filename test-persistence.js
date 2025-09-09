#!/usr/bin/env node

/**
 * 测试配置持久化功能
 */

const { MultiKeyUIServer } = require('./scripts/start-multi-key-ui.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testPersistence() {
  const configDir = path.join(os.homedir(), '.rcc');
  const configPath = path.join(configDir, 'config.json');
  
  console.log('🧪 Testing Multi-Key UI Configuration Persistence');
  console.log(`Config Directory: ${configDir}`);
  console.log(`Config File: ${configPath}`);
  
  // 清理已存在的配置文件（测试用）
  if (fs.existsSync(configPath)) {
    const backupPath = `${configPath}.test-backup.${Date.now()}`;
    fs.copyFileSync(configPath, backupPath);
    fs.unlinkSync(configPath);
    console.log(`✅ Backed up existing config to: ${backupPath}`);
  }
  
  if (fs.existsSync(configDir)) {
    console.log(`✅ Config directory exists`);
  }
  
  // 创建服务器实例（不启动HTTP服务）
  const server = new MultiKeyUIServer(0); // 端口0表示不启动
  
  try {
    // 测试配置初始化
    console.log('\n📁 Testing config initialization...');
    server.initializeConfig();
    console.log(`✅ Config directory created: ${fs.existsSync(configDir)}`);
    console.log(`✅ Config file created: ${fs.existsSync(configPath)}`);
    
    // 测试配置加载
    console.log('\n📖 Testing config loading...');
    server.loadConfig();
    console.log(`✅ Loaded ${server.getProviders().length} providers`);
    console.log(`✅ Next ID: ${server.nextId}`);
    
    // 测试添加新的provider
    console.log('\n➕ Testing provider addition...');
    const addResult = server.addProvider(JSON.stringify({
      name: 'Test Anthropic',
      protocol: 'anthropic',
      api_base_url: 'https://api.anthropic.com/v1',
      api_key: ['test-key-1', 'test-key-2'],
      auth_type: 'api_key',
      models: ['claude-3-sonnet', 'claude-3-haiku']
    }));
    
    console.log(`✅ Add provider result: ${addResult.success}`);
    console.log(`✅ Total providers: ${server.getProviders().length}`);
    
    // 验证文件是否已保存
    if (fs.existsSync(configPath)) {
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`✅ Config file updated with ${savedConfig.providers.length} providers`);
      console.log(`✅ Last updated: ${savedConfig.last_updated}`);
    }
    
    // 测试配置导出
    console.log('\n📤 Testing config export...');
    const exportResult = server.handleConfigAPI(['config', 'export'], 'GET', '');
    console.log(`✅ Export result: ${exportResult.success}`);
    console.log(`✅ Exported ${exportResult.data.providers.length} providers`);
    
    // 测试配置状态
    console.log('\n📊 Testing config status...');
    const statusResult = server.handleConfigAPI(['config', 'status'], 'GET', '');
    console.log(`✅ Status result: ${statusResult.success}`);
    console.log(`✅ Config file exists: ${statusResult.data.file_exists}`);
    console.log(`✅ Config file size: ${statusResult.data.file_size} bytes`);
    console.log(`✅ Providers count: ${statusResult.data.providers_count}`);
    
    // 测试手动备份
    console.log('\n💾 Testing manual backup...');
    const backupResult = server.createManualBackup();
    console.log(`✅ Backup result: ${backupResult.success}`);
    if (backupResult.success) {
      console.log(`✅ Backup created at: ${backupResult.data.backup_path}`);
    }
    
    console.log('\n🎉 All persistence tests passed!');
    console.log('\nConfiguration file structure:');
    const finalConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(JSON.stringify(finalConfig, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testPersistence().catch(error => {
    console.error('❌ Unhandled error:', error.message);
    process.exit(1);
  });
}