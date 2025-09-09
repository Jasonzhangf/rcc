# Claude Code Router 多Key和Auth鉴权增强设计方案

## 当前配置分析

### 现状问题
1. **单一API Key**: 每个provider只支持一个`api_key`字段
2. **固定鉴权类型**: 没有灵活的认证机制配置
3. **负载均衡限制**: 无法在同一provider的多个key间轮换
4. **鉴权扩展性差**: 不支持Bearer、Basic Auth、Custom Header等多种认证方式

### 当前结构
```json
{
  "Providers": [
    {
      "name": "iflow1",
      "api_base_url": "https://apis.iflow.cn/v1/chat/completions",
      "api_key": "sk-1a3d168c80888a90c131fc6538515975",  // 单一key
      "models": ["kimi-k2-0905", "qwen3-coder"]
    }
  ]
}
```

## 增强设计方案

### 1. 多Key支持架构

#### 方案A: 扩展现有结构 (向后兼容)
```json
{
  "Providers": [
    {
      "name": "iflow1",
      "api_base_url": "https://apis.iflow.cn/v1/chat/completions",
      
      // 保持向后兼容
      "api_key": "sk-primary-key",
      
      // 新增多key配置
      "auth": {
        "type": "api_key",  // api_key | bearer | basic | custom | oauth2
        "keys": [
          {
            "key": "sk-1a3d168c80888a90c131fc6538515975",
            "name": "primary",
            "weight": 10,      // 权重，用于负载均衡
            "quota": {
              "rpm": 60,       // 每分钟请求数限制
              "rpd": 1000,     // 每日请求数限制
              "concurrent": 5   // 并发请求数限制
            },
            "status": "active", // active | inactive | suspended
            "metadata": {
              "created": "2025-01-01",
              "expires": "2025-12-31",
              "tier": "premium"
            }
          },
          {
            "key": "sk-b600575e03c8b3b768064326b2327c34",
            "name": "backup",
            "weight": 5,
            "quota": {
              "rpm": 30,
              "rpd": 500,
              "concurrent": 3
            },
            "status": "active"
          }
        ],
        "rotation": {
          "strategy": "round_robin", // round_robin | weighted | failover | random
          "failover_timeout": 30000,  // 故障转移超时时间(ms)
          "health_check": {
            "enabled": true,
            "interval": 60000,        // 健康检查间隔(ms)
            "endpoint": "/v1/models", // 健康检查端点
            "timeout": 5000
          }
        }
      },
      "models": ["kimi-k2-0905", "qwen3-coder"]
    }
  ]
}
```

#### 方案B: 完全重构架构
```json
{
  "Providers": [
    {
      "name": "iflow-cluster",
      "api_base_url": "https://apis.iflow.cn/v1/chat/completions",
      "authentication": {
        "primary": {
          "type": "api_key",
          "credentials": [
            {
              "id": "iflow-key-1",
              "key": "sk-1a3d168c80888a90c131fc6538515975",
              "header": "Authorization",
              "format": "Bearer {key}",
              "priority": 1,
              "limits": {
                "requests_per_minute": 60,
                "requests_per_day": 1000,
                "concurrent_requests": 5
              }
            },
            {
              "id": "iflow-key-2", 
              "key": "sk-b600575e03c8b3b768064326b2327c34",
              "header": "Authorization",
              "format": "Bearer {key}",
              "priority": 2,
              "limits": {
                "requests_per_minute": 30,
                "requests_per_day": 500,
                "concurrent_requests": 3
              }
            }
          ]
        },
        "fallback": {
          "type": "basic_auth",
          "credentials": [
            {
              "id": "basic-auth-1",
              "username": "api_user",
              "password": "api_password",
              "priority": 10
            }
          ]
        }
      },
      "load_balancer": {
        "algorithm": "weighted_round_robin",
        "health_check": true,
        "failover": true,
        "circuit_breaker": {
          "failure_threshold": 5,
          "recovery_timeout": 60000
        }
      },
      "models": ["kimi-k2-0905", "qwen3-coder"]
    }
  ]
}
```

### 2. 鉴权类型支持

#### 支持的认证类型
```json
{
  "auth_types": {
    "api_key": {
      "header": "Authorization",
      "format": "Bearer {key}" // 或 "API-Key {key}"
    },
    "bearer": {
      "header": "Authorization", 
      "format": "Bearer {token}"
    },
    "basic": {
      "header": "Authorization",
      "format": "Basic {base64(username:password)}"
    },
    "custom": {
      "headers": {
        "X-API-Key": "{key}",
        "X-User-ID": "{user_id}",
        "X-Signature": "{signature}"
      }
    },
    "oauth2": {
      "grant_type": "client_credentials",
      "token_url": "https://api.provider.com/oauth/token",
      "client_id": "{client_id}",
      "client_secret": "{client_secret}",
      "scope": "api:read api:write",
      "token_cache": {
        "ttl": 3600,
        "refresh_threshold": 300
      }
    },
    "jwt": {
      "algorithm": "RS256",
      "private_key_path": "./keys/private.pem",
      "issuer": "claude-code-router",
      "audience": "api.provider.com",
      "expires_in": 3600
    }
  }
}
```

