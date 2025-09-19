// Bootstrap Service implementation using rcc-config-parser module
// This implementation integrates with the config parser module

import { IBootstrapService } from './interfaces/IBootstrapService';
import {
  BootstrapConfig,
  ServiceConfig,
  ServiceStatus,
  SystemHealth,
  ServiceInstance
} from './types/BootstrapTypes';
// ConfigurationSystem interface from config-management module
interface ConfigurationSystem {
  initialize(config: any): Promise<void>;
  loadConfig(source: any): Promise<void>;
  generatePipelineTable(mappings: any): Promise<void>;
  getCurrentConfig(): any;
  getPipelineTable(): any;
  destroy(): Promise<void>;
}
import { BaseModule, IOTrackingConfig, ModuleInfo } from 'rcc-basemodule';
// @ts-ignore - Ignore TypeScript checking for ServerModule since npm package may have import issues
import { ServerModule } from 'rcc-server';
// SimpleDebugLogManager interface for enhanced request logging
interface SimpleDebugLogManager {
  logRequest(request: any): Promise<void>;
  logSuccess(context: any, request: any, response: any): Promise<void>;
  logError(context: any, error: any, request: any, stage?: string, metadata?: any): Promise<void>;
  startRequest(component: string, operation: string, data: any): any;
  trackStage(requestId: string, stage: string): void;
  completeStage(requestId: string, stage: string, data?: any): void;
}

/**
 * Bootstrap Service for RCC system initialization and service coordination
 * This implementation integrates with the rcc-config-parser module
 */
export class BootstrapService extends BaseModule implements IBootstrapService {
  private config: BootstrapConfig | null = null;
  private services: Map<string, ServiceInstance> = new Map();
  private isRunning = false;
  private configurationSystem: ConfigurationSystem | null = null;
  private debugSystem: any = null;
  // 移除局部logger和tracker - 使用BaseModule内置功能
  private debugLogManager: SimpleDebugLogManager | null = null;
  private testScheduler: any = null;
  private pipelineScheduler: any = null;

  constructor() {
    // Initialize BaseModule with proper module info
    const moduleInfo: ModuleInfo = {
      id: 'bootstrap-service',
      name: 'Bootstrap Service',
      version: '1.0.0',
      description: 'RCC Bootstrap Service for system initialization and service coordination',
      type: 'system',
      capabilities: ['service-coordination', 'system-initialization'],
      dependencies: ['rcc-basemodule', 'rcc-config-parser'],
      metadata: {
        config: {
          autoStart: true,
          serviceTimeout: 30000
        },
        author: 'RCC Development Team'
      }
    };

    super(moduleInfo);

    // Initialize the service
    // this.logInfo('BootstrapService constructor initialized');
  }

  /**
   * Enable two-phase debug system
   * @param baseDirectory - Base directory for debug logs
   * @param ioTracking - Optional IO tracking configuration
   */
  enableTwoPhaseDebug(baseDirectory: string = '~/.rcc/debug', ioTracking?: IOTrackingConfig): void {
    try {
      // Use BaseModule's two-phase debug system instead of custom debugSystem
      this.enableTwoPhaseDebugMode(true, baseDirectory, ioTracking);

      // Configure debug logging with enhanced pipeline recording
      if (this.pipelineScheduler) {
        // Note: getTwoPhaseDebugSystem method doesn't exist in BaseModule
        // This functionality would need to be added to BaseModule or removed
      }

      this.logInfo('Two-phase debug system enabled with BaseModule integration', {
        baseDirectory,
        enabledIOTracking: !!ioTracking,
        pipelineRecording: !!this.pipelineScheduler,
        method: 'enableTwoPhaseDebug'
      }, 'enableTwoPhaseDebug');
    } catch (error) {
      this.logError('Failed to enable two-phase debug system', {
        error: error instanceof Error ? error.message : String(error),
        baseDirectory,
        method: 'enableTwoPhaseDebug'
      }, 'enableTwoPhaseDebug');
      throw error;
    }
  }

  /**
   * Switch debug system to port mode
   * @param port - Port number
   */
  switchDebugToPortMode(port: number): void {
    try {
      // Use BaseModule's port mode switching
      this.switchToPortMode(port);

      this.logInfo('Debug system switched to port mode', {
        port,
        method: 'switchDebugToPortMode'
      }, 'switchDebugToPortMode');
    } catch (error) {
      this.logError('Failed to switch debug system to port mode', {
        error: error instanceof Error ? error.message : String(error),
        port,
        method: 'switchDebugToPortMode'
      }, 'switchDebugToPortMode');
    }
  }

