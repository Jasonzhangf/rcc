// Type definitions for RCC Bootstrap Service

/**
 * Bootstrap configuration
 */
export interface BootstrapConfig {
  /**
   * Configuration version
   */
  version: string;

  /**
   * System name
   */
  systemName: string;

  /**
   * Environment (development, staging, production)
   */
  environment: 'development' | 'staging' | 'production';

  /**
   * Path to configuration file
   */
  configurationPath?: string;

  /**
   * List of services to manage
   */
  services: ServiceConfig[];

  /**
   * Default services to use when no services are defined in configuration
   */
  defaultServices?: ServiceConfig[];

  /**
   * Global configuration
   */
  global: {
    /**
     * Health check interval in milliseconds
     */
    healthCheckInterval: number;

    /**
     * Service timeout in milliseconds
     */
    serviceTimeout: number;

    /**
     * Maximum restart attempts
     */
    maxRestartAttempts: number;

    /**
     * Log level
     */
    logLevel: 'debug' | 'info' | 'warn' | 'error';

    /**
     * Enable graceful shutdown
     */
    gracefulShutdown: boolean;

    /**
     * Graceful shutdown timeout
     */
    gracefulShutdownTimeout: number;
  };

  /**
   * Service coordination settings
   */
  coordination: {
    /**
     * Enable parallel startup
     */
    parallelStartup: boolean;

    /**
     * Maximum concurrent startups
     */
    maxConcurrentStartups: number;

    /**
     * Startup delay between services
     */
    startupDelay: number;

    /**
     * Enable dependency resolution
     */
    resolveDependencies: boolean;
  };

  /**
   * Startup timeout in milliseconds
   */
  startupTimeout: number;

  /**
   * Shutdown timeout in milliseconds
   */
  shutdownTimeout: number;

  /**
   * Health check interval in milliseconds
   */
  healthCheckInterval: number;
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  /**
   * Service identifier
   */
  id: string;

  /**
   * Service name
   */
  name: string;

  /**
   * Service type
   */
  type: 'http-server' | 'pipeline' | 'error-handler' | 'config-manager' | 'custom';

  /**
   * Service version
   */
  version: string;

  /**
   * Service description
   */
  description: string;

  /**
   * Main module path
   */
  modulePath: string;

  /**
   * Service configuration
   */
  config: Record<string, any>;

  /**
   * Service dependencies
   */
  dependencies: string[];

  /**
   * Startup order (lower numbers start first)
   */
  startupOrder: number;

  /**
   * Whether service is enabled
   */
  enabled: boolean;

  /**
   * Whether service is required for system to function
   */
  required: boolean;

  /**
   * Auto-restart on failure
   */
  autoRestart: boolean;

  /**
   * Maximum restart attempts
   */
  maxRestartAttempts: number;

  /**
   * Health check configuration
   */
  healthCheck: {
    /**
     * Enable health checks
     */
    enabled: boolean;

    /**
     * Health check endpoint
     */
    endpoint?: string;

    /**
     * Health check interval
     */
    interval: number;

    /**
     * Health check timeout
     */
    timeout: number;

    /**
     * Expected response status
     */
    expectedStatus?: number;

    /**
     * Custom health check logic
     */
    custom?: (service: ServiceInstance) => Promise<boolean>;
  };

  /**
   * Resource limits
   */
  resources?: {
    /**
     * Memory limit in MB
     */
    memoryLimit?: number;

    /**
     * CPU limit
     */
    cpuLimit?: number;

    /**
     * Maximum instances
     */
    maxInstances?: number;
  };

  /**
   * Environment variables
   */
  environment?: Record<string, string>;

  /**
   * Startup timeout in milliseconds
   */
  startupTimeout: number;

  /**
   * Shutdown timeout in milliseconds
   */
  shutdownTimeout: number;

  /**
   * Service conditions for startup and execution
   */
  conditions?: {
    /**
     * Pre-startup conditions
     */
    preStartup?: Array<{
      type: 'file_exists' | 'port_available' | 'dependency_running' | 'custom';
      target: string;
      timeout?: number;
      required: boolean;
    }>;

    /**
     * Runtime conditions
     */
    runtime?: Array<{
      type: 'memory_usage' | 'cpu_usage' | 'response_time' | 'custom';
      operator: 'less_than' | 'greater_than' | 'equals' | 'not_equals';
      value: number;
      action: 'warn' | 'restart' | 'scale' | 'custom';
    }>;
  };
}

/**
 * Service status
 */
export interface ServiceStatus {
  /**
   * Service identifier
   */
  serviceId: string;

  /**
   * Service state
   */
  state: 'stopped' | 'starting' | 'running' | 'stopping' | 'error' | 'restarting';

  /**
   * Service health
   */
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

  /**
   * Last status update timestamp
   */
  lastUpdate: number;

  /**
   * Service uptime in milliseconds
   */
  uptime: number;

