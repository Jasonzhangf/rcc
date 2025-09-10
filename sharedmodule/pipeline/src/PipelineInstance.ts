/**
 * Pipeline instance implementation
 */

import { BaseModule } from 'rcc-basemodule';
import { ModuleInfo } from 'rcc-basemodule';
import { PipelineConfig } from './PipelineConfig';
import { 
  PipelineState, 
  PipelineHealth, 
  PipelineHealthMetrics, 
  PipelineExecutionContext, 
  PipelineExecutionResult, 
  PipelineError, 
  PipelineErrorImpl,
  PipelineErrorCode,
  PipelineExecutionStatus,
  PipelineErrorCategory,
  ERROR_CODE_TO_HTTP_STATUS
} from './ErrorTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Pipeline instance interface
 */
export interface IPipelineInstance {
  getId(): string;
  getPipelineId(): string;
  getConfig(): PipelineConfig;
  getState(): PipelineState;
  getHealth(): PipelineHealth;
  getHealthMetrics(): PipelineHealthMetrics;
  isHealthy(): boolean;
  isReady(): boolean;
  initialize(): Promise<void>;
  execute(context: PipelineExecutionContext): Promise<PipelineExecutionResult>;
  destroy(): Promise<void>;
  updateHealthMetrics(metrics: Partial<PipelineHealthMetrics>): void;
  recordError(error: PipelineError): void;
  recordSuccess(responseTime: number): void;
  setState(state: PipelineState): void;
  enable(): void;
  disable(): void;
  setMaintenance(enabled: boolean): void;
  performHealthCheck(): Promise<boolean>;
}

/**
 * Pipeline instance implementation
 */
export class PipelineInstance extends BaseModule implements IPipelineInstance {
  private pipelineId: string;
  private pipelineConfig: PipelineConfig;
  private state: PipelineState = PipelineState.CREATING;
  private healthMetrics: PipelineHealthMetrics;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number;
  private isMaintenanceMode: boolean = false;
  private isEnabled: boolean = true;

  constructor(pipelineId: string, config: PipelineConfig, healthCheckInterval: number = 30000) {
    const moduleInfo: ModuleInfo = {
      id: `pipeline-${pipelineId}-${uuidv4()}`,
      name: `PipelineInstance-${config.name}`,
      version: '1.0.0',
      description: `Pipeline instance for ${config.name}`,
      type: 'pipeline-instance'
    };

    super(moduleInfo);
    
    this.pipelineId = pipelineId;
    this.pipelineConfig = { ...config };
    this.healthCheckInterval = healthCheckInterval;
    this.healthMetrics = this.createInitialHealthMetrics();
    
    this.log('Pipeline instance created', { 
      pipelineId, 
      instanceId: this.info.id, 
      config: this.pipelineConfig 
    }, 'constructor');
  }

  /**
   * Get pipeline instance ID
   */
  public getId(): string {
    return this.info.id;
  }

  /**
   * Get pipeline ID
   */
  public getPipelineId(): string {
    return this.pipelineId;
  }

  /**
   * Get pipeline configuration
   */
  public override getConfig(): PipelineConfig {
    return { ...this.pipelineConfig };
  }

  /**
   * Get current state
   */
  public getState(): PipelineState {
    return this.state;
  }

  /**
   * Get current health status
   */
  public getHealth(): PipelineHealth {
    return this.healthMetrics.health;
  }

  /**
   * Get health metrics
   */
  public getHealthMetrics(): PipelineHealthMetrics {
    return { ...this.healthMetrics };
  }

  /**
   * Check if instance is healthy
   */
  public isHealthy(): boolean {
    return this.healthMetrics.health === PipelineHealth.HEALTHY && 
           this.isEnabled && 
           !this.isMaintenanceMode &&
           this.state === PipelineState.READY;
  }

  /**
   * Check if instance is ready for requests
   */
  public isReady(): boolean {
    return this.state === PipelineState.READY && this.isHealthy();
  }