### 3. 配置解析增强模块

#### ConfigAuthModule 设计
```typescript
interface AuthCredential {
  id: string;
  type: AuthType;
  key?: string;
  username?: string;
  password?: string;
  token?: string;
  headers?: Record<string, string>;
  priority: number;
  limits?: {
    requests_per_minute?: number;
    requests_per_day?: number;
    concurrent_requests?: number;
  };
  metadata?: {
    created?: string;
    expires?: string;
    tier?: string;
    description?: string;
  };
  status: 'active' | 'inactive' | 'suspended';
}

interface AuthConfiguration {
  type: AuthType;
  credentials: AuthCredential[];
  rotation?: {
    strategy: 'round_robin' | 'weighted' | 'failover' | 'random';
    failover_timeout?: number;
    health_check?: {
      enabled: boolean;
      interval: number;
      endpoint: string;
      timeout: number;
    };
  };
}

interface ProviderAuthConfig {
  primary: AuthConfiguration;
  fallback?: AuthConfiguration;
  load_balancer?: {
    algorithm: string;
    health_check: boolean;
    failover: boolean;
    circuit_breaker?: {
      failure_threshold: number;
      recovery_timeout: number;
    };
  };
}
```

### 4. 实现策略

#### 4.1 渐进式迁移策略
```json
{
  "migration": {
    "phase1": "保持向后兼容，新增auth字段",
    "phase2": "逐步迁移现有配置到新结构", 
    "phase3": "完全移除旧字段",
    "rollback": "支持配置回滚到旧版本"
  }
}
```

#### 4.2 配置验证增强
```typescript
const authValidationRules = {
  api_key: {
    required: ['key'],
    format: {
      key: /^sk-[a-zA-Z0-9]{32,}$/
    }
  },
  oauth2: {
    required: ['client_id', 'client_secret', 'token_url'],
    format: {
      token_url: /^https?:\/\/.+/,
      client_id: /^[a-zA-Z0-9_-]+$/
    }
  },
  jwt: {
    required: ['algorithm', 'private_key_path'],
    algorithms: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512']
  }
};
```

### 5. 使用示例

#### 完整配置示例
```json
{
  "Providers": [
    {
      "name": "openai-cluster",
      "api_base_url": "https://api.openai.com/v1/chat/completions",
      "auth": {
        "type": "api_key",
        "keys": [
          {
            "key": "sk-proj-primary-key-here",
            "name": "primary",
            "weight": 10,
            "quota": {"rpm": 60, "rpd": 1000},
            "status": "active"
          },
          {
            "key": "sk-proj-backup-key-here", 
            "name": "backup",
            "weight": 5,
            "quota": {"rpm": 30, "rpd": 500},
            "status": "active"
          }
        ],
        "rotation": {
          "strategy": "weighted",
          "health_check": {"enabled": true, "interval": 60000}
        }
      },
      "models": ["gpt-4", "gpt-3.5-turbo"]
    },
    {
      "name": "anthropic-enterprise", 
      "api_base_url": "https://api.anthropic.com/v1/messages",
      "auth": {
        "type": "custom",
        "keys": [
          {
            "key": "ant-api-key-here",
            "name": "enterprise",
            "headers": {
              "x-api-key": "{key}",
              "anthropic-version": "2023-06-01"
            },
            "status": "active"
          }
        ]
      },
      "models": ["claude-3-opus", "claude-3-sonnet"]
    }
  ]
}
```

## 实现优先级

### 高优先级 (Phase 1)
1. ✅ 多API Key支持 (keys数组)
2. ✅ 权重负载均衡 (weight字段)
3. ✅ 向后兼容性 (保留api_key字段)
4. ✅ 基础配额限制 (rpm, rpd)

### 中优先级 (Phase 2) 
1. 🔄 多种鉴权类型 (Bearer, Basic, Custom)
2. 🔄 健康检查机制
3. 🔄 故障转移策略
4. 🔄 配置热重载

### 低优先级 (Phase 3)
1. ⏳ OAuth2/JWT支持
2. ⏳ 熔断器模式
3. ⏳ 高级监控指标
4. ⏳ 动态配置管理

这个设计方案既保持了向后兼容性，又提供了强大的多key和认证扩展能力。你觉得哪个方案更适合你的需求？