/**
 * 基于现有 ~/.rcc/config.json 的Pipeline配置转换器
 * 将现有配置转换为Pipeline系统所需的格式
 */

// 1. 从现有配置提取Provider信息
export function extractProvidersFromConfig(config: any) {
  return config.providers.map((provider: any) => ({
    providerId: provider.id,
    name: provider.name,
    protocol: provider.protocol,
    apiBaseUrl: provider.api_base_url,
    authType: provider.auth_type,
    // 支持 OAuth2
    oauthConfig: provider.oauth_config || {
      enabled: false,
      authUrl: "",
      tokenUrl: "",
      clientId: "",
      clientSecret: "",
      scopes: []
    },
    models: provider.models.map((model: any) => ({
      modelId: model.id,
      name: model.name,
      maxTokens: model.max_tokens,
      description: model.description,
      status: model.status,
      capabilities: extractModelCapabilities(model),
      cost: extractModelCost(model)
    }))
  }));
}

// 2. 从现有配置提取虚拟路由作为流水线模板
export function extractVirtualRoutesAsTemplates(config: any) {
  return Object.entries(config.virtual_routes).map(([routeName, routeData]: [string, any]) => ({
    templateId: `pipeline-${routeName}`,
    name: routeData.display_name,
    description: routeData.description,
    baseConfig: {
      timeout: 120000,
      maxConcurrentRequests: 100,
      retryPolicy: {
        maxRetries: 2,
        baseDelay: 1000,
        maxDelay: 10000
      }
    },
    moduleAssembly: {
      moduleInstances: [
        {
          instanceId: "auth-validator",
          moduleId: "auth-module",
          name: "认证验证器",
          initialization: {
            config: {
              authType: "api_key", // 支持 api_key, oauth2, bearer_token
              validateTokens: true,
              tokenRefreshEnabled: true
            },
            startupOrder: 1,
            required: true
          }
        },
        {
          instanceId: "protocol-adapter",
          moduleId: "protocol-adapter-module",
          name: "协议适配器",
          initialization: {
            config: {
              inputProtocol: "openai",
              outputProtocol: "native",
              enableFieldMapping: true
            },
            startupOrder: 2,
            required: true
          }
        },
        {
          instanceId: "model-router",
          moduleId: "model-router-module",
          name: "模型路由器",
          initialization: {
            config: {
              strategy: "weighted",
              routeCategory: routeName,
              fallbackEnabled: true
            },
            startupOrder: 3,
            required: true
          }
        }
      ],
      connections: [
        {
          from: "auth-validator",
          to: "protocol-adapter",
          type: "success"
        },
        {
          from: "protocol-adapter", 
          to: "model-router",
          type: "success"
        }
      ]
    }
  }));
}

// 3. 从现有配置提取路由规则
export function extractRoutingRulesFromConfig(config: any) {
  const rules: any[] = [];
  
  // 为每个虚拟路由类别创建路由规则
  Object.entries(config.virtual_routes).forEach(([routeName, routeData]: [string, any]) => {
    rules.push({
      ruleId: `routing-${routeName}`,
      name: `${routeData.display_name}路由规则`,
      priority: getRoutePriority(routeName),
      enabled: true,
      conditions: [
        {
          field: "request.path",
          operator: "starts_with",
          value: `/api/v1/${routeName}`
        },
        {
          field: "request.method",
          operator: "in",
          value: ["POST", "GET"]
        }
      ],
      pipelineSelection: {
        strategy: "weighted",
        weights: extractWeightsFromRoutes(routeData.routes)
      },
      moduleFilters: [
        {
          capabilities: getRouteCapabilities(routeName),
          performanceRequirements: {
            maxResponseTime: 60000,
            minSuccessRate: 0.95
          }
        }
      ]
    });
  });
  
  return rules;
}

