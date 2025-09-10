/**
 * Pipeline configuration management
 */

import { 
  PipelineError, 
  ErrorHandlingStrategy, 
  DEFAULT_ERROR_HANDLING_STRATEGIES 
} from './ErrorTypes';

/**
 * Pipeline configuration interface
 */
export interface PipelineConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  weight?: number; // for weighted load balancing
  maxConcurrentRequests?: number;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  healthCheck?: HealthCheckConfig;
  customConfig?: Record<string, any>;
}

/**
 * Load balancer configuration
 */
export interface LoadBalancerConfig {
  strategy: 'roundrobin' | 'weighted' | 'least_connections' | 'random';
  healthCheckInterval: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
  enableCircuitBreaker?: boolean;
  circuitBreakerConfig?: CircuitBreakerConfig;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTime: number;
  requestVolumeThreshold: number;
  timeout: number;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  endpoint?: string;
  expectedStatusCode?: number;
  customHealthCheck?: string;
}

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  maxRetries: number;
  defaultTimeout: number;
  enableMetrics: boolean;
  enableHealthChecks: boolean;
  enableCircuitBreaker: boolean;
  errorHandlingStrategies: ErrorHandlingStrategy[];
  customErrorHandlers: Record<string, string>; // handler name to function name
  blacklistConfig: BlacklistConfig;
}

/**
 * Blacklist configuration
 */
export interface BlacklistConfig {
  enabled: boolean;
  maxEntries: number;
  cleanupInterval: number;
  defaultBlacklistDuration: number;
  maxBlacklistDuration: number;
}

/**
 * Full pipeline system configuration
 */
export interface PipelineSystemConfig {
  scheduler: SchedulerConfig;
  loadBalancer: LoadBalancerConfig;
  pipelines: PipelineConfig[];
  globalSettings: GlobalSettings;
}

/**
 * Global settings
 */
export interface GlobalSettings {
  debug: boolean;
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  metricsEnabled: boolean;
  healthCheckEnabled: boolean;
  enableCircuitBreaker: boolean;
  maxConcurrentRequests: number;
  defaultTimeout: number;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config?: PipelineSystemConfig;
}

/**
 * Pipeline configuration manager
 */
export class PipelineConfigManager {
  private config: PipelineSystemConfig;
  private validationRules: ValidationRule[];
  private errorHandlers: Map<string, Function> = new Map();

  constructor(config: PipelineSystemConfig) {
    this.config = config;
    this.validationRules = this.initializeValidationRules();
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): ValidationRule[] {
    return [
      {
        field: 'scheduler',
        type: 'required',
        message: 'Scheduler configuration is required'
      },
      {
        field: 'loadBalancer',
        type: 'required',
        message: 'Load balancer configuration is required'
      },
      {
        field: 'pipelines',
        type: 'required',
        message: 'Pipelines configuration is required'
      },
      {
        field: 'globalSettings',
        type: 'required',
        message: 'Global settings are required'
      },
      {
        field: 'loadBalancer.strategy',
        type: 'custom',
        message: 'Invalid load balancer strategy',
        validator: (value: any) => {
          const validStrategies = ['roundrobin', 'weighted', 'least_connections', 'random'];
          return validStrategies.includes(value);
        }
      },
      {
        field: 'pipelines',
        type: 'custom',
        message: 'At least one pipeline must be configured',
        validator: (value: any[]) => Array.isArray(value) && value.length > 0
      }
    ];
  }

  /**
   * Validate configuration
   */
  public validateConfig(config: PipelineSystemConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Apply validation rules
    for (const rule of this.validationRules) {
      const value = this.getNestedValue(config, rule.field);
      const isValid = this.applyValidationRule(rule, value);
      
      if (!isValid) {
        errors.push(rule.message);
      }
    }

    // Validate pipeline configurations
    if (config.pipelines) {
      for (let i = 0; i < config.pipelines.length; i++) {
        const pipeline = config.pipelines[i];
        const pipelineErrors = this.validatePipelineConfig(pipeline, i);
        errors.push(...pipelineErrors);
      }
    }

    // Validate scheduler configuration
    const schedulerErrors = this.validateSchedulerConfig(config.scheduler);
    errors.push(...schedulerErrors);

    // Validate load balancer configuration
    const lbErrors = this.validateLoadBalancerConfig(config.loadBalancer);
    errors.push(...lbErrors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      config
    };
  }

  /**
   * Validate individual pipeline configuration
   */
  private validatePipelineConfig(pipeline: PipelineConfig, index: number): string[] {
    const errors: string[] = [];
    const prefix = `Pipeline[${index}]`;

    if (!pipeline.id) {
      errors.push(`${prefix}: ID is required`);
    }

    if (!pipeline.name) {
      errors.push(`${prefix}: Name is required`);
    }

    if (!pipeline.type) {
      errors.push(`${prefix}: Type is required`);
    }

    if (typeof pipeline.priority !== 'number' || pipeline.priority < 0) {
      errors.push(`${prefix}: Priority must be a non-negative number`);
    }

    if (pipeline.timeout !== undefined && (pipeline.timeout <= 0 || pipeline.timeout > 300000)) {
      errors.push(`${prefix}: Timeout must be between 1 and 300000 milliseconds`);
    }

    if (pipeline.maxConcurrentRequests !== undefined && pipeline.maxConcurrentRequests <= 0) {
      errors.push(`${prefix}: Max concurrent requests must be positive`);
    }

    // Check for duplicate pipeline IDs
    const duplicateId = this.config.pipelines.findIndex((p, i) => 
      i !== index && p.id === pipeline.id
    );
    if (duplicateId !== -1) {
      errors.push(`${prefix}: Duplicate pipeline ID '${pipeline.id}'`);
    }

    return errors;
  }

