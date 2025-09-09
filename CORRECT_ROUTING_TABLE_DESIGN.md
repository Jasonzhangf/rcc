# 正确的路由表架构设计

## 📋 路由表概念澄清

### 基本架构
```
虚拟模型类别 (default, longtext, coding, reasoning, etc.)
├── Route 1: provider1.model1
├── Route 2: provider1.model2  
├── Route 3: provider2.model1
└── Route 4: provider3.model1
```

### 关键概念
1. **虚拟模型类别**: default, longtext, coding, reasoning, fast, accurate, vision等
2. **路由对象**: 一个`provider.model`组合 = 一条单独的路由
3. **数据源**: Pool内的模型 + 配置文件内的模型
4. **多路由支持**: 每个类别可以包含多个provider.model路由对象
5. **负载均衡**: 调度模块从目标表内选择可用pipeline进行路由

## 🎯 正确的数据结构

### 1. 虚拟模型类别定义
```javascript
const virtualModelCategories = {
  "default": {
    name: "default",
    display_name: "通用模型",
    description: "适合大部分任务的通用模型",
    routes: []  // provider.model 路由列表
  },
  "longtext": {
    name: "longtext", 
    display_name: "长文本处理",
    description: "专门处理长文本的模型",
    routes: []
  },
  "coding": {
    name: "coding",
    display_name: "代码生成",
    description: "专门用于代码生成的模型", 
    routes: []
  }
  // ... 更多类别
}
```

### 2. 路由条目结构
```javascript
const routeEntry = {
  id: "route-default-iflow-qwen3", 
  provider_id: "iflow-provider",
  provider_name: "iFlow",
  model_id: "qwen3-max-preview",
  model_name: "Qwen3 Max Preview",
  source: "pool",  // "pool" | "config"
  priority: 1,
  weight: 1,
  status: "active",
  created_at: "2025-09-09T13:00:00.000Z"
}
```

### 3. 完整路由表配置
```javascript
const routingTable = {
  virtual_categories: {
    "default": {
      name: "default",
      display_name: "通用模型",
      routes: [
        {
          id: "route-default-iflow-qwen3",
          provider_id: "iflow-provider",
          model_id: "qwen3-max-preview",
          source: "pool",
          weight: 1,
          priority: 1
        },
        {
          id: "route-default-openai-gpt4",
          provider_id: "openai-provider", 
          model_id: "gpt-4",
          source: "config",
          weight: 2,
          priority: 2
        }
      ],
      load_balancing: {
        strategy: "weighted",
        config: { total_weight: 3 }
      }
    },
    "coding": {
      name: "coding",
      display_name: "代码生成",
      routes: [
        {
          id: "route-coding-anthropic-claude3",
          provider_id: "anthropic-provider",
          model_id: "claude-3-opus", 
          source: "pool",
          weight: 1,
          priority: 1
        }
      ],
      load_balancing: {
        strategy: "round_robin",
        config: {}
      }
    }
  },
  metadata: {
    version: "1.0.0",
    created_at: "2025-09-09T13:00:00.000Z",
    description: "静态路由配置表 - 用于服务器启动解析"
  }
}
```

## 🔄 工作流程

### 1. 网页管理器职责
- ✅ 创建/编辑虚拟模型类别
- ✅ 从Pool和配置文件选择可用的provider.model
- ✅ 添加/删除路由条目到虚拟类别
- ✅ 配置负载均衡策略
- ✅ 导出简化配置文件

### 2. 解析模块职责（独立模块）
- ✅ 读取简化路由表配置
- ✅ 扩展为 provider.model.key + pipeline configuration
- ✅ 生成完整的运行时路由配置
- ✅ 提供给调度模块使用

### 3. 调度/负载均衡模块职责
- ✅ 接收虚拟模型请求 (如 "default")
- ✅ 根据负载均衡策略选择具体的provider.model.key
- ✅ 执行请求路由到选定的pipeline

## 📊 网页界面设计

### 路由表管理界面
```
路由表管理
├── 虚拟模型类别列表
│   ├── default (通用模型) - 3条路由
│   ├── longtext (长文本) - 2条路由  
│   ├── coding (代码生成) - 4条路由
│   └── [+ 添加新类别]
├── 选择类别后显示路由详情
│   ├── 当前路由列表
│   │   ├── iflow-provider.qwen3-max-preview (pool) [权重:2]
│   │   ├── openai-provider.gpt-4 (config) [权重:1]
│   │   └── [+ 添加路由]
│   └── 负载均衡配置
│       ├── 策略: [weighted/round_robin/priority]
│       └── 参数配置
└── 可用模型源
    ├── Pool Models (4个可用)
    └── Config Models (6个可用)
```

## 🎯 实现步骤

1. **修正RoutesManager接口和数据结构**
2. **创建正确的路由表API端点**  
3. **实现网页路由管理界面**
4. **测试完整的路由表配置流程**
5. **验证配置导出功能**

这样的设计确保：
- ✅ 清晰的虚拟模型到具体模型的映射关系
- ✅ 灵活的多路由支持 
- ✅ 简化的配置管理
- ✅ 分离的解析和调度职责