// 4. 创建调度系统配置
export function createSchedulerConfigFromConfig(config: any) {
  return {
    schedulerId: "rcc-main-scheduler",
    name: "RCC主调度器",
    version: "1.0.0",
    loadBalancing: {
      strategy: config.global_config.load_balancing || "weighted",
      weights: extractGlobalWeights(config),
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        endpoint: "/health",
        healthyThreshold: 2,
        unhealthyThreshold: 3
      },
      failover: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
        enableCircuitBreaker: true,
        circuitBreaker: {
          failureThreshold: 5,
          recoveryTime: 60000,
          requestVolumeThreshold: 10
        }
      }
    },
    errorHandling: {
      strategies: {
        unrecoverableErrors: {
          action: "destroy_pipeline",
          switchToNextAvailable: true,
          logLevel: "error"
        },
        recoverableErrors: {
          action: "blacklist_temporary",
          blacklistDuration: 60000,
          maxRetryAttempts: 3,
          exponentialBackoff: true
        },
        authenticationErrors: {
          action: "enter_maintenance",
          maintenanceDuration: 300000
        },
        rateLimitErrors: {
          action: "backoff_and_retry",
          maxRetries: 3,
          backoffMultiplier: 2
        }
      },
      blacklist: {
        enabled: true,
        maxEntries: 1000,
        defaultDuration: 60000,
        maxDuration: 3600000,
        cleanupInterval: 300000,
        // 基于现有黑名单
        existingBlacklist: config.model_blacklist.map((item: any) => ({
          modelId: item.modelId,
          providerId: item.providerId,
          reason: item.reason,
          blacklistedAt: item.blacklisted_at
        }))
      }
    },
    performance: {
      maxConcurrentRequests: 100,
      defaultTimeout: 30000,
      enableCircuitBreaker: true,
      rateLimiting: config.global_config.rate_limiting
    },
    monitoring: {
      enabled: true,
      metricsCollectionInterval: 10000,
      healthCheckInterval: 30000,
      logLevel: "info"
    }
  };
}

// 5. OAuth2配置扩展
export function createOAuth2Config() {
  return {
    enabled: true,
    providers: {
      google: {
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientId: "your-google-client-id",
        clientSecret: "your-google-client-secret",
        scopes: ["openid", "email", "profile"],
        redirectUri: "http://localhost:3000/auth/google/callback"
      },
      github: {
        authUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        clientId: "your-github-client-id", 
        clientSecret: "your-github-client-secret",
        scopes: ["user:email", "read:user"],
        redirectUri: "http://localhost:3000/auth/github/callback"
      },
      microsoft: {
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        clientId: "your-microsoft-client-id",
        clientSecret: "your-microsoft-client-secret",
        scopes: ["openid", "email", "profile"],
        redirectUri: "http://localhost:3000/auth/microsoft/callback"
      }
    },
    tokenManagement: {
      accessTokenExpiry: 3600, // 1小时
      refreshTokenExpiry: 2592000, // 30天
      automaticRefresh: true,
      refreshBuffer: 300 // 5分钟缓冲
    }
  };
}

// 6. 完整的配置转换函数
export function convertConfigToPipelineFormat(config: any) {
  return {
    version: "1.0.0",
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: "从RCC配置转换的Pipeline系统配置",
      author: "RCC System Converter"
    },
    routingRules: extractRoutingRulesFromConfig(config),
    pipelineTemplates: extractVirtualRoutesAsTemplates(config),
    moduleRegistry: createModuleRegistry(),
    oauth2Config: createOAuth2Config(),
    schedulerConfig: createSchedulerConfigFromConfig(config)
  };
}

// 辅助函数
function extractModelCapabilities(model: any) {
  const capabilities = [];
  
  if (model.description.includes("coding") || model.name.includes("coder")) {
    capabilities.push("code-generation");
  }
  
  if (model.description.includes("reasoning") || model.name.includes("thinking")) {
    capabilities.push("logical-reasoning");
  }
  
  if (model.max_tokens > 100000) {
    capabilities.push("long-context");
  }
  
  if (model.description.includes("agent") || model.description.includes("agentic")) {
    capabilities.push("agent-capabilities");
  }
  
  return capabilities;
}

function extractModelCost(model: any) {
  // 基于模型名称和描述估算成本
  if (model.name.includes("235b")) return 0.03;
  if (model.name.includes("max")) return 0.015;
  if (model.name.includes("coder")) return 0.02;
  return 0.01; // 默认成本
}

function getRoutePriority(routeName: string) {
  const priorities: Record<string, number> = {
    "coding": 1,
    "default": 2,
    "reasoning": 3,
    "longtext": 4
  };
  return priorities[routeName] || 5;
}