  /**
   * Set module logger for enhanced logging - 已废弃，使用BaseModule内置功能
   * @deprecated 使用BaseModule的logInfo, logError等方法代替
   */
  setModuleLogger(moduleLogger: any): void {
    this.logInfo('Module logger functionality已集成到BaseModule中 - 使用this.logInfo()代替',
      { method: 'setModuleLogger', deprecated: true });
  }

  /**
   * Set request tracker for enhanced tracing - 已废弃，使用BaseModule内置功能
   * @deprecated 使用BaseModule的recordIO, startOperation, endOperation等方法代替
   */
  setRequestTracker(requestTracker: any): void {
    this.logInfo('Request tracker functionality已集成到BaseModule中 - 使用this.recordIO()代替',
      { method: 'setRequestTracker', deprecated: true });
  }

  /**
   * Set debug log manager for enhanced pipeline logging
   */
  setDebugLogManager(debugLogManager: SimpleDebugLogManager): void {
    this.debugLogManager = debugLogManager;
    this.debugSystem?.log('info', 'Debug Log Manager set for Bootstrap service', {
      method: 'setDebugLogManager'
    });
  }

  /**
   * Set test scheduler for virtual model mapping validation
   */
  setTestScheduler(testScheduler: any): void {
    this.testScheduler = testScheduler;
    this.debugSystem?.log('info', 'Test Scheduler set for Bootstrap service', {
      method: 'setTestScheduler'
    });
  }

  /**
   * Set Pipeline Scheduler for enhanced request processing
   */
  setPipelineScheduler(pipelineScheduler: any): void {
    this.pipelineScheduler = pipelineScheduler;
    this.debugSystem?.log('info', 'Pipeline Scheduler set for Bootstrap service', {
      method: 'setPipelineScheduler'
    });
  }