  /**
   * Initialize the pipeline instance
   */
  public override async initialize(): Promise<void> {
    try {
      this.setState(PipelineState.INITIALIZING);
      this.logInfo('Initializing pipeline instance', { 
        pipelineId: this.pipelineId, 
        instanceId: this.getId() 
      }, 'initialize');

      // Initialize the actual pipeline implementation
      await this.initializePipeline();

      this.setState(PipelineState.READY);
      this.updateHealthMetrics({ 
        health: PipelineHealth.HEALTHY,
        lastSuccessTime: Date.now()
      });

      this.logInfo('Pipeline instance initialized successfully', {
        pipelineId: this.pipelineId,
        instanceId: this.getId()
      }, 'initialize');

    } catch (error) {
      this.setState(PipelineState.ERROR);
      
      const pipelineError: PipelineError = new PipelineErrorImpl(
        PipelineErrorCode.PIPELINE_INITIALIZATION_FAILED,
        `Failed to initialize pipeline instance: ${error instanceof Error ? error.message : String(error)}`,
        PipelineErrorCategory.LIFECYCLE,
        'high',
        'non_recoverable',
        'single_module',
        'module',
        this.pipelineId,
        this.getId(),
        Date.now(),
        undefined,
        error instanceof Error ? error : new Error(String(error)),
        error instanceof Error ? error.stack : undefined
      );

      this.recordError(pipelineError);
      this.error('Pipeline initialization failed', { 
        error: pipelineError, 
        pipelineId: this.pipelineId, 
        instanceId: this.getId() 
      }, 'initialize');
      
      throw pipelineError;
    }
  }

  /**
   * Execute a request on this pipeline instance
   */
  public async execute(context: PipelineExecutionContext): Promise<PipelineExecutionResult> {
    if (!this.isReady()) {
      const error: PipelineError = new PipelineErrorImpl(
        PipelineErrorCode.PIPELINE_IN_INVALID_STATE,
        `Pipeline instance is not ready. State: ${this.state}, Health: ${this.healthMetrics.health}`,
        PipelineErrorCategory.EXECUTION,
        'high',
        'non_recoverable',
        'single_module',
        'module',
        this.pipelineId,
        this.getId(),
        Date.now()
      );

      this.recordError(error);
      throw error;
    }

    const startTime = Date.now();
    this.setState(PipelineState.RUNNING);

    try {
      this.logInfo('Executing pipeline request', {
        executionId: context.executionId,
        pipelineId: this.pipelineId,
        instanceId: this.getId(),
        payload: context.payload
      }, 'execute');

      // Execute the actual pipeline implementation
      const result = await this.executePipeline(context);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Record successful execution
      this.recordSuccess(duration);

      this.setState(PipelineState.READY);

      const executionResult: PipelineExecutionResult = {
        executionId: context.executionId,
        pipelineId: this.pipelineId,
        instanceId: this.getId(),
        status: PipelineExecutionStatus.COMPLETED,
        startTime,
        endTime,
        duration,
        result,
        metadata: context.metadata,
        retryCount: context.retryCount
      };

      this.logInfo('Pipeline execution completed successfully', {
        executionId: context.executionId,
        pipelineId: this.pipelineId,
        instanceId: this.getId(),
        duration
      }, 'execute');

      return executionResult;

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Convert error to PipelineError
      const pipelineError: PipelineError = this.convertToPipelineError(error);

      this.recordError(pipelineError);
      this.setState(PipelineState.ERROR);

      const executionResult: PipelineExecutionResult = {
        executionId: context.executionId,
        pipelineId: this.pipelineId,
        instanceId: this.getId(),
        status: PipelineExecutionStatus.FAILED,
        startTime,
        endTime,
        duration,
        error: pipelineError,
        metadata: context.metadata,
        retryCount: context.retryCount
      };

      this.error('Pipeline execution failed', {
        executionId: context.executionId,
        pipelineId: this.pipelineId,
        instanceId: this.getId(),
        error: pipelineError,
        duration
      }, 'execute');

      // Throw the error for the scheduler to handle
      throw pipelineError;
    }
  }

  /**
   * Destroy the pipeline instance
   */
  public override async destroy(): Promise<void> {
    try {
      this.setState(PipelineState.DESTROYING);
      
      this.logInfo('Destroying pipeline instance', {
        pipelineId: this.pipelineId,
        instanceId: this.getId()
      }, 'destroy');

      // Cleanup the actual pipeline implementation
      await this.destroyPipeline();

      this.setState(PipelineState.DESTROYED);
      this.isEnabled = false;

      this.logInfo('Pipeline instance destroyed successfully', {
        pipelineId: this.pipelineId,
        instanceId: this.getId()
      }, 'destroy');

    } catch (error) {
      this.setState(PipelineState.ERROR);
      
      const pipelineError: PipelineError = new PipelineErrorImpl(
        PipelineErrorCode.PIPELINE_DESTRUCTION_FAILED,
        `Failed to destroy pipeline instance: ${error instanceof Error ? error.message : String(error)}`,
        PipelineErrorCategory.LIFECYCLE,
        'high',
        'non_recoverable',
        'single_module',
        'module',
        this.pipelineId,
        this.getId(),
        Date.now(),
        undefined,
        error instanceof Error ? error : new Error(String(error)),
        error instanceof Error ? error.stack : undefined
      );

      this.recordError(pipelineError);
      this.error('Pipeline destruction failed', {
        error: pipelineError,
        pipelineId: this.pipelineId,
        instanceId: this.getId()
      }, 'destroy');
      
      throw pipelineError;
    }
  }

