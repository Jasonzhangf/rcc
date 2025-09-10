/**
 * Pipeline scheduler - central scheduling and load balancing system
 */

import { BaseModule } from 'rcc-basemodule';
import { ModuleInfo } from 'rcc-basemodule';
import { Message, MessageResponse } from 'rcc-basemodule';
import { PipelineConfigManager, PipelineSystemConfig } from './PipelineConfig';
import { PipelineInstance, IPipelineInstance } from './PipelineInstance';
import { ErrorHandlerCenter, IErrorHandlerCenter } from './ErrorHandlerCenter';
import { EnhancedErrorResponseCenter, ErrorResponseCenterConfig } from './EnhancedErrorResponseCenter';
import { LoadBalancerStrategy, LoadBalancerFactory } from './LoadBalancers';
import { 
  PipelineError, 
  PipelineErrorImpl,
  PipelineErrorCode, 
  PipelineExecutionContext, 
  PipelineExecutionResult,
  PipelineState,
  PipelineHealth,
  PipelineExecutionStatus,
  ErrorHandlingAction,
  PipelineHealthMetrics,
  PipelineErrorCategory
} from './ErrorTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Scheduler statistics
 */
export interface SchedulerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  activeInstances: number;
  totalInstances: number;
  blacklistedInstances: number;
  uptime: number;
  lastHealthCheck: number;
  requestsByPipeline: Map<string, number>;
  errorsByPipeline: Map<string, number>;
  loadBalancerStats: Record<string, any>;
}

/**
 * Pipeline scheduler interface
 */
export interface IPipelineScheduler {
  initialize(): Promise<void>;
  execute(payload: Record<string, any>, options?: ExecutionOptions): Promise<PipelineExecutionResult>;
  createPipeline(config: Record<string, any>): Promise<string>;
  destroyPipeline(pipelineId: string): Promise<void>;
  enablePipeline(pipelineId: string): Promise<void>;
  disablePipeline(pipelineId: string): Promise<void>;
  setPipelineMaintenance(pipelineId: string, enabled: boolean): Promise<void>;
  getPipelineStatus(pipelineId: string): Promise<PipelineStatus>;
  getAllPipelineStatuses(): Promise<PipelineStatus[]>;
  getSchedulerStats(): SchedulerStats;
  healthCheck(): Promise<boolean>;
  shutdown(): Promise<void>;
}

/**
 * Execution options
 */
export interface ExecutionOptions {
  timeout?: number;
  maxRetries?: number;
  preferredPipelineId?: string;
  retryDelay?: number;
  metadata?: Record<string, any>;
}

/**
 * Pipeline status
 */
export interface PipelineStatus {
  pipelineId: string;
  name: string;
  type: string;
  state: PipelineState;
  health: PipelineHealth;
  enabled: boolean;
  inMaintenance: boolean;
  instanceCount: number;
  healthyInstanceCount: number;
  lastError?: PipelineError;
  uptime: number;
  requestCount: number;
  successRate: number;
  averageResponseTime: number;
}

/**
 * Pipeline scheduler implementation
 */
export class PipelineScheduler extends BaseModule implements IPipelineScheduler {
  private configManager: PipelineConfigManager;
  private errorHandler: ErrorHandlerCenter;
  private enhancedErrorHandler: EnhancedErrorResponseCenter;
  private loadBalancer: LoadBalancerStrategy;
  private pipelineInstances: Map<string, IPipelineInstance> = new Map();
  private schedulerStats: SchedulerStats;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;
  private startTime: number = Date.now();

