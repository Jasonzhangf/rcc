# RCC Config-Management 模块开发指南

## 开发环境配置

### 本地开发依赖
在开发阶段，本模块使用本地路径依赖以方便调试和快速迭代：

```json
"dependencies": {
  "rcc-basemodule": "file:../basemodule",
  "rcc-config-parser": "file:../config-parser"
}
```

这种配置允许：
1. 实时查看依赖模块的代码更改
2. 快速调试跨模块问题
3. 简化开发流程

### 生产环境依赖
在准备发布到 npm 时，需要将依赖更改为官方发布的版本：

```json
"dependencies": {
  "rcc-basemodule": "^0.1.5",
  "rcc-config-parser": "^0.1.0"
}
```

## 开发流程

### 1. 环境设置
```bash
# 克隆整个仓库
git clone <repository-url>
cd rcc

# 安装所有模块的依赖
npm install
cd sharedmodule/basemodule && npm install
cd ../config-parser && npm install
cd ../config-management && npm install
```

### 2. 构建顺序
由于存在本地依赖关系，需要按以下顺序构建：

```bash
# 1. 构建基础模块
cd sharedmodule/basemodule
npm run build

# 2. 构建配置解析模块
cd ../config-parser
npm run build

# 3. 构建配置管理模块
cd ../config-management
npm run build
```

### 3. 开发调试
```bash
# 启动开发模式（监视模式）
cd sharedmodule/basemodule
npm run dev

# 在另一个终端中
cd ../config-parser
npm run dev

# 在第三个终端中
cd ../config-management
npm run dev
```

## 发布流程

### 1. 依赖版本更新
在发布前，需要将 package.json 中的依赖从本地路径更新为 npm 版本：

```bash
# 更新 package.json
npm version patch  # 或 minor/major 根据更改类型

# 验证依赖版本
npm install
```

### 2. 构建验证
```bash
# 清理构建目录
npm run clean

# 构建模块
npm run build

# 验证构建结果
npm run test
```

### 3. 发布到 npm
```bash
# 登录 npm
npm login

# 发布模块
npm publish
```

## 注意事项

### 本地开发注意事项
1. 确保所有依赖模块都在同一仓库中
2. 构建顺序很重要，避免引用未构建的模块
3. 本地路径依赖在 npm 发布时会自动解析为正确的版本

### 生产使用注意事项
1. 最终用户应该使用 npm 安装的版本
2. 避免直接使用本地路径依赖进行生产部署
3. 确保依赖版本兼容性

## 常见问题

### 1. 构建失败
如果遇到模块找不到的错误，请检查：
- 所有依赖模块是否已正确安装
- 构建顺序是否正确
- 本地路径是否正确

### 2. 版本冲突
如果遇到版本冲突问题：
- 检查依赖模块的版本兼容性
- 确保使用相同版本的基础模块

### 3. 调试困难
- 使用两阶段调试系统记录详细日志
- 启用 IO 跟踪功能
- 利用 BaseModule 提供的调试工具

## 最佳实践

### 代码组织
1. 遵循 RCC 模块命名规范
2. 使用 TypeScript 进行开发
3. 实现完整的接口定义

### 测试策略
1. 编写单元测试覆盖核心功能
2. 进行集成测试验证模块交互
3. 性能测试确保响应时间达标

### 文档维护
1. 及时更新 README.md
2. 提供详细的 API 文档
3. 创建使用示例和最佳实践指南