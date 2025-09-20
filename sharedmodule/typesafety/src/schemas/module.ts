import { z } from 'zod';
import { filePathSchema } from './core.js';

/**
 * BaseModule 配置模式
 */
export const baseModuleConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must follow semver format'),
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),

  // 模块类型
  type: z.enum(['core', 'extension', 'provider', 'adapter']).optional(),
  category: z.enum(['foundation', 'pipeline', 'server', 'debug', 'utility']).optional(),

  // 依赖关系
  dependencies: z.object({
    modules: z.array(z.string()).optional(),  // 模块依赖
    providers: z.array(z.string()).optional(), // 提供程序依赖
    services: z.array(z.string()).optional()   // 服务依赖
  }).optional(),

  // 生命周期配置
  lifecycle: z.object({
    enabled: z.boolean().optional(),
    autoStart: z.boolean().optional(),
    startPriority: z.number().int().optional(),
    stopTimeout: z.number().positive().optional(),
    restartPolicy: z.enum(['never', 'on-error', 'always']).optional(),
    maxRestarts: z.number().int().min(0).optional()
  }).optional(),

  // 资源限制
  resources: z.object({
    cpuLimit: z.number().positive().optional(),      // CPU限制 (百分比)
    memoryLimit: z.number().positive().optional(),   // 内存限制 (MB)
    diskLimit: z.number().positive().optional(),     // 磁盘限制 (MB)
    networkLimit: z.number().positive().optional()   // 网络限制 (MB/s)
  }).optional(),

  // 配置信息
  config: z.object({
    schema: filePathSchema.optional(),        // JSON Schema 文件路径
    defaults: z.record(z.any()).optional(),   // 默认值
    validation: z.enum(['strict', 'loose', 'none']).optional(), // 验证级别
    autoReload: z.boolean().optional()        // 自动重载配置
  }).optional(),

  // 外部接口
  interfaces: z.object({
    api: z.object({
      enabled: z.boolean().optional(),
      version: z.string().optional(),
      endpoints: z.array(z.string()).optional()
    }).optional(),
    events: z.object({
      enabled: z.boolean().optional(),
      topics: z.array(z.string()).optional()
    }).optional(),
    webhooks: z.object({
      enabled: z.boolean().optional(),
      endpoints: z.array(z.string().url()).optional()
    }).optional()
  }).optional(),

  // 安全设置
  security: z.object({
    sandboxed: z.boolean().optional(),         // 沙箱模式
    permissions: z.array(z.enum([
      'file-system', 'network', 'process', 'memory', 'device'
    ])).optional(),
    allowedPaths: z.array(filePathSchema).optional(),    // 允许访问的路径
    blockedPaths: z.array(filePathSchema).optional(),    // 禁止访问的路径
    allowedHosts: z.array(z.string()).optional(),        // 允许访问的主机
    blockedHosts: z.array(z.string()).optional()         // 禁止访问的主机
  }).optional(),

  // 日志配置
  logging: z.object({
    enabled: z.boolean().optional(),
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
    output: z.enum(['console', 'file', 'both', 'none']).optional(),
    format: z.enum(['text', 'json']).optional(),
    rotation: z.object({
      enabled: z.boolean().optional(),
      maxSize: z.union([z.number(), z.string()]).optional(), // 文件大小限制
      maxFiles: z.number().int().positive().optional()      // 最大文件数
    }).optional()
  }).optional(),

  // 性能调优
  performance: z.object({
    caching: z.object({
      enabled: z.boolean().optional(),
      type: z.enum(['memory', 'disk', 'redis', 'custom']).optional(),
      maxSize: z.number().positive().optional(),
      ttl: z.number().positive().optional() // 缓存时间 (秒)
    }).optional(),
    pooling: z.object({
      enabled: z.boolean().optional(),
      minSize: z.number().int().positive().optional(),
      maxSize: z.number().int().positive().optional(),
      idleTimeout: z.number().positive().optional()
    }).optional(),
    batching: z.object({
      enabled: z.boolean().optional(),
      maxSize: z.number().int().positive().optional(),
      maxWaitTime: z.number().positive().optional() // 最大等待时间 (毫秒)
    }).optional()
  }).optional(),

  // 扩展点
  extensions: z.object({
    hooks: z.array(z.object({
      event: z.string(),
      handler: z.string(),
      priority: z.number().int().optional()
    })).optional(),
    plugins: z.array(z.object({
      id: z.string(),
      enabled: z.boolean().optional(),
      config: z.record(z.any()).optional()
    })).optional(),
    middleware: z.array(z.object({
      id: z.string(),
      type: z.enum(['request', 'response', 'error']),
      handler: z.string(),
      priority: z.number().int().optional()
    })).optional()
  }).optional()
}).passthrough();

/**
 * 模块清单模式
 */
