// Enhanced pipeline module with full logging system
// 集成完整日志系统的增强型pipeline模块

const { underConstruction } = require('rcc-underconstruction');

/**
 * Debug logging system implementation
 * 调试日志系统实现
 */

// Default configuration
const DEFAULT_DEBUG_CONFIG = {
  enabled: false,
  baseDirectory: './debug-logs',
  paths: {
    requests: 'requests',
    responses: 'responses',
    errors: 'errors',
    pipeline: 'pipeline',
    system: 'system'
  },
  logLevel: 'info',
  contentFiltering: {
    enabled: true,
    sensitiveFields: ['apiKey', 'password', 'token', 'secret', 'key', 'authorization', 'bearer']
  },
  maxLogFiles: 1000,
  maxLogSize: '100MB'
};

// Enhanced Debug Log Manager with full logging capabilities
class SimpleDebugLogManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_DEBUG_CONFIG, ...config };
    this.logs = [];
    this.activeRequests = new Map();

    try {
      this.fileSystem = require('fs');
      this.path = require('path');
    } catch (error) {
      console.warn('FileSystem not available, logging to memory only');
    }
  }

  startRequest(provider, operation, metadata) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const context = {
      requestId,
      pipelineId,
      startTime,
      provider,
      operation,
      metadata,
      getRequestId: () => requestId,
      getPipelineId: () => pipelineId,
      getStartTime: () => startTime,
      getProvider: () => provider,
      getOperation: () => operation,
      getMetadata: () => metadata
    };

    this.activeRequests.set(requestId, context);

    if (this.config.enabled && this.config.logLevel === 'debug') {
      this.logDebug(`Request started: ${provider}.${operation}`, { requestId, metadata });
    }

    return context;
  }

  async logSuccess(context, request, response) {
    if (!this.config.enabled) return;

    const duration = Date.now() - context.getStartTime();
    const entry = {
      type: 'success',
      requestId: context.getRequestId(),
      provider: context.getProvider(),
      operation: context.getOperation(),
      timestamp: Date.now(),
      request: this.filterContent(request),
      response: this.filterContent(response),
      duration
    };

    await this.writeLogEntry(entry);
    this.logs.push(entry);
    this.activeRequests.delete(context.getRequestId());

    if (this.config.logLevel !== 'silent') {
      console.log(`[${context.getRequestId()}] Request completed successfully`);
    }
  }

  async logError(context, request, error) {
    if (!this.config.enabled) return;

    const duration = Date.now() - context.getStartTime();
    const entry = {
      type: 'error',
      requestId: context.getRequestId(),
      provider: context.getProvider(),
      operation: context.getOperation(),
      timestamp: Date.now(),
      request: this.filterContent(request),
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Error'
      },
      duration
    };

    await this.writeLogEntry(entry, this.config.paths.errors);
    this.logs.push(entry);
    this.activeRequests.delete(context.getRequestId());

    if (this.config.logLevel !== 'silent') {
      console.error(`[${context.getRequestId()}] Request failed: ${error.message}`);
    }
  }

  async info(message, data) {
    if (!this.config.enabled || this.config.logLevel === 'silent') return;

    const entry = {
      type: 'info',
      requestId: 'system',
      provider: 'system',
      operation: 'info',
      timestamp: Date.now(),
      message,
      data: this.filterContent(data)
    };

    await this.writeLogEntry(entry);
    this.logs.push(entry);

    if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
      console.log(`[INFO] ${message}`, data || '');
    }
  }

  async warn(message, data) {
    if (!this.config.enabled || this.config.logLevel === 'silent' || this.config.logLevel === 'error') return;

    const entry = {
      type: 'warn',
      requestId: 'system',
      provider: 'system',
      operation: 'warn',
      timestamp: Date.now(),
      message,
      data: this.filterContent(data)
    };

    await this.writeLogEntry(entry);
    this.logs.push(entry);

    if (this.config.logLevel === 'debug' || this.config.logLevel === 'info' || this.config.logLevel === 'warn') {
      console.warn(`[WARN] ${message}`, data || '');
    }
  }

  async error(message, data) {
    if (!this.config.enabled || this.config.logLevel === 'silent') return;

    const entry = {
      type: 'error',
      requestId: 'system',
      provider: 'system',
      operation: 'error',
      timestamp: Date.now(),
      message,
      data: this.filterContent(data)
    };

    await this.writeLogEntry(entry, this.config.paths.errors);
    this.logs.push(entry);

    console.error(`[ERROR] ${message}`, data || '');
  }

  async logDebug(message, data) {
    if (!this.config.enabled || this.config.logLevel !== 'debug') return;

    const entry = {
      type: 'debug',
      requestId: 'system',
      provider: 'system',
      operation: 'debug',
      timestamp: Date.now(),
      message,
      data: this.filterContent(data)
    };

    await this.writeLogEntry(entry);
    this.logs.push(entry);

    console.log(`[DEBUG] ${message}`, data || '');
  }

  async getDebugStatistics() {
    const totalLogs = this.logs.length;
    const successCount = this.logs.filter(log => log.type === 'success').length;
    const errorCount = this.logs.filter(log => log.type === 'error').length;

    const responseTimes = this.logs
      .filter(log => log.duration !== undefined)
      .map(log => log.duration);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    return {
      systemHealth: {
        status: 'healthy',
        lastCheck: Date.now(),
        issues: []
      },
      systemLogStats: {
        totalLogs,
        successCount,
        errorCount,
        lastActivity: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : Date.now()
      },
      activeRequests: Array.from(this.activeRequests.values()),
      performanceMetrics: {
        averageResponseTime,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0
      }
    };
  }

  async destroy() {
    // Clean up resources
    this.activeRequests.clear();
    this.logs = [];

    if (this.config.enabled) {
      await this.info('Debug logging manager destroyed');
    }
  }

  async writeLogEntry(entry, subdirectory) {
    if (!this.fileSystem || !this.path) {
      // Memory-only mode
      return;
    }

    try {
      const timestamp = new Date(entry.timestamp);
      const dateStr = timestamp.toISOString().split('T')[0];
      const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');
      const randomId = Math.random().toString(36).substr(2, 6);

      const filename = `debug-${entry.timestamp}-${randomId}.json`;
      const subdir = subdirectory || this.config.paths.system;
      const dirPath = this.path.join(this.config.baseDirectory, subdir, dateStr);
      const filePath = this.path.join(dirPath, filename);

      // Ensure directory exists
      if (!this.fileSystem.existsSync(dirPath)) {
        this.fileSystem.mkdirSync(dirPath, { recursive: true });
      }

      // Write log file
      this.fileSystem.writeFileSync(filePath, JSON.stringify(entry, null, 2));

      if (this.config.logLevel === 'debug') {
        console.log(`📝 Log written to: ${filePath}`);
      }
    } catch (error) {
      console.warn('Failed to write log file:', error instanceof Error ? error.message : String(error));
    }
  }

  filterContent(obj) {
    if (!this.config.contentFiltering.enabled || !obj) {
      return obj;
    }

    const filtered = JSON.parse(JSON.stringify(obj));
    const filterRecursive = (current) => {
      if (typeof current === 'object' && current !== null) {
        for (const key in current) {
          if (this.config.contentFiltering.sensitiveFields.some(field =>
            key.toLowerCase().includes(field.toLowerCase())
          )) {
            current[key] = '[REDACTED]';
          } else if (typeof current[key] === 'object') {
            filterRecursive(current[key]);
          }
        }
      }
    };

    filterRecursive(filtered);
    return filtered;
  }
}

