# RCC 模块输入输出日志记录指南

## 概述

RCC系统提供了完整的模块输入输出日志记录功能，确保每个模块的所有IO操作都被准确记录和追踪。

## 系统架构

### 核心组件

1. **TwoPhaseDebugSystem** - 主要调试系统
   - 支持系统启动阶段和端口运行阶段
   - 自动日志轮转和文件管理
   - 存储位置：`~/.rcc/debug-logs/`

2. **ModuleLogger** - 模块级日志记录器
   - 为每个模块提供独立的IO日志记录
   - 支持输入输出清理和敏感信息过滤
   - 提供性能统计和错误跟踪

## 使用方法

### 1. 基础使用

```javascript
import { debugSystem, createModuleLogger, withIOLogging } from '../src/debug/index.mjs';

// 创建模块日志记录器
const moduleLogger = createModuleLogger('user-service', 'UserService');

// 手动记录输入输出
class UserService {
  async loginUser(username, password) {
    const startTime = Date.now();
    
    try {
      // 记录输入
      moduleLogger.logInput('loginUser', { username, password: '[REDACTED]' });
      
      // 执行业务逻辑
      const result = await this.authenticate(username, password);
      
      // 记录输出
      const duration = Date.now() - startTime;
      moduleLogger.logOutput('loginUser', result, duration);
      
      return result;
    } catch (error) {
      // 记录错误
      moduleLogger.logError('loginUser', error, { username });
      throw error;
    }
  }
}
```

### 2. 使用装饰器自动记录

```javascript
import { withIOLogging } from '../src/debug/index.mjs';

class UserService {
  @withIOLogging('user-service', 'UserService')
  async loginUser(username, password) {
    // 输入输出会自动记录
    return await this.authenticate(username, password);
  }
  
  @withIOLogging('user-service', 'UserService')
  async getUserProfile(userId) {
    // 输入输出会自动记录
    return await this.fetchUserData(userId);
  }
}
```

### 3. 流水线处理记录

```javascript
import { debugSystem, createModuleLogger } from '../src/debug/index.mjs';

class PipelineProcessor {
  constructor() {
    this.logger = createModuleLogger('pipeline', 'PipelineProcessor');
  }
  
  async processRequest(request) {
    const requestId = this.generateRequestId();
    
    // 记录请求开始
    this.logger.logRequestStart(requestId, request);
    
    try {
      // 阶段1: 预处理
      const preprocessed = await this.preprocess(request);
      this.logger.logInput('preprocess', request);
      this.logger.logOutput('preprocess', preprocessed, 0);
      
      // 阶段2: 主处理
      const processed = await this.mainProcess(preprocessed);
      this.logger.logInput('mainProcess', preprocessed);
      this.logger.logOutput('mainProcess', processed, 0);
      
      // 阶段3: 后处理
      const result = await this.postprocess(processed);
      this.logger.logInput('postprocess', processed);
      this.logger.logOutput('postprocess', result, 0);
      
      // 记录请求完成
      const duration = Date.now() - startTime;
      this.logger.logRequestEnd(requestId, result, duration);
      
      return result;
    } catch (error) {
      this.logger.logError('processRequest', error, { requestId });
      throw error;
    }
  }
}
```

## 配置选项

### 模块日志配置

```javascript
import { ModuleLogger } from '../src/debug/index.mjs';

const moduleLogger = new ModuleLogger(debugSystem);

await moduleLogger.configure({
  enableModuleLevelLogging: true,      // 启用模块级日志
  enableRequestResponseLogging: true,  // 启用请求响应日志
  enablePerformanceMetrics: true,      // 启用性能指标
  enableErrorTracking: true,           // 启用错误跟踪
  logDirectory: '~/.rcc/debug-logs'    // 日志目录
});
```

### 调试系统配置

```javascript
import { initializeDebugSystem } from '../src/debug/index.mjs';

// 初始化调试系统
const debugSystem = initializeDebugSystem('~/.rcc/debug-logs');

// 切换到端口模式
debugSystem.switchToPortMode(5506);
```

## 日志格式

### 输入日志格式
```json
{
  "moduleId": "user-service",
  "moduleName": "UserService",
  "type": "input",
  "data": {
    "methodName": "loginUser",
    "input": {
      "username": "admin",
      "password": "[REDACTED]"
    },
    "timestamp": 1694937600000,
    "phase": "port"
  },
  "timestamp": 1694937600000
}
```

### 输出日志格式
```json
{
  "moduleId": "user-service",
  "moduleName": "UserService",
  "type": "output",
  "data": {
    "methodName": "loginUser",
    "output": {
      "success": true,
      "userId": 123,
      "token": "[REDACTED]"
    },
    "duration": 150,
    "timestamp": 1694937600150,
    "phase": "port"
  },
  "timestamp": 1694937600150
}
```

### 错误日志格式
```json
{
  "moduleId": "user-service",
  "moduleName": "UserService",
  "type": "error",
  "data": {
    "methodName": "loginUser",
    "error": {
      "message": "Invalid credentials",
      "stack": "Error: Invalid credentials\n    at UserService.authenticate...",
      "name": "AuthenticationError"
    },
    "context": {
      "username": "admin"
    },
    "timestamp": 1694937600000,
    "phase": "port"
  },
  "timestamp": 1694937600000
}
```

## 性能监控

### 获取模块统计信息

```javascript
// 获取单个模块统计
const stats = moduleLogger.getModuleStats('user-service');
console.log('模块统计:', stats);

// 获取所有模块统计
const allStats = moduleLogger.getAllModuleStats();
console.log('所有模块统计:', allStats);
```

### 统计信息格式
```json
{
  "moduleId": "user-service",
  "moduleName": "UserService",
  "totalCalls": 1250,
  "totalErrors": 15,
  "totalRequests": 800,
  "averageResponseTime": 145.5,
  "lastActivity": 1694937600000,
  "successRate": 98.8,
  "methodStats": {
    "loginUser": {
      "calls": 500,
      "errors": 5,
      "totalTime": 75000,
      "averageTime": 150
    }
  }
}
```

## 日志文件结构

```
~/.rcc/debug-logs/
├── systemstart/           # 系统启动阶段日志
│   ├── 2025-09-17.jsonl
│   └── modules/
│       ├── config-loader/
│       └── system-init/
├── port-5506/            # 端口5506运行阶段日志
│   ├── 2025-09-17.jsonl
│   └── modules/
│       ├── user-service/
│       ├── pipeline/
│       └── api-handler/
└── port-5507/            # 端口5507运行阶段日志
    ├── 2025-09-17.jsonl
    └── modules/
```

## 最佳实践

### 1. 敏感信息处理
- 密码、令牌等敏感信息会自动标记为 `[REDACTED]`
- 可以自定义敏感字段列表

### 2. 大数据处理
- 超过1000字符的输出会被截断
- 使用 `[TRUNCATED]` 标记

### 3. 错误处理
- 所有错误都会记录完整的堆栈信息
- 包含上下文信息便于调试

### 4. 性能优化
- 日志文件自动轮转，避免文件过大
- 支持异步写入，不影响主业务性能

## 维护和清理

### 清理旧日志
```javascript
import { cleanupOldLogs } from '../src/debug/index.mjs';

// 清理30天前的日志文件
cleanupOldLogs(30);
```

### 日志轮转配置
- 单个日志文件最大10MB
- 最多保留5个轮转文件
- 自动压缩旧文件

通过这个完整的IO日志记录系统，您可以准确追踪每个模块的所有输入输出操作，便于调试、性能分析和问题排查。