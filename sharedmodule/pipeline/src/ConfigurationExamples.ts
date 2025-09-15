/**
 * Example configurations for the Pipeline System
 * These are complete, working examples that can be used as templates
 */

import { 
  PipelineAssemblyTable, 
  PipelineSchedulerConfig,
  PipelineConfigFactory,
  ConditionOperator
} from './PipelineCompleteConfig';

// ===== Example 1: Simple API Processing Pipeline =====

/**
 * Simple API processing pipeline assembly table
 */
export const simpleApiAssemblyTable: PipelineAssemblyTable = {
  version: '1.0.0',
  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    description: 'Simple API processing pipeline assembly',
    author: 'RCC System'
  },
  routingRules: [
    {
      ruleId: 'api-request-routing',
      name: 'API Request Routing',
      priority: 1,
      enabled: true,
      conditions: [
        {
          field: 'request.method',
          operator: ConditionOperator.CONTAINS,
          value: ['GET', 'POST', 'PUT', 'DELETE']
        },
        {
          field: 'request.headers.content-type',
          operator: ConditionOperator.CONTAINS,
          value: 'application/json'
        }
      ],
      pipelineSelection: {
        strategy: 'weighted',
        weights: {
          'api-pipeline-v1': 70,
          'api-pipeline-v2': 30
        }
      },
      moduleFilters: [
        {
          moduleTypes: ['api-handler', 'data-processor'],
          capabilities: ['json-processing', 'error-handling']
        }
      ],
      dynamicConfig: {
        enableAdaptiveRouting: true,
        performanceThresholds: {
          maxResponseTime: 5000,
          minSuccessRate: 0.95,
          maxErrorRate: 0.05
        }
      }
    }
  ],
  pipelineTemplates: [
    {
      templateId: 'api-pipeline-v1',
      name: 'API Processing Pipeline v1',
      description: 'Standard API request processing pipeline',
      version: '1.0.0',
      baseConfig: {
        timeout: 30000,
        maxConcurrentRequests: 100,
        priority: 1,
        enabled: true,
        tags: ['api', 'v1', 'processing']
      },
      moduleAssembly: {
        moduleInstances: [
          {
            instanceId: 'auth-validator',
            moduleId: 'authentication-module',
            name: 'Authentication Validator',
            initialization: {
              config: {
                validateTokens: true,
                tokenExpiryCheck: true,
                allowedIssuers: ['https://auth.example.com']
              },
              startupOrder: 1,
              required: true
            },
            execution: {
              timeout: 5000,
              healthCheck: {
                enabled: true,
                interval: 30000,
                timeout: 3000,
                endpoint: '/health/auth'
              }
            },
            conditions: {
              enableConditions: [
                {
                  field: 'request.headers.authorization',
                  operator: ConditionOperator.CONTAINS,
                  value: null
                }
              ]
            }
          },
          {
            instanceId: 'rate-limiter',
            moduleId: 'rate-limiting-module',
            name: 'Rate Limiter',
            initialization: {
              config: {
                requestsPerMinute: 100,
                burstSize: 20,
                keyExtractor: 'request.ip'
              },
              startupOrder: 2,
              required: true
            },
            execution: {
              timeout: 1000
            },
            conditions: {
              enableConditions: [],
              skipConditions: []
            }
          },
          {
            instanceId: 'data-validator',
            moduleId: 'validation-module',
            name: 'Data Validator',
            initialization: {
              config: {
                strictMode: true,
                customValidators: ['email-validator', 'phone-validator']
              },
              startupOrder: 3,
              required: true
            },
            execution: {
              timeout: 3000
            },
            conditions: {
              enableConditions: [],
              skipConditions: []
            }
          },
          {
            instanceId: 'business-processor',
            moduleId: 'business-logic-module',
            name: 'Business Logic Processor',
            initialization: {
              config: {
                enableCaching: true,
                cacheTtl: 300000
              },
              startupOrder: 4,
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
            instanceId: 'response-formatter',
            moduleId: 'response-formatting-module',
            name: 'Response Formatter',
            initialization: {
              config: {
                format: 'json',
                includeMetadata: true
              },
              startupOrder: 5,
              required: true
            },
            execution: {
              timeout: 2000
            },
            conditions: {
              enableConditions: [],
              skipConditions: []
            }
          }
        ],
        connections: [
          {
            id: 'auth-to-rate-limit',
            from: 'auth-validator',
            to: 'rate-limiter',
            type: 'success',
            priority: 1
          },
          {
            id: 'rate-limit-to-validator',
            from: 'rate-limiter',
            to: 'data-validator',
            type: 'success',
            priority: 1
          },
          {
            id: 'validator-to-business',
            from: 'data-validator',
            to: 'business-processor',
            type: 'success',
            priority: 1
          },
          {
            id: 'business-to-formatter',
            from: 'business-processor',
            to: 'response-formatter',
            type: 'success',
            priority: 1
          }
        ],
        dataMappings: [
          {
            sourcePath: 'auth-validator.result.userId',
            targetPath: 'context.userId',
            required: true
          },
          {
            sourcePath: 'auth-validator.result.permissions',
            targetPath: 'context.permissions',
            required: true
          },
          {
            sourcePath: 'data-validator.result.validatedData',
            targetPath: 'business-processor.input.data',
            required: true
          }
        ],
        conditions: []
      },
      executionStrategy: {
        mode: 'sequential',
        timeout: 30000,
        retryPolicy: {
          maxRetries: 2,
          baseDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2,
          jitter: true
        }
      },
      dataFlow: {
        inputSchema: {
          type: 'object',
          properties: {
            request: {
              type: 'object',
              properties: {
                method: { type: 'string' },
                headers: { type: 'object' },
                body: { type: 'object' }
              }
            }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            headers: { type: 'object' },
            body: { type: 'object' }
          }
        },
        validation: {
          enabled: true,
          strict: true
        }
      }
    }
  ],
  moduleRegistry: [
    {
      moduleId: 'authentication-module',
      name: 'Authentication Module',
      version: '1.0.0',
      type: 'security',
      description: 'Handles JWT token validation and user authentication',
      capabilities: ['jwt-validation', 'user-authentication', 'permission-checking'],
      configSchema: {
        type: 'object',
        properties: {
          validateTokens: { type: 'boolean' },
          tokenExpiryCheck: { type: 'boolean' },
          allowedIssuers: { type: 'array', items: { type: 'string' } }
        }
      },
      initializationConfig: {
        cacheSize: 1000,
        cacheTtl: 3600000
      },
      tags: ['security', 'authentication'],
      metadata: {
        author: 'Security Team',
        category: 'security'
      }
    },
    {
      moduleId: 'rate-limiting-module',
      name: 'Rate Limiting Module',
      version: '1.0.0',
      type: 'traffic-control',
      description: 'Implements rate limiting and traffic control',
      capabilities: ['rate-limiting', 'traffic-control', 'ddos-protection'],
      configSchema: {
        type: 'object',
        properties: {
          requestsPerMinute: { type: 'number' },
          burstSize: { type: 'number' },
          keyExtractor: { type: 'string' }
        }
      },
      tags: ['traffic', 'rate-limiting'],
      metadata: {
        author: 'Infrastructure Team',
        category: 'traffic-control'
      },
      initializationConfig: {
        defaultConfig: {
          requestsPerMinute: 100,
          burstSize: 20
        }
      }
    }
  ],
  assemblyStrategies: [
    {
      strategyId: 'performance-based',
      name: 'Performance Based Assembly',
      description: 'Assembles pipelines based on performance metrics',
      algorithm: 'dynamic',
      config: {
        metricsWeight: 0.6,
        costWeight: 0.3,
        reliabilityWeight: 0.1
      },
      selectionCriteria: {
        performance: true,
        cost: true,
        reliability: true
      }
    }
  ]
};