export const moduleManifestSchema = z.object({
  manifestVersion: z.string().regex(/^\d+\.\d+\.\d+/, 'Manifest version must follow semver format'),
  modules: z.array(baseModuleConfigSchema),
  metadata: z.object({
    generated: z.string().datetime(),
    generator: z.string(),
    schemaVersion: z.string().optional(),
    totalModules: z.number().int().positive()
  })
}).passthrough();

/**
 * 模块加载结果模式
 */
export const moduleLoadResultSchema = z.object({
  moduleId: z.string(),
  status: z.enum(['success', 'failed', 'skipped', 'disabled']),
  version: z.string(),
  loadedAt: z.string().datetime(),

  // 加载详细信息
  loadInfo: z.object({
    duration: z.number().positive(),           // 加载耗时 (毫秒)
    memoryUsage: z.number().positive(),        // 内存使用 (字节)
    dependenciesResolved: z.number().int(),    // 已解析的依赖数
    warnings: z.array(z.string()).optional()   // 警告信息
  }),

  // 错误信息
  error: z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    stack: z.string().optional(),
    recoverable: z.boolean().optional()
  }).optional(),

  // 模块实例信息
  instance: z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(['initializing', 'ready', 'error', 'stopped']),
    interfaces: z.array(z.string()).optional()
  }).optional(),

  // 配置验证结果
  configValidation: z.object({
    valid: z.boolean(),
    errors: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional()
  }).optional()
}).passthrough();

/**
 * 模块状态模式
 */
export const moduleStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  status: z.enum(['unknown', 'loading', 'ready', 'error', 'stopped', 'disabled', 'updating']),
  health: z.enum(['unknown', 'healthy', 'degraded', 'unhealthy']),

  // 运行状态
  runtime: z.object({
    startedAt: z.string().datetime().optional(),
    uptime: z.number().nonnegative().optional(),        // 运行时间 (秒)
    lastHeartbeat: z.string().datetime().optional(),
    restartCount: z.number().int().nonnegative(),
    lastRestartAt: z.string().datetime().optional()
  }),

  // 资源使用情况
  resources: z.object({
    memory: z.object({
      used: z.number().nonnegative(),      // 已使用内存 (字节)
      peak: z.number().nonnegative(),      // 峰值内存 (字节)
      limit: z.number().nonnegative().optional()
    }),
    cpu: z.object({
      usage: z.number().min(0).max(100),   // CPU 使用率 (百分比)
      peak: z.number().min(0).max(100),    // 峰值使用率 (百分比)
      limit: z.number().min(0).max(100).optional()
    }),
    network: z.object({
      bytesIn: z.number().nonnegative(),   // 入站字节数
      bytesOut: z.number().nonnegative(),  // 出站字节数
      errors: z.number().int().nonnegative() // 网络错误数
    })
  }),

  // 性能指标
  performance: z.object({
    requests: z.object({
      total: z.number().int().nonnegative(),      // 总请求数
      success: z.number().int().nonnegative(),    // 成功请求数
      failed: z.number().int().nonnegative(),     // 失败请求数
      averageResponseTime: z.number().positive()   // 平均响应时间 (毫秒)
    }),
    throughput: z.object({
      current: z.number().nonnegative(),          // 当前吞吐量 (请求/秒)
      peak: z.number().nonnegative(),             // 峰值吞吐量 (请求/秒)
      average: z.number().nonnegative()           // 平均吞吐量 (请求/秒)
    })
  }),

  // 错误统计
  errors: z.object({
    total: z.number().int().nonnegative(),        // 总错误数
    critical: z.number().int().nonnegative(),     // 严重错误数
    warnings: z.number().int().nonnegative(),     // 警告数
    lastError: z.object({
      timestamp: z.string().datetime().optional(),
      code: z.string().optional(),
      message: z.string().optional(),
      details: z.record(z.any()).optional()
    }).optional()
  })
}).passthrough();

/**
 * 模块依赖图模式
 */
export const dependencyGraphSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: z.enum(['core', 'extension', 'provider', 'service']),
    status: z.enum(['loaded', 'loading', 'failed', 'disabled']),
    version: z.string(),
    dependencies: z.array(z.string()),
    dependents: z.array(z.string()),
    depth: z.number().int().nonnegative()
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.enum(['dependency', 'extension', 'service']),
    weight: z.number().positive().optional()
  })),
  metadata: z.object({
    totalNodes: z.number().int().positive(),
    totalEdges: z.number().int().positive(),
    circularDependencies: z.array(z.array(z.string())).optional(),
    loadOrder: z.array(z.string()).optional(),
    criticalPath: z.array(z.string()).optional()
  })
}).passthrough();

// ===== 类型导出 =====
export type BaseModuleConfig = z.infer<typeof baseModuleConfigSchema>;
export type ModuleManifest = z.infer<typeof moduleManifestSchema>;
export type ModuleLoadResult = z.infer<typeof moduleLoadResultSchema>;
export type ModuleStatus = z.infer<typeof moduleStatusSchema>;
export type DependencyGraph = z.infer<typeof dependencyGraphSchema>;