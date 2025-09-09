#!/usr/bin/env node

// 简单的语法检查脚本
try {
  console.log('🔍 Checking syntax of start-multi-key-ui.js...');
  
  // 尝试require模块来检查语法
  const { MultiKeyUIServer } = require('./scripts/start-multi-key-ui.js');
  
  console.log('✅ Syntax check passed');
  
  // 测试基本实例化
  const server = new MultiKeyUIServer(0);
  console.log('✅ Server instance created successfully');
  console.log('  - Config path:', server.configPath);
  console.log('  - Config dir:', server.configDir);
  console.log('  - Next ID:', server.nextId);
  
  // 测试配置初始化（不启动HTTP服务器）
  server.initializeConfig();
  console.log('✅ Configuration initialized');
  
  // 检查配置文件是否被创建
  const fs = require('fs');
  if (fs.existsSync(server.configPath)) {
    console.log('✅ Config file created at:', server.configPath);
    const config = JSON.parse(fs.readFileSync(server.configPath, 'utf8'));
    console.log('✅ Config file is valid JSON');
    console.log('  - Version:', config.version);
    console.log('  - Providers count:', config.providers.length);
  } else {
    console.log('❌ Config file not found');
  }
  
} catch (error) {
  console.error('❌ Syntax or runtime error:', error.message);
  console.error(error.stack);
  process.exit(1);
}