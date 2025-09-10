# RCC Configuration Module - Test Documentation

## 概述

RCC Configuration Module 的测试套件提供了全面的测试覆盖，包括单元测试、集成测试、Web UI 测试和自动化测试。本文档详细说明了测试结构、运行方法和最佳实践。

## 测试结构

### 目录结构

```
__test__/
├── ConfigurationSystem.test.ts    # 核心配置系统测试
├── WebUI.test.ts                  # Web UI 组件测试
├── Integration.test.ts            # 集成测试
├── WebUIAutomation.test.ts        # Web UI 自动化测试
├── setup.ts                       # 测试环境设置
├── jest.config.json               # Jest 配置
├── puppeteer.config.json          # Puppeteer 配置
├── test-utils.config.json         # 测试工具配置
├── utils/                         # 测试工具
│   ├── dom.utils.ts               # DOM 操作工具
│   ├── event.utils.ts             # 事件模拟工具
│   └── assertion.utils.ts         # 断言工具
└── fixtures/                      # 测试数据
    ├── sample-config.json         # 示例配置
    ├── invalid-config.json        # 无效配置
    ├── large-config.json          # 大型配置
    └── sample-yaml-config.yaml    # YAML 配置示例
```

### 测试分类

#### 1. 单元测试 (Unit Tests)
- **文件**: `ConfigurationSystem.test.ts`
- **目标**: 测试核心配置系统的各个组件和功能
- **覆盖范围**:
  - ConfigurationSystem 类的所有方法
  - 配置加载、验证、保存功能
  - 错误处理和边界情况
  - 工具函数的正确性

#### 2. Web UI 测试 (Web UI Tests)
- **文件**: `WebUI.test.ts`
- **目标**: 测试 Web UI 组件的功能和交互
- **覆盖范围**:
  - ConfigurationCenterUI 主类
  - ConfigService、ParserService、StorageService
  - 用户界面交互和事件处理
  - 主题切换和响应式设计

#### 3. 集成测试 (Integration Tests)
- **文件**: `Integration.test.ts`
- **目标**: 测试各组件之间的协作和端到端流程
- **覆盖范围**:
  - 完整的配置生命周期
  - UI 与系统的集成
  - 消息传递和数据流
  - 工厂函数和工具函数集成

#### 4. 自动化测试 (Automation Tests)
- **文件**: `WebUIAutomation.test.ts`
- **目标**: 模拟真实用户操作和复杂交互场景
- **覆盖范围**:
  - 表单提交和验证
  - 文件上传和处理
  - 动态内容加载
  - 拖放操作
  - 键盘导航和无障碍访问

## 运行测试

### 前置条件

1. 安装依赖：
```bash
npm install
```

2. 确保所有开发依赖已安装：
```bash
npm install --dev
```

### 测试命令

#### 运行所有测试
```bash
npm test
```

#### 运行特定测试类型

```bash
# 运行单元测试
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

#### 带覆盖率的测试

```bash
# 生成覆盖率报告
npm run test:coverage

# Web UI 测试覆盖率
npm run test:ui:coverage

# CI/CD 环境测试
npm run test:ci
```

#### 监视模式

```bash
# 监视文件变化并重新运行测试
npm run test:watch

# Web UI 测试监视模式
npm run test:ui:watch
```

### 测试环境配置

#### 开发环境
```bash
# 设置环境变量
export NODE_ENV=test
export DEBUG=true

# 运行测试
npm run test:ui
```

#### CI/CD 环境
```bash
# 自动化测试流程
npm run test:ci

# 验证测试
npm run validate:tests
```

## 测试工具和框架

### Jest
- **用途**: 主要测试框架
- **配置**: `__test__/jest.config.json`
- **特性**:
  - 快速并行测试执行
  - 内置代码覆盖率
  - 快照测试
  - Mock 和 Spy 功能

### JSDOM
- **用途**: DOM 环境模拟
- **配置**: 在 `setup.ts` 中设置
- **特性**:
  - 浏览器 API 模拟
  - 事件处理
  - DOM 操作

### Puppeteer
- **用途**: 端到端测试
- **配置**: `__test__/puppeteer.config.json`
- **特性**:
  - 真实浏览器环境
  - 自动化用户交互
  - 截图和录制

### 自定义测试工具

#### DOMUtils
```typescript
// 等待元素出现
const element = await DOMUtils.waitForElement('#my-element');