  /**
   * Number of restart attempts
   */
  restartAttempts: number;

  /**
   * Last error (if any)
   */
  lastError?: string;

  /**
   * Additional metrics
   */
  metrics: {
    /**
     * Memory usage in MB
     */
    memoryUsage?: number;

    /**
     * CPU usage percentage
     */
    cpuUsage?: number;

    /**
     * Request count
     */
    requestCount?: number;

    /**
     * Error count
     */
    errorCount?: number;

    /**
     * Response time average
     */
    avgResponseTime?: number;
  };

  /**
   * Status code for quick reference
   */
  status: number;

  /**
   * Service startup time
   */
  startupTime: number;

  /**
   * Last health check timestamp
   */
  lastCheck: number;

  /**
   * Error count
   */
  errorCount: number;
}

/**
 * System health status
 */
export interface SystemHealth {
  /**
   * Overall system status
   */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /**
   * Total services
   */
  totalServices: number;

  /**
   * Running services
   */
  runningServices: number;

  /**
   * Failed services
   */
  failedServices: number;

  /**
   * System uptime in milliseconds
   */
  uptime: number;

  /**
   * Service statuses
   */
  services: Record<string, ServiceStatus>;

  /**
   * System metrics
   */
  metrics: {
    /**
     * Total memory usage
     */
    totalMemoryUsage: number;

    /**
     * Total CPU usage
     */
    totalCpuUsage: number;

    /**
     * Health check success rate
     */
    healthCheckSuccessRate: number;

    /**
     * Average response time
     */
    avgResponseTime: number;
  };

  /**
   * Last health check timestamp
   */
  lastHealthCheck: number;
}

/**
 * Service instance information
 */
export interface ServiceInstance {
  /**
   * Service identifier
   */
  serviceId: string;

  /**
   * Instance identifier
   */
  instanceId: string;

  /**
   * Process ID (if applicable)
   */
  pid?: number;

  /**
   * Port number (if applicable)
   */
  port?: number;

  /**
   * Host address
   */
  host: string;

  /**
   * Start time
   */
  startTime: number;

  /**
   * Instance status
   */
  status: ServiceStatus;

  /**
   * Instance configuration
   */
  config: ServiceConfig;
}

/**
 * Service health details
 */
export interface ServiceHealth {
  /**
   * Overall health status
   */
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

  /**
   * Health score (0-100)
   */
  score: number;

  /**
   * Last health check timestamp
   */
  lastCheck: number;

  /**
   * Health check details
   */
  details: {
    /**
     * Basic health check status
     */
    basic: boolean;

    /**
     * Detailed health check status
     */
    detailed?: boolean;

    /**
     * Custom health check results
     */
    custom?: Record<string, boolean>;
  };

  /**
   * Health metrics
   */
  metrics: {
    /**
     * Response time
     */
    responseTime?: number;

    /**
     * Error rate
     */
    errorRate?: number;

    /**
     * Availability percentage
     */
    availability?: number;
  };

  /**
   * Health checks performed
   */
  checks: {
    /**
     * Basic check status
     */
    basic: boolean;

    /**
     * Detailed check status
     */
    detailed: boolean;

    /**
     * Custom check results
     */
    custom: Record<string, boolean>;
  };

  /**
   * Timestamp of last check
   */
  timestamp: number;

  /**
   * Error information
   */
  errors: {
    /**
     * Number of errors
     */
    count: number;

    /**
     * Error messages
     */
    messages: string[];
  };
}

/**
 * Bootstrap state
 */
export interface BootstrapState {
  /**
   * Current phase
   */
  phase: 'initializing' | 'starting' | 'running' | 'stopping' | 'error' | 'restarting';

  /**
   * Progress percentage (0-100)
   */
  progress: number;

  /**
   * Current operation
   */
  currentOperation?: string;

  /**
   * Total services
   */
  totalServices: number;

  /**
   * Completed services
   */
  completedServices: number;

  /**
   * Failed services
   */
  failedServices: number;

  /**
   * Start time
   */
  startTime: number;

  /**
   * Estimated completion time
   */
  estimatedCompletion?: number;

  /**
   * System health
   */
  systemHealth: SystemHealth;

  /**
   * Active alerts
   */
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: number;
    serviceId?: string;
    resolved: boolean;
  }>;

  /**
   * Initialization status
   */
  isInitialized: boolean;
}

/**
 * Service registry
 */
export interface ServiceRegistry {
  /**
   * All registered services
   */
  services: Map<string, ServiceConfig>;

  /**
   * Active service instances
   */
  instances: Map<string, ServiceInstance[]>;

  /**
   * Service status mapping
   */
  statuses: Map<string, ServiceStatus>;

  /**
   * Dependency graph
   */
  dependencies: Map<string, string[]>;

  /**
   * Reverse dependency graph
   */
  dependents: Map<string, string[]>;
}