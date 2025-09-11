// Main Bootstrap Service for RCC

import { BaseModule } from 'rcc-basemodule';
import { ModuleInfo } from 'rcc-basemodule';
import { IBootstrapService } from './interfaces/IBootstrapService';
import { 
  BootstrapConfig, 
  ServiceConfig, 
  ServiceStatus, 
  ServiceHealth,
  BootstrapState 
} from './types/BootstrapTypes';

/**
 * Bootstrap Service for RCC system initialization and service coordination
 * Manages the complete lifecycle of all RCC services including startup, configuration,
 * health monitoring, and graceful shutdown
 */
export class BootstrapService extends BaseModule implements IBootstrapService {
  private config: BootstrapConfig | null = null;
  private services: Map<string, ServiceConfig> = new Map();
  private serviceStatus: Map<string, ServiceStatus> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private startupSequence: string[] = [];
  private shutdownSequence: string[] = [];
  private serviceDependencies: Map<string, string[]> = new Map();
  
  constructor() {
    const moduleInfo: ModuleInfo = {
      id: 'BootstrapService',
      name: 'RCC Bootstrap Service',
      version: '1.0.0',
      description: 'System initialization and service coordination module for RCC framework',
      type: 'bootstrap',
      capabilities: ['service-orchestration', 'health-monitoring', 'graceful-shutdown', 'dependency-management'],
      dependencies: ['rcc-basemodule'],
      config: {},
      metadata: {
        author: 'RCC Development Team',
        license: 'MIT',
        repository: 'https://github.com/rcc/rcc-bootstrap'
      }
    };
    
    super(moduleInfo);
  }

  /**
   * Configure the bootstrap service
   */
  public configure(config: BootstrapConfig): void {
    super.configure(config);
    this.config = config;
    this.logInfo('Bootstrap service configured', { config }, 'configure');
  }

  /**
   * Initialize the bootstrap service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.warn('Bootstrap service is already initialized', {}, 'initialize');
      return;
    }

    this.log('Initializing Bootstrap Service', {}, 'initialize');
    
    try {
      // Call parent initialize first
      await super.initialize();
      
      // Validate configuration
      this.validateConfig();
      
      // Initialize service registry
      this.initializeServiceRegistry();
      
      // Setup health monitoring
      this.setupHealthMonitoring();
      
      // Setup message handlers
      this.setupMessageHandlers();
      
      this.isInitialized = true;
      this.logInfo('Bootstrap Service initialized successfully', {}, 'initialize');
      
      // Notify initialization complete
      this.broadcastMessage('bootstrap-initialized', { config: this.config });
      
    } catch (error) {
      this.error('Failed to initialize Bootstrap Service', error, 'initialize');
      throw error;
    }
  }

  /**
   * Start the bootstrap service and all configured services
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Bootstrap service must be initialized before starting');
    }
    
    if (this.isRunning) {
      this.warn('Bootstrap service is already running', {}, 'start');
      return;
    }

    this.log('Starting Bootstrap Service', {}, 'start');
    
    try {
      // Start services in dependency order
      await this.startServices();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isRunning = true;
      this.logInfo('Bootstrap Service started successfully', {}, 'start');
      
      // Notify startup complete
      this.broadcastMessage('bootstrap-started', { 
        serviceCount: this.services.size,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.error('Failed to start Bootstrap Service', error, 'start');
      throw error;
    }
  }

  /**
   * Stop the bootstrap service and all running services
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      this.warn('Bootstrap service is not running', {}, 'stop');
      return;
    }

    this.log('Stopping Bootstrap Service', {}, 'stop');
    
    try {
      // Stop health monitoring
      this.stopHealthMonitoring();
      
      // Stop services in reverse dependency order
      await this.stopServices();
      
      this.isRunning = false;
      this.logInfo('Bootstrap Service stopped successfully', {}, 'stop');
      
      // Notify shutdown complete
      this.broadcastMessage('bootstrap-stopped', { 
        serviceCount: this.services.size,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.error('Failed to stop Bootstrap Service', error, 'stop');
      throw error;
    }
  }

  /**
   * Restart the bootstrap service and all services
   */
  public async restart(): Promise<void> {
    this.log('Restarting Bootstrap Service', {}, 'restart');
    
    await this.stop();
    await this.start();
    
    this.logInfo('Bootstrap Service restarted successfully', {}, 'restart');
  }