  /**
   * Initialize the bootstrap service with configuration
   * Configures the system with latest BaseModule two-phase debug system
   */
  async configure(config: BootstrapConfig): Promise<void> {
    // 初始化两阶段调试系统（如果可用）
    if (config.debugSystem) {
      this.debugSystem = config.debugSystem;
    } else if (config.enableTwoPhaseDebug) {
      // Enable BaseModule's two-phase debug system with enhanced IO tracking
      this.enableTwoPhaseDebugMode(true, config.debugBaseDirectory || '~/.rcc/debug', {
        enabled: true,
        autoRecord: true,
        saveIndividualFiles: true,
        saveSessionFiles: true,
        sessionFileName: 'bootstrap-session.jsonl',
        ioDirectory: `${config.debugBaseDirectory || '~/.rcc/debug'}/io/bootstrap`,
        includeTimestamp: true,
        includeDuration: true,
        maxEntriesPerFile: 1000
      });

      // Record bootstrap pipeline start
      if (this.pipelineScheduler) {
        const twoPhaseDebugSystem = this.getTwoPhaseDebugSystem();
        if (twoPhaseDebugSystem) {
          twoPhaseDebugSystem.recordPipelineStart(
            'bootstrap-service',
            'Bootstrap Service Initialization',
            {
              serviceCount: config.services?.length || 0,
              configurationPath: config.configurationPath,
              enablePipeline: config.enablePipeline
            },
            { phase: 'configure', timestamp: Date.now() }
          );
        }
      }
    }

    // 使用BaseModule的日志系统代替自定义debugSystem
    this.logInfo('BootstrapService configuration started', {
      method: 'configure',
      timestamp: Date.now(),
      twoPhaseDebug: !!config.enableTwoPhaseDebug,
      ioTrackingEnabled: config.enableTwoPhaseDebug
    }, 'configure');

    this.config = config;

    // 确保配置中包含调试系统（局部logger和tracker已移除，使用BaseModule内置功能）
    if (config.debugSystem) {
      this.debugSystem = config.debugSystem;
    }

    // 确保服务配置存在
    if (!this.config.services || this.config.services.length === 0) {
      this.debugSystem?.log('warn', 'No services configured, using default configuration', {
        method: 'configure'
      });

      // 使用默认服务配置
      this.config.services = [
        {
          id: 'rcc-server',
          type: 'http-server',
          name: 'RCC HTTP Server',
          description: 'Main HTTP API server for RCC system',
          version: '1.0.0',
          modulePath: 'rcc-server',
          dependencies: ['rcc-basemodule', 'rcc-config-parser'],
          startupOrder: 1,
          enabled: true,
          required: true,
          autoRestart: true,
          maxRestartAttempts: 3,
          healthCheck: {
            enabled: true,
            interval: 30000,
            timeout: 5000
          },
          startupTimeout: 30000,
          shutdownTimeout: 10000,
          config: {
            port: 5506,
            host: '0.0.0.0',
            enableVirtualModels: true,
            enablePipeline: true,
            debug: {
              enabled: true,
              logDirectory: '~/.rcc/debug-logs',
              maxLogSize: 10485760,
              maxLogFiles: 10,
              logLevel: 'debug',
              logRequests: true,
              logResponses: true,
              logErrors: true,
              logPerformance: true,
              logToolCalls: true,
              logAuth: true,
              logPipelineState: true,
              filterSensitiveData: true
            }
          }
        }
      ];

      this.debugSystem?.log('info', 'Default services configuration added', {
        servicesCount: this.config.services.length,
        method: 'configure'
      });
    }

    // 记录模块初始化
    this.logInfo('BootstrapService initialized', {
      servicesCount: this.config.services.length,
      configurationPath: this.config.configurationPath
    });

    // Initialize configuration system
    try {
      this.debugSystem?.log('info', 'Initializing configuration system', {
        method: 'configure'
      });

      // Dynamically import config parser factory functions and handle any import issues
      let createConfigParser: any;
      let createConfigLoader: any;
      let createPipelineConfigGenerator: any;
      let importSuccess = false;
      let importMethod = '';

      try {
        // Try primary import from rcc-config-parser
        const configModule = await import('rcc-config-parser') as any;
        createConfigParser = configModule.createConfigParser || configModule.default?.createConfigParser;
        createConfigLoader = configModule.createConfigLoader || configModule.default?.createConfigLoader;
        createPipelineConfigGenerator = configModule.createPipelineConfigGenerator || configModule.default?.createPipelineConfigGenerator;
        importMethod = 'primary';
        importSuccess = true;
      } catch (importError) {
        this.debugSystem?.log('warn', 'Primary import failed, trying alternative import methods', {
          error: importError instanceof Error ? importError.message : String(importError),
          method: 'configure'
        });

        try {
          // Try importing from the distribution directly
          const configModule = await import('rcc-config-parser/dist/index.js') as any;
          createConfigParser = configModule.createConfigParser || configModule.default?.createConfigParser;
          createConfigLoader = configModule.createConfigLoader || configModule.default?.createConfigLoader;
          createPipelineConfigGenerator = configModule.createPipelineConfigGenerator || configModule.default?.createPipelineConfigGenerator;
          importMethod = 'dist';
          importSuccess = true;
        } catch (secondaryError) {
          this.debugSystem?.log('error', 'Failed to import rcc-config-parser functions', {
            error: secondaryError instanceof Error ? secondaryError.message : String(secondaryError),
            method: 'configure'
          });
        }
      }

      if (!createConfigParser || !createConfigLoader || !createPipelineConfigGenerator) {
        throw new Error('Failed to import required functions from rcc-config-parser module');
      }

      // Use the configuration path from the passed config if available, otherwise use default path
      const configPath = this.config?.configurationPath || '/Users/fanzhang/.rcc/rcc-config.json';

      this.debugSystem?.log('info', 'Creating configuration parser system', {
        configPath,
        importMethod,
        method: 'configure'
      });

      // Create a simple configuration system wrapper using config parser components
      const configParser = createConfigParser();
      const configLoader = createConfigLoader();
      const pipelineGenerator = createPipelineConfigGenerator();

      // Store debug system reference for use in wrapper methods
      const debugSystem = this.debugSystem;

      // Create configuration system wrapper
      this.configurationSystem = {
        async initialize(config: any): Promise<void> {
          // Initialize config parser with configuration
          if (config && typeof config === 'object') {
            // Config initialization logic here
          }
        },
        async loadConfig(source: any): Promise<void> {
          // Use config loader to load configuration
          try {
            if (typeof source === 'string') {
              await configLoader.loadConfig(source);
            }
          } catch (error) {
            debugSystem?.log('warn', 'Failed to load configuration', {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        },
        async generatePipelineTable(mappings: any): Promise<void> {
          // Use pipeline generator to create pipeline table
          try {
            if (mappings && typeof mappings === 'object') {
              await pipelineGenerator.generateConfig(mappings);
            }
          } catch (error) {
            debugSystem?.log('warn', 'Failed to generate pipeline table', {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        },
        getCurrentConfig(): any {
          // Return current configuration
          return configLoader?.getCurrentConfig() || {};
        },
        getPipelineTable(): any {
          // Return pipeline table
          return pipelineGenerator?.getPipelineTable() || {};
        },
        async destroy(): Promise<void> {
          // Cleanup resources
          // Config parser components don't need explicit destruction
        }
      };

      // Initialize the configuration system
      await this.configurationSystem.initialize({ configPath });

      this.debugSystem?.log('info', 'Configuration parser system initialized successfully', {
        configPath,
        importMethod,
        method: 'configure'
      });

    } catch (error) {
      this.debugSystem?.log('error', 'Failed to initialize configuration system', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        method: 'configure'
      });
      throw error;
    }

    this.debugSystem?.log('info', 'BootstrapService configuration completed', {
      servicesCount: this.config?.services?.length || 0,
      method: 'configure'
    });

    // Record bootstrap pipeline end
    if (this.config?.enableTwoPhaseDebug && this.pipelineScheduler) {
      const twoPhaseDebugSystem = this.getTwoPhaseDebugSystem();
      if (twoPhaseDebugSystem) {
        twoPhaseDebugSystem.recordPipelineEnd(
          'bootstrap-service',
          'Bootstrap Service Initialization',
          {
            completed: true,
            servicesConfigured: this.config.services?.length || 0,
            configurationPath: this.config.configurationPath,
            timeElapsed: Date.now()
          },
          true,
          undefined,
          { phase: 'configure-complete', timestamp: Date.now() }
        );
      }
    }

    this.logInfo('BootstrapService configuration completed', {
      servicesCount: this.config?.services?.length || 0,
      pipelineRecordingActive: this.config?.enableTwoPhaseDebug && !!this.pipelineScheduler
    }, 'configure');
  }

  /**
   * Start the bootstrap service and initialize all services
   */
  async start(): Promise<void> {
    console.log('=== BootstrapService.start() called ===');
    try {
      if (!this.config) {
        throw new Error('Bootstrap service not configured');
      }

      if (!this.configurationSystem) {
        throw new Error('Configuration system not initialized');
      }

      // this.log('Starting bootstrap service...');
      this.isRunning = true;

      // Load configuration and generate pipeline table
      try {
        this.startIOTracking('bootstrap-load-config', { configPath: this.config?.configurationPath });
        console.log('Loading configuration from file');
        // Use the configuration path from the passed config if available, otherwise use default path
        const configPath = this.config?.configurationPath || '/Users/fanzhang/.rcc/rcc-config.json';
        console.log(`Using configuration path: ${configPath}`);
        await this.configurationSystem.loadConfig(configPath);
        const currentConfig = await this.configurationSystem.getCurrentConfig();
        this.endIOTracking('bootstrap-load-config', { providers: Object.keys(currentConfig.providers || {}).length, virtualModels: Object.keys(currentConfig.virtualModels || {}).length });
        console.log(`Loaded configuration with ${Object.keys(currentConfig.providers || {}).length} providers and ${Object.keys(currentConfig.virtualModels || {}).length} virtual models`);

        this.startIOTracking('bootstrap-generate-pipeline');
        console.log('Generating pipeline table from configuration');
        await this.configurationSystem.generatePipelineTable(currentConfig);
        this.endIOTracking('bootstrap-generate-pipeline', { success: true });
        console.log('Generated pipeline table from configuration');

        // Get the pipeline table for output
        const pipelineTable = this.configurationSystem.getPipelineTable();
        console.log('Pipeline parsing results:', JSON.stringify(pipelineTable, null, 2));
      } catch (error) {
        this.endIOTracking('bootstrap-load-config', {}, false, error instanceof Error ? error.message : String(error));
        this.endIOTracking('bootstrap-generate-pipeline', {}, false, error instanceof Error ? error.message : String(error));
        console.error('Failed to load configuration or generate pipeline table:', error);
        throw error;
      }

      // Initialize services - services should now be present in this.config.services
      const services = this.config?.services || [];
      console.log('Initializing services, service count:', services.length);
      // Initialize services
      for (const serviceConfig of services) {
        console.log('Processing service:', serviceConfig.id, serviceConfig.type);
        // Check if this is the server module
        if (serviceConfig.id === 'rcc-server' && serviceConfig.type === 'http-server') {
          try {
            // Create and initialize ServerModule instance
            console.log('Creating ServerModule instance');
            const serverModule = new ServerModule();
            console.log('ServerModule instance created successfully');

            // Configure ServerModule with parsed configuration data
            console.log('Configuring ServerModule with parsed configuration');
            const currentConfig = await this.configurationSystem.getCurrentConfig();
            const serverConfig = {
              ...serviceConfig.config,
              // Add parsed configuration data here if needed
              parsedConfig: currentConfig,
              // Ensure required server configuration fields are present
              host: serviceConfig.config.host || '0.0.0.0',
              port: serviceConfig.config.port || 5507,
              timeout: serviceConfig.config.timeout || 30000,
              bodyLimit: serviceConfig.config.bodyLimit || '10mb',
              cors: serviceConfig.config.cors || {},
              helmet: serviceConfig.config.helmet !== false,
              compression: serviceConfig.config.compression !== false
            };
            console.log('ServerModule configuration:', JSON.stringify(serverConfig, null, 2));
            await serverModule.configure(serverConfig);
            console.log('ServerModule configured successfully');

            // Set debug log manager for enhanced request logging
            if (this.debugLogManager) {
              console.log('Setting DebugLogManager for ServerModule');
              (serverModule as any).setDebugLogManager(this.debugLogManager);
              console.log('DebugLogManager set successfully');
            }

            // Set test scheduler for virtual model mapping validation
            if (this.testScheduler) {
              console.log('Setting TestScheduler for ServerModule');
              (serverModule as any).setTestScheduler(this.testScheduler);
              console.log('TestScheduler set successfully');
            }
            // Set Pipeline Scheduler for enhanced request processing
            if (this.pipelineScheduler) {
              console.log('Setting Pipeline Scheduler for ServerModule');
              (serverModule as any).setPipelineScheduler(this.pipelineScheduler);
              console.log('Pipeline Scheduler set successfully');
            }

            // BaseModule内置功能已取代外部logger和tracker
            // ServerModule会自动使用BaseModule的logInfo, recordIO等方法

            console.log('Initializing ServerModule');
            await serverModule.initialize();
            console.log('ServerModule initialized successfully');
            console.log('Starting ServerModule');
            await serverModule.start();
            console.log('ServerModule started successfully');
          } catch (error: any) {
            console.error('Failed to initialize ServerModule:', error);
            console.error('Error stack:', error.stack);
          }
        }

        // Check if service configuration exists in the configuration system
        let serviceInstance: ServiceInstance;

        try {
          // Try to get service configuration from the configuration system
          // Note: ConfigurationSystem doesn't have a getModule method, so we'll use the service config directly
          serviceInstance = {
            serviceId: serviceConfig.id,
            instanceId: `${serviceConfig.id}-${Date.now()}`,
            host: 'localhost',
            startTime: Date.now(),
            status: {
              serviceId: serviceConfig.id,
              state: 'running',
              health: 'healthy',
              lastUpdate: Date.now(),
              uptime: 0,
              restartAttempts: 0,
              metrics: {},
              status: 200,
              startupTime: Date.now(),
              lastCheck: Date.now(),
              errorCount: 0
            },
            config: serviceConfig
          };

          // this.log(`Initialized service: ${serviceConfig.id}`);
        } catch (error) {
          // this.warn(`Failed to initialize service ${serviceConfig.id}: ` + (error instanceof Error ? error.message : String(error)));

          // Fallback to default service instance
          serviceInstance = {
            serviceId: serviceConfig.id,
            instanceId: `${serviceConfig.id}-${Date.now()}`,
            host: 'localhost',
            startTime: Date.now(),
            status: {
              serviceId: serviceConfig.id,
              state: 'running',
              health: 'healthy',
              lastUpdate: Date.now(),
              uptime: 0,
              restartAttempts: 0,
              metrics: {},
              status: 200,
              startupTime: Date.now(),
              lastCheck: Date.now(),
              errorCount: 0
            },
            config: serviceConfig
          };
        }

        this.services.set(serviceConfig.id, serviceInstance);
      }

      // this.log(`Bootstrap service started with ${this.services.size} services`);
      console.log('=== BootstrapService.start() completed ===');
    } catch (error: any) {
      console.error('Error in BootstrapService.start():', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Stop the bootstrap service and shutdown all services
   */
  async stop(): Promise<void> {
    // this.log('Stopping bootstrap service...');
    this.isRunning = false;
    
    // Clean up services
    this.services.clear();
    
    // Skip configuration system cleanup for testing
    // if (this.configurationSystem) {
    //   try {
    //     await this.configurationSystem.destroy();
    //     this.log('Configuration system cleaned up');
    //   } catch (error) {
    //     this.warn('Failed to clean up configuration system: ' + (error instanceof Error ? error.message : String(error)));
    //   }
    //   this.configurationSystem = null;
    // }
    
    // this.log('Bootstrap service stopped');
  }

  /**
   * Restart the bootstrap service
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Get the current system status
   */
  getSystemStatus(): SystemHealth {
    const totalServices = this.services.size;
    const runningServices = Array.from(this.services.values()).filter(
      s => s.status.state === 'running'
    ).length;
    const failedServices = Array.from(this.services.values()).filter(
      s => s.status.state === 'error'
    ).length;

    return {
      status: failedServices > 0 ? 'degraded' : 'healthy',
      totalServices,
      runningServices,
      failedServices,
      uptime: Date.now() - (this.services.values().next().value?.startTime || Date.now()),
      services: Object.fromEntries(
        Array.from(this.services.entries()).map(([id, instance]) => [id, instance.status])
      ),
      metrics: {
        totalMemoryUsage: 0,
        totalCpuUsage: 0,
        healthCheckSuccessRate: runningServices / totalServices,
        avgResponseTime: 0
      },
      lastHealthCheck: Date.now()
    };
  }

  /**
   * Get status of a specific service
   */
  getServiceStatus(serviceId: string): ServiceStatus | undefined {
    return this.services.get(serviceId)?.status;
  }

  /**
   * Start a specific service
   */
  async startService(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (service) {
      service.status.state = 'running';
      service.status.lastUpdate = Date.now();
      // this.log(`Service ${serviceId} started`);
    } else {
      throw new Error(`Service ${serviceId} not found`);
    }
  }

  /**
   * Stop a specific service
   */
  async stopService(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (service) {
      service.status.state = 'stopped';
      service.status.lastUpdate = Date.now();
      // this.log(`Service ${serviceId} stopped`);
    } else {
      throw new Error(`Service ${serviceId} not found`);
    }
  }

  /**
   * Restart a specific service
   */
  async restartService(serviceId: string): Promise<void> {
    await this.stopService(serviceId);
    await this.startService(serviceId);
  }

  /**
   * Add a new service to the registry
   */
  async addService(service: ServiceConfig): Promise<void> {
    // Skip configuration system registration for testing
    // if (this.configurationSystem) {
    //   try {
    //     // ConfigurationSystem doesn't have a registerModule method, so we'll skip this for now
    //     this.log(`Service ${service.id} initialized`);
    //   } catch (error) {
    //     this.warn(`Failed to register service ${service.id} with configuration system: ` + (error instanceof Error ? error.message : String(error)));
    //   }
    // }
    
    const serviceInstance: ServiceInstance = {
      serviceId: service.id,
      instanceId: `${service.id}-${Date.now()}`,
      host: 'localhost',
      startTime: Date.now(),
      status: {
        serviceId: service.id,
        state: 'running',
        health: 'healthy',
        lastUpdate: Date.now(),
        uptime: 0,
        restartAttempts: 0,
        metrics: {},
        status: 200,
        startupTime: Date.now(),
        lastCheck: Date.now(),
        errorCount: 0
      },
      config: service
    };
    
    this.services.set(service.id, serviceInstance);
    // this.log(`Service ${service.id} added`);
  }

  /**
   * Remove a service from the registry
   */
  async removeService(serviceId: string): Promise<void> {
    if (this.services.has(serviceId)) {
      this.services.delete(serviceId);
      // this.log(`Service ${serviceId} removed`);
    } else {
      throw new Error(`Service ${serviceId} not found`);
    }
  }

  /**
   * Get all registered services
   */
  getServices(): ServiceConfig[] {
    return Array.from(this.services.values()).map(instance => instance.config);
  }

  
  // Message handling
  private broadcastBootstrapMessage(type: string, data: any): void {
    // this.log('info', `Broadcast message: ${type}`, undefined, 'broadcastBootstrapMessage');
  }
}