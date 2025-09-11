# RCC4 两阶段Debug系统配置说明

## 概述

RCC4系统现在已经实现了两阶段debug配置系统，按照您的要求：

- **第一阶段（systemstart）**: 端口初始化前，使用`systemstart`目录记录日志
- **第二阶段（port-directory）**: 端口初始化后，使用端口特定目录记录日志

## 系统架构

### 目录结构
```
debug-logs/
├── systemstart/          # 系统启动阶段日志
│   ├── 2025-09-10.jsonl  # 按日期分割的日志文件
│   ├── config/          # 配置系统相关日志
│   ├── providers/       # 提供商管理相关日志
│   └── registry/        # 模块注册相关日志
└── port-5506/           # 端口特定阶段日志
    ├── 2025-09-10.jsonl  # 按日期分割的日志文件
    ├── routes/          # API路由相关日志
    ├── websocket/       # WebSocket相关日志
    └── monitoring/      # 监控系统相关日志
```

### 日志文件格式

日志文件采用JSONL格式（每行一个JSON对象），包含以下字段：

```json
{
  "timestamp": "2025-09-10T23:58:07.366Z",
  "level": "info",
  "message": "Debug system initialized",
  "data": {"phase": "systemstart", "directory": "debug-logs/systemstart"},
  "method": "initializeDirectories",
  "phase": "systemstart",
  "port": null,
  "directory": "debug-logs/systemstart"
}
```

## 启动过程

### 第一阶段：System Start（端口初始化前）
1. 创建`debug-logs/systemstart`目录
2. 初始化debug系统配置
3. 加载系统配置文件
4. 初始化系统组件：
   - 模块注册表
   - 配置系统
   - 提供商管理

### 第二阶段：Port Initialization（端口初始化后）
1. 从配置中提取端口号（默认5506）
2. 切换debug系统到端口模式
3. 创建`debug-logs/port-{port}`目录
4. 初始化端口特定组件：
   - HTTP服务器
   - API路由
   - WebSocket服务器
   - 监控系统

## 使用方法

### 启动RCC4系统
```bash
node rcc4-system-startup.js
```

### 环境变量配置
```bash
# 配置文件路径
export RCC4_CONFIG=~/.route-claudecode/config/v4/single-provider/lmstudio-v4-5506.json

# 端口号
export RCC4_PORT=5506
```

### 查看日志
```bash
# 查看系统启动阶段日志
cat debug-logs/systemstart/2025-09-10.jsonl

# 查看端口特定阶段日志
cat debug-logs/port-5506/2025-09-10.jsonl

# 实时查看日志
tail -f debug-logs/port-5506/2025-09-11.jsonl
```

## 核心组件

### TwoPhaseDebugSystem
核心debug系统类，提供两阶段日志记录功能：

- **目录管理**: 自动创建systemstart和port-specific目录
- **日志轮转**: 基于文件大小的自动日志轮转
- **日志级别**: 支持trace、debug、info、warn、error级别
- **配置管理**: 动态配置更新
- **清理功能**: 自动清理旧日志文件

### RCC4SystemStartup
系统启动管理类，负责：

- 两阶段启动流程控制
- 组件初始化顺序管理
- 配置文件加载和验证
- 优雅关闭处理

## 日志分析

### 启动流程分析
```bash
# 查看启动时间线
grep "timestamp" debug-logs/systemstart/2025-09-10.jsonl | head -20

# 查看错误日志
grep '"level":"error"' debug-logs/port-5506/2025-09-10.jsonl

# 查看性能数据
grep '"memoryUsage"' debug-logs/port-5506/2025-09-10.jsonl
```

### 目录对比
```bash
# 对比systemstart和port阶段的日志数量
wc -l debug-logs/systemstart/2025-09-10.jsonl debug-logs/port-5506/2025-09-10.jsonl

# 查看目录大小
du -sh debug-logs/systemstart/ debug-logs/port-5506/
```

## 配置选项

### Debug系统配置
```javascript
{
  enabled: true,                    // 是否启用debug
  level: 'debug',                   // 日志级别
  enableFileLogging: true,          // 是否启用文件日志
  enableConsoleLogging: true,       // 是否启用控制台日志
  maxFileSize: 10 * 1024 * 1024,    // 最大文件大小（10MB）
  maxLogFiles: 5,                   // 最大日志文件数量
  baseDirectory: './debug-logs'     // 基础日志目录
}
```

### 启动配置
```javascript
{
  startupSequence: {
    enableTwoPhaseDebug: true,       // 启用两阶段debug
    debugBeforePort: true,           // 端口初始化前开始debug
    switchToPortMode: true,          // 切换到端口模式
    startupTimeout: 30000            // 启动超时时间（ms）
  }
}
```

## 监控和维护

### 健康检查
系统每30秒执行一次健康检查并记录日志：
```json
{
  "timestamp": "2025-09-10T23:59:07.371Z",
  "level": "debug",
  "message": "Health check passed",
  "data": {
    "timestamp": "2025-09-10T23:59:07.371Z",
    "port": 5506
  },
  "method": "healthCheck",
  "phase": "port",
  "port": 5506,
  "directory": "debug-logs/port-5506"
}
```

### 日志清理
系统每24小时自动清理超过7天的日志文件。

### 系统状态
启动完成后，系统记录详细的状态信息：
```json
{
  "system": "RCC4",
  "version": "4.0",
  "port": 5506,
  "debugPhase": "port",
  "debugDirectory": "debug-logs/port-5506",
  "providers": 1,
  "uptime": 0.013815875,
  "memoryUsage": {
    "rss": 46825472,
    "heapTotal": 6881280,
    "heapUsed": 4497496,
    "external": 1451897,
    "arrayBuffers": 10515
  }
}
```

## 故障排除

### 常见问题
1. **目录创建失败**: 检查文件系统权限
2. **日志写入失败**: 检查磁盘空间
3. **配置文件不存在**: 系统会使用默认配置
4. **端口冲突**: 检查端口是否被占用

### 调试技巧
1. 查看systemstart日志诊断启动问题
2. 查看port-specific日志诊断运行时问题
3. 使用日志级别过滤关注重要信息
4. 检查内存使用情况监控资源消耗

## 总结

RCC4系统的两阶段debug配置已经完全实现了您的要求：

✅ **systemstart阶段**: 端口初始化前使用`systemstart`目录
✅ **port-directory阶段**: 端口初始化后使用端口特定目录
✅ **自动目录创建**: 根据阶段自动创建相应的目录结构
✅ **日志轮转**: 基于文件大小和时间的自动日志管理
✅ **系统监控**: 内置健康检查和状态监控
✅ **优雅关闭**: 支持信号处理的优雅关闭机制

这个系统提供了完整的RCC4模块启动配置，每个模块都可以按照这个模式进行两阶段debug配置。