  /**
   * Validate scheduler configuration
   */
  private validateSchedulerConfig(scheduler: SchedulerConfig): string[] {
    const errors: string[] = [];

    if (scheduler.maxRetries < 0) {
      errors.push('Scheduler maxRetries must be non-negative');
    }

    if (scheduler.defaultTimeout <= 0) {
      errors.push('Scheduler defaultTimeout must be positive');
    }

    if (scheduler.blacklistConfig.maxEntries <= 0) {
      errors.push('Blacklist maxEntries must be positive');
    }

    if (scheduler.blacklistConfig.cleanupInterval <= 0) {
      errors.push('Blacklist cleanupInterval must be positive');
    }

    return errors;
  }

  /**
   * Validate load balancer configuration
   */
  private validateLoadBalancerConfig(loadBalancer: LoadBalancerConfig): string[] {
    const errors: string[] = [];

    if (loadBalancer.healthCheckInterval <= 0) {
      errors.push('Health check interval must be positive');
    }

    if (loadBalancer.unhealthyThreshold <= 0) {
      errors.push('Unhealthy threshold must be positive');
    }

    if (loadBalancer.healthyThreshold <= 0) {
      errors.push('Healthy threshold must be positive');
    }

    if (loadBalancer.circuitBreakerConfig) {
      const cb = loadBalancer.circuitBreakerConfig;
      if (cb.failureThreshold <= 0) {
        errors.push('Circuit breaker failure threshold must be positive');
      }
      if (cb.recoveryTime <= 0) {
        errors.push('Circuit breaker recovery time must be positive');
      }
    }

    return errors;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Apply validation rule
   */
  private applyValidationRule(rule: ValidationRule, value: any): boolean {
    switch (rule.type) {
      case 'required':
        return value !== undefined && value !== null && value !== '';
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null;
      case 'custom':
        return rule.validator ? rule.validator(value) : true;
      default:
        return true;
    }
  }

  /**
   * Get configuration
   */
  public getConfig(): PipelineSystemConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<PipelineSystemConfig>): ConfigValidationResult {
    const updatedConfig = this.mergeConfig(this.config, newConfig);
    const validation = this.validateConfig(updatedConfig);
    
    if (validation.isValid) {
      this.config = updatedConfig;
    }
    
    return validation;
  }

  /**
   * Merge configuration objects
   */
  private mergeConfig(base: PipelineSystemConfig, update: Partial<PipelineSystemConfig>): PipelineSystemConfig {
    return {
      scheduler: { ...base.scheduler, ...update.scheduler },
      loadBalancer: { ...base.loadBalancer, ...update.loadBalancer },
      pipelines: update.pipelines || base.pipelines,
      globalSettings: { ...base.globalSettings, ...update.globalSettings }
    };
  }

  /**
   * Get pipeline configuration
   */
  public getPipelineConfig(pipelineId: string): PipelineConfig | undefined {
    return this.config.pipelines.find(p => p.id === pipelineId);
  }

  /**
   * Get enabled pipelines
   */
  public getEnabledPipelines(): PipelineConfig[] {
    return this.config.pipelines.filter(p => p.enabled);
  }

  /**
   * Get error handling strategy for a specific error code
   */
  public getErrorHandlingStrategy(errorCode: number): ErrorHandlingStrategy | undefined {
    // First check custom strategies
    const customStrategy = this.config.scheduler.errorHandlingStrategies.find(
      s => s.errorCode === errorCode
    );
    
    if (customStrategy) {
      return customStrategy;
    }

    // Fall back to default strategies
    return DEFAULT_ERROR_HANDLING_STRATEGIES.find(s => s.errorCode === errorCode);
  }

  /**
   * Register custom error handler
   */
  public registerErrorHandler(name: string, handler: Function): void {
    this.errorHandlers.set(name, handler);
  }

  /**
   * Get error handler by name
   */
  public getErrorHandler(name: string): Function | undefined {
    return this.errorHandlers.get(name);
  }

  /**
   * Create default configuration
   */
  public static createDefaultConfig(): PipelineSystemConfig {
    return {
      scheduler: {
        maxRetries: 3,
        defaultTimeout: 30000,
        enableMetrics: true,
        enableHealthChecks: true,
        enableCircuitBreaker: true,
        errorHandlingStrategies: [...DEFAULT_ERROR_HANDLING_STRATEGIES],
        customErrorHandlers: {},
        blacklistConfig: {
          enabled: true,
          maxEntries: 1000,
          cleanupInterval: 300000, // 5 minutes
          defaultBlacklistDuration: 60000, // 1 minute
          maxBlacklistDuration: 3600000 // 1 hour
        }
      },
      loadBalancer: {
        strategy: 'roundrobin',
        healthCheckInterval: 30000, // 30 seconds
        unhealthyThreshold: 3,
        healthyThreshold: 2,
        enableCircuitBreaker: true,
        circuitBreakerConfig: {
          failureThreshold: 5,
          recoveryTime: 60000, // 1 minute
          requestVolumeThreshold: 10,
          timeout: 5000
        }
      },
      pipelines: [],
      globalSettings: {
        debug: false,
        logLevel: 'info',
        metricsEnabled: true,
        healthCheckEnabled: true,
        enableCircuitBreaker: true,
        maxConcurrentRequests: 100,
        defaultTimeout: 30000
      }
    };
  }
}

/**
 * Validation rule interface
 */
interface ValidationRule {
  field: string;
  type: 'required' | 'string' | 'number' | 'boolean' | 'array' | 'object' | 'custom';
  message: string;
  validator?: (value: any) => boolean;
}