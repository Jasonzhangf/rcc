/**
 * 流水线配置生成器 - 增强版
 * 
 * 负责根据配置数据生成完整的流水线配置，包括装配表和调度器配置
 */

import { ConfigData } from './ConfigData';
import { PipelineTable, PipelineEntry } from './PipelineTable';
import { 
  PipelineAssemblyTable,
  PipelineSchedulerConfig,
  RoutingRule,
  PipelineTemplate,
  ModuleRegistry,
  AssemblyStrategy,
  ModuleInstanceConfig,
  ModuleConnection,
  DataMapping,
  RetryPolicy,
  CircuitBreakerConfig
} from 'rcc-pipeline';

/**
 * 完整的流水线配置输出
 */
export interface CompletePipelineConfig {
  /** 装配表配置 */
  assemblyConfig: PipelineAssemblyTable;
  /** 调度器配置 */
  schedulerConfig: PipelineSchedulerConfig;
  /** 生成元数据 */
  metadata: {
    generatedAt: string;
    configVersion: string;
    virtualModelCount: number;
    pipelineTemplateCount: number;
    moduleRegistryCount: number;
  };
}

/**
 * 增强的流水线配置生成器类
 */
export class EnhancedPipelineConfigGenerator {
  private fixedVirtualModels: string[];
  private initialized = false;
  private defaultModules: ModuleRegistry[];
  private defaultAssemblyStrategies: AssemblyStrategy[];

  constructor(fixedVirtualModels?: string[]) {
    this.fixedVirtualModels = fixedVirtualModels || [
      'default', 
      'longcontext', 
      'thinking', 
      'background', 
      'websearch', 
      'vision', 
      'coding'
    ];
    
    // 初始化默认模块注册表
    this.defaultModules = this.initializeDefaultModules();
    // 初始化默认组装策略
    this.defaultAssemblyStrategies = this.initializeDefaultAssemblyStrategies();
  }

  /**
   * 初始化生成器
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    console.log('PipelineTableGenerator initialized successfully');
  }

  /**
   * 生成完整的流水线配置
   */
  public async generateCompletePipelineConfig(config: ConfigData): Promise<CompletePipelineConfig> {
    try {
      const startTime = Date.now();
      
      // 生成装配表配置
      const assemblyConfig = await this.generateAssemblyConfig(config);
      
      // 生成调度器配置
      const schedulerConfig = await this.generateSchedulerConfig(config, assemblyConfig);
      
      const metadata = {
        generatedAt: new Date().toISOString(),
        configVersion: config.version || '1.0.0',
        virtualModelCount: Object.keys(config.virtualModels || {}).length,
        pipelineTemplateCount: assemblyConfig.pipelineTemplates.length,
        moduleRegistryCount: assemblyConfig.moduleRegistry.length
      };
      
      console.log('Complete pipeline configuration generated', {
        assemblyTime: Date.now() - startTime,
        virtualModelCount: metadata.virtualModelCount,
        pipelineTemplateCount: metadata.pipelineTemplateCount
      });
      
      return {
        assemblyConfig,
        schedulerConfig,
        metadata
      };
    } catch (error) {
      console.error('Failed to generate complete pipeline configuration:', error);
      throw error;
    }
  }

