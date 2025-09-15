/**
 * 增强的流水线配置转换器
 * 
 * 负责将配置数据转换为PipelineAssembler和PipelineScheduler期望的完整配置格式
 * 支持从简单配置生成复杂的装配表和调度器配置
 */

import { 
  PipelineAssemblyConfig, 
  PipelineModuleConfig, 
  ModuleConnection,
  PipelineAssemblyTable,
  PipelineSchedulerConfig,
  PipelineSystemConfig
} from 'rcc-pipeline';
import { ConfigData } from './ConfigData';
import { CompletePipelineConfig } from './PipelineTableGenerator';

/**
 * 当前API服务器生成的流水线表条目格式
 */
export interface PipelineTableEntry {
  virtualModelId: string;
  targetProvider: string;
  targetModel: string;
  apiKeyIndex: number;
  enabled?: boolean;
  priority?: number;
}

/**
 * 当前API服务器生成的完整流水线表格式
 */
export interface CurrentPipelineTable {
  [key: string]: PipelineTableEntry;
}

/**
 * 转换配置选项
 */
export interface ConversionOptions {
  /** 是否生成完整的调度器配置 */
  generateSchedulerConfig?: boolean;
  /** 是否包含监控配置 */
  includeMonitoring?: boolean;
  /** 是否包含健康检查配置 */
  includeHealthChecks?: boolean;
  /** 自定义配置覆盖 */
  customOverrides?: {
    assemblyConfig?: Partial<PipelineAssemblyTable>;
    schedulerConfig?: Partial<PipelineSchedulerConfig>;
  };
}

/**
 * 增强的流水线配置转换器类
 */
