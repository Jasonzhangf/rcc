# RCC Pipeline系统完整配置需求

## 核心配置架构

Pipeline系统采用**双层配置架构**：
1. **流水线组装表** (Pipeline Assembly Table) - 定义如何根据路由规则组装流水线
2. **调度系统配置** (Scheduler Configuration) - 定义如何调度和管理流水线实例

---

## 1. 流水线组装表配置 (Pipeline Assembly Table)

### 1.1 基础结构

```json
{
  "version": "1.0.0",
  "metadata": {
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "description": "API处理流水线组装配置",
    "author": "RCC System"
  },
  "routingRules": [],
  "pipelineTemplates": [],
  "moduleRegistry": []
}
```

### 1.2 路由规则配置 (Routing Rules)

**关键判断字段**：
- `request.method` - HTTP方法 (GET, POST, PUT, DELETE)
- `request.headers.content-type` - 内容类型
- `request.path` - 请求路径
- `request.query.model` - 查询参数中的模型名称
- `request.body.model` - 请求体中的模型名称
- `user.role` - 用户角色
- `client.type` - 客户端类型

```json
{
  "ruleId": "llm-api-routing",
  "name": "LLM API路由规则",
  "priority": 1,
  "enabled": true,
  "conditions": [
    {
      "field": "request.path",
      "operator": "starts_with",
      "value": "/api/v1/llm"
    },
    {
      "field": "request.method",
      "operator": "in",
      "value": ["POST"]
    }
  ],
  "pipelineSelection": {
    "strategy": "weighted",
    "weights": {
      "llm-pipeline-primary": 70,
      "llm-pipeline-backup": 30
    }
  }
}
```

### 1.3 流水线模板配置 (Pipeline Templates)

```json
{
  "templateId": "llm-pipeline-primary",
  "name": "LLM处理主流水线",
  "description": "主要的大语言模型处理流水线",
  "baseConfig": {
    "timeout": 60000,
    "maxConcurrentRequests": 50,
    "retryPolicy": {
      "maxRetries": 2,
      "baseDelay": 1000,
      "maxDelay": 10000
    }
  },
  "moduleAssembly": {
    "moduleInstances": [
      {
        "instanceId": "llm-switch",
        "moduleId": "llm-switch-module",
        "name": "LLM协议转换器",
        "initialization": {
          "config": {
            "inputProtocol": "openai",
            "outputProtocol": "native",
            "enableFieldMapping": true,
            "customMappings": {
              "model": "target_model",
              "messages": "conversation"
            }
          },
          "startupOrder": 1,
          "required": true
        },
        "execution": {
          "timeout": 5000,
          "circuitBreaker": {
            "failureThreshold": 5,
            "recoveryTime": 60000
          }
        }
      },
      {
        "instanceId": "model-router",
        "moduleId": "model-router-module",
        "name": "模型路由器",
        "initialization": {
          "config": {
            "routingStrategy": "cost_based",
            "modelPreferences": {
              "gpt-4": {"priority": 1, "cost": 0.03},
              "claude-3": {"priority": 2, "cost": 0.015}
            },
            "fallbackModels": ["gpt-3.5-turbo"]
          },
          "startupOrder": 2,
          "required": true
        }
      }
    ],
    "connections": [
      {
        "from": "llm-switch",
        "to": "model-router",
        "type": "success",
        "dataMapping": {
          "processedRequest": "llm-switch.output",
          "model": "llm-switch.output.target_model"
        }
      }
    ]
  }
}
```

### 1.4 模块注册表配置 (Module Registry)

```json
{
  "moduleId": "llm-switch-module",
  "name": "LLM协议转换模块",
  "version": "1.0.0",
  "type": "protocol-adapter",
  "description": "在不同LLM API协议间转换",
  "capabilities": ["protocol-conversion", "field-mapping", "validation"],
  "configSchema": {
    "type": "object",
    "properties": {
      "inputProtocol": {"type": "string", "enum": ["openai", "anthropic", "native"]},
      "outputProtocol": {"type": "string", "enum": ["openai", "anthropic", "native"]},
      "enableFieldMapping": {"type": "boolean"},
      "customMappings": {"type": "object"}
    },
    "required": ["inputProtocol", "outputProtocol"]
  },
  "initializationConfig": {
    "setupFunction": "initializeAdapter",
    "validationFunction": "validateConfiguration",
    "dependencies": []
  }
}
```

---

## 2. 流水线调度系统配置 (Scheduler Configuration)

### 2.1 主配置结构