  /**
   * Get the current bootstrap state
   */
  public getState(): BootstrapState {
    const serviceStates: Record<string, ServiceStatus> = {};
    this.serviceStatus.forEach((status, serviceId) => {
      serviceStates[serviceId] = status;
    });

    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      services: serviceStates,
      timestamp: Date.now()
    };
  }

  /**
   * Get health status for all services
   */
  public async getHealth(): Promise<ServiceHealth> {
    const healthChecks: Record<string, boolean> = {};
    const errors: string[] = [];
    
    // Check each service's health
    for (const [serviceId, status] of this.serviceStatus) {
      try {
        const isHealthy = await this.checkServiceHealth(serviceId);
        healthChecks[serviceId] = isHealthy;
        
        if (!isHealthy) {
          errors.push(`Service ${serviceId} is unhealthy`);
        }
      } catch (error) {
        healthChecks[serviceId] = false;
        errors.push(`Service ${serviceId} health check failed: ${error}`);
      }
    }
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const failedChecks = Object.values(healthChecks).filter(check => !check).length;
    
    if (failedChecks === 0) {
      status = 'healthy';
    } else if (failedChecks <= Math.floor(healthChecks.length * 0.3)) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      checks: healthChecks,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: Date.now()
    };
  }

  /**
   * Register a new service
   */
  public async registerService(serviceConfig: ServiceConfig): Promise<void> {
    this.log('Registering service', { serviceId: serviceConfig.id }, 'registerService');
    
    // Validate service configuration
    this.validateServiceConfig(serviceConfig);
    
    // Add to service registry
    this.services.set(serviceConfig.id, serviceConfig);
    
    // Initialize service status
    this.serviceStatus.set(serviceConfig.id, {
      serviceId: serviceConfig.id,
      status: 'registered',
      health: 'unknown',
      lastCheck: Date.now(),
      startupTime: 0,
      uptime: 0,
      errorCount: 0,
      lastError: undefined
    });
    
    // Update dependency graph
    if (serviceConfig.dependencies) {
      this.serviceDependencies.set(serviceConfig.id, serviceConfig.dependencies);
    }
    
    this.logInfo('Service registered successfully', { serviceId: serviceConfig.id }, 'registerService');
    
    // Notify service registered
    this.broadcastMessage('service-registered', { service: serviceConfig });
  }

  /**
   * Unregister a service
   */
  public async unregisterService(serviceId: string): Promise<void> {
    this.log('Unregistering service', { serviceId }, 'unregisterService');
    
    if (!this.services.has(serviceId)) {
      throw new Error(`Service '${serviceId}' not found`);
    }
    
    // Stop service if running
    const status = this.serviceStatus.get(serviceId);
    if (status && status.status === 'running') {
      await this.stopService(serviceId);
    }
    
    // Remove from registries
    this.services.delete(serviceId);
    this.serviceStatus.delete(serviceId);
    this.serviceDependencies.delete(serviceId);
    
    this.logInfo('Service unregistered successfully', { serviceId }, 'unregisterService');
    
    // Notify service unregistered
    this.broadcastMessage('service-unregistered', { serviceId });
  }

  /**
   * Start a specific service
   */
  public async startService(serviceId: string): Promise<void> {
    this.log('Starting service', { serviceId }, 'startService');
    
    const serviceConfig = this.services.get(serviceId);
    if (!serviceConfig) {
      throw new Error(`Service '${serviceId}' not found`);
    }
    
    const status = this.serviceStatus.get(serviceId)!;
    
    // Check dependencies
    if (serviceConfig.dependencies) {
      for (const depId of serviceConfig.dependencies) {
        const depStatus = this.serviceStatus.get(depId);
        if (!depStatus || depStatus.status !== 'running') {
          throw new Error(`Dependency '${depId}' not running for service '${serviceId}'`);
        }
      }
    }
    
    try {
      // Update status
      status.status = 'starting';
      status.startupTime = Date.now();
      
      // Start the service (implementation depends on service type)
      await this.executeServiceStart(serviceConfig);
      
      // Update status
      status.status = 'running';
      status.health = 'healthy';
      
      this.logInfo('Service started successfully', { serviceId }, 'startService');
      
      // Notify service started
      this.broadcastMessage('service-started', { serviceId, config: serviceConfig });
      
    } catch (error) {
      status.status = 'error';
      status.health = 'unhealthy';
      status.lastError = error instanceof Error ? error.message : String(error);
      status.errorCount++;
      
      this.error('Failed to start service', { serviceId, error }, 'startService');
      throw error;
    }
  }

  /**
   * Stop a specific service
   */
  public async stopService(serviceId: string): Promise<void> {
    this.log('Stopping service', { serviceId }, 'stopService');
    
    const serviceConfig = this.services.get(serviceId);
    if (!serviceConfig) {
      throw new Error(`Service '${serviceId}' not found`);
    }
    
    const status = this.serviceStatus.get(serviceId)!;
    
    try {
      // Update status
      status.status = 'stopping';
      
      // Stop the service
      await this.executeServiceStop(serviceConfig);
      
      // Update status
      status.status = 'stopped';
      status.health = 'unknown';
      status.uptime = Date.now() - status.startupTime;
      
      this.logInfo('Service stopped successfully', { serviceId }, 'stopService');
      
      // Notify service stopped
      this.broadcastMessage('service-stopped', { serviceId });
      
    } catch (error) {
      status.status = 'error';
      status.lastError = error instanceof Error ? error.message : String(error);
      status.errorCount++;
      
      this.error('Failed to stop service', { serviceId, error }, 'stopService');
      throw error;
    }
  }

  /**
   * Get service status
   */
  public getServiceStatus(serviceId: string): ServiceStatus | undefined {
    return this.serviceStatus.get(serviceId);
  }

  /**
   * Get all service statuses
   */
  public getAllServiceStatuses(): ServiceStatus[] {
    return Array.from(this.serviceStatus.values());
  }

  /**
   * Get configuration
   */
  public getConfig(): BootstrapConfig {
    if (!this.config) {
      throw new Error('Bootstrap service not configured');
    }
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public async updateConfig(config: Partial<BootstrapConfig>): Promise<void> {
    this.log('Updating bootstrap configuration', config, 'updateConfig');
    
    if (!this.config) {
      throw new Error('Bootstrap service not configured');
    }
    
    // Merge configuration
    this.config = { ...this.config, ...config };
    
    this.logInfo('Bootstrap configuration updated successfully', this.config, 'updateConfig');
  }

  /**
   * Handle incoming messages
   */
  public async handleMessage(message: any): Promise<any> {
    this.log('Handling message', { type: message.type, source: message.source }, 'handleMessage');
    
    switch (message.type) {
      case 'service-health-check':
        return await this.handleHealthCheck(message);
      case 'service-restart-request':
        return await this.handleServiceRestart(message);
      case 'system-shutdown-request':
        return await this.handleSystemShutdown(message);
      default:
        return await super.handleMessage(message);
    }
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    this.log('Cleaning up Bootstrap Service', {}, 'destroy');
    
    try {
      // Stop if running
      if (this.isRunning) {
        await this.stop();
      }
      
      // Clear registries
      this.services.clear();
      this.serviceStatus.clear();
      this.serviceDependencies.clear();
      this.startupSequence.length = 0;
      this.shutdownSequence.length = 0;
      
      this.config = null;
      this.isInitialized = false;
      
      await super.destroy();
      
    } catch (error) {
      this.error('Error during cleanup', error, 'destroy');
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config) {
      throw new Error('Bootstrap service not configured');
    }
    
    if (!this.config.startupTimeout || this.config.startupTimeout < 1000) {
      throw new Error('Startup timeout must be at least 1000ms');
    }
    
    if (!this.config.shutdownTimeout || this.config.shutdownTimeout < 1000) {
      throw new Error('Shutdown timeout must be at least 1000ms');
    }
  }

  /**
   * Initialize service registry
   */
  private initializeServiceRegistry(): void {
    if (!this.config) return;
    
    // Register default services from configuration
    for (const serviceConfig of this.config.services || []) {
      this.registerService(serviceConfig);
    }
    
    // Calculate startup and shutdown sequences
    this.calculateServiceSequences();
  }

  /**
   * Calculate service startup and shutdown sequences
   */
  private calculateServiceSequences(): void {
    // Topological sort for startup sequence
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (serviceId: string): void => {
      if (visited.has(serviceId)) return;
      if (visiting.has(serviceId)) {
        throw new Error(`Circular dependency detected involving service ${serviceId}`);
      }
      
      visiting.add(serviceId);
      
      const dependencies = this.serviceDependencies.get(serviceId) || [];
      for (const depId of dependencies) {
        visit(depId);
      }
      
      visiting.delete(serviceId);
      visited.add(serviceId);
      this.startupSequence.push(serviceId);
    };
    
    // Visit all services
    for (const serviceId of this.services.keys()) {
      visit(serviceId);
    }
    
    // Shutdown sequence is reverse of startup sequence
    this.shutdownSequence = [...this.startupSequence].reverse();
  }

  /**
   * Setup health monitoring
   */
  private setupHealthMonitoring(): void {
    if (!this.config) return;
    
    const interval = this.config.healthCheckInterval || 30000; // 30 seconds default
    
    this.healthCheckInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.performHealthChecks();
      }
    }, interval);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Health monitoring is already set up in setupHealthMonitoring
    this.log('Health monitoring started', {}, 'startHealthMonitoring');
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.log('Health monitoring stopped', {}, 'stopHealthMonitoring');
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    // Message handling is done in handleMessage method
    this.log('Message handlers set up', {}, 'setupMessageHandlers');
  }

  /**
   * Start all services
   */
  private async startServices(): Promise<void> {
    for (const serviceId of this.startupSequence) {
      await this.startService(serviceId);
    }
  }

  /**
   * Stop all services
   */
  private async stopServices(): Promise<void> {
    for (const serviceId of this.shutdownSequence) {
      try {
        await this.stopService(serviceId);
      } catch (error) {
        this.warn('Failed to stop service during shutdown', { serviceId, error }, 'stopServices');
      }
    }
  }

  /**
   * Execute service start
   */
  private async executeServiceStart(serviceConfig: ServiceConfig): Promise<void> {
    // This is a placeholder for actual service start logic
    // In a real implementation, this would:
    // - Load the service module
    // - Initialize and start the service
    // - Handle any service-specific startup logic
    
    this.log('Executing service start', { serviceId: serviceConfig.id }, 'executeServiceStart');
    
    // Simulate service startup
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Execute service stop
   */
  private async executeServiceStop(serviceConfig: ServiceConfig): Promise<void> {
    // This is a placeholder for actual service stop logic
    // In a real implementation, this would:
    // - Gracefully shutdown the service
    // - Cleanup resources
    // - Handle any service-specific shutdown logic
    
    this.log('Executing service stop', { serviceId: serviceConfig.id }, 'executeServiceStop');
    
    // Simulate service shutdown
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Check service health
   */
  private async checkServiceHealth(serviceId: string): Promise<boolean> {
    // This is a placeholder for actual health check logic
    // In a real implementation, this would:
    // - Ping the service
    // - Check service-specific health metrics
    // - Validate service responsiveness
    
    const status = this.serviceStatus.get(serviceId);
    return status?.status === 'running' && status.health === 'healthy';
  }

  /**
   * Perform health checks for all services
   */
  private async performHealthChecks(): Promise<void> {
    this.trace('Performing health checks', {}, 'performHealthChecks');
    
    for (const [serviceId, status] of this.serviceStatus) {
      if (status.status === 'running') {
        try {
          const isHealthy = await this.checkServiceHealth(serviceId);
          
          // Update service status
          status.health = isHealthy ? 'healthy' : 'unhealthy';
          status.lastCheck = Date.now();
          
          if (!isHealthy) {
            this.warn('Service health check failed', { serviceId }, 'performHealthChecks');
          }
          
        } catch (error) {
          status.health = 'unhealthy';
          status.lastCheck = Date.now();
          status.lastError = error instanceof Error ? error.message : String(error);
          
          this.error('Service health check error', { serviceId, error }, 'performHealthChecks');
        }
      }
    }
  }

  /**
   * Validate service configuration
   */
  private validateServiceConfig(serviceConfig: ServiceConfig): void {
    if (!serviceConfig.id || !serviceConfig.name || !serviceConfig.type) {
      throw new Error('Service configuration missing required fields: id, name, type');
    }
    
    if (serviceConfig.startupTimeout && serviceConfig.startupTimeout < 1000) {
      throw new Error('Service startup timeout must be at least 1000ms');
    }
    
    if (serviceConfig.shutdownTimeout && serviceConfig.shutdownTimeout < 1000) {
      throw new Error('Service shutdown timeout must be at least 1000ms');
    }
  }

  /**
   * Handle health check message
   */
  private async handleHealthCheck(message: any): Promise<any> {
    this.log('Handling health check request', {}, 'handleHealthCheck');
    
    const health = await this.getHealth();
    
    return {
      messageId: message.id,
      correlationId: message.correlationId || '',
      success: true,
      data: health,
      timestamp: Date.now()
    };
  }

  /**
   * Handle service restart message
   */
  private async handleServiceRestart(message: any): Promise<any> {
    this.log('Handling service restart request', { serviceId: message.payload?.serviceId }, 'handleServiceRestart');
    
    const serviceId = message.payload?.serviceId;
    if (!serviceId) {
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: 'Missing serviceId in restart request',
        timestamp: Date.now()
      };
    }
    
    try {
      await this.stopService(serviceId);
      await this.startService(serviceId);
      
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: true,
        data: { serviceId, restarted: true },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Handle system shutdown message
   */
  private async handleSystemShutdown(message: any): Promise<any> {
    this.log('Handling system shutdown request', {}, 'handleSystemShutdown');
    
    try {
      await this.stop();
      
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: true,
        data: { shutdown: true },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        messageId: message.id,
        correlationId: message.correlationId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }
}