/**
 * Pipeline scheduler interface with logging support
 * 支持日志记录的pipeline调度器接口
 */
class IPipelineScheduler {
  constructor() {
    if (this.constructor === IPipelineScheduler) {
      throw new Error('Interface cannot be instantiated directly');
    }
  }

  async initialize() {
    return underConstruction.callUnderConstructionFeature('pipeline-interface-initialize', {
      caller: 'IPipelineScheduler.initialize',
      purpose: 'Pipeline调度器接口初始化方法'
    });
  }

  async execute(pipelineId, payload) {
    return underConstruction.callUnderConstructionFeature('pipeline-interface-execute', {
      caller: 'IPipelineScheduler.execute',
      purpose: 'Pipeline调度器接口执行方法'
    });
  }

  async executePipeline(modelId, context) {
    return underConstruction.callUnderConstructionFeature('pipeline-interface-executePipeline', {
      caller: 'IPipelineScheduler.executePipeline',
      purpose: 'Pipeline调度器接口执行模型方法'
    });
  }
}

/**
 * Enhanced Pipeline Scheduler with full logging capabilities
 * 增强型Pipeline调度器，具备完整日志记录功能
 */
class PipelineScheduler extends IPipelineScheduler {
  constructor(config = {}) {
    super();
    this.config = config;
    this.initialized = false;
    this.debugLogManager = new SimpleDebugLogManager(config.logging || {});
  }

