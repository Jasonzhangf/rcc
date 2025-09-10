# RCC Configuration Module - Test Run Instructions

## 快速开始

### 1. 环境准备

确保您的开发环境满足以下要求：

- Node.js >= 16.0.0
- npm >= 8.0.0
- Git

### 2. 安装依赖

```bash
# 克隆仓库
git clone <repository-url>
cd rcc/sharedmodule/Configuration

# 安装依赖
npm install

# 安装开发依赖
npm install --dev
```

### 3. 运行测试自动化设置

```bash
# 运行测试自动化设置脚本
node test-automation-setup.js

# 这将创建：
# - 测试目录结构
# - 配置文件
# - 测试工具
# - 测试数据
# - CI/CD 配置
```

## 运行测试

### 基本测试命令

#### 运行所有测试
```bash
npm test
```

#### 运行特定测试类型

```bash
# 运行核心配置系统测试
npm run test:ui

# 运行 Web UI 测试
npm run test:ui:watch

# 运行集成测试
npm run test:integration

# 运行自动化测试
npm run test:automation

# 运行端到端测试
npm run test:e2e
```

### 带覆盖率的测试

```bash
# 生成完整覆盖率报告
npm run test:coverage

# Web UI 测试覆盖率
npm run test:ui:coverage

# CI/CD 环境测试（包含覆盖率）
npm run test:ci
```

### 监视模式

```bash
# 监视所有测试文件变化
npm run test:watch

# 监视 Web UI 测试文件
npm run test:ui:watch
```

## 详细测试运行指南

### 1. 单元测试

#### 运行 ConfigurationSystem 测试
```bash
# 运行特定测试文件
npm test -- --testPathPattern=ConfigurationSystem.test.ts

# 运行特定测试用例
npm test -- --testNamePattern="should create configuration with default values"

# 运行测试并显示详细信息
npm test -- --testPathPattern=ConfigurationSystem.test.ts --verbose
```

#### 调试单元测试
```bash
# 运行测试并进入调试模式
node --inspect-brk node_modules/.bin/jest --runInBand ConfigurationSystem.test.ts

# 或使用 VS Code 调试
# 在 .vscode/launch.json 中添加配置
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--testNamePattern="${selectedText}""
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### 2. Web UI 测试

#### 运行 Web UI 组件测试
```bash
# 运行所有 Web UI 测试
npm run test:ui

# 运行特定 Web UI 测试
npm test -- --testPathPattern=WebUI.test.ts

# 运行 UI 测试并生成覆盖率
npm run test:ui:coverage
```

#### 运行 Web UI 自动化测试
```bash
# 运行自动化测试
npm run test:automation

# 运行特定自动化测试
npm test -- --testPathPattern=WebUIAutomation.test.ts

# 运行自动化测试并显示详细信息
npm run test:automation -- --verbose
```

### 3. 集成测试

#### 运行集成测试
```bash
# 运行所有集成测试
npm run test:integration

# 运行特定集成测试
npm test -- --testPathPattern=Integration.test.ts

# 运行集成测试并生成报告
npm test -- --testPathPattern=Integration.test.ts --coverage
```

### 4. 性能测试

#### 运行性能测试
```bash
# 运行性能测试
npm run test:performance

# 运行性能测试并分析结果
npm run test:performance -- --analyze

# 运行内存泄漏测试
npm test -- --testNamePattern="memory"
```

## 测试环境配置

### 开发环境

```bash
# 设置开发环境变量
export NODE_ENV=development
export DEBUG=true
export TEST_MODE=development

# 运行开发模式测试
npm run test:ui:watch
```

### 测试环境

```bash
# 设置测试环境变量
export NODE_ENV=test
export DEBUG=false
export TEST_MODE=test

# 运行测试模式测试
npm test
```

### CI/CD 环境

```bash
# 设置 CI/CD 环境变量
export NODE_ENV=test
export CI=true
export DEBUG=false

# 运行 CI/CD 测试
npm run test:ci
```

## 测试报告和分析

### 生成测试报告

```bash
# 生成 HTML 覆盖率报告
npm run test:coverage

# 生成 JUnit XML 报告
npm test -- --coverage --coverageReporters=junit

# 生成 Cobertura 报告
npm test -- --coverage --coverageReporters=cobertura
```

### 查看测试报告

```bash
# 打开 HTML 覆盖率报告
open coverage/lcov-report/index.html

# 查看文本覆盖率报告
cat coverage/lcov-report.txt

# 查看测试结果摘要
npm test -- --verbose
```

### 测试报告分析

```bash
# 分析测试覆盖率
npm run test:coverage

# 检查测试覆盖率是否达标
npm run test:ci

# 生成测试报告摘要
npm test -- --coverage --coverageReporters=text-summary
```

## 故障排除

### 常见问题

#### 1. 依赖问题
```bash
# 清理 node_modules
rm -rf node_modules package-lock.json

# 重新安装依赖
npm install

# 验证依赖安装
npm list
```

#### 2. 测试环境问题
```bash
# 清理测试环境
npm run test:clean

# 重新设置测试环境
node test-automation-setup.js