function extractWeightsFromRoutes(routes: any[]) {
  const weights: Record<string, number> = {};
  const totalWeight = routes.reduce((sum: number, route: any) => sum + (route.weight || 1), 0);
  
  routes.forEach(route => {
    weights[`pipeline-${route.model_name}`] = Math.round(((route.weight || 1) / totalWeight) * 100);
  });
  
  return weights;
}

function getRouteCapabilities(routeName: string) {
  const capabilities: Record<string, string[]> = {
    "coding": ["code-generation", "logical-reasoning"],
    "default": ["general-purpose", "text-generation"],
    "reasoning": ["logical-reasoning", "problem-solving"],
    "longtext": ["long-context", "document-processing"]
  };
  return capabilities[routeName] || ["general-purpose"];
}

function extractGlobalWeights(config: any) {
  const weights: Record<string, number> = {};
  
  Object.entries(config.virtual_routes).forEach(([routeName, routeData]: [string, any]) => {
    const totalWeight = routeData.routes.reduce((sum: number, route: any) => sum + (route.weight || 1), 0);
    routeData.routes.forEach((route: any) => {
      weights[`pipeline-${routeName}-${route.model_name}`] = Math.round(((route.weight || 1) / totalWeight) * 100);
    });
  });
  
  return weights;
}

function createModuleRegistry() {
  return [
    {
      moduleId: "auth-module",
      name: "认证模块",
      version: "1.0.0",
      type: "security",
      capabilities: ["authentication", "authorization", "token-validation"],
      configSchema: {
        type: "object",
        properties: {
          authType: { type: "string", enum: ["api_key", "oauth2", "bearer_token"] },
          validateTokens: { type: "boolean" },
          tokenRefreshEnabled: { type: "boolean" }
        },
        required: ["authType"]
      }
    },
    {
      moduleId: "protocol-adapter-module",
      name: "协议适配模块",
      version: "1.0.0", 
      type: "protocol-adapter",
      capabilities: ["protocol-conversion", "field-mapping", "validation"],
      configSchema: {
        type: "object",
        properties: {
          inputProtocol: { type: "string" },
          outputProtocol: { type: "string" },
          enableFieldMapping: { type: "boolean" }
        },
        required: ["inputProtocol", "outputProtocol"]
      }
    },
    {
      moduleId: "model-router-module",
      name: "模型路由模块",
      version: "1.0.0",
      type: "model-selector",
      capabilities: ["model-selection", "load-balancing", "fallback"],
      configSchema: {
        type: "object",
        properties: {
          strategy: { type: "string", enum: ["weighted", "roundrobin", "cost_optimized"] },
          routeCategory: { type: "string" },
          fallbackEnabled: { type: "boolean" }
        },
        required: ["strategy", "routeCategory"]
      }
    }
  ];
}

// 7. 配置验证函数
export function validateConvertedConfig(config: any) {
  const errors: string[] = [];
  
  // 验证必需字段
  if (!config.routingRules || config.routingRules.length === 0) {
    errors.push("必须至少定义一个路由规则");
  }
  
  if (!config.pipelineTemplates || config.pipelineTemplates.length === 0) {
    errors.push("必须至少定义一个流水线模板");
  }
  
  // 验证路由规则
  config.routingRules.forEach((rule: any, index: number) => {
    if (!rule.conditions || rule.conditions.length === 0) {
      errors.push(`路由规则[${index}]: 必须定义条件`);
    }
    
    if (!rule.pipelineSelection.weights) {
      errors.push(`路由规则[${index}]: 必须定义权重`);
    }
  });
  
  // 验证OAuth2配置
  if (config.oauth2Config?.enabled) {
    const oauthProviders = Object.keys(config.oauth2Config.providers);
    if (oauthProviders.length === 0) {
      errors.push("OAuth2已启用但未配置提供商");
    }
    
    oauthProviders.forEach(provider => {
      const providerConfig = config.oauth2Config.providers[provider];
      if (!providerConfig.clientId || !providerConfig.clientSecret) {
        errors.push(`OAuth2提供商[${provider}]: 缺少客户端ID或密钥`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}