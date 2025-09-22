#!/usr/bin/env node

/**
 * RCC System Startup Flow - Pipeline First Architecture
 *
 * This startup script implements the proper initialization order:
 * 1. Configuration Loading
 * 2. Pipeline Assembly and Provider Registration
 * 3. Scheduler Initialization
 * 4. Virtual Model Registration
 * 5. Server Startup with Prepared Pipeline System
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

class RCCSystemInitializer {
  constructor(options = {}) {
    this.port = options.port || 5506;
    this.configPath = options.config || path.join(os.homedir(), '.rcc', 'rcc-config.json');
    this.debugPath = options.debug || path.join(os.homedir(), '.rcc', 'debug-logs');
    this.verbose = options.verbose || false;
    this.pipelineManager = null;
    this.server = null;
    this.debugCenter = null;
    this.config = null;
    this.debugSessionId = null;

    // T3: 流水线优先架构 - 新增属性
    this.pipelineComponents = null;
    this.assembledPipelinePools = null;
    this.pipelineAssembler = null;
    this.pipelineTracker = null;
    this.currentPhase = null;

    // Debug logging setup
    this.initializeDebugLogging();
  }

  async initializeDebugLogging() {
    try {
      fs.mkdirSync(this.debugPath, { recursive: true });
      const systemStartDir = path.join(this.debugPath, 'systemstart');
      fs.mkdirSync(systemStartDir, { recursive: true });
      this.debugSessionId = `system-start-${Date.now()}`;

      this.log('system', 'RCC System Initializer created', {
        port: this.port,
        configPath: this.configPath,
        debugPath: this.debugPath,
        debugSessionId: this.debugSessionId
      });
    } catch (error) {
      console.warn('Debug logging setup failed:', error.message);
    }
  }

  log(component, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      sessionId: this.debugSessionId,
      phase: this.currentPhase || 'initialization',
      component,
      message,
      data
    };

    if (this.verbose) {
      console.log(`[${timestamp}] [${component}] ${message}`, data);
    }

    // Write to debug file
    try {
      const debugFile = path.join(this.debugPath, 'systemstart', 'startup-flow.jsonl');
      fs.appendFileSync(debugFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      // Silent fail for debug logging
    }
  }

  async start() {
    console.log('🚀 RCC System Startup - Pipeline First Architecture');
    console.log('================================================');
    console.log('📋 Execution Order: Configuration → Assembly → Scheduler → Server');

    try {
      // Phase 1: Configuration Loading
      this.currentPhase = 'configuration-loading';
      await this.loadConfiguration();

      // Phase 2: Pipeline Assembly (Provider Discovery + Pipeline Creation)
      this.currentPhase = 'pipeline-assembly';
      await this.initializePipelineSystem();

      // Phase 3: Virtual Model Scheduler Creation
      this.currentPhase = 'scheduler-initialization';
      await this.createDynamicRoutingScheduler();

      // Phase 4: Server Creation with Prepared Scheduler
      this.currentPhase = 'server-initialization';
      await this.createServerWithScheduler();

      // Phase 5: Virtual Model Router Configuration
      this.currentPhase = 'virtual-model-registration';
      await this.configureVirtualModelRouting();

      // Phase 6: Server Startup
      this.currentPhase = 'server-startup';
      await this.startServer();

      // Phase 7: System Ready
      this.currentPhase = 'system-ready';
      await this.finalizeSystemStartup();

      console.log('\n✅ RCC System Successfully Started!');
      console.log(`🌐 Server URL: http://localhost:${this.port}`);
      console.log(`🔧 API Endpoint: http://localhost:${this.port}/v1/messages`);
      console.log(`📊 Health Check: http://localhost:${this.port}/status`);

    } catch (error) {
      console.error('\n❌ RCC System Startup Failed:', error.message);
      this.log('system', 'Startup failed', {
        error: error.message,
        stack: error.stack,
        phase: this.currentPhase
      });
      throw error;
    }
  }

  async loadConfiguration() {
    this.log('configuration', 'Loading system configuration...', {
      configPath: this.configPath,
      exists: fs.existsSync(this.configPath)
    });

    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }

      this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));

      // Validate required configuration sections with enhanced fault tolerance
      if (!this.config.providers) {
        throw new Error('Configuration missing providers section');
      }

      if (!this.config.virtualModels) {
        console.warn('⚠️ Configuration missing virtualModels section - using defaults');
        this.config.virtualModels = {};
      }

      if (!this.config.pipeline) {
        this.config.pipeline = {};
      }

      // Ensure providers have proper structure
      for (const [providerId, providerConfig] of Object.entries(this.config.providers)) {
        if (!providerConfig.models || Object.keys(providerConfig.models).length === 0) {
          console.warn(`⚠️ Provider ${providerId} has no models configured - it will be ignored`);
        }
        if (!providerConfig.auth || !providerConfig.auth.keys || providerConfig.auth.keys.length === 0) {
          console.warn(`⚠️ Provider ${providerId} has no authentication keys - it will fail to connect`);
        }
      }

      // Ensure virtual models have proper structure and fallback to default
      for (const [vmId, vmConfig] of Object.entries(this.config.virtualModels)) {
        if (!vmConfig.targets || vmConfig.targets.length === 0) {
          console.warn(`⚠️ Virtual model ${vmId} has no targets - it will use default routing`);
        }
        if (vmConfig.enabled === undefined) {
          vmConfig.enabled = true; // Default to enabled
        }
      }

      // Ensure default virtual model exists
      if (!this.config.virtualModels.default) {
        console.warn('⚠️ Default virtual model missing - creating basic default configuration');
        this.config.virtualModels.default = {
          id: 'default',
          targets: [],
          enabled: true,
          priority: 1
        };
      }

      this.log('configuration', 'Configuration loaded successfully', {
        providers: Object.keys(this.config.providers || {}),
        virtualModels: Object.keys(this.config.virtualModels || {}),
        pipelineConfig: this.config.pipeline
      });

      // Generate configuration wrappers for pipeline-first architecture
      this.log('configuration', 'Generating configuration wrappers...', {
        wrapperGeneration: 'enabled'
      });

      try {
        // Import wrapper generation from config-parser
        const configParserPath = path.join(process.cwd(), 'sharedmodule', 'config-parser', 'dist', 'index.js');

        if (fs.existsSync(configParserPath)) {
          const configParserModule = await import(configParserPath);
          const { generateAllWrappers } = configParserModule;

          if (generateAllWrappers) {
            const { server: serverWrapper, pipeline: pipelineWrapper } = await generateAllWrappers(this.config);

            this.serverWrapper = serverWrapper;
            this.pipelineWrapper = pipelineWrapper;

            this.log('configuration', 'Configuration wrappers generated successfully', {
              serverWrapperPort: serverWrapper.port,
              pipelineWrapperVirtualModels: pipelineWrapper.virtualModels?.length || 0,
              pipelineWrapperModules: pipelineWrapper.modules?.length || 0
            });
          } else {
            this.log('configuration', 'Wrapper generation function not available');
          }
        } else {
          this.log('configuration', 'Config parser module not found, using legacy configuration');
        }
      } catch (wrapperError) {
        this.log('configuration', 'Wrapper generation failed, using legacy configuration', {
          error: wrapperError.message
        });
      }

    } catch (error) {
      throw new Error(`Configuration loading failed: ${error.message}`);
    }
  }

  async initializePipelineSystem() {
    this.log('pipeline', 'Initializing pipeline system with wrapper-based assembly flow...');

    try {
      // Use pipeline wrapper if available, otherwise use legacy config
      let pipelineConfig = this.config.pipeline || {};
      let virtualModelsConfig = this.config.virtualModels || {};

      if (this.pipelineWrapper) {
        this.log('pipeline', 'Using pipeline wrapper configuration', {
          virtualModelsCount: this.pipelineWrapper.virtualModels?.length || 0,
          modulesCount: this.pipelineWrapper.modules?.length || 0,
          routingStrategy: this.pipelineWrapper.routing?.strategy || 'default'
        });

        // Extract configuration from wrapper
        pipelineConfig = this.pipelineWrapper.modules || {};
        virtualModelsConfig = this.pipelineWrapper.virtualModels || [];
      } else {
        this.log('pipeline', 'Pipeline wrapper not available, using legacy configuration');
      }

      // Import Pipeline module components
      const pipelinePath = path.join(process.cwd(), 'sharedmodule', 'pipeline', 'dist', 'index.esm.js');

      this.log('pipeline', 'Loading pipeline module from', { pipelinePath });

      if (!fs.existsSync(pipelinePath)) {
        throw new Error(`Pipeline module not found at: ${pipelinePath}`);
      }

      const pipelineModule = await import(pipelinePath);

      this.log('pipeline', 'Pipeline module loaded', {
        exports: Object.keys(pipelineModule)
      });

      // Verify required Pipeline classes are available
      const requiredComponents = [
        'DynamicRoutingManager',
        'PipelineAssembler',  // 新增：流水线组装器
        'ModuleScanner',     // 新增：模块扫描器
        'PipelineFactory',
        'PipelineTracker',
        'QwenProvider',
        'IFlowProvider'
      ];

      for (const component of requiredComponents) {
        if (!pipelineModule[component]) {
          throw new Error(`${component} not found in Pipeline module`);
        }
      }

      this.pipelineComponents = {
        DynamicRoutingManager: pipelineModule.DynamicRoutingManager,
        PipelineAssembler: pipelineModule.PipelineAssembler,  // 新增
        ModuleScanner: pipelineModule.ModuleScanner,         // 新增
        PipelineFactory: pipelineModule.PipelineFactory,
        PipelineTracker: pipelineModule.PipelineTracker,
        QwenProvider: pipelineModule.QwenProvider,
        IFlowProvider: pipelineModule.IFlowProvider,
        PipelineScheduler: pipelineModule.PipelineScheduler,
        BaseProvider: pipelineModule.BaseProvider
      };

      // Step 1: Create ModuleScanner and discover providers
      this.log('pipeline', 'Creating ModuleScanner for provider discovery...');
      const { ModuleScanner } = this.pipelineComponents;
      const moduleScanner = new ModuleScanner();

      const scannerOptions = {
        scanPaths: pipelineConfig?.scanPaths || this.config.pipeline?.scanPaths || ['./sharedmodule/pipeline/src/providers'],
        providerPatterns: pipelineConfig?.providerPatterns || this.config.pipeline?.providerPatterns || ['*Provider.js', '*Provider.ts'],
        recursive: true,
        providerConfigs: this.config.providers || {}
      };

      this.log('pipeline', 'Discovering providers with options', scannerOptions);
      const discoveredProviders = await moduleScanner.scan(scannerOptions);

      const providerCount = discoveredProviders.filter(p => p.status === 'available').length;
      this.log('pipeline', `Provider discovery completed`, {
        totalDiscovered: discoveredProviders.length,
        available: providerCount,
        providers: discoveredProviders.map(p => ({ id: p.info.id, status: p.status }))
      });

      // Step 2: Create PipelineAssembler and assemble pipeline pools
      this.log('pipeline', 'Creating PipelineAssembler for pipeline assembly...');
      const { PipelineAssembler, PipelineTracker } = this.pipelineComponents;

      // Create pipeline tracker for assembly
      const tracker = new PipelineTracker({
        enabled: true,
        logLevel: 'debug',
        enableMetrics: true,
        enableTracing: true,
        baseDirectory: path.join(this.debugPath, 'pipeline')
      });

      await tracker.initialize();

      // Create assembler configuration using wrapper or legacy config
      const assemblerConfig = {
        providerDiscoveryOptions: scannerOptions,
        pipelineFactoryConfig: {
          defaultTimeout: pipelineConfig?.defaultTimeout || this.config.pipeline?.defaultTimeout || 30000,
          defaultHealthCheckInterval: pipelineConfig?.healthCheckInterval || this.config.pipeline?.healthCheckInterval || 60000,
          defaultMaxRetries: pipelineConfig?.maxRetries || this.config.pipeline?.maxRetries || 3,
          defaultLoadBalancingStrategy: pipelineConfig?.loadBalancingStrategy || this.config.pipeline?.loadBalancingStrategy || 'round-robin',
          enableHealthChecks: true,
          metricsEnabled: true
        },
        enableAutoDiscovery: true,
        fallbackStrategy: 'first-available'
      };

      // Create assembler
      const assembler = new PipelineAssembler(assemblerConfig, tracker);

      // Prepare virtual model configurations using wrapper if available
      let virtualModelConfigs;
      if (this.pipelineWrapper && this.pipelineWrapper.virtualModels) {
        // Use virtual models from wrapper
        virtualModelConfigs = this.pipelineWrapper.virtualModels;
        this.log('pipeline', `Using ${virtualModelConfigs.length} virtual models from wrapper configuration`);
      } else {
        // Use legacy configuration format
        virtualModelConfigs = Object.entries(this.config.virtualModels || {}).map(([modelId, config]) => ({
          id: modelId,
          name: modelId,
          ...config,
          targets: config.targets || []
        }));
        this.log('pipeline', `Using ${virtualModelConfigs.length} virtual models from legacy configuration`);
      }

      this.log('pipeline', `Assembling pipelines for ${virtualModelConfigs.length} virtual models...`);

      // Assemble pipeline pools
      const assemblyResult = await assembler.assemblePipelines(virtualModelConfigs);

      this.log('pipeline', 'Pipeline assembly completed', {
        success: assemblyResult.success,
        poolsCreated: assemblyResult.pipelinePools.size,
        errors: (assemblyResult.errors || []).length,
        warnings: (assemblyResult.warnings || []).length,
        virtualModels: Array.from(assemblyResult.pipelinePools.keys())
      });

      if (assemblyResult.errors && assemblyResult.errors.length > 0) {
        this.log('pipeline', 'Assembly errors encountered', {
          errors: assemblyResult.errors
        });
      }

      if (!assemblyResult.success && assemblyResult.pipelinePools.size === 0) {
        throw new Error('Pipeline assembly failed - no pipelines could be created');
      }

      // Store the assembled pipeline pools and assembler for later use
      this.assembledPipelinePools = assemblyResult.pipelinePools;
      this.pipelineAssembler = assembler;
      this.pipelineTracker = tracker;

      this.log('pipeline', 'Pipeline system initialization completed successfully with wrapper integration');

    } catch (error) {
      throw new Error(`Pipeline system initialization failed: ${error.message}`);
    }
  }

  async createDynamicRoutingScheduler() {
    this.log('scheduler', 'Creating DynamicRoutingManager with assembled pipeline pools...');

    try {
      const { DynamicRoutingManager } = this.pipelineComponents;

      // Verify we have assembled pipeline pools
      if (!this.assembledPipelinePools || this.assembledPipelinePools.size === 0) {
        throw new Error('No assembled pipeline pools available for scheduler creation');
      }

      const managerConfig = {
        maxSchedulers: 10,
        defaultSchedulerConfig: {
          maxConcurrentRequests: 50,
          requestTimeout: 30000,
          healthCheckInterval: 60000,
          retryStrategy: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2
          },
          loadBalancingStrategy: 'round-robin',
          enableCircuitBreaker: true,
          circuitBreakerThreshold: 5,
          circuitBreakerTimeout: 300000
        },
        enableAutoScaling: true,
        scalingThresholds: {
          minRequestsPerMinute: 10,
          maxRequestsPerMinute: 1000,
          scaleUpCooldown: 300000,
          scaleDownCooldown: 600000
        },
        healthCheckInterval: 30000,
        metricsRetentionPeriod: 86400000, // 24 hours
        enableMetricsExport: true
      };

      // Create DynamicRoutingManager with proper configuration
      // Note: DynamicRoutingManager expects ManagerConfig and PipelineTracker
      const schedulerConfig = {
        ...managerConfig,
        pipelinePools: this.assembledPipelinePools,
        enableInternalAPI: true
      };

      this.pipelineManager = new DynamicRoutingManager(
        schedulerConfig,
        this.pipelineTracker
      );

      // Initialize the scheduler manager with pipeline pools
      this.pipelineManager.initialize(this.assembledPipelinePools);

      this.log('scheduler', 'DynamicRoutingManager created and initialized with assembled pipeline pools', {
        schedulerCount: this.pipelineManager.getMetrics().totalSchedulers,
        activeSchedulers: this.pipelineManager.getMetrics().activeSchedulers,
        pipelinePools: this.assembledPipelinePools.size,
        dynamicRoutings: Array.from(this.assembledPipelinePools.keys())
      });

    } catch (error) {
      throw new Error(`DynamicRoutingManager creation failed: ${error.message}`);
    }
  }

  async createServerWithScheduler() {
    this.log('server', 'Creating ServerModule with prepared DynamicRoutingManager...');

    try {
      // Import ServerModule
      const serverPath = path.join(process.cwd(), 'sharedmodule', 'server', 'dist', 'index.js');

      this.log('server', 'Loading ServerModule', { serverPath });

      if (!fs.existsSync(serverPath)) {
        throw new Error(`ServerModule not found at: ${serverPath}`);
      }

      const serverModule = await import(serverPath);
      const ServerModule = serverModule.ServerModule || serverModule.default;

      // Create server configuration using wrapper or legacy config
      let serverConfig;
      if (this.serverWrapper) {
        this.log('server', 'Creating server configuration using server wrapper', {
          wrapperPort: this.serverWrapper.port,
          wrapperHost: this.serverWrapper.host,
          pipelineEnabled: this.serverWrapper.pipeline?.enabled
        });

        // Use server wrapper as base and add RCC-specific configuration
        serverConfig = {
          // Use wrapper configuration
          port: this.port || this.serverWrapper.port,
          host: this.serverWrapper.host || '0.0.0.0',
          cors: this.serverWrapper.cors || {
            origin: '*',
            credentials: true
          },
          compression: this.serverWrapper.compression !== false,
          helmet: this.serverWrapper.helmet !== false,
          rateLimit: this.serverWrapper.rateLimit || {
            windowMs: 900000,
            max: 1000
          },
          timeout: this.serverWrapper.timeout || 60000,
          bodyLimit: this.serverWrapper.bodyLimit || '50mb',

          // RCC-specific configuration
          enableVirtualModels: true,
          enablePipeline: true,
          debug: {
            enabled: true,
            level: 'debug'
          },
          monitoring: {
            enabled: true,
            detailedMetrics: true,
            requestTracing: true,
            performanceMonitoring: true
          },

          // Include pipeline configuration from wrapper
          pipeline: this.serverWrapper.pipeline,

          // Include original configuration for reference
          providers: this.config.providers,
          virtualModels: this.config.virtualModels,
          parsedConfig: {
            providers: this.config.providers,
            virtualModels: this.config.virtualModels,
            pipeline: this.config.pipeline
          },
          basePath: this.debugPath,
          enableTwoPhaseDebug: true
        };

        this.log('server', 'Server configuration created using wrapper', {
          finalPort: serverConfig.port,
          finalHost: serverConfig.host,
          pipelineEnabled: serverConfig.enablePipeline
        });
      } else {
        this.log('server', 'Server wrapper not available, using legacy configuration');

        // Use legacy configuration format
        serverConfig = {
          port: this.port,
          host: '0.0.0.0',
          cors: {
            origin: '*',
            credentials: true
          },
          compression: true,
          helmet: true,
          rateLimit: {
            windowMs: 900000,
            max: 1000
          },
          timeout: 60000,
          bodyLimit: '50mb',
          enableVirtualModels: true,
          enablePipeline: true,
          debug: {
            enabled: true,
            level: 'debug'
          },
          monitoring: {
            enabled: true,
            detailedMetrics: true,
            requestTracing: true,
            performanceMonitoring: true
          },
          // Include pipeline configuration and providers for reference
          providers: this.config.providers,
          virtualModels: this.config.virtualModels,
          pipeline: this.config.pipeline,
          parsedConfig: {
            providers: this.config.providers,
            virtualModels: this.config.virtualModels,
            pipeline: this.config.pipeline
          },
          basePath: this.debugPath,
          enableTwoPhaseDebug: true
        };
      }

      // Create ServerModule instance with prepared scheduler manager (T3: 流水线优先架构)
      this.log('server', 'Creating ServerModule instance with DynamicRoutingManager...');

      // Always try new constructor first
      try {
        this.log('server', 'Using new ServerModule constructor with scheduler injection');
        this.server = new ServerModule(this.pipelineManager, serverConfig);
        this.log('server', 'ServerModule created with scheduler injection');
      } catch (constructorError) {
        this.log('server', 'Constructor with parameters failed, trying legacy constructor', {
          error: constructorError.message
        });

        // Fallback to legacy constructor
        this.server = new ServerModule();
        this.log('server', 'Using legacy ServerModule constructor (no scheduler injection)');
      }

      this.log('server', 'ServerModule created successfully');

      // Configure server (for legacy constructor mode)
      this.log('server', 'Configuring ServerModule...');
      await this.server.configure(serverConfig);

      // For legacy mode: inject scheduler manager after creation
      if (this.server.setDynamicRoutingSchedulerManager) {
        this.server.setDynamicRoutingSchedulerManager(this.pipelineManager);
        this.log('server', 'DynamicRoutingManager injected into ServerModule');
      }

      this.log('server', 'ServerModule configured and scheduler manager injected');

    } catch (error) {
      throw new Error(`Server creation failed: ${error.message}`);
    }
  }

  async configureVirtualModelRouting() {
    this.log('virtual-models', 'Configuring virtual model routing...');

    try {
      // Verify server has scheduler manager
      if (!this.server || !this.pipelineManager) {
        throw new Error('Server or scheduler manager not available for virtual model routing');
      }

      // Get virtual model mappings from scheduler manager
      const virtualModelMappings = this.pipelineManager.getVirtualModelMappings();
      const virtualModelArray = Object.values(virtualModelMappings);

      this.log('virtual-models', 'Virtual model mappings from scheduler manager', {
        totalMappings: virtualModelArray.length,
        virtualModels: virtualModelArray.map(m => m.id)
      });

      // NOTE: Virtual model registration removed - ServerModule is pure forwarding only
      // Virtual models are handled by the pipeline system directly
      this.log('virtual-models', 'Virtual model mappings available (not registering with server)', {
        totalMappings: virtualModelArray.length,
        virtualModels: virtualModelArray.map(m => m.id)
      });

      this.log('virtual-models', 'Virtual model routing configuration completed', {
        totalRegistered: virtualModelArray.length,
        activeVirtualModels: virtualModelArray.filter(m => m.status === 'active').length,
        schedulerMetrics: this.pipelineManager.getMetrics()
      });

    } catch (error) {
      throw new Error(`Virtual model routing configuration failed: ${error.message}`);
    }
  }

  async startServer() {
    this.log('server', 'Starting RCC HTTP Server...');

    try {
      // Initialize the server
      this.log('server', 'Initializing ServerModule...');
      await this.server.initialize();

      // Start the server
      this.log('server', 'Starting ServerModule HTTP server...');
      await this.server.start();

      this.log('server', 'HTTP server started successfully', {
        port: this.port,
        host: '0.0.0.0'
      });

    } catch (error) {
      throw new Error(`Server startup failed: ${error.message}`);
    }
  }

  async startServerWithPreparedPipeline() {
    this.log('server', 'Starting server with prepared pipeline system... [DEPRECATED]');
    this.log('server', 'This method is deprecated. Use separate createServerWithScheduler + startServer methods.');

    // Delegate to new separate methods
    await this.createServerWithScheduler();
    await this.startServer();
  }

  async finalizeSystemStartup() {
    this.log('system', 'Finalizing system startup...');

    // Verify that virtual models are properly registered
    const virtualModelMappings = this.pipelineManager.getVirtualModelMappings();
    const virtualModels = Object.values(virtualModelMappings);
    const enabledModels = virtualModels.filter(vm => vm.status === 'active');

    const metrics = this.pipelineManager.getMetrics();

    this.log('system', 'System startup verification', {
      totalVirtualModels: virtualModels.length,
      enabledVirtualModels: enabledModels.length,
      pipelineSchedulers: metrics.totalSchedulers,
      activeSchedulers: metrics.activeSchedulers,
      serverStatus: this.server.getStatus ? await this.server.getStatus() : 'running'
    });

    // Verify that we have virtual models available
    if (enabledModels.length === 0) {
      throw new Error('Critical startup failure: No virtual models available');
    }

    console.log('\n✅ RCC System Successfully Started!');
    console.log(`🌐 Server URL: http://localhost:${this.port}`);
    console.log(`🔧 API Endpoint: http://localhost:${this.port}/v1/messages`);
    console.log(`📊 Health Check: http://localhost:${this.port}/status`);
    console.log(`🎯 Virtual Models Available: ${enabledModels.length} models with targets`);

    this.log('system', 'System startup finalized successfully');
  }

  async stop() {
    this.log('system', 'Shutting down RCC system...');

    try {
      if (this.server) {
        await this.server.stop();
        this.log('server', 'HTTP server stopped');
      }

      if (this.pipelineManager) {
        await this.pipelineManager.destroy();
        this.log('pipeline', 'DynamicRoutingManager destroyed');
      }

      this.log('system', 'RCC system shutdown completed');

    } catch (error) {
      throw new Error(`System shutdown failed: ${error.message}`);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    port: parseInt(args.find(arg => arg === '--port' || arg === '-p') && args[args.indexOf(args.find(arg => arg === '--port' || arg === '-p')) + 1]) || 5506,
    config: args.find(arg => arg === '--config' || arg === '-c') && args[args.indexOf(args.find(arg => arg === '--config' || arg === '-c')) + 1] || undefined,
    debug: args.find(arg => arg === '--debug' || arg === '-d') && args[args.indexOf(args.find(arg => arg === '--debug' || arg === '-d')) + 1] || undefined,
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  const initializer = new RCCSystemInitializer(options);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Graceful shutdown requested...');
    await initializer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Termination signal received...');
    await initializer.stop();
    process.exit(0);
  });

  try {
    await initializer.start();

    // Keep the process running
    console.log('\n⏳ RCC System is running. Press Ctrl+C to stop.');

  } catch (error) {
    console.error('💥 Startup failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { RCCSystemInitializer };