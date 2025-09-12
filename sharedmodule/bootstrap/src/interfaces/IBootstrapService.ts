// Simplified Interface definitions for RCC Bootstrap Service

import { BootstrapConfig, ServiceConfig, ServiceStatus, SystemHealth, ServiceInstance } from '../types/BootstrapTypes';

/**
 * Bootstrap Service interface
 */
export interface IBootstrapService {
  /**
   * Initialize the bootstrap service with configuration
   */
  configure(config: BootstrapConfig): void;

  /**
   * Start the bootstrap service and initialize all services
   */
  start(): Promise<void>;

  /**
   * Stop the bootstrap service and shutdown all services
   */
  stop(): Promise<void>;

  /**
   * Restart the bootstrap service
   */
  restart(): Promise<void>;

  /**
   * Get the current system status
   */
  getSystemStatus(): SystemHealth;

  /**
   * Get status of a specific service
   */
  getServiceStatus(serviceId: string): ServiceStatus | undefined;

  /**
   * Start a specific service
   */
  startService(serviceId: string): Promise<void>;

  /**
   * Stop a specific service
   */
  stopService(serviceId: string): Promise<void>;

  /**
   * Restart a specific service
   */
  restartService(serviceId: string): Promise<void>;

  /**
   * Add a new service to the registry
   */
  addService(service: ServiceConfig): Promise<void>;

  /**
   * Remove a service from the registry
   */
  removeService(serviceId: string): Promise<void>;

  /**
   * Get all registered services
   */
  getServices(): ServiceConfig[];
}

/**
 * Service Coordinator interface
 */
export interface IServiceCoordinator {
  /**
   * Coordinate service startup sequence
   */
  coordinateStartup(): Promise<void>;

  /**
   * Coordinate service shutdown sequence
   */
  coordinateShutdown(): Promise<void>;

  /**
   * Handle service failures and recovery
   */
  handleServiceFailure(serviceId: string, error: Error): Promise<void>;

  /**
   * Check service dependencies
   */
  checkDependencies(serviceId: string): Promise<boolean>;

  /**
   * Get service startup order
   */
  getStartupOrder(): string[];
}

/**
 * Configuration Manager interface
 */
export interface IConfigManager {
  /**
   * Load configuration from file
   */
  loadConfig(configPath: string): Promise<BootstrapConfig>;

  /**
   * Validate configuration
   */
  validateConfig(config: BootstrapConfig): Promise<boolean>;

  /**
   * Get service configuration
   */
  getServiceConfig(serviceId: string): ServiceConfig | undefined;

  /**
   * Update service configuration
   */
  updateServiceConfig(serviceId: string, config: Partial<ServiceConfig>): Promise<void>;

  /**
   * Save configuration to file
   */
  saveConfig(configPath: string): Promise<void>;
}

/**
 * Health Monitor interface
 */
export interface IHealthMonitor {
  /**
   * Start health monitoring
   */
  startMonitoring(): Promise<void>;

  /**
   * Stop health monitoring
   */
  stopMonitoring(): Promise<void>;

  /**
   * Check health of all services
   */
  checkAllServices(): Promise<SystemHealth>;

  /**
   * Check health of specific service
   */
  checkService(serviceId: string): Promise<ServiceStatus>;

  /**
   * Get health metrics
   */
  getHealthMetrics(): any;

  /**
   * Set health check interval
   */
  setHealthCheckInterval(intervalMs: number): void;
}