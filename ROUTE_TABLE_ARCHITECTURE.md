# RCC 模型路由表架构设计

## 核心概念

### 1. 虚拟模型类别 (Virtual Model Categories)
- **default**: 默认通用模型类别
- **longtext**: 长文本处理模型类别
- **code**: 代码生成模型类别
- **image**: 图像处理模型类别
- **multimodal**: 多模态模型类别
- **reasoning**: 推理任务模型类别

### 2. 路由对象
每个虚拟模型类别包含多个路由对象，每个路由对象格式为 `provider.model`

### 3. 路由表结构
- **静态路由表**: 用户配置的简化路由表
- **扩展路由表**: 解析后的完整路由表（包含provider.model.key + pipeline configuration）

## 架构设计

### 静态路由表 (用户配置)

```typescript
interface StaticRouteTable {
  // 虚拟模型类别
  categories: {
    [categoryName: string]: {
      displayName: string;           // 显示名称
      description: string;           // 类别描述
      defaultProvider?: string;       // 默认provider
      enabled: boolean;               // 是否启用
      targets: RouteTarget[];         // 路由目标列表
    }
  };
}

interface RouteTarget {
  id: string;                        // 唯一标识
  provider: string;                  // 提供商名称
  model: string;                     // 模型名称
  weight: number;                    // 负载均衡权重
  enabled: boolean;                  // 是否启用
  metadata?: {                       // 可选元数据
    maxTokens?: number;
    temperature?: number;
    costFactor?: number;
    latencyFactor?: number;
    region?: string;
  };
}
```

### 扩展路由表 (运行时使用)

```typescript
interface ExtendedRouteTable {
  categories: {
    [categoryName: string]: {
      displayName: string;
      description: string;
      targets: ExtendedRouteTarget[];
      balancer: LoadBalancer;         // 负载均衡器
    }
  };
}

interface ExtendedRouteTarget {
  id: string;
  provider: string;
  model: string;
  key: string;                       // provider.model 的唯一key
  pipeline: PipelineConfiguration;    // 流水线配置
  weight: number;
  enabled: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metadata?: any;
}

interface PipelineConfiguration {
  endpoint: string;                  // API端点
  authentication: {                  // 认证配置
    type: 'bearer' | 'basic' | 'api-key' | 'custom';
    credentials: any;
  };
  parameters: {                      // 请求参数
    model: string;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    // ...其他模型特定参数
  };
  rateLimit?: {                      // 限流配置
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  timeout: number;                    // 请求超时时间(ms)
  retries: number;                   // 重试次数
}
```

### 负载均衡模块

```typescript
interface LoadBalancer {
  select(): ExtendedRouteTarget;      // 选择目标路由
  update(targetId: string, status: 'healthy' | 'degraded' | 'unhealthy'): void;
  getStats(): LoadBalancerStats;
}

interface LoadBalancerStats {
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  targetStats: {
    [targetId: string]: {
      requests: number;
      failures: number;
      latency: number;
      lastUsed: Date;
    };
  };
}
```

## 路由流程

### 1. 请求路由流程
```
用户请求 → 虚拟模型类别 → 负载均衡模块 → 选择目标 → 流水线配置 → 实际模型调用
```

### 2. 具体步骤
1. **请求分类**: 根据用户请求确定虚拟模型类别
2. **负载均衡**: 从类别中可用的路由目标选择一个
3. **流水线配置**: 使用扩展路由表中的配置调用实际模型
4. **结果返回**: 返回处理结果

## 配置表示例

### 静态路由表示例

```json
{
  "categories": {
    "default": {
      "displayName": "默认模型",
      "description": "通用对话和任务处理",
      "defaultProvider": "openai",
      "enabled": true,
      "targets": [
        {
          "id": "gpt-4-default",
          "provider": "openai",
          "model": "gpt-4",
          "weight": 100,
          "enabled": true,
          "metadata": {
            "maxTokens": 4000,
            "temperature": 0.7,
            "costFactor": 1.0
          }
        },
        {
          "id": "claude-3-default",
          "provider": "anthropic",
          "model": "claude-3-sonnet-20240229",
          "weight": 80,
          "enabled": true,
          "metadata": {
            "maxTokens": 4000,
            "temperature": 0.5,
            "costFactor": 0.8
          }
        }
      ]
    },
    "longtext": {
      "displayName": "长文本处理",
      "description": "长文档处理和分析",
      "enabled": true,
      "targets": [
        {
          "id": "gpt-4-longtext",
          "provider": "openai",
          "model": "gpt-4",
          "weight": 100,
          "enabled": true,
          "metadata": {
            "maxTokens": 32000,
            "temperature": 0.3,
            "costFactor": 2.0
          }
        },
        {
          "id": "claude-3-longtext",
          "provider": "anthropic",
          "model": "claude-3-sonnet-20240229",
          "weight": 120,
          "enabled": true,
          "metadata": {
            "maxTokens": 100000,
            "temperature": 0.3,
            "costFactor": 1.5
          }
        }
      ]
    }
  }
}
```

### 扩展路由表示例

```json
{
  "categories": {
    "default": {
      "displayName": "默认模型",
      "description": "通用对话和任务处理",
      "targets": [
        {
          "id": "gpt-4-default",
          "provider": "openai",
          "model": "gpt-4",
          "key": "openai.gpt-4.gpt-4-default",
          "pipeline": {
            "endpoint": "https://api.openai.com/v1/chat/completions",
            "authentication": {
              "type": "bearer",
              "credentials": {
                "token": "${OPENAI_API_KEY}"
              }
            },
            "parameters": {
              "model": "gpt-4",
              "max_tokens": 4000,
              "temperature": 0.7
            },
            "rateLimit": {
              "requestsPerMinute": 60,
              "requestsPerHour": 3600
            },
            "timeout": 30000,
            "retries": 3
          },
          "weight": 100,
          "enabled": true,
          "status": "healthy"
        }
      ],
      "balancer": {
        "algorithm": "weighted_round_robin",
        "stats": {
          "totalRequests": 1250,
          "successRate": 0.98,
          "averageLatency": 1200
        }
      }
    }
  }
}
```

## 模块职责

### 1. 配置解析模块
- 读取静态路由表配置
- 解析provider配置文件
- 生成扩展路由表
- 验证配置有效性
- 更新运行时路由表

### 2. 负载均衡模块
- 实现多种负载均衡算法（轮询、加权轮询、最少连接等）
- 管理目标路由状态
- 提供健康检查机制
- 收集和统计性能数据

### 3. 网页管理器
- 提供用户友好的配置界面
- 管理静态路由表配置
- 监控运行时状态
- 提供流量统计和性能分析
- 支持配置的导入导出

## 下一步实现

1. **静态路由表配置**: 实现用户配置文件结构和验证
2. **配置解析模块**: 创建配置解析器和扩展器
3. **负载均衡模块**: 实现核心路由选择逻辑
4. **网页管理器**: 创建配置管理界面
5. **集成测试**: 确保各模块协同工作正常