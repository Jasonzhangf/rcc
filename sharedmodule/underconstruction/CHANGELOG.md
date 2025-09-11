# 变更日志

## [0.1.0] - 2024-09-11

### 🎉 首次发布

### 新增
- 初始版本发布
- 显式标记未完成功能，替代 mock 站位
- 精确的调用位置追踪功能
- 功能描述和预期行为记录
- 完整的调用历史记录
- 详细的统计信息生成
- 灵活的配置选项（异常抛出、日志记录等）
- 完整的单元测试覆盖
- 完整的 TypeScript 类型支持
- ESM 和 CommonJS 双构建支持
- 详细的开发指南和 API 文档

### 核心特性
- 🔍 **显式标记**：明确标识未完成的功能，而不是使用 mock 站位
- 📍 **调用追踪**：记录调用位置，知道哪个文件的哪个函数调用了未完成功能
- 📝 **功能描述**：记录功能描述和预期行为，说明该功能应该做什么
- 📊 **开发提示**：提供开发阶段的明确提示和统计信息
- ⚙️ **灵活配置**：支持多种配置选项，包括异常抛出和日志记录
- 🏗️ **模块化设计**：继承自 BaseModule，符合 RCC 架构规范
- 🔒 **类型安全**：完整的 TypeScript 类型定义
- 📈 **统计分析**：提供未完成功能的详细统计信息

### 主要 API
- `markFeature()` - 标记未完成功能
- `callUnderConstructionFeature()` - 调用未完成功能
- `getUnderConstructionFeatures()` - 获取所有未完成功能
- `getFeature()` - 获取特定功能信息
- `getCallHistory()` - 获取调用历史
- `completeFeature()` - 完成功能
- `updateFeatureDescription()` - 更新功能描述
- `getStatistics()` - 获取统计信息
- `clearCallHistory()` - 清除调用历史

### 类型定义
- `UnderConstructionOptions` - 功能标记选项
- `CallContext` - 调用上下文信息
- `UnderConstructionFeature` - 未完成功能信息
- `UnderConstructionCall` - 调用记录
- `UnderConstructionStatistics` - 统计信息
- `UnderConstructionError` - 自定义错误类型

### 文档
- 完整的 README 文档，包含开发指南和最佳实践
- 详细的使用示例 (USAGE_EXAMPLES.md)
- 完整的 API 参考
- 变更日志

### 开发工具
- Jest 单元测试
- ESLint 代码规范检查
- Prettier 代码格式化
- TypeScript 类型检查
- Rollup 构建工具
- 完整的 npm 脚本支持