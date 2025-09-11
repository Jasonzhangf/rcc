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
   * List of services to manage
   */
  services: ServiceConfig[];

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