/**
 * RCC Pipeline系统配置示例
 * 这些示例展示了实际使用中的配置格式
 */

// 1. 简化的流水线组装表配置
export const simplePipelineAssemblyConfig = {
  version: "1.0.0",
  metadata: {
    description: "简单LLM API处理流水线",
    author: "RCC System"
  },
  routingRules: [
    {
      ruleId: "llm-chat-routing",
      name: "LLM对话路由",
      priority: 1,
      enabled: true,
      conditions: [
        {
          field: "request.path",
          operator: "equals",
          value: "/api/v1/chat"
        },
        {
          field: "request.method", 
          operator: "equals",
          value: "POST"
        }
      ],
      pipelineSelection: {
        strategy: "weighted",
        weights: {
          "llm-chat-primary": 80,
          "llm-chat-backup": 20
        }
      }
    }
  ],
  pipelineTemplates: [
    {
      templateId: "llm-chat-primary",
      name: "LLM对话主流水线",
      baseConfig: {
        timeout: 120000,
        maxConcurrentRequests: 100
      },
      moduleAssembly: {
        moduleInstances: [
          {
            instanceId: "protocol-adapter",
            moduleId: "llm-switch-module",
            name: "协议适配器",
            initialization: {
              config: {
                inputProtocol: "openai",
                outputProtocol: "native",
                enableFieldMapping: true
              },
              startupOrder: 1,
              required: true
            },
            execution: {
              timeout: 10000
            }
          },
          {
            instanceId: "model-router",
            moduleId: "model-router-module", 
            name: "模型路由器",
            initialization: {
              config: {
                strategy: "cost_optimized",
                models: {
                  "gpt-4": { cost: 0.03, priority: 1 },
                  "claude-3": { cost: 0.015, priority: 2 }
                }
              },
              startupOrder: 2,
              required: true
            },
            execution: {
              timeout: 60000
            }
          }
        ],
        connections: [
          {
            from: "protocol-adapter",
            to: "model-router",
            type: "success"
          }
        ]
      }
    }
  ],
  moduleRegistry: [
    {
      moduleId: "llm-switch-module",
      name: "LLM协议转换模块",
      version: "1.0.0",
      type: "protocol-adapter",
      capabilities: ["protocol-conversion", "field-mapping"],
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
      capabilities: ["model-selection", "cost-optimization"],
      configSchema: {
        type: "object",
        properties: {
          strategy: { type: "string" },
          models: { type: "object" }
        },
        required: ["strategy", "models"]
      }
    }
  ]
};

// 2. 简化的调度系统配置
export const simpleSchedulerConfig = {
  schedulerId: "llm-scheduler",
  name: "LLM流水线调度器",
  version: "1.0.0",
  loadBalancing: {
    strategy: "weighted", // roundrobin | weighted | least_connections | random
    weights: {
      "llm-chat-primary": 80,
      "llm-chat-backup": 20
    },
    healthCheck: {
      enabled: true,
      interval: 30000, // 30秒
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
      cleanupInterval: 300000
    }
  },
  performance: {
    maxConcurrentRequests: 100,
    defaultTimeout: 30000,
    enableCircuitBreaker: true
  },
  monitoring: {
    enabled: true,
    metricsCollectionInterval: 10000,
    healthCheckInterval: 30000,
    logLevel: "info"
  }
};