  /**
   * 生成装配表配置
   */
  public async generateAssemblyConfig(config: ConfigData): Promise<PipelineAssemblyTable> {
    try {
      const routingRules = await this.generateRoutingRules(config);
      const pipelineTemplates = await this.generatePipelineTemplates(config);
      const moduleRegistry = await this.generateModuleRegistry(config);
      const assemblyStrategies = this.defaultAssemblyStrategies;
      
      const assemblyConfig: PipelineAssemblyTable = {
        version: '1.0.0',
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          description: 'Generated pipeline assembly table from configuration',
          author: 'RCC Configuration System'
        },
        routingRules,
        pipelineTemplates,
        moduleRegistry,
        assemblyStrategies
      };
      
      console.log('Assembly configuration generated', {
        routingRulesCount: routingRules.length,
        pipelineTemplatesCount: pipelineTemplates.length,
        moduleRegistryCount: moduleRegistry.length
      });
      
      return assemblyConfig;
    } catch (error) {
      console.error('Failed to generate assembly configuration:', error);
      throw error;
    }
  }

  /**
   * 生成调度器配置
   */
  public async generateSchedulerConfig(config: ConfigData, assemblyConfig: PipelineAssemblyTable): Promise<PipelineSchedulerConfig> {
    try {
      // 基于虚拟模型权重生成负载均衡配置
      const weights = this.generatePipelineWeights(config);

      const schedulerConfig: PipelineSchedulerConfig = {
        basic: this.generateBasicConfig(),
        loadBalancing: this.generateLoadBalancingConfig(weights),
        healthCheck: this.generateHealthCheckConfig(),
        errorHandling: this.generateErrorHandlingConfig(),
        performance: this.generatePerformanceConfig(),
        monitoring: this.generateMonitoringConfig(),
        security: this.generateSecurityConfig()
      };

      console.log('Scheduler configuration generated');
      return schedulerConfig;
    } catch (error) {
      console.error('Failed to generate scheduler configuration:', error);
      throw error;
    }
  }

  /**
   * 生成基本配置
   * @private
   */
  private generateBasicConfig(): any {
    return {
      schedulerId: 'rcc-pipeline-scheduler',
      name: 'RCC Pipeline Scheduler',
      version: '1.0.0',
      description: 'Auto-generated scheduler configuration from RCC configuration'
    };
  }

  /**
   * 生成负载均衡配置
   * @private
   */
  private generateLoadBalancingConfig(weights: Record<string, number>): any {
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
   * @private
   */
  private generateHealthCheckConfig(): any {
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
   * @private
   */
  private generateErrorHandlingConfig(): any {
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
   * @private
   */
  private generatePerformanceConfig(): any {
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
   * @private
   */
  private generateMonitoringConfig(): any {
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
    };
  }

  /**
   * 生成安全配置
   * @private
   */
  private generateSecurityConfig(): any {
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
   * 生成路由规则
   */
  private async generateRoutingRules(config: ConfigData): Promise<RoutingRule[]> {
    const routingRules: RoutingRule[] = [];
    
    for (const [vmId, virtualModel] of Object.entries(config.virtualModels)) {
      if (!this.fixedVirtualModels.includes(vmId)) {
        continue;
      }
      
      // 为每个虚拟模型创建路由规则
      const rule: RoutingRule = {
        ruleId: `routing-${vmId}`,
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
          strategy: 'weighted',
          targetPipelineIds: [`pipeline-${vmId}`],
          weights: this.generateWeightsForVirtualModel(virtualModel)
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
      };
      
      routingRules.push(rule);
    }
    
    return routingRules;
  }

  /**
   * 生成流水线模板
   */
  private async generatePipelineTemplates(config: ConfigData): Promise<PipelineTemplate[]> {
    const templates: PipelineTemplate[] = [];
    
    for (const [vmId, virtualModel] of Object.entries(config.virtualModels)) {
      if (!this.fixedVirtualModels.includes(vmId)) {
        continue;
      }
      
      // 获取第一个目标作为主要配置
      const firstTarget = virtualModel.targets[0];
      if (!firstTarget) continue;
      
      const template: PipelineTemplate = {
        templateId: `pipeline-${vmId}`,
        name: `Pipeline for ${vmId}`,
        description: `Pipeline for virtual model ${vmId} routing to ${firstTarget.providerId}/${firstTarget.modelId}`,
        version: '1.0.0',
        baseConfig: {
          timeout: 60000,
          maxConcurrentRequests: 100,
          priority: virtualModel.priority || 1,
          enabled: virtualModel.enabled !== false
        },
        moduleAssembly: {
          moduleInstances: this.generateModuleInstances(vmId, firstTarget),
          connections: this.generateModuleConnections(vmId),
          dataMappings: this.generateDataMappings(vmId),
          conditions: []
        },
        executionStrategy: {
          mode: 'sequential',
          timeout: 60000,
          retryPolicy: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            jitter: true
          }
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
      };
      
      templates.push(template);
    }
    
    return templates;
  }
  
  /**
   * 生成模块注册表
   */
  private async generateModuleRegistry(config: ConfigData): Promise<ModuleRegistry[]> {
    // 合并默认模块和配置中定义的模块
    const registry = [...this.defaultModules];
    
    // 添加配置特定的模块（如果有）
    for (const [providerId, provider] of Object.entries(config.providers)) {
      for (const [modelId, model] of Object.entries(provider.models)) {
        // 为每个提供商-模型组合创建特定的提供者模块
        const providerModule: ModuleRegistry = {
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
        };
        
        registry.push(providerModule);
      }
    }
    
    return registry;
  }
  
  /**
   * 生成模块实例配置
   */
  private generateModuleInstances(vmId: string, target: any): ModuleInstanceConfig[] {
    return [
      {
        instanceId: `${vmId}-compatibility`,
        moduleId: 'compatibility-module',
        name: 'Compatibility Module',
        initialization: {
          config: {
            targetProvider: target.providerId,
            targetModel: target.modelId
          },
          dependencies: [],
          startupOrder: 1,
          required: true
        },
        execution: {
          timeout: 10000,
          retryPolicy: {
            maxRetries: 2,
            baseDelay: 1000,
            maxDelay: 5000,
            backoffMultiplier: 2,
            jitter: true
          },
          circuitBreaker: {
            failureThreshold: 5,
            recoveryTime: 60000,
            requestVolumeThreshold: 10,
            timeout: 5000
          },
          healthCheck: {
            enabled: true,
            interval: 30000,
            timeout: 5000
          }
 },
        conditions: {
          enableConditions: [],
          skipConditions: []
        }
      },
      {
        instanceId: `${vmId}-provider`,
        moduleId: `provider-${target.providerId}-${target.modelId}`,
        name: 'Provider Module',
        initialization: {
          config: {
            providerId: target.providerId,
            modelId: target.modelId,
            keyIndex: target.keyIndex || 0
          },
          dependencies: [`${vmId}-compatibility`],
          startupOrder: 2,
          required: true
        },
        execution: {
          timeout: 30000,
          retryPolicy: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            jitter: true
          }
        },
        conditions: {
          enableConditions: [],
          skipConditions: []
        }
      }
    ];
  }
  
  /**
   * 生成模块连接
   */
  private generateModuleConnections(vmId: string): ModuleConnection[] {
    return [
      {
        id: `${vmId}-compatibility-to-provider`,
        from: `${vmId}-compatibility`,
        to: `${vmId}-provider`,
        type: 'success',
        dataMapping: {
          sourcePath: 'compatibility.output',
          targetPath: 'provider.input',
          required: true
        }
      }
    ];
  }
  
  /**
   * 生成数据映射
   */
  private generateDataMappings(vmId: string): DataMapping[] {
    return [
      {
        sourcePath: 'request.body',
        targetPath: `${vmId}-compatibility.input`,
        required: true
      }
    ];
  }
  
  /**
   * 生成流水线权重
   */
  private generatePipelineWeights(config: ConfigData): Record<string, number> {
    const weights: Record<string, number> = {};
    let totalPriority = 0;
    
    // 计算总优先级
    for (const [vmId, virtualModel] of Object.entries(config.virtualModels)) {
      if (this.fixedVirtualModels.includes(vmId)) {
        totalPriority += virtualModel.priority || 1;
      }
    }
    
    // 根据优先级分配权重
    for (const [vmId, virtualModel] of Object.entries(config.virtualModels)) {
      if (this.fixedVirtualModels.includes(vmId)) {
        const priority = virtualModel.priority || 1;
        weights[`pipeline-${vmId}`] = Math.round((priority / totalPriority) * 100);
      }
    }
    
    return weights;
  }
  
  /**
   * 为虚拟模型生成权重
   */
  private generateWeightsForVirtualModel(virtualModel: any): Record<string, number> {
    const weights: Record<string, number> = {};
    
    // 为每个目标分配权重
    virtualModel.targets.forEach((target: any, index: number) => {
      const pipelineId = `pipeline-${virtualModel.id}_target_${index}`;
      weights[pipelineId] = 100 / virtualModel.targets.length;
    });
    
    return weights;
  }
  
  /**
   * 初始化默认模块注册表
   */
  private initializeDefaultModules(): ModuleRegistry[] {
    return [
      {
        moduleId: 'compatibility-module',
        name: 'Compatibility Module',
        version: '1.0.0',
        type: 'compatibility',
        description: 'Handles request/response format compatibility',
        capabilities: ['format-conversion', 'field-mapping', 'validation'],
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
        tags: ['compatibility', 'adapter']
      }
    ];
  }
  
  /**
   * 初始化默认组装策略
   */
  private initializeDefaultAssemblyStrategies(): AssemblyStrategy[] {
    return [
      {
        strategyId: 'performance-based-assembly',
        name: 'Performance Based Assembly',
        description: 'Assemble pipelines based on performance metrics',
        algorithm: 'dynamic',
        config: {
          performanceMetrics: ['latency', 'errorRate', 'throughput'],
          weighting: {
            latency: 0.5,
            errorRate: 0.3,
            throughput: 0.2
          }
        },
        selectionCriteria: {
          performance: true,
          cost: false,
          reliability: true
        }
      }
    ];
  }

  /**
   * 生成流水线表
   */
  public async generatePipelineTable(config: ConfigData): Promise<PipelineTable> {
    try {
      // 生成装配表配置
      const assemblyConfig = await this.generateAssemblyConfig(config);
      
      // 创建流水线表
      const pipelineTable = new Map<string, PipelineEntry>();
      
      // 为每个虚拟模型创建流水线条目
      for (const [vmId, virtualModel] of Object.entries(config.virtualModels || {})) {
        if (!this.fixedVirtualModels.includes(vmId)) {
          continue;
        }
        
        // 为每个目标创建条目
        for (let i = 0; i < virtualModel.targets.length; i++) {
          const target = virtualModel.targets[i];
          
          // 获取提供商配置
          const provider = config.providers[target.providerId];
          if (!provider) {
            console.warn(`Provider ${target.providerId} not found for virtual model ${vmId}`);
            continue;
          }
          
          // 获取API密钥数组
          const apiKeys = provider.auth?.keys || [];
          
          // 如果没有API密钥，跳过这个目标
          if (apiKeys.length === 0) {
            console.warn(`Provider ${target.providerId} has no API keys, skipping target for virtual model ${vmId}`);
            continue;
          }
          
          // 如果没有指定keyIndex，为每个API密钥创建一个条目
          if (target.keyIndex === undefined) {
            for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
              const entryId = `${vmId}_${target.providerId}_${target.modelId}_${keyIndex}`;
              pipelineTable.set(entryId, {
                virtualModelId: vmId,
                targetProvider: target.providerId,
                targetModel: target.modelId,
                keyIndex: keyIndex,
                priority: virtualModel.priority || 1,
                enabled: virtualModel.enabled !== false,
                weight: virtualModel.weight || Math.round(100 / virtualModel.targets.length),
                metadata: {
                  providerType: provider.type,
                  apiKey: apiKeys[keyIndex],
                  createdAt: new Date().toISOString()
                }
              });
            }
          } else {
            // 检查keyIndex是否有效
            if (target.keyIndex >= apiKeys.length) {
              console.warn(`Invalid keyIndex ${target.keyIndex} for provider ${target.providerId} with only ${apiKeys.length} keys, skipping target for virtual model ${vmId}`);
              continue;
            }
            
            // 使用指定的keyIndex
            const entryId = `${vmId}_${target.providerId}_${target.modelId}_${target.keyIndex}`;
            pipelineTable.set(entryId, {
              virtualModelId: vmId,
              targetProvider: target.providerId,
              targetModel: target.modelId,
              keyIndex: target.keyIndex,
              priority: virtualModel.priority || 1,
              enabled: virtualModel.enabled !== false,
              weight: virtualModel.weight || Math.round(100 / virtualModel.targets.length),
              metadata: {
                providerType: provider.type,
                apiKey: apiKeys[target.keyIndex] || '',
                createdAt: new Date().toISOString()
              }
            });
          }
        }
      }
      
      console.log('Pipeline table generated successfully', {
        entryCount: pipelineTable.size,
        virtualModels: Object.keys(config.virtualModels || {}).filter(vmId => this.fixedVirtualModels.includes(vmId)).length
      });
      
      return pipelineTable;
    } catch (error) {
      console.error('Failed to generate pipeline table:', error);
      throw error;
    }
  }

  /**
   * 验证流水线表
   */
  public async validatePipelineTable(pipelineTable: PipelineTable): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 验证每个条目
    for (const [entryId, entry] of pipelineTable.entries()) {
      if (!entry.targetProvider) {
        errors.push(`Entry ${entryId} missing target provider`);
      }

      if (!entry.targetModel) {
        errors.push(`Entry ${entryId} missing target model`);
      }

      if (entry.keyIndex < 0) {
        errors.push(`Entry ${entryId} has invalid key index: ${entry.keyIndex}`);
      }

      if (entry.priority < 1 || entry.priority > 10) {
        errors.push(`Entry ${entryId} has invalid priority: ${entry.priority}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 销毁生成器
   */
  public async destroy(): Promise<void> {
    this.initialized = false;
    console.log('PipelineTableGenerator destroyed successfully');
  }
}