  constructor(config: PipelineSystemConfig) {
    const moduleInfo: ModuleInfo = {
      id: 'pipeline-scheduler',
      name: 'PipelineScheduler',
      version: '2.0.0',
      description: 'Central pipeline scheduling and load balancing system with enhanced error handling',
      type: 'pipeline-scheduler'
    };

    super(moduleInfo);
    
    this.configManager = new PipelineConfigManager(config);
    this.errorHandler = new ErrorHandlerCenter(this.configManager);
    
    // Create enhanced error response center configuration
    const enhancedErrorHandlerConfig: ErrorResponseCenterConfig = {
      enableLocalErrorHandling: true,
      enableServerErrorHandling: true,
      enableRecoveryActions: true,
      enableErrorLogging: true,
      enableErrorMetrics: true,
      maxErrorHistorySize: 1000,
      errorCleanupInterval: 300000, // 5 minutes
      recoveryActionTimeout: 30000, // 30 seconds
      customErrorHandlers: []
    };
    
    this.enhancedErrorHandler = new EnhancedErrorResponseCenter(
      this.configManager, 
      this.errorHandler, 
      enhancedErrorHandlerConfig
    );
    
    this.loadBalancer = LoadBalancerFactory.create(config.loadBalancer.strategy);
    this.schedulerStats = this.createInitialStats();
    
    this.log('Pipeline scheduler created', { 
      strategy: config.loadBalancer.strategy,
      pipelineCount: config.pipelines.length
    }, 'constructor');
  }

  /**
   * Initialize the scheduler
   */
  public override async initialize(): Promise<void> {
    await super.initialize();
    
    // Initialize error handler
    await this.errorHandler.initialize();
    
    // Initialize enhanced error handler
    await this.enhancedErrorHandler.initialize();
    
    // Create pipeline instances from configuration
    await this.createPipelineInstances();
    
    // Start health checks
    this.startHealthChecks();
    
    // Start metrics collection
    this.startMetricsCollection();
    
    // Register message handlers
    this.registerMessageHandlers();
    
    this.logInfo('Pipeline scheduler initialized', {
      instanceCount: this.pipelineInstances.size,
      strategy: this.loadBalancer.getStrategyName(),
      enhancedErrorHandling: true
    }, 'initialize');
  }