// 模拟用户输入
await DOMUtils.simulateInput(inputElement, 'test value');

// 模拟点击
await DOMUtils.simulateClick(buttonElement);
```

#### EventUtils
```typescript
// 模拟键盘事件
EventUtils.simulateKeyboardEvent(element, 'keydown', 'Enter');

// 模拟拖放
EventUtils.simulateDragAndDrop(dragElement, dropElement);

// 等待事件触发
await EventUtils.waitForEvent(element, 'click');
```

#### AssertionUtils
```typescript
// 断言元素可见
AssertionUtils.assertElementVisible('#my-element');

// 断言元素文本
AssertionUtils.assertElementText('#title', 'Expected Text');

// 断言表单值
AssertionUtils.assertFieldValue('#input', 'expected value');
```

## 测试最佳实践

### 1. 测试命名约定

```typescript
// 好的测试命名
describe('ConfigurationSystem', () => {
  test('should create configuration with default values', () => {
    // 测试代码
  });

  test('should throw error when loading invalid configuration', async () => {
    // 测试代码
  });
});
```

### 2. 测试结构

```typescript
describe('ComponentName', () => {
  let component: ComponentName;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    // 设置测试环境
    mockContainer = document.createElement('div');
    component = new ComponentName();
  });

  afterEach(() => {
    // 清理测试环境
    component.destroy();
  });

  test('should do something', () => {
    // 测试代码
  });
});
```

### 3. 异步测试处理

```typescript
test('should handle async operations', async () => {
  // 使用 async/await
  const result = await asyncOperation();
  expect(result).toBe(expectedValue);
});

test('should handle promises', () => {
  // 返回 Promise
  return asyncOperation().then(result => {
    expect(result).toBe(expectedValue);
  });
});
```

### 4. Mock 和 Stub

```typescript
test('should mock external dependencies', () => {
  // Mock 函数
  const mockFunction = jest.fn().mockReturnValue('mocked value');
  
  // Mock 模块
  jest.mock('external-module', () => ({
    doSomething: mockFunction
  }));
  
  // 测试代码
  expect(mockFunction).toHaveBeenCalled();
});
```

### 5. 错误处理测试

```typescript
test('should handle errors gracefully', async () => {
  // 测试错误情况
  await expect(asyncOperation()).rejects.toThrow('Expected error');
  
  // 测试错误恢复
  await expect(recoveryOperation()).resolves.not.toThrow();
});
```

## 测试覆盖率

### 覆盖率目标

- **整体覆盖率**: 80%
- **行覆盖率**: 80%
- **分支覆盖率**: 80%
- **函数覆盖率**: 80%
- **语句覆盖率**: 80%

### 覆盖率报告

运行 `npm run test:coverage` 后，覆盖率报告将生成在 `coverage/` 目录中：

- `coverage/lcov-report/index.html` - HTML 格式报告
- `coverage/lcov.info` - LCOV 格式报告
- `coverage/cobertura-coverage.xml` - Cobertura 格式报告

### 提高覆盖率的技巧

1. **测试边界条件**:
   ```typescript
   test('should handle empty input', () => {
     expect(functionUnderTest('')).toBe(expectedResult);
   });
   ```

2. **测试错误路径**:
   ```typescript
   test('should throw error with invalid input', () => {
     expect(() => functionUnderTest(invalidInput)).toThrow();
   });
   ```

3. **测试异步操作**:
   ```typescript
   test('should handle async success', async () => {
     const result = await asyncFunction(validInput);
     expect(result).toBe(expectedResult);
   });
   ```

## 调试测试

### 调试技巧

1. **使用 console.log**:
   ```typescript
   test('debug example', () => {
     console.log('Debug info:', variable);
     // 测试代码
   });
   ```

2. **使用 Jest 的调试功能**:
   ```bash
   # 运行单个测试文件
   npm test -- --testNamePattern="specific test"
   
   # 运行测试并显示详细信息
   npm test -- --verbose
   ```

3. **使用浏览器调试**:
   ```typescript
   // 在测试中设置断点
   debugger;
   const result = functionUnderTest();
   ```

### 常见问题解决

1. **测试环境问题**:
   ```bash
   # 清理测试环境
   npm run test:clean
   
   # 重新安装依赖
   npm install
   ```

2. **DOM 相关问题**:
   ```typescript
   // 确保在测试前设置 DOM
   beforeEach(() => {
     document.body.innerHTML = '<div id="test-container"></div>';
   });
   ```

3. **异步测试问题**:
   ```typescript
   // 确保正确处理异步操作
   test('async test', async () => {
     await asyncOperation();
     expect(result).toBeDefined();
   });
   ```

## CI/CD 集成

### GitHub Actions

测试已配置为在 GitHub Actions 中自动运行：

```yaml
# .github/workflows/web-ui-tests.yml
name: Web UI Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test:ci
```

### 本地 CI/CD 模拟

```bash
# 运行完整的 CI 流程
npm run test:ci