  /**
   * Update health metrics
   */
  public updateHealthMetrics(metrics: Partial<PipelineHealthMetrics>): void {
    this.healthMetrics = { ...this.healthMetrics, ...metrics };
    
    // Update health status based on metrics
    this.updateHealthStatus();
    
    this.log('Health metrics updated', {
      pipelineId: this.pipelineId,
      instanceId: this.getId(),
      metrics: this.healthMetrics
    }, 'updateHealthMetrics');
  }

  /**
   * Record an error
   */
  public recordError(error: PipelineError): void {
    this.healthMetrics.lastError = error;
    this.healthMetrics.lastErrorTime = Date.now();
    this.healthMetrics.errorCount++;
    this.healthMetrics.consecutiveErrors++;
    
    // Update success rate
    if (this.healthMetrics.requestCount > 0) {
      this.healthMetrics.successRate = (this.healthMetrics.requestCount - this.healthMetrics.errorCount) / this.healthMetrics.requestCount;
    }

    this.updateHealthStatus();

    this.error('Error recorded', {
      pipelineId: this.pipelineId,
      instanceId: this.getId(),
      error: error,
      healthMetrics: this.healthMetrics
    }, 'recordError');
  }

  /**
   * Record a successful execution
   */
  public recordSuccess(responseTime: number): void {
    this.healthMetrics.lastSuccessTime = Date.now();
    this.healthMetrics.consecutiveErrors = 0;
    this.healthMetrics.requestCount++;
    
    // Update average response time
    const alpha = 0.1; // smoothing factor
    this.healthMetrics.averageResponseTime = (alpha * responseTime) + ((1 - alpha) * this.healthMetrics.averageResponseTime);
    
    // Update success rate
    this.healthMetrics.successRate = (this.healthMetrics.requestCount - this.healthMetrics.errorCount) / this.healthMetrics.requestCount;

    this.updateHealthStatus();

    this.log('Success recorded', {
      pipelineId: this.pipelineId,
      instanceId: this.getId(),
      responseTime,
      healthMetrics: this.healthMetrics
    }, 'recordSuccess');
  }

  /**
   * Set pipeline state
   */
  public setState(state: PipelineState): void {
    const previousState = this.state;
    this.state = state;
    
    this.log('Pipeline state changed', {
      pipelineId: this.pipelineId,
      instanceId: this.getId(),
      previousState,
      newState: state
    }, 'setState');
  }

  /**
   * Enable the pipeline instance
   */
  public enable(): void {
    this.isEnabled = true;
    this.log('Pipeline instance enabled', {
      pipelineId: this.pipelineId,
      instanceId: this.getId()
    }, 'enable');
  }

  /**
   * Disable the pipeline instance
   */
  public disable(): void {
    this.isEnabled = false;
    this.log('Pipeline instance disabled', {
      pipelineId: this.pipelineId,
      instanceId: this.getId()
    }, 'disable');
  }

  /**
   * Set maintenance mode
   */
  public setMaintenance(enabled: boolean): void {
    this.isMaintenanceMode = enabled;
    this.setState(enabled ? PipelineState.MAINTENANCE : PipelineState.READY);
    
    this.log('Pipeline maintenance mode ' + (enabled ? 'enabled' : 'disabled'), {
      pipelineId: this.pipelineId,
      instanceId: this.getId()
    }, 'setMaintenance');
  }