// 3. 环境特定的配置工厂函数
export function createEnvironmentConfig(env: 'development' | 'production' | 'testing') {
  const baseConfig = {
    pipelineAssembly: simplePipelineAssemblyConfig,
    schedulerConfig: simpleSchedulerConfig
  };

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        schedulerConfig: {
          ...baseConfig.schedulerConfig,
          loadBalancing: {
            ...baseConfig.schedulerConfig.loadBalancing,
            healthCheck: {
              ...baseConfig.schedulerConfig.loadBalancing.healthCheck,
              interval: 10000 // 开发环境更频繁的健康检查
            }
          },
          monitoring: {
            ...baseConfig.schedulerConfig.monitoring,
            logLevel: "debug"
          }
        }
      };
      
    case 'production':
      return {
        ...baseConfig,
        schedulerConfig: {
          ...baseConfig.schedulerConfig,
          performance: {
            ...baseConfig.schedulerConfig.performance,
            maxConcurrentRequests: 1000, // 生产环境更高的并发
            defaultTimeout: 60000
          },
          errorHandling: {
            ...baseConfig.schedulerConfig.errorHandling,
            blacklist: {
              ...baseConfig.schedulerConfig.errorHandling.blacklist,
              maxEntries: 5000 // 生产环境更大的黑名单容量
            }
          }
        }
      };
      
    case 'testing':
      return {
        ...baseConfig,
        schedulerConfig: {
          ...baseConfig.schedulerConfig,
          loadBalancing: {
            ...baseConfig.schedulerConfig.loadBalancing,
            strategy: "roundrobin" // 测试环境使用简单的轮询
          },
          monitoring: {
            ...baseConfig.schedulerConfig.monitoring,
            logLevel: "trace"
          }
        }
      };
      
    default:
      return baseConfig;
  }
}

// 4. 配置验证函数
export function validatePipelineAssemblyConfig(config: any) {
  const errors: string[] = [];
  
  // 检查必需字段
  if (!config.version) errors.push("Missing required field: version");
  if (!config.routingRules) errors.push("Missing required field: routingRules");
  if (!config.pipelineTemplates) errors.push("Missing required field: pipelineTemplates");
  
  // 检查路由规则
  if (config.routingRules) {
    const ruleIds = new Set();
    config.routingRules.forEach((rule: any, index: number) => {
      if (!rule.ruleId) errors.push(`Routing rule[${index}]: Missing ruleId`);
      if (ruleIds.has(rule.ruleId)) errors.push(`Routing rule[${index}]: Duplicate ruleId '${rule.ruleId}'`);
      ruleIds.add(rule.ruleId);
      
      if (!rule.conditions || rule.conditions.length === 0) {
        errors.push(`Routing rule[${rule.ruleId}]: Must have at least one condition`);
      }
    });
  }
  
  // 检查流水线模板
  if (config.pipelineTemplates) {
    const templateIds = new Set();
    config.pipelineTemplates.forEach((template: any, index: number) => {
      if (!template.templateId) errors.push(`Pipeline template[${index}]: Missing templateId`);
      if (templateIds.has(template.templateId)) errors.push(`Pipeline template[${index}]: Duplicate templateId '${template.templateId}'`);
      templateIds.add(template.templateId);
      
      if (!template.moduleAssembly?.moduleInstances) {
        errors.push(`Pipeline template[${template.templateId}]: Missing moduleInstances`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateSchedulerConfig(config: any) {
  const errors: string[] = [];
  
  // 检查必需字段
  if (!config.schedulerId) errors.push("Missing required field: schedulerId");
  if (!config.loadBalancing) errors.push("Missing required field: loadBalancing");
  if (!config.errorHandling) errors.push("Missing required field: errorHandling");
  
  // 检查负载均衡配置
  if (config.loadBalancing) {
    const validStrategies = ['roundrobin', 'weighted', 'least_connections', 'random'];
    if (!validStrategies.includes(config.loadBalancing.strategy)) {
      errors.push(`Invalid load balancing strategy: ${config.loadBalancing.strategy}`);
    }
    
    if (config.loadBalancing.strategy === 'weighted' && config.loadBalancing.weights) {
      const totalWeight = Object.values(config.loadBalancing.weights).reduce((sum: number, weight: any) => sum + weight, 0);
      if (totalWeight !== 100) {
        errors.push(`Weight sum must equal 100, got ${totalWeight}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 5. 导出完整的配置系统
export const PipelineConfigExamples = {
  simplePipelineAssemblyConfig,
  simpleSchedulerConfig,
  createEnvironmentConfig,
  validatePipelineAssemblyConfig,
  validateSchedulerConfig
};