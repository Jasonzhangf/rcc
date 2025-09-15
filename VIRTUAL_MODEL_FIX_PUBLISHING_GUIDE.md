# RCC 虚拟模型修复发布指南

## 修复内容

本次修复解决了RCC系统中虚拟模型注册的异步/同步问题，确保虚拟模型能够在系统启动时正确注册。

### 主要修改

1. **ServerModule.ts** - 修复了 `loadVirtualModelsFromConfig` 方法的异步调用问题
   - 将方法从同步改为异步（`async`）
   - 使用 `await` 确保虚拟模型注册完成后再继续
   - 添加了详细的调试日志

2. **模块版本统一** - 统一了所有模块的rcc-configuration依赖版本为0.1.1

## 发布步骤

### 1. Server模块发布

```bash
cd sharedmodule/server

# 构建模块
npm run build

# 增加版本号
npm version patch  # 或 minor/minor 根据变更程度

# 发布到npm
npm publish
```

### 2. 可选：Bootstrap模块发布（如果有修改）

```bash
cd sharedmodule/bootstrap

# 构建模块
npm run build

# 增加版本号
npm version patch

# 发布到npm
npm publish
```

### 3. 主项目发布

```bash
cd /Users/fanzhang/Documents/github/rcc

# 更新依赖到最新版本
npm update

# 构建主项目
npm run build

# 增加版本号
npm version patch

# 发布到npm
npm publish
```

## 安装说明

### 全局安装

```bash
npm install -g rcc@latest
```

### 本地开发安装

```bash
# 克隆项目
git clone <repository-url>
cd rcc

# 安装依赖
npm install

# 构建所有模块
npm run build

# 启动系统
node start-rcc-system.mjs
```

## 验证修复

启动系统后，应该能看到以下日志：

```
=== Checking condition for loading virtual models ===
=== Calling loadVirtualModelsFromConfig ===
=== loadVirtualModelsFromConfig called ===
Virtual model registered successfully: [model-id]
=== loadVirtualModelsFromConfig call completed ===
```

API测试应该正常工作，不再出现"No enabled virtual models available"错误。

## 注意事项

1. 确保所有模块版本兼容
2. 发布前运行完整测试套件
3. 遵循语义化版本控制
4. 更新CHANGELOG.md