export class EnhancedPipelineConfigConverter {
  /**
   * 从配置数据生成完整的流水线配置
   * @param config 配置数据
   * @param options 转换选项
   * @returns CompletePipelineConfig 完整的流水线配置
   */
  public static convertFromConfigData(
    config: ConfigData, 
    options?: ConversionOptions
  ): CompletePipelineConfig {
    try {
      console.log('Converting config data to complete pipeline configuration');
      
      // 生成装配表配置
      const assemblyConfig = this.convertToAssemblyTable(config, options);
      
      // 生成调度器配置（如果启用）
      const schedulerConfig = options?.generateSchedulerConfig !== false 
        ? this.convertToSchedulerConfig(config, assemblyConfig, options)
        : {
          basic: {
            schedulerId: 'default-scheduler',
            name: 'Default Scheduler',
            version: '1.0.0',
            description: 'Default pipeline scheduler configuration'
          },
          loadBalancing: {
            strategy: 'roundrobin',
            strategyConfig: {
              roundRobin: {
                enableStickySessions: false,
                sessionTimeout: 1800000
              }
            },
            failover: {
              enabled: true,
              maxRetries: 3,
              retryDelay: 1000,
              backoffMultiplier: 2,
              enableCircuitBreaker: true
            }
          },
          healthCheck: {
            strategy: 'hybrid',
            intervals: {
              activeCheckInterval: 30000,
              passiveCheckInterval: 10000,
              fullCheckInterval: 300000
            },
            checks: {
              basic: {
                enabled: true,
                timeout: 5000
              },
              detailed: {
                enabled: false,
                timeout: 10000,
                includeMetrics: false,
                includeDependencies: false
              },
              custom: {
                enabled: false,
                checkFunction: '',
                parameters: {}
              }
            },
            thresholds: {
              healthyThreshold: 2,
              unhealthyThreshold: 3,
              degradationThreshold: 1
            },
            recovery: {
              autoRecovery: true,
              recoveryStrategies: [],
              maxRecoveryAttempts: 3
            }
          },
          errorHandling: {
            errorClassification: {
              enableAutomaticClassification: true,
              customClassifiers: []
            },
            strategies: {
              unrecoverableErrors: {
                action: 'destroy_pipeline',
                notificationEnabled: true,
                logLevel: 'error'
              },
              recoverableErrors: {
                action: 'blacklist_temporary',
                maxRetryAttempts: 3,
                blacklistDuration: 60000,
                exponentialBackoff: true
              },
              authenticationErrors: {
                action: 'enter_maintenance',
                maintenanceDuration: 300000
              },
              networkErrors: {
                action: 'retry_with_backoff',
                maxRetryAttempts: 3,
                backoffMultiplier: 2,
                bufferSize: 100
              }
            },
            blacklist: {
              enabled: true,
              maxEntries: 1000,
              defaultDuration: 60000,
              maxDuration: 3600000,
              cleanupInterval: 300000,
              autoExpiry: true
            },
            reporting: {
              enableDetailedReporting: true,
              reportInterval: 60000,
              includeStackTraces: true,
              includeContext: true,
              customReporters: []
            }
          },
          performance: {
            concurrency: {
              maxConcurrentRequests: 1000,
              maxConcurrentRequestsPerPipeline: 100,
              queueSize: 5000,
              enablePriorityQueue: true
            },
            timeouts: {
              defaultTimeout: 30000,
              executionTimeout: 60000,
              idleTimeout: 300000,
              startupTimeout: 60000,
              shutdownTimeout: 30000
            },
            caching: {
              enabled: false,
              strategy: 'lru',
              maxSize: 1000,
              ttl: 3600000
            },
            rateLimiting: {
              enabled: false,
              strategy: 'token_bucket',
              requestsPerSecond: 100,
              burstSize: 200
            }
          },
          monitoring: {
            metrics: {
              enabled: true,
              collectionInterval: 10000,
              metrics: [],
              aggregation: {
                enabled: true,
                interval: 60000,
                functions: ['avg', 'sum', 'count', 'max', 'min']
              }
            },
            logging: {
              level: 'info',
              format: 'json',
              outputs: [
                {
                  type: 'console',
                  config: {},
                  level: 'info'
                }
              ],
              sampling: {
                enabled: false,
                rate: 1.0
              }
            },
            tracing: {
              enabled: false,
              samplingRate: 0.01,
              includePayloads: false,
              customSpans: []
            },
            alerts: {
              enabled: false,
              rules: [],
              channels: []
            }
          },
          security: {
            authentication: {
              enabled: false,
              method: 'jwt',
              config: {}
            },
            authorization: {
              enabled: false,
              roles: [],
              permissions: {}
            },
            encryption: {
              enabled: false,
              algorithm: 'aes-256-gcm',
              keyRotationInterval: 86400000
            },
            rateLimiting: {
              enabled: false,
              requestsPerMinute: 1000,
              burstSize: 100
            }
          }
        };
      
      const metadata = {
        generatedAt: new Date().toISOString(),
        configVersion: config.version || '1.0.0',
        virtualModelCount: Object.keys(config.virtualModels || {}).length,
        pipelineTemplateCount: assemblyConfig.pipelineTemplates.length,
        moduleRegistryCount: assemblyConfig.moduleRegistry.length
      };
      
      console.log('Pipeline configuration conversion completed', {
        virtualModelCount: metadata.virtualModelCount,
        pipelineTemplateCount: metadata.pipelineTemplateCount
      });
      
      return {
        assemblyConfig,
        schedulerConfig,
        metadata
      };
    } catch (error) {
      console.error('Failed to convert config data to pipeline configuration:', error);
      throw error;
    }
  }
  
  /**
   * 将配置数据转换为装配表
   * @param config 配置数据
   * @param options 转换选项
   * @returns PipelineAssemblyTable 装配表配置
   */
  public static convertToAssemblyTable(
    config: ConfigData,
    options?: ConversionOptions
  ): PipelineAssemblyTable {
    const assemblyTable: PipelineAssemblyTable = {
      version: '1.0.0',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Pipeline assembly table generated from configuration data',
        author: 'RCC Configuration System'
      },
      routingRules: this.generateRoutingRules(config),
      pipelineTemplates: this.generatePipelineTemplates(config),
      moduleRegistry: this.generateModuleRegistry(config),
      assemblyStrategies: this.generateAssemblyStrategies(config)
    };
    
    // 应用自定义覆盖
    if (options?.customOverrides?.assemblyConfig) {
      Object.assign(assemblyTable, options.customOverrides.assemblyConfig);
    }
    
