# OpenAI Compatibility and Provider Module Replacement Plan

## 目标
使用 openai-compatible-providers-framework 替换现有的 OpenAI Compatibility 模块和 Provider 模块，同时保持 transformer 和 workflow 模块不变。

## 当前状态分析
1. **已安装框架**：openai-compatible-providers-framework@0.0.7
2. **需要替换的模块**：
   - OpenAIProviderModule.ts - 处理OpenAI兼容的API请求
   - CompatibilityModule.ts - 处理请求/响应的字段映射和转换

## 实施步骤

### 1. 创建新的 OpenAIProviderModule（基于框架）
- 继承 BaseProvider 类而不是 BasePipelineModule
- 实现 executeChat 和 executeStreamChat 抽象方法
- 使用框架的标准 chat() 方法处理请求
- 集成框架的错误处理和健康检查功能

### 2. 创建新的 CompatibilityModule（基于框架）
- 实现 ICompatibility 接口
- 提供 mapRequest 和 mapResponse 方法
- 使用框架的标准化映射功能
- 支持不同Provider之间的兼容性转换

### 3. 保持现有模块接口不变
- 确保新实现与现有流水线配置兼容
- 保持相同的配置结构和方法签名
- 确保模块可以无缝替换现有实现

### 4. 测试验证
- 验证新模块可以正确实例化
- 测试OpenAI兼容请求处理
- 验证兼容性映射功能
- 确保与现有流水线集成正常

## 技术细节

### OpenAIProviderModule 替换要点
- 从 `extends BasePipelineModule` 改为 `extends BaseProvider`
- 使用 `chat()` 方法替代自定义的 `makeOpenAIRequest()`
- 利用框架内置的认证、错误处理、健康检查
- 保持 `process()` 和 `processResponse()` 方法接口不变

### CompatibilityModule 替换要点
- 实现 `ICompatibility` 接口
- 提供 `mapRequest()` 和 `mapResponse()` 方法
- 集成框架的标准化映射表
- 支持 Provider 间的双向转换

## 风险和缓解措施
1. **模块继承冲突**：BaseProvider vs BasePipelineModule
   - 解决方案：可能需要适配器模式或重构继承关系

2. **接口不兼容**：框架API与现有接口的差异
   - 解决方案：创建包装器方法保持接口一致性

3. **配置结构变化**：框架配置与现有配置的差异
   - 解决方案：创建配置转换层

## 验证标准
- [ ] 新模块可以成功编译
- [ ] 模块可以正确实例化
- [ ] OpenAI兼容请求可以正确处理
- [ ] 兼容性映射功能正常工作
- [ ] 与现有流水线集成无问题
- [ ] 健康检查和错误处理功能正常