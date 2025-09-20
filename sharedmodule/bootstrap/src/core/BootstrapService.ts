// RCC Bootstrap Service with BaseModule Integration
// Enhanced with comprehensive IO tracking and debug capabilities

import { BaseModule, ModuleInfo } from 'rcc-basemodule';
import type {
  BootstrapConfig,
  ServiceConfig,
  ServiceStatus,
  SystemHealth,
  BootstrapState
} from '../types/BootstrapTypes';

export class BootstrapService extends BaseModule {
  private config: BootstrapConfig | null = null;
  private isInitialized: boolean = false;
  private services: Map<string, ServiceConfig> = new Map();
  private serviceStatuses: Map<string, ServiceStatus> = new Map();
  private serverModule: any = null;
  private pipelineSystem: any = null;

  constructor() {
    const moduleInfo: ModuleInfo = {
      id: 'bootstrap-service',
      name: 'Bootstrap Service',
      version: '1.0.0',
      description: 'RCC Bootstrap Service with debug capabilities',
      type: 'service'
    };
    super(moduleInfo);
    this.config = null;
    this.isInitialized = false;
  }

  /**
   * Configure the bootstrap service
   */
  public async configure(config: BootstrapConfig): Promise<void> {
    const operationId = `configure-bootstrap-${Date.now()}`;
    this.startIOTracking(operationId, { config }, 'configure');

    try {
      this.debug('info', 'Configuring Bootstrap Service', { config }, 'BootstrapService');

      if (!config) {
        throw new Error('Bootstrap configuration is required');
      }

      this.config = config;

      // Initialize services from config
      if (config.services && Array.isArray(config.services)) {
        config.services.forEach(service => {
          this.services.set(service.id, service);
        });
      }

      this.debug('info', 'Bootstrap Service configured successfully', { serviceCount: this.services.size }, 'BootstrapService');
      this.endIOTracking(operationId, { serviceCount: this.services.size });

    } catch (error) {
      this.endIOTracking(operationId, null, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Initialize the bootstrap service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.debug('warn', 'Bootstrap service is already initialized', null, 'BootstrapService');
      return;
    }

    const operationId = `initialize-bootstrap-${Date.now()}`;
    this.startIOTracking(operationId, null, 'initialize');

    try {
      this.debug('info', 'Initializing Bootstrap Service', null, 'BootstrapService');

      // Initialize core components
      await this.initializeCoreComponents();

      this.isInitialized = true;
      this.debug('info', 'Bootstrap Service initialized successfully', null, 'BootstrapService');
      this.endIOTracking(operationId, { initialized: true });

    } catch (error) {
      this.endIOTracking(operationId, null, false, error instanceof Error ? error.message : String(error));
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

    if (!this.config) {
      throw new Error('Bootstrap service must be configured before starting');
    }

    const operationId = `start-bootstrap-${Date.now()}`;
    this.startIOTracking(operationId, { serviceCount: this.services.size }, 'start');

    try {
      this.debug('info', 'Starting Bootstrap Service', { serviceCount: this.services.size }, 'BootstrapService');

      // Start services in order based on startupOrder
      const sortedServices = Array.from(this.services.values())
        .filter(service => service.enabled)
        .sort((a, b) => a.startupOrder - b.startupOrder);

      for (const service of sortedServices) {
        await this.startService(service);
      }

      this.debug('info', 'Bootstrap Service started successfully', null, 'BootstrapService');
      this.endIOTracking(operationId, { startedServices: sortedServices.length });

    } catch (error) {
      this.endIOTracking(operationId, null, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Stop the bootstrap service and all running services
   */
  public async stop(): Promise<void> {
    const operationId = `stop-bootstrap-${Date.now()}`;
    this.startIOTracking(operationId, null, 'stop');

    try {
      this.debug('info', 'Stopping Bootstrap Service', null, 'BootstrapService');

      // Stop services in reverse order
      const sortedServices = Array.from(this.services.values())
        .filter(service => service.enabled)
        .sort((a, b) => b.startupOrder - a.startupOrder);

      for (const service of sortedServices) {
        await this.stopService(service.id);
      }

      this.debug('info', 'Bootstrap Service stopped successfully', null, 'BootstrapService');
      this.endIOTracking(operationId, { stoppedServices: sortedServices.length });

    } catch (error) {
      this.endIOTracking(operationId, null, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Get current system health status
   */
  public getSystemHealth(): SystemHealth {
    const services = Array.from(this.serviceStatuses.values());
    const runningServices = services.filter(s => s.state === 'running').length;
    const failedServices = services.filter(s => s.state === 'error').length;

    return {
      status: failedServices === 0 ? 'healthy' : runningServices > 0 ? 'degraded' : 'unhealthy',
      totalServices: services.length,
      runningServices,
      failedServices,
      uptime: Date.now(),
      services: Object.fromEntries(this.serviceStatuses),
      metrics: {
        totalMemoryUsage: 0,
        totalCpuUsage: 0,
        healthCheckSuccessRate: runningServices / services.length,
        avgResponseTime: 0
      },
      lastHealthCheck: Date.now()
    };
  }

  /**
   * Get current bootstrap state
   */
  public getBootstrapState(): BootstrapState {
    const systemHealth = this.getSystemHealth();

    return {
      phase: this.isInitialized ? 'running' : 'initializing',
      progress: this.calculateProgress(),
      currentOperation: this.getCurrentOperation(),
      totalServices: this.services.size,
      completedServices: Array.from(this.serviceStatuses.values()).filter(s => s.state === 'running').length,
      failedServices: Array.from(this.serviceStatuses.values()).filter(s => s.state === 'error').length,
      startTime: Date.now(),
      systemHealth,
      alerts: [],
      isInitialized: this.isInitialized
    };
  }

  /**
   * Set server module for integration
   */
  public setServerModule(serverModule: any): void {
    const operationId = `set-server-module-${Date.now()}`;
    this.startIOTracking(operationId, { hasServerModule: !!serverModule }, 'setServerModule');

    this.serverModule = serverModule;
    this.debug('info', 'Server module connected to bootstrap', { hasServerModule: !!serverModule }, 'BootstrapService');
    this.endIOTracking(operationId, { connected: true });
  }

  /**
   * Set pipeline system for integration
   */
  public setPipelineSystem(pipelineSystem: any): void {
    const operationId = `set-pipeline-system-${Date.now()}`;
    this.startIOTracking(operationId, { hasPipelineSystem: !!pipelineSystem }, 'setPipelineSystem');

    this.pipelineSystem = pipelineSystem;
    this.debug('info', 'Pipeline system connected to bootstrap', { hasPipelineSystem: !!pipelineSystem }, 'BootstrapService');
    this.endIOTracking(operationId, { connected: true });
  }

  // Private methods

  private async initializeCoreComponents(): Promise<void> {
    const operationId = `initialize-core-components-${Date.now()}`;
    this.startIOTracking(operationId, null, 'initializeCoreComponents');

    try {
      this.debug('info', 'Initializing core components', null, 'BootstrapService');

      // Placeholder for core component initialization
      // In a real implementation, this would initialize:
      // - Message center
      // - Configuration manager
      // - Health monitoring system
      // - etc.

      this.endIOTracking(operationId, { initialized: true });

    } catch (error) {
      this.endIOTracking(operationId, null, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async startService(service: ServiceConfig): Promise<void> {
    const operationId = `start-service-${service.id}-${Date.now()}`;
    this.startIOTracking(operationId, { service }, 'startService');

    try {
      this.debug('info', `Starting service: ${service.name} (${service.id})`, { service }, 'BootstrapService');

      // Create service status
      const status: ServiceStatus = {
        serviceId: service.id,
        state: 'starting',
        health: 'unknown',
        lastUpdate: Date.now(),
        uptime: 0,
        restartAttempts: 0,
        metrics: {},
        status: 0,
        startupTime: Date.now(),
        lastCheck: Date.now(),
        errorCount: 0
      };

      this.serviceStatuses.set(service.id, status);

      // Simulate service startup
      await this.simulateServiceStartup(service);

      // Update status to running
      status.state = 'running';
      status.health = 'healthy';
      status.lastUpdate = Date.now();
      status.uptime = Date.now() - status.startupTime;

      this.serviceStatuses.set(service.id, status);

      this.debug('info', `Service started successfully: ${service.name}`, { status }, 'BootstrapService');
      this.endIOTracking(operationId, { serviceId: service.id, status: 'running' });

    } catch (error) {
      // Update status to error
      const status = this.serviceStatuses.get(service.id);
      if (status) {
        status.state = 'error';
        status.health = 'unhealthy';
        status.lastUpdate = Date.now();
        status.lastError = error instanceof Error ? error.message : String(error);
        status.errorCount++;
        this.serviceStatuses.set(service.id, status);
      }

      this.debug('error', `Failed to start service: ${service.name}`, { error }, 'BootstrapService');
      this.endIOTracking(operationId, null, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async stopService(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      this.debug('warn', `Service not found: ${serviceId}`, null, 'BootstrapService');
      return;
    }

    const operationId = `stop-service-${serviceId}-${Date.now()}`;
    this.startIOTracking(operationId, { serviceId, service }, 'stopService');

    try {
      this.debug('info', `Stopping service: ${service.name} (${serviceId})`, { service }, 'BootstrapService');

      // Simulate service shutdown
      await this.simulateServiceShutdown(service);

      // Update status
      const status = this.serviceStatuses.get(serviceId);
      if (status) {
        status.state = 'stopped';
        status.health = 'unknown';
        status.lastUpdate = Date.now();
        this.serviceStatuses.set(serviceId, status);
      }

      this.debug('info', `Service stopped successfully: ${service.name}`, null, 'BootstrapService');
      this.endIOTracking(operationId, { serviceId, status: 'stopped' });

    } catch (error) {
      this.debug('error', `Failed to stop service: ${service.name}`, { error }, 'BootstrapService');
      this.endIOTracking(operationId, null, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async simulateServiceStartup(service: ServiceConfig): Promise<void> {
    // Simulate some startup delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Different simulation based on service type
    switch (service.type) {
      case 'http-server':
        this.debug('info', `Starting HTTP server on port ${service.config?.port || 3000}`, { service }, 'BootstrapService');
        break;
      case 'pipeline':
        this.debug('info', 'Initializing pipeline system', { service }, 'BootstrapService');
        break;
      case 'error-handler':
        this.debug('info', 'Setting up error handling system', { service }, 'BootstrapService');
        break;
      default:
        this.debug('info', `Starting custom service: ${service.type}`, { service }, 'BootstrapService');
    }
  }

  private async simulateServiceShutdown(service: ServiceConfig): Promise<void> {
    // Simulate shutdown delay
    await new Promise(resolve => setTimeout(resolve, 50));

    this.debug('info', `Service shutdown complete: ${service.name}`, { service }, 'BootstrapService');
  }

  private calculateProgress(): number {
    if (this.services.size === 0) return 100;

    const completedServices = Array.from(this.serviceStatuses.values())
      .filter(s => s.state === 'running' || s.state === 'stopped').length;

    return Math.round((completedServices / this.services.size) * 100);
  }

  private getCurrentOperation(): string {
    const runningServices = Array.from(this.serviceStatuses.values())
      .filter(s => s.state === 'starting');

    if (runningServices.length > 0) {
      return `Starting ${runningServices[0].serviceId}`;
    }

    return 'System running';
  }
}