  /**
   * Execute a request through the pipeline system
   */
  public async execute(payload: Record<string, any>, options: ExecutionOptions = {}): Promise<PipelineExecutionResult> {
    const executionId = uuidv4();
    const startTime = Date.now();
    
    this.logInfo('Starting pipeline execution', {
      executionId,
      payload,
      options
    }, 'execute');

    // Update statistics
    this.schedulerStats.totalRequests++;

    try {
      // Select pipeline instance
      const instances = Array.from(this.pipelineInstances.values()).filter(instance => 
        instance.getConfig().enabled && !this.errorHandler.isPipelineBlacklisted(instance.getPipelineId())
      );

      if (instances.length === 0) {
        const error: PipelineError = {
          code: PipelineErrorCode.NO_AVAILABLE_PIPELINES,
          message: 'No available pipeline instances',
          category: PipelineErrorCategory.SCHEDULING,
          severity: 'high',
          recoverability: 'non_recoverable',
          impact: 'system_wide',
          source: 'module',
          timestamp: Date.now()
        };
        throw error;
      }

      // Try preferred pipeline first if specified
      let selectedInstance: IPipelineInstance | null = null;
      if (options.preferredPipelineId) {
        selectedInstance = instances.find(instance => instance.getPipelineId() === options.preferredPipelineId) || null;
      }

      // Use load balancer if no preferred instance or it's not available
      if (!selectedInstance) {
        selectedInstance = this.loadBalancer.selectInstance(instances);
      }

      if (!selectedInstance) {
        const error: PipelineError = {
          code: PipelineErrorCode.PIPELINE_SELECTION_FAILED,
          message: 'Failed to select pipeline instance',
          category: PipelineErrorCategory.SCHEDULING,
          severity: 'high',
          recoverability: 'non_recoverable',
          impact: 'system_wide',
          source: 'module',
          timestamp: Date.now()
        };
        throw error;
      }

      // Create execution context
      const context: PipelineExecutionContext = {
        executionId,
        pipelineId: selectedInstance.getPipelineId(),
        instanceId: selectedInstance.getId(),
        startTime,
        timeout: options.timeout || this.configManager.getConfig().scheduler.defaultTimeout,
        payload,
        metadata: options.metadata || {},
        retryCount: 0,
        maxRetries: options.maxRetries || this.configManager.getConfig().scheduler.maxRetries
      };

      // Execute with retry logic
      const result = await this.executeWithRetry(selectedInstance, context);

      // Update statistics
      this.schedulerStats.successfulRequests++;
      this.updatePipelineStats(selectedInstance.getPipelineId(), true, Date.now() - startTime);

      // Record success in load balancer
      this.loadBalancer.recordRequestSuccess?.(selectedInstance.getId(), Date.now() - startTime);

      // Handle the result with error handler
      await this.errorHandler.handleExecutionResult(result, context);

      this.logInfo('Pipeline execution completed successfully', {
        executionId,
        pipelineId: selectedInstance.getPipelineId(),
        instanceId: selectedInstance.getId(),
        duration: result.duration,
        retryCount: result.retryCount
      }, 'execute');

      return result;

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Convert to PipelineError if needed
      let pipelineError: PipelineError;
      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        pipelineError = error as PipelineError;
      } else {
        pipelineError = new PipelineErrorImpl(
          PipelineErrorCode.EXECUTION_FAILED,
          error instanceof Error ? error.message : String(error),
          PipelineErrorCategory.EXECUTION,
          'high',
          'recoverable',
          'single_module',
          'module',
          undefined,
          undefined,
          Date.now()
        );
      }

      // Update statistics
      this.schedulerStats.failedRequests++;
      this.updatePipelineStats(pipelineError.pipelineId || 'unknown', false, duration);

      // Create minimal context for error handling
      const context: PipelineExecutionContext = {
        executionId,
        pipelineId: pipelineError.pipelineId || 'unknown',
        instanceId: pipelineError.instanceId || 'unknown',
        startTime,
        timeout: options.timeout || this.configManager.getConfig().scheduler.defaultTimeout,
        payload,
        metadata: options.metadata || {},
        retryCount: 0,
        maxRetries: options.maxRetries || this.configManager.getConfig().scheduler.maxRetries
      };

      // Handle the error with enhanced error handler based on error type
      let errorResponse;
      if (this.isLocalError(pipelineError)) {
        if (this.isSendPhaseError(pipelineError)) {
          errorResponse = await this.enhancedErrorHandler.handleLocalError(pipelineError, context);
        } else {
          errorResponse = await this.enhancedErrorHandler.handleReceiveError(pipelineError, context);
        }
      } else {
        errorResponse = await this.enhancedErrorHandler.handleServerError(pipelineError, context);
      }

      // Create error result
      const errorResult: PipelineExecutionResult = {
        executionId,
        pipelineId: pipelineError.pipelineId || 'unknown',
        instanceId: pipelineError.instanceId || 'unknown',
        status: PipelineExecutionStatus.FAILED,
        startTime,
        endTime,
        duration,
        error: pipelineError,
        metadata: options.metadata,
        retryCount: 0
      };

      this.error('Pipeline execution failed', {
        executionId,
        error: pipelineError,
        errorResponse,
        duration
      }, 'execute');

      throw errorResult;
    }
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry(instance: IPipelineInstance, context: PipelineExecutionContext): Promise<PipelineExecutionResult> {
    let lastResult: PipelineExecutionResult | null = null;
    let lastError: PipelineError | null = null;

    while (context.retryCount <= context.maxRetries) {
      try {
        // Update context with current retry count
        const currentContext = { ...context, retryCount: context.retryCount };
        
        this.logInfo('Executing pipeline attempt', {
          executionId: context.executionId,
          pipelineId: context.pipelineId,
          instanceId: context.instanceId,
          attempt: context.retryCount + 1,
          maxAttempts: context.maxRetries + 1
        }, 'executeWithRetry');

        // Execute the pipeline
        const result = await instance.execute(currentContext);
        
        if (result.status === PipelineExecutionStatus.COMPLETED) {
          return result;
        }

        // If failed, continue to retry logic
        lastResult = result;
        lastError = result.error || null;

      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
          lastError = error as PipelineError;
        } else {
          lastError = new PipelineErrorImpl(
            PipelineErrorCode.EXECUTION_FAILED,
            error instanceof Error ? error.message : String(error),
            PipelineErrorCategory.EXECUTION,
            'high',
            'recoverable',
            'single_module',
            'module',
            undefined,
            undefined,
            Date.now()
          );
        }
      }

      // Handle error and decide on retry
      if (lastError) {
        const errorAction = await this.errorHandler.handleError(lastError, context);
        
        if (errorAction.shouldRetry && context.retryCount < context.maxRetries) {
          // Wait before retry
          if (errorAction.retryDelay) {
            await new Promise(resolve => setTimeout(resolve, errorAction.retryDelay));
          }
          
          // Update context for retry
          context.retryCount++;
          
          // Try failover if specified
          if (errorAction.action === 'failover' && errorAction.nextPipelineId) {
            const newInstance = this.pipelineInstances.get(errorAction.nextPipelineId);
            if (newInstance && newInstance.isReady()) {
              instance = newInstance;
              context.pipelineId = newInstance.getPipelineId();
              context.instanceId = newInstance.getId();
            }
          }
          
          continue;
        } else {
          // No more retries
          break;
        }
      }
      
      context.retryCount++;
    }