    return assemblyTable;
  }
  
  /**
   * 将配置数据转换为调度器配置
   * @param config 配置数据
   * @param assemblyConfig 装配表配置
   * @param options 转换选项
   * @returns PipelineSchedulerConfig 调度器配置
   */
  public static convertToSchedulerConfig(
    config: ConfigData,
    assemblyConfig: PipelineAssemblyTable,
    options?: ConversionOptions
  ): PipelineSchedulerConfig {
    const schedulerConfig: PipelineSchedulerConfig = {
      basic: {
        schedulerId: 'rcc-config-scheduler',
        name: 'RCC Configuration-Based Scheduler',
        version: '1.0.0',
        description: 'Scheduler configuration generated from RCC configuration data'
      },
      loadBalancing: this.generateLoadBalancingConfig(config, assemblyConfig),
      healthCheck: this.generateHealthCheckConfig(options),
      errorHandling: this.generateErrorHandlingConfig(options),
      performance: this.generatePerformanceConfig(config),
      monitoring: this.generateMonitoringConfig(options),
      security: this.generateSecurityConfig(options)
    };
    
    // 应用自定义覆盖
    if (options?.customOverrides?.schedulerConfig) {
      Object.assign(schedulerConfig, options.customOverrides.schedulerConfig);
    }
    
    return schedulerConfig;
  }
  
  /**
   * 生成路由规则
   */
  private static generateRoutingRules(config: ConfigData) {
    const routingRules = [];
    
    for (const [vmId, virtualModel] of Object.entries(config.virtualModels || {})) {
      routingRules.push({
        ruleId: `rule-${vmId}`,
        name: `Virtual Model ${vmId} Routing`,
        priority: virtualModel.priority || 1,
        enabled: virtualModel.enabled !== false,
        conditions: [
          {
            field: 'request.model',
            operator: 'equals',
            value: vmId
          }
        ],
        pipelineSelection: {
          strategy: 'fixed',
          targetPipelineIds: [`pipeline-${vmId}`]
        },
        moduleFilters: [],
        dynamicConfig: {
          enableAdaptiveRouting: true,
          performanceThresholds: {
            maxResponseTime: 30000,
            minSuccessRate: 0.9,
            maxErrorRate: 0.1
          }
        }
      });
    }
    
    return routingRules;
  }
  
  /**
   * 生成流水线模板
   */
  private static generatePipelineTemplates(config: ConfigData) {
    const templates = [];
    
    for (const [vmId, virtualModel] of Object.entries(config.virtualModels || {})) {
      const firstTarget = virtualModel.targets[0];
      if (!firstTarget) continue;
      
      templates.push({
        templateId: `pipeline-${vmId}`,
        name: `Pipeline for ${vmId}`,
        description: `Pipeline for virtual model ${vmId}`,
        version: '1.0.0',
        baseConfig: {
          timeout: 60000,
          maxConcurrentRequests: 100,
          priority: virtualModel.priority || 1,
          enabled: virtualModel.enabled !== false
        },
        moduleAssembly: {
          moduleInstances: [
            {
              instanceId: `${vmId}-compatibility`,
              moduleId: 'compatibility-module',
              name: 'Compatibility Module',
              initialization: {
                config: {
                  targetProvider: firstTarget.providerId,
                  targetModel: firstTarget.modelId
                },
                dependencies: [],
                startupOrder: 1,
                required: true
              },
              execution: {
                timeout: 10000
              },
              conditions: {
                enableConditions: [],
                skipConditions: []
              }
            },
            {
              instanceId: `${vmId}-provider`,
              moduleId: `provider-${firstTarget.providerId}-${firstTarget.modelId}`,
              name: 'Provider Module',
              initialization: {
                config: {
                  providerId: firstTarget.providerId,
                  modelId: firstTarget.modelId,
                  keyIndex: firstTarget.keyIndex || 0
                },
                dependencies: [`${vmId}-compatibility`],
                startupOrder: 2,
                required: true
              },
              execution: {
                timeout: 30000
              },
              conditions: {
                enableConditions: [],
                skipConditions: []
              }
            }
          ],
          connections: [
            {
              id: `${vmId}-compatibility-to-provider`,
              from: `${vmId}-compatibility`,
              to: `${vmId}-provider`,
              type: 'success'
            }
          ],
          dataMappings: [
            {
              sourcePath: 'request.body',
              targetPath: `${vmId}-compatibility.input`,
              required: true
            }
          ],
          conditions: []
        },
        executionStrategy: {
          mode: 'sequential',
          timeout: 60000
        },
        dataFlow: {
          inputSchema: {
            type: 'object',
            properties: {
              model: { type: 'string' },
              messages: { type: 'array' }
            },
            required: ['model', 'messages']
          },
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              choices: { type: 'array' }
            }
          },
          validation: {
            enabled: true,
            strict: true
          }
        }
      });
    }
    
    return templates;
  }
  
  /**
   * 生成模块注册表
   */
  private static generateModuleRegistry(config: ConfigData) {
    const registry = [];
    
    // 添加兼容性模块
    registry.push({
      moduleId: 'compatibility-module',
      name: 'Compatibility Module',
      version: '1.0.0',
      type: 'compatibility',
      description: 'Handles request/response format compatibility',
      capabilities: ['format-conversion', 'validation'],
      dependencies: [],
      configSchema: {
        type: 'object',
        properties: {
          targetProvider: { type: 'string' },
          targetModel: { type: 'string' }
        },
        required: ['targetProvider', 'targetModel']
      },
      initializationConfig: {
        setupFunction: 'initializeCompatibility',
        validationFunction: 'validateCompatibilityConfig'
      },
      tags: ['compatibility']
    });
    
    // 为每个提供商-模型组合添加提供者模块
    for (const [providerId, provider] of Object.entries(config.providers || {})) {
      for (const [modelId, model] of Object.entries(provider.models || {})) {
        registry.push({
          moduleId: `provider-${providerId}-${modelId}`,
          name: `Provider ${providerId} - ${modelId}`,
          version: '1.0.0',
          type: 'provider',
          description: `Provider module for ${providerId}/${modelId}`,
          capabilities: ['api-calls', 'model-execution'],
          dependencies: ['compatibility-module'],
          configSchema: {
            type: 'object',
            properties: {
              providerId: { type: 'string' },
              modelId: { type: 'string' },
              keyIndex: { type: 'number' }
            },
            required: ['providerId', 'modelId']
          },
          initializationConfig: {
            setupFunction: 'initializeProvider',
            validationFunction: 'validateProviderConfig'
          },
          tags: ['provider', providerId, modelId]
        });
      }
    }
    
    return registry;
  }
  
  /**
   * 生成组装策略
   */
  private static generateAssemblyStrategies(config: ConfigData) {
    return [
      {
        strategyId: 'default-assembly',
        name: 'Default Assembly Strategy',
        description: 'Default strategy for assembling pipelines',
        algorithm: 'static',
        config: {},
        selectionCriteria: {
          performance: true,
          cost: true,
          reliability: true
        }
      }
    ];
  }
  
  /**
   * 生成负载均衡配置
   */
  private static generateLoadBalancingConfig(config: ConfigData, assemblyConfig: PipelineAssemblyTable) {
    const weights = {};
    let totalPriority = 0;
    
    // 计算总优先级
    for (const template of assemblyConfig.pipelineTemplates) {
      const priority = template.baseConfig.priority || 1;
      totalPriority += priority;
    }
    
    // 分配权重
    for (const template of assemblyConfig.pipelineTemplates) {
      const priority = template.baseConfig.priority || 1;
      weights[template.templateId] = Math.round((priority / totalPriority) * 100);
    }
    
    return {
      strategy: 'weighted',
      strategyConfig: {
        weighted: {
          weights,
          enableDynamicWeightAdjustment: true,
          weightAdjustmentInterval: 60000
        }
      },
      failover: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
        enableCircuitBreaker: true
      }
    };
  }
  
  /**
   * 生成健康检查配置
   */
  private static generateHealthCheckConfig(options?: ConversionOptions) {
    if (options?.includeHealthChecks === false) {
      return {
        strategy: 'passive',
        intervals: {
          activeCheckInterval: 60000,
          passiveCheckInterval: 30000,
          fullCheckInterval: 300000
        },
        checks: {
          basic: {
            enabled: false,
            timeout: 5000
          },
          detailed: {
            enabled: false,
            timeout: 10000,
            includeMetrics: false,
            includeDependencies: false
          },
          custom: {
            enabled: false,
            checkFunction: '',
            parameters: {}
          }
        },
        thresholds: {
          healthyThreshold: 2,
          unhealthyThreshold: 3,
          degradationThreshold: 1
        },
        recovery: {
          autoRecovery: false,
          recoveryStrategies: [],
          maxRecoveryAttempts: 0
        }
      };
    }
    
    return {
      strategy: 'hybrid',
      intervals: {
        activeCheckInterval: 30000,
        passiveCheckInterval: 10000,
        fullCheckInterval: 300000
      },
      checks: {
        basic: {
          enabled: true,
          timeout: 5000
        },
        detailed: {
          enabled: true,
          timeout: 10000,
          includeMetrics: true,
          includeDependencies: false
        },
        custom: {
          enabled: false,
          checkFunction: '',
          parameters: {}
        }
      },
      thresholds: {
        healthyThreshold: 2,
        unhealthyThreshold: 3,
        degradationThreshold: 1
      },
      recovery: {
        autoRecovery: true,
        recoveryStrategies: [],
        maxRecoveryAttempts: 3
      }
    };
  }
  
  /**
   * 生成错误处理配置
   */
  private static generateErrorHandlingConfig(options?: ConversionOptions) {
    return {
      errorClassification: {
        enableAutomaticClassification: true,
        customClassifiers: []
      },
      strategies: {
        unrecoverableErrors: {
          action: 'destroy_pipeline',
          notificationEnabled: true,
          logLevel: 'error'
        },
        recoverableErrors: {
          action: 'blacklist_temporary',
          maxRetryAttempts: 3,
          blacklistDuration: 60000,
          exponentialBackoff: true
        },
        authenticationErrors: {
          action: 'enter_maintenance',
          maintenanceDuration: 300000
        },
        networkErrors: {
          action: 'retry_with_backoff',
          maxRetryAttempts: 3,
          backoffMultiplier: 2,
          bufferSize: 100
        }
      },
      blacklist: {
        enabled: true,
        maxEntries: 1000,
        defaultDuration: 60000,
        maxDuration: 3600000,
        cleanupInterval: 300000,
        autoExpiry: true
      },
      reporting: {
        enableDetailedReporting: true,
        reportInterval: 60000,
        includeStackTraces: false,
        includeContext: true,
        customReporters: []
      }
    };
  }
  
  /**
   * 生成性能配置
   */
  private static generatePerformanceConfig(config: ConfigData) {
    return {
      concurrency: {
        maxConcurrentRequests: 1000,
        maxConcurrentRequestsPerPipeline: 100,
        queueSize: 5000,
        enablePriorityQueue: true
      },
      timeouts: {
        defaultTimeout: 30000,
        executionTimeout: 60000,
        idleTimeout: 300000,
        startupTimeout: 60000,
        shutdownTimeout: 30000
      },
      caching: {
        enabled: false,
        strategy: 'lru',
        maxSize: 1000,
        ttl: 3600000
      },
      rateLimiting: {
        enabled: false,
        strategy: 'token_bucket',
        requestsPerSecond: 100,
        burstSize: 200
      }
    };
  }
  
  /**
   * 生成监控配置
   */
  private static generateMonitoringConfig(options?: ConversionOptions) {
    if (options?.includeMonitoring === false) {
      return {
        metrics: {
          enabled: false,
          collectionInterval: 60000,
          metrics: [],
          aggregation: {
            enabled: false,
            interval: 60000,
            functions: []
          }
        },
        logging: {
          level: 'error',
          format: 'text',
          outputs: [{
            type: 'console',
            config: {},
            level: 'error'
          }],
          sampling: {
            enabled: false,
            rate: 1.0
          }
        },
        tracing: {
          enabled: false,
          samplingRate: 0,
          includePayloads: false,
          customSpans: []
        },
        alerts: {
          enabled: false,
          rules: [],
          channels: []
        }
      };
    }
    
    return {
      metrics: {
        enabled: true,
        collectionInterval: 10000,
        metrics: [
          {
            name: 'request_count',
            type: 'counter',
            description: 'Total number of requests',
            labels: {
              pipeline: '.*',
              status: '.*'
            }
          },
          {
            name: 'response_time',
            type: 'histogram',
            description: 'Response time distribution',
            labels: {
              pipeline: '.*'
            },
            buckets: [100, 500, 1000, 5000, 10000, 30000]
          }
        ],
        aggregation: {
          enabled: true,
          interval: 60000,
          functions: ['avg', 'sum', 'count', 'max', 'min']
        }
      },
      logging: {
        level: 'info',
        format: 'json',
        outputs: [{
          type: 'console',
          config: {},
          level: 'info'
        }],
        sampling: {
          enabled: false,
          rate: 1.0
        }
      },
      tracing: {
        enabled: false,
        samplingRate: 0.01,
        includePayloads: false,
        customSpans: []
      },
      alerts: {
        enabled: false,
        rules: [],
        channels: []
      }
    };
  }
  
  /**
   * 生成安全配置
   */
  private static generateSecurityConfig(options?: ConversionOptions) {
    return {
      authentication: {
        enabled: false,
        method: 'jwt',
        config: {}
      },
      authorization: {
        enabled: false,
        roles: [],
        permissions: {}
      },
      encryption: {
        enabled: false,
        algorithm: 'aes-256-gcm',
        keyRotationInterval: 86400000
      },
      rateLimiting: {
        enabled: false,
        requestsPerMinute: 1000,
        burstSize: 100
      }
    };
  }
  
  /**
   * 将当前流水线表转换为PipelineScheduler期望的系统配置
   * @param pipelineTable 当前流水线表
   * @param baseConfig 基础调度器配置
   * @returns PipelineSystemConfig 系统配置
   */
  public static convertToSystemConfig(
    pipelineTable: CurrentPipelineTable,
    baseConfig?: Partial<PipelineSystemConfig>
  ): PipelineSystemConfig {
    // 创建流水线配置列表
    const pipelines = Object.entries(pipelineTable).map(([entryId, entry]) => ({
      id: `${entry.virtualModelId}_${entry.targetProvider}_${entry.targetModel}_${entry.apiKeyIndex}`,
      name: `Pipeline for ${entry.virtualModelId} (${entry.targetProvider}/${entry.targetModel})`,
      type: 'model-routing',
      enabled: entry.enabled !== false,
      priority: entry.priority || 1,
      weight: 1,
      maxConcurrentRequests: 100,
      timeout: 30000
    }));
    
    // 合并基础配置
    const systemConfig: PipelineSystemConfig = {
      loadBalancer: {
        strategy: baseConfig?.loadBalancer?.strategy || 'roundrobin',
        healthCheckInterval: baseConfig?.loadBalancer?.healthCheckInterval || 30000
      },
      scheduler: {
        defaultTimeout: baseConfig?.scheduler?.defaultTimeout || 30000,
        maxRetries: baseConfig?.scheduler?.maxRetries || 3
      },
      pipelines
    };
    
    return systemConfig;
  }
  
  /**
   * 验证当前流水线表格式
   * @param pipelineTable 当前流水线表
   * @returns boolean 是否有效
   */
  public static validatePipelineTable(pipelineTable: CurrentPipelineTable): boolean {
    if (!pipelineTable || typeof pipelineTable !== 'object') {
      return false;
    }
    
    for (const [entryId, entry] of Object.entries(pipelineTable)) {
      // 检查必需字段
      if (!entry.virtualModelId || !entry.targetProvider || !entry.targetModel) {
        console.warn(`Invalid pipeline entry ${entryId}: missing required fields`);
        return false;
      }
      
      // 检查apiKeyIndex
      if (typeof entry.apiKeyIndex !== 'number' || entry.apiKeyIndex < 0) {
        console.warn(`Invalid pipeline entry ${entryId}: invalid apiKeyIndex`);
        return false;
      }
      
      // 检查enabled字段（如果存在）
      if (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') {
        console.warn(`Invalid pipeline entry ${entryId}: invalid enabled field`);
        return false;
      }
      
      // 检查priority字段（如果存在）
      if (entry.priority !== undefined && (typeof entry.priority !== 'number' || entry.priority < 1 || entry.priority > 10)) {
        console.warn(`Invalid pipeline entry ${entryId}: invalid priority field`);
        return false;
      }
    }
    
    return true;
  }
}