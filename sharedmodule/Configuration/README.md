# RCC Configuration Web UI

RCC Configuration Web UI 是一个用于解析和生成AI服务配置的可视化界面。

## 功能特性

- 配置文件上传和解析
- 自动加载默认配置文件
- 流水线配置生成
- 实时状态监控
- 导出解析结果和流水线配置

## 安装和使用

### 初始化配置中心UI

```typescript
import { initializeConfigurationUI } from './src/webui';

// 初始化配置中心UI
const ui = await initializeConfigurationUI({
  containerId: 'config-ui-container',
  theme: 'auto',
  defaultView: 'parser'
});

// 使用配置加载管理器
const configManager = ui.getConfigLoadingManager();
```

### 手动加载配置文件

```typescript
// 获取配置加载管理器
const configManager = getConfigLoadingManager();

// 加载和解析配置文件
const parseResult = await configManager.loadAndParseConfigFile(file);

// 获取当前状态
const state = configManager.getState();
```

## 架构设计

### 核心组件

1. **ConfigurationCenterUI** - 主界面管理器
2. **ConfigLoadingManager** - 配置加载管理器
3. **ConfigParserMain** - 配置解析主组件
4. **PipelineConfigGenerator** - 流水线配置生成器

### 数据流

```
用户上传配置文件 → ConfigLoadingManager → ParserService → 解析结果 → 流水线配置生成 → UI显示
```

### 状态管理

使用状态监听器模式管理配置加载状态：

```typescript
configManager.addStateListener((state) => {
  console.log('状态更新:', state);
});
```

## 导出功能

支持两种导出类型：

1. **解析结果** - 原始解析数据
2. **流水线配置** - 生成的流水线配置

## 主题支持

支持三种主题模式：

- `light` - 浅色主题
- `dark` - 深色主题
- `auto` - 自动跟随系统

## API接口

### initializeConfigurationUI(options)

初始化配置中心UI

### getConfigLoadingManager()

获取配置加载管理器实例

### getCurrentUIState()

获取当前UI状态

### destroyConfigurationUI()

销毁配置中心UI