    // All retries failed
    const errorResult: PipelineExecutionResult = {
      executionId: context.executionId,
      pipelineId: context.pipelineId,
      instanceId: context.instanceId,
      status: PipelineExecutionStatus.FAILED,
      startTime: context.startTime,
      endTime: Date.now(),
      duration: Date.now() - context.startTime,
      error: lastError || new PipelineErrorImpl(
        PipelineErrorCode.EXECUTION_FAILED,
        'Pipeline execution failed after all retries',
        PipelineErrorCategory.EXECUTION,
        'high',
        'non_recoverable',
        'single_module',
        'module',
        undefined,
        undefined,
        Date.now()
      ),
      metadata: context.metadata,
      retryCount: context.retryCount
    };

    return errorResult;
  }

  /**
   * Create a new pipeline
   */
  public async createPipeline(config: Record<string, any>): Promise<string> {
    const pipelineId = uuidv4();
    
    try {
      this.logInfo('Creating new pipeline', { pipelineId, config }, 'createPipeline');

      // Add to configuration
      const systemConfig = this.configManager.getConfig();
      const newPipelineConfig = {
        id: pipelineId,
        name: config.name || `Pipeline-${pipelineId}`,
        type: config.type || 'default',
        enabled: config.enabled !== false,
        priority: config.priority || 0,
        weight: config.weight || 1,
        maxConcurrentRequests: config.maxConcurrentRequests,
        timeout: config.timeout,
        ...config
      };

      systemConfig.pipelines.push(newPipelineConfig);
      
      // Update configuration
      const validation = this.configManager.updateConfig(systemConfig);
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Create pipeline instance
      const instance = new PipelineInstance(pipelineId, newPipelineConfig);
      await instance.initialize();
      
      this.pipelineInstances.set(pipelineId, instance);

      this.logInfo('Pipeline created successfully', { pipelineId }, 'createPipeline');
      return pipelineId;

    } catch (error) {
      this.error('Failed to create pipeline', { 
        pipelineId, 
        error: error instanceof Error ? error.message : String(error) 
      }, 'createPipeline');
      throw error;
    }
  }

  /**
   * Destroy a pipeline
   */
  public async destroyPipeline(pipelineId: string): Promise<void> {
    try {
      this.logInfo('Destroying pipeline', { pipelineId }, 'destroyPipeline');

      const instance = this.pipelineInstances.get(pipelineId);
      if (!instance) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      await instance.destroy();
      this.pipelineInstances.delete(pipelineId);

      // Remove from configuration
      const systemConfig = this.configManager.getConfig();
      systemConfig.pipelines = systemConfig.pipelines.filter(p => p.id !== pipelineId);
      
      const validation = this.configManager.updateConfig(systemConfig);
      if (!validation.isValid) {
        this.warn('Configuration validation failed during pipeline destruction', {
          errors: validation.errors
        }, 'destroyPipeline');
      }

      this.logInfo('Pipeline destroyed successfully', { pipelineId }, 'destroyPipeline');

    } catch (error) {
      this.error('Failed to destroy pipeline', { 
        pipelineId, 
        error: error instanceof Error ? error.message : String(error) 
      }, 'destroyPipeline');
      throw error;
    }
  }

  /**
   * Enable a pipeline
   */
  public async enablePipeline(pipelineId: string): Promise<void> {
    const instance = this.pipelineInstances.get(pipelineId);
    if (!instance) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    instance.enable();
    
    // Update configuration
    await this.updatePipelineConfig(pipelineId, { enabled: true });
    
    this.logInfo('Pipeline enabled', { pipelineId }, 'enablePipeline');
  }

  /**
   * Disable a pipeline
   */
  public async disablePipeline(pipelineId: string): Promise<void> {
    const instance = this.pipelineInstances.get(pipelineId);
    if (!instance) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    instance.disable();
    
    // Update configuration
    await this.updatePipelineConfig(pipelineId, { enabled: false });
    
    this.logInfo('Pipeline disabled', { pipelineId }, 'disablePipeline');
  }

  /**
   * Set pipeline maintenance mode
   */
  public async setPipelineMaintenance(pipelineId: string, enabled: boolean): Promise<void> {
    const instance = this.pipelineInstances.get(pipelineId);
    if (!instance) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    instance.setMaintenance(enabled);
    
    this.logInfo('Pipeline maintenance mode ' + (enabled ? 'enabled' : 'disabled'), { 
      pipelineId 
    }, 'setPipelineMaintenance');
  }

  /**
   * Get pipeline status
   */
  public async getPipelineStatus(pipelineId: string): Promise<PipelineStatus> {
    const instance = this.pipelineInstances.get(pipelineId);
    if (!instance) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const metrics = instance.getHealthMetrics();
    const config = instance.getConfig();

    return {
      pipelineId: instance.getPipelineId(),
      name: config.name,
      type: config.type,
      state: instance.getState(),
      health: instance.getHealth(),
      enabled: config.enabled,
      inMaintenance: false, // TODO: Add maintenance tracking
      instanceCount: 1,
      healthyInstanceCount: instance.isHealthy() ? 1 : 0,
      lastError: metrics.lastError,
      uptime: metrics.uptime,
      requestCount: metrics.requestCount,
      successRate: metrics.successRate,
      averageResponseTime: metrics.averageResponseTime
    };
  }

  /**
   * Get all pipeline statuses
   */
  public async getAllPipelineStatuses(): Promise<PipelineStatus[]> {
    const statuses: PipelineStatus[] = [];
    
    for (const instance of this.pipelineInstances.values()) {
      const status = await this.getPipelineStatus(instance.getPipelineId());
      statuses.push(status);
    }
    
    return statuses;
  }

  /**
   * Get scheduler statistics
   */
  public getSchedulerStats(): SchedulerStats {
    return { ...this.schedulerStats };
  }

  /**
   * Perform health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const now = Date.now();
      this.schedulerStats.lastHealthCheck = now;

      // Check all pipeline instances
      let allHealthy = true;
      for (const instance of this.pipelineInstances.values()) {
        const isHealthy = await instance.performHealthCheck();
        if (!isHealthy) {
          allHealthy = false;
        }
        
        // Update load balancer with health metrics
        this.loadBalancer.updateInstanceMetrics(instance.getId(), instance.getHealthMetrics());
      }

      // Update scheduler stats
      this.schedulerStats.activeInstances = Array.from(this.pipelineInstances.values())
        .filter(instance => instance.isHealthy()).length;
      this.schedulerStats.totalInstances = this.pipelineInstances.size;
      this.schedulerStats.blacklistedInstances = this.errorHandler.getBlacklistedPipelines().length;

      this.logInfo('Health check completed', {
        allHealthy,
        activeInstances: this.schedulerStats.activeInstances,
        totalInstances: this.schedulerStats.totalInstances,
        blacklistedInstances: this.schedulerStats.blacklistedInstances
      }, 'healthCheck');

      return allHealthy;

    } catch (error) {
      this.error('Health check failed', { 
        error: error instanceof Error ? error.message : String(error) 
      }, 'healthCheck');
      return false;
    }
  }

  /**
   * Shutdown the scheduler
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logInfo('Starting scheduler shutdown', {}, 'shutdown');

    try {
      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Stop metrics collection
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
        this.metricsInterval = null;
      }

      // Destroy all pipeline instances
      const destroyPromises = Array.from(this.pipelineInstances.values()).map(instance => 
        instance.destroy().catch(error => {
          this.error('Failed to destroy pipeline instance', {
            pipelineId: instance.getPipelineId(),
            error: error instanceof Error ? error.message : String(error)
          }, 'shutdown');
        })
      );

      await Promise.all(destroyPromises);
      this.pipelineInstances.clear();

      // Shutdown error handler
      await this.errorHandler.destroy();
      
      // Shutdown enhanced error handler
      await this.enhancedErrorHandler.destroy();

      await super.destroy();
      
      this.logInfo('Scheduler shutdown completed', {}, 'shutdown');

    } catch (error) {
      this.error('Scheduler shutdown failed', { 
        error: error instanceof Error ? error.message : String(error) 
      }, 'shutdown');
      throw error;
    }
  }

  /**
   * Create pipeline instances from configuration
   */
  private async createPipelineInstances(): Promise<void> {
    const config = this.configManager.getConfig();
    
    for (const pipelineConfig of config.pipelines) {
      try {
        const instance = new PipelineInstance(pipelineConfig.id, pipelineConfig);
        await instance.initialize();
        this.pipelineInstances.set(pipelineConfig.id, instance);
        
        this.logInfo('Pipeline instance created', {
          pipelineId: pipelineConfig.id,
          name: pipelineConfig.name
        }, 'createPipelineInstances');
        
      } catch (error) {
        this.error('Failed to create pipeline instance', {
          pipelineId: pipelineConfig.id,
          error: error instanceof Error ? error.message : String(error)
        }, 'createPipelineInstances');
      }
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    const config = this.configManager.getConfig();
    const healthCheckInterval = config.loadBalancer.healthCheckInterval;
    
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.healthCheck();
      }
    }, healthCheckInterval);

    this.logInfo('Health checks started', { interval: healthCheckInterval }, 'startHealthChecks');
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        this.collectMetrics();
      }
    }, 60000); // Collect metrics every minute

    this.logInfo('Metrics collection started', {}, 'startMetricsCollection');
  }

  /**
   * Collect metrics
   */
  private collectMetrics(): void {
    // Update load balancer stats
    this.schedulerStats.loadBalancerStats = this.loadBalancer.getStats();
    
    // Update uptime
    this.schedulerStats.uptime = Date.now() - (this.startTime || Date.now());
    
    this.log('Metrics collected', {
      stats: this.schedulerStats
    }, 'collectMetrics');
  }

  /**
   * Update pipeline statistics
   */
  private updatePipelineStats(pipelineId: string, success: boolean, responseTime: number): void {
    // Update requests by pipeline
    const requestCount = this.schedulerStats.requestsByPipeline.get(pipelineId) || 0;
    this.schedulerStats.requestsByPipeline.set(pipelineId, requestCount + 1);
    
    // Update errors by pipeline
    if (!success) {
      const errorCount = this.schedulerStats.errorsByPipeline.get(pipelineId) || 0;
      this.schedulerStats.errorsByPipeline.set(pipelineId, errorCount + 1);
    }
    
    // Update average response time
    const alpha = 0.1; // smoothing factor
    this.schedulerStats.averageResponseTime = (alpha * responseTime) + ((1 - alpha) * this.schedulerStats.averageResponseTime);
  }

  /**
   * Update pipeline configuration
   */
  private async updatePipelineConfig(pipelineId: string, updates: Partial<any>): Promise<void> {
    const systemConfig = this.configManager.getConfig();
    const pipelineIndex = systemConfig.pipelines.findIndex(p => p.id === pipelineId);
    
    if (pipelineIndex === -1) {
      throw new Error(`Pipeline ${pipelineId} not found in configuration`);
    }

    systemConfig.pipelines[pipelineIndex] = { 
      ...systemConfig.pipelines[pipelineIndex], 
      ...updates 
    };

    const validation = this.configManager.updateConfig(systemConfig);
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Register message handlers
   */
  private registerMessageHandlers(): void {
    // Message handling would be implemented through BaseModule's handleMessage method
    // For now, we'll skip the explicit registration as it's not available in BaseModule
    
    // Example of how this would work:
    // this.on('get_scheduler_stats', async (message: Message) => {
    //   return {
    //     messageId: message.id,
    //     correlationId: message.correlationId || '',
    //     success: true,
    //     data: this.getSchedulerStats(),
    //     timestamp: Date.now()
    //   };
    // });
  }

  /**
   * Handle incoming messages
   */
  public override async handleMessage(message: Message): Promise<MessageResponse | void> {
    this.log('Handling message', { type: message.type, source: message.source }, 'handleMessage');

    switch (message.type) {
      case 'ping':
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { 
            pong: true, 
            moduleId: this.info.id,
            timestamp: Date.now(),
            stats: this.getSchedulerStats()
          },
          timestamp: Date.now()
        };

      case 'health_check':
        const isHealthy = await this.healthCheck();
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { healthy: isHealthy },
          timestamp: Date.now()
        };

      case 'shutdown':
        await this.shutdown();
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: true,
          data: { message: 'Scheduler shutdown completed' },
          timestamp: Date.now()
        };

      default:
        this.warn('Unhandled message type', { type: message.type }, 'handleMessage');
        return {
          messageId: message.id,
          correlationId: message.correlationId || '',
          success: false,
          error: `Unhandled message type: ${message.type}`,
          timestamp: Date.now()
        };
    }
  }

  /**
   * Check if error is a local error
   */
  private isLocalError(error: PipelineError): boolean {
    const localErrorCodes = [
      PipelineErrorCode.EXECUTION_FAILED,
      PipelineErrorCode.EXECUTION_TIMEOUT,
      PipelineErrorCode.CONNECTION_FAILED,
      PipelineErrorCode.REQUEST_TIMEOUT,
      PipelineErrorCode.RESPONSE_TIMEOUT,
      PipelineErrorCode.INTERNAL_ERROR,
      PipelineErrorCode.SYSTEM_OVERLOAD
    ];
    return localErrorCodes.includes(error.code);
  }

  /**
   * Check if error is a send phase error (500)
   */
  private isSendPhaseError(error: PipelineError): boolean {
    const sendPhaseErrorCodes = [
      PipelineErrorCode.EXECUTION_FAILED,
      PipelineErrorCode.CONNECTION_FAILED,
      PipelineErrorCode.REQUEST_TIMEOUT,
      PipelineErrorCode.INTERNAL_ERROR
    ];
    return sendPhaseErrorCodes.includes(error.code);
  }

  /**
   * Create initial statistics
   */
  private createInitialStats(): SchedulerStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      activeInstances: 0,
      totalInstances: 0,
      blacklistedInstances: 0,
      uptime: 0,
      lastHealthCheck: 0,
      requestsByPipeline: new Map(),
      errorsByPipeline: new Map(),
      loadBalancerStats: {}
    };
  }
}