```json
{
  "schedulerId": "llm-scheduler",
  "name": "LLM流水线调度器",
  "version": "1.0.0",
  "loadBalancing": {
    "strategy": "weighted",
    "weights": {
      "llm-pipeline-primary": 70,
      "llm-pipeline-backup": 30
    },
    "healthCheck": {
      "enabled": true,
      "interval": 30000,
      "timeout": 5000,
      "endpoint": "/health"
    },
    "failover": {
      "enabled": true,
      "maxRetries": 3,
      "retryDelay": 1000,
      "backoffMultiplier": 2
    }
  },
  "errorHandling": {
    "strategies": {
      "unrecoverableErrors": {
        "action": "destroy_pipeline",
        "switchToNextAvailable": true
      },
      "recoverableErrors": {
        "action": "blacklist_temporary",
        "blacklistDuration": 60000,
        "maxRetryAttempts": 3
      },
      "authenticationErrors": {
        "action": "enter_maintenance",
        "maintenanceDuration": 300000
      },
      "rateLimitErrors": {
        "action": "backoff_and_retry",
        "maxRetries": 3,
        "backoffMultiplier": 2
      }
    },
    "blacklist": {
      "enabled": true,
      "maxEntries": 1000,
      "defaultDuration": 60000,
      "maxDuration": 3600000,
      "cleanupInterval": 300000
    }
  },
  "performance": {
    "maxConcurrentRequests": 100,
    "defaultTimeout": 30000,
    "enableCircuitBreaker": true,
    "circuitBreakerConfig": {
      "failureThreshold": 5,
      "recoveryTime": 60000,
      "requestVolumeThreshold": 10
    }
  },
  "monitoring": {
    "enabled": true,
    "metricsCollectionInterval": 10000,
    "healthCheckInterval": 30000,
    "logLevel": "info"
  }
}
```

### 2.2 负载均衡配置详解

```json
{
  "loadBalancing": {
    "strategy": "weighted",  // roundrobin | weighted | least_connections | random
    "weights": {
      "pipeline-1": 60,
      "pipeline-2": 30,
      "pipeline-3": 10
    },
    "dynamicWeightAdjustment": {
      "enabled": true,
      "adjustmentInterval": 60000,
      "adjustmentFactors": {
        "responseTime": 0.4,
        "errorRate": 0.3,
        "successRate": 0.3
      }
    },
    "healthCheck": {
      "enabled": true,
      "interval": 30000,
      "timeout": 5000,
      "endpoint": "/health",
      "expectedStatusCode": 200,
      "healthyThreshold": 2,
      "unhealthyThreshold": 3
    },
    "failover": {
      "enabled": true,
      "maxRetries": 3,
      "retryDelay": 1000,
      "backoffMultiplier": 2,
      "enableCircuitBreaker": true,
      "circuitBreaker": {
        "failureThreshold": 5,
        "recoveryTime": 60000,
        "requestVolumeThreshold": 10,
        "timeout": 5000
      }
    }
  }
}
```

### 2.3 错误处理配置详解

```json
{
  "errorHandling": {
    "errorClassification": {
      "enabled": true,
      "customRules": [
        {
          "errorCode": 429,
          "category": "rate_limit",
          "severity": "medium",
          "action": "backoff_and_retry"
        },
        {
          "errorCode": 401,
          "category": "authentication",
          "severity": "high",
          "action": "enter_maintenance"
        },
        {
          "errorCode": 500,
          "category": "server_error",
          "severity": "high",
          "action": "switch_pipeline"
        }
      ]
    },
    "strategies": {
      "unrecoverableErrors": {
        "action": "destroy_pipeline",  // destroy_pipeline | mark_as_failed | quarantine
        "switchToNextAvailable": true,
        "notificationEnabled": true,
        "logLevel": "error"
      },
      "recoverableErrors": {
        "action": "blacklist_temporary",  // retry | blacklist_temporary | degrade_service
        "blacklistDuration": 60000,
        "maxRetryAttempts": 3,
        "exponentialBackoff": true,
        "backoffMultiplier": 2
      },
      "authenticationErrors": {
        "action": "enter_maintenance",  // enter_maintenance | refresh_credentials | disable_pipeline
        "maintenanceDuration": 300000,
        "credentialRefreshFunction": "refreshApiCredentials"
      },
      "networkErrors": {
        "action": "retry_with_backoff",
        "maxRetryAttempts": 3,
        "initialBackoff": 1000,
        "maxBackoff": 30000
      }
    },
    "blacklist": {
      "enabled": true,
      "maxEntries": 1000,
      "defaultDuration": 60000,  // 1分钟
      "maxDuration": 3600000,   // 1小时
      "cleanupInterval": 300000, // 5分钟
      "autoExpiry": true,
      "blacklistReasons": {
        "rate_limit": {"duration": 60000},
        "server_error": {"duration": 300000},
        "authentication_error": {"duration": 3600000}
      }
    }
  }
}
```

