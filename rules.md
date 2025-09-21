# RCC Debug Rules

## 🎯 Purpose
统一调试日志记录规则，确保所有模块使用相同的debug方法。

## 📋 Debug方法使用规则

### 基础日志记录方法
```typescript
// 使用BaseModule的debug方法进行日志记录
this.debug(level: string, message: string, context: Record<string, unknown>, operation?: string): void

// 标准日志级别
this.debug('debug', message, context, operation);
this.debug('info', message, context, operation);
this.debug('warn', message, context, operation);
this.debug('error', message, context, operation);
```

### 便捷日志记录方法
```typescript
// 在PipelineBaseModule中已封装的便捷方法
private logDebug(message: string, context?: Record<string, unknown>, operation?: string): void
private logError(message: string, context?: Record<string, unknown>, operation?: string): void
```

### 调试配置
```typescript
// 启用调试功能
enableTwoPhaseDebug(enabled: boolean, baseDirectory?: string): void

// 设置录制配置
setRecordingConfig(config: RecordingConfig): void
```

## 🚫 禁止行为
- 禁止创建新的调试方法
- 禁止使用console.log等原生日志
- 禁止直接调用DebugCenter，必须通过BaseModule接口
- 禁止重复实现已有调试功能

## ✅ 允许行为
- 使用已有的BaseModule.debug方法
- 使用PipelineBaseModule封装的logDebug/logError方法
- 修改现有模块以使用统一的调试接口
- 在README中说明调试功能使用方法

## 📁 文件修改规则
- 只修改现有文件，不创建新文件
- 检查模块根目录README确认功能
- 确保编译成功再测试
- 保持向后兼容性