// ===== Example 2: Advanced Scheduler Configuration =====

/**
 * Advanced scheduler configuration with comprehensive settings
 */
export const advancedSchedulerConfig: PipelineSchedulerConfig = {
  basic: {
    schedulerId: 'advanced-scheduler',
    name: 'Advanced Pipeline Scheduler',
    version: '2.0.0',
    description: 'Advanced scheduler with comprehensive configuration'
  },
  loadBalancing: {
    strategy: 'weighted',
    strategyConfig: {
      weighted: {
        weights: {
          'api-pipeline-v1': 60,
          'api-pipeline-v2': 30,
          'api-pipeline-v3': 10
        },
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
  },
  healthCheck: {
      strategy: 'active',
      intervals: {
        activeCheckInterval: 30000,
        passiveCheckInterval: 60000,
        fullCheckInterval: 300000
      },
      checks: {
        basic: {
          enabled: true,
          timeout: 5000,
          endpoint: '/health'
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
      customClassifiers: [
        {
          name: 'business-error-classifier',
          errorCodeRanges: [4000, 4999],
          classificationRules: [
            {
              field: 'error.code',
              operator: ConditionOperator.CONTAINS,
              value: [4001, 4002, 4003],
              classification: {
                category: 'business',
                severity: 'medium',
                recoverability: 'recoverable'
              }
            }
          ],
          action: 'apply_business_error_strategy'
        }
      ]
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
        blacklistDuration: 120000,
        exponentialBackoff: true
      },
      authenticationErrors: {
        action: 'enter_maintenance',
        maintenanceDuration: 600000,
        credentialRefreshFunction: 'refreshApiCredentials'
      },
      networkErrors: {
        action: 'retry_with_backoff',
        maxRetryAttempts: 5,
        backoffMultiplier: 2,
        bufferSize: 200
      }
    },
    blacklist: {
      enabled: true,
      maxEntries: 2000,
      defaultDuration: 120000,
      maxDuration: 7200000,
      cleanupInterval: 300000,
      autoExpiry: true
    },
    reporting: {
      enableDetailedReporting: true,
      reportInterval: 30000,
      includeStackTraces: true,
      includeContext: true,
      customReporters: [
        'slackReporter',
        'emailReporter',
        'databaseReporter'
      ]
    }
  },
  performance: {
    concurrency: {
      maxConcurrentRequests: 2000,
      maxConcurrentRequestsPerPipeline: 200,
      queueSize: 10000,
      enablePriorityQueue: true
    },
    timeouts: {
      defaultTimeout: 30000,
      executionTimeout: 60000,
      idleTimeout: 600000,
      startupTimeout: 120000,
      shutdownTimeout: 60000
    },
    caching: {
      enabled: true,
      strategy: 'lru',
      maxSize: 5000,
      ttl: 1800000
    },
    rateLimiting: {
      enabled: true,
      strategy: 'token_bucket',
      requestsPerSecond: 200,
      burstSize: 400
    }
  },
  monitoring: {
    metrics: {
      enabled: true,
      collectionInterval: 5000,
      metrics: [
        {
          name: 'request_count',
          type: 'counter',
          description: 'Total number of requests processed',
          labels: { pipeline: 'all' }
        },
        {
          name: 'request_duration',
          type: 'histogram',
          description: 'Request processing duration',
          labels: { pipeline: 'all' },
          buckets: [100, 500, 1000, 5000, 10000]
        },
        {
          name: 'error_count',
          type: 'counter',
          description: 'Total number of errors',
          labels: { pipeline: 'all', error_type: 'all' }
        }
      ],
      aggregation: {
        enabled: true,
        interval: 60000,
        functions: ['avg', 'sum', 'count', 'max', 'min', 'p95', 'p99']
      }
    },
    logging: {
      level: 'info',
      format: 'json',
      outputs: [
        {
          type: 'console',
          config: { colorize: true },
          level: 'info'
        },
        {
          type: 'file',
          config: {
            filename: '/var/log/pipeline/scheduler.log',
            maxSize: '100MB',
            maxFiles: 10
          },
          level: 'debug'
        },
        {
          type: 'network',
          config: {
            host: 'logstash.example.com',
            port: 5044,
            protocol: 'tcp'
          },
          level: 'warn'
        }
      ],
      sampling: {
        enabled: true,
        rate: 0.1
      }
    },
    tracing: {
      enabled: true,
      samplingRate: 0.05,
      includePayloads: false,
      customSpans: ['database-query', 'external-api-call', 'cache-operation']
    },
    alerts: {
      enabled: true,
      rules: [
        {
          ruleId: 'high-error-rate',
          name: 'High Error Rate Alert',
          condition: 'error_rate > 0.1',
          threshold: 0.1,
          duration: 300000,
          severity: 'high',
          channels: ['slack', 'email']
        },
        {
          ruleId: 'slow-response-time',
          name: 'Slow Response Time Alert',
          condition: 'avg_response_time > 5000',
          threshold: 5000,
          duration: 180000,
          severity: 'medium',
          channels: ['slack']
        },
        {
          ruleId: 'pipeline-down',
          name: 'Pipeline Down Alert',
          condition: 'healthy_pipelines < 1',
          threshold: 1,
          duration: 60000,
          severity: 'critical',
          channels: ['slack', 'email', 'sms']
        }
      ],
      channels: [
        {
          channelId: 'slack',
          name: 'Slack Notifications',
          type: 'slack',
          config: {
            webhookUrl: 'https://hooks.slack.com/services/xxx',
            channel: '#alerts',
            username: 'PipelineBot'
          },
          enabled: true
        },
        {
          channelId: 'email',
          name: 'Email Notifications',
          type: 'email',
          config: {
            smtp: {
              host: 'smtp.example.com',
              port: 587,
              secure: false
            },
            from: 'pipeline@example.com',
            to: ['devops@example.com', 'alerts@example.com']
          },
          enabled: true
        }
      ]
    }
  },
  security: {
    authentication: {
      enabled: true,
      method: 'jwt',
      config: {
        secret: 'your-secret-key',
        algorithms: ['HS256'],
        issuer: 'https://auth.example.com',
        audience: 'pipeline-system'
      }
    },
    authorization: {
      enabled: true,
      roles: ['admin', 'operator', 'viewer'],
      permissions: {
        admin: ['*'],
        operator: ['read', 'execute', 'monitor'],
        viewer: ['read']
      }
    },
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
      keyRotationInterval: 86400000
    },
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 1000,
      burstSize: 100
    }
  }
};