# 验证测试环境
npm test -- --testEnvironment=jsdom
```

#### 3. DOM 环境问题
```bash
# 检查 JSDOM 安装
npm list jsdom

# 重新安装 JSDOM
npm install --save-dev jsdom @types/jsdom

# 验证 DOM 环境
node -e "const { JSDOM } = require('jsdom'); console.log('JSDOM working');"
```

#### 4. 异步测试问题
```bash
# 增加测试超时时间
npm test -- --testTimeout=10000

# 运行单个异步测试
npm test -- --testNamePattern="async test" --runInBand

# 调试异步测试
npm test -- --testNamePattern="async test" --verbose
```

### 调试技巧

#### 1. 使用 console.log
```typescript
// 在测试中添加调试信息
test('debug example', () => {
  console.log('Debug info:', variable);
  expect(result).toBe(expected);
});
```

#### 2. 使用 Jest 调试
```bash
# 运行测试并显示详细信息
npm test -- --verbose

# 运行测试并显示堆栈跟踪
npm test -- --verbose --no-cache

# 运行测试并显示内部状态
npm test -- --verbose --detectOpenHandles --forceExit
```

#### 3. 使用浏览器调试
```typescript
// 在测试中设置断点
test('debug with breakpoint', () => {
  debugger; // 测试将在此处暂停
  const result = functionUnderTest();
  expect(result).toBe(expected);
});
```

### 性能问题

#### 1. 测试运行缓慢
```bash
# 运行测试并分析性能
npm test -- --verbose --detectOpenHandles

# 清理测试缓存
npm test -- --no-cache

# 运行测试并限制并行性
npm test -- --maxWorkers=1
```

#### 2. 内存问题
```bash
# 检查内存使用
npm test -- --verbose --detectOpenHandles

# 运行测试并监控内存
node --inspect node_modules/.bin/jest --runInBand

# 分析内存泄漏
npm test -- --testNamePattern="memory" --verbose
```

## 高级测试运行

### 并行测试

```bash
# 运行并行测试
npm test -- --maxWorkers=4

# 运行串行测试
npm test -- --runInBand

# 运行测试并控制并行性
npm test -- --maxWorkers=50%
```

### 测试筛选

```bash
# 运行特定测试文件
npm test -- ConfigurationSystem.test.ts

# 运行匹配模式的测试
npm test -- --testPathPattern="WebUI"

# 运行特定名称的测试
npm test -- --testNamePattern="should create"

# 排除特定测试
npm test -- --testPathPattern="WebUI" --testNamePattern="should not"
```

### 测试快照

```bash
# 更新测试快照
npm test -- --updateSnapshot

# 验证测试快照
npm test -- --testNamePattern="snapshot"

# 删除过时的快照
npm test -- --testNamePattern="snapshot" --ci
```

## CI/CD 集成

### GitHub Actions

```bash
# 本地测试 GitHub Actions
npm run act

# 验证 CI/CD 配置
npm run test:ci

# 生成 CI/CD 报告
npm run test:ci -- --coverage --coverageReporters=cobertura
```

### 本地 CI/CD 模拟

```bash
# 运行完整的 CI 流程
npm run test:ci

# 验证所有测试通过
npm run validate:tests

# 生成 CI/CD 报告
npm run test:ci -- --coverage --coverageReporters=junit
```

## 测试数据管理

### 使用测试夹具

```bash
# 加载测试夹具
npm test -- --setupFiles=./__test__/fixtures/setup.js

# 使用特定测试夹具
npm test -- --testNamePattern="with fixture"

# 创建新的测试夹具
node -e "
const fs = require('fs');
const fixture = { test: 'data' };
fs.writeFileSync('__test__/fixtures/new-fixture.json', JSON.stringify(fixture, null, 2));
"
```

### 测试数据清理

```bash
# 清理测试数据
npm run test:clean

# 重置测试数据库
npm test -- --setupFiles=./__test__/fixtures/cleanup.js

# 验证测试数据清理
npm test -- --testNamePattern="cleanup"
```

## 最佳实践

### 1. 测试组织
```bash
# 按功能组织测试
npm test -- --testPathPattern="features/"

# 按组件组织测试
npm test -- --testPathPattern="components/"

# 按集成级别组织测试
npm test -- --testPathPattern="integration/"
```

### 2. 测试命名
```bash
# 使用描述性测试名称
npm test -- --testNamePattern="should [do something]"

# 使用一致的命名约定
npm test -- --testNamePattern="when [condition] should [result]"

# 使用测试分组
npm test -- --testNamePattern="[Component] should [do something]"
```

### 3. 测试维护
```bash
# 定期运行测试
npm test

# 更新测试依赖
npm update --dev

# 清理过时的测试
npm test -- --testNamePattern="deprecated" --passWithNoTests
```

## 总结

本文档提供了 RCC Configuration Module 测试的详细运行指南。通过遵循这些步骤，您可以有效地运行、调试和维护测试套件。

记住：
- 定期运行测试以确保代码质量
- 使用覆盖率报告来识别未测试的代码
- 在 CI/CD 流程中集成测试以自动化质量检查
- 使用调试工具来解决测试问题

如果您遇到任何问题，请参考故障排除部分或查看详细的测试文档。