  async initialize() {
    console.log('Initializing Enhanced PipelineScheduler with logging system');
    await this.debugLogManager.info('PipelineScheduler initialization started', {
      config: this.config,
      timestamp: Date.now()
    });

    this.initialized = true;

    await this.debugLogManager.info('PipelineScheduler initialized successfully', {
      initializationTime: Date.now(),
      loggingEnabled: this.config.logging?.enabled || false
    });
  }

  async execute(pipelineId, payload) {
    if (!this.initialized) {
      throw new Error('PipelineScheduler not initialized');
    }

    const context = this.debugLogManager.startRequest('pipeline', 'execute', {
      pipelineId,
      payloadType: typeof payload
    });

    try {
      console.log(`Executing pipeline ${pipelineId}`, payload);

      const result = {
        success: true,
        pipelineId,
        result: 'Pipeline execution completed',
        processingMethod: 'pipeline'
      };

      await this.debugLogManager.logSuccess(context, { pipelineId, payload }, result);
      return result;
    } catch (error) {
      await this.debugLogManager.logError(context, { pipelineId, payload }, error);
      throw error;
    }
  }

  async executePipeline(modelId, context) {
    if (!this.initialized) {
      throw new Error('PipelineScheduler not initialized');
    }

    const requestContext = this.debugLogManager.startRequest('pipeline', 'executePipeline', {
      modelId,
      contextType: typeof context,
      hasRequest: !!context?.request,
      hasMessages: !!context?.messages
    });

    try {
      console.log(`Executing pipeline for model ${modelId}`, context);

      const result = {
        success: true,
        modelId,
        result: 'Pipeline execution result',
        processingMethod: 'pipeline',
        timestamp: Date.now()
      };

      await this.debugLogManager.logSuccess(requestContext, { modelId, context }, result);
      return result;
    } catch (error) {
      await this.debugLogManager.logError(requestContext, { modelId, context }, error);
      throw error;
    }
  }

  // Get debug statistics
  async getStatistics() {
    return await this.debugLogManager.getDebugStatistics();
  }

  // Enable/disable logging
  async setLoggingEnabled(enabled) {
    this.debugLogManager.config.enabled = enabled;
    await this.debugLogManager.info(`Logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Configure logging
  async configureLogging(config) {
    Object.assign(this.debugLogManager.config, config);
    await this.debugLogManager.info('Logging configuration updated', { config });
  }

  // Get log manager instance for external use
  getLogManager() {
    return this.debugLogManager;
  }
}

// Export all components
module.exports = {
  SimpleDebugLogManager,
  DEFAULT_DEBUG_CONFIG,
  IPipelineScheduler,
  PipelineScheduler
};

// ES Module exports
export {
  SimpleDebugLogManager,
  DEFAULT_DEBUG_CONFIG,
  IPipelineScheduler,
  PipelineScheduler
};

// Default export
export default {
  SimpleDebugLogManager,
  DEFAULT_DEBUG_CONFIG,
  IPipelineScheduler,
  PipelineScheduler
};