// ===== Example 3: Simple Configuration for Quick Start =====

/**
 * Simple configuration for quick start and testing
 */
export const simpleSchedulerConfig: PipelineSchedulerConfig = {
  basic: {
    schedulerId: 'simple-scheduler',
    name: 'Simple Scheduler',
    version: '1.0.0',
    description: 'Simple scheduler for quick start'
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
      maxRetries: 2,
      retryDelay: 1000,
      backoffMultiplier: 2,
      enableCircuitBreaker: false
    }
  },
  healthCheck: {
    strategy: 'active',
    intervals: {
      activeCheckInterval: 60000,
      passiveCheckInterval: 120000,
      fullCheckInterval: 300000
    },
    checks: {
      basic: {
        enabled: true,
        timeout: 5000,
        endpoint: '/health'
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
        notificationEnabled: false,
        logLevel: 'error'
      },
      recoverableErrors: {
        action: 'blacklist_temporary',
        maxRetryAttempts: 2,
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
        bufferSize: 50
      }
    },
    blacklist: {
      enabled: true,
      maxEntries: 100,
      defaultDuration: 60000,
      maxDuration: 3600000,
      cleanupInterval: 300000,
      autoExpiry: true
    },
    reporting: {
      enableDetailedReporting: false,
      reportInterval: 60000,
      includeStackTraces: false,
      includeContext: false,
      customReporters: []
    }
  },
  performance: {
    concurrency: {
      maxConcurrentRequests: 100,
      maxConcurrentRequestsPerPipeline: 20,
      queueSize: 500,
      enablePriorityQueue: false
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
      requestsPerSecond: 50,
      burstSize: 100
    }
  },
  monitoring: {
    metrics: {
      enabled: true,
      collectionInterval: 30000,
      metrics: [],
      aggregation: {
        enabled: false,
        interval: 60000,
        functions: ['avg', 'sum', 'count']
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
      requestsPerMinute: 100,
      burstSize: 50
    }
  }
};

// ===== Configuration Export Functions =====

/**
 * Get configuration by environment
 */
export function getSchedulerConfig(environment: 'development' | 'staging' | 'production'): PipelineSchedulerConfig {
  switch (environment) {
    case 'development':
      return PipelineConfigFactory.createDefaultSchedulerConfig();
    case 'staging':
      return simpleSchedulerConfig;
    case 'production':
      return advancedSchedulerConfig;
    default:
      return PipelineConfigFactory.createDefaultSchedulerConfig();
  }
}

/**
 * Get assembly table by use case
 */
export function getAssemblyTable(useCase: 'simple-api' | 'complex-api' | 'batch-processing'): PipelineAssemblyTable {
  switch (useCase) {
    case 'simple-api':
      return simpleApiAssemblyTable;
    case 'complex-api':
    case 'batch-processing':
    default:
      return PipelineConfigFactory.createDefaultAssemblyTable();
  }
}