# 验证所有测试
npm run validate:tests
```

## 性能测试

### 性能测试命令

```bash
# 运行性能测试
npm run test:performance

# 分析测试性能
npm run test:performance -- --analyze
```

### 性能测试最佳实践

1. **设置性能基准**:
   ```typescript
   test('should handle large configurations efficiently', async () => {
     const startTime = performance.now();
     await operationUnderTest(largeDataSet);
     const endTime = performance.now();
     
     expect(endTime - startTime).toBeLessThan(1000);
   });
   ```

2. **内存使用测试**:
   ```typescript
   test('should not leak memory', () => {
     const initialMemory = process.memoryUsage().heapUsed;
     
     // 执行操作
     performOperation();
     
     const finalMemory = process.memoryUsage().heapUsed;
     expect(finalMemory - initialMemory).toBeLessThan(1024 * 1024); // 1MB
   });
   ```

## 贡献指南

### 添加新测试

1. **创建测试文件**:
   ```typescript
   // __test__/NewFeature.test.ts
   describe('NewFeature', () => {
     test('should work correctly', () => {
       // 测试代码
     });
   });
   ```

2. **更新测试配置**:
   ```json
   // 更新 jest.config.json
   {
     "testMatch": [
       "**/__test__/**/NewFeature.test.ts"
     ]
   }
   ```

3. **运行测试**:
   ```bash
   npm run test:ui
   ```

### 测试审查清单

- [ ] 测试名称清晰描述测试目的
- [ ] 测试覆盖所有功能路径
- [ ] 包含正面和负面测试用例
- [ ] 正确处理异步操作
- [ ] 适当的设置和清理
- [ ] 测试独立且可重复
- [ ] 使用适当的断言
- [ ] 包含错误处理测试
- [ ] 性能测试在合理范围内

## 故障排除

### 常见错误

1. **Jest 配置错误**:
   ```
   Error: Cannot find module 'jest-config'
   ```
   解决方案：`npm install --save-dev jest`

2. **DOM 环境错误**:
   ```
   ReferenceError: document is not defined
   ```
   解决方案：确保在 `setup.ts` 中正确设置 JSDOM

3. **异步测试超时**:
   ```
   Timeout - Async callback was not invoked within the 5000ms timeout
   ```
   解决方案：增加超时时间或检查异步操作

### 获取帮助

如果遇到测试相关的问题：

1. 查看测试文档：`TEST_DOCUMENTATION.md`
2. 检查测试配置：`__test__/jest.config.json`
3. 运行测试诊断：`npm run test:ci`
4. 查看覆盖率报告：`coverage/lcov-report/index.html`

## 总结

RCC Configuration Module 的测试套件提供了全面的测试覆盖，确保代码质量和功能稳定性。通过遵循本文档中的最佳实践和指南，可以有效地维护和扩展测试套件。

记住：好的测试不仅仅是验证代码工作正常，更是文档和设计工具，帮助团队理解和维护代码库。