---

## 3. 完整配置示例

### 3.1 LLM API处理系统配置

```json
{
  "version": "1.0.0",
  "metadata": {
    "description": "LLM API处理流水线系统",
    "author": "RCC System"
  },
  "routingRules": [
    {
      "ruleId": "llm-chat-routing",
      "name": "LLM对话路由",
      "priority": 1,
      "enabled": true,
      "conditions": [
        {
          "field": "request.path",
          "operator": "equals",
          "value": "/api/v1/chat"
        },
        {
          "field": "request.method",
          "operator": "equals",
          "value": "POST"
        }
      ],
      "pipelineSelection": {
        "strategy": "weighted",
        "weights": {
          "llm-chat-primary": 80,
          "llm-chat-backup": 20
        }
      }
    }
  ],
  "pipelineTemplates": [
    {
      "templateId": "llm-chat-primary",
      "name": "LLM对话主流水线",
      "baseConfig": {
        "timeout": 120000,
        "maxConcurrentRequests": 100
      },
      "moduleAssembly": {
        "moduleInstances": [
          {
            "instanceId": "protocol-adapter",
            "moduleId": "llm-switch-module",
            "initialization": {
              "config": {
                "inputProtocol": "openai",
                "outputProtocol": "native",
                "enableFieldMapping": true
              },
              "startupOrder": 1,
              "required": true
            }
          },
          {
            "instanceId": "model-selector",
            "moduleId": "model-router-module",
            "initialization": {
              "config": {
                "strategy": "cost_optimized",
                "models": {
                  "gpt-4": {"cost": 0.03, "priority": 1},
                  "claude-3": {"cost": 0.015, "priority": 2}
                }
              },
              "startupOrder": 2,
              "required": true
            }
          }
        ],
        "connections": [
          {
            "from": "protocol-adapter",
            "to": "model-selector",
            "type": "success"
          }
        ]
      }
    }
  ],
  "schedulerConfig": {
    "schedulerId": "llm-scheduler",
    "loadBalancing": {
      "strategy": "weighted",
      "weights": {
        "llm-chat-primary": 80,
        "llm-chat-backup": 20
      },
      "healthCheck": {
        "enabled": true,
        "interval": 30000
      }
    },
    "errorHandling": {
      "strategies": {
        "rateLimitErrors": {
          "action": "backoff_and_retry",
          "maxRetries": 3,
          "backoffMultiplier": 2
        },
        "authenticationErrors": {
          "action": "enter_maintenance",
          "maintenanceDuration": 300000
        }
      },
      "blacklist": {
        "enabled": true,
        "defaultDuration": 60000
      }
    }
  }
}
```

---

## 4. 配置验证规则

### 4.1 必需字段检查
- `routingRules[*].ruleId` - 必须唯一
- `pipelineTemplates[*].templateId` - 必须唯一
- `moduleInstances[*].instanceId` - 在模板内必须唯一
- `schedulerConfig.schedulerId` - 必须存在

### 4.2 数值范围验证
- 权重值总和必须等于100
- 超时时间必须 > 0
- 重试次数必须 >= 0 且 <= 10
- 健康检查间隔必须 >= 1000ms

### 4.3 引用完整性
- pipelineSelection中引用的templateId必须存在
- moduleInstances中引用的moduleId必须在moduleRegistry中存在
- connections中引用的instanceId必须在当前模板中存在

### 4.4 业务逻辑验证
- 模块依赖不能形成循环
- 启动顺序必须合理（依赖模块的startupOrder必须小于依赖它的模块）
- 同一个instanceId不能出现多次

---

## 5. 配置文件组织结构

```
config/
├── pipeline-assembly.json           # 流水线组装表配置
├── scheduler-config.json            # 调度系统配置
├── module-registry.json             # 模块注册表
└── environments/
    ├── development/
    │   ├── pipeline-assembly.json
    │   └── scheduler-config.json
    ├── production/
    │   ├── pipeline-assembly.json
    │   └── scheduler-config.json
    └── testing/
        ├── pipeline-assembly.json
        └── scheduler-config.json
```

这个配置需求文档提供了RCC Pipeline系统所需的完整配置结构，涵盖了从路由规则到调度管理的所有方面。配置设计考虑了实际使用场景，提供了灵活性和可扩展性。