  /**
   * Initialize the actual pipeline implementation
   * Override this method in subclasses
   */
  protected async initializePipeline(): Promise<void> {
    // Base implementation - override in subclasses
    this.logInfo('Initializing pipeline implementation', {}, 'initializePipeline');
    
    // Simulate initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Execute the actual pipeline implementation
   * Override this method in subclasses
   */
  protected async executePipeline(context: PipelineExecutionContext): Promise<any> {
    // Base implementation - override in subclasses
    this.logInfo('Executing pipeline implementation', {
      executionId: context.executionId,
      payload: context.payload
    }, 'executePipeline');
    
    // Simulate execution
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Return mock result
    return {
      success: true,
      data: context.payload,
      timestamp: Date.now(),
      pipelineId: this.pipelineId,
      instanceId: this.getId()
    };
  }

  /**
   * Destroy the actual pipeline implementation
   * Override this method in subclasses
   */
  protected async destroyPipeline(): Promise<void> {
    // Base implementation - override in subclasses
    this.logInfo('Destroying pipeline implementation', {}, 'destroyPipeline');
    
    // Simulate cleanup
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Convert any error to PipelineError
   */
  private convertToPipelineError(error: unknown): PipelineError {
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      // Already a PipelineError
      return error as PipelineError;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Determine error code based on error message
    let errorCode = PipelineErrorCode.EXECUTION_FAILED;
    if (errorMessage.includes('timeout')) {
      errorCode = PipelineErrorCode.EXECUTION_TIMEOUT;
    } else if (errorMessage.includes('connection') || errorMessage.includes('network')) {
      errorCode = PipelineErrorCode.CONNECTION_FAILED;
    } else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
      errorCode = PipelineErrorCode.AUTHENTICATION_FAILED;
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      errorCode = PipelineErrorCode.RATE_LIMIT_EXCEEDED;
    }

    return new PipelineErrorImpl(
      errorCode,
      errorMessage,
      PipelineErrorCategory.EXECUTION,
      'high',
      'recoverable',
      'single_module',
      'module',
      this.pipelineId,
      this.getId(),
      Date.now(),
      undefined,
      error instanceof Error ? error : new Error(errorMessage),
      errorStack
    );
  }

  /**
   * Update health status based on metrics
   */
  private updateHealthStatus(): void {
    let newHealth: PipelineHealth = PipelineHealth.HEALTHY;

    // Check if we should be in maintenance mode
    if (this.isMaintenanceMode) {
      newHealth = PipelineHealth.UNHEALTHY;
    } else if (!this.isEnabled) {
      newHealth = PipelineHealth.UNHEALTHY;
    } else if (this.state === PipelineState.ERROR) {
      newHealth = PipelineHealth.UNHEALTHY;
    } else if (this.healthMetrics.consecutiveErrors > 3) {
      newHealth = PipelineHealth.UNHEALTHY;
    } else if (this.healthMetrics.consecutiveErrors > 0) {
      newHealth = PipelineHealth.DEGRADED;
    } else if (this.healthMetrics.successRate < 0.8) {
      newHealth = PipelineHealth.DEGRADED;
    }

    if (newHealth !== this.healthMetrics.health) {
      this.logInfo('Health status changed', {
        pipelineId: this.pipelineId,
        instanceId: this.getId(),
        previousHealth: this.healthMetrics.health,
        newHealth
      }, 'updateHealthStatus');
    }

    this.healthMetrics.health = newHealth;
  }

  /**
   * Create initial health metrics
   */
  private createInitialHealthMetrics(): PipelineHealthMetrics {
    return {
      state: this.state,
      health: PipelineHealth.UNKNOWN,
      errorCount: 0,
      consecutiveErrors: 0,
      averageResponseTime: 0,
      uptime: 0,
      requestCount: 0,
      successRate: 1.0,
      lastError: undefined,
      lastErrorTime: undefined,
      lastSuccessTime: undefined
    };
  }

  /**
   * Perform health check
   */
  public async performHealthCheck(): Promise<boolean> {
    const now = Date.now();
    
    // Skip health check if interval hasn't passed
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isHealthy();
    }

    this.lastHealthCheck = now;

    try {
      this.logInfo('Performing health check', {
        pipelineId: this.pipelineId,
        instanceId: this.getId()
      }, 'performHealthCheck');

      // Perform actual health check
      const isHealthy = await this.performActualHealthCheck();

      if (!isHealthy) {
        this.healthMetrics.consecutiveErrors++;
        this.updateHealthStatus();
      } else {
        this.healthMetrics.consecutiveErrors = 0;
        this.updateHealthStatus();
      }

      this.logInfo('Health check completed', {
        pipelineId: this.pipelineId,
        instanceId: this.getId(),
        isHealthy,
        healthMetrics: this.healthMetrics
      }, 'performHealthCheck');

      return isHealthy;

    } catch (error) {
      this.healthMetrics.consecutiveErrors++;
      this.updateHealthStatus();
      
      this.error('Health check failed', {
        pipelineId: this.pipelineId,
        instanceId: this.getId(),
        error
      }, 'performHealthCheck');
      
      return false;
    }
  }

  /**
   * Perform actual health check
   * Override this method in subclasses
   */
  protected async performActualHealthCheck(): Promise<boolean> {
    // Base implementation - override in subclasses
    // Simulate health check
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // For demo purposes, check if we're in a good state
    return this.state === PipelineState.READY && 
           this.isEnabled && 
           !this.isMaintenanceMode &&
           this.healthMetrics.consecutiveErrors < 5;
  }

  /**
   * Get HTTP status code for error
   */
  public getHttpStatusCode(errorCode: PipelineErrorCode): number {
    return ERROR_CODE_TO_HTTP_STATUS[